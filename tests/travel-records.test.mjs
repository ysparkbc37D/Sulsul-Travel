import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createReplanProposal} from '../js/domain/replan.mjs';

const require = createRequire(import.meta.url);
const adapter = require('../js/domain/trip-adapter.js');
const live = require('../js/domain/live-itinerary.js');
const records = require('../js/domain/travel-records.js');
const story = require('../js/domain/travel-story.js');
const backup = require('../js/domain/travel-backup.js');
const transfer = require('../js/domain/trip-transfer.js');

const photo = 'data:image/jpeg;base64,YQ==';
const now = '2030-05-01T01:00:00Z';
// 세 종류 기록(하루 회고·일정 기록·순간 기록, 퀵 캡슐과 승인된 AI 문장 포함)과 빈 회고 하나를 가진 가상 여행.
function fixture() {
  return adapter.normalizeTrip({id:'records-trip',title:'기록 일치 가상 여행',startDate:'2030-05-01',revision:3,days:[
    {id:'d1',date:'2030-05-01',city:'가상시',spots:[{id:'a',title:'가상 산책',time:'09:00'},{id:'b',title:'가상 전시',time:'10:00',recordId:'r1'},{id:'c',title:'가상 시장',time:'12:00'}]},
    {id:'d2',date:'2030-05-02',city:'가상시',spots:[{id:'e',title:'가상 공원',time:'09:00'}]}
  ],journals:{0:{text:'첫날 회고 원문',photos:[photo]},1:{text:'',photos:[]}},
  activityRecords:{r1:{id:'r1',text:'전시에서 본 그림',photos:[photo,photo],coverIndex:0,context:{title:'가상 전시',date:'2030-05-01',time:'10:00'}}},
  momentEntries:[
    {id:'m1',date:'2030-05-01',time:'11:30',text:'점심 전 산책',photos:[],coverIndex:0},
    {id:'m-notime',date:'2030-05-01',time:'',text:'시각을 모르는 순간',photos:[],coverIndex:0},
    {id:'cap1',source:'capsule',date:'2030-05-02',time:'08:10',text:'아침 캡슐',photos:[photo],coverIndex:0,mood:'😊'},
    {id:'m-ai',date:'2030-05-02',time:'20:00',text:'승인한 AI 문장',originalText:'내 원문',aiDraftAcceptedAt:'2030-05-02T11:00:00Z',photos:[],coverIndex:0}
  ]});
}
const facts = trip => records.summary(trip).records.map(record => ({id:record.id,kind:record.kind,date:record.occurredDate,text:record.originalText,approved:record.approvedText,photos:record.photoCount}))
  .sort((a,b) => a.id.localeCompare(b.id));

test('세 종류 기록을 한 형식으로 읽고 빈 항목은 기록으로 세지 않는다', () => {
  const trip = fixture(), before = JSON.stringify(trip), summary = records.summary(trip);
  assert.equal(JSON.stringify(trip), before, '읽기 모델은 원본을 바꾸지 않는다');
  assert.equal(summary.count, 6);
  assert.deepEqual(summary.byKind, {reflection:1,activity:1,moment:4});
  assert.equal(summary.photoCount, 4);
  const byId = Object.fromEntries(records.list(trip).map(record => [record.id, record]));
  assert.equal(byId.cap1.source, 'capsule');
  assert.equal(byId.cap1.kind, 'moment');
  assert.equal(byId['m-ai'].originalText, '내 원문');
  assert.equal(byId['m-ai'].approvedText, '승인한 AI 문장');
  assert.equal(byId.r1.dayId, 'd1');
  assert.equal(byId.r1.spotId, 'b');
  assert.equal(records.list(trip).filter(record => record.kind === 'reflection' && !record.hasContent).length, 1);
});

test('이야기·백업·공유 확인·대표 사진이 같은 기록 수와 사진 수를 본다', () => {
  const trip = fixture(), summary = records.summary(trip), model = story.build(trip);
  assert.equal(model.stats.recordCount, summary.count);
  assert.equal(model.stats.photoCount, summary.photoCount);
  assert.equal(model.days.flatMap(day => day.reflections).length, 1, '빈 하루 회고는 이야기에 나오지 않는다');
  const backed = backup.summary([trip]);
  assert.equal(backed.records, summary.count);
  assert.equal(backed.photos, summary.photoCount);
  const shared = transfer.parse(JSON.stringify(transfer.create(trip,{journals:true,finances:false}))).trip;
  assert.equal(records.summary(shared).count, summary.count, '기록을 포함한 공유 사본은 순간 기록까지 같은 수다');
  assert.equal(shared.momentEntries.find(entry => entry.id === 'm-notime').time, '', '작성 시각을 모르는 순간 기록도 공유를 막지 않고 시각을 지어내지 않는다');
  const cover = records.firstPhoto(trip);
  assert.equal(cover.record.id, 'r1', '날짜·시각이 가장 이른 사진 기록');
  assert.equal(cover.index, 0);
});

test('일정 삽입·이동·삭제·재계획·날짜 변경 뒤에도 기록의 날짜·원문·사진이 이야기와 백업에서 같다', () => {
  const trip = fixture(), before = facts(trip), backupBefore = backup.summary([trip]);
  live.apply(trip,{type:'insert',dayId:'d1',anchorId:'a',position:'after',item:{id:'n',title:'새 가상 일정',time:''}},{now});
  live.apply(trip,{type:'move',dayId:'d1',itemId:'b',targetDayId:'d2',position:'start'},{now});
  live.apply(trip,{type:'remove',dayId:'d1',itemId:'c'},{now});
  trip.days = createReplanProposal({days:trip.days,targetDay:'all',offsetMinutes:60,reason:'가상 지연'}).proposedDays;
  trip.days[0].date = '2030-05-03';   // 큰 계획 날짜를 옮겨 원래 첫날이 일정에서 사라진다
  const after = adapter.normalizeTrip(trip);
  assert.deepEqual(facts(after), before);
  assert.deepEqual(backup.summary([after]), backupBefore);
  const model = story.build(after), dayOf = id => model.days.find(day => [...day.records,...day.reflections].some(record => record.id === id));
  assert.equal(dayOf('r1').date, '2030-05-01', '다른 날로 옮긴 일정의 기록도 남긴 날짜에 출력한다');
  assert.equal(dayOf('m1').date, '2030-05-01');
  assert.equal(dayOf('cap1').date, '2030-05-02');
  assert.equal(model.days.flatMap(day => day.reflections).find(record => record.text === '첫날 회고 원문').date, '2030-05-01');
  assert.equal(model.stats.recordCount, before.length);
  assert.equal(model.days.flatMap(day => [...day.records,...day.reflections]).find(record => record.id === 'r1').photos.length, 2);
});
