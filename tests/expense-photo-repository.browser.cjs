/* 실제 IndexedDB 거래·새 페이지·독립 파일만 사용하며 개인 브라우저에는 접근하지 않는다. */
'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.local-review','expense-photo-storage');
const files=['js/domain/trip-adapter.js','js/infrastructure/storage/legacy-trip-repository.js','js/infrastructure/storage/expense-photo-repository.js'];
const server=http.createServer((req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname.slice(1);
  if(!name){res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><meta charset="utf-8"><title>합성 지출 사진 검사</title>'+files.map(file=>`<script src="/${file}"></script>`).join(''));return;}
  if(!files.includes(name)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type','application/javascript');res.end(fs.readFileSync(path.join(root,name)));
});
(async()=>{
  fs.mkdirSync(out,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  const errors=[],results=[];
  async function open(context){const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));await page.goto(`http://127.0.0.1:${server.address().port}/`);return page;}
  try{
    const context=await browser.newContext({serviceWorkers:'block'}),first=await open(context);
    const created=await first.evaluate(async()=>{
      const canvas=document.createElement('canvas');canvas.width=800;canvas.height=600;const ctx=canvas.getContext('2d');ctx.fillStyle='#195b49';ctx.fillRect(0,0,800,600);ctx.fillStyle='#dfab42';ctx.fillRect(120,100,400,300);
      const photo=canvas.toDataURL('image/jpeg',.8),trip={id:'storage-synthetic',title:'합성 사진 여행',revision:0,days:[{id:'d1',title:'합성 하루',spots:[]}],journals:{0:{text:'보존할 원문',photos:[photo]}},expenses:[{id:'e1',title:'가상 물건',photos:[photo,photo],primaryPhotoIndex:1},{id:'e2',title:'다른 내역',photos:[photo],primaryPhotoIndex:0}]};
      window.original=JSON.stringify([trip]);window.photoRepo=SulsulTravel.expensePhotoRepository;
      window.legacy=new SulsulTravel.LegacyTripRepository(localStorage,{serialize:trips=>photoRepo.project(trips),restore:trips=>photoRepo.hydrate(trips)});
      window.state=legacy.saveAll(await photoRepo.prepare([trip],{tripId:trip.id}));
      const raw=localStorage.getItem('st_trips_v2'),projected=JSON.parse(raw);
      return {inputUnchanged:JSON.stringify([trip])===original,raw,photos:state[0].expenses[0].photos.length,projectedPhotos:projected[0].expenses[0].photos.length,journalPhoto:projected[0].journals[0].photos[0],id:projected[0].expenses[0].expensePhotoArchive.id,portable:photoRepo.portable(state)};
    });
    assert.equal(created.inputUnchanged,true);assert.equal(created.photos,2);assert.equal(created.projectedPhotos,0);assert.ok(created.journalPhoto.startsWith('data:image/jpeg'));
    assert.equal('expensePhotoArchive' in created.portable[0].expenses[0],false);
    results.push({name:'실제 IDB 완료 후에만 JSON 지출 사진 분리',passed:true});

    const second=await open(context);
    const restarted=await second.evaluate(async()=>{
      window.photoRepo=SulsulTravel.expensePhotoRepository;const raw=localStorage.getItem('st_trips_v2');
      const result=await photoRepo.prime(raw);
      window.legacy=new SulsulTravel.LegacyTripRepository(localStorage,{serialize:trips=>photoRepo.project(trips),restore:trips=>photoRepo.hydrate(trips)});window.state=legacy.loadAll().trips;
      return {loaded:result.loaded,missing:result.missing,unchanged:localStorage.getItem('st_trips_v2')===raw,photos:state[0].expenses.map(expense=>expense.photos.length),primary:state[0].expenses[0].primaryPhotoIndex,corruptBackups:Object.keys(localStorage).filter(key=>key.includes('_corrupt_'))};
    });
    assert.equal(restarted.loaded,2);assert.deepEqual(restarted.missing,[]);assert.equal(restarted.unchanged,true);assert.deepEqual(restarted.photos,[2,1]);assert.equal(restarted.primary,1);assert.deepEqual(restarted.corruptBackups,[]);
    results.push({name:'새 페이지의 캐시 로딩·원문·대표사진 복원',passed:true});

    const updated=await second.evaluate(async()=>{
      const draft=JSON.parse(JSON.stringify(state));draft[0].expenses[0].photos=[draft[0].expenses[0].photos[0]];delete draft[0].expenses[0].expensePhotoArchive;draft[0].expenses[0].primaryPhotoIndex=0;
      state=legacy.saveAll(await photoRepo.prepare(draft),{bumpTripId:state[0].id});return {id:state[0].expenses[0].expensePhotoArchive.id,raw:localStorage.getItem('st_trips_v2')};
    });
    assert.notEqual(updated.id,created.id);
    const stale=await first.evaluate(async()=>{
      const draft=JSON.parse(JSON.stringify(state));draft[0].title='오래된 탭의 수정';
      try{legacy.saveAll(await photoRepo.prepare(draft),{bumpTripId:draft[0].id});return {rejected:false};}catch(error){return {rejected:error.code==='STORAGE_CONFLICT',raw:localStorage.getItem('st_trips_v2'),oldPhotoCount:state[0].expenses[0].photos.length};}
    });
    assert.equal(stale.rejected,true);assert.equal(stale.raw,updated.raw);assert.equal(stale.oldPhotoCount,2);
    // 이전 보관 ID도 삭제하지 않아 오래된 탭의 사진을 덮어쓰지 않는다.
    const oldArchive=await first.evaluate(async id=>{
      const open=indexedDB.open('sulsul-travel-expense-photos-v1',1);const db=await new Promise((resolve,reject)=>{open.onsuccess=()=>resolve(open.result);open.onerror=()=>reject(open.error);});
      try{return await new Promise((resolve,reject)=>{const request=db.transaction('archives','readonly').objectStore('archives').get(id);request.onsuccess=()=>resolve(request.result.photos.length);request.onerror=()=>reject(request.error);});}finally{db.close();}
    },created.id);
    assert.equal(oldArchive,2);
    results.push({name:'동시 탭 충돌 시 문서·기존 보관본 유지',passed:true});

    const isolated=await browser.newContext({serviceWorkers:'block'}),filePage=await open(isolated);
    const portable=await filePage.evaluate(async trips=>{
      const repo=SulsulTravel.expensePhotoRepository;const before=await repo.prime('[]');const data=repo.portable(trips);localStorage.setItem('st_trips_v2',JSON.stringify(data));
      return {loaded:before.loaded,photos:JSON.parse(localStorage.getItem('st_trips_v2'))[0].expenses[0].photos.length,ref:'expensePhotoArchive' in data[0].expenses[0]};
    },created.portable);
    assert.deepEqual(portable,{loaded:0,photos:2,ref:false});await isolated.close();
    results.push({name:'다른 브라우저 보관소 없는 독립 파일 재사용',passed:true});

    const aborted=await second.evaluate(async()=>{
      const repo=new SulsulTravel.ExpensePhotoRepository(),run=repo._transaction.bind(repo),trip=[{id:'abort-trip',expenses:[{id:'abort-expense',photos:[state[0].expenses[0].photos[0]]}]}],before=JSON.stringify(trip);
      repo._transaction=(mode,work)=>run(mode,store=>{const value=work(store);store.transaction.abort();return value;});
      let failed=false;try{await repo.prepare(trip);}catch(_){failed=true;}
      return {failed,kept:repo.project(trip)[0].expenses[0].photos.length,unchanged:JSON.stringify(trip)===before};
    });
    assert.deepEqual(aborted,{failed:true,kept:1,unchanged:true});
    results.push({name:'실제 IDB abort는 보관 성공으로 채택하지 않음',passed:true});

    await second.evaluate(async id=>{
      const request=indexedDB.open('sulsul-travel-expense-photos-v1',1),db=await new Promise(resolve=>{request.onsuccess=()=>resolve(request.result);});
      try{await new Promise((resolve,reject)=>{const tx=db.transaction('archives','readwrite');tx.objectStore('archives').delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}finally{db.close();}
    },updated.id);
    const missingPage=await open(context),missing=await missingPage.evaluate(async()=>{
      const raw=localStorage.getItem('st_trips_v2'),repo=SulsulTravel.expensePhotoRepository,result=await repo.prime(raw),restored=repo.hydrate(JSON.parse(raw));let blocked=false;
      try{repo.portable(restored);}catch(_){blocked=true;}
      return {missing:result.missing.length,otherPhotoCount:restored[0].expenses[1].photos.length,blocked,unchanged:localStorage.getItem('st_trips_v2')===raw,refKept:!!restored[0].expenses[0].expensePhotoArchive};
    });
    assert.deepEqual(missing,{missing:1,otherPhotoCount:1,blocked:true,unchanged:true,refKept:true});
    results.push({name:'누락 보관본은 참조 유지·다른 사진 복원·불완전 파일 차단',passed:true});
    assert.deepEqual(errors,[]);const result={passed:true,checks:results.length,results,runtimeErrors:errors};fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
