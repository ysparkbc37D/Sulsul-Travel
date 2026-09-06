import test from 'node:test';
import assert from 'node:assert/strict';
import '../js/infrastructure/storage/legacy-trip-repository.js';

const memoryStorage = (seed = {}) => {
  const values = new Map(Object.entries(seed));
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    values
  };
};

const Repo = globalThis.SulsulTravel.LegacyTripRepository;

test('loads legacy trips with a revision without changing stored data', () => {
  const storage = memoryStorage({ st_trips_v2: JSON.stringify([{ id: 'a', title: 'A' }]) });
  const repo = new Repo(storage);
  const result = repo.loadAll();
  assert.equal(result.trips[0].revision, 0);
  assert.equal(JSON.parse(storage.getItem('st_trips_v2'))[0].revision, undefined);
});

test('preserves corrupt source before recovery', () => {
  const storage = memoryStorage({ st_trips_v2: '{broken' });
  const repo = new Repo(storage);
  const result = repo.loadAll();
  assert.equal(result.recoveredFromCorruption, true);
  assert.equal(storage.getItem(result.backupKey), '{broken');
  assert.equal(storage.getItem('st_trips_v2'), '{broken');
});

test('applies once at matching revision and persists atomically', () => {
  const storage = memoryStorage();
  const repo = new Repo(storage, { now: () => '2026-09-06T00:00:00.000Z' });
  const trips = [{ id: 'a', revision: 2, days: [], appliedAiJobIds: [] }];
  const result = repo.applyDraft(trips, { tripId: 'a', baseRevision: 2, jobId: 'job-1',
    mutate: trip => { trip.days.push({ dayNum: 1 }); } });
  assert.equal(result.status, 'applied');
  assert.equal(result.trips[0].revision, 3);
  assert.deepEqual(result.trips[0].appliedAiJobIds, ['job-1']);
  assert.equal(trips[0].days.length, 0);
  const duplicate = repo.applyDraft(result.trips, { tripId: 'a', baseRevision: 2,
    jobId: 'job-1', mutate: () => assert.fail('must not mutate twice') });
  assert.equal(duplicate.status, 'applied');
  assert.equal(duplicate.duplicate, true);
});

test('revision conflict and write failure leave caller data unchanged', () => {
  const storage = memoryStorage();
  const repo = new Repo(storage);
  const trips = [{ id: 'a', revision: 2, title: 'manual' }];
  const conflict = repo.applyDraft(trips, { tripId: 'a', baseRevision: 1,
    jobId: 'job-1', mutate: trip => { trip.title = 'AI'; } });
  assert.equal(conflict.status, 'conflict');
  assert.equal(trips[0].title, 'manual');
  storage.setItem = () => { throw new Error('quota'); };
  assert.throws(() => repo.applyDraft(trips, { tripId: 'a', baseRevision: 2,
    jobId: 'job-2', mutate: trip => { trip.title = 'AI'; } }), /quota/);
  assert.equal(trips[0].title, 'manual');
});
