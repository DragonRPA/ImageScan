import React, { useState } from 'react';
import { Bot, RefreshCw, CheckCircle, AlertTriangle, X, Download } from 'lucide-react';
import { triggerAgentSelfUpdate } from '../utils/agentUpdateManager';

export default function AgentUpdateModal({ isOpen, onClose, agentStatus, onUpdateSuccess }) {
  const [updating, setUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState(null);

  if (!isOpen) return null;

  const handleStartUpdate = async () => {
    setUpdating(true);
    setUpdateResult(null);

    const res = await triggerAgentSelfUpdate();
    setUpdating(false);
    setUpdateResult(res);

    if (res.success) {
      if (onUpdateSuccess) {
        setTimeout(() => {
          onUpdateSuccess();
          onClose();
        }, 3500);
      }
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '520px', backgroundColor: '#0f172a', border: '1px solid #334155' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8' }}>
            <Bot size={22} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>에이전트 스마트 자가 업데이트</h3>
          </div>
          <button className="btn btn-outline" style={{ padding: '4px 8px' }} onClick={onClose} disabled={updating}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
          <div style={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: '#94a3b8' }}>현재 실행 중인 에이전트:</span>
              <strong style={{ color: '#f87171' }}>{agentStatus?.version || '구버전'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: '#94a3b8' }}>배포된 최신 요구 버전:</span>
              <strong style={{ color: '#4ade80' }}>{agentStatus?.requiredVersion || 'v1.4'}</strong>
            </div>
          </div>

          <div style={{
            fontSize: '0.8rem',
            color: '#cbd5e1',
            lineHeight: 1.5,
            backgroundColor: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            padding: '10px 12px',
            borderRadius: '6px'
          }}>
            ℹ️ <strong>업데이트 작동 방식:</strong><br />
            1. 에이전트가 GitHub에서 최신 <code>UBUS_DragonRPA_Agent.exe</code>를 다운로드합니다.<br />
            2. 기존 프로세스를 안전하게 교체하고 1초 만에 자동 재실행합니다.<br />
            3. 기존 프린터 IP 및 DB 설정은 100% 그대로 유지됩니다.
          </div>

          {updateResult && (
            <div style={{
              padding: '10px',
              borderRadius: '6px',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: updateResult.success ? '#052e16' : '#450a0a',
              border: `1px solid ${updateResult.success ? '#166534' : '#991b1b'}`,
              color: updateResult.success ? '#86efac' : '#fca5a5'
            }}>
              {updateResult.success ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
              <span>{updateResult.message}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button className="btn btn-outline" onClick={onClose} disabled={updating}>
            닫기
          </button>
          <button
            className="btn btn-primary"
            onClick={handleStartUpdate}
            disabled={updating}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#0284c7', borderColor: '#0284c7' }}
          >
            {updating ? <RefreshCw size={14} className="spin" /> : <Download size={14} />}
            {updating ? '다운로드 및 교체 재실행 중...' : '원클릭 스마트 업데이트 시작'}
          </button>
        </div>
      </div>
    </div>
  );
}
