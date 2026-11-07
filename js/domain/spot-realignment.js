(function (root) {
  'use strict';

  function parseTime(value) {
    const live = root.SulsulTravel?.LiveItinerary;
    if (typeof live?.minutes === 'function') {
      const minutes = live.minutes(String(value || '').trim());
      if (Number.isInteger(minutes) && minutes >= 0) return minutes;
    }
    const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || '').trim());
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour > 23 || minute > 59) return null;
    return hour * 60 + minute;
  }

  function formatTime(totalMinutes) {
    if (!Number.isInteger(totalMinutes) || totalMinutes < 0 || totalMinutes >= 2880) return '';
    const day = Math.floor(totalMinutes / 1440);
    const withinDay = totalMinutes % 1440;
    const hour = Math.floor(withinDay / 60);
    const minute = withinDay % 60;
    return (day ? '+' + day + '일 ' : '') + String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0');
  }

  function retired(spot) {
    const change = root.SulsulTravel?.ScheduleChange;
    if (typeof change?.retired === 'function') return change.retired(spot);
    return Boolean(spot?.cancelled || spot?.removed || spot?.deferred || spot?.skipped);
  }

  function protectedSpot(spot) {
    return Boolean(spot?.completed || spot?.fixed || spot?.recordId || spot?.isDateLine ||
      spot?.timeConstraint || retired(spot));
  }

  function durationOf(spot, intervalMinutes) {
    const duration = Number(spot?.durationMinutes);
    if (Number.isInteger(duration) && duration >= 15 && duration <= 1440) return duration;
    const range = /((?:\+\d+일\s*)?\d{1,2}:\d{2})(\s*\([^)]*\))?\s*(~|～|–|—|-|→)\s*((?:\+\d+일\s*)?\d{1,2}:\d{2})(\s*\([^)]*\))?/.exec(String(spot?.time || ''));
    if (range) {
      const start = parseTime(range[1]);
      let end = parseTime(range[4]);
      if (start !== null && end !== null) {
        if (!/^\+\d+일/.test(range[4]) && end <= start) {
          end += (Math.floor((start - end) / 1440) + 1) * 1440;
        }
        if (end - start >= 15 && end - start <= 1440) return end - start;
      }
    }
    return intervalMinutes;
  }

  function formatAdjustedTime(original, startMinutes, durationMinutes) {
    const start = formatTime(startMinutes);
    const range = /((?:\+\d+일\s*)?\d{1,2}:\d{2})(\s*\([^)]*\))?\s*(~|～|–|—|-|→)\s*((?:\+\d+일\s*)?\d{1,2}:\d{2})(\s*\([^)]*\))?/.exec(String(original || ''));
    if (!range) return start;
    return start + (range[2] || '') + ' ' + range[3] + ' ' + formatTime(startMinutes + durationMinutes) + (range[5] || '');
  }

  function preview(day, intervalMinutes = 30) {
    const interval = Number(intervalMinutes);
    if (!day || !Array.isArray(day.spots) || !day.spots.length) {
      return {ok: false, reason: 'NO_SPOTS', message: '조정할 일정이 없습니다.'};
    }
    if (!Number.isInteger(interval) || interval < 15 || interval > 180) {
      return {ok: false, reason: 'INVALID_INTERVAL', message: '시간 간격을 확인해 주세요.'};
    }

    const entries = day.spots.map((spot, spotIndex) => ({spot, spotIndex})).filter(item => !retired(item.spot));
    const protectedCount = entries.filter(item => protectedSpot(item.spot)).length;
    const firstTimed = entries.find(item => !protectedSpot(item.spot) && parseTime(item.spot?.time) !== null)?.spot ||
      entries.find(item => parseTime(item.spot?.time) !== null)?.spot;
    let cursor = parseTime(firstTimed?.time);
    if (cursor === null) cursor = 600;

    const changes = [];
    let adjustedCount = 0;
    let hasAdjustedBeforeAnchor = false;

    for (let index = 0; index < entries.length; index += 1) {
      const item = entries[index];
      const spot = item.spot;
      const currentMinutes = parseTime(spot?.time);
      const duration = durationOf(spot, interval);

      if (protectedSpot(spot)) {
        if (currentMinutes !== null) {
          const isHistoricalCompletion = Boolean(spot.completed);
          if (!isHistoricalCompletion && hasAdjustedBeforeAnchor && currentMinutes < cursor) {
            return {
              ok: false,
              reason: 'ANCHOR_CONFLICT',
              message: '앞선 일정의 소요 시간과 고정 일정이 겹칩니다. 간격을 넓히거나 일정을 직접 조정해 주세요.',
              protectedCount,
              changes: []
            };
          }
          cursor = Math.max(cursor, currentMinutes + duration);
        }
        continue;
      }

      const start = Math.ceil(cursor / interval) * interval;
      const end = start + duration;
      if (start >= 2880 || end >= 2880) {
        return {
          ok: false,
          reason: 'DAY_OVERFLOW',
          message: '일정이 여행 기준 2일 이후로 밀립니다. 간격을 줄이거나 일정을 다음 날짜로 옮겨 주세요.',
          protectedCount,
          changes: []
        };
      }

      const nextAnchor = entries.slice(index + 1).find(next => {
        if (!protectedSpot(next.spot)) return false;
        const anchorTime = parseTime(next.spot?.time);
        if (anchorTime === null) return false;
        // A completed stop in the past is history, not a future time reservation.
        return !next.spot.completed || anchorTime >= start;
      });
      const anchorMinutes = nextAnchor ? parseTime(nextAnchor.spot.time) : null;
      if (anchorMinutes !== null && end > anchorMinutes) {
        return {
          ok: false,
          reason: 'ANCHOR_CONFLICT',
          message: (nextAnchor.spot.title || nextAnchor.spot.name || '고정 일정') +
            ' 전에 배치할 여유 시간이 부족합니다. 간격을 줄이거나 앞선 일정을 직접 조정해 주세요.',
          protectedCount,
          changes: []
        };
      }

      adjustedCount += 1;
      hasAdjustedBeforeAnchor = true;
      const nextTime = formatAdjustedTime(spot.time, start, duration);
      if (String(spot.time || '') !== nextTime) {
        changes.push({
          spotIndex: item.spotIndex,
          spotId: typeof spot.id === 'string' ? spot.id : '',
          title: String(spot.title || spot.name || '이름 없는 일정').slice(0, 100),
          beforeTime: String(spot.time || ''),
          afterTime: nextTime
        });
      }
      cursor = end;
    }

    return {
      ok: true,
      intervalMinutes: interval,
      protectedCount,
      adjustedCount,
      changes
    };
  }

  root.SulsulTravel = root.SulsulTravel || {};
  root.SulsulTravel.SpotRealignment = {parseTime, formatTime, isProtected: protectedSpot, preview};
})(typeof window !== 'undefined' ? window : globalThis);
