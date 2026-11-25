/* 여행 설정 & 일정 초안 편집 스튜디오 (v2.2.5, 계획 4단계 16차).
 * index.html의 #modal-ai-trip 제어와
 * draftStudioState·openTripDraftStudio·setDraftStudioRegionFilter·handleDraftStudioSearch·
 * clearDraftStudioSearch·renderDraftStudioCountryChips·addCustomDraftStudioCountry·
 * toggleDraftStudioCountry·renderDraftStudioSelectedBoard·toggleDraftStudioCity·
 * addCustomDraftStudioCity·recalcDraftStudioHubs·renderDraftStudioCountries·
 * handleDraftStudioDatesChange·renderDraftStudioHubSteppers·adjustDraftStudioHubDays·
 * autoBalanceDraftStudioHubs·renderDraftStudioConcepts·toggleDraftStudioConcept·
 * captureDraftStudioSettings·saveDraftStudioSettingsOnly·executeDraftStudioGeneration(약 675줄)을 옮겼다.
 * 셸 함수(getActiveTrip·cleanCityName·requireSharedPlanEdit·commitTripCommand·
 * renderActiveTripWorkspace·startAiDraftJob·generateAiItinerary·cancelActiveAiJob·
 * openModal·closeModal·showToast·escapeHtml)와 전역 State·COUNTRY_DATABASE는 부를 때 찾는다.
 * 모든 동작은 data-on-click/data-on-input/data-on-change="draftStudio.*"로 잇고,
 * 불러올 때는 등록만 하고 문서를 건드리지 않는다. */
(function (root) {
  'use strict';
  const T = root.SulsulTravel = root.SulsulTravel || {};
  const $ = id => document.getElementById(id);

  const REGION_KEYS = Object.freeze([
    'all', 'east_asia', 'southeast_asia', 'south_central_asia',
    'europe', 'americas', 'oceania', 'mideast_africa'
  ]);

  const STUDIO_CONCEPTS = Object.freeze([
    { id: '배낭', label: '🎒 배낭' },
    { id: '맛집', label: '🍽️ 미식' },
    { id: '문화', label: '🏛️ 문화' },
    { id: '럭셔리', label: '👑 럭셔리' },
    { id: '자연', label: '🏞️ 자연' },
    { id: '힐링', label: '🧘 힐링' },
    { id: '가성비', label: '💰 가성비' },
    { id: '가족', label: '👨‍👩‍👧 가족' }
  ]);

  const state = {
    tripId: null,
    selectedRegion: 'all',
    searchQuery: '',
    searchRawQuery: '',
    selectedCountries: [],
    selectedCities: {},
    customCities: {},
    countries: [],
    cities: [],
    startDate: '',
    endDate: '',
    durationDays: 5,
    arrivalTime: '14:00',
    departureTime: '17:00',
    concepts: [],
    prompt: '',
    hubs: []
  };

  let customCityKeyBound = false;
  let savingSettings = false;

  function utcDateDiffDays(startIso, endIso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(startIso || '')) || !/^\d{4}-\d{2}-\d{2}$/.test(String(endIso || ''))) {
      return null;
    }
    const [sy, sm, sd] = String(startIso).split('-').map(Number);
    const [ey, em, ed] = String(endIso).split('-').map(Number);
    const diff = Math.round((Date.UTC(ey, em - 1, ed) - Date.UTC(sy, sm - 1, sd)) / 86400000) + 1;
    return Number.isFinite(diff) ? diff : null;
  }

  function bindCustomCityEnterKey() {
    if (customCityKeyBound) return;
    const board = $('draft-studio-selected-destinations-board');
    if (!board) return;
    board.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      const target = event.target;
      if (!target || target.tagName !== 'INPUT') return;
      const code = target.dataset.draftCustomCityCountry;
      if (!code) return;
      event.preventDefault();
      addCustomDraftStudioCity(code);
    });
    customCityKeyBound = true;
  }

  function openTripDraftStudio() {
    const trip = getActiveTrip();
    if (!trip) return;

    state.tripId = trip.id;
    state.selectedRegion = 'all';
    state.searchQuery = '';
    state.searchRawQuery = '';
    state.selectedCountries = [];
    state.selectedCities = {};
    state.customCities = {};

    const rawCountries = Array.isArray(trip.countries) ? trip.countries : (trip.countries ? [trip.countries] : []);
    rawCountries.forEach(item => {
      if (!item || typeof item !== 'string') return;
      const clean = cleanCityName(item);
      const country = (typeof COUNTRY_DATABASE !== 'undefined')
        ? COUNTRY_DATABASE.find(c =>
            c.name === clean || c.name === item || c.code === clean || c.code === item ||
            (c.aliases || []).includes(clean.toLowerCase()) || (c.aliases || []).includes(item.toLowerCase())
          )
        : null;
      if (country) {
        if (!state.selectedCountries.includes(country.code)) {
          state.selectedCountries.push(country.code);
        }
      } else if (clean) {
        const customCode = 'CUST_' + Math.random().toString(36).substring(2, 7).toUpperCase();
        const newCountry = {
          name: clean,
          code: customCode,
          flag: '🌐',
          currency: 'USD',
          currName: '달러',
          symbol: '$',
          region: 'all',
          popularCities: [clean],
          aliases: [clean.toLowerCase()]
        };
        if (typeof COUNTRY_DATABASE !== 'undefined') COUNTRY_DATABASE.push(newCountry);
        state.selectedCountries.push(customCode);
      }
    });

    state.selectedCountries.forEach(code => {
      state.selectedCities[code] = [];
      state.customCities[code] = [];
    });

    if (Array.isArray(trip.hubAllocations) && trip.hubAllocations.length > 0) {
      trip.hubAllocations.forEach(hub => {
        const cMatch = (typeof COUNTRY_DATABASE !== 'undefined')
          ? COUNTRY_DATABASE.find(c => c.code === hub.code || c.name === hub.name || c.name === hub.country)
          : null;
        const targetCode = cMatch ? cMatch.code : state.selectedCountries[0];
        if (targetCode && Array.isArray(hub.cities)) {
          if (!state.selectedCities[targetCode]) state.selectedCities[targetCode] = [];
          hub.cities.forEach(city => {
            if (!state.selectedCities[targetCode].includes(city)) {
              state.selectedCities[targetCode].push(city);
            }
          });
        }
      });
    }

    const rawTripCities = Array.isArray(trip.cities) ? trip.cities : (trip.cities ? [trip.cities] : []);
    rawTripCities.forEach(cityName => {
      if (!cityName || typeof cityName !== 'string') return;
      const clName = cleanCityName(cityName);
      let matchedCode = null;
      for (const code of state.selectedCountries) {
        const cObj = (typeof COUNTRY_DATABASE !== 'undefined') ? COUNTRY_DATABASE.find(c => c.code === code) : null;
        if (cObj && ((cObj.popularCities || []).some(pc => pc.includes(clName) || clName.includes(pc)) || (state.customCities[code] || []).includes(cityName))) {
          matchedCode = code;
          break;
        }
      }
      if (!matchedCode && state.selectedCountries.length > 0) {
        matchedCode = state.selectedCountries[0];
      }
      if (matchedCode) {
        if (!state.selectedCities[matchedCode]) state.selectedCities[matchedCode] = [];
        if (!state.selectedCities[matchedCode].includes(cityName)) {
          state.selectedCities[matchedCode].push(cityName);
        }
      }
    });

    state.selectedCountries.forEach(code => {
      const cObj = (typeof COUNTRY_DATABASE !== 'undefined') ? COUNTRY_DATABASE.find(c => c.code === code) : null;
      const popular = cObj ? (cObj.popularCities || []) : [];
      (state.selectedCities[code] || []).forEach(ct => {
        if (!popular.includes(ct)) {
          if (!state.customCities[code]) state.customCities[code] = [];
          if (!state.customCities[code].includes(ct)) {
            state.customCities[code].push(ct);
          }
        }
      });
    });

    state.startDate = trip.startDate || '';
    state.endDate = trip.endDate || '';
    state.durationDays = Math.max(1, Number(trip.durationDays || trip.days?.length || 5));
    state.arrivalTime = trip.arrivalTime || '14:00';
    state.departureTime = trip.departureTime || '17:00';
    state.concepts = Array.isArray(trip.concepts) ? trip.concepts.slice() : [];
    state.prompt = trip.wishlist || '';

    if (trip.hubAllocations && Array.isArray(trip.hubAllocations) && trip.hubAllocations.length > 0 && trip.hubAllocations.length === state.selectedCountries.length) {
      state.hubs = trip.hubAllocations.map(h => ({ ...h }));
    } else {
      recalcDraftStudioHubs();
    }

    const subtitleEl = $('draft-studio-subtitle');
    if (subtitleEl) {
      const cNames = state.selectedCountries.map(code => COUNTRY_DATABASE.find(c => c.code === code)?.name || code);
      subtitleEl.textContent = `${trip.title || trip.name || '여행'} · ${cNames.join(', ') || '여행지'}`;
    }

    const searchInput = $('draft-studio-search-input');
    if (searchInput) searchInput.value = '';
    const clearBtn = $('btn-clear-draft-search');
    if (clearBtn) clearBtn.classList.add('hidden');

    bindCustomCityEnterKey();
    setDraftStudioRegionFilter('all');
    renderDraftStudioCountryChips();
    renderDraftStudioSelectedBoard();

    const startEl = $('draft-studio-start-date');
    const endEl = $('draft-studio-end-date');
    const badgeEl = $('draft-studio-total-days-badge');
    const arrEl = $('draft-studio-arr-time');
    const depEl = $('draft-studio-dep-time');

    if (startEl) startEl.value = state.startDate;
    if (endEl) endEl.value = state.endDate;
    if (badgeEl) badgeEl.textContent = `총 ${state.durationDays}일간`;
    if (arrEl) arrEl.value = state.arrivalTime;
    if (depEl) depEl.value = state.departureTime;

    renderDraftStudioCountries();
    renderDraftStudioHubSteppers();
    renderDraftStudioConcepts();

    const promptEl = $('ai-trip-prompt');
    if (promptEl) promptEl.value = state.prompt;

    openModal('modal-ai-trip');
  }

  function setDraftStudioRegionFilter(regionKey = 'all') {
    const safeRegion = REGION_KEYS.includes(regionKey) ? regionKey : 'all';
    state.selectedRegion = safeRegion;
    REGION_KEYS.forEach(r => {
      const tab = $(`draft-tab-reg-${r}`);
      if (!tab) return;
      const isActive = r === safeRegion;
      tab.className = isActive ? 'sulsul-chip is-active shrink-0' : 'sulsul-chip shrink-0';
      tab.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    renderDraftStudioCountryChips();
  }

  function handleDraftStudioSearch(val) {
    const raw = String(val || '').trim();
    state.searchRawQuery = raw;
    state.searchQuery = raw.toLowerCase();
    const clearBtn = $('btn-clear-draft-search');
    if (clearBtn) {
      if (state.searchQuery) clearBtn.classList.remove('hidden');
      else clearBtn.classList.add('hidden');
    }
    renderDraftStudioCountryChips();
  }

  function clearDraftStudioSearch() {
    const searchInput = $('draft-studio-search-input');
    if (searchInput) searchInput.value = '';
    handleDraftStudioSearch('');
  }

  function renderDraftStudioCountryChips() {
    const container = $('draft-studio-country-chips');
    const badge = $('draft-studio-country-count-badge');
    if (!container) return;

    const q = state.searchQuery;
    const rawQ = state.searchRawQuery || q;
    const reg = state.selectedRegion;

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

    if (badge) badge.textContent = `${filtered.length}개국 검색됨`;

    if (filtered.length === 0) {
      container.innerHTML = [
        '<div class="py-3 px-3 text-[11px] text-stone-500 dark:text-stone-400 w-full text-center space-y-2">',
        `  <div>'${escapeHtml(rawQ)}' 검색 결과가 데이터베이스에 없습니다.</div>`,
        `  <button type="button" data-on-click="draftStudio.addCustomCountry" data-query="${escapeHtml(rawQ)}" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs shadow-sm cursor-pointer transition">`,
        '    <span>🌐</span>',
        `    <span>'${escapeHtml(rawQ)}' 직접 여행지로 추가</span>`,
        '  </button>',
        '</div>'
      ].join('');
      return;
    }

    const parts = filtered.map(c => {
      const isSelected = state.selectedCountries.includes(c.code);
      return [
        `<button type="button" data-on-click="draftStudio.toggleCountry" data-code="${escapeHtml(c.code)}" aria-pressed="${isSelected ? 'true' : 'false'}" class="${isSelected ? 'sulsul-chip is-active' : 'sulsul-chip'}">`,
        `  <span class="text-sm">${escapeHtml(c.flag)}</span>`,
        `  <span>${escapeHtml(c.name)}</span>`,
        `  <span class="text-[10px] opacity-70">${escapeHtml(c.currency)}</span>`,
        isSelected ? '  <span class="text-[10px] ml-0.5">✓</span>' : '',
        '</button>'
      ].join('');
    });

    if (rawQ) {
      parts.push([
        `<button type="button" data-on-click="draftStudio.addCustomCountry" data-query="${escapeHtml(rawQ)}" class="sulsul-chip border-dashed font-bold shrink-0" title="직접 입력하여 새 여행지 추가">`,
        '  <span>🌐</span>',
        `  <span>+ '${escapeHtml(rawQ)}' 직접 추가</span>`,
        '</button>'
      ].join(''));
    }

    container.innerHTML = parts.join('');
  }

  function addCustomDraftStudioCountry(rawName) {
    if (!rawName || typeof rawName !== 'string') return;
    const name = rawName.trim();
    if (!name) return;

    const existing = COUNTRY_DATABASE.find(c =>
      c.name.toLowerCase() === name.toLowerCase() ||
      (c.aliases || []).some(a => a.toLowerCase() === name.toLowerCase())
    );
    if (existing) {
      if (!state.selectedCountries.includes(existing.code)) {
        toggleDraftStudioCountry(existing.code);
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

    toggleDraftStudioCountry(customCode);
    if (!state.selectedCities[customCode]) {
      state.selectedCities[customCode] = [];
    }
    if (!state.selectedCities[customCode].includes(name)) {
      state.selectedCities[customCode].push(name);
    }
    renderDraftStudioCountryChips();
    renderDraftStudioSelectedBoard();
    recalcDraftStudioHubs();
    if (typeof showToast === 'function') showToast(`'${escapeHtml(name)}'(이)가 여행지로 추가되었습니다.`);
  }

  function toggleDraftStudioCountry(countryCode) {
    const country = COUNTRY_DATABASE.find(c => c.code === countryCode);
    if (!country) return;

    const idx = state.selectedCountries.indexOf(countryCode);
    if (idx >= 0) {
      state.selectedCountries.splice(idx, 1);
      delete state.selectedCities[countryCode];
      delete state.customCities[countryCode];
    } else {
      state.selectedCountries.push(countryCode);
      state.selectedCities[countryCode] = [];
    }

    renderDraftStudioCountryChips();
    renderDraftStudioSelectedBoard();
    recalcDraftStudioHubs();
  }

  function renderDraftStudioSelectedBoard() {
    const container = $('draft-studio-selected-destinations-board');
    if (!container) return;

    if (!state.selectedCountries || state.selectedCountries.length === 0) {
      container.innerHTML = [
        '<div class="p-3 rounded-xl bg-white dark:bg-stone-900 border border-dashed border-amber-400/60 dark:border-amber-700/50 text-center space-y-1">',
        '  <div class="text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center gap-1.5">',
        '    <i class="fa-solid fa-map-location-dot"></i>',
        '    <span>방문할 국가를 위에서 선택해 주세요</span>',
        '  </div>',
        '  <p class="text-[10px] text-stone-500 dark:text-stone-400">',
        '    국가를 선택하면 예상 방문 도시를 복수로 선택하고 일정 거점을 조율할 수 있습니다.',
        '  </p>',
        '</div>'
      ].join('');
      return;
    }

    container.innerHTML = state.selectedCountries.map(code => {
      const country = COUNTRY_DATABASE.find(c => c.code === code);
      if (!country) return '';

      const selectedCities = state.selectedCities[code] || [];
      const customCities = state.customCities[code] || [];
      const allAvailableCities = [...(country.popularCities || []), ...customCities];
      const uniqueCities = allAvailableCities.filter((city, index, self) => self.indexOf(city) === index);

      const cityButtons = uniqueCities.map(city => {
        const cityIdx = selectedCities.indexOf(city);
        const isCitySelected = cityIdx >= 0;
        const badgeHtml = isCitySelected
          ? `<span class="sulsul-chip-badge">${Number(cityIdx + 1)}</span>`
          : '<span class="text-stone-400 text-[10px]">+</span>';
        return [
          `<button type="button" data-draft-city-chip="true" data-on-click="draftStudio.toggleCity" data-code="${escapeHtml(country.code)}" data-city="${escapeHtml(city)}" aria-pressed="${isCitySelected ? 'true' : 'false'}" class="${isCitySelected ? 'sulsul-chip is-active' : 'sulsul-chip'}">`,
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
        `      <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 shrink-0">${escapeHtml(country.currency)} (${escapeHtml(country.currName || '')})</span>`,
        `      <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0">${Number(selectedCities.length)}개 도시 선택됨</span>`,
        '    </div>',
        `    <button type="button" data-on-click="draftStudio.toggleCountry" data-code="${escapeHtml(country.code)}" class="text-stone-400 hover:text-rose-500 text-xs px-1.5 py-0.5 rounded transition cursor-pointer shrink-0 ml-auto" title="이 국가 제외">✕ 제외</button>`,
        '  </div>',
        '  <div class="space-y-1.5 w-full">',
        '    <div class="text-[11px] text-[#44403c] dark:text-stone-300 font-bold flex items-center justify-between"><span>예상 방문 도시 (터치하여 선택/해제, 순서대로 거점 반영):</span></div>',
        '    <div class="flex flex-wrap gap-1.5 pt-0.5 w-full">' + cityButtons + '</div>',
        '  </div>',
        '  <div class="flex items-center gap-1.5 pt-1 w-full min-w-0">',
        '    <div class="relative flex-1 min-w-0">',
        `      <input type="text" id="input-draft-custom-city-${escapeHtml(country.code)}" data-draft-custom-city-country="${escapeHtml(country.code)}" placeholder="목록 외 소도시/근교 (예: 론다)" class="w-full min-w-0 px-2.5 py-1.5 bg-[#faf8f5] dark:bg-stone-800 border border-[#e8e2d5] dark:border-stone-700 rounded-lg text-xs text-[#1c1917] dark:text-[#ededed] placeholder-stone-400 focus:outline-none focus:border-[#a2601b]">`,
        '    </div>',
        `    <button type="button" data-on-click="draftStudio.addCustomCity" data-code="${escapeHtml(country.code)}" class="px-2.5 sm:px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-bold border border-stone-200 dark:border-stone-700 transition cursor-pointer shrink-0 whitespace-nowrap">+ 도시 추가</button>`,
        '  </div>',
        '</div>'
      ].join('');
    }).join('');
  }

  function toggleDraftStudioCity(countryCode, cityName) {
    if (!countryCode || !cityName) return;
    if (!state.selectedCities[countryCode]) {
      state.selectedCities[countryCode] = [];
    }
    const list = state.selectedCities[countryCode];
    const idx = list.indexOf(cityName);
    if (idx >= 0) {
      list.splice(idx, 1);
    } else {
      list.push(cityName);
    }
    renderDraftStudioSelectedBoard();
    recalcDraftStudioHubs();
  }

  function addCustomDraftStudioCity(countryCode) {
    if (!countryCode) return;
    const input = $(`input-draft-custom-city-${countryCode}`);
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;

    if (!state.customCities[countryCode]) {
      state.customCities[countryCode] = [];
    }
    if (!state.customCities[countryCode].includes(val)) {
      state.customCities[countryCode].push(val);
    }
    if (!state.selectedCities[countryCode]) {
      state.selectedCities[countryCode] = [];
    }
    if (!state.selectedCities[countryCode].includes(val)) {
      state.selectedCities[countryCode].push(val);
    }

    input.value = '';
    renderDraftStudioSelectedBoard();
    recalcDraftStudioHubs();
  }

  function recalcDraftStudioHubs() {
    const selectedCountryObjs = (state.selectedCountries || [])
      .map(code => COUNTRY_DATABASE.find(c => c.code === code))
      .filter(Boolean);
    const countryNames = selectedCountryObjs.map(c => c.name);
    const allCities = [];
    (state.selectedCountries || []).forEach(code => {
      (state.selectedCities[code] || []).forEach(ct => {
        if (!allCities.includes(ct)) allCities.push(ct);
      });
    });

    state.countries = countryNames;
    state.cities = allCities;
    state.hubs = T.CreateTrip.allocateTripHubs(countryNames, allCities, state.durationDays);
    renderDraftStudioCountries();
    renderDraftStudioHubSteppers();
  }

  function renderDraftStudioCountries() {
    const container = $('draft-studio-countries-container');
    const countEl = $('draft-studio-country-count');
    const numDest = (state.selectedCountries || []).length;
    if (countEl) {
      countEl.textContent = `${numDest}개국 선택됨`;
    }
    if (!container) return;

    if (!state.hubs.length) {
      container.innerHTML = '<p class="text-stone-400">설정된 국가나 거점이 없습니다.</p>';
      return;
    }

    container.innerHTML = state.hubs.map(hub => {
      const cityTags = (hub.cities && hub.cities.length > 0)
        ? hub.cities.map(c => `<span class="px-2 py-0.5 rounded-md bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 text-[10px] font-medium">${escapeHtml(c)}</span>`).join(' ')
        : '<span class="text-[10px] text-stone-400">등록된 세부 도시 없음 (거점 전반)</span>';

      return [
        '<div class="p-2.5 rounded-lg bg-white dark:bg-[#0f1117] border border-[#e8e2d5] dark:border-stone-700 flex items-center justify-between gap-2 shadow-xs">',
        '  <div class="flex items-center gap-2 min-w-0">',
        `    <span class="text-base">${escapeHtml(hub.flag || '✈️')}</span>`,
        '    <div class="min-w-0">',
        `      <div class="font-bold text-[#1c1917] dark:text-stone-200 text-xs">${escapeHtml(hub.name)}</div>`,
        '      <div class="flex items-center gap-1 flex-wrap mt-0.5">' + cityTags + '</div>',
        '    </div>',
        '  </div>',
        `  <span class="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 font-bold text-[10px] shrink-0">${Number(hub.dayCount)}일 체류</span>`,
        '</div>'
      ].join('');
    }).join('');
  }

  function handleDraftStudioDatesChange() {
    const start = $('draft-studio-start-date')?.value || '';
    const end = $('draft-studio-end-date')?.value || '';
    if (!start || !end) return;
    if (end < start) {
      if (typeof showToast === 'function') showToast('⚠️ 종료일은 출발일보다 빠를 수 없습니다.');
      return;
    }
    const diff = utcDateDiffDays(start, end);
    if (!diff || diff < 1) return;
    state.durationDays = diff;
    state.startDate = start;
    state.endDate = end;
    const badgeEl = $('draft-studio-total-days-badge');
    if (badgeEl) badgeEl.textContent = `총 ${diff}일간`;
    recalcDraftStudioHubs();
  }

  function renderDraftStudioHubSteppers() {
    const container = $('draft-studio-hub-steppers');
    const statusEl = $('draft-studio-balance-status');
    if (!container) return;

    const sumDays = state.hubs.reduce((a, b) => a + (Number(b.dayCount) || 0), 0);
    const total = state.durationDays;

    if (statusEl) {
      if (sumDays === total) {
        statusEl.className = 'text-[10px] font-bold text-emerald-600 dark:text-emerald-400 text-right';
        statusEl.textContent = `배분 합계: ${sumDays}일 / 총 ${total}일 (일치 ✅)`;
      } else {
        const diff = total - sumDays;
        statusEl.className = 'text-[10px] font-bold text-rose-600 dark:text-rose-400 text-right';
        statusEl.textContent = `배분 합계: ${sumDays}일 / 총 ${total}일 (${diff > 0 ? diff + '일 부족 ⚠️' : Math.abs(diff) + '일 초과 ⚠️'})`;
      }
    }

    container.innerHTML = state.hubs.map((hub, idx) => [
      '<div class="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#0f1117] border border-[#e8e2d5] dark:border-stone-700 text-xs">',
      '  <div class="flex items-center gap-2 min-w-0">',
      `    <span>${escapeHtml(hub.flag || '✈️')}</span>`,
      `    <span class="font-bold text-[#1c1917] dark:text-stone-200 truncate">${escapeHtml(hub.name)}</span>`,
      `    <span class="text-[10px] text-stone-400">(Day ${Number(hub.startDayNum)}~${Number(hub.endDayNum)})</span>`,
      '  </div>',
      '  <div class="flex items-center gap-1.5 shrink-0">',
      `    <button type="button" data-on-click="draftStudio.adjustHubDays" data-hub-index="${Number(idx)}" data-delta="-1" aria-label="${escapeHtml(hub.name)} 체류일 1일 줄이기" class="w-6 h-6 rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 font-bold flex items-center justify-center text-xs cursor-pointer">-</button>`,
      `    <span class="w-8 text-center font-black text-amber-700 dark:text-amber-400 text-xs">${Number(hub.dayCount)}일</span>`,
      `    <button type="button" data-on-click="draftStudio.adjustHubDays" data-hub-index="${Number(idx)}" data-delta="1" aria-label="${escapeHtml(hub.name)} 체류일 1일 늘리기" class="w-6 h-6 rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 font-bold flex items-center justify-center text-xs cursor-pointer">+</button>`,
      '  </div>',
      '</div>'
    ].join('')).join('');
  }

  function adjustDraftStudioHubDays(hubIndex, delta) {
    const idx = Number(hubIndex);
    const step = Number(delta);
    if (!Number.isInteger(idx) || !Number.isFinite(step)) return;
    const hub = state.hubs[idx];
    if (!hub) return;
    const newDays = Number(hub.dayCount) + step;
    if (newDays < 1) return;
    hub.dayCount = newDays;

    let cur = 1;
    state.hubs.forEach(h => {
      h.startDayNum = cur;
      h.endDayNum = cur + h.dayCount - 1;
      cur += h.dayCount;
    });

    renderDraftStudioCountries();
    renderDraftStudioHubSteppers();
  }

  function autoBalanceDraftStudioHubs() {
    recalcDraftStudioHubs();
  }

  function renderDraftStudioConcepts() {
    const container = $('draft-studio-concept-chips');
    if (!container) return;
    container.innerHTML = STUDIO_CONCEPTS.map(c => {
      const isSelected = state.concepts.includes(c.id);
      return `<button type="button" data-on-click="draftStudio.toggleConcept" data-concept="${escapeHtml(c.id)}" aria-pressed="${isSelected ? 'true' : 'false'}" class="${isSelected ? 'sulsul-chip text-[11px] is-active' : 'sulsul-chip text-[11px]'}">${escapeHtml(c.label)}</button>`;
    }).join('');
  }

  function toggleDraftStudioConcept(conceptId) {
    if (!conceptId) return;
    const idx = state.concepts.indexOf(conceptId);
    if (idx >= 0) {
      state.concepts.splice(idx, 1);
    } else {
      state.concepts.push(conceptId);
    }
    renderDraftStudioConcepts();
  }

  function captureDraftStudioSettings(trip) {
    const startDate = $('draft-studio-start-date')?.value || trip.startDate || '';
    const endDate = $('draft-studio-end-date')?.value || trip.endDate || '';
    if (startDate && endDate && endDate < startDate) {
      throw new Error('종료일은 출발일보다 빠를 수 없습니다.');
    }
    const count = state.hubs.reduce((sum, hub) => sum + (Number(hub.dayCount) || 0), 0);
    if (!count || count > 60) throw new Error('거점별 체류일을 1~60일 범위에서 정리해 주세요.');
    const countries = (state.selectedCountries || []).map(code => COUNTRY_DATABASE.find(country => country.code === code)?.name).filter(Boolean);
    const cities = [...new Set((state.selectedCountries || []).flatMap(code => state.selectedCities[code] || []))];
    return {
      countries: countries.length ? countries : (trip.countries || []),
      cities,
      startDate,
      endDate,
      durationDays: count,
      arrivalTime: $('draft-studio-arr-time')?.value || trip.arrivalTime,
      departureTime: $('draft-studio-dep-time')?.value || trip.departureTime,
      concepts: state.concepts.slice(),
      wishlist: $('ai-trip-prompt')?.value.trim() || '',
      hubAllocations: state.hubs.map(hub => ({ ...hub }))
    };
  }

  async function saveDraftStudioSettingsOnly() {
    if (savingSettings) return false;
    const trip = getActiveTrip();
    if (!trip || !requireSharedPlanEdit()) return false;
    let settings;
    try {
      settings = captureDraftStudioSettings(trip);
    } catch (error) {
      showToast(error.message);
      return false;
    }
    savingSettings = true;
    const btn = $('btn-save-draft-settings');
    if (btn) btn.disabled = true;
    try {
      if (!await commitTripCommand({ tripId: trip.id, expectedRevision: trip.revision, change: target => Object.assign(target, settings) })) {
        return false;
      }
      renderActiveTripWorkspace();
      closeModal('modal-ai-trip', true);
      showToast('여행 설정을 저장했습니다. 기존 일정은 초안 승인 후 변경됩니다.');
      return true;
    } finally {
      savingSettings = false;
      if (btn) btn.disabled = false;
    }
  }

  async function executeDraftStudioGeneration() {
    const trip = getActiveTrip();
    if (!trip || !requireSharedPlanEdit()) return false;
    const tripId = trip.id;
    const revision = trip.revision;
    const engine = document.querySelector('input[name="draft-studio-engine"]:checked')?.value || 'smart_local';
    const button = $('btn-generate-ai-itinerary');
    const loader = $('ai-trip-loading');
    if (button?.disabled) return false;
    let settings;
    try {
      settings = captureDraftStudioSettings(trip);
    } catch (error) {
      showToast(error.message);
      return false;
    }
    if (engine !== 'smart_local') {
      if (!await commitTripCommand({ tripId, expectedRevision: revision, change: target => Object.assign(target, settings) })) {
        return false;
      }
      await generateAiItinerary();
      return true;
    }
    if (button) button.disabled = true;
    if (loader) loader.classList.remove('hidden');
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      const concepts = settings.concepts.length ? settings.concepts : ['사용자 맞춤 여행'];
      const context = [...settings.countries, ...settings.cities].join(', ');
      const days = T.CreateTrip.generateAutoSpotsForTrip(
        settings.countries[0] || '여행지',
        settings.durationDays,
        concepts,
        settings.wishlist,
        settings.arrivalTime,
        settings.departureTime,
        context,
        settings.hubAllocations
      );
      if (getActiveTrip()?.id !== tripId) {
        throw new Error('다른 여행으로 이동했습니다. 원래 여행에서 다시 생성해 주세요.');
      }
      if (!await commitTripCommand({ tripId, expectedRevision: revision, change: target => Object.assign(target, settings) })) {
        return false;
      }
      const current = State.trips.find(item => item.id === tripId);
      const result = await startAiDraftJob({
        id: 'local-itinerary:' + tripId + ':' + Date.now(),
        tripId,
        kind: 'itinerary',
        targetId: 'itinerary',
        baseRevision: current.revision,
        input: {
          preparedDays: days,
          localDraft: true,
          expectedDayCount: settings.durationDays,
          minSpotsPerDay: 3,
          edgeMinSpotsPerDay: 2,
          replacePlanStructure: true,
          hubs: settings.hubAllocations,
          defaultCity: settings.cities[0] || settings.countries[0] || '여행지'
        }
      });
      if (result.state === 'awaiting_review') closeModal('modal-ai-trip', true);
      return result.state === 'awaiting_review';
    } catch (error) {
      showToast('초안을 생성하지 못했습니다. 기존 일정은 유지됩니다. ' + error.message, 6000);
      return false;
    } finally {
      if (button) button.disabled = false;
      if (loader) loader.classList.add('hidden');
    }
  }

  T.UiActions.define('draftStudio', {
    open: () => openTripDraftStudio(),
    region: el => setDraftStudioRegionFilter(el.dataset.region || 'all'),
    search: el => handleDraftStudioSearch(el.value),
    clearSearch: () => clearDraftStudioSearch(),
    toggleCountry: el => toggleDraftStudioCountry(el.dataset.code),
    addCustomCountry: el => addCustomDraftStudioCountry(el.dataset.query || ''),
    toggleCity: el => toggleDraftStudioCity(el.dataset.code, el.dataset.city),
    addCustomCity: el => addCustomDraftStudioCity(el.dataset.code),
    datesChange: () => handleDraftStudioDatesChange(),
    autoBalance: () => autoBalanceDraftStudioHubs(),
    adjustHubDays: el => adjustDraftStudioHubDays(Number(el.dataset.hubIndex), Number(el.dataset.delta)),
    toggleConcept: el => toggleDraftStudioConcept(el.dataset.concept),
    cancel: () => { cancelActiveAiJob(); closeModal('modal-ai-trip'); },
    saveSettings: () => saveDraftStudioSettingsOnly(),
    execute: () => executeDraftStudioGeneration()
  });

  T.DraftStudio = {
    state,
    open: openTripDraftStudio,
    setRegionFilter: setDraftStudioRegionFilter,
    handleSearch: handleDraftStudioSearch,
    clearSearch: clearDraftStudioSearch,
    renderCountryChips: renderDraftStudioCountryChips,
    addCustomCountry: addCustomDraftStudioCountry,
    toggleCountry: toggleDraftStudioCountry,
    renderSelectedBoard: renderDraftStudioSelectedBoard,
    toggleCity: toggleDraftStudioCity,
    addCustomCity: addCustomDraftStudioCity,
    recalcHubs: recalcDraftStudioHubs,
    renderCountries: renderDraftStudioCountries,
    handleDatesChange: handleDraftStudioDatesChange,
    renderHubSteppers: renderDraftStudioHubSteppers,
    adjustHubDays: adjustDraftStudioHubDays,
    autoBalanceHubs: autoBalanceDraftStudioHubs,
    renderConcepts: renderDraftStudioConcepts,
    toggleConcept: toggleDraftStudioConcept,
    captureSettings: captureDraftStudioSettings,
    saveSettingsOnly: saveDraftStudioSettingsOnly,
    executeGeneration: executeDraftStudioGeneration
  };
})(typeof window !== 'undefined' ? window : globalThis);
