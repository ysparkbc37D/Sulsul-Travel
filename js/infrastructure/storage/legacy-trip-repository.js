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
      this.observedRaw = this.storage.getItem(this.key);
      this.committedTrips = null;
    }

    clone(value) {
      return JSON.parse(JSON.stringify(value));
    }

    normalize(trips) {
      if (!Array.isArray(trips)) throw new TypeError('TRIPS_NOT_ARRAY');
      return trips.map((trip) => {
        if (!trip || typeof trip !== 'object' || typeof trip.id !== 'string' || !trip.id) {
          throw new TypeError('INVALID_TRIP');
        }
        const canonical = root.SulsulTravel?.TripAdapter?.normalizeTrip(trip) || trip;
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
      if (!raw) { this.committedTrips = []; return { trips: [], recoveredFromCorruption: false, backupKey: null }; }
      try {
        const trips = this.normalize(JSON.parse(raw));
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
      const raw = JSON.stringify(next);
      this.storage.setItem(this.key, raw);
      this.observedRaw = raw;
      this.committedTrips = this.clone(next);
    }

    getCommittedTrips() { return this.committedTrips === null ? null : this.clone(this.committedTrips); }

    commit(trips, {tripId, expectedRevision, change}) {
      const next = this.normalize(this.clone(trips));
      const trip = next.find(item => item.id === tripId);
      if (!trip || trip.revision !== expectedRevision) {
        const error = new Error('편집을 시작한 뒤 여행이 변경됐습니다. 내용을 확인하고 다시 편집해 주세요.');
        error.code = 'REVISION_CONFLICT'; throw error;
      }
      change(trip);
      return this.saveAll(next, {bumpTripId:tripId});
    }

    saveAll(trips, options = {}) {
      const { bumpTripId = null } = options;
      const next = this.normalize(this.clone(trips));
      if (bumpTripId) {
        const trip = next.find((item) => item.id === bumpTripId);
        if (trip) {
          trip.revision += 1;
          trip.updatedAt = this.now();
        }
      }
      this.write(next, options);
      return next;
    }

    applyDraft(trips, { tripId, baseRevision, jobId, mutate }) {
      if (typeof mutate !== 'function') throw new TypeError('MUTATOR_REQUIRED');
      const next = this.normalize(this.clone(trips));
      const trip = next.find((item) => item.id === tripId);
      if (!trip) return { status: 'conflict', reason: 'TRIP_NOT_FOUND' };
      if (trip.appliedAiJobIds.includes(jobId)) return { status: 'applied', trips: next, duplicate: true };
      if (trip.revision !== baseRevision) {
        return { status: 'conflict', reason: 'REVISION_CONFLICT', currentRevision: trip.revision };
      }
      mutate(trip);
      trip.revision += 1;
      trip.updatedAt = this.now();
      trip.appliedAiJobIds = [...trip.appliedAiJobIds, jobId].slice(-50);
      const canonical = this.normalize(next);
      this.write(canonical);
      return { status: 'applied', trips: canonical, duplicate: false };
    }
  }

  root.SulsulTravel = root.SulsulTravel || {};
  root.SulsulTravel.LegacyTripRepository = LegacyTripRepository;
})(typeof window !== 'undefined' ? window : globalThis);
