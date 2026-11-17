// DBI202 Exam Master - Main Application Logic

const STORAGE_KEYS = {
  PRACTICE_RESPONSES: 'dbi202_practice_responses_v1',
  BOOKMARKS: 'dbi202_bookmarks_v1',
  EXAM_HISTORY: 'dbi202_exam_history_v1',
  THEME: 'dbi202_theme_v1'
};

const state = {
  questions: [],
  categories: [],
  currentTab: 'practice',
  theme: localStorage.getItem(STORAGE_KEYS.THEME) || 'dark',
  
  // Practice state
  practice: {
    filtered: [],
    currentIndex: 0,
    selectedCategory: 'all',
    selectedStatus: 'all',
    searchQuery: '',
    selectedAnswers: new Set(),
    isAnswerRevealed: false,
    zoomLevel: 1,
    isReviewWrongMode: false,
    reviewedSessionIds: new Set()
  },
  
  // Local persistence
  responses: JSON.parse(localStorage.getItem(STORAGE_KEYS.PRACTICE_RESPONSES) || '{}'),
  bookmarks: new Set(JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKMARKS) || '[]')),
  examHistory: JSON.parse(localStorage.getItem(STORAGE_KEYS.EXAM_HISTORY) || '[]')
};

// Floating Toast Notification
function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('app-toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'app-toast-container';
    toastContainer.className = 'fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-sm';
    document.body.appendChild(toastContainer);
  }
  
  const toast = document.createElement('div');
  const bgColors = {
    info: 'bg-slate-900/95 dark:bg-slate-800/95 text-white border-slate-700 shadow-slate-900/20',
    success: 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/30',
    warning: 'bg-amber-600 text-white border-amber-500 shadow-amber-600/30',
    error: 'bg-rose-600 text-white border-rose-500 shadow-rose-600/30'
  };
  
  toast.className = `pointer-events-auto px-4 py-3 rounded-2xl shadow-xl border text-sm font-semibold flex items-center gap-3 transition-all duration-300 transform translate-y-4 opacity-0 ${bgColors[type] || bgColors.info}`;
  toast.innerHTML = `<span>${message}</span>`;
  
  toastContainer.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-4', 'opacity-0');
  });
  
  setTimeout(() => {
    toast.classList.add('translate-y-4', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// Wrong Questions Helpers & Review Mode
function getWrongQuestionsCount() {
  return Object.values(state.responses).filter(r => !r.isCorrect).length;
}

function updateWrongCountBadge() {
  const count = getWrongQuestionsCount();
  const practiceBadge = document.getElementById('practice-wrong-badge');
  const paletteBadge = document.getElementById('palette-wrong-count');
  const reviewCounter = document.getElementById('review-wrong-counter');
  const reviewBtn = document.getElementById('practice-review-wrong-btn');
  const sidebarBtn = document.getElementById('sidebar-review-wrong-btn');
  const banner = document.getElementById('practice-review-wrong-banner');

  if (practiceBadge) practiceBadge.innerText = count;
  if (paletteBadge) paletteBadge.innerText = count;
  if (reviewCounter) reviewCounter.innerText = `Còn ${count} câu sai`;

  if (reviewBtn) {
    if (state.practice.isReviewWrongMode) {
      reviewBtn.className = 'flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-600 text-white font-semibold text-sm shadow-md shadow-rose-500/25 transition-all ring-2 ring-rose-400';
      reviewBtn.innerHTML = `<i data-lucide="rotate-ccw" class="w-4 h-4"></i><span>Đang ôn câu sai</span><span id="practice-wrong-badge" class="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-white text-rose-600">${count}</span>`;
    } else if (count > 0) {
      reviewBtn.className = 'flex items-center gap-2 px-3.5 py-2 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/90 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-all font-semibold text-sm shadow-sm';
      reviewBtn.innerHTML = `<i data-lucide="rotate-ccw" class="w-4 h-4"></i><span>Ôn lại câu sai</span><span id="practice-wrong-badge" class="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-600 text-white">${count}</span>`;
    } else {
      reviewBtn.className = 'flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 transition-all font-semibold text-sm';
      reviewBtn.innerHTML = `<i data-lucide="rotate-ccw" class="w-4 h-4"></i><span>Ôn lại câu sai</span><span id="practice-wrong-badge" class="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400">0</span>`;
    }
  }

  if (sidebarBtn) {
    if (state.practice.isReviewWrongMode) {
      sidebarBtn.className = 'w-full py-2 px-3 rounded-xl bg-rose-600 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-rose-500/20';
    } else {
      sidebarBtn.className = 'w-full py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm';
    }
  }

  if (banner) {
    if (state.practice.isReviewWrongMode) {
      banner.classList.remove('hidden');
    } else {
      banner.classList.add('hidden');
    }
  }

  if (window.lucide) lucide.createIcons();
}

function toggleReviewWrongMode() {
  if (state.practice.isReviewWrongMode) {
    exitReviewWrongMode();
  } else {
    startReviewWrongMode();
  }
}

function startReviewWrongMode() {
  const wrongCount = getWrongQuestionsCount();
  if (wrongCount === 0) {
    showToast('Tuyệt vời! Bạn hiện không có câu hỏi nào làm sai.', 'success');
    return;
  }

  state.practice.isReviewWrongMode = true;
  state.practice.reviewedSessionIds = new Set();
  state.practice.selectedCategory = 'all';
  state.practice.selectedStatus = 'wrong';
  state.practice.searchQuery = '';

  const catSelect = document.getElementById('practice-category-select');
  if (catSelect) catSelect.value = 'all';
  const statusSelect = document.getElementById('practice-status-select');
  if (statusSelect) statusSelect.value = 'wrong';
  const searchInput = document.getElementById('practice-search-input');
  if (searchInput) searchInput.value = '';

  applyPracticeFilters();
  updateWrongCountBadge();
  showToast(`Đã bật Chế độ ôn lại ${wrongCount} câu sai. Hãy thử sức làm lại nhé!`, 'info');
}

function exitReviewWrongMode() {
  state.practice.isReviewWrongMode = false;
  state.practice.reviewedSessionIds = new Set();
  state.practice.selectedStatus = 'all';

  const statusSelect = document.getElementById('practice-status-select');
  if (statusSelect) statusSelect.value = 'all';

  applyPracticeFilters();
  updateWrongCountBadge();
  showToast('Đã thoát chế độ ôn lại câu sai. Đang hiển thị tất cả câu hỏi.', 'info');
}

function startReviewWrongFromStats() {
  switchTab('practice');
  startReviewWrongMode();
}

function resetAllWrongResponses() {
  const wrongIds = Object.keys(state.responses).filter(id => !state.responses[id].isCorrect);
  if (wrongIds.length === 0) {
    showToast('Không có câu sai nào để đặt lại.', 'info');
    return;
  }
  if (confirm(`Bạn có chắc muốn xóa kết quả của ${wrongIds.length} câu làm sai để luyện lại hoàn toàn từ đầu?`)) {
    wrongIds.forEach(id => delete state.responses[id]);
    localStorage.setItem(STORAGE_KEYS.PRACTICE_RESPONSES, JSON.stringify(state.responses));
    state.practice.reviewedSessionIds.clear();
    exitReviewWrongMode();
    updateHeaderStats();
    renderStatsTab();
    showToast(`Đã đặt lại ${wrongIds.length} câu làm sai!`, 'success');
  }
}

function transferExamWrongToPractice() {
  if (!window.examEngine || !window.examEngine.results) {
    showToast('Chưa có kết quả bài thi để chuyển!', 'warning');
    return;
  }
  const wrongDetails = window.examEngine.results.details.filter(d => !d.isCorrect);
  if (wrongDetails.length === 0) {
    showToast('Bài thi này bạn không làm sai câu nào cả! Xuất sắc!', 'success');
    return;
  }
  
  wrongDetails.forEach(d => {
    state.responses[d.question.id] = {
      userAnswer: d.userAnswer || '',
      isCorrect: false,
      timestamp: Date.now()
    };
  });
  localStorage.setItem(STORAGE_KEYS.PRACTICE_RESPONSES, JSON.stringify(state.responses));
  
  updateHeaderStats();
  renderStatsTab();
  
  switchTab('practice');
  startReviewWrongMode();
  showToast(`Đã chuyển ${wrongDetails.length} câu sai từ bài thi vào phần Ôn tập!`, 'success');
}

// Initialize App
async function initApp() {
  applyTheme(state.theme);
  setupEventListeners();
  
  try {
    const res = await fetch('public/questions_data.json');
    if (!res.ok) throw new Error('Cannot load questions data');
    state.questions = await res.json();
    
    // Extract unique categories
    const catMap = new Map();
    state.questions.forEach(q => {
      if (!catMap.has(q.category_id)) {
        catMap.set(q.category_id, {
          id: q.category_id,
          name: q.category_name,
          count: 0
        });
      }
      catMap.get(q.category_id).count++;
    });
    state.categories = Array.from(catMap.values());
    
    populateCategorySelectors();
    applyPracticeFilters();
    renderStatsTab();
    renderBankTab();
    updateHeaderStats();
    updateWrongCountBadge();
    
    // Initialize Ranking Leaderboard
    if (window.rankingManager) {
      window.rankingManager.init();
    }
    
    // Initialize Lucide icons
    if (window.lucide) lucide.createIcons();
  } catch (err) {
    console.error('Failed to load dataset:', err);
    alert('Không thể tải dữ liệu câu hỏi. Hãy chắc chắn server đang chạy.');
  }
}

// Theme handling
function applyTheme(theme) {
  state.theme = theme;
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
  const html = document.documentElement;
  if (theme === 'dark') {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) {
    themeBtn.innerHTML = theme === 'dark' 
      ? '<i data-lucide="sun" class="w-5 h-5 text-amber-400"></i>' 
      : '<i data-lucide="moon" class="w-5 h-5 text-slate-600"></i>';
    if (window.lucide) lucide.createIcons();
  }
}

function toggleTheme() {
  applyTheme(state.theme === 'dark' ? 'light' : 'dark');
}

// Navigation Tabs
function switchTab(tabName) {
  state.currentTab = tabName;
  ['practice', 'exam', 'ranking', 'bank', 'stats'].forEach(t => {
    const section = document.getElementById(`tab-${t}`);
    const navBtn = document.getElementById(`nav-btn-${t}`);
    const mobileNavBtn = document.getElementById(`mobile-nav-btn-${t}`);
    
    if (section) {
      if (t === tabName) {
        section.classList.remove('hidden');
      } else {
        section.classList.add('hidden');
      }
    }
    if (navBtn) {
      if (t === tabName) {
        navBtn.classList.add('active', 'bg-blue-600', 'text-white');
        navBtn.classList.remove('text-slate-600', 'dark:text-slate-300', 'hover:bg-slate-200/60', 'dark:hover:bg-slate-700');
      } else {
        navBtn.classList.remove('active', 'bg-blue-600', 'text-white');
        navBtn.classList.add('text-slate-600', 'dark:text-slate-300', 'hover:bg-slate-200/60', 'dark:hover:bg-slate-700');
      }
    }
    if (mobileNavBtn) {
      if (t === tabName) {
        mobileNavBtn.classList.add('text-blue-600', 'dark:text-blue-400');
        mobileNavBtn.classList.remove('text-slate-500');
      } else {
        mobileNavBtn.classList.remove('text-blue-600', 'dark:text-blue-400');
        mobileNavBtn.classList.add('text-slate-500');
      }
    }
  });

  if (tabName === 'ranking' && window.rankingManager) window.rankingManager.refreshOnline();
  if (tabName === 'stats') renderStatsTab();
  if (tabName === 'bank') renderBankTab();
  if (window.lucide) lucide.createIcons();
}

// Category selectors populate
function populateCategorySelectors() {
  const practiceSelect = document.getElementById('practice-category-select');
  const examSelect = document.getElementById('exam-category-select');
  const bankSelect = document.getElementById('bank-category-select');
  
  let optionsHtml = `<option value="all">Tất cả dạng (${state.questions.length} câu)</option>`;
  state.categories.forEach(c => {
    optionsHtml += `<option value="${c.id}">${c.name} (${c.count} câu)</option>`;
  });
  
  if (practiceSelect) practiceSelect.innerHTML = optionsHtml;
  if (examSelect) examSelect.innerHTML = optionsHtml;
  if (bankSelect) bankSelect.innerHTML = optionsHtml;
}

// Practice Mode Filtering
function applyPracticeFilters() {
  const { selectedCategory, selectedStatus, searchQuery } = state.practice;
  
  if (selectedStatus === 'wrong') {
    state.practice.isReviewWrongMode = true;
  } else {
    state.practice.isReviewWrongMode = false;
  }

  state.practice.filtered = state.questions.filter(q => {
    // Category filter
    if (selectedCategory !== 'all' && q.category_id !== selectedCategory) return false;
    
    // Status filter
    const resp = state.responses[q.id];
    if (selectedStatus === 'unattempted' && resp) return false;
    if (selectedStatus === 'correct' && (!resp || !resp.isCorrect)) return false;
    if (selectedStatus === 'wrong' && (!resp || resp.isCorrect)) return false;
    if (selectedStatus === 'bookmarked' && !state.bookmarks.has(q.id)) return false;
    
    // Search query
    if (searchQuery.trim()) {
      const qNumMatch = searchQuery.trim().match(/^#?(\d+)$/);
      if (qNumMatch && q.number === parseInt(qNumMatch[1])) return true;
      const term = searchQuery.toLowerCase();
      const inText = q.question_text.toLowerCase().includes(term);
      const inExpl = (q.explanation || '').toLowerCase().includes(term);
      const inCat = q.category_name.toLowerCase().includes(term);
      if (!inText && !inExpl && !inCat) return false;
    }
    
    return true;
  });
  
  state.practice.currentIndex = 0;
  renderPracticeQuestion();
  renderPracticeNavigator();
  updateWrongCountBadge();
}

// Render Practice Question
function renderPracticeQuestion() {
  const container = document.getElementById('practice-question-card');
  const emptyState = document.getElementById('practice-empty-state');
  
  if (!state.practice.filtered.length) {
    if (container) container.classList.add('hidden');
    if (emptyState) {
      emptyState.classList.remove('hidden');
      if (state.practice.isReviewWrongMode) {
        emptyState.innerHTML = `
          <div class="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 mx-auto flex items-center justify-center mb-4">
            <i data-lucide="check-circle-2" class="w-8 h-8"></i>
          </div>
          <h3 class="text-xl font-bold mb-2">Không còn câu sai nào!</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">Tuyệt vời! Bạn chưa làm sai câu nào hoặc đã sửa đúng tất cả các câu hỏi.</p>
          <button onclick="exitReviewWrongMode()" class="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700">
            Xem tất cả 346 câu
          </button>
        `;
        if (window.lucide) lucide.createIcons();
      } else {
        emptyState.innerHTML = `
          <div class="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 mx-auto flex items-center justify-center mb-4">
            <i data-lucide="inbox" class="w-8 h-8"></i>
          </div>
          <h3 class="text-xl font-bold mb-2">Không tìm thấy câu hỏi phù hợp</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">Hãy thử chọn danh mục khác hoặc xóa bộ lọc tìm kiếm.</p>
          <button onclick="state.practice.selectedCategory = 'all'; state.practice.selectedStatus = 'all'; state.practice.searchQuery = ''; document.getElementById('practice-category-select').value = 'all'; document.getElementById('practice-status-select').value = 'all'; document.getElementById('practice-search-input').value = ''; applyPracticeFilters();" class="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700">
            Xem tất cả 346 câu
          </button>
        `;
        if (window.lucide) lucide.createIcons();
      }
    }
    return;
  }
  
  if (container) container.classList.remove('hidden');
  if (emptyState) emptyState.classList.add('hidden');
  
  const q = state.practice.filtered[state.practice.currentIndex];
  state.practice.isAnswerRevealed = false;
  state.practice.selectedAnswers.clear();
  
  const prevResp = state.responses[q.id];
  const isReviewedInThisSession = state.practice.reviewedSessionIds && state.practice.reviewedSessionIds.has(q.id);
  
  // Decide whether answer is revealed:
  if (state.practice.isReviewWrongMode) {
    if (isReviewedInThisSession) {
      if (prevResp) {
        prevResp.userAnswer.split('').forEach(ch => state.practice.selectedAnswers.add(ch));
      }
      state.practice.isAnswerRevealed = true;
    } else {
      state.practice.isAnswerRevealed = false;
      state.practice.selectedAnswers.clear();
    }
  } else {
    if (prevResp) {
      prevResp.userAnswer.split('').forEach(ch => state.practice.selectedAnswers.add(ch));
      state.practice.isAnswerRevealed = true;
    }
  }
  
  // Previous mistake banner handling
  const historyBanner = document.getElementById('practice-wrong-history-banner');
  const historyText = document.getElementById('practice-wrong-history-text');
  if (historyBanner) {
    if (!state.practice.isAnswerRevealed && prevResp && !prevResp.isCorrect) {
      historyBanner.classList.remove('hidden');
      if (historyText) {
        historyText.innerHTML = `Bạn từng chọn sai câu này (đáp án cũ: <b class="font-mono text-rose-600 dark:text-rose-400 font-bold">${prevResp.userAnswer || 'Chưa chọn'}</b>). Hãy chọn lại đáp án đúng:`;
      }
    } else {
      historyBanner.classList.add('hidden');
    }
  }
  
  // Clear result feedback in explanation if not answered in session
  const feedbackEl = document.getElementById('practice-review-result-feedback');
  if (feedbackEl && !isReviewedInThisSession) {
    feedbackEl.classList.add('hidden');
    feedbackEl.innerHTML = '';
  }
  
  // Update header info
  document.getElementById('practice-q-num').innerText = `Câu ${q.number} / ${state.questions.length}`;
  document.getElementById('practice-filtered-num').innerText = `(${state.practice.currentIndex + 1}/${state.practice.filtered.length})`;
  document.getElementById('practice-cat-badge').innerText = q.category_name;
  
  // Bookmark button
  const bookmarkBtn = document.getElementById('practice-bookmark-btn');
  if (bookmarkBtn) {
    const isBookmarked = state.bookmarks.has(q.id);
    bookmarkBtn.innerHTML = isBookmarked
      ? '<i data-lucide="star" class="w-5 h-5 fill-amber-400 text-amber-400"></i>'
      : '<i data-lucide="star" class="w-5 h-5 text-slate-400 hover:text-amber-400"></i>';
  }
  
  // Multi-select banner
  const multiBanner = document.getElementById('practice-multi-banner');
  if (multiBanner) {
    if (q.is_multi_select) {
      multiBanner.classList.remove('hidden');
      multiBanner.innerText = `Chọn nhiều đáp án (${q.correct_answer.length} đáp án đúng)`;
    } else {
      multiBanner.classList.add('hidden');
    }
  }
  
  // Question Image
  const imgEl = document.getElementById('practice-question-img');
  imgEl.src = `public/${q.question_image}`;
  imgEl.alt = `Câu hỏi ${q.number}`;
  
  // Options
  renderPracticeOptions(q);
  
  // Explanation & Answer container
  renderPracticeExplanation(q);
  
  // Nav buttons state
  document.getElementById('practice-prev-btn').disabled = state.practice.currentIndex === 0;
  document.getElementById('practice-next-btn').disabled = state.practice.currentIndex === state.practice.filtered.length - 1;
  
  // Update navigator active item
  updatePracticeNavigatorActive();
  
  if (window.lucide) lucide.createIcons();
}

function revealPracticeAnswerImmediate() {
  const q = state.practice.filtered[state.practice.currentIndex];
  if (!q) return;
  state.practice.isAnswerRevealed = true;
  if (state.practice.reviewedSessionIds) {
    state.practice.reviewedSessionIds.add(q.id);
  }
  const prevResp = state.responses[q.id];
  if (prevResp) {
    state.practice.selectedAnswers.clear();
    prevResp.userAnswer.split('').forEach(ch => state.practice.selectedAnswers.add(ch));
  }
  const historyBanner = document.getElementById('practice-wrong-history-banner');
  if (historyBanner) historyBanner.classList.add('hidden');
  renderPracticeOptions(q);
  renderPracticeExplanation(q);
  if (window.lucide) lucide.createIcons();
}

function retryCurrentPracticeQuestion() {
  const q = state.practice.filtered[state.practice.currentIndex];
  if (!q) return;
  
  delete state.responses[q.id];
  if (state.practice.reviewedSessionIds) {
    state.practice.reviewedSessionIds.delete(q.id);
  }
  localStorage.setItem(STORAGE_KEYS.PRACTICE_RESPONSES, JSON.stringify(state.responses));
  
  state.practice.isAnswerRevealed = false;
  state.practice.selectedAnswers.clear();
  
  const historyBanner = document.getElementById('practice-wrong-history-banner');
  if (historyBanner) historyBanner.classList.add('hidden');
  
  const feedbackEl = document.getElementById('practice-review-result-feedback');
  if (feedbackEl) {
    feedbackEl.classList.add('hidden');
    feedbackEl.innerHTML = '';
  }
  
  renderPracticeOptions(q);
  renderPracticeExplanation(q);
  updatePracticeNavigatorActive();
  updateHeaderStats();
  updateWrongCountBadge();
  renderStatsTab();
  
  showToast(`Bạn có thể làm lại câu #${q.number}!`, 'info');
}

// Render Option Buttons for Practice
function renderPracticeOptions(q) {
  const container = document.getElementById('practice-options-container');
  container.innerHTML = '';
  
  const options = q.is_true_false ? ['A', 'B'] : ['A', 'B', 'C', 'D'];
  const labels = q.is_true_false 
    ? { A: 'A. True / Đúng', B: 'B. False / Sai' } 
    : { A: 'A', B: 'B', C: 'C', D: 'D' };
    
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.dataset.option = opt;
    
    const isSelected = state.practice.selectedAnswers.has(opt);
    const isCorrect = q.correct_answer.includes(opt);
    
    if (state.practice.isAnswerRevealed) {
      if (isCorrect) {
        btn.classList.add('correct');
      } else if (isSelected && !isCorrect) {
        btn.classList.add('wrong');
      }
    } else if (isSelected) {
      btn.classList.add('selected');
    }
    
    let iconHtml = '';
    if (state.practice.isAnswerRevealed) {
      if (isCorrect) {
        iconHtml = '<i data-lucide="check-circle" class="w-5 h-5 ml-auto text-emerald-600 dark:text-emerald-400"></i>';
      } else if (isSelected) {
        iconHtml = '<i data-lucide="x-circle" class="w-5 h-5 ml-auto text-red-600 dark:text-red-400"></i>';
      }
    }
    
    btn.innerHTML = `
      <span class="opt-badge">${opt}</span>
      <span class="font-medium text-slate-800 dark:text-slate-200">Chọn đáp án ${labels[opt]}</span>
      ${iconHtml}
    `;
    
    btn.onclick = () => handlePracticeOptionClick(opt, q);
    container.appendChild(btn);
  });
  
  // If multi-select, show Submit Check button
  const submitCheckBtn = document.getElementById('practice-submit-check-btn');
  if (submitCheckBtn) {
    if (q.is_multi_select && !state.practice.isAnswerRevealed) {
      submitCheckBtn.classList.remove('hidden');
      submitCheckBtn.disabled = state.practice.selectedAnswers.size === 0;
    } else {
      submitCheckBtn.classList.add('hidden');
    }
  }
}

// Handle Option Click in Practice
function handlePracticeOptionClick(opt, q) {
  if (state.practice.isAnswerRevealed) return; // already revealed
  
  if (q.is_multi_select) {
    // Toggle option
    if (state.practice.selectedAnswers.has(opt)) {
      state.practice.selectedAnswers.delete(opt);
    } else {
      state.practice.selectedAnswers.add(opt);
    }
    renderPracticeOptions(q);
  } else {
    // Single choice -> immediate reveal & grading
    state.practice.selectedAnswers.clear();
    state.practice.selectedAnswers.add(opt);
    submitPracticeAnswer(q);
  }
}

// Submit Answer in Practice
function submitPracticeAnswer(q) {
  const chosenArray = Array.from(state.practice.selectedAnswers).sort();
  const chosenStr = chosenArray.join('');
  const correctStr = q.correct_answer.split('').sort().join('');
  
  const isCorrect = chosenStr === correctStr;
  
  state.responses[q.id] = {
    userAnswer: chosenStr,
    isCorrect: isCorrect,
    timestamp: Date.now()
  };
  localStorage.setItem(STORAGE_KEYS.PRACTICE_RESPONSES, JSON.stringify(state.responses));
  
  if (state.practice.reviewedSessionIds) {
    state.practice.reviewedSessionIds.add(q.id);
  }
  
  state.practice.isAnswerRevealed = true;
  
  // Hide wrong history banner once answered
  const historyBanner = document.getElementById('practice-wrong-history-banner');
  if (historyBanner) historyBanner.classList.add('hidden');
  
  // Result feedback in explanation card
  const feedbackEl = document.getElementById('practice-review-result-feedback');
  if (feedbackEl) {
    if (state.practice.isReviewWrongMode) {
      feedbackEl.classList.remove('hidden');
      if (isCorrect) {
        feedbackEl.innerHTML = `
          <div class="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm font-bold flex items-center gap-2">
            <i data-lucide="check-circle-2" class="w-5 h-5 text-emerald-600 dark:text-emerald-400"></i>
            <span>🎉 Xuất sắc! Bạn đã sửa sai thành công câu này!</span>
          </div>
        `;
        showToast(`Chính xác! Bạn đã sửa đúng câu #${q.number}! 🎉`, 'success');
      } else {
        feedbackEl.innerHTML = `
          <div class="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-sm font-bold flex items-center gap-2">
            <i data-lucide="x-circle" class="w-5 h-5 text-rose-600 dark:text-rose-400"></i>
            <span>Chưa chính xác! Hãy đọc kỹ giải thích bên dưới để ghi nhớ đáp án chuẩn nhé.</span>
          </div>
        `;
        showToast(`Chưa đúng câu #${q.number}. Hãy xem giải thích bên dưới!`, 'warning');
      }
    } else {
      feedbackEl.classList.add('hidden');
      feedbackEl.innerHTML = '';
    }
  }
  
  renderPracticeOptions(q);
  renderPracticeExplanation(q);
  updatePracticeNavigatorActive();
  updateHeaderStats();
  updateWrongCountBadge();
  renderStatsTab();
  
  if (state.practice.isReviewWrongMode) {
    const wrongLeft = getWrongQuestionsCount();
    if (wrongLeft === 0) {
      setTimeout(() => {
        showToast('🎉 Tuyệt vời! Bạn đã hoàn thành và sửa đúng toàn bộ các câu sai!', 'success');
      }, 500);
    }
  }
}

// Render Explanation
function renderPracticeExplanation(q) {
  const card = document.getElementById('practice-explanation-card');
  if (!card) return;
  
  if (!state.practice.isAnswerRevealed) {
    card.classList.add('hidden');
    return;
  }
  
  card.classList.remove('hidden');
  document.getElementById('practice-correct-ans-text').innerText = q.correct_answer;
  
  // Explanation text
  const explEl = document.getElementById('practice-expl-text');
  explEl.innerText = q.explanation || 'Không có giải thích chi tiết cho câu hỏi này.';
  
  // Note image
  const noteImg = document.getElementById('practice-note-img');
  noteImg.src = `public/${q.answer_image}`;
  noteImg.alt = `Đáp án & Ghi chú câu ${q.number}`;
  
  // View original full screenshot button
  const origBtn = document.getElementById('practice-view-original-btn');
  origBtn.onclick = () => openOriginalModal(q);
}

// Navigator Palette in Practice
function renderPracticeNavigator() {
  const grid = document.getElementById('practice-palette-grid');
  if (!grid) return;
  grid.innerHTML = '';
  
  state.practice.filtered.forEach((q, idx) => {
    const btn = document.createElement('button');
    btn.className = 'palette-btn';
    btn.dataset.idx = idx;
    btn.innerText = q.number;
    
    const resp = state.responses[q.id];
    if (resp) {
      if (resp.isCorrect) {
        btn.classList.add('bg-emerald-500', 'text-white', 'border-emerald-500');
      } else {
        btn.classList.add('bg-rose-500', 'text-white', 'border-rose-500');
      }
    }
    
    if (state.bookmarks.has(q.id)) {
      btn.classList.add('flagged');
    }
    
    if (idx === state.practice.currentIndex) {
      btn.classList.add('active', 'ring-2', 'ring-blue-500');
    }
    
    btn.onclick = () => {
      state.practice.currentIndex = idx;
      renderPracticeQuestion();
    };
    
    grid.appendChild(btn);
  });
}

function updatePracticeNavigatorActive() {
  const grid = document.getElementById('practice-palette-grid');
  if (!grid) return;
  
  const buttons = grid.querySelectorAll('.palette-btn');
  buttons.forEach((btn, idx) => {
    if (idx === state.practice.currentIndex) {
      btn.classList.add('active', 'ring-2', 'ring-blue-500');
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      btn.classList.remove('active', 'ring-2', 'ring-blue-500');
    }
    
    const q = state.practice.filtered[idx];
    if (q) {
      const resp = state.responses[q.id];
      if (resp) {
        if (resp.isCorrect) {
          btn.classList.remove('bg-rose-500', 'border-rose-500');
          btn.classList.add('bg-emerald-500', 'text-white', 'border-emerald-500');
        } else {
          btn.classList.remove('bg-emerald-500', 'border-emerald-500');
          btn.classList.add('bg-rose-500', 'text-white', 'border-rose-500');
        }
      } else {
        btn.classList.remove('bg-emerald-500', 'border-emerald-500', 'bg-rose-500', 'border-rose-500', 'text-white');
      }
      if (state.bookmarks.has(q.id)) {
        btn.classList.add('flagged');
      } else {
        btn.classList.remove('flagged');
      }
    }
  });
}

// Bookmark Toggle
function toggleBookmark(qId) {
  if (state.bookmarks.has(qId)) {
    state.bookmarks.delete(qId);
  } else {
    state.bookmarks.add(qId);
  }
  localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(Array.from(state.bookmarks)));
  
  const q = state.practice.filtered[state.practice.currentIndex];
  if (q && q.id === qId) {
    const bookmarkBtn = document.getElementById('practice-bookmark-btn');
    if (bookmarkBtn) {
      bookmarkBtn.innerHTML = state.bookmarks.has(qId)
        ? '<i data-lucide="star" class="w-5 h-5 fill-amber-400 text-amber-400"></i>'
        : '<i data-lucide="star" class="w-5 h-5 text-slate-400 hover:text-amber-400"></i>';
      if (window.lucide) lucide.createIcons();
    }
  }
  updatePracticeNavigatorActive();
  updateHeaderStats();
}

// Original Screenshot Modal
function openOriginalModal(q) {
  const modal = document.getElementById('image-modal');
  const modalImg = document.getElementById('modal-img');
  const modalTitle = document.getElementById('modal-title');
  const modalNote = document.getElementById('modal-note');
  
  modalTitle.innerText = `Slide gốc: Câu ${q.number} - ${q.category_name} (${q.filename})`;
  modalNote.innerText = `Đáp án: ${q.correct_answer} | ${q.explanation || ''}`;
  modalImg.src = `public/${q.original_path}`;
  modal.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function closeOriginalModal() {
  const modal = document.getElementById('image-modal');
  if (modal) modal.classList.add('hidden');
}

// Header Stats
function updateHeaderStats() {
  const total = state.questions.length;
  const answeredCount = Object.keys(state.responses).length;
  const correctCount = Object.values(state.responses).filter(r => r.isCorrect).length;
  const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
  
  const statBadge = document.getElementById('header-stat-badge');
  if (statBadge) {
    statBadge.innerText = `Tiến độ: ${answeredCount}/${total} (${accuracy}% đúng)`;
  }
}

// Next / Previous navigation
function nextPracticeQuestion() {
  if (state.practice.currentIndex < state.practice.filtered.length - 1) {
    state.practice.currentIndex++;
    renderPracticeQuestion();
  }
}

function prevPracticeQuestion() {
  if (state.practice.currentIndex > 0) {
    state.practice.currentIndex--;
    renderPracticeQuestion();
  }
}

// Random Practice Question (skips already answered questions)
function randomPracticeQuestion() {
  if (!state.practice.filtered.length) {
    showToast('Danh sách câu hỏi đang trống!', 'warning');
    return;
  }
  
  const currentQ = state.practice.filtered[state.practice.currentIndex];
  
  // Case 1: If user explicitly filtered for only 'correct' questions
  if (state.practice.selectedStatus === 'correct') {
    const pool = state.practice.filtered.filter(q => q.id !== currentQ?.id);
    if (pool.length === 0) {
      showToast('Chỉ có 1 câu đã làm đúng trong danh sách này!', 'info');
      return;
    }
    const randQ = pool[Math.floor(Math.random() * pool.length)];
    state.practice.currentIndex = state.practice.filtered.findIndex(q => q.id === randQ.id);
    renderPracticeQuestion();
    return;
  }
  
  // Case 2: In Review Wrong Mode
  if (state.practice.isReviewWrongMode) {
    const remainingWrong = state.practice.filtered.filter(q => {
      const resp = state.responses[q.id];
      if (resp && resp.isCorrect) return false;
      if (state.practice.reviewedSessionIds && state.practice.reviewedSessionIds.has(q.id)) return false;
      return true;
    });
    
    if (remainingWrong.length === 0) {
      showToast('Bạn đã ôn tập xong tất cả các câu sai trong danh sách này! 🎉', 'success');
      return;
    }
    
    const candidates = remainingWrong.filter(q => q.id !== currentQ?.id);
    const targetQ = candidates.length > 0 
      ? candidates[Math.floor(Math.random() * candidates.length)] 
      : remainingWrong[0];
      
    state.practice.currentIndex = state.practice.filtered.findIndex(q => q.id === targetQ.id);
    renderPracticeQuestion();
    return;
  }
  
  // Case 3: Standard Practice Mode (filters out already answered questions)
  const unattempted = state.practice.filtered.filter(q => !state.responses[q.id]);
  
  if (unattempted.length === 0) {
    showToast('Bạn đã làm hết tất cả các câu trong danh sách này! Không còn câu nào chưa làm.', 'info');
    return;
  }
  
  const candidates = unattempted.filter(q => q.id !== currentQ?.id);
  const targetQ = candidates.length > 0 
    ? candidates[Math.floor(Math.random() * candidates.length)] 
    : unattempted[0];
    
  state.practice.currentIndex = state.practice.filtered.findIndex(q => q.id === targetQ.id);
  renderPracticeQuestion();
}

// Render Stats Tab
function renderStatsTab() {
  const total = state.questions.length;
  const answeredCount = Object.keys(state.responses).length;
  const correctCount = Object.values(state.responses).filter(r => r.isCorrect).length;
  const wrongCount = answeredCount - correctCount;
  const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
  
  document.getElementById('stat-total-q').innerText = total;
  document.getElementById('stat-answered-q').innerText = answeredCount;
  document.getElementById('stat-correct-q').innerText = correctCount;
  document.getElementById('stat-wrong-q').innerText = wrongCount;
  document.getElementById('stat-accuracy').innerText = `${accuracy}%`;
  document.getElementById('stat-bookmarked-q').innerText = state.bookmarks.size;
  
  // Category progress breakdown
  const catProgressContainer = document.getElementById('stat-category-breakdown');
  if (catProgressContainer) {
    catProgressContainer.innerHTML = '';
    state.categories.forEach(cat => {
      const catQuestions = state.questions.filter(q => q.category_id === cat.id);
      const catAnswered = catQuestions.filter(q => state.responses[q.id]);
      const catCorrect = catAnswered.filter(q => state.responses[q.id].isCorrect).length;
      const pct = catQuestions.length > 0 ? Math.round((catAnswered.length / catQuestions.length) * 100) : 0;
      const acc = catAnswered.length > 0 ? Math.round((catCorrect / catAnswered.length) * 100) : 0;
      
      const item = document.createElement('div');
      item.className = 'p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60';
      item.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <span class="font-semibold text-slate-800 dark:text-slate-100">${cat.name}</span>
          <span class="text-sm text-slate-500 dark:text-slate-400 font-mono">${catAnswered.length}/${cat.count} (${acc}% đúng)</span>
        </div>
        <div class="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
          <div class="bg-blue-600 h-full rounded-full transition-all duration-300" style="width: ${pct}%"></div>
        </div>
      `;
      catProgressContainer.appendChild(item);
    });
  }
}

// Render Bank Tab (Question Explorer)
function renderBankTab() {
  const container = document.getElementById('bank-table-body');
  if (!container) return;
  container.innerHTML = '';
  
  const catFilter = document.getElementById('bank-category-select')?.value || 'all';
  const search = (document.getElementById('bank-search-input')?.value || '').toLowerCase();
  
  const filtered = state.questions.filter(q => {
    if (catFilter !== 'all' && q.category_id !== catFilter) return false;
    if (search.trim()) {
      const match = q.question_text.toLowerCase().includes(search) || 
                    (q.explanation || '').toLowerCase().includes(search) ||
                    q.number.toString() === search.replace('#', '');
      if (!match) return false;
    }
    return true;
  });
  
  document.getElementById('bank-total-count').innerText = `${filtered.length} câu hỏi`;
  
  filtered.forEach(q => {
    const tr = document.createElement('tr');
    tr.className = 'border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer';
    
    const resp = state.responses[q.id];
    let statusBadge = '<span class="px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">Chưa làm</span>';
    if (resp) {
      statusBadge = resp.isCorrect 
        ? '<span class="px-2 py-0.5 rounded text-xs bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-semibold">Đúng</span>'
        : '<span class="px-2 py-0.5 rounded text-xs bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold">Sai</span>';
    }
    
    const isBookmarked = state.bookmarks.has(q.id) ? '⭐ ' : '';
    
    tr.innerHTML = `
      <td class="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">#${q.number}</td>
      <td class="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">${q.category_name}</td>
      <td class="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">${isBookmarked}${q.question_text.slice(0, 95)}...</td>
      <td class="px-4 py-3 font-mono font-bold text-center text-slate-700 dark:text-slate-300">${q.correct_answer}</td>
      <td class="px-4 py-3 text-center">${statusBadge}</td>
      <td class="px-4 py-3 text-right">
        <button class="px-3 py-1 text-xs rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 font-semibold" onclick="jumpToPractice(${q.id})">Luyện tập</button>
      </td>
    `;
    container.appendChild(tr);
  });
}

function jumpToPractice(qId) {
  state.practice.selectedCategory = 'all';
  state.practice.selectedStatus = 'all';
  state.practice.searchQuery = '';
  document.getElementById('practice-category-select').value = 'all';
  document.getElementById('practice-status-select').value = 'all';
  document.getElementById('practice-search-input').value = '';
  
  applyPracticeFilters();
  const targetIdx = state.practice.filtered.findIndex(q => q.id === qId);
  if (targetIdx !== -1) {
    state.practice.currentIndex = targetIdx;
  }
  switchTab('practice');
  renderPracticeQuestion();
}

// Reset Practice Progress
function resetPracticeProgress() {
  if (confirm('Bạn có chắc chắn muốn xóa toàn bộ tiến độ làm bài ôn tập? (Dấu sao bookmark sẽ không bị xóa)')) {
    state.responses = {};
    if (state.practice.reviewedSessionIds) {
      state.practice.reviewedSessionIds.clear();
    }
    state.practice.isReviewWrongMode = false;
    localStorage.removeItem(STORAGE_KEYS.PRACTICE_RESPONSES);
    applyPracticeFilters();
    renderStatsTab();
    updateHeaderStats();
    updateWrongCountBadge();
    showToast('Đã đặt lại tiến độ ôn tập thành công!', 'success');
  }
}

// Keyboard shortcuts
function setupEventListeners() {
  document.addEventListener('keydown', (e) => {
    // If typing in input, ignore shortcuts
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
    
    // Practice mode shortcuts
    if (state.currentTab === 'practice' && state.practice.filtered.length) {
      const q = state.practice.filtered[state.practice.currentIndex];
      const key = e.key.toUpperCase();
      
      if (['A', 'B', 'C', 'D'].includes(key)) {
        handlePracticeOptionClick(key, q);
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        const mapping = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
        handlePracticeOptionClick(mapping[e.key], q);
      } else if (e.key === 'ArrowRight') {
        nextPracticeQuestion();
      } else if (e.key === 'ArrowLeft') {
        prevPracticeQuestion();
      } else if (e.key === ' ') {
        e.preventDefault();
        // Toggle explanation if not revealed
        if (!state.practice.isAnswerRevealed) {
          state.practice.isAnswerRevealed = true;
          renderPracticeOptions(q);
          renderPracticeExplanation(q);
        }
      } else if (e.key === 's' || e.key === 'S') {
        toggleBookmark(q.id);
      } else if (e.key === 'r' || e.key === 'R') {
        randomPracticeQuestion();
      }
    }
    
    // Exam mode shortcuts
    if (state.currentTab === 'exam' && window.examEngine && window.examEngine.examActive) {
      const key = e.key.toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(key)) {
        window.examEngine.handleExamOptionClick(key);
      } else if (e.key === 'ArrowRight') {
        window.examEngine.nextExamQuestion();
      } else if (e.key === 'ArrowLeft') {
        window.examEngine.prevExamQuestion();
      } else if (e.key === 'f' || e.key === 'F') {
        window.examEngine.toggleFlagCurrent();
      }
    }
  });
}

// Start app
window.addEventListener('DOMContentLoaded', initApp);
