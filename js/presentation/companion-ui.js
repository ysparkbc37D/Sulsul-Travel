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
  container.innerHTML = `
    <section class="companion-intro">
      <div><p class="companion-eyebrow">PLAN YOUR JOURNEY</p><h3>우리의 큰 계획</h3>
      <p class="companion-muted">머무를 도시를 정하고, 하루의 여행을 채워 보세요.</p></div>
      <button class="companion-button companion-primary" onclick="openModal('modal-ai-trip')"><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> AI 초안 만들기</button>
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
    <div class="companion-spot-actions">
      <button onclick="${today ? 'completeTodaySpot' : 'toggleSpotCompleted'}(${dayIndex},${spotIndex},event)" aria-pressed="${!!spot.completed}"><i class="fa-solid fa-check" aria-hidden="true"></i> ${spot.completed ? '완료 취소' : '다녀왔어요'}</button>
      <button onclick="openEditSpotModal(${dayIndex},${spotIndex},event)"><i class="fa-solid fa-pen" aria-hidden="true"></i> 편집</button>
      ${today && !spot.completed && !spot.skipped ? `<button onclick="skipTodaySpot(${dayIndex},${spotIndex},event)" aria-label="${escapeHtml(spot.title || '일정')} 건너뛰기">건너뛰기</button>` : ''}
    </div></article>`;
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
    <div class="companion-timeline">${pending.map(item => companionSpot(item.spot, selected, item.spotIndex)).join('') || `<div class="companion-empty">${completed.length ? '이 날의 계획을 모두 마쳤어요. 기억을 남겨 볼까요?' : '아직 일정이 없어요. 아래에서 일정을 추가해 보세요.'}</div>`}</div>
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
  container.innerHTML = `<div class="companion-section-title"><h3>하루의 여행</h3><div class="flex items-center gap-1.5"><button class="companion-button" onclick="switchTab('expenses')"><i class="fa-solid fa-wallet" aria-hidden="true"></i> 가계부</button><button class="companion-button" onclick="navigateToInteractiveMap()"><i class="fa-solid fa-map" aria-hidden="true"></i> 지도</button></div></div>
    ${companionDayPicker(trip.days.map((day,dayIndex)=>({day,dayIndex})), dayIndex, 'selectCompanionTodayDay')}
    <section class="companion-next"><p class="companion-eyebrow">${next ? 'NEXT STOP · 다음 일정' : 'YOUR DAY · 하루의 기록'}</p><h3>${escapeHtml(next?.title || (day.spots?.length ? '오늘도 좋은 여행이었나요?' : '이 하루는 아직 비어 있어요.'))}</h3><p>${escapeHtml(next?.time || companionDate(day.date))} · ${escapeHtml(day.city || day.loc || '여행')} · ${done}/${day.spots?.length || 0} 완료</p><div class="companion-next-actions"><button class="companion-button companion-primary" onclick="openScheduleTuningModal(${dayIndex})">일정 다시 조정</button><button class="companion-button" onclick="openAddExpenseModal()"><i class="fa-solid fa-receipt text-amber-500" aria-hidden="true"></i> 지출 기록</button><button class="companion-button" onclick="switchTab('journal');selectJournalDay(${dayIndex})">순간 기록</button></div></section>
    <div class="companion-section-title"><h3>오늘의 흐름</h3><button class="companion-button" onclick="openAddSpotToDay(${dayIndex})">+ 일정 추가</button></div>
    <div class="companion-timeline">${(day.spots || []).map((spot,index)=>companionSpot(spot,dayIndex,index,{today:true})).join('') || '<div class="companion-empty">일정을 추가하거나 AI로 하루를 설계해 보세요.</div>'}</div>`;
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

