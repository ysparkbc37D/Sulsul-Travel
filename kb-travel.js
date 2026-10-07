/**
 * Sulsul-Travel Built-in Knowledge Base (kb-travel.js) v1.8.7
 * 100% Offline-First domain data for global travel, South America 22-Day Master Plan (v14 실제 항공권 & 아레키파 육로이동 완전 리플랜),
 * multi-currency rates (including Argentina MEP rate), and packing checklists.
 */

// 1. // Pristine 2026 22-Day South America Schedule Data (v14 실제 항공권 & 아레키파 육로이동 완전 리플랜)
const scheduleOct11Data = [
  {
    day: "DAY 01", date: "10월 11일 (일)", loc: "대한민국 · 인천 / 캐나다 · 밴쿠버", flight: "✈️ 인천(ICN) 17:45발 ➔ 밴쿠버(YVR) 에어캐나다 AC062",
    title: "인천공항 출국 ➔ 태평양 횡단 비행",
    desc: "출국 및 장거리 비행 (에어캐나다 AC062 탑승)",
    timeline: [
      { time: "14:00 - 14:30", typeIcon: "🛂", title: "인천공항 제1여객터미널 도착 및 출국 준비", desc: "자택 ➔ 인천공항 T1 | 교통: 공항철도/리무진 (60분)", tip: "출국 3시간 45분 전 도착, 여권 유효기간(6개월 이상) 최종 확인", mapQuery: "Incheon+Airport+T1" },
      { time: "14:30 - 15:30", typeIcon: "✈️", title: "에어캐나다(AC) 카운터 탑승 수속 및 위탁수하물 위탁", desc: "인천공항 T1 ➔ AC 체크인 카운터 | 교통: 도보", tip: "위탁수하물 1개(23kg) 태그 부착, 밴쿠버/토론토 경유 수하물 자동연결 확인", mapQuery: "Incheon+Airport+T1" },
      { time: "15:30 - 16:30", typeIcon: "💳", title: "트래블로그 카드 사전 충전 확인 및 공항 비상 100달러 신권 수령", desc: "인천공항 T1 ➔ 면세구역 은행 | 교통: 도보", tip: "구김 없는 빳빳한 100달러 신권 300~500달러 수령, 남미 4개국 eSIM 세팅", mapQuery: "Incheon+Airport+T1" },
      { time: "16:30 - 17:45", typeIcon: "✈️", title: "보안검색 및 출국심사 통과 후 탑승 게이트 대기", desc: "면세구역 ➔ 탑승 게이트 | 교통: 도보", tip: "기내용 배낭에 보조배터리, 목베개, 치약/칫솔, 패딩 겉옷 챙기기", mapQuery: "Incheon+Airport+T1" },
      { time: "17:45 ~", typeIcon: "✈️", title: "에어캐나다 AC062편 탑승 및 밴쿠버 향발 이륙", desc: "인천공항 (ICN) ➔ 밴쿠버공항 (YVR) | 교통: 에어캐나다 항공편 (9시간 40분)", tip: "1차 기내식 식사 후 시차 적응 수면 시작 (날짜변경선 통과)", mapQuery: "Incheon+Airport+T1" }
    ]
  },
  {
    day: "DAY 02", date: "10월 12일 (월)", loc: "캐나다 · 밴쿠버 / 토론토", flight: "✈️ 밴쿠버(YVR) ➔ 토론토(YYZ) ➔ 부에노스(EZE) 대륙간 야간비행",
    title: "밴쿠버 경유 & 토론토 환승 & 대륙간 야간비행",
    desc: "환승 및 야간 비행 (밴쿠버/토론토 경유)",
    timeline: [
      { time: "11:30 - 13:00", typeIcon: "🛂", title: "밴쿠버(YVR) 도착 (시차로 10/12 낮 도착) 및 CBSA 키오스크 심사", desc: "기내 ➔ 밴쿠버공항 환승구역 | 교통: 도보", tip: "환승시간 1시간 30분. 모바일 CBSA 신고서 사전 작성 필수, 수하물 자동연결", mapQuery: "Vancouver+Airport+YVR" },
      { time: "13:00 - 20:35", typeIcon: "✈️", title: "밴쿠버발 토론토(YYZ)행 국내선 연결편 환승 탑승", desc: "밴쿠버공항 (YVR) ➔ 토론토공항 (YYZ) | 교통: 에어캐나다 국내선 (4시간 35분)", tip: "캐나다 동서 횡단 비행, 기내 간단한 수분 섭취 및 스트레칭", mapQuery: "Vancouver+Airport+YVR" },
      { time: "20:35 - 21:30", typeIcon: "✈️", title: "토론토 피어슨 공항 T1 도착 후 국제선 환승 게이트 이동", desc: "토론토공항 T1 ➔ 국제선 게이트 | 교통: 도보 (20분)", tip: "추가 입국심사 없음, 게이트 전광판에서 부에노스아이레스행 탑승구 확인", mapQuery: "Toronto+Pearson+Airport" },
      { time: "21:30 - 23:10", typeIcon: "✈️", title: "게이트 인근 카페에서 따뜻한 음료 및 가벼운 샌드위치", desc: "게이트 주변 ➔ 카페 | 교통: 휴식", tip: "휴대폰 충전 및 남미 입성 전 컨디션 조절", mapQuery: "Toronto+Pearson+Airport" },
      { time: "23:10 ~", typeIcon: "✈️", title: "토론토발 부에노스아이레스(EZE)행 장거리 야간비행 탑승", desc: "토론토공항 (YYZ) ➔ 부에노스아이레스 (EZE) | 교통: 에어캐나다 국제선 (10시간 20분)", tip: "대륙간 야간 비행, 기내 딥슬립 필수 (현지 시각 도착 대비)", mapQuery: "Toronto+Pearson+Airport" }
    ]
  },
  {
    day: "DAY 03", date: "10월 13일 (화)", loc: "아르헨티나 · 부에노스아이레스", flight: "🛬 에세이사 국제공항(EZE) 14:30 착륙 & 입국",
    title: "부에노스아이레스 입국 & 역사지구 석양 & 정통 파릴라",
    desc: "시내 가벼운 산책 및 휴식 (5월광장, 카사로사다, 카페토르토니)",
    timeline: [
      { time: "14:30 - 15:30", typeIcon: "✈️", title: "부에노스아이레스 에세이사(EZE) 국제공항 착륙 및 입국 수속", desc: "기내 ➔ EZE 입국장 | 교통: 도보", tip: "입국심사 시 여권 제시, 수하물 수취대에서 위탁수하물 파손 여부 점검", mapQuery: "Ministro+Pistarini+International+Airport" },
      { time: "15:30 - 16:30", typeIcon: "✈️", title: "공항 공식 셔틀(Tienda Leon) 또는 공식 우버 탑승 ➔ 시내 이동", desc: "EZE 공항 ➔ 센트로 숙소 | 교통: 차량 이동 (약 45분)", tip: "호객 행위 불법 택시 탑승 절대 금지, 공식 카운터(Tienda Leon) 또는 우버 이용", mapQuery: "Plaza+de+Mayo+Buenos+Aires" },
      { time: "16:30 - 17:30", typeIcon: "🏨", title: "부에노스아이레스 시내 2인실 호텔 체크인 및 환복", desc: "시내 숙소 ➔ 호텔 룸 | 교통: 휴식", tip: "장시간 비행 후 세안 및 가벼운 복장 환복, 여권 원본은 객실 금고 보관", mapQuery: "Plaza+de+Mayo+Buenos+Aires" },
      { time: "17:30 - 18:30", typeIcon: "🏛️", title: "5월 광장(Plaza de Mayo) 및 분홍빛 대통령궁(카사 로사다) 도보 산책", desc: "숙소 ➔ 5월 광장 | 교통: 도보 (5분)", tip: "에비타가 연설했던 카사 로사다 앞 기념사진 촬영, 소매치기 주의", mapQuery: "Plaza+de+Mayo+Buenos+Aires" },
      { time: "18:30 - 19:30", typeIcon: "☕", title: "1858년통통 전통의 '카페 토르토니(Café Tortoni)' 티타임", desc: "5월 광장 ➔ 카페 토르토니 | 교통: 도보 (5분)", tip: "바삭한 추로스와 진한 초콜릿 음료(Submarino) 추천 (대기 길면 London City 대체)", mapQuery: "Cafe+Tortoni+Buenos+Aires" },
      { time: "19:30 - 21:30", typeIcon: "🚕", title: "정통 숯불 파릴라(Parrilla) 레스토랑 꽃등심 아사도 스테이크 디너", desc: "카페 토르토니 ➔ 유명 파릴라 식당 | 교통: 도보/우버", tip: "트래블로그 카드 결제로 MEP 우대 환율 25% 자동 할인 적용 확인!", mapQuery: "Don+Julio+Buenos+Aires" },
      { time: "21:30 ~", typeIcon: "🚕", title: "호텔 복귀 및 시차 적응 조기 취침", desc: "식당 ➔ 시내 숙소 | 교통: 우버 (10분)", tip: "한국과 12시간 시차 극복을 위해 첫날 일찍 숙면", mapQuery: "Plaza+de+Mayo+Buenos+Aires" }
    ]
  },
  {
    day: "DAY 04", date: "10월 14일 (수)", loc: "아르헨티나 · 부에노스아이레스", flight: "🚕 시내 핵심 도보 & 라 벤타나 탱고 디너쇼",
    title: "부에노스아이레스 핵심 도보 & 푸에르토 마데로 & 라 벤타나 탱고쇼",
    desc: "시내 핵심 도보투어 (엘아테네오, 레콜레타, 산텔모) & 라벤타나 탱고디너쇼",
    timeline: [
      { time: "08:30 - 09:30", typeIcon: "🍽️", title: "기상 및 호텔 조식 뷔페", desc: "시내 숙소 ➔ 조식당 | 교통: 식사", tip: "오늘 도보 일정이 많으므로 편안한 운동화 착용, 수분 500ml 섭취", mapQuery: "Plaza+de+Mayo+Buenos+Aires" },
      { time: "09:30 - 11:30", typeIcon: "🚕", title: "오페라 극장 개조 세계 1위 서점 '엘 아테네오(El Ateneo)' 방문", desc: "숙소 ➔ 엘 아테네오 서점 | 교통: 우버 (15분)", tip: "화려한 천장 벽화 감상 및 무대 위 카페 발코니 포토존", mapQuery: "El+Ateneo+Grand+Splendid" },
      { time: "11:30 - 13:00", typeIcon: "📍", title: "레콜레타 묘지(Cementerio de la Recoleta) 탐방", desc: "엘 아테네오 ➔ 레콜레타 묘지 | 교통: 도보 (15분)", tip: "대리석 야외 조각 박물관 같은 묘역, 에비타(에바 페론) 묘소 헌화", mapQuery: "Cementerio+de+la+Recoleta" },
      { time: "13:00 - 14:30", typeIcon: "🍽️", title: "레콜레타 야외 테라스 레스토랑 엠파나다 점심", desc: "레콜레타 ➔ 로컬 식당 | 교통: 식사", tip: "갓 구운 소고기/치즈 엠파나다와 시원한 로컬 맥주 킬메스(Quilmes)", mapQuery: "Cementerio+de+la+Recoleta" },
      { time: "14:30 - 17:00", typeIcon: "🚕", title: "산텔모(San Telmo) 역사 지구 & 도레고 광장 골목 산책", desc: "레콜레타 ➔ 산텔모 도레고 광장 | 교통: 우버 (20분)", tip: "고풍스러운 자갈길 앤틱 벼룩시장 거리, 길거리 탱고 버스킹 관람", mapQuery: "Plaza+Dorrego+Buenos+Aires" },
      { time: "17:00 - 18:30", typeIcon: "📍", title: "푸에르토 마데로(Puerto Madero) '여인의 다리' 석양 산책", desc: "산텔모 ➔ 여인의 다리 | 교통: 도보 (15분)", tip: "현대적인 부둣가 수변 산책로, 부에노스에서 가장 치안이 우수한 구역", mapQuery: "Puente+de+la+Mujer+Buenos+Aires" },
      { time: "18:30 - 19:30", typeIcon: "🚕", title: "호텔 복귀 및 탱고쇼 관람 준비 (스마트 캐주얼)", desc: "푸에르토 마데로 ➔ 시내 숙소 | 교통: 우버 (10분)", tip: "내일 새벽 칼라파테 비행을 위해 짐 미리 정리", mapQuery: "Plaza+de+Mayo+Buenos+Aires" },
      { time: "19:30 - 20:00", typeIcon: "🚕", title: "산텔모 라 벤타나(La Ventana) 탱고 하우스 이동", desc: "숙소 ➔ 라 벤타나 | 교통: 우버 (15분)", tip: "예약 바우처 확인 및 테이블 안내", mapQuery: "La+Ventana+Tango+Buenos+Aires" },
      { time: "20:00 - 23:30", typeIcon: "🍽️", title: "정통 탱고 디너쇼 (3코스 스테이크 요리 + 라이브 오케스트라)", desc: "라 벤타나 ➔ 쇼 행사장 | 교통: 관람 및 석식 (3시간)", tip: "아르헨티나 최고 수준의 정통 탱고 무대와 가우초 민속 음악 공연", mapQuery: "La+Ventana+Tango+Buenos+Aires" },
      { time: "23:30 ~", typeIcon: "🚕", title: "호텔 복귀 및 취침 (내일 새벽 05:00 알람 필수!)", desc: "라 벤타나 ➔ 시내 숙소 | 교통: 우버 (15분)", tip: "파타고니아 진입을 위한 컨디션 조절", mapQuery: "Plaza+de+Mayo+Buenos+Aires" }
    ]
  },
  {
    day: "DAY 05", date: "10월 15일 (목)", loc: "아르헨티나 · 부에노스아이레스 / 엘 칼라파테", flight: "✈️ 부에노스(AEP) 07:30발 ➔ 칼라파테(FTE) 10:45착 AR1870",
    title: "엘 칼라파테 이동 & 페리토 모레노 거대 빙하 탐방",
    desc: "페리토 모레노 빙하 투어 (사파리 보트 포함)",
    timeline: [
      { time: "05:00 - 05:30", typeIcon: "☕", title: "새벽 기상 및 체크아웃 (호텔 조식 박스 수령)", desc: "시내 숙소 ➔ 로비 | 교통: 준비", tip: "방한 패딩, 등산화 착용하고 출발", mapQuery: "Plaza+de+Mayo+Buenos+Aires" },
      { time: "05:30 - 06:15", typeIcon: "🚕", title: "AEP 도심 공항(국내선)으로 우버 이동 (20분 소요)", desc: "숙소 ➔ AEP 공항 | 교통: 우버 (20분)", tip: "EZE 국제공항이 아닌 도심 AEP 공항이므로 접근성 최상", mapQuery: "Aeroparque+Jorge+Newbery" },
      { time: "06:15 - 07:30", typeIcon: "🏨", title: "아에로리네아스 아르헨티나 체크인 및 수하물 1개 위탁", desc: "AEP 공항 ➔ 탑승 게이트 | 교통: 도보", tip: "2인 캐리어 1개 쉐어링 위탁(23kg), 1명은 기내 백팩", mapQuery: "Aeroparque+Jorge+Newbery" },
      { time: "07:30 - 10:45", typeIcon: "✈️", title: "부에노스아이레스(AEP)발 엘 칼라파테(FTE)행 국내선 이륙", desc: "AEP 공항 ➔ 칼라파테 공항 (FTE) | 교통: 항공편 (3시간 15분)", tip: "기내 창밖으로 광활한 파타고니아 고원과 안데스 설산 조망", mapQuery: "Comandante+Armando+Tola+International+Airport" },
      { time: "10:45 - 11:15", typeIcon: "📍", title: "엘 칼라파테 아르만도 톨라(FTE) 공항 도착!", desc: "기내 ➔ FTE 도착장 | 교통: 도보", tip: "파타고니아의 서늘하고 맑은 공기 체감! 짐 수취", mapQuery: "Comandante+Armando+Tola+International+Airport" },
      { time: "11:15 - 11:45", typeIcon: "✈️", title: "Ves Patagonia 공항 밴 셔틀 탑승 ➔ 시내 숙소 이동", desc: "FTE 공항 ➔ 리베르타도르 호텔 | 교통: 셔틀 (25분 / 21km)", tip: "숙소 문 앞까지 드롭, 왕복 티켓 확인", mapQuery: "El+Calafate+Argentina" },
      { time: "11:45 - 12:30", typeIcon: "🍻", title: "호텔 체크인 및 방한복(바람막이, 장갑, 핫팩) 착용", desc: "호텔 로비 ➔ 객실 | 교통: 준비", tip: "빙하 국립공원은 바람이 매서우므로 보온 철저", mapQuery: "El+Calafate+Argentina" },
      { time: "12:30 - 14:00", typeIcon: "✈️", title: "페리토 모레노 빙하 투어 전용 버스 탑승 ➔ 국립공원 이동", desc: "숙소 앞 ➔ 로스 글라시아레스 | 교통: 투어 버스 (80km, 1.3시간)", tip: "아르헨티노 호숫가를 따라 파타고니아 풍경 감상", mapQuery: "Perito+Moreno+Glacier" },
      { time: "14:00 - 15:30", typeIcon: "🥾", title: "[GOAL] 페리토 모레노 거대 빙하 전망대(코스타네라 파사렐라) 관람", desc: "국립공원 매표소 ➔ 빙하 전망대 | 교통: 도보 하이킹 (1.5시간)", tip: "천둥 치는 굉음과 함께 호수로 떨어지는 거대한 푸른 빙벽 붕락 조망!", mapQuery: "Perito+Moreno+Glacier" },
      { time: "15:30 - 17:30", typeIcon: "✈️", title: "사파리 나우티코(Safari Náutico) 빙하 근접 보트 탑승", desc: "선착장 ➔ 빙벽 전면 | 교통: 보트 항해 (1시간)", tip: "높이 70m의 깎아지른 푸른 빙벽 바로 코앞 100m까지 접근하는 전율!", mapQuery: "Perito+Moreno+Glacier" },
      { time: "17:30 - 19:30", typeIcon: "✈️", title: "투어 버스 탑승 ➔ 엘 칼라파테 시내 귀환", desc: "국립공원 ➔ 칼라파테 시내 | 교통: 차량 (1.3시간)", tip: "차량 내 휴식 및 칼라파테 시내 19:00 도착", mapQuery: "El+Calafate+Argentina" },
      { time: "19:30 - 21:30", typeIcon: "🍽️", title: "La Tablita에서 화덕 장작불 파타고니아 어린 양고기(Cordero) 통구이 만찬", desc: "숙소 ➔ La Tablita | 교통: 도보 (10분)", tip: "바삭하고 촉촉한 파타고니아 전통 양갈비 구이와 레드와인", mapQuery: "La+Tablita+El+Calafate" },
      { time: "21:30 ~", typeIcon: "🏨", title: "리베르타도르 메인 거리 산책 및 호텔 휴식", desc: "식당 ➔ 숙소 | 교통: 도보", tip: "내일 피츠로이 이동을 위한 편안한 숙면", mapQuery: "El+Calafate+Argentina" }
    ]
  },
  {
    day: "DAY 06", date: "10월 16일 (금)", loc: "아르헨티나 · 엘 칼라파테 ➔ 엘 찰텐", flight: "🚌 Chaltén Travel 우등 버스 08:00발 (3시간)",
    title: "엘 찰텐 이동 & 피츠로이 카프리 호수 트레킹 & 찰텐 1박",
    desc: "★ 엘 찰텐 이동, 초리요 폭포 워밍업 & 야간 산행 패킹 후 조기 취침",
    timeline: [
      { time: "06:30 - 07:30", typeIcon: "☕", title: "기상 및 조식, 체크아웃 (큰 짐 호텔 리셉션 무료 보관)", desc: "칼라파테 숙소 ➔ 로비 | 교통: 준비", tip: "★ 1박2일용 작은 배낭에 방한복, 세면도구만 패킹하여 가볍게 출발!", mapQuery: "El+Calafate+Argentina" },
      { time: "07:30 - 08:00", typeIcon: "🚌", title: "칼라파테 버스 터미널로 이동", desc: "숙소 ➔ 칼라파테 터미널 | 교통: 도보/택시 (5분)", tip: "터미널 출발 30분 전 도착", mapQuery: "Terminal+de+Omnibus+El+Calafate" },
      { time: "08:00 - 11:00", typeIcon: "✈️", title: "Chaltén Travel 우등 버스 탑승 (루타 40 고원 도로)", desc: "칼라파테 터미널 ➔ 엘 찰텐 터미널 | 교통: 우등 버스 (3시간 / 215km)", tip: "창밖으로 비에드마 호수와 저 멀리 솟아오른 피츠로이 삼각 첨탑 조망", mapQuery: "El+Chalten+Argentina" },
      { time: "11:00 - 11:45", typeIcon: "🏨", title: "엘 찰텐 도착, 국립공원 방문자센터 브리핑 ➔ 마을 호텔 체크인", desc: "찰텐 터미널 ➔ 찰텐 숙소 | 교통: 도보 (5분)", tip: "등산로 입구 도보 5분 숙소 투숙 및 배낭 경량화", mapQuery: "El+Chalten+Argentina" },
      { time: "11:45 - 13:30", typeIcon: "🥾", title: "[START] 피츠로이 트레킹로 진입 (Sendero al Fitz Roy)", desc: "마을 입구 ➔ 카프리 호수 방면 | 교통: 오르막 트레킹 (1.5시간)", tip: "초반 완만한 오르막 숲길, 등산스틱 세팅", mapQuery: "Sendero+al+Fitz+Roy" },
      { time: "13:30 - 14:15", typeIcon: "🥾", title: "미라도르 델 피츠로이(Mirador del Fitz Roy) 1차 뷰포인트 조망", desc: "등산로 중턱 ➔ 피츠로이 전망대 | 교통: 도보", tip: "구름 사이로 위용을 드러내는 거대한 피츠로이 바위산", mapQuery: "Mirador+Fitz+Roy" },
      { time: "14:15 - 15:45", typeIcon: "🍽️", title: "[GOAL] 카프리 호수(Laguna Capri) 도착 & 피크닉 런치", desc: "등산로 ➔ Laguna Capri | 교통: 감상 및 런치 (1.5시간)", tip: "비취빛 호수 수면에 반영된 피츠로이 3대 첨탑 엽서 뷰 감상!", mapQuery: "Laguna+Capri+El+Chalten" },
      { time: "15:45 - 17:00", typeIcon: "📍", title: "호숫가 백사장에서 피톤치드 휴식 (체력에 따라 로스 트레스 방면)", desc: "Laguna Capri ➔ 호숫가 숲길 | 교통: 도보 산책", tip: "★ 당일치기 버스 시간에 쫓기지 않고 찰텐 1박으로 누리는 여유!", mapQuery: "Laguna+Capri+El+Chalten" },
      { time: "17:00 - 18:30", typeIcon: "📍", title: "엘 찰텐 마을로 여유롭게 하산", desc: "카프리 호수 ➔ 찰텐 마을 | 교통: 하산 (1.5시간)", tip: "부드러운 내리막 숲길 산책", mapQuery: "El+Chalten+Argentina" },
      { time: "18:30 - 19:30", typeIcon: "🏨", title: "마을 복귀, 숙소 온수 샤워 및 환복", desc: "마을 ➔ 숙소 | 교통: 휴식", tip: "트레킹 피로 해소", mapQuery: "El+Chalten+Argentina" },
      { time: "19:30 - 21:30", typeIcon: "🍽️", title: "Cervecería Chaltén 로컬 브루어리 수제 생맥주 & 수제버거 만찬", desc: "숙소 ➔ Cerveceria Chalten | 교통: 도보 (5분)", tip: "전 세계 트레커들이 모여 파타고니아 수제 IPA/스타우트 생맥주를 즐기는 펍", mapQuery: "Cerveceria+Chalten" },
      { time: "21:30 ~", typeIcon: "🏨", title: "찰텐 마을 밤하늘 쏟아지는 남십자성 은하수 감상 및 취침", desc: "식당 ➔ 숙소 | 교통: 도보", tip: "내일 아침 황금 일출을 위해 조기 취침 (알람 06:00)", mapQuery: "El+Chalten+Argentina" }
    ]
  },
  {
    day: "DAY 07", date: "10월 17일 (토)", loc: "아르헨티나 · 엘 찰텐 ➔ 엘 칼라파테", flight: "🚌 Chaltén Travel 복귀 버스 17:30발 (3시간)",
    title: "피츠로이 황금 일출 ➔ 초리요 폭포 ➔ 엘 칼라파테 복귀",
    desc: "★ [불타는 고구마 챌린지] 피츠로이 일출 ➔ 하산 샤워 ➔ 칼라파테 복귀",
    timeline: [
      { time: "06:00 - 06:30", typeIcon: "⏰", title: "기상 및 보온 등산복 착용 (방한모자, 장갑 필수)", desc: "찰텐 숙소 ➔ 로비 | 교통: 준비", tip: "새벽 기온 쌀쌀하므로 보온 철저", mapQuery: "El+Chalten+Argentina" },
      { time: "06:30 - 07:15", typeIcon: "🥾", title: "미라도르 로스 콘도레스(Mirador de los Cóndores) 일출 하이킹", desc: "숙소 ➔ 콘도레스 전망대 | 교통: 오르막 도보 (30분)", tip: "마을 뒤편 언덕으로 올라 찰텐 계곡 전체 조망", mapQuery: "Mirador+de+los+Condores+El+Chalten" },
      { time: "07:15 - 08:30", typeIcon: "🥾", title: "[HIGHLIGHT] '불타는 피츠로이' 붉은 황금빛 일출 파노라마", desc: "전망대 ➔ 피츠로이 전면 | 교통: 일출 감상", tip: "아침 첫 햇살이 피츠로이 화강암 봉우리를 붉게 물들이는 장엄한 순간!", mapQuery: "Mirador+de+los+Condores+El+Chalten" },
      { time: "08:30 - 10:00", typeIcon: "🍽️", title: "마을 복귀 및 따뜻한 카페 조식 (크루아상 & 카푸치노)", desc: "전망대 ➔ 로컬 베이커리 | 교통: 식사", tip: "피츠로이 일출 사진 정리 및 티타임", mapQuery: "El+Chalten+Argentina" },
      { time: "10:00 - 12:30", typeIcon: "📍", title: "초리요 델 살토(Chorrillo del Salto) 숲속 폭포 가벼운 평지 산책", desc: "숙소 ➔ 초리요 폭포 | 교통: 평지 도보 (왕복 2시간)", tip: "렝가 나무 숲길을 따라 걷는 20m 숲속 은빛 폭포", mapQuery: "Chorrillo+del+Salto+El+Chalten" },
      { time: "12:30 - 13:30", typeIcon: "🍽️", title: "마을 로컬 비스트로에서 안데스 따뜻한 렌틸콩 스튜(Guiso) 점심", desc: "폭포 ➔ 로컬 식당 | 교통: 식사", tip: "피로를 녹여주는 영양 만점 가정식 스튜", mapQuery: "El+Chalten+Argentina" },
      { time: "13:30 - 14:00", typeIcon: "🚌", title: "호텔 배낭 픽업 및 찰텐 버스 터미널 이동", desc: "숙소 ➔ 찰텐 터미널 | 교통: 도보 (5분)", tip: "탑승권 확인", mapQuery: "El+Chalten+Argentina" },
      { time: "14:00 - 17:00", typeIcon: "✈️", title: "엘 칼라파테행 정기 우등버스 탑승", desc: "찰텐 터미널 ➔ 칼라파테 터미널 | 교통: 우등 버스 (3시간)", tip: "버스 창밖으로 파타고니아 초원 감상 및 수면", mapQuery: "Terminal+de+Omnibus+El+Calafate" },
      { time: "17:00 - 18:30", typeIcon: "🚕", title: "엘 칼라파테 복귀 및 호텔 체크인 (보관했던 메인 캐리어 수령)", desc: "터미널 ➔ 칼라파테 호텔 | 교통: 도보/택시 (5분)", tip: "캐리어와 합체, 짐 정리", mapQuery: "El+Calafate+Argentina" },
      { time: "18:30 - 19:30", typeIcon: "📍", title: "라구나 님페스(Laguna Nimez) 자연 조류 보호구역 석양 플라밍고 산책", desc: "호텔 ➔ 라구나 님페스 | 교통: 도보 (15분)", tip: "아르헨티노 호숫가 핑크빛 플라밍고 조망", mapQuery: "Laguna+Nimez+El+Calafate" },
      { time: "19:30 - 21:30", typeIcon: "🍽️", title: "칼라파테 시내 이탈리안 피자 & 수제 맥주 저녁", desc: "호수 ➔ 로컬 식당 | 교통: 식사", tip: "내일 국경 넘기 위해 신선 과일/육류는 오늘 밤 모두 섭취!", mapQuery: "El+Calafate+Argentina" },
      { time: "21:30 ~", typeIcon: "🏨", title: "호텔 복귀 및 취침 (알람 06:30)", desc: "식당 ➔ 호텔 | 교통: 도보", tip: "내일 아침 08:00 칠레행 국제버스 탑승 대비", mapQuery: "El+Calafate+Argentina" }
    ]
  },
  {
    day: "DAY 08", date: "10월 18일 (일)", loc: "아르헨티나 · 칼라파테 ➔ 칠레 · 푸에르토나탈레스", flight: "🚌 Bus Sur 국제 우등버스 08:00발 (칼라파테 ➔ 나탈레스 5.5시간)",
    title: "국경 버스 이동 (아르헨티나 ➔ 칠레 푸에르토나탈레스)",
    desc: "국경 이동 및 마트 장보기 (트레킹 행동식 & 고기 홈쿠킹 1차)",
    timeline: [
      { time: "06:30 - 07:30", typeIcon: "☕", title: "기상 및 조식, 체크아웃", desc: "칼라파테 호텔 ➔ 로비 | 교통: 준비", tip: "칠레 입국 시 생과일/유제품/육포 반입 절대 금지 확인", mapQuery: "El+Calafate+Argentina" },
      { time: "07:30 - 08:00", typeIcon: "🚌", title: "칼라파테 버스 터미널로 이동", desc: "숙소 ➔ 칼라파테 터미널 | 교통: 도보/택시 (5분)", tip: "여권 원본 및 국경버스 티켓 지참", mapQuery: "Terminal+de+Omnibus+El+Calafate" },
      { time: "08:00 - 11:30", typeIcon: "✈️", title: "Bus Sur 국제 우등버스 탑승 (칼라파테 ➔ 푸에르토나탈레스)", desc: "칼라파테 터미널 ➔ 국경 검문소 | 교통: 국제 우등버스 (350km / 5.5시간)", tip: "안데스 산맥을 넘는 국제 육로 이동", mapQuery: "Paso+Rio+Don+Guillermo" },
      { time: "11:30 - 12:15", typeIcon: "🛂", title: "아르헨티나 출국 심사대(Cancha Carrera) 출국 도장 날인", desc: "버스 ➔ 아르헨티나 출국장 | 교통: 수속", tip: "전원 하차하여 출국 심사 후 버스 재탑승", mapQuery: "Paso+Rio+Don+Guillermo" },
      { time: "12:15 - 13:30", typeIcon: "🛂", title: "칠레 입국 심사대(Cerro Castillo) 입국 도장 및 SAG 검역 통과", desc: "버스 ➔ 칠레 입국장 | 교통: 수속", tip: "위탁 수하물 X-ray 검사. 사과/바나나/육포 미신고 적발 시 벌금", mapQuery: "Paso+Rio+Don+Guillermo" },
      { time: "13:30 - 14:00", typeIcon: "📍", title: "칠레 파타고니아 거점 푸에르토나탈레스 로돌포 터미널 도착", desc: "버스 ➔ 나탈레스 터미널 | 교통: 도보", tip: "칠레 페소(CLP) 사용 시작", mapQuery: "Terminal+Rodoviario+Puerto+Natales" },
      { time: "14:00 - 15:00", typeIcon: "🚕", title: "푸에르토나탈레스 주방 구비 숙소 체크인 (4박 연박 선점)", desc: "터미널 ➔ 시내 숙소 | 교통: 도보/택시 (10분)", tip: "★ [가성비 꿀팁] 주방이 있어 마트 요리로 외식비 10만원 절감!", mapQuery: "Puerto+Natales+Chile" },
      { time: "15:00 - 17:30", typeIcon: "🍻", title: "대형마트 Unimarc 도보 이동 ➔ 소고기 안심, 와인, 트레킹 행동식 장보기", desc: "숙소 ➔ Unimarc 마트 | 교통: 도보 (7분)", tip: "칠레산 꽃등심/안심 소고기(1팩 7천원), 카르메네르 와인, 아보카도 구매", mapQuery: "Unimarc+Puerto+Natales" },
      { time: "17:30 - 19:00", typeIcon: "📍", title: "희망의 만(Golfo de la Última Esperanza) 부둣가 해안 산책", desc: "숙소 ➔ 희망의 만 부두 | 교통: 도보 (10분)", tip: "오래된 목조 부두 잔해와 피오르드 바다 위로 지는 붉은 석양", mapQuery: "Muelle+Historico+Puerto+Natales" },
      { time: "19:00 - 21:30", typeIcon: "🍽️", title: "[가성비 홈쿠킹 1차] 숙소 주방에서 칠레 소고기 스테이크 & 와인 파티", desc: "부두 ➔ 숙소 주방 | 교통: 식사", tip: "파타고니아 비싼 외식 물가 완벽 방어! 낭만적인 둘만의 저녁", mapQuery: "Puerto+Natales+Chile" },
      { time: "21:30 ~", typeIcon: "🏨", title: "내일 토레스 델 파이네 투어를 위한 배낭 준비 및 취침", desc: "숙소 ➔ 객실 | 교통: 휴식", tip: "알람 06:30 설정", mapQuery: "Puerto+Natales+Chile" }
    ]
  },
  {
    day: "DAY 09", date: "10월 19일 (월)", loc: "칠레 · 푸에르토나탈레스 (토레스 델 파이네)", flight: "🥾 미라도르 라스 토레스(삼봉) 베이스 20km 완주",
    title: "★ [핵심 하이라이트] 미라도르 라스 토레스(삼봉) 베이스 20km 완주",
    desc: "★ [핵심 하이라이트] 미라도르 라스 토레스(삼봉) 베이스 20km 완주!",
    timeline: [
      { time: "05:30 - 06:30", typeIcon: "☕", title: "새벽 기상 및 든든한 조식 (물 1.5L, 보온병, 행동식 패킹)", desc: "나탈레스 숙소 ➔ 객실 | 교통: 준비", tip: "등산화 끈 단단히 묶고 등산스틱 세팅. 오늘 날씨 맑음 확인", mapQuery: "Puerto+Natales+Chile" },
      { time: "06:30 - 08:30", typeIcon: "✈️", title: "나탈레스 터미널에서 국립공원행 정기버스 탑승", desc: "나탈레스 터미널 ➔ 라구나 아메르가 | 교통: 정기버스 (1시간 40분)", tip: "버스 내에서 체력 비축 수면", mapQuery: "Terminal+Rodoviario+Puerto+Natales" },
      { time: "08:30 - 09:00", typeIcon: "🚌", title: "라구나 아메르가에서 호텔 라스 토레스 웰컴센터 셔틀 환승", desc: "매표소 ➔ 웰컴센터 | 교통: 셔틀 (15분)", tip: "화장실 이용 및 스트레칭", mapQuery: "Hotel+Las+Torres+Patagonia" },
      { time: "09:00 - 10:30", typeIcon: "🥾", title: "[START] 미라도르 라스 토레스(삼봉) 베이스 트레킹 시작", desc: "웰컴센터 ➔ 아센시오 계곡 | 교통: 등반 시작", tip: "총 왕복 20km, 약 8시간 소요 코스", mapQuery: "Mirador+Las+Torres" },
      { time: "10:30 - 12:00", typeIcon: "🍻", title: "바람의 고개(Paso del Viento) 통과 ➔ 칠레노 산장 도착", desc: "등산로 ➔ 칠레노 산장 | 교통: 오르막 도보", tip: "1차 수분 섭취 및 행동식 간식 (계곡 물소리 감상)", mapQuery: "Refugio+Chileno" },
      { time: "12:00 - 13:00", typeIcon: "🥾", title: "렝가 숲길 통과 후 마지막 너덜지대 모레인(Moraine) 암벽 오르막 진입", desc: "숲길 끝 ➔ 너덜바위 오르막 | 교통: 급경사 등반 (1시간)", tip: "가장 가파른 바위 구간, 발밑 미끄러짐 주의", mapQuery: "Mirador+Las+Torres" },
      { time: "13:00 - 14:15", typeIcon: "🍽️", title: "[GOAL] 미라도르 라스 토레스(삼봉) 베이스 캠프 도착!", desc: "오르막 끝 ➔ Mirador Las Torres | 교통: 감상 및 런치 (1시간)", tip: "비취색 빙하호수 위로 하늘을 찌르는 3개 화강암 첨탑! 파타고니아 최고의 성취", mapQuery: "Mirador+Las+Torres" },
      { time: "14:15 - 16:00", typeIcon: "📍", title: "무릎 충격을 줄이며 조심스럽게 하산 시작", desc: "삼봉 베이스 ➔ 칠레노 산장 | 교통: 하산 (1.5시간)", tip: "등산스틱 길이 늘려서 무릎 보호", mapQuery: "Mirador+Las+Torres" },
      { time: "16:00 - 18:00", typeIcon: "📍", title: "칠레노 산장 통과 ➔ 아센시오 계곡 하산길 주행", desc: "칠레노 산장 ➔ 웰컴센터 | 교통: 하산 (2시간)", tip: "완만한 내리막길", mapQuery: "Refugio+Chileno" },
      { time: "18:00 - 18:30", typeIcon: "🏨", title: "호텔 라스 토레스 웰컴센터 하산 완료 (20km 전원 완주!)", desc: "등산로 끝 ➔ 웰컴센터 | 교통: 휴식", tip: "시원한 음료 섭취 및 셔틀 탑승", mapQuery: "Hotel+Las+Torres+Patagonia" },
      { time: "18:30 - 20:30", typeIcon: "✈️", title: "푸에르토나탈레스행 복귀 정기버스 탑승", desc: "라구나 아메르가 ➔ 나탈레스 터미널 | 교통: 정기버스 (1.5시간)", tip: "버스 내 깊은 숙면", mapQuery: "Terminal+Rodoviario+Puerto+Natales" },
      { time: "20:30 - 21:00", typeIcon: "📍", title: "푸에르토나탈레스 시내 복귀", desc: "터미널 ➔ 시내 | 교통: 도보", tip: "숙소 이동 및 온수 샤워", mapQuery: "Puerto+Natales+Chile" },
      { time: "21:00 - 23:00", typeIcon: "🍽️", title: "완주 기념 만찬: Santolla 킹크랩(Centolla) 요리 & 칼라파테 사워", desc: "숙소 ➔ Santolla 식당 | 교통: 식사", tip: "신선한 파타고니아산 킹크랩 타르타르와 맥주로 잊지 못할 저녁", mapQuery: "Santolla+Puerto+Natales" },
      { time: "23:00 ~", typeIcon: "🏨", title: "호텔 복귀, 따뜻한 온수 샤워 후 꿀잠 (내일 늦잠 가능!)", desc: "식당 ➔ 숙소 | 교통: 도보", tip: "내일 오후 15:38 비행기이므로 오전 여유 휴식", mapQuery: "Puerto+Natales+Chile" }
    ]
  },
  {
    day: "DAY 10", date: "10월 20일 (화)", loc: "칠레 · 푸에르토나탈레스 ➔ 산티아고", flight: "✈️ [실제항공권] 나탈레스(PNT) 15:38발 ➔ 산티아고(SCL) 20:01착",
    title: "★ [실제 항공권] 푸에르토나탈레스 15:38발 ➔ 산티아고 20:01착 (산티아고 1박)",
    desc: "오전 시내 여유 휴식 & 점심 ➔ PNT 공항 이동 ➔ 산티아고 도착 체크인",
    timeline: [
      { time: "08:30 - 10:00", typeIcon: "🍽️", title: "느긋한 늦잠 기상 및 숙소 조식 (삼봉 완주 후 꿀잠)", desc: "나탈레스 숙소 ➔ 객실 | 교통: 식사", tip: "어제 20km 등반 근육통 완화 스트레칭", mapQuery: "Puerto+Natales+Chile" },
      { time: "10:00 - 11:30", typeIcon: "📍", title: "나탈레스 시내 공예품 샵 & 아르투로 프랏 거리 산책", desc: "숙소 ➔ 시내 상점가 | 교통: 도보 (5분)", tip: "파타고니아 마그넷, 와펜, 엽서 소량 쇼핑", mapQuery: "Puerto+Natales+Chile" },
      { time: "11:30 - 13:00", typeIcon: "🍽️", title: "Unimarc 마트 방문 및 감성 로컬 카페 브런치", desc: "상점가 ➔ 로컬 카페 | 교통: 식사/쇼핑", tip: "따뜻한 카푸치노와 샌드위치 여유로운 점심", mapQuery: "Unimarc+Puerto+Natales" },
      { time: "13:00 - 13:30", typeIcon: "🏨", title: "숙소 복귀 및 수하물 패킹 후 체크아웃", desc: "카페 ➔ 숙소 로비 | 교통: 준비", tip: "2인 캐리어 1개 위탁(23kg), 1명 기내 백팩 쉐어링", mapQuery: "Puerto+Natales+Chile" },
      { time: "13:30 - 14:00", typeIcon: "🚕", title: "푸에르토나탈레스 공항(PNT)으로 택시 이동", desc: "숙소 ➔ PNT 공항 | 교통: 택시 (15분)", tip: "공항 택시비 약 8,000~10,000 CLP. 13:45 공항 도착 (출발 1시간 50분 전)", mapQuery: "Teniente+Julio+Gallardo+Airport" },
      { time: "14:00 - 15:38", typeIcon: "✈️", title: "스카이항공/LATAM 카운터 체크인 및 위탁수하물 위탁", desc: "PNT 공항 ➔ 탑승구 | 교통: 수속", tip: "모바일 탑승권 확인, 보안검색 통과", mapQuery: "Teniente+Julio+Gallardo+Airport" },
      { time: "15:38 - 20:01", typeIcon: "✈️", title: "★ [실제 예매] 나탈레스(PNT) 출발 ➔ 산티아고(SCL) 향발 이륙!", desc: "PNT 공항 ➔ 산티아고공항 (SCL) | 교통: 항공편 (3시간 23분)", tip: "기내 창밖으로 거대한 파타고니아 남부 빙원과 안데스 만년설산 상공 통과", mapQuery: "Arturo+Merino+Benitez+International+Airport" },
      { time: "20:01 - 20:45", typeIcon: "✈️", title: "★ 산티아고 아르투로 메리노 베니테스(SCL) 공항 착륙!", desc: "기내 ➔ SCL 도착장 | 교통: 도보", tip: "수하물 수취대에서 위탁 캐리어 수령", mapQuery: "Arturo+Merino+Benitez+International+Airport" },
      { time: "20:45 - 21:30", typeIcon: "🚕", title: "공항 공식 택시 카운터(Official Taxi) 이용 ➔ 프로비덴시아 이동", desc: "SCL 공항 ➔ 프로비덴시아 호텔 | 교통: 공식 택시 (25분)", tip: "고속도로 직통 주행, 택시비 약 20,000 CLP", mapQuery: "Providencia+Santiago" },
      { time: "21:30 - 22:00", typeIcon: "🏨", title: "산티아고 프로비덴시아 안전구역 호텔 체크인", desc: "호텔 로비 ➔ 호텔 룸 | 교통: 체크인", tip: "쾌적한 도심 호텔 입실 및 짐 풀기", mapQuery: "Providencia+Santiago" },
      { time: "22:00 - 23:30", typeIcon: "🍽️", title: "호텔 인근 Bar Liguria 또는 로컬 펍 칠레 와인 & 스테이크 야식", desc: "호텔 ➔ Bar Liguria | 교통: 도보 (5분)", tip: "칠레 카르메네르 프리미엄 와인과 타파스로 파타고니아 무사 정복 자축", mapQuery: "Bar+Liguria+Providencia" },
      { time: "23:30 ~", typeIcon: "🏨", title: "호텔 복귀 및 편안한 침대 숙면 (내일 산티아고 전일 투어)", desc: "식당 ➔ 호텔 | 교통: 도보", tip: "알람 08:30 설정, 깊은 숙면", mapQuery: "Providencia+Santiago" }
    ]
  },
  {
    day: "DAY 11", date: "10월 21일 (수)", loc: "칠레 · 산티아고", flight: "🚡 산 크리스토발 케이블카 & 스카이 코스타네라 300m 야경",
    title: "✨ [산티아고 전일 투어] 케이블카 & 스카이 코스타네라 300m 야경 (산티아고 2박)",
    desc: "산티아고 전일 시내 투어 (아르마스광장, 산크리스토발 케이블카, 코스타네라 300m 야경)",
    timeline: [
      { time: "08:30 - 09:30", typeIcon: "🍽️", title: "기상 및 호텔 여유로운 조식 뷔페", desc: "산티아고 숙소 ➔ 조식당 | 교통: 식사", tip: "편안한 복장으로 도심 관광 출발", mapQuery: "Providencia+Santiago" },
      { time: "09:30 - 11:30", typeIcon: "🏛️", title: "산티아고 센트로 이동: 아르마스 광장 & 메트로폴리탄 대성당 관람", desc: "숙소 ➔ 아르마스 광장 | 교통: 지하철 1호선 (15분)", tip: "바로크 양식의 웅장한 대성당 내부 감상", mapQuery: "Plaza+de+Armas+Santiago" },
      { time: "11:30 - 13:00", typeIcon: "🏛️", title: "산타루시아 언덕(Cerro Santa Lucía) 성채 정원 산책", desc: "아르마스 광장 ➔ 산타루시아 언덕 | 교통: 도보 (10분)", tip: "중세 유럽풍 성채 분수대 조망", mapQuery: "Cerro+Santa+Lucia+Santiago" },
      { time: "13:00 - 14:30", typeIcon: "🍽️", title: "로컬 레스토랑 Galindo에서 전통 옥수수 파이(Pastel de Choclo) 점심", desc: "산타루시아 ➔ Galindo | 교통: 도보 (10분)", tip: "푸짐하고 달콤짭짤한 칠레 대표 가정식 요리", mapQuery: "Galindo+Santiago" },
      { time: "14:30 - 16:00", typeIcon: "📍", title: "벨라비스타 보헤미안 거리 및 파티오 벨라비스타 벽화 골목 산책", desc: "식당 ➔ 벨라비스타 | 교통: 도보", tip: "감성 카페와 거리 예술 감상", mapQuery: "Patio+Bellavista+Santiago" },
      { time: "16:00 - 17:30", typeIcon: "✈️", title: "산크리스토발 언덕(Cerro San Cristóbal) 케이블카 탑승", desc: "벨라비스타 입구 ➔ 정상 성모마리아상 | 교통: 케이블카 (15분)", tip: "안데스 만년설산과 산티아고 도심 파노라마 조망", mapQuery: "Cerro+San+Cristobal+Santiago" },
      { time: "17:30 - 19:30", typeIcon: "✈️", title: "★ 남미 최고층 빌딩 '스카이 코스타네라(Sky Costanera, 300m)' 61~62층 등반", desc: "산크리스토발 ➔ 코스타네라 타워 | 교통: 지하철 1호선 (10분)", tip: "360도 안데스 노을과 산티아고 도심 파노라마 야경 감상!", mapQuery: "Sky+Costanera+Santiago" },
      { time: "19:30 - 20:30", typeIcon: "🍻", title: "Costanera Center Jumbo 대형마트 와인 쇼핑", desc: "전망대 ➔ Jumbo 마트 | 교통: 도보", tip: "칠레 프리미엄 와인(돈 멜초, 마르케스 등) 한국 대비 1/3 가격에 구입", mapQuery: "Jumbo+Costanera+Center" },
      { time: "20:30 - 22:30", typeIcon: "🍽️", title: "프로비덴시아 유명 레스토랑에서 칠레 해산물 요리 저녁", desc: "코스타네라 ➔ 로컬 레스토랑 | 교통: 식사", tip: "신선한 연어 구이 및 세비체 식사", mapQuery: "Providencia+Santiago" },
      { time: "22:30 ~", typeIcon: "🏨", title: "호텔 복귀 및 휴식", desc: "식당 ➔ 호텔 | 교통: 도보", tip: "편안한 연박 숙면", mapQuery: "Providencia+Santiago" }
    ]
  },
  {
    day: "DAY 12", date: "10월 22일 (목)", loc: "칠레 · 산티아고 (근교 당일치기)", flight: "🚌 산티아고 근교 발파라이소/와이너리 당일치기",
    title: "✨ [산티아고 근교 당일치기] 발파라이소/와이너리 ➔ 내일 새벽 출국 패킹 (산티아고 3박)",
    desc: "산티아고 근교 당일치기 (발파라이소/비냐델마르 or 콘차이토로 와이너리) ➔ 조기취침",
    timeline: [
      { time: "08:30 - 09:30", typeIcon: "🍽️", title: "기상 및 호텔 조식", desc: "산티아고 숙소 ➔ 조식당 | 교통: 식사", tip: "근교 당일치기 투어 출발", mapQuery: "Providencia+Santiago" },
      { time: "09:30 - 11:30", typeIcon: "✈️", title: "발파라이소(Valparaíso)행 직행 버스 탑승 (터미널 알라메다)", desc: "터미널 ➔ 발파라이소 터미널 | 교통: 우등 버스 (1시간 30분)", tip: "태평양 해안 언덕 항구 도시로 이동", mapQuery: "Terminal+Alameda+Santiago" },
      { time: "11:30 - 13:30", typeIcon: "✈️", title: "발파라이소 유네스코 언덕 벽화 마을 & 아센소르(Ascensor) 탑승", desc: "발파라이소 ➔ 세로 콘셉시온 | 교통: 도보/아센소르", tip: "골목마다 수놓인 화려한 벽화와 태평양 바다 파노라마", mapQuery: "Cerro+Concepcion+Valparaiso" },
      { time: "13:30 - 15:30", typeIcon: "🍽️", title: "해안가 레스토랑에서 칠레식 해물탕(Paila Marina) & 해산물 점심", desc: "세로 알레그레 ➔ 해안 식당 | 교통: 식사", tip: "신선한 태평양 해산물과 화이트 와인", mapQuery: "Valparaiso+Chile" },
      { time: "15:30 - 17:00", typeIcon: "🚆", title: "인근 휴양지 비냐델마르(Viña del Mar) 해변 꽃시계 산책", desc: "발파라이소 ➔ 비냐델마르 | 교통: 전철 (15분)", tip: "시원한 태평양 파도 감상", mapQuery: "Reloj+de+Flores+Vina+del+Mar" },
      { time: "17:00 - 19:00", typeIcon: "✈️", title: "산티아고행 귀환 버스 탑승", desc: "비냐델마르 ➔ 산티아고 터미널 | 교통: 버스 (1시간 30분)", tip: "차량 내 휴식 및 18:30 시내 도착", mapQuery: "Terminal+Alameda+Santiago" },
      { time: "19:00 - 19:30", typeIcon: "☕", title: "★ [내일 새벽 05:00 출국 패킹] 캐리어 짐 정리 및 조식 박스 요청", desc: "호텔 ➔ 객실 | 교통: 준비", tip: "★ [시간표 철저 확인] 내일 새벽 02:15 기상! 02:40 우버 탑승 ➔ 05:00 아리카행 비행기!", mapQuery: "Providencia+Santiago" },
      { time: "19:30 - 21:30", typeIcon: "🍽️", title: "호텔 인근 가벼운 파스타/스테이크 저녁 식사", desc: "숙소 ➔ 로컬 식당 | 교통: 식사", tip: "새벽 기상을 위해 과음 자제", mapQuery: "Providencia+Santiago" },
      { time: "21:30 ~", typeIcon: "🏨", title: "★ 조기 취침 (새벽 02:15 기상 알람 필수 설정!)", desc: "식당 ➔ 숙소 | 교통: 휴식", tip: "스마트폰 알람 2대 중복 설정 (새벽 02:15)", mapQuery: "Providencia+Santiago" }
    ]
  },
  {
    day: "DAY 13", date: "10월 23일 (금)", loc: "칠레 · 산티아고 ➔ 아리카 ➔ 페루 · 아레키파", flight: "✈️ [실제항공권] 산티아고 05:00발 ➔ 아리카 07:40착 ➔ 국경 육로 ➔ 아레키파",
    title: "★ [실제 항공권] 산티아고 05:00발 ➔ 아리카 ➔ 타크나 국경 ➔ 백색도시 아레키파 (아레키파 1박)",
    desc: "★ 칠레-페루 국경 통과 ➔ 백색의 도시 아레키파 도착 & 아르마스 광장 석양",
    timeline: [
      { time: "02:15 - 02:40", typeIcon: "☕", title: "★ 새벽 기상 및 체크아웃 (호텔 조식 박스 수령)", desc: "산티아고 숙소 ➔ 로비 | 교통: 준비", tip: "소지품 최종 점검, 여권 필수 지참", mapQuery: "Providencia+Santiago" },
      { time: "02:40 - 03:30", typeIcon: "🚕", title: "산티아고 공항(SCL) 국내선 터미널로 우버 이동", desc: "숙소 ➔ SCL 국내선 | 교통: 우버 (20분)", tip: "새벽 시간대 고속도로 원활, 03:00 공항 도착 (출발 2시간 전)", mapQuery: "Arturo+Merino+Benitez+International+Airport" },
      { time: "03:30 - 05:00", typeIcon: "✈️", title: "국내선 셀프 체크인 및 보안검색 통과 후 게이트 대기", desc: "SCL 공항 ➔ 탑승구 | 교통: 수속", tip: "따뜻한 음료 및 조식 박스 섭취", mapQuery: "Arturo+Merino+Benitez+International+Airport" },
      { time: "05:00 - 07:40", typeIcon: "✈️", title: "★ [실제 예매] 산티아고(SCL)발 아리카(ARI)행 국내선 이륙!", desc: "SCL 공항 ➔ 아리카 공항 (ARI) | 교통: 항공편 (2시간 40분)", tip: "칠레 최북단으로 북상 비행 (창밖 아타카마 사막 조망)", mapQuery: "Chacalluta+International+Airport" },
      { time: "07:40 - 08:15", typeIcon: "✈️", title: "★ 아리카 샤칼루타(ARI) 공항 착륙!", desc: "기내 ➔ ARI 도착장 | 교통: 도보", tip: "짐 수취 후 공항 출구 이동", mapQuery: "Chacalluta+International+Airport" },
      { time: "08:15 - 08:45", typeIcon: "✈️", title: "아리카 국제 버스터미널(Terminal Internacional de Arica) 택시 이동", desc: "ARI 공항 ➔ 아리카 국제터미널 | 교통: 택시 (15분)", tip: "택시비 약 6,000~8,000 CLP", mapQuery: "Terminal+Internacional+de+Arica" },
      { time: "08:45 - 10:00", typeIcon: "✈️", title: "타크나행 공식 국제 콜렉티보(또는 버스) 탑승 ➔ 칠레/페루 국경 통과", desc: "아리카 터미널 ➔ 산타로사 국경 | 교통: 차량 (1.2시간)", tip: "★ 칠레 차카유타 출국 + 페루 산타로사 입국 심사 (원스톱)", mapQuery: "Complejo+Fronterizo+Santa+Rosa" },
      { time: "10:00 - 09:30", typeIcon: "🚕", title: "★ [페루 입국] 시차 -2시간 적용으로 타크나 도착 시각은 오전 08:30!", desc: "산타로사 국경 ➔ 타크나 국제터미널 | 교통: 차량 (30분)", tip: "★ 시계 2시간 뒤로 조정 (2시간 보너스 획득!)", mapQuery: "Terminal+Terrestre+Tacna" },
      { time: "09:30 - 15:30", typeIcon: "✈️", title: "타크나 국내선 터미널 ➔ 아레키파행 프리미엄 우등버스 탑승", desc: "타크나 터미널 ➔ 아레키파 터미널 | 교통: 우등 버스 (230km, 5.5시간)", tip: "Flores / Movil Bus 탑승. 페루 남부 해안 사막과 안데스 협곡 주행", mapQuery: "Terminal+Terrestre+Manuel+A.+Odria" },
      { time: "15:30 - 16:00", typeIcon: "📍", title: "★ 백색의 도시 아레키파(Arequipa, 해발 2,325m) 터미널 도착!", desc: "버스 ➔ 아레키파 터미널 | 교통: 도보", tip: "택시 타고 시내 아르마스 광장 숙소 이동 (15분, 10 PEN)", mapQuery: "Terminal+Terrestre+Arequipa" },
      { time: "16:00 - 17:00", typeIcon: "🏨", title: "아레키파 호텔 체크인 & 짐 풀기 (해발 2,325m 고산 순응 시작)", desc: "터미널 ➔ 아레키파 숙소 | 교통: 체크인", tip: "★ [이상적 고산 적응] 쿠스코(3,400m) 가기 전 2,325m에서 완벽한 중간 순응 달성!", mapQuery: "Plaza+de+Armas+Arequipa" },
      { time: "17:00 - 19:00", typeIcon: "🏛️", title: "유네스코 하얀 화산암(Sillar) 아르마스 광장 & 대성당 석양 산책", desc: "숙소 ➔ 아르마스 광장 | 교통: 도보 (3분)", tip: "석양빛에 눈부시게 빛나는 하얀 대성당과 야자수 광장 감상", mapQuery: "Plaza+de+Armas+Arequipa" },
      { time: "19:00 - 21:30", typeIcon: "🍽️", title: "아레키파 전통 요리 로코토 레예노(Rocoto Relleno) & 치차 모라다 저녁", desc: "광장 ➔ 로컬 전통식당 | 교통: 식사", tip: "소고기로 속을 채운 매콤한 고추 구이와 시원한 자색옥수수 음료", mapQuery: "Zig+Zag+Restaurant+Arequipa" },
      { time: "21:30 ~", typeIcon: "🏨", title: "호텔 복귀 및 편안한 침대 숙면 (고산 증세 전혀 없는 꿀잠)", desc: "식당 ➔ 숙소 | 교통: 도보", tip: "알람 08:00 설정, 깊은 수면", mapQuery: "Plaza+de+Armas+Arequipa" }
    ]
  },
  {
    day: "DAY 14", date: "10월 24일 (토)", loc: "페루 · 아레키파 ➔ 크루즈 델 수르 야간버스", flight: "🚌 [1등석침대야간버스] 아레키파 20:30발 ➔ 쿠스코 06:30착 (Cruz del Sur)",
    title: "★ [백색도시 아레키파 투어] 산타카탈리나 수녀원 ➔ 크루즈델수르 1등석 야간버스 (차내 1박)",
    desc: "★ 아레키파 시내 투어 (산타카탈리나 수녀원, 미스티 화산) ➔ 1등석 침대 야간버스 출발",
    timeline: [
      { time: "08:30 - 09:30", typeIcon: "🍽️", title: "기상 및 호텔 조식 뷔페 (체크아웃 후 짐 리셉션 무료 보관)", desc: "아레키파 숙소 ➔ 로비 | 교통: 준비", tip: "가벼운 복장으로 시내 투어 출발", mapQuery: "Plaza+de+Armas+Arequipa" },
      { time: "09:30 - 12:00", typeIcon: "🏛️", title: "★ '산타 카탈리나 수녀원(Monasterio de Santa Catalina)' 탐방", desc: "숙소 ➔ 산타카탈리나 | 교통: 도보 (5분)", tip: "도시 안의 거대한 수도원 요새! 선명한 블루/오렌지 회랑과 중세 정원 포토존", mapQuery: "Santa+Catalina+Monastery+Arequipa" },
      { time: "12:00 - 13:30", typeIcon: "🚕", title: "야나우아라 전망대(Mirador de Yanahuara)에서 5,822m 미스티 화산 조망", desc: "수녀원 ➔ 야나우아라 전망대 | 교통: 택시 (10분)", tip: "하얀 화산암 아치문 너머로 솟아오른 만년설 미스티 화산 엽서 뷰", mapQuery: "Mirador+de+Yanahuara" },
      { time: "13:30 - 15:30", typeIcon: "🍽️", title: "아레키파 전통 피칸테리아 점심 (추페 데 카마로네스 - 민물가재 수프)", desc: "전망대 ➔ 전통 피칸테리아 | 교통: 식사", tip: "진한 육수의 민물가재 수프와 옥수수 튀김", mapQuery: "La+Nueva+Palomino" },
      { time: "15:30 - 17:30", typeIcon: "✈️", title: "문도 알파카(Mundo Alpaca) 방문: 알파카/라마 먹이주기 & 직조 관람", desc: "식당 ➔ 문도 알파카 | 교통: 택시 (10분)", tip: "귀여운 알파카와 사진 찍기 및 최고급 알파카 머플러 구경", mapQuery: "Mundo+Alpaca+Arequipa" },
      { time: "17:30 - 19:00", typeIcon: "🚕", title: "호텔 복귀 & 보관 짐 정리 및 온수 샤워 환복", desc: "문도 알파카 ➔ 호텔 | 교통: 도보/택시", tip: "야간버스 탑승을 위해 편안한 옷으로 환복", mapQuery: "Plaza+de+Armas+Arequipa" },
      { time: "19:00 - 19:40", typeIcon: "🚌", title: "아레키파 버스 터미널(Terminal Terrestre)로 택시 이동", desc: "호텔 ➔ 아레키파 터미널 | 교통: 택시 (15분)", tip: "터미널 출발 40분 전 도착", mapQuery: "Terminal+Terrestre+Arequipa" },
      { time: "19:40 - 20:30", typeIcon: "✈️", title: "크루즈 델 수르(Cruz del Sur) 1등석 160도 침대칸 탑승 수속", desc: "아레키파 터미널 ➔ Cruz del Sur 카운터 | 교통: 수속", tip: "위탁 수하물 부치고 탑승권 확인 (개인 모니터, 담요, 간식 제공)", mapQuery: "Cruz+del+Sur+Arequipa" },
      { time: "20:30 - 24:00", typeIcon: "🚌", title: "★ [1등석 침대 야간버스] 아레키파 출발 ➔ 쿠스코 향발 주행!", desc: "아레키파 터미널 ➔ 쿠스코 터미널 | 교통: 침대 야간버스 (10시간)", tip: "160도 리클라이닝 좌석에서 편안한 숙면 (안데스 산맥 관통)", mapQuery: "Cruz+del+Sur+Arequipa" },
      { time: "24:00 ~", typeIcon: "🚌", title: "버스 내 딥슬립 수면 (내일 아침 06:30 쿠스코 도착)", desc: "버스 차내 ➔ 좌석 침대 | 교통: 수면", tip: "차내 숙면으로 숙박비 1박 절약 & 시간 최적화!", mapQuery: "Cruz+del+Sur+Arequipa" }
    ]
  },
  {
    day: "DAY 15", date: "10월 25일 (일)", loc: "페루 · 쿠스코", flight: "🧱 06:30 쿠스코 도착 & 12각의 돌 & 코리칸차 고산 힐링",
    title: "★ [쿠스코 입성 & 고산 힐링] 06:30 도착 ➔ 12각의 돌 & 코리칸차 (쿠스코 1박)",
    desc: "★ 쿠스코 도착 & 호텔 짐보관/코카차 ➔ 12각의 돌 & 코리칸차 고산 힐링",
    timeline: [
      { time: "06:30 - 07:00", typeIcon: "🚌", title: "★ 크루즈 델 수르 야간버스 쿠스코 터미널 도착!", desc: "버스 ➔ 쿠스코 터미널 | 교통: 도보", tip: "수하물 수취 후 공식 택시 탑승 (10분, 15 PEN)", mapQuery: "Terminal+Terrestre+Cusco" },
      { time: "07:00 - 08:00", typeIcon: "🚕", title: "아르마스 광장 도보 3분 호텔 도착 (얼리 체크인 / 짐 보관)", desc: "터미널 ➔ 쿠스코 숙소 | 교통: 택시", tip: "호텔 로비 따뜻한 코카차(Mate de Coca) 음용", mapQuery: "Plaza+de+Armas+Cusco" },
      { time: "08:00 - 12:30", typeIcon: "🍽️", title: "호텔 조식 섭취 & 객실 침대 누워 고산 적응 휴식", desc: "숙소 ➔ 객실 | 교통: 식사/휴식", tip: "★ 아레키파(2,325m)를 거쳐와서 고산병 증세가 거의 없음!", mapQuery: "Plaza+de+Armas+Cusco" },
      { time: "12:30 - 14:00", typeIcon: "🍽️", title: "아르마스 광장 발코니 식당 따뜻한 치킨 수프 점심", desc: "숙소 ➔ 광장 2층 식당 | 교통: 식사", tip: "고산 첫날이므로 가벼운 Sopa de Pollo 식사", mapQuery: "Plaza+de+Armas+Cusco" },
      { time: "14:00 - 15:00", typeIcon: "🏛️", title: "잉카 석조 기술의 정점 '12각의 돌' 평지 산책", desc: "광장 ➔ 12각의 돌 | 교통: 도보 (5분)", tip: "정교한 잉카 성벽 관람 & 사진 촬영", mapQuery: "Twelve+Angled+Stone" },
      { time: "15:00 - 16:00", typeIcon: "🥾", title: "BCP 은행 무료 ATM 솔(PEN) 인출 & 우만타이 투어 직예약", desc: "광장 주변 ➔ BCP 은행 / 여행사 | 교통: 도보", tip: "1인 75솔(약 2.8만원)로 10/28 우만타이 호수 투어 현장 직예약", mapQuery: "Plaza+de+Armas+Cusco" },
      { time: "16:00 - 17:30", typeIcon: "🏛️", title: "코리칸차(태양의 신전) 잉카-스페인 성벽 관람", desc: "12각의 돌 ➔ 코리칸차 | 교통: 도보 (10분)", tip: "평지 그늘 위주로 여유롭게 관람", mapQuery: "Qorikancha+Cusco" },
      { time: "17:30 - 18:30", typeIcon: "🛍️", title: "산페드로 중앙시장 즉석 착즙 생과일주스(망고/마라쿠야, 2,000원)", desc: "코리칸차 ➔ 산페드로 시장 | 교통: 도보 (10분)", tip: "비타민 충전 & 과일 가게 구경", mapQuery: "Mercado+Central+de+San+Pedro" },
      { time: "18:30 - 19:30", typeIcon: "🏨", title: "호텔 복귀 & 내일 마추픽추 1박을 위한 데이팩 분리 패킹", desc: "시장 ➔ 숙소 | 교통: 도보", tip: "★ 큰 캐리어는 쿠스코 호텔에 무료 보관! 1박 배낭만 준비", mapQuery: "Plaza+de+Armas+Cusco" },
      { time: "19:30 - 21:00", typeIcon: "🍽️", title: "Morena Peruvian Kitchen 부드러운 로모 살타도 저녁", desc: "숙소 ➔ Morena | 교통: 식사", tip: "아르마스 광장 도보 2분 안전 식사", mapQuery: "Morena+Peruvian+Kitchen" },
      { time: "21:00 ~", typeIcon: "🏨", title: "호텔 복귀 및 조기 취침 (내일 아침 성스러운 계곡 투어)", desc: "식당 ➔ 숙소 | 교통: 도보", tip: "알람 06:45 설정, 편안한 숙면", mapQuery: "Plaza+de+Armas+Cusco" }
    ]
  },
  {
    day: "DAY 16", date: "10월 26일 (월)", loc: "페루 · 쿠스코 ➔ 성스러운 계곡 ➔ 마추픽추(아구아스)", flight: "🚆 성스러운 계곡 투어 ➔ 페루레일 17:20발 ➔ 아구아스 천연 온천",
    title: "성스러운 계곡 종일 투어 ➔ 마추픽추 기차 ➔ 아구아스칼리엔테스 온천욕 (마추픽추 마을 1박)",
    desc: "★ 성스러운 계곡 투어 (친체로, 모레이, 마라스, 올란타이) ➔ 기차 ➔ 아구아스 온천욕",
    timeline: [
      { time: "07:00 - 07:45", typeIcon: "☕", title: "기상, 조식 및 체크아웃 (큰 짐 호텔 리셉션 무료 보관)", desc: "쿠스코 숙소 ➔ 로비 | 교통: 준비", tip: "1박2일용 작은 배낭에 옷, 세면도구, 마추픽추 티켓, 여권 지참", mapQuery: "Plaza+de+Armas+Cusco" },
      { time: "07:45 - 09:00", typeIcon: "✈️", title: "성스러운 계곡(Valle Sagrado) 전일 투어 버스 탑승", desc: "숙소 인근 ➔ 투어 버스 | 교통: 탑승", tip: "가이드 명단 확인", mapQuery: "Plaza+de+Armas+Cusco" },
      { time: "09:00 - 11:00", typeIcon: "🚌", title: "친체로(Chinchero) 잉카 유적 및 전통 알파카 직조 시연", desc: "쿠스코 ➔ 친체로 마을 | 교통: 투어 버스 (50분)", tip: "천연 염색 시연 및 안데스 여성 직조 기술 관람", mapQuery: "Chinchero+Peru" },
      { time: "11:00 - 12:30", typeIcon: "🚕", title: "모레이(Moray) 미스터리한 원형 계단식 농경 테라스", desc: "친체로 ➔ 모레이 유적지 | 교통: 차량 (40분)", tip: "각 층마다 미세 기후가 다른 잉카의 농업 실험실 조망", mapQuery: "Moray+Peru" },
      { time: "12:30 - 13:30", typeIcon: "🚕", title: "마라스(Maras) 살리네라스 3,000개 천연 암염 소금염전", desc: "모레이 ➔ 살리네라스 소금밭 | 교통: 차량 (30분)", tip: "산비탈을 가득 채운 하얀 소금밭 장관! 핑크솔트 구매", mapQuery: "Salineras+de+Maras" },
      { time: "13:30 - 15:30", typeIcon: "🍽️", title: "우루밤바(Urubamba) 안데스 전통 뷔페 레스토랑 점심", desc: "마라스 ➔ 우루밤바 식당 | 교통: 식사 (1시간)", tip: "성스러운 계곡 신선한 채소와 치킨, 송어 요리", mapQuery: "Urubamba+Peru" },
      { time: "15:30 - 16:45", typeIcon: "🚕", title: "올란타이탐보(Ollantaytambo) 거대 잉카 태양의 요새 탐방", desc: "우루밤바 ➔ 올란타이탐보 요새 | 교통: 차량 (30분)", tip: "잉카 전사들이 스페인군을 물리쳤던 가파른 석조 요새 등반", mapQuery: "Ollantaytambo+Sanctuary" },
      { time: "16:45 - 17:20", typeIcon: "🚆", title: "투어 버스에서 하차하여 올란타이탐보 기차역으로 도보 이동", desc: "요새 입구 ➔ 올란타이탐보역 | 교통: 도보 (10분)", tip: "쿠스코로 돌아가지 않고 바로 역으로 이동하여 4시간 절약!", mapQuery: "Estacion+de+Tren+Ollantaytambo" },
      { time: "17:20 - 19:00", typeIcon: "✈️", title: "마추픽추행 페루레일(또는 잉카레일) 열차 탑승", desc: "올란타이탐보역 ➔ 아구아스칼리엔테스역 | 교통: 열차 (1시간 40분)", tip: "파노라마 창밖으로 우루밤바강과 정글 협곡 풍경 감상 (최저가 슬롯 선점)", mapQuery: "Estacion+de+Tren+Ollantaytambo" },
      { time: "19:00 - 19:30", typeIcon: "🏨", title: "아구아스칼리엔테스(마추픽추 마을) 도착 및 숙소 체크인", desc: "기차역 ➔ 마을 숙소 | 교통: 도보 (5분)", tip: "해발 2,040m로 내려와 고산병 완벽 회복 & 숙면!", mapQuery: "Aguas+Calientes+Peru" },
      { time: "19:30 - 20:30", typeIcon: "♨️", title: "아구아스 칼리엔테스 잉카 천연 노천 온천(Baños Termales) 피로 회복", desc: "숙소 ➔ 아구아스 온천 | 교통: 도보 (10분)", tip: "★ [보강] 기차 여행 후 따뜻한 유황 온천수에 몸을 담그며 완벽한 힐링!", mapQuery: "Banos+Termales+Aguas+Calientes" },
      { time: "20:30 - 21:30", typeIcon: "🍽️", title: "Tree House Restaurant 안데스 특식 저녁", desc: "온천 ➔ 식당 | 교통: 식사", tip: "내일 마추픽추 입장권 및 여권 실물 재확인", mapQuery: "Tree+House+Restaurant+Aguas+Calientes" },
      { time: "21:30 ~", typeIcon: "🏨", title: "조기 취침 (내일 이른 아침 마추픽추 입장)", desc: "식당 ➔ 숙소 | 교통: 도보", tip: "알람 05:30 설정", mapQuery: "Aguas+Calientes+Peru" }
    ]
  },
  {
    day: "DAY 17", date: "10월 27일 (화)", loc: "페루 · 마추픽추 ➔ 쿠스코 복귀", flight: "🚆 마추픽추 서킷2 엽서 뷰 ➔ 14:30 기차 ➔ 쿠스코 복귀 만찬",
    title: "★ [대망의 마추픽추] 서킷 2 골든아워 관람 & 도보 하산 ➔ 쿠스코 복귀 (쿠스코 2박)",
    desc: "★ [대망의 마추픽추] 서킷 2 골든아워 관람 & 도보 하산 ➔ 쿠스코 복귀 만찬",
    timeline: [
      { time: "05:30 - 06:15", typeIcon: "☕", title: "기상 및 숙소 조식 (체크아웃, 가방 숙소 보관)", desc: "마을 숙소 ➔ 로비 | 교통: 준비", tip: "여권 원본, 마추픽추 A4 인쇄 입장권 휴대", mapQuery: "Aguas+Calientes+Peru" },
      { time: "06:15 - 07:00", typeIcon: "✈️", title: "콘세투르(Consettur) 마추픽추 공식 셔틀버스 탑승", desc: "마을 버스정류장 ➔ 마추픽추 정문 | 교통: 셔틀버스 (25분)", tip: "지그재그 하이람 빙엄 도로를 타고 구름 위 유적지로 상승", mapQuery: "Consettur+Machu+Picchu" },
      { time: "07:00 - 07:30", typeIcon: "🏛️", title: "[GOAL] 마추픽추 유적지 정문 통과 및 서킷 2 입장", desc: "정문 매표소 ➔ 망지기의 집 | 교통: 도보", tip: "운무가 서서히 걷히며 드러나는 공중도시의 전설적인 첫 장면!", mapQuery: "Machu+Picchu+Peru" },
      { time: "07:30 - 10:30", typeIcon: "🏛️", title: "마추픽추 클래식 가이드 투어 (태양의 신전, 인티와타나)", desc: "유적지 내부 ➔ 콘도르 신전 | 교통: 도보 (2.5시간)", tip: "공인 가이드 설명 청취 및 클래식 엽서 사진 촬영", mapQuery: "Machu+Picchu+Peru" },
      { time: "10:30 - 11:30", typeIcon: "🥾", title: "안데스 원시림 숲길을 따라 피톤치드 마시며 도보 하산", desc: "마추픽추 정문 ➔ 마을 도보로 | 교통: 하산 트레킹 (50분)", tip: "★ [셔틀비 절약] 계곡 물소리와 숲길을 걷는 상쾌한 하산 트레킹!", mapQuery: "Aguas+Calientes+Peru" },
      { time: "11:30 - 13:30", typeIcon: "🍽️", title: "Indio Feliz 프랑스-페루 퓨전 비스트로 점심", desc: "마을 중심가 ➔ Indio Feliz | 교통: 식사", tip: "아기자기한 여행자 낙서 인테리어와 신선한 레몬 버터 안데스 송어 구이", mapQuery: "Indio+Feliz+Aguas+Calientes" },
      { time: "13:30 - 14:30", typeIcon: "🚆", title: "호텔에 보관한 배낭 찾고 기차역으로 이동", desc: "식당 ➔ 아구아스 기차역 | 교통: 도보 (5분)", tip: "기차 티켓 및 여권 제시", mapQuery: "Aguas+Calientes+Peru" },
      { time: "14:30 - 16:15", typeIcon: "✈️", title: "올란타이탐보행 귀환 기차 탑승", desc: "아구아스 기차역 ➔ 올란타이탐보역 | 교통: 열차 (1시간 40분)", tip: "열차 내 승무원 전통 알파카 쇼 관람", mapQuery: "Estacion+de+Tren+Ollantaytambo" },
      { time: "16:15 - 18:00", typeIcon: "✈️", title: "올란타이탐보역 도착 ➔ 쿠스코행 연계 셔틀 탑승", desc: "올란타이탐보역 ➔ 쿠스코 아르마스 | 교통: 밴/셔틀 (1시간 40분)", tip: "안데스 고원 도로 주행", mapQuery: "Plaza+de+Armas+Cusco" },
      { time: "18:00 - 19:30", typeIcon: "🏨", title: "쿠스코 호텔 복귀 및 보관했던 메인 캐리어 수령 (체크인)", desc: "광장 ➔ 쿠스코 호텔 | 교통: 도보", tip: "따뜻한 샤워 후 휴식", mapQuery: "Plaza+de+Armas+Cusco" },
      { time: "19:30 - 21:30", typeIcon: "🍽️", title: "쿠스코 유명 레스토랑에서 마추픽추 완주 기념 만찬", desc: "숙소 ➔ 로컬 레스토랑 | 교통: 식사", tip: "쿠스케냐 흑맥주와 안데스 특식 만찬", mapQuery: "Plaza+de+Armas+Cusco" },
      { time: "21:30 ~", typeIcon: "🏨", title: "숙소 복귀 및 취침 (내일은 여유로운 힐링 데이!)", desc: "식당 ➔ 숙소 | 교통: 도보", tip: "알람 08:30 설정 (늦잠 보장!)", mapQuery: "Plaza+de+Armas+Cusco" }
    ]
  },
  {
    day: "DAY 18", date: "10월 28일 (수)", loc: "페루 · 쿠스코 (우만타이 호수)", flight: "🥾 우만타이 호수(4,200m) 빙하호수 등반 ➔ Cicciolina 만찬",
    title: "[대자연 비경] 우만타이 호수(Laguna Humantay 4,200m) 빙하호수 등반 ➔ Cicciolina 만찬",
    desc: "★ [대자연 비경] 우만타이 호수 (4,200m) 에메랄드 빙하호수 등반 ➔ Cicciolina 만찬",
    timeline: [
      { time: "04:15 - 04:45", typeIcon: "⏰", title: "새벽 기상 및 방한 등산복 착용", desc: "쿠스코 숙소 ➔ 로비 | 교통: 준비", tip: "어제 힐링 데이 덕분에 상쾌한 컨디션!", mapQuery: "Plaza+de+Armas+Cusco" },
      { time: "04:45 - 07:00", typeIcon: "✈️", title: "우만타이 호수 투어 전용 밴 픽업", desc: "숙소 앞 ➔ 투어 밴 | 교통: 탑승", tip: "차량 내에서 수면", mapQuery: "Plaza+de+Armas+Cusco" },
      { time: "07:00 - 09:00", typeIcon: "🍽️", title: "몰레파타(Mollepata) 마을 도착 및 안데스 전통 조식", desc: "투어 밴 ➔ 몰레파타 식당 | 교통: 식사 (45분)", tip: "따뜻한 빵, 스크램블 에그, 코카차로 에너지 보충", mapQuery: "Mollepata+Peru" },
      { time: "09:00 - 09:30", typeIcon: "📍", title: "소라이팜파(Soraypampa, 3,900m) 베이스캠프 도착", desc: "식당 ➔ 소라이팜파 주차장 | 교통: 밴 (1시간 15분)", tip: "거대한 만년설 살칸타이 산(6,271m) 조망, 등산스틱 세팅", mapQuery: "Soraypampa+Peru" },
      { time: "09:30 - 11:00", typeIcon: "🥾", title: "[START] 우만타이 호수 오르막 트레킹 시작", desc: "소라이팜파 ➔ 등산로 중턱 | 교통: 오르막 트레킹 (1.5시간)", tip: "편도 약 2km의 짧지만 가파른 고산 오르막. 천천히 심호흡", mapQuery: "Laguna+Humantay" },
      { time: "11:00 - 12:15", typeIcon: "🥾", title: "[GOAL] 해발 4,200m 우만타이 호수 도착!", desc: "오르막 끝 ➔ Laguna Humantay | 교통: 감상 및 촬영", tip: "살칸타이 빙하 만년설 아래 빚어낸 눈부신 에메랄드빛 호수!", mapQuery: "Laguna+Humantay" },
      { time: "12:15 - 13:30", typeIcon: "📍", title: "소라이팜파 베이스캠프로 하산", desc: "우만타이 호수 ➔ 소라이팜파 주차장 | 교통: 하산 (50분)", tip: "자갈길 미끄러짐 주의", mapQuery: "Soraypampa+Peru" },
      { time: "13:30 - 15:00", typeIcon: "🍽️", title: "몰레파타 마을로 이동하여 푸짐한 뷔페 점심", desc: "소라이팜파 ➔ 몰레파타 식당 | 교통: 식사 (1시간)", tip: "투어 포함 뷔페 점심 식사", mapQuery: "Mollepata+Peru" },
      { time: "15:00 - 17:30", typeIcon: "🚕", title: "쿠스코 시내로 귀환 차량 주행", desc: "몰레파타 ➔ 쿠스코 아르마스 광장 | 교통: 차량 (2.5시간)", tip: "차량 내 깊은 숙면", mapQuery: "Plaza+de+Armas+Cusco" },
      { time: "17:30 - 19:00", typeIcon: "🏨", title: "쿠스코 시내 복귀 및 숙소 휴식", desc: "차량 ➔ 숙소 | 교통: 도보", tip: "등산화 흙 털기 및 따뜻한 샤워", mapQuery: "Plaza+de+Armas+Cusco" },
      { time: "19:00 - 21:30", typeIcon: "🍽️", title: "아르마스 광장 주변 로컬 저녁 식사", desc: "숙소 인근 ➔ 로컬 식당 | 교통: 식사", tip: "따뜻한 치킨 수프 저녁 식사", mapQuery: "Plaza+de+Armas+Cusco" },
      { time: "21:30 ~", typeIcon: "🏨", title: "숙소 복귀 및 취침", desc: "식당 ➔ 숙소 | 교통: 도보", tip: "알람 08:00 설정 (내일 늦잠 가능)", mapQuery: "Plaza+de+Armas+Cusco" }
    ]
  },
  {
    day: "DAY 19", date: "10월 29일 (목)", loc: "페루 · 쿠스코 ➔ 리마", flight: "✈️ [실제항공권] 쿠스코(CUZ) 14:30발 ➔ 리마(LIM) 16:00착 (LA2024)",
    title: "★ [실제 항공권] 쿠스코 14:30발 ➔ 수도 리마 16:00착 & 라르코마르 & 세비체 만찬 (리마 1박)",
    desc: "리마 도착 ➔ 라르코마르 해안절벽 일몰 & 바랑코 탄식의 다리 & Punto Azul 세비체",
    timeline: [
      { time: "08:00 - 09:30", typeIcon: "🍽️", title: "기상 및 여유로운 조식", desc: "쿠스코 숙소 ➔ 조식당 | 교통: 식사", tip: "안데스 고산 트레킹 일정 모두 완수! 여유로운 아침", mapQuery: "Plaza+de+Armas+Cusco" },
      { time: "09:30 - 11:30", typeIcon: "🛍️", title: "산페드로 중앙시장 마지막 기념품 쇼핑", desc: "숙소 ➔ 산페드로 시장 | 교통: 도보 (10분)", tip: "알파카 목도리, 안데스 초콜릿, 잉카 옥수수 과자 쇼핑", mapQuery: "Mercado+Central+de+San+Pedro" },
      { time: "11:30 - 12:45", typeIcon: "🍽️", title: "쿠스코 마지막 점심 식사 및 호텔 체크아웃", desc: "산페드로 시장 ➔ 로컬 카페 | 교통: 식사 및 체크아웃", tip: "공항 이동 택시 탑승", mapQuery: "Plaza+de+Armas+Cusco" },
      { time: "12:45 - 14:30", typeIcon: "🚕", title: "쿠스코 공항(CUZ)으로 택시 이동", desc: "숙소 ➔ CUZ 공항 | 교통: 택시 (20분)", tip: "공항 도착 및 탑승 수속", mapQuery: "Alejandro+Velasco+Astete+International+Airport" },
      { time: "14:30 - 16:00", typeIcon: "✈️", title: "쿠스코발 리마(LIM)행 국내선 항공편 탑승", desc: "CUZ 공항 ➔ 리마 호르헤차베스 공항 (LIM) | 교통: LATAM 항공편 (1시간 25분)", tip: "안데스 고원에서 태평양 해수면으로 하강", mapQuery: "Jorge+Chavez+International+Airport" },
      { time: "16:00 - 16:45", typeIcon: "📍", title: "리마 공항 도착 및 위탁수하물 수취", desc: "기내 ➔ LIM 도착장 | 교통: 도보", tip: "공항 공식 택시 카운터(Taxi Green, Taxi Directo) 이용", mapQuery: "Jorge+Chavez+International+Airport" },
      { time: "16:45 - 17:45", typeIcon: "🚕", title: "미라플로레스(Miraflores) 안전 구역 숙소로 이동", desc: "LIM 공항 ➔ 미라플로레스 숙소 | 교통: 공식 택시 (45~60분)", tip: "리마 해안도로 주행", mapQuery: "Miraflores+Lima" },
      { time: "17:45 - 18:30", typeIcon: "🏨", title: "미라플로레스 2인실 호텔 체크인", desc: "숙소 로비 ➔ 호텔 룸 | 교통: 체크인", tip: "짐 정리 후 해안가 산책 준비", mapQuery: "Miraflores+Lima" },
      { time: "18:30 - 19:30", typeIcon: "📍", title: "라르코마르(Larcomar) 및 사랑의 공원(Parque del Amor) 일몰 산책", desc: "숙소 ➔ 라르코마르 | 교통: 도보 (10분)", tip: "태평양 깎아지른 절벽 위 복합몰에서 붉은 바다 일몰 감상", mapQuery: "Larcomar+Lima" },
      { time: "19:30 - 20:30", typeIcon: "🚕", title: "바랑코(Barranco) 예술가 거리 & 탄식의 다리(Puente de los Suspiros)", desc: "라르코마르 ➔ 바랑코 예술가 거리 | 교통: 택시 (10분)", tip: "★ [보강] 감성 넘치는 보헤미안 벽화 골목과 탄식의 다리 야경 조망", mapQuery: "Puente+de+los+Suspiros+Barranco" },
      { time: "20:30 - 22:30", typeIcon: "🍽️", title: "Cevicheria Punto Azul 정통 세비체(Ceviche) & 피스코 사워 만찬", desc: "바랑코 ➔ Punto Azul | 교통: 식사", tip: "신선한 라임과 흰살생선으로 만든 정통 페루 세비체로 여행 종지부", mapQuery: "Punto+Azul+Miraflores" },
      { time: "22:30 - 23:30", typeIcon: "🏨", title: "숙소 복귀 및 귀국용 수하물 최종 패킹", desc: "식당 ➔ 숙소 | 교통: 도보", tip: "액체류(피스코주, 꿀 등) 반드시 위탁수하물에 패킹! 캐나다 eTA 승인 재확인", mapQuery: "Miraflores+Lima" },
      { time: "23:30 ~", typeIcon: "🏨", title: "조기 취침 (내일 새벽 출국)", desc: "숙소 ➔ 룸 | 교통: 휴식", tip: "알람 03:45 설정", mapQuery: "Miraflores+Lima" }
    ]
  },
  {
    day: "DAY 20", date: "10월 30일 (금)", loc: "페루 · 리마 ➔ 캐나다 (북상 비행)", flight: "✈️ [실제항공권] 리마 06:55발 AC194 ➔ 캐나다 향발 비행 (기내 1박)",
    title: "★ [실제 항공권] 리마 06:55 출발 ➔ 캐나다 향발 비행 및 환승 (기내 1박)",
    desc: "리마 출국 ➔ 아메리카 대륙 북상 비행 및 환승 (기내 수면)",
    timeline: [
      { time: "03:45 - 04:15", typeIcon: "🏨", title: "기상 및 호텔 체크아웃", desc: "미라플로레스 숙소 ➔ 로비 | 교통: 준비", tip: "방한 외투 챙기고 최종 소지품 점검", mapQuery: "Miraflores+Lima" },
      { time: "04:15 - 05:00", typeIcon: "🚕", title: "리마 호르헤 차베스 국제공항(LIM)으로 공식 택시 이동", desc: "숙소 ➔ LIM 공항 | 교통: 공식 택시 (40분)", tip: "새벽 시간대 해안도로 원활", mapQuery: "Jorge+Chavez+International+Airport" },
      { time: "05:00 - 06:55", typeIcon: "🏨", title: "에어캐나다 국제선 카운터 체크인 및 위탁수하물(23kg) 위탁", desc: "LIM 공항 ➔ 탑승구 | 교통: 수속 (1.5시간)", tip: "위탁수하물 태그 수령, 보안검색 통과", mapQuery: "Jorge+Chavez+International+Airport" },
      { time: "06:55 - 12:00", typeIcon: "✈️", title: "에어캐나다 AC194편 탑승 및 리마 이륙", desc: "LIM 공항 ➔ 기내 | 교통: 항공편 이륙", tip: "남미 대륙과의 작별, 태평양 해안선 상공 북상", mapQuery: "Jorge+Chavez+International+Airport" },
      { time: "12:00 - 18:00", typeIcon: "🍽️", title: "기내식 1차 식사 및 영화 감상", desc: "기내 ➔ 기내 좌석 | 교통: 식사 및 휴식", tip: "충분한 수분 섭취", mapQuery: "Air+Canada" },
      { time: "18:00 - 22:00", typeIcon: "📍", title: "중간 경유지 공항 환승 대기 및 기내식 2차", desc: "경유 공항 ➔ 환승 게이트 | 교통: 환승 대기", tip: "연결편 탑승구 확인 및 가벼운 스트레칭", mapQuery: "Air+Canada" },
      { time: "22:00 ~", typeIcon: "✈️", title: "캐나다 서부 밴쿠버 향발 야간 비행 및 기내 수면", desc: "기내 ➔ 기내 좌석 | 교통: 기내 수면", tip: "시차 조절을 위한 수면 안대 착용", mapQuery: "Air+Canada" }
    ]
  },
  {
    day: "DAY 21", date: "10월 31일 (토)", loc: "캐나다 · 밴쿠버", flight: "✈️ [실제항공권] 밴쿠버 20:02착 ➔ 다운타운 호텔 & 개스타운 야경",
    title: "★ [실제 항공권] 밴쿠버 20:02 착륙 ➔ 다운타운 호텔 체크인 & 개스타운 야경 (밴쿠버 다운타운 1박!)",
    desc: "★ 밴쿠버 도착 ➔ 다운타운 호텔 체크인 & 개스타운 증기시계 야경 & 수제맥주",
    timeline: [
      { time: "14:00 - 20:02", typeIcon: "🍽️", title: "기내 아침 식사 및 캐나다 입국 준비", desc: "기내 ➔ 기내 좌석 | 교통: 식사", tip: "eTA 번호 및 여권 확인", mapQuery: "Air+Canada" },
      { time: "20:02 - 21:00", typeIcon: "✈️", title: "밴쿠버 국제공항(YVR) 착륙 및 캐나다 eTA 입국 심사", desc: "기내 ➔ YVR 입국장 | 교통: 도보", tip: "CBSA 키오스크 간편 통과 및 짐 수취", mapQuery: "Vancouver+International+Airport" },
      { time: "21:00 - 21:30", typeIcon: "✈️", title: "Canada Line 전철 탑승 ➔ 다운타운 워터프런트역 직통 이동", desc: "YVR 공항역 ➔ 워터프런트역 | 교통: 전철 (25분)", tip: "교통카드 구매 없이 신용카드(컨택리스) 탭 탑승", mapQuery: "Waterfront+Station+Vancouver" },
      { time: "21:30 - 21:45", typeIcon: "🏨", title: "워터프런트역 도보 3분 다운타운 호텔 체크인", desc: "워터프런트역 ➔ 호텔 객실 | 교통: 체크인", tip: "★ [공항 노숙 방지] 쾌적한 침대와 온수 샤워 구비", mapQuery: "Gastown+Vancouver" },
      { time: "21:45 - 22:30", typeIcon: "📍", title: "100년 역사의 개스타운(Gastown) 붉은 벽돌 거리 & 증기시계(Steam Clock) 산책", desc: "호텔 ➔ 개스타운 증기시계 | 교통: 도보 (5분)", tip: "15분마다 하얀 증기를 뿜으며 멜로디를 울리는 밴쿠버의 명물 야경", mapQuery: "Gastown+Steam+Clock" },
      { time: "22:30 - 23:45", typeIcon: "🍽️", title: "Steamworks Brewpub에서 밴쿠버 로컬 수제 생맥주 & 푸틴(Poutine) 야식", desc: "증기시계 ➔ Steamworks | 교통: 식사/맥주", tip: "하버 뷰를 감상하며 즐기는 캐나다 로컬 맥주와 감자튀김", mapQuery: "Steamworks+Brewpub+Vancouver" },
      { time: "23:45 ~", typeIcon: "🏨", title: "호텔 복귀 및 깊은 숙면", desc: "식당 ➔ 호텔 | 교통: 도보", tip: "장거리 비행 피로 완전 해소", mapQuery: "Gastown+Vancouver" }
    ]
  },
  {
    day: "DAY 22", date: "11월 01일 (일)", loc: "캐나다 · 밴쿠버 ➔ 대한민국 · 인천", flight: "✈️ [실제항공권] 캐나다 플레이스 아침 산책 ➔ 밴쿠버 13:00발 ➔ 인천 귀국",
    title: "★ [실제 항공권] 캐나다 플레이스 아침 산책 ➔ 13:00 밴쿠버 이륙 ➔ 인천공항 도착 완주",
    desc: "입국 수속 및 공항철도 귀가",
    timeline: [
      { time: "07:30 - 08:30", typeIcon: "🍽️", title: "기상 및 팀홀튼(Tim Hortons) 프렌치 바닐라 커피 & 베이글 조식", desc: "숙소 ➔ 팀홀튼 | 교통: 식사", tip: "캐나다 국민 카페 팀홀튼의 달콤한 프렌치 바닐라와 베이글", mapQuery: "Tim+Hortons+Vancouver" },
      { time: "08:30 - 10:30", typeIcon: "✈️", title: "캐나다 플레이스(Canada Place) 및 콜 하버 해안 산책", desc: "팀홀튼 ➔ 캐나다 플레이스 | 교통: 도보 산책", tip: "거대한 흰 돛 모양 랜드마크, 건너편 스탠리 파크와 설산 파노라마 조망", mapQuery: "Canada+Place+Vancouver" },
      { time: "10:30 - 11:00", typeIcon: "🏨", title: "호텔 복귀 및 체크아웃 후 워터프런트역 이동", desc: "호텔 ➔ 워터프런트역 | 교통: 도보 (5분)", tip: "짐 챙기기", mapQuery: "Waterfront+Station+Vancouver" },
      { time: "11:00 - 11:30", typeIcon: "✈️", title: "Canada Line 전철 탑승 ➔ YVR 공항 직통 이동", desc: "워터프런트역 ➔ YVR 공항 | 교통: 전철 (25분)", tip: "공항역 도착", mapQuery: "Vancouver+International+Airport" },
      { time: "11:30 - 13:00", typeIcon: "✈️", title: "에어캐나다 국제선 카운터 수속 및 위탁수하물 위탁, 보안검색 통과", desc: "YVR 공항 ➔ 탑승구 | 교통: 수속 (1.5시간)", tip: "남은 캐나다 달러 소진 및 면세점 구경", mapQuery: "Vancouver+International+Airport" },
      { time: "13:00 - 16:10", typeIcon: "✈️", title: "밴쿠버발 인천(ICN)행 에어캐나다 항공편 탑승 및 이륙", desc: "YVR 공항 ➔ 인천공항 (ICN) | 교통: 국제선 항공편 (11시간 40분)", tip: "태평양 횡단 귀국 비행, 기내식 식사 및 날짜변경선 통과", mapQuery: "Vancouver+International+Airport" },
      { time: "16:10 ~", typeIcon: "🛂", title: "[GOAL] 인천국제공항 T1 도착! 입국 수속 및 공항철도 귀가", desc: "기내 ➔ 인천공항 T1 | 교통: 입국 수속", tip: "위탁수하물 수취 후 22일간의 남미 대장정 무사 완주!", mapQuery: "Incheon+Airport+T1" }
    ]
  }
];


function transformRawScheduleToDays(rawList, startDate = '2026-10-11') {
  return rawList.map((item, idx) => {
    let city = "기타";
    let country = "대한민국";
    let flag = "🇰🇷";
    let curr = "KRW";

    // 이동일은 마지막 목적지를 거점으로 쓰며 출발·경유 원문은 route에 보존한다.
    const routeParts = String(item.loc || '').split(/[➔→/]/).map(part => part.trim());
    const destination = [...routeParts].reverse().find(part => /부에노스아이레스|칼라파테|찰텐|푸에르토나탈레스|토레스|푼타아레나스|아레키파|아리카|타크나|산티아고|쿠스코|마추픽추|아구아스|리마|밴쿠버|토론토|인천/.test(part)) || String(item.loc || '');
    if (destination.includes("부에노스아이레스")) {
      city = "부에노스아이레스"; country = "아르헨티나"; flag = "🇦🇷"; curr = "ARS";
    } else if (destination.includes("칼라파테")) {
      city = "엘 칼라파테"; country = "아르헨티나"; flag = "🇦🇷"; curr = "ARS";
    } else if (destination.includes("엘 찰텐") || destination.includes("찰텐")) {
      city = "엘 찰텐"; country = "아르헨티나"; flag = "🇦🇷"; curr = "ARS";
    } else if (destination.includes("푸에르토나탈레스") || destination.includes("토레스")) {
      city = "토레스 델 파이네"; country = "칠레"; flag = "🇨🇱"; curr = "CLP";
    } else if (destination.includes("푼타아레나스")) {
      city = "푼타아레나스"; country = "칠레"; flag = "🇨🇱"; curr = "CLP";
    } else if (destination.includes("아레키파") || destination.includes("아리카") || destination.includes("타크나")) {
      city = "아레키파"; country = "페루"; flag = "🇵🇪"; curr = "PEN";
    } else if (destination.includes("산티아고")) {
      city = "산티아고"; country = "칠레"; flag = "🇨🇱"; curr = "CLP";
    } else if (destination.includes("쿠스코")) {
      city = "쿠스코"; country = "페루"; flag = "🇵🇪"; curr = "PEN";
    } else if (destination.includes("마추픽추") || destination.includes("아구아스")) {
      city = "마추픽추"; country = "페루"; flag = "🇵🇪"; curr = "PEN";
    } else if (destination.includes("리마")) {
      city = "리마"; country = "페루"; flag = "🇵🇪"; curr = "PEN";
    } else if (destination.includes("토론토")) {
      city = "토론토"; country = "캐나다"; flag = "🇨🇦"; curr = "CAD";
    } else if (destination.includes("밴쿠버")) {
      city = "밴쿠버"; country = "캐나다"; flag = "🇨🇦"; curr = "CAD";
    } else if (destination.includes("인천")) {
      city = "인천"; country = "대한민국"; flag = "🇰🇷"; curr = "KRW";
    }

    const spots = (item.timeline || []).map((tl, sIdx) => {
      let cat = "tour";
      const icon = tl.typeIcon || "";
      if (icon === "🥩" || icon === "🍽️" || icon === "☕" || icon === "🍻" || icon === "🍖" || icon === "🦀" || icon === "🐟" || icon === "🍋") cat = "food";
      else if (icon === "🏨" || icon === "🛌") cat = "stay";
      else if (icon === "✈️" || icon === "🚌" || icon === "🚕" || icon === "🚐" || icon === "🚆" || icon === "🚡" || icon === "⛵" || icon === "🚢") cat = "transit";
      else if (icon === "🛍️" || icon === "💳" || icon === "🧺") cat = "shopping";

      return {
        id: "sa_d" + (idx + 1) + "_s" + (sIdx + 1),
        time: tl.time || "09:00",
        title: tl.title,
        name: tl.title,
        desc: tl.desc,
        cost: 0,
        currency: curr,
        category: cat,
        cat: cat === 'stay' ? 'lodging' : cat === 'transit' ? 'flight' : cat,
        completed: false,
        tip: tl.tip,
        mapQuery: tl.mapQuery,
        flight: item.flight
      };
    });

    const date = new Date(`${startDate}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + idx);
    const isoDate = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    return {
      id: 'sa_day_' + (idx + 1),
      dayNum: idx + 1,
      day: idx + 1,
      date: isoDate,
      sourceDate: item.date,
      title: item.title,
      desc: item.desc,
      city: city,
      country: country,
      flag: flag,
      route: item.loc,
      flight: item.flight,
      spots: spots
    };
  });
}

const saDays = transformRawScheduleToDays(scheduleOct11Data);
const saDays21 = saDays.slice(0, 21);

// 2. Comprehensive Global & South America Travel Knowledge Engine
const KB_TRAVEL = {
  version: "1.8.7",
  saDays: saDays,
  
  templates: {
    south_america_22d: {
      id: "trip_sa_showcase_22d",
      title: "✈️ 2026 남미 22일 완벽 가이드 (실제 항공권 & 아레키파 육로이동 완전 리플랜 v14)",
      subtitle: "2026.10.11 ~ 11.01(22일간) 아르헨티나·칠레·페루·캐나다 4개국 10도시 2인 8,650,000 KRW 완벽 동선",
      destination: "남미 4개국 대륙 종단 (아르헨티나, 칠레, 페루, 캐나다)",
      countries: ["아르헨티나", "칠레", "페루", "캐나다"],
      cities: ["부에노스아이레스", "엘 칼라파테", "엘 찰텐", "토레스 델 파이네", "산티아고", "아레키파", "쿠스코", "마추픽추", "리마", "밴쿠버"],
      durationDays: 22,
      startDate: "2026-10-11",
      endDate: "2026-11-01",
      budget: 8650000,
      totalBudget: 8650000,
      concepts: ["배낭", "자연", "문화", "맛집"],
      roomCode: "SA-2026",
      isSample: true,
      days: saDays,
      
      packingChecklist: [
        { id: "sa_pk_01", text: "여권 원본 및 사본 2매 (유효기간 6개월 이상 필수)", checked: true, urgent: true, cat: "필수서류" },
        { id: "sa_pk_02", text: "황열병 예방접종 증명서(옐로카드) 및 고산병약(다이아목스/소로체)", checked: true, urgent: true, cat: "의약품" },
        { id: "sa_pk_03", text: "트래블로그 / 트래블월렛 카드 (MEP 환율 25% 자동결제)", checked: true, urgent: true, cat: "금융/환전" },
        { id: "sa_pk_04", text: "미국 100달러 신권 지폐 (~ 비상금, 훼손없는 빳빳한 신권)", checked: false, urgent: true, cat: "금융/환전" },
        { id: "sa_pk_05", text: "칠레 PDI 입국신고서 종이 영수증 (출국 시까지 여권 사이에 절대 분실 금지)", checked: false, urgent: true, cat: "필수서류" },
        { id: "sa_pk_06", text: "캐나다 전자여행허가(eTA) 사전 발급 확인 (밴쿠버 경유 및 다운타운 1박 필수)", checked: true, urgent: true, cat: "필수서류" },
        { id: "sa_pk_07", text: "방풍/방수 고어텍스 하드쉘 자켓 (파타고니아 강풍 대비)", checked: false, urgent: true, cat: "의류" },
        { id: "sa_pk_08", text: "경량 패딩 및 플리스 내피 (레이어드 보온 착용)", checked: false, urgent: true, cat: "의류" },
        { id: "sa_pk_09", text: "발목을 단단히 지지해주는 중등산화 (토레스델파이네 20km & 우만타이 호수 대비)", checked: false, urgent: true, cat: "트레킹" },
        { id: "sa_pk_10", text: "접이식 등산스틱 1쌍 (피츠로이/삼봉 급경사 자갈길 필수)", checked: false, urgent: false, cat: "트레킹" },
        { id: "sa_pk_11", text: "20,000mAh 대용량 보조배터리 (야간 산행 및 추위 배터리 방전 방지)", checked: false, urgent: true, cat: "전자기기" },
        { id: "sa_pk_12", text: "남미 4개국 통합 eSIM 또는 로밍 사전 등록", checked: false, urgent: true, cat: "전자기기" },
        { id: "sa_pk_13", text: "마추픽추 서킷 2 입장권 및 페루레일 기차 티켓 출력본", checked: false, urgent: true, cat: "예약바우처" },
        { id: "sa_pk_14", text: "아구아스 천연 노천 온천용 수영복 및 스포츠 타월", checked: false, urgent: false, cat: "물놀이" },
        { id: "sa_pk_15", text: "선글라스 UV400 & 사막/빙하용 고차단 자외선차단제 SPF50+", checked: false, urgent: true, cat: "위생용품" }
      ]
    },
    south_america_21d: {
      id: "trip_sa_showcase_21d",
      title: "✈️ 2026 남미 4개국 21일 하이라이트 투어",
      subtitle: "아르헨티나, 칠레, 페루, 캐나다 21일 여정",
      destination: "남미 4개국 (아르헨티나, 칠레, 페루, 캐나다)",
      countries: ["아르헨티나", "칠레", "페루", "캐나다"],
      cities: ["부에노스아이레스", "엘 칼라파테", "엘 찰텐", "토레스 델 파이네", "산티아고", "아레키파", "쿠스코", "마추픽추", "리마"],
      durationDays: 21,
      startDate: "2026-10-11",
      endDate: "2026-10-31",
      budget: 8500000,
      totalBudget: 8500000,
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
    scl: { name: "산티아고", country: "칠레", currency: "CLP", timeZone: "America/Santiago", emergency: "133", embassy: "+56-2-2228-4214" },
    aqp: { name: "아레키파", country: "페루", currency: "PEN", timeZone: "America/Lima", emergency: "105", embassy: "+51-1-632-5000" },
    cuz: { name: "쿠스코", country: "페루", currency: "PEN", timeZone: "America/Lima", emergency: "105", embassy: "+51-1-632-5000" },
    mp: { name: "마추픽추", country: "페루", currency: "PEN", timeZone: "America/Lima", emergency: "105", embassy: "+51-1-632-5000" },
    lim: { name: "리마", country: "페루", currency: "PEN", timeZone: "America/Lima", emergency: "105", embassy: "+51-1-632-5000" },
    yvr: { name: "밴쿠버", country: "캐나다", currency: "CAD", timeZone: "America/Vancouver", emergency: "911", embassy: "+1-604-681-9581" }
  },

  bookingGuides: [
    { title: "인천 ➔ 밴쿠버 ➔ 부에노스아이레스 다구간 국제선 항공권", target: "에어캐나다 공홈 / 스카이스캐너", dDay: "D-180", cost: "2,050,000원 (2인)", status: "urgent", tip: "AC062 / AC194 밴쿠버/토론토 경유 수하물 자동 연결 여부 확인" },
    { title: "마추픽추 서킷 2 (Circuit 2) 클래식 입장권", target: "페루 문화부 공식 홈페이지 (tuboleto.cultura.pe)", dDay: "D-120", cost: "약 110,000원 (2인)", status: "urgent", tip: "가장 인기 높은 코스로 오픈 당일 매진되므로 즉시 예약" },
    { title: "올란타이탐보 ↔ 마추픽추 페루레일/잉카레일 왕복 기차표", target: "PeruRail / Inca Rail 공홈", dDay: "D-90", cost: "약 340,000원 (2인)", status: "urgent", tip: "17:20 갈때 / 14:30 올때 최저가 슬롯 선점으로 1인  절약" },
    { title: "부에노스(AEP) ➔ 칼라파테(FTE) 아에로리네아스 아르헨티나", target: "Aerolineas Argentinas 공홈", dDay: "D-90", cost: "약 220,000원 (2인)", status: "urgent", tip: "AR1870 (07:30발) 2인 캐리어 1개 쉐어링 위탁으로 4~5만원 절감" },
    { title: "푸에르토나탈레스(PNT) ➔ 산티아고(SCL) Sky Airline / LATAM", target: "Sky Airline / LATAM 공홈", dDay: "D-90", cost: "약 260,000원 (2인)", status: "urgent", tip: "★ [실제 항공권] 15:38 PNT 이륙 ➔ 20:01 SCL 도착 확정" },
    { title: "산티아고(SCL) ➔ 아리카(ARI) Sky Airline / LATAM", target: "Sky Airline / LATAM 공홈", dDay: "D-90", cost: "약 240,000원 (2인)", status: "urgent", tip: "★ [실제 항공권] 05:00 SCL 출발 ➔ 07:40 ARI 착륙 확정" },
    { title: "아레키파 ➔ 쿠스코 크루즈 델 수르(Cruz del Sur) 1등석 침대 야간버스", target: "Cruz del Sur 공홈", dDay: "D-60", cost: "약 90,000원 (2인)", status: "urgent", tip: "Cruzero VIP 160도 침대 좌석 선점, 숙박비 1박 절감 & 06:30 쿠스코 도착" },
    { title: "쿠스코(CUZ) ➔ 리마(LIM) LATAM 항공편", target: "LATAM 항공 공홈", dDay: "D-60", cost: "약 120,000원 (2인)", status: "urgent", tip: "★ [실제 항공권] LA2024 14:30 출발 ➔ 16:00 리마 도착 확정" },
    { title: "엘 칼라파테 ↔ 엘 찰텐 왕복 버스 (Chaltén Travel)", target: "Platform 10 또는 Chalten Travel 공홈", dDay: "D-60", cost: "약 60,000원 (2인)", status: "recommended", tip: "08:00 출발 17:30 복귀 버스로 하산 후 온수 샤워 시간 넉넉히 확보" },
    { title: "엘 칼라파테 ➔ 푸에르토나탈레스 국경 통과 국제버스", target: "Bus-Sur 또는 Turismo Zaahj", dDay: "D-60", cost: "약 154,000원 (2인)", status: "recommended", tip: "08:00 출발편, 칠레 SAG 농축산물 검역 대비 생과일/육포 미지참" },
    { title: "페리토 모레노 빙하 국립공원 입장권 및 사파리 나우티코 보트", target: "아르헨티나 국립공원 공홈", dDay: "D-30", cost: "약 150,000원 (2인)", status: "recommended", tip: "국립공원 온라인 결제 QR 코드 오프라인 저장 및 보트 탑승" },
    { title: "부에노스아이레스 라 벤타나(La Ventana) 탱고 디너쇼", target: "La Ventana 공홈 / 클룩", dDay: "D-30", cost: "약 148,000원 (2인)", status: "recommended", tip: "산텔모 지역 호텔 픽업 포함 여부 확인, 3코스 디너 & 와인" },
    { title: "캐나다 전자여행허가 (eTA)", target: "캐나다 이민국 공식 웹사이트", dDay: "D-30", cost: "약 14,000원 (2인)", status: "urgent", tip: "건당 7 CAD, 사칭 사이트 주의! 밴쿠버 환승 및 다운타운 1박 필수" },
    { title: "남미 4개국 데이터 통합 eSIM", target: "Airalo / 유심사", dDay: "D-7", cost: "약 80,000원 (2인)", status: "urgent", tip: "아르헨티나, 칠레, 페루, 캐나다 4개국 커버리지 확인" }
  ],

  defaultChecklist: [
    { id: "sa_ck_01", text: "여권 원본 및 복사본 2장 (유효기간 6개월 이상)", checked: false, urgent: true, cat: "서류" },
    { id: "sa_ck_02", text: "트래블로그 / 트래블월렛 카드 (MEP 25% 자동 적용)", checked: false, urgent: true, cat: "금융" },
    { id: "sa_ck_03", text: "미국 달러 ~ 신권 (빳빳하고 접히지 않은 100달러 지폐)", checked: false, urgent: true, cat: "금융" },
    { id: "sa_ck_04", text: "캐나다 eTA 발급 승인 메일 출력 (밴쿠버 다운타운 1박 필수)", checked: false, urgent: true, cat: "서류" },
    { id: "sa_ck_05", text: "마추픽추 서킷 2 입장권 및 열차 바우처 인쇄", checked: false, urgent: true, cat: "서류" },
    { id: "sa_ck_06", text: "황열병 예방접종 증명서(옐로카드)", checked: false, urgent: false, cat: "의약품" },
    { id: "sa_ck_07", text: "고산병약(다이아목스/소로체 필) 및 소화제/진통제/지사제", checked: false, urgent: true, cat: "의약품" },
    { id: "sa_ck_08", text: "고어텍스 방풍/방수 자켓 (파타고니아 돌풍 대비)", checked: false, urgent: true, cat: "의류" },
    { id: "sa_ck_09", text: "경량 패딩 및 플리스 조끼 (레이어드 착용)", checked: false, urgent: true, cat: "의류" },
    { id: "sa_ck_10", text: "중등산화 및 두꺼운 등산 양말 3켤레", checked: false, urgent: true, cat: "트레킹" },
    { id: "sa_ck_11", text: "접이식 등산스틱 (피츠로이/삼봉 하산 시 무릎 보호)", checked: false, urgent: false, cat: "트레킹" },
    { id: "sa_ck_12", text: "20,000mAh 보조배터리 및 고속충전 케이블", checked: false, urgent: true, cat: "전자기기" },
    { id: "sa_ck_13", text: "자외선 차단 선글라스 UV400 & 선크림 SPF50+", checked: false, urgent: true, cat: "위생" },
    { id: "sa_ck_14", text: "아구아스 천연 온천욕 수영복 및 스포츠 타월", checked: false, urgent: false, cat: "물놀이" },
    { id: "sa_ck_15", text: "핫팩 10개 (피츠로이 새벽 영하 및 야간 산행 대비)", checked: false, urgent: true, cat: "방한" },
    { id: "sa_ck_16", text: "목베개 및 수면 안대 (장거리 야간비행 및 침대버스용)", checked: false, urgent: false, cat: "기내용" },
    { id: "sa_ck_17", text: "해외 여행자보험 증권 출력", checked: false, urgent: true, cat: "서류" },
    { id: "sa_ck_18", text: "다이소 와이어 자물쇠 및 복대 (소매치기 방지)", checked: false, urgent: true, cat: "보안" },
    { id: "sa_ck_19", text: "1박용 서브 배낭 (엘 찰텐 1박용 30L)", checked: false, urgent: true, cat: "가방" },
    { id: "sa_ck_20", text: "남미 4개국 지원 멀티 플러그 어댑터", checked: false, urgent: true, cat: "전자기기" },
    { id: "sa_ck_21", text: "방수 팩 및 지퍼백 (전자제품 보호)", checked: false, urgent: false, cat: "잡화" },
    { id: "sa_ck_22", text: "인공눈물 및 립밤 (건조 대비)", checked: false, urgent: true, cat: "위생" },
    { id: "sa_ck_23", text: "휴대용 물티슈 및 여행용 티슈 5개", checked: false, urgent: false, cat: "위생" },
    { id: "sa_ck_24", text: "모자(챙 넓은 사파리 모자 + 방한 비니)", checked: false, urgent: true, cat: "의류" },
    { id: "sa_ck_25", text: "장갑(스마트폰 터치 장갑 + 방풍 장갑)", checked: false, urgent: true, cat: "방한" },
    { id: "sa_ck_26", text: "개인 복용 비타민 및 유산균", checked: false, urgent: false, cat: "의약품" },
    { id: "sa_ck_27", text: "비상용 한식 컵라면/누룽지/볶음고추장", checked: false, urgent: false, cat: "식품" },
    { id: "sa_ck_28", text: "스포츠 보온병 (따뜻한 코카차 지참용)", checked: false, urgent: false, cat: "잡화" },
    { id: "sa_ck_29", text: "샤워기 필터 및 리필 필터", checked: false, urgent: false, cat: "위생" },
    { id: "sa_ck_30", text: "우비 또는 판초 우의 (마추픽추 스콜 대비)", checked: false, urgent: true, cat: "우천" },
    { id: "sa_ck_31", text: "손톱깎이 및 미니 가위", checked: false, urgent: false, cat: "잡화" },
    { id: "sa_ck_32", text: "스마트폰 분실방지 스프링 스트랩", checked: false, urgent: true, cat: "보안" },
    { id: "sa_ck_33", text: "귀국 짐 최종 패킹 시 잼/피스코주 액체류 위탁 수하물 패킹 (총 무게 23kg 이내 측정)", checked: false, urgent: true, cat: "귀국" }
  ],

  seedExpenses: [
    { id: "sa_exp_01", date: "2026-10-11", title: "인천 ➔ 밴쿠버 ➔ 부에노스아이레스 왕복 항공권 (2인 확정)", amount: 2050000, currency: "KRW", category: "flights", memo: "에어캐나다 AC062 / AC194 공홈 예약" },
    { id: "sa_exp_02", date: "2026-10-12", title: "캐나다 eTA 발급 수수료 (2인)", amount: 14, currency: "CAD", category: "other", memo: "캐나다 이민국 온라인 결제 (7 CAD * 2)" },
    { id: "sa_exp_03", date: "2026-10-13", dateIdx: 2, title: "에세이사 공항 ➔ 센트로 숙소 공식 셔틀/우버", amount: 25000, currency: "ARS", category: "transit", memo: "MEP 환율 적용" },
    { id: "sa_exp_04", date: "2026-10-13", dateIdx: 2, title: "돈 훌리오(Don Julio) 정통 파릴라 아사도 디너", amount: 110000, currency: "ARS", category: "food", memo: "꽃등심 아사도 + 말벡 와인 (MEP 25% 자동 할인)" },
    { id: "sa_exp_05", date: "2026-10-14", dateIdx: 3, title: "라 벤타나(La Ventana) 탱고 디너쇼 2인", amount: 148000, currency: "KRW", category: "tour", memo: "3코스 디너 + 와인 무제한 + 라이브 오케스트라" },
    { id: "sa_exp_06", date: "2026-10-15", dateIdx: 4, title: "부에노스(AEP) ➔ 칼라파테(FTE) 국내선 (2인)", amount: 220000, currency: "KRW", category: "flights", memo: "AR1870 수하물 쉐어링 1개 위탁" },
    { id: "sa_exp_07", date: "2026-10-15", dateIdx: 4, title: "La Tablita 파타고니아 어린 양고기(Cordero) 통구이", amount: 65000, currency: "ARS", category: "food", memo: "화덕 장작불 통양갈비 구이" },
    { id: "sa_exp_08", date: "2026-10-16", dateIdx: 5, title: "페리토 모레노 국립공원 입장료 & 사파리 나우티코 보트", amount: 150000, currency: "KRW", category: "tour", memo: "빙벽 붕락 조망 및 근접 보트" },
    { id: "sa_exp_09", date: "2026-10-16", dateIdx: 5, title: "엘 칼라파테 ↔ 엘 찰텐 왕복 버스 2인", amount: 60000, currency: "KRW", category: "transit", memo: "Chaltén Travel 우등 버스" },
    { id: "sa_exp_10", date: "2026-10-16", dateIdx: 5, title: "Cervecería Chaltén 로컬 브루어리 수제맥주 & 버거", amount: 34000, currency: "ARS", category: "food", memo: "피츠로이 하산주" },
    { id: "sa_exp_11", date: "2026-10-18", dateIdx: 7, title: "칼라파테 ➔ 푸에르토나탈레스 Bus Sur 국경 버스 (2인)", amount: 154000, currency: "KRW", category: "transit", memo: "아르헨티나 ➔ 칠레 국제선 버스" },
    { id: "sa_exp_12", date: "2026-10-19", dateIdx: 8, title: "Santolla 킹크랩(Centolla) 요리 & 칼라파테 사워", amount: 95000, currency: "CLP", category: "food", memo: "삼봉 20km 완주 기념 만찬" },
    { id: "sa_exp_13", date: "2026-10-19", dateIdx: 8, title: "토레스 델 파이네 국립공원 입장권 (2인)", amount: 90000, currency: "CLP", category: "tour", memo: "공원 공식 웹 예매" },
    { id: "sa_exp_14", date: "2026-10-20", dateIdx: 9, title: "푸에르토나탈레스(PNT) ➔ 산티아고(SCL) 국내선 (2인 확정)", amount: 260000, currency: "KRW", category: "flights", memo: "15:38발 실제 항공권 확정" },
    { id: "sa_exp_15", date: "2026-10-21", dateIdx: 10, title: "산 크리스토발 케이블카 & 스카이 코스타네라 300m 전망대", amount: 30000, currency: "CLP", category: "tour", memo: "안데스 만년설산 노을 & 360도 야경" },
    { id: "sa_exp_16", date: "2026-10-23", dateIdx: 12, title: "산티아고(SCL) ➔ 아리카(ARI) 국내선 (2인 확정)", amount: 240000, currency: "KRW", category: "flights", memo: "05:00발 실제 항공권 확정" },
    { id: "sa_exp_17", date: "2026-10-23", dateIdx: 12, title: "아리카 ➔ 타크나 국경 콜렉티보 & 타크나 ➔ 아레키파 우등버스 (2인)", amount: 120000, currency: "KRW", category: "transit", memo: "원스톱 국경 통과 및 아레키파 입성" },
    { id: "sa_exp_18", date: "2026-10-24", dateIdx: 13, title: "산타 카탈리나 수녀원 입장료 & 피칸테리아 점심", amount: 120, currency: "PEN", category: "tour", memo: "로코토 레예노 & 추페 데 카마로네스" },
    { id: "sa_exp_19", date: "2026-10-24", dateIdx: 13, title: "아레키파 ➔ 쿠스코 크루즈 델 수르 1등석 침대 야간버스 (2인)", amount: 90000, currency: "KRW", category: "transit", memo: "Cruzero VIP 160도 침대버스 숙박비 1박 절감" },
    { id: "sa_exp_20", date: "2026-10-26", dateIdx: 15, title: "성스러운 계곡 전일 투어 & 페루레일 기차표 (2인)", amount: 340000, currency: "KRW", category: "tour", memo: "친체로, 모레이, 마라스 소금밭, 17:20 기차" },
    { id: "sa_exp_21", date: "2026-10-27", dateIdx: 16, title: "마추픽추 서킷 2 입장권 및 셔틀버스 (2인)", amount: 200000, currency: "KRW", category: "tour", memo: "클래식 엽서 뷰 & 망지기의 집" },
    { id: "sa_exp_22", date: "2026-10-28", dateIdx: 17, title: "우만타이 에메랄드 빙하호수 투어 (2인)", amount: 150, currency: "PEN", category: "tour", memo: "해발 4,200m 빙하호수 등반" },
    { id: "sa_exp_23", date: "2026-10-28", dateIdx: 17, title: "Cicciolina 지중해-안데스 퓨전 파인다이닝 만찬", amount: 280, currency: "PEN", category: "food", memo: "쿠스코 최고 미식 타파스 & 와인" },
    { id: "sa_exp_24", date: "2026-10-29", dateIdx: 18, title: "쿠스코(CUZ) ➔ 리마(LIM) LATAM 국내선 (2인 확정)", amount: 120000, currency: "KRW", category: "flights", memo: "LA2024 14:30발 실제 항공권 확정" },
    { id: "sa_exp_25", date: "2026-10-29", dateIdx: 18, title: "Cevicheria Punto Azul 정통 페루 세비체 만찬", amount: 160, currency: "PEN", category: "food", memo: "태평양 신선 해산물 세비체" },
    { id: "sa_exp_26", date: "2026-10-31", dateIdx: 20, title: "밴쿠버 다운타운 워터프런트 호텔 2인실 (1박 확정)", amount: 130000, currency: "KRW", category: "stay", memo: "공항 노숙 완전 방지 & 개스타운 야경" }
  ],

  seedJournals: {
    1: { title: "대륙을 건너 남미로, 22일간의 가슴 뛰는 여정 시작", content: "드디어 에어캐나다 AC062편에 몸을 싣고 인천공항을 떠났다. 밴쿠버와 토론토를 거쳐 지구 반대편 부에노스아이레스로 향하는 길. 파타고니아의 거대한 빙하와 안데스 설산, 마추픽추가 눈앞에 아른거린다.", weather: "맑음", mood: "설렘", rating: 5 },
    3: { title: "부에노스아이레스 첫날! 탱고의 선율과 인생 스테이크", content: "7월 9일 대로의 오벨리스크를 지나 카페 토르토니에서 마신 진한 핫초콜릿과 추로스. 그리고 저녁 정통 파릴라에서 맛본 꽃등심 아사도는 왜 이곳이 미식의 도시인지 단번에 증명해 주었다.", weather: "맑음", mood: "감동", rating: 5 },
    5: { title: "천둥소리를 내며 무너지는 페리토 모레노 빙하의 위용", content: "푸른빛 거대한 얼음 성벽 앞에 섰을 때의 전율. 굉음과 함께 호수로 떨어지는 빙벽을 바라보며 자연의 장엄함에 숙연해졌다. 사파리 나우티코 보트에서 바라본 70m 빙벽은 압도적이었다.", weather: "쾌청", mood: "경이로움", rating: 5 },
    6: { title: "트레커들의 성지 엘 찰텐! 카프리 호수 너머 우뚝 선 피츠로이", content: "칼라파테에 큰 짐을 두고 1박 배낭으로 입성한 엘 찰텐. 에메랄드빛 카프리 호수에 비친 피츠로이 3대 봉우리는 마치 엽서 속 그림 같았다. 하산 후 마신 시원한 수제 생맥주 한잔!", weather: "바람", mood: "뿌듯함", rating: 5 },
    9: { title: "토레스 델 파이네 삼봉(20km) 완주! 내 인생 최고의 성취", content: "거대한 자갈 바위 급경사를 숨 가쁘게 올라 마침내 마주한 라스 토레스 삼봉. 비취색 빙하호수 위에 솟아오른 3개의 화강암 탑을 보며 온몸에 소름이 돋았다. 20km 하이킹 완주!", weather: "변덕", mood: "최고의성취", rating: 5 },
    13: { title: "국경을 넘어 페루 입성! 백색의 도시 아레키파의 황홀한 석양", content: "산티아고에서 아리카로 비행 후 타크나 국경을 넘어 페루에 첫발을 내디뎠다. 해발 2,325m의 백색 화산암 도시 아레키파. 눈부신 아르마스 광장과 만년설 미스티 화산을 바라보며 고산 순응을 순조롭게 시작했다.", weather: "쾌청", mood: "황홀함", rating: 5 },
    17: { title: "구름 위 공중도시 마추픽추, 세계 7대 불가사의를 마주하다", content: "이른 아침 안개가 서서히 걷히며 와이나픽추와 정교한 석조 공중도시의 전경이 온전히 드러났다. 잉카인들의 찬란했던 문명과 숨결이 그대로 느껴지는 경이로운 순간이었다.", weather: "맑음", mood: "영원한기억", rating: 5 }
  }
};

if (typeof window !== "undefined") {
  window.KB_TRAVEL = KB_TRAVEL;
  window.saDays = saDays;
  window.saDays21 = saDays21;
}
