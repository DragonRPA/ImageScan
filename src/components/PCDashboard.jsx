import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Download,
  Upload,
  Search,
  Trash2,
  Filter,
  RotateCcw,
  CheckSquare,
  Square,
  Printer,
  SlidersHorizontal
} from 'lucide-react';
import {
  fetchScansFromSupabase,
  subscribeRealtimeScans,
  deleteScanFromSupabase,
  deleteAllScansFromSupabase
} from '../utils/supabaseClient';

export default function PCDashboard({
  onError,
  onOpenExportModal,
  onOpenPrintModal,
  onOpenImportModal
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // 조회 필터 상태
  const [filterModel, setFilterModel] = useState('');
  const [filterSerial, setFilterSerial] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchGeneral, setSearchGeneral] = useState('');

  // 선택된 항목 IDs
  const [selectedIds, setSelectedIds] = useState([]);

  // 데이터 로드
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchScansFromSupabase();
      setItems(data || []);
    } catch (err) {
      console.warn('데이터 로드 경고:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Supabase 실시간 동기화
    const channel = subscribeRealtimeScans((newRecord) => {
      setItems((prev) => {
        const exists = prev.some(r => r.id === newRecord.id || (r.asset_no && r.asset_no === newRecord.asset_no));
        if (exists) {
          return prev.map(r => (r.id === newRecord.id || r.asset_no === newRecord.asset_no) ? newRecord : r);
        }
        return [newRecord, ...prev];
      });
    });

    return () => {
      if (channel) channel.unsubscribe();
    };
  }, []);

  // 필터 초기화
  const handleResetFilters = () => {
    setFilterModel('');
    setFilterSerial('');
    setFilterStatus('ALL');
    setSearchGeneral('');
    setSelectedIds([]);
  };

  // 필터링 적용된 목록 계산
  const filteredItems = items.filter((item) => {
    // 1. 모델명 필터
    if (filterModel.trim()) {
      const targetModel = (item.model_name || item.data?.model_name || '').toLowerCase();
      if (!targetModel.includes(filterModel.trim().toLowerCase())) return false;
    }

    // 2. 제조번호(시리얼) 필터
    if (filterSerial.trim()) {
      const targetSerial = (item.serial_no || item.data?.serial_no || item.imei || '').toLowerCase();
      if (!targetSerial.includes(filterSerial.trim().toLowerCase())) return false;
    }

    // 3. 자산상태 필터
    if (filterStatus !== 'ALL') {
      const targetStatus = (item.asset_status || item.data?.asset_status || item.status || 'AVAILABLE').toUpperCase();
      if (targetStatus !== filterStatus.toUpperCase()) return false;
    }

    // 4. 통합 검색어 (자산번호, 제품명, MAC, 비고, 구성요소 등)
    if (searchGeneral.trim()) {
      const q = searchGeneral.trim().toLowerCase();
      const matchGeneral =
        (item.asset_no && String(item.asset_no).toLowerCase().includes(q)) ||
        (item.product_name && String(item.product_name).toLowerCase().includes(q)) ||
        (item.shelf_no && String(item.shelf_no).toLowerCase().includes(q)) ||
        (item.mac_wlan && String(item.mac_wlan).toLowerCase().includes(q)) ||
        (item.mac_lan && String(item.mac_lan).toLowerCase().includes(q)) ||
        (item.components && String(item.components).toLowerCase().includes(q)) ||
        (item.remark && String(item.remark).toLowerCase().includes(q)) ||
        (item.key_value && String(item.key_value).toLowerCase().includes(q));
      if (!matchGeneral) return false;
    }

    return true;
  });

  // 체크박스 선택/해제
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

  // 선택 삭제
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`선택한 ${selectedIds.length}건의 자산 데이터를 삭제하시겠습니까?`)) return;

    try {
      for (const id of selectedIds) {
        await deleteScanFromSupabase(id);
      }
      setItems((prev) => prev.filter((item) => !selectedIds.includes(item.id)));
      setSelectedIds([]);
    } catch (err) {
      if (onError) onError(err.message || '데이터 삭제 실패');
    }
  };

  // 상태 뱃지 렌더러 (10대 표준 자산 상태)
  const renderStatusBadge = (statusStr) => {
    const s = String(statusStr || '임대가능').trim();
    if (s === 'AVAILABLE' || s === '임대가능' || s === '대여가능') {
      return <span style={{ backgroundColor: '#052e16', color: '#4ade80', border: '1px solid #166534', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 600 }}>임대가능</span>;
    }
    if (s === 'RENTED' || s === '임대중' || s === '대여중') {
      return <span style={{ backgroundColor: '#172554', color: '#60a5fa', border: '1px solid #1e40af', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 600 }}>임대중</span>;
    }
    if (s === '출고완료' || s === 'DELIVERED') {
      return <span style={{ backgroundColor: '#082f49', color: '#38bdf8', border: '1px solid #0369a1', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 600 }}>출고완료</span>;
    }
    if (s === '수리대기' || s === 'REPAIR_WAIT') {
      return <span style={{ backgroundColor: '#422006', color: '#facc15', border: '1px solid #854d0e', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 600 }}>수리대기</span>;
    }
    if (s === 'REPAIR' || s === '수리중') {
      return <span style={{ backgroundColor: '#451a03', color: '#fb923c', border: '1px solid #9a3412', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 600 }}>수리중</span>;
    }
    if (s === '사내사용중' || s === 'IN_HOUSE') {
      return <span style={{ backgroundColor: '#2e1065', color: '#c084fc', border: '1px solid #6b21a8', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 600 }}>사내사용중</span>;
    }
    if (s === '입고검수중' || s === 'INSPECT_IN') {
      return <span style={{ backgroundColor: '#042f2e', color: '#2dd4bf', border: '1px solid #115e59', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 600 }}>입고검수중</span>;
    }
    if (s === '팩토리상품' || s === 'FACTORY') {
      return <span style={{ backgroundColor: '#1e1b4b', color: '#818cf8', border: '1px solid #3730a3', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 600 }}>팩토리상품</span>;
    }
    if (s === '출고검수중' || s === 'INSPECT_OUT') {
      return <span style={{ backgroundColor: '#164e63', color: '#22d3ee', border: '1px solid #0e7490', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 600 }}>출고검수중</span>;
    }
    if (s === '교정중' || s === 'CALIBRATING') {
      return <span style={{ backgroundColor: '#500724', color: '#f472b6', border: '1px solid #9d174d', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 600 }}>교정중</span>;
    }
    return <span style={{ backgroundColor: '#1e293b', color: '#94a3b8', border: '1px solid #475569', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem' }}>{s}</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', color: '#f8fafc' }}>
      {/* ── [1] 상단 정밀 조회 필터 및 액션 패널 ─────────────────────── */}
      <div style={{
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '8px',
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {/* 필터 입력 필드 (상하 세로 스택 표준) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '8px',
          alignItems: 'flex-end'
        }}>
          {/* 모델명 필터 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <label style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>
              모델명 검색
            </label>
            <input
              type="text"
              value={filterModel}
              onChange={(e) => setFilterModel(e.target.value)}
              placeholder="예: SM-S921N"
              style={{
                backgroundColor: '#0f172a',
                border: '1px solid #475569',
                borderRadius: '4px',
                padding: '5px 8px',
                color: '#f8fafc',
                fontSize: '0.75rem'
              }}
            />
          </div>

          {/* 제조번호(시리얼) 필터 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <label style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>
              제조번호(시리얼) 검색
            </label>
            <input
              type="text"
              value={filterSerial}
              onChange={(e) => setFilterSerial(e.target.value)}
              placeholder="예: R5KL60F0CZW"
              style={{
                backgroundColor: '#0f172a',
                border: '1px solid #475569',
                borderRadius: '4px',
                padding: '5px 8px',
                color: '#f8fafc',
                fontSize: '0.75rem'
              }}
            />
          </div>

          {/* 자산상태 필터 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <label style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>
              자산상태 구분
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                backgroundColor: '#0f172a',
                border: '1px solid #475569',
                borderRadius: '4px',
                padding: '5px 8px',
                color: '#f8fafc',
                fontSize: '0.75rem',
                fontWeight: 600
              }}
            >
              <option value="ALL">전체 상태</option>
              <option value="임대가능">임대가능</option>
              <option value="임대중">임대중</option>
              <option value="출고완료">출고완료</option>
              <option value="수리대기">수리대기</option>
              <option value="수리중">수리중</option>
              <option value="사내사용중">사내사용중</option>
              <option value="입고검수중">입고검수중</option>
              <option value="팩토리상품">팩토리상품</option>
              <option value="출고검수중">출고검수중</option>
              <option value="교정중">교정중</option>
            </select>
          </div>

          {/* 통합 검색어 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <label style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>
              통합 키워드 검색
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                value={searchGeneral}
                onChange={(e) => setSearchGeneral(e.target.value)}
                placeholder="자산번호, 제품명, 선반, MAC..."
                style={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #475569',
                  borderRadius: '4px',
                  padding: '5px 8px 5px 26px',
                  color: '#f8fafc',
                  fontSize: '0.75rem',
                  width: '100%'
                }}
              />
              <Search size={12} style={{ position: 'absolute', left: '8px', color: '#64748b' }} />
            </div>
          </div>
        </div>

        {/* 액션 버튼 툴바 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '6px',
          paddingTop: '6px',
          borderTop: '1px solid #334155'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              조회 결과: <strong style={{ color: '#38bdf8' }}>{filteredItems.length}</strong> 건
              {selectedIds.length > 0 && (
                <span style={{ color: '#f59e0b', marginLeft: '6px', fontWeight: 700 }}>
                  (선택 {selectedIds.length}건)
                </span>
              )}
            </span>
            <button
              onClick={handleResetFilters}
              className="btn btn-outline"
              style={{ fontSize: '0.68rem', padding: '2px 8px' }}
              title="필터 초기화"
            >
              <RotateCcw size={11} /> 필터 초기화
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {selectedIds.length > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="btn btn-outline"
                style={{ fontSize: '0.72rem', padding: '3px 8px', borderColor: '#ef4444', color: '#fca5a5' }}
              >
                <Trash2 size={12} /> 선택 삭제 ({selectedIds.length})
              </button>
            )}
            <button
              onClick={loadData}
              disabled={loading}
              className="btn btn-outline"
              style={{ fontSize: '0.72rem', padding: '3px 8px' }}
            >
              <RefreshCw size={12} className={loading ? 'spin' : ''} /> 새로고침
            </button>
            <button
              onClick={onOpenImportModal}
              className="btn btn-outline"
              style={{ fontSize: '0.72rem', padding: '3px 8px', borderColor: '#38bdf8', color: '#7dd3fc' }}
            >
              <Upload size={12} /> 엑셀 업로드
            </button>
            <button
              onClick={onOpenExportModal}
              className="btn btn-primary"
              style={{ fontSize: '0.72rem', padding: '3px 10px' }}
            >
              <Download size={12} /> 엑셀 내보내기
            </button>
          </div>
        </div>
      </div>

      {/* ── [2] 12대 필드 전면 자산목록 데이터 그리드 ──────────────────── */}
      <div style={{
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)'
      }}>
        <div className="grid-scrollbar" style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 280px)', minHeight: '380px', width: '100%' }}>
          <table style={{ width: '100%', minWidth: '1600px', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
            <thead>
              <tr style={{
                backgroundColor: '#0f172a',
                color: '#94a3b8',
                borderBottom: '1px solid #334155',
                position: 'sticky',
                top: 0,
                zIndex: 10
              }}>
                <th style={{ padding: '6px 8px', textAlign: 'center', width: '36px', whiteSpace: 'nowrap' }}>
                  <input
                    type="checkbox"
                    checked={filteredItems.length > 0 && selectedIds.length === filteredItems.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th style={{ padding: '6px 8px', textAlign: 'left', whiteSpace: 'nowrap' }}>자산번호</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', whiteSpace: 'nowrap' }}>제품명</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', whiteSpace: 'nowrap' }}>모델명</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', whiteSpace: 'nowrap' }}>제조번호(시리얼)</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>자산상태</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>회수율</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', whiteSpace: 'nowrap' }}>선반번호</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', whiteSpace: 'nowrap' }}>옵션</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', whiteSpace: 'nowrap' }}>교정일자</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', whiteSpace: 'nowrap' }}>MAC wlan</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', whiteSpace: 'nowrap' }}>MAC lan</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', whiteSpace: 'nowrap' }}>IMEI</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', whiteSpace: 'nowrap' }}>구성요소(사양)</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', whiteSpace: 'nowrap' }}>비고</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={15} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    자산 데이터를 불러오는 중입니다...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={15} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    등록된 자산 데이터가 없습니다. [엑셀 업로드]를 통해 데이터를 등록하세요.
                  </td>
                </tr>
              ) : (
                filteredItems.map((row, idx) => {
                  const isSelected = selectedIds.includes(row.id || row.asset_no);
                  const assetNo = row.asset_no || row.key_value || '-';
                  const productName = row.product_name || '-';
                  const modelName = row.model_name || '-';
                  const serialNo = row.serial_no || '-';
                  const status = row.asset_status || '임대가능';
                  const earningRatio = row.earning_ratio !== undefined && row.earning_ratio !== null ? `${row.earning_ratio}%` : '-';
                  const shelfNo = row.shelf_no || '-';
                  const option = row.asset_option || '-';
                  const calDate = row.calibration_date || '-';
                  const macWlan = row.mac_wlan || '-';
                  const macLan = row.mac_lan || '-';
                  const imei = row.imei || '-';
                  const components = row.components || '-';
                  const remark = row.remark || '-';

                  return (
                    <tr
                      key={row.asset_no || row.id || idx}
                      onClick={() => handleToggleSelect(row.id || row.asset_no)}
                      style={{
                        borderBottom: '1px solid #1e293b',
                        backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.12)' : (idx % 2 === 0 ? '#0f172a' : '#141e30'),
                        cursor: 'pointer'
                      }}
                    >
                      <td style={{ padding: '6px 8px', textAlign: 'center', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(row.id || row.asset_no)}
                        />
                      </td>
                      <td style={{ padding: '6px 8px', color: '#38bdf8', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {assetNo}
                      </td>
                      <td style={{ padding: '6px 8px', color: '#f8fafc', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {productName}
                      </td>
                      <td style={{ padding: '6px 8px', color: '#cbd5e1', whiteSpace: 'nowrap' }}>
                        {modelName}
                      </td>
                      <td style={{ padding: '6px 8px', color: '#cbd5e1', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        {serialNo}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {renderStatusBadge(status)}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: '#34d399', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {earningRatio}
                      </td>
                      <td style={{ padding: '6px 8px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        {shelfNo}
                      </td>
                      <td style={{ padding: '6px 8px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        {option}
                      </td>
                      <td style={{ padding: '6px 8px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        {calDate}
                      </td>
                      <td style={{ padding: '6px 8px', color: '#94a3b8', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        {macWlan}
                      </td>
                      <td style={{ padding: '6px 8px', color: '#94a3b8', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        {macLan}
                      </td>
                      <td style={{ padding: '6px 8px', color: '#a78bfa', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        {imei}
                      </td>
                      <td style={{ padding: '6px 8px', color: '#94a3b8', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {components}
                      </td>
                      <td style={{ padding: '6px 8px', color: '#64748b', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {remark}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
