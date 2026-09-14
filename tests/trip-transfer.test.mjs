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
