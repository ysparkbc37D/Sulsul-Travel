/* 사용내역 통계 창 (v2.1.2, 계획 4단계 세 번째 화면 분리의 2차).
 * index.html 인라인 스크립트의 [11-B] 사용내역 통계(지출 구분·카테고리·수지)와 SVG 도넛 차트를 옮겼다.
 * 셸 함수(getActiveTrip·openModal·showToast·escapeHtml)는 부를 때 찾는다. 통계는 읽기만 하고 여행 자료를 바꾸지 않는다.
 * 동작은 data-on-click="analytics.*"로 잇는다. 불러올 때는 등록만 하고 문서를 건드리지 않는다. */
(function (root) {
  'use strict';
  const T = root.SulsulTravel = root.SulsulTravel || {};
  // 지출 입력창의 카테고리와 같은 목록이다. 통계는 이름·아이콘·색만 쓴다.
  const CATEGORIES = Object.freeze([
    { key: 'meal', label: '식사', icon: '🍽️', color: '#f59e0b' },
    { key: 'snack', label: '간식', icon: '🍰', color: '#fbbf24' },
    { key: 'drink', label: '술', icon: '🍸', color: '#a855f7' },
    { key: 'beverage', label: '음료', icon: '☕', color: '#06b6d4' },
    { key: 'lodging', label: '숙소', icon: '🏨', color: '#3b82f6' },
    { key: 'transport', label: '교통', icon: '🚕', color: '#10b981' },
    { key: 'rental', label: '렌터카', icon: '🚗', color: '#14b8a6' },
    { key: 'tour', label: '관광', icon: '🎟️', color: '#ec4899' },
    { key: 'shopping', label: '쇼핑', icon: '🛍️', color: '#8b5cf6' },
    { key: 'etc', label: '기타', icon: '📦', color: '#64748b' }
  ].map(Object.freeze));
  const TABS = ['method', 'cat', 'type'];
  const TAB_IDS = { method: 'exp-stat-tab-method', cat: 'exp-stat-tab-cat', type: 'exp-stat-tab-type' };
  const HEX = /^#[0-9a-f]{3,8}$/i;
  // 공유 사본에서 들어온 금액이 글자여도 더하기가 문자열 잇기로 바뀌지 않게 숫자로 읽는다.
  const krwOf = expense => { const value = Number(expense?.krw); return Number.isFinite(value) ? value : 0; };
  const won = value => `₩${Math.round(value).toLocaleString()}`;
  let activeTab = 'method';

  function open() {
    if (!getActiveTrip()) {
      showToast('⚠️ 선택된 여행이 없습니다.');
      return;
    }
    openModal('modal-expense-analytics');
    switchTab('method');
  }

  function switchTab(tab) {
    activeTab = TABS.includes(tab) ? tab : 'method';
    for (const [key, id] of Object.entries(TAB_IDS)) {
      const button = document.getElementById(id);
      if (!button) continue;
      button.className = key === activeTab ? 'flex-1 py-1.5 exp-pill-btn active-card' : 'flex-1 py-1.5 exp-pill-btn';
      button.setAttribute('aria-pressed', String(key === activeTab));
    }
    render(activeTab);
  }

  function methodView(expenseItems) {
    let card = 0, cardCount = 0, cash = 0, cashCount = 0;
    for (const expense of expenseItems) {
      if (expense.payMethod === 'cash') { cash += krwOf(expense); cashCount++; }
      else { card += krwOf(expense); cardCount++; }
    }
    const total = card + cash || 1, cardPct = Math.round((card / total) * 100), cashPct = 100 - cardPct;
    const slices = [];
    if (card > 0) slices.push({ label: '카드', value: card, color: '#0284c7' });
    if (cash > 0) slices.push({ label: '현금', value: cash, color: '#10b981' });
    return {
      slices, title: '지출 구분', sub: `${cardPct} : ${cashPct}`,
      rows: [
        { icon: '💳', label: '카드 지출', count: cardCount, pct: cardPct, amountKrw: card, barClass: 'bg-sky-500' },
        { icon: '💵', label: '현금 지출', count: cashCount, pct: cashPct, amountKrw: cash, barClass: 'bg-emerald-500' }
      ]
    };
  }

  function categoryView(expenseItems, totalExpense) {
    const map = new Map(CATEGORIES.map(cat => [cat.key, { ...cat, amountKrw: 0, count: 0 }]));
    for (const expense of expenseItems) {
      let key = expense.cat || 'etc';
      if (key === 'food') key = 'meal';
      if (key === 'flight') key = 'transport';
      if (!map.has(key)) key = 'etc';
      const entry = map.get(key);
      entry.amountKrw += krwOf(expense);
      entry.count++;
    }
    const used = [...map.values()].filter(cat => cat.amountKrw > 0).sort((a, b) => b.amountKrw - a.amountKrw);
    const denom = totalExpense || 1;
    return {
      slices: used.map(cat => ({ label: cat.label, value: cat.amountKrw, color: cat.color })),
      title: '카테고리', sub: `${used.length}가지 항목`,
      rows: used.map(cat => ({ icon: cat.icon, label: cat.label, count: cat.count, pct: Math.round((cat.amountKrw / denom) * 100), amountKrw: cat.amountKrw, color: cat.color }))
    };
  }

  function flowView(expenses, expenseItems, incomeItems, totalExpense, totalIncome) {
    const total = totalExpense + totalIncome || 1, expPct = Math.round((totalExpense / total) * 100), incPct = 100 - expPct;
    const slices = [];
    if (totalExpense > 0) slices.push({ label: '지출', value: totalExpense, color: '#f43f5e' });
    if (totalIncome > 0) slices.push({ label: '수입', value: totalIncome, color: '#10b981' });
    return {
      slices, title: '수지 현황', sub: `지출 ${expPct}%`,
      rows: [
        { icon: '🔴', label: '총 지출', count: expenseItems.length, pct: expPct, amountKrw: totalExpense, barClass: 'bg-rose-500' },
        { icon: '🟢', label: '총 수입', count: incomeItems.length, pct: incPct, amountKrw: totalIncome, barClass: 'bg-emerald-500' },
        { icon: '⚖️', label: '순 지출 (지출 - 수입)', count: expenses.length, pct: 100, amountKrw: totalExpense - totalIncome, barClass: 'bg-amber-500', summary: true }
      ]
    };
  }

  // 막대의 색과 너비는 한 style 속성에 함께 둔다. 예전에는 style이 두 번 붙어 카테고리 막대의 너비가 무시되고 모두 가득 찼다.
  function rowHtml(row) {
    const widthPct = Math.min(100, Math.max(3, Number(row.pct) || 0));
    const color = row.color && HEX.test(row.color) ? `background-color:${escapeHtml(row.color)};` : '';
    return `
      <div class="exp-stat-row p-3 bg-[#0f1422] rounded-xl border border-[#1e263c] space-y-1.5 hover:border-[#2a3650] transition">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-sm" aria-hidden="true">${escapeHtml(row.icon)}</span>
            <span class="text-xs font-bold text-white">${escapeHtml(row.label)}</span>
            <span class="text-[10px] text-slate-400">(${Number(row.count)}건)</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#141c2e] text-slate-300 border border-[#23304c]">${Number(row.pct)}%</span>
            <span class="text-xs font-black ${row.summary ? 'text-amber-400' : 'text-white'}">${escapeHtml(won(row.amountKrw))}</span>
          </div>
        </div>
        <div class="w-full bg-[#080b12] rounded-full h-1.5 overflow-hidden">
          <div class="exp-stat-bar h-1.5 rounded-full ${escapeHtml(row.barClass || '')}" style="${escapeHtml(color)}width:${widthPct}%;"></div>
        </div>
      </div>`;
  }

  function render(tab = activeTab) {
    const trip = getActiveTrip();
    if (!trip) return;
    const expenses = Array.isArray(trip.expenses) ? trip.expenses : [];
    const expenseItems = expenses.filter(e => e?.type !== 'income');
    const incomeItems = expenses.filter(e => e?.type === 'income');
    const totalExpense = expenseItems.reduce((sum, e) => sum + krwOf(e), 0);
    const totalIncome = incomeItems.reduce((sum, e) => sum + krwOf(e), 0);
    const totalEl = document.getElementById('exp-stat-total-krw');
    const subEl = document.getElementById('exp-stat-count-sub');
    const listEl = document.getElementById('exp-stat-breakdown-list');
    if (totalEl) totalEl.textContent = `${Math.round(totalExpense).toLocaleString()} KRW`;
    if (subEl) subEl.textContent = `총 ${expenses.length}건의 내역 (지출 ${expenseItems.length}건 · 수입 ${incomeItems.length}건)`;
    if (!expenses.length) {
      donut([], '기록 없음', '0건');
      if (listEl) listEl.innerHTML = '<div class="p-6 text-center text-xs text-slate-500">등록된 지출 또는 수입 내역이 없습니다.</div>';
      return;
    }
    const view = tab === 'cat' ? categoryView(expenseItems, totalExpense)
      : tab === 'type' ? flowView(expenses, expenseItems, incomeItems, totalExpense, totalIncome)
      : methodView(expenseItems);
    donut(view.slices, view.title, view.sub);
    if (listEl) listEl.innerHTML = view.rows.map(rowHtml).join('');
  }

  function donut(slices, centerTitle, centerSub) {
    const container = document.getElementById('exp-donut-chart-box');
    const centerText = document.getElementById('exp-donut-center-text');
    if (!container) return;
    const total = slices.reduce((sum, slice) => sum + slice.value, 0);
    if (total <= 0) {
      container.innerHTML = '<svg viewBox="0 0 200 200" class="w-full h-full" role="img" aria-label="기록 없음"><circle cx="100" cy="100" r="70" fill="transparent" stroke="#1e263c" stroke-width="26" /><text x="100" y="105" text-anchor="middle" class="text-xs fill-slate-500 font-bold">기록 없음</text></svg>';
      if (centerText) centerText.textContent = '';
      return;
    }
    const r = 70, circumference = 2 * Math.PI * r;
    let offset = 0;
    const slicesSvg = slices.map(slice => {
      const length = (slice.value / total) * circumference;
      const detail = `${slice.label}: ${won(slice.value)} (${Math.round((slice.value / total) * 100)}%)`;
      const color = HEX.test(slice.color) ? slice.color : '#64748b';
      const circle = `<circle cx="100" cy="100" r="70" fill="transparent" stroke="${escapeHtml(color)}" stroke-width="26" stroke-dasharray="${Number(length)} ${Number(circumference - length)}" stroke-dashoffset="${Number(-offset)}" transform="rotate(-90 100 100)" class="donut-slice" data-on-click="analytics.slice" data-detail="${escapeHtml(detail)}"><title>${escapeHtml(detail)}</title></circle>`;
      offset += length;
      return circle;
    }).join('');
    container.innerHTML = `
      <svg viewBox="0 0 200 200" class="w-full h-full drop-shadow" role="img" aria-label="${escapeHtml(`${centerTitle} ${centerSub}`)}">
        <circle cx="100" cy="100" r="70" fill="transparent" stroke="#080b12" stroke-width="26" />
        ${slicesSvg}
        <text x="100" y="94" text-anchor="middle" fill="#94a3b8" font-size="11" font-weight="700">${escapeHtml(centerTitle)}</text>
        <text x="100" y="114" text-anchor="middle" fill="#ffffff" font-size="14" font-weight="900">${escapeHtml(centerSub)}</text>
      </svg>`;
    if (centerText) centerText.innerHTML = '<span class="text-[11px] text-slate-400">도넛 섹션을 탭하여 세부 금액을 확인하세요</span>';
  }

  const api = Object.freeze({ CATEGORIES, open, switchTab, render, donut, activeTab: () => activeTab });
  T.ExpenseAnalytics = api;

  T.UiActions.define('analytics', {
    tab: element => api.switchTab(element.dataset.tab),
    slice: element => showToast(element.dataset.detail || '')
  });
})(typeof window !== 'undefined' ? window : globalThis);
