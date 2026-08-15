/**
 * Multi-Template Preset Schema & ZPL II Dynamic Compiler Engine (SSOT)
 * Core Fields: 자산번호(asset_no), 제품명(product_name), 모델명(model_name), 제조번호(serial_no)
 */
import { getSupabaseClient } from './supabaseClient';

export const LOCAL_KEY_ACTIVE_TEMPLATE_ID = 'IMAGE_SCAN_ACTIVE_TEMPLATE_ID_V3';
export const LOCAL_KEY_TEMPLATE_PRESETS = 'IMAGE_SCAN_TEMPLATE_PRESETS_V3';

export const DEFAULT_LABEL_TEMPLATE = {
  templateId: 'tpl_default',
  targetTable: 'asset',
  schemaId: 'main_schema',
  name: '기본 라벨 서식 (72×40mm)',
  isDefault: true,
  paper: {
    widthMm: 72,
    heightMm: 40,
    dpi: 203,
    dotsWidth: 576,
    dotsHeight: 320
  },
  elements: []
};

/**
 * ⭐️ 새 템플릿 생성 팩토리 (모든 아이템이 깨끗한 빈 서식으로 시작)
 */
export function createEmptyTemplate(name = '새 라벨 서식', targetTable = 'asset', widthMm = 72, heightMm = 40) {
  const dotsWidth = Math.round(widthMm * 8);
  const dotsHeight = Math.round(heightMm * 8);
  const id = `tpl_custom_${Date.now()}`;

  return {
    templateId: id,
    targetTable: targetTable || 'asset',
    schemaId: targetTable === 'temp_asset' ? 'temp_asset_schema' : 'asset_schema',
    name: name,
    isDefault: false,
    paper: {
      widthMm: Number(widthMm) || 72,
      heightMm: Number(heightMm) || 40,
      dpi: 203,
      dotsWidth,
      dotsHeight
    },
    elements: [
      {
        id: 'elem_asset_no',
        name: targetTable === 'temp_asset' ? '임시자산번호' : '자산번호',
        type: 'text',
        field: 'asset_no',
        prefix: '',
        xMm: 2.0,
        yMm: 2.0,
        fontSizePt: 22,
        fontFamily: 'A0N',
        visible: false
      },
      {
        id: 'elem_category_major',
        name: '대분류',
        type: 'text',
        field: 'category_major',
        prefix: '',
        xMm: 2.0,
        yMm: 6.0,
        fontSizePt: 16,
        fontFamily: 'A0N',
        visible: false
      },
      {
        id: 'elem_product_name',
        name: '제품명',
        type: 'text',
        field: 'product_name',
        prefix: '제품명: ',
        xMm: 2.0,
        yMm: 8.0,
        fontSizePt: 16,
        fontFamily: 'A0N',
        visible: false
      },
      {
        id: 'elem_model_name',
        name: '모델명',
        type: 'text',
        field: 'model_name',
        prefix: 'M/N: ',
        xMm: 2.0,
        yMm: 13.0,
        fontSizePt: 16,
        fontFamily: 'A0N',
        visible: false
      },
      {
        id: 'elem_serial_no',
        name: '제조번호(시리얼)',
        type: 'text',
        field: 'serial_no',
        prefix: 'S/N: ',
        xMm: 2.0,
        yMm: 18.0,
        fontSizePt: 16,
        fontFamily: 'A0N',
        visible: false
      },
      {
        id: 'elem_asset_option',
        name: '옵션',
        type: 'text',
        field: 'asset_option',
        prefix: '옵션: ',
        xMm: 2.0,
        yMm: 23.0,
        fontSizePt: 14,
        fontFamily: 'A0N',
        visible: false
      },
      {
        id: 'elem_shelf_no',
        name: '선반번호',
        type: 'text',
        field: 'shelf_no',
        prefix: '선반: ',
        xMm: 45.0,
        yMm: 2.0,
        fontSizePt: 16,
        fontFamily: 'A0N',
        visible: false
      },
      {
        id: 'elem_imei',
        name: 'IMEI',
        type: 'text',
        field: 'imei',
        prefix: 'IMEI: ',
        xMm: 2.0,
        yMm: 27.0,
        fontSizePt: 14,
        fontFamily: 'A0N',
        visible: false
      },
      {
        id: 'elem_mac_wlan',
        name: 'MAC (wlan)',
        type: 'text',
        field: 'mac_wlan',
        prefix: 'MAC(W): ',
        xMm: 2.0,
        yMm: 31.0,
        fontSizePt: 13,
        fontFamily: 'A0N',
        visible: false
      },
      {
        id: 'elem_mac_lan',
        name: 'MAC (lan)',
        type: 'text',
        field: 'mac_lan',
        prefix: 'MAC(L): ',
        xMm: 2.0,
        yMm: 35.0,
        fontSizePt: 13,
        fontFamily: 'A0N',
        visible: false
      },
      {
        id: 'elem_asset_status',
        name: '자산상태',
        type: 'text',
        field: 'asset_status',
        prefix: '상태: ',
        xMm: 45.0,
        yMm: 6.0,
        fontSizePt: 14,
        fontFamily: 'A0N',
        visible: false
      },
      {
        id: 'elem_spec',
        name: '구성요소(사양)',
        type: 'text',
        field: 'spec',
        prefix: '사양: ',
        xMm: 2.0,
        yMm: 39.0,
        fontSizePt: 12,
        fontFamily: 'A0N',
        visible: false
      },
      {
        id: 'elem_repair_date',
        name: '교진일자',
        type: 'text',
        field: 'repair_date',
        prefix: '교진일: ',
        xMm: 45.0,
        yMm: 10.0,
        fontSizePt: 13,
        fontFamily: 'A0N',
        visible: false
      },
      {
        id: 'elem_remark',
        name: '비고',
        type: 'text',
        field: 'remark',
        prefix: '',
        xMm: 2.0,
        yMm: 43.0,
        fontSizePt: 12,
        fontFamily: 'A0N',
        visible: false
      },
      {
        id: 'elem_divider',
        name: '구분선',
        type: 'line',
        xMm: 1.5,
        yMm: 7.0,
        widthMm: Math.max(10, widthMm - 3),
        thicknessMm: 0.25,
        visible: false
      },
      {
        id: 'elem_barcode',
        name: '바코드 / QR',
        type: 'barcode',
        barcodeType: 'CODE128',
        targetField: 'asset_no',
        prefix: '',
        xMm: 2.0,
        yMm: 22.0,
        heightMm: 10.0,
        qrScale: 4,
        showText: true,
        visible: false
      },
      {
        id: 'elem_custom_text_1',
        name: '추가 텍스트 1',
        type: 'text',
        field: 'custom_text_1',
        customValue: '',
        prefix: '',
        xMm: 2.0,
        yMm: 2.0,
        fontSizePt: 14,
        fontFamily: 'A0N',
        visible: false
      },
      {
        id: 'elem_custom_text_2',
        name: '추가 텍스트 2',
        type: 'text',
        field: 'custom_text_2',
        customValue: '',
        prefix: '',
        xMm: 2.0,
        yMm: 6.0,
        fontSizePt: 14,
        fontFamily: 'A0N',
        visible: false
      },
      {
        id: 'elem_custom_text_3',
        name: '추가 텍스트 3',
        type: 'text',
        field: 'custom_text_3',
        customValue: '',
        prefix: '',
        xMm: 2.0,
        yMm: 10.0,
        fontSizePt: 14,
        fontFamily: 'A0N',
        visible: false
      },
      {
        id: 'elem_custom_text_4',
        name: '추가 텍스트 4',
        type: 'text',
        field: 'custom_text_4',
        customValue: '',
        prefix: '',
        xMm: 2.0,
        yMm: 14.0,
        fontSizePt: 14,
        fontFamily: 'A0N',
        visible: false
      },
      {
        id: 'elem_image',
        name: '이미지 / 로고',
        type: 'image',
        imageDataUrl: '',
        widthMm: 18.0,
        heightMm: 12.0,
        xMm: 45.0,
        yMm: 2.0,
        visible: false
      }
    ]
  };
}

/**
 * 전체 프리셋 목록 로드 (서버 DB 동기화 캐시)
 */
export function getAllPresets() {
  try {
    const stored = localStorage.getItem(LOCAL_KEY_TEMPLATE_PRESETS);
    if (stored) {
      const list = JSON.parse(stored);
      if (Array.isArray(list) && list.length > 0) {
        return list;
      }
    }
  } catch (e) {}
  return [];
}

/**
 * 현재 활성 템플릿 로드
 */
export function getStoredLabelTemplate() {
  try {
    const activeId = localStorage.getItem(LOCAL_KEY_ACTIVE_TEMPLATE_ID);
    const presets = getAllPresets();
    if (activeId) {
      const found = presets.find(p => p.templateId === activeId);
      if (found) return found;
    }
    if (presets.length > 0) return presets[0];
  } catch (e) {}
  return DEFAULT_LABEL_TEMPLATE;
}

/**
 * 활성 템플릿 저장 및 프리셋 목록 갱신
 */
export function saveStoredLabelTemplate(template) {
  try {
    const presets = getAllPresets();
    const idx = presets.findIndex(p => p.templateId === template.templateId);
    let updatedPresets;
    if (idx >= 0) {
      updatedPresets = [...presets];
      updatedPresets[idx] = template;
    } else {
      updatedPresets = [...presets, template];
    }
    localStorage.setItem(LOCAL_KEY_TEMPLATE_PRESETS, JSON.stringify(updatedPresets));
    localStorage.setItem(LOCAL_KEY_ACTIVE_TEMPLATE_ID, template.templateId);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * ⭐️ 템플릿 삭제 및 로컬/백엔드 동기화
 */
export async function deleteStoredLabelTemplate(templateId) {
  try {
    const presets = getAllPresets();
    const updatedPresets = presets.filter(p => p.templateId !== templateId);
    localStorage.setItem(LOCAL_KEY_TEMPLATE_PRESETS, JSON.stringify(updatedPresets));

    // 현재 활성 템플릿이 삭제된 경우 첫 번째 프리셋으로 전환
    const activeId = localStorage.getItem(LOCAL_KEY_ACTIVE_TEMPLATE_ID);
    if (activeId === templateId) {
      const nextId = updatedPresets[0]?.templateId || DEFAULT_LABEL_TEMPLATE.templateId;
      localStorage.setItem(LOCAL_KEY_ACTIVE_TEMPLATE_ID, nextId);
    }

    // Supabase 백엔드에서도 삭제 시도
    const client = getSupabaseClient();
    if (client) {
      await client.from('label_templates').delete().eq('id', templateId);
    }
    return true;
  } catch (e) {
    console.warn('템플릿 삭제 실패:', e);
    return false;
  }
}

/**
 * ⭐️ Supabase 백엔드에서 전체 라벨 서식 목록 조회 (100% DB SSOT)
 */
export async function syncTemplatesWithBackend() {
  const client = getSupabaseClient();
  if (!client) return getAllPresets();

  try {
    const { data, error } = await client
      .from('label_templates')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && data) {
      // 백엔드 데이터를 템플릿 포맷으로 매핑
      const backendPresets = data.map(row => ({
        templateId: row.id,
        targetTable: row.paper?.targetTable || row.target_table || (row.name?.includes('임시') ? 'temp_asset' : 'asset'),
        schemaId: row.schema_id || 'main_schema',
        name: row.name,
        isDefault: Boolean(row.is_default),
        paper: row.paper || { widthMm: 72, heightMm: 40, dpi: 203, dotsWidth: 576, dotsHeight: 320 },
        elements: Array.isArray(row.elements) ? row.elements : []
      }));

      // ⭐️ 100% 서버 DB에서 조회된 레코드만 로컬 스토리지에 동기화
      localStorage.setItem(LOCAL_KEY_TEMPLATE_PRESETS, JSON.stringify(backendPresets));
      return backendPresets;
    }
  } catch (err) {
    console.warn('서버 라벨 서식 조회 실패 (로컬 캐시 유지):', err);
  }

  return getAllPresets();
}

/**
 * Supabase 백엔드에서 활성 라벨 서식 로드
 */
export async function fetchBackendLabelTemplate() {
  const client = getSupabaseClient();
  if (!client) return getStoredLabelTemplate();

  try {
    const { data, error } = await client
      .from('label_templates')
      .select('*')
      .eq('is_default', true)
      .maybeSingle();

    if (!error && data && data.paper && Array.isArray(data.elements)) {
      const tpl = {
        templateId: data.id,
        targetTable: data.paper?.targetTable || data.target_table || 'asset',
        schemaId: data.schema_id || 'main_schema',
        name: data.name,
        paper: data.paper,
        elements: data.elements,
        isDefault: data.is_default
      };
      saveStoredLabelTemplate(tpl);
      return tpl;
    }
  } catch (err) {
    console.warn('백엔드 라벨 템플릿 로드 실패, 로컬 캐시 사용:', err);
  }
  return getStoredLabelTemplate();
}

/**
 * ⭐️ Supabase 백엔드에 라벨 서식 저장 (온라인 DB + 로컬 동시 보존)
 */
export async function saveBackendLabelTemplate(template) {
  saveStoredLabelTemplate(template);
  const client = getSupabaseClient();
  if (!client) return { success: true, message: '로컬 서식 저장 완료 (DB 클라이언트 없음)' };

  try {
    const targetTable = template.targetTable || template.paper?.targetTable || 'asset';
    const paperObj = {
      ...(template.paper || { widthMm: 72, heightMm: 40, dpi: 203, dotsWidth: 576, dotsHeight: 320 }),
      targetTable: targetTable
    };

    const payload = {
      id: template.templateId || `tpl_custom_${Date.now()}`,
      schema_id: null,
      name: template.name || '자산 대형 72×40mm',
      paper: paperObj,
      elements: Array.isArray(template.elements) ? template.elements : [],
      is_default: Boolean(template.isDefault),
      updated_at: new Date().toISOString()
    };

    const { error } = await client.from('label_templates').upsert(payload);
    if (error) throw error;
    return { success: true, message: '온라인 DB 서식 저장 완료' };
  } catch (err) {
    console.error('백엔드 라벨 서식 저장 오류:', err);
    return { success: false, message: `DB 저장 오류: ${err.message}` };
  }
}

/**
 * mm -> ZPL Dot 변환
 */
export function mmToDots(mm, dpi = 203) {
  return Math.round(Number(mm || 0) * (dpi / 25.4));
}

import JsBarcode from 'jsbarcode';

/**
 * ⭐️ UBUS 실무 검증 정통 네이티브 한글 ZPL II 생성 엔진
 * - Zebra GK-420D / ZD-420D 프린터 한글 폰트 완벽 지원 (^SEE:UHANGUL.DAT^FS^CW1,E:KFONT3.FNT^CI26^FS)
 * - 한글 텍스트: ^A1N,{h},{w} (KFONT3.FNT)
 * - 영문 텍스트: ^A0N,{h},{w}
 * - 1D 바코드: ^BY2,2.0,{h}^BCN,{h},N,N,N
 */
export function generateDynamicZpl(item = {}, template = DEFAULT_LABEL_TEMPLATE) {
  const t = template || DEFAULT_LABEL_TEMPLATE;
  const paper = t.paper || DEFAULT_LABEL_TEMPLATE.paper;
  const dpi = paper.dpi || 203;

  const dotsW = paper.dotsWidth || mmToDots(paper.widthMm, dpi);
  const dotsH = paper.dotsHeight || mmToDots(paper.heightMm, dpi);

  const zplCommands = [
    '^XA',
    '^MD21',
    `^PW${dotsW}`,
    `^LL${dotsH}`,
    '^LH0,0',
    '^SEE:UHANGUL.DAT^FS',
    '^CW1,E:KFONT3.FNT^FS',
    '^CI26^FS',
    '^MMT'
  ];

  const getValue = (elem) => {
    if (!elem) return '';
    if (elem.field === 'custom' || elem.field?.startsWith('custom_text_')) return elem.customValue || '';
    const raw = item[elem.field] || item.data?.[elem.field] || item[elem.id];
    if (raw !== undefined && raw !== null && raw !== '') return String(raw);
    if (elem.field === 'asset_no') return String(item.key_value || item.asset_no || 'TEST0001');
    if (elem.field === 'serial_no') return String(item.serial_no || 'R5KL60F0CZW');
    if (elem.field === 'model_name') return String(item.model_name || 'SM-S921N');
    if (elem.field === 'product_name') return String(item.product_name || '갤럭시 S24');
    return '';
  };

  const hasKorean = (str) => /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(str);

  (t.elements || []).forEach(elem => {
    if (!elem.visible) return;

    const posX = mmToDots(elem.xMm, dpi);
    const posY = mmToDots(elem.yMm, dpi);

    if (elem.type === 'text') {
      const val = getValue(elem);
      const prefix = elem.prefix || '';
      const text = `${prefix}${val}`;
      const fontPt = elem.fontSizePt || 12;

      // ⭐️ 203 DPI 기준 Pt -> ZPL Dot 정밀 매핑 (12pt = 30 dots ≈ 3.75mm 실무 표준)
      const fontH = Math.max(18, Math.min(100, Math.round(fontPt * 2.5)));
      const fontW = fontH;

      // 한글 포함 시 UBUS 표준 ^A1N (KFONT3), 영문 전용은 ^A0N
      const fontCmd = hasKorean(text) ? `^A1N,${fontH},${fontW}` : `^A0N,${fontH},${fontW}`;
      zplCommands.push(`^FO${posX},${posY}${fontCmd}^FD${text}^FS`);
    } else if (elem.type === 'line') {
      const lineW = mmToDots(elem.widthMm || 60, dpi);
      const lineThick = Math.max(1, mmToDots(elem.thicknessMm || 0.25, dpi));
      zplCommands.push(`^FO${posX},${posY}^GB${lineW},${lineThick},${lineThick}^FS`);
    } else if (elem.type === 'image') {
      const imgW = mmToDots(elem.widthMm || 20, dpi);
      const imgH = mmToDots(elem.heightMm || 10, dpi);
      zplCommands.push(`^FO${posX},${posY}^GB${imgW},${imgH},1^FS`);
    } else if (elem.type === 'barcode') {
      const targetVal = String(getValue({ field: elem.targetField }) || item[elem.targetField] || item.key_value || 'TEST0001');
      const showTextParam = elem.showText ? 'Y' : 'N';
      const barcodeType = elem.barcodeType || 'CODE128';
      const barH = mmToDots(elem.heightMm || 10, dpi);

      if (barcodeType === 'QR') {
        const qrMag = Math.max(1, Math.min(10, elem.qrScale || 4));
        zplCommands.push(`^FO${posX},${posY}^BQN,2,${qrMag}^FDQA,${targetVal}^FS`);
        zplCommands.push(`^FO${posX},${posY}^BY2,3,${barH}^BCN,${barH},${showTextParam},N,N^FD${targetVal}^FS`);
      } else {
        const barHeightDots = mmToDots(elem.heightMm || 10, dpi);
        zplCommands.push(`^FO${posX},${posY}^BCN,${barHeightDots},${showTextParam},N,N^FD${targetVal}^FS`);
      }
    }
  });

  zplCommands.push('^XZ');
  return zplCommands.join('\n');
}

/**
 * ⭐️ 호환성 유지용 WYSIWYG ZPL 비동기 래퍼
 */
export async function generateWysiwygZpl(item = {}, template = DEFAULT_LABEL_TEMPLATE) {
  return generateDynamicZpl(item, template);
}
