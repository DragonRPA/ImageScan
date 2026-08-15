import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sliders,
  RotateCcw,
  Save,
  Printer,
  Eye,
  Code,
  CheckSquare,
  Square,
  Plus,
  Database,
  X
} from 'lucide-react';
import {
  DEFAULT_LABEL_TEMPLATE,
  getStoredLabelTemplate,
  saveStoredLabelTemplate,
  fetchBackendLabelTemplate,
  saveBackendLabelTemplate,
  generateDynamicZpl,
  mmToDots,
  getAllPresets,
  createEmptyTemplate
} from '../utils/labelTemplate';
import { generateCode39DataUrl } from '../utils/barcode39';
import { insertPrintQueue } from '../utils/supabaseClient';

import {
  DEFAULT_SCHEMA_DEF,
  TEMP_ASSET_SCHEMA_DEF,
  SUPPORTED_TABLES,
  getTableSchema,
  fetchActiveSchema,
  getLocalSchemaDef
} from '../utils/dynamicSchema';

const DEFAULT_SAMPLE_ASSET = {
  asset_no: '224011319',
  category_major: 'IT',
  product_name: '아이패드 9세대',
  model_name: 'A2602',
  serial_no: 'QHJ66F6V0X',
  asset_status: '임대중',
  earning_ratio: '88.2',
  shelf_no: 'A-01-02',
  asset_option: '64GB Wi-Fi',
  calibration_date: '2026-08-15',
  mac_wlan: '4C:EB:B0:B5:7A:51',
  mac_lan: '00:1A:2B:3C:4D:5E',
  imei: '351379300225052',
  components: '본체, 케이스, 충전기',
  remark: '정상 작동 양품'
};

const DEFAULT_SAMPLE_TEMP = {
  asset_no: 'TEMP-20260815-01',
  category_major: 'IT',
  product_name: '갤럭시 탭 S9 Ultra',
  model_name: 'SM-X910',
  serial_no: 'R5KL60F0CZW',
  temp_status: '가입고',
  scanned_at: '2026-08-15 18:15',
  shelf_no: 'T-LOC-01',
  imei: '359876543210987',
  mac_address: '4C:EB:B0:B5:7A:51',
  components: '본체, S펜, 어댑터',
  remark: '신규 입고 검수 대기'
};

export default function LabelDesignerTab({ onError, onOpenPrintModal }) {
  const [template, setTemplate] = useState(getStoredLabelTemplate);
  const [selectedElemId, setSelectedElemId] = useState('elem_asset_no');
  const [activeRightTab, setActiveRightTab] = useState('preview');
  const [isSaved, setIsSaved] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [presets, setPresets] = useState(getAllPresets);

  // ⭐️ [디자인 추가] 모달 상태
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newDesignName, setNewDesignName] = useState('');
  const [newDesignTable, setNewDesignTable] = useState('asset');
  const [newDesignWidth, setNewDesignWidth] = useState(72);
  const [newDesignHeight, setNewDesignHeight] = useState(40);

  const [draggingId, setDraggingId] = useState(null);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [elemStartPos, setElemStartPos] = useState({ xMm: 0, yMm: 0 });

  const canvasRef = useRef(null);

  // 캔버스 화면 픽셀 배율 (1mm당 8.5px로 시원하게 확대)
  const PX_PER_MM = 8.5;
  const canvasWidthPx = (template.paper?.widthMm || 72) * PX_PER_MM;
  const canvasHeightPx = (template.paper?.heightMm || 40) * PX_PER_MM;

  // 현재 서식의 대상 테이블 및 스키마 (SSOT)
  const currentTargetTable = template.targetTable || 'asset';
  const currentTableSchema = useMemo(() => getTableSchema(currentTargetTable), [currentTargetTable]);
  const tableFields = useMemo(() => currentTableSchema.fields || [], [currentTableSchema]);

  const selectedElem = (template.elements || []).find(e => e.id === selectedElemId) || null;

  // 초기 로드: 백엔드 라벨 서식 로드
  useEffect(() => {
    fetchBackendLabelTemplate().then(tpl => {
      if (tpl) {
        setTemplate(tpl);
      }
    });
  }, []);

  // ★ 대상 테이블 스키마에 따라 template.elements의 표시명 및 신규 필드 자동 동기화
  useEffect(() => {
    if (!currentTableSchema || !currentTableSchema.fields || !template || !template.elements) return;

    const schemaFieldMap = new Map();
    currentTableSchema.fields.forEach(f => schemaFieldMap.set(f.id, f));

    let hasChanges = false;
    // 1. 기존 text 요소의 name을 최신 스키마 표시명으로 동기화
    const updatedElements = template.elements.map(elem => {
      if (elem.type === 'text' && elem.field && schemaFieldMap.has(elem.field)) {
        const schemaField = schemaFieldMap.get(elem.field);
        if (elem.name !== schemaField.name) {
          hasChanges = true;
          return { ...elem, name: schemaField.name };
        }
      }
      return elem;
    });

    // 2. 스키마에 정의된 모든 필드가 템플릿 elements에 존재하는지 확인 (없으면 추가)
    const existingFieldIds = new Set(
      template.elements.filter(e => e.type === 'text').map(e => e.field)
    );

    currentTableSchema.fields.forEach((f, idx) => {
      if (!existingFieldIds.has(f.id)) {
        hasChanges = true;
        updatedElements.push({
          id: `elem_${f.id}`,
          name: f.name,
          type: 'text',
          field: f.id,
          prefix: `${f.name}: `,
          xMm: 2.0,
          yMm: Math.min(35, 14.0 + (idx * 3.5)),
          fontSizePt: 16,
          fontFamily: 'A0N',
          visible: false
        });
      }
    });

    if (hasChanges) {
      setTemplate(prev => ({
        ...prev,
        elements: updatedElements
      }));
    }
  }, [currentTableSchema]);

  // 대상 테이블에 맞춘 동적 샘플 데이터 생성
  const SAMPLE_ITEM = useMemo(() => {
    const base = currentTargetTable === 'temp_asset' ? DEFAULT_SAMPLE_TEMP : DEFAULT_SAMPLE_ASSET;
    const item = { ...base };
    tableFields.forEach(f => {
      if (item[f.id] === undefined) {
        item[f.id] = f.id.toUpperCase();
      }
    });
    return item;
  }, [currentTargetTable, tableFields]);

  // 요소의 실시간 동적 표시명 조회
  const getElemDisplayName = (elem) => {
    if (!elem) return '';
    if (elem.type === 'text' && elem.field) {
      const matched = tableFields.find(f => f.id === elem.field);
      if (matched) return matched.name;
    }
    return elem.name;
  };

  // 바코드 대상 가능 필드 목록
  const barcodeFields = useMemo(() => {
    return tableFields.filter(f => f.isBarcodeTarget !== false);
  }, [tableFields]);

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

  const handleToggleVisible = (id) => {
    setTemplate(prev => ({
      ...prev,
      elements: prev.elements.map(elem => {
        if (elem.id === id) return { ...elem, visible: !elem.visible };
        return elem;
      })
    }));
    setIsSaved(false);
  };

  const handleElemPropChange = (field, value) => {
    if (!selectedElemId) return;
    setTemplate(prev => ({
      ...prev,
      elements: prev.elements.map(elem => {
        if (elem.id === selectedElemId) {
          return {
            ...elem,
            [field]: (field === 'xMm' || field === 'yMm' || field === 'fontSizePt' || field === 'heightMm' || field === 'widthMm' || field === 'thicknessMm' || field === 'qrScale')
              ? Number(value)
              : typeof value === 'boolean' ? value : value
          };
        }
        return elem;
      })
    }));
    setIsSaved(false);
  };

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

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!draggingId) return;

      const deltaX = e.clientX - dragStartPos.x;
      const deltaY = e.clientY - dragStartPos.y;

      const deltaXmm = deltaX / PX_PER_MM;
      const deltaYmm = deltaY / PX_PER_MM;

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
      if (draggingId) setDraggingId(null);
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

  const handleSave = async () => {
    await saveBackendLabelTemplate(template);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleReset = () => {
    if (window.confirm('서식을 기본값으로 초기화하시겠습니까?')) {
      setTemplate(DEFAULT_LABEL_TEMPLATE);
      saveBackendLabelTemplate(DEFAULT_LABEL_TEMPLATE);
      setSelectedElemId('elem_asset_no');
    }
  };

  const handleTestPrint = async () => {
    setIsPrinting(true);
    try {
      await insertPrintQueue({
        asset_no: SAMPLE_ITEM.asset_no,
        imei: SAMPLE_ITEM.imei,
        mac_address: SAMPLE_ITEM.mac_address,
        serial_no: SAMPLE_ITEM.serial_no
      }, template);
      alert('테스트 인쇄 요청이 등록되었습니다.');
    } catch (err) {
      if (onOpenPrintModal) {
        onOpenPrintModal([SAMPLE_ITEM]);
      } else {
        alert(`인쇄 오류: ${err.message}`);
      }
    } finally {
      setIsPrinting(false);
    }
  };

  const currentZpl = generateDynamicZpl(SAMPLE_ITEM, template);

  const handleSelectPreset = (presetId) => {
    const found = presets.find(p => p.templateId === presetId);
    if (found) {
      setTemplate(found);
      saveStoredLabelTemplate(found);
      setSelectedElemId(found.elements[0]?.id || 'elem_asset_no');
    }
  };

  // ⭐️ [디자인 추가] 모달 열기
  const handleOpenCreateModal = () => {
    setNewDesignName(`새 서식 ${presets.length + 1}`);
    setNewDesignTable('asset');
    setNewDesignWidth(72);
    setNewDesignHeight(40);
    setIsCreateModalOpen(true);
  };

  // ⭐️ [디자인 추가] 확인 및 템플릿 생성
  const handleCreateNewDesign = () => {
    if (!newDesignName.trim()) {
      alert('서식 명칭을 입력하세요.');
      return;
    }
    const newPreset = createEmptyTemplate(
      newDesignName.trim(),
      newDesignTable,
      Number(newDesignWidth) || 72,
      Number(newDesignHeight) || 40
    );
    saveStoredLabelTemplate(newPreset);
    const updated = getAllPresets();
    setPresets(updated);
    setTemplate(newPreset);
    setSelectedElemId(newPreset.elements[0]?.id || 'elem_asset_no');
    setIsCreateModalOpen(false);
  };

  // ⭐️ 대상 테이블 전환 (asset <-> temp_asset)
  const handleSwitchTargetTable = (tableId) => {
    if (template.targetTable === tableId) return;
    const nextSchema = getTableSchema(tableId);
    setTemplate(prev => ({
      ...prev,
      targetTable: tableId,
      schemaId: nextSchema.id
    }));
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      color: '#f8fafc',
      width: '100%'
    }}>
      {/* Top Action Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '8px',
        padding: '6px 12px',
        flexWrap: 'wrap',
        gap: '6px'
      }}>
        {/* Left: Title & Presets & Active Printer Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Sliders size={16} style={{ color: '#38bdf8' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>라벨 서식 디자인</span>

          {/* ★ 다중 서식 프리셋 선택 드롭다운 & [디자인 추가] 버튼 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <select
              value={template.templateId}
              onChange={e => handleSelectPreset(e.target.value)}
              style={{
                backgroundColor: '#0f172a',
                border: '1px solid #38bdf8',
                borderRadius: '4px',
                padding: '3px 8px',
                color: '#38bdf8',
                fontSize: '0.75rem',
                fontWeight: 600
              }}
            >
              {presets.map(p => (
                <option key={p.templateId} value={p.templateId}>
                  {p.name} ({p.targetTable === 'temp_asset' ? '임시자산' : '자산'} | {p.paper?.widthMm || 72}×{p.paper?.heightMm || 40}mm)
                </option>
              ))}
            </select>
            <button
              onClick={handleOpenCreateModal}
              className="btn btn-primary"
              style={{
                fontSize: '0.68rem',
                padding: '3px 9px',
                backgroundColor: '#0284c7',
                borderColor: '#38bdf8',
                color: '#ffffff',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '3px'
              }}
              title="새로운 라벨 서식 디자인 추가"
            >
              <Plus size={12} /> 디자인 추가
            </button>
          </div>

          {/* 대상 테이블 뱃지 */}
          <span style={{
            fontSize: '0.68rem',
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: currentTargetTable === 'temp_asset' ? '#3b0764' : '#1e3a8a',
            color: currentTargetTable === 'temp_asset' ? '#d8b4fe' : '#93c5fd',
            border: `1px solid ${currentTargetTable === 'temp_asset' ? '#a855f7' : '#3b82f6'}`,
            fontWeight: 600
          }}>
            {currentTargetTable === 'temp_asset' ? 'temp_asset (임시자산)' : 'asset (자산관리)'}
          </span>

          {/* 활성 라벨 프린터 정보 표시 & 프린터 지정 버튼 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginLeft: '6px',
            padding: '2px 8px',
            backgroundColor: '#0f172a',
            borderRadius: '6px',
            border: '1px solid #334155'
          }}>
            <Printer size={13} style={{ color: '#4ade80' }} />
            <span style={{ fontSize: '0.72rem', color: '#f8fafc', fontWeight: 600 }}>
              Zebra GK420d (USB)
            </span>
            <button
              onClick={() => window.open('http://127.0.0.1:9988', '_blank')}
              className="btn btn-outline"
              style={{
                fontSize: '0.68rem',
                padding: '2px 6px',
                borderColor: '#38bdf8',
                color: '#7dd3fc',
                marginLeft: '4px'
              }}
              title="에이전트 프린터 설정 열기"
            >
              프린터 지정
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={handleReset}
            className="btn btn-outline"
            style={{ fontSize: '0.72rem', padding: '4px 10px' }}
          >
            <RotateCcw size={12} /> 초기화
          </button>
          <button
            onClick={handleSave}
            className={`btn ${isSaved ? 'btn-success' : 'btn-primary'}`}
            style={{ fontSize: '0.72rem', padding: '4px 12px' }}
          >
            <Save size={12} /> {isSaved ? '저장됨' : '서식 저장'}
          </button>
          <button
            onClick={handleTestPrint}
            disabled={isPrinting}
            className="btn"
            style={{
              backgroundColor: '#10b981',
              color: '#fff',
              border: 'none',
              fontSize: '0.72rem',
              padding: '4px 12px'
            }}
          >
            <Printer size={12} /> {isPrinting ? '전송중' : '테스트 인쇄'}
          </button>
        </div>
      </div>

      {/* 3-Column Workspace (Optimized Proportions: 290px | 1fr | 340px) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '290px minmax(500px, 1fr) 340px',
        gap: '8px',
        alignItems: 'stretch',
        width: '100%',
        minHeight: '560px'
      }}>
        {/* ── [1/3] Left Panel (290px) ────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', minWidth: 0 }}>
          {/* 용지 규격 */}
          <div style={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '10px',
            boxSizing: 'border-box',
            width: '100%'
          }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
              용지 규격
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', width: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                <label style={{ fontSize: '0.68rem', color: '#cbd5e1', whiteSpace: 'nowrap' }}>폭 (mm)</label>
                <input
                  type="number"
                  value={template.paper.widthMm}
                  onChange={e => handlePaperChange('widthMm', e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    backgroundColor: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '4px',
                    padding: '4px 6px',
                    color: '#f8fafc',
                    fontSize: '0.75rem'
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                <label style={{ fontSize: '0.68rem', color: '#cbd5e1', whiteSpace: 'nowrap' }}>높이 (mm)</label>
                <input
                  type="number"
                  value={template.paper.heightMm}
                  onChange={e => handlePaperChange('heightMm', e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    backgroundColor: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '4px',
                    padding: '4px 6px',
                    color: '#f8fafc',
                    fontSize: '0.75rem'
                  }}
                />
              </div>
            </div>
          </div>

          {/* 출력 항목 선택 */}
          <div style={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8' }}>
                출력 항목 선택
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.65rem', color: '#64748b' }}>대상 테이블:</span>
                <select
                  value={currentTargetTable}
                  onChange={(e) => handleSwitchTargetTable(e.target.value)}
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    color: '#38bdf8',
                    fontSize: '0.68rem',
                    fontWeight: 600
                  }}
                >
                  <option value="asset">asset (자산 관리)</option>
                  <option value="temp_asset">temp_asset (임시 자산)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '280px', overflowY: 'auto' }} className="grid-scrollbar">
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
                      padding: '5px 8px',
                      borderRadius: '4px',
                      backgroundColor: isSelected ? '#334155' : '#0f172a',
                      border: `1px solid ${isSelected ? '#38bdf8' : '#1e293b'}`,
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleVisible(elem.id);
                        }}
                        style={{ color: elem.visible ? '#38bdf8' : '#64748b', cursor: 'pointer', display: 'flex' }}
                      >
                        {elem.visible ? <CheckSquare size={14} /> : <Square size={14} />}
                      </span>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: elem.visible ? '#f8fafc' : '#64748b'
                      }}>
                        {getElemDisplayName(elem)}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                      {elem.xMm},{elem.yMm}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 속성 편집기 */}
          {selectedElem && (
            <div style={{
              backgroundColor: '#1e293b',
              border: '1px solid #38bdf8',
              borderRadius: '8px',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8' }}>
                  {getElemDisplayName(selectedElem)}
                </span>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                  {selectedElem.type}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', width: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                  <label style={{ fontSize: '0.68rem', color: '#cbd5e1', whiteSpace: 'nowrap' }}>X (mm)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={selectedElem.xMm}
                    onChange={e => handleElemPropChange('xMm', e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      backgroundColor: '#0f172a',
                      border: '1px solid #475569',
                      borderRadius: '4px',
                      padding: '3px 6px',
                      color: '#f8fafc',
                      fontSize: '0.72rem'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                  <label style={{ fontSize: '0.68rem', color: '#cbd5e1', whiteSpace: 'nowrap' }}>Y (mm)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={selectedElem.yMm}
                    onChange={e => handleElemPropChange('yMm', e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      backgroundColor: '#0f172a',
                      border: '1px solid #475569',
                      borderRadius: '4px',
                      padding: '3px 6px',
                      color: '#f8fafc',
                      fontSize: '0.72rem'
                    }}
                  />
                </div>
              </div>

              {selectedElem.type === 'text' && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>바인딩 필드</label>
                    <select
                      value={selectedElem.field || 'asset_no'}
                      onChange={e => handleElemPropChange('field', e.target.value)}
                      style={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #475569',
                        borderRadius: '4px',
                        padding: '3px 6px',
                        color: '#f8fafc',
                        fontSize: '0.72rem'
                      }}
                    >
                      {tableFields.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f.id})
                        </option>
                      ))}
                      <option value="custom">고정 텍스트 (직접 입력)</option>
                    </select>
                  </div>

                  {selectedElem.field === 'custom' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <label style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>고정 문구</label>
                      <input
                        type="text"
                        value={selectedElem.customValue || ''}
                        onChange={e => handleElemPropChange('customValue', e.target.value)}
                        style={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #475569',
                          borderRadius: '4px',
                          padding: '3px 6px',
                          color: '#f8fafc',
                          fontSize: '0.72rem'
                        }}
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>접두어</label>
                    <input
                      type="text"
                      value={selectedElem.prefix || ''}
                      onChange={e => handleElemPropChange('prefix', e.target.value)}
                      style={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #475569',
                        borderRadius: '4px',
                        padding: '3px 6px',
                        color: '#f8fafc',
                        fontSize: '0.72rem'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <label style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>폰트 크기</label>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#facc15' }}>{selectedElem.fontSizePt} Pt</span>
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

              {selectedElem.type === 'barcode' && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>바코드 종류</label>
                    <select
                      value={selectedElem.barcodeType || 'CODE39'}
                      onChange={e => handleElemPropChange('barcodeType', e.target.value)}
                      style={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #475569',
                        borderRadius: '4px',
                        padding: '3px 6px',
                        color: '#f8fafc',
                        fontSize: '0.72rem'
                      }}
                    >
                      <option value="CODE39">Code 39</option>
                      <option value="CODE128">Code 128</option>
                      <option value="QR">QR Code</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>대상 필드</label>
                    <select
                      value={selectedElem.targetField || schemaDef.key_field || 'asset_no'}
                      onChange={e => handleElemPropChange('targetField', e.target.value)}
                      style={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #475569',
                        borderRadius: '4px',
                        padding: '3px 6px',
                        color: '#38bdf8',
                        fontWeight: 600,
                        fontSize: '0.72rem'
                      }}
                    >
                      {barcodeFields.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedElem.barcodeType !== 'QR' ? (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <label style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>바코드 높이</label>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#10b981' }}>{selectedElem.heightMm} mm</span>
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

                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', marginTop: '2px' }}>
                        <input
                          type="checkbox"
                          checked={Boolean(selectedElem.showText)}
                          onChange={e => handleElemPropChange('showText', e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>하단 텍스트 표시</span>
                      </label>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <label style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>QR 크기 배율</label>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#10b981' }}>{selectedElem.qrScale || 4}</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="8"
                        step="1"
                        value={selectedElem.qrScale || 4}
                        onChange={e => handleElemPropChange('qrScale', e.target.value)}
                        style={{ width: '100%', cursor: 'pointer' }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── [2/3] Center Canvas (Expansive Area) ─────────────────── */}
        <div style={{
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '10px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f8fafc' }}>
              라벨 캔버스
            </span>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
              {template.paper.widthMm}mm × {template.paper.heightMm}mm
            </span>
          </div>

          <div style={{
            width: '100%',
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#0f172a',
            padding: '20px',
            borderRadius: '6px',
            border: '1px solid #334155',
            overflow: 'auto',
            boxSizing: 'border-box'
          }}>
            <div
              ref={canvasRef}
              style={{
                width: `${canvasWidthPx}px`,
                height: `${canvasHeightPx}px`,
                backgroundColor: '#ffffff',
                color: '#000000',
                borderRadius: '3px',
                position: 'relative',
                boxShadow: '0 6px 20px rgba(0,0,0,0.6)',
                border: '1px solid #cbd5e1',
                userSelect: 'none',
                overflow: 'hidden'
              }}
            >
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'linear-gradient(to right, #f1f5f9 1px, transparent 1px), linear-gradient(to bottom, #f1f5f9 1px, transparent 1px)',
                backgroundSize: `${5 * PX_PER_MM}px ${5 * PX_PER_MM}px`,
                pointerEvents: 'none'
              }} />

              {template.elements.map(elem => {
                if (!elem.visible) return null;

                const isSelected = elem.id === selectedElemId;
                const leftPx = elem.xMm * PX_PER_MM;
                const topPx = elem.yMm * PX_PER_MM;

                let displayText = `${elem.prefix || ''}`;
                if (elem.field === 'custom') {
                  displayText += (elem.customValue || '');
                } else {
                  displayText += (SAMPLE_ITEM[elem.field] || elem.field?.toUpperCase() || '');
                }

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
                        zIndex: isSelected ? 10 : 2
                      }}
                    />
                  );
                }

                if (elem.type === 'barcode') {
                  const barcodeHeightPx = (elem.heightMm || 10) * PX_PER_MM;
                  const bcVal = String(SAMPLE_ITEM[elem.targetField] || SAMPLE_ITEM[schemaDef.key_field] || 'TEST0001');

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
                        padding: '1px 2px',
                        border: isSelected ? '1.5px dashed #0284c7' : '1px solid transparent',
                        backgroundColor: isSelected ? 'rgba(2,132,199,0.08)' : 'transparent',
                        borderRadius: '2px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        zIndex: isSelected ? 10 : 3
                      }}
                    >
                      {elem.barcodeType === 'QR' ? (
                        <div style={{
                          width: `${(elem.qrScale || 4) * 12}px`,
                          height: `${(elem.qrScale || 4) * 12}px`,
                          border: '2px solid #000',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: 700
                        }}>
                          QR
                        </div>
                      ) : barcodeDataUrl ? (
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
                        <div style={{ fontSize: '9px', color: '#666', border: '1px solid #ccc', padding: '2px' }}>
                          [{elem.barcodeType || 'Code39'}: {bcVal}]
                        </div>
                      )}
                      {elem.showText && elem.barcodeType !== 'QR' && (
                        <span style={{ fontSize: '9px', fontWeight: 700, fontFamily: 'monospace', marginTop: '1px' }}>
                          *{bcVal}*
                        </span>
                      )}
                    </div>
                  );
                }

                const fontSizePx = (elem.fontSizePt || 20) * 0.6;
                return (
                  <div
                    key={elem.id}
                    onMouseDown={e => handleMouseDown(e, elem.id)}
                    style={{
                      position: 'absolute',
                      left: `${leftPx}px`,
                      top: `${topPx}px`,
                      cursor: 'move',
                      padding: '1px 3px',
                      fontSize: `${fontSizePx}px`,
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      whiteSpace: 'nowrap',
                      border: isSelected ? '1.5px dashed #0284c7' : '1px solid transparent',
                      backgroundColor: isSelected ? 'rgba(2,132,199,0.08)' : 'transparent',
                      borderRadius: '2px',
                      zIndex: isSelected ? 10 : 4
                    }}
                  >
                    {displayText}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── [3/3] Right Panel (340px, Full-Height) ────────────────── */}
        <div style={{
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <div style={{
            display: 'flex',
            backgroundColor: '#0f172a',
            borderRadius: '4px',
            padding: '2px',
            border: '1px solid #334155'
          }}>
            <button
              onClick={() => setActiveRightTab('preview')}
              style={{
                flex: 1,
                padding: '5px',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                backgroundColor: activeRightTab === 'preview' ? '#334155' : 'transparent',
                color: activeRightTab === 'preview' ? '#38bdf8' : '#94a3b8'
              }}
            >
              미리보기
            </button>
            <button
              onClick={() => setActiveRightTab('zpl')}
              style={{
                flex: 1,
                padding: '5px',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                backgroundColor: activeRightTab === 'zpl' ? '#334155' : 'transparent',
                color: activeRightTab === 'zpl' ? '#38bdf8' : '#94a3b8'
              }}
            >
              ZPL 코드
            </button>
          </div>

          {activeRightTab === 'preview' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <div style={{
                backgroundColor: '#ffffff',
                color: '#000000',
                borderRadius: '4px',
                padding: '12px 16px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
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
                    const bcVal = String(SAMPLE_ITEM[el.targetField] || SAMPLE_ITEM[schemaDef.key_field] || 'TEST0001');
                    const url = generateCode39DataUrl(bcVal, { height: 28 });
                    return (
                      <div key={el.id} style={{ textAlign: 'center', margin: '4px 0 0 0' }}>
                        {el.barcodeType === 'QR' ? (
                          <div style={{ width: '40px', height: '40px', border: '2px solid #000', margin: '0 auto', fontSize: '9px', lineHeight: '38px', fontWeight: 700 }}>QR</div>
                        ) : url && (
                          <img src={url} alt="bc" style={{ height: '26px', maxWidth: '90%' }} />
                        )}
                        {el.showText && el.barcodeType !== 'QR' && <div style={{ fontSize: '9px', fontWeight: 700 }}>*{bcVal}*</div>}
                      </div>
                    );
                  }
                  let text = el.prefix || '';
                  if (el.field === 'custom') {
                    text += (el.customValue || '');
                  } else {
                    text += (SAMPLE_ITEM[el.field] || el.field?.toUpperCase() || '');
                  }
                  return (
                    <div key={el.id} style={{ fontWeight: 700, fontSize: `${(el.fontSizePt || 20) * 0.6}px` }}>
                      {text}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <textarea
              readOnly
              value={currentZpl}
              style={{
                width: '100%',
                flex: 1,
                minHeight: '440px',
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '4px',
                color: '#38bdf8',
                fontFamily: 'Consolas, monospace',
                fontSize: '0.72rem',
                padding: '8px',
                boxSizing: 'border-box',
                resize: 'none'
              }}
            />
          )}
        </div>
      </div>

      {/* ⭐️ [디자인 추가] 모달 다이얼로그 (전사 표준 레이블-입력 상하 스택 구조 준수) */}
      {isCreateModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 99999
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            border: '1px solid #38bdf8',
            borderRadius: '8px',
            width: '420px',
            maxWidth: '90vw',
            padding: '16px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={16} style={{ color: '#38bdf8' }} />
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc' }}>
                  라벨 서식 디자인 추가
                </span>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* 1. 서식 명칭 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 600 }}>
                  서식 명칭
                </label>
                <input
                  type="text"
                  value={newDesignName}
                  onChange={(e) => setNewDesignName(e.target.value)}
                  placeholder="예: 입고 검수용 라벨"
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '4px',
                    padding: '6px 8px',
                    color: '#f8fafc',
                    fontSize: '0.78rem'
                  }}
                  autoFocus
                />
              </div>

              {/* 2. 대상 테이블 선택 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 600 }}>
                  대상 테이블 선택
                </label>
                <select
                  value={newDesignTable}
                  onChange={(e) => setNewDesignTable(e.target.value)}
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #38bdf8',
                    borderRadius: '4px',
                    padding: '6px 8px',
                    color: '#38bdf8',
                    fontSize: '0.78rem',
                    fontWeight: 600
                  }}
                >
                  <option value="asset">asset (자산 관리 - 15대 정규 헤더)</option>
                  <option value="temp_asset">temp_asset (임시 자산 - 입고 검수 헤더)</option>
                </select>
              </div>

              {/* 3. 용지 규격 (폭 x 높이) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 600 }}>
                    용지 폭 (mm)
                  </label>
                  <input
                    type="number"
                    value={newDesignWidth}
                    onChange={(e) => setNewDesignWidth(e.target.value)}
                    style={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #475569',
                      borderRadius: '4px',
                      padding: '6px 8px',
                      color: '#f8fafc',
                      fontSize: '0.78rem'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 600 }}>
                    용지 높이 (mm)
                  </label>
                  <input
                    type="number"
                    value={newDesignHeight}
                    onChange={(e) => setNewDesignHeight(e.target.value)}
                    style={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #475569',
                      borderRadius: '4px',
                      padding: '6px 8px',
                      color: '#f8fafc',
                      fontSize: '0.78rem'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '6px', borderTop: '1px solid #334155', paddingTop: '10px' }}>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="btn btn-outline"
                style={{ fontSize: '0.72rem', padding: '5px 12px' }}
              >
                취소
              </button>
              <button
                onClick={handleCreateNewDesign}
                className="btn btn-primary"
                style={{
                  fontSize: '0.72rem',
                  padding: '5px 14px',
                  backgroundColor: '#0284c7',
                  borderColor: '#38bdf8',
                  color: '#ffffff',
                  fontWeight: 700
                }}
              >
                디자인 생성
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
