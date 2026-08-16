/**
 * Universal RPA Scenario Engine & Built-in UBUS Presets (SSOT)
 * System: Universal Web RPA Scenario Chain, Variable Interpolator & Execution Queue
 */
import { getSupabaseClient } from './supabaseClient';

export const LOCAL_KEY_RPA_SCENARIOS = 'IMAGE_SCAN_RPA_SCENARIOS_V1';
export const LOCAL_KEY_ACTIVE_SCENARIO_ID = 'IMAGE_SCAN_ACTIVE_SCENARIO_ID_V1';

// ── UBUS 3대 기본 내장 시나리오 프리셋 (Built-in SSOT) ───────────────────
export const BUILTIN_RPA_SCENARIOS = [
  {
    id: 'scenario_inbound_register',
    name: '입고 자동 등록',
    description: '엑셀 데이터의 자산번호와 시리얼을 읽어 사내 ERP 입고 화면에 1행씩 순차 등록',
    targetBrowser: 'Edge', // 'Edge' | 'Chrome'
    requiredHeaders: ['asset_no', 'serial_no'],
    sampleData: {
      '자산번호': 'TEST0001',
      '제조번호(시리얼)': 'R5KL60F0CZW',
      '선반번호': 'A-01',
      '비고': '자동 입고'
    },
    steps: [
      {
        id: 'step_1',
        action: 'NAVIGATE',
        name: 'ERP 입고 페이지 접속',
        url: 'https://erp.company.com/asset/inbound',
        targetBrowser: 'Edge',
        launchMode: 'ATTACH_EXISTING',
        windowSize: 'MAXIMIZED',
        windowAlias: 'main',
        pageLoadStrategy: 'Eager',
        blockImages: true,
        blockMedia: true,
        disableThrottling: true,
        autoDownload: true,
        downloadPath: '',
        disableFirstRun: true,
        disableGpu: true,
        ignoreCertErrors: true,
        disableBlinkFeatures: true,
        waitUntil: 'networkidle',
        timeoutMs: 5000
      },
      {
        id: 'step_2',
        action: 'SWITCH_FRAME',
        name: '메인 프레임 전환',
        frameSelector: 'contentFrame',
        autoWait: true
      },
      {
        id: 'step_3',
        action: 'WAIT_ELEMENT',
        name: '입력창 로딩 대기',
        selector: "//input[@id='assetNo' or @name='asset_no']",
        timeoutMs: 5000
      },
      {
        id: 'step_4',
        action: 'LOOP_ROWS',
        name: '엑셀 데이터 행별 반복 입력',
        subSteps: [
          {
            id: 'step_4_1',
            action: 'INPUT_TEXT',
            name: '자산번호 입력',
            selector: "//input[@id='assetNo' or @name='asset_no']",
            valueTemplate: '{{자산번호}}',
            sendEnter: true,
            fallbackType: 'PIXEL_MATCH' // 'NONE' | 'PIXEL_MATCH' | 'JS_INJECT' | 'KEYBOARD_TAB'
          },
          {
            id: 'step_4_2',
            action: 'INPUT_TEXT',
            name: '시리얼번호 입력',
            selector: "//input[@id='serialNo' or @name='serial_no']",
            valueTemplate: '{{제조번호}}',
            sendEnter: false,
            fallbackType: 'PIXEL_MATCH'
          },
          {
            id: 'step_4_3',
            action: 'INPUT_TEXT',
            name: '선반번호 입력',
            selector: "//input[@id='shelfNo' or @name='shelf_no']",
            valueTemplate: '{{선반번호}}',
            sendEnter: false,
            fallbackType: 'NONE'
          },
          {
            id: 'step_4_4',
            action: 'CLICK',
            name: '저장 버튼 클릭',
            selector: "//button[@id='btnSave' or contains(text(),'저장')]",
            fallbackType: 'PIXEL_MATCH'
          },
          {
            id: 'step_4_5',
            action: 'HANDLE_ALERT',
            name: '저장 완료 알럿 자동 수락',
            alertAction: 'ACCEPT', // 'ACCEPT' | 'DISMISS'
            timeoutMs: 2000
          }
        ]
      }
    ]
  },
  {
    id: 'scenario_asset_update',
    name: '자산 정보 수정',
    description: '엑셀 파일의 자산번호를 조회하여 옵션, 선반위치, 교정일자, 비고 일괄 수정',
    targetBrowser: 'Edge',
    requiredHeaders: ['asset_no'],
    sampleData: {
      '자산번호': 'TEST0001',
      '선반번호': 'B-02',
      '옵션': '고급사양',
      '교정일자': '2026-08-01',
      '비고': '정보 갱신'
    },
    steps: [
      {
        id: 'step_1',
        action: 'NAVIGATE',
        name: '자산 정보 관리 페이지 이동',
        url: 'https://erp.company.com/asset/manage',
        timeoutMs: 5000
      },
      {
        id: 'step_2',
        action: 'SWITCH_FRAME',
        name: '본문 프레임 전환',
        frameSelector: 'contentFrame',
        autoWait: true
      },
      {
        id: 'step_3',
        action: 'LOOP_ROWS',
        name: '자산 목록 일괄 수정 루프',
        subSteps: [
          {
            id: 'step_3_1',
            action: 'INPUT_TEXT',
            name: '자산번호 조회',
            selector: "//input[@id='searchAssetNo']",
            valueTemplate: '{{자산번호}}',
            sendEnter: true,
            fallbackType: 'NONE'
          },
          {
            id: 'step_3_2',
            action: 'INPUT_TEXT',
            name: '선반번호 수정',
            selector: "//input[@id='editShelfNo']",
            valueTemplate: '{{선반번호}}',
            sendEnter: false,
            fallbackType: 'NONE'
          },
          {
            id: 'step_3_3',
            action: 'INPUT_TEXT',
            name: '옵션 수정',
            selector: "//input[@id='editOption']",
            valueTemplate: '{{옵션}}',
            sendEnter: false,
            fallbackType: 'NONE'
          },
          {
            id: 'step_3_4',
            action: 'INPUT_TEXT',
            name: '교정일자 수정',
            selector: "//input[@id='editCalDate']",
            valueTemplate: '{{교정일자}}',
            sendEnter: false,
            fallbackType: 'NONE'
          },
          {
            id: 'step_3_5',
            action: 'CLICK',
            name: '수정 완료 클릭',
            selector: "//button[@id='btnUpdate' or contains(text(),'수정')]",
            fallbackType: 'PIXEL_MATCH'
          },
          {
            id: 'step_3_6',
            action: 'HANDLE_ALERT',
            name: '수정 완료 알럿 수락',
            alertAction: 'ACCEPT',
            timeoutMs: 2000
          }
        ]
      }
    ]
  },
  {
    id: 'scenario_outbound_inspect',
    name: '출고 검수 자동화',
    description: '출고의뢰번호의 장비 목록을 조회하여 바코드 스캔 시리얼과 1:1 대조 및 검수 승인',
    targetBrowser: 'Edge',
    requiredHeaders: ['request_no', 'asset_no', 'serial_no'],
    sampleData: {
      '출고의뢰번호': 'REQ20260815-001',
      '자산번호': 'TEST0001',
      '제조번호(시리얼)': 'R5KL60F0CZW'
    },
    steps: [
      {
        id: 'step_1',
        action: 'NAVIGATE',
        name: '출고 검수 화면 이동',
        url: 'https://erp.company.com/outbound/inspect',
        timeoutMs: 5000
      },
      {
        id: 'step_2',
        action: 'INPUT_TEXT',
        name: '출고의뢰번호 조회',
        selector: "//input[@id='reqNo']",
        valueTemplate: '{{출고의뢰번호}}',
        sendEnter: true,
        fallbackType: 'NONE'
      },
      {
        id: 'step_3',
        action: 'CLICK',
        name: '조회 버튼 클릭',
        selector: "//button[@id='btnSearch']",
        fallbackType: 'PIXEL_MATCH'
      },
      {
        id: 'step_4',
        action: 'LOOP_ROWS',
        name: '스캔 장비 시리얼 1:1 대조 루프',
        subSteps: [
          {
            id: 'step_4_1',
            action: 'INPUT_TEXT',
            name: '검수 시리얼 입력',
            selector: "//input[@id='scanSerial']",
            valueTemplate: '{{제조번호}}',
            sendEnter: true,
            fallbackType: 'NONE'
          },
          {
            id: 'step_4_2',
            action: 'WAIT_ELEMENT',
            name: '검수 완료 표시 대기',
            selector: "//span[contains(text(),'일치') or contains(text(),'확인')]",
            timeoutMs: 3000
          }
        ]
      },
      {
        id: 'step_5',
        action: 'CLICK',
        name: '최종 검수 승인 마감 클릭',
        selector: "//button[@id='btnInspectFinish' or contains(text(),'검수완료')]",
        fallbackType: 'PIXEL_MATCH'
      }
    ]
  }
];

/**
 * 전체 RPA 시나리오 목록 로드 (로컬스토리지 + 기본 프리셋)
 */
export function getAllRpaScenarios() {
  try {
    const stored = localStorage.getItem(LOCAL_KEY_RPA_SCENARIOS);
    if (stored) {
      const list = JSON.parse(stored);
      if (Array.isArray(list) && list.length > 0) {
        return list;
      }
    }
  } catch (e) {}
  return BUILTIN_RPA_SCENARIOS;
}

/**
 * 특정 시나리오 ID로 단건 조회
 */
export function getRpaScenarioById(scenarioId) {
  const list = getAllRpaScenarios();
  return list.find(s => s.id === scenarioId) || list[0] || BUILTIN_RPA_SCENARIOS[0];
}

/**
 * 시나리오 저장 (생성/수정)
 */
export async function saveRpaScenario(scenario) {
  const list = getAllRpaScenarios();
  const idx = list.findIndex(s => s.id === scenario.id);
  let updatedList;
  if (idx >= 0) {
    updatedList = [...list];
    updatedList[idx] = scenario;
  } else {
    updatedList = [...list, scenario];
  }

  localStorage.setItem(LOCAL_KEY_RPA_SCENARIOS, JSON.stringify(updatedList));

  // Supabase 동기화 (옵션)
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('schema_definitions').upsert({
        id: `rpa_${scenario.id}`,
        schema_name: `RPA_${scenario.name}`,
        data: scenario,
        updated_at: new Date().toISOString()
      });
    } catch (e) {}
  }
  return true;
}

/**
 * 시나리오 삭제
 */
export function deleteRpaScenario(scenarioId) {
  const list = getAllRpaScenarios();
  const filtered = list.filter(s => s.id !== scenarioId);
  localStorage.setItem(LOCAL_KEY_RPA_SCENARIOS, JSON.stringify(filtered));
}

/**
 * RPA 실행 큐 등록 (Supabase rpa_queue 및 브라우저 이벤트 전송)
 */
export async function requestRpaExecution({ scenarioId, targetBrowser = 'Edge', rows = [], options = {} }) {
  const scenario = getRpaScenarioById(scenarioId);
  const client = getSupabaseClient();

  const payload = {
    scenario_id: scenario.id,
    scenario_name: scenario.name,
    target_browser: targetBrowser,
    steps_payload: scenario.steps,
    data_rows: rows,
    row_count: rows.length,
    status: 'PENDING', // 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
    options,
    created_at: new Date().toISOString()
  };

  if (client) {
    try {
      const { data, error } = await client.from('print_queue').insert({
        key_value: `RPA_${scenario.id}_${Date.now()}`,
        record_data: payload,
        zpl_payload: JSON.stringify(payload),
        requested_by: 'RPA_CONTROLLER',
        print_status: 'PENDING'
      }).select().single();

      if (!error) return { success: true, queueId: data.id, payload };
    } catch (err) {
      console.warn('RPA 큐 등록 클라우드 실패, 로컬 처리:', err);
    }
  }

  // Local fallback event
  window.dispatchEvent(new CustomEvent('RPA_EXECUTION_TRIGGERED', { detail: payload }));
  return { success: true, queueId: `local_${Date.now()}`, payload };
}
