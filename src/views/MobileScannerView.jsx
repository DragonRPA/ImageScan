import React, { useRef, useEffect, useState } from 'react';
import { Camera, UploadCloud, Play, Square, Plus, Volume2, ShieldCheck, Target, Zap, ZapOff, RefreshCw } from 'lucide-react';
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

  // Hardware Camera Features (Autofocus & Torch Flashlight)
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [autofocusSupported, setAutofocusSupported] = useState(false);

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

  // Start Camera Stream with Ultra-HD 4K/1080p + Continuous Focus Constraints
  const startCamera = async () => {
    try {
      setCameraStatus('Ultra-HD 카메라 권한 요청 중...');
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 3840, min: 1920 },
          height: { ideal: 2160, min: 1080 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const track = stream.getVideoTracks()[0];
      if (track && track.getCapabilities) {
        const capabilities = track.getCapabilities();

        // 1. Check Torch (Flashlight)
        if ('torch' in capabilities) {
          setTorchSupported(true);
        }

        // 2. Check & Apply Continuous Macro Autofocus
        if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
          setAutofocusSupported(true);
          try {
            await track.applyConstraints({
              advanced: [{ focusMode: 'continuous' }]
            });
          } catch (e) {
            console.warn('Autofocus constraint application warning:', e);
          }
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsScanning(true);
      setCameraStatus('접사 자동초점 & 샤프닝 OCR 작동 중');
    } catch (err) {
      console.error('Camera Access Error:', err);
      setCameraStatus('카메라 연결 실패');
      onError(`카메라 권한을 얻을 수 없습니다: ${err.message}`);
    }
  };

  // Toggle LED Flashlight (Torch)
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && track.applyConstraints) {
      try {
        const nextState = !isTorchOn;
        await track.applyConstraints({
          advanced: [{ torch: nextState }]
        });
        setIsTorchOn(nextState);
      } catch (e) {
        console.warn('Torch toggle error:', e);
      }
    }
  };

  // Manual Trigger Refocus Action (Re-runs continuous focus lens drive)
  const triggerRefocus = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && track.applyConstraints) {
      try {
        setOcrStatus('🎯 초점 재조정(Refocus) 진행 중...');
        await track.applyConstraints({
          advanced: [{ focusMode: 'manual' }]
        });
        setTimeout(async () => {
          await track.applyConstraints({
            advanced: [{ focusMode: 'continuous' }]
          });
          setOcrStatus('🎯 초점 재조정 완료! 기기 뒷면을 비추세요.');
        }, 200);
      } catch (e) {
        console.warn('Refocus error:', e);
      }
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
    setCameraStatus('카메라 정지됨');
  };

  // Broad-Field Auto-Localization Scanning Loop
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

        // Broad Scanning Area (85% Width x 70% Height)
        const roiWidth = Math.floor(vWidth * 0.85);
        const roiHeight = Math.floor(vHeight * 0.70);
        const roiX = Math.floor((vWidth - roiWidth) / 2);
        const roiY = Math.floor((vHeight - roiHeight) / 2);

        // Preprocess High-Res Broad Canvas Frame with Laplacian Sharpening Filter
        const roiCanvas = preprocessCanvasROI(video, { x: roiX, y: roiY, width: roiWidth, height: roiHeight });

        // Tesseract OCR with Sparse Text Auto Detection (PSM 11)
        const worker = await getTesseractWorker();
        const tesseractResult = await worker.recognize(roiCanvas);

        const rawText = tesseractResult.data.text || '';
        setOcrStatus(rawText.trim() ? `선명 탐색: ${rawText.slice(0, 30)}...` : '기기 뒷면 전체를 편안하게 비추세요...');

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
            setOcrStatus(`★ 선명 감지 성공! IMEI: ${parsed.imei}`);
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
      height: 'calc(100vh - 100px)',
      gap: '10px',
      position: 'relative'
    }}>
      {/* Top Mobile Controls Bar: Refocus & Flashlight Torch */}
      <div style={{
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        padding: '8px 12px',
        borderRadius: '8px',
        border: '1px solid #334155'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShieldCheck size={16} style={{ color: isConfigured ? '#10b981' : '#f59e0b' }} />
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: isConfigured ? '#6ee7b7' : '#fef08a' }}>
            {isConfigured ? 'DB 실시간 자동 저장 중' : '로컬 스캔 모드'}
          </span>
        </div>

        {/* Refocus & Flashlight Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            className="btn btn-outline"
            style={{ padding: '3px 8px', fontSize: '0.75rem', borderColor: '#38bdf8', color: '#7dd3fc' }}
            onClick={triggerRefocus}
          >
            <RefreshCw size={13} /> 초점 재조정
          </button>

          {torchSupported && (
            <button
              className={`btn ${isTorchOn ? 'btn-success' : 'btn-outline'}`}
              style={{ padding: '3px 8px', fontSize: '0.75rem' }}
              onClick={toggleTorch}
            >
              {isTorchOn ? <Zap size={13} /> : <ZapOff size={13} />}
              {isTorchOn ? '플래시 ON' : '플래시 OFF'}
            </button>
          )}
        </div>
      </div>

      {/* Main Full-Frame Viewfinder Screen */}
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

        {/* Comfortable Broad Scanning Area Overlay */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '85%',
          height: '70%',
          border: '1px dashed rgba(56, 189, 248, 0.5)',
          borderRadius: '12px',
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
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
            기기 뒷면 전체를 편안하게 비추세요
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

        {/* Floating Controls over Camera */}
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          right: '10px',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center'
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

          <button className={`btn ${isScanning ? 'btn-danger' : 'btn-primary'}`} style={{ padding: '6px 14px', fontSize: '0.78rem' }} onClick={isScanning ? stopCamera : startCamera}>
            {isScanning ? <Square size={13} /> : <Play size={13} />}
            {isScanning ? '스캔 정지' : '스캔 시작'}
          </button>
        </div>
      </div>

      {/* OCR Status Banner */}
      <div style={{
        backgroundColor: '#1e293b',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '0.8rem',
        color: detectedPulse ? '#6ee7b7' : '#94a3b8',
        fontWeight: detectedPulse ? 700 : 500,
        textAlign: 'center',
        border: '1px solid #334155'
      }}>
        {ocrStatus}
      </div>

      {/* Bottom Compact Quick Items */}
      <div style={{
        backgroundColor: '#1e293b',
        borderRadius: '8px',
        padding: '8px 10px',
        border: '1px solid #334155',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>최근 감지 목록 ({scannedItems.length}건)</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="btn btn-outline" style={{ padding: '2px 6px', fontSize: '0.72rem' }} onClick={() => setShowManualModal(true)}>
              <Plus size={12} /> 수동 입력
            </button>
            <button className="btn btn-success" style={{ padding: '2px 6px', fontSize: '0.72rem' }} onClick={handleExportAll} disabled={scannedItems.length === 0 || isSaving}>
              <UploadCloud size={12} /> DB 내보내기
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
          {scannedItems.length === 0 ? (
            <span style={{ fontSize: '0.72rem', color: '#64748b', padding: '2px 0' }}>
              아직 감지된 항목이 없습니다. 기기 뒷면 전체를 편안하게 비추세요.
            </span>
          ) : (
            scannedItems.slice(0, 5).map((item) => (
              <div
                key={item.id}
                style={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '0.7rem',
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
