import React, { useState, useEffect } from 'react';
import { Printer, Usb, CheckCircle, Info, X, ExternalLink, RefreshCw } from 'lucide-react';

export default function PrinterGuideModal({ isOpen, onClose, onTestPrint }) {
  const [usbDevices, setUsbDevices] = useState([]);
  const [isScanningUsb, setIsScanningUsb] = useState(false);
  const [webUsbSupported, setWebUsbSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'navigator' in window && 'usb' in navigator) {
      setWebUsbSupported(true);
    }
  }, []);

  if (!isOpen) return null;

  // Scan WebUSB connected label printers
  const scanUsbPrinters = async () => {
    if (!webUsbSupported) return;
    setIsScanningUsb(true);
    try {
      // Request device or list paired USB devices
      const paired = await navigator.usb.getDevices();
      setUsbDevices(paired);
    } catch (e) {
      console.warn('WebUSB Scan error:', e);
    } finally {
      setIsScanningUsb(false);
    }
  };

  const requestUsbPairing = async () => {
    if (!webUsbSupported) {
      alert('현재 브라우저는 WebUSB를 지원하지 않습니다. (Chrome, Edge 브라우저 권장)');
      return;
    }
    try {
      const device = await navigator.usb.requestDevice({ filters: [] });
      if (device) {
        setUsbDevices(prev => [...prev, device]);
        alert(`USB 라벨 프린터(${device.productName || '장치'})가 연결되었습니다!`);
      }
    } catch (e) {
      console.warn('USB Pairing cancelled or error:', e);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '700px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
            <Printer size={22} />
            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>PC 프린터 목록 확인 & 라벨 출력 가이드</h3>
          </div>
          <button className="btn btn-outline" style={{ padding: '4px 8px' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Guide Banner */}
        <div style={{
          backgroundColor: '#0f172a',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #334155',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Info size={16} /> PC 웹브라우저에서 프린터 목록 확인하는 2가지 방법
          </h4>

          <div style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.6 }}>
            <p style={{ marginBottom: '8px' }}>
              <strong>방법 1. 인쇄 창(Print Dialog)에서 자동 확인 (추천)</strong><br />
              웹앱의 <strong>[Code 39 라벨 인쇄]</strong> 또는 <strong>[테스트 라벨 1장 출력]</strong> 버튼을 누르면, 브라우저 인쇄 창의 <strong>'대상 (Destination)'</strong> 드롭다운에 Windows PC에 설치된 <strong>모든 프린터 목록(빅솔론, 지브라, 엑스프린터 등)이 자동 표시</strong>됩니다.
            </p>
            <p>
              <strong>방법 2. Windows 설정에서 확인</strong><br />
              Windows <code>시작 ➔ 설정 ➔ 장치 ➔ 프린터 및 스캐너</code> 메뉴에서 라벨 프린터가 정상 연결되어 있는지 확인합니다.
            </p>
          </div>
        </div>

        {/* WebUSB Direct Printer Scanner (Advanced) */}
        <div style={{
          backgroundColor: '#0f172a',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #334155',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Usb size={16} style={{ color: '#10b981' }} /> USB 직접 연결 라벨 프린터 감지 (WebUSB)
            </span>
            <button className="btn btn-outline" style={{ fontSize: '0.78rem', padding: '4px 8px' }} onClick={requestUsbPairing}>
              + USB 라벨 프린터 추가 감지
            </button>
          </div>

          {usbDevices.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
              직접 연결된 WebUSB 장치가 없습니다. 일반 Windows 프린터 드라이버를 통해 출력하시려면 아래 <strong>[테스트 라벨 인쇄]</strong>를 눌러 프린터 목록을 확인하세요.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {usbDevices.map((dev, i) => (
                <div key={i} style={{
                  backgroundColor: '#1e293b',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  color: '#6ee7b7',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <CheckCircle size={14} />
                  <span><strong>{dev.productName || 'USB 라벨 프린터'}</strong> (Vendor ID: {dev.vendorId})</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Print Setup Checklist */}
        <div style={{
          backgroundColor: 'rgba(234, 179, 8, 0.1)',
          border: '1px solid #eab308',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '0.82rem',
          color: '#fef08a',
          marginBottom: '20px'
        }}>
          <strong>💡 라벨 프린터 출력을 위한 3초 설정 조언:</strong>
          <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
            <li>인쇄 창이 뜨면 <strong>여백(Margins)</strong>을 <strong>'없음 (None)'</strong>으로 설정하세요.</li>
            <li><strong>배율(Scale)</strong>을 <strong>'맞춤 (Fit to printable area)'</strong>으로 설정하시면 라벨지에 깔끔하게 들어맞습니다.</li>
          </ul>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
          <button className="btn btn-primary" onClick={onTestPrint}>
            <Printer size={16} /> 테스트 라벨 출력하여 프린터 목록 확인
          </button>

          <button className="btn btn-outline" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
