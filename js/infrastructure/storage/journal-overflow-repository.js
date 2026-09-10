/**
 * IndexedDB overflow store for journal text when the legacy localStorage
 * document is full. Photos remain in the main trip document when possible;
 * this store keeps the user's writing recoverable until the document can be
 * compacted or exported.
 */
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
      const value = {
        key: `${entry.tripId}:${entry.dayIndex}`,
        tripId: entry.tripId,
        dayIndex: entry.dayIndex,
        revision: Number.isInteger(entry.revision) ? entry.revision : 0,
        journal: {
          originalText: String(entry.journal?.originalText || ''),
          text: String(entry.journal?.text || ''),
          aiDraftAcceptedAt: String(entry.journal?.aiDraftAcceptedAt || '')
        },
        updatedAt: new Date().toISOString()
      };
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(value);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error || new Error('INDEXEDDB_WRITE_FAILED'));
        tx.onabort = () => reject(tx.error || new Error('INDEXEDDB_WRITE_ABORTED'));
      });
      db.close();
      return value;
    }

    async loadAll() {
      const db = await this.open();
      const values = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const request = tx.objectStore(STORE_NAME).getAll();
        request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
        request.onerror = () => reject(request.error || new Error('INDEXEDDB_READ_FAILED'));
      });
      db.close();
      return values;
    }
  }

  root.SulsulTravel = root.SulsulTravel || {};
  root.SulsulTravel.JournalOverflowRepository = JournalOverflowRepository;
})(typeof window !== 'undefined' ? window : globalThis);
