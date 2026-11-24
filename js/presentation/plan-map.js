/* 계획 탭의 인터랙티브 지도(Leaflet) (v2.1.6, 계획 4단계 네 번째 화면 분리의 3차).
 * index.html 인라인 스크립트의 [2] Leaflet 인터랙티브 지도 엔진(getSafeGoogleMapsQuery·initOrUpdateLeafletMap·focusCityOnMap·resetMapToWorldView)과
 * 워크스페이스 전체 여행 궤적 보기(toggleAllTripsOnWorkspaceMap·renderAllTripsOnWorkspaceMap)를 옮겼다.
 * 셸 함수(getActiveTrip·resolveTripPack·isYunnanTrip·isSouthAmericaTrip·getTripGeoData·escapeHtml)와 전역 State·L·KB_TRAVEL은 부를 때 찾는다.
 * 여행 자료 값(도시명·제목·이모지·하이라이트·고도)은 모두 escapeHtml 또는 textContent로 넣는다.
 * 전체 여행 궤적 토글 상태(allTripsActive)는 모듈 안에 두고, 일반 지도 갱신 시 extraPolylines와 버튼 상태를 함께 초기화한다.
 * 동작은 data-on-click="planMap.*"로 잇는다. 불러올 때는 등록만 하고 문서를 건드리지 않는다. */
(function (root) {
  'use strict';
  const T = root.SulsulTravel = root.SulsulTravel || {};
  const $ = id => document.getElementById(id);

  let allTripsActive = false;

  const TRIP_PALETTES = [
    { stroke: '#f59e0b', fill: '#f59e0b', border: '#fbbf24' },
    { stroke: '#10b981', fill: '#10b981', border: '#34d399' },
    { stroke: '#0284c7', fill: '#0284c7', border: '#38bdf8' },
    { stroke: '#f43f5e', fill: '#f43f5e', border: '#fb7185' },
    { stroke: '#8b5cf6', fill: '#8b5cf6', border: '#a78bfa' }
  ];

  const ALL_TRIPS_BTN_ON = 'px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-sm';
  const ALL_TRIPS_BTN_OFF = 'px-2.5 py-1 bg-[#141c2e] hover:bg-[#1a263e] border border-[#23304c] text-amber-400 hover:text-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition';

  function packDestinations(pack) {
    const raw = pack && pack.geo && pack.geo.destinations;
    if (!raw) return [];
    return Array.isArray(raw) ? raw : Object.values(raw);
  }

  function hasValidCoord(d) {
    return Boolean(d && typeof d.lat === 'number' && typeof d.lng === 'number' && Number.isFinite(d.lat) && Number.isFinite(d.lng) && !(d.lat === 20.0 && d.lng === 0.0));
  }

  function getSafeGoogleMapsQuery(dest, trip) {
    if (dest && dest.googleMapsQuery) return dest.googleMapsQuery;
    const cName = (dest && (dest.nameKo || dest.name)) || (trip && trip.cities && trip.cities[0]) || (trip && trip.title) || '';
    const country = (dest && dest.country) || (trip && trip.countries && trip.countries[0]) || '';
    if (country && cName && !cName.includes(country)) {
      return `${cName}, ${country}`;
    }
    return cName;
  }

  function syncAllTripsButton() {
    const btn = $('btn-toggle-all-trips-map');
    const label = $('btn-toggle-all-trips-label');
    if (btn) {
      btn.className = allTripsActive ? ALL_TRIPS_BTN_ON : ALL_TRIPS_BTN_OFF;
      btn.setAttribute('aria-pressed', allTripsActive ? 'true' : 'false');
    }
    if (label) {
      label.textContent = allTripsActive ? '🎯 현재 여정만 보기' : '🌐 전체 여행 궤적';
    }
  }

  function clearLayers() {
    if (!State.map) return;
    if (Array.isArray(State.mapMarkers)) {
      State.mapMarkers.forEach(m => State.map.removeLayer(m));
    }
    State.mapMarkers = [];
    if (State.mapPolyline) {
      State.map.removeLayer(State.mapPolyline);
      State.mapPolyline = null;
    }
    if (Array.isArray(State.extraPolylines)) {
      State.extraPolylines.forEach(p => State.map.removeLayer(p));
    }
    State.extraPolylines = [];
  }

  function pillButtonHtml(dest, fallbackFlag, tripId) {
    const label = dest.nameKo || (dest.name ? String(dest.name).split(' ')[0] : dest.id);
    const flag = dest.flag || fallbackFlag || '📍';
    const tripAttrHtml = tripId ? ` data-trip="${escapeHtml(tripId)}"` : '';
    return `<button type="button" data-on-click="planMap.focusCity" data-city="${escapeHtml(dest.id)}"${tripAttrHtml} class="px-2.5 py-1 rounded-lg bg-[#141c2e] hover:bg-[#1e2a44] border border-[#23304c] text-slate-200 font-bold shrink-0 cursor-pointer">${escapeHtml(flag)} ${escapeHtml(label)}</button>`;
  }

  function staticPillHtml(flag, name) {
    return `<span class="px-2.5 py-1 rounded-lg bg-[#141c2e] border border-[#23304c] text-slate-200 font-bold shrink-0">${escapeHtml(flag || '📍')} ${escapeHtml(name)}</span>`;
  }

  function markerPopupHtml(title, subtitle, query) {
    return `
      <div class="text-xs p-1">
        <div class="font-black text-amber-400 text-sm">${escapeHtml(title)}</div>
        <div class="text-slate-300 text-[11px] mt-0.5">${escapeHtml(subtitle || '')}</div>
        <div class="mt-2 flex items-center gap-1">
          <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}" target="_blank" rel="noopener noreferrer" class="sulsul-badge-sky px-2 py-1 bg-sky-100 hover:bg-sky-200 border border-sky-300 text-sky-800 dark:bg-sky-950/50 dark:hover:bg-sky-900/50 dark:border-sky-800 dark:text-sky-300 rounded text-[10px] font-bold">구글 지도 길찾기</a>
        </div>
      </div>
    `;
  }

  function updateCityCard(dest, pack, trip) {
    const flagEl = $('map-city-flag');
    const nameEl = $('map-city-name');
    const altEl = $('map-city-altitude');
    const currEl = $('map-city-currency');
    const spotsList = $('map-city-spots');
    const foodsList = $('map-city-foods');
    const tipsEl = $('map-city-tips');
    const gmapBtn = $('btn-google-maps-link');

    if (flagEl) flagEl.textContent = dest.flag || (pack && pack.flag) || (trip && trip.coverEmoji) || '📍';
    if (nameEl) nameEl.textContent = dest.name || dest.nameKo || '';
    if (altEl) altEl.textContent = dest.altitude || dest.badge || '';
    if (currEl) {
      const currency = dest.currency || (pack && pack.currency) || (trip && trip.currency) || '';
      currEl.textContent = currency ? `통화: ${currency}` : '';
    }
    const highlights = Array.isArray(dest.highlights) ? dest.highlights : (dest.intro ? [dest.intro] : []);
    if (spotsList) {
      spotsList.innerHTML = highlights.map(h => `<li>• ${escapeHtml(h)}</li>`).join('');
    }
    const foodsStr = Array.isArray(dest.foods) ? dest.foods.join(', ') : (dest.food || dest.foods || '로컬 시그니처 미식 탐방');
    if (foodsList) foodsList.textContent = foodsStr;
    if (tipsEl) tipsEl.textContent = dest.tips || dest.caution || '안전 수칙을 준수하세요.';
    if (gmapBtn) {
      const safeQ = getSafeGoogleMapsQuery(dest, trip);
      gmapBtn.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(safeQ)}`;
    }
  }

  function findDestinationInPack(pack, cityKey) {
    if (!pack || !pack.geo || !pack.geo.destinations) return null;
    if (Array.isArray(pack.geo.destinations)) {
      return pack.geo.destinations.find(x => x && x.id === cityKey) || null;
    }
    if (typeof pack.geo.destinations === 'object') {
      return pack.geo.destinations[cityKey] || null;
    }
    return null;
  }

  function resolveCityTarget(cityKey, tripId) {
    const active = getActiveTrip();
    const allTrips = (State.trips && State.trips.length > 0) ? State.trips : [active].filter(Boolean);
    const candidates = [];
    if (tripId) {
      const exact = allTrips.find(t => t && t.id === tripId);
      if (exact) candidates.push(exact);
    }
    if (active && !candidates.includes(active)) candidates.push(active);
    if (allTripsActive || tripId) {
      allTrips.forEach(t => { if (t && !candidates.includes(t)) candidates.push(t); });
    }
    for (const trip of candidates) {
      const pack = resolveTripPack(trip);
      const dest = findDestinationInPack(pack, cityKey);
      if (dest) return { dest, pack, trip };
    }
    if (root.KB_TRAVEL && root.KB_TRAVEL.destinations && root.KB_TRAVEL.destinations[cityKey]) {
      const pack = resolveTripPack(active);
      return { dest: root.KB_TRAVEL.destinations[cityKey], pack, trip: active };
    }
    return null;
  }

  function render() {
    const mapContainer = $('leaflet-route-map');
    const trip = getActiveTrip();
    if (!mapContainer || !trip || typeof L === 'undefined') return;

    allTripsActive = false;
    syncAllTripsButton();

    const pack = resolveTripPack(trip);

    // 지도 뷰 헤더 타이틀 및 설명 동적 갱신
    const mapHFlag = $('map-view-header-flag');
    const mapHTitle = $('map-view-header-title');
    const mapHDesc = $('map-view-header-desc');
    if (mapHTitle) {
      if (isYunnanTrip(trip)) {
        if (mapHFlag) mapHFlag.textContent = '🇨🇳';
        mapHTitle.textContent = '중국 운남 13일 황금 코스 인터랙티브 궤적 & 거점 가이드';
        if (mapHDesc) mapHDesc.textContent = '쿤밍·석림·따리·리장·옥룡설산·호도협·샹그릴라 거점 핀을 터치하면 상세 가이드와 구글 지도 길찾기가 연동됩니다.';
      } else if (isSouthAmericaTrip(trip)) {
        if (mapHFlag) mapHFlag.textContent = '🌎';
        mapHTitle.textContent = '남미 4개국 22일 대종단 인터랙티브 궤적 & 도시 가이드';
        if (mapHDesc) mapHDesc.textContent = '도시 핀을 클릭하면 해당 도시로 카메라가 줌인되며 상세 지도와 구글 지도 연동이 활성화됩니다.';
      } else {
        if (mapHFlag) mapHFlag.textContent = (pack && pack.flag) || trip.coverEmoji || '🗺️';
        mapHTitle.textContent = `${trip.title || '여정'} 인터랙티브 궤적 & 거점 가이드`;
        if (mapHDesc) mapHDesc.textContent = '거점 핀을 클릭하면 해당 도시로 카메라가 줌인되며 상세 가이드가 활성화됩니다.';
      }
    }

    const centerCoord = (pack && pack.geo && pack.geo.centerCoord) ? pack.geo.centerCoord : [20.0, 0.0];
    const initialZoom = (pack && pack.geo && pack.geo.defaultZoom) ? pack.geo.defaultZoom : 2;

    if (!State.map) {
      State.map = L.map('leaflet-route-map', {
        zoomControl: true,
        attributionControl: false,
        scrollWheelZoom: false
      }).setView(centerCoord, initialZoom);

      // OpenStreetMap 표준 타일 레이어 (워터마크 없는 글로벌 고화질 타일)
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap'
      }).addTo(State.map);
    } else {
      State.map.setView(centerCoord, initialZoom);
    }

    // 기존 마커·폴리라인·전체 궤적 레이어 초기화
    clearLayers();

    const pillsContainer = $('map-quick-cities');
    const dests = packDestinations(pack);

    if (dests.length > 0) {
      if (pillsContainer) {
        pillsContainer.innerHTML = dests.map(d => pillButtonHtml(d, pack.flag, trip.id)).join('');
      }

      // 경로 폴리라인
      if (pack.geo.flightRoutes && pack.geo.flightRoutes.length > 0) {
        const polyColor = (pack.id && pack.id.includes('yunnan')) ? '#10b981' : '#f59e0b';
        State.mapPolyline = L.polyline(pack.geo.flightRoutes, {
          color: pack.geo.polylineColor || polyColor,
          weight: 3, opacity: 0.8, dashArray: '6, 8', smoothFactor: 1
        }).addTo(State.map);
      }

      // 마커 생성
      const isYunnan = Boolean(pack.id && pack.id.includes('yunnan'));
      const pinColor = isYunnan ? '#10b981' : '#f59e0b';
      const pinBorder = isYunnan ? '#34d399' : '#fbbf24';
      const validCoords = [];
      dests.forEach((d, idx) => {
        if (hasValidCoord(d)) {
          validCoords.push([d.lat, d.lng]);
          const gQuery = getSafeGoogleMapsQuery(d, trip);
          const iconHtml = `<div class="gold-marker-pin" style="background:${escapeHtml(pinColor)};border-color:${escapeHtml(pinBorder)};">${idx + 1}</div>`;
          const customIcon = L.divIcon({ html: iconHtml, className: 'custom-gold-pin', iconSize: [32, 32], iconAnchor: [16, 16] });
          const marker = L.marker([d.lat, d.lng], { icon: customIcon })
            .addTo(State.map)
            .bindPopup(markerPopupHtml(d.name || d.nameKo || '', d.altitude || d.badge || '', gQuery));
          marker.on('click', () => { focusCity(d.id, trip.id); });
          State.mapMarkers.push(marker);
        }
      });

      // 목적지 거점들이 한 화면에 모두 보이도록 자동 영역 맞춤 (fitBounds)
      if (validCoords.length > 1) {
        State.map.fitBounds(L.latLngBounds(validCoords), { padding: [40, 40], maxZoom: 12 });
      } else if (validCoords.length === 1) {
        State.map.setView(validCoords[0], dests[0].zoom || 11);
      } else {
        State.map.setView(centerCoord, initialZoom);
      }

      const initialFocus = pack.geo.initialFocusCity || dests[0].id;
      focusCity(initialFocus, trip.id);
    } else {
      if (pillsContainer) {
        const fallbackCities = (trip.cities && trip.cities.length) ? trip.cities : [trip.title || '여행 거점'];
        pillsContainer.innerHTML = fallbackCities.map(c => staticPillHtml('📍', c)).join('');
      }
      const flagEl = $('map-city-flag');
      const nameEl = $('map-city-name');
      const altEl = $('map-city-altitude');
      const currEl = $('map-city-currency');
      const spotsList = $('map-city-spots');
      const foodsList = $('map-city-foods');
      const tipsEl = $('map-city-tips');
      const gmapBtn = $('btn-google-maps-link');

      if (flagEl) flagEl.textContent = (pack && pack.flag) || trip.coverEmoji || '📍';
      if (nameEl) nameEl.textContent = (trip.cities && trip.cities[0]) || trip.title || '여행 거점';
      if (altEl) altEl.textContent = '맞춤 여정';
      if (currEl) currEl.textContent = (pack && pack.currency) ? `통화: ${pack.currency}` : (trip.currency ? `통화: ${trip.currency}` : '');
      if (spotsList) {
        const firstSpots = (trip.days && trip.days[0] && trip.days[0].spots) ? trip.days[0].spots : [];
        spotsList.innerHTML = firstSpots.length > 0 ? firstSpots.slice(0, 4).map(s => `<li>• ${escapeHtml(s.title)}</li>`).join('') : '<li>• 자유 일정 등록 중</li>';
      }
      if (foodsList) foodsList.textContent = '현지 로컬 미식 및 랜드마크 탐방';
      if (tipsEl) tipsEl.textContent = '현지 치안 및 필수 준비물을 사전에 점검하세요.';
      if (gmapBtn) {
        const fallbackQ = getSafeGoogleMapsQuery(null, trip);
        gmapBtn.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fallbackQ)}`;
      }
    }

    // 지도 리사이징 강제 갱신
    setTimeout(() => {
      if (State.map) State.map.invalidateSize();
    }, 200);
  }

  function focusCity(cityKey, tripId) {
    if (!cityKey) return;
    const resolved = resolveCityTarget(cityKey, tripId);
    if (!resolved) return;
    const { dest, pack, trip } = resolved;

    if (State.map && hasValidCoord(dest)) {
      State.map.flyTo([dest.lat, dest.lng], dest.zoom || 12, {
        animate: true,
        duration: 1.2
      });
    }
    updateCityCard(dest, pack, trip);
  }

  function resetView() {
    if (!State.map) return;
    if (allTripsActive) {
      const allTrips = (State.trips && State.trips.length > 0) ? State.trips : [getActiveTrip()].filter(Boolean);
      const allCoords = [];
      allTrips.forEach(t => {
        const geo = T.RouteMap.getTripGeoData(t);
        geo.latlngs.forEach(l => allCoords.push(l.latlng));
      });
      if (allCoords.length > 1) {
        State.map.flyToBounds(L.latLngBounds(allCoords), { padding: [50, 50], duration: 1.2, maxZoom: 6 });
        return;
      }
    }
    const trip = getActiveTrip();
    const pack = resolveTripPack(trip);
    const dests = packDestinations(pack);
    const validCoords = dests.filter(hasValidCoord).map(d => [d.lat, d.lng]);
    if (validCoords.length > 1) {
      State.map.flyToBounds(L.latLngBounds(validCoords), { padding: [40, 40], duration: 1.2, maxZoom: 12 });
      return;
    }
    const center = (pack && pack.geo && pack.geo.centerCoord) ? pack.geo.centerCoord : [20.0, 0.0];
    const zoom = (pack && pack.geo && pack.geo.defaultZoom) ? pack.geo.defaultZoom : 2;
    State.map.flyTo(center, zoom, { animate: true, duration: 1.2 });
  }

  function renderAllTrips() {
    if (!State.map || typeof L === 'undefined') return;
    clearLayers();

    const allTrips = (State.trips && State.trips.length > 0) ? State.trips : [getActiveTrip()].filter(Boolean);
    const allCoords = [];
    const pillsContainer = $('map-quick-cities');

    // 상단 퀵 버튼을 여행별 거점으로 재구성
    if (pillsContainer) {
      const pills = [];
      allTrips.forEach(trip => {
        const pack = resolveTripPack(trip);
        const flag = (pack && pack.flag) || trip.coverEmoji || '📍';
        const dests = packDestinations(pack);
        if (dests.length > 0) {
          dests.slice(0, 4).forEach(d => { pills.push(pillButtonHtml(d, flag, trip.id)); });
        } else {
          ((trip.cities && trip.cities.length) ? trip.cities : [trip.title || '여행 거점']).slice(0, 3).forEach(c => {
            pills.push(staticPillHtml(flag, c));
          });
        }
      });
      pillsContainer.innerHTML = pills.join('');
    }

    // 여행별 궤적 및 핀 렌더링
    allTrips.forEach((trip, tIdx) => {
      let palette = TRIP_PALETTES[tIdx % TRIP_PALETTES.length];
      if (isSouthAmericaTrip(trip)) palette = TRIP_PALETTES[0];
      else if (isYunnanTrip(trip)) palette = TRIP_PALETTES[1];

      const geo = T.RouteMap.getTripGeoData(trip);
      if (geo.latlngs.length > 0) {
        geo.latlngs.forEach(l => allCoords.push(l.latlng));

        if (geo.latlngs.length > 1) {
          const poly = L.polyline(geo.latlngs.map(l => l.latlng), {
            color: palette.stroke,
            weight: 3.5,
            dashArray: '6, 8',
            opacity: 0.88
          }).addTo(State.map);
          State.extraPolylines.push(poly);
        }

        geo.latlngs.forEach(l => {
          const iconHtml = `<div class="gold-marker-pin" style="background:${escapeHtml(palette.fill)};border-color:${escapeHtml(palette.border)};">${Number(l.idx)}</div>`;
          const customIcon = L.divIcon({ html: iconHtml, className: 'custom-gold-pin', iconSize: [32, 32], iconAnchor: [16, 16] });
          const popupTitle = `${trip.coverEmoji || '📍'} ${l.name}`;
          const popupSub = `${trip.title || ''} (정거장 #${Number(l.idx)})`;
          const marker = L.marker(l.latlng, { icon: customIcon })
            .addTo(State.map)
            .bindPopup(markerPopupHtml(popupTitle, popupSub, `${l.name} ${trip.title || ''}`.trim()));
          if (l.dest && l.dest.id) {
            marker.on('click', () => { focusCity(l.dest.id, trip.id); });
          }
          State.mapMarkers.push(marker);
        });
      }
    });

    // 지도 줌을 모든 여행을 포괄하도록 자동 조정
    if (allCoords.length > 1) {
      const bounds = L.latLngBounds(allCoords);
      State.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
    }

    // 헤더 설명 업데이트
    const mapHDesc = $('map-view-header-desc');
    if (mapHDesc) {
      mapHDesc.textContent = `총 ${allTrips.length}개 여정의 전 세계 비행 궤적 및 거점을 동시 표시 중입니다. (골드: 남미 / 에메랄드: 운남)`;
    }
  }

  function toggleAllTrips() {
    if (!State.map) return;
    allTripsActive = !allTripsActive;
    if (allTripsActive) {
      syncAllTripsButton();
      renderAllTrips();
    } else {
      render();
    }
  }

  const api = Object.freeze({
    getSafeGoogleMapsQuery,
    render,
    focusCity,
    resetView,
    toggleAllTrips,
    renderAllTrips,
    isAllTripsActive: () => allTripsActive
  });
  T.PlanMap = api;

  T.UiActions.define('planMap', {
    resetView: () => api.resetView(),
    toggleAllTrips: () => api.toggleAllTrips(),
    focusCity: element => api.focusCity(element.dataset.city, element.dataset.trip || null)
  });
})(typeof window !== 'undefined' ? window : globalThis);
