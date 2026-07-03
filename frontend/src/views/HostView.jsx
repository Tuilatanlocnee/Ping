import React, { useState, useEffect, useRef } from 'react';

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
        
        // Khởi động đồng hồ đếm ngược phía client
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              clearInterval(timerRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
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
        <h2 style={{ fontSize: '3rem', fontWeight: '800', background: 'linear-gradient(to right, #ffd700, #ff8c00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          🏆 Bảng Vinh Danh 🏆
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: '800' }}>Host Dashboard</h2>
          <div style={{ display: 'flex', gap: '12px' }}>
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
                className="glass-panel" 
                onClick={() => handleLaunchQuiz(quiz)}
                style={{
                  padding: '24px 30px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.06)'
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

  // 2. MÀN HÌNH PHÒNG CHỜ (LOBBY) - TÍCH HỢP QR CODE
  if (hostState === 'LOBBY') {
    // Địa chỉ đầy đủ để người chơi di động quét và truy cập trực tiếp kèm PIN
    const joinUrl = `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}/?pin=${pin}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(joinUrl)}`;

    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '30px', padding: '20px' }}>
        
        {/* Khối hiển thị mã PIN và mã QR song song bằng flexbox */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '30px',
          justifyContent: 'center',
          alignItems: 'stretch',
          width: '100%',
          maxWidth: '850px'
        }}>
          {/* Cột mã PIN */}
          <div className="glass-panel pulse-glow" style={{
            padding: '30px 50px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            flex: '1 1 350px',
            background: 'linear-gradient(135deg, var(--bg-card), rgba(255, 255, 255, 0.01))'
          }}>
            <div style={{ fontSize: '1.2rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '10px' }}>
              Mã PIN phòng chơi
            </div>
            <div style={{ fontSize: '5.5rem', fontWeight: '800', color: 'white', letterSpacing: '4px', lineHeight: '1.1' }}>
              {pin}
            </div>
          </div>

          {/* Cột mã QR Code quét tham gia nhanh */}
          <div className="glass-panel" style={{
            padding: '24px 30px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            flex: '0 1 260px',
            background: 'rgba(255, 255, 255, 0.02)'
          }}>
            <div style={{
              background: 'white',
              padding: '10px',
              borderRadius: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(255, 255, 255, 0.1)'
            }}>
              <img 
                src={qrUrl} 
                alt="QR Code phòng chơi" 
                style={{ width: '150px', height: '150px', display: 'block' }}
                loading="lazy"
              />
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '500' }}>
              📸 Quét mã để vào game nhanh!
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '850px', alignItems: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>
            👥 Người chơi tham gia: <span style={{ color: 'var(--primary)', fontSize: '2rem', fontWeight: '800' }}>{totalPlayers}</span>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="neon-btn" 
              onClick={handleStartGame}
              disabled={totalPlayers === 0}
              style={{ 
                opacity: totalPlayers === 0 ? 0.6 : 1,
                cursor: totalPlayers === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              Bắt đầu trò chơi
            </button>
            <button 
              className="neon-btn" 
              onClick={handleCancelRoom}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: 'none'
              }}
            >
              Hủy Phòng
            </button>
          </div>
        </div>

        <div className="glass-panel" style={{
          width: '100%',
          maxWidth: '850px',
          padding: '30px',
          minHeight: '200px'
        }}>
          {totalPlayers === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '50px 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>⏳</div>
              Đang chờ mọi người tham gia phòng...
            </div>
          ) : (
            <div className="lobby-players-grid">
              {players.map((nick) => (
                <div key={nick} className="lobby-player-tag">
                  {nick}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. MÀN HÌNH HIỂN THỊ CÂU HỎI (QUESTION)
  if (hostState === 'QUESTION' && currentQuestion) {
    const letters = ['▲', '◆', '●', '■'];
    const colors = ['red', 'blue', 'yellow', 'green'];

    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '30px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '900px', alignItems: 'center' }}>
          <div style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>
            Câu hỏi: <span style={{ color: 'white', fontWeight: 'bold' }}>{questionIndex + 1}/{totalQuestions}</span>
          </div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '8px 20px',
            borderRadius: '20px',
            fontSize: '1rem'
          }}>
            PIN: <strong>{pin}</strong>
          </div>
          <button className="neon-btn" onClick={handleSkipQuestion} style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'none'
          }}>
            Bỏ Qua
          </button>
        </div>

        <div className="glass-panel" style={{
          width: '100%',
          maxWidth: '900px',
          padding: '40px 30px',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '2.2rem', fontWeight: '700', lineHeight: '1.4' }}>{currentQuestion.questionText}</h2>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          width: '100%',
          maxWidth: '900px',
          margin: '20px 0'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Thời gian còn lại</div>
            <div style={{
              fontSize: '4rem',
              fontWeight: '800',
              color: timeLeft <= 5 ? 'var(--color-red)' : 'white',
              transition: 'var(--transition-fast)'
            }}>{timeLeft}</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Câu trả lời nhận được</div>
            <div style={{ fontSize: '4rem', fontWeight: '800', color: 'var(--primary)' }}>
              {totalAnswers}<span style={{ fontSize: '1.5rem', color: 'var(--text-muted)', fontWeight: '400' }}>/{totalPlayers}</span>
            </div>
          </div>
        </div>

        <div className="answers-grid">
          {currentQuestion.options.map((option, idx) => (
            <div key={idx} className={`answer-option ${colors[idx]}`} style={{ cursor: 'default' }}>
              <span className="shape-icon">{letters[idx]}</span>
              {option}
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
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '30px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '900px', alignItems: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>Kết Quả Câu Hỏi</div>
          <button className="neon-btn" onClick={handleShowLeaderboard}>
            Xem Bảng Xếp Hạng
          </button>
        </div>

        <div className="glass-panel" style={{
          width: '100%',
          maxWidth: '900px',
          padding: '30px 20px',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '1.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>Câu hỏi:</h2>
          <h3 style={{ fontSize: '2rem', fontWeight: '600' }}>{currentQuestion.questionText}</h3>
        </div>

        <div className="glass-panel" style={{
          width: '100%',
          maxWidth: '900px',
          height: '300px',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-around',
          padding: '40px 20px 20px 20px',
          position: 'relative'
        }}>
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
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '8px' }}>{count}</div>
                <div className={`answer-option ${colors[idx]}`} style={{
                  width: '100%',
                  height: `${Math.max(10, heightPercentage)}%`,
                  padding: '5px',
                  justifyContent: 'center',
                  borderRadius: '8px 8px 0 0',
                  boxShadow: isCorrect ? '0 0 20px rgba(255,255,255,0.4)' : 'none',
                  border: isCorrect ? '3px solid white' : 'none'
                }}>
                  <span style={{ fontSize: '1.2rem' }}>{letters[idx]}</span>
                </div>
                <div style={{ 
                  marginTop: '10px', 
                  fontSize: '1rem',
                  fontWeight: isCorrect ? 'bold' : 'normal',
                  color: isCorrect ? 'white' : 'var(--text-muted)'
                }}>
                  {isCorrect ? '✅ Đúng' : ''}
                </div>
              </div>
            );
          })}
        </div>

        <div className="answers-grid">
          {currentQuestion.options.map((option, idx) => {
            const isCorrect = idx === correctAnswerIndex;
            return (
              <div 
                key={idx} 
                className={`answer-option ${colors[idx]}`} 
                style={{ 
                  cursor: 'default',
                  opacity: isCorrect ? 1 : 0.4,
                  transform: isCorrect ? 'scale(1.02)' : 'none',
                  border: isCorrect ? '3px solid white' : 'none',
                  boxShadow: isCorrect ? '0 0 20px rgba(255,255,255,0.2)' : 'none'
                }}
              >
                <span className="shape-icon">{letters[idx]}</span>
                {option}
                {isCorrect && <span style={{ marginLeft: 'auto', fontSize: '1.5rem' }}>✓</span>}
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
        <h2 style={{ fontSize: '3rem', fontWeight: '800', background: 'linear-gradient(to right, #a200ff, #ff007f)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
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
