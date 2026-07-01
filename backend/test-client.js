/**
 * Script load-test giả lập kết nối hàng ngàn người chơi ảo (virtual players) 
 * để kiểm thử khả năng chịu tải và độ ổn định của WebSocket Server.
 * 
 * Cách chạy:
 * 1. Chạy server: node src/server.js
 * 2. Mở trình duyệt làm Host, tạo phòng chơi để lấy mã PIN.
 * 3. Chạy script này: node test-client.js <PIN> <SỐ_LƯỢNG_PLAYER>
 *    Ví dụ: node test-client.js 123456 500
 */

const WebSocket = require('ws');

// Lấy tham số dòng lệnh
const pin = process.argv[2];
const numPlayers = parseInt(process.argv[3] || '100', 10);

if (!pin) {
  console.error('Lỗi: Vui lòng cung cấp mã PIN phòng chơi.');
  console.log('Cú pháp: node test-client.js <PIN> <SỐ_LƯỢNG_PLAYER>');
  process.exit(1);
}

const SERVER_URL = 'ws://localhost:3001';
console.log(`[LoadTest] Chuẩn bị giả lập ${numPlayers} người chơi kết nối vào phòng PIN: ${pin}...`);

let connectedCount = 0;
let answeredCount = 0;
const players = [];

// Hàm khởi tạo một người chơi ảo
function createVirtualPlayer(index) {
  const nickname = `Player_Vitual_${index}`;
  const ws = new WebSocket(SERVER_URL);

  ws.on('open', () => {
    // Gửi yêu cầu tham gia phòng
    ws.send(JSON.stringify({
      type: 'JOIN_ROOM',
      pin,
      nickname
    }));
  });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const { type } = data;

      switch (type) {
        case 'JOIN_SUCCESS':
          connectedCount++;
          if (connectedCount % 50 === 0 || connectedCount === numPlayers) {
            console.log(`[LoadTest] Đã kết nối thành công: ${connectedCount}/${numPlayers} người chơi.`);
          }
          break;

        case 'JOIN_FAILED':
          console.error(`[LoadTest] Player ${nickname} tham gia thất bại:`, data.error);
          ws.close();
          break;

        case 'NEW_QUESTION':
          // Nhận được câu hỏi mới, giả lập độ trễ trả lời ngẫu nhiên từ 1 - 5 giây
          const delay = 1000 + Math.random() * 4000;
          const optionsCount = data.optionsCount || 4;
          const randomAnswer = Math.floor(Math.random() * optionsCount);

          setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'SUBMIT_ANSWER',
                pin,
                nickname,
                answerIndex: randomAnswer
              }));
            }
          }, delay);
          break;

        case 'ANSWER_SUBMITTED':
          answeredCount++;
          break;

        case 'QUESTION_ENDED':
          // Câu hỏi kết thúc, reset bộ đếm câu trả lời của load test
          answeredCount = 0;
          break;

        case 'GAME_OVER':
          console.log(`[LoadTest] Game Over nhận được bởi ${nickname}.`);
          ws.close();
          break;

        default:
          break;
      }
    } catch (err) {
      console.error('Lỗi parse tin nhắn load-test:', err);
    }
  });

  ws.on('error', (err) => {
    console.error(`[LoadTest] Lỗi kết nối của ${nickname}:`, err.message);
  });

  ws.on('close', () => {
    // Đã đóng kết nối
  });

  players.push(ws);
}

// Kết nối các người chơi lần lượt với khoảng giãn nhẹ để tránh nghẽn socket khởi tạo
let currentIdx = 1;
const interval = setInterval(() => {
  if (currentIdx > numPlayers) {
    clearInterval(interval);
    console.log(`[LoadTest] Đã phát lệnh kết nối cho toàn bộ ${numPlayers} người chơi.`);
    return;
  }
  createVirtualPlayer(currentIdx);
  currentIdx++;
}, 10); // Giãn cách 10ms giữa mỗi kết nối
