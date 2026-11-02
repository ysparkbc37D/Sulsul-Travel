import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const Photos = require('../js/domain/photo-optimization.js');
const photo = 'data:image/jpeg;base64,YWJjZA==', smaller = 'data:image/jpeg;base64,YQ==', thumb = 'data:image/png;base64,Yg==';
const fixture = () => [{id:'trip-a',revision:4,days:[{id:'day-a'}],custom:{preserved:true},journals:{0:{id:'journal-a',dayId:'day-a',text:'하루 글',originalText:'하루 원문',photos:[photo],photoThumbnails:[thumb],mediaIds:['media-a'],coverIndex:0},'archive:old':{id:'journal-old',date:'2020-01-01',text:'보관 글',photos:[photo]}},activityRecords:{'activity-a':{id:'activity-a',text:'일정 글',context:{title:'가상 일정'},photos:[photo],coverIndex:0}},momentEntries:[{id:'moment-a',text:'순간 글',photos:[photo,photo],photoThumbnails:[thumb,thumb],mediaIds:['media-shared','media-last'],coverIndex:1}],expenses:[{id:'expense-a',title:'합성 지출',memo:'영수증 메모',amount:100,photos:[photo],primaryPhotoIndex:0,expensePhotoArchive:{id:'archive-a',count:1,hash:'4:abc'}}]},{id:'trip-b',journals:{0:{text:'다른 여행',photos:[photo],mediaIds:['media-shared']}},expenses:[]}];
const change = (locator,source=smaller,extra={}) => ({locator,before:locator.source,source,...extra});

test('모든 날짜 키·기록 종류를 순회하고 외부 주소·사진 아닌 값은 가져오지 않는다',() => {
  const trips = fixture(); trips[0].expenses[0].photos.push('https://example.invalid/photo.jpg',null,99,'javascript:alert(1)');
  const before = JSON.stringify(trips), entries = Photos.enumerate(trips);
  assert.equal(entries.length,7); assert.deepEqual(new Set(entries.map(entry=>entry.kind)),new Set(['journal','activity','moment','expense']));
  assert.ok(entries.some(entry=>entry.recordKey==='archive:old'));
  assert.equal(Photos.enumerate(trips,{scopeTripId:'trip-a'}).length,6);
  assert.equal(JSON.stringify(trips),before);
  assert.throws(()=>Photos.enumerate(trips,{scopeTripId:'missing'}),/PHOTO_TRIP_NOT_FOUND/);
});

test('사진 원본 교체는 글·날짜·미지 필드·사진 순서와 대표 위치를 보존하고 옛 참조만 후보로 반환한다',() => {
  const trips = fixture(), before = JSON.stringify(trips), entries = Photos.enumerate(trips,{scopeTripId:'trip-a'});
  const result = Photos.apply(trips,entries.map(entry=>change(entry)));
  assert.equal(JSON.stringify(trips),before); assert.equal(result.changedPhotos,6); assert.deepEqual(result.changedTrips,['trip-a']);
  assert.deepEqual(new Set(result.oldMediaIds),new Set(['media-a','media-shared','media-last']));
  assert.deepEqual(result.oldExpenseArchiveIds,['archive-a']);
  const next = result.trips[0];
  assert.equal(next.revision,4);assert.deepEqual(next.days,trips[0].days);assert.deepEqual(next.custom,trips[0].custom);
  assert.equal(next.journals[0].text,'하루 글');assert.equal(next.journals[0].originalText,'하루 원문');assert.equal(next.journals[0].dayId,'day-a');
  assert.equal(next.momentEntries[0].coverIndex,1);assert.deepEqual(next.momentEntries[0].photos,[smaller,smaller]);
  assert.deepEqual(next.momentEntries[0].photoThumbnails,[null,null]);assert.deepEqual(next.momentEntries[0].mediaIds,[null,null]);
  assert.equal(next.expenses[0].primaryPhotoIndex,0);assert.equal(next.expenses[0].memo,'영수증 메모');assert.equal('expensePhotoArchive' in next.expenses[0],false);
  assert.equal('photoThumbnails' in next.expenses[0],false);assert.deepEqual(result.trips[1],trips[1]);
});

test('교체하지 않은 위치의 메타데이터를 유지하고 명시한 새 썸네일·보관 ID를 연결한다',() => {
  const trips=fixture(), entry=Photos.enumerate(trips).find(value=>value.kind==='moment'&&value.photoIndex===1);
  const result=Photos.apply(trips,[change(entry,smaller,{thumbnail:thumb,mediaId:'media-new'})]);
  const record=result.trips[0].momentEntries[0];
  assert.deepEqual(record.photos,[photo,smaller]);assert.deepEqual(record.photoThumbnails,[thumb,thumb]);assert.deepEqual(record.mediaIds,['media-shared','media-new']);
  assert.deepEqual(result.oldMediaIds,['media-last']);
});

test('enumerate 항목을 펼친 교체 요청의 옛 썸네일·보관 ID도 새 사진에 유지하지 않는다',() => {
  const trips=fixture(),entry=Photos.enumerate(trips)[0];
  const result=Photos.apply(trips,[{...entry,before:entry.source,source:smaller}]);
  assert.deepEqual(result.trips[0].journals[0].photoThumbnails,[null]);
  assert.deepEqual(result.trips[0].journals[0].mediaIds,[null]);
  assert.deepEqual(result.oldMediaIds,['media-a']);
});

test('검토 뒤 원본·안정 식별자·항목이 달라지거나 중복 교체하면 전체 적용을 거절한다',() => {
  const trips=fixture(),entry=Photos.enumerate(trips)[0],before=JSON.stringify(trips);
  for(const mutate of [value=>value[0].journals[0].photos[0]=thumb,value=>value[0].journals[0].id='different',value=>delete value[0].journals[0]]) {
    const changed=structuredClone(trips);mutate(changed);assert.throws(()=>Photos.apply(changed,[change(entry)]),/PHOTO_(?:SOURCE|RECORD)_CHANGED/);
  }
  assert.throws(()=>Photos.apply(trips,[change(entry),change(entry)]),/DUPLICATE_PHOTO_CHANGE/);
  assert.equal(JSON.stringify(trips),before);
});

test('옛 ID 없는 배열 기록의 순서가 바뀌면 같은 사진도 다른 기록에 적용하지 않는다',() => {
  const trips=[{id:'legacy',expenses:[{title:'첫 항목',photos:[photo]},{title:'다른 항목',photos:[photo]}]}];
  const entry=Photos.enumerate(trips)[0], changed=structuredClone(trips);changed[0].expenses.reverse();
  assert.throws(()=>Photos.apply(changed,[change(entry)]),/PHOTO_RECORD_CHANGED/);
});

test('ID 있는 배열 기록은 위치가 달라져도 같은 ID의 원본만 교체한다',() => {
  const trips=fixture();trips[0].expenses.push({id:'expense-b',photos:[photo]});
  const entry=Photos.enumerate(trips).find(value=>value.kind==='expense'&&value.recordKey==='id:expense-a');
  trips[0].expenses.reverse();const result=Photos.apply(trips,[change(entry)]);
  assert.equal(result.trips[0].expenses[0].photos[0],photo);assert.equal(result.trips[0].expenses[1].photos[0],smaller);
});

test('누락·null·외부 주소·안전하지 않은 교체나 메타데이터는 조용히 적용하지 않는다',() => {
  const trips=fixture(),entry=Photos.enumerate(trips)[0],before=JSON.stringify(trips);
  for(const source of [null,undefined,'https://example.invalid/photo.jpg','data:image/svg+xml;base64,YQ==','data:image/jpeg;base64,=bad']) {
    assert.throws(()=>Photos.apply(trips,[{...change(entry),source}]),/INVALID_PHOTO_REPLACEMENT/);
  }
  assert.throws(()=>Photos.apply(trips,[change(entry,smaller,{thumbnail:'javascript:alert(1)'})]),/INVALID_PHOTO_THUMBNAIL/);
  assert.throws(()=>Photos.apply(trips,[change(entry,smaller,{mediaId:''})]),/INVALID_PHOTO_MEDIA_ID/);
  assert.throws(()=>Photos.apply(trips,[{...change(entry),locator:{...entry,identity:null}}]),/PHOTO_RECORD_CHANGED/);
  assert.equal(JSON.stringify(trips),before);
});

test('동일한 원본은 무변경으로 유지하고 크기는 헤더 대신 디코딩된 base64 바이트로 센다',() => {
  const trips=fixture(),entry=Photos.enumerate(trips)[0],before=JSON.stringify(trips),same=Photos.apply(trips,[change(entry,photo)]);
  assert.equal(JSON.stringify(same.trips),before);assert.equal(same.changedPhotos,0);assert.deepEqual(same.oldMediaIds,[]);
  assert.equal(Photos.sourceBytes(photo),4);assert.equal(Photos.sourceBytes(smaller),1);assert.equal(Photos.sourceBytes('https://example.invalid'),0);
  assert.equal(Photos.sourceBytes('data:image/png;base64,YW Jj\nZA=='),4);
  assert.deepEqual(Photos.stats(trips),{count:7,sourceBytes:28,thumbnailBytes:3,totalBytes:31});
});
