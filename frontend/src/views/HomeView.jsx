import React, { useState, useEffect } from 'react';

/**
 * Giao diện HomeView: Cho phép người dùng lựa chọn làm Host hoặc Người chơi.
 * Thiết kế sang trọng với hiệu ứng Glassmorphism và Neon Glow.
 */
export default function HomeView({ onSelectRole, lastMessage, sendMessage, isConnected }) {
  const [pin, setPin] = useState('');
  const [pinArray, setPinArray] = useState(['', '', '', '', '', '']);
  const [nickname, setNickname] = useState('');
  const [pinVerified, setPinVerified] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const pinRefs = React.useRef([]);

  // Tự động kiểm tra mã PIN truyền qua URL query parameters (ví dụ quét QR có điền sẵn PIN)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlPin = params.get('pin');
    if (urlPin) {
      const cleanedPin = urlPin.replace(/\D/g, '').slice(0, 6);
      setPin(cleanedPin);
      
      const arr = cleanedPin.split('');
      const newPinArray = ['', '', '', '', '', ''];
      for (let i = 0; i < 6; i++) {
        newPinArray[i] = arr[i] || '';
      }
      setPinArray(newPinArray);

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
        setIsJoining(false);
        break;
      default:
        break;
    }
  }, [lastMessage]);

  // Tự động focus vào ô nhập PIN đầu tiên khi component mount hoặc khi reset PIN
  useEffect(() => {
    if (!pinVerified) {
      const timer = setTimeout(() => {
        pinRefs.current[0]?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [pinVerified]);

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
    if (isJoining) return;
    
    if (!pinVerified) {
      handleCheckRoom();
      return;
    }
    if (!nickname.trim()) {
      setErrorMsg('Vui lòng nhập Nickname.');
      return;
    }
    setErrorMsg('');
    setIsJoining(true);
    sendMessage({
      type: 'JOIN_ROOM',
      pin: pin.trim(),
      nickname: nickname.trim()
    });
  };

  const handlePinChange = (value, index) => {
    // Chỉ cho phép nhập số
    if (value && !/^\d$/.test(value)) return;

    const newPinArray = [...pinArray];
    newPinArray[index] = value;
    setPinArray(newPinArray);

    const newPinStr = newPinArray.join('');
    setPin(newPinStr);

    // Tự động focus sang ô tiếp theo nếu đã điền (trì hoãn 20ms để tránh lỗi lặp phím khi dùng bộ gõ tiếng Việt Unikey/EVKey)
    if (value !== '' && index < 5) {
      setTimeout(() => {
        pinRefs.current[index + 1]?.focus();
      }, 20);
    }
  };

  const handlePinKeyDown = (e, index) => {
    // Nếu bấm Backspace và ô hiện tại đang trống, focus lùi về ô trước (trì hoãn 20ms để đảm bảo đồng bộ)
    if (e.key === 'Backspace' && pinArray[index] === '' && index > 0) {
      setTimeout(() => {
        pinRefs.current[index - 1]?.focus();
      }, 20);
    }
  };

  const handlePinPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newPinArray = [...pinArray];
    for (let i = 0; i < 6; i++) {
      newPinArray[i] = pastedData[i] || '';
    }
    setPinArray(newPinArray);
    setPin(newPinArray.join(''));
    
    // Focus vào ô thích hợp
    const focusIndex = Math.min(pastedData.length, 5);
    pinRefs.current[focusIndex]?.focus();
  };

  return (
    <div className="fade-in home-container">
      <div className="home-grid" style={{ maxWidth: '380px', margin: '0 auto', width: '100%' }}>
        {/* Lựa chọn Người chơi (Giao diện nhập trực tiếp) */}
        <div className="glass-panel home-card" style={{ cursor: 'default', width: '100%' }}>
          <div className="scene3d">
            <div className="cube3d cube-player">
              <div className="cube-face front">🎮</div>
              <div className="cube-face back">📱</div>
              <div className="cube-face right">💬</div>
              <div className="cube-face left">🕹️</div>
              <div className="cube-face top">⭐</div>
              <div className="cube-face bottom">🧠</div>
            </div>
          </div>
          {/* Đã xóa tiêu đề và mô tả người chơi */}

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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', width: '100%' }}>
                <div className="pin-label-title">Mã PIN trò chơi</div>
                <div className="pin-inputs-container" onPaste={handlePinPaste}>
                  {pinArray.map((digit, idx) => (
                    <input
                      key={idx}
                      type="text"
                      ref={(el) => (pinRefs.current[idx] = el)}
                      value={digit}
                      onChange={(e) => handlePinChange(e.target.value.slice(-1), idx)}
                      onKeyDown={(e) => handlePinKeyDown(e, idx)}
                      className="pin-input-field"
                      maxLength={1}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      required
                      autoFocus={idx === 0}
                    />
                  ))}
                </div>
                
                <button 
                  type="submit" 
                  className="neon-btn"
                  disabled={!isConnected}
                  style={{ 
                    width: '100%', 
                    padding: '14px',
                    background: 'linear-gradient(135deg, #681eff, #8a2be2)',
                    boxShadow: '0 0 15px rgba(104, 30, 255, 0.3)',
                    marginTop: '10px',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                  }}
                >
                  {isConnected ? (
                    <>
                      <span>Tham gia</span>
                      <span style={{ fontSize: '1.2rem' }}>→</span>
                    </>
                  ) : (
                    'Đang kết nối...'
                  )}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input 
                  type="text" 
                  placeholder="Nickname của bạn..." 
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value.slice(0, 15))}
                  maxLength={15}
                  className="nickname-input"
                  required
                  autoFocus
                />

                <button 
                  type="submit" 
                  className="neon-btn nickname-submit-btn"
                  disabled={!isConnected || isJoining}
                >
                  {isJoining ? 'Đang vào...' : 'Tham Gia Phòng'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
