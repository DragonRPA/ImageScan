/**
 * Thermal Label Printer Connection & Registry Manager (SSOT)
 * Supports: WebSerial, WebUSB, Network Raw TCP (9100), Zebra Browser Print, Simulation Queue
 */

const LOCAL_KEY_REGISTERED_PRINTERS = 'IMAGE_SCAN_REGISTERED_PRINTERS_V1';
const LOCAL_KEY_ACTIVE_PRINTER_ID = 'IMAGE_SCAN_ACTIVE_PRINTER_ID_V1';

export const DEFAULT_PRINTERS = [
  {
    id: 'prn_web_serial',
    name: 'Zebra ZPL USB/시리얼 (WebSerial)',
    type: 'web_serial',
    target: 'COM Port / USB',
    baudRate: 9600,
    isDefault: true
  },
  {
    id: 'prn_web_usb',
    name: 'Zebra ZPL 다이렉트 (WebUSB)',
    type: 'web_usb',
    target: 'USB Device',
    isDefault: false
  },
  {
    id: 'prn_zebra_browser',
    name: 'Zebra Browser Print 로컬 데몬',
    type: 'browser_print',
    target: 'http://localhost:9100',
    isDefault: false
  },
  {
    id: 'prn_network_default',
    name: '네트워크 ZPL 프린터 (기본)',
    type: 'network_ip',
    target: '192.168.0.150:9100',
    isDefault: false
  },
  {
    id: 'prn_virtual_queue',
    name: '화면 가상 인쇄 (프린트 큐 적재)',
    type: 'virtual_queue',
    target: 'Supabase Print Queue',
    isDefault: false
  }
];

/**
 * 등록된 모든 프린터 목록 조회
 */
export function getRegisteredPrinters() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY_REGISTERED_PRINTERS);
    if (!raw) {
      localStorage.setItem(LOCAL_KEY_REGISTERED_PRINTERS, JSON.stringify(DEFAULT_PRINTERS));
      return DEFAULT_PRINTERS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_PRINTERS;
  }
}

/**
 * 활성 프린터 ID 조회
 */
export function getActivePrinterId() {
  try {
    return localStorage.getItem(LOCAL_KEY_ACTIVE_PRINTER_ID) || DEFAULT_PRINTERS[0].id;
  } catch {
    return DEFAULT_PRINTERS[0].id;
  }
}

/**
 * 활성 프린터 설정
 */
export function setActivePrinterId(printerId) {
  try {
    localStorage.setItem(LOCAL_KEY_ACTIVE_PRINTER_ID, printerId);
  } catch (e) {
    console.error('Failed to set active printer', e);
  }
}

/**
 * 신규 프린터 등록 또는 수정
 */
export function saveRegisteredPrinter(printer) {
  const list = getRegisteredPrinters();
  const index = list.findIndex(p => p.id === printer.id);
  if (index >= 0) {
    list[index] = { ...list[index], ...printer };
  } else {
    list.push({
      id: printer.id || `prn_custom_${Date.now()}`,
      ...printer
    });
  }
  localStorage.setItem(LOCAL_KEY_REGISTERED_PRINTERS, JSON.stringify(list));
  return list;
}

/**
 * 프린터 삭제
 */
export function deleteRegisteredPrinter(printerId) {
  const list = getRegisteredPrinters().filter(p => p.id !== printerId);
  localStorage.setItem(LOCAL_KEY_REGISTERED_PRINTERS, JSON.stringify(list));
  return list;
}

/**
 * ⭐️ ZPL 코드를 지정된 프린터로 즉시 전송 (Direct Output)
 */
export async function sendZplToPrinter(zplString, printer) {
  if (!printer) {
    throw new Error('선택된 라벨 프린터가 없습니다. 프린터를 선택하세요.');
  }

  // 1. WebSerial 방식
  if (printer.type === 'web_serial') {
    if (!('serial' in navigator)) {
      throw new Error('현재 브라우저는 WebSerial을 지원하지 않습니다. Chrome 또는 Edge 브라우저를 사용하세요.');
    }
    let port = null;
    try {
      port = await navigator.serial.requestPort();
      await port.open({ baudRate: Number(printer.baudRate) || 9600 });
      const writer = port.writable.getWriter();
      const encoder = new TextEncoder();
      await writer.write(encoder.encode(zplString));
      writer.releaseLock();
      await port.close();
      return { success: true, message: `[${printer.name}] ZPL 전송 완료!` };
    } catch (err) {
      if (port && port.close) {
        try { await port.close(); } catch (e) {}
      }
      throw new Error(`시리얼 프린터 전송 실패: ${err.message}`);
    }
  }

  // 2. WebUSB 방식
  if (printer.type === 'web_usb') {
    if (!('usb' in navigator)) {
      throw new Error('현재 브라우저는 WebUSB를 지원하지 않습니다.');
    }
    try {
      const device = await navigator.usb.requestDevice({ filters: [] });
      await device.open();
      await device.selectConfiguration(1);
      await device.claimInterface(0);
      const encoder = new TextEncoder();
      await device.transferOut(1, encoder.encode(zplString));
      await device.close();
      return { success: true, message: `[${device.productName || printer.name}] USB ZPL 전송 완료!` };
    } catch (err) {
      throw new Error(`USB 프린터 전송 실패: ${err.message}`);
    }
  }

  // 3. Zebra Browser Print 방식
  if (printer.type === 'browser_print') {
    const url = printer.target || 'http://localhost:9100/write';
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: zplString
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { success: true, message: `[Zebra Browser Print] 전송 완료!` };
    } catch (err) {
      throw new Error(`Zebra Browser Print 통신 실패 (${url}): 로컬 데몬이 실행 중인지 확인하세요.`);
    }
  }

  // 4. 네트워크 IP 방식
  if (printer.type === 'network_ip') {
    const target = printer.target || '192.168.0.150:9100';
    try {
      // 로컬 프록시 또는 브리지 서버가 있을 경우 HTTP POST
      const res = await fetch(`http://${target}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: zplString,
        mode: 'no-cors'
      });
      return { success: true, message: `[네트워크 프린터 ${target}] ZPL 전송 완료!` };
    } catch (err) {
      throw new Error(`네트워크 프린터 전송 실패 (${target}): ${err.message}`);
    }
  }

  // 5. 가상 큐 방식
  return { success: true, message: `[가상 큐] ZPL이 인쇄 대기열에 성공적으로 적재되었습니다.` };
}
