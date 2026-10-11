/* AI 초안 계약: 화면과 공급자에 관계없이 생성·승인 경계에서 같은 규칙을 적용한다. */
(function (root) {
  'use strict';

  const categories = new Set(['food','flight','lodging','tour','shopping','etc','meal','transport','snack','drink','beverage','rental']);
  const text = (value, limit, allowEmpty = false) => typeof value === 'string' && value.length <= limit && (allowEmpty || value.trim().length > 0);
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

  function equal(left, right) {
    if (left === right) return true;
    if (!object(left) && !Array.isArray(left)) return false;
    if (!object(right) && !Array.isArray(right)) return false;
    if (Array.isArray(left) !== Array.isArray(right)) return false;
    const keys = Object.keys(left), other = Object.keys(right);
    return keys.length === other.length && keys.every(key => Object.prototype.hasOwnProperty.call(right, key) && equal(left[key], right[key]));
  }

  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }

  function validTime(value, halfHour = false) {
    if (!text(value, 100) || /[<>]/.test(value)) return false;
    // 긴 숫자나 1자리 시각의 일부를 정상 HH:MM으로 잘못 해석하지 않는다.
    const labels = value.match(/\d+:\d+/g) || [];
    if (!labels.length || labels.some(label => !/^\d{2}:\d{2}$/.test(label))) return false;
    const matches = [...value.matchAll(/(\d{2}):(\d{2})/g)];
    return matches.length > 0 && matches.every(match => Number(match[1]) < 24 && Number(match[2]) < 60 && (!halfHour || [0, 30].includes(Number(match[2]))));
  }

  function scopeIndexes(days, target = 'all') {
    if (target === 'all') return new Set(days.map((_, index) => index));
    const range = /^range:(\d+):(\d+)$/.exec(String(target));
    if (range) {
      const start = Number(range[1]), end = Number(range[2]);
      if (start > end || start < 0 || end >= days.length) return null;
      return new Set(Array.from({length:end - start + 1}, (_, offset) => start + offset));
    }
    if (!/^\d+$/.test(String(target))) return null;
    const index = Number(target);
    return Number.isInteger(index) && index >= 0 && index < days.length ? new Set([index]) : null;
  }

  function protectedSpotsMatch(before, after) {
    if (!Array.isArray(before) || !Array.isArray(after) || before.length !== after.length) return false;
    return before.every((day, index) => {
      const proposed = after[index];
      if (!Array.isArray(day?.spots) || !Array.isArray(proposed?.spots)) return false;
      const claimed = new Set();
      return day.spots.filter(spot => spot.completed || spot.fixed || spot.recordId).every(spot => {
        const candidateIndex = proposed.spots.findIndex((candidate, spotIndex) => !claimed.has(spotIndex) &&
          (!spot.id || candidate.id === spot.id) && equal(spot, candidate));
        if (candidateIndex < 0) return false;
        claimed.add(candidateIndex);
        return true;
      });
    });
  }

  function validate(payload, job, {currencyCodes = []} = {}) {
    if (!object(payload) || !object(job)) return false;
    const input = object(job.input) ? job.input : {};
    if (['journal','activity-journal','moment-journal'].includes(job.kind)) return text(payload.text, 20000);
    if (job.kind === 'receipt') {
      const receipt = payload.receipt, currencies = new Set(currencyCodes);
      return object(receipt) && text(receipt.merchant, 200) &&
        (typeof receipt.amount === 'number' || typeof receipt.amount === 'string') &&
        String(receipt.amount).trim() !== '' && Number.isFinite(Number(receipt.amount)) && Number(receipt.amount) > 0 && Number(receipt.amount) <= 1000000000000 &&
        typeof receipt.currency === 'string' && /^[A-Z]{3}$/.test(receipt.currency) && currencies.has(receipt.currency) &&
        categories.has(receipt.category) && (!receipt.date || validDate(receipt.date));
    }
    if (!['itinerary','replan'].includes(job.kind) || !Array.isArray(payload.days) || payload.days.length < 1 || payload.days.length > 60) return false;
    if (job.kind === 'itinerary' && Number.isInteger(input.expectedDayCount) && payload.days.length !== input.expectedDayCount) return false;
    const spotIds = new Set(), dayIds = new Set();
    const shape = payload.days.every((day, index) => {
      if (!object(day) || Number(day.dayNum) !== index + 1 || !text(day.title, 200) ||
          !text(day.city, 100, job.kind === 'replan') || !Array.isArray(day.spots) || day.spots.length > 48 ||
          (day.date && !validDate(day.date))) return false;
      if (day.id) { if (!text(day.id, 200) || dayIds.has(day.id)) return false; dayIds.add(day.id); }
      if (job.kind === 'itinerary') {
        const minimum = index === 0 || index === payload.days.length - 1
          ? Math.max(2, Number(input.edgeMinSpotsPerDay) || 2) : Math.max(3, Number(input.minSpotsPerDay) || 3);
        if (day.spots.length < minimum) return false;
      }
      return day.spots.every(spot => {
        if (!object(spot) || !text(spot.title, 200) || !validTime(spot.time, job.kind === 'itinerary')) return false;
        if (spot.id) { if (!text(spot.id, 200) || spotIds.has(spot.id)) return false; spotIds.add(spot.id); }
        return true;
      });
    });
    if (!shape) return false;
    if (job.kind === 'itinerary') return true;
    const snapshot = input.snapshotDays;
    if (!Array.isArray(snapshot) || snapshot.length !== payload.days.length) return false;
    const allowed = scopeIndexes(snapshot, input.targetDayVal ?? 'all');
    if (!allowed || !allowed.size) return false;
    if (!snapshot.every((day, index) => (allowed.has(index) || equal(day, payload.days[index])) && (!day.id || day.id === payload.days[index].id))) return false;
    return protectedSpotsMatch(snapshot, payload.days);
  }

  const api = {validate, equal, validDate, validTime, scopeIndexes, protectedSpotsMatch};
  root.SulsulTravel = root.SulsulTravel || {};
  root.SulsulTravel.AiDraftValidation = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
