import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  Printer,
  Sliders,
  RefreshCw,
  Layers,
  Settings
} from 'lucide-react';
import PCDashboard from '../components/PCDashboard';
import LabelOffsetController, { getStoredOffsetConfig, saveStoredOffsetConfig } from '../components/LabelOffsetController';
import LabelDesignerTab from './LabelDesignerTab';
import SchemaBuilderTab from './SchemaBuilderTab';
import { generateZplCode, sendZplToWebSerial } from '../utils/zplPrinter';
import { getSupabaseClient } from '../utils/supabaseClient';

const STATUS_MAP = {
  PENDING:  { label: '대기중',    color: '#f59e0b', bg: '#451a03' },
  PRINTING: { label: '출력중',    color: '#60a5fa', bg: '#0c2340' },
  PRINTED:  { label: '출력완료',  color: '#4ade80', bg: '#052e16' },
  ERROR:    { label: '오류',      color: '#f87171', bg: '#3b0000' },
};

function PrintQueueMonitor() {
  const [queueItems, setQueueItems] = useState([]);
  const [stats, setStats] = useState({ PENDING: 0, PRINTING: 0, PRINTED: 0, ERROR: 0 });
  const [agentSeen, setAgentSeen] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef(null);

  const loadQueueData = async () => {
    const client = getSupabaseClient();
    if (!client) { setIsLoading(false); return; }

    const { data, error } = await client
      .from('print_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) { setIsLoading(false); return; }

    setQueueItems(data || []);
    setIsLoading(false);

    const s = { PENDING: 0, PRINTING: 0, PRINTED: 0, ERROR: 0 };
    (data || []).forEach(row => { if (s[row.print_status] !== undefined) s[row.print_status]++; });
    setStats(s);

    const latestAgent = (data || []).find(r => r.agent_id)?.agent_id;
    if (latestAgent) setAgentSeen(latestAgent);
  };

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
    { key: 'PENDING',  label: '대기' },
    { key: 'PRINTING', label: '출력중' },
    { key: 'PRINTED',  label: '완료' },
    { key: 'ERROR',    label: '오류' },
  ];

  return (
    <div style={{
      backgroundColor: '#1e293b',
      border: '1px solid #334155',
      borderRadius: '8px',
      padding: '10px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.85rem' }}>
            프린트 큐 모니터
          </span>
          <span style={{
            fontSize: '0.65rem',
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: agentSeen ? '#052e16' : '#1c1917',
            color: agentSeen ? '#4ade80' : '#78716c',
            border: `1px solid ${agentSeen ? '#4ade80' : '#44403c'}`
          }}>
            {agentSeen ? `에이전트: ${agentSeen}` : '에이전트 미감지'}
          </span>
        </div>
        <button
          onClick={loadQueueData}
          className="btn btn-outline"
          style={{ fontSize: '0.72rem', padding: '3px 8px' }}
        >
          <RefreshCw size={11} /> 새로고침
        </button>
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {statItems.map(({ key, label }) => (
          <div key={key} style={{
            flex: '1 1 60px',
            backgroundColor: STATUS_MAP[key].bg,
            border: `1px solid ${STATUS_MAP[key].color}44`,
            borderRadius: '6px',
            padding: '6px 8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: STATUS_MAP[key].color, lineHeight: 1.1 }}>
              {stats[key]}
            </div>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '2px' }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div style={{ color: '#64748b', fontSize: '0.75rem', textAlign: 'center', padding: '12px' }}>로딩중</div>
      ) : queueItems.length === 0 ? (
        <div style={{ color: '#64748b', fontSize: '0.75rem', textAlign: 'center', padding: '16px' }}>
          대기중인 인쇄 요청 없음
        </div>
      ) : (
        <div style={{ overflowX: 'auto', maxHeight: '360px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', color: '#64748b', position: 'sticky', top: 0, backgroundColor: '#1e293b' }}>
                <th style={{ padding: '4px 6px', textAlign: 'left' }}>상태</th>
                <th style={{ padding: '4px 6px', textAlign: 'left' }}>키 값</th>
                <th style={{ padding: '4px 6px', textAlign: 'left' }}>관리번호</th>
                <th style={{ padding: '4px 6px', textAlign: 'left' }}>IMEI</th>
                <th style={{ padding: '4px 6px', textAlign: 'left' }}>요청시각</th>
                <th style={{ padding: '4px 6px', textAlign: 'left' }}>완료시각</th>
                <th style={{ padding: '4px 6px', textAlign: 'left' }}>에이전트</th>
              </tr>
            </thead>
            <tbody>
              {queueItems.map(row => {
                const st = STATUS_MAP[row.print_status] || STATUS_MAP.PENDING;
                const createdAt = row.created_at ? new Date(row.created_at).toLocaleTimeString('ko-KR', { hour12: false }) : '-';
                const printedAt = row.printed_at  ? new Date(row.printed_at).toLocaleTimeString('ko-KR', { hour12: false }) : '-';
                const assetNo = row.asset_no || row.record_data?.asset_no || row.key_value || '-';
                const imei = row.imei || row.record_data?.imei || '-';

                return (
                  <tr key={row.id} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '4px 6px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '1px 6px',
                        borderRadius: '12px',
                        backgroundColor: st.bg,
                        color: st.color,
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        border: `1px solid ${st.color}55`
                      }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ padding: '4px 6px', color: '#38bdf8', fontWeight: 600 }}>{row.key_value}</td>
                    <td style={{ padding: '4px 6px', color: '#f1f5f9' }}>{assetNo}</td>
                    <td style={{ padding: '4px 6px', color: '#cbd5e1', fontFamily: 'monospace' }}>{imei}</td>
                    <td style={{ padding: '4px 6px', color: '#64748b' }}>{createdAt}</td>
                    <td style={{ padding: '4px 6px', color: '#64748b' }}>{printedAt}</td>
                    <td style={{ padding: '4px 6px', color: '#475569', fontSize: '0.65rem' }}>{row.agent_id || '-'}</td>
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

export default function PCDashboardView({
  onError,
  onOpenExportModal,
  onOpenPrintModal,
  onOpenConfigModal,
  onOpenImportModal,
  onOpenPrinterGuide
}) {
  // 'designer' | 'schema' | 'data' | 'queue'
  const [activeTab, setActiveTab] = useState('designer');
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
      alert(res.message || 'ZPL 라벨 프린터 전송 완료');
    } catch (err) {
      onError(err.message || 'ZPL 직접 출력 실패');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      {/* Sub Navigation Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '8px',
        padding: '4px 8px',
        flexWrap: 'wrap',
        gap: '4px'
      }}>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('designer')}
            className={`btn ${activeTab === 'designer' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.75rem', padding: '4px 10px', border: activeTab === 'designer' ? 'none' : '1px solid #475569' }}
          >
            라벨 서식 디자인
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`btn ${activeTab === 'schema' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.75rem', padding: '4px 10px', border: activeTab === 'schema' ? 'none' : '1px solid #475569' }}
          >
            스키마 빌더
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`btn ${activeTab === 'data' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.75rem', padding: '4px 10px', border: activeTab === 'data' ? 'none' : '1px solid #475569' }}
          >
            데이터 목록
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`btn ${activeTab === 'queue' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.75rem', padding: '4px 10px', border: activeTab === 'queue' ? 'none' : '1px solid #475569' }}
          >
            프린트 큐 모니터
          </button>
        </div>
      </div>

      {/* Tab 1: 라벨 서식 디자인 */}
      {activeTab === 'designer' && (
        <LabelDesignerTab
          onError={onError}
          onOpenPrintModal={(items) => onOpenPrintModal(items, offsetConfig)}
        />
      )}

      {/* Tab 2: 스키마 빌더 */}
      {activeTab === 'schema' && (
        <SchemaBuilderTab
          onError={onError}
          onSchemaUpdated={() => {}}
        />
      )}

      {/* Tab 3: 데이터 목록 */}
      {activeTab === 'data' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <LabelOffsetController
            offsetConfig={offsetConfig}
            onChangeConfig={setOffsetConfig}
            onResetConfig={handleResetConfig}
            onTestPrint={handleTestPrint}
            onOpenPrinterGuide={onOpenPrinterGuide}
            onZplDirectPrint={handleZplDirectPrint}
          />
          <PCDashboard
            onError={onError}
            onOpenExportModal={onOpenExportModal}
            onOpenPrintModal={(items) => onOpenPrintModal(items, offsetConfig)}
            onOpenConfigModal={onOpenConfigModal}
            onOpenImportModal={onOpenImportModal}
            offsetConfig={offsetConfig}
          />
        </div>
      )}

      {/* Tab 4: 프린트 큐 모니터 */}
      {activeTab === 'queue' && (
        <PrintQueueMonitor />
      )}
    </div>
  );
}
