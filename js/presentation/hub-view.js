/* 내 여행 허브 화면: 필터·검색·정렬·보기 전환·대표 사진·여행 카드 렌더링 (v2.2.0, 계획 4단계 12차).
 * index.html의 #view-hub 제어 및 카드 렌더링 로직(약 970줄)을 분리했다.
 * 셸 함수(renderDemoOnboarding·compareTripsLatestFirst·resolveCanonicalCountry·resolveCountryInfo·
 * getCountryFlag·cleanCityName·escapeHtml·commitTrip·openTripWorkspace·navigateToInteractiveMap·
 * openTripPdfReport·requestDeleteTrip·openCreateTripModal·showToast·requireSharedPlanEdit)와
 * 전역 State는 부를 때 찾는다.
 * 모든 여행 자료 값은 escapeHtml 또는 textContent로 넣고, 동작은 data-on-click/change/input="hub.*"로 잇는다.
 * 불러올 때는 등록만 하고 문서를 건드리지 않는다. */
(function (root) {
  'use strict';
  const T = root.SulsulTravel = root.SulsulTravel || {};
  const $ = id => document.getElementById(id);

  let coverUploadTripId = null;

  const VALID_STATUSES = Object.freeze(['all', 'ongoing', 'planned', 'completed', 'bucketlist']);

  function isSafeCoverUrl(url) {
    if (typeof url !== 'string') return false;
    const trimmed = url.trim();
    if (!trimmed || /["'<>\\\r\n()]/.test(trimmed)) return false;
    return /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(trimmed) ||
      /^blob:/i.test(trimmed);
  }

  function tripDurationDays(trip) {
    let dur = Number(trip?.durationDays) || (Array.isArray(trip?.days) ? trip.days.length : 0);
    if (!dur && trip?.startDate && trip?.endDate) {
      const diff = Math.ceil((new Date(trip.endDate) - new Date(trip.startDate)) / 86400000) + 1;
      if (Number.isFinite(diff) && diff > 0) dur = diff;
    }
    return dur;
  }

  function tripSpentKrw(trip) {
    let spent = 0;
    (trip?.expenses || []).forEach(e => {
      if (e && e.type !== 'income') {
        const val = e.krw !== undefined
          ? Number(e.krw)
          : (e.amountKrw !== undefined ? Number(e.amountKrw) : (Number(e.amount) || 0));
        if (Number.isFinite(val)) spent += val;
      }
    });
    return spent;
  }

  function tripBudgetKrw(trip) {
    return T.LifetimeAnalytics.tripBudgetKrw(trip);
  }

  function formatManwon(krw) {
    return `${Math.round(krw / 10000).toLocaleString()}만`;
  }

  function render() {
    renderDemoOnboarding();
    T.LifetimeAnalytics.render();
    renderCards();
  }

  function setStatusFilter(status) {
    const safe = VALID_STATUSES.includes(status) ? status : 'all';
    State.hubFilters.status = safe;
    VALID_STATUSES.forEach(s => {
      const btn = $(`tab-filter-${s}`);
      if (!btn) return;
      btn.className = s === safe
        ? 'py-1.5 rounded-lg font-bold transition text-center hub-tab-active shadow-sm cursor-pointer truncate whitespace-nowrap'
        : 'py-1.5 rounded-lg font-bold transition text-center hub-tab-inactive cursor-pointer truncate whitespace-nowrap';
      btn.setAttribute('aria-pressed', String(s === safe));
    });
    renderCards();
  }

  function onCountryChange() {
    const countrySelect = $('hub-filter-country');
    if (countrySelect) {
      State.hubFilters.country = countrySelect.value;
    }
    State.hubFilters.city = 'all';
    updateFilterDropdowns();
    renderCards();
  }

  function onFilterChange() {
    const searchInput = $('hub-search-input');
    const countrySelect = $('hub-filter-country');
    const citySelect = $('hub-filter-city');
    const conceptSelect = $('hub-filter-concept');
    const sortSelect = $('hub-filter-sort');

    if (searchInput) State.hubFilters.search = searchInput.value.trim().toLowerCase();
    if (countrySelect) State.hubFilters.country = countrySelect.value;
    if (citySelect) State.hubFilters.city = citySelect.value;
    if (conceptSelect) State.hubFilters.concept = conceptSelect.value;
    if (sortSelect) State.hubFilters.sort = sortSelect.value;

    renderCards();
  }

  function resetFilters() {
    State.hubFilters = {
      status: 'all',
      search: '',
      country: 'all',
      city: 'all',
      concept: 'all',
      sort: 'latest'
    };
    const sInput = $('hub-search-input');
    const cSelect = $('hub-filter-country');
    const ctSelect = $('hub-filter-city');
    const cpSelect = $('hub-filter-concept');
    const stSelect = $('hub-filter-sort');
    if (sInput) sInput.value = '';
    if (cSelect) cSelect.value = 'all';
    if (ctSelect) ctSelect.value = 'all';
    if (cpSelect) cpSelect.value = 'all';
    if (stSelect) stSelect.value = 'latest';

    updateFilterDropdowns();
    setStatusFilter('all');
  }

  function updateViewModeButton() {
    const btn = $('btn-hub-view-mode');
    const btnIcon = $('btn-hub-view-mode-icon');
    const btnTxt = $('btn-hub-view-mode-txt');
    if (!btnIcon || !btnTxt) return;
    if (State.hubViewMode === 'list') {
      btnIcon.className = 'fa-solid fa-list-ul text-xs text-[#a2601b]';
      btnTxt.textContent = '목록';
      if (btn) btn.title = '격자 뷰로 전환 (대형 카드)';
    } else {
      btnIcon.className = 'fa-solid fa-table-cells text-xs text-[#a2601b]';
      btnTxt.textContent = '격자';
      if (btn) btn.title = '컴팩트 목록 뷰로 전환 (1줄 요약)';
    }
    if (btn) btn.setAttribute('aria-label', btn.title);
  }

  function toggleViewMode() {
    State.hubViewMode = State.hubViewMode === 'grid' ? 'list' : 'grid';
    localStorage.setItem('st_hub_view_mode', State.hubViewMode);
    updateViewModeButton();
    renderCards();
  }

  function updateFilterDropdowns() {
    const countrySelect = $('hub-filter-country');
    const citySelect = $('hub-filter-city');
    if (!countrySelect) return;

    const countriesSet = new Set();
    const countryOptionValues = new Set();
    const citiesSet = new Set();
    const selCountry = State.hubFilters.country || 'all';

    (State.trips || []).forEach(t => {
      const tCountries = t.countries || [];
      tCountries.forEach(c => {
        const resolved = resolveCanonicalCountry(c);
        const canonicalName = resolved && resolved.canonicalName ? resolved.canonicalName : c;
        if (canonicalName && canonicalName.trim()) countriesSet.add(canonicalName.trim());
      });
    });

    // 1. 국가 드롭다운 갱신 (국기 + 표준 국가명 + 통화 코드)
    const countryOptions = ['<option value="all">국가</option>'];
    Array.from(countriesSet).sort().forEach(c => {
      const cInfo = resolveCountryInfo(c);
      const flag = cInfo ? cInfo.flag : '🌎';
      const curr = cInfo ? ` (${cInfo.currency})` : '';
      const displayName = cInfo ? cInfo.name : c;
      countryOptionValues.add(displayName);
      countryOptions.push(`<option value="${escapeHtml(displayName)}">${escapeHtml(flag)} ${escapeHtml(displayName)}${escapeHtml(curr)}</option>`);
    });
    countrySelect.innerHTML = countryOptions.join('');

    // 선택된 국가가 삭제된 여행 등으로 목록에서 사라졌으면 'all'로 안전 초기화한다.
    let activeCountry = selCountry;
    if (activeCountry && activeCountry !== 'all' && countryOptionValues.has(activeCountry)) {
      countrySelect.value = activeCountry;
    } else {
      activeCountry = 'all';
      State.hubFilters.country = 'all';
      countrySelect.value = 'all';
    }

    // 도시 수집: 유효한 국가 필터 기준
    (State.trips || []).forEach(t => {
      const tCountries = t.countries || [];
      const matchCountry = activeCountry === 'all' ||
        tCountries.some(c => {
          const resolved = resolveCanonicalCountry(c);
          const name = resolved && resolved.canonicalName ? resolved.canonicalName : c;
          return name.toLowerCase() === activeCountry.toLowerCase() || name.toLowerCase().includes(activeCountry.toLowerCase());
        }) ||
        (t.cities || []).some(ct => {
          const resolved = resolveCanonicalCountry(ct);
          return resolved && resolved.canonicalName && resolved.canonicalName.toLowerCase() === activeCountry.toLowerCase();
        });

      if (matchCountry) {
        (t.cities || []).forEach(ct => {
          const cl = cleanCityName(ct);
          if (cl && !countriesSet.has(cl)) citiesSet.add(cl);
        });
        (t.days || []).forEach(d => {
          const cl = cleanCityName(d.city);
          if (cl && !countriesSet.has(cl)) citiesSet.add(cl);
        });
      }
    });

    // 2. 도시 드롭다운 갱신
    if (citySelect) {
      const cityOptions = ['<option value="all">도시</option>'];
      Array.from(citiesSet).sort().forEach(ct => {
        cityOptions.push(`<option value="${escapeHtml(ct)}">${escapeHtml(ct)}</option>`);
      });
      citySelect.innerHTML = cityOptions.join('');
      if (State.hubFilters.city && citiesSet.has(State.hubFilters.city)) {
        citySelect.value = State.hubFilters.city;
      } else {
        State.hubFilters.city = 'all';
        citySelect.value = 'all';
      }
    }
  }

  function renderActiveChips() {
    const container = $('hub-active-chips');
    if (!container) return;

    const chips = [];
    const f = State.hubFilters;
    for (const status of VALID_STATUSES) {
      $(`tab-filter-${status}`)?.setAttribute('aria-pressed', String(f.status === status));
    }
    const advancedCount = ['country', 'city', 'concept'].filter(key => f[key] && f[key] !== 'all').length;
    const count = $('hub-filter-count');
    if (count) {
      count.hidden = advancedCount === 0;
      count.textContent = String(advancedCount);
      count.closest('details')?.querySelector('summary')?.setAttribute(
        'aria-label',
        advancedCount ? `상세 필터, ${advancedCount}개 적용 중` : '상세 필터'
      );
    }

    if (f.status && f.status !== 'all') {
      const statusMap = {
        ongoing: { label: '진행중', icon: 'fa-solid fa-play text-emerald-600' },
        planned: { label: '예정', icon: 'fa-solid fa-calendar text-blue-600' },
        completed: { label: '완료', icon: 'fa-solid fa-check text-stone-500' },
        bucketlist: { label: '버킷리스트', icon: 'fa-solid fa-star text-amber-500' }
      };
      const sInfo = statusMap[f.status] || { label: f.status, icon: 'fa-solid fa-filter' };
      chips.push({ key: 'status', icon: sInfo.icon, text: sInfo.label, prefix: '' });
    }
    if (f.search) {
      chips.push({ key: 'search', icon: 'fa-solid fa-magnifying-glass text-stone-400', text: `"${f.search}"`, prefix: '' });
    }
    if (f.country && f.country !== 'all') {
      const cInfo = resolveCountryInfo(f.country);
      const flag = cInfo ? cInfo.flag : '🌎';
      chips.push({ key: 'country', icon: '', text: f.country, prefix: flag });
    }
    if (f.city && f.city !== 'all') {
      chips.push({ key: 'city', icon: 'fa-solid fa-city text-blue-500', text: f.city, prefix: '' });
    }
    if (f.concept && f.concept !== 'all') {
      chips.push({ key: 'concept', icon: 'fa-solid fa-tag text-amber-500', text: `#${f.concept}`, prefix: '' });
    }
    if (f.sort && f.sort !== 'latest') {
      const sortLabels = {
        'date-asc': '출발일 빠른순',
        'budget-desc': '예산 높은순',
        'budget-asc': '예산 낮은순'
      };
      chips.push({ key: 'sort', icon: 'fa-solid fa-arrow-down-short-wide text-stone-500', text: sortLabels[f.sort] || f.sort, prefix: '' });
    }

    if (chips.length === 0) {
      container.classList.add('hidden');
      container.innerHTML = '';
      return;
    }

    container.classList.remove('hidden');
    const parts = [
      '<span class="text-[11px] font-bold text-[#78716c] dark:text-stone-400 shrink-0 mr-1"><i class="fa-solid fa-sliders text-[10px]"></i> 적용 필터:</span>'
    ];
    chips.forEach(chip => {
      parts.push(
        '<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#fdf6ec] dark:bg-amber-950/40 text-[#a2601b] dark:text-[#d4af37] border border-[#f5dfb8] dark:border-amber-900/60 font-medium text-xs shadow-xs transition">',
        '<span>',
        chip.icon ? `<i class="${escapeHtml(chip.icon)} text-[10px]"></i> ` : '',
        chip.prefix ? `${escapeHtml(chip.prefix)} ` : '',
        escapeHtml(chip.text),
        '</span>',
        `<button type="button" data-on-click="hub.removeFilter" data-filter-key="${escapeHtml(chip.key)}" class="w-3.5 h-3.5 rounded-full hover:bg-amber-200 dark:hover:bg-amber-900/80 flex items-center justify-center text-[10px] text-[#a2601b] dark:text-[#d4af37] font-bold cursor-pointer transition" title="필터 해제">✕</button>`,
        '</span>'
      );
    });
    parts.push(
      '<button type="button" data-on-click="hub.resetFilters" class="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:underline flex items-center gap-1 ml-auto shrink-0 cursor-pointer px-1.5 py-0.5" title="모든 필터 초기화">',
      '<i class="fa-solid fa-rotate-left text-[10px]"></i><span>전체 초기화</span></button>'
    );
    container.innerHTML = parts.join('');
  }

  function removeFilter(key) {
    if (key === 'status') {
      setStatusFilter('all');
    } else if (key === 'search') {
      State.hubFilters.search = '';
      const el = $('hub-search-input');
      if (el) el.value = '';
      onFilterChange();
    } else if (key === 'country') {
      State.hubFilters.country = 'all';
      State.hubFilters.city = 'all';
      const cEl = $('hub-filter-country');
      if (cEl) cEl.value = 'all';
      updateFilterDropdowns();
      onFilterChange();
    } else if (key === 'city') {
      State.hubFilters.city = 'all';
      const ctEl = $('hub-filter-city');
      if (ctEl) ctEl.value = 'all';
      onFilterChange();
    } else if (key === 'concept') {
      State.hubFilters.concept = 'all';
      const cpEl = $('hub-filter-concept');
      if (cpEl) cpEl.value = 'all';
      onFilterChange();
    } else if (key === 'sort') {
      State.hubFilters.sort = 'latest';
      const sEl = $('hub-filter-sort');
      if (sEl) sEl.value = 'latest';
      onFilterChange();
    }
  }

  function resolveCover(trip) {
    if (!trip) {
      return { type: 'preset-default', bgGradient: 'bg-gradient-to-br from-stone-800 via-stone-900 to-slate-950', icon: '✈️', accentColor: '#d4af37' };
    }
    // 1. 사용자 직접 등록 대표 사진 (안전한 래스터 이미지 주소만 허용)
    if (trip.coverPhoto && isSafeCoverUrl(trip.coverPhoto)) {
      return { type: 'custom', url: trip.coverPhoto.trim(), isCustom: true };
    }
    // 2. 기록 사진 중 날짜가 가장 이른 사진(하루 회고·일정 기록·순간 기록). 안전한 이미지 주소만 쓴다.
    const recordPhoto = T.TravelRecords.firstPhoto(trip);
    const recordPhotoUrl = recordPhoto && T.MediaRepository.photoSource(recordPhoto.record.entry, recordPhoto.index);
    if (recordPhotoUrl && isSafeCoverUrl(recordPhotoUrl)) {
      return { type: 'journal', url: recordPhotoUrl, isJournalPhoto: true };
    }
    // 3. 목적지별 고유 테마 프리셋
    const isYN = (trip.id && trip.id.includes('yunnan')) || (trip.title && trip.title.includes('운남'));
    if (isYN) {
      return {
        type: 'preset-yunnan',
        bgGradient: 'bg-gradient-to-br from-emerald-950 via-teal-900 to-[#0c141f]',
        accentColor: '#10b981',
        icon: '🏔️',
        badgeText: '운남 차마고도'
      };
    }
    const isSA = (trip.id && trip.id.includes('south_america')) || (trip.title && trip.title.includes('남미'));
    if (isSA) {
      return {
        type: 'preset-south-america',
        bgGradient: 'bg-gradient-to-br from-amber-950 via-stone-900 to-[#121624]',
        accentColor: '#f59e0b',
        icon: '🦙',
        badgeText: '남미 대종단'
      };
    }
    const isMongol = (trip.title && trip.title.includes('몽골')) ||
      (trip.countries && trip.countries.some(c => c && c.includes('몽골')));
    if (isMongol) {
      return {
        type: 'preset-mongolia',
        bgGradient: 'bg-gradient-to-br from-sky-950 via-blue-900 to-[#0c1424]',
        accentColor: '#38bdf8',
        icon: '🇲🇳',
        badgeText: '푸른 초원 몽골'
      };
    }
    // 4. 일반 여행 기본 프리셋
    return {
      type: 'preset-default',
      bgGradient: 'bg-gradient-to-br from-stone-800 via-stone-900 to-slate-950',
      accentColor: '#d4af37',
      icon: trip.coverEmoji || '✈️',
      badgeText: '인생 여행'
    };
  }

  function handleCoverUpload(tripId, event) {
    const input = event?.target;
    const file = input?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = async () => {
        const targetW = 800;
        const targetH = 450;
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');

        const imgRatio = img.width / img.height;
        const targetRatio = targetW / targetH;
        let sWidth, sHeight, sx, sy;
        if (imgRatio > targetRatio) {
          sHeight = img.height;
          sWidth = img.height * targetRatio;
          sx = (img.width - sWidth) / 2;
          sy = 0;
        } else {
          sWidth = img.width;
          sHeight = img.width / targetRatio;
          sx = 0;
          sy = (img.height - sHeight) / 2;
        }
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetW, targetH);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);

        if (await commitTrip(tripId, target => { target.coverPhoto = compressedDataUrl; })) {
          renderCards();
          showToast('📷 여행 대표 사진이 등록되었습니다!');
        }
      };
      img.onerror = () => {
        showToast('이미지를 읽지 못했습니다. 다른 사진 파일을 선택해 주세요.');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    if (input) input.value = '';
  }

  function triggerCoverUpload(tripId, event) {
    if (event) event.stopPropagation();
    if (!tripId) return;
    coverUploadTripId = tripId;
    let input = $('hub-cover-upload-input');
    if (!input) {
      input = document.createElement('input');
      input.id = 'hub-cover-upload-input';
      input.type = 'file';
      input.accept = 'image/*';
      input.className = 'hidden';
      input.addEventListener('change', e => {
        if (coverUploadTripId) handleCoverUpload(coverUploadTripId, e);
      });
      document.body.appendChild(input);
    }
    input.value = '';
    input.click();
  }

  async function removeCover(tripId, event) {
    if (event) event.stopPropagation();
    if (!tripId) return;
    if (confirm('등록된 대표 사진을 삭제하고 기본 테마로 변경하시겠습니까?')) {
      if (await commitTrip(tripId, target => { delete target.coverPhoto; })) {
        renderCards();
        showToast('기본 테마로 복원되었습니다.');
      }
    }
  }

  function renderDDayBadge(trip, now) {
    const stage = T.TripAdapter.resolveTripStage(trip, now);
    const state = stage === 'bucketlist' ? 'bucket' : stage;
    const diff = Math.round((Date.parse(trip.startDate) - Date.parse(T.TripAdapter.localDateKey(now, trip.timeZone))) / 86400000);
    const label = stage === 'planned' ? `D-${diff}` : stage === 'ongoing' ? '여행 중 ✈️' : stage === 'completed' ? '완료' : '버킷리스트';
    return `<span class="travel-status" data-status="${escapeHtml(state)}">${escapeHtml(label)}</span>`;
  }

  function renderCoverBannerParts(trip, cover, isHero, now) {
    const bannerHeight = isHero ? 'h-44 sm:h-52' : 'h-28 sm:h-32';
    const photoBtnLabel = cover.isCustom ? '사진 변경' : '대표 사진';
    const safeTripId = escapeHtml(trip.id);

    const bgParts = cover.url
      ? [
          `<div class="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-700" style="background-image: url('${escapeHtml(cover.url)}');"></div>`,
          '<div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/30"></div>'
        ]
      : [
          `<div class="absolute inset-0 ${escapeHtml(cover.bgGradient)}"></div>`,
          '<div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-black/60"></div>',
          `<div class="absolute inset-0 flex items-center justify-center opacity-15 select-none pointer-events-none text-7xl font-bold text-white">${escapeHtml(cover.icon || '✈️')}</div>`,
          '<div class="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/25"></div>'
        ];

    return [
      `<div class="hub-card-cover ${isHero ? 'h-44 sm:h-52' : 'h-28 sm:h-32'} relative p-3.5 flex items-start justify-between overflow-hidden">`,
      ...bgParts,
      '<div class="relative z-10 flex items-center gap-1.5 flex-wrap">',
      isHero
        ? '<span class="px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-black text-[11px] shadow-md flex items-center gap-1.5 shrink-0"><i class="fa-solid fa-star text-[10px]"></i><span>대표 여정</span></span>'
        : '',
      trip.isSample
        ? '<span class="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-amber-300 border border-amber-500/40 text-[10px] font-bold">🧭 가상 기능 예제</span>'
        : '',
      '</div>',
      '<div class="hub-card-cover-actions relative z-10 flex items-center gap-1.5">',
      renderDDayBadge(trip, now),
      `<button type="button" data-on-click="hub.uploadCover" data-trip-id="${escapeHtml(trip.id)}" class="px-2 py-1 rounded-lg bg-black/45 hover:bg-black/70 backdrop-blur-md text-white/90 hover:text-white border border-white/20 flex items-center gap-1 text-[11px] font-bold shadow-sm transition cursor-pointer" title="${escapeHtml(photoBtnLabel)}"><i class="fa-solid fa-camera text-[10px]"></i><span class="hidden sm:inline">${escapeHtml(photoBtnLabel)}</span></button>`,
      cover.isCustom
        ? `<button type="button" data-on-click="hub.removeCover" data-trip-id="${escapeHtml(trip.id)}" class="w-7 h-7 rounded-lg bg-black/50 hover:bg-rose-600/80 backdrop-blur-md text-white/90 hover:text-white border border-white/20 flex items-center justify-center text-xs shadow-sm transition cursor-pointer" title="대표 사진 삭제 및 기본 테마 복원">✕</button>`
        : '',
      `<button type="button" data-on-click="hub.openPdf" data-trip-id="${escapeHtml(trip.id)}" class="w-7 h-7 rounded-lg bg-black/45 hover:bg-black/70 backdrop-blur-md text-white/90 hover:text-white border border-white/20 flex items-center justify-center text-xs shadow-sm transition cursor-pointer" aria-label="PDF 여행 에세이 리포트" title="PDF 여행 에세이 리포트"><i class="fa-solid fa-file-pdf"></i></button>`,
      `<button type="button" data-on-click="hub.deleteTrip" data-trip-id="${escapeHtml(trip.id)}" class="w-7 h-7 rounded-lg bg-black/45 hover:bg-rose-700/80 backdrop-blur-md text-white/90 hover:text-white border border-white/20 flex items-center justify-center text-xs shadow-sm transition cursor-pointer" aria-label="여행 삭제" title="여행 삭제"><i class="fa-regular fa-trash-can"></i></button>`,
      '</div>',
      '</div>'
    ];
  }

  function renderCards() {
    const grid = $('trip-cards-grid');
    if (!grid) return;

    renderActiveChips();

    grid.className = State.hubViewMode === 'list'
      ? 'space-y-3.5 max-w-5xl mx-auto'
      : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5';

    const trips = State.trips || [];
    const now = new Date();
    let countOngoing = 0;
    let countPlanned = 0;
    let countCompleted = 0;
    let countBucketlist = 0;

    trips.forEach(trip => {
      const stage = T.TripAdapter.resolveTripStage(trip, now);
      if (stage === 'ongoing') countOngoing++;
      else if (stage === 'planned') countPlanned++;
      else if (stage === 'completed') countCompleted++;
      else countBucketlist++;
    });

    const elAll = $('count-filter-all');
    const elOngoing = $('count-filter-ongoing');
    const elPlanned = $('count-filter-planned');
    const elCompleted = $('count-filter-completed');
    const elBucketlist = $('count-filter-bucketlist');
    if (elAll) elAll.textContent = String(trips.length);
    if (elOngoing) elOngoing.textContent = String(countOngoing);
    if (elPlanned) elPlanned.textContent = String(countPlanned);
    if (elCompleted) elCompleted.textContent = String(countCompleted);
    if (elBucketlist) elBucketlist.textContent = String(countBucketlist);

    const filtered = trips.filter(trip => {
      if (State.hubFilters.status !== 'all') {
        if (T.TripAdapter.resolveTripStage(trip, now) !== State.hubFilters.status) return false;
      }

      if (State.hubFilters.search) {
        const q = State.hubFilters.search;
        const searchCorpus = [
          trip.title,
          trip.subtitle,
          trip.style,
          (trip.countries || []).join(' '),
          (trip.cities || []).join(' '),
          (trip.concepts || []).join(' '),
          trip.wishlist || ''
        ].join(' ').toLowerCase();
        if (!searchCorpus.includes(q)) return false;
      }

      if (State.hubFilters.country && State.hubFilters.country !== 'all') {
        const targetCountry = State.hubFilters.country.toLowerCase();
        const matchCountry = (trip.countries || []).some(c => {
          const res = resolveCanonicalCountry(c);
          const name = res && res.canonicalName ? res.canonicalName.toLowerCase() : String(c).toLowerCase();
          return name === targetCountry || name.includes(targetCountry);
        }) ||
        (trip.cities || []).some(ct => {
          const res = resolveCanonicalCountry(ct);
          return res && res.canonicalName && res.canonicalName.toLowerCase() === targetCountry;
        });
        if (!matchCountry) return false;
      }

      if (State.hubFilters.city && State.hubFilters.city !== 'all') {
        const targetCity = State.hubFilters.city.toLowerCase();
        const matchCity = (trip.cities || []).some(c => String(c).toLowerCase() === targetCity || String(c).toLowerCase().includes(targetCity)) ||
          (trip.days || []).some(d => (cleanCityName(d.city) || '').toLowerCase() === targetCity || (d.city || '').toLowerCase().includes(targetCity)) ||
          (trip.title || '').toLowerCase().includes(targetCity);
        if (!matchCity) return false;
      }

      if (State.hubFilters.concept && State.hubFilters.concept !== 'all') {
        const matchConcept = (trip.concepts || []).includes(State.hubFilters.concept) ||
          (trip.style || '').includes(State.hubFilters.concept);
        if (!matchConcept) return false;
      }

      return true;
    });

    // 정렬 적용 (기본값 latest: 최신 여행 일정 최상단 배치; 예산 정렬은 원화 환산 기준)
    if (State.hubFilters.sort === 'latest' || !State.hubFilters.sort) {
      filtered.sort(compareTripsLatestFirst);
    } else if (State.hubFilters.sort === 'date-asc') {
      filtered.sort((a, b) => (a.startDate || '9999').localeCompare(b.startDate || '9999'));
    } else if (State.hubFilters.sort === 'budget-desc') {
      filtered.sort((a, b) => tripBudgetKrw(b) - tripBudgetKrw(a));
    } else if (State.hubFilters.sort === 'budget-asc') {
      filtered.sort((a, b) => tripBudgetKrw(a) - tripBudgetKrw(b));
    }

    // Empty State
    if (filtered.length === 0) {
      if (!trips.length && !$('demo-onboarding-offer')?.hidden) {
        grid.innerHTML = '';
        return;
      }
      grid.innerHTML = `
        <div class="col-span-full p-10 text-center rounded-2xl bg-white border border-[#e8e2d5] space-y-4 shadow-sm">
          <div class="w-16 h-16 rounded-2xl bg-[#fdf6ec] border border-[#f5dfb8] text-[#a2601b] mx-auto flex items-center justify-center text-2xl shadow-inner pulse-gold">
            <i class="fa-solid fa-compass"></i>
          </div>
          <div class="space-y-1">
            <h3 class="text-base font-black text-[#1c1917]">${trips.length ? '해당 조건의 여행이 없습니다' : '첫 여행을 기록해 보세요'}</h3>
            <p class="text-xs text-[#78716c]">${trips.length ? '필터를 초기화하거나 새로운 여행 다이어리를 등록해 보세요.' : '내 여행을 만들거나 설정에서 가상 예제를 선택할 수 있습니다.'}</p>
          </div>
          <div class="flex items-center justify-center gap-2.5 pt-2 flex-wrap">
            <button type="button" data-on-click="hub.resetFilters" class="px-4 py-2 rounded-xl bg-[#faf8f5] hover:bg-[#f0ece1] border border-[#e8e2d5] text-[#1c1917] text-xs font-bold transition cursor-pointer">
              필터 초기화
            </button>
            <button type="button" data-on-click="hub.createTrip" class="btn-gold px-4 py-2 rounded-xl text-xs font-black shadow-md cursor-pointer">
              + 새 여행 만들기
            </button>
          </div>
        </div>
      `;
      return;
    }

    // 히어로 대표 카드 선정 (1순위 진행 중, 2순위 가장 임박한 예정, 3순위 첫 번째 여행)
    let heroTripId = null;
    if (State.hubViewMode !== 'list' && (State.hubFilters.status === 'all' || State.hubFilters.status === 'ongoing' || State.hubFilters.status === 'planned')) {
      const ongoingTrip = filtered.find(t => T.TripAdapter.resolveTripStage(t, now) === 'ongoing');
      if (ongoingTrip) {
        heroTripId = ongoingTrip.id;
      } else {
        let minPlannedDiff = Infinity;
        let closestPlanned = null;
        filtered.forEach(t => {
          if (T.TripAdapter.resolveTripStage(t, now) !== 'planned') return;
          const diff = Math.round((Date.parse(t.startDate) - Date.parse(T.TripAdapter.localDateKey(now, t.timeZone))) / 86400000);
          if (diff > 0 && diff < minPlannedDiff) {
            minPlannedDiff = diff;
            closestPlanned = t;
          }
        });
        if (closestPlanned) heroTripId = closestPlanned.id;
        else if (filtered.length > 0) heroTripId = filtered[0].id;
      }
    }

    // 히어로 대표 카드가 선정된 경우 그리드 최상단(filtered[0])으로 재배치
    if (heroTripId) {
      const heroIdx = filtered.findIndex(t => t.id === heroTripId);
      if (heroIdx > 0) {
        const [heroItem] = filtered.splice(heroIdx, 1);
        filtered.unshift(heroItem);
      }
    }

    const cardChunks = [];

    filtered.forEach(trip => {
      const totalSpent = tripSpentKrw(trip);
      const budget = tripBudgetKrw(trip);
      const pct = budget > 0 ? Math.min(100, Math.round((totalSpent / budget) * 100)) : 0;
      const dur = tripDurationDays(trip);
      const safeTripId = escapeHtml(trip.id);

      let statusCls = 'trip-st-planned';
      let statusDesc = '';
      let barPct = 0;

      const resolvedStage = T.TripAdapter.resolveTripStage(trip, now);
      if (resolvedStage === 'bucketlist') {
        statusCls = 'trip-st-bucket';
        const plannedDays = trip.days ? trip.days.length : 0;
        barPct = plannedDays ? Math.min(100, plannedDays * 12) : 15;
        statusDesc = `버킷리스트 여정 (${plannedDays}개 일정 계획 중)`;
      } else if (trip.startDate) {
        const diffDays = Math.round((Date.parse(trip.startDate) - Date.parse(T.TripAdapter.localDateKey(now, trip.timeZone))) / 86400000);
        const effDur = dur || 1;
        if (resolvedStage === 'ongoing') {
          statusCls = 'trip-st-ongoing';
          const dayNumber = Math.min(effDur, Math.max(1, -diffDays + 1));
          const remainingDays = Math.max(0, effDur - dayNumber);
          barPct = Math.min(100, Math.max(8, Math.round((dayNumber / effDur) * 100)));
          statusDesc = `여행 진행 중 ${barPct}% (${dayNumber}/${effDur}일차, 남은 일정 ${remainingDays}일)`;
        } else if (resolvedStage === 'planned') {
          statusCls = 'trip-st-planned';
          barPct = Math.max(10, Math.min(95, Math.round(((60 - Math.min(60, diffDays)) / 60) * 100)));
          statusDesc = `D-${diffDays}일 전 (여행 시작까지 ${diffDays}일 남음)`;
        } else {
          statusCls = 'trip-st-completed';
          barPct = 100;
          statusDesc = `여행 완료 (총 ${dur}일 여정 완료)`;
        }
      }

      const conceptChipsHtml = (trip.concepts || []).slice(0, 3).map(c =>
        `<span class="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-[10px] font-medium border border-stone-200 dark:border-stone-700">#${escapeHtml(c)}</span>`
      ).join('');

      const tripCountries = trip.countries || [];
      const countryBadgesHtml = tripCountries.map(c => {
        const resolved = resolveCanonicalCountry(c);
        const flag = resolved && resolved.country ? resolved.country.flag : getCountryFlag(c);
        const cName = resolved && resolved.canonicalName ? resolved.canonicalName : c;
        return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#faf8f5] dark:bg-stone-800 text-[#1c1917] dark:text-stone-200 border border-[#e8e2d5] dark:border-stone-700 text-[11px] font-bold"><span class="text-xs">${escapeHtml(flag)}</span><span>${escapeHtml(cName)}</span></span>`;
      }).join(' ');

      const tripCurrCode = trip.currency || (tripCountries.length > 0 && resolveCountryInfo(tripCountries[0])?.currency) || 'KRW';
      const currBadgeHtml = `<span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-[#a2601b] dark:text-[#d4af37] border border-amber-500/30">${escapeHtml(tripCurrCode)}</span>`;

      const cleanTripCities = (trip.cities || []).filter(ct => !tripCountries.some(c => {
        const res = resolveCanonicalCountry(c);
        const name = res ? res.canonicalName : c;
        return name === ct;
      }));
      const cityBadgesHtml = cleanTripCities.slice(0, 3).map(ct =>
        `<span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-[10px] font-medium border border-stone-200 dark:border-stone-700"><i class="fa-solid fa-location-dot text-[9px] text-[#a2601b]"></i>${escapeHtml(ct)}</span>`
      ).join(' ');

      const isTripYn = trip.id && trip.id.includes('yunnan');
      const tripMapIcon = isTripYn ? 'fa-solid fa-earth-asia' : 'fa-solid fa-earth-americas';
      const tripMapTitle = isTripYn ? '중국 운남 인터랙티브 지도' : '인터랙티브 경로 지도';
      const cover = resolveCover(trip);
      const isHero = trip.id === heroTripId;

      const routeCities = (trip.cities && trip.cities.length > 0) ? trip.cities : (trip.countries || []);
      const routePreviewStr = routeCities.slice(0, 5).join(' ➔ ') + (routeCities.length > 5 ? ' ...' : '');
      const dateRangeText = `${trip.startDate || '일정 미정'} ~ ${trip.endDate || ''}`;
      const listDurLabel = dur > 0 ? `(${dur}일)` : '(일정 미정)';
      const gridDurLabel = dur > 0 ? `${dur}일간` : '일정 미정';
      const listBudgetLabel = budget > 0 ? `/ ₩${formatManwon(budget)}` : '/ 미설정';
      const gridBudgetLabel = budget > 0 ? `/ ₩${budget.toLocaleString()}` : '/ 예산 미설정';

      if (State.hubViewMode === 'list') {
        const thumbHtml = cover.url
          ? `<img src="${escapeHtml(cover.url)}" class="w-12 h-12 rounded-xl object-cover border border-[#e8e2d5] dark:border-stone-700 shadow-sm shrink-0">`
          : `<div class="w-12 h-12 rounded-xl bg-gradient-to-br from-[#fdf6ec] to-[#f5dfb8] dark:from-stone-800 dark:to-stone-900 border border-[#e8e2d5] dark:border-stone-700 flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform">${escapeHtml(trip.coverEmoji || '🌎')}</div>`;

        cardChunks.push(
          `<div class="group relative rounded-2xl bg-white dark:bg-[#16181d] border border-[#e8e2d5] dark:border-stone-800 hover:border-[#2C3A2E]/50 dark:hover:border-[#D4AF37]/50 p-3.5 sm:p-4 shadow-[0_4px_20px_-2px_rgba(44,58,46,0.05),0_2px_6px_-1px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 cursor-pointer transition-colors trip-st-card ${escapeHtml(statusCls)}" data-on-click="hub.openTrip" data-trip-id="${escapeHtml(trip.id)}">`,
          '<div class="flex items-center gap-3 min-w-0">',
          thumbHtml,
          '<div class="min-w-0 flex-1">',
          '<div class="flex items-center gap-2 flex-wrap">',
          `<h4 class="text-sm sm:text-base font-extrabold tracking-tight text-[#1E2B24] dark:text-white group-hover:text-[#2C3A2E] dark:group-hover:text-[#D4AF37] transition truncate"><button type="button" class="hub-trip-open" data-on-click="hub.openTrip" data-trip-id="${escapeHtml(trip.id)}" aria-label="${escapeHtml(trip.title)} 여행 열기">${escapeHtml(trip.title)}</button></h4>`,
          trip.isSample ? '<span class="px-2 py-0.5 rounded-full bg-[#fdf6ec] text-[#a2601b] border border-[#f5dfb8] text-[10px] font-bold">🧭 가상 기능 예제</span>' : '',
          renderDDayBadge(trip, now),
          '</div>',
          '<div class="flex items-center gap-1.5 mt-1 text-xs text-[#78716c] dark:text-stone-400 flex-wrap">',
          `<span class="font-medium">${escapeHtml(dateRangeText)} ${escapeHtml(listDurLabel)}</span>`,
          '<span class="text-stone-300 dark:text-stone-600">•</span>',
          countryBadgesHtml || `<span>${escapeHtml((trip.countries || []).join(', ') || '전세계')}</span>`,
          currBadgeHtml,
          conceptChipsHtml,
          '</div></div></div>',
          '<div class="hub-card-footer flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#f0ece1] dark:border-stone-800">',
          '<div class="text-right shrink-0">',
          `<div class="text-[10px] text-[#78716c] dark:text-stone-400 font-bold">지출 / 예산 (${Number(pct)}%)</div>`,
          `<div class="text-xs font-bold text-[#1c1917] dark:text-stone-200">₩${escapeHtml(formatManwon(totalSpent))} <span class="text-stone-400 font-normal">${escapeHtml(listBudgetLabel)}</span></div>`,
          '</div>',
          '<div class="hub-card-actions flex items-center gap-1.5 shrink-0" data-on-click="hub.noop">',
          `<button type="button" data-on-click="hub.uploadCover" data-trip-id="${escapeHtml(trip.id)}" class="sulsul-capsule-btn w-9 h-9 p-0 rounded-full" aria-label="대표 사진 등록" title="대표 사진 등록"><i class="fa-solid fa-camera"></i></button>`,
          `<button type="button" data-on-click="hub.openMap" data-trip-id="${escapeHtml(trip.id)}" class="sulsul-capsule-btn w-9 h-9 p-0 rounded-full" title="${escapeHtml(tripMapTitle)}"><i class="${escapeHtml(tripMapIcon)}"></i></button>`,
          `<button type="button" data-on-click="hub.openPdf" data-trip-id="${escapeHtml(trip.id)}" class="sulsul-capsule-btn w-9 h-9 p-0 rounded-full" aria-label="PDF 여행 에세이 리포트" title="PDF 여행 에세이 리포트"><i class="fa-solid fa-file-pdf"></i></button>`,
          `<button type="button" data-on-click="hub.deleteTrip" data-trip-id="${escapeHtml(trip.id)}" class="sulsul-capsule-btn w-9 h-9 p-0 rounded-full hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-400/50" aria-label="여행 삭제" title="여행 삭제"><i class="fa-regular fa-trash-can"></i></button>`,
          '</div></div>',
          `<div class="trip-bottom-bar" title="${escapeHtml(statusDesc)}"><i style="width: ${Number(barPct)}%"></i></div>`,
          '</div>'
        );
      } else if (isHero) {
        cardChunks.push(
          `<div class="col-span-full group relative rounded-2xl bg-white dark:bg-[#16181d] border-2 border-amber-500/40 hover:border-amber-500/70 dark:border-amber-500/50 transition-all duration-300 overflow-hidden flex flex-col shadow-[0_4px_20px_-2px_rgba(44,58,46,0.06),0_2px_6px_-1px_rgba(0,0,0,0.03)] hover:shadow-xl trip-st-card ${escapeHtml(statusCls)}">`,
          ...renderCoverBannerParts(trip, cover, true, now),
          `<div class="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3.5 cursor-pointer" data-on-click="hub.openTrip" data-trip-id="${escapeHtml(trip.id)}">`,
          '<div class="space-y-2.5">',
          '<div class="flex items-start justify-between gap-3"><div class="flex items-center gap-3 min-w-0">',
          `<span class="text-3xl sm:text-4xl shrink-0">${escapeHtml(trip.coverEmoji || '🌎')}</span>`,
          '<div class="min-w-0 flex-1">',
          `<h4 class="text-base sm:text-xl font-extrabold tracking-tight text-[#1E2B24] dark:text-white truncate group-hover:text-[#2C3A2E] dark:group-hover:text-[#D4AF37] transition"><button type="button" class="hub-trip-open" data-on-click="hub.openTrip" data-trip-id="${escapeHtml(trip.id)}" aria-label="${escapeHtml(trip.title)} 여행 열기">${escapeHtml(trip.title)}</button></h4>`,
          `<p class="text-xs text-[#78716c] dark:text-stone-400 truncate mt-0.5">${escapeHtml(trip.subtitle || trip.style || '인생의 특별한 여정')}</p>`,
          '</div></div></div>',
          '<div class="p-2.5 rounded-xl bg-[#F7F5F0] dark:bg-stone-900/90 border border-[#E6E2D8] dark:border-stone-800 text-xs flex items-center gap-2 overflow-x-auto no-scrollbar">',
          '<span class="text-[#2C3A2E] dark:text-[#D4AF37] font-bold shrink-0 flex items-center gap-1"><i class="fa-solid fa-route text-[11px]"></i> 주요 코스:</span>',
          `<span class="text-stone-700 dark:text-stone-300 font-medium whitespace-nowrap">${escapeHtml(routePreviewStr)}</span>`,
          '</div>',
          '<div class="flex items-center gap-1.5 flex-wrap">',
          countryBadgesHtml,
          currBadgeHtml,
          cityBadgesHtml,
          conceptChipsHtml,
          '</div>',
          '<div class="flex items-center justify-between text-xs text-[#78716c] dark:text-stone-400 pt-2 border-t border-[#f0ece1] dark:border-stone-800">',
          `<span class="font-medium">${escapeHtml(dateRangeText)}</span>`,
          `<span class="font-black text-[#1c1917] dark:text-white">${escapeHtml(gridDurLabel)}</span>`,
          '</div></div>',
          '<div class="space-y-1.5 pt-1">',
          '<div class="flex items-center justify-between text-[11px]">',
          `<span class="text-[#78716c] dark:text-stone-400 font-medium">지출액 / 목표 예산 (${Number(pct)}%)</span>`,
          `<span class="font-bold text-[#1c1917] dark:text-stone-200">₩${escapeHtml(totalSpent.toLocaleString())} <span class="text-stone-400 font-normal">${escapeHtml(gridBudgetLabel)}</span></span>`,
          '</div>',
          `<div class="w-full bg-[#f0ece1] dark:bg-stone-800 rounded-full h-2 overflow-hidden"><div class="bg-gradient-to-r from-[#d7a643] to-[#a2601b] h-full rounded-full transition-all duration-500" style="width: ${Number(pct)}%"></div></div>`,
          '</div>',
          '<div class="hub-card-open-actions pt-2 flex items-center gap-2.5">',
          `<button type="button" data-on-click="hub.openMap" data-trip-id="${escapeHtml(trip.id)}" class="sulsul-capsule-btn px-3.5" title="${escapeHtml(tripMapTitle)}"><i class="${escapeHtml(tripMapIcon)}"></i><span>경로 지도</span></button>`,
          `<button type="button" data-on-click="hub.openTrip" data-trip-id="${escapeHtml(trip.id)}" class="flex-1 h-10 rounded-full btn-gold text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 shadow-md cursor-pointer"><span>다이어리 열기</span><i class="fa-solid fa-arrow-right text-[11px]"></i></button>`,
          '</div></div>',
          `<div class="trip-bottom-bar" title="${escapeHtml(statusDesc)}"><i style="width: ${Number(barPct)}%"></i></div>`,
          '</div>'
        );
      } else {
        cardChunks.push(
          `<div class="group relative rounded-2xl bg-white dark:bg-[#16181d] border border-[#e8e2d5] dark:border-stone-800 hover:border-[#2C3A2E]/50 dark:hover:border-[#D4AF37]/50 transition-all duration-200 overflow-hidden flex flex-col shadow-[0_4px_20px_-2px_rgba(44,58,46,0.05),0_2px_6px_-1px_rgba(0,0,0,0.03)] hover:shadow-lg hover:-translate-y-1 trip-st-card ${escapeHtml(statusCls)}">`,
          ...renderCoverBannerParts(trip, cover, false, now),
          `<div class="p-4 flex-1 flex flex-col justify-between space-y-3 cursor-pointer" data-on-click="hub.openTrip" data-trip-id="${escapeHtml(trip.id)}">`,
          '<div><div class="flex items-center gap-2.5">',
          `<span class="text-2xl shrink-0">${escapeHtml(trip.coverEmoji || '🌎')}</span>`,
          '<div class="min-w-0 flex-1">',
          `<h4 class="text-base font-extrabold tracking-tight text-[#1E2B24] dark:text-white truncate group-hover:text-[#2C3A2E] dark:group-hover:text-[#D4AF37] transition"><button type="button" class="hub-trip-open" data-on-click="hub.openTrip" data-trip-id="${escapeHtml(trip.id)}" aria-label="${escapeHtml(trip.title)} 여행 열기">${escapeHtml(trip.title)}</button></h4>`,
          `<p class="text-[11px] text-[#78716c] dark:text-stone-400 truncate mt-0.5">${escapeHtml(trip.subtitle || trip.style || '인생의 특별한 여정')}</p>`,
          '</div></div>',
          '<div class="mt-2.5 flex items-center gap-1.5 flex-wrap">',
          countryBadgesHtml,
          currBadgeHtml,
          cityBadgesHtml,
          conceptChipsHtml,
          '</div>',
          '<div class="mt-2.5 flex items-center justify-between text-xs text-[#78716c] dark:text-stone-400 pt-2 border-t border-[#f0ece1] dark:border-stone-800">',
          `<span>${escapeHtml(dateRangeText)}</span>`,
          `<span class="font-bold text-[#1c1917] dark:text-white">${escapeHtml(gridDurLabel)}</span>`,
          '</div></div>',
          '<div class="space-y-1.5 pt-1">',
          '<div class="flex items-center justify-between text-[11px]">',
          '<span class="text-[#78716c] dark:text-stone-400">지출액 / 목표 예산</span>',
          `<span class="font-bold text-[#1c1917] dark:text-stone-200">₩${escapeHtml(totalSpent.toLocaleString())} <span class="text-stone-400 font-normal">${escapeHtml(gridBudgetLabel)}</span></span>`,
          '</div>',
          `<div class="w-full bg-[#f0ece1] dark:bg-stone-800 rounded-full h-1.5 overflow-hidden"><div class="bg-gradient-to-r from-[#d7a643] to-[#a2601b] h-full rounded-full" style="width: ${Number(pct)}%"></div></div>`,
          '</div>',
          '<div class="hub-card-open-actions pt-2 flex items-center gap-2">',
          `<button type="button" data-on-click="hub.openMap" data-trip-id="${escapeHtml(trip.id)}" class="sulsul-capsule-btn px-3" title="${escapeHtml(tripMapTitle)}"><i class="${escapeHtml(tripMapIcon)}"></i><span>지도</span></button>`,
          `<button type="button" data-on-click="hub.openTrip" data-trip-id="${escapeHtml(trip.id)}" class="flex-1 h-9 rounded-full btn-gold text-xs font-black transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"><span>다이어리 열기</span><i class="fa-solid fa-arrow-right text-[10px]"></i></button>`,
          '</div></div>',
          `<div class="trip-bottom-bar" title="${escapeHtml(statusDesc)}"><i style="width: ${Number(barPct)}%"></i></div>`,
          '</div>'
        );
      }
    });

    grid.innerHTML = cardChunks.join('');
  }

  T.UiActions.define('hub', {
    statusFilter: element => setStatusFilter(element.dataset.status),
    filterChange: () => onFilterChange(),
    countryChange: () => onCountryChange(),
    resetFilters: () => resetFilters(),
    removeFilter: element => removeFilter(element.dataset.filterKey),
    toggleViewMode: () => toggleViewMode(),
    openTrip: element => openTripWorkspace(element.dataset.tripId),
    openMap: (element, event) => { event.stopPropagation(); openTripWorkspace(element.dataset.tripId); navigateToInteractiveMap(); },
    uploadCover: (element, event) => triggerCoverUpload(element.dataset.tripId, event),
    removeCover: (element, event) => removeCover(element.dataset.tripId, event),
    openPdf: (element, event) => openTripPdfReport(element.dataset.tripId, event),
    deleteTrip: (element, event) => requestDeleteTrip(element.dataset.tripId, event),
    createTrip: () => openCreateTripModal(),
    noop: () => {}
  });

  T.HubView = Object.freeze({
    render,
    renderCards,
    setStatusFilter,
    onCountryChange,
    onFilterChange,
    resetFilters,
    toggleViewMode,
    updateViewModeButton,
    updateFilterDropdowns,
    renderActiveChips,
    removeFilter,
    resolveCover,
    triggerCoverUpload,
    handleCoverUpload,
    removeCover,
    renderDDayBadge
  });
})(typeof window !== 'undefined' ? window : globalThis);
