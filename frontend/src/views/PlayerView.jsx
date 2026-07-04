import React, { useState, useEffect, useRef } from 'react';

// Hàm băm tên người chơi để chọn ra avatar cố định và ngộ nghĩnh giống Kahoot
const getAvatarByNickname = (name) => {
  const avatars = [
    { emoji: '🦊', label: 'Cáo Tinh Nghịch' },
    { emoji: '🦄', label: 'Kỳ Lân Mộng Mơ' },
    { emoji: '🐯', label: 'Hổ Dũng Mãnh' },
    { emoji: '🐼', label: 'Gấu Trúc Lười Biếng' },
    { emoji: '🐨', label: 'Koala Hiền Lành' },
    { emoji: '🦁', label: 'Sư Tử Oai Vệ' },
    { emoji: '🐸', label: 'Ếch Xanh Vui Nhộn' },
    { emoji: '🐙', label: 'Bạch Tuộc Thông Thái' },
    { emoji: '🦖', label: 'Khủng Long Bạo Chúa' },
    { emoji: '🤖', label: 'Robot Công Nghệ' },
    { emoji: '👽', label: 'Alien Bí An' },
    { emoji: '🦉', label: 'Cú Đêm Thông Minh' },
    { emoji: '🦥', label: 'Con Lười Nhàn Nhã' },
    { emoji: '🦩', label: 'Hồng Hạc Kiêu Sa' },
    { emoji: '🦫', label: 'Hải Ly Chăm Chỉ' }
  ];
  if (!name) return avatars[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % avatars.length;
  return avatars[index];
};

// Hàm lấy màu sắc ngẫu nhiên nhưng cố định cho mỗi biệt danh
const getColorsByNickname = (name) => {
  const colorPalettes = [
    { left: 'rgba(216, 122, 42, 0.45)', right: 'rgba(216, 122, 42, 0.15)' }, // Cam
    { left: 'rgba(36, 113, 163, 0.45)', right: 'rgba(36, 113, 163, 0.15)' }, // Xanh dương
    { left: 'rgba(30, 132, 73, 0.45)', right: 'rgba(30, 132, 73, 0.15)' },   // Xanh lá
    { left: 'rgba(176, 58, 46, 0.45)', right: 'rgba(176, 58, 46, 0.15)' },   // Đỏ
    { left: 'rgba(108, 52, 131, 0.45)', right: 'rgba(108, 52, 131, 0.15)' }, // Tím
    { left: 'rgba(23, 165, 137, 0.45)', right: 'rgba(23, 165, 137, 0.15)' }  // Cyan
  ];
  if (!name) return colorPalettes[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colorPalettes.length;
  return colorPalettes[index];
};

/**
 * Giao diện chính của Người chơi (Player) chạy trên thiết bị di động/trình duyệt.
 * Vòng đời hiển thị: Join -> Lobby waiting -> Answer buttons -> Submitted -> Result -> Podium
 */
export default function PlayerView({ 
  isConnected, 
  sendMessage, 
  lastMessage, 
  onBackToHome,
  joinedPlayer
}) {
  const [playerState, setPlayerState] = useState(joinedPlayer ? 'LOBBY' : 'JOIN'); // JOIN, LOBBY, QUESTION, SUBMITTED, RESULT, LEADERBOARD_WAIT, PODIUM
  const [pin, setPin] = useState(joinedPlayer ? joinedPlayer.pin : '');
  const [nickname, setNickname] = useState(joinedPlayer ? joinedPlayer.nickname : '');
  const [pinVerified, setPinVerified] = useState(joinedPlayer ? true : false);
  const [errorMsg, setErrorMsg] = useState('');
  const [optionsCount, setOptionsCount] = useState(4);
  const [pointsGained, setPointsGained] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [isCorrect, setIsCorrect] = useState(false);
  const [streak, setStreak] = useState(0);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState(-1);
  const [finalRank, setFinalRank] = useState(0);
  const [currentQuestionText, setCurrentQuestionText] = useState('');
  const [currentOptions, setCurrentOptions] = useState([]);
  const [lobbyPlayers, setLobbyPlayers] = useState(joinedPlayer ? (joinedPlayer.playerList || []) : []);
  const containerRef = useRef(null);
  const [bubbles, setBubbles] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isJoining, setIsJoining] = useState(false);

  // Đồng bộ hóa trạng thái khi prop joinedPlayer thay đổi từ ngoài vào
  useEffect(() => {
    if (joinedPlayer) {
      setPin(joinedPlayer.pin);
      setNickname(joinedPlayer.nickname);
      setLobbyPlayers(joinedPlayer.playerList || []);
      setPinVerified(true);
      setPlayerState('LOBBY');
    }
  }, [joinedPlayer]);

  // Cập nhật bubbles mỗi khi danh sách người chơi trong phòng thay đổi
  useEffect(() => {
    setBubbles(prev => {
      const updated = [];
      const prevMap = new Map(prev.map(b => [b.nickname, b]));

      lobbyPlayers.forEach(nick => {
        if (prevMap.has(nick)) {
          updated.push(prevMap.get(nick));
        } else {
          // Tạo hướng và tốc độ trôi nổi ngẫu nhiên chậm kiểu vũ trụ
          const angle = Math.random() * Math.PI * 2;
          const speed = 0.4 + Math.random() * 0.5;
          // Chọn vị trí xuất phát ngẫu nhiên rộng hơn trên toàn màn hình
          const startX = 100 + Math.random() * (window.innerWidth - 200 || 500);
          const startY = 150 + Math.random() * (window.innerHeight - 300 || 400);
          updated.push({
            nickname: nick,
            x: startX,
            y: startY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 90
          });
        }
      });
      return updated;
    });
  }, [lobbyPlayers]);

  // Vòng lặp cập nhật vật lý va chạm dội tường (60fps)
  useEffect(() => {
    let animationFrameId;

    const updatePhysics = () => {
      setBubbles(prev => {
        if (!containerRef.current || prev.length === 0) return prev;
        const rect = containerRef.current.getBoundingClientRect();
        const width = rect.width || 600;
        const height = rect.height || 400;

        // 1. Cập nhật vị trí tạm thời dựa trên vận tốc và dội tường biên
        let nextBubbles = prev.map(b => {
          let newX = b.x + b.vx;
          let newY = b.y + b.vy;
          let newVx = b.vx;
          let newVy = b.vy;

          const radius = b.size / 2;

          // Va chạm với cạnh trái/phải
          if (newX - radius < 0) {
            newX = radius;
            newVx = Math.abs(b.vx); // dội sang phải
          } else if (newX + radius > width) {
            newX = width - radius;
            newVx = -Math.abs(b.vx); // dội sang trái
          }

          // Va chạm với cạnh trên/dưới
          if (newY - radius < 0) {
            newY = radius;
            newVy = Math.abs(b.vy); // dội xuống dưới
          } else if (newY + radius > height) {
            newY = height - radius;
            newVy = -Math.abs(b.vy); // dội lên trên
          }

          return {
            ...b,
            x: newX,
            y: newY,
            vx: newVx,
            vy: newVy
          };
        });

        // 2. Xử lý va chạm đàn hồi chéo giữa các bong bóng (để không chồng chéo nhau)
        for (let i = 0; i < nextBubbles.length; i++) {
          for (let j = i + 1; j < nextBubbles.length; j++) {
            const b1 = nextBubbles[i];
            const b2 = nextBubbles[j];

            const dx = b2.x - b1.x;
            const dy = b2.y - b1.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            const minDist = b1.size / 2 + b2.size / 2;

            if (distance < minDist) {
              const overlap = minDist - distance;
              // Vectơ đơn vị hướng pháp tuyến va chạm
              const nx = dx / distance;
              const ny = dy / distance;

              // Đẩy 2 bong bóng xa nhau ra 50% mỗi bên để giải phóng chồng lấp
              nextBubbles[i].x -= nx * overlap * 0.5;
              nextBubbles[i].y -= ny * overlap * 0.5;
              nextBubbles[j].x += nx * overlap * 0.5;
              nextBubbles[j].y += ny * overlap * 0.5;

              // Vận tốc tương đối
              const kx = nextBubbles[i].vx - nextBubbles[j].vx;
              const ky = nextBubbles[i].vy - nextBubbles[j].vy;

              // Tích vô hướng vận tốc tương đối và vectơ pháp tuyến đơn vị
              const vn = kx * nx + ky * ny;

              // Chỉ phản ứng nếu 2 vật đang di chuyển lại gần nhau
              if (vn > 0) {
                // Bảo toàn động lượng với khối lượng bằng nhau (trao đổi vận tốc dọc pháp tuyến)
                nextBubbles[i].vx -= vn * nx;
                nextBubbles[i].vy -= vn * ny;
                nextBubbles[j].vx += vn * nx;
                nextBubbles[j].vy += vn * ny;
              }
            }
          }
        }

        return nextBubbles;
      });
      animationFrameId = requestAnimationFrame(updatePhysics);
    };

    animationFrameId = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

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
        setLobbyPlayers(payload.playerList || []);
        setPlayerState('LOBBY');
        setErrorMsg('');
        setIsJoining(false);
        break;

      case 'LOBBY_PLAYERS_UPDATED':
        setLobbyPlayers(payload.playerList || []);
        break;

      case 'JOIN_FAILED':
        setErrorMsg(payload.error || 'Không thể tham gia phòng.');
        setIsJoining(false);
        break;

      case 'GAME_STARTED':
        setPlayerState('LOBBY'); // Chờ nhận câu hỏi đầu tiên
        break;

      case 'NEW_QUESTION':
        setOptionsCount(payload.optionsCount || 4);
        setCurrentQuestionText(payload.questionText || '');
        setCurrentOptions(payload.options || []);
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
        setLeaderboard(payload.leaderboard || []);
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
      <div className="glass-panel fade-in player-card">
        <h2 style={{
          textAlign: 'center',
          fontSize: '2rem',
          fontWeight: '700',
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
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px solid var(--border-glass)',
                  padding: '14px',
                  borderRadius: '10px',
                  color: 'var(--text-primary)',
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
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid var(--border-glass)',
                    padding: '14px',
                    borderRadius: '10px',
                    color: 'var(--text-primary)',
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
                disabled={!isConnected || isJoining}
                style={{ 
                  width: '100%', 
                  padding: '14px',
                  background: 'linear-gradient(135deg, var(--secondary), hsl(280, 100%, 55%))',
                  boxShadow: '0 0 15px rgba(162, 0, 255, 0.3)',
                  marginTop: '10px'
                }}
              >
                {!isConnected ? 'Đang kết nối đến máy chủ...' : isJoining ? 'Đang vào...' : 'Tham Gia Phòng'}
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

  // 2. MÀN HÌNH CHỜ HOST BẮT ĐẦU (LOBBY VŨ TRỤ TRÔI NỔI TOÀN MÀN HÌNH)
  if (playerState === 'LOBBY') {
    const avatar = getAvatarByNickname(nickname);
    return (
      <div 
        ref={containerRef}
        className="space-lobby-container full-screen"
      >
        <div className="space-stars"></div>
        <div className="space-nebula"></div>



        {/* Render bong bóng người chơi bay lơ lửng */}
        {bubbles.length === 0 ? (
          <div style={{ 
            position: 'absolute', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)', 
            color: 'var(--text-muted)',
            textAlign: 'center',
            zIndex: 1020
          }}>
            <div style={{ fontSize: '2.5rem', animation: 'space-twinkle 1s infinite' }}>🛸</div>
            Đang kết nối vũ trụ...
          </div>
        ) : (
          bubbles.map((b) => {
            const pAvatar = getAvatarByNickname(b.nickname);
            const pColors = getColorsByNickname(b.nickname);
            const isMe = b.nickname === nickname;
            const radius = b.size / 2;

            return (
              <div 
                key={b.nickname}
                className={`cosmic-player-bubble ${isMe ? 'cosmic-player-bubble-me' : ''}`}
                style={{
                  left: `${b.x - radius}px`,
                  top: `${b.y - radius}px`,
                  width: `${b.size}px`,
                  height: `${b.size}px`,
                  background: `linear-gradient(135deg, ${pColors.left}, ${pColors.right})`
                }}
              >
                <span className="cosmic-player-emoji">{pAvatar.emoji}</span>
                <span className="cosmic-player-name">{b.nickname} {isMe && '(Bạn)'}</span>
              </div>
            );
          })
        )}

        {/* Khối lớp phủ thông tin số lượng phi hành gia ở chân màn hình */}
        <div style={{
          position: 'absolute',
          bottom: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1050,
          color: 'rgba(255,255,255,0.65)',
          fontSize: '0.95rem',
          textShadow: '0 2px 4px rgba(0,0,0,0.8)',
          pointerEvents: 'none'
        }}>
          Hiện có <strong>{lobbyPlayers.length}</strong> phi hành gia đang lơ lửng trong vũ trụ này
        </div>
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
        <div style={{ marginBottom: '15px', fontSize: '1.1rem', color: 'var(--text-muted)' }}>
          Nickname: <strong style={{ color: 'white' }}>{nickname}</strong>
        </div>
        
        {/* Khối hiển thị câu hỏi cho người chơi */}
        {currentQuestionText && (
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '900px',
            padding: '30px 20px',
            textAlign: 'center',
            marginBottom: '20px',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '700', lineHeight: '1.4', margin: 0 }}>
              {currentQuestionText}
            </h2>
          </div>
        )}

        <div className="answers-grid" style={{ 
          height: 'auto',
          minHeight: '40vh',
          maxHeight: 'none'
        }}>
          {currentOptions.length > 0 ? (
            currentOptions.map((option, idx) => (
              <button 
                key={idx} 
                className={`answer-option ${colors[idx]}`}
                onClick={() => handleAnswerSubmit(idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  padding: '24px',
                  fontSize: '1.3rem',
                  borderRadius: '16px',
                  width: '100%',
                  minHeight: '100px'
                }}
              >
                <span className="shape-icon" style={{ flexShrink: 0 }}>{letters[idx]}</span>
                <span style={{ flex: 1, wordBreak: 'break-word', textAlign: 'left' }}>{option}</span>
              </button>
            ))
          ) : (
            // Dự phòng nếu không tải được text đáp án từ backend (hiển thị nút hình học lớn như cũ)
            Array.from({ length: optionsCount }).map((_, idx) => (
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
                  borderRadius: '20px',
                  minHeight: '180px'
                }}
              >
                <span style={{ transform: 'scale(1.5)' }}>{letters[idx]}</span>
              </button>
            ))
          )}
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
        <h2 style={{ fontSize: '2rem', fontWeight: '700' }}>Đáp án đã được gửi!</h2>
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
        <div className="glass-panel player-card" style={{
          border: isCorrect ? '2px solid var(--color-green)' : '2px solid var(--color-red)',
          boxShadow: isCorrect ? '0 0 25px var(--color-green-glow)' : '0 0 25px var(--color-red-glow)',
          alignItems: 'center',
          gap: '20px'
        }}>
          <div style={{ fontSize: '5rem' }}>{isCorrect ? '🎉' : '❌'}</div>
          
          <h2 style={{ 
            fontSize: '2.5rem', 
            fontWeight: '700',
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
              Đáp án đúng là: <strong style={{ color: 'white' }}>{currentOptions[correctAnswerIndex] ? `${letters[correctAnswerIndex]} ${currentOptions[correctAnswerIndex]}` : (colors[correctAnswerIndex] || 'Không xác định')}</strong>
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

  // 6. MÀN HÌNH BẢNG XẾP HẠNG CHI TIẾT (LEADERBOARD_WAIT)
  if (playerState === 'LEADERBOARD_WAIT') {
    return (
      <div className="glass-panel fade-in player-card" style={{ textAlign: 'center', alignItems: 'center', gap: '20px' }}>
        <h2 style={{ 
          fontSize: '2rem', 
          fontWeight: '700', 
          background: 'linear-gradient(to right, #a200ff, #ff007f)', 
          WebkitBackgroundClip: 'text', 
          WebkitTextFillColor: 'transparent',
          margin: 0
        }}>
          Bảng Xếp Hạng
        </h2>

        <div style={{
          width: '100%',
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          padding: '10px 0',
          textAlign: 'left'
        }}>
          {leaderboard.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
              Đang tải bảng xếp hạng...
            </div>
          ) : (
            leaderboard.map((item, idx) => {
              const isMe = item.nickname === nickname;
              return (
                <div 
                  key={item.nickname} 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 20px',
                    borderBottom: idx < leaderboard.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                    background: isMe 
                      ? 'rgba(104, 30, 255, 0.12)' 
                      : idx === 0 
                      ? 'rgba(255, 255, 255, 0.02)' 
                      : 'transparent',
                    borderLeft: isMe ? '4px solid var(--primary)' : 'none',
                    animation: 'fadeIn 0.4s ease'
                  }}
                >
                  <div style={{
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    width: '35px',
                    color: idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : 'var(--text-muted)'
                  }}>
                    {idx + 1}
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '600', flex: 1, color: isMe ? 'white' : 'inherit' }}>
                    {item.nickname} {isMe && <span style={{ color: 'var(--primary)', fontSize: '0.85rem' }}>(Bạn)</span>}
                    {item.streak > 1 && (
                      <span style={{
                        marginLeft: '8px',
                        background: 'linear-gradient(135deg, #ff4500, #ff8c00)',
                        color: 'white',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold'
                      }}>
                        🔥 Chuỗi {item.streak}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: isMe ? 'var(--primary)' : 'var(--text-muted)' }}>
                    {item.score} pts
                  </div>
                </div>
              );
            })
          )}
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.4', margin: '5px 0 0 0' }}>
          Đang chiếu bảng xếp hạng. Hãy chờ Host chuyển sang câu tiếp theo nhé!
        </p>
      </div>
    );
  }

  // 7. MÀN HÌNH VINH DANH CHUNG CUỘC (PODIUM)
  if (playerState === 'PODIUM') {
    return (
      <div className="glass-panel fade-in player-card" style={{
        textAlign: 'center',
        alignItems: 'center',
        gap: '24px',
        border: finalRank && finalRank <= 3 ? '2px solid #ffd700' : '1px solid var(--border-glass)',
        boxShadow: finalRank && finalRank <= 3 ? '0 0 25px rgba(255, 215, 0, 0.2)' : 'none'
      }}>
        <div style={{ fontSize: '5rem' }}>
          {finalRank === 1 ? '👑' : finalRank === 2 ? '🥈' : finalRank === 3 ? '🥉' : '👏'}
        </div>
        <h3 style={{ fontSize: '1.8rem', fontWeight: '700' }}>Trò Chơi Kết Thúc!</h3>

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
