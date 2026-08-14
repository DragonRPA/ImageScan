/**
 * ZPL II Raw Code Generator and WebSerial/WebUSB Thermal Printer Direct Output Engine
 */

export function generateZplCode(item, offsetConfig) {
  const config = offsetConfig || {
    offsetX: 0,
    offsetY: 0,
    fontSize: 11,
    barcodeHeight: 11
  };

  const assetNo = item.asset_no || item.assetNo || 'TEST0001';
  const serialNo = item.serial_no || item.serialNo || '-';
  const macAddress = item.mac_address || item.macAddress || '-';
  const imei = item.imei || '-';

  // Calculate ZPL dot coordinates (8 dots = 1mm at 203 DPI)
  const dotsX = Math.round(config.offsetX * 8);
  const dotsY = Math.round(config.offsetY * 8);
  const fontPt = Math.round(config.fontSize * 2.2);
  const barH = Math.round(config.barcodeHeight * 8);

  return `^XA
^LH${Math.max(0, dotsX)},${Math.max(0, dotsY)}
^SEE:GB2312.DAT^FS
^FO20,20^A0N,${fontPt},${fontPt}^FD관리번호: ${assetNo}^FS
^FO20,55^A0N,${fontPt},${fontPt}^FD시리얼: ${serialNo}^FS
^FO20,90^A0N,${fontPt},${fontPt}^FDMAC: ${macAddress}^FS
^FO20,125^A0N,${fontPt},${fontPt}^FDIMEI: ${imei}^FS
^FO30,170^B3N,N,${barH},Y,N^FD${assetNo}^FS
^XZ`;
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
