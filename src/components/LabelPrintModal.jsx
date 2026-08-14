import React, { useState } from 'react';
import { Printer, X, Sliders } from 'lucide-react';
import { generateCode39DataUrl } from '../utils/barcode39';

export default function LabelPrintModal({ isOpen, onClose, items, offsetConfig }) {
  if (!isOpen) return null;

  const config = offsetConfig || {
    offsetX: 0,
    offsetY: 0,
    fontSize: 11,
    barcodeHeight: 11
  };

  const [labelWidth, setLabelWidth] = useState(65);  // mm
  const [labelHeight, setLabelHeight] = useState(35); // mm

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '800px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
            <Printer size={22} />
            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Code 39 라벨 인쇄 (오프셋 보정 적용됨)</h3>
          </div>
          <button className="btn btn-outline" style={{ padding: '4px 8px' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Applied Offset Summary Banner */}
        <div style={{
          backgroundColor: '#0f172a',
          padding: '10px 14px',
          borderRadius: '8px',
          border: '1px solid #334155',
          marginBottom: '16px',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          fontSize: '0.8rem',
          color: '#94a3b8'
        }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span>오프셋 X: <strong style={{ color: '#38bdf8' }}>{config.offsetX}mm</strong></span>
            <span>오프셋 Y: <strong style={{ color: '#38bdf8' }}>{config.offsetY}mm</strong></span>
            <span>폰트 크기: <strong style={{ color: '#facc15' }}>{config.fontSize}px</strong></span>
            <span>바코드 높이: <strong style={{ color: '#10b981' }}>{config.barcodeHeight}mm</strong></span>
          </div>

          <button className="btn btn-primary" onClick={handlePrint} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
            <Printer size={14} /> 인쇄 출력 시작 ({items.length}매)
          </button>
        </div>

        {/* Live Preview Area */}
        <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '10px' }}>
          [이미지 1] 1:1 실물 라벨 서식 미리보기 (Code 39 바코드: *자산번호*)
        </p>

        <div style={{
          maxHeight: '380px',
          overflowY: 'auto',
          backgroundColor: '#0f172a',
          padding: '20px',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          {items.map((item, idx) => {
            const assetNo = item.asset_no || item.assetNo || `TEST0001`;
            const barcodeUrl = generateCode39DataUrl(assetNo, { height: config.barcodeHeight * 3 });

            return (
              <div
                key={item.id || idx}
                className="label-sticker"
                style={{
                  width: `${labelWidth}mm`,
                  height: `${labelHeight}mm`,
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  padding: '8px 12px',
                  borderRadius: '3px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between',
                  boxSizing: 'border-box',
                  transform: `translate(${config.offsetX * 2}px, ${config.offsetY * 2}px)`,
                  transition: 'transform 0.2s ease'
                }}
              >
                {/* 4 Key-Value Rows (Image 1 Spec) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: `${config.fontSize}px`, fontWeight: 600 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ width: '35%', textAlign: 'right', paddingRight: '8px', color: '#333' }}>관리번호</span>
                    <span style={{ width: '65%', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                      {assetNo}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ width: '35%', textAlign: 'right', paddingRight: '8px', color: '#333' }}>시리얼</span>
                    <span style={{ width: '65%', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                      {item.serial_no || item.serialNo || '-'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ width: '35%', textAlign: 'right', paddingRight: '8px', color: '#333' }}>MAC</span>
                    <span style={{ width: '65%', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                      {item.mac_address || item.macAddress || '-'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ width: '35%', textAlign: 'right', paddingRight: '8px', color: '#333' }}>IMEI</span>
                    <span style={{ width: '65%', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                      {item.imei || '-'}
                    </span>
                  </div>
                </div>

                {/* Bottom Code 39 Barcode */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '2px' }}>
                  {barcodeUrl ? (
                    <img
                      src={barcodeUrl}
                      alt={`Code39 Barcode ${assetNo}`}
                      style={{ height: `${config.barcodeHeight * 2.5}px`, maxWidth: '95%', objectFit: 'contain' }}
                    />
                  ) : (
                    <span style={{ fontSize: '9px', color: 'red' }}>바코드 생성 실패</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Printable Section for Browser Print Dialog with exact X/Y offset mm */}
        <div className="print-area" style={{ display: 'none' }}>
          {items.map((item, idx) => {
            const assetNo = item.asset_no || item.assetNo || `TEST0001`;
            const barcodeUrl = generateCode39DataUrl(assetNo, { height: config.barcodeHeight * 3.5 });
            return (
              <div
                key={`print_${item.id || idx}`}
                className="label-sticker"
                style={{
                  width: `${labelWidth}mm`,
                  height: `${labelHeight}mm`,
                  margin: `${config.offsetY}mm 0 0 ${config.offsetX}mm`,
                  fontSize: `${config.fontSize}px`
                }}
              >
                <div className="label-rows" style={{ fontSize: `${config.fontSize}px` }}>
                  <div className="label-row">
                    <span className="label-key">관리번호</span>
                    <span className="label-val">{assetNo}</span>
                  </div>
                  <div className="label-row">
                    <span className="label-key">시리얼</span>
                    <span className="label-val">{item.serial_no || item.serialNo || '-'}</span>
                  </div>
                  <div className="label-row">
                    <span className="label-key">MAC</span>
                    <span className="label-val">{item.mac_address || item.macAddress || '-'}</span>
                  </div>
                  <div className="label-row">
                    <span className="label-key">IMEI</span>
                    <span className="label-val">{item.imei}</span>
                  </div>
                </div>
                <div className="label-barcode-container">
                  {barcodeUrl && (
                    <img
                      src={barcodeUrl}
                      className="label-barcode-img"
                      style={{ height: `${config.barcodeHeight}mm` }}
                      alt="barcode"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', gap: '10px' }}>
          <button className="btn btn-outline" onClick={onClose}>
            닫기
          </button>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={16} />
            프린터 인쇄 시작
          </button>
        </div>
      </div>
    </div>
  );
}
