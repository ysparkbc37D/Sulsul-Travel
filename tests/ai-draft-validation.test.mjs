import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {validate} = require('../js/domain/ai-draft-validation.js');

const days = () => [1,2,3].map(dayNum => ({id:`d${dayNum}`,dayNum,title:`제${dayNum}일`,city:'가상 도시',date:`2026-10-0${dayNum}`,spots:[
  {id:`s${dayNum}a`,time:'09:00',title:'박물관',desc:'예약 확인',fixed:true,cost:'10',recordId:`r${dayNum}`},
  {id:`s${dayNum}b`,time:'12:00',title:'식사'}, {id:`s${dayNum}c`,time:'14:30',title:'산책'}
] }));
const replan = snapshotDays => ({kind:'replan',input:{snapshotDays,targetDayVal:'1'}});

test('일수·30분 간격·일정 밀도가 없는 AI 여행 계획은 거부한다', () => {
  const job = {kind:'itinerary',input:{expectedDayCount:3,minSpotsPerDay:3,edgeMinSpotsPerDay:2}};
  assert.equal(validate({days:days()},job),true);
  assert.equal(validate({days:[{spots:[]}]},job),false);
  const sparse = days(); sparse[1].spots = sparse[1].spots.slice(0,2);
  assert.equal(validate({days:sparse},job),false);
  const badClock = days(); badClock[1].spots[1].time = '12:15';
  assert.equal(validate({days:badClock},job),false);
  badClock[1].spots[1].time = '25:00';
  assert.equal(validate({days:badClock},job),false);
  for (const time of ['200:00','09:000','9:00','09:00<script>']) {
    badClock[1].spots[1].time = time;
    assert.equal(validate({days:badClock},job),false);
  }
});

test('RePlan은 선택 구간 밖의 모든 필드와 기존 날짜 ID를 보존한다', () => {
  const original = days(), job = replan(original), changed = structuredClone(original);
  changed[1].spots[1].time = '12:15';
  assert.equal(validate({days:changed},job),true);
  changed[0].city = '다른 도시';
  assert.equal(validate({days:changed},job),false);
  changed[0].city = original[0].city; changed[1].id = 'new-id';
  assert.equal(validate({days:changed},job),false);
  for (const targetDayVal of ['-1','range:1:9','range:2:1','x']) {
    assert.equal(validate({days:original},{kind:'replan',input:{snapshotDays:original,targetDayVal}}),false);
  }
});

test('완료·고정·기록 연결 일정은 ID·금액·메모를 포함해 보존한다', () => {
  const original = days(), job = replan(original);
  for (const mutate of [spot => {spot.id='other';},spot => {spot.cost=10;},spot => {delete spot.recordId;},spot => {spot.desc='변경';},spot => {spot.fixed=false;}]) {
    const changed = structuredClone(original); mutate(changed[1].spots[0]);
    assert.equal(validate({days:changed},job),false);
  }
  const removed = structuredClone(original); removed[1].spots.shift();
  assert.equal(validate({days:removed},job),false);
  const reorderedFields = structuredClone(original); reorderedFields[1].spots[0] = Object.fromEntries(Object.entries(reorderedFields[1].spots[0]).reverse());
  assert.equal(validate({days:reorderedFields},job),true);
});

test('유효한 지원 통화만 승인하고 잘못된 실제 날짜·금액은 거부한다', () => {
  const job = {kind:'receipt'}, options = {currencyCodes:['JPY','KRW','EUR']};
  const receipt = {merchant:'가상 상점',amount:500,currency:'JPY',category:'meal',date:'2026-10-09'};
  assert.equal(validate({receipt},job,options),true);
  for (const invalid of [{currency:'bogus'},{currency:'ZZZ'},{date:'2026-02-30'},{amount:true},{amount:Infinity},{amount:0}]) {
    assert.equal(validate({receipt:{...receipt,...invalid}},job,options),false);
  }
});

test('이름과 ID 중복으로 다른 보호 일정을 가장할 수 없다', () => {
  const original = days(), duplicate = structuredClone(original);
  duplicate[1].spots[1].id = duplicate[1].spots[0].id;
  assert.equal(validate({days:duplicate},replan(original)),false);
});
