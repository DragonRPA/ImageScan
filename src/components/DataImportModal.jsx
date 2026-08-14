import React, { useState } from 'react';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle, RefreshCw, X, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function DataImportModal({ isOpen, onClose, onImportSuccess, onError }) {
  const [importMode, setImportMode] = useState('replace'); // 'replace' (초기화 후 새로입력) vs 'append' (기존 데이터에 추가)
  const [parsedRows, setParsedRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  // Handle File Selected (.xlsx, .csv)
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];

        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

        // Map & Normalize fields to Image 2 columns
        const normalized = data.map((row, idx) => ({
          id: `import_${idx}_${Date.now()}`,
          asset_no: String(row['자산번호'] || row['asset_no'] || row['관리번호'] || `TEST${String(idx + 1).padStart(4, '0')}`),
          imei: String(row['IMEI'] || row['imei'] || ''),
          mac_address: String(row['MAC Address'] || row['mac_address'] || row['MAC'] || ''),
          serial_no: String(row['시리얼'] || row['serial_no'] || row['시리얼번호'] || ''),
          status: 'COMPLETED',
          created_at: new Date().toISOString()
        })).filter(r => r.imei || r.asset_no);

        if (normalized.length === 0) {
          onError('파일에서 유효한 데이터(자산번호, IMEI)를 찾을 수 없습니다.');
          setParsedRows([]);
          return;
        }

        setParsedRows(normalized);
      } catch (err) {
        console.error('File parse error:', err);
        onError(`파일 파싱 실패: ${err.message}`);
      }
    };

    reader.readAsBinaryString(file);
  };

  // Download Sample Template (.xlsx)
  const downloadSampleTemplate = () => {
    const templateData = [
      { '자산번호': 'TEST0001', 'IMEI': '351379300225052', 'MAC Address': '4CEBB0B57A51', '시리얼': 'R5KL60F0CZW' },
      { '자산번호': 'TEST0002', 'IMEI': '351379300224790', 'MAC Address': '4CEBB0B57A1D', '시리얼': 'R5KL60F0C6F' }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '양식템플릿');
    XLSX.writeFile(workbook, 'ImageScan_Import_Template.xlsx');
  };

  // Execute Import
  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) {
      onError('가져올 데이터가 없습니다. 먼저 엑셀 또는 CSV 파일을 선택해주세요.');
      return;
    }

    if (importMode === 'replace') {
      if (!confirm(`[경고] 기존 데이터를 전체 삭제하고 파일의 ${parsedRows.length}건으로 새로 입력(덮어쓰기)하시겠습니까?`)) {
        return;
      }
    }

    setIsProcessing(true);
    try {
      await onImportSuccess(parsedRows, importMode);
      setParsedRows([]);
      setFileName('');
      onClose();
    } catch (err) {
      onError(err.message || '데이터 입력 실패');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '800px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
            <Upload size={22} />
            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>양식 데이터 일괄 입력 & 전체 덮어쓰기</h3>
          </div>
          <button className="btn btn-outline" style={{ padding: '4px 8px' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Action Controls & Mode Selection */}
        <div style={{
          backgroundColor: '#0f172a',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', cursor: 'pointer', color: importMode === 'replace' ? '#f43f5e' : '#f8fafc' }}>
                <input
                  type="radio"
                  name="importMode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                />
                <strong style={{ color: '#f43f5e' }}>[초기화 및 덮어쓰기]</strong> 기존 DB 삭제 후 전체 새로 입력
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="importMode"
                  value="append"
                  checked={importMode === 'append'}
                  onChange={() => setImportMode('append')}
                />
                <strong>[기존 데이터 유지]</strong> 누적 추가하기
              </label>
            </div>

            <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={downloadSampleTemplate}>
              <Download size={14} />
              양식 템플릿 (.xlsx) 받기
            </button>
          </div>

          {/* File Input */}
          <div className="form-group">
            <label className="form-label">엑셀 또는 CSV 파일 선택 (.xlsx, .csv)</label>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              className="form-input"
              onChange={handleFileUpload}
              style={{ cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* Parsed Preview Table */}
        {parsedRows.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                파일 ({fileName}) ➔ 파싱된 총 <strong style={{ color: '#38bdf8' }}>{parsedRows.length}건</strong> 데이터 미리보기
              </span>
            </div>

            <div style={{
              maxHeight: '250px',
              overflowY: 'auto',
              backgroundColor: '#0f172a',
              borderRadius: '6px',
              border: '1px solid #334155'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1e293b', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                    <th style={{ padding: '8px 12px' }} className="nowrap-cell">자산번호</th>
                    <th style={{ padding: '8px 12px' }} className="nowrap-cell">IMEI</th>
                    <th style={{ padding: '8px 12px' }} className="nowrap-cell">MAC Address</th>
                    <th style={{ padding: '8px 12px' }} className="nowrap-cell">시리얼</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 100).map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '6px 12px', color: '#38bdf8', fontWeight: 600 }} className="nowrap-cell">{row.asset_no}</td>
                      <td style={{ padding: '6px 12px', fontFamily: 'monospace', fontWeight: 700 }} className="nowrap-cell">{row.imei}</td>
                      <td style={{ padding: '6px 12px', color: '#fda4af' }} className="nowrap-cell">{row.mac_address || '-'}</td>
                      <td style={{ padding: '6px 12px', color: '#d8b4fe' }} className="nowrap-cell">{row.serial_no || '-'}</td>
                    </tr>
                  ))}
                  {parsedRows.length > 100 && (
                    <tr>
                      <td colSpan={4} style={{ padding: '8px', textAlign: 'center', color: '#64748b', fontSize: '0.75rem' }}>
                        ...외 {parsedRows.length - 100}건 추가 항목 존재
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button className="btn btn-outline" onClick={onClose} disabled={isProcessing}>
            취소
          </button>
          <button
            className={`btn ${importMode === 'replace' ? 'btn-danger' : 'btn-primary'}`}
            onClick={handleExecuteImport}
            disabled={parsedRows.length === 0 || isProcessing}
          >
            {isProcessing ? 'DB 처리 중...' : importMode === 'replace' ? `기존 DB 삭제 후 ${parsedRows.length}건 전체 덮어쓰기` : `${parsedRows.length}건 DB에 추가하기`}
          </button>
        </div>
      </div>
    </div>
  );
}
