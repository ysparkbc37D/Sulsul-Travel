/* 계획·통계의 노선도 모달(관광 일러스트 노선도 & 인터랙티브 위성 궤적)과 공용 여행 좌표 해석 (v2.1.7, 4단계 9차).
 * index.html 인라인 스크립트의 [4.5] 구역(약 1,000줄)을 옮기고 전역 상태 3종(__routeMapIsGlobalAllTrips·__routeMapFocusCountry·__globalTripBoundsMap)을
 * 모듈 안 변수로 옮겼다.
 * 셸 함수(getActiveTrip·resolveTripPack·isYunnanTrip·isSouthAmericaTrip·escapeHtml·openModal·closeModal·openTripWorkspace·switchView·switchTab·
 * navigateToInteractiveMap·showToast)와 전역 State·L·KB_TRAVEL·SulsulGeo는 부를 때 찾는다.
 * 여행 자료 값(국가·도시·장소·제목·커버 이모지)은 모두 escapeHtml 또는 textContent로 넣는다.
 * 동작은 data-on-click="routeMap.*"로 잇는다. 불러올 때는 등록만 하고 문서를 건드리지 않는다. */
(function (root) {
  'use strict';
  const T = root.SulsulTravel = root.SulsulTravel || {};
  const $ = id => document.getElementById(id);

  let currentTab = 'metro';
  let leafletInstance = null;
  let leafletMarkers = [];
  let isGlobalAllTrips = false;
  let focusCountry = null;
  let globalTripBoundsMap = {};
  let callerModal = null;
  let openingViaApi = false;

  const TRIP_PALETTES = [
    { stroke: '#f59e0b', fill: '#f59e0b', border: '#fbbf24' },
    { stroke: '#10b981', fill: '#10b981', border: '#34d399' },
    { stroke: '#0284c7', fill: '#0284c7', border: '#38bdf8' },
    { stroke: '#f43f5e', fill: '#f43f5e', border: '#fb7185' },
    { stroke: '#8b5cf6', fill: '#8b5cf6', border: '#a78bfa' }
  ];

  const CITY_GEO_COORDS = {
    '로스앤젤레스': [34.0522, -118.2437],
    'LA': [34.0522, -118.2437],
    '리마': [-12.0464, -77.0428],
    '이카': [-14.0678, -75.7286],
    '와카치나': [-14.0875, -75.7626],
    '파라카스': [-13.8407, -76.2464],
    '파라카스·와카치나': [-14.0875, -75.7626],
    '쿠스코': [-13.5319, -71.9675],
    '마추픽추': [-13.1631, -72.5450],
    '라파즈': [-16.5000, -68.1500],
    '우유니': [-20.4637, -66.8250],
    '아타카마': [-22.9087, -68.1997],
    '산티아고': [-33.4489, -70.6693],
    '푸에르토나탈레스': [-51.7269, -72.5068],
    '엘칼라파테': [-50.3375, -72.2647],
    '부에노스아이레스': [-34.6037, -58.3816],
    '푸에르토 이과수': [-25.6953, -54.4367],
    '이과수': [-25.6953, -54.4367],
    '리우데자네이루': [-22.9068, -43.1729],
    '리우': [-22.9068, -43.1729],
    '쿤밍': [25.0406, 102.7122],
    '석림': [24.8167, 103.3250],
    '대리': [25.6065, 100.2676],
    '따리': [25.6967, 100.1652],
    '여강': [26.8721, 100.2299],
    '리장': [26.8721, 100.2345],
    '옥룡설산': [27.1086, 100.1878],
    '호도협': [27.1833, 100.1333],
    '샹그릴라': [27.8269, 99.7072],
    '도쿄': [35.6762, 139.6503],
    '오사카': [34.6937, 135.5023],
    '교토': [35.0116, 135.7681],
    '후쿠오카': [33.5904, 130.4017],
    '파리': [48.8566, 2.3522],
    '런던': [51.5074, -0.1278],
    '로마': [41.9028, 12.4964],
    '바르셀로나': [41.3851, 2.1734],
    '마드리드': [40.4168, -3.7038],
    '톨레도': [39.8628, -4.0273],
    '톨레토': [39.8628, -4.0273],
    '세비야': [37.3891, -5.9845],
    '세비아': [37.3891, -5.9845],
    '그라나다': [37.1773, -3.5986],
    '론다': [36.7462, -5.1612],
    '발렌시아': [39.4699, -0.3763],
    '말라가': [36.7213, -4.4214],
    '코르도바': [37.8882, -4.7794],
    '산세바스티안': [43.3183, -1.9812],
    '세고비아': [40.9429, -4.1088],
    '이비자': [38.9067, 1.4206],
    '마요르카': [39.6953, 3.0176],
    '포르투': [41.1579, -8.6291],
    '리스본': [38.7223, -9.1393],
    '프라하': [50.0755, 14.4378],
    '비엔나': [48.2082, 16.3738],
    '인터라켄': [46.6863, 7.8632],
    '방콕': [13.7563, 100.5018],
    '다낭': [16.0544, 108.2022],
    '발리': [-8.4095, 115.1889],
    '싱가포르': [1.3521, 103.8198],
    '시드니': [-33.8688, 151.2093],
    '뉴욕': [40.7128, -74.0060],
    '하와이': [21.3069, -157.8583],
    '호놀룰루': [21.3069, -157.8583]
  };

  // [도시 키워드, 랜드마크 이모지, 국기, 국가명, 대표 랜드마크]
  const STATION_PRESETS = [
    [['로스앤젤레스', 'LA'], '🎬', '🇺🇸', '미국', '산타모니카 피어'],
    [['리마'], '🌊', '🇵🇪', '페루', '미라플로레스 절벽 & 사랑의 공원'],
    [['와카치나', '이카', '파라카스'], '🏜️', '🇵🇪', '페루', '사막 오아시스 버기 & 샌드보딩'],
    [['마추픽추'], '⛰️', '🇵🇪', '페루', '잉카 공중도시 망지기의 집'],
    [['쿠스코'], '🦙', '🇵🇪', '페루', '아르마스 광장 & 12각의 돌'],
    [['우유니'], '🧂', '🇧🇴', '볼리비아', '우유니 소금사막 & 기차무덤'],
    [['라파즈'], '🚠', '🇧🇴', '볼리비아', '미 텔레페리코 케이블카 & 마녀시장'],
    [['아타카마', '칼라마'], '🪐', '🇨🇱', '칠레', '달의 계곡 & 사막 은하수'],
    [['산티아고'], '🍷', '🇨🇱', '칠레', '산 크리스토발 언덕 & 아르마스 광장'],
    [['토레스', '푸에르토나탈레스'], '🏔️', '🇨🇱', '칠레', '토레스 델 파이네 삼봉 트레킹'],
    [['칼라파테', '빙하'], '❄️', '🇦🇷', '아르헨티나', '페리토 모레노 대빙하 트레킹'],
    [['피츠로이', '샬텐'], '🧗', '🇦🇷', '아르헨티나', '파타고니아 피츠로이 설산 뷰'],
    [['부에노스'], '🥩', '🇦🇷', '아르헨티나', '5월 광장 & 돈 훌리오 아사도'],
    [['리우'], '🗽', '🇧🇷', '브라질', '코르코바두 거대 예수상 & 코파카바나'],
    [['쿤밍'], '🌸', '🇨🇳', '중국', '석림 세계자연유산 & 취호공원'],
    [['대리', '따리'], '🏯', '🇨🇳', '중국', '얼하이호 호수 & 숭성사 삼탑'],
    [['여강', '리장'], '🏔️', '🇨🇳', '중국', '옥룡설산 빙천공원 & 여강고성'],
    [['샹그릴라'], '🛕', '🇨🇳', '중국', '송찬림사 & 두커종 고성']
  ];

  const activeSpots = spots => (spots || []).filter(s => !s.skipped && !s.cancelled && !s.removed && !s.deferred);
  const firstWord = text => String(text || '').trim().split(/\s+/)[0] || '';

  function paletteForTrip(trip, index) {
    if (isSouthAmericaTrip(trip)) return TRIP_PALETTES[0];
    if (isYunnanTrip(trip)) return TRIP_PALETTES[1];
    return TRIP_PALETTES[index % TRIP_PALETTES.length];
  }

  function updateCallerBtn() {
    const backBtn = $('btn-routemap-back-caller');
    if (backBtn) backBtn.classList.toggle('hidden', !callerModal);
  }

  function getTripGeoData(trip) {
    if (!trip) return { latlngs: [], bounds: null };
    const pack = resolveTripPack(trip);
    let latlngs = [];

    if (pack && pack.geo && pack.geo.flightRoutes && pack.geo.flightRoutes.length > 0) {
      const dests = Array.isArray(pack.geo.destinations) ? pack.geo.destinations : Object.values(pack.geo.destinations || {});
      latlngs = pack.geo.flightRoutes.map((coord, idx) => {
        let name = `거점 #${idx + 1}`;
        let dest = dests.find(d => Math.abs(d.lat - coord[0]) < 0.1 && Math.abs(d.lng - coord[1]) < 0.1);
        if (!dest && dests[idx]) dest = dests[idx];
        if (dest) name = dest.nameKo || (dest.name ? String(dest.name).split(' ')[0] : dest.id);
        return { name, latlng: coord, idx: idx + 1, dest };
      });
    } else {
      const rawCities = trip.cities || [];
      const cities = rawCities.length > 0 ? rawCities : (trip.days ? trip.days.map(d => d.city || firstWord(d.title) || null).filter(Boolean) : []);
      const uniqueCities = [];
      cities.forEach(c => { if (!uniqueCities.includes(c)) uniqueCities.push(c); });

      uniqueCities.forEach((c, idx) => {
        let coord = CITY_GEO_COORDS[c];
        if (!coord) {
          Object.keys(CITY_GEO_COORDS).forEach(k => {
            if (c.includes(k) || k.includes(c)) coord = CITY_GEO_COORDS[k];
          });
        }
        if (!coord && root.SulsulGeo && typeof root.SulsulGeo.resolveDestinationGeo === 'function') {
          const geoResolved = root.SulsulGeo.resolveDestinationGeo(c, (trip.countries && trip.countries[0]) || null);
          if (geoResolved && typeof geoResolved.lat === 'number' && !(geoResolved.lat === 20.0 && geoResolved.lng === 0.0)) {
            coord = [geoResolved.lat, geoResolved.lng];
          }
        }
        if (coord) latlngs.push({ name: c, latlng: coord, idx: idx + 1 });
      });
    }

    return {
      latlngs,
      bounds: (latlngs.length > 0 && typeof L !== 'undefined') ? L.latLngBounds(latlngs.map(l => l.latlng)) : null
    };
  }

  function renderLeaflet(trip, isGlobal) {
    const container = $('routemap-leaflet-container');
    if (!container || typeof L === 'undefined') return;

    if (!leafletInstance) {
      leafletInstance = L.map('routemap-leaflet-container', {
        zoomControl: true,
        attributionControl: false,
        scrollWheelZoom: false
      }).setView([15.0, 10.0], 2);

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap'
      }).addTo(leafletInstance);
    }

    leafletInstance.invalidateSize();
    leafletMarkers.forEach(m => m.remove());
    leafletMarkers = [];

    const isGlobalMode = Boolean(isGlobal || isGlobalAllTrips);
    if (isGlobalMode) {
      const allTrips = (State.trips && State.trips.length > 0) ? State.trips : [getActiveTrip()].filter(Boolean);
      const allBoundsCoords = [];
      globalTripBoundsMap = {};

      allTrips.forEach((t, tIdx) => {
        const palette = paletteForTrip(t, tIdx);
        const geo = getTripGeoData(t);
        if (geo.bounds) globalTripBoundsMap[t.id] = geo.bounds;

        if (geo.latlngs.length > 0) {
          geo.latlngs.forEach(l => allBoundsCoords.push(l.latlng));
          if (geo.latlngs.length > 1) {
            const polyline = L.polyline(geo.latlngs.map(l => l.latlng), {
              color: palette.stroke, weight: 3.5, dashArray: '6, 6', opacity: 0.88
            }).addTo(leafletInstance);
            leafletMarkers.push(polyline);
          }
          geo.latlngs.forEach(l => {
            const marker = L.circleMarker(l.latlng, {
              radius: 8, fillColor: palette.fill, color: '#ffffff', weight: 2, opacity: 1, fillOpacity: 0.95
            }).addTo(leafletInstance);
            const popupHtml = `
              <div class="text-xs p-1" style="min-width: 160px;">
                <div class="flex items-center gap-1.5 border-b border-stone-200 dark:border-stone-700 pb-1 mb-1">
                  <span>${escapeHtml(t.coverEmoji || '✈️')}</span>
                  <b class="text-xs text-[#1c1917] dark:text-white">${escapeHtml(l.name)}</b>
                  <span class="text-[9px] px-1.5 py-0.2 rounded font-bold" style="background:${escapeHtml(palette.border)};color:#000;">#${Number(l.idx)}</span>
                </div>
                <div class="text-[11px] text-stone-600 dark:text-stone-300 font-semibold mb-1">${escapeHtml(t.title || '')}</div>
                <div class="flex items-center gap-1.5 mt-2">
                  <button type="button" data-on-click="routeMap.openTrip" data-trip="${escapeHtml(t.id)}" data-city="${escapeHtml(l.name)}" class="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-600 dark:text-amber-400 font-bold text-[10px] cursor-pointer">이 여정 열기</button>
                  <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${l.name} ${t.title || ''}`.trim())}" target="_blank" rel="noopener noreferrer" class="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold text-[10px]">구글 지도</a>
                </div>
              </div>`;
            marker.bindPopup(popupHtml);
            leafletMarkers.push(marker);
          });
        }
      });

      if (allBoundsCoords.length > 1) {
        leafletInstance.fitBounds(L.latLngBounds(allBoundsCoords), { padding: [50, 50], maxZoom: 6 });
      } else if (allBoundsCoords.length === 1) {
        leafletInstance.setView(allBoundsCoords[0], 5);
      }

      const linksContainer = $('modal-route-map-links');
      if (linksContainer) {
        const tripButtonsHtml = allTrips.map((t, tIdx) => {
          const palette = paletteForTrip(t, tIdx);
          const shortTitle = firstWord(t.title) || '여정';
          const cityCount = (t.cities && t.cities.length > 0) ? t.cities.length : (t.days ? t.days.length : 0);
          return `
            <button type="button" data-on-click="routeMap.zoomGlobal" data-trip="${escapeHtml(t.id)}" class="px-2.5 py-1 rounded-lg bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 border border-[#e8e2d5] dark:border-stone-700 text-[#1c1917] dark:text-stone-200 font-bold shrink-0 transition flex items-center gap-1.5 text-[11px] cursor-pointer">
              <span class="w-2 h-2 rounded-full shrink-0" style="background:${escapeHtml(palette.stroke)};"></span>
              <span>${escapeHtml(t.coverEmoji || '✈️')}</span>
              <span>${escapeHtml(shortTitle)} (${cityCount}개 거점)</span>
            </button>`;
        }).join('');
        linksContainer.innerHTML = `
          <span class="font-bold text-[#78716c] dark:text-stone-400 shrink-0 text-[11px]">🌍 대륙/여정 줌인:</span>
          <button type="button" data-on-click="routeMap.zoomGlobal" data-trip="all" class="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-[#a2601b] dark:text-[#d4af37] font-bold shrink-0 transition text-[11px] cursor-pointer">
            🌐 전 세계 궤적
          </button>
          ${tripButtonsHtml}`;
      }
      return;
    }

    const active = trip || getActiveTrip();
    if (!active) return;
    const geo = getTripGeoData(active);
    const isYN = isYunnanTrip(active);
    const pinColor = isYN ? '#10b981' : '#f59e0b';
    const polyColor = isYN ? '#059669' : '#0284c7';

    geo.latlngs.forEach(l => {
      const marker = L.circleMarker(l.latlng, {
        radius: 8, fillColor: pinColor, color: '#ffffff', weight: 2, opacity: 1, fillOpacity: 0.9
      }).addTo(leafletInstance);
      marker.bindPopup(`<b>${escapeHtml(l.name)}</b><br><span class="text-xs">정거장 #${Number(l.idx)}</span>`);
      leafletMarkers.push(marker);
    });

    if (geo.latlngs.length > 1) {
      const polyline = L.polyline(geo.latlngs.map(l => l.latlng), {
        color: polyColor, weight: 3, dashArray: '6, 6', opacity: 0.85
      }).addTo(leafletInstance);
      leafletMarkers.push(polyline);
      leafletInstance.fitBounds(polyline.getBounds(), { padding: [40, 40] });
    } else if (geo.latlngs.length === 1) {
      leafletInstance.setView(geo.latlngs[0].latlng, 10);
    }
  }

  function zoomGlobal(tripId) {
    if (!leafletInstance) return;
    if (!tripId || tripId === 'all') {
      const allTrips = (State.trips && State.trips.length > 0) ? State.trips : [getActiveTrip()].filter(Boolean);
      const allCoords = [];
      allTrips.forEach(t => { getTripGeoData(t).latlngs.forEach(l => allCoords.push(l.latlng)); });
      if (allCoords.length > 1) {
        leafletInstance.fitBounds(L.latLngBounds(allCoords), { padding: [50, 50], maxZoom: 6 });
      }
    } else if (globalTripBoundsMap[tripId]) {
      leafletInstance.fitBounds(globalTripBoundsMap[tripId], { padding: [40, 40], maxZoom: 8 });
    }
  }

  function selectTrip(tripId, cityKey) {
    callerModal = null;
    updateCallerBtn();
    closeModal('modal-route-map', true);
    if (tripId && State.activeTripId !== tripId) {
      openTripWorkspace(tripId);
    } else {
      switchView('workspace');
    }
    if (cityKey) {
      setTimeout(() => { navigateToInteractiveMap(cityKey); }, 150);
    }
  }

  function jumpToDay(dayNum, tripId) {
    callerModal = null;
    updateCallerBtn();
    closeModal('modal-route-map', true);
    if (tripId && State.activeTripId !== tripId) {
      openTripWorkspace(tripId);
    } else {
      switchTab('plan');
    }
    T.PlanBlocks.switchSubTab('timeline');
    setTimeout(() => {
      const trip = getActiveTrip();
      const days = trip?.days || [];
      let dayIdx = days.findIndex(d => Number(d.dayNum) === Number(dayNum));
      if (dayIdx < 0) dayIdx = Math.max(0, Math.min(days.length - 1, Number(dayNum) - 1));
      const body = $(`day-body-${dayIdx}`);
      if (body && body.classList.contains('hidden')) {
        T.PlanTimeline.toggleDay(dayIdx);
      }
      const target = $(`day-chevron-${dayIdx}`)?.closest('.timeline-day') || body;
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  }

  function groupDaysIntoStations(days) {
    const stations = [];
    let current = null;
    days.forEach(d => {
      const cityClean = String(d.city || firstWord(d.title) || `Day ${d.dayNum}`).trim();
      const visible = activeSpots(d.spots);
      if (!current || current.cityName !== cityClean) {
        if (current) stations.push(current);
        current = {
          cityName: cityClean, startDay: d.dayNum, endDay: d.dayNum, spots: visible.slice(),
          transitMode: 'land', country: '', flag: '🌎', landmark: (visible[0] && visible[0].title) || d.title || '', landmarkEmoji: '📍'
        };
      } else {
        current.endDay = d.dayNum;
        current.spots = current.spots.concat(visible);
      }
      const corpus = `${d.title || ''} ${(d.spots || []).map(s => `${s.title || ''} ${s.desc || ''}`).join(' ')}`.toLowerCase();
      if (['항공', '비행기', '공항', 'flight', '탑승'].some(w => corpus.includes(w))) current.transitMode = 'flight';
    });
    if (current) stations.push(current);
    return stations;
  }

  function enrichStation(st, dests) {
    let matched = null;
    Object.keys(dests).forEach(k => {
      if (dests[k]?.name && (dests[k].name.includes(st.cityName) || st.cityName.includes(dests[k].name))) matched = dests[k];
    });
    if (matched) {
      st.flag = matched.flag || '🌎';
      st.country = matched.country || '';
      if (matched.highlights?.length) st.landmark = matched.highlights[0];
    }
    const cn = st.cityName;
    if (cn.includes('이과수')) {
      st.landmarkEmoji = '🌊';
      st.flag = cn.includes('브라질') ? '🇧🇷' : '🇦🇷';
      st.country = cn.includes('브라질') ? '브라질' : '아르헨티나';
      if (!st.landmark) st.landmark = '악마의 목구멍 대폭포';
    } else {
      const preset = STATION_PRESETS.find(([keys]) => keys.some(k => cn.includes(k)));
      if (preset) {
        st.landmarkEmoji = preset[1];
        st.flag = preset[2];
        st.country = preset[3];
        if (!st.landmark) st.landmark = preset[4];
      }
    }
    if (!st.landmark && st.spots.length > 0) {
      st.landmark = st.spots[0].title || '';
      if (st.spots[0].typeIcon) st.landmarkEmoji = st.spots[0].typeIcon;
    }
  }

  function renderGlobal(allTrips, country) {
    if (!allTrips || allTrips.length === 0) {
      allTrips = (State.trips && State.trips.length > 0) ? State.trips : [getActiveTrip()].filter(Boolean);
    }
    if (!allTrips || allTrips.length === 0) return;

    const activeFocus = country === undefined ? focusCountry : (country || null);
    focusCountry = activeFocus;

    const titleEl = $('modal-route-map-title');
    const subEl = $('modal-route-map-subtitle');
    const metroContainer = $('routemap-view-metro');
    const iconEl = $('modal-route-map-icon');

    const allCountries = new Set();
    const allCities = new Set();
    let totalDays = 0;
    allTrips.forEach(t => {
      (t.countries || []).forEach(c => allCountries.add(c));
      (t.cities || []).forEach(c => allCities.add(c));
      totalDays += (t.durationDays || (t.days ? t.days.length : 0) || 0);
    });

    const displayTrips = [...allTrips];
    if (activeFocus) {
      const needle = activeFocus.toLowerCase();
      displayTrips.sort((a, b) => {
        const aMatch = (a.countries || []).some(c => String(c).toLowerCase().includes(needle));
        const bMatch = (b.countries || []).some(c => String(c).toLowerCase().includes(needle));
        return aMatch === bMatch ? 0 : (aMatch ? -1 : 1);
      });
    }

    if (titleEl) titleEl.textContent = activeFocus ? `[${activeFocus}] 발자취 및 비행 궤적 노선도` : '나의 평생 세계 및 대종단 비행 궤적 통합 노선도';
    if (subEl) subEl.textContent = `총 ${allTrips.length}개 여정 · ${allCountries.size}개국 · ${allCities.size}개 거점 · ${totalDays}일간의 대종단 궤적`;
    if (iconEl) iconEl.className = 'fa-solid fa-earth-americas';
    if (!metroContainer) return;

    const focusBannerHtml = activeFocus ? `
      <div class="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-xs font-bold text-[#a2601b] dark:text-amber-300 flex items-center justify-between gap-2 shadow-sm">
        <span class="flex items-center gap-1.5"><i class="fa-solid fa-location-dot text-amber-600" aria-hidden="true"></i> [${escapeHtml(activeFocus)}] 관련 여정 및 거점이 하이라이트되었습니다.</span>
        <button type="button" data-on-click="routeMap.resetFocus" class="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-[11px] font-extrabold cursor-pointer transition shrink-0">전체 보기</button>
      </div>` : '';

    const tripsHtml = displayTrips.map((trip, tIdx) => {
      const isSA = isSouthAmericaTrip(trip), isYN = isYunnanTrip(trip);
      const flag = (trip.countries && trip.countries.length > 0) ? (isYN ? '🇨🇳' : (isSA ? '🌎' : '✈️')) : (trip.coverEmoji || '✈️');
      const isCountryMatch = activeFocus && (trip.countries || []).some(c => String(c).toLowerCase().includes(activeFocus.toLowerCase()));
      const cardBorder = isCountryMatch ? 'border-2 border-amber-500 ring-2 ring-amber-500/20 shadow-md' : 'border border-[#e8e2d5] dark:border-stone-800 shadow-sm';
      const durationNum = Number(trip.durationDays || (trip.days ? trip.days.length : 0) || 0);
      const countriesLabel = (trip.countries && trip.countries.length > 0) ? trip.countries.join(' ⇄ ') : '맞춤 여행';

      let cardsHtml = '';
      if (trip.days && trip.days.length > 0) {
        const stations = groupDaysIntoStations(trip.days);
        cardsHtml = stations.map((st, sIdx) => {
          const dayText = st.startDay === st.endDay ? `Day ${Number(st.startDay)}` : `Day ${Number(st.startDay)}~${Number(st.endDay)}`;
          return `
            <div class="p-3 rounded-xl bg-stone-50 dark:bg-[#0c0e14] border border-[#e8e2d5] dark:border-stone-800 hover:border-amber-500/50 transition-all flex flex-col justify-between space-y-2">
              <div>
                <div class="flex items-center justify-between gap-1.5">
                  <div class="flex items-center gap-1.5 min-w-0">
                    <span class="w-5 h-5 rounded-md bg-amber-500/20 text-amber-900 dark:text-amber-300 flex items-center justify-center text-[10px] font-black shrink-0">${sIdx + 1}</span>
                    <h5 class="text-xs font-black text-[#1c1917] dark:text-white truncate">${escapeHtml(st.cityName)}</h5>
                  </div>
                  <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 shrink-0">${escapeHtml(dayText)}</span>
                </div>
                <div class="text-[11px] text-stone-600 dark:text-stone-300 font-medium mt-1.5 flex items-start gap-1">
                  <span class="text-amber-600 dark:text-amber-400 font-bold shrink-0">🎯</span>
                  <span class="line-clamp-2">${escapeHtml(st.landmark || '랜드마크 및 명소 탐방')}</span>
                </div>
              </div>
              <div class="pt-1 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2">
                <button type="button" data-on-click="routeMap.jumpDay" data-day="${Number(st.startDay)}" data-trip="${escapeHtml(trip.id)}" class="flex-1 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-[#a2601b] dark:text-[#d4af37] text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer">
                  <i class="fa-regular fa-calendar-check text-[9px]" aria-hidden="true"></i> 일정보기
                </button>
                <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${st.cityName} ${st.landmark || ''}`.trim())}" target="_blank" rel="noopener noreferrer" class="px-2 py-1 rounded bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 text-stone-700 dark:text-stone-300 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer">
                  <i class="fa-solid fa-location-dot text-[9px]" aria-hidden="true"></i> 지도
                </a>
              </div>
            </div>`;
        }).join('');
      } else {
        cardsHtml = (trip.cities || []).map((c, cIdx) => `
          <div class="p-3 rounded-xl bg-stone-50 dark:bg-[#0c0e14] border border-[#e8e2d5] dark:border-stone-800 flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="w-5 h-5 rounded-md bg-amber-500/20 text-amber-900 dark:text-amber-300 flex items-center justify-center text-[10px] font-black shrink-0">${cIdx + 1}</span>
              <span class="text-xs font-black text-[#1c1917] dark:text-white truncate">${escapeHtml(c)}</span>
            </div>
            <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c} ${trip.title || ''}`.trim())}" target="_blank" rel="noopener noreferrer" class="px-2 py-1 rounded bg-stone-200 dark:bg-stone-800 text-[10px] font-bold shrink-0">지도</a>
          </div>`).join('');
      }

      const nextTrip = displayTrips[tIdx + 1];
      const connectorHtml = nextTrip ? `
        <div class="flex flex-col items-center justify-center py-1">
          <div class="w-0.5 h-3 border-l-2 border-dashed border-sky-400 dark:border-sky-700"></div>
          <div class="px-3 py-1 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-900 dark:text-sky-300 border border-sky-300 dark:border-sky-800 text-[10px] font-black shadow-sm flex items-center gap-1.5 my-1">
            <span>✈️</span>
            <span>[${escapeHtml(firstWord(trip.title) || '여정')}] ➔ [${escapeHtml(firstWord(nextTrip.title) || '여정')}] 대륙 간 비행로 연결 (Global Flight Track)</span>
          </div>
          <div class="w-0.5 h-3 border-l-2 border-dashed border-sky-400 dark:border-sky-700"></div>
        </div>` : '';

      return `
        <div class="p-4 rounded-2xl bg-white dark:bg-[#151922] ${escapeHtml(cardBorder)} space-y-3">
          <div class="flex items-center justify-between gap-2 border-b border-stone-200 dark:border-stone-800 pb-2.5">
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="text-2xl shrink-0">${escapeHtml(flag)}</span>
              <div class="min-w-0">
                <h4 class="text-xs sm:text-sm font-black text-[#1c1917] dark:text-white flex items-center gap-1.5 flex-wrap">
                  <span class="truncate">${escapeHtml(trip.title || '여정')}</span>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 shrink-0">${durationNum}일정</span>
                </h4>
                <div class="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5 truncate">${escapeHtml(countriesLabel)}</div>
              </div>
            </div>
            <button type="button" data-on-click="routeMap.openTrip" data-trip="${escapeHtml(trip.id)}" class="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-[#a2601b] dark:text-[#d4af37] text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0">
              <span>이 여정 열기</span>
              <i class="fa-solid fa-arrow-right text-[10px]" aria-hidden="true"></i>
            </button>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">${cardsHtml}</div>
        </div>
        ${connectorHtml}`;
    }).join('');

    metroContainer.innerHTML = `
      ${focusBannerHtml}
      <div class="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-sky-500/10 dark:from-amber-950/30 dark:via-emerald-950/30 dark:to-sky-950/30 border border-amber-500/30 dark:border-amber-700/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
        <div class="flex items-center gap-3">
          <span class="text-2xl">🗺️</span>
          <div>
            <div class="text-xs sm:text-sm font-black text-[#1c1917] dark:text-white">
              평생 누적 발자취: 총 ${Number(allTrips.length)}개 대장정 · ${Number(allCountries.size)}개국 · ${Number(allCities.size)}개 거점
            </div>
            <div class="text-[11px] text-[#78716c] dark:text-stone-300 mt-0.5">
              등록된 모든 여행의 궤적을 확인하세요. 거점 카드를 누르면 해당 여정으로 즉시 전환됩니다.
            </div>
          </div>
        </div>
        <button type="button" data-on-click="routeMap.switchTab" data-tab="satellite" class="px-3 py-1.5 rounded-xl btn-gold text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-sm cursor-pointer">
          <i class="fa-solid fa-satellite text-xs" aria-hidden="true"></i>
          <span>전 세계 위성 궤적 보기</span>
        </button>
      </div>
      <div class="space-y-6 pt-2">${tripsHtml}</div>`;
  }

  function renderSingle(trip) {
    if (isGlobalAllTrips) {
      renderGlobal(State.trips, focusCountry);
      return;
    }
    const active = trip || getActiveTrip();
    if (!active) return;

    const titleEl = $('modal-route-map-title');
    const subEl = $('modal-route-map-subtitle');
    const metroContainer = $('routemap-view-metro');
    const linksContainer = $('modal-route-map-links');
    const iconEl = $('modal-route-map-icon');

    const days = active.days || [];
    const durationNum = Number(active.durationDays || days.length || 0);
    if (titleEl) titleEl.textContent = `${active.title || active.name || '여행'} 비행 궤적 & 관광 일러스트 노선도`;
    if (subEl) {
      const countryList = (active.countries && active.countries.length > 0) ? active.countries.join(' ⇄ ') : '여행 거점 동선';
      subEl.textContent = `${durationNum}일간의 여정 · ${countryList}`;
    }

    const isSA = isSouthAmericaTrip(active), isYN = isYunnanTrip(active);
    if (iconEl) iconEl.className = isYN ? 'fa-solid fa-earth-asia' : (isSA ? 'fa-solid fa-earth-americas' : 'fa-solid fa-map-location-dot');

    let stations = [];
    if (days.length > 0) {
      stations = groupDaysIntoStations(days);
      stations.forEach(st => { st.landmark = ''; });
    } else {
      const cities = (active.cities && active.cities.length) ? active.cities : ['출발지', '도착지'];
      stations = cities.map((c, idx) => ({
        cityName: String(c), startDay: idx + 1, endDay: idx + 1, spots: [],
        transitMode: (idx === 0 || idx === cities.length - 2) ? 'flight' : 'land',
        country: '', flag: '🌎', landmark: `${c} 중심가`, landmarkEmoji: '📍'
      }));
    }

    const dests = (root.KB_TRAVEL && root.KB_TRAVEL.destinations) ? root.KB_TRAVEL.destinations : {};
    stations.forEach(st => enrichStation(st, dests));

    const countryGroups = [];
    stations.forEach((st, idx) => {
      const countryKey = st.country || st.flag || '여정 구간';
      let grp = countryGroups.find(g => g.name === countryKey);
      if (!grp) {
        grp = { name: countryKey, flag: st.flag, stations: [] };
        countryGroups.push(grp);
      }
      grp.stations.push({ ...st, globalIdx: idx });
    });

    if (metroContainer) {
      const groupsHtml = countryGroups.map((grp, grpIdx) => {
        const isFirst = grpIdx === 0, isLast = grpIdx === countryGroups.length - 1;
        const stationCardsHtml = grp.stations.map(st => {
          const dayText = st.startDay === st.endDay ? `Day ${Number(st.startDay)}` : `Day ${Number(st.startDay)}~${Number(st.endDay)}`;
          return `
            <div class="p-3 rounded-xl bg-stone-50 dark:bg-[#0c0e14] border border-[#e8e2d5] dark:border-stone-800 hover:border-amber-500/50 transition-all flex flex-col justify-between space-y-2">
              <div>
                <div class="flex items-center justify-between gap-1.5">
                  <div class="flex items-center gap-1.5 min-w-0">
                    <span class="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-900 dark:text-amber-300 flex items-center justify-center text-xs font-bold shrink-0">${escapeHtml(st.landmarkEmoji)}</span>
                    <h5 class="text-xs font-black text-[#1c1917] dark:text-white truncate">${escapeHtml(st.cityName)}</h5>
                  </div>
                  <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 shrink-0">${escapeHtml(dayText)}</span>
                </div>
                <div class="text-[11px] text-stone-600 dark:text-stone-300 font-medium mt-1.5 flex items-start gap-1">
                  <span class="text-amber-600 dark:text-amber-400 font-bold shrink-0">🎯</span>
                  <span class="line-clamp-2">${escapeHtml(st.landmark || '랜드마크 및 미식 탐방')}</span>
                </div>
              </div>
              <div class="pt-1 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2">
                <button type="button" data-on-click="routeMap.jumpDay" data-day="${Number(st.startDay)}" data-trip="${escapeHtml(active.id)}" class="flex-1 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-[#a2601b] dark:text-[#d4af37] text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer">
                  <i class="fa-regular fa-calendar-check text-[9px]" aria-hidden="true"></i> 일정보기
                </button>
                <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${st.cityName} ${st.landmark || ''}`.trim())}" target="_blank" rel="noopener noreferrer" class="px-2 py-1 rounded bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 text-stone-700 dark:text-stone-300 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer">
                  <i class="fa-solid fa-location-dot text-[9px]" aria-hidden="true"></i> 지도
                </a>
              </div>
            </div>`;
        }).join('');

        let connectorHtml = '';
        if (!isLast) {
          const nextGrp = countryGroups[grpIdx + 1];
          const isFlight = ['미국', '페루', '아르헨티나', '중국'].some(n => grp.name.includes(n));
          const borderStyle = isFlight ? 'border-dashed border-sky-400 dark:border-sky-700' : 'border-solid border-amber-400 dark:border-amber-700';
          const badgeStyle = isFlight ? 'bg-sky-100 dark:bg-sky-950 text-sky-900 dark:text-sky-300 border-sky-300 dark:border-sky-800' : 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800';
          connectorHtml = `
            <div class="flex flex-col items-center justify-center py-1">
              <div class="w-0.5 h-3 border-l-2 ${escapeHtml(borderStyle)}"></div>
              <div class="px-3 py-1 rounded-full ${escapeHtml(badgeStyle)} border text-[10px] font-black shadow-sm flex items-center gap-1.5 my-1">
                <span>${isFlight ? '✈️' : '🚌'}</span>
                <span>${escapeHtml(grp.name)} ➔ ${escapeHtml(nextGrp ? nextGrp.name : '다음 목적지')} ${isFlight ? '항공 이동 (국제선/국내선 비행 궤적)' : '육로/국경 이동 (우등버스 / 열차 트랙)'}</span>
              </div>
              <div class="w-0.5 h-3 border-l-2 ${escapeHtml(borderStyle)}"></div>
            </div>`;
        }

        return `
          <div class="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#151922] border border-[#e8e2d5] dark:border-stone-800 shadow-sm space-y-3">
            <div class="flex items-center justify-between gap-2 border-b border-stone-200 dark:border-stone-800 pb-2">
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-2xl shrink-0">${escapeHtml(grp.flag)}</span>
                <h4 class="text-xs sm:text-sm font-black text-[#1c1917] dark:text-white flex items-center gap-1.5 flex-wrap">
                  <span>${escapeHtml(grp.name)}</span>
                  <span class="text-[10px] font-bold px-2 py-0.2 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">${Number(grp.stations.length)}개 거점</span>
                </h4>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                ${isFirst ? '<span class="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300">🛫 여행 출발 (IN)</span>' : ''}
                ${isLast ? '<span class="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300">🛬 귀국 (OUT)</span>' : ''}
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">${stationCardsHtml}</div>
          </div>
          ${connectorHtml}`;
      }).join('');

      metroContainer.innerHTML = `
        <div class="p-3 sm:p-4 rounded-xl bg-[#faf8f5] dark:bg-stone-900 border border-[#e8e2d5] dark:border-stone-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-sm">
          <div class="flex items-center gap-2">
            <span class="text-xl">🗺️</span>
            <div>
              <div class="text-xs font-black text-[#1c1917] dark:text-white">
                총 ${Number(countryGroups.length)}개국 · ${Number(stations.length)}개 거점 정거장 · ${durationNum}일간의 대장정
              </div>
              <div class="text-[10px] text-[#78716c] dark:text-stone-400">
                각 거점을 탭하면 구글 지도 길찾기 또는 상세 일정으로 즉시 이동합니다.
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2 text-[10px] shrink-0 font-bold">
            <span class="px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950/60 text-sky-900 dark:text-sky-300 border border-sky-300 dark:border-sky-800 flex items-center gap-1">
              <i class="fa-solid fa-plane text-[9px]" aria-hidden="true"></i> 항공 이동 (하늘길)
            </span>
            <span class="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
              <i class="fa-solid fa-bus text-[9px]" aria-hidden="true"></i> 육로/열차 (대지길)
            </span>
          </div>
        </div>
        <div class="space-y-4 pt-1">${groupsHtml}</div>`;
    }

    if (linksContainer) {
      const quickLinks = [];
      stations.forEach(st => {
        if (st.landmark && !quickLinks.some(q => q.landmark === st.landmark)) {
          quickLinks.push({
            landmark: st.landmark,
            title: `${st.cityName} ${firstWord(st.landmark)}`.trim(),
            query: `${st.cityName} ${st.landmark}`.trim(),
            flag: st.flag
          });
        }
      });
      if (quickLinks.length > 0) {
        const itemsHtml = quickLinks.slice(0, 8).map(q => `
          <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q.query)}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1 rounded-lg bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 border border-[#e8e2d5] dark:border-stone-700 text-[#1c1917] dark:text-stone-200 font-semibold shrink-0 transition flex items-center gap-1 text-[11px]">
            <span>${escapeHtml(q.flag)}</span>
            <span>${escapeHtml(q.title)}</span>
          </a>`).join('');
        linksContainer.innerHTML = `<span class="font-bold text-[#78716c] dark:text-stone-400 shrink-0 text-[11px]">📍 구글 지도 바로가기:</span>${itemsHtml}`;
      } else {
        linksContainer.innerHTML = '';
      }
    }
  }

  function switchTab(tab) {
    currentTab = tab === 'satellite' ? 'satellite' : 'metro';
    const btnMetro = $('btn-routemap-tab-metro');
    const btnSatellite = $('btn-routemap-tab-satellite');
    const viewMetro = $('routemap-view-metro');
    const viewSatellite = $('routemap-view-satellite');

    const activeBtn = 'px-2.5 sm:px-3 py-1.5 rounded-lg transition-all shadow-sm bg-white dark:bg-stone-800 text-[#a2601b] dark:text-[#d4af37] flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer';
    const inactiveBtn = 'px-2.5 sm:px-3 py-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-200 transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer';

    if (btnMetro) { btnMetro.className = currentTab === 'metro' ? activeBtn : inactiveBtn; btnMetro.setAttribute('aria-pressed', String(currentTab === 'metro')); }
    if (btnSatellite) { btnSatellite.className = currentTab === 'satellite' ? activeBtn : inactiveBtn; btnSatellite.setAttribute('aria-pressed', String(currentTab === 'satellite')); }
    if (viewMetro) viewMetro.classList.toggle('hidden', currentTab !== 'metro');
    if (viewSatellite) viewSatellite.classList.toggle('hidden', currentTab !== 'satellite');

    if (currentTab === 'satellite') {
      setTimeout(() => {
        if (isGlobalAllTrips) renderLeaflet(null, true);
        else renderLeaflet(getActiveTrip(), false);
        if (leafletInstance) leafletInstance.invalidateSize();
      }, 80);
      setTimeout(() => { if (leafletInstance) leafletInstance.invalidateSize(); }, 300);
    } else if (isGlobalAllTrips) {
      renderGlobal(State.trips, focusCountry);
    }
  }

  function open(trip) {
    isGlobalAllTrips = false;
    focusCountry = null;
    callerModal = null;
    updateCallerBtn();
    renderSingle(trip || getActiveTrip());
    openingViaApi = true;
    try { openModal('modal-route-map'); } finally { openingViaApi = false; }
    switchTab('metro');
  }

  function openGlobal(country, fromModal) {
    isGlobalAllTrips = true;
    focusCountry = country || null;
    callerModal = fromModal || null;
    updateCallerBtn();
    const allTrips = (State.trips && State.trips.length > 0) ? State.trips : [getActiveTrip()].filter(Boolean);
    renderGlobal(allTrips, focusCountry);
    openingViaApi = true;
    try { openModal('modal-route-map'); } finally { openingViaApi = false; }
    switchTab(focusCountry ? 'metro' : 'satellite');
  }

  function focusCountryFromAnalytics(countryName) {
    closeModal('modal-analytics', true);
    openGlobal(countryName, 'modal-analytics');
    showToast(`🗺️ ${countryName} 발자취 노선도를 확인합니다.`);
  }

  function backToCaller() {
    const returnTo = callerModal || 'modal-analytics';
    callerModal = null;
    updateCallerBtn();
    closeModal('modal-route-map', true);
    openModal(returnTo);
  }

  function resetFocusCountry() {
    focusCountry = null;
    renderGlobal(State.trips, null);
  }

  function onModalOpened() {
    if (openingViaApi) return;
    renderSingle(getActiveTrip());
  }

  function onModalClosed() {
    if (!callerModal) return;
    const returnTo = callerModal;
    callerModal = null;
    updateCallerBtn();
    setTimeout(() => openModal(returnTo), 60);
  }

  const api = Object.freeze({
    CITY_GEO_COORDS,
    getTripGeoData,
    open,
    openGlobal,
    focusCountryFromAnalytics,
    switchTab,
    renderSingle,
    renderGlobal,
    resetFocusCountry,
    renderLeaflet,
    zoomGlobal,
    selectTrip,
    jumpToDay,
    backToCaller,
    onModalOpened,
    onModalClosed,
    state: () => ({ isGlobalAllTrips, focusCountry, currentTab, callerModal })
  });
  T.RouteMap = api;

  T.UiActions.define('routeMap', {
    openFromSettings: () => { closeModal('modal-settings', true); api.open(); },
    openGlobalFromAnalytics: () => { closeModal('modal-analytics', true); api.openGlobal(null, 'modal-analytics'); },
    focusCountry: element => api.focusCountryFromAnalytics(element.dataset.country || ''),
    switchTab: element => api.switchTab(element.dataset.tab || 'metro'),
    backToCaller: () => api.backToCaller(),
    resetFocus: () => api.resetFocusCountry(),
    zoomGlobal: element => api.zoomGlobal(element.dataset.trip || 'all'),
    openTrip: element => api.selectTrip(element.dataset.trip || null, element.dataset.city || null),
    jumpDay: element => api.jumpToDay(Number(element.dataset.day), element.dataset.trip || null)
  });
})(typeof window !== 'undefined' ? window : globalThis);
