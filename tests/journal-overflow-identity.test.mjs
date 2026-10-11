import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function fixture(){
  const values=new Map();
  const db={close(){},transaction(){
    const tx={objectStore(){return {
      put(value){values.set(value.key,structuredClone(value));queueMicrotask(()=>tx.oncomplete?.());},
      getAll(){const request={result:[...values.values()].map(value=>structuredClone(value))};queueMicrotask(()=>{request.onsuccess?.();queueMicrotask(()=>tx.oncomplete?.());});return request;},
      delete(key){values.delete(key);}
    };}};
    return tx;
  }};
  const indexedDB={open(){const request={result:db};queueMicrotask(()=>request.onsuccess?.());return request;}};
  const context={window:{indexedDB},Date};
  vm.runInNewContext(readFileSync(new URL('../js/infrastructure/storage/journal-overflow-repository.js',import.meta.url),'utf8'),context);
  return {repo:new context.window.SulsulTravel.JournalOverflowRepository(),values};
}

test('보조 저장은 일정 번호가 같아도 원래 날짜와 일정 ID가 다른 글을 덮어쓰지 않는다',async()=>{
  const {repo,values}=fixture();
  const first=await repo.save({tripId:'trip',dayIndex:0,dayId:'original-day',date:'2030-01-01',revision:4,journal:{id:'record-1',text:'원래 첫날 글',originalText:'원문',photos:['사진'],mediaIds:['사진 ID']}});
  const second=await repo.save({tripId:'trip',dayIndex:0,dayId:'inserted-day',date:'2029-12-31',revision:5,journal:{id:'record-2',text:'새 전날 글'}});
  assert.notEqual(first.key,second.key);assert.equal(values.size,2);
  assert.equal(first.journal.dayId,'original-day');assert.equal(first.journal.date,'2030-01-01');assert.equal(first.journal.id,'record-1');assert.equal(first.journal.journalIdentityVersion,1);
  assert.equal('photos' in first.journal,false);assert.equal('mediaIds' in first.journal,false);assert.equal(first.journal.originalText,'원문');
});

test('날짜를 모르는 구 보조 저장은 날짜를 지어내지 않고 기존 번호 계약을 유지한다',async()=>{
  const {repo}=fixture();
  const result=await repo.save({tripId:'trip',dayIndex:2,journal:{text:'날짜 미상 원문'}});
  assert.equal(result.key,'trip:2');assert.equal(result.dayIndex,2);
  assert.equal('date' in result,false);assert.equal('dayId' in result,false);assert.equal('date' in result.journal,false);
  await assert.rejects(repo.save({tripId:'trip',dayIndex:'2',journal:{text:'잘못된 형식'}}),/INVALID_JOURNAL_OVERFLOW/);
});

test('콜론이 포함된 다른 여행 ID의 보조 원문을 접두사가 같은 여행 삭제에서 보호한다',async()=>{
  const {repo,values}=fixture();
  await repo.save({tripId:'trip',dayIndex:0,journal:{text:'삭제할 여행'}});
  await repo.save({tripId:'trip:other',dayIndex:0,journal:{text:'보존할 다른 여행'}});
  assert.equal(await repo.deleteTrip('trip'),1);
  assert.equal(values.size,1);
  assert.equal([...values.values()][0].tripId,'trip:other');
  assert.equal([...values.values()][0].journal.text,'보존할 다른 여행');
});
