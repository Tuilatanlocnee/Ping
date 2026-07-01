import React, { useState, useEffect } from 'react';

/**
 * Giao diện xem lịch sử các trận đấu đã chơi của Host.
 * Lấy dữ liệu từ file JSON trên Backend thông qua API GET /api/history.
 */
export default function HistoryView({ onBackToDashboard }) {
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:3001`;
        const response = await fetch(`${backendUrl}/api/history`);
        if (response.ok) {
          const data = await response.json();
          setHistoryList(data);
        } else {
          setError('Không thể lấy lịch sử trận đấu từ server.');
        }
      } catch (err) {
        console.error(err);
        setError('Không thể kết nối đến server để lấy lịch sử.');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const formatDate = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="fade-in" style={{ maxWidth: '850px', margin: '20px auto', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: '800' }}>Lịch Sử Các Trận Đấu</h2>
        <button className="neon-btn" onClick={onBackToDashboard} style={{
          background: 'transparent',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: 'none',
          fontSize: '0.95rem'
        }}>
          Quay lại Dashboard
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2.5rem', animation: 'pulse-glow 1s infinite linear' }}>⏳</div>
          Đang tải dữ liệu lịch sử...
        </div>
      ) : error ? (
        <div style={{
          background: 'rgba(255, 69, 0, 0.1)',
          border: '1px solid var(--color-red)',
          color: 'var(--color-red)',
          padding: '12px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          ⚠️ {error}
        </div>
      ) : historyList.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🎮</div>
          Chưa có trận đấu nào được ghi nhận. Hãy tạo phòng chơi để bắt đầu lưu lịch sử!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {historyList.map((item) => {
            const winner = item.podium && item.podium[0] ? item.podium[0] : null;
            return (
              <div key={item.id} className="glass-panel" style={{
                padding: '24px 30px',
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                alignItems: 'center',
                gap: '20px'
              }}>
                <div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '8px' }}>
                    {item.quizTitle}
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    <span>📅 Thời gian: <strong>{formatDate(item.playedAt)}</strong></span>
                    <span>🔑 PIN: <strong>{item.pin}</strong></span>
                    <span>👥 Số người chơi: <strong>{item.totalPlayers}</strong></span>
                  </div>
                </div>

                {winner ? (
                  <div style={{
                    background: 'rgba(255, 215, 0, 0.08)',
                    border: '1px solid rgba(255, 215, 0, 0.2)',
                    padding: '10px 16px',
                    borderRadius: '12px',
                    textAlign: 'right',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <span style={{ fontSize: '1.8rem' }}>👑</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>QUÁN QUÂN</div>
                      <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#ffd700' }}>
                        {winner.nickname}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {winner.score} pts
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Không có người chơi tham gia
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
