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
      <div className="history-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: '800', fontFamily: 'var(--font-tech)', letterSpacing: '1px' }}>
            CYBER DATA HISTORY
          </h2>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'var(--font-tech)' }}>
            LỊCH SỬ CÁC TRẬN ĐẤU ĐÃ DIỄN RA TRÊN HỆ THỐNG
          </div>
        </div>
        <button className="neon-btn" onClick={onBackToDashboard} style={{
          background: 'rgba(0, 240, 255, 0.05)',
          border: '1px solid var(--border-glass)',
          boxShadow: 'none',
          fontSize: '0.85rem'
        }}>
          QUAY LẠI CONSOLE
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', fontFamily: 'var(--font-tech)' }}>
          <div style={{ fontSize: '2.5rem', animation: 'pulse-glow 1s infinite linear' }}>⚡</div>
          ĐANG TRUY XUẤT LỊCH SỬ TRẬN ĐẤU...
        </div>
      ) : error ? (
        <div style={{
          background: 'rgba(255, 0, 85, 0.12)',
          border: '1px solid var(--color-red)',
          color: 'var(--color-red)',
          padding: '12px 16px',
          borderRadius: '12px',
          fontFamily: 'var(--font-tech)',
          textAlign: 'center'
        }}>
          ⚠️ {error}
        </div>
      ) : historyList.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', fontFamily: 'var(--font-tech)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '10px' }}>⚡</div>
          CHƯA CÓ TRẬN ĐẤU NÀO ĐƯỢC GHI NHẬN TRONG HỆ THỐNG.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {historyList.map((item) => {
            const winner = item.podium && item.podium[0] ? item.podium[0] : null;
            return (
              <div key={item.id} className="glass-panel history-item-row" style={{
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
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'var(--font-tech)' }}>
                    <span>📅 THỜI GIAN: <strong>{formatDate(item.playedAt)}</strong></span>
                    <span>🔑 PIN: <strong>#{item.pin}</strong></span>
                    <span>👥 THÀNH VIÊN: <strong>{item.totalPlayers}</strong></span>
                  </div>
                </div>

                {winner ? (
                  <div className="cyber-badge success" style={{ padding: '10px 16px', gap: '10px' }}>
                    <span style={{ fontSize: '1.6rem' }}>👑</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>CHAMPION</div>
                      <div style={{ fontWeight: '800', fontSize: '1.05rem', color: 'var(--accent-emerald)' }}>
                        {winner.nickname}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>
                        {winner.score} PTS
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontFamily: 'var(--font-tech)' }}>
                    KHÔNG CÓ NGƯỜI CHƠI
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
