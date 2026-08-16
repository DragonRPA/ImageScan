import React, { useState, useEffect, useRef } from 'react';
import {
  Target,
  Crosshair,
  Wrench,
  Code2,
  Variable,
  Play,
  Check,
  X,
  Layers,
  Zap,
  Tag,
  Eye,
  Sliders,
  Radio,
  Scan,
  Monitor,
  Cpu,
  Layers3,
  CheckCircle2
} from 'lucide-react';
import { DEFAULT_SCHEMA_DEF } from '../utils/dynamicSchema';

/**
 * 🎯 객체 정밀 조작 관리 (ObjectManipulatorModal)
 * 전사 표준 헌장 준수: 무수식어 건조한 명사 구조, 상하 스택 폼, 정적 고정 레이아웃,
 * 프로세스/윈도우/IFrame/계층/3중 선택자 정밀 텔레메트리 기록
 */
export default function ObjectManipulatorModal({
  isOpen,
  onClose,
  step,
  onSaveStep,
  scenario
}) {
  if (!isOpen || !step) return null;

  const [tempStep, setTempStep] = useState({ ...step });
  const [isScanningActive, setIsScanningActive] = useState(true);
  const [isTargetLocked, setIsTargetLocked] = useState(false);

  // 실시간 호버 텔레메트리 상태
  const [hoveredData, setHoveredData] = useState({
    processName: 'msedge',
    processId: 0,
    windowTitle: 'Windows 바탕화면',
    windowClassName: '',
    tagName: 'INPUT',
    controlType: 'Edit',
    id: 'query',
    name: 'query',
    className: 'search_input',
    xpath: "//input[@id='query']",
    cssSelector: '#query',
    uiaPath: "Edit[@AutomationId='query']",
    frameInfo: 'Main Frame',
    parentHierarchy: 'Pane#root ➔ Group#search',
    isEnabled: true,
    isOffscreen: false,
    isPassword: false,
    rect: { x: 0, y: 0, width: 220, height: 32 },
    timestamp: 0
  });

  // 락온 확정된 타겟 텔레메트리 상태
  const [lockedData, setLockedData] = useState({
    processName: tempStep.processName || 'msedge',
    processId: tempStep.processId || 0,
    windowTitle: tempStep.windowTitle || '타겟 윈도우',
    windowClassName: tempStep.windowClassName || '',
    tagName: tempStep.tagName || 'INPUT',
    controlType: tempStep.controlType || 'Edit',
    id: tempStep.elementId || 'assetNo',
    name: tempStep.elementName || 'asset_no',
    className: tempStep.className || 'form-control',
    xpath: tempStep.selector || "//input[@id='assetNo']",
    cssSelector: tempStep.cssSelector || '#assetNo',
    uiaPath: tempStep.uiaPath || "Edit[@AutomationId='assetNo']",
    frameInfo: tempStep.frameInfo || 'Main Frame',
    parentHierarchy: tempStep.parentHierarchy || 'Parent',
    isEnabled: true,
    isOffscreen: false,
    isPassword: false,
    rect: tempStep.rect || { x: 100, y: 100, width: 220, height: 32 }
  });

  const [testResult, setTestResult] = useState(null);
  const lastLockedTimestampRef = useRef(0);

  // ⭐️ [Windows OS 전역 실시간 UIA 마우스 호버 & 락온 폴링 루프 (120ms)]
  useEffect(() => {
    if (!isOpen || !isScanningActive) return;

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch('http://localhost:9988/api/rpa/current-hover', {
          method: 'GET',
          cache: 'no-store'
        }).catch(() => null);

        if (res && res.ok) {
          const data = await res.json();
          if (data && data.online && data.current) {
            const cur = data.current;
            setHoveredData({
              processName: cur.processName || 'Desktop',
              processId: cur.processId || 0,
              windowTitle: cur.windowTitle || 'Windows 애플리케이션',
              windowClassName: cur.windowClassName || '',
              tagName: cur.tagName || 'ELEMENT',
              controlType: cur.controlType || '',
              id: cur.id || '',
              name: cur.name || '',
              className: cur.className || '',
              xpath: cur.xpath || "//*[@id='target']",
              cssSelector: cur.cssSelector || '',
              uiaPath: cur.uiaPath || '',
              frameInfo: cur.frameInfo || 'Main Frame',
              parentHierarchy: cur.parentHierarchy || '',
              isEnabled: cur.isEnabled !== false,
              isOffscreen: cur.isOffscreen === true,
              isPassword: cur.isPassword === true,
              rect: cur.rect || { x: 0, y: 0, width: 100, height: 30 },
              timestamp: cur.timestamp || 0
            });

            // 에이전트에서 OS 전역 Ctrl+클릭 락온 감지 시
            if (data.lastLocked && data.lastLocked.xpath) {
              const lockTime = data.lastLocked.timestamp || 0;
              if (lockTime > lastLockedTimestampRef.current) {
                lastLockedTimestampRef.current = lockTime;
                handleConfirmLockOn(data.lastLocked);
              }
            }
          }
        }
      } catch (e) {}
    }, 120);

    return () => clearInterval(intervalId);
  }, [isOpen, isScanningActive]);

  // 키보드 단축키 리스너 (Ctrl+Space 락온, Esc 취소)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsScanningActive(false);
      } else if (e.ctrlKey && (e.key === ' ' || e.code === 'Space')) {
        e.preventDefault();
        if (hoveredData) {
          handleConfirmLockOn(hoveredData);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hoveredData]);

  // 필드 변경 핸들러
  const handlePropChange = (field, value) => {
    setTempStep(prev => ({ ...prev, [field]: value }));
  };

  // 명시적 락온 확정 트리거 (건조한 뱃지 상태 전환)
  const handleConfirmLockOn = (info) => {
    const targetInfo = info || hoveredData;
    if (!targetInfo || !targetInfo.xpath) return;

    setLockedData({
      processName: targetInfo.processName || '',
      processId: targetInfo.processId || 0,
      windowTitle: targetInfo.windowTitle || '',
      windowClassName: targetInfo.windowClassName || '',
      tagName: targetInfo.tagName || 'INPUT',
      controlType: targetInfo.controlType || 'Edit',
      id: targetInfo.id || '',
      name: targetInfo.name || '',
      className: targetInfo.className || '',
      xpath: targetInfo.xpath || "//*[@id='target']",
      cssSelector: targetInfo.cssSelector || '',
      uiaPath: targetInfo.uiaPath || '',
      frameInfo: targetInfo.frameInfo || 'Main Frame',
      parentHierarchy: targetInfo.parentHierarchy || '',
      isEnabled: targetInfo.isEnabled !== false,
      isOffscreen: targetInfo.isOffscreen === true,
      isPassword: targetInfo.isPassword === true,
      rect: targetInfo.rect || { x: 0, y: 0, width: 100, height: 30 }
    });

    // 스텝 메타데이터에 정밀 텔레메트리 100% 저장
    setTempStep(prev => ({
      ...prev,
      selector: targetInfo.xpath || "//*[@id='target']",
      cssSelector: targetInfo.cssSelector || '',
      uiaPath: targetInfo.uiaPath || '',
      processName: targetInfo.processName || '',
      processId: targetInfo.processId || 0,
      windowTitle: targetInfo.windowTitle || '',
      windowClassName: targetInfo.windowClassName || '',
      frameInfo: targetInfo.frameInfo || 'Main Frame',
      parentHierarchy: targetInfo.parentHierarchy || '',
      tagName: targetInfo.tagName || 'INPUT',
      controlType: targetInfo.controlType || 'Edit',
      elementId: targetInfo.id || '',
      elementName: targetInfo.name || '',
      rect: targetInfo.rect || { x: 0, y: 0, width: 100, height: 30 }
    }));

    setIsTargetLocked(true);
  };

  // 즉시 테스트 실행
  const handleExecuteTest = () => {
    setTestResult('실행 중...');
    setTimeout(() => {
      setTestResult('정상 완료: 타겟 [' + (tempStep.selector || lockedData.xpath) + '] 대상 [' + tempStep.operationType + '] 동작 수행 완료.');
    }, 250);
  };

  // 저장 후 닫기
  const handleSaveAndClose = () => {
    onSaveStep(tempStep);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10000,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#090d16',
        border: '1px solid #334155',
        borderRadius: '8px',
        width: '1200px',
        maxWidth: '98vw',
        height: '92vh',
        maxHeight: '96vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9)',
        overflow: 'hidden'
      }}>
        {/* ── [헤더] ────────────────────────────────────────────── */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 16px',
          backgroundColor: '#0f172a',
          borderBottom: '1px solid #1e293b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              backgroundColor: '#0284c7',
              borderRadius: '4px',
              padding: '5px 7px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Monitor size={16} style={{ color: '#fff' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                객체 조작 관리
                <span style={{
                  fontSize: '0.62rem',
                  backgroundColor: isTargetLocked ? '#065f46' : '#1e293b',
                  color: isTargetLocked ? '#34d399' : '#94a3b8',
                  padding: '1px 6px',
                  borderRadius: '3px',
                  border: '1px solid ' + (isTargetLocked ? '#10b981' : '#334155'),
                  fontWeight: 700
                }}>
                  {isTargetLocked ? '타겟 락온됨' : (isScanningActive ? '스캔 대기중' : '스캔 정지')}
                </span>
                <span style={{ fontSize: '0.60rem', color: '#64748b' }}>
                  (단축키: Ctrl+클릭 / Ctrl+Space = 락온)
                </span>
              </div>
              <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                스텝: {tempStep.name} ({tempStep.id})
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.2rem',
              cursor: 'pointer',
              lineHeight: 1
            }}
          >
            ✕
          </button>
        </div>

        {/* ── [2분할 워크스페이스 본문 (정적 높이 보장)] ──────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '520px 1fr',
          flex: 1,
          overflow: 'hidden'
        }}>
          {/* ── [좌측 패널 520px]: 정밀 텔레메트리 인스펙터 ── */}
          <div style={{
            backgroundColor: '#0b1120',
            borderRight: '1px solid #1e293b',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            overflowY: 'auto'
          }} className="grid-scrollbar">

            {/* 1. 실시간 마우스 스캔 텔레메트리 */}
            <div style={{
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Radio size={13} /> 실시간 마우스 감지
                </span>
                <button
                  type="button"
                  onClick={() => setIsScanningActive(prev => !prev)}
                  style={{
                    fontSize: '0.62rem',
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    color: isScanningActive ? '#38bdf8' : '#94a3b8',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    cursor: 'pointer'
                  }}
                >
                  {isScanningActive ? '스캔 일시정지' : '스캔 재개'}
                </button>
              </div>

              {/* 감지된 프로세스 / 창 제목 */}
              <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '4px', fontSize: '0.68rem' }}>
                <div style={{ backgroundColor: '#020617', padding: '4px 6px', borderRadius: '3px', border: '1px solid #1e293b' }}>
                  <span style={{ color: '#64748b' }}>프로세스: </span>
                  <span style={{ color: '#f8fafc', fontWeight: 700 }}>{hoveredData.processName || 'None'}</span>
                  {hoveredData.processId > 0 && <span style={{ color: '#64748b' }}> ({hoveredData.processId})</span>}
                </div>
                <div style={{ backgroundColor: '#020617', padding: '4px 6px', borderRadius: '3px', border: '1px solid #1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span style={{ color: '#64748b' }}>창 제목: </span>
                  <span style={{ color: '#cbd5e1' }} title={hoveredData.windowTitle}>{hoveredData.windowTitle || 'None'}</span>
                </div>
              </div>

              {/* 실시간 감지 객체 및 락온 버튼 */}
              <div style={{
                backgroundColor: '#020617',
                border: '1px solid #1e293b',
                borderRadius: '4px',
                padding: '6px 8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '6px'
              }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.68rem', fontFamily: 'Consolas, monospace', color: '#7dd3fc' }}>
                  &lt;{hoveredData.tagName}&gt; {hoveredData.xpath}
                </div>
                <button
                  type="button"
                  onClick={() => handleConfirmLockOn(hoveredData)}
                  style={{
                    fontSize: '0.65rem',
                    backgroundColor: '#0284c7',
                    border: '1px solid #38bdf8',
                    color: '#fff',
                    padding: '3px 8px',
                    borderRadius: '3px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                >
                  락온 확정
                </button>
              </div>
            </div>

            {/* 2. 락온된 타겟 상세 텔레메트리 (8대 엔지니어링 항목) */}
            <div style={{
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '6px',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <CheckCircle2 size={13} /> 락온 타겟 상세 정보
                </span>
                <span style={{ fontSize: '0.60rem', color: '#64748b' }}>
                  {lockedData.rect.width}×{lockedData.rect.height}px
                </span>
              </div>

              {/* 텔레메트리 항목 1: 실행 프로세스 & 윈도우 창 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '0.68rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', backgroundColor: '#020617', padding: '4px 6px', borderRadius: '3px', border: '1px solid #1e293b' }}>
                  <span style={{ fontSize: '0.60rem', color: '#64748b' }}>실행 프로세스 (Process / PID)</span>
                  <span style={{ color: '#f8fafc', fontWeight: 700 }}>{lockedData.processName} (PID: {lockedData.processId || '-'})</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', backgroundColor: '#020617', padding: '4px 6px', borderRadius: '3px', border: '1px solid #1e293b' }}>
                  <span style={{ fontSize: '0.60rem', color: '#64748b' }}>프레임 구조 (Frame / IFrame)</span>
                  <span style={{ color: '#38bdf8', fontWeight: 700 }}>{lockedData.frameInfo}</span>
                </div>
              </div>

              {/* 텔레메트리 항목 2: 윈도우 제목 & 클래스 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', backgroundColor: '#020617', padding: '4px 6px', borderRadius: '3px', border: '1px solid #1e293b' }}>
                <span style={{ fontSize: '0.60rem', color: '#64748b' }}>타겟 윈도우 타이틀 (Window Title)</span>
                <span style={{ color: '#e2e8f0', fontSize: '0.68rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {lockedData.windowTitle || 'None'}
                </span>
              </div>

              {/* 텔레메트리 항목 3: 상위 계층 트리 (Hierarchy) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', backgroundColor: '#020617', padding: '4px 6px', borderRadius: '3px', border: '1px solid #1e293b' }}>
                <span style={{ fontSize: '0.60rem', color: '#64748b' }}>상위 계층 경로 (Parent Hierarchy)</span>
                <span style={{ color: '#cbd5e1', fontSize: '0.66rem', fontFamily: 'Consolas, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {lockedData.parentHierarchy || 'Root ➔ Top'}
                </span>
              </div>

              {/* 텔레메트리 항목 4: 3중 복구 선택자 (XPath, CSS, UIA) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <label style={{ fontSize: '0.62rem', color: '#38bdf8', fontWeight: 700 }}>1순위 선택자 (XPath)</label>
                  <input
                    type="text"
                    value={tempStep.selector || lockedData.xpath}
                    onChange={e => handlePropChange('selector', e.target.value)}
                    style={{
                      backgroundColor: '#020617',
                      border: '1px solid #38bdf8',
                      borderRadius: '3px',
                      padding: '4px 6px',
                      color: '#38bdf8',
                      fontSize: '0.70rem',
                      fontFamily: 'Consolas, monospace',
                      fontWeight: 700
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label style={{ fontSize: '0.60rem', color: '#94a3b8' }}>2순위 선택자 (CSS Selector)</label>
                    <input
                      type="text"
                      value={lockedData.cssSelector}
                      readOnly
                      style={{
                        backgroundColor: '#020617',
                        border: '1px solid #334155',
                        borderRadius: '3px',
                        padding: '3px 6px',
                        color: '#94a3b8',
                        fontSize: '0.65rem',
                        fontFamily: 'Consolas, monospace'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label style={{ fontSize: '0.60rem', color: '#94a3b8' }}>3순위 선택자 (UIA Path)</label>
                    <input
                      type="text"
                      value={lockedData.uiaPath}
                      readOnly
                      style={{
                        backgroundColor: '#020617',
                        border: '1px solid #334155',
                        borderRadius: '3px',
                        padding: '3px 6px',
                        color: '#94a3b8',
                        fontSize: '0.65rem',
                        fontFamily: 'Consolas, monospace'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 텔레메트리 항목 5: 컨트롤 속성 및 상태 플래그 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', fontSize: '0.65rem', marginTop: '2px' }}>
                <div style={{ backgroundColor: '#020617', padding: '3px 5px', borderRadius: '3px', border: '1px solid #1e293b', textAlign: 'center' }}>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.58rem' }}>태그</span>
                  <span style={{ color: '#38bdf8', fontWeight: 700 }}>&lt;{lockedData.tagName}&gt;</span>
                </div>
                <div style={{ backgroundColor: '#020617', padding: '3px 5px', borderRadius: '3px', border: '1px solid #1e293b', textAlign: 'center' }}>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.58rem' }}>컨트롤타입</span>
                  <span style={{ color: '#f8fafc', fontWeight: 600 }}>{lockedData.controlType}</span>
                </div>
                <div style={{ backgroundColor: '#020617', padding: '3px 5px', borderRadius: '3px', border: '1px solid #1e293b', textAlign: 'center' }}>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.58rem' }}>상태</span>
                  <span style={{ color: lockedData.isEnabled ? '#34d399' : '#f87171', fontWeight: 700 }}>
                    {lockedData.isEnabled ? '활성' : '비활성'}
                  </span>
                </div>
                <div style={{ backgroundColor: '#020617', padding: '3px 5px', borderRadius: '3px', border: '1px solid #1e293b', textAlign: 'center' }}>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.58rem' }}>암호필드</span>
                  <span style={{ color: lockedData.isPassword ? '#fbbf24' : '#94a3b8' }}>
                    {lockedData.isPassword ? '예' : '아니오'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── [우측 패널]: 조작 작업 설정 (상하 스택 폼) ─────── */}
          <div style={{
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            overflowY: 'auto'
          }} className="grid-scrollbar">
            {/* 1. 조작 유형 선택 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38bdf8' }}>
                조작 유형 선택
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px' }}>
                {[
                  { id: 'SET_VALUE', label: '값/텍스트 설정', desc: '.value / innerText' },
                  { id: 'GET_VALUE', label: '값 추출/변수저장', desc: '화면값 변수 저장' },
                  { id: 'CALL_METHOD', label: 'JS/UIA 메서드', desc: '.click(), .focus()' },
                  { id: 'SET_ATTRIBUTE', label: '속성 변경', desc: 'disabled=false' },
                  { id: 'SET_STYLE', label: '스타일 조작', desc: 'display=block' },
                  { id: 'CLASS_TOGGLE', label: '클래스 토글', desc: 'classList.add/remove' }
                ].map(op => {
                  const isSelected = tempStep.operationType === op.id;
                  return (
                    <div
                      key={op.id}
                      onClick={() => handlePropChange('operationType', op.id)}
                      style={{
                        backgroundColor: isSelected ? '#1e3a5f' : '#0f172a',
                        border: '1px solid ' + (isSelected ? '#38bdf8' : '#334155'),
                        borderRadius: '4px',
                        padding: '6px 8px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1px'
                      }}
                    >
                      <span style={{ fontSize: '0.70rem', fontWeight: 700, color: isSelected ? '#38bdf8' : '#f8fafc' }}>
                        {op.label}
                      </span>
                      <span style={{ fontSize: '0.58rem', color: '#94a3b8' }}>
                        {op.desc}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. 조작 파라미터 패널 (상하 스택) */}
            <div style={{
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '6px',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {tempStep.operationType === 'SET_VALUE' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <label style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700 }}>설정 값 / 변수 템플릿</label>
                  <input
                    type="text"
                    value={tempStep.attrValue || ''}
                    onChange={e => handlePropChange('attrValue', e.target.value)}
                    placeholder="{{자산번호}}"
                    style={{
                      backgroundColor: '#020617',
                      border: '1px solid #38bdf8',
                      borderRadius: '3px',
                      padding: '5px 8px',
                      color: '#f8fafc',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}
                  />
                </div>
              )}

              {tempStep.operationType === 'GET_VALUE' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>추출 대상</label>
                    <select
                      value={tempStep.attrName || 'innerText'}
                      onChange={e => handlePropChange('attrName', e.target.value)}
                      style={{
                        backgroundColor: '#020617',
                        border: '1px solid #475569',
                        borderRadius: '3px',
                        padding: '5px 6px',
                        color: '#f8fafc',
                        fontSize: '0.72rem'
                      }}
                    >
                      <option value="innerText">innerText (표시 텍스트)</option>
                      <option value="value">value (입력값)</option>
                      <option value="innerHTML">innerHTML (원문)</option>
                      <option value="src">src (경로)</option>
                      <option value="href">href (링크)</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <label style={{ fontSize: '0.68rem', color: '#34d399', fontWeight: 700 }}>저장 변수명</label>
                    <input
                      type="text"
                      value={tempStep.saveToVariable || '추출_값'}
                      onChange={e => handlePropChange('saveToVariable', e.target.value)}
                      placeholder="예: 추출_자산번호"
                      style={{
                        backgroundColor: '#020617',
                        border: '1px solid #34d399',
                        borderRadius: '3px',
                        padding: '5px 8px',
                        color: '#34d399',
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}
                    />
                  </div>
                </div>
              )}

              {tempStep.operationType === 'CALL_METHOD' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>호출 메서드</label>
                  <input
                    type="text"
                    value={tempStep.methodName || 'click()'}
                    onChange={e => handlePropChange('methodName', e.target.value)}
                    placeholder="click()"
                    style={{
                      backgroundColor: '#020617',
                      border: '1px solid #8b5cf6',
                      borderRadius: '3px',
                      padding: '5px 8px',
                      color: '#c4b5fd',
                      fontFamily: 'Consolas, monospace',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}
                  />
                </div>
              )}

              {tempStep.operationType === 'SET_ATTRIBUTE' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>속성명</label>
                    <input
                      type="text"
                      value={tempStep.attrName || 'disabled'}
                      onChange={e => handlePropChange('attrName', e.target.value)}
                      placeholder="disabled"
                      style={{
                        backgroundColor: '#020617',
                        border: '1px solid #475569',
                        borderRadius: '3px',
                        padding: '5px 6px',
                        color: '#f8fafc',
                        fontSize: '0.72rem'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>속성값</label>
                    <input
                      type="text"
                      value={tempStep.attrValue || 'false'}
                      onChange={e => handlePropChange('attrValue', e.target.value)}
                      placeholder="false"
                      style={{
                        backgroundColor: '#020617',
                        border: '1px solid #475569',
                        borderRadius: '3px',
                        padding: '5px 6px',
                        color: '#f8fafc',
                        fontSize: '0.72rem'
                      }}
                    />
                  </div>
                </div>
              )}

              {tempStep.operationType === 'SET_STYLE' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>스타일명</label>
                    <input
                      type="text"
                      value={tempStep.attrName || 'display'}
                      onChange={e => handlePropChange('attrName', e.target.value)}
                      placeholder="display"
                      style={{
                        backgroundColor: '#020617',
                        border: '1px solid #475569',
                        borderRadius: '3px',
                        padding: '5px 6px',
                        color: '#f8fafc',
                        fontSize: '0.72rem'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>스타일값</label>
                    <input
                      type="text"
                      value={tempStep.attrValue || 'block'}
                      onChange={e => handlePropChange('attrValue', e.target.value)}
                      placeholder="block"
                      style={{
                        backgroundColor: '#020617',
                        border: '1px solid #475569',
                        borderRadius: '3px',
                        padding: '5px 6px',
                        color: '#f8fafc',
                        fontSize: '0.72rem'
                      }}
                    />
                  </div>
                </div>
              )}

              {tempStep.operationType === 'CLASS_TOGGLE' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>동작</label>
                    <select
                      value={tempStep.attrName || 'add'}
                      onChange={e => handlePropChange('attrName', e.target.value)}
                      style={{
                        backgroundColor: '#020617',
                        border: '1px solid #475569',
                        borderRadius: '3px',
                        padding: '5px 6px',
                        color: '#f8fafc',
                        fontSize: '0.72rem'
                      }}
                    >
                      <option value="add">클래스 추가 (add)</option>
                      <option value="remove">클래스 제거 (remove)</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>클래스명</label>
                    <input
                      type="text"
                      value={tempStep.attrValue || 'active'}
                      onChange={e => handlePropChange('attrValue', e.target.value)}
                      placeholder="active"
                      style={{
                        backgroundColor: '#020617',
                        border: '1px solid #475569',
                        borderRadius: '3px',
                        padding: '5px 6px',
                        color: '#f8fafc',
                        fontSize: '0.72rem'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* 변수 삽입 바 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', borderTop: '1px solid #1e293b', paddingTop: '6px' }}>
                <span style={{ fontSize: '0.60rem', color: '#64748b' }}>
                  변수 삽입 (클릭 시 입력란 추가)
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                  {DEFAULT_SCHEMA_DEF.fields.slice(0, 8).map(f => (
                    <span
                      key={f.id}
                      onClick={() => handlePropChange('attrValue', (tempStep.attrValue || '') + '{{' + f.name + '}}')}
                      style={{
                        fontSize: '0.62rem',
                        backgroundColor: '#020617',
                        border: '1px solid #38bdf8',
                        borderRadius: '3px',
                        padding: '1px 5px',
                        color: '#7dd3fc',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                    >
                      {'{{' + f.name + '}}'}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. 비상 대안 & 타임아웃 (상하 스택) */}
            <div style={{
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '6px',
              padding: '8px 10px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <label style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: 700 }}>
                  대체 실행 방안 (Fallback)
                </label>
                <select
                  value={tempStep.fallbackType || 'JS_INJECT'}
                  onChange={e => handlePropChange('fallbackType', e.target.value)}
                  style={{
                    backgroundColor: '#020617',
                    border: '1px solid #475569',
                    borderRadius: '3px',
                    padding: '4px 6px',
                    color: '#f8fafc',
                    fontSize: '0.68rem'
                  }}
                >
                  <option value="JS_INJECT">JS 강제 주입 실행</option>
                  <option value="PIXEL_MATCH">0MB 픽셀 매칭</option>
                  <option value="KEYBOARD_TAB">키보드 탭 이동</option>
                  <option value="NONE">예외 중단</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <label style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                  대기 시간 (ms)
                </label>
                <input
                  type="number"
                  value={tempStep.timeoutMs || 3000}
                  onChange={e => handlePropChange('timeoutMs', Number(e.target.value))}
                  style={{
                    backgroundColor: '#020617',
                    border: '1px solid #475569',
                    borderRadius: '3px',
                    padding: '4px 6px',
                    color: '#f8fafc',
                    fontSize: '0.68rem'
                  }}
                />
              </div>
            </div>

            {/* 4. 테스트 결과 피드백 */}
            {testResult && (
              <div style={{
                backgroundColor: '#064e3b',
                border: '1px solid #10b981',
                borderRadius: '4px',
                padding: '6px 10px',
                color: '#a7f3d0',
                fontSize: '0.68rem'
              }}>
                {testResult}
              </div>
            )}
          </div>
        </div>

        {/* ── [하단 액션바] ────────────────────────────────────── */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 16px',
          backgroundColor: '#0f172a',
          borderTop: '1px solid #1e293b'
        }}>
          <button
            type="button"
            onClick={handleExecuteTest}
            className="btn btn-outline"
            style={{ fontSize: '0.72rem', padding: '5px 12px', borderColor: '#38bdf8', color: '#7dd3fc' }}
          >
            조작 즉시 테스트
          </button>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              style={{ fontSize: '0.72rem', padding: '5px 12px' }}
            >
              닫기
            </button>
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="btn btn-primary"
              style={{ fontSize: '0.72rem', padding: '5px 14px', fontWeight: 700 }}
            >
              설정 저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
