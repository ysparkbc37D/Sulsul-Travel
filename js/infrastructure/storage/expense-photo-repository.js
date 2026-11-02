/* 지출 사진 보관본은 완료된 IndexedDB 거래만 JSON에서 분리한다. 원본 참조와 구 백업을 보존한다. */
(function (root) {
  'use strict';
  const DB_NAME = 'sulsul-travel-expense-photos-v1', STORE_NAME = 'archives';
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const validId = value => typeof value === 'string' && !!value && !/[\s'"<>`\\;&]/.test(value);
  let sequence = 0;
  function hashPhotos(serialized) {
    let hash = 2166136261;
    for (let index = 0; index < serialized.length; index++) hash = Math.imul(hash ^ serialized.charCodeAt(index), 16777619);
    return serialized.length + ':' + (hash >>> 0).toString(36);
  }
  function safePhoto(value) {
    if (typeof value !== 'string') return false;
    if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=\s]+$/.test(value)) return true;
    try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch (_) { return false; }
  }
  function validRef(value) {
    return object(value) && validId(value.id) && Number.isSafeInteger(value.count) && value.count > 0 && typeof value.hash === 'string' && /^\d+:[a-z0-9]+$/.test(value.hash);
  }
  function photoArray(value) { return Array.isArray(value) && value.length > 0 && value.every(safePhoto); }
  function fullDataPhotos(value) { return photoArray(value) && value.some(photo => photo.startsWith('data:image/')); }
  function copyTrips(trips, visit) {
    if (!Array.isArray(trips)) throw new TypeError('지출 사진의 여행 목록을 확인해 주세요.');
    return trips.map(trip => {
      if (!object(trip) || !Array.isArray(trip.expenses)) return trip;
      return {...trip,expenses:trip.expenses.map(expense => object(expense) ? visit(expense,trip) : expense)};
    });
  }
  class ExpensePhotoRepository {
    constructor(indexedDb = root.indexedDB, {timeoutMs = 5000} = {}) {
      this.indexedDb = indexedDb;
      this.timeoutMs = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 5000;
      this.cache = new Map();
      this.missing = [];
    }
    _transaction(mode, work) {
      if (!this.indexedDb) return Promise.reject(new Error('사진 보관 저장소를 사용할 수 없습니다.'));
      return new Promise((resolve,reject) => {
        let db, tx, settled = false, result;
        const finish = (error,value) => {
          if (settled) return;
          settled = true; clearTimeout(timer);
          if (error && tx) { try { tx.abort(); } catch (_) {} }
          if (db) db.close();
          if (error) reject(error); else resolve(value);
        };
        const timer = setTimeout(() => finish(new Error('사진 보관 시간이 초과되었습니다. 입력을 유지한 채 다시 저장해 주세요.')),this.timeoutMs);
        let request;
        try { request = this.indexedDb.open(DB_NAME,1); }
        catch (error) { finish(error); return; }
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME,{keyPath:'id'});
        };
        request.onerror = () => finish(request.error || new Error('사진 보관 저장소를 열지 못했습니다.'));
        request.onblocked = () => finish(new Error('다른 창이 사진 보관 저장소를 사용 중입니다. 다시 시도해 주세요.'));
        request.onsuccess = () => {
          db = request.result;
          if (settled) { db.close(); return; }
          try {
            tx = db.transaction(STORE_NAME,mode);
            tx.oncomplete = () => finish(null,result);
            tx.onerror = tx.onabort = () => finish(tx.error || new Error('사진을 보관하지 못했습니다.'));
            result = work(tx.objectStore(STORE_NAME));
          } catch (error) { finish(error); }
        };
      });
    }
    _row(value,ref) {
      if (!validRef(ref) || !object(value) || value.id !== ref.id || !photoArray(value.photos) || value.photos.length !== ref.count) return null;
      const serialized = JSON.stringify(value.photos);
      if (value.count !== ref.count || value.hash !== ref.hash || hashPhotos(serialized) !== ref.hash) return null;
      return {id:value.id,count:value.count,hash:value.hash,photos:[...value.photos],serialized};
    }
    _matches(expense) {
      const ref = expense.expensePhotoArchive;
      if (!validRef(ref) || !photoArray(expense.photos)) return false;
      const cached = this.cache.get(ref.id);
      return !!cached && cached.count === ref.count && cached.hash === ref.hash && cached.serialized === JSON.stringify(expense.photos);
    }
    async prepare(trips, {tripId} = {}) {
      if (tripId !== undefined && !validId(tripId)) throw new TypeError('사진을 보관할 여행을 확인해 주세요.');
      const pending = [];
      const next = copyTrips(trips,(expense,trip) => {
        if (!fullDataPhotos(expense.photos) || this._matches(expense)) return expense;
        const photos = [...expense.photos], serialized = JSON.stringify(photos);
        const id = 'expense-photo_' + (root.crypto?.randomUUID?.() || Date.now().toString(36) + '_' + (++sequence).toString(36) + '_' + Math.random().toString(36).slice(2));
        const ref = {id,count:photos.length,hash:hashPhotos(serialized)};
        pending.push({id,tripId:trip.id,expenseId:expense.id || '',photos,...ref,createdAt:new Date().toISOString()});
        return {...expense,photos,expensePhotoArchive:ref};
      });
      if (!pending.length) return next;
      // request.onsuccess가 아니라 거래 전체 완료가 보관 성공의 기준이다.
      await this._transaction('readwrite',store => { pending.forEach(value => store.put(value)); });
      pending.forEach(value => { const cached = this._row(value,value); if (cached) this.cache.set(value.id,cached); });
      return next;
    }
    project(trips) {
      return copyTrips(trips,expense => this._matches(expense) ? {...expense,photos:[]} : expense);
    }
    async prime(rawOrTrips) {
      const trips = typeof rawOrTrips === 'string' ? JSON.parse(rawOrTrips) : rawOrTrips == null ? [] : rawOrTrips;
      const refs = new Map();
      copyTrips(trips,expense => {
        const ref = expense.expensePhotoArchive;
        if (validRef(ref) && (!Array.isArray(expense.photos) || !expense.photos.length)) refs.set(ref.id,ref);
        return expense;
      });
      let error = '';
      if (refs.size) {
        try {
          const values = await this._transaction('readonly',store => {
            const loaded = new Map();
            for (const id of refs.keys()) {
              const request = store.get(id);
              request.onsuccess = () => loaded.set(id,request.result);
            }
            return loaded;
          });
          for (const [id,ref] of refs) {
            const row = this._row(values.get(id),ref);
            if (row) this.cache.set(id,row); else this.cache.delete(id);
          }
        } catch (failure) {
          error = failure.message || String(failure);
        }
      }
      this.hydrate(trips);
      return {loaded:[...refs.keys()].filter(id => this.cache.has(id)).length,missing:this.missingReferences(),...(error ? {error} : {})};
    }
    hydrate(trips) {
      const missing = [];
      const next = copyTrips(trips,(expense,trip) => {
        const ref = expense.expensePhotoArchive;
        if (!ref || Array.isArray(expense.photos) && expense.photos.length) return expense;
        const cached = validRef(ref) ? this.cache.get(ref.id) : null;
        if (cached && cached.count === ref.count && cached.hash === ref.hash) return {...expense,photos:[...cached.photos]};
        missing.push({tripId:trip.id,expenseId:expense.id || '',archiveId:typeof ref.id === 'string' ? ref.id : '',count:ref.count || 0});
        return expense;
      });
      this.missing = missing;
      return next;
    }
    missingReferences() { return this.missing.map(value => ({...value})); }
    portable(trips) {
      return copyTrips(this.hydrate(trips),expense => {
        const ref = expense.expensePhotoArchive;
        if (!ref) return expense;
        if (!validRef(ref) || !photoArray(expense.photos) || expense.photos.length < ref.count) throw new Error('불러오지 못한 지출 사진이 있어 완전한 파일을 만들 수 없습니다. 사진이 보관된 원래 기기에서 다시 백업해 주세요.');
        const {expensePhotoArchive,...portable} = expense;
        return {...portable,photos:[...expense.photos]};
      });
    }
  }
  root.SulsulTravel = root.SulsulTravel || {};
  root.SulsulTravel.ExpensePhotoRepository = ExpensePhotoRepository;
  root.SulsulTravel.expensePhotoRepository = new ExpensePhotoRepository();
  if (typeof module !== 'undefined' && module.exports) module.exports = ExpensePhotoRepository;
})(typeof window !== 'undefined' ? window : globalThis);
