/* 여행 자료 IndexedDB 저장소 회귀 (v2.0.8, 계획 3단계 3b). 합성 여행만 사용한다.
 * 저장소 단위(저장소 스크립트만 불러온 시험 페이지):
 *  1) 옛 문서를 원문 보관 → 한 거래로 복사 → 대조한 뒤 옮기고, 옛 문서에는 줄바꿈 표시만 남긴다(같은 ID 여행도 잃지 않음).
 *  2) 옮기기 전에 열린 구버전 창은 저장을 거절당한다. 두 새 창은 버전 번호로 충돌을 가른다.
 *  3) 저장은 바뀐 여행만 쓰고, 기기 문서 한도(약 5MB)를 넘는 자료도 저장·재로드된다.
 *  4) 구버전 앱이 옮긴 뒤의 옛 문서를 바꾸면 따로 보관하고 알린다. 30일 뒤 옛 문서를 지운다.
 *  5) IndexedDB를 쓸 수 없으면 옮긴 적이 없을 때만 기기 문서로 계속 쓰고, 옮긴 뒤에는 저장을 거절한다.
 *  6) 손상된 옛 문서는 옮기지 않고 복구 모드로 시작한다. 옮긴 결과가 원문과 다르면 이전을 취소한다.
 * 앱 단위:
 *  7) 앱을 열면 옮기고, 새로고침해도 같은 여행이며, 저장 공간 화면이 IndexedDB를 보인다.
 *  8) 실제 v2.0.7 앱: 업데이트 중 열려 있던 창은 저장을 거절당하고, 구버전이 새로 열려 쓴 변경은 새 버전이 따로 보관하고 알린다. */
const {chromium}=require('./helpers/playwright.cjs');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.woff2':'font/woff2','.ico':'image/x-icon','.webmanifest':'application/manifest+json','.svg':'image/svg+xml'};
const TEST_PAGE=`<!doctype html><meta charset="utf-8"><title>trip store</title>
<script src="/js/infrastructure/storage/legacy-trip-repository.js"></script>
<script src="/js/infrastructure/storage/idb-trip-repository.js"></script>
<script src="/js/infrastructure/storage/trip-store.js"></script>`;
let serveRoot=root;
const server=http.createServer((req,res) => {
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(pathname==='/__trip-store-test.html'){res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(TEST_PAGE);return;}
  const file=path.resolve(serveRoot,'.'+(pathname==='/' ? '/index.html' : pathname));
  if(!file.startsWith(serveRoot+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,content) => {if(error){res.writeHead(404).end();return;}res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',types[path.extname(file)] || 'application/octet-stream');res.end(content);});
});
// 태그 v2.0.7(옮기기 전 마지막 버전)의 코드를 풀고 이 기기의 개행에 맞춰 SRI를 다시 계산한다.
function oldApp(tag='v2.0.7') {
  const target=path.join(root,'.local-review',`old-${tag}`);
  try {
    if(!fs.existsSync(path.join(target,'index.html'))){
      fs.mkdirSync(target,{recursive:true});
      const archive=path.join(root,'.local-review',`old-${tag}.tar`);
      execFileSync('git',['-C',root,'archive','--format=tar','--output',archive,tag],{stdio:'pipe'});
      execFileSync('tar',['-xf',`old-${tag}.tar`,'-C',`old-${tag}`],{cwd:path.dirname(archive),stdio:'pipe'});fs.rmSync(archive,{force:true});
    }
    execFileSync(process.execPath,[path.join(target,'tools','update-asset-integrity.cjs')],{stdio:'pipe'});
    return target;
  } catch(error) { return {error:String(error.stderr || error.message).slice(0,300)}; }
}
const trip=(id,title,extra={}) => ({id,title,startDate:'2030-06-01',durationDays:2,countries:['대한민국'],cities:['가상시'],revision:0,currency:'KRW',activeCurrencies:['KRW'],
  days:[{id:`${id}-d1`,dayNum:1,date:'2030-06-01',city:'가상시',spots:[{id:`${id}-s1`,time:'09:00',title:'가상 산책'}]},{id:`${id}-d2`,dayNum:2,date:'2030-06-02',city:'가상시',spots:[]}],
  journals:{0:{text:`${title}의 첫날 회고`,photos:[],mediaIds:[]}},activityRecords:{},momentEntries:[],expenses:[{id:`${id}-e1`,title:'가상 커피',amount:4500,curr:'KRW',krw:4500,date:'2030-06-01'}],checklist:[],...extra});

const results=[];
async function check(name,run){try{const details=await run();results.push({name,passed:true,details});}catch(error){results.push({name,passed:false,error:String(error.stack||error).slice(0,900)});}}

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || undefined});
  const fresh=async()=>{const context=await browser.newContext();const page=await context.newPage();await page.goto(origin+'/__trip-store-test.html');return {context,page};};
  try {
    await check('옛 문서를 원문 보관·복사·대조한 뒤 옮기고 옛 문서에는 표시만 남긴다(같은 ID 여행 포함)',async()=>{
      const {context,page}=await fresh();
      const legacy=[trip('a','가상 여행 A'),trip('b','가상 여행 B'),{...trip('a','같은 ID의 두 번째 여행'),title:'같은 ID의 두 번째 여행'}];
      const out=await page.evaluate(async legacy=>{
        const raw=JSON.stringify(legacy);localStorage.setItem('st_trips_v2',raw);
        const T=SulsulTravel,repo=new T.IdbTripRepository(localStorage);
        const stored=await repo.readRaw(),loaded=await repo.loadAll(),snapshot=await repo.getSnapshot(),stats=await repo.stats();
        return {same:stored===raw,titles:loaded.trips.map(t=>t.title),ids:loaded.trips.map(t=>t.id),snapshot:snapshot?.raw===raw,legacyMarked:localStorage.getItem('st_trips_v2')===raw+'\n',adopted:localStorage.getItem('st_trip_store_v1'),token:repo.token?.()??repo.observedRaw,stats:{kind:stats.kind,trips:stats.trips,version:stats.version},migration:loaded.migration};
      },legacy);
      assert.equal(out.same,true,'옮긴 원문이 옛 문서와 같다');
      assert.deepEqual(out.ids,['a','b','a']);assert.equal(out.titles[2],'같은 ID의 두 번째 여행');
      assert.equal(out.snapshot,true,'옮기기 전 원문 보관');assert.equal(out.legacyMarked,true,'옛 문서는 지우지 않고 표시만 한다');
      assert.equal(out.adopted,'indexeddb');assert.deepEqual(out.stats,{kind:'indexedDB',trips:3,version:1});
      await context.close();return out.migration;
    });

    await check('옮기기 전에 열린 구버전 창은 저장을 거절당하고, 두 새 창은 버전 번호로 충돌을 가른다',async()=>{
      const {context,page}=await fresh();
      const out=await page.evaluate(async seed=>{
        localStorage.setItem('st_trips_v2',JSON.stringify(seed));
        const T=SulsulTravel,old=new T.LegacyTripRepository(localStorage),oldTrips=old.loadAll().trips;
        const a=new T.IdbTripRepository(localStorage),b=new T.IdbTripRepository(localStorage);
        const ta=(await a.loadAll()).trips,tb=(await b.loadAll()).trips;
        let oldError=null;try{oldTrips[0].title='구버전 창의 변경';old.saveAll(oldTrips);}catch(error){oldError=error.code;}
        await a.commit(ta,{tripId:'a',expectedRevision:0,change:t=>{t.title='A 창의 변경';}});
        let staleError=null;try{await b.commit(tb,{tripId:'b',expectedRevision:0,change:t=>{t.title='B 창의 늦은 변경';}});}catch(error){staleError=error.code;}
        const reread=new T.IdbTripRepository(localStorage),after=(await reread.loadAll()).trips;
        const b2=(await b.loadAll()).trips;await b.commit(b2,{tripId:'b',expectedRevision:0,change:t=>{t.title='B 창이 새로 읽고 저장';}});
        const final=(await new T.IdbTripRepository(localStorage).loadAll()).trips;
        return {oldError,staleError,afterTitles:after.map(t=>t.title),finalTitles:final.map(t=>t.title),legacyUntouched:localStorage.getItem('st_trips_v2')===JSON.stringify(seed)+'\n'};
      },[trip('a','가상 여행 A'),trip('b','가상 여행 B')]);
      assert.equal(out.oldError,'STORAGE_CONFLICT','열려 있던 구버전 창의 저장은 거절');assert.equal(out.legacyUntouched,true,'구버전 창이 옛 문서를 덮지 않음');
      assert.equal(out.staleError,'STORAGE_CONFLICT','늦은 새 창의 저장은 거절');
      assert.deepEqual(out.afterTitles,['A 창의 변경','가상 여행 B']);assert.deepEqual(out.finalTitles,['A 창의 변경','B 창이 새로 읽고 저장']);
      await context.close();return out;
    });

    await check('저장은 바뀐 여행만 쓰고, 기기 문서 한도를 넘는 자료도 저장·재로드된다',async()=>{
      const {context,page}=await fresh();
      const out=await page.evaluate(async seed=>{
        const T=SulsulTravel,repo=new T.IdbTripRepository(localStorage);let trips=(await repo.loadAll()).trips;
        trips=await repo.saveAll(seed);
        const puts=[],original=IDBObjectStore.prototype.put;
        IDBObjectStore.prototype.put=function(...args){puts.push(this.name);return original.apply(this,args);};
        try{trips=await repo.commit(trips,{tripId:'c',expectedRevision:0,change:t=>{t.title='셋째만 바뀜';}});}finally{IDBObjectStore.prototype.put=original;}
        // 글이 많은 여행 30개(사진 없이 약 720만 자): 옛 방식이면 기기 문서 한도(약 524만 자)를 넘는다
        const longText='가상 기록 '.repeat(4000);
        const big=Array.from({length:30},(_,i)=>({id:`big-${i}`,title:`긴 가상 여행 ${i}`,revision:0,days:[],journals:Object.fromEntries(Array.from({length:10},(_,d)=>[d,{text:longText+i+d}])),activityRecords:{},momentEntries:[],expenses:[]}));
        let quotaWouldFail=false;try{localStorage.setItem('st_probe',JSON.stringify(big));localStorage.removeItem('st_probe');}catch(_){quotaWouldFail=true;}
        await repo.saveAll([...trips,...big]);
        const reloaded=(await new T.IdbTripRepository(localStorage).loadAll()).trips;
        return {puts,count:reloaded.length,chars:JSON.stringify(big).length,quotaWouldFail,lastText:reloaded.at(-1).journals[9].text===longText+'299'};
      },[trip('a','가상 여행 A'),trip('b','가상 여행 B'),trip('c','가상 여행 C')]);
      assert.deepEqual(out.puts.sort(),['meta','trips'],'여행 하나만 바뀌면 그 여행과 meta만 쓴다');
      assert.equal(out.quotaWouldFail,true,`${out.chars}자는 기기 문서 한도를 넘는다`);assert.equal(out.count,33);assert.equal(out.lastText,true);
      await context.close();return {puts:out.puts,chars:out.chars};
    });

    await check('구버전 앱이 옮긴 뒤 옛 문서를 바꾸면 따로 보관하고 알리며, 30일 뒤 옛 문서를 지운다',async()=>{
      const {context,page}=await fresh();
      const out=await page.evaluate(async seed=>{
        const T=SulsulTravel;localStorage.setItem('st_trips_v2',JSON.stringify(seed));
        const first=new T.IdbTripRepository(localStorage);await first.loadAll();
        const changedRaw=JSON.stringify([{...seed[0],title:'구버전 앱이 쓴 제목',revision:4}]);localStorage.setItem('st_trips_v2',changedRaw);
        const second=new T.IdbTripRepository(localStorage),loaded=await second.loadAll(),stats=await second.stats();
        const saved=await second.getSnapshot(loaded.legacy?.snapshotId);
        const third=await new T.IdbTripRepository(localStorage).loadAll();
        const meta=await new Promise(resolve=>{const r=indexedDB.open('sulsul-travel-trips-v1');r.onsuccess=()=>{const g=r.result.transaction('meta').objectStore('meta').get('doc');g.onsuccess=()=>{r.result.close();resolve(g.result);};};});
        const later=new T.IdbTripRepository(localStorage,{nowMs:()=>Date.parse(meta.migratedAt)+31*24*3600*1000});await later.loadAll();
        return {report:loaded.legacy,titles:loaded.trips.map(t=>t.title),saved:saved?.raw===changedRaw,marked:true,again:third.legacy,snapshots:stats.legacySnapshots.length,legacyAfterGrace:localStorage.getItem('st_trips_v2'),
          downloadReady:typeof SulsulTravel.IdbTripRepository.prototype.getSnapshot==='function'};
      },[trip('a','가상 여행 A')]);
      assert.equal(out.report?.changed,true,'구버전이 바꾼 옛 문서를 찾는다');assert.equal(out.saved,true,'그 원문을 따로 보관한다');
      assert.deepEqual(out.titles,['가상 여행 A'],'새 저장소의 자료는 그대로다');assert.equal(out.again,null,'같은 변경을 두 번 알리지 않는다');
      assert.equal(out.snapshots,1);assert.equal(out.legacyAfterGrace,null,'30일 뒤 옛 문서를 지운다');
      await context.close();return out.report;
    });

    await check('IndexedDB를 쓸 수 없으면 옮긴 적이 없을 때만 기기 문서로 계속 쓰고, 옮긴 뒤에는 저장을 거절한다',async()=>{
      const {context,page}=await fresh();
      const out=await page.evaluate(async seed=>{
        const T=SulsulTravel,state={trips:[]};localStorage.setItem('st_trips_v2',JSON.stringify(seed));
        const make=canFallback=>new T.TripStore(new T.IdbTripRepository(localStorage,{indexedDB:null}),{getTrips:()=>state.trips,setTrips:t=>{state.trips=t;},fallback:new T.LegacyTripRepository(localStorage),canFallback});
        const before=make(()=>true),loaded=await before.loadAll();state.trips=loaded.trips;
        await before.commit({tripId:'a',change:t=>{t.title='기기 문서에 저장';}});
        const fallbackKind=before.kind,legacyTitle=JSON.parse(localStorage.getItem('st_trips_v2'))[0].title;
        localStorage.setItem('st_trip_store_v1','indexeddb');
        const after=make(()=>localStorage.getItem('st_trip_store_v1')!=='indexeddb'),blocked=await after.loadAll();state.trips=[];
        let writeError=null;try{await after.saveAll(current=>[...current,{id:'x',revision:0}]);}catch(error){writeError=error.code;}
        return {fallbackKind,legacyTitle,blocked:{unavailable:blocked.storageUnavailable,trips:blocked.trips.length},writeError,legacyKept:JSON.parse(localStorage.getItem('st_trips_v2'))[0].title};
      },[trip('a','가상 여행 A')]);
      assert.equal(out.fallbackKind,'localStorage');assert.equal(out.legacyTitle,'기기 문서에 저장');
      assert.deepEqual(out.blocked,{unavailable:true,trips:0},'옮긴 뒤에는 옛 문서를 읽지 않는다');assert.equal(out.writeError,'BACKEND_UNAVAILABLE');assert.equal(out.legacyKept,'기기 문서에 저장');
      await context.close();return out;
    });

    await check('손상된 옛 문서는 옮기지 않고 복구 모드로 시작하며, 옮긴 결과가 원문과 다르면 이전을 취소한다',async()=>{
      const {context,page}=await fresh();
      const out=await page.evaluate(async seed=>{
        const T=SulsulTravel;localStorage.setItem('st_trips_v2','{broken');
        const repo=new T.IdbTripRepository(localStorage),loaded=await repo.loadAll();
        const restored=await repo.saveAll(seed);const reread=(await new T.IdbTripRepository(localStorage).loadAll()).trips;
        // 대조 실패: 다시 읽을 때 한 여행이 다르게 보이게 한다
        await new Promise(resolve=>{const r=indexedDB.deleteDatabase('sulsul-travel-trips-v1');r.onsuccess=r.onerror=r.onblocked=resolve;});
        localStorage.removeItem('st_trip_store_v1');localStorage.setItem('st_trips_v2',JSON.stringify(seed));
        const broken=new T.IdbTripRepository(localStorage,{dbName:'sulsul-travel-trips-verify'});const realRead=broken._readAll.bind(broken);let calls=0;
        broken._readAll=async()=>{const state=await realRead();if(++calls===2&&state.records[0])state.records[0]={...state.records[0],json:state.records[0].json.replace('가상','변조')};return state;};
        let migrateError=null;try{await broken.readRaw();}catch(error){migrateError=error.code;}
        const cleared=await realRead();
        return {recovered:loaded.recoveredFromCorruption,backup:localStorage.getItem(loaded.backupKey),restored:restored.length,reread:reread.map(t=>t.id),migrateError,cleared:{meta:cleared.meta,records:cleared.records.length},legacy:localStorage.getItem('st_trips_v2')===JSON.stringify(seed)};
      },[trip('a','가상 여행 A')]);
      assert.equal(out.recovered,true);assert.equal(out.backup,'{broken','손상 원문 보존');assert.deepEqual(out.reread,['a'],'복원은 새 저장소에 쓴다');
      assert.equal(out.migrateError,'BACKEND_UNAVAILABLE');assert.deepEqual(out.cleared,{meta:null,records:0},'다른 결과는 지운다');assert.equal(out.legacy,true,'옛 문서는 그대로');
      await context.close();return out;
    });

    // ---- 앱 단위 ----
    await check('앱을 열면 기기 문서를 옮기고, 새로고침해도 같은 여행이며, 저장 공간 화면이 IndexedDB를 보인다',async()=>{
      const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage();
      const seed=[trip('app-a','앱 이전 가상 여행 A'),trip('app-b','앱 이전 가상 여행 B')];
      await page.addInitScript(seed=>{if(!sessionStorage.getItem('seeded')){sessionStorage.setItem('seeded','1');localStorage.setItem('st_demo_choice_v1','started');localStorage.setItem('st_trips_v2',JSON.stringify(seed));}},seed);
      await page.goto(origin+'/');await page.waitForFunction(()=>window.SulsulShell?.started);
      const first=await page.evaluate(async()=>({kind:TripRepository.kind,titles:State.trips.map(t=>t.title).sort(),token:TripRepository.token(),stats:await TripRepository.stats(),legacyEnd:localStorage.getItem('st_trips_v2').endsWith('\n')}));
      await page.evaluate(async()=>{await commitTripRecord(State.trips[0].id,t=>{t.journals[0].text='옮긴 뒤 저장한 회고';});});
      await page.reload();await page.waitForFunction(()=>window.SulsulShell?.started);
      const second=await page.evaluate(async()=>{SulsulTravel.SettingsUI.open('data');await SulsulTravel.StorageHealth.refresh();return {kind:TripRepository.kind,journal:State.trips.find(t=>t.journals[0].text==='옮긴 뒤 저장한 회고')?.id||null,row:document.getElementById('storage-health-list')?.textContent||''};});
      assert.equal(first.kind,'indexedDB');assert.deepEqual(first.titles,['앱 이전 가상 여행 A','앱 이전 가상 여행 B']);assert.match(first.token,/^idb:\d+$/);assert.equal(first.legacyEnd,true);
      assert.ok(second.journal,'새로고침 뒤에도 새 저장소의 글');assert.match(second.row,/IndexedDB/);
      // 두 번째 창을 열어도(부팅 정규화) 바뀐 것이 없으면 쓰지 않으므로 첫 창의 다음 저장이 막히지 않는다.
      const before=await page.evaluate(()=>TripRepository.token());
      const other=await context.newPage();await other.goto(origin+'/');await other.waitForFunction(()=>window.SulsulShell?.started);
      const otherToken=await other.evaluate(async()=>TripRepository.currentToken());
      const firstSave=await page.evaluate(async()=>commitTrip(State.trips[0].id,t=>{t.title='두 창이 열린 뒤 첫 창의 저장';}));
      assert.equal(otherToken,before,'두 번째 창의 부팅은 저장소 버전을 올리지 않는다');assert.equal(firstSave,true,'첫 창의 저장이 거절되지 않는다');
      await context.close();return {first:{kind:first.kind,token:first.token,trips:first.stats.trips},row:second.row.slice(0,120)};
    });

    await check('실제 v2.0.7 앱: 업데이트 중 열린 창은 저장을 거절당하고, 구버전이 새로 쓴 변경은 새 버전이 따로 보관하고 알린다',async()=>{
      const old=oldApp('v2.0.7');if(old.error)throw new Error('v2.0.7 앱을 준비하지 못했습니다: '+old.error);
      const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
      const seed=[trip('old-a','구버전에서 만든 가상 여행')];
      await context.addInitScript(seed=>{if(!localStorage.getItem('st_trips_v2')){localStorage.setItem('st_demo_choice_v1','started');localStorage.setItem('st_trips_v2',JSON.stringify(seed));}},seed);
      serveRoot=old;
      const oldPage=await context.newPage();await oldPage.goto(origin+'/');await oldPage.waitForFunction(()=>window.SulsulShell?.started);
      const oldVersion=await oldPage.evaluate(()=>APP_VER);
      serveRoot=root;
      const newPage=await context.newPage();await newPage.goto(origin+'/');await newPage.waitForFunction(()=>window.SulsulShell?.started);
      const migrated=await newPage.evaluate(()=>({kind:TripRepository.kind,version:APP_VER,titles:State.trips.map(t=>t.title)}));
      // 업데이트 전부터 열려 있던 구버전 창의 저장
      const oldSave=await oldPage.evaluate(async()=>{const ok=await commitTrip(State.trips[0].id,t=>{t.title='업데이트 중 구버전 창의 제목';});return {ok,raw:localStorage.getItem('st_trips_v2').includes('업데이트 중 구버전 창의 제목')};});
      await oldPage.close();
      // 구버전 앱을 새로 열어(되돌린 배포) 옛 문서에 쓴다
      serveRoot=old;
      const rolledBack=await context.newPage();await rolledBack.goto(origin+'/');await rolledBack.waitForFunction(()=>window.SulsulShell?.started);
      const rolledSave=await rolledBack.evaluate(async()=>({titles:State.trips.map(t=>t.title),ok:await commitTrip(State.trips[0].id,t=>{t.title='되돌린 구버전이 쓴 제목';})}));
      await rolledBack.close();serveRoot=root;
      const back=await context.newPage();
      await back.goto(origin+'/');await back.waitForFunction(()=>window.SulsulShell?.started);
      const after=await back.evaluate(async()=>{const toast=document.getElementById('sulsul-global-toast')?.textContent||'';const stats=await TripRepository.stats();return {titles:State.trips.map(t=>t.title),toast,snapshots:stats.legacySnapshots.length};});
      const downloaded=await back.evaluate(async()=>{const stats=await TripRepository.stats();const snapshot=await TripRepository.backend.getSnapshot(stats.legacySnapshots[0]);return JSON.parse(snapshot.raw)[0].title;});
      assert.equal(oldVersion,'2.0.7');assert.equal(migrated.kind,'indexedDB');assert.deepEqual(migrated.titles,['구버전에서 만든 가상 여행']);
      assert.deepEqual(oldSave,{ok:false,raw:false},'업데이트 중 열린 구버전 창은 저장하지 못하고 옛 문서도 바꾸지 못한다');
      assert.deepEqual(rolledSave,{titles:['구버전에서 만든 가상 여행'],ok:true},'되돌린 구버전은 옮길 때의 자료로 열린다');
      assert.deepEqual(after.titles,['구버전에서 만든 가상 여행'],'새 버전은 새 저장소의 자료를 쓴다');
      assert.equal(after.snapshots,1,'구버전이 쓴 변경을 따로 보관한다');assert.equal(downloaded,'되돌린 구버전이 쓴 제목');assert.match(after.toast,/이전 버전 앱이/);
      await context.close();return {oldSave,after};
    });
  } finally {
    await browser.close();server.close();
  }
  const passed=results.every(result=>result.passed);
  console.log(JSON.stringify({passed,checks:results.length,results},null,2));
  process.exitCode=passed?0:1;
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
