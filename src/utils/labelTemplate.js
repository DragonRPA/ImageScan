/**
 * Multi-Template Preset Schema & ZPL II Dynamic Compiler Engine (SSOT)
 * Core Fields: 자산번호(asset_no), 제품명(product_name), 모델명(model_name), 제조번호(serial_no)
 */
import { getSupabaseClient } from './supabaseClient';

export const LOCAL_KEY_ACTIVE_TEMPLATE_ID = 'IMAGE_SCAN_ACTIVE_TEMPLATE_ID_V3';
export const LOCAL_KEY_TEMPLATE_PRESETS = 'IMAGE_SCAN_TEMPLATE_PRESETS_V3';

// ── 4대 표준 빌트인 프리셋 ───────────────────────────────────────────────
export const BUILTIN_PRESETS = [
  {
    templateId: 'tpl_asset_large_72x40',
    targetTable: 'asset',
    schemaId: 'main_schema',
    name: '자산 대형 72×40mm (기본)',
    isDefault: true,
    paper: {
      widthMm: 72,
      heightMm: 40,
      dpi: 203,
      dotsWidth: 576,
      dotsHeight: 320
    },
    elements: [
      {
        id: 'elem_asset_no',
        name: '자산번호',
        type: 'text',
        field: 'asset_no',
        prefix: '',
        xMm: 2.0,
        yMm: 1.5,
        fontSizePt: 28,
        fontFamily: 'A0N',
        visible: true
      },
      {
        id: 'elem_divider',
        name: '구분선',
        type: 'line',
        xMm: 1.2,
        yMm: 6.0,
        widthMm: 69.5,
        thicknessMm: 0.25,
        visible: true
      },
      {
        id: 'elem_product_name',
        name: '제품명',
        type: 'text',
        field: 'product_name',
        prefix: '제품명: ',
        xMm: 2.0,
        yMm: 7.0,
        fontSizePt: 20,
        fontFamily: 'A0N',
        visible: true
      },
      {
        id: 'elem_model_name',
        name: '모델명',
        type: 'text',
        field: 'model_name',
        prefix: 'M/N: ',
        xMm: 2.0,
        yMm: 10.5,
        fontSizePt: 20,
        fontFamily: 'A0N',
        visible: true
      },
      {
        id: 'elem_serial_no',
        name: '제조번호(시리얼)',
        type: 'text',
        field: 'serial_no',
        prefix: 'S/N: ',
        xMm: 2.0,
        yMm: 14.0,
        fontSizePt: 18,
        fontFamily: 'A0N',
        visible: true
      },
      {
        id: 'elem_barcode',
        name: '바코드 / QR',
        type: 'barcode',
        barcodeType: 'CODE128',
        targetField: 'asset_no',
        xMm: 2.0,
        yMm: 18.0,
        heightMm: 10.0,
        qrScale: 4,
        showText: true,
        visible: true
      }
    ]
  },
  {
    templateId: 'tpl_asset_qr_50x25',
    targetTable: 'asset',
    schemaId: 'main_schema',
    name: '자산 소형 QR 50×25mm',
    isDefault: false,
    paper: {
      widthMm: 50,
      heightMm: 25,
      dpi: 203,
      dotsWidth: 400,
      dotsHeight: 200
    },
    elements: [
      {
        id: 'elem_barcode_qr',
        name: 'QR 코드',
        type: 'barcode',
        barcodeType: 'QR',
        targetField: 'asset_no',
        xMm: 2.0,
        yMm: 2.0,
        heightMm: 12.0,
        qrScale: 4,
        showText: false,
        visible: true
      },
      {
        id: 'elem_asset_no',
        name: '자산번호',
        type: 'text',
        field: 'asset_no',
        prefix: '',
        xMm: 18.0,
        yMm: 3.0,
        fontSizePt: 26,
        fontFamily: 'A0N',
        visible: true
      },
      {
        id: 'elem_model_name',
        name: '모델명',
        type: 'text',
        field: 'model_name',
        prefix: 'M/N: ',
        xMm: 18.0,
        yMm: 12.0,
        fontSizePt: 16,
        fontFamily: 'A0N',
        visible: true
      }
    ]
  },
  {
    templateId: 'tpl_serial_qr_60x30',
    targetTable: 'asset',
    schemaId: 'main_schema',
    name: '제조번호 QR 60×30mm',
    isDefault: false,
    paper: {
      widthMm: 60,
      heightMm: 30,
      dpi: 203,
      dotsWidth: 480,
      dotsHeight: 240
    },
    elements: [
      {
        id: 'elem_serial_no',
        name: '제조번호(시리얼)',
        type: 'text',
        field: 'serial_no',
        prefix: 'S/N: ',
        xMm: 2.0,
        yMm: 2.0,
        fontSizePt: 22,
        fontFamily: 'A0N',
        visible: true
      },
      {
        id: 'elem_model_name',
        name: '모델명',
        type: 'text',
        field: 'model_name',
        prefix: 'M/N: ',
        xMm: 2.0,
        yMm: 9.0,
        fontSizePt: 18,
        fontFamily: 'A0N',
        visible: true
      },
      {
        id: 'elem_barcode_qr',
        name: 'QR 코드',
        type: 'barcode',
        barcodeType: 'QR',
        targetField: 'serial_no',
        xMm: 40.0,
        yMm: 2.0,
        heightMm: 14.0,
        qrScale: 4,
        showText: false,
        visible: true
      }
    ]
  },
  {
    templateId: 'tpl_temp_asset_72x40',
    targetTable: 'temp_asset',
    schemaId: 'temp_asset_schema',
    name: '임시자산 대형 72×40mm',
    isDefault: false,
    paper: {
      widthMm: 72,
      heightMm: 40,
      dpi: 203,
      dotsWidth: 576,
      dotsHeight: 320
    },
    elements: [
      {
        id: 'elem_asset_no',
        name: '임시자산번호',
        type: 'text',
        field: 'asset_no',
        prefix: 'TEMP: ',
        xMm: 2.0,
        yMm: 1.5,
        fontSizePt: 28,
        fontFamily: 'A0N',
        visible: true
      },
      {
        id: 'elem_divider',
        name: '구분선',
        type: 'line',
        xMm: 1.2,
        yMm: 6.0,
        widthMm: 69.5,
        thicknessMm: 0.25,
        visible: true
      },
      {
        id: 'elem_product_name',
        name: '제품명',
        type: 'text',
        field: 'product_name',
        prefix: '제품명: ',
        xMm: 2.0,
        yMm: 7.0,
        fontSizePt: 20,
        fontFamily: 'A0N',
        visible: true
      },
      {
        id: 'elem_model_name',
        name: '모델명',
        type: 'text',
        field: 'model_name',
        prefix: 'M/N: ',
        xMm: 2.0,
        yMm: 10.5,
        fontSizePt: 20,
        fontFamily: 'A0N',
        visible: true
      },
      {
        id: 'elem_serial_no',
        name: '제조번호(시리얼)',
        type: 'text',
        field: 'serial_no',
        prefix: 'S/N: ',
        xMm: 2.0,
        yMm: 14.0,
        fontSizePt: 18,
        fontFamily: 'A0N',
        visible: true
      },
      {
        id: 'elem_barcode',
        name: '바코드 / QR',
        type: 'barcode',
        barcodeType: 'CODE128',
        targetField: 'asset_no',
        xMm: 2.0,
        yMm: 18.0,
        heightMm: 10.0,
        qrScale: 4,
        showText: true,
        visible: true
      }
    ]
  }
];

export const DEFAULT_LABEL_TEMPLATE = BUILTIN_PRESETS[0];

/**
 * ⭐️ 새 템플릿 생성 팩토리 (지정된 테이블 스키마 기반)
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
        yMm: 1.5,
        fontSizePt: 26,
        fontFamily: 'A0N',
        visible: true
      },
      {
        id: 'elem_divider',
        name: '구분선',
        type: 'line',
        xMm: 1.2,
        yMm: 6.0,
        widthMm: Math.max(10, widthMm - 2.5),
        thicknessMm: 0.25,
        visible: true
      },
      {
        id: 'elem_barcode',
        name: '바코드 / QR',
        type: 'barcode',
        barcodeType: 'CODE128',
        targetField: 'asset_no',
        xMm: 2.0,
        yMm: 16.0,
        heightMm: 10.0,
        qrScale: 4,
        showText: true,
        visible: true
      }
    ]
  };
}

/**
 * 전체 프리셋 목록 로드 (로컬 + 기본)
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
  return BUILTIN_PRESETS;
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
    return presets[0] || DEFAULT_LABEL_TEMPLATE;
  } catch (e) {
    return DEFAULT_LABEL_TEMPLATE;
  }
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
        schemaId: data.schema_id,
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
 * Supabase 백엔드에 라벨 서식 저장
 */
export async function saveBackendLabelTemplate(template) {
  saveStoredLabelTemplate(template);
  const client = getSupabaseClient();
  if (!client) return { success: true, message: '로컬 서식 저장 완료' };

  try {
    const payload = {
      id: template.templateId || 'tpl_asset_large_72x40',
      schema_id: template.schemaId || 'main_schema',
      name: template.name || '자산 대형 72×40mm',
      paper: template.paper,
      elements: template.elements,
      is_default: true,
      updated_at: new Date().toISOString()
    };

    const { error } = await client.from('label_templates').upsert(payload);
    if (error) throw error;
    return { success: true, message: '서식 백엔드 저장 완료' };
  } catch (err) {
    console.warn('백엔드 라벨 서식 저장 오류 (로컬만 저장됨):', err);
    return { success: true, message: '로컬 서식 저장 완료' };
  }
}

/**
 * mm -> ZPL Dot 변환
 */
export function mmToDots(mm, dpi = 203) {
  return Math.round(Number(mm || 0) * (dpi / 25.4));
}

/**
 * 템플릿과 데이터 아이템을 결합하여 ZPL II 동적 컴파일 (4대 핵심 헤더 기반)
 */
export function generateDynamicZpl(item = {}, template = DEFAULT_LABEL_TEMPLATE) {
  const t = template || DEFAULT_LABEL_TEMPLATE;
  const paper = t.paper || DEFAULT_LABEL_TEMPLATE.paper;
  const dpi = paper.dpi || 203;

  const dotsW = paper.dotsWidth || mmToDots(paper.widthMm, dpi);
  const dotsH = paper.dotsHeight || mmToDots(paper.heightMm, dpi);

  const zplCommands = [
    '^XA',
    `^PW${dotsW}`,
    `^LL${dotsH}`,
    '^CI28',
    '^LH0,0',
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

  (t.elements || []).forEach(elem => {
    if (!elem.visible) return;

    const posX = mmToDots(elem.xMm, dpi);
    const posY = mmToDots(elem.yMm, dpi);

    if (elem.type === 'text') {
      const val = getValue(elem);
      const prefix = elem.prefix || '';
      const text = `${prefix}${val}`;
      const fontH = Math.round((elem.fontSizePt || 20) * 1.0);
      zplCommands.push(`^FO${posX},${posY}^A0N,${fontH},${fontH}^FD${text}^FS`);
    } else if (elem.type === 'line') {
      const lineW = mmToDots(elem.widthMm || 60, dpi);
      const lineThick = Math.max(1, mmToDots(elem.thicknessMm || 0.25, dpi));
      zplCommands.push(`^FO${posX},${posY}^GB${lineW},${lineThick},${lineThick}^FS`);
    } else if (elem.type === 'image') {
      const imgW = mmToDots(elem.widthMm || 20, dpi);
      const imgH = mmToDots(elem.heightMm || 10, dpi);
      // ZPL 그래픽 플레이스홀더 / 박스
      zplCommands.push(`^FO${posX},${posY}^GB${imgW},${imgH},1^FS`);
    } else if (elem.type === 'barcode') {
      const targetVal = String(getValue({ field: elem.targetField }) || item[elem.targetField] || item.key_value || 'TEST0001');
      const showTextParam = elem.showText ? 'Y' : 'N';
      const barcodeType = elem.barcodeType || 'CODE128';

      if (barcodeType === 'QR') {
        const qrMag = Math.max(1, Math.min(10, elem.qrScale || 4));
        zplCommands.push(`^FO${posX},${posY}^BQN,2,${qrMag}^FDQA,${targetVal}^FS`);
      } else if (barcodeType === 'CODE128') {
        const barH = mmToDots(elem.heightMm || 10, dpi);
        zplCommands.push(`^FO${posX},${posY}^BY2,3,${barH}^BCN,${barH},${showTextParam},N,N^FD${targetVal}^FS`);
      } else {
        // CODE128 기본
        const barHeightDots = mmToDots(elem.heightMm || 10, dpi);
        zplCommands.push(`^FO${posX},${posY}^BCN,${barHeightDots},${showTextParam},N,N^FD${targetVal}^FS`);
      }
    }
  });

  zplCommands.push('^XZ');
  return zplCommands.join('\n');
}
