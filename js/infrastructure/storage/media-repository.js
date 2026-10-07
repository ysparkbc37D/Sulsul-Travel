/* 보관 이미지는 비율을 유지하고, 화면용 썸네일과 별도 Blob으로 보관한다.
 * photos[]의 data URL은 기존 동기 JSON 백업·공유·PDF를 위한 복원 가능한 사본이다. */
(function (root) {
  'use strict';
  const DB_NAME = 'sulsul-travel-media-v1', STORE_NAME = 'photos';
  function safeSource(value) {
    if (typeof value !== 'string') return '';
    if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=\s]+$/.test(value)) return value;
    try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; } catch (_) { return ''; }
  }
  function dimensions(width, height, limit) {
    if (!(width > 0 && height > 0 && limit > 0)) throw new TypeError('INVALID_PHOTO_SIZE');
    const scale = Math.min(1, limit / Math.max(width, height));
    return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
  }
  function sourceHash(value) { let hash=2166136261;for(let i=0;i<value.length;i++)hash=Math.imul(hash^value.charCodeAt(i),16777619);return `${value.length}:${hash>>>0}`; }
  const readDataUrl = blob => new Promise((resolve, reject) => {
    const reader = new root.FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('사진을 읽지 못했습니다.'));
    reader.readAsDataURL(blob);
  });
  const canvasBlob = canvas => new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('사진을 처리하지 못했습니다.')), 'image/jpeg', .85));
  class MediaRepository {
    constructor(indexedDb = root.indexedDB) { this.indexedDb = indexedDb; this.urls = new Set(); }
    static dimensions(width, height, limit = 1600) { return dimensions(width, height, limit); }
    static photoSource(record, index = 0, { thumbnail = false } = {}) {
      const full = Array.isArray(record) ? record[index] : record?.photos?.[index];
      const thumb = !Array.isArray(record) && record?.photoThumbnails?.[index];
      return safeSource(thumbnail ? thumb : full) || safeSource(full);
    }
    open() {
      if (!this.indexedDb) return Promise.reject(new Error('INDEXEDDB_UNAVAILABLE'));
      return new Promise((resolve, reject) => {
        const request = this.indexedDb.open(DB_NAME, 1);
        request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: 'id' }); };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('INDEXEDDB_OPEN_FAILED'));
        request.onblocked = () => reject(new Error('INDEXEDDB_BLOCKED'));
      });
    }
    async save(value) {
      if (!value?.id || !(value.original instanceof root.Blob) || !(value.thumbnail instanceof root.Blob)) throw new TypeError('INVALID_MEDIA');
      const db = await this.open();
      try {
        await new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite'); tx.objectStore(STORE_NAME).put(value);
          tx.oncomplete = resolve; tx.onerror = tx.onabort = () => reject(tx.error || new Error('INDEXEDDB_WRITE_FAILED'));
        });
      } finally { db.close(); }
      return value.id;
    }
    async get(id) {
      if (!id) return null;
      const db = await this.open();
      try {
        return await new Promise((resolve, reject) => {
          const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(id);
          request.onsuccess = () => resolve(request.result || null); request.onerror = () => reject(request.error || new Error('INDEXEDDB_READ_FAILED'));
        });
      } finally { db.close(); }
    }
    async prune(retainedTrips, { tripId } = {}) {
      // 문서 저장이 성공한 뒤의 전체 여행 목록만 받는다. 사본의 참조도 보관본을 지킨다.
      if (!Array.isArray(retainedTrips)) throw new TypeError('INVALID_RETAINED_TRIPS');
      if (tripId !== undefined && (typeof tripId !== 'string' || !tripId)) throw new TypeError('INVALID_MEDIA_TRIP_ID');
      const referenced = new Set(), visited = new WeakSet(), pending = [retainedTrips];
      while (pending.length) {
        const value = pending.pop();
        if (!value || typeof value !== 'object' || visited.has(value)) continue;
        visited.add(value);
        for (const [key, child] of Object.entries(value)) {
          if (key === 'mediaIds' && Array.isArray(child)) child.forEach(id => { if (typeof id === 'string' && id) referenced.add(id); });
          if (child && typeof child === 'object') pending.push(child);
        }
      }
      const db = await this.open();
      try {
        return await new Promise((resolve, reject) => {
          let deleted = 0;
          const tx = db.transaction(STORE_NAME, 'readwrite'), request = tx.objectStore(STORE_NAME).openCursor();
          tx.oncomplete = () => resolve(deleted);
          tx.onerror = tx.onabort = () => reject(tx.error || new Error('INDEXEDDB_PRUNE_FAILED'));
          request.onerror = () => reject(request.error || new Error('INDEXEDDB_PRUNE_FAILED'));
          request.onsuccess = () => {
            const cursor = request.result;
            if (!cursor) return;
            if (!referenced.has(cursor.primaryKey) && (tripId === undefined || cursor.value.tripId === tripId)) { cursor.delete(); deleted++; }
            cursor.continue();
          };
        });
      } finally { db.close(); }
    }
    async prepare(file, { tripId = '', store = true, maxDimension = 1600 } = {}) {
      if (!file || file.size > 20 * 1024 * 1024) throw new Error('사진 한 장은 20MB 이하로 선택해 주세요.');
      if (file.type && !file.type.startsWith('image/')) throw new Error('사진 파일을 선택해 주세요.');
      const objectUrl = root.URL.createObjectURL(file), img = new root.Image();
      try {
        await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = () => reject(new Error('사진을 읽지 못했습니다. JPEG 또는 PNG 사진으로 다시 선택해 주세요.')); img.src = objectUrl; });
        const render = limit => {
          const size = dimensions(img.naturalWidth || img.width, img.naturalHeight || img.height, limit);
          const canvas = root.document.createElement('canvas'); canvas.width = size.width; canvas.height = size.height;
          const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('사진을 처리하지 못했습니다.');
          ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, size.width, size.height); ctx.drawImage(img, 0, 0, size.width, size.height);
          return { canvas, ...size };
        };
        const full = render(maxDimension), small = render(448);
        const original = await canvasBlob(full.canvas), thumbnail = await canvasBlob(small.canvas);
        const source = await readDataUrl(original), thumbnailSource = await readDataUrl(thumbnail);
        const id = `media_${root.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;
        let stored = false;
        // 브라우저가 IndexedDB를 제한해도 data URL을 이용한 기존 저장을 계속할 수 있다.
        if (store) { try { await this.save({ id, tripId, original, thumbnail, sourceHash: sourceHash(source), width: full.width, height: full.height, createdAt: new Date().toISOString() }); stored = true; } catch (_) {} }
        return { source, thumbnail: thumbnailSource, mediaId: stored ? id : null, width: full.width, height: full.height, stored };
      } finally { root.URL.revokeObjectURL(objectUrl); }
    }
    async resolve(record, index = 0, { thumbnail = false } = {}) {
      const fallback = MediaRepository.photoSource(record, index, { thumbnail }), id = record?.mediaIds?.[index];
      if (!id) return fallback;
      try {
        const value = await this.get(id);
        // 가져온 JSON의 사진과 같은 보관본인지 확인해 여행 간 잘못된 Blob 연결을 막는다.
        if(value?.sourceHash!==sourceHash(MediaRepository.photoSource(record,index)))return fallback;
        const blob = thumbnail ? value?.thumbnail : value?.original;
        if (!blob) return fallback;
        const url = root.URL.createObjectURL(blob); this.urls.add(url); return url;
      } catch (_) { return fallback; }
    }
    release(url) { if (this.urls.delete(url)) root.URL.revokeObjectURL(url); }
  }
  root.SulsulTravel = root.SulsulTravel || {};
  root.SulsulTravel.MediaRepository = MediaRepository;
  root.SulsulTravel.mediaRepository = new MediaRepository();
  if (typeof module !== 'undefined' && module.exports) module.exports = MediaRepository;
})(typeof window !== 'undefined' ? window : globalThis);
