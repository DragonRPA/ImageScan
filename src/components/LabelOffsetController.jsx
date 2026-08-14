import React, { useEffect } from 'react';
import { Sliders, RotateCcw, Printer, Move, Type, BarChart2, HelpCircle, Zap } from 'lucide-react';

const LOCAL_KEY_OFFSET = 'IMAGE_SCAN_PRINTER_OFFSET_CONFIG';

export function getStoredOffsetConfig() {
  try {
    const stored = localStorage.getItem(LOCAL_KEY_OFFSET);
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  return {
    offsetX: 0,
    offsetY: 0,
    fontSize: 11,
    barcodeHeight: 11,
    zplMode: false
  };
}

export function saveStoredOffsetConfig(config) {
  try {
    localStorage.setItem(LOCAL_KEY_OFFSET, JSON.stringify(config));
  } catch (e) {}
}

export default function LabelOffsetController({
  offsetConfig,
  onChangeConfig,
  onResetConfig,
  onTestPrint,
  onOpenPrinterGuide,
  onZplDirectPrint
}) {
  const handleChange = (field, value) => {
    const updated = {
      ...offsetConfig,
      [field]: typeof value === 'boolean' ? value : Number(value)
    };
    saveStoredOffsetConfig(updated);
    onChangeConfig(updated);
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                라벨 프린터 인쇄 위치(Offset) & ZPL 직통 출력 교정
              </h3>
              <span style={{ fontSize: '0.7rem', color: '#6ee7b7', backgroundColor: 'rgba(16,185,129,0.15)', padding: '2px 6px', borderRadius: '4px', border: '1px solid #10b981' }}>
                100% 영구 보존됨
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
              새로고침(F5) 시에도 오프셋(mm) 및 폰트/바코드 크기가 자동 유지됩니다.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* ZPL Direct Print Switcher */}
          <button
            className={`btn ${offsetConfig.zplMode ? 'btn-success' : 'btn-outline'}`}
            style={{ fontSize: '0.8rem', padding: '6px 10px' }}
            onClick={() => handleChange('zplMode', !offsetConfig.zplMode)}
          >
            <Zap size={14} />
            {offsetConfig.zplMode ? 'ZPL 직통 출력 [ON (팝업없음)]' : 'ZPL 직통 출력 [OFF (윈도우드라이버)]'}
          </button>

          <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '6px 10px', borderColor: '#38bdf8', color: '#7dd3fc' }} onClick={onOpenPrinterGuide}>
            <HelpCircle size={14} /> 프린터 목록 확인 가이드
          </button>
          
          <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '6px 10px' }} onClick={onResetConfig}>
            <RotateCcw size={14} /> 기본값 초기화
          </button>
          
          <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '6px 12px' }} onClick={offsetConfig.zplMode ? onZplDirectPrint : onTestPrint}>
            <Printer size={14} /> 테스트 라벨 1장 출력
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
