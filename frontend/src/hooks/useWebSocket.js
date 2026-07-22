import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook quản lý kết nối WebSocket realtime với server.
 * Tự động kết nối lại liên tục khi mất mạng, xử lý tin nhắn có cấu trúc.
 * @param {string} url - Địa chỉ URL của WebSocket Server
 * @param {Function} onMessageReceived - Callback gọi khi nhận được tin nhắn từ Server
 * @returns {Object} { isConnected, error, sendMessage, connect }
 */
export function useWebSocket(url, onMessageReceived) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptRef = useRef(0);

  // Lưu trữ callback bằng ref để tránh re-trigger effect khi callback thay đổi
  const onMessageRef = useRef(onMessageReceived);
  useEffect(() => {
    onMessageRef.current = onMessageReceived;
  }, [onMessageReceived]);

  const connect = useCallback(() => {
    if (!url) return;

    if (socketRef.current) {
      if (socketRef.current.readyState === WebSocket.OPEN) {
        setIsConnected(true);
        return;
      }
      if (socketRef.current.readyState === WebSocket.CONNECTING) {
        return;
      }
      // Dọn dẹp socket cũ nếu đã đóng
      try {
        socketRef.current.close();
      } catch (e) {}
    }

    console.log(`[WS] Đang kết nối tới ${url}...`);
    try {
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('[WS] Kết nối thành công.');
        setIsConnected(true);
        setError(null);
        reconnectAttemptRef.current = 0;
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
        console.log('[WS] Kết nối bị đóng. Code:', event.code, 'Lý do:', event.reason || 'Không rõ');
        setIsConnected(false);
        socketRef.current = null;
        
        // Tiến hành tự động thử kết nối lại liên tục (trì hoãn tối đa 3-5 giây)
        if (event.code !== 1000) {
          const delay = Math.min(1000 * Math.pow(1.5, reconnectAttemptRef.current), 4000);
          console.log(`[WS] Thử kết nối lại sau ${(delay / 1000).toFixed(1)} giây...`);
          
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptRef.current += 1;
            connect();
          }, delay);
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
    // Nếu chưa kết nối, thử kích hoạt kết nối lại ngay lập tức
    console.warn('[WS] Chưa kết nối, đang thử kích hoạt kết nối lại...');
    connect();
    return false;
  }, [connect]);

  // Khởi chạy kết nối
  useEffect(() => {
    if (url) {
      connect();
    } else {
      setIsConnected(false);
      setError(null);
      if (socketRef.current) {
        socketRef.current.close(1000, 'Connection closed due to empty URL');
        socketRef.current = null;
      }
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close(1000, 'Component unmounted');
      }
    };
  }, [connect, url]);

  return { isConnected, error, sendMessage, connect };
}
