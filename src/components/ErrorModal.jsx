import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ErrorModal({ errorMessage, onClose }) {
  if (!errorMessage) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ borderColor: '#ef4444' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
            <AlertTriangle size={24} />
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>시스템 처리 오류</h3>
          </div>
          <button className="btn btn-outline" style={{ padding: '4px 8px' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
          <p style={{ color: '#fca5a5', fontSize: '0.95rem', lineHeight: 1.5, wordBreak: 'break-word' }}>
            {errorMessage}
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-danger" onClick={onClose}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
