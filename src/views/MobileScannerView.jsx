import React, { useRef, useEffect, useState } from 'react';
import { Camera, UploadCloud, Play, Square, Plus, Volume2, ShieldCheck, Target, Zap, ZapOff, RefreshCw, Smartphone } from 'lucide-react';
import { getTesseractWorker, preprocessCanvasROI, parseFieldsFromTesseractResult } from '../utils/ocrWorker';
import { triggerSuccessFeedback } from '../utils/soundFeedback';
import { saveScansToSupabase, getStoredConfig } from '../utils/supabaseClient';

export default function MobileScannerView({ onError, onOpenConfigModal }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);

  const [isScanning, setIsScanning] = useState(false);
  const [cameraStatus, setCameraStatus] = useState('카메라 준비 중');
  const [ocrStatus, setOcrStatus] = useState('기기 뒷면 전체를 편안하게 비추세요');
  const [detectedPulse, setDetectedPulse] = useState(false);

  // Galaxy S24 Multi-Lens State
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  // Hardware Camera Features (Always Allow Flashlight Toggle)
  const [isTorchOn, setIsTorchOn] = useState(false);

  // Pinpoint Highlight Box Coordinates
  const [pinpointBox, setPinpointBox] = useState(null);

  // Recent scanned items list
  const [scannedItems, setScannedItems] = useState([]);
  const [lastScannedImei, setLastScannedImei] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Manual Add Modal Form
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualAssetNo, setManualAssetNo] = useState('');
  const [manualImei, setManualImei] = useState('');
  const [manualMac, setManualMac] = useState('');
  const [manualSerial, setManualSerial] = useState('');

  const supabaseConfig = getStoredConfig();
  const isConfigured = Boolean(supabaseConfig.url && supabaseConfig.anonKey && !supabaseConfig.url.includes('your-supabase-project'));

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
      await new Promise(r => setTimeout(r, 100));
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
    setCameraStatus('접사/망원 OCR 가동 중');
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
        // Fallback alert for non-torch sub-lenses
        alert('현재 선택된 카메라 렌즈는 LED 플래시 조명을 직접 지원하지 않습니다. 기본 메인 렌즈로 전환해 보세요.');
      }
    }
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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
    setIsTorchOn(false);
    setCameraStatus('카메라 정지됨');
  };

  // Scanning Loop
  useEffect(() => {
    if (!isScanning) return;

    let isProcessing = false;
    let lastScanTime = 0;

    scanTimerRef.current = setInterval(async () => {
      if (isProcessing || !videoRef.current || videoRef.current.readyState !== 4) return;
      const now = Date.now();
      if (now - lastScanTime < 400) return;

      isProcessing = true;
      try {
        const video = videoRef.current;
        const vWidth = video.videoWidth;
        const vHeight = video.videoHeight;

        if (!vWidth || !vHeight) {
          isProcessing = false;
          return;
        }

        const roiWidth = Math.floor(vWidth * 0.85);
        const roiHeight = Math.floor(vHeight * 0.70);
        const roiX = Math.floor((vWidth - roiWidth) / 2);
        const roiY = Math.floor((vHeight - roiHeight) / 2);

        // Preprocess High-Res Broad Canvas Frame with Metallic Adaptive Local Contrast Binarization
        const roiCanvas = preprocessCanvasROI(video, { x: roiX, y: roiY, width: roiWidth, height: roiHeight });

        const worker = await getTesseractWorker();
        const tesseractResult = await worker.recognize(roiCanvas);

        const rawText = tesseractResult.data.text || '';
        setOcrStatus(rawText.trim() ? `선명 탐색: ${rawText.slice(0, 30)}...` : '기기 뒷면을 비추세요...');

        const parsed = parseFieldsFromTesseractResult(tesseractResult);

        if (parsed && parsed.imei) {
          if (parsed.bbox) {
            const relX = ((roiX + parsed.bbox.x0) / vWidth) * 100;
            const relY = ((roiY + parsed.bbox.y0) / vHeight) * 100;
            const relW = ((parsed.bbox.x1 - parsed.bbox.x0) / vWidth) * 100;
            const relH = ((parsed.bbox.y1 - parsed.bbox.y0) / vHeight) * 100;
            setPinpointBox({ x: relX, y: relY, w: Math.max(20, relW), h: Math.max(8, relH) });
          } else {
            setPinpointBox({ x: 15, y: 40, w: 70, h: 20 });
          }

          const exists = scannedItems.some(item => item.imei === parsed.imei);
          if (!exists && parsed.imei !== lastScannedImei) {
            lastScanTime = now;
            setLastScannedImei(parsed.imei);

            const autoAssetNo = parsed.asset_no || `${Date.now().toString().slice(-8)}`;

            const newItem = {
              id: `scanned_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              asset_no: autoAssetNo,
              imei: parsed.imei,
              mac_address: parsed.mac_address || '',
              serial_no: parsed.serial_no || '',
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
            setOcrStatus(`★ 금속 각인 감지 성공! IMEI: ${parsed.imei}`);
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
  }, [isScanning, lastScannedImei, scannedItems, isConfigured]);

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

  const handleAddManualItem = (e) => {
    e.preventDefault();
    if (!manualImei || manualImei.length < 15) {
      onError('올바른 15자리 IMEI 번호를 입력해주세요.');
      return;
    }

    const newItem = {
      id: `manual_${Date.now()}`,
      asset_no: manualAssetNo || `${Date.now().toString().slice(-8)}`,
      imei: manualImei,
      mac_address: manualMac || '',
      serial_no: manualSerial || '',
      scanned_at: new Date().toLocaleTimeString('ko-KR'),
      status: 'COMPLETED'
    };

    setScannedItems(prev => [newItem, ...prev]);
    setManualAssetNo('');
    setManualImei('');
    setManualMac('');
    setManualSerial('');
    setShowManualModal(false);
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
          gap: '8px',
          zIndex: 20,
          border: '1px solid rgba(255,255,255,0.15)'
        }}>
          {/* Physical Lens Select Dropdown */}
          {videoDevices.length > 0 ? (
            <select
              style={{
                fontSize: '0.72rem',
                padding: '4px 8px',
                backgroundColor: '#0f172a',
                borderColor: '#38bdf8',
                color: '#38bdf8',
                fontWeight: 700,
                borderRadius: '6px',
                maxWidth: '60%'
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
            <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 700 }}>후면 접사 렌즈</span>
          )}

          {/* Unconditional Focus & Flashlight Torch Buttons */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.72rem', borderColor: '#38bdf8', color: '#7dd3fc', backgroundColor: 'rgba(15,23,42,0.6)' }} onClick={triggerRefocus}>
              <RefreshCw size={12} /> 초점
            </button>

            <button className={`btn ${isTorchOn ? 'btn-success' : 'btn-outline'}`} style={{ padding: '4px 8px', fontSize: '0.72rem', backgroundColor: isTorchOn ? '#10b981' : 'rgba(15,23,42,0.6)' }} onClick={toggleTorch}>
              {isTorchOn ? <Zap size={12} /> : <ZapOff size={12} />}
              {isTorchOn ? '플래시 ON' : '플래시 OFF'}
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
            기기 뒷면을 비추세요 (자동 텍스트 탐색)
          </div>
        </div>

        {/* Live Pinpoint Bounding Box Highlight on Detected Text Location */}
        {pinpointBox && (
          <div style={{
            position: 'absolute',
            left: `${pinpointBox.x}%`,
            top: `${pinpointBox.y}%`,
            width: `${pinpointBox.w}%`,
            height: `${pinpointBox.h}%`,
            border: '3px solid #10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.25)',
            borderRadius: '6px',
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justify: 'center',
            zIndex: 10,
            transition: 'all 0.15s ease'
          }}>
            <span style={{
              fontSize: '0.7rem',
              color: '#ffffff',
              fontWeight: 800,
              backgroundColor: '#10b981',
              padding: '2px 6px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Target size={12} /> IMEI 포착!
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

      {/* OCR Status Banner */}
      <div style={{
        backgroundColor: '#1e293b',
        padding: '6px 10px',
        borderRadius: '6px',
        fontSize: '0.78rem',
        color: detectedPulse ? '#6ee7b7' : '#94a3b8',
        fontWeight: detectedPulse ? 700 : 500,
        textAlign: 'center',
        border: '1px solid #334155'
      }}>
        {ocrStatus}
      </div>

      {/* Bottom Compact Toolbar */}
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
            <button className="btn btn-outline" style={{ padding: '2px 6px', fontSize: '0.72rem' }} onClick={() => setShowManualModal(true)}>
              <Plus size={12} /> 수동 입력
            </button>
            <button className="btn btn-success" style={{ padding: '2px 6px', fontSize: '0.72rem' }} onClick={handleExportAll} disabled={scannedItems.length === 0 || isSaving}>
              <UploadCloud size={12} /> DB 저장
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

      {/* Manual Input Modal */}
      {showManualModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginTop: 0, marginBottom: '14px', fontSize: '1rem' }}>수동 IMEI 데이터 입력</h3>
            <form onSubmit={handleAddManualItem} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">자산번호 (관리번호)</label>
                <input type="text" className="form-input" placeholder="TEST0001" value={manualAssetNo} onChange={e => setManualAssetNo(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">IMEI (15자리 필수)</label>
                <input type="text" className="form-input" placeholder="351379300225052" value={manualImei} onChange={e => setManualImei(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">MAC Address</label>
                <input type="text" className="form-input" placeholder="4CEBB0B57A51" value={manualMac} onChange={e => setManualMac(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">시리얼</label>
                <input type="text" className="form-input" placeholder="R5KL60F0CZW" value={manualSerial} onChange={e => setManualSerial(e.target.value)} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowManualModal(false)}>취소</button>
                <button type="submit" className="btn btn-primary">추가하기</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
