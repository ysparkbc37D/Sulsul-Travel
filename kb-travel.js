/**
 * Sulsul-Travel Built-in Knowledge Base (kb-travel.js) v1.8.4
 * 100% Offline-First domain data for global travel, South America 22-Day Master Plan v9,
 * multi-currency rates (including Argentina MEP rate), and packing checklists.
 */

// 1. Pristine 2026 22-Day South America Schedule Data (아르헨티나 최적화 & 엘찰텐 1박 v9)
const scheduleOct11Data = [
  {
    day: "DAY 01", date: "10월 11일 (일)", loc: "대한민국 · 인천 / 캐나다 · 밴쿠버", flight: "✈️ 인천(ICN) ➔ 밴쿠버(YVR) 에어캐나다 AC062",
    title: "인천 ➔ 부에노스아이레스 출국 및 밴쿠버 향발",
    desc: "인천공항 제1여객터미널 출국 수속 및 에어캐나다 탑승, 밴쿠버 향발 장거리 비행 시작",
    timeline: [
      { time: "14:00 - 14:30", typeIcon: "🧳", title: "인천공항 제1여객터미널 도착 및 수속 준비", desc: "자택 ➔ 인천공항 T1 | 교통: 공항철도/리무진 (60분)", tip: "출국 3시간 45분 전 도착, 여권 유효기간(6개월 이상) 최종 확인", mapQuery: "Incheon+International+Airport" },
      { time: "14:30 - 15:30", typeIcon: "🛂", title: "에어캐나다(AC) 체크인 카운터 수속 및 위탁수하물 위탁", desc: "인천공항 T1 ➔ AC 체크인 카운터 | 교통: 도보", tip: "위탁수하물 1개(23kg) 태그 부착, 밴쿠버 경유 수하물 자동연결 여부 카운터 재확인", mapQuery: "Incheon+Airport+Air+Canada" },
      { time: "15:30 - 16:30", typeIcon: "💳", title: "트래블카드 사전 충전 확인 및 공항 은행 비상 달러 수령", desc: "인천공항 T1 ➔ 면세구역 | 교통: 도보", tip: "100달러 신권(빳빳하고 훼손 없는 지폐) 소액 수령 및 남미 4개국 eSIM 등록", mapQuery: "Incheon+Airport+Terminal+1" },
      { time: "16:30 - 17:45", typeIcon: "🚪", title: "보안검색 및 출국심사 통과 후 탑승 게이트 대기", desc: "면세구역 ➔ 탑승 게이트 | 교통: 도보", tip: "기내용 배낭에 치약/칫솔, 보조배터리, 겉옷 패딩 챙기기", mapQuery: "Incheon+Airport+Boarding+Gate" },
      { time: "17:45 ~", typeIcon: "✈️", title: "에어캐나다 AC062편 탑승 및 밴쿠버 향발 이륙", desc: "인천공항 (ICN) ➔ 밴쿠버공항 (YVR) | 교통: 에어캐나다 항공편 (9시간 40분)", tip: "비행 중 기내식 및 수면 안대 활용 시차 적응 시작", mapQuery: "Vancouver+International+Airport" }
    ]
  },
  {
    day: "DAY 02", date: "10월 12일 (월)", loc: "캐나다 · 밴쿠버 / 토론토", flight: "✈️ 밴쿠버(YVR) ➔ 토론토(YYZ) ➔ 부에노스(EZE)",
    title: "캐나다 밴쿠버 & 토론토 환승 후 남미 야간비행",
    desc: "밴쿠버 도착 후 입국심사, 토론토 경유하여 부에노스아이레스행 장거리 야간비행 탑승",
    timeline: [
      { time: "11:30 - 13:00", typeIcon: "🛂", title: "밴쿠버(YVR) 도착 및 캐나다 첫 입국심사(CBSA 키오스크)", desc: "기내 ➔ 밴쿠버공항 환승구역 | 교통: 도보", tip: "환승시간 1시간 30분으로 타이트함. Advance CBSA 모바일 신고서 미리 작성 필수. 수하물은 자동 연결", mapQuery: "Vancouver+International+Airport" },
      { time: "13:00 - 20:35", typeIcon: "✈️", title: "밴쿠버발 토론토(YYZ)행 국내선 연결편 탑승", desc: "밴쿠버공항 (YVR) ➔ 토론토공항 (YYZ) | 교통: 에어캐나다 항공편 (4시간 35분)", tip: "캐나다 동서 횡단 비행, 기내 간단한 수분 섭취", mapQuery: "Toronto+Pearson+International+Airport" },
      { time: "20:35 - 23:10", typeIcon: "🔄", title: "토론토 피어슨 공항 도착 후 국제선 환승 게이트 이동", desc: "토론토공항 T1 ➔ 국제선 게이트 | 교통: 도보 (20분)", tip: "추가 입국심사 없음, 게이트 전광판에서 부에노스아이레스행 탑승구 확인", mapQuery: "Toronto+Pearson+Terminal+1" },
      { time: "23:10 ~", typeIcon: "✈️", title: "토론토발 부에노스아이레스(EZE)행 장거리 야간비행 탑승", desc: "토론토공항 (YYZ) ➔ 부에노스아이레스 (EZE) | 교통: 에어캐나다 항공편 (10시간 20분)", tip: "장거리 야간 비행, 기내 숙면 필수 (현지 시각 맞추기)", mapQuery: "Ministro+Pistarini+International+Airport" }
    ]
  },
  {
    day: "DAY 03", date: "10월 13일 (화)", loc: "아르헨티나 · 부에노스아이레스", flight: "🛬 에세이사 국제공항(EZE) 도착",
    title: "부에노스아이레스 도착 & 센트로 탐방 & 돈 훌리오 스테이크",
    desc: "아르헨티나 입국, 센트로 역사 지구 산책, 세계 최고의 스테이크 하우스 미식 체험",
    timeline: [
      { time: "10:30 - 11:30", typeIcon: "🛬", title: "에세이사 공항(EZE) 도착 및 아르헨티나 입국심사", desc: "기내 ➔ 수하물 수취대 | 교통: 도보", tip: "무비자 90일 입국 스탬프 확인, 수하물 수취", mapQuery: "Ministro+Pistarini+International+Airport" },
      { time: "11:30 - 12:30", typeIcon: "🚕", title: "우버(Uber) 또는 공항 택시 탑승 센트로 숙소 이동", desc: "에세이사 공항 ➔ 센트로 7월 9일 대로 숙소 | 교통: 차량 (50분)", tip: "공항 내 무료 Wi-Fi로 Uber 호출, 트래블카드 결제 (MEP 자동 적용)", mapQuery: "Avenida+9+de+Julio+Buenos+Aires" },
      { time: "12:30 - 14:00", typeIcon: "🏨", title: "호텔 체크인/짐 보관 및 7월 9일 대로 오벨리스크 산책", desc: "센트로 호텔 ➔ 오벨리스크 광장 | 교통: 도보 (10분)", tip: "세계에서 가장 넓은 대로, 상징 오벨리스크 인증샷", mapQuery: "Obelisco+Buenos+Aires" },
      { time: "14:00 - 15:30", typeIcon: "☕", title: "카페 토르토니 (Café Tortoni) 1858년 전통 카페 티타임", desc: "오벨리스크 ➔ 카페 토르토니 | 교통: 도보 (12분)", tip: "부에노스에서 가장 유서 깊은 카페. 초콜릿 음료와 추로스 추천", mapQuery: "Cafe+Tortoni+Buenos+Aires" },
      { time: "15:30 - 17:30", typeIcon: "🏛️", title: "5월 광장(Plaza de Mayo) 및 분홍빛 대통령궁(Casa Rosada)", desc: "카페 토르토니 ➔ 5월 광장 | 교통: 도보 (8분)", tip: "에비타가 연설했던 발코니와 대성당 산마르틴 장군 영묘 관람", mapQuery: "Plaza+de+Mayo+Buenos+Aires" },
      { time: "17:30 - 19:30", typeIcon: "🚶", title: "푸에르토 마데로 (Puerto Madero) 여인의 다리 석양 산책", desc: "5월 광장 ➔ 푸에르토 마데로 수변 | 교통: 도보 (15분)", tip: "치안이 가장 안전하고 모던한 항구 수변 산책로", mapQuery: "Puente+de+la+Mujer+Buenos+Aires" },
      { time: "20:00 - 22:30", typeIcon: "🥩", title: "돈 훌리오 (Don Julio) 아사도 스테이크 디너", desc: "푸에르토 마데로 ➔ 팔레르모 돈 훌리오 | 교통: 우버 (20분)", tip: "세계 50대 레스토랑. 예약 필수! Ojo de Bife(꽃등심) + 말벡 와인", mapQuery: "Don+Julio+Buenos+Aires" }
    ]
  },
  {
    day: "DAY 04", date: "10월 14일 (수)", loc: "아르헨티나 · 부에노스아이레스", flight: "🚕 시내 투어 & 탱고의 밤",
    title: "레콜레타 문화 산책 & 라 벤타나 정통 탱고 디너쇼",
    desc: "세계에서 가장 아름다운 서점, 에비타 묘역, 밤을 수놓는 정통 아르헨티나 탱고 쇼",
    timeline: [
      { time: "09:30 - 11:30", typeIcon: "📖", title: "엘 아테네오 그랜드 스플렌디드 서점 방문", desc: "숙소 ➔ 엘 아테네오 (El Ateneo) | 교통: 우버/도보 (15분)", tip: "100년 된 오페라 극장을 개조한 서점. 무대 위 카페에서 커피 한잔", mapQuery: "El+Ateneo+Grand+Splendid" },
      { time: "11:30 - 13:30", typeIcon: "⚰️", title: "레콜레타 묘지 (Cementerio de la Recoleta) 에비타 묘역", desc: "엘 아테네오 ➔ 레콜레타 묘지 | 교통: 도보 (15분)", tip: "조각 예술품 같은 대리석 묘원. 에바 페론(에비타) 묘소 헌화", mapQuery: "Cementerio+de+la+Recoleta" },
      { time: "13:30 - 15:00", typeIcon: "🍽️", title: "레콜레타 광장 노천 비스트로 점심 식사", desc: "레콜레타 묘지 앞 광장 카페 | 교통: 도보", tip: "밀라네사(남미식 비프까스)와 샐러드로 가벼운 식사", mapQuery: "Plaza+Francia+Buenos+Aires" },
      { time: "15:00 - 17:30", typeIcon: "🎨", title: "라 보카 (La Boca) 카미니토 알록달록 골목길 탐방", desc: "레콜레타 ➔ 라 보카 카미니토 | 교통: 우버 (25분)", tip: "탱고 발상지. 원색의 함석 가옥과 길거리 탱고 댄서 (관광 구역 외 이탈 금지)", mapQuery: "Caminito+La+Boca" },
      { time: "17:30 - 19:30", typeIcon: "🏨", title: "호텔 복귀 휴식 및 탱고 쇼 복장 정돈", desc: "라 보카 ➔ 센트로 호텔 | 교통: 우버 (20분)", tip: "스마트 캐주얼 복장 착용", mapQuery: "Buenos+Aires+Downtown" },
      { time: "20:00 - 23:30", typeIcon: "💃", title: "라 벤타나 (La Ventana) 정통 탱고 디너쇼", desc: "호텔 ➔ 산텔모 라 벤타나 | 교통: 우버/픽업 (15분)", tip: "3코스 디너 + 와인 무제한 + 라이브 오케스트라 탱고 공연", mapQuery: "La+Ventana+Tango+Buenos+Aires" }
    ]
  },
  {
    day: "DAY 05", date: "10월 15일 (목)", loc: "아르헨티나 · 부에노스아이레스 / 엘 칼라파테", flight: "✈️ 부에노스(AEP) ➔ 엘 칼라파테(FTE) AR1824",
    title: "파타고니아의 관문 엘 칼라파테 입성 & 양고기 통구이",
    desc: "국내선 공항 이동, 파타고니아 빙하 도시 비행, 전통 어린 양고기 아사도 디너",
    timeline: [
      { time: "05:30 - 06:30", typeIcon: "🚕", title: "호텔 체크아웃 및 아에로파르케 국내선 공항(AEP) 이동", desc: "센트로 호텔 ➔ 아에로파르케 공항 | 교통: 우버 (20분)", tip: "시내 중심에서 가까운 AEP 공항 이용. 출발 2시간 전 도착", mapQuery: "Aeroparque+Jorge+Newbery" },
      { time: "06:30 - 08:00", typeIcon: "🛂", title: "아에로라인 아르헨티나스 탑승 수속 및 게이트 대기", desc: "AEP 터미널 내 | 교통: 도보", tip: "국내선 위탁수하물 15kg 규정 확인", mapQuery: "Aeroparque+Domestic+Terminal" },
      { time: "08:00 - 11:20", typeIcon: "✈️", title: "AEP발 엘 칼라파테(FTE)행 비행 (3시간 20분)", desc: "아에로파르케 ➔ 엘 칼라파테 공항 | 교통: 항공편", tip: "착륙 30분 전 창밖으로 안데스 설산과 청록색 아르헨티노 호수 감상", mapQuery: "El+Calafate+Airport" },
      { time: "11:20 - 12:30", typeIcon: "🚐", title: "칼라파테 공항 도착 및 셔틀버스(Vespatagonia) 시내 이동", desc: "FTE 공항 ➔ 칼라파테 시내 호텔 | 교통: 공항 셔틀 (25분)", tip: "입국장 카운터에서 왕복 셔틀 티켓 구매", mapQuery: "El+Calafate+Centro" },
      { time: "12:30 - 14:30", typeIcon: "🏨", title: "호텔 체크인 및 산 마르틴 중심가 산책", desc: "호텔 ➔ 아베니다 산 마르틴 | 교통: 도보", tip: "목조풍 아기자기한 상점가, 초콜릿 가게, 아웃도어 매장 구경", mapQuery: "Avenida+del+Libertador+El+Calafate" },
      { time: "14:30 - 17:00", typeIcon: "🎫", title: "다음날 모레노 빙하 국립공원 입장권 및 투어 바우처 점검", desc: "시내 여행사 / 카페 | 교통: 도보", tip: "국립공원 온라인 티켓 사전 다운로드 (모바일 QR)", mapQuery: "Parque+Nacional+Los+Glaciares" },
      { time: "18:00 - 20:30", typeIcon: "🍖", title: "La Tablita 파타고니아 어린 양고기(Cordero) 통구이 디너", desc: "호텔 ➔ La Tablita 레스토랑 | 교통: 도보 (10분)", tip: "장작불에 구워내는 파타고니아 전통 양갈비 구이 최고 맛집", mapQuery: "La+Tablita+El+Calafate" }
    ]
  },
  {
    day: "DAY 06", date: "10월 16일 (금)", loc: "아르헨티나 · 엘 칼라파테 (페리토 모레노)", flight: "🚌 페리토 모레노 빙하 국립공원 데이투어",
    title: "페리토 모레노 거대 빙하 탐방 & 사파리 나우티코 보트",
    desc: "천둥소리와 함께 무너져 내리는 푸른 빙벽, 보트를 타고 코앞에서 조망하는 대자연의 경이",
    timeline: [
      { time: "08:30 - 10:00", typeIcon: "🚌", title: "투어 버스 탑승 및 로스 글라시아레스 국립공원 이동", desc: "칼라파테 숙소 픽업 ➔ 국립공원 전망대 | 교통: 투어 버스 (80km, 1시간 30분)", tip: "가는 길 아르헨티노 호수와 안데스 자작나무 숲길 뷰 포인트", mapQuery: "Parque+Nacional+Los+Glaciares" },
      { time: "10:00 - 13:00", typeIcon: "🧊", title: "페리토 모레노 빙하 목재 데크 산책로 (Walkway) 트레킹", desc: "빙하 전망대 데크 코스 | 교통: 도보 (3시간)", tip: "상·중·하단 코스 완주. 굉음을 내며 호수로 쏟아지는 빙벽 붕락(Calving) 포착", mapQuery: "Perito+Moreno+Glacier" },
      { time: "13:00 - 14:00", typeIcon: "🥪", title: "빙하 전망 레스토랑 또는 데크 벤치 피크닉 점심", desc: "전망대 쉼터 | 교통: 도보", tip: "도시락 샌드위치 먹으며 빙하 파노라마 감상", mapQuery: "Perito+Moreno+Walkways" },
      { time: "14:30 - 15:45", typeIcon: "⛵", title: "사파리 나우티코 (Safari Nautico) 빙하 근접 유람선 보트", desc: "바호 데 라스 솜브라스 선착장 ➔ 빙하 남벽 | 교통: 유람선 (60분)", tip: "높이 70m의 거대한 푸른 얼음 성벽 바로 300m 앞까지 항해", mapQuery: "Bajo+de+las+Sombras" },
      { time: "16:00 - 17:30", typeIcon: "🚌", title: "투어 버스 복귀 칼라파테 시내 도착", desc: "국립공원 ➔ 칼라파테 시내 호텔 | 교통: 투어 버스 (1시간 30분)", tip: "숙소 복귀 후 따뜻한 샤워로 몸 녹이기", mapQuery: "El+Calafate+Centro" },
      { time: "18:30 - 20:30", typeIcon: "🍻", title: "칼라파테 수제 맥주 펍 & 엠파나다 저녁 식사", desc: "시내 중심가 펍 | 교통: 도보", tip: "로컬 맥주 Calafate Berry Ale과 따뜻한 쇠고기 엠파나다", mapQuery: "El+Calafate+Pub" }
    ]
  },
  {
    day: "DAY 07", date: "10월 17일 (토)", loc: "아르헨티나 · 엘 칼라파테 ➔ 엘 찰텐", flight: "🚌 치텐 버스 08:00 출발 (3시간 소요)",
    title: "엘 찰텐 이동 & 피츠로이 카프리 호수(Laguna Capri) 트레킹 & 1박",
    desc: "트레커들의 성지 엘 찰텐 입성, 에메랄드빛 카프리 호수와 웅장한 피츠로이 3봉 조망",
    timeline: [
      { time: "07:00 - 07:45", typeIcon: "🎒", title: "체크아웃 및 큰 캐리어 칼라파테 숙소 무료 보관", desc: "호텔 프론트 ➔ 버스터미널 이동 | 교통: 택시/도보 (10분)", tip: "1박용 배낭(트레킹화, 방한의류, 보조배터리, 세면도구)만 패킹!", mapQuery: "Terminal+de+Omnibus+El+Calafate" },
      { time: "08:00 - 11:00", typeIcon: "🚌", title: "치텐(Chalten Travel) 버스 탑승 엘 찰텐 향발", desc: "칼라파테 터미널 ➔ 엘 찰텐 버스터미널 | 교통: 고속버스 (3시간)", tip: "이동 중 차창 밖으로 비에드마 호수와 피츠로이 원경 조망", mapQuery: "El+Chalten+Bus+Terminal" },
      { time: "11:00 - 11:30", typeIcon: "📋", title: "국립공원 방문자센터(CEF) 하차 브리핑 및 숙소 체크인", desc: "터미널 ➔ 엘 찰텐 숙소 | 교통: 도보 (10분)", tip: "기상 상황 및 트레일 안전 지침 확인", mapQuery: "Centro+de+Visitantes+El+Chalten" },
      { time: "11:30 - 12:30", typeIcon: "🥪", title: "마을 베이커리 행동식(엠파나다, 샌드위치, 생수) 구매 및 정비", desc: "엘 찰텐 마을 메인 스트리트 | 교통: 도보", tip: "산행 중 쓰레기 되가져오기 봉투 챙기기", mapQuery: "El+Chalten+San+Martin" },
      { time: "12:30 - 17:00", typeIcon: "🥾", title: "피츠로이 카프리 호수 (Laguna Capri) 트레킹 (왕복 4~5시간)", desc: "트레일헤드 ➔ 카프리 호수 ➔ 복귀 | 교통: 도보 트레킹 (왕복 8km)", tip: "자작나무 숲길 지나 탁 트인 호수 너머로 피츠로이 3대 봉봉이 병풍처럼 펼쳐짐", mapQuery: "Laguna+Capri+El+Chalten" },
      { time: "17:30 - 19:00", typeIcon: "🍺", title: "Cervecería Chaltén 수제 생맥주 브루어리 하산주", desc: "마을 브루어리 | 교통: 도보", tip: "전 세계 트레커들과 어울리며 즐기는 로컬 IPA와 수제 버거", mapQuery: "Cerveceria+Chalten" },
      { time: "19:00 - 21:00", typeIcon: "🍲", title: "따뜻한 스튜(Guiso) 저녁 식사 및 찰텐 롯지 휴식", desc: "마을 레스토랑 ➔ 숙소 | 교통: 도보", tip: "내일 새벽 콘도레스 일출을 위해 일찍 취침", mapQuery: "El+Chalten+Lodge" }
    ]
  },
  {
    day: "DAY 08", date: "10월 18일 (일)", loc: "아르헨티나 · 엘 찰텐 ➔ 엘 칼라파테", flight: "🚌 엘 찰텐 ➔ 칼라파테 복귀 버스 18:00",
    title: "콘도레스 일출 & 초리요 폭포 산책 & 칼라파테 복귀",
    desc: "피츠로이를 붉게 물들이는 황금 일출 감상, 고요한 숲속 폭포 산책 후 칼라파테 복귀",
    timeline: [
      { time: "06:30 - 08:00", typeIcon: "🌅", title: "미라도르 로스 콘도레스 (Mirador Los Cóndores) 일출 산책", desc: "숙소 ➔ 콘도레스 전망대 왕복 | 교통: 도보 (왕복 1.5시간)", tip: "아침 햇살에 피츠로이 봉우리가 붉은 금빛으로 타오르는 장관", mapQuery: "Mirador+Los+Condores+El+Chalten" },
      { time: "08:30 - 09:30", typeIcon: "🍳", title: "숙소 복귀 조식 및 체크아웃(짐 보관)", desc: "엘 찰텐 숙소 | 교통: 도보", tip: "따뜻한 커피와 빵으로 든든하게 아침 보충", mapQuery: "El+Chalten+Centro" },
      { time: "10:00 - 13:00", typeIcon: "🌊", title: "초리요 델 살토 (Chorrillo del Salto) 숲속 폭포 트레킹", desc: "마을 북단 ➔ 폭포 왕복 | 교통: 평지 도보 (왕복 6km, 3시간)", tip: "원시림 숲속 길을 걷다 만나는 20m 높이의 청량한 폭포", mapQuery: "Chorrillo+del+Salto" },
      { time: "13:30 - 15:00", typeIcon: "☕", title: "찰텐 아기자기한 감성 카페 점심 및 휴식", desc: "마을 베이커리 카페 | 교통: 도보", tip: "수제 와플, 핫초코 마시며 여유로운 시간", mapQuery: "El+Chalten+Bakery" },
      { time: "17:30 - 18:00", typeIcon: "🚌", title: "엘 찰텐 버스터미널 이동 및 탑승 준비", desc: "마을 ➔ 터미널 | 교통: 도보 (10분)", tip: "배낭 수령 후 버스 탑승구 대기", mapQuery: "El+Chalten+Bus+Terminal" },
      { time: "18:00 - 21:00", typeIcon: "🚌", title: "치텐 버스 탑승 엘 칼라파테 복귀 (3시간 소요)", desc: "엘 찰텐 ➔ 칼라파테 버스터미널 | 교통: 고속버스", tip: "칼라파테 터미널 도착 후 택시로 원래 숙소 이동 및 보관 캐리어 수령", mapQuery: "Terminal+de+Omnibus+El+Calafate" },
      { time: "21:30 ~", typeIcon: "🏨", title: "칼라파테 호텔 체크인 및 내일 칠레 국경 통과 짐 정리", desc: "칼라파테 숙소 | 교통: 도보", tip: "내일 칠레 입국 시 농산물/과일/견과류/육류 반입 엄격 금지! 배낭 철저 점검", mapQuery: "El+Calafate+Hotel" }
    ]
  },
  {
    day: "DAY 09", date: "10월 19일 (월)", loc: "아르헨티나 · 엘 칼라파테 ➔ 칠레 · 푸에르토나탈레스", flight: "🚌 국경 통과 버스 07:00 출발 (5시간 30분 소요)",
    title: "파타고니아 국경 통과 (아르헨티나 ➔ 칠레) & 나탈레스 킹크랩",
    desc: "장대한 팜파스를 가로질러 칠레 입국, 피오르드 항구 도시 푸에르토나탈레스 입성",
    timeline: [
      { time: "06:15 - 06:45", typeIcon: "🚕", title: "호텔 체크아웃 및 칼라파테 버스터미널 이동", desc: "호텔 ➔ 터미널 | 교통: 택시 (5분)", tip: "여권, 칠레 PDI 입국신고서 준비", mapQuery: "Terminal+de+Omnibus+El+Calafate" },
      { time: "07:00 - 10:30", typeIcon: "🚌", title: "Cootra / Bus-Sur 국제 버스 출발 국경 이동", desc: "칼라파테 ➔ 칸차 카레라(아르헨티나 국경 출입국) | 교통: 국제버스 (3시간 30분)", tip: "끝없는 황금빛 파타고니아 대평원 팜파스 주행", mapQuery: "Paso+Rio+Don+Guillermo" },
      { time: "10:30 - 11:45", typeIcon: "🛂", title: "아르헨티나 출국 ➔ 칠레 입국 심사 (Cerro Castillo SAG 검역)", desc: "국경 검문소 | 교통: 버스 하차 대기", tip: "칠레 SAG 검역관이 모든 짐 X-ray 투시. 과일, 육포, 생견과류 적발 시 벌금 주의!", mapQuery: "Paso+Fronterizo+Rio+Don+Guillermo" },
      { time: "11:45 - 12:30", typeIcon: "🚌", title: "칠레 국경 통과 후 푸에르토나탈레스 버스터미널 도착", desc: "국경 ➔ 나탈레스 터미널 | 교통: 버스 (45분)", tip: "칠레 시간은 아르헨티나와 동일하거나 1시간 차이 (시계 확인)", mapQuery: "Rodoviario+Puerto+Natales" },
      { time: "12:30 - 14:00", typeIcon: "🏨", title: "호텔 체크인 및 시내 중심가 환전/통신 점검", desc: "터미널 ➔ 호텔 | 교통: 택시/도보 (10분)", tip: "칠레 페소(CLP) 카드 사용 준비", mapQuery: "Puerto+Natales+Centro" },
      { time: "14:30 - 17:00", typeIcon: "🌊", title: "울티마 에스페란사(최후의 희망) 피오르드 해안가 산책", desc: "호텔 ➔ 해안 산책로 | 교통: 도보", tip: "오래된 목조 부두 기둥과 검은목두루미 서식지 풍경", mapQuery: "Muelle+Historico+Puerto+Natales" },
      { time: "18:00 - 20:30", typeIcon: "🦀", title: "Santolla 칠레산 마가야네스 킹크랩(Centolla) 디너", desc: "시내 중심 레스토랑 | 교통: 도보", tip: "신선한 통 킹크랩 살과 버터 레몬 소스, 화이트 와인 페어링", mapQuery: "Santolla+Puerto+Natales" }
    ]
  },
  {
    day: "DAY 10", date: "10월 20일 (화)", loc: "칠레 · 푸에르토나탈레스 (토레스 델 파이네)", flight: "🚌 삼봉 베이스 트레킹 투어 06:30 출발",
    title: "토레스 델 파이네 삼봉(Mirador Las Torres) 베이스 20km 하이라이트",
    desc: "비취색 빙하호수 위에 우뚝 솟은 3개의 화강암 첨탑! 파타고니아 최고의 트레킹",
    timeline: [
      { time: "06:30 - 08:30", typeIcon: "🚌", title: "투어 셔틀 탑승 국립공원 센트로 웰컴센터(Laguna Amarga) 이동", desc: "나탈레스 ➔ 센트럴 웰컴센터 | 교통: 셔틀버스 (2시간)", tip: "입장권 사전 구매 QR 준비, 웰컴센터에서 화장실 이용", mapQuery: "Torres+del+Paine+Welcome+Center" },
      { time: "08:30 - 11:30", typeIcon: "🥾", title: "1구간: 칠레노 산장(Refugio Chileno) 방면 오르막 트레킹", desc: "웰컴센터 ➔ 아센시오 계곡 ➔ 칠레노 산장 | 교통: 도보 (5.5km, 2.5시간)", tip: "아센시오 강 협곡을 따라 오르는 코스. 칠레노 산장에서 식수 보충", mapQuery: "Refugio+Chileno" },
      { time: "11:30 - 12:30", typeIcon: "🌲", title: "2구간: 자작나무 숲길(Lengas Forest) 숲속 완경사 통과", desc: "칠레노 산장 ➔ 모레인 자갈밭 입구 | 교통: 도보 (3km, 1시간)", tip: "바람을 막아주는 평온한 원시림 구간", mapQuery: "Sendero+Mirador+Base+las+Torres" },
      { time: "12:30 - 13:45", typeIcon: "🧗", title: "3구간: 거대 빙퇴석(Moraine) 자갈 바위 급경사 구간 돌파", desc: "숲 끝 ➔ 라스 토레스 전망대 | 교통: 바위 지대 도보 (1km, 1시간 15분)", tip: "가장 힘든 난코스! 등산 스틱 필수, 바람에 주의하며 천천히 전진", mapQuery: "Mirador+Base+de+las+Torres" },
      { time: "13:45 - 14:45", typeIcon: "🏔️", title: "미라도르 라스 토레스(Mirador Las Torres) 삼봉 정상 감상 및 점심", desc: "삼봉 빙하 호숫가 | 교통: 휴식", tip: "에메랄드 빙하 호수와 하늘을 찌르는 3개의 화강암 탑! 도시락과 기념사진", mapQuery: "Base+Torres+del+Paine" },
      { time: "14:45 - 18:30", typeIcon: "🥾", title: "하산 코스: 웰컴센터 방면 안전 하산", desc: "전망대 ➔ 칠레노 산장 ➔ 웰컴센터 | 교통: 도보 하산 (9.5km, 3.5시간)", tip: "자갈길 미끄럼 주의, 무릎 보호대 착용", mapQuery: "Welcome+Center+Torres+del+Paine" },
      { time: "19:00 - 21:00", typeIcon: "🚌", title: "셔틀버스 탑승 푸에르토나탈레스 숙소 복귀", desc: "국립공원 ➔ 나탈레스 | 교통: 셔틀버스 (2시간)", tip: "숙소 도착 후 따뜻한 샤워와 숙면", mapQuery: "Puerto+Natales+Centro" }
    ]
  },
  {
    day: "DAY 11", date: "10월 21일 (수)", loc: "칠레 · 푸에르토나탈레스 / 푼타아레나스", flight: "🚌 살토 그란데 폭포 ➔ 푼타아레나스 버스 (3시간)",
    title: "살토 그란데 폭포 & 그레이 호수 유빙 & 푼타아레나스 이동",
    desc: "파타고니아 대자연 파노라마 투어, 거대한 폭포와 유빙 감상 후 마젤란 해협 도시 이동",
    timeline: [
      { time: "08:30 - 11:30", typeIcon: "🚐", title: "웨베르 호수 & 살토 그란데 (Salto Grande) 폭포 관람", desc: "나탈레스 ➔ 페오에 호수 방면 | 교통: 차량 (1.5시간)", tip: "빙하수가 굉음을 내며 떨어지는 거대 폭포. 강풍에 모자 날림 주의", mapQuery: "Salto+Grande+Torres+del+Paine" },
      { time: "11:30 - 14:00", typeIcon: "🧊", title: "그레이 호수 (Lago Grey) 자갈 해변 유빙 관찰", desc: "페오에 ➔ 그레이 호수 입구 | 교통: 차량 (40분)", tip: "출렁다리를 건너 모래 자갈 해변에서 호수에 떠 있는 푸른 유빙 조망", mapQuery: "Playa+Lago+Grey" },
      { time: "14:00 - 15:30", typeIcon: "🥪", title: "호숫가 쉼터 점심 식사 및 푸에르토나탈레스 복귀", desc: "그레이 호수 ➔ 나탈레스 | 교통: 차량 (1시간 30분)", tip: "호텔에서 보관 짐 픽업", mapQuery: "Puerto+Natales+Centro" },
      { time: "16:30 - 19:30", typeIcon: "🚌", title: "Bus-Sur 탑승 푼타아레나스(Punta Arenas) 이동", desc: "나탈레스 버스터미널 ➔ 푼타아레나스 터미널 | 교통: 고속버스 (3시간)", tip: "마젤란 해협을 따라 남쪽으로 달리는 노선", mapQuery: "Terminal+Bus-Sur+Punta+Arenas" },
      { time: "19:30 - 21:00", typeIcon: "🏨", title: "호텔 체크인 및 마젤란 해협 광장 저녁 식사", desc: "터미널 ➔ 호텔 | 교통: 택시 (5분)", tip: "마젤란 동상 발가락을 만지면 다시 돌아온다는 전설", mapQuery: "Plaza+Munoz+Gamero+Punta+Arenas" }
    ]
  },
  {
    day: "DAY 12", date: "10월 22일 (목)", loc: "칠레 · 푼타아레나스 / 산티아고 / 칼라마 / 아타카마", flight: "✈️ PUQ ➔ SCL ➔ CJC (LATAM) 국내선 2회",
    title: "푼타아레나스 ➔ 아타카마 사막 이동 & 달의 계곡 황혼",
    desc: "남극의 길목에서 세계에서 가장 건조한 아타카마 사막으로 대륙 종단 비행",
    timeline: [
      { time: "07:30 - 08:30", typeIcon: "🚕", title: "호텔 체크아웃 및 푼타아레나스 공항(PUQ) 이동", desc: "호텔 ➔ PUQ 공항 | 교통: 택시 (20분)", tip: "출발 2시간 전 도착 탑승 수속", mapQuery: "Presidente+Carlos+Ibanez+del+Campo+Airport" },
      { time: "09:30 - 13:00", typeIcon: "✈️", title: "PUQ발 산티아고(SCL)행 비행 (3시간 30분)", desc: "푼타아레나스 ➔ 산티아고 공항 | 교통: LATAM 항공편", tip: "기내에서 파타고니아 피오르드 빙하 상공 파노라마 감상", mapQuery: "Santiago+Airport+Terminal" },
      { time: "14:30 - 16:35", typeIcon: "✈️", title: "SCL 환승 칼라마(CJC)행 국내선 비행 (2시간 05분)", desc: "산티아고 ➔ 칼라마 공항 | 교통: LATAM 항공편", tip: "칼라마 공항 착륙 시 황량한 붉은 사막 파노라마", mapQuery: "El+Loa+Airport+Calama" },
      { time: "16:45 - 18:00", typeIcon: "🚐", title: "칼라마 공항 ➔ 산페드로데아타카마 트랜스비파(Transvip) 셔틀", desc: "칼라마 공항 ➔ 아타카마 호텔 | 교통: 공항 미니밴 (1시간 15분)", tip: "공항 공식 셔틀 티켓팅, 호텔 문앞까지 드롭", mapQuery: "San+Pedro+de+Atacama" },
      { time: "18:00 - 19:30", typeIcon: "🏨", title: "아타카마 흙벽돌 호텔 체크인 및 고도 적응(해발 2,400m)", desc: "호텔 ➔ 마을 광장 | 교통: 도보", tip: "사막 기후 특성상 건조하고 목마름. 생수 2L 이상 충분히 섭취", mapQuery: "Plaza+de+San+Pedro+de+Atacama" },
      { time: "19:30 - 21:00", typeIcon: "🍽️", title: "La Casona 화덕 엠파나다 저녁 식사 및 사막 야경", desc: "카라콜레스 메인 스트리트 | 교통: 도보", tip: "흙벽돌 화덕에서 구운 소고기 엠파나다와 피스코 사워", mapQuery: "Calle+Caracoles+San+Pedro+de+Atacama" }
    ]
  },
  {
    day: "DAY 13", date: "10월 23일 (금)", loc: "칠레 · 산페드로데아타카마", flight: "🚐 아타카마 데이투어 (사막 사해 & 별빛)",
    title: "발티나체 히든 라군 (사해 부유체험) & 세계 최고의 별빛 투어",
    desc: "사해처럼 몸이 저절로 뜨는 청록색 소금 호수, 밤하늘 쏟아지는 남반구 은하수 관측",
    timeline: [
      { time: "08:30 - 09:30", typeIcon: "🍳", title: "호텔 조식 및 사막 자외선 차단 준비", desc: "숙소 | 교통: 도보", tip: "선크림 듬뿍, 선글라스, 수영복, 비치타월, 갈아입을 옷 챙기기", mapQuery: "San+Pedro+de+Atacama" },
      { time: "09:30 - 14:00", typeIcon: "🏊", title: "발티나체 히든 라군 (Lagunas Escondidas de Baltinache)", desc: "아타카마 ➔ 발티나체 소금사막 | 교통: 투어 밴 (1시간 30분)", tip: "7개의 청록색 소금 호수! 염분이 극도로 높아 수영을 못해도 물 위에 둥둥 뜸 (체험 후 담수 샤워 필수)", mapQuery: "Lagunas+Escondidas+de+Baltinache" },
      { time: "14:00 - 15:30", typeIcon: "🍲", title: "마을 복귀 및 따뜻한 라마(Llama) 고기 요리 점심", desc: "카라콜레스 거리 레스토랑 | 교통: 도보", tip: "부드럽고 담백한 안데스 전통 라마 스테이크", mapQuery: "San+Pedro+de+Atacama+Restaurants" },
      { time: "15:30 - 18:30", typeIcon: "🛌", title: "한낮 뜨거운 사막 태양 피해 시에스타(낮잠/휴식)", desc: "호텔 | 교통: 도보", tip: "새벽 간헐천 투어와 심야 별빛 투어를 위해 체력 충전", mapQuery: "San+Pedro+de+Atacama+Hotel" },
      { time: "20:30 - 23:30", typeIcon: "✨", title: "아타카마 천문대 별빛 투어 (Stargazing)", desc: "마을 외곽 사막 천문 관측소 | 교통: 투어 밴 (20분)", tip: "세계 3대 청정 하늘. 고배율 망원경으로 목성/토성 띠, 남십자성, 은하수 파노라마 관측 (방한패딩 필수)", mapQuery: "Atacama+Stargazing" }
    ]
  },
  {
    day: "DAY 14", date: "10월 24일 (토)", loc: "칠레 · 산페드로데아타카마 / 칼라마 / 산티아고", flight: "✈️ CJC ➔ SCL (LATAM) 야간 항공편",
    title: "엘 타티오 간헐천(4,300m) & 칼라마 ➔ 산티아고 이동",
    desc: "해발 4,300m 영하의 새벽 뿜어져 나오는 거대 간헐천, 수도 산티아고로 복귀 비행",
    timeline: [
      { time: "04:30 - 06:30", typeIcon: "🚐", title: "새벽 픽업 및 엘 타티오 간헐천(Geiseres del Tatio) 이동", desc: "호텔 ➔ 엘 타티오 (해발 4,320m) | 교통: 투어 밴 (2시간)", tip: "영하 5도 이하로 급랭! 히트텍, 패딩, 핫팩, 장갑, 털모자 완전 무장", mapQuery: "Geiseres+del+Tatio" },
      { time: "06:30 - 08:30", typeIcon: "🌋", title: "엘 타티오 간헐천 분출 관람 및 일출 조식", desc: "간헐천 분화구 필드 | 교통: 도보 (2시간)", tip: "새벽 영하의 공기 속에 80여 개 간헐천에서 솟구치는 거대한 백색 수증기 기둥! 가이드 끓여주는 핫초코", mapQuery: "El+Tatio+Geysers" },
      { time: "08:30 - 11:30", typeIcon: "🦙", title: "마추카(Machuca) 토속 마을 경유 및 아타카마 복귀", desc: "엘 타티오 ➔ 마추카 마을 ➔ 아타카마 | 교통: 투어 밴 (2.5시간)", tip: "야생 비쿠냐와 플라밍고가 노니는 고원 습지 풍경", mapQuery: "Machuca+Chile" },
      { time: "11:30 - 14:00", typeIcon: "🏨", title: "호텔 체크아웃 및 짐 보관, 여유로운 사막 카페 점심", desc: "호텔 ➔ 시내 카페 | 교통: 도보", tip: "달콤한 리카리카(Rica-Rica) 사막 허브 아이스크림 맛보기", mapQuery: "San+Pedro+de+Atacama+Centro" },
      { time: "15:00 - 16:30", typeIcon: "🚐", title: "트랜스비파 셔틀 탑승 칼라마 공항(CJC) 이동", desc: "호텔 ➔ 칼라마 공항 | 교통: 공항 미니밴 (1시간 15분)", tip: "사막 고속도로 주행", mapQuery: "El+Loa+Airport+Calama" },
      { time: "18:00 - 20:05", typeIcon: "✈️", title: "CJC발 산티아고(SCL)행 비행 (2시간 05분)", desc: "칼라마 공항 ➔ 산티아고 공항 | 교통: LATAM 항공편", tip: "기내 휴식", mapQuery: "Santiago+Arturo+Merino+Benitez+Airport" },
      { time: "20:30 - 21:30", typeIcon: "🚕", title: "센트로포르토(CentroPuerto) 버스 또는 우버 시내 이동", desc: "SCL 공항 ➔ 프로비덴시아 / 센트로 호텔 | 교통: 차량 (30분)", tip: "산티아고 중심가 숙소 체크인", mapQuery: "Santiago+Downtown+Hotel" }
    ]
  },
  {
    day: "DAY 15", date: "10월 25일 (일)", loc: "칠레 · 산티아고", flight: "🚡 산티아고 메트로폴리스 탐방",
    title: "산 크리스토발 언덕 케이블카 & 스카이 코스타네라 300m 야경",
    desc: "안데스 설산을 병풍 삼은 칠레의 수도, 남미 최고층 전망대에서 내려다보는 파노라마",
    timeline: [
      { time: "09:30 - 12:00", typeIcon: "🏛️", title: "아르마스 광장 & 메트로폴리탄 대성당 & 모네다 궁전", desc: "호텔 ➔ 아르마스 광장 | 교통: 지하철/도보 (15분)", tip: "웅장한 스페인 식민지 시대 바로크 성당과 칠레 대통령궁", mapQuery: "Plaza+de+Armas+Santiago" },
      { time: "12:00 - 13:30", typeIcon: "🐟", title: "산티아고 중앙시장 (Mercado Central) 파일라 마리나 점심", desc: "아르마스 광장 ➔ 중앙시장 | 교통: 도보 (10분)", tip: "칠레 앞바다에서 잡은 신선한 바다 해산물 뚝배기 탕", mapQuery: "Mercado+Central+de+Santiago" },
      { time: "14:00 - 16:30", typeIcon: "🚡", title: "산 크리스토발 언덕 (Cerro San Cristóbal) 케이블카 탑승", desc: "중앙시장 ➔ 벨라비스타 케이블카 탑승장 | 교통: 도보/우버 (15분)", tip: "빨간 케이블카를 타고 언덕에 올라 백모후 마리아상과 안데스 설산 조망", mapQuery: "Teleferico+Santiago" },
      { time: "17:00 - 19:30", typeIcon: "🛍️", title: "코스타네라 센터 (Costanera Center) 쇼핑 및 카페", desc: "산 크리스토발 ➔ 코스타네라 센터 | 교통: 우버 (15분)", tip: "남미 최대 쇼핑몰. 슈퍼마켓에서 칠레 와인(카베르네 소비뇽) 쇼핑", mapQuery: "Costanera+Center" },
      { time: "19:30 - 21:00", typeIcon: "🏙️", title: "스카이 코스타네라 (Sky Costanera) 300m 전망대 황혼 & 야경", desc: "쇼핑몰 지하 매표소 ➔ 61~62층 전망대 | 교통: 엘리베이터 (50초)", tip: "남미 최고층 빌딩 360도 통유리 전망대에서 보는 석양과 불빛 바다", mapQuery: "Sky+Costanera" }
    ]
  },
  {
    day: "DAY 16", date: "10월 26일 (월)", loc: "칠레 · 산티아고 ➔ 페루 · 리마 ➔ 쿠스코", flight: "✈️ SCL ➔ LIM ➔ CUZ (LATAM) 국제선 + 국내선",
    title: "잉카 제국의 수도 쿠스코 입성 & 고산 적응 & 12각의 돌",
    desc: "해발 3,400m 잉카의 심장 쿠스코 도착, 코카차를 마시며 좁은 돌담길과 12각의 돌 산책",
    timeline: [
      { time: "05:00 - 05:40", typeIcon: "🚕", title: "호텔 체크아웃 및 산티아고 공항(SCL) 이동", desc: "호텔 ➔ SCL 공항 | 교통: 우버 (25분)", tip: "출발 2.5시간 전 도착 국제선 탑승 수속", mapQuery: "Santiago+Arturo+Merino+Benitez+Airport" },
      { time: "07:30 - 10:15", typeIcon: "✈️", title: "SCL발 리마(LIM)행 국제선 비행 (3시간 45분)", desc: "산티아고 ➔ 리마 호르헤 차베스 공항 | 교통: LATAM 항공편", tip: "페루 입국 심사 및 국내선 터미널 환승", mapQuery: "Jorge+Chavez+International+Airport" },
      { time: "12:15 - 13:40", typeIcon: "✈️", title: "LIM발 쿠스코(CUZ)행 비행 (1시간 25분)", desc: "리마 ➔ 쿠스코 알레한드로 벨라스코 공항 | 교통: LATAM 항공편", tip: "비행기 착륙 시 안데스 산맥 분지에 둘러싸인 쿠스코 전경", mapQuery: "Alejandro+Velasco+Astete+International+Airport" },
      { time: "13:40 - 14:30", typeIcon: "🚕", title: "쿠스코 공항 도착 및 아르마스 광장 인근 호텔 이동", desc: "공항 ➔ 시내 호텔 | 교통: 공항 공인 택시 (20분, 30~40솔)", tip: "해발 3,400m 도착! 절대 뛰거나 급하게 걷지 말 것", mapQuery: "Cusco+Plaza+de+Armas+Hotel" },
      { time: "14:30 - 16:30", typeIcon: "☕", title: "호텔 체크인, 무료 웰컴 코카차 음용 및 휴식 (고산 적응 필수)", desc: "호텔 객실 | 교통: 휴식", tip: "도착 첫날은 침대에 누워 2시간 절대 휴식. 산소호흡기 비치 확인", mapQuery: "Cusco+Historic+Center" },
      { time: "16:30 - 18:30", typeIcon: "🧱", title: "아르마스 광장 & 12각의 돌 (Hatun Rumiyoc) 천천히 산책", desc: "호텔 ➔ 아르마스 광장 ➔ 12각의 돌 | 교통: 평지 도보 (10분)", tip: "면도날 하나 들어가지 않는 완벽한 잉카 석조 기술의 정수", mapQuery: "Twelve+Angled+Stone+Cusco" },
      { time: "18:30 - 20:30", typeIcon: "🍲", title: "따뜻한 퀴노아 수프 & 로모 살타도(Lomo Saltado) 저녁 식사", desc: "아르마스 광장 2층 전망 식당 | 교통: 도보", tip: "소화가 잘되는 가벼운 식사 권장 (고산증 예방 위해 과식 금지)", mapQuery: "Plaza+de+Armas+Cusco+Restaurants" }
    ]
  },
  {
    day: "DAY 17", date: "10월 27일 (화)", loc: "페루 · 쿠스코 ➔ 성스러운 계곡 ➔ 아구아스 칼리엔테스", flight: "🚆 오얀타이탐보 ➔ 마추픽추 기차 19:04",
    title: "성스러운 계곡 투어 (마라스 소금밭 & 모라이) & 마추픽추 마을 입성",
    desc: "안데스 산비탈의 찬란한 분홍빛 소금 계단, 잉카 농업 테라스를 지나 기차를 타고 마추픽추로",
    timeline: [
      { time: "08:00 - 09:30", typeIcon: "🚐", title: "투어 밴 탑승 성스러운 계곡(Sacred Valley) 이동", desc: "쿠스코 숙소 ➔ 친체로 고원 지대 | 교통: 투어 밴 (1.5시간)", tip: "안데스 설산 치콘과 베로니카 봉우리 조망", mapQuery: "Valle+Sagrado+de+los+Incas" },
      { time: "09:30 - 11:30", typeIcon: "🧂", title: "살리네라스 데 마라스 (Salineras de Maras) 계단식 염전", desc: "친체로 ➔ 마라스 소금밭 | 교통: 투어 밴 (40분)", tip: "해발 3,000m 산골짜기에 3,000여 개의 분홍빛 소금 계단! 천연 암염 기념품 구매", mapQuery: "Salineras+de+Maras" },
      { time: "11:30 - 13:00", typeIcon: "🌾", title: "모라이 (Moray) 잉카 원형 농경 테라스 연구소", desc: "마라스 ➔ 모라이 | 교통: 투어 밴 (30분)", tip: "깊이에 따라 온도차가 15도나 나는 잉카의 농업 기상 시험장", mapQuery: "Moray+Inca+Ruins" },
      { time: "13:30 - 15:00", typeIcon: "🍽️", title: "우루밤바(Urubamba) 안데스 뷔페 점심 식사", desc: "모라이 ➔ 우루밤바 계곡 식당 | 교통: 투어 밴 (40분)", tip: "신선한 송어 구이, 안데스 감자, 옥수수 샐러드", mapQuery: "Urubamba+Sacred+Valley" },
      { time: "15:30 - 18:30", typeIcon: "🏰", title: "오얀타이탐보(Ollantaytambo) 잉카 요새 유적 관람 및 마을 카페", desc: "우루밤바 ➔ 오얀타이탐보 | 교통: 투어 밴 (30분)", tip: "거대한 계단식 군사 요새. 기차역 이동 전 카페에서 핫초코 휴식", mapQuery: "Ollantaytambo+Sanctuary" },
      { time: "19:04 - 20:45", typeIcon: "🚆", title: "잉카레일(Inca Rail) 또는 페루레일 탑승 아구아스 칼리엔테스 이동", desc: "오얀타이탐보 기차역 ➔ 마추픽추역 | 교통: 전망 관광열차 (1시간 40분)", tip: "우루밤바 급류를 따라 밀림으로 들어가는 낭만 기차 여행", mapQuery: "Estacion+Ollantaytambo" },
      { time: "20:45 ~", typeIcon: "🏨", title: "아구아스 칼리엔테스(마추픽추 마을) 도착 및 호텔 체크인", desc: "기차역 ➔ 도보 5분 호텔 | 교통: 도보", tip: "내일 새벽 마추픽추 셔틀버스 탑승을 위해 일찍 취침", mapQuery: "Aguas+Calientes+Peru" }
    ]
  },
  {
    day: "DAY 18", date: "10월 28일 (수)", loc: "페루 · 마추픽추 ➔ 쿠스코 복귀", flight: "🚆 마추픽추 ➔ 오얀타이탐보 15:20 기차",
    title: "공중도시 마추픽추 클래식 서킷 2 & 쿠스코 복귀",
    desc: "구름을 뚫고 솟아오른 잉카의 잃어버린 공중도시! 망지기의 집에서 바라보는 일생일대의 파노라마",
    timeline: [
      { time: "06:30 - 07:15", typeIcon: "🚌", title: "콘세투르(Consettur) 셔틀버스 탑승 마추픽추 입구 이동", desc: "마을 버스 정류장 ➔ 마추픽추 정문 | 교통: 셔틀버스 (30분)", tip: "여권 실물과 서킷 2 티켓 필수 지참! 하이람 빙엄 지그재그 산길", mapQuery: "Consettur+Machu+Picchu+Bus" },
      { time: "07:30 - 10:30", typeIcon: "🏛️", title: "마추픽추 서킷 2 (Circuit 2) 클래식 망지기의 집 완벽 탐방", desc: "정문 ➔ 망지기의 집 ➔ 태양의 신전 ➔ 인티와타나 | 교통: 도보 (3시간)", tip: "가장 완전한 클래식 엽서 뷰 코스! 오전 안개가 걷히며 드러나는 공중도시의 위용", mapQuery: "Machu+Picchu+Historic+Sanctuary" },
      { time: "10:30 - 11:30", typeIcon: "📸", title: "잉카 브리지 방면 산책로 및 인생 사진 촬영", desc: "망지기의 집 인근 | 교통: 도보", tip: "라마들이 풀을 뜯는 유적 테라스에서 기념사진", mapQuery: "Guardhouse+Machu+Picchu" },
      { time: "11:30 - 12:15", typeIcon: "🚌", title: "셔틀버스 하산 아구아스 칼리엔테스 마을 복귀", desc: "마추픽추 정문 ➔ 마을 | 교통: 셔틀버스 (30분)", tip: "수고한 다리 휴식", mapQuery: "Aguas+Calientes+Plaza" },
      { time: "12:30 - 14:30", typeIcon: "🍽️", title: "Indio Feliz 프랑스-페루 퓨전 비스트로 점심 식사", desc: "마을 골목 비스트로 | 교통: 도보 (5분)", tip: "아기자기한 여행자 인테리어, 안데스 송어 요리와 수제 타르트 맛집", mapQuery: "Indio+Feliz+Aguas+Calientes" },
      { time: "15:20 - 17:05", typeIcon: "🚆", title: "페루레일 / 잉카레일 탑승 오얀타이탐보 기차역 이동", desc: "마추픽추역 ➔ 오얀타이탐보역 | 교통: 기차 (1시간 45분)", tip: "차창 밖으로 저물어가는 안데스 산골 계곡 감상", mapQuery: "Machu+Picchu+Train+Station" },
      { time: "17:15 - 19:00", typeIcon: "🚐", title: "콜렉티보 또는 전용 밴 탑승 쿠스코 복귀", desc: "오얀타이탐보역 앞 ➔ 쿠스코 아르마스 광장 | 교통: 미니밴 (1시간 45분)", tip: "쿠스코 원래 숙소 복귀 체크인", mapQuery: "Cusco+Plaza+de+Armas" }
    ]
  },
  {
    day: "DAY 19", date: "10월 29일 (목)", loc: "페루 · 쿠스코", flight: "🥾 선택: 우만타이 호수 투어 (새벽 04:30) or 시내 힐링",
    title: "우만타이 에메랄드 빙하 호수(4,200m) or 쿠스코 시내 여유 & 미식",
    desc: "설산 아래 보석 같은 옥빛 호수 트레킹 또는 유서 깊은 산 페드로 시장과 골목 산책",
    timeline: [
      { time: "08:30 - 10:00", typeIcon: "🍳", title: "느긋한 호텔 조식 및 쿠스코 맑은 아침 산책", desc: "숙소 ➔ 아르마스 광장 카페 | 교통: 도보", tip: "마추픽추의 여운을 즐기며 따뜻한 플랫화이트 한잔", mapQuery: "Plaza+de+Armas+Cusco" },
      { time: "10:00 - 12:30", typeIcon: "🧺", title: "산 페드로 재래시장 (Mercado Central de San Pedro) 탐방", desc: "아르마스 광장 ➔ 산 페드로 시장 | 교통: 도보 (12분)", tip: "수천 가지 감자, 옥수수, 알파카 니트, 갓 짠 생과일주스(Jugo) 맛보기", mapQuery: "Mercado+Central+de+San+Pedro" },
      { time: "12:30 - 14:00", typeIcon: "🍽️", title: "산 블라스 예술가 거리 로컬 카페 점심", desc: "산 페드로 ➔ 산 블라스 언덕 | 교통: 도보 (15분)", tip: "하얀 벽과 파란 대문 골목길, 파스타와 샐러드", mapQuery: "San+Blas+Cusco" },
      { time: "14:30 - 17:00", typeIcon: "🏰", title: "삭사이와만 (Saqsaywamán) 거대 석조 요새 관람", desc: "산 블라스 ➔ 삭사이와만 유적지 | 교통: 택시/도보 (15분)", tip: "수백 톤짜리 지그재그 거석들로 축조된 잉카 군사 요새와 쿠스코 시내 전경", mapQuery: "Saqsaywaman" },
      { time: "18:00 - 21:00", typeIcon: "🍷", title: "Cicciolina 지중해풍 퓨전 안데스 퀴진 파인다이닝", desc: "산 블라스 입구 2층 | 교통: 도보", tip: "쿠스코 최고의 명소. 타파스 바 카운터석에서 오리 카르파초와 와인 페어링", mapQuery: "Cicciolina+Cusco" }
    ]
  },
  {
    day: "DAY 20", date: "10월 30일 (금)", loc: "페루 · 쿠스코 ➔ 리마", flight: "✈️ CUZ ➔ LIM (LATAM) 국내선 13:00",
    title: "미식의 수도 리마 입성 & 미라플로레스 사랑의 공원 & 바랑코",
    desc: "태평양을 품은 절벽 도시 리마, 라르코마르 쇼핑몰과 예술가의 거리 바랑코 석양",
    timeline: [
      { time: "09:30 - 10:30", typeIcon: "🚕", title: "호텔 체크아웃 및 쿠스코 공항(CUZ) 이동", desc: "호텔 ➔ CUZ 공항 | 교통: 택시 (20분)", tip: "출발 2시간 전 도착 탑승 수속", mapQuery: "Alejandro+Velasco+Astete+International+Airport" },
      { time: "11:45 - 13:10", typeIcon: "✈️", title: "CUZ발 리마(LIM)행 비행 (1시간 25분)", desc: "쿠스코 ➔ 리마 호르헤 차베스 공항 | 교통: LATAM 항공편", tip: "착륙 20분 전 태평양 해안선 감상", mapQuery: "Jorge+Chavez+International+Airport" },
      { time: "13:30 - 14:30", typeIcon: "🚕", title: "공항 그린택시(Taxi Green) 탑승 미라플로레스 호텔 이동", desc: "리마 공항 ➔ 미라플로레스 | 교통: 공항 공인 택시 (45분)", tip: "리마 공항 입국장 내 공식 카운터 결제(정찰제)", mapQuery: "Miraflores+Lima+Hotel" },
      { time: "14:30 - 16:30", typeIcon: "🍋", title: "Cevicheria Punto Azul 정통 페루 세비체 점심", desc: "호텔 ➔ 푼토 아줄 | 교통: 도보 (10분)", tip: "태평양 흰살 생선에 라임즙과 고수를 넣은 상큼한 국민 요리", mapQuery: "Punto+Azul+Miraflores" },
      { time: "16:30 - 18:30", typeIcon: "🌊", title: "라르코마르(Larcomar) 절벽 쇼핑몰 & 사랑의 공원 산책", desc: "푼토 아줄 ➔ 라르코마르 해안 절벽 | 교통: 도보 (15분)", tip: "태평양 절벽 위에 지어진 모더니즘 쇼핑몰과 가우디풍 모자이크 공원", mapQuery: "Larcomar+Miraflores" },
      { time: "18:30 - 21:00", typeIcon: "🎨", title: "바랑코 (Barranco) 예술가 거리 & 탄식의 다리 밤 산책", desc: "라르코마르 ➔ 바랑코 | 교통: 우버 (10분)", tip: "보헤미안 낭만 거리, 피스코 사워 바에서 여행 마지막 밤 건배", mapQuery: "Puente+de+los+Suspiros+Barranco" }
    ]
  },
  {
    day: "DAY 21", date: "10월 31일 (토)", loc: "페루 · 리마 ➔ 캐나다 · 밴쿠버", flight: "✈️ 리마(LIM) ➔ 밴쿠버(YVR) AC081 귀국길",
    title: "캐나다 밴쿠버 시내 당일 환승 투어 (개스타운 증기시계)",
    desc: "12시간 밴쿠버 낮 환승 시간 활용! 증기시계, 플라이오버 캐나다, 워터프런트 탐방",
    timeline: [
      { time: "00:45 - 08:30", typeIcon: "✈️", title: "리마발 밴쿠버(YVR)행 에어캐나다 야간비행 탑승 (10시간 45분)", desc: "리마 공항 (LIM) ➔ 밴쿠버 공항 (YVR) | 교통: 에어캐나다", tip: "기내 숙면 후 아침 캐나다 입국", mapQuery: "Vancouver+International+Airport" },
      { time: "08:30 - 09:30", typeIcon: "🛂", title: "밴쿠버 공항 도착 및 캐나다 입국심사(eTA 사전 승인 필수)", desc: "YVR 입국장 | 교통: 도보", tip: "수하물은 인천까지 자동 연결! 기내용 가방만 공항 보관소에 맡기기", mapQuery: "Vancouver+Airport+Luggage+Storage" },
      { time: "09:30 - 10:00", typeIcon: "🚆", title: "캐나다 라인(Canada Line) 전철 탑승 다운타운 워터프런트 이동", desc: "공항 전철역 ➔ 워터프런트(Waterfront)역 | 교통: 전철 (26분)", tip: "신용카드 컨택리스 탭 결제 탑승 가능", mapQuery: "Waterfront+Station+Vancouver" },
      { time: "10:00 - 12:00", typeIcon: "🕰️", title: "개스타운 (Gastown) 유서 깊은 벽돌길 & 증기시계 관람", desc: "워터프런트역 ➔ 개스타운 증기시계 | 교통: 도보 (5분)", tip: "15분마다 하얀 증기와 함께 차임벨을 울리는 명물", mapQuery: "Gastown+Steam+Clock" },
      { time: "12:00 - 13:30", typeIcon: "🍁", title: "워터프런트 캐나다 플레이스 뷰 & 팀호튼 커피 점심", desc: "개스타운 ➔ 캐나다 플레이스 | 교통: 도보 (10분)", tip: "캐나다 국민 커피 팀호튼 도넛과 따뜻한 더블더블 커피", mapQuery: "Canada+Place+Vancouver" },
      { time: "13:30 - 15:30", typeIcon: "🦅", title: "플라이오버 캐나다 (FlyOver Canada) 4D 비행 시뮬레이터 체험", desc: "캐나다 플레이스 끝단 | 교통: 도보", tip: "캐나다의 웅장한 대자연 상공을 날아다니는 몰입형 비행 체험", mapQuery: "FlyOver+Canada" },
      { time: "15:30 - 16:30", typeIcon: "🚆", title: "캐나다 라인 탑승 밴쿠버 공항 복귀 및 출국장 이동", desc: "워터프런트역 ➔ YVR 공항 | 교통: 전철 (26분)", tip: "보관 가방 수령 후 보안검색 통과", mapQuery: "Vancouver+International+Airport" }
    ]
  },
  {
    day: "DAY 22", date: "11월 01일 (일)", loc: "캐나다 · 밴쿠버 ➔ 대한민국 · 인천", flight: "✈️ 밴쿠버(YVR) ➔ 인천(ICN) AC063 (11시간 30분)",
    title: "인천국제공항 무사 귀국 & 22일간의 남미 대장정 피날레",
    desc: "남태평양을 건너 고국으로, 평생 잊지 못할 파타고니아와 마추픽추의 추억을 안고 귀국",
    timeline: [
      { time: "11:45 ~", typeIcon: "✈️", title: "에어캐나다 AC063편 탑승 및 인천 향발 태평양 횡단 비행", desc: "밴쿠버공항 (YVR) ➔ 인천공항 (ICN) | 교통: 에어캐나다 (11시간 30분)", tip: "기내 엔터테인먼트 시청 및 시차 적응 수면", mapQuery: "Incheon+International+Airport" },
      { time: "16:15 (+1일)", typeIcon: "🛬", title: "인천공항 제1여객터미널 도착 및 자동출입국심사 통과", desc: "인천공항 T1 입국장 | 교통: 도보", tip: "Q-CODE 모바일 검역 제출, 위탁수하물 수취", mapQuery: "Incheon+Airport+Terminal+1" },
      { time: "17:30 ~", typeIcon: "🏠", title: "공항철도/리무진 탑승 자택 귀가 및 여행 완주 축하", desc: "인천공항 ➔ 자택 | 교통: 공항철도/리무진", tip: "22일간의 남미 4개국 대장정 무사 완주! 술술트래블에 포토 다이어리 남기기", mapQuery: "Incheon+Airport+Railroad" }
    ]
  }
];

function transformRawScheduleToDays(rawList) {
  return rawList.map((item, idx) => {
    let city = "기타";
    let country = "대한민국";
    let flag = "🇰🇷";
    let curr = "KRW";

    if (item.loc.includes("부에노스아이레스")) {
      city = "부에노스아이레스"; country = "아르헨티나"; flag = "🇦🇷"; curr = "ARS";
    } else if (item.loc.includes("칼라파테")) {
      city = "엘 칼라파테"; country = "아르헨티나"; flag = "🇦🇷"; curr = "ARS";
    } else if (item.loc.includes("엘 찰텐") || item.loc.includes("찰텐")) {
      city = "엘 찰텐"; country = "아르헨티나"; flag = "🇦🇷"; curr = "ARS";
    } else if (item.loc.includes("푸에르토나탈레스") || item.loc.includes("토레스")) {
      city = "토레스 델 파이네"; country = "칠레"; flag = "🇨🇱"; curr = "CLP";
    } else if (item.loc.includes("푼타아레나스")) {
      city = "푼타아레나스"; country = "칠레"; flag = "🇨🇱"; curr = "CLP";
    } else if (item.loc.includes("아타카마")) {
      city = "산페드로데아타카마"; country = "칠레"; flag = "🇨🇱"; curr = "CLP";
    } else if (item.loc.includes("산티아고")) {
      city = "산티아고"; country = "칠레"; flag = "🇨🇱"; curr = "CLP";
    } else if (item.loc.includes("쿠스코")) {
      city = "쿠스코"; country = "페루"; flag = "🇵🇪"; curr = "PEN";
    } else if (item.loc.includes("마추픽추")) {
      city = "마추픽추"; country = "페루"; flag = "🇵🇪"; curr = "PEN";
    } else if (item.loc.includes("리마")) {
      city = "리마"; country = "페루"; flag = "🇵🇪"; curr = "PEN";
    } else if (item.loc.includes("밴쿠버") || item.loc.includes("토론토")) {
      city = "밴쿠버"; country = "캐나다"; flag = "🇨🇦"; curr = "CAD";
    }

    const spots = (item.timeline || []).map((tl, sIdx) => {
      let cat = "tour";
      const icon = tl.typeIcon || "";
      if (icon === "🥩" || icon === "🍽️" || icon === "☕" || icon === "🍻" || icon === "🍖" || icon === "🦀" || icon === "🐟" || icon === "🍋") cat = "food";
      else if (icon === "🏨" || icon === "🛌") cat = "stay";
      else if (icon === "✈️" || icon === "🚌" || icon === "🚕" || icon === "🚐" || icon === "🚆" || icon === "🚡" || icon === "⛵") cat = "transit";
      else if (icon === "🛍️" || icon === "💳" || icon === "🧺") cat = "shopping";

      return {
        id: `sa_d${idx + 1}_s${sIdx + 1}`,
        time: tl.time.split(" ")[0] || "09:00",
        name: tl.title,
        desc: tl.desc,
        cost: 0,
        currency: curr,
        category: cat,
        completed: false,
        tip: tl.tip,
        mapQuery: tl.mapQuery,
        flight: item.flight
      };
    });

    return {
      day: idx + 1,
      date: item.date,
      title: item.title,
      desc: item.desc,
      city: city,
      country: country,
      flag: flag,
      spots: spots
    };
  });
}

const saDays = transformRawScheduleToDays(scheduleOct11Data);
const saDays21 = saDays.slice(0, 21);

// 2. Comprehensive Global & South America Travel Knowledge Engine
const KB_TRAVEL = {
  version: "1.8.4",
  saDays: saDays,
  
  templates: {
    south_america_22d: {
      id: "trip_sa_showcase_22d",
      title: "✈️ 2026 남미 22일 완벽 가이드 (아르헨티나 최적화 & 엘찰텐 1박 v9)",
      subtitle: "2026.10.11 ~ 11.01(22일간) 아르헨티나·칠레·페루·캐나다 4개국 10도시 2인 9,467,000 KRW 완벽 동선",
      destination: "남미 4개국 대륙 종단 (아르헨티나, 칠레, 페루, 캐나다)",
      countries: ["아르헨티나", "칠레", "페루", "캐나다"],
      cities: ["부에노스아이레스", "엘 칼라파테", "엘 찰텐", "토레스 델 파이네", "산페드로데아타카마", "산티아고", "쿠스코", "마추픽추", "리마", "밴쿠버"],
      durationDays: 22,
      startDate: "2026-10-11",
      endDate: "2026-11-01",
      budget: 9467000,
      totalBudget: 9467000,
      concepts: ["배낭", "자연", "문화", "맛집"],
      roomCode: "SA-2026",
      isSample: true,
      days: saDays,
      
      packingChecklist: [
        { id: "sa_pk_01", text: "여권 원본 및 사본 2매 (유효기간 6개월 이상 필수)", checked: true, urgent: true, cat: "필수서류" },
        { id: "sa_pk_02", text: "황열병 예방접종 증명서(옐로카드) 및 고산병약(다이아목스)", checked: true, urgent: true, cat: "의약품" },
        { id: "sa_pk_03", text: "트래블로그 / 트래블월렛 카드 (MEP 환율 자동결제)", checked: true, urgent: true, cat: "금융/환전" },
        { id: "sa_pk_04", text: "미국 100달러 신권 지폐 ($500~$800 비상금, 훼손없는 빳빳한 신권)", checked: false, urgent: true, cat: "금융/환전" },
        { id: "sa_pk_05", text: "칠레 PDI 입국신고서 종이 영수증 (출국 시까지 여권 사이에 절대 분실 금지)", checked: false, urgent: true, cat: "필수서류" },
        { id: "sa_pk_06", text: "캐나다 전자여행허가(eTA) 사전 발급 확인 (경유 시 필수)", checked: true, urgent: true, cat: "필수서류" },
        { id: "sa_pk_07", text: "방풍/방수 고어텍스 하드쉘 자켓 (파타고니아 강풍 대비)", checked: false, urgent: true, cat: "의류" },
        { id: "sa_pk_08", text: "경량 패딩 및 플리스 내피 (엘 타티오 영하 5도 대비)", checked: false, urgent: true, cat: "의류" },
        { id: "sa_pk_09", text: "발목을 단단히 지지해주는 중등산화 (토레스델파이네 20km 대비)", checked: false, urgent: true, cat: "트레킹" },
        { id: "sa_pk_10", text: "접이식 등산스틱 1쌍 (피츠로이 급경사 자갈길 필수)", checked: false, urgent: false, cat: "트레킹" },
        { id: "sa_pk_11", text: "20,000mAh 대용량 보조배터리 (영하 추위에 배터리 급방전 방지)", checked: false, urgent: true, cat: "전자기기" },
        { id: "sa_pk_12", text: "남미 4개국 통합 eSIM 또는 로밍 사전 등록", checked: false, urgent: true, cat: "전자기기" },
        { id: "sa_pk_13", text: "마추픽추 서킷 2 입장권 및 잉카레일 티켓 출력본", checked: false, urgent: true, cat: "예약바우처" },
        { id: "sa_pk_14", text: "수영복 및 스포츠 타월 (발티나체 사해 소금호수 부유체험용)", checked: false, urgent: false, cat: "물놀이" },
        { id: "sa_pk_15", text: "선글라스 UV400 & 사막/빙하용 고차단 자외선차단제 SPF50+", checked: false, urgent: true, cat: "위생용품" }
      ]
    },
    south_america_21d: {
      id: "trip_sa_showcase_21d",
      title: "✈️ 2026 남미 4개국 21일 하이라이트 투어",
      subtitle: "아르헨티나, 칠레, 페루, 캐나다 21일 여정",
      destination: "남미 4개국 (아르헨티나, 칠레, 페루, 캐나다)",
      countries: ["아르헨티나", "칠레", "페루", "캐나다"],
      cities: ["부에노스아이레스", "엘 칼라파테", "엘 찰텐", "토레스 델 파이네", "산페드로데아타카마", "산티아고", "쿠스코", "마추픽추", "리마"],
      durationDays: 21,
      startDate: "2026-10-11",
      endDate: "2026-10-31",
      budget: 8900000,
      totalBudget: 8900000,
      concepts: ["배낭", "자연", "문화"],
      roomCode: "SA-21D",
      isSample: true,
      days: saDays21
    }
  },

  currencies: {
    USD: { symbol: "$", rateToUSD: 1.0, krwRate: 1380, name: "미국 달러" },
    EUR: { symbol: "€", rateToUSD: 1.09, krwRate: 1500, name: "유로" },
    JPY: { symbol: "¥", rateToUSD: 0.0065, krwRate: 9.1, name: "일본 엔" },
    CNY: { symbol: "¥", rateToUSD: 0.14, krwRate: 192, name: "중국 위안" },
    GBP: { symbol: "£", rateToUSD: 1.28, krwRate: 1760, name: "영국 파운드" },
    CHF: { symbol: "Fr", rateToUSD: 1.12, krwRate: 1550, name: "스위스 프랑" },
    CAD: { symbol: "C$", rateToUSD: 0.74, krwRate: 1015, name: "캐나다 달러" },
    AUD: { symbol: "A$", rateToUSD: 0.66, krwRate: 910, name: "호주 달러" },
    NZD: { symbol: "NZ$", rateToUSD: 0.61, krwRate: 840, name: "뉴질랜드 달러" },
    ARS: { symbol: "$", rateToUSD: 0.00083, krwRate: 1.15, name: "아르헨티나 페소", mepRate: 1200, officialRate: 980 },
    CLP: { symbol: "CLP$", rateToUSD: 0.00106, krwRate: 1.47, name: "칠레 페소", usdRate: 940 },
    PEN: { symbol: "S/.", rateToUSD: 0.27, krwRate: 370, name: "페루 솔", usdRate: 3.75 },
    BRL: { symbol: "R$", rateToUSD: 0.18, krwRate: 250, name: "브라질 헤알" },
    BOB: { symbol: "Bs", rateToUSD: 0.145, krwRate: 200, name: "볼리비아 볼리비아노" },
    VND: { symbol: "₫", rateToUSD: 0.000039, krwRate: 0.055, name: "베트남 동" },
    THB: { symbol: "฿", rateToUSD: 0.027, krwRate: 38, name: "태국 바트" },
    TWD: { symbol: "NT$", rateToUSD: 0.031, krwRate: 43, name: "대만 달러" },
    HKD: { symbol: "HK$", rateToUSD: 0.128, krwRate: 177, name: "홍콩 달러" },
    SGD: { symbol: "S$", rateToUSD: 0.74, krwRate: 1020, name: "싱가포르 달러" },
    PHP: { symbol: "₱", rateToUSD: 0.017, krwRate: 24, name: "필리핀 페소" },
    IDR: { symbol: "Rp", rateToUSD: 0.000062, krwRate: 0.086, name: "인도네시아 루피아" },
    MYR: { symbol: "RM", rateToUSD: 0.21, krwRate: 295, name: "말레이시아 링깃" }
  },

  destinations: {
    bue: { name: "부에노스아이레스", country: "아르헨티나", currency: "ARS", timeZone: "America/Argentina/Buenos_Aires", emergency: "911", embassy: "+54-11-4805-8291" },
    fte: { name: "엘 칼라파테", country: "아르헨티나", currency: "ARS", timeZone: "America/Argentina/Buenos_Aires", emergency: "101", embassy: "+54-11-4805-8291" },
    cha: { name: "엘 찰텐", country: "아르헨티나", currency: "ARS", timeZone: "America/Argentina/Buenos_Aires", emergency: "101", embassy: "+54-11-4805-8291" },
    pnt: { name: "토레스 델 파이네", country: "칠레", currency: "CLP", timeZone: "America/Santiago", emergency: "133", embassy: "+56-2-2228-4214" },
    ata: { name: "산페드로데아타카마", country: "칠레", currency: "CLP", timeZone: "America/Santiago", emergency: "133", embassy: "+56-2-2228-4214" },
    scl: { name: "산티아고", country: "칠레", currency: "CLP", timeZone: "America/Santiago", emergency: "133", embassy: "+56-2-2228-4214" },
    cuz: { name: "쿠스코", country: "페루", currency: "PEN", timeZone: "America/Lima", emergency: "105", embassy: "+51-1-632-5000" },
    mp: { name: "마추픽추", country: "페루", currency: "PEN", timeZone: "America/Lima", emergency: "105", embassy: "+51-1-632-5000" },
    lim: { name: "리마", country: "페루", currency: "PEN", timeZone: "America/Lima", emergency: "105", embassy: "+51-1-632-5000" },
    yvr: { name: "밴쿠버", country: "캐나다", currency: "CAD", timeZone: "America/Vancouver", emergency: "911", embassy: "+1-604-681-9581" }
  },

  bookingGuides: [
    { title: "인천 ➔ 밴쿠버 ➔ 부에노스아이레스 다구간 국제선 항공권", target: "에어캐나다 공홈 / 스카이스캐너", dDay: "D-180", cost: "약 3,600,000원 (2인)", status: "urgent", tip: "밴쿠버/토론토 경유 수하물 자동 연결 여부 확인" },
    { title: "마추픽추 서킷 2 (Circuit 2) 클래식 입장권", target: "페루 문화부 공식 홈페이지 (tuboleto.cultura.pe)", dDay: "D-120", cost: "약 110,000원 (2인)", status: "urgent", tip: "가장 인기 높은 코스로 오픈 당일 매진되므로 즉시 예약" },
    { title: "오얀타이탐보 ↔ 마추픽추 잉카레일/페루레일 왕복 기차표", target: "Inca Rail / PeruRail 공홈", dDay: "D-90", cost: "약 360,000원 (2인)", status: "urgent", tip: "마추픽추 입장 시간과 맞물려 2~3시간 전 도착 편 예약" },
    { title: "부에노스(AEP) ➔ 칼라파테(FTE) 아르헨티나 항공 국내선", target: "Aerolineas Argentinas 공홈", dDay: "D-90", cost: "약 480,000원 (2인)", status: "urgent", tip: "MEP 환율 적용 신용카드로 결제 시 큰 폭 할인" },
    { title: "푼타아레나스(PUQ) ➔ 산티아고(SCL) ➔ 칼라마(CJC) LATAM", target: "LATAM 항공 공홈", dDay: "D-90", cost: "약 560,000원 (2인)", status: "urgent", tip: "칠레 국내선 묶음 결제 시 프로모션 운임 적용" },
    { title: "산티아고(SCL) ➔ 리마(LIM) ➔ 쿠스코(CUZ) LATAM 항공", target: "LATAM 항공 공홈", dDay: "D-90", cost: "약 620,000원 (2인)", status: "urgent", tip: "국제선+페루 국내선 연계 발권" },
    { title: "엘 칼라파테 ↔ 엘 찰텐 왕복 버스 (Chalten Travel)", target: "Platform 10 또는 Chalten Travel 공홈", dDay: "D-60", cost: "약 96,000원 (2인)", status: "recommended", tip: "08:00 출발 18:00 복귀 골든 슬롯 확보" },
    { title: "엘 칼라파테 ➔ 푸에르토나탈레스 국경 통과 국제버스", target: "Bus-Sur 또는 Cootra", dDay: "D-60", cost: "약 120,000원 (2인)", status: "recommended", tip: "아르헨티나 ➔ 칠레 국경 심사 소요 시간 감안" },
    { title: "푸에르토나탈레스 ➔ 푼타아레나스 버스 (Bus-Sur)", target: "Bus-Sur 공홈", dDay: "D-45", cost: "약 40,000원 (2인)", status: "recommended", tip: "오후 16:30 출발편 추천" },
    { title: "페리토 모레노 빙하 국립공원 입장권 및 사파리 나우티코 보트", target: "아르헨티나 국립공원 공홈", dDay: "D-30", cost: "약 180,000원 (2인)", status: "recommended", tip: "국립공원 온라인 결제 QR 코드 오프라인 저장" },
    { title: "아타카마 천문대 별빛 투어 (Stargazing)", target: "현지 전문 천문대 투어사", dDay: "D-30", cost: "약 110,000원 (2인)", status: "recommended", tip: "보름달 전후 3일은 달빛으로 은하수 관측 불가하므로 음력 체크" },
    { title: "부에노스아이레스 라 벤타나(La Ventana) 탱고 디너쇼", target: "La Ventana 공홈 / 클룩", dDay: "D-30", cost: "약 240,000원 (2인)", status: "recommended", tip: "산텔모 지역 호텔 픽업 포함 여부 확인" },
    { title: "캐나다 전자여행허가 (eTA)", target: "캐나다 이민국 공식 웹사이트", dDay: "D-30", cost: "약 14,000원 (2인)", status: "urgent", tip: "건당 7 CAD, 사칭 대행 사이트 주의!" },
    { title: "남미 4개국 데이터 통합 eSIM", target: "Airalo / 유심사", dDay: "D-7", cost: "약 80,000원 (2인)", status: "urgent", tip: "아르헨티나, 칠레, 페루, 캐나다 4개국 커버리지 확인" }
  ],

  defaultChecklist: [
    { id: "sa_ck_01", text: "여권 원본 및 복사본 2장 (유효기간 6개월 이상)", checked: false, urgent: true, cat: "서류" },
    { id: "sa_ck_02", text: "트래블로그 / 트래블월렛 카드 (MEP 자동 적용)", checked: false, urgent: true, cat: "금융" },
    { id: "sa_ck_03", text: "미국 달러 $500~$800 신권 (빳빳하고 접히지 않은 100달러 지폐)", checked: false, urgent: true, cat: "금융" },
    { id: "sa_ck_04", text: "캐나다 eTA 발급 승인 메일 출력", checked: false, urgent: true, cat: "서류" },
    { id: "sa_ck_05", text: "마추픽추 서킷 2 입장권 및 열차 바우처 인쇄", checked: false, urgent: true, cat: "서류" },
    { id: "sa_ck_06", text: "황열병 예방접종 증명서(옐로카드)", checked: false, urgent: false, cat: "의약품" },
    { id: "sa_ck_07", text: "고산병약(다이아목스) 및 소화제/진통제/지사제", checked: false, urgent: true, cat: "의약품" },
    { id: "sa_ck_08", text: "고어텍스 방풍/방수 자켓 (파타고니아 돌풍 대비)", checked: false, urgent: true, cat: "의류" },
    { id: "sa_ck_09", text: "경량 패딩 및 플리스 조끼 (레이어드 착용)", checked: false, urgent: true, cat: "의류" },
    { id: "sa_ck_10", text: "중등산화 및 두꺼운 등산 양말 3켤레", checked: false, urgent: true, cat: "트레킹" },
    { id: "sa_ck_11", text: "접이식 등산스틱 (피츠로이 하산 시 무릎 보호)", checked: false, urgent: false, cat: "트레킹" },
    { id: "sa_ck_12", text: "20,000mAh 보조배터리 및 고속충전 케이블", checked: false, urgent: true, cat: "전자기기" },
    { id: "sa_ck_13", text: "자외선 차단 선글라스 UV400 & 선크림 SPF50+", checked: false, urgent: true, cat: "위생" },
    { id: "sa_ck_14", text: "수영복 및 스포츠 타월 (발티나체 사해 소금호수용)", checked: false, urgent: false, cat: "물놀이" },
    { id: "sa_ck_15", text: "핫팩 10개 (엘 타티오 새벽 영하 대비)", checked: false, urgent: true, cat: "방한" },
    { id: "sa_ck_16", text: "목베개 및 수면 안대 (장거리 야간비행용)", checked: false, urgent: false, cat: "기내용" },
    { id: "sa_ck_17", text: "해외 여행자보험 증권 출력", checked: false, urgent: true, cat: "서류" },
    { id: "sa_ck_18", text: "다이소 와이어 자물쇠 및 복대 (소매치기 방지)", checked: false, urgent: true, cat: "보안" },
    { id: "sa_ck_19", text: "1박용 서브 배낭 (엘 찰텐 1박용 30L)", checked: false, urgent: true, cat: "가방" },
    { id: "sa_ck_20", text: "남미 4개국 지원 멀티 플러그 어댑터", checked: false, urgent: true, cat: "전자기기" },
    { id: "sa_ck_21", text: "방수 팩 및 지퍼백 (전자제품 보호)", checked: false, urgent: false, cat: "잡화" },
    { id: "sa_ck_22", text: "인공눈물 및 립밤 (아타카마 사막 극건조 대비)", checked: false, urgent: true, cat: "위생" },
    { id: "sa_ck_23", text: "휴대용 물티슈 및 여행용 티슈 5개", checked: false, urgent: false, cat: "위생" },
    { id: "sa_ck_24", text: "모자(챙 넓은 사파리 모자 + 방한 비니)", checked: false, urgent: true, cat: "의류" },
    { id: "sa_ck_25", text: "장갑(스마트폰 터치 장갑 + 방풍 장갑)", checked: false, urgent: true, cat: "방한" },
    { id: "sa_ck_26", text: "개인 복용 비타민 및 유산균", checked: false, urgent: false, cat: "의약품" },
    { id: "sa_ck_27", text: "비상용 한식 컵라면/누룽지/볶음고추장", checked: false, urgent: false, cat: "식품" },
    { id: "sa_ck_28", text: "스포츠 보온병 (따뜻한 차 지참용)", checked: false, urgent: false, cat: "잡화" },
    { id: "sa_ck_29", text: "샤워기 필터 및 리필 필터", checked: false, urgent: false, cat: "위생" },
    { id: "sa_ck_30", text: "우비 또는 판초 우의 (마추픽추 스콜 대비)", checked: false, urgent: true, cat: "우천" },
    { id: "sa_ck_31", text: "손톱깎이 및 미니 가위", checked: false, urgent: false, cat: "잡화" },
    { id: "sa_ck_32", text: "스마트폰 분실방지 스프링 스트랩", checked: false, urgent: true, cat: "보안" },
    { id: "sa_ck_33", text: "귀국 짐 최종 패킹 시 잼/피스코주 액체류 위탁 수하물 패킹 (총 무게 23kg 이내 측정)", checked: false, urgent: true, cat: "귀국" }
  ],

  seedExpenses: [
    { id: "sa_exp_01", date: "2026-10-11", title: "인천 ➔ 밴쿠버 ➔ 부에노스아이레스 왕복 항공권 (2인)", amount: 3600000, currency: "KRW", category: "flights", memo: "에어캐나다 공홈 예약" },
    { id: "sa_exp_02", date: "2026-10-12", title: "캐나다 eTA 발급 수수료 (2인)", amount: 14, currency: "CAD", category: "other", memo: "캐나다 이민국 온라인 결제" },
    { id: "sa_exp_03", date: "2026-10-13", dateIdx: 2, title: "에세이사 공항 ➔ 센트로 숙소 우버", amount: 28000, currency: "ARS", category: "transit", memo: "MEP 환율 적용" },
    { id: "sa_exp_04", date: "2026-10-13", dateIdx: 2, title: "돈 훌리오(Don Julio) 꽃등심 아사도 디너", amount: 125000, currency: "ARS", category: "food", memo: "세계 최고 스테이크 + 와인" },
    { id: "sa_exp_05", date: "2026-10-14", dateIdx: 3, title: "라 벤타나(La Ventana) 탱고 디너쇼 2인", amount: 240000, currency: "KRW", category: "tour", memo: "3코스 디너 + 와인 무제한" },
    { id: "sa_exp_06", date: "2026-10-15", dateIdx: 4, title: "부에노스(AEP) ➔ 칼라파테(FTE) 국내선 (2인)", amount: 480000, currency: "KRW", category: "flights", memo: "아에로라인 아르헨티나스" },
    { id: "sa_exp_07", date: "2026-10-15", dateIdx: 4, title: "La Tablita 파타고니아 어린 양고기 구이", amount: 65000, currency: "ARS", category: "food", memo: "통양갈비 장작구이" },
    { id: "sa_exp_08", date: "2026-10-16", dateIdx: 5, title: "페리토 모레노 국립공원 입장료 & 보트 투어", amount: 180000, currency: "KRW", category: "tour", memo: "사파리 나우티코 유람선" },
    { id: "sa_exp_09", date: "2026-10-17", dateIdx: 6, title: "엘 칼라파테 ↔ 엘 찰텐 왕복 버스 2인", amount: 96000, currency: "KRW", category: "transit", memo: "치텐 트래블 버스" },
    { id: "sa_exp_10", date: "2026-10-17", dateIdx: 6, title: "Cervecería Chaltén 수제 맥주 & 버거", amount: 34000, currency: "ARS", category: "food", memo: "피츠로이 하산주" },
    { id: "sa_exp_11", date: "2026-10-19", dateIdx: 8, title: "칼라파테 ➔ 푸에르토나탈레스 국경통과 버스", amount: 120000, currency: "KRW", category: "transit", memo: "Bus-Sur 국제선" },
    { id: "sa_exp_12", date: "2026-10-19", dateIdx: 8, title: "Santolla 칠레산 킹크랩 만찬", amount: 95000, currency: "CLP", category: "food", memo: "파타고니아 킹크랩" },
    { id: "sa_exp_13", date: "2026-10-20", dateIdx: 9, title: "토레스 델 파이네 국립공원 입장권 (2인)", amount: 72000, currency: "CLP", category: "tour", memo: "3일권 공식 결제" },
    { id: "sa_exp_14", date: "2026-10-21", dateIdx: 10, title: "푸에르토나탈레스 ➔ 푼타아레나스 버스", amount: 26000, currency: "CLP", category: "transit", memo: "Bus-Sur" },
    { id: "sa_exp_15", date: "2026-10-22", dateIdx: 11, title: "푼타아레나스 ➔ 산티아고 ➔ 칼라마 LATAM", amount: 560000, currency: "KRW", category: "flights", memo: "칠레 종단 2구간 항공" },
    { id: "sa_exp_16", date: "2026-10-22", dateIdx: 11, title: "칼라마 공항 ➔ 아타카마 트랜스비파 셔틀", amount: 28000, currency: "CLP", category: "transit", memo: "왕복 미니밴" },
    { id: "sa_exp_17", date: "2026-10-23", dateIdx: 12, title: "발티나체 히든 라군 & 별빛 투어 (2인)", amount: 180000, currency: "CLP", category: "tour", memo: "사해 소금호수 + 은하수" },
    { id: "sa_exp_18", date: "2026-10-24", dateIdx: 13, title: "엘 타티오 간헐천 투어 및 국립공원 입장료", amount: 70000, currency: "CLP", category: "tour", memo: "해발 4,300m" },
    { id: "sa_exp_19", date: "2026-10-24", dateIdx: 13, title: "칼라마 ➔ 산티아고 야간 항공편", amount: 160000, currency: "KRW", category: "flights", memo: "LATAM" },
    { id: "sa_exp_20", date: "2026-10-25", dateIdx: 14, title: "스카이 코스타네라 300m 전망대 입장권", amount: 36000, currency: "CLP", category: "tour", memo: "석양 + 야경" },
    { id: "sa_exp_21", date: "2026-10-26", dateIdx: 15, title: "산티아고 ➔ 리마 ➔ 쿠스코 항공편 (2인)", amount: 620000, currency: "KRW", category: "flights", memo: "LATAM 국제선" },
    { id: "sa_exp_22", date: "2026-10-27", dateIdx: 16, title: "성스러운 계곡 투어 & 잉카레일 기차표", amount: 480000, currency: "KRW", category: "tour", memo: "마라스, 모라이, 잉카레일" },
    { id: "sa_exp_23", date: "2026-10-28", dateIdx: 17, title: "마추픽추 서킷 2 입장권 및 셔틀버스 (2인)", amount: 190000, currency: "KRW", category: "tour", memo: "클래식 망지기의 집" },
    { id: "sa_exp_24", date: "2026-10-29", dateIdx: 18, title: "쿠스코 Cicciolina 파인다이닝 디너", amount: 280, currency: "PEN", category: "food", memo: "최고급 안데스 타파스" },
    { id: "sa_exp_25", date: "2026-10-30", dateIdx: 19, title: "쿠스코 ➔ 리마 항공편 및 세비체 만찬", amount: 310000, currency: "KRW", category: "flights", memo: "푼토 아줄 정통 세비체" }
  ],

  seedJournals: {
    1: { title: "대륙을 건너 남미로, 22일간의 가슴 뛰는 여정 시작", content: "드디어 에어캐나다에 몸을 싣고 인천공항을 떠났다. 밴쿠버와 토론토를 거쳐 지구 반대편 부에노스아이레스로 향하는 길. 파타고니아의 거대한 빙하와 안데스 설산, 마추픽추가 눈앞에 아른거린다.", weather: "맑음", mood: "설렘", rating: 5 },
    3: { title: "부에노스아이레스 첫날! 탱고의 선율과 인생 스테이크", content: "7월 9일 대로의 오벨리스크를 지나 카페 토르토니에서 마신 진한 핫초콜릿과 추로스. 그리고 저녁 돈 훌리오에서 맛본 꽃등심 아사도는 왜 이곳이 미식의 도시인지 단번에 증명해 주었다.", weather: "맑음", mood: "감동", rating: 5 },
    6: { title: "천둥소리를 내며 무너지는 페리토 모레노 빙하의 위용", content: "푸른빛 거대한 얼음 성벽 앞에 섰을 때의 전율. 굉음과 함께 호수로 떨어지는 빙벽을 바라보며 자연의 장엄함에 숙연해졌다. 사파리 나우티코 보트에서 바라본 70m 빙벽은 압도적이었다.", weather: "쾌청", mood: "경이로움", rating: 5 },
    7: { title: "트레커들의 성지 엘 찰텐! 카프리 호수 너머 우뚝 선 피츠로이", content: "칼라파테에 큰 짐을 두고 가벼운 배낭으로 입성한 엘 찰텐. 에메랄드빛 카프리 호수에 비친 피츠로이 3개 봉우리는 마치 엽서 속 그림 같았다. 하산 후 마신 시원한 수제 생맥주 한잔!", weather: "바람", mood: "뿌듯함", rating: 5 },
    10: { title: "토레스 델 파이네 삼봉(20km) 완주! 내 인생 최고의 성취", content: "거대한 자갈 바위 급경사를 숨 가쁘게 올라 마침내 마주한 라스 토레스 삼봉. 비취색 빙하호수 위에 솟아오른 3개의 화강암 탑을 보며 온몸에 소름이 돋았다. 20km 하이킹 완주!", weather: "변덕", mood: "최고의성취", rating: 5 },
    18: { title: "구름 위 공중도시 마추픽추, 세계 7대 불가사의를 마주하다", content: "이른 아침 안개가 서서히 걷히며 와이나픽추와 정교한 석조 공중도시의 전경이 온전히 드러났다. 잉카인들의 찬란했던 문명과 숨결이 그대로 느껴지는 경이로운 순간이었다.", weather: "맑음", mood: "영원한기억", rating: 5 }
  }
};

if (typeof window !== "undefined") {
  window.KB_TRAVEL = KB_TRAVEL;
  window.saDays = saDays;
  window.saDays21 = saDays21;
}
