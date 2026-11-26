/* Presentation adapters. Trip mutations continue through the existing repository actions. */
function companionDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
  return match ? `${Number(match[2])}.${Number(match[3])}` : String(value || '날짜 미정');
}

function renderCompanionPlan() {
  const trip = getActiveTrip();
  const container = document.getElementById('big-plan-container');
  if (!trip || !container) return;
  SulsulTravel.PlanBlocks.ensureStructure(trip);
  const blocks = SulsulTravel.PlanBlocks.buildBlocks(trip);
  const spots = (trip.days || []).flatMap(day => day.spots || []).filter(spot=>!SulsulTravel.ScheduleChange.retired(spot));
  const hasSpots = spots.length > 0;
  const aiButtonHtml = hasSpots
    ? `<div class="flex items-center gap-2 flex-wrap">
         <button type="button" class="companion-button companion-primary" data-on-click="scheduleTuning.open" data-day="all" title="전체 일정 재배치, 교통 지연/기상 변수 대응 및 템포 조율"><i class="fa-solid fa-bolt text-amber-400" aria-hidden="true"></i> AI 스마트 일정 튜닝</button>
         <button type="button" class="companion-button text-xs opacity-75 hover:opacity-100" data-on-click="draftStudio.open" title="여행 설정(국가/도시/기간) 및 초안 편집 스튜디오 열기"><i class="fa-solid fa-pen-to-square" aria-hidden="true"></i> 초안 편집</button>
       </div>`
    : `<button type="button" class="companion-button companion-primary" data-on-click="draftStudio.open" title="여행 기본 정보 기반 최초 AI 일정 초안 생성"><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> AI 초안 만들기</button>`;
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
        <button type="button" class="companion-block-open" data-on-click="planBlocks.open" data-block-index="${index}" aria-label="${escapeHtml(block.title || block.place)} 세부 계획 열기">
          <span class="companion-number">${String(index + 1).padStart(2, '0')}</span>
          <span class="companion-block-copy"><span class="companion-block-meta">DAY ${first}${last !== first ? `–${last}` : ''} <span>· ${escapeHtml(companionDate(block.startDate))}${last !== first ? ` – ${escapeHtml(companionDate(block.endDate))}` : ''}</span></span>
            <span class="companion-block-heading">${escapeHtml(block.title || block.place)}</span>
            ${block.title && block.title !== block.place ? `<span class="companion-muted">${escapeHtml(block.place)}</span>` : ''}
            <span class="companion-block-summary">${escapeHtml(highlights.join(' · ') || '아직 빈 하루예요. 첫 일정을 채워 보세요.')}</span>
            <span class="companion-block-bottom"><span class="companion-status">${SulsulTravel.PlanBlocks.statusLabel(block.status)}</span><span>${block.days.length}일 체류 · ${items.length ? `${done}/${items.length} 완료` : '일정 미정'}</span></span>
          </span><i class="fa-solid fa-chevron-right companion-chevron" aria-hidden="true"></i>
        </button>
        <div class="companion-block-actions"><button type="button" data-on-click="planBlocks.editByIndex" data-block-index="${index}"><i class="fa-solid fa-pen" aria-hidden="true"></i> 큰 계획 편집</button><button type="button" data-on-click="planBlocks.regenerateByIndex" data-block-index="${index}"><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> 이 구간 AI 재생성</button></div>
      </article>`;
    }).join('') || '<div class="companion-empty">아직 계획이 없어요. AI와 첫 여정을 만들어 보세요.</div>'}</div>`;
  SulsulTravel.PlanBlocks.setPresentation(document.getElementById('tab-content-plan').dataset.presentation || 'overview');
}

function companionDayPicker(days, selected, action) {
  return `<div class="companion-day-picker" aria-label="여행 날짜 선택">${days.map(({day, dayIndex}) => `<button aria-pressed="${dayIndex === selected}" onclick="${action}(${dayIndex})"><span>DAY ${day.dayNum || dayIndex + 1}</span><strong>${escapeHtml(companionDate(day.date))}</strong><small>${escapeHtml(day.city || day.loc || '여행')}</small></button>`).join('')}</div>`;
}

function selectCompanionDetailDay(dayIndex) {
  const block = SulsulTravel.PlanBlocks.getActive();
  if (!block?.days.some(item => item.dayIndex === dayIndex)) return;
  State.companionDetailSelection = { blockId: block.id, dayIndex };
  SulsulTravel.PlanBlocks.renderDetail();
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
  const reorderMode = Boolean(window.SulsulTravel?.SpotRealignmentUI?.isReorderMode?.());
  const reorderCtrls = reorderMode ? `
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
          <button type="button" class="companion-button" data-on-click="scheduleTuning.openEditSpot" data-day="${Number(dayIndex)}" data-spot="${Number(spotIndex)}"><i class="fa-solid fa-pen-to-square" aria-hidden="true"></i> 시간·내용 수정</button>
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
      <button type="button" data-action="complete" ${SulsulTravel.ScheduleChange.retired(spot)?'disabled':''} data-on-click="scheduleTuning.toggleCompleted" data-day="${Number(dayIndex)}" data-spot="${Number(spotIndex)}" data-today="${today ? '1' : '0'}" aria-pressed="${!!spot.completed}"><i class="fa-solid fa-check" aria-hidden="true"></i> ${spot.completed ? '완료 취소' : '완료'}</button>
      <button data-action="record" onclick="openActivityJournal(${dayIndex},${spotIndex},event)"><i class="fa-solid fa-book-open" aria-hidden="true"></i> 기록</button>
      <button data-action="directions" onclick="openCompanionDirections(${dayIndex},${spotIndex})"><i class="fa-solid fa-location-arrow" aria-hidden="true"></i> 길찾기</button>
      <button type="button" data-action="taxi" data-on-click="companionModals.openTaxi" data-day="${Number(dayIndex)}" data-spot="${Number(spotIndex)}"><i class="fa-solid fa-taxi" aria-hidden="true"></i> 기사님</button>
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
  const reorderMode = Boolean(window.SulsulTravel?.SpotRealignmentUI?.isReorderMode?.());
  const reorderToolbarHtml = (items && items.length > 1) ? `
    <div class="spot-reorder-toolbar no-print">
      <div class="flex items-center gap-1.5 font-bold text-slate-300">
        <i class="fa-solid fa-arrows-up-down text-amber-400"></i>
        <span>일정 순서 조작</span>
      </div>
      <div class="flex items-center gap-1.5">
        <button type="button" onclick="toggleSpotReorderMode()" class="px-2 py-1 rounded-lg text-xs font-bold transition ${reorderMode ? 'bg-amber-500 text-slate-950 shadow' : 'bg-[#1e293b] text-slate-300 hover:text-white border border-[#334155]'}">
          <i class="fa-solid fa-up-down-left-right mr-1"></i> ${reorderMode ? '순서 편집 완료' : '순서 편집'}
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
  SulsulTravel.ScheduleTuning.openScheduleTuningModal(dayIndex);
  const input=document.getElementById('tuning-reason-input');if(input)input.value=reason;
}

function renderCompanionDetail() {
  const block = SulsulTravel.PlanBlocks.getActive();
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
    <div class="companion-day-heading"><div><p class="companion-eyebrow">DAY ${day.dayNum || selected + 1} · ${escapeHtml(companionDate(day.date))}</p><h3>${escapeHtml(day.title || day.city || block.place)}</h3><p class="companion-muted">${pending.length}개 예정 · ${completed.length}개 완료</p></div><button type="button" class="companion-button" data-on-click="scheduleTuning.open" data-day="${Number(selected)}">이 날 조정</button></div>
    <div class="companion-timeline">${companionTimeline(pending,selected) || `<div class="companion-bento-empty"><div class="empty-icon-wrap"><i class="fa-regular fa-compass"></i></div><h4 class="companion-empty-title">${completed.length ? '이 날의 계획을 모두 마쳤어요 🎉' : '아직 일정이 비어있는 하루예요'}</h4><p class="companion-empty-desc">${completed.length ? '오늘 하루의 소중한 기억을 일기로 남겨 볼까요?' : '가고 싶은 장소를 추가하여 알찬 일정을 완성해 보세요.'}</p><div class="empty-actions"><button type="button" class="companion-button companion-primary" data-on-click="scheduleTuning.openAddSpot" data-day="${Number(selected)}"><i class="fa-solid fa-plus"></i> 일정 추가하기</button><button type="button" class="companion-button" data-on-click="planBlocks.openJournal" data-day-index="${selected}"><i class="fa-solid fa-book-open"></i> 기억 남기기</button></div></div>`}</div>
    ${completed.length ? `<details class="companion-completed"><summary>완료한 일정 ${completed.length}개 보기 <i class="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>${completed.map(item => companionSpot(item.spot, selected, item.spotIndex)).join('')}</details>` : ''}
    ${(day.spots||[]).some(spot=>SulsulTravel.ScheduleChange.retired(spot))?`<details class="companion-cancelled"><summary>보관·취소·나중에 갈 곳 ${day.spots.filter(spot=>SulsulTravel.ScheduleChange.retired(spot)).length}개 보기</summary>${day.spots.map((spot,spotIndex)=>({spot,spotIndex})).filter(item=>SulsulTravel.ScheduleChange.retired(item.spot)).map(item=>companionSpot(item.spot,selected,item.spotIndex)).join('')}</details>`:''}
    <button type="button" class="companion-button companion-record" data-on-click="planBlocks.openJournal" data-day-index="${selected}"><i class="fa-solid fa-book-open" aria-hidden="true"></i> 이 날의 기억 남기기</button>`;
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

// 아는 장소일 때만 날씨·고도를 알려 준다(SulsulTravel.PlanTimeline.dayConditions). 모르면 값이 null이고 칩을 그리지 않는다.
// v2.1.5 전에는 모르는 장소에도 맑은 날씨와 평지 고도를 기본값으로 지어 보여 줬다.
function getTodayWeatherInfo(day) {
  const info = SulsulTravel.PlanTimeline.dayConditions(day);
  return {
    weatherBadge: info.weatherBadge,
    altitude: info.altitude,
    isCareNeeded: !!info.isCareNeeded,
    detail: [info.weatherDetail, info.outfitSummary].filter(Boolean).join(' · ')
  };
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
        ${(weatherInfo.weatherBadge || weatherInfo.altitude) ? `<div class="hud-weather-chip ${weatherInfo.isCareNeeded ? 'is-care-needed' : ''}" title="${escapeHtml(weatherInfo.detail || '')}">
          ${weatherInfo.weatherBadge ? `<span class="hud-weather-main"><i class="fa-solid fa-cloud-sun text-amber-400" aria-hidden="true"></i> ${escapeHtml(weatherInfo.weatherBadge)}</span>` : ''}
          ${weatherInfo.altitude ? `<span class="hud-weather-extra">${escapeHtml(weatherInfo.altitude)}</span>` : ''}
        </div>` : ''}
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
      <button type="button" class="bento-action-pill pill-sos" data-on-click="companionModals.openSos" title="긴급 SOS 비상 연락망 & 의사소통">
        <i class="fa-solid fa-triangle-exclamation animate-pulse"></i> <span>긴급 SOS</span>
      </button>
      <button type="button" class="bento-action-pill" data-on-click="companionModals.openTaxi" data-day="${Number(dayIndex)}" data-spot="${nextIndex >= 0 ? Number(nextIndex) : 0}" title="현지어 기사님 카드">
        <i class="fa-solid fa-taxi text-amber-500"></i> <span>기사님 카드</span>
      </button>
      <button type="button" class="bento-action-pill pill-capsule" onclick="openQuickCapsuleModal()" title="1-Tap 길거리 음성/사진 퀵 캡슐">
        <i class="fa-solid fa-microphone text-rose-500"></i> <span>퀵 캡슐</span>
      </button>
      <button type="button" class="bento-action-pill" data-on-click="companionModals.openMagazine" title="에디토리얼 스토리 매거진">
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
          <button type="button" class="companion-button companion-primary" data-on-click="companionModals.openMagazine"><i class="fa-solid fa-book-open-reader"></i> 스토리 매거진 보기</button>
          <button class="companion-button" onclick="openQuickCapsuleModal()"><i class="fa-solid fa-microphone"></i> 오늘의 감상 남기기</button>
          <button class="companion-button" onclick="switchTab('journal');SulsulTravel.JournalTab.selectDay(${dayIndex})"><i class="fa-solid fa-pen-fancy"></i> 하루 회고 작성</button>
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
          <button type="button" class="companion-button companion-primary" data-on-click="scheduleTuning.openAddSpot" data-day="${Number(dayIndex)}"><i class="fa-solid fa-plus"></i> 첫 일정 추가하기</button>
          <button class="companion-button" onclick="openQuickCapsuleModal()"><i class="fa-solid fa-microphone"></i> 음성 캡슐로 기록</button>
          <button class="companion-button" onclick="navigateToInteractiveMap()"><i class="fa-solid fa-map-pin"></i> 추천 명소 지도</button>
        </div>
      </div>
    `;
  }

  container.innerHTML = `<div class="companion-section-title"><h3>하루의 여행</h3><div class="flex items-center gap-1.5"><button class="companion-button" onclick="switchTab('expenses')"><i class="fa-solid fa-wallet" aria-hidden="true"></i> 지출</button><button class="companion-button" onclick="navigateToInteractiveMap()"><i class="fa-solid fa-map" aria-hidden="true"></i> 지도</button></div></div>
    ${companionDayPicker(trip.days.map((day,dayIndex)=>({day,dayIndex})), dayIndex, 'selectCompanionTodayDay')}
    ${preview ? `<p class="companion-preview">${day.date < today ? '지난 여행일을 보고 있어요' : '미리 보는 하루'} · ${escapeHtml(day.date)}</p>`:''}
    <section class="companion-next ${isCurrentSpotActive ? 'is-active' : ''}">
      <div class="companion-next-header">
        <p class="companion-eyebrow">${next ? 'NEXT STOP · 다음 일정' : 'YOUR DAY · 하루의 기록'}</p>
        ${countdownBadge}
      </div>
      <h3>${escapeHtml(next ? next.title || next.name || '일정 제목 미정' : (day.spots?.length ? '남은 예정이 없어요' : '이 하루는 아직 비어 있어요'))}</h3>
      <p>${escapeHtml(next?.time || companionDate(day.date))} · ${escapeHtml(day.city || day.loc || '여행')} · ${done}/${(day.spots||[]).filter(spot=>SulsulTravel.LiveItinerary.active(spot)).length} 완료</p>
      <div class="companion-next-actions">${next ? `<button class="companion-button companion-primary" onclick="openCompanionDirections(${dayIndex},${nextIndex})"><i class="fa-solid fa-location-arrow" aria-hidden="true"></i> 길찾기</button><button type="button" class="companion-button" data-on-click="companionModals.openTaxi" data-day="${Number(dayIndex)}" data-spot="${Number(nextIndex)}"><i class="fa-solid fa-taxi" aria-hidden="true"></i> 기사님</button><button class="companion-button" onclick="openActivityJournal(${dayIndex},${nextIndex},event)"><i class="fa-solid fa-book-open" aria-hidden="true"></i> 기록</button><button class="companion-button" onclick="completeTodaySpot(${dayIndex},${nextIndex},event)"><i class="fa-solid fa-check" aria-hidden="true"></i> 완료</button>`:`<button class="companion-button companion-primary" onclick="openMomentJournal(${dayIndex})">+ 순간 기록</button><button class="companion-button" onclick="switchTab('journal');SulsulTravel.JournalTab.selectDay(${dayIndex})">하루 회고</button>`}</div>
    </section>
    ${actionDeckHtml}
    ${smartHudHtml}
    ${renderLiveToolbar(dayIndex)}
    <div class="companion-change-reason" aria-label="상황에 맞게 일정 조정"><button onclick="adjustCompanionDay(${dayIndex},'비가 와서 실내 위주로 변경')">🌧️ 비가 와요</button><button onclick="adjustCompanionDay(${dayIndex},'교통 지연으로 남은 동선을 조정')">⏳ 이동 지연</button><button onclick="adjustCompanionDay(${dayIndex},'휴식 시간을 늘리고 무리하지 않는 일정으로 변경')">☕ 쉬고 싶어요</button><button type="button" data-on-click="scheduleTuning.open" data-day="${Number(dayIndex)}">⚙️ 직접 조정</button></div>
    <div class="companion-section-title"><h3>하루의 흐름</h3><button type="button" class="companion-button" data-on-click="scheduleTuning.openAddSpot" data-day="${Number(dayIndex)}">+ 일정 추가</button></div>
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
  } else {
    SulsulTravel.PlanBlocks.openBlock(blockIndex);
  }
}
window.scrollToPlanBlock = scrollToPlanBlock;

function confirmResetAiDraft() {
  if (window.SulsulTravel?.DraftStudio?.open) {
    window.SulsulTravel.DraftStudio.open();
  } else if (typeof openModal === 'function') {
    openModal('modal-ai-trip');
  }
}
window.confirmResetAiDraft = confirmResetAiDraft;

// 현지어 기사님 카드(#modal-taxi-card)는 js/presentation/companion-modals-ui.js(SulsulTravel.CompanionModals)로 옮겼다(v2.2.8, 4단계).
window.parseSpotTimeRange = parseSpotTimeRange;
window.renderSpotCountdownBadge = renderSpotCountdownBadge;
window.getTripTimeInfo = getTripTimeInfo;
window.getTodayWeatherInfo = getTodayWeatherInfo;
window.renderTodaySmartHud = renderTodaySmartHud;
window.detectSpotCategoryKind = detectSpotCategoryKind;
window.renderCityTransitionBridge = renderCityTransitionBridge;

// 실시간 카운트다운 & 현장 상태 자동 갱신 (오늘 탭이 활성화된 상태에서 60초마다 갱신)
(function () {
  if (typeof window === 'undefined') return;
  let hudTimer = null;
  if (!hudTimer) {
    hudTimer = setInterval(() => {
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
})();
// 긴급 SOS & 병원·약국 소통 카드(#modal-sos-emergency)는 js/presentation/companion-modals-ui.js(SulsulTravel.CompanionModals)로 옮겼다(v2.2.8, 4단계).

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
  } else if (Number.isInteger(State?.activeTodayDayIndex)) {
    currentDayNum = Math.min(totalDays, State.activeTodayDayIndex + 1);
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
        <button type="button" data-on-click="budget.initialFunds" class="text-[10px] text-amber-400 hover:text-amber-300 font-bold px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 transition flex items-center gap-1 cursor-pointer">
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
   현장 퀵 캡슐: 순간 기록(momentEntries)의 빠른 입력 방식 (v2.0.2)
   날짜·사진·저장·AI 승인 경계는 순간 기록과 같다. 별도 컬렉션을 만들지 않는다.
   ========================================================================== */
const CAPSULE_MOODS = Object.freeze([
  { key: 'wonder', label: '✨ 감탄/경이' },
  { key: 'food', label: '🍜 꿀맛/맛집' },
  { key: 'tip', label: '💡 여행 꿀팁' },
  { key: 'warning', label: '⚠️ 주의/바가지' },
  { key: 'moved', label: '💖 감동' },
  { key: 'photo', label: '📸 포토스팟' }
]);
function capsuleMoodLabel(key) { return CAPSULE_MOODS.find(mood => mood.key === key)?.label || ''; }
function capsuleEntries(trip, date) {
  return (Array.isArray(trip?.momentEntries) ? trip.momentEntries : [])
    .filter(entry => entry?.source === 'capsule' && entry.date === date)
    .sort((a, b) => (a.time || '24:00').localeCompare(b.time || '24:00') || String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
}
function capsuleTrip() { const editor = State.capsuleEditor; return editor ? State.trips.find(trip => trip.id === editor.tripId) : null; }
// 지금 현지 날짜가 여행 안이면 그 날, 아니면 여행 단계에 맞는 날을 고른다. 사용자가 바꿀 수 있다.
function capsuleDefaultDayIndex(trip) {
  const today = SulsulTravel.TripAdapter.localDateKey(new Date(), trip.timeZone);
  const exact = (trip.days || []).findIndex(day => day.date === today);
  return exact >= 0 ? exact : SulsulTravel.TripAdapter.resolveTodayDayIndex(trip);
}
function stopCapsuleVoice(editor = State.capsuleEditor) {
  if (!editor?.recognition) return;
  try { editor.recognition.stop(); } catch (_) {}
  editor.recognition = null; editor.recording = false;
}
function setCapsuleFeedback(message) {
  if (State.capsuleEditor) State.capsuleEditor.feedback = message;
  const element = document.getElementById('capsule-feedback');
  if (element) element.textContent = message;
}

function openQuickCapsuleModal() {
  const trip = getActiveTrip();
  if (!trip?.days?.length) { showToast('먼저 여행 일정을 만들어 주세요.'); return; }
  stopCapsuleVoice();
  State.capsuleEditor = { tripId: trip.id, dayIndex: capsuleDefaultDayIndex(trip), mood: 'wonder', photo: null, busy: false, usedVoice: false, recognition: null, recording: false, feedback: '' };
  renderQuickCapsuleContent(false);
  if (typeof openModal === 'function') openModal('modal-quick-capsule');
}
window.openQuickCapsuleModal = openQuickCapsuleModal;

function setCapsuleMood(moodKey) {
  const editor = State.capsuleEditor;
  if (!editor || !CAPSULE_MOODS.some(mood => mood.key === moodKey)) return;
  editor.mood = moodKey;
  renderQuickCapsuleContent(true);
}
window.setCapsuleMood = setCapsuleMood;

function selectCapsuleDay(value) {
  const editor = State.capsuleEditor, trip = capsuleTrip(), dayIndex = Number(value);
  if (!editor || !trip?.days?.[dayIndex]) return;
  editor.dayIndex = dayIndex;
  renderQuickCapsuleContent(true);
}
window.selectCapsuleDay = selectCapsuleDay;

function toggleCapsuleVoiceRecognition() {
  const editor = State.capsuleEditor;
  if (!editor) return;
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const statusEl = document.getElementById('capsule-mic-status');
  const micBtn = document.getElementById('capsule-mic-btn');
  if (!SpeechRec) { showToast('현재 브라우저가 음성 인식을 지원하지 않습니다. 텍스트로 직접 입력해 주세요.'); return; }
  if (editor.recording) {
    stopCapsuleVoice(editor);
    micBtn?.classList.remove('is-recording');
    if (statusEl) statusEl.textContent = '음성 인식을 멈췄어요. 내용을 확인하고 보관하세요.';
    return;
  }
  try {
    const recognition = new SpeechRec();
    recognition.lang = 'ko-KR'; recognition.continuous = false; recognition.interimResults = true;
    const input = document.getElementById('capsule-text-input');
    const before = input?.value || '';
    recognition.onstart = () => {
      editor.recording = true; micBtn?.classList.add('is-recording');
      if (statusEl) statusEl.textContent = '🎙️ 듣고 있어요. 말씀해 주세요.';
    };
    recognition.onresult = event => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) transcript += event.results[i][0].transcript;
      const target = document.getElementById('capsule-text-input');
      // 이미 적은 메모 뒤에 이어 붙인다. 덮어쓰지 않는다.
      if (target && transcript && State.capsuleEditor === editor) { target.value = before ? `${before} ${transcript}` : transcript; editor.usedVoice = true; }
    };
    recognition.onerror = event => {
      editor.recording = false; editor.recognition = null; micBtn?.classList.remove('is-recording');
      if (statusEl) statusEl.textContent = '음성 인식을 사용할 수 없어요. 직접 입력해 주세요.';
      console.warn('SpeechRecognition error:', event?.error);
    };
    recognition.onend = () => {
      editor.recording = false; editor.recognition = null; micBtn?.classList.remove('is-recording');
      if (statusEl && State.capsuleEditor === editor) statusEl.textContent = '음성 인식이 끝났어요. 내용을 확인하고 보관하세요.';
    };
    editor.recognition = recognition;
    recognition.start();
  } catch (error) {
    console.warn('Failed to start speech recognition:', error);
    showToast('마이크를 시작하지 못했습니다. 권한을 확인하거나 직접 입력해 주세요.');
  }
}
window.toggleCapsuleVoiceRecognition = toggleCapsuleVoiceRecognition;

function renderCapsulePhotoPreview() {
  const editor = State.capsuleEditor, preview = document.getElementById('capsule-photo-preview');
  const input = document.getElementById('capsule-photo-input'), save = document.getElementById('capsule-save-btn');
  if (input) input.disabled = !!editor?.busy;
  if (save) save.disabled = !!editor?.busy;
  if (!preview) return;
  const source = editor?.photo ? SulsulTravel.MediaRepository.photoSource({ photos: [editor.photo.source], photoThumbnails: [editor.photo.thumbnail] }, 0, { thumbnail: true }) : '';
  preview.innerHTML = editor?.busy ? '<span class="text-[11px] text-slate-400">사진 준비 중…</span>' : source ? `
    <div class="relative w-16 h-12 rounded-xl overflow-hidden border border-amber-500/40">
      <img src="${escapeHtml(source)}" class="w-full h-full object-cover" alt="첨부할 사진 미리보기">
      <button type="button" onclick="removeCapsulePhoto()" class="absolute top-0.5 right-0.5 w-6 h-6 rounded-full capsule-photo-remove text-white text-[11px] flex items-center justify-center" aria-label="첨부한 사진 빼기">✕</button>
    </div>` : '';
}

async function handleCapsulePhotoInput(event) {
  const editor = State.capsuleEditor, file = event.target.files?.[0];
  event.target.value = '';
  if (!editor || !file || editor.busy) return;
  editor.busy = true; renderCapsulePhotoPreview();
  setCapsuleFeedback('사진의 비율을 유지해 보관본과 썸네일을 준비하고 있어요…');
  try {
    // 순간 기록과 같은 압축·IndexedDB 보관 경로. 원본 data URL을 여행 문서에 넣지 않는다.
    const prepared = await SulsulTravel.mediaRepository.prepare(file, { tripId: editor.tripId });
    if (State.capsuleEditor !== editor) return;
    editor.photo = prepared;
    setCapsuleFeedback('사진이 준비되었습니다. 보관하기를 누르면 저장됩니다.');
  } catch (error) {
    if (State.capsuleEditor === editor) setCapsuleFeedback(error?.message || '사진을 준비하지 못했습니다. 다시 선택해 주세요.');
  } finally {
    editor.busy = false;
    if (State.capsuleEditor === editor) renderCapsulePhotoPreview();
  }
}
window.handleCapsulePhotoInput = handleCapsulePhotoInput;

function removeCapsulePhoto() {
  const editor = State.capsuleEditor;
  if (!editor || editor.busy) return;
  editor.photo = null;
  renderCapsulePhotoPreview();
}
window.removeCapsulePhoto = removeCapsulePhoto;

function buildCapsuleEntry(trip, editor, text) {
  const day = trip.days[editor.dayIndex];
  const local = SulsulTravel.TripAdapter.localDateKey(new Date(), trip.timeZone);
  const now = new Date().toISOString();
  const spotId = document.getElementById('capsule-spot-select')?.value || '';
  const spotIndex = spotId ? (day.spots || []).findIndex(spot => spot.id === spotId) : -1;
  const spot = spotIndex >= 0 ? day.spots[spotIndex] : null;
  const photo = editor.photo;
  return {
    id: `moment_${crypto.randomUUID()}`,
    source: 'capsule', capture: editor.usedVoice ? 'voice' : 'text',
    date: day.date, dayIndex: editor.dayIndex,
    // 다른 날을 골랐으면 지금 시각을 그 날의 기록 시각으로 쓰지 않는다.
    time: day.date === local ? SulsulTravel.TripAdapter.localTimeKey(new Date(), trip.timeZone) : '',
    text, mood: editor.mood,
    photos: photo ? [photo.source] : [], photoThumbnails: photo ? [photo.thumbnail] : [], mediaIds: photo ? [photo.mediaId] : [], coverIndex: 0,
    activityLink: spot ? { dayIndex: editor.dayIndex, spotIndex, title: spot.title || '일정', date: day.date, time: spot.time || '', city: day.city || '', ...(spot.recordId ? { recordId: spot.recordId } : {}), spotId: spot.id } : null,
    visibility: 'private', createdAt: now, updatedAt: now
  };
}

async function saveQuickCapsule() {
  const editor = State.capsuleEditor, trip = capsuleTrip();
  if (!editor || editor.busy) return false;
  if (!trip?.days?.[editor.dayIndex]) { setCapsuleFeedback('여행 날짜를 찾지 못했습니다. 창을 닫고 다시 열어 주세요.'); return false; }
  const textInput = document.getElementById('capsule-text-input');
  const text = (textInput?.value || '').trim();
  if (!text && !editor.photo) { setCapsuleFeedback('음성·메모 또는 사진을 먼저 남겨 주세요.'); return false; }
  stopCapsuleVoice(editor);
  const entry = buildCapsuleEntry(trip, editor, text);
  editor.busy = true;
  let saved;
  try {
    saved = await commitTripCommand({ tripId: trip.id, expectedRevision: trip.revision, change: copy => {
    copy.momentEntries = Array.isArray(copy.momentEntries) ? copy.momentEntries : [];
    copy.momentEntries.push(entry);
  } });
  } finally { editor.busy = false; }
  if (!saved) {
    // 실패하면 입력·사진을 그대로 두고 성공 안내를 띄우지 않는다.
    setCapsuleFeedback('보관하지 못했습니다. 입력한 글과 사진은 이 창에 그대로 있어요. 저장 공간을 확인한 뒤 다시 눌러 주세요.');
    return false;
  }
  editor.photo = null; editor.usedVoice = false;
  if (textInput) textInput.value = '';
  setCapsuleFeedback('순간 기록으로 보관했습니다. 기록 탭과 여행 이야기에도 함께 나타납니다.');
  renderQuickCapsuleContent(true);
  if (typeof refreshMomentSurfaces === 'function') refreshMomentSurfaces();
  showToast('퀵 캡슐을 순간 기록으로 보관했습니다.');
  return true;
}
window.saveQuickCapsule = saveQuickCapsule;

async function deleteQuickCapsule(entryId) {
  const editor = State.capsuleEditor, trip = capsuleTrip();
  if (!editor || editor.busy || !trip) return false;
  if (!momentEntries(trip).some(entry => entry.id === entryId)) return false;
  if (!confirm('이 캡슐의 글과 사진을 삭제할까요? 다른 기록은 그대로이며 되돌릴 수 없습니다.')) return false;
  const saved = await commitTripCommand({ tripId: trip.id, expectedRevision: trip.revision, change: copy => {
    copy.momentEntries = momentEntries(copy).filter(entry => entry.id !== entryId);
  } });
  if (!saved) { setCapsuleFeedback('삭제하지 못했습니다. 캡슐은 그대로 남아 있습니다.'); return false; }
  renderQuickCapsuleContent(true);
  if (typeof refreshMomentSurfaces === 'function') refreshMomentSurfaces();
  showToast('캡슐을 삭제했습니다.');
  return true;
}
window.deleteQuickCapsule = deleteQuickCapsule;

function capsuleDiarySource(capsules) {
  return capsules.map(entry => `[${[entry.time || '시각 미상', entry.activityLink?.title, capsuleMoodLabel(entry.mood)].filter(Boolean).join(' · ')}] ${entry.text || '(사진만 남김)'}`).join('\n');
}

// AI는 캡슐 메모를 하루 기록 초안으로 엮기만 한다. 승인 전에는 아무것도 저장하지 않는다.
async function generateDiaryFromCapsules() {
  const editor = State.capsuleEditor, trip = capsuleTrip();
  if (!editor || editor.busy || !trip) return;
  const day = trip.days?.[editor.dayIndex];
  const capsules = capsuleEntries(trip, day?.date);
  if (!day || !capsules.some(entry => (entry.text || '').trim())) { setCapsuleFeedback('글이 있는 캡슐을 먼저 남겨 주세요. 사진만으로는 일기를 엮지 않아요.'); return; }
  const city = day.city || '여행지';
  const sourceText = capsuleDiarySource(capsules);
  const prompt = `당신은 여행 에세이 편집자입니다. 아래는 여행자가 ${day.date} ${city}에서 직접 남긴 현장 메모입니다.
메모에 있는 사실과 감정만 사용해 자연스러운 1인칭 한국어 하루 기록으로 엮으세요.
메모에 없는 장소·음식·사람·시각·날씨·감각을 지어내지 마세요. 메모가 짧으면 짧게 쓰세요. 제목·머리말·설명 없이 본문만 쓰세요.

[현장 메모]
${sourceText}`;
  setCapsuleFeedback('AI 제안을 준비하고 있어요. 승인하기 전에는 저장되지 않습니다…');
  const button = document.getElementById('btn-ai-synthesize-diary');
  if (button) button.disabled = true;
  try {
    const result = await startAiDraftJob({ id: `capsule-diary:${trip.id}:${day.id}:${Date.now()}`, tripId: trip.id, targetId: day.id, kind: 'capsule-diary', baseRevision: trip.revision || 0,
      input: { dayId: day.id, date: day.date, dayIndex: editor.dayIndex, city, sourceText, capsuleIds: capsules.map(entry => entry.id), prompt } });
    if (State.capsuleEditor === editor) setCapsuleFeedback(result?.state === 'awaiting_review' ? 'AI 제안을 비교하고 승인하면 이 날의 순간 기록으로 저장됩니다. 캡슐 원문은 그대로 남아요.' : 'AI 제안을 만들지 못했습니다. 캡슐은 그대로 있어요.');
  } catch (_) {
    if (State.capsuleEditor === editor) setCapsuleFeedback('AI 연결을 확인해 주세요. 캡슐은 그대로 있어요.');
  } finally {
    const current = document.getElementById('btn-ai-synthesize-diary');
    if (current) current.disabled = false;
  }
}
window.generateDiaryFromCapsules = generateDiaryFromCapsules;

// 승인된 AI 일기를 새 순간 기록으로 저장한다. 그사이 캡슐이 바뀌었으면 적용하지 않는다.
async function applyCapsuleDiaryDraft(job) {
  const trip = State.trips.find(item => item.id === job.tripId);
  const day = trip?.days?.find(item => item.id === job.input.dayId);
  if (!trip || !day || day.date !== job.input.date) return 'conflict';
  if (capsuleDiarySource(capsuleEntries(trip, day.date)) !== job.input.sourceText) return 'conflict';
  const now = new Date().toISOString();
  const result = await TripRepository.applyDraft({ tripId: trip.id, baseRevision: job.baseRevision, jobId: job.id, mutate: copy => {
    copy.momentEntries = Array.isArray(copy.momentEntries) ? copy.momentEntries : [];
    copy.momentEntries.push({ id: `moment_${crypto.randomUUID()}`, source: 'capsule-diary', date: day.date, dayIndex: copy.days.findIndex(item => item.id === day.id), time: '',
      title: `${job.input.city} 하루 이야기`, originalText: job.input.sourceText, text: job.draft.text, aiDraftAcceptedAt: now, capsuleIds: job.input.capsuleIds,
      photos: [], photoThumbnails: [], mediaIds: [], coverIndex: 0, activityLink: null, visibility: 'private', createdAt: now, updatedAt: now });
  } });
  if (result.status === 'applied') {
    if (State.capsuleEditor?.tripId === trip.id) { setCapsuleFeedback('승인한 AI 글을 순간 기록으로 저장했습니다. 원래 메모도 함께 보관됩니다.'); renderQuickCapsuleContent(true); }
  }
  return result.status;
}
window.applyCapsuleDiaryDraft = applyCapsuleDiaryDraft;

function renderQuickCapsuleContent(preserveText = true) {
  const container = document.getElementById('quick-capsule-content');
  const editor = State.capsuleEditor, trip = capsuleTrip();
  if (!container) return;
  if (!editor || !trip?.days?.length) { container.innerHTML = '<p class="text-xs text-slate-400 text-center py-6">여행을 선택한 뒤 다시 열어 주세요.</p>'; return; }
  const day = trip.days[editor.dayIndex] || trip.days[0];
  const spots = (day.spots || []).filter(spot => SulsulTravel.LiveItinerary?.active ? SulsulTravel.LiveItinerary.active(spot) : true);
  const existingText = preserveText ? (document.getElementById('capsule-text-input')?.value || '') : '';
  const selectedSpot = preserveText ? (document.getElementById('capsule-spot-select')?.value || '') : '';
  const dayCapsules = capsuleEntries(trip, day.date);
  const today = SulsulTravel.TripAdapter.localDateKey(new Date(), trip.timeZone);

  container.innerHTML = `
    <div class="space-y-1.5">
      <label for="capsule-day-select" class="text-[11px] font-bold text-slate-400">기록할 날짜</label>
      <select id="capsule-day-select" onchange="selectCapsuleDay(this.value)" class="w-full p-2 rounded-xl bg-[#141c2e] border border-[#23304c] text-slate-200 text-xs focus:outline-none focus:border-amber-500">
        ${trip.days.map((item, index) => `<option value="${index}" ${index === editor.dayIndex ? 'selected' : ''}>Day ${index + 1} · ${escapeHtml(item.date || '날짜 미정')}${item.city ? ` · ${escapeHtml(item.city)}` : ''}${item.date === today ? ' (오늘)' : ''}</option>`).join('')}
      </select>
      ${day.date !== today ? '<p class="text-[11px] text-slate-400">오늘이 아닌 날짜를 골랐어요. 기록 시각은 비워 두고 저장합니다.</p>' : ''}
    </div>

    <div class="text-center p-3.5 rounded-2xl bg-[#080b12] border border-[#1a2236] space-y-2.5">
      <button type="button" id="capsule-mic-btn" onclick="toggleCapsuleVoiceRecognition()" class="capsule-mic-btn shadow-lg ${editor.recording ? 'is-recording' : ''}" aria-label="음성으로 메모 말하기">
        <i class="fa-solid fa-microphone" aria-hidden="true"></i>
      </button>
      <div id="capsule-mic-status" class="text-xs text-slate-400 font-medium" role="status">마이크를 눌러 현장 감상을 말하거나 아래에 적어 주세요</div>
    </div>

    <div class="space-y-1.5">
      <label for="capsule-text-input" class="text-xs font-bold text-slate-300">현장 메모 / 음성 변환 내용</label>
      <textarea id="capsule-text-input" rows="3" placeholder="걷거나 구경하며 느낀 감상, 꿀팁, 가게 이름을 남겨보세요..." class="w-full p-3 rounded-xl bg-[#141c2e] border border-[#23304c] text-white text-base sm:text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500 leading-relaxed">${escapeHtml(existingText)}</textarea>
    </div>

    <div class="space-y-1.5">
      <div class="text-[11px] font-bold text-slate-400">감성 무드</div>
      <div class="capsule-mood-grid">
        ${CAPSULE_MOODS.map(mood => `<button type="button" onclick="setCapsuleMood('${mood.key}')" class="capsule-mood-chip ${editor.mood === mood.key ? 'is-active' : ''}" aria-pressed="${editor.mood === mood.key}">${escapeHtml(mood.label)}</button>`).join('')}
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
      <div class="space-y-1">
        <label for="capsule-spot-select" class="text-[11px] font-bold text-slate-400">관련 일정 (선택)</label>
        <select id="capsule-spot-select" class="w-full p-2 rounded-xl bg-[#141c2e] border border-[#23304c] text-slate-200 text-xs focus:outline-none focus:border-amber-500">
          <option value="">일정 없이 기록</option>
          ${spots.map((spot, index) => `<option value="${escapeHtml(spot.id)}" ${spot.id === selectedSpot ? 'selected' : ''}>${index + 1}. ${escapeHtml(spot.title || spot.name || '일정')}</option>`).join('')}
        </select>
      </div>
      <div class="space-y-1">
        <div class="text-[11px] font-bold text-slate-400">사진 1장 (선택)</div>
        <div class="flex items-center gap-2">
          <label for="capsule-photo-input" class="flex-1 min-h-[44px] py-2 px-3 rounded-xl bg-[#141c2e] hover:bg-[#1e293b] border border-[#23304c] text-xs font-bold text-slate-300 flex items-center justify-center gap-1.5 cursor-pointer transition">
            <i class="fa-solid fa-camera text-amber-400" aria-hidden="true"></i> <span>사진 촬영/선택</span>
          </label>
          <input type="file" id="capsule-photo-input" accept="image/*" capture="environment" onchange="handleCapsulePhotoInput(event)" class="hidden">
          <div id="capsule-photo-preview"></div>
        </div>
      </div>
    </div>

    <p id="capsule-feedback" class="text-[11px] text-amber-300 capsule-feedback" role="status">${escapeHtml(editor.feedback || '')}</p>
    <button type="button" id="capsule-save-btn" onclick="saveQuickCapsule()" class="w-full min-h-[44px] py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-md cursor-pointer flex items-center justify-center gap-1.5">
      <i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> <span>퀵 캡슐 보관하기</span>
    </button>

    <div class="pt-3 border-t border-[#1a2236] space-y-2">
      <div class="flex items-center justify-between gap-2">
        <span class="text-xs font-black text-white flex items-center gap-1.5">
          <i class="fa-solid fa-boxes-packing text-amber-400" aria-hidden="true"></i>
          <span>이 날의 캡슐 (${dayCapsules.length}개)</span>
        </span>
        ${dayCapsules.some(entry => (entry.text || '').trim()) ? `
          <button type="button" id="btn-ai-synthesize-diary" onclick="generateDiaryFromCapsules()" class="min-h-[44px] text-[11px] font-black text-amber-400 hover:text-amber-300 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 transition flex items-center gap-1 cursor-pointer">
            <i class="fa-solid fa-wand-magic-sparkles text-[10px]" aria-hidden="true"></i> <span>AI 일기 초안</span>
          </button>` : ''}
      </div>
      ${dayCapsules.length === 0 ? `
        <div class="text-[11px] text-slate-500 text-center py-4 bg-[#080b12] rounded-xl border border-[#141c2e]">아직 이 날의 캡슐이 없습니다. 첫 감상을 남겨 보세요.</div>
      ` : `
        <div class="space-y-2 capsule-list custom-scrollbar">
          ${dayCapsules.map(entry => {
            const photo = SulsulTravel.MediaRepository.photoSource(entry, entry.coverIndex || 0, { thumbnail: true });
            return `<div class="capsule-list-item">
              <div class="flex items-center justify-between gap-1">
                <span class="text-[10px] text-amber-400 font-mono font-bold">${escapeHtml([entry.time || '시각 미상', entry.activityLink?.title || '길거리', capsuleMoodLabel(entry.mood)].filter(Boolean).join(' · '))}</span>
                <button type="button" onclick="deleteQuickCapsule(${escapeHtml(JSON.stringify(entry.id))})" class="w-8 h-8 text-slate-500 hover:text-rose-400 text-[11px] cursor-pointer" aria-label="이 캡슐 삭제">✕</button>
              </div>
              ${entry.text ? `<div class="text-xs text-white leading-relaxed">${escapeHtml(entry.text)}</div>` : ''}
              ${photo ? `<img src="${escapeHtml(photo)}" class="w-16 h-12 object-cover rounded-lg mt-1 border border-[#334155]" alt="캡슐 사진">` : ''}
            </div>`;
          }).join('')}
        </div>
      `}
    </div>
  `;
  renderCapsulePhotoPreview();
}
window.renderQuickCapsuleContent = renderQuickCapsuleContent;

// 여행 에디토리얼 매거진(#modal-story-magazine)은 js/presentation/companion-modals-ui.js(SulsulTravel.CompanionModals)로 옮겼다(v2.2.8, 4단계).
