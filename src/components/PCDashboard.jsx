import React, { useState, useEffect, useMemo } from 'react';
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
  const [filterCategory, setFilterCategory] = useState('IT');
  const [filterModel, setFilterModel] = useState('');
  const [filterSerial, setFilterSerial] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchGeneral, setSearchGeneral] = useState('');

  // 선택된 항목 IDs (자산번호 또는 ID)
  const [selectedIds, setSelectedIds] = useState([]);

  // ⭐️ 엑셀 스타일 마우스 드래그 다중 행 선택 상태 머신
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartIndex, setDragStartIndex] = useState(null);
  const [dragMode, setDragMode] = useState('select'); // 'select' | 'deselect'
  const [initialSelectedIds, setInitialSelectedIds] = useState([]);

  // 전역 마우스 업 감지 (드래그 종료)
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setDragStartIndex(null);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  // 데이터 로드 (기본 대분류: IT)
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchScansFromSupabase({ category_major: 'IT' });
      setItems(data || []);
    } catch (err) {
      console.warn('데이터 로드 경고:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // ⭐️ [명시적 조회] DB 직통 쿼리 실행 (17,000건 전량 범위 지원)
  const handleSearch = async () => {
    setLoading(true);
    try {
      const filters = {
        category_major: filterCategory,
        model_name: filterModel,
        serial_no: filterSerial,
        asset_status: filterStatus,
        searchGeneral: searchGeneral
      };
      const data = await fetchScansFromSupabase(filters);
      setItems(data || []);
      setSelectedIds([]);
    } catch (err) {
      console.warn('데이터 조회 실패:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // 존재하는 대분류 목록 자동 추출 (IT, 측정기, DSLR 카메라 + DB 실제 데이터)
  const availableCategories = useMemo(() => {
    const catSet = new Set(['IT', '측정기', 'DSLR 카메라']);
    items.forEach((item) => {
      if (item.category_major && String(item.category_major).trim()) {
        catSet.add(String(item.category_major).trim());
      }
    });
    return Array.from(catSet);
  }, [items]);

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
  const handleResetFilters = async () => {
    setFilterCategory('IT');
    setFilterModel('');
    setFilterSerial('');
    setFilterStatus('ALL');
    setSearchGeneral('');
    setSelectedIds([]);
    setLoading(true);
    try {
      const data = await fetchScansFromSupabase({ category_major: 'IT' });
      setItems(data || []);
    } catch (err) {
      console.warn('데이터 초기화 로드 경고:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // ⭐️ [핵심] 클립보드 다중 키워드 파싱 및 복사 순서 100% 보존 필터링/정렬 엔진
  const filteredItems = useMemo(() => {
    const rawSearch = searchGeneral.trim();
    // 공백(\s), 줄바꿈(\r, \n), 탭(\t), 쉼표(,), 세미콜론(;) 모두 분리
    const searchTokens = rawSearch
      ? rawSearch.split(/[\r\n\t,;\s]+/).map(t => t.trim().toLowerCase()).filter(Boolean)
      : [];
    const isMultiSearch = searchTokens.length > 1;

    let result = items.filter((item) => {
      // 0. 대분류 필터
      if (filterCategory !== 'ALL') {
        const targetCat = (item.category_major || '').trim().toLowerCase();
        if (targetCat !== filterCategory.toLowerCase()) return false;
      }

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

      // 4. 통합 검색어 (다중 클립보드 복사 순서 일치 또는 단일 키워드 검색)
      if (searchTokens.length > 0) {
        const itemAssetNo = String(item.asset_no || '').toLowerCase();
        const itemSerialNo = String(item.serial_no || '').toLowerCase();
        const itemImei = String(item.imei || '').toLowerCase();
        const itemProdName = String(item.product_name || '').toLowerCase();
        const itemModelName = String(item.model_name || '').toLowerCase();
        const itemCategory = String(item.category_major || '').toLowerCase();
        const itemShelf = String(item.shelf_no || '').toLowerCase();
        const itemMacWlan = String(item.mac_wlan || '').toLowerCase();
        const itemMacLan = String(item.mac_lan || '').toLowerCase();
        const itemComponents = String(item.components || '').toLowerCase();
        const itemRemark = String(item.remark || '').toLowerCase();

        if (isMultiSearch) {
          // 다중 복사 검색 모드: 자산번호, 시리얼, IMEI, 모델명 중 정확 매칭 또는 포함 매칭
          const matched = searchTokens.some(token => 
            itemAssetNo === token || 
            itemSerialNo === token || 
            itemImei === token ||
            (token.length >= 4 && itemAssetNo.includes(token)) ||
            (token.length >= 4 && itemSerialNo.includes(token)) ||
            (token.length >= 4 && itemModelName.includes(token))
          );
          if (!matched) return false;
        } else {
          // 단일 검색어 모드: 전체 필드 부분 검색
          const q = searchTokens[0];
          const matched =
            itemAssetNo.includes(q) ||
            itemCategory.includes(q) ||
            itemProdName.includes(q) ||
            itemModelName.includes(q) ||
            itemSerialNo.includes(q) ||
            itemImei.includes(q) ||
            itemShelf.includes(q) ||
            itemMacWlan.includes(q) ||
            itemMacLan.includes(q) ||
            itemComponents.includes(q) ||
            itemRemark.includes(q);
          if (!matched) return false;
        }
      }

      return true;
    });

    // ⭐️ [클립보드 순서 보존 정렬] 엑셀에서 복사해온 줄 순서대로 1:1 강제 정렬!
    if (isMultiSearch && searchTokens.length > 0) {
      result.sort((a, b) => {
        const aAsset = String(a.asset_no || '').toLowerCase();
        const aSerial = String(a.serial_no || '').toLowerCase();
        const bAsset = String(b.asset_no || '').toLowerCase();
        const bSerial = String(b.serial_no || '').toLowerCase();

        let idxA = searchTokens.findIndex(t => aAsset === t || aSerial === t || (t.length >= 4 && (aAsset.includes(t) || aSerial.includes(t))));
        let idxB = searchTokens.findIndex(t => bAsset === t || bSerial === t || (t.length >= 4 && (bAsset.includes(t) || bSerial.includes(t))));
        if (idxA === -1) idxA = 999999;
        if (idxB === -1) idxB = 999999;
        return idxA - idxB;
      });
    }

    return result;
  }, [items, filterCategory, filterModel, filterSerial, filterStatus, searchGeneral]);

  // 체크박스 선택/해제 (전체 선택)
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredItems.map((i) => i.id || i.asset_no));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // ⭐️ 엑셀 스타일 마우스 드래그 시작 (MouseDown)
  const handleRowMouseDown = (idx, id, e) => {
    if (e.button !== 0) return; // 왼쪽 클릭만
    e.preventDefault(); // 텍스트 긁힘 원천 차단

    const isAlreadySelected = selectedIds.includes(id);
    const mode = isAlreadySelected ? 'deselect' : 'select';

    setIsDragging(true);
    setDragStartIndex(idx);
    setDragMode(mode);
    setInitialSelectedIds([...selectedIds]);

    if (mode === 'select') {
      setSelectedIds((prev) => Array.from(new Set([...prev, id])));
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  // ⭐️ 엑셀 스타일 마우스 드래그 이동 (MouseEnter)
  const handleRowMouseEnter = (idx) => {
    if (!isDragging || dragStartIndex === null) return;

    const start = Math.min(dragStartIndex, idx);
    const end = Math.max(dragStartIndex, idx);

    // 드래그 영역의 모든 행 ID 추출
    const rangeIds = filteredItems.slice(start, end + 1).map((item) => item.id || item.asset_no);

    if (dragMode === 'select') {
      const nextSet = new Set(initialSelectedIds);
      rangeIds.forEach((id) => nextSet.add(id));
      setSelectedIds(Array.from(nextSet));
    } else {
      const nextSet = new Set(initialSelectedIds);
      rangeIds.forEach((id) => nextSet.delete(id));
      setSelectedIds(Array.from(nextSet));
    }
  };

  // ⭐️ [라벨 출력] 화면에 정렬된 순서 100% 보존하여 인쇄 파이프라인 전달
  const handlePrintSelected = () => {
    if (selectedIds.length === 0) return;
    const orderedSelectedItems = filteredItems.filter(item => 
      selectedIds.includes(item.id || item.asset_no)
    );
    if (onOpenPrintModal) {
      onOpenPrintModal(orderedSelectedItems);
    }
  };

  // ⭐️ [엑셀 내보내기] 화면에 정렬된 순서 그대로 내보내기
  const handleExportData = () => {
    const exportTargets = selectedIds.length > 0
      ? filteredItems.filter(item => selectedIds.includes(item.id || item.asset_no))
      : filteredItems;
    if (onOpenExportModal) {
      onOpenExportModal(exportTargets);
    }
  };

  // 선택 삭제
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`선택한 ${selectedIds.length}건의 자산 데이터를 삭제하시겠습니까?`)) return;

    try {
      for (const id of selectedIds) {
        await deleteScanFromSupabase(id);
      }
      setItems((prev) => prev.filter((item) => !selectedIds.includes(item.id || item.asset_no)));
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '8px',
          alignItems: 'flex-end'
        }}>
          {/* 대분류 필터 (3대 대분류) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <label style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>
              대분류 구분
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{
                backgroundColor: '#0f172a',
                border: '1px solid #475569',
                borderRadius: '4px',
                padding: '5px 8px',
                color: '#93c5fd',
                fontSize: '0.75rem',
                fontWeight: 700
              }}
            >
              <option value="ALL">전체 대분류</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* 모델명 필터 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <label style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>
              모델명 검색
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                value={filterModel}
                onChange={(e) => setFilterModel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="예: SM-S921N"
                style={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #475569',
                  borderRadius: '4px',
                  padding: '5px 22px 5px 8px',
                  color: '#f8fafc',
                  fontSize: '0.75rem',
                  width: '100%'
                }}
              />
              {filterModel && (
                <button
                  onClick={() => setFilterModel('')}
                  style={{
                    position: 'absolute',
                    right: '6px',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    padding: 0
                  }}
                  title="모델명 검색어 지우기"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* 제조번호(시리얼) 필터 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <label style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>
              제조번호(시리얼) 검색
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                value={filterSerial}
                onChange={(e) => setFilterSerial(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="예: R5KL60F0CZW"
                style={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #475569',
                  borderRadius: '4px',
                  padding: '5px 22px 5px 8px',
                  color: '#f8fafc',
                  fontSize: '0.75rem',
                  width: '100%'
                }}
              />
              {filterSerial && (
                <button
                  onClick={() => setFilterSerial('')}
                  style={{
                    position: 'absolute',
                    right: '6px',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    padding: 0
                  }}
                  title="제조번호 검색어 지우기"
                >
                  ✕
                </button>
              )}
            </div>
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

          {/* 통합 검색어 (엑셀 다중 복사/붙여넣기 100% 지원) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>
                통합 키워드 검색 (단일 / 엑셀 다중 붙여넣기)
              </label>
              {searchGeneral.trim() && searchGeneral.trim().split(/[\r\n\t,;\s]+/).filter(Boolean).length > 1 && (
                <span style={{
                  fontSize: '0.65rem',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  fontWeight: 700
                }}>
                  다중 {searchGeneral.trim().split(/[\r\n\t,;\s]+/).filter(Boolean).length}건
                </span>
              )}
            </div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                value={searchGeneral}
                onChange={(e) => setSearchGeneral(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                onPaste={(e) => {
                  const pastedText = e.clipboardData.getData('text');
                  if (pastedText && /[\r\n\t,]/.test(pastedText)) {
                    e.preventDefault();
                    // 줄바꿈, 탭, 쉼표를 공백으로 치환하여 안전하게 검색 상태에 반영
                    const cleaned = pastedText.split(/[\r\n\t,;]+/).map(s => s.trim()).filter(Boolean).join(' ');
                    setSearchGeneral(cleaned);
                  }
                }}
                placeholder="자산번호(다중 붙여넣기 가능), 시리얼, 제품명..."
                style={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #475569',
                  borderRadius: '4px',
                  padding: '5px 24px 5px 26px',
                  color: '#f8fafc',
                  fontSize: '0.75rem',
                  width: '100%'
                }}
              />
              <Search size={12} style={{ position: 'absolute', left: '8px', color: '#64748b' }} />
              {searchGeneral && (
                <button
                  onClick={() => setSearchGeneral('')}
                  style={{
                    position: 'absolute',
                    right: '6px',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    padding: 0
                  }}
                  title="검색어 지우기"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* ⭐️ 명시적 [조회] 트리거 버튼 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', justifyContent: 'flex-end' }}>
            <label style={{ fontSize: '0.68rem', color: 'transparent', whiteSpace: 'nowrap' }}>
              조회
            </label>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="btn btn-primary"
              style={{
                fontSize: '0.75rem',
                padding: '5px 16px',
                backgroundColor: '#2563eb',
                borderColor: '#3b82f6',
                color: '#ffffff',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                height: '29px',
                boxShadow: '0 0 10px rgba(37, 99, 235, 0.4)'
              }}
              title="설정된 조건으로 17,000건 전체 DB 실시간 조회 (Enter)"
            >
              <Search size={13} className={loading ? 'spin' : ''} /> 조회
            </button>
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
              <>
                <button
                  onClick={handlePrintSelected}
                  className="btn btn-primary"
                  style={{
                    fontSize: '0.72rem',
                    padding: '3px 10px',
                    backgroundColor: '#0284c7',
                    borderColor: '#38bdf8',
                    color: '#ffffff',
                    fontWeight: 700,
                    boxShadow: '0 0 8px rgba(56, 189, 248, 0.4)'
                  }}
                  title="선택된 자산을 화면에 조회된 순서대로 Zebra 라벨 출력"
                >
                  <Printer size={12} /> 라벨 출력 ({selectedIds.length})
                </button>
                <button
                  onClick={handleDeleteSelected}
                  className="btn btn-outline"
                  style={{ fontSize: '0.72rem', padding: '3px 8px', borderColor: '#ef4444', color: '#fca5a5' }}
                >
                  <Trash2 size={12} /> 선택 삭제 ({selectedIds.length})
                </button>
              </>
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
              onClick={handleExportData}
              className="btn btn-primary"
              style={{ fontSize: '0.72rem', padding: '3px 10px' }}
            >
              <Download size={12} /> 엑셀 내보내기
            </button>
          </div>
        </div>
      </div>

      {/* ── [2] 12대 필드 전면 자산목록 데이터 그리드 (엑셀식 마우스 드래그 지원) ── */}
      <div style={{
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)',
        userSelect: 'none',
        WebkitUserSelect: 'none'
      }}>
        <div className="grid-scrollbar" style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 280px)', minHeight: '380px', width: '100%' }}>
          <table style={{ width: '100%', minWidth: '1600px', borderCollapse: 'collapse', fontSize: '0.72rem', userSelect: 'none', WebkitUserSelect: 'none' }}>
            <thead>
              <tr style={{
                backgroundColor: '#0f172a',
                color: '#94a3b8',
                borderBottom: '1px solid #334155',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                userSelect: 'none'
              }}>
                <th style={{ padding: '6px 8px', textAlign: 'center', width: '36px', whiteSpace: 'nowrap' }}>
                  <input
                    type="checkbox"
                    checked={filteredItems.length > 0 && selectedIds.length === filteredItems.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th style={{ padding: '6px 8px', textAlign: 'left', whiteSpace: 'nowrap' }}>자산번호</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', whiteSpace: 'nowrap' }}>대분류</th>
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
                  <td colSpan={16} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    자산 데이터를 불러오는 중입니다...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={16} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    등록된 자산 데이터가 없습니다. [엑셀 업로드]를 통해 데이터를 등록하세요.
                  </td>
                </tr>
              ) : (
                filteredItems.map((row, idx) => {
                  const isSelected = selectedIds.includes(row.id || row.asset_no);
                  const assetNo = row.asset_no || row.key_value || '-';
                  const categoryMajor = row.category_major || '-';
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
                      onMouseDown={(e) => handleRowMouseDown(idx, row.id || row.asset_no, e)}
                      onMouseEnter={() => handleRowMouseEnter(idx)}
                      style={{
                        borderBottom: '1px solid #1e293b',
                        backgroundColor: isSelected 
                          ? 'rgba(2, 132, 199, 0.25)' 
                          : (idx % 2 === 0 ? '#0f172a' : '#141e30'),
                        borderLeft: isSelected ? '4px solid #38bdf8' : '4px solid transparent',
                        boxShadow: isSelected ? 'inset 0 0 0 1px rgba(56, 189, 248, 0.35)' : 'none',
                        cursor: 'pointer',
                        userSelect: 'none',
                        WebkitUserSelect: 'none'
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
                      <td style={{ padding: '6px 8px', color: '#93c5fd', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {categoryMajor}
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
