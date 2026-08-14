import React from 'react';
import { Download, FileSpreadsheet, FileText, X } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function FileExportModal({ isOpen, onClose, items }) {
  if (!isOpen) return null;

  // Format data strictly matching Image 2 columns: 자산번호, IMEI, MAC Address, 시리얼
  const formatExportData = () => {
    return items.map((item) => ({
      '자산번호': item.asset_no || '',
      'IMEI': item.imei || '',
      'MAC Address': item.mac_address || '',
      '시리얼': item.serial_no || '',
      '스캔일시': item.scanned_at || item.created_at || ''
    }));
  };

  // Export to Excel (.xlsx)
  const exportToExcel = () => {
    try {
      const data = formatExportData();
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'IMEI_Scans');

      const fileName = `IMEI_Scan_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      onClose();
    } catch (err) {
      alert(`엑셀 파일 저장 오류: ${err.message}`);
    }
  };

  // Export to CSV with UTF-8 BOM
  const exportToCSV = () => {
    try {
      const data = formatExportData();
      const headers = ['자산번호', 'IMEI', 'MAC Address', '시리얼', '스캔일시'];
      const csvRows = [headers.join(',')];

      data.forEach(row => {
        const values = headers.map(h => `"${row[h] || ''}"`);
        csvRows.push(values.join(','));
      });

      // UTF-8 BOM prefix
      const csvContent = '\uFEFF' + csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `IMEI_Scan_Export_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      alert(`CSV 파일 저장 오류: ${err.message}`);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
            <Download size={22} />
            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>데이터 파일 내보내기</h3>
          </div>
          <button className="btn btn-outline" style={{ padding: '4px 8px' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '20px' }}>
          선택된 총 <strong style={{ color: '#38bdf8' }}>{items.length}건</strong>의 IMEI 데이터를 원하시는 파일 포맷으로 저장할 수 있습니다.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', justifyContent: 'flex-start', gap: '12px' }}
            onClick={exportToExcel}
          >
            <FileSpreadsheet size={20} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700 }}>Excel (.xlsx) 다운로드</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>이미지 2와 동일한 컬럼 포맷의 스프레드시트</div>
            </div>
          </button>

          <button
            className="btn btn-success"
            style={{ width: '100%', padding: '14px', justifyContent: 'flex-start', gap: '12px' }}
            onClick={exportToCSV}
          >
            <FileText size={20} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700 }}>CSV 파일 (한글 UTF-8 BOM) 다운로드</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>엑셀 및 타 시스템에서 한글 깨짐 없이 호환</div>
            </div>
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
