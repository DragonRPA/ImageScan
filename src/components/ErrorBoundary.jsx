import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught React Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#ef4444', marginBottom: '10px' }}>⚠️ 시스템 렌더링 복구 진행</h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', maxWidth: '400px', marginBottom: '20px' }}>
            화면을 다시 로드하거나 아래 버튼을 누르면 정상 모드로 복구됩니다.
            <br />
            ({this.state.error?.message || '알 수 없는 오류'})
          </p>
          <button
            className="btn btn-primary"
            style={{ padding: '10px 20px', fontWeight: 800 }}
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
          >
            🔄 화면 새로고침 및 복구
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
