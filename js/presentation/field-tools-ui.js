/* 현장 도구 모음 — 현지 통화 빠른 환율 계산기, 서바이벌 스페인어, 실시간/오프라인 GPS 스팟 레이더 (v2.2.6, 계획 4단계 17차).
 * index.html의 #modal-quick-currency, #modal-survival-spanish, #gps-radar-card 제어와
 * calculateHaversineDistance·populateSimGpsOptions·renderGpsRadar·requestCurrentGpsLocation·
 * simulateGpsLocation·updateGpsRadarUI·addGpsSpotToActiveDay·openGpsSpotInGoogleMaps·
 * openSurvivalSpanishModal·copySpanishText·fallbackCopyText·openQuickCurrencyCalc·
 * renderQuickCalcCurrencyChips·setQuickCalcCurrency·toggleQuickCalcMep·handleQuickCalcInput·
 * clearQuickCalcInput·addQuickCalcAmount·updateQuickCalcUI(약 435줄)을 옮겼다.
 * 셸 함수(getActiveTrip·resolveTripPack·resolveTodayDayIndex·requireSharedPlanEdit·commitTrip·
 * getCurrencyRate·openModal·showToast·escapeHtml)와 전역 State·CURRENCY_INFO는 부를 때 찾는다.
 * 모든 동작은 data-on-click/data-on-input/data-on-change="fieldTools.*"로 잇고,
 * 불러올 때는 등록만 하고 문서를 건드리지 않는다. */
(function (root) {
  'use strict';
  const T = root.SulsulTravel = root.SulsulTravel || {};
  const $ = id => document.getElementById(id);

  const BASE_QUICK_CURRENCIES = Object.freeze([
    { code: 'ARS', flag: '🇦🇷', name: '아르헨 페소', defaultAmt: 50000 },
    { code: 'CLP', flag: '🇨🇱', name: '칠레 페소', defaultAmt: 30000 },
    { code: 'PEN', flag: '🇵🇪', name: '페루 솔', defaultAmt: 100 },
    { code: 'CAD', flag: '🇨🇦', name: '캐나다 달러', defaultAmt: 50 },
    { code: 'USD', flag: '🇺🇸', name: '미국 달러', defaultAmt: 100 },
    { code: 'EUR', flag: '🇪🇺', name: '유로', defaultAmt: 50 }
  ]);

  let addingGpsSpot = false;
  let lastCalcTripId = null;

  // ── 1. 실시간 & 오프라인 GPS 스팟 레이더 ──
  function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function resolveCityCoords(trip, cityName) {
    const target = String(cityName || '').trim();
    if (!target) return null;

    // 1) 여행 일정 내 같은 도시의 좌표가 있는 첫 스팟
    for (const day of (trip?.days || [])) {
      const dayCity = String(day?.city || day?.subCity || '').trim();
      for (const spot of (day?.spots || [])) {
        const lat = Number(spot?.lat);
        const lng = Number(spot?.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        if ((dayCity && (dayCity.includes(target) || target.includes(dayCity))) ||
            String(spot?.title || '').includes(target)) {
          return { lat, lng };
        }
      }
    }

    // 2) RouteMap 공용 도시 좌표 사전
    const geoDict = T.RouteMap?.CITY_GEO_COORDS;
    if (geoDict && typeof geoDict === 'object') {
      if (Array.isArray(geoDict[target]) && geoDict[target].length >= 2) {
        return { lat: Number(geoDict[target][0]), lng: Number(geoDict[target][1]) };
      }
      for (const [key, coords] of Object.entries(geoDict)) {
        if ((key.includes(target) || target.includes(key)) && Array.isArray(coords) && coords.length >= 2) {
          return { lat: Number(coords[0]), lng: Number(coords[1]) };
        }
      }
    }

    // 3) SulsulGeo 전역 지오코더
    if (root.SulsulGeo && typeof root.SulsulGeo.resolveCityCoords === 'function') {
      const found = root.SulsulGeo.resolveCityCoords(target);
      if (found && Number.isFinite(Number(found.lat)) && Number.isFinite(Number(found.lng))) {
        return { lat: Number(found.lat), lng: Number(found.lng) };
      }
    }

    // 4) 여행 내 어떤 스팟이든 좌표가 있으면 첫 좌표 사용
    for (const day of (trip?.days || [])) {
      for (const spot of (day?.spots || [])) {
        const lat = Number(spot?.lat);
        const lng = Number(spot?.lng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
      }
    }
    return null;
  }

  function populateSimGpsOptions(trip) {
    const select = $('select-sim-gps');
    if (!select) return;

    const pack = resolveTripPack(trip);
    const presets = (pack && pack.geo && Array.isArray(pack.geo.simPresets)) ? pack.geo.simPresets : [];

    if (presets.length > 0) {
      const parts = [
        `<option value="">🎯 모의 GPS 위치 테스트 (${escapeHtml(pack.flag || '📍')} ${escapeHtml(pack.name || '추천 스팟')})</option>`
      ];
      presets.forEach(p => {
        parts.push(`<option value="${escapeHtml(p.id)}">${escapeHtml(p.name || p.label || '')}</option>`);
      });
      select.innerHTML = parts.join('');
    } else {
      const parts = ['<option value="">🎯 모의 GPS 위치 테스트</option>'];
      (trip?.cities || []).forEach((c, idx) => {
        parts.push(`<option value="city_${Number(idx)}">📍 ${escapeHtml(c)} 중심</option>`);
      });
      select.innerHTML = parts.join('');
    }
  }

  function renderGpsRadar() {
    const trip = getActiveTrip();
    const pack = resolveTripPack(trip);
    populateSimGpsOptions(trip);

    const tripId = trip ? trip.id : null;
    if (!State.gps || State.gps.tripId !== tripId) {
      State.gps = { tripId, lat: null, lng: null, mode: 'idle', label: '대기 중', nearestSpot: null, nearbySpots: [] };
    }

    if (!Number.isFinite(State.gps.lat) || !Number.isFinite(State.gps.lng)) {
      if (pack && pack.geo && pack.geo.simPresets && pack.geo.simPresets.length > 0) {
        const first = pack.geo.simPresets[0];
        updateGpsRadarUI(first.lat, first.lng, `🎯 추천 기본 모의 위치 (${first.name || first.label})`, 'sim');
      } else {
        const firstCity = (trip?.cities || [])[0];
        const coords = firstCity ? resolveCityCoords(trip, firstCity) : null;
        const lat = coords ? coords.lat : 37.5665;
        const lng = coords ? coords.lng : 126.9780;
        updateGpsRadarUI(lat, lng, '📡 내 위치를 탐색하여 주변 스팟을 확인하세요', 'idle');
      }
    } else {
      updateGpsRadarUI(State.gps.lat, State.gps.lng, State.gps.label, State.gps.mode);
    }
  }

  function requestCurrentGpsLocation() {
    const trip = getActiveTrip();
    const badge = $('gps-status-badge');
    const desc = $('gps-status-desc');
    if (badge) {
      badge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30';
      badge.textContent = '🛰️ 위성 수신 중...';
    }
    if (desc) desc.textContent = '브라우저 GPS로부터 정밀 위경도 신호를 수신하고 있습니다...';

    if (!navigator.geolocation) {
      showToast('현재 브라우저에서 GPS 지오로케이션을 지원하지 않습니다. 모의 위치를 이용해 주세요.');
      const pack = resolveTripPack(trip);
      if (pack && pack.geo && pack.geo.simPresets && pack.geo.simPresets.length > 0) {
        simulateGpsLocation(pack.geo.simPresets[0].id);
      }
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        updateGpsRadarUI(lat, lng, `🛰️ 실시간 GPS 수신 (위도 ${lat.toFixed(4)}, 경도 ${lng.toFixed(4)})`, 'live');
      },
      err => {
        console.warn('[GPS] Geolocation error or denied:', err);
        const pack = resolveTripPack(trip);
        if (pack && pack.geo && pack.geo.simPresets && pack.geo.simPresets.length > 0) {
          const first = pack.geo.simPresets[0];
          showToast(`GPS 신호를 수신할 수 없어 [${escapeHtml(first.name || first.label)}] 모의 위치로 전환합니다.`);
          simulateGpsLocation(first.id);
        } else {
          showToast('GPS 신호 접근이 거부되었거나 수신할 수 없습니다.');
        }
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }

  function simulateGpsLocation(presetKey) {
    if (!presetKey) return;
    const trip = getActiveTrip();
    const pack = resolveTripPack(trip);
    const select = $('select-sim-gps');
    if (select) select.value = presetKey;

    if (pack && pack.geo) {
      const preset = (pack.geo.simPresets || []).find(p => p.id === presetKey);
      if (preset) {
        updateGpsRadarUI(preset.lat, preset.lng, `🎯 모의 GPS 시뮬레이션 (${preset.name || preset.label})`, 'sim');
        return;
      }
      const spot = (pack.geo.knownSpots || []).find(s => s.id === presetKey);
      if (spot) {
        updateGpsRadarUI(spot.lat, spot.lng, `🎯 모의 GPS 시뮬레이션 (${spot.flag || ''} ${spot.name})`, 'sim');
        return;
      }
    }

    const cityMatch = /^city_(\d+)$/.exec(String(presetKey));
    if (cityMatch && trip) {
      const cityName = (trip.cities || [])[Number(cityMatch[1])];
      if (cityName) {
        const coords = resolveCityCoords(trip, cityName);
        if (coords) {
          updateGpsRadarUI(coords.lat, coords.lng, `🎯 모의 GPS 시뮬레이션 (📍 ${cityName} 중심)`, 'sim');
          return;
        }
      }
    }

    updateGpsRadarUI(37.5665, 126.9780, '🎯 모의 GPS 위치', 'sim');
  }

  function updateGpsRadarUI(lat, lng, labelText, mode) {
    const safeLat = Number(lat);
    const safeLng = Number(lng);
    if (!Number.isFinite(safeLat) || !Number.isFinite(safeLng)) return;

    const trip = getActiveTrip();
    const pack = resolveTripPack(trip);
    State.gps = {
      tripId: trip ? trip.id : null,
      lat: safeLat,
      lng: safeLng,
      mode: mode || 'sim',
      label: labelText,
      nearestSpot: null,
      nearbySpots: []
    };

    let spotsToCompare = [];
    if (pack && pack.geo && pack.geo.knownSpots && pack.geo.knownSpots.length > 0) {
      spotsToCompare = pack.geo.knownSpots;
    } else if (trip) {
      (trip.days || []).forEach(d => {
        (d.spots || []).forEach(s => {
          const sLat = Number(s.lat);
          const sLng = Number(s.lng);
          if (Number.isFinite(sLat) && Number.isFinite(sLng)) {
            spotsToCompare.push({
              name: s.title,
              city: d.city || '여행지',
              country: (trip.countries || [])[0] || '해외',
              flag: trip.coverEmoji || '📍',
              cat: s.cat || 'tour',
              lat: sLat,
              lng: sLng,
              tip: s.tip || s.memo || '일정 스팟'
            });
          }
        });
      });
      if (spotsToCompare.length === 0) {
        spotsToCompare = [{
          name: `${(trip.cities || [])[0] || trip.title} 중심가`,
          city: (trip.cities || [])[0] || '도시',
          country: (trip.countries || [])[0] || '해외',
          flag: trip.coverEmoji || '📍',
          cat: 'tour',
          lat: safeLat,
          lng: safeLng,
          tip: '일정에 스팟을 추가하면 실시간 거리가 계산됩니다.'
        }];
      }
    }

    const list = spotsToCompare.map(spot => {
      const distKm = calculateHaversineDistance(safeLat, safeLng, spot.lat, spot.lng);
      return {
        ...spot,
        distanceKm: distKm,
        distanceM: Math.round(distKm * 1000)
      };
    });

    list.sort((a, b) => a.distanceKm - b.distanceKm);
    const nearest = list[0] || null;
    State.gps.nearestSpot = nearest;
    State.gps.nearbySpots = list.slice(1, 4);

    const badge = $('gps-status-badge');
    const desc = $('gps-status-desc');
    if (badge) {
      badge.className = mode === 'live'
        ? 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
        : (mode === 'idle'
          ? 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-300 border border-slate-500/30'
          : 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30');
      badge.textContent = mode === 'live' ? '🟢 실시간 GPS 활성' : (mode === 'idle' ? '📡 대기 중' : '🟡 모의 위치 모드');
    }
    if (desc) desc.textContent = String(labelText || '');

    const spotIcon = $('gps-spot-icon');
    const spotName = $('gps-spot-name');
    const spotDist = $('gps-spot-distance');
    const spotTip = $('gps-spot-tip');
    const spotActions = $('gps-spot-actions');

    if (nearest && spotName) {
      if (spotIcon) spotIcon.textContent = nearest.icon || nearest.flag || '📍';
      spotName.textContent = `${nearest.name}${nearest.city ? ` (${nearest.city})` : ''}`;

      let distText = '';
      if (nearest.distanceM < 1000) {
        const walkMin = Math.max(1, Math.round(nearest.distanceM / 80));
        distText = `📍 ${nearest.distanceM}m 앞 (도보 약 ${walkMin}분)`;
      } else {
        const carMin = Math.max(2, Math.round(nearest.distanceKm * 1.8));
        distText = `📍 ${nearest.distanceKm.toFixed(1)}km 앞 (차량 약 ${carMin}분)`;
      }
      if (spotDist) spotDist.textContent = distText;
      if (spotTip) spotTip.textContent = `💡 꿀팁: ${nearest.tip}`;
      if (spotActions) spotActions.classList.remove('hidden');
    }

    const pillsContainer = $('gps-nearby-pills');
    if (pillsContainer && State.gps.nearbySpots) {
      pillsContainer.innerHTML = State.gps.nearbySpots.map((s, idx) => {
        const dStr = s.distanceM < 1000 ? `${s.distanceM}m` : `${s.distanceKm.toFixed(1)}km`;
        const iconStr = s.icon || s.flag || '📍';
        return [
          `<button type="button" data-on-click="fieldTools.focusGpsSpot" data-lat="${Number(s.lat)}" data-lng="${Number(s.lng)}" data-name="${escapeHtml(s.name)}" class="px-2.5 py-1.5 rounded-lg bg-[#141c2e] hover:bg-[#1a263e] border border-[#23304c] hover:border-amber-500/40 text-slate-300 flex items-center gap-1.5 shrink-0 whitespace-nowrap text-xs cursor-pointer transition" title="이 스팟 위치로 GPS 시뮬레이션 전환">`,
          `  <span class="text-amber-400 font-bold text-[11px]">${Number(idx + 2)}위</span>`,
          `  <span>${escapeHtml(iconStr)} ${escapeHtml(s.name)}</span>`,
          `  <span class="text-[10px] text-emerald-400 font-semibold font-mono">(${escapeHtml(dStr)})</span>`,
          '</button>'
        ].join('');
      }).join('');
    }
  }

  async function addGpsSpotToActiveDay() {
    if (addingGpsSpot) return false;
    const trip = getActiveTrip();
    if (!trip || !trip.days || trip.days.length === 0) {
      showToast('추가할 여행 일정이 없습니다.');
      return false;
    }
    if (!requireSharedPlanEdit()) return false;
    const spot = State.gps?.nearestSpot;
    if (!spot) {
      showToast('매칭된 GPS 스팟이 없습니다.');
      return false;
    }

    addingGpsSpot = true;
    const btn = $('btn-gps-add-to-day');
    if (btn) btn.disabled = true;
    try {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const todayIdx = typeof resolveTodayDayIndex === 'function' ? resolveTodayDayIndex(trip) : 0;
      const targetIdx = (Number.isInteger(todayIdx) && todayIdx >= 0 && todayIdx < trip.days.length) ? todayIdx : 0;

      const added = await commitTrip(trip.id, target => {
        const targetDay = target.days[targetIdx] || target.days[0];
        if (!targetDay.spots) targetDay.spots = [];
        targetDay.spots.push({
          time: timeStr,
          cat: spot.cat || 'tour',
          typeIcon: spot.cat === 'food' ? '🍽️' : '📍',
          title: spot.name,
          desc: `[GPS 매칭 스팟] ${spot.city}, ${spot.country}`,
          tip: spot.tip,
          lat: Number.isFinite(Number(spot.lat)) ? Number(spot.lat) : undefined,
          lng: Number.isFinite(Number(spot.lng)) ? Number(spot.lng) : undefined,
          cost: '현지 경비',
          isDraft: false
        });
      });
      if (!added) return false;
      T.PlanTimeline.render();
      showToast(`📍 [${escapeHtml(spot.name)}]이(가) Day ${Number(targetIdx + 1)} 일정에 추가되었습니다.`);
      return true;
    } finally {
      addingGpsSpot = false;
      if (btn) btn.disabled = false;
    }
  }

  function openGpsSpotInGoogleMaps() {
    const spot = State.gps?.nearestSpot;
    if (!spot) return;
    const lat = Number(spot.lat);
    const lng = Number(spot.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // ── 2. 서바이벌 스페인어 모달 & 안전 복사 ──
  function openSurvivalSpanishModal() {
    openModal('modal-survival-spanish');
  }

  function fallbackCopyText(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
      showToast('📋 복사 완료: ' + escapeHtml(text));
    } catch (_) {
      showToast(escapeHtml(text));
    }
    document.body.removeChild(ta);
  }

  function copySpanishText(text) {
    const safe = String(text || '').trim();
    if (!safe) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(safe).then(() => {
        showToast('📋 복사 완료: ' + escapeHtml(safe));
      }).catch(() => {
        fallbackCopyText(safe);
      });
    } else {
      fallbackCopyText(safe);
    }
  }

  // ── 3. 현지 통화 빠른 환율 계산기 ──
  function getQuickCurrencies() {
    const list = BASE_QUICK_CURRENCIES.map(item => ({ ...item }));
    const trip = typeof getActiveTrip === 'function' ? getActiveTrip() : null;
    const extras = [];
    if (trip?.currency && trip.currency !== 'KRW') extras.push(trip.currency);
    (trip?.activeCurrencies || []).forEach(code => {
      if (code && code !== 'KRW' && !extras.includes(code)) extras.push(code);
    });
    extras.reverse().forEach(code => {
      if (list.some(item => item.code === code)) return;
      const info = typeof CURRENCY_INFO !== 'undefined' ? CURRENCY_INFO[code] : null;
      if (!info) return;
      const rate = typeof getCurrencyRate === 'function' ? Number(getCurrencyRate(code)) : Number(info.rate || 0);
      const defaultAmt = rate > 0 && rate < 20 ? 10000 : (rate > 0 && rate < 100 ? 1000 : 100);
      list.unshift({
        code,
        flag: info.flag || '💱',
        name: info.name || code,
        defaultAmt
      });
    });
    return list;
  }

  function openQuickCurrencyCalc() {
    const currencies = getQuickCurrencies();
    const trip = typeof getActiveTrip === 'function' ? getActiveTrip() : null;
    const tripId = trip ? trip.id : null;
    if (tripId && tripId !== lastCalcTripId) {
      lastCalcTripId = tripId;
      if (trip?.currency && currencies.some(c => c.code === trip.currency)) {
        State.quickCalcCurrency = trip.currency;
        const found = currencies.find(c => c.code === trip.currency);
        State.quickCalcAmount = found ? found.defaultAmt : 50000;
      }
    }
    if (!State.quickCalcCurrency || !currencies.some(c => c.code === State.quickCalcCurrency)) {
      const preferred = (trip?.currency && currencies.some(c => c.code === trip.currency)) ? trip.currency : 'ARS';
      State.quickCalcCurrency = preferred;
      const found = currencies.find(c => c.code === preferred);
      State.quickCalcAmount = found ? found.defaultAmt : 50000;
    }
    if (typeof State.quickCalcAmount !== 'number' || !Number.isFinite(State.quickCalcAmount) || State.quickCalcAmount < 0) {
      const found = currencies.find(c => c.code === State.quickCalcCurrency);
      State.quickCalcAmount = found ? found.defaultAmt : 50000;
    }
    const chk = $('quick-calc-chk-mep');
    if (chk) chk.checked = State.isMepEnabled !== false;
    renderQuickCalcCurrencyChips();
    const input = $('quick-calc-input-amount');
    if (input) input.value = State.quickCalcAmount.toLocaleString();
    updateQuickCalcUI();
    openModal('modal-quick-currency');
  }

  function renderQuickCalcCurrencyChips() {
    const container = $('quick-calc-currency-chips');
    if (!container) return;
    const currencies = getQuickCurrencies();
    const current = State.quickCalcCurrency || 'ARS';
    container.innerHTML = currencies.map(c => {
      const isActive = current === c.code;
      return [
        `<button type="button" data-on-click="fieldTools.setCurrency" data-code="${escapeHtml(c.code)}" aria-pressed="${isActive ? 'true' : 'false'}" class="${isActive ? 'px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1 shrink-0 whitespace-nowrap transition cursor-pointer bg-amber-500 text-slate-950 shadow-xs' : 'px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 whitespace-nowrap transition cursor-pointer theme-card-subtle text-slate-300 hover:text-white'}">`,
        `  <span>${escapeHtml(c.flag)}</span>`,
        `  <span>${escapeHtml(c.code)}</span>`,
        '</button>'
      ].join('');
    }).join('');
  }

  function setQuickCalcCurrency(code) {
    const currencies = getQuickCurrencies();
    const found = currencies.find(c => c.code === code);
    if (!found) return;
    State.quickCalcCurrency = found.code;
    State.quickCalcAmount = found.defaultAmt;
    const input = $('quick-calc-input-amount');
    if (input) input.value = State.quickCalcAmount.toLocaleString();
    renderQuickCalcCurrencyChips();
    updateQuickCalcUI();
  }

  function toggleQuickCalcMep() {
    const chk = $('quick-calc-chk-mep');
    if (chk) {
      State.isMepEnabled = chk.checked;
      const globalChk = $('chk-mep-rate');
      if (globalChk) globalChk.checked = chk.checked;
    }
    updateQuickCalcUI();
  }

  function handleQuickCalcInput(val) {
    const parsed = parseFloat(String(val ?? '').replace(/,/g, ''));
    State.quickCalcAmount = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    updateQuickCalcUI();
  }

  function clearQuickCalcInput() {
    State.quickCalcAmount = 0;
    const input = $('quick-calc-input-amount');
    if (input) input.value = '0';
    updateQuickCalcUI();
  }

  function addQuickCalcAmount(delta) {
    const step = Number(delta);
    if (!Number.isFinite(step)) return;
    State.quickCalcAmount = Math.max(0, (Number(State.quickCalcAmount) || 0) + step);
    const input = $('quick-calc-input-amount');
    if (input) input.value = State.quickCalcAmount.toLocaleString();
    updateQuickCalcUI();
  }

  function updateQuickCalcUI() {
    const currencies = getQuickCurrencies();
    const curr = currencies.some(c => c.code === State.quickCalcCurrency) ? State.quickCalcCurrency : 'ARS';
    const amt = Math.max(0, Number(State.quickCalcAmount) || 0);
    const mepBar = $('quick-calc-mep-bar');
    const chk = $('quick-calc-chk-mep');
    const badge = $('quick-calc-currency-badge');
    const rateInfo = $('quick-calc-rate-info');
    const resultKrw = $('quick-calc-result-krw');
    const resultUsd = $('quick-calc-result-usd');
    const inputLabel = $('quick-calc-input-label');

    if (badge) badge.textContent = curr;
    if (chk) chk.checked = State.isMepEnabled !== false;
    if (mepBar) {
      if (curr === 'ARS') mepBar.classList.remove('hidden');
      else mepBar.classList.add('hidden');
    }
    if (inputLabel) {
      const found = currencies.find(c => c.code === curr);
      inputLabel.textContent = `${found ? found.name : curr} 금액 입력`;
    }

    const USD_KRW = (typeof getCurrencyRate === 'function' && Number(getCurrencyRate('USD')) > 0)
      ? Number(getCurrencyRate('USD'))
      : 1380;
    let usdVal = 0;
    let krwVal = 0;
    let rateDesc = '';

    if (curr === 'ARS') {
      const isMep = State.isMepEnabled !== false;
      const ratePerUsd = isMep ? 1200 : 980;
      usdVal = amt / ratePerUsd;
      krwVal = usdVal * USD_KRW;
      rateDesc = isMep ? '1 USD = 1,200 ARS (MEP 환율)' : '1 USD = 980 ARS (공식 환율)';
    } else if (curr === 'CLP') {
      const ratePerUsd = 940;
      usdVal = amt / ratePerUsd;
      krwVal = usdVal * USD_KRW;
      rateDesc = '1 USD = 940 CLP';
    } else if (curr === 'PEN') {
      const ratePerUsd = 3.75;
      usdVal = amt / ratePerUsd;
      krwVal = usdVal * USD_KRW;
      rateDesc = '1 USD = 3.75 PEN';
    } else if (curr === 'USD') {
      usdVal = amt;
      krwVal = amt * USD_KRW;
      rateDesc = `1 USD = ${Math.round(USD_KRW).toLocaleString()} KRW`;
    } else {
      const unitKrw = (typeof getCurrencyRate === 'function' && Number(getCurrencyRate(curr)) > 0)
        ? Number(getCurrencyRate(curr))
        : (curr === 'CAD' ? 1020 : curr === 'EUR' ? 1500 : USD_KRW);
      krwVal = amt * unitKrw;
      usdVal = krwVal / USD_KRW;
      rateDesc = `1 ${curr} = 약 ${unitKrw >= 100 ? Math.round(unitKrw).toLocaleString() : unitKrw.toFixed(2)} KRW`;
    }

    if (rateInfo) rateInfo.textContent = rateDesc;
    if (resultKrw) resultKrw.textContent = `약 ${Math.round(krwVal).toLocaleString()} 원`;
    if (resultUsd) resultUsd.textContent = `약 $${usdVal.toFixed(2)}`;
  }

  T.UiActions.define('fieldTools', {
    openCurrency: () => openQuickCurrencyCalc(),
    setCurrency: el => setQuickCalcCurrency(el.dataset.code),
    toggleMep: () => toggleQuickCalcMep(),
    currencyInput: el => handleQuickCalcInput(el.value),
    clearCurrency: () => clearQuickCalcInput(),
    addCurrencyAmount: el => addQuickCalcAmount(Number(el.dataset.delta)),
    openSpanish: () => openSurvivalSpanishModal(),
    copyPhrase: el => copySpanishText(el.dataset.phrase || ''),
    requestGps: () => requestCurrentGpsLocation(),
    simulateGps: el => simulateGpsLocation(el.value),
    focusGpsSpot: el => {
      const lat = Number(el.dataset.lat);
      const lng = Number(el.dataset.lng);
      const name = el.dataset.name || '';
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        updateGpsRadarUI(lat, lng, `🎯 모의 GPS (${name})`, 'sim');
      }
    },
    addGpsSpot: () => addGpsSpotToActiveDay(),
    openGpsMaps: () => openGpsSpotInGoogleMaps()
  });

  T.FieldTools = Object.freeze({
    calculateHaversineDistance,
    resolveCityCoords,
    populateSimGpsOptions,
    renderGpsRadar,
    requestCurrentGpsLocation,
    simulateGpsLocation,
    updateGpsRadarUI,
    addGpsSpotToActiveDay,
    openGpsSpotInGoogleMaps,
    openSurvivalSpanishModal,
    copySpanishText,
    openQuickCurrencyCalc,
    renderQuickCalcCurrencyChips,
    setQuickCalcCurrency,
    toggleQuickCalcMep,
    handleQuickCalcInput,
    clearQuickCalcInput,
    addQuickCalcAmount,
    updateQuickCalcUI
  });
})(typeof window !== 'undefined' ? window : globalThis);
