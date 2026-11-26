/* 큰 계획 카드·계획 블록 상세·일정 서브탭 전환(v2.1.8, 계획 4단계).
 * index.html과 companion-ui.js에 흩어져 있던 큰 계획 구조 해석·편집 모달·구간 상세 열기/닫기·
 * 계획 보기 방식(거점별 여정/전체 시간표/지도·가이드)·4대 서브탭 전환을 한 모듈로 모은다.
 * 셸 함수와 전역 State는 부를 때 찾고, 파일을 불러올 때는 문서에 손대지 않고 동작만 등록한다. */
(function (root) {
  'use strict';
  const T = root.SulsulTravel = root.SulsulTravel || {};
  const $ = id => document.getElementById(id);

  const STATUS_LABELS = Object.freeze({
    draft: '초안',
    review: '함께 검토 중',
    confirmed: '확정',
    completed: '여행 완료'
  });

  const VALID_SUBTABS = Object.freeze(['timeline', 'map', 'booking', 'cityguide']);

  const KNOWN_PLACES = Object.freeze([
    [/귀국|일상 복귀|한국 공항 도착|인천공항.*도착/, '귀로'],
    [/리우|리오|rio|코파카바나|이파네마|코르코바두|슈가로프/, '리우데자네이루'],
    [/이과수|iguazu|악마의 목구멍/, '이과수'],
    [/부에노스|buenos|레콜레타|팔레르모|카미니토/, '부에노스아이레스'],
    [/쿠스코|마추픽추|machu|cusco|성스러운 계곡|아구아스 칼리엔테스/, '쿠스코·마추픽추'],
    [/파라카스|와카치나|huacachina|paracas|이카\b/, '파라카스·와카치나'],
    [/리마|lima/, '리마'],
    [/로스앤젤레스|los angeles|\bla\b|산타모니카|할리우드/, '로스앤젤레스'],
    [/샹그릴라|shangri|송찬림사|보달랍궁/, '샹그릴라'],
    [/호도협|tiger leaping/, '호도협'],
    [/리장|여강|옥룡설산|수허고진|lijiang/, '리장·옥룡설산'],
    [/따리|대리|얼하이|dali|erhai/, '따리·얼하이'],
    [/쿤밍|곤명|석림|kunming|stone forest/, '쿤밍·석림'],
    [/타이베이|taipei|지우펀|스펀/, '타이베이·근교'],
    [/가오슝|kaohsiung/, '가오슝'],
    [/타이중|taichung/, '타이중'],
    [/세부|cebu|막탄/, '세부·막탄'],
    [/보홀|bohol/, '보홀']
  ]);

  let savingEdit = false;

  function inferPlace(day) {
    if (!day) return '여정 전반';
    if (day.blockPlace) return day.blockPlace;
    if (day.hub) return day.hub;
    if (day.hubName) return day.hubName;
    if (day.city && !['여정 전반', '도시', '여행지'].includes(day.city)) {
      const explicitCity = String(day.city)
        .split(/[→➔]/).pop()
        .split('·')[0]
        .replace(/\([^)]*\)/g, '')
        .trim();
      if (explicitCity && explicitCity.length >= 2) return explicitCity;
    }
    const sources = [day.loc, day.cityName, day.city, day.route, day.title]
      .filter(Boolean)
      .map(value => String(value).toLowerCase());
    for (const source of sources) {
      const matched = KNOWN_PLACES.find(([pattern]) => pattern.test(source));
      if (matched) return matched[1];
    }
    const explicit = String(day.city || day.cityName || day.loc || day.route || '')
      .split(/[→➔]/).pop()
      .split('·').pop()
      .replace(/\([^)]*\)/g, '')
      .trim();
    return explicit || '여정 전반';
  }

  function ensureStructure(trip) {
    if (!trip?.days?.length) return false;
    let changed = false;
    if (!trip.planBlockMeta || typeof trip.planBlockMeta !== 'object') {
      trip.planBlockMeta = {};
      changed = true;
    }
    let previousPlace = '';
    let previousId = '';
    trip.days.forEach((day, dayIndex) => {
      const place = inferPlace(day);
      if (!day.planBlockId) {
        day.planBlockId = previousId && previousPlace === place
          ? previousId
          : `pb_${String(trip.id || 'trip').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30)}_${dayIndex}`;
        changed = true;
      }
      previousPlace = place;
      previousId = day.planBlockId;
    });
    return changed;
  }

  function buildBlocks(trip) {
    if (!trip?.days?.length) return [];
    ensureStructure(trip);
    const blocks = [];
    trip.days.forEach((day, dayIndex) => {
      const id = day.planBlockId;
      const meta = trip.planBlockMeta?.[id] || {};
      const last = blocks[blocks.length - 1];
      if (last && last.id === id) {
        last.days.push({ day, dayIndex });
        if (!meta.endDate) last.endDate = day.date || last.endDate;
        return;
      }
      blocks.push({
        id,
        place: meta.place || inferPlace(day),
        title: meta.title || '',
        startDate: meta.startDate || day.date || `Day ${dayIndex + 1}`,
        endDate: meta.endDate || day.date || `Day ${dayIndex + 1}`,
        lodging: meta.lodging || '',
        priorities: Array.isArray(meta.priorities) ? meta.priorities : [],
        notes: meta.notes || '',
        status: meta.status || 'draft',
        days: [{ day, dayIndex }]
      });
    });
    return blocks;
  }

  function statusLabel(status) {
    return STATUS_LABELS[status] || '초안';
  }

  function statusClass(status) {
    if (status === 'completed') return 'sulsul-badge-emerald bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 font-bold';
    if (status === 'confirmed') return 'sulsul-badge-sky bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800 font-bold';
    if (status === 'review') return 'sulsul-badge-amber bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 font-bold';
    return 'bg-stone-100 text-stone-700 border-stone-300 dark:bg-white/10 dark:text-white dark:border-white/20 font-bold';
  }

  function setPresentation(mode = 'overview') {
    const panel = $('tab-content-plan');
    if (!panel) return;
    panel.dataset.presentation = mode;
    document.querySelectorAll('[data-plan-presentation]').forEach(button => {
      const selected = mode === 'booking' || mode === 'cityguide' ? 'map' : mode;
      button.setAttribute('aria-pressed', String(button.dataset.planPresentation === selected));
    });
  }

  function switchSubTab(subTabId) {
    const active = VALID_SUBTABS.includes(subTabId) ? subTabId : 'timeline';
    State.planSubTab = active;
    setPresentation(active);
    VALID_SUBTABS.forEach(st => {
      const btn = $(`btn-subtab-${st}`);
      const view = $(`subtab-view-${st}`);
      const isActive = st === active;
      if (btn) {
        btn.className = isActive
          ? 'px-3 py-1.5 rounded-lg text-xs font-bold subtab-active shadow-sm flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer'
          : 'px-3 py-1.5 rounded-lg text-xs font-bold subtab-inactive flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer';
        btn.setAttribute('aria-pressed', String(isActive));
      }
      if (view) view.classList.toggle('hidden', !isActive);
    });

    if (active === 'timeline') T.PlanTimeline.render();
    if (active === 'map') T.PlanMap.render();
    else if (active === 'booking') T.PlanGuides.renderBookings();
    else if (active === 'cityguide') T.PlanGuides.renderCityGuides();
  }

  function openPresentation(mode) {
    if (mode === 'overview') setPresentation(mode);
    else switchSubTab(mode);
  }

  function render() {
    renderCompanionPlan();
  }

  function getActive() {
    const trip = getActiveTrip();
    if (!trip || !State.activePlanBlockId) return null;
    return buildBlocks(trip).find(block => block.id === State.activePlanBlockId) || null;
  }

  function hideDetail({ restoreScroll = true } = {}) {
    const page = $('plan-block-detail-page');
    if (page) {
      page.classList.add('hidden');
      page.classList.remove('flex');
      page.setAttribute('aria-hidden', 'true');
    }
    State.activePlanBlockId = null;
    if (!document.querySelector('.sheet-container:not(.sheet-closed)')) document.body.style.overflow = '';
    if (restoreScroll) requestAnimationFrame(() => window.scrollTo({ top: State.planBlockReturnY || 0, behavior: 'auto' }));
  }

  function renderDetail() {
    const page = $('plan-block-detail-page');
    if (State.activePlanBlockId && !getActive()) {
      if (page && !page.classList.contains('hidden')) hideDetail({ restoreScroll: false });
      return;
    }
    renderCompanionDetail();
  }

  function showDetail(blockId, { pushHistory = true } = {}) {
    const trip = getActiveTrip();
    if (!trip) return;
    const block = buildBlocks(trip).find(item => item.id === blockId);
    if (!block) return;
    State.activePlanBlockId = block.id;
    const page = $('plan-block-detail-page');
    if (!page) return;
    page.classList.remove('hidden');
    page.classList.add('flex');
    page.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    renderDetail();
    $('plan-block-detail-container')?.focus?.();
    if (pushHistory && !T.MobileNavigation?.active && history.state?.stRoute !== 'plan-block') {
      history.pushState({ ...(history.state || {}), stRoute: 'plan-block', tripId: trip.id, blockId: block.id }, '');
    }
  }

  function openBlock(blockIndex) {
    const trip = getActiveTrip();
    if (!trip) return;
    const block = buildBlocks(trip)[blockIndex];
    if (!block) return;
    State.planBlockReturnY = window.scrollY;
    showDetail(block.id);
  }

  function closeDetail() {
    if (T.MobileNavigation?.active) { hideDetail(); return; }
    if (history.state?.stRoute === 'plan-block') history.back();
    else hideDetail();
  }

  function openEditByIndex(blockIndex) {
    if (!requireSharedPlanEdit()) return;
    const trip = getActiveTrip();
    if (!trip) return;
    const block = buildBlocks(trip)[blockIndex];
    if (!block) return;
    State.planBlockReturnY = window.scrollY;
    showDetail(block.id);
    openEdit(block);
  }

  function openActive() {
    const block = getActive();
    if (block) showDetail(block.id, { pushHistory: false });
  }

  function openActiveEdit() {
    const block = getActive();
    if (block) openEdit(block);
  }

  function setStatus(status) {
    const safe = Object.prototype.hasOwnProperty.call(STATUS_LABELS, status) ? status : 'draft';
    const sel = $('plan-block-edit-status');
    if (sel) sel.value = safe;
    const desc = $('plan-block-status-desc');
    if (desc) desc.textContent = `${STATUS_LABELS[safe]} 적용됨`;
    document.querySelectorAll('#plan-block-status-chips .plan-status-pill').forEach(btn => {
      const selected = btn.dataset.status === safe;
      btn.classList.toggle('active', selected);
      btn.setAttribute('aria-pressed', String(selected));
    });
  }

  function syncSingleDayEndDate(value) {
    const endDateInput = $('plan-block-edit-end-date');
    if (endDateInput && endDateInput.disabled) {
      endDateInput.value = value;
    }
  }

  function editFormSnapshot() {
    return JSON.stringify(['title', 'place', 'start-date', 'end-date', 'lodging', 'priorities', 'notes', 'status']
      .map(key => $(`plan-block-edit-${key}`)?.value || ''));
  }

  function openEdit(block) {
    if (!requireSharedPlanEdit()) return;
    const singleDay = block.days.length === 1;
    $('plan-block-edit-id').value = block.id;
    $('plan-block-edit-title').value = block.title || '';
    $('plan-block-edit-place').value = block.place || '';
    $('plan-block-edit-start-date').value = block.startDate || '';
    const endDateInput = $('plan-block-edit-end-date');
    endDateInput.value = singleDay ? (block.startDate || block.endDate || '') : (block.endDate || '');
    endDateInput.disabled = singleDay;
    endDateInput.title = singleDay ? '하루 구간은 시작일과 종료일이 같습니다.' : '';
    $('plan-block-edit-lodging').value = block.lodging || '';
    $('plan-block-edit-priorities').value = block.priorities.join('\n');
    $('plan-block-edit-notes').value = block.notes || '';
    setStatus(block.status || 'draft');
    $('modal-plan-block-edit').dataset.snapshot = editFormSnapshot();
    openModal('modal-plan-block-edit');
  }

  function collectEditForm() {
    const rawStatus = $('plan-block-edit-status')?.value || 'draft';
    return {
      title: $('plan-block-edit-title').value.trim().slice(0, 80),
      place: $('plan-block-edit-place').value.trim().slice(0, 60),
      startDate: $('plan-block-edit-start-date').value.trim().slice(0, 40),
      endDate: $('plan-block-edit-end-date').value.trim().slice(0, 40),
      lodging: $('plan-block-edit-lodging').value.trim().slice(0, 140),
      priorities: $('plan-block-edit-priorities').value.split(/\r?\n/).map(item => item.trim()).filter(Boolean).slice(0, 12),
      notes: $('plan-block-edit-notes').value.trim().slice(0, 600),
      status: Object.prototype.hasOwnProperty.call(STATUS_LABELS, rawStatus) ? rawStatus : 'draft'
    };
  }

  function describeEditChanges(block, form) {
    const changes = [];
    if ((block.title || '') !== form.title) changes.push(`카드 제목: ${form.title || '제목 없음'}`);
    if ((block.place || '') !== form.place) changes.push(`거점: ${form.place}`);
    if ((block.startDate || '') !== form.startDate || (block.endDate || '') !== form.endDate) changes.push(`기간: ${form.startDate || '미정'} ~ ${form.endDate || form.startDate || '미정'}`);
    if ((block.lodging || '') !== form.lodging) changes.push(`숙소/체류: ${form.lodging || '지정 없음'}`);
    if (JSON.stringify(block.priorities || []) !== JSON.stringify(form.priorities)) changes.push(`우선 경험: ${form.priorities.join(', ') || '지정 없음'}`);
    if ((block.notes || '') !== form.notes) changes.push(`위험·예약 메모: ${form.notes || '없음'}`);
    return changes.join('\n') || '저장된 큰 계획 기준으로 동선과 세부 일정을 다시 설계';
  }

  function syncDayDates(block, startDate, endDate) {
    const count = block.days.length;
    if (!count || !startDate) return false;
    if (count === 1) {
      block.days[0].day.date = startDate;
      return true;
    }
    const startDay = /^Day\s*(\d+)$/i.exec(startDate);
    const endDay = /^Day\s*(\d+)$/i.exec(endDate);
    if (startDay && endDay && Number(endDay[1]) - Number(startDay[1]) + 1 === count) {
      block.days.forEach((item, index) => { item.day.date = `Day ${Number(startDay[1]) + index}`; });
      return true;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(startDate) && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      const startMs = Date.parse(`${startDate}T00:00:00Z`);
      const endMs = Date.parse(`${endDate}T00:00:00Z`);
      if (Number.isFinite(startMs) && Number.isFinite(endMs) && Math.round((endMs - startMs) / 86400000) + 1 === count) {
        block.days.forEach((item, index) => { item.day.date = new Date(startMs + index * 86400000).toISOString().slice(0, 10); });
        return true;
      }
    }
    return false;
  }

  async function submitEdit({ regenerate = false } = {}) {
    if (savingEdit) return;
    if (!requireSharedPlanEdit()) return;
    const trip = getActiveTrip();
    const id = $('plan-block-edit-id')?.value;
    const block = buildBlocks(trip).find(item => item.id === id);
    if (!trip || !block) return;
    const form = collectEditForm();
    if (block.days.length === 1) {
      form.endDate = form.startDate;
    }
    if (!form.place) { showToast('거점을 입력해 주세요.'); return; }
    const changeSummary = describeEditChanges(block, form);
    savingEdit = true;
    try {
      // 저장에 실패하면 편집 창과 입력을 그대로 두고 State도 바꾸지 않는다.
      const saved = await commitTrip(trip.id, target => {
        target.planBlockMeta = target.planBlockMeta || {};
        target.planBlockMeta[id] = {
          ...(target.planBlockMeta[id] || {}),
          ...form
        };
        const targetBlock = buildBlocks(target).find(item => item.id === id);
        if (targetBlock) syncDayDates(targetBlock, form.startDate, form.endDate || form.startDate);
        const blockCities = buildBlocks(target).flatMap(item => splitTravelList(item.place)).filter(Boolean);
        if (blockCities.length) target.cities = blockCities.filter((city, index, list) => list.indexOf(city) === index).slice(0, 10);
        if (!target.subtitle || target.subtitle === '자유여행') target.subtitle = form.title || form.place || '사용자 계획';
        if (Array.isArray(target.concepts) && target.concepts.length === 1 && target.concepts[0] === '자유여행') target.concepts = [];
      });
      if (!saved) return;
      closeModal('modal-plan-block-edit', true);
      renderActiveTripWorkspace();
      if (regenerate) {
        await T.ScheduleTuning.startPlanBlockAiRegeneration(id, changeSummary);
      } else {
        showToast('✅ 큰 계획을 저장했습니다. 필요할 때 이 카드만 AI 재생성할 수 있습니다.');
      }
    } finally {
      savingEdit = false;
    }
  }

  function openActiveReplan() {
    const block = getActive();
    if (!block) return;
    const first = block.days[0].dayIndex;
    const last = block.days[block.days.length - 1].dayIndex;
    State.replanReturnBlockId = block.id;
    T.ScheduleTuning.openScheduleTuningModal(first, last);
  }

  function regenerateByIndex(blockIndex) {
    if (!requireSharedPlanEdit()) return;
    const trip = getActiveTrip();
    if (!trip) return;
    const block = buildBlocks(trip)[blockIndex];
    if (!block) return;
    State.planBlockReturnY = window.scrollY;
    showDetail(block.id);
    void T.ScheduleTuning.startPlanBlockAiRegeneration(block.id, '저장된 큰 계획 기준으로 동선과 세부 일정을 다시 설계');
  }

  function openActiveAddSpot() {
    const block = getActive();
    const selection = State.companionDetailSelection;
    if (block) {
      const targetDay = selection?.blockId === block.id && block.days.some(item => item.dayIndex === selection.dayIndex)
        ? selection.dayIndex
        : block.days[0].dayIndex;
      T.ScheduleTuning.openAddSpotToDay(targetDay);
    }
  }

  function openJournal(dayIndex) {
    hideDetail({ restoreScroll: false });
    switchTab('journal');
    T.JournalTab.selectDay(dayIndex);
  }

  T.UiActions.define('planBlocks', {
    presentation: element => openPresentation(element.dataset.planPresentation),
    subtab: element => switchSubTab(element.dataset.subtab),
    open: element => openBlock(Number(element.dataset.blockIndex)),
    closeDetail: () => closeDetail(),
    editByIndex: element => openEditByIndex(Number(element.dataset.blockIndex)),
    editActive: () => openActiveEdit(),
    replanActive: () => openActiveReplan(),
    regenerateByIndex: element => regenerateByIndex(Number(element.dataset.blockIndex)),
    addSpotActive: () => openActiveAddSpot(),
    openJournal: element => openJournal(Number(element.dataset.dayIndex)),
    setStatus: element => setStatus(element.dataset.status),
    syncSingleDayEndDate: element => syncSingleDayEndDate(element.value),
    submitEdit: element => submitEdit({ regenerate: element.dataset.regenerate === 'true' })
  });

  T.PlanBlocks = Object.freeze({
    inferPlace,
    ensureStructure,
    buildBlocks,
    statusLabel,
    statusClass,
    setPresentation,
    openPresentation,
    switchSubTab,
    render,
    getActive,
    renderDetail,
    showDetail,
    openBlock,
    hideDetail,
    closeDetail,
    openEditByIndex,
    openActive,
    openActiveEdit,
    setStatus,
    openEdit,
    editFormSnapshot,
    syncDayDates,
    submitEdit,
    openActiveReplan,
    regenerateByIndex,
    openActiveAddSpot,
    openJournal
  });
})(typeof window !== 'undefined' ? window : globalThis);
