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
        return {
          ...trip,
          revision: Number.isInteger(trip.revision) && trip.revision >= 0 ? trip.revision : 0,
          appliedAiJobIds: Array.isArray(trip.appliedAiJobIds) ? trip.appliedAiJobIds.slice(-50) : []
        };
      });
    }

    loadAll() {
      const raw = this.storage.getItem(this.key);
      if (!raw) return { trips: [], recoveredFromCorruption: false, backupKey: null };
      try {
        return { trips: this.normalize(JSON.parse(raw)), recoveredFromCorruption: false, backupKey: null };
      } catch (error) {
        const backupKey = `${this.key}_corrupt_${Date.now()}`;
        try { this.storage.setItem(backupKey, raw); } catch (_) {}
        return { trips: [], recoveredFromCorruption: true, backupKey,
          errorCode: error?.message === 'TRIPS_NOT_ARRAY' ? 'TRIPS_NOT_ARRAY' : 'CORRUPT_JSON' };
      }
    }

    saveAll(trips, { bumpTripId = null } = {}) {
      const next = this.normalize(this.clone(trips));
      if (bumpTripId) {
        const trip = next.find((item) => item.id === bumpTripId);
        if (trip) {
          trip.revision += 1;
          trip.updatedAt = this.now();
        }
      }
      this.storage.setItem(this.key, JSON.stringify(next));
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
      this.storage.setItem(this.key, JSON.stringify(next));
      return { status: 'applied', trips: next, duplicate: false };
    }
  }

  root.SulsulTravel = root.SulsulTravel || {};
  root.SulsulTravel.LegacyTripRepository = LegacyTripRepository;
})(typeof window !== 'undefined' ? window : globalThis);
