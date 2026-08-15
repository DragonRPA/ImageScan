/**
 * ZPL II Raw Code Generator and WebSerial/WebUSB Thermal Printer Direct Output Engine
 */
import { getStoredLabelTemplate, generateDynamicZpl } from './labelTemplate';

export function generateZplCode(item, offsetConfig) {
  // 사용자가 디자이너에서 구성한 템플릿(SSOT)을 조회하여 동적 생성
  const template = getStoredLabelTemplate();
  return generateDynamicZpl(item, template);
}

/**
 * Sends RAW ZPL string directly to USB/Serial Thermal Label Printer via WebSerial API
 */
export async function sendZplToWebSerial(zplString) {
  if (typeof window === 'undefined' || !('navigator' in window) || !('serial' in navigator)) {
    throw new Error('현재 브라우저는 WebSerial 직접 출력을 지원하지 않습니다. (Chrome, Edge 브라우저 권장)');
  }

  let port = null;
  try {
    // Request serial port connection
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 9600 });

    const writer = port.writable.getWriter();
    const encoder = new TextEncoder();
    const data = encoder.encode(zplString);

    await writer.write(data);
    writer.releaseLock();
    await port.close();

    return { success: true, message: 'ZPL 바이트가 라벨 프린터로 직통 전송되었습니다!' };
  } catch (err) {
    if (port && port.close) {
      try { await port.close(); } catch (e) {}
    }
    throw new Error(`ZPL 시리얼 프린터 전송 실패: ${err.message}`);
  }
}

/**
 * Sends RAW ZPL string directly via WebUSB API
 */
export async function sendZplToWebUsb(zplString) {
  if (typeof window === 'undefined' || !('navigator' in window) || !('usb' in navigator)) {
    throw new Error('현재 브라우저는 WebUSB를 지원하지 않습니다.');
  }

  try {
    const device = await navigator.usb.requestDevice({ filters: [] });
    await device.open();
    await device.selectConfiguration(1);
    await device.claimInterface(0);

    const encoder = new TextEncoder();
    const data = encoder.encode(zplString);

    // Send to bulk endpoint (typically endpoint #1)
    await device.transferOut(1, data);
    await device.close();

    return { success: true, message: `ZPL 라벨이 ${device.productName || '프린터'}로 직접 인쇄되었습니다!` };
  } catch (err) {
    throw new Error(`ZPL USB 프린터 전송 실패: ${err.message}`);
  }
}
