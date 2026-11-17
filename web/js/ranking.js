// DBI202 Exam Master - Online Cloud Ranking & Leaderboard Logic
// Strict Online Mode: Data is loaded from and stored directly to the Cloud Database (NO Local Storage for rankings)

const RANKING_STORAGE_KEYS = {
  USER_NAME: 'dbi202_user_name_v1',
  USER_SID: 'dbi202_user_sid_v1',
  CLOUD_URL: 'dbi202_online_db_url_v1'
};

// Default Cloud Database URL (Supports Firebase Realtime Database REST API or custom REST endpoint)
const DEFAULT_CLOUD_URL = 'https://dbi202-fpt-rankings-default-rtdb.firebaseio.com/rankings.json';

class RankingManager {
  constructor() {
    this.rankings = [];
    this.filters = {
      examType: 'all',
      scoreTier: 'all',
      sortBy: 'score_desc',
      searchQuery: ''
    };
    this.currentUser = {
      name: localStorage.getItem(RANKING_STORAGE_KEYS.USER_NAME) || '',
      studentId: localStorage.getItem(RANKING_STORAGE_KEYS.USER_SID) || ''
    };
    this.isOnlineConnected = false;
    this.isLoading = false;
  }

  async init() {
    // Purge any legacy localStorage rankings to strictly follow "không lưu ở local storage"
    try {
      localStorage.removeItem('dbi202_rankings_v1');
    } catch (e) {}

    await this.loadRankings();
  }

  getEndpoint() {
    const saved = localStorage.getItem(RANKING_STORAGE_KEYS.CLOUD_URL);
    if (saved && saved.trim()) return saved.trim();

    // If running on local server via start_web.bat
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return '/api/rankings';
    }

    return DEFAULT_CLOUD_URL;
  }

  updateStatusBadge(status) {
    const badge = document.getElementById('ranking-online-status');
    const textEl = document.getElementById('ranking-online-status-text');
    if (!badge || !textEl) return;

    if (status === 'loading') {
      badge.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-400/40';
      badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-500 animate-spin"></span><span>Đang tải Cloud...</span>';
    } else if (status === 'syncing') {
      badge.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-400/40';
      badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span><span>Đang đồng bộ điểm số...</span>';
    } else if (status === 'online') {
      badge.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-400/40';
      badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><span>Cloud Online</span>';
    } else {
      badge.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700';
      badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-slate-400"></span><span>Cục bộ / Mẫu</span>';
    }
  }

  async refreshOnline() {
    await this.loadRankings();
  }

  async loadRankings() {
    this.isLoading = true;
    this.updateStatusBadge('loading');

    const endpoint = this.getEndpoint();
    let onlineData = null;

    try {
      const res = await fetch(endpoint, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });

      if (res && res.ok) {
        const raw = await res.json();
        if (raw && typeof raw === 'object') {
          if (Array.isArray(raw)) {
            onlineData = raw;
          } else {
            // Firebase Realtime DB returns object with push IDs as keys { "-Oxxx": {...} }
            onlineData = Object.entries(raw).map(([k, v]) => ({
              id: k,
              ...(typeof v === 'object' ? v : {})
            }));
          }
        }
      }
    } catch (err) {
      console.warn('Online cloud database fetch failed, trying fallback endpoint:', err);
    }

    if (onlineData !== null) {
      this.rankings = onlineData;
      this.isOnlineConnected = true;
      this.updateStatusBadge('online');
    } else {
      // Fallback to local server or static seed data
      try {
        const localApiRes = await fetch('api/rankings').catch(() => fetch('public/ranking_data.json'));
        if (localApiRes && localApiRes.ok) {
          this.rankings = await localApiRes.json();
        } else {
          this.rankings = [];
        }
      } catch (e) {
        this.rankings = [];
      }
      this.isOnlineConnected = false;
      this.updateStatusBadge('offline');
    }

    this.isLoading = false;
    this.render();
  }

  async submitNewScore(entry) {
    const newEntry = {
      id: 'rank_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: (entry.name || 'Thí sinh ẩn danh').trim(),
      studentId: (entry.studentId || '').trim().toUpperCase(),
      examTitle: entry.examTitle || 'Thi thử DBI202',
      examType: entry.examType || 'standard',
      score: Number(entry.score.toFixed(1)),
      correctCount: entry.correctCount || 0,
      totalQuestions: entry.totalQuestions || 50,
      accuracy: entry.accuracy || Math.round((entry.correctCount / (entry.totalQuestions || 1)) * 100),
      timeSpentSeconds: entry.timeSpentSeconds || 0,
      date: new Date().toISOString(),
      passed: entry.score >= 5.0,
      isUserCreated: true
    };

    // Save user identity to local storage so they don't have to retype name in future tests
    if (newEntry.name) {
      this.currentUser.name = newEntry.name;
      localStorage.setItem(RANKING_STORAGE_KEYS.USER_NAME, newEntry.name);
    }
    if (newEntry.studentId) {
      this.currentUser.studentId = newEntry.studentId;
      localStorage.setItem(RANKING_STORAGE_KEYS.USER_SID, newEntry.studentId);
    }

    // NOTICE: NO localStorage for rankings!
    // Add to in-memory list immediately for instantaneous feedback
    this.rankings.unshift(newEntry);
    this.render();

    // Synchronize directly with the Online Database Endpoint
    const endpoint = this.getEndpoint();
    this.updateStatusBadge('syncing');

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry)
      });

      if (res.ok) {
        this.updateStatusBadge('online');
        // Refresh online rankings from cloud
        await this.loadRankings();
      } else {
        console.warn('Online database write returned non-200:', res.status);
        // Fallback write to local server API if running server.py
        fetch('api/rankings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newEntry)
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('Online DB write error, sending to local server fallback:', err);
      fetch('api/rankings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry)
      }).catch(() => {});
    }

    return newEntry;
  }

  async deleteEntry(id) {
    const item = this.rankings.find(r => r.id === id);
    if (!item) return;

    if (confirm(`Bạn có chắc muốn xóa kết quả của "${item.name}" khỏi Bảng xếp hạng online?`)) {
      this.rankings = this.rankings.filter(r => r.id !== id);
      this.render();

      const endpoint = this.getEndpoint();
      // If Firebase, delete specific node: /rankings/<id>.json
      if (endpoint.includes('firebaseio.com')) {
        const base = endpoint.replace(/\.json$/, '');
        try {
          await fetch(`${base}/${id}.json`, { method: 'DELETE' });
        } catch (e) {}
      }

      await this.loadRankings();
    }
  }

  exportJSON() {
    const jsonStr = JSON.stringify(this.rankings, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DBI202_Online_Rankings_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async importJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (!Array.isArray(imported)) throw new Error('Dữ liệu không đúng định dạng mảng JSON');

        const endpoint = this.getEndpoint();
        this.updateStatusBadge('syncing');

        // Post each entry to online database
        for (const item of imported) {
          if (item && item.name && typeof item.score === 'number') {
            await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item)
            }).catch(() => {});
          }
        }

        await this.loadRankings();
        alert(`Đã nhập và đồng bộ thành công ${imported.length} kết quả lên Bảng xếp hạng online!`);
      } catch (err) {
        alert('Lỗi đọc file JSON: ' + err.message);
      }
      event.target.value = '';
    };
    reader.readAsText(file);
  }

  // Database Configuration Modal Handlers
  openDbConfigModal() {
    const modal = document.getElementById('ranking-db-config-modal');
    const input = document.getElementById('db-config-endpoint-input');
    const statusEl = document.getElementById('db-config-test-status');

    if (!modal) return;
    if (input) input.value = this.getEndpoint();
    if (statusEl) statusEl.classList.add('hidden');

    modal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  closeDbConfigModal() {
    const modal = document.getElementById('ranking-db-config-modal');
    if (modal) modal.classList.add('hidden');
  }

  async testDbConnection() {
    const input = document.getElementById('db-config-endpoint-input');
    const statusEl = document.getElementById('db-config-test-status');
    const url = (input ? input.value : '').trim();

    if (!url) {
      alert('Vui lòng nhập đường dẫn URL database online!');
      return;
    }

    if (statusEl) {
      statusEl.className = 'mt-2 p-2.5 rounded-xl text-xs font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/40';
      statusEl.innerHTML = '<span class="inline-block animate-spin mr-1">⏳</span> Đang kiểm tra kết nối tới Cloud Database...';
      statusEl.classList.remove('hidden');
    }

    try {
      const res = await fetch(url, { headers: { 'Accept': 'application/json' }, cache: 'no-store' });
      if (res.ok) {
        statusEl.className = 'mt-2 p-2.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/40';
        statusEl.innerHTML = '✅ Kết nối thành công! Database online phản hồi mã HTTP ' + res.status;
      } else {
        statusEl.className = 'mt-2 p-2.5 rounded-xl text-xs font-semibold bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300/40';
        statusEl.innerHTML = '⚠️ Kết nối trả về mã lỗi HTTP ' + res.status + '. Vui lòng kiểm tra quyền truy cập (Rules read/write: true).';
      }
    } catch (err) {
      statusEl.className = 'mt-2 p-2.5 rounded-xl text-xs font-semibold bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300/40';
      statusEl.innerHTML = '❌ Không thể kết nối tới URL: ' + err.message + '. Hãy chắc chắn URL hỗ trợ CORS hoặc REST API.';
    }
  }

  async saveDbConfig() {
    const input = document.getElementById('db-config-endpoint-input');
    const url = (input ? input.value : '').trim();

    if (!url) {
      localStorage.removeItem(RANKING_STORAGE_KEYS.CLOUD_URL);
    } else {
      localStorage.setItem(RANKING_STORAGE_KEYS.CLOUD_URL, url);
    }

    this.closeDbConfigModal();
    await this.loadRankings();
    alert('Đã cập nhật cấu hình Online Cloud Database thành công!');
  }

  getProcessedRankings() {
    let list = [...this.rankings];

    // Filter by Exam Type
    if (this.filters.examType !== 'all') {
      list = list.filter(r => {
        if (!r) return false;
        const title = r.examTitle || '';
        if (this.filters.examType === 'standard') return r.examType === 'standard' || title.includes('Chuẩn FE');
        if (this.filters.examType === 'sp2026') return r.examType === 'sp2026' || title.includes('SP2026');
        if (this.filters.examType === 'quick') return r.examType === 'quick' || title.includes('Thi nhanh');
        if (this.filters.examType === 'custom') return r.examType === 'custom' || title.includes('tùy chỉnh');
        return true;
      });
    }

    // Filter by Score Tier
    if (this.filters.scoreTier !== 'all') {
      list = list.filter(r => {
        if (!r || typeof r.score !== 'number') return false;
        const s = r.score;
        if (this.filters.scoreTier === '9-10') return s >= 9.0;
        if (this.filters.scoreTier === '8-9') return s >= 8.0 && s < 9.0;
        if (this.filters.scoreTier === '6.5-8') return s >= 6.5 && s < 8.0;
        if (this.filters.scoreTier === '5-6.5') return s >= 5.0 && s < 6.5;
        if (this.filters.scoreTier === 'fail') return s < 5.0;
        return true;
      });
    }

    // Filter by Search Query
    const q = this.filters.searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(r => 
        (r.name || '').toLowerCase().includes(q) || 
        (r.studentId || '').toLowerCase().includes(q) ||
        (r.examTitle || '').toLowerCase().includes(q)
      );
    }

    // Sorting
    list.sort((a, b) => {
      const scoreA = typeof a.score === 'number' ? a.score : 0;
      const scoreB = typeof b.score === 'number' ? b.score : 0;
      const timeA = typeof a.timeSpentSeconds === 'number' ? a.timeSpentSeconds : 99999;
      const timeB = typeof b.timeSpentSeconds === 'number' ? b.timeSpentSeconds : 99999;

      if (this.filters.sortBy === 'score_desc') {
        if (scoreB !== scoreA) return scoreB - scoreA;
        if (timeA !== timeB) return timeA - timeB;
        return new Date(b.date || 0) - new Date(a.date || 0);
      }
      if (this.filters.sortBy === 'time_asc') {
        if (timeA !== timeB) return timeA - timeB;
        return scoreB - scoreA;
      }
      if (this.filters.sortBy === 'date_desc') {
        return new Date(b.date || 0) - new Date(a.date || 0);
      }
      return 0;
    });

    return list;
  }

  formatTime(seconds) {
    if (!seconds && seconds !== 0) return '0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  }

  formatDate(isoString) {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const day = d.getDate().toString().padStart(2, '0');
      const mon = (d.getMonth() + 1).toString().padStart(2, '0');
      const yr = d.getFullYear();
      const hr = d.getHours().toString().padStart(2, '0');
      const mn = d.getMinutes().toString().padStart(2, '0');
      return `${day}/${mon}/${yr} ${hr}:${mn}`;
    } catch {
      return isoString;
    }
  }

  getInitials(name) {
    if (!name) return 'DB';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  getAvatarColor(name) {
    const colors = [
      'from-blue-600 to-indigo-600',
      'from-emerald-500 to-teal-700',
      'from-purple-600 to-pink-600',
      'from-amber-500 to-orange-600',
      'from-rose-500 to-red-600',
      'from-cyan-500 to-blue-600'
    ];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  render() {
    const processed = this.getProcessedRankings();

    // 1. Overview Statistics
    this.renderStats(processed);

    // 2. Podium (Top 3)
    this.renderPodium(processed);

    // 3. User Spotlight
    this.renderUserSpotlight();

    // 4. Main Ranking Table
    this.renderTable(processed);

    if (window.lucide) lucide.createIcons();
  }

  renderStats(list) {
    const validScores = this.rankings.filter(r => r && typeof r.score === 'number');
    const totalCount = validScores.length;
    const avgScore = totalCount > 0 
      ? (validScores.reduce((sum, r) => sum + r.score, 0) / totalCount).toFixed(1) 
      : '0.0';
    const maxScore = totalCount > 0 
      ? Math.max(...validScores.map(r => r.score)).toFixed(1) 
      : '0.0';
    const passedCount = validScores.filter(r => r.score >= 5.0).length;
    const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;

    const elTotal = document.getElementById('ranking-stat-total');
    const elAvg = document.getElementById('ranking-stat-avg');
    const elMax = document.getElementById('ranking-stat-max');
    const elPass = document.getElementById('ranking-stat-pass');

    if (elTotal) elTotal.innerText = totalCount;
    if (elAvg) elAvg.innerText = avgScore;
    if (elMax) elMax.innerText = maxScore;
    if (elPass) elPass.innerText = `${passRate}%`;
  }

  renderPodium(list) {
    const podiumContainer = document.getElementById('ranking-podium-container');
    if (!podiumContainer) return;

    if (list.length === 0) {
      podiumContainer.innerHTML = '';
      podiumContainer.classList.add('hidden');
      return;
    }

    podiumContainer.classList.remove('hidden');

    const top1 = list[0];
    const top2 = list[1] || null;
    const top3 = list[2] || null;

    let html = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5 items-end pt-6 pb-2">
    `;

    // TOP 2 (Left)
    if (top2) {
      html += `
        <div class="order-2 md:order-1 p-5 rounded-3xl podium-card-silver text-center flex flex-col items-center justify-between transition-all hover:-translate-y-1">
          <div class="space-y-3 w-full">
            <div class="relative inline-block">
              <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr ${this.getAvatarColor(top2.name)} text-white font-black text-xl flex items-center justify-center shadow-md mx-auto">
                ${this.getInitials(top2.name)}
              </div>
              <span class="absolute -bottom-2.5 -right-2.5 w-7 h-7 rounded-full rank-badge-2 font-black text-xs flex items-center justify-center border-2 border-white dark:border-slate-800">
                #2
              </span>
            </div>

            <div>
              <h3 class="font-black text-base text-slate-800 dark:text-slate-100 truncate">${top2.name}</h3>
              <p class="text-xs text-slate-500 font-mono font-medium">${top2.studentId || 'Kỳ thi DBI202'}</p>
            </div>

            <div class="py-2 px-3 rounded-xl bg-white/70 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50">
              <div class="text-2xl font-black text-slate-700 dark:text-slate-200 font-mono">${(top2.score || 0).toFixed(1)}</div>
              <div class="text-[11px] text-slate-400 font-medium">Hệ 10 • ${top2.correctCount || 0}/${top2.totalQuestions || 50} câu</div>
            </div>
          </div>

          <div class="w-full pt-3 mt-2 border-t border-slate-200/40 dark:border-slate-700/40 text-xs text-slate-500 flex justify-between">
            <span class="truncate max-w-[120px]">${top2.examTitle || 'Thi thử'}</span>
            <span class="font-mono font-semibold">${this.formatTime(top2.timeSpentSeconds)}</span>
          </div>
        </div>
      `;
    } else {
      html += `<div class="order-2 md:order-1 hidden md:block"></div>`;
    }

    // TOP 1 (Center - Elevated)
    if (top1) {
      html += `
        <div class="order-1 md:order-2 p-6 rounded-3xl podium-card-gold text-center flex flex-col items-center justify-between transition-all hover:-translate-y-1 relative -mt-4 md:-mt-6 shadow-xl">
          <div class="absolute -top-6 text-3xl crown-anim">👑</div>
          
          <div class="space-y-3 w-full">
            <div class="relative inline-block mt-2">
              <div class="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-amber-950 font-black text-2xl flex items-center justify-center shadow-lg shadow-amber-500/30 mx-auto">
                ${this.getInitials(top1.name)}
              </div>
              <span class="absolute -bottom-3 -right-3 w-9 h-9 rounded-full rank-badge-1 font-black text-sm flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-md">
                🥇
              </span>
            </div>

            <div>
              <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[11px] font-extrabold uppercase tracking-wider mb-1">
                TOP 1 QUÁN QUÂN
              </div>
              <h3 class="font-black text-lg text-slate-900 dark:text-white truncate">${top1.name}</h3>
              <p class="text-xs text-amber-700 dark:text-amber-400 font-mono font-bold">${top1.studentId || 'Kỳ thi DBI202'}</p>
            </div>

            <div class="py-2.5 px-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-amber-300/60 dark:border-amber-700/60 shadow-sm">
              <div class="text-3xl font-black text-amber-600 dark:text-amber-400 font-mono">${(top1.score || 0).toFixed(1)}</div>
              <div class="text-xs text-slate-500 dark:text-slate-400 font-medium">Tuyệt đối • ${top1.correctCount || 0}/${top1.totalQuestions || 50} câu (${top1.accuracy || 100}%)</div>
            </div>
          </div>

          <div class="w-full pt-3 mt-3 border-t border-amber-200/60 dark:border-amber-800/60 text-xs text-slate-600 dark:text-slate-400 flex justify-between">
            <span class="font-semibold truncate max-w-[130px]">${top1.examTitle || 'Thi thử'}</span>
            <span class="font-mono font-bold text-amber-600 dark:text-amber-400">${this.formatTime(top1.timeSpentSeconds)}</span>
          </div>
        </div>
      `;
    }

    // TOP 3 (Right)
    if (top3) {
      html += `
        <div class="order-3 p-5 rounded-3xl podium-card-bronze text-center flex flex-col items-center justify-between transition-all hover:-translate-y-1">
          <div class="space-y-3 w-full">
            <div class="relative inline-block">
              <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr ${this.getAvatarColor(top3.name)} text-white font-black text-xl flex items-center justify-center shadow-md mx-auto">
                ${this.getInitials(top3.name)}
              </div>
              <span class="absolute -bottom-2.5 -right-2.5 w-7 h-7 rounded-full rank-badge-3 font-black text-xs flex items-center justify-center border-2 border-white dark:border-slate-800">
                #3
              </span>
            </div>

            <div>
              <h3 class="font-black text-base text-slate-800 dark:text-slate-100 truncate">${top3.name}</h3>
              <p class="text-xs text-slate-500 font-mono font-medium">${top3.studentId || 'Kỳ thi DBI202'}</p>
            </div>

            <div class="py-2 px-3 rounded-xl bg-white/70 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50">
              <div class="text-2xl font-black text-slate-700 dark:text-slate-200 font-mono">${(top3.score || 0).toFixed(1)}</div>
              <div class="text-[11px] text-slate-400 font-medium">Hệ 10 • ${top3.correctCount || 0}/${top3.totalQuestions || 50} câu</div>
            </div>
          </div>

          <div class="w-full pt-3 mt-2 border-t border-slate-200/40 dark:border-slate-700/40 text-xs text-slate-500 flex justify-between">
            <span class="truncate max-w-[120px]">${top3.examTitle || 'Thi thử'}</span>
            <span class="font-mono font-semibold">${this.formatTime(top3.timeSpentSeconds)}</span>
          </div>
        </div>
      `;
    } else {
      html += `<div class="order-3 hidden md:block"></div>`;
    }

    html += `</div>`;
    podiumContainer.innerHTML = html;
  }

  renderUserSpotlight() {
    const spotlightEl = document.getElementById('ranking-user-spotlight');
    if (!spotlightEl) return;

    const uName = this.currentUser.name;
    if (!uName) {
      spotlightEl.classList.add('hidden');
      return;
    }

    const userAttempts = this.rankings.filter(r => 
      r && (
        (r.name && r.name.trim().toLowerCase() === uName.trim().toLowerCase()) ||
        (this.currentUser.studentId && r.studentId && r.studentId.trim().toUpperCase() === this.currentUser.studentId.trim().toUpperCase())
      )
    );

    if (userAttempts.length === 0) {
      spotlightEl.classList.add('hidden');
      return;
    }

    const sorted = [...this.rankings].sort((a, b) => {
      const sa = typeof a.score === 'number' ? a.score : 0;
      const sb = typeof b.score === 'number' ? b.score : 0;
      if (sb !== sa) return sb - sa;
      return (a.timeSpentSeconds || 0) - (b.timeSpentSeconds || 0);
    });

    const bestScore = Math.max(...userAttempts.map(r => r.score || 0));
    const bestRankIdx = sorted.findIndex(r => 
      r && (
        (r.name && r.name.trim().toLowerCase() === uName.trim().toLowerCase()) ||
        (this.currentUser.studentId && r.studentId && r.studentId.trim().toUpperCase() === this.currentUser.studentId.trim().toUpperCase())
      )
    );
    const bestRank = bestRankIdx !== -1 ? bestRankIdx + 1 : '-';

    spotlightEl.classList.remove('hidden');
    spotlightEl.innerHTML = `
      <div class="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 border-2 border-blue-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-3.5">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-lg flex items-center justify-center shadow-md">
            ${this.getInitials(uName)}
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-black text-base text-slate-900 dark:text-slate-100">${uName}</span>
              ${this.currentUser.studentId ? `<span class="px-2 py-0.5 rounded text-xs font-mono font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">${this.currentUser.studentId}</span>` : ''}
              <span class="text-xs text-slate-500 font-medium">(${userAttempts.length} lượt thi online)</span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Vị trí hiện tại của bạn trên Bảng xếp hạng trực tuyến</p>
          </div>
        </div>

        <div class="flex items-center gap-5 w-full sm:w-auto justify-around sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200 dark:border-slate-700">
          <div class="text-center sm:text-right">
            <span class="text-xs text-slate-400 font-bold uppercase">Hạng tốt nhất</span>
            <div class="text-xl font-black text-blue-600 dark:text-blue-400 font-mono">#${bestRank}</div>
          </div>
          <div class="text-center sm:text-right">
            <span class="text-xs text-slate-400 font-bold uppercase">Điểm cao nhất</span>
            <div class="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">${bestScore.toFixed(1)}/10</div>
          </div>
        </div>
      </div>
    `;
  }

  renderTable(list) {
    const tbody = document.getElementById('ranking-table-body');
    const emptyState = document.getElementById('ranking-empty-state');
    const tableContainer = document.getElementById('ranking-table-container');

    if (!tbody) return;
    tbody.innerHTML = '';

    if (list.length === 0) {
      if (emptyState) emptyState.classList.remove('hidden');
      if (tableContainer) tableContainer.classList.add('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    if (tableContainer) tableContainer.classList.remove('hidden');

    list.forEach((r, idx) => {
      const rank = idx + 1;
      const tr = document.createElement('tr');
      tr.className = 'border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors';

      // Rank badge
      let rankHtml = '';
      if (rank === 1) {
        rankHtml = '<span class="inline-flex items-center justify-center w-8 h-8 rounded-xl rank-badge-1 font-black text-sm">🥇</span>';
      } else if (rank === 2) {
        rankHtml = '<span class="inline-flex items-center justify-center w-8 h-8 rounded-xl rank-badge-2 font-black text-sm">🥈</span>';
      } else if (rank === 3) {
        rankHtml = '<span class="inline-flex items-center justify-center w-8 h-8 rounded-xl rank-badge-3 font-black text-sm">🥉</span>';
      } else {
        rankHtml = `<span class="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs font-mono">#${rank}</span>`;
      }

      // Score badge color
      const scoreNum = typeof r.score === 'number' ? r.score : 0;
      let scoreBadge = '';
      if (scoreNum >= 9.0) {
        scoreBadge = `<span class="px-3 py-1 rounded-xl text-sm font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono border border-emerald-300/40">${scoreNum.toFixed(1)}</span>`;
      } else if (scoreNum >= 8.0) {
        scoreBadge = `<span class="px-3 py-1 rounded-xl text-sm font-black bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono border border-blue-300/40">${scoreNum.toFixed(1)}</span>`;
      } else if (scoreNum >= 5.0) {
        scoreBadge = `<span class="px-3 py-1 rounded-xl text-sm font-black bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-mono border border-amber-300/40">${scoreNum.toFixed(1)}</span>`;
      } else {
        scoreBadge = `<span class="px-3 py-1 rounded-xl text-sm font-black bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-mono border border-rose-300/40">${scoreNum.toFixed(1)}</span>`;
      }

      // Exam type badge
      const examTitle = r.examTitle || '';
      let examBadge = '';
      if (r.examType === 'sp2026' || examTitle.includes('SP2026')) {
        examBadge = `<span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">SP2026 FE</span>`;
      } else if (r.examType === 'quick' || examTitle.includes('Thi nhanh')) {
        examBadge = `<span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">Thi nhanh</span>`;
      } else if (r.examType === 'custom' || examTitle.includes('tùy chỉnh')) {
        examBadge = `<span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">Tùy chỉnh</span>`;
      } else {
        examBadge = `<span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">Chuẩn FE 50Q</span>`;
      }

      tr.innerHTML = `
        <td class="px-4 py-3.5 text-center">${rankHtml}</td>
        <td class="px-4 py-3.5">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-tr ${this.getAvatarColor(r.name)} text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
              ${this.getInitials(r.name)}
            </div>
            <div>
              <div class="font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                ${r.name || 'Thí sinh'}
                ${r.isUserCreated ? '<span class="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">Mới</span>' : ''}
              </div>
              <div class="text-xs text-slate-400 font-mono font-medium">${r.studentId || 'Kỳ thi DBI202'}</div>
            </div>
          </div>
        </td>
        <td class="px-4 py-3.5">${examBadge}</td>
        <td class="px-4 py-3.5 text-center">${scoreBadge}</td>
        <td class="px-4 py-3.5 text-center">
          <div class="font-bold text-xs text-slate-700 dark:text-slate-200 font-mono">${r.correctCount || 0}/${r.totalQuestions || 50}</div>
          <div class="text-[11px] text-slate-400 font-medium">${r.accuracy || 0}% đúng</div>
        </td>
        <td class="px-4 py-3.5 text-center font-mono text-xs font-bold text-slate-600 dark:text-slate-400">
          ${this.formatTime(r.timeSpentSeconds)}
        </td>
        <td class="px-4 py-3.5 text-right text-xs text-slate-400 font-mono">
          ${this.formatDate(r.date)}
        </td>
        <td class="px-4 py-3.5 text-center">
          ${r.id ? `
            <button onclick="rankingManager.deleteEntry('${r.id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors" title="Xóa kết quả này khỏi Cloud">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          ` : `
            <span class="text-slate-300 dark:text-slate-700">•</span>
          `}
        </td>
      `;

      tbody.appendChild(tr);
    });
  }
}

// Global instance
window.rankingManager = new RankingManager();
