/**
 * GameManager quản lý toàn bộ các phòng game (Rooms) trong bộ nhớ RAM.
 * Sử dụng cấu trúc dữ liệu Map để đạt tốc độ truy xuất O(1), đáp ứng số lượng người chơi cực lớn.
 */
class GameManager {
  constructor() {
    // Quản lý các phòng chơi: pin (string) -> Room Object
    this.rooms = new Map();
  }

  /**
   * Tạo một phòng chơi mới với mã PIN ngẫu nhiên 6 chữ số
   * @param {WebSocket} hostSocket - Kết nối WebSocket của Host
   * @param {Array} questions - Danh sách câu hỏi của game
   * @param {string} quizTitle - Tên bộ đề câu hỏi
   * @returns {string} Mã PIN của phòng chơi vừa tạo
   */
  createRoom(hostSocket, questions = [], quizTitle = 'Bộ đề không tên') {
    let pin;
    // Đảm bảo mã PIN là duy nhất
    do {
      pin = Math.floor(100000 + Math.random() * 900000).toString();
    } while (this.rooms.has(pin));

    const room = {
      pin,
      hostSocket,
      quizTitle, // Lưu trữ tên bộ đề câu hỏi để ghi lịch sử khi kết thúc
      gameState: 'LOBBY', // LOBBY, QUESTION, LEADERBOARD, PODIUM
      questions,
      currentQuestionIndex: -1,
      questionTimer: null,
      questionEndTime: 0,
      players: new Map(), // nickname (string) -> { socket, score: number, streak: number, lastCorrect: boolean }
      answersReceived: new Map(), // nickname (string) -> { answerIndex: number, timeTaken: number, points: number }
    };

    this.rooms.set(pin, room);
    return pin;
  }

  /**
   * Lấy thông tin phòng chơi theo PIN
   * @param {string} pin 
   * @returns {Object|null}
   */
  getRoom(pin) {
    return this.rooms.get(pin) || null;
  }

  /**
   * Xóa phòng chơi (khi Host disconnect hoặc game kết thúc)
   * @param {string} pin 
   */
  deleteRoom(pin) {
    const room = this.rooms.get(pin);
    if (room) {
      // Ngắt kết nối toàn bộ người chơi trong phòng
      room.players.forEach(player => {
        if (player.socket && player.socket.readyState === 1) { // OPEN
          player.socket.send(JSON.stringify({ type: 'ROOM_CLOSED', message: 'Phòng chơi đã bị đóng bởi Host.' }));
          player.socket.close();
        }
      });
      // Xóa timer nếu có
      if (room.questionTimer) {
        clearTimeout(room.questionTimer);
      }
      this.rooms.delete(pin);
    }
  }

  /**
   * Người chơi tham gia vào phòng chơi
   * @param {string} pin - Mã PIN phòng
   * @param {string} nickname - Tên người chơi
   * @param {WebSocket} playerSocket - Socket kết nối của người chơi
   * @returns {Object} { success: boolean, error?: string }
   */
  joinRoom(pin, nickname, playerSocket) {
    const room = this.rooms.get(pin);
    if (!room) {
      return { success: false, error: 'Không tìm thấy phòng chơi với mã PIN này.' };
    }
    if (room.gameState !== 'LOBBY') {
      return { success: false, error: 'Phòng chơi đã bắt đầu hoặc đã kết thúc.' };
    }

    // Làm sạch nickname để tránh ký tự đặc biệt gây lỗi UI
    const cleanNickname = nickname.trim();
    if (!cleanNickname) {
      return { success: false, error: 'Nickname không được để trống.' };
    }

    if (room.players.has(cleanNickname)) {
      const existingPlayer = room.players.get(cleanNickname);
      // Nếu cùng một kết nối socket gửi lại (tránh lỗi kích hoạt đúp trên di động)
      if (existingPlayer.socket === playerSocket) {
        console.log(`[Player] ${cleanNickname} gửi lại yêu cầu join trùng socket cũ -> Tự động chấp nhận.`);
        return { success: true, cleanNickname };
      }
      // Nếu kết nối cũ đã bị ngắt (hoặc không còn OPEN), cho phép người chơi kết nối lại
      if (!existingPlayer.socket || existingPlayer.socket.readyState !== 1) {
        existingPlayer.socket = playerSocket;
        console.log(`[Player] ${cleanNickname} reconnect thành công qua socket mới (Socket cũ state: ${existingPlayer.socket ? existingPlayer.socket.readyState : 'none'}).`);
        return { success: true, cleanNickname };
      }
      console.log(`[Player] Từ chối ${cleanNickname} vì tên đã tồn tại và socket cũ vẫn đang OPEN.`);
      return { success: false, error: 'Nickname này đã tồn tại trong phòng.' };
    }

    // Lưu người chơi vào Map
    room.players.set(cleanNickname, {
      socket: playerSocket,
      score: 0,
      streak: 0,
      lastCorrect: false
    });

    return { success: true, cleanNickname };
  }

  /**
   * Người chơi rời phòng (hoặc mất kết nối)
   * @param {string} pin 
   * @param {string} nickname 
   */
  leaveRoom(pin, nickname) {
    const room = this.rooms.get(pin);
    if (room && room.players.has(nickname)) {
      room.players.delete(nickname);
      // Nếu đang ở màn hình LOBBY, báo cho Host biết để cập nhật danh sách
      if (room.gameState === 'LOBBY' && room.hostSocket && room.hostSocket.readyState === 1) {
        room.hostSocket.send(JSON.stringify({
          type: 'PLAYER_LEFT',
          nickname,
          totalPlayers: room.players.size
        }));
      }
    }
  }

  /**
   * Bắt đầu trò chơi (Host trigger)
   * @param {string} pin 
   * @returns {boolean}
   */
  startGame(pin) {
    const room = this.rooms.get(pin);
    if (!room || room.gameState !== 'LOBBY') return false;

    room.gameState = 'QUESTION';
    room.currentQuestionIndex = 0;
    room.answersReceived.clear();
    return true;
  }

  /**
   * Chuyển sang câu hỏi tiếp theo
   * @param {string} pin 
   * @returns {Object|null} Thông tin câu hỏi tiếp theo hoặc null nếu hết câu hỏi
   */
  nextQuestion(pin) {
    const room = this.rooms.get(pin);
    if (!room) return null;

    room.currentQuestionIndex++;
    if (room.currentQuestionIndex >= room.questions.length) {
      room.gameState = 'PODIUM';
      return { isFinished: true };
    }

    room.gameState = 'QUESTION';
    room.answersReceived.clear();
    if (room.questionTimer) {
      clearTimeout(room.questionTimer);
    }

    return {
      isFinished: false,
      questionIndex: room.currentQuestionIndex,
      question: room.questions[room.currentQuestionIndex]
    };
  }

  /**
   * Ghi nhận câu trả lời từ người chơi và tính điểm realtime
   * @param {string} pin 
   * @param {string} nickname 
   * @param {number} answerIndex - Chỉ số đáp án người chơi chọn
   * @returns {Object|null} Kết quả câu trả lời của người chơi đó
   */
  submitAnswer(pin, nickname, answerIndex) {
    const room = this.rooms.get(pin);
    if (!room || room.gameState !== 'QUESTION') return null;

    const player = room.players.get(nickname);
    if (!player) return null;

    // Tránh việc người chơi submit nhiều lần cho một câu hỏi
    if (room.answersReceived.has(nickname)) {
      return { error: 'Bạn đã trả lời câu hỏi này rồi.' };
    }

    const currentQuestion = room.questions[room.currentQuestionIndex];
    const isCorrect = answerIndex === currentQuestion.correctAnswerIndex;

    // Tính thời gian phản hồi (ms)
    const now = Date.now();
    const timeSpent = Math.max(0, now - (room.questionEndTime - (currentQuestion.timeLimit * 1000)));
    const timeLimitMs = currentQuestion.timeLimit * 1000;

    let points = 0;
    if (isCorrect) {
      // Công thức tính điểm Kahoot: Càng nhanh điểm càng cao (tối đa 1000 điểm, tối thiểu 500 điểm khi đúng)
      const ratio = timeSpent / timeLimitMs;
      const basePoints = 1000;
      points = Math.round((1 - (ratio / 2)) * basePoints);
      // Đảm bảo điểm số tối thiểu là 500 nếu trả lời đúng
      points = Math.max(500, Math.min(1000, points));

      // Cộng điểm chuỗi (streak bonus) - tối đa +100 điểm cho chuỗi từ 5 câu trở lên
      if (player.lastCorrect) {
        player.streak++;
        const streakBonus = Math.min(100, player.streak * 20);
        points += streakBonus;
      } else {
        player.streak = 1;
      }
      player.lastCorrect = true;
    } else {
      player.streak = 0;
      player.lastCorrect = false;
    }

    // Cập nhật tổng điểm của người chơi
    player.score += points;

    const answerInfo = {
      answerIndex,
      timeTaken: timeSpent / 1000, // đổi sang giây
      points,
      isCorrect,
      totalScore: player.score
    };

    room.answersReceived.set(nickname, answerInfo);

    return answerInfo;
  }

  /**
   * Lấy thống kê câu trả lời hiện tại (phục vụ biểu đồ phía Host)
   * @param {Object} room 
   * @returns {Array} Mảng chứa số lượng câu trả lời cho mỗi đáp án
   */
  getAnswerStatistics(room) {
    const currentQuestion = room.questions[room.currentQuestionIndex];
    const stats = new Array(currentQuestion.options.length).fill(0);

    room.answersReceived.forEach(ans => {
      if (ans.answerIndex >= 0 && ans.answerIndex < stats.length) {
        stats[ans.answerIndex]++;
      }
    });

    return stats;
  }

  /**
   * Lấy bảng xếp hạng (Top 5) của phòng chơi
   * @param {Object} room 
   * @returns {Array} Danh sách top 5 người chơi nhiều điểm nhất
   */
  getLeaderboard(room) {
    const list = [];
    room.players.forEach((data, nick) => {
      list.push({ nickname: nick, score: data.score, streak: data.streak });
    });
    // Sắp xếp giảm dần theo điểm số
    return list.sort((a, b) => b.score - a.score).slice(0, 5);
  }

  /**
   * Lấy Top 3 chung cuộc (Podium) để vinh danh kết thúc game
   * @param {Object} room 
   * @returns {Array} Danh sách top 3 người chơi cao điểm nhất
   */
  getPodium(room) {
    const list = [];
    room.players.forEach((data, nick) => {
      list.push({ nickname: nick, score: data.score });
    });
    return list.sort((a, b) => b.score - a.score).slice(0, 3);
  }
}

module.exports = new GameManager();
