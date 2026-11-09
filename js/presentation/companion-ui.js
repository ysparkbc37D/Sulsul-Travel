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

  const totalDaySpots = day?.spots?.length || 1;
  const isFirstSpot = spotIndex === 0;
  const isLastSpot = spotIndex >= (totalDaySpots - 1);
  const nextSpotIndex = (day?.spots || []).findIndex(s => !s.completed && !SulsulTravel.ScheduleChange.retired(s));
  const isCurrentNextSpot = today && !spot.completed && (nextSpotIndex === spotIndex);
  const reorderCtrls = window.__spotReorderModeActive ? `
    <div class="companion-spot-reorder-ctrls no-print">
      <button type="button" class="reorder-btn" onclick="moveCompanionSpotOrder(${dayIndex},${spotIndex},-1,event)" ${isFirstSpot ? 'disabled' : ''} aria-label="일정 위로 이동" title="위로"><i class="fa-solid fa-arrow-up"></i></button>
      <button type="button" class="reorder-btn" onclick="moveCompanionSpotOrder(${dayIndex},${spotIndex},1,event)" ${isLastSpot ? 'disabled' : ''} aria-label="일정 아래로 이동" title="아래로"><i class="fa-solid fa-arrow-down"></i></button>
    </div>
  ` : '';

  return `<article data-spot-id="${escapeHtml(spot.id)}" class="companion-spot ${kindClass} ${spot.completed ? 'is-completed' : ''} ${isCurrentNextSpot ? 'is-active-spot' : ''}">
    <div class="companion-spot-header">
      <div class="companion-spot-time"><time>${escapeHtml(spot.time || '시간 미정')}</time>${kindBadge}${status ? `<span class="companion-status">${status}</span>` : ''}${reorderCtrls}</div>
      <details class="companion-spot-more">
        <summary class="companion-spot-more-trigger" aria-label="일정 관리 더보기" title="수정·관리 더보기"><i class="fa-solid fa-ellipsis" aria-hidden="true"></i></summary>
        <div class="companion-spot-edit-actions">
          <button class="companion-button" onclick="openEditSpotModal(${dayIndex},${spotIndex},event)"><i class="fa-solid fa-pen-to-square" aria-hidden="true"></i> 시간·내용 수정</button>
          <button class="companion-button" onclick="moveCompanionSpotOrder(${dayIndex},${spotIndex},-1,event)" ${isFirstSpot ? 'disabled' : ''}><i class="fa-solid fa-arrow-up" aria-hidden="true"></i> 위로 이동</button>
          <button class="companion-button" onclick="moveCompanionSpotOrder(${dayIndex},${spotIndex},1,event)" ${isLastSpot ? 'disabled' : ''}><i class="fa-solid fa-arrow-down" aria-hidden="true"></i> 아래로 이동</button>
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
  const reorderToolbarHtml = (items && items.length > 1) ? `
    <div class="spot-reorder-toolbar no-print">
      <div class="flex items-center gap-1.5 font-bold text-slate-300">
        <i class="fa-solid fa-arrows-up-down text-amber-400"></i>
        <span>일정 순서 조작</span>
      </div>
      <div class="flex items-center gap-1.5">
        <button type="button" onclick="toggleSpotReorderMode()" class="px-2 py-1 rounded-lg text-xs font-bold transition ${window.__spotReorderModeActive ? 'bg-amber-500 text-slate-950 shadow' : 'bg-[#1e293b] text-slate-300 hover:text-white border border-[#334155]'}">
          <i class="fa-solid fa-up-down-left-right mr-1"></i> ${window.__spotReorderModeActive ? '순서 편집 완료' : '순서 편집'}
        </button>
        <button type="button" onclick="realignSpotSchedule(${dayIndex}, 30)" class="px-2 py-1 rounded-lg text-xs font-bold bg-[#1e293b] text-slate-300 hover:text-white border border-[#334155] transition" title="등록된 소요시간과 완료·고정 일정을 반영한 30분 기준 변경 미리보기">
          30분 정렬
        </button>
        <button type="button" onclick="realignSpotSchedule(${dayIndex}, 60)" class="px-2 py-1 rounded-lg text-xs font-bold bg-[#1e293b] text-slate-300 hover:text-white border border-[#334155] transition" title="등록된 소요시간과 완료·고정 일정을 반영한 1시간 기준 변경 미리보기">
          1시간 정렬
        </button>
      </div>
    </div>
  ` : '';
  const itemsHtml = items.map((item,index)=>`<button class="live-between-insert" data-live-action="insert-between" onclick="openLiveInsert(${dayIndex},${item.spotIndex},'before')">+ 여기에 추가</button>${index ? `<button class="companion-transit" onclick="openCompanionDirections(${dayIndex},${item.spotIndex},${items[index-1].spotIndex})"><i class="fa-solid fa-route" aria-hidden="true"></i> 이동 경로 · 지도에서 소요 시간 확인</button>`:''}${companionSpot(item.spot,dayIndex,item.spotIndex,options)}`).join('');
  return (bridgeHtml || '') + reorderToolbarHtml + itemsHtml;
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
    <div class="companion-timeline">${companionTimeline(pending,selected) || `<div class="companion-bento-empty"><div class="empty-icon-wrap"><i class="fa-regular fa-compass"></i></div><h4 class="companion-empty-title">${completed.length ? '이 날의 계획을 모두 마쳤어요 🎉' : '아직 일정이 비어있는 하루예요'}</h4><p class="companion-empty-desc">${completed.length ? '오늘 하루의 소중한 기억을 일기로 남겨 볼까요?' : '가고 싶은 장소를 추가하여 알찬 일정을 완성해 보세요.'}</p><div class="empty-actions"><button class="companion-button companion-primary" onclick="openAddSpotToDay(${selected})"><i class="fa-solid fa-plus"></i> 일정 추가하기</button><button class="companion-button" onclick="openJournalFromPlanBlock(${selected})"><i class="fa-solid fa-book-open"></i> 기억 남기기</button></div></div>`}</div>
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

  let pacingMiniHtml = '';
  try {
    const walletData = (typeof getWalletData === 'function' ? getWalletData(trip) : (trip.wallet || {}));
    const pacing = calculateBudgetPacing(trip, walletData);
    if (pacing && pacing.totalBudgetKrw > 0) {
      pacingMiniHtml = `
        <div class="hud-pacing-mini" title="권장 일일 예산: ₩${pacing.dailyRecommendedBudget.toLocaleString()} (${pacing.statusLabel})">
          <span class="pacing-badge-mini status-${pacing.statusKey}">${pacing.statusLabel}</span>
          <span class="pacing-rec-val">권장 ₩${pacing.dailyRecommendedBudget.toLocaleString()}</span>
        </div>
      `;
    }
  } catch (e) {
    // optional pacing mini
  }

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
          ${pacingMiniHtml}
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
  if (!trip.days?.length) {
    container.innerHTML = `
      <div class="companion-bento-empty">
        <div class="empty-icon-wrap"><i class="fa-solid fa-map-location-dot"></i></div>
        <h4 class="companion-empty-title">아직 생성된 여행 계획이 없어요</h4>
        <p class="companion-empty-desc">큰 계획 탭에서 첫 일정을 만들거나, AI 일정 스튜디오에서 순식간에 맞춤 일정을 생성해 보세요.</p>
        <div class="empty-actions">
          <button class="companion-button companion-primary" onclick="confirmResetAiDraft()"><i class="fa-solid fa-wand-magic-sparkles"></i> AI 일정 생성하기</button>
          <button class="companion-button" onclick="switchTab('plan')"><i class="fa-solid fa-calendar-plus"></i> 직접 일정 만들기</button>
        </div>
      </div>
    `;
    return;
  }
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

  let isCurrentSpotActive = false;
  if (next && next.time && !preview) {
    const range = parseSpotTimeRange(next.time);
    if (range) {
      const [curH, curM] = (localTime || '00:00').split(':').map(Number);
      const curMinutes = (curH || 0) * 60 + (curM || 0);
      const effectiveEndMinutes = range.endMinutes != null ? range.endMinutes : range.startMinutes + 60;
      if (curMinutes >= range.startMinutes && curMinutes <= effectiveEndMinutes) {
        isCurrentSpotActive = true;
      }
    }
  }

  const actionDeckHtml = `
    <div class="today-bento-actions-deck no-print" aria-label="현장 빠른 액션 덱">
      <button type="button" class="bento-action-pill pill-sos" onclick="openSosEmergencyModal()" title="긴급 SOS 비상 연락망 & 의사소통">
        <i class="fa-solid fa-triangle-exclamation animate-pulse"></i> <span>긴급 SOS</span>
      </button>
      <button type="button" class="bento-action-pill" onclick="openTaxiCardModal(${dayIndex},${nextIndex >= 0 ? nextIndex : 0},event)" title="현지어 기사님 카드">
        <i class="fa-solid fa-taxi text-amber-500"></i> <span>기사님 카드</span>
      </button>
      <button type="button" class="bento-action-pill pill-capsule" onclick="openQuickCapsuleModal()" title="1-Tap 길거리 음성/사진 퀵 캡슐">
        <i class="fa-solid fa-microphone text-rose-500"></i> <span>퀵 캡슐</span>
      </button>
      <button type="button" class="bento-action-pill" onclick="openStoryMagazineModal()" title="에디토리얼 스토리 매거진">
        <i class="fa-solid fa-book-open-reader text-indigo-500"></i> <span>스토리 매거진</span>
      </button>
      <button type="button" class="bento-action-pill" onclick="switchTab('expenses')" title="가계부 및 퀵 환율 계산기">
        <i class="fa-solid fa-coins text-emerald-500"></i> <span>환율·지출</span>
      </button>
    </div>
  `;

  let emptyTimelineHtml = '';
  if (completed.length > 0) {
    emptyTimelineHtml = `
      <div class="companion-bento-empty is-celebration">
        <div class="empty-icon-wrap"><i class="fa-solid fa-flag-checkered"></i></div>
        <h4 class="companion-empty-title">오늘의 모든 일정을 완주했어요! 🎉</h4>
        <p class="companion-empty-desc">오늘 만난 멋진 순간들과 기억들을 매거진이나 일기로 생생하게 간직해 보세요.</p>
        <div class="empty-actions">
          <button class="companion-button companion-primary" onclick="openStoryMagazineModal()"><i class="fa-solid fa-book-open-reader"></i> 스토리 매거진 보기</button>
          <button class="companion-button" onclick="openQuickCapsuleModal()"><i class="fa-solid fa-microphone"></i> 오늘의 감상 남기기</button>
          <button class="companion-button" onclick="switchTab('journal');selectJournalDay(${dayIndex})"><i class="fa-solid fa-pen-fancy"></i> 하루 회고 작성</button>
        </div>
      </div>
    `;
  } else {
    emptyTimelineHtml = `
      <div class="companion-bento-empty">
        <div class="empty-icon-wrap"><i class="fa-regular fa-compass"></i></div>
        <h4 class="companion-empty-title">아직 일정이 비어있는 하루예요</h4>
        <p class="companion-empty-desc">새로운 설렘으로 이 날을 채워보세요. 가고 싶은 장소를 추가하거나 지도에서 명소를 둘러보실 수 있어요.</p>
        <div class="empty-actions">
          <button class="companion-button companion-primary" onclick="openAddSpotToDay(${dayIndex})"><i class="fa-solid fa-plus"></i> 첫 일정 추가하기</button>
          <button class="companion-button" onclick="openQuickCapsuleModal()"><i class="fa-solid fa-microphone"></i> 음성 캡슐로 기록</button>
          <button class="companion-button" onclick="navigateToInteractiveMap()"><i class="fa-solid fa-map-pin"></i> 추천 명소 지도</button>
        </div>
      </div>
    `;
  }

  container.innerHTML = `<div class="companion-section-title"><h3>하루의 여행</h3><div class="flex items-center gap-1.5"><button class="companion-button" onclick="switchTab('expenses')"><i class="fa-solid fa-wallet" aria-hidden="true"></i> 지출</button><button class="companion-button" onclick="navigateToInteractiveMap()"><i class="fa-solid fa-map" aria-hidden="true"></i> 지도</button></div></div>
    ${companionDayPicker(trip.days.map((day,dayIndex)=>({day,dayIndex})), dayIndex, 'selectCompanionTodayDay')}
    ${actionDeckHtml}
    ${smartHudHtml}
    ${preview ? `<p class="companion-preview">${day.date < today ? '지난 여행일을 보고 있어요' : '미리 보는 하루'} · ${escapeHtml(day.date)}</p>`:''}
    <section class="companion-next ${isCurrentSpotActive ? 'is-active' : ''}">
      <div class="companion-next-header">
        <p class="companion-eyebrow">${next ? 'NEXT STOP · 다음 일정' : 'YOUR DAY · 하루의 기록'}</p>
        ${countdownBadge}
      </div>
      <h3>${escapeHtml(next ? next.title || next.name || '일정 제목 미정' : (day.spots?.length ? '남은 예정이 없어요' : '이 하루는 아직 비어 있어요'))}</h3>
      <p>${escapeHtml(next?.time || companionDate(day.date))} · ${escapeHtml(day.city || day.loc || '여행')} · ${done}/${(day.spots||[]).filter(spot=>SulsulTravel.LiveItinerary.active(spot)).length} 완료</p>
      <div class="companion-next-actions">${next ? `<button class="companion-button companion-primary" onclick="openCompanionDirections(${dayIndex},${nextIndex})"><i class="fa-solid fa-location-arrow" aria-hidden="true"></i> 길찾기</button><button class="companion-button" onclick="openTaxiCardModal(${dayIndex},${nextIndex},event)"><i class="fa-solid fa-taxi" aria-hidden="true"></i> 기사님</button><button class="companion-button" onclick="openActivityJournal(${dayIndex},${nextIndex},event)"><i class="fa-solid fa-book-open" aria-hidden="true"></i> 기록</button><button class="companion-button" onclick="completeTodaySpot(${dayIndex},${nextIndex},event)"><i class="fa-solid fa-check" aria-hidden="true"></i> 완료</button>`:`<button class="companion-button companion-primary" onclick="openMomentJournal(${dayIndex})">+ 순간 기록</button><button class="companion-button" onclick="switchTab('journal');selectJournalDay(${dayIndex})">하루 회고</button>`}</div>
    </section>
    ${renderLiveToolbar(dayIndex)}
    <div class="companion-change-reason" aria-label="상황에 맞게 일정 조정"><button onclick="adjustCompanionDay(${dayIndex},'비가 와서 실내 위주로 변경')">🌧️ 비가 와요</button><button onclick="adjustCompanionDay(${dayIndex},'교통 지연으로 남은 동선을 조정')">⏳ 이동 지연</button><button onclick="adjustCompanionDay(${dayIndex},'휴식 시간을 늘리고 무리하지 않는 일정으로 변경')">☕ 쉬고 싶어요</button><button onclick="openScheduleTuningModal(${dayIndex})">⚙️ 직접 조정</button></div>
    <div class="companion-section-title"><h3>하루의 흐름</h3><button class="companion-button" onclick="openAddSpotToDay(${dayIndex})">+ 일정 추가</button></div>
    <div class="companion-timeline">${companionTimeline(pending,dayIndex,{today:true}) || emptyTimelineHtml}</div>
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

/* ==========================================================================
   아이디어 1: 긴급 SOS & 병원·약국 소통 모달 (Priority 4-2)
   ========================================================================== */
function detectEmergencyCountryInfo(trip) {
  const text = `${(trip?.countries || []).join(' ')} ${trip?.title || ''} ${(trip?.cities || []).join(' ')}`.toLowerCase();
  
  const koreaConsular = { name: "외교부 영사콜센터 (24시간)", tel: "+82232100404", displayTel: "+82-2-3210-0404" };

  if (/(스페인|spain|madrid|barcelona|toledo|sevilla)/i.test(text)) {
    return {
      country: '스페인 (Spain)', langCode: 'es', langName: '스페인어',
      police: { name: "국립 경찰 (Policía 112)", tel: "112" },
      ambulance: { name: "구급·응급 (Ambulancia 112)", tel: "112" },
      embassy: { name: "주스페인 대한민국 대사관", tel: "+34913532000", displayTel: "+34-91-353-2000" },
      korea: koreaConsular
    };
  }
  if (/(일본|japan|tokyo|osaka|kyoto|fukuoka|sapporo)/i.test(text)) {
    return {
      country: '일본 (Japan)', langCode: 'ja', langName: '일본어',
      police: { name: "경찰 (警察 110)", tel: "110" },
      ambulance: { name: "구급·소방 (救急 119)", tel: "119" },
      embassy: { name: "주일 대한민국 대사관", tel: "+81334527611", displayTel: "+81-3-3452-7611" },
      korea: koreaConsular
    };
  }
  if (/(대만|taiwan|taipei|kaohsiung|중국|china)/i.test(text)) {
    return {
      country: '대만 / 중화권 (Taiwan/China)', langCode: 'zh', langName: '중국어',
      police: { name: "경찰 (報案 110)", tel: "110" },
      ambulance: { name: "구급 (救護車 119)", tel: "119" },
      embassy: { name: "주타이베이 한국대표부", tel: "+886227588320", displayTel: "+886-2-2758-8320" },
      korea: koreaConsular
    };
  }
  if (/(태국|thailand|bangkok|chiang mai|phuket)/i.test(text)) {
    return {
      country: '태국 (Thailand)', langCode: 'th', langName: '태국어',
      police: { name: "관광경찰 (1155) / 경찰 (191)", tel: "1155" },
      ambulance: { name: "구급·응급 (1669)", tel: "1669" },
      embassy: { name: "주태국 대한민국 대사관", tel: "+6622477537", displayTel: "+66-2-247-7537" },
      korea: koreaConsular
    };
  }
  if (/(베트남|vietnam|da nang|hanoi|ho chi minh)/i.test(text)) {
    return {
      country: '베트남 (Vietnam)', langCode: 'vi', langName: '베트남어',
      police: { name: "경찰 (Cảnh sát 113)", tel: "113" },
      ambulance: { name: "구급 (Cấp cứu 115)", tel: "115" },
      embassy: { name: "주베트남 대한민국 대사관", tel: "+842438315111", displayTel: "+84-24-3831-5111" },
      korea: koreaConsular
    };
  }
  if (/(프랑스|france|paris|nice|lyon)/i.test(text)) {
    return {
      country: '프랑스 (France)', langCode: 'fr', langName: '프랑스어',
      police: { name: "경찰 (Police 17 / EU 112)", tel: "112" },
      ambulance: { name: "구급 (SAMU 15 / EU 112)", tel: "112" },
      embassy: { name: "주프랑스 대한민국 대사관", tel: "+33147530101", displayTel: "+33-1-47-53-01-01" },
      korea: koreaConsular
    };
  }
  if (/(페루|peru|lima|cusco|칠레|chile|santiago|아르헨티나|argentina|buenos aires|볼리비아|bolivia|la paz|uyuni)/i.test(text)) {
    return {
      country: '남미 (South America)', langCode: 'es', langName: '스페인어',
      police: { name: "경찰 (Policía 105/911/133)", tel: "911" },
      ambulance: { name: "구급 (Ambulancia 116/107/131)", tel: "116" },
      embassy: { name: "외교부 영사콜센터 (24H)", tel: "+82232100404", displayTel: "+82-2-3210-0404" },
      korea: koreaConsular
    };
  }
  if (/(미국|usa|new york|los angeles|괌|사이판|하와이|hawaii|캐나다|canada)/i.test(text)) {
    return {
      country: '미국 / 북미 (USA/Canada)', langCode: 'en', langName: 'English',
      police: { name: "경찰 (Police 911)", tel: "911" },
      ambulance: { name: "구급 (Ambulance 911)", tel: "911" },
      embassy: { name: "주미합중국 대한민국 대사관", tel: "+12029395600", displayTel: "+1-202-939-5600" },
      korea: koreaConsular
    };
  }
  return {
    country: '해외 여행 긴급 비상 (Global)', langCode: 'en', langName: 'English',
    police: { name: "국제 긴급 경찰 (Police 112/911)", tel: "112" },
    ambulance: { name: "국제 긴급 구급 (Ambulance 112/911)", tel: "112" },
    embassy: { name: "외교부 영사콜센터 (24시간)", tel: "+82232100404", displayTel: "+82-2-3210-0404" },
    korea: koreaConsular
  };
}

function getSosMedicalPhrases() {
  return [
    {
      id: 'stomach',
      cat: 'pharmacy',
      title: '배·위통 / 경련 / 위장약',
      icon: 'fa-solid fa-pills',
      ko: '배가 너무 아프고 경련이 있어요. 위장약/진경제 있나요?',
      es: { phrase: '¿Tiene pastillas para el dolor de estómago y cólicos?', pron: '띠에네 빠스띠야스 빠라 엘 돌로르 데 에스또마고 이 꼴리꼬스?' },
      en: { phrase: 'My stomach hurts severely with cramps. Do you have stomach medication?', pron: '마이 스터먹 헐츠 시비얼리 위드 크램프스. 두 유 해브 스터먹 메디케이션?' },
      ja: { phrase: '胃とお腹がひどく痛みます。胃腸薬や鎮痙剤はありますか？', pron: '이토 오나카가 히도쿠 이타미마스. 이쵸야쿠와 아리마스카?' },
      zh: { phrase: '我肚子很痛且有痙攣。請問有胃腸藥或止痛藥嗎？', pron: '워 두즈 헌 통 치에 여우 징롼. 칭원 여우 웨이창야오 마?' },
      fr: { phrase: "J'ai très mal au ventre avec des crampes. Avez-vous des médicaments ?", pron: '줴 트레 말 오 방트르 아베크 데 크랑프.' },
      th: { phrase: 'ปวดท้องรุนแรงและมีอาการเกร็ง มียาแก้ปวดท้องไหมครับ/ค่ะ', pron: '뿌엇 통 룬랭 래 미 아깐 그랭 미 야깨뿌엇통 마이 캅/카' },
      vi: { phrase: 'Tôi bị đau dạ dày dữ dội và co thắt. Có thuốc giảm đau không?', pron: '또이 비 다우 자 자이 즈 조이 바 꺼 탓.' }
    },
    {
      id: 'diarrhea',
      cat: 'pharmacy',
      title: '설사 / 장염 / 지사제',
      icon: 'fa-solid fa-kit-medical',
      ko: '설사와 탈수가 심해요. 지사제(설사 멈추는 약)와 전해질 수액가루 주세요.',
      es: { phrase: 'Tengo diarrea fuerte. ¿Tiene pastillas antidiarreicas y suero oral?', pron: '뗑고 디아레아 푸에르떼. 띠에네 빠스띠야스 안띠디아레이까스?' },
      en: { phrase: 'I have severe diarrhea. Please give me antidiarrheal medication and hydration salts.', pron: '아이 해브 시비어 다이어리어. 플리즈 기브 미 안티다이어리얼 메디케이션.' },
      ja: { phrase: '下痢と脱水がひどいです。下痢止めと経口補水塩をください。', pron: '게리토 닷수이가 히도이데스. 게리도메오 쿠다사이.' },
      zh: { phrase: '嚴重腹瀉與脫水。請給我止瀉藥和口服補液鹽。', pron: '옌중 푸시에 위 퉈수이. 칭 게이 워 즈시에야오.' },
      fr: { phrase: 'J’ai une forte diarrhée. Avez-vous un antidiarrhéique et des sels de réhydratation ?', pron: '줴 윈 포르트 디아레. 아베-부 욍 앙티디아레이크?' },
      th: { phrase: 'ท้องเสียหนักมาก ขอยาแก้ท้องเสียและผงเกลือแร่ครับ/ค่ะ', pron: '통시아 낙 막 커 야깨통시아 래 퐁 끄르아 래 캅/카' },
      vi: { phrase: 'Tôi bị tiêu chảy nặng. Làm ơn cho tôi thuốc cầm tiêu chảy.', pron: '또이 비 띠에우 차이 낭. 람 온 쪼 또이 투옥 깜 띠에우 차이.' }
    },
    {
      id: 'fever',
      cat: 'pharmacy',
      title: '고열 / 두통 / 해열진통제',
      icon: 'fa-solid fa-temperature-arrow-up',
      ko: '열이 많이 나고 두통이 심합니다. 타이레놀(아세트아미노펜)이나 해열제 주세요.',
      es: { phrase: 'Tengo fiebre alta y fuerte dolor de cabeza. ¿Tiene paracetamol o ibuprofeno?', pron: '뗑고 피에브레 알따 이 푸에르떼 돌로르 데 까베사. 띠에네 빠라세따몰?' },
      en: { phrase: 'I have a high fever and headache. Do you have Paracetamol (Tylenol) or Ibuprofen?', pron: '아이 해브 어 하이 피버 앤 헤덱. 두 유 해브 파라세타몰?' },
      ja: { phrase: '高熱と激しい頭痛があります。アセトアミノフェンや解熱鎮痛剤をください。', pron: '코오네츠토 하게시이 즈츠우가 아리마스. 카이네츠 친츠자이오 쿠다사이.' },
      zh: { phrase: '我發高燒且劇烈頭痛。請給我退燒藥（乙醯胺酚/布洛芬）。', pron: '워 파 가오샤오 치에 쥐리에 터우통. 칭 게이 워 투이샤오야오.' },
      fr: { phrase: 'J’ai une forte fièvre et un mal de tête. Avez-vous du paracétamol ?', pron: '줴 윈 포르트 피에브르 에 욍 말 드 테트. 아베-부 뒤 파라세타몰?' },
      th: { phrase: 'มีไข้สูงและปวดศีรษะ ขอยาลดไข้พาราเซตามอลครับ/ค่ะ', pron: '미 카이 숭 래 뿌엇 시사 커 야롯카이 파라세타몰 캅/카' },
      vi: { phrase: 'Tôi bị sốt cao và đau đầu. Cho tôi thuốc hạ sốt paracetamol.', pron: '또이 비 솟 까오 바 다우 더우. 쪼 또이 투옥 하 솟 파라세타몰.' }
    },
    {
      id: 'soroche',
      cat: 'pharmacy',
      title: '고산병 / 숨참 / 소로체',
      icon: 'fa-solid fa-mountain',
      ko: '고산병 증상(어지럼증, 숨참, 두통)이 심해요. 고산병 약(소로체/다이아목스) 있나요?',
      es: { phrase: 'Sufro de mal de altura (soroche). ¿Tiene pastillas para el soroche o Acetazolamida (Diamox)?', pron: '수프로 데 말 데 알뚜라(소로체). 띠에네 빠스띠야스 빠라 엘 소로체?' },
      en: { phrase: 'I have severe altitude sickness. Do you have Diamox (Acetazolamide)?', pron: '아이 해브 시비어 알티튜드 식니스. 두 유 해브 다이아목스?' },
      ja: { phrase: '高山病の症状がひどいです。高山病の薬（ダイアモックス）はありますか？', pron: '코오잔뵤오노 쇼오조오가 히도이데스. 다이아목쿠스와 아리마스카?' },
      zh: { phrase: '我高山症很嚴重。請問有高山症藥（丹木斯/Acetazolamide）嗎？', pron: '워 가오산정 헌 옌중. 칭원 여우 가오산정야오 마?' },
      fr: { phrase: 'Je souffre du mal aigu des montagnes. Avez-vous de l’acétazolamide (Diamox) ?', pron: '주 수프르 뒤 말 에귀 데 몽타뉴.' },
      th: { phrase: 'แพ้ความสูงอย่างหนัก มียารักษาอาการแพ้ความสูง (Diamox) ไหมครับ/ค่ะ', pron: '패 쾀 숭 양 낙 미 야락사 아깐 패 쾀 숭 마이 캅/카' },
      vi: { phrase: 'Tôi bị sốc độ cao nghiêm trọng. Có thuốc chống say độ cao Diamox không?', pron: '또이 비 속 도 까오 응이엠 쫑. 꼬 투옥 쫑 싸이 도 까오 콩?' }
    },
    {
      id: 'allergy',
      cat: 'emergency',
      title: '⚠️ 땅콩/갑각류 심한 알레르기 (응급)',
      icon: 'fa-solid fa-triangle-exclamation text-rose-500',
      ko: '⚠️ 긴급! 땅콩/갑각류 심한 알레르기입니다! 숨쉬기 힘들고 목이 붓습니다. 응급 처치가 필요합니다!',
      es: { phrase: '¡EMERGENCIA! ¡Tengo una reacción alérgica grave! No puedo respirar bien, necesito atención médica urgente.', pron: '¡에메르헨시아! ¡뗑고 우나 레악시온 알레르히까 그라베! 노 뿌에도 레스삐라르 비엔!' },
      en: { phrase: 'EMERGENCY! Severe allergic reaction! Trouble breathing and throat swelling. Need urgent hospital help!', pron: '이머전시! 시비어 알러직 리액션! 트러블 브리딩. 니드 어전트 헬프!' },
      ja: { phrase: '【緊急】重度のアレルギー発作です！呼吸困難です。大至急、救急医療をお願いします！', pron: '긴큐우! 쥬우도노 아레루기이 홋사데스! 코큐우 콘난데스!' },
      zh: { phrase: '【緊急求助】嚴重過敏反應！呼吸困難且喉嚨腫脹，請立刻送醫急救！', pron: '진지 치우주! 옌중 궈민 판잉! 후시 쿤난, 칭 리커 쑹이 지지우!' },
      fr: { phrase: 'URGENCE ! Réaction allergique sévère ! Difficulté respiratoire, besoin de soins urgents !', pron: '위르장스 ! 레악시옹 알레르지크 세베르 !' },
      th: { phrase: 'ฉุกเฉิน! แพ้อาหารรุนแรง หายใจไม่ออก ต้องการความช่วยเหลือทางการแพทย์ด่วนครับ/ค่ะ', pron: '툭천! 패 아한 룬랭 하이짜이 마이 억 떵깐 쾀추아이르어 두언 캅/카' },
      vi: { phrase: 'CẤP CỨU! Dị ứng cực kỳ nghiêm trọng! Khó thở, cần cấp cứu y tế khẩn cấp!', pron: '깝 꾸우! 지 응 극 끼 응이엠 쫑! 커 터, 껀 깝 꾸우 칸 겁!' }
    },
    {
      id: 'theft',
      cat: 'safety',
      title: '소매치기 / 도난 / 경찰 리포트',
      icon: 'fa-solid fa-shield-halved',
      ko: '여권과 지갑을 소매치기(도난)당했습니다. 보험 청구용 경찰 신고서(Police Report)가 필요합니다.',
      es: { phrase: 'He sufrido un robo. Me robaron el pasaporte y la cartera. Necesito hacer una denuncia policial.', pron: '에 수프리도 운 로보. 메 로바론 엘 빠사뽀르떼. 네세시또 우나 데눈시아 뽈리시알.' },
      en: { phrase: 'My passport and wallet were stolen. I need to make a police report for insurance.', pron: '마이 패스포트 앤 월렛 워 스톨른. 아이 니드 투 메이크 어 폴리스 리포트.' },
      ja: { phrase: 'スリ（盗難）に遭いパスポートと財布を盗まれました。警察の事故届（ポリスレポート）が必要です。', pron: '스리니 아이 파스포오토가 누스마레마시타. 케이사츠노 토도케가 히츠요오데스.' },
      zh: { phrase: '我的護照和皮夾被偷了。我需要報案開立警方報案證明（Police Report）。', pron: '워 더 후자오 허 피지아 베이 터우 러. 워 쉬야오 바오안 카이리 징팡 바오안정밍.' },
      fr: { phrase: 'On m’a volé mon passeport et mon portefeuille. J’ai besoin d’une déclaration de vol à la police.', pron: '옹 마 볼레 몽 파스포르. 줴 베주앙 뒨 데클라라시옹 드 볼.' },
      th: { phrase: 'ถูกขโมยพาสปอร์ตและกระเป๋าเงิน ต้องการใบแจ้งความจากตำรวจครับ/ค่ะ', pron: '툭 카모이 파스폿 래 끄라빠오 응언 떵깐 바이 쨍쾀 캅/카' },
      vi: { phrase: 'Tôi bị mất cắp hộ chiếu và ví tiền. Cần biên bản trình báo công an để làm bảo hiểm.', pron: '또이 비 떳 깝 호 찌에우 바 비 띠엔. 껀 까인 삿 바오 까오.' }
    },
    {
      id: 'wound',
      cat: 'pharmacy',
      title: '상처 / 출혈 / 소독약·붕대',
      icon: 'fa-solid fa-bandage',
      ko: '넘어져서 상처가 나고 피가 납니다. 소독약(포비돈)과 멸균 거즈, 밴드 주세요.',
      es: { phrase: 'Me lastimé y estoy sangrando. ¿Tiene antiséptico, gasas y apósitos (tiritas)?', pron: '메 라스띠메 이 에스또이 상그란도. 띠에네 안띠셉띠꼬, 가사스 이 띠리따스?' },
      en: { phrase: 'I got injured and am bleeding. Do you have antiseptic, sterile gauze, and bandages?', pron: '아이 갓 인저드 앤 앰 블리딩. 두 유 해브 안티셉틱, 거즈 앤 밴디지스?' },
      ja: { phrase: '怪我をして血が出ています。消毒液とガーゼ、絆創膏をください。', pron: '케가오 시테 치가 데테이마스. 쇼오도쿠에키토 반소오코오오 쿠다사이.' },
      zh: { phrase: '我受傷流血了。請問有消毒藥水、無菌紗布和創可貼嗎？', pron: '워 서우상 류쉐 러. 칭원 여우 샤오두야오수이, 샤부 한 촹커톄 마?' },
      fr: { phrase: 'Je suis blessé et je saigne. Avez-vous un antiseptique, des compresses et des pansements ?', pron: '주 슈이 블레세 에 주 센. 아베-부 욍 앙티셉티크?' },
      th: { phrase: 'มีแผลและเลือดออก ขอยาฆ่าเชื้อ ผ้าก๊อซ และพลาสเตอร์ยาครับ/ค่ะ', pron: '미 팰 래 르앗 억 커 야카츠아 래 플라스터 야 캅/카' },
      vi: { phrase: 'Tôi bị thương và chảy máu. Cho tôi thuốc sát trùng, gạc y tế và băng keo cá nhân.', pron: '또이 비  thuong 바 차이 마우. 쪼 또이 투옥 삿 쭝.' }
    },
    {
      id: 'emergency',
      cat: 'emergency',
      title: '🚨 종합병원 응급실 (ER) 안내 요청',
      icon: 'fa-solid fa-truck-medical text-rose-500',
      ko: '의료 응급 상황입니다! 가장 가까운 종합병원 응급실(Hospital Emergency)로 데려다주세요!',
      es: { phrase: '¡Es una emergencia médica! Por favor, lléveme al servicio de urgencias del hospital más cercano.', pron: '¡에스 우나 에메르헨시아 메디까! 뽀르 파보르, 예베메 알 오스삐딸 마스 세르까노.' },
      en: { phrase: 'This is a medical emergency! Please take me to the nearest hospital Emergency Room (ER)!', pron: '디스 이즈 어 메디컬 이머전시! 플리즈 테이크 미 투 더 니어리스트 ER!' },
      ja: { phrase: '医療緊急事態です！最寄りの総合病院の救急外来（ER）へ連れて行ってください！', pron: '이료오 긴큐우 지타이데스! 큐우큐우 가이라에 츠레테잇테 쿠다사이!' },
      zh: { phrase: '這是醫療緊急狀況！請立刻帶我去最近的綜合醫院急診室（ER）！', pron: '저 스 이랴오 진지 좡쾅! 칭 리커 다이 워 취 쭈이 진 더 이위안 지전스!' },
      fr: { phrase: 'Urgence médicale ! S’il vous plaît, emmenez-moi au service des urgences de l’hôpital le plus proche !', pron: '위르장스 메디칼! 앙므네-무아 오 쥐르장스 드 롭피탈.' },
      th: { phrase: 'เหตุฉุกเฉินทางการแพทย์! ช่วยพาไปห้องฉุกเฉินของโรงพยาบาลที่ใกล้ที่สุดด่วนครับ/ค่ะ', pron: '헷 툭천 탕 깐 패! 추아이 파 빠이 헝툭천 롱파야반 티 끌라이 티쑷 캅/카' },
      vi: { phrase: 'Tình huống cấp cứu y tế! Làm ơn đưa tôi đến phòng cấp cứu bệnh viện gần nhất!', pron: '띤 후옹 깝 꾸우 이 떼! 람 온 드어 또이 덴 퐁 깝 꾸우.' }
    }
  ];
}

window.__sosCurrentLang = 'auto';
window.__sosActiveCategory = 'all';
window.__sosExpandedSymptomId = null;

function renderSosEmergencyContent(selectedLang = null, activeCategory = null, expandedSymptomId = undefined) {
  const container = document.getElementById('sos-emergency-content');
  if (!container) return;

  if (selectedLang !== null) window.__sosCurrentLang = selectedLang;
  if (activeCategory !== null) window.__sosActiveCategory = activeCategory;
  if (expandedSymptomId !== undefined) window.__sosExpandedSymptomId = expandedSymptomId;

  const trip = getActiveTrip();
  const info = detectEmergencyCountryInfo(trip);

  let lang = window.__sosCurrentLang;
  if (lang === 'auto') lang = info.langCode || 'en';

  const phrases = getSosMedicalPhrases();
  const filteredPhrases = window.__sosActiveCategory === 'all'
    ? phrases
    : phrases.filter(p => p.cat === window.__sosActiveCategory);

  const langButtons = [
    { code: 'auto', label: `현지어 (${info.langName})` },
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
    { code: 'ja', label: '日本語' },
    { code: 'zh', label: '中文' },
    { code: 'fr', label: 'Français' },
    { code: 'th', label: 'ไทย' },
    { code: 'vi', label: 'Tiếng Việt' },
    { code: 'ko', label: '한국어' }
  ];

  container.innerHTML = `
    <!-- 상단 국가 안내 배너 -->
    <div class="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25">
      <div class="flex items-center gap-2 min-w-0">
        <span class="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
          <i class="fa-solid fa-location-dot"></i>
        </span>
        <div class="min-w-0">
          <div class="text-xs font-black text-rose-400 truncate">${escapeHtml(info.country)}</div>
          <div class="text-[10px] text-slate-400">오프라인에서도 즉시 작동하는 비상 다이얼 & 증상 카드</div>
        </div>
      </div>
      <span class="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold shrink-0 border border-rose-500/30">100% 오프라인</span>
    </div>

    <!-- 3대 긴급 전화 퀵 다이얼 그리드 -->
    <div>
      <div class="text-[11px] font-bold text-slate-400 mb-1.5 flex items-center justify-between">
        <span>현지 긴급 전화 (터치 시 바로 통화 연결)</span>
        <span class="text-[10px] text-amber-400">외교부 24H 영사콜센터 연동</span>
      </div>
      <div class="sos-dial-grid">
        <a href="tel:${info.police.tel}" class="sos-dial-card is-police">
          <i class="fa-solid fa-shield-halved text-sky-400 text-sm mb-0.5"></i>
          <span class="sos-dial-name">현지 경찰</span>
          <span class="sos-dial-num text-sky-300">${info.police.tel}</span>
        </a>
        <a href="tel:${info.ambulance.tel}" class="sos-dial-card is-ambulance">
          <i class="fa-solid fa-truck-medical text-rose-400 text-sm mb-0.5"></i>
          <span class="sos-dial-name">구급·응급</span>
          <span class="sos-dial-num text-rose-400">${info.ambulance.tel}</span>
        </a>
        <a href="tel:${info.korea.tel}" class="sos-dial-card is-embassy" title="24시간 한국어 사건사고 및 통역 지원">
          <i class="fa-solid fa-phone-volume text-amber-400 text-sm mb-0.5"></i>
          <span class="sos-dial-name">영사콜센터</span>
          <span class="sos-dial-num text-amber-400 text-xs">${info.korea.displayTel}</span>
        </a>
      </div>
    </div>

    <!-- 증상 소통 플래시카드 영역 -->
    <div class="pt-1">
      <div class="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div class="text-xs font-black text-white flex items-center gap-1.5">
          <i class="fa-solid fa-notes-medical text-rose-400"></i>
          <span>약국·병원·응급 증상 소통 카드</span>
        </div>
        <!-- 카테고리 필터 -->
        <div class="flex items-center gap-1 text-[11px]">
          <button type="button" onclick="renderSosEmergencyContent(null,'all',undefined)" class="px-2 py-0.5 rounded-lg font-bold transition ${window.__sosActiveCategory==='all'?'bg-rose-500 text-slate-950':'text-slate-400 bg-[#1e293b]'}">전체</button>
          <button type="button" onclick="renderSosEmergencyContent(null,'pharmacy',undefined)" class="px-2 py-0.5 rounded-lg font-bold transition ${window.__sosActiveCategory==='pharmacy'?'bg-rose-500 text-slate-950':'text-slate-400 bg-[#1e293b]'}">약국/약품</button>
          <button type="button" onclick="renderSosEmergencyContent(null,'emergency',undefined)" class="px-2 py-0.5 rounded-lg font-bold transition ${window.__sosActiveCategory==='emergency'?'bg-rose-500 text-slate-950':'text-slate-400 bg-[#1e293b]'}">응급/병원</button>
          <button type="button" onclick="renderSosEmergencyContent(null,'safety',undefined)" class="px-2 py-0.5 rounded-lg font-bold transition ${window.__sosActiveCategory==='safety'?'bg-rose-500 text-slate-950':'text-slate-400 bg-[#1e293b]'}">도난/안전</button>
        </div>
      </div>

      <!-- 언어 선택 바 -->
      <div class="flex items-center gap-1 overflow-x-auto pb-1.5 no-scrollbar mb-2 text-xs">
        ${langButtons.map(b => `
          <button type="button" onclick="renderSosEmergencyContent('${b.code}',null,undefined)" class="px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition cursor-pointer shrink-0 ${window.__sosCurrentLang === b.code ? 'bg-amber-500 text-slate-950 shadow' : 'bg-[#141c2e] border border-[#23304c] text-slate-300 hover:text-white'}">
            ${escapeHtml(b.label)}
          </button>
        `).join('')}
      </div>

      <!-- 증상 카드 목록 -->
      <div class="sos-phrase-list custom-scrollbar">
        ${filteredPhrases.map(p => {
          const targetLang = (lang === 'auto') ? (info.langCode || 'en') : lang;
          const phraseData = p[targetLang] || p.en || { phrase: p.ko, pron: '' };
          const isHuge = (window.__sosExpandedSymptomId === p.id);

          return `
            <div class="sos-phrase-card ${isHuge ? 'is-huge' : ''}" id="sos-card-${p.id}">
              <div class="flex items-center justify-between gap-2 mb-1.5">
                <span class="text-xs font-black text-rose-400 flex items-center gap-1.5">
                  <i class="${p.icon}" aria-hidden="true"></i>
                  <span>${escapeHtml(p.title)}</span>
                </span>
                <div class="flex items-center gap-1">
                  <button type="button" onclick="toggleSosPhraseHuge('${p.id}')" class="px-2 py-0.5 rounded bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-[10px] font-bold text-slate-200 transition cursor-pointer" title="약사/의사에게 보여줄 대형 글씨 토글">
                    <i class="fa-solid ${isHuge ? 'fa-compress' : 'fa-magnifying-glass-plus'} text-amber-400"></i>
                    <span>${isHuge ? '보통 크기' : '대형 확대 (AAA)'}</span>
                  </button>
                  <button type="button" onclick="copySosPhraseText('${escapeHtml(phraseData.phrase).replace(/'/g, "\\'")}', this)" class="px-2 py-0.5 rounded bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-[10px] font-bold text-slate-200 transition cursor-pointer" title="복사하기">
                    <i class="fa-solid fa-copy text-sky-400"></i> <span>복사</span>
                  </button>
                </div>
              </div>

              <!-- 현지어 본문 (초고대비) -->
              <div class="sos-phrase-main">${escapeHtml(phraseData.phrase)}</div>

              <!-- 한글 발음 표기 -->
              ${phraseData.pron ? `<div class="sos-phrase-phonetic"><i class="fa-solid fa-volume-high mr-1 text-[10px] opacity-70"></i>${escapeHtml(phraseData.pron)}</div>` : ''}

              <!-- 한국어 뜻 설명 -->
              <div class="sos-phrase-meaning">의미: ${escapeHtml(p.ko)}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}
window.renderSosEmergencyContent = renderSosEmergencyContent;

function toggleSosPhraseHuge(symptomId) {
  const current = window.__sosExpandedSymptomId;
  window.__sosExpandedSymptomId = (current === symptomId) ? null : symptomId;
  renderSosEmergencyContent();
}
window.toggleSosPhraseHuge = toggleSosPhraseHuge;

function copySosPhraseText(text, btnEl) {
  if (!text) return;
  const cb = navigator.clipboard;
  if (cb && typeof cb.writeText === 'function') {
    cb.writeText(text).then(() => {
      if (typeof showToast === 'function') showToast('증상 문구가 복사되었습니다.');
      if (btnEl) {
        const orig = btnEl.innerHTML;
        btnEl.innerHTML = '<i class="fa-solid fa-check text-emerald-400"></i> 복사됨';
        setTimeout(() => { btnEl.innerHTML = orig; }, 1500);
      }
    }).catch(() => fallbackCopyTaxiCardText(text));
  } else {
    fallbackCopyTaxiCardText(text);
  }
}
window.copySosPhraseText = copySosPhraseText;

function openSosEmergencyModal() {
  renderSosEmergencyContent('auto', 'all', null);
  if (typeof openModal === 'function') openModal('modal-sos-emergency');
}
window.openSosEmergencyModal = openSosEmergencyModal;

/* ==========================================================================
   아이디어 3: 가계부 일일 예산 소진 속도 (Burn-Rate) & 페이싱 HUD (Priority 4-3)
   ========================================================================== */
function calculateBudgetPacing(trip, walletData) {
  const totalDays = Math.max(1, trip?.days?.length || 1);
  
  let currentDayNum = 1;
  if (trip?.startDate) {
    const start = new Date(trip.startDate);
    const today = new Date();
    start.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    const diffDays = Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays >= 1 && diffDays <= totalDays) {
      currentDayNum = diffDays;
    } else if (diffDays > totalDays) {
      currentDayNum = totalDays;
    }
  } else if (Number.isInteger(State?.activePlanDayIndex)) {
    currentDayNum = Math.min(totalDays, State.activePlanDayIndex + 1);
  }

  const remainingDays = Math.max(1, totalDays - currentDayNum + 1);

  const totalBudgetKrw = Number(walletData?.totalBudgetKrw || trip?.totalBudgetKrw || 0);
  const totalSpentKrw = Number(walletData?.totalSpentKrw || 0);

  let todaySpentKrw = 0;
  const currentDayIndex = currentDayNum - 1;
  const dayDate = trip?.days?.[currentDayIndex]?.date;
  const todayExpenses = (trip?.expenses || []).filter(e => {
    return e.dayIndex === currentDayIndex || (dayDate && e.date === dayDate);
  });
  todaySpentKrw = todayExpenses.reduce((sum, e) => {
    const rate = typeof getCurrencyRate === 'function' ? getCurrencyRate(e.currency || 'KRW') : 1;
    return sum + Math.round((Number(e.amount) || 0) * rate);
  }, 0);

  const remainingBudgetKrw = Math.max(0, totalBudgetKrw - totalSpentKrw + todaySpentKrw);
  const dailyRecommendedBudget = Math.round(remainingBudgetKrw / remainingDays);

  let burnRatio = 0;
  if (dailyRecommendedBudget > 0) {
    burnRatio = todaySpentKrw / dailyRecommendedBudget;
  } else if (todaySpentKrw > 0) {
    burnRatio = 2.0;
  }

  let statusKey = 'safe';
  let statusLabel = '양호 (안전한 소비 속도)';
  let barColor = '#10b981';

  if (burnRatio > 1.3) {
    statusKey = 'danger';
    statusLabel = '경고 (오늘 권장 예산 초과)';
    barColor = '#f43f5e';
  } else if (burnRatio > 1.0) {
    statusKey = 'warning';
    statusLabel = '주의 (내일 절약 권장)';
    barColor = '#f97316';
  } else if (burnRatio > 0.7) {
    statusKey = 'good';
    statusLabel = '적정 (균형 있는 소비)';
    barColor = '#f59e0b';
  }

  const pct = Math.min(100, Math.round(burnRatio * 100));

  return {
    totalDays,
    currentDayNum,
    remainingDays,
    totalBudgetKrw,
    totalSpentKrw,
    todaySpentKrw,
    remainingBudgetKrw,
    dailyRecommendedBudget,
    burnRatio,
    pct,
    statusKey,
    statusLabel,
    barColor
  };
}
window.calculateBudgetPacing = calculateBudgetPacing;

function updateBudgetPacingHud(trip, walletData) {
  const container = document.getElementById('budget-pacing-hud');
  if (!container) return;

  const pacing = calculateBudgetPacing(trip, walletData);

  if (pacing.totalBudgetKrw <= 0) {
    container.innerHTML = `
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <span class="text-xs font-black text-white flex items-center gap-1.5">
          <i class="fa-solid fa-gauge-high text-amber-400"></i>
          <span>일일 예산 소진 속도 (Burn-Rate)</span>
        </span>
        <button type="button" onclick="openInitialFundsModal()" class="text-[10px] text-amber-400 hover:text-amber-300 font-bold px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 transition flex items-center gap-1 cursor-pointer">
          <i class="fa-solid fa-plus text-[9px]"></i> 목표 예산 설정하기
        </button>
      </div>
      <p class="text-[11px] text-slate-400 leading-relaxed">
        목표 예산을 설정하시면 남은 여행 기간과 오늘 지출 속도를 실시간으로 분석하여 <b>일일 권장 지출액</b>과 <b>소진 페이싱 게이지</b>를 자동으로 안내해 드립니다.
      </p>
    `;
    return;
  }

  container.innerHTML = `
    <div class="flex items-center justify-between gap-2 flex-wrap">
      <span class="text-xs font-black text-white flex items-center gap-1.5">
        <i class="fa-solid fa-gauge-high text-amber-400"></i>
        <span>일일 예산 소진 속도 (Burn-Rate)</span>
      </span>
      <span class="pacing-badge status-${pacing.statusKey}">
        <i class="fa-solid fa-circle text-[7px]" aria-hidden="true"></i> ${pacing.statusLabel}
      </span>
    </div>

    <!-- 페이싱 프로그레스 바 -->
    <div class="pacing-progress-track">
      <div class="pacing-progress-bar" style="width: ${pacing.pct}%; background-color: ${pacing.barColor};"></div>
    </div>

    <div class="flex items-center justify-between gap-2 pt-0.5 flex-wrap text-[11px]">
      <div>
        <span class="text-slate-400">오늘 지출: </span>
        <span class="font-bold font-mono text-white">₩${pacing.todaySpentKrw.toLocaleString()}</span>
        <span class="text-slate-500 mx-1">/</span>
        <span class="text-slate-400">권장 한도: </span>
        <span class="font-bold font-mono text-amber-400">₩${pacing.dailyRecommendedBudget.toLocaleString()}</span>
        <span class="text-[10px] text-slate-400 ml-1">(${pacing.pct}%)</span>
      </div>
      <div class="text-slate-400">
        여정 <span class="font-bold text-white">Day ${pacing.currentDayNum}/${pacing.totalDays}</span> (남은 ${pacing.remainingDays}일간 일평균 <span class="text-emerald-400 font-bold font-mono">₩${pacing.dailyRecommendedBudget.toLocaleString()}</span> 가능)
      </div>
    </div>
  `;
}
window.updateBudgetPacingHud = updateBudgetPacingHud;

/* ==========================================================================
   아이디어 2: 길거리 음성/사진 퀵 캡슐 & AI 일기 완성 (Priority 4-4)
   ========================================================================== */
window.__capsuleSelectedMood = 'wonder';
window.__capsulePhotoData = null;
window.__capsuleSpeechRecognition = null;
window.__capsuleIsRecording = false;

function openQuickCapsuleModal() {
  window.__capsulePhotoData = null;
  renderQuickCapsuleContent();
  if (typeof openModal === 'function') openModal('modal-quick-capsule');
}
window.openQuickCapsuleModal = openQuickCapsuleModal;

function setCapsuleMood(moodKey) {
  window.__capsuleSelectedMood = moodKey;
  renderQuickCapsuleContent(false);
}
window.setCapsuleMood = setCapsuleMood;

function toggleCapsuleVoiceRecognition() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const statusEl = document.getElementById('capsule-mic-status');
  const micBtn = document.getElementById('capsule-mic-btn');

  if (!SpeechRec) {
    if (typeof showToast === 'function') showToast('현재 브라우저가 음성 인식을 지원하지 않습니다. 텍스트로 직접 입력해 주세요.');
    return;
  }

  if (window.__capsuleIsRecording && window.__capsuleSpeechRecognition) {
    try {
      window.__capsuleSpeechRecognition.stop();
    } catch (_) {}
    window.__capsuleIsRecording = false;
    if (micBtn) micBtn.classList.remove('is-recording');
    if (statusEl) statusEl.innerText = '음성 인식 완료 (텍스트를 확인하고 저장하세요)';
    return;
  }

  try {
    const recognition = new SpeechRec();
    recognition.lang = 'ko-KR';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      window.__capsuleIsRecording = true;
      if (micBtn) micBtn.classList.add('is-recording');
      if (statusEl) statusEl.innerHTML = '<span class="text-rose-400 font-bold animate-pulse">🎙️ 듣고 있습니다... 말씀해 주세요!</span>';
    };

    recognition.onresult = (event) => {
      const input = document.getElementById('capsule-text-input');
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript;
      }
      if (input && transcript) {
        input.value = transcript;
      }
    };

    recognition.onerror = (e) => {
      console.warn('SpeechRecognition error:', e);
      window.__capsuleIsRecording = false;
      if (micBtn) micBtn.classList.remove('is-recording');
      if (statusEl) statusEl.innerText = '음성 인식 대기 중';
      if (typeof showToast === 'function') showToast('음성 인식 오류: ' + (e.error || '권한을 확인하세요'));
    };

    recognition.onend = () => {
      window.__capsuleIsRecording = false;
      if (micBtn) micBtn.classList.remove('is-recording');
      if (statusEl) statusEl.innerText = '음성 인식 완료';
    };

    window.__capsuleSpeechRecognition = recognition;
    recognition.start();
  } catch (err) {
    console.warn('Failed to start speech recognition:', err);
    if (typeof showToast === 'function') showToast('마이크 연결 실패: ' + err.message);
  }
}
window.toggleCapsuleVoiceRecognition = toggleCapsuleVoiceRecognition;

function handleCapsulePhotoInput(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    window.__capsulePhotoData = e.target.result;
    const preview = document.getElementById('capsule-photo-preview');
    if (preview) {
      preview.innerHTML = `
        <div class="relative w-16 h-12 rounded-xl overflow-hidden border border-amber-500/40">
          <img src="${window.__capsulePhotoData}" class="w-full h-full object-fit-cover" alt="사진 미리보기">
          <button type="button" onclick="removeCapsulePhoto()" class="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-slate-900/80 text-white text-[9px] flex items-center justify-center">✕</button>
        </div>
      `;
    }
  };
  reader.readAsDataURL(file);
}
window.handleCapsulePhotoInput = handleCapsulePhotoInput;

function removeCapsulePhoto() {
  window.__capsulePhotoData = null;
  const preview = document.getElementById('capsule-photo-preview');
  if (preview) preview.innerHTML = '';
}
window.removeCapsulePhoto = removeCapsulePhoto;

function saveQuickCapsule() {
  const textInput = document.getElementById('capsule-text-input');
  const spotSelect = document.getElementById('capsule-spot-select');
  const text = (textInput?.value || '').trim();

  if (!text && !window.__capsulePhotoData) {
    if (typeof showToast === 'function') showToast('음성 또는 메모 내용을 입력해 주세요.');
    return;
  }

  const trip = getActiveTrip();
  if (!trip) return;

  trip.quickCapsules = trip.quickCapsules || [];
  const activeDayIndex = State?.activePlanDayIndex ?? 0;
  const currentDay = trip.days?.[activeDayIndex];

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const capsule = {
    id: 'cap-' + Date.now(),
    dayIndex: activeDayIndex,
    date: currentDay?.date || now.toISOString().split('T')[0],
    time: timeStr,
    text: text,
    mood: window.__capsuleSelectedMood,
    spotTitle: spotSelect?.value || '',
    photo: window.__capsulePhotoData || null,
    createdAt: now.toISOString()
  };

  trip.quickCapsules.unshift(capsule);

  if (typeof saveTrips === 'function') saveTrips();
  if (window.TripRepository && typeof TripRepository.saveAll === 'function' && State?.trips) {
    TripRepository.saveAll(State.trips);
  }

  if (typeof showToast === 'function') showToast('길거리 퀵 캡슐이 보관되었습니다!');

  if (textInput) textInput.value = '';
  window.__capsulePhotoData = null;
  renderQuickCapsuleContent();
}
window.saveQuickCapsule = saveQuickCapsule;

function deleteQuickCapsule(capsuleId) {
  const trip = getActiveTrip();
  if (!trip?.quickCapsules) return;
  trip.quickCapsules = trip.quickCapsules.filter(c => c.id !== capsuleId);
  if (typeof saveTrips === 'function') saveTrips();
  renderQuickCapsuleContent();
  if (typeof showToast === 'function') showToast('캡슐이 삭제되었습니다.');
}
window.deleteQuickCapsule = deleteQuickCapsule;

async function generateDiaryFromCapsules() {
  const trip = getActiveTrip();
  const activeDayIndex = State?.activePlanDayIndex ?? 0;
  const capsules = (trip?.quickCapsules || []).filter(c => c.dayIndex === activeDayIndex);

  if (!capsules.length) {
    if (typeof showToast === 'function') showToast('오늘 저장된 퀵 캡슐이 없습니다. 먼저 음성이나 메모를 남겨보세요.');
    return;
  }

  const currentDay = trip?.days?.[activeDayIndex];
  const cityName = currentDay?.city || '여행지';

  const notes = capsules.map((c, i) => {
    return `[${c.time} / 무드: ${c.mood} / 장소: ${c.spotTitle || '거리'}] ${c.text}`;
  }).join('\n');

  const prompt = `
당신은 최고의 감성 여행 에세이 작가입니다.
여행자가 오늘 ${cityName}에서 걸어 다니며 남긴 현장 음성 퀵 메모 캡슐들을 바탕으로, 마치 한 편의 감성적인 여행 다이어리(일기)를 정갈하게 작성해 주세요.

[현장 메모 캡슐 목록]:
${notes}

[작성 가이드라인]:
- 한국어 자연스러운 에세이 어조 (~했다, ~느꼈다 체 또는 ~했답니다)
- 300~500자 분량으로 하루의 공기와 분위기, 현장의 감각(맛, 소리, 감정)을 살려 풍성하게 집필
- 제목 1줄과 본문 2~3개 문단으로 구성
`.trim();

  const btn = document.getElementById('btn-ai-synthesize-diary');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> AI가 감성 일기를 집필 중입니다...';
  }

  try {
    if (typeof window.callGeminiApiWithFallback !== 'function') {
      throw new Error('Gemini API 함수가 준비되지 않았습니다.');
    }
    const diaryContent = await window.callGeminiApiWithFallback(prompt);
    
    if (!trip.activityRecords || Array.isArray(trip.activityRecords) || typeof trip.activityRecords !== 'object') {
      trip.activityRecords = {};
    }
    const newRecordId = 'rec-' + Date.now();
    const newRecord = {
      id: newRecordId,
      dayIndex: activeDayIndex,
      date: currentDay?.date || new Date().toISOString().split('T')[0],
      city: cityName,
      title: `${cityName}의 하루, 캡슐로 엮은 이야기`,
      content: diaryContent,
      photos: capsules.map(c => c.photo).filter(Boolean),
      mood: capsules[0]?.mood || 'wonder',
      createdAt: new Date().toISOString()
    };
    trip.activityRecords[newRecordId] = newRecord;

    if (typeof saveTrips === 'function') saveTrips();
    if (window.TripRepository && typeof TripRepository.saveAll === 'function' && State?.trips) {
      TripRepository.saveAll(State.trips);
    }

    if (typeof showToast === 'function') showToast('✨ AI 여행 일기가 성공적으로 집필되어 기록 탭에 등록되었습니다!');
    closeModal('modal-quick-capsule');
    if (typeof switchTab === 'function') switchTab('journal');
  } catch (err) {
    console.error('AI Diary Generation Error:', err);
    if (typeof showToast === 'function') showToast('일기 작성 실패: ' + (err.userMessage || err.message));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles mr-1"></i> 오늘의 캡슐로 AI 여행 일기 자동 집필';
    }
  }
}
window.generateDiaryFromCapsules = generateDiaryFromCapsules;

function renderQuickCapsuleContent(preserveText = true) {
  const container = document.getElementById('quick-capsule-content');
  if (!container) return;

  const trip = getActiveTrip();
  const activeDayIndex = State?.activePlanDayIndex ?? 0;
  const currentDay = trip?.days?.[activeDayIndex];
  const spots = currentDay?.spots || [];

  const existingText = preserveText ? (document.getElementById('capsule-text-input')?.value || '') : '';

  const moods = [
    { key: 'wonder', label: '✨ 감탄/경이' },
    { key: 'food', label: '🍜 꿀맛/맛집' },
    { key: 'tip', label: '💡 여행 꿀팁' },
    { key: 'warning', label: '⚠️ 주의/바가지' },
    { key: 'moved', label: '💖 감동' },
    { key: 'photo', label: '📸 포토스팟' }
  ];

  const todayCapsules = (trip?.quickCapsules || []).filter(c => c.dayIndex === activeDayIndex);

  container.innerHTML = `
    <!-- 음성 녹음 상단 섹션 -->
    <div class="text-center p-3.5 rounded-2xl bg-[#080b12] border border-[#1a2236] space-y-2.5">
      <div id="capsule-mic-btn" onclick="toggleCapsuleVoiceRecognition()" class="capsule-mic-btn shadow-lg" title="마이크 터치하여 음성으로 말하기">
        <i class="fa-solid fa-microphone"></i>
      </div>
      <div id="capsule-mic-status" class="text-xs text-slate-400 font-medium">마이크를 터치하여 현장 감상을 바로 말씀하세요</div>
    </div>

    <!-- 텍스트 입력창 -->
    <div class="space-y-1.5">
      <div class="flex items-center justify-between text-xs">
        <label for="capsule-text-input" class="font-bold text-slate-300">현장 메모 / 음성 변환 내용</label>
        <span class="text-[11px] text-amber-400">키보드 직접 입력 가능</span>
      </div>
      <textarea id="capsule-text-input" rows="3" placeholder="걷거나 구경하며 느낀 감상, 꿀팁, 가게 이름을 남겨보세요..." class="w-full p-3 rounded-xl bg-[#141c2e] border border-[#23304c] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500 leading-relaxed">${escapeHtml(existingText)}</textarea>
    </div>

    <!-- 무드 칩 선택 -->
    <div class="space-y-1.5">
      <div class="text-[11px] font-bold text-slate-400">감성 무드 선택</div>
      <div class="capsule-mood-grid">
        ${moods.map(m => `
          <button type="button" onclick="setCapsuleMood('${m.key}')" class="capsule-mood-chip ${window.__capsuleSelectedMood === m.key ? 'is-active' : ''}">
            ${escapeHtml(m.label)}
          </button>
        `).join('')}
      </div>
    </div>

    <!-- 연결 스팟 선택 & 사진 첨부 툴바 -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
      <div class="space-y-1">
        <label for="capsule-spot-select" class="text-[11px] font-bold text-slate-400">관련 스팟 (선택)</label>
        <select id="capsule-spot-select" class="w-full p-2 rounded-xl bg-[#141c2e] border border-[#23304c] text-slate-200 text-xs focus:outline-none focus:border-amber-500">
          <option value="">[스팟 미지정 / 길거리]</option>
          ${spots.map((s, idx) => `
            <option value="${escapeHtml(s.title || s.name)}">${idx + 1}. ${escapeHtml(s.title || s.name)}</option>
          `).join('')}
        </select>
      </div>
      <div class="space-y-1">
        <div class="text-[11px] font-bold text-slate-400">사진 1장 스냅 (선택)</div>
        <div class="flex items-center gap-2">
          <label for="capsule-photo-input" class="flex-1 py-2 px-3 rounded-xl bg-[#141c2e] hover:bg-[#1e293b] border border-[#23304c] text-xs font-bold text-slate-300 flex items-center justify-center gap-1.5 cursor-pointer transition">
            <i class="fa-solid fa-camera text-amber-400"></i> <span>사진 촬영/선택</span>
          </label>
          <input type="file" id="capsule-photo-input" accept="image/*" capture="environment" onchange="handleCapsulePhotoInput(event)" class="hidden">
          <div id="capsule-photo-preview"></div>
        </div>
      </div>
    </div>

    <!-- 저장 버튼 -->
    <button type="button" onclick="saveQuickCapsule()" class="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-md cursor-pointer flex items-center justify-center gap-1.5">
      <i class="fa-solid fa-floppy-disk"></i> <span>퀵 캡슐 보관하기</span>
    </button>

    <!-- 오늘 수집된 캡슐 목록 및 AI 합성 -->
    <div class="pt-3 border-t border-[#1a2236] space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-xs font-black text-white flex items-center gap-1.5">
          <i class="fa-solid fa-boxes-packing text-amber-400"></i>
          <span>오늘 수집된 캡슐 (${todayCapsules.length}개)</span>
        </span>
        ${todayCapsules.length > 0 ? `
          <button type="button" id="btn-ai-synthesize-diary" onclick="generateDiaryFromCapsules()" class="text-[11px] font-black text-amber-400 hover:text-amber-300 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 transition flex items-center gap-1 cursor-pointer" title="모은 캡슐로 Gemini AI 일기 완성">
            <i class="fa-solid fa-wand-magic-sparkles text-[10px]"></i> <span>AI 일기 완성</span>
          </button>
        ` : ''}
      </div>

      ${todayCapsules.length === 0 ? `
        <div class="text-[11px] text-slate-500 text-center py-4 bg-[#080b12] rounded-xl border border-[#141c2e]">
          아직 저장된 캡슐이 없습니다. 위 마이크를 터치해 첫 번째 감상을 남겨보세요!
        </div>
      ` : `
        <div class="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
          ${todayCapsules.map(c => `
            <div class="capsule-list-item">
              <div class="flex items-center justify-between gap-1">
                <span class="text-[10px] text-amber-400 font-mono font-bold">${escapeHtml(c.time)} · ${escapeHtml(c.spotTitle || '길거리')}</span>
                <button type="button" onclick="deleteQuickCapsule('${c.id}')" class="text-slate-500 hover:text-rose-400 text-[10px] cursor-pointer">✕</button>
              </div>
              <div class="text-xs text-white leading-relaxed select-all">${escapeHtml(c.text)}</div>
              ${c.photo ? `<img src="${c.photo}" class="w-16 h-12 object-fit-cover rounded-lg mt-1 border border-[#334155]" alt="캡슐 사진">` : ''}
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}
window.renderQuickCapsuleContent = renderQuickCapsuleContent;

/* ==========================================================================
   아이디어 5: 여행 에디토리얼 매거진 뷰 & PDF 제본 (Priority 4-5)
   ========================================================================== */
function openStoryMagazineModal() {
  renderStoryMagazineContent();
  if (typeof openModal === 'function') openModal('modal-story-magazine');
}
window.openStoryMagazineModal = openStoryMagazineModal;

function printStoryMagazine() {
  window.print();
}
window.printStoryMagazine = printStoryMagazine;

function renderStoryMagazineContent() {
  const container = document.getElementById('story-magazine-content');
  if (!container) return;

  const trip = getActiveTrip();
  if (!trip) {
    container.innerHTML = '<div class="text-center py-8 text-slate-400">선택된 여행이 없습니다.</div>';
    return;
  }

  const days = trip.days || [];
  const totalSpots = days.reduce((sum, d) => sum + (d.spots?.length || 0), 0);
  const completedSpots = days.reduce((sum, d) => sum + (d.spots?.filter(s => s.completed)?.length || 0), 0);
  const records = [
    ...Object.values(trip.journals || {}),
    ...Object.values(trip.activityRecords || {}),
    ...(trip.momentEntries || [])
  ];
  const capsules = trip.quickCapsules || [];

  const allPhotos = [];
  records.forEach(r => {
    (r.photos || []).forEach(p => allPhotos.push(p));
  });
  capsules.forEach(c => {
    if (c.photo) allPhotos.push(c.photo);
  });

  const heroPhoto = allPhotos[0] || '';

  const cities = [...new Set(days.map(d => d.city).filter(Boolean))];
  const cityFlow = cities.join(' ➔ ') || '여행 여정';

  const expenses = trip.expenses || [];
  const totalSpentKrw = expenses.reduce((sum, e) => {
    const rate = typeof getCurrencyRate === 'function' ? getCurrencyRate(e.currency || 'KRW') : 1;
    return sum + Math.round((Number(e.amount) || 0) * rate);
  }, 0);

  container.innerHTML = `
    <div id="story-magazine-container">
      <!-- 매거진 표지 (Editorial Masthead Cover) -->
      <div class="magazine-cover-card">
        <header class="magazine-masthead">
          <div class="magazine-masthead-title">THE SULSUL CHRONICLE</div>
          <div class="magazine-masthead-meta">VOYAGE MEMOIR · SPECIAL EDITION · ARCHIVE No. ${escapeHtml(trip.id || '01')}</div>
        </header>

        <div class="text-center space-y-3 mb-4">
          <h1 class="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">${escapeHtml(trip.title || '나의 인생 여행기')}</h1>
          <div class="text-xs sm:text-sm font-bold text-amber-400 font-mono tracking-wide">
            <i class="fa-solid fa-route mr-1.5"></i> ${escapeHtml(cityFlow)}
          </div>
          <div class="text-[11px] text-slate-400 font-medium">
            일정: ${escapeHtml(trip.startDate || '일정 미정')} ~ ${escapeHtml(trip.endDate || '')} · 총 ${days.length}일간의 여정
          </div>
          ${trip.desc ? `<p class="text-xs text-slate-300 max-w-lg mx-auto italic leading-relaxed pt-1">"${escapeHtml(trip.desc)}"</p>` : ''}
        </div>

        ${heroPhoto ? `
          <div class="w-full aspect-video rounded-2xl overflow-hidden border border-[#334155] shadow-2xl mb-4">
            <img src="${heroPhoto}" class="w-full h-full object-fit-cover" alt="대표 여행 사진">
          </div>
        ` : ''}

        <!-- 요약 스탯 바 -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-2 border-t border-[#1e293b]">
          <div class="p-2 rounded-xl bg-[#080b12] border border-[#1e263c]">
            <div class="text-[10px] text-slate-400">방문 스팟</div>
            <div class="text-sm font-black text-white mt-0.5">${completedSpots} / ${totalSpots} 완료</div>
          </div>
          <div class="p-2 rounded-xl bg-[#080b12] border border-[#1e263c]">
            <div class="text-[10px] text-slate-400">기록된 추억</div>
            <div class="text-sm font-black text-amber-400 mt-0.5">${records.length}편의 일기</div>
          </div>
          <div class="p-2 rounded-xl bg-[#080b12] border border-[#1e263c]">
            <div class="text-[10px] text-slate-400">수집된 사진</div>
            <div class="text-sm font-black text-sky-400 mt-0.5">${allPhotos.length}장의 스냅</div>
          </div>
          <div class="p-2 rounded-xl bg-[#080b12] border border-[#1e263c]">
            <div class="text-[10px] text-slate-400">총 여정 지출</div>
            <div class="text-sm font-black text-emerald-400 mt-0.5">₩${totalSpentKrw.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <!-- 각 일자별 스프레드 (Daily Spreads) -->
      <div class="space-y-4">
        ${days.map((day, idx) => {
          const daySpots = day.spots || [];
          const dayRecords = records.filter(r => r.dayIndex === idx || r.date === day.date);
          const dayPhotos = [];
          dayRecords.forEach(r => (r.photos || []).forEach(p => dayPhotos.push(p)));
          const dayCapsules = capsules.filter(c => c.dayIndex === idx || c.date === day.date);
          dayCapsules.forEach(c => { if (c.photo) dayPhotos.push(c.photo); });

          const dayExpenses = expenses.filter(e => e.dayIndex === idx || e.date === day.date);
          const daySpent = dayExpenses.reduce((sum, e) => {
            const rate = typeof getCurrencyRate === 'function' ? getCurrencyRate(e.currency || 'KRW') : 1;
            return sum + Math.round((Number(e.amount) || 0) * rate);
          }, 0);

          return `
            <article class="magazine-day-spread">
              <div class="magazine-day-header">
                <div>
                  <span class="magazine-day-num">DAY ${String(idx + 1).padStart(2, '0')}</span>
                  <span class="magazine-day-city ml-2">${escapeHtml(day.city || '도시 미정')}</span>
                </div>
                <div class="text-xs text-slate-400 font-mono">${escapeHtml(day.date || '')}</div>
              </div>

              <!-- 스팟 흐름 -->
              ${daySpots.length > 0 ? `
                <div class="magazine-spot-flow">
                  <span class="text-[10px] font-bold text-amber-400 mr-1"><i class="fa-solid fa-shoe-prints mr-1"></i> 동선:</span>
                  ${daySpots.map((s, sIdx) => `
                    <span class="magazine-spot-pill ${s.completed ? 'border-amber-500/50 text-amber-300' : ''}">
                      ${sIdx + 1}. ${escapeHtml(s.title || s.name)} ${s.time ? `<span class="text-slate-400 font-normal">(${escapeHtml(s.time)})</span>` : ''}
                    </span>
                    ${sIdx < daySpots.length - 1 ? '<i class="fa-solid fa-arrow-right text-[9px] text-slate-500"></i>' : ''}
                  `).join('')}
                </div>
              ` : ''}

              <!-- 일기 및 메모 본문 -->
              ${dayRecords.length > 0 ? dayRecords.map(r => `
                <div class="magazine-journal-quote">
                  <div class="font-bold text-xs text-amber-400 mb-1 flex items-center gap-1.5">
                    <i class="fa-solid fa-pen-fancy text-[10px]"></i>
                    <span>${escapeHtml(r.title || '오늘의 여행 일기')}</span>
                  </div>
                  <div class="leading-relaxed whitespace-pre-wrap">${escapeHtml(r.content || '')}</div>
                </div>
              `).join('') : (dayCapsules.length > 0 ? `
                <div class="magazine-journal-quote">
                  <div class="font-bold text-xs text-amber-400 mb-1">🎙️ 현장 퀵 캡슐 기록</div>
                  ${dayCapsules.map(c => `
                    <div class="text-xs leading-relaxed my-0.5">• [${escapeHtml(c.time)}] ${escapeHtml(c.text)}</div>
                  `).join('')}
                </div>
              ` : '')}

              <!-- 사진 그리드 -->
              ${dayPhotos.length > 0 ? `
                <div class="magazine-photo-grid">
                  ${dayPhotos.slice(0, 6).map(photo => `
                    <div class="magazine-photo-tile">
                      <img src="${photo}" alt="여행 사진" loading="lazy">
                    </div>
                  `).join('')}
                </div>
              ` : ''}

              <!-- 일일 지출 푸터 -->
              ${daySpent > 0 ? `
                <div class="flex items-center justify-between text-[11px] pt-3 mt-3 border-t border-[#1e293b] text-slate-400">
                  <span>오늘의 총 지출</span>
                  <span class="font-bold font-mono text-emerald-400">₩${daySpent.toLocaleString()}</span>
                </div>
              ` : ''}
            </article>
          `;
        }).join('')}
      </div>

      <!-- 에필로그 및 완주 스탬프 -->
      <div class="magazine-epilogue-card">
        <div class="text-base font-black text-white">JOURNEY ARCHIVE COMPLETED</div>
        <p class="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
          이 소중한 여행 기록은 술술트래블에 안전하게 보존되었습니다. 상단의 [A4 PDF / 인쇄] 버튼을 눌러 소장용 PDF 또는 책자로 제본하실 수 있습니다.
        </p>
        <div class="magazine-stamp">
          ★ SULSUL OFFICIAL EXPEDITION ★
        </div>
      </div>
    </div>
  `;
}
window.renderStoryMagazineContent = renderStoryMagazineContent;



