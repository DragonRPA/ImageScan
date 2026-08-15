/**
 * Universal Position-Agnostic Excel/CSV Parser & Pre-flight Header Validator Engine
 * System: Column Position-Free Dynamic Header Resolver & Zero Silent Failure Validator
 */
import * as XLSX from 'xlsx';

// ── 표준 필드별 별칭/유사어 사전 (Synonym Alias Dictionary) ───────────────
export const FIELD_SYNONYMS = {
  asset_no: {
    label: '자산번호',
    aliases: ['자산번호', '자산 번호', 'asset_no', 'assetno', '관리번호', '바코드', 'barcode', '자산코드', '자산_번호']
  },
  category_major: {
    label: '대분류',
    aliases: ['대분류', '대 분류', 'category_major', 'categorymajor', '카테고리', 'category', '대구분', '장비구분', '대_분류']
  },
  product_name: {
    label: '제품명',
    aliases: ['제품명', '제품 명', 'product_name', 'productname', '품명', '품목명', '품목', '제품_명']
  },
  model_name: {
    label: '모델명',
    aliases: ['모델명', '모델 명', 'model_name', 'modelname', 'model', 'm/n', '모델', '모델_명']
  },
  serial_no: {
    label: '제조번호(시리얼)',
    aliases: ['제조번호', '제조 번호', '시리얼', '시리얼넘버', '시리얼 번호', 'serial_no', 'serialno', 's/n', 'serial', '일련번호', '시리얼_번호']
  },
  imei: {
    label: 'IMEI',
    aliases: ['imei', '단말식별번호', '단말기식별번호', '단말식별', 'imei_no', 'imeino', '단말기식별', 'imei번호']
  },
  asset_status: {
    label: '자산상태',
    aliases: ['자산상태', '자산 상태', 'asset_status', 'assetstatus', '상태', 'status', '자산_상태']
  },
  earning_ratio: {
    label: '회수율',
    aliases: ['회수율', '회수 율', 'earning_ratio', 'earningratio', '매출회수율', '회수율(%)', '회수비율', 'ratio']
  },
  shelf_no: {
    label: '선반번호',
    aliases: ['선반번호', '선반 번호', 'shelf_no', 'shelfno', '선반', '위치', '로케이션', 'location', '선반_번호']
  },
  asset_option: {
    label: '옵션',
    aliases: ['옵션', 'asset_option', 'assetoption', 'option', '사양']
  },
  calibration_date: {
    label: '교정일자',
    aliases: ['교정일자', '교정 일자', 'calibration_date', 'calibrationdate', '교정일', '교정_일자']
  },
  remark: {
    label: '비고',
    aliases: ['비고', 'remark', '비고란', '메모', 'memo', '특이사항']
  },
  mac_wlan: {
    label: 'MAC wlan',
    aliases: ['mac wlan', 'macwlan', 'mac_wlan', 'wlan mac', '무선 mac', '무선mac', 'wlan_mac', 'wifi mac', '와이파이 mac', 'mac_address', 'macaddress', 'mac']
  },
  mac_lan: {
    label: 'MAC lan',
    aliases: ['mac lan', 'maclan', 'mac_lan', 'lan mac', '유선 mac', '유선mac', 'lan_mac', '이더넷 mac', 'ethernet mac']
  },
  components: {
    label: '구성요소',
    aliases: ['구성요소', '구성 요소', 'components', 'component', '사양', '스펙', 'storage', '메모리', '스토리지', '하드웨어구성', '구성_요소']
  },
  request_no: {
    label: '출고의뢰번호',
    aliases: ['출고의뢰번호', '출고의뢰 번호', 'request_no', 'requestno', '의뢰번호', '출고의뢰_번호']
  },
  order_no: {
    label: '발주번호',
    aliases: ['발주번호', '발주 번호', 'order_no', 'orderno', '발주_번호']
  }
};

/**
 * 엑셀 컬럼명 문자열을 표준 필드 ID로 변환
 */
export function resolveFieldKeyFromHeader(headerText) {
  if (!headerText) return null;
  const cleanHeader = String(headerText).trim().toLowerCase().replace(/[\s_\-\(\)\[\]]/g, '');

  for (const [fieldKey, def] of Object.entries(FIELD_SYNONYMS)) {
    for (const alias of def.aliases) {
      const cleanAlias = alias.toLowerCase().replace(/[\s_\-\(\)\[\]]/g, '');
      if (cleanHeader === cleanAlias) {
        return fieldKey;
      }
    }
  }
  return null;
}

/**
 * 엑셀/CSV 바이너리 데이터를 파싱하고 선행 헤더 정합성 검증 및 위치 무관 데이터 추출
 * @param {ArrayBuffer|string} fileData - 엑셀 바이너리 데이터
 * @param {string[]} requiredFieldKeys - 시나리오 필수 필드 키 목록 (예: ['asset_no', 'serial_no'])
 * @returns {{ isValid: boolean, error?: string, missingLabels?: string[], headersFound: string[], rows: object[] }}
 */
export function parseAndValidateExcel(fileData, requiredFieldKeys = ['asset_no']) {
  try {
    const workbook = XLSX.read(fileData, { type: 'binary' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return { isValid: false, error: '엑셀 파일에 시트가 존재하지 않습니다.', rows: [] };
    }

    const worksheet = workbook.Sheets[firstSheetName];
    // 2차원 배열 형태로 추출 (1행: 원본 헤더 목록)
    const rawMatrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    if (!rawMatrix || rawMatrix.length === 0) {
      return { isValid: false, error: '엑셀 파일이 비어 있습니다.', rows: [] };
    }

    const headerRow = rawMatrix[0];
    const columnMap = {}; // { 'asset_no': columnIndex, 'serial_no': columnIndex, ... }
    const headersFound = [];

    headerRow.forEach((h, colIdx) => {
      const headerStr = String(h || '').trim();
      if (!headerStr) return;
      headersFound.push(headerStr);
      const matchedFieldKey = resolveFieldKeyFromHeader(headerStr);
      if (matchedFieldKey && columnMap[matchedFieldKey] === undefined) {
        columnMap[matchedFieldKey] = colIdx;
      }
    });

    // ── 선행 필수 헤더 검증 (Pre-flight Header Check) ─────────────────────
    const missingKeys = [];
    const missingLabels = [];

    requiredFieldKeys.forEach(reqKey => {
      if (columnMap[reqKey] === undefined) {
        missingKeys.push(reqKey);
        missingLabels.push(FIELD_SYNONYMS[reqKey]?.label || reqKey);
      }
    });

    if (missingKeys.length > 0) {
      return {
        isValid: false,
        error: `필수 컬럼 누락: [${missingLabels.join(', ')}] 헤더를 파일에서 찾을 수 없습니다.`,
        missingLabels,
        headersFound,
        rows: []
      };
    }

    // ── 위치 무관 데이터 행 정규화 추출 (Position-Agnostic Extraction) ────
    const normalizedRows = [];
    for (let r = 1; r < rawMatrix.length; r++) {
      const row = rawMatrix[r];
      if (!row || row.every(cell => String(cell).trim() === '')) continue; // 빈 행 건너뜀

      const rowObj = {
        _rowIndex: r + 1,
        asset_no: '',
        product_name: '',
        model_name: '',
        serial_no: '',
        shelf_no: '',
        asset_status: '',
        asset_option: '',
        calibration_date: '',
        remark: '',
        mac_wlan: '',
        mac_lan: '',
        components: ''
      };

      // columnMap에 매핑된 위치에서 정확히 값 추출
      for (const [fieldKey, colIdx] of Object.entries(columnMap)) {
        const val = row[colIdx];
        if (val !== undefined && val !== null) {
          rowObj[fieldKey] = String(val).trim();
        }
      }

      // 식별 키 유효성 확인
      if (rowObj.asset_no || rowObj.serial_no) {
        normalizedRows.push(rowObj);
      }
    }

    if (normalizedRows.length === 0) {
      return {
        isValid: false,
        error: '파일에 처리 가능한 유효 데이터 행이 없습니다.',
        headersFound,
        rows: []
      };
    }

    return {
      isValid: true,
      headersFound,
      columnMap,
      rowCount: normalizedRows.length,
      rows: normalizedRows
    };
  } catch (err) {
    return {
      isValid: false,
      error: `엑셀 파싱 중 오류 발생: ${err.message}`,
      rows: []
    };
  }
}
