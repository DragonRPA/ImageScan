import React, { useState, useEffect } from 'react';
import { Printer, Usb, CheckCircle, Info, X, Zap } from 'lucide-react';
import { generateZplCode, sendZplToWebSerial } from '../utils/zplPrinter';

export default function PrinterGuideModal({ isOpen, onClose, onTestPrint }) {
  const [usbDevices, setUsbDevices] = useState([]);
  const [isScanningUsb, setIsScanningUsb] = useState(false);
  const [webUsbSupported, setWebUsbSupported] = useState(false);
  const [webSerialSupported, setWebSerialSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'navigator' in window) {
      if ('usb' in navigator) setWebUsbSupported(true);
      if ('serial' in navigator) setWebSerialSupported(true);
    }
  }, []);

  if (!isOpen) return null;

  const handleDirectZplTest = async () => {
    const testSampleItem = {
      asset_no: 'TEST0001',
      imei: '351379300225052',
      mac_address: '4CEBB0B57A51',
      serial_no: 'R5KL60F0CZW'
    };
    try {
      const zplCode = generateZplCode(testSampleItem, { offsetX: 0, offsetY: 0, fontSize: 11, barcodeHeight: 11 });
      const res = await sendZplToWebSerial(zplCode);
      alert(res.message || 'ZPL 코드 1매가 라벨 프린터로 직통 전송되었습니다!');
    } catch (err) {
      alert(`ZPL 직접 출력 오류: ${err.message}`);
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
        alert(`USB 라벨 프린터(${device.productName || '장치'})가 감지되었습니다!`);
      }
    } catch (e) {
      console.warn('USB Pairing cancelled or error:', e);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '720px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
            <Printer size={22} />
            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>ZPL 직통 인쇄 & PC 프린터 목록 가이드</h3>
          </div>
          <button className="btn btn-outline" style={{ padding: '4px 8px' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* ZPL Direct Raw Print Feature Callout */}
        <div style={{
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid #10b981',
          padding: '14px',
          borderRadius: '8px',
          marginBottom: '16px',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={16} /> 팝업 없는 ZPL II 열전사 직통 인쇄 모드
            </h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#cbd5e1' }}>
              윈도우 인쇄 대화상자 없이 USB/시리얼 연결 라벨 프린터로 ZPL 코드를 0.05초 만에 직접 송신합니다.
            </p>
          </div>

          <button className="btn btn-success" style={{ fontSize: '0.8rem', padding: '6px 12px' }} onClick={handleDirectZplTest}>
            <Zap size={14} /> ZPL 직통 테스트 출력
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

        {/* WebUSB Direct Printer Scanner */}
        <div style={{
          backgroundColor: '#0f172a',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #334155',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Usb size={16} style={{ color: '#10b981' }} /> USB/Serial 직접 연결 라벨 프린터 감지
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

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
          <button className="btn btn-primary" onClick={onTestPrint}>
            <Printer size={16} /> 윈도우 일반 테스트 라벨 출력
          </button>

          <button className="btn btn-outline" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
