/**
 * Transaction-like boundary around the legacy st_trips_v2 document.
 * Keeps the existing no-build runtime while callers migrate away from direct writes.
 */
(function (root) {
  'use strict';

  class LegacyTripRepository {
    constructor(storage, options = {}) {
      if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
        throw new TypeError('A Storage-compatible adapter is required');
      }
      this.storage = storage;
      this.key = options.key || 'st_trips_v2';
      this.now = options.now || (() => new Date().toISOString());
      this.beforeWrite = options.beforeWrite || (() => {});
      this.serialize = options.serialize || (trips => trips);
      this.restore = options.restore || (trips => trips);
      this.observedRaw = this.storage.getItem(this.key);
      this.committedTrips = null;
      this.kind = 'localStorage';
    }

    // 저장 문서 원문(사진을 뺀 직렬화 사본). 부팅 때 사진 보관본을 준비하는 데 쓴다.
    async readRaw() { return this.storage.getItem(this.key); }

    async currentToken() { return this.storage.getItem(this.key); }

    // 저장 공간 화면용: 여행 문서가 차지하는 글자 수.
    async stats() { const raw = this.storage.getItem(this.key); return { kind: this.kind, chars: raw ? raw.length : 0, trips: null }; }

    clone(value) {
      return JSON.parse(JSON.stringify(value));
    }

    normalize(trips) {
      if (!Array.isArray(trips)) throw new TypeError('TRIPS_NOT_ARRAY');
      return trips.map((trip) => {
        if (!trip || typeof trip !== 'object' || typeof trip.id !== 'string' || !trip.id) {
          throw new TypeError('INVALID_TRIP');
        }
        // normalizeTrip 자체가 깊은 복사본을 만든다. 없는 환경에서만 직접 복사한다.
        const canonical = root.SulsulTravel?.TripAdapter?.normalizeTrip(trip) || this.clone(trip);
        return {
          ...canonical,
          revision: Number.isInteger(trip.revision) && trip.revision >= 0 ? trip.revision : 0,
          appliedAiJobIds: Array.isArray(trip.appliedAiJobIds) ? trip.appliedAiJobIds.slice(-50) : []
        };
      });
    }

    loadAll() {
      const raw = this.storage.getItem(this.key);
      this.observedRaw = raw;
      if (!raw) { this.committedTrips = []; return { trips: [], recoveredFromCorruption: false, backupKey: null, fresh: raw === null }; }
      try {
        const trips = this.normalize(this.restore(JSON.parse(raw)));
        this.committedTrips = this.clone(trips);
        return { trips, recoveredFromCorruption: false, backupKey: null };
      } catch (error) {
        const backupKey = `${this.key}_corrupt_${Date.now()}`;
        try { this.storage.setItem(backupKey, raw); } catch (_) {}
        return { trips: [], recoveredFromCorruption: true, backupKey,
          errorCode: error?.message === 'TRIPS_NOT_ARRAY' ? 'TRIPS_NOT_ARRAY' : 'CORRUPT_JSON' };
      }
    }

    write(next, options = {}) {
      const storedRaw = this.storage.getItem(this.key);
      const expectedRaw = Object.prototype.hasOwnProperty.call(options, 'expectedRaw') ? options.expectedRaw : this.observedRaw;
      if (storedRaw !== expectedRaw) {
        const error = new Error('다른 창에서 여행이 변경됐습니다. 작성 중인 내용을 보관하고 최신 여행을 다시 불러와 주세요.');
        error.code = 'STORAGE_CONFLICT';
        throw error;
      }
      this.beforeWrite({next, storedRaw, approvedRemoteTripId:options.approvedRemoteTripId || null, approvedRecoveryRaw:options.approvedRecoveryRaw ?? null});
      const raw = JSON.stringify(this.serialize(next));
      this.storage.setItem(this.key, raw);
      this.observedRaw = raw;
      this.committedTrips = this.clone(next);
    }

    getCommittedTrips() { return this.committedTrips === null ? null : this.clone(this.committedTrips); }

    // 저장 백엔드가 달라도 같은 규칙: revision이 맞을 때만 복사본에 change를 적용한다.
    prepareCommit(trips, {tripId, expectedRevision, change}) {
      const next = this.normalize(trips);
      const trip = next.find(item => item.id === tripId);
      if (!trip || trip.revision !== expectedRevision) {
        const error = new Error('편집을 시작한 뒤 여행이 변경됐습니다. 내용을 확인하고 다시 편집해 주세요.');
        error.code = 'REVISION_CONFLICT'; throw error;
      }
      change(trip);
      next[next.indexOf(trip)] = this.normalize([trip])[0];
      return next;
    }

    commit(trips, options) {
      return this.savePrepared(this.prepareCommit(trips, options), {bumpTripId:options.tripId});
    }

    saveAll(trips, options = {}) {
      return this.savePrepared(this.normalize(trips),options);
    }

    bump(next, bumpTripId) {
      if (!bumpTripId) return;
      const trip = next.find((item) => item.id === bumpTripId);
      if (trip) {
        trip.revision += 1;
        trip.updatedAt = this.now();
      }
    }

    savePrepared(next, options = {}) {
      this.bump(next, options.bumpTripId);
      this.write(next, options);
      return next;
    }

    // AI 초안: 같은 작업은 한 번만, revision이 다르면 쓰지 않는다. 쓸 목록(next)이나 바로 돌려줄 결과(result)를 만든다.
    prepareDraft(trips, { tripId, baseRevision, jobId, mutate }) {
      if (typeof mutate !== 'function') throw new TypeError('MUTATOR_REQUIRED');
      const next = this.normalize(trips);
      const trip = next.find((item) => item.id === tripId);
      if (!trip) return { result: { status: 'conflict', reason: 'TRIP_NOT_FOUND' } };
      if (trip.appliedAiJobIds.includes(jobId)) return { result: { status: 'applied', trips: next, duplicate: true } };
      if (trip.revision !== baseRevision) {
        return { result: { status: 'conflict', reason: 'REVISION_CONFLICT', currentRevision: trip.revision } };
      }
      mutate(trip);
      trip.revision += 1;
      trip.updatedAt = this.now();
      trip.appliedAiJobIds = [...trip.appliedAiJobIds, jobId].slice(-50);
      next[next.indexOf(trip)] = this.normalize([trip])[0];
      return { next };
    }

    applyDraft(trips, options) {
      const prepared = this.prepareDraft(trips, options);
      if (prepared.result) return prepared.result;
      this.write(prepared.next);
      return { status: 'applied', trips: prepared.next, duplicate: false };
    }
  }

  root.SulsulTravel = root.SulsulTravel || {};
  root.SulsulTravel.LegacyTripRepository = LegacyTripRepository;
})(typeof window !== 'undefined' ? window : globalThis);
