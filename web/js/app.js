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
    zoomLevel: 1
  },
  
  // Local persistence
  responses: JSON.parse(localStorage.getItem(STORAGE_KEYS.PRACTICE_RESPONSES) || '{}'),
  bookmarks: new Set(JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKMARKS) || '[]')),
  examHistory: JSON.parse(localStorage.getItem(STORAGE_KEYS.EXAM_HISTORY) || '[]')
};

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

  if (tabName === 'ranking' && window.rankingManager) window.rankingManager.render();
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
}

// Render Practice Question
function renderPracticeQuestion() {
  const container = document.getElementById('practice-question-card');
  const emptyState = document.getElementById('practice-empty-state');
  
  if (!state.practice.filtered.length) {
    if (container) container.classList.add('hidden');
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }
  
  if (container) container.classList.remove('hidden');
  if (emptyState) emptyState.classList.add('hidden');
  
  const q = state.practice.filtered[state.practice.currentIndex];
  state.practice.isAnswerRevealed = false;
  state.practice.selectedAnswers.clear();
  
  // Previous response
  const prevResp = state.responses[q.id];
  if (prevResp) {
    // If already answered, reveal state
    prevResp.userAnswer.split('').forEach(ch => state.practice.selectedAnswers.add(ch));
    state.practice.isAnswerRevealed = true;
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
  
  state.practice.isAnswerRevealed = true;
  renderPracticeOptions(q);
  renderPracticeExplanation(q);
  updatePracticeNavigatorActive();
  updateHeaderStats();
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

function randomPracticeQuestion() {
  if (!state.practice.filtered.length) return;
  const randIdx = Math.floor(Math.random() * state.practice.filtered.length);
  state.practice.currentIndex = randIdx;
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
    localStorage.removeItem(STORAGE_KEYS.PRACTICE_RESPONSES);
    applyPracticeFilters();
    renderStatsTab();
    updateHeaderStats();
    alert('Đã đặt lại tiến độ ôn tập thành công!');
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
