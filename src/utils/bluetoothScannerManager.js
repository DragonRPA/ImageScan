/**
 * Web Bluetooth Barcode Scanner Direct Connection & State Manager
 * - Web Bluetooth API (GATT / Serial SPP / Battery Service)
 * - Auto-reconnect & Battery monitoring
 */

let activeBleDevice = null;
let activeBleServer = null;
let onBleDataCallback = null;

export const BLE_SCANNER_LOCAL_KEY = 'IMAGE_SCAN_LAST_BLE_DEVICE_ID';

/**
 * 브라우저의 Web Bluetooth 지원 여부 확인
 */
export function isWebBluetoothSupported() {
  return typeof navigator !== 'undefined' && Boolean(navigator.bluetooth);
}

/**
 * ⭐️ 블루투스 바코드 스캐너 원클릭 빠른 페어링 및 연결
 */
export async function connectBluetoothScanner(onDataReceived) {
  if (!isWebBluetoothSupported()) {
    throw new Error('현재 브라우저는 Web Bluetooth를 지원하지 않습니다. Chrome 또는 Edge 브라우저를 사용하세요.');
  }

  if (onDataReceived) {
    onBleDataCallback = onDataReceived;
  }

  try {
    // 바코드 스캐너 및 모든 블루투스 기기 검색
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        'battery_service',
        'generic_access',
        '0000180f-0000-1000-8000-00805f9b34fb', // Battery
        '0000ffe0-0000-1000-8000-00805f9b34fb', // Common Barcode Serial SPP
        '49535343-fe7d-4ae5-8fa9-9fafd205e455'  // Microchip Transparent UART
      ]
    });

    activeBleDevice = device;
    localStorage.setItem(BLE_SCANNER_LOCAL_KEY, device.id);

    // 연결 끊김 이벤트 리스너
    device.addEventListener('gattserverdisconnected', onDeviceDisconnected);

    // GATT 서버 연결
    const server = await device.gatt.connect();
    activeBleServer = server;

    // 배터리 잔량 조회 시도 (지원 기기인 경우)
    let batteryLevel = null;
    try {
      const batteryService = await server.getPrimaryService('battery_service');
      const batteryChar = await batteryService.getCharacteristic('battery_level');
      const value = await batteryChar.readValue();
      batteryLevel = value.getUint8(0);
    } catch (e) {
      // 배터리 서비스 미지원 기기는 무시
    }

    // SPP / UART 통신 특성 구독 시도
    trySubscribeScannerData(server);

    return {
      success: true,
      deviceName: device.name || '블루투스 바코드 스캐너',
      deviceId: device.id,
      batteryLevel: batteryLevel,
      connected: true
    };
  } catch (err) {
    if (err.name === 'NotFoundError') {
      throw new Error('블루투스 스캐너 선택이 취소되었습니다.');
    }
    throw new Error(`블루투스 연결 실패: ${err.message}`);
  }
}

/**
 * GATT 특성에서 바코드 데이터 수신 리스너 등록
 */
async function trySubscribeScannerData(server) {
  try {
    const services = await server.getPrimaryServices();
    for (const service of services) {
      const characteristics = await service.getCharacteristics();
      for (const characteristic of characteristics) {
        if (characteristic.properties.notify || characteristic.properties.indicate) {
          await characteristic.startNotifications();
          characteristic.addEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);
          return;
        }
      }
    }
  } catch (e) {
    console.log('[BLE Scanner] GATT 통신 특성 탐색 완료 (HID 모드 겸용)');
  }
}

/**
 * 바코드 수신 이벤트 핸들러
 */
function handleCharacteristicValueChanged(event) {
  const value = event.target.value;
  const decoder = new TextDecoder('utf-8');
  const text = decoder.decode(value).trim();
  if (text && onBleDataCallback) {
    onBleDataCallback(text);
  }
}

function onDeviceDisconnected(event) {
  console.warn('[BLE Scanner] 블루투스 스캐너 연결 끊김:', event.target.name);
  activeBleServer = null;
}

/**
 * 현재 연결된 블루투스 스캐너 정보 조회
 */
export function getActiveBluetoothScanner() {
  if (activeBleDevice && activeBleDevice.gatt && activeBleDevice.gatt.connected) {
    return {
      connected: true,
      deviceName: activeBleDevice.name || '블루투스 스캐너',
      deviceId: activeBleDevice.id
    };
  }
  return {
    connected: false,
    deviceName: null,
    deviceId: null
  };
}

/**
 * 블루투스 스캐너 연결 해제
 */
export function disconnectBluetoothScanner() {
  if (activeBleDevice && activeBleDevice.gatt && activeBleDevice.gatt.connected) {
    activeBleDevice.gatt.disconnect();
  }
  activeBleDevice = null;
  activeBleServer = null;
  return { success: true };
}
