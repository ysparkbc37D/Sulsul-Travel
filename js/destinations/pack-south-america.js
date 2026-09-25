/**
 * Sulsul-Travel South America Destination Pack (pack-south-america.js) v1.8.4
 * 2026 22-Day South America Grand Nature & Budget Master Tour (아르헨티나 최적화 & 엘찰텐 1박 v9).
 */
(function() {
  'use strict';

  const SA_KNOWN_SPOTS = [
    // 부에노스아이레스
    { id: 'bue_mayo', name: '5월 광장 & 분홍빛 대통령궁 카사 로사다', city: '부에노스아이레스', country: '아르헨티나', flag: '🇦🇷', cat: 'tour', lat: -34.6080, lng: -58.3702, tip: '에비타가 연설했던 분홍빛 카사 로사다 역사적 명소' },
    { id: 'bue_tortoni', name: '카페 토르토니 (Café Tortoni) 1858년 전통', city: '부에노스아이레스', country: '아르헨티나', flag: '🇦🇷', cat: 'food', lat: -34.6084, lng: -58.3789, tip: '추로스와 진한 초콜릿 음료(Submarino) (대기 길면 London City 대체)' },
    { id: 'bue_ateneo', name: '엘 아테네오 그랜드 스플렌디드 서점', city: '부에노스아이레스', country: '아르헨티나', flag: '🇦🇷', cat: 'tour', lat: -34.5959, lng: -58.3942, tip: '오페라 극장을 개조한 세계에서 가장 아름다운 서점' },
    { id: 'bue_recoleta', name: '레콜레타 묘지 (에비타 묘역)', city: '부에노스아이레스', country: '아르헨티나', flag: '🇦🇷', cat: 'tour', lat: -34.5878, lng: -58.3927, tip: '야외 조각 박물관 같은 대리석 묘원' },
    { id: 'bue_mujer', name: '푸에르토 마데로 여인의 다리 (Puente de la Mujer)', city: '부에노스아이레스', country: '아르헨티나', flag: '🇦🇷', cat: 'tour', lat: -34.6079, lng: -58.3649, tip: '현대 부두가 석양 산책로, 부에노스에서 가장 안전한 치안 구역' },
    { id: 'bue_donjulio', name: '돈 훌리오 (Don Julio) 꽃등심 아사도 스테이크', city: '부에노스아이레스', country: '아르헨티나', flag: '🇦🇷', cat: 'food', lat: -34.5878, lng: -58.4239, tip: '세계 50대 레스토랑, MEP 카드 환율로 반값에 즐기는 최고급 스테이크 (만석 시 La Cabrera 대체)' },
    { id: 'bue_tango', name: '라 벤타나 (La Ventana) 정통 탱고 디너쇼', city: '부에노스아이레스', country: '아르헨티나', flag: '🇦🇷', cat: 'tour', lat: -34.6146, lng: -58.3712, tip: '산텔모 정통 탱고 하우스, 3코스 디너와 라이브 오케스트라' },

    // 엘 칼라파테
    { id: 'fte_glacier', name: '페리토 모레노 거대 빙하 전망대', city: '엘 칼라파테', country: '아르헨티나', flag: '🇦🇷', cat: 'tour', lat: -50.4687, lng: -73.0450, tip: '천둥 치는 굉음과 함께 호수로 무너져 내리는 푸른 빙벽 붕락 조망' },
    { id: 'fte_boat', name: '사파리 나우티코 빙하 근접 보트 투어', city: '엘 칼라파테', country: '아르헨티나', flag: '🇦🇷', cat: 'tour', lat: -50.4795, lng: -73.0412, tip: '높이 70m의 거대한 푸른 빙벽 바로 코앞까지 다가가는 스릴감' },
    { id: 'fte_tablita', name: 'La Tablita 파타고니아 어린 양고기 통구이', city: '엘 칼라파테', country: '아르헨티나', flag: '🇦🇷', cat: 'food', lat: -50.3392, lng: -72.2618, tip: '화덕 장작불에 구워낸 파타고니아 전통 어린 양갈비 스테이크' },

    // 엘 찰텐
    { id: 'cha_fitz', name: '피츠로이 카프리 호수 (Laguna Capri)', city: '엘 찰텐', country: '아르헨티나', flag: '🇦🇷', cat: 'tour', lat: -49.3142, lng: -72.9535, tip: '에메랄드빛 호수 너머로 우뚝 솟은 피츠로이 3대 봉봉 엽서 뷰' },
    { id: 'cha_condor', name: '미라도르 로스 콘도레스 황금 일출 전망대', city: '엘 찰텐', country: '아르헨티나', flag: '🇦🇷', cat: 'tour', lat: -49.3361, lng: -72.8812, tip: '아침 햇살에 피츠로이 봉우리가 붉은 금빛으로 타오르는 장경' },
    { id: 'cha_chorrillo', name: '초리요 델 살토 (Chorrillo del Salto) 숲속 폭포', city: '엘 찰텐', country: '아르헨티나', flag: '🇦🇷', cat: 'tour', lat: -49.3015, lng: -72.9056, tip: '마을에서 평지로 왕복 2시간 가볍게 걸을 수 있는 20m 숲속 폭포' },
    { id: 'cha_beer', name: 'Cervecería Chaltén 수제 생맥주 브루어리', city: '엘 찰텐', country: '아르헨티나', flag: '🇦🇷', cat: 'food', lat: -49.3308, lng: -72.8850, tip: '피츠로이 하산 후 트레커들이 모여 마시는 파타고니아 수제 생맥주와 버거' },

    // 푸에르토나탈레스 & 토레스 델 파이네
    { id: 'pnt_torres', name: '미라도르 라스 토레스(삼봉) 베이스 20km', city: '토레스 델 파이네', country: '칠레', flag: '🇨🇱', cat: 'tour', lat: -50.9575, lng: -72.9372, tip: '비취색 빙하호수와 하늘을 찌르는 3개 화강암 첨탑! 파타고니아 최고의 성취' },
    { id: 'pnt_salto', name: '살토 그란데 폭포 (Salto Grande)', city: '토레스 델 파이네', country: '칠레', flag: '🇨🇱', cat: 'tour', lat: -51.0667, lng: -73.0833, tip: '거대한 빙하수가 굉음을 내며 떨어지는 폭포 (바람 거셈 모자 주의)' },
    { id: 'pnt_grey', name: '그레이 호수 자갈 해변 유빙 관찰 (Playa Lago Grey)', city: '토레스 델 파이네', country: '칠레', flag: '🇨🇱', cat: 'tour', lat: -51.1342, lng: -73.1311, tip: '출렁다리를 건너 모래 해변에서 호수에 떠다니는 푸른 유빙 조망' },
    { id: 'pnt_santolla', name: 'Santolla 킹크랩(Centolla) 전문 요리점', city: '푸에르토나탈레스', country: '칠레', flag: '🇨🇱', cat: 'food', lat: -51.7268, lng: -72.5065, tip: '컨테이너 인테리어 속 신선한 파타고니아산 킹크랩 타르타르와 맥주' },

    // 산페드로데아타카마
    { id: 'ata_moon', name: '달의 계곡 (Valle de la Luna) 황혼 투어', city: '산페드로데아타카마', country: '칠레', flag: '🇨🇱', cat: 'tour', lat: -22.9298, lng: -68.2934, tip: '지구상에서 달 표면과 가장 흡사한 지형, 석양에 붉게 타오르는 안데스산맥' },
    { id: 'ata_baltinache', name: '발티나체 히든 라군 (Lagunas Escondidas)', city: '산페드로데아타카마', country: '칠레', flag: '🇨🇱', cat: 'tour', lat: -23.0180, lng: -68.2430, tip: '사해처럼 몸이 저절로 둥둥 뜨는 신비한 고염분 청록색 사막 오아시스 호수' },
    { id: 'ata_tatio', name: '엘 타티오 간헐천 군 (Geiseres del Tatio 4,300m)', city: '산페드로데아타카마', country: '칠레', flag: '🇨🇱', cat: 'tour', lat: -22.3353, lng: -68.0125, tip: '해발 4,300m 영하의 새벽, 80여 개 간헐천 구멍에서 솟구치는 거대한 백색 증기둥' },
    { id: 'ata_astro', name: '아타카마 별빛 투어 (Stargazing)', city: '산페드로데아타카마', country: '칠레', flag: '🇨🇱', cat: 'tour', lat: -22.9087, lng: -68.1997, tip: '세계에서 가장 맑은 하늘, 망원경으로 관측하는 남십자성과 은하수 파노라마' },
    { id: 'ata_casona', name: 'La Casona 화덕 엠파나다 & 전통 퀴진', city: '산페드로데아타카마', country: '칠레', flag: '🇨🇱', cat: 'food', lat: -22.9110, lng: -68.2012, tip: '흙벽돌 화덕에서 갓 구운 육즙 가득 소고기 엠파나다와 피스코 사워' },

    // 산티아고
    { id: 'scl_cristobal', name: '산 크리스토발 언덕 케이블카 & 백모후 마리아상', city: '산티아고', country: '칠레', flag: '🇨🇱', cat: 'tour', lat: -33.4253, lng: -70.6338, tip: '케이블카를 타고 언덕에 올라 안데스 설산을 병풍 삼은 산티아고 시내 파노라마 감상' },
    { id: 'scl_costanera', name: '스카이 코스타네라 300m 전망대', city: '산티아고', country: '칠레', flag: '🇨🇱', cat: 'tour', lat: -33.4172, lng: -70.6067, tip: '남미 최고층 빌딩 61~62층에서 즐기는 360도 웅장한 야경' },
    { id: 'scl_armas', name: '아르마스 광장 & 메트로폴리탄 대성당', city: '산티아고', country: '칠레', flag: '🇨🇱', cat: 'tour', lat: -33.4378, lng: -70.6505, tip: '스페인 식민지 시대의 웅장한 바로크 양식 성당과 야자수 광장' },
    { id: 'scl_mercado', name: '산티아고 중앙시장 (Mercado Central) 해산물', city: '산티아고', country: '칠레', flag: '🇨🇱', cat: 'food', lat: -33.4339, lng: -70.6514, tip: '칠레 앞바다에서 잡은 신선한 바다 해산물 탕 파일라 마리나(Paila Marina)' },

    // 쿠스코 & 성스러운 계곡
    { id: 'cuz_armas', name: '쿠스코 아르마스 광장 & 12각의 돌', city: '쿠스코', country: '페루', flag: '🇵🇪', cat: 'tour', lat: -13.5160, lng: -71.9785, tip: '칼날 하나 들어가지 않는 잉카 정밀 석조 건축의 절정 12각의 돌' },
    { id: 'cuz_saqsay', name: '삭사이와만 거대 석조 요새', city: '쿠스코', country: '페루', flag: '🇵🇪', cat: 'tour', lat: -13.5080, lng: -71.9817, tip: '수백 톤짜리 지그재그 거석들로 축조된 잉카 군사 요새와 쿠스코 시내 조망' },
    { id: 'cuz_maras', name: '살리네라스 데 마라스 계단식 암염 소금밭', city: '쿠스코', country: '페루', flag: '🇵🇪', cat: 'tour', lat: -13.3014, lng: -72.1558, tip: '해발 3,000m 안데스 산비탈에 펼쳐진 3,000여 개의 찬란한 분홍빛 소금 계단' },
    { id: 'cuz_moray', name: '모라이 잉카 원형 농경 테라스', city: '쿠스코', country: '페루', flag: '🇵🇪', cat: 'tour', lat: -13.3298, lng: -72.1969, tip: '고도와 깊이에 따라 기온차가 15도나 나는 잉카의 농업 시험 연구 테라스' },
    { id: 'cuz_humantay', name: '우만타이 에메랄드 빙하 호수 (Laguna Humantay 4,200m)', city: '쿠스코', country: '페루', flag: '🇵🇪', cat: 'tour', lat: -13.4150, lng: -72.5714, tip: '눈 덮인 설산 아래 옥빛 영롱한 보석 같은 호수 (고산증 약 복용 및 천천히 걷기)' },
    { id: 'cuz_cicciolina', name: 'Cicciolina 지중해풍 퓨전 안데스 퀴진', city: '쿠스코', country: '페루', flag: '🇵🇪', cat: 'food', lat: -13.5165, lng: -71.9760, tip: '쿠스코 최고의 파간다이닝, 오리 카르파초와 송어 타파스, 와인' },

    // 마추픽추
    { id: 'mp_classic', name: '마추픽추 망지기의 집 클래식 엽서 뷰 (서킷 2)', city: '마추픽추', country: '페루', flag: '🇵🇪', cat: 'tour', lat: -13.1631, lng: -72.5450, tip: '안개 걷힌 와이나픽추와 공중도시 전경이 한눈에 펼쳐지는 세계 7대 불가사의' },
    { id: 'mp_temple', name: '태양의 신전 & 인티와타나 해시계', city: '마추픽추', country: '페루', flag: '🇵🇪', cat: 'tour', lat: -13.1637, lng: -72.5458, tip: '동짓날 햇빛이 정확히 창문을 비추는 반원형 신전과 태양을 묶어두는 돌' },
    { id: 'mp_hotspring', name: '아구아스 칼리엔테스 잉카 노천 온천', city: '마추픽추', country: '페루', flag: '🇵🇪', cat: 'tour', lat: -13.1555, lng: -72.5225, tip: '마추픽추 탐방 후 지친 다리 피로를 푸는 유황 천연 온천욕' },
    { id: 'mp_indio', name: 'Indio Feliz 프랑스-페루 퓨전 비스트로', city: '마추픽추', country: '페루', flag: '🇵🇪', cat: 'food', lat: -13.1542, lng: -72.5250, tip: '아기자기한 여행자 낙서 인테리어와 신선한 레몬 버터 안데스 송어 구이' },

    // 리마
    { id: 'lim_miraflores', name: '미라플로레스 사랑의 공원 & 라르코마르 절벽몰', city: '리마', country: '페루', flag: '🇵🇪', cat: 'tour', lat: -12.1325, lng: -77.0305, tip: '태평양 해안 절벽 위에 세워진 현대적 쇼핑몰과 가우디풍 모자이크 공원' },
    { id: 'lim_barranco', name: '바랑코 예술가 거리 & 탄식의 다리 (Puente de los Suspiros)', city: '리마', country: '페루', flag: '🇵🇪', cat: 'tour', lat: -12.1487, lng: -77.0224, tip: '보헤미안 감성의 벽화 골목, 숨을 참고 다리를 건너며 소원을 비는 전설' },
    { id: 'lim_armas', name: '리마 아르마스 광장 & 대통령궁 대성당', city: '리마', country: '페루', flag: '🇵🇪', cat: 'tour', lat: -12.0460, lng: -77.0306, tip: '노란 식민지풍 건축물과 피사로의 유해가 안치된 리마 대성당' },
    { id: 'lim_puntoazul', name: 'Cevicheria Punto Azul 정통 세비체', city: '리마', country: '페루', flag: '🇵🇪', cat: 'food', lat: -12.1225, lng: -77.0300, tip: '태평양 흰살 생선에 라임즙과 고수를 듬뿍 넣은 페루 국민 미식' },

    // 밴쿠버
    { id: 'yvr_gastown', name: '개스타운 증기시계 (Gastown Steam Clock)', city: '밴쿠버', country: '캐나다', flag: '🇨🇦', cat: 'tour', lat: 49.2845, lng: -123.1089, tip: '15분마다 하얀 증기를 뿜으며 휘슬 멜로디를 울리는 밴쿠버의 상징' },
    { id: 'yvr_flyover', name: '플라이오버 캐나다 (FlyOver Canada) 4D 비행 체험', city: '밴쿠버', country: '캐나다', flag: '🇨🇦', cat: 'tour', lat: 49.2888, lng: -123.1111, tip: '캐나다플레이스에서 나이아가라와 로키산맥 상공을 날아다니는 몰입형 체험' },
    { id: 'yvr_stanley', name: '스탠리 파크 해안 산책로 (Stanley Park Seawall)', city: '밴쿠버', country: '캐나다', flag: '🇨🇦', cat: 'tour', lat: 49.3017, lng: -123.1442, tip: '도심 속 원시림 공원, 토템폴 공원과 라이온스게이트 브리지 조망' }
  ];

  const SA_DESTINATIONS = [
    {
      id: 'bue',
      name: '부에노스아이레스',
      nameEn: 'Buenos Aires',
      country: '아르헨티나',
      countryEn: 'Argentina',
      flag: '🇦🇷',
      lat: -34.6037,
      lng: -58.3816,
      zoom: 13,
      currency: 'ARS',
      altitude: '25m (평지)',
      emergency: '911',
      embassy: '+54-11-4805-8291',
      highlights: ['5월 광장 & 카사 로사다', '돈 훌리오 꽃등심 아사도', '엘 아테네오 서점', '라 벤타나 탱고쇼'],
      foods: ['꽃등심 아사도(Ojo de Bife)', '엠파나다', '추로스 & 초콜릿 Submarino', '말벡 와인'],
      tips: 'MEP 신용카드 결제로 공식 환율 대비 40% 이상 자동 할인 절감.'
    },
    {
      id: 'fte',
      name: '엘 칼라파테',
      nameEn: 'El Calafate',
      country: '아르헨티나',
      countryEn: 'Argentina',
      flag: '🇦🇷',
      lat: -50.3379,
      lng: -72.2648,
      zoom: 12,
      currency: 'ARS',
      altitude: '200m (평지)',
      emergency: '101',
      embassy: '+54-11-4805-8291',
      highlights: ['페리토 모레노 거대 빙하', '사파리 나우티코 보트 투어', 'La Tablita 양고기 통구이'],
      foods: ['파타고니아 어린 양고기(Cordero)', '칼라파테 베리 잼', '알파호르'],
      tips: '국립공원 입장권은 사전 온라인 결제 필수. 빙하 트레킹 시 장갑/방풍의 필수.'
    },
    {
      id: 'cha',
      name: '엘 찰텐',
      nameEn: 'El Chaltén',
      country: '아르헨티나',
      countryEn: 'Argentina',
      flag: '🇦🇷',
      lat: -49.3315,
      lng: -72.8864,
      zoom: 13,
      currency: 'ARS',
      altitude: '400m',
      emergency: '101',
      embassy: '+54-11-4805-8291',
      highlights: ['피츠로이 카프리 호수(Laguna Capri)', '로스 콘도레스 일출 전망대', '수제 맥주 브루어리'],
      foods: ['파타고니아 수제 생맥주', '트레커 버거', '핫스튜(Guiso)'],
      tips: '엘 칼라파테 숙소에 큰 캐리어를 무료 보관하고 1박 배낭만 챙겨 가볍게 이동!'
    },
    {
      id: 'pnt',
      name: '토레스 델 파이네',
      nameEn: 'Torres del Paine / Puerto Natales',
      country: '칠레',
      countryEn: 'Chile',
      flag: '🇨🇱',
      lat: -51.2532,
      lng: -72.8814,
      zoom: 10,
      currency: 'CLP',
      altitude: '100m ~ 1,000m',
      emergency: '133',
      embassy: '+56-2-2228-4214',
      highlights: ['미라도르 라스 토레스 20km', '살토 그란데 폭포', '그레이 호수 유빙', 'Santolla 킹크랩'],
      foods: ['마가야네스 킹크랩(Centolla)', '연어 스테이크', '칼라파테 사워'],
      tips: '칠레 입국 시 과일/육류/견과류 농축산물 엄격 검역! 미신고 적발 시 막대한 벌금.'
    },
    {
      id: 'ata',
      name: '산페드로데아타카마',
      nameEn: 'San Pedro de Atacama',
      country: '칠레',
      countryEn: 'Chile',
      flag: '🇨🇱',
      lat: -22.9087,
      lng: -68.1997,
      zoom: 12,
      currency: 'CLP',
      altitude: '2,400m ~ 4,300m',
      emergency: '133',
      embassy: '+56-2-2228-4214',
      highlights: ['달의 계곡 황혼', '엘 타티오 간헐천(4,300m)', '발티나체 히든 라군 부유체험', '별빛 투어'],
      foods: ['화덕 소고기 엠파나다', '라마 스테이크', '피스코 사워'],
      tips: '엘 타티오 간헐천은 새벽 영하 5도 이하로 급랭. 방한모자/핫팩/경량패딩 3중 착용.'
    },
    {
      id: 'scl',
      name: '산티아고',
      nameEn: 'Santiago',
      country: '칠레',
      countryEn: 'Chile',
      flag: '🇨🇱',
      lat: -33.4489,
      lng: -70.6693,
      zoom: 12,
      currency: 'CLP',
      altitude: '570m',
      emergency: '133',
      embassy: '+56-2-2228-4214',
      highlights: ['산 크리스토발 케이블카', '스카이 코스타네라 300m 전망대', '아르마스 광장'],
      foods: ['파일라 마리나(해산물 탕)', '바베큐 로모(Lomo)', '모테 콘 우에시요'],
      tips: '대중교통 이용 시 Bip! 교통카드 이용. 지하철망이 매우 쾌적하고 편리함.'
    },
    {
      id: 'cuz',
      name: '쿠스코',
      nameEn: 'Cusco',
      country: '페루',
      countryEn: 'Peru',
      flag: '🇵🇪',
      lat: -13.5319,
      lng: -71.9675,
      zoom: 13,
      currency: 'PEN',
      altitude: '3,400m (고산 지대)',
      emergency: '105',
      embassy: '+51-1-632-5000',
      highlights: ['아르마스 광장 & 12각의 돌', '살리네라스 마라스 염전', '모라이 테라스', '우만타이 호수(4,200m)'],
      foods: ['로모 살타도(소고기 감자볶음)', '안데스 송어(Trucha)', '코카차(고산차)', '치차 모라다'],
      tips: '도착 당일은 절대 무리한 운동 금지! 이뇨작용 고산병약 복용 및 코카차 수시 음용.'
    },
    {
      id: 'mp',
      name: '마추픽추',
      nameEn: 'Machu Picchu',
      country: '페루',
      countryEn: 'Peru',
      flag: '🇵🇪',
      lat: -13.1631,
      lng: -72.5450,
      zoom: 14,
      currency: 'PEN',
      altitude: '2,430m (쿠스코보다 낮음)',
      emergency: '105',
      embassy: '+51-1-632-5000',
      highlights: ['서킷 2 클래식 망지기의 집 엽서 뷰', '태양의 신전', '아구아스 칼리엔테스 온천'],
      foods: ['안데스 송어 버터구이', '퀴노아 수프', '피스코 사워'],
      tips: '서킷 2 입장권 및 잉카레일/페루레일 열차는 3~4개월 전 타임어택 예약 필수!'
    },
    {
      id: 'lim',
      name: '리마',
      nameEn: 'Lima',
      country: '페루',
      countryEn: 'Peru',
      flag: '🇵🇪',
      lat: -12.0464,
      lng: -77.0428,
      zoom: 12,
      currency: 'PEN',
      altitude: '100m (평지 해안)',
      emergency: '105',
      embassy: '+51-1-632-5000',
      highlights: ['미라플로레스 사랑의 공원', '라르코마르 절벽 쇼핑몰', '바랑코 예술가 거리', '정통 세비체'],
      foods: ['세비체(Ceviche)', '안티쿠초(소심장 꼬치)', '피스코 사워', '잉카 콜라'],
      tips: '미라플로레스와 바랑코는 안전하나 구도심 센트로는 해 진 뒤 소매치기 각별 주의.'
    },
    {
      id: 'yvr',
      name: '밴쿠버',
      nameEn: 'Vancouver',
      country: '캐나다',
      countryEn: 'Canada',
      flag: '🇨🇦',
      lat: 49.2827,
      lng: -123.1207,
      zoom: 13,
      currency: 'CAD',
      altitude: '0m (평지)',
      emergency: '911',
      embassy: '+1-604-681-9581',
      highlights: ['개스타운 증기시계', '플라이오버 캐나다 4D', '스탠리 파크 해안 산책로'],
      foods: ['밴쿠버 연어 요리', '푸틴(Poutine)', '팀호튼 커피 & 도넛'],
      tips: '귀국 경유 시 캐나다 eTA 필수. 캐나다플레이스 주변은 도보 관광에 최적화.'
    }
  ];

  const SA_BOOKING_GUIDES = [
    { id: "sa_bg_01", title: "인천 ➔ 밴쿠버 ➔ 부에노스아이레스 다구간 국제선 항공권", target: "에어캐나다 공홈 / 스카이스캐너", dDay: "D-180", cost: "약 3,600,000원 (2인)", status: "urgent", tip: "밴쿠버/토론토 경유 수하물 자동 연결 여부 확인", url: "https://www.aircanada.com" },
    { id: "sa_bg_02", title: "마추픽추 서킷 2 (Circuit 2) 클래식 입장권", target: "페루 문화부 공식 홈페이지 (tuboleto.cultura.pe)", dDay: "D-120", cost: "약 110,000원 (2인)", status: "urgent", tip: "가장 인기 높은 코스로 오픈 당일 매진되므로 즉시 예약", url: "https://tuboleto.cultura.pe" },
    { id: "sa_bg_03", title: "오얀타이탐보 ↔ 마추픽추 잉카레일/페루레일 왕복 기차표", target: "Inca Rail / PeruRail 공홈", dDay: "D-90", cost: "약 360,000원 (2인)", status: "urgent", tip: "마추픽추 입장 시간과 맞물려 2~3시간 전 도착 편 예약", url: "https://incarail.com" },
    { id: "sa_bg_04", title: "부에노스(AEP) ➔ 칼라파테(FTE) 아르헨티나 항공 국내선", target: "Aerolineas Argentinas 공홈", dDay: "D-90", cost: "약 480,000원 (2인)", status: "urgent", tip: "MEP 환율 적용 신용카드로 결제 시 큰 폭 할인", url: "https://www.aerolineas.com.ar" },
    { id: "sa_bg_05", title: "푼타아레나스(PUQ) ➔ 산티아고(SCL) ➔ 칼라마(CJC) LATAM", target: "LATAM 항공 공홈", dDay: "D-90", cost: "약 560,000원 (2인)", status: "urgent", tip: "칠레 국내선 묶음 결제 시 프로모션 운임 적용", url: "https://www.latamairlines.com" },
    { id: "sa_bg_06", title: "산티아고(SCL) ➔ 리마(LIM) ➔ 쿠스코(CUZ) LATAM 항공", target: "LATAM 항공 공홈", dDay: "D-90", cost: "약 620,000원 (2인)", status: "urgent", tip: "국제선+페루 국내선 연계 발권", url: "https://www.latamairlines.com" },
    { id: "sa_bg_07", title: "엘 칼라파테 ↔ 엘 찰텐 왕복 버스 (Chalten Travel)", target: "Platform 10 또는 Chalten Travel 공홈", dDay: "D-60", cost: "약 96,000원 (2인)", status: "recommended", tip: "08:00 출발 18:00 복귀 골든 슬롯 확보", url: "https://www.plataforma10.com.ar" },
    { id: "sa_bg_08", title: "엘 칼라파테 ➔ 푸에르토나탈레스 국경 통과 국제버스", target: "Bus-Sur 또는 Cootra", dDay: "D-60", cost: "약 120,000원 (2인)", status: "recommended", tip: "아르헨티나 ➔ 칠레 국경 심사 소요 시간 감안", url: "https://www.bussur.com" },
    { id: "sa_bg_09", title: "푸에르토나탈레스 ➔ 푼타아레나스 버스 (Bus-Sur)", target: "Bus-Sur 공홈", dDay: "D-45", cost: "약 40,000원 (2인)", status: "recommended", tip: "오후 16:30 출발편 추천", url: "https://www.bussur.com" },
    { id: "sa_bg_10", title: "페리토 모레노 빙하 국립공원 입장권 및 사파리 나우티코 보트", target: "아르헨티나 국립공원 공홈", dDay: "D-30", cost: "약 180,000원 (2인)", status: "recommended", tip: "국립공원 온라인 결제 QR 코드 오프라인 저장", url: "https://www.argentina.gob.ar/parquesnacionales/glaciares" },
    { id: "sa_bg_11", title: "아타카마 천문대 별빛 투어 (Stargazing)", target: "현지 전문 천문대 투어사", dDay: "D-30", cost: "약 110,000원 (2인)", status: "recommended", tip: "보름달 전후 3일은 달빛으로 은하수 관측 불가하므로 음력 체크", url: "https://www.sanpedroatacama.com" },
    { id: "sa_bg_12", title: "부에노스아이레스 라 벤타나(La Ventana) 탱고 디너쇼", target: "La Ventana 공홈 / 클룩", dDay: "D-30", cost: "약 240,000원 (2인)", status: "recommended", tip: "산텔모 지역 호텔 픽업 포함 여부 확인", url: "https://www.laventanaweb.com" },
    { id: "sa_bg_13", title: "캐나다 전자여행허가 (eTA)", target: "캐나다 이민국 공식 웹사이트", dDay: "D-30", cost: "약 14,000원 (2인)", status: "urgent", tip: "건당 7 CAD, 사칭 대행 사이트 주의!", url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/eta.html" },
    { id: "sa_bg_14", title: "남미 4개국 데이터 통합 eSIM", target: "Airalo / 유심사", dDay: "D-7", cost: "약 80,000원 (2인)", status: "urgent", tip: "아르헨티나, 칠레, 페루, 캐나다 4개국 커버리지 확인", url: "https://www.airalo.com" }
  ];

  const destinationPackSouthAmerica = {
    id: 'pack_south_america_22d',
    name: '2026 남미 22일 가성비 마스터플랜 (아르헨티나 최적화 & 엘찰텐 1박 v9)',
    version: '1.8.4',
    author: "CoBa's Sulsul Travel Engine",
    description: '2026.10.11 ~ 11.01(22일간 2인 예산 946.7만원) 아르헨티나, 칠레, 페루, 캐나다 4개국 10대 거점 완벽 수록',
    countries: ['아르헨티나', '칠레', '페루', '캐나다'],
    currencies: ['ARS', 'CLP', 'PEN', 'CAD', 'USD', 'KRW'],
    duration: 22,
    defaultRoomCode: 'SA-2026',
    flag: '🌎',

    match(trip) {
      if (!trip) return false;
      if (trip.id === 'trip_sa_showcase_22d' || trip.id === 'trip_sa_showcase_21d') return true;
      const text = ((trip.title || '') + ' ' + (trip.destination || '') + ' ' + (trip.countries || []).join(' ') + ' ' + (trip.cities || []).join(' ')).toLowerCase();
      return /남미|아르헨티나|칠레|페루|파타고니아|부에노스|칼라파테|엘찰텐|토레스|아타카마|산티아고|쿠스코|마추픽추|리마|south\s*america/i.test(text);
    },
    
    geo: {
      center: [-25.0, -68.0],
      defaultZoom: 4,
      bounds: [
        [-55.5, -82.0], // 파타고니아 남단
        [10.0, -50.0]   // 남미 북단
      ],
      destinations: SA_DESTINATIONS,
      flightRoutes: [
        { from: [37.4602, 126.4407], to: [49.1967, -123.1815], label: 'ICN ➔ YVR (에어캐나다 AC062)' },
        { from: [49.1967, -123.1815], to: [43.6777, -79.6248], label: 'YVR ➔ YYZ (에어캐나다)' },
        { from: [43.6777, -79.6248], to: [-34.8127, -58.5398], label: 'YYZ ➔ EZE (에어캐나다 야간비행)' },
        { from: [-34.5580, -58.4170], to: [-50.2800, -72.0531], label: 'AEP ➔ FTE (아에로라인 아르헨티나스)' },
        { from: [-50.3379, -72.2648], to: [-49.3315, -72.8864], label: '칼라파테 ➔ 엘찰텐 (치텐 버스 3시간)' },
        { from: [-49.3315, -72.8864], to: [-50.3379, -72.2648], label: '엘찰텐 ➔ 칼라파테 (버스 복귀)' },
        { from: [-50.3379, -72.2648], to: [-51.7268, -72.5065], label: '칼라파테 ➔ 나탈레스 (국경 통과 버스 5.5시간)' },
        { from: [-51.7268, -72.5065], to: [-53.0026, -70.8546], label: '나탈레스 ➔ 푼타아레나스 (버스 3시간)' },
        { from: [-53.0026, -70.8546], to: [-33.3930, -70.7858], label: 'PUQ ➔ SCL (LATAM)' },
        { from: [-33.3930, -70.7858], to: [-22.4982, -68.9056], label: 'SCL ➔ CJC (LATAM)' },
        { from: [-22.4982, -68.9056], to: [-33.3930, -70.7858], label: 'CJC ➔ SCL (LATAM)' },
        { from: [-33.3930, -70.7858], to: [-12.0219, -77.1143], label: 'SCL ➔ LIM ➔ CUZ (LATAM)' },
        { from: [-13.5357, -71.9388], to: [-12.0219, -77.1143], label: 'CUZ ➔ LIM (LATAM)' },
        { from: [-12.0219, -77.1143], to: [49.1967, -123.1815], label: 'LIM ➔ YVR (에어캐나다)' },
        { from: [49.1967, -123.1815], to: [37.4602, 126.4407], label: 'YVR ➔ ICN (에어캐나다 귀국)' }
      ],
      simPresets: [
        { label: '인천 ➔ 부에노스아이레스 대륙간 출국', center: [-34.6037, -58.3816], zoom: 12 },
        { label: '부에노스아이레스 도심 & 아사도 미식', center: [-34.5878, -58.4239], zoom: 13 },
        { label: '엘 칼라파테 페리토 모레노 빙하', center: [-50.4687, -73.0450], zoom: 11 },
        { label: '엘 찰텐 피츠로이 카프리 호수 트레킹', center: [-49.3142, -72.9535], zoom: 12 },
        { label: '토레스 델 파이네 삼봉(20km) 대자연', center: [-50.9575, -72.9372], zoom: 10 },
        { label: '산페드로데아타카마 달의 계곡 & 간헐천', center: [-22.9087, -68.1997], zoom: 10 },
        { label: '산티아고 안데스 설산 배경 메트로폴리스', center: [-33.4489, -70.6693], zoom: 12 },
        { label: '잉카의 심장 쿠스코 & 성스러운 계곡', center: [-13.5319, -71.9675], zoom: 12 },
        { label: '안데스 공중도시 마추픽추 서킷 2', center: [-13.1631, -72.5450], zoom: 14 },
        { label: '태평양 해안 절벽 미식 수도 리마', center: [-12.1325, -77.0305], zoom: 12 },
        { label: '캐나다 밴쿠버 증기시계 & 스탠리 파크', center: [49.2827, -123.1207], zoom: 13 }
      ]
    },

    bookings: {
      subtabTitle: '14대 필수 예약',
      subtabIcon: 'fa-ticket',
      headerTitle: '남미 22일 14대 핵심 사전 예약 타임어택 대시보드',
      headerDesc: '마추픽추 입장권, 파노라마 열차, 국립공원 등 매진되기 전 공식 사이트에서 직접 예약해야 하는 필수 리스트입니다.',
      items: SA_BOOKING_GUIDES,
      specialNotice: {
        title: '✈️ 남미 22일 황금 코스 실전 3대 불변 수칙 & 사전 예약 가이드',
        tips: [
          { title: 'MEP 블루달러 환율 40% 절감', desc: '아르헨티나 국내선 항공, 특급 호텔, 돈 훌리오 스테이크 등은 트래블로그/트래블월렛 Visa/Master 카드로 결제 시 공식 환율 대비 40% 이상 자동 할인 절감.' },
          { title: '고산병(소로체) 3단계 적응', desc: '아타카마(2,400m) ➔ 쿠스코(3,400m) 단계적 상승. 다이아목스는 입성 24시간 전 반 알씩 복용, 입성 첫날 무리한 도보 절대 금지 및 코카차 수시 음용.' },
          { title: '23kg 수하물 무게 3원칙', desc: '초반(아르헨/칠레) 무거운 액체류 구매 절대 금지(국내선 5회 오버차지 방지). 쿠스코는 150g 베이비 알파카 목도리, 리마 출국 전 피스코/잼 집중 구매 후 위탁 수하물 패킹.' }
        ]
      }
    },

    cities: {
      subtabTitle: '10대 거점 도시 가이드',
      subtabIcon: 'fa-city',
      headerTitle: '남미 10대 거점 도시 완벽 가이드',
      headerDesc: '남미 4개국 10대 거점 도시별 주요 랜드마크, 현지 필수 미식, 고산병/안전 수칙 및 긴급 연락망을 안내합니다.',
      items: SA_DESTINATIONS
    },

    spots: SA_KNOWN_SPOTS
  };

  if (typeof window !== 'undefined') {
    window.destinationPackSouthAmerica = destinationPackSouthAmerica;
    window.SulsulDestinationPacks = window.SulsulDestinationPacks || {};
    window.SulsulDestinationPacks['pack_south_america_22d'] = destinationPackSouthAmerica;

    if (window.DestinationRegistry) {
      window.DestinationRegistry.register(destinationPackSouthAmerica);
    }
    if (window.SulsulDestinationRegistry && typeof window.SulsulDestinationRegistry.registerPack === 'function') {
      window.SulsulDestinationRegistry.registerPack(destinationPackSouthAmerica);
    }
  }
})();
