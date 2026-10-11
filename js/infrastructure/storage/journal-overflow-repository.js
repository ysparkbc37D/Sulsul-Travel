/* 저장 공간이 부족할 때 글과 원래 날짜 연결을 보관한다. 사진은 본 여행 문서에 남긴다. */
(function (root) {
  'use strict';

  const DB_NAME = 'sulsul-travel-overflow-v1';
  const STORE_NAME = 'journals';

  class JournalOverflowRepository {
    constructor(indexedDb = root.indexedDB) {
      this.indexedDb = indexedDb;
    }

    open() {
      if (!this.indexedDb) return Promise.reject(new Error('INDEXEDDB_UNAVAILABLE'));
      return new Promise((resolve, reject) => {
        const request = this.indexedDb.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains(STORE_NAME)) {
            request.result.createObjectStore(STORE_NAME, { keyPath: 'key' });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('INDEXEDDB_OPEN_FAILED'));
      });
    }

    async save(entry) {
      if (!entry || typeof entry.tripId !== 'string' || !Number.isInteger(entry.dayIndex)) {
        throw new TypeError('INVALID_JOURNAL_OVERFLOW');
      }
      const db = await this.open();
      const dayId = typeof entry.journal?.dayId === 'string' ? entry.journal.dayId : typeof entry.dayId === 'string' ? entry.dayId : '';
      const date = typeof entry.journal?.date === 'string' ? entry.journal.date : typeof entry.date === 'string' ? entry.date : '';
      const value = {
        key: `${entry.tripId}:${dayId ? `day:${dayId}` : date ? `date:${date}` : entry.dayIndex}`,
        tripId: entry.tripId,
        dayIndex: entry.dayIndex,
        ...(dayId ? {dayId} : {}),
        ...(date ? {date} : {}),
        revision: Number.isInteger(entry.revision) ? entry.revision : 0,
        journal: {
          ...(typeof entry.journal?.id === 'string' ? {id:entry.journal.id} : {}),
          ...(dayId ? {dayId} : {}),
          ...(date ? {date} : {}),
          ...(entry.journal?.journalIdentityVersion === 1 || dayId || date ? {journalIdentityVersion:1} : {}),
          originalText: String(entry.journal?.originalText || ''),
          text: String(entry.journal?.text || ''),
          aiDraftAcceptedAt: String(entry.journal?.aiDraftAcceptedAt || '')
        },
        updatedAt: new Date().toISOString()
      };
      try {
        await new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).put(value);
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error || new Error('INDEXEDDB_WRITE_FAILED'));
          tx.onabort = () => reject(tx.error || new Error('INDEXEDDB_WRITE_ABORTED'));
        });
      } finally {
        db.close();
      }
      return value;
    }

    async loadAll() {
      const db = await this.open();
      try {
        return await new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const request = tx.objectStore(STORE_NAME).getAll();
          request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
          request.onerror = () => reject(request.error || new Error('INDEXEDDB_READ_FAILED'));
        });
      } finally {
        db.close();
      }
    }

    async deleteTrip(tripId) {
      if (typeof tripId !== 'string' || !tripId) throw new TypeError('INVALID_TRIP_ID');
      const db = await this.open();
      try {
        return await new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          let deleted = 0;
          const request = store.getAll();
          request.onsuccess = () => {
            for (const entry of request.result || []) {
              // 가져온 여행의 ID에 콜론이 있어도 다른 여행의 글을 지우지 않는다.
              if (entry?.tripId === tripId && typeof entry.key === 'string') {
                store.delete(entry.key);
                deleted += 1;
              }
            }
          };
          request.onerror = () => reject(request.error || new Error('INDEXEDDB_READ_FAILED'));
          tx.oncomplete = () => resolve(deleted);
          tx.onerror = () => reject(tx.error || new Error('INDEXEDDB_DELETE_FAILED'));
          tx.onabort = () => reject(tx.error || new Error('INDEXEDDB_DELETE_ABORTED'));
        });
      } finally {
        db.close();
      }
    }

    async clearAll() {
      const db = await this.open();
      try {
        return await new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).clear();
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error || new Error('INDEXEDDB_CLEAR_FAILED'));
          tx.onabort = () => reject(tx.error || new Error('INDEXEDDB_CLEAR_ABORTED'));
        });
      } finally {
        db.close();
      }
    }
  }

  root.SulsulTravel = root.SulsulTravel || {};
  root.SulsulTravel.JournalOverflowRepository = JournalOverflowRepository;
})(typeof window !== 'undefined' ? window : globalThis);
