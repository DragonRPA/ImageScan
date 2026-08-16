import React, { useState } from 'react';
import {
  Bot,
  Plus,
  Trash2,
  Copy,
  Save,
  Play,
  Crosshair,
  Sparkles,
  Layers,
  ArrowDown,
  MoveUp,
  MoveDown,
  Check,
  MousePointer,
  AppWindow,
  Monitor,
  XCircle,
  ExternalLink,
  Globe,
  Layout,
  Target,
  Wrench,
  Code2,
  Variable,
  FileCode2,
  BookOpen,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { getAllRpaScenarios, getRpaScenarioById, saveRpaScenario, deleteRpaScenario, generatePlaywrightCSharpCode, BUILTIN_RPA_SCENARIOS } from '../utils/rpaEngine';
import { DEFAULT_SCHEMA_DEF } from '../utils/dynamicSchema';

export default function RPABuilderTab({ onError }) {
  const [scenarios, setScenarios] = useState(getAllRpaScenarios);
  const [selectedScenarioId, setSelectedScenarioId] = useState(() => scenarios[0]?.id || 'scenario_inbound_register');
  const [selectedStepId, setSelectedStepId] = useState('step_1');
  const [isSaved, setIsSaved] = useState(false);
  const [isInspecting, setIsInspecting] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);

  // 좌측 도구함 & 변수 관리 접고 펼치기 상태
  const [isWebOpen, setIsWebOpen] = useState(true);
  const [isDesktopOpen, setIsDesktopOpen] = useState(true);
  const [isVariablesOpen, setIsVariablesOpen] = useState(true);

  const scenario = scenarios.find(s => s.id === selectedScenarioId) || scenarios[0];

  // 모든 스텝 평탄화 목록 (루프 하위 스텝 포함)
  const getAllFlattenedSteps = () => {
    const list = [];
    (scenario.steps || []).forEach(step => {
      list.push({ ...step, isSubStep: false });
      if (step.action === 'LOOP_ROWS' && Array.isArray(step.subSteps)) {
        step.subSteps.forEach(sub => {
          list.push({ ...sub, isSubStep: true, parentId: step.id });
        });
      }
    });
    return list;
  };

  const allSteps = getAllFlattenedSteps();
  const selectedStep = allSteps.find(s => s.id === selectedStepId) || allSteps[0];

  // 시나리오 속성 변경
  const handleScenarioPropChange = (field, value) => {
    const updated = { ...scenario, [field]: value };
    updateScenarioState(updated);
  };

  const updateScenarioState = (updatedScenario) => {
    setScenarios(prev => prev.map(s => s.id === updatedScenario.id ? updatedScenario : s));
    setIsSaved(false);
  };

  // 새 시나리오 생성
  const handleCreateNewScenario = () => {
    const name = window.prompt('새 RPA 시나리오 명칭을 입력하세요:', '사용자 정의 자동화');
    if (!name) return;
    const newId = `scenario_custom_${Date.now()}`;
    const newSc = {
      id: newId,
      name,
      description: '사용자 정의 RPA 자동화 시나리오',
      targetBrowser: 'Edge',
      requiredHeaders: ['asset_no'],
      steps: [
        {
          id: 'step_1',
          action: 'NAVIGATE',
          name: '웹 페이지 접속',
          url: 'https://',
          targetBrowser: 'Edge',
          launchMode: 'ATTACH_EXISTING',
          windowSize: 'MAXIMIZED',
          windowAlias: 'main',
          pageLoadStrategy: 'Eager',
          blockImages: true,
          disableThrottling: true,
          autoDownload: true,
          disableFirstRun: true,
          disableGpu: true,
          ignoreCertErrors: true,
          disableBlinkFeatures: true,
          waitUntil: 'networkidle',
          timeoutMs: 5000
        }
      ]
    };
    const updatedList = [...scenarios, newSc];
    setScenarios(updatedList);
    setSelectedScenarioId(newId);
    setSelectedStepId('step_1');
    saveRpaScenario(newSc);
  };

  // 새 스텝 추가
  const handleAddStep = (actionType) => {
    const newStepId = `step_${Date.now()}`;
    let newStep = {
      id: newStepId,
      action: actionType,
      name: `${actionType} 단계`,
      timeoutMs: 3000
    };

    if (actionType === 'NAVIGATE') {
      newStep = {
        ...newStep,
        name: '페이지 접속',
        url: 'https://',
        targetBrowser: 'Edge',
        launchMode: 'ATTACH_EXISTING',
        windowSize: 'MAXIMIZED',
        windowAlias: 'main',
        pageLoadStrategy: 'Eager',
        blockImages: true,
        disableThrottling: true,
        autoDownload: true,
        disableFirstRun: true,
        disableGpu: true,
        ignoreCertErrors: true,
        disableBlinkFeatures: true,
        waitUntil: 'networkidle',
        timeoutMs: 5000
      };
    }
    if (actionType === 'SWITCH_WINDOW') {
      newStep = {
        ...newStep,
        name: '창/탭 전환',
        matchType: 'LAST_OPENED',
        targetAlias: 'main',
        matchPattern: '',
        timeoutMs: 5000
      };
    }
    if (actionType === 'CLOSE_WINDOW') {
      newStep = {
        ...newStep,
        name: '창 닫기',
        targetAlias: '',
        returnToAlias: 'main'
      };
    }
    if (actionType === 'MANIPULATE_OBJECT') {
      newStep = {
        ...newStep,
        name: '객체 조작',
        selector: "//input[@id='']",
        operationType: 'SET_VALUE', // 'SET_VALUE' | 'GET_VALUE' | 'CALL_METHOD' | 'SET_ATTRIBUTE' | 'SET_STYLE' | 'CLASS_TOGGLE'
        attrName: 'value',
        attrValue: '{{자산번호}}',
        methodName: 'click()',
        saveToVariable: '',
        fallbackType: 'JS_INJECT',
        timeoutMs: 3000
      };
    }
    if (actionType === 'FIND_WINDOW') {
      newStep = {
        ...newStep,
        name: '윈도우 창 찾기 및 활성화',
        processName: '',
        windowTitle: '사내 ERP',
        bringToFront: true,
        windowState: 'MAXIMIZED',
        timeoutMs: 5000
      };
    }
    if (actionType === 'UIA_CONTROL') {
      newStep = {
        ...newStep,
        name: 'UIA 데스크톱 컨트롤 조작',
        automationId: 'btnSave',
        controlName: '',
        controlType: 'Button',
        operationType: 'Click',
        attrValue: '{{자산번호}}',
        saveToVariable: '',
        fallbackType: 'PIXEL_MATCH',
        timeoutMs: 3000
      };
    }
    if (actionType === 'KVM_INPUT') {
      newStep = {
        ...newStep,
        name: 'OS 마우스/키보드 (KVM)',
        kvmType: 'CLICK_COORD',
        coordX: 500,
        coordY: 300,
        hotKey: 'Ctrl+V',
        text: '{{자산번호}}',
        delayMs: 300
      };
    }
    if (actionType === 'SWITCH_FRAME') newStep = { ...newStep, name: '프레임 전환', frameSelector: 'contentFrame' };
    if (actionType === 'WAIT_ELEMENT') newStep = { ...newStep, name: '요소 로딩 대기', selector: "//input[@id='']" };
    if (actionType === 'INPUT_TEXT') newStep = { ...newStep, name: '텍스트 입력', selector: "//input[@id='']", valueTemplate: '{{자산번호}}', sendEnter: false, fallbackType: 'NONE' };
    if (actionType === 'CLICK') newStep = { ...newStep, name: '버튼 클릭', selector: "//button[@id='']", fallbackType: 'PIXEL_MATCH', opensNewWindow: false, newWindowAlias: 'popup_1' };
    if (actionType === 'HANDLE_ALERT') newStep = { ...newStep, name: '알럿창 수락', alertAction: 'ACCEPT' };

    const updatedSteps = [...(scenario.steps || []), newStep];
    updateScenarioState({ ...scenario, steps: updatedSteps });
    setSelectedStepId(newStepId);
  };

  // 스텝 속성 변경
  const handleStepPropChange = (field, value) => {
    if (!selectedStep) return;
    const updateInList = (stepsList) => {
      return stepsList.map(st => {
        if (st.id === selectedStep.id) {
          return { ...st, [field]: value };
        }
        if (st.action === 'LOOP_ROWS' && Array.isArray(st.subSteps)) {
          return { ...st, subSteps: updateInList(st.subSteps) };
        }
        return st;
      });
    };

    const updatedSteps = updateInList(scenario.steps || []);
    updateScenarioState({ ...scenario, steps: updatedSteps });
  };

  // 스텝 삭제
  const handleDeleteStep = (stepId) => {
    const deleteFromList = (stepsList) => {
      return stepsList
        .filter(st => st.id !== stepId)
        .map(st => {
          if (st.action === 'LOOP_ROWS' && Array.isArray(st.subSteps)) {
            return { ...st, subSteps: deleteFromList(st.subSteps) };
          }
          return st;
        });
    };

    const updatedSteps = deleteFromList(scenario.steps || []);
    updateScenarioState({ ...scenario, steps: updatedSteps });
    setSelectedStepId(updatedSteps[0]?.id || '');
  };

  // 원클릭 요소 집기 (네비게이터 시뮬레이션)
  const handleInspectElement = () => {
    setIsInspecting(true);
    setTimeout(() => {
      setIsInspecting(false);
      handleStepPropChange('selector', "//input[@id='assetNo' or @name='asset_no']");
      alert('네비게이터: 타겟 요소 감지 완료!\n\n선택자: //input[@id=\'assetNo\'] (소속: contentFrame)');
    }, 1000);
  };

  // 시나리오 저장
  const handleSaveScenario = async () => {
    await saveRpaScenario(scenario);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      color: '#f8fafc',
      width: '100%'
    }}>
      {/* ── [1] 상단 액션 바 ────────────────────────────────────────── */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Bot size={16} style={{ color: '#38bdf8' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>RPA 시나리오 편집기</span>

          {/* 시나리오 선택 */}
          <select
            value={selectedScenarioId}
            onChange={e => {
              setSelectedScenarioId(e.target.value);
              setSelectedStepId('step_1');
            }}
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
            {scenarios.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <button
            onClick={handleCreateNewScenario}
            className="btn btn-outline"
            style={{ fontSize: '0.68rem', padding: '3px 8px' }}
          >
            + 새 시나리오
          </button>

          {/* 🎭 Playwright 차세대 엔진 배지 */}
          <span style={{
            fontSize: '0.65rem',
            backgroundColor: '#0f172a',
            border: '1px solid #10b981',
            borderRadius: '4px',
            padding: '2px 8px',
            color: '#34d399',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            🎭 Microsoft Playwright 초고속 직통 엔진
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => setShowDocsModal(true)}
            className="btn btn-outline"
            style={{ fontSize: '0.70rem', padding: '4px 10px', borderColor: '#10b981', color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <BookOpen size={12} /> Playwright 공식 기술문서
          </button>

          <button
            onClick={() => setShowCodeModal(true)}
            className="btn btn-outline"
            style={{ fontSize: '0.70rem', padding: '4px 10px', borderColor: '#38bdf8', color: '#7dd3fc', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <FileCode2 size={12} /> C# Playwright 코드 보기
          </button>

          <button
            onClick={handleSaveScenario}
            className={`btn ${isSaved ? 'btn-success' : 'btn-primary'}`}
            style={{ fontSize: '0.72rem', padding: '4px 12px' }}
          >
            <Save size={12} /> {isSaved ? '저장됨' : '시나리오 저장'}
          </button>
        </div>
      </div>

      {/* ── Playwright 공식 기술문서 팝업 모달 ───────────────────────── */}
      {showDocsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #10b981',
            borderRadius: '10px',
            width: '860px',
            maxWidth: '95vw',
            maxHeight: '88vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              borderBottom: '1px solid #334155',
              backgroundColor: '#1e293b'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={16} style={{ color: '#10b981' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                  📖 Microsoft Playwright 공식 기술문서 및 API 가이드
                </span>
              </div>
              <button
                onClick={() => setShowDocsModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  padding: '0 4px'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }} className="grid-scrollbar">
              <p style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '12px' }}>
                각 링크를 클릭하면 Microsoft 공식 기술 문서 페이지로 즉시 이동합니다.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  {
                    title: '📘 Playwright .NET (C#) 시작 가이드',
                    desc: 'C# .NET 환경에서의 Playwright 기본 설치, 브라우저 기동 및 비동기 코드 구조',
                    url: 'https://playwright.dev/dotnet/docs/intro',
                    badge: '시작가이드'
                  },
                  {
                    title: '🎯 Locators (요소 탐색 & 스마트 선택자)',
                    desc: '텍스트, CSS, XPath, 역할(Role) 기반의 스마트 요소 탐색 및 체이닝 기법',
                    url: 'https://playwright.dev/dotnet/docs/locators',
                    badge: '객체탐색'
                  },
                  {
                    title: '⚡ Auto-waiting (지능형 0ms 자동 대기)',
                    desc: 'Thread.Sleep 없이 요소의 가시성, 활성화, 애니메이션 완료를 자동 감지하는 메커니즘',
                    url: 'https://playwright.dev/dotnet/docs/actionability',
                    badge: '속도/안정성'
                  },
                  {
                    title: '🪟 Pages & 다중 창/탭/팝업 제어',
                    desc: '버튼 클릭으로 뜬 신규 팝업 창 추적, 탭 간 포커스 이동 및 창 닫기 API 레퍼런스',
                    url: 'https://playwright.dev/dotnet/docs/pages',
                    badge: '창/팝업'
                  },
                  {
                    title: '🌐 BrowserContext (세션/쿠키/브라우저 격리)',
                    desc: '독립된 다중 브라우저 세션 생성 및 쿠키/로컬스토리지 공유/격리 기법',
                    url: 'https://playwright.dev/dotnet/docs/browser-contexts',
                    badge: '세션격리'
                  },
                  {
                    title: '📥 Downloads (파일 무인 다운로드 자동화)',
                    desc: '확인 팝업 없이 엑셀/PDF 파일을 지정 경로에 비동기 자동 저장하는 방법',
                    url: 'https://playwright.dev/dotnet/docs/downloads',
                    badge: '다운로드'
                  },
                  {
                    title: '⌨️ Input Actions (텍스트 입력 및 키보드/마우스)',
                    desc: 'FillAsync, PressAsync, ClickAsync, DragAndDrop 등 사용자 입력 시뮬레이션',
                    url: 'https://playwright.dev/dotnet/docs/input',
                    badge: '입력/클릭'
                  },
                  {
                    title: '🖼️ Frames (iframe 프레임 자동 탐색 및 전환)',
                    desc: 'FrameLocator를 통한 중첩 iframe 내부 DOM 객체 직접 제어 가이드',
                    url: 'https://playwright.dev/dotnet/docs/frames',
                    badge: '프레임'
                  },
                  {
                    title: '🚨 Dialogs (Alert / Confirm / Prompt 자동 수락)',
                    desc: '웹 브라우저 경고창(Alert)을 감지하고 자동으로 수락/거절하는 이벤트 핸들러',
                    url: 'https://playwright.dev/dotnet/docs/dialogs',
                    badge: '알럿제어'
                  },
                  {
                    title: '🕵️ CDPSession (Chrome DevTools Protocol 연동)',
                    desc: 'WebSocket을 통해 크롬/엣지 브라우저의 내부 CDP 포트에 직통 연결하는 저수준 제어',
                    url: 'https://playwright.dev/dotnet/docs/api/class-cdpsession',
                    badge: 'CDP연동'
                  },
                  {
                    title: '📦 NuGet 공식 패키지 (Microsoft.Playwright)',
                    desc: 'C# .NET 프로젝트에 설치하는 공식 NuGet 패키지 저장소',
                    url: 'https://www.nuget.org/packages/Microsoft.Playwright',
                    badge: 'NuGet'
                  },
                  {
                    title: '🐙 Microsoft Playwright .NET GitHub 공식 저장소',
                    desc: '마이크로소프트 공식 오픈소스 C# Playwright 리포지토리 및 릴리즈 소스코드',
                    url: 'https://github.com/microsoft/playwright-dotnet',
                    badge: 'GitHub'
                  }
                ].map((doc, idx) => (
                  <a
                    key={idx}
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      textDecoration: 'none',
                      color: 'inherit',
                      transition: 'border-color 0.2s, background-color 0.2s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = '#10b981';
                      e.currentTarget.style.backgroundColor = '#1e3a5f';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = '#334155';
                      e.currentTarget.style.backgroundColor = '#1e293b';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f8fafc' }}>
                        {doc.title}
                      </span>
                      <span style={{
                        fontSize: '0.60rem',
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid #10b981',
                        borderRadius: '3px',
                        padding: '1px 5px',
                        color: '#34d399',
                        fontWeight: 600
                      }}>
                        {doc.badge}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.68rem', color: '#94a3b8', margin: 0 }}>
                      {doc.desc}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                      <span style={{ fontSize: '0.62rem', color: '#38bdf8' }}>공식 문서 바로가기</span>
                      <ExternalLink size={10} style={{ color: '#38bdf8' }} />
                    </div>
                  </a>
                ))}
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              padding: '10px 16px',
              borderTop: '1px solid #334155',
              backgroundColor: '#1e293b'
            }}>
              <button
                onClick={() => setShowDocsModal(false)}
                className="btn btn-outline"
                style={{ fontSize: '0.72rem', padding: '5px 14px' }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── C# Playwright 코드 팝업 모달 ────────────────────────────── */}
      {showCodeModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #38bdf8',
            borderRadius: '10px',
            width: '800px',
            maxWidth: '95vw',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              borderBottom: '1px solid #334155',
              backgroundColor: '#1e293b'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileCode2 size={16} style={{ color: '#38bdf8' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                  🎭 Microsoft.Playwright C# (.NET 8/9) 자동 생성 코드
                </span>
              </div>
              <button
                onClick={() => setShowCodeModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  padding: '0 4px'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '12px 16px', flex: 1, overflowY: 'auto' }}>
              <p style={{ fontSize: '0.70rem', color: '#94a3b8', marginBottom: '8px' }}>
                이 코드는 현재 설계된 RPA 시나리오를 바탕으로 Playwright C# 코드로 실시간 컴파일된 결과물입니다. 에이전트에 그대로 붙여넣어 실행할 수 있습니다.
              </p>
              <textarea
                readOnly
                value={generatePlaywrightCSharpCode(scenario)}
                style={{
                  width: '100%',
                  height: '420px',
                  backgroundColor: '#020617',
                  border: '1px solid #1e293b',
                  borderRadius: '6px',
                  padding: '12px',
                  color: '#38bdf8',
                  fontFamily: 'Consolas, monospace',
                  fontSize: '0.75rem',
                  lineHeight: '1.4',
                  resize: 'none'
                }}
              />
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
              padding: '10px 16px',
              borderTop: '1px solid #334155',
              backgroundColor: '#1e293b'
            }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatePlaywrightCSharpCode(scenario));
                  alert('C# Playwright 코드가 클립보드에 복사되었습니다!');
                }}
                className="btn btn-primary"
                style={{ fontSize: '0.72rem', padding: '5px 14px' }}
              >
                📋 코드 클립보드 복사
              </button>
              <button
                onClick={() => setShowCodeModal(false)}
                className="btn btn-outline"
                style={{ fontSize: '0.72rem', padding: '5px 14px' }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── [2] 3분할 워크스페이스 (260px | 1fr | 460px) ─────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '260px minmax(360px, 1fr) 460px',
        gap: '8px',
        alignItems: 'stretch',
        width: '100%',
        minHeight: '560px'
      }}>
        {/* ── [1/3] 좌측 액션 도구 상자 & 변수 관리 섹션 ───────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
          {/* 액션 추가 도구함 */}
          <div style={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '8px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {/* 1. 🌐 웹 브라우저 액션 (Playwright) - 접고 펼치기 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div
                onClick={() => setIsWebOpen(prev => !prev)}
                style={{
                  fontSize: '0.70rem',
                  fontWeight: 700,
                  color: '#38bdf8',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  userSelect: 'none',
                  padding: '2px 0'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Globe size={12} /> 🌐 웹 브라우저 (Playwright)
                </div>
                {isWebOpen ? <ChevronDown size={13} style={{ color: '#94a3b8' }} /> : <ChevronRight size={13} style={{ color: '#94a3b8' }} />}
              </div>

              {isWebOpen && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px', marginTop: '2px' }}>
                  <button onClick={() => handleAddStep('NAVIGATE')} className="btn btn-outline" style={{ fontSize: '0.65rem', padding: '3px 4px' }}>
                    🌐 URL 이동
                  </button>
                  <button onClick={() => handleAddStep('MANIPULATE_OBJECT')} className="btn btn-primary" style={{ fontSize: '0.65rem', padding: '3px 4px', backgroundColor: '#0284c7', borderColor: '#38bdf8', color: '#fff', fontWeight: 700 }}>
                    🎯 객체 조작
                  </button>
                  <button onClick={() => handleAddStep('SWITCH_WINDOW')} className="btn btn-outline" style={{ fontSize: '0.65rem', padding: '3px 4px', borderColor: '#38bdf8', color: '#7dd3fc' }}>
                    🪟 창 전환
                  </button>
                  <button onClick={() => handleAddStep('CLOSE_WINDOW')} className="btn btn-outline" style={{ fontSize: '0.65rem', padding: '3px 4px', borderColor: '#f43f5e', color: '#fda4af' }}>
                    ❌ 창 닫기
                  </button>
                  <button onClick={() => handleAddStep('SWITCH_FRAME')} className="btn btn-outline" style={{ fontSize: '0.65rem', padding: '3px 4px' }}>
                    🖼️ 프레임 전환
                  </button>
                  <button onClick={() => handleAddStep('WAIT_ELEMENT')} className="btn btn-outline" style={{ fontSize: '0.65rem', padding: '3px 4px' }}>
                    ⏳ 요소 대기
                  </button>
                  <button onClick={() => handleAddStep('INPUT_TEXT')} className="btn btn-outline" style={{ fontSize: '0.65rem', padding: '3px 4px' }}>
                    ⌨️ 텍스트 입력
                  </button>
                  <button onClick={() => handleAddStep('CLICK')} className="btn btn-outline" style={{ fontSize: '0.65rem', padding: '3px 4px' }}>
                    🖱️ 버튼 클릭
                  </button>
                  <button onClick={() => handleAddStep('HANDLE_ALERT')} className="btn btn-outline" style={{ fontSize: '0.65rem', padding: '3px 4px', gridColumn: 'span 2' }}>
                    🚨 알럿 수락
                  </button>
                </div>
              )}
            </div>

            {/* 2. 🖥️ 윈도우 데스크톱 액션 (FlaUI & Win32 KVM) - 접고 펼치기 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid #334155', paddingTop: '6px' }}>
              <div
                onClick={() => setIsDesktopOpen(prev => !prev)}
                style={{
                  fontSize: '0.70rem',
                  fontWeight: 700,
                  color: '#a78bfa',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  userSelect: 'none',
                  padding: '2px 0'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Monitor size={12} /> 🖥️ 데스크톱 윈도우 (FlaUI)
                </div>
                {isDesktopOpen ? <ChevronDown size={13} style={{ color: '#94a3b8' }} /> : <ChevronRight size={13} style={{ color: '#94a3b8' }} />}
              </div>

              {isDesktopOpen && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '3px', marginTop: '2px' }}>
                  <button onClick={() => handleAddStep('FIND_WINDOW')} className="btn btn-outline" style={{ fontSize: '0.65rem', padding: '3px 6px', borderColor: '#8b5cf6', color: '#c4b5fd', textAlign: 'left' }}>
                    🪟 윈도우 창 찾기 / 포커스 (FIND_WINDOW)
                  </button>
                  <button onClick={() => handleAddStep('UIA_CONTROL')} className="btn btn-outline" style={{ fontSize: '0.65rem', padding: '3px 6px', borderColor: '#a855f7', color: '#e9d5ff', textAlign: 'left' }}>
                    🎛️ UIA 컨트롤 조작 (UIA_CONTROL)
                  </button>
                  <button onClick={() => handleAddStep('KVM_INPUT')} className="btn btn-outline" style={{ fontSize: '0.65rem', padding: '3px 6px', borderColor: '#ec4899', color: '#fbcfe8', textAlign: 'left' }}>
                    🖱️ OS 마우스/키보드 (KVM_INPUT)
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 🔴 [변수 관리] 섹션 - 접고 펼치기 */}
          <div style={{
            backgroundColor: '#1e293b',
            border: '1px solid #38bdf8',
            borderRadius: '8px',
            padding: '8px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            flex: isVariablesOpen ? 1 : 'none',
            maxHeight: isVariablesOpen ? '440px' : 'auto',
            overflowY: isVariablesOpen ? 'auto' : 'hidden'
          }} className="grid-scrollbar">
            <div
              onClick={() => setIsVariablesOpen(prev => !prev)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: isVariablesOpen ? '1px solid #334155' : 'none',
                paddingBottom: isVariablesOpen ? '4px' : '0',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Variable size={13} style={{ color: '#38bdf8' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f8fafc' }}>
                  변수 관리
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {isVariablesOpen && <span style={{ fontSize: '0.60rem', color: '#94a3b8' }}>클릭 시 삽입</span>}
                {isVariablesOpen ? <ChevronDown size={13} style={{ color: '#94a3b8' }} /> : <ChevronRight size={13} style={{ color: '#94a3b8' }} />}
              </div>
            </div>

            {isVariablesOpen && (
              <>
                {/* 그룹 1: 12대 스키마 데이터 변수 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#38bdf8' }}>
                    📁 12대 정규 스키마 변수
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                    {DEFAULT_SCHEMA_DEF.fields.map(f => (
                      <span
                        key={f.id}
                        onClick={() => {
                          if (selectedStep) {
                            if (selectedStep.action === 'INPUT_TEXT') {
                              handleStepPropChange('valueTemplate', `${selectedStep.valueTemplate || ''}{{${f.name}}}`);
                            } else if (selectedStep.action === 'MANIPULATE_OBJECT') {
                              handleStepPropChange('attrValue', `${selectedStep.attrValue || ''}{{${f.name}}}`);
                            } else if (selectedStep.action === 'UIA_CONTROL') {
                              handleStepPropChange('attrValue', `${selectedStep.attrValue || ''}{{${f.name}}}`);
                            } else if (selectedStep.action === 'KVM_INPUT') {
                              handleStepPropChange('text', `${selectedStep.text || ''}{{${f.name}}}`);
                            }
                          }
                        }}
                        style={{
                          fontSize: '0.65rem',
                          backgroundColor: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '4px',
                          padding: '1px 5px',
                          color: '#7dd3fc',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                        title={`클릭하여 {{${f.name}}} 삽입`}
                      >
                        {`{{${f.name}}}`}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 그룹 2: 시스템 내장 변수 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#fbbf24' }}>
                    ⚙️ 시스템 내장 변수
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                    {['현재일자', '현재시간', '루프인덱스', '총건수', '실행자'].map(v => (
                      <span
                        key={v}
                        onClick={() => {
                          if (selectedStep) {
                            if (selectedStep.action === 'INPUT_TEXT') {
                              handleStepPropChange('valueTemplate', `${selectedStep.valueTemplate || ''}{{${v}}}`);
                            } else if (selectedStep.action === 'MANIPULATE_OBJECT') {
                              handleStepPropChange('attrValue', `${selectedStep.attrValue || ''}{{${v}}}`);
                            } else if (selectedStep.action === 'UIA_CONTROL') {
                              handleStepPropChange('attrValue', `${selectedStep.attrValue || ''}{{${v}}}`);
                            } else if (selectedStep.action === 'KVM_INPUT') {
                              handleStepPropChange('text', `${selectedStep.text || ''}{{${v}}}`);
                            }
                          }
                        }}
                        style={{
                          fontSize: '0.65rem',
                          backgroundColor: '#0f172a',
                          border: '1px solid #b45309',
                          borderRadius: '4px',
                          padding: '1px 5px',
                          color: '#fde047',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                        title={`클릭하여 {{${v}}} 삽입`}
                      >
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 그룹 3: 사용자 정의 / 추출 변수 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#34d399' }}>
                    🏷️ 추출 / 임시 변수
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                    {['추출_값', '임시결과', 'API응답', '등록상태'].map(v => (
                      <span
                        key={v}
                        onClick={() => {
                          if (selectedStep) {
                            if (selectedStep.action === 'INPUT_TEXT') {
                              handleStepPropChange('valueTemplate', `${selectedStep.valueTemplate || ''}{{${v}}}`);
                            } else if (selectedStep.action === 'MANIPULATE_OBJECT') {
                              handleStepPropChange('attrValue', `${selectedStep.attrValue || ''}{{${v}}}`);
                            } else if (selectedStep.action === 'UIA_CONTROL') {
                              handleStepPropChange('attrValue', `${selectedStep.attrValue || ''}{{${v}}}`);
                            } else if (selectedStep.action === 'KVM_INPUT') {
                              handleStepPropChange('text', `${selectedStep.text || ''}{{${v}}}`);
                            }
                          }
                        }}
                        style={{
                          fontSize: '0.65rem',
                          backgroundColor: '#0f172a',
                          border: '1px solid #065f46',
                          borderRadius: '4px',
                          padding: '1px 5px',
                          color: '#6ee7b7',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                        title={`클릭하여 {{${v}}} 삽입`}
                      >
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── [2/3] 중앙 스텝 체인 타임라인 ──────────────────────────── */}
        <div style={{
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f8fafc' }}>
              시나리오 실행 단계 ({allSteps.length} Steps)
            </span>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
              브라우저: {scenario.targetBrowser}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
            {allSteps.map((st, idx) => {
              const isSelected = st.id === selectedStepId;
              return (
                <div
                  key={st.id}
                  onClick={() => setSelectedStepId(st.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    backgroundColor: isSelected ? '#334155' : '#0f172a',
                    border: `1px solid ${isSelected ? '#38bdf8' : '#1e293b'}`,
                    cursor: 'pointer',
                    marginLeft: st.isSubStep ? '20px' : '0px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '0.65rem',
                      color: isSelected ? '#000' : '#38bdf8',
                      backgroundColor: isSelected ? '#38bdf8' : '#1e293b',
                      padding: '1px 5px',
                      borderRadius: '3px',
                      fontWeight: 700
                    }}>
                      {idx + 1}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f8fafc' }}>
                      [{st.action}] {st.name}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {st.url || (st.action === 'SWITCH_WINDOW' ? `창: ${st.matchType === 'LAST_OPENED' ? '최근 팝업' : st.targetAlias || st.matchPattern}` : '') || (st.action === 'CLOSE_WINDOW' ? `닫기 ➔ 복귀:${st.returnToAlias}` : '') || st.selector || st.valueTemplate || st.alertAction || ''}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteStep(st.id);
                      }}
                      style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                      title="스텝 삭제"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── [3/3] 우측 선택 스텝 정밀 속성 패널 ────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
          {selectedStep ? (
            <div style={{
              backgroundColor: '#1e293b',
              border: '1px solid #38bdf8',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8' }}>
                  [{selectedStep.action}] 속성 설정
                </span>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>ID: {selectedStep.id}</span>
              </div>

              {/* 스텝 명칭 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>스텝 명칭</label>
                <input
                  type="text"
                  value={selectedStep.name || ''}
                  onChange={e => handleStepPropChange('name', e.target.value)}
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    color: '#f8fafc',
                    fontSize: '0.75rem'
                  }}
                />
              </div>

              {/* ── [1] NAVIGATE 액션: URL & 브라우저 기동/세션/UBUS 실전 옵션 ── */}
              {selectedStep.action === 'NAVIGATE' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* ⚡ UBUS 퀵 프리셋 버튼 */}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        handleStepPropChange('pageLoadStrategy', 'Eager');
                        handleStepPropChange('blockImages', true);
                        handleStepPropChange('disableThrottling', true);
                        handleStepPropChange('disableGpu', true);
                        handleStepPropChange('autoDownload', true);
                        handleStepPropChange('disableFirstRun', true);
                        handleStepPropChange('ignoreCertErrors', true);
                        handleStepPropChange('disableBlinkFeatures', true);
                      }}
                      className="btn btn-outline"
                      style={{
                        flex: 1,
                        fontSize: '0.68rem',
                        padding: '4px',
                        borderColor: '#38bdf8',
                        color: '#38bdf8',
                        backgroundColor: 'rgba(56, 189, 248, 0.1)',
                        fontWeight: 700
                      }}
                    >
                      ⚡ UBUS 초고속 ERP 모드
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleStepPropChange('pageLoadStrategy', 'Normal');
                        handleStepPropChange('blockImages', false);
                        handleStepPropChange('disableThrottling', false);
                        handleStepPropChange('disableGpu', false);
                        handleStepPropChange('autoDownload', false);
                        handleStepPropChange('disableFirstRun', false);
                      }}
                      className="btn btn-outline"
                      style={{
                        flex: 1,
                        fontSize: '0.68rem',
                        padding: '4px',
                        borderColor: '#64748b',
                        color: '#94a3b8'
                      }}
                    >
                      🌐 표준 웹 모드
                    </button>
                  </div>

                  {/* URL 입력 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>접속 URL</label>
                    <input
                      type="text"
                      value={selectedStep.url || ''}
                      onChange={e => handleStepPropChange('url', e.target.value)}
                      placeholder="https://erp.company.com/..."
                      style={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #475569',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        color: '#f8fafc',
                        fontSize: '0.75rem'
                      }}
                    />
                  </div>

                  {/* 대상 브라우저 & 실행 모드 */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>대상 브라우저</label>
                      <select
                        value={selectedStep.targetBrowser || 'Edge'}
                        onChange={e => handleStepPropChange('targetBrowser', e.target.value)}
                        style={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #475569',
                          borderRadius: '4px',
                          padding: '4px 6px',
                          color: '#38bdf8',
                          fontSize: '0.72rem',
                          fontWeight: 600
                        }}
                      >
                        <option value="Edge">🌐 Microsoft Edge (권장)</option>
                        <option value="Chrome">🌐 Google Chrome</option>
                        <option value="Whale">🌐 Naver Whale</option>
                        <option value="Default">💻 OS 기본 브라우저</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>실행/연결 모드</label>
                      <select
                        value={selectedStep.launchMode || 'ATTACH_EXISTING'}
                        onChange={e => handleStepPropChange('launchMode', e.target.value)}
                        style={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #475569',
                          borderRadius: '4px',
                          padding: '4px 6px',
                          color: '#f8fafc',
                          fontSize: '0.72rem'
                        }}
                      >
                        <option value="ATTACH_EXISTING">기존 열린 브라우저 연결 (로그인 유지)</option>
                        <option value="LAUNCH_NEW">새 브라우저 창 기동 (독립 실행)</option>
                        <option value="HEADLESS">무화면 백그라운드 (초고속)</option>
                      </select>
                    </div>
                  </div>

                  {/* 창 크기 & 창 별칭 */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>창 크기 / 화면 배치</label>
                      <select
                        value={selectedStep.windowSize || 'MAXIMIZED'}
                        onChange={e => handleStepPropChange('windowSize', e.target.value)}
                        style={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #475569',
                          borderRadius: '4px',
                          padding: '4px 6px',
                          color: '#f8fafc',
                          fontSize: '0.72rem'
                        }}
                      >
                        <option value="MAXIMIZED">전체화면 최대화 (Maximized)</option>
                        <option value="DOCK_RIGHT">우측 50% 분할 도킹 (화면 공유)</option>
                        <option value="DOCK_LEFT">좌측 50% 분할 도킹 (화면 공유)</option>
                        <option value="1920x1080">FHD (1920 × 1080)</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>창 식별 별칭 (Window Alias)</label>
                      <input
                        type="text"
                        value={selectedStep.windowAlias || 'main'}
                        onChange={e => handleStepPropChange('windowAlias', e.target.value)}
                        placeholder="main"
                        style={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #38bdf8',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          color: '#38bdf8',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}
                      />
                    </div>
                  </div>

                  {/* ⚡ UBUS 초고속 가속 & 로딩 전략 */}
                  <div style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #0284c7',
                    borderRadius: '6px',
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#38bdf8' }}>
                        ⚡ UBUS 실전 속도 최적화 (Speed Engine)
                      </label>
                      <span style={{ fontSize: '0.62rem', color: '#7dd3fc' }}>속도 3~5배 가속</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <label style={{ fontSize: '0.65rem', color: '#94a3b8' }}>페이지 로딩 전략 (PageLoadStrategy)</label>
                      <select
                        value={selectedStep.pageLoadStrategy || 'Eager'}
                        onChange={e => handleStepPropChange('pageLoadStrategy', e.target.value)}
                        style={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #38bdf8',
                          borderRadius: '4px',
                          padding: '3px 6px',
                          color: '#38bdf8',
                          fontSize: '0.70rem',
                          fontWeight: 700
                        }}
                      >
                        <option value="Eager">⚡ Eager: DOMContentLoaded 즉시 진행 (권장 · 3배 가속)</option>
                        <option value="None">🚀 None: 리소스 대기 없이 즉시 진행 (최대 속도)</option>
                        <option value="Normal">🐢 Normal: 모든 무거운 리소스/광고 완료 대기</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.68rem', color: '#cbd5e1' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedStep.blockImages !== false}
                          onChange={e => handleStepPropChange('blockImages', e.target.checked)}
                        />
                        이미지 로드 차단 (images=2) - 대역폭 절감 & 렌더링 5배 가속
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedStep.disableThrottling !== false}
                          onChange={e => handleStepPropChange('disableThrottling', e.target.checked)}
                        />
                        백그라운드 감속 방지 (--disable-background-timer-throttling) - 창 가려져도 풀스피드
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedStep.disableGpu !== false}
                          onChange={e => handleStepPropChange('disableGpu', e.target.checked)}
                        />
                        불필요 GPU 부하 차단 (--disable-gpu, --disable-software-rasterizer)
                      </label>
                    </div>
                  </div>

                  {/* 📥 무인 다운로드 자동화 */}
                  <div style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#38bdf8' }}>
                      📥 무인 다운로드 자동화 (Download Preferences)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', color: '#cbd5e1', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectedStep.autoDownload !== false}
                        onChange={e => handleStepPropChange('autoDownload', e.target.checked)}
                      />
                      다운로드 확인창/위치선택 팝업 끄기 (download.prompt_for_download=false)
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                      <label style={{ fontSize: '0.65rem', color: '#94a3b8' }}>기본 다운로드 저장 폴더 (선택)</label>
                      <input
                        type="text"
                        value={selectedStep.downloadPath || ''}
                        onChange={e => handleStepPropChange('downloadPath', e.target.value)}
                        placeholder="예: C:\DragonRPA\Downloads"
                        style={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #475569',
                          borderRadius: '4px',
                          padding: '3px 6px',
                          color: '#f8fafc',
                          fontSize: '0.70rem'
                        }}
                      />
                    </div>
                  </div>

                  {/* 🛡️ 보안 및 방해 UI 차단 */}
                  <div style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#38bdf8' }}>
                      🛡️ 브라우저 보안 및 방해 UI 차단
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.68rem', color: '#cbd5e1' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedStep.ignoreCertErrors !== false}
                          onChange={e => handleStepPropChange('ignoreCertErrors', e.target.checked)}
                        />
                        사내 사설 SSL/인증서 오류 무시 (--ignore-cert-errors)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedStep.disableBlinkFeatures !== false}
                          onChange={e => handleStepPropChange('disableBlinkFeatures', e.target.checked)}
                        />
                        봇 탐지 방지 플래그 (--disable-blink-features)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedStep.disableFirstRun !== false}
                          onChange={e => handleStepPropChange('disableFirstRun', e.target.checked)}
                        />
                        첫 실행 마법사 및 모바일 프로모션 차단 (--no-first-run)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={!!selectedStep.isIncognito}
                          onChange={e => handleStepPropChange('isIncognito', e.target.checked)}
                        />
                        InPrivate / 시크릿 모드 (세션 격리)
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* ── [2] SWITCH_WINDOW 액션: 창/탭 전환 ── */}
              {selectedStep.action === 'SWITCH_WINDOW' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>창 전환 기준 (Match Type)</label>
                    <select
                      value={selectedStep.matchType || 'LAST_OPENED'}
                      onChange={e => handleStepPropChange('matchType', e.target.value)}
                      style={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #38bdf8',
                        borderRadius: '4px',
                        padding: '4px 6px',
                        color: '#38bdf8',
                        fontSize: '0.72rem',
                        fontWeight: 700
                      }}
                    >
                      <option value="LAST_OPENED">⚡ 가장 최근에 열린 새 팝업 창</option>
                      <option value="ALIAS">🏷️ 지정한 창 별칭 (Alias)</option>
                      <option value="TITLE_CONTAINS">📄 창 제목(Title)에 특정 텍스트 포함</option>
                      <option value="URL_CONTAINS">🌐 URL 주소에 특정 경로 포함</option>
                      <option value="MAIN">🏠 메인 창 ('main')으로 복귀</option>
                    </select>
                  </div>

                  {selectedStep.matchType === 'ALIAS' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>전환할 대상 창 별칭</label>
                      <input
                        type="text"
                        value={selectedStep.targetAlias || 'main'}
                        onChange={e => handleStepPropChange('targetAlias', e.target.value)}
                        placeholder="예: popup_inbound, main"
                        style={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #475569',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          color: '#f8fafc',
                          fontSize: '0.75rem'
                        }}
                      />
                    </div>
                  )}

                  {(selectedStep.matchType === 'TITLE_CONTAINS' || selectedStep.matchType === 'URL_CONTAINS') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                        {selectedStep.matchType === 'TITLE_CONTAINS' ? '포함될 창 제목' : '포함될 URL 경로'}
                      </label>
                      <input
                        type="text"
                        value={selectedStep.matchPattern || ''}
                        onChange={e => handleStepPropChange('matchPattern', e.target.value)}
                        placeholder={selectedStep.matchType === 'TITLE_CONTAINS' ? "예: 입고 등록, 자산 관리" : "예: /asset/inbound"}
                        style={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #475569',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          color: '#f8fafc',
                          fontSize: '0.75rem'
                        }}
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>창 감지 대기 시간 (ms)</label>
                    <input
                      type="number"
                      value={selectedStep.timeoutMs || 5000}
                      onChange={e => handleStepPropChange('timeoutMs', Number(e.target.value))}
                      style={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #475569',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        color: '#f8fafc',
                        fontSize: '0.75rem'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* ── [3] CLOSE_WINDOW 액션: 창 닫기 ── */}
              {selectedStep.action === 'CLOSE_WINDOW' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>닫을 창 별칭 (비워둘 시 현재 활성 창)</label>
                    <input
                      type="text"
                      value={selectedStep.targetAlias || ''}
                      onChange={e => handleStepPropChange('targetAlias', e.target.value)}
                      placeholder="현재 활성 창 닫기"
                      style={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #475569',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        color: '#f8fafc',
                        fontSize: '0.75rem'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>닫은 후 자동 복귀할 창 별칭</label>
                    <input
                      type="text"
                      value={selectedStep.returnToAlias || 'main'}
                      onChange={e => handleStepPropChange('returnToAlias', e.target.value)}
                      placeholder="main"
                      style={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #38bdf8',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        color: '#38bdf8',
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}
                    />
                  </div>
                </div>
              )}

              {/* ── [4] MANIPULATE_OBJECT 액션: 객체 탐색 및 속성/메서드/값 조작 ── */}
              {selectedStep.action === 'MANIPULATE_OBJECT' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* 1. 타겟 요소 선택자 & 인스펙터 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700 }}>
                        타겟 Object 선택자 (XPath / ID / CSS)
                      </label>
                      <button
                        type="button"
                        onClick={handleInspectElement}
                        disabled={isInspecting}
                        className="btn btn-outline"
                        style={{ fontSize: '0.65rem', padding: '2px 6px', borderColor: '#38bdf8', color: '#7dd3fc', display: 'flex', alignItems: 'center', gap: '3px' }}
                      >
                        <Crosshair size={11} /> {isInspecting ? '객체 분석 중...' : '🔍 객체 탐색 및 스펙 분석'}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={selectedStep.selector || ''}
                      onChange={e => handleStepPropChange('selector', e.target.value)}
                      placeholder="//input[@id='assetNo'] 또는 #assetNo"
                      style={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #475569',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        color: '#f8fafc',
                        fontSize: '0.75rem'
                      }}
                    />
                  </div>

                  {/* 2. 객체 조작 유형 선택 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: 700 }}>
                      객체 조작 유형 (Operation Type)
                    </label>
                    <select
                      value={selectedStep.operationType || 'SET_VALUE'}
                      onChange={e => handleStepPropChange('operationType', e.target.value)}
                      style={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #38bdf8',
                        borderRadius: '4px',
                        padding: '4px 6px',
                        color: '#38bdf8',
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}
                    >
                      <option value="SET_VALUE">✏️ 값 / 텍스트 강제 설정 (.value / .innerText)</option>
                      <option value="GET_VALUE">📥 값 추출 및 변수에 저장 (.value / .innerText ➔ 변수)</option>
                      <option value="CALL_METHOD">⚡ JavaScript 메서드 / 함수 호출 (.click(), .focus(), .scrollIntoView())</option>
                      <option value="SET_ATTRIBUTE">🏷️ HTML 속성 변경 (disabled, readOnly, checked, src, href)</option>
                      <option value="SET_STYLE">🎨 CSS 스타일 강제 조작 (display: block, visibility: visible)</option>
                      <option value="CLASS_TOGGLE">🔄 CSS 클래스 추가 / 제거 (classList.add / remove)</option>
                    </select>
                  </div>

                  {/* 3-1: SET_VALUE 설정 */}
                  {selectedStep.operationType === 'SET_VALUE' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>설정할 값 / 텍스트 템플릿</label>
                      <input
                        type="text"
                        value={selectedStep.attrValue || ''}
                        onChange={e => handleStepPropChange('attrValue', e.target.value)}
                        placeholder="{{자산번호}}"
                        style={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #475569',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          color: '#f8fafc',
                          fontSize: '0.75rem'
                        }}
                      />
                    </div>
                  )}

                  {/* 3-2: GET_VALUE 설정 */}
                  {selectedStep.operationType === 'GET_VALUE' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>추출할 속성/항목</label>
                        <select
                          value={selectedStep.attrName || 'innerText'}
                          onChange={e => handleStepPropChange('attrName', e.target.value)}
                          style={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #475569',
                            borderRadius: '4px',
                            padding: '4px 6px',
                            color: '#f8fafc',
                            fontSize: '0.72rem'
                          }}
                        >
                          <option value="innerText">innerText (화면 표시 텍스트)</option>
                          <option value="value">value (입력창 값)</option>
                          <option value="innerHTML">innerHTML (HTML 원문)</option>
                          <option value="src">src (이미지/스크립트 경로)</option>
                          <option value="href">href (링크 주소)</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>저장할 변수명</label>
                        <input
                          type="text"
                          value={selectedStep.saveToVariable || '추출_값'}
                          onChange={e => handleStepPropChange('saveToVariable', e.target.value)}
                          placeholder="예: 추출_자산번호"
                          style={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #34d399',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            color: '#34d399',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* 3-3: CALL_METHOD 설정 */}
                  {selectedStep.operationType === 'CALL_METHOD' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>실행할 메서드 (Method Call)</label>
                      <select
                        value={selectedStep.methodName || 'click()'}
                        onChange={e => handleStepPropChange('methodName', e.target.value)}
                        style={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #475569',
                          borderRadius: '4px',
                          padding: '4px 6px',
                          color: '#38bdf8',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}
                      >
                        <option value="click()">.click() - 강제 클릭 실행</option>
                        <option value="focus()">.focus() - 포커스 이동</option>
                        <option value="blur()">.blur() - 포커스 해제</option>
                        <option value="select()">.select() - 텍스트 전체 블록 지정</option>
                        <option value="scrollIntoView({behavior:'smooth',block:'center'})">.scrollIntoView() - 화면 중앙 스크롤</option>
                        <option value="dispatchEvent(new Event('change'))">.dispatchEvent('change') - 변경 이벤트 강제 트리거</option>
                        <option value="submit()">.submit() - 폼 즉시 전송</option>
                      </select>
                    </div>
                  )}

                  {/* 3-4: SET_ATTRIBUTE 설정 */}
                  {selectedStep.operationType === 'SET_ATTRIBUTE' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>속성명 (Attribute)</label>
                        <input
                          type="text"
                          value={selectedStep.attrName || 'disabled'}
                          onChange={e => handleStepPropChange('attrName', e.target.value)}
                          placeholder="예: disabled, readOnly"
                          style={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #475569',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            color: '#f8fafc',
                            fontSize: '0.75rem'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>속성값 (Value)</label>
                        <input
                          type="text"
                          value={selectedStep.attrValue || 'false'}
                          onChange={e => handleStepPropChange('attrValue', e.target.value)}
                          placeholder="예: false, true, none"
                          style={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #475569',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            color: '#f8fafc',
                            fontSize: '0.75rem'
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* 3-5: SET_STYLE 설정 */}
                  {selectedStep.operationType === 'SET_STYLE' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>CSS 스타일명</label>
                        <input
                          type="text"
                          value={selectedStep.attrName || 'display'}
                          onChange={e => handleStepPropChange('attrName', e.target.value)}
                          placeholder="예: display, visibility, opacity"
                          style={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #475569',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            color: '#f8fafc',
                            fontSize: '0.75rem'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>스타일 값</label>
                        <input
                          type="text"
                          value={selectedStep.attrValue || 'block'}
                          onChange={e => handleStepPropChange('attrValue', e.target.value)}
                          placeholder="예: block, visible, 1"
                          style={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #475569',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            color: '#f8fafc',
                            fontSize: '0.75rem'
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* 3-6: CLASS_TOGGLE 설정 */}
                  {selectedStep.operationType === 'CLASS_TOGGLE' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>동작</label>
                        <select
                          value={selectedStep.attrName || 'add'}
                          onChange={e => handleStepPropChange('attrName', e.target.value)}
                          style={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #475569',
                            borderRadius: '4px',
                            padding: '4px 6px',
                            color: '#f8fafc',
                            fontSize: '0.72rem'
                          }}
                        >
                          <option value="add">클래스 추가 (.classList.add)</option>
                          <option value="remove">클래스 제거 (.classList.remove)</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>클래스명</label>
                        <input
                          type="text"
                          value={selectedStep.attrValue || 'active'}
                          onChange={e => handleStepPropChange('attrValue', e.target.value)}
                          placeholder="예: active, show, selected"
                          style={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #475569',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            color: '#f8fafc',
                            fontSize: '0.75rem'
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* 비상 대안 */}
                  <div style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#f59e0b' }}>
                      비상 대안 설정 (CSS/XPath 미검출 시)
                    </label>
                    <select
                      value={selectedStep.fallbackType || 'JS_INJECT'}
                      onChange={e => handleStepPropChange('fallbackType', e.target.value)}
                      style={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '4px',
                        padding: '4px 6px',
                        color: '#f8fafc',
                        fontSize: '0.72rem'
                      }}
                    >
                      <option value="JS_INJECT">⚡ JavaScript 강제 주입 실행 (권장)</option>
                      <option value="PIXEL_MATCH">🖼️ 0MB 초경량 픽셀 매칭 (이미지 탐색)</option>
                      <option value="KEYBOARD_TAB">⌨️ 키보드 탭(Tab) 시퀀스 이동</option>
                      <option value="NONE">기본 실패 (예외 중단)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* ── [5] FIND_WINDOW 액션: 윈도우 창 찾기 및 포커스 ── */}
              {selectedStep.action === 'FIND_WINDOW' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label style={{ fontSize: '0.68rem', color: '#a78bfa', fontWeight: 700 }}>윈도우 창 제목 (Window Title)</label>
                    <input
                      type="text"
                      value={selectedStep.windowTitle || ''}
                      onChange={e => handleStepPropChange('windowTitle', e.target.value)}
                      placeholder="예: 사내 ERP, 자산관리 시스템"
                      style={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #8b5cf6',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        color: '#f8fafc',
                        fontSize: '0.75rem'
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>실행 프로세스명 (선택)</label>
                      <input
                        type="text"
                        value={selectedStep.processName || ''}
                        onChange={e => handleStepPropChange('processName', e.target.value)}
                        placeholder="예: ErpClient.exe"
                        style={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #475569',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          color: '#f8fafc',
                          fontSize: '0.75rem'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>창 화면 상태</label>
                      <select
                        value={selectedStep.windowState || 'MAXIMIZED'}
                        onChange={e => handleStepPropChange('windowState', e.target.value)}
                        style={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #475569',
                          borderRadius: '4px',
                          padding: '4px 6px',
                          color: '#f8fafc',
                          fontSize: '0.72rem'
                        }}
                      >
                        <option value="MAXIMIZED">전체화면 최대화 (Maximized)</option>
                        <option value="NORMAL">일반 크기 복원 (Normal)</option>
                      </select>
                    </div>
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.70rem', color: '#c4b5fd', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedStep.bringToFront !== false}
                      onChange={e => handleStepPropChange('bringToFront', e.target.checked)}
                    />
                    창을 최상단 전면으로 강제 활성화 (SetForeground)
                  </label>
                </div>
              )}

              {/* ── [6] UIA_CONTROL 액션: 데스크톱 UIA 컨트롤 조작 ── */}
              {selectedStep.action === 'UIA_CONTROL' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <label style={{ fontSize: '0.68rem', color: '#a855f7', fontWeight: 700 }}>AutomationId (권장)</label>
                      <input
                        type="text"
                        value={selectedStep.automationId || ''}
                        onChange={e => handleStepPropChange('automationId', e.target.value)}
                        placeholder="예: txtAssetNo, btnSave"
                        style={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #a855f7',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          color: '#f8fafc',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>컨트롤 Name / 텍스트</label>
                      <input
                        type="text"
                        value={selectedStep.controlName || ''}
                        onChange={e => handleStepPropChange('controlName', e.target.value)}
                        placeholder="예: 저장, 등록"
                        style={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #475569',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          color: '#f8fafc',
                          fontSize: '0.75rem'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>컨트롤 유형</label>
                      <select
                        value={selectedStep.controlType || 'Button'}
                        onChange={e => handleStepPropChange('controlType', e.target.value)}
                        style={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #475569',
                          borderRadius: '4px',
                          padding: '4px 6px',
                          color: '#f8fafc',
                          fontSize: '0.72rem'
                        }}
                      >
                        <option value="Button">버튼 (Button)</option>
                        <option value="TextBox">텍스트박스 (TextBox)</option>
                        <option value="CheckBox">체크박스 (CheckBox)</option>
                        <option value="ComboBox">콤보박스 (ComboBox)</option>
                        <option value="Grid">데이터 그리드 (DataGrid)</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>조작 유형</label>
                      <select
                        value={selectedStep.operationType || 'Click'}
                        onChange={e => handleStepPropChange('operationType', e.target.value)}
                        style={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #475569',
                          borderRadius: '4px',
                          padding: '4px 6px',
                          color: '#38bdf8',
                          fontSize: '0.72rem',
                          fontWeight: 600
                        }}
                      >
                        <option value="Click">클릭 실행 (Invoke / Click)</option>
                        <option value="SetValue">값 입력 (.Text = ...)</option>
                        <option value="GetValue">값 추출 (변수에 저장)</option>
                        <option value="Toggle">체크박스 토글 (Toggle)</option>
                      </select>
                    </div>
                  </div>

                  {selectedStep.operationType === 'SetValue' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>입력할 값 / 변수 템플릿</label>
                      <input
                        type="text"
                        value={selectedStep.attrValue || ''}
                        onChange={e => handleStepPropChange('attrValue', e.target.value)}
                        placeholder="{{자산번호}}"
                        style={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #475569',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          color: '#f8fafc',
                          fontSize: '0.75rem'
                        }}
                      />
                    </div>
                  )}

                  {selectedStep.operationType === 'GetValue' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>저장할 변수명</label>
                      <input
                        type="text"
                        value={selectedStep.saveToVariable || '데스크톱_추출값'}
                        onChange={e => handleStepPropChange('saveToVariable', e.target.value)}
                        placeholder="예: 추출_자산번호"
                        style={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #34d399',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          color: '#34d399',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ── [7] KVM_INPUT 액션: OS 마우스/키보드 (KVMW) ── */}
              {selectedStep.action === 'KVM_INPUT' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label style={{ fontSize: '0.68rem', color: '#ec4899', fontWeight: 700 }}>KVM 하드웨어 조작 유형</label>
                    <select
                      value={selectedStep.kvmType || 'CLICK_COORD'}
                      onChange={e => handleStepPropChange('kvmType', e.target.value)}
                      style={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #ec4899',
                        borderRadius: '4px',
                        padding: '4px 6px',
                        color: '#fbcfe8',
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}
                    >
                      <option value="CLICK_COORD">🖱️ 절대 화면 좌표 클릭 (Mouse Click)</option>
                      <option value="HOTKEY">⌨️ 시스템 단축키 입력 (Ctrl+V, Enter, Tab)</option>
                      <option value="TYPE_TEXT">⌨️ 네이티브 키보드 타이핑 (Type String)</option>
                    </select>
                  </div>

                  {selectedStep.kvmType === 'CLICK_COORD' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>X 좌표 (Pixel)</label>
                        <input
                          type="number"
                          value={selectedStep.coordX || 500}
                          onChange={e => handleStepPropChange('coordX', Number(e.target.value))}
                          style={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #475569',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            color: '#f8fafc',
                            fontSize: '0.75rem'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Y 좌표 (Pixel)</label>
                        <input
                          type="number"
                          value={selectedStep.coordY || 300}
                          onChange={e => handleStepPropChange('coordY', Number(e.target.value))}
                          style={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #475569',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            color: '#f8fafc',
                            fontSize: '0.75rem'
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {selectedStep.kvmType === 'HOTKEY' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>단축키 조합</label>
                      <select
                        value={selectedStep.hotKey || 'Ctrl+V'}
                        onChange={e => handleStepPropChange('hotKey', e.target.value)}
                        style={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #475569',
                          borderRadius: '4px',
                          padding: '4px 6px',
                          color: '#f8fafc',
                          fontSize: '0.72rem'
                        }}
                      >
                        <option value="Ctrl+V">Ctrl + V (붙여넣기)</option>
                        <option value="Ctrl+C">Ctrl + C (복사)</option>
                        <option value="Ctrl+A">Ctrl + A (전체선택)</option>
                        <option value="Enter">Enter (엔터)</option>
                        <option value="Tab">Tab (탭 이동)</option>
                        <option value="Esc">Esc (취소/닫기)</option>
                      </select>
                    </div>
                  )}

                  {selectedStep.kvmType === 'TYPE_TEXT' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>타이핑할 텍스트</label>
                      <input
                        type="text"
                        value={selectedStep.text || ''}
                        onChange={e => handleStepPropChange('text', e.target.value)}
                        placeholder="{{자산번호}}"
                        style={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #475569',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          color: '#f8fafc',
                          fontSize: '0.75rem'
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ── [4] SWITCH_FRAME 액션: Frame Selector ── */}
              {selectedStep.action === 'SWITCH_FRAME' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>프레임 식별자 (ID 또는 Name)</label>
                  <input
                    type="text"
                    value={selectedStep.frameSelector || ''}
                    onChange={e => handleStepPropChange('frameSelector', e.target.value)}
                    style={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #475569',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      color: '#f8fafc',
                      fontSize: '0.75rem'
                    }}
                  />
                </div>
              )}

              {/* ── [5] INPUT_TEXT / CLICK / WAIT: Target Selector & Navigator ── */}
              {(selectedStep.action === 'INPUT_TEXT' || selectedStep.action === 'CLICK' || selectedStep.action === 'WAIT_ELEMENT') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>타겟 요소 선택자 (XPath / ID)</label>
                    <button
                      onClick={handleInspectElement}
                      disabled={isInspecting}
                      className="btn btn-outline"
                      style={{ fontSize: '0.65rem', padding: '2px 6px', borderColor: '#38bdf8', color: '#7dd3fc' }}
                    >
                      <Crosshair size={11} /> {isInspecting ? '요소 감지 중...' : '화면에서 요소 집기'}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={selectedStep.selector || ''}
                    onChange={e => handleStepPropChange('selector', e.target.value)}
                    style={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #475569',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      color: '#f8fafc',
                      fontSize: '0.75rem'
                    }}
                  />
                </div>
              )}

              {/* CLICK 액션: 새 팝업창 열림 감지 및 별칭 지정 */}
              {selectedStep.action === 'CLICK' && (
                <div style={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.70rem', color: '#38bdf8', fontWeight: 700, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={!!selectedStep.opensNewWindow}
                      onChange={e => handleStepPropChange('opensNewWindow', e.target.checked)}
                    />
                    클릭 시 새 팝업/창이 열림 (Window Tracking)
                  </label>
                  {selectedStep.opensNewWindow && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '16px' }}>
                      <label style={{ fontSize: '0.65rem', color: '#94a3b8' }}>새로 열릴 창 별칭 (New Window Alias)</label>
                      <input
                        type="text"
                        value={selectedStep.newWindowAlias || 'popup_1'}
                        onChange={e => handleStepPropChange('newWindowAlias', e.target.value)}
                        placeholder="예: popup_inbound"
                        style={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #38bdf8',
                          borderRadius: '4px',
                          padding: '3px 6px',
                          color: '#38bdf8',
                          fontSize: '0.72rem',
                          fontWeight: 700
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* INPUT_TEXT 액션: Value Template */}
              {selectedStep.action === 'INPUT_TEXT' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>입력 텍스트 템플릿</label>
                  <input
                    type="text"
                    value={selectedStep.valueTemplate || ''}
                    onChange={e => handleStepPropChange('valueTemplate', e.target.value)}
                    placeholder="{{자산번호}}"
                    style={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #475569',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      color: '#f8fafc',
                      fontSize: '0.75rem'
                    }}
                  />
                </div>
              )}

              {/* 4대 비상 대안 설정 (Fallback Type) */}
              {(selectedStep.action === 'INPUT_TEXT' || selectedStep.action === 'CLICK') && (
                <div style={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#f59e0b' }}>
                    비상 대안 설정 (CSS 미검출 시)
                  </label>
                  <select
                    value={selectedStep.fallbackType || 'NONE'}
                    onChange={e => handleStepPropChange('fallbackType', e.target.value)}
                    style={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '4px',
                      padding: '4px 6px',
                      color: '#f8fafc',
                      fontSize: '0.72rem'
                    }}
                  >
                    <option value="NONE">기본 실패 (예외 중단)</option>
                    <option value="PIXEL_MATCH">🖼️ 0MB 초경량 픽셀 매칭 (이미지 탐색)</option>
                    <option value="JS_INJECT">⚡ JavaScript 강제 주입 실행</option>
                    <option value="KEYBOARD_TAB">⌨️ 키보드 탭(Tab) 시퀀스 이동</option>
                  </select>
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: '#64748b', fontSize: '0.75rem', textAlign: 'center', padding: '20px' }}>
              편집할 스텝을 선택하세요.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
