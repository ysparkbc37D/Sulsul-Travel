import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const adapter = require('../js/domain/trip-adapter.js');
const transfer = require('../js/domain/trip-transfer.js');
const legacyTrip = () => ({
  id:'legacy-trip', title:'파타고니아', startDate:'2026-12-31', endDate:'2027-01-02',
  cities:['엘', '토레스'], countries:['아르헨티나', '칠레'], revision:7,
  days:[
    {day:1,date:'12월 31일 (목)',city:'엘 칼라파테',planBlockId:'block-fixed',spots:[
      {id:'original-spot',name:'빙하 전망대',time:'09:00 - 10:30',category:'transit',completed:true,fixed:true,recordId:'journal-anchor'},
      {name:'호숫가 산책',category:'food',skipped:true}
    ]},
    {day:2,date:'1월 1일 (금)',city:'엘 찰텐',spots:[{name:'피츠로이',category:'tour'}]},
    {day:3,date:'1월 2일 (토)',city:'토레스 델 파이네',spots:[]}
  ],
  journals:{0:{text:'사용자 원문',originalText:'보존할 원문',photos:['data:image/jpeg;base64,YQ==']}},
  activityRecords:{'journal-anchor':{id:'journal-anchor',context:{title:'빙하 전망대'},text:'빙하를 보았다.',photos:[],coverIndex:0}},
  expenses:[{id:'expense-kept',title:'점심',category:'food',currency:'KRW',amount:10000,photos:['data:image/jpeg;base64,YQ=='],primaryPhotoIndex:0}],
  customField:{notes:['새 구조에서도 남아야 하는 정보']}
});

test('구버전 별칭과 사진·기록·완료·고정 관계를 원본 변경 없이 보충한다', () => {
  const original = legacyTrip(), before = structuredClone(original), result = adapter.normalizeTrip(original);
  assert.deepEqual(original,before);
  assert.equal(result.days[0].dayNum,1);
  assert.equal(result.days[0].spots[0].title,'빙하 전망대');
  assert.equal(result.days[0].spots[0].name,'빙하 전망대');
  assert.equal(result.days[0].spots[0].cat,'flight');
  assert.equal(result.days[0].spots[0].time,'09:00 - 10:30');
  assert.equal(result.days[0].spots[0].id,'original-spot');
  assert.equal(result.days[0].spots[0].recordId,'journal-anchor');
  assert.equal(result.days[0].spots[0].completed,true);
  assert.equal(result.days[0].spots[0].fixed,true);
  assert.equal(result.days[0].spots[1].skipped,true);
  assert.equal(result.days[0].planBlockId,'block-fixed');
  assert.deepEqual(result.activityRecords,original.activityRecords);
  assert.deepEqual(result.journals,original.journals);
  assert.deepEqual(result.customField,original.customField);
  assert.equal(result.revision,7);
});

test('날짜는 시작일로부터 달·연도 경계를 넘어 계산하며 유효한 개별 날짜는 유지한다', () => {
  const result = adapter.normalizeTrip(legacyTrip());
  assert.deepEqual(result.days.map(day=>day.date),['2026-12-31','2027-01-01','2027-01-02']);
  assert.equal(result.days[0].sourceDate,'12월 31일 (목)');
  assert.equal(adapter.dateForDay('2024-02-28',2),'2024-03-01');
  assert.equal(adapter.isoDate('2026년 10월 11일'),'2026-10-11');
  assert.equal(adapter.isoDate('2026.10.11 (일)'),'2026-10-11');
  assert.equal(adapter.isoDate('2026-02-30'),'');
  assert.equal(adapter.isoDate('2026-10-11T20:00:00-03:00'),'2026-10-11');
  const trip=legacyTrip();trip.days[1].date='2027-01-05';
  assert.equal(adapter.normalizeTrip(trip).days[1].date,'2027-01-05');
});

test('지명 공백·하이픈을 유지하고 남아 있는 일별 도시로 잘린 도시 배열을 복구한다', () => {
  const result=adapter.normalizeTrip(legacyTrip());
  assert.deepEqual(result.cities,['엘 칼라파테','엘 찰텐','토레스 델 파이네']);
  for (const name of ['엘 칼라파테','엘 찰텐','토레스 델 파이네','San José','Baden-Baden']) assert.equal(adapter.normalizeCityName(name),name);
  assert.equal(adapter.normalizeCityName('Day 1   산 호세 계획'),'산 호세');
  const trip=legacyTrip();trip.cities.push('모르는 도시');
  assert.ok(adapter.normalizeTrip(trip).cities.includes('모르는 도시'));
});

test('정규화 재실행과 편집·재배치 후에도 부여한 식별자는 변하지 않는다', () => {
  const normalized=adapter.normalizeTrip(legacyTrip());
  assert.deepEqual(adapter.normalizeTrip(normalized),normalized);
  const dayId=normalized.days[1].id,spotId=normalized.days[1].spots[0].id;
  normalized.days[1].spots[0].title='수정한 방문 제목';
  normalized.days.reverse();
  const next=adapter.normalizeTrip(normalized);
  assert.equal(next.days[1].id,dayId);
  assert.equal(next.days[1].spots[0].id,spotId);
  const ids=next.days.flatMap(day=>day.spots.map(spot=>spot.id));
  assert.equal(new Set(ids).size,ids.length);
});

test('AI 입력 별칭도 같은 계약으로 읽고 일별 자료가 없을 때 일정을 만들어내지 않는다', () => {
  const input={title:'AI 초안',startDate:'2026-10-11',days:[{name:'첫날',place:'San José',timeline:[{name:'중앙시장',description:'시장 산책',category:'shopping'}]}]};
  const result=adapter.normalizeTrip(input);
  assert.equal(result.days[0].spots[0].title,'중앙시장');
  assert.equal(result.days[0].spots[0].desc,'시장 산책');
  assert.equal(result.days[0].city,'San José');
  assert.equal(result.days[0].spots[0].cat,'shopping');
  assert.deepEqual(adapter.normalizeTrip({title:'빈 초안'}).days,[]);
  assert.throws(()=>adapter.normalizeTrip({days:[{spots:[null]}]}));
});

test('지출 분류·통화 별칭을 맞추되 미지 환율이나 개인 정보는 추가하지 않는다', () => {
  const original=legacyTrip();
  original.expenses.push({name:'버스',category:'transit',currency:'ARS',amount:1000,dateIdx:1,photos:[]});
  const result=adapter.normalizeTrip(original);
  assert.equal(result.expenses[0].id,'expense-kept');
  assert.equal(result.expenses[0].cat,'meal');
  assert.equal(result.expenses[0].curr,'KRW');
  assert.equal(result.expenses[0].krw,10000);
  assert.deepEqual(result.expenses[0].photos,original.expenses[0].photos);
  assert.equal(result.expenses[1].cat,'transport');
  assert.equal(result.expenses[1].curr,'ARS');
  assert.equal(result.expenses[1].krw,undefined);
  assert.equal(result.expenses[1].date,'2027-01-01');
  assert.equal(adapter.normalizeExpenseCategory('stay'),'lodging');
  assert.equal(adapter.normalizeExpenseCategory('rental'),'rental');
  assert.equal(adapter.normalizeExpenseCategory('미지 분류'),'etc');
  assert.equal(result.timeZone,undefined);
});

test('현지 날짜와 시각은 선택된 시간대를 함께 사용하며 기기 기준 대체도 안전하다', () => {
  const now=new Date('2026-10-07T16:30:00Z');
  assert.equal(adapter.localDateKey(now,'Asia/Seoul'),'2026-10-08');
  assert.equal(adapter.localTimeKey(now,'Asia/Seoul'),'01:30');
  assert.equal(adapter.localDateKey(now,'America/Argentina/Buenos_Aires'),'2026-10-07');
  assert.equal(adapter.localTimeKey(now,'America/Argentina/Buenos_Aires'),'13:30');
  assert.equal(adapter.localDateKey(now,'unknown/time-zone'),adapter.localDateKey(now));
  assert.equal(adapter.localDateKey(new Date('invalid')),'');
});

test('여행 단계와 오늘은 종료일을 포함하고 미리보기·회고 날짜를 구별한다', () => {
  const trip=adapter.normalizeTrip({...legacyTrip(),timeZone:'Asia/Seoul'});
  assert.equal(adapter.resolveTripStage(trip,new Date('2026-12-30T00:00:00Z')),'planned');
  assert.equal(adapter.resolveTodayDayIndex(trip,new Date('2026-12-30T00:00:00Z')),0);
  assert.equal(adapter.resolveTripStage(trip,new Date('2027-01-02T14:59:00Z')),'ongoing');
  assert.equal(adapter.resolveTodayDayIndex(trip,new Date('2027-01-01T01:00:00Z')),1);
  assert.equal(adapter.resolveTripStage(trip,new Date('2027-01-02T15:00:00Z')),'completed');
  assert.equal(adapter.resolveTodayDayIndex(trip,new Date('2027-01-03T01:00:00Z')),2);
  assert.equal(adapter.resolveTripStage({...trip,isBucketlist:true}),'bucketlist');
  assert.equal(adapter.resolveTripStage({...trip,status:'completed'},new Date('2026-12-30T00:00:00Z')),'completed');
});

test('최신 v14 시드는 모든 화면용 제목·날짜·거점을 갖고 개인정보 선택 공유를 왕복한다', () => {
  const sandbox={window:{}};vm.createContext(sandbox);
  vm.runInContext(readFileSync(new URL('../kb-travel.js',import.meta.url),'utf8'),sandbox);
  const kb=sandbox.window.KB_TRAVEL;
  const seed=adapter.normalizeTrip({...kb.templates.south_america_22d,expenses:kb.seedExpenses,journals:kb.seedJournals});
  assert.equal(seed.days.length,22);
  assert.equal(seed.days[0].date,'2026-10-11');
  assert.equal(seed.days.at(-1).date,'2026-11-01');
  assert.equal(seed.days[0].spots[0].title,'인천공항 제1여객터미널 도착 및 출국 준비');
  assert.equal(seed.days[0].spots[0].time,'14:00 - 14:30');
  assert.equal(seed.days[4].city,'엘 칼라파테');
  assert.equal(seed.days[5].city,'엘 찰텐');
  assert.equal(seed.days[9].city,'산티아고');
  assert.equal(seed.days[12].city,'아레키파');
  assert.equal(seed.days[15].city,'마추픽추');
  assert.equal(seed.days.at(-1).city,'인천');
  assert.ok(seed.days.every((day,index)=>day.dayNum===index+1 && day.id && day.spots.every(spot=>spot.title && spot.cat && spot.id)));
  const roundtrip=transfer.parse(JSON.stringify(transfer.create(seed,{journals:true,finances:true},'test'))).trip;
  for (const key of ['days','journals','expenses','cities']) assert.deepEqual(roundtrip[key],seed[key]);
  assert.equal(roundtrip.days[0].spots[0].title,seed.days[0].spots[0].title);
  assert.deepEqual(transfer.create(seed).trip.journals,{});
});
