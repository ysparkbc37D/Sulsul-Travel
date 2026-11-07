(function (root) {
  'use strict';

  const modalId = 'modal-spot-realignment';
  root.__spotReorderModeActive = false;
  root.__spotRealignmentPending = null;

  function notify(message, duration) {
    if (typeof root.showToast === 'function') root.showToast(message, duration);
  }

  function appState() {
    return root.SulsulTravel?.State || null;
  }

  function activeTrip() {
    const state = appState();
    return state?.trips?.find(trip => trip.id === state.activeTripId) || root.getActiveTrip?.() || state?.trips?.[0] || null;
  }

  function isProtected(spot) {
    return root.SulsulTravel?.SpotRealignment?.isProtected(spot) ||
      Boolean(spot?.completed || spot?.fixed || spot?.recordId || spot?.isDateLine ||
        spot?.timeConstraint || root.SulsulTravel?.ScheduleChange?.retired?.(spot));
  }

  function renderPlanAfterChange(dayIndex) {
    const state = appState();
    if (typeof root.renderPlanDetail === 'function' && state?.activeTab === 'plan') {
      root.renderPlanDetail(dayIndex);
    }
    if (typeof root.renderCompanionToday === 'function' && state?.activeTab === 'today') {
      root.renderCompanionToday();
    }
  }

  function toggleSpotReorderMode() {
    root.__spotReorderModeActive = !root.__spotReorderModeActive;
    const trip = activeTrip();
    const state = appState();
    if (trip && typeof root.renderPlanDetail === 'function' && state?.activeTab === 'plan') {
      root.renderPlanDetail(state?.activePlanDayIndex ?? 0);
    }
    if (typeof root.renderCompanionToday === 'function' && state?.activeTab === 'today') {
      root.renderCompanionToday();
    }
    notify(root.__spotReorderModeActive ? '스팟 순서 편집 모드가 켜졌습니다.' : '스팟 순서 편집 모드가 종료되었습니다.');
  }

  function moveCompanionSpotOrder(dayIndex, spotIndex, direction, event) {
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
    const trip = activeTrip();
    const day = trip?.days?.[dayIndex];
    const targetIndex = Number(spotIndex) + Number(direction);
    if (!trip || !day?.spots || ![-1, 1].includes(Number(direction)) || targetIndex < 0 || targetIndex >= day.spots.length) return false;
    const currentSpot = day.spots[spotIndex];
    const targetSpot = day.spots[targetIndex];
    if (isProtected(currentSpot) || isProtected(targetSpot)) {
      notify('완료·고정·기록 연결 일정은 이 버튼으로 이동할 수 없습니다. 먼저 일정 상태를 확인해 주세요.');
      return false;
    }

    const dayId = String(day.id || day.dayId || '');
    const currentId = String(currentSpot?.id || '');
    const targetId = String(targetSpot?.id || '');
    const saved = typeof root.commitTripCommand === 'function' && root.commitTripCommand({
      tripId: trip.id,
      expectedRevision: Number.isInteger(trip.revision) ? trip.revision : 0,
      change: copy => {
        const nextDay = dayId
          ? (copy.days || []).find(item => String(item.id || item.dayId || '') === dayId)
          : copy.days?.[dayIndex];
        if (!nextDay?.spots || !nextDay.spots[spotIndex] || !nextDay.spots[targetIndex]) {
          throw new Error('일정이 바뀌었습니다. 최신 일정을 열고 다시 시도해 주세요.');
        }
        const fromIndex = currentId ? nextDay.spots.findIndex(item => String(item.id || '') === currentId) : spotIndex;
        const toIndex = targetId ? nextDay.spots.findIndex(item => String(item.id || '') === targetId) : targetIndex;
        if (fromIndex < 0 || toIndex < 0 || Math.abs(fromIndex - toIndex) !== 1 ||
            isProtected(nextDay.spots[fromIndex]) || isProtected(nextDay.spots[toIndex])) {
          throw new Error('일정 상태가 바뀌었습니다. 최신 일정을 다시 확인해 주세요.');
        }
        const temp = nextDay.spots[fromIndex];
        nextDay.spots[fromIndex] = nextDay.spots[toIndex];
        nextDay.spots[toIndex] = temp;
      }
    });
    if (!saved) return false;

    notify('일정 순서가 ' + (direction < 0 ? '위' : '아래') + '로 변경되었습니다.');
    renderPlanAfterChange(dayIndex);
    return true;
  }

  function ensurePreviewModal() {
    let modal = root.document.getElementById(modalId);
    if (modal) return modal;
    modal = root.document.createElement('div');
    modal.id = modalId;
    modal.className = 'sheet-container sheet-closed';
    modal.innerHTML =
      '<div class=\"sheet-scrim\" onclick=\"cancelSpotRealignment()\"></div>' +
      '<section class=\"sheet-box activity-sheet\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"spot-realignment-title\">' +
        '<header class=\"activity-sheet-header\"><div><p>PLAN · TIME PREVIEW</p><h3 id=\"spot-realignment-title\">일정 시간 조정</h3><p id=\"spot-realignment-summary\"></p></div>' +
          '<button class=\"companion-button\" type=\"button\" onclick=\"cancelSpotRealignment()\" aria-label=\"미리보기 닫기\">닫기</button></header>' +
        '<div class=\"activity-sheet-body\"><p id=\"spot-realignment-guidance\" class=\"companion-context\" role=\"status\" aria-live=\"polite\"></p>' +
          '<ol id=\"spot-realignment-list\" class=\"spot-realignment-list\"></ol></div>' +
        '<footer class=\"activity-sheet-footer\"><button class=\"companion-button\" type=\"button\" onclick=\"cancelSpotRealignment()\">취소</button>' +
          '<button id=\"spot-realignment-apply\" class=\"companion-button companion-primary\" type=\"button\" onclick=\"applySpotRealignment()\">변경 적용</button></footer>' +
      '</section>';
    root.document.body.appendChild(modal);
    return modal;
  }

  function setText(id, value) {
    const node = root.document.getElementById(id);
    if (node) node.textContent = value;
    return node;
  }

  function showPreview(trip, day, dayIndex, intervalMinutes, proposal) {
    const modal = ensurePreviewModal();
    const pending = {
      tripId: trip.id,
      dayId: String(day.id || day.dayId || ''),
      dayIndex,
      baseRevision: Number.isInteger(trip.revision) ? trip.revision : 0,
      intervalMinutes,
      changes: proposal.changes.map(item => ({...item}))
    };
    root.__spotRealignmentPending = pending;

    const changeCount = proposal.changes.length;
    setText('spot-realignment-summary',
      (day.title || day.city || ('Day ' + (day.dayNum || dayIndex + 1))) + ' · ' +
      changeCount + '개 일정 변경 · 완료·고정·기록 연결 일정 ' + proposal.protectedCount + '개 보존');

    const guidance = root.document.getElementById('spot-realignment-guidance');
    if (guidance) {
      guidance.textContent = proposal.ok
        ? '등록된 소요시간을 반영합니다. 미입력 일정은 ' + intervalMinutes +
          '분으로 계산합니다. 이동시간을 별도 일정으로 기록하지 않았다면 이동시간은 추정하지 않습니다.'
        : proposal.message;
    }

    const list = root.document.getElementById('spot-realignment-list');
    list?.replaceChildren();
    if (list && proposal.ok) {
      proposal.changes.forEach(change => {
        const item = root.document.createElement('li');
        const title = root.document.createElement('strong');
        const times = root.document.createElement('span');
        title.textContent = change.title;
        times.textContent = (change.beforeTime || '시간 미정') + ' → ' + change.afterTime;
        item.append(title, times);
        list.appendChild(item);
      });
    }

    const apply = root.document.getElementById('spot-realignment-apply');
    if (apply) {
      apply.disabled = !proposal.ok || !changeCount;
      apply.textContent = proposal.ok ? '변경 적용' : '간격 조정 필요';
    }
    root.openModal?.(modalId);
    return modal;
  }

  function realignSpotSchedule(dayIndex, intervalMinutes = 30) {
    const trip = activeTrip();
    const day = trip?.days?.[dayIndex];
    if (!trip || !day?.spots?.length) return false;
    const proposal = root.SulsulTravel?.SpotRealignment?.preview(day, intervalMinutes);
    if (!proposal) {
      notify('일정 조정 기능을 불러오지 못했습니다. 화면을 새로 열어 다시 시도해 주세요.');
      return false;
    }
    if (proposal.ok && !proposal.changes.length) {
      notify('변경할 일정이 없습니다. 완료·고정 일정은 그대로 유지됩니다.');
      return false;
    }
    showPreview(trip, day, dayIndex, intervalMinutes, proposal);
    return proposal;
  }

  function cancelSpotRealignment() {
    root.__spotRealignmentPending = null;
    root.closeModal?.(modalId, true);
  }

  function findPendingDay(trip, pending) {
    if (pending.dayId) {
      return (trip.days || []).find(day => String(day.id || day.dayId || '') === pending.dayId) || null;
    }
    return trip.days?.[pending.dayIndex] || null;
  }

  function applySpotRealignment() {
    const pending = root.__spotRealignmentPending;
    if (!pending || !pending.changes?.length) return false;
    const trip = appState()?.trips?.find(item => item.id === pending.tripId);
    const day = trip && findPendingDay(trip, pending);
    if (!trip || !day || (Number.isInteger(trip.revision) ? trip.revision : 0) !== pending.baseRevision) {
      setText('spot-realignment-guidance', '여행 내용이 미리보기 이후 바뀌었습니다. 창을 닫고 최신 일정으로 다시 조정해 주세요.');
      const button = root.document.getElementById('spot-realignment-apply');
      if (button) button.disabled = true;
      return false;
    }

    for (const change of pending.changes) {
      const spot = change.spotId
        ? day.spots?.find(item => String(item.id || '') === change.spotId)
        : day.spots?.[change.spotIndex];
      if (!spot || isProtected(spot) || String(spot.time || '') !== change.beforeTime ||
          String(spot.title || spot.name || '이름 없는 일정').slice(0, 100) !== change.title) {
        setText('spot-realignment-guidance', '일정 일부가 미리보기 이후 바뀌었습니다. 창을 닫고 최신 일정으로 다시 조정해 주세요.');
        const button = root.document.getElementById('spot-realignment-apply');
        if (button) button.disabled = true;
        return false;
      }
    }

    const saved = typeof root.commitTripCommand === 'function' && root.commitTripCommand({
      tripId: pending.tripId,
      expectedRevision: pending.baseRevision,
      change: copy => {
        const targetDay = findPendingDay(copy, pending);
        if (!targetDay) throw new Error('일정 날짜가 바뀌었습니다. 최신 일정을 다시 열어 주세요.');
        pending.changes.forEach(change => {
          const spot = change.spotId
            ? targetDay.spots?.find(item => String(item.id || '') === change.spotId)
            : targetDay.spots?.[change.spotIndex];
          if (!spot || isProtected(spot) || String(spot.time || '') !== change.beforeTime) {
            throw new Error('일정이 미리보기 이후 바뀌었습니다. 다시 미리보기를 열어 주세요.');
          }
          spot.time = change.afterTime;
        });
      }
    });
    if (!saved) {
      setText('spot-realignment-guidance', '저장하지 못했습니다. 일정 초안은 유지했습니다. 최신 상태를 확인한 뒤 다시 시도해 주세요.');
      return false;
    }

    const dayIndex = pending.dayIndex;
    root.__spotRealignmentPending = null;
    root.closeModal?.(modalId, true);
    renderPlanAfterChange(dayIndex);
    notify('일정 시간이 조정됐습니다. 완료·고정·기록 연결 일정은 보존했습니다.');
    return true;
  }

  root.toggleSpotReorderMode = toggleSpotReorderMode;
  root.moveCompanionSpotOrder = moveCompanionSpotOrder;
  root.realignSpotSchedule = realignSpotSchedule;
  root.cancelSpotRealignment = cancelSpotRealignment;
  root.applySpotRealignment = applySpotRealignment;
})(typeof window !== 'undefined' ? window : globalThis);
