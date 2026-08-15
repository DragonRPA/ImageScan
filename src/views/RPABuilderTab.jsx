import React, { useState } from 'react';
import { Bot, Plus, Trash2, Copy, Save, Play, Crosshair, Sparkles, Layers, ArrowDown, MoveUp, MoveDown, Check, MousePointer } from 'lucide-react';
import { getAllRpaScenarios, getRpaScenarioById, saveRpaScenario, deleteRpaScenario, BUILTIN_RPA_SCENARIOS } from '../utils/rpaEngine';
import { DEFAULT_SCHEMA_DEF } from '../utils/dynamicSchema';

export default function RPABuilderTab({ onError }) {
  const [scenarios, setScenarios] = useState(getAllRpaScenarios);
  const [selectedScenarioId, setSelectedScenarioId] = useState(() => scenarios[0]?.id || 'scenario_inbound_register');
  const [selectedStepId, setSelectedStepId] = useState('step_1');
  const [isSaved, setIsSaved] = useState(false);
  const [isInspecting, setIsInspecting] = useState(false);

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

    if (actionType === 'NAVIGATE') newStep = { ...newStep, name: '페이지 접속', url: 'https://' };
    if (actionType === 'SWITCH_FRAME') newStep = { ...newStep, name: '프레임 전환', frameSelector: 'contentFrame' };
    if (actionType === 'WAIT_ELEMENT') newStep = { ...newStep, name: '요소 로딩 대기', selector: "//input[@id='']" };
    if (actionType === 'INPUT_TEXT') newStep = { ...newStep, name: '텍스트 입력', selector: "//input[@id='']", valueTemplate: '{{자산번호}}', sendEnter: false, fallbackType: 'NONE' };
    if (actionType === 'CLICK') newStep = { ...newStep, name: '버튼 클릭', selector: "//button[@id='']", fallbackType: 'PIXEL_MATCH' };
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
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={handleSaveScenario}
            className={`btn ${isSaved ? 'btn-success' : 'btn-primary'}`}
            style={{ fontSize: '0.72rem', padding: '4px 12px' }}
          >
            <Save size={12} /> {isSaved ? '저장됨' : '시나리오 저장'}
          </button>
        </div>
      </div>

      {/* ── [2] 3분할 워크스페이스 (240px | 1fr | 340px) ─────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '240px minmax(400px, 1fr) 340px',
        gap: '8px',
        alignItems: 'stretch',
        width: '100%',
        minHeight: '560px'
      }}>
        {/* ── [1/3] 좌측 액션 도구 상자 & 변수 라이브러리 ───────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
          {/* 액션 추가 도구함 */}
          <div style={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8' }}>
              액션 도구 상자
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
              <button onClick={() => handleAddStep('NAVIGATE')} className="btn btn-outline" style={{ fontSize: '0.68rem', padding: '4px' }}>
                🌐 URL 이동
              </button>
              <button onClick={() => handleAddStep('SWITCH_FRAME')} className="btn btn-outline" style={{ fontSize: '0.68rem', padding: '4px' }}>
                🖼️ 프레임 전환
              </button>
              <button onClick={() => handleAddStep('WAIT_ELEMENT')} className="btn btn-outline" style={{ fontSize: '0.68rem', padding: '4px' }}>
                ⏳ 요소 대기
              </button>
              <button onClick={() => handleAddStep('INPUT_TEXT')} className="btn btn-outline" style={{ fontSize: '0.68rem', padding: '4px' }}>
                ⌨️ 텍스트 입력
              </button>
              <button onClick={() => handleAddStep('CLICK')} className="btn btn-outline" style={{ fontSize: '0.68rem', padding: '4px' }}>
                🖱️ 버튼 클릭
              </button>
              <button onClick={() => handleAddStep('HANDLE_ALERT')} className="btn btn-outline" style={{ fontSize: '0.68rem', padding: '4px' }}>
                🚨 알럿 수락
              </button>
            </div>
          </div>

          {/* 12대 스키마 변수 라이브러리 */}
          <div style={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            flex: 1
          }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8' }}>
              사용 가능 변수 사전 (12대 필드)
            </div>
            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
              클릭 시 현재 선택된 스텝에 자동 삽입
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
              {DEFAULT_SCHEMA_DEF.fields.map(f => (
                <span
                  key={f.id}
                  onClick={() => {
                    if (selectedStep && selectedStep.action === 'INPUT_TEXT') {
                      const currentVal = selectedStep.valueTemplate || '';
                      handleStepPropChange('valueTemplate', `${currentVal}{{${f.name}}}`);
                    }
                  }}
                  style={{
                    fontSize: '0.68rem',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    color: '#38bdf8',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                  title="클릭하여 입력창에 삽입"
                >
                  {`{{${f.name}}}`}
                </span>
              ))}
            </div>
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
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {st.url || st.selector || st.valueTemplate || st.alertAction || ''}
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

              {/* NAVIGATE 액션: URL */}
              {selectedStep.action === 'NAVIGATE' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>접속 URL</label>
                  <input
                    type="text"
                    value={selectedStep.url || ''}
                    onChange={e => handleStepPropChange('url', e.target.value)}
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

              {/* SWITCH_FRAME 액션: Frame Selector */}
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

              {/* INPUT_TEXT / CLICK / WAIT: Target Selector & Navigator */}
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
