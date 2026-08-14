import React, { useState } from 'react';
import PCDashboard from '../components/PCDashboard';
import LabelOffsetController, { getStoredOffsetConfig, saveStoredOffsetConfig } from '../components/LabelOffsetController';
import { generateZplCode, sendZplToWebSerial } from '../utils/zplPrinter';

export default function PCDashboardView({
  onError,
  onOpenExportModal,
  onOpenPrintModal,
  onOpenConfigModal,
  onOpenImportModal,
  onOpenPrinterGuide
}) {
  const [offsetConfig, setOffsetConfig] = useState(getStoredOffsetConfig());

  const handleResetConfig = () => {
    const defaultConfig = {
      offsetX: 0,
      offsetY: 0,
      fontSize: 11,
      barcodeHeight: 11,
      zplMode: false
    };
    saveStoredOffsetConfig(defaultConfig);
    setOffsetConfig(defaultConfig);
  };

  const handleTestPrint = () => {
    const testSampleItem = [{
      id: 'test_sample_1',
      asset_no: 'TEST0001',
      imei: '351379300225052',
      mac_address: '4CEBB0B57A51',
      serial_no: 'R5KL60F0CZW',
      status: 'TEST'
    }];
    onOpenPrintModal(testSampleItem, offsetConfig);
  };

  // Direct ZPL Raw Thermal Printer Output Action (No Windows Print Popup)
  const handleZplDirectPrint = async () => {
    const testSampleItem = {
      asset_no: 'TEST0001',
      imei: '351379300225052',
      mac_address: '4CEBB0B57A51',
      serial_no: 'R5KL60F0CZW'
    };
    try {
      const zplCode = generateZplCode(testSampleItem, offsetConfig);
      const res = await sendZplToWebSerial(zplCode);
      alert(res.message || 'ZPL 라벨 프린터로 테스트 출력이 즉시 전송되었습니다!');
    } catch (err) {
      console.error('ZPL direct print error:', err);
      onError(err.message || 'ZPL 직접 출력 실패: 시리얼/USB 연결을 확인해주세요.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* PC Printer Offset Calibration & Fine-Tuning Panel */}
      <LabelOffsetController
        offsetConfig={offsetConfig}
        onChangeConfig={setOffsetConfig}
        onResetConfig={handleResetConfig}
        onTestPrint={handleTestPrint}
        onOpenPrinterGuide={onOpenPrinterGuide}
        onZplDirectPrint={handleZplDirectPrint}
      />

      {/* Main Production Dashboard */}
      <PCDashboard
        onError={onError}
        onOpenExportModal={onOpenExportModal}
        onOpenPrintModal={(items) => onOpenPrintModal(items, offsetConfig)}
        onOpenConfigModal={onOpenConfigModal}
        onOpenImportModal={onOpenImportModal}
        offsetConfig={offsetConfig}
      />
    </div>
  );
}
