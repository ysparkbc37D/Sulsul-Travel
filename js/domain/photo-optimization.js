/* 기존 사진의 교체 계획은 순수한 복사본에만 적용한다. 글·일정·대표 사진 순서는 보존한다. */
(function (root) {
  'use strict';
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const own = (value,key) => Object.prototype.hasOwnProperty.call(value,key);
  const clone = value => JSON.parse(JSON.stringify(value));
  const safeId = value => typeof value === 'string' && value.length > 0 && !/[\s'"<>`\\;&]/.test(value);
  function imagePayload(source) {
    if (typeof source !== 'string') return null;
    const match = /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/=\s]+)$/.exec(source);
    if (!match) return null;
    const payload = match[1].replace(/\s/g,'');
    if (!payload || !/^[A-Za-z0-9+/]+={0,2}$/.test(payload) || payload.length % 4 === 1 || (payload.includes('=') && payload.length % 4 !== 0)) return null;
    return payload;
  }
  function sourceBytes(source) {
    const payload = imagePayload(source);
    if (!payload) return 0;
    return Math.floor(payload.length * 3 / 4) - (payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0);
  }
  function records(trips,{scopeTripId} = {}) {
    if (!Array.isArray(trips)) throw new TypeError('INVALID_PHOTO_TRIPS');
    if (scopeTripId !== undefined && !safeId(scopeTripId)) throw new TypeError('INVALID_PHOTO_TRIP_ID');
    const result = [], ids = new Set();
    for (const trip of trips) {
      if (!object(trip) || !safeId(trip.id) || ids.has(trip.id)) throw new TypeError('INVALID_PHOTO_TRIP');
      ids.add(trip.id);
      if (scopeTripId !== undefined && trip.id !== scopeTripId) continue;
      for (const [kind,field,array] of [['journal','journals',false],['activity','activityRecords',false],['moment','momentEntries',true],['expense','expenses',true]]) {
        const collection = trip[field];
        if (collection == null) continue;
        if (array ? !Array.isArray(collection) : !object(collection)) throw new TypeError('INVALID_PHOTO_RECORDS');
        const keys = new Set();
        for (const [key,record] of Object.entries(collection)) {
          if (!object(record)) throw new TypeError('INVALID_PHOTO_RECORD');
          if (record.photos != null && !Array.isArray(record.photos)) throw new TypeError('INVALID_PHOTO_ARRAY');
          if (['photoThumbnails','mediaIds'].some(field => record[field] != null && !Array.isArray(record[field]))) throw new TypeError('INVALID_PHOTO_METADATA');
          const recordKey = array ? (safeId(record.id) ? `id:${record.id}` : `index:${key}`) : key;
          if (keys.has(recordKey)) throw new TypeError('DUPLICATE_PHOTO_RECORD');
          keys.add(recordKey);
          // 날짜 키의 재사용, 또는 ID 없는 옛 배열 항목의 재배치를 오인하지 않는다.
          const identity = JSON.stringify(array && !safeId(record.id) ? record : [record.id ?? null,record.dayId ?? null,record.date ?? null,record.createdAt ?? null]);
          result.push({tripId:trip.id,kind,recordKey,identity,record});
        }
      }
    }
    if (scopeTripId !== undefined && !ids.has(scopeTripId)) throw new Error('PHOTO_TRIP_NOT_FOUND');
    return result;
  }
  function enumerate(trips,options) {
    const result = [];
    for (const {record,...locator} of records(trips,options)) {
      (record.photos || []).forEach((source,photoIndex) => {
        // 외부 주소는 네트워크로 읽지 않는다. 사진이 없는 옛 항목은 그대로 둔다.
        if (!imagePayload(source)) return;
        result.push({...locator,photoIndex,source,thumbnail:typeof record.photoThumbnails?.[photoIndex] === 'string' ? record.photoThumbnails[photoIndex] : null,mediaId:typeof record.mediaIds?.[photoIndex] === 'string' ? record.mediaIds[photoIndex] : null});
      });
    }
    return result;
  }
  function stats(trips,options) {
    const entries = enumerate(trips,options);
    const full = entries.reduce((sum,entry) => sum + sourceBytes(entry.source),0);
    const thumbnails = entries.reduce((sum,entry) => sum + sourceBytes(entry.thumbnail),0);
    return {count:entries.length,sourceBytes:full,thumbnailBytes:thumbnails,totalBytes:full + thumbnails};
  }
  function keyOf(value) { return JSON.stringify([value.tripId,value.kind,value.recordKey]); }
  function apply(trips,changes) {
    if (!Array.isArray(changes)) throw new TypeError('INVALID_PHOTO_CHANGES');
    const next = clone(trips), lookup = new Map(records(next).map(value => [keyOf(value),value]));
    const changedTrips = new Set(), oldMediaIds = new Set(), oldExpenseArchiveIds = new Set(), visited = new Set();
    let changedPhotos = 0;
    // 모든 교체를 검증한 후에만 복사본을 편집한다. 실패 시 호출자의 자료는 그대로다.
    const prepared = changes.map(change => {
      if (!object(change)) throw new TypeError('INVALID_PHOTO_CHANGE');
      const locator = object(change.locator) ? change.locator : change;
      const entry = lookup.get(keyOf(locator)), index = locator.photoIndex;
      if (!entry || !Number.isInteger(index) || index < 0 || index >= (entry.record.photos || []).length) throw new Error('PHOTO_RECORD_CHANGED');
      if (typeof locator.identity !== 'string' || locator.identity !== entry.identity) throw new Error('PHOTO_RECORD_CHANGED');
      const before = own(change,'before') ? change.before : locator.source;
      if (!imagePayload(before) || entry.record.photos[index] !== before) throw new Error('PHOTO_SOURCE_CHANGED');
      const replacement = object(change.replacement) ? change.replacement : change;
      const source = typeof change.replacement === 'string' ? change.replacement : replacement.source;
      if (!imagePayload(source)) throw new TypeError('INVALID_PHOTO_REPLACEMENT');
      let thumbnail = own(replacement,'thumbnail') ? replacement.thumbnail : null;
      let mediaId = own(replacement,'mediaId') ? replacement.mediaId : null;
      if (thumbnail !== null && !imagePayload(thumbnail)) throw new TypeError('INVALID_PHOTO_THUMBNAIL');
      if (mediaId !== null && !safeId(mediaId)) throw new TypeError('INVALID_PHOTO_MEDIA_ID');
      if (source !== before) {
        // enumerate 결과를 펼친 교체 요청의 옛 메타데이터도 새 값으로 오인하지 않는다.
        if (!object(change.locator) && !object(change.replacement) && thumbnail === entry.record.photoThumbnails?.[index]) thumbnail = null;
        if (mediaId === entry.record.mediaIds?.[index]) mediaId = null;
      }
      const photoKey = JSON.stringify([keyOf(locator),index]);
      if (visited.has(photoKey)) throw new Error('DUPLICATE_PHOTO_CHANGE');
      visited.add(photoKey);
      return {entry,index,source,thumbnail,mediaId,before};
    });
    for (const {entry,index,source,thumbnail,mediaId,before} of prepared) {
      if (source === before) continue;
      const record = entry.record, previousMediaId = record.mediaIds?.[index];
      if (typeof previousMediaId === 'string' && previousMediaId && previousMediaId !== mediaId) oldMediaIds.add(previousMediaId);
      if (entry.kind === 'expense' && record.expensePhotoArchive) {
        if (typeof record.expensePhotoArchive.id === 'string' && record.expensePhotoArchive.id) oldExpenseArchiveIds.add(record.expensePhotoArchive.id);
        delete record.expensePhotoArchive;
      }
      record.photos[index] = source;
      // 같은 위치의 옛 썸네일·Blob을 새 사진에 연결하지 않는다.
      for (const [field,value] of [['photoThumbnails',thumbnail],['mediaIds',mediaId]]) {
        if (!own(record,field) && value === null) continue;
        if (!Array.isArray(record[field])) record[field] = [];
        while (record[field].length < record.photos.length) record[field].push(null);
        record[field][index] = value;
      }
      changedTrips.add(entry.tripId); changedPhotos++;
    }
    return {trips:next,changedTrips:[...changedTrips],changedPhotos,oldMediaIds:[...oldMediaIds],oldExpenseArchiveIds:[...oldExpenseArchiveIds]};
  }
  const api = {enumerate,apply,stats,sourceBytes};
  root.SulsulTravel = root.SulsulTravel || {};
  root.SulsulTravel.PhotoOptimization = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
