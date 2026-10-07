/* 여행 입력 경계: 시드·구버전·AI 자료를 보존하면서 화면 계약을 보충한다. */
(function (root) {
  'use strict';

  const clone = value => JSON.parse(JSON.stringify(value));
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const text = value => typeof value === 'string' ? value.trim() : '';
  const firstText = (...values) => values.map(text).find(Boolean) || '';
  const identity = value => typeof value === 'string' && value.trim() ? value : '';
  const pad = value => String(value).padStart(2, '0');

  function stableId(prefix, seed) {
    let hash = 2166136261;
    for (const char of String(seed)) { hash ^= char.codePointAt(0); hash = Math.imul(hash, 16777619); }
    return `${prefix}_${(hash >>> 0).toString(36)}`;
  }

  function isoDate(value) {
    const raw = text(value);
    const match = /^(\d{4})\s*(?:[-./]|년)\s*(\d{1,2})\s*(?:[-./]|월)\s*(\d{1,2})(?:일|(?:[T\s(].*)?)$/.exec(raw);
    if (!match) return '';
    const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
    if (year < 1000 || month < 1 || month > 12 || day < 1 || day > 31) return '';
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) return '';
    return `${year}-${pad(month)}-${pad(day)}`;
  }

  function dateForDay(startDate, dayIndex) {
    const start = isoDate(startDate);
    if (!start || !Number.isInteger(dayIndex)) return '';
    const date = new Date(`${start}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + dayIndex);
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
  }

  function clockParts(value, timeZone) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    if (timeZone) {
      try {
        const parts = new Intl.DateTimeFormat('en-CA', {timeZone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23'}).formatToParts(date);
        return Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
      } catch (_) { /* 잘못된 시간대는 기기 시각을 사용하며 여행지를 추정하지 않는다. */ }
    }
    return {year:String(date.getFullYear()), month:pad(date.getMonth() + 1), day:pad(date.getDate()), hour:pad(date.getHours()), minute:pad(date.getMinutes())};
  }

  function localDateKey(value = new Date(), timeZone = '') {
    const parts = clockParts(value, timeZone);
    return parts ? `${parts.year}-${parts.month}-${parts.day}` : '';
  }

  function localTimeKey(value = new Date(), timeZone = '') {
    const parts = clockParts(value, timeZone);
    return parts ? `${parts.hour}:${parts.minute}` : '';
  }

  function normalizeCityName(value) {
    if (typeof value !== 'string') return '';
    // 공백과 하이픈은 실제 지명의 일부다. 자유 문장에서 첫 단어를 도시로 추정하지 않는다.
    return value.replace(/^\s*day\s*\d+\s*[:.·-]?\s*/i, '').replace(/\s+(계획|일정|투어|탐방|코스)\s*$/, '').replace(/\s+/g, ' ').trim();
  }

  function normalizeExpenseCategory(value) {
    const category = text(value).toLowerCase();
    const aliases = {food:'meal', meals:'meal', 식사:'meal', 식비:'meal', cafe:'beverage', coffee:'beverage', 음료:'beverage', alcohol:'drink', 술:'drink', accommodation:'lodging', stay:'lodging', hotel:'lodging', 숙소:'lodging', flight:'transport', transit:'transport', 교통:'transport', 렌터카:'rental', sightseeing:'tour', attraction:'tour', 관광:'tour', 쇼핑:'shopping', other:'etc', 기타:'etc'};
    const canonical = aliases[category] || category;
    return ['meal','snack','drink','beverage','lodging','transport','rental','tour','shopping','etc'].includes(canonical) ? canonical : 'etc';
  }

  function normalizeSpotCategory(value) {
    const expense = normalizeExpenseCategory(value);
    if (['meal','snack','drink','beverage'].includes(expense)) return 'food';
    if (['transport','rental'].includes(expense)) return 'flight';
    return ['lodging','tour','shopping'].includes(expense) ? expense : 'etc';
  }

  function normalizeTrip(input, {idSeed = ''} = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('여행 객체가 필요합니다.');
    const trip = clone(input);
    trip.id = identity(trip.id) || stableId('trip', `${idSeed}:${firstText(trip.title, trip.name)}:${firstText(trip.startDate)}`);
    trip.title = firstText(trip.title, trip.name) || '이름 없는 여행';
    const start = isoDate(trip.startDate);
    if (start) trip.startDate = start;
    const sourceDays = Array.isArray(trip.days) ? trip.days : [];
    trip.days = sourceDays.map((day, dayIndex) => {
      if (!day || typeof day !== 'object' || Array.isArray(day)) throw new TypeError('일별 일정 객체가 필요합니다.');
      day.id = identity(day.id) || stableId('day', `${trip.id}:${dayIndex}`);
      day.dayNum = Number.isInteger(Number(day.dayNum)) && Number(day.dayNum) > 0 ? Number(day.dayNum) : (Number.isInteger(Number(day.day)) && Number(day.day) > 0 ? Number(day.day) : dayIndex + 1);
      const date = isoDate(day.date) || dateForDay(start, dayIndex);
      if (date && day.date !== date) { if (day.date && !own(day, 'sourceDate')) day.sourceDate = day.date; day.date = date; }
      day.city = normalizeCityName(firstText(day.city, day.cityName, day.place));
      day.title = firstText(day.title, day.name) || `${day.city || '여행'} · Day ${day.dayNum}`;
      const sourceSpots = Array.isArray(day.spots) ? day.spots : (Array.isArray(day.timeline) ? day.timeline : []);
      day.spots = sourceSpots.map((spot, spotIndex) => {
        if (!spot || typeof spot !== 'object' || Array.isArray(spot)) throw new TypeError('세부 일정 객체가 필요합니다.');
        spot.id = identity(spot.id) || stableId('spot', `${trip.id}:${day.id}:${spotIndex}`);
        spot.title = firstText(spot.title, spot.name) || '이름 없는 일정';
        const category = normalizeSpotCategory(firstText(spot.cat, spot.category) || 'tour');
        if (spot.cat && spot.cat !== category && !own(spot, 'sourceCategory')) spot.sourceCategory = spot.cat;
        spot.cat = category;
        if (!spot.desc && typeof spot.description === 'string') spot.desc = spot.description;
        if (!spot.currency && spot.curr) spot.currency = spot.curr;
        // 완료·고정·건너뜀·recordId·planBlockId 등 기존 문맥은 clone에 남긴다.
        return spot;
      });
      return day;
    });
    if (!Number.isInteger(trip.durationDays) || trip.durationDays < 1) trip.durationDays = trip.days.length;
    const end = isoDate(trip.endDate) || dateForDay(start, Math.max(0, trip.days.length - 1));
    if (end) trip.endDate = end;

    const dayCities = [...new Set(trip.days.map(day => day.city).filter(Boolean))];
    const oldCities = Array.isArray(trip.cities) ? trip.cities : [];
    const cities = oldCities.flatMap(raw => {
      const city = normalizeCityName(raw);
      // 구버전의 첫 단어 손실은 남아 있는 일별 도시명만으로 복구한다.
      const expanded = city && !city.includes(' ') && !dayCities.includes(city) ? dayCities.filter(full => full.startsWith(`${city} `)) : [];
      return expanded.length ? expanded : (city ? [city] : []);
    });
    trip.cities = [...new Set([...cities, ...dayCities])];
    if (Array.isArray(trip.expenses)) trip.expenses = trip.expenses.map((expense, index) => {
      if (!expense || typeof expense !== 'object' || Array.isArray(expense)) throw new TypeError('지출 객체가 필요합니다.');
      expense.id = identity(expense.id) || stableId('expense', `${trip.id}:${index}`);
      expense.title = firstText(expense.title, expense.name) || '지출 기록';
      const category = normalizeExpenseCategory(firstText(expense.cat, expense.category));
      if (expense.cat && expense.cat !== category && !own(expense, 'sourceCategory')) expense.sourceCategory = expense.cat;
      expense.cat = category;
      expense.curr = firstText(expense.curr, expense.currency) || 'KRW';
      if (!own(expense, 'krw') && Number.isFinite(Number(expense.amountKrw))) expense.krw = Number(expense.amountKrw);
      if (!own(expense, 'krw') && expense.curr === 'KRW' && Number.isFinite(Number(expense.amount))) expense.krw = Number(expense.amount);
      const date = isoDate(expense.date) || (Number.isInteger(expense.dateIdx) ? dateForDay(start, expense.dateIdx) : '');
      if (date) expense.date = date;
      return expense;
    });
    if (trip.journals && typeof trip.journals === 'object' && !Array.isArray(trip.journals)) {
      for (const entry of Object.values(trip.journals)) {
        if (entry && typeof entry === 'object' && !own(entry, 'text') && typeof entry.content === 'string') entry.text = entry.content;
      }
    }
    // 미지의 timeZone은 새 값으로 덮거나 목적지에서 추정하지 않는다.
    return trip;
  }

  function normalizeTrips(trips) {
    if (!Array.isArray(trips)) throw new TypeError('여행 목록이 필요합니다.');
    return trips.map((trip, index) => normalizeTrip(trip, {idSeed:String(index)}));
  }

  function resolveTripStage(trip, now = new Date()) {
    if (!trip || trip.isBucketlist || ['bucket','bucketlist'].includes(trip.status)) return 'bucketlist';
    if (trip.status === 'completed' || trip.completedAt) return 'completed';
    const start = isoDate(trip.startDate);
    if (!start) return 'bucketlist';
    const today = localDateKey(now, trip.timeZone);
    const duration = Number(trip.durationDays) || trip.days?.length || 1;
    const end = isoDate(trip.endDate) || dateForDay(start, Math.max(0, duration - 1));
    if (!today || today < start) return 'planned';
    return today > end ? 'completed' : 'ongoing';
  }

  function resolveTodayDayIndex(trip, now = new Date()) {
    const days = Array.isArray(trip?.days) ? trip.days : [];
    if (!days.length) return 0;
    const today = localDateKey(now, trip.timeZone);
    const exact = days.findIndex((day, index) => (isoDate(day.date) || dateForDay(trip.startDate, index)) === today);
    if (exact >= 0) return exact;
    const stage = resolveTripStage(trip, now);
    if (stage === 'completed') return days.length - 1;
    if (stage === 'planned' || stage === 'bucketlist') return 0;
    const upcoming = days.findIndex((day, index) => (isoDate(day.date) || dateForDay(trip.startDate, index)) > today);
    return upcoming >= 0 ? upcoming : days.length - 1;
  }

  const api = {normalizeTrip, normalizeTrips, normalizeCityName, normalizeExpenseCategory, normalizeSpotCategory, isoDate, dateForDay, localDateKey, localTimeKey, resolveTripStage, resolveTodayDayIndex};
  root.SulsulTravel = root.SulsulTravel || {};
  root.SulsulTravel.TripAdapter = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
