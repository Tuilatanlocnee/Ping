/**
 * Script điều phối khởi chạy song song cả Backend và Frontend bằng Node.js.
 * Giải quyết triệt để vấn đề escape ký tự đặc biệt trên Windows CMD/PowerShell.
 */
const { spawn } = require('child_process');
const path = require('path');

console.log('⚡ Đang khởi chạy hệ thống trắc nghiệm realtime...');

// Khởi chạy Backend
const backend = spawn('npm', ['run', 'dev'], { 
  cwd: path.join(__dirname, 'backend'),
  shell: true,
  stdio: 'inherit'
});

// Khởi chạy Frontend
const frontend = spawn('npm', ['run', 'dev'], { 
  cwd: path.join(__dirname, 'frontend'),
  shell: true,
  stdio: 'inherit'
});

// Xử lý khi các tiến trình con thoát
backend.on('close', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`[Backend] Đã dừng với mã lỗi: ${code}`);
  }
  process.exit(code || 0);
});

frontend.on('close', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`[Frontend] Đã dừng với mã lỗi: ${code}`);
  }
  process.exit(code || 0);
});

// Đảm bảo dừng các tiến trình con khi tiến trình cha bị ngắt (Ctrl+C)
process.on('SIGINT', () => {
  backend.kill();
  frontend.kill();
  process.exit(0);
});
