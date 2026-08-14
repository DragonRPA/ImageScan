import { createClient } from '@supabase/supabase-js';

const LOCAL_KEY_URL = 'IMAGE_SCAN_SUPABASE_URL';
const LOCAL_KEY_ANON = 'IMAGE_SCAN_SUPABASE_ANON_KEY';

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

export async function fetchScansFromSupabase() {
  const client = getSupabaseClient();
  if (!client) return [];
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

export async function saveScansToSupabase(scans) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase URL 및 API Key 설정이 필요합니다. DB 연동 설정 버튼을 입력하세요.');
  }

  const payload = scans.map(item => ({
    asset_no: item.asset_no || item.assetNo || item['자산번호'] || `A${Date.now().toString().slice(-8)}`,
    imei: item.imei || item['IMEI'] || '',
    mac_address: item.mac_address || item.macAddress || item['MAC Address'] || '',
    serial_no: item.serial_no || item.serialNo || item['시리얼'] || '',
    status: item.status || 'COMPLETED',
    device_info: item.device_info || 'FILE_IMPORT'
  }));

  const { data, error } = await client.from('imei_scans').insert(payload).select();

  if (error) {
    console.error('Supabase insert error:', error);
    throw new Error(`Supabase DB 저장 실패: ${error.message}`);
  }

  return data;
}

export async function deleteScanFromSupabase(id) {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.from('imei_scans').delete().eq('id', id);
  if (error) {
    throw new Error(`Supabase 삭제 실패: ${error.message}`);
  }
}

export async function deleteAllScansFromSupabase() {
  const client = getSupabaseClient();
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
