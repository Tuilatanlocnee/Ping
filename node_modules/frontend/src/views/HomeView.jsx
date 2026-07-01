import React, { useState, useEffect } from 'react';

/**
 * Giao diện HomeView: Cho phép người dùng lựa chọn làm Host hoặc Người chơi.
 * Thiết kế sang trọng với hiệu ứng Glassmorphism và Neon Glow.
 */
export default function HomeView({ onSelectRole, lastMessage, sendMessage, isConnected }) {
  const [pin, setPin] = useState('');
  const [nickname, setNickname] = useState('');
  const [pinVerified, setPinVerified] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Tự động kiểm tra mã PIN truyền qua URL query parameters (ví dụ quét QR có điền sẵn PIN)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlPin = params.get('pin');
    if (urlPin) {
      const cleanedPin = urlPin.replace(/\D/g, '').slice(0, 6);
      setPin(cleanedPin);
      if (isConnected && cleanedPin.length === 6) {
        sendMessage({
          type: 'CHECK_ROOM',
          pin: cleanedPin
        });
      }
    }
  }, [isConnected, sendMessage]);

  // Xử lý các tin nhắn từ WebSocket Server gửi về để xác thực PIN
  useEffect(() => {
    if (!lastMessage) return;
    const { type, ...payload } = lastMessage;

    switch (type) {
      case 'CHECK_ROOM_RESULT':
        if (payload.success) {
          setPinVerified(true);
          setErrorMsg('');
        } else {
          setErrorMsg(payload.error || 'Mã PIN không hợp lệ.');
        }
        break;
      case 'JOIN_FAILED':
        setErrorMsg(payload.error || 'Không thể tham gia phòng.');
        break;
      default:
        break;
    }
  }, [lastMessage]);

  const handleCheckRoom = () => {
    if (!pin.trim()) {
      setErrorMsg('Vui lòng nhập mã PIN phòng chơi.');
      return;
    }
    setErrorMsg('');
    sendMessage({
      type: 'CHECK_ROOM',
      pin: pin.trim()
    });
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!pinVerified) {
      handleCheckRoom();
      return;
    }
    if (!nickname.trim()) {
      setErrorMsg('Vui lòng nhập Nickname.');
      return;
    }
    setErrorMsg('');
    sendMessage({
      type: 'JOIN_ROOM',
      pin: pin.trim(),
      nickname: nickname.trim()
    });
  };

  return (
    <div className="fade-in" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      padding: '20px',
      textAlign: 'center'
    }}>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '24px',
        width: '100%',
        maxWidth: '600px'
      }}>
        {/* Lựa chọn Host */}
        <div className="glass-panel" style={{
          padding: '40px 30px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          cursor: 'pointer'
        }} onClick={() => onSelectRole('HOST')}>
          <div className="scene3d">
            <div className="cube3d cube-host">
              <div className="cube-face front">📺</div>
              <div className="cube-face back">📊</div>
              <div className="cube-face right">🏆</div>
              <div className="cube-face left">📈</div>
              <div className="cube-face top">💻</div>
              <div className="cube-face bottom">⚙️</div>
            </div>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Host</h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            Tạo phòng chơi mới, phát đề trắc nghiệm và hiển thị bảng xếp hạng trực tiếp trên màn hình lớn.
          </p>
          <button className="neon-btn" style={{ 
            marginTop: 'auto', 
            width: '100%',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            boxShadow: '0 0 15px rgba(162, 0, 255, 0.3)'
          }}>
            Tạo Phòng Ngay
          </button>
        </div>

        {/* Lựa chọn Người chơi (Giao diện nhập trực tiếp) */}
        <div className="glass-panel" style={{
          padding: '40px 30px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px'
        }}>
          <div className="scene3d">
            <div className="cube3d cube-player">
              <div className="cube-face front">🎮</div>
              <div className="cube-face back">📱</div>
              <div className="cube-face right">💬</div>
              <div className="cube-face left">⚡</div>
              <div className="cube-face top">⭐</div>
              <div className="cube-face bottom">🧠</div>
            </div>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Người chơi</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            Nhập mã PIN để tham gia phòng game của Host, trả lời câu hỏi và đua top.
          </p>

          {errorMsg && (
            <div style={{
              background: 'rgba(255, 69, 0, 0.1)',
              border: '1px solid var(--color-red)',
              color: 'var(--color-red)',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              width: '100%',
              textAlign: 'center'
            }}>
              ⚠️ {errorMsg}
            </div>
          )}

          <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', marginTop: 'auto' }}>
            {!pinVerified ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input 
                  type="text" 
                  placeholder="Mã PIN trò chơi" 
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '12px',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '1.1rem',
                    textAlign: 'center',
                    letterSpacing: '2px',
                    fontWeight: 'bold',
                    width: '100%'
                  }}
                  required
                />
                
                <button 
                  type="submit" 
                  className="neon-btn"
                  disabled={!isConnected}
                  style={{ 
                    width: '100%', 
                    padding: '12px',
                    background: 'linear-gradient(135deg, var(--color-blue), hsl(190, 100%, 45%))',
                    boxShadow: '0 0 15px rgba(0, 191, 255, 0.3)',
                    marginTop: '5px',
                    fontSize: '0.95rem'
                  }}
                >
                  {isConnected ? 'Tham gia' : 'Đang kết nối...'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{
                  background: 'rgba(0, 191, 255, 0.06)',
                  border: '1px solid rgba(0, 191, 255, 0.15)',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.85rem'
                }}>
                  <span>
                    PIN: <strong style={{ color: 'var(--color-blue)' }}>{pin}</strong> ✅
                  </span>
                  <button 
                    type="button" 
                    onClick={() => {
                      setPinVerified(false);
                      setErrorMsg('');
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      textDecoration: 'underline'
                    }}
                  >
                    Đổi PIN
                  </button>
                </div>

                <input 
                  type="text" 
                  placeholder="Nickname của bạn..." 
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value.slice(0, 15))}
                  maxLength={15}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '12px',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '1rem',
                    textAlign: 'center',
                    width: '100%'
                  }}
                  required
                  autoFocus
                />

                <button 
                  type="submit" 
                  className="neon-btn"
                  disabled={!isConnected}
                  style={{ 
                    width: '100%', 
                    padding: '12px',
                    background: 'linear-gradient(135deg, var(--secondary), hsl(280, 100%, 55%))',
                    boxShadow: '0 0 15px rgba(162, 0, 255, 0.3)',
                    marginTop: '5px',
                    fontSize: '0.95rem'
                  }}
                >
                  Tham Gia Phòng
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
