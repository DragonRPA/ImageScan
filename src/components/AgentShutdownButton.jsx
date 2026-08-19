import React from 'react';

export default function AgentShutdownButton({ onShutdown }) {
  const handleClick = async () => {
    try {
      const res = await fetch('http://localhost:9988/api/agent/shutdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (data.ok) {
        console.log('Agent shutdown requested');
        if (onShutdown) onShutdown();
      } else {
        console.warn('Shutdown failed', data);
      }
    } catch (e) {
      console.error('Shutdown error', e);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <button
        onClick={handleClick}
        style={{
          padding: '6px 12px',
          backgroundColor: '#ef4444',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        에이전트 끄기
      </button>
    </div>
  );
}
