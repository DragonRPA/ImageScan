import React from 'react';
import PCDashboard from '../components/PCDashboard';

export default function PCDashboardView({ onError, onOpenExportModal, onOpenPrintModal, onOpenConfigModal, onOpenImportModal }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* PC Dedicated Dashboard Banner */}
      <div style={{
        backgroundColor: '#1e293b',
        padding: '16px 20px',
        borderRadius: '12px',
        border: '1px solid #334155',
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
            PC 라벨 프린터 수집 & 데이터 통합 대시보드
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
            핸드폰 모바일 스캐너에서 수집한 IMEI 데이터가 실시간으로 수집되며, 1클릭으로 Code 39 라벨 인쇄 및 엑셀 내보내기가 가능합니다.
          </p>
        </div>
      </div>

      <PCDashboard
        onError={onError}
        onOpenExportModal={onOpenExportModal}
        onOpenPrintModal={onOpenPrintModal}
        onOpenConfigModal={onOpenConfigModal}
        onOpenImportModal={onOpenImportModal}
      />
    </div>
  );
}
