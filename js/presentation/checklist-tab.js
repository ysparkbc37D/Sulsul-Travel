/* 준비물 화면 (v2.0.9, 계획 4단계 첫 화면 분리).
 * index.html 인라인 스크립트의 [7] 체크리스트 구역과 schedule-change-ui.js에 있던 준비물 줄·상세 보기를 옮겼다.
 * 셸 함수(getActiveTrip·commitTrip·commitTripCommand·requireSharedPlanEdit·escapeHtml·openModal·closeModal·showConfirmDelete·showToast·renderBookingGuides)와
 * State의 보기 상태(checklistViewMode·checklistOnlyUnchecked·checklistCategoryFilter)는 부를 때 읽는다.
 * 동작은 data-on-click·data-on-change="checklist.*"로 잇는다(js/presentation/ui-actions.js). 불러올 때는 등록만 하고 문서를 건드리지 않는다.
 * 저장은 셸의 여행 명령(commitTrip·commitTripCommand)만 쓰고, 저장이 끝난 뒤에 다시 그린다. */
(function (root) {
  'use strict';
  const T = root.SulsulTravel = root.SulsulTravel || {};

  const CATEGORIES = Object.freeze(['전체', '🚨 필수', '📄 서류', '💳 금융', '🧥 의류/방한', '🥾 트레킹', '💊 의약품', '🔌 전자기기', '위생', '보안', '잡화']);
  const DDAY_BUCKETS = Object.freeze([
    { id: 'd30', name: 'D-30 이전', desc: '여권 · eTA · 핵심 바우처 · 등산화 길들이기', icon: 'fa-solid fa-calendar-check' },
    { id: 'd7', name: 'D-7', desc: '달러 신권 · 트래블카드 · eSIM · 고산병약', icon: 'fa-solid fa-clock-rotate-left' },
    { id: 'd1', name: 'D-1', desc: '방한복 · 고어텍스 · 배터리 · 보안용품 패킹', icon: 'fa-solid fa-box-archive' },
    { id: 'local', name: '현지 휴대', desc: '1박용 서브 배낭 · 행동식 · 수시 소지품', icon: 'fa-solid fa-person-hiking' }
  ]);
  const VIEW_MODES = Object.freeze({ category: 'btn-chk-mode-cat', dday: 'btn-chk-mode-dday' });

  function ddayBucket(item) {
    const t = (item.text || '').toLowerCase();
    if (t.includes('여권') || t.includes('eta') || t.includes('황열병') || t.includes('입장권') || t.includes('바우처') || t.includes('보험') || t.includes('중등산화')) return 'd30';
    if (t.includes('달러') || t.includes('신권') || t.includes('트래블') || t.includes('esim') || t.includes('다이아목스') || t.includes('상비약') || t.includes('어댑터') || t.includes('플러그')) return 'd7';
    if (t.includes('방한') || t.includes('고어텍스') || t.includes('패딩') || t.includes('보조배터리') || t.includes('핫팩') || t.includes('복대') || t.includes('와이어') || t.includes('스트랩') || t.includes('샤워기') || t.includes('비타민')) return 'd1';
    return 'local';
  }

  function matchesCategory(item, filter) {
    if (!filter || filter === '전체') return true;
    if (filter === '🚨 필수') return Boolean(item.urgent || item.cat === '필수');
    const clean = filter.replace(/^[^\w가-힣]+/, '').trim();
    if (item.cat && item.cat.includes(clean)) return true;
    const t = (item.text || '').toLowerCase();
    if (clean.includes('서류') && (t.includes('여권') || t.includes('eta') || t.includes('바우처') || t.includes('보험') || t.includes('증명서'))) return true;
    if (clean.includes('금융') && (t.includes('달러') || t.includes('카드') || t.includes('환전') || t.includes('페소') || t.includes('트래블'))) return true;
    if (clean.includes('의류') && (t.includes('의류') || t.includes('패딩') || t.includes('자켓') || t.includes('플리스') || t.includes('비니') || t.includes('모자') || t.includes('장갑') || t.includes('핫팩') || t.includes('수영복'))) return true;
    if (clean.includes('트레킹') && (t.includes('등산') || t.includes('스틱') || t.includes('하이킹'))) return true;
    if (clean.includes('의약품') && (t.includes('약') || t.includes('다이아목스') || t.includes('황열병') || t.includes('비타민'))) return true;
    if (clean.includes('전자기기') && (t.includes('배터리') || t.includes('어댑터') || t.includes('충전') || t.includes('케이블'))) return true;
    if (clean.includes('위생') && (t.includes('선크림') || t.includes('티슈') || t.includes('샤워') || t.includes('립밤') || t.includes('인공눈물') || t.includes('선글라스'))) return true;
    if (clean.includes('보안') && (t.includes('복대') || t.includes('자물쇠') || t.includes('스트랩'))) return true;
    return false;
  }

  // 준비물 한 줄. item.originalIdx는 여행 checklist 안의 위치다.
  function rowHtml(item) {
    const labelHtml = escapeHtml(item.text);
    return `<div class="checklist-row theme-card-subtle"><label class="checklist-check"><input type="checkbox" ${item.checked ? 'checked' : ''} data-on-change="checklist.toggle" data-index="${Number(item.originalIdx)}" aria-label="${labelHtml} 준비 완료"></label><button type="button" class="checklist-detail" data-on-click="checklist.details" data-index="${Number(item.originalIdx)}" aria-label="${labelHtml} 상세 보기"><span class="${item.checked ? 'line-through' : ''}">${labelHtml}</span><i class="fa-solid fa-expand" aria-hidden="true"></i></button><div class="checklist-badges">${item.cat ? `<span>${escapeHtml(item.cat)}</span>` : ''}${item.urgent ? '<span class="sulsul-badge-rose">필수</span>' : ''}</div></div>`;
  }

  // 도구 막대 버튼을 State의 보기 상태에 맞춘다(다른 화면에서 State를 바꾼 뒤 열어도 같다).
  function syncToolbar() {
    const mode = State.checklistViewMode === 'dday' ? 'dday' : 'category';
    for (const [key, id] of Object.entries(VIEW_MODES)) {
      const button = document.getElementById(id);
      if (!button) continue;
      button.classList.toggle('subtab-active', key === mode);
      button.classList.toggle('subtab-inactive', key !== mode);
      button.setAttribute('aria-pressed', String(key === mode));
    }
    const unchecked = document.getElementById('btn-chk-uncompleted');
    if (unchecked) {
      const on = Boolean(State.checklistOnlyUnchecked);
      unchecked.className = on
        ? 'px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 text-[11px] font-black flex items-center gap-1 transition cursor-pointer shadow-xs'
        : 'px-2.5 py-1 rounded-lg theme-card-subtle text-[11px] font-bold flex items-center gap-1 transition cursor-pointer';
      unchecked.innerHTML = on ? '<i class="fa-solid fa-square-check"></i> <span>미완료만 보는 중</span>' : '<i class="fa-regular fa-square"></i> <span>미완료만 보기</span>';
      unchecked.setAttribute('aria-pressed', String(on));
    }
  }

  function emptyHtml(title, hint) {
    return `
      <div class="col-span-1 sm:col-span-2 text-center py-10 text-xs text-slate-400 theme-card-subtle rounded-2xl space-y-1">
        <span class="text-2xl block mb-1">📋</span>
        <div class="font-bold text-slate-300">${escapeHtml(title)}</div>
        ${hint ? `<p class="text-[11px] text-slate-500">${escapeHtml(hint)}</p>` : ''}
      </div>`;
  }

  function bucketHtml(bucket, bucketItems) {
    const doneCount = bucketItems.filter(item => item.checked).length;
    const bucketPct = Math.round((doneCount / bucketItems.length) * 100);
    return `
      <div class="col-span-1 sm:col-span-2 p-3.5 sm:p-4 rounded-2xl bg-[#090d17] border border-[#1e263c] space-y-3">
        <div class="flex items-center justify-between border-b border-[#1b2336] pb-2.5">
          <div class="flex items-center gap-2">
            <span class="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs">
              <i class="${escapeHtml(bucket.icon)}"></i>
            </span>
            <div>
              <h4 class="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                <span>${escapeHtml(bucket.name)}</span>
                <span class="text-[10px] text-slate-400 font-medium">${escapeHtml(bucket.desc)}</span>
              </h4>
            </div>
          </div>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-black ${bucketPct === 100 ? 'sulsul-badge-emerald' : 'sulsul-badge-amber'}">
            ${Number(doneCount)}/${bucketItems.length} (${bucketPct}%)
          </span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          ${bucketItems.map(rowHtml).join('')}
        </div>
      </div>`;
  }

  function render() {
    const container = document.getElementById('checklist-container');
    const trip = getActiveTrip();
    if (!container || !trip) return;
    const items = trip.checklist || [];
    syncToolbar();

    const checkedCount = items.filter(item => item.checked).length;
    const pct = items.length > 0 ? Math.round((checkedCount / items.length) * 100) : 0;
    const progressBadge = document.getElementById('checklist-progress-badge');
    const progressBar = document.getElementById('checklist-progress-bar');
    if (progressBadge) progressBadge.innerText = `${pct}% 준비됨 (${checkedCount}/${items.length})`;
    if (progressBar) progressBar.style.width = `${pct}%`;

    const activeCat = State.checklistCategoryFilter || '전체';
    const chips = document.getElementById('checklist-category-chips');
    if (chips) {
      chips.innerHTML = CATEGORIES.map(category => {
        const active = activeCat === category;
        return `
          <button type="button" data-on-click="checklist.category" data-category="${escapeHtml(category)}" aria-pressed="${active ? 'true' : 'false'}" class="px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 whitespace-nowrap transition cursor-pointer ${active ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'theme-card-subtle text-slate-300 hover:text-white'}">
            ${escapeHtml(category)}
          </button>`;
      }).join('');
    }

    const onlyUnchecked = Boolean(State.checklistOnlyUnchecked);
    const visible = items.map((item, idx) => ({ ...item, originalIdx: idx }))
      .filter(item => !(onlyUnchecked && item.checked) && matchesCategory(item, activeCat));
    if (!visible.length) {
      container.innerHTML = emptyHtml('해당 조건에 맞는 준비물이 없습니다.', "카테고리 필터나 '미완료만 보기' 설정을 변경해 보세요.");
      return;
    }
    if (State.checklistViewMode === 'dday') {
      const groupsHtml = DDAY_BUCKETS.map(bucket => {
        const bucketItems = visible.filter(item => ddayBucket(item) === bucket.id);
        return bucketItems.length ? bucketHtml(bucket, bucketItems) : '';
      }).join('');
      container.innerHTML = groupsHtml || emptyHtml('표시할 준비물이 없습니다.', '');
    } else {
      container.innerHTML = visible.map(rowHtml).join('');
    }
  }

  // 준비물 상태는 준비물 화면과 계획의 예약 가이드 두 곳에 보인다. 저장 뒤 둘 다 다시 그린다.
  function refreshViews() {
    render();
    // 예약 가이드가 열려 있으면 완료 수·줄긋기도 다시 그린다. (v2.1.4 전에는 없는 id를 확인해 다시 그리지 않았다.)
    if (!document.getElementById('subtab-view-booking')?.classList.contains('hidden')) root.SulsulTravel.PlanGuides?.renderBookings();
  }

  function setViewMode(mode) {
    State.checklistViewMode = mode === 'dday' ? 'dday' : 'category';
    render();
  }
  function setCategory(category) {
    State.checklistCategoryFilter = CATEGORIES.includes(category) ? category : '전체';
    render();
  }
  function toggleOnlyUnchecked() {
    State.checklistOnlyUnchecked = !State.checklistOnlyUnchecked;
    render();
  }

  async function checkAll(isComplete = true) {
    const trip = getActiveTrip();
    if (!trip || !trip.checklist) return false;
    if (!requireSharedPlanEdit()) { refreshViews(); return false; }
    const saved = await commitTrip(trip.id, target => {
      (target.checklist || []).forEach(item => { item.checked = Boolean(isComplete); });
    });
    refreshViews();
    return saved;
  }

  // 체크 상자는 누르는 순간 모양이 바뀐다. 저장하지 못했거나 권한이 없으면 다시 그려 저장된 상태로 되돌린다.
  async function toggleItem(index) {
    const trip = getActiveTrip(), item = trip?.checklist?.[index];
    if (!item || !requireSharedPlanEdit()) { refreshViews(); return false; }
    const next = !item.checked;
    const saved = await commitTripCommand({ tripId: trip.id, expectedRevision: trip.revision, change: draft => { draft.checklist[index].checked = next; } });
    refreshViews();
    return saved;
  }

  // ---- 준비물 추가·상세·삭제 창 ----
  // 예약 가이드의 '준비물 추가' 버튼은 v1.1.7부터 없는 창(modal-checklist-add)을 열고 있었다. 창은 처음 쓸 때 만든다.
  const SHEETS = Object.freeze(['modal-checklist-add', 'modal-checklist-item']);
  const ADD_CATEGORIES = Object.freeze(CATEGORIES.filter(category => category !== '전체' && category !== '🚨 필수'));
  const cleanCategory = category => category.replace(/^[^\w가-힣]+/, '').trim();
  const conflict = message => Object.assign(new Error(message), { code: 'REVISION_CONFLICT' });

  function ensureSheet(id, titleId, bodyHtml, footerHtml) {
    let modal = document.getElementById(id);
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = id;
    modal.className = 'sheet-container sheet-closed';
    modal.innerHTML = `<div class="sheet-scrim" data-on-click="checklist.close" data-sheet="${escapeHtml(id)}"></div><section class="sheet-box activity-sheet checklist-sheet" role="dialog" aria-modal="true" aria-labelledby="${escapeHtml(titleId)}">${bodyHtml}<footer class="activity-sheet-footer">${footerHtml}</footer></section>`;
    document.body.append(modal);
    return modal;
  }

  function openEditor() {
    const trip = getActiveTrip();
    if (!trip || !requireSharedPlanEdit()) return false;
    const optionsHtml = ADD_CATEGORIES.map(category => `<option value="${escapeHtml(cleanCategory(category))}">${escapeHtml(category)}</option>`).join('');
    ensureSheet('modal-checklist-add', 'checklist-add-title',
      `<header class="activity-sheet-header"><div><p>스마트 패킹</p><h3 id="checklist-add-title">준비물 추가</h3></div><button type="button" class="companion-button" data-on-click="checklist.close" data-sheet="modal-checklist-add" aria-label="준비물 추가 닫기"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></header>
      <div class="activity-sheet-body checklist-form">
        <label for="checklist-add-text">준비물</label>
        <input id="checklist-add-text" type="text" maxlength="120" autocomplete="off" placeholder="예: 여권 사본, 보조배터리">
        <label for="checklist-add-cat">분류</label>
        <select id="checklist-add-cat">${optionsHtml}</select>
        <label class="checklist-form-check"><input id="checklist-add-urgent" type="checkbox"> <span>필수 준비물로 표시</span></label>
        <p id="checklist-add-feedback" role="status" aria-live="polite"></p>
      </div>`,
      `<button type="button" class="companion-button" data-on-click="checklist.close" data-sheet="modal-checklist-add">취소</button><button type="button" id="checklist-add-save" class="companion-button companion-primary" data-on-click="checklist.saveNew">추가</button>`);
    document.getElementById('checklist-add-text').value = '';
    document.getElementById('checklist-add-cat').value = cleanCategory(ADD_CATEGORIES[ADD_CATEGORIES.length - 1]);
    document.getElementById('checklist-add-urgent').checked = false;
    document.getElementById('checklist-add-feedback').textContent = '';
    document.getElementById('checklist-add-save').disabled = false;
    openModal('modal-checklist-add');
    setTimeout(() => document.getElementById('checklist-add-text')?.focus(), 50);
    return true;
  }

  async function saveNew() {
    const input = document.getElementById('checklist-add-text'), button = document.getElementById('checklist-add-save');
    const feedback = document.getElementById('checklist-add-feedback');
    const text = (input?.value || '').trim();
    if (!text) { feedback.textContent = '준비물 이름을 적어 주세요.'; input?.focus(); return false; }
    const trip = getActiveTrip();
    if (!trip || button.disabled || !requireSharedPlanEdit()) return false;
    const item = { id: `chk_${crypto.randomUUID()}`, text, cat: document.getElementById('checklist-add-cat').value, urgent: document.getElementById('checklist-add-urgent').checked, checked: false };
    button.disabled = true;
    try {
      const saved = await commitTripCommand({ tripId: trip.id, expectedRevision: trip.revision, change: draft => { draft.checklist = Array.isArray(draft.checklist) ? draft.checklist : []; draft.checklist.push(item); } });
      if (!saved) { feedback.textContent = '추가하지 못했습니다. 적은 내용은 그대로 있습니다.'; return false; }
      closeModal('modal-checklist-add', true);
      refreshViews();
      showToast('준비물을 추가했습니다.');
      return true;
    } finally {
      button.disabled = false;
    }
  }

  function openDetails(index) {
    const item = getActiveTrip()?.checklist?.[index];
    if (!item) return false;
    ensureSheet('modal-checklist-item', 'checklist-item-title',
      `<header class="activity-sheet-header"><div><p id="checklist-item-meta"></p><h3 id="checklist-item-title">준비물 상세</h3></div><button type="button" class="companion-button" data-on-click="checklist.close" data-sheet="modal-checklist-item" aria-label="준비물 상세 닫기"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></header>
      <div class="activity-sheet-body"><p id="checklist-item-text" class="checklist-item-text"></p></div>`,
      `<button type="button" id="checklist-item-remove" class="companion-button" data-on-click="checklist.remove">삭제</button><button type="button" class="companion-button companion-primary" data-on-click="checklist.close" data-sheet="modal-checklist-item">닫기</button>`);
    document.getElementById('checklist-item-meta').textContent = [item.cat, item.urgent ? '필수' : '', item.checked ? '준비 완료' : '준비 전'].filter(Boolean).join(' · ');
    document.getElementById('checklist-item-text').textContent = item.text || '';
    document.getElementById('checklist-item-remove').dataset.index = String(index);
    openModal('modal-checklist-item');
    return true;
  }

  // 지우기는 안전 삭제 확인 창을 거친다. 확인하는 사이 목록이 바뀌었으면(다른 창·동행 반영) 지우지 않는다.
  function remove(index) {
    const trip = getActiveTrip(), item = trip?.checklist?.[index];
    if (!item || !requireSharedPlanEdit()) return false;
    showConfirmDelete('준비물을 삭제할까요?', item.text, '이 여행의 준비물 목록에서 지웁니다. 되돌릴 수 없습니다.', async () => {
      const saved = await commitTripCommand({ tripId: trip.id, expectedRevision: trip.revision, change: draft => {
        if (draft.checklist?.[index]?.text !== item.text) throw conflict('준비물 목록이 바뀌었습니다. 다시 열어 확인해 주세요.');
        draft.checklist.splice(index, 1);
      } });
      if (!saved) return false;
      closeModal('modal-checklist-item', true);
      refreshViews();
      return true;
    });
    return true;
  }

  T.UiActions.define('checklist', {
    viewMode: element => setViewMode(element.dataset.mode),
    category: element => setCategory(element.dataset.category),
    onlyUnchecked: () => toggleOnlyUnchecked(),
    checkAll: () => checkAll(true),
    toggle: element => toggleItem(Number(element.dataset.index)),
    details: element => openDetails(Number(element.dataset.index)),
    add: () => openEditor(),
    saveNew: () => saveNew(),
    remove: element => remove(Number(element.dataset.index)),
    close: element => { if (SHEETS.includes(element.dataset.sheet)) closeModal(element.dataset.sheet, true); }
  });

  T.ChecklistTab = Object.freeze({ render, refreshViews, setViewMode, setCategory, toggleOnlyUnchecked, checkAll, toggleItem, openDetails, openEditor, saveNew, remove, rowHtml, ddayBucket, matchesCategory, CATEGORIES, DDAY_BUCKETS });
})(typeof window !== 'undefined' ? window : globalThis);
