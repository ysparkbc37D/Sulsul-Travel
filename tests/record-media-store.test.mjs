import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const RecordMediaStore = require('../js/infrastructure/storage/record-media-store.js');
const records = require('../js/domain/travel-records.js');

// FileReader.readAsDataURL과 같은 결과를 내는 Node용 읽기.
const reader = async blob => `data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`;
const toBlob = value => new Blob([Buffer.from(value.split(',')[1], 'base64')], {type: value.slice(5, value.indexOf(';'))});
const photoA = 'data:image/jpeg;base64,' + Buffer.from('가상 사진 A의 바이트').toString('base64');
const photoB = 'data:image/jpeg;base64,' + Buffer.from('가상 사진 B의 바이트').toString('base64');
const thumbA = 'data:image/jpeg;base64,' + Buffer.from('A 썸네일').toString('base64');

function mediaRepo(rows = {}) {
  const values = new Map(Object.entries(rows));
  return {values, saved: [],
    async getMany(ids) { return new Map(ids.filter(id => values.has(id)).map(id => [id, values.get(id)])); },
    async save(value) { this.saved.push(value.id); values.set(value.id, value); return value.id; }};
}
const row = (id, source, thumbnail) => ({id, tripId: 'trip', original: toBlob(source), thumbnail: thumbnail ? toBlob(thumbnail) : undefined, sourceHash: RecordMediaStore.sourceHash(source)});
// 원문 보관용 IndexedDB 흉내. fail이면 열기부터 실패한다.
function snapshotDb({fail = false} = {}) {
  const rows = new Map();
  return {rows, open() {
    if (fail) throw new Error('합성 IDB 사용 불가');
    const request = {};
    const db = {objectStoreNames: {contains: () => true}, createObjectStore() {}, close() {}, transaction() {
      const tx = {objectStore: () => ({get(id) { const r = {}; queueMicrotask(() => { r.result = rows.get(id); r.onsuccess?.(); }); return r; }, put(value) { rows.set(value.id, structuredClone(value)); }})};
      setTimeout(() => tx.oncomplete?.(), 0);
      return tx;
    }};
    queueMicrotask(() => { request.result = db; request.onsuccess?.(); });
    return request;
  }};
}
function trips() {
  return [{id: 'trip', title: '가상 여행', days: [{id: 'd1', date: '2030-05-01', spots: []}],
    journals: {0: {id: 'j', date: '2030-05-01', text: '회고', photos: [photoA], photoThumbnails: [thumbA], mediaIds: ['m-a']}},
    activityRecords: {r: {id: 'r', text: '일정 기록', photos: [photoB], photoThumbnails: [null], mediaIds: [null], coverIndex: 0, context: {title: '가상', date: '2030-05-01'}}},
    momentEntries: [{id: 'm', date: '2030-05-01', time: '', text: '사진 없는 순간', photos: [], mediaIds: []}]}];
}
const store = (options = {}) => new RecordMediaStore({reader, toBlob: async value => toBlob(value), makeId: (() => { let n = 0; return () => `new-${++n}`; })(), ...options});

test('확인된 사진만 문서에서 빼고, 읽을 때 같은 문자열로 되살린다', async () => {
  const media = mediaRepo({'m-a': row('m-a', photoA, thumbA)}), indexedDb = snapshotDb(), s = store({media, indexedDb});
  const original = trips(), raw = JSON.stringify(original);
  const primed = await s.prime(raw);
  assert.equal(primed.snapshot, 'saved');
  assert.equal(indexedDb.rows.get('before-record-media').raw, raw, '처음 빼기 전의 원래 문서를 보관한다');
  const projected = s.project(original);
  assert.equal(projected[0].journals[0].photos[0], '');
  assert.equal(projected[0].journals[0].photoThumbnails[0], '');
  assert.equal(projected[0].activityRecords.r.photos[0], photoB, 'mediaId가 없는 사진은 아직 문서에 둔다');
  assert.equal(original[0].journals[0].photos[0], photoA, '원본 객체는 바꾸지 않는다');
  const restored = s.hydrate(JSON.parse(JSON.stringify(projected)));
  assert.deepEqual(restored, original);
  assert.deepEqual(s.missingReferences(), []);
  assert.deepEqual(records.summary(projected[0]).photoCount, records.summary(original[0]).photoCount, '기록 수·사진 수는 빼기 전후 같다');
});

test('문서에 없던 사진 ID나 내용이 다른 보관본은 새로 보관하고 다시 읽어 확인한 뒤에만 연결한다', async () => {
  const media = mediaRepo({'m-a': row('m-a', photoB)}), s = store({media, indexedDb: snapshotDb()});
  const current = trips();
  await s.prime(JSON.stringify(current));
  assert.equal(s.project(current)[0].journals[0].photos[0], photoA, '같은 ID라도 내용이 다르면 빼지 않는다');
  const result = await s.adopt(current, {raw: JSON.stringify(current)});
  assert.equal(result.archived.length, 2);
  assert.deepEqual(media.saved, ['new-1', 'new-2']);
  const {trips: patched, applied} = s.applyPatches(current, result.archived);
  assert.equal(applied, 2);
  assert.equal(patched[0].journals[0].mediaIds[0], 'new-1');
  assert.equal(patched[0].activityRecords.r.mediaIds[0], 'new-2');
  const projected = s.project(patched);
  assert.equal(projected[0].journals[0].photos[0], '');
  assert.equal(projected[0].activityRecords.r.photos[0], '');
  assert.deepEqual(s.hydrate(projected), patched);
});

test('사진이 그 사이 바뀐 자리에는 mediaId를 붙이지 않는다', async () => {
  const media = mediaRepo(), s = store({media, indexedDb: snapshotDb()});
  const current = trips();
  await s.prime(JSON.stringify(current));
  const result = await s.adopt(current, {raw: JSON.stringify(current)});
  const changed = trips(); changed[0].activityRecords.r.photos[0] = photoA;
  const {applied, trips: patched} = s.applyPatches(changed, result.archived.filter(patch => patch.field === 'activityRecords'));
  assert.equal(applied, 0);
  assert.equal(patched[0].activityRecords.r.mediaIds[0], null);
});

test('원래 문서를 보관하지 못하면 어떤 사진도 문서에서 빼지 않는다', async () => {
  const media = mediaRepo({'m-a': row('m-a', photoA, thumbA)}), s = store({media, indexedDb: snapshotDb({fail: true})});
  const current = trips();
  const primed = await s.prime(JSON.stringify(current));
  assert.equal(primed.snapshot, 'failed');
  assert.deepEqual(s.project(current), current);
  const adopted = await s.adopt(current, {raw: JSON.stringify(current)});
  assert.deepEqual(adopted.archived, []);
  assert.match(adopted.error, /원래 문서/);
  assert.deepEqual(media.saved, []);
});

test('보관본이 사라진 사진은 빈 자리와 ID를 그대로 두고 찾지 못한 사진으로 알린다', async () => {
  const s = store({media: mediaRepo(), indexedDb: snapshotDb()});
  const projected = trips(); projected[0].journals[0].photos[0] = ''; projected[0].journals[0].photoThumbnails[0] = '';
  const primed = await s.prime(JSON.stringify(projected));
  assert.equal(primed.missing.length, 1);
  assert.deepEqual(primed.missing[0], {tripId: 'trip', field: 'journals', key: '0', entryId: 'j', index: 0, mediaId: 'm-a'});
  const hydrated = s.hydrate(projected);
  assert.equal(hydrated[0].journals[0].photos[0], '');
  assert.equal(hydrated[0].journals[0].mediaIds[0], 'm-a', '참조를 지우지 않는다');
  assert.deepEqual(s.stats(hydrated), {total: 2, stored: 0, inline: 1, missing: 1});
});

test('원래 문서 보관은 한 번만 하고 덮어쓰지 않는다', async () => {
  const indexedDb = snapshotDb(), media = mediaRepo({'m-a': row('m-a', photoA, thumbA)});
  const first = JSON.stringify(trips());
  await store({media, indexedDb}).prime(first);
  const later = trips(); later[0].title = '나중 문서';
  const second = await store({media, indexedDb}).prime(JSON.stringify(later));
  assert.equal(second.snapshot, 'exists');
  assert.equal(indexedDb.rows.get('before-record-media').raw, first);
});
