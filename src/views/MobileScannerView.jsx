import React, { useRef, useEffect, useState } from 'react';
import { Camera, RefreshCw, UploadCloud, CheckCircle2, Play, Square, Plus, Trash2, Volume2, Database, ShieldCheck } from 'lucide-react';
import { getTesseractWorker, preprocessCanvasROI, parseFieldsFromText } from '../utils/ocrWorker';
import { triggerSuccessFeedback } from '../utils/soundFeedback';
import { saveScansToSupabase, getStoredConfig } from '../utils/supabaseClient';

export default function MobileScannerView({ onError, onOpenConfigModal }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);

  const [isScanning, setIsScanning] = useState(false);
  const [cameraStatus, setCameraStatus] = useState('카메라 준비 중');
  const [ocrStatus, setOcrStatus] = useState('IMEI 각인 부위에 카메라를 대세요');
  const [detectedPulse, setDetectedPulse] = useState(false);

  // Recent 3 scanned items only for compact mobile view
  const [scannedItems, setScannedItems] = useState([]);
  const [lastScannedImei, setLastScannedImei] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Manual Add Form Modal Toggle
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualAssetNo, setManualAssetNo] = useState('');
  const [manualImei, setManualImei] = useState('');
  const [manualMac, setManualMac] = useState('');
  const [manualSerial, setManualSerial] = useState('');

  const supabaseConfig = getStoredConfig();
  const isConfigured = Boolean(supabaseConfig.url && supabaseConfig.anonKey && !supabaseConfig.url.includes('your-supabase-project'));

  // Start Mobile Camera Stream
  const startCamera = async () => {
    try {
      setCameraStatus('카메라 권한 요청 중...');
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsScanning(true);
      setCameraStatus('실시간 무버튼 OCR 자동 감지 중');
    } catch (err) {
      console.error('Camera Access Error:', err);
      setCameraStatus('카메라 연결 실패');
      onError(`카메라 권한을 얻을 수 없습니다: ${err.message}`);
    }
  };

  // Stop Camera Stream
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

  // Continuous OCR Scan Loop
  useEffect(() => {
    if (!isScanning) return;

    let isProcessing = false;
    let lastScanTime = 0;

    scanTimerRef.current = setInterval(async () => {
      if (isProcessing || !videoRef.current || videoRef.current.readyState !== 4) return;
      const now = Date.now();
      if (now - lastScanTime < 400) return; // 400ms throttle

      isProcessing = true;
      try {
        const video = videoRef.current;
        const vWidth = video.videoWidth;
        const vHeight = video.videoHeight;

        if (!vWidth || !vHeight) {
          isProcessing = false;
          return;
        }

        const roiWidth = Math.floor(vWidth * 0.8);
        const roiHeight = Math.floor(vHeight * 0.3);
        const roiX = Math.floor((vWidth - roiWidth) / 2);
        const roiY = Math.floor((vHeight - roiHeight) / 2);

        const roiCanvas = preprocessCanvasROI(video, { x: roiX, y: roiY, width: roiWidth, height: roiHeight });

        const worker = await getTesseractWorker();
        const { data: { text } } = await worker.recognize(roiCanvas);

        setOcrStatus(text.trim() ? `감지: ${text.slice(0, 25)}...` : 'IMEI 감지 대기 중...');

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

            // Trigger sound & haptic feedback & pulse effect
            triggerSuccessFeedback();
            setDetectedPulse(true);
            setTimeout(() => setDetectedPulse(false), 900);

            // Auto Save to Supabase DB immediately if configured!
            if (isConfigured) {
              try {
                saveScansToSupabase([newItem]);
                newItem.status = 'EXPORTED';
              } catch (e) {
                console.error('Auto save error:', e);
              }
            }

            setScannedItems(prev => [newItem, ...prev]);
            setOcrStatus(`★ 감지 성공! IMEI: ${parsed.imei}`);
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
      height: 'calc(100vh - 110px)',
      gap: '12px',
      position: 'relative'
    }}>
      {/* Top Mobile Status Header */}
      <div style={{
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        padding: '10px 14px',
        borderRadius: '10px',
        border: '1px solid #334155'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={18} style={{ color: isConfigured ? '#10b981' : '#f59e0b' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isConfigured ? '#6ee7b7' : '#fef08a' }}>
            {isConfigured ? 'DB 실시간 저장 연동됨' : '로컬 모드 (DB 설정 필요)'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Volume2 size={16} style={{ color: '#38bdf8' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8' }}>
            누적 {scannedItems.length}건
          </span>
        </div>
      </div>

      {/* 100% Full Viewfinder Camera Screen */}
      <div style={{
        flex: 1,
        position: 'relative',
        backgroundColor: '#000',
        borderRadius: '16px',
        overflow: 'hidden',
        border: `3px solid ${detectedPulse ? '#10b981' : '#334155'}`,
        boxShadow: detectedPulse ? '0 0 25px rgba(16, 185, 129, 0.9)' : 'none',
        transition: 'all 0.25s ease'
      }}>
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />

        {/* Central ROI Target Overlay */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '85%',
          height: '28%',
          border: `2px dashed ${detectedPulse ? '#10b981' : '#38bdf8'}`,
          borderRadius: '12px',
          boxShadow: detectedPulse ? '0 0 30px rgba(16, 185, 129, 0.9)' : '0 0 0 9999px rgba(0, 0, 0, 0.55)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justify: 'center',
          gap: '6px',
          transition: 'all 0.2s ease'
        }}>
          <span style={{
            fontSize: '0.8rem',
            color: detectedPulse ? '#6ee7b7' : '#e0f2fe',
            fontWeight: 800,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            padding: '4px 10px',
            borderRadius: '6px'
          }}>
            {detectedPulse ? '★ IMEI 실시간 감지 성공!' : 'IMEI / 텍스트 중앙 조준'}
          </span>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
            버튼을 누르지 않아도 자동으로 인식됩니다
          </span>
        </div>

        {/* Floating Controls over Camera */}
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          right: '12px',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{
            fontSize: '0.75rem',
            color: '#fff',
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            padding: '6px 12px',
            borderRadius: '8px',
            fontWeight: 600
          }}>
            {cameraStatus}
          </div>

          <button
            className={`btn ${isScanning ? 'btn-danger' : 'btn-primary'}`}
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            onClick={isScanning ? stopCamera : startCamera}
          >
            {isScanning ? <Square size={14} /> : <Play size={14} />}
            {isScanning ? '스캔 정지' : '스캔 시작'}
          </button>
        </div>
      </div>

      {/* OCR Realtime Status Alert */}
      <div style={{
        backgroundColor: '#1e293b',
        padding: '10px 14px',
        borderRadius: '8px',
        fontSize: '0.85rem',
        color: detectedPulse ? '#6ee7b7' : '#94a3b8',
        fontWeight: detectedPulse ? 700 : 500,
        textAlign: 'center',
        border: '1px solid #334155'
      }}>
        {ocrStatus}
      </div>

      {/* Bottom Compact 3 Items Quick Bar */}
      <div style={{
        backgroundColor: '#1e293b',
        borderRadius: '10px',
        padding: '10px 12px',
        border: '1px solid #334155',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>최근 감지 목록 (PC 대시보드로 즉시 전송됨)</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="btn btn-outline" style={{ padding: '3px 8px', fontSize: '0.75rem' }} onClick={() => setShowManualModal(true)}>
              <Plus size={12} /> 수동 입력
            </button>
            <button className="btn btn-success" style={{ padding: '3px 8px', fontSize: '0.75rem' }} onClick={handleExportAll} disabled={scannedItems.length === 0 || isSaving}>
              <UploadCloud size={12} /> DB 내보내기
            </button>
          </div>
        </div>

        {/* Compact List Chips */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {scannedItems.length === 0 ? (
            <span style={{ fontSize: '0.75rem', color: '#64748b', padding: '4px 0' }}>
              아직 스캔된 항목이 없습니다. 카메라를 IMEI 각인 부위에 대세요.
            </span>
          ) : (
            scannedItems.slice(0, 5).map((item) => (
              <div
                key={item.id}
                style={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
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
            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.1rem' }}>수동 IMEI 데이터 입력</h3>
            <form onSubmit={handleAddManualItem} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
