import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  Move,
  Type,
  BarChart2,
  Sliders,
  RotateCcw,
  Save,
  Printer,
  Eye,
  Code,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import {
  DEFAULT_LABEL_TEMPLATE,
  getStoredLabelTemplate,
  saveStoredLabelTemplate,
  generateDynamicZpl,
  mmToDots
} from '../utils/labelTemplate';
import { generateCode39DataUrl } from '../utils/barcode39';
import { insertPrintQueue } from '../utils/supabaseClient';

// 샘플 테스트 데이터
const SAMPLE_ITEM = {
  asset_no: 'TEST0001',
  imei: '351379300225052',
  serial_no: 'R5KL60F0CZW',
  mac_address: '4CEBB0B57A51',
  scanned_at: '2026-08-15'
};

export default function LabelDesignerTab({ onError, onOpenPrintModal }) {
  const [template, setTemplate] = useState(getStoredLabelTemplate);
  const [selectedElemId, setSelectedElemId] = useState('elem_asset_no');
  const [activeRightTab, setActiveRightTab] = useState('preview'); // 'preview' | 'zpl'
  const [isSaved, setIsSaved] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // 캔버스 드래그 상태
  const [draggingId, setDraggingId] = useState(null);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [elemStartPos, setElemStartPos] = useState({ xMm: 0, yMm: 0 });

  const canvasRef = useRef(null);

  // 캔버스 화면 픽셀 배율 (1mm당 화면 픽셀 수, 기본 7.0px/mm)
  const PX_PER_MM = 7.5;
  const canvasWidthPx = (template.paper.widthMm || 72) * PX_PER_MM;
  const canvasHeightPx = (template.paper.heightMm || 40) * PX_PER_MM;

  const selectedElem = (template.elements || []).find(e => e.id === selectedElemId) || null;

  // 템플릿 변경 핸들러
  const handlePaperChange = (field, val) => {
    const num = Number(val) || 0;
    setTemplate(prev => ({
      ...prev,
      paper: {
        ...prev.paper,
        [field]: num,
        dotsWidth: field === 'widthMm' ? mmToDots(num, prev.paper.dpi) : prev.paper.dotsWidth,
        dotsHeight: field === 'heightMm' ? mmToDots(num, prev.paper.dpi) : prev.paper.dotsHeight
      }
    }));
    setIsSaved(false);
  };

  // 엘리먼트 가시성 토글
  const handleToggleVisible = (id) => {
    setTemplate(prev => ({
      ...prev,
      elements: prev.elements.map(elem => {
        if (elem.id === id) {
          return { ...elem, visible: !elem.visible };
        }
        return elem;
      })
    }));
    setIsSaved(false);
  };

  // 선택된 엘리먼트 속성 업데이트
  const handleElemPropChange = (field, value) => {
    if (!selectedElemId) return;
    setTemplate(prev => ({
      ...prev,
      elements: prev.elements.map(elem => {
        if (elem.id === selectedElemId) {
          return {
            ...elem,
            [field]: (field === 'xMm' || field === 'yMm' || field === 'fontSizePt' || field === 'heightMm' || field === 'widthMm' || field === 'thicknessMm')
              ? Number(value)
              : value
          };
        }
        return elem;
      })
    }));
    setIsSaved(false);
  };

  // 캔버스 마우스 드래그 시작
  const handleMouseDown = (e, elemId) => {
    e.stopPropagation();
    setSelectedElemId(elemId);
    setDraggingId(elemId);
    setDragStartPos({ x: e.clientX, y: e.clientY });

    const targetElem = template.elements.find(el => el.id === elemId);
    if (targetElem) {
      setElemStartPos({ xMm: targetElem.xMm, yMm: targetElem.yMm });
    }
  };

  // 마우스 이동 핸들러 (Window 전역 등록)
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!draggingId) return;

      const deltaX = e.clientX - dragStartPos.x;
      const deltaY = e.clientY - dragStartPos.y;

      const deltaXmm = deltaX / PX_PER_MM;
      const deltaYmm = deltaY / PX_PER_MM;

      // 0.25mm 단위 스냅
      const rawX = Math.max(0, Math.min(template.paper.widthMm - 5, elemStartPos.xMm + deltaXmm));
      const rawY = Math.max(0, Math.min(template.paper.heightMm - 2, elemStartPos.yMm + deltaYmm));
      const snapX = Math.round(rawX * 4) / 4;
      const snapY = Math.round(rawY * 4) / 4;

      setTemplate(prev => ({
        ...prev,
        elements: prev.elements.map(el => {
          if (el.id === draggingId) {
            return { ...el, xMm: snapX, yMm: snapY };
          }
          return el;
        })
      }));
      setIsSaved(false);
    };

    const handleMouseUp = () => {
      if (draggingId) {
        setDraggingId(null);
      }
    };

    if (draggingId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingId, dragStartPos, elemStartPos, template.paper.widthMm, template.paper.heightMm]);

  // 서식 영구 저장
  const handleSave = () => {
    saveStoredLabelTemplate(template);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  // 기본값 초기화
  const handleReset = () => {
    if (window.confirm('라벨 서식을 초기 72mm x 40mm 기본 규격으로 되돌리시겠습니까?')) {
      setTemplate(DEFAULT_LABEL_TEMPLATE);
      saveStoredLabelTemplate(DEFAULT_LABEL_TEMPLATE);
      setSelectedElemId('elem_asset_no');
    }
  };

  // 테스트 1장 인쇄
  const handleTestPrint = async () => {
    setIsPrinting(true);
    try {
      // 1. Supabase print_queue 등록 (PC 로컬 에이전트 자동 출력)
      await insertPrintQueue({
        asset_no: SAMPLE_ITEM.asset_no,
        imei: SAMPLE_ITEM.imei,
        mac_address: SAMPLE_ITEM.mac_address,
        serial_no: SAMPLE_ITEM.serial_no
      });
      alert(`🖨️ 테스트 출력 요청이 등록되었습니다!\nPC 로컬 에이전트(Zebra GK-420D)로 자동 인쇄됩니다.`);
    } catch (err) {
      console.warn('프린트 큐 등록 실패, 일반 인쇄 모달 호출:', err);
      if (onOpenPrintModal) {
        onOpenPrintModal([SAMPLE_ITEM]);
      } else {
        alert(`인쇄 오류: ${err.message}`);
      }
    } finally {
      setIsPrinting(false);
    }
  };

  // 실시간 생성된 ZPL 코드
  const currentZpl = generateDynamicZpl(SAMPLE_ITEM, template);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      color: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Top Action & Status Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '12px',
        padding: '12px 18px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sliders size={20} style={{ color: '#38bdf8' }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                라벨 서식 디자이너 (Visual Label Designer)
              </h2>
              <span style={{
                fontSize: '0.68rem',
                backgroundColor: 'rgba(56,189,248,0.15)',
                color: '#38bdf8',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid #38bdf8'
              }}>
                72×40mm / Zebra ZPL II 호환
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
              스키마 항목을 체크하고 캔버스 위에서 마우스로 드래그하여 인쇄 위치를 자유롭게 배치하세요.
            </p>
          </div>
        </div>

        {/* Top Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleReset}
            className="btn btn-outline"
            style={{ fontSize: '0.78rem', padding: '6px 12px' }}
          >
            <RotateCcw size={13} /> 기본값 초기화
          </button>
          <button
            onClick={handleSave}
            className={`btn ${isSaved ? 'btn-success' : 'btn-primary'}`}
            style={{ fontSize: '0.78rem', padding: '6px 14px' }}
          >
            <Save size={13} /> {isSaved ? '저장 완료!' : '서식 템플릿 저장'}
          </button>
          <button
            onClick={handleTestPrint}
            disabled={isPrinting}
            className="btn"
            style={{
              backgroundColor: '#10b981',
              color: '#fff',
              border: 'none',
              fontSize: '0.78rem',
              padding: '6px 14px'
            }}
          >
            <Printer size={13} /> {isPrinting ? '전송 중...' : '🖨️ 테스트 1장 인쇄'}
          </button>
        </div>
      </div>

      {/* 3-Column Main Workspace */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '290px 1fr 340px',
        gap: '16px',
        alignItems: 'start'
      }}>
        {/* ── [1/3] 좌측 패널: 스키마 체크박스 & 속성 편집기 ──────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* 용지 규격 패널 */}
          <div style={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '10px',
            padding: '14px'
          }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px' }}>
              용지 규격 설정
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.72rem', color: '#cbd5e1', whiteSpace: 'nowrap' }}>가로 폭 (mm)</label>
                <input
                  type="number"
                  value={template.paper.widthMm}
                  onChange={e => handlePaperChange('widthMm', e.target.value)}
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '6px',
                    padding: '6px 8px',
                    color: '#f8fafc',
                    fontSize: '0.82rem'
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.72rem', color: '#cbd5e1', whiteSpace: 'nowrap' }}>세로 높이 (mm)</label>
                <input
                  type="number"
                  value={template.paper.heightMm}
                  onChange={e => handlePaperChange('heightMm', e.target.value)}
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '6px',
                    padding: '6px 8px',
                    color: '#f8fafc',
                    fontSize: '0.82rem'
                  }}
                />
              </div>
            </div>
          </div>

          {/* 스키마 출력 항목 선택 리스트 */}
          <div style={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '10px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>
              출력 항목 선택 (체크박스)
            </div>
            <p style={{ fontSize: '0.7rem', color: '#64748b', margin: '0 0 4px 0' }}>
              체크된 항목만 라벨에 인쇄되며 캔버스에 표시됩니다.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {template.elements.map(elem => {
                const isSelected = elem.id === selectedElemId;
                return (
                  <div
                    key={elem.id}
                    onClick={() => setSelectedElemId(elem.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      backgroundColor: isSelected ? '#334155' : '#0f172a',
                      border: `1px solid ${isSelected ? '#38bdf8' : '#1e293b'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleVisible(elem.id);
                        }}
                        style={{ color: elem.visible ? '#38bdf8' : '#64748b', cursor: 'pointer' }}
                      >
                        {elem.visible ? <CheckSquare size={16} /> : <Square size={16} />}
                      </span>
                      <span style={{
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: elem.visible ? '#f8fafc' : '#64748b',
                        whiteSpace: 'nowrap'
                      }}>
                        {elem.name}
                      </span>
                    </div>

                    <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                      ({elem.xMm}, {elem.yMm}mm)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 선택 객체 세부 속성 편집기 */}
          {selectedElem && (
            <div style={{
              backgroundColor: '#1e293b',
              border: '1px solid #38bdf8',
              borderRadius: '10px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8' }}>
                  ⚙️ {selectedElem.name} 속성
                </span>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                  {selectedElem.type}
                </span>
              </div>

              {/* 위치 좌표 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>X 위치 (mm)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={selectedElem.xMm}
                    onChange={e => handleElemPropChange('xMm', e.target.value)}
                    style={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #475569',
                      borderRadius: '6px',
                      padding: '5px 8px',
                      color: '#f8fafc',
                      fontSize: '0.8rem'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>Y 위치 (mm)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={selectedElem.yMm}
                    onChange={e => handleElemPropChange('yMm', e.target.value)}
                    style={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #475569',
                      borderRadius: '6px',
                      padding: '5px 8px',
                      color: '#f8fafc',
                      fontSize: '0.8rem'
                    }}
                  />
                </div>
              </div>

              {/* 텍스트 전용 속성 */}
              {selectedElem.type === 'text' && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>접두어 문구 (Prefix)</label>
                    <input
                      type="text"
                      value={selectedElem.prefix || ''}
                      onChange={e => handleElemPropChange('prefix', e.target.value)}
                      placeholder="예: IMEI: "
                      style={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #475569',
                        borderRadius: '6px',
                        padding: '5px 8px',
                        color: '#f8fafc',
                        fontSize: '0.8rem'
                      }}
                    />
                  </div>
                  {selectedElem.field === 'custom' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>고정 텍스트 내용</label>
                      <input
                        type="text"
                        value={selectedElem.customValue || ''}
                        onChange={e => handleElemPropChange('customValue', e.target.value)}
                        style={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #475569',
                          borderRadius: '6px',
                          padding: '5px 8px',
                          color: '#f8fafc',
                          fontSize: '0.8rem'
                        }}
                      />
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>폰트 크기 (Pt)</label>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#facc15' }}>{selectedElem.fontSizePt} Pt</span>
                    </div>
                    <input
                      type="range"
                      min="12"
                      max="40"
                      step="2"
                      value={selectedElem.fontSizePt || 20}
                      onChange={e => handleElemPropChange('fontSizePt', e.target.value)}
                      style={{ width: '100%', cursor: 'pointer' }}
                    />
                  </div>
                </>
              )}

              {/* 바코드 전용 속성 */}
              {selectedElem.type === 'barcode' && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>바코드 대상 필드</label>
                    <select
                      value={selectedElem.targetField || 'asset_no'}
                      onChange={e => handleElemPropChange('targetField', e.target.value)}
                      style={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #475569',
                        borderRadius: '6px',
                        padding: '5px 8px',
                        color: '#f8fafc',
                        fontSize: '0.8rem'
                      }}
                    >
                      <option value="asset_no">관리번호 (자산번호)</option>
                      <option value="imei">IMEI</option>
                      <option value="serial_no">시리얼번호</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>바코드 높이 (mm)</label>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981' }}>{selectedElem.heightMm} mm</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="25"
                      step="0.5"
                      value={selectedElem.heightMm || 10}
                      onChange={e => handleElemPropChange('heightMm', e.target.value)}
                      style={{ width: '100%', cursor: 'pointer' }}
                    />
                  </div>
                </>
              )}

              {/* 구분선 전용 속성 */}
              {selectedElem.type === 'line' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>선 길이 (mm)</label>
                  <input
                    type="number"
                    step="1"
                    value={selectedElem.widthMm || 60}
                    onChange={e => handleElemPropChange('widthMm', e.target.value)}
                    style={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #475569',
                      borderRadius: '6px',
                      padding: '5px 8px',
                      color: '#f8fafc',
                      fontSize: '0.8rem'
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── [2/3] 중앙 패널: 비주얼 라벨 캔버스 (Drag & Drop) ─────────────── */}
        <div style={{
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '10px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          minHeight: '520px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Eye size={16} style={{ color: '#38bdf8' }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>
                빈 라벨 캔버스 (드래그하여 배치)
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              규격: {template.paper.widthMm}mm × {template.paper.heightMm}mm (203 DPI)
            </span>
          </div>

          {/* 눈금자 & 격자 안내 */}
          <div style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#0f172a',
            padding: '24px',
            borderRadius: '8px',
            border: '1px dashed #334155',
            overflow: 'auto'
          }}>
            {/* 실물 비율 캔버스 */}
            <div
              ref={canvasRef}
              style={{
                width: `${canvasWidthPx}px`,
                height: `${canvasHeightPx}px`,
                backgroundColor: '#ffffff',
                color: '#000000',
                borderRadius: '3px',
                position: 'relative',
                boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                border: '1px solid #cbd5e1',
                userSelect: 'none',
                overflow: 'hidden'
              }}
            >
              {/* 배경 서브 눈금 그리드선 (5mm 단위) */}
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'linear-gradient(to right, #f1f5f9 1px, transparent 1px), linear-gradient(to bottom, #f1f5f9 1px, transparent 1px)',
                backgroundSize: `${5 * PX_PER_MM}px ${5 * PX_PER_MM}px`,
                pointerEvents: 'none'
              }} />

              {/* 캔버스 위 엘리먼트 렌더링 */}
              {template.elements.map(elem => {
                if (!elem.visible) return null;

                const isSelected = elem.id === selectedElemId;
                const isDragging = elem.id === draggingId;
                const leftPx = elem.xMm * PX_PER_MM;
                const topPx = elem.yMm * PX_PER_MM;

                // 값 매핑
                let displayText = `${elem.prefix || ''}`;
                if (elem.field === 'asset_no') displayText += SAMPLE_ITEM.asset_no;
                else if (elem.field === 'imei') displayText += SAMPLE_ITEM.imei;
                else if (elem.field === 'serial_no') displayText += SAMPLE_ITEM.serial_no;
                else if (elem.field === 'mac_address') displayText += SAMPLE_ITEM.mac_address;
                else if (elem.field === 'scanned_at') displayText += SAMPLE_ITEM.scanned_at;
                else if (elem.field === 'custom') displayText += elem.customValue || '';

                if (elem.type === 'line') {
                  const lineWPx = (elem.widthMm || 60) * PX_PER_MM;
                  const lineThickPx = Math.max(1, (elem.thicknessMm || 0.25) * PX_PER_MM);
                  return (
                    <div
                      key={elem.id}
                      onMouseDown={e => handleMouseDown(e, elem.id)}
                      style={{
                        position: 'absolute',
                        left: `${leftPx}px`,
                        top: `${topPx}px`,
                        width: `${lineWPx}px`,
                        height: `${lineThickPx}px`,
                        backgroundColor: '#000000',
                        cursor: 'move',
                        outline: isSelected ? '2px solid #0284c7' : 'none',
                        outlineOffset: '2px',
                        zIndex: isSelected ? 10 : 2
                      }}
                    />
                  );
                }

                if (elem.type === 'barcode') {
                  const barcodeHeightPx = (elem.heightMm || 10) * PX_PER_MM;
                  let bcVal = SAMPLE_ITEM.asset_no;
                  if (elem.targetField === 'imei') bcVal = SAMPLE_ITEM.imei;
                  else if (elem.targetField === 'serial_no') bcVal = SAMPLE_ITEM.serial_no;

                  const barcodeDataUrl = generateCode39DataUrl(bcVal, { height: barcodeHeightPx * 2 });

                  return (
                    <div
                      key={elem.id}
                      onMouseDown={e => handleMouseDown(e, elem.id)}
                      style={{
                        position: 'absolute',
                        left: `${leftPx}px`,
                        top: `${topPx}px`,
                        cursor: 'move',
                        padding: '2px 4px',
                        border: isSelected ? '1.5px dashed #0284c7' : '1px solid transparent',
                        backgroundColor: isSelected ? 'rgba(2,132,199,0.08)' : 'transparent',
                        borderRadius: '3px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        zIndex: isSelected ? 10 : 3
                      }}
                    >
                      {barcodeDataUrl ? (
                        <img
                          src={barcodeDataUrl}
                          alt="Barcode"
                          style={{
                            height: `${barcodeHeightPx}px`,
                            maxWidth: '100%',
                            pointerEvents: 'none',
                            display: 'block'
                          }}
                        />
                      ) : (
                        <div style={{ fontSize: '10px', color: '#666', border: '1px solid #ccc', padding: '4px' }}>
                          [Code39: {bcVal}]
                        </div>
                      )}
                      {elem.showText && (
                        <span style={{ fontSize: '9px', fontWeight: 700, fontFamily: 'monospace', marginTop: '1px' }}>
                          *{bcVal}*
                        </span>
                      )}
                    </div>
                  );
                }

                // 일반 텍스트
                const fontSizePx = (elem.fontSizePt || 20) * 0.55;
                return (
                  <div
                    key={elem.id}
                    onMouseDown={e => handleMouseDown(e, elem.id)}
                    style={{
                      position: 'absolute',
                      left: `${leftPx}px`,
                      top: `${topPx}px`,
                      cursor: 'move',
                      padding: '1px 4px',
                      fontSize: `${fontSizePx}px`,
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      whiteSpace: 'nowrap',
                      border: isSelected ? '1.5px dashed #0284c7' : '1px solid transparent',
                      backgroundColor: isSelected ? 'rgba(2,132,199,0.08)' : 'transparent',
                      borderRadius: '3px',
                      zIndex: isSelected ? 10 : 4
                    }}
                  >
                    {displayText}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ fontSize: '0.72rem', color: '#64748b', textAlign: 'center' }}>
            💡 캔버스의 각 항목을 마우스로 클릭하고 끌어서 위치를 변경하세요. (0.25mm 격자 자동 스냅)
          </div>
        </div>

        {/* ── [3/3] 우측 패널: 실물 1:1 미리보기 & ZPL 뷰어 ────────────────── */}
        <div style={{
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '10px',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {/* 탭 토글 바 */}
          <div style={{
            display: 'flex',
            backgroundColor: '#0f172a',
            borderRadius: '6px',
            padding: '2px',
            border: '1px solid #334155'
          }}>
            <button
              onClick={() => setActiveRightTab('preview')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: activeRightTab === 'preview' ? '#334155' : 'transparent',
                color: activeRightTab === 'preview' ? '#38bdf8' : '#94a3b8'
              }}
            >
              <Eye size={13} /> 실물 인쇄 미리보기
            </button>
            <button
              onClick={() => setActiveRightTab('zpl')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: activeRightTab === 'zpl' ? '#334155' : 'transparent',
                color: activeRightTab === 'zpl' ? '#38bdf8' : '#94a3b8'
              }}
            >
              <Code size={13} /> ZPL II 코드
            </button>
          </div>

          {activeRightTab === 'preview' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                실제 라벨 인쇄 결과 시뮬레이션
              </div>

              {/* 미니 1:1 출력 렌더링 카드 */}
              <div style={{
                backgroundColor: '#ffffff',
                color: '#000000',
                borderRadius: '4px',
                padding: '10px 14px',
                boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
                fontSize: '11px',
                fontFamily: 'monospace'
              }}>
                {template.elements.map(el => {
                  if (!el.visible) return null;
                  if (el.type === 'line') {
                    return <div key={el.id} style={{ borderBottom: '1.5px solid #000', margin: '3px 0' }} />;
                  }
                  if (el.type === 'barcode') {
                    let bcVal = SAMPLE_ITEM.asset_no;
                    if (el.targetField === 'imei') bcVal = SAMPLE_ITEM.imei;
                    else if (el.targetField === 'serial_no') bcVal = SAMPLE_ITEM.serial_no;
                    const url = generateCode39DataUrl(bcVal, { height: 28 });
                    return (
                      <div key={el.id} style={{ textAlign: 'center', margin: '4px 0 0 0' }}>
                        {url && <img src={url} alt="bc" style={{ height: '26px', maxWidth: '90%' }} />}
                        {el.showText && <div style={{ fontSize: '9px', fontWeight: 700 }}>*{bcVal}*</div>}
                      </div>
                    );
                  }
                  let text = el.prefix || '';
                  if (el.field === 'asset_no') text += SAMPLE_ITEM.asset_no;
                  else if (el.field === 'imei') text += SAMPLE_ITEM.imei;
                  else if (el.field === 'serial_no') text += SAMPLE_ITEM.serial_no;
                  else if (el.field === 'mac_address') text += SAMPLE_ITEM.mac_address;
                  else if (el.field === 'scanned_at') text += SAMPLE_ITEM.scanned_at;
                  else if (el.field === 'custom') text += el.customValue || '';
                  return (
                    <div key={el.id} style={{ fontWeight: 700, fontSize: `${(el.fontSizePt || 20) * 0.55}px` }}>
                      {text}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                Zebra GK-420D 전송 ZPL II 명령문
              </div>
              <textarea
                readOnly
                value={currentZpl}
                rows={12}
                style={{
                  width: '100%',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#38bdf8',
                  fontFamily: 'Cascadia Code, Consolas, monospace',
                  fontSize: '0.75rem',
                  padding: '8px',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>
          )}

          {/* 하단 요약 정보 */}
          <div style={{
            backgroundColor: '#0f172a',
            padding: '10px',
            borderRadius: '6px',
            fontSize: '0.72rem',
            color: '#94a3b8',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <div><strong>DPI:</strong> 203 DPI (8 dots = 1mm)</div>
            <div><strong>도트 해상도:</strong> {template.paper.dotsWidth} × {template.paper.dotsHeight} dots</div>
            <div><strong>활성 객체:</strong> {template.elements.filter(e => e.visible).length}개 / 전체 {template.elements.length}개</div>
          </div>
        </div>
      </div>
    </div>
  );
}
