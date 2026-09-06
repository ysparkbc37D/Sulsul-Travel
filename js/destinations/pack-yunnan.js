/**
 * Sulsul-Travel China Yunnan Destination Pack (pack-yunnan.js)
 * 13-Day Authentic Yunnan Grand Tour Knowledge Pack.
 */
(function() {
  'use strict';

  const YUNNAN_KNOWN_SPOTS = [
    { id: 'yn_cuihu', name: '쿤밍 취호공원 (Green Lake Park)', city: '쿤밍', country: '중국', flag: '🇨🇳', cat: 'tour', lat: 25.0514, lng: 102.7042, tip: '붉은부리갈매기 먹이주기와 호숫가 홍등 산책' },
    { id: 'yn_shilin', name: '쿤밍 석림 (Stone Forest 유네스코)', city: '석림', country: '중국', flag: '🇨🇳', cat: 'tour', lat: 24.8167, lng: 103.3250, tip: '2억 7천만 년 카르스트 기암괴석 대장관, 전동차 탑승 필수' },
    { id: 'yn_dali', name: '따리 고성 & 인민로 (Dali Ancient City)', city: '대리', country: '중국', flag: '🇨🇳', cat: 'tour', lat: 25.6967, lng: 100.1652, tip: '백족 전통 흰 벽돌 가옥과 감성 라이브 바 거리' },
    { id: 'yn_erhai', name: '얼하이호 S자 호안 생태로 자전거길', city: '대리', country: '중국', flag: '🇨🇳', cat: 'tour', lat: 25.7500, lng: 100.1900, tip: '창산(蒼山) 설산을 배경으로 호숫가 e-바이크 라이딩' },
    { id: 'yn_lijiang', name: '리장 고성 사방가 (Lijiang Sifang St)', city: '리장', country: '중국', flag: '🇨🇳', cat: 'tour', lat: 26.8721, lng: 100.2345, tip: '800년 나시족 수로마을, 밤 8시 만성 홍등 야경' },
    { id: 'yn_mufu', name: '리장 목부 (Mu Mansion / 木府)', city: '리장', country: '중국', flag: '🇨🇳', cat: 'tour', lat: 26.8690, lng: 100.2335, tip: '리장 나시족 토사의 자금성이라 불리는 궁전 건축' },
    { id: 'yn_yulong', name: '옥룡설산 빙천공원 4506m (Jade Dragon Mt)', city: '리장', country: '중국', flag: '🇨🇳', cat: 'tour', lat: 27.1086, lng: 100.1878, tip: '대삭도 케이블카 탑승, 휴대용 산소캔 및 방한복 필수' },
    { id: 'yn_bluemoon', name: '람월곡 (Blue Moon Valley / 蓝月谷)', city: '리장', country: '중국', flag: '🇨🇳', cat: 'tour', lat: 27.1350, lng: 100.2100, tip: '설산 빙하가 녹아내린 에메랄드빛 계단식 호수' },
    { id: 'yn_tiger', name: '호도협 상호도협 트레킹 (Tiger Leaping Gorge)', city: '호도협', country: '중국', flag: '🇨🇳', cat: 'tour', lat: 27.1833, lng: 100.1333, tip: '금사강 물살이 포효하는 세계 3대 트레킹 협곡' },
    { id: 'yn_songzan', name: '샹그릴라 송찬림사 (작은 포탈라궁)', city: '샹그릴라', country: '중국', flag: '🇨🇳', cat: 'tour', lat: 27.8633, lng: 99.7042, tip: '해발 3300m 운남 최대의 티베트 불교 사원' },
    { id: 'yn_dukezong', name: '두커종 고성 거대 마니차 (Dukezong)', city: '샹그릴라', country: '중국', flag: '🇨🇳', cat: 'tour', lat: 27.8167, lng: 99.7056, tip: '황금 마니차를 세 바퀴 돌리며 무사안녕 기원' }
  ];

  const YUNNAN_DESTINATIONS = [
    {
      id: 'kunming',
      name: '쿤밍 (Kunming / 昆明)',
      nameKo: '쿤밍',
      flag: '🇨🇳',
      currency: 'CNY',
      altitude: '1,890m (평지 고원)',
      lat: 25.0406,
      lng: 102.7123,
      zoom: 12,
      badge: '봄의 도시',
      intro: '사계절 온화한 춘성(春城), 취호공원과 세계자연유산 석림',
      googleMapsQuery: 'Kunming, Yunnan, China',
      highlights: ['취호공원 붉은부리갈매기 떼', '세계자연유산 석림(Stone Forest)', '운남 육군강무당 역사 유적', '난핑제 야시장 거리'],
      foods: ['정통 운남 과교미선 (뚝배기 쌀국수)', '야생 버섯 훠궈', '꽃케이크 (鲜花饼)'],
      food: '정통 운남 과교미선 (뚝배기 쌀국수), 야생 버섯 훠궈',
      tips: '해발 1,900m로 가벼운 고도감이 있을 수 있으므로 충분한 수분 섭취 권장.',
      caution: '해발 1,900m로 가벼운 고도감이 있을 수 있으므로 충분한 수분 섭취'
    },
    {
      id: 'dali',
      name: '따리 (Dali / 大理)',
      nameKo: '따리',
      flag: '🇨🇳',
      currency: 'CNY',
      altitude: '1,970m (호반)',
      lat: 25.6967,
      lng: 100.1652,
      zoom: 12,
      badge: '풍화설월의 고장',
      intro: '창산(蒼山)과 얼하이호(洱海)가 빚어낸 백족 문화의 중심',
      googleMapsQuery: 'Dali Ancient City, Yunnan, China',
      highlights: ['천년 대리고성 & 인민로 라이브 바', '얼하이호 생태로 e-바이크 라이딩', '숭성사 삼탑(三塔) 반영 연못', '희주(喜洲) 고진 백족 전통 염색'],
      foods: ['대리 특산 유산균 치즈 구이(루산)', '사천식 활어 조림', '희주 바바 (화덕 빵)'],
      food: '대리 특산 유산균 치즈 구이(루산), 사천식 활어 조림',
      tips: '얼하이호 전기 스쿠터 주행 시 안전 헬멧 및 속도 준수 필수.',
      caution: '얼하이호 전기 스쿠터 주행 시 안전 헬멧 및 속도 준수'
    },
    {
      id: 'lijiang',
      name: '리장 (Lijiang / 丽江)',
      nameKo: '리장',
      flag: '🇨🇳',
      currency: 'CNY',
      altitude: '2,400m (나시족 분지)',
      lat: 26.8721,
      lng: 100.2345,
      zoom: 13,
      badge: '나시족 천년 고성',
      intro: '유네스코 세계문화유산 목조 수로 고성과 장엄한 옥룡설산',
      googleMapsQuery: 'Lijiang Ancient City, Yunnan, China',
      highlights: ['리장고성 사방가 & 대풍차 야경', '나시족의 자금성 목부(木府) 궁전', '사자산 만호정 파노라마 전망', '수허고진 고즈넉한 찻길 산책'],
      foods: ['나시족 흑염소 훠궈', '전통 버섯 지짐이', '야크 생요구르트'],
      food: '나시족 흑염소 훠궈, 전통 버섯 지짐이, 야크 요구르트',
      tips: '자갈길 골목이 많아 편안한 운동화 필수, 고성 유지비 영수증 보관 필수.',
      caution: '자갈길 골목이 많아 편안한 운동화 필수, 고성 유지비 영수증 보관'
    },
    {
      id: 'yulong',
      name: '옥룡설산 & 호도협',
      nameKo: '옥룡/호도협',
      flag: '🇨🇳',
      currency: 'CNY',
      altitude: '4,506m (만년설 고산)',
      lat: 27.1086,
      lng: 100.1878,
      zoom: 12,
      badge: '알프스급 협곡 비경',
      intro: '해발 4,506m 만년설 빙천공원과 세계 3대 트레킹 상호도협',
      googleMapsQuery: 'Jade Dragon Snow Mountain, Lijiang, China',
      highlights: ['빙천공원 4,506m 대삭도 케이블카', '에메랄드빛 계단식 호수 람월곡', '장예모 감독 야외 실경쇼 [인상여강]', '호도협 상호도협 포효하는 금사강'],
      foods: ['산장 야크 버터 밀크티', '티베트식 칭커보리 빵', '고산 약선 삼계탕'],
      food: '산장 야크 버터 밀크티, 티베트식 칭커보리 빵',
      tips: '🚨 4,506m 고산증 대비 휴대용 산소캔 2통 준비 필수! 계단 무리한 질주 금지.',
      caution: '4,500m 고산증 대비 휴대용 산소통 필수, 계단 무리한 질주 금지'
    },
    {
      id: 'shangrila',
      name: '샹그릴라 (Shangri-La / 香格里拉)',
      nameKo: '샹그릴라',
      flag: '🇨🇳',
      currency: 'CNY',
      altitude: '3,300m (티베트 고원)',
      lat: 27.8167,
      lng: 99.7056,
      zoom: 12,
      badge: '잃어버린 지평선',
      intro: '티베트 불교의 성지 송찬림사와 황금 마니차가 도는 두커종',
      googleMapsQuery: 'Shangri-La, Diqing, Yunnan, China',
      highlights: ['작은 포탈라궁 송찬림사(松赞林寺)', '두커종 고성 세계 최대 황금 마니차', '나파해(纳帕海) 초원 이색 풍경', '티베트 전통 가옥 체험'],
      foods: ['정통 티베트식 야크 고기 샤브샤브', '칭커주 (청보리 발효주)', '야크 버터 치즈'],
      food: '정통 티베트식 야크 고기 샤브샤브, 칭커주(청보리주)',
      tips: '해발 3,300m 고지대이므로 도착 첫날 음주 및 뜨거운 장시간 샤워 자제.',
      caution: '해발 3,300m 고지대이므로 도착 첫날 음주 및 격한 샤워 자제'
    }
  ];

  const YUNNAN_13D_SCHEDULE = [
    {
      dayNum: 1, date: "12월 23일 (화)", loc: "쿤밍 (Kunming)", flight: "✈️ 인천(ICN) → 쿤밍(KMG) 직항",
      title: "영원한 봄의 도시 쿤밍 도착 & 취호공원 산책",
      desc: "인천에서 쿤밍 장수이 공항 입국 후 지하철 또는 공항버스로 시내 이동. 쿤밍의 심장 취호공원에서 갈매기 떼와 낭만을 만끽합니다.",
      timeline: [
        { time: "09:30 - 13:40", typeIcon: "✈️", cat: "tour", title: "인천 → 쿤밍 직항 비행 & 입국 수속", desc: "약 4시간 30분 비행, 입국 심사(무비자 정책 확인) 및 위챗/알리페이 활성화", tip: "공항 내 무료 Wi-Fi로 모바일 페이 결제 사전 점검", cost: "항공권", isDraft: false },
        { time: "14:30 - 15:30", typeIcon: "🏨", cat: "tour", title: "취호 인근 호텔 체크인 & 짐 보관", desc: "시내 중심가(오화구 취호 주변) 가성비 호텔 체크인", tip: "프런트에 외국인 투숙 가능 여부(외빈 접대) 재확인", cost: "숙박비", isDraft: false },
        { time: "16:00 - 18:00", typeIcon: "🌿", cat: "tour", title: "취호공원(翠湖公园) 갈매기 먹이주기 & 호숫가 산책", desc: "시베리아에서 날아온 수만 마리 붉은부리갈매기 장관 감상", tip: "현지 노점에서 갈매기 빵(2~5元) 구매 후 모이 주기", cost: "약 5元", isDraft: false },
        { time: "18:30 - 20:00", typeIcon: "🍲", cat: "food", title: "원조 뚝배기 과교미선(过桥米线) 저녁 식사", desc: "펄펄 끓는 닭육수에 얇게 썬 고기와 야채를 넣어 먹는 운남 대표 미식", tip: "국물이 매우 뜨거우므로 기름막을 조심해서 섭취", cost: "약 40元", isDraft: false }
      ]
    },
    {
      dayNum: 2, date: "12월 24일 (수)", loc: "쿤밍 · 석림 (Stone Forest)", flight: "🚄 쿤밍역 → 석림서역 고속열차 왕복",
      title: "2억 7천만 년 카르스트의 신비, 대소석림 종일 투어",
      desc: "기네스북에 등재된 세계 최대의 카르스트 돌숲 석림 탐방. 자연이 빚어낸 거대한 미로와 아스마 전설의 바위를 만납니다.",
      timeline: [
        { time: "08:30 - 09:30", typeIcon: "🚄", cat: "tour", title: "고속열차 타고 석림(石林) 이동", desc: "쿤밍남역 또는 쿤밍역에서 고속열차 탑승(약 25분) 후 석림풍경구 버스 환승", tip: "12306 앱 사전 예매 필수, 여권 원본 지참", cost: "약 36元", isDraft: false },
        { time: "10:00 - 14:00", typeIcon: "🪨", cat: "tour", title: "석림 세계자연유산 대소석림 트레킹", desc: "칼날처럼 솟아오른 기암괴석 사이 미로 탐방, 망봉정 파노라마 전망", tip: "내부 전동차(25元) 무조건 탑승 권장, 도보 1만보 이상 소요", cost: "입장료 130元", isDraft: false },
        { time: "14:30 - 15:30", typeIcon: "🍽️", cat: "food", title: "석림 이족(彝族) 향토 전통 요리 점심", desc: "석림 특산 버섯 볶음과 훈제 오리 햄 요리", tip: "맵싸한 운남 고추 소스가 입맛을 돋움", cost: "약 50元", isDraft: false },
        { time: "17:00 - 19:30", typeIcon: "🏮", cat: "shopping", title: "쿤밍 복귀 후 난핑제(南屏街) 야시장 탐방", desc: "쿤밍 최대 번화가 쇼핑거리 및 운남 야크 요거트 시식", tip: "꽃으로 만든 꽃케이크(鲜花饼) 선물 쇼핑", cost: "자유 소비", isDraft: false }
      ]
    },
    {
      dayNum: 3, date: "12월 25일 (목)", loc: "따리 (Dali)", flight: "🚄 쿤밍 → 대리 고속열차 (약 2시간)",
      title: "바람과 꽃의 고장 대리 입성 & 천년 대리고성 탐방",
      desc: "고속열차를 타고 낭만 여행자들의 성지 대리 도착. 창산 아래 자리 잡은 백족의 대리고성 사방가를 걷습니다.",
      timeline: [
        { time: "09:00 - 11:15", typeIcon: "🚄", cat: "tour", title: "쿤밍 → 대리 고속열차 이동", desc: "창밖으로 펼쳐지는 운남 고원 풍경을 보며 대리역 도착", tip: "대리역 앞에서 대리고성행 직통 버스(약 5元) 탑승", cost: "약 145元", isDraft: false },
        { time: "12:00 - 13:00", typeIcon: "🏨", cat: "tour", title: "대리고성 내 백족 전통 객잔 체크인", desc: "정원이 딸린 아늑한 전통 가옥 객잔에 여장 풀기", tip: "객잔 주인에게 얼하이호 자전거 렌탈 정보 문의", cost: "객잔 숙박", isDraft: false },
        { time: "13:30 - 15:00", typeIcon: "🥟", cat: "food", title: "대리 인민로 백족 현지 맛집 점심 식사", desc: "사천·백족 퓨전 볶음요리와 장미 꽃잼 전병", tip: "야외 테라스 석에서 고성 골목 감상", cost: "약 45元", isDraft: false },
        { time: "15:30 - 18:30", typeIcon: "🏛️", cat: "tour", title: "대리 숭성사 삼탑(三塔) 탐방 & 고성 성벽 산책", desc: "천년 세월을 버틴 세 개의 탑과 거대한 불교 사원", tip: "오후 역광 반영 연못에서 삼탑 인생샷 촬영", cost: "입장료 75元", isDraft: false },
        { time: "19:30 - 22:00", typeIcon: "🎸", cat: "tour", title: "대리고성 양인지에(洋人街) 라이브 음악 바 탐방", desc: "포크 기타 선율이 흐르는 감성 펍에서 시원한 대리 맥주 한잔", tip: "V8 대리 맥주 풍화설월(风花雪月) 추천", cost: "약 40元", isDraft: false }
      ]
    },
    {
      dayNum: 4, date: "12월 26일 (금)", loc: "따리 · 얼하이호 (Erhai)", flight: "🚲 얼하이호 생태로 전동 스쿠터 투어",
      title: "푸른 바다 같은 얼하이호 라이딩 & 희주 고진",
      desc: "호수를 끼고 달리는 인생 드라이브 코스. 백족 전통 가옥이 온전히 보존된 희주(喜洲) 고진에서 힐링.",
      timeline: [
        { time: "09:30 - 12:30", typeIcon: "🛵", cat: "tour", title: "얼하이호 서안 생태로 e-바이크 라이딩", desc: "호숫가를 따라 조성된 무공해 전용 도로 질주, S자 커브 포토존", tip: "전기 스쿠터 배터리 잔량 사전 확인 및 자외선 차단제 필수", cost: "렌탈 약 60元", isDraft: false },
        { time: "13:00 - 15:30", typeIcon: "🏘️", cat: "tour", title: "희주 고진(喜洲古镇) 탐방 & 희주 바바(粑粑) 맛보기", desc: "백족 전통 염색 천이 펄럭이는 전통 마을과 갓 구운 파전 희주 바바", tip: "논밭 뷰 카페에서 커피 한잔의 여유", cost: "바바 10元", isDraft: false },
        { time: "16:30 - 18:30", typeIcon: "🌅", cat: "tour", title: "쌍랑(双廊) 일몰 조망 & 고성 복귀", desc: "호수 너머 창산으로 떨어지는 황금빛 노을 감상", tip: "일몰 30분 전 자리를 잡고 타임랩스 촬영", cost: "무료", isDraft: false }
      ]
    },
    {
      dayNum: 5, date: "12월 27일 (토)", loc: "리장 (Lijiang)", flight: "🚄 대리 → 여강 고속열차 (약 1시간 30분)",
      title: "동파 문자의 고향 리장 입성 & 800년 나시족 수로 고성",
      desc: "설산 아래 고대 차마고도의 거점 리장 도착. 조약돌 골목길과 졸졸 흐르는 수로를 따라 걷는 낭만 여정.",
      timeline: [
        { time: "10:00 - 11:30", typeIcon: "🚄", cat: "tour", title: "대리 → 리장 고속열차 이동", desc: "창밖으로 만년설 옥룡설산의 웅장한 능선이 보이기 시작", tip: "좌측 좌석에서 옥룡설산 조망 가능", cost: "약 34元", isDraft: false },
        { time: "12:00 - 13:00", typeIcon: "🏨", cat: "tour", title: "리장고성 남문 인근 전통 목조 객잔 체크인", desc: "수로 옆 홍등이 달린 고즈넉한 나시족 객잔", tip: "돌바닥이라 캐리어 운반이 힘드니 객잔 픽업 서비스 요청", cost: "객잔 숙박", isDraft: false },
        { time: "13:30 - 15:00", typeIcon: "🍲", cat: "food", title: "리장 나시족 흑염소 훠궈(黑山羊火锅) 점심", desc: "추위를 녹여주는 진하고 담백한 약선 흑염소 전골", tip: "현지 산나물과 두부 사리 추가 권장", cost: "약 70元", isDraft: false },
        { time: "15:30 - 18:30", typeIcon: "🏮", cat: "tour", title: "리장고성 사방가(四方街) & 목부(木府) 궁전 관람", desc: "영화 만다린의 무대 목부 궁전과 나시족 만호정 야경", tip: "목부 뒤 사자산에 오르면 고성 기와지붕이 한눈에 파노라마 조망", cost: "목부 40元", isDraft: false },
        { time: "19:30 - 22:00", typeIcon: "✨", cat: "tour", title: "리장고성 대풍차(大水车) 홍등 야경 투어", desc: "밤이 되면 천 개의 홍등이 켜지는 동화 같은 야경", tip: "고성 내 소매치기 주의, 라이브 펍 거리 산책", cost: "자유 소비", isDraft: false }
      ]
    },
    {
      dayNum: 6, date: "12월 28일 (일)", loc: "리장 · 옥룡설산 (Jade Dragon Snow Mt)", flight: "🚌 리장 시내 ↔ 옥룡설산 셔틀버스",
      title: "해발 4,506m 옥룡설산 대삭도 & 에메랄드 람월곡",
      desc: "운남 여행의 최고 하이라이트! 케이블카를 타고 4,506m 빙천공원에 올라 만년설을 밟고 장예모 감독의 인상여강 공연 관람.",
      timeline: [
        { time: "07:30 - 08:30", typeIcon: "🚌", cat: "tour", title: "옥룡설산 전용 셔틀버스 탑승 이동", desc: "시내에서 옥룡설산 국립공원 관광센터 이동", tip: "방한 패딩 대여(약 50元) 및 산소캔 2통 준비", cost: "버스 약 20元", isDraft: false },
        { time: "09:00 - 11:30", typeIcon: "🚠", cat: "tour", title: "빙천공원 대삭도(冰川大索道) 탑승 (4,506m 입성)", desc: "구름을 뚫고 4,506m 전망대 도착, 데크길 따라 4,680m 최고봉 도전", tip: "천천히 걸으며 10보마다 심호흡, 두통 시 즉시 산소 흡입", cost: "케이블카 140元", isDraft: false },
        { time: "12:00 - 13:10", typeIcon: "🎭", cat: "tour", title: "장예모 감독 야외 실경쇼 [인상여강(印象丽江)] 관람", desc: "옥룡설산을 천연 배경으로 500여 명의 소수민족이 펼치는 감동의 대서사시", tip: "햇빛이 강하므로 선글라스 및 모자 필수", cost: "공연 티켓", isDraft: false },
        { time: "14:00 - 16:30", typeIcon: "💧", cat: "tour", title: "신비로운 에메랄드빛 계단식 호수 람월곡(蓝月谷)", desc: "석회암 계곡에 비치는 옥빛 물결과 하얀 야크 포토존", tip: "전동차 대신 데크길을 천천히 걸으며 폭포 감상", cost: "람월곡 포함", isDraft: false },
        { time: "18:00 - 20:00", typeIcon: "🍗", cat: "food", title: "리장 시내 복귀 후 나시족 전통 닭찜 디너", desc: "고산 트레킹 후 원기 회복을 위한 삼계 약선 닭요리", tip: "고산 피로 회복을 위해 충분한 휴식", cost: "약 60元", isDraft: false }
      ]
    },
    {
      dayNum: 7, date: "12월 29일 (월)", loc: "리장 · 수허고진 (Shuhe)", flight: "🚕 리장고성 → 수허고진 택시 이동",
      title: "차마고도의 첫 관문, 고즈넉한 수허고진 힐링 데이",
      desc: "리장고성의 번잡함을 벗어나 나시족의 원형이 살아있는 수허고진 산책. 찻집에서 명품 보이차를 음미합니다.",
      timeline: [
        { time: "10:00 - 10:30", typeIcon: "🚕", cat: "tour", title: "수허고진(束河古镇)으로 이동", desc: "리장 북쪽 5km 지점, 차마고도 대상들의 출발지", tip: "디디추싱(택시) 이용 시 15~20元", cost: "약 20元", isDraft: false },
        { time: "10:30 - 13:00", typeIcon: "🍵", cat: "tour", title: "수허 청룡교(青龙桥) 산책 & 전통 운남 보이차 다도 체험", desc: "400년 된 돌다리와 맑은 용천수, 다원에서 정통 고수 보이차 시음", tip: "보이차 구매 시 생산 연도와 차창 인증 확인", cost: "다도 무료~유료", isDraft: false },
        { time: "13:30 - 15:00", typeIcon: "🍽️", cat: "food", title: "수허고진 야외 수로 테라스 런치", desc: "운남 로컬 감자 버섯 전병과 신선한 나물 샐러드", tip: "물가 바로 옆 테이블 추천", cost: "약 50元", isDraft: false },
        { time: "16:00 - 18:30", typeIcon: "📖", cat: "shopping", title: "나시족 동파 문자 서예 체험 & 기념품 쇼핑", desc: "현존하는 유일의 상형문자 동파 문자 책갈피 만들기", tip: "자신의 한글 이름을 동파 상형문자로 변환 소장", cost: "약 30元", isDraft: false }
      ]
    },
    {
      dayNum: 8, date: "12월 30일 (화)", loc: "호도협 (Tiger Leaping Gorge)", flight: "🚐 리장 → 상호도협 전용 셔틀 (약 2시간)",
      title: "세계 3대 트레킹 협곡, 포효하는 상호도협 대협곡",
      desc: "금사강이 옥룡설산과 하바설산 사이를 가르며 뿜어내는 압도적인 물살. 호랑이가 뛰어넘었다는 전설의 호도석 탐방.",
      timeline: [
        { time: "08:00 - 10:00", typeIcon: "🚐", cat: "tour", title: "리장 출발 → 호도협 진입로 이동", desc: "협곡 깊은 곳으로 향하는 파노라마 산악 도로", tip: "멀미가 있는 경우 멀미약 복용", cost: "차량비", isDraft: false },
        { time: "10:30 - 13:30", typeIcon: "🐯", cat: "tour", title: "상호도협(上虎跳峡) 잔도 데크길 & 호도석 뷰포인트", desc: "초당 수천 톤의 황톳빛 급류가 굉음을 내며 부딪히는 절경 감상", tip: "계단이 가파르므로 에스컬레이터(편도 70元) 선택 가능", cost: "입장료 45元", isDraft: false },
        { time: "14:00 - 15:30", typeIcon: "🍲", cat: "food", title: "호도협 산장 로컬 뚝배기 점심 식사", desc: "절벽 위 산장에서 협곡을 내려다보며 즐기는 식사", tip: "토종 토종닭 볶음탕 추천", cost: "약 55元", isDraft: false },
        { time: "16:30 - 18:00", typeIcon: "🏨", cat: "tour", title: "호도협 게스트하우스 체크인 & 석양 조망", desc: "하바설산 뷰가 펼쳐지는 협곡 산장에서의 특별한 1박", tip: "밤하늘 은하수가 쏟아지는 명당", cost: "산장 숙박", isDraft: false }
      ]
    },
    {
      dayNum: 9, date: "12월 31일 (수)", loc: "샹그릴라 (Shangri-La)", flight: "🚐 호도협 → 샹그릴라 고속도로 (약 2시간)",
      title: "해발 3,200m 티베트의 낙원, 샹그릴라 입성",
      desc: "제임스 힐튼의 소설 [잃어버린 지평선] 속 이상향 샹그릴라. 타르초가 바람에 펄럭이는 두커종 달빛 고성 도착.",
      timeline: [
        { time: "09:30 - 11:30", typeIcon: "🚐", cat: "tour", title: "호도협 → 샹그릴라 디칭(迪庆) 고원 이동", desc: "해발 고도가 3,000m 이상으로 급상승하는 티베트 고원 도로", tip: "고산 반응 예방을 위해 차 안에서 숙면", cost: "이동 포함", isDraft: false },
        { time: "12:00 - 13:00", typeIcon: "🏨", cat: "tour", title: "두커종 고성 내 티베트 전통 호텔 체크인", desc: "두꺼운 양탄자와 티베트 목공예로 장식된 숙소", tip: "산소 발생기가 구비된 룸인지 확인", cost: "호텔 숙박", isDraft: false },
        { time: "13:30 - 15:00", typeIcon: "🥩", cat: "food", title: "정통 티베트 야크 샤브샤브(牦牛肉火锅) 점심", desc: "청정 고원에서 자란 야크 고기와 진한 약선 국물", tip: "야크 버터차(수유차)를 곁들이면 고산병 예방에 탁월", cost: "약 80元", isDraft: false },
        { time: "16:00 - 18:30", typeIcon: "🛞", cat: "tour", title: "두커종 귀산공원(龟山公园) 세계 최대 황금 마니차 돌리기", desc: "수십 명이 힘을 합쳐야 돌아가는 21m 높이의 거대 황금 마니차", tip: "시계 방향으로 세 바퀴를 돌려야 소원이 성취됨", cost: "무료", isDraft: false },
        { time: "19:00 - 21:00", typeIcon: "💃", cat: "tour", title: "사방가 광장 티베트 궈좡(锅庄) 군무 참여", desc: "고성 광장에서 주민들과 여행자들이 원을 그리며 추는 민속 춤", tip: "누구나 부담 없이 대열에 합류 가능", cost: "무료", isDraft: false }
      ]
    },
    {
      dayNum: 10, date: "01월 01일 (목)", loc: "샹그릴라 · 송찬림사 (Ganden Sumtseling)", flight: "🚌 시내 ↔ 송찬림사 전용 셔틀",
      title: "새해 첫날의 기도, 작은 포탈라궁 송찬림사 참배",
      desc: "운남성 최대의 겔룩파 티베트 불교 사원. 황금빛 지붕 아래서 스님들의 독경 소리를 들으며 새해 소망을 기원합니다.",
      timeline: [
        { time: "09:00 - 12:30", typeIcon: "🛕", cat: "tour", title: "송찬림사(松赞林寺) 전각 순례 & 라무양초 호수 둘레길", desc: "라싸 포탈라궁을 본떠 지은 웅장한 승원, 호수에 비친 반영 감상", tip: "사원 내부 불상 촬영 엄격 금지, 모자 벗고 시계방향 참배", cost: "입장료 90元", isDraft: false },
        { time: "13:00 - 14:30", typeIcon: "🍞", cat: "food", title: "티베트 전통 칭커보리 빵 & 야크 버터 치즈 런치", desc: "고소한 청보리 볶음가루(참파)와 따뜻한 차", tip: "달콤한 티베트 요구르트 디저트 강추", cost: "약 45元", isDraft: false },
        { time: "15:30 - 18:00", typeIcon: "🌾", cat: "tour", title: "나파해(纳帕海) 이라초원 고원 습지 드라이브", desc: "야크와 조랑말들이 한가로이 풀을 뜯는 끝없는 고원 목초지", tip: "호수 수위에 따라 도로가 잠기는 워터로드 드라이브", cost: "약 40元", isDraft: false }
      ]
    },
    {
      dayNum: 11, date: "01월 02일 (금)", loc: "샹그릴라 · 푸다춰 (Potatso)", flight: "🚌 샹그릴라 시내 ↔ 푸다춰 국립공원",
      title: "태고의 원시림과 고산 호수, 푸다춰 국가공원",
      desc: "중국 최초의 국립공원. 원시 침엽수림과 슈두호(属都湖) 물안개 속에서 만나는 다람쥐와 들꽃 생태 탐방.",
      timeline: [
        { time: "09:00 - 13:30", typeIcon: "🌲", cat: "tour", title: "푸다춰(普达措) 국립공원 슈두호 데크길 에코 트레킹", desc: "해발 3,500m 고산 호수를 둘러싼 3.3km 무장애 목재 데크 산책", tip: "야생 다람쥐에게 줄 견과류 소지 권장, 친환경 셔틀 포함", cost: "입장료 138元", isDraft: false },
        { time: "14:30 - 16:00", typeIcon: "🍲", cat: "food", title: "티베트 가정식 따뜻한 야채 고기 완자탕 런치", desc: "트레킹 후 한기를 달래주는 담백한 스프", tip: "현지 가정집 개조 식당 방문", cost: "약 50元", isDraft: false },
        { time: "17:00 - 19:30", typeIcon: "🏮", cat: "shopping", title: "두커종 고성 마지막 밤, 야크 가죽 수공예 기념품 쇼핑", desc: "티베트 은공예 장신구, 야크 울 스카프, 수제 향", tip: "흥정은 필수(표시 가격의 60~70% 제시)", cost: "자유 소비", isDraft: false }
      ]
    },
    {
      dayNum: 12, date: "01월 03일 (토)", loc: "샹그릴라 → 쿤밍 (Return to Kunming)", flight: "🚄 샹그릴라역 → 쿤밍역 직통 고속열차 (약 4.5시간)",
      title: "샹그릴라 설산과 작별, 고속열차 타고 쿤밍 복귀",
      desc: "새로 개통된 디칭 고원 철도를 타고 호도협과 리장을 거쳐 쿤밍으로 쾌속 귀환. 쿤밍에서의 마지막 만찬.",
      timeline: [
        { time: "09:30 - 14:10", typeIcon: "🚄", cat: "tour", title: "샹그릴라 → 쿤밍 직통 고속열차 탑승", desc: "고산 철도 터널과 다리를 건너며 운남 대지 종단", tip: "열차 내 도시락 또는 컵라면 식사 준비", cost: "약 230元", isDraft: false },
        { time: "14:40 - 15:30", typeIcon: "🏨", cat: "tour", title: "쿤밍 공항 인근 또는 시내 호텔 체크인", desc: "마지막 날 편안한 휴식을 위한 4성급 호텔 투숙", tip: "공항 무료 셔틀 운행 여부 확인", cost: "호텔 숙박", isDraft: false },
        { time: "16:30 - 18:30", typeIcon: "🌸", cat: "shopping", title: "도남 화훼시장(斗南花市) 아시아 최대 꽃시장 탐방", desc: "아시아 최대 규모의 생화 도매시장, 끝없이 펼쳐진 장미와 백합", tip: "꽃 가격이 놀라울 정도로 저렴(장미 20송이 10元 수준)", cost: "무료 관람", isDraft: false },
        { time: "19:00 - 21:00", typeIcon: "🍄", cat: "food", title: "운남 야생 버섯 훠궈(野生菌火锅) 작별 만찬", desc: "송이, 능이 등 귀한 고산 야생 버섯 15종을 푹 고아낸 보약 육수", tip: "독성 방지를 위해 타이머 20분 알람 후 섭취 필수", cost: "약 120元", isDraft: false }
      ]
    },
    {
      dayNum: 13, date: "01월 04일 (일)", loc: "쿤밍 → 인천 (Incheon)", flight: "✈️ 쿤밍(KMG) → 인천(ICN) 귀국 직항",
      title: "운남 대장정의 완주 & 소중한 추억을 안고 귀국",
      desc: "취호의 갈매기, 옥룡설산의 만년설, 샹그릴라의 마니차를 가슴에 품고 안전하게 한국으로 복귀합니다.",
      timeline: [
        { time: "10:00 - 11:30", typeIcon: "🚗", cat: "tour", title: "쿤밍 창수이 국제공항 이동 & 출국 수속", desc: "항공사 카운터 수하물 위탁, 출국 심사 및 보안검색", tip: "꽃케이크 및 차 선물류 기내 반입 규정 확인", cost: "공항 이동", isDraft: false },
        { time: "13:30 - 18:30", typeIcon: "✈️", cat: "tour", title: "쿤밍 출발 → 인천국제공항 안전 도착", desc: "약 4시간 비행 후 인천 도착, 12박 13일 운남 대장정 종료", tip: "가계부 지출 정산 및 포토 다이어리 최종 백업", cost: "귀국", isDraft: false }
      ]
    }
  ];

  const YunnanPack = {
    id: 'pack_china_yunnan_13d',
    name: '중국 운남성 12박 13일 황금 코스 팩',
    country: '중국',
    flag: '🇨🇳',
    currency: 'CNY',

    match(trip) {
      if (!trip) return false;
      const text = ((trip.title || '') + ' ' + (trip.destination || '') + ' ' + (trip.countries || []).join(' ')).toLowerCase();
      return /운남|운남성|쿤밍|리장|따리|샹그릴라|호도협|yunnan/i.test(text);
    },

    geo: {
      centerCoord: [26.2, 100.5],
      defaultZoom: 7,
      simPresets: [
        { id: 'yn_cuihu', name: '🇨🇳 쿤밍 취호공원 (Kunming)', lat: 25.0514, lng: 102.7042, tip: '갈매기 떼와 낭만의 호숫가' },
        { id: 'yn_shilin', name: '🇨🇳 쿤밍 석림 세계자연유산', lat: 24.8167, lng: 103.3250, tip: '2억 7천만 년 카르스트 미로' },
        { id: 'yn_lijiang', name: '🇨🇳 리장 고성 사방가', lat: 26.8721, lng: 100.2345, tip: '800년 나시족 수로마을 야경' },
        { id: 'yn_yulong', name: '🇨🇳 옥룡설산 빙천공원 (4506m)', lat: 27.1086, lng: 100.1878, tip: '만년설 빙하와 휴대용 산소캔' },
        { id: 'yn_tiger', name: '🇨🇳 호도협 상호도협 트레킹', lat: 27.1833, lng: 100.1333, tip: '세계 3대 트레킹 포효하는 협곡' },
        { id: 'yn_songzan', name: '🇨🇳 샹그릴라 송찬림사', lat: 27.8633, lng: 99.7042, tip: '작은 포탈라궁 티베트 불교 사원' },
        { id: 'yn_dali', name: '🇨🇳 따리 고성 & 얼하이호', lat: 25.6967, lng: 100.1652, tip: '창산과 푸른 호수 e-바이크' }
      ],
      knownSpots: YUNNAN_KNOWN_SPOTS,
      destinations: YUNNAN_DESTINATIONS,
      initialFocusCity: 'kunming',
      flightRoutes: [
        [25.0406, 102.7123], // Kunming
        [24.8167, 103.3250], // Shilin
        [25.6967, 100.1652], // Dali
        [26.8721, 100.2345], // Lijiang
        [27.1086, 100.1878], // Yulong Snow Mt
        [27.1833, 100.1333], // Tiger Leaping Gorge
        [27.8167, 99.7056]   // Shangri-La
      ]
    },

    bookings: {
      subtabTitle: '여행 필수 체크/예약',
      subtabIcon: 'fa-clipboard-check',
      headerTitle: '중국 운남성 필수 준비 & 사전 예약 체크리스트',
      headerDesc: '알리페이 한국 카드 연동, 옥룡설산 대삭도 추첨, 고속열차 사전 예매 필수 항목입니다.',
      items: [
        { tier: 'S', tierName: '최우선 S급', name: '알리페이 / 위챗페이 해외 카드 등록', target: '출국 전 필수', deadline: '출발 3일 전', desc: '한국 트래블로그/월렛 카드를 알리페이에 등록하여 현지 QR 간편 결제 완벽 대비 (현금 거부 대비)', tip: 'TourPass 또는 직접 Visa/Master 카드 연동 후 1회 승인 테스트', url: 'https://www.alipay.com/' },
        { tier: 'S', tierName: '최우선 S급', name: '옥룡설산 빙천 대삭도(케이블카) 조기 예약', target: '리장 Day 6', deadline: '방문 전일 20:00 추첨', desc: '해발 4,506m 빙천공원행 대삭도는 매일 아침 전산 조기 매진되므로 공식 미니프로그램 사전 대기', tip: '현지 일일투어 패키지(입장료+대삭도+방한복+산소) 사전 구매 추천', url: '#' },
        { tier: 'A', tierName: '핵심 A급', name: '쿤밍 ↔ 대리 ↔ 리장 고속열차 예매', target: '도시 간 이동일', deadline: '탑승 14일 전 오픈', desc: '12306 공식 앱 또는 트립닷컴에서 영문 여권 번호로 실명제 고속열차 승차권 사전 예매', tip: '국경절/연말 성수기 표 매진 빠름, 1등석 좌석이 편안함', url: 'https://www.12306.cn/' },
        { tier: 'A', tierName: '핵심 A급', name: '장예모 감독 [인상여강] 실경 공연 티켓', target: '옥룡설산 Day 6', deadline: 'D-3일 전', desc: '옥룡설산을 배경으로 펼쳐지는 500명 소수민족의 웅장한 야외 무대 공연', tip: '오전 11시 또는 12시 타임 추천 (설산 역광 회피)', url: '#' }
      ],
      specialNotice: {
        title: '🇨🇳 중국 운남 여행 필수 사전 예약 & 결제 공식 가이드',
        tips: [
          { title: '알리페이 / 위챗페이', desc: '한국 신용카드(트래블로그/월렛)를 알리페이(TourPass/신용카드 등록)에 사전 연동 필수 (현금 거의 안 받음).' },
          { title: '옥룡설산 대삭도(4506m)', desc: '방문 전일 저녁 20:00 공식 위챗 미니프로그램 오픈런 예약 필수. 현장 구매 거의 불가능.' },
          { title: '고속열차(CRH) 사전 예매', desc: '쿤밍↔대리↔리장↔샹그릴라 열차는 12306 공식 앱 또는 Trip.com에서 14일 전 예매 필수.' }
        ]
      }
    },

    cities: {
      subtabTitle: '운남 5대 도시 가이드',
      subtabIcon: 'fa-mountain-city',
      headerTitle: '중국 운남 5대 거점 완벽 가이드',
      headerDesc: '봄의 도시 쿤밍부터 옥룡설산, 잃어버린 낙원 샹그릴라까지 핵심 도시 정보를 확인하세요.',
      items: YUNNAN_DESTINATIONS
    },

    hasGoldenCourse: true,
    goldenItinerary: YUNNAN_13D_SCHEDULE,

    getGoldenItinerary(daysCount) {
      const count = daysCount || 13;
      const base = JSON.parse(JSON.stringify(YUNNAN_13D_SCHEDULE)).slice(0, count);
      for (let i = 14; i <= count; i++) {
        base.push({
          dayNum: i,
          date: `Day ${i}`,
          loc: '운남성 자유 여정',
          title: `운남성 자유 힐링 & 명소 탐방 Day ${i}`,
          desc: '현지 랜드마크 방문 및 자유 힐링 일정',
          timeline: [
            { time: "09:30", typeIcon: "🏛️", cat: "tour", title: "운남 로컬 명소 탐방", desc: "여유로운 고진 골목 산책", tip: "편안한 신발 착용", cost: "자유 소비", isDraft: false },
            { time: "12:30", typeIcon: "🍲", cat: "food", title: "운남 특산 미식 점심", desc: "현지 로컬 맛집 탐방", tip: "과교미선 및 버섯 요리", cost: "약 40元", isDraft: false },
            { time: "15:00", typeIcon: "🍵", cat: "shopping", title: "차마고도 전통 찻집 다도 체험", desc: "보이차 시음 및 기념품 쇼핑", tip: "보이차 품질 확인", cost: "자유 소비", isDraft: false },
            { time: "18:30", typeIcon: "🏮", cat: "food", title: "고성 야경 투어 및 저녁 만찬", desc: "화려한 야경 감상", tip: "야경 포토존 감상", cost: "약 50元", isDraft: false }
          ]
        });
      }
      return base;
    }
  };

  // Register in DKP registry
  if (window.DestinationRegistry) {
    window.DestinationRegistry.register(YunnanPack);
  }
  window.YunnanPack = YunnanPack;
})();
