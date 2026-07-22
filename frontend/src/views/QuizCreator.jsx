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

  // Bộ parser cho file .txt trắc nghiệm linh hoạt
  const parseQuizFile = (text) => {
    const lines = text.split('\n').map(line => line.trim());
    let parsedTitle = '';
    const parsedQuestions = [];
    
    let currentQuestion = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      
      // Nhận diện tên bộ đề
      if (line.toLowerCase().startsWith('tên bộ đề:') || line.toLowerCase().startsWith('ten bo de:')) {
        parsedTitle = line.substring(line.indexOf(':') + 1).trim();
        continue;
      }
      
      // Nhận diện câu hỏi mới
      // Khớp: "câu hỏi:", "câu 1:", "câu 1.", "cau 1.", "câu 01.", "1.", "1:"
      const isQuestionStart = 
        line.toLowerCase().startsWith('câu hỏi:') || 
        line.toLowerCase().startsWith('cau hoi:') || 
        line.toLowerCase().match(/^(câu|cau)\s*\d+/) || 
        line.toLowerCase().match(/^\d+\s*[:\.]/);

      if (isQuestionStart) {
        if (currentQuestion) {
          parsedQuestions.push(currentQuestion);
        }
        
        // Cắt bỏ tiền tố câu hỏi (ví dụ: "Câu 1. ", "1: ", "Câu hỏi: ")
        let questionText = line.trim();
        const matchPrefix = line.match(/^(?:câu\s*)?\d+\s*[:\.]\s*/i);
        if (matchPrefix) {
          questionText = line.substring(matchPrefix[0].length).trim();
        } else {
          const matchQuestionWord = line.match(/^câu\s*hỏi\s*[:\.]?\s*/i);
          if (matchQuestionWord) {
            questionText = line.substring(matchQuestionWord[0].length).trim();
          }
        }

        currentQuestion = {
          questionText: questionText,
          options: ['', '', '', ''],
          correctAnswerIndex: 0,
          timeLimit: 15,
          points: 1000
        };
        continue;
      }
      
      // Nhận diện các lựa chọn A, B, C, D (có thể kèm dấu sao * đánh dấu đáp án đúng)
      if (currentQuestion) {
        // Khớp: A. hoặc *A. hoặc A. *
        const matchOption = line.match(/^(\*?)\s*([A-D])\s*[\.\:]\s*(\*?)\s*(.*)$/i);
        if (matchOption) {
          const hasAsterisk = matchOption[1] || matchOption[3] || line.endsWith('*');
          const optionLetter = matchOption[2].toUpperCase();
          let optionText = matchOption[4].trim();
          
          // Làm sạch dấu sao ở cuối dòng nếu có
          if (optionText.endsWith('*')) {
            optionText = optionText.slice(0, -1).trim();
          }
          
          const oIndex = optionLetter.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
          currentQuestion.options[oIndex] = optionText;
          
          if (hasAsterisk) {
            currentQuestion.correctAnswerIndex = oIndex;
          }
          continue;
        }
        
        // Nhận diện đáp án đúng theo dòng chỉ định (ví dụ: "Đáp án: A")
        if (line.toLowerCase().startsWith('đáp án:') || line.toLowerCase().startsWith('dap an:') || line.toLowerCase().startsWith('đáp án đúng:') || line.toLowerCase().startsWith('dap an dung:')) {
          const ansChar = line.substring(line.indexOf(':') + 1).trim().toUpperCase();
          if (ansChar >= 'A' && ansChar <= 'D') {
            currentQuestion.correctAnswerIndex = ansChar.charCodeAt(0) - 65;
          }
          continue;
        }
        
        // Nhận diện thời gian
        if (line.toLowerCase().startsWith('thời gian:') || line.toLowerCase().startsWith('thoi gian:')) {
          const timeVal = parseInt(line.substring(line.indexOf(':') + 1).trim(), 10);
          if (!isNaN(timeVal)) {
            currentQuestion.timeLimit = timeVal;
          }
          continue;
        }
      }
    }
    
    if (currentQuestion) {
      parsedQuestions.push(currentQuestion);
    }
    
    return { title: parsedTitle, questions: parsedQuestions };
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      if (file.name.endsWith('.json')) {
        try {
          const data = JSON.parse(content);
          if (data.title && Array.isArray(data.questions)) {
            setTitle(data.title);
            setQuestions(data.questions.map(q => ({
              questionText: q.questionText || '',
              options: Array.isArray(q.options) ? q.options : ['', '', '', ''],
              correctAnswerIndex: typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0,
              timeLimit: typeof q.timeLimit === 'number' ? q.timeLimit : 15,
              points: q.points || 1000
            })));
            setError('');
          } else {
            setError('Định dạng file JSON không đúng cấu trúc (cần có title và questions).');
          }
        } catch (err) {
          setError('Không thể parse file JSON. Vui lòng kiểm tra lại.');
        }
      } else {
        const parsed = parseQuizFile(content);
        if (parsed.questions.length > 0) {
          if (parsed.title) setTitle(parsed.title);
          setQuestions(parsed.questions);
          setError('');
        } else {
          setError('Không nhận diện được câu hỏi nào trong file txt. Hãy xem lại file mẫu.');
        }
      }
    };
    reader.readAsText(file);
  };


  // Đặt nhanh thời gian cho tất cả câu hỏi trong bộ đề hiện tại
  const handleApplyBulkTime = () => {
    const selectEl = document.getElementById('bulk-time-select');
    if (!selectEl) return;
    const timeVal = parseInt(selectEl.value, 10);
    
    const newQuestions = questions.map(q => ({
      ...q,
      timeLimit: timeVal
    }));
    
    setQuestions(newQuestions);
    alert(`Đã đặt thời gian cho tất cả ${questions.length} câu hỏi thành: ${timeVal === 0 ? "Không giới hạn" : timeVal + " giây"}!`);
  };

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
    <div className="fade-in quiz-creator-container" style={{ maxWidth: '850px', margin: '10px auto', width: '100%' }}>
      {/* Desktop Header */}
      <div className="creator-header-desktop desktop-only" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: '800', fontFamily: 'var(--font-tech)', letterSpacing: '1px' }}>
            CYBER QUIZ CREATOR STUDIO
          </h2>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'var(--font-tech)' }}>
            THIẾT KẾ VÀ THIẾT LẬP DỮ LIỆU CÂU HỎI TRẮC NGHIỆM
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

      {/* Mobile Header Topbar */}
      <div className="creator-header-mobile mobile-only" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', fontFamily: 'var(--font-tech)', margin: 0 }}>
            ➕ TẠO BỘ ĐỀ THI MỚI
          </h3>
          <button className="neon-btn" onClick={onBackToDashboard} style={{
            background: 'rgba(0, 240, 255, 0.05)',
            border: '1px solid var(--border-glass)',
            boxShadow: 'none',
            fontSize: '0.8rem',
            padding: '6px 12px'
          }}>
            ◀ Quay Lại
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(255, 0, 85, 0.12)',
          border: '1px solid var(--color-red)',
          color: 'var(--color-red)',
          padding: '12px 16px',
          borderRadius: '12px',
          marginBottom: '20px',
          fontFamily: 'var(--font-tech)',
          textAlign: 'center'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Khu vực Nhập đề nhanh từ file */}
      <div className="glass-panel file-upload-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
        <div className="cyber-badge" style={{ alignSelf: 'flex-start' }}>
          <span>📂</span> NHẬP DỮ LIỆU NHANH TỪ FILE (.TXT / .JSON)
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
          Hỗ trợ tải lên file <strong>.json</strong> (định dạng chuẩn dữ liệu) hoặc file <strong>.txt</strong> soạn thảo đề thi đơn giản.
        </p>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input 
            type="file" 
            accept=".txt,.json" 
            onChange={handleFileUpload} 
            id="quiz-file-upload"
            style={{ display: 'none' }}
          />
          <label htmlFor="quiz-file-upload" className="neon-btn upload-file-btn" style={{
            fontSize: '0.85rem',
            padding: '10px 20px',
            cursor: 'pointer',
            display: 'inline-block',
            margin: 0
          }}>
            📁 TẢI FILE DỮ LIỆU ĐỀ THI
          </label>
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Tên Bộ đề & Đặt thời gian nhanh */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
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
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid var(--border-glass)',
                padding: '14px',
                borderRadius: '10px',
                color: 'var(--text-primary)',
                fontSize: '1.2rem',
                fontWeight: '500'
              }}
              required
            />
          </div>
          
          {/* Cụm công cụ cài đặt nhanh cho toàn bộ câu hỏi */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            paddingTop: '12px', 
            borderTop: '1px solid rgba(255,255,255,0.05)',
            flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '500' }}>
              ⏱️ Đặt nhanh thời gian cho tất cả câu hỏi:
            </span>
            <select 
              id="bulk-time-select"
              defaultValue={15}
              style={{
                background: 'var(--bg-dark)',
                border: '1px solid var(--border-glass)',
                padding: '6px 12px',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              <option value={0}>Không giới hạn</option>
              <option value={5}>5 giây</option>
              <option value={10}>10 giây</option>
              <option value={15}>15 giây</option>
              <option value={20}>20 giây</option>
              <option value={30}>30 giây</option>
              <option value={60}>60 giây</option>
            </select>
            <button
              type="button"
              className="neon-btn"
              onClick={handleApplyBulkTime}
              style={{
                background: 'transparent',
                border: '1px solid var(--primary)',
                color: 'var(--primary)',
                boxShadow: 'none',
                padding: '6px 16px',
                fontSize: '0.85rem'
              }}
            >
              Áp dụng cho tất cả câu hỏi
            </button>
          </div>
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
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px solid var(--border-glass)',
                  padding: '12px',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
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
                  border: '1px solid var(--border-glass)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
              >
                <option value={0}>Không giới hạn</option>
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
                      borderBottom: '1px solid var(--border-glass)',
                      color: 'var(--text-primary)',
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

        <div className="quiz-creator-actions" style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
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
