/**
 * Sulsul-Travel Built-in Knowledge Base (kb-travel.js)
 * 100% Offline-First domain data for global travel, South America 3-week master plan,
 * multi-currency rates (including Argentina MEP rate), and packing checklists.
 */
window.KB_TRAVEL = {
  version: "1.0.0",
  currencies: {
    KRW: { name: "대한민국 원", symbol: "₩", rateToUSD: 1350, step: 1000, flag: "🇰🇷" },
    USD: { name: "미국 달러", symbol: "$", rateToUSD: 1.0, step: 1, flag: "🇺🇸" },
    PEN: { name: "페루 솔", symbol: "S/.", rateToUSD: 3.75, step: 5, flag: "🇵🇪", krwCalc: 360 },
    ARS: { name: "아르헨티나 페소", symbol: "$", rateToUSD: 980, mepRateToUSD: 1320, step: 1000, flag: "🇦🇷", isMepSupported: true },
    BRL: { name: "브라질 헤알", symbol: "R$", rateToUSD: 5.45, step: 5, flag: "🇧🇷", krwCalc: 250 },
    EUR: { name: "유로", symbol: "€", rateToUSD: 0.92, step: 1, flag: "🇪🇺" },
    JPY: { name: "일본 엔", symbol: "¥", rateToUSD: 155, step: 100, flag: "🇯🇵" }
  },

  categories: [
    { id: "flight", name: "항공/교통", icon: "✈️", color: "blue" },
    { id: "lodging", name: "숙소/호텔", icon: "🏨", color: "indigo" },
    { id: "food", name: "식비/미식", icon: "🍽️", color: "emerald" },
    { id: "tour", name: "관광/투어", icon: "🎟️", color: "amber" },
    { id: "shopping", name: "쇼핑/기념품", icon: "🛍️", color: "purple" },
    { id: "etc", name: "기타/비상금", icon: "💡", color: "slate" }
  ],

  destinations: {
    lax: {
      id: "lax",
      name: "로스앤젤레스 (LA)",
      country: "미국",
      flag: "🇺🇸",
      currency: "USD",
      altitude: 87,
      highlights: ["산타모니카 피어", "그리피스 천문대 야경", "할리우드 명예의 거리", "더 그로브"],
      foods: ["인앤아웃 버거", "북창동 순두부 본점", "핑크스 핫도그"],
      tips: "시차 적응을 위해 첫날 낮잠 금지, 우버(Uber) 이용 권장"
    },
    lim: {
      id: "lim",
      name: "리마 (Lima)",
      country: "페루",
      flag: "🇵🇪",
      currency: "PEN",
      altitude: 34,
      highlights: ["라르코마르 해안 절벽", "사랑의 공원", "아르마스 광장", "바랑코 예술거리"],
      foods: ["세비체 (Ceviche)", "안티쿠초 꼬치", "피스코 사워"],
      tips: "공항 호객 택시 절대 탑승 금지 (Green Taxi 또는 Uber 필수), 수돗물 음용 금지"
    },
    desert: {
      id: "desert",
      name: "와카치나 & 파라카스",
      country: "페루",
      flag: "🇵🇪",
      currency: "PEN",
      altitude: 400,
      highlights: ["바예스타 섬 물개/펭귄 보트", "칸델라브라 지상화", "듄 버기카 질주", "사막 샌드보딩"],
      foods: ["이카 타카마 와인 & 피스코", "오아시스 화덕피자"],
      tips: "버기카 탑승 시 마스크·선글라스·스마트폰 방수팩 필수"
    },
    cuz: {
      id: "cuz",
      name: "쿠스코 (Cusco)",
      country: "페루",
      flag: "🇵🇪",
      currency: "PEN",
      altitude: 3400,
      isHighAltitude: true,
      highlights: ["아르마스 광장", "12각의 돌", "산페드로 시장", "삭사이와만 거석요새"],
      foods: ["로모 살타도", "알파카 스테이크", "치차 모라다"],
      tips: "🚨 3,400m 급상승 고산지대! 첫날 4시간 이상 침대 수면 필수, 샤워/음주 절대 금지"
    },
    mp: {
      id: "mp",
      name: "마추픽추 (Machu Picchu)",
      country: "페루",
      flag: "🇵🇪",
      currency: "PEN",
      altitude: 2430,
      highlights: ["서킷 2 망지기의 집 엽서 뷰", "태양의 신전", "인티와타나", "페루레일 파노라마 열차"],
      foods: ["안데스 무지개송어 구이 (Trucha)", "잉카 고산 핸드드립 커피"],
      tips: "여권 원본 미지참 시 입장 불가, 우산 반입 금지(일회용 우비 필수)"
    },
    ba: {
      id: "ba",
      name: "부에노스아이레스",
      country: "아르헨티나",
      flag: "🇦🇷",
      currency: "ARS",
      altitude: 25,
      highlights: ["엘 아테네오 오페라 서점", "라 보카 카미니토", "레콜레타 묘지", "5월 광장 대통령궁"],
      foods: ["오조 데 비페 꽃등심 스테이크 (Don Julio)", "말벡 와인", "하바나 알파호르"],
      tips: "💳 신용카드 결제 시 MEP 우대환율 자동 적용(경비 30% 절감), 스마트폰 날치기 주의"
    },
    iguazu: {
      id: "iguazu",
      name: "이과수 폭포 (IGR ⇄ IGU)",
      country: "아르헨티나 / 브라질",
      flag: "🌊",
      currency: "ARS",
      altitude: 180,
      highlights: ["악마의 목구멍", "그란 아벤투라 폭포 보트", "브라질 275개 폭포 파노라마", "버드파크"],
      foods: ["수루비 민물고기 구이", "브라질 아사이베리 볼"],
      tips: "보트 투어 시 전자기기 방수팩 필수, 30분 국경 통과 시 양국 출입국 도장 확인"
    },
    rio: {
      id: "rio",
      name: "리우데자네이루",
      country: "브라질",
      flag: "🇧🇷",
      currency: "BRL",
      altitude: 5,
      highlights: ["코르코바두 거대 예수상", "슈가로프 산(빵산) 선셋", "코파카바나 해변", "셀라론 타일계단"],
      foods: ["슈하스코 무제한 바비큐", "페이조아다", "카이피리냐 칵테일"],
      tips: "해변에 고가품 소지 금지, 야간 이동 시 무조건 우버(Uber) 이용"
    }
  },

  // 10/11 출발 22일 풀 코스 시드 마스터 템플릿
  templates: {
    south_america_22d: {
      id: "south_america_22d",
      title: "남미 4개국 3주 최적화 황금 여정",
      subtitle: "LA 스탑오버 + 페루 잉카 + 아르헨티나 + 이과수 폭포 + 브라질 리우 22일",
      startDate: "2026-10-11",
      endDate: "2026-11-01",
      budget: 8500000,
      currency: "KRW",
      daysCount: 22,
      countries: ["미국", "페루", "아르헨티나", "브라질"],
      cities: ["로스앤젤레스", "리마", "와카치나", "파라카스", "쿠스코", "마추픽추", "부에노스아이레스", "이과수", "리우데자네이루"],
      days: [
        {
          dayNum: 1,
          date: "2026-10-11",
          cityKey: "lax",
          cityName: "로스앤젤레스",
          country: "미국",
          flag: "🇺🇸",
          title: "인천 출국 ✈️ LA 도착, 산타모니카 해변 선셋",
          isDraft: false,
          spots: [
            { time: "14:30", title: "인천공항 제2터미널 출국 수속", cat: "flight", cost: 0, curr: "KRW", memo: "여권 및 미국 ESTA 승인서 지참" },
            { time: "18:00", title: "인천(ICN) ✈️ LAX 직항 탑승", cat: "flight", cost: 0, curr: "KRW", memo: "비행 약 11시간 소요" },
            { time: "12:40", title: "LAX 공항 도착 & 입국 심사 (시차로 당일 도착)", cat: "flight", cost: 45, curr: "USD", memo: "우버 탑승하여 산타모니카 숙소로 이동" },
            { time: "16:00", title: "산타모니카 피어 & 66번 국도 종점 산책", cat: "tour", cost: 0, curr: "USD", memo: "태평양 황금빛 일몰 감상" },
            { time: "18:30", title: "인앤아웃 버거(In-N-Out) 석식", cat: "food", cost: 18, curr: "USD", memo: "더블더블 & 애니멀 스타일 감자튀김" },
            { time: "21:00", title: "호텔 복귀 및 시차 적응 휴식", cat: "lodging", cost: 160, curr: "USD", memo: "첫날 밤잠 푹 자기" }
          ]
        },
        {
          dayNum: 2,
          date: "2026-10-12",
          cityKey: "lax",
          cityName: "로스앤젤레스",
          country: "미국",
          flag: "🇺🇸",
          title: "할리우드 명예의 거리 & 그리피스 천문대 야경",
          isDraft: false,
          spots: [
            { time: "09:30", title: "할리우드 명예의 거리 & 돌비 극장", cat: "tour", cost: 0, curr: "USD", memo: "스타의 손도장 인증샷 촬영" },
            { time: "12:30", title: "더 그로브 몰 & 파머스 마켓 중식", cat: "food", cost: 25, curr: "USD", memo: "야외 트램 및 푸드코트" },
            { time: "15:00", title: "트레이더 조(Trader Joe's) 쇼핑", cat: "shopping", cost: 35, curr: "USD", memo: "베이글 솔트 시즈닝 & 에코백" },
            { time: "17:30", title: "그리피스 천문대 일몰 & LA 야경", cat: "tour", cost: 10, curr: "USD", memo: "<라라랜드> 명소, 핑크빛 선셋" },
            { time: "20:00", title: "북창동 순두부 본점(한인타운) 석식", cat: "food", cost: 26, curr: "USD", memo: "얼큰한 순두부로 남미 전 체력 충전" }
          ]
        },
        {
          dayNum: 3,
          date: "2026-10-13",
          cityKey: "lim",
          cityName: "리마",
          country: "페루",
          flag: "🇵🇪",
          title: "LA 출국 ✈️ 페루 리마 IN & 태평양 절벽 산책",
          isDraft: false,
          spots: [
            { time: "08:30", title: "LAX 공항 이동 & 리마행 비행기 탑승", cat: "flight", cost: 0, curr: "USD", memo: "비행 약 8시간 30분 소요" },
            { time: "18:00", title: "리마 호르헤 차베스 국제공항(LIM) 도착", cat: "flight", cost: 65, curr: "PEN", memo: "공항 내 Green Taxi 부스 이용" },
            { time: "19:30", title: "미라플로레스 호텔 체크인", cat: "lodging", cost: 85, curr: "USD", memo: "태평양 해안가 안전지대 숙소" },
            { time: "20:30", title: "라르코마르(Larcomar) 야경 & 세비체 만찬", cat: "food", cost: 80, curr: "PEN", memo: "신선한 원조 세비체와 피스코 사워" }
          ]
        },
        {
          dayNum: 4,
          date: "2026-10-14",
          cityKey: "desert",
          cityName: "파라카스 & 와카치나",
          country: "페루",
          flag: "🇵🇪",
          title: "바예스타 섬 물개 투어 & 와카치나 사막 듄 버기카",
          isDraft: false,
          spots: [
            { time: "06:30", title: "리마 $\rightarrow$ 파라카스 우등버스(크루즈델수르)", cat: "flight", cost: 60, curr: "PEN", memo: "태평양 팬아메리칸 고속도로 3.5시간" },
            { time: "10:30", title: "바예스타 섬 스피드보트 투어", cat: "tour", cost: 70, curr: "PEN", memo: "수천 마리 바다사자, 물개, 훔볼트 펭귄" },
            { time: "13:00", title: "파라카스 해산물 점심 & 와카치나 이동", cat: "food", cost: 45, curr: "PEN", memo: "차량 1시간 소요" },
            { time: "16:00", title: "와카치나 듄 버기카 & 샌드보딩", cat: "tour", cost: 60, curr: "PEN", memo: "거대 사구 롤러코스터 질주 & 일몰 감상" },
            { time: "19:30", title: "와카치나 $\rightarrow$ 리마 심야 우등버스 복귀", cat: "flight", cost: 65, curr: "PEN", memo: "리마 호텔 복귀 심야 취침" }
          ]
        },
        {
          dayNum: 5,
          date: "2026-10-15",
          cityKey: "lim",
          cityName: "리마",
          country: "페루",
          flag: "🇵🇪",
          title: "리마 역사지구 탐방 & 미식의 수도 풀코스",
          isDraft: false,
          spots: [
            { time: "10:00", title: "리마 아르마스 광장 & 대성당", cat: "tour", cost: 15, curr: "PEN", memo: "스페인 식민 바로크 양식 감상" },
            { time: "11:30", title: "산 프란시스코 수도원 카타콤(지하묘지)", cat: "tour", cost: 20, curr: "PEN", memo: "2만 5천 구 유골이 보존된 신비한 회랑" },
            { time: "13:30", title: "미라플로레스 La Mar 세비체 중식", cat: "food", cost: 95, curr: "PEN", memo: "세계 50대 레스토랑 선정 미식" },
            { time: "16:00", title: "바랑코 예술거리 & 탄식의 다리", cat: "tour", cost: 0, curr: "PEN", memo: "낭만적인 벽화와 로컬 카페" },
            { time: "19:00", title: "Panchita 안티쿠초 숯불구이 석식", cat: "food", cost: 85, curr: "PEN", memo: "다이아막스 고산약 복용 준비" }
          ]
        },
        {
          dayNum: 6,
          date: "2026-10-16",
          cityKey: "cuz",
          cityName: "쿠스코",
          country: "페루",
          flag: "🇵🇪",
          title: "리마 ✈️ 쿠스코(3,400m) 급상승 & 고산 적응 필수 수면",
          isDraft: false,
          spots: [
            { time: "07:30", title: "리마(LIM) ✈️ 쿠스코(CUZ) 국내선 비행", cat: "flight", cost: 0, curr: "USD", memo: "안데스 산맥 상공 1시간 20분" },
            { time: "10:30", title: "쿠스코 공항 도착 & 호텔 이동", cat: "flight", cost: 30, curr: "PEN", memo: "해발 3,400m 진입 - 천천히 걷기" },
            { time: "11:30", title: "코카차 음용 & 호텔 침대 4시간 필수 낮잠", cat: "lodging", cost: 90, curr: "USD", memo: "🚨 첫날 무리하면 두통 극심. 절대 수면 휴식!" },
            { time: "16:30", title: "쿠스코 아르마스 광장 슬로우 산책", cat: "tour", cost: 0, curr: "PEN", memo: "심호흡하며 야경 감상" },
            { time: "18:30", title: "가벼운 스프 & 닭죽 석식", cat: "food", cost: 35, curr: "PEN", memo: "소화 부담 없는 가벼운 식사, 음주 금지" }
          ]
        },
        {
          dayNum: 7,
          date: "2026-10-17",
          cityKey: "mp",
          cityName: "마추픽추",
          country: "페루",
          flag: "🇵🇪",
          title: "구름 위의 공중도시 마추픽추(2,430m) 전일 탐방",
          isDraft: false,
          spots: [
            { time: "05:00", title: "쿠스코 $\rightarrow$ 오얀타이탐보 역 이동", cat: "flight", cost: 35, curr: "USD", memo: "이른 새벽 기차역 셔틀 이동" },
            { time: "07:05", title: "페루레일 파노라마 열차 탑승", cat: "tour", cost: 0, curr: "USD", memo: "안데스 급류 협곡 통유리창 감상" },
            { time: "08:45", title: "아구아스 칼리엔테스 셔틀버스 환승", cat: "tour", cost: 24, curr: "USD", memo: "지그재그 25분 산길 등판" },
            { time: "09:30", title: "마추픽추 서킷 2 클래식 뷰 완벽 탐방", cat: "tour", cost: 0, curr: "USD", memo: "망지기의 집 엽서 뷰, 태양의 신전, 인티와타나" },
            { time: "14:30", title: "하산 및 송어구이(Trucha) 점심", cat: "food", cost: 55, curr: "PEN", memo: "안데스 청정 빙하수 송어 버터구이" },
            { time: "17:00", title: "페루레일 기차 $\rightarrow$ 쿠스코 복귀", cat: "flight", cost: 0, curr: "USD", memo: "쿠스코 호텔 복귀 숙면" }
          ]
        }
      ]
    }
  },

  packingChecklist: [
    { cat: "필수 서류/머니", items: ["여권 원본 (유효기간 6개월 이상)", "미국 ESTA 승인서 출력본", "해외결제 신용카드 2종 (트래블로그/비자)", "비상용 미국 달러 현금 (100달러 신권)", "항공권 E-티켓 및 호텔 바우처"] },
    { cat: "의약품/건강", items: ["다이아막스 (쿠스코 고산병 처방약)", "지사제 및 정장제 (물갈이 대비)", "종합감기약 및 진통소염제 (타이레놀)", "대일밴드 및 소독용 스왑", "인공눈물 및 립밤 (건조한 사막/고산)"] },
    { cat: "전자기기", items: ["보조배터리 20,000mAh (기내 수하물 필수)", "만능 멀티 어댑터 (110V/220V)", "스마트폰 분실방지 목걸이 스트랩 (소매치기 방지)", "방수팩 (이과수 보트 투어 필수)", "노이즈캔슬링 이어폰 (장거리 비행)"] },
    { cat: "의류 및 장비", items: ["초경량 다운패딩 (쿠스코 일교차 15℃)", "1회용 우비 3개 (마추픽추/이과수 필수)", "선글라스 & 챙 넓은 모자 (사막 자외선)", "편안한 트레킹화/운동화", "수영복 또는 래시가드 (이과수 보트)"] }
  ]
};
