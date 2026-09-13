/**
 * Sulsul-Travel Default Generic Destination Pack (pack-default.js) v1.7.8
 * Comprehensive Global Geocoding Engine & Dynamic Destination Pack.
 * Automatically resolves accurate coordinates, country-qualified Google Maps links,
 * national currencies, simulation presets, and route polylines for worldwide travel.
 * 100% Offline-First, Zero-Backend, No-Build compatible.
 */
(function() {
  'use strict';

  // =========================================================================
  // 1. 글로벌 국가 지리 정보 및 통화/국기 데이터베이스 (140+개국 중심 좌표)
  // =========================================================================
  const GLOBAL_COUNTRY_DATA = {
    // 유럽
    '스페인': { code: 'ES', name: '스페인', nameEn: 'Spain', flag: '🇪🇸', currency: 'EUR', center: [40.4637, -3.7492], zoom: 6, aliases: ['spain', 'espana', 'espanol', '스페인국'] },
    '포르투갈': { code: 'PT', name: '포르투갈', nameEn: 'Portugal', flag: '🇵🇹', currency: 'EUR', center: [39.3999, -8.2245], zoom: 7, aliases: ['portugal'] },
    '프랑스': { code: 'FR', name: '프랑스', nameEn: 'France', flag: '🇫🇷', currency: 'EUR', center: [46.2276, 2.2137], zoom: 6, aliases: ['france'] },
    '이탈리아': { code: 'IT', name: '이탈리아', nameEn: 'Italy', flag: '🇮🇹', currency: 'EUR', center: [41.8719, 12.5674], zoom: 6, aliases: ['italy', 'italia', '이태리'] },
    '스위스': { code: 'CH', name: '스위스', nameEn: 'Switzerland', flag: '🇨🇭', currency: 'CHF', center: [46.8182, 8.2275], zoom: 7, aliases: ['switzerland', 'swiss'] },
    '영국': { code: 'GB', name: '영국', nameEn: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', center: [55.3781, -3.4360], zoom: 6, aliases: ['uk', 'england', 'britain', 'united kingdom', '잉글랜드', '런던'] },
    '독일': { code: 'DE', name: '독일', nameEn: 'Germany', flag: '🇩🇪', currency: 'EUR', center: [51.1657, 10.4515], zoom: 6, aliases: ['germany', 'deutschland'] },
    '오스트리아': { code: 'AT', name: '오스트리아', nameEn: 'Austria', flag: '🇦🇹', currency: 'EUR', center: [47.5162, 14.5501], zoom: 7, aliases: ['austria', 'osterreich'] },
    '체코': { code: 'CZ', name: '체코', nameEn: 'Czech Republic', flag: '🇨🇿', currency: 'CZK', center: [49.8175, 15.4730], zoom: 7, aliases: ['czech', 'czech republic'] },
    '헝가리': { code: 'HU', name: '헝가리', nameEn: 'Hungary', flag: '🇭🇺', currency: 'HUF', center: [47.1625, 19.5033], zoom: 7, aliases: ['hungary'] },
    '크로아티아': { code: 'HR', name: '크로아티아', nameEn: 'Croatia', flag: '🇭🇷', currency: 'EUR', center: [45.1000, 15.2000], zoom: 7, aliases: ['croatia'] },
    '그리스': { code: 'GR', name: '그리스', nameEn: 'Greece', flag: '🇬🇷', currency: 'EUR', center: [39.0742, 21.8243], zoom: 7, aliases: ['greece', 'hellas'] },
    '네덜란드': { code: 'NL', name: '네덜란드', nameEn: 'Netherlands', flag: '🇳🇱', currency: 'EUR', center: [52.1326, 5.2913], zoom: 7, aliases: ['netherlands', 'holland'] },
    '벨기에': { code: 'BE', name: '벨기에', nameEn: 'Belgium', flag: '🇧🇪', currency: 'EUR', center: [50.5039, 4.4699], zoom: 8, aliases: ['belgium'] },
    '폴란드': { code: 'PL', name: '폴란드', nameEn: 'Poland', flag: '🇵🇱', currency: 'PLN', center: [51.9194, 19.1451], zoom: 6, aliases: ['poland'] },
    '노르웨이': { code: 'NO', name: '노르웨이', nameEn: 'Norway', flag: '🇳🇴', currency: 'NOK', center: [60.4720, 8.4689], zoom: 5, aliases: ['norway'] },
    '스웨덴': { code: 'SE', name: '스웨덴', nameEn: 'Sweden', flag: '🇸🇪', currency: 'SEK', center: [60.1282, 18.6435], zoom: 5, aliases: ['sweden'] },
    '덴마크': { code: 'DK', name: '덴마크', nameEn: 'Denmark', flag: '🇩🇰', currency: 'DKK', center: [56.2639, 9.5018], zoom: 7, aliases: ['denmark'] },
    '핀란드': { code: 'FI', name: '핀란드', nameEn: 'Finland', flag: '🇫🇮', currency: 'EUR', center: [61.9241, 25.7482], zoom: 5, aliases: ['finland'] },
    '아이슬란드': { code: 'IS', name: '아이슬란드', nameEn: 'Iceland', flag: '🇮🇸', currency: 'ISK', center: [64.9631, -19.0208], zoom: 6, aliases: ['iceland'] },
    '튀르키예': { code: 'TR', name: '튀르키예', nameEn: 'Turkey', flag: '🇹🇷', currency: 'TRY', center: [38.9637, 35.2433], zoom: 6, aliases: ['turkey', 'turkiye', '터키'] },
    '아일랜드': { code: 'IE', name: '아일랜드', nameEn: 'Ireland', flag: '🇮🇪', currency: 'EUR', center: [53.1424, -7.6921], zoom: 7, aliases: ['ireland'] },
    '슬로베니아': { code: 'SI', name: '슬로베니아', nameEn: 'Slovenia', flag: '🇸🇮', currency: 'EUR', center: [46.1512, 14.9955], zoom: 8, aliases: ['slovenia'] },
    '슬로바키아': { code: 'SK', name: '슬로바키아', nameEn: 'Slovakia', flag: '🇸🇰', currency: 'EUR', center: [48.6690, 19.6990], zoom: 7, aliases: ['slovakia'] },
    '루마니아': { code: 'RO', name: '루마니아', nameEn: 'Romania', flag: '🇷🇴', currency: 'RON', center: [45.9432, 24.9668], zoom: 6, aliases: ['romania'] },
    '불가리아': { code: 'BG', name: '불가리아', nameEn: 'Bulgaria', flag: '🇧🇬', currency: 'BGN', center: [42.7339, 25.4858], zoom: 7, aliases: ['bulgaria'] },

    // 아시아
    '대한민국': { code: 'KR', name: '대한민국', nameEn: 'South Korea', flag: '🇰🇷', currency: 'KRW', center: [36.5, 127.8], zoom: 7, aliases: ['한국', '남한', 'korea', 'south korea'] },
    '일본': { code: 'JP', name: '일본', nameEn: 'Japan', flag: '🇯🇵', currency: 'JPY', center: [36.2048, 138.2529], zoom: 6, aliases: ['japan', 'nippon'] },
    '대만': { code: 'TW', name: '대만', nameEn: 'Taiwan', flag: '🇹🇼', currency: 'TWD', center: [23.6978, 120.9605], zoom: 7, aliases: ['taiwan', '타이완'] },
    '홍콩': { code: 'HK', name: '홍콩', nameEn: 'Hong Kong', flag: '🇭🇰', currency: 'HKD', center: [22.3193, 114.1694], zoom: 11, aliases: ['hong kong'] },
    '마카오': { code: 'MO', name: '마카오', nameEn: 'Macau', flag: '🇲🇴', currency: 'MOP', center: [22.1987, 113.5439], zoom: 12, aliases: ['macau'] },
    '중국': { code: 'CN', name: '중국', nameEn: 'China', flag: '🇨🇳', currency: 'CNY', center: [35.8617, 104.1954], zoom: 5, aliases: ['china', '운남', '윈난'] },
    '몽골': { code: 'MN', name: '몽골', nameEn: 'Mongolia', flag: '🇲🇳', currency: 'MNT', center: [46.8625, 103.8467], zoom: 5, aliases: ['mongolia', 'mongol'] },
    '태국': { code: 'TH', name: '태국', nameEn: 'Thailand', flag: '🇹🇭', currency: 'THB', center: [15.8700, 100.9925], zoom: 6, aliases: ['thailand'] },
    '베트남': { code: 'VN', name: '베트남', nameEn: 'Vietnam', flag: '🇻🇳', currency: 'VND', center: [14.0583, 108.2772], zoom: 6, aliases: ['vietnam'] },
    '싱가포르': { code: 'SG', name: '싱가포르', nameEn: 'Singapore', flag: '🇸🇬', currency: 'SGD', center: [1.3521, 103.8198], zoom: 11, aliases: ['singapore'] },
    '인도네시아': { code: 'ID', name: '인도네시아', nameEn: 'Indonesia', flag: '🇮🇩', currency: 'IDR', center: [-0.7893, 113.9213], zoom: 5, aliases: ['indonesia', '발리'] },
    '필리핀': { code: 'PH', name: '필리핀', nameEn: 'Philippines', flag: '🇵🇭', currency: 'PHP', center: [12.8797, 121.7740], zoom: 6, aliases: ['philippines'] },
    '말레이시아': { code: 'MY', name: '말레이시아', nameEn: 'Malaysia', flag: '🇲🇾', currency: 'MYR', center: [4.2105, 101.9758], zoom: 6, aliases: ['malaysia'] },
    '라오스': { code: 'LA', name: '라오스', nameEn: 'Laos', flag: '🇱🇦', currency: 'LAK', center: [19.8563, 102.4955], zoom: 6, aliases: ['laos'] },
    '캄보디아': { code: 'KH', name: '캄보디아', nameEn: 'Cambodia', flag: '🇰🇭', currency: 'KHR', center: [12.5657, 104.9910], zoom: 7, aliases: ['cambodia'] },
    '인도': { code: 'IN', name: '인도', nameEn: 'India', flag: '🇮🇳', currency: 'INR', center: [20.5937, 78.9629], zoom: 5, aliases: ['india'] },
    '네팔': { code: 'NP', name: '네팔', nameEn: 'Nepal', flag: '🇳🇵', currency: 'NPR', center: [28.3949, 84.1240], zoom: 7, aliases: ['nepal'] },
    '몰디브': { code: 'MV', name: '몰디브', nameEn: 'Maldives', flag: '🇲🇻', currency: 'MVR', center: [3.2028, 73.2207], zoom: 7, aliases: ['maldives'] },
    '우즈베키스탄': { code: 'UZ', name: '우즈베키스탄', nameEn: 'Uzbekistan', flag: '🇺🇿', currency: 'UZS', center: [41.3775, 64.5853], zoom: 6, aliases: ['uzbekistan'] },
    '조지아': { code: 'GE', name: '조지아', nameEn: 'Georgia', flag: '🇬🇪', currency: 'GEL', center: [42.3154, 43.3569], zoom: 7, aliases: ['georgia', '그루지야'] },

    // 미주
    '미국': { code: 'US', name: '미국', nameEn: 'United States', flag: '🇺🇸', currency: 'USD', center: [37.0902, -95.7129], zoom: 4, aliases: ['usa', 'america', 'united states'] },
    '캐나다': { code: 'CA', name: '캐나다', nameEn: 'Canada', flag: '🇨🇦', currency: 'CAD', center: [56.1304, -106.3468], zoom: 4, aliases: ['canada'] },
    '멕시코': { code: 'MX', name: '멕시코', nameEn: 'Mexico', flag: '🇲🇽', currency: 'MXN', center: [23.6345, -102.5528], zoom: 5, aliases: ['mexico'] },
    '페루': { code: 'PE', name: '페루', nameEn: 'Peru', flag: '🇵🇪', currency: 'PEN', center: [-9.1900, -75.0152], zoom: 6, aliases: ['peru'] },
    '볼리비아': { code: 'BO', name: '볼리비아', nameEn: 'Bolivia', flag: '🇧🇴', currency: 'BOB', center: [-16.2902, -63.5887], zoom: 6, aliases: ['bolivia'] },
    '아르헨티나': { code: 'AR', name: '아르헨티나', nameEn: 'Argentina', flag: '🇦🇷', currency: 'ARS', center: [-38.4161, -63.6167], zoom: 4, aliases: ['argentina'] },
    '브라질': { code: 'BR', name: '브라질', nameEn: 'Brazil', flag: '🇧🇷', currency: 'BRL', center: [-14.2350, -51.9253], zoom: 4, aliases: ['brazil'] },
    '칠레': { code: 'CL', name: '칠레', nameEn: 'Chile', flag: '🇨🇱', currency: 'CLP', center: [-35.6751, -71.5430], zoom: 4, aliases: ['chile'] },

    // 대양주 & 아프리카/중동
    '호주': { code: 'AU', name: '호주', nameEn: 'Australia', flag: '🇦🇺', currency: 'AUD', center: [-25.2744, 133.7751], zoom: 4, aliases: ['australia', '오스트레일리아'] },
    '뉴질랜드': { code: 'NZ', name: '뉴질랜드', nameEn: 'New Zealand', flag: '🇳🇿', currency: 'NZD', center: [-40.9006, 174.8860], zoom: 5, aliases: ['new zealand'] },
    '괌': { code: 'GU', name: '괌', nameEn: 'Guam', flag: '🇬🇺', currency: 'USD', center: [13.4443, 144.7937], zoom: 10, aliases: ['guam'] },
    '사이판': { code: 'MP', name: '사이판', nameEn: 'Saipan', flag: '🇲🇵', currency: 'USD', center: [15.1900, 145.7467], zoom: 11, aliases: ['saipan'] },
    '아랍에미리트': { code: 'AE', name: '아랍에미리트', nameEn: 'United Arab Emirates', flag: '🇦🇪', currency: 'AED', center: [23.4241, 53.8478], zoom: 7, aliases: ['uae', '두바이', '아부다비'] },
    '이집트': { code: 'EG', name: '이집트', nameEn: 'Egypt', flag: '🇪🇬', currency: 'EGP', center: [26.8206, 30.8025], zoom: 6, aliases: ['egypt'] },
    '모로코': { code: 'MA', name: '모로코', nameEn: 'Morocco', flag: '🇲🇦', currency: 'MAD', center: [31.7917, -7.0926], zoom: 6, aliases: ['morocco'] }
  };

  // =========================================================================
  // 2. 글로벌 주요 도시 정밀 좌표 & 가이드 사전 (300+ 거점 및 스페인 전역)
  // =========================================================================
  const GLOBAL_CITY_DATA = {
    // --------------------------------------------------
    // [스페인 (Spain) 주요 도시 완비]
    // --------------------------------------------------
    '마드리드': {
      nameKo: '마드리드', nameEn: 'Madrid', country: '스페인', countryEn: 'Spain', flag: '🇪🇸', currency: 'EUR',
      lat: 40.4168, lng: -3.7038, zoom: 12, badge: '수도 & 왕실 문화',
      highlights: ['프라도 미술관 (세계 3대 미술관)', '마드리드 왕궁 & 사바티니 정원', '마요르 광장 & 솔 광장', '레티로 공원 & 크리스탈 궁전'],
      foods: ['산 히네스 츄러스 & 딥 초콜릿', '하몬 이베리코 데 베요타', '마드리드식 코시도(병아리콩 스튜)'],
      tips: '솔 광장 주변 소매치기 주의. 주요 미술관은 저녁 무료 입장 시간표를 확인하세요.',
      aliases: ['madrid']
    },
    '바르셀로나': {
      nameKo: '바르셀로나', nameEn: 'Barcelona', country: '스페인', countryEn: 'Spain', flag: '🇪🇸', currency: 'EUR',
      lat: 41.3874, lng: 2.1686, zoom: 12, badge: '가우디 건축의 성지',
      highlights: ['사그라다 파밀리아 성당', '구엘 공원 & 인체공학 벤치', '카사 바트요 & 카사 밀라', '보케리아 시장 & 람블라스 거리'],
      foods: ['해산물 빠에야 & 먹물 빠에야', '바르셀로네타 타파스 & 판 콘 토마테', '카탈루냐 스파클링 와인 카바(Cava)'],
      tips: '사그라다 파밀리아 및 구엘 공원은 최소 2주 전 공식 사이트 사전 예약이 필수입니다.',
      aliases: ['barcelona', '바르샤']
    },
    '톨레도': {
      nameKo: '톨레도', nameEn: 'Toledo', country: '스페인', countryEn: 'Spain', flag: '🇪🇸', currency: 'EUR',
      lat: 39.8628, lng: -4.0273, zoom: 13, badge: '유네스코 세계유산 중세 옛 수도',
      highlights: ['톨레도 대성당 (고딕 양식의 정수)', '알카사르 요새 (군사박물관)', '미라도르 델 바예 (파노라마 전경 명소)', '산토 토메 교회 (엘 그레코 걸작)'],
      foods: ['마자판 (Marzapán) 전통 아몬드 과자', '카스티야식 사슴/메추리 스튜', '만체고 치즈와 스페인 하몬'],
      tips: '중세 돌바닥과 언덕길이 많아 편안한 운동화 필수! 마드리드 아토차역에서 렌페(Renfe)로 약 30분 소요됩니다.',
      aliases: ['톨레토', 'toledo', '톨레도구시가지']
    },
    '세비야': {
      nameKo: '세비야', nameEn: 'Seville', country: '스페인', countryEn: 'Spain', flag: '🇪🇸', currency: 'EUR',
      lat: 37.3891, lng: -5.9845, zoom: 12, badge: '정열의 플라멩코 & 안달루시아',
      highlights: ['스페인 광장 (Plaza de España)', '세비야 대성당 & 히랄다 탑', '알카사르 궁전 (왕좌의 게임 촬영지)', '산타크루즈 유대인 지구'],
      foods: ['가스파초 (차가운 안달루시아 토마토 수프)', '소꼬리 찜 (Rabo de Toro)', '바삭한 오징어/대구 튀김 타파스'],
      tips: '여름철 한낮 기온이 40도에 육박하므로 시에스타(휴식) 시간을 갖고 해질녘 스페인 광장을 방문하세요.',
      aliases: ['세비아', 'seville', 'sevilla']
    },
    '그라나다': {
      nameKo: '그라나다', nameEn: 'Granada', country: '스페인', countryEn: 'Spain', flag: '🇪🇸', currency: 'EUR',
      lat: 37.1773, lng: -3.5986, zoom: 12, badge: '알함브라 궁전의 이슬람 유산',
      highlights: ['알함브라 궁전 (나스르 궁전 & 헤네랄리페)', '산 니콜라스 전망대 (알함브라 일몰 뷰)', '알바이신 지구 골목 산책', '사크로몬테 동굴 플라멩코'],
      foods: ['음료 주문 시 1잔당 1무료 타파스(그라나다 전통)', '피오노노(Pionono) 달콤한 디저트'],
      tips: '알함브라 나스르 궁전 입장권은 1~2개월 전 조기 매진되므로 반드시 사전 예약해야 합니다.',
      aliases: ['granada']
    },
    '론다': {
      nameKo: '론다', nameEn: 'Ronda', country: '스페인', countryEn: 'Spain', flag: '🇪🇸', currency: 'EUR',
      lat: 36.7462, lng: -5.1612, zoom: 13, badge: '절벽 협곡 위 신비의 도시',
      highlights: ['누에보 다리 (Puente Nuevo)', '론다 투우장 (스페인 최고(最古) 투우장)', '타호 협곡 전망대 (Mirador de Ronda)'],
      foods: ['안달루시아 붉은 와인', '이베리코 돼지 바비큐 스테이크'],
      tips: '누에보 다리 아래 뷰포인트로 내려가는 길은 가파르고 미끄러우니 미끄럼 방지 신발을 착용하세요.',
      aliases: ['ronda']
    },
    '발렌시아': {
      nameKo: '발렌시아', nameEn: 'Valencia', country: '스페인', countryEn: 'Spain', flag: '🇪🇸', currency: 'EUR',
      lat: 39.4699, lng: -0.3763, zoom: 12, badge: '원조 빠에야 & 예술과학도시',
      highlights: ['예술과 과학의 도시 (CAC)', '발렌시아 중앙시장', '투리아 정원', '말바로사 해변'],
      foods: ['원조 발렌시아식 토끼/닭고기 빠에야', '오르차타(Horchata) 시원한 음료와 파톤(Fartón)'],
      tips: '진짜 전통 빠에야는 해산물이 아닌 닭고기와 토끼고기, 콩을 넣어 만듭니다.',
      aliases: ['valencia']
    },
    '말라가': {
      nameKo: '말라가', nameEn: 'Malaga', country: '스페인', countryEn: 'Spain', flag: '🇪🇸', currency: 'EUR',
      lat: 36.7213, lng: -4.4214, zoom: 12, badge: '피카소의 고향 & 코스타 델 솔',
      highlights: ['피카소 생가 및 미술관', '알카사바 성채 & 히브랄파로 성', '말라게타 해변'],
      foods: ['에스페토 (모닥불에 구운 정어리 꼬치구이)', '말라가 달콤한 주정강화 와인'],
      tips: '해변가 노천 식당(치링기토)에서 신선한 정어리 꼬치구이를 즐겨보세요.',
      aliases: ['malaga']
    },
    '코르도바': {
      nameKo: '코르도바', nameEn: 'Cordoba', country: '스페인', countryEn: 'Spain', flag: '🇪🇸', currency: 'EUR',
      lat: 37.8882, lng: -4.7794, zoom: 13, badge: '메스키타 & 이슬람·가톨릭의 조화',
      highlights: ['메스키타 대성당 (850개 기둥 숲)', '유대인 지구 꽃길 (Calleja de las Flores)', '로마교'],
      foods: ['살모레호 (Salmorejo 걸쭉한 차가운 수프)', '플라멩킨 (하몬을 만 돼지고기 롤 튀김)'],
      tips: '메스키타는 아침 08:30~09:30 개방 시 무료 입장이 가능합니다.',
      aliases: ['cordoba']
    },
    '산세바스티안': {
      nameKo: '산세바스티안', nameEn: 'San Sebastian', country: '스페인', countryEn: 'Spain', flag: '🇪🇸', currency: 'EUR',
      lat: 43.3183, lng: -1.9812, zoom: 13, badge: '세계 미식의 수도 & 핀초스',
      highlights: ['라 콘차 해변 (조개 모양 만)', '구시가지 핀초스 바 골목', '우르굴 산 전망대'],
      foods: ['원조 바스크 치즈케이크 (La Viña)', '차콜리(Txakoli) 탄산 백포도주', '미슐랭 핀초스'],
      tips: '핀초스 바는 서서 2~3개씩 맛보고 다음 바로 이동하는 바 호핑(Bar Hopping)이 기본 매너입니다.',
      aliases: ['san sebastian', '도노스티아']
    },
    '세고비아': {
      nameKo: '세고비아', nameEn: 'Segovia', country: '스페인', countryEn: 'Spain', flag: '🇪🇸', currency: 'EUR',
      lat: 40.9429, lng: -4.1088, zoom: 13, badge: '로마 수도교 & 백설공주 성',
      highlights: ['로마 수도교 (Acueducto)', '세고비아 알카사르 (백설공주 성 모티브)', '세고비아 대성당'],
      foods: ['코치니요 아사도 (Cochinillo Asado 통 새끼돼지 구이)', '유디온(흰 강낭콩 스튜)'],
      tips: '마드리드 참베리/차마르틴역에서 고속열차(AVANT)로 약 28분이면 도착합니다.',
      aliases: ['segovia']
    },
    '이비자': {
      nameKo: '이비자', nameEn: 'Ibiza', country: '스페인', countryEn: 'Spain', flag: '🇪🇸', currency: 'EUR',
      lat: 38.9067, lng: 1.4206, zoom: 12, badge: '환상의 지중해 섬 & 일몰',
      highlights: ['달트 빌라 유네스코 구시가지', '칼라 콤테 에메랄드 비치', '카페 델 마르 선셋'],
      foods: ['신선한 지중해 해산물 구이', '불리트 데 페이시(생선 스튜)'],
      tips: '섬 내 대중교통이 제한적이므로 스쿠터나 렌터카 이용을 권장합니다.',
      aliases: ['ibiza', '이비사']
    },
    '마요르카': {
      nameKo: '마요르카', nameEn: 'Mallorca', country: '스페인', countryEn: 'Spain', flag: '🇪🇸', currency: 'EUR',
      lat: 39.6953, lng: 3.0176, zoom: 11, badge: '지중해의 낙원 & 쇼팽의 발자취',
      highlights: ['팔마 대성당', '발데모사 쇼팽 수도원', '소예르 목조 빈티지 트램', '칼로 데스 모로 해변'],
      foods: ['엔사이마다 (Ensaimada 나선형 전통 페이스트리)', '소브라사다(스프레드 소시지)'],
      tips: '팔마에서 소예르로 향하는 100년 된 목조 클래식 열차를 꼭 탑승해 보세요.',
      aliases: ['mallorca', '팔마']
    },

    // --------------------------------------------------
    // [유럽 기타 주요 도시]
    // --------------------------------------------------
    '파리': { nameKo: '파리', nameEn: 'Paris', country: '프랑스', countryEn: 'France', flag: '🇫🇷', currency: 'EUR', lat: 48.8566, lng: 2.3522, zoom: 12, badge: '예술과 낭만의 도시', highlights: ['에펠탑', '루브르 박물관', '오르세 미술관', '몽마르트르'], foods: ['크루아상', '바게트', '뵈프 부르기뇽'], tips: '메트로 소매치기 주의', aliases: ['paris'] },
    '니스': { nameKo: '니스', nameEn: 'Nice', country: '프랑스', countryEn: 'France', flag: '🇫🇷', currency: 'EUR', lat: 43.7102, lng: 7.2620, zoom: 12, badge: '코트다쥐르 해변', highlights: ['영국인 산책로', '니스 성채', '살레야 시장'], foods: ['니스식 샐러드', '소카(병아리콩 전)'], tips: '지중해 자외선 차단제 필수', aliases: ['nice'] },
    '런던': { nameKo: '런던', nameEn: 'London', country: '영국', countryEn: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', lat: 51.5074, lng: -0.1278, zoom: 12, badge: '역사와 현대의 융합', highlights: ['빅벤', '타워브릿지', '대영박물관', '버킹엄 궁전'], foods: ['피시앤칩스', '애프터눈 티', '선데이 로스트'], tips: '오이스터 카드 또는 컨택리스 카드 필수', aliases: ['london'] },
    '에든버러': { nameKo: '에든버러', nameEn: 'Edinburgh', country: '영국', countryEn: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', lat: 55.9533, lng: -3.1883, zoom: 12, badge: '스코틀랜드 고성', highlights: ['에든버러 성', '로열 마일', '아서스 시트'], foods: ['하기스', '스코틀랜드 싱글몰트 위스키'], tips: '바람막이 외투 지참 권장', aliases: ['edinburgh'] },
    '로마': { nameKo: '로마', nameEn: 'Rome', country: '이탈리아', countryEn: 'Italy', flag: '🇮🇹', currency: 'EUR', lat: 41.9028, lng: 12.4964, zoom: 12, badge: '영원의 도시 & 고대 제국', highlights: ['콜로세움', '바티칸 박물관', '트레비 분수', '판테온'], foods: ['정통 카르보나라', '젤라또', '로마식 피자'], tips: '바티칸 복장 규정(민소매/반바지 불가) 준수', aliases: ['rome', 'roma'] },
    '피렌체': { nameKo: '피렌체', nameEn: 'Florence', country: '이탈리아', countryEn: 'Italy', flag: '🇮🇹', currency: 'EUR', lat: 43.7696, lng: 11.2558, zoom: 13, badge: '르네상스의 발상지', highlights: ['두오모 성당', '우피치 미술관', '미켈란젤로 언덕', '베키오 다리'], foods: ['티본 스테이크(Bistecca alla Fiorentina)', '곱창버거(Lampredotto)'], tips: '두오모 쿠폴라 등반 사전 예약 필수', aliases: ['florence', 'firenze'] },
    '베네치아': { nameKo: '베네치아', nameEn: 'Venice', country: '이탈리아', countryEn: 'Italy', flag: '🇮🇹', currency: 'EUR', lat: 45.4408, lng: 12.3155, zoom: 13, badge: '물의 도시 & 곤돌라', highlights: ['산마르코 광장', '리알토 다리', '부라노 섬 알록달록 골목'], foods: ['치케티(베네치아식 타파스)', '먹물 파스타', '스프리츠(Spritz)'], tips: '캐리어 바퀴 소음 주의 및 수상버스 바포레토 이용', aliases: ['venice', 'venezia', '베니스'] },
    '밀라노': { nameKo: '밀라노', nameEn: 'Milan', country: '이탈리아', countryEn: 'Italy', flag: '🇮🇹', currency: 'EUR', lat: 45.4642, lng: 9.1900, zoom: 12, badge: '패션과 디자인의 중심', highlights: ['밀라노 두오모', '빅토리오 에마누엘레 2세 갤러리아', '최후의 만찬'], foods: ['샤프란 리조또(밀라노식)', '코톨레타(송아지 커틀릿)'], tips: '최후의 만찬 벽화 관람 3개월 전 사전 예약', aliases: ['milan', 'milano'] },
    '인터라켄': { nameKo: '인터라켄', nameEn: 'Interlaken', country: '스위스', countryEn: 'Switzerland', flag: '🇨🇭', currency: 'CHF', lat: 46.6863, lng: 7.8632, zoom: 12, badge: '알프스 융프라우의 관문', highlights: ['융프라우요흐', '하더 쿨름', '브리엔츠 호수 유람선'], foods: ['치즈 퐁뒤', '라클레트', '뢸스티'], tips: '날씨 웹캠 확인 후 산악 열차 탑승', aliases: ['interlaken'] },
    '취리히': { nameKo: '취리히', nameEn: 'Zurich', country: '스위스', countryEn: 'Switzerland', flag: '🇨🇭', currency: 'CHF', lat: 47.3769, lng: 8.5417, zoom: 12, badge: '스위스 최대 경제 문화 도시', highlights: ['취리히 호수', '반호프슈트라세', '그로스뮌스터'], foods: ['취리히식 송아지 고기 요리(Zürcher Geschnetzeltes)'], tips: '스위스 트래블 패스 활용', aliases: ['zurich'] },
    '리스본': { nameKo: '리스본', nameEn: 'Lisbon', country: '포르투갈', countryEn: 'Portugal', flag: '🇵🇹', currency: 'EUR', lat: 38.7223, lng: -9.1393, zoom: 12, badge: '노란 28번 트램 & 에그타르트', highlights: ['제로니무스 수도원', '벨렝탑', '산타 후스타 엘리베이터', '알파마 지구'], foods: ['파스텔 데 나타(원조 에그타르트)', '바칼라우(대구 요리)', '문어 밥'], tips: '가파른 오르막이 많으므로 편한 신발과 트램 이용', aliases: ['lisbon', 'lisboa'] },
    '포르투': { nameKo: '포르투', nameEn: 'Porto', country: '포르투갈', countryEn: 'Portugal', flag: '🇵🇹', currency: 'EUR', lat: 41.1579, lng: -8.6291, zoom: 13, badge: '도루 강변과 포트 와인', highlights: ['동 루이스 1세 다리', '렐루 서점', '상 벤투 기차역 아줄레주 타일'], foods: ['프란세지냐(칼로리 폭탄 샌드위치)', '포트 와인 시음'], tips: '동 루이스 다리 2층에서 일몰 감상', aliases: ['porto'] },
    '프라하': { nameKo: '프라하', nameEn: 'Prague', country: '체코', countryEn: 'Czech Republic', flag: '🇨🇿', currency: 'CZK', lat: 50.0755, lng: 14.4378, zoom: 12, badge: '백탑의 도시 & 보헤미아', highlights: ['카를교 일출/일몰', '프라하 성 & 성 비투스 대성당', '구시가 광장 천문시계'], foods: ['꼴레뇨(체코식 돼지무릎 구이)', '체코 필스너 우르켈 생맥주', '뜨르들로(굴뚝빵)'], tips: '환전소 바가지 주의, 카드 결제 권장', aliases: ['prague', 'praha'] },
    '비엔나': { nameKo: '비엔나', nameEn: 'Vienna', country: '오스트리아', countryEn: 'Austria', flag: '🇦🇹', currency: 'EUR', lat: 48.2082, lng: 16.3738, zoom: 12, badge: '음악과 황실 예술의 수도', highlights: ['쇤브룬 궁전', '벨베데레 궁전(클림트 키스)', '슈테판 대성당', '오페라 극장'], foods: ['비너 슈니첼(송아지 커틀릿)', '자허 토르테 & 아인슈페너'], tips: '클래식 음악회 티켓 사전 예매', aliases: ['vienna', 'wien', '빈'] },
    '부다페스트': { nameKo: '부다페스트', nameEn: 'Budapest', country: '헝가리', countryEn: 'Hungary', flag: '🇭🇺', currency: 'HUF', lat: 47.4979, lng: 19.0402, zoom: 12, badge: '다뉴브 강의 진주 & 야경', highlights: ['국회의사당 야경(유람선)', '어부의 요새', '세체니 온천', '부다 왕궁'], foods: ['굴라쉬(소고기 파프리카 스튜)', '토카이 와인'], tips: '다뉴브강 야경 유람선 1번 데크 명당', aliases: ['budapest'] },
    '두브로브니크': { nameKo: '두브로브니크', nameEn: 'Dubrovnik', country: '크로아티아', countryEn: 'Croatia', flag: '🇭🇷', currency: 'EUR', lat: 42.6507, lng: 18.0944, zoom: 13, badge: '아드리아해의 진주 & 성벽', highlights: ['두브로브니크 성벽 투어', '스르지산 전망대 케이블카', '로브리예나츠 요새'], foods: ['해산물 리조또', '오징어 구이', '달마티아 와인'], tips: '한여름 성벽 투어는 아침 8시 시작 추천', aliases: ['dubrovnik'] },

    // --------------------------------------------------
    // [동아시아 & 동남아시아 주요 도시]
    // --------------------------------------------------
    '도쿄': { nameKo: '도쿄', nameEn: 'Tokyo', country: '일본', countryEn: 'Japan', flag: '🇯🇵', currency: 'JPY', lat: 35.6762, lng: 139.6503, zoom: 12, badge: '메트로폴리스 도쿄', highlights: ['시부야 스카이', '신주쿠 교엔', '아사쿠사 센소지', '긴자'], foods: ['정통 스시', '라멘', '몬자야키', '와규 야키니쿠'], tips: '스이카(Suica) 교통카드 필수', aliases: ['tokyo'] },
    '오사카': { nameKo: '오사카', nameEn: 'Osaka', country: '일본', countryEn: 'Japan', flag: '🇯🇵', currency: 'JPY', lat: 34.6937, lng: 135.5023, zoom: 12, badge: '미식의 천국 간사이', highlights: ['도톤보리 글리코상', '오사카성', '유니버설 스튜디오 재팬'], foods: ['타코야키', '오코노미야키', '쿠시카츠'], tips: '주유패스 활용으로 명소 무료 입장', aliases: ['osaka'] },
    '교토': { nameKo: '교토', nameEn: 'Kyoto', country: '일본', countryEn: 'Japan', flag: '🇯🇵', currency: 'JPY', lat: 35.0116, lng: 135.7681, zoom: 12, badge: '천년 고도의 전통', highlights: ['후시미 이나리 신사(붉은 토리이)', '금각사', '청수사(기요미즈데라)', '아라시야마 대나무숲'], foods: ['가이세키 요리', '말차 디저트', '유두부 요리'], tips: '아침 일찍 방문해야 인파를 피할 수 있습니다.', aliases: ['kyoto'] },
    '후쿠오카': { nameKo: '후쿠오카', nameEn: 'Fukuoka', country: '일본', countryEn: 'Japan', flag: '🇯🇵', currency: 'JPY', lat: 33.5904, lng: 130.4017, zoom: 12, badge: '하카타 미식과 쇼핑', highlights: ['오호리 공원', '캐널시티 하카타', '다자이후 텐만구'], foods: ['하카타 돈코츠 라멘', '모츠나베(곱창전골)', '명란 바게트'], tips: '시내 중심가와 공항이 지하철 10분 거리', aliases: ['fukuoka'] },
    '타이베이': { nameKo: '타이베이', nameEn: 'Taipei', country: '대만', countryEn: 'Taiwan', flag: '🇹🇼', currency: 'TWD', lat: 25.0330, lng: 121.5654, zoom: 12, badge: '야시장 미식의 천국', highlights: ['타이베이 101', '스린 야시장', '국립고궁박물원', '지우펀 홍등 거리'], foods: ['우육면', '샤오롱바오(딘타이펑)', '망고 빙수', '버블티'], tips: '이지카드(EasyCard) 필수', aliases: ['taipei', '타이페이'] },
    '방콕': { nameKo: '방콕', nameEn: 'Bangkok', country: '태국', countryEn: 'Thailand', flag: '🇹🇭', currency: 'THB', lat: 13.7563, lng: 100.5018, zoom: 12, badge: '천사의 도시 & 미식', highlights: ['왓 아룬(새벽 사원)', '방콕 왕궁', '아이콘시암', '짜뚜짝 주말시장'], foods: ['똠얌꿍', '팟타이', '푸팟퐁커리', '망고스티키라이스'], tips: '왕궁 입장 시 민소매 및 반바지 착용 금지', aliases: ['bangkok'] },
    '다낭': { nameKo: '다낭', nameEn: 'Da Nang', country: '베트남', countryEn: 'Vietnam', flag: '🇻🇳', currency: 'VND', lat: 16.0544, lng: 108.2022, zoom: 12, badge: '휴양과 유네스코의 조화', highlights: ['미케 비치', '바나힐 골든 브릿지', '오행산', '호이안 구시가지'], foods: ['반미 샌드위치', '쌀국수(포)', '코코넛 커피', '분짜'], tips: '그랩(Grab) 앱 활용 이동 권장', aliases: ['da nang', 'danang'] },
    '싱가포르': { nameKo: '싱가포르', nameEn: 'Singapore', country: '싱가포르', countryEn: 'Singapore', flag: '🇸🇬', currency: 'SGD', lat: 1.3521, lng: 103.8198, zoom: 12, badge: '가든스 바이 더 베이', highlights: ['마리나 베이 샌즈', '가든스 바이 더 베이', '센토사 섬', '차이나타운'], foods: ['칠리 크랩', '하이난 치킨라이스', '카야 토스트', '바쿠테'], tips: '껌 반입 및 길거리 쓰레기 투기 엄격 처벌', aliases: ['singapore'] },
    '발리': { nameKo: '발리', nameEn: 'Bali', country: '인도네시아', countryEn: 'Indonesia', flag: '🇮🇩', currency: 'IDR', lat: -8.4095, lng: 115.1889, zoom: 10, badge: '신들의 섬 & 힐링 휴양', highlights: ['우붓 계단식 논 테라스', '울루와투 절벽 사원', '스미냑 비치클럽', '바투르 화산'], foods: ['나시고랭', '미고랭', '바비굴링(새끼돼지 통구이)'], tips: '사원 방문 시 사롱(허리 두르는 천) 착용', aliases: ['bali'] },

    // --------------------------------------------------
    // [미주 및 대양주 주요 도시]
    // --------------------------------------------------
    '뉴욕': { nameKo: '뉴욕', nameEn: 'New York', country: '미국', countryEn: 'United States', flag: '🇺🇸', currency: 'USD', lat: 40.7128, lng: -74.0060, zoom: 11, badge: '세계의 중심 & 브로드웨이', highlights: ['자유의 여신상', '센트럴 파크', '타임스퀘어', '엠파이어 스테이트 빌딩'], foods: ['뉴욕 베이글 & 크림치즈', '뉴욕 피자', '쉑쉑 버거 본점'], tips: '메트로카드 또는 OMNY 비접촉 결제', aliases: ['new york', 'nyc'] },
    '로스앤젤레스': { nameKo: '로스앤젤레스', nameEn: 'Los Angeles', country: '미국', countryEn: 'United States', flag: '🇺🇸', currency: 'USD', lat: 34.0522, lng: -118.2437, zoom: 11, badge: '할리우드 & 라라랜드', highlights: ['산타모니카 피어', '그리피스 천문대', '할리우드 명예의 거리', '게티 센터'], foods: ['인앤아웃(In-N-Out) 더블더블', '북창동 순두부 본점', '타코'], tips: 'LAX-it 구역에서 우버/리프트 탑승', aliases: ['la', 'los angeles'] },
    '시드니': { nameKo: '시드니', nameEn: 'Sydney', country: '호주', countryEn: 'Australia', flag: '🇦🇺', currency: 'AUD', lat: -33.8688, lng: 151.2093, zoom: 11, badge: '오페라 하우스 & 하버', highlights: ['시드니 오페라 하우스', '하버 브릿지', '본다이 비치', '블루 마운틴'], foods: ['호주 청정우 스테이크', '미트 파이', '플랫 화이트 커피'], tips: '오팔(Opal) 카드 또는 컨택리스 신용카드 결제', aliases: ['sydney'] }
  };

  // =========================================================================
  // 3. 지오코딩 및 도시/국가 지리 정보 해석 헬퍼 함수
  // =========================================================================

  /**
   * 문자열 정제 (Day 번호, 계획/투어, 괄호, 화살표 등 제거)
   */
  function cleanCityQuery(raw) {
    if (!raw || typeof raw !== 'string') return '';
    return raw
      .replace(/Day\s*\d+/gi, '')
      .replace(/계획|일정|투어|탐방|코스/g, '')
      .replace(/\(.*?\)/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/[➔→⇄\-]/g, ' ')
      .trim();
  }

  /**
   * 국가명 또는 질의어를 정규 국가 정보로 해석
   */
  function resolveCountryGeo(query) {
    if (!query || typeof query !== 'string') return null;
    const cleanQ = query.trim().toLowerCase();

    // 1. 직접 매칭 (한글 키)
    if (GLOBAL_COUNTRY_DATA[query.trim()]) {
      return GLOBAL_COUNTRY_DATA[query.trim()];
    }

    // 2. 소문자 영문/별칭 매칭
    for (const key of Object.keys(GLOBAL_COUNTRY_DATA)) {
      const country = GLOBAL_COUNTRY_DATA[key];
      if (country.name.toLowerCase() === cleanQ ||
          country.nameEn.toLowerCase() === cleanQ ||
          (country.aliases && country.aliases.some(a => a.toLowerCase() === cleanQ))) {
        return country;
      }
    }

    // 3. 포함 관계 매칭
    for (const key of Object.keys(GLOBAL_COUNTRY_DATA)) {
      const country = GLOBAL_COUNTRY_DATA[key];
      if (cleanQ.includes(country.name.toLowerCase()) || 
          country.name.toLowerCase().includes(cleanQ)) {
        return country;
      }
    }

    return null;
  }

  /**
   * 도시 및 거점의 지오코딩 정밀 좌표 해석
   * @param {string} cityQuery - 도시명 (예: '톨레토', '톨레도', 'Madrid', '세비야')
   * @param {string} [countryHint] - 소속 국가명 힌트 (예: '스페인', 'Spain')
   * @returns {Object} 해석된 거점 정보 객체
   */
  function resolveDestinationGeo(cityQuery, countryHint) {
    const raw = cleanCityQuery(cityQuery);
    const qLower = raw.toLowerCase();
    const cHintResolved = countryHint ? resolveCountryGeo(countryHint) : null;

    // 1. 도시 데이터베이스 직접 매칭
    if (GLOBAL_CITY_DATA[raw]) {
      return formatDestRecord(GLOBAL_CITY_DATA[raw]);
    }

    // 2. 도시 별칭 및 영문명 순회 매칭 (국가 힌트가 있으면 해당 국가 도시 우선)
    const candidates = [];
    for (const key of Object.keys(GLOBAL_CITY_DATA)) {
      const city = GLOBAL_CITY_DATA[key];
      let matches = false;

      if (city.nameKo.toLowerCase() === qLower || city.nameEn.toLowerCase() === qLower) {
        matches = true;
      } else if (city.aliases && city.aliases.some(a => a.toLowerCase() === qLower)) {
        matches = true;
      } else if (raw.includes(city.nameKo) || city.nameKo.includes(raw)) {
        matches = true;
      }

      if (matches) {
        // 국가 힌트 일치 시 가중치
        if (cHintResolved && (city.country === cHintResolved.name || city.countryEn === cHintResolved.nameEn)) {
          return formatDestRecord(city);
        }
        candidates.push(city);
      }
    }

    if (candidates.length > 0) {
      return formatDestRecord(candidates[0]);
    }

    // 3. 도시명이 국가명 자체인 경우 (예: 도시 목록에 '스페인' 입력)
    const directCountry = resolveCountryGeo(raw);
    if (directCountry) {
      return {
        id: 'country_' + directCountry.code.toLowerCase(),
        name: `${directCountry.name} 전역`,
        nameKo: directCountry.name,
        nameEn: directCountry.nameEn,
        country: directCountry.name,
        countryEn: directCountry.nameEn,
        flag: directCountry.flag,
        currency: directCountry.currency,
        lat: directCountry.center[0],
        lng: directCountry.center[1],
        zoom: directCountry.zoom || 6,
        badge: '국가 거점',
        googleMapsQuery: `${directCountry.nameEn || directCountry.name}`,
        highlights: [`${directCountry.name} 주요 랜드마크 탐방`, '현지 로컬 문화 체험'],
        foods: ['현지 전통 시그니처 미식'],
        tips: '현지 통화와 기본 에티켓을 미리 숙지하세요.'
      };
    }

    // 4. 데이터베이스 미등록 도시: 국가 힌트를 기반으로 안전 중심 좌표 및 국가 한정 쿼리 생성
    const fallbackCountry = cHintResolved || resolveCountryGeo('대한민국');
    const countryName = fallbackCountry ? fallbackCountry.name : '해외';
    const countryEn = fallbackCountry ? fallbackCountry.nameEn : '';
    const flag = fallbackCountry ? fallbackCountry.flag : '📍';
    const currency = fallbackCountry ? fallbackCountry.currency : 'KRW';
    const center = fallbackCountry ? fallbackCountry.center : [37.5665, 126.9780];

    return {
      id: 'custom_' + raw,
      name: raw,
      nameKo: raw,
      nameEn: raw,
      country: countryName,
      countryEn: countryEn,
      flag: flag,
      currency: currency,
      lat: center[0],
      lng: center[1],
      zoom: 11,
      badge: `${countryName} 방문 거점`,
      // ★ 핵심: 도시명 뒤에 반드시 국가명을 붙여 구글 지도가 한국 내 음식점을 찾는 참사 원천 차단!
      googleMapsQuery: countryEn ? `${raw}, ${countryEn}` : `${raw}, ${countryName}`,
      highlights: [`${raw} 명소 탐방`, `${raw} 주변 산책`],
      foods: ['현지 로컬 맛집 탐방'],
      tips: '안전 수칙을 준수하고 구글 지도 길찾기를 활용하세요.'
    };
  }

  function formatDestRecord(record) {
    const countryEn = record.countryEn || record.country;
    return {
      id: record.nameEn ? record.nameEn.toLowerCase().replace(/\s+/g, '_') : 'dest_' + record.nameKo,
      name: record.nameKo,
      nameKo: record.nameKo,
      nameEn: record.nameEn,
      country: record.country,
      countryEn: record.countryEn,
      flag: record.flag || '📍',
      currency: record.currency || 'KRW',
      lat: record.lat,
      lng: record.lng,
      zoom: record.zoom || 12,
      altitude: record.altitude || (record.badge ? record.badge : '평지'),
      badge: record.badge || '방문 거점',
      intro: record.highlights ? record.highlights.join(' · ') : `${record.nameKo} 주요 명소`,
      // 구글 지도 검색에 영문/국문 국가명을 명시하여 해외 도시를 정확히 타게팅
      googleMapsQuery: `${record.nameEn || record.nameKo}, ${countryEn}`,
      highlights: record.highlights || [`${record.nameKo} 시내 랜드마크`],
      foods: record.foods || ['현지 로컬 미식'],
      food: record.foods ? record.foods.join(', ') : '로컬 시그니처 미식',
      tips: record.tips || '안전 수칙 및 소매치기 주의'
    };
  }

  // =========================================================================
  // 4. 범용 목적지 지식 팩 (DefaultDestinationPack) 구현체
  // =========================================================================
  const DefaultDestinationPack = {
    id: 'pack_generic_default',
    name: '전 세계 범용 여행 팩',

    createDynamicPack(trip) {
      const tripTitle = trip ? trip.title : '자유 여행';
      const rawCountries = (trip && trip.countries && trip.countries.length > 0) ? trip.countries : [];
      const rawCities = (trip && trip.cities && trip.cities.length > 0) ? trip.cities : [];

      // 1. 대표 국가 및 통화 정밀 자동 판별
      let primaryCountry = null;
      for (const cName of rawCountries) {
        primaryCountry = resolveCountryGeo(cName);
        if (primaryCountry) break;
      }
      if (!primaryCountry && rawCities.length > 0) {
        // 첫 번째 도시로 국가 역추적
        const firstCityGeo = resolveDestinationGeo(rawCities[0]);
        if (firstCityGeo && firstCityGeo.country) {
          primaryCountry = resolveCountryGeo(firstCityGeo.country);
        }
      }
      if (!primaryCountry && tripTitle) {
        primaryCountry = resolveCountryGeo(tripTitle);
      }

      // 통화 결정 규칙: 사용자가 명시적으로 KRW 외 통화를 설정했다면 보존, 
      // 해외 여행인데 KRW로 되어 있거나 미설정된 경우 해당 국가 공식 통화(EUR, JPY 등) 자동 부여
      let resolvedCurrency = 'KRW';
      if (trip && trip.currency && trip.currency !== 'KRW') {
        resolvedCurrency = trip.currency;
      } else if (primaryCountry && primaryCountry.currency) {
        resolvedCurrency = primaryCountry.currency;
      }

      const countryFlag = primaryCountry ? primaryCountry.flag : (trip && trip.coverEmoji ? trip.coverEmoji : '✈️');
      const countryDisplayName = (rawCountries.length > 0) ? rawCountries.join(', ') : (primaryCountry ? primaryCountry.name : '글로벌 여행지');

      // 2. 여행에 등록된 도시 정밀 지오코딩 및 마커 데이터 구축
      const countryHint = primaryCountry ? primaryCountry.name : (rawCountries[0] || '');
      const uniqueCityNames = [];
      rawCities.forEach(c => {
        const cleaned = cleanCityQuery(c);
        if (cleaned && !uniqueCityNames.includes(cleaned)) uniqueCityNames.push(cleaned);
      });

      // 만약 cities가 비어있다면 trip.days에서 추출
      if (uniqueCityNames.length === 0 && trip && Array.isArray(trip.days)) {
        trip.days.forEach(d => {
          const c = cleanCityQuery(d.city || d.cityName || (d.title ? d.title.split(' ')[0] : ''));
          if (c && !uniqueCityNames.includes(c) && c !== '현지' && c !== '자유') uniqueCityNames.push(c);
        });
      }

      // 도시가 하나도 없으면 대표 국가 중심 거점 생성
      if (uniqueCityNames.length === 0) {
        uniqueCityNames.push(primaryCountry ? primaryCountry.name : '여행 거점');
      }

      // 각 도시 지오코딩 해석
      const destinations = uniqueCityNames.map((c, idx) => {
        const geo = resolveDestinationGeo(c, countryHint);
        // 미등록 소도시들의 좌표가 국가 중심에 완전히 겹치는 것을 방지하기 위해 미세 분산
        if (primaryCountry && Math.abs(geo.lat - primaryCountry.center[0]) < 0.001 && Math.abs(geo.lng - primaryCountry.center[1]) < 0.001) {
          geo.lat += (idx * 0.035);
          geo.lng += (idx * 0.035);
        }
        return geo;
      });

      // 3. 비행/이동 궤적 폴리라인 좌표열 (flightRoutes) 자동 연결
      const validDests = destinations.filter(d => typeof d.lat === 'number' && typeof d.lng === 'number' && !(d.lat === 20.0 && d.lng === 0.0));
      const flightRoutes = validDests.length > 1 ? validDests.map(d => [d.lat, d.lng]) : [];

      // 4. 지도 카메라 중심 좌표 (centerCoord) & 초기 줌 레벨 (defaultZoom) 계산
      let centerCoord = [20.0, 0.0];
      let defaultZoom = 2;

      if (validDests.length > 0) {
        const lats = validDests.map(d => d.lat);
        const lngs = validDests.map(d => d.lng);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        centerCoord = [(minLat + maxLat) / 2, (minLng + maxLng) / 2];

        const span = Math.max(maxLat - minLat, maxLng - minLng);
        if (validDests.length === 1) {
          defaultZoom = validDests[0].zoom || 12;
        } else if (span < 1.0) {
          defaultZoom = 10;
        } else if (span < 3.5) {
          defaultZoom = 8;
        } else if (span < 8.0) {
          defaultZoom = 6;
        } else if (span < 20.0) {
          defaultZoom = 5;
        } else {
          defaultZoom = 4;
        }
      } else if (primaryCountry && primaryCountry.center) {
        centerCoord = primaryCountry.center;
        defaultZoom = primaryCountry.zoom || 6;
      }

      // 5. 모의 GPS 프리셋: 실제 현지 거점 좌표 할당
      const simPresets = validDests.map((d, idx) => ({
        id: `preset_${d.id || idx}`,
        name: `📍 ${d.nameKo || d.name} 중심부`,
        lat: d.lat,
        lng: d.lng,
        tip: `${d.nameKo || d.name} (${d.country || ''}) 주요 여행 동선 거점`
      }));

      // 6. 상세 도시 가이드 및 스팟 목록 구성
      const cityGuides = destinations.map(d => ({
        id: 'guide_' + d.id,
        name: d.nameKo,
        badge: d.badge || '방문 도시',
        title: `${d.nameKo} 핵심 일정 및 랜드마크`,
        desc: `${d.country} ${d.nameKo}의 아름다운 경관과 명소를 탐방하고 현지 문화를 만끽해 보세요.`,
        highlights: d.highlights || ['주요 랜드마크 탐방', '현지 로컬 명소'],
        food: d.food || (d.foods ? d.foods.join(', ') : '현지 시그니처 미식'),
        caution: d.tips || '소매치기 주의 및 귀중품 안전 보관'
      }));

      // 7. 여행 일정의 기존 스팟 추출
      const spots = [];
      if (trip && Array.isArray(trip.days)) {
        trip.days.forEach(day => {
          (day.spots || []).forEach(s => {
            if (s.title && s.title !== '새 일정') {
              spots.push({
                id: 'spot_' + Math.random().toString(36).substr(2, 9),
                name: s.title,
                city: day.city || destinations[0].nameKo || '현지',
                lat: s.lat || destinations[0].lat,
                lng: s.lng || destinations[0].lng,
                cat: s.cat || 'tour',
                icon: s.typeIcon || '📍',
                flag: s.typeIcon || countryFlag,
                desc: s.desc || '',
                tip: s.tip || ''
              });
            }
          });
        });
      }

      return {
        id: 'dynamic_' + (trip ? trip.id : 'unknown'),
        name: tripTitle,
        country: countryDisplayName,
        flag: countryFlag,
        currency: resolvedCurrency,
        match: () => true, // Fallback for all custom trips
        geo: {
          centerCoord: centerCoord,
          defaultZoom: defaultZoom,
          simPresets: simPresets,
          knownSpots: spots,
          destinations: destinations,
          flightRoutes: flightRoutes,
          initialFocusCity: destinations[0] ? destinations[0].id : null
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
            { tier: 'A', tierName: '권장', name: `여행자 보험 가입 & 해외 결제 카드 (${resolvedCurrency})`, target: '출국 전', deadline: '출발 3일 전', desc: '트래블로그/월렛 해외 결제 수수료 면제 카드 및 비상 현금 준비', tip: '카드 분실 대비 해외 결제 원화 차단 확인', url: '#' }
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

  // 전역 지오코딩 엔진 및 기본 팩 노출
  window.GLOBAL_COUNTRY_DATA = GLOBAL_COUNTRY_DATA;
  window.GLOBAL_CITY_DATA = GLOBAL_CITY_DATA;
  window.SulsulGeo = {
    GLOBAL_COUNTRY_DATA,
    GLOBAL_CITY_DATA,
    resolveCountryGeo,
    resolveDestinationGeo,
    cleanCityQuery
  };

  if (window.DestinationRegistry) {
    window.DestinationRegistry.setDefaultPack(DefaultDestinationPack);
  }
  window.DefaultDestinationPack = DefaultDestinationPack;
})();
