# Hướng dẫn Cài đặt & Vận hành Hệ thống Realtime Quiz

Tài liệu này hướng dẫn chi tiết cách cấu hình, khởi chạy và kiểm thử hệ thống trắc nghiệm trực tuyến thời gian thực giống Kahoot (không giới hạn người chơi).

---

## 1. Tổng quan Kiến trúc & Tech Stack

### Tech Stack
*   **Frontend**: React (SPA), Vite (Bundler), Vanilla CSS (Design System mượt mà, tối ưu GPU).
*   **Backend**: Node.js, Express, `ws` (Thư viện WebSocket hiệu năng cao, in-memory RAM management).
*   **Kiểm thử**: Giả lập load test bằng Node.js script.

### Sơ đồ Vòng đời Trò chơi (Game Lifecycle Flow)
```mermaid
graph TD
    A[Bắt đầu] --> B[Host tạo phòng]
    B --> C[Backend trả về PIN phòng]
    C --> D[Player tham gia bằng PIN & Tên]
    D --> E[Lobby chờ]
    E -->|Host bắt đầu| F[Hiện câu hỏi & Đếm ngược]
    F -->|Player bấm đáp án| G[Gửi kết quả lên server]
    F -->|Hết giờ / Mọi người trả lời xong| H[Kết thúc câu hỏi]
    G --> H
    H --> I[Đồng bộ thống kê & Kết quả cho Host/Player]
    I -->|Host chuyển tiếp| J{Còn câu hỏi tiếp theo?}
    J -->|Có| F
    J -->|Không| K[Hiển thị Podium Top 3 chung cuộc]
    K --> L[Kết thúc game]
  ```

---

## 2. Yêu cầu Hệ thống (Prerequisites)

*   **Node.js**: Phiên bản 18.x trở lên.
*   **Trình duyệt web**: Hỗ trợ đầy đủ WebSockets (Chrome, Firefox, Safari, Edge...).
*   **Thiết bị di động (tùy chọn)**: Để kiểm thử tính năng chơi trực tiếp qua điện thoại (yêu cầu chung mạng WiFi LAN).

---

## 3. Hướng dẫn Chạy Hệ thống (Hai Phương pháp)

### Cách 1: Khởi chạy nhanh từ thư mục gốc (Khuyên dùng)
Phương pháp này sử dụng script **Node.js runner** (`run-dev.js`) để chạy song song Backend và Frontend trong 1 cửa sổ Terminal duy nhất mà không lo lỗi escape ký tự trên Windows.

1. **Mở Terminal tại thư mục gốc của dự án (`d:\Ping`).**
2. **Cài đặt toàn bộ thư viện:**
   ```cmd
   npm install
   ```
3. **Cấu hình môi trường cho Backend:**
   Tạo file `.env` bên trong thư mục `backend/` từ file `.env.example`:
   * *Nếu dùng Command Prompt (CMD - Mặc định trên Windows):*
     ```cmd
     copy backend\.env.example backend\.env
     ```
   * *Nếu dùng PowerShell (PS):*
     ```powershell
     Copy-Item backend/.env.example backend/.env
     ```
   * *Nếu dùng macOS/Linux hoặc Bash:*
     ```cmd
     cp backend/.env.example backend/.env
     ```
4. **Khởi chạy đồng thời cả Backend và Frontend:**
   ```cmd
   npm run dev
   ```
   *Kết quả:* Server chạy tại cổng `3001` và Client chạy tại cổng `5173` sẽ cùng hiển thị log ra Terminal. Hãy truy cập `http://localhost:5173/` để chơi.

---

### Cách 2: Chạy độc lập bằng 2 cửa sổ Terminal
Dành cho trường hợp bạn muốn theo dõi log riêng biệt của từng phần.

#### Bước A: Chạy Backend Server
1. Mở Terminal tại thư mục `backend/` (`d:\Ping\backend`).
2. Chạy `npm install` (nếu chưa chạy ở Cách 1).
3. Copy `.env.example` thành `.env` bên trong thư mục `backend/`.
4. Chạy lệnh:
   ```cmd
   npm run dev
   ```
   *Kết quả mong đợi:* Terminal in ra: `WebSocket + HTTP Server đang chạy trên cổng 3001`

#### Bước B: Chạy Frontend App
1. Mở Terminal thứ hai tại thư mục `frontend/` (`d:\Ping\frontend`).
2. Chạy `npm install` (nếu chưa chạy ở Cách 1).
3. Chạy lệnh:
   ```cmd
   npm run dev
   ```
   *Kết quả mong đợi:* Terminal hiển thị các liên kết:
   ```text
     Local:   http://localhost:5173/
     Network: http://<IP_CỤC_BỘ>:5173/
   ```

---

## 4. Kịch bản Kiểm thử & Vận hành (Manual Test Cases)

### Kịch bản 1: Luồng Game cơ bản giữa Host và Player
1. **Host Setup:**
   * Mở trình duyệt tại `http://localhost:5173/`. Chọn **Làm Host (Trình chiếu)**.
   * Nhấn nút **Khởi tạo phòng chơi (Tạo PIN)**. Hệ thống sẽ tạo một mã PIN phòng chơi gồm 6 chữ số (VD: `582941`).
2. **Player Tham Gia:**
   * Mở một tab trình duyệt khác ở chế độ ẩn danh (hoặc mở điện thoại của bạn, truy cập địa chỉ IP cục bộ được hiển thị ở bước khởi chạy frontend: `http://<IP_CỤC_BỘ>:5173/`).
   * Chọn **Làm Người chơi**.
   * Nhập đúng mã PIN của Host ở trên (VD: `582941`) và nhập Nickname (VD: `Huỳnh Tấn Lộc`).
   * Nhấn **Vào Phòng**.
   * **Kết quả mong đợi:** Trình duyệt người chơi hiển thị màn hình chờ có tên và mã PIN. Màn hình của Host hiển thị nickname người chơi vừa tham gia realtime lập tức.
3. **Chơi Game:**
   * Trên màn hình Host, nhấn **Bắt đầu trò chơi**.
   * Host sẽ hiển thị câu hỏi, 4 đáp án và thời gian đếm ngược.
   * Player sẽ hiển thị 4 nút bấm tương ứng với 4 màu của đáp án. Nhấn chọn 1 đáp án thật nhanh.
   * Sau khi Player trả lời hoặc hết giờ, Host hiển thị biểu đồ thống kê các đáp án được chọn và highlight đáp án đúng. Player hiển thị kết quả đúng/sai kèm số điểm đạt được.
   * Host nhấn **Xem Bảng Xếp Hạng** để trình chiếu Top 5 người chơi cao điểm nhất.
   * Host nhấn **Câu Hỏi Tiếp Theo** để tiếp tục vòng đời câu hỏi.
4. **Kết thúc Game:**
   * Chơi hết 5 câu hỏi. Host nhấn **Xem Podium Chung Cuộc**.
   * Host hiển thị bục vinh danh 3D tuyệt đẹp cho Top 3 người chơi thắng cuộc. Player hiển thị thứ hạng cuối cùng của mình.

---

## 5. Kịch bản Load Test Giả Lập Kết Nối Lớn (1,000+ Người Chơi)

Để xác minh hiệu năng realtime "không giới hạn người chơi" của server, chúng tôi đã viết một script kiểm thử tải.

1. Hãy khởi chạy Backend Server và mở trình duyệt Host để tạo phòng chơi như ở **Kịch bản 1** để lấy mã PIN phòng chơi.
2. Mở một Terminal mới, di chuyển vào thư mục `backend/` (`d:\Ping\backend`).
3. Chạy script load-test với mã PIN và số lượng client mong muốn (VD: 500 người chơi ảo):
   ```cmd
   node test-client.js <PIN_CỦA_BẠN> 500
   ```
4. **Kết quả mong đợi:**
   * Terminal của script load-test sẽ in tiến trình kết nối: `Đã kết nối thành công: 500/500 người chơi`.
   * Màn hình phòng chờ của Host sẽ tăng vọt số lượng người chơi lên `500` gần như ngay lập tức và hiển thị danh sách người chơi mượt mà nhờ cơ chế cuộn tối ưu CSS.
   * Khi Host nhấn bắt đầu game, các player ảo sẽ tự động gửi đáp án ngẫu nhiên lên server sau 1-5 giây. Host sẽ cập nhật số lượng trả lời realtime vô cùng mượt mà.
