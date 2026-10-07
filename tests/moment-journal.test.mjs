import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Media=require('../js/infrastructure/storage/media-repository.js');
const {momentEntries,momentFeedEntries,momentLocalDateTime}=require('../js/presentation/moment-journal.js');

test('보관본과 썸네일 크기를 비율 유지하면서 구하고 작은 원본을 확대하지 않는다',()=>{
  assert.deepEqual(Media.dimensions(3200,1800),{width:1600,height:900});
  assert.deepEqual(Media.dimensions(1800,3200),{width:900,height:1600});
  assert.deepEqual(Media.dimensions(3200,1800,448),{width:448,height:252});
  assert.deepEqual(Media.dimensions(300,200),{width:300,height:200});
  assert.throws(()=>Media.dimensions(0,0));
});
test('기존 사진 string과 별도 썸네일 및 없어진 Blob의 JSON fallback은 호환된다',async()=>{
  const full='data:image/jpeg;base64,YQ==',thumb='data:image/jpeg;base64,Yg==';
  const record={photos:[full],photoThumbnails:[thumb],mediaIds:['missing']};
  assert.equal(Media.photoSource([full]),full);
  assert.equal(Media.photoSource(record),full);
  assert.equal(Media.photoSource(record,0,{thumbnail:true}),thumb);
  assert.equal(Media.photoSource({photos:[full]},0,{thumbnail:true}),full);
  assert.equal(Media.photoSource({photos:['javascript:alert(1)']}),'');
  assert.equal(await new Media(null).resolve(record),full);
});
test('날짜별 여러 순간과 기존 일정 기록을 시각 순으로 읽고 원래 배열을 보존한다',()=>{
  const trip={days:[{date:'2026-10-07'},{date:'2026-10-08'}],journals:{0:{text:'하루 원문',photos:[]}},activityRecords:{a:{id:'a',context:{date:'2026-10-07',time:'13:00'},text:'일정 원문',photos:[]}},momentEntries:[{id:'late',date:'2026-10-07',time:'21:00',text:'밤',photos:[]},{id:'other',date:'2026-10-08',time:'08:00',text:'다음 날',photos:[]},{id:'early',date:'2026-10-07',time:'09:00',text:'아침',photos:[]}]};
  const before=JSON.stringify(trip);
  assert.deepEqual(momentFeedEntries(trip,0).map(entry=>entry.id),['early','a','late']);
  assert.equal(JSON.stringify(trip),before);
  assert.equal(momentEntries(trip).length,3);
  assert.deepEqual(momentEntries({}),[]);
});
test('여행 현지 자정 전후 기록 기본 날짜와 시각을 계산한다',()=>{
  assert.deepEqual(momentLocalDateTime({timeZone:'Asia/Seoul'},new Date('2026-10-07T15:30:00Z')),{date:'2026-10-08',time:'00:30'});
  assert.deepEqual(momentLocalDateTime({timeZone:'America/New_York'},new Date('2026-10-07T02:30:00Z')),{date:'2026-10-06',time:'22:30'});
});
