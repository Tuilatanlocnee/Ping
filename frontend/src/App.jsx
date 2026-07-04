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
  }, []);

  // Luôn luôn kết nối WebSocket để hỗ trợ kiểm tra mã PIN ngay tại trang chủ
  const { isConnected, error, sendMessage } = useWebSocket(
    getWSUrl(),
    handleMessageReceived
  );

  // Tự động chuyển trang sang vai trò PLAYER khi nhận được thông báo JOIN_SUCCESS từ WebSocket
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'JOIN_SUCCESS') {
      setJoinedPlayer({
        pin: lastMessage.pin,
        nickname: lastMessage.nickname,
        playerList: lastMessage.playerList
      });
      setRole('PLAYER');
      setSubView(null);
      window.location.hash = '#/player';
    }
  }, [lastMessage]);

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
      {/* Header nhỏ hiển thị trạng thái kết nối */}
      <header style={{
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        background: 'rgba(0, 0, 0, 0.2)',
        backdropFilter: 'blur(8px)'
      }}>
        <div 
          onClick={handleBackToHome}
          style={{ 
            fontSize: '1.3rem', 
            fontWeight: '700', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            userSelect: 'none'
          }}
        >
          <span>🎮</span>
          <span style={{
            background: 'linear-gradient(to right, #ffd700, #a200ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Ping!
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {role === 'SELECT' ? (
            <button 
              onClick={() => handleSelectRole('HOST')}
              className="neon-btn"
              style={{
                padding: '8px 16px',
                fontSize: '0.85rem',
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                boxShadow: '0 0 12px var(--primary-glow)',
                borderRadius: '10px',
                cursor: 'pointer',
                border: 'none',
                color: 'white',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>📺</span> Tạo Phòng
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isConnected ? 'var(--color-green)' : 'var(--color-red)',
                boxShadow: isConnected ? '0 0 8px var(--color-green)' : '0 0 8px var(--color-red)'
              }} />
              <span style={{ color: isConnected ? 'var(--color-green)' : 'var(--color-red)', fontWeight: '500' }}>
                {isConnected ? 'Realtime Connected' : 'Disconnected'}
              </span>
            </div>
          )}

          {/* Nút bật tắt giao diện Sáng / Tối */}
          <button 
            onClick={toggleTheme} 
            style={{
              background: 'transparent',
              border: '1px solid var(--border-glass)',
              borderRadius: '50%',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
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
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px' }}>
        {error && role !== 'SELECT' && (
          <div className="glass-panel" style={{
            maxWidth: '500px',
            margin: '20px auto',
            padding: '20px',
            borderColor: 'var(--color-red)',
            color: 'var(--color-red)',
            textAlign: 'center'
          }}>
            <p><strong>Lỗi hệ thống:</strong> {error}</p>
            <button className="neon-btn" onClick={handleBackToHome} style={{ marginTop: '15px', padding: '8px 20px', fontSize: '0.95rem' }}>
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
      <footer style={{
        padding: '16px',
        textAlign: 'center',
        fontSize: '0.85rem',
        color: 'var(--text-muted)',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        background: 'rgba(0, 0, 0, 0.1)'
      }}>
        © 2026 Ping!. Designed for High Performance & Unlimited Players.
      </footer>
    </div>
  );
}

export default App;
