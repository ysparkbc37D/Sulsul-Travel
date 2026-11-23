/* 환전 창과 환율 관리 (v2.1.1, 계획 4단계 세 번째 화면 분리의 1차).
 * index.html 인라인 스크립트의 환전 창([11.3] 뒤쪽)과 [5.1] 실시간 환율 갱신·맞춤 환율·아르헨티나 MEP 스위치를 옮겼다.
 * 공용 환율 계산(CURRENCY_INFO·getCurrencyRate·calculateTripWallets)과 셸 함수(getActiveTrip·commitTrip·renderActiveTripWorkspace·
 * openModal·closeModal·showToast·escapeHtml)는 부를 때 찾는다. 환율 상태는 State.liveRates·customRates·ratesLastUpdated·isMepEnabled 그대로다.
 * 동작은 data-on-click·data-on-change·data-on-input="exchange.*"로 잇는다. 불러올 때는 등록만 하고 문서를 건드리지 않는다. */
(function (root) {
  'use strict';
  const T = root.SulsulTravel = root.SulsulTravel || {};
  const NO_DECIMALS = ['KRW', 'JPY', 'VND', 'CLP'];
  const value = id => document.getElementById(id)?.value;
  const number = id => parseFloat(value(id));
  const info = curr => CURRENCY_INFO[curr] || {};

  // ---- 환전 창 ----
  function recommendedRate(fromCurr, toCurr) {
    const fromRate = getCurrencyRate(fromCurr), toRate = getCurrencyRate(toCurr);
    if (toCurr === 'KRW') return fromRate;
    if (fromCurr === 'KRW') return toRate;
    return parseFloat((fromRate / toRate).toFixed(4));
  }

  function open() {
    const trip = getActiveTrip();
    if (!trip) return;
    const walletData = calculateTripWallets(trip);
    const fromSel = document.getElementById('exch-form-from-curr'), toSel = document.getElementById('exch-form-to-curr');
    if (!fromSel || !toSel) return;
    fromSel.innerHTML = walletData.activeCurrencies.map(c => {
      const w = walletData.wallets[c];
      const isDec = c !== 'KRW' && c !== 'JPY' && c !== 'VND';
      const balance = w ? `${w.symbol}${w.balance.toLocaleString(undefined, { minimumFractionDigits: isDec ? 2 : 0, maximumFractionDigits: 2 })}` : '0';
      return `<option value="${escapeHtml(c)}">${escapeHtml(w?.flag || '')} ${escapeHtml(c)} (보유 잔액: ${escapeHtml(balance)})</option>`;
    }).join('');
    toSel.innerHTML = Object.keys(CURRENCY_INFO).map(c => `<option value="${escapeHtml(c)}">${escapeHtml(info(c).flag)} ${escapeHtml(c)} (${escapeHtml(info(c).name)})</option>`).join('');
    fromSel.value = 'KRW';
    const foreign = walletData.activeCurrencies.filter(c => c !== 'KRW');
    toSel.value = foreign.length > 0 ? foreign[0] : 'USD';
    for (const id of ['exch-form-from-amount', 'exch-form-to-amount', 'exch-form-memo']) { const input = document.getElementById(id); if (input) input.value = ''; }
    const dateInput = document.getElementById('exch-form-date');
    if (dateInput) dateInput.value = SulsulTravel.TripAdapter.localDateKey(new Date(), getActiveTrip()?.timeZone);
    updateRate();
    openModal('modal-exchange');
  }

  function updateRate() {
    const fromCurr = value('exch-form-from-curr') || 'KRW', toCurr = value('exch-form-to-curr') || 'USD';
    const rateLabel = document.getElementById('exch-form-rate-label'), rateInput = document.getElementById('exch-form-rate');
    if (rateInput) rateInput.value = recommendedRate(fromCurr, toCurr);
    if (rateLabel) {
      if (fromCurr === 'KRW') rateLabel.innerText = `적용 환율 (1 ${toCurr} 당 원화)`;
      else if (toCurr === 'KRW') rateLabel.innerText = `적용 환율 (1 ${fromCurr} 당 원화)`;
      else rateLabel.innerText = `적용 환율 (1 ${fromCurr} 당 ${toCurr})`;
    }
    fromAmountChanged();
  }

  // 같은 통화를 양쪽에 고르면 반대쪽을 원화(또는 달러)로 바꾼다.
  function currencyChanged(changedId, otherId) {
    const changed = value(changedId), other = document.getElementById(otherId);
    if (other && other.value === changed) other.value = changed === 'KRW' ? 'USD' : 'KRW';
    updateRate();
  }

  function fromAmountChanged() {
    const fromCurr = value('exch-form-from-curr') || 'KRW', toCurr = value('exch-form-to-curr') || 'USD';
    const fromAmt = number('exch-form-from-amount') || 0, rate = number('exch-form-rate') || 1;
    const toInput = document.getElementById('exch-form-to-amount');
    if (fromAmt > 0 && rate > 0) {
      let toAmt = fromCurr === 'KRW' ? fromAmt / rate : fromAmt * rate;
      toAmt = NO_DECIMALS.includes(toCurr) ? Math.round(toAmt) : parseFloat(toAmt.toFixed(2));
      if (toInput) toInput.value = toAmt;
    }
    updateSummary();
  }

  function toAmountChanged() {
    const fromCurr = value('exch-form-from-curr') || 'KRW';
    const toAmt = number('exch-form-to-amount') || 0;
    const fromInput = document.getElementById('exch-form-from-amount');
    if (toAmt > 0) {
      const rate = number('exch-form-rate') || 1;
      const fromAmt = fromCurr === 'KRW' ? Math.round(toAmt * rate) : parseFloat((toAmt / rate).toFixed(2));
      if (fromInput) fromInput.value = fromAmt;
    }
    updateSummary();
  }

  function updateSummary() {
    const fromCurr = value('exch-form-from-curr') || 'KRW', toCurr = value('exch-form-to-curr') || 'USD';
    const fromAmt = number('exch-form-from-amount') || 0, toAmt = number('exch-form-to-amount') || 0, rate = number('exch-form-rate') || 1;
    const summary = document.getElementById('exch-form-summary-text');
    if (!summary) return;
    if (fromAmt <= 0 || toAmt <= 0) {
      summary.innerHTML = '<span class="text-slate-400">출금 금액과 환율을 입력하시면 실시간 환전 계산이 표시됩니다.</span>';
      return;
    }
    const from = info(fromCurr), to = info(toCurr);
    summary.innerHTML = `
      <div class="flex items-center justify-center gap-2 font-bold text-xs">
        <span class="text-rose-400 font-black">${escapeHtml(from.flag || '')} -${escapeHtml(from.symbol || fromCurr)}${fromAmt.toLocaleString()} ${escapeHtml(fromCurr)}</span>
        <span class="text-slate-400">➔</span>
        <span class="text-emerald-400 font-black">${escapeHtml(to.flag || '')} +${escapeHtml(to.symbol || toCurr)}${toAmt.toLocaleString()} ${escapeHtml(toCurr)}</span>
      </div>
      <div class="text-[10px] text-amber-400 mt-1">적용 환율: ${rate.toLocaleString()} · 총 여행 자산 유지</div>`;
  }

  async function submit() {
    const fromCurr = value('exch-form-from-curr'), toCurr = value('exch-form-to-curr');
    const fromAmt = number('exch-form-from-amount'), toAmt = number('exch-form-to-amount'), rate = number('exch-form-rate');
    const memo = value('exch-form-memo')?.trim();
    const date = value('exch-form-date') || SulsulTravel.TripAdapter.localDateKey(new Date(), getActiveTrip()?.timeZone);
    if (!fromCurr || !toCurr || fromCurr === toCurr) { alert('서로 다른 출금 통화와 입금 통화를 선택하세요.'); return false; }
    if (isNaN(fromAmt) || fromAmt <= 0 || isNaN(toAmt) || toAmt <= 0) { alert('출금 금액과 입금 금액을 올바르게 입력하세요.'); return false; }
    const trip = getActiveTrip();
    if (!trip) return false;
    const fromWallet = calculateTripWallets(trip).wallets[fromCurr];
    if (fromWallet && fromWallet.balance < fromAmt) {
      if (!confirm(`출금 통화(${fromCurr})의 현재 보유 잔액(${fromWallet.symbol}${fromWallet.balance.toLocaleString()})보다 환전 출금액이 큽니다.\n계속 환전을 진행하시겠습니까?`)) return false;
    }
    const exchanged = await commitTrip(trip.id, target => {
      if (!Array.isArray(target.exchanges)) target.exchanges = [];
      target.exchanges.unshift({ id: 'exch_' + Date.now(), date, fromCurr, fromAmount: fromAmt, toCurr, toAmount: toAmt, rate, memo: memo || `${fromCurr} ➔ ${toCurr} 환전` });
      if (!Array.isArray(target.activeCurrencies)) target.activeCurrencies = ['KRW'];
      if (!target.activeCurrencies.includes(toCurr)) target.activeCurrencies.push(toCurr);
      if (!target.activeCurrencies.includes(fromCurr)) target.activeCurrencies.push(fromCurr);
    });
    if (!exchanged) return false;
    closeModal('modal-exchange', true);
    renderActiveTripWorkspace();
    showToast(`💱 [환전 완료] ${fromCurr} ${fromAmt.toLocaleString()} ➔ ${toCurr} ${toAmt.toLocaleString()}`);
    return true;
  }

  function syncRate() {
    updateRate();
    showToast('🔄 현재 적용 중인 최신 환율을 환전 입력창에 즉시 반영했습니다.');
  }

  // 아르헨티나 페소 MEP 우대 환율 스위치(R-6). 저장하지 못하면 스위치를 되돌려 화면과 저장된 환산이 어긋나지 않게 한다.
  async function toggleMep() {
    const checkbox = document.getElementById('chk-mep-rate');
    const enabled = checkbox.checked;
    const trip = getActiveTrip();
    if (trip && trip.expenses) {
      const saved = await commitTrip(trip.id, target => {
        (target.expenses || []).forEach(e => { if (e.curr === 'ARS') e.krw = enabled ? Math.round(e.amount * 0.95) : Math.round(e.amount * 1.38); });
      });
      if (!saved) { checkbox.checked = !enabled; return false; }
      State.isMepEnabled = enabled;
      renderActiveTripWorkspace();
      return true;
    }
    State.isMepEnabled = enabled;
    return true;
  }

  // ---- 환율 갱신·관리 ----
  function updateTimestamp() {
    const el = document.getElementById('exp-rates-timestamp');
    if (!el) return;
    if (!State.ratesLastUpdated) { el.innerHTML = '<i class="fa-solid fa-circle-info text-slate-500 mr-1"></i>기본 환율'; return; }
    const dt = new Date(State.ratesLastUpdated);
    const timeText = `${dt.getMonth() + 1}/${dt.getDate()} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
    const custom = State.customRates && Object.keys(State.customRates).length > 0;
    el.innerHTML = `<span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span><span>${escapeHtml(timeText)} 갱신</span>${custom ? '<span class="text-[9px] text-amber-400 font-bold ml-1">(맞춤)</span>' : ''}`;
  }

  async function refreshLiveRates(manual = false) {
    const refreshBtn = document.getElementById('btn-refresh-rates'), refreshIcon = document.getElementById('icon-refresh-rates'), refreshText = document.getElementById('text-refresh-rates');
    if (refreshIcon) refreshIcon.classList.add('fa-spin');
    if (refreshText) refreshText.innerText = '갱신 중...';
    if (refreshBtn) refreshBtn.disabled = true;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);
      const res = await fetch('https://open.er-api.com/v6/latest/USD', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.result !== 'success' || !data.rates || !data.rates.KRW) throw new Error('Invalid exchange rate payload');
      const usdInKrw = Number(data.rates.KRW);
      if (!State.liveRates) State.liveRates = {};
      Object.keys(CURRENCY_INFO).forEach(c => {
        if (c === 'KRW') State.liveRates[c] = 1;
        else if (c === 'USD') State.liveRates[c] = Math.round(usdInKrw * 10) / 10;
        else if (data.rates[c] && Number(data.rates[c]) > 0) {
          const cInKrw = usdInKrw / Number(data.rates[c]);
          State.liveRates[c] = cInKrw >= 100 ? Math.round(cInKrw * 10) / 10 : cInKrw >= 1 ? Math.round(cInKrw * 100) / 100 : Math.round(cInKrw * 10000) / 10000;
        }
      });
      State.ratesLastUpdated = new Date().toISOString();
      localStorage.setItem('st_live_rates', JSON.stringify(State.liveRates));
      localStorage.setItem('st_rates_last_updated', State.ratesLastUpdated);
      renderActiveTripWorkspace();
      const manager = document.getElementById('modal-rates-manager');
      if (manager && !manager.classList.contains('sheet-closed')) renderRatesManager();
      if (manual) showToast(`🎉 실시간 시장 환율 갱신 완료! (1 USD = ₩${(State.liveRates.USD || CURRENCY_INFO.USD.rate).toLocaleString()})`);
    } catch (err) {
      console.warn('[Rates] Live exchange rate refresh failed:', err);
      if (manual) showToast('⚠️ 실시간 환율 서버 연결 실패: 기존 캐시(또는 기본 환율)를 유지합니다.');
    } finally {
      if (refreshIcon) refreshIcon.classList.remove('fa-spin');
      if (refreshText) refreshText.innerText = '환율 갱신';
      if (refreshBtn) refreshBtn.disabled = false;
      updateTimestamp();
    }
  }

  function rateRowHtml(c) {
    const currency = info(c), codeHtml = escapeHtml(c);
    if (c === 'KRW') {
      return `
        <div class="p-3 bg-[#080b12] border border-[#1e263c] rounded-xl flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <span class="text-2xl">${escapeHtml(currency.flag)}</span>
            <div>
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-black text-white">${codeHtml}</span>
                <span class="text-[10px] text-slate-400">${escapeHtml(currency.name)}</span>
                <span class="text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">기준 통화</span>
              </div>
              <div class="text-xs text-slate-300 font-bold mt-0.5">1 KRW = ₩1 (기본 기준)</div>
            </div>
          </div>
        </div>`;
    }
    const appliedRate = getCurrencyRate(c);
    const custom = State.customRates && State.customRates[c] != null;
    const live = !custom && State.liveRates && State.liveRates[c] != null;
    const sourceHtml = custom
      ? '<span class="sulsul-badge-amber text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">직접 설정</span>'
      : live
        ? '<span class="sulsul-badge-emerald text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">실시간 API</span>'
        : '<span class="text-[9px] px-1.5 py-0.5 rounded font-bold bg-stone-100 text-stone-700 border border-stone-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">기본 환율</span>';
    return `
      <div class="p-2.5 bg-[#080b12] border ${custom ? 'border-amber-500/40' : 'border-[#1e263c]'} rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition">
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="text-2xl shrink-0">${escapeHtml(currency.flag)}</span>
          <div class="min-w-0">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-xs font-black text-white">${codeHtml}</span>
              <span class="text-[10px] text-slate-400 truncate">${escapeHtml(currency.name)}</span>
              ${sourceHtml}
            </div>
            <div class="text-xs text-amber-400 font-black mt-0.5 font-mono">1 ${codeHtml} = ₩${appliedRate.toLocaleString()}</div>
          </div>
        </div>
        <div class="flex items-center gap-1.5 self-end sm:self-center shrink-0">
          <input type="number" step="any" id="custom-rate-input-${codeHtml}" value="${Number(appliedRate)}" aria-label="${codeHtml} 환율(원)" class="w-24 px-2 py-1 bg-[#0f1422] border border-[#1e263c] rounded-lg text-xs text-white text-right focus:outline-none focus:border-amber-500 font-mono font-bold">
          <span class="text-[11px] text-slate-400">원</span>
          <button type="button" data-on-click="exchange.saveRate" data-curr="${codeHtml}" class="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold transition border border-amber-500/30 cursor-pointer">적용</button>
          ${custom ? `<button type="button" data-on-click="exchange.resetRate" data-curr="${codeHtml}" class="px-2 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 dark:text-rose-300 text-xs font-bold transition border border-rose-300 dark:border-rose-800 cursor-pointer" title="직접 맞춤 환율 해제">해제</button>` : ''}
        </div>
      </div>`;
  }

  function renderRatesManager() {
    const container = document.getElementById('rates-manager-list');
    if (!container) return;
    const trip = getActiveTrip();
    const active = trip && Array.isArray(trip.activeCurrencies) ? trip.activeCurrencies : ['KRW', 'USD'];
    const all = Object.keys(CURRENCY_INFO).sort((a, b) => {
      if (a === 'KRW') return -1;
      if (b === 'KRW') return 1;
      const aActive = active.includes(a), bActive = active.includes(b);
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return a.localeCompare(b);
    });
    container.innerHTML = all.map(rateRowHtml).join('');
  }

  function openRatesManager() {
    renderRatesManager();
    openModal('modal-rates-manager');
  }

  // 맞춤 환율은 이 기기 설정(st_custom_rates)이다. 여행 자료가 아니므로 여행 저장 명령을 거치지 않는다.
  function saveCustomRate(curr) {
    if (!CURRENCY_INFO[curr]) return false;
    const input = document.getElementById(`custom-rate-input-${curr}`);
    if (!input) return false;
    const rate = parseFloat(input.value);
    if (isNaN(rate) || rate <= 0) { showToast('⚠️ 0보다 큰 올바른 환율 숫자를 입력하세요.'); return false; }
    if (!State.customRates) State.customRates = {};
    State.customRates[curr] = rate;
    localStorage.setItem('st_custom_rates', JSON.stringify(State.customRates));
    renderRatesManager();
    renderActiveTripWorkspace();
    showToast(`✅ [${curr}] 환율이 ₩${rate.toLocaleString()} (사용자 맞춤)으로 설정되었습니다.`);
    return true;
  }

  function resetCustomRate(curr) {
    if (State.customRates && State.customRates[curr] != null) {
      delete State.customRates[curr];
      localStorage.setItem('st_custom_rates', JSON.stringify(State.customRates));
    }
    renderRatesManager();
    renderActiveTripWorkspace();
    showToast(`↩️ [${curr}] 맞춤 설정을 해제하고 ${State.liveRates && State.liveRates[curr] ? '실시간' : '기본'} 환율로 복원했습니다.`);
  }

  function resetAllRates() {
    if (!confirm('모든 통화의 직접 입력 맞춤 환율을 해제하고 기본/실시간 환율로 초기화하시겠습니까?')) return false;
    State.customRates = {};
    localStorage.removeItem('st_custom_rates');
    renderRatesManager();
    renderActiveTripWorkspace();
    showToast('↩️ 모든 통화의 맞춤 환율이 초기화되었습니다.');
    return true;
  }

  T.UiActions.define('exchange', {
    fromCurr: () => currencyChanged('exch-form-from-curr', 'exch-form-to-curr'),
    toCurr: () => currencyChanged('exch-form-to-curr', 'exch-form-from-curr'),
    fromAmount: () => fromAmountChanged(),
    rate: () => fromAmountChanged(),
    toAmount: () => toAmountChanged(),
    syncRate: () => syncRate(),
    submit: () => submit(),
    mep: () => toggleMep(),
    refreshRates: () => refreshLiveRates(true),
    saveRate: element => saveCustomRate(element.dataset.curr),
    resetRate: element => resetCustomRate(element.dataset.curr),
    resetAll: () => resetAllRates()
  });

  T.ExchangeUI = Object.freeze({ open, updateRate, submit, syncRate, toggleMep, updateTimestamp, refreshLiveRates, renderRatesManager, openRatesManager, saveCustomRate, resetCustomRate, resetAllRates, recommendedRate });
})(typeof window !== 'undefined' ? window : globalThis);
