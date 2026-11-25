/* 새 여행 만들기 모달·전 세계 국가/도시 스마트 선택기·시차 매트릭스·거점 일자 배분·자동 일정 생성 (v2.2.4, 계획 4단계 15차).
 * index.html의 #modal-create-trip 제어와
 * renderConceptChips·toggleConceptChip·initCreateTripDestinationPicker·setCreateTripRegionFilter·
 * handleCreateTripSearch·clearCreateTripSearch·renderCreateTripCountryChips·addCustomCreateTripCountry·
 * toggleCreateTripCountry·renderCreateTripSelectedBoard·toggleCreateTripCity·addCustomCreateTripCity·
 * syncCreateTripHiddenInputs·handleTripDatesChange·populateCreateTripCurrencyOptions·openCreateTripModal·
 * handleTripFormCountryInput·selectQuickFormCountry·detectDestinationTimezone·updateCreateTripTzBanner·
 * allocateTripHubs·generateAutoSpotsForTrip·submitCreateTrip(약 1,230줄)을 옮겼다.
 * 셸 함수(getActiveTrip·cleanCityName·resolveCountryInfo·resolveCanonicalCountry·resolveTripPack·
 * isYunnanTrip·isSouthAmericaTrip·cleanApiKey·splitTravelList·timeToMinutes·minutesToTime·
 * commitTripsCommand·generateAiItinerary·dismissDemoOffer·openModal·closeModal·switchView·showToast·escapeHtml)와
 * 전역 State·COUNTRY_DATABASE·CURRENCY_INFO·TRAVEL_CONCEPTS는 부를 때 찾는다.
 * 모든 동작은 data-on-click/data-on-input/data-on-change="createTrip.*"로 잇고,
 * 불러올 때는 등록만 하고 문서를 건드리지 않는다. */
(function (root) {
  'use strict';
  const T = root.SulsulTravel = root.SulsulTravel || {};
  const $ = id => document.getElementById(id);

  const REGION_KEYS = Object.freeze([
    'all', 'east_asia', 'southeast_asia', 'south_central_asia',
    'europe', 'americas', 'oceania', 'mideast_africa'
  ]);

  let tzListenersBound = false;
  let customCityKeyBound = false;
  let submittingTrip = false;

  // UTC 자정 기준으로 날짜를 더해 한국(UTC+9) 등 양(+)의 시간대에서 하루가 앞당겨지지 않게 한다.
  function formatCalendarDateOffset(startIso, offsetDays) {
    if (!startIso || !/^\d{4}-\d{2}-\d{2}$/.test(String(startIso))) {
      return `Day ${Number(offsetDays) + 1}`;
    }
    const [y, m, d] = String(startIso).split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + Number(offsetDays || 0)));
    return dt.toISOString().slice(0, 10);
  }

  function resolveSuggestedYear() {
    const startVal = $('trip-form-start')?.value || '';
    const match = /^(\d{4})-/.exec(startVal);
    return match ? match[1] : String(new Date().getFullYear());
  }

  // ── 1. 여행 컨셉 칩 ──
  function renderConceptChips() {
    const container = $('trip-form-concept-chips');
    if (!container) return;
    container.innerHTML = TRAVEL_CONCEPTS.map(c => {
      const isSelected = State.createTripSelectedConcepts.includes(c.id);
      return `<button type="button" data-on-click="createTrip.toggleConcept" data-concept="${escapeHtml(c.id)}" aria-pressed="${isSelected ? 'true' : 'false'}" class="${isSelected ? 'sulsul-chip is-active' : 'sulsul-chip'}">${escapeHtml(c.label)}</button>`;
    }).join('');
  }

  function toggleConceptChip(conceptId) {
    if (!conceptId) return;
    const idx = State.createTripSelectedConcepts.indexOf(conceptId);
    if (idx >= 0) {
      State.createTripSelectedConcepts.splice(idx, 1);
    } else {
      State.createTripSelectedConcepts.push(conceptId);
    }
    renderConceptChips();
  }

  // ── 2. 전 세계 국가·도시 스마트 선택기 ──
  function ensureCustomCityKeyListener() {
    if (customCityKeyBound) return;
    const board = $('create-trip-selected-destinations-board');
    if (!board) return;
    board.addEventListener('keydown', evt => {
      if (evt.key !== 'Enter') return;
      const target = evt.target;
      if (target && target.dataset && target.dataset.customCityCountry) {
        evt.preventDefault();
        addCustomCreateTripCity(target.dataset.customCityCountry);
      }
    });
    customCityKeyBound = true;
  }

  function initCreateTripDestinationPicker() {
    State.createTripSelectedRegion = 'all';
    State.createTripSearchQuery = '';
    State.createTripSelectedCountries = [];
    State.createTripSelectedCities = {};
    State.createTripCustomCities = {};

    const searchInput = $('create-trip-search-input');
    if (searchInput) searchInput.value = '';
    const clearBtn = $('btn-clear-create-search');
    if (clearBtn) clearBtn.classList.add('hidden');

    ensureCustomCityKeyListener();
    setCreateTripRegionFilter('all');
    renderCreateTripCountryChips();
    renderCreateTripSelectedBoard();
  }

  function setCreateTripRegionFilter(regionKey = 'all') {
    const safeRegion = REGION_KEYS.includes(regionKey) ? regionKey : 'all';
    State.createTripSelectedRegion = safeRegion;
    REGION_KEYS.forEach(r => {
      const tab = $(`tab-reg-${r}`);
      if (tab) {
        const active = r === safeRegion;
        tab.className = active ? 'sulsul-chip is-active shrink-0' : 'sulsul-chip shrink-0';
        tab.setAttribute('aria-pressed', String(active));
      }
    });
    renderCreateTripCountryChips();
  }

  function handleCreateTripSearch(val) {
    State.createTripSearchQuery = (val || '').trim().toLowerCase();
    const clearBtn = $('btn-clear-create-search');
    if (clearBtn) {
      clearBtn.classList.toggle('hidden', !State.createTripSearchQuery);
    }
    renderCreateTripCountryChips();
  }

  function clearCreateTripSearch() {
    const searchInput = $('create-trip-search-input');
    if (searchInput) searchInput.value = '';
    handleCreateTripSearch('');
  }

  function renderCreateTripCountryChips() {
    const container = $('create-trip-country-chips');
    const badge = $('create-trip-country-count-badge');
    if (!container) return;

    const q = State.createTripSearchQuery || '';
    const rawInputQuery = ($('create-trip-search-input')?.value || q).trim();
    const reg = State.createTripSelectedRegion || 'all';

    const filtered = COUNTRY_DATABASE.filter(c => {
      const matchesReg = (reg === 'all' || c.region === reg || (reg === 'other' && (c.region === 'oceania' || c.region === 'mideast_africa')));
      if (!matchesReg) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.currency.toLowerCase().includes(q) ||
        (c.aliases || []).some(a => a.toLowerCase().includes(q)) ||
        (c.popularCities || []).some(city => city.toLowerCase().includes(q));
    });

    if (badge) badge.innerText = `${filtered.length}개국 검색됨`;

    if (filtered.length === 0) {
      container.innerHTML = [
        '<div class="py-3 px-3 text-[11px] text-stone-500 dark:text-stone-400 w-full text-center space-y-2">',
        `  <div>'${escapeHtml(rawInputQuery)}' 검색 결과가 데이터베이스에 없습니다.</div>`,
        `  <button type="button" data-on-click="createTrip.addCustomCountry" data-query="${escapeHtml(rawInputQuery)}" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs shadow-sm cursor-pointer transition">`,
        '    <span>🌐</span>',
        `    <span>'${escapeHtml(rawInputQuery)}' 직접 여행지로 추가</span>`,
        '  </button>',
        '</div>'
      ].join('');
      return;
    }

    const parts = filtered.map(c => {
      const isSelected = State.createTripSelectedCountries.includes(c.code);
      return [
        `<button type="button" data-on-click="createTrip.toggleCountry" data-code="${escapeHtml(c.code)}" aria-pressed="${isSelected ? 'true' : 'false'}" class="${isSelected ? 'sulsul-chip is-active' : 'sulsul-chip'}">`,
        `  <span class="text-sm">${escapeHtml(c.flag)}</span>`,
        `  <span>${escapeHtml(c.name)}</span>`,
        `  <span class="text-[10px] opacity-70">${escapeHtml(c.currency)}</span>`,
        isSelected ? '  <span class="text-[10px] ml-0.5">✓</span>' : '',
        '</button>'
      ].join('');
    });

    if (q) {
      parts.push([
        `<button type="button" data-on-click="createTrip.addCustomCountry" data-query="${escapeHtml(rawInputQuery)}" class="sulsul-chip border-dashed font-bold shrink-0" title="직접 입력하여 새 여행지 추가">`,
        '  <span>🌐</span>',
        `  <span>+ '${escapeHtml(rawInputQuery)}' 직접 추가</span>`,
        '</button>'
      ].join(''));
    }

    container.innerHTML = parts.join('');
  }

  function addCustomCreateTripCountry(rawName) {
    if (!rawName || typeof rawName !== 'string') return;
    const name = rawName.trim();
    if (!name) return;

    const existing = COUNTRY_DATABASE.find(c =>
      c.name.toLowerCase() === name.toLowerCase() ||
      (c.aliases || []).some(a => a.toLowerCase() === name.toLowerCase())
    );
    if (existing) {
      if (!State.createTripSelectedCountries.includes(existing.code)) {
        toggleCreateTripCountry(existing.code);
      }
      if (typeof showToast === 'function') showToast(`'${escapeHtml(existing.name)}' 여행지가 선택되었습니다.`);
      return;
    }

    const customCode = 'CUST_' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const newCountry = {
      name: name,
      code: customCode,
      flag: '🌐',
      currency: 'USD',
      currName: '달러',
      symbol: '$',
      region: 'all',
      popularCities: [name],
      aliases: [name.toLowerCase()]
    };
    COUNTRY_DATABASE.push(newCountry);

    toggleCreateTripCountry(customCode);
    if (!State.createTripSelectedCities[customCode]) {
      State.createTripSelectedCities[customCode] = [];
    }
    if (!State.createTripSelectedCities[customCode].includes(name)) {
      State.createTripSelectedCities[customCode].push(name);
    }
    renderCreateTripCountryChips();
    renderCreateTripSelectedBoard();
    syncCreateTripHiddenInputs();
    if (typeof showToast === 'function') showToast(`'${escapeHtml(name)}'(이)가 여행지로 추가되었습니다.`);
  }

  function toggleCreateTripCountry(countryCode) {
    const country = COUNTRY_DATABASE.find(c => c.code === countryCode);
    if (!country) return;

    const idx = State.createTripSelectedCountries.indexOf(countryCode);
    if (idx >= 0) {
      State.createTripSelectedCountries.splice(idx, 1);
      delete State.createTripSelectedCities[countryCode];
      delete State.createTripCustomCities[countryCode];
    } else {
      State.createTripSelectedCountries.push(countryCode);
      State.createTripSelectedCities[countryCode] = [];

      const currSelect = $('trip-form-curr');
      if (currSelect && country.currency) {
        for (let i = 0; i < currSelect.options.length; i++) {
          if (currSelect.options[i].value === country.currency) {
            currSelect.value = country.currency;
            break;
          }
        }
      }
    }

    renderCreateTripCountryChips();
    renderCreateTripSelectedBoard();
    syncCreateTripHiddenInputs();
  }

  function renderCreateTripSelectedBoard() {
    const container = $('create-trip-selected-destinations-board');
    if (!container) return;

    if (!State.createTripSelectedCountries || State.createTripSelectedCountries.length === 0) {
      container.innerHTML = [
        '<div class="p-3 rounded-xl bg-white dark:bg-stone-900 border border-dashed border-amber-400/60 dark:border-amber-700/50 text-center space-y-1">',
        '  <div class="text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center gap-1.5">',
        '    <i class="fa-solid fa-map-location-dot"></i>',
        '    <span>방문할 국가를 위에서 선택해 주세요</span>',
        '  </div>',
        '  <p class="text-[10px] text-stone-500 dark:text-stone-400">',
        '    국가를 선택하면 예상 방문 도시를 복수로 선택하고 AI 일정 동선 순서를 지정할 수 있습니다.',
        '  </p>',
        '</div>'
      ].join('');
      return;
    }

    container.innerHTML = State.createTripSelectedCountries.map(code => {
      const country = COUNTRY_DATABASE.find(c => c.code === code);
      if (!country) return '';

      const selectedCities = State.createTripSelectedCities[code] || [];
      const customCities = State.createTripCustomCities[code] || [];
      const allAvailableCities = [...(country.popularCities || []), ...customCities];
      const uniqueCities = allAvailableCities.filter((city, index, self) => self.indexOf(city) === index);

      const cityButtons = uniqueCities.map(city => {
        const cityIdx = selectedCities.indexOf(city);
        const isCitySelected = cityIdx >= 0;
        const badgeHtml = isCitySelected
          ? `<span class="sulsul-chip-badge">${Number(cityIdx + 1)}</span>`
          : '<span class="text-stone-400 text-[10px]">+</span>';
        return [
          `<button type="button" data-city-chip="true" data-on-click="createTrip.toggleCity" data-code="${escapeHtml(country.code)}" data-city="${escapeHtml(city)}" aria-pressed="${isCitySelected ? 'true' : 'false'}" class="${isCitySelected ? 'sulsul-chip is-active' : 'sulsul-chip'}">`,
          badgeHtml,
          `  <span>${escapeHtml(city)}</span>`,
          '</button>'
        ].join('');
      }).join('');

      return [
        '<div class="p-3 rounded-xl bg-white dark:bg-stone-900 border border-[#e8e2d5] dark:border-stone-800 space-y-2.5 shadow-sm w-full max-w-full overflow-hidden">',
        '  <div class="flex items-center justify-between gap-2 border-b border-[#e8e2d5]/60 dark:border-stone-800 pb-2 flex-wrap sm:flex-nowrap">',
        '    <div class="flex items-center gap-1.5 min-w-0 flex-wrap">',
        `      <span class="text-base sm:text-lg shrink-0">${escapeHtml(country.flag)}</span>`,
        `      <span class="font-black text-xs text-[#1c1917] dark:text-stone-100 truncate">${escapeHtml(country.name)}</span>`,
        `      <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 shrink-0">${escapeHtml(country.currency)} (${escapeHtml(country.currName)})</span>`,
        `      <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0">${Number(selectedCities.length)}개 도시 선택됨</span>`,
        '    </div>',
        `    <button type="button" data-on-click="createTrip.toggleCountry" data-code="${escapeHtml(country.code)}" class="text-stone-400 hover:text-rose-500 text-xs px-1.5 py-0.5 rounded transition cursor-pointer shrink-0 ml-auto" title="이 국가 제외">✕ 제외</button>`,
        '  </div>',
        '  <div class="space-y-1.5 w-full">',
        '    <div class="text-[11px] text-[#44403c] dark:text-stone-300 font-bold flex items-center justify-between"><span>예상 방문 도시 (터치하여 선택/해제, 순서대로 동선 반영):</span></div>',
        '    <div class="flex flex-wrap gap-1.5 pt-0.5 w-full">' + cityButtons + '</div>',
        '  </div>',
        '  <div class="flex items-center gap-1.5 pt-1 w-full min-w-0">',
        '    <div class="relative flex-1 min-w-0">',
        `      <input type="text" id="input-custom-city-${escapeHtml(country.code)}" data-custom-city-country="${escapeHtml(country.code)}" placeholder="목록 외 소도시/근교 (예: 론다)" class="w-full min-w-0 px-2.5 py-1.5 bg-[#faf8f5] dark:bg-stone-800 border border-[#e8e2d5] dark:border-stone-700 rounded-lg text-xs text-[#1c1917] dark:text-[#ededed] placeholder-stone-400 focus:outline-none focus:border-[#a2601b]">`,
        '    </div>',
        `    <button type="button" data-on-click="createTrip.addCustomCity" data-code="${escapeHtml(country.code)}" class="px-2.5 sm:px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-bold border border-stone-200 dark:border-stone-700 transition cursor-pointer shrink-0 whitespace-nowrap">+ 도시 추가</button>`,
        '  </div>',
        '</div>'
      ].join('');
    }).join('');
  }

  function toggleCreateTripCity(countryCode, cityName) {
    if (!countryCode || !cityName) return;
    if (!State.createTripSelectedCities[countryCode]) {
      State.createTripSelectedCities[countryCode] = [];
    }
    const list = State.createTripSelectedCities[countryCode];
    const idx = list.indexOf(cityName);
    if (idx >= 0) {
      list.splice(idx, 1);
    } else {
      list.push(cityName);
    }
    renderCreateTripSelectedBoard();
    syncCreateTripHiddenInputs();
  }

  function addCustomCreateTripCity(countryCode) {
    const input = $(`input-custom-city-${countryCode}`);
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;

    if (!State.createTripCustomCities[countryCode]) {
      State.createTripCustomCities[countryCode] = [];
    }
    if (!State.createTripCustomCities[countryCode].includes(val)) {
      State.createTripCustomCities[countryCode].push(val);
    }
    if (!State.createTripSelectedCities[countryCode]) {
      State.createTripSelectedCities[countryCode] = [];
    }
    if (!State.createTripSelectedCities[countryCode].includes(val)) {
      State.createTripSelectedCities[countryCode].push(val);
    }

    input.value = '';
    renderCreateTripSelectedBoard();
    syncCreateTripHiddenInputs();
  }

  function syncCreateTripHiddenInputs() {
    const countriesInput = $('trip-form-countries');
    const citiesInput = $('trip-form-cities');
    const titleInput = $('trip-form-title');

    const selectedCountryObjs = State.createTripSelectedCountries
      .map(code => COUNTRY_DATABASE.find(c => c.code === code))
      .filter(Boolean);

    const countryNames = selectedCountryObjs.map(c => c.name);
    if (countriesInput) {
      countriesInput.value = countryNames.join(', ');
    }

    const allCitiesOrdered = [];
    selectedCountryObjs.forEach(c => {
      const cCities = State.createTripSelectedCities[c.code] || [];
      cCities.forEach(city => {
        if (!allCitiesOrdered.includes(city)) allCitiesOrdered.push(city);
      });
    });

    if (citiesInput) {
      citiesInput.value = allCitiesOrdered.join(', ');
    }

    const year = resolveSuggestedYear();
    if (titleInput && (!titleInput.value || titleInput.value.includes('여행') || titleInput.value.includes('기행') || /^\d{4}\s/.test(titleInput.value))) {
      if (countryNames.length > 0) {
        const mainCitiesStr = allCitiesOrdered.slice(0, 3).join('·');
        const destSummary = countryNames.length > 1
          ? `${countryNames.join(' & ')} 일주`
          : `${countryNames[0]} ${mainCitiesStr || '여정'}`;
        titleInput.value = `${year} ${destSummary} 여행`;
      }
    }

    updateCreateTripTzBanner();
  }

  function handleTripDatesChange() {
    updateCreateTripTzBanner();
  }

  function populateCreateTripCurrencyOptions() {
    const sel = $('trip-form-curr');
    if (!sel) return;
    const currentVal = sel.value || 'KRW';
    const popular = ['KRW', 'USD', 'EUR', 'JPY', 'CNY', 'GBP', 'CHF', 'TWD', 'HKD', 'THB', 'VND', 'SGD', 'AUD', 'CAD'];
    const allCurrs = Object.keys(CURRENCY_INFO);
    const others = allCurrs.filter(c => !popular.includes(c)).sort();
    const sorted = [...popular, ...others];
    sel.innerHTML = sorted.map(c => {
      const info = CURRENCY_INFO[c] || { name: c, flag: '🌐' };
      return `<option value="${escapeHtml(c)}">${escapeHtml(info.flag)} ${escapeHtml(c)} (${escapeHtml(info.name)})</option>`;
    }).join('');
    sel.value = sorted.includes(currentVal) ? currentVal : 'KRW';
  }

  function openCreateTripModal() {
    populateCreateTripCurrencyOptions();
    const today = T.TripAdapter.localDateKey(new Date(), getActiveTrip()?.timeZone);
    const titleInput = $('trip-form-title');
    if (titleInput) titleInput.value = '';
    const countriesInput = $('trip-form-countries');
    if (countriesInput) countriesInput.value = '';
    const citiesInput = $('trip-form-cities');
    if (citiesInput) citiesInput.value = '';
    const styleInput = $('trip-form-style');
    if (styleInput) styleInput.value = '';
    const budgetInput = $('trip-form-budget');
    if (budgetInput) budgetInput.value = '3000000';
    const startInput = $('trip-form-start');
    if (startInput) startInput.value = today;
    const endInput = $('trip-form-end');
    if (endInput) endInput.value = '';
    const arrInput = $('trip-form-arrival-time');
    if (arrInput) arrInput.value = '14:00';
    const depInput = $('trip-form-departure-time');
    if (depInput) depInput.value = '17:00';
    const wishlistInput = $('trip-form-wishlist');
    if (wishlistInput) wishlistInput.value = '';
    const aiAutoCheck = $('trip-form-ai-auto');
    if (aiAutoCheck) aiAutoCheck.checked = true;

    State.createTripSelectedConcepts = ['배낭', '자연'];
    renderConceptChips();
    initCreateTripDestinationPicker();

    if (!tzListenersBound) {
      if (titleInput) titleInput.addEventListener('input', updateCreateTripTzBanner);
      if (countriesInput) countriesInput.addEventListener('input', updateCreateTripTzBanner);
      tzListenersBound = true;
    }

    updateCreateTripTzBanner();
    openModal('modal-create-trip');
  }

  function handleTripFormCountryInput() {
    const input = $('trip-form-countries');
    const currSelect = $('trip-form-curr');
    if (!input || !currSelect) return;
    const val = input.value.trim();
    if (!val) return;

    const firstCountry = val.split(/[,/·\s]+/)[0];
    const info = resolveCountryInfo(firstCountry);
    if (info && info.currency) {
      for (let i = 0; i < currSelect.options.length; i++) {
        if (currSelect.options[i].value === info.currency) {
          currSelect.value = info.currency;
          break;
        }
      }
    }
  }

  function selectQuickFormCountry(countryName, suggestedCities, currencyCode) {
    const country = COUNTRY_DATABASE.find(c => c.name === countryName || (c.aliases || []).includes(countryName));
    if (country) {
      State.createTripSelectedCountries = [country.code];
      if (suggestedCities) {
        State.createTripSelectedCities[country.code] = suggestedCities.split(',').map(s => s.trim()).filter(Boolean);
      }
      renderCreateTripCountryChips();
      renderCreateTripSelectedBoard();
      syncCreateTripHiddenInputs();
    } else {
      const cInput = $('trip-form-countries');
      const ctInput = $('trip-form-cities');
      const currSelect = $('trip-form-curr');
      const titleInput = $('trip-form-title');

      if (cInput) cInput.value = countryName;
      if (ctInput && suggestedCities) ctInput.value = suggestedCities;
      if (currSelect && currencyCode) currSelect.value = currencyCode;
      if (titleInput && (!titleInput.value || titleInput.value.includes('여행'))) {
        titleInput.value = `${resolveSuggestedYear()} ${countryName} ${(suggestedCities || '').split(',')[0]} 힐링 여행`;
      }
      updateCreateTripTzBanner();
    }
  }

  // ── 3. 국가별 시차 & 비행 소요 시간 스마트 매트릭스 ──
  function detectDestinationTimezone(destStr) {
    const s = (destStr || '').toLowerCase();

    if (/제주|부산|강릉|속초|경주|여수|전주|서울|인천|대구|광주|남해|통영|국내/.test(s)) {
      return {
        region: '국내',
        tzDiff: 0,
        flightHours: 1,
        returnFlightHours: 1,
        tzLabel: '시차 없음',
        calcDesc: '국내 이동 ➔ 당일 도착',
        isCrossDateLine: false
      };
    }

    if (/일본|도쿄|오사카|후쿠오카|삿포로|교토|오키나와|나고야|유후인|japan|tokyo|osaka|fukuoka|sapporo/.test(s)) {
      return {
        region: '일본',
        tzDiff: 0,
        flightHours: 2.5,
        returnFlightHours: 2.5,
        tzLabel: '시차 없음 (UTC+9)',
        calcDesc: '인천 출발 ➔ 당일 낮 착륙',
        isCrossDateLine: false
      };
    }

    if (/대만|타이베이|가오슝|홍콩|마카오|taiwan|taipei|hong kong|몽골|울란바토르|mongolia|중국|베이징|상하이|칭다오|시안|운남|윈난|리장|china|beijing|shanghai/.test(s)) {
      return {
        region: '동아시아/중화권',
        tzDiff: -1,
        flightHours: 3.5,
        returnFlightHours: 3.5,
        tzLabel: '한국보다 1시간 느림 (UTC+8)',
        calcDesc: '인천 출발 ➔ 당일 착륙',
        isCrossDateLine: false
      };
    }

    if (/베트남|다낭|나트랑|푸꾸옥|하노이|호치민|태국|방콕|푸켓|치앙마이|vietnam|danang|thailand|bangkok|singapore|싱가포르|발리|인도네시아|bali|필리핀|세부|보라카이|마닐라|말레이시아|쿠알라룸푸르|코타키나발루|philippines|cebu/.test(s)) {
      return {
        region: '동남아시아',
        tzDiff: -2,
        flightHours: 5,
        returnFlightHours: 5,
        tzLabel: '한국보다 1~2시간 느림 (UTC+7)',
        calcDesc: '인천 출발 ➔ 당일 오후/저녁 착륙',
        isCrossDateLine: false
      };
    }

    if (/괌|사이판|guam|saipan/.test(s)) {
      return {
        region: '대양주(괌/사이판)',
        tzDiff: 1,
        flightHours: 4.5,
        returnFlightHours: 4.5,
        tzLabel: '한국보다 1시간 빠름 (UTC+10)',
        calcDesc: '인천 출발 ➔ 당일 착륙',
        isCrossDateLine: false
      };
    }

    if (/하와이|호놀룰루|오아후|마우이|hawaii|honolulu/.test(s)) {
      return {
        region: '미국 하와이',
        tzDiff: -19,
        flightHours: 8.5,
        returnFlightHours: 10.5,
        tzLabel: '한국보다 19시간 느림 (UTC-10)',
        calcDesc: '날짜변경선: 현지 당일 오전 착륙 | 귀국: +1일 익일 도착',
        isCrossDateLine: true
      };
    }

    if (/로스앤젤레스|la\b|lax|샌프란시스코|시애틀|라스베이거스|캘리포니아|포틀랜드|san francisco|los angeles|seattle|las vegas|미국 서부|밴쿠버|vancouver/.test(s)) {
      return {
        region: '미국/캐나다 서부',
        tzDiff: -16,
        flightHours: 11.5,
        returnFlightHours: 13,
        tzLabel: '한국보다 16시간 느림 (UTC-7)',
        calcDesc: '날짜변경선: 현지 당일 오전 착륙 | 귀국: +1일 익일 도착',
        isCrossDateLine: true
      };
    }

    if (/뉴욕|new york|nyc|워싱턴|보스턴|시카고|마이애미|토론토|몬트리올|미국 동부|미국|캐나다|usa|america/.test(s)) {
      return {
        region: '미국/캐나다 동부',
        tzDiff: -13,
        flightHours: 14.5,
        returnFlightHours: 15,
        tzLabel: '한국보다 13시간 느림 (UTC-4)',
        calcDesc: '한국 출발 ➔ 현지 당일 착륙 | 귀국: +1일 익일 도착',
        isCrossDateLine: false
      };
    }

    if (/유럽|프랑스|파리|스페인|바르셀로나|마드리드|이탈리아|로마|베네치아|피렌체|영국|런던|스위스|인터라켄|취리히|독일|뮌헨|베를린|오스트리아|비엔나|빈|체코|프라하|헝가리|부다페스트|포르투갈|리스본|포르투|크로아티아|네덜란드|암스테르담|벨기에|europe|france|paris|spain|italy|rome|london|germany|swiss|prague|lisbon/.test(s)) {
      return {
        region: '유럽',
        tzDiff: -7,
        flightHours: 14,
        returnFlightHours: 12,
        tzLabel: '한국보다 7시간 느림 (UTC+2 서머타임)',
        calcDesc: '한국 오전 출발 ➔ 현지 당일 저녁 도착 | 귀국: +1일 익일 도착',
        isCrossDateLine: false
      };
    }

    if (/두바이|dubai|아랍에미리트|uae|카타르|도하|튀르키예|터키|이스탄불|turkey|istanbul/.test(s)) {
      return {
        region: '중동/튀르키예',
        tzDiff: -5,
        flightHours: 10,
        returnFlightHours: 9,
        tzLabel: '한국보다 5~6시간 느림 (UTC+3~4)',
        calcDesc: '한국 출발 ➔ 현지 당일 도착 | 귀국: +1일 익일 도착',
        isCrossDateLine: false
      };
    }

    if (/호주|오스트레일리아|시드니|멜버른|브리즈번|골드코스트|뉴질랜드|오클랜드|australia|sydney|melbourne|new zealand/.test(s)) {
      return {
        region: '대양주(호주/뉴질랜드)',
        tzDiff: 1,
        flightHours: 10.5,
        returnFlightHours: 10.5,
        tzLabel: '한국보다 1~2시간 빠름 (UTC+10)',
        calcDesc: '야간 비행 ➔ 현지 아침/낮 착륙 | 귀국: 당일/익일 도착',
        isCrossDateLine: false
      };
    }

    if (/남미|페루|리마|쿠스코|볼리비아|우유니|아르헨티나|부에노스아이레스|칠레|산티아고|브라질|리오|peru|lima|argentina|brazil/.test(s)) {
      return {
        region: '남아메리카',
        tzDiff: -14,
        flightHours: 24,
        returnFlightHours: 24,
        tzLabel: '한국보다 12~14시간 느림 (UTC-5)',
        calcDesc: '환승 20~24h 소요 | 출국·귀국 모두 익일(+1일) 도착',
        isCrossDateLine: false
      };
    }

    return {
      region: '단거리/동아시아',
      tzDiff: 0,
      flightHours: 2.5,
      returnFlightHours: 2.5,
      tzLabel: '시차 0h (동일 시차권)',
      calcDesc: '인천 출발 ➔ 당일 도착',
      isCrossDateLine: false
    };
  }

  function updateCreateTripTzBanner() {
    const textEl = $('trip-form-tz-text');
    const calcEl = $('trip-form-tz-calc');
    if (!textEl || !calcEl) return;

    const title = $('trip-form-title')?.value || '';
    const countries = $('trip-form-countries')?.value || '';
    const destStr = (countries + ' ' + title).trim();

    const tzInfo = detectDestinationTimezone(destStr);
    textEl.textContent = `${tzInfo.region} (시차: ${tzInfo.tzLabel} · 직항 약 ${tzInfo.flightHours}h)`;
    calcEl.textContent = tzInfo.calcDesc;
  }

  // ── 4. 거시적 거점 & 일자 배분 엔진 (Macro Hub Allocation Engine) ──
  function allocateTripHubs(countries = [], cities = [], durationDays = 5, manualDaysMap = null) {
    const rawCountries = (Array.isArray(countries) ? countries : [countries]).filter(Boolean);
    const rawCities = (Array.isArray(cities) ? cities : [cities]).filter(Boolean);

    let hubs = [];
    if (rawCountries.length > 0) {
      hubs = rawCountries.map(cName => {
        const cClean = cleanCityName(cName);
        const dbObj = (typeof COUNTRY_DATABASE !== 'undefined')
          ? COUNTRY_DATABASE.find(c => c.name === cClean || c.code === cClean || (c.aliases || []).includes(cClean))
          : null;

        // COUNTRY_DATABASE는 popularCities를 사용하므로 popularCities와 cities 모두 대조한다.
        const dbCityList = dbObj ? [...(dbObj.popularCities || []), ...(dbObj.cities || [])] : [];
        const myCities = rawCities.filter(cityName => {
          if (!dbObj) return false;
          const cleanCt = cleanCityName(cityName);
          return dbCityList.some(dbCt => dbCt.includes(cleanCt) || cleanCt.includes(dbCt)) ||
            Boolean(State.createTripSelectedCities && State.createTripSelectedCities[dbObj.code] && State.createTripSelectedCities[dbObj.code].includes(cityName));
        });

        return {
          name: cClean,
          country: cClean,
          code: dbObj ? dbObj.code : '',
          flag: dbObj ? dbObj.flag : '✈️',
          currency: dbObj ? dbObj.currency : 'KRW',
          cities: myCities
        };
      });

      rawCities.forEach(ct => {
        const matched = hubs.some(h => h.cities.includes(ct));
        if (!matched && hubs.length > 0) {
          hubs[0].cities.push(ct);
        }
      });
    } else if (rawCities.length > 0) {
      hubs = rawCities.map(cityName => ({
        name: cleanCityName(cityName),
        country: cleanCityName(cityName),
        flag: '📍',
        currency: 'KRW',
        cities: [cityName]
      }));
    } else {
      hubs = [{ name: '여행지', country: '여행지', flag: '✈️', currency: 'KRW', cities: [] }];
    }

    const totalDays = Math.max(1, Number(durationDays) || 5);
    const numHubs = hubs.length;

    let allocatedDays = [];
    if (manualDaysMap && Array.isArray(manualDaysMap) && manualDaysMap.length === numHubs) {
      const sum = manualDaysMap.reduce((a, b) => a + (Number(b) || 0), 0);
      if (sum === totalDays) {
        allocatedDays = manualDaysMap.map(d => Math.max(0, Number(d) || 0));
      }
    }

    if (!allocatedDays.length) {
      if (totalDays <= numHubs) {
        allocatedDays = hubs.map((_, idx) => (idx < totalDays ? 1 : 0));
      } else {
        const base = Math.floor(totalDays / numHubs);
        let rem = totalDays % numHubs;
        allocatedDays = hubs.map(() => {
          let d = base;
          if (rem > 0) {
            d += 1;
            rem -= 1;
          }
          return Math.max(1, d);
        });
      }
    }

    let curDay = 1;
    return hubs.map((hub, idx) => {
      const days = allocatedDays[idx] ?? 0;
      if (days <= 0) {
        return { ...hub, dayCount: 0, startDayNum: curDay, endDayNum: curDay - 1 };
      }
      const startDay = curDay;
      const endDay = curDay + days - 1;
      curDay += days;
      return {
        ...hub,
        dayCount: days,
        startDayNum: startDay,
        endDayNum: endDay
      };
    }).filter(h => h.dayCount > 0);
  }

  // ── 5. 오프라인 기본 30분 일정 초안 생성기 ──
  function generateAutoSpotsForTrip(destination, durationDays, concepts, wishlist, arrivalTime = '14:00', departureTime = '17:00', fullDestContext = '', customHubs = null) {
    const conceptList = (concepts && concepts.length > 0) ? concepts : ['사용자 맞춤 여행'];
    const conceptStr = conceptList.join(', ');
    const wishlistItems = wishlist ? wishlist.split(/[,\n]/).map(s => s.trim()).filter(Boolean) : [];
    let wishIndex = 0;

    let hubs = customHubs;
    if (!hubs || !Array.isArray(hubs) || hubs.length === 0) {
      const detectedCountries = splitTravelList(fullDestContext || destination);
      if (detectedCountries.length > 1) {
        hubs = allocateTripHubs(detectedCountries, [], durationDays);
      } else {
        hubs = [{
          name: destination || '여행지',
          country: destination || '여행지',
          cities: [],
          dayCount: durationDays,
          startDayNum: 1,
          endDayNum: durationDays
        }];
      }
    }

    const days = [];
    const stamp = Date.now();

    for (let i = 1; i <= durationDays; i++) {
      const daySpots = [];
      const isFirstDay = (i === 1);
      const isLastDay = (i === durationDays);

      const hub = hubs.find(h => i >= h.startDayNum && i <= h.endDayNum) || hubs[0];
      const hubIdx = hubs.indexOf(hub);
      const hubDay = i - hub.startDayNum + 1;
      const hubCity = (hub.cities && hub.cities.length > 0)
        ? (hub.cities[(hubDay - 1) % hub.cities.length] || hub.name)
        : hub.name;
      const isTransitDay = (!isFirstDay && hubDay === 1 && hubIdx > 0);
      const prevHub = isTransitDay ? hubs[hubIdx - 1] : null;

      const tzInfo = detectDestinationTimezone(hub.name + ' ' + hubCity + ' ' + (fullDestContext || ''));
      const arrMin = timeToMinutes(arrivalTime, 14 * 60);
      const depMin = timeToMinutes(departureTime, 17 * 60);

      if (isFirstDay && durationDays > 1) {
        const arrKstTotalMin = arrMin - (tzInfo.tzDiff * 60);
        const flightDepKstTotalMin = arrKstTotalMin - Math.round(tzInfo.flightHours * 60);
        const flightDepKstMins = ((flightDepKstTotalMin % 1440) + 1440) % 1440;
        const airportCheckinKstMins = ((flightDepKstMins - 180 + 1440) % 1440);
        const homeDepKstMins = ((airportCheckinKstMins - 60 + 1440) % 1440);

        const flightDepKstStr = minutesToTime(flightDepKstMins);
        const airportCheckinKstStr = minutesToTime(airportCheckinKstMins);
        const homeDepKstStr = minutesToTime(homeDepKstMins);
        const arrLocalStr = minutesToTime(arrMin);

        daySpots.push({
          id: `spot_${stamp}_1_0`,
          time: homeDepKstStr,
          title: '집 출발 ➔ 공항 이동 (공항철도/리무진)',
          memo: `[출국 준비: 한국 KST ${homeDepKstStr}] 여권, E-티켓, 해외 결제 카드 지참 및 공항 이동`,
          cat: 'flight',
          cost: 15000,
          currency: 'KRW',
          completed: false,
          isDateLine: tzInfo.isCrossDateLine
        });

        daySpots.push({
          id: `spot_${stamp}_1_1`,
          time: airportCheckinKstStr,
          title: '인천공항 수속 & 보안검색 및 면세구역 진입',
          memo: `[공항 수속: 한국 KST ${airportCheckinKstStr}] 수하물 위탁, 자동출입국 심사, eSIM/환전 수령`,
          cat: 'flight',
          cost: 0,
          currency: 'KRW',
          completed: false,
          isDateLine: tzInfo.isCrossDateLine
        });

        daySpots.push({
          id: `spot_${stamp}_1_2`,
          time: flightDepKstStr,
          title: `비행기 탑승 & ${hub.name}행 항공편 이륙`,
          memo: `[비행 이동: 한국 KST ${flightDepKstStr}] 약 ${tzInfo.flightHours}시간 비행 (기내식, 기내 수면). 시차 ${tzInfo.tzDiff}시간 적용`,
          cat: 'flight',
          cost: 0,
          currency: 'KRW',
          completed: false,
          isDateLine: tzInfo.isCrossDateLine
        });

        const dateLineNote = tzInfo.isCrossDateLine ? ' (날짜변경선 통과 당일 오전 도착)' : '';
        daySpots.push({
          id: `spot_${stamp}_1_3`,
          time: arrLocalStr,
          title: `🛬 ${hub.name} 공항 착륙 & 입국 수속`,
          memo: `[현지 도착: ${tzInfo.tzLabel}${dateLineNote}] 현지 시각 ${arrLocalStr} 착륙. 입국 심사, 수하물 수취, 현지 교통편 탑승`,
          cat: 'flight',
          cost: 10000,
          currency: 'KRW',
          completed: false,
          isDateLine: tzInfo.isCrossDateLine
        });

        daySpots.push({
          id: `spot_${stamp}_1_4`,
          time: minutesToTime(arrMin + 60),
          title: `${hub.name} 공항 ➔ 숙소/호텔 이동`,
          memo: '[시내 이동: 현지시각] 공항철도/리무진버스/택시 탑승 및 시내 이동',
          cat: 'tour',
          cost: 20000,
          currency: 'KRW',
          completed: false
        });

        daySpots.push({
          id: `spot_${stamp}_1_5`,
          time: minutesToTime(arrMin + 120),
          title: `${hub.name} 호텔 체크인 & 짐 정리 및 가벼운 휴식`,
          memo: '[체크인: 현지시각] 예약 바우처 확인, 짐 풀기 및 외출 준비',
          cat: 'lodging',
          cost: 0,
          currency: 'KRW',
          completed: false
        });

        const dinnerMin = Math.max(arrMin + 180, 18 * 60 + 30);
        if (dinnerMin < 22 * 60) {
          let firstDinnerName = `${hub.name} ${hubCity !== hub.name ? hubCity + ' ' : ''}시그니처 로컬 디너`;
          if (wishIndex < wishlistItems.length) {
            firstDinnerName = `⭐ ${wishlistItems[wishIndex++]}`;
          }
          daySpots.push({
            id: `spot_${stamp}_1_6`,
            time: minutesToTime(dinnerMin),
            title: firstDinnerName,
            memo: `[첫날 미식: ${conceptStr}] ${hub.name} 숙소 근처 검증된 대표 맛집 탐방`,
            cat: 'food',
            cost: 40000,
            currency: 'KRW',
            completed: false
          });

          if (dinnerMin + 90 <= 22 * 60 + 30) {
            daySpots.push({
              id: `spot_${stamp}_1_7`,
              time: minutesToTime(dinnerMin + 90),
              title: `${hub.name} 숙소 주변 나이트 산책 & 마트 장보기`,
              memo: '[야경/산책] 가벼운 거리 구경, 편의점/마트 생수 및 간식 구매',
              cat: 'tour',
              cost: 15000,
              currency: 'KRW',
              completed: false
            });
          }
        }
      } else if (isTransitDay) {
        let transitTitle = `${prevHub.name} ➔ ${hub.name} 도시 간 환승 이동 (페리/고속철)`;
        let transitMemo = `[거점 이동] ${prevHub.name}에서 ${hub.name}으로 이동 및 새 거점 여정 시작`;
        if (prevHub.name.includes('홍콩') && hub.name.includes('마카오')) {
          transitTitle = '홍콩 ➔ 마카오 페리/강주아오 대교 탑승 & 이동 (약 1시간)';
          transitMemo = '[해상/대교 이동] 홍콩 페리 터미널 또는 HZMB 버스 탑승, 마카오 입국 심사';
        } else if (prevHub.name.includes('마카오') && hub.name.includes('중국')) {
          transitTitle = '마카오 ➔ 중국 국경(공베이/주하이) 출입국 수속 & 시내 이동';
          transitMemo = '[국경 통과] 공베이 코안 수속 및 중국 시내/고속철 탑승';
        } else if (prevHub.country === '일본' && hub.country === '일본') {
          transitTitle = `${prevHub.name} ➔ ${hub.name} 신칸센 고속열차 탑승 & 이동`;
          transitMemo = `[고속철 이동] 신칸센 지정석 탑승 및 ${hub.name} 역 도착`;
        }

        daySpots.push({
          id: `spot_${stamp}_${i}_0`,
          time: '09:00',
          title: `${prevHub.name} 호텔 체크아웃 & 이동 준비`,
          memo: '[체크아웃] 객실 정리, 체크아웃 수속 및 환승 터미널 이동',
          cat: 'lodging',
          cost: 0,
          currency: 'KRW',
          completed: false
        });
        daySpots.push({
          id: `spot_${stamp}_${i}_1`,
          time: '10:00',
          title: transitTitle,
          memo: transitMemo,
          cat: 'flight',
          cost: 30000,
          currency: 'KRW',
          completed: false
        });
        daySpots.push({
          id: `spot_${stamp}_${i}_2`,
          time: '12:00',
          title: `🛬 ${hub.name} 도착, 호텔 짐 보관 & 시그니처 웰컴 런치`,
          memo: `[새 거점 도착] ${hub.name} 호텔 프론트 짐 보관 후 현지 대표 요리로 점심 식사`,
          cat: 'food',
          cost: 35000,
          currency: 'KRW',
          completed: false
        });
        daySpots.push({
          id: `spot_${stamp}_${i}_3`,
          time: '14:30',
          title: `${hub.name} ${hubCity !== hub.name ? hubCity + ' ' : ''}대표 랜드마크 & 명소 집중 탐방`,
          memo: `[랜드마크] ${hub.name}의 대표 볼거리 및 필수 코스 탐방 (${conceptStr})`,
          cat: 'tour',
          cost: 25000,
          currency: 'KRW',
          completed: false
        });
        daySpots.push({
          id: `spot_${stamp}_${i}_4`,
          time: '17:30',
          title: `${hub.name} 감성 카페 & 로컬 마켓 투어`,
          memo: '[로컬 문화] 골목길 산책, 전통 마켓 및 분위기 좋은 카페 휴식',
          cat: 'shopping',
          cost: 20000,
          currency: 'KRW',
          completed: false
        });
        daySpots.push({
          id: `spot_${stamp}_${i}_5`,
          time: '19:30',
          title: `${hub.name} 시그니처 디너 & 로컬 미식`,
          memo: `[미식 탐방] ${hub.name} 밤을 여는 현지 추천 디너 코스`,
          cat: 'food',
          cost: 45000,
          currency: 'KRW',
          completed: false
        });
        daySpots.push({
          id: `spot_${stamp}_${i}_6`,
          time: '21:30',
          title: `${hub.name} 야경 명소 감상 & 체크인 룸 휴식`,
          memo: '[야경 산책] 화려한 도시 야경 산책 후 객실 체크인 및 휴식',
          cat: 'tour',
          cost: 0,
          currency: 'KRW',
          completed: false
        });
      } else if (isLastDay && durationDays > 1) {
        const flightDepKstTotal = depMin - (tzInfo.tzDiff * 60);
        const landingKstTotal = flightDepKstTotal + Math.round(tzInfo.returnFlightHours * 60);
        const isNextDayLanding = (landingKstTotal >= 1440);

        const landingKstMins = landingKstTotal % 1440;
        const homeKstMins = (landingKstTotal + 90) % 1440;
        const landingTimeStr = isNextDayLanding ? `+1일 ${minutesToTime(landingKstMins)}` : minutesToTime(landingKstMins);
        const homeTimeStr = isNextDayLanding ? `+1일 ${minutesToTime(homeKstMins)}` : minutesToTime(homeKstMins);

        if (depMin >= 14 * 60) {
          daySpots.push({
            id: `spot_${stamp}_${i}_0`,
            time: '09:30',
            title: `${hub.name} 호텔 체크아웃 & 프론트 짐 보관`,
            memo: '[체크아웃] 짐 보관 서비스 이용 후 가벼운 복장으로 마지막 날 일정 시작',
            cat: 'lodging',
            cost: 0,
            currency: 'KRW',
            completed: false
          });
          let lastSpotName = `${hub.name} 특산품·기념품 쇼핑 & 로컬 마켓`;
          if (wishIndex < wishlistItems.length) {
            lastSpotName = `⭐ ${wishlistItems[wishIndex++]}`;
          }
          daySpots.push({
            id: `spot_${stamp}_${i}_1`,
            time: '10:30',
            title: lastSpotName,
            memo: '[기념품 쇼핑] 특산품, 선물, 로컬 마켓 쇼핑 및 여유로운 산책',
            cat: 'shopping',
            cost: 50000,
            currency: 'KRW',
            completed: false
          });
          daySpots.push({
            id: `spot_${stamp}_${i}_2`,
            time: '12:30',
            title: `${hub.name} 여행 마무리 시그니처 런치`,
            memo: '[라스트 미식] 현지에서 가장 기억에 남는 대표 요리 즐기기',
            cat: 'food',
            cost: 35000,
            currency: 'KRW',
            completed: false
          });
          const airportMoveMin = Math.max(13 * 60 + 30, depMin - 210);
          daySpots.push({
            id: `spot_${stamp}_${i}_3`,
            time: minutesToTime(airportMoveMin),
            title: `숙소 짐 픽업 & ${hub.name} 공항 이동`,
            memo: '[공항 이동] 호텔에서 짐 찾기 후 공항철도/리무진/택시로 공항 이동',
            cat: 'tour',
            cost: 20000,
            currency: 'KRW',
            completed: false
          });
          daySpots.push({
            id: `spot_${stamp}_${i}_4`,
            time: minutesToTime(depMin - 150),
            title: '공항 도착, 출국 수속 & 택스리펀 및 면세점',
            memo: '[출국 수속] 탑승권 발권, 수하물 위탁, 택스리펀, 보안검색 및 면세점',
            cat: 'flight',
            cost: 0,
            currency: 'KRW',
            completed: false
          });
          daySpots.push({
            id: `spot_${stamp}_${i}_5`,
            time: minutesToTime(depMin),
            title: `🛫 ${hub.name} 공항 출발 & 귀국 비행기 탑승`,
            memo: `[귀국 비행: 현지 시각 ${minutesToTime(depMin)}] 항공기 탑승, 한국행 출발 (약 ${tzInfo.returnFlightHours}시간 비행)`,
            cat: 'flight',
            cost: 0,
            currency: 'KRW',
            completed: false
          });
          daySpots.push({
            id: `spot_${stamp}_${i}_6`,
            time: landingTimeStr,
            title: isNextDayLanding ? '🛬 한국 인천공항 도착 & 입국 심사 (+1일 익일)' : '한국 공항 도착, 입국 심사 & 수하물 수령',
            memo: `[입국 수속] 한국 시각 ${landingTimeStr} 도착 (약 ${tzInfo.returnFlightHours}시간 비행 + 시차 반영). 자동출입국 심사 및 수하물 수취`,
            cat: 'tour',
            cost: 0,
            currency: 'KRW',
            completed: false
          });
          daySpots.push({
            id: `spot_${stamp}_${i}_7`,
            time: homeTimeStr,
            title: isNextDayLanding ? '집 도착! 여행 짐 정리 및 휴식 (+1일 익일)' : '집 도착! 여행 짐 정리 및 휴식',
            memo: `[여정 마무리] 한국 시각 ${homeTimeStr} 무사 귀가. 짐 정리, 여행 사진 백업 및 시차 적응 휴식`,
            cat: 'tour',
            cost: 15000,
            currency: 'KRW',
            completed: false
          });
        } else {
          const earlyCheckoutMin = Math.max(5 * 60, depMin - 210);
          daySpots.push({
            id: `spot_${stamp}_${i}_0`,
            time: minutesToTime(earlyCheckoutMin),
            title: `${hub.name} 호텔 얼리 체크아웃 & 공항 이동`,
            memo: '[이른 출국] 체크아웃 및 공항 이동 (조식 테이크아웃)',
            cat: 'lodging',
            cost: 20000,
            currency: 'KRW',
            completed: false
          });
          daySpots.push({
            id: `spot_${stamp}_${i}_1`,
            time: minutesToTime(depMin - 150),
            title: '공항 도착, 출국 수속 & 탑승구 이동',
            memo: '[출국 수속] 항공권 발권, 보안검색 및 탑승구 대기',
            cat: 'flight',
            cost: 0,
            currency: 'KRW',
            completed: false
          });
          daySpots.push({
            id: `spot_${stamp}_${i}_2`,
            time: minutesToTime(depMin),
            title: '🛫 귀국 비행기 탑승 & 한국 출발',
            memo: `[비행: 현지 시각 ${minutesToTime(depMin)}] 탑승 후 기내 휴식 (약 ${tzInfo.returnFlightHours}시간 소요)`,
            cat: 'flight',
            cost: 0,
            currency: 'KRW',
            completed: false
          });
          daySpots.push({
            id: `spot_${stamp}_${i}_3`,
            time: landingTimeStr,
            title: isNextDayLanding ? '🛬 한국 공항 도착 및 입국 수속 (+1일 익일)' : '한국 공항 도착 및 입국 수속',
            memo: `[도착] 한국 시각 ${landingTimeStr} 도착. 수하물 수령 및 세관 검사`,
            cat: 'tour',
            cost: 0,
            currency: 'KRW',
            completed: false
          });
          daySpots.push({
            id: `spot_${stamp}_${i}_4`,
            time: homeTimeStr,
            title: isNextDayLanding ? '집 도착! 여정 마무리 (+1일 익일)' : '집 도착! 여정 마무리',
            memo: `[귀가] 한국 시각 ${homeTimeStr} 무사 귀가 및 휴식`,
            cat: 'tour',
            cost: 15000,
            currency: 'KRW',
            completed: false
          });
        }
      } else {
        const generalTemplates = [
          { time: '09:00', prefix: '모닝 산책 & 로컬 브런치/조식', cat: 'food', estCost: 15000 },
          { time: '10:30', prefix: `${hubCity !== hub.name ? hubCity + ' ' : ''}대표 랜드마크 & 명소 집중 탐방`, cat: 'tour', estCost: 25000 },
          { time: '12:30', prefix: '현지인 추천 시그니처 미식 런치', cat: 'food', estCost: 30000 },
          { time: '14:30', prefix: `${hubCity !== hub.name ? hubCity + ' ' : ''}테마 맞춤 익스피리언스 & 문화 체험`, cat: 'tour', estCost: 35000 },
          { time: '17:00', prefix: '감성 카페 & 로컬 마켓 투어', cat: 'shopping', estCost: 20000 },
          { time: '19:00', prefix: '선셋 전망 & 디너 코스', cat: 'food', estCost: 50000 },
          { time: '21:00', prefix: '야경 감상 및 하루 다이어리 기록', cat: 'tour', estCost: 0 }
        ];

        generalTemplates.forEach((tpl, sIdx) => {
          let spotName = `${hub.name} ${tpl.prefix}`;
          let spotMemo = `[컨셉: ${conceptStr}] 30분~1시간 단위 최적화 동선`;

          if ((sIdx === 1 || sIdx === 3) && wishIndex < wishlistItems.length) {
            spotName = `⭐ ${wishlistItems[wishIndex]}`;
            spotMemo = `[버킷리스트] 희망 방문 스팟 탐방 (${conceptStr})`;
            wishIndex++;
          } else if (sIdx === 3) {
            spotName = `${hub.name} ${conceptList[(i - 1) % conceptList.length]} 맞춤 스팟`;
          }

          daySpots.push({
            id: `spot_${stamp}_${i}_${sIdx}`,
            time: tpl.time,
            title: spotName,
            memo: spotMemo,
            cat: tpl.cat,
            cost: tpl.estCost,
            currency: 'KRW',
            completed: false
          });
        });
      }

      days.push({
        dayNum: i,
        title: `Day ${i} ${hub.name} ${hubCity !== hub.name ? hubCity + ' ' : ''}${isFirstDay ? '도착 및 첫 여정' : isLastDay ? '마무리 및 귀국' : isTransitDay ? '이동 및 탐방' : (conceptList[(i - 1) % conceptList.length] || '여행')}`,
        date: `Day ${i}`,
        city: hub.name,
        subCity: hubCity,
        hub: hub.name,
        blockPlace: hub.name,
        spots: daySpots
      });
    }

    return days;
  }

  // ── 6. 새 여행 등록 제출 ──
  async function submitCreateTrip() {
    if (submittingTrip) return;
    submittingTrip = true;
    const submitBtn = $('btn-submit-create-trip');
    if (submitBtn) submitBtn.disabled = true;
    try {
      const title = $('trip-form-title').value.trim();
      const start = $('trip-form-start').value;
      const end = $('trip-form-end').value;
      const curr = $('trip-form-curr').value;
      const rawBudget = ($('trip-form-budget')?.value || '').trim();
      const parsedBudget = Number(rawBudget);
      const budget = rawBudget !== '' && Number.isFinite(parsedBudget) && parsedBudget >= 0 ? Math.round(parsedBudget) : 0;
      const countriesStr = $('trip-form-countries').value.trim();
      const citiesStr = $('trip-form-cities')?.value.trim() || '';
      const style = $('trip-form-style').value.trim();
      const arrivalTime = $('trip-form-arrival-time') ? $('trip-form-arrival-time').value.trim() : '14:00';
      const departureTime = $('trip-form-departure-time') ? $('trip-form-departure-time').value.trim() : '17:00';
      const wishlist = $('trip-form-wishlist') ? $('trip-form-wishlist').value.trim() : '';
      const aiAuto = $('trip-form-ai-auto') ? $('trip-form-ai-auto').checked : true;

      if (!title) {
        alert('여행 제목을 입력해 주세요.');
        $('trip-form-title')?.focus();
        return;
      }

      if (start && end && end < start) {
        showToast('⚠️ 종료일은 출발일보다 빠를 수 없습니다.');
        $('trip-form-end')?.focus();
        return;
      }

      const rawCountries = countriesStr ? splitTravelList(countriesStr) : [];
      const explicitCities = splitTravelList(citiesStr);
      const normalizedCountriesSet = new Set();
      const normalizedCitiesSet = new Set(explicitCities.map(c => cleanCityName(c)).filter(Boolean));
      rawCountries.forEach(rc => {
        const resolved = resolveCanonicalCountry(rc);
        if (resolved && resolved.canonicalName) {
          normalizedCountriesSet.add(resolved.canonicalName);
          if (resolved.extractedCity) {
            const cl = cleanCityName(resolved.extractedCity);
            if (cl) normalizedCitiesSet.add(cl);
          }
        } else if (rc.trim()) {
          normalizedCountriesSet.add(rc.trim());
        }
      });
      const countries = Array.from(normalizedCountriesSet);
      let durationDays = 5;
      if (start && end) {
        const [sy, sm, sd] = start.split('-').map(Number);
        const [ey, em, ed] = end.split('-').map(Number);
        const diff = Math.round((Date.UTC(ey, em - 1, ed) - Date.UTC(sy, sm - 1, sd)) / 86400000) + 1;
        if (Number.isFinite(diff) && diff >= 1) durationDays = diff;
      }

      const concepts = (State.createTripSelectedConcepts && State.createTripSelectedConcepts.length > 0)
        ? State.createTripSelectedConcepts.slice()
        : [];

      let days = [];
      let shouldGenerateAi = false;
      const hasGeminiKey = Boolean(cleanApiKey(State.geminiKey || localStorage.getItem('st_gemini_key')));
      const tempTrip = { title, countries, cities: Array.from(normalizedCitiesSet) };
      const pack = resolveTripPack(tempTrip);
      const isYN = isYunnanTrip(tempTrip);
      const isSA = isSouthAmericaTrip(tempTrip);

      const inferredCities = countries.flatMap(item => {
        const match = item.match(/\(([^)]+)\)/);
        return match ? match[1].split(/[,/]/).map(s => s.trim()).filter(Boolean) : [];
      });
      const requestedCities = [...Array.from(normalizedCitiesSet), ...inferredCities].filter((city, index, list) => city && list.indexOf(city) === index);
      let primaryDest = requestedCities[0] || countries[0] || '여행지';
      primaryDest = primaryDest.replace(/[()[\]]/g, ' ').trim();
      primaryDest = cleanCityName(primaryDest);

      const calculatedHubs = allocateTripHubs(countries, requestedCities, durationDays);

      if (aiAuto && hasGeminiKey) {
        shouldGenerateAi = true;
        for (let i = 1; i <= durationDays; i++) {
          const currentHub = calculatedHubs.find(h => i >= h.startDayNum && i <= h.endDayNum) || calculatedHubs[0];
          const hubCity = (currentHub.cities && currentHub.cities.length > 0) ? currentHub.cities[0] : currentHub.name;
          days.push({
            dayNum: i,
            title: `Day ${i} ${currentHub.name} ${hubCity !== currentHub.name ? hubCity + ' ' : ''}계획`,
            date: formatCalendarDateOffset(start, i - 1),
            city: currentHub.name,
            subCity: hubCity,
            hub: currentHub.name,
            blockPlace: currentHub.name,
            spots: []
          });
        }
      } else if (aiAuto) {
        if (pack && pack.hasGoldenCourse && typeof pack.getGoldenItinerary === 'function') {
          days = pack.getGoldenItinerary(durationDays);
        } else {
          const fullDestContext = (countriesStr ? countriesStr + ' ' : '') + (citiesStr ? citiesStr + ' ' : '') + (title || primaryDest || '여행지');
          days = generateAutoSpotsForTrip(primaryDest || '여행지', durationDays, concepts, wishlist, arrivalTime, departureTime, fullDestContext, calculatedHubs);
        }
        if (start) {
          days.forEach((d, idx) => { d.date = formatCalendarDateOffset(start, idx); });
        }
      } else {
        for (let i = 1; i <= durationDays; i++) {
          const currentHub = calculatedHubs.find(h => i >= h.startDayNum && i <= h.endDayNum) || calculatedHubs[0];
          const hubCity = (currentHub.cities && currentHub.cities.length > 0) ? currentHub.cities[0] : currentHub.name;
          days.push({
            dayNum: i,
            title: `Day ${i} ${currentHub.name} 여행 일정`,
            date: formatCalendarDateOffset(start, i - 1),
            city: currentHub.name,
            subCity: hubCity,
            hub: currentHub.name,
            blockPlace: currentHub.name,
            spots: []
          });
        }
      }

      let tripCities = requestedCities.length ? requestedCities.slice(0, 10) : (countries.length ? [primaryDest] : []);
      if (pack && pack.geo && Array.isArray(pack.geo.destinations) && pack.geo.destinations.length > 0) {
        tripCities = pack.geo.destinations.map(d => d.nameKo || (d.name ? d.name.split(' ')[0] : d.id));
      } else {
        const rawCities = [...requestedCities];
        if (wishlist) {
          wishlist.split(/[,\n]/).map(s => s.trim()).filter(Boolean).forEach(w => {
            const clean = cleanCityName(w);
            if (clean && !rawCities.includes(clean) && !countries.includes(clean)) rawCities.push(clean);
          });
        }
        normalizedCitiesSet.forEach(c => {
          if (c && !rawCities.includes(c) && !countries.includes(c)) rawCities.push(c);
        });
        if (rawCities.length > 0) {
          tripCities = rawCities.filter(ct => !countries.includes(ct)).slice(0, 10);
        }
      }

      let tripEmoji = (pack && pack.flag) ? pack.flag : null;
      if (!tripEmoji) {
        const combinedStr = (title + ' ' + countriesStr + ' ' + (primaryDest || '')).toLowerCase();
        if (combinedStr.includes('몽골') || combinedStr.includes('mongol')) tripEmoji = '🇲🇳';
        else if (combinedStr.includes('일본') || combinedStr.includes('도쿄') || combinedStr.includes('오사카') || combinedStr.includes('후쿠오카')) tripEmoji = '🇯🇵';
        else if (combinedStr.includes('중국') || combinedStr.includes('운남') || combinedStr.includes('상하이') || combinedStr.includes('베이징')) tripEmoji = '🇨🇳';
        else if (combinedStr.includes('미국') || combinedStr.includes('하와이') || combinedStr.includes('뉴욕') || combinedStr.includes('la')) tripEmoji = '🇺🇸';
        else if (combinedStr.includes('프랑스') || combinedStr.includes('파리')) tripEmoji = '🇫🇷';
        else if (combinedStr.includes('이탈리아') || combinedStr.includes('로마')) tripEmoji = '🇮🇹';
        else if (combinedStr.includes('스페인') || combinedStr.includes('바르셀로나')) tripEmoji = '🇪🇸';
        else if (combinedStr.includes('스위스') || combinedStr.includes('인터라켄')) tripEmoji = '🇨🇭';
        else if (combinedStr.includes('영국') || combinedStr.includes('런던')) tripEmoji = '🇬🇧';
        else if (combinedStr.includes('독일') || combinedStr.includes('베를린')) tripEmoji = '🇩🇪';
        else if (combinedStr.includes('베트남') || combinedStr.includes('다낭') || combinedStr.includes('하노이')) tripEmoji = '🇻🇳';
        else if (combinedStr.includes('태국') || combinedStr.includes('방콕') || combinedStr.includes('치앙마이')) tripEmoji = '🇹🇭';
        else if (combinedStr.includes('대만') || combinedStr.includes('타이베이')) tripEmoji = '🇹🇼';
        else if (combinedStr.includes('호주') || combinedStr.includes('시드니')) tripEmoji = '🇦🇺';
        else if (combinedStr.includes('캐나다')) tripEmoji = '🇨🇦';
        else if (combinedStr.includes('남미') || combinedStr.includes('페루') || combinedStr.includes('볼리비아') || combinedStr.includes('아르헨티나') || combinedStr.includes('브라질')) tripEmoji = '🌎';
        else if (combinedStr.includes('유럽')) tripEmoji = '🇪🇺';
        else tripEmoji = '✈️';
      }

      let initialChecklist = [];
      if (isYN) {
        initialChecklist = [
          { text: '여권 유효기간 6개월 이상 확인', urgent: true, checked: false },
          { text: '알리페이 / 위챗페이 트래블로그 카드 사전 등록', urgent: true, checked: false },
          { text: '옥룡설산 케이블카 사전 예매', urgent: true, checked: false },
          { text: '중국 고속철 (쿤밍-따리-리장) 예매', urgent: true, checked: false },
          { text: '중국 데이터 eSIM 또는 유심 구매', urgent: false, checked: false },
          { text: '상비약 (고산병약, 소화제, 지사제, 타이레놀)', urgent: true, checked: false }
        ];
      } else if (isSA) {
        initialChecklist = [
          { text: '여권 유효기간 6개월 이상 확인', urgent: true, checked: false },
          { text: '마추픽추 입장권 & 페루레일 기차표 공식 사전 예매', urgent: true, checked: false },
          { text: '황열병 예방접종 증명서(옐로우카드) 준비', urgent: true, checked: false },
          { text: '현지 통화 환전 또는 트래블로그/월렛 카드 발급', urgent: true, checked: false },
          { text: '고산병 처방약(다이아목스) 및 비상 상비약 준비', urgent: true, checked: false },
          { text: '해외 여행자 보험 가입', urgent: true, checked: false },
          { text: '스마트폰 유심 / eSIM 구매', urgent: false, checked: false }
        ];
      } else {
        initialChecklist = [
          { text: '여권 유효기간 6개월 이상 확인 (최소 6개월)', urgent: true, checked: false },
          { text: '항공권 E-티켓 및 모바일 탑승권 보관', urgent: true, checked: false },
          { text: '숙소 예약 바우처 및 주소 오프라인 저장', urgent: true, checked: false },
          { text: '현지 통화 환전 또는 트래블로그/트래블월렛 카드 발급', urgent: true, checked: false },
          { text: '해외 여행자 보험 가입', urgent: true, checked: false },
          { text: '스마트폰 해외 로밍 또는 eSIM/유심 구매', urgent: false, checked: false },
          { text: '여행용 상비약 (소화제, 진통제, 지사제, 밴드)', urgent: false, checked: false },
          { text: '멀티 어댑터 및 보조배터리 준비', urgent: false, checked: false }
        ];
      }

      const baseCurr = curr || (pack ? pack.currency : 'KRW');
      const initBalances = { [baseCurr]: budget || 0 };
      if (baseCurr !== 'KRW') initBalances['KRW'] = 0;

      const newTrip = {
        id: 'trip_' + Date.now(),
        title: title,
        subtitle: style || concepts.join(' · ') || requestedCities.join(' · ') || countries.join(' · ') || (pack ? pack.name : '사용자 계획'),
        startDate: start,
        endDate: end,
        durationDays: durationDays,
        arrivalTime: arrivalTime || '14:00',
        departureTime: departureTime || '17:00',
        currency: baseCurr,
        budget: budget,
        countries: countries,
        cities: tripCities,
        coverEmoji: tripEmoji,
        concepts: concepts,
        wishlist: wishlist,
        hubAllocations: calculatedHubs,
        planSource: shouldGenerateAi ? 'ai_pending' : (aiAuto ? 'local_draft' : 'manual'),
        isBucketlist: (!start && !end),
        days: days,
        expenses: [],
        exchanges: [],
        activeCurrencies: [baseCurr, 'KRW'].filter((v, i, a) => v && a.indexOf(v) === i),
        initialBalances: initBalances,
        journals: {},
        checklist: initialChecklist
      };

      if (!await commitTripsCommand(current => [newTrip, ...current], { bumpTripId: newTrip.id, activeTripId: newTrip.id })) return;
      T.HubView.updateFilterDropdowns();
      closeModal('modal-create-trip', true);

      switchView('workspace');
      if (shouldGenerateAi) {
        T.DraftStudio.open();
        const aiPromptInput = $('ai-trip-prompt');
        if (aiPromptInput) aiPromptInput.value = [style, wishlist, requestedCities.length ? `주요 도시: ${requestedCities.join(', ')}` : ''].filter(Boolean).join(' · ');
        showToast('🤖 입력한 도시와 기간을 바탕으로 AI 일정 초안을 만드는 중입니다.', 3500);
        void generateAiItinerary();
      } else if (aiAuto) {
        showToast('⚠️ Gemini API 키가 없어 기본 일정으로 생성했습니다. 키를 등록하면 AI 일정으로 다시 설계할 수 있습니다.', 5000);
      } else {
        T.DraftStudio.open();
      }
    } catch (err) {
      console.error('Failed to submitCreateTrip:', err);
      alert('여행 생성 중 오류가 발생했습니다: ' + err.message);
    } finally {
      submittingTrip = false;
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  T.UiActions.define('createTrip', {
    open: () => openCreateTripModal(),
    dismissDemoAndOpen: () => { dismissDemoOffer(); openCreateTripModal(); },
    region: el => setCreateTripRegionFilter(el.dataset.region || 'all'),
    search: el => handleCreateTripSearch(el.value),
    clearSearch: () => clearCreateTripSearch(),
    toggleCountry: el => toggleCreateTripCountry(el.dataset.code),
    addCustomCountry: el => addCustomCreateTripCountry(el.dataset.query || ''),
    toggleCity: el => toggleCreateTripCity(el.dataset.code, el.dataset.city),
    addCustomCity: el => addCustomCreateTripCity(el.dataset.code),
    countryInput: () => handleTripFormCountryInput(),
    datesChange: () => handleTripDatesChange(),
    setTime: el => {
      const target = $(el.dataset.target);
      if (target && el.dataset.time) target.value = el.dataset.time;
    },
    toggleConcept: el => toggleConceptChip(el.dataset.concept),
    submit: () => submitCreateTrip()
  });

  T.CreateTrip = Object.freeze({
    renderConceptChips,
    toggleConceptChip,
    initDestinationPicker: initCreateTripDestinationPicker,
    setRegionFilter: setCreateTripRegionFilter,
    handleSearch: handleCreateTripSearch,
    clearSearch: clearCreateTripSearch,
    renderCountryChips: renderCreateTripCountryChips,
    addCustomCountry: addCustomCreateTripCountry,
    toggleCountry: toggleCreateTripCountry,
    renderSelectedBoard: renderCreateTripSelectedBoard,
    toggleCity: toggleCreateTripCity,
    addCustomCity: addCustomCreateTripCity,
    syncHiddenInputs: syncCreateTripHiddenInputs,
    handleDatesChange: handleTripDatesChange,
    populateCurrencyOptions: populateCreateTripCurrencyOptions,
    open: openCreateTripModal,
    handleCountryInput: handleTripFormCountryInput,
    selectQuickCountry: selectQuickFormCountry,
    detectDestinationTimezone,
    updateTzBanner: updateCreateTripTzBanner,
    allocateTripHubs,
    generateAutoSpotsForTrip,
    submit: submitCreateTrip
  });
})(typeof window !== 'undefined' ? window : globalThis);
