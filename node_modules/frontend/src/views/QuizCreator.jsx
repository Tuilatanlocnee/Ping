import React, { useState } from 'react';

/**
 * QuizCreator cho phép Host tạo một bộ đề câu hỏi trắc nghiệm mới.
 * Đồng bộ lưu trữ bền vững lên backend thông qua REST API.
 */
export default function QuizCreator({ onBackToDashboard }) {
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([
    {
      questionText: '',
      options: ['', '', '', ''],
      correctAnswerIndex: 0,
      timeLimit: 15,
      points: 1000
    }
  ]);
  const [error, setError] = useState('');

  // Thay đổi tiêu đề câu hỏi hoặc các option
  const handleQuestionChange = (index, value) => {
    const newQuestions = [...questions];
    newQuestions[index].questionText = value;
    setQuestions(newQuestions);
  };

  const handleOptionChange = (qIndex, oIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[oIndex] = value;
    setQuestions(newQuestions);
  };

  const handleCorrectAnswerChange = (qIndex, oIndex) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].correctAnswerIndex = oIndex;
    setQuestions(newQuestions);
  };

  const handleTimeChange = (qIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].timeLimit = parseInt(value, 10);
    setQuestions(newQuestions);
  };

  // Thêm một câu hỏi mới vào danh sách
  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        questionText: '',
        options: ['', '', '', ''],
        correctAnswerIndex: 0,
        timeLimit: 15,
        points: 1000
      }
    ]);
  };

  // Xóa một câu hỏi
  const removeQuestion = (index) => {
    if (questions.length === 1) return;
    const newQuestions = questions.filter((_, idx) => idx !== index);
    setQuestions(newQuestions);
  };

  // Lưu toàn bộ bộ đề
  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Vui lòng nhập tên bộ đề câu hỏi.');
      return;
    }

    // Validate dữ liệu các câu hỏi
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) {
        setError(`Câu hỏi số ${i + 1} không được để trống.`);
        return;
      }
      for (let j = 0; j < 4; j++) {
        if (!q.options[j].trim()) {
          setError(`Đáp án số ${j + 1} của câu hỏi ${i + 1} không được để trống.`);
          return;
        }
      }
    }

    setError('');

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:3001`;
      const response = await fetch(`${backendUrl}/api/quizzes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: title.trim(), questions })
      });

      if (response.ok) {
        alert('Đã lưu bộ đề câu hỏi mới thành công!');
        onBackToDashboard();
      } else {
        const resData = await response.json();
        setError(resData.error || 'Gặp lỗi khi lưu bộ đề.');
      }
    } catch (err) {
      console.error(err);
      setError('Không thể kết nối đến server để lưu bộ đề.');
    }
  };

  const colors = ['red', 'blue', 'yellow', 'green'];
  const labels = ['A (▲)', 'B (◆)', 'C (●)', 'D (■)'];

  return (
    <div className="fade-in" style={{ maxWidth: '800px', margin: '20px auto', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: '800' }}>Tạo Bộ Câu Hỏi Mới</h2>
        <button className="neon-btn" onClick={onBackToDashboard} style={{
          background: 'transparent',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: 'none',
          fontSize: '0.95rem'
        }}>
          Quay lại Dashboard
        </button>
      </div>

      {error && (
        <div style={{
          background: 'rgba(255, 69, 0, 0.1)',
          border: '1px solid var(--color-red)',
          color: 'var(--color-red)',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Tên Bộ đề */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <label style={{ display: 'block', fontSize: '1rem', fontWeight: '600', marginBottom: '8px', color: 'var(--text-muted)' }}>
            TÊN BỘ ĐỀ CÂU HỎI
          </label>
          <input 
            type="text" 
            placeholder="Nhập tên bộ câu hỏi (Ví dụ: Đố Vui Cuối Tuần)..."
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 100))}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '14px',
              borderRadius: '10px',
              color: 'white',
              fontSize: '1.2rem',
              fontWeight: '500'
            }}
            required
          />
        </div>

        {/* Danh sách câu hỏi */}
        {questions.map((q, qIndex) => (
          <div key={qIndex} className="glass-panel" style={{ padding: '30px', position: 'relative' }}>
            {questions.length > 1 && (
              <button 
                type="button" 
                onClick={() => removeQuestion(qIndex)}
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  background: 'rgba(255, 69, 0, 0.15)',
                  border: '1px solid var(--color-red)',
                  color: 'var(--color-red)',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                Xóa câu hỏi
              </button>
            )}

            <h3 style={{ fontSize: '1.2rem', color: 'var(--primary)', marginBottom: '16px', fontWeight: '700' }}>
              Câu hỏi số {qIndex + 1}
            </h3>

            {/* Tiêu đề câu hỏi */}
            <div style={{ marginBottom: '20px' }}>
              <input 
                type="text" 
                placeholder="Nhập nội dung câu hỏi..."
                value={q.questionText}
                onChange={(e) => handleQuestionChange(qIndex, e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '12px',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '1.1rem'
                }}
                required
              />
            </div>

            {/* Lựa chọn thời gian */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Giới hạn thời gian:</span>
              <select 
                value={q.timeLimit}
                onChange={(e) => handleTimeChange(qIndex, e.target.value)}
                style={{
                  background: 'var(--bg-dark)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value={5}>5 giây</option>
                <option value={10}>10 giây</option>
                <option value={15}>15 giây</option>
                <option value={20}>20 giây</option>
                <option value={30}>30 giây</option>
                <option value={60}>60 giây</option>
              </select>
            </div>

            {/* Nhập 4 đáp án */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              {Array.from({ length: 4 }).map((_, oIndex) => (
                <div key={oIndex} style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  gap: '12px'
                }}>
                  {/* Checkbox chọn đáp án đúng */}
                  <input 
                    type="radio" 
                    name={`correctAnswer_${qIndex}`}
                    checked={q.correctAnswerIndex === oIndex}
                    onChange={() => handleCorrectAnswerChange(qIndex, oIndex)}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                      accentColor: 'var(--primary)'
                    }}
                  />
                  
                  {/* Nhãn nhấp chuột */}
                  <span style={{
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    width: '50px',
                    color: oIndex === 0 ? 'var(--color-red)' : oIndex === 1 ? 'var(--color-blue)' : oIndex === 2 ? 'var(--color-yellow)' : 'var(--color-green)'
                  }}>
                    {labels[oIndex]}
                  </span>

                  <input 
                    type="text" 
                    placeholder={`Đáp án ${labels[oIndex]}...`}
                    value={q.options[oIndex]}
                    onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      color: 'white',
                      padding: '4px 0',
                      fontSize: '0.95rem'
                    }}
                    required
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
          <button 
            type="button" 
            className="neon-btn" 
            onClick={addQuestion}
            style={{
              flex: 1,
              background: 'transparent',
              border: '2px dashed var(--primary)',
              color: 'var(--primary)',
              boxShadow: 'none'
            }}
          >
            ➕ Thêm Câu Hỏi Mới
          </button>
          
          <button type="submit" className="neon-btn" style={{ flex: 1 }}>
            💾 Lưu Bộ Đề Câu Hỏi
          </button>
        </div>
      </form>
    </div>
  );
}
