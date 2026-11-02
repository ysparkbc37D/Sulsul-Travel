/* 저장 완료 문서가 바뀌지 않았을 때, 교체된 사진의 명시 후보만 보조 저장소에서 지운다. */
(function (root) {
  'use strict';
  function conflict() {
    const error = new Error('사진 정리 중 다른 창에서 여행이 변경되었습니다. 새 저장 문서를 확인한 뒤 다시 시도해 주세요.');
    error.code = 'STORAGE_CONFLICT'; return error;
  }
  function candidates(value) {
    if (!Array.isArray(value) || value.some(id => typeof id !== 'string' || !id)) throw new TypeError('INVALID_PHOTO_CLEANUP_IDS');
    return new Set(value);
  }
  function references(trips) {
    const mediaIds = new Set(), expenseArchiveIds = new Set(), pending = [trips];
    while (pending.length) {
      const value = pending.pop();
      if (!value || typeof value !== 'object') continue;
      for (const [key,child] of Object.entries(value)) {
        if (key === 'mediaIds' && Array.isArray(child)) child.forEach(id => { if (typeof id === 'string' && id) mediaIds.add(id); });
        if (key === 'expensePhotoArchive' && child && typeof child.id === 'string' && child.id) expenseArchiveIds.add(child.id);
        if (child && typeof child === 'object') pending.push(child);
      }
    }
    return {mediaIds,expenseArchiveIds};
  }
  async function cleanup({indexedDB = root.indexedDB,storage = root.localStorage,expectedRaw,mediaIds = [],expenseArchiveIds = [],onExpenseDeleted,timeoutMs = 5000} = {}) {
    if (!storage || typeof storage.getItem !== 'function' || typeof expectedRaw !== 'string') throw new TypeError('INVALID_PHOTO_CLEANUP_DOCUMENT');
    const verify = () => { if (storage.getItem('st_trips_v2') !== expectedRaw) throw conflict(); };
    verify();
    let trips;
    try { trips = JSON.parse(expectedRaw); } catch (_) { throw new TypeError('INVALID_PHOTO_CLEANUP_DOCUMENT'); }
    if (!Array.isArray(trips)) throw new TypeError('INVALID_PHOTO_CLEANUP_DOCUMENT');
    const retained = references(trips), oldMedia = candidates(mediaIds), oldExpenses = candidates(expenseArchiveIds);
    for (const id of retained.mediaIds) oldMedia.delete(id);
    for (const id of retained.expenseArchiveIds) oldExpenses.delete(id);
    if (!oldMedia.size && !oldExpenses.size) return {mediaDeleted:0,expenseDeleted:0,skipped:false};
    if (!indexedDB || typeof indexedDB.open !== 'function') throw new Error('INDEXEDDB_UNAVAILABLE');
    const sweep = (database,storeName,ids) => {
      if (!ids.size) return Promise.resolve([]);
      return new Promise((resolve,reject) => {
        let db, tx, request, failure, settled = false, created = false;
        const deleted = [];
        const finish = (error) => {
          if (settled) return;
          settled = true; clearTimeout(timer);
          if (error && tx) { try { tx.abort(); } catch (_) {} }
          if (db) db.close();
          if (error) reject(error); else resolve(deleted);
        };
        const check = () => {
          try { verify(); return true; }
          catch (error) { failure = error; finish(error); return false; }
        };
        const timer = setTimeout(() => finish(new Error('사진 보조 저장소 정리 시간이 초과되었습니다.')),Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 5000);
        if (!check()) return;
        try { request = indexedDB.open(database,1); }
        catch (error) { finish(error); return; }
        request.onupgradeneeded = () => {
          // 없는 저장소를 정리하기 위해 새 DB를 만들지 않는다.
          created = true;
          try { request.transaction.abort(); } catch (_) {}
        };
        request.onblocked = () => finish(new Error('INDEXEDDB_BLOCKED'));
        request.onerror = () => finish(created ? null : request.error || new Error('INDEXEDDB_OPEN_FAILED'));
        request.onsuccess = () => {
          db = request.result;
          if (settled) { db.close(); return; }
          if (!check()) return;
          if (!db.objectStoreNames.contains(storeName)) { finish(); return; }
          try {
            tx = db.transaction(storeName,'readwrite');
            tx.oncomplete = () => { if (check()) finish(); };
            tx.onerror = tx.onabort = () => finish(failure || tx.error || new Error('INDEXEDDB_CLEANUP_FAILED'));
            const store = tx.objectStore(storeName);
            // ID별 get은 후보 밖의 업로드 초안·다른 사진을 검사하거나 지우지 않는다.
            for (const id of ids) {
              const get = store.get(id);
              get.onerror = () => finish(get.error || new Error('INDEXEDDB_CLEANUP_FAILED'));
              get.onsuccess = () => {
                if (settled || !check() || get.result === undefined) return;
                const deletion = store.delete(id);
                deletion.onerror = () => finish(deletion.error || new Error('INDEXEDDB_CLEANUP_FAILED'));
                deletion.onsuccess = () => { deleted.push(id); };
              };
            }
          } catch (error) { finish(error); }
        };
      });
    };
    // 두 DB를 하나의 원자 거래로 묶을 수는 없다. 각 거래 직전과 처리 중에 문서를 재검사한다.
    const removedMedia = await sweep('sulsul-travel-media-v1','photos',oldMedia);
    const removedExpenses = await sweep('sulsul-travel-expense-photos-v1','archives',oldExpenses);
    if (typeof onExpenseDeleted === 'function') for (const id of removedExpenses) onExpenseDeleted(id);
    return {mediaDeleted:removedMedia.length,expenseDeleted:removedExpenses.length,skipped:false};
  }
  const api = {cleanup};
  root.SulsulTravel = root.SulsulTravel || {};
  root.SulsulTravel.PhotoCleanup = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
