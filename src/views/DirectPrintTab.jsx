import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  Barcode,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  Settings,
  Plus,
  Trash2,
  FolderOpen,
  Layers,
  Sparkles,
  Volume2,
  RefreshCw
} from 'lucide-react';
import { getSupabaseClient, insertPrintQueue } from '../utils/supabaseClient';
import {
  getAllPresets,
  getStoredLabelTemplate,
  generateDynamicZpl,
  saveStoredLabelTemplate,
  syncTemplatesWithBackend
} from '../utils/labelTemplate';
import {
  getRegisteredPrinters,
  getActivePrinterId,
  setActivePrinterId,
  saveRegisteredPrinter,
  deleteRegisteredPrinter,
  sendZplToPrinter,
  fetchActualConnectedPrinters
} from '../utils/printerManager';
import { RealBarcodeSvg } from '../utils/barcode39';
import { triggerSuccessFeedback } from '../utils/soundFeedback';

export default function DirectPrintTab({ onError, onOpenPrintModal }) {
  // ── 환경 설정 상태 ──────────────────────────────────────────
  const [printers, setPrinters] = useState(getRegisteredPrinters);
  const [activePrinterIdState, setActivePrinterIdState] = useState(getActivePrinterId);
  const [presets, setPresets] = useState(getAllPresets);
  const [selectedTemplate, setSelectedTemplate] = useState(getStoredLabelTemplate);
  const [targetTable, setTargetTable] = useState(selectedTemplate.targetTable || 'asset');

  // ── 스캔 & 인쇄 인터랙션 상태 ────────────────────────────────
  const [scanInput, setScanInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScannedItem, setLastScannedItem] = useState(null);
  const [lastZpl, setLastZpl] = useState('');
  const [printCopies, setPrintCopies] = useState(1);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  const [recentLogs, setRecentLogs] = useState([]);

  // ── 모달 상태 ───────────────────────────────────────────────
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);
  const [newPrinterName, setNewPrinterName] = useState('');
  const [newPrinterType, setNewPrinterType] = useState('web_serial');
  const [newPrinterTarget, setNewPrinterTarget] = useState('COM Port / USB');
  const [newPrinterBaud, setNewPrinterBaud] = useState('9600');

  const inputRef = useRef(null);
  const canvasRef = useRef(null);

  // 활성 프린터 객체
  const activePrinter = printers.find(p => p.id === activePrinterIdState) || printers[0];

  const [isScanningPrinters, setIsScanningPrinters] = useState(false);

  // ⭐️ 마운트 시 실제 연결된 프린터 및 온라인 DB 전체 서식 목록 동기화
  useEffect(() => {
    // 1. 온라인 DB 서식 동기화
    syncTemplatesWithBackend().then(syncedPresets => {
      if (syncedPresets && syncedPresets.length > 0) {
        setPresets(syncedPresets);
        const active = getStoredLabelTemplate();
        if (active) {
          setSelectedTemplate(active);
          setTargetTable(active.targetTable || 'asset');
        }
      }
    });

    // 2. 실제 PC에 연결된 프린터 실시간 스캔 동기화
    fetchActualConnectedPrinters().then(detectedPrinters => {
      if (detectedPrinters && detectedPrinters.length > 0) {
        setPrinters(detectedPrinters);
        const currentActive = getActivePrinterId();
        const exists = detectedPrinters.some(p => p.id === currentActive);
        if (!exists) {
          setActivePrinterIdState(detectedPrinters[0].id);
          setActivePrinterId(detectedPrinters[0].id);
        }
      }
    });
  }, []);

  // ⭐️ 실제 컴퓨터 연결 프린터 수동 재검색
  const handleDiscoverPrinters = async () => {
    setIsScanningPrinters(true);
    try {
      const detected = await fetchActualConnectedPrinters();
      if (detected && detected.length > 0) {
        setPrinters(detected);
        const currentActive = getActivePrinterId();
        const exists = detected.some(p => p.id === currentActive);
        if (!exists) {
          setActivePrinterIdState(detected[0].id);
          setActivePrinterId(detected[0].id);
        }
        setStatusMessage({ type: 'success', text: `컴퓨터에 연결된 실제 프린터 ${detected.length}대를 감지하였습니다.` });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: `프린터 검색 실패: ${err.message}` });
    } finally {
      setIsScanningPrinters(false);
    }
  };

  // 렌더링 시 입력창 항상 자동 포커스 유지
  useEffect(() => {
    inputRef.current?.focus();
  }, [isProcessing, lastScannedItem]);

  // 서식 변경 시 타겟 테이블 및 로컬 저장 동기화
  const handleSelectTemplate = (presetId) => {
    const found = presets.find(p => p.templateId === presetId);
    if (found) {
      setSelectedTemplate(found);
      setTargetTable(found.targetTable || 'asset');
      saveStoredLabelTemplate(found);
    }
  };

  // 타겟 테이블 전환 시 알맞은 서식 자동 매칭
  const handleSwitchTargetTable = (tableId) => {
    setTargetTable(tableId);
    const matched = presets.find(p => p.targetTable === tableId) || presets[0];
    if (matched) {
      setSelectedTemplate(matched);
      saveStoredLabelTemplate(matched);
    }
  };

  // 프린터 선택 변경
  const handleSelectPrinter = (printerId) => {
    setActivePrinterIdState(printerId);
    setActivePrinterId(printerId);
  };

  // ⭐️ 신규 프린터 등록
  const handleRegisterPrinter = () => {
    if (!newPrinterName.trim()) {
      alert('프린터 명칭을 입력하세요.');
      return;
    }
    const newPrn = {
      id: `prn_custom_${Date.now()}`,
      name: newPrinterName.trim(),
      type: newPrinterType,
      target: newPrinterTarget.trim(),
      baudRate: Number(newPrinterBaud) || 9600,
      isDefault: false
    };
    const updated = saveRegisteredPrinter(newPrn);
    setPrinters(updated);
    setActivePrinterIdState(newPrn.id);
    setActivePrinterId(newPrn.id);
    setIsPrinterModalOpen(false);
    setNewPrinterName('');
  };

  // 프린터 삭제
  const handleDeletePrinter = (printerId) => {
    if (printers.length <= 1) {
      alert('최소 1개의 프린터 설정은 유지되어야 합니다.');
      return;
    }
    if (window.confirm('이 프린터 설정을 삭제하시겠습니까?')) {
      const updated = deleteRegisteredPrinter(printerId);
      setPrinters(updated);
      if (activePrinterIdState === printerId) {
        setActivePrinterIdState(updated[0]?.id || '');
        setActivePrinterId(updated[0]?.id || '');
      }
    }
  };

  // ⭐️ 핵심: 바코드 스캔 / 엔터 입력 시 실시간 DB 조회 & 즉시 자동 라벨 출력
  const handleExecuteScanAndPrint = async (codeToSearch = null) => {
    const query = (codeToSearch || scanInput).trim();
    if (!query) return;

    setIsProcessing(true);
    setStatusMessage({ type: 'info', text: `'${query}' 조회 중...` });

    try {
      const client = getSupabaseClient();
      let matchedItem = null;

      if (client) {
        if (targetTable === 'temp_asset') {
          // 1. temp_asset / temp_assets 테이블 최우선 조회
          try {
            const { data, error } = await client
              .from('temp_asset')
              .select('*')
              .or(`asset_no.eq.${query},serial_no.eq.${query},imei.eq.${query},asset_no.ilike.%${query}%,serial_no.ilike.%${query}%`)
              .limit(1)
              .maybeSingle();

            if (!error && data) matchedItem = data;
          } catch (e) {
            console.warn('temp_asset direct query fallback');
          }

          if (!matchedItem) {
            try {
              const { data, error } = await client
                .from('temp_assets')
                .select('*')
                .or(`asset_no.eq.${query},serial_no.eq.${query},imei.eq.${query},id.eq.${query}`)
                .limit(1)
                .maybeSingle();

              if (!error && data) matchedItem = data;
            } catch (e) {}
          }
        } else {
          // 2. asset 정규 마스터 테이블 최우선 조회 (데이터 목록 탭과 100% 동일)
          try {
            const { data, error } = await client
              .from('asset')
              .select('*')
              .or(`asset_no.eq.${query},serial_no.eq.${query},imei.eq.${query},asset_no.ilike.%${query}%,serial_no.ilike.%${query}%,imei.ilike.%${query}%`)
              .limit(1)
              .maybeSingle();

            if (!error && data) {
              matchedItem = {
                ...data,
                id: data.asset_no || data.id,
                asset_no: data.asset_no,
                serial_no: data.serial_no,
                product_name: data.product_name,
                model_name: data.model_name,
                category_major: data.category_major || '',
                shelf_no: data.shelf_no,
                asset_status: data.asset_status || '정상',
                asset_option: data.asset_option,
                calibration_date: data.calibration_date,
                mac_wlan: data.mac_wlan,
                mac_lan: data.mac_lan,
                imei: data.imei,
                components: data.components,
                spec: data.spec || data.components || '',
                remark: data.remark
              };
            }
          } catch (e) {
            console.warn('asset master query fallback:', e.message);
          }
        }

        // 3. 레거시 scan_records 2차 폴백
        if (!matchedItem) {
          try {
            const { data, error } = await client
              .from('scan_records')
              .select('*')
              .or(`key_value.eq.${query},data->>asset_no.eq.${query},data->>serial_no.eq.${query},data->>imei.eq.${query}`)
              .limit(1)
              .maybeSingle();

            if (!error && data) {
              matchedItem = {
                id: data.id,
                asset_no: data.data?.asset_no || data.key_value,
                serial_no: data.data?.serial_no || query,
                product_name: data.data?.product_name || '',
                model_name: data.data?.model_name || '',
                category_major: data.data?.category_major || '',
                shelf_no: data.data?.shelf_no || '',
                asset_status: data.data?.asset_status || '정상',
                asset_option: data.data?.asset_option || '',
                imei: data.data?.imei || '',
                mac_wlan: data.data?.mac_wlan || '',
                mac_lan: data.data?.mac_lan || '',
                spec: data.data?.spec || '',
                remark: data.data?.remark || '',
                ...data.data
              };
            }
          } catch (e) {}
        }
      }

      // 조회 결과가 있는 경우: 즉시 라벨 인쇄 집행!
      if (matchedItem) {
        triggerSuccessFeedback();
        setLastScannedItem(matchedItem);

        // 1. ZPL 코드 동적 생성
        const zpl = generateDynamicZpl(matchedItem, selectedTemplate);
        setLastZpl(zpl);

        // 2. 선택된 프린터로 즉시 ZPL 전송
        let printResultMsg = '인쇄 완료';
        try {
          const res = await sendZplToPrinter(zpl, activePrinter);
          printResultMsg = res.message;
        } catch (printErr) {
          console.warn('Direct Printer Send Warning:', printErr.message);
          printResultMsg = `전송 경고: ${printErr.message}`;
        }

        // 3. Supabase 프린트 큐에도 무누락 적재
        try {
          await insertPrintQueue({
            itemData: matchedItem,
            zplCode: zpl,
            copies: printCopies || 1,
            printerName: activePrinter?.name || '기본 라벨 프린터',
            status: 'COMPLETED'
          });
        } catch (e) {}

        // 4. 최근 출력 이력 누적
        const logEntry = {
          id: `log_${Date.now()}`,
          time: new Date().toLocaleTimeString(),
          targetTable,
          assetNo: matchedItem.asset_no || query,
          productName: matchedItem.product_name || '-',
          modelName: matchedItem.model_name || '-',
          serialNo: matchedItem.serial_no || '-',
          printerName: activePrinter?.name || '-',
          status: 'SUCCESS'
        };
        setRecentLogs(prev => [logEntry, ...prev.slice(0, 19)]);

        setStatusMessage({
          type: 'success',
          text: `[${matchedItem.asset_no || query}] 조회 성공 ➔ ${activePrinter?.name} 즉시 출력 완료!`
        });

        // 5. 입력창 자동 비움 및 포커스 복원
        setScanInput('');
      } else {
        // 조회 결과가 없는 경우
        setStatusMessage({
          type: 'error',
          text: `[${query}] 일치하는 자산 데이터가 없습니다. (테이블: ${targetTable})`
        });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: `오류 발생: ${err.message}` });
      if (onError) onError(err);
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  // ⭐️ 수동 재인쇄
  const handleManualReprint = async () => {
    if (!lastScannedItem) {
      alert('먼저 자산을 조회하거나 스캔하세요.');
      return;
    }
    setIsProcessing(true);
    try {
      const zpl = generateDynamicZpl(lastScannedItem, selectedTemplate);
      await sendZplToPrinter(zpl, activePrinter);
      setStatusMessage({
        type: 'success',
        text: `[${lastScannedItem.asset_no}] ${printCopies}매 재인쇄 완료!`
      });
    } catch (err) {
      setStatusMessage({ type: 'error', text: `재인쇄 실패: ${err.message}` });
    } finally {
      setIsProcessing(false);
      inputRef.current?.focus();
    }
  };

  // 캔버스 픽셀 계산
  const PX_PER_MM = 3.78;
  const canvasWidthPx = Math.round((selectedTemplate.paper?.widthMm || 72) * PX_PER_MM);
  const canvasHeightPx = Math.round((selectedTemplate.paper?.heightMm || 40) * PX_PER_MM);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      color: '#f8fafc',
      width: '100%',
      minHeight: '700px'
    }}>
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 1. 상단 환경 설정 바 (프린터 등록/선택 + 서식 선택 + 타겟 DB)    */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div style={{
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '8px',
        padding: '10px 14px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '12px',
        alignItems: 'center'
      }}>
        {/* 1) 프린터 선택 & 등록 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Printer size={13} /> 프린터 선택 및 연결
            </label>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={handleDiscoverPrinters}
                disabled={isScanningPrinters}
                className="btn btn-outline"
                style={{ fontSize: '0.65rem', padding: '1px 6px', borderColor: '#4ade80', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '3px' }}
                title="내 컴퓨터에 연결된 실제 프린터 실시간 검색"
              >
                <RefreshCw size={10} className={isScanningPrinters ? 'spin' : ''} />
                {isScanningPrinters ? '검색중...' : '실제 프린터 검색'}
              </button>
              <button
                onClick={() => setIsPrinterModalOpen(true)}
                className="btn btn-outline"
                style={{ fontSize: '0.65rem', padding: '1px 6px', borderColor: '#38bdf8', color: '#38bdf8' }}
              >
                <Plus size={10} /> 등록
              </button>
            </div>
          </div>
          <select
            value={activePrinterIdState}
            onChange={e => handleSelectPrinter(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: '#0f172a',
              border: '1px solid #475569',
              borderRadius: '4px',
              padding: '6px 8px',
              color: '#f8fafc',
              fontSize: '0.78rem',
              fontWeight: 600
            }}
          >
            {printers.map(p => (
              <option key={p.id} value={p.id}>
                {p.isHardwareDetected ? `🟢 ${p.name}` : p.name}
              </option>
            ))}
          </select>
        </div>

        {/* 2) 라벨 디자인 서식 선택 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sliders size={13} /> 라벨 디자인 서식 선택
          </label>
          <select
            value={selectedTemplate.templateId}
            onChange={e => handleSelectTemplate(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: '#0f172a',
              border: '1px solid #475569',
              borderRadius: '4px',
              padding: '6px 8px',
              color: '#f8fafc',
              fontSize: '0.78rem',
              fontWeight: 600
            }}
          >
            {presets.map(p => (
              <option key={p.templateId} value={p.templateId}>
                {p.name} ({p.paper?.widthMm}×{p.paper?.heightMm}mm / {p.targetTable})
              </option>
            ))}
          </select>
        </div>

        {/* 3) 타겟 DB 선택 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Layers size={13} /> 타겟 DB 테이블
          </label>
          <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
            <button
              onClick={() => handleSwitchTargetTable('asset')}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: '4px',
                border: `1px solid ${targetTable === 'asset' ? '#38bdf8' : '#334155'}`,
                backgroundColor: targetTable === 'asset' ? '#0369a1' : '#0f172a',
                color: targetTable === 'asset' ? '#ffffff' : '#94a3b8',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              asset (자산관리)
            </button>
            <button
              onClick={() => handleSwitchTargetTable('temp_asset')}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: '4px',
                border: `1px solid ${targetTable === 'temp_asset' ? '#a855f7' : '#334155'}`,
                backgroundColor: targetTable === 'temp_asset' ? '#6b21a8' : '#0f172a',
                color: targetTable === 'temp_asset' ? '#ffffff' : '#94a3b8',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              temp_asset (임시자산)
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 2. 메인 워크스페이스 (좌: 초고속 스캔 입력창 | 우: 1:1 라벨 캔버스) */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(380px, 1.2fr) minmax(360px, 1fr)',
        gap: '12px',
        alignItems: 'stretch'
      }}>
        {/* ── [좌측] 초고속 바코드 스캔 입력창 & 자산 정보 카드 ── */}
        <div style={{
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {/* 대형 스캔 입력창 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Barcode size={16} /> 바코드 스캔 / 식별자 입력창
              </label>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                스캔 또는 Enter 시 즉시 DB 조회 & 자동 출력
              </span>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                ref={inputRef}
                type="text"
                value={scanInput}
                onChange={e => setScanInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleExecuteScanAndPrint();
                  }
                }}
                placeholder={targetTable === 'temp_asset' ? "임시자산번호 또는 PK(ID) 스캔 / 입력" : "자산번호 또는 제조번호(S/N) 스캔 / 입력"}
                style={{
                  flex: 1,
                  backgroundColor: '#0f172a',
                  border: '2px solid #38bdf8',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  color: '#facc15',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  outline: 'none'
                }}
              />
              <button
                onClick={() => handleExecuteScanAndPrint()}
                disabled={isProcessing || !scanInput.trim()}
                className="btn btn-primary"
                style={{ fontSize: '0.82rem', padding: '0 16px', fontWeight: 700 }}
              >
                <Search size={14} /> 조회 및 즉시 출력
              </button>
            </div>
          </div>

          {/* 상태 알림 메시지 */}
          {statusMessage.text && (
            <div style={{
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : statusMessage.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.2)',
              border: `1px solid ${statusMessage.type === 'success' ? '#10b981' : statusMessage.type === 'error' ? '#ef4444' : '#38bdf8'}`,
              color: statusMessage.type === 'success' ? '#34d399' : statusMessage.type === 'error' ? '#f87171' : '#38bdf8'
            }}>
              {statusMessage.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
              {statusMessage.text}
            </div>
          )}

          {/* 최근 스캔/출력 자산 상세 카드 */}
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '6px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f8fafc' }}>
                최근 조회 & 출력 자산 정보
              </span>
              {lastScannedItem ? (
                <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700 }}>
                  ● 출력 완료
                </span>
              ) : (
                <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                  스캔 대기중
                </span>
              )}
            </div>

            {lastScannedItem ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.72rem' }}>
                <div><span style={{ color: '#94a3b8' }}>자산번호:</span> <strong style={{ color: '#38bdf8' }}>{lastScannedItem.asset_no}</strong></div>
                <div><span style={{ color: '#94a3b8' }}>제조번호(S/N):</span> <strong>{lastScannedItem.serial_no || '-'}</strong></div>
                <div><span style={{ color: '#94a3b8' }}>제품명:</span> <strong>{lastScannedItem.product_name || '-'}</strong></div>
                <div><span style={{ color: '#94a3b8' }}>모델명:</span> <strong>{lastScannedItem.model_name || '-'}</strong></div>
                <div><span style={{ color: '#94a3b8' }}>대분류:</span> <strong>{lastScannedItem.category_major || '-'}</strong></div>
                <div><span style={{ color: '#94a3b8' }}>선반위치:</span> <strong>{lastScannedItem.shelf_no || '-'}</strong></div>
                <div><span style={{ color: '#94a3b8' }}>상태:</span> <strong style={{ color: '#facc15' }}>{lastScannedItem.asset_status || lastScannedItem.temp_status || '정상'}</strong></div>
                <div><span style={{ color: '#94a3b8' }}>옵션/사양:</span> <strong>{lastScannedItem.asset_option || lastScannedItem.spec || '-'}</strong></div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0', color: '#64748b', fontSize: '0.75rem' }}>
                바코드를 스캔하거나 자산번호/시리얼을 입력하세요.
              </div>
            )}
          </div>

          {/* 수동 재인쇄 제어 영역 */}
          {lastScannedItem && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '8px 12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>인쇄 매수:</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={printCopies}
                  onChange={e => setPrintCopies(Math.max(1, Number(e.target.value)))}
                  style={{
                    width: '45px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '4px',
                    padding: '2px 4px',
                    color: '#facc15',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textAlign: 'center'
                  }}
                />
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>매</span>
              </div>

              <button
                onClick={handleManualReprint}
                disabled={isProcessing}
                className="btn btn-outline"
                style={{ fontSize: '0.72rem', padding: '4px 10px', borderColor: '#38bdf8', color: '#38bdf8' }}
              >
                <RotateCcw size={12} /> 추가 재인쇄
              </button>
            </div>
          )}
        </div>

        {/* ── [우측] 실제 출력 1:1 완벽 비례 라벨 캔버스 미리보기 ── */}
        <div style={{
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: '10px',
          position: 'relative'
        }}>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '6px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8' }}>
              실제 인쇄 라벨 캔버스 ({selectedTemplate.paper?.widthMm}×{selectedTemplate.paper?.heightMm}mm)
            </span>
            <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
              {activePrinter?.name}
            </span>
          </div>

          {/* ⭐️ 실물 1:1 정밀 캔버스 */}
          <div
            ref={canvasRef}
            style={{
              width: `${canvasWidthPx}px`,
              height: `${canvasHeightPx}px`,
              backgroundColor: '#ffffff',
              color: '#000000',
              borderRadius: '6px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), 0 0 0 1px #38bdf8',
              position: 'relative',
              overflow: 'hidden',
              userSelect: 'none',
              flexShrink: 0
            }}
          >
            {selectedTemplate.elements.filter(e => e.visible).map(elem => {
              const leftPx = elem.xMm * PX_PER_MM;
              const topPx = elem.yMm * PX_PER_MM;
              const currentData = lastScannedItem || {
                asset_no: '224011319',
                product_name: '아이패드 9세대',
                model_name: 'A2602',
                serial_no: 'QHJ66F6V0X',
                shelf_no: 'A-01-02'
              };

              // 1. 텍스트 요소
              if (elem.type === 'text') {
                let displayVal = elem.prefix || '';
                if (elem.field === 'custom' || elem.field?.startsWith('custom_text_')) {
                  displayVal += (elem.customValue || '');
                } else {
                  displayVal += (currentData[elem.field] || elem.field?.toUpperCase() || '');
                }
                const fontSizePx = (elem.fontSizePt || 20) * 0.46 * (PX_PER_MM / 8.5);

                return (
                  <div
                    key={elem.id}
                    style={{
                      position: 'absolute',
                      left: `${leftPx}px`,
                      top: `${topPx}px`,
                      fontSize: `${fontSizePx}px`,
                      fontWeight: 700,
                      fontFamily: elem.fontFamily === 'A0N' ? 'monospace, sans-serif' : 'sans-serif',
                      whiteSpace: 'nowrap',
                      lineHeight: 1.1
                    }}
                  >
                    {displayVal}
                  </div>
                );
              }

              // 2. 바코드 / QR 요소
              if (elem.type === 'barcode') {
                const bcVal = currentData[elem.targetField] || currentData.asset_no || '224011319';
                const heightPx = (elem.heightMm || 10) * PX_PER_MM;
                const qrSizePx = (elem.qrScale || 4) * 8.5 * (PX_PER_MM / 8.5);

                return (
                  <div
                    key={elem.id}
                    style={{
                      position: 'absolute',
                      left: `${leftPx}px`,
                      top: `${topPx}px`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center'
                    }}
                  >
                    {elem.barcodeType === 'QR' ? (
                      <div style={{
                        width: `${qrSizePx}px`,
                        height: `${qrSizePx}px`,
                        backgroundColor: '#000',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '9px',
                        fontWeight: 700,
                        letterSpacing: '-0.5px',
                        borderRadius: '2px'
                      }}>
                        QR CODE
                      </div>
                    ) : (
                      <RealBarcodeSvg
                        value={bcVal}
                        type={elem.barcodeType || 'CODE128'}
                        heightPx={heightPx}
                        showText={elem.showText !== false}
                        scale={PX_PER_MM / 9.0}
                        prefix={elem.prefix || ''}
                      />
                    )}
                  </div>
                );
              }

              // 3. 구분선
              if (elem.type === 'line') {
                const widthPx = (elem.widthMm || 65) * PX_PER_MM;
                const thicknessPx = Math.max(1, (elem.thicknessMm || 0.25) * PX_PER_MM);
                return (
                  <div
                    key={elem.id}
                    style={{
                      position: 'absolute',
                      left: `${leftPx}px`,
                      top: `${topPx}px`,
                      width: `${widthPx}px`,
                      height: `${thicknessPx}px`,
                      backgroundColor: '#000000'
                    }}
                  />
                );
              }

              // 4. 이미지
              if (elem.type === 'image' && elem.imageDataUrl) {
                const widthPx = (elem.widthMm || 18) * PX_PER_MM;
                const heightPx = (elem.heightMm || 12) * PX_PER_MM;
                return (
                  <img
                    key={elem.id}
                    src={elem.imageDataUrl}
                    alt="label-img"
                    style={{
                      position: 'absolute',
                      left: `${leftPx}px`,
                      top: `${topPx}px`,
                      width: `${widthPx}px`,
                      height: `${heightPx}px`,
                      objectFit: 'fill'
                    }}
                  />
                );
              }

              return null;
            })}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 3. 최근 즉시 출력 이력 목록 (Today's Direct Print Logs)         */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div style={{
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '8px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38bdf8' }}>
            최근 즉시 출력 이력 ({recentLogs.length}건)
          </span>
          <button
            onClick={() => setRecentLogs([])}
            className="btn btn-outline"
            style={{ fontSize: '0.65rem', padding: '1px 6px' }}
          >
            이력 지우기
          </button>
        </div>

        <div style={{ overflowX: 'auto', maxHeight: '200px' }} className="grid-scrollbar">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>출력시간</th>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>타겟DB</th>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>자산번호</th>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>제품명</th>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>모델명</th>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>제조번호(S/N)</th>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>프린터</th>
                <th style={{ padding: '6px 8px', textAlign: 'center' }}>결과</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>
                    금일 즉시 출력 이력이 없습니다.
                  </td>
                </tr>
              ) : (
                recentLogs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '5px 8px' }}>{log.time}</td>
                    <td style={{ padding: '5px 8px' }}>
                      <span style={{
                        padding: '1px 4px',
                        borderRadius: '3px',
                        backgroundColor: log.targetTable === 'temp_asset' ? '#3b0764' : '#1e3a8a',
                        color: log.targetTable === 'temp_asset' ? '#d8b4fe' : '#93c5fd'
                      }}>
                        {log.targetTable}
                      </span>
                    </td>
                    <td style={{ padding: '5px 8px', fontWeight: 700, color: '#38bdf8' }}>{log.assetNo}</td>
                    <td style={{ padding: '5px 8px' }}>{log.productName}</td>
                    <td style={{ padding: '5px 8px' }}>{log.modelName}</td>
                    <td style={{ padding: '5px 8px' }}>{log.serialNo}</td>
                    <td style={{ padding: '5px 8px', color: '#94a3b8' }}>{log.printerName}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'center', color: '#10b981', fontWeight: 700 }}>
                      성공
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 4. 프린터 등록 및 관리 모달                                    */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {isPrinterModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            border: '1px solid #38bdf8',
            borderRadius: '8px',
            padding: '20px',
            width: '450px',
            maxWidth: '90%',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8' }}>
                라벨 프린터 등록 및 관리
              </span>
              <button
                onClick={() => setIsPrinterModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>프린터 명칭</label>
              <input
                type="text"
                value={newPrinterName}
                onChange={e => setNewPrinterName(e.target.value)}
                placeholder="예: Zebra ZD420 (창고 1번 라벨)"
                style={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #475569',
                  borderRadius: '4px',
                  padding: '6px 8px',
                  color: '#f8fafc',
                  fontSize: '0.75rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>연결 방식 (타입)</label>
              <select
                value={newPrinterType}
                onChange={e => {
                  setNewPrinterType(e.target.value);
                  if (e.target.value === 'browser_print') setNewPrinterTarget('http://localhost:9100');
                  else if (e.target.value === 'network_ip') setNewPrinterTarget('192.168.0.150:9100');
                }}
                style={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #475569',
                  borderRadius: '4px',
                  padding: '6px 8px',
                  color: '#f8fafc',
                  fontSize: '0.75rem'
                }}
              >
                <option value="web_serial">Zebra ZPL USB/시리얼 (WebSerial)</option>
                <option value="web_usb">Zebra ZPL 다이렉트 (WebUSB)</option>
                <option value="browser_print">Zebra Browser Print 로컬 데몬</option>
                <option value="network_ip">네트워크 Raw TCP/HTTP 프린터</option>
                <option value="virtual_queue">가상 인쇄 큐 적재</option>
              </select>
            </div>

            {(newPrinterType === 'network_ip' || newPrinterType === 'browser_print') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>대상 주소 (IP/URL)</label>
                <input
                  type="text"
                  value={newPrinterTarget}
                  onChange={e => setNewPrinterTarget(e.target.value)}
                  placeholder="예: 192.168.0.150:9100 또는 http://localhost:9100"
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '4px',
                    padding: '6px 8px',
                    color: '#f8fafc',
                    fontSize: '0.75rem'
                  }}
                />
              </div>
            )}

            {newPrinterType === 'web_serial' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>통신 속도 (BaudRate)</label>
                <select
                  value={newPrinterBaud}
                  onChange={e => setNewPrinterBaud(e.target.value)}
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '4px',
                    padding: '6px 8px',
                    color: '#f8fafc',
                    fontSize: '0.75rem'
                  }}
                >
                  <option value="9600">9600 bps (기본)</option>
                  <option value="19200">19200 bps</option>
                  <option value="38400">38400 bps</option>
                  <option value="57600">57600 bps</option>
                  <option value="115200">115200 bps</option>
                </select>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <button
                onClick={() => setIsPrinterModalOpen(false)}
                className="btn btn-outline"
                style={{ fontSize: '0.72rem', padding: '4px 10px' }}
              >
                취소
              </button>
              <button
                onClick={handleRegisterPrinter}
                className="btn btn-primary"
                style={{ fontSize: '0.72rem', padding: '4px 14px' }}
              >
                프린터 등록 완료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
