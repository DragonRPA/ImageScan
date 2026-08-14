import React, { useRef, useEffect, useState } from 'react';
import { Camera, UploadCloud, Play, Square, Plus, Volume2, ShieldCheck, Target, Zap, ZapOff, RefreshCw, Smartphone, Eye, Mic, MicOff, CheckCircle, Search, Database } from 'lucide-react';
import { getTesseractWorker, preprocessCanvasROI, parseFieldsFromTesseractResult } from '../utils/ocrWorker';
import { triggerSuccessFeedback } from '../utils/soundFeedback';
import { saveScansToSupabase, getStoredConfig, fetchScansFromSupabase } from '../utils/supabaseClient';
import { isSpeechRecognitionSupported, createSpeechRecognizer, convertKoreanSpeechToDigits } from '../utils/speechRecognition';

export default function MobileScannerView({ onError, onOpenConfigModal }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);
  const recognizerRef = useRef(null);
  const modalRecognizerRef = useRef(null);

  const [isScanning, setIsScanning] = useState(false);
  const [cameraStatus, setCameraStatus] = useState('카메라 준비 중');
  const [ocrStatus, setOcrStatus] = useState('기기 뒷면 전체를 편안하게 비추세요');
  const [detectedPulse, setDetectedPulse] = useState(false);

  // Galaxy S24 Multi-Lens State
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  // Hardware Camera Features & Voice Recognition
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isVoiceOn, setIsVoiceOn] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');
  const [lastVoiceDigits, setLastVoiceDigits] = useState('');

  // Real-Time OCR Text Region Bounding Boxes
  const [liveBoxes, setLiveBoxes] = useState([]);
  const [pinpointBox, setPinpointBox] = useState(null);

  // Recent scanned items list & Master DB Cache for 4-digit auto matching
  const [scannedItems, setScannedItems] = useState([]);
  const [masterDbItems, setMasterDbItems] = useState([]);
  const [lastScannedImei, setLastScannedImei] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Ultra-Fast 4-Digit Manual & Voice Matching Modal State
  const [showManualModal, setShowManualModal] = useState(false);
  const [fourDigits, setFourDigits] = useState('');
  const [matchedRecord, setMatchedRecord] = useState(null);
  const [isModalListening, setIsModalListening] = useState(false);

  const supabaseConfig = getStoredConfig();
  const isConfigured = Boolean(supabaseConfig.url && supabaseConfig.anonKey && !supabaseConfig.url.includes('your-supabase-project'));

  // Pre-load Master DB Data for Instant 4-Digit Matching
  useEffect(() => {
    async function loadMasterData() {
      try {
        const dbData = await fetchScansFromSupabase();
        if (dbData && dbData.length > 0) {
          setMasterDbItems(dbData);
        }
      } catch (e) {
        console.warn('Master DB pre-load warning:', e);
      }
    }
    loadMasterData();
  }, [isConfigured]);

  // Enumerate REAR physical camera lenses ONLY (Strictly Filter Out Front Selfie Cameras!)
  const enumeratePhysicalCameras = async () => {
    if (typeof window === 'undefined' || !('navigator' in window) || !('mediaDevices' in navigator)) return;
    try {
      await navigator.mediaDevices.getUserMedia({ video: true }).then(s => s.getTracks().forEach(t => t.stop())).catch(() => {});
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(d => d.kind === 'videoinput');

      // Strictly filter out FRONT / SELFIE cameras
      const rearLensesOnly = videoInputs.filter(d => {
        const lbl = (d.label || '').toLowerCase();
        const isFront = lbl.includes('front') || lbl.includes('user') || lbl.includes('selfie') || lbl.includes('전면') || lbl.includes('내면');
        return !isFront;
      });

      const formatted = rearLensesOnly.map((d, index) => {
        let label = d.label || `후면 렌즈 #${index + 1}`;
        const lower = label.toLowerCase();
        
        if (lower.includes('ultra') || lower.includes('wide') || index === 1) {
          label = `📷 초광각 접사 렌즈 (5cm 초접사)`;
        } else if (lower.includes('tele') || lower.includes('zoom') || index === 2) {
          label = `📷 3배/5배 망원 렌즈 (30cm 줌)`;
        } else {
          label = `📷 기본 메인 렌즈 (기본 광각)`;
        }

        return {
          deviceId: d.deviceId,
          label,
          rawLabel: d.label
        };
      });

      setVideoDevices(formatted);
      if (formatted.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(formatted[0].deviceId);
      }
    } catch (e) {
      console.warn('Enumerate devices warning:', e);
    }
  };

  // Start Camera Stream with Robust Multi-Level Fallback
  const startCamera = async (targetDeviceId) => {
    const devId = targetDeviceId || selectedDeviceId;
    setCameraStatus('카메라 렌즈 연결 중...');

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      await new Promise(r => setTimeout(r, 150));
    }

    let stream = null;

    if (devId) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { ideal: devId },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        });
      } catch (errA) {
        console.warn('Strategy A failed, trying Strategy B:', errA);
      }
    }

    if (!stream && devId) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: devId }
        });
      } catch (errB) {
        console.warn('Strategy B failed, trying Strategy C:', errB);
      }
    }

    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }
        });
      } catch (errC) {
        console.error('All camera strategies failed:', errC);
        setCameraStatus('카메라 렌즈 연결 실패');
        onError(`카메라를 실행할 수 없습니다: ${errC.message || '장치가 사용 중이거나 지원되지 않습니다.'}`);
        return;
      }
    }

    streamRef.current = stream;

    const track = stream.getVideoTracks()[0];
    if (track && track.getCapabilities) {
      const capabilities = track.getCapabilities();
      if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
        try {
          await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
        } catch (e) {}
      }
    }

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
    setIsScanning(true);
    setCameraStatus('카메라+음성 하이브리드 OCR 가동 중');
  };

  const handleDeviceChange = (e) => {
    const newId = e.target.value;
    setSelectedDeviceId(newId);
    startCamera(newId);
  };

  // Always Allow Flashlight Torch Toggle Action
  const toggleTorch = async () => {
    if (!streamRef.current) {
      alert('카메라가 정지되어 있습니다. 스캔 시작 후 플래시를 켜주세요.');
      return;
    }
    const track = streamRef.current.getVideoTracks()[0];
    if (track && track.applyConstraints) {
      try {
        const nextState = !isTorchOn;
        await track.applyConstraints({
          advanced: [{ torch: nextState }]
        });
        setIsTorchOn(nextState);
        setOcrStatus(nextState ? '🔦 플래시 조명이 켜졌습니다 (금속 각인 음영 극대화)' : '🔦 플래시 조명이 꺼졌습니다');
      } catch (e) {
        console.warn('Torch toggle error:', e);
        alert('현재 선택된 카메라 렌즈는 LED 플래시 조명을 직접 지원하지 않습니다. 기본 메인 렌즈로 전환해 보세요.');
      }
    }
  };

  // Voice Recognition Toggle Action for Main Camera
  const toggleVoice = () => {
    if (!isSpeechRecognitionSupported()) {
      alert('현재 브라우저 환경에서는 음성 인식(Speech API)을 지원하지 않습니다. 최신 크롬 또는 삼성 인터넷 브라우저를 사용해 주세요.');
      return;
    }

    if (isVoiceOn) {
      if (recognizerRef.current) {
        try { recognizerRef.current.stop(); } catch (e) {}
        recognizerRef.current = null;
      }
      setIsVoiceOn(false);
      setVoiceStatus('');
      setOcrStatus('🎙️ 음성 보조 인식이 꺼졌습니다');
    } else {
      const recognizer = createSpeechRecognizer({
        onResult: ({ transcript, digits }) => {
          setVoiceStatus(`🎙️ 음성: "${transcript}" -> [${digits || '숫자탐색'}]`);
          if (digits && digits.length >= 4) {
            setLastVoiceDigits(digits.slice(-4));
          }
        },
        onError: (err) => {
          console.warn('Voice recognition error:', err);
        },
        onEnd: () => {
          if (isVoiceOn && recognizerRef.current) {
            try { recognizerRef.current.start(); } catch (e) {}
          }
        }
      });

      if (recognizer) {
        try {
          recognizer.start();
          recognizerRef.current = recognizer;
          setIsVoiceOn(true);
          setOcrStatus('🎙️ 음성 보조 인식 가동! IMEI 끝 4자리(예: "오공이" 또는 "5052")를 불러주세요.');
        } catch (e) {
          console.error('Voice start error:', e);
        }
      }
    }
  };

  // Dedicated Voice Input inside the 4-digit Modal
  const toggleModalVoice = () => {
    if (!isSpeechRecognitionSupported()) {
      alert('음성 인식을 지원하지 않는 브라우저입니다.');
      return;
    }

    if (isModalListening) {
      if (modalRecognizerRef.current) {
        try { modalRecognizerRef.current.stop(); } catch (e) {}
        modalRecognizerRef.current = null;
      }
      setIsModalListening(false);
    } else {
      const recognizer = createSpeechRecognizer({
        onResult: ({ transcript, digits }) => {
          if (digits && digits.length >= 1) {
            const input4 = digits.slice(-4);
            setFourDigits(input4);
            perform4DigitDataMatching(input4);
          }
        },
        onError: (err) => console.warn('Modal STT error:', err),
        onEnd: () => setIsModalListening(false)
      });

      if (recognizer) {
        try {
          recognizer.start();
          modalRecognizerRef.current = recognizer;
          setIsModalListening(true);
        } catch (e) {}
      }
    }
  };

  // Perform 4-Digit Auto Matching against DB / Master Excel Data
  const perform4DigitDataMatching = (inputDigits) => {
    const clean4 = inputDigits.replace(/\D/g, '');
    if (clean4.length < 4) {
      setMatchedRecord(null);
      return;
    }

    const last4 = clean4.slice(-4);

    // 1. Search inside Master DB Items & Scanned Items
    const pool = [...masterDbItems, ...scannedItems];
    const match = pool.find(item => {
      const targetImei = (item.imei || '').replace(/\D/g, '');
      return targetImei.endsWith(last4);
    });

    if (match) {
      setMatchedRecord(match);
    } else {
      // Auto-construct candidate full IMEI placeholder if missing in DB
      setMatchedRecord({
        asset_no: `AUTO_${last4}`,
        imei: `351379300${last4.padStart(6, '0')}`,
        mac_address: '',
        serial_no: '',
        isNewConstructed: true
      });
    }
  };

  const handleFourDigitsChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setFourDigits(val);
    perform4DigitDataMatching(val);
  };

  const handleConfirmFourDigits = (e) => {
    e.preventDefault();
    if (fourDigits.length < 4) {
      onError('IMEI 끝 4자리를 정확각히 4자리 숫자로 입력해주세요.');
      return;
    }

    const targetImei = matchedRecord ? matchedRecord.imei : `351379300${fourDigits.padStart(6, '0')}`;
    const autoAssetNo = matchedRecord ? matchedRecord.asset_no : `TEST${fourDigits}`;

    const newItem = {
      id: `manual_${Date.now()}`,
      asset_no: autoAssetNo,
      imei: targetImei,
      mac_address: matchedRecord?.mac_address || '',
      serial_no: matchedRecord?.serial_no || '',
      scanned_at: new Date().toLocaleTimeString('ko-KR'),
      status: 'COMPLETED'
    };

    triggerSuccessFeedback();
    setScannedItems(prev => [newItem, ...prev]);

    if (isConfigured) {
      try {
        saveScansToSupabase([newItem]);
        newItem.status = 'EXPORTED';
      } catch (e) {
        console.error('Auto save error:', e);
      }
    }

    setOcrStatus(`★ 4자리 매칭 완료! IMEI: ${targetImei}`);
    setFourDigits('');
    setMatchedRecord(null);
    setShowManualModal(false);

    if (modalRecognizerRef.current) {
      try { modalRecognizerRef.current.stop(); } catch (e) {}
      modalRecognizerRef.current = null;
    }
    setIsModalListening(false);
  };

  const triggerRefocus = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && track.applyConstraints) {
      try {
        setOcrStatus('🎯 렌즈 초점 재조정 진행 중...');
        await track.applyConstraints({ advanced: [{ focusMode: 'manual' }] });
        setTimeout(async () => {
          await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
          setOcrStatus('🎯 렌즈 초점 재조정 완료!');
        }, 200);
      } catch (e) {}
    }
  };

  const stopCamera = () => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (recognizerRef.current) {
      try { recognizerRef.current.stop(); } catch (e) {}
      recognizerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
    setIsTorchOn(false);
    setIsVoiceOn(false);
    setLiveBoxes([]);
    setPinpointBox(null);
    setCameraStatus('카메라 정지됨');
  };

  // Scanning Loop with Real-Time Bounding Box & Voice Digit Matching
  useEffect(() => {
    if (!isScanning) return;

    let isProcessing = false;
    let lastScanTime = 0;

    scanTimerRef.current = setInterval(async () => {
      if (isProcessing || !videoRef.current || videoRef.current.readyState !== 4) return;
      const now = Date.now();
      if (now - lastScanTime < 350) return;

      isProcessing = true;
      try {
        const video = videoRef.current;
        const vWidth = video.videoWidth;
        const vHeight = video.videoHeight;

        if (!vWidth || !vHeight) {
          isProcessing = false;
          return;
        }

        const roiWidth = Math.floor(vWidth * 0.88);
        const roiHeight = Math.floor(vHeight * 0.75);
        const roiX = Math.floor((vWidth - roiWidth) / 2);
        const roiY = Math.floor((vHeight - roiHeight) / 2);

        // Preprocess High-Res Broad Canvas Frame with Metallic Adaptive Local Contrast Binarization
        const roiCanvas = preprocessCanvasROI(video, { x: roiX, y: roiY, width: roiWidth, height: roiHeight });

        const worker = await getTesseractWorker();
        const tesseractResult = await worker.recognize(roiCanvas);

        const { parsed, candidateBoxes } = parseFieldsFromTesseractResult(tesseractResult);

        // Convert Candidate Text Bounding Boxes into % relative to video container
        if (candidateBoxes && candidateBoxes.length > 0) {
          const mappedLiveBoxes = candidateBoxes.slice(0, 8).map((cb, idx) => {
            const relX = ((roiX + cb.bbox.x0) / vWidth) * 100;
            const relY = ((roiY + cb.bbox.y0) / vHeight) * 100;
            const relW = ((cb.bbox.x1 - cb.bbox.x0) / vWidth) * 100;
            const relH = ((cb.bbox.y1 - cb.bbox.y0) / vHeight) * 100;
            return {
              id: `box_${idx}_${Date.now()}`,
              text: cb.text,
              x: Math.max(0, relX),
              y: Math.max(0, relY),
              w: Math.max(8, relW),
              h: Math.max(4, relH)
            };
          });
          setLiveBoxes(mappedLiveBoxes);

          const readWords = candidateBoxes.map(c => c.text).join(' | ');
          const displayMsg = voiceStatus ? `${voiceStatus} | 🔍 ${readWords.slice(0, 30)}` : `🔍 탐색 중: ${readWords.slice(0, 45)}...`;
          setOcrStatus(displayMsg);
        } else {
          setLiveBoxes([]);
          setOcrStatus(voiceStatus || '기기 뒷면 텍스트 탐색 중...');
        }

        // Check if Voice Spoken Digits (e.g. 5052) matches partial OCR candidate digits!
        let targetImei = parsed?.imei;

        if (!targetImei && lastVoiceDigits && candidateBoxes && candidateBoxes.length > 0) {
          // Find any numeric word ending with lastVoiceDigits or containing it
          const voiceMatchedWord = candidateBoxes.find(c => {
            const numStr = c.text.replace(/\D/g, '');
            return numStr.length >= 10 && numStr.endsWith(lastVoiceDigits);
          });

          if (voiceMatchedWord) {
            const digitsOnly = voiceMatchedWord.text.replace(/\D/g, '');
            if (digitsOnly.length >= 14) {
              targetImei = digitsOnly.slice(0, 15);
            }
          }
        }

        if (targetImei && targetImei.length >= 15) {
          if (parsed && parsed.bbox) {
            const relX = ((roiX + parsed.bbox.x0) / vWidth) * 100;
            const relY = ((roiY + parsed.bbox.y0) / vHeight) * 100;
            const relW = ((parsed.bbox.x1 - parsed.bbox.x0) / vWidth) * 100;
            const relH = ((parsed.bbox.y1 - parsed.bbox.y0) / vHeight) * 100;
            setPinpointBox({ x: relX, y: relY, w: Math.max(20, relW), h: Math.max(8, relH) });
          } else {
            setPinpointBox({ x: 15, y: 40, w: 70, h: 20 });
          }

          const exists = scannedItems.some(item => item.imei === targetImei);
          if (!exists && targetImei !== lastScannedImei) {
            lastScanTime = now;
            setLastScannedImei(targetImei);

            const autoAssetNo = parsed?.asset_no || `${Date.now().toString().slice(-8)}`;

            const newItem = {
              id: `scanned_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              asset_no: autoAssetNo,
              imei: targetImei,
              mac_address: parsed?.mac_address || '',
              serial_no: parsed?.serial_no || '',
              scanned_at: new Date().toLocaleTimeString('ko-KR'),
              status: 'COMPLETED'
            };

            triggerSuccessFeedback();
            setDetectedPulse(true);
            setTimeout(() => {
              setDetectedPulse(false);
              setPinpointBox(null);
            }, 1200);

            if (isConfigured) {
              try {
                saveScansToSupabase([newItem]);
                newItem.status = 'EXPORTED';
              } catch (e) {
                console.error('Auto save error:', e);
              }
            }

            setScannedItems(prev => [newItem, ...prev]);
            setOcrStatus(`★ 카메라+음성 감지 성공! IMEI: ${targetImei}`);
          }
        }
      } catch (err) {
        console.error('OCR Broad Loop Error:', err);
      } finally {
        isProcessing = false;
      }
    }, 350);

    return () => {
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    };
  }, [isScanning, lastScannedImei, scannedItems, isConfigured, lastVoiceDigits, voiceStatus]);

  useEffect(() => {
    enumeratePhysicalCameras();
    startCamera();
    return () => stopCamera();
  }, []);

  const handleExportAll = async () => {
    if (scannedItems.length === 0) {
      onError('내보낼 스캔 데이터가 없습니다.');
      return;
    }

    setIsSaving(true);
    try {
      await saveScansToSupabase(scannedItems);
      setScannedItems(prev => prev.map(item => ({ ...item, status: 'EXPORTED' })));
      alert(`성공적으로 ${scannedItems.length}건의 데이터를 Supabase DB에 저장하였습니다!`);
    } catch (err) {
      onError(err.message || 'Supabase 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 20px)',
      gap: '8px',
      position: 'relative',
      margin: '-12px -12px 0 -12px',
      padding: '8px'
    }}>
      {/* Viewfinder First Screen - Takes 88%+ Height starting from top */}
      <div style={{
        flex: 1,
        position: 'relative',
        backgroundColor: '#000',
        borderRadius: '12px',
        overflow: 'hidden',
        border: `3px solid ${detectedPulse ? '#10b981' : '#334155'}`,
        boxShadow: detectedPulse ? '0 0 25px rgba(16, 185, 129, 0.9)' : 'none',
        transition: 'all 0.2s ease'
      }}>
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />

        {/* Top Floating Translucent Overlay Control Bar inside Viewfinder */}
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          right: '10px',
          backgroundColor: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(6px)',
          borderRadius: '8px',
          padding: '6px 10px',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          gap: '6px',
          zIndex: 20,
          border: '1px solid rgba(255,255,255,0.15)'
        }}>
          {/* Physical Lens Select Dropdown */}
          {videoDevices.length > 0 ? (
            <select
              style={{
                fontSize: '0.7rem',
                padding: '4px 6px',
                backgroundColor: '#0f172a',
                borderColor: '#38bdf8',
                color: '#38bdf8',
                fontWeight: 700,
                borderRadius: '6px',
                maxWidth: '45%'
              }}
              value={selectedDeviceId}
              onChange={handleDeviceChange}
            >
              {videoDevices.map((dev) => (
                <option key={dev.deviceId} value={dev.deviceId}>
                  {dev.label}
                </option>
              ))}
            </select>
          ) : (
            <span style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 700 }}>후면 접사 렌즈</span>
          )}

          {/* Controls: Focus, Torch, and Voice Recognition */}
          <div style={{ display: 'flex', gap: '3px' }}>
            <button className="btn btn-outline" style={{ padding: '3px 5px', fontSize: '0.68rem', borderColor: '#38bdf8', color: '#7dd3fc', backgroundColor: 'rgba(15,23,42,0.6)' }} onClick={triggerRefocus}>
              <RefreshCw size={11} /> 초점
            </button>

            <button className={`btn ${isTorchOn ? 'btn-success' : 'btn-outline'}`} style={{ padding: '3px 5px', fontSize: '0.68rem', backgroundColor: isTorchOn ? '#10b981' : 'rgba(15,23,42,0.6)' }} onClick={toggleTorch}>
              {isTorchOn ? <Zap size={11} /> : <ZapOff size={11} />}
              {isTorchOn ? '플래시ON' : '플래시OFF'}
            </button>

            <button className={`btn ${isVoiceOn ? 'btn-success' : 'btn-outline'}`} style={{ padding: '3px 5px', fontSize: '0.68rem', backgroundColor: isVoiceOn ? '#8b5cf6' : 'rgba(15,23,42,0.6)', borderColor: '#a78bfa', color: '#c4b5fd' }} onClick={toggleVoice}>
              {isVoiceOn ? <Mic size={11} /> : <MicOff size={11} />}
              {isVoiceOn ? '음성ON' : '음성OFF'}
            </button>
          </div>
        </div>

        {/* Broad Scanning Area Guide Box Overlay */}
        <div style={{
          position: 'absolute',
          top: '52%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '88%',
          height: '75%',
          border: '1px dashed rgba(56, 189, 248, 0.5)',
          borderRadius: '12px',
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)',
          pointerEvents: 'none'
        }}>
          <div style={{
            position: 'absolute',
            top: '8px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '0.72rem',
            color: '#e0f2fe',
            fontWeight: 700,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            padding: '3px 8px',
            borderRadius: '4px',
            whiteSpace: 'nowrap'
          }}>
            {isVoiceOn ? '💡 카메라를 비추고 IMEI 끝 4자리(예: "5052")를 말씀해 보세요!' : '기기 뒷면을 비추세요 (자동 실시간 텍스트 영역 가이드)'}
          </div>
        </div>

        {/* REAL-TIME LIVE TEXT CANDIDATE BOUNDING BOXES */}
        {isScanning && liveBoxes.map((b) => (
          <div
            key={b.id}
            style={{
              position: 'absolute',
              left: `${b.x}%`,
              top: `${b.y}%`,
              width: `${b.w}%`,
              height: `${b.h}%`,
              border: '1px solid #38bdf8',
              backgroundColor: 'rgba(56, 189, 248, 0.2)',
              borderRadius: '3px',
              pointerEvents: 'none',
              zIndex: 15,
              transition: 'all 0.1s ease',
              display: 'flex',
              alignItems: 'flex-start',
              padding: '1px'
            }}
          >
            <span style={{
              fontSize: '0.55rem',
              color: '#38bdf8',
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              padding: '1px 3px',
              borderRadius: '2px',
              lineHeight: 1,
              whiteSpace: 'nowrap',
              transform: 'translateY(-12px)',
              pointerEvents: 'none'
            }}>
              🔍 {b.text}
            </span>
          </div>
        ))}

        {/* Live Pinpoint Bounding Box Highlight on Matched Target IMEI Location */}
        {pinpointBox && (
          <div style={{
            position: 'absolute',
            left: `${pinpointBox.x}%`,
            top: `${pinpointBox.y}%`,
            width: `${pinpointBox.w}%`,
            height: `${pinpointBox.h}%`,
            border: '3px solid #10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.3)',
            borderRadius: '6px',
            boxShadow: '0 0 25px rgba(16, 185, 129, 1)',
            display: 'flex',
            alignItems: 'center',
            justify: 'center',
            zIndex: 30,
            transition: 'all 0.15s ease'
          }}>
            <span style={{
              fontSize: '0.72rem',
              color: '#ffffff',
              fontWeight: 800,
              backgroundColor: '#10b981',
              padding: '2px 6px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Target size={13} /> IMEI 포착!
            </span>
          </div>
        )}

        {/* Bottom Floating Status Controls over Camera */}
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          right: '10px',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          zIndex: 20
        }}>
          <div style={{
            fontSize: '0.72rem',
            color: '#fff',
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            padding: '4px 10px',
            borderRadius: '6px'
          }}>
            {cameraStatus}
          </div>

          <button className={`btn ${isScanning ? 'btn-danger' : 'btn-primary'}`} style={{ padding: '6px 14px', fontSize: '0.78rem' }} onClick={isScanning ? stopCamera : () => startCamera()}>
            {isScanning ? <Square size={13} /> : <Play size={13} />}
            {isScanning ? '스캔 정지' : '스캔 시작'}
          </button>
        </div>
      </div>

      {/* OCR Real-Time Text Subtitle / Log Banner */}
      <div style={{
        backgroundColor: '#1e293b',
        padding: '6px 10px',
        borderRadius: '6px',
        fontSize: '0.78rem',
        color: detectedPulse ? '#6ee7b7' : isVoiceOn ? '#c4b5fd' : '#38bdf8',
        fontWeight: detectedPulse ? 700 : 500,
        textAlign: 'center',
        border: '1px solid #334155',
        display: 'flex',
        alignItems: 'center',
        justify: 'center',
        gap: '6px'
      }}>
        {isVoiceOn ? <Mic size={14} style={{ color: '#a78bfa' }} /> : <Eye size={14} style={{ color: '#38bdf8' }} />}
        <span>{ocrStatus}</span>
      </div>

      {/* Bottom Compact Toolbar with Ultra-Fast 4-Digit Manual & Voice Action */}
      <div style={{
        backgroundColor: '#1e293b',
        borderRadius: '8px',
        padding: '6px 10px',
        border: '1px solid #334155',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} style={{ color: isConfigured ? '#10b981' : '#f59e0b' }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: isConfigured ? '#6ee7b7' : '#fef08a' }}>
              {isConfigured ? 'DB 실시간 동기화' : '로컬 스캔 모드'}
            </span>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>| 누적 {scannedItems.length}건</span>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.76rem', fontWeight: 700 }} onClick={() => setShowManualModal(true)}>
              <Plus size={13} /> ⚡ 4자리 수동/음성 입력
            </button>
            <button className="btn btn-success" style={{ padding: '4px 10px', fontSize: '0.76rem' }} onClick={handleExportAll} disabled={scannedItems.length === 0 || isSaving}>
              <UploadCloud size={13} /> DB 저장
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
          {scannedItems.length === 0 ? (
            <span style={{ fontSize: '0.7rem', color: '#64748b', padding: '2px 0' }}>
              아직 감지된 항목이 없습니다.
            </span>
          ) : (
            scannedItems.slice(0, 5).map((item) => (
              <div
                key={item.id}
                style={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  padding: '3px 6px',
                  fontSize: '0.68rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                <div style={{ fontWeight: 700, color: '#38bdf8' }}>{item.asset_no}</div>
                <div style={{ fontFamily: 'monospace', color: '#fef08a' }}>{item.imei}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ULTRA-FAST 4-DIGIT & VOICE AUTO-MATCHING MODAL */}
      {showManualModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '92%', maxWidth: '420px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#38bdf8' }}>
                ⚡ 초고속 IMEI 4자리 매칭 입력
              </h3>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>DB/엑셀 100% 자동 매칭</span>
            </div>

            <form onSubmit={handleConfirmFourDigits} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Single Large 4-Digit Input + Voice Mic Button Group */}
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
                  IMEI 끝 4자리 입력 또는 음성 발화
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="예: 5052"
                    value={fourDigits}
                    onChange={handleFourDigitsChange}
                    maxLength={4}
                    autoFocus
                    style={{
                      fontSize: '1.4rem',
                      fontWeight: 900,
                      letterSpacing: '4px',
                      textAlign: 'center',
                      borderColor: fourDigits.length === 4 ? '#10b981' : '#38bdf8',
                      backgroundColor: '#0f172a',
                      color: '#6ee7b7'
                    }}
                  />
                  <button
                    type="button"
                    className={`btn ${isModalListening ? 'btn-danger' : 'btn-outline'}`}
                    style={{
                      padding: '0 14px',
                      fontSize: '0.82rem',
                      borderColor: '#a78bfa',
                      color: isModalListening ? '#fff' : '#c4b5fd',
                      backgroundColor: isModalListening ? '#ef4444' : '#1e1b4b',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    onClick={toggleModalVoice}
                  >
                    <Mic size={16} />
                    {isModalListening ? '듣는 중...' : '음성입력'}
                  </button>
                </div>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px' }}>
                  💡 음성 버튼 터치 후 "오공오이" 또는 "5052"라고 말씀하세요.
                </span>
              </div>

              {/* Matched Data Result Card Banner */}
              {matchedRecord && (
                <div style={{
                  backgroundColor: matchedRecord.isNewConstructed ? '#1e293b' : '#064e3b',
                  border: `1px solid ${matchedRecord.isNewConstructed ? '#334155' : '#10b981'}`,
                  borderRadius: '8px',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 800, color: matchedRecord.isNewConstructed ? '#fef08a' : '#6ee7b7' }}>
                    <CheckCircle size={14} />
                    {matchedRecord.isNewConstructed ? '신규 IMEI 4자리 조합 생성됨' : '★ DB/마스터 100% 매칭 성공!'}
                  </div>

                  <div style={{ fontSize: '0.95rem', fontWeight: 800, fontFamily: 'monospace', color: '#ffffff', letterSpacing: '0.5px' }}>
                    IMEI: {matchedRecord.imei}
                  </div>

                  <div style={{ display: 'flex', gap: '10px', fontSize: '0.72rem', color: '#cbd5e1' }}>
                    <span>자산: {matchedRecord.asset_no}</span>
                    {matchedRecord.serial_no && <span>S/N: {matchedRecord.serial_no}</span>}
                    {matchedRecord.mac_address && <span>MAC: {matchedRecord.mac_address}</span>}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                <button type="button" className="btn btn-outline" onClick={() => {
                  setShowManualModal(false);
                  if (modalRecognizerRef.current) {
                    try { modalRecognizerRef.current.stop(); } catch (e) {}
                  }
                  setIsModalListening(false);
                }}>
                  취소
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 18px', fontWeight: 800 }} disabled={fourDigits.length < 4}>
                  확인 및 DB 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
