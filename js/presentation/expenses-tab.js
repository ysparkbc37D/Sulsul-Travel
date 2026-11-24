/* 가계부 탭 본문 (v2.1.1, 계획 4단계 세 번째 화면 분리의 1차).
 * index.html 인라인 스크립트 [5]의 화면 부분(지갑 보드, 빠른 환율 계산기, 지출·환전 목록과 보기 전환, 환전 기록 삭제)을 옮겼다.
 * 공용 환율 계산(CURRENCY_INFO·getCurrencyRate·calculateTripWallets)은 오늘 화면·지출 편집기도 쓰므로 셸에 남는다.
 * 셸·다른 화면의 함수(getActiveTrip·commitTripCommand·renderActiveTripWorkspace·showConfirmDelete·showToast·escapeHtml·getCategoryIcon,
 * openAddExpenseModal·openEditExpenseModal·requestDeleteExpense·renderExpenseCurrencyChips·updateExpenseInlineKrwPreview,
 * triggerReceiptScan·handleReceiptScan)는 부를 때 찾는다.
 * 환전 창과 환율 관리는 exchange-ui.js(SulsulTravel.ExchangeUI), 초기 자산·통화 선택 창은 budget-ui.js(SulsulTravel.BudgetUI),
 * 사용내역 통계는 expense-analytics.js(SulsulTravel.ExpenseAnalytics)다.
 * 여행 자료 값(통화 코드·날짜·메모·이름)은 모두 escapeHtml로 넣는다. 옮기기 전에는 일부가 그대로 들어갔다(공유 사본 자료도 여기에 그려진다).
 * SulsulTravel.ExpensesTab은 얼리지 않는다. 검사가 render를 바꿔 '저장 뒤 화면 오류'를 재현하므로 안에서 다시 그릴 때도 api.render()를 부른다. */
(function (root) {
  'use strict';
  const T = root.SulsulTravel = root.SulsulTravel || {};
  const api = {};
  const NO_DECIMALS = ['KRW', 'JPY', 'VND', 'CLP'];
  const money = (value, curr) => (Number(value) || 0).toLocaleString(undefined, { minimumFractionDigits: NO_DECIMALS.includes(curr) ? 0 : 2, maximumFractionDigits: 2 });
  const info = curr => CURRENCY_INFO[curr] || {};

  function walletCardHtml(walletData, curr) {
    const w = walletData.wallets[curr];
    if (!w) return '';
    const negative = w.balance < 0;
    const rate = getCurrencyRate(curr);
    const codeHtml = escapeHtml(curr);
    const rateHtml = curr !== 'KRW' ? `<span class="text-[9px] text-slate-400 font-mono">1 ${codeHtml}=₩${rate.toLocaleString()}</span>` : '';
    const exchangeHtml = curr !== 'KRW'
      ? `<button type="button" data-on-click="expenses.exchangeFor" data-curr="${codeHtml}" class="text-[9px] text-amber-400 hover:text-amber-300 font-bold px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 cursor-pointer transition flex items-center gap-0.5" title="${codeHtml} 환전하기"><i class="fa-solid fa-arrow-right-arrow-left text-[8px]"></i> 환전</button>`
      : '';
    return `
      <div class="wallet-card p-2.5 rounded-xl bg-[#080b12] border ${negative ? 'border-rose-500/40' : 'border-[#1e263c]'} flex flex-col justify-between transition">
        <div class="flex items-center justify-between gap-1">
          <span class="text-xs font-black text-white flex items-center gap-1 truncate">
            <span>${escapeHtml(w.flag)}</span>
            <span>${escapeHtml(w.curr)}</span>
          </span>
          <div class="flex items-center gap-1 shrink-0">
            <span class="text-[9px] text-slate-400 truncate">${escapeHtml(String(w.name || '').split(' ')[0])}</span>
            ${exchangeHtml}
          </div>
        </div>
        <div class="my-1">
          <div class="text-sm font-black ${negative ? 'text-rose-400' : 'text-white'} tracking-tight truncate">
            ${escapeHtml(w.symbol)}${escapeHtml(money(w.balance, curr))}
          </div>
        </div>
        <div class="text-[10px] flex items-center justify-between gap-1 pt-1 border-t border-[#1a2236]/60">
          <span class="text-amber-400/90 font-medium truncate">
            ${curr === 'KRW' ? '원화 자금' : `≈ ₩${(w.krwValue || 0).toLocaleString()}`}
          </span>
          <div class="flex items-center gap-1.5 shrink-0 text-[9px]">
            ${rateHtml}
            ${w.income > 0 ? `<span class="text-emerald-400 font-bold">+${escapeHtml(w.symbol)}${(w.income || 0).toLocaleString()}</span>` : ''}
          </div>
        </div>
      </div>`;
  }

  function renderWalletsBoard(trip, walletData) {
    const countBadge = document.getElementById('exp-wallets-count-badge');
    const container = document.getElementById('exp-wallets-container');
    if (countBadge) countBadge.innerText = `${walletData.activeCurrencies.length}개 통화 지갑`;
    if (!container) return;
    container.innerHTML = walletData.activeCurrencies.map(curr => walletCardHtml(walletData, curr)).join('');
    initQuickCalc(walletData);
    if (typeof updateBudgetPacingHud === 'function') updateBudgetPacingHud(trip, walletData);
  }

  // ---- 빠른 환율 계산기(지갑 보드 아래) ----
  function updateQuickCalc() {
    const input = document.getElementById('quick-calc-input');
    const currSelect = document.getElementById('quick-calc-curr');
    const resultEl = document.getElementById('quick-calc-result');
    const badgeEl = document.getElementById('quick-calc-rate-badge');
    if (!currSelect) return;
    const curr = currSelect.value || 'USD';
    const rate = getCurrencyRate(curr);
    const formattedRate = rate.toLocaleString(undefined, { minimumFractionDigits: rate < 10 ? 2 : (curr === 'ARS' ? 2 : 0), maximumFractionDigits: 2 });
    if (badgeEl) badgeEl.innerText = `1 ${curr} = ₩${formattedRate}${curr === 'ARS' && State.isMepEnabled ? ' (MEP)' : ''}`;
    const krw = Math.round((parseFloat(input?.value) || 0) * rate);
    if (resultEl) resultEl.innerText = `≈ ₩${krw.toLocaleString()}`;
  }

  function setQuickCalcAmount(amount) {
    const input = document.getElementById('quick-calc-input');
    if (!input) return;
    input.value = amount;
    updateQuickCalc();
  }

  function initQuickCalc(walletData) {
    const currSelect = document.getElementById('quick-calc-curr');
    if (!currSelect || !walletData) return;
    const active = walletData.activeCurrencies || ['KRW'];
    const foreign = active.filter(c => c !== 'KRW');
    const targets = foreign.length > 0 ? foreign : active;
    const current = currSelect.value;
    currSelect.innerHTML = targets.map(c => `<option value="${escapeHtml(c)}" ${c === current ? 'selected' : ''}>${escapeHtml(info(c).flag || '')} ${escapeHtml(c)}</option>`).join('');
    if (!targets.includes(currSelect.value)) currSelect.value = targets[0];
    updateQuickCalc();
  }

  function openExchangeFor(curr) {
    SulsulTravel.ExchangeUI.open();
    const toSelect = document.getElementById('exch-form-to-curr');
    const fromSelect = document.getElementById('exch-form-from-curr');
    if (curr && curr !== 'KRW') {
      if (toSelect) toSelect.value = curr;
      if (fromSelect) fromSelect.value = 'KRW';
    } else if (curr === 'KRW') {
      const foreign = (getActiveTrip()?.activeCurrencies || []).find(c => c !== 'KRW');
      if (foreign && toSelect) toSelect.value = foreign;
    }
    SulsulTravel.ExchangeUI.updateRate();
  }

  function applyQuickCalcToExpense() {
    const amount = Number(document.getElementById('quick-calc-input')?.value) || 0;
    const curr = document.getElementById('quick-calc-curr')?.value || 'KRW';
    if (amount <= 0) { showToast('계산기에 금액을 먼저 입력해 주세요.'); return; }
    openAddExpenseModal();
    const amountInput = document.getElementById('exp-form-amount');
    if (amountInput) amountInput.value = amount;
    renderExpenseCurrencyChips(curr);
    updateExpenseInlineKrwPreview();
  }

  // ---- 지출·환전 목록 ----
  const ACTIVE_VIEW = 'px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer bg-amber-500/20 text-amber-300 border border-amber-500/30';
  const IDLE_VIEW = 'px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-white bg-[#0f1422] border border-transparent';
  function switchView(subTab) {
    State.activeExpenseSubTab = subTab === 'exchanges' ? 'exchanges' : 'expenses';
    const exchanges = State.activeExpenseSubTab === 'exchanges';
    const expBtn = document.getElementById('exp-view-tab-expenses'), exchBtn = document.getElementById('exp-view-tab-exchanges');
    if (expBtn) { expBtn.className = exchanges ? IDLE_VIEW : ACTIVE_VIEW; expBtn.setAttribute('aria-pressed', String(!exchanges)); }
    if (exchBtn) { exchBtn.className = exchanges ? ACTIVE_VIEW : IDLE_VIEW; exchBtn.setAttribute('aria-pressed', String(exchanges)); }
    document.getElementById('expenses-list-container')?.classList.toggle('hidden', exchanges);
    document.getElementById('exchanges-list-container')?.classList.toggle('hidden', !exchanges);
    api.render();
  }

  function render() {
    const trip = getActiveTrip();
    if (!trip) return;
    const walletData = calculateTripWallets(trip);
    renderWalletsBoard(trip, walletData);
    const expenses = trip.expenses || [];
    const expCount = expenses.filter(e => e.type !== 'income').length;
    const incCount = expenses.filter(e => e.type === 'income').length;
    const exchCount = (trip.exchanges || []).length;
    const expBadge = document.getElementById('exp-count-badge'), exchBadge = document.getElementById('exch-count-badge'), hint = document.getElementById('exp-tab-summary-hint');
    if (expBadge) expBadge.innerText = expenses.length;
    if (exchBadge) exchBadge.innerText = exchCount;
    if (hint) {
      const parts = [`지출 ${expCount}건`];
      if (incCount > 0) parts.push(`수입 ${incCount}건`);
      if (exchCount > 0) parts.push(`환전 ${exchCount}건`);
      hint.innerText = `총 ${parts.join(' · ')} (자산 실시간 정산 중)`;
    }
    if ((State.activeExpenseSubTab || 'expenses') === 'exchanges') renderExchangesList(trip);
    else renderExpensesList(trip);
  }

  const NOTE_BADGE_HTML = '<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20 shrink-0">📝 단순 기록</span>';
  const emeraldBadgeHtml = contentHtml => `<span class="sulsul-badge-emerald px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 shrink-0">${contentHtml}</span>`;
  const skyBadgeHtml = contentHtml => `<span class="sulsul-badge-sky px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-100 text-sky-800 border border-sky-300 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800 shrink-0">${contentHtml}</span>`;
  function paymentBadgeHtml(exp) {
    const walletCurr = exp.walletCurr || exp.curr || 'KRW';
    const fromKrwCard = exp.paymentSource === 'wallet_krw' || (exp.curr !== 'KRW' && exp.walletCurr === 'KRW');
    if (exp.type === 'income') {
      if (exp.paymentSource === 'none') return NOTE_BADGE_HTML;
      if (fromKrwCard) return emeraldBadgeHtml('🇰🇷 KRW 입금');
      return emeraldBadgeHtml(`${escapeHtml(info(walletCurr).flag || '💵')} ${escapeHtml(walletCurr)} 지갑 입금`);
    }
    if (fromKrwCard) return skyBadgeHtml('💳 한국 카드');
    if (exp.payMethod === 'cash') return emeraldBadgeHtml(`${escapeHtml(info(walletCurr).flag || '💵')} 현금`);
    if (exp.paymentSource === 'none') return NOTE_BADGE_HTML;
    return skyBadgeHtml(`${escapeHtml(info(walletCurr).flag || '💳')} 카드`);
  }

  function expensePhotoHtml(exp) {
    const iconHtml = escapeHtml(getCategoryIcon(exp.cat));
    if (!Array.isArray(exp.photos) || !exp.photos.length) return `<span class="expense-entry-thumb expense-entry-default">${iconHtml}</span>`;
    const pIdx = exp.primaryPhotoIndex >= 0 && exp.primaryPhotoIndex < exp.photos.length ? exp.primaryPhotoIndex : 0;
    return `
      <div class="expense-entry-thumb">
        <img src="${escapeHtml(SulsulTravel.TripTransfer.safePhoto(exp.photos[pIdx]))}" class="w-full h-full object-cover" alt="대표사진">
        <span class="absolute bottom-0 right-0 w-4 h-4 rounded-tl-md bg-[#080b12]/90 flex items-center justify-center text-[9px]">${iconHtml}</span>
        ${exp.photos.length > 1 ? `<span class="absolute top-0.5 right-0.5 px-1 rounded bg-black/75 text-[8px] font-bold text-white">+${exp.photos.length}</span>` : ''}
      </div>`;
  }

  function renderExpensesList(trip) {
    const container = document.getElementById('expenses-list-container');
    if (!container) return;
    const expenses = trip.expenses || [];
    if (!expenses.length) {
      container.innerHTML = `
        <div class="p-8 text-center rounded-2xl bg-[#0f1422] border border-[#1e263c] space-y-3 shadow-lg">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center text-2xl shadow-inner">💳</div>
          <div class="space-y-1">
            <h4 class="text-sm font-black text-white">등록된 지출 내역이 없습니다</h4>
            <p class="text-xs text-slate-400">현지 영수증을 촬영(OCR)하거나 첫 지출을 등록해 스마트 가계부를 시작하세요.</p>
          </div>
          <div class="flex items-center justify-center gap-2 pt-1 flex-wrap">
            <button type="button" data-on-click="expenses.add" class="btn-gold px-4 py-2 rounded-xl text-xs font-black shadow-md cursor-pointer">+ 첫 지출 등록하기</button>
            <button type="button" data-on-click="expenses.receiptScan" class="btn-surface px-4 py-2 rounded-xl text-xs font-bold cursor-pointer hover:text-white flex items-center gap-1.5"><i class="fa-solid fa-camera text-amber-400"></i> 영수증 자동 스캔</button>
          </div>
        </div>`;
      return;
    }
    container.innerHTML = expenses.map((exp, expIdx) => {
      const titleHtml = escapeHtml(exp.title);
      const isIncome = exp.type === 'income';
      const typeBadgeHtml = isIncome ? emeraldBadgeHtml('수입') : '';
      const memoHtml = exp.memo ? `<div class="text-[10px] text-slate-400 truncate mt-0.5 flex items-center gap-1"><i class="fa-regular fa-comment-dots text-[9px] text-slate-500 shrink-0"></i><span class="truncate">${escapeHtml(exp.memo)}</span></div>` : '';
      return `
        <article class="expense-entry">
          <button type="button" class="expense-entry-open" data-on-click="expenses.edit" data-index="${expIdx}" aria-label="${titleHtml} 편집 및 사진 보기">
            ${expensePhotoHtml(exp)}
            <span class="expense-entry-copy"><strong>${titleHtml}</strong><span class="expense-entry-badges">${typeBadgeHtml}${paymentBadgeHtml(exp)}</span><small>${escapeHtml([exp.date, exp.time].filter(Boolean).join(' '))} · ${escapeHtml(exp.curr)} ${(exp.amount || 0).toLocaleString()}</small>${memoHtml}</span>
            <span class="expense-entry-amount"><strong>${isIncome ? '+' : ''}₩${(exp.krw || 0).toLocaleString()}</strong><small>원화 환산</small></span>
          </button>
          <div class="expense-entry-actions"><button type="button" data-on-click="expenses.edit" data-index="${expIdx}" aria-label="${titleHtml} 편집"><i class="fa-solid fa-pen" aria-hidden="true"></i></button><button type="button" data-on-click="expenses.remove" data-index="${expIdx}" aria-label="${titleHtml} 삭제"><i class="fa-regular fa-trash-can" aria-hidden="true"></i></button></div>
        </article>`;
    }).join('');
  }

  function exchangeRateText(x) {
    if (!x.rate) return '';
    const rate = Number(x.rate).toLocaleString();
    if (x.fromCurr === 'KRW') return `적용환율 ₩${rate}/${x.toCurr}`;
    if (x.toCurr === 'KRW') return `적용환율 ₩${rate}/${x.fromCurr}`;
    return `환율 1 ${x.fromCurr} = ${rate} ${x.toCurr}`;
  }

  function renderExchangesList(trip) {
    const container = document.getElementById('exchanges-list-container');
    if (!container) return;
    const exchanges = trip.exchanges || [];
    if (!exchanges.length) {
      container.innerHTML = `
        <div class="p-8 text-center rounded-2xl bg-[#0f1422] border border-[#1e263c] space-y-3 shadow-lg">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center text-2xl shadow-inner">💱</div>
          <div class="space-y-1">
            <h4 class="text-sm font-black text-white">등록된 환전 내역이 없습니다</h4>
            <p class="text-xs text-slate-400">한국 원화를 외화로 환전하거나 외화 간 환전을 등록하여 지갑 잔액을 관리하세요.</p>
          </div>
          <div class="pt-1">
            <button type="button" data-on-click="expenses.exchange" class="btn-gold px-4 py-2 rounded-xl text-xs font-black shadow-md cursor-pointer inline-flex items-center gap-1.5"><i class="fa-solid fa-arrow-right-arrow-left text-[10px]"></i> 첫 환전 등록하기</button>
          </div>
        </div>`;
      return;
    }
    container.innerHTML = exchanges.map((x, xIdx) => {
      const from = info(x.fromCurr), to = info(x.toCurr);
      return `
        <div class="p-3.5 bg-[#0f1422] rounded-xl border border-[#1e263c] flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <span class="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center text-sm border border-amber-500/20 shrink-0">💱</span>
            <div class="min-w-0">
              <div class="font-bold text-white text-xs flex items-center gap-1.5 flex-wrap">
                <span class="text-rose-400 font-bold">${escapeHtml(from.flag || '')} -${escapeHtml(from.symbol || x.fromCurr)}${(Number(x.fromAmount) || 0).toLocaleString()} ${escapeHtml(x.fromCurr)}</span>
                <span class="text-slate-500">➔</span>
                <span class="text-emerald-400 font-black">${escapeHtml(to.flag || '')} +${escapeHtml(to.symbol || x.toCurr)}${(Number(x.toAmount) || 0).toLocaleString()} ${escapeHtml(x.toCurr)}</span>
              </div>
              <div class="text-[10px] text-slate-400 mt-0.5">${escapeHtml(x.date || '')} · ${escapeHtml(x.memo || '환전')} · ${escapeHtml(exchangeRateText(x))}</div>
            </div>
          </div>
          <button type="button" data-on-click="expenses.removeExchange" data-index="${xIdx}" class="w-7 h-7 rounded-lg bg-[#080b12] hover:bg-rose-500/20 border border-[#1a2236] hover:border-rose-500/30 text-slate-400 hover:text-rose-400 flex items-center justify-center text-xs transition cursor-pointer shrink-0" title="환전 기록 취소/삭제" aria-label="환전 기록 취소/삭제">
            <i class="fa-regular fa-trash-can text-[11px]"></i>
          </button>
        </div>`;
    }).join('');
  }

  function removeExchange(exchIdx, event) {
    if (event) event.stopPropagation();
    const trip = getActiveTrip();
    if (!trip || !trip.exchanges || !trip.exchanges[exchIdx]) return;
    const exch = trip.exchanges[exchIdx];
    const expectedRevision = trip.revision;
    showConfirmDelete(
      '환전 내역을 취소하시겠습니까?',
      `${exch.fromCurr} ${Number(exch.fromAmount).toLocaleString()} ➔ ${exch.toCurr} ${Number(exch.toAmount).toLocaleString()}`,
      '환전이 취소되어 출금 통화 잔액이 복구되고 입금 통화 잔액이 차감됩니다.',
      async () => {
        // 확인 창을 연 뒤 여행이 바뀌었으면 다른 환전을 지우지 않도록 거절한다. 실패하면 창을 남긴다.
        const removed = await commitTripCommand({ tripId: trip.id, expectedRevision, change: target => {
          const index = (target.exchanges || []).findIndex((item, position) => exch.id ? item.id === exch.id : position === exchIdx);
          if (index >= 0) target.exchanges.splice(index, 1);
        } });
        if (!removed) return false;
        renderActiveTripWorkspace();
        showToast('🗑️ 환전 기록이 취소되어 지갑 잔액이 복구되었습니다.');
      }
    );
  }

  // 영수증 파일 고르기 버튼이 여는 숨은 입력(이 두 개만 연다)
  const RECEIPT_INPUTS = ['exp-tab-receipt-camera', 'exp-tab-receipt-file'];
  const index = element => Number(element.dataset.index);
  T.UiActions.define('expenses', {
    view: element => switchView(element.dataset.view),
    add: () => openAddExpenseModal(),
    edit: (element, event) => openEditExpenseModal(index(element), event),
    remove: (element, event) => requestDeleteExpense(index(element), event),
    removeExchange: (element, event) => removeExchange(index(element), event),
    exchange: () => SulsulTravel.ExchangeUI.open(),
    exchangeFor: element => openExchangeFor(element.dataset.curr),
    quickCalcExchange: () => openExchangeFor(document.getElementById('quick-calc-curr')?.value),
    quickCalcInput: () => updateQuickCalc(),
    quickCalcAmount: element => setQuickCalcAmount(Number(element.dataset.amount)),
    quickCalcApply: () => applyQuickCalcToExpense(),
    refreshRates: () => SulsulTravel.ExchangeUI.refreshLiveRates(true),
    ratesManager: () => SulsulTravel.ExchangeUI.openRatesManager(),
    initialFunds: () => SulsulTravel.BudgetUI.openInitialFunds(),
    addCurrency: () => SulsulTravel.BudgetUI.openAddCurrency(),
    analytics: () => SulsulTravel.ExpenseAnalytics.open(),
    receiptScan: () => triggerReceiptScan(),
    receiptPick: element => { if (RECEIPT_INPUTS.includes(element.dataset.target)) document.getElementById(element.dataset.target)?.click(); },
    receiptFile: (element, event) => handleReceiptScan(event)
  });

  Object.assign(api, { render, switchView, updateQuickCalc, setQuickCalcAmount, applyQuickCalcToExpense, openExchangeFor, removeExchange });
  T.ExpensesTab = api;
})(typeof window !== 'undefined' ? window : globalThis);
