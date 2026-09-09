const clone = value => JSON.parse(JSON.stringify(value));

export function timeToMinutes(value) {
  const text = String(value || '').trim();
  const match = /(\d{2}):(\d{2})/.exec(text);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute + (/^\+1일\s*/.test(text) ? 1440 : 0);
}

export function minutesToTime(value) {
  const normalized = Math.max(0, Math.min(1439, Number(value) || 0));
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

export function shiftTimeLabel(value, offsetMinutes) {
  const text = String(value || '').trim();
  const pattern = /(?:\+1일\s*)?(\d{2}):(\d{2})/g;
  const matches = [...text.matchAll(pattern)];
  if (!matches.length || !Number(offsetMinutes)) return null;
  const singleClock = matches.length === 1;
  return text.replace(pattern, (raw, hourText, minuteText) => {
    const baseDay = raw.startsWith('+1일') ? 1 : 0;
    const shifted = baseDay * 1440 + Number(hourText) * 60 + Number(minuteText) + Number(offsetMinutes);
    const dayOffset = Math.floor(shifted / 1440);
    const wrapped = ((shifted % 1440) + 1440) % 1440;
    const clock = `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`;
    if (dayOffset > 0 && (singleClock || raw.startsWith('+1일'))) return `+${dayOffset}일 ${clock}`;
    if (dayOffset < 0 && singleClock) return `${dayOffset}일 ${clock}`;
    return clock;
  });
}

export function createReplanProposal({ days, targetDay = 'all', offsetMinutes = 0, reason = '' }) {
  if (!Array.isArray(days)) throw new TypeError('DAYS_REQUIRED');
  const proposedDays = clone(days);
  const selected = targetDay === 'all' ? proposedDays.map((_, index) => index) : [Number(targetDay)];
  const changes = [];
  let preservedCompletedCount = 0;
  let preservedFixedCount = 0;

  selected.forEach(dayIndex => {
    const sourceDay = days[dayIndex];
    const target = proposedDays[dayIndex];
    if (!sourceDay || !target || !Array.isArray(target.spots)) return;
    target.spots.forEach((spot, spotIndex) => {
      const original = sourceDay.spots[spotIndex];
      if (spot.completed) { preservedCompletedCount += 1; return; }
      if (spot.fixed) { preservedFixedCount += 1; return; }
      const shiftedTime = shiftTimeLabel(spot.time, offsetMinutes);
      if (!shiftedTime || shiftedTime === spot.time) return;
      spot.time = shiftedTime;
      changes.push({
        dayIndex,
        spotIndex,
        title: String(spot.title || '일정'),
        before: String(original.time || ''),
        after: spot.time
      });
      if (reason) spot.replanNote = String(reason).slice(0, 300);
    });
    if (!target.spots.some(spot => spot.isDateLine)) {
      target.spots.sort((a, b) => (timeToMinutes(a.time) ?? 9999) - (timeToMinutes(b.time) ?? 9999));
    }
  });

  return { proposedDays, changes, preservedCompletedCount, preservedFixedCount };
}

export function protectedSpotsMatch(beforeDays, afterDays) {
  if (!Array.isArray(beforeDays) || !Array.isArray(afterDays) || beforeDays.length !== afterDays.length) return false;
  return beforeDays.every((day, dayIndex) => {
    const next = afterDays[dayIndex];
    if (!next || !Array.isArray(day.spots) || !Array.isArray(next.spots)) return false;
    const protectedBefore = day.spots.filter(spot => spot.completed || spot.fixed);
    return protectedBefore.every(spot => next.spots.some(candidate =>
      candidate.title === spot.title && candidate.time === spot.time &&
      Boolean(candidate.completed) === Boolean(spot.completed) && Boolean(candidate.fixed) === Boolean(spot.fixed)
    ));
  });
}
