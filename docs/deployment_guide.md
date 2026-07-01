# Hướng Dẫn Deploy Lên Vercel & Render (Dự Án Ping!)

Tài liệu này hướng dẫn chi tiết cách triển khai (deploy) dự án **Ping!** lên môi trường Internet thực tế:
- **Frontend (React + Vite SPA):** Triển khai trên **Vercel** (miễn phí, tối ưu CDN tốc độ cao).
- **Backend (Node.js + WebSockets Server):** Triển khai trên **Render** (miễn phí, hỗ trợ tốt WebSockets).

---

## 🛠️ Bước Chuẩn Bị Lên Git (GitHub/GitLab)

Trước tiên, bạn cần đẩy mã nguồn của toàn bộ dự án `Ping` lên GitHub/GitLab. Cả Vercel và Render sẽ kết nối tới repository này để tự động deploy mỗi khi bạn push code mới.

1. Khởi tạo Git tại thư mục gốc `d:\Ping` (nếu chưa có):
   ```cmd
   git init
   git add .
   git commit -m "feat: Cấu hình sẵn sàng deploy môi trường production"
   ```
2. Tạo một repository mới trên GitHub (ví dụ đặt tên là `Ping`).
3. Liên kết Git local với GitHub và push code:
   ```cmd
   git remote add origin https://github.com/USERNAME/Ping.git
   git branch -M main
   git push -u origin main
   ```

---

## 💻 Phần 1: Triển Khai Backend Lên Render

Render hỗ trợ triển khai các server Node.js WebSockets miễn phí và tự động kích hoạt HTTPS/WSS cho bạn.

### Các Bước Thực Hiện:
1. Truy cập [Render Dashboard](https://dashboard.render.com/) và đăng nhập bằng tài khoản GitHub của bạn.
2. Nhấn nút **New +** và chọn **Web Service**.
3. Chọn Repository `Ping` bạn vừa đẩy lên GitHub.
4. Cấu hình các thông số sau:
   - **Name:** `ping-backend` (hoặc tên tùy thích).
   - **Environment:** `Node`.
   - **Region:** Chọn vùng gần Việt Nam nhất (ví dụ: `Singapore` hoặc `Oregon`).
   - **Branch:** `main`.
   - **Root Directory:** Điền `backend` (để Render chỉ build và chạy thư mục backend).
   - **Build Command:** `npm install`
   - **Start Command:** `node src/server.js` (hoặc `npm start`)
   - **Instance Type:** Chọn gói **Free** (Miễn phí).
5. Nhấn **Advanced** (Nâng cao) để thêm biến môi trường (Environment Variables):
   - **Key:** `PORT` | **Value:** `10000` (Render sẽ tự động cấu hình port này).
6. Nhấn **Create Web Service**.

> [!NOTE]
> Sau khi tạo xong, Render sẽ mất khoảng 1-2 phút để tải mã nguồn, chạy `npm install` và mở kết nối.
> Khi thấy thông báo `Your service is live 🎉`, hãy copy địa chỉ Web Service của bạn.
> Ví dụ: `https://ping-backend.onrender.com`

> [!WARNING]
> **Lưu ý về bộ nhớ đệm (Ephemeral Storage):**
> Gói miễn phí của Render sử dụng hệ thống tệp tạm thời. Bất kỳ bộ câu hỏi tự tạo mới hay lịch sử trận đấu (lưu ở tệp JSON) sẽ bị đặt lại về mặc định khi server ngủ đông (sau 15 phút không hoạt động) hoặc khi bạn redeploy code. 
> Để lưu trữ vĩnh viễn, bạn có thể cấu hình thêm **Persistent Disk** trên Render hoặc tích hợp một Cloud Database (như MongoDB).

---

## 🎨 Phần 2: Triển Khai Frontend Lên Vercel

Vite React SPA chạy cực kỳ mượt mà trên Vercel. Chúng ta sẽ liên kết với Render thông qua biến môi trường.

### Các Bước Thực Hiện:
1. Truy cập [Vercel Dashboard](https://vercel.com/) và đăng nhập bằng tài khoản GitHub.
2. Nhấn **Add New** -> chọn **Project**.
3. Chọn Repository `Ping` và nhấn **Import**.
4. Cấu hình các thông số dự án:
    - **Framework Preset:** Chọn `Vite` (Vercel tự động phát hiện).
    - **Root Directory:** Giữ nguyên mặc định là thư mục gốc `./` (KHÔNG điền `frontend`).
    - **Build Command:** Điền `npm run build --prefix frontend`
    - **Output Directory:** Điền `frontend/dist`
5. Nhấn mở phần **Environment Variables** (Biến môi trường) để thêm cấu hình kết nối tới server Render của bạn:
   
   - **Tạo biến thứ nhất (REST API):**
     - **Name:** `VITE_BACKEND_URL`
     - **Value:** Địa chỉ HTTPS của Render bạn đã copy ở Phần 1 (Ví dụ: `https://ping-backend.onrender.com`). *Lưu ý không để dấu `/` ở cuối*.
   
   - **Tạo biến thứ hai (WebSockets):**
     - **Name:** `VITE_WS_URL`
     - **Value:** Địa chỉ WSS tương ứng của Render. Bạn chỉ cần đổi `https://` thành `wss://` (Ví dụ: `wss://ping-backend.onrender.com`).
     
6. Nhấn **Deploy**.

> [!TIP]
> Quá trình deploy của Vercel diễn ra rất nhanh (chưa tới 30 giây).
> Khi deploy thành công, Vercel sẽ cấp cho bạn một tên miền miễn phí dạng `https://ping-frontend-xxx.vercel.app` để truy cập và chia sẻ cho mọi người cùng chơi!

---

## 🧪 Kịch Bản Chơi Thử Sau Khi Deploy

1. Mở link trang web Vercel trên máy tính của Host.
2. Tại màn hình trang chủ, nhấn vào card **Host**. Tạo một phòng chơi mới để lấy mã PIN 6 số hiển thị trên màn hình lớn.
3. Sử dụng điện thoại di động của những người chơi khác:
   - Truy cập vào link Vercel của bạn, nhập trực tiếp mã PIN phòng vừa lấy, bấm **Tham gia**.
   - Tiếp tục nhập **Biệt danh (Nickname)** mong muốn, bấm **Tham gia phòng**.
4. Quay lại màn hình lớn của Host, bạn sẽ thấy danh sách người chơi hiển thị trực tiếp theo thời gian thực (realtime). Nhấn **Bắt đầu trò chơi** và đua top!
