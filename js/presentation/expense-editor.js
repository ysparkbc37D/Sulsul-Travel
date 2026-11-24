/* 지출·수입 입력창 (v2.1.3, 계획 4단계 세 번째 화면 분리의 3차).
 * index.html 인라인 스크립트의 [11] 지출 입력 폼(간편·상세, 카드·현금, 지출·수입, 카테고리, 통화 칩, 출금 지갑 카드)을
 * 기존 편집·사진·저장 코드와 합쳐 SulsulTravel.ExpenseEditor 하나로 묶었다. 폼 상태는 SulsulTravel.ExpenseEditor.state다.
 * 지출 편집은 기존 거래를 교체하며 저장 전 목록과 지갑을 변경하지 않는다.
 * 공용 환율 계산(CURRENCY_INFO·getCurrencyRate·calculateTripWallets)과 셸 함수(getActiveTrip·openModal·closeModal·showToast·escapeHtml·
 * resolveCountryInfo·TripRepository)는 부를 때 찾는다. 카테고리 목록은 expense-analytics.js의 하나를 같이 쓴다.
 * SulsulTravel.ExpenseEditor는 얼리지 않는다. 검사가 compressPhoto를 바꿔 늦게 끝나는 사진 준비를 재현하므로 안에서도 api.compressPhoto를 부른다.
 * 동작은 data-on-click·data-on-change·data-on-input="expense.*"로 잇는다. 불러올 때는 등록만 하고 문서를 건드리지 않는다. */
(function (root) {
  'use strict';
  const T = root.SulsulTravel = root.SulsulTravel || {};
  const NO_DECIMALS = ['KRW', 'JPY', 'VND', 'CLP'];
  const $ = id => document.getElementById(id);
  const categories = () => T.ExpenseAnalytics?.CATEGORIES || [];
  const info = curr => CURRENCY_INFO[curr] || { name: curr, symbol: curr, flag: '🌐' };
  const amountText = (curr, value) => value.toLocaleString(undefined, { minimumFractionDigits: NO_DECIMALS.includes(curr) ? 0 : 2, maximumFractionDigits: 2 });

  const state = { mode: 'simple', payMethod: 'card', type: 'expense', selectedCat: 'meal', photos: [], primaryPhotoIndex: 0 };
  let api = null;

  // ---- 폼 스냅샷·안내·초기화 ----
  function snapshot() {
    return JSON.stringify({ fields: ['title', 'amount', 'curr', 'date', 'time', 'memo', 'payment-source'].map(k => $('exp-form-' + k)?.value || ''), payMethod: state.payMethod, type: state.type, cat: state.selectedCat, photos: state.photos, primary: state.primaryPhotoIndex });
  }
  function feedback(message) { $('expense-editor-feedback').textContent = message; }
  function reset() {
    state.sessionId = crypto.randomUUID(); state.tripId = State.activeTripId;
    state.edit = null; state.photosLoading = false; state.saving = false; state.savePending = null; state.baseline = null;
    $('exp-form-submit-btn').disabled = false;
    $('modal-expense').removeAttribute('aria-busy');
    const draft = $('exp-draft-download-btn'); if (draft) draft.hidden = true;
    $('expense-photo-viewer').hidden = true;
    $('receipt-scan-loading')?.classList.add('hidden');
    const quality = $('exp-photo-quality'); if (quality) quality.value = 'photo';
    feedback('');
  }

  // ---- 편집 대상과 미리보기 ----
  function editIndex(trip) {
    const edit = state.edit; if (!edit) return -1;
    const expenses = trip?.expenses || [];
    if (edit.id) { const indexes = expenses.map((e, i) => e.id === edit.id ? i : -1).filter(i => i >= 0); return indexes.length === 1 ? indexes[0] : -1; }
    const indexes = expenses.map((e, i) => JSON.stringify(e) === edit.snapshot ? i : -1).filter(i => i >= 0);
    return indexes.length === 1 ? indexes[0] : -1;
  }
  function previewTrip() {
    const trip = State.trips.find(t => t.id === state.tripId) || getActiveTrip();
    if (!trip) return trip;
    // 지갑 계산은 일부 구 내역을 보충한다. 계산용 객체만 분리하고 큰 사진 문자열은 복제하지 않는다.
    const copy = { ...trip, expenses: (trip.expenses || []).map(expense => ({ ...expense })) }, index = editIndex(trip);
    if (index >= 0) copy.expenses.splice(index, 1);
    return copy;
  }
  function previewKrw(curr, amount) {
    const trip = State.trips.find(t => t.id === state.tripId), index = editIndex(trip), original = index >= 0 ? trip.expenses[index] : null;
    return original && original.curr === curr && Number(original.amount) === amount && Number.isFinite(original.krw) ? original.krw : Math.round(amount * getCurrencyRate(curr));
  }

  // ---- 폼 조작 ----
  function setMode(mode) {
    state.mode = mode === 'detailed' ? 'detailed' : 'simple';
    const detailed = state.mode === 'detailed';
    const simpleTab = $('exp-modal-tab-simple'), detailedTab = $('exp-modal-tab-detailed');
    if (simpleTab) { simpleTab.className = `exp-pill-btn${detailed ? '' : ' active-tab'} px-3 py-1 text-xs`; simpleTab.setAttribute('aria-pressed', String(!detailed)); }
    if (detailedTab) { detailedTab.className = `exp-pill-btn${detailed ? ' active-tab' : ''} px-3 py-1 text-xs`; detailedTab.setAttribute('aria-pressed', String(detailed)); }
    $('exp-detailed-fields')?.classList.toggle('hidden', !detailed);
  }

  function setPayMethod(method) {
    state.payMethod = method === 'cash' ? 'cash' : 'card';
    const cash = state.payMethod === 'cash';
    const cardBtn = $('exp-form-method-card'), cashBtn = $('exp-form-method-cash'), source = $('exp-form-payment-source');
    if (cardBtn) { cardBtn.className = `flex-1 py-1.5 exp-pill-btn${cash ? '' : ' active-card'} flex items-center justify-center gap-1.5`; cardBtn.setAttribute('aria-pressed', String(!cash)); }
    if (cashBtn) { cashBtn.className = `flex-1 py-1.5 exp-pill-btn${cash ? ' active-cash' : ''} flex items-center justify-center gap-1.5`; cashBtn.setAttribute('aria-pressed', String(cash)); }
    const wanted = cash ? 'wallet_curr' : 'wallet_krw';
    if (source && [...source.options].some(o => o.value === wanted)) source.value = wanted;
    // 지갑 카드도 함께 다시 그린다(예전에는 숨은 select만 바뀌어 카드의 선택 표시가 어긋났다).
    updatePaymentSources();
  }

  function setType(type) {
    state.type = type === 'income' ? 'income' : 'expense';
    const income = state.type === 'income';
    const expBtn = $('exp-form-type-expense'), incBtn = $('exp-form-type-income');
    if (expBtn) { expBtn.className = `flex-1 py-1.5 exp-pill-btn${income ? '' : ' active-expense'} flex items-center justify-center gap-1.5`; expBtn.setAttribute('aria-pressed', String(!income)); }
    if (incBtn) { incBtn.className = `flex-1 py-1.5 exp-pill-btn${income ? ' active-income' : ''} flex items-center justify-center gap-1.5`; incBtn.setAttribute('aria-pressed', String(income)); }
    const sign = $('exp-form-sign-badge');
    if (sign) { sign.textContent = income ? '+' : '-'; sign.className = `text-2xl font-black ${income ? 'text-emerald-500' : 'text-rose-500'} shrink-0 select-none`; }
    const heading = $('exp-modal-heading'); if (heading) heading.textContent = income ? '수입 기록 추가' : '지출 기록 추가';
    const walletLabel = $('exp-form-wallet-label'); if (walletLabel) walletLabel.textContent = income ? '입금 지갑 / 수입 상세' : '출금 지갑 / 결제 상세';
    const submit = $('exp-form-submit-btn');
    if (submit) {
      submit.textContent = income ? '수입 저장' : '지출 저장';
      submit.className = income
        ? 'flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black text-xs shadow-md hover:from-emerald-600 hover:to-teal-700 transition'
        : 'flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs shadow-md hover:from-amber-600 hover:to-amber-700 transition';
    }
    updatePaymentSources();
    updateKrwPreview();
  }

  function renderCategories() {
    const container = $('exp-cat-grid'); if (!container) return;
    container.innerHTML = categories().map(cat => {
      const active = state.selectedCat === cat.key;
      return `<button type="button" data-on-click="expense.category" data-cat="${escapeHtml(cat.key)}" aria-pressed="${active ? 'true' : 'false'}" class="exp-cat-item ${active ? 'active' : ''}" title="${escapeHtml(cat.label)}">
          <span class="exp-cat-circle" aria-hidden="true">${escapeHtml(cat.icon)}</span>
          <span class="exp-cat-label">${escapeHtml(cat.label)}</span>
        </button>`;
    }).join('');
  }
  function selectCategory(key) {
    state.selectedCat = key;
    const select = $('exp-form-cat'); if (select) select.value = key;
    renderCategories();
  }

  function onAmountOrCurrChange() { updateKrwPreview(); updatePaymentSources(); }
  function updateKrwPreview() {
    const preview = $('exp-form-krw-preview'); if (!preview) return;
    const amount = parseFloat($('exp-form-amount')?.value) || 0, curr = $('exp-form-curr')?.value || 'KRW';
    if (amount <= 0) { preview.textContent = '≈ ₩0'; return; }
    preview.textContent = `≈ ${state.type === 'income' ? '+' : ''}₩${previewKrw(curr, amount).toLocaleString()}`;
  }

  // ---- 통화 칩 ----
  function renderCurrencyChips(targetCurr) {
    const trip = getActiveTrip(); if (!trip) return;
    const walletData = calculateTripWallets(trip);
    const currs = walletData.activeCurrencies?.length ? walletData.activeCurrencies.slice() : ['KRW'];
    if (trip.currency && !currs.includes(trip.currency)) currs.unshift(trip.currency);
    let active = targetCurr || $('exp-form-curr')?.value || currs[0];
    if (!currs.includes(active)) currs.push(active);
    const select = $('exp-form-curr');
    if (select) {
      // 숨은 select는 저장·초안·검사가 읽는 값이다.
      select.innerHTML = currs.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)} (${escapeHtml(info(c).symbol || c)})</option>`).join('');
      select.value = active;
    }
    const badge = $('exp-form-curr-badge');
    if (badge) badge.textContent = `${info(active).flag || ''} ${active} (${info(active).symbol || active})`;
    const container = $('exp-form-curr-chips');
    if (container) {
      container.innerHTML = currs.map(c => {
        const selected = c === active;
        return `<button type="button" data-on-click="expense.currency" data-curr="${escapeHtml(c)}" aria-pressed="${selected ? 'true' : 'false'}" class="exp-curr-chip ${selected ? 'active' : ''}">
            <span aria-hidden="true">${escapeHtml(info(c).flag || '')}</span><span>${escapeHtml(c)}</span><span class="text-[9px] opacity-80">(${escapeHtml(info(c).symbol || c)})</span>
          </button>`;
      }).join('') + `<button type="button" data-on-click="budget.addCurrency" class="exp-curr-chip exp-curr-chip-add" title="전세계 통화 검색 및 추가">
            <i class="fa-solid fa-plus text-[9px]" aria-hidden="true"></i><span>다른 통화</span>
          </button>`;
    }
    const desc = $('exp-form-curr-active-desc');
    if (desc) desc.textContent = `${active} (${info(active).name || ''}) 적용됨`;
  }
  function selectCurrency(curr) {
    if (!curr) return;
    renderCurrencyChips(curr);
    onAmountOrCurrChange();
  }

  // ---- 출금·입금 지갑 ----
  function walletBalance(walletData, curr) {
    const wallet = walletData.wallets[curr];
    if (curr === 'KRW') return `₩${(wallet ? wallet.balance : 0).toLocaleString()}`;
    return wallet ? `${wallet.symbol}${amountText(curr, wallet.balance)}` : '0';
  }
  function sourceOptions(curr, income, walletData) {
    const verb = income ? '입금' : '잔액에서 차감';
    const none = { value: 'none', icon: '📝', title: income ? '단순 기록 (지갑 잔액 미반영)' : '단순 기록 (지갑 잔액 미차감)', sub: income ? '수입 통계에만 집계' : '지출 통계에만 집계' };
    if (curr === 'KRW') {
      return [
        { value: 'wallet_krw', icon: income ? '🇰🇷' : '💳', title: income ? '[KRW 원화 지갑] 입금 (+충전)' : '[KRW 원화 지갑 / 한국 카드] 결제', sub: `원화 잔액: ${walletBalance(walletData, 'KRW')}` },
        none
      ];
    }
    const options = [
      { value: 'wallet_curr', icon: CURRENCY_INFO[curr]?.flag || '💵', title: income ? `[${curr} 지갑] 잔액에 입금 (+충전)` : `[${curr} 지갑] 잔액에서 차감`, sub: `현재 보유 잔액: ${walletBalance(walletData, curr)}` },
      { value: 'wallet_krw', icon: income ? '🇰🇷' : '💳', title: income ? '[KRW 원화 지갑] 원화로 입금' : '[한국 신용카드 / 원화] 결제·청구', sub: `원화 잔액: ${walletBalance(walletData, 'KRW')}` }
    ];
    for (const other of walletData.activeCurrencies) {
      if (other === 'KRW' || other === curr) continue;
      options.push({ value: `wallet_${other}`, icon: CURRENCY_INFO[other]?.flag || '🌐', title: `[${other} 지갑] ${verb}`, sub: `보유 잔액: ${walletBalance(walletData, other)}` });
    }
    options.push(none);
    return options;
  }

  // 지갑 선택지를 다시 만든다. 이전 선택이 새 선택지에 있으면 유지하고, 없으면 기본값(외화 수입은 그 통화 지갑)을 고른다.
  function updatePaymentSources() {
    const currSelect = $('exp-form-curr'), source = $('exp-form-payment-source');
    if (!currSelect || !source) return;
    const curr = currSelect.value, income = state.type === 'income';
    const options = sourceOptions(curr, income, calculateTripWallets(previewTrip()));
    const previous = source.value;
    source.innerHTML = options.map(opt => `<option value="${escapeHtml(opt.value)}">${escapeHtml(opt.title)}</option>`).join('');
    const keep = previous && options.some(o => o.value === previous);
    source.value = keep ? previous : (income && curr !== 'KRW' ? 'wallet_curr' : options[0].value);
    renderPaymentCards(options, source.value);
    onPaymentSourceChange();
  }
  function renderPaymentCards(options, selected) {
    const container = $('exp-form-wallet-cards'); if (!container) return;
    container.innerHTML = options.map(opt => {
      const active = opt.value === selected;
      return `<button type="button" data-on-click="expense.paymentSource" data-source="${escapeHtml(opt.value)}" aria-pressed="${active ? 'true' : 'false'}" class="exp-wallet-card ${active ? 'active' : ''}">
          <span class="flex items-center gap-2.5 min-w-0">
            <span class="text-base shrink-0" aria-hidden="true">${escapeHtml(opt.icon)}</span>
            <span class="min-w-0">
              <span class="block text-xs font-bold text-stone-900 dark:text-stone-100 truncate">${escapeHtml(opt.title)}</span>
              <span class="block text-[10px] text-stone-500 dark:text-stone-400 font-mono">${escapeHtml(opt.sub)}</span>
            </span>
          </span>
          <span class="exp-wallet-card-radio" aria-hidden="true">${active ? '<span class="exp-wallet-card-radio-dot"></span>' : ''}</span>
        </button>`;
    }).join('');
    const badge = $('exp-form-wallet-active-badge');
    if (badge) { const chosen = options.find(o => o.value === selected); badge.textContent = chosen ? chosen.title.split(']')[0].replace('[', '') : ''; }
  }
  function selectPaymentSource(value) {
    const source = $('exp-form-payment-source'); if (source) source.value = value;
    updatePaymentSources();
  }

  // 고른 지갑에 반영될 금액과 남는 잔액을 알려 준다. 글자는 모두 escape한다(편집하는 내역의 결제수단은 공유 사본에서 왔을 수 있다).
  function onPaymentSourceChange() {
    const source = $('exp-form-payment-source'), hint = $('exp-form-wallet-hint');
    if (!source || !hint) return;
    const curr = $('exp-form-curr')?.value || 'KRW', income = state.type === 'income';
    const walletData = calculateTripWallets(previewTrip()), value = source.value;
    const amount = parseFloat($('exp-form-amount')?.value) || 0;
    const line = (tone, text, bold = true) => { hint.innerHTML = `<span class="${escapeHtml(tone)}${bold ? ' font-bold' : ''}">${escapeHtml(text)}</span>`; };
    if (value === 'none') { line('text-slate-400', `ℹ️ ${income ? '수입' : '지출'} 통계에만 기록되며 지갑 잔액은 변경되지 않습니다.`, false); return; }
    if (value === 'wallet_krw') {
      const balance = walletData.wallets.KRW ? walletData.wallets.KRW.balance : 0, krw = previewKrw(curr, amount);
      if (income) line('text-emerald-400', `✅ KRW 원화 지갑에 ₩${krw.toLocaleString()} 입금 예정 (충전 후 잔액: ₩${(balance + krw).toLocaleString()})`);
      else if (balance - krw < 0) line('text-rose-400', `⚠️ KRW 지갑 잔액 부족 (₩${balance.toLocaleString()} < ₩${krw.toLocaleString()})`);
      else line('text-emerald-400', `✅ KRW 지갑에서 ₩${krw.toLocaleString()} 차감 예정 (남은 잔액: ₩${(balance - krw).toLocaleString()})`, false);
      return;
    }
    const target = value === 'wallet_curr' ? curr : value.replace('wallet_', '');
    const wallet = walletData.wallets[target], balance = wallet ? wallet.balance : 0, sym = wallet?.symbol || target;
    const fmt = n => amountText(target, n);
    if (income) line('text-emerald-400', `✅ ${target} 지갑에 ${sym}${fmt(amount)} 입금 예정 (충전 후 잔액: ${sym}${fmt(balance + amount)})`);
    else if (balance - amount < 0) line('text-rose-400', `⚠️ ${target} 지갑 잔액 부족 (${sym}${fmt(balance)} < ${sym}${fmt(amount)})`);
    else line('text-emerald-400', `✅ ${target} 지갑에서 ${sym}${fmt(amount)} 차감 예정 (남은 잔액: ${sym}${fmt(balance - amount)})`, false);
  }

  // ---- 창 열기 ----
  function initialCurrency(trip) {
    if (!trip) return 'KRW';
    if (trip.currency && CURRENCY_INFO[trip.currency]) return trip.currency;
    if (Array.isArray(trip.activeCurrencies) && trip.activeCurrencies.length) return trip.activeCurrencies[0];
    const country = trip.countries?.length ? resolveCountryInfo(trip.countries[0]) : null;
    return country?.currency || 'KRW';
  }

  function openAdd() {
    reset();
    for (const field of ['title', 'amount', 'memo']) { const input = $('exp-form-' + field); if (input) input.value = ''; }
    const trip = getActiveTrip(), now = new Date();
    const date = $('exp-form-date'); if (date) date.value = SulsulTravel.TripAdapter.localDateKey(now, trip?.timeZone);
    const time = $('exp-form-time'); if (time) time.value = SulsulTravel.TripAdapter.localTimeKey(now, trip?.timeZone);
    Object.assign(state, { mode: 'simple', payMethod: 'card', type: 'expense', selectedCat: 'meal', photos: [], primaryPhotoIndex: 0 });
    const cat = $('exp-form-cat'); if (cat) cat.value = 'meal';
    setMode('simple');
    setPayMethod('card');
    setType('expense');
    renderCategories();
    renderPhotos();
    // 여행 기준 통화(없으면 보유 통화·목적지 통화)를 먼저 고른다.
    renderCurrencyChips(initialCurrency(trip));
    updateKrwPreview();
    updatePaymentSources();
    openModal('modal-expense');
    state.baseline = snapshot();
  }

  // 결제수단이 없는 예전 내역은 지갑 계산(calculateTripWallets)과 같은 규칙으로 읽는다.
  function sourceOf(expense) {
    if (expense.paymentSource) return expense.paymentSource;
    const curr = expense.curr || 'KRW', wallet = expense.walletCurr;
    if (wallet === 'KRW' || (!wallet && curr === 'KRW')) return 'wallet_krw';
    if (wallet && wallet !== curr) return `wallet_${wallet}`;
    return 'wallet_curr';
  }

  function openEdit(index, event) {
    event?.stopPropagation();
    const trip = getActiveTrip(), expense = trip?.expenses?.[index]; if (!expense) return;
    const original = JSON.parse(JSON.stringify(expense));
    openAdd();
    state.edit = { id: original.id, snapshot: JSON.stringify(original) };
    state.photos = [...(original.photos || [])]; state.primaryPhotoIndex = original.primaryPhotoIndex || 0;
    for (const field of ['title', 'amount', 'date', 'time', 'memo']) $('exp-form-' + field).value = original[field] ?? '';
    renderCurrencyChips(original.curr || 'KRW');
    setPayMethod(original.payMethod || 'card');
    setType(original.type || 'expense');
    state.selectedCat = original.cat || 'meal'; renderCategories();
    // 예전 자료의 결제수단이 지금 선택지에 없으면 카드·현금에 맞는 기본 지갑을 두고 알린다(빈 값으로 저장하지 않는다).
    const wanted = sourceOf(original), select = $('exp-form-payment-source');
    const missing = ![...select.options].some(option => option.value === wanted);
    if (!missing) select.value = wanted;
    updatePaymentSources();
    setMode('detailed'); renderPhotos(); updateKrwPreview();
    $('exp-modal-heading').textContent = '지출·수입 기록 편집';
    $('exp-form-submit-btn').textContent = '수정 저장';
    state.baseline = snapshot();
    feedback(missing
      ? '이전 결제수단을 지금 지갑 목록에서 찾지 못해 기본 지갑을 골랐습니다. 확인한 뒤 수정 저장을 눌러 주세요.'
      : '수정 저장을 눌러야 지출 내역과 지갑 잔액에 반영됩니다.');
  }

  // ---- 사진 ----
  async function uploadPhotos(event) {
    const files = Array.from(event.target.files || []); event.target.value = '';
    if (!files.length || state.photosLoading || state.saving) return;
    if (state.photos.length + files.length > 8) { feedback('사진은 한 내역에 최대 8장까지 첨부할 수 있습니다.'); return; }
    const session = state.sessionId, preset = $('exp-photo-quality')?.value || 'photo';
    state.photosLoading = true; $('exp-form-submit-btn').disabled = true; feedback('사진을 준비하고 있습니다…');
    try {
      let added = 0; const failures = [];
      for (let index = 0; index < files.length; index++) {
        if (session !== state.sessionId) return;
        feedback(`사진 ${index + 1}/${files.length} 준비 중…`);
        // 여러 고화질 사진을 한 번에 디코딩하지 않고, 화면 표시 기회를 준 뒤 순차 처리한다.
        await new Promise(resolve => setTimeout(resolve, 0));
        try {
          const photo = await api.compressPhoto(files[index], { preset });
          if (session !== state.sessionId) return;
          state.photos.push(photo); added++; renderPhotos();
        } catch (error) { failures.push(error.message || '사진을 처리하지 못했습니다.'); }
      }
      if (session !== state.sessionId) return;
      feedback(failures.length ? `${added}장 준비 · ${failures.length}장 실패. ${failures[0]} 준비된 사진은 남아 있으니 확인 후 저장하세요.` : '사진을 첨부했습니다. 저장을 눌러 보관하세요.');
    } catch (error) { if (session === state.sessionId) feedback(error.message || '사진을 준비하지 못했습니다. 다시 선택해 주세요.'); }
    finally { if (session === state.sessionId) { state.photosLoading = false; $('exp-form-submit-btn').disabled = false; } }
  }
  async function compressPhoto(file, { preset = 'photo' } = {}) {
    const compression = SulsulTravel.PhotoCompression;
    const result = await compression.compress(file, { preset, timeoutMs: 30000 });
    return compression.toDataUrl(result.source);
  }
  function renderPhotos() {
    const list = $('exp-photos-list'); if (!list) return;
    list.innerHTML = state.photos.map((src, index) => {
      const primary = index === state.primaryPhotoIndex;
      return `<div class="expense-photo-tile"><button type="button" data-on-click="expense.viewPhoto" data-index="${index}" aria-label="사진 ${index + 1} 확대"><img src="${escapeHtml(SulsulTravel.TripTransfer.safePhoto(src))}" alt="첨부 사진 ${index + 1}"></button><button type="button" class="expense-primary" data-on-click="expense.primaryPhoto" data-index="${index}" aria-pressed="${primary ? 'true' : 'false'}">${primary ? '대표사진' : '대표로 선택'}</button><button type="button" class="expense-remove-photo" data-on-click="expense.removePhoto" data-index="${index}" aria-label="사진 ${index + 1} 삭제"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button></div>`;
    }).join('') + '<button type="button" class="expense-photo-add" data-on-click="expense.pickPhotos"><i class="fa-solid fa-camera" aria-hidden="true"></i> 사진 추가</button>';
  }
  function setPrimaryPhoto(index) {
    if (index >= 0 && index < state.photos.length) {
      state.primaryPhotoIndex = index;
      renderPhotos();
      showToast('⭐ 대표 사진으로 지정되었습니다.');
    }
  }
  function viewPhoto(index) {
    const src = state.photos[index]; if (!src) return;
    const box = document.querySelector('#modal-expense .sheet-box');
    state.photoReturnScroll = box.scrollTop; box.scrollTop = 0;
    $('expense-full-photo').src = SulsulTravel.TripTransfer.safePhoto(src);
    $('expense-photo-viewer').hidden = false;
  }
  function closePhotoViewer() {
    $('expense-photo-viewer').hidden = true;
    document.querySelector('#modal-expense .sheet-box').scrollTop = state.photoReturnScroll || 0;
  }
  function removePhoto(index, event) {
    event?.stopPropagation(); if (!confirm('이 사진을 첨부 목록에서 제외할까요? 저장하면 반영됩니다.')) return;
    state.photos.splice(index, 1); const old = state.primaryPhotoIndex;
    state.primaryPhotoIndex = index === old ? 0 : Math.max(0, old - (index < old ? 1 : 0));
    $('expense-photo-viewer').hidden = true; renderPhotos();
  }

  // ---- 저장 ----
  function changeDraft() {
    const trip = State.trips.find(t => t.id === state.tripId);
    if (!trip || trip.id !== State.activeTripId) { feedback('여행이 변경되었습니다. 원래 여행에서 다시 열어 주세요.'); return false; }
    const value = k => $('exp-form-' + k).value;
    const title = value('title').trim(), amount = Number(value('amount')), curr = value('curr');
    if (!title || !Number.isFinite(amount) || amount <= 0) { feedback('항목명과 0보다 큰 금액을 입력해 주세요.'); return false; }
    if (!curr) { feedback('통화를 골라 주세요.'); return false; }
    const index = editIndex(trip), original = index >= 0 ? trip.expenses[index] : null;
    if (state.edit && (!original || JSON.stringify(original) !== state.edit.snapshot)) { feedback('내역이 다른 화면에서 변경되었거나 삭제되었습니다. 현재 입력을 확인하고 다시 열어 주세요.'); return false; }
    const krw = previewKrw(curr, amount);
    if (!Number.isFinite(krw)) { feedback('환율을 확인해 주세요.'); return false; }
    const paymentSource = value('payment-source'), walletCurr = paymentSource === 'none' ? null : paymentSource === 'wallet_krw' ? 'KRW' : paymentSource === 'wallet_curr' ? curr : paymentSource.replace('wallet_', '');
    const entry = { ...original, id: original?.id || 'exp_' + crypto.randomUUID(), title, amount, curr, krw, cat: state.selectedCat, date: value('date'), time: value('time'), memo: value('memo').trim(), payMethod: state.payMethod, type: state.type, photos: [...state.photos], primaryPhotoIndex: state.primaryPhotoIndex || 0, paymentSource, walletCurr, updatedAt: new Date().toISOString() };
    if (original?.expensePhotoArchive && JSON.stringify(original.photos) !== JSON.stringify(entry.photos)) delete entry.expensePhotoArchive;
    const copy = { ...trip, expenses: [...(trip.expenses || [])] }, next = State.trips.map(item => item.id === trip.id ? copy : item);
    if (original) copy.expenses[index] = entry; else copy.expenses.unshift(entry);
    copy.activeCurrencies = [...new Set([...(copy.activeCurrencies || ['KRW']), curr, ...(walletCurr ? [walletCurr] : [])])];
    return { trip, entry, original, next };
  }

  async function saveExpenseRecord({ fromQueue = false, prepared = null } = {}) {
    if (!state.sessionId) return false;
    if (state.saving && !fromQueue) return false;
    if (state.photosLoading) { feedback('사진 준비가 끝난 뒤 저장해 주세요.'); return false; }
    const draft = prepared || changeDraft(); if (!draft) return false;
    const { trip, original, next } = draft;
    if (trip.id !== State.activeTripId || trip.id !== state.tripId) { feedback('여행이 변경되었습니다. 원래 여행에서 다시 열어 주세요.'); return false; }
    try { await TripRepository.saveAll(next, { bumpTripId: trip.id }); } catch (error) {
      const reason = ['STORAGE_CONFLICT', 'REVISION_CONFLICT', 'READ_ONLY_TRIP'].includes(error?.code) ? error.message : error?.name === 'QuotaExceededError' ? '기기의 앱 저장 공간이 부족합니다.' : '기기 저장소에 쓰지 못했습니다. 브라우저의 저장소 권한과 여유 공간을 확인해 주세요.';
      feedback(`${reason} 입력과 사진은 이 창에 남아 있습니다. 초안 파일을 보관한 뒤 다시 시도할 수 있습니다.`);
      const draftButton = $('exp-draft-download-btn'); if (draftButton) draftButton.hidden = false;
      return false;
    }
    state.saving = false;
    closeModal('modal-expense', true);
    // 저장 결과와 화면 갱신 결과를 분리한다. 숨은 전체 일정·평생 통계는 이 저장에서 다시 만들지 않는다.
    let refreshed = true;
    try { SulsulTravel.ExpensesTab.render(); } catch (error) { refreshed = false; console.warn('[지출 저장 후 화면 갱신]', error); }
    showToast(refreshed ? (original ? '지출·수입 내역을 수정했습니다.' : '지출·수입 내역을 저장했습니다.') : '내역은 저장했습니다. 지출 화면을 다시 열어 확인해 주세요.');
    return true;
  }

  async function requestSave() {
    if (state.savePending) return false;
    if (state.photosLoading) { feedback('사진 준비가 끝난 뒤 저장해 주세요.'); return false; }
    const session = state.sessionId; if (!session) return false;
    const button = $('exp-form-submit-btn'), modal = $('modal-expense');
    state.saving = true; state.savePending = session; button.disabled = true; button.textContent = '저장 중…'; modal.setAttribute('aria-busy', 'true'); feedback('사진과 내역을 기기에 저장하고 있습니다…');
    try {
      await new Promise(resolve => { let done = false; const finish = () => { if (!done) { done = true; resolve(); } }; requestAnimationFrame(() => setTimeout(finish, 0)); setTimeout(finish, 100); });
      if (state.sessionId !== session) return false;
      const draft = changeDraft(); if (!draft) return false;
      const trips = State.trips, revision = draft.trip.revision, before = snapshot();
      let next = draft.next;
      const photoRepository = SulsulTravel.expensePhotoRepository;
      if (photoRepository) {
        try { next = await photoRepository.prepare(next, { tripId: draft.trip.id }); }
        catch (error) { console.warn('[지출 사진 보관본 준비]', error?.message || error); }
      }
      if (state.sessionId !== session) return false;
      if (State.activeTripId !== draft.trip.id || State.trips !== trips || getActiveTrip()?.revision !== revision) { feedback('저장 중 여행이 변경되었습니다. 입력과 사진은 유지되니 최신 여행을 확인한 뒤 다시 저장해 주세요.'); return false; }
      if (snapshot() !== before) { feedback('저장 중 입력 내용이 변경되었습니다. 현재 입력과 사진을 확인한 뒤 다시 저장해 주세요.'); return false; }
      return await saveExpenseRecord({ fromQueue: true, prepared: { ...draft, next } });
    } catch (error) {
      console.warn('[지출 저장 준비]', error?.message || error);
      if (state.sessionId === session) { feedback('저장 준비를 마치지 못했습니다. 입력과 사진은 유지됩니다. 초안 파일을 보관하거나 다시 저장해 주세요.'); const draftButton = $('exp-draft-download-btn'); if (draftButton) draftButton.hidden = false; }
      return false;
    } finally {
      if (state.sessionId === session) { state.saving = false; state.savePending = null; button.disabled = false; button.textContent = state.edit ? '수정 저장' : state.type === 'income' ? '수입 저장' : '지출 저장'; modal.removeAttribute('aria-busy'); }
    }
  }

  function downloadDraft() {
    if (!state.sessionId) return false;
    if (state.photosLoading) { feedback('사진 준비가 끝난 뒤 초안 파일을 보관해 주세요.'); return false; }
    try {
      const value = key => $('exp-form-' + key)?.value || '';
      const trip = State.trips.find(item => item.id === state.tripId);
      const payload = { format: 'sulsul-expense-draft', schemaVersion: 1, exportedAt: new Date().toISOString(), trip: { id: state.tripId, title: trip?.title || '' }, expense: { id: state.edit?.id || null, title: value('title'), amount: value('amount'), curr: value('curr'), date: value('date'), time: value('time'), memo: value('memo'), paymentSource: value('payment-source'), payMethod: state.payMethod, type: state.type, cat: state.selectedCat, photos: [...state.photos], primaryPhotoIndex: state.primaryPhotoIndex || 0 } };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }), url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = `sulsul-expense-draft-${new Date().toISOString().slice(0, 10)}.json`; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
      feedback('사진과 입력 내용을 담은 초안 파일을 준비했습니다. 다운로드 폴더에서 확인해 주세요. 기존 지출에는 아직 반영되지 않았습니다.'); return true;
    } catch (_) { feedback('초안 파일을 준비하지 못했습니다. 입력과 사진은 이 창에 유지됩니다.'); return false; }
  }

  api = {
    state, snapshot, feedback, previewTrip, previewKrw,
    openAdd, openEdit, setMode, setPayMethod, setType, renderCategories, selectCategory,
    onAmountOrCurrChange, updateKrwPreview, renderCurrencyChips, selectCurrency,
    updatePaymentSources, selectPaymentSource, onPaymentSourceChange,
    uploadPhotos, compressPhoto, renderPhotos, setPrimaryPhoto, viewPhoto, closePhotoViewer, removePhoto,
    save: saveExpenseRecord, requestSave, downloadDraft
  };
  T.ExpenseEditor = api;

  const index = element => Number(element.dataset.index);
  T.UiActions.define('expense', {
    mode: element => api.setMode(element.dataset.mode),
    payMethod: element => api.setPayMethod(element.dataset.method),
    type: element => api.setType(element.dataset.type),
    category: element => api.selectCategory(element.dataset.cat),
    currency: element => api.selectCurrency(element.dataset.curr),
    amountOrCurr: () => api.onAmountOrCurrChange(),
    paymentSource: element => api.selectPaymentSource(element.dataset.source),
    paymentSourceChange: () => api.onPaymentSourceChange(),
    photoFiles: (element, event) => api.uploadPhotos(event),
    pickPhotos: () => $('exp-photo-file-input')?.click(),
    viewPhoto: element => api.viewPhoto(index(element)),
    primaryPhoto: element => api.setPrimaryPhoto(index(element)),
    removePhoto: (element, event) => api.removePhoto(index(element), event),
    closePhoto: () => api.closePhotoViewer(),
    downloadDraft: () => api.downloadDraft(),
    save: () => api.requestSave()
  });
})(typeof window !== 'undefined' ? window : globalThis);
