/**
 * Sulsul-Travel South America Destination Pack (pack-south-america.js) v1.8.7
 * General destination knowledge and booking preparation for South America.
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
    { id: 'bue_donjulio', name: '돈 훌리오 (Don Julio) 꽃등심 아사도 스테이크', city: '부에노스아이레스', country: '아르헨티나', flag: '🇦🇷', cat: 'food', lat: -34.5878, lng: -58.4239, tip: '세계 50대 레스토랑, MEP 카드 환율 25% 자동 할인 적용 (만석 시 La Cabrera 대체)' },
    { id: 'bue_tango', name: '라 벤타나 (La Ventana) 정통 탱고 디너쇼', city: '부에노스아이레스', country: '아르헨티나', flag: '🇦🇷', cat: 'tour', lat: -34.6146, lng: -58.3712, tip: '산텔모 정통 탱고 하우스, 3코스 디너와 라이브 오케스트라' },

    // 엘 칼라파테
    { id: 'fte_glacier', name: '페리토 모레노 거대 빙하 전망대', city: '엘 칼라파테', country: '아르헨티나', flag: '🇦🇷', cat: 'tour', lat: -50.4687, lng: -73.0450, tip: '천둥 치는 굉음과 함께 호수로 무너져 내리는 푸른 빙벽 붕락 조망' },
    { id: 'fte_boat', name: '사파리 나우티코 빙하 근접 보트 투어', city: '엘 칼라파테', country: '아르헨티나', flag: '🇦🇷', cat: 'tour', lat: -50.4795, lng: -73.0412, tip: '높이 70m의 거대한 푸른 빙벽 바로 코앞까지 다가가는 스릴감' },
    { id: 'fte_tablita', name: 'La Tablita 파타고니아 어린 양고기 통구이', city: '엘 칼라파테', country: '아르헨티나', flag: '🇦🇷', cat: 'food', lat: -50.3392, lng: -72.2618, tip: '화덕 장작불에 구워낸 파타고니아 전통 어린 양갈비 스테이크' },

    // 엘 찰텐
    { id: 'cha_fitz', name: '피츠로이 카프리 호수 (Laguna Capri)', city: '엘 찰텐', country: '아르헨티나', flag: '🇦🇷', cat: 'tour', lat: -49.3142, lng: -72.9535, tip: '에메랄드빛 호수 너머로 우뚝 솟은 피츠로이 3대 첨탑 엽서 뷰' },
    { id: 'cha_condor', name: '미라도르 로스 콘도레스 황금 일출 전망대', city: '엘 찰텐', country: '아르헨티나', flag: '🇦🇷', cat: 'tour', lat: -49.3361, lng: -72.8812, tip: '아침 햇살에 피츠로이 봉우리가 붉은 금빛으로 타오르는 장경 (불타는 고구마 챌린지)' },
    { id: 'cha_chorrillo', name: '초리요 델 살토 (Chorrillo del Salto) 숲속 폭포', city: '엘 찰텐', country: '아르헨티나', flag: '🇦🇷', cat: 'tour', lat: -49.3015, lng: -72.9056, tip: '마을에서 평지로 왕복 2시간 가볍게 걸을 수 있는 20m 숲속 폭포' },
    { id: 'cha_beer', name: 'Cervecería Chaltén 수제 생맥주 브루어리', city: '엘 찰텐', country: '아르헨티나', flag: '🇦🇷', cat: 'food', lat: -49.3308, lng: -72.8850, tip: '피츠로이 하산 후 트레커들이 모여 마시는 파타고니아 수제 생맥주와 버거' },

    // 푸에르토나탈레스 & 토레스 델 파이네
    { id: 'pnt_torres', name: '미라도르 라스 토레스(삼봉) 베이스 20km', city: '토레스 델 파이네', country: '칠레', flag: '🇨🇱', cat: 'tour', lat: -50.9575, lng: -72.9372, tip: '비취색 빙하호수와 하늘을 찌르는 3개 화강암 첨탑! 파타고니아 최고의 성취' },
    { id: 'pnt_salto', name: '살토 그란데 폭포 (Salto Grande)', city: '토레스 델 파이네', country: '칠레', flag: '🇨🇱', cat: 'tour', lat: -51.0667, lng: -73.0833, tip: '거대한 빙하수가 굉음을 내며 떨어지는 폭포 (바람 거셈 모자 주의)' },
    { id: 'pnt_grey', name: '그레이 호수 자갈 해변 유빙 관찰 (Playa Lago Grey)', city: '토레스 델 파이네', country: '칠레', flag: '🇨🇱', cat: 'tour', lat: -51.1342, lng: -73.1311, tip: '출렁다리를 건너 모래 해변에서 호수에 떠다니는 푸른 유빙 조망' },
    { id: 'pnt_santolla', name: 'Santolla 킹크랩(Centolla) 전문 요리점', city: '푸에르토나탈레스', country: '칠레', flag: '🇨🇱', cat: 'food', lat: -51.7268, lng: -72.5065, tip: '컨테이너 인테리어 속 신선한 파타고니아산 킹크랩 타르타르와 맥주' },

    // 산티아고
    { id: 'scl_cristobal', name: '산 크리스토발 언덕 케이블카 & 성모마리아상', city: '산티아고', country: '칠레', flag: '🇨🇱', cat: 'tour', lat: -33.4253, lng: -70.6338, tip: '케이블카를 타고 언덕에 올라 안데스 설산을 병풍 삼은 산티아고 시내 파노라마 감상' },
    { id: 'scl_costanera', name: '스카이 코스타네라 300m 전망대', city: '산티아고', country: '칠레', flag: '🇨🇱', cat: 'tour', lat: -33.4172, lng: -70.6067, tip: '남미 최고층 빌딩 61~62층에서 즐기는 360도 웅장한 야경' },
    { id: 'scl_armas', name: '아르마스 광장 & 메트로폴리탄 대성당', city: '산티아고', country: '칠레', flag: '🇨🇱', cat: 'tour', lat: -33.4378, lng: -70.6505, tip: '스페인 식민지 시대의 웅장한 바로크 양식 성당과 야자수 광장' },
    { id: 'scl_galindo', name: 'Galindo 전통 옥수수 파이(Pastel de Choclo)', city: '산티아고', country: '칠레', flag: '🇨🇱', cat: 'food', lat: -33.4339, lng: -70.6350, tip: '벨라비스타 보헤미안 거리 전통 칠레 가정식 맛집' },

    // 아레키파 (Arequipa)
    { id: 'aqp_catalina', name: '산타 카탈리나 수녀원 (Monasterio de Santa Catalina)', city: '아레키파', country: '페루', flag: '🇵🇪', cat: 'tour', lat: -16.3953, lng: -71.5369, tip: '도시 안의 거대한 수도원 요새! 선명한 블루/오렌지 회랑과 중세 정원' },
    { id: 'aqp_armas', name: '아레키파 아르마스 광장 & 백색 대성당', city: '아레키파', country: '페루', flag: '🇵🇪', cat: 'tour', lat: -16.3988, lng: -71.5369, tip: '유네스코 세계유산, 하얀 화산암(Sillar)으로 지어진 남미에서 가장 우아한 광장' },
    { id: 'aqp_yanahuara', name: '야나우아라 전망대 (Mirador de Yanahuara)', city: '아레키파', country: '페루', flag: '🇵🇪', cat: 'tour', lat: -16.3867, lng: -71.5414, tip: '하얀 화산암 아치문 너머로 해발 5,822m 만년설 미스티(Misti) 화산 엽서 뷰' },
    { id: 'aqp_picanteria', name: '전통 피칸테리아 라 누에바 팔로미노 (La Nueva Palomino)', city: '아레키파', country: '페루', flag: '🇵🇪', cat: 'food', lat: -16.3888, lng: -71.5411, tip: '로코토 레예노(매콤 고추 고기찜)와 추페 데 카마로네스(민물가재 수프) 미식 명소' },

    // 쿠스코 & 성스러운 계곡
    { id: 'cuz_armas', name: '쿠스코 아르마스 광장 & 12각의 돌', city: '쿠스코', country: '페루', flag: '🇵🇪', cat: 'tour', lat: -13.5160, lng: -71.9785, tip: '칼날 하나 들어가지 않는 잉카 정밀 석조 건축의 절정 12각의 돌' },
    { id: 'cuz_coricancha', name: '코리칸차 (태양의 신전 / Qorikancha)', city: '쿠스코', country: '페루', flag: '🇵🇪', cat: 'tour', lat: -13.5208, lng: -71.9754, tip: '잉카 최고의 황금 신전 기단 위에 건축된 산토 도밍고 성당' },
    { id: 'cuz_saqsay', name: '삭사이와만 거대 석조 요새', city: '쿠스코', country: '페루', flag: '🇵🇪', cat: 'tour', lat: -13.5080, lng: -71.9817, tip: '수백 톤짜리 지그재그 거석들로 축조된 잉카 군사 요새와 쿠스코 시내 조망' },
    { id: 'cuz_maras', name: '살리네라스 데 마라스 계단식 암염 소금밭', city: '쿠스코', country: '페루', flag: '🇵🇪', cat: 'tour', lat: -13.3014, lng: -72.1558, tip: '해발 3,000m 안데스 산비탈에 펼쳐진 3,000여 개의 찬란한 분홍빛 소금 계단' },
    { id: 'cuz_moray', name: '모라이 잉카 원형 농경 테라스', city: '쿠스코', country: '페루', flag: '🇵🇪', cat: 'tour', lat: -13.3298, lng: -72.1969, tip: '고도와 깊이에 따라 기온차가 15도나 나는 잉카의 농업 시험 연구 테라스' },
    { id: 'cuz_humantay', name: '우만타이 에메랄드 빙하 호수 (Laguna Humantay 4,200m)', city: '쿠스코', country: '페루', flag: '🇵🇪', cat: 'tour', lat: -13.4150, lng: -72.5714, tip: '눈 덮인 설산 아래 옥빛 영롱한 보석 같은 호수 (아레키파 고산 순응으로 쾌적 등반)' },
    { id: 'cuz_cicciolina', name: 'Cicciolina 지중해풍 퓨전 안데스 퀴진', city: '쿠스코', country: '페루', flag: '🇵🇪', cat: 'food', lat: -13.5165, lng: -71.9760, tip: '쿠스코 최고의 파인다이닝, 오리 카르파초와 송어 타파스, 와인' },

    // 마추픽추
    { id: 'mp_classic', name: '마추픽추 망지기의 집 클래식 엽서 뷰 (서킷 2)', city: '마추픽추', country: '페루', flag: '🇵🇪', cat: 'tour', lat: -13.1631, lng: -72.5450, tip: '안개 걷힌 와이나픽추와 공중도시 전경이 한눈에 펼쳐지는 세계 7대 불가사의' },
    { id: 'mp_temple', name: '태양의 신전 & 인티와타나 해시계', city: '마추픽추', country: '페루', flag: '🇵🇪', cat: 'tour', lat: -13.1637, lng: -72.5458, tip: '동짓날 햇빛이 정확히 창문을 비추는 반원형 신전과 태양을 묶어두는 돌' },
    { id: 'mp_hotspring', name: '아구아스 칼리엔테스 잉카 천연 노천 온천', city: '마추픽추', country: '페루', flag: '🇵🇪', cat: 'tour', lat: -13.1555, lng: -72.5225, tip: '성스러운 계곡 투어 및 마추픽추 탐방 후 지친 다리 피로를 푸는 천연 온천욕' },
    { id: 'mp_indio', name: 'Indio Feliz 프랑스-페루 퓨전 비스트로', city: '마추픽추', country: '페루', flag: '🇵🇪', cat: 'food', lat: -13.1542, lng: -72.5250, tip: '아기자기한 여행자 낙서 인테리어와 신선한 레몬 버터 안데스 송어 구이' },

    // 리마
    { id: 'lim_miraflores', name: '미라플로레스 사랑의 공원 & 라르코마르 절벽몰', city: '리마', country: '페루', flag: '🇵🇪', cat: 'tour', lat: -12.1325, lng: -77.0305, tip: '태평양 해안 절벽 위에 세워진 현대적 쇼핑몰과 가우디풍 모자이크 공원' },
    { id: 'lim_barranco', name: '바랑코 예술가 거리 & 탄식의 다리 (Puente de los Suspiros)', city: '리마', country: '페루', flag: '🇵🇪', cat: 'tour', lat: -12.1487, lng: -77.0224, tip: '보헤미안 감성의 벽화 골목, 숨을 참고 다리를 건너며 소원을 비는 전설' },
    { id: 'lim_armas', name: '리마 아르마스 광장 & 대통령궁 대성당', city: '리마', country: '페루', flag: '🇵🇪', cat: 'tour', lat: -12.0460, lng: -77.0306, tip: '노란 식민지풍 건축물과 피사로의 유해가 안치된 리마 대성당' },
    { id: 'lim_puntoazul', name: 'Cevicheria Punto Azul 정통 세비체', city: '리마', country: '페루', flag: '🇵🇪', cat: 'food', lat: -12.1225, lng: -77.0300, tip: '태평양 흰살 생선에 라임즙과 고수를 듬뿍 넣은 페루 국민 미식' },

    // 밴쿠버
    { id: 'yvr_gastown', name: '개스타운 증기시계 (Gastown Steam Clock)', city: '밴쿠버', country: '캐나다', flag: '🇨🇦', cat: 'tour', lat: 49.2845, lng: -123.1089, tip: '15분마다 하얀 증기를 뿜으며 휘슬 멜로디를 울리는 밴쿠버의 상징 (다운타운 1박 야경)' },
    { id: 'yvr_canada_place', name: '캐나다 플레이스 & 콜 하버 아침 산책', city: '밴쿠버', country: '캐나다', flag: '🇨🇦', cat: 'tour', lat: 49.2888, lng: -123.1111, tip: '워터프런트 흰 돛 형상 건물과 설산 바다 뷰, 귀국 비행기 탑승 전 산책' },
    { id: 'yvr_timhortons', name: '팀홀튼(Tim Hortons) 캐나다 국민 커피 & 도넛', city: '밴쿠버', country: '캐나다', flag: '🇨🇦', cat: 'food', lat: 49.2850, lng: -123.1130, tip: '프렌치 바닐라와 달콤한 팀빗 도넛 모닝 세트' }
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
      tips: 'MEP 신용카드 결제로 공식 환율 대비 25% 이상 자동 할인 절감.'
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
      highlights: ['피츠로이 카프리 호수(Laguna Capri)', '로스 콘도레스 일출 전망대', '초리요 폭포', '수제 맥주 브루어리'],
      foods: ['파타고니아 수제 생맥주', '트레커 버거', '핫스튜(Guiso)'],
      tips: '엘 칼라파테 숙소에 큰 캐리어를 무료 보관하고 1박 배낭만 챙겨 가볍게 이동! 불타는 고구마 일출 도전.'
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
      highlights: ['미라도르 라스 토레스 20km 완주', '살토 그란데 폭포', '그레이 호수 유빙', 'Santolla 킹크랩'],
      foods: ['마가야네스 킹크랩(Centolla)', '연어 스테이크', '칼라파테 사워'],
      tips: '칠레 입국 시 과일/육류/견과류 농축산물 엄격 검역! 미신고 적발 시 막대한 벌금.'
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
      highlights: ['산 크리스토발 케이블카', '스카이 코스타네라 300m 전망대', '아르마스 광장', '발파라이소 당일치기'],
      foods: ['파일라 마리나(해산물 탕)', '바베큐 로모(Lomo)', '파스텔 데 초클로'],
      tips: '대중교통 이용 시 Bip! 교통카드 이용. 지하철망이 매우 쾌적하고 편리함.'
    },
    {
      id: 'aqp',
      name: '아레키파',
      nameEn: 'Arequipa',
      country: '페루',
      countryEn: 'Peru',
      flag: '🇵🇪',
      lat: -16.4090,
      lng: -71.5375,
      zoom: 13,
      currency: 'PEN',
      altitude: '2,325m (고산 적응 최적 거점)',
      emergency: '105',
      embassy: '+51-1-632-5000',
      highlights: ['산타 카탈리나 수녀원', '아르마스 광장 & 백색 대성당', '야나우아라 미스티 화산 전망대', '전통 피칸테리아'],
      foods: ['로코토 레예노(매콤 고추 고기찜)', '추페 데 카마로네스(새우 수프)', '아레키파 전통 맥주'],
      tips: '해발 2,325m의 백색 화산암(Sillar) 도시! 쿠스코(3,400m) 입성 전 고산 순응 완벽 거점.'
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
      highlights: ['아르마스 광장 & 12각의 돌', '코리칸차', '살리네라스 마라스 염전', '모라이 테라스', '우만타이 호수(4,200m)'],
      foods: ['로모 살타도(소고기 감자볶음)', '안데스 송어(Trucha)', '코카차(고산차)', '치차 모라다'],
      tips: '아레키파를 거쳐와 고산 적응이 수월함! 코카차 수시 음용 및 BCP 무료 ATM 솔 인출.'
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
      highlights: ['서킷 2 클래식 망지기의 집 엽서 뷰', '태양의 신전', '아구아스 칼리엔테스 천연 온천'],
      foods: ['안데스 송어 버터구이', '퀴노아 수프', '피스코 사워'],
      tips: '서킷 2 입장권 및 페루레일 열차는 3~4개월 전 타임어택 예약 필수!'
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
      highlights: ['미라플로레스 사랑의 공원', '라르코마르 절벽 쇼핑몰', '바랑코 예술가 거리 & 탄식의 다리', '정통 세비체'],
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
      highlights: ['개스타운 증기시계', '캐나다 플레이스 & 콜 하버', '다운타운 워터프런트 1박'],
      foods: ['밴쿠버 연어 요리', '푸틴(Poutine)', '팀호튼 커피 & 도넛'],
      tips: '귀국 경유 시 캐나다 eTA 필수. 다운타운 1박으로 공항 노숙 완전 방지 및 쾌적 휴식.'
    }
  ];

  const SA_BOOKING_GUIDES = [
    {"id":"sa_bg_01","title":"국제선 항공권","target":"항공사 또는 선택한 예약처","dDay":"예약 전 확인","cost":"예약처에서 확인","status":"pending","tip":"예매 여부를 확인하고 여행 일정에 맞는 출발·도착 편을 선택하세요.","url":"#"},
    {"id":"sa_bg_02","title":"도시 간 항공편","target":"항공사 또는 선택한 예약처","dDay":"예약 전 확인","cost":"예약처에서 확인","status":"pending","tip":"이동하는 날짜와 도시를 정한 후 해당 일정에 맞는 항공편을 확인하세요.","url":"#"},
    {"id":"sa_bg_03","title":"도시 간 버스","target":"운송사 또는 선택한 예약처","dDay":"예약 전 확인","cost":"예약처에서 확인","status":"pending","tip":"사용자가 정한 이동 구간의 운행 여부와 출발·도착 장소를 확인하세요.","url":"#"},
    {"id":"sa_bg_04","title":"숙박 예약","target":"숙소 또는 선택한 예약처","dDay":"예약 전 확인","cost":"예약처에서 확인","status":"pending","tip":"숙박 날짜와 인원, 체크인 조건 및 취소 조건을 확인하세요.","url":"#"},
    {"id":"sa_bg_05","title":"국립공원 입장","target":"방문할 공원의 공식 예약처","dDay":"예약 전 확인","cost":"예약처에서 확인","status":"pending","tip":"방문 날짜와 필요한 입장권의 예약 여부를 확인하세요.","url":"#"},
    {"id":"sa_bg_06","title":"트레킹 준비","target":"방문할 공원 또는 운영사","dDay":"예약 전 확인","cost":"예약처에서 확인","status":"pending","tip":"선택한 코스의 이용 조건과 필요한 예약을 확인하세요.","url":"#"},
    {"id":"sa_bg_07","title":"관광지 입장권","target":"방문할 관광지의 공식 예약처","dDay":"예약 전 확인","cost":"예약처에서 확인","status":"pending","tip":"개인 일정에 맞는 입장 날짜와 시간대를 선택하세요.","url":"#"},
    {"id":"sa_bg_08","title":"현지 투어","target":"선택한 투어 운영사","dDay":"예약 전 확인","cost":"예약처에서 확인","status":"pending","tip":"여행 일정에 맞는 상품과 집결 장소, 취소 조건을 확인하세요.","url":"#"},
    {"id":"sa_bg_09","title":"철도 예약","target":"선택한 철도 운영사","dDay":"예약 전 확인","cost":"예약처에서 확인","status":"pending","tip":"사용자가 선택한 이동 구간과 날짜에 맞는 열차를 확인하세요.","url":"#"},
    {"id":"sa_bg_10","title":"공항 이동","target":"선택한 이동 서비스","dDay":"예약 전 확인","cost":"예약처에서 확인","status":"pending","tip":"개인 항공 일정에 맞는 이동 시간과 탑승 장소를 확인하세요.","url":"#"},
    {"id":"sa_bg_11","title":"여행자 보험","target":"선택한 보험사","dDay":"예약 전 확인","cost":"예약처에서 확인","status":"pending","tip":"여행 기간과 활동에 맞는 보장 및 가입 여부를 확인하세요.","url":"#"},
    {"id":"sa_bg_12","title":"여권·입국 요건","target":"방문 국가의 공식 안내처","dDay":"예약 전 확인","cost":"예약처에서 확인","status":"pending","tip":"사용자의 여권과 방문 국가에 적용되는 입국 요건을 확인하세요.","url":"#"},
    {"id":"sa_bg_13","title":"예약 변경·취소 조건","target":"각 예약처","dDay":"예약 전 확인","cost":"예약처에서 확인","status":"pending","tip":"예약 내용의 변경 가능 여부와 취소 조건을 확인하세요.","url":"#"},
    {"id":"sa_bg_14","title":"수하물 조건","target":"선택한 항공사 또는 운송사","dDay":"예약 전 확인","cost":"예약처에서 확인","status":"pending","tip":"실제 예약한 운임의 수하물 허용량과 추가 비용을 확인하세요.","url":"#"}
  ];

  const destinationPackSouthAmerica = {
    id: 'pack_south_america',
    name: '남미 여행지 안내',
    version: '1.8.7',
    author: 'Sulsul Travel',
    description: '남미의 도시와 관광지, 여행 준비를 위한 일반 안내입니다. 일정과 예약은 사용자 여행에서 관리합니다.',
    countries: ['아르헨티나', '칠레', '페루', '캐나다'],
    currencies: ['ARS', 'CLP', 'PEN', 'CAD', 'USD', 'KRW'],
    flag: '🌎',

    match(trip) {
      if (!trip) return false;
      const text = ((trip.title || '') + ' ' + (trip.destination || '') + ' ' + (trip.countries || []).join(' ') + ' ' + (trip.cities || []).join(' ')).toLowerCase();
      return /남미|아르헨티나|칠레|페루|파타고니아|부에노스|칼라파테|엘찰텐|토레스|아레키파|산티아고|쿠스코|마추픽추|리마|south\s*america/i.test(text);
    },
    
    geo: {
      center: [-22.0, -68.0],
      defaultZoom: 4,
      bounds: [
        [-55.5, -82.0], // 파타고니아 남단
        [10.0, -50.0]   // 남미 북단
      ],
      destinations: SA_DESTINATIONS,
      flightRoutes: [],
      simPresets: [
        { label: '인천 ➔ 부에노스아이레스 대륙간 출국', center: [-34.6037, -58.3816], zoom: 12 },
        { label: '부에노스아이레스 도심 & 아사도 미식', center: [-34.5878, -58.4239], zoom: 13 },
        { label: '엘 칼라파테 페리토 모레노 빙하', center: [-50.4687, -73.0450], zoom: 11 },
        { label: '엘 찰텐 피츠로이 카프리 호수 트레킹', center: [-49.3142, -72.9535], zoom: 12 },
        { label: '토레스 델 파이네 삼봉(20km) 대자연', center: [-50.9575, -72.9372], zoom: 10 },
        { label: '산티아고 안데스 설산 배경 메트로폴리스', center: [-33.4489, -70.6693], zoom: 12 },
        { label: '백색도시 아레키파 & 미스티 화산', center: [-16.4090, -71.5375], zoom: 13 },
        { label: '잉카의 심장 쿠스코 & 성스러운 계곡', center: [-13.5319, -71.9675], zoom: 12 },
        { label: '안데스 공중도시 마추픽추 서킷 2', center: [-13.1631, -72.5450], zoom: 14 },
        { label: '태평양 해안 절벽 미식 수도 리마', center: [-12.1325, -77.0305], zoom: 12 },
        { label: '캐나다 밴쿠버 증기시계 & 워터프런트', center: [49.2827, -123.1207], zoom: 13 }
      ]
    },

    bookings: {
      subtabTitle: '여행 예약 체크리스트',
      subtabIcon: 'fa-ticket',
      headerTitle: '남미 여행 예약 체크리스트',
      headerDesc: '예약 여부와 여행 일정에 맞는 교통·숙박·입장 항목을 확인하세요. 금액과 조건은 예약처에서 확인합니다.',
      items: SA_BOOKING_GUIDES,
      specialNotice: {
        title: '예약 내용은 내 여행에서 확인하세요',
        tips: [
          { title: '예약 여부 확인', desc: '항공권·숙소·교통·입장권의 예약 여부를 직접 확인하세요.' },
          { title: '일정에 맞는 편 선택', desc: '출발·도착 날짜와 이동 시간을 개인 일정에 맞춰 선택하세요.' },
          { title: '금액·조건 확인', desc: '최종 금액, 수하물, 변경·취소 조건은 예약처에서 확인하세요.' }
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
    window.SulsulDestinationPacks['pack_south_america'] = destinationPackSouthAmerica;

    if (window.DestinationRegistry) {
      window.DestinationRegistry.register(destinationPackSouthAmerica);
    }
    if (window.SulsulDestinationRegistry && typeof window.SulsulDestinationRegistry.registerPack === 'function') {
      window.SulsulDestinationRegistry.registerPack(destinationPackSouthAmerica);
    }
  }
})();