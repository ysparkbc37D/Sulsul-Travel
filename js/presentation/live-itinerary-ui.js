/* 현장에서 순서와 날짜를 직접 바꾸고 변경 이력과 기준 계획을 확인한다. */
let liveMoveSession = null;

function liveScheduleTarget(dayIndex, spotIndex) {
  const trip = getActiveTrip(), day = trip?.days?.[dayIndex], item = day?.spots?.[spotIndex];
  return trip && day ? { trip, day, item, dayIndex, spotIndex } : null;
}

function liveScheduleActive(item) {
  return SulsulTravel.LiveItinerary.active(item);
}

function liveScheduleError(message, feedbackId) {
  const feedback = feedbackId && document.getElementById(feedbackId);
  if (feedback) feedback.textContent = message;
  else showToast(message);
  return false;
}

function openLiveInsert(dayIndex, spotIndex, position = 'after') {
  if (!requireSharedPlanEdit()) return false;
  const target = liveScheduleTarget(dayIndex, spotIndex);
  if (!target) return false;
  if (!['before', 'after', 'start', 'end'].includes(position)) position = 'end';
  if ((position === 'before' || position === 'after') && !target.item) position = 'end';
  openAddSpotToDay(dayIndex);
  const modal = document.getElementById('modal-spot');
  if (!modal || modal.classList.contains('sheet-closed')) return false;
  modal.dataset.tripId = target.trip.id;
  modal.dataset.targetDayId = target.day.id;
  modal.dataset.position = position;
  modal.dataset.anchorId = position === 'before' || position === 'after' ? target.item.id : '';
  const positionField = document.getElementById('spot-form-position');
  if (positionField) positionField.value = position;
  const anchorField = document.getElementById('spot-form-anchor');
  if (anchorField) anchorField.value = modal.dataset.anchorId;
  if (typeof syncLiveSpotPosition === 'function') syncLiveSpotPosition(false);
  return true;
}

function ensureLiveMoveModal() {
  if (document.getElementById('modal-live-move')) return;
  const modal = document.createElement('div');
  modal.id = 'modal-live-move';
  modal.className = 'sheet-container sheet-closed';
  modal.innerHTML = `<div class="sheet-scrim" onclick="closeModal('modal-live-move')"></div>
    <div class="sheet-box activity-sheet live-sheet" role="dialog" aria-modal="true" aria-labelledby="live-move-title">
      <header class="activity-sheet-header"><div><p>일정 직접 편집</p><h3 id="live-move-title">다른 날짜·위치로 이동</h3></div><button class="companion-button" onclick="closeModal('modal-live-move')" aria-label="일정 이동 닫기">닫기</button></header>
      <div class="activity-sheet-body live-sheet-body">
        <p id="live-move-item" class="live-item-summary"></p>
        <p class="live-help">순서와 날짜를 바꿔도 기존 시각은 유지됩니다. 글과 사진도 그대로 보존합니다. 시각은 이동 후 시간·내용 수정에서 바꿀 수 있습니다.</p>
        <label for="live-move-day">옮길 날짜</label><select id="live-move-day" onchange="updateLiveMovePositions()"></select>
        <label for="live-move-position">목록에 넣을 위치</label><select id="live-move-position"></select>
        <p id="live-move-feedback" role="status" aria-live="polite"></p>
        <div class="live-sheet-actions"><button class="companion-button" onclick="closeModal('modal-live-move')">취소</button><button id="live-move-save" class="companion-button companion-primary" onclick="saveLiveMove()">이 위치로 이동</button></div>
      </div>
    </div>`;
  document.body.append(modal);
}

function openLiveMove(dayIndex, spotIndex) {
  if (!requireSharedPlanEdit()) return false;
  const target = liveScheduleTarget(dayIndex, spotIndex);
  if (!target?.item) return false;
  if (!liveScheduleActive(target.item)) return liveScheduleError('보류·제거한 일정은 먼저 복구한 뒤 이동해 주세요.');
  ensureLiveMoveModal();
  liveMoveSession = { tripId: target.trip.id, revision: target.trip.revision, dayId: target.day.id, itemId: target.item.id };
  document.getElementById('live-move-item').textContent = [target.item.time || '시간 미정', target.item.title || '일정'].join(' · ');
  const days = document.getElementById('live-move-day');
  days.replaceChildren();
  target.trip.days.forEach((day, index) => {
    const option = document.createElement('option');
    option.value = day.id;
    option.textContent = [`Day ${day.dayNum || index + 1}`, day.date, day.city || day.title].filter(Boolean).join(' · ');
    days.append(option);
  });
  days.value = target.day.id;
  document.getElementById('live-move-feedback').textContent = '';
  updateLiveMovePositions();
  openModal('modal-live-move');
  days.focus({ preventScroll: true });
  return true;
}

function updateLiveMovePositions() {
  const session = liveMoveSession, trip = getActiveTrip(), select = document.getElementById('live-move-position');
  if (!session || !select) return;
  select.replaceChildren();
  const day = trip?.id === session.tripId && trip.days.find(item => item.id === document.getElementById('live-move-day').value);
  if (!day) return;
  for (const item of (day.spots || []).filter(item => item.id !== session.itemId && liveScheduleActive(item) && !item.completed)) {
    const option = document.createElement('option');
    option.value = 'before:' + item.id;
    option.textContent = `${item.time || '시간 미정'} ${item.title || '일정'} 앞`;
    select.append(option);
  }
  const end = document.createElement('option');
  end.value = 'end';
  end.textContent = '이 날짜의 맨 끝';
  select.append(end);
  select.value = 'end';
}

function saveLiveMove() {
  if (!requireSharedPlanEdit()) return false;
  const session = liveMoveSession, trip = getActiveTrip();
  if (!session || trip?.id !== session.tripId) return liveScheduleError('이동 창을 열었던 여행으로 돌아가 다시 시도해 주세요.', 'live-move-feedback');
  const targetDayId = document.getElementById('live-move-day').value;
  const selected = document.getElementById('live-move-position').value;
  const command = { type: 'move', tripId: session.tripId, dayId: session.dayId, itemId: session.itemId, targetDayId, position: selected === 'end' ? 'end' : 'before' };
  if (selected.startsWith('before:')) command.anchorId = selected.slice(7);
  if (!trip.days.some(day => day.id === targetDayId) || (!selected.startsWith('before:') && selected !== 'end')) return liveScheduleError('옮길 날짜와 위치를 선택해 주세요.', 'live-move-feedback');
  if (!commitLiveSchedule(command, session.revision, '일정 날짜·위치 이동')) return liveScheduleError('이동을 저장하지 못했습니다. 계획이 바뀌었다면 창을 다시 열고, 저장 공간 문제라면 다시 시도해 주세요.', 'live-move-feedback');
  closeModal('modal-live-move', true);
  liveMoveSession = null;
  return true;
}

function moveLiveItem(dayIndex, spotIndex, offset) {
  if (!requireSharedPlanEdit()) return false;
  const target = liveScheduleTarget(dayIndex, spotIndex);
  if (!target?.item || ![-1, 1].includes(offset)) return false;
  const items = (target.day.spots || []).filter(item => liveScheduleActive(item) && !item.completed), index = items.findIndex(item => item.id === target.item.id), anchor = items[index + offset];
  if (index < 0 || !anchor) return liveScheduleError(offset < 0 ? '이미 첫 일정입니다.' : '이미 마지막 일정입니다.');
  return commitLiveSchedule({ type: 'move', tripId: target.trip.id, dayId: target.day.id, itemId: target.item.id, targetDayId: target.day.id, anchorId: anchor.id, position: offset < 0 ? 'before' : 'after' }, target.trip.revision, '일정 순서 변경');
}

function changeLiveItemStatus(type, dayIndex, spotIndex) {
  if (!requireSharedPlanEdit()) return false;
  const target = liveScheduleTarget(dayIndex, spotIndex);
  if (!target?.item) return false;
  const command = { type, tripId: target.trip.id, dayId: target.day.id, itemId: target.item.id }, revision = target.trip.revision;
  const label = { remove: '일정 제거', defer: '일정 보류', restore: '일정 복구' }[type];
  const apply = () => {
    if (!requireSharedPlanEdit()) return false;
    const saved = commitLiveSchedule(command, revision, label);
    if (saved) closeModal('modal-schedule-change', true);
    return saved;
  };
  if (target.item.fixed && type !== 'restore') {
    if (!confirm(`[${target.item.title || '고정 일정'}] 고정 일정을 ${type === 'remove' ? '제거' : '보류'}할까요?\n진행할 일정에서 빠지며 글과 사진은 보존됩니다. 변경 되돌리기 또는 복구로 다시 가져올 수 있습니다.`)) return false;
  }
  return apply();
}

function removeLiveItem(dayIndex, spotIndex) { return changeLiveItemStatus('remove', dayIndex, spotIndex); }
function deferLiveItem(dayIndex, spotIndex) { return changeLiveItemStatus('defer', dayIndex, spotIndex); }
function restoreLiveItem(dayIndex, spotIndex) { return changeLiveItemStatus('restore', dayIndex, spotIndex); }

function liveMetadataError(trip) {
  if (!trip) return '';
  try {
    SulsulTravel.LiveItinerary.validateMetadata(trip);
    return '';
  } catch (_) {
    return '변경 이력을 확인할 수 없습니다. 일정과 글·사진은 그대로 보존됩니다. 원본 백업을 보관하고 정상 백업으로 복원해 주세요.';
  }
}

function latestLiveScheduleChange(trip) {
  if (liveMetadataError(trip)) return null;
  return [...(trip?.planHistory || [])].reverse().find(entry => entry.type !== 'undo' && !entry.undoneBy);
}

function undoLiveSchedule() {
  if (!requireSharedPlanEdit()) return false;
  const trip = getActiveTrip(), entry = latestLiveScheduleChange(trip);
  if (liveMetadataError(trip)) return liveScheduleError(liveMetadataError(trip));
  if (!entry) return liveScheduleError('되돌릴 일정 변경이 없습니다.');
  const result = commitLiveSchedule({ type: 'undo', tripId: trip.id, eventId: entry.id }, trip.revision, '마지막 일정 변경 되돌리기');
  if (result && document.getElementById('modal-live-history') && !document.getElementById('modal-live-history').classList.contains('sheet-closed')) renderLiveHistory();
  return result;
}

function liveOrderEditingHelp(editing) {
  return `${editing ? '카드에서 앞뒤 추가·이동·보류·제거를 선택하세요.' : '순서·위치 편집을 열면 이동·보류·제거를 할 수 있어요.'} 순서·날짜 이동은 시각을 바꾸지 않습니다.`;
}

function toggleLiveEditing() {
  State.liveOrderEditing = !Boolean(State.liveOrderEditing);
  document.body.classList.toggle('live-order-editing', State.liveOrderEditing);
  document.querySelectorAll('[data-live-action="order-mode"]').forEach(button => {
    button.setAttribute('aria-pressed', String(State.liveOrderEditing));
    button.textContent = State.liveOrderEditing ? '순서·위치 편집 마치기' : '순서·위치 편집';
  });
  document.querySelectorAll('[data-live-order-help]').forEach(note => { note.textContent = liveOrderEditingHelp(State.liveOrderEditing); });
  return State.liveOrderEditing;
}

function renderLiveToolbar(dayIndex) {
  const trip = getActiveTrip();
  if (!trip?.days?.[dayIndex]) return '';
  const issue = liveMetadataError(trip), undo = latestLiveScheduleChange(trip), editing = Boolean(State.liveOrderEditing);
  document.body.classList.toggle('live-order-editing', editing);
  return `<div class="live-toolbar" aria-label="현장 일정 편집"><button class="companion-button companion-primary" data-live-toolbar="insert" onclick="openLiveInsert(${dayIndex},null,'end')">+ 일정 추가</button><button class="companion-button" data-live-action="order-mode" aria-pressed="${editing}" onclick="toggleLiveEditing()">${editing ? '순서·위치 편집 마치기' : '순서·위치 편집'}</button><button class="companion-button" data-live-toolbar="undo" onclick="undoLiveSchedule()" ${undo ? '' : 'disabled'}>변경 되돌리기</button><button class="companion-button" data-live-toolbar="history" onclick="openLiveHistory()">변경 이력·기준 계획</button><p class="live-help" data-live-order-help>${liveOrderEditingHelp(editing)}</p>${issue ? `<p class="live-help" role="status">${issue}</p>` : ''}</div>`;
}

function ensureLiveHistoryModal() {
  if (document.getElementById('modal-live-history')) return;
  const modal = document.createElement('div');
  modal.id = 'modal-live-history';
  modal.className = 'sheet-container sheet-closed';
  modal.innerHTML = `<div class="sheet-scrim" onclick="closeModal('modal-live-history')"></div><div class="sheet-box activity-sheet live-sheet" role="dialog" aria-modal="true" aria-labelledby="live-history-title"><header class="activity-sheet-header"><div><p>현장에서 바꾼 계획</p><h3 id="live-history-title">변경 이력·기준 계획</h3></div><button class="companion-button" onclick="closeModal('modal-live-history')" aria-label="변경 이력 닫기">닫기</button></header><div class="activity-sheet-body live-sheet-body" id="live-history-body"></div></div>`;
  document.body.append(modal);
}

function liveHistoryDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '시각 미정' : date.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function liveHistorySummary(entry, trip) {
  const patch = entry.inverse?.[0], before = patch?.before, after = patch?.after;
  const dayLabel = id => {
    const day = trip.days.find(item => item.id === id) || trip.planBaseline?.days?.find(item => item.id === id);
    return day ? [day.date, day.city || day.title].filter(Boolean).join(' ') : '이전 날짜';
  };
  const parts = [];
  if (before?.dayId && after?.dayId && before.dayId !== after.dayId) parts.push(`${dayLabel(before.dayId)} → ${dayLabel(after.dayId)}`);
  else if (after?.position?.dayId) parts.push(dayLabel(after.position.dayId));
  if (entry.type === 'move') parts.push('시각을 유지하며 목록 위치 이동');
  if (before?.fields && after?.fields && Object.prototype.hasOwnProperty.call(before.fields, 'time') && before.fields.time !== after.fields.time) parts.push(`${before.fields.time || '시간 미정'} → ${after.fields.time || '시간 미정'}`);
  if (entry.type === 'remove' || entry.type === 'defer') parts.push('글·사진 보존 · 복구 가능');
  return parts.join(' · ');
}

function renderLiveHistory() {
  const trip = getActiveTrip(), body = document.getElementById('live-history-body');
  if (!body || !trip) return;
  body.replaceChildren();
  const intro = document.createElement('p');
  intro.className = 'live-help';
  intro.textContent = '직접 편집한 계획의 변경 이력입니다. 글과 사진의 원문은 일정 변경과 별도로 보존됩니다.';
  body.append(intro);
  const issue = liveMetadataError(trip);
  if (issue) {
    const notice = document.createElement('p');
    notice.className = 'live-help';
    notice.setAttribute('role','status');
    notice.textContent = issue;
    body.append(notice);
    return;
  }
  const changes = trip.planHistory || [], undo = latestLiveScheduleChange(trip);
  const undoButton = document.createElement('button');
  undoButton.className = 'companion-button';
  undoButton.dataset.liveToolbar = 'undo';
  undoButton.textContent = '마지막 변경 되돌리기';
  undoButton.disabled = !undo;
  undoButton.onclick = undoLiveSchedule;
  body.append(undoButton);
  const list = document.createElement('ol');
  list.className = 'live-history-list';
  const names = { insert: '일정 추가', update: '시간·내용 수정', move: '날짜·순서 이동', remove: '일정 제거', defer: '일정 보류', restore: '일정 복구', replace: '일정 대체', undo: '변경 되돌리기', batch: '일정 묶음 조정' };
  for (const entry of [...changes].reverse()) {
    const row = document.createElement('li');
    row.className = 'live-history-entry';
    const title = document.createElement('strong');
    title.textContent = [names[entry.type] || '일정 변경', entry.title].filter(Boolean).join(' · ');
    const detail = document.createElement('p');
    detail.textContent = `${liveHistoryDate(entry.at)}${entry.undoneBy ? ' · 되돌린 변경' : ''}`;
    row.append(title, detail);
    const summary = liveHistorySummary(entry, trip);
    if (summary) { const change = document.createElement('p'); change.textContent = summary; row.append(change); }
    list.append(row);
  }
  if (!changes.length) { const empty = document.createElement('li'); empty.className = 'live-help'; empty.textContent = '아직 직접 편집한 변경 이력이 없습니다.'; list.append(empty); }
  body.append(list);
  const baseline = document.createElement('section');
  baseline.className = 'live-baseline';
  const heading = document.createElement('h4');
  heading.textContent = '처음 변경할 때 보관한 계획';
  const note = document.createElement('p');
  note.className = 'live-help';
  note.textContent = trip.planBaseline ? `${liveHistoryDate(trip.planBaseline.capturedAt)}에 당시 저장된 계획을 보관했습니다. 출발 전 원본을 보증하는 자료가 아니며, 이전 수정은 이미 반영되어 있을 수 있습니다.` : '첫 직접 변경을 저장할 때 당시 계획을 보관합니다. 출발 전 원본을 자동으로 복원하는 기능은 아닙니다.';
  baseline.append(heading, note);
  for (const day of trip.planBaseline?.days || []) {
    const details = document.createElement('details'), summary = document.createElement('summary'), items = document.createElement('ol');
    summary.textContent = [`Day ${day.dayNum || ''}`, day.date, day.city || day.title].filter(Boolean).join(' · ');
    for (const item of day.spots || []) {
      const line = document.createElement('li');
      line.textContent = `${item.time || '시간 미정'} · ${item.title || '일정'}${item.completed ? ' · 완료' : ''}`;
      items.append(line);
    }
    if (!day.spots?.length) { const line = document.createElement('li'); line.textContent = '등록한 일정이 없습니다.'; items.append(line); }
    details.append(summary, items);
    baseline.append(details);
  }
  body.append(baseline);
}

function openLiveHistory() {
  if (!getActiveTrip()) return false;
  ensureLiveHistoryModal();
  renderLiveHistory();
  openModal('modal-live-history');
  return true;
}
