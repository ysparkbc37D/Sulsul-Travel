import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const transfer=createRequire(import.meta.url)('../js/domain/trip-transfer.js');
const fixture=()=>({id:'t',title:'스페인',budget:0,countries:['스페인'],cities:['톨레도'],status:'ongoing',days:[{dayNum:1,planBlockId:'b',spots:[{id:'s',title:'대성당',time:'09:00'}]}],planBlockMeta:{b:{place:'톨레도',lodging:'호텔',notes:'예약 확인',status:'confirmed'}},journals:{0:{text:'개인 기록',photos:[]}},expenses:[{cat:'meal',krw:100}],initialBalances:{EUR:100},exchanges:[{amount:100}],wallets:[{currency:'EUR'}],activeCurrencies:['EUR'],apiKey:'never-export',appliedAiJobIds:['private-job']});
test('default snapshot preserves plan metadata and zero budget while excluding private records',()=>{
 const trip=fixture(),result=transfer.parse(JSON.stringify(transfer.create(trip)));
 assert.deepEqual(result.trip.planBlockMeta,trip.planBlockMeta);assert.equal(result.trip.budget,0);assert.equal(result.trip.status,'ongoing');
 assert.deepEqual(result.trip.journals,{});assert.deepEqual(result.trip.expenses,[]);assert.equal(result.trip.wallets,undefined);assert.equal(result.trip.apiKey,undefined);assert.equal(result.trip.appliedAiJobIds,undefined);
 assert.equal(trip.journals[0].text,'개인 기록');
});
test('공유하지 않는 개인 기록의 텍스트와 형식이 계획 사본을 막지 않는다',()=>{
 const trip=fixture();trip.journals={0:{text:'가격은 x<y, <b>내 기록</b>',photos:['javascript:private-photo']}};
 trip.activityRecords={broken:{text:'<img src=x>'}};trip.expenses[0].photos=['javascript:private-receipt'];
 const before=structuredClone(trip),shared=transfer.create(trip).trip;
 assert.deepEqual(shared.journals,{});assert.deepEqual(shared.expenses,[]);assert.equal(shared.activityRecords,undefined);
 assert.deepEqual(trip,before);
 assert.throws(()=>transfer.create(trip,{journals:true}));assert.throws(()=>transfer.create(trip,{finances:true}));
});
test('계획 안의 사진과 일정 개인 기록도 기본 공유에서 제외하고 금융 사진 동의는 보존한다',()=>{
 const trip=fixture(),spot=trip.days[0].spots[0];
 Object.assign(spot,{recordId:'private-record',originalText:'<b>개인 문장</b>',photos:['javascript:private-photo'],mediaIds:['private-photo-id'],st_gemini_key:'nested-secret'});
 trip.planBlockMeta.b.nested={journalText:'x<y',photoThumbnails:['private-photo'],access_token:'nested-token',note:'예약 확인'};
 trip.expenses[0].photos=['data:image/jpeg;base64,YQ=='];
 const shared=transfer.create(trip,{finances:true}).trip,encoded=JSON.stringify(shared);
 for(const forbidden of ['private-record','개인 문장','private-photo','nested-secret','nested-token','journalText','recordId','originalText'])assert.equal(encoded.includes(forbidden),false,forbidden);
 assert.equal(shared.planBlockMeta.b.nested.note,'예약 확인');assert.deepEqual(shared.expenses[0].photos,trip.expenses[0].photos);
 assert.throws(()=>transfer.create({...fixture(),days:[{spots:[{title:'<img src=x onerror=alert(1)>'}]}]}));
 assert.throws(()=>transfer.create({...fixture(),days:null}));
});
test('opted-in file roundtrip preserves journals and all finance structures',()=>{
 const t=fixture(),result=transfer.parse(JSON.stringify(transfer.create(t,{journals:true,finances:true})));
 for(const key of ['journals','expenses','exchanges','initialBalances','wallets','activeCurrencies'])assert.deepEqual(result.trip[key],t[key]);
 assert.ok(result.shareId);assert.equal(result.schemaVersion,1);
});
test('legacy links with ver and trip remain readable',()=>{
 assert.equal(transfer.parse(JSON.stringify({ver:'1.7.8',trip:fixture()})).trip.title,'스페인');
});
test('malformed structures, future schemas and HTML imports are rejected before storage',()=>{
 for(const trip of [{...fixture(),days:null},{...fixture(),days:[{spots:[null]}]},{...fixture(),journals:[]},{...fixture(),title:'<img src=x>'}])assert.throws(()=>transfer.parse(JSON.stringify({trip})));
 assert.throws(()=>transfer.parse(JSON.stringify({schemaVersion:2,trip:fixture()})));
 assert.throws(()=>transfer.parse('{broken'));
 assert.throws(()=>transfer.parse('{"trip":{"title":"t","days":[],"__proto__":{"polluted":true}}}'));
});
test('photos reject executable URLs and accept raster data',()=>{
 assert.equal(transfer.safePhoto('javascript:alert(1)'), '');
 assert.equal(transfer.safePhoto('data:image/svg+xml,<svg/>'), '');
 assert.equal(transfer.safePhoto('https://example.com/"x.png'),'https://example.com/%22x.png');
 assert.equal(transfer.safePhoto('data:image/jpeg;base64,YQ=='),'data:image/jpeg;base64,YQ==');
});
test('일정 기록은 동의한 공유에만 포함되고 잘못된 대표사진은 거부한다',()=>{
 const trip=fixture();trip.days[0].spots[0].recordId='r';
 trip.activityRecords={r:{id:'r',text:'도착한 순간',originalText:'도착',photos:['data:image/jpeg;base64,YQ=='],coverIndex:0,context:{title:'공항',date:'2026-09-14',time:'14:00'}}};
 assert.equal(transfer.create(trip).trip.activityRecords,undefined);
 const shared=transfer.parse(JSON.stringify(transfer.create(trip,{journals:true})));
 assert.deepEqual(shared.trip.activityRecords,trip.activityRecords);
 assert.equal(shared.trip.days[0].spots[0].recordId,'r');
 trip.activityRecords.r.coverIndex=4;assert.throws(()=>transfer.validateTrip(trip));
 trip.activityRecords.r.coverIndex=0;trip.activityRecords.r.photos=['javascript:alert(1)'];assert.throws(()=>transfer.validateTrip(trip));
});
test('지출 사진은 금융 공유 선택에 따라 보존되고 잘못된 주소는 거부한다',()=>{
 const trip=fixture();trip.expenses[0].photos=['data:image/jpeg;base64,YQ=='];trip.expenses[0].primaryPhotoIndex=0;
 assert.deepEqual(transfer.create(trip).trip.expenses,[]);
 assert.deepEqual(transfer.parse(JSON.stringify(transfer.create(trip,{finances:true}))).trip.expenses,trip.expenses);
 trip.expenses[0].photos=['javascript:alert(1)'];assert.throws(()=>transfer.validateTrip(trip));
});
