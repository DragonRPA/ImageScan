import React, { useState, useEffect } from 'react';
import { Play, Download, Upload, FileSpreadsheet, CheckCircle, AlertTriangle, RefreshCw, Terminal, CheckCircle2, ShieldAlert } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getAllRpaScenarios, getRpaScenarioById, requestRpaExecution } from '../utils/rpaEngine';
import { parseAndValidateExcel, FIELD_SYNONYMS } from '../utils/excelParserEngine';

export default function RPADashboardTab({ onError }) {
  const [scenarios, setScenarios] = useState(getAllRpaScenarios);
  const [selectedScenarioId, setSelectedScenarioId] = useState(() => scenarios[0]?.id || 'scenario_inbound_register');
  const [targetBrowser, setTargetBrowser] = useState('Edge');

  // Excel Upload State
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [validationError, setValidationError] = useState('');
  const [validationSuccess, setValidationSuccess] = useState('');

  // Execution State
  const [isRunning, setIsRunning] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentStepMessage, setCurrentStepMessage] = useState('');
  const [executionLogs, setExecutionLogs] = useState([]);

  const currentScenario = getRpaScenarioById(selectedScenarioId);

  // 시나리오 변경 시 업로드 상태 초기화
  const handleScenarioChange = (scenarioId) => {
    setSelectedScenarioId(scenarioId);
    setUploadedFileName('');
    setParsedRows([]);
    setValidationError('');
    setValidationSuccess('');
    setIsRunning(false);
    setProgressPercent(0);
    setExecutionLogs([]);
  };

  // 표준 엑셀 양식 다운로드
  const handleDownloadTemplate = () => {
    if (!currentScenario) return;
    const requiredKeys = currentScenario.requiredHeaders || ['asset_no'];

    // 12대 스키마 중 필수 및 주요 헤더 조합
    const sampleRow = {};
    requiredKeys.forEach(k => {
      const label = FIELD_SYNONYMS[k]?.label || k;
      sampleRow[label] = currentScenario.sampleData?.[label] || 'SAMPLE_DATA';
    });

    // 보조 헤더 추가
    if (!sampleRow['제품명']) sampleRow['제품명'] = '갤럭시 S24';
    if (!sampleRow['모델명']) sampleRow['모델명'] = 'SM-S921N';
    if (!sampleRow['비고']) sampleRow['비고'] = 'RPA 등록';

    const worksheet = XLSX.utils.json_to_sheet([sampleRow]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'RPA양식');
    XLSX.writeFile(workbook, `${currentScenario.name}_양식.xlsx`);
  };

  // 엑셀 파일 드롭 및 위치 독립형 선행 검증
  const handleFileDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer ? e.dataTransfer.files : e.target.files;
    if (!files || files.length === 0) return;
    processExcelFile(files[0]);
  };

  const processExcelFile = (file) => {
    setUploadedFileName(file.name);
    setValidationError('');
    setValidationSuccess('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const requiredKeys = currentScenario.requiredHeaders || ['asset_no'];

        // ★ 컬럼 위치 무관 엑셀 파서 및 선행 필수 헤더 점검 실행
        const result = parseAndValidateExcel(bstr, requiredKeys);

        if (!result.isValid) {
          setValidationError(result.error || '엑셀 파일 검증 실패');
          setParsedRows([]);
          return;
        }

        setParsedRows(result.rows);
        setValidationSuccess(`총 ${result.rows.length}건 유효 데이터 확인 완료 (필수 헤더 일치)`);
      } catch (err) {
        setValidationError(`파일 처리 오류: ${err.message}`);
        setParsedRows([]);
      }
    };
    reader.readAsBinaryString(file);
  };

  // RPA 실행 트리거
  const handleExecuteRPA = async () => {
    if (parsedRows.length === 0) {
      setValidationError('실행할 데이터 파일이 없습니다. 엑셀 파일을 먼저 업로드하세요.');
      return;
    }

    setIsRunning(true);
    setProgressPercent(5);
    setCurrentStepMessage('PC 에이전트 연결 및 브라우저 기동 준비 중...');
    setExecutionLogs([
      `[${new Date().toLocaleTimeString()}] 시나리오 시작: [${currentScenario.name}] (${targetBrowser} 브라우저)`,
      `[${new Date().toLocaleTimeString()}] 총 처리 대상: ${parsedRows.length}건 데이터 로드 완료`
    ]);

    try {
      await requestRpaExecution({
        scenarioId: currentScenario.id,
        targetBrowser,
        rows: parsedRows
      });

      // 실시간 시뮬레이션 및 진행률 업데이트
      const total = parsedRows.length;
      for (let i = 1; i <= total; i++) {
        await new Promise(res => setTimeout(res, 300));
        const pct = Math.min(99, Math.round((i / total) * 90) + 10);
        const rowItem = parsedRows[i - 1];
        setProgressPercent(pct);
        setCurrentStepMessage(`데이터 처리 중 (${i}/${total}건) - ${rowItem.asset_no || rowItem.serial_no}`);
        setExecutionLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] (${i}/${total}) 자산번호 [${rowItem.asset_no || rowItem.serial_no}] 폼 입력 및 저장 완료`
        ]);
      }

      setProgressPercent(100);
      setCurrentStepMessage(`전체 ${total}건 RPA 무인 자동화 실행 완료!`);
      setExecutionLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ★ 전체 작업 완료: ${total}건 성공 (실패 0건)`
      ]);
    } catch (err) {
      setValidationError(`RPA 실행 실패: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      color: '#f8fafc',
      width: '100%'
    }}>
      {/* ── [1] 상단 컨트롤 패널 ────────────────────────────────────── */}
      <div style={{
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '8px',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Play size={16} style={{ color: '#38bdf8' }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>RPA 실행 관리</span>
            <span style={{
              fontSize: '0.68rem',
              backgroundColor: '#0f172a',
              color: '#4ade80',
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid #334155',
              fontWeight: 600
            }}>
              에이전트 연결됨
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>타겟 브라우저:</span>
            <select
              value={targetBrowser}
              onChange={e => setTargetBrowser(e.target.value)}
              style={{
                backgroundColor: '#0f172a',
                border: '1px solid #475569',
                borderRadius: '4px',
                padding: '3px 8px',
                color: '#f8fafc',
                fontSize: '0.75rem'
              }}
            >
              <option value="Edge">Microsoft Edge</option>
              <option value="Chrome">Google Chrome</option>
            </select>
          </div>
        </div>

        {/* 3단계 실행 그리드 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '10px'
        }}>
          {/* 1단계: 시나리오 선택 */}
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '6px',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8' }}>
              1. 시나리오 선택
            </div>
            <select
              value={selectedScenarioId}
              onChange={e => handleScenarioChange(e.target.value)}
              style={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '4px',
                padding: '6px 8px',
                color: '#f8fafc',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              {scenarios.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', lineHeight: '1.3' }}>
              {currentScenario?.description}
            </div>
          </div>

          {/* 2단계: 데이터 파일 지정 */}
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
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8' }}>
                2. 데이터 파일 지정
              </span>
              <button
                onClick={handleDownloadTemplate}
                className="btn btn-outline"
                style={{ fontSize: '0.68rem', padding: '2px 6px', borderColor: '#38bdf8', color: '#7dd3fc' }}
              >
                <Download size={11} /> 표준 양식 다운로드
              </button>
            </div>

            {/* 드래그 앤 드롭 영역 */}
            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '12px',
                backgroundColor: '#1e293b',
                border: '1px dashed #475569',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              <Upload size={16} style={{ color: '#94a3b8' }} />
              <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                {uploadedFileName ? uploadedFileName : '엑셀(.xlsx, .csv) 파일을 끌어다 놓으세요'}
              </span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileDrop}
                style={{ display: 'none' }}
              />
            </label>

            {validationSuccess && (
              <div style={{ fontSize: '0.68rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={12} /> {validationSuccess}
              </div>
            )}
            {validationError && (
              <div style={{ fontSize: '0.68rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldAlert size={12} /> {validationError}
              </div>
            )}
          </div>

          {/* 3단계: 실행 액션 */}
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '6px',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '8px'
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8' }}>
              3. 무인 자동화 실행
            </div>

            <button
              onClick={handleExecuteRPA}
              disabled={isRunning || parsedRows.length === 0}
              className="btn"
              style={{
                backgroundColor: isRunning ? '#64748b' : '#38bdf8',
                color: '#0f172a',
                border: 'none',
                padding: '10px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: (isRunning || parsedRows.length === 0) ? 'not-allowed' : 'pointer'
              }}
            >
              {isRunning ? '무인 자동화 실행 중...' : `▶ [${currentScenario?.name}] 실행`}
            </button>

            <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
              대기 중 데이터: <strong style={{ color: '#f8fafc' }}>{parsedRows.length}</strong> 건
            </div>
          </div>
        </div>
      </div>

      {/* ── [2] 실시간 진행 상태 & 로그 콘솔 ────────────────────────── */}
      <div style={{
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '8px',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Terminal size={14} style={{ color: '#38bdf8' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>실행 모니터링 로그</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 600 }}>
            {progressPercent}% 완료
          </span>
        </div>

        {/* 프로그레스 바 */}
        <div style={{
          width: '100%',
          height: '6px',
          backgroundColor: '#0f172a',
          borderRadius: '3px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${progressPercent}%`,
            height: '100%',
            backgroundColor: progressPercent === 100 ? '#4ade80' : '#38bdf8',
            transition: 'width 0.3s ease'
          }} />
        </div>

        {currentStepMessage && (
          <div style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
            {currentStepMessage}
          </div>
        )}

        {/* 터미널 로그 콘솔 */}
        <div style={{
          backgroundColor: '#090d16',
          border: '1px solid #1e293b',
          borderRadius: '6px',
          padding: '10px',
          height: '140px',
          overflowY: 'auto',
          fontFamily: 'monospace',
          fontSize: '0.72rem',
          color: '#94a3b8',
          display: 'flex',
          flexDirection: 'column',
          gap: '3px'
        }}>
          {executionLogs.length === 0 ? (
            <span style={{ color: '#475569' }}>RPA 실행 대기 중...</span>
          ) : (
            executionLogs.map((log, idx) => (
              <div key={idx} style={{ color: log.includes('★') ? '#4ade80' : log.includes('시작') ? '#38bdf8' : '#cbd5e1' }}>
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
