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
  const spots = (trip.days || []).flatMap(day => day.spots || []);
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
      const items = block.days.flatMap(item => item.day.spots || []);
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

function companionSpot(spot, dayIndex, spotIndex, {today = false} = {}) {
  const status = spot.completed ? '방문 완료' : spot.skipped ? '건너뜀' : spot.fixed ? '고정 일정' : '';
  return `<article class="companion-spot ${spot.completed ? 'is-completed' : ''}">
    <div class="companion-spot-time"><time>${escapeHtml(spot.time || '시간 미정')}</time>${status ? `<span class="companion-status">${status}</span>` : ''}</div>
    <h4>${escapeHtml(spot.title || '새 일정')}</h4>
    ${spot.desc || spot.memo ? `<p>${escapeHtml(spot.desc || spot.memo)}</p>` : ''}
    ${spot.tip ? `<details class="companion-tip"><summary>여행 팁 보기</summary><p>${escapeHtml(spot.tip)}</p></details>` : ''}
    ${spot.recordId ? activityCardHtml(spot, dayIndex, spotIndex) : ''}
    <div class="companion-spot-actions">
      <button data-action="complete" onclick="${today ? 'completeTodaySpot' : 'toggleSpotCompleted'}(${dayIndex},${spotIndex},event)" aria-pressed="${!!spot.completed}"><i class="fa-solid fa-check" aria-hidden="true"></i> ${spot.completed ? '완료 취소' : '완료'}</button>
      <button data-action="record" onclick="openActivityJournal(${dayIndex},${spotIndex},event)"><i class="fa-solid fa-book-open" aria-hidden="true"></i> 기록</button>
      <button data-action="directions" onclick="openCompanionDirections(${dayIndex},${spotIndex})"><i class="fa-solid fa-location-arrow" aria-hidden="true"></i> 길찾기</button>
    </div>
    <details class="companion-spot-more"><summary>일정 관리</summary><div>
      <button class="companion-button" onclick="openEditSpotModal(${dayIndex},${spotIndex},event)">편집</button>
      ${today && !spot.completed && !spot.skipped ? `<button class="companion-button" onclick="skipTodaySpot(${dayIndex},${spotIndex},event)">건너뛰기</button>` : ''}
    </div></details></article>`;
}

function companionMapQuery(day, spot) {
  const lat=Number(spot?.lat),lng=Number(spot?.lng);
  if (spot?.lat != null && spot?.lng != null && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat)<=90 && Math.abs(lng)<=180 && (lat || lng) && !spot.coordinateFallback) return `${lat},${lng}`;
  return [day?.city || day?.loc,spot?.title || spot?.name].filter(Boolean).join(' ');
}
function openCompanionDirections(dayIndex,spotIndex,originIndex) {
  const day=getActiveTrip()?.days?.[dayIndex],spot=day?.spots?.[spotIndex];if(!spot)return;
  const url=new URL('https://www.google.com/maps/dir/');url.searchParams.set('api','1');url.searchParams.set('destination',companionMapQuery(day,spot));
  if(Number.isInteger(originIndex)&&day.spots[originIndex])url.searchParams.set('origin',companionMapQuery(day,day.spots[originIndex]));
  window.open(url.href,'_blank','noopener,noreferrer');
}
function companionTimeline(items,dayIndex,options={}) {
  return items.map((item,index)=>`${index ? `<button class="companion-transit" onclick="openCompanionDirections(${dayIndex},${item.spotIndex},${items[index-1].spotIndex})"><i class="fa-solid fa-route" aria-hidden="true"></i> 이동 경로 · 지도에서 소요 시간 확인</button>`:''}${companionSpot(item.spot,dayIndex,item.spotIndex,options)}`).join('');
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
  const pending = (day.spots || []).map((spot, spotIndex) => ({spot, spotIndex})).filter(item => !item.spot.completed);
  const completed = (day.spots || []).map((spot, spotIndex) => ({spot, spotIndex})).filter(item => item.spot.completed);
  container.innerHTML = `${companionDayPicker(block.days, selected, 'selectCompanionDetailDay')}
    ${block.lodging || block.notes || block.priorities.length ? `<details class="companion-context"><summary>숙소·꼭 하고 싶은 일·메모 <i class="fa-solid fa-chevron-down" aria-hidden="true"></i></summary><div>${block.lodging ? `<p><b>숙소</b> ${escapeHtml(block.lodging)}</p>` : ''}${block.priorities.length ? `<p>${block.priorities.map(escapeHtml).join(' · ')}</p>` : ''}${block.notes ? `<p>${escapeHtml(block.notes)}</p>` : ''}</div></details>` : ''}
    <div class="companion-day-heading"><div><p class="companion-eyebrow">DAY ${day.dayNum || selected + 1} · ${escapeHtml(companionDate(day.date))}</p><h3>${escapeHtml(day.title || day.city || block.place)}</h3><p class="companion-muted">${pending.length}개 예정 · ${completed.length}개 완료</p></div><button class="companion-button" onclick="openScheduleTuningModal(${selected})">이 날 조정</button></div>
    <div class="companion-timeline">${companionTimeline(pending,selected) || `<div class="companion-empty">${completed.length ? '이 날의 계획을 모두 마쳤어요. 기억을 남겨 볼까요?' : '아직 일정이 없어요. 아래에서 일정을 추가해 보세요.'}</div>`}</div>
    ${completed.length ? `<details class="companion-completed"><summary>완료한 일정 ${completed.length}개 보기 <i class="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>${completed.map(item => companionSpot(item.spot, selected, item.spotIndex)).join('')}</details>` : ''}
    <button class="companion-button companion-record" onclick="openJournalFromPlanBlock(${selected})"><i class="fa-solid fa-book-open" aria-hidden="true"></i> 이 날의 기억 남기기</button>`;
}

function selectCompanionTodayDay(dayIndex) {
  const trip = getActiveTrip();
  if (!trip?.days?.[dayIndex]) return;
  State.companionTodaySelection = {tripId:trip.id, dayIndex};
  renderTodayTab();
  document.querySelector('#today-overview-container .companion-day-picker [aria-pressed="true"]')?.focus({preventScroll:true});
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
  const nextIndex = (day.spots || []).findIndex(spot => !spot.completed && !spot.skipped);
  const next = day.spots?.[nextIndex];
  const done = (day.spots || []).filter(spot => spot.completed).length;
  const today=SulsulTravel.TripAdapter.localDateKey(new Date(),trip.timeZone);
  const preview=day.date!==today;
  const pending=(day.spots || []).map((spot,spotIndex)=>({spot,spotIndex})).filter(item=>!item.spot.completed);
  const completed=(day.spots || []).map((spot,spotIndex)=>({spot,spotIndex})).filter(item=>item.spot.completed);
  container.innerHTML = `<div class="companion-section-title"><h3>하루의 여행</h3><div class="flex items-center gap-1.5"><button class="companion-button" onclick="switchTab('expenses')"><i class="fa-solid fa-wallet" aria-hidden="true"></i> 지출</button><button class="companion-button" onclick="navigateToInteractiveMap()"><i class="fa-solid fa-map" aria-hidden="true"></i> 지도</button></div></div>
    ${companionDayPicker(trip.days.map((day,dayIndex)=>({day,dayIndex})), dayIndex, 'selectCompanionTodayDay')}
    ${preview ? `<p class="companion-preview">${day.date < today ? '지난 여행일을 보고 있어요' : '미리 보는 하루'} · ${escapeHtml(day.date)}</p>`:''}
    <section class="companion-next"><p class="companion-eyebrow">${next ? 'NEXT STOP · 다음 일정' : 'YOUR DAY · 하루의 기록'}</p><h3>${escapeHtml(next ? next.title || next.name || '일정 제목 미정' : (day.spots?.length ? '이 날의 여정을 마쳤어요' : '이 하루는 아직 비어 있어요'))}</h3><p>${escapeHtml(next?.time || companionDate(day.date))} · ${escapeHtml(day.city || day.loc || '여행')} · ${done}/${day.spots?.length || 0} 완료</p><div class="companion-next-actions">${next ? `<button class="companion-button companion-primary" onclick="openCompanionDirections(${dayIndex},${nextIndex})">길찾기</button><button class="companion-button" onclick="openActivityJournal(${dayIndex},${nextIndex},event)">기록</button><button class="companion-button" onclick="completeTodaySpot(${dayIndex},${nextIndex},event)">완료</button>`:`<button class="companion-button companion-primary" onclick="openMomentJournal(${dayIndex})">+ 순간 기록</button><button class="companion-button" onclick="switchTab('journal');selectJournalDay(${dayIndex})">하루 회고</button>`}</div></section>
    <div class="companion-change-reason" aria-label="상황에 맞게 일정 조정"><button onclick="adjustCompanionDay(${dayIndex},'비가 와서 실내 위주로 변경')">비가 와요</button><button onclick="adjustCompanionDay(${dayIndex},'교통 지연으로 남은 동선을 조정')">이동 지연</button><button onclick="adjustCompanionDay(${dayIndex},'휴식 시간을 늘리고 무리하지 않는 일정으로 변경')">쉬고 싶어요</button><button onclick="openScheduleTuningModal(${dayIndex})">직접 조정</button></div>
    <div class="companion-section-title"><h3>하루의 흐름</h3><button class="companion-button" onclick="openAddSpotToDay(${dayIndex})">+ 일정 추가</button></div>
    <div class="companion-timeline">${companionTimeline(pending,dayIndex,{today:true}) || '<div class="companion-empty">남은 일정이 없어요. 새로운 순간을 기록해 보세요.</div>'}</div>
    ${completed.length ? `<details class="companion-completed"><summary>완료한 일정 ${completed.length}개 보기</summary>${completed.map(item=>companionSpot(item.spot,dayIndex,item.spotIndex,{today:true})).join('')}</details>`:''}
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
  window.visualViewport?.addEventListener('resize', updateCompanionViewport);
  window.visualViewport?.addEventListener('scroll', updateCompanionViewport);
  document.addEventListener('focusin', updateCompanionViewport);
  document.addEventListener('focusout', () => requestAnimationFrame(updateCompanionViewport));
  updateCompanionViewport();
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

