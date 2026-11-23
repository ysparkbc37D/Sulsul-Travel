import test from 'node:test';
import assert from 'node:assert/strict';
import '../js/infrastructure/storage/legacy-trip-repository.js';
import '../js/infrastructure/storage/trip-store.js';

const {LegacyTripRepository, TripStore} = globalThis.SulsulTravel;
const memoryStorage = (seed = {}) => {
  const values = new Map(Object.entries(seed));
  return {getItem: key => values.has(key) ? values.get(key) : null, setItem: (key, value) => values.set(key, String(value)), values};
};
// 셸의 State.trips 역할
function setup(seed = [{id: 'a', revision: 0, title: '원본', days: [], expenses: []}, {id: 'b', revision: 0, title: '다른 여행', days: []}], backend) {
  const storage = memoryStorage({st_trips_v2: JSON.stringify(seed)});
  const state = {trips: []};
  const store = new TripStore(backend || new LegacyTripRepository(storage), {getTrips: () => state.trips, setTrips: trips => { state.trips = trips; }});
  return {storage, state, store, stored: () => JSON.parse(storage.getItem('st_trips_v2'))};
}
// IndexedDB처럼 쓰기가 늦게 끝나는 백엔드(같은 메서드를 비동기로 감싼다).
function slowBackend(inner, delay = 5) {
  const wait = () => new Promise(resolve => setTimeout(resolve, delay));
  return {
    get observedRaw() { return inner.observedRaw; },
    getCommittedTrips: () => inner.getCommittedTrips(),
    loadAll: async () => { await wait(); return inner.loadAll(); },
    saveAll: async (trips, options) => { await wait(); return inner.saveAll(trips, options); },
    commit: async (trips, options) => { await wait(); return inner.commit(trips, options); },
    applyDraft: async (trips, options) => { await wait(); return inner.applyDraft(trips, options); }
  };
}

test('저장은 성공한 작업 안에서 목록을 바꾸고, 실패하면 목록을 바꾸지 않는다', async () => {
  const {state, store, stored, storage} = setup();
  state.trips = (await store.loadAll()).trips;
  const before = state.trips;
  await store.commit({tripId: 'a', expectedRevision: 0, change: trip => { trip.title = '새 제목'; }});
  assert.notEqual(state.trips, before);
  assert.equal(state.trips[0].title, '새 제목');
  assert.equal(stored()[0].title, '새 제목');
  storage.setItem = () => { throw new Error('quota'); };
  const committed = state.trips;
  await assert.rejects(store.commit({tripId: 'a', change: trip => { trip.title = '실패'; }}), /quota/);
  assert.equal(state.trips, committed, '실패하면 State는 그대로다');
});

test('먼저 맡긴 저장이 끝난 뒤 다음 저장이 시작되고, 다음 저장은 그 결과 위에서 실행된다', async () => {
  const inner = new LegacyTripRepository(memoryStorage({st_trips_v2: JSON.stringify([{id: 'a', revision: 0, days: [], expenses: []}, {id: 'b', revision: 0, days: []}])}));
  const {state, store} = setup(undefined, slowBackend(inner));
  state.trips = (await store.loadAll()).trips;
  const order = [];
  // 기다리지 않고 세 저장을 연달아 맡긴다. 서로 다른 여행·같은 여행이 섞여도 어느 변경도 사라지지 않는다.
  const first = store.commit({tripId: 'a', change: trip => { order.push('a1'); trip.expenses.push({id: 'e1'}); }});
  const second = store.commit({tripId: 'b', change: trip => { order.push('b'); trip.title = 'B 수정'; }});
  const third = store.commit({tripId: 'a', change: trip => { order.push('a2'); trip.expenses.push({id: 'e2'}); }});
  assert.equal(store.busy, true);
  await Promise.all([first, second, third]);
  assert.deepEqual(order, ['a1', 'b', 'a2']);
  assert.deepEqual(state.trips.find(t => t.id === 'a').expenses.map(e => e.id), ['e1', 'e2']);
  assert.equal(state.trips.find(t => t.id === 'b').title, 'B 수정');
  assert.equal(state.trips.find(t => t.id === 'a').revision, 2);
  assert.equal(store.busy, false);
});

test('편집을 시작한 revision을 준 저장은 앞 저장이 같은 여행을 바꿨으면 거절된다', async () => {
  const {state, store} = setup();
  state.trips = (await store.loadAll()).trips;
  const p1 = store.commit({tripId: 'a', expectedRevision: 0, change: trip => { trip.title = '첫 편집'; }});
  const p2 = store.commit({tripId: 'a', expectedRevision: 0, change: trip => { trip.title = '오래된 편집'; }});
  await p1;
  await assert.rejects(p2, error => error.code === 'REVISION_CONFLICT');
  assert.equal(state.trips[0].title, '첫 편집');
});

test('호출할 때 만든 전체 목록은 그 사이 다른 저장이 끝났으면 거절하고, 함수로 준 목록은 최신 목록으로 만든다', async () => {
  const {state, store, stored} = setup();
  state.trips = (await store.loadAll()).trips;
  const journal = store.commit({tripId: 'a', change: trip => { trip.title = '먼저 저장한 글'; }});
  const staleList = store.saveAll([{id: 'new', revision: 0, days: []}, ...state.trips]);
  const fresh = store.saveAll(current => [{id: 'new2', revision: 0, days: []}, ...current]);
  await journal;
  await assert.rejects(staleList, error => error.code === 'STORAGE_CONFLICT');
  await fresh;
  assert.deepEqual(stored().map(t => t.id), ['new2', 'a', 'b']);
  assert.equal(stored()[1].title, '먼저 저장한 글', '앞 저장의 결과를 덮지 않는다');
});

test('revision을 올리지 않는 보정 저장이 끼어도 호출할 때 만든 목록의 저장은 막지 않는다', async () => {
  const {state, store, stored} = setup();
  state.trips = (await store.loadAll()).trips;
  state.trips[0].planBlockMeta = {보정: true}; // 화면이 메모리에서 구조를 보정한 뒤 기다리지 않고 저장한다
  const correction = store.saveAll(current => current);
  const next = structuredClone(state.trips); next[1].title = '사용자 저장';
  const user = store.saveAll(next, {bumpTripId: 'b'});
  await correction; await user;
  assert.equal(stored()[1].title, '사용자 저장');
  assert.deepEqual(stored()[0].planBlockMeta, {보정: true});
});

test('앞 저장이 실패해도 다음 저장은 실행되고, restoreOnFailure는 메모리를 마지막 저장본으로 되돌린다', async () => {
  const {state, store, storage} = setup();
  state.trips = (await store.loadAll()).trips;
  const realSet = storage.setItem;let fail = true;
  storage.setItem = (key, value) => { if (fail) { fail = false; throw new Error('quota'); } return realSet(key, value); };
  state.trips[0].title = '메모리에서 직접 고친 값';
  const failed = store.saveAll(current => current, {restoreOnFailure: true});
  const next = store.commit({tripId: 'b', change: trip => { trip.title = '다음 저장'; }});
  await assert.rejects(failed, /quota/);
  await next;
  assert.equal(state.trips[0].title, '원본', '실패한 직접 수정은 마지막 저장본으로 되돌린다');
  assert.equal(state.trips[1].title, '다음 저장');
});

test('AI 초안은 한 번만 적용하고 revision이 다르면 conflict를 돌려준다', async () => {
  const {state, store} = setup();
  state.trips = (await store.loadAll()).trips;
  const applied = await store.applyDraft({tripId: 'a', baseRevision: 0, jobId: 'job-1', mutate: trip => { trip.title = 'AI 제안'; }});
  assert.equal(applied.status, 'applied');
  assert.equal(state.trips[0].title, 'AI 제안');
  const sequence = store.sequence;
  const duplicate = await store.applyDraft({tripId: 'a', baseRevision: 0, jobId: 'job-1', mutate: () => assert.fail('두 번 적용하지 않는다')});
  assert.equal(duplicate.duplicate, true);
  assert.equal(store.sequence, sequence, '중복 적용은 저장이 아니다');
  const conflict = await store.applyDraft({tripId: 'a', baseRevision: 0, jobId: 'job-2', mutate: trip => { trip.title = '늦은 제안'; }});
  assert.equal(conflict.status, 'conflict');
  assert.equal(state.trips[0].title, 'AI 제안');
});

test('다른 창이 문서를 바꾸면 이 창의 저장은 STORAGE_CONFLICT로 거절된다', async () => {
  const {state, store, storage} = setup();
  state.trips = (await store.loadAll()).trips;
  storage.setItem('st_trips_v2', JSON.stringify([{id: 'a', revision: 5, title: '다른 창'}]));
  await assert.rejects(store.commit({tripId: 'a', change: trip => { trip.title = '이 창'; }}), error => error.code === 'STORAGE_CONFLICT');
  assert.equal(state.trips[0].title, '원본');
  assert.equal(JSON.parse(storage.getItem('st_trips_v2'))[0].title, '다른 창');
});
