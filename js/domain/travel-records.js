/* 여행 기록 공통 읽기 모델. 하루 회고(journals)·일정 기록(activityRecords)·순간 기록(momentEntries, 퀵 캡슐 포함)을
 * 한 가지 Record 형식으로 읽는다. 저장·DOM에 의존하지 않고 원본을 바꾸지 않는다.
 * 기록 수·사진 수·날짜·원문은 화면·이야기·백업·공유가 모두 이 모델에서 읽는다(v2.0.5).
 *
 * Record {kind:'reflection'|'activity'|'moment', id, sourceId, path, source, tripId,
 *   dayId, dayIndex, archiveDate, occurredDate, occurredAt, time, scheduledTime, spotId, location,
 *   text, originalText, approvedText, approvedAt, accepted, textOrigin, mood, weather,
 *   mediaIds, photoCount, hasContent, orphaned, createdAt, updatedAt, entry}
 * - dayId·dayIndex: 기록이 속한 현재 일정의 날. 일정에 없는 날짜면 null·-1이고 archiveDate에 그 날짜(또는 null)를 둔다.
 * - occurredDate: 기록이 실제로 남은 날짜. 계획 날짜가 바뀌어도 이미 남긴 날짜를 옮기지 않는다.
 * - entry: 화면이 사진을 풀 때 쓰는 원본 항목(하루 회고는 날짜·ID를 고정한 사본). 고치지 않는다. */
(function (root) {
  'use strict';
  const text = value => typeof value === 'string' ? value : '';
  const firstText = (...values) => values.find(value => typeof value === 'string' && value.trim()) || '';
  const array = value => Array.isArray(value) ? value : [];
  const KIND_LABELS = Object.freeze({reflection:'하루 회고', activity:'일정 기록', moment:'순간 기록'});

  function dateOf(value) {
    const match = text(value).match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T|\s)/);
    if (!match) return null;
    const date = `${match[1]}-${match[2]}-${match[3]}`;
    const parsed = new Date(`${date}T00:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === date ? date : null;
  }
  function timeOf(value) {
    const match = text(value).match(/(?:^|T|\s)([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?/);
    return match ? `${match[1].padStart(2,'0')}:${match[2]}` : null;
  }
  function stamp(value) {
    return dateOf(value) && text(value).includes('T') && Number.isFinite(Date.parse(value)) ? value : null;
  }
  // 원문은 사용자가 쓴 글, 승인문은 사용자가 승인한 AI 문장이다. 승인 표식이 없으면 승인문으로 보지 않는다.
  function selectText(entry, mode = 'original') {
    const original = firstText(entry.originalText,entry.sourceText,entry.text);
    const accepted = !!(stamp(entry.aiDraftAcceptedAt) || stamp(entry.approvedAt) || entry.aiApproval?.status === 'approved');
    const approved = accepted ? firstText(entry.approvedText,entry.text,original) : original;
    return {text:mode === 'approved' ? approved : original,originalText:original,approvedText:accepted ? approved : null,textOrigin:mode === 'approved' && accepted ? 'approved' : 'original',approvedAt:stamp(entry.aiDraftAcceptedAt) || stamp(entry.approvedAt),accepted};
  }
  function photoCountOf(entry) { return Math.max(array(entry.photos).length, array(entry.mediaIds).length); }

  function planDays(trip) {
    const tripId = String(trip.id || 'trip');
    return array(trip.days).flatMap((day,index) => {
      if (!day || typeof day !== 'object') return [];
      const date = dateOf(day.date), dayNum = Number(day.dayNum || day.day) || index+1;
      return [{id:String(day.dayId || day.id || `day:${tripId}:${date || dayNum}`),index,date,dayNum,day}];
    });
  }
  function spotLocations(days) {
    return days.flatMap(planDay => array(planDay.day.spots).flatMap((spot,spotIndex) => {
      if (!spot || typeof spot !== 'object') return [];
      return [{dayId:planDay.id,dayIndex:planDay.index,date:planDay.date,spot,spotIndex,spotId:String(spot.spotId || spot.id || `${planDay.id}:spot:${spotIndex}`),title:firstText(spot.title,spot.name,'이름 없는 일정')}];
    }));
  }
  // 일정 기록이 연결된 일정. recordId → spotId(+dayId) → 제목·날짜가 하나뿐일 때만 순서로 찾는다.
  function locate(entry, id, locations) {
    const recordId = entry.activityLink?.recordId || entry.recordId || id;
    let found = locations.find(location => location.spot.recordId === recordId);
    if (found) return found;
    const spotId = entry.spotId || entry.activityId || entry.context?.spotId || entry.activityLink?.spotId;
    if (spotId) {
      const candidates = locations.filter(location => location.spotId === String(spotId));
      const dayId = entry.dayId || entry.context?.dayId || entry.activityLink?.dayId;
      found = dayId ? candidates.find(location => location.dayId === String(dayId)) : candidates.length === 1 ? candidates[0] : null;
      if (found) return found;
    }
    const title = firstText(entry.context?.title,entry.activityLink?.title);
    const date = dateOf(entry.context?.date) || dateOf(entry.activityLink?.date);
    const candidates = locations.filter(location => title && location.title === title && (!date || location.date === date));
    return candidates.length === 1 ? candidates[0] : null;
  }
  // 기록이 속할 날. 발생 날짜가 있는 기록은 계획 날짜가 바뀌어도 그 날짜에 남긴다.
  function resolveDay(entry, days, fallbackIndex) {
    const date = dateOf(entry.date) || dateOf(entry.context?.date) || dateOf(entry.occurredAt);
    const id = entry.dayId || entry.context?.dayId || entry.activityLink?.dayId;
    if (id != null) {
      const found = days.find(day => day.id === String(id));
      if (found && (!date || found.date === date)) return {day:found,archiveDate:null};
    }
    if (date) return {day:days.find(day => day.date === date) || null,archiveDate:date};
    if (entry.journalIdentityVersion === 1) return {day:null,archiveDate:null};
    const index = Number.isInteger(entry.dayIndex) ? entry.dayIndex : Number.isInteger(entry.activityLink?.dayIndex) ? entry.activityLink.dayIndex : fallbackIndex;
    return {day:Number.isInteger(index) ? days.find(day => day.index === index) || null : null,archiveDate:null};
  }

  function list(trip = {}, {textMode = 'original'} = {}) {
    const tripId = String(trip.id || 'trip'), days = planDays(trip), locations = spotLocations(days), records = [];
    function add(entry, id, kind, path, fallbackIndex) {
      if (!entry || typeof entry !== 'object') return;
      const location = kind === 'activity' || entry.activityLink || entry.spotId || entry.activityId ? locate(entry,id,locations) : null;
      // 날짜가 없는 구 일정 기록만 연결 일정의 날짜를 보충한다.
      const recordedDate = dateOf(entry.date) || dateOf(entry.context?.date) || dateOf(entry.occurredAt);
      const resolved = kind === 'activity' && location && !recordedDate ? {day:days.find(day => day.index === location.dayIndex),archiveDate:null} : resolveDay(entry,days,fallbackIndex);
      const day = resolved.day;
      const selected = selectText(entry,textMode);
      const occurredAt = stamp(entry.occurredAt);
      const photoCount = photoCountOf(entry);
      const mood = text(entry.mood), weather = text(entry.weather);
      records.push({kind,id:String(id),sourceId:`${kind}:${String(id)}`,path,source:text(entry.source) || (kind === 'reflection' ? 'journal' : kind),tripId,
        dayId:day ? day.id : null,dayIndex:day ? day.index : -1,archiveDate:day ? null : resolved.archiveDate,
        occurredDate:dateOf(entry.date) || (day ? day.date : resolved.archiveDate) || null,occurredAt,
        time:timeOf(entry.time) || timeOf(occurredAt),
        scheduledTime:kind === 'activity' ? timeOf(entry.context?.time) || timeOf(location?.spot.time) : timeOf(entry.activityLink?.time),
        spotId:location?.spotId || entry.spotId || entry.activityLink?.spotId || null,location,
        ...selected,mood,weather,mediaIds:array(entry.mediaIds).slice(),photoCount,
        hasContent:!!(selected.originalText.trim() || (selected.approvedText || '').trim() || photoCount || mood || weather),
        orphaned:kind === 'activity' && !location,createdAt:stamp(entry.createdAt),updatedAt:stamp(entry.updatedAt),entry});
    }
    Object.entries(trip.activityRecords || {}).forEach(([key,entry]) => add(entry,entry?.id || key,'activity',`activityRecords[${JSON.stringify(key)}]`));
    array(trip.momentEntries).forEach((entry,index) => add(entry,entry?.id || `moment:${index}`,'moment',`momentEntries[${index}]`));
    Object.entries(trip.journals || {}).forEach(([key,entry]) => {
      const fallback = /^\d+$/.test(key) ? Number(key) : undefined;
      const legacy = dateOf(key) && !entry?.date ? {...entry,date:key} : entry;
      const adapter = root.SulsulTravel?.TripAdapter;
      const pinned = adapter?.pinJournalIdentity ? adapter.pinJournalIdentity(trip, legacy, fallback, key) : legacy;
      add(pinned,entry?.id || `journal:${key}`,'reflection',`journals[${JSON.stringify(key)}]`,fallback);
    });
    return records;
  }

  // 날짜·시각 순서. 날짜 미상은 뒤로 보낸다.
  function chronological(records) {
    return records.slice().sort((a,b) => (a.occurredDate || '9999').localeCompare(b.occurredDate || '9999') || (a.time || '99:99').localeCompare(b.time || '99:99'));
  }

  // 화면·백업·공유가 함께 쓰는 개수. 글·사진·기분·날씨가 하나도 없는 빈 항목은 기록으로 세지 않는다.
  function summary(trip = {}) {
    const records = list(trip).filter(record => record.hasContent);
    const byKind = {reflection:0,activity:0,moment:0};
    records.forEach(record => { byKind[record.kind] += 1; });
    return {count:records.length,photoCount:records.reduce((sum,record) => sum+record.photoCount,0),byKind,records};
  }

  // 대표 사진으로 쓸 첫 기록 사진(날짜순). 사진 주소를 푸는 일은 화면이 한다.
  function firstPhoto(trip = {}) {
    const record = chronological(summary(trip).records).find(item => item.photoCount > 0);
    if (!record) return null;
    const index = Number.isInteger(record.entry.coverIndex) && record.entry.coverIndex < record.photoCount ? record.entry.coverIndex : 0;
    return {record,index};
  }

  const api = {list,summary,firstPhoto,chronological,selectText,dateOf,timeOf,stamp,KIND_LABELS};
  root.SulsulTravel = root.SulsulTravel || {};
  root.SulsulTravel.TravelRecords = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
