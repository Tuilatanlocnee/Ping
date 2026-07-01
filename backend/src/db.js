const fs = require('fs');
const path = require('path');

// Định nghĩa thư mục lưu trữ dữ liệu
const DATA_DIR = path.join(__dirname, '..', 'data');
const QUIZZES_FILE = path.join(DATA_DIR, 'quizzes.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

// Đảm bảo thư mục data tồn tại
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Bộ câu hỏi mẫu mặc định để khởi tạo lần đầu (để trống theo yêu cầu)
const defaultQuizzes = [];

/**
 * Đọc dữ liệu từ file JSON an toàn
 * @param {string} filePath 
 * @param {any} defaultValue 
 * @returns {any}
 */
function readJSON(filePath, defaultValue = []) {
  try {
    if (!fs.existsSync(filePath)) {
      writeJSON(filePath, defaultValue);
      return defaultValue;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Lỗi đọc file ${filePath}:`, err);
    return defaultValue;
  }
}

/**
 * Ghi dữ liệu vào file JSON an toàn
 * @param {string} filePath 
 * @param {any} data 
 */
function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`Lỗi ghi file ${filePath}:`, err);
  }
}

// Khởi tạo các file dữ liệu ban đầu
const quizzes = readJSON(QUIZZES_FILE, defaultQuizzes);
const history = readJSON(HISTORY_FILE, []);

module.exports = {
  // --- QUAN LY QUIZZES ---
  
  getQuizzes: () => {
    return readJSON(QUIZZES_FILE, defaultQuizzes);
  },

  getQuizById: (id) => {
    const list = readJSON(QUIZZES_FILE, defaultQuizzes);
    return list.find(q => q.id === id) || null;
  },

  saveQuiz: (quizData) => {
    const list = readJSON(QUIZZES_FILE, defaultQuizzes);
    
    const newQuiz = {
      id: 'quiz_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      title: quizData.title || 'Bộ đề không tên',
      createdAt: new Date().toISOString(),
      questions: quizData.questions || []
    };

    list.push(newQuiz);
    writeJSON(QUIZZES_FILE, list);
    return newQuiz;
  },

  deleteQuiz: (id) => {
    const list = readJSON(QUIZZES_FILE, defaultQuizzes);
    const filtered = list.filter(q => q.id !== id);
    writeJSON(QUIZZES_FILE, filtered);
    return filtered.length < list.length;
  },

  // --- QUAN LY LICH SU (HISTORY) ---

  getHistory: () => {
    return readJSON(HISTORY_FILE, []);
  },

  saveHistoryEntry: (entry) => {
    const list = readJSON(HISTORY_FILE, []);
    const newEntry = {
      id: 'hist_' + Date.now(),
      playedAt: new Date().toISOString(),
      pin: entry.pin,
      quizTitle: entry.quizTitle,
      totalPlayers: entry.totalPlayers,
      podium: entry.podium || [] // [{nickname, score}]
    };
    list.unshift(newEntry); // Đưa trận mới nhất lên đầu
    writeJSON(HISTORY_FILE, list);
    return newEntry;
  }
};
