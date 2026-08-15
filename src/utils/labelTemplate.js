/**
 * Label Template Schema & ZPL II Dynamic Compiler Engine (SSOT)
 * System: Visual Label Designer for Zebra Thermal Printers
 */

export const LOCAL_KEY_LABEL_TEMPLATE = 'IMAGE_SCAN_LABEL_DESIGNER_TEMPLATE_V1';

// ── 기본 72mm x 40mm 라벨 템플릿 (Zebra GK-420D 203 DPI 기준) ──────────────
export const DEFAULT_LABEL_TEMPLATE = {
  templateId: 'default_72x40',
  name: '72mm x 40mm 기본 라벨 서식',
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
      name: '관리번호 (자산번호)',
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
      name: '시리얼번호 (S/N)',
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
      name: '스캔 일시',
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
      name: '고정 텍스트 (회사명 등)',
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
      name: 'Code 39 바코드',
      type: 'barcode',
      barcodeType: 'CODE39',
      targetField: 'asset_no',
      xMm: 2.0,
      yMm: 18.0,
      heightMm: 10.0,
      showText: true,
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
      // 필수 구조 검증
      if (parsed && parsed.paper && Array.isArray(parsed.elements)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('라벨 템플릿 로드 오류:', e);
  }
  return DEFAULT_LABEL_TEMPLATE;
}

/**
 * 템플릿 로컬스토리지 영구 저장
 */
export function saveStoredLabelTemplate(template) {
  try {
    localStorage.setItem(LOCAL_KEY_LABEL_TEMPLATE, JSON.stringify(template));
    return true;
  } catch (e) {
    console.error('라벨 템플릿 저장 실패:', e);
    return false;
  }
}

/**
 * mm -> ZPL Dot 변환 (203 DPI = 8 dots/mm)
 */
export function mmToDots(mm, dpi = 203) {
  return Math.round(Number(mm || 0) * (dpi / 25.4));
}

/**
 * 템플릿과 데이터 아이템을 결합하여 ZPL II 코드를 동적 컴파일
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

  // 샘플 또는 실제 값 매핑
  const getValue = (elem) => {
    if (elem.field === 'custom') return elem.customValue || '';
    if (elem.field === 'asset_no') return (item.asset_no || item.assetNo || 'TEST0001').replace(/[^A-Z0-9\-_\. ]/gi, '');
    if (elem.field === 'imei') return (item.imei || '351379300225052').replace(/[^0-9]/g, '');
    if (elem.field === 'serial_no') return (item.serial_no || item.serialNo || 'R5KL60F0CZW').slice(0, 24);
    if (elem.field === 'mac_address') return (item.mac_address || item.macAddress || '4CEBB0B57A51').replace(/[^A-F0-9\-:]/gi, '').slice(0, 24);
    if (elem.field === 'scanned_at') return (item.scanned_at || new Date().toISOString().slice(0, 10));
    return item[elem.field] || '';
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
      const fontW = fontH;
      zplCommands.push(`^FO${posX},${posY}^A0N,${fontH},${fontW}^FD${text}^FS`);
    } else if (elem.type === 'line') {
      const lineW = mmToDots(elem.widthMm || 60, dpi);
      const lineThick = Math.max(1, mmToDots(elem.thicknessMm || 0.25, dpi));
      zplCommands.push(`^FO${posX},${posY}^GB${lineW},${lineThick},${lineThick}^FS`);
    } else if (elem.type === 'barcode') {
      let bcValue = '';
      if (elem.targetField === 'imei') {
        bcValue = (item.imei || '351379300225052').replace(/[^0-9]/g, '');
      } else if (elem.targetField === 'serial_no') {
        bcValue = (item.serial_no || item.serialNo || 'R5KL60F0CZW').toUpperCase().replace(/[^A-Z0-9\-\.\$\/\+%\s]/g, '');
      } else {
        bcValue = (item.asset_no || item.assetNo || 'TEST0001').toUpperCase().replace(/[^A-Z0-9\-\.\$\/\+%\s]/g, '');
      }
      const barHeightDots = mmToDots(elem.heightMm || 10, dpi);
      const showTextParam = elem.showText ? 'Y' : 'N';
      zplCommands.push(`^FO${posX},${posY}^B3N,N,${barHeightDots},${showTextParam},N^FD${bcValue}^FS`);
    }
  });

  zplCommands.push('^XZ');
  return zplCommands.join('\n');
}
