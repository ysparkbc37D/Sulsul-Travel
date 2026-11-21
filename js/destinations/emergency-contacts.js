/* 국가별 긴급 전화. DOM·저장소에 의존하지 않는다.
 * 출처: 위키백과 영문 "List of emergency telephone numbers" 2026-10-16 판(oldid 1380606668), 2026-11-21 대조.
 * 대한민국은 국내 공통 안내(112·119)를 따른다. 확인하지 못한 국가는 번호를 추정하지 않는다. */
(function (root) {
  'use strict';
  const SOURCE = Object.freeze({
    label: '위키백과 긴급전화 목록 2026-10-16 판',
    url: 'https://en.wikipedia.org/wiki/List_of_emergency_telephone_numbers',
    checkedAt: '2026-11-21',
    advice: '출발 전 외교부 해외안전여행(0404.go.kr)의 국가별 안내로 다시 확인하세요.'
  });
  const CONSULAR = Object.freeze({ name: '외교부 영사콜센터 (24시간)', tel: '+82232100404', display: '+82-2-3210-0404' });
  // police·ambulance는 바로 거는 카드, fire·general·extra는 보조 번호다. 한 번호로 모두 받는 나라는 같은 번호를 둔다.
  const DATA = Object.freeze({
    KR: { name: '대한민국', lang: 'ko', police: '112', ambulance: '119', fire: '119', note: '국내 공통: 경찰 112, 소방·구급 119.' },
    CN: { name: '중국', lang: 'zh', police: '110', ambulance: '120', fire: '119', note: '구급은 120, 소방은 119입니다.' },
    TW: { name: '대만', lang: 'zh', police: '110', ambulance: '119', fire: '119', note: '휴대전화 112도 연결됩니다.' },
    HK: { name: '홍콩', lang: 'zh', police: '999', ambulance: '999', fire: '999', note: '휴대전화 112도 999로 연결됩니다.' },
    MO: { name: '마카오', lang: 'zh', police: '999', ambulance: '999', fire: '999', note: '휴대전화 110·112도 999로 연결됩니다.' },
    JP: { name: '일본', lang: 'ja', police: '110', ambulance: '119', fire: '119', note: '휴대전화 112·911은 110으로 연결됩니다.' },
    TH: { name: '태국', lang: 'th', police: '191', ambulance: '1669', fire: '199', extra: [{ label: '관광경찰', tel: '1155' }], note: '방콕 구급은 1646도 사용합니다.' },
    VN: { name: '베트남', lang: 'vi', police: '113', ambulance: '115', fire: '114', general: '112', note: '112는 인명 구조 번호입니다.' },
    PH: { name: '필리핀', lang: 'en', police: '911', ambulance: '911', fire: '911', note: '휴대전화 112도 사용합니다.' },
    SG: { name: '싱가포르', lang: 'en', police: '999', ambulance: '995', fire: '995', note: '휴대전화 112·911도 사용합니다.' },
    MY: { name: '말레이시아', lang: 'en', police: '999', ambulance: '999', fire: '999', note: '휴대전화 112도 사용합니다.' },
    ID: { name: '인도네시아', lang: 'en', police: '110', ambulance: '118', fire: '113', general: '112', note: '구급은 118 또는 119입니다.' },
    LA: { name: '라오스', lang: 'en', police: '191', ambulance: '195', fire: '190' },
    KH: { name: '캄보디아', lang: 'en', police: '117', ambulance: '119', fire: '118' },
    MN: { name: '몽골', lang: 'en', police: '102', ambulance: '103', fire: '101' },
    ES: { name: '스페인', lang: 'es', police: '112', ambulance: '112', fire: '112', general: '112', extra: [{ label: '국가경찰', tel: '091' }], note: '112로 모든 긴급 서비스에 연결됩니다.' },
    FR: { name: '프랑스', lang: 'fr', police: '17', ambulance: '15', fire: '18', general: '112', note: '경찰 17, 응급의료(SAMU) 15, 소방 18, 공통 112.' },
    IT: { name: '이탈리아', lang: 'en', police: '112', ambulance: '112', fire: '112', note: '112로 연결됩니다.' },
    DE: { name: '독일', lang: 'en', police: '110', ambulance: '112', fire: '112', note: '112로 경찰도 연결됩니다.' },
    GB: { name: '영국', lang: 'en', police: '999', ambulance: '999', fire: '999', general: '112', note: '999 또는 112.' },
    PT: { name: '포르투갈', lang: 'en', police: '112', ambulance: '112', fire: '112' },
    CH: { name: '스위스', lang: 'en', police: '117', ambulance: '144', fire: '118', note: '112는 주(칸톤)마다 연결 방식이 다릅니다.' },
    TR: { name: '튀르키예', lang: 'en', police: '112', ambulance: '112', fire: '112', note: '911도 112로 연결됩니다.' },
    GR: { name: '그리스', lang: 'en', police: '100', ambulance: '166', fire: '199', general: '112' },
    CZ: { name: '체코', lang: 'en', police: '158', ambulance: '155', fire: '150', general: '112' },
    US: { name: '미국', lang: 'en', police: '911', ambulance: '911', fire: '911' },
    CA: { name: '캐나다', lang: 'en', police: '911', ambulance: '911', fire: '911' },
    MX: { name: '멕시코', lang: 'es', police: '911', ambulance: '911', fire: '911' },
    PE: { name: '페루', lang: 'es', police: '105', ambulance: '106', fire: '116', general: '911', note: '응급의료(SAMU) 106, 소방 116.' },
    CL: { name: '칠레', lang: 'es', police: '133', ambulance: '131', fire: '132', note: '911·112는 경찰 133으로 연결됩니다.' },
    AR: { name: '아르헨티나', lang: 'es', police: '101', ambulance: '107', fire: '100', general: '911', note: '휴대전화 112는 911로 연결됩니다.' },
    BO: { name: '볼리비아', lang: 'es', police: '110', ambulance: '118', fire: '119', general: '911' },
    BR: { name: '브라질', lang: 'en', police: '190', ambulance: '192', fire: '193', note: '휴대전화 112·911은 190으로 연결됩니다.' },
    AU: { name: '호주', lang: 'en', police: '000', ambulance: '000', fire: '000', note: '휴대전화 112도 사용합니다.' },
    NZ: { name: '뉴질랜드', lang: 'en', police: '111', ambulance: '111', fire: '111', note: '휴대전화 112·911은 111로 연결됩니다.' }
  });

  function codeOf(value, lookup) {
    if (typeof value !== 'string' || !value.trim()) return null;
    const direct = value.trim().toUpperCase();
    if (DATA[direct]) return direct;
    let found = null;
    try { found = typeof lookup === 'function' ? lookup(value) : null; } catch (_) { found = null; }
    const code = found?.country?.code || found?.code || null;
    return code && DATA[code] ? code : null;
  }

  // 그날 도시로 국가를 정한다. 여행 국가 목록과 어긋나거나 여러 나라 중 정할 수 없으면 추정하지 않는다.
  function resolve(trip, dayIndex, lookup) {
    const day = Array.isArray(trip?.days) ? trip.days[dayIndex] : null;
    const tripCodes = [...new Set((Array.isArray(trip?.countries) ? trip.countries : []).map(value => codeOf(value, lookup)).filter(Boolean))];
    for (const value of [day?.countryCode, day?.country, day?.city]) {
      const code = codeOf(value, lookup);
      if (code && (!tripCodes.length || tripCodes.includes(code))) return { code, basis: 'day', candidates: tripCodes };
    }
    if (tripCodes.length === 1) return { code: tripCodes[0], basis: 'trip', candidates: tripCodes };
    return { code: null, basis: tripCodes.length > 1 ? 'ambiguous' : 'unknown', candidates: tripCodes };
  }

  function contacts(code) {
    const entry = DATA[code];
    if (!entry) return null;
    const lines = [{ kind: 'police', label: entry.police === entry.ambulance ? '경찰·구급' : '경찰', tel: entry.police }];
    if (entry.ambulance !== entry.police) lines.push({ kind: 'ambulance', label: '구급·응급', tel: entry.ambulance });
    if (entry.fire && entry.fire !== entry.police && entry.fire !== entry.ambulance) lines.push({ kind: 'fire', label: '소방', tel: entry.fire });
    if (entry.general && ![entry.police, entry.ambulance, entry.fire].includes(entry.general)) lines.push({ kind: 'general', label: '공통 긴급', tel: entry.general });
    (entry.extra || []).forEach(item => lines.push({ kind: 'extra', label: item.label, tel: item.tel }));
    return { code, ...entry, lines };
  }

  const api = { DATA, SOURCE, CONSULAR, resolve, contacts, codeOf };
  root.SulsulTravel = root.SulsulTravel || {};
  root.SulsulTravel.EmergencyContacts = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
