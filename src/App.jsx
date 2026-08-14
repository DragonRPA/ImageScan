import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor, Database } from 'lucide-react';
import MobileScannerView from './views/MobileScannerView';
import PCDashboardView from './views/PCDashboardView';
import FileExportModal from './components/FileExportModal';
import LabelPrintModal from './components/LabelPrintModal';
import DataImportModal from './components/DataImportModal';
import SupabaseConfigModal from './components/SupabaseConfigModal';
import ErrorModal from './components/ErrorModal';
import { getStoredConfig, saveScansToSupabase, deleteAllScansFromSupabase } from './utils/supabaseClient';

export default function App() {
  // Auto detect mobile device via userAgent or screen width
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
  const [exportModalState, setExportModalState] = useState({ isOpen: false, items: [] });
  const [printModalState, setPrintModalState] = useState({ isOpen: false, items: [] });

  const supabaseConfig = getStoredConfig();
  const isConfigured = Boolean(supabaseConfig.url && supabaseConfig.anonKey && !supabaseConfig.url.includes('your-supabase-project'));

  // Handle Bulk Import / Replace Execution
  const handleImportExecution = async (parsedRows, importMode) => {
    try {
      if (importMode === 'replace') {
        await deleteAllScansFromSupabase();
      }
      await saveScansToSupabase(parsedRows);
      alert(`성공적으로 DB에 ${parsedRows.length}건의 데이터를 ${importMode === 'replace' ? '전체 덮어쓰기' : '추가'}하였습니다!`);
    } catch (err) {
      console.error('Import execution error:', err);
      throw err;
    }
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
              {deviceMode === 'mobile' ? '모바일 전용 실시간 OCR 카메라 스캐너' : 'PC 전용 수집 대시보드 & 라벨 프린터 수식'}
            </h1>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
              버전: v1.0.0.Build.6 | 2026-08-14
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
            onError={(msg) => setErrorMessage(msg)}
            onOpenExportModal={(items) => setExportModalState({ isOpen: true, items })}
            onOpenPrintModal={(items) => setPrintModalState({ isOpen: true, items })}
            onOpenConfigModal={() => setIsConfigOpen(true)}
            onOpenImportModal={() => setIsImportOpen(true)}
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

      <DataImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportSuccess={handleImportExecution}
        onError={(msg) => setErrorMessage(msg)}
      />

      <FileExportModal
        isOpen={exportModalState.isOpen}
        onClose={() => setExportModalState({ isOpen: false, items: [] })}
        items={exportModalState.items}
      />

      <LabelPrintModal
        isOpen={printModalState.isOpen}
        onClose={() => setPrintModalState({ isOpen: false, items: [] })}
        items={printModalState.items}
      />
    </div>
  );
}
