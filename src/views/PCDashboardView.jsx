import React, { useState } from 'react';
import PCDashboard from '../components/PCDashboard';
import LabelOffsetController from '../components/LabelOffsetController';

export default function PCDashboardView({ onError, onOpenExportModal, onOpenPrintModal, onOpenConfigModal, onOpenImportModal }) {
  // Label Offset & Calibration state
  const [offsetConfig, setOffsetConfig] = useState({
    offsetX: 0,       // mm (left/right)
    offsetY: 0,       // mm (top/bottom)
    fontSize: 11,     // px
    barcodeHeight: 11 // mm
  });

  const handleResetConfig = () => {
    setOffsetConfig({
      offsetX: 0,
      offsetY: 0,
      fontSize: 11,
      barcodeHeight: 11
    });
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* PC Printer Offset Calibration & Fine-Tuning Panel */}
      <LabelOffsetController
        offsetConfig={offsetConfig}
        onChangeConfig={setOffsetConfig}
        onResetConfig={handleResetConfig}
        onTestPrint={handleTestPrint}
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
