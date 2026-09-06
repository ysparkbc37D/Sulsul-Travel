/**
 * Sulsul-Travel Default Generic Destination Pack (pack-default.js)
 * Automatically adapts to any custom or international trip without hardcoded data.
 */
(function() {
  'use strict';

  const DefaultDestinationPack = {
    id: 'pack_generic_default',
    name: '전 세계 범용 여행 팩',

    createDynamicPack(trip) {
      const tripTitle = trip ? trip.title : '자유 여행';
      const countries = (trip && trip.countries && trip.countries.length > 0) ? trip.countries : ['자유 여행지'];
      const cities = (trip && trip.cities && trip.cities.length > 0) ? trip.cities : [];
      const currency = (trip && trip.currency) ? trip.currency : 'KRW';

      // 1. Extract spots from trip days if available
      const spots = [];
      if (trip && Array.isArray(trip.days)) {
        trip.days.forEach(day => {
          (day.spots || []).forEach(s => {
            if (s.title && s.title !== '새 일정') {
              spots.push({
                id: 'spot_' + Math.random().toString(36).substr(2, 9),
                name: s.title,
                city: day.city || cities[0] || '현지',
                lat: s.lat || 37.5665,
                lng: s.lng || 126.9780,
                cat: s.cat || 'tour',
                icon: s.typeIcon || '📍',
                desc: s.desc || '',
                tip: s.tip || ''
              });
            }
          });
        });
      }

      // 2. Generate GPS presets
      const simPresets = [];
      if (cities.length > 0) {
        cities.forEach((c, idx) => {
          simPresets.push({
            id: `city_${idx}`,
            name: `📍 ${c} 중심부`,
            lat: 37.5665 + (idx * 0.05),
            lng: 126.9780 + (idx * 0.05),
            tip: `${c} 주요 여행 동선 거점`
          });
        });
      } else {
        simPresets.push({
          id: 'preset_default',
          name: '📍 현지 중심지 모의 위치',
          lat: 37.5665,
          lng: 126.9780,
          tip: '위치를 탐색하거나 모의 위치를 선택하세요'
        });
      }

      // 3. Generate City guides from trip cities or days
      const cityGuides = [];
      if (cities.length > 0) {
        cities.forEach(c => {
          cityGuides.push({
            id: 'city_' + c,
            name: c,
            badge: '방문 도시',
            title: `${c} 핵심 일정 요약`,
            desc: `${c}에서 예정된 일정을 확인하고 현지 랜드마크를 탐방해 보세요.`,
            highlights: ['주요 명소 방문', '현지 로컬 맛집 탐방'],
            food: '현지 로컬 시그니처 미식',
            caution: '소매치기 주의 및 여권/귀중품 안전 보관'
          });
        });
      }

      return {
        id: 'dynamic_' + (trip ? trip.id : 'unknown'),
        name: tripTitle,
        country: countries.join(', '),
        flag: '✈️',
        currency: currency,
        match: () => true, // Fallback for all
        geo: {
          centerCoord: [20.0, 0.0],
          defaultZoom: 2,
          simPresets: simPresets,
          knownSpots: spots,
          destinations: cities.map(c => ({ id: c, name: c, nameKo: c, lat: 20.0, lng: 0.0, badge: '도시', intro: c })),
          flightRoutes: []
        },
        bookings: {
          subtabTitle: '여행 필수 체크/예약',
          subtabIcon: 'fa-clipboard-check',
          headerTitle: `${tripTitle} 필수 준비 & 예약 체크리스트`,
          headerDesc: '항공권, 숙소, 현지 교통 및 필수 예약 항목을 사전에 점검하고 체크하세요.',
          items: [
            { tier: 'S', tierName: '최우선', name: '왕복 항공권 및 e-티켓 발권', target: '출국 전', deadline: '출발 1~3개월 전', desc: '영문명 스펠링 및 여권 만료일(최소 6개월 이상) 확인', tip: '모바일 탑승권 캡처 저장 권장', url: '#' },
            { tier: 'S', tierName: '필수', name: '전 일정 숙소 예약 바우처', target: '전 일정', deadline: '출발 2주 전', desc: '체크인 시간 및 주소, 현지 연락처 사전 확인', tip: '입국 심사용 바우처 오프라인 저장', url: '#' },
            { tier: 'A', tierName: '권장', name: '도시 간 이동 교통편 (고속열차/버스)', target: '이동일', deadline: '출발 1주 전', desc: '인기 노선 및 장거리 열차 사전 예매 필수', tip: '좌석 등급 및 수하물 규정 점검', url: '#' },
            { tier: 'A', tierName: '권장', name: '여행자 보험 가입 & 해외 결제 카드', target: '출국 전', deadline: '출발 3일 전', desc: '트래블로그/월렛 해외 결제 수수료 면제 카드 및 비상 현금 준비', tip: '카드 분실 대비 해외 결제 원화 차단 확인', url: '#' }
          ],
          specialNotice: null
        },
        cities: {
          subtabTitle: '여행지 스팟 모아보기',
          subtabIcon: 'fa-layer-group',
          items: cityGuides
        },
        hasGoldenCourse: false,
        goldenItinerary: []
      };
    }
  };

  // Register as default pack
  if (window.DestinationRegistry) {
    window.DestinationRegistry.setDefaultPack(DefaultDestinationPack);
  }
  window.DefaultDestinationPack = DefaultDestinationPack;
})();
