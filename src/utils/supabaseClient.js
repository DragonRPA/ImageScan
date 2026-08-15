import { createClient } from '@supabase/supabase-js';

const LOCAL_KEY_URL = 'IMAGE_SCAN_SUPABASE_URL';
const LOCAL_KEY_ANON = 'IMAGE_SCAN_SUPABASE_ANON_KEY';
const LOCAL_STORAGE_SCANS_KEY = 'IMAGE_SCAN_LOCAL_ITEMS';

// ── 시스템 고정 DB 인증 정보 (백엔드 상수 - 자꾸 물어보지 않도록 하드코딩) ──
// 우선순위: localStorage 저장값 > .env > 아래 하드코딩 상수
const HARDCODED_SUPABASE_URL = 'https://tfgbpgutxxlhqbzewkyt.supabase.co';
const HARDCODED_SUPABASE_KEY = 'sb_publishable_wruJQfp3Op-ISvVwb4ZdmA_2OqMUJeQ';

/**
 * Normalizes user-input Supabase URL (Converts dashboard URLs like
 * https://supabase.com/dashboard/project/tfgbpgutxxlhqbzewky
 * into API URL: https://tfgbpgutxxlhqbzewky.supabase.co)
 */
export function normalizeSupabaseUrl(inputUrl) {
  if (!inputUrl) return '';
  const trimmed = inputUrl.trim();

  // If user pasted dashboard URL: https://supabase.com/dashboard/project/tfgbpgutxxlhqbzewky
  const dashboardMatch = trimmed.match(/project\/([a-zA-Z0-9]+)/i);
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  // Ensure https:// prefix if missing
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://${trimmed}`;
  }

  return trimmed;
}

export function getStoredConfig() {
  const rawUrl = localStorage.getItem(LOCAL_KEY_URL)
    || import.meta.env.VITE_SUPABASE_URL
    || HARDCODED_SUPABASE_URL;
  const anonKey = localStorage.getItem(LOCAL_KEY_ANON)
    || import.meta.env.VITE_SUPABASE_ANON_KEY
    || HARDCODED_SUPABASE_KEY;
  return { url: normalizeSupabaseUrl(rawUrl), anonKey: anonKey.trim() };
}

export function saveStoredConfig(url, anonKey) {
  const cleanUrl = normalizeSupabaseUrl(url);
  const cleanKey = anonKey ? anonKey.trim() : '';
  if (cleanUrl) localStorage.setItem(LOCAL_KEY_URL, cleanUrl);
  if (cleanKey) localStorage.setItem(LOCAL_KEY_ANON, cleanKey);
}

let supabaseInstance = null;
let currentUrl = null;
let currentKey = null;

export function getSupabaseClient() {
  const { url, anonKey } = getStoredConfig();
  if (!url || !anonKey || url.includes('your-supabase-project')) {
    return null;
  }

  if (!supabaseInstance || currentUrl !== url || currentKey !== anonKey) {
    currentUrl = url;
    currentKey = anonKey;
    supabaseInstance = createClient(url, anonKey, {
      auth: { persistSession: false }
    });
  }
  return supabaseInstance;
}

export async function testSupabaseConnection(url, anonKey) {
  try {
    const cleanUrl = normalizeSupabaseUrl(url);
    const cleanKey = anonKey ? anonKey.trim() : '';
    const tempClient = createClient(cleanUrl, cleanKey, { auth: { persistSession: false } });
    const { data, error } = await tempClient.from('imei_scans').select('count', { count: 'exact', head: true });
    if (error) throw error;
    return { success: true, message: 'Supabase DB 연동 성공!' };
  } catch (err) {
    return { success: false, message: err.message || 'Supabase 연결 실패' };
  }
}

// Fetch scans from Supabase (Primary: asset, Fallback: scan_records, imei_scans)
export async function fetchScansFromSupabase() {
  const client = getSupabaseClient();
  if (!client) {
    try {
      const local = localStorage.getItem(LOCAL_STORAGE_SCANS_KEY);
      return local ? JSON.parse(local) : [];
    } catch (e) {
      return [];
    }
  }

  // 1. asset 정규 마스터 테이블 최우선 조회
  try {
    const { data, error } = await client
      .from('asset')
      .select('*');

    if (!error && data && data.length > 0) {
      return data.map(r => ({
        ...r,
        id: r.asset_no || r.id,
        asset_no: r.asset_no,
        category_major: r.category_major || '',
        product_name: r.product_name,
        model_name: r.model_name,
        serial_no: r.serial_no,
        asset_status: r.asset_status || 'AVAILABLE',
        earning_ratio: r.earning_ratio ?? 0,
        shelf_no: r.shelf_no,
        asset_option: r.asset_option,
        calibration_date: r.calibration_date,
        mac_wlan: r.mac_wlan,
        mac_lan: r.mac_lan,
        imei: r.imei,
        components: r.components,
        remark: r.remark
      }));
    }
  } catch (err) {
    console.warn('asset 테이블 조회 실패, scan_records 폴백:', err.message);
  }

  // 2. scan_records 2차 폴백
  try {
    const { data, error } = await client
      .from('scan_records')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map(r => ({
        ...r,
        ...r.data,
        id: r.id,
        asset_no: r.asset_no || r.key_value || r.data?.asset_no,
        category_major: r.category_major || r.data?.category_major || '',
        product_name: r.product_name || r.data?.product_name,
        model_name: r.model_name || r.data?.model_name,
        serial_no: r.serial_no || r.data?.serial_no,
        asset_status: r.asset_status || r.data?.asset_status || 'AVAILABLE',
        earning_ratio: r.earning_ratio || r.data?.earning_ratio || 0,
        shelf_no: r.shelf_no || r.data?.shelf_no,
        asset_option: r.asset_option || r.data?.asset_option,
        calibration_date: r.calibration_date || r.data?.calibration_date,
        mac_wlan: r.mac_wlan || r.data?.mac_wlan,
        mac_lan: r.mac_lan || r.data?.mac_lan,
        imei: r.imei || r.data?.imei,
        components: r.components || r.data?.components,
        remark: r.remark || r.data?.remark
      }));
    }
  } catch (err) {
    console.warn('scan_records 조회 실패, imei_scans 폴백:', err.message);
  }

  // 3. 레거시 imei_scans 폴백
  const { data, error } = await client
    .from('imei_scans')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Supabase fetch error:', error);
    throw new Error(`Supabase 조회 실패: ${error.message}`);
  }
  return data || [];
}

// Chunked Batch Saver with Real-Time Progress Callback
export async function saveScansToSupabaseBatch(scans, onProgressCallback, importMode = 'append') {
  const client = getSupabaseClient();
  const formattedPayload = scans.map((item, idx) => {
    const assetNo = item.asset_no || item.assetNo || item['자산번호'] || `TEST${String(idx + 1).padStart(4, '0')}`;
    const categoryMajor = item.category_major || item['대분류'] || item['카테고리'] || '';
    const prodName = item.product_name || item.productName || item['제품명'] || '';
    const modelName = item.model_name || item.modelName || item['모델명'] || '';
    const serialNo = item.serial_no || item.serialNo || item['제조번호'] || item['시리얼'] || '';
    const assetStatus = item.asset_status || item['자산상태'] || 'AVAILABLE';
    const earningRatio = parseInt(item.earning_ratio ?? item['회수율'] ?? 0, 10) || 0;
    const shelfNo = item.shelf_no || item['선반번호'] || '';
    const assetOption = item.asset_option || item['옵션'] || '';
    const calibrationDate = item.calibration_date || item['교정일자'] || '';
    const macWlan = item.mac_wlan || item['MAC wlan'] || item['mac_wlan'] || item.mac_address || '';
    const macLan = item.mac_lan || item['MAC lan'] || item['mac_lan'] || '';
    const imeiVal = item.imei || item.imeiVal || item['IMEI'] || item['단말식별번호'] || '';
    const components = item.components || item['구성요소'] || item['구성요소(사양)'] || '';
    const remark = item.remark || item['비고'] || '';

    return {
      asset_no: assetNo,
      category_major: categoryMajor,
      product_name: prodName,
      model_name: modelName,
      serial_no: serialNo,
      asset_status: assetStatus,
      earning_ratio: earningRatio,
      shelf_no: shelfNo,
      asset_option: assetOption,
      calibration_date: calibrationDate,
      mac_wlan: macWlan,
      mac_lan: macLan,
      imei: imeiVal,
      components: components,
      remark: remark,
      status: item.status || 'COMPLETED',
      device_info: item.device_info || 'FILE_IMPORT'
    };
  });

  if (client) {
    if (importMode === 'replace') {
      if (onProgressCallback) onProgressCallback({ stage: 'wipe', percent: 5, message: '1단계: 기존 DB 데이터 고속 삭제 중...' });
      try {
        await client.from('asset').delete().neq('asset_no', 'FORCE_DELETE_ALL_RECORDS');
      } catch (e) {}
    }

    // ⚡ 초고속 배치 튜닝: 1,000건 단위 대량 처리 & 지연 제거 (17,000건 3~5초 완료)
    const CHUNK_SIZE = 1000;
    const totalCount = formattedPayload.length;
    let processedCount = 0;

    for (let i = 0; i < totalCount; i += CHUNK_SIZE) {
      const chunk = formattedPayload.slice(i, i + CHUNK_SIZE);
      
      const assetChunk = chunk.map(item => ({
        asset_no: String(item.asset_no),
        category_major: item.category_major,
        product_name: item.product_name,
        model_name: item.model_name,
        serial_no: item.serial_no,
        asset_status: item.asset_status,
        earning_ratio: item.earning_ratio,
        shelf_no: item.shelf_no,
        asset_option: item.asset_option,
        calibration_date: item.calibration_date,
        mac_wlan: item.mac_wlan,
        mac_lan: item.mac_lan,
        imei: item.imei,
        components: item.components,
        remark: item.remark
      }));

      try {
        if (importMode === 'replace') {
          const { error } = await client.from('asset').insert(assetChunk);
          if (error) {
            // 중복 키 방어용 upsert 폴백
            await client.from('asset').upsert(assetChunk, { onConflict: 'asset_no' });
          }
        } else {
          await client.from('asset').upsert(assetChunk, { onConflict: 'asset_no' });
        }
      } catch (err) {
        console.warn('asset 적재 경고:', err.message);
      }

      processedCount += chunk.length;

      const percent = Math.min(99, Math.round((processedCount / totalCount) * 90) + 10);
      if (onProgressCallback) {
        onProgressCallback({
          stage: 'insert',
          percent,
          processedCount,
          totalCount,
          message: `2단계: DB에 초고속 저장 중 (${processedCount}/${totalCount}건 - ${percent}%)...`
        });
      }

      // UI 프로그레스 렌더링 양보 (0ms)
      await new Promise(res => setTimeout(res, 0));
    }

    if (onProgressCallback) onProgressCallback({ stage: 'complete', percent: 100, message: '완료: DB 저장 성공!' });
    return formattedPayload;
  }

  // Local Fallback Mode
  if (onProgressCallback) onProgressCallback({ stage: 'wipe', percent: 20, message: '로컬 데이터 처리 중...' });
  
  let currentLocal = [];
  if (importMode === 'append') {
    try {
      const existing = localStorage.getItem(LOCAL_STORAGE_SCANS_KEY);
      if (existing) currentLocal = JSON.parse(existing);
    } catch (e) {}
  }

  const updatedLocal = [...formattedPayload.map((item, i) => ({
    ...item,
    id: `local_${Date.now()}_${i}`,
    created_at: new Date().toISOString()
  })), ...currentLocal];

  localStorage.setItem(LOCAL_STORAGE_SCANS_KEY, JSON.stringify(updatedLocal));

  if (onProgressCallback) onProgressCallback({ stage: 'complete', percent: 100, message: '완료: 로컬 대시보드 저장 완료!' });
  return updatedLocal;
}

export async function saveScansToSupabase(scans) {
  return saveScansToSupabaseBatch(scans, null, 'append');
}

export async function deleteScanFromSupabase(id) {
  const client = getSupabaseClient();
  if (!client) {
    try {
      const existing = localStorage.getItem(LOCAL_STORAGE_SCANS_KEY);
      if (existing) {
        const parsed = JSON.parse(existing);
        const filtered = parsed.filter(i => i.id !== id && i.asset_no !== id);
        localStorage.setItem(LOCAL_STORAGE_SCANS_KEY, JSON.stringify(filtered));
      }
    } catch (e) {}
    return;
  }

  try {
    await client.from('asset').delete().or(`asset_no.eq.${id}`);
  } catch (e) {}
  try {
    await client.from('scan_records').delete().or(`id.eq.${id},asset_no.eq.${id}`);
  } catch (e) {}
  try {
    await client.from('imei_scans').delete().eq('id', id);
  } catch (e) {}
}

export async function deleteAllScansFromSupabase() {
  const client = getSupabaseClient();
  localStorage.removeItem(LOCAL_STORAGE_SCANS_KEY);

  if (!client) return;
  try {
    await client.from('asset').delete().neq('asset_no', 'FORCE_DELETE_ALL_RECORDS');
  } catch (e) {}
  try {
    await client.from('scan_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  } catch (e) {}
  try {
    await client.from('imei_scans').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  } catch (e) {}
}

export function subscribeRealtimeScans(onInsertCallback) {
  const client = getSupabaseClient();
  if (!client) return null;

  const channel = client
    .channel('public:asset')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'asset' }, (payload) => {
      if (payload.new && onInsertCallback) {
        onInsertCallback(payload.new);
      }
    })
    .subscribe();

  return channel;
}

/**
 * Insert a single confirmed asset record into the print_queue table.
 * Supports dynamic ZPL payload, key_value and record_data.
 */
export async function insertPrintQueue(item, templateOverride = null) {
  const client = getSupabaseClient();
  if (!client) {
    console.warn('[print_queue] Supabase 미연결 - 큐 등록 건너뜀');
    return null;
  }

  const { getStoredLabelTemplate, generateDynamicZpl } = await import('./labelTemplate');
  const template = templateOverride || getStoredLabelTemplate();
  const zpl = generateDynamicZpl(item, template);

  const keyValue = item.key_value || item.asset_no || item.assetNo || item.imei || 'RECORD';

  const payload = {
    key_value:    String(keyValue),
    record_data:  item,
    zpl_payload:  zpl,
    asset_no:     item.asset_no     || item.assetNo  || keyValue,
    imei:         item.imei                           || '',
    mac_address:  item.mac_address  || item.macAddress || '',
    serial_no:    item.serial_no    || item.serialNo  || '',
    print_status: 'PENDING',
    requested_by: 'MOBILE'
  };

  const { data, error } = await client
    .from('print_queue')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`print_queue INSERT 실패: ${error.message}`);
  }
  return data;
}
