/**
 * Label Template Schema & ZPL II Dynamic Compiler Engine (SSOT)
 * Supports: Code 39, Code 128, QR Code, Human-Readable Text Toggle, Backend Sync
 */
import { getSupabaseClient } from './supabaseClient';

export const LOCAL_KEY_LABEL_TEMPLATE = 'IMAGE_SCAN_LABEL_DESIGNER_TEMPLATE_V2';

// ── 기본 72mm x 40mm 라벨 템플릿 (203 DPI) ─────────────────────────────────
export const DEFAULT_LABEL_TEMPLATE = {
  templateId: 'tpl_default_72x40',
  schemaId: 'main_schema',
  name: '72mm x 40mm 기본 라벨',
  paper: {
    widthMm: 72,
    heightMm: 40,
    dpi: 203,
    dotsWidth: 576,  // Math.round(72 * 8)
    dotsHeight: 320  // Math.round(40 * 8)
  },
  elements: [
    {
      id: 'elem_asset_no',
      name: '관리번호',
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
      id: 'elem_imei',
      name: 'IMEI',
      type: 'text',
      field: 'imei',
      prefix: 'IMEI: ',
      xMm: 2.0,
      yMm: 7.0,
      fontSizePt: 20,
      fontFamily: 'A0N',
      visible: true
    },
    {
      id: 'elem_serial',
      name: '시리얼번호',
      type: 'text',
      field: 'serial_no',
      prefix: 'S/N: ',
      xMm: 2.0,
      yMm: 10.5,
      fontSizePt: 18,
      fontFamily: 'A0N',
      visible: true
    },
    {
      id: 'elem_mac',
      name: 'MAC 주소',
      type: 'text',
      field: 'mac_address',
      prefix: 'MAC: ',
      xMm: 2.0,
      yMm: 14.0,
      fontSizePt: 18,
      fontFamily: 'A0N',
      visible: true
    },
    {
      id: 'elem_scanned_at',
      name: '스캔일시',
      type: 'text',
      field: 'scanned_at',
      prefix: 'DATE: ',
      xMm: 2.0,
      yMm: 17.0,
      fontSizePt: 16,
      fontFamily: 'A0N',
      visible: false
    },
    {
      id: 'elem_custom_text',
      name: '고정 텍스트',
      type: 'text',
      field: 'custom',
      prefix: '',
      customValue: 'DRA RENTAL ASSET',
      xMm: 2.0,
      yMm: 20.0,
      fontSizePt: 16,
      fontFamily: 'A0N',
      visible: false
    },
    {
      id: 'elem_barcode',
      name: '바코드 / QR',
      type: 'barcode',
      barcodeType: 'CODE39', // 'CODE39' | 'CODE128' | 'QR'
      targetField: 'asset_no',
      xMm: 2.0,
      yMm: 18.0,
      heightMm: 10.0,
      qrScale: 4,
      showText: true,        // 하단 텍스트 표시 여부 체크박스
      visible: true
    }
  ]
};

/**
 * 템플릿 로컬스토리지 조회
 */
export function getStoredLabelTemplate() {
  try {
    const stored = localStorage.getItem(LOCAL_KEY_LABEL_TEMPLATE);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.paper && Array.isArray(parsed.elements)) {
        return parsed;
      }
    }
  } catch (e) {}
  return DEFAULT_LABEL_TEMPLATE;
}

/**
 * 템플릿 로컬스토리지 저장
 */
export function saveStoredLabelTemplate(template) {
  try {
    localStorage.setItem(LOCAL_KEY_LABEL_TEMPLATE, JSON.stringify(template));
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Supabase 백엔드에서 라벨 서식 로드
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
        is_default: data.is_default
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
      id: template.templateId || 'tpl_default_72x40',
      schema_id: template.schemaId || 'main_schema',
      name: template.name || '72mm x 40mm 기본 라벨',
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
 * 템플릿과 데이터 아이템을 결합하여 ZPL II 동적 컴파일 (3대 바코드 지원)
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
    if (elem.field === 'custom') return elem.customValue || '';
    const raw = item[elem.field] || item.data?.[elem.field] || item[elem.id];
    if (raw !== undefined && raw !== null && raw !== '') return String(raw);
    if (elem.field === 'asset_no' || elem.field === 'key_field') return String(item.key_value || item.asset_no || 'TEST0001');
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
    } else if (elem.type === 'barcode') {
      const targetVal = String(item[elem.targetField] || item.data?.[elem.targetField] || item.key_value || 'TEST0001');
      const showTextParam = elem.showText ? 'Y' : 'N';
      const barcodeType = elem.barcodeType || 'CODE39';

      if (barcodeType === 'QR') {
        // QR Code 2D: ^BQN,2,{magnification}^FDQA,{data}^FS
        const qrMag = Math.max(1, Math.min(10, elem.qrScale || 4));
        zplCommands.push(`^FO${posX},${posY}^BQN,2,${qrMag}^FDQA,${targetVal}^FS`);
      } else if (barcodeType === 'CODE128') {
        // Code 128: ^BCN,{heightDots},{printLine ? 'Y':'N'},N,N^FD{data}^FS
        const barHeightDots = mmToDots(elem.heightMm || 10, dpi);
        zplCommands.push(`^FO${posX},${posY}^BCN,${barHeightDots},${showTextParam},N,N^FD${targetVal}^FS`);
      } else {
        // Code 39: ^B3N,N,{heightDots},{printLine ? 'Y':'N'},N^FD{data}^FS
        const cleanVal = targetVal.toUpperCase().replace(/[^A-Z0-9\-\.\$\/\+%\s]/g, '');
        const barHeightDots = mmToDots(elem.heightMm || 10, dpi);
        zplCommands.push(`^FO${posX},${posY}^B3N,N,${barHeightDots},${showTextParam},N^FD${cleanVal}^FS`);
      }
    }
  });

  zplCommands.push('^XZ');
  return zplCommands.join('\n');
}
