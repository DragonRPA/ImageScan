import React, { useState } from 'react';
import { Database, CheckCircle, AlertCircle, X, Info } from 'lucide-react';
import { getStoredConfig, saveStoredConfig, testSupabaseConnection, normalizeSupabaseUrl } from '../utils/supabaseClient';

export default function SupabaseConfigModal({ isOpen, onClose, onSaveSuccess }) {
  const initial = getStoredConfig();
  const [url, setUrl] = useState(initial.url);
  const [anonKey, setAnonKey] = useState(initial.anonKey);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  if (!isOpen) return null;

  const handleUrlChange = (e) => {
    const val = e.target.value;
    const normalized = normalizeSupabaseUrl(val);
    setUrl(normalized);
  };

  const handleTest = async () => {
    if (!url || !anonKey) {
      setTestResult({ success: false, message: 'URL과 Anon Key를 모두 입력해주세요.' });
      return;
    }
    setTesting(true);
    setTestResult(null);

    const cleanUrl = normalizeSupabaseUrl(url);
    const result = await testSupabaseConnection(cleanUrl, anonKey);
    setTesting(false);
    setTestResult(result);
  };

  const handleSave = () => {
    if (!url || !anonKey) {
      setTestResult({ success: false, message: 'URL과 Anon Key를 입력해주세요.' });
      return;
    }
    const cleanUrl = normalizeSupabaseUrl(url);
    saveStoredConfig(cleanUrl, anonKey);
    if (onSaveSuccess) onSaveSuccess();
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '550px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
            <Database size={22} />
            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Supabase DB 연동 설정</h3>
          </div>
          <button className="btn btn-outline" style={{ padding: '4px 8px' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Vertical Stack Form Layout */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
          <div className="form-group">
            <label className="form-label">Supabase API URL</label>
            <input
              type="text"
              className="form-input"
              placeholder="https://tfgbpgutxxlhqbzewkyt.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={handleUrlChange}
            />
            <div style={{
              fontSize: '0.78rem',
              color: '#38bdf8',
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              padding: '6px 10px',
              borderRadius: '4px',
              marginTop: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Info size={14} />
              <span>올바른 형식: <strong>https://tfgbpgutxxlhqbzewkyt.supabase.co</strong></span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Supabase Anon Key (API Key)</label>
            <input
              type="password"
              className="form-input"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
            />
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Project Settings ➔ API ➔ Project API keys 의 `anon` `public` Key
            </span>
          </div>

          {testResult && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '6px',
              backgroundColor: testResult.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${testResult.success ? 'var(--accent-green)' : 'var(--accent-red)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.9rem',
              color: testResult.success ? '#6ee7b7' : '#fca5a5'
            }}>
              {testResult.success ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
          <button className="btn btn-outline" onClick={handleTest} disabled={testing}>
            {testing ? '연동 검증 중...' : '연동 테스트'}
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-outline" onClick={onClose}>
              취소
            </button>
            <button className="btn btn-primary" onClick={handleSave}>
              저장 및 적용
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
