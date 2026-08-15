import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor, Database, CheckCircle } from 'lucide-react';
import MobileScannerView from './views/MobileScannerView';
import PCDashboardView from './views/PCDashboardView';
import FileExportModal from './components/FileExportModal';
import LabelPrintModal from './components/LabelPrintModal';
import DataImportModal from './components/DataImportModal';
import SupabaseConfigModal from './components/SupabaseConfigModal';
import PrinterGuideModal from './components/PrinterGuideModal';
import ErrorModal from './components/ErrorModal';
import { getStoredConfig } from './utils/supabaseClient';
import { initHardwareScannerListener } from './utils/hardwareScanner';

export default function App() {
  const [deviceMode, setDeviceMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isSmallScreen = window.innerWidth < 768;
      return (isMobileUA || isSmallScreen) ? 'mobile' : 'pc';
    }
    return 'pc';
  });

  // Modals state
  const [errorMessage, setErrorMessage] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isPrinterGuideOpen, setIsPrinterGuideOpen] = useState(false);
  const [exportModalState, setExportModalState] = useState({ isOpen: false, items: [] });
  const [printModalState, setPrintModalState] = useState({ isOpen: false, items: [], config: null });

  const [refreshKey, setRefreshKey] = useState(0);

  // ★ 블루투스 & 하드웨어 바코드 스캐너 전역 자동 감지 가동
  useEffect(() => {
    initHardwareScannerListener({
      onScanResult: (item) => {
        setToastMessage(`바코드 스캔 감지: ${item.asset_no || item.serial_no} (출력 요청 완료)`);
        setTimeout(() => setToastMessage(null), 3000);
      },
      onAutoPrintSuccess: () => {
        setRefreshKey(prev => prev + 1);
      },
      onError: (err) => {
        setErrorMessage(err);
      }
    });
  }, []);

  const supabaseConfig = getStoredConfig();
  const isConfigured = Boolean(supabaseConfig.url && supabaseConfig.anonKey && !supabaseConfig.url.includes('your-supabase-project'));

  const handleImportSuccess = async () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleGuideTestPrint = () => {
    setIsPrinterGuideOpen(false);
    const testSampleItem = [{
      id: 'test_sample_1',
      asset_no: 'TEST0001',
      imei: '351379300225052',
      mac_address: '4CEBB0B57A51',
      serial_no: 'R5KL60F0CZW',
      status: 'TEST'
    }];
    setPrintModalState({ isOpen: true, items: testSampleItem, config: null });
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%', margin: '0', padding: deviceMode === 'mobile' ? '4px' : '6px 10px' }}>
      {/* Header Bar */}
      {deviceMode === 'pc' && (
        <header style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '6px 12px',
          backgroundColor: '#1e293b',
          borderRadius: '8px',
          border: '1px solid #334155',
          marginBottom: '8px',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              backgroundColor: 'var(--primary)',
              color: '#fff',
              padding: '4px 8px',
              borderRadius: '6px',
              fontWeight: 800,
              fontSize: '0.82rem',
              letterSpacing: '0.5px'
            }}>
              UBUS_DragonRPA_Agent
            </div>
            <div>
              <h1 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                라벨 출력 관리
              </h1>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                v1.5.0.Build.4 | 2026-08-15
              </span>
            </div>
          </div>

          {/* Mode Switcher & DB Config Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              className="btn btn-outline"
              style={{
                padding: '4px 8px',
                fontSize: '0.72rem',
                borderColor: isConfigured ? 'var(--accent-green)' : '#f59e0b',
                color: isConfigured ? '#6ee7b7' : '#fef08a'
              }}
              onClick={() => setIsConfigOpen(true)}
            >
              <Database size={13} />
              {isConfigured ? 'DB 연결됨' : 'DB 설정'}
            </button>

            {/* Device View Switcher Tabs */}
            <div style={{
              backgroundColor: '#0f172a',
              padding: '2px',
              borderRadius: '6px',
              display: 'flex',
              gap: '2px'
            }}>
              <button
                className={`btn ${deviceMode === 'mobile' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '3px 8px', fontSize: '0.72rem', border: 'none' }}
                onClick={() => setDeviceMode('mobile')}
              >
                <Smartphone size={12} />
                모바일
              </button>
              <button
                className={`btn ${deviceMode === 'pc' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '3px 8px', fontSize: '0.72rem', border: 'none' }}
                onClick={() => setDeviceMode('pc')}
              >
                <Monitor size={12} />
                PC
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Scan Toast Notice */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '12px',
          right: '12px',
          backgroundColor: '#052e16',
          border: '1px solid #10b981',
          color: '#4ade80',
          padding: '6px 14px',
          borderRadius: '6px',
          fontSize: '0.75rem',
          fontWeight: 600,
          zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <CheckCircle size={14} />
          {toastMessage}
        </div>
      )}

      {/* Main View Area */}
      <main>
        {deviceMode === 'mobile' ? (
          <MobileScannerView
            onError={(msg) => setErrorMessage(msg)}
            onOpenConfigModal={() => setIsConfigOpen(true)}
          />
        ) : (
          <PCDashboardView
            key={refreshKey}
            onError={(msg) => setErrorMessage(msg)}
            onOpenExportModal={(items) => setExportModalState({ isOpen: true, items })}
            onOpenPrintModal={(items, config) => setPrintModalState({ isOpen: true, items, config })}
            onOpenConfigModal={() => setIsConfigOpen(true)}
            onOpenImportModal={() => setIsImportOpen(true)}
            onOpenPrinterGuide={() => setIsPrinterGuideOpen(true)}
          />
        )}
      </main>

      {/* Global Modals */}
      <ErrorModal
        errorMessage={errorMessage}
        onClose={() => setErrorMessage(null)}
      />

      <SupabaseConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        onSaveSuccess={() => alert('Supabase 연동 정보가 정상 등록되었습니다.')}
      />

      <PrinterGuideModal
        isOpen={isPrinterGuideOpen}
        onClose={() => setIsPrinterGuideOpen(false)}
        onTestPrint={handleGuideTestPrint}
      />

      <DataImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportSuccess={handleImportSuccess}
        onError={(msg) => setErrorMessage(msg)}
      />

      <FileExportModal
        isOpen={exportModalState.isOpen}
        onClose={() => setExportModalState({ isOpen: false, items: [] })}
        items={exportModalState.items}
      />

      <LabelPrintModal
        isOpen={printModalState.isOpen}
        onClose={() => setPrintModalState({ isOpen: false, items: [], config: null })}
        items={printModalState.items}
        offsetConfig={printModalState.config}
      />
    </div>
  );
}
