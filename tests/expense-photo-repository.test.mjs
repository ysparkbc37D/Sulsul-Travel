import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const photo='data:image/jpeg;base64,YQ==',other='data:image/jpeg;base64,Yg==';
const fixture=()=>[{id:'trip-a',title:'합성 여행',expenses:[{id:'e1',title:'가상 물건',photos:[photo,other],primaryPhotoIndex:1}],journals:{0:{text:'보존할 글',photos:[photo]}}},{id:'trip-b',title:'다른 여행',expenses:[{id:'e2',photos:[other]}]}];
const plain=value=>JSON.parse(JSON.stringify(value));
function runtime({abort=false,hangOpen=false,hangTx=false}={}) {
  const values=new Map(),transactions=[];
  const db={close(){},objectStoreNames:{contains:()=>true},transaction(){
    const writes=[],tx={abort(){tx.onabort?.();},objectStore(){return {
      put(value){writes.push(structuredClone(value));},
      get(id){const request={};queueMicrotask(()=>{request.result=structuredClone(values.get(id));request.onsuccess?.();});return request;}
    };}};
    transactions.push(tx);
    if(!hangTx)setTimeout(()=>{
      if(abort){tx.error=new Error('합성 IDB 실패');tx.onabort?.();return;}
      writes.forEach(value=>values.set(value.id,value));tx.oncomplete?.();
    },1);
    return tx;
  }};
  const indexedDB={open(){const request={result:db};if(!hangOpen)queueMicrotask(()=>request.onsuccess?.());return request;}};
  const context={window:{indexedDB},URL,setTimeout,clearTimeout};
  vm.runInNewContext(readFileSync(new URL('../js/infrastructure/storage/expense-photo-repository.js',import.meta.url),'utf8'),context);
  const Repo=context.window.SulsulTravel.ExpensePhotoRepository;
  return {repo:new Repo(indexedDB,{timeoutMs:30}),Repo,indexedDB,values,transactions};
}

test('지출 사진만 완료된 보관본으로 분리하고 입력·일기·다른 여행은 보존한다',async()=>{
  const {repo,values}=runtime(),source=fixture(),before=JSON.stringify(source);
  const next=await repo.prepare(source,{tripId:'trip-a'});
  assert.equal(values.size,2);assert.equal(JSON.stringify(source),before);
  assert.deepEqual(plain(next[0].expenses[0].photos),source[0].expenses[0].photos);
  const projected=repo.project(next);
  assert.equal(projected[0].expenses[0].photos.length,0);assert.equal(projected[1].expenses[0].photos.length,0);
  assert.deepEqual(plain(projected[0].journals),source[0].journals);
  assert.deepEqual(plain(repo.hydrate(projected)),plain(next));
});

test('미확인·실패·대기 중인 보관 참조는 사진을 JSON에서 제외할 수 없다',async()=>{
  const source=fixture(),{repo}=runtime({abort:true});
  await assert.rejects(repo.prepare(source),/실패/);
  assert.deepEqual(plain(repo.project(source)),source);
  const hanging=runtime({hangTx:true}),pending=hanging.repo.prepare(source);
  assert.deepEqual(plain(hanging.repo.project(source)),source);
  await assert.rejects(pending,/초과/);
  assert.deepEqual(plain(hanging.repo.project(source)),source);
});

test('확인된 참조도 사진 원문·개수·해시가 달라지면 제거하지 않는다',async()=>{
  const {repo}=runtime(),next=await repo.prepare(fixture());
  const changed=plain(next);changed[0].expenses[0].photos[0]=other;
  assert.deepEqual(plain(repo.project(changed)[0].expenses[0].photos),[other,other]);
  const forged=plain(next);forged[0].expenses[0].expensePhotoArchive.hash='1:wrong';
  assert.equal(repo.project(forged)[0].expenses[0].photos.length,2);
  const fresh=runtime();assert.equal(fresh.repo.project(next)[0].expenses[0].photos.length,2);
});

test('새 캐시의 시작 로딩은 raw를 보존하고 실제 사진·대표 위치를 복원한다',async()=>{
  const {repo,Repo,indexedDB}=runtime(),prepared=await repo.prepare(fixture());
  const raw=JSON.stringify(repo.project(prepared)),newRepo=new Repo(indexedDB,{timeoutMs:30});
  assert.equal(newRepo.hydrate(JSON.parse(raw))[0].expenses[0].photos.length,0);
  const result=await newRepo.prime(raw);
  assert.equal(result.loaded,2);assert.equal(result.missing.length,0);
  const restored=newRepo.hydrate(JSON.parse(raw));
  assert.deepEqual(plain(restored),plain(prepared));assert.equal(restored[0].expenses[0].primaryPhotoIndex,1);
  assert.equal(JSON.stringify(repo.project(prepared)),raw);
});

test('사진 저장소 누락·손상·사용 불가도 참조를 유지하고 불완전한 백업을 거절한다',async()=>{
  const {repo,values,Repo,indexedDB}=runtime(),prepared=await repo.prepare(fixture()),raw=JSON.stringify(repo.project(prepared));
  values.clear();const missing=new Repo(indexedDB,{timeoutMs:30}),result=await missing.prime(raw);
  assert.equal(result.loaded,0);assert.equal(result.missing.length,2);
  assert.deepEqual(plain(missing.hydrate(JSON.parse(raw))),JSON.parse(raw));
  assert.throws(()=>missing.portable(JSON.parse(raw)),/완전한 파일/);
  const unavailable=new Repo(null,{timeoutMs:30});
  const failed=await unavailable.prime(raw);assert.equal(failed.missing.length,2);assert.ok(failed.error);
  const hanging=runtime({hangOpen:true});
  const delayed=await hanging.repo.prime(raw);assert.equal(delayed.missing.length,2);assert.match(delayed.error,/초과/);
});

test('독립 파일은 참조 대신 실제 사진을 포함하며 다른 저장소 없이 다시 읽는다',async()=>{
  const {repo}=runtime(),prepared=await repo.prepare(fixture()),portable=repo.portable(repo.project(prepared));
  assert.equal('expensePhotoArchive' in portable[0].expenses[0],false);
  assert.deepEqual(plain(portable[0].expenses[0].photos),[photo,other]);
  const empty=runtime();assert.deepEqual(plain(empty.repo.portable(portable)),plain(portable));
  assert.equal(JSON.stringify(prepared).includes('expensePhotoArchive'),true);
});

test('사진 수정은 새 보관 ID를 쓰고 기존 기기의 참조와 보관본을 덮어쓰지 않는다',async()=>{
  const {repo,Repo,indexedDB,values}=runtime(),first=await repo.prepare(fixture()),raw=JSON.stringify(repo.project(first));
  const edited=plain(first);edited[0].expenses[0].photos=[other];delete edited[0].expenses[0].expensePhotoArchive;
  const next=await repo.prepare(edited);
  assert.notEqual(next[0].expenses[0].expensePhotoArchive.id,first[0].expenses[0].expensePhotoArchive.id);
  assert.equal(values.size,3);
  const oldTab=new Repo(indexedDB,{timeoutMs:30});await oldTab.prime(raw);
  assert.deepEqual(plain(oldTab.hydrate(JSON.parse(raw))[0].expenses[0].photos),[photo,other]);
});
