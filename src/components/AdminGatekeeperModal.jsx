import React, { useState } from 'react';
import { Lock, KeyRound, Check, X, ShieldAlert, ShieldCheck } from 'lucide-react';
import { verifyAdminPasscode, updateAdminPasscode, getStoredAdminPasscode } from '../utils/adminAuth';

export default function AdminGatekeeperModal({ isOpen, onClose, onSuccess, targetFeatureName = '관리자 전용 기능' }) {
  const [passcode, setPasscode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isChangeMode, setIsChangeMode] = useState(false);
  const [oldPasscode, setOldPasscode] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [changeSuccessMsg, setChangeSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleVerify = (e) => {
    e?.preventDefault();
    setErrorMessage('');
    const result = verifyAdminPasscode(passcode);
    if (result.success) {
      setPasscode('');
      if (onSuccess) onSuccess();
    } else {
      setErrorMessage(result.message || '비밀번호가 일치하지 않습니다.');
    }
  };

  const handleChangePasscode = async (e) => {
    e?.preventDefault();
    setErrorMessage('');
    setChangeSuccessMsg('');
    const result = await updateAdminPasscode(oldPasscode, newPasscode);
    if (result.success) {
      setChangeSuccessMsg(result.message);
      setOldPasscode('');
      setNewPasscode('');
      setTimeout(() => {
        setIsChangeMode(false);
        setChangeSuccessMsg('');
        if (onSuccess) onSuccess();
      }, 1200);
    } else {
      setErrorMessage(result.message);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#1e293b',
        border: '1px solid #475569',
        borderRadius: '10px',
        width: '100%',
        maxWidth: '380px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden',
        color: '#f8fafc'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          backgroundColor: '#0f172a',
          borderBottom: '1px solid #334155'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={16} style={{ color: '#f59e0b' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
              {isChangeMode ? '관리자 비밀번호 변경' : '관리자 인증'}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {!isChangeMode ? (
            <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '0.75rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                <span style={{ color: '#f59e0b', fontWeight: 600 }}>[{targetFeatureName}]</span> 접근을 위해 관리자 비밀번호를 입력하세요.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8' }}>비밀번호 (초기: 0000)</label>
                <input
                  type="password"
                  autoFocus
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="비밀번호 입력"
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                    letterSpacing: '2px'
                  }}
                />
              </div>

              {errorMessage && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#450a0a',
                  border: '1px solid #ef4444',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  color: '#fca5a5',
                  fontSize: '0.72rem'
                }}>
                  <ShieldAlert size={14} />
                  {errorMessage}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-outline"
                  style={{ flex: 1, fontSize: '0.75rem', padding: '6px' }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 2, fontSize: '0.75rem', padding: '6px', backgroundColor: '#f59e0b', borderColor: '#f59e0b', color: '#000', fontWeight: 700 }}
                >
                  <Check size={14} /> 인증
                </button>
              </div>

              <div style={{ textAlign: 'center', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsChangeMode(true);
                    setErrorMessage('');
                  }}
                  style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.68rem', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  비밀번호 변경하기
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleChangePasscode} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8' }}>현재 비밀번호</label>
                <input
                  type="password"
                  value={oldPasscode}
                  onChange={(e) => setOldPasscode(e.target.value)}
                  placeholder="현재 비밀번호 입력"
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    color: '#f8fafc',
                    fontSize: '0.8rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8' }}>새 비밀번호 (4자리 이상)</label>
                <input
                  type="password"
                  value={newPasscode}
                  onChange={(e) => setNewPasscode(e.target.value)}
                  placeholder="새 비밀번호 입력"
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    color: '#f8fafc',
                    fontSize: '0.8rem'
                  }}
                />
              </div>

              {errorMessage && (
                <div style={{ color: '#ef4444', fontSize: '0.72rem' }}>{errorMessage}</div>
              )}
              {changeSuccessMsg && (
                <div style={{ color: '#4ade80', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={14} /> {changeSuccessMsg}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsChangeMode(false)}
                  className="btn btn-outline"
                  style={{ flex: 1, fontSize: '0.75rem', padding: '6px' }}
                >
                  뒤로
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 2, fontSize: '0.75rem', padding: '6px' }}
                >
                  변경 완료
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
