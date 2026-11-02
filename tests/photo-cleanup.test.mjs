import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {cleanup} = require('../js/infrastructure/storage/photo-cleanup.js');
const MEDIA='sulsul-travel-media-v1',EXPENSE='sulsul-travel-expense-photos-v1';
function runtime(trips=[],{duringGet,abort=false}={}) {
  const storage={raw:JSON.stringify(trips),getItem(key){assert.equal(key,'st_trips_v2');return this.raw;}};
  const databases=new Map([[MEDIA,new Map()],[EXPENSE,new Map()]]),opened=[],reads=[];
  const indexedDB={open(name) {
    opened.push(name);const rows=databases.get(name);
    const db={close(){},objectStoreNames:{contains:()=>true},transaction() {
      const deletions=[],tx={aborted:false,abort(){if(this.aborted)return;this.aborted=true;tx.onabort?.();},objectStore(){return {
        get(id){
          reads.push([name,id]);const request={};
          queueMicrotask(()=>{if(tx.aborted)return;duringGet?.({storage,name,id,rows});request.result=rows.get(id);request.onsuccess?.();});return request;
        },
        delete(id){const request={};deletions.push(id);queueMicrotask(()=>{if(!tx.aborted)request.onsuccess?.();});return request;}
      };}};
      setTimeout(()=>{if(tx.aborted)return;if(abort){tx.error=new Error('합성 정리 거래 실패');tx.abort();return;}deletions.forEach(id=>rows.delete(id));tx.oncomplete?.();},1);
      return tx;
    }};
    const request={result:db};queueMicrotask(()=>request.onsuccess?.());return request;
  }};
  return {storage,indexedDB,databases,opened,reads,expectedRaw:storage.raw};
}

test('완료 문서 전체의 사본 참조를 보존하고 명시된 옛 후보만 지워 새 업로드는 유지한다',async()=>{
  const trips=[{id:'other-trip',journals:{0:{mediaIds:['shared-media']}},expenses:[{expensePhotoArchive:{id:'shared-archive'}}],custom:{nested:{mediaIds:['nested-shared']}}}];
  const state=runtime(trips),media=state.databases.get(MEDIA),expenses=state.databases.get(EXPENSE),invalidated=[];
  for(const id of ['old-media','shared-media','nested-shared','pending-upload','unrelated'])media.set(id,{id,tripId:'owner'});
  for(const id of ['old-archive','shared-archive','pending-archive','unrelated'])expenses.set(id,{id,tripId:'owner'});
  const result=await cleanup({...state,mediaIds:['old-media','shared-media','nested-shared','old-media'],expenseArchiveIds:['old-archive','shared-archive'],onExpenseDeleted:id=>{assert.equal(expenses.has(id),false);invalidated.push(id);}});
  assert.deepEqual(result,{mediaDeleted:1,expenseDeleted:1,skipped:false});
  assert.deepEqual([...media.keys()],['shared-media','nested-shared','pending-upload','unrelated']);
  assert.deepEqual([...expenses.keys()],['shared-archive','pending-archive','unrelated']);assert.deepEqual(invalidated,['old-archive']);
  assert.deepEqual(state.reads,[[MEDIA,'old-media'],[EXPENSE,'old-archive']]);
});

test('저장 문서가 검토한 원문과 다르면 IDB를 열기 전 정리를 거절한다',async()=>{
  const state=runtime();state.storage.raw='[{"id":"changed"}]';
  await assert.rejects(cleanup({...state,mediaIds:['old-media']}),error=>error.code==='STORAGE_CONFLICT');
  assert.deepEqual(state.opened,[]);
});

test('IDB 요청 처리 중 다른 창에서 문서가 변경되면 거래를 중단하고 후보를 유지한다',async()=>{
  const state=runtime([],{duringGet:({storage})=>{storage.raw='[{"id":"changed"}]';}}),media=state.databases.get(MEDIA);
  media.set('old-media',{id:'old-media'});
  await assert.rejects(cleanup({...state,mediaIds:['old-media']}),error=>error.code==='STORAGE_CONFLICT');
  assert.equal(media.has('old-media'),true);assert.deepEqual(state.opened,[MEDIA]);
});

test('거래가 실패하면 삭제 성공 요청이 있었어도 보관본과 캐시를 유지한다',async()=>{
  const state=runtime([],{abort:true}),expenses=state.databases.get(EXPENSE),invalidated=[];
  expenses.set('old-archive',{id:'old-archive'});
  await assert.rejects(cleanup({...state,expenseArchiveIds:['old-archive'],onExpenseDeleted:id=>invalidated.push(id)}),/합성 정리 거래 실패/);
  assert.equal(expenses.has('old-archive'),true);assert.deepEqual(invalidated,[]);
});

test('후보가 없거나 모두 현재 문서에 참조되면 IDB 없이 완료한다',async()=>{
  const state=runtime([{id:'trip',journals:{0:{mediaIds:['current']}}}]);
  assert.deepEqual(await cleanup({...state,indexedDB:null,mediaIds:['current']}),{mediaDeleted:0,expenseDeleted:0,skipped:false});
  assert.deepEqual(state.opened,[]);
});

test('잘못된 문서·후보 목록은 파괴적 거래 전에 거절한다',async()=>{
  const state=runtime();
  await assert.rejects(cleanup({...state,mediaIds:null}),/INVALID_PHOTO_CLEANUP_IDS/);
  await assert.rejects(cleanup({...state,expenseArchiveIds:['']}),/INVALID_PHOTO_CLEANUP_IDS/);
  state.storage.raw='{}';
  await assert.rejects(cleanup({...state,expectedRaw:'{}',mediaIds:['old']}),/INVALID_PHOTO_CLEANUP_DOCUMENT/);
  assert.deepEqual(state.opened,[]);
});
