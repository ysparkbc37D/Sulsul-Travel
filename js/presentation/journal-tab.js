/* 기록 탭: 날짜 고르기·하루 회고 글과 사진 (v2.1.0, 계획 4단계 두 번째 화면 분리).
 * index.html 인라인 스크립트의 [6] 구역과 [8] 근처의 하루 회고 사진 삭제를 옮겼다. 순간 기록 목록은 moment-journal.js가 그린다.
 * 셸 함수(getActiveTrip·commitTripRecord·commitTripCommand·escapeHtml·showToast·showConfirmDelete·openModal·closeModal·switchTab)와
 * 다른 화면 파일의 함수(refreshActivitySurfaces·mountMomentJournalFeed·downloadTravelFile·openStoryMagazineModal), AI 윤문(generateAiJournalEssay),
 * PDF 여행기(openPdfReportModal)는 부를 때 찾는다. State의 activeJournalDay·journalTextDrafts·journalPhotoDrafts를 그대로 쓴다.
 * 동작은 data-on-click·data-on-change·data-on-input="journal.*"로 잇는다. 불러올 때는 등록만 하고 문서를 건드리지 않는다.
 * SulsulTravel.JournalTab은 얼리지 않는다. 검사가 render를 바꿔 '저장 뒤 화면 오류'를 재현하므로, 안에서 다시 그릴 때도 api.render()를 부른다. */
(function (root) {
  'use strict';
  const T = root.SulsulTravel = root.SulsulTravel || {};
  const adapter = () => SulsulTravel.TripAdapter;
  const api = {};

  function dayPillsHtml(days, activeIndex) {
    return days.map((day, idx) => {
      const active = activeIndex === idx;
      return `
        <button type="button" data-on-click="journal.day" data-day="${idx}" aria-pressed="${active ? 'true' : 'false'}" class="px-3 py-1 rounded-lg text-xs font-bold shrink-0 transition ${active ? 'bg-amber-500 text-slate-950 shadow' : 'bg-[#080b12] text-slate-400 hover:text-white border border-[#1a2236]'}">
          Day ${Number(day.dayNum || idx + 1)}
        </button>`;
    }).join('');
  }

  function photosHtml(entry, dayIndex) {
    return (entry.photos || []).map((photo, pIdx) => `
      <div class="relative rounded-xl overflow-hidden aspect-[3/4] bg-[#080b12] border border-[#1a2236] group">
        <button type="button" class="w-full h-full" data-on-click="journal.viewPhoto" data-day="${dayIndex}" data-photo="${pIdx}" aria-label="회고 사진 ${pIdx + 1} 크게 보기"><img src="${escapeHtml(SulsulTravel.MediaRepository.photoSource(entry, pIdx, { thumbnail: true }))}" class="w-full h-full object-cover" alt="회고 사진 ${pIdx + 1}" loading="lazy"></button>
        <button type="button" data-on-click="journal.removePhoto" data-day="${dayIndex}" data-photo="${pIdx}" class="absolute top-1.5 right-1.5 min-w-[44px] min-h-[44px] rounded-full bg-black/70 hover:bg-rose-600 text-white text-[10px] flex items-center justify-center transition" aria-label="회고 사진 ${pIdx + 1} 삭제">✕</button>
      </div>`).join('');
  }

  function pendingHtml(trip, dayIndex, pendingPhotos) {
    if (!pendingPhotos.length) return '';
    return `<div class="journal-photo-pending" role="status"><p>사진 ${pendingPhotos.length}장 저장 대기 · 아직 기기에 확정되지 않았어요.</p><div>${pendingPhotos.map(photo => `<img src="${escapeHtml(photo.thumbnail)}" alt="저장 대기 사진">`).join('')}</div><button type="button" class="companion-button" data-on-click="journal.retryPhotos" data-trip-id="${escapeHtml(trip.id)}" data-day="${dayIndex}">사진 다시 저장</button><button type="button" class="companion-button" data-on-click="journal.downloadPhotos">사진 초안 파일 보관</button></div>`;
  }

  function render() {
    const trip = getActiveTrip();
    const pillsContainer = document.getElementById('journal-day-pills');
    const cardContainer = document.getElementById('journal-day-card');
    if (!trip || !pillsContainer || !cardContainer) return;
    const days = trip.days || [];
    if (!Number.isInteger(State.activeJournalDay) || !days[State.activeJournalDay]) State.activeJournalDay = 0;
    const dayIndex = State.activeJournalDay;
    pillsContainer.innerHTML = dayPillsHtml(days, dayIndex);

    const activeDay = days[dayIndex];
    if (!activeDay) { cardContainer.innerHTML = ''; return; }
    const journalEntry = adapter().getJournalEntry(trip, dayIndex) || { text: '', photos: [] };
    const draftKey = adapter().journalDraftKey(trip, dayIndex);
    const visibleText = State.journalTextDrafts?.[draftKey] ?? journalEntry.text ?? '';
    const pendingPhotos = State.journalPhotoDrafts?.[draftKey]?.photos || [];
    const movedDate = journalEntry.date && journalEntry.date !== activeDay.date ? journalEntry.date : '';

    cardContainer.innerHTML = `
      <div id="journal-moments-feed" class="journal-moments-mount"></div>
      <h4 class="journal-reflection-label">하루 회고</h4>
      <div class="flex items-center justify-between border-b border-[#1a2236] pb-3">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-black text-amber-400">Day ${Number(activeDay.dayNum || dayIndex + 1)}</span>
            <h4 class="text-sm font-black text-white">${escapeHtml(activeDay.title || '')}</h4>
          </div>
          <p class="text-[11px] text-slate-400 mt-0.5">${escapeHtml(activeDay.date || '')} · ${escapeHtml(activeDay.city || '')}</p>
          ${movedDate ? `<p class="text-[11px] text-slate-400">기록한 원래 날짜: ${escapeHtml(movedDate)}</p>` : ''}
        </div>

        <label class="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer">
          <i class="fa-solid fa-camera text-[10px]"></i>
          <span>사진 추가</span>
          <input type="file" accept="image/*" data-on-change="journal.photoUpload" class="hidden">
        </label>
      </div>

      <!-- 썸네일은 카드 안에 고정하고 크게 볼 때 보관본 비율을 유지한다. -->
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        ${photosHtml(journalEntry, dayIndex)}
      </div>

      ${pendingHtml(trip, dayIndex, pendingPhotos)}
      <div class="space-y-2 pt-2">
        <label class="text-xs font-bold text-slate-300 flex items-center justify-between">
          <span>하루를 돌아보는 글</span>
          <button type="button" data-on-click="journal.aiPolish" class="text-amber-400 hover:text-amber-300 font-bold text-[11px] flex items-center gap-1">
            <i class="fa-solid fa-wand-magic-sparkles text-[10px]"></i> AI로 다듬기
          </button>
        </label>
        <textarea id="journal-text-input" data-trip-id="${escapeHtml(trip.id)}" data-day-id="${escapeHtml(activeDay.id || '')}" data-on-input="journal.rememberDraft" rows="4" placeholder="오늘 하루 인상 깊었던 순간, 감정, 만난 사람들의 이야기를 자유롭게 적어보세요..." class="w-full p-3 bg-[#080b12] border border-[#1a2236] rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 leading-relaxed">${escapeHtml(visibleText)}</textarea>
        <div class="flex justify-end gap-2">
          <button type="button" class="companion-button" data-on-click="journal.downloadText">글 파일 보관</button>
          <button type="button" data-on-click="journal.saveText" class="px-4 py-2 bg-[#141c2e] hover:bg-[#1a263e] border border-[#23304c] text-amber-400 font-black rounded-xl text-xs transition">
            일기 저장
          </button>
        </div>
      </div>
      <details class="journal-story-export"><summary>전체 여행기 PDF · 블로그 파일</summary><button type="button" class="companion-button" data-on-click="journal.storyPdf">날짜별 여행기 · PDF 미리보기</button><div id="journal-story-tools"></div></details>
    `;
    mountMomentJournalFeed('journal-moments-feed', dayIndex);
    SulsulTravel.TravelStoryUI.mountControls(document.getElementById('journal-story-tools'), getActiveTrip, { textMode: 'original' });
  }

  function selectDay(index) {
    State.activeJournalDay = index;
    api.render();
  }

  // 작성 중인 글은 여행·날짜 ID로 열쇠를 만들어 기억한다. 날짜를 옮겨 다녀도 글이 섞이지 않는다.
  function rememberDraft() {
    const input = document.getElementById('journal-text-input');
    const trip = input?.dataset.tripId ? State.trips.find(item => item.id === input.dataset.tripId) : getActiveTrip();
    if (!trip || !input) return;
    const dayIndex = input.dataset.dayId ? trip.days.findIndex(day => day.id === input.dataset.dayId) : State.activeJournalDay;
    if (dayIndex < 0) return;
    State.journalTextDrafts = State.journalTextDrafts || {};
    State.journalTextDrafts[adapter().journalDraftKey(trip, dayIndex)] = input.value;
  }

  async function saveText() {
    const trip = getActiveTrip();
    if (!trip) return false;
    const dayIndex = State.activeJournalDay;
    const input = document.getElementById('journal-text-input');
    if (!input) return false;
    rememberDraft();
    try {
      if (input.dataset.tripId && (input.dataset.tripId !== trip.id || input.dataset.dayId !== trip.days?.[dayIndex]?.id)) throw new Error('기록을 작성한 날짜가 변경되었습니다.');
      await commitTripRecord(trip.id, target => {
        adapter().setJournalEntry(target, dayIndex, { ...(adapter().getJournalEntry(target, dayIndex) || { photos: [] }), text: input.value });
      });
    } catch (_) {
      showToast('저장하지 못했습니다. 작성 중인 글은 화면에 남아 있습니다. 다시 저장하거나 글 파일로 보관해 주세요.', 6000);
      return false;
    }
    delete (State.journalTextDrafts || {})[adapter().journalDraftKey(trip, dayIndex)];
    refreshActivitySurfaces();
    showToast('일기를 이 기기에 저장했습니다.');
    return true;
  }

  function downloadDraft() {
    const input = document.getElementById('journal-text-input');
    if (input) downloadTravelFile(input.value, '여행기-작성중.txt', 'text/plain;charset=utf-8');
  }

  // 사진을 고른 순간의 여행·날짜에 붙인다. 준비가 끝나기 전에 다른 날짜로 옮겨도 고른 날짜에 저장한다.
  async function uploadPhoto(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    const sourceTrip = getActiveTrip();
    const sourceTripId = sourceTrip?.id, sourceDayIndex = State.activeJournalDay;
    const sourceDate = sourceTrip?.days?.[sourceDayIndex]?.date;
    const sourceDayId = sourceTrip?.days?.[sourceDayIndex]?.id;
    const sourceDraftKey = adapter().journalDraftKey(sourceTrip, sourceDayIndex);
    rememberDraft();
    try {
      const prepared = await SulsulTravel.mediaRepository.prepare(file, { tripId: sourceTripId });
      State.journalPhotoDrafts = State.journalPhotoDrafts || {};
      const pending = State.journalPhotoDrafts[sourceDraftKey] || { dayId: sourceDayId, date: sourceDate, photos: [] };
      pending.photos.push(prepared); State.journalPhotoDrafts[sourceDraftKey] = pending;
      await savePhotoDraft(sourceTripId, sourceDayIndex, sourceDayId);
    } catch (error) { showToast('사진을 준비하지 못했습니다. 작성 중인 글은 보존됩니다. ' + (error.message || ''), 6000); }
  }

  async function savePhotoDraft(sourceTripId, sourceDayIndex, sourceDayId) {
    const sourceTrip = State.trips.find(item => item.id === sourceTripId);
    sourceDayId = sourceDayId || sourceTrip?.days?.[sourceDayIndex]?.id;
    const key = sourceDayId ? `${sourceTripId}:${sourceDayId}` : adapter().journalDraftKey(sourceTrip, sourceDayIndex);
    const pending = State.journalPhotoDrafts?.[key]; if (!pending?.photos.length) return false;
    if (sourceDayId) sourceDayIndex = sourceTrip?.days?.findIndex(day => day.id === sourceDayId) ?? -1;
    const showing = () => getActiveTrip()?.id === sourceTripId && State.activeJournalDay === sourceDayIndex;
    if (showing()) rememberDraft();
    try {
      const textDraft = State.journalTextDrafts?.[key];
      await commitTripRecord(sourceTripId, trip => {
        if (trip.days?.[sourceDayIndex]?.date !== pending.date) throw new Error('사진을 선택한 여행 날짜가 변경되었습니다. 초안을 파일로 먼저 보관해 주세요.');
        trip.journals = trip.journals || {};
        const record = adapter().setJournalEntry(trip, sourceDayIndex, adapter().getJournalEntry(trip, sourceDayIndex) || { text: '', photos: [] });
        record.photos = record.photos || [];
        record.photoThumbnails = record.photoThumbnails || []; record.mediaIds = record.mediaIds || [];
        while (record.photoThumbnails.length < record.photos.length) record.photoThumbnails.push(null);
        while (record.mediaIds.length < record.photos.length) record.mediaIds.push(null);
        record.photos.push(...pending.photos.map(photo => photo.source)); record.photoThumbnails.push(...pending.photos.map(photo => photo.thumbnail)); record.mediaIds.push(...pending.photos.map(photo => photo.mediaId));
        if (textDraft != null) record.text = textDraft;
      });
      delete State.journalPhotoDrafts[key]; delete (State.journalTextDrafts || {})[key];
    } catch (error) {
      if (showing()) { try { api.render(); } catch (_) {} }
      showToast('사진을 저장하지 못했습니다. 글과 사진 초안은 화면에 남아 있습니다. 다시 저장하거나 초안 파일을 보관해 주세요. ' + (error.message || ''), 6000); return false;
    }
    if (showing()) { try { api.render(); } catch (error) { console.warn('[사진 저장 후 화면 갱신]', error); showToast('사진은 저장되었습니다. 화면을 다시 열어 확인해 주세요.'); return true; } }
    showToast('사진을 선택했던 날짜에 저장했습니다.'); return true;
  }

  function downloadPhotoDraft() {
    const trip = getActiveTrip(), key = adapter().journalDraftKey(trip, State.activeJournalDay), pending = State.journalPhotoDrafts?.[key]; if (!pending) return;
    downloadTravelFile(JSON.stringify({ format: 'sulsul-journal-draft', tripId: trip.id, date: pending.date, text: State.journalTextDrafts?.[key] || '', photos: pending.photos.map(p => p.source) }, null, 2), '회고-사진-작성중.json');
  }

  function viewPhoto(dayIndex, index) {
    const record = adapter().getJournalEntry(getActiveTrip(), dayIndex);
    const source = SulsulTravel.MediaRepository.photoSource(record, index); if (!source) return;
    let modal = document.getElementById('modal-journal-photo');
    if (!modal) {
      modal = document.createElement('div'); modal.id = 'modal-journal-photo'; modal.className = 'sheet-container sheet-closed';
      modal.innerHTML = '<div class="sheet-scrim" data-on-click="journal.closePhoto"></div><section class="sheet-box activity-sheet" role="dialog" aria-modal="true" aria-label="회고 사진 크게 보기"><header class="activity-sheet-header"><h3>회고 사진</h3><button type="button" class="companion-button" data-on-click="journal.closePhoto">닫기</button></header><img id="journal-full-photo" style="max-width:100%;max-height:75dvh;object-fit:contain;align-self:center" alt="선택한 회고 사진"></section>';
      document.body.append(modal);
    }
    document.getElementById('journal-full-photo').src = source; openModal('modal-journal-photo');
  }

  // 회고 사진 삭제: 확인하는 사이 그 날짜의 사진이 바뀌었으면(다른 창·동기화) 지우지 않는다.
  function removePhoto(dayIdx, photoIdx) {
    const trip = getActiveTrip(), journal = adapter().getJournalEntry(trip, dayIdx);
    if (!journal?.photos?.[photoIdx]) return;
    const tripId = trip.id, revision = trip.revision, dayId = trip.days[dayIdx].id, journalId = journal.id;
    const photoSnapshot = JSON.stringify([journal.photos, journal.photoThumbnails, journal.mediaIds]);
    showConfirmDelete(
      '사진을 삭제하시겠습니까?',
      `Day ${dayIdx + 1} 등록 사진`,
      '다이어리에서 선택한 사진이 영구 제거됩니다.',
      async () => {
        if (!await commitTripCommand({ tripId, expectedRevision: revision, change: target => {
          const index = target.days.findIndex(day => day.id === dayId), entry = adapter().getJournalEntry(target, index);
          if (!entry || entry.id !== journalId || JSON.stringify([entry.photos, entry.photoThumbnails, entry.mediaIds]) !== photoSnapshot) throw new Error('삭제할 사진이 변경되었습니다. 다시 확인해 주세요.');
          entry.photos.splice(photoIdx, 1); entry.photoThumbnails?.splice(photoIdx, 1); entry.mediaIds?.splice(photoIdx, 1);
          if (Number.isInteger(entry.coverIndex)) entry.coverIndex = Math.max(0, Math.min(entry.photos.length - 1, entry.coverIndex - (photoIdx < entry.coverIndex ? 1 : 0)));
        } })) return false;
        try { rememberDraft(); api.render(); } catch (error) { console.warn('[기록 화면 갱신]', error); showToast('사진 삭제는 저장되었습니다. 화면을 다시 열어 확인해 주세요.'); }
        return true;
      }
    );
  }

  const intAttr = (element, name) => Number(element.dataset[name]);
  T.UiActions.define('journal', {
    day: element => selectDay(intAttr(element, 'day')),
    photoUpload: (element, event) => uploadPhoto(event),
    viewPhoto: element => viewPhoto(intAttr(element, 'day'), intAttr(element, 'photo')),
    removePhoto: element => removePhoto(intAttr(element, 'day'), intAttr(element, 'photo')),
    retryPhotos: element => savePhotoDraft(element.dataset.tripId, intAttr(element, 'day')),
    downloadPhotos: () => downloadPhotoDraft(),
    rememberDraft: () => rememberDraft(),
    downloadText: () => downloadDraft(),
    saveText: () => saveText(),
    aiPolish: () => generateAiJournalEssay(),
    storyPdf: () => T.ReportUI.openModal(),
    magazine: () => T.CompanionModals.openMagazine(),
    openExpenses: () => switchTab('expenses'),
    closePhoto: () => closeModal('modal-journal-photo')
  });

  Object.assign(api, { render, selectDay, rememberDraft, saveText, downloadDraft, uploadPhoto, savePhotoDraft, downloadPhotoDraft, viewPhoto, removePhoto });
  T.JournalTab = api;
})(typeof window !== 'undefined' ? window : globalThis);
