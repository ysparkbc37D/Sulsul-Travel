/* 평생 여행 통계 대시보드 모달과 6대 지표 드릴다운 (v2.1.9, 계획 4단계 11차).
 * index.html의 #modal-analytics 열기/탭 전환(openAnalyticsModal·switchAnalyticsTab·toggleAnalyticsView)과
 * renderLifetimeAnalytics·toggleStatDrilldown·closeStatDrilldown·renderStatDrilldown(약 540줄)을 옮겼다.
 * 셸 함수(getActiveTrip·compareTripsLatestFirst·resolveCountryInfo·getCurrencyRate·escapeHtml·
 * openModal·closeModal·openTripWorkspace·switchTab·navigateToInteractiveMap·openPdfReportModal)와
 * 전역 State·CURRENCY_INFO는 부를 때 찾는다.
 * 모든 여행 자료 값은 escapeHtml 또는 textContent로 넣고, 동작은 data-on-click="lifetimeAnalytics.*"로 잇는다.
 * 불러올 때는 등록만 하고 문서를 건드리지 않는다. */
(function (root) {
  'use strict';
  const T = root.SulsulTravel = root.SulsulTravel || {};
  const $ = id => document.getElementById(id);

  let currentDrilldownMetric = null;

  const DRILLDOWN_META = Object.freeze({
    trips: { icon: '✈️', title: '총 여정 상세 목록' },
    countries: { icon: '🌎', title: '방문 국가별 아카이브' },
    cities: { icon: '🏙️', title: '방문 도시별 목록' },
    days: { icon: '📅', title: '여정별 체류 일수 랭킹' },
    expenses: { icon: '💰', title: '여정별 누적 지출 랭킹' },
    diaries: { icon: '📖', title: '여정별 기록 일기 목록' }
  });

  function tripCountries(trip) {
    if (Array.isArray(trip?.countries) && trip.countries.length > 0) return trip.countries.filter(Boolean);
    return trip?.country ? [trip.country] : [];
  }

  function tripDurationDays(trip) {
    let dur = Number(trip?.durationDays) || (Array.isArray(trip?.days) ? trip.days.length : 0);
    if (!dur && trip?.startDate && trip?.endDate) {
      const diff = Math.ceil((new Date(trip.endDate) - new Date(trip.startDate)) / 86400000) + 1;
      if (Number.isFinite(diff)) dur = Math.max(1, diff);
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
    const explicit = Number(trip?.budgetKrw);
    if (Number.isFinite(explicit) && explicit > 0) return Math.round(explicit);
    const raw = Number(trip?.budget);
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    const curr = (trip?.currency && CURRENCY_INFO[trip.currency]) ? trip.currency : 'KRW';
    if (curr === 'KRW') return Math.round(raw);
    const rate = getCurrencyRate(curr);
    return Number.isFinite(rate) && rate > 0 ? Math.round(raw * rate) : Math.round(raw);
  }

  function tripStage(trip) {
    const stage = T.TripAdapter.resolveTripStage(trip);
    return ['ongoing', 'planned', 'completed', 'bucketlist'].includes(stage) ? stage : 'planned';
  }

  function stageLabel(stage) {
    if (stage === 'ongoing') return '여행중';
    if (stage === 'completed') return '완료';
    if (stage === 'bucketlist') return '버킷';
    return '예정';
  }

  function stageBadgeClass(stage) {
    if (stage === 'ongoing') return 'px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30';
    if (stage === 'completed') return 'px-1.5 py-0.5 rounded text-[10px] font-bold bg-stone-500/15 text-stone-700 dark:text-stone-300 border border-stone-500/30';
    if (stage === 'bucketlist') return 'px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30';
    return 'px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30';
  }

  function stageInlineClass(stage) {
    if (stage === 'ongoing') return 'text-emerald-500 font-bold text-[10px]';
    if (stage === 'completed') return 'text-stone-400 font-bold text-[10px]';
    if (stage === 'bucketlist') return 'text-amber-500 font-bold text-[10px]';
    return 'text-sky-500 font-bold text-[10px]';
  }

  function rankLabel(idx) {
    if (idx === 0) return '🥇 1위';
    if (idx === 1) return '🥈 2위';
    if (idx === 2) return '🥉 3위';
    return `${idx + 1}위`;
  }

  function formatManwon(krw) {
    return `${Math.round(krw / 10000).toLocaleString()}만`;
  }

  function switchTabPanel(tab) {
    const btnLifetime = $('btn-tab-stat-lifetime');
    const btnWorkspace = $('btn-tab-stat-workspace');
    const panelLifetime = $('stat-panel-lifetime');
    const panelWorkspace = $('stat-panel-workspace');

    const activeClass = 'flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm bg-white dark:bg-[#16181d] text-[#1c1917] dark:text-white cursor-pointer';
    const inactiveClass = 'flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 text-stone-500 hover:text-stone-800 dark:hover:text-stone-300 cursor-pointer';

    if (tab === 'workspace') {
      if (btnWorkspace) btnWorkspace.className = activeClass;
      if (btnLifetime) btnLifetime.className = inactiveClass;
      if (panelWorkspace) panelWorkspace.classList.remove('hidden');
      if (panelLifetime) panelLifetime.classList.add('hidden');
    } else {
      if (btnLifetime) btnLifetime.className = activeClass;
      if (btnWorkspace) btnWorkspace.className = inactiveClass;
      if (panelLifetime) panelLifetime.classList.remove('hidden');
      if (panelWorkspace) panelWorkspace.classList.add('hidden');
    }
  }

  function open(defaultTab) {
    render();
    const activeTrip = getActiveTrip();
    const tabWsTitle = $('tab-stat-ws-title');
    if (tabWsTitle) {
      tabWsTitle.textContent = activeTrip ? `${String(activeTrip.title || '').slice(0, 10)}... 분석` : '현재 여정 분석';
    }
    switchTabPanel(defaultTab || 'lifetime');
    openModal('modal-analytics');
  }

  function openTrip(tripId, targetTab) {
    if (!tripId) return;
    closeModal('modal-analytics', true);
    openTripWorkspace(tripId);
    if (targetTab) switchTab(targetTab);
  }

  function syncCardExpanded(activeMetric) {
    document.querySelectorAll('.stat-lt-card').forEach(el => {
      const isSelected = Boolean(activeMetric) && el.dataset.metric === activeMetric;
      el.classList.toggle('ring-2', isSelected);
      el.classList.toggle('ring-amber-500', isSelected);
      el.classList.toggle('bg-amber-500/10', isSelected);
      el.classList.toggle('dark:bg-amber-500/15', isSelected);
      el.setAttribute('aria-expanded', String(isSelected));
    });
  }

  function closeDrilldown() {
    currentDrilldownMetric = null;
    const container = $('stat-drilldown-container');
    if (container) container.classList.add('hidden');
    syncCardExpanded(null);
  }

  function toggleDrilldown(metric) {
    if (!Object.prototype.hasOwnProperty.call(DRILLDOWN_META, metric)) {
      closeDrilldown();
      return;
    }
    if (currentDrilldownMetric === metric) {
      closeDrilldown();
      return;
    }
    currentDrilldownMetric = metric;
    renderDrilldown(metric);
  }

  function render() {
    const trips = State.trips || [];
    const totalTrips = trips.length;
    let totalDays = 0;
    let totalExpensesKrw = 0;
    let totalDiaries = 0;
    const countriesMap = {};
    const citiesSet = new Set();
    const conceptsMap = {};
    const statusCounts = { ongoing: 0, planned: 0, completed: 0, bucketlist: 0 };

    trips.forEach(t => {
      totalDays += tripDurationDays(t);
      tripCountries(t).forEach(c => {
        countriesMap[c] = (countriesMap[c] || 0) + 1;
      });
      (t.cities || []).forEach(ct => { if (ct) citiesSet.add(ct); });
      (t.concepts || []).forEach(cp => {
        if (cp) conceptsMap[cp] = (conceptsMap[cp] || 0) + 1;
      });

      const st = tripStage(t);
      statusCounts[st]++;

      totalExpensesKrw += tripSpentKrw(t);

      // 세 종류 기록을 공통 기록 모델로 센다. 빈 항목은 기록이 아니다.
      totalDiaries += T.TravelRecords.summary(t).count + (!t.journals && Array.isArray(t.diaries) ? t.diaries.length : 0);
    });

    const ltTripsEl = $('stat-lt-trips');
    if (ltTripsEl) ltTripsEl.textContent = `${totalTrips}개`;
    const ltCountriesEl = $('stat-lt-countries');
    if (ltCountriesEl) ltCountriesEl.textContent = `${Object.keys(countriesMap).length}개국`;
    const ltCitiesEl = $('stat-lt-cities');
    if (ltCitiesEl) ltCitiesEl.textContent = `${citiesSet.size}개`;
    const ltDaysEl = $('stat-lt-days');
    if (ltDaysEl) ltDaysEl.textContent = `${totalDays}일`;

    const expStr = totalExpensesKrw >= 1000000
      ? `₩${formatManwon(totalExpensesKrw)}`
      : `₩${totalExpensesKrw.toLocaleString()}`;
    const ltExpensesEl = $('stat-lt-expenses');
    if (ltExpensesEl) ltExpensesEl.textContent = expStr;
    const ltDiariesEl = $('stat-lt-diaries');
    if (ltDiariesEl) ltDiariesEl.textContent = `${totalDiaries}편`;
    const badgeCountEl = $('badge-trips-count');
    if (badgeCountEl) badgeCountEl.textContent = String(totalTrips);

    // 1. 여정 상태별 시각적 세그먼트 프로그레스 바 & 범례
    const statusBar = $('stat-lt-status-bar');
    const statusLegend = $('stat-lt-status-legend');
    const statusRatioTxt = $('stat-lt-status-ratio-txt');
    if (statusBar && statusLegend) {
      if (totalTrips === 0) {
        statusBar.innerHTML = '<div class="w-full h-full bg-stone-200 dark:bg-stone-700"></div>';
        statusLegend.innerHTML = '<span class="text-stone-400 font-normal">등록된 여정이 없습니다.</span>';
        if (statusRatioTxt) statusRatioTxt.textContent = '0%';
      } else {
        const pctOngoing = Math.round((statusCounts.ongoing / totalTrips) * 100);
        const pctPlanned = Math.round((statusCounts.planned / totalTrips) * 100);
        const pctCompleted = Math.round((statusCounts.completed / totalTrips) * 100);
        const pctBucket = Math.max(0, 100 - pctOngoing - pctPlanned - pctCompleted);

        statusBar.innerHTML = [
          statusCounts.ongoing > 0 ? `<div style="width:${Number(pctOngoing)}%" class="h-full bg-emerald-500" title="진행중: ${Number(statusCounts.ongoing)}개 (${Number(pctOngoing)}%)"></div>` : '',
          statusCounts.planned > 0 ? `<div style="width:${Number(pctPlanned)}%" class="h-full bg-sky-500" title="예정: ${Number(statusCounts.planned)}개 (${Number(pctPlanned)}%)"></div>` : '',
          statusCounts.completed > 0 ? `<div style="width:${Number(pctCompleted)}%" class="h-full bg-indigo-500" title="완료: ${Number(statusCounts.completed)}개 (${Number(pctCompleted)}%)"></div>` : '',
          statusCounts.bucketlist > 0 ? `<div style="width:${Number(pctBucket)}%" class="h-full bg-amber-500" title="버킷리스트: ${Number(statusCounts.bucketlist)}개 (${Number(pctBucket)}%)"></div>` : ''
        ].join('');

        statusLegend.innerHTML = `
          <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> 진행중 ${Number(statusCounts.ongoing)}</span>
          <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20"><span class="w-2 h-2 rounded-full bg-sky-500"></span> 예정 ${Number(statusCounts.planned)}</span>
          <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20"><span class="w-2 h-2 rounded-full bg-indigo-500"></span> 완료 ${Number(statusCounts.completed)}</span>
          <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"><span class="w-2 h-2 rounded-full bg-amber-500"></span> 버킷 ${Number(statusCounts.bucketlist)}</span>
        `;
        if (statusRatioTxt) statusRatioTxt.textContent = `총 ${totalTrips}개 여정`;
      }
    }

    // 2. 발자취를 남긴 국가 칩 그리드
    const countriesGrid = $('stat-lt-countries-grid');
    const countriesSummary = $('stat-lt-countries-summary');
    if (countriesGrid) {
      const cEntries = Object.entries(countriesMap).sort((a, b) => b[1] - a[1]);
      if (cEntries.length === 0) {
        countriesGrid.innerHTML = '<span class="text-xs text-stone-400">아직 등록된 방문 국가가 없습니다.</span>';
        if (countriesSummary) countriesSummary.textContent = '0개국';
      } else {
        if (countriesSummary) countriesSummary.textContent = `총 ${cEntries.length}개국 발자취`;
        countriesGrid.innerHTML = cEntries.map(([countryName, cnt]) => {
          const cInfo = resolveCountryInfo(countryName);
          const flag = cInfo ? cInfo.flag : '🌎';
          return `
            <button type="button" data-on-click="routeMap.focusCountry" data-country="${escapeHtml(countryName)}" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#faf8f5] dark:bg-[#121316] hover:bg-amber-500/10 hover:border-amber-500/40 border border-[#e8e2d5] dark:border-stone-800 text-xs font-bold text-[#44403c] dark:text-stone-200 shadow-xs cursor-pointer transition" title="${escapeHtml(countryName)} 발자취 노선도 확인">
              <span>${escapeHtml(flag)}</span>
              <span>${escapeHtml(countryName)}</span>
              <span class="px-1.5 py-0.2 rounded-full bg-amber-500/15 text-[#a2601b] dark:text-amber-300 text-[10px] font-mono">${Number(cnt)}회</span>
              <i class="fa-solid fa-arrow-up-right-from-square text-[9px] opacity-60 text-amber-600 dark:text-amber-400"></i>
            </button>
          `;
        }).join('');
      }
    }

    // 3. 등록된 여행 종합 비교 요약표
    const tripsTbody = $('stat-lt-trips-tbody');
    if (tripsTbody) {
      if (trips.length === 0) {
        tripsTbody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-stone-400">등록된 여행이 없습니다.</td></tr>';
      } else {
        const sortedTrips = [...trips].sort(compareTripsLatestFirst);
        tripsTbody.innerHTML = sortedTrips.map(t => {
          const days = tripDurationDays(t);
          const sDate = String(t.startDate || '');
          const eDate = String(t.endDate || '');
          const dates = (sDate && eDate) ? `${sDate.slice(5)} ~ ${eDate.slice(5)}` : (sDate ? `${sDate.slice(5)}~` : '-');
          const place = tripCountries(t).join(', ') || '-';
          const budget = tripBudgetKrw(t);
          const spent = tripSpentKrw(t);
          const spentPct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
          const stage = tripStage(t);
          return `
            <tr data-on-click="lifetimeAnalytics.openTrip" data-trip-id="${escapeHtml(t.id)}" class="hover:bg-amber-500/10 dark:hover:bg-amber-500/15 transition cursor-pointer" title="${escapeHtml(t.title)} 여정 열기">
              <td class="py-2 px-2 font-bold text-[#1c1917] dark:text-[#ededed] max-w-[120px] truncate" title="${escapeHtml(t.title)}">
                ${escapeHtml(t.title)}
              </td>
              <td class="py-2 px-2 text-[#78716c] dark:text-stone-400 whitespace-nowrap">
                <div>${escapeHtml(dates)}</div>
                <div class="text-[10px] text-amber-600 dark:text-amber-400 font-bold">${Number(days)}일간</div>
              </td>
              <td class="py-2 px-2 text-[#44403c] dark:text-stone-300 max-w-[90px] truncate" title="${escapeHtml(place)}">
                ${escapeHtml(place)}
              </td>
              <td class="py-2 px-2 text-right whitespace-nowrap">
                <div class="font-mono font-bold text-[#1c1917] dark:text-stone-200">₩${escapeHtml(formatManwon(spent))} <span class="text-stone-400 font-normal">/ ₩${escapeHtml(formatManwon(budget))}</span></div>
                <div class="w-16 ml-auto bg-stone-200 dark:bg-stone-700 rounded-full h-1 mt-1 overflow-hidden">
                  <div class="bg-amber-500 h-full rounded-full" style="width:${Number(spentPct)}%"></div>
                </div>
              </td>
              <td class="py-2 px-2 text-center whitespace-nowrap">
                <span class="${escapeHtml(stageBadgeClass(stage))}">${escapeHtml(stageLabel(stage))}</span>
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    // 4. 선호하는 여행 테마 및 컨셉 태그
    const conceptsGrid = $('stat-lt-concepts-grid');
    if (conceptsGrid) {
      const cpEntries = Object.entries(conceptsMap).sort((a, b) => b[1] - a[1]);
      if (cpEntries.length === 0) {
        conceptsGrid.innerHTML = '<span class="text-xs text-stone-400">등록된 여행 컨셉 태그가 없습니다.</span>';
      } else {
        conceptsGrid.innerHTML = cpEntries.map(([cp, cnt]) => `
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 text-[#a2601b] dark:text-amber-300 border border-amber-500/20 text-xs font-bold shadow-xs">
            <span>#${escapeHtml(cp)}</span>
            <span class="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-[10px] font-mono">${Number(cnt)}개</span>
          </span>
        `).join('');
      }
    }

    if (currentDrilldownMetric) {
      renderDrilldown(currentDrilldownMetric);
    }
  }

  function renderDrilldown(metric) {
    const container = $('stat-drilldown-container');
    const iconEl = $('stat-drilldown-icon');
    const titleEl = $('stat-drilldown-title');
    const badgeEl = $('stat-drilldown-badge');
    const contentEl = $('stat-drilldown-content');
    if (!container || !contentEl) return;
    if (!Object.prototype.hasOwnProperty.call(DRILLDOWN_META, metric)) {
      closeDrilldown();
      return;
    }

    const trips = State.trips || [];
    syncCardExpanded(metric);
    container.classList.remove('hidden');

    const mInfo = DRILLDOWN_META[metric];
    if (iconEl) iconEl.textContent = mInfo.icon;
    if (titleEl) titleEl.textContent = mInfo.title;

    if (metric === 'trips') {
      if (badgeEl) badgeEl.textContent = `${trips.length}개 여정`;
      if (trips.length === 0) {
        contentEl.innerHTML = '<div class="text-xs text-stone-400 py-3 text-center">등록된 여정이 없습니다.</div>';
        return;
      }
      const sortedTrips = [...trips].sort(compareTripsLatestFirst);
      contentEl.innerHTML = sortedTrips.map((t, idx) => {
        const days = tripDurationDays(t);
        const dates = (t.startDate && t.endDate) ? `${t.startDate} ~ ${t.endDate}` : (t.startDate || '일정 미정');
        const countries = tripCountries(t).join(', ') || '-';
        const budget = tripBudgetKrw(t);
        const spent = tripSpentKrw(t);
        const stage = tripStage(t);
        return `
          <div data-on-click="lifetimeAnalytics.openTrip" data-trip-id="${escapeHtml(t.id)}" class="p-2.5 rounded-xl bg-white dark:bg-[#181a20] border border-[#e8e2d5] dark:border-stone-800 hover:border-amber-500/50 hover:bg-amber-500/5 transition cursor-pointer flex items-center justify-between gap-2 shadow-xs group">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5">
                <span class="w-5 h-5 rounded-md bg-stone-100 dark:bg-stone-800 text-[10px] font-black flex items-center justify-center text-stone-600 dark:text-stone-300 font-mono">${Number(idx + 1)}</span>
                <span class="text-xs font-black text-[#1c1917] dark:text-[#ededed] truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">${escapeHtml(t.title)}</span>
                <span class="${escapeHtml(stageInlineClass(stage))}">${escapeHtml(stageLabel(stage))}</span>
              </div>
              <div class="text-[10px] text-[#78716c] dark:text-stone-400 mt-1 flex items-center gap-2 flex-wrap">
                <span>📅 ${escapeHtml(dates)} (${Number(days)}일간)</span>
                <span>📍 ${escapeHtml(countries)}</span>
              </div>
            </div>
            <div class="text-right shrink-0">
              <div class="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">₩${escapeHtml(spent.toLocaleString())}</div>
              <div class="text-[10px] text-stone-400">목표 ₩${escapeHtml(formatManwon(budget))}</div>
            </div>
          </div>
        `;
      }).join('');
      return;
    }

    if (metric === 'countries') {
      const countryMap = {};
      trips.forEach(t => {
        tripCountries(t).forEach(c => {
          if (!countryMap[c]) countryMap[c] = { count: 0, trips: [] };
          countryMap[c].count++;
          if (!countryMap[c].trips.includes(t.title)) countryMap[c].trips.push(t.title);
        });
      });
      const entries = Object.entries(countryMap).sort((a, b) => b[1].count - a[1].count);
      if (badgeEl) badgeEl.textContent = `${entries.length}개국`;
      if (entries.length === 0) {
        contentEl.innerHTML = '<div class="text-xs text-stone-400 py-3 text-center">방문 국가 데이터가 없습니다.</div>';
        return;
      }
      contentEl.innerHTML = entries.map(([countryName, info]) => {
        const cInfo = resolveCountryInfo(countryName);
        const flag = cInfo ? cInfo.flag : '🌎';
        return `
          <div class="p-2.5 rounded-xl bg-white dark:bg-[#181a20] border border-[#e8e2d5] dark:border-stone-800 flex items-center justify-between gap-2 shadow-xs">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="text-base">${escapeHtml(flag)}</span>
                <span class="text-xs font-black text-[#1c1917] dark:text-[#ededed]">${escapeHtml(countryName)}</span>
                <span class="px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono font-bold">${Number(info.count)}회 방문</span>
              </div>
              <div class="text-[10px] text-[#78716c] dark:text-stone-400 mt-1 truncate">
                관련 여정: ${escapeHtml(info.trips.join(' · '))}
              </div>
            </div>
            <button type="button" data-on-click="routeMap.focusCountry" data-country="${escapeHtml(countryName)}" class="px-2.5 py-1 rounded-lg btn-gold text-[10px] font-bold shrink-0 shadow-xs cursor-pointer flex items-center gap-1">
              <i class="fa-solid fa-map-location-dot"></i>
              <span>노선도</span>
            </button>
          </div>
        `;
      }).join('');
      return;
    }

    if (metric === 'cities') {
      const cityMap = {};
      trips.forEach(t => {
        const fallbackCountry = tripCountries(t)[0] || '';
        (t.cities || []).forEach(ct => {
          if (!ct) return;
          if (!cityMap[ct]) cityMap[ct] = { count: 0, country: fallbackCountry, trips: [] };
          cityMap[ct].count++;
          if (!cityMap[ct].trips.includes(t.title)) cityMap[ct].trips.push(t.title);
        });
      });
      const entries = Object.entries(cityMap).sort((a, b) => b[1].count - a[1].count);
      if (badgeEl) badgeEl.textContent = `${entries.length}개 도시`;
      if (entries.length === 0) {
        contentEl.innerHTML = '<div class="text-xs text-stone-400 py-3 text-center">방문 도시 데이터가 없습니다.</div>';
        return;
      }
      contentEl.innerHTML = entries.map(([cityName, info]) => {
        const flag = info.country ? (resolveCountryInfo(info.country)?.flag || '📍') : '📍';
        return `
          <div class="p-2.5 rounded-xl bg-white dark:bg-[#181a20] border border-[#e8e2d5] dark:border-stone-800 flex items-center justify-between gap-2 shadow-xs">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5">
                <span class="text-xs">${escapeHtml(flag)}</span>
                <span class="text-xs font-black text-[#1c1917] dark:text-[#ededed]">${escapeHtml(cityName)}</span>
                <span class="text-[10px] text-stone-400">(${escapeHtml(info.country || '거점')})</span>
              </div>
              <div class="text-[9px] text-[#78716c] dark:text-stone-400 truncate mt-0.5">
                ${escapeHtml(info.trips.join(' · '))}
              </div>
            </div>
            <span class="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 text-[10px] font-mono font-bold shrink-0">${Number(info.count)}회</span>
          </div>
        `;
      }).join('');
      return;
    }

    if (metric === 'days') {
      let totalDays = 0;
      const tripDays = trips.map(t => {
        const days = tripDurationDays(t);
        totalDays += days;
        return { trip: t, days };
      }).sort((a, b) => b.days - a.days);

      if (badgeEl) badgeEl.textContent = `총 ${totalDays}일 누적`;
      if (tripDays.length === 0 || totalDays === 0) {
        contentEl.innerHTML = '<div class="text-xs text-stone-400 py-3 text-center">등록된 일정 일수가 없습니다.</div>';
        return;
      }
      contentEl.innerHTML = tripDays.map((item, idx) => {
        const pct = totalDays > 0 ? Number(((item.days / totalDays) * 100).toFixed(1)) : 0;
        return `
          <div data-on-click="lifetimeAnalytics.openTrip" data-trip-id="${escapeHtml(item.trip.id)}" class="p-2.5 rounded-xl bg-white dark:bg-[#181a20] border border-[#e8e2d5] dark:border-stone-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition cursor-pointer space-y-1.5 shadow-xs group">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-[10px] font-black font-mono text-indigo-600 dark:text-indigo-400">${escapeHtml(rankLabel(idx))}</span>
                <span class="text-xs font-black text-[#1c1917] dark:text-[#ededed] truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">${escapeHtml(item.trip.title)}</span>
              </div>
              <div class="text-right shrink-0">
                <span class="text-xs font-mono font-black text-indigo-600 dark:text-indigo-400">${Number(item.days)}일간</span>
                <span class="text-[10px] text-stone-400 font-mono">(${Number(pct)}%)</span>
              </div>
            </div>
            <div class="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-1.5 overflow-hidden">
              <div class="bg-indigo-500 h-full rounded-full transition-all duration-300" style="width: ${Number(pct)}%"></div>
            </div>
          </div>
        `;
      }).join('');
      return;
    }

    if (metric === 'expenses') {
      let totalExpenses = 0;
      const tripExpenses = trips.map(t => {
        const spent = tripSpentKrw(t);
        totalExpenses += spent;
        return { trip: t, spent, budget: tripBudgetKrw(t) };
      }).sort((a, b) => b.spent - a.spent);

      const expStr = totalExpenses >= 1000000
        ? `₩${formatManwon(totalExpenses)}원`
        : `₩${totalExpenses.toLocaleString()}`;
      if (badgeEl) badgeEl.textContent = `총 ${expStr}`;
      if (tripExpenses.length === 0) {
        contentEl.innerHTML = '<div class="text-xs text-stone-400 py-3 text-center">등록된 지출 데이터가 없습니다.</div>';
        return;
      }
      contentEl.innerHTML = tripExpenses.map((item, idx) => {
        const spentPct = item.budget > 0 ? Math.min(100, Math.round((item.spent / item.budget) * 100)) : 0;
        return `
          <div class="p-2.5 rounded-xl bg-white dark:bg-[#181a20] border border-[#e8e2d5] dark:border-stone-800 space-y-1.5 shadow-xs">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-[10px] font-black font-mono text-rose-600 dark:text-rose-400">${escapeHtml(rankLabel(idx))}</span>
                <span class="text-xs font-black text-[#1c1917] dark:text-[#ededed] truncate">${escapeHtml(item.trip.title)}</span>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <span class="text-xs font-mono font-black text-rose-600 dark:text-rose-400">₩${escapeHtml(item.spent.toLocaleString())}</span>
                <button type="button" data-on-click="lifetimeAnalytics.openTrip" data-trip-id="${escapeHtml(item.trip.id)}" data-tab="expenses" class="px-2 py-0.5 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-[#a2601b] dark:text-amber-300 text-[10px] font-bold transition cursor-pointer" title="가계부로 이동">
                  가계부 ➔
                </button>
              </div>
            </div>
            <div class="flex items-center justify-between text-[10px] text-stone-400 font-mono">
              <span>목표 ₩${escapeHtml(formatManwon(item.budget))}원</span>
              <span>소진율 ${Number(spentPct)}%</span>
            </div>
            <div class="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-1.5 overflow-hidden">
              <div class="bg-rose-500 h-full rounded-full transition-all duration-300" style="width: ${Number(spentPct)}%"></div>
            </div>
          </div>
        `;
      }).join('');
      return;
    }

    if (metric === 'diaries') {
      let totalDiaries = 0;
      const tripDiaries = trips.map(t => {
        // 통계 카드와 같은 기록 모델에서 날짜순으로 보여 준다(하루 회고·일정 기록·순간 기록).
        const recordSummary = T.TravelRecords.summary(t);
        const legacyDiaries = !t.journals && Array.isArray(t.diaries) ? t.diaries : [];
        const entries = [
          ...T.TravelRecords.chronological(recordSummary.records).map(record => ({
            label: `${record.occurredDate || '날짜 미상'} · ${T.TravelRecords.KIND_LABELS[record.kind]}`,
            title: (record.text || record.originalText || '').slice(0, 30) || (record.photoCount ? `사진 ${record.photoCount}장` : '기록')
          })),
          ...legacyDiaries.map((d, i) => ({
            label: d.date || `Day ${i + 1}`,
            title: d.title || d.content?.slice(0, 30) || '일기 기록'
          }))
        ];
        const count = entries.length;
        totalDiaries += count;
        return { trip: t, count, entries };
      }).sort((a, b) => b.count - a.count);

      if (badgeEl) badgeEl.textContent = `총 ${totalDiaries}편`;
      if (totalDiaries === 0) {
        contentEl.innerHTML = '<div class="text-xs text-stone-400 py-3 text-center">작성된 여행 일기/기록이 아직 없습니다.</div>';
        return;
      }
      contentEl.innerHTML = tripDiaries.map(item => [
        '<div class="p-2.5 rounded-xl bg-white dark:bg-[#181a20] border border-[#e8e2d5] dark:border-stone-800 space-y-1 shadow-xs">',
        `<div class="flex items-center justify-between gap-2"><span class="text-xs font-black text-[#1c1917] dark:text-[#ededed] truncate">${escapeHtml(item.trip.title)}</span><div class="flex items-center gap-1.5 shrink-0"><span class="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 text-[10px] font-bold font-mono">${Number(item.count)}편</span><button type="button" data-on-click="lifetimeAnalytics.openTrip" data-trip-id="${escapeHtml(item.trip.id)}" data-tab="journal" class="px-2 py-0.5 rounded-md bg-purple-500/15 hover:bg-purple-500/25 text-purple-700 dark:text-purple-300 text-[10px] font-bold transition cursor-pointer" title="다이어리로 이동">다이어리 ➔</button></div></div>`,
        item.entries.length
          ? '<div class="pl-1 pt-1 border-t border-stone-100 dark:border-stone-800/60">' +
            item.entries.slice(0, 3).map(entry => `<div class="text-[10px] text-[#78716c] dark:text-stone-400 truncate">• <span class="font-mono">${escapeHtml(entry.label)}</span>: ${escapeHtml(entry.title)}</div>`).join('') +
            '</div>'
          : '',
        '</div>'
      ].join('')).join('');
    }
  }

  T.UiActions.define('lifetimeAnalytics', {
    open: element => open(element.dataset.tab || 'lifetime'),
    drilldown: element => toggleDrilldown(element.dataset.metric),
    closeDrilldown: () => closeDrilldown(),
    openTrip: element => openTrip(element.dataset.tripId, element.dataset.tab || ''),
    goWorkspaceExpenses: () => { closeModal('modal-analytics', true); switchTab('expenses'); },
    goWorkspaceMap: () => { closeModal('modal-analytics', true); navigateToInteractiveMap(); },
    goWorkspaceReport: () => { closeModal('modal-analytics', true); T.ReportUI.openModal(); }
  });

  T.LifetimeAnalytics = Object.freeze({
    open,
    switchTab: switchTabPanel,
    render,
    toggleDrilldown,
    closeDrilldown,
    renderDrilldown,
    openTrip,
    tripBudgetKrw
  });
})(typeof window !== 'undefined' ? window : globalThis);
