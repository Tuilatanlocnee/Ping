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
 * Giao diện chính của Host (Người điều phối game)
 * Quản lý vòng đời hiển thị: Dashboard -> Lobby -> Question -> Result -> Leaderboard -> Podium
 */
export default function HostView({ 
  isConnected, 
  sendMessage, 
  lastMessage, 
  onBackToHome,
  onNavigate // Dùng để chuyển màn hình sang QUIZ_CREATOR hoặc HISTORY ở App.jsx
}) {
  const [pin, setPin] = useState(null);
  const [hostState, setHostState] = useState('DASHBOARD'); // DASHBOARD, LOBBY, QUESTION, RESULT, LEADERBOARD, PODIUM
  const [quizzes, setQuizzes] = useState([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [quizError, setQuizError] = useState('');
  
  const [players, setPlayers] = useState([]);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const containerRef = useRef(null);
  const [bubbles, setBubbles] = useState([]);

  // Cập nhật bubbles mỗi khi danh sách người chơi phòng chờ thay đổi
  useEffect(() => {
    setBubbles(prev => {
      const updated = [];
      const prevMap = new Map(prev.map(b => [b.nickname, b]));

      players.forEach(nick => {
        if (prevMap.has(nick)) {
          updated.push(prevMap.get(nick));
        } else {
          // Tạo hướng và tốc độ trôi nổi ngẫu nhiên chậm kiểu vũ trụ
          const angle = Math.random() * Math.PI * 2;
          const speed = 0.4 + Math.random() * 0.5;
          // Chọn vị trí xuất phát ngẫu nhiên rộng hơn trên toàn màn hình
          const startX = 100 + Math.random() * (window.innerWidth - 200 || 600);
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
  }, [players]);

  // Vòng lặp cập nhật vật lý dội tường (60fps) cho màn hình Host
  useEffect(() => {
    let animationFrameId;

    const updatePhysics = () => {
      setBubbles(prev => {
        if (!containerRef.current || prev.length === 0) return prev;
        const rect = containerRef.current.getBoundingClientRect();
        const width = rect.width || 800;
        const height = rect.height || 400;

        // 1. Cập nhật vị trí tạm thời dựa trên vận tốc và dội tường biên
        let nextBubbles = prev.map(b => {
          let newX = b.x + b.vx;
          let newY = b.y + b.vy;
          let newVx = b.vx;
          let newVy = b.vy;

          const radius = b.size / 2;

          // Va chạm dội tường trái/phải
          if (newX - radius < 0) {
            newX = radius;
            newVx = Math.abs(b.vx);
          } else if (newX + radius > width) {
            newX = width - radius;
            newVx = -Math.abs(b.vx);
          }

          // Va chạm dội tường trên/dưới
          if (newY - radius < 0) {
            newY = radius;
            newVy = Math.abs(b.vy);
          } else if (newY + radius > height) {
            newY = height - radius;
            newVy = -Math.abs(b.vy);
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
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [totalAnswers, setTotalAnswers] = useState(0);
  const [stats, setStats] = useState([]);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState(-1);
  const [leaderboard, setLeaderboard] = useState([]);
  const [podium, setPodium] = useState([]);

  // Đồng hồ đếm ngược ở Frontend
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);

  // Lấy danh sách bộ đề câu hỏi từ Backend khi ở màn hình Dashboard
  const fetchQuizzes = async () => {
    setLoadingQuizzes(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:3001`;
      const response = await fetch(`${backendUrl}/api/quizzes`);
      if (response.ok) {
        const data = await response.json();
        setQuizzes(data);
        setQuizError('');
      } else {
        setQuizError('Không thể tải danh sách bộ đề từ server.');
      }
    } catch (err) {
      console.error(err);
      setQuizError('Lỗi kết nối đến server.');
    } finally {
      setLoadingQuizzes(false);
    }
  };

  useEffect(() => {
    if (hostState === 'DASHBOARD') {
      fetchQuizzes();
    }
  }, [hostState]);

  // Xử lý tin nhắn nhận được từ server dành riêng cho Host
  useEffect(() => {
    if (!lastMessage) return;

    const { type, ...payload } = lastMessage;

    switch (type) {
      case 'ROOM_CREATED':
        setPin(payload.pin);
        setHostState('LOBBY');
        break;

      case 'PLAYER_JOINED':
        setTotalPlayers(payload.totalPlayers);
        setPlayers(payload.playerList || []);
        break;

      case 'PLAYER_LEFT':
        setTotalPlayers(payload.totalPlayers);
        setPlayers(payload.playerList || []);
        break;

      case 'GAME_STARTED':
        break;

      case 'NEW_QUESTION':
        setCurrentQuestion(payload.question);
        setQuestionIndex(payload.questionIndex);
        setTotalQuestions(payload.totalQuestions);
        setTotalAnswers(0);
        setTimeLeft(payload.question.timeLimit);
        setHostState('QUESTION');
        
        // Khởi động đồng hồ đếm ngược phía client (chỉ khi timeLimit > 0)
        if (timerRef.current) clearInterval(timerRef.current);
        if (payload.question.timeLimit > 0) {
          timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
              if (prev <= 1) {
                clearInterval(timerRef.current);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
        break;

      case 'PLAYER_ANSWERED':
        setTotalAnswers(payload.totalAnswers);
        break;

      case 'QUESTION_ENDED':
        if (timerRef.current) clearInterval(timerRef.current);
        setTimeLeft(0);
        setStats(payload.stats || []);
        setCorrectAnswerIndex(payload.correctAnswerIndex);
        setTotalAnswers(payload.totalAnswers);
        setHostState('RESULT');
        break;

      case 'LEADERBOARD':
        setLeaderboard(payload.leaderboard || []);
        setHostState('LEADERBOARD');
        break;

      case 'GAME_OVER':
        setPodium(payload.podium || []);
        setHostState('PODIUM');
        break;

      default:
        break;
    }
  }, [lastMessage]);

  // Clean up timer khi unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Tạo phòng game từ bộ câu hỏi được chọn
  const handleLaunchQuiz = (quiz) => {
    if (!isConnected) {
      alert("Chưa kết nối được WebSocket đến máy chủ!");
      return;
    }
    sendMessage({
      type: 'CREATE_ROOM',
      questions: quiz.questions,
      quizTitle: quiz.title
    });
  };

  // Xóa một bộ đề câu hỏi
  const handleDeleteQuiz = async (quizId, e) => {
    e.stopPropagation(); // Ngăn sự kiện click chọn quiz
    
    if (!confirm('Bạn có chắc chắn muốn xóa bộ đề câu hỏi này không?')) return;

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:3001`;
      const response = await fetch(`${backendUrl}/api/quizzes/${quizId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        // Cập nhật lại danh sách local
        setQuizzes(quizzes.filter(q => q.id !== quizId));
      } else {
        alert('Lỗi: Không thể xóa bộ câu hỏi.');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối đến server.');
    }
  };

  // Bắt đầu game
  const handleStartGame = () => {
    if (totalPlayers === 0) {
      alert("Cần ít nhất 1 người chơi để bắt đầu trò chơi!");
      return;
    }
    sendMessage({
      type: 'START_GAME',
      pin
    });
  };

  // Chuyển sang câu tiếp theo
  const handleNextQuestion = () => {
    sendMessage({
      type: 'NEXT_QUESTION',
      pin
    });
  };

  // Bỏ qua câu hỏi hiện tại (kết thúc sớm)
  const handleSkipQuestion = () => {
    sendMessage({
      type: 'SKIP_QUESTION',
      pin
    });
  };

  // Trình chiếu bảng xếp hạng
  const handleShowLeaderboard = () => {
    sendMessage({
      type: 'SHOW_LEADERBOARD',
      pin
    });
  };

  // Hủy phòng chơi chủ động (Lobby) và quay về Dashboard
  const handleCancelRoom = () => {
    if (confirm('Bạn có muốn hủy phòng chơi này và quay lại Dashboard?')) {
      // 1. Gửi tin nhắn lên Backend thông báo hủy phòng
      sendMessage({
        type: 'CANCEL_ROOM',
        pin
      });

      // 2. Dọn dẹp state phòng chơi ở Frontend
      setPin(null);
      setPlayers([]);
      setTotalPlayers(0);
      setCurrentQuestion(null);
      setQuestionIndex(0);
      setTotalAnswers(0);
      setStats([]);
      setCorrectAnswerIndex(-1);
      setLeaderboard([]);
      setPodium([]);

      // 3. Quay về Dashboard
      setHostState('DASHBOARD');
    }
  };

  // Render bục vinh quang (Podium)
  const renderPodium = () => {
    const p1 = podium[0] || null;
    const p2 = podium[1] || null;
    const p3 = podium[2] || null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '30px' }}>
        <h2 style={{ fontSize: '3rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '15px', margin: 0 }}>
          <span>🏆</span>
          <span style={{ 
            background: 'linear-gradient(to right, #ffd700, #ff8c00)', 
            WebkitBackgroundClip: 'text', 
            backgroundClip: 'text', 
            color: 'transparent',
            WebkitTextFillColor: 'transparent' 
          }}>
            Bảng xếp hạng
          </span>
          <span>🏆</span>
        </h2>
        
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: '20px',
          width: '100%',
          maxWidth: '600px',
          height: '350px',
          marginTop: '50px'
        }}>
          {/* Hạng 2 */}
          {p2 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{ fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '10px', textAlign: 'center' }}>
                🥈 {p2.nickname}
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{p2.score} pts</div>
              </div>
              <div style={{
                width: '100%',
                height: '140px',
                background: 'linear-gradient(180deg, #c0c0c0, #708090)',
                borderRadius: '8px 8px 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem',
                fontWeight: 'bold',
                color: 'white',
                boxShadow: '0 4px 15px rgba(192, 192, 192, 0.3)'
              }}>2</div>
            </div>
          )}

          {/* Hạng 1 */}
          {p1 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1.2 }}>
              <div style={{ fontWeight: 'bold', fontSize: '1.5rem', marginBottom: '15px', textAlign: 'center' }}>
                👑 {p1.nickname}
                <div style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>{p1.score} pts</div>
              </div>
              <div style={{
                width: '100%',
                height: '200px',
                background: 'linear-gradient(180deg, #ffd700, #b8860b)',
                borderRadius: '8px 8px 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '3.5rem',
                fontWeight: 'bold',
                color: 'white',
                boxShadow: '0 4px 25px rgba(255, 215, 0, 0.4)',
                position: 'relative'
              }}>
                1
              </div>
            </div>
          )}

          {/* Hạng 3 */}
          {p3 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '10px', textAlign: 'center' }}>
                🥉 {p3.nickname}
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{p3.score} pts</div>
              </div>
              <div style={{
                width: '100%',
                height: '100px',
                background: 'linear-gradient(180deg, #cd7f32, #8b4513)',
                borderRadius: '8px 8px 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                fontWeight: 'bold',
                color: 'white',
                boxShadow: '0 4px 15px rgba(205, 127, 50, 0.3)'
              }}>3</div>
            </div>
          )}
        </div>

        <button className="neon-btn" onClick={() => setHostState('DASHBOARD')} style={{ marginTop: '20px' }}>
          Quay Lại Dashboard
        </button>
      </div>
    );
  };

  // 1. MÀN HÌNH DASHBOARD TRUNG TÂM
  if (hostState === 'DASHBOARD') {
    return (
      <div className="fade-in" style={{ maxWidth: '800px', margin: '20px auto', width: '100%' }}>
        <div className="host-dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: '700' }}>Host Dashboard</h2>
          <div className="host-dashboard-buttons" style={{ display: 'flex', gap: '12px' }}>
            <button className="neon-btn" onClick={() => onNavigate('CREATE_QUIZ')} style={{
              background: 'linear-gradient(135deg, var(--secondary), hsl(280, 100%, 55%))',
              boxShadow: '0 0 15px rgba(162, 0, 255, 0.3)'
            }}>
              ➕ Tạo Đề Mới
            </button>
            
            <button className="neon-btn" onClick={() => onNavigate('HISTORY')} style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: 'none'
            }}>
              📅 Lịch Sử
            </button>

            <button className="neon-btn" onClick={onBackToHome} style={{
              background: 'rgba(255, 69, 0, 0.1)',
              border: '1px solid var(--color-red)',
              color: 'var(--color-red)',
              boxShadow: 'none'
            }}>
              Thoát Host
            </button>
          </div>
        </div>

        {quizError && (
          <div style={{
            background: 'rgba(255, 69, 0, 0.1)',
            border: '1px solid var(--color-red)',
            color: 'var(--color-red)',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            ⚠️ {quizError}
          </div>
        )}

        {loadingQuizzes ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2.5rem', animation: 'pulse-glow 1s infinite linear' }}>⏳</div>
            Đang tải danh sách câu hỏi...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-muted)', fontWeight: '600' }}>
              CHỌN MỘT BỘ ĐỀ ĐỂ BẮT ĐẦU CHƠI:
            </h3>

            {quizzes.map((quiz) => (
              <div 
                key={quiz.id} 
                className="glass-panel quiz-item-row" 
                onClick={() => handleLaunchQuiz(quiz)}
                style={{
                  padding: '24px 30px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  border: '1px solid var(--border-glass)'
                }}
              >
                <div>
                  <h4 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '6px' }}>
                    {quiz.title}
                  </h4>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    📝 Số câu hỏi: <strong>{quiz.questions.length} câu</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button className="neon-btn" style={{ fontSize: '0.95rem', padding: '8px 20px' }}>
                    Khởi Chạy Game 🎮
                  </button>
                  
                  <button 
                    className="neon-btn" 
                    onClick={(e) => handleDeleteQuiz(quiz.id, e)}
                    style={{
                      background: 'rgba(255, 69, 0, 0.1)',
                      border: '1px solid var(--color-red)',
                      color: 'var(--color-red)',
                      boxShadow: 'none',
                      fontSize: '0.9rem',
                      padding: '8px 16px'
                    }}
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 2. MÀN HÌNH PHÒNG CHỜ (LOBBY VŨ TRỤ TOÀN MÀN HÌNH) - TÍCH HỢP QR CODE
  if (hostState === 'LOBBY') {
    // Địa chỉ đầy đủ để người chơi di động quét và truy cập trực tiếp kèm PIN
    const joinUrl = `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}/?pin=${pin}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(joinUrl)}`;

    return (
      <div 
        ref={containerRef}
        className="space-lobby-container full-screen"
      >
        <div className="space-stars"></div>
        <div className="space-nebula"></div>

        {/* 3. CARD THÔNG TIN PHÒNG CHỜ (Mã PIN, QR Code, Số lượng người chơi) */}
        <div className="glass-panel lobby-card" style={{
          position: 'absolute',
          top: '45%',
          left: '50%',
          transform: 'translate(-50%, -50%)', // Căn giữa tuyệt đối ngang dọc
          zIndex: 1050,
          background: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '28px',
          padding: '30px 40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          width: '90%',
          maxWidth: '560px'
        }}>
          {/* Phần 1: Mã PIN (Trên cùng của card) */}
          <div className="lobby-pin" style={{
            width: '100%',
            textAlign: 'center',
            paddingBottom: '16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ fontSize: '3.6rem', fontWeight: '700', color: 'white', letterSpacing: '4px', margin: 0, lineHeight: 1.1 }}>
              PIN: <span style={{ color: '#ffd700' }}>{pin}</span>
            </div>
          </div>

          {/* Phần 2: Nội dung QR và Điều khiển (Dưới mã PIN, xếp song song) */}
          <div className="lobby-content" style={{
            display: 'flex',
            width: '100%',
            gap: '40px',
            alignItems: 'center'
          }}>
            {/* Cột trái: QR Code */}
            <div className="lobby-qr" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              flex: '1'
            }}>
              <div style={{
                background: 'white',
                padding: '10px',
                borderRadius: '12px',
                boxShadow: '0 0 15px rgba(255, 255, 255, 0.1)'
              }}>
                <img 
                  src={qrUrl} 
                  alt="QR Code phòng chơi" 
                  style={{ width: '130px', height: '130px', display: 'block' }}
                  loading="lazy"
                />
              </div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' }}>
                📸 Quét để vào nhanh!
              </div>
            </div>

            {/* Đường ngăn cách dọc tinh tế */}
            <div className="lobby-divider" style={{ width: '1px', height: '140px', background: 'rgba(255, 255, 255, 0.1)' }}></div>

            {/* Cột phải: Thông số người chơi & Cụm nút bấm */}
            <div className="lobby-controls" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              flex: '1.2'
            }}>
              <div className="lobby-controls-stats" style={{ textAlign: 'center' }}>
                <div className="lobby-controls-stats-label" style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  <span className="desktop-text">Người chơi tham gia:</span>
                  <span className="mobile-text">Người chơi:</span>
                </div>
                <div className="lobby-controls-stats-value" style={{ fontSize: '2.8rem', fontWeight: '700', color: 'var(--primary)', margin: '4px 0 0 0', lineHeight: 1 }}>
                  {totalPlayers}
                </div>
              </div>

              <div className="lobby-buttons" style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                <button 
                  className="neon-btn" 
                  onClick={handleStartGame}
                  disabled={totalPlayers === 0}
                  style={{ 
                    width: '100%',
                    opacity: totalPlayers === 0 ? 0.6 : 1,
                    cursor: totalPlayers === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    padding: '10px 14px'
                  }}
                >
                  <span className="desktop-text">Bắt đầu trò chơi</span>
                  <span className="mobile-text">Bắt đầu</span>
                </button>
                
                <button 
                  className="neon-btn" 
                  onClick={handleCancelRoom}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.2)',
                    boxShadow: 'none',
                    fontSize: '0.9rem',
                    padding: '8px 14px'
                  }}
                >
                  Hủy Phòng
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 4. RENDER BONG BÓNG NGƯỜI CHƠI TRÔI NỔI */}
        {totalPlayers === 0 ? (
          <div style={{ 
            position: 'absolute', 
            top: '55%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)', 
            color: 'var(--text-muted)',
            textAlign: 'center',
            zIndex: 1020
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '10px', animation: 'space-twinkle 1s infinite' }}>⏳</div>
            Đang chờ mọi người tham gia phòng...
          </div>
        ) : (
          bubbles.map((b) => {
            const pAvatar = getAvatarByNickname(b.nickname);
            const pColors = getColorsByNickname(b.nickname);
            const radius = b.size / 2;

            return (
              <div 
                key={b.nickname}
                className="cosmic-player-bubble"
                style={{
                  left: `${b.x - radius}px`,
                  top: `${b.y - radius}px`,
                  width: `${b.size}px`,
                  height: `${b.size}px`,
                  background: `linear-gradient(135deg, ${pColors.left}, ${pColors.right})`
                }}
              >
                <span className="cosmic-player-emoji">{pAvatar.emoji}</span>
                <span className="cosmic-player-name">{b.nickname}</span>
              </div>
            );
          })
        )}
      </div>
    );
  }

  // 3. MÀN HÌNH HIỂN THỊ CÂU HỎI (QUESTION)
  if (hostState === 'QUESTION' && currentQuestion) {
    const letters = ['▲', '◆', '●', '■'];
    const colors = ['red', 'blue', 'yellow', 'green'];

    return (
      <div className="fade-in host-game-layout">
        <div className="host-header-bar">
          <div style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>
            Câu hỏi: <span style={{ color: 'white', fontWeight: 'bold' }}>{questionIndex + 1}/{totalQuestions}</span>
          </div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '6px 16px',
            borderRadius: '20px',
            fontSize: '0.95rem'
          }}>
            PIN: <strong>{pin}</strong>
          </div>
          <button className="neon-btn" onClick={handleSkipQuestion} style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'none',
            padding: '6px 16px',
            fontSize: '0.9rem'
          }}>
            Bỏ Qua
          </button>
        </div>

        <div className="glass-panel host-question-card">
          <h2 className="host-question-title">{currentQuestion.questionText}</h2>
        </div>

        <div className="host-status-row">
          <div className="host-status-box">
            <div className="host-status-label">Thời gian còn lại</div>
            <div className={`host-status-value ${timeLeft <= 5 && timeLeft > 0 ? 'warning' : ''}`}>
              {currentQuestion.timeLimit === 0 ? '∞' : timeLeft}
            </div>
          </div>

          <div className="host-status-box">
            <div className="host-status-label">Câu trả lời nhận được</div>
            <div className="host-status-value primary">
              {totalAnswers}<span style={{ fontSize: '1.2rem', color: 'var(--text-muted)', fontWeight: '400' }}>/{totalPlayers}</span>
            </div>
          </div>
        </div>

        <div className="answers-grid host-answers-grid">
          {currentQuestion.options.map((option, idx) => (
            <div key={idx} className={`answer-option host-answer-option ${colors[idx]}`} style={{ cursor: 'default' }}>
              <span className="shape-icon">{letters[idx]}</span>
              <span style={{ flex: 1, wordBreak: 'break-word', textAlign: 'left' }}>{option}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 4. MÀN HÌNH THỐNG KÊ KẾT QUẢ CÂU HỎI (RESULT)
  if (hostState === 'RESULT' && currentQuestion) {
    const letters = ['▲', '◆', '●', '■'];
    const colors = ['red', 'blue', 'yellow', 'green'];
    const maxAnswers = Math.max(...stats, 1);

    return (
      <div className="fade-in host-game-layout">
        <div className="host-header-bar">
          <div style={{ fontSize: '1.4rem', fontWeight: '700' }}>Kết Quả Câu Hỏi</div>
          <button className="neon-btn" onClick={handleShowLeaderboard} style={{ padding: '8px 20px', fontSize: '0.95rem' }}>
            Xem Bảng Xếp Hạng
          </button>
        </div>

        <div className="glass-panel host-question-card" style={{ padding: '16px 20px' }}>
          <h2 style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Câu hỏi:</h2>
          <h3 className="host-question-title" style={{ fontSize: '1.5rem' }}>{currentQuestion.questionText}</h3>
        </div>

        <div className="glass-panel host-chart-container">
          {stats.map((count, idx) => {
            const heightPercentage = (count / maxAnswers) * 80;
            const isCorrect = idx === correctAnswerIndex;
            return (
              <div key={idx} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '15%',
                height: '100%',
                justifyContent: 'flex-end'
              }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '6px' }}>{count}</div>
                <div className={`answer-option ${colors[idx]}`} style={{
                  width: '100%',
                  height: `${Math.max(10, heightPercentage)}%`,
                  padding: '5px',
                  justifyContent: 'center',
                  borderRadius: '8px 8px 0 0',
                  boxShadow: isCorrect ? '0 0 20px rgba(255,255,255,0.4)' : 'none',
                  border: isCorrect ? '3px solid white' : 'none'
                }}>
                  <span style={{ fontSize: '1.1rem' }}>{letters[idx]}</span>
                </div>
                <div style={{ 
                  marginTop: '6px', 
                  fontSize: '0.9rem',
                  fontWeight: isCorrect ? 'bold' : 'normal',
                  color: isCorrect ? 'white' : 'var(--text-muted)'
                }}>
                  {isCorrect ? '✅ Đúng' : ''}
                </div>
              </div>
            );
          })}
        </div>

        <div className="answers-grid host-answers-grid">
          {currentQuestion.options.map((option, idx) => {
            const isCorrect = idx === correctAnswerIndex;
            return (
              <div 
                key={idx} 
                className={`answer-option host-answer-option ${colors[idx]}`} 
                style={{ 
                  cursor: 'default',
                  opacity: isCorrect ? 1 : 0.4,
                  transform: isCorrect ? 'scale(1.02)' : 'none',
                  border: isCorrect ? '3px solid white' : 'none',
                  boxShadow: isCorrect ? '0 0 20px rgba(255,255,255,0.2)' : 'none'
                }}
              >
                <span className="shape-icon">{letters[idx]}</span>
                <span style={{ flex: 1, wordBreak: 'break-word', textAlign: 'left' }}>{option}</span>
                {isCorrect && <span style={{ marginLeft: 'auto', fontSize: '1.3rem' }}>✓</span>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 5. MÀN HÌNH BẢNG XẾP HẠNG TẠM THỜI (LEADERBOARD)
  if (hostState === 'LEADERBOARD') {
    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '30px', padding: '20px' }}>
        <h2 style={{ fontSize: '3rem', fontWeight: '700', background: 'linear-gradient(to right, #a200ff, #ff007f)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Bảng Xếp Hạng
        </h2>

        <div className="glass-panel" style={{
          width: '100%',
          maxWidth: '700px',
          padding: '20px 0'
        }}>
          {leaderboard.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Chưa có điểm số nào được ghi nhận.</div>
          ) : (
            leaderboard.map((item, idx) => (
              <div 
                key={item.nickname} 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '16px 30px',
                  borderBottom: idx < leaderboard.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                  background: idx === 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                  animation: 'fadeIn 0.4s ease'
                }}
              >
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  width: '40px',
                  color: idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : 'var(--text-muted)'
                }}>
                  {idx + 1}
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: '600', flex: 1 }}>
                  {item.nickname}
                  {item.streak > 1 && (
                    <span style={{
                      marginLeft: '10px',
                      background: 'linear-gradient(135deg, #ff4500, #ff8c00)',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold'
                    }}>
                      🔥 Chuỗi {item.streak}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                  {item.score} pts
                </div>
              </div>
            ))
          )}
        </div>

        <button className="neon-btn" onClick={handleNextQuestion}>
          {questionIndex + 1 >= totalQuestions ? 'Xem Podium Chung Cuộc' : 'Câu Hỏi Tiếp Theo'}
        </button>
      </div>
    );
  }

  // 6. MÀN HÌNH PODIUM CHUNG CUỘC (PODIUM)
  if (hostState === 'PODIUM') {
    return renderPodium();
  }

  return null;
}
