/* 계획 탭의 일정표(타임라인) (v2.1.5, 계획 4단계 네 번째 화면 분리의 2차).
 * index.html 인라인 스크립트의 [1.1] 일차별 고도·날씨·복장 안내와 [1] 일정 타임라인(일자 아코디언, 장소·이동 카드)을 옮겼다.
 * 셸 함수(getActiveTrip·isYunnanTrip·escapeHtml·getCategoryIcon·applyYunnanGoldenCourse·toggleSpotCompleted·toggleSpotFixed·openEditSpotModal·
 * requestDeleteSpot·openScheduleTuningModal·openAddSpotModal·openAddSpotToDay·openModal)와 activity-journal.js의 activityCardHtml은 부를 때 찾는다.
 * 고도·날씨·복장은 아는 장소일 때만 알려 준다. 예전에는 모르는 장소에도 평지 고도와 맑은 날씨를 기본값으로 지어 모든 날에 보여 줬다.
 * 여행 자료 값(날짜·경로·도시·일차·장소)은 모두 escapeHtml로 넣는다. 옮기기 전에는 날짜·경로가 그대로 들어갔다.
 * 동작은 data-on-click="timeline.*"로 잇는다. 불러올 때는 등록만 하고 문서를 건드리지 않는다. */
(function (root) {
  'use strict';
  const T = root.SulsulTravel = root.SulsulTravel || {};
  const $ = id => document.getElementById(id);
  const has = (text, words) => words.some(word => text.includes(word));
  const ROSE = 'sulsul-badge-rose bg-rose-500/20 text-rose-300 border border-rose-500/40';
  const AMBER = 'sulsul-badge-amber bg-amber-500/20 text-amber-300 border border-amber-500/40';
  const EMERALD = 'sulsul-badge-emerald bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
  const STONE = 'bg-stone-800 text-stone-300 border border-stone-700';
  // [장소 이름들, 해발 표시, 배지 색, 고산 관리 필요] — 앞에서부터 처음 맞는 것을 쓴다.
  const ALTITUDES = [
    [['엘 타티오', 'el tatio'], '해발 4,320m (초고산 ⚠️)', ROSE, true],
    [['우만타이', 'humantay'], '해발 4,200m (초고산 ⚠️)', ROSE, true],
    [['쿠스코', 'cusco', 'cuzco'], '해발 3,400m (고산 ⚠️)', ROSE, true],
    [['마라스', '모라이', '성스러운 계곡', '친체로'], '해발 3,000m (고산 ⚠️)', AMBER, true],
    [['마추픽추', 'machu picchu', '아과스칼리엔테스'], '해발 2,430m (주의)', AMBER, false],
    [['아타카마', 'atacama', '달의 계곡'], '해발 2,400m (주의)', AMBER, false],
    [['토레스', '피츠로이', '찰텐', '칼라파테'], '해발 200~1,000m', EMERALD, false],
    [['산티아고', 'santiago'], '해발 570m', STONE, false]
  ];
  // [장소 이름들, 날씨 배지, 날씨 설명, 복장 요약, 복장 설명]
  const CLIMATES = [
    [['엘 타티오', '간헐천'], '❄️ 새벽 -5°C 급랭', '새벽 영하 5°C ~ 낮 18°C 극한 일교차', '🧥 극한 방한 무장 (롱패딩+비니+핫팩)', '헤비 다운 패딩 + 방한 비니 + 방풍 장갑 + 핫팩 2개 + 넥워머 (낮에는 겉옷 탈착)'],
    [['빙하', '모레노', '피츠로이', '찰텐', '토레스', '파타고니아'], '💨 체감 0~8°C 돌풍', '시속 60km 돌풍 및 변덕스러운 소나기 가능성', '🧥 3단 레이어드 (하드쉘+경량패딩+흡한속건)', '고어텍스 방풍/방수 하드쉘 + 보온용 경량패딩/플리스 + 기능성 흡한속건 내의 + 방풍 장갑'],
    [['아타카마', '달의 계곡', '발티나체'], '🏜️ 일교차 20°C 건조', '낮 25°C 강한 자외선 ➔ 밤 5°C 쌀쌀', '☀️ 낮 자외선차단 ➔ 🌙 밤 패딩', '낮: 선글라스+선크림+통풍 긴소매 / 밤(별빛투어): 경량패딩+바람막이'],
    [['쿠스코', '우만타이', '성스러운 계곡', '마추픽추'], '🌦️ 아침 5°C / 낮 20°C', '아침저녁 쌀쌀 + 낮 온화 + 산악지대 급작스러운 스콜 대비', '🧥 탈착식 윈드브레이커 + 방수 판초', '방풍 자켓 + 가벼운 니트/플리스 + 배낭 속 휴대용 판초우의/우산'],
    [['밴쿠버', 'vancouver'], '🍁 가을 10~15°C', '선선한 가을 날씨, 약한 비 가능성', '🧥 트렌치/자켓 + 접이식 우산', '가을 자켓/가디건 + 편안한 도심 워킹화 + 접이식 우산']
  ];

  // 일차의 제목·도시·경로·장소 이름으로 아는 장소를 찾아 고도·날씨·복장을 돌려준다. 모르면 각 값이 null이다.
  function dayConditions(day) {
    const text = `${day?.title || ''} ${day?.city || ''} ${day?.route || ''} ${(day?.spots || []).map(s => s?.title || '').join(' ')}`.toLowerCase();
    const altitude = ALTITUDES.find(([words]) => has(text, words));
    const climate = CLIMATES.find(([words]) => has(text, words));
    return {
      altitude: altitude ? altitude[1] : null,
      altBadgeClass: altitude ? altitude[2] : null,
      isCareNeeded: altitude ? altitude[3] : false,
      weatherBadge: climate ? climate[1] : null,
      weatherDetail: climate ? climate[2] : null,
      outfitSummary: climate ? climate[3] : null,
      outfitDetail: climate ? climate[4] : null
    };
  }

  // 제목에 화살표가 있는 이동 구간의 수단을 고른다. 항공은 항공·비행·flight·편명(AC 123 등)이 있을 때만이다.
  // 예전에는 'ac'라는 글자만 있어도 항공으로 봐서 'Beach'가 든 이동이 항공 이동이 됐다.
  function transitKind(text) {
    const lower = text.toLowerCase();
    if (has(lower, ['버스', 'bus', '셔틀'])) return ['🚌', '고속/직행버스', AMBER];
    if (has(lower, ['열차', '기차', '레일', 'rail'])) return ['🚆', '열차 이동', EMERALD];
    if (has(lower, ['보트', '유람선', '페리', 'boat'])) return ['🚢', '보트 투어', 'sulsul-badge-indigo bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'];
    if (has(lower, ['항공', '비행', 'flight', 'latam', 'air canada']) || /\b[a-z]{2}\s?\d{2,4}\b/.test(lower)) return ['✈️', '항공 이동', 'sulsul-badge-sky bg-sky-500/20 text-sky-300 border border-sky-500/40'];
    return ['🚗', '이동 구간', STONE];
  }

  function isTransit(spot, title) {
    const arrow = title.includes('➔') || title.includes('→');
    if (!arrow) return false;
    if (spot.cat === 'transit') return true;
    const icon = String(spot.typeIcon || '');
    return has(title, ['항공', '버스', '기차', '이동', '공항', '셔틀', '투어']) || has(icon, ['plane', 'bus', 'train']);
  }

  const costText = cost => typeof cost === 'number' ? `${cost.toLocaleString()}원` : String(cost);
  const spotAttrs = (dayIdx, spotIdx) => `data-day="${Number(dayIdx)}" data-spot="${Number(spotIdx)}"`;

  function badgesHtml(spot) {
    const out = [];
    if (spot.completed) out.push('<span class="sulsul-badge-emerald px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 text-[9px] font-bold flex items-center gap-0.5"><i class="fa-solid fa-check text-[8px]" aria-hidden="true"></i>방문완료</span>');
    if (spot.fixed) out.push('<span class="sulsul-badge-indigo px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 border border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800 text-[9px] font-bold flex items-center gap-0.5"><i class="fa-solid fa-thumbtack text-[8px]" aria-hidden="true"></i>고정</span>');
    if (spot.isDraft) out.push('<span class="sulsul-badge-amber px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 text-[9px] font-bold">초안</span>');
    if (String(spot.time || '').includes('+1일')) out.push('<span class="sulsul-badge-indigo px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800 text-[9px] font-bold flex items-center gap-0.5"><i class="fa-solid fa-moon text-[8px]" aria-hidden="true"></i>익일(+1일)</span>');
    return out.join('');
  }

  function notesHtml(spot, spacing) {
    return `${spot.desc ? `<p class="text-[11px] text-slate-400 ${escapeHtml(spacing)} leading-relaxed">${escapeHtml(spot.desc)}</p>` : ''}
      ${spot.memo && !spot.desc ? `<p class="text-[11px] text-slate-400 ${escapeHtml(spacing)} leading-relaxed">${escapeHtml(spot.memo)}</p>` : ''}
      ${spot.tip ? `<div class="tip-box text-[10px] text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-500/20 ${spacing === 'mt-1' ? 'mt-1.5' : ''} font-medium leading-relaxed">💡 ${escapeHtml(spot.tip)}</div>` : ''}`;
  }

  // 장소 카드의 완료·고정·편집·삭제 버튼. 일차·장소 번호는 data-day·data-spot에 둔다.
  function actionButtonsHtml(spot, dayIdx, spotIdx, size, checkSize = size) {
    const done = Boolean(spot.completed), fixed = Boolean(spot.fixed), attrsHtml = spotAttrs(dayIdx, spotIdx), titleHtml = escapeHtml(spot.title || '장소');
    const sizeHtml = escapeHtml(size);
    return {
      checkHtml: `<button type="button" data-on-click="timeline.toggleDone" ${attrsHtml} aria-pressed="${done ? 'true' : 'false'}" aria-label="${titleHtml} ${done ? '방문 완료 취소' : '방문 완료 체크'}" class="${escapeHtml(checkSize)} rounded-lg border ${done ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/20 dark:border-emerald-500/50 dark:text-emerald-400' : 'bg-[#141c2e] border-[#23304c] text-slate-500 hover:text-slate-300'} flex items-center justify-center text-xs shrink-0 transition cursor-pointer" title="${done ? '방문 완료 취소' : '방문 완료 체크'}"><i class="fa-solid fa-check text-[10px]" aria-hidden="true"></i></button>`,
      fixHtml: `<button type="button" data-on-click="timeline.toggleFixed" ${attrsHtml} aria-pressed="${fixed ? 'true' : 'false'}" aria-label="${titleHtml} ${fixed ? '고정 해제' : '일정 고정'}" class="${sizeHtml} rounded-lg border ${fixed ? 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-500/20 dark:border-indigo-500/50 dark:text-indigo-400' : 'bg-[#141c2e] border-[#23304c] text-slate-500 hover:text-slate-300'} flex items-center justify-center text-[10px] transition cursor-pointer" title="${fixed ? '고정 해제' : '일정 고정 (재배치 보호)'}"><i class="fa-solid fa-thumbtack" aria-hidden="true"></i></button>`,
      editHtml: `<button type="button" data-on-click="timeline.edit" ${attrsHtml} aria-label="${titleHtml} 편집" class="${sizeHtml} rounded-lg bg-[#141c2e] hover:bg-amber-500/20 border border-[#23304c] hover:border-amber-500/30 text-slate-400 hover:text-amber-400 flex items-center justify-center text-[10px] transition cursor-pointer" title="스팟 편집"><i class="fa-solid fa-pen-to-square" aria-hidden="true"></i></button>`,
      removeHtml: `<button type="button" data-on-click="timeline.remove" ${attrsHtml} aria-label="${titleHtml} 삭제" class="${sizeHtml} rounded-lg bg-[#141c2e] hover:bg-rose-500/20 border border-[#23304c] hover:border-rose-500/30 text-slate-400 hover:text-rose-400 flex items-center justify-center text-[10px] transition cursor-pointer" title="스팟 삭제"><i class="fa-regular fa-trash-can" aria-hidden="true"></i></button>`
    };
  }

  function transitSpotHtml(spot, day, dayIdx, spotIdx, title) {
    const parts = title.split(/[➔→]/).map(part => part.trim());
    const origin = parts[0] || '출발지', destination = parts[parts.length - 1] || '도착지', waypoints = parts.slice(1, -1);
    const [icon, name, badge] = transitKind(`${title} ${spot.desc || ''}`);
    const city = day.city || '';
    const directions = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(`${origin} ${city}`)}&destination=${encodeURIComponent(`${destination} ${city}`)}`;
    const { checkHtml, fixHtml, editHtml, removeHtml } = actionButtonsHtml(spot, dayIdx, spotIdx, 'w-6 h-6');
    return `
      <div class="activity-timeline-spot timeline-transit group p-3.5 bg-gradient-to-r from-[#0c1220] via-[#0f172a] to-[#0c1220] rounded-xl border border-sky-500/30 hover:border-sky-500/50 transition space-y-2.5">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="font-mono text-xs text-amber-400 font-bold">${escapeHtml(spot.time || '')}</span>
            <span class="timeline-transit-kind px-2 py-0.5 rounded text-[10px] font-bold ${escapeHtml(badge)}">${escapeHtml(icon)} ${escapeHtml(name)}</span>
            ${badgesHtml(spot)}
          </div>
          <div class="shrink-0 flex items-center gap-1">
            ${spot.cost ? `<span class="text-[10px] text-emerald-400 font-semibold font-mono hidden sm:inline mr-1">${escapeHtml(costText(spot.cost))}</span>` : ''}
            ${checkHtml}${fixHtml}${editHtml}${removeHtml}
          </div>
        </div>
        <div class="p-2.5 rounded-lg bg-[#070a12] border border-[#1e263c] flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <div class="text-left shrink-0"><span class="text-[9px] text-slate-400 block font-medium">출발</span><span class="text-xs font-bold text-white truncate max-w-[90px] sm:max-w-none block">${escapeHtml(origin)}</span></div>
            <div class="flex-1 flex items-center justify-center gap-1 min-w-[50px] px-1">
              <div class="h-[1px] bg-slate-700 flex-1"></div>
              <span class="text-[10px] text-sky-400 font-bold px-1 whitespace-nowrap">${escapeHtml(icon)} ${escapeHtml(waypoints.join(' ➔ '))}</span>
              <i class="fa-solid fa-arrow-right text-[10px] text-sky-400" aria-hidden="true"></i>
            </div>
            <div class="text-right shrink-0"><span class="text-[9px] text-slate-400 block font-medium">도착</span><span class="text-xs font-bold text-amber-400 truncate max-w-[90px] sm:max-w-none block">${escapeHtml(destination)}</span></div>
          </div>
          <a href="${escapeHtml(directions)}" target="_blank" rel="noopener noreferrer" class="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 text-[11px] font-bold flex items-center gap-1 shrink-0 transition" title="구글 지도 길찾기 경로 바로 열기" aria-label="${escapeHtml(origin)}에서 ${escapeHtml(destination)}까지 길찾기">
            <i class="fa-solid fa-diamond-turn-right text-[10px]" aria-hidden="true"></i><span class="hidden sm:inline">길찾기</span>
          </a>
        </div>
        ${notesHtml(spot, '')}
        ${activityCardHtml(spot, dayIdx, spotIdx)}
      </div>`;
  }

  function placeSpotHtml(spot, day, dayIdx, spotIdx) {
    const done = Boolean(spot.completed), fixed = Boolean(spot.fixed);
    const border = done ? 'border-emerald-500/25 bg-emerald-950/5' : fixed ? 'border-indigo-500/25 bg-indigo-950/5' : 'border-[#1a2236]';
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${spot.title || ''} ${day.city || ''}`)}`;
    const { checkHtml, fixHtml, editHtml, removeHtml } = actionButtonsHtml(spot, dayIdx, spotIdx, 'w-7 h-7', 'w-6 h-6 mt-0.5');
    return `
      <div class="activity-timeline-spot group flex items-start gap-2.5 sm:gap-3 p-3 bg-[#080b12] rounded-xl border ${escapeHtml(border)} hover:border-[#2a3652] transition">
        ${checkHtml}
        <span class="text-sm shrink-0 mt-0.5" aria-hidden="true">${escapeHtml(spot.typeIcon || getCategoryIcon(spot.cat))}</span>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="font-mono text-xs text-amber-400 font-bold">${escapeHtml(spot.time || '')}</span>
            <span class="font-bold ${done ? 'line-through text-slate-400' : 'text-slate-200'} text-xs">${escapeHtml(spot.title || '')}</span>
            ${badgesHtml(spot)}
          </div>
          ${notesHtml(spot, 'mt-1')}
          ${activityCardHtml(spot, dayIdx, spotIdx)}
        </div>
        <div class="shrink-0 flex items-center gap-1">
          ${spot.cost ? `<span class="text-[10px] text-emerald-400 font-semibold hidden sm:inline mr-1">${escapeHtml(costText(spot.cost))}</span>` : ''}
          ${fixHtml}${editHtml}
          <a href="${escapeHtml(mapUrl)}" target="_blank" rel="noopener noreferrer" class="w-7 h-7 rounded-lg bg-[#141c2e] hover:bg-[#1a263e] border border-[#23304c] text-sky-400 flex items-center justify-center text-[10px] transition" title="구글 지도에서 위치 보기" aria-label="${escapeHtml(spot.title || '장소')} 구글 지도에서 보기"><i class="fa-solid fa-map-pin" aria-hidden="true"></i></a>
          ${removeHtml}
        </div>
      </div>`;
  }

  const CARE_TIPS = [
    ['text-amber-400', '☕', '코카차(Mate de Coca)', ' 수시 음용 (호텔 로비 상시 구비)'],
    ['text-rose-400', '💊', '다이아목스', ' 아침/저녁 반알(125mg) 복용 & 타이레놀 지참'],
    ['text-sky-400', '💧', '수분 2L+ 섭취', ' & 무리한 보행/점프 금지 (첫날 금주 필수)'],
    ['text-emerald-400', '🫁', '산소(Oxígeno)', ' 심한 두통/호흡 곤란 시 호텔 프론트에 즉시 요청']
  ];

  function dayHtml(day, dayIdx, expanded) {
    const info = dayConditions(day);
    const labelHtml = escapeHtml(day.dayNum || dayIdx + 1);
    const spotsHtml = (day.spots || []).map((spot, spotIdx) => {
      if (!SulsulTravel.LiveItinerary.active(spot)) return '';
      const title = String(spot.title || '');
      return isTransit(spot, title) ? transitSpotHtml(spot, day, dayIdx, spotIdx, title) : placeSpotHtml(spot, day, dayIdx, spotIdx);
    }).join('');
    const altitudeHtml = info.altitude ? `<span class="timeline-altitude px-2 py-0.5 rounded text-[10px] font-bold ${escapeHtml(info.altBadgeClass)} flex items-center gap-1"><i class="fa-solid fa-mountain" aria-hidden="true"></i> ${escapeHtml(info.altitude)}</span>` : '';
    const weatherHtml = info.weatherBadge ? `<span class="timeline-weather px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1"><i class="fa-solid fa-cloud-sun" aria-hidden="true"></i> ${escapeHtml(info.weatherBadge)}</span>
      <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30 hidden sm:inline-flex items-center gap-1"><i class="fa-solid fa-shirt" aria-hidden="true"></i> ${escapeHtml(info.outfitSummary)}</span>` : '';
    const careHtml = info.isCareNeeded ? `
      <div class="timeline-altitude-care p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-purple-500/15 via-rose-500/10 to-amber-500/15 border border-purple-500/30 space-y-2 my-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-purple-200"><i class="fa-solid fa-heart-pulse text-rose-400" aria-hidden="true"></i><span>안데스 고산병(Soroche) 안심 케어 수칙 (${escapeHtml(info.altitude)})</span></div>
          <span class="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-300 border border-purple-500/40">해발 2,500m+ 케어</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-300">
          ${CARE_TIPS.map(([tone, icon, strong, rest]) => `<div class="flex items-start gap-1.5"><span class="${escapeHtml(tone)}" aria-hidden="true">${escapeHtml(icon)}</span><span><strong>${escapeHtml(strong)}</strong>${escapeHtml(rest)}</span></div>`).join('')}
        </div>
      </div>` : '';
    const outfitHtml = info.outfitDetail ? `
      <div class="timeline-outfit p-2.5 rounded-xl bg-stone-900/60 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 my-2 text-xs">
        <div class="flex items-center gap-1.5 flex-wrap"><span class="text-[10px] font-bold text-amber-300 flex items-center gap-1 shrink-0"><i class="fa-solid fa-vest" aria-hidden="true"></i> 추천 복장:</span><span class="text-[11px] text-slate-200 font-medium">${escapeHtml(info.outfitDetail)}</span></div>
        <span class="text-[10px] text-slate-400 font-medium shrink-0 flex items-center gap-1"><i class="fa-solid fa-temperature-half text-amber-400" aria-hidden="true"></i> ${escapeHtml(info.weatherDetail)}</span>
      </div>` : '';
    return `
      <div class="timeline-day rounded-2xl bg-[#0f1422] border border-[#1e263c] overflow-hidden transition-all duration-200">
        <div class="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-[#141c2e]/60 transition" data-on-click="timeline.toggleDay" data-day="${Number(dayIdx)}">
          <div class="flex items-center gap-3">
            <span class="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 font-black flex items-center justify-center text-xs shrink-0">D${labelHtml}</span>
            <div>
              <div class="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h4 class="text-sm font-black text-white">${escapeHtml(day.title || '')}</h4>
                <span class="text-xs text-slate-400 font-medium">${escapeHtml(day.date || '')}</span>
                ${altitudeHtml}
                ${weatherHtml}
              </div>
              <p class="text-[11px] text-slate-400 mt-0.5 truncate max-w-xs sm:max-w-md">${escapeHtml(day.route || day.city || '')}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" data-on-click="timeline.tune" data-day="${Number(dayIdx)}" class="sulsul-badge-amber px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-800 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 dark:border-amber-500/30 dark:text-amber-300 dark:hover:text-amber-200 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer" title="Day ${labelHtml} 변수 대응 & 일정 튜닝" aria-label="Day ${labelHtml} 일정 튜닝">
              <i class="fa-solid fa-bolt text-[9px]" aria-hidden="true"></i><span class="hidden sm:inline">일정 튜닝</span>
            </button>
            <button type="button" data-on-click="timeline.addSpot" data-day="${Number(dayIdx)}" class="px-2 py-1 rounded-lg bg-[#141c2e] hover:bg-[#1a263e] border border-[#23304c] text-slate-300 hover:text-white text-[11px] font-bold transition flex items-center gap-1 cursor-pointer" aria-label="Day ${labelHtml}에 스팟 추가">
              <i class="fa-solid fa-plus text-[9px]" aria-hidden="true"></i><span class="hidden sm:inline">스팟</span>
            </button>
            <button type="button" id="day-chevron-${Number(dayIdx)}" data-on-click="timeline.toggleDay" data-day="${Number(dayIdx)}" aria-expanded="${expanded ? 'true' : 'false'}" aria-controls="day-body-${Number(dayIdx)}" aria-label="Day ${labelHtml} 일정 ${expanded ? '접기' : '펼치기'}" class="text-slate-400 text-xs transition-transform duration-200 ${expanded ? 'rotate-180' : ''}">
              <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
            </button>
          </div>
        </div>
        <div id="day-body-${Number(dayIdx)}" class="${expanded ? '' : 'hidden'} p-4 pt-0 border-t border-[#1a2236] space-y-2 mt-2">
          ${careHtml}
          ${outfitHtml}
          <div class="pt-1 flex items-center justify-between text-[11px] text-slate-400 pb-1">
            <span>🕒 30분~1시간 단위 상세 시간표</span>
            <span>총 ${Number((day.spots || []).length)}개 스팟</span>
          </div>
          <div class="space-y-2">
            ${spotsHtml || '<div class="text-xs text-slate-500 py-3 text-center">등록된 스팟이 없습니다. + 버튼을 눌러 추가하세요.</div>'}
          </div>
        </div>
      </div>`;
  }

  function yunnanBannerHtml(trip) {
    const placeholder = (trip.days || []).some(d => (d.spots || []).some(s => s.isDraft || (s.title && (s.title.includes('모닝 산책') || s.title.includes('맞춤 스팟')))));
    if (!placeholder) return '';
    return `
      <div class="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-amber-500/15 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md mb-3">
        <div class="flex items-center gap-3">
          <span class="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-lg shrink-0" aria-hidden="true">🇨🇳</span>
          <div>
            <div class="font-black text-white text-xs sm:text-sm">중국 운남 13일 황금 명소 코스 자동 채우기</div>
            <p class="text-[11px] text-slate-300 mt-0.5">쿤밍(석림) · 따리(얼하이) · 리장(옥룡설산) · 호도협 · 샹그릴라 실전 30분 단위 일정</p>
          </div>
        </div>
        <button type="button" data-on-click="timeline.yunnanCourse" class="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-slate-950 font-black rounded-xl text-xs shrink-0 shadow transition flex items-center gap-1.5">
          <i class="fa-solid fa-wand-magic-sparkles text-[10px]" aria-hidden="true"></i><span>운남 일정 즉시 적용</span>
        </button>
      </div>`;
  }

  function render() {
    const trip = getActiveTrip(), container = $('days-accordion-container'), aiBanner = $('banner-ai-recommend');
    if (!trip || !container) return;
    if (!Array.isArray(trip.days) || !trip.days.length) {
      container.innerHTML = `
        <div class="p-8 text-center rounded-2xl bg-[#0f1422] border border-[#1e263c] space-y-3">
          <span class="text-3xl" aria-hidden="true">📅</span>
          <div class="text-sm font-bold text-white">등록된 여행 일정이 없습니다.</div>
          <p class="text-xs text-slate-400">AI 추천 일정을 생성하거나 수동으로 일정을 추가해 보세요.</p>
        </div>`;
      aiBanner?.classList.remove('hidden');
      return;
    }
    aiBanner?.classList.add('hidden');
    const expanded = Boolean(State.allTimelinesExpanded);
    container.innerHTML = (isYunnanTrip(trip) ? yunnanBannerHtml(trip) : '') + trip.days.map((day, dayIdx) => dayHtml(day, dayIdx, expanded)).join('');
  }

  function toggleDay(dayIdx) {
    const body = $(`day-body-${dayIdx}`), chevron = $(`day-chevron-${dayIdx}`);
    if (!body) return;
    const open = body.classList.toggle('hidden') === false;
    if (chevron) {
      chevron.classList.toggle('rotate-180', open);
      chevron.setAttribute('aria-expanded', String(open));
      chevron.setAttribute('aria-label', chevron.getAttribute('aria-label').replace(/(펼치기|접기)$/, open ? '접기' : '펼치기'));
    }
  }

  function toggleAll() {
    State.allTimelinesExpanded = !State.allTimelinesExpanded;
    const button = $('btn-toggle-all-tl');
    if (button) {
      button.innerHTML = `<i class="fa-solid fa-up-down text-[10px]" aria-hidden="true"></i> ${State.allTimelinesExpanded ? '전체 접기' : '전체 펼치기'}`;
      button.setAttribute('aria-pressed', String(State.allTimelinesExpanded));
    }
    render();
  }

  const api = Object.freeze({ dayConditions, transitKind, render, toggleDay, toggleAll });
  T.PlanTimeline = api;

  const day = element => Number(element.dataset.day), spot = element => Number(element.dataset.spot);
  T.UiActions.define('timeline', {
    toggleDay: element => api.toggleDay(day(element)),
    toggleAll: () => api.toggleAll(),
    toggleDone: (element, event) => T.ScheduleTuning.toggleSpotCompleted(day(element), spot(element), event),
    toggleFixed: (element, event) => T.ScheduleTuning.toggleSpotFixed(day(element), spot(element), event),
    edit: (element, event) => T.ScheduleTuning.openEditSpotModal(day(element), spot(element), event),
    remove: (element, event) => requestDeleteSpot(day(element), spot(element), event),
    tune: element => element.dataset.day === undefined ? T.ScheduleTuning.openScheduleTuningModal() : T.ScheduleTuning.openScheduleTuningModal(day(element)),
    addSpot: element => element.dataset.day === undefined ? T.ScheduleTuning.openAddSpotModal() : T.ScheduleTuning.openAddSpotToDay(day(element)),
    aiTrip: () => openModal('modal-ai-trip'),
    yunnanCourse: () => applyYunnanGoldenCourse()
  });
})(typeof window !== 'undefined' ? window : globalThis);
