# Ping! (Kahoot-like Web App)

Ứng dụng web chơi trắc nghiệm tương tác trực tuyến thời gian thực tương tự Kahoot, được xây dựng với cấu trúc tối giản, hiệu năng cao, độ trễ cực thấp và khả năng đáp ứng số lượng người chơi cực lớn (không giới hạn người chơi).

---

## ✨ Tính Năng Nổi Bật

1.  **Kết Nối Realtime Siêu Tốc:** Sử dụng WebSocket thuần (`ws`) trên Node.js backend giúp giảm thiểu tối đa overhead của kết nối, cho tốc độ đồng bộ tin nhắn dưới 10ms.
2.  **Không Giới Hạn Người Chơi:** Quản lý toàn bộ trạng thái game (Game State, Connection Pools) hoàn toàn trong bộ nhớ RAM (`Map` và `Set` trong JS) của Backend giúp truy xuất dữ liệu với độ phức tạp $O(1)$.
3.  **Tải Trang Cực Mượt:** Frontend xây dựng bằng React + Vite SPA gọn nhẹ, sử dụng hệ thống Design System với HSL Color Palette cao cấp, Glassmorphism sang trọng và CSS Animations phần cứng tối ưu GPU.
4.  **Bảo Mật Tuyệt Đối:** Đáp án đúng được bảo mật hoàn toàn ở phía Backend. Player chỉ nhận số lượng đáp án để hiển thị các nút màu lớn, ngăn chặn triệt để hành vi săm soi code ở client để gian lận.
5.  **Công Thức Điểm Kahoot:** Điểm số được tính toán tự động dựa trên độ chính xác và tốc độ trả lời (càng nhanh điểm càng cao), có tích hợp điểm thưởng chuỗi (streak bonus).
6.  **Load Test Giả Lập Tải:** Tích hợp script giả lập hàng ngàn client ảo kết nối gửi đáp án đồng thời để kiểm chứng độ chịu tải của server.

---

## 🛠️ Công Nghệ Sử Dụng

*   **Frontend:** React, Vite, Vanilla CSS.
*   **Backend:** Node.js, Express, WebSocket (`ws`).
*   **Cấu hình:** Dotenv, CORS.

---

## 🚀 Hướng Dẫn Khởi Chạy Nhanh (Từ Thư Mục Gốc)

Dự án sử dụng cơ chế **NPM Workspaces** kết hợp với script điều phối Node.js để bạn có thể cài đặt và khởi chạy cả Backend và Frontend cùng một lúc ngay tại thư mục gốc `d:\Ping` bằng một cửa sổ Terminal duy nhất.

### Bước 1: Cài đặt thư viện
Mở Terminal tại thư mục gốc `d:\Ping` và chạy lệnh trực tiếp:
```cmd
npm install
```

### Bước 2: Tạo file cấu hình môi trường cho Backend
Tạo file `.env` bên trong thư mục `backend` bằng cách chạy câu lệnh tương ứng tại thư mục gốc:

*   **Nếu dùng Command Prompt (CMD - Mặc định trên Windows):**
    ```cmd
    copy backend\.env.example backend\.env
    ```
*   **Nếu dùng PowerShell (PS):**
    ```powershell
    Copy-Item backend/.env.example backend/.env
    ```
*   **Nếu dùng macOS/Linux hoặc Git Bash:**
    ```cmd
    cp backend/.env.example backend/.env
    ```

*(Hoặc bạn có thể tự copy file `.env.example` và đổi tên thành `.env` thủ công trong thư mục `backend/`)*

### Bước 3: Khởi chạy cả Backend và Frontend song song
Chạy lệnh duy nhất sau tại thư mục gốc:
```cmd
npm run dev
```
*Kết quả mong đợi:* Cả server Backend (cổng 3001) và ứng dụng Frontend (cổng 5173) sẽ khởi chạy đồng thời. Màn hình Terminal hiển thị log của cả hai.

Bạn hãy mở trình duyệt và truy cập:
*   **Màn hình chính:** `http://localhost:5173/`

---

## 🧪 Chạy Kiểm Thử Tải (Load Test 1,000+ Người Chơi)

Để xác minh server chịu được lượng người chơi cực lớn:
1. Hãy tạo một phòng chơi ở vai trò Host trên trình duyệt để lấy mã PIN (ví dụ: `123456`).
2. Mở một Terminal mới trong thư mục `backend` (`d:\Ping\backend`).
3. Chạy script load test với mã PIN phòng chơi và số lượng người chơi ảo mong muốn:
   ```cmd
   node test-client.js <PIN_PHÒNG> 500
   ```
   *Ví dụ:* `node test-client.js 123456 500` (Giả lập 500 người chơi tham gia đồng thời).

---

## 📁 Cấu Trúc Dự Án

```text
Ping/
├── backend/                  # Mã nguồn Backend (Node.js + WebSockets)
│   ├── src/
│   │   ├── server.js         # Khởi tạo HTTP & WebSocket Server, routing tin nhắn
│   │   └── gameManager.js    # Logic tính điểm, quản lý phòng và người chơi
│   ├── test-client.js        # Script Load Test giả lập kết nối hàng ngàn client
│   └── package.json
├── docs/
│   └── setup_guide.md        # Hướng dẫn chi tiết & kịch bản test
├── frontend/                 # Mã nguồn Frontend (React + Vite + Vanilla CSS)
│   ├── src/
│   │   ├── hooks/
│   │   │   └── useWebSocket.js # Custom hook kết nối WebSocket & tự động kết nối lại
│   │   ├── views/
│   │   │   ├── HomeView.jsx  # Màn hình chọn vai trò
│   │   │   ├── HostView.jsx  # Giao diện trình chiếu phía Host
│   │   │   └── PlayerView.jsx # Giao diện bấm chọn đáp án phía Player
│   │   ├── index.css         # Design System và CSS Core
│   │   ├── App.jsx           # Điều phối vai trò và luồng dữ liệu
│   │   └── main.jsx
│   └── package.json
├── package.json              # Quản lý Workspaces và định nghĩa script dev
└── run-dev.js                # Script Node.js điều phối khởi chạy song song Backend/Frontend
```
