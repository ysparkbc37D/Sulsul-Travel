/**
 * 여행 자료의 IndexedDB 저장소(3단계 3b 2차, v2.0.8).
 * - DB sulsul-travel-trips-v1: trips(여행 하나 = 레코드 하나 {slot, json}), meta('doc' = {version, order, …}).
 *   json은 옛 문서(st_trips_v2) 안 여행 하나와 같은 직렬화 문자열(사진을 뺀 사본)이다. 이전·대조·백업이 문자열 비교로 끝난다.
 *   저장할 때는 바뀐 여행만 쓴다. 기기 문서 한도(약 5MB) 대신 브라우저 저장소 한도를 쓴다.
 * - 다른 창 충돌: 같은 쓰기 거래 안에서 meta.version을 읽어, 이 창이 마지막으로 본 버전과 다르면 쓰지 않는다(STORAGE_CONFLICT).
 * - 처음 열 때 옛 문서를 옮긴다: 원문 보관(sulsul-travel-migration-v1) → 한 거래로 복사 → 다시 읽어 대조 → 옛 문서에 표시.
 *   옛 문서는 지우지 않고 끝에 줄바꿈 하나를 붙인다. 열려 있던 구버전 창은 원문이 달라져 저장을 거절당하고,
 *   되돌린 구버전이 새로 열리면 이전 시점의 자료를 본다. 구버전이 옛 문서를 바꾸면 다음 실행에서 찾아 따로 보관하고 알린다.
 *   30일이 지나면 옛 문서를 지운다(원문은 이전 보관본에 남는다).
 * - 이 저장소를 쓸 수 없으면 BACKEND_UNAVAILABLE을 던진다. 아직 옮긴 적이 없으면 부르는 쪽(TripStore)이 옛 문서로 계속 쓴다.
 */
(function (root) {
  'use strict';
  const Base = root.SulsulTravel && root.SulsulTravel.LegacyTripRepository;
  // 앞 스크립트가 불러와지지 않았으면(업데이트 중 무결성 검사 실패 등) 정의하지 않는다. 셸의 호환성 검사가 복구 화면을 연다.
  if (!Base) return;

  const DB_NAME = 'sulsul-travel-trips-v1', TRIPS = 'trips', META = 'meta', DOC = 'doc';
  const SNAPSHOT_DB = 'sulsul-travel-migration-v1', SNAPSHOT_STORE = 'snapshots', SNAPSHOT_ID = 'before-trip-store';
  const ADOPTED_KEY = 'st_trip_store_v1';
  const LEGACY_GRACE_MS = 30 * 24 * 60 * 60 * 1000;

  // 문자열 지문(cyrb53). 옛 문서가 바뀌었는지 확인하는 데만 쓴다.
  function fingerprint(text) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < text.length; i++) {
      const ch = text.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return `${text.length}:${(4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)}`;
  }
  function failure(code, message, cause) {
    const error = new Error(message);
    error.code = code;
    if (cause) error.cause = cause;
    return error;
  }
  const conflict = () => failure('STORAGE_CONFLICT', '다른 창에서 여행이 변경됐습니다. 작성 중인 내용을 보관하고 최신 여행을 다시 불러와 주세요.');
  const tokenOf = meta => meta ? `idb:${meta.version}` : null;
  // 여행 ID가 겹치는 옛 자료도 잃지 않도록, 같은 ID의 두 번째부터는 #번호를 붙인 자리에 둔다.
  function slotsFor(trips) {
    const seen = new Map();
    return trips.map(trip => {
      const id = String(trip && trip.id);
      const count = seen.get(id) || 0;
      seen.set(id, count + 1);
      return count ? `${id}#${count}` : id;
    });
  }
  const joinRaw = (order, slots) => `[${order.map(slot => slots.get(slot)).join(',')}]`;

  class IdbTripRepository extends Base {
    constructor(storage, options = {}) {
      super(storage, options);
      this.kind = 'indexedDB';
      this.indexedDb = Object.prototype.hasOwnProperty.call(options, 'indexedDB') ? options.indexedDB : root.indexedDB;
      this.dbName = options.dbName || DB_NAME;
      this.snapshotDbName = options.snapshotDbName || SNAPSHOT_DB;
      this.nowMs = options.nowMs || (() => Date.now());
      this.observedRaw = null;
      this.meta = null;
      this.committedSlots = new Map();
      this.committedOrder = [];
      this.dbPromise = null;
      this.migration = null;
      this.legacyReport = null;
    }

    static get ADOPTED_KEY() { return ADOPTED_KEY; }
    static fingerprint(text) { return fingerprint(text); }

    _open() {
      if (!this.dbPromise) {
        this.dbPromise = new Promise((resolve, reject) => {
          if (!this.indexedDb || typeof this.indexedDb.open !== 'function') { reject(failure('BACKEND_UNAVAILABLE', '이 브라우저에서 IndexedDB를 쓸 수 없습니다.')); return; }
          let request;
          try { request = this.indexedDb.open(this.dbName, 1); }
          catch (error) { reject(failure('BACKEND_UNAVAILABLE', '여행 저장소를 열지 못했습니다.', error)); return; }
          request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(TRIPS)) db.createObjectStore(TRIPS, { keyPath: 'slot' });
            if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
          };
          request.onsuccess = () => {
            const db = request.result;
            db.onversionchange = () => { db.close(); this.dbPromise = null; };
            resolve(db);
          };
          request.onerror = () => reject(failure('BACKEND_UNAVAILABLE', '여행 저장소를 열지 못했습니다.', request.error));
          request.onblocked = () => reject(failure('BACKEND_UNAVAILABLE', '다른 창이 여행 저장소를 쓰고 있습니다. 다른 창을 닫고 다시 열어 주세요.'));
        }).catch(error => { this.dbPromise = null; throw error; });
      }
      return this.dbPromise;
    }

    // work(stores, fail, set, step)는 동기로 요청만 건다. 거래가 끝나면 set으로 정한 값을 돌려준다.
    // step(fn)으로 감싼 요청 콜백에서 난 오류는 거래를 되돌리고 그 오류(예: QuotaExceededError)를 그대로 돌려준다.
    async _transaction(mode, work) {
      const db = await this._open();
      return new Promise((resolve, reject) => {
        let tx, failed = null, value;
        try { tx = db.transaction([TRIPS, META], mode); }
        catch (error) { this.dbPromise = null; reject(failure('BACKEND_UNAVAILABLE', '여행 저장소를 열지 못했습니다.', error)); return; }
        const fail = error => { if (!failed) failed = error; try { tx.abort(); } catch (_) {} };
        tx.oncomplete = () => resolve(value);
        tx.onabort = tx.onerror = () => reject(failed || (tx.error && tx.error.name === 'QuotaExceededError' ? tx.error : failure('STORAGE_WRITE_FAILED', '여행 저장소에 쓰지 못했습니다.', tx.error)));
        const step = fn => (...args) => { try { fn(...args); } catch (error) { fail(error); } };
        try { work({ trips: tx.objectStore(TRIPS), meta: tx.objectStore(META) }, fail, next => { value = next; }, step); }
        catch (error) { fail(error); }
      });
    }

    _readAll() {
      return this._transaction('readonly', ({ trips, meta }, fail, set) => {
        const holder = { meta: null, records: [] };
        set(holder);
        const doc = meta.get(DOC);
        doc.onsuccess = () => { holder.meta = doc.result || null; };
        const all = trips.getAll();
        all.onsuccess = () => { holder.records = all.result || []; };
      });
    }

    // meta만 고친다(version은 그대로). 같은 거래 안에서 읽고 쓰므로 다른 창의 저장을 덮지 않는다.
    _updateMeta(change) {
      return this._transaction('readwrite', ({ meta }, fail, set, step) => {
        const doc = meta.get(DOC);
        doc.onsuccess = step(() => {
          if (!doc.result) return;
          const next = change({ ...doc.result });
          meta.put(next, DOC);
          set(next);
        });
      });
    }

    _clear() {
      return this._transaction('readwrite', ({ trips, meta }) => { trips.clear(); meta.delete(DOC); });
    }

    // 원문 보관본(이전 저장소). keepExisting이면 이미 있는 보관본을 덮지 않는다.
    _snapshot(id, raw, { keepExisting = false } = {}) {
      return new Promise(resolve => {
        let request;
        try { request = this.indexedDb.open(this.snapshotDbName, 1); } catch (_) { resolve(false); return; }
        request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(SNAPSHOT_STORE)) request.result.createObjectStore(SNAPSHOT_STORE, { keyPath: 'id' }); };
        request.onerror = request.onblocked = () => resolve(false);
        request.onsuccess = () => {
          const db = request.result;
          try {
            const tx = db.transaction(SNAPSHOT_STORE, 'readwrite'), store = tx.objectStore(SNAPSHOT_STORE);
            tx.oncomplete = () => { db.close(); resolve(true); };
            tx.onabort = tx.onerror = () => { db.close(); resolve(false); };
            const existing = store.get(id);
            existing.onsuccess = () => {
              if (keepExisting && existing.result) return;
              store.put({ id, raw, savedAt: new Date(this.nowMs()).toISOString() });
            };
          } catch (_) { db.close(); resolve(false); }
        };
      });
    }

    async getSnapshot(id = SNAPSHOT_ID) {
      return new Promise(resolve => {
        let request;
        try { request = this.indexedDb.open(this.snapshotDbName, 1); } catch (_) { resolve(null); return; }
        request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(SNAPSHOT_STORE)) request.result.createObjectStore(SNAPSHOT_STORE, { keyPath: 'id' }); };
        request.onerror = request.onblocked = () => resolve(null);
        request.onsuccess = () => {
          const db = request.result;
          try {
            const get = db.transaction(SNAPSHOT_STORE, 'readonly').objectStore(SNAPSHOT_STORE).get(id);
            get.onsuccess = () => { db.close(); resolve(get.result || null); };
            get.onerror = () => { db.close(); resolve(null); };
          } catch (_) { db.close(); resolve(null); }
        };
      });
    }

    _setLegacy(raw) {
      try { this.storage.setItem(this.key, raw); return true; }
      catch (_) {
        try { if (typeof this.storage.removeItem === 'function') this.storage.removeItem(this.key); } catch (__) {}
        return false;
      }
    }

    // 옛 문서를 한 번 옮긴다. 다른 창이 먼저 옮겼으면 아무것도 하지 않는다.
    async _migrate(raw, parsed) {
      if (!await this._snapshot(SNAPSHOT_ID, raw, { keepExisting: true })) {
        throw failure('BACKEND_UNAVAILABLE', '옮기기 전 원문을 보관하지 못해 여행 자료를 옮기지 않았습니다.');
      }
      const order = slotsFor(parsed), jsons = parsed.map(trip => JSON.stringify(trip)), marked = `${raw}\n`;
      const meta = {
        version: 1, order, source: this.key, migratedAt: new Date(this.nowMs()).toISOString(), migratedChars: raw.length,
        legacyBefore: fingerprint(raw), legacyMark: fingerprint(marked)
      };
      const migrated = await this._transaction('readwrite', ({ trips, meta: metaStore }, fail, set, step) => {
        const existing = metaStore.get(DOC);
        existing.onsuccess = step(() => {
          if (existing.result) { set(false); return; }
          order.forEach((slot, index) => trips.put({ slot, json: jsons[index] }));
          metaStore.put(meta, DOC);
          set(true);
        });
      });
      if (!migrated) return;
      const check = await this._readAll(), stored = new Map(check.records.map(record => [record.slot, record.json]));
      const same = check.meta && check.meta.order.length === order.length && order.every((slot, index) => check.meta.order[index] === slot && stored.get(slot) === jsons[index]);
      if (!same) {
        try { await this._clear(); } catch (_) {}
        throw failure('BACKEND_UNAVAILABLE', '옮긴 여행 자료가 원문과 달라 이전을 취소했습니다. 기기 문서를 그대로 씁니다.');
      }
      if (!this._setLegacy(marked)) await this._updateMeta(current => ({ ...current, legacyMark: null }));
      try { this.storage.setItem(ADOPTED_KEY, 'indexeddb'); } catch (_) {}
      this.migration = { migrated: true, trips: order.length, chars: raw.length };
    }

    // 옮긴 뒤의 옛 문서: 표시 그대로면 30일 뒤 지우고, 구버전이 바꿨으면 따로 보관하고 알린다.
    async _checkLegacy(meta) {
      const legacy = this.storage.getItem(this.key);
      if (legacy === null || !meta.legacyMark) return;
      const print = fingerprint(legacy);
      if (print === meta.legacyMark) {
        if (meta.migratedAt && this.nowMs() - Date.parse(meta.migratedAt) > LEGACY_GRACE_MS) {
          try { if (typeof this.storage.removeItem === 'function') this.storage.removeItem(this.key); } catch (_) { return; }
          await this._updateMeta(current => ({ ...current, legacyMark: null, legacyRemovedAt: new Date(this.nowMs()).toISOString() }));
        }
        return;
      }
      // 다른 창이 옮긴 직후 아직 표시하지 않은 원문이면 표시만 한다.
      if (print === meta.legacyBefore) { this._setLegacy(`${legacy}\n`); return; }
      const id = `legacy-after-${this.nowMs()}`, saved = await this._snapshot(id, legacy);
      if (!saved) { this.legacyReport = { changed: true, snapshotId: null, chars: legacy.length }; return; }
      this._setLegacy(`${legacy}\n`);
      const now = this.storage.getItem(this.key);
      await this._updateMeta(current => ({ ...current, legacyMark: now === null ? null : fingerprint(now), legacySnapshots: [...(current.legacySnapshots || []), id].slice(-10) }));
      this.legacyReport = { changed: true, snapshotId: id, chars: legacy.length };
    }

    // 저장소 상태를 읽는다. 아직 옮기지 않았고 옛 문서가 정상이면 지금 옮긴다.
    async _ensureMigrated() {
      let state = await this._readAll();
      if (state.meta) { await this._checkLegacy(state.meta); return state; }
      const legacyRaw = this.storage.getItem(this.key);
      if (legacyRaw === null) return { meta: null, records: [], legacyRaw: null };
      let parsed;
      try {
        parsed = JSON.parse(legacyRaw);
        this.normalize(parsed);
      } catch (error) {
        return { meta: null, records: [], legacyRaw, legacyError: error && error.message === 'TRIPS_NOT_ARRAY' ? 'TRIPS_NOT_ARRAY' : 'CORRUPT_JSON' };
      }
      await this._migrate(legacyRaw, parsed);
      state = await this._readAll();
      return state;
    }

    async readRaw() {
      const state = await this._ensureMigrated();
      if (!state.meta) return state.legacyRaw === undefined ? null : state.legacyRaw;
      const slots = new Map(state.records.map(record => [record.slot, record.json]));
      return joinRaw(state.meta.order.filter(slot => slots.has(slot)), slots);
    }

    async currentToken() { return tokenOf((await this._readAll()).meta); }

    async loadAll() {
      const state = await this._ensureMigrated();
      this.meta = state.meta;
      this.observedRaw = tokenOf(state.meta);
      this.committedSlots = new Map();
      this.committedOrder = [];
      if (!state.meta) {
        if (state.legacyRaw === null) { this.committedTrips = []; return { trips: [], recoveredFromCorruption: false, backupKey: null, fresh: true }; }
        // 옮기지 못한 손상 문서: 지금까지와 같이 원문을 따로 두고 복구 모드로 시작한다(저장소는 비어 있다).
        const backupKey = `${this.key}_corrupt_${this.nowMs()}`;
        try { this.storage.setItem(backupKey, state.legacyRaw); } catch (_) {}
        return { trips: [], recoveredFromCorruption: true, backupKey, errorCode: state.legacyError };
      }
      const stored = new Map(state.records.map(record => [record.slot, record.json]));
      const trips = [], skipped = [];
      for (const slot of state.meta.order) {
        if (!stored.has(slot)) { skipped.push(slot); continue; }
        try {
          trips.push(this.normalize(this.restore([JSON.parse(stored.get(slot))]))[0]);
          this.committedSlots.set(slot, stored.get(slot));
          this.committedOrder.push(slot);
        } catch (_) {
          skipped.push(slot);
          await this._snapshot(`unreadable-${slot}-${this.nowMs()}`, stored.get(slot));
        }
      }
      this.committedTrips = this.clone(trips);
      return { trips, recoveredFromCorruption: false, backupKey: null, skipped, legacy: this.legacyReport, migration: this.migration };
    }

    async write(next, options = {}) {
      const expected = Object.prototype.hasOwnProperty.call(options, 'expectedRaw') ? options.expectedRaw : this.observedRaw;
      // 이 창이 본 적 없는 기준으로는 쓰지 않는다. 다른 창의 변경은 아래 거래 안에서 version으로 확인한다.
      if (expected !== this.observedRaw) throw conflict();
      const storedRaw = this.meta ? joinRaw(this.committedOrder, this.committedSlots) : null;
      this.beforeWrite({ next, storedRaw, approvedRemoteTripId: options.approvedRemoteTripId || null, approvedRecoveryRaw: options.approvedRecoveryRaw ?? null });
      const serialized = this.serialize(next);
      const order = slotsFor(serialized), jsons = serialized.map(trip => JSON.stringify(trip)), previous = this.committedSlots, keep = new Set(order);
      // 바뀐 것이 없으면 쓰지 않는다. 부팅 정규화 같은 빈 저장이 버전을 올려 다른 창의 다음 저장을 막지 않게 한다.
      // 다만 다른 창이 그사이 저장했으면 지금까지처럼 충돌로 알린다(이 창의 화면이 오래됐다는 뜻이다).
      if (this.meta && order.length === this.committedOrder.length && order.every((slot, index) => slot === this.committedOrder[index] && previous.get(slot) === jsons[index])) {
        if (tokenOf((await this._readAll()).meta) !== expected) throw conflict();
        this.committedTrips = this.clone(next);
        return;
      }
      const written = await this._transaction('readwrite', ({ trips, meta }, fail, set, step) => {
        const doc = meta.get(DOC);
        doc.onsuccess = step(() => {
          const current = doc.result || null;
          if (tokenOf(current) !== expected) { fail(conflict()); return; }
          order.forEach((slot, index) => { if (previous.get(slot) !== jsons[index]) trips.put({ slot, json: jsons[index] }); });
          for (const slot of previous.keys()) if (!keep.has(slot)) trips.delete(slot);
          const updated = { ...(current || { createdAt: new Date(this.nowMs()).toISOString() }), version: ((current && current.version) || 0) + 1, order, updatedAt: new Date(this.nowMs()).toISOString() };
          meta.put(updated, DOC);
          set(updated);
        });
      });
      this.meta = written;
      this.observedRaw = tokenOf(written);
      this.committedSlots = new Map(order.map((slot, index) => [slot, jsons[index]]));
      this.committedOrder = order;
      this.committedTrips = this.clone(next);
      try { if (this.storage.getItem(ADOPTED_KEY) !== 'indexeddb') this.storage.setItem(ADOPTED_KEY, 'indexeddb'); } catch (_) {}
    }

    async savePrepared(next, options = {}) {
      this.bump(next, options.bumpTripId);
      await this.write(next, options);
      return next;
    }

    async applyDraft(trips, options) {
      const prepared = this.prepareDraft(trips, options);
      if (prepared.result) return prepared.result;
      await this.write(prepared.next);
      return { status: 'applied', trips: prepared.next, duplicate: false };
    }

    async stats() {
      const state = await this._readAll();
      const chars = state.records.reduce((sum, record) => sum + ((record && record.json) || '').length, 0);
      const legacy = this.storage.getItem(this.key);
      return {
        kind: this.kind, chars, trips: state.meta ? state.meta.order.length : 0, version: state.meta ? state.meta.version : 0,
        migratedAt: (state.meta && state.meta.migratedAt) || null, legacyChars: legacy ? legacy.length : 0,
        legacySnapshots: (state.meta && state.meta.legacySnapshots) || []
      };
    }
  }

  root.SulsulTravel = root.SulsulTravel || {};
  root.SulsulTravel.IdbTripRepository = IdbTripRepository;
})(typeof window !== 'undefined' ? window : globalThis);
