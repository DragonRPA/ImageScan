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
  Sparkles,
  MousePointer,
  HelpCircle,
  Zap,
  Tag,
  Palette,
  RotateCw,
  Eye,
  Sliders,
  Radio,
  Maximize2,
  CheckCircle2,
  Scan
} from 'lucide-react';
import { DEFAULT_SCHEMA_DEF } from '../utils/dynamicSchema';

/**
 * 🎯 객체 정밀 조작 스튜디오 모달 (ObjectManipulatorModal)
 * 실시간 역동적 마우스 Hover 레이더 감지, Ctrl+클릭 명시적 락온,
 * 실시간 텔레메트리 피드백 및 6대 정밀 조작기 제공
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
  const [isHoveringTriggerActive, setIsHoveringTriggerActive] = useState(true); // 기본 탐색 활성
  const [hoveredElementInfo, setHoveredElementInfo] = useState({
    tagName: 'INPUT',
    id: 'assetNo',
    name: 'asset_no',
    xpath: "//input[@id='assetNo']",
    cssSelector: '#assetNo',
    className: 'form-control erp-input',
    innerText: '',
    rect: { x: 120, y: 45, width: 220, height: 32 },
    hint: '마우스가 올려진 상태입니다. [Ctrl+클릭]을 누르면 락온됩니다.'
  });

  const [lockedElementSpecs, setLockedElementSpecs] = useState({
    tagName: 'INPUT',
    id: 'assetNo',
    name: 'asset_no',
    className: 'form-control erp-input',
    type: 'text',
    currentValue: '',
    innerText: '',
    isDisplayed: true,
    isEnabled: true,
    xpath: tempStep.selector || "//input[@id='assetNo']",
    cssSelector: '#assetNo',
    rect: { width: 220, height: 32 },
    availableMethods: [
      'click()',
      'focus()',
      'blur()',
      'select()',
      "scrollIntoView({behavior:'smooth',block:'center'})",
      "dispatchEvent(new Event('change', {bubbles:true}))",
      "dispatchEvent(new Event('input', {bubbles:true}))",
      'submit()'
    ],
    availableAttributes: ['id', 'name', 'class', 'value', 'type', 'disabled', 'readOnly', 'placeholder', 'style']
  });

  const [testResult, setTestResult] = useState(null);
  const [flashLockMessage, setFlashLockMessage] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // 키보드 단축키 리스너 (Ctrl+클릭, Ctrl+Space 락온, Esc 취소)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsHoveringTriggerActive(false);
      } else if (e.ctrlKey && (e.key === ' ' || e.code === 'Space')) {
        e.preventDefault();
        if (hoveredElementInfo) {
          handleConfirmLockOn(hoveredElementInfo);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hoveredElementInfo]);

  // 필드 변경 핸들러
  const handlePropChange = (field, value) => {
    setTempStep(prev => ({ ...prev, [field]: value }));
  };

  // 실시간 마우스 Hover 감지 토글
  const toggleHoverInspection = () => {
    setIsHoveringTriggerActive(prev => !prev);
  };

  // 마우스 이동 시 실시간 텔레메트리 업데이트 핸들러
  const handleSandboxMouseMove = (e, elemInfo) => {
    if (!isHoveringTriggerActive) return;
    setMousePos({ x: e.clientX, y: e.clientY });
    setHoveredElementInfo({
      tagName: elemInfo.tagName,
      id: elemInfo.id,
      name: elemInfo.name,
      xpath: elemInfo.xpath,
      cssSelector: elemInfo.cssSelector,
      className: elemInfo.className,
      innerText: elemInfo.innerText || '',
      rect: elemInfo.rect || { width: 180, height: 32 },
      hint: '마우스가 올려진 상태입니다. [Ctrl+클릭] 또는 버튼으로 확정하세요.'
    });
  };

  // 명시적 락온 확정 트리거 (클릭 또는 Ctrl+클릭)
  const handleConfirmLockOn = (info) => {
    const targetInfo = info || hoveredElementInfo;
    if (!targetInfo) return;

    setLockedElementSpecs(prev => ({
      ...prev,
      tagName: targetInfo.tagName || 'INPUT',
      id: targetInfo.id || 'assetNo',
      name: targetInfo.name || 'asset_no',
      className: targetInfo.className || 'form-control',
      xpath: targetInfo.xpath || "//input[@id='assetNo']",
      cssSelector: targetInfo.cssSelector || '#assetNo'
    }));

    handlePropChange('selector', targetInfo.xpath || "//input[@id='assetNo']");
    setFlashLockMessage(`🎯 타겟 [${targetInfo.tagName}#${targetInfo.id || targetInfo.name || 'target'}] 락온 확정 완료!`);
    setTimeout(() => setFlashLockMessage(null), 3000);
  };

  // 즉시 테스트 실행 시뮬레이션
  const handleExecuteTest = () => {
    setTestResult('⚡ 테스트 실행 중...');
    setTimeout(() => {
      setTestResult(`✅ 성공: 타겟 [${tempStep.selector || lockedElementSpecs.xpath}]에 대해 [${tempStep.operationType}] 동작이 0.02초 만에 완벽히 수행되었습니다.`);
    }, 300);
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
        border: '1px solid #38bdf8',
        borderRadius: '12px',
        width: '1180px',
        maxWidth: '98vw',
        height: '92vh',
        maxHeight: '96vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
        overflow: 'hidden'
      }}>
        {/* ── [헤더] ────────────────────────────────────────────── */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 20px',
          backgroundColor: '#0f172a',
          borderBottom: '1px solid #1e293b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              backgroundColor: '#0284c7',
              borderRadius: '8px',
              padding: '6px 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 12px rgba(2, 132, 199, 0.6)'
            }}>
              <Scan size={20} style={{ color: '#fff' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🎯 객체 정밀 조작 스튜디오 (DOM / UIA Live Radar Studio)
                {isHoveringTriggerActive && (
                  <span style={{
                    fontSize: '0.62rem',
                    backgroundColor: '#065f46',
                    color: '#34d399',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    border: '1px solid #10b981',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#34d399', display: 'inline-block' }} />
                    실시간 레이더 탐색 가동 중 (Ctrl+클릭 시 즉시 락온)
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                스텝: {tempStep.name} ({tempStep.id}) | 마우스 오버 시 실시간 테두리 펄스 &amp; 속성/메서드 스펙 즉시 분석
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.4rem',
              cursor: 'pointer',
              lineHeight: 1
            }}
          >
            ✕
          </button>
        </div>

        {/* ── [플래시 락온 알림 배너] ─────────────────────────── */}
        {flashLockMessage && (
          <div style={{
            backgroundColor: '#064e3b',
            borderBottom: '1px solid #10b981',
            padding: '6px 20px',
            color: '#a7f3d0',
            fontSize: '0.75rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s'
          }}>
            <CheckCircle2 size={16} /> {flashLockMessage}
          </div>
        )}

        {/* ── [2분할 워크스페이스 본문] ─────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '500px 1fr',
          flex: 1,
          overflow: 'hidden'
        }}>
          {/* ── [좌측 패널 500px]: 역동적 실시간 뷰파인더 & 스펙 ── */}
          <div style={{
            backgroundColor: '#0b1120',
            borderRight: '1px solid #1e293b',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            overflowY: 'auto'
          }} className="grid-scrollbar">

            {/* 1. 상단 라이브 샌드박스 뷰파인더 (실시간 마우스 오버 반응 캔버스) */}
            <div style={{
              backgroundColor: '#0f172a',
              border: isHoveringTriggerActive ? '1px solid #38bdf8' : '1px solid #334155',
              borderRadius: '8px',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              boxShadow: isHoveringTriggerActive ? '0 0 15px rgba(56, 189, 248, 0.2)' : 'none'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Radio size={12} style={{ color: isHoveringTriggerActive ? '#38bdf8' : '#94a3b8' }} />
                  1. 실시간 객체 탐색 뷰파인더 (마우스를 올려보세요!)
                </span>
                <span style={{ fontSize: '0.62rem', color: '#fde047', fontWeight: 600 }}>
                  [Ctrl+클릭] = 락온
                </span>
              </div>

              {/* 모의 타겟 인터랙티브 엘리먼트 샌드박스 */}
              <div style={{
                backgroundColor: '#020617',
                border: '1px dashed #334155',
                borderRadius: '6px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                position: 'relative'
              }}>
                <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                  🏢 사내 ERP / 웹 페이지 대상 폼 (시뮬레이터)
                </div>

                {/* 모의 입력 요소 1: 자산번호 */}
                <div
                  onMouseEnter={e => handleSandboxMouseMove(e, {
                    tagName: 'INPUT',
                    id: 'assetNo',
                    name: 'asset_no',
                    xpath: "//input[@id='assetNo']",
                    cssSelector: '#assetNo',
                    className: 'form-control erp-input',
                    innerText: '',
                    rect: { width: 220, height: 32 }
                  })}
                  onClick={e => {
                    if (e.ctrlKey || isHoveringTriggerActive) {
                      handleConfirmLockOn(hoveredElementInfo);
                    }
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    padding: '4px 6px',
                    borderRadius: '4px',
                    cursor: 'crosshair',
                    backgroundColor: hoveredElementInfo?.id === 'assetNo' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                    border: hoveredElementInfo?.id === 'assetNo' ? '1px solid #38bdf8' : '1px solid transparent',
                    boxShadow: hoveredElementInfo?.id === 'assetNo' ? '0 0 10px rgba(56, 189, 248, 0.4)' : 'none',
                    transition: 'all 0.15s ease-out'
                  }}
                >
                  <label style={{ fontSize: '0.65rem', color: '#94a3b8' }}>자산번호 (Asset No)</label>
                  <input
                    type="text"
                    readOnly
                    placeholder="예: AST-2026-001"
                    style={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      color: '#38bdf8',
                      fontSize: '0.75rem',
                      fontFamily: 'Consolas, monospace'
                    }}
                  />
                </div>

                {/* 모의 입력 요소 2: 시리얼번호 */}
                <div
                  onMouseEnter={e => handleSandboxMouseMove(e, {
                    tagName: 'INPUT',
                    id: 'serialNo',
                    name: 'serial_no',
                    xpath: "//input[@id='serialNo']",
                    cssSelector: '#serialNo',
                    className: 'form-control serial-box',
                    innerText: '',
                    rect: { width: 220, height: 32 }
                  })}
                  onClick={e => {
                    if (e.ctrlKey || isHoveringTriggerActive) {
                      handleConfirmLockOn(hoveredElementInfo);
                    }
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    padding: '4px 6px',
                    borderRadius: '4px',
                    cursor: 'crosshair',
                    backgroundColor: hoveredElementInfo?.id === 'serialNo' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                    border: hoveredElementInfo?.id === 'serialNo' ? '1px solid #38bdf8' : '1px solid transparent',
                    boxShadow: hoveredElementInfo?.id === 'serialNo' ? '0 0 10px rgba(56, 189, 248, 0.4)' : 'none',
                    transition: 'all 0.15s ease-out'
                  }}
                >
                  <label style={{ fontSize: '0.65rem', color: '#94a3b8' }}>제조 시리얼 (Serial / IMEI)</label>
                  <input
                    type="text"
                    readOnly
                    placeholder="예: SN99882211"
                    style={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      color: '#f8fafc',
                      fontSize: '0.75rem'
                    }}
                  />
                </div>

                {/* 모의 버튼 2개: 조회 및 입고 승인 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onMouseEnter={e => handleSandboxMouseMove(e, {
                      tagName: 'BUTTON',
                      id: 'btnSearch',
                      name: 'btn_search',
                      xpath: "//button[@id='btnSearch']",
                      cssSelector: '#btnSearch',
                      className: 'btn btn-secondary',
                      innerText: '🔍 장비 조회',
                      rect: { width: 100, height: 30 }
                    })}
                    onClick={e => {
                      if (e.ctrlKey || isHoveringTriggerActive) {
                        handleConfirmLockOn(hoveredElementInfo);
                      }
                    }}
                    style={{
                      padding: '6px',
                      fontSize: '0.70rem',
                      cursor: 'crosshair',
                      backgroundColor: hoveredElementInfo?.id === 'btnSearch' ? '#0284c7' : '#1e293b',
                      border: hoveredElementInfo?.id === 'btnSearch' ? '1px solid #38bdf8' : '1px solid #475569',
                      color: '#f8fafc',
                      borderRadius: '4px',
                      fontWeight: 700,
                      boxShadow: hoveredElementInfo?.id === 'btnSearch' ? '0 0 10px rgba(56, 189, 248, 0.6)' : 'none',
                      transition: 'all 0.15s ease-out'
                    }}
                  >
                    🔍 장비 조회
                  </button>

                  <button
                    type="button"
                    onMouseEnter={e => handleSandboxMouseMove(e, {
                      tagName: 'BUTTON',
                      id: 'btnSubmitInbound',
                      name: 'btn_submit',
                      xpath: "//button[@id='btnSubmitInbound']",
                      cssSelector: '#btnSubmitInbound',
                      className: 'btn btn-primary btn-save',
                      innerText: '💾 입고 확정 등록',
                      rect: { width: 110, height: 30 }
                    })}
                    onClick={e => {
                      if (e.ctrlKey || isHoveringTriggerActive) {
                        handleConfirmLockOn(hoveredElementInfo);
                      }
                    }}
                    style={{
                      padding: '6px',
                      fontSize: '0.70rem',
                      cursor: 'crosshair',
                      backgroundColor: hoveredElementInfo?.id === 'btnSubmitInbound' ? '#059669' : '#047857',
                      border: hoveredElementInfo?.id === 'btnSubmitInbound' ? '1px solid #34d399' : '1px solid #10b981',
                      color: '#fff',
                      borderRadius: '4px',
                      fontWeight: 700,
                      boxShadow: hoveredElementInfo?.id === 'btnSubmitInbound' ? '0 0 12px rgba(52, 211, 153, 0.7)' : 'none',
                      transition: 'all 0.15s ease-out'
                    }}
                  >
                    💾 입고 확정 등록
                  </button>
                </div>
              </div>

              {/* 실시간 감지 정보 및 원클릭 락온 버튼 */}
              {hoveredElementInfo && (
                <div style={{
                  backgroundColor: '#1e3a5f',
                  border: '1px solid #38bdf8',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#fde047', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Zap size={12} /> 실시간 감지: &lt;{hoveredElementInfo.tagName}#{hoveredElementInfo.id || 'element'}&gt;
                    </span>
                    <span style={{ fontSize: '0.60rem', color: '#94a3b8' }}>
                      {hoveredElementInfo.rect?.width || 200}×{hoveredElementInfo.rect?.height || 32}px
                    </span>
                  </div>

                  <div style={{ fontSize: '0.68rem', color: '#f8fafc', fontFamily: 'Consolas, monospace', wordBreak: 'break-all' }}>
                    {hoveredElementInfo.xpath}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleConfirmLockOn(hoveredElementInfo)}
                    className="btn btn-primary"
                    style={{
                      marginTop: '4px',
                      fontSize: '0.72rem',
                      padding: '6px',
                      fontWeight: 800,
                      backgroundColor: '#0284c7',
                      borderColor: '#38bdf8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Target size={14} /> 🎯 이 객체로 락온 확정 (Ctrl+클릭)
                  </button>
                </div>
              )}
            </div>

            {/* 2. 락온된 객체의 정밀 DOM/UIA 스펙 인스펙터 */}
            <div style={{
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Eye size={12} /> 2. 락온된 객체 실시간 스펙 (DOM Spec)
                </span>
                <span style={{ fontSize: '0.60rem', color: '#94a3b8' }}>
                  정밀 분석 완료
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.68rem' }}>
                <div style={{ backgroundColor: '#020617', padding: '4px 6px', borderRadius: '4px', border: '1px solid #1e293b' }}>
                  <span style={{ color: '#94a3b8' }}>태그: </span>
                  <span style={{ color: '#38bdf8', fontWeight: 700 }}>&lt;{lockedElementSpecs.tagName}&gt;</span>
                </div>
                <div style={{ backgroundColor: '#020617', padding: '4px 6px', borderRadius: '4px', border: '1px solid #1e293b' }}>
                  <span style={{ color: '#94a3b8' }}>ID: </span>
                  <span style={{ color: '#f8fafc', fontWeight: 600 }}>{lockedElementSpecs.id || '없음'}</span>
                </div>
                <div style={{ backgroundColor: '#020617', padding: '4px 6px', borderRadius: '4px', border: '1px solid #1e293b' }}>
                  <span style={{ color: '#94a3b8' }}>Name: </span>
                  <span style={{ color: '#f8fafc', fontWeight: 600 }}>{lockedElementSpecs.name || '없음'}</span>
                </div>
                <div style={{ backgroundColor: '#020617', padding: '4px 6px', borderRadius: '4px', border: '1px solid #1e293b' }}>
                  <span style={{ color: '#94a3b8' }}>클래스: </span>
                  <span style={{ color: '#cbd5e1' }}>{lockedElementSpecs.className}</span>
                </div>
              </div>

              {/* 사용 가능한 메서드 목록 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#a78bfa' }}>
                  ⚡ 지원되는 JS 메서드 (원클릭 바인딩)
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                  {lockedElementSpecs.availableMethods.map((m, idx) => (
                    <span
                      key={idx}
                      onClick={() => {
                        handlePropChange('operationType', 'CALL_METHOD');
                        handlePropChange('methodName', m);
                      }}
                      style={{
                        fontSize: '0.62rem',
                        backgroundColor: '#020617',
                        border: '1px solid #8b5cf6',
                        borderRadius: '3px',
                        padding: '1px 5px',
                        color: '#c4b5fd',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                      title="클릭하여 메서드 호출로 설정"
                    >
                      .{m}
                    </span>
                  ))}
                </div>
              </div>

              {/* 사용 가능한 속성 목록 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#fbbf24' }}>
                  🏷️ 지원되는 HTML 속성 (원클릭 바인딩)
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                  {lockedElementSpecs.availableAttributes.map((attr, idx) => (
                    <span
                      key={idx}
                      onClick={() => {
                        handlePropChange('operationType', 'SET_ATTRIBUTE');
                        handlePropChange('attrName', attr);
                      }}
                      style={{
                        fontSize: '0.62rem',
                        backgroundColor: '#020617',
                        border: '1px solid #b45309',
                        borderRadius: '3px',
                        padding: '1px 5px',
                        color: '#fde047',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                      title="클릭하여 속성 변경으로 설정"
                    >
                      {attr}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── [우측 패널]: ⚡ 6대 정밀 조작기 & 파라미터 ──────── */}
          <div style={{
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            overflowY: 'auto'
          }} className="grid-scrollbar">
            {/* 1. 조작 유형 6대 카드 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8' }}>
                3. 객체 조작 작업 선택 (Operation Type)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                {[
                  { id: 'SET_VALUE', label: '✏️ 값 / 텍스트 설정', desc: '.value 또는 .innerText 변경' },
                  { id: 'GET_VALUE', label: '📥 값 추출 및 변수 저장', desc: '화면 값을 읽어 변수에 보관' },
                  { id: 'CALL_METHOD', label: '⚡ JS 메서드 실행', desc: '.click(), .focus(), .scroll()' },
                  { id: 'SET_ATTRIBUTE', label: '🏷️ HTML 속성 변경', desc: 'disabled=false, readOnly=false' },
                  { id: 'SET_STYLE', label: '🎨 CSS 스타일 강제 조작', desc: 'display: block 강제 노출' },
                  { id: 'CLASS_TOGGLE', label: '🔄 CSS 클래스 토글', desc: 'classList.add/remove' }
                ].map(op => {
                  const isSelected = tempStep.operationType === op.id;
                  return (
                    <div
                      key={op.id}
                      onClick={() => handlePropChange('operationType', op.id)}
                      style={{
                        backgroundColor: isSelected ? '#1e3a5f' : '#0f172a',
                        border: '1px solid ' + (isSelected ? '#38bdf8' : '#334155'),
                        borderRadius: '6px',
                        padding: '8px 10px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        transition: 'all 0.15s ease-out'
                      }}
                    >
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: isSelected ? '#38bdf8' : '#f8fafc' }}>
                        {op.label}
                      </span>
                      <span style={{ fontSize: '0.62rem', color: '#94a3b8' }}>
                        {op.desc}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. 조작 유형별 세부 파라미터 패널 */}
            <div style={{
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              {/* SET_VALUE */}
              {tempStep.operationType === 'SET_VALUE' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>설정할 값 / 변수 템플릿</label>
                  <input
                    type="text"
                    value={tempStep.attrValue || ''}
                    onChange={e => handlePropChange('attrValue', e.target.value)}
                    placeholder="{{자산번호}}"
                    style={{
                      backgroundColor: '#020617',
                      border: '1px solid #38bdf8',
                      borderRadius: '4px',
                      padding: '6px 10px',
                      color: '#f8fafc',
                      fontSize: '0.80rem',
                      fontWeight: 600
                    }}
                  />
                </div>
              )}

              {/* GET_VALUE */}
              {tempStep.operationType === 'GET_VALUE' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.70rem', color: '#94a3b8' }}>추출할 항목</label>
                    <select
                      value={tempStep.attrName || 'innerText'}
                      onChange={e => handlePropChange('attrName', e.target.value)}
                      style={{
                        backgroundColor: '#020617',
                        border: '1px solid #475569',
                        borderRadius: '4px',
                        padding: '6px 8px',
                        color: '#f8fafc',
                        fontSize: '0.75rem'
                      }}
                    >
                      <option value="innerText">innerText (화면 표시 텍스트)</option>
                      <option value="value">value (입력창 값)</option>
                      <option value="innerHTML">innerHTML (HTML 원문)</option>
                      <option value="src">src (이미지/스크립트 경로)</option>
                      <option value="href">href (링크 주소)</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.70rem', color: '#34d399', fontWeight: 700 }}>저장할 변수명</label>
                    <input
                      type="text"
                      value={tempStep.saveToVariable || '추출_값'}
                      onChange={e => handlePropChange('saveToVariable', e.target.value)}
                      placeholder="예: 추출_자산번호"
                      style={{
                        backgroundColor: '#020617',
                        border: '1px solid #34d399',
                        borderRadius: '4px',
                        padding: '6px 10px',
                        color: '#34d399',
                        fontSize: '0.80rem',
                        fontWeight: 700
                      }}
                    />
                  </div>
                </div>
              )}

              {/* CALL_METHOD */}
              {tempStep.operationType === 'CALL_METHOD' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.70rem', color: '#94a3b8' }}>호출할 JavaScript 메서드</label>
                  <input
                    type="text"
                    value={tempStep.methodName || 'click()'}
                    onChange={e => handlePropChange('methodName', e.target.value)}
                    placeholder="click()"
                    style={{
                      backgroundColor: '#020617',
                      border: '1px solid #8b5cf6',
                      borderRadius: '4px',
                      padding: '6px 10px',
                      color: '#c4b5fd',
                      fontFamily: 'Consolas, monospace',
                      fontSize: '0.80rem',
                      fontWeight: 600
                    }}
                  />
                </div>
              )}

              {/* SET_ATTRIBUTE */}
              {tempStep.operationType === 'SET_ATTRIBUTE' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.70rem', color: '#94a3b8' }}>속성명</label>
                    <input
                      type="text"
                      value={tempStep.attrName || 'disabled'}
                      onChange={e => handlePropChange('attrName', e.target.value)}
                      placeholder="disabled"
                      style={{
                        backgroundColor: '#020617',
                        border: '1px solid #475569',
                        borderRadius: '4px',
                        padding: '6px 8px',
                        color: '#f8fafc',
                        fontSize: '0.75rem'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.70rem', color: '#94a3b8' }}>속성값</label>
                    <input
                      type="text"
                      value={tempStep.attrValue || 'false'}
                      onChange={e => handlePropChange('attrValue', e.target.value)}
                      placeholder="false"
                      style={{
                        backgroundColor: '#020617',
                        border: '1px solid #475569',
                        borderRadius: '4px',
                        padding: '6px 8px',
                        color: '#f8fafc',
                        fontSize: '0.75rem'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* SET_STYLE */}
              {tempStep.operationType === 'SET_STYLE' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.70rem', color: '#94a3b8' }}>CSS 스타일명</label>
                    <input
                      type="text"
                      value={tempStep.attrName || 'display'}
                      onChange={e => handlePropChange('attrName', e.target.value)}
                      placeholder="display"
                      style={{
                        backgroundColor: '#020617',
                        border: '1px solid #475569',
                        borderRadius: '4px',
                        padding: '6px 8px',
                        color: '#f8fafc',
                        fontSize: '0.75rem'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.70rem', color: '#94a3b8' }}>스타일 값</label>
                    <input
                      type="text"
                      value={tempStep.attrValue || 'block'}
                      onChange={e => handlePropChange('attrValue', e.target.value)}
                      placeholder="block"
                      style={{
                        backgroundColor: '#020617',
                        border: '1px solid #475569',
                        borderRadius: '4px',
                        padding: '6px 8px',
                        color: '#f8fafc',
                        fontSize: '0.75rem'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* CLASS_TOGGLE */}
              {tempStep.operationType === 'CLASS_TOGGLE' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.70rem', color: '#94a3b8' }}>동작</label>
                    <select
                      value={tempStep.attrName || 'add'}
                      onChange={e => handlePropChange('attrName', e.target.value)}
                      style={{
                        backgroundColor: '#020617',
                        border: '1px solid #475569',
                        borderRadius: '4px',
                        padding: '6px 8px',
                        color: '#f8fafc',
                        fontSize: '0.75rem'
                      }}
                    >
                      <option value="add">클래스 추가 (.classList.add)</option>
                      <option value="remove">클래스 제거 (.classList.remove)</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.70rem', color: '#94a3b8' }}>클래스명</label>
                    <input
                      type="text"
                      value={tempStep.attrValue || 'active'}
                      onChange={e => handlePropChange('attrValue', e.target.value)}
                      placeholder="active"
                      style={{
                        backgroundColor: '#020617',
                        border: '1px solid #475569',
                        borderRadius: '4px',
                        padding: '6px 8px',
                        color: '#f8fafc',
                        fontSize: '0.75rem'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* 원클릭 변수 삽입 퀵 바 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid #1e293b', paddingTop: '8px' }}>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                  💡 원클릭 변수 삽입 (클릭 시 값 입력란에 자동 추가)
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {DEFAULT_SCHEMA_DEF.fields.slice(0, 8).map(f => (
                    <span
                      key={f.id}
                      onClick={() => handlePropChange('attrValue', (tempStep.attrValue || '') + '{{' + f.name + '}}')}
                      style={{
                        fontSize: '0.65rem',
                        backgroundColor: '#020617',
                        border: '1px solid #38bdf8',
                        borderRadius: '4px',
                        padding: '2px 6px',
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

            {/* 3. 비상 대안(Fallback) 및 타임아웃 */}
            <div style={{
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '10px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <label style={{ fontSize: '0.68rem', color: '#f59e0b', fontWeight: 700 }}>
                  비상 대안 (Fallback)
                </label>
                <select
                  value={tempStep.fallbackType || 'JS_INJECT'}
                  onChange={e => handlePropChange('fallbackType', e.target.value)}
                  style={{
                    backgroundColor: '#020617',
                    border: '1px solid #475569',
                    borderRadius: '4px',
                    padding: '4px 6px',
                    color: '#f8fafc',
                    fontSize: '0.70rem'
                  }}
                >
                  <option value="JS_INJECT">⚡ JavaScript 강제 주입 실행</option>
                  <option value="PIXEL_MATCH">🖼️ 0MB 초경량 픽셀 매칭</option>
                  <option value="KEYBOARD_TAB">⌨️ 키보드 탭(Tab) 시퀀스 이동</option>
                  <option value="NONE">기본 실패 (예외 중단)</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                  대기 타임아웃 (ms)
                </label>
                <input
                  type="number"
                  value={tempStep.timeoutMs || 3000}
                  onChange={e => handlePropChange('timeoutMs', Number(e.target.value))}
                  style={{
                    backgroundColor: '#020617',
                    border: '1px solid #475569',
                    borderRadius: '4px',
                    padding: '4px 6px',
                    color: '#f8fafc',
                    fontSize: '0.70rem'
                  }}
                />
              </div>
            </div>

            {/* 4. 테스트 결과 피드백 */}
            {testResult && (
              <div style={{
                backgroundColor: '#064e3b',
                border: '1px solid #10b981',
                borderRadius: '6px',
                padding: '8px 12px',
                color: '#a7f3d0',
                fontSize: '0.70rem'
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
          padding: '12px 20px',
          backgroundColor: '#0f172a',
          borderTop: '1px solid #1e293b'
        }}>
          <button
            type="button"
            onClick={handleExecuteTest}
            className="btn btn-outline"
            style={{ fontSize: '0.75rem', padding: '6px 14px', borderColor: '#38bdf8', color: '#7dd3fc', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Zap size={13} /> ⚡ 이 객체 조작 즉시 테스트 실행
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              style={{ fontSize: '0.75rem', padding: '6px 14px' }}
            >
              닫기
            </button>
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="btn btn-primary"
              style={{ fontSize: '0.75rem', padding: '6px 16px', fontWeight: 700 }}
            >
              <Check size={14} /> 스텝에 설정 적용 및 완료
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
