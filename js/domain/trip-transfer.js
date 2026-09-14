/* 링크/파일 송수신이 공유하는 버전별 사본 계약. DOM과 저장소에 의존하지 않는다. */
(function (root) {
  'use strict';
  const MAX_BYTES = 20 * 1024 * 1024;
  const PLAN_FIELDS = ['id','title','subtitle','style','startDate','endDate','durationDays','arrivalTime','departureTime','currency','budget','countries','cities','coverEmoji','concepts','wishlist','hubAllocations','planSource','isBucketlist','status','days','planBlockMeta','checklist','timeZone'];
  const MONEY_FIELDS = ['expenses','exchanges','activeCurrencies','initialBalances','wallets'];
  const clone = value => JSON.parse(JSON.stringify(value));
  function safePhoto(value) {
    if (typeof value !== 'string') return '';
    if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=\s]+$/.test(value)) return value;
    try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; } catch (_) { return ''; }
  }
  function validateTrip(trip) {
    if (!trip || typeof trip !== 'object' || Array.isArray(trip) || typeof trip.title !== 'string' || !trip.title.trim() || !Array.isArray(trip.days) || trip.days.length > 730) throw new Error('여행 제목과 일정 형식을 확인해 주세요.');
    const walk = (value, depth = 0) => {
      if (depth > 20) throw new Error('데이터 구조가 너무 깊습니다.');
      if (typeof value === 'string' && /<\s*[!/?a-z]/i.test(value)) throw new Error('HTML이 포함된 여행 데이터는 가져올 수 없습니다. 텍스트로 수정해 주세요.');
      if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) {
        if (['__proto__','prototype','constructor'].includes(key)) throw new Error('지원하지 않는 데이터 필드입니다.');
        walk(item, depth + 1);
      }
    };
    walk(trip);
    for (const day of trip.days) {
      if (!day || typeof day !== 'object' || !Array.isArray(day.spots) || day.spots.length > 500) throw new Error('일별 일정 형식이 올바르지 않습니다.');
      if (day.spots.some(s => !s || typeof s !== 'object' || typeof s.title !== 'string')) throw new Error('장소 이름을 확인해 주세요.');
    }
    for (const key of ['countries','cities','concepts','checklist','expenses','exchanges','activeCurrencies']) {
      if (trip[key] != null && !Array.isArray(trip[key])) throw new Error(`${key} 형식이 올바르지 않습니다.`);
    }
    for (const key of ['journals','activityRecords','planBlockMeta','initialBalances']) {
      if (trip[key] != null && (typeof trip[key] !== 'object' || Array.isArray(trip[key]))) throw new Error(`${key} 형식이 올바르지 않습니다.`);
    }
    for (const [id,record] of Object.entries(trip.activityRecords || {})) {
      if (!record || record.id !== id || !record.context || typeof record.context !== 'object' || typeof record.context.title !== 'string' || !Array.isArray(record.photos) || record.photos.length > 8 || !Number.isInteger(record.coverIndex) || record.coverIndex < 0 || record.coverIndex >= Math.max(1,record.photos.length)) throw new Error('일정 기록 형식이 올바르지 않습니다.');
    }
    for (const journal of [...Object.values(trip.journals || {}),...Object.values(trip.activityRecords || {})]) {
      if (!journal || typeof journal !== 'object' || (journal.text != null && typeof journal.text !== 'string') || (journal.photos != null && !Array.isArray(journal.photos))) throw new Error('일기 형식이 올바르지 않습니다.');
      if ((journal.photos || []).some(p => !safePhoto(p))) throw new Error('지원하지 않는 사진 주소가 있습니다.');
    }
    return trip;
  }
  function snapshot(trip, {journals = false, finances = false} = {}) {
    validateTrip(trip);
    const fields = [...PLAN_FIELDS, ...(journals ? ['journals','activityRecords'] : []), ...(finances ? MONEY_FIELDS : [])];
    const result = {};
    fields.forEach(key => { if (trip[key] !== undefined) result[key] = clone(trip[key]); });
    result.journals = journals ? result.journals || {} : {};
    result.expenses = finances ? result.expenses || [] : [];
    result.exchanges = finances ? result.exchanges || [] : [];
    // 적용된 AI 작업, 인증 정보 및 서버 멤버십은 내보내지 않는다.
    return result;
  }
  function create(trip, options = {}, version = '') {
    return {format:'sulsul-trip',schemaVersion:1,ver:version,shareId:root.crypto?.randomUUID?.() || `share-${Date.now()}-${Math.random().toString(36).slice(2)}`,exportedAt:new Date().toISOString(),scope:{journals:!!options.journals,finances:!!options.finances},trip:snapshot(trip, options)};
  }
  function parse(text) {
    if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_BYTES) throw new Error('공유 파일은 20MB 이하만 지원합니다.');
    const payload = JSON.parse(text);
    if (payload.format && payload.format !== 'sulsul-trip') throw new Error('지원하지 않는 공유 형식입니다.');
    if (payload.schemaVersion != null && payload.schemaVersion !== 1) throw new Error('더 최신 앱에서 만든 파일입니다. 앱을 업데이트해 주세요.');
    validateTrip(payload.trip);
    return {...payload,trip:snapshot(payload.trip,{journals:true,finances:true})};
  }
  const api = {MAX_BYTES,MAX_LINK_LENGTH:2000,create,parse,validateTrip,safePhoto};
  root.SulsulTravel = root.SulsulTravel || {};
  root.SulsulTravel.TripTransfer = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
