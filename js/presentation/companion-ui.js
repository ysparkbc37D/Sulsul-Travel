/* Presentation adapters. Trip mutations continue through the existing repository actions. */
function companionDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
  return match ? `${Number(match[2])}.${Number(match[3])}` : String(value || '날짜 미정');
}

function setPlanPresentation(mode = 'overview') {
  const panel = document.getElementById('tab-content-plan');
  if (!panel) return;
  panel.dataset.presentation = mode;
  document.querySelectorAll('[data-plan-presentation]').forEach(button => {
    const selected = mode === 'booking' || mode === 'cityguide' ? 'map' : mode;
    button.setAttribute('aria-pressed', String(button.dataset.planPresentation === selected));
  });
}

function openPlanPresentation(mode) {
  if (mode === 'overview') setPlanPresentation(mode);
  else switchPlanSubTab(mode);
}

function renderCompanionPlan() {
  const trip = getActiveTrip();
  const container = document.getElementById('big-plan-container');
  if (!trip || !container) return;
  if (ensurePlanBlockStructure(trip)) saveTrips({ bump: false });
  const blocks = buildPlanBlocks(trip);
  const spots = (trip.days || []).flatMap(day => day.spots || []).filter(spot=>!SulsulTravel.ScheduleChange.retired(spot));
  const hasSpots = spots.length > 0;
  const aiButtonHtml = hasSpots
    ? `<div class="flex items-center gap-2 flex-wrap">
         <button class="companion-button companion-primary" onclick="openScheduleTuningModal('all')" title="전체 일정 재배치, 교통 지연/기상 변수 대응 및 템포 조율"><i class="fa-solid fa-bolt text-amber-400" aria-hidden="true"></i> AI 스마트 일정 튜닝</button>
         <button class="companion-button text-xs opacity-75 hover:opacity-100" onclick="confirmResetAiDraft()" title="여행 설정(국가/도시/기간) 및 초안 편집 스튜디오 열기"><i class="fa-solid fa-pen-to-square" aria-hidden="true"></i> 초안 편집</button>
       </div>`
    : `<button class="companion-button companion-primary" onclick="openModal('modal-ai-trip')" title="여행 기본 정보 기반 최초 AI 일정 초안 생성"><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> AI 초안 만들기</button>`;
  container.innerHTML = `
    <section class="companion-intro">
      <div><p class="companion-eyebrow">PLAN YOUR JOURNEY</p><h3>우리의 큰 계획</h3>
      <p class="companion-muted">머무를 도시를 정하고, 하루의 여행을 채워 보세요.</p></div>
      ${aiButtonHtml}
      <div class="companion-metrics"><span><b>${blocks.length}</b>개 거점</span><span><b>${(trip.days || []).length}</b>일의 여행</span><span><b>${spots.length}</b>개 일정</span></div>
    </section>
    ${blocks.length ? `<div class="companion-route" aria-label="거점 바로가기">${blocks.map((block, index) => `<button onclick="scrollToPlanBlock(${index})" aria-label="${escapeHtml(block.title || block.place)} 거점으로 이동"><span>${String(index + 1).padStart(2, '0')}</span>${escapeHtml(block.title || block.place)}</button>`).join('<i class="fa-solid fa-arrow-right" aria-hidden="true"></i>')}</div>` : ''}
    <div class="companion-section-title"><h3>우리의 여정</h3><span>도시를 눌러 하루 계획 보기</span></div>
    <div class="companion-block-list">${blocks.map((block, index) => {
      const items = block.days.flatMap(item => item.day.spots || []).filter(spot=>!SulsulTravel.ScheduleChange.retired(spot));
      const done = items.filter(spot => spot.completed).length;
      const highlights = (block.priorities.length ? block.priorities : items.filter(spot => !spot.completed).slice(0, 2).map(spot => spot.title));
      const first = block.days[0].dayIndex + 1;
      const last = block.days[block.days.length - 1].dayIndex + 1;
      return `<article class="companion-block" id="companion-block-${index}">
        <button class="companion-block-open" onclick="openPlanBlock(${index})" aria-label="${escapeHtml(block.title || block.place)} 세부 계획 열기">
          <span class="companion-number">${String(index + 1).padStart(2, '0')}</span>
          <span class="companion-block-copy"><span class="companion-block-meta">DAY ${first}${last !== first ? `–${last}` : ''} <span>· ${escapeHtml(companionDate(block.startDate))}${last !== first ? ` – ${escapeHtml(companionDate(block.endDate))}` : ''}</span></span>
            <span class="companion-block-heading">${escapeHtml(block.title || block.place)}</span>
            ${block.title && block.title !== block.place ? `<span class="companion-muted">${escapeHtml(block.place)}</span>` : ''}
            <span class="companion-block-summary">${escapeHtml(highlights.join(' · ') || '아직 빈 하루예요. 첫 일정을 채워 보세요.')}</span>
            <span class="companion-block-bottom"><span class="companion-status">${planBlockStatusLabel(block.status)}</span><span>${block.days.length}일 체류 · ${items.length ? `${done}/${items.length} 완료` : '일정 미정'}</span></span>
          </span><i class="fa-solid fa-chevron-right companion-chevron" aria-hidden="true"></i>
        </button>
        <div class="companion-block-actions"><button onclick="openPlanBlockEditByIndex(${index})"><i class="fa-solid fa-pen" aria-hidden="true"></i> 큰 계획 편집</button><button onclick="regeneratePlanBlockByIndex(${index})"><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> 이 구간 AI 재생성</button></div>
      </article>`;
    }).join('') || '<div class="companion-empty">아직 계획이 없어요. AI와 첫 여정을 만들어 보세요.</div>'}</div>`;
  setPlanPresentation(document.getElementById('tab-content-plan').dataset.presentation || 'overview');
}

function companionDayPicker(days, selected, action) {
  return `<div class="companion-day-picker" aria-label="여행 날짜 선택">${days.map(({day, dayIndex}) => `<button aria-pressed="${dayIndex === selected}" onclick="${action}(${dayIndex})"><span>DAY ${day.dayNum || dayIndex + 1}</span><strong>${escapeHtml(companionDate(day.date))}</strong><small>${escapeHtml(day.city || day.loc || '여행')}</small></button>`).join('')}</div>`;
}

function selectCompanionDetailDay(dayIndex) {
  const block = getActivePlanBlock();
  if (!block?.days.some(item => item.dayIndex === dayIndex)) return;
  State.companionDetailSelection = { blockId: block.id, dayIndex };
  renderPlanBlockDetail();
  document.getElementById('plan-block-detail-scroll').scrollTop = 0;
  document.querySelector('#plan-block-detail-container .companion-day-picker [aria-pressed="true"]')?.focus({preventScroll:true});
}

/* ==========================================================================
   스팟 유형 감지 (숙소 체크인/아웃, 교통/이동, 일반)
   ========================================================================== */
function detectSpotCategoryKind(spot) {
  if (!spot) return { kind: 'normal' };
  const cat = String(spot.cat || '').toLowerCase();
  const text = `${spot.title || ''} ${spot.name || ''} ${spot.desc || ''} ${spot.memo || ''}`.toLowerCase();

  // Lodging check
  const isCheckout = /(체크아웃|checkout|check out)/i.test(text);
  const isLuggage = /(짐\s*맡기|짐\s*보관|코인락커|수하물|luggage|baggage|locker)/i.test(text);
  const isCheckin = (cat === 'lodging' || /(체크인|check-in|check in)/i.test(text)) && !isCheckout;
  const isLodgingGeneral = cat === 'lodging' || /(숙소|호텔|호스텔|리조트|에어비앤비|게스트하우스|hotel|hostel|resort|airbnb)/i.test(text);

  if (isCheckout) return { kind: 'lodging', subType: 'checkout', label: '체크아웃', icon: 'fa-solid fa-suitcase-rolling' };
  if (isCheckin) return { kind: 'lodging', subType: 'checkin', label: '체크인', icon: 'fa-solid fa-key' };
  if (isLuggage) return { kind: 'lodging', subType: 'luggage', label: '짐 보관', icon: 'fa-solid fa-boxes-packing' };
  if (isLodgingGeneral) return { kind: 'lodging', subType: 'stay', label: '숙소', icon: 'fa-solid fa-hotel' };

  // Transit check
  const isFlight = cat === 'flight' || /(비행기|항공|공항|탑승|출국|입국|터미널|flight|airport|airline)/i.test(text);
  const isTrain = cat === 'train' || /(기차|열차|ktx|srt|고속철|신칸센|ave|renfe|유로스타|기차역|역사|station|train)/i.test(text);
  const isBus = cat === 'bus' || /(고속버스|시외버스|터미널|리무진|bus terminal|express bus)/i.test(text);
  const isFerry = cat === 'ferry' || /(페리|여객선|유람선|크루즈|항구|선착장|ferry|port|harbor)/i.test(text);
  const isTransitGeneral = cat === 'transport' || /(도시\s*이동|장거리\s*이동|이동\s*구간)/i.test(text);

  if (isFlight) return { kind: 'transit', subType: 'flight', label: '항공/공항', icon: 'fa-solid fa-plane-departure' };
  if (isTrain) return { kind: 'transit', subType: 'train', label: '열차/기차', icon: 'fa-solid fa-train' };
  if (isBus) return { kind: 'transit', subType: 'bus', label: '고속버스', icon: 'fa-solid fa-bus' };
  if (isFerry) return { kind: 'transit', subType: 'ferry', label: '선박/페리', icon: 'fa-solid fa-ship' };
  if (isTransitGeneral) return { kind: 'transit', subType: 'transit', label: '도시 간 이동', icon: 'fa-solid fa-route' };

  return { kind: 'normal' };
}

function renderCityTransitionBridge(dayIndex) {
  const trip = getActiveTrip();
  if (!trip?.days || dayIndex <= 0) return '';
  const currentDay = trip.days[dayIndex];
  const prevDay = trip.days[dayIndex - 1];
  if (!prevDay?.city || !currentDay?.city || prevDay.city === currentDay.city) return '';

  return `
    <div class="companion-city-bridge" role="region" aria-label="도시 간 이동 안내">
      <div class="city-bridge-icon"><i class="fa-solid fa-plane-departure" aria-hidden="true"></i></div>
      <div class="city-bridge-content">
        <div class="city-bridge-title">
          <span class="city-bridge-name">${escapeHtml(prevDay.city)}</span>
          <i class="fa-solid fa-arrow-right-long text-amber-400" aria-hidden="true"></i>
          <span class="city-bridge-name is-dest">${escapeHtml(currentDay.city)}</span>
          <span class="city-bridge-tag">도시 이동일</span>
        </div>
        <p class="city-bridge-desc">체크아웃 시간 및 도시 간 이동 교통편(항공/기차/버스) 출발 시각을 확인하세요.</p>
      </div>
    </div>
  `;
}

function companionSpot(spot, dayIndex, spotIndex, {today = false} = {}) {
  const status = spot.removed ? '일정에서 제거' : spot.deferred ? '나중에 갈 곳' : spot.completed ? '방문 완료' : spot.cancelled ? '취소' : spot.skipped ? '건너뜀' : spot.fixed ? '고정 일정' : '';
  const spotKind = detectSpotCategoryKind(spot);
  let kindBadge = '';
  let kindClass = '';
  if (spotKind.kind === 'lodging') {
    kindClass = `is-lodging-spot lodging-${spotKind.subType}`;
    kindBadge = `<span class="companion-kind-badge is-lodging is-${spotKind.subType}"><i class="${spotKind.icon}" aria-hidden="true"></i> ${spotKind.label}</span>`;
  } else if (spotKind.kind === 'transit') {
    kindClass = `is-transit-spot transit-${spotKind.subType}`;
    kindBadge = `<span class="companion-kind-badge is-transit is-${spotKind.subType}"><i class="${spotKind.icon}" aria-hidden="true"></i> ${spotKind.label}</span>`;
  }

  const trip = getActiveTrip();
  const day = trip?.days?.[dayIndex];
  const block = trip?.planBlockMeta?.[day?.planBlockId];
  const lodgingText = spot.address || block?.lodging || '';
  const lodgingBanner = (spotKind.kind === 'lodging' && lodgingText)
    ? `<div class="companion-lodging-banner"><i class="fa-solid fa-hotel text-amber-500" aria-hidden="true"></i> <span class="font-bold">숙소 안내:</span> <span>${escapeHtml(lodgingText)}</span></div>`
    : '';

  return `<article data-spot-id="${escapeHtml(spot.id)}" class="companion-spot ${kindClass} ${spot.completed ? 'is-completed' : ''}">
    <div class="companion-spot-header">
      <div class="companion-spot-time"><time>${escapeHtml(spot.time || '시간 미정')}</time>${kindBadge}${status ? `<span class="companion-status">${status}</span>` : ''}</div>
      <details class="companion-spot-more">
        <summary class="companion-spot-more-trigger" aria-label="일정 관리 더보기" title="수정·관리 더보기"><i class="fa-solid fa-ellipsis" aria-hidden="true"></i></summary>
        <div class="companion-spot-edit-actions">
          <button class="companion-button" onclick="openEditSpotModal(${dayIndex},${spotIndex},event)"><i class="fa-solid fa-pen-to-square" aria-hidden="true"></i> 시간·내용 수정</button>
          <button class="companion-button" data-action="change" onclick="openScheduleChange(${dayIndex},${spotIndex},event)"><i class="fa-solid fa-shuffle" aria-hidden="true"></i> ${SulsulTravel.ScheduleChange.retired(spot)?'복구·관리':'취소·대체·지연'}</button>
        </div>
      </details>
    </div>
    <h4>${escapeHtml(spot.title || '새 일정')}</h4>
    ${spot.cancelReason ? `<p class="companion-muted">취소 사유: ${escapeHtml(spot.cancelReason)}</p>` : ''}
    ${lodgingBanner}
    ${spot.desc || spot.memo ? `<p>${escapeHtml(spot.desc || spot.memo)}</p>` : ''}
    ${spot.tip ? `<details class="companion-tip"><summary>여행 팁 보기</summary><p>${escapeHtml(spot.tip)}</p></details>` : ''}
    ${spot.recordId ? activityCardHtml(spot, dayIndex, spotIndex) : ''}
    <div class="companion-spot-actions">
      <button data-action="complete" ${SulsulTravel.ScheduleChange.retired(spot)?'disabled':''} onclick="${today ? 'completeTodaySpot' : 'toggleSpotCompleted'}(${dayIndex},${spotIndex},event)" aria-pressed="${!!spot.completed}"><i class="fa-solid fa-check" aria-hidden="true"></i> ${spot.completed ? '완료 취소' : '완료'}</button>
      <button data-action="record" onclick="openActivityJournal(${dayIndex},${spotIndex},event)"><i class="fa-solid fa-book-open" aria-hidden="true"></i> 기록</button>
      <button data-action="directions" onclick="openCompanionDirections(${dayIndex},${spotIndex})"><i class="fa-solid fa-location-arrow" aria-hidden="true"></i> 길찾기</button>
      <button data-action="taxi" onclick="openTaxiCardModal(${dayIndex},${spotIndex},event)"><i class="fa-solid fa-taxi" aria-hidden="true"></i> 기사님</button>
    </div>
    ${SulsulTravel.LiveItinerary.active(spot)&&!spot.completed?`<div class="live-item-actions" role="group" aria-label="일정 위치와 순서 편집">
      <button data-live-action="before" onclick="openLiveInsert(${dayIndex},${spotIndex},'before')">앞에 추가</button><button data-live-action="after" onclick="openLiveInsert(${dayIndex},${spotIndex},'after')">뒤에 추가</button>
      <button data-live-action="up" onclick="moveLiveItem(${dayIndex},${spotIndex},-1)" aria-label="위로 이동">↑ 위로</button><button data-live-action="down" onclick="moveLiveItem(${dayIndex},${spotIndex},1)" aria-label="아래로 이동">↓ 아래로</button>
      <button data-live-action="move" onclick="openLiveMove(${dayIndex},${spotIndex})">날짜·위치 이동</button><button data-live-action="defer" onclick="deferLiveItem(${dayIndex},${spotIndex})">나중에 갈 곳</button><button data-live-action="remove" onclick="removeLiveItem(${dayIndex},${spotIndex})">일정에서 제거</button></div>`:!SulsulTravel.LiveItinerary.active(spot)?`<button class="companion-button" data-live-action="restore" onclick="restoreLiveItem(${dayIndex},${spotIndex})">일정으로 복구</button>`:''}</article>`;
}

function companionMapQuery(day, spot) {
  const lat=Number(spot?.lat),lng=Number(spot?.lng);
  if (spot?.lat != null && spot?.lng != null && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat)<=90 && Math.abs(lng)<=180 && (lat || lng) && !spot.coordinateFallback) return `${lat},${lng}`;
  return [spot?.city || day?.city || day?.loc,spot?.title || spot?.name].filter(Boolean).join(' ');
}
function openCompanionDirections(dayIndex,spotIndex,originIndex) {
  const day=getActiveTrip()?.days?.[dayIndex],spot=day?.spots?.[spotIndex];if(!spot)return;
  const url=new URL('https://www.google.com/maps/dir/');url.searchParams.set('api','1');url.searchParams.set('destination',companionMapQuery(day,spot));
  if(Number.isInteger(originIndex)&&day.spots[originIndex])url.searchParams.set('origin',companionMapQuery(day,day.spots[originIndex]));
  window.open(url.href,'_blank','noopener,noreferrer');
}
function companionTimeline(items,dayIndex,options={}) {
  const bridgeHtml = renderCityTransitionBridge(dayIndex);
  const itemsHtml = items.map((item,index)=>`<button class="live-between-insert" data-live-action="insert-between" onclick="openLiveInsert(${dayIndex},${item.spotIndex},'before')">+ 여기에 추가</button>${index ? `<button class="companion-transit" onclick="openCompanionDirections(${dayIndex},${item.spotIndex},${items[index-1].spotIndex})"><i class="fa-solid fa-route" aria-hidden="true"></i> 이동 경로 · 지도에서 소요 시간 확인</button>`:''}${companionSpot(item.spot,dayIndex,item.spotIndex,options)}`).join('');
  return (bridgeHtml || '') + itemsHtml;
}
function adjustCompanionDay(dayIndex,reason) {
  openScheduleTuningModal(dayIndex);
  const input=document.getElementById('tuning-reason-input');if(input)input.value=reason;
}

function renderCompanionDetail() {
  const block = getActivePlanBlock();
  const container = document.getElementById('plan-block-detail-container');
  if (!block || !container) return;
  const selection = State.companionDetailSelection;
  const selected = selection?.blockId === block.id && block.days.some(item => item.dayIndex === selection.dayIndex)
    ? selection.dayIndex : block.days[0].dayIndex;
  const {day} = block.days.find(item => item.dayIndex === selected);
  document.getElementById('plan-block-detail-title').textContent = block.title || block.place;
  document.getElementById('plan-block-detail-meta').textContent = `${companionDate(block.startDate)} – ${companionDate(block.endDate)} · ${block.days.length}일 체류`;
  const pending = (day.spots || []).map((spot, spotIndex) => ({spot, spotIndex})).filter(item => !item.spot.completed && !SulsulTravel.ScheduleChange.retired(item.spot));
  const completed = (day.spots || []).map((spot, spotIndex) => ({spot, spotIndex})).filter(item => item.spot.completed && SulsulTravel.LiveItinerary.active(item.spot));
  container.innerHTML = `${companionDayPicker(block.days, selected, 'selectCompanionDetailDay')}
    ${renderLiveToolbar(selected)}
    ${block.lodging || block.notes || block.priorities.length ? `<details class="companion-context"><summary>숙소·꼭 하고 싶은 일·메모 <i class="fa-solid fa-chevron-down" aria-hidden="true"></i></summary><div>${block.lodging ? `<p><b>숙소</b> ${escapeHtml(block.lodging)}</p>` : ''}${block.priorities.length ? `<p>${block.priorities.map(escapeHtml).join(' · ')}</p>` : ''}${block.notes ? `<p>${escapeHtml(block.notes)}</p>` : ''}</div></details>` : ''}
    <div class="companion-day-heading"><div><p class="companion-eyebrow">DAY ${day.dayNum || selected + 1} · ${escapeHtml(companionDate(day.date))}</p><h3>${escapeHtml(day.title || day.city || block.place)}</h3><p class="companion-muted">${pending.length}개 예정 · ${completed.length}개 완료</p></div><button class="companion-button" onclick="openScheduleTuningModal(${selected})">이 날 조정</button></div>
    <div class="companion-timeline">${companionTimeline(pending,selected) || `<div class="companion-empty">${completed.length ? '이 날의 계획을 모두 마쳤어요. 기억을 남겨 볼까요?' : '아직 일정이 없어요. 아래에서 일정을 추가해 보세요.'}</div>`}</div>
    ${completed.length ? `<details class="companion-completed"><summary>완료한 일정 ${completed.length}개 보기 <i class="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>${completed.map(item => companionSpot(item.spot, selected, item.spotIndex)).join('')}</details>` : ''}
    ${(day.spots||[]).some(spot=>SulsulTravel.ScheduleChange.retired(spot))?`<details class="companion-cancelled"><summary>보관·취소·나중에 갈 곳 ${day.spots.filter(spot=>SulsulTravel.ScheduleChange.retired(spot)).length}개 보기</summary>${day.spots.map((spot,spotIndex)=>({spot,spotIndex})).filter(item=>SulsulTravel.ScheduleChange.retired(item.spot)).map(item=>companionSpot(item.spot,selected,item.spotIndex)).join('')}</details>`:''}
    <button class="companion-button companion-record" onclick="openJournalFromPlanBlock(${selected})"><i class="fa-solid fa-book-open" aria-hidden="true"></i> 이 날의 기억 남기기</button>`;
}

function selectCompanionTodayDay(dayIndex) {
  const trip = getActiveTrip();
  if (!trip?.days?.[dayIndex]) return;
  State.companionTodaySelection = {tripId:trip.id, dayIndex};
  renderTodayTab();
  document.querySelector('#today-overview-container .companion-day-picker [aria-pressed="true"]')?.focus({preventScroll:true});
}

/* ==========================================================================
   실시간 카운트다운 HUD & 스마트 현장 상태 바 (Priority 2 Live HUD)
   ========================================================================== */
function parseSpotTimeRange(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const matches = [...timeStr.matchAll(/(\d{1,2}):(\d{2})/g)];
  if (!matches.length) return null;
  const startH = parseInt(matches[0][1], 10);
  const startM = parseInt(matches[0][2], 10);
  if (isNaN(startH) || isNaN(startM) || startH < 0 || startH > 23 || startM < 0 || startM > 59) return null;
  const startMinutes = startH * 60 + startM;
  let endMinutes = null;
  if (matches.length > 1) {
    const endH = parseInt(matches[1][1], 10);
    const endM = parseInt(matches[1][2], 10);
    if (!isNaN(endH) && !isNaN(endM) && endH >= 0 && endH <= 23 && endM >= 0 && endM <= 59) {
      endMinutes = endH * 60 + endM;
    }
  }
  return {
    startMinutes,
    endMinutes,
    startTimeStr: `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`,
    endTimeStr: endMinutes != null ? `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}` : null
  };
}

function renderSpotCountdownBadge(next, day, trip, today, localTimeStr) {
  if (!day) return '';
  const isPreview = day.date !== today;

  if (isPreview) {
    if (day.date < today) {
      return `<span class="companion-countdown-badge is-past"><i class="fa-solid fa-clock-rotate-left" aria-hidden="true"></i> 지난 여행일</span>`;
    }
    const d1 = new Date(today + 'T00:00:00');
    const d2 = new Date(day.date + 'T00:00:00');
    const diffDays = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
    return `<span class="companion-countdown-badge is-future"><i class="fa-regular fa-calendar-days" aria-hidden="true"></i> D-${diffDays}일 후</span>`;
  }

  // Today
  if (!next) {
    const activeSpots = (day.spots || []).filter(s => SulsulTravel.LiveItinerary.active(s));
    if (activeSpots.length > 0 && activeSpots.every(s => s.completed)) {
      return `<span class="companion-countdown-badge is-completed"><i class="fa-solid fa-circle-check" aria-hidden="true"></i> 오늘 일정 완주! 🎉</span>`;
    }
    return `<span class="companion-countdown-badge is-empty"><i class="fa-solid fa-compass" aria-hidden="true"></i> 여정 준비 중</span>`;
  }

  if (!next.time) {
    return `<span class="companion-countdown-badge is-next"><i class="fa-solid fa-location-dot" aria-hidden="true"></i> 다음 목적지</span>`;
  }

  const range = parseSpotTimeRange(next.time);
  if (!range) {
    return `<span class="companion-countdown-badge is-next"><i class="fa-solid fa-location-dot" aria-hidden="true"></i> ${escapeHtml(next.time)}</span>`;
  }

  const [curH, curM] = (localTimeStr || '00:00').split(':').map(Number);
  const curMinutes = (curH || 0) * 60 + (curM || 0);

  // Case A: Before spot start time
  if (curMinutes < range.startMinutes) {
    const diff = range.startMinutes - curMinutes;
    if (diff <= 60) {
      return `<span class="companion-countdown-badge is-urgent" title="예정 시작 시각: ${range.startTimeStr}"><span class="badge-pulse-amber"></span>⏱️ ${diff}분 뒤 시작</span>`;
    }
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    const timeText = mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`;
    return `<span class="companion-countdown-badge is-upcoming" title="예정 시작 시각: ${range.startTimeStr}"><i class="fa-regular fa-clock" aria-hidden="true"></i> ⏱️ ${timeText} 남음</span>`;
  }

  // Case B: Currently in progress
  const effectiveEndMinutes = range.endMinutes != null ? range.endMinutes : range.startMinutes + 60;
  if (curMinutes >= range.startMinutes && curMinutes <= effectiveEndMinutes) {
    const endText = range.endTimeStr || `${String(Math.floor(effectiveEndMinutes / 60)).padStart(2, '0')}:${String(effectiveEndMinutes % 60).padStart(2, '0')}`;
    return `<span class="companion-countdown-badge is-active" title="진행 중: ${range.startTimeStr}~${endText}"><span class="badge-pulse-green"></span>🟢 지금 진행 중 (${range.startTimeStr}~${endText})</span>`;
  }

  // Case C: Overdue / Passed start time
  const overdue = curMinutes - effectiveEndMinutes;
  if (overdue > 0) {
    const oh = Math.floor(overdue / 60);
    const om = overdue % 60;
    const overdueText = oh > 0 ? `${oh}시간 ${om > 0 ? `${om}분 ` : ''}` : `${om}분 `;
    return `<span class="companion-countdown-badge is-passed" title="예정 시각: ${range.startTimeStr}"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> ⚠️ 예정 시각 ${overdueText}지남</span>`;
  }

  return `<span class="companion-countdown-badge is-next"><i class="fa-solid fa-location-dot" aria-hidden="true"></i> ${range.startTimeStr}</span>`;
}

function getTripTimeInfo(timeZone) {
  const now = new Date();
  const tz = timeZone || 'Asia/Seoul';
  let localTime = '00:00';
  let seoulTime = '00:00';
  let diffHours = 0;
  try {
    localTime = SulsulTravel.TripAdapter.localTimeKey(now, tz);
    seoulTime = SulsulTravel.TripAdapter.localTimeKey(now, 'Asia/Seoul');

    const getParts = (tZone) => {
      const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone: tZone,
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: false
      });
      const parts = dtf.formatToParts(now);
      const obj = {};
      parts.forEach(p => obj[p.type] = p.value);
      return new Date(Date.UTC(obj.year, obj.month - 1, obj.day, obj.hour % 24, obj.minute, obj.second));
    };

    const targetUtc = getParts(tz);
    const seoulUtc = getParts('Asia/Seoul');
    diffHours = Math.round((targetUtc.getTime() - seoulUtc.getTime()) / (1000 * 60 * 60));
  } catch (e) {
    diffHours = 0;
    localTime = SulsulTravel.TripAdapter.localTimeKey(now, 'Asia/Seoul');
    seoulTime = localTime;
  }

  let diffLabel = '한국과 시차 없음';
  if (diffHours > 0) {
    diffLabel = `한국보다 ${diffHours}시간 빠름 (서울 ${seoulTime})`;
  } else if (diffHours < 0) {
    diffLabel = `한국보다 ${Math.abs(diffHours)}시간 느림 (서울 ${seoulTime})`;
  }
  return { localTime, seoulTime, diffHours, diffLabel };
}

function getTodayWeatherInfo(day, trip) {
  let weatherBadge = '🌤️ 쾌청 온화';
  let altitude = '해발 0~50m (평지)';
  let isCareNeeded = false;
  let detail = '';

  if (typeof getDayAltitudeAndOutfitInfo === 'function') {
    try {
      const info = getDayAltitudeAndOutfitInfo(day, trip);
      if (info) {
        weatherBadge = info.weatherBadge || weatherBadge;
        altitude = info.altitude || altitude;
        isCareNeeded = !!info.isCareNeeded;
        detail = [info.weatherDetail, info.outfitSummary].filter(Boolean).join(' · ');
      }
    } catch (e) {
      // fallback
    }
  }
  return { weatherBadge, altitude, isCareNeeded, detail };
}

function renderTodaySmartHud(trip, day, dayIndex, today) {
  const timeInfo = getTripTimeInfo(trip?.timeZone);
  const city = day.city || day.loc || (trip.cities && trip.cities[0]) || '현지';

  const dayExpenses = (trip.expenses || []).filter(e => e.date === day.date && e.type !== 'income');
  let dayTotalKrw = 0;
  const currTotals = {};
  dayExpenses.forEach(e => {
    const curr = e.curr || e.currency || 'KRW';
    const amt = Number(e.amount) || 0;
    currTotals[curr] = (currTotals[curr] || 0) + amt;
    let krw = 0;
    if (e.krw != null && e.krw !== '' && Number.isFinite(Number(e.krw))) {
      krw = Number(e.krw);
    } else {
      const rate = typeof window.getCurrencyRate === 'function' ? window.getCurrencyRate(curr) : 1;
      krw = Math.round(amt * rate);
    }
    dayTotalKrw += krw;
  });

  let expenseValText = '₩0';
  let expenseSubText = '지출 기록 없음 (탭하여 등록)';
  if (dayExpenses.length > 0) {
    expenseValText = `₩${dayTotalKrw.toLocaleString()}`;
    const nonKrwCurrs = Object.keys(currTotals).filter(c => c !== 'KRW');
    if (nonKrwCurrs.length === 1) {
      const curr = nonKrwCurrs[0];
      const info = window.CURRENCY_INFO?.[curr] || {};
      const symbol = info.symbol || curr + ' ';
      expenseSubText = `${symbol}${currTotals[curr].toLocaleString()} · ${dayExpenses.length}건 기록`;
    } else if (nonKrwCurrs.length > 1) {
      expenseSubText = `외화 ${nonKrwCurrs.length}종 포함 · ${dayExpenses.length}건`;
    } else {
      expenseSubText = `총 ${dayExpenses.length}건 기록됨`;
    }
  }

  const activeSpots = (day.spots || []).filter(s => SulsulTravel.LiveItinerary.active(s));
  const totalSpots = activeSpots.length;
  const doneSpots = activeSpots.filter(s => s.completed).length;
  const pct = totalSpots > 0 ? Math.round((doneSpots / totalSpots) * 100) : 0;

  const weatherInfo = getTodayWeatherInfo(day, trip);

  return `
    <section class="today-smart-hud" aria-label="오늘의 현장 스마트 브리핑">
      <div class="today-smart-hud-grid">
        <div class="smart-hud-card hud-card-time">
          <div class="hud-card-header">
            <span class="hud-card-label"><i class="fa-regular fa-clock" aria-hidden="true"></i> 현지 시각</span>
            <span class="hud-city-badge">${escapeHtml(city)}</span>
          </div>
          <div class="hud-card-val">${timeInfo.localTime}</div>
          <div class="hud-card-sub" title="${escapeHtml(timeInfo.diffLabel)}">${escapeHtml(timeInfo.diffLabel)}</div>
        </div>

        <button type="button" class="smart-hud-card hud-card-expense" onclick="switchTab('expenses')" aria-label="오늘 지출 확인 (가계부로 이동)">
          <div class="hud-card-header">
            <span class="hud-card-label"><i class="fa-solid fa-wallet" aria-hidden="true"></i> 오늘 지출</span>
            <span class="hud-link-arrow"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></span>
          </div>
          <div class="hud-card-val">${expenseValText}</div>
          <div class="hud-card-sub" title="${escapeHtml(expenseSubText)}">${escapeHtml(expenseSubText)}</div>
        </button>
      </div>

      <div class="today-smart-hud-footer">
        <div class="hud-progress-wrap">
          <div class="hud-progress-meta">
            <span class="hud-progress-label"><i class="fa-solid fa-list-check" aria-hidden="true"></i> 오늘 일정 완주</span>
            <span class="hud-progress-stat"><b>${doneSpots}</b>/${totalSpots} 완료 (${pct}%)</span>
          </div>
          <div class="hud-progress-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
            <div class="hud-progress-fill" style="width:${pct}%"></div>
          </div>
        </div>
        <div class="hud-weather-chip ${weatherInfo.isCareNeeded ? 'is-care-needed' : ''}" title="${escapeHtml(weatherInfo.detail || '')}">
          <span class="hud-weather-main"><i class="fa-solid fa-cloud-sun text-amber-400" aria-hidden="true"></i> ${escapeHtml(weatherInfo.weatherBadge)}</span>
          <span class="hud-weather-extra">${escapeHtml(weatherInfo.altitude)}</span>
        </div>
      </div>
    </section>
  `;
}

function renderCompanionToday() {
  const trip = getActiveTrip();
  const container = document.getElementById('today-overview-container');
  if (!trip || !container) return;
  if (!trip.days?.length) { container.innerHTML = '<div class="companion-empty">큰 계획에서 첫 일정을 만들어 주세요.</div>'; return; }
  const selected = State.companionTodaySelection;
  const dayIndex = selected?.tripId === trip.id && trip.days[selected.dayIndex] ? selected.dayIndex : resolveTodayDayIndex(trip);
  State.activeTodayDayIndex = dayIndex;
  const day = trip.days[dayIndex];
  const nextIndex = (day.spots || []).findIndex(spot => !spot.completed && !SulsulTravel.ScheduleChange.retired(spot));
  const next = day.spots?.[nextIndex];
  const done = (day.spots || []).filter(spot => spot.completed).length;
  const today = SulsulTravel.TripAdapter.localDateKey(new Date(), trip.timeZone);
  const localTime = SulsulTravel.TripAdapter.localTimeKey(new Date(), trip.timeZone);
  const preview = day.date !== today;
  const pending = (day.spots || []).map((spot,spotIndex)=>({spot,spotIndex})).filter(item=>!item.spot.completed && !SulsulTravel.ScheduleChange.retired(item.spot));
  const completed = (day.spots || []).map((spot,spotIndex)=>({spot,spotIndex})).filter(item=>item.spot.completed && SulsulTravel.LiveItinerary.active(item.spot));

  const countdownBadge = renderSpotCountdownBadge(next, day, trip, today, localTime);
  const smartHudHtml = renderTodaySmartHud(trip, day, dayIndex, today);

  container.innerHTML = `<div class="companion-section-title"><h3>하루의 여행</h3><div class="flex items-center gap-1.5"><button class="companion-button" onclick="switchTab('expenses')"><i class="fa-solid fa-wallet" aria-hidden="true"></i> 지출</button><button class="companion-button" onclick="navigateToInteractiveMap()"><i class="fa-solid fa-map" aria-hidden="true"></i> 지도</button></div></div>
    ${companionDayPicker(trip.days.map((day,dayIndex)=>({day,dayIndex})), dayIndex, 'selectCompanionTodayDay')}
    ${smartHudHtml}
    ${preview ? `<p class="companion-preview">${day.date < today ? '지난 여행일을 보고 있어요' : '미리 보는 하루'} · ${escapeHtml(day.date)}</p>`:''}
    <section class="companion-next">
      <div class="companion-next-header">
        <p class="companion-eyebrow">${next ? 'NEXT STOP · 다음 일정' : 'YOUR DAY · 하루의 기록'}</p>
        ${countdownBadge}
      </div>
      <h3>${escapeHtml(next ? next.title || next.name || '일정 제목 미정' : (day.spots?.length ? '남은 예정이 없어요' : '이 하루는 아직 비어 있어요'))}</h3>
      <p>${escapeHtml(next?.time || companionDate(day.date))} · ${escapeHtml(day.city || day.loc || '여행')} · ${done}/${(day.spots||[]).filter(spot=>SulsulTravel.LiveItinerary.active(spot)).length} 완료</p>
      <div class="companion-next-actions">${next ? `<button class="companion-button companion-primary" onclick="openCompanionDirections(${dayIndex},${nextIndex})"><i class="fa-solid fa-location-arrow" aria-hidden="true"></i> 길찾기</button><button class="companion-button" onclick="openTaxiCardModal(${dayIndex},${nextIndex},event)"><i class="fa-solid fa-taxi" aria-hidden="true"></i> 기사님</button><button class="companion-button" onclick="openActivityJournal(${dayIndex},${nextIndex},event)"><i class="fa-solid fa-book-open" aria-hidden="true"></i> 기록</button><button class="companion-button" onclick="completeTodaySpot(${dayIndex},${nextIndex},event)"><i class="fa-solid fa-check" aria-hidden="true"></i> 완료</button>`:`<button class="companion-button companion-primary" onclick="openMomentJournal(${dayIndex})">+ 순간 기록</button><button class="companion-button" onclick="switchTab('journal');selectJournalDay(${dayIndex})">하루 회고</button>`}</div>
    </section>
    ${renderLiveToolbar(dayIndex)}
    <div class="companion-change-reason" aria-label="상황에 맞게 일정 조정"><button onclick="adjustCompanionDay(${dayIndex},'비가 와서 실내 위주로 변경')">비가 와요</button><button onclick="adjustCompanionDay(${dayIndex},'교통 지연으로 남은 동선을 조정')">이동 지연</button><button onclick="adjustCompanionDay(${dayIndex},'휴식 시간을 늘리고 무리하지 않는 일정으로 변경')">쉬고 싶어요</button><button onclick="openScheduleTuningModal(${dayIndex})">직접 조정</button></div>
    <div class="companion-section-title"><h3>하루의 흐름</h3><button class="companion-button" onclick="openAddSpotToDay(${dayIndex})">+ 일정 추가</button></div>
    <div class="companion-timeline">${companionTimeline(pending,dayIndex,{today:true}) || '<div class="companion-empty">남은 일정이 없어요. 새로운 순간을 기록해 보세요.</div>'}</div>
    ${completed.length ? `<details class="companion-completed"><summary>완료한 일정 ${completed.length}개 보기</summary>${completed.map(item=>companionSpot(item.spot,dayIndex,item.spotIndex,{today:true})).join('')}</details>`:''}
    ${(day.spots||[]).some(spot=>SulsulTravel.ScheduleChange.retired(spot))?`<details class="companion-cancelled"><summary>보관·취소·나중에 갈 곳 ${day.spots.filter(spot=>SulsulTravel.ScheduleChange.retired(spot)).length}개 보기</summary>${day.spots.map((spot,spotIndex)=>({spot,spotIndex})).filter(item=>SulsulTravel.ScheduleChange.retired(item.spot)).map(item=>companionSpot(item.spot,dayIndex,item.spotIndex)).join('')}</details>`:''}
    <button class="companion-button companion-record" onclick="openMomentJournal(${dayIndex})">+ 생각날 때 순간 기록</button>`;
}

// Keep sheets inside the visible area when a mobile keyboard reduces the viewport.
function updateCompanionViewport() {
  const viewport = window.visualViewport;
  if (!viewport) return;
  const editing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
  const keyboardOpen = editing && viewport.scale === 1 && innerHeight - viewport.height > 120;
  document.body.classList.toggle('companion-keyboard-open', keyboardOpen);
  document.documentElement.style.setProperty('--visual-height', `${viewport.height}px`);
  document.documentElement.style.setProperty('--visual-top', `${viewport.offsetTop}px`);
}
document.addEventListener('DOMContentLoaded', () => {
  // 로고·버전·글꼴 크기가 바뀌어도 데스크톱 고정 메뉴가 헤더 뒤로 들어가지 않는다.
  const header = document.querySelector('.companion-app-header');
  if (header) {
    const syncHeaderHeight = () => document.documentElement.style.setProperty('--app-header-height', `${Math.ceil(header.getBoundingClientRect().height)}px`);
    syncHeaderHeight();
    if (typeof ResizeObserver === 'function') new ResizeObserver(syncHeaderHeight).observe(header);
    else window.addEventListener('resize', syncHeaderHeight);
  }
  window.visualViewport?.addEventListener('resize', updateCompanionViewport);
  window.visualViewport?.addEventListener('scroll', updateCompanionViewport);
  document.addEventListener('focusin', updateCompanionViewport);
  document.addEventListener('focusout', () => requestAnimationFrame(updateCompanionViewport));
  updateCompanionViewport();

  // 일정 카드의 더보기 팝오버 바깥 클릭 시 자동 닫힘
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.companion-spot-more')) {
      document.querySelectorAll('.companion-spot-more[open]').forEach(d => d.removeAttribute('open'));
    }
  });
});

function scrollToPlanBlock(blockIndex) {
  const el = document.getElementById(`companion-block-${blockIndex}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.add('companion-block-focus');
    setTimeout(() => el.classList.remove('companion-block-focus'), 1400);
  } else if (typeof openPlanBlock === 'function') {
    openPlanBlock(blockIndex);
  }
}
window.scrollToPlanBlock = scrollToPlanBlock;

function confirmResetAiDraft() {
  if (typeof openTripDraftStudio === 'function') {
    openTripDraftStudio();
  } else if (typeof openModal === 'function') {
    openModal('modal-ai-trip');
  }
}
window.confirmResetAiDraft = confirmResetAiDraft;

/* ==========================================================================
   현지어 기사님 카드 (Taxi / Destination Fullscreen Flashcard)
   ========================================================================== */
function detectTaxiLanguagePhrases(trip, spot, day) {
  const textToScan = [
    ...(trip?.countries || []),
    ...(trip?.cities || []),
    spot?.title || '',
    spot?.name || '',
    spot?.address || '',
    day?.city || '',
    day?.loc || ''
  ].join(' ');

  const isJapanese = /[\u3040-\u309F\u30A0-\u30FF]/.test(textToScan) || /(일본|도쿄|오사카|교토|후쿠오카|삿포로|오키나와|Japan|Tokyo|Osaka|Kyoto)/i.test(textToScan);
  const isChinese = /(대만|타이완|중국|홍콩|마카오|타이베이|가오슝|베이징|상하이|Taiwan|Taipei|China|Hong Kong)/i.test(textToScan) || /[\u4E00-\u9FFF]/.test(spot?.title || '');
  const isSpanish = /(스페인|아르헨티나|멕시코|페루|칠레|콜롬비아|마드리드|바르셀로나|부에노스|Spain|Argentina|Mexico|Peru|Chile)/i.test(textToScan);
  const isFrench = /(프랑스|파리|니스|리옹|France|Paris|Nice)/i.test(textToScan);
  const isThai = /[\u0E00-\u0E7F]/.test(textToScan) || /(태국|방콕|푸켓|Thailand|Bangkok)/i.test(textToScan);
  const isVietnamese = /(베트남|다낭|하노이|호치민|Vietnam|Danang|Hanoi)/i.test(textToScan);

  let localPhrase = "Driver, please take me to this location.";
  let localLangName = "현지어";

  if (isJapanese) {
    localPhrase = "運転手さん、ここまでお願いします。";
    localLangName = "일본어";
  } else if (isChinese) {
    localPhrase = "司機先生，請帶我到這裡。";
    localLangName = "중국어/대만";
  } else if (isSpanish) {
    localPhrase = "Por favor, lléveme a este lugar.";
    localLangName = "스페인어";
  } else if (isFrench) {
    localPhrase = "S'il vous plaît, emmenez-moi ici.";
    localLangName = "프랑스어";
  } else if (isThai) {
    localPhrase = "กรุณาพาฉันไปที่นี่ครับ/ค่ะ";
    localLangName = "태국어";
  } else if (isVietnamese) {
    localPhrase = "Làm ơn đưa tôi đến địa chỉ này.";
    localLangName = "베트남어";
  }

  return {
    local: { name: localLangName, phrase: localPhrase },
    en: { name: "English", phrase: "Driver, please take me to this location." },
    ko: { name: "한국어", phrase: "기사님, 여기(목적지)로 가주세요." }
  };
}

function copyTaxiCardAddress(text) {
  if (!text) return;
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    navigator.clipboard.writeText(text).then(() => {
      if (typeof showToast === 'function') showToast('주소가 복사되었습니다! (클립보드)');
    }).catch(() => fallbackCopyTaxiCardText(text));
  } else {
    fallbackCopyTaxiCardText(text);
  }
}

function fallbackCopyTaxiCardText(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    if (typeof showToast === 'function') showToast('주소가 복사되었습니다! (클립보드)');
  } catch (e) {
    window.prompt('주소를 복사하세요 (Ctrl+C):', text);
  } finally {
    ta.remove();
  }
}

function renderTaxiCardContent(dayIndex, spotIndex, selectedLang = 'local', isHuge = false) {
  const trip = getActiveTrip();
  const day = trip?.days?.[dayIndex];
  const spot = day?.spots?.[spotIndex];
  if (!spot) return;

  const phrases = detectTaxiLanguagePhrases(trip, spot, day);
  const activePhraseObj = phrases[selectedLang] || phrases.local;
  const activePhrase = activePhraseObj.phrase;

  const title = spot.title || spot.name || '목적지 미정';
  const city = spot.city || day?.city || day?.loc || (trip?.cities && trip.cities[0]) || '';
  const query = companionMapQuery(day, spot);
  const address = spot.address || spot.loc || query;
  const memo = spot.desc || spot.memo || '';
  const tip = spot.tip || '';
  const hint = [memo, tip].filter(Boolean).join(' · ');

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  const uberUrl = `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(address)}&dropoff[nickname]=${encodeURIComponent(title)}${spot.lat && spot.lng ? `&dropoff[latitude]=${spot.lat}&dropoff[longitude]=${spot.lng}` : ''}`;

  const container = document.getElementById('taxi-card-content');
  if (!container) return;

  container.innerHTML = `
    <!-- 언어 선택 바 -->
    <div class="flex items-center justify-between gap-1.5 p-1 bg-[#141c2e] border border-[#23304c] rounded-xl text-xs">
      <button type="button" onclick="renderTaxiCardContent(${dayIndex},${spotIndex},'local',${isHuge})" class="flex-1 py-1.5 px-2 rounded-lg font-bold transition ${selectedLang === 'local' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}">
        <i class="fa-solid fa-language mr-1" aria-hidden="true"></i> ${escapeHtml(phrases.local.name)}
      </button>
      <button type="button" onclick="renderTaxiCardContent(${dayIndex},${spotIndex},'en',${isHuge})" class="flex-1 py-1.5 px-2 rounded-lg font-bold transition ${selectedLang === 'en' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}">
        English
      </button>
      <button type="button" onclick="renderTaxiCardContent(${dayIndex},${spotIndex},'ko',${isHuge})" class="flex-1 py-1.5 px-2 rounded-lg font-bold transition ${selectedLang === 'ko' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}">
        한국어
      </button>
    </div>

    <!-- 기사님 전용 배너 (정중한 요청 문구) -->
    <div class="taxi-card-driver-banner">
      <div class="taxi-card-phrase">${escapeHtml(activePhrase)}</div>
      <div class="taxi-card-phrase-sub">기사님께 이 화면을 직접 보여주세요 (Show this screen to the driver)</div>
    </div>

    <!-- 목적지 대형 고대비 카드 -->
    <div class="taxi-card-display ${isHuge ? 'is-huge' : ''}">
      <div class="flex items-center justify-between gap-2 mb-2">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
          <i class="fa-solid fa-location-dot" aria-hidden="true"></i> ${escapeHtml(city || '목적지')}
        </span>
        <button type="button" onclick="renderTaxiCardContent(${dayIndex},${spotIndex},'${selectedLang}',${!isHuge})" class="px-2.5 py-1 rounded-lg bg-[#1e293b] hover:bg-[#334155] border border-[#475569] text-xs font-bold text-slate-200 flex items-center gap-1 transition cursor-pointer" title="글자 크기 토글">
          <i class="fa-solid ${isHuge ? 'fa-compress' : 'fa-magnifying-glass-plus'} text-amber-400" aria-hidden="true"></i>
          <span>${isHuge ? '보통 글자' : '대형 확대 (AAA)'}</span>
        </button>
      </div>

      <div class="taxi-card-title">${escapeHtml(title)}</div>
      <div class="taxi-card-address"><i class="fa-solid fa-map-pin mr-1 text-amber-400" aria-hidden="true"></i> ${escapeHtml(address)}</div>
      ${hint ? `<div class="taxi-card-memo"><i class="fa-solid fa-circle-info mr-1 text-sky-400" aria-hidden="true"></i> ${escapeHtml(hint)}</div>` : ''}
    </div>

    <!-- 액션 버튼 툴바 (2x2 그리드) -->
    <div class="taxi-card-actions">
      <button type="button" onclick="copyTaxiCardAddress('${escapeHtml(address).replace(/'/g, "\\'")}')" class="bg-[#141c2e] hover:bg-[#1a263e] border border-[#23304c] text-white flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer">
        <i class="fa-solid fa-copy text-amber-400" aria-hidden="true"></i>
        <span>주소 복사</span>
      </button>
      <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" class="bg-[#141c2e] hover:bg-[#1a263e] border border-[#23304c] text-white flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition active:scale-95 no-underline cursor-pointer">
        <i class="fa-solid fa-map-location-dot text-emerald-400" aria-hidden="true"></i>
        <span>구글 지도</span>
      </a>
      <a href="${uberUrl}" target="_blank" rel="noopener noreferrer" class="bg-[#141c2e] hover:bg-[#1a263e] border border-[#23304c] text-white flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition active:scale-95 no-underline cursor-pointer">
        <i class="fa-solid fa-car text-sky-400" aria-hidden="true"></i>
        <span>우버(Uber) 호출</span>
      </a>
      <button type="button" onclick="closeModal('modal-taxi-card')" class="bg-[#141c2e] hover:bg-[#1a263e] border border-[#23304c] text-slate-300 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer">
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        <span>닫기</span>
      </button>
    </div>
  `;
}

function openTaxiCardModal(dayIndex, spotIndex, evt) {
  if (evt && typeof evt.stopPropagation === 'function') evt.stopPropagation();
  renderTaxiCardContent(dayIndex, spotIndex, 'local', false);
  if (typeof openModal === 'function') openModal('modal-taxi-card');
}
window.openTaxiCardModal = openTaxiCardModal;
window.renderTaxiCardContent = renderTaxiCardContent;
window.copyTaxiCardAddress = copyTaxiCardAddress;
window.parseSpotTimeRange = parseSpotTimeRange;
window.renderSpotCountdownBadge = renderSpotCountdownBadge;
window.getTripTimeInfo = getTripTimeInfo;
window.getTodayWeatherInfo = getTodayWeatherInfo;
window.renderTodaySmartHud = renderTodaySmartHud;
window.detectSpotCategoryKind = detectSpotCategoryKind;
window.renderCityTransitionBridge = renderCityTransitionBridge;

// 실시간 카운트다운 & 현장 상태 자동 갱신 (오늘 탭이 활성화된 상태에서 60초마다 갱신)
if (typeof window !== 'undefined' && !window.__companionHudTimer) {
  window.__companionHudTimer = setInterval(() => {
    try {
      if (window.State?.activeTab === 'today' && document.getElementById('today-overview-container')?.offsetParent !== null) {
        if (typeof renderCompanionToday === 'function') {
          renderCompanionToday();
        }
      }
    } catch (e) {
      // safe fallback
    }
  }, 60000);
}



