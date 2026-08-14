import React, { useState } from 'react';
import { Smartphone, Monitor, Database, Printer } from 'lucide-react';
import MobileScannerView from './views/MobileScannerView';
import PCDashboardView from './views/PCDashboardView';
import FileExportModal from './components/FileExportModal';
import LabelPrintModal from './components/LabelPrintModal';
import DataImportModal from './components/DataImportModal';
import SupabaseConfigModal from './components/SupabaseConfigModal';
import PrinterGuideModal from './components/PrinterGuideModal';
import ErrorModal from './components/ErrorModal';
import { getStoredConfig } from './utils/supabaseClient';

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
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isPrinterGuideOpen, setIsPrinterGuideOpen] = useState(false);
  const [exportModalState, setExportModalState] = useState({ isOpen: false, items: [] });
  const [printModalState, setPrintModalState] = useState({ isOpen: false, items: [], config: null });

  const [refreshKey, setRefreshKey] = useState(0);

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
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '12px' }}>
      {/* Header Bar */}
      <header style={{
        display: 'flex',
        flexWrap: 'wrap',
        justify: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        backgroundColor: '#1e293b',
        borderRadius: '12px',
        border: '1px solid #334155',
        marginBottom: '16px',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            backgroundColor: 'var(--primary)',
            color: '#fff',
            padding: '6px 10px',
            borderRadius: '8px',
            fontWeight: 800,
            fontSize: '1rem',
            letterSpacing: '0.5px'
          }}>
            IMEI SCANNER
          </div>
          <div>
            <h1 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              {deviceMode === 'mobile' ? '3mm 각인 OCR 줌 스캐너' : 'PC 라벨 프린터 오프셋 정밀 교정 대시보드'}
            </h1>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
              버전: v1.0.0.Build.10 | 2026-08-14
            </span>
          </div>
        </div>

        {/* Mode Switcher & DB Config Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="btn btn-outline"
            style={{
              padding: '4px 10px',
              fontSize: '0.75rem',
              borderColor: isConfigured ? 'var(--accent-green)' : '#f59e0b',
              color: isConfigured ? '#6ee7b7' : '#fef08a'
            }}
            onClick={() => setIsConfigOpen(true)}
          >
            <Database size={14} />
            {isConfigured ? 'Supabase 연동됨' : 'DB 연동 필요'}
          </button>

          {/* Device View Switcher Tabs */}
          <div style={{
            backgroundColor: '#0f172a',
            padding: '3px',
            borderRadius: '8px',
            display: 'flex',
            gap: '3px'
          }}>
            <button
              className={`btn ${deviceMode === 'mobile' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '4px 10px', fontSize: '0.75rem', border: 'none' }}
              onClick={() => setDeviceMode('mobile')}
            >
              <Smartphone size={13} />
              모바일 뷰
            </button>
            <button
              className={`btn ${deviceMode === 'pc' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '4px 10px', fontSize: '0.75rem', border: 'none' }}
              onClick={() => setDeviceMode('pc')}
            >
              <Monitor size={13} />
              PC 대시보드 뷰
            </button>
          </div>
        </div>
      </header>

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
