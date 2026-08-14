import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Download, Printer, Search, Plus, Trash2, Edit3, CheckCircle, Database, Zap } from 'lucide-react';
import { fetchScansFromSupabase, subscribeRealtimeScans, deleteScanFromSupabase } from '../utils/supabaseClient';

export default function PCDashboard({ onError, onOpenExportModal, onOpenPrintModal, onOpenConfigModal }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Realtime Auto-Print Toggle Switch
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(false);
  const autoPrintRef = useRef(false);

  useEffect(() => {
    autoPrintRef.current = autoPrintEnabled;
  }, [autoPrintEnabled]);

  // Load initial scans from Supabase
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchScansFromSupabase();
      if (data && data.length > 0) {
        setItems(data);
      } else {
        setItems(sampleData);
      }
    } catch (err) {
      console.warn('Realtime fetch warning:', err);
      setItems(sampleData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to Supabase Realtime channel for live mobile scans
    const channel = subscribeRealtimeScans((newRecord) => {
      setItems((prev) => [newRecord, ...prev]);

      // If Auto Print Mode is ON, immediately trigger Label Printing Modal/Dialog on PC!
      if (autoPrintRef.current) {
        console.log('[Auto-Print Triggered] Mobile scan received:', newRecord);
        onOpenPrintModal([newRecord]);
      }
    });

    return () => {
      if (channel) channel.unsubscribe();
    };
  }, []);

  // Filtered Items
  const filteredItems = items.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      (item.asset_no && item.asset_no.toLowerCase().includes(q)) ||
      (item.imei && item.imei.toLowerCase().includes(q)) ||
      (item.mac_address && item.mac_address.toLowerCase().includes(q)) ||
      (item.serial_no && item.serial_no.toLowerCase().includes(q))
    );
  });

  // Checkbox handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredItems.map((i) => i.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`선택한 ${selectedIds.length}건의 데이터를 삭제하시겠습니까?`)) return;

    try {
      for (const id of selectedIds) {
        await deleteScanFromSupabase(id);
      }
      setItems((prev) => prev.filter((item) => !selectedIds.includes(item.id)));
      setSelectedIds([]);
    } catch (err) {
      onError(err.message || '삭제 중 오류가 발생했습니다.');
    }
  };

  const selectedObjects = items.filter((i) => selectedIds.includes(i.id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Realtime Auto-Print Controller Banner */}
      <div style={{
        backgroundColor: autoPrintEnabled ? 'rgba(16, 185, 129, 0.15)' : '#1e293b',
        border: `1px solid ${autoPrintEnabled ? 'var(--accent-green)' : '#334155'}`,
        padding: '14px 20px',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        transition: 'all 0.3s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Zap size={22} style={{ color: autoPrintEnabled ? '#10b981' : '#94a3b8' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: autoPrintEnabled ? '#6ee7b7' : '#f8fafc' }}>
              모바일 스캔 ➔ PC 실시간 자동 라벨 인쇄 모드 (Auto Scan-to-Print)
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              {autoPrintEnabled
                ? '★ 활성화됨: 핸드폰에서 IMEI를 스캔하면 PC에서 0.1초 만에 라벨이 자동 인쇄됩니다.'
                : '스위치를 켜면 핸드폰 수집 시 PC에 연결된 라벨 프린터로 라벨이 즉시 자동 출력됩니다.'}
            </div>
          </div>
        </div>

        <button
          className={`btn ${autoPrintEnabled ? 'btn-success' : 'btn-outline'}`}
          onClick={() => setAutoPrintEnabled(!autoPrintEnabled)}
          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
        >
          <Printer size={16} />
          {autoPrintEnabled ? '자동 라벨 인쇄 [ON]' : '자동 라벨 인쇄 [OFF]'}
        </button>
      </div>

      {/* Action Toolbar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justify: 'space-between',
        alignItems: 'center',
        gap: '12px',
        backgroundColor: '#1e293b',
        padding: '16px',
        borderRadius: '10px',
        border: '1px solid #334155'
      }}>
        {/* Search Bar */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            className="form-input"
            placeholder="자산번호, IMEI, MAC, 시리얼 검색..."
            style={{ paddingLeft: '34px', width: '100%' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <button className="btn btn-outline" onClick={loadData} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            {loading ? '동기화 중...' : '새로고침'}
          </button>

          <button className="btn btn-outline" onClick={onOpenConfigModal}>
            <Database size={16} />
            DB 연동 설정
          </button>

          <button
            className="btn btn-success"
            onClick={() => onOpenExportModal(selectedObjects.length > 0 ? selectedObjects : filteredItems)}
            disabled={filteredItems.length === 0}
          >
            <Download size={16} />
            엑셀/CSV 내보내기 ({selectedObjects.length || filteredItems.length}건)
          </button>

          <button
            className="btn btn-primary"
            onClick={() => onOpenPrintModal(selectedObjects.length > 0 ? selectedObjects : filteredItems)}
            disabled={filteredItems.length === 0}
          >
            <Printer size={16} />
            Code 39 라벨 수동 인쇄 ({selectedObjects.length || filteredItems.length}매)
          </button>

          {selectedIds.length > 0 && (
            <button className="btn btn-danger" onClick={handleDeleteSelected}>
              <Trash2 size={16} />
              선택 삭제 ({selectedIds.length})
            </button>
          )}
        </div>
      </div>

      {/* Main Data Table (Image 2 Columns 100% Match) */}
      <div style={{
        backgroundColor: '#1e293b',
        borderRadius: '10px',
        border: '1px solid #334155',
        overflowX: 'auto',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
              <th style={{ padding: '12px 16px', width: '40px' }} className="nowrap-cell">
                <input
                  type="checkbox"
                  checked={selectedIds.length > 0 && selectedIds.length === filteredItems.length}
                  onChange={handleSelectAll}
                />
              </th>
              <th style={{ padding: '12px 16px', color: '#38bdf8', fontWeight: 700 }} className="nowrap-cell">
                자산번호 (A)
              </th>
              <th style={{ padding: '12px 16px', color: '#facc15', fontWeight: 700 }} className="nowrap-cell">
                IMEI (B)
              </th>
              <th style={{ padding: '12px 16px', color: '#f43f5e', fontWeight: 700 }} className="nowrap-cell">
                MAC Address (C)
              </th>
              <th style={{ padding: '12px 16px', color: '#a855f7', fontWeight: 700 }} className="nowrap-cell">
                시리얼 (D)
              </th>
              <th style={{ padding: '12px 16px' }} className="nowrap-cell">
                스캔 일시
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }} className="nowrap-cell">
                상태
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  등록된 데이터가 없습니다. 핸드폰 모바일 스캐너에서 IMEI를 수집하거나 DB를 동기화하세요.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: '1px solid #334155',
                      backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.15)' : 'transparent',
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    <td style={{ padding: '12px 16px' }} className="nowrap-cell">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(item.id)}
                      />
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#38bdf8' }} className="nowrap-cell">
                      {item.asset_no}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 700, color: '#fef08a' }} className="nowrap-cell">
                      {item.imei}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#fda4af' }} className="nowrap-cell">
                      {item.mac_address || '-'}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#d8b4fe' }} className="nowrap-cell">
                      {item.serial_no || '-'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '0.8rem' }} className="nowrap-cell">
                      {new Date(item.created_at || item.scanned_at || Date.now()).toLocaleString('ko-KR')}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }} className="nowrap-cell">
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: item.status === 'EXPORTED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(37, 99, 235, 0.2)',
                        color: item.status === 'EXPORTED' ? '#6ee7b7' : '#93c5fd'
                      }}>
                        {item.status === 'EXPORTED' ? '내보냄' : '수집완료'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const sampleData = [
  { id: 'sample_1', asset_no: '11112222', imei: '351379300225052', mac_address: '4CEBB0B57A51', serial_no: 'R5KL60F0CZW', status: 'COMPLETED', created_at: new Date().toISOString() },
  { id: 'sample_2', asset_no: '22223333', imei: '351379300224790', mac_address: '4CEBB0B57A1D', serial_no: 'R5KL60F0C6F', status: 'COMPLETED', created_at: new Date().toISOString() },
  { id: 'sample_3', asset_no: '33334444', imei: '351379300224774', mac_address: '4CEBB0B57A19', serial_no: 'R5KL60F0C4M', status: 'COMPLETED', created_at: new Date().toISOString() },
  { id: 'sample_4', asset_no: '44445555', imei: '351379300224725', mac_address: '4CEBB0B57A0F', serial_no: 'R5KL60F0BZE', status: 'COMPLETED', created_at: new Date().toISOString() },
  { id: 'sample_5', asset_no: '55556666', imei: '351379300224592', mac_address: '4CEBB0B579F5', serial_no: 'R5KL60F0BKV', status: 'COMPLETED', created_at: new Date().toISOString() }
];
