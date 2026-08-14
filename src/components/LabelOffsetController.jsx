import React from 'react';
import { Sliders, RotateCcw, Printer, Move, Type, BarChart2 } from 'lucide-react';

export default function LabelOffsetController({
  offsetConfig,
  onChangeConfig,
  onResetConfig,
  onTestPrint
}) {
  const handleChange = (field, value) => {
    onChangeConfig({
      ...offsetConfig,
      [field]: Number(value)
    });
  };

  return (
    <div style={{
      backgroundColor: '#1e293b',
      border: '1px solid #334155',
      borderRadius: '12px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sliders size={22} style={{ color: '#38bdf8' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
              라벨 프린터 인쇄 위치(Offset) & 바코드 크기 정밀 교정
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
              실물 라벨 스티커 인쇄 시 여백 오차(mm) 및 폰트/바코드 크기를 정밀 보정합니다.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-outline" style={{ fontSize: '0.85rem', padding: '6px 12px' }} onClick={onResetConfig}>
            <RotateCcw size={14} /> 기본값 초기화
          </button>
          <button className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '6px 14px' }} onClick={onTestPrint}>
            <Printer size={15} /> 테스트 라벨 1장 출력
          </button>
        </div>
      </div>

      {/* Grid Controllers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        backgroundColor: '#0f172a',
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid #334155'
      }}>
        {/* 1. X Offset */}
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Move size={14} style={{ color: '#38bdf8' }} /> X 위치 오프셋 (좌/우)
            </label>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8' }}>{offsetConfig.offsetX} mm</span>
          </div>
          <input
            type="range"
            min="-25"
            max="25"
            step="0.5"
            value={offsetConfig.offsetX}
            onChange={e => handleChange('offsetX', e.target.value)}
            style={{ width: '100%', cursor: 'pointer' }}
          />
        </div>

        {/* 2. Y Offset */}
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Move size={14} style={{ color: '#38bdf8', transform: 'rotate(90deg)' }} /> Y 위치 오프셋 (상/하)
            </label>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8' }}>{offsetConfig.offsetY} mm</span>
          </div>
          <input
            type="range"
            min="-25"
            max="25"
            step="0.5"
            value={offsetConfig.offsetY}
            onChange={e => handleChange('offsetY', e.target.value)}
            style={{ width: '100%', cursor: 'pointer' }}
          />
        </div>

        {/* 3. Font Size */}
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Type size={14} style={{ color: '#facc15' }} /> 텍스트 폰트 크기
            </label>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#facc15' }}>{offsetConfig.fontSize} px</span>
          </div>
          <input
            type="range"
            min="8"
            max="22"
            step="0.5"
            value={offsetConfig.fontSize}
            onChange={e => handleChange('fontSize', e.target.value)}
            style={{ width: '100%', cursor: 'pointer' }}
          />
        </div>

        {/* 4. Barcode Height */}
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <BarChart2 size={14} style={{ color: '#10b981' }} /> Code 39 바코드 높이
            </label>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981' }}>{offsetConfig.barcodeHeight} mm</span>
          </div>
          <input
            type="range"
            min="5"
            max="25"
            step="0.5"
            value={offsetConfig.barcodeHeight}
            onChange={e => handleChange('barcodeHeight', e.target.value)}
            style={{ width: '100%', cursor: 'pointer' }}
          />
        </div>
      </div>
    </div>
  );
}
