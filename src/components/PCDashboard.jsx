import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Download, Printer, Search, Plus, Trash2, Edit3, CheckCircle, Database, Zap, Upload, Table, CheckSquare, Clock } from 'lucide-react';
import { fetchScansFromSupabase, subscribeRealtimeScans, deleteScanFromSupabase, saveScansToSupabase, deleteAllScansFromSupabase } from '../utils/supabaseClient';

export default function PCDashboard({
  onError,
  onOpenExportModal,
  onOpenPrintModal,
  onOpenConfigModal,
  onOpenImportModal,
  offsetConfig
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Drawer/Modal toggle for viewing full data table
  const [showTableDrawer, setShowTableDrawer] = useState(false);

  // Realtime Auto-Print Toggle Switch
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(false);
  const autoPrintRef = useRef(false);

  useEffect(() => {
    autoPrintRef.current = autoPrintEnabled;
  }, [autoPrintEnabled]);

  // Load scans strictly from DB (No seed fallback!)
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchScansFromSupabase();
      // If DB has no data, set empty array [] (Do NOT load seed fallback!)
      setItems(data || []);
    } catch (err) {
      console.warn('Realtime fetch warning:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to Supabase Realtime channel for live mobile scans
    const channel = subscribeRealtimeScans((newRecord) => {
      setItems((prev) => [newRecord, ...prev]);

      if (autoPrintRef.current) {
        console.log('[Auto-Print Triggered] Mobile scan received:', newRecord);
        onOpenPrintModal([newRecord], offsetConfig);
      }
    });

    return () => {
      if (channel) channel.unsubscribe();
    };
  }, []);

  // Production KPI Metrics
  const printedItemsCount = items.filter(i => i.status === 'EXPORTED' || i.status === 'PRINTED').length;
  const pendingItemsCount = items.length - printedItemsCount;

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

      {/* Production KPI Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px'
      }}>
        {/* KPI Card 1: Unprinted Pending */}
        <div style={{
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '10px',
          padding: '14px 18px',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>출력 대기 IMEI</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#facc15', marginTop: '2px' }}>
              {pendingItemsCount} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#94a3b8' }}>건</span>
            </div>
          </div>
          <Clock size={28} style={{ color: '#facc15', opacity: 0.8 }} />
        </div>

        {/* KPI Card 2: Printed Completed */}
        <div style={{
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '10px',
          padding: '14px 18px',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>출력 완료 라벨</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
              {printedItemsCount} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#94a3b8' }}>매</span>
            </div>
          </div>
          <CheckSquare size={28} style={{ color: '#10b981', opacity: 0.8 }} />
        </div>

        {/* KPI Card 3: Total IMEI Count */}
        <div style={{
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '10px',
          padding: '14px 18px',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>전체 수집 수량</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
              {items.length} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#94a3b8' }}>건</span>
            </div>
          </div>
          <Database size={28} style={{ color: '#38bdf8', opacity: 0.8 }} />
        </div>
      </div>

      {/* Main Production Toolbar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justify: 'space-between',
        alignItems: 'center',
        gap: '12px',
        backgroundColor: '#1e293b',
        padding: '14px 18px',
        borderRadius: '10px',
        border: '1px solid #334155'
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={loadData} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            {loading ? '동기화 중...' : '새로고침'}
          </button>

          <button className="btn btn-outline" onClick={onOpenConfigModal}>
            <Database size={15} />
            DB 연동 설정
          </button>

          <button className="btn btn-outline" style={{ borderColor: '#f43f5e', color: '#fda4af' }} onClick={onOpenImportModal}>
            <Upload size={15} />
            양식 덮어쓰기 / 업로드
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-outline"
            style={{ borderColor: '#38bdf8', color: '#7dd3fc' }}
            onClick={() => setShowTableDrawer(!showTableDrawer)}
          >
            <Table size={15} />
            {showTableDrawer ? '수집 목록 닫기' : `수집 데이터 목록 보기 (${items.length}건)`}
          </button>

          <button
            className="btn btn-success"
            onClick={() => onOpenExportModal(selectedObjects.length > 0 ? selectedObjects : items)}
            disabled={items.length === 0}
          >
            <Download size={15} />
            엑셀/CSV 내보내기
          </button>

          <button
            className="btn btn-primary"
            onClick={() => onOpenPrintModal(selectedObjects.length > 0 ? selectedObjects : items, offsetConfig)}
            disabled={items.length === 0}
          >
            <Printer size={15} />
            Code 39 라벨 인쇄 ({selectedObjects.length || items.length}매)
          </button>
        </div>
      </div>

      {/* Empty State Banner when 0 items */}
      {items.length === 0 && !loading && (
        <div style={{
          backgroundColor: '#0f172a',
          border: '2px dashed #334155',
          borderRadius: '12px',
          padding: '40px 20px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Database size={40} style={{ color: '#64748b' }} />
          <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#f8fafc' }}>
            수집되거나 업로드된 IMEI 데이터가 없습니다
          </h4>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', maxWidth: '450px' }}>
            상단의 <strong>[양식 덮어쓰기 / 업로드]</strong> 버튼을 클릭하여 엑셀 양식을 업로드하거나, 모바일 핸드폰 스캐너로 기기 IMEI를 스캔하세요.
          </p>
          <button className="btn btn-primary" style={{ marginTop: '8px' }} onClick={onOpenImportModal}>
            <Upload size={16} /> 엑셀 파일 직접 업로드하기
          </button>
        </div>
      )}

      {/* Drawer Data Table View (Collapsible) */}
      {showTableDrawer && items.length > 0 && (
        <div style={{
          backgroundColor: '#1e293b',
          borderRadius: '10px',
          border: '1px solid #334155',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                className="form-input"
                placeholder="자산번호, IMEI, MAC, 시리얼 검색..."
                style={{ paddingLeft: '32px', width: '100%', fontSize: '0.85rem' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {selectedIds.length > 0 && (
              <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={handleDeleteSelected}>
                <Trash2 size={14} /> 선택 삭제 ({selectedIds.length})
              </button>
            )}
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '350px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                  <th style={{ padding: '10px 12px', width: '40px' }} className="nowrap-cell">
                    <input
                      type="checkbox"
                      checked={selectedIds.length > 0 && selectedIds.length === filteredItems.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th style={{ padding: '10px 12px', color: '#38bdf8', fontWeight: 700 }} className="nowrap-cell">자산번호 (A)</th>
                  <th style={{ padding: '10px 12px', color: '#facc15', fontWeight: 700 }} className="nowrap-cell">IMEI (B)</th>
                  <th style={{ padding: '10px 12px', color: '#f43f5e', fontWeight: 700 }} className="nowrap-cell">MAC Address (C)</th>
                  <th style={{ padding: '10px 12px', color: '#a855f7', fontWeight: 700 }} className="nowrap-cell">시리얼 (D)</th>
                  <th style={{ padding: '10px 12px' }} className="nowrap-cell">스캔/등록 일시</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }} className="nowrap-cell">인쇄 상태</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid #334155',
                        backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.15)' : 'transparent'
                      }}
                    >
                      <td style={{ padding: '10px 12px' }} className="nowrap-cell">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(item.id)}
                        />
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#38bdf8' }} className="nowrap-cell">{item.asset_no}</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 700, color: '#fef08a' }} className="nowrap-cell">{item.imei}</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#fda4af' }} className="nowrap-cell">{item.mac_address || '-'}</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#d8b4fe' }} className="nowrap-cell">{item.serial_no || '-'}</td>
                      <td style={{ padding: '10px 12px', color: '#94a3b8', fontSize: '0.78rem' }} className="nowrap-cell">
                        {new Date(item.created_at || item.scanned_at || Date.now()).toLocaleString('ko-KR')}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }} className="nowrap-cell">
                        <span style={{
                          padding: '3px 6px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          backgroundColor: item.status === 'EXPORTED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                          color: item.status === 'EXPORTED' ? '#6ee7b7' : '#fef08a'
                        }}>
                          {item.status === 'EXPORTED' ? '인쇄 완료' : '출력 대기'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
