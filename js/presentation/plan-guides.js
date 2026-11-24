/* 계획 탭의 예약 가이드·도시 가이드 (v2.1.4, 계획 4단계 네 번째 화면 분리의 1차).
 * index.html 인라인 스크립트의 [3] 사전 예약 대시보드(남미 팩)·여행 필수 준비 점검과 [4] 거점 도시 가이드·여행지 스팟 모아보기를 옮겼다.
 * 셸 함수(getActiveTrip·commitTrip·resolveTripPack·isSouthAmericaTrip·isYunnanTrip·escapeHtml)와 KB_TRAVEL·여행 팩 자료는 부를 때 찾는다.
 * 그리는 동안 여행 자료를 바꾸지 않는다(예전에는 예약 상태 객체가 없으면 화면을 그리며 만들어 넣었다).
 * 여행 자료 값(스팟 시간·비용·제목·메모, 준비물 이름)과 정적 자료 값을 모두 escapeHtml로 넣는다. 옮기기 전에는 스팟 시간·비용이 그대로 들어갔다.
 * 동작은 data-on-click·data-on-change="guides.*"로 잇는다. 준비물 체크·추가는 checklist.* 동작을 그대로 쓴다. 불러올 때는 등록만 하고 문서를 건드리지 않는다. */
(function (root) {
  'use strict';
  const T = root.SulsulTravel = root.SulsulTravel || {};
  const FILTERS = ['all', 'urgent', 'scheduled', 'completed'];
  const $ = id => document.getElementById(id);
  const mapsUrl = query => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  const TIP_CLASS_HTML = 'tip-box text-[10px] text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/10 rounded-lg border border-amber-300 dark:border-amber-500/20 font-medium leading-relaxed';

  function header(prefix, title, desc, icon) {
    const titleEl = $(`${prefix}-header-title`), descEl = $(`${prefix}-header-desc`), iconEl = $(`${prefix}-header-icon`);
    if (titleEl) titleEl.textContent = title;
    if (descEl) descEl.textContent = desc;
    if (iconEl) iconEl.className = icon;
  }

  // ---- 예약 가이드 ----
  // 고정 주소가 없는 예약처는 이름으로 공식 포털을 추정한다. 모르면 빈 값이다("선택한 예약처" 같은 일반 항목을 검색으로 보내지 않는다).
  function bookingUrl(guide) {
    // 팩의 일반 항목은 url이 '#' 자리표시자다. 예전에는 그대로 링크해 '공식 포털 바로가기'가 앱 자신을 새 탭으로 열었다.
    if (typeof guide.url === 'string' && /^https:\/\//i.test(guide.url)) return guide.url;
    if (guide.url) return '';
    const t = (guide.target || guide.title || '').toLowerCase();
    const known = [
      [['aircanada', '에어캐나다'], 'https://www.aircanada.com'],
      [['tuboleto', 'cultura.pe', '마추픽추'], 'https://tuboleto.cultura.pe'],
      [['incarail', '잉카레일'], 'https://incarail.com'],
      [['aerolineas', '아르헨티나 항공'], 'https://www.aerolineas.com.ar'],
      [['latam', '라탐'], 'https://www.latamairlines.com'],
      [['chalten', 'plataforma10'], 'https://www.plataforma10.com.ar'],
      [['bus-sur', 'bussur'], 'https://www.bussur.com'],
      [['parquesnacionales', '국립공원'], 'https://www.argentina.gob.ar/parquesnacionales/glaciares'],
      [['별빛', 'stargazing'], 'https://www.sanpedroatacama.com'],
      [['ventana', '탱고'], 'https://www.laventanaweb.com'],
      [['eta', '캐나다'], 'https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/eta.html'],
      [['esim', 'airalo'], 'https://www.airalo.com']
    ];
    const hit = known.find(([words]) => words.some(word => t.includes(word)));
    return hit ? hit[1] : '';
  }

  function setBookingFilter(filter) {
    State.bookingGuideFilter = FILTERS.includes(filter) ? filter : 'all';
    for (const key of FILTERS) {
      const button = $(`btn-booking-filter-${key}`);
      if (!button) continue;
      const active = key === State.bookingGuideFilter;
      button.className = `sulsul-chip${active ? ' is-active' : ''} text-xs cursor-pointer`;
      button.setAttribute('aria-pressed', String(active));
    }
    renderBookings();
  }

  async function toggleBooking(guideId) {
    const trip = getActiveTrip();
    if (!trip || !guideId) return false;
    const saved = await commitTrip(trip.id, target => {
      target.bookingStatuses = target.bookingStatuses || {};
      target.bookingStatuses[guideId] = !target.bookingStatuses[guideId];
    });
    // 저장에 실패해도 다시 그려 체크 표시를 저장된 상태로 되돌린다.
    renderBookings();
    return !!saved;
  }

  function bookingCardHtml(guide) {
    const statusHtml = guide.isCompleted
      ? '<span class="sulsul-badge-emerald px-2 py-0.5 rounded text-[10px] font-black flex items-center gap-1"><i class="fa-solid fa-check" aria-hidden="true"></i> 예약 완료</span>'
      : guide.isUrgent
        ? '<span class="sulsul-badge-rose px-2 py-0.5 rounded text-[10px] font-black animate-pulse flex items-center gap-1"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> 지금 즉시 예약 (타임어택)</span>'
        : guide.dNum
          ? `<span class="sulsul-badge-indigo px-2 py-0.5 rounded text-[10px] font-black flex items-center gap-1"><i class="fa-solid fa-clock" aria-hidden="true"></i> D-${Number(guide.dNum)} 오픈 예정</span>`
          : '<span class="sulsul-badge-indigo px-2 py-0.5 rounded text-[10px] font-black flex items-center gap-1"><i class="fa-solid fa-clipboard-question" aria-hidden="true"></i> 예약 전 확인</span>';
    const url = bookingUrl(guide);
    return `
      <div class="booking-guide-card p-4 rounded-xl ${guide.isCompleted ? 'bg-[#080b12]/60 border-emerald-500/30' : 'bg-[#080b12] border-[#1e263c]'} border space-y-3 flex flex-col justify-between hover:border-amber-500/40 transition">
        <div class="space-y-2">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <div class="flex items-center gap-2">
              <label class="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" ${guide.isCompleted ? 'checked' : ''} data-on-change="guides.toggleBooking" data-guide="${escapeHtml(guide.id)}" aria-label="${escapeHtml(guide.title)} 예약 완료" class="w-4 h-4 rounded text-amber-500 bg-[#141c2e] border-[#23304c] focus:ring-amber-500 cursor-pointer">
                <span class="text-[10px] font-bold ${guide.isCompleted ? 'text-emerald-400' : 'text-slate-400'}">완료 체크</span>
              </label>
              ${statusHtml}
            </div>
            <span class="text-xs font-mono font-black text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">${escapeHtml(guide.dDay || '')}</span>
          </div>
          <h4 class="text-xs sm:text-sm font-black ${guide.isCompleted ? 'line-through text-slate-500' : 'text-white'} leading-snug">${escapeHtml(guide.title)}</h4>
          <div class="text-[11px] text-amber-300 font-medium">
            <i class="fa-solid fa-compass text-[10px]" aria-hidden="true"></i> 예약처: <span class="text-slate-200">${escapeHtml(guide.target || '공식 사이트')}</span>
          </div>
          <div class="text-[10px] text-slate-400">예상 비용: <span class="text-emerald-400 font-mono font-bold">${escapeHtml(guide.cost || '')}</span></div>
          <div class="${TIP_CLASS_HTML} p-2.5">💡 ${escapeHtml(guide.tip || '')}</div>
        </div>
        ${url ? `<div class="pt-2">
          <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="w-full py-2 bg-[#141c2e] hover:bg-[#1e2a44] border border-[#23304c] hover:border-amber-500/40 text-amber-400 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition">
            <span>공식 포털 바로가기</span><i class="fa-solid fa-arrow-up-right-from-square text-[10px]" aria-hidden="true"></i>
          </a>
        </div>` : ''}
      </div>`;
  }

  // 남미 팩의 예약 대시보드. 항목과 제목은 팩(bookings.items·headerTitle)에서 읽는다(v1.9.0에 KB_TRAVEL.bookingGuides가
  // 비워진 뒤에도 이 화면은 빈 목록을 읽어 0개를 보여 줬다). 완료 상태는 여행의 bookingStatuses에서 읽기만 한다.
  function renderTimeAttack(trip, container, pack) {
    const bookings = pack?.bookings || {};
    header('booking', bookings.headerTitle || '여행 예약 체크리스트', bookings.headerDesc || '예약 여부와 일정에 맞는 항목을 확인하세요.', 'fa-solid fa-ticket text-amber-400');
    const guides = Array.isArray(bookings.items) && bookings.items.length ? bookings.items
      : Array.isArray(root.KB_TRAVEL?.bookingGuides) ? root.KB_TRAVEL.bookingGuides : [];
    const statuses = trip.bookingStatuses || {};
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let start = trip.startDate ? new Date(trip.startDate) : new Date();
    if (isNaN(start.getTime())) start = new Date();
    start.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((start.getTime() - today.getTime()) / 86400000);
    const ddayBadge = $('booking-dday-badge');
    if (ddayBadge) ddayBadge.textContent = diffDays > 0 ? `출발 D-${diffDays}일` : diffDays === 0 ? '오늘 출발 (D-Day)!' : `출발 D+${Math.abs(diffDays)}일`;

    const items = guides.map((guide, index) => {
      const id = guide.id || `bg_${index}`, isCompleted = Boolean(statuses[id]);
      // "D-60"처럼 숫자가 있는 항목만 출발일 기준 마감을 계산한다. "예약 전 확인" 같은 항목에 기한을 지어내지 않는다.
      const dNum = /\d/.test(String(guide.dDay || '')) ? parseInt(String(guide.dDay).replace(/\D/g, ''), 10) : 0;
      const isUrgent = !isCompleted && (guide.status === 'urgent' || (dNum > 0 && diffDays <= dNum));
      return { ...guide, id, isCompleted, dNum, isUrgent, isScheduled: !isCompleted && !isUrgent };
    });
    const completed = items.filter(item => item.isCompleted).length, total = items.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const progressBadge = $('booking-progress-badge'); if (progressBadge) progressBadge.textContent = `${completed}/${total} 완료 (${pct}%)`;
    const progressBar = $('booking-progress-bar'); if (progressBar) progressBar.style.width = `${pct}%`;
    const allButton = $('btn-booking-filter-all'); if (allButton) allButton.textContent = `전체 (${total})`;

    const filter = State.bookingGuideFilter || 'all';
    const visible = items.filter(item => filter === 'urgent' ? item.isUrgent : filter === 'scheduled' ? item.isScheduled : filter === 'completed' ? item.isCompleted : true);
    container.innerHTML = visible.length
      ? visible.map(bookingCardHtml).join('')
      : '<div class="col-span-1 md:col-span-2 text-center py-8 text-xs text-slate-400 theme-card-subtle rounded-xl">선택한 필터 조건에 해당하는 예약 항목이 없습니다.</div>';
  }

  // 그 밖의 여행: 팩의 특별 안내와 준비물 점검. 준비물 체크·추가는 준비물 화면(checklist.*)과 같은 동작이다.
  function renderTripChecklist(trip, container) {
    header('booking', `${trip.title} 필수 준비 & 예약 체크리스트`, '항공권, 숙소, 현지 교통 및 필수 예약 항목을 사전에 점검하고 체크하세요.', 'fa-solid fa-clipboard-check text-amber-400');
    const notice = resolveTripPack(trip)?.bookings?.specialNotice;
    const noticeHtml = notice ? `
      <div class="col-span-1 md:col-span-2 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-sky-500/10 border border-amber-500/30 space-y-2">
        <div class="flex items-center gap-2">
          <span class="text-base" aria-hidden="true">${escapeHtml(resolveTripPack(trip)?.flag || '📌')}</span>
          <h4 class="text-xs sm:text-sm font-black text-amber-950 dark:text-amber-300">${escapeHtml(notice.title || '')}</h4>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600 dark:text-slate-300 pt-1">
          ${(notice.tips || []).map(tip => `
            <div class="p-2.5 rounded-lg theme-card-subtle">
              <div class="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1 mb-1"><i class="fa-solid fa-check text-[10px]" aria-hidden="true"></i> ${escapeHtml(tip.title)}</div>
              <div class="text-[#57534e] dark:text-slate-400 leading-relaxed">${escapeHtml(tip.desc)}</div>
            </div>`).join('')}
        </div>
      </div>` : '';
    const checklist = Array.isArray(trip.checklist) ? trip.checklist : [];
    const rowsHtml = checklist.map((item, index) => `
      <div class="p-3.5 rounded-xl theme-card-subtle flex items-center justify-between gap-3 hover:border-amber-500/40 transition">
        <div class="flex items-center gap-2.5 flex-1 min-w-0">
          <input type="checkbox" ${item.checked ? 'checked' : ''} data-on-change="checklist.toggle" data-index="${index}" aria-label="${escapeHtml(item.text)} 준비 완료" class="w-4 h-4 rounded text-amber-500 bg-[#141c2e] border-[#23304c] focus:ring-amber-500 focus:ring-offset-0 cursor-pointer shrink-0">
          <span class="text-xs ${item.checked ? 'line-through opacity-50' : 'text-[#1c1917] dark:text-[#ededed] font-bold'} truncate">${escapeHtml(item.text)}</span>
        </div>
        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${item.urgent ? 'sulsul-badge-rose' : 'bg-stone-100 text-stone-700 border border-stone-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}">${item.urgent ? '🚨 필수' : '일반'}</span>
      </div>`).join('');
    const doneCount = checklist.filter(item => item.checked).length;
    container.innerHTML = `
      ${noticeHtml}
      <div class="col-span-1 md:col-span-2 flex items-center justify-between pt-1">
        <span id="booking-checklist-count" class="text-xs font-bold text-[#1c1917] dark:text-slate-300">📋 준비 항목 점검 (${doneCount}/${checklist.length} 완료)</span>
        <button type="button" data-on-click="checklist.add" class="sulsul-badge-amber px-2.5 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"><i class="fa-solid fa-plus text-[10px]" aria-hidden="true"></i> 준비물 추가</button>
      </div>
      ${rowsHtml || '<div class="col-span-2 text-xs text-stone-400 dark:text-slate-500 py-4 text-center">등록된 사전 예약/준비물이 없습니다.</div>'}`;
  }

  function renderBookings() {
    const trip = getActiveTrip(), container = $('booking-cards-container');
    if (!trip || !container) return;
    if (isSouthAmericaTrip(trip)) renderTimeAttack(trip, container, resolveTripPack(trip));
    else renderTripChecklist(trip, container);
  }

  // ---- 도시 가이드 ----
  function mapsButtonHtml(query, label, tone = 'text-amber-400 hover:border-amber-500/40 py-2') {
    return `<div class="pt-2"><a href="${escapeHtml(mapsUrl(query))}" target="_blank" rel="noopener noreferrer" class="w-full ${escapeHtml(tone)} bg-[#141c2e] hover:bg-[#1e2a44] border border-[#23304c] rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition"><i class="fa-solid fa-map-location-dot text-[10px]" aria-hidden="true"></i><span>${escapeHtml(label)}</span></a></div>`;
  }

  function southAmericaCardHtml(dest) {
    const kbDest = root.KB_TRAVEL?.destinations?.[dest.id] || {};
    const emergency = dest.emergency || kbDest.emergency, embassy = dest.embassy || kbDest.embassy;
    const altitude = dest.altitude || '해발 정보';
    const high = /2,[4-9]\d\d|3,\d\d\d|4,\d\d\d|[2-4]\d{3}\s*m/.test(altitude);
    const name = String(dest.name || '');
    return `
      <div class="city-guide-card p-4 rounded-xl bg-[#080b12] border border-[#1e263c] space-y-3 flex flex-col justify-between hover:border-amber-500/40 transition">
        <div class="space-y-2.5">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-xl shrink-0" aria-hidden="true">${escapeHtml(dest.flag || '🌎')}</span>
              <div class="min-w-0">
                <h4 class="text-xs sm:text-sm font-black text-white truncate">${escapeHtml(name)}</h4>
                ${dest.nameEn ? `<div class="text-[10px] text-slate-400 truncate">${escapeHtml(dest.nameEn)} · ${escapeHtml(dest.country || '')}</div>` : ''}
              </div>
            </div>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${high ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'}">${escapeHtml(altitude)}</span>
          </div>
          <div class="text-xs text-slate-300 space-y-2">
            <div>
              <div class="text-amber-400 text-[11px] font-bold flex items-center gap-1 mb-1"><i class="fa-solid fa-location-dot text-[10px]" aria-hidden="true"></i> 핵심 랜드마크 & 명소</div>
              <ul class="text-[11px] text-slate-300 pl-2 space-y-0.5 leading-relaxed">${(dest.highlights || []).slice(0, 4).map(item => `<li>• ${escapeHtml(item)}</li>`).join('')}</ul>
            </div>
            <div>
              <div class="text-emerald-400 text-[11px] font-bold flex items-center gap-1 mb-0.5"><i class="fa-solid fa-utensils text-[10px]" aria-hidden="true"></i> 대표 시그니처 미식</div>
              <div class="text-[11px] text-slate-300 pl-2 leading-relaxed">${escapeHtml((dest.foods || []).join(', '))}</div>
            </div>
            ${dest.tips ? `<div class="${TIP_CLASS_HTML} p-2.5">💡 ${escapeHtml(dest.tips)}</div>` : ''}
            ${(emergency || embassy) ? `<div class="flex items-center justify-between text-[10px] text-slate-400 px-2 py-1 rounded bg-[#101626] border border-[#1b243b]">
              ${emergency ? `<span class="text-rose-400 font-bold"><i class="fa-solid fa-phone-volume text-[9px]" aria-hidden="true"></i> 긴급 ${escapeHtml(emergency)}</span>` : ''}
              ${embassy ? `<span class="text-sky-300 font-bold"><i class="fa-solid fa-building-columns text-[9px]" aria-hidden="true"></i> 대사관 ${escapeHtml(embassy)}</span>` : ''}
            </div>` : ''}
          </div>
        </div>
        ${mapsButtonHtml(dest.googleMapsQuery || `${name} ${dest.country || ''}`, `구글 지도에서 ${name.split(' ')[0]} 보기`)}
      </div>`;
  }

  function renderSouthAmericaCities(pack, container) {
    // 제목은 팩의 일반 안내를 쓴다. 예전에는 개인 일정의 고정 날짜가 박힌 배너를 함께 그렸다(v1.9.0 공개 경계 정리에서 빠진 자리).
    header('cityguide', pack?.cities?.headerTitle || '거점 도시 가이드', pack?.cities?.headerDesc || '거점 도시별 주요 랜드마크와 미식, 안전 수칙을 안내합니다.', 'fa-solid fa-city text-amber-400');
    const list = pack?.cities?.items?.length ? pack.cities.items
      : pack?.geo?.destinations?.length ? pack.geo.destinations
      : Object.values(root.KB_TRAVEL?.destinations || {});
    container.innerHTML = list.map(southAmericaCardHtml).join('');
  }

  function renderYunnanCities(pack, container) {
    header('cityguide', pack.cities.headerTitle, pack.cities.headerDesc, 'fa-solid fa-mountain-sun text-amber-400');
    container.innerHTML = (pack.cities.items || []).map(dest => {
      const name = String(dest.name || '');
      return `
        <div class="city-guide-card p-4 rounded-xl bg-[#080b12] border border-[#1e263c] space-y-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2"><span class="text-xl" aria-hidden="true">${escapeHtml(pack.flag || '🇨🇳')}</span><h4 class="text-xs sm:text-sm font-black text-white">${escapeHtml(name)}</h4></div>
            <span class="text-[10px] text-emerald-300 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30">${escapeHtml(dest.badge || '거점 도시')}</span>
          </div>
          <div class="text-xs text-slate-300 space-y-1">
            <p class="text-[11px] text-slate-400">${escapeHtml(dest.intro || '')}</p>
            <div class="text-emerald-400 text-[11px] font-bold pt-1">🍽️ 대표 먹거리</div>
            <div class="text-[11px] text-slate-400">${escapeHtml(dest.food || '')}</div>
            <div class="${TIP_CLASS_HTML} p-2 mt-1.5">💡 ${escapeHtml(dest.caution || '')}</div>
          </div>
          ${mapsButtonHtml(name, `구글 지도에서 ${name.split(' ')[0]} 보기`, 'text-sky-400 py-1.5')}
        </div>`;
    }).join('');
  }

  // 그 밖의 여행: 일정에 있는 스팟(취소된 것은 뺀다)을 모아 보여 준다. 스팟 값은 모두 여행 자료이므로 escape한다.
  function renderTripSpots(trip, container) {
    header('cityguide', `${trip.title} 여행지 스팟 모아보기`, '등록된 전체 일자별 스팟들을 한눈에 확인하고 바로 구글 지도로 이동할 수 있습니다.', 'fa-solid fa-map-pin text-amber-400');
    const spots = [];
    for (const day of trip.days || []) for (const spot of day.spots || []) if (SulsulTravel.LiveItinerary.active(spot)) spots.push({ ...spot, dayNum: day.dayNum, city: day.city });
    if (!spots.length) {
      container.innerHTML = `
        <div class="col-span-2 p-8 text-center rounded-2xl bg-[#080b12] border border-[#1e263c] space-y-2">
          <span class="text-3xl" aria-hidden="true">📍</span>
          <div class="text-sm font-bold text-white">등록된 여행 스팟이 없습니다.</div>
          <p class="text-xs text-slate-400">일정 탭에서 스팟을 추가하거나 AI 추천 일정을 생성해 보세요.</p>
        </div>`;
      return;
    }
    container.innerHTML = spots.map(spot => `
      <div class="city-spot-card p-3.5 rounded-xl bg-[#080b12] border border-[#1e263c] space-y-2 flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between gap-2">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-[#141c2e] text-amber-400 border border-[#23304c]">Day ${escapeHtml(spot.dayNum ?? '')} · ${escapeHtml(spot.time || '')}</span>
            ${spot.cost ? `<span class="text-[10px] text-emerald-400 font-semibold">${escapeHtml(spot.cost)}</span>` : ''}
          </div>
          <h4 class="text-xs font-black text-white mt-1.5">${escapeHtml(spot.title || spot.name || '')}</h4>
          ${spot.desc ? `<p class="text-[11px] text-slate-400 mt-1 leading-relaxed">${escapeHtml(spot.desc)}</p>` : ''}
          ${spot.tip ? `<div class="${TIP_CLASS_HTML} p-2 mt-1.5">💡 ${escapeHtml(spot.tip)}</div>` : ''}
        </div>
        ${mapsButtonHtml(`${spot.title || spot.name || ''} ${spot.city || ''}`, '구글 지도 길찾기', 'text-sky-400 py-1.5')}
      </div>`).join('');
  }

  function renderCityGuides() {
    const trip = getActiveTrip(), container = $('cityguide-cards-container');
    if (!trip || !container) return;
    const pack = resolveTripPack(trip);
    if (isSouthAmericaTrip(trip)) renderSouthAmericaCities(pack, container);
    else if (isYunnanTrip(trip) && pack?.cities) renderYunnanCities(pack, container);
    else renderTripSpots(trip, container);
  }

  const api = Object.freeze({ bookingUrl, setBookingFilter, toggleBooking, renderBookings, renderCityGuides });
  T.PlanGuides = api;

  T.UiActions.define('guides', {
    bookingFilter: element => api.setBookingFilter(element.dataset.filter),
    toggleBooking: element => api.toggleBooking(element.dataset.guide)
  });
})(typeof window !== 'undefined' ? window : globalThis);
