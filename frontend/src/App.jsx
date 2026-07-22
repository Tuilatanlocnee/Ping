import React, { useState, useCallback, useEffect } from 'react';
import HomeView from './views/HomeView';
import HostView from './views/HostView';
import PlayerView from './views/PlayerView';
import QuizCreator from './views/QuizCreator';
import HistoryView from './views/HistoryView';
import { useWebSocket } from './hooks/useWebSocket';

// Hàm phân tích hash URL sang trạng thái role & subView tương ứng
const parseHash = (hash) => {
  if (hash === '#/host') return { role: 'HOST', subView: null };
  if (hash === '#/player') return { role: 'PLAYER', subView: null };
  if (hash === '#/host/create-quiz') return { role: 'HOST', subView: 'CREATE_QUIZ' };
  if (hash === '#/host/history') return { role: 'HOST', subView: 'HISTORY' };
  return { role: 'SELECT', subView: null };
};

function App() {
  const [role, setRole] = useState('SELECT');
  const [subView, setSubView] = useState(null);
  
  const [lastMessage, setLastMessage] = useState(null);
  const [joinedPlayer, setJoinedPlayer] = useState(null); // Lưu thông tin đăng nhập thành công để truyền cho PlayerView

  // Quản lý theme Sáng / Tối (Light & Dark Mode)
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Lắng nghe sự kiện thay đổi hash (Back/Forward) của trình duyệt để đồng bộ vào state
  useEffect(() => {
    const handleHashChange = () => {
      const currentHash = window.location.hash || '#/';
      const parsed = parseHash(currentHash);
      setRole(parsed.role);
      setSubView(parsed.subView);
    };
    
    // Đồng bộ ngay lần đầu mount
    handleHashChange();
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Định cấu hình WebSocket URL tự động lấy IP hiện tại
  const getWSUrl = () => {
    if (import.meta.env.VITE_WS_URL) {
      return import.meta.env.VITE_WS_URL;
    }
    const hostname = window.location.hostname || 'localhost';
    return `ws://${hostname}:3001`;
  };

  // Callback nhận tin nhắn từ WebSocket Server
  const handleMessageReceived = useCallback((data) => {
    setLastMessage(data);

    // Xử lý trực tiếp tin nhắn JOIN_SUCCESS ngay lập tức để tránh lỗi ghi đè tin nhắn dồn dập (WebSocket Batching)
    if (data && data.type === 'JOIN_SUCCESS') {
      setJoinedPlayer({
        pin: data.pin,
        nickname: data.nickname,
        playerList: data.playerList
      });
      setRole('PLAYER');
      setSubView(null);
      window.location.hash = '#/player';
    }
  }, []);

  // Luôn luôn kết nối WebSocket để hỗ trợ kiểm tra mã PIN ngay tại trang chủ
  const { isConnected, error, sendMessage, connect } = useWebSocket(
    getWSUrl(),
    handleMessageReceived
  );

  // Các hàm điều hành URL hash để cập nhật lịch sử duyệt web
  const handleSelectRole = (newRole) => {
    setRole(newRole);
    setSubView(null);
    window.location.hash = `#/${newRole.toLowerCase()}`;
  };

  const handleNavigate = (newSubView) => {
    setSubView(newSubView);
    if (newSubView) {
      window.location.hash = `#/host/${newSubView.toLowerCase().replace('_', '-')}`;
    } else {
      window.location.hash = '#/host';
    }
  };

  const handleBackToDashboard = () => {
    setSubView(null);
    window.location.hash = '#/host';
  };

  const handleBackToHome = () => {
    setJoinedPlayer(null);
    setRole('SELECT');
    setSubView(null);
    window.location.hash = '#/';
    setLastMessage(null);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      width: '100%'
    }}>
      {/* Header High-Tech Console hiển thị trạng thái kết nối */}
      <header style={{
        padding: '14px 28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--border-glass)',
        background: 'rgba(6, 9, 19, 0.75)',
        backdropFilter: 'blur(16px)',
        zIndex: 100
      }}>
        <div 
          onClick={handleBackToHome}
          style={{ 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            userSelect: 'none'
          }}
        >
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 12px var(--primary-glow)',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            color: '#fff'
          }}>
            ⚡
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{
              fontFamily: 'var(--font-tech)',
              fontSize: '1.45rem',
              fontWeight: '800',
              letterSpacing: '1px',
              background: 'linear-gradient(90deg, #00f0ff, #7000ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Ping!
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {role === 'SELECT' ? (
            <button 
              onClick={() => handleSelectRole('HOST')}
              className="neon-btn"
              style={{
                padding: '8px 18px',
                fontSize: '0.85rem'
              }}
            >
              <span>🖥️</span> Quản Lý Phòng
            </button>
          ) : (
            <div 
              className={`cyber-badge ${isConnected ? 'success' : 'danger'}`}
              onClick={!isConnected ? connect : undefined}
              style={{ cursor: isConnected ? 'default' : 'pointer' }}
              title={!isConnected ? 'Nhấp để kết nối lại máy chủ' : 'Đã kết nối thời gian thực'}
            >
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'currentColor',
                display: 'inline-block'
              }} />
              {isConnected ? 'ONLINE // WS-READY' : 'OFFLINE (NHẤP ĐỂ KẾT NỐI LẠI)'}
            </div>
          )}

          {/* Nút bật tắt giao diện Sáng / Tối */}
          <button 
            onClick={toggleTheme} 
            style={{
              background: 'rgba(0, 240, 255, 0.05)',
              border: '1px solid var(--border-glass)',
              borderRadius: '10px',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              transition: 'var(--transition-fast)',
              padding: 0
            }}
            title={theme === 'dark' ? 'Chuyển sang chế độ Sáng' : 'Chuyển sang chế độ Tối'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Vùng hiển thị nội dung chính */}
      <main className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {error && role !== 'SELECT' && (
          <div className="glass-panel" style={{
            maxWidth: '500px',
            margin: '20px auto',
            padding: '24px',
            borderColor: 'var(--color-red)',
            color: 'var(--color-red)',
            textAlign: 'center'
          }}>
            <p style={{ fontFamily: 'var(--font-tech)', fontSize: '1.1rem' }}>
              <strong>⚠️ LỖI HỆ THỐNG:</strong> {error}
            </p>
            <button className="neon-btn" onClick={handleBackToHome} style={{ marginTop: '16px', padding: '10px 24px', fontSize: '0.9rem' }}>
              Quay Lại Trang Chủ
            </button>
          </div>
        )}

        {!error && role === 'SELECT' && (
          <HomeView 
            onSelectRole={handleSelectRole} 
            lastMessage={lastMessage}
            sendMessage={sendMessage}
            isConnected={isConnected}
          />
        )}

        {/* LOGIC ĐIỀU PHỐI HOST VIEWS VỚI CÁC SUBVIEWS MỚI NÂNG CẤP */}
        {!error && role === 'HOST' && (
          <>
            {subView === 'CREATE_QUIZ' ? (
              <QuizCreator onBackToDashboard={handleBackToDashboard} />
            ) : subView === 'HISTORY' ? (
              <HistoryView onBackToDashboard={handleBackToDashboard} />
            ) : (
              <HostView 
                isConnected={isConnected}
                sendMessage={sendMessage}
                lastMessage={lastMessage}
                onBackToHome={handleBackToHome}
                onNavigate={handleNavigate}
              />
            )}
          </>
        )}

        {!error && role === 'PLAYER' && (
          <PlayerView 
            isConnected={isConnected}
            sendMessage={sendMessage}
            lastMessage={lastMessage}
            onBackToHome={handleBackToHome}
            joinedPlayer={joinedPlayer}
          />
        )}
      </main>

      {/* Footer bản quyền */}
      <footer className="app-footer" style={{
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontFamily: 'var(--font-tech)',
        fontSize: '0.85rem',
        color: 'var(--text-muted)',
        borderTop: '1px solid var(--border-glass)',
        background: 'rgba(6, 9, 19, 0.8)',
        backdropFilter: 'blur(8px)'
      }}>
        <div>© 2026 Ping! - Trò chơi Trắc nghiệm Realtime Trực tuyến</div>
        <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem' }}>
          <span>WS-REALTIME</span>
          <span>HIGH PERFORMANCE</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
