const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
require('dotenv').config();

const gameManager = require('./gameManager');
const db = require('./db'); // Import cơ sở dữ liệu JSON

const app = express();
app.use(cors());
app.use(express.json());

// API health check đơn giản
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

// --- REST API CHO BỘ CÂU HỎI (QUIZZES) ---

// Lấy danh sách toàn bộ bộ câu hỏi
app.get('/api/quizzes', (req, res) => {
  try {
    res.status(200).json(db.getQuizzes());
  } catch (err) {
    res.status(500).json({ error: 'Không thể lấy danh sách bộ câu hỏi.' });
  }
});

// Lấy chi tiết bộ câu hỏi theo ID
app.get('/api/quizzes/:id', (req, res) => {
  try {
    const quiz = db.getQuizById(req.params.id);
    if (quiz) {
      res.status(200).json(quiz);
    } else {
      res.status(404).json({ error: 'Không tìm thấy bộ câu hỏi.' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Lỗi lấy chi tiết bộ câu hỏi.' });
  }
});

// Tạo mới một bộ câu hỏi
app.post('/api/quizzes', (req, res) => {
  try {
    const { title, questions } = req.body;
    if (!title || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'Dữ liệu không hợp lệ. Cần có tiêu đề và mảng câu hỏi.' });
    }
    const quiz = db.saveQuiz({ title, questions });
    res.status(201).json(quiz);
  } catch (err) {
    res.status(500).json({ error: 'Không thể lưu bộ câu hỏi mới.' });
  }
});

// Xóa một bộ câu hỏi
app.delete('/api/quizzes/:id', (req, res) => {
  try {
    const success = db.deleteQuiz(req.params.id);
    if (success) {
      res.status(200).json({ message: 'Đã xóa bộ câu hỏi thành công.' });
    } else {
      res.status(404).json({ error: 'Không tìm thấy bộ câu hỏi hoặc bộ đề mặc định.' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Lỗi xử lý xóa bộ câu hỏi.' });
  }
});

// --- REST API CHO LỊCH SỬ TRÒ CHƠI (HISTORY) ---

// Lấy danh sách lịch sử trận đấu đã chơi
app.get('/api/history', (req, res) => {
  try {
    res.status(200).json(db.getHistory());
  } catch (err) {
    res.status(500).json({ error: 'Không thể lấy lịch sử trận đấu.' });
  }
});

// Khởi tạo HTTP Server
const server = http.createServer(app);

// Khởi tạo WebSocket Server gắn vào HTTP Server
const wss = new WebSocket.Server({ server });

/**
 * Hàm gửi tin nhắn dạng JSON an toàn cho Client
 * @param {WebSocket} socket 
 * @param {Object} data 
 */
function sendJSON(socket, data) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(data));
  }
}

/**
 * Broadcast tin nhắn tới tất cả người chơi trong phòng chơi
 * @param {Object} room 
 * @param {Object} data 
 */
function broadcastToPlayers(room, data) {
  const payload = JSON.stringify(data);
  room.players.forEach(player => {
    if (player.socket && player.socket.readyState === WebSocket.OPEN) {
      player.socket.send(payload);
    }
  });
}

// Thiết lập thuộc tính isAlive để quản lý Heartbeat
wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.roomPin = null;
  ws.nickname = null;
  ws.isHost = false;

  // Lắng nghe sự kiện pong từ client để xác nhận kết nối còn sống
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // Lắng nghe tin nhắn gửi từ client
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const { type } = data;

      switch (type) {
        // --- HOST ACTIONS ---

        case 'CREATE_ROOM': {
          const { questions, quizTitle } = data;
          
          // Tối ưu: Nếu Host này đang giữ một phòng khác, dọn dẹp phòng cũ trước khi tạo phòng mới
          if (ws.roomPin) {
            gameManager.deleteRoom(ws.roomPin);
            console.log(`[Host] Tự động hủy phòng cũ ${ws.roomPin} trước khi tạo phòng mới.`);
          }

          const pin = gameManager.createRoom(ws, questions, quizTitle);
          ws.roomPin = pin;
          ws.isHost = true;
          
          sendJSON(ws, { type: 'ROOM_CREATED', pin });
          console.log(`[Host] Phòng chơi mới được tạo: ${pin} (Đề: ${quizTitle})`);
          break;
        }

        case 'CANCEL_ROOM': {
          const { pin } = data;
          const room = gameManager.getRoom(pin);
          if (room && room.hostSocket === ws) {
            // Xóa phòng chơi trên hệ thống và ngắt kết nối players
            gameManager.deleteRoom(pin);
            ws.roomPin = null;
            console.log(`[Host] Host chủ động hủy phòng chơi: ${pin}`);
          }
          break;
        }

        case 'START_GAME': {
          const { pin } = data;
          const room = gameManager.getRoom(pin);
          if (room && room.hostSocket === ws) {
            const success = gameManager.startGame(pin);
            if (success) {
              // Báo cho Host biết game đã bắt đầu
              sendJSON(ws, { type: 'GAME_STARTED' });
              
              // Báo cho toàn bộ Player game đã bắt đầu
              broadcastToPlayers(room, { type: 'GAME_STARTED' });
              
              // Tự động phát câu hỏi đầu tiên
              sendQuestion(room, 0);
            }
          }
          break;
        }

        case 'NEXT_QUESTION': {
          const { pin } = data;
          const room = gameManager.getRoom(pin);
          if (room && room.hostSocket === ws) {
            // Xóa timer hiện tại nếu có
            if (room.questionTimer) {
              clearTimeout(room.questionTimer);
            }

            const nextData = gameManager.nextQuestion(pin);
            if (nextData) {
              if (nextData.isFinished) {
                // Game Over - hiển thị Podium
                const podium = gameManager.getPodium(room);
                sendJSON(ws, { type: 'GAME_OVER', podium });
                broadcastToPlayers(room, { type: 'GAME_OVER', podium });
                room.gameState = 'PODIUM';

                // --- TỰ ĐỘNG GHI LỊCH SỬ TRẬN ĐẤU VÀO DATABASE FILE JSON ---
                try {
                  db.saveHistoryEntry({
                    pin: room.pin,
                    quizTitle: room.quizTitle,
                    totalPlayers: room.players.size,
                    podium: podium
                  });
                  console.log(`[Database] Đã lưu lịch sử trận đấu cho phòng PIN: ${room.pin}`);
                } catch (e) {
                  console.error('Lỗi khi ghi lịch sử trận đấu:', e);
                }
              } else {
                sendQuestion(room, nextData.questionIndex);
              }
            }
          }
          break;
        }

        case 'SKIP_QUESTION': {
          // Bỏ qua câu hỏi hiện tại, kết thúc thời gian đếm ngược ngay lập tức
          const { pin } = data;
          const room = gameManager.getRoom(pin);
          if (room && room.hostSocket === ws && room.gameState === 'QUESTION') {
            endQuestion(room);
          }
          break;
        }

        case 'SHOW_LEADERBOARD': {
          const { pin } = data;
          const room = gameManager.getRoom(pin);
          if (room && room.hostSocket === ws) {
            room.gameState = 'LEADERBOARD';
            const leaderboard = gameManager.getLeaderboard(room);
            
            // Gửi BXH cho Host
            sendJSON(ws, { type: 'LEADERBOARD', leaderboard });
            
            // Gửi thông báo cho Players để chuẩn bị cho câu hỏi tiếp theo kèm BXH
            broadcastToPlayers(room, { type: 'LEADERBOARD_SHOWN', leaderboard });
          }
          break;
        }

        case 'CHECK_ROOM': {
          const { pin } = data;
          const room = gameManager.getRoom(pin);
          if (!room) {
            sendJSON(ws, { type: 'CHECK_ROOM_RESULT', success: false, error: 'Không tìm thấy phòng chơi với mã PIN này.' });
          } else if (room.gameState !== 'LOBBY') {
            sendJSON(ws, { type: 'CHECK_ROOM_RESULT', success: false, error: 'Phòng chơi đã bắt đầu hoặc đã kết thúc.' });
          } else {
            sendJSON(ws, { type: 'CHECK_ROOM_RESULT', success: true, pin });
          }
          break;
        }

        // --- PLAYER ACTIONS ---

        case 'JOIN_ROOM': {
          const { pin, nickname } = data;
          const joinResult = gameManager.joinRoom(pin, nickname, ws);
          
          if (!joinResult.success) {
            sendJSON(ws, { type: 'JOIN_FAILED', error: joinResult.error });
          } else {
            const cleanNick = joinResult.cleanNickname;
            ws.roomPin = pin;
            ws.nickname = cleanNick;
            ws.isHost = false;

            const room = gameManager.getRoom(pin);
            
            // Phản hồi cho Player tham gia thành công kèm danh sách người chơi hiện tại
            sendJSON(ws, { 
              type: 'JOIN_SUCCESS', 
              pin, 
              nickname: cleanNick,
              playerList: Array.from(room.players.keys())
            });
            
            // Gửi thông báo cho Host để cập nhật danh sách lobby
            if (room.hostSocket && room.hostSocket.readyState === WebSocket.OPEN) {
              sendJSON(room.hostSocket, {
                type: 'PLAYER_JOINED',
                nickname: cleanNick,
                totalPlayers: room.players.size,
                playerList: Array.from(room.players.keys())
              });
            }

            // Gửi danh sách người chơi cập nhật cho tất cả người chơi trong phòng chờ
            broadcastToPlayers(room, {
              type: 'LOBBY_PLAYERS_UPDATED',
              playerList: Array.from(room.players.keys())
            });

            console.log(`[Player] ${cleanNick} tham gia phòng ${pin}`);
          }
          break;
        }

        case 'SUBMIT_ANSWER': {
          const { pin, nickname, answerIndex } = data;
          const room = gameManager.getRoom(pin);
          if (room && room.gameState === 'QUESTION') {
            const result = gameManager.submitAnswer(pin, nickname, answerIndex);
            if (result && !result.error) {
              // Báo cho Player đã nhận được câu trả lời
              sendJSON(ws, { type: 'ANSWER_SUBMITTED', points: result.points });

              // Báo cho Host biết tổng số người đã trả lời để hiển thị số lượng realtime
              sendJSON(room.hostSocket, {
                type: 'PLAYER_ANSWERED',
                totalAnswers: room.answersReceived.size
              });
            } else if (result && result.error) {
              sendJSON(ws, { type: 'ERROR', message: result.error });
            }
          }
          break;
        }

        default:
          console.warn(`Loại tin nhắn không hợp lệ: ${type}`);
      }
    } catch (err) {
      console.error('Lỗi phân tích tin nhắn WebSocket:', err);
      sendJSON(ws, { type: 'ERROR', message: 'Dữ liệu gửi lên không đúng định dạng.' });
    }
  });

  // Xử lý ngắt kết nối
  ws.on('close', () => {
    ws.isAlive = false;
    
    if (ws.isHost && ws.roomPin) {
      console.log(`[Host] Host đã thoát. Đóng phòng: ${ws.roomPin}`);
      gameManager.deleteRoom(ws.roomPin);
    } else if (ws.roomPin && ws.nickname) {
      console.log(`[Player] ${ws.nickname} thoát phòng: ${ws.roomPin}`);
      gameManager.leaveRoom(ws.roomPin, ws.nickname);
      
      const room = gameManager.getRoom(ws.roomPin);
      if (room) {
        if (room.hostSocket && room.hostSocket.readyState === WebSocket.OPEN) {
          sendJSON(room.hostSocket, {
            type: 'PLAYER_LEFT',
            nickname: ws.nickname,
            totalPlayers: room.players.size,
            playerList: Array.from(room.players.keys())
          });
        }

        // Gửi danh sách người chơi cập nhật cho tất cả người chơi còn lại trong phòng chờ
        broadcastToPlayers(room, {
          type: 'LOBBY_PLAYERS_UPDATED',
          playerList: Array.from(room.players.keys())
        });
      }
    }
  });
});

/**
 * Gửi thông tin câu hỏi hiện tại cho cả Host và Player
 * @param {Object} room 
 * @param {number} questionIndex 
 */
function sendQuestion(room, questionIndex) {
  const question = room.questions[questionIndex];
  const durationMs = question.timeLimit * 1000;
  
  if (question.timeLimit > 0) {
    room.questionEndTime = Date.now() + durationMs;
  } else {
    room.questionEndTime = null;
  }

  // Host nhận toàn bộ thông tin câu hỏi (cả đáp án đúng và các options)
  sendJSON(room.hostSocket, {
    type: 'NEW_QUESTION',
    questionIndex,
    question: {
      questionText: question.questionText,
      options: question.options,
      timeLimit: question.timeLimit,
      points: question.points,
      correctAnswerIndex: question.correctAnswerIndex
    },
    totalQuestions: room.questions.length
  });

  // Player nhận thêm nội dung câu hỏi và đáp án để hỗ trợ chơi từ xa (online)
  const playerPayload = {
    type: 'NEW_QUESTION',
    questionIndex,
    optionsCount: question.options.length,
    timeLimit: question.timeLimit,
    questionText: question.questionText,
    options: question.options
  };

  broadcastToPlayers(room, playerPayload);

  // Thiết lập timer đếm ngược tự động kết thúc câu hỏi (chỉ khi timeLimit > 0)
  if (question.timeLimit > 0) {
    room.questionTimer = setTimeout(() => {
      endQuestion(room);
    }, durationMs);
  } else {
    room.questionTimer = null;
  }
}/**
 * Kết thúc câu hỏi hiện tại, thống kê kết quả và gửi cho Host & Player
 * @param {Object} room 
 */
function endQuestion(room) {
  if (room.questionTimer) {
    clearTimeout(room.questionTimer);
    room.questionTimer = null;
  }

  // Chuyển trạng thái game
  room.gameState = 'QUESTION_RESULT';

  const currentQuestion = room.questions[room.currentQuestionIndex];
  const stats = gameManager.getAnswerStatistics(room);

  // Gửi thống kê chi tiết cho Host
  sendJSON(room.hostSocket, {
    type: 'QUESTION_ENDED',
    stats,
    correctAnswerIndex: currentQuestion.correctAnswerIndex,
    totalAnswers: room.answersReceived.size
  });

  // Gửi kết quả cho từng Player dựa vào câu trả lời của họ
  room.players.forEach((playerData, nickname) => {
    const answer = room.answersReceived.get(nickname);
    const isCorrect = answer ? answer.isCorrect : false;
    const pointsGained = answer ? answer.points : 0;

    sendJSON(playerData.socket, {
      type: 'QUESTION_ENDED',
      isCorrect,
      pointsGained,
      totalScore: playerData.score,
      streak: playerData.streak,
      correctAnswerIndex: currentQuestion.correctAnswerIndex
    });
  });
}

// Thiết lập chu kỳ kiểm tra Heartbeat (Ping/Pong) mỗi 30 giây
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log('Phát hiện kết nối chết, tiến hành terminate socket.');
      return ws.terminate();
    }
    
    ws.isAlive = false;
    ws.ping(); // gửi frame ping, client sẽ tự động gửi lại pong
  });
}, 30000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

// Khởi chạy server trên cổng cấu hình
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`WebSocket + HTTP Server đang chạy trên cổng ${PORT}`);
});
