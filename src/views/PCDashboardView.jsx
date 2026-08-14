import React, { useState, useEffect, useRef } from 'react';
import PCDashboard from '../components/PCDashboard';
import LabelOffsetController, { getStoredOffsetConfig, saveStoredOffsetConfig } from '../components/LabelOffsetController';
import { generateZplCode, sendZplToWebSerial } from '../utils/zplPrinter';
import { getSupabaseClient } from '../utils/supabaseClient';

// ── 프린트 큐 상태 색상 맵 ─────────────────────────────────
const STATUS_MAP = {
  PENDING:  { label: '대기중',    color: '#f59e0b', bg: '#451a03' },
  PRINTING: { label: '출력중',    color: '#60a5fa', bg: '#0c2340' },
  PRINTED:  { label: '출력완료',  color: '#4ade80', bg: '#052e16' },
  ERROR:    { label: '오류',      color: '#f87171', bg: '#3b0000' },
};

// ── 프린트 큐 모니터링 패널 ────────────────────────────────
function PrintQueueMonitor() {
  const [queueItems, setQueueItems] = useState([]);
  const [stats, setStats] = useState({ PENDING: 0, PRINTING: 0, PRINTED: 0, ERROR: 0 });
  const [agentSeen, setAgentSeen] = useState(null); // 마지막으로 감지된 에이전트 ID
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef(null);

  // 큐 데이터 로드
  const loadQueueData = async () => {
    const client = getSupabaseClient();
    if (!client) { setIsLoading(false); return; }

    const { data, error } = await client
      .from('print_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) { console.error('print_queue 조회 실패:', error); setIsLoading(false); return; }

    setQueueItems(data || []);
    setIsLoading(false);

    // 집계
    const s = { PENDING: 0, PRINTING: 0, PRINTED: 0, ERROR: 0 };
    (data || []).forEach(row => { if (s[row.print_status] !== undefined) s[row.print_status]++; });
    setStats(s);

    // 가장 최근에 활동한 에이전트 ID
    const latestAgent = (data || []).find(r => r.agent_id)?.agent_id;
    if (latestAgent) setAgentSeen(latestAgent);
  };

  // Realtime 구독: INSERT / UPDATE 이벤트 감지 → 재로드
  useEffect(() => {
    loadQueueData();

    const client = getSupabaseClient();
    if (!client) return;

    const channel = client
      .channel('pc-dashboard-print-queue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'print_queue' }, () => {
        loadQueueData();
      })
      .subscribe();

    channelRef.current = channel;
    return () => { channel.unsubscribe(); };
  }, []);

  const statItems = [
    { key: 'PENDING',  icon: '⏳', label: '대기' },
    { key: 'PRINTING', icon: '🔄', label: '출력중' },
    { key: 'PRINTED',  icon: '✅', label: '완료' },
    { key: 'ERROR',    icon: '❌', label: '오류' },
  ];

  return (
    <div style={{
      backgroundColor: '#1e293b',
      border: '1px solid #334155',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '20px'
    }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.1rem' }}>🖨️</span>
          <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
            프린트 큐 모니터
          </span>
          <span style={{
            fontSize: '0.68rem',
            padding: '2px 8px',
            borderRadius: '20px',
            backgroundColor: agentSeen ? '#052e16' : '#1c1917',
            color: agentSeen ? '#4ade80' : '#78716c',
            border: `1px solid ${agentSeen ? '#4ade80' : '#44403c'}`,
            whiteSpace: 'nowrap'
          }}>
            {agentSeen ? `에이전트 활성: ${agentSeen}` : '에이전트 미감지'}
          </span>
        </div>
        <button
          onClick={loadQueueData}
          style={{
            background: 'transparent',
            border: '1px solid #475569',
            borderRadius: '6px',
            color: '#94a3b8',
            fontSize: '0.72rem',
            padding: '3px 10px',
            cursor: 'pointer'
          }}
        >
          🔄 새로고침
        </button>
      </div>

      {/* 통계 카드 */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
        {statItems.map(({ key, icon, label }) => (
          <div key={key} style={{
            flex: '1 1 70px',
            backgroundColor: STATUS_MAP[key].bg,
            border: `1px solid ${STATUS_MAP[key].color}44`,
            borderRadius: '8px',
            padding: '10px 12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.2rem' }}>{icon}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: STATUS_MAP[key].color, lineHeight: 1.1 }}>
              {stats[key]}
            </div>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', whiteSpace: 'nowrap', marginTop: '2px' }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* 최근 이력 테이블 */}
      {isLoading ? (
        <div style={{ color: '#64748b', fontSize: '0.8rem', textAlign: 'center', padding: '12px' }}>로딩 중...</div>
      ) : queueItems.length === 0 ? (
        <div style={{ color: '#64748b', fontSize: '0.8rem', textAlign: 'center', padding: '12px' }}>
          아직 출력 요청이 없습니다. 모바일에서 IMEI를 확정하면 여기에 표시됩니다.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', color: '#64748b' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left', whiteSpace: 'nowrap' }}>상태</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', whiteSpace: 'nowrap' }}>관리번호</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', whiteSpace: 'nowrap' }}>IMEI</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', whiteSpace: 'nowrap' }}>시리얼</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', whiteSpace: 'nowrap' }}>요청시각</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', whiteSpace: 'nowrap' }}>완료시각</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', whiteSpace: 'nowrap' }}>에이전트</th>
              </tr>
            </thead>
            <tbody>
              {queueItems.map(row => {
                const st = STATUS_MAP[row.print_status] || STATUS_MAP.PENDING;
                const createdAt = row.created_at ? new Date(row.created_at).toLocaleString('ko-KR', { hour12: false }) : '-';
                const printedAt = row.printed_at  ? new Date(row.printed_at).toLocaleString('ko-KR', { hour12: false }) : '-';
                return (
                  <tr key={row.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '5px 8px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '20px',
                        backgroundColor: st.bg,
                        color: st.color,
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        border: `1px solid ${st.color}55`,
                        whiteSpace: 'nowrap'
                      }}>
                        {st.label}
                      </span>
                      {row.print_status === 'ERROR' && row.print_error && (
                        <span title={row.print_error} style={{ marginLeft: '4px', cursor: 'help', color: '#f87171' }}>⚠</span>
                      )}
                    </td>
                    <td style={{ padding: '5px 8px', color: '#f1f5f9', fontWeight: 600, whiteSpace: 'nowrap' }}>{row.asset_no}</td>
                    <td style={{ padding: '5px 8px', color: '#cbd5e1', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{row.imei}</td>
                    <td style={{ padding: '5px 8px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{row.serial_no || '-'}</td>
                    <td style={{ padding: '5px 8px', color: '#64748b', whiteSpace: 'nowrap' }}>{createdAt}</td>
                    <td style={{ padding: '5px 8px', color: '#64748b', whiteSpace: 'nowrap' }}>{printedAt}</td>
                    <td style={{ padding: '5px 8px', color: '#475569', fontSize: '0.68rem', whiteSpace: 'nowrap' }}>{row.agent_id || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── PC 대시보드 메인 뷰 ────────────────────────────────────
export default function PCDashboardView({
  onError,
  onOpenExportModal,
  onOpenPrintModal,
  onOpenConfigModal,
  onOpenImportModal,
  onOpenPrinterGuide
}) {
  const [offsetConfig, setOffsetConfig] = useState(getStoredOffsetConfig());

  const handleResetConfig = () => {
    const defaultConfig = {
      offsetX: 0,
      offsetY: 0,
      fontSize: 11,
      barcodeHeight: 11,
      zplMode: false
    };
    saveStoredOffsetConfig(defaultConfig);
    setOffsetConfig(defaultConfig);
  };

  const handleTestPrint = () => {
    const testSampleItem = [{
      id: 'test_sample_1',
      asset_no: 'TEST0001',
      imei: '351379300225052',
      mac_address: '4CEBB0B57A51',
      serial_no: 'R5KL60F0CZW',
      status: 'TEST'
    }];
    onOpenPrintModal(testSampleItem, offsetConfig);
  };

  // Direct ZPL Raw Thermal Printer Output Action (No Windows Print Popup)
  const handleZplDirectPrint = async () => {
    const testSampleItem = {
      asset_no: 'TEST0001',
      imei: '351379300225052',
      mac_address: '4CEBB0B57A51',
      serial_no: 'R5KL60F0CZW'
    };
    try {
      const zplCode = generateZplCode(testSampleItem, offsetConfig);
      const res = await sendZplToWebSerial(zplCode);
      alert(res.message || 'ZPL 라벨 프린터로 테스트 출력이 즉시 전송되었습니다!');
    } catch (err) {
      console.error('ZPL direct print error:', err);
      onError(err.message || 'ZPL 직접 출력 실패: 시리얼/USB 연결을 확인해주세요.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 🖨️ Supabase print_queue 실시간 모니터링 패널 */}
      <PrintQueueMonitor />

      {/* PC Printer Offset Calibration & Fine-Tuning Panel */}
      <LabelOffsetController
        offsetConfig={offsetConfig}
        onChangeConfig={setOffsetConfig}
        onResetConfig={handleResetConfig}
        onTestPrint={handleTestPrint}
        onOpenPrinterGuide={onOpenPrinterGuide}
        onZplDirectPrint={handleZplDirectPrint}
      />

      {/* Main Production Dashboard */}
      <PCDashboard
        onError={onError}
        onOpenExportModal={onOpenExportModal}
        onOpenPrintModal={(items) => onOpenPrintModal(items, offsetConfig)}
        onOpenConfigModal={onOpenConfigModal}
        onOpenImportModal={onOpenImportModal}
        offsetConfig={offsetConfig}
      />
    </div>
  );
}
