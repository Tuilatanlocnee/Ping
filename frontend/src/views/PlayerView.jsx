import React, { useState, useEffect } from 'react';

/**
 * Giao diện chính của Người chơi (Player) chạy trên thiết bị di động/trình duyệt.
 * Vòng đời hiển thị: Join -> Lobby waiting -> Answer buttons -> Submitted -> Result -> Podium
 */
export default function PlayerView({ 
  isConnected, 
  sendMessage, 
  lastMessage, 
  onBackToHome 
}) {
  const [playerState, setPlayerState] = useState('JOIN'); // JOIN, LOBBY, QUESTION, SUBMITTED, RESULT, LEADERBOARD_WAIT, PODIUM
  const [pin, setPin] = useState('');
  const [nickname, setNickname] = useState('');
  const [pinVerified, setPinVerified] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [optionsCount, setOptionsCount] = useState(4);
  const [pointsGained, setPointsGained] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [isCorrect, setIsCorrect] = useState(false);
  const [streak, setStreak] = useState(0);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState(-1);
  const [finalRank, setFinalRank] = useState(0);

  // Tự động kiểm tra mã PIN truyền qua URL query parameters (ví dụ quét QR có điền sẵn PIN)
  useEffect(() => {
    if (playerState === 'JOIN') {
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
    }
  }, [playerState, isConnected]);

  // Xử lý các tin nhắn từ WebSocket Server gửi riêng cho Player này
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

      case 'JOIN_SUCCESS':
        setPin(payload.pin);
        setNickname(payload.nickname);
        setPlayerState('LOBBY');
        setErrorMsg('');
        break;

      case 'JOIN_FAILED':
        setErrorMsg(payload.error || 'Không thể tham gia phòng.');
        break;

      case 'GAME_STARTED':
        setPlayerState('LOBBY'); // Chờ nhận câu hỏi đầu tiên
        break;

      case 'NEW_QUESTION':
        setOptionsCount(payload.optionsCount || 4);
        setPlayerState('QUESTION');
        break;

      case 'ANSWER_SUBMITTED':
        setPointsGained(payload.points || 0);
        setPlayerState('SUBMITTED');
        break;

      case 'QUESTION_ENDED':
        setIsCorrect(payload.isCorrect);
        setPointsGained(payload.pointsGained);
        setTotalScore(payload.totalScore);
        setStreak(payload.streak);
        setCorrectAnswerIndex(payload.correctAnswerIndex);
        setPlayerState('RESULT');
        break;

      case 'LEADERBOARD_SHOWN':
        setPlayerState('LEADERBOARD_WAIT');
        break;

      case 'GAME_OVER':
        // Tìm thứ hạng chung cuộc của mình trong danh sách podium
        const podiumList = payload.podium || [];
        const myRankIndex = podiumList.findIndex(p => p.nickname === nickname);
        if (myRankIndex !== -1) {
          setFinalRank(myRankIndex + 1);
        } else {
          setFinalRank(null);
        }
        setPlayerState('PODIUM');
        break;

      case 'ROOM_CLOSED':
        alert(payload.message || 'Phòng chơi đã bị đóng.');
        onBackToHome();
        break;

      default:
        break;
    }
  }, [lastMessage, nickname, onBackToHome]);

  // Gửi yêu cầu kiểm tra mã PIN
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

  // Gửi yêu cầu tham gia phòng
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

  // Người chơi nộp đáp án
  const handleAnswerSubmit = (index) => {
    sendMessage({
      type: 'SUBMIT_ANSWER',
      pin,
      nickname,
      answerIndex: index
    });
    setPlayerState('SUBMITTED');
  };

  // Quay lại bước trước hoặc trang chủ
  const handleBack = () => {
    if (pinVerified) {
      setPinVerified(false);
      setErrorMsg('');
    } else {
      onBackToHome();
    }
  };

  // 1. MÀN HÌNH ĐĂNG NHẬP PHÒNG CHƠI (JOIN)
  if (playerState === 'JOIN') {
    return (
      <div className="glass-panel fade-in" style={{
        maxWidth: '450px',
        margin: '50px auto',
        padding: '30px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <h2 style={{
          textAlign: 'center',
          fontSize: '2rem',
          fontWeight: '800',
          background: 'linear-gradient(to right, #a200ff, #ff007f)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>Tham Gia Game</h2>
        
        {errorMsg && (
          <div style={{
            background: 'rgba(255, 69, 0, 0.1)',
            border: '1px solid var(--color-red)',
            color: 'var(--color-red)',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '0.95rem',
            textAlign: 'center'
          }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!pinVerified ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '500' }}>PIN PHÒNG CHƠI</label>
              <input 
                type="text" 
                placeholder="Mã PIN trò chơi" 
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '14px',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '1.2rem',
                  textAlign: 'center',
                  letterSpacing: '2px',
                  fontWeight: 'bold'
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
                  padding: '14px',
                  background: 'linear-gradient(135deg, var(--color-blue), hsl(190, 100%, 45%))',
                  boxShadow: '0 0 15px rgba(0, 191, 255, 0.3)',
                  marginTop: '10px'
                }}
              >
                {isConnected ? 'Tham gia' : 'Đang kết nối đến máy chủ...'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Hiển thị PIN đã được xác thực */}
              <div style={{
                background: 'rgba(0, 191, 255, 0.08)',
                border: '1px solid rgba(0, 191, 255, 0.2)',
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '0.95rem' }}>
                  PIN: <strong style={{ color: 'var(--color-blue)', letterSpacing: '1px' }}>{pin}</strong> (Hợp lệ ✅)
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
                    fontSize: '0.85rem',
                    textDecoration: 'underline'
                  }}
                >
                  Đổi PIN
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '500' }}>NICKNAME CỦA BẠN</label>
                <input 
                  type="text" 
                  placeholder="Tên hiển thị..." 
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value.slice(0, 15))}
                  maxLength={15}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '14px',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '1.1rem',
                    textAlign: 'center'
                  }}
                  required
                  autoFocus
                />
              </div>

              <button 
                type="submit" 
                className="neon-btn"
                disabled={!isConnected}
                style={{ 
                  width: '100%', 
                  padding: '14px',
                  background: 'linear-gradient(135deg, var(--secondary), hsl(280, 100%, 55%))',
                  boxShadow: '0 0 15px rgba(162, 0, 255, 0.3)',
                  marginTop: '10px'
                }}
              >
                {isConnected ? 'Tham Gia Phòng' : 'Đang kết nối đến máy chủ...'}
              </button>
            </div>
          )}
        </form>

        <button 
          className="neon-btn" 
          onClick={handleBack}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'none',
            fontSize: '0.95rem'
          }}
        >
          Quay lại
        </button>
      </div>
    );
  }

  // 2. MÀN HÌNH CHỜ HOST BẮT ĐẦU (LOBBY)
  if (playerState === 'LOBBY') {
    return (
      <div className="glass-panel fade-in" style={{
        maxWidth: '450px',
        margin: '60px auto',
        padding: '40px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px'
      }}>
        <div style={{ fontSize: '4rem', animation: 'pulse-glow 2s infinite ease-in-out', borderRadius: '50%', width: '90px', height: '90px', display: 'flex', alignItems: 'center', justifycontent: 'center', background: 'rgba(255,255,255,0.02)' }}>
          🎮
        </div>
        <h3 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Đã tham gia phòng chơi!</h3>
        
        <div style={{ 
          background: 'rgba(255,255,255,0.03)', 
          padding: '15px 30px', 
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.05)',
          width: '100%'
        }}>
          <div>Biệt danh: <strong style={{ color: 'var(--primary)' }}>{nickname}</strong></div>
          <div style={{ marginTop: '5px' }}>Mã PIN: <strong>{pin}</strong></div>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>
          Bạn đã sẵn sàng! Hãy nhìn lên màn hình lớn của Host để chờ đợi game bắt đầu.
        </p>
      </div>
    );
  }

  // 3. MÀN HÌNH CHỌN ĐÁP ÁN (QUESTION)
  if (playerState === 'QUESTION') {
    const colors = ['red', 'blue', 'yellow', 'green'];
    const letters = ['▲', '◆', '●', '■'];

    return (
      <div className="fade-in" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '85vh',
        padding: '16px',
        width: '100%'
      }}>
        <div style={{ marginBottom: '20px', fontSize: '1.1rem', color: 'var(--text-muted)' }}>
          Nickname: <strong style={{ color: 'white' }}>{nickname}</strong>
        </div>
        
        <div className="answers-grid" style={{ 
          height: '60vh', 
          gridTemplateRows: optionsCount > 2 ? 'repeat(2, 1fr)' : '1fr',
          maxHeight: '550px'
        }}>
          {Array.from({ length: optionsCount }).map((_, idx) => (
            <button 
              key={idx} 
              className={`answer-option ${colors[idx]}`}
              onClick={() => handleAnswerSubmit(idx)}
              style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '3rem',
                borderRadius: '20px'
              }}
            >
              <span style={{ transform: 'scale(1.5)' }}>{letters[idx]}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 4. MÀN HÌNH ĐÃ SUBMIT ĐÁP ÁN, ĐANG CHỜ HẾT GIỜ (SUBMITTED)
  if (playerState === 'SUBMITTED') {
    return (
      <div className="fade-in" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        padding: '20px',
        textAlign: 'center',
        gap: '24px'
      }}>
        <div style={{
          width: '70px',
          height: '70px',
          borderRadius: '50%',
          border: '4px solid rgba(255, 255, 255, 0.1)',
          borderTopColor: 'var(--primary)',
          animation: 'pulse-glow 1s infinite linear',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem'
        }}>
          👍
        </div>
        <h2 style={{ fontSize: '2rem', fontWeight: '800' }}>Đáp án đã được gửi!</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
          Bạn gửi câu trả lời siêu nhanh! Đang chờ những người chơi khác trả lời hoặc hết giờ đếm ngược...
        </p>
      </div>
    );
  }

  // 5. MÀN HÌNH KẾT QUẢ CỦA CÂU HỎI (RESULT)
  if (playerState === 'RESULT') {
    const letters = ['▲', '◆', '●', '■'];
    const colors = ['Đỏ (▲)', 'Xanh Dương (◆)', 'Vàng (●)', 'Xanh Lá (■)'];

    return (
      <div className="fade-in" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '85vh',
        padding: '20px',
        textAlign: 'center',
        background: isCorrect 
          ? 'radial-gradient(circle, hsla(150, 90%, 20%, 0.4) 0%, transparent 70%)'
          : 'radial-gradient(circle, hsla(355, 90%, 20%, 0.4) 0%, transparent 70%)',
        transition: 'var(--transition-smooth)'
      }}>
        <div className="glass-panel" style={{
          maxWidth: '450px',
          width: '100%',
          padding: '40px 30px',
          border: isCorrect ? '2px solid var(--color-green)' : '2px solid var(--color-red)',
          boxShadow: isCorrect ? '0 0 25px var(--color-green-glow)' : '0 0 25px var(--color-red-glow)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px'
        }}>
          <div style={{ fontSize: '5rem' }}>{isCorrect ? '🎉' : '❌'}</div>
          
          <h2 style={{ 
            fontSize: '2.5rem', 
            fontWeight: '800',
            color: isCorrect ? 'var(--color-green)' : 'var(--color-red)'
          }}>
            {isCorrect ? 'Chính Xác!' : 'Sai Mất Rồi!'}
          </h2>

          {isCorrect ? (
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
              +{pointsGained} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>điểm</span>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
              Đáp án đúng là: <strong style={{ color: 'white' }}>{colors[correctAnswerIndex] || 'Không xác định'}</strong>
            </div>
          )}

          {streak > 1 && isCorrect && (
            <div style={{
              background: 'linear-gradient(135deg, #ff4500, #ff8c00)',
              color: 'white',
              padding: '6px 16px',
              borderRadius: '20px',
              fontWeight: 'bold',
              fontSize: '1rem',
              animation: 'pulse-glow 1.5s infinite ease-in-out'
            }}>
              🔥 Chuỗi đúng liên tiếp: {streak}
            </div>
          )}

          <div style={{ 
            width: '100%', 
            height: '1px', 
            background: 'rgba(255,255,255,0.08)',
            margin: '10px 0'
          }} />

          <div style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>
            Tổng số điểm: <strong style={{ color: 'white', fontSize: '1.4rem' }}>{totalScore} pts</strong>
          </div>
        </div>

        <p style={{ marginTop: '30px', color: 'var(--text-muted)' }}>
          Hãy nhìn lên màn hình lớn để chờ Host chuẩn bị câu kế tiếp.
        </p>
      </div>
    );
  }

  // 6. MÀN HÌNH CHỜ BẢNG XẾP HẠNG (LEADERBOARD_WAIT)
  if (playerState === 'LEADERBOARD_WAIT') {
    return (
      <div className="glass-panel fade-in" style={{
        maxWidth: '450px',
        margin: '60px auto',
        padding: '40px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px'
      }}>
        <div style={{ fontSize: '4rem', animation: 'pulse-glow 2s infinite ease-in-out' }}>📊</div>
        <h3 style={{ fontSize: '1.6rem', fontWeight: '700' }}>Bảng Xếp Hạng Đang Chạy</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: '1.5' }}>
          Đang chiếu bảng xếp hạng trên màn hình lớn. Hãy kiểm tra xem bạn có lọt vào Top 5 không nhé!
        </p>
      </div>
    );
  }

  // 7. MÀN HÌNH VINH DANH CHUNG CUỘC (PODIUM)
  if (playerState === 'PODIUM') {
    return (
      <div className="glass-panel fade-in" style={{
        maxWidth: '450px',
        margin: '60px auto',
        padding: '40px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
        border: finalRank && finalRank <= 3 ? '2px solid #ffd700' : '1px solid var(--border-glass)',
        boxShadow: finalRank && finalRank <= 3 ? '0 0 25px rgba(255, 215, 0, 0.2)' : 'none'
      }}>
        <div style={{ fontSize: '5rem' }}>
          {finalRank === 1 ? '👑' : finalRank === 2 ? '🥈' : finalRank === 3 ? '🥉' : '👏'}
        </div>
        <h3 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Trò Chơi Kết Thúc!</h3>

        <div style={{ 
          background: 'rgba(255,255,255,0.03)', 
          padding: '20px', 
          borderRadius: '12px',
          width: '100%'
        }}>
          {finalRank ? (
            <div>Chúc mừng! Bạn đạt thứ hạng: <strong style={{ color: '#ffd700', fontSize: '1.8rem' }}>#{finalRank}</strong></div>
          ) : (
            <div>Cảm ơn bạn đã tham gia!</div>
          )}
          <div style={{ marginTop: '10px', fontSize: '1.1rem' }}>
            Tổng điểm đạt được: <strong style={{ color: 'var(--primary)' }}>{totalScore} pts</strong>
          </div>
        </div>

        <button className="neon-btn" onClick={onBackToHome} style={{ width: '100%', marginTop: '10px' }}>
          Quay Về Trang Chủ
        </button>
      </div>
    );
  }

  return null;
}
