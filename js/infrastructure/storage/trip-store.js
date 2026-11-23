/**
 * 여행 저장의 비동기 명령 경계(3b).
 * - 모든 저장은 한 줄로 차례대로 실행한다. 앞 저장이 끝나야 다음 저장이 시작된다.
 * - 각 저장은 시작하는 순간의 목록(getTrips)을 기준으로 삼고, 저장에 성공한 그 작업 안에서 목록을 바꾼다(setTrips).
 *   그래서 기다리는 사이 다른 저장이 끝나도 그 결과를 덮지 않는다.
 * - 저장 백엔드는 같은 메서드를 가진 객체다. 지금은 localStorage(LegacyTripRepository, 동기)이고
 *   IndexedDB 백엔드(비동기)로 바꿔도 부르는 쪽은 그대로다.
 */
(function (root) {
  'use strict';

  function staleError() {
    const error = new Error('다른 저장이 먼저 끝나 이 변경의 기준이 바뀌었습니다. 내용을 확인하고 다시 저장해 주세요.');
    error.code = 'STORAGE_CONFLICT';
    return error;
  }

  class TripStore {
    constructor(backend, { getTrips, setTrips } = {}) {
      if (!backend || typeof backend.saveAll !== 'function') throw new TypeError('A trip storage backend is required');
      this.backend = backend;
      this.getTrips = getTrips || (() => this.current || []);
      this.setTrips = setTrips || (trips => { this.current = trips; });
      this.tail = Promise.resolve();
      this.pending = 0;
      // 이 창에서 성공한 저장 수(진단용).
      this.sequence = 0;
    }

    // 목록의 기준 지문: 여행 ID와 revision의 순서 있는 목록. 저장 명령은 여행을 더하거나 빼거나 revision을 올리므로,
    // 호출할 때와 실행할 때 지문이 같으면 그 사이 의미 있는 저장이 없었다(화면 구조 보정처럼 revision을 올리지 않는 저장은 제외).
    signature(trips) {
      return (Array.isArray(trips) ? trips : []).map(trip => `${trip?.id}:${trip?.revision ?? 0}`).join('|');
    }

    // 앞선 작업이 실패해도 다음 작업은 실행한다. 각 호출은 자기 결과(성공·실패)만 받는다.
    run(task) {
      this.pending += 1;
      const result = this.tail.then(() => task()).finally(() => { this.pending -= 1; });
      this.tail = result.catch(() => {});
      return result;
    }

    // 지금까지 맡긴 저장이 모두 끝날 때까지 기다린다(성공·실패와 무관).
    idle() { return this.tail; }

    get busy() { return this.pending > 0; }

    // 이 창이 마지막으로 읽거나 쓴 저장 문서의 식별값. 다른 창의 변경을 미리 감지할 때 비교한다.
    token() { return this.backend.observedRaw ?? null; }

    getCommittedTrips() { return this.backend.getCommittedTrips(); }

    // 읽기도 줄에 세워 쓰는 도중의 문서를 읽지 않게 한다. 목록 반영은 부르는 쪽(부팅)이 정한다.
    loadAll() { return this.run(async () => this.backend.loadAll()); }

    // 저장 문서를 다시 읽어 목록을 바꾼다(읽기 전용 여행을 고치려 한 뒤 등).
    reload() {
      return this.run(async () => {
        const loaded = await this.backend.loadAll();
        if (!loaded.recoveredFromCorruption) this.setTrips(loaded.trips);
        return loaded;
      });
    }

    // 여행 하나를 고친다. expectedRevision을 주지 않으면 실행하는 순간의 revision을 쓴다(즉시 조작).
    commit({ tripId, expectedRevision, change }) {
      return this.run(async () => {
        const trips = this.getTrips();
        const revision = expectedRevision === undefined ? trips.find(item => item.id === tripId)?.revision : expectedRevision;
        const next = await this.backend.commit(trips, { tripId, expectedRevision: revision, change });
        this.sequence += 1;
        this.setTrips(next);
        return next;
      });
    }

    // 목록 전체를 저장한다. trips가 함수면 실행하는 순간의 목록으로 새 목록을 만든다.
    // 배열이면 호출할 때의 목록으로 만든 것으로 보고, 그 사이 다른 저장이 여행을 바꿨으면 그 결과를 덮지 않도록 거절한다.
    // restoreOnFailure: 메모리의 State를 직접 고친 뒤 저장하는 경로가 실패하면 마지막 저장본으로 되돌린다.
    saveAll(trips, options = {}) {
      const base = typeof trips === 'function' ? null : this.signature(this.getTrips());
      const { restoreOnFailure = false, ...backendOptions } = options;
      return this.run(async () => {
        if (base !== null && base !== this.signature(this.getTrips())) throw staleError();
        const input = typeof trips === 'function' ? trips(this.getTrips()) : trips;
        try {
          const next = await this.backend.saveAll(input, backendOptions);
          this.sequence += 1;
          this.setTrips(next);
          return next;
        } catch (error) {
          if (restoreOnFailure) {
            const committed = this.backend.getCommittedTrips();
            if (committed) this.setTrips(committed);
          }
          throw error;
        }
      });
    }

    // AI 초안 적용. 같은 작업을 두 번 적용하지 않고, revision이 다르면 conflict를 돌려준다.
    applyDraft(options) {
      return this.run(async () => {
        const result = await this.backend.applyDraft(this.getTrips(), options);
        if (result.status === 'applied') {
          if (!result.duplicate) this.sequence += 1;
          this.setTrips(result.trips);
        }
        return result;
      });
    }
  }

  root.SulsulTravel = root.SulsulTravel || {};
  root.SulsulTravel.TripStore = TripStore;
})(typeof window !== 'undefined' ? window : globalThis);
