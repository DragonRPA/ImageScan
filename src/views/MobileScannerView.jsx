import React, { useRef, useEffect, useState } from 'react';
import { Camera, ZoomIn, ZoomOut, UploadCloud, Play, Square, Plus, Trash2, Volume2, ShieldCheck, Eye } from 'lucide-react';
import { getTesseractWorker, preprocessCanvasROI, parseFieldsFromText } from '../utils/ocrWorker';
import { triggerSuccessFeedback } from '../utils/soundFeedback';
import { saveScansToSupabase, getStoredConfig } from '../utils/supabaseClient';

export default function MobileScannerView({ onError, onOpenConfigModal }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);
  const magnifierCanvasRef = useRef(null);

  const [isScanning, setIsScanning] = useState(false);
  const [cameraStatus, setCameraStatus] = useState('카메라 준비 중');
  const [ocrStatus, setOcrStatus] = useState('3mm 각인 부위에 마이크로 타겟을 맞추세요');
  const [detectedPulse, setDetectedPulse] = useState(false);

  // Zoom Level (1.0x to 5.0x)
  const [zoomLevel, setZoomLevel] = useState(3.0);
  const [hardwareZoomSupported, setHardwareZoomSupported] = useState(false);

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

  // Start Camera Stream with Zoom Capabilities
  const startCamera = async () => {
    try {
      setCameraStatus('카메라 권한 요청 중...');
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      const track = stream.getVideoTracks()[0];
      if (track && track.getCapabilities) {
        const capabilities = track.getCapabilities();
        if (capabilities.zoom) {
          setHardwareZoomSupported(true);
          try {
            await track.applyConstraints({ advanced: [{ zoom: zoomLevel }] });
          } catch (e) {
            console.warn('Hardware zoom constrain failed:', e);
          }
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsScanning(true);
      setCameraStatus(`3mm 미세 각인 OCR 줌 ${zoomLevel}x 감지 중`);
    } catch (err) {
      console.error('Camera Access Error:', err);
      setCameraStatus('카메라 연결 실패');
      onError(`카메라 권한을 얻을 수 없습니다: ${err.message}`);
    }
  };

  // Change Hardware / Software Zoom
  const applyZoom = async (newZoom) => {
    const clamped = Math.max(1.0, Math.min(5.0, newZoom));
    setZoomLevel(clamped);

    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track && track.getCapabilities) {
        const cap = track.getCapabilities();
        if (cap.zoom) {
          try {
            const target = Math.min(cap.zoom.max, Math.max(cap.zoom.min, clamped));
            await track.applyConstraints({ advanced: [{ zoom: target }] });
          } catch (e) {
            // Ignore
          }
        }
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

  // Continuous Micro-Text OCR Scan Loop
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

        // Narrow Micro-Reticle for 3mm Etched Text
        const baseRoiWidth = Math.floor(vWidth * 0.75 / zoomLevel);
        const baseRoiHeight = Math.floor(vHeight * 0.15 / zoomLevel);
        const roiX = Math.floor((vWidth - baseRoiWidth) / 2);
        const roiY = Math.floor((vHeight - baseRoiHeight) / 2);

        // Preprocess High-Res ROI with 3x Upscaling
        const roiCanvas = preprocessCanvasROI(video, { x: roiX, y: roiY, width: baseRoiWidth, height: baseRoiHeight });

        // Update Magnifier Preview Canvas
        if (magnifierCanvasRef.current) {
          const mCtx = magnifierCanvasRef.current.getContext('2d');
          magnifierCanvasRef.current.width = roiCanvas.width;
          magnifierCanvasRef.current.height = roiCanvas.height;
          mCtx.drawImage(roiCanvas, 0, 0);
        }

        // Tesseract OCR
        const worker = await getTesseractWorker();
        const { data: { text } } = await worker.recognize(roiCanvas);

        setOcrStatus(text.trim() ? `3mm 감지: ${text.slice(0, 25)}...` : `3mm 각인 감지 중 (${zoomLevel.toFixed(1)}x 줌)...`);

        const parsed = parseFieldsFromText(text);

        if (parsed && parsed.imei) {
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
            setTimeout(() => setDetectedPulse(false), 900);

            if (isConfigured) {
              try {
                saveScansToSupabase([newItem]);
                newItem.status = 'EXPORTED';
              } catch (e) {
                console.error('Auto save error:', e);
              }
            }

            setScannedItems(prev => [newItem, ...prev]);
            setOcrStatus(`★ 3mm 감지 성공! IMEI: ${parsed.imei}`);
          }
        }
      } catch (err) {
        console.error('OCR Loop Error:', err);
      } finally {
        isProcessing = false;
      }
    }, 350);

    return () => {
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    };
  }, [isScanning, lastScannedImei, scannedItems, isConfigured, zoomLevel]);

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
      {/* Top Mobile Status Header */}
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
            {isConfigured ? 'DB 실시간 저장 중' : 'DB 설정 필요'}
          </span>
        </div>

        {/* Zoom Quick Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginRight: '4px' }}>3mm 각인 줌:</span>
          {[1.5, 2.5, 3.5, 5.0].map(z => (
            <button
              key={z}
              className={`btn ${zoomLevel === z ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '2px 6px', fontSize: '0.72rem', border: '1px solid #334155' }}
              onClick={() => applyZoom(z)}
            >
              {z}x
            </button>
          ))}
        </div>
      </div>

      {/* Main Viewfinder Screen with 3mm Magnifier */}
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

        {/* Live Magnifier Window Overlay (3mm Text Super-Magnified) */}
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          border: '2px solid #38bdf8',
          borderRadius: '8px',
          padding: '6px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          boxShadow: '0 4px 10px rgba(0,0,0,0.6)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#38bdf8', fontWeight: 700 }}>
            <Eye size={12} /> 3mm 미세 각인 돋보기 ({zoomLevel.toFixed(1)}x)
          </div>
          <canvas
            ref={magnifierCanvasRef}
            style={{
              width: '140px',
              height: '40px',
              borderRadius: '4px',
              border: '1px solid #334155',
              backgroundColor: '#fff'
            }}
          />
        </div>

        {/* Slim Micro-Reticle Box for 3mm Etched Text */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '80%',
          height: '14%',
          border: `2px dashed ${detectedPulse ? '#10b981' : '#38bdf8'}`,
          borderRadius: '8px',
          boxShadow: detectedPulse ? '0 0 30px rgba(16, 185, 129, 0.9)' : '0 0 0 9999px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justify: 'center',
          transition: 'all 0.2s ease'
        }}>
          <span style={{
            fontSize: '0.75rem',
            color: detectedPulse ? '#6ee7b7' : '#e0f2fe',
            fontWeight: 800,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            padding: '2px 8px',
            borderRadius: '4px'
          }}>
            {detectedPulse ? '★ 3mm IMEI 감지 성공!' : '3mm 레이저 각인 조준'}
          </span>
        </div>

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

          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="btn btn-outline" style={{ padding: '6px 10px', fontSize: '0.75rem', backgroundColor: 'rgba(15,23,42,0.8)' }} onClick={() => applyZoom(zoomLevel - 0.5)}>
              <ZoomOut size={14} />
            </button>
            <button className="btn btn-outline" style={{ padding: '6px 10px', fontSize: '0.75rem', backgroundColor: 'rgba(15,23,42,0.8)' }} onClick={() => applyZoom(zoomLevel + 0.5)}>
              <ZoomIn size={14} />
            </button>
            <button className={`btn ${isScanning ? 'btn-danger' : 'btn-primary'}`} style={{ padding: '6px 12px', fontSize: '0.78rem' }} onClick={isScanning ? stopCamera : startCamera}>
              {isScanning ? <Square size={13} /> : <Play size={13} />}
              {isScanning ? '정지' : '시작'}
            </button>
          </div>
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
              아직 감지된 항목이 없습니다. 3mm 각인에 조준하세요.
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
