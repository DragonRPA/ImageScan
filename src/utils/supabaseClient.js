import { createClient } from '@supabase/supabase-js';

const LOCAL_KEY_URL = 'IMAGE_SCAN_SUPABASE_URL';
const LOCAL_KEY_ANON = 'IMAGE_SCAN_SUPABASE_ANON_KEY';
const LOCAL_STORAGE_SCANS_KEY = 'IMAGE_SCAN_LOCAL_ITEMS';

export function getStoredConfig() {
  const url = localStorage.getItem(LOCAL_KEY_URL) || import.meta.env.VITE_SUPABASE_URL || '';
  const anonKey = localStorage.getItem(LOCAL_KEY_ANON) || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  return { url, anonKey };
}

export function saveStoredConfig(url, anonKey) {
  if (url) localStorage.setItem(LOCAL_KEY_URL, url);
  if (anonKey) localStorage.setItem(LOCAL_KEY_ANON, anonKey);
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
    const tempClient = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data, error } = await tempClient.from('imei_scans').select('count', { count: 'exact', head: true });
    if (error) throw error;
    return { success: true, message: 'Supabase DB 연동 성공!' };
  } catch (err) {
    return { success: false, message: err.message || 'Supabase 연결 실패' };
  }
}

// Fetch scans from Supabase or LocalStorage
export async function fetchScansFromSupabase() {
  const client = getSupabaseClient();
  if (!client) {
    // Return LocalStorage cached items if DB not configured
    try {
      const local = localStorage.getItem(LOCAL_STORAGE_SCANS_KEY);
      return local ? JSON.parse(local) : [];
    } catch (e) {
      return [];
    }
  }

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
  const formattedPayload = scans.map((item, idx) => ({
    asset_no: item.asset_no || item.assetNo || item['자산번호'] || `TEST${String(idx + 1).padStart(4, '0')}`,
    imei: item.imei || item['IMEI'] || '',
    mac_address: item.mac_address || item.macAddress || item['MAC Address'] || '',
    serial_no: item.serial_no || item.serialNo || item['시리얼'] || '',
    status: item.status || 'COMPLETED',
    device_info: item.device_info || 'FILE_IMPORT'
  }));

  // 1. If Supabase DB is connected
  if (client) {
    // If replace mode, wipe existing records first
    if (importMode === 'replace') {
      if (onProgressCallback) onProgressCallback({ stage: 'wipe', percent: 5, message: '1단계: 기존 DB 데이터 전체 삭제 중...' });
      const { error: wipeErr } = await client.from('imei_scans').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (wipeErr) {
        throw new Error(`기존 DB 전체 삭제 실패: ${wipeErr.message}`);
      }
    }

    // Insert in chunks of 50
    const CHUNK_SIZE = 50;
    const totalCount = formattedPayload.length;
    let processedCount = 0;
    const insertedResults = [];

    for (let i = 0; i < totalCount; i += CHUNK_SIZE) {
      const chunk = formattedPayload.slice(i, i + CHUNK_SIZE);
      const { data, error } = await client.from('imei_scans').insert(chunk).select();

      if (error) {
        throw new Error(`DB 일괄 입력 실패 (${i + 1}~${i + chunk.length}건): ${error.message}`);
      }

      if (data) insertedResults.push(...data);
      processedCount += chunk.length;

      const percent = Math.min(99, Math.round((processedCount / totalCount) * 90) + 10);
      if (onProgressCallback) {
        onProgressCallback({
          stage: 'insert',
          percent,
          processedCount,
          totalCount,
          message: `2단계: DB에 저장 중 (${processedCount}/${totalCount}건 - ${percent}%)...`
        });
      }

      // Small 50ms delay between chunks for UI reactivity
      await new Promise(res => setTimeout(res, 50));
    }

    if (onProgressCallback) onProgressCallback({ stage: 'complete', percent: 100, message: '완료: DB 저장 성공!' });
    return insertedResults;
  }

  // 2. Local Fallback Mode (No Supabase DB credentials yet)
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
    // Delete from LocalStorage
    try {
      const existing = localStorage.getItem(LOCAL_STORAGE_SCANS_KEY);
      if (existing) {
        const parsed = JSON.parse(existing);
        const filtered = parsed.filter(i => i.id !== id);
        localStorage.setItem(LOCAL_STORAGE_SCANS_KEY, JSON.stringify(filtered));
      }
    } catch (e) {}
    return;
  }

  const { error } = await client.from('imei_scans').delete().eq('id', id);
  if (error) {
    throw new Error(`Supabase 삭제 실패: ${error.message}`);
  }
}

export async function deleteAllScansFromSupabase() {
  const client = getSupabaseClient();
  localStorage.removeItem(LOCAL_STORAGE_SCANS_KEY);

  if (!client) return;
  const { error } = await client.from('imei_scans').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) {
    throw new Error(`Supabase 전체 데이터 삭제 실패: ${error.message}`);
  }
}

export function subscribeRealtimeScans(onInsertCallback) {
  const client = getSupabaseClient();
  if (!client) return null;

  const channel = client
    .channel('public:imei_scans')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'imei_scans' }, (payload) => {
      if (payload.new && onInsertCallback) {
        onInsertCallback(payload.new);
      }
    })
    .subscribe();

  return channel;
}
