/* 초기 자산·예산 창과 통화 선택 창 (v2.1.2, 계획 4단계 세 번째 화면 분리의 2차).
 * index.html 인라인 스크립트의 [11.2] 초기 자산 및 총 예산 관리 창과 [11.3] 전세계 통화 선택 창을 옮겼다.
 * 공용 환율 계산(CURRENCY_INFO·getCurrencyRate·getCurrencySymbol·calculateTripWallets)과 셸 함수(getActiveTrip·commitTrip·
 * renderActiveTripWorkspace·openModal·closeModal·showToast·showConfirmDelete·escapeHtml), 지출 입력창의 selectExpenseCurrency는 부를 때 찾는다.
 * 초기 자산 창은 저장 전까지 여행 자료를 바꾸지 않는다. 입력과 통화 목록은 이 파일의 초안(draft)에만 두고, 저장할 때 commitTrip으로 한 번에 쓴다.
 * 동작은 data-on-click·data-on-change·data-on-input="budget.*"로 잇는다. 불러올 때는 등록만 하고 문서를 건드리지 않는다. */
(function (root) {
  'use strict';
  const T = root.SulsulTravel = root.SulsulTravel || {};
  const NO_DECIMALS = ['KRW', 'JPY', 'VND', 'CLP'];
  const REGIONS = ['ALL', 'ASIA', 'EUROPE', 'AMERICAS', 'OCEANIA', 'MEA'];
  const info = curr => CURRENCY_INFO[curr] || { name: curr, flag: '🌐', symbol: curr, rate: 1 };
  const isOpen = id => { const modal = document.getElementById(id); return !!modal && !modal.classList.contains('sheet-closed'); };
  const hasDecimals = curr => !NO_DECIMALS.includes(curr);
  const money = (value, decimals) => value.toLocaleString(undefined, { minimumFractionDigits: decimals ? 2 : 0, maximumFractionDigits: decimals ? 2 : 0 });

  // ---- 초기 자산·예산 창 ----
  // 창을 연 여행과 기준 통화, 통화 목록, 통화별 입력값. 저장하기 전에는 여행 자료에 쓰지 않는다.
  let draft = null;

  function storedBalance(trip, curr, base) {
    if (trip.initialBalances && trip.initialBalances[curr] != null) return Number(trip.initialBalances[curr]) || 0;
    return curr === base ? (Number(trip.budget) || 0) : 0;
  }

  // 다시 그리기 전에 입력칸의 값을 초안으로 옮긴다. 기준 통화를 바꾸거나 통화를 더하고 빼도 입력한 금액이 남는다.
  function captureInputs() {
    if (!draft) return;
    for (const curr of draft.currencies) {
      const input = document.getElementById(`init-fund-input-${curr}`);
      if (input) draft.balances[curr] = parseFloat(input.value) || 0;
    }
  }

  function openInitialFunds() {
    const trip = getActiveTrip();
    if (!trip) return;
    const base = (trip.currency && CURRENCY_INFO[trip.currency]) ? trip.currency : 'KRW';
    let currencies = (Array.isArray(trip.activeCurrencies) && trip.activeCurrencies.length > 0)
      ? trip.activeCurrencies.filter(c => CURRENCY_INFO[c])
      : calculateTripWallets(trip).activeCurrencies.slice();
    currencies = [...new Set(currencies)];
    if (!currencies.includes(base)) currencies.unshift(base);
    const balances = {};
    for (const curr of currencies) balances[curr] = storedBalance(trip, curr, base);
    draft = { tripId: trip.id, base, currencies, balances, syncBudget: true };

    const chkSync = document.getElementById('chk-sync-initial-budget');
    if (chkSync) chkSync.checked = true;
    document.getElementById('init-funds-custom-budget-row')?.classList.add('hidden');
    const customBudget = document.getElementById('init-funds-custom-budget');
    if (customBudget) customBudget.value = '';
    renderInitialFunds();
    openModal('modal-initial-funds');
  }

  function setBase(curr) {
    if (!draft || !curr || !CURRENCY_INFO[curr]) return;
    captureInputs();
    draft.base = curr;
    renderInitialFunds();
    showToast(`👑 기준 통화가 [${curr}] (${info(curr).name})로 지정되었습니다.`);
  }

  function removeCurrency(curr) {
    if (!draft) return;
    if (curr === draft.base) {
      showToast('⚠️ 기준 통화는 삭제할 수 없습니다. 다른 통화를 기준 통화로 먼저 지정해 주세요.');
      return;
    }
    if (draft.currencies.length <= 1) {
      showToast('⚠️ 최소 1개 이상의 통화가 필요합니다.');
      return;
    }
    const trip = getActiveTrip();
    const used = !!trip && ((trip.expenses || []).some(e => e.curr === curr || e.walletCurr === curr) ||
      (trip.exchanges || []).some(x => x.fromCurr === curr || x.toCurr === curr));
    const desc = used
      ? `⚠️ [${curr}] 통화로 기록된 지출 또는 환전 거래 내역이 존재합니다.\n목록에서 삭제해도 기존 지출 기록은 보존되지만, 지갑 잔액 관리가 해제됩니다.\n정말 삭제하시겠습니까?`
      : '해당 통화를 예산 및 초기 자산 목록에서 삭제하시겠습니까?\n(실수로 누르셨다면 취소를 선택하세요)';
    const session = draft;
    showConfirmDelete('통화 삭제 확인', `${info(curr).flag} ${curr} (${info(curr).name})`, desc, () => {
      if (draft !== session) return;
      captureInputs();
      draft.currencies = draft.currencies.filter(c => c !== curr);
      delete draft.balances[curr];
      renderInitialFunds();
      showToast(`🗑️ [${curr}] 통화가 목록에서 삭제되었습니다. 저장을 눌러야 반영됩니다.`);
    });
  }

  function toggleSyncBudget() {
    if (!draft) return;
    draft.syncBudget = document.getElementById('chk-sync-initial-budget')?.checked ?? true;
    const customRow = document.getElementById('init-funds-custom-budget-row');
    if (customRow) {
      customRow.classList.toggle('hidden', draft.syncBudget);
      const customBudget = document.getElementById('init-funds-custom-budget');
      if (!draft.syncBudget && customBudget && !customBudget.value) customBudget.value = (Number(getActiveTrip()?.budget) || 0).toLocaleString();
    }
    updatePreview();
  }

  function cardHtml(curr, base, baseSymbol) {
    const meta = info(curr), isBase = curr === base, value = draft.balances[curr] || 0;
    const codeHtml = escapeHtml(curr);
    const rateHtml = isBase
      ? `<span class="font-bold text-amber-600 dark:text-amber-400">1 ${codeHtml} = 1 ${escapeHtml(baseSymbol)} (기준 통화)</span>`
      : `1 ${codeHtml} ≈ ₩${escapeHtml(getCurrencyRate(curr).toLocaleString())}`;
    return `
      <div class="p-3.5 rounded-xl border transition ${isBase ? 'bg-amber-500/10 dark:bg-amber-500/10 border-amber-500/60 shadow-sm' : 'bg-white dark:bg-[#0f1422] border-stone-200 dark:border-[#1e263c] hover:border-stone-300 dark:hover:border-[#2a3655]'} space-y-2.5">
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <div class="flex items-center gap-2 min-w-0">
            <label class="init-fund-base flex items-center gap-1.5 cursor-pointer select-none">
              <input type="radio" name="modal-base-currency-radio" value="${codeHtml}" ${isBase ? 'checked' : ''} data-on-change="budget.base" data-curr="${codeHtml}" class="w-4 h-4 accent-amber-500 cursor-pointer" aria-label="${codeHtml} 기준 통화로 지정">
              ${isBase
                ? '<span class="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-500 text-stone-950 flex items-center gap-1 shadow-sm"><i class="fa-solid fa-crown text-[9px]" aria-hidden="true"></i> 기준 통화</span>'
                : '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 cursor-pointer transition">기준통화 설정</span>'}
            </label>
            <span class="text-xl shrink-0" aria-hidden="true">${escapeHtml(meta.flag)}</span>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-black text-stone-900 dark:text-white">${codeHtml}</span>
                <span class="text-[11px] text-stone-500 dark:text-slate-400 font-medium truncate">${escapeHtml(meta.name)}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <div class="text-[10px] text-stone-500 dark:text-slate-400 font-mono text-right">${rateHtml}</div>
            ${isBase
              ? '<span class="text-stone-300 dark:text-slate-600 p-1 cursor-not-allowed text-xs" title="기준 통화는 삭제할 수 없습니다"><i class="fa-solid fa-lock text-[10px]" aria-hidden="true"></i></span>'
              : `<button type="button" data-on-click="budget.removeCurrency" data-curr="${codeHtml}" class="init-fund-remove p-1 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition cursor-pointer" title="${codeHtml} 통화 삭제" aria-label="${codeHtml} 통화 삭제"><i class="fa-solid fa-trash-can text-xs" aria-hidden="true"></i></button>`}
          </div>
        </div>
        <div class="flex items-center justify-between gap-2 pt-0.5">
          <div class="flex-1 relative">
            <input type="number" step="any" min="0" inputmode="decimal" id="init-fund-input-${codeHtml}" value="${Number(value) || ''}" placeholder="0" data-on-input="budget.preview" aria-label="${codeHtml} 초기 자산" class="w-full pl-3 pr-11 py-1.5 bg-stone-50 dark:bg-[#080b12] border border-stone-300 dark:border-[#23304c] rounded-lg text-xs text-stone-900 dark:text-white font-mono font-bold focus:outline-none focus:border-amber-500">
            <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-stone-500 dark:text-slate-400">${codeHtml}</span>
          </div>
          <div class="text-right shrink-0 min-w-[105px]">
            <div class="text-[9px] text-stone-500 dark:text-slate-400 font-medium">${escapeHtml(base)} 환산</div>
            <div id="init-fund-subtotal-${codeHtml}" class="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono">${escapeHtml(baseSymbol)}0</div>
          </div>
        </div>
      </div>`;
  }

  function renderInitialFunds() {
    if (!draft) return;
    const container = document.getElementById('initial-funds-list');
    if (!container) return;
    const base = draft.base, baseSymbol = getCurrencySymbol(base);
    const label = document.getElementById('init-funds-base-curr-label');
    if (label) label.textContent = `설정된 초기 총 자산 (${base} 환산 합산)`;
    const symbol = document.getElementById('init-funds-custom-budget-symbol');
    if (symbol) symbol.textContent = `직접 지정할 총 예산 (${base}): ${baseSymbol}`;
    container.innerHTML = draft.currencies.map(curr => cardHtml(curr, base, baseSymbol)).join('');
    updatePreview();
  }

  // 입력칸 값으로 통화별 환산 소계와 총액을 다시 쓴다. 금액은 숫자로만 만들어 글자로 넣는다.
  function totals() {
    const base = draft.base, baseRate = getCurrencyRate(base);
    let totalKrw = 0;
    const rows = draft.currencies.map(curr => {
      const input = document.getElementById(`init-fund-input-${curr}`);
      const value = Math.max(0, input ? parseFloat(input.value) || 0 : (draft.balances[curr] || 0));
      const krw = value * getCurrencyRate(curr);
      totalKrw += krw;
      return { curr, value, krw, inBase: baseRate > 0 ? krw / baseRate : 0 };
    });
    const totalBase = base === 'KRW' ? totalKrw : (baseRate > 0 ? totalKrw / baseRate : 0);
    return { rows, totalKrw, totalBase };
  }

  function updatePreview() {
    if (!draft) return;
    const base = draft.base, baseSymbol = getCurrencySymbol(base), decimals = hasDecimals(base);
    const { rows, totalKrw, totalBase } = totals();
    for (const row of rows) {
      const subtotal = document.getElementById(`init-fund-subtotal-${row.curr}`);
      if (!subtotal) continue;
      if (base === 'KRW') subtotal.textContent = `₩${Math.round(row.krw).toLocaleString()}`;
      else subtotal.innerHTML = `${escapeHtml(baseSymbol)}${escapeHtml(money(row.inBase, decimals))}<span class="block text-[8px] text-stone-400 font-normal font-sans">≈ ₩${Math.round(row.krw).toLocaleString()}</span>`;
    }
    const total = document.getElementById('init-funds-total-krw-preview');
    if (total) {
      if (base === 'KRW') total.textContent = `₩${Math.round(totalKrw).toLocaleString()}`;
      else total.innerHTML = `${escapeHtml(baseSymbol)}${escapeHtml(money(totalBase, decimals))} <span class="text-xs text-stone-500 dark:text-slate-400 font-normal font-sans">(≈ ₩${Math.round(totalKrw).toLocaleString()})</span>`;
    }
    if (draft.syncBudget) {
      const customBudget = document.getElementById('init-funds-custom-budget');
      if (customBudget) customBudget.value = decimals ? totalBase.toFixed(2) : Math.round(totalBase).toLocaleString();
    }
  }

  async function saveInitialFunds() {
    if (!draft) return false;
    const trip = getActiveTrip();
    if (!trip || trip.id !== draft.tripId) {
      showToast('⚠️ 창을 연 뒤 여행이 바뀌었습니다. 초기 자산 창을 다시 열어 주세요.');
      return false;
    }
    captureInputs();
    const base = draft.base, decimals = hasDecimals(base), baseSymbol = getCurrencySymbol(base);
    const { rows, totalBase } = totals();
    const balances = {};
    for (const row of rows) balances[row.curr] = row.value;
    const round = value => decimals ? parseFloat(value.toFixed(2)) : Math.round(value);
    let budget = null;
    if (draft.syncBudget) budget = round(totalBase);
    else {
      const custom = parseFloat(String(document.getElementById('init-funds-custom-budget')?.value || '').replace(/,/g, ''));
      if (Number.isFinite(custom) && custom > 0) budget = round(custom);
      else if (totalBase > 0) budget = round(totalBase);
    }
    const currencies = draft.currencies.slice();
    // 입력값을 먼저 읽고, 저장은 commitTrip에 한 번만 맡긴다. 실패하면 창과 입력이 그대로 남는다.
    const saved = await commitTrip(trip.id, target => {
      target.currency = base;
      target.activeCurrencies = currencies;
      const next = {};
      for (const curr of currencies) next[curr] = balances[curr];
      target.initialBalances = next;
      if (budget != null) target.budget = budget;
    });
    if (!saved) return false;
    draft = null;
    renderActiveTripWorkspace();
    closeModal('modal-initial-funds', true);
    showToast(`💰 기준 통화 [${base}] 및 초기 자산·총 예산(${baseSymbol}${(Number(getActiveTrip()?.budget) || 0).toLocaleString()})이 성공적으로 저장되었습니다!`);
    return true;
  }

  // ---- 통화 선택 창 ----
  let region = 'ALL';

  function syncRegionButtons() {
    document.querySelectorAll('.add-curr-filter-btn').forEach(button => {
      const active = button.dataset.region === region;
      button.setAttribute('aria-pressed', String(active));
      button.className = active
        ? 'add-curr-filter-btn px-2.5 py-1 rounded-lg font-bold sulsul-badge-sky bg-sky-100 text-sky-800 border border-sky-300 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800 cursor-pointer'
        : 'add-curr-filter-btn px-2.5 py-1 rounded-lg font-medium bg-[#080b12] text-slate-400 border border-[#1e263c] hover:text-white cursor-pointer';
    });
  }

  function syncClearButton() {
    const query = (document.getElementById('add-curr-search-input')?.value || '').trim();
    document.getElementById('btn-clear-add-curr-search')?.classList.toggle('hidden', !query);
  }

  function openAddCurrency() {
    const trip = getActiveTrip();
    if (!trip) return;
    region = 'ALL';
    const search = document.getElementById('add-curr-search-input');
    if (search) search.value = '';
    syncClearButton();
    syncRegionButtons();
    renderCurrencyGrid();
    openModal('modal-add-currency');
    if (search) setTimeout(() => search.focus(), 150);
  }

  function setRegion(next) {
    region = REGIONS.includes(next) ? next : 'ALL';
    syncRegionButtons();
    renderCurrencyGrid();
  }

  function search() {
    syncClearButton();
    renderCurrencyGrid();
  }

  function clearSearch() {
    const input = document.getElementById('add-curr-search-input');
    if (input) input.value = '';
    syncClearButton();
    renderCurrencyGrid();
    input?.focus();
  }

  function renderCurrencyGrid() {
    const trip = getActiveTrip();
    const container = document.getElementById('add-currency-grid');
    if (!trip || !container) return;
    const query = (document.getElementById('add-curr-search-input')?.value || '').trim().toLowerCase();
    const active = new Set(calculateTripWallets(trip).activeCurrencies);
    const codes = Object.keys(CURRENCY_INFO).filter(code => {
      const meta = CURRENCY_INFO[code];
      if (code === 'KRW' || !meta) return false;
      if (region !== 'ALL' && meta.region !== region) return false;
      if (!query) return true;
      return [code, meta.name, meta.country || ''].some(text => text.toLowerCase().includes(query));
    });
    if (!codes.length) {
      container.innerHTML = '<div class="col-span-full py-8 text-center text-slate-500 text-xs"><i class="fa-solid fa-magnifying-glass text-xl mb-2 block" aria-hidden="true"></i>일치하는 통화가 없습니다. 검색어를 확인해 주세요.</div>';
      return;
    }
    container.innerHTML = codes.map(code => {
      const meta = CURRENCY_INFO[code], used = active.has(code), codeHtml = escapeHtml(code);
      return `
        <button type="button" data-on-click="budget.pickCurrency" data-curr="${codeHtml}" aria-label="${codeHtml} ${escapeHtml(meta.name)} ${used ? '사용 중' : '추가'}" class="add-curr-item w-full text-left p-2.5 rounded-xl bg-[#080b12] border ${used ? 'border-slate-800 opacity-60 cursor-not-allowed' : 'border-[#1e263c] hover:border-sky-500/60 hover:bg-[#111827] cursor-pointer'} transition flex items-center justify-between gap-2">
          <span class="flex items-center gap-2.5 min-w-0">
            <span class="text-2xl shrink-0" aria-hidden="true">${escapeHtml(meta.flag)}</span>
            <span class="min-w-0">
              <span class="flex items-center gap-1.5 flex-wrap">
                <span class="text-xs font-black text-white">${codeHtml}</span>
                <span class="text-[11px] text-slate-300 font-bold truncate">${escapeHtml(meta.name)}</span>
              </span>
              <span class="block text-[10px] text-slate-400 truncate mt-0.5">${escapeHtml(meta.country || '')}</span>
            </span>
          </span>
          <span class="text-right shrink-0">
            ${used
              ? '<span class="text-[9px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">사용 중</span>'
              : `<span class="block text-xs font-mono font-bold text-sky-400">₩${escapeHtml(getCurrencyRate(code).toLocaleString())}</span><span class="text-[9px] text-slate-500">터치하여 추가</span>`}
          </span>
        </button>`;
    }).join('');
  }

  async function addCurrency(code) {
    const trip = getActiveTrip();
    if (!trip || !CURRENCY_INFO[code]) return false;
    if ((Array.isArray(trip.activeCurrencies) ? trip.activeCurrencies : ['KRW']).includes(code)) {
      showToast(`ℹ️ 이미 활성화되어 있는 통화입니다: ${code}`);
      return false;
    }
    const added = await commitTrip(trip.id, target => {
      if (!Array.isArray(target.activeCurrencies)) target.activeCurrencies = ['KRW'];
      if (!target.activeCurrencies.includes(code)) target.activeCurrencies.push(code);
      if (!target.initialBalances) target.initialBalances = {};
      if (target.initialBalances[code] == null) target.initialBalances[code] = 0;
    });
    if (!added) return false;
    renderActiveTripWorkspace();
    closeModal('modal-add-currency', true);
    showToast(`🎉 ${info(code).flag} [${code}] ${info(code).name} 지갑이 추가되었습니다!`);
    // 초기 자산 창이 열려 있으면 입력값을 지킨 채 새 통화 칸을 더한다.
    if (draft && draft.tripId === trip.id && isOpen('modal-initial-funds')) {
      captureInputs();
      if (!draft.currencies.includes(code)) draft.currencies.push(code);
      if (draft.balances[code] == null) draft.balances[code] = 0;
      renderInitialFunds();
    }
    // 지출 입력창이 열려 있으면 새 통화를 바로 고른다.
    if (isOpen('modal-expense') && typeof selectExpenseCurrency === 'function') selectExpenseCurrency(code);
    return true;
  }

  const api = Object.freeze({
    openInitialFunds, setBase, removeCurrency, toggleSyncBudget, renderInitialFunds, updatePreview, saveInitialFunds,
    openAddCurrency, setRegion, search, clearSearch, renderCurrencyGrid, addCurrency
  });
  T.BudgetUI = api;

  const curr = element => element.dataset.curr;
  T.UiActions.define('budget', {
    initialFunds: () => api.openInitialFunds(),
    base: element => api.setBase(curr(element)),
    removeCurrency: element => api.removeCurrency(curr(element)),
    syncBudget: () => api.toggleSyncBudget(),
    preview: () => api.updatePreview(),
    save: () => api.saveInitialFunds(),
    addCurrency: () => api.openAddCurrency(),
    region: element => api.setRegion(element.dataset.region),
    search: () => api.search(),
    clearSearch: () => api.clearSearch(),
    pickCurrency: element => api.addCurrency(curr(element))
  });
})(typeof window !== 'undefined' ? window : globalThis);
