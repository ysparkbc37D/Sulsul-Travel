/**
 * Sulsul-Travel South America Destination Pack (pack-south-america.js)
 * 22-Day South America Grand Tour Master Knowledge Pack.
 */
(function() {
  'use strict';

  const SA_KNOWN_SPOTS = [
    { id: 'cuz_stone', name: '쿠스코 12각의 돌 (12-Angled Stone)', city: '쿠스코', country: '페루', flag: '🇵🇪', cat: 'tour', lat: -13.5161, lng: -71.9774, tip: '잉카 석조 기술의 정수, 바늘귀 하나 안 들어가는 완벽한 맞물림' },
    { id: 'cuz_plaza', name: '쿠스코 아르마스 광장 (Plaza de Armas)', city: '쿠스코', country: '페루', flag: '🇵🇪', cat: 'tour', lat: -13.5168, lng: -71.9789, tip: '대성당 야경과 안데스 산자락 불빛이 황홀한 랜드마크' },
    { id: 'cuz_sacsay', name: '삭사이와만 거대 요새', city: '쿠스코', country: '페루', flag: '🇵🇪', cat: 'tour', lat: -13.5086, lng: -71.9818, tip: '수백 톤 거석들로 쌓은 지그재그 성벽' },
    { id: 'cuz_steak', name: '쿠스코 치촐리나 (Cicciolina) 알파카 스테이크', city: '쿠스코', country: '페루', flag: '🇵🇪', cat: 'food', lat: -13.5155, lng: -71.9765, tip: '미식가들의 필수 코스, 부드러운 알파카 안심과 타파스' },
    { id: 'mp_guard', name: '마추픽추 망지기의 집 (서킷 2 엽서 뷰)', city: '마추픽추', country: '페루', flag: '🇵🇪', cat: 'tour', lat: -13.1645, lng: -72.5447, tip: '전 세계 교과서에 나오는 마추픽추 최고 명당 포토존' },
    { id: 'mp_sun', name: '마추픽추 태양의 신전 (Torreón)', city: '마추픽추', country: '페루', flag: '🇵🇪', cat: 'tour', lat: -13.1637, lng: -72.5458, tip: '동지 날 햇빛이 창문을 정확히 관통하는 잉카 천문대의 기적' },
    { id: 'lim_amor', name: '리마 사랑의 공원 (Parque del Amor)', city: '리마', country: '페루', flag: '🇵🇪', cat: 'tour', lat: -12.1264, lng: -77.0369, tip: '태평양 절벽 위 가우디풍 모자이크 타일과 키스 동상' },
    { id: 'lim_lamar', name: '리마 라 마르 (La Mar) 원조 세비체', city: '리마', country: '페루', flag: '🇵🇪', cat: 'food', lat: -12.1158, lng: -77.0392, tip: '페루 최고 셰프 가스통 아쿠리오의 전설적인 세비체' },
    { id: 'desert_buggy', name: '와카치나 거대 사구 듄 버기 & 샌드보딩', city: '와카치나', country: '페루', flag: '🇵🇪', cat: 'tour', lat: -14.0875, lng: -75.7626, tip: '롤러코스터 같은 사막 질주와 신비로운 오아시스 일몰' },
    { id: 'bue_mayo', name: '부에노스아이레스 5월 광장 & 대통령궁', city: '부에노스아이레스', country: '아르헨티나', flag: '🇦🇷', cat: 'tour', lat: -34.6080, lng: -58.3702, tip: '에비타가 연설했던 분홍빛 카사 로사다 역사적 명소' },
    { id: 'bue_donjulio', name: '돈 훌리오 (Don Julio) 꽃등심 아사도 스테이크', city: '부에노스아이레스', country: '아르헨티나', flag: '🇦🇷', cat: 'food', lat: -34.5878, lng: -58.4239, tip: '세계 50대 레스토랑, MEP 환율로 반값에 즐기는 최고급 소고기' },
    { id: 'bue_caminito', name: '카미니토 (Caminito) 탱고 예술 거리', city: '부에노스아이레스', country: '아르헨티나', flag: '🇦🇷', cat: 'tour', lat: -34.6393, lng: -58.3629, tip: '원색의 양철벽 집들과 길거리 탱고 댄서들의 열정' },
    { id: 'igu_throat', name: '이과수 폭포 악마의 목구멍 (Garganta del Diablo)', city: '푸에르토 이과수', country: '아르헨티나', flag: '🇦🇷', cat: 'tour', lat: -25.6953, lng: -54.4367, tip: '초당 수만 톤의 물이 쏟아져 내리는 압도적 대자연' },
    { id: 'rio_cristo', name: '코르코바두 산 거대 예수상 (Cristo Redentor)', city: '리우데자네이루', country: '브라질', flag: '🇧🇷', cat: 'tour', lat: -22.9519, lng: -43.2105, tip: '신 세계 7대 불가사의, 리우 전경을 품에 안은 38m 석상' },
    { id: 'rio_copa', name: '코파카바나 & 이파네마 해변', city: '리우데자네이루', country: '브라질', flag: '🇧🇷', cat: 'tour', lat: -22.9698, lng: -43.1868, tip: '물결무늬 산책로와 보사노바 선율이 흐르는 남미의 바다' },
    { id: 'lax_pier', name: '산타모니카 피어 & 루트 66 종점', city: '로스앤젤레스', country: '미국', flag: '🇺🇸', cat: 'tour', lat: 34.0099, lng: -118.4960, tip: '태평양 목조 부두와 미국 대륙횡단 도로의 끝' }
  ];

  const SouthAmericaPack = {
    id: 'pack_south_america_22d',
    name: '남미 4개국 22일 대종단 마스터 팩',
    country: '페루, 볼리비아, 칠레, 아르헨티나, 브라질',
    flag: '🌎',
    currency: 'USD',

    match(trip) {
      if (!trip) return false;
      if (trip.id === 'trip_sa_showcase_22d') return true;
      const text = ((trip.title || '') + ' ' + (trip.destination || '') + ' ' + (trip.countries || []).join(' ')).toLowerCase();
      return /남미|페루|쿠스코|마추픽추|볼리비아|우유니|칠레|아르헨티나|부에노스|브라질|이과수|리우|south america|peru|bolivia|chile|argentina|brazil/i.test(text);
    },

    geo: {
      centerCoord: [-14.0, -65.0],
      defaultZoom: 3,
      simPresets: [
        { id: 'cuz_plaza', name: '🇵🇪 쿠스코 아르마스 광장 (페루)', lat: -13.5168, lng: -71.9789, tip: '대성당 야경 랜드마크' },
        { id: 'mp_guard', name: '🇵🇪 마추픽추 서킷2 망지기의 집', lat: -13.1645, lng: -72.5447, tip: '마추픽추 최고 명당 포토존' },
        { id: 'lim_amor', name: '🇵🇪 리마 미라플로레스 사랑의 공원', lat: -12.1264, lng: -77.0369, tip: '태평양 절벽 키스 동상' },
        { id: 'desert_buggy', name: '🇵🇪 와카치나 사막 오아시스 버기존', lat: -14.0875, lng: -75.7626, tip: '사막 듄 버기 & 샌드보딩' },
        { id: 'bue_donjulio', name: '🇦🇷 부에노스 돈 훌리오 아사도', lat: -34.5878, lng: -58.4239, tip: '세계 50대 레스토랑' },
        { id: 'igu_throat', name: '🇦🇷 이과수 악마의 목구멍 폭포', lat: -25.6953, lng: -54.4367, tip: '초당 수만 톤 쏟아지는 대폭포' },
        { id: 'rio_cristo', name: '🇧🇷 리우 코르코바두 예수상', lat: -22.9519, lng: -43.2105, tip: '신 7대 불가사의 예수상' },
        { id: 'lax_pier', name: '🇺🇸 LA 산타모니카 피어', lat: 34.0099, lng: -118.4960, tip: '루트 66 종점 목조 부두' }
      ],
      knownSpots: SA_KNOWN_SPOTS,
      destinations: [
        {
          id: "lax",
          name: "로스앤젤레스 (LA)",
          nameKo: "LA",
          country: "미국",
          flag: "🇺🇸",
          currency: "USD",
          altitude: "87m (평지)",
          lat: 34.0522,
          lng: -118.2437,
          zoom: 12,
          googleMapsQuery: "Los Angeles, CA, USA",
          highlights: ["산타모니카 피어 & 루트 66 종점", "그리피스 천문대 <라라랜드> 야경", "할리우드 명예의 거리", "게티 센터 미술관"],
          foods: ["인앤아웃(In-N-Out) 더블더블 버거", "BCD 북창동 순두부 본점", "핑크스(Pink's) 칠리 핫도그"],
          tips: "시차 적응을 위해 첫날 낮잠 1시간 제한! LAX-it 구역에서 우버 탑승 필수."
        },
        {
          id: "lim",
          name: "리마 (Lima)",
          nameKo: "리마",
          country: "페루",
          flag: "🇵🇪",
          currency: "PEN",
          altitude: "34m (해안가)",
          lat: -12.0464,
          lng: -77.0428,
          zoom: 12,
          googleMapsQuery: "Miraflores, Lima, Peru",
          highlights: ["미라플로레스 라르코마르 해안 절벽", "사랑의 공원", "아르마스 광장 센트로 역사지구", "바랑코 예술거리"],
          foods: ["원조 세비체 (La Mar)", "안티쿠초 소심장 꼬치구이", "피스코 사워 칵테일"],
          tips: "공항 호객 택시 절대 탑승 금지! Green Taxi 공식 부스나 Uber 이용 필수. 수돗물 절대 음용 금지."
        },
        {
          id: "desert",
          name: "파라카스 & 와카치나",
          nameKo: "와카치나",
          country: "페루",
          flag: "🇵🇪",
          currency: "PEN",
          altitude: "400m (사막)",
          lat: -14.0875,
          lng: -75.7626,
          zoom: 13,
          googleMapsQuery: "Huacachina, Ica, Peru",
          highlights: ["바예스타 섬 바다사자·펭귄 보트 투어", "칸델라브라 신비의 지상화", "와카치나 거대 사구 듄 버기카", "사막 샌드보딩 & 일몰"],
          foods: ["이카 타카마(Tacama) 와이너리 와인 & 피스코", "오아시스 화덕 피자"],
          tips: "버기카 탑승 시 마스크, 선글라스, 스마트폰 방수팩 필수! 모래바람이 강함."
        },
        {
          id: "cuz",
          name: "쿠스코 (Cusco)",
          nameKo: "쿠스코",
          country: "페루",
          flag: "🇵🇪",
          currency: "PEN",
          altitude: "3,400m (⚠️ 고산 지대)",
          lat: -13.5319,
          lng: -71.9675,
          zoom: 13,
          googleMapsQuery: "Plaza de Armas Cusco, Peru",
          highlights: ["아르마스 광장 & 잉카 석벽 12각의 돌", "삭사이와만 거대 요새", "산페드로 전통 시장", "친체로·모라이·살리네라스 염전"],
          foods: ["알파카 안심 스테이크 (Cicciolina / Morena)", "킨와(Quinoa) 수프", "코카차 (고산병 완화)"],
          tips: "🚨 첫날 도착 직후 3시간 침대 수면 필수! 달리기, 음주, 과식 3대 절대 금지. 다이아막스 사전 복용."
        },
        {
          id: "mp",
          name: "마추픽추 (Machu Picchu)",
          nameKo: "마추픽추",
          country: "페루",
          flag: "🇵🇪",
          currency: "USD / PEN",
          altitude: "2,430m (아열대 고산 정글)",
          lat: -13.1631,
          lng: -72.5450,
          zoom: 14,
          googleMapsQuery: "Historic Sanctuary of Machu Picchu, Peru",
          highlights: ["서킷 2 망지기의 집 엽서 뷰", "태양의 신전 & 인티와타나 해시계", "비스타돔 파노라마 열차 댄스 공연", "아구아스 칼리엔테스 온천 마을"],
          foods: ["안데스 청정 송어구이 (Trucha)", "로컬 크래프트 맥주"],
          tips: "정문 입장 시 실물 여권 소지 필수! 유적지 내 화장실이 없으므로 정문 앞 유료 화장실 사전 이용."
        },
        {
          id: "bue",
          name: "부에노스아이레스 (Buenos Aires)",
          nameKo: "부에노스",
          country: "아르헨티나",
          flag: "🇦🇷",
          currency: "ARS",
          altitude: "25m (라플라타 강변)",
          lat: -34.6037,
          lng: -58.3816,
          zoom: 12,
          googleMapsQuery: "Plaza de Mayo, Buenos Aires, Argentina",
          highlights: ["5월 광장 분홍빛 대통령궁(카사 로사다)", "원색의 카미니토 예술 거리 (라 보카)", "오페라 극장 개조 '엘 아테네오' 서점", "피아졸라 정통 탱고 쇼"],
          foods: ["돈 훌리오(Don Julio) 꽃등심 아사도 스테이크", "말벡(Malbec) 레드 와인", "하바나(Havanna) 둘세데레체 알파호르"],
          tips: "💡 신용카드 결제 시 외국인 우대 환율(MEP) 자동 적용! 현금보다 카드 결제가 훨씬 유리함."
        },
        {
          id: "igu",
          name: "이과수 폭포 (Iguazu Falls)",
          nameKo: "이과수",
          country: "아르헨티나 / 브라질",
          flag: "🇦🇷 🇧🇷",
          currency: "ARS / BRL",
          altitude: "195m (열대 우림)",
          lat: -25.6953,
          lng: -54.4367,
          zoom: 13,
          googleMapsQuery: "Iguazu Falls, Misiones, Argentina",
          highlights: ["악마의 목구멍 (Garganta del Diablo) 파노라마", "그란 아벤투라 폭포 샤워 보트 투어", "브라질 사이드 전경 데크 & 엘리베이터"],
          foods: ["아르헨티나 아사도 바비큐", "브라질 슈하스코", "시원한 카이피리냐(Caipirinha) 칵테일"],
          tips: "폭포 보트 탑승 시 완벽 방수팩 및 여벌 옷 필수! 아르헨티나-브라질 국경 통과 시 여권 소지."
        },
        {
          id: "rio",
          name: "리우데자네이루 (Rio de Janeiro)",
          nameKo: "리우",
          country: "브라질",
          flag: "🇧🇷",
          currency: "BRL",
          altitude: "10m (대서양 연안)",
          lat: -22.9068,
          lng: -43.1729,
          zoom: 12,
          googleMapsQuery: "Christ the Redeemer, Rio de Janeiro, Brazil",
          highlights: ["코르코바두 산 거대 예수상 (Cristo Redentor)", "슈가로프 산 빵산 케이블카 & 일몰", "코파카바나 & 이파네마 해변 산책", "셀라론 계단 (Escadaria Selarón)"],
          foods: ["슈하스코 무한리필 바비큐 (Fogo de Chão)", "시원한 아사이베리 볼", "생코코넛 워터 (Água de Coco)"],
          tips: "🚨 해변이나 길거리에서 고가의 스마트폰 및 귀금속 노출 절대 금지! 우버 탑승으로 안전 이동."
        }
      ],
      initialFocusCity: 'cuz',
      flightRoutes: [
        [37.4602, 126.4407], // 인천
        [34.0522, -118.2437], // LA
        [-12.0464, -77.0428], // 리마
        [-14.0875, -75.7626], // 이카
        [-13.5319, -71.9675], // 쿠스코
        [-13.1631, -72.5450], // 마추픽추
        [-34.6037, -58.3816], // 부에노스아이레스
        [-25.6953, -54.4367], // 이과수
        [-22.9068, -43.1729]  // 리우
      ]
    },

    getBookings() {
      if (window.KB_TRAVEL && window.KB_TRAVEL.bookingGuides) {
        return window.KB_TRAVEL.bookingGuides;
      }
      return [];
    },

    getCities() {
      if (window.KB_TRAVEL && window.KB_TRAVEL.cities) {
        return window.KB_TRAVEL.cities;
      }
      return [];
    },

    bookings: {
      subtabTitle: '12대 필수 예약',
      subtabIcon: 'fa-ticket',
      headerTitle: '남미 여행 12대 필수 사전 예약 공식 가이드',
      headerDesc: '마추픽추 입장권, 파노라마 열차, 국립공원 등 매진되기 전 공식 사이트에서 직접 예약해야 하는 필수 리스트입니다.'
    },

    cities: {
      subtabTitle: '8대 도시 가이드',
      subtabIcon: 'fa-city',
      headerTitle: '남미 8대 거점 도시 완벽 가이드',
      headerDesc: '리마부터 리우까지, 각 도시별 하이라이트와 대표 미식, 고산병 등 필수 유의사항을 확인하세요.'
    },

    hasGoldenCourse: true,
    getGoldenItinerary() {
      if (typeof scheduleOct11Data !== 'undefined') {
        return scheduleOct11Data;
      }
      return [];
    }
  };

  // Register in DKP registry
  if (window.DestinationRegistry) {
    window.DestinationRegistry.register(SouthAmericaPack);
  }
  window.SouthAmericaPack = SouthAmericaPack;
})();
