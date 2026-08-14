import React, { useState } from 'react';
import { Smartphone, Monitor, Database, Settings } from 'lucide-react';
import AutoCameraScanner from './components/AutoCameraScanner';
import PCDashboard from './components/PCDashboard';
import FileExportModal from './components/FileExportModal';
import LabelPrintModal from './components/LabelPrintModal';
import SupabaseConfigModal from './components/SupabaseConfigModal';
import ErrorModal from './components/ErrorModal';
import { getStoredConfig } from './utils/supabaseClient';

export default function App() {
  // Mode selection: 'mobile' (Camera OCR Scanner) vs 'pc' (Realtime Dashboard & Label Print)
  // Auto-detect mobile vs desktop or allow manual toggle
  const isMobileInitial = typeof window !== 'undefined' && window.innerWidth < 768;
  const [mode, setMode] = useState(isMobileInitial ? 'mobile' : 'pc');

  // Modals state
  const [errorMessage, setErrorMessage] = useState(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [exportModalState, setExportModalState] = useState({ isOpen: false, items: [] });
  const [printModalState, setPrintModalState] = useState({ isOpen: false, items: [] });

  const supabaseConfig = getStoredConfig();
  const isConfigured = Boolean(supabaseConfig.url && supabaseConfig.anonKey && !supabaseConfig.url.includes('your-supabase-project'));

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
      {/* Header Bar */}
      <header style={{
        display: 'flex',
        flexWrap: 'wrap',
        justify: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        backgroundColor: '#1e293b',
        borderRadius: '12px',
        border: '1px solid #334155',
        marginBottom: '20px',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            backgroundColor: 'var(--primary)',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: '8px',
            fontWeight: 800,
            fontSize: '1.1rem',
            letterSpacing: '0.5px'
          }}>
            IMEI SCANNER
          </div>
          <div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              모바일 카메라 OCR & PC 라벨 프린터 수집 시스템
            </h1>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              버전: v1.0.0.Build.1 | 2026-08-14
            </span>
          </div>
        </div>

        {/* Mode Switcher & DB Config Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* DB Status Badge */}
          <button
            className="btn btn-outline"
            style={{
              padding: '6px 12px',
              fontSize: '0.8rem',
              borderColor: isConfigured ? 'var(--accent-green)' : '#f59e0b',
              color: isConfigured ? '#6ee7b7' : '#fef08a'
            }}
            onClick={() => setIsConfigOpen(true)}
          >
            <Database size={14} />
            {isConfigured ? 'Supabase 연동됨' : 'DB 연동 필요'}
          </button>

          {/* Mode Switcher Tabs */}
          <div style={{
            backgroundColor: '#0f172a',
            padding: '4px',
            borderRadius: '8px',
            display: 'flex',
            gap: '4px'
          }}>
            <button
              className={`btn ${mode === 'mobile' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '6px 12px', fontSize: '0.8rem', border: 'none' }}
              onClick={() => setMode('mobile')}
            >
              <Smartphone size={14} />
              모바일 스캐너
            </button>
            <button
              className={`btn ${mode === 'pc' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '6px 12px', fontSize: '0.8rem', border: 'none' }}
              onClick={() => setMode('pc')}
            >
              <Monitor size={14} />
              PC 대시보드
            </button>
          </div>
        </div>
      </header>

      {/* Main View Area */}
      <main>
        {mode === 'mobile' ? (
          <AutoCameraScanner onError={(msg) => setErrorMessage(msg)} />
        ) : (
          <PCDashboard
            onError={(msg) => setErrorMessage(msg)}
            onOpenExportModal={(items) => setExportModalState({ isOpen: true, items })}
            onOpenPrintModal={(items) => setPrintModalState({ isOpen: true, items })}
            onOpenConfigModal={() => setIsConfigOpen(true)}
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
