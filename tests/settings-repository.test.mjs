import test from 'node:test';
import assert from 'node:assert/strict';
import '../js/infrastructure/storage/settings-repository.js';
const read=globalThis.SulsulTravel.SettingsRepository.readRates;
function storage(raw){const map=new Map([['rates',raw]]);return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),map};}
test('손상된 설정은 원문을 보관하고 앱 시작에 안전한 기본값을 반환한다',()=>{
  for(const raw of ['{broken','null','[]','{"USD":-1}','{"USD":"1300"}']){
    const source=storage(raw);assert.deepEqual(read(source,'rates'),{});
    assert.equal(source.getItem('rates'),raw);
    assert.equal([...source.map.entries()].find(([key])=>key.startsWith('rates_corrupt_'))?.[1],raw);
  }
});
test('정상 환율과 ARS MEP 맞춤 설정을 그대로 읽는다',()=>{
  const source=storage('{"USD":1300,"ARS_MEP":0.95}');assert.deepEqual(read(source,'rates'),{USD:1300,ARS_MEP:0.95});
  assert.equal(source.map.size,1);
});
test('설정 저장소 접근 실패가 설정 읽기 호출 밖으로 전파되지 않는다',()=>{
  assert.deepEqual(read({getItem:()=>{throw new Error('blocked');}},'rates'),{});
});
