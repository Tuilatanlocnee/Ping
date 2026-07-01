import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook quản lý kết nối WebSocket realtime với server.
 * Tự động kết nối lại khi mất mạng, xử lý tin nhắn có cấu trúc.
 * @param {string} url - Địa chỉ URL của WebSocket Server
 * @param {Function} onMessageReceived - Callback gọi khi nhận được tin nhắn từ Server
 * @returns {Object} { isConnected, error, sendMessage }
 */
export function useWebSocket(url, onMessageReceived) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const maxReconnectAttempts = 5;
  const reconnectAttemptRef = useRef(0);

  // Lưu trữ callback bằng ref để tránh re-trigger effect khi callback thay đổi
  const onMessageRef = useRef(onMessageReceived);
  useEffect(() => {
    onMessageRef.current = onMessageReceived;
  }, [onMessageReceived]);

  const connect = useCallback(() => {
    // Sửa lỗi: Không thực hiện kết nối nếu URL trống
    if (!url) return;

    if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) {
      return; // Đã hoặc đang kết nối
    }

    console.log(`[WS] Đang kết nối tới ${url}...`);
    try {
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('[WS] Kết nối thành công.');
        setIsConnected(true);
        setError(null);
        reconnectAttemptRef.current = 0; // reset số lần thử
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (onMessageRef.current) {
            onMessageRef.current(data);
          }
        } catch (err) {
          console.error('[WS] Lỗi parse dữ liệu nhận được:', err);
        }
      };

      socket.onerror = (err) => {
        console.error('[WS] Gặp lỗi kết nối:', err);
        setError('Lỗi kết nối WebSocket.');
      };

      socket.onclose = (event) => {
        console.log('[WS] Kết nối bị đóng. Lý do:', event.reason || 'Không rõ');
        setIsConnected(false);
        
        // Nếu không phải đóng chủ động, tiến hành kết nối lại
        if (event.code !== 1000 && reconnectAttemptRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 10000);
          console.log(`[WS] Thử kết nối lại sau ${delay / 1000} giây (Lần ${reconnectAttemptRef.current + 1}/${maxReconnectAttempts})...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptRef.current += 1;
            connect();
          }, delay);
        } else if (reconnectAttemptRef.current >= maxReconnectAttempts) {
          setError('Không thể kết nối đến máy chủ. Vui lòng làm mới trang.');
        }
      };
    } catch (e) {
      console.error('[WS] Không thể khởi tạo WebSocket:', e.message);
      setError('URL kết nối WebSocket không hợp lệ.');
    }
  }, [url]);

  // Hàm gửi tin nhắn lên server
  const sendMessage = useCallback((data) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data));
      return true;
    }
    console.warn('[WS] Chưa kết nối, không thể gửi tin nhắn.');
    return false;
  }, []);

  // Khởi chạy kết nối
  useEffect(() => {
    // Sửa lỗi: Chỉ kết nối khi có URL hợp lệ
    if (url) {
      connect();
    } else {
      // Nếu URL bị xóa (ví dụ quay về SELECT role), dọn dẹp các kết nối cũ nếu có
      setIsConnected(false);
      setError(null);
      if (socketRef.current) {
        socketRef.current.close(1000, 'Connection closed due to empty URL');
        socketRef.current = null;
      }
    }

    // Dọn dẹp khi unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        // Đóng chủ động với code 1000 để tránh auto-reconnect
        socketRef.current.close(1000, 'Component unmounted');
      }
    };
  }, [connect, url]);

  return { isConnected, error, sendMessage };
}
