/* 기록 사진(하루 회고·일정 기록·순간 기록)을 여행 문서(localStorage)에서 빼고 IndexedDB 보관본으로만 둔다(v2.0.6).
 * 지출 사진(expense-photo-repository.js)과 같은 원칙이다.
 * - IDB 원본을 data URL로 되살려 문서의 사진과 글자 단위로 같다고 확인한 사진만 문서에서 뺀다(채택).
 * - 뺀 자리는 photos[i]=''와 mediaIds[i]=ID다. 전체 백업(hydrateTravelBackupPhotos)이 이미 읽는 형식이다.
 * - 메모리의 State는 언제나 사진이 채워진 상태다. 저장할 때 project, 읽을 때 hydrate, 부팅 때 prime이 맡는다.
 * - 처음으로 사진을 빼기 전에 원래 문서 전체를 별도 IDB(sulsul-travel-migration-v1)에 한 번 보관한다.
 *   그 보관이 실패하면 아무 사진도 빼지 않고 지금처럼 문서에 둔다.
 * - 사진이 IDB에 없으면(브라우저 정리 등) 그 자리를 그대로 두고 missingReferences로 알린다. 지어내거나 지우지 않는다. */
(function (root) {
  'use strict';
  const FIELDS = ['journals', 'activityRecords', 'momentEntries'];
  const SNAPSHOT_DB = 'sulsul-travel-migration-v1', SNAPSHOT_STORE = 'snapshots', ORIGINAL_ID = 'before-record-media';
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const isData = value => typeof value === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=\s]+$/.test(value);
  const validId = value => typeof value === 'string' && !!value;
  function sourceHash(value) { let hash = 2166136261; for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619); return `${value.length}:${hash >>> 0}`; }
  function readBlob(blob) {
    return new Promise((resolve, reject) => {
      const reader = new root.FileReader();
      reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('보관 사진을 읽지 못했습니다.'));
      reader.onerror = reader.onabort = () => reject(new Error('보관 사진을 읽지 못했습니다.'));
      reader.readAsDataURL(blob);
    });
  }
  // fetch(data:)는 CSP나 브라우저 정책에 막힐 수 있어 직접 디코딩한다.
  async function dataUrlToBlob(value) {
    const comma = value.indexOf(','), type = value.slice(5, value.indexOf(';'));
    const binary = root.atob(value.slice(comma + 1).replace(/\s/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new root.Blob([bytes], {type});
  }
  // 기록 항목을 돌며 바꾼 항목이 있는 여행·묶음만 새로 만든다. visit(entry, place)는 같은 항목이나 새 항목을 돌려준다.
  function mapEntries(trips, visit) {
    if (!Array.isArray(trips)) return trips;
    return trips.map(trip => {
      if (!object(trip)) return trip;
      let next = trip;
      for (const field of FIELDS) {
        const container = trip[field];
        if (field === 'momentEntries' ? !Array.isArray(container) : !object(container)) continue;
        let changed = false;
        const pairs = field === 'momentEntries' ? container.map((entry, index) => [index, entry]) : Object.entries(container);
        const mapped = pairs.map(([key, entry]) => {
          if (!object(entry)) return [key, entry];
          const result = visit(entry, {tripId: trip.id, field, key, entryId: entry.id || ''});
          if (result !== entry) changed = true;
          return [key, result];
        });
        if (!changed) continue;
        if (next === trip) next = {...trip};
        next[field] = field === 'momentEntries' ? mapped.map(([, entry]) => entry) : Object.fromEntries(mapped);
      }
      return next;
    });
  }
  function forEachPhoto(trips, visit) {
    mapEntries(trips, (entry, place) => {
      const photos = Array.isArray(entry.photos) ? entry.photos : [];
      const ids = Array.isArray(entry.mediaIds) ? entry.mediaIds : [];
      for (let index = 0; index < Math.max(photos.length, ids.length); index++) visit(entry, index, place);
      return entry;
    });
  }

  class RecordMediaStore {
    constructor({media, indexedDb, reader = readBlob, toBlob = dataUrlToBlob, makeId} = {}) {
      this._media = media; this._indexedDb = indexedDb;
      this.readBlob = reader; this.toBlob = toBlob;
      this.makeId = makeId || (() => `media_${root.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`}`);
      this.cache = new Map();   // mediaId → {source, thumbnail, hash}
      this.missing = [];
      this.ready = false;       // 원래 문서를 보관했거나 보관이 필요 없을 때만 사진을 문서에서 뺀다
      this.snapshot = 'none';
    }
    get media() { return this._media || root.SulsulTravel?.mediaRepository; }
    get indexedDb() { return this._indexedDb || root.indexedDB; }
    _cached(entry, index) {
      const cached = this.cache.get(entry.mediaIds?.[index]);
      return cached && entry.photos?.[index] === cached.source ? cached : null;
    }
    // 저장 직전: 확인한 사진만 비우고, 썸네일은 보관본과 같을 때만 비운다.
    project(trips) {
      if (!this.ready || !this.cache.size) return trips;
      return mapEntries(trips, entry => {
        if (!Array.isArray(entry.photos) || !Array.isArray(entry.mediaIds)) return entry;
        let photos = null, thumbs = null;
        entry.photos.forEach((photo, index) => {
          const cached = isData(photo) ? this._cached(entry, index) : null;
          if (!cached) return;
          photos = photos || entry.photos.slice(); photos[index] = '';
          if (Array.isArray(entry.photoThumbnails) && cached.thumbnail && entry.photoThumbnails[index] === cached.thumbnail) {
            thumbs = thumbs || entry.photoThumbnails.slice(); thumbs[index] = '';
          }
        });
        return photos ? {...entry, photos, ...(thumbs ? {photoThumbnails: thumbs} : {})} : entry;
      });
    }
    // 읽은 직후: 빈 자리를 보관본으로 채운다. 찾지 못한 자리는 그대로 두고 기록한다.
    hydrate(trips) {
      const missing = [];
      const next = mapEntries(trips, (entry, place) => {
        if (!Array.isArray(entry.photos) || !Array.isArray(entry.mediaIds)) return entry;
        let photos = null, thumbs = null;
        entry.photos.forEach((photo, index) => {
          const id = entry.mediaIds[index];
          if (photo !== '' || !validId(id)) return;
          const cached = this.cache.get(id);
          if (!cached) { missing.push({...place, index, mediaId: id}); return; }
          photos = photos || entry.photos.slice(); photos[index] = cached.source;
          if (Array.isArray(entry.photoThumbnails) && entry.photoThumbnails[index] === '') { thumbs = thumbs || entry.photoThumbnails.slice(); thumbs[index] = cached.thumbnail || cached.source; }
        });
        return photos ? {...entry, photos, ...(thumbs ? {photoThumbnails: thumbs} : {})} : entry;
      });
      this.missing = missing;
      return next;
    }
    missingReferences() { return this.missing.map(value => ({...value})); }
    // 방금 보관을 마친 새 사진(MediaRepository.prepare). 같은 Blob에서 만든 문자열이므로 해시만 맞으면 대조된 것으로 본다.
    remember({id, source, thumbnail, sourceHash: hash} = {}) {
      if (!validId(id) || !isData(source) || hash !== sourceHash(source)) return false;
      this.cache.set(id, {source, thumbnail: isData(thumbnail) ? thumbnail : '', hash});
      return true;
    }
    async _load(ids) {
      const values = await this.media.getMany(ids), loaded = new Map();
      for (const [id, value] of values) {
        if (!(value?.original instanceof root.Blob)) continue;
        const source = await this.readBlob(value.original);
        // 저장할 때 남긴 해시와 다르면 다른 사진이거나 손상된 보관본이다. 연결하지 않는다.
        if (value.sourceHash && value.sourceHash !== sourceHash(source)) continue;
        const thumbnail = value.thumbnail instanceof root.Blob ? await this.readBlob(value.thumbnail) : '';
        loaded.set(id, {source, thumbnail, hash: sourceHash(source)});
      }
      return loaded;
    }
    _snapshotTransaction(mode, work) {
      return new Promise((resolve, reject) => {
        let request;
        try { request = this.indexedDb.open(SNAPSHOT_DB, 1); } catch (error) { reject(error); return; }
        request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(SNAPSHOT_STORE)) request.result.createObjectStore(SNAPSHOT_STORE, {keyPath: 'id'}); };
        request.onerror = () => reject(request.error || new Error('원문 보관 저장소를 열지 못했습니다.'));
        request.onblocked = () => reject(new Error('다른 창이 원문 보관 저장소를 사용 중입니다.'));
        request.onsuccess = () => {
          const db = request.result;
          let result;
          try {
            const tx = db.transaction(SNAPSHOT_STORE, mode);
            tx.oncomplete = () => { db.close(); resolve(result); };
            tx.onerror = tx.onabort = () => { db.close(); reject(tx.error || new Error('원문을 보관하지 못했습니다.')); };
            result = work(tx.objectStore(SNAPSHOT_STORE));
          } catch (error) { db.close(); reject(error); }
        };
      });
    }
    // 처음으로 사진을 문서에서 빼기 전의 원래 문서. 한 번만 쓰고 덮지 않는다.
    async ensureSnapshot(raw) {
      if (this.snapshot === 'saved' || this.snapshot === 'exists') return true;
      if (typeof raw !== 'string' || !raw) return false;
      try {
        const existing = await this._snapshotTransaction('readonly', store => { const holder = {}; const request = store.get(ORIGINAL_ID); request.onsuccess = () => { holder.value = request.result; }; return holder; });
        if (existing.value) { this.snapshot = 'exists'; return true; }
        await this._snapshotTransaction('readwrite', store => { store.put({id: ORIGINAL_ID, raw, savedAt: new Date().toISOString()}); });
        this.snapshot = 'saved'; return true;
      } catch (_) { this.snapshot = 'failed'; return false; }
    }
    async getSnapshot() {
      const holder = await this._snapshotTransaction('readonly', store => { const holder = {}; const request = store.get(ORIGINAL_ID); request.onsuccess = () => { holder.value = request.result; }; return holder; });
      return holder.value || null;
    }
    // 부팅: 문서가 가리키는 보관본을 읽어 캐시에 두고 빈 자리를 채울 준비를 한다.
    async prime(rawOrTrips) {
      let trips;
      try { trips = typeof rawOrTrips === 'string' ? JSON.parse(rawOrTrips) : rawOrTrips == null ? [] : rawOrTrips; }
      catch (error) { return {loaded: 0, missing: [], error: '여행 문서를 읽지 못했습니다.'}; }
      const ids = [];
      let inline = 0, anyInline = 0;
      forEachPhoto(trips, (entry, index) => {
        const id = entry.mediaIds?.[index], photo = entry.photos?.[index];
        if (validId(id) && (photo === '' || isData(photo))) ids.push(id);
        if (isData(photo)) anyInline++;
      });
      let error = '';
      if (ids.length) {
        try { for (const [id, value] of await this._load(ids)) this.cache.set(id, value); }
        catch (failure) { error = failure.message || String(failure); }
      }
      forEachPhoto(trips, (entry, index) => { if (isData(entry.photos?.[index]) && this._cached(entry, index)) inline++; });
      // 문서 안에 사진이 남아 있으면 처음 빼기 전에 원래 문서를 보관한다. 보관하지 못하면 빼지 않는다.
      // 새로 찍은 사진은 저장 뒤 대조를 거쳐 옮기므로(지출 사진과 같음) 문서에 사진이 없던 기기는 보관할 원문이 없다.
      this.ready = anyInline ? await this.ensureSnapshot(typeof rawOrTrips === 'string' ? rawOrTrips : JSON.stringify(trips)) : true;
      this.hydrate(trips);
      return {loaded: this.cache.size, projectable: this.ready ? inline : 0, missing: this.missingReferences(), snapshot: this.snapshot, ...(error ? {error} : {})};
    }
    // 저장 뒤: 문서에 남은 사진을 보관본과 대조하거나 새로 보관한다. 문서에 쓸 mediaId 변경(patches)을 돌려준다.
    async adopt(trips, {raw} = {}) {
      const verify = [], archive = [];
      forEachPhoto(trips, (entry, index, place) => {
        const photo = entry.photos?.[index];
        if (!isData(photo) || this._cached(entry, index)) return;
        const id = entry.mediaIds?.[index];
        (validId(id) && !this.cache.has(id) ? verify : archive).push({entry, index, place, photo, id});
      });
      if (!verify.length && !archive.length) return {verified: 0, archived: []};
      if (!this.ready) this.ready = await this.ensureSnapshot(raw);
      if (!this.ready) return {verified: 0, archived: [], error: '원래 문서를 보관하지 못해 사진을 옮기지 않았습니다.'};
      let verified = 0;
      const found = verify.length ? await this._load(verify.map(item => item.id)) : new Map();
      for (const item of verify) {
        const value = found.get(item.id);
        if (value && value.source === item.photo) { this.cache.set(item.id, value); verified++; }
        else archive.push({...item, id: null});
      }
      const patches = [];
      for (const item of archive) {
        try {
          const original = await this.toBlob(item.photo);
          const thumbSource = item.entry.photoThumbnails?.[item.index];
          const thumbnail = isData(thumbSource) ? await this.toBlob(thumbSource) : original;
          const id = this.makeId();
          await this.media.save({id, tripId: item.place.tripId, original, thumbnail, sourceHash: sourceHash(item.photo), createdAt: new Date().toISOString(), migratedFrom: 'record-inline'});
          // 다시 읽어 같은 사진인지 확인한 뒤에만 연결한다.
          const value = (await this._load([id])).get(id);
          if (!value || value.source !== item.photo) continue;
          this.cache.set(id, value);
          patches.push({...item.place, index: item.index, source: item.photo, mediaId: id});
        } catch (_) { /* 이 사진은 문서에 그대로 남는다. 다음 저장 때 다시 시도한다. */ }
      }
      return {verified, archived: patches};
    }
    // adopt가 돌려준 mediaId를 지금 여행 목록에 붙인다. 그 사이 사진이 바뀐 자리는 건너뛴다.
    applyPatches(trips, patches) {
      let applied = 0;
      const byPlace = new Map();
      (patches || []).forEach(patch => { const key = `${patch.tripId}\u0000${patch.field}\u0000${patch.key}`; byPlace.set(key, [...(byPlace.get(key) || []), patch]); });
      const next = mapEntries(trips, (entry, place) => {
        const list = byPlace.get(`${place.tripId}\u0000${place.field}\u0000${place.key}`);
        if (!list) return entry;
        let mediaIds = null;
        for (const patch of list) {
          if (entry.photos?.[patch.index] !== patch.source) continue;
          mediaIds = mediaIds || (Array.isArray(entry.mediaIds) ? entry.mediaIds.slice() : []);
          while (mediaIds.length < entry.photos.length) mediaIds.push(null);
          mediaIds[patch.index] = patch.mediaId; applied++;
        }
        return mediaIds ? {...entry, mediaIds} : entry;
      });
      return {trips: next, applied};
    }
    // 저장 공간 화면용 집계.
    stats(trips) {
      const result = {total: 0, stored: 0, inline: 0, missing: 0};
      forEachPhoto(trips, (entry, index) => {
        const photo = entry.photos?.[index], id = entry.mediaIds?.[index];
        if (!photo && !validId(id)) return;
        result.total++;
        if (photo === '' && validId(id) && !this.cache.has(id)) result.missing++;
        else if (isData(photo) && !this._cached(entry, index)) result.inline++;
        else result.stored++;
      });
      return result;
    }
  }
  RecordMediaStore.sourceHash = sourceHash;
  RecordMediaStore.FIELDS = FIELDS;
  root.SulsulTravel = root.SulsulTravel || {};
  root.SulsulTravel.RecordMediaStore = RecordMediaStore;
  root.SulsulTravel.recordMediaStore = new RecordMediaStore();
  if (root.SulsulTravel.mediaRepository) root.SulsulTravel.mediaRepository.onStored = value => root.SulsulTravel.recordMediaStore.remember(value);
  if (typeof module !== 'undefined' && module.exports) module.exports = RecordMediaStore;
})(typeof window !== 'undefined' ? window : globalThis);
