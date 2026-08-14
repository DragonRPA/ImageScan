import React, { useState } from 'react';
import { Printer, X } from 'lucide-react';
import { generateCode39DataUrl } from '../utils/barcode39';

export default function LabelPrintModal({ isOpen, onClose, items }) {
  if (!isOpen) return null;

  const [labelWidth, setLabelWidth] = useState(65);  // mm
  const [labelHeight, setLabelHeight] = useState(35); // mm

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '750px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
            <Printer size={22} />
            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Code 39 라벨 프린터 출력 제어</h3>
          </div>
          <button className="btn btn-outline" style={{ padding: '4px 8px' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Label Dimension Adjuster */}
        <div style={{
          display: 'flex',
          gap: '16px',
          backgroundColor: '#0f172a',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '0.85rem'
        }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">라벨 가로 크기 (mm)</label>
            <input
              type="number"
              className="form-input"
              value={labelWidth}
              onChange={e => setLabelWidth(Number(e.target.value))}
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">라벨 세로 크기 (mm)</label>
            <input
              type="number"
              className="form-input"
              value={labelHeight}
              onChange={e => setLabelHeight(Number(e.target.value))}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handlePrint}>
              <Printer size={16} />
              프린터로 라벨 인쇄 ({items.length}매)
            </button>
          </div>
        </div>

        {/* Live Preview Area */}
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '10px' }}>
          [이미지 1] 실물 라벨 서식 1:1 미리보기 (Code 39 바코드: *자산번호*)
        </p>

        <div style={{
          maxHeight: '400px',
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
            const assetNo = item.asset_no || item.assetNo || `11112222`;
            const barcodeUrl = generateCode39DataUrl(assetNo);

            return (
              <div
                key={item.id || idx}
                className="label-sticker"
                style={{
                  width: `${labelWidth}mm`,
                  height: `${labelHeight}mm`,
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  padding: '10px 14px',
                  borderRadius: '4px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between',
                  boxSizing: 'border-box'
                }}
              >
                {/* 4 Key-Value Rows Right Aligned (Image 1 Spec) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px', fontWeight: 600 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ width: '35%', textAlign: 'right', paddingRight: '10px', color: '#333' }}>관리번호</span>
                    <span style={{ width: '65%', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: '12px' }}>
                      {assetNo}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ width: '35%', textAlign: 'right', paddingRight: '10px', color: '#333' }}>시리얼</span>
                    <span style={{ width: '65%', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: '12px' }}>
                      {item.serial_no || item.serialNo || 'R5KL60F0CZW'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ width: '35%', textAlign: 'right', paddingRight: '10px', color: '#333' }}>MAC</span>
                    <span style={{ width: '65%', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: '12px' }}>
                      {item.mac_address || item.macAddress || '4CEBB0B57A51'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ width: '35%', textAlign: 'right', paddingRight: '10px', color: '#333' }}>IMEI</span>
                    <span style={{ width: '65%', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: '12px' }}>
                      {item.imei || '351379300225052'}
                    </span>
                  </div>
                </div>

                {/* Bottom Code 39 Barcode */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '4px' }}>
                  {barcodeUrl ? (
                    <img
                      src={barcodeUrl}
                      alt={`Code39 Barcode ${assetNo}`}
                      style={{ height: '38px', maxWidth: '95%', objectFit: 'contain' }}
                    />
                  ) : (
                    <span style={{ fontSize: '9px', color: 'red' }}>바코드 생성 실패</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Printable Section for Browser Print Dialog */}
        <div className="print-area" style={{ display: 'none' }}>
          {items.map((item, idx) => {
            const assetNo = item.asset_no || item.assetNo || `11112222`;
            const barcodeUrl = generateCode39DataUrl(assetNo);
            return (
              <div key={`print_${item.id || idx}`} className="label-sticker" style={{ width: `${labelWidth}mm`, height: `${labelHeight}mm` }}>
                <div className="label-rows">
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
                  {barcodeUrl && <img src={barcodeUrl} className="label-barcode-img" alt="barcode" />}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', gap: '10px' }}>
          <button className="btn btn-outline" onClick={onClose}>
            닫기
          </button>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={16} />
            프린터 인쇄 출력 시작
          </button>
        </div>
      </div>
    </div>
  );
}
