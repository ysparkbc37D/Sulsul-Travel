/* 스팟 추가·수정 모달, 실시간 일정 튜닝, RePlan 검토 (v2.2.2, 계획 4단계 14차).
 * index.html의 #modal-spot, #modal-schedule-tuning, #modal-replan-review 제어와
 * openAddSpotModal·openAddSpotToDay·openEditSpotModal·sortDaySpotsByTime·submitSpot·submitAddSpot·
 * toggleSpotFixed·toggleSpotCompleted·describeReplanScope·openScheduleTuningModal·
 * findPlanBlockForReplanScope·describePlanBlockForAi·buildAiReplanPrompt·
 * startPlanBlockAiRegeneration·setTuningPreset·adjustTuningMinutes·rebalanceTripSchedule·
 * getReplanDomain·showHeuristicReplanReview·executeScheduleTuning·applyPendingReplan·
 * rejectPendingReplan(약 425줄)을 옮겼다.
 * 셸 함수(getActiveTrip·requireSharedPlanEdit·syncLiveSpotPosition·submitLiveSpot·
 * commitLiveSchedule·completeTodaySpot·cleanApiKey·startAiDraftJob·timeToMinutes·minutesToTime·
 * openModal·closeModal·showToast·escapeHtml·renderActiveTripWorkspace·switchTab)와
 * 전역 State·TripRepository는 부를 때 찾는다.
 * 모든 동작은 data-on-click/data-on-change="scheduleTuning.*"로 잇고,
 * 불러올 때는 등록만 하고 문서를 건드리지 않는다. */
(function (root) {
  'use strict';
  const T = root.SulsulTravel = root.SulsulTravel || {};
  const $ = id => document.getElementById(id);

  let replanDomainPromise = null;
  let applyingReplan = false;
  let activeTuningPreset = '';

  function safeDayNum(day, idx) {
    const n = Number(day?.dayNum);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : (idx + 1);
  }

  function buildDayOptionsHtml(days) {
    return (days || []).map((d, idx) => (
      `<option value="${Number(idx)}">Day ${Number(safeDayNum(d, idx))}: ${escapeHtml(d?.title || '')}</option>`
    )).join('');
  }

  function syncTuningPresetButtons(selectedType) {
    activeTuningPreset = selectedType || '';
    document.querySelectorAll('#modal-schedule-tuning [data-on-click="scheduleTuning.preset"]').forEach(btn => {
      const active = Boolean(activeTuningPreset) && btn.dataset.preset === activeTuningPreset;
      btn.setAttribute('aria-pressed', String(active));
      btn.classList.toggle('ring-2', active);
      btn.classList.toggle('ring-amber-400', active);
    });
  }

  // ── 1. 스팟 추가·수정·고정·완료 ──
  function openAddSpotModal() {
    const trip = getActiveTrip();
    if (!trip || !requireSharedPlanEdit()) return;
    if (!Array.isArray(trip.days) || trip.days.length === 0) {
      showToast('일정이 포함된 여행을 먼저 만들어 주세요.');
      return;
    }
    const modal = $('modal-spot');
    modal.dataset.tripId = trip.id;
    modal.dataset.baseRevision = String(trip.revision);
    modal.dataset.replacement = 'false';
    modal.dataset.editSpotId = '';
    modal.dataset.sourceDayId = '';

    const posSelect = $('spot-form-position');
    if (posSelect) {
      posSelect.value = 'time';
      const keepOpt = posSelect.querySelector('[value="keep"]');
      if (keepOpt) keepOpt.disabled = true;
    }
    const fixedChk = $('spot-form-fixed');
    if (fixedChk) fixedChk.checked = false;
    const notice = $('spot-form-notice');
    if (notice) notice.textContent = 'AI 고정은 자동 조정에서만 보호합니다. 직접 수정·취소·대체할 수 있습니다.';

    const daySelect = $('spot-form-day');
    if (daySelect) {
      daySelect.innerHTML = buildDayOptionsHtml(trip.days);
      daySelect.value = '0';
    }

    const editIdxInput = $('spot-form-edit-idx');
    if (editIdxInput) editIdxInput.value = '';
    const modalTitle = $('spot-form-modal-title');
    if (modalTitle) modalTitle.innerText = '새 일정 추가';
    const formIcon = $('spot-form-icon');
    if (formIcon) formIcon.className = 'fa-solid fa-location-dot text-amber-400';
    const submitBtn = $('spot-form-submit-btn');
    if (submitBtn) submitBtn.innerText = '스팟 저장';

    const timeInput = $('spot-form-time');
    if (timeInput) timeInput.value = '';
    const catSelect = $('spot-form-cat');
    if (catSelect) catSelect.value = 'tour';
    const titleInput = $('spot-form-title');
    if (titleInput) titleInput.value = '';
    const memoInput = $('spot-form-memo');
    if (memoInput) memoInput.value = '';
    const tipInput = $('spot-form-tip');
    if (tipInput) tipInput.value = '';
    const costInput = $('spot-form-cost');
    if (costInput) costInput.value = '';

    syncLiveSpotPosition();
    openModal('modal-spot');
  }

  function openAddSpotToDay(dayIdx) {
    if (!requireSharedPlanEdit()) return;
    const trip = getActiveTrip();
    if (!trip || !Array.isArray(trip.days) || trip.days.length === 0) {
      showToast('일정이 포함된 여행을 먼저 만들어 주세요.');
      return;
    }
    openAddSpotModal();
    const numeric = Number(dayIdx);
    const safeIdx = Number.isInteger(numeric) && numeric >= 0 && numeric < trip.days.length ? numeric : 0;
    const daySelect = $('spot-form-day');
    if (daySelect) daySelect.value = String(safeIdx);
    syncLiveSpotPosition();
  }

  function openEditSpotModal(dayIdx, spotIdx, evt) {
    if (!requireSharedPlanEdit()) return;
    if (evt && typeof evt.stopPropagation === 'function') evt.stopPropagation();
    const trip = getActiveTrip();
    if (!trip || !trip.days || !trip.days[dayIdx] || !trip.days[dayIdx].spots || !trip.days[dayIdx].spots[spotIdx]) return;
    const spot = trip.days[dayIdx].spots[spotIdx];

    const modal = $('modal-spot');
    modal.dataset.tripId = trip.id;
    modal.dataset.baseRevision = String(trip.revision);
    modal.dataset.replacement = 'false';
    modal.dataset.editSpotId = spot.id;
    modal.dataset.sourceDayId = trip.days[dayIdx].id;

    const posSelect = $('spot-form-position');
    if (posSelect) {
      posSelect.value = 'keep';
      const keepOpt = posSelect.querySelector('[value="keep"]');
      if (keepOpt) keepOpt.disabled = false;
    }
    const fixedChk = $('spot-form-fixed');
    if (fixedChk) fixedChk.checked = Boolean(spot.fixed);
    const notice = $('spot-form-notice');
    if (notice) notice.textContent = '시간·내용은 직접 수정할 수 있습니다. 연결된 여행 기록의 원문은 유지됩니다.';

    const daySelect = $('spot-form-day');
    if (daySelect) {
      daySelect.innerHTML = buildDayOptionsHtml(trip.days);
      daySelect.value = String(dayIdx);
    }

    const editIdxInput = $('spot-form-edit-idx');
    if (editIdxInput) editIdxInput.value = `${dayIdx}:${spotIdx}`;
    const modalTitle = $('spot-form-modal-title');
    if (modalTitle) modalTitle.innerText = '30분 단위 스팟 수정';
    const formIcon = $('spot-form-icon');
    if (formIcon) formIcon.className = 'fa-solid fa-pen-to-square text-amber-400';
    const submitBtn = $('spot-form-submit-btn');
    if (submitBtn) submitBtn.innerText = '수정 내용 저장';

    // 시간 미정('') 일정을 열었을 때 '09:00'을 임의로 채워 넣지 않고 원문을 보존한다.
    const timeInput = $('spot-form-time');
    if (timeInput) timeInput.value = spot.time || '';
    const catSelect = $('spot-form-cat');
    if (catSelect) catSelect.value = spot.cat || 'tour';
    const titleInput = $('spot-form-title');
    if (titleInput) titleInput.value = spot.title || '';
    const memoInput = $('spot-form-memo');
    if (memoInput) memoInput.value = spot.desc || spot.memo || '';
    const tipInput = $('spot-form-tip');
    if (tipInput) tipInput.value = spot.tip || '';
    const costInput = $('spot-form-cost');
    if (costInput) costInput.value = spot.cost ? String(spot.cost) : '';

    syncLiveSpotPosition();
    openModal('modal-spot');
  }

  function sortDaySpotsByTime(dayIdx) {
    const trip = getActiveTrip();
    if (!trip || !trip.days || !trip.days[dayIdx] || !Array.isArray(trip.days[dayIdx].spots)) return;
    const day = trip.days[dayIdx];
    const hasDateLineFlight = day.spots.some(s => s.isDateLine);
    if (!hasDateLineFlight) {
      day.spots.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
    }
  }

  function submitSpot() {
    return submitLiveSpot();
  }

  function submitAddSpot() {
    return submitSpot();
  }

  function toggleSpotFixed(dayIdx, spotIdx, evt) {
    evt?.stopPropagation();
    const trip = getActiveTrip(), day = trip?.days[dayIdx], spot = day?.spots[spotIdx];
    if (!spot) return;
    return commitLiveSchedule(
      { type: 'update', tripId: trip.id, dayId: day.id, itemId: spot.id, changes: { fixed: !spot.fixed } },
      trip.revision,
      spot.fixed ? '일정 고정을 해제했습니다.' : 'AI 조정에서 보호할 고정 일정으로 저장했습니다.'
    );
  }

  function toggleSpotCompleted(dayIdx, spotIdx, evt) {
    evt?.stopPropagation();
    const trip = getActiveTrip(), day = trip?.days[dayIdx], spot = day?.spots[spotIdx];
    if (!spot) return;
    if (!T.LiveItinerary.active(spot)) {
      showToast('보관한 일정을 먼저 복구한 뒤 완료해 주세요.');
      return false;
    }
    return commitLiveSchedule(
      { type: 'update', tripId: trip.id, dayId: day.id, itemId: spot.id, changes: { completed: !spot.completed } },
      trip.revision,
      spot.completed ? '방문 완료를 취소했습니다.' : '방문 완료로 기록했습니다.'
    );
  }

  // ── 2. 실시간 변수 대응·일정 튜닝·RePlan ──
  function describeReplanScope(targetDayVal, trip) {
    const activeTrip = trip !== undefined ? trip : getActiveTrip();
    if (targetDayVal === 'all') return '전체 일정';
    const range = /^range:(\d+):(\d+)$/.exec(String(targetDayVal));
    if (range) {
      const start = Number(range[1]), end = Number(range[2]);
      const block = T.PlanBlocks.buildBlocks(activeTrip).find(item => item.days[0].dayIndex === start && item.days[item.days.length - 1].dayIndex === end);
      return block ? `${block.title || block.place} 구간 (Day ${start + 1}~${end + 1})` : `Day ${start + 1}~${end + 1}`;
    }
    return `Day ${Number(targetDayVal) + 1}`;
  }

  function openScheduleTuningModal(dayIdx = null, rangeEndIdx = null) {
    if (!requireSharedPlanEdit()) return;
    const trip = getActiveTrip();
    if (!trip || !trip.days || trip.days.length === 0) {
      showToast('일정이 포함된 여행을 먼저 선택해 주세요.');
      return;
    }
    const select = $('tuning-target-day');
    if (select) {
      const startNum = dayIdx !== null && dayIdx !== undefined && dayIdx !== 'all' ? Number(dayIdx) : NaN;
      const endNum = rangeEndIdx !== null && rangeEndIdx !== undefined ? Number(rangeEndIdx) : NaN;
      const validRange = Number.isInteger(startNum) && Number.isInteger(endNum) && startNum >= 0 && endNum >= startNum && endNum < trip.days.length;
      const validSingle = Number.isInteger(startNum) && startNum >= 0 && startNum < trip.days.length;

      const parts = [];
      if (validRange) {
        parts.push(`<option value="range:${Number(startNum)}:${Number(endNum)}">${escapeHtml(describeReplanScope(`range:${startNum}:${endNum}`, trip))}만</option>`);
      }
      parts.push(`<option value="all">전체 일정 (Day 1 ~ Day ${Number(trip.days.length)})</option>`);
      parts.push(buildDayOptionsHtml(trip.days));
      select.innerHTML = parts.join('');

      if (validRange) {
        select.value = `range:${startNum}:${endNum}`;
      } else if (validSingle) {
        select.value = String(startNum);
      } else {
        select.value = 'all';
      }
    }
    const offsetInput = $('tuning-offset-minutes');
    if (offsetInput) offsetInput.value = '60';
    const reasonInput = $('tuning-reason-input');
    if (reasonInput) reasonInput.value = '';
    syncTuningPresetButtons('');
    openModal('modal-schedule-tuning');
  }

  function findPlanBlockForReplanScope(targetDayVal, trip) {
    const activeTrip = trip !== undefined ? trip : getActiveTrip();
    if (!activeTrip) return null;
    const blocks = T.PlanBlocks.buildBlocks(activeTrip);
    const range = /^range:(\d+):(\d+)$/.exec(String(targetDayVal));
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      return blocks.find(block => block.days[0].dayIndex === start && block.days[block.days.length - 1].dayIndex === end) || null;
    }
    if (targetDayVal !== 'all') {
      const dayIndex = Number(targetDayVal);
      return blocks.find(block => block.days.some(item => item.dayIndex === dayIndex)) || null;
    }
    return null;
  }

  function describePlanBlockForAi(block) {
    if (!block) return '';
    return `
사용자가 편집하고 저장한 큰 계획(가장 우선하는 조건):
- 카드 제목: ${block.title || '제목 없음'}
- 방문 거점/도시: ${block.place || '미정'}
- 희망 기간: ${block.startDate || '미정'} ~ ${block.endDate || block.startDate || '미정'}
- 숙소/체류 기준: ${block.lodging || '지정 없음'}
- 꼭 하고 싶은 경험: ${(block.priorities || []).join(', ') || '지정 없음'}
- 위험·예약·이동 메모: ${block.notes || '없음'}`;
  }

  function buildAiReplanPrompt({ trip, targetDayVal, offsetMinutes = 0, reason, snapshotDays }) {
    const block = findPlanBlockForReplanScope(targetDayVal, trip);
    const destination = (trip.countries || []).join(', ') || (trip.cities || []).join(', ') || trip.title || '사용자 지정 여행지';
    return `당신은 여행 큰 계획을 실제 일정으로 다시 설계하는 전문가입니다. 아래 현재 일정 JSON을 바탕으로 변경된 전체 days JSON 배열만 반환하세요.
여행 전체 목적지: ${destination}
여행의 주요 도시: ${(trip.cities || []).join(', ') || '사용자 지정'}
변경 요청: ${reason}
대상: ${describeReplanScope(targetDayVal, trip)}
기준 시간 조정: ${offsetMinutes >= 0 ? '+' : ''}${offsetMinutes}분${describePlanBlockForAi(block)}
규칙:
1. 전체 배열 길이, day 순서와 dayNum은 유지하세요.
2. 지정한 대상 범위 밖 day는 어떤 필드도 바꾸지 마세요.
3. completed, fixed, skipped, cancelled가 true이거나 recordId가 있는 일정은 ID를 포함한 모든 필드를 그대로 유지하고 삭제하지 마세요. 취소 일정을 되살리지 말고 기존 day의 id도 유지하세요.
4. 대상 범위 안에서는 사용자가 저장한 거점, 기간, 숙소, 우선 경험과 메모를 최우선으로 반영해 day title, city, date와 미완료 세부 일정을 다시 설계하세요.
5. 이동 시간과 휴식 여유를 포함하고, 예약·운영시간처럼 확인이 필요한 사실은 확정하지 말고 desc에 '확인 필요'로 표시하세요.
6. 각 spot은 time(HH:MM), cat, title, desc, tip, cost를 포함하세요.
현재 일정 JSON:
${JSON.stringify(snapshotDays)}`;
  }

  async function startPlanBlockAiRegeneration(blockId, reason) {
    const trip = getActiveTrip();
    const block = T.PlanBlocks.buildBlocks(trip).find(item => item.id === blockId);
    if (!trip || !block) return;
    if (!cleanApiKey(State.geminiKey || localStorage.getItem('st_gemini_key'))) {
      showToast('⚠️ 큰 계획 편집은 저장했습니다. Gemini 키를 등록한 뒤 카드의 AI 재생성을 다시 눌러 주세요.', 5500);
      return;
    }
    State.replanReturnBlockId = block.id;
    const start = block.days[0].dayIndex;
    const end = block.days[block.days.length - 1].dayIndex;
    const targetDayVal = `range:${start}:${end}`;
    const snapshotDays = JSON.parse(JSON.stringify(trip.days));
    const prompt = buildAiReplanPrompt({ trip, targetDayVal, reason, snapshotDays, offsetMinutes: 0 });
    showToast('🤖 수정한 큰 계획을 기준으로 이 구간의 AI 초안을 만들고 있습니다...', 3500);
    try {
      const result = await startAiDraftJob({
        id: `plan-block-ai:${trip.id}:${block.id}:${trip.revision || 0}:${Date.now()}`,
        tripId: trip.id,
        targetId: block.id,
        kind: 'replan',
        baseRevision: trip.revision || 0,
        input: { prompt, snapshotDays, reason, targetDayVal, offsetMinutes: 0, planBlockId: block.id }
      });
      if (!result || ['waiting_network', 'failed'].includes(result.state)) {
        showToast('⚠️ AI 재생성에 실패했습니다. 저장한 큰 계획과 기존 일정은 유지되며 카드에서 다시 시도할 수 있습니다.', 5500);
      }
    } catch (error) {
      console.warn('[PlanBlock AI] proposal unavailable:', error?.message);
      showToast('⚠️ AI 재생성에 실패했습니다. 저장한 큰 계획과 기존 일정은 그대로 유지됩니다.', 5500);
    }
  }

  function setTuningPreset(type, minutes, reason) {
    const offsetInput = $('tuning-offset-minutes');
    const reasonInput = $('tuning-reason-input');
    if (offsetInput) offsetInput.value = String(minutes);
    if (reasonInput) reasonInput.value = reason;
    syncTuningPresetButtons(type);
  }

  function adjustTuningMinutes(delta) {
    const offsetInput = $('tuning-offset-minutes');
    if (!offsetInput) return;
    const cur = parseInt(offsetInput.value, 10) || 0;
    offsetInput.value = String(cur + delta);
    syncTuningPresetButtons('');
  }

  function resolveRebalanceIndices(days, targetDayVal) {
    if (targetDayVal === 'all' || targetDayVal === null || targetDayVal === undefined) {
      return days.map((_, i) => i);
    }
    const range = /^range:(\d+):(\d+)$/.exec(String(targetDayVal));
    if (range) {
      const start = Math.max(0, Number(range[1]));
      const end = Math.min(days.length - 1, Number(range[2]));
      if (start > end) return [];
      return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }
    const idx = Number(targetDayVal);
    return Number.isInteger(idx) && idx >= 0 && idx < days.length ? [idx] : [];
  }

  function rebalanceTripSchedule(trip, targetDayVal, offsetMinutes, reason = '') {
    if (!trip || !Array.isArray(trip.days)) return null;
    const clonedDays = JSON.parse(JSON.stringify(trip.days));
    const targetIndices = resolveRebalanceIndices(clonedDays, targetDayVal);

    let modifiedSpotsCount = 0;
    let preservedCompletedCount = 0;

    targetIndices.forEach(dIdx => {
      const day = clonedDays[dIdx];
      if (!day || !Array.isArray(day.spots)) return;

      day.spots.forEach(spot => {
        if (spot.completed || spot.fixed || spot.recordId || spot.skipped || spot.cancelled) {
          preservedCompletedCount++;
          return;
        }
        if (offsetMinutes !== 0 && spot.time) {
          const curMins = timeToMinutes(spot.time);
          const newMins = curMins + offsetMinutes;
          spot.time = minutesToTime(newMins);
          modifiedSpotsCount++;
        }
        if (reason && !spot.desc?.includes(reason) && !spot.memo?.includes(reason)) {
          const tag = `[일정조정: ${offsetMinutes > 0 ? '+' : ''}${offsetMinutes}분 (${reason})]`;
          if (spot.desc) spot.desc += ` ${tag}`;
          else if (spot.memo) spot.memo += ` ${tag}`;
          else spot.desc = tag;
        }
      });

      const hasDateLineFlight = day.spots.some(s => s.isDateLine);
      if (!hasDateLineFlight) {
        day.spots.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
      }
    });

    return {
      proposedDays: clonedDays,
      modifiedSpotsCount,
      preservedCompletedCount
    };
  }

  function getReplanDomain() {
    if (!replanDomainPromise) {
      const url = new URL('./js/domain/replan.mjs?v=2.2.4', root.document.baseURI).href;
      replanDomainPromise = import(url);
    }
    return replanDomainPromise;
  }

  async function showHeuristicReplanReview(trip, targetDayVal, offsetMinutes, reason) {
    const domain = await getReplanDomain();
    const proposal = domain.createReplanProposal({
      days: trip.days,
      targetDay: targetDayVal,
      offsetMinutes,
      reason
    });
    State.pendingReplan = {
      id: `replan:${trip.id}:${trip.revision || 0}:${Date.now()}`,
      tripId: trip.id,
      baseRevision: trip.revision || 0,
      reason,
      targetDayVal,
      proposedDays: proposal.proposedDays,
      changes: proposal.changes
    };
    const summaryEl = $('replan-review-summary');
    if (summaryEl) {
      summaryEl.textContent = `${describeReplanScope(targetDayVal, trip)} · ${reason} · 변경 ${proposal.changes.length}개 · 완료 ${proposal.preservedCompletedCount}개 / 고정 ${proposal.preservedFixedCount}개 보호`;
    }
    const changesEl = $('replan-review-changes');
    if (changesEl) {
      if (proposal.changes.length) {
        changesEl.innerHTML = proposal.changes.map(change => (
          `<div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2 p-3 rounded-xl bg-[#080b12] border border-[#1a2236] text-xs">` +
          `<div><strong class="text-slate-200">${escapeHtml(change.title)}</strong><p class="text-slate-500 mt-0.5">Day ${escapeHtml(String(Number(change.dayIndex) + 1))}</p></div>` +
          `<span class="text-slate-500">→</span>` +
          `<strong class="text-amber-300 text-right">${escapeHtml(change.before)} → ${escapeHtml(change.after)}</strong></div>`
        )).join('');
      } else {
        const emptyText = Number(offsetMinutes) === 0
          ? '시간 조정이 0분이어서 오프라인 시간 이동 변경 사항이 없습니다. 분 단위를 입력하거나 AI 스마트 재생성을 이용해 주세요.'
          : '바꿀 수 있는 미완료 일정이 없습니다. 완료·고정 일정은 유지됩니다.';
        changesEl.innerHTML = `<div class="p-4 rounded-xl bg-[#080b12] text-slate-400 text-xs">${escapeHtml(emptyText)}</div>`;
      }
    }
    const applyBtn = $('btn-apply-replan');
    if (applyBtn) applyBtn.disabled = proposal.changes.length === 0;
    closeModal('modal-schedule-tuning', true);
    openModal('modal-replan-review');
  }

  async function executeScheduleTuning(useAi) {
    const trip = getActiveTrip();
    if (!trip?.days?.length) return;
    const targetDayVal = $('tuning-target-day')?.value || 'all';
    const offsetMinutes = parseInt($('tuning-offset-minutes')?.value, 10) || 0;
    const reason = $('tuning-reason-input')?.value.trim() || '현장 일정 변화';
    if (!useAi) return showHeuristicReplanReview(trip, targetDayVal, offsetMinutes, reason);

    closeModal('modal-schedule-tuning', true);
    showToast('🤖 AI가 현재 계획과 보호 조건을 함께 검토하고 있습니다...', 3000);
    const snapshotDays = JSON.parse(JSON.stringify(trip.days));
    const prompt = buildAiReplanPrompt({ trip, targetDayVal, offsetMinutes, reason, snapshotDays });
    try {
      const result = await startAiDraftJob({
        id: `replan-ai:${trip.id}:${trip.revision || 0}:${Date.now()}`,
        tripId: trip.id,
        targetId: 'replan',
        kind: 'replan',
        baseRevision: trip.revision || 0,
        input: { prompt, snapshotDays, reason, targetDayVal, offsetMinutes }
      });
      if (!result || ['waiting_network', 'failed'].includes(result.state)) {
        showToast('AI 초안을 만들지 못해 안전한 시간 조정안을 보여드립니다.', 3500);
        await showHeuristicReplanReview(trip, targetDayVal, offsetMinutes, reason);
      }
    } catch (error) {
      console.warn('[RePlan] AI proposal unavailable:', error?.message);
      await showHeuristicReplanReview(trip, targetDayVal, offsetMinutes, reason);
    }
  }

  async function applyPendingReplan() {
    if (applyingReplan) return;
    const pending = State.pendingReplan;
    if (!pending) return;
    applyingReplan = true;
    const applyBtn = $('btn-apply-replan');
    if (applyBtn) applyBtn.disabled = true;
    try {
      const domain = await getReplanDomain();
      const current = State.trips.find(item => item.id === pending.tripId);
      if (!current || current.revision !== pending.baseRevision || !domain.protectedSpotsMatch(current.days, pending.proposedDays) || !domain.outsideScopeMatches(current.days, pending.proposedDays, pending.targetDayVal || 'all')) {
        closeModal('modal-replan-review', true);
        State.pendingReplan = null;
        showToast('⚠️ 검토 중 계획이 바뀌어 적용하지 않았습니다. 현재 일정에서 다시 만들어 주세요.', 4500);
        return;
      }
      const result = await TripRepository.applyDraft({
        tripId: pending.tripId,
        baseRevision: pending.baseRevision,
        jobId: pending.id,
        mutate: draftTrip => { draftTrip.days = JSON.parse(JSON.stringify(pending.proposedDays)); }
      });
      if (result.status !== 'applied') {
        if (applyBtn) applyBtn.disabled = false;
        showToast('⚠️ 변경안을 저장하지 못했습니다. 원래 계획은 유지됩니다.', 4500);
        return;
      }
      State.pendingReplan = null;
      closeModal('modal-replan-review', true);
      renderActiveTripWorkspace();
      if (State.replanReturnBlockId) {
        State.activePlanBlockId = State.replanReturnBlockId;
        State.replanReturnBlockId = null;
        T.PlanBlocks.renderDetail();
      } else {
        switchTab('today');
      }
      showToast('✅ RePlan을 적용했습니다. 완료 기록과 고정 일정은 유지됩니다.');
    } finally {
      applyingReplan = false;
    }
  }

  function rejectPendingReplan() {
    State.pendingReplan = null;
    State.replanReturnBlockId = null;
    closeModal('modal-replan-review', true);
    showToast('기존 계획을 유지합니다.');
  }

  T.UiActions.define('scheduleTuning', {
    syncPosition: () => syncLiveSpotPosition(),
    submitSpot: () => submitSpot(),
    openAddSpot: el => el.dataset.day === undefined ? openAddSpotModal() : openAddSpotToDay(Number(el.dataset.day)),
    openEditSpot: (el, evt) => openEditSpotModal(Number(el.dataset.day), Number(el.dataset.spot), evt),
    toggleCompleted: (el, evt) => {
      if (el.dataset.today === '1') return completeTodaySpot(Number(el.dataset.day), Number(el.dataset.spot), evt);
      return toggleSpotCompleted(Number(el.dataset.day), Number(el.dataset.spot), evt);
    },
    open: el => {
      const dayAttr = el.dataset.day;
      const endAttr = el.dataset.rangeEnd;
      const dayVal = dayAttr === undefined ? null : (dayAttr === 'all' ? 'all' : Number(dayAttr));
      const endVal = endAttr === undefined ? null : Number(endAttr);
      return openScheduleTuningModal(dayVal, endVal);
    },
    preset: el => setTuningPreset(el.dataset.preset || '', Number(el.dataset.minutes) || 0, el.dataset.reason || ''),
    adjustMinutes: el => adjustTuningMinutes(Number(el.dataset.delta) || 0),
    execute: el => executeScheduleTuning(el.dataset.useAi === 'true'),
    applyReplan: () => applyPendingReplan(),
    rejectReplan: () => rejectPendingReplan()
  });

  T.ScheduleTuning = Object.freeze({
    openAddSpotModal,
    openAddSpotToDay,
    openEditSpotModal,
    sortDaySpotsByTime,
    submitSpot,
    submitAddSpot,
    toggleSpotFixed,
    toggleSpotCompleted,
    describeReplanScope,
    openScheduleTuningModal,
    findPlanBlockForReplanScope,
    describePlanBlockForAi,
    buildAiReplanPrompt,
    startPlanBlockAiRegeneration,
    setTuningPreset,
    adjustTuningMinutes,
    rebalanceTripSchedule,
    getReplanDomain,
    showHeuristicReplanReview,
    executeScheduleTuning,
    applyPendingReplan,
    rejectPendingReplan
  });
})(typeof window !== 'undefined' ? window : globalThis);
