/**
 * Universal Dynamic Schema & Record Engine (SSOT)
 * System: Universal Dynamic Schema, Scan Queue & Label Pipeline
 */
import { getSupabaseClient } from './supabaseClient';

export const LOCAL_KEY_SCHEMA_DEF = 'IMAGE_SCAN_UNIVERSAL_SCHEMA_DEF_V1';

// ── 기본 초기 스키마 정의 (SSOT) ──────────────────────────────────────────
export const DEFAULT_SCHEMA_DEF = {
  id: 'main_schema',
  schema_name: '기본 자산 스키마',
  key_field: 'asset_no',
  key_field_name: '관리번호',
  table_version: 1,
  fields: [
    {
      id: 'asset_no',
      name: '관리번호',
      type: 'VARCHAR',
      length: 50,
      isKey: true,
      isRequired: true,
      isBarcodeTarget: true,
      order: 1
    },
    {
      id: 'imei',
      name: 'IMEI',
      type: 'VARCHAR',
      length: 20,
      isKey: false,
      isRequired: false,
      isBarcodeTarget: true,
      order: 2
    },
    {
      id: 'serial_no',
      name: '시리얼번호',
      type: 'VARCHAR',
      length: 50,
      isKey: false,
      isRequired: false,
      isBarcodeTarget: true,
      order: 3
    },
    {
      id: 'mac_address',
      name: 'MAC 주소',
      type: 'VARCHAR',
      length: 30,
      isKey: false,
      isRequired: false,
      isBarcodeTarget: false,
      order: 4
    },
    {
      id: 'scanned_at',
      name: '스캔일시',
      type: 'TIMESTAMPTZ',
      isKey: false,
      isRequired: false,
      isBarcodeTarget: false,
      order: 5
    }
  ]
};

/**
 * 로컬 캐시 스키마 조회
 */
export function getLocalSchemaDef() {
  try {
    const stored = localStorage.getItem(LOCAL_KEY_SCHEMA_DEF);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && Array.isArray(parsed.fields) && parsed.key_field) {
        return parsed;
      }
    }
  } catch (e) {}
  return DEFAULT_SCHEMA_DEF;
}

/**
 * 로컬 캐시 스키마 저장
 */
export function saveLocalSchemaDef(schemaDef) {
  try {
    localStorage.setItem(LOCAL_KEY_SCHEMA_DEF, JSON.stringify(schemaDef));
  } catch (e) {}
}

/**
 * 백엔드 Supabase에서 활성 스키마 로드
 */
export async function fetchActiveSchema() {
  const client = getSupabaseClient();
  if (!client) return getLocalSchemaDef();

  try {
    const { data, error } = await client
      .from('schema_definitions')
      .select('*')
      .eq('id', 'main_schema')
      .maybeSingle();

    if (error || !data) {
      return getLocalSchemaDef();
    }

    const schemaDef = {
      id: data.id,
      schema_name: data.schema_name,
      key_field: data.key_field,
      key_field_name: data.key_field_name,
      table_version: data.table_version || 1,
      fields: Array.isArray(data.fields) ? data.fields : DEFAULT_SCHEMA_DEF.fields
    };

    saveLocalSchemaDef(schemaDef);
    return schemaDef;
  } catch (err) {
    console.warn('스키마 조회 오류, 로컬 캐시 사용:', err);
    return getLocalSchemaDef();
  }
}

/**
 * DDL 스키마 패치 실행 (Supabase RPC 및 테이블 동기화)
 */
export async function applySchemaPatch(schemaDef, resetData = false) {
  const client = getSupabaseClient();
  saveLocalSchemaDef(schemaDef);

  if (!client) {
    return { success: true, message: '로컬 스키마 저장 완료 (DB 미연결)' };
  }

  try {
    // 1. RPC 함수 exec_schema_patch 호출 시도
    const { data, error } = await client.rpc('exec_schema_patch', {
      p_schema_id: schemaDef.id || 'main_schema',
      p_schema_name: schemaDef.schema_name || '기본 자산 스키마',
      p_key_field: schemaDef.key_field,
      p_key_field_name: schemaDef.key_field_name,
      p_fields: schemaDef.fields,
      p_reset_data: Boolean(resetData)
    });

    if (!error && data?.success) {
      return { success: true, message: 'DB 스키마 DDL 패치 및 테이블 동기화 완료' };
    }

    // 2. RPC 실패 시 테이블 직접 UPSERT 폴백
    const { error: upsertErr } = await client.from('schema_definitions').upsert({
      id: schemaDef.id || 'main_schema',
      schema_name: schemaDef.schema_name,
      key_field: schemaDef.key_field,
      key_field_name: schemaDef.key_field_name,
      fields: schemaDef.fields,
      updated_at: new Date().toISOString()
    });

    if (upsertErr) throw upsertErr;

    if (resetData) {
      await client.from('print_queue').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await client.from('scan_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }

    return { success: true, message: '스키마 정의 저장 완료' };
  } catch (err) {
    const errMsg = err.message || '';
    if (errMsg.includes('schema_definitions') || errMsg.includes('schema cache') || errMsg.includes('404')) {
      return {
        success: true,
        localOnly: true,
        message: '로컬 스키마 저장 완료 (원격 DB 테이블 미생성 - 상단 [DDL 복사] 후 Supabase SQL Editor에서 1회 실행 필요)'
      };
    }
    console.error('스키마 패치 오류:', err);
    throw new Error(`스키마 패치 실패: ${errMsg}`);
  }
}

/**
 * 동적 레코드 전체 목록 조회 (scan_records)
 */
export async function fetchScanRecords(limit = 500) {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    // 1. scan_records 시도
    const { data, error } = await client
      .from('scan_records')
      .select('*')
      .order('scanned_at', { ascending: false })
      .limit(limit);

    if (!error && data && data.length > 0) {
      return data.map(r => ({
        id: r.id,
        key_value: r.key_value,
        scan_status: r.scan_status,
        scanned_at: r.scanned_at,
        ...r.data
      }));
    }

    // 2. scan_records가 비어있을 때 imei_scans 호환 폴백
    const { data: oldData, error: oldErr } = await client
      .from('imei_scans')
      .select('*')
      .order('scanned_at', { ascending: false })
      .limit(limit);

    if (!oldErr && oldData) {
      return oldData.map(r => ({
        id: r.id,
        key_value: r.asset_no || r.imei,
        scan_status: r.status,
        scanned_at: r.scanned_at,
        asset_no: r.asset_no,
        imei: r.imei,
        serial_no: r.serial_no,
        mac_address: r.mac_address
      }));
    }

    return [];
  } catch (err) {
    console.warn('레코드 목록 조회 오류:', err);
    return [];
  }
}

/**
 * 동적 레코드 단건 저장 (모바일 스캐너 및 수기 입력)
 */
export async function saveScanRecord(keyValue, recordData, status = 'SCANNED') {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
  if (!keyValue) throw new Error('키 인덱스 값이 필요합니다.');

  const payload = {
    key_value: String(keyValue).trim(),
    data: recordData,
    scan_status: status,
    scanned_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await client
    .from('scan_records')
    .upsert(payload, { onConflict: 'key_value' })
    .select()
    .single();

  if (error) {
    // scan_records 테이블이 없으면 imei_scans에 폴백
    await client.from('imei_scans').upsert({
      asset_no: recordData.asset_no || keyValue,
      imei: recordData.imei || keyValue,
      mac_address: recordData.mac_address || '',
      serial_no: recordData.serial_no || '',
      status: status,
      scanned_at: new Date().toISOString()
    });
    return { key_value: keyValue, ...recordData };
  }

  return { id: data.id, key_value: data.key_value, ...data.data };
}
