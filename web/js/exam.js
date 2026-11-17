// DBI202 Exam Master - Mock Exam Engine

class ExamEngine {
  constructor() {
    this.examActive = false;
    this.questions = [];
    this.currentIndex = 0;
    this.userAnswers = {}; // qId -> "A" or "BC"
    this.flagged = new Set(); // qIds
    this.timerSeconds = 0;
    this.timerTotal = 0;
    this.timerInterval = null;
    this.submitted = false;
    this.results = null;
    this.config = null;
    this.candidateName = localStorage.getItem('dbi202_user_name_v1') || '';
    this.candidateSid = localStorage.getItem('dbi202_user_sid_v1') || '';
    this.pendingConfig = null;
  }

  // Intercept and prompt candidate name before starting exam
  startExam(config) {
    this.pendingConfig = config;
    this.showCandidateModal(config);
  }

  showCandidateModal(config) {
    const modal = document.getElementById('exam-start-modal');
    if (!modal) {
      this.executeStartExam(config);
      return;
    }

    const titleEl = document.getElementById('exam-start-modal-title');
    if (titleEl) {
      const timeStr = config.durationMinutes > 0 ? `${config.durationMinutes} phút` : 'Không giới hạn';
      titleEl.innerText = `${config.title || 'Bài thi DBI202'} • ${config.questionCount} câu • ${timeStr}`;
    }

    const nameInput = document.getElementById('exam-candidate-name');
    const sidInput = document.getElementById('exam-candidate-sid');
    const errEl = document.getElementById('exam-candidate-name-err');
    if (errEl) errEl.classList.add('hidden');

    if (nameInput) {
      nameInput.value = this.candidateName || '';
      setTimeout(() => nameInput.focus(), 80);
    }
    if (sidInput) {
      sidInput.value = this.candidateSid || '';
    }

    modal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  cancelCandidateModal() {
    const modal = document.getElementById('exam-start-modal');
    if (modal) modal.classList.add('hidden');
    this.pendingConfig = null;
  }

  confirmStartExam() {
    const nameInput = document.getElementById('exam-candidate-name');
    const sidInput = document.getElementById('exam-candidate-sid');
    const errEl = document.getElementById('exam-candidate-name-err');
    const name = (nameInput ? nameInput.value : '').trim();
    const sid = (sidInput ? sidInput.value : '').trim();

    if (!name || name.length < 2) {
      if (errEl) errEl.classList.remove('hidden');
      if (nameInput) nameInput.focus();
      return;
    }

    if (errEl) errEl.classList.add('hidden');

    this.candidateName = name;
    this.candidateSid = sid;

    // Persist user info
    localStorage.setItem('dbi202_user_name_v1', name);
    localStorage.setItem('dbi202_user_sid_v1', sid);

    if (window.rankingManager) {
      window.rankingManager.currentUser.name = name;
      window.rankingManager.currentUser.studentId = sid;
    }

    const modal = document.getElementById('exam-start-modal');
    if (modal) modal.classList.add('hidden');

    const cfg = this.pendingConfig || { title: 'Chuẩn FE DBI202', category: 'all', questionCount: 50, durationMinutes: 60 };
    this.pendingConfig = null;
    this.executeStartExam(cfg);
  }

  // Execute starting exam once candidate info is confirmed
  executeStartExam(config) {
    this.config = config;
    let pool = [...state.questions];
    
    // Filter pool by category if specified
    if (config.category && config.category !== 'all') {
      pool = pool.filter(q => q.category_id === config.category);
    }
    
    // Shuffle pool
    pool = this.shuffleArray(pool);
    
    // Pick question count
    const count = Math.min(config.questionCount, pool.length);
    this.questions = pool.slice(0, count);
    
    this.currentIndex = 0;
    this.userAnswers = {};
    this.flagged.clear();
    this.submitted = false;
    this.results = null;
    this.examActive = true;
    
    // Set timer
    this.timerTotal = config.durationMinutes * 60;
    this.timerSeconds = this.timerTotal;
    
    // UI Transitions
    document.getElementById('exam-setup-view').classList.add('hidden');
    document.getElementById('exam-results-view').classList.add('hidden');
    document.getElementById('exam-active-view').classList.remove('hidden');

    // Display candidate name badge in active banner
    const candBadge = document.getElementById('exam-active-candidate');
    if (candBadge) {
      candBadge.innerText = `Thí sinh: ${this.candidateName}${this.candidateSid ? ' (' + this.candidateSid + ')' : ''}`;
    }
    
    this.startTimer();
    this.renderExamQuestion();
    this.renderExamPalette();
  }

  shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.updateTimerDisplay();
    
    if (this.timerTotal === 0) return; // Untimed
    
    this.timerInterval = setInterval(() => {
      this.timerSeconds--;
      this.updateTimerDisplay();
      
      if (this.timerSeconds <= 0) {
        clearInterval(this.timerInterval);
        alert('Hết giờ làm bài! Hệ thống sẽ tự động nộp bài thi của bạn.');
        this.submitExam(true);
      }
    }, 1000);
  }

  updateTimerDisplay() {
    const el = document.getElementById('exam-timer-text');
    if (!el) return;
    
    if (this.timerTotal === 0) {
      el.innerText = 'Không giới hạn';
      return;
    }
    
    const mins = Math.floor(this.timerSeconds / 60);
    const secs = this.timerSeconds % 60;
    el.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    // Warning styling when < 5 mins
    if (this.timerSeconds <= 300) {
      el.classList.add('text-rose-600', 'animate-pulse');
      el.classList.remove('text-blue-600');
    } else {
      el.classList.remove('text-rose-600', 'animate-pulse');
      el.classList.add('text-blue-600');
    }
  }

  renderExamQuestion() {
    if (!this.questions.length) return;
    const q = this.questions[this.currentIndex];
    
    // Question Header
    document.getElementById('exam-q-current').innerText = `Câu ${this.currentIndex + 1} / ${this.questions.length}`;
    document.getElementById('exam-q-cat').innerText = q.category_name;
    
    // Flag Button
    const flagBtn = document.getElementById('exam-flag-btn');
    const isFlagged = this.flagged.has(q.id);
    flagBtn.innerHTML = isFlagged 
      ? '<i data-lucide="flag" class="w-5 h-5 fill-amber-500 text-amber-500"></i><span class="text-amber-600 font-semibold text-sm">Đã đặt cờ</span>'
      : '<i data-lucide="flag" class="w-5 h-5 text-slate-400"></i><span class="text-slate-500 text-sm">Đặt cờ xem lại</span>';
    
    // Multi-select banner
    const multiBanner = document.getElementById('exam-multi-banner');
    if (q.is_multi_select) {
      multiBanner.classList.remove('hidden');
      multiBanner.innerText = `Câu hỏi có nhiều đáp án đúng (${q.correct_answer.length} đáp án)`;
    } else {
      multiBanner.classList.add('hidden');
    }
    
    // Image
    const imgEl = document.getElementById('exam-question-img');
    imgEl.src = `public/${q.question_image}`;
    imgEl.alt = `Câu hỏi thi ${this.currentIndex + 1}`;
    
    // Render Options
    this.renderExamOptions(q);
    
    // Progress percentage
    const answeredCount = Object.keys(this.userAnswers).length;
    const pct = Math.round((answeredCount / this.questions.length) * 100);
    document.getElementById('exam-progress-bar').style.width = `${pct}%`;
    document.getElementById('exam-progress-text').innerText = `${answeredCount}/${this.questions.length} (${pct}%)`;
    
    // Prev / Next button states
    document.getElementById('exam-prev-btn').disabled = this.currentIndex === 0;
    document.getElementById('exam-next-btn').disabled = this.currentIndex === this.questions.length - 1;
    
    this.updateExamPaletteActive();
    if (window.lucide) lucide.createIcons();
  }

  renderExamOptions(q) {
    const container = document.getElementById('exam-options-container');
    container.innerHTML = '';
    
    const currentAnswer = this.userAnswers[q.id] || '';
    const selectedSet = new Set(currentAnswer.split(''));
    
    const options = q.is_true_false ? ['A', 'B'] : ['A', 'B', 'C', 'D'];
    const labels = q.is_true_false 
      ? { A: 'A. True / Đúng', B: 'B. False / Sai' } 
      : { A: 'A', B: 'B', C: 'C', D: 'D' };
      
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      if (selectedSet.has(opt)) btn.classList.add('selected');
      
      btn.innerHTML = `
        <span class="opt-badge">${opt}</span>
        <span class="font-medium text-slate-800 dark:text-slate-200">Chọn đáp án ${labels[opt]}</span>
      `;
      
      btn.onclick = () => this.handleExamOptionClick(opt);
      container.appendChild(btn);
    });
  }

  handleExamOptionClick(opt) {
    if (!this.examActive) return;
    const q = this.questions[this.currentIndex];
    
    if (q.is_multi_select) {
      let current = (this.userAnswers[q.id] || '').split('');
      const idx = current.indexOf(opt);
      if (idx !== -1) {
        current.splice(idx, 1);
      } else {
        current.push(opt);
      }
      current.sort();
      if (current.length > 0) {
        this.userAnswers[q.id] = current.join('');
      } else {
        delete this.userAnswers[q.id];
      }
    } else {
      this.userAnswers[q.id] = opt;
    }
    
    this.renderExamOptions(q);
    this.renderExamPalette();
  }

  toggleFlagCurrent() {
    const q = this.questions[this.currentIndex];
    if (this.flagged.has(q.id)) {
      this.flagged.delete(q.id);
    } else {
      this.flagged.add(q.id);
    }
    this.renderExamQuestion();
    this.renderExamPalette();
  }

  nextExamQuestion() {
    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex++;
      this.renderExamQuestion();
    }
  }

  prevExamQuestion() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.renderExamQuestion();
    }
  }

  renderExamPalette() {
    const grid = document.getElementById('exam-palette-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    this.questions.forEach((q, idx) => {
      const btn = document.createElement('button');
      btn.className = 'palette-btn';
      btn.innerText = idx + 1;
      
      if (this.userAnswers[q.id]) {
        btn.classList.add('answered');
      }
      
      if (this.flagged.has(q.id)) {
        btn.classList.add('flagged');
      }
      
      if (idx === this.currentIndex) {
        btn.classList.add('active');
      }
      
      btn.onclick = () => {
        this.currentIndex = idx;
        this.renderExamQuestion();
      };
      
      grid.appendChild(btn);
    });
  }

  updateExamPaletteActive() {
    const grid = document.getElementById('exam-palette-grid');
    if (!grid) return;
    const buttons = grid.querySelectorAll('.palette-btn');
    buttons.forEach((btn, idx) => {
      if (idx === this.currentIndex) {
        btn.classList.add('active');
        btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        btn.classList.remove('active');
      }
    });
  }

  confirmSubmitExam() {
    const total = this.questions.length;
    const answered = Object.keys(this.userAnswers).length;
    const unanswered = total - answered;
    
    let msg = `Bạn đã hoàn thành ${answered}/${total} câu hỏi.`;
    if (unanswered > 0) {
      msg += `\n⚠️ Cảnh báo: Vẫn còn ${unanswered} câu chưa chọn đáp án!`;
    }
    msg += '\n\nBạn có chắc chắn muốn nộp bài thi ngay bây giờ?';
    
    if (confirm(msg)) {
      this.submitExam(false);
    }
  }

  submitExam(isAutoSubmit = false) {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.examActive = false;
    this.submitted = true;
    
    const timeSpentSeconds = this.timerTotal > 0 ? this.timerTotal - this.timerSeconds : 0;
    
    // Grading
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;
    
    const details = this.questions.map(q => {
      const userAns = this.userAnswers[q.id] || '';
      const correctAns = q.correct_answer;
      const isUnanswered = userAns === '';
      const isCorrect = !isUnanswered && userAns === correctAns;
      
      if (isCorrect) correctCount++;
      else if (isUnanswered) unansweredCount++;
      else wrongCount++;
      
      return {
        question: q,
        userAnswer: userAns,
        correctAnswer: correctAns,
        isCorrect: isCorrect,
        isUnanswered: isUnanswered,
        isFlagged: this.flagged.has(q.id)
      };
    });
    
    const total = this.questions.length;
    const score10 = Number(((correctCount / total) * 10).toFixed(1));
    const accuracy = Math.round((correctCount / total) * 100);
    const passed = score10 >= 5.0; // FPT University pass threshold
    
    this.results = {
      date: new Date().toISOString(),
      config: this.config,
      totalQuestions: total,
      correctCount: correctCount,
      wrongCount: wrongCount,
      unansweredCount: unansweredCount,
      score10: score10,
      accuracy: accuracy,
      passed: passed,
      timeSpentSeconds: timeSpentSeconds,
      details: details
    };
    
    // Save to exam history
    state.examHistory.unshift({
      date: this.results.date,
      title: this.config.title || 'Thi thử tự do',
      score: score10,
      accuracy: accuracy,
      total: total,
      correct: correctCount,
      passed: passed,
      timeSpent: timeSpentSeconds
    });
    localStorage.setItem(STORAGE_KEYS.EXAM_HISTORY, JSON.stringify(state.examHistory));

    // Automatically update to Leaderboard
    if (window.rankingManager && this.candidateName) {
      let examType = 'standard';
      const title = (this.config && this.config.title) ? this.config.title : '';
      if (title.includes('SP2026')) examType = 'sp2026';
      else if (title.includes('Thi nhanh')) examType = 'quick';
      else if (title.includes('tùy chỉnh')) examType = 'custom';

      window.rankingManager.submitNewScore({
        name: this.candidateName,
        studentId: this.candidateSid || '',
        examTitle: title || 'Thi thử DBI202',
        examType: examType,
        score: score10,
        correctCount: correctCount,
        totalQuestions: total,
        accuracy: accuracy,
        timeSpentSeconds: timeSpentSeconds
      });
    }
    
    this.renderExamResults();
  }

  renderExamResults() {
    document.getElementById('exam-active-view').classList.add('hidden');
    document.getElementById('exam-setup-view').classList.add('hidden');
    document.getElementById('exam-results-view').classList.remove('hidden');
    
    const r = this.results;
    
    // Pass/Fail banner
    const passBanner = document.getElementById('exam-result-pass-banner');
    if (r.passed) {
      passBanner.className = 'p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 text-emerald-900 dark:text-emerald-200 text-center mb-6';
      passBanner.innerHTML = `
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 mb-3">
          <i data-lucide="check-circle" class="w-10 h-10"></i>
        </div>
        <h2 class="text-3xl font-extrabold tracking-tight mb-1">CHÚC MỪNG: BẠN ĐÃ ĐẠT!</h2>
        <p class="text-sm opacity-90">Điểm số vượt mức yêu cầu qua môn DBI202 (≥ 5.0/10.0)</p>
      `;
    } else {
      passBanner.className = 'p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-500 text-rose-900 dark:text-rose-200 text-center mb-6';
      passBanner.innerHTML = `
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-600 mb-3">
          <i data-lucide="alert-triangle" class="w-10 h-10"></i>
        </div>
        <h2 class="text-3xl font-extrabold tracking-tight mb-1">CHƯA ĐẠT (CẦN ÔN THÊM)</h2>
        <p class="text-sm opacity-90">Điểm số dưới 5.0/10.0. Hãy xem lại các câu sai để cải thiện nhé!</p>
      `;
    }
    
    // Big Score
    document.getElementById('exam-res-score10').innerText = r.score10;
    document.getElementById('exam-res-correct-count').innerText = `${r.correctCount}/${r.totalQuestions}`;
    document.getElementById('exam-res-accuracy').innerText = `${r.accuracy}%`;
    
    const mins = Math.floor(r.timeSpentSeconds / 60);
    const secs = r.timeSpentSeconds % 60;
    document.getElementById('exam-res-time').innerText = `${mins}m ${secs}s`;

    // Update candidate name in the auto-save banner
    const resCandidate = document.getElementById('exam-res-candidate-name');
    if (resCandidate) {
      resCandidate.innerText = `${this.candidateName || 'Thí sinh'}${this.candidateSid ? ' (' + this.candidateSid + ')' : ''}`;
    }
    
    // Render detailed review list
    this.renderReviewList('all');
    if (window.lucide) lucide.createIcons();
  }



  renderReviewList(filter = 'all') {
    const container = document.getElementById('exam-review-container');
    if (!container || !this.results) return;
    container.innerHTML = '';
    
    const details = this.results.details.filter(d => {
      if (filter === 'wrong') return !d.isCorrect;
      if (filter === 'correct') return d.isCorrect;
      if (filter === 'flagged') return d.isFlagged;
      return true;
    });
    
    if (details.length === 0) {
      container.innerHTML = `<div class="p-8 text-center text-slate-500">Không có câu hỏi nào theo bộ lọc này.</div>`;
      return;
    }
    
    details.forEach((d, idx) => {
      const q = d.question;
      const card = document.createElement('div');
      card.className = `p-6 rounded-2xl border-2 mb-6 ${
        d.isCorrect 
          ? 'border-emerald-200 dark:border-emerald-900/50 bg-white dark:bg-slate-800' 
          : 'border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-800'
      }`;
      
      const statusBadge = d.isCorrect
        ? '<span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">Chính xác</span>'
        : (d.isUnanswered 
            ? '<span class="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">Bỏ trống</span>'
            : '<span class="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400">Sai</span>');
            
      card.innerHTML = `
        <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
          <div class="flex items-center gap-3">
            <span class="font-extrabold text-blue-600 dark:text-blue-400 text-lg">Câu ${idx + 1} (Gốc #${q.number})</span>
            <span class="text-xs px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-700 font-semibold text-slate-600 dark:text-slate-300">${q.category_name}</span>
          </div>
          <div>${statusBadge}</div>
        </div>
        
        <div class="mb-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
          <img src="public/${q.question_image}" alt="Câu hỏi" class="w-full h-auto">
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 mb-4">
          <div class="flex items-center gap-3">
            <span class="text-sm text-slate-500 font-medium">Bạn đã chọn:</span>
            <span class="font-mono font-bold text-base ${d.isCorrect ? 'text-emerald-600' : 'text-rose-600'}">
              ${d.userAnswer || '(Không trả lời)'}
            </span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-sm text-slate-500 font-medium">Đáp án chuẩn:</span>
            <span class="font-mono font-bold text-base text-emerald-600 dark:text-emerald-400">
              ${d.correctAnswer}
            </span>
          </div>
        </div>
        
        <div class="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
          <h4 class="font-bold text-sm text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
            <i data-lucide="help-circle" class="w-4 h-4 text-blue-600"></i> Giải thích chi tiết từ đề thi:
          </h4>
          <p class="text-sm text-slate-700 dark:text-slate-300 mb-3">${q.explanation || 'Không có văn bản giải thích bổ sung.'}</p>
          <div class="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
            <img src="public/${q.answer_image}" alt="Ghi chú đáp án" class="w-full h-auto">
          </div>
        </div>
      `;
      container.appendChild(card);
    });
    
    if (window.lucide) lucide.createIcons();
  }

  retakeWrongQuestions() {
    if (!this.results) return;
    const wrongQs = this.results.details.filter(d => !d.isCorrect).map(d => d.question);
    if (wrongQs.length === 0) {
      alert('Tuyệt vời! Bạn không làm sai câu nào cả.');
      return;
    }
    
    this.executeStartExam({
      title: 'Luyện lại câu sai từ bài thi vừa nộp',
      category: 'all',
      questionCount: wrongQs.length,
      durationMinutes: Math.max(10, Math.round(wrongQs.length * 1.2))
    });
    // Override questions
    this.questions = this.shuffleArray(wrongQs);
    this.renderExamQuestion();
    this.renderExamPalette();
  }
}

window.examEngine = new ExamEngine();
