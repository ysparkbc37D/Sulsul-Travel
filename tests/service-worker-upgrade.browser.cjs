/* 실제 v1.9.2 워커의 ignoreSearch 캐시에서 업그레이드한다. 합성 여행만 사용한다. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),legacyRef=process.env.LEGACY_RELEASE_REF||'ac317b0';
const publicRoot=path.join(root,'.local-review','sw-upgrade-public-'+Date.now()+'-'+Math.random().toString(36).slice(2));
require('../tools/build-public.cjs').buildPublic(publicRoot);
const currentHtml=fs.readFileSync(path.join(publicRoot,'index.html'),'utf8'),currentVersion=currentHtml.match(/const APP_VER\s*=\s*['"]([^'"]+)/)[1];
const legacyFiles=new Map();
function legacy(file){
 if(!legacyFiles.has(file)){
  try {legacyFiles.set(file,cp.execFileSync('git',['show',legacyRef+':'+file],{cwd:root,maxBuffer:20*1024*1024,stdio:['ignore','pipe','pipe']}));}
  catch(error){throw new Error('업그레이드 검증에 필요한 실제 구버전 Git 파일을 읽지 못했습니다: '+legacyRef+':'+file,{cause:error});}
 }
 return legacyFiles.get(file);
}
let deployment='legacy',workerGeneration=0,holdFirstInstallWorker=false;
const pendingFirstInstallWorkers=[];
let observeFirstInstallWorker;
const firstInstallWorkerRequested=new Promise(resolve=>{observeFirstInstallWorker=resolve;});
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');res.setHeader('Cache-Control','no-store');
 if(url.pathname==='/__upgrade-check'){
  res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="ko"><meta charset="utf-8"><title>합성 업그레이드 검사</title><body>개인 계정과 분리한 검사</body></html>');return;
 }
 const file=url.pathname==='/'?'index.html':url.pathname.slice(1),absolute=path.resolve(publicRoot,file);
 if(!absolute.startsWith(publicRoot+path.sep)){res.writeHead(403).end();return;}
 let data;
 try {
  if(deployment==='legacy'||file==='sw.js'&&deployment==='delayed-worker')data=legacy(file);
  else if(fs.existsSync(absolute))data=fs.readFileSync(absolute);
  else {res.writeHead(404).end();return;}
 }catch(error){res.writeHead(404).end(error.message);return;}
 if(file==='sw.js'&&deployment==='current'&&workerGeneration)data=Buffer.concat([data,Buffer.from('\n// 합성 업데이트 세대 '+workerGeneration+'\n')]);
 res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');
 if(file==='sw.js'&&holdFirstInstallWorker){pendingFirstInstallWorkers.push(()=>res.end(data));observeFirstInstallWorker();return;}
 res.end(data);
});
const fixture={id:'upgrade-synthetic',title:'가상 도시 여행',startDate:'2026-10-01',endDate:'2026-10-01',countries:['가상국'],cities:['가상도시'],currency:'KRW',budget:0,revision:3,journals:{'0':{text:'합성 하루 일기 원문',photos:[]}},activityRecords:{'upgrade-record':{id:'upgrade-record',text:'합성 일정 기록 원문',photos:[],context:{date:'2026-10-01',time:'14:00',city:'가상도시',title:'가상 공원 산책'}}},momentEntries:[{id:'upgrade-moment',text:'합성 순간 기록 원문',date:'2026-10-01',time:'15:00',photos:[]}],expenses:[],checklist:[],days:[{id:'upgrade-day',dayNum:1,date:'2026-10-01',city:'가상도시',title:'가상 산책',spots:[{id:'upgrade-spot',recordId:'upgrade-record',time:'14:00',title:'가상 공원 산책',completed:false}]}]};
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try {
  // 첫 설치는 화면 초기화 뒤에 claim해도 새 버전 교체 안내를 띄우면 안 된다.
  deployment='current';holdFirstInstallWorker=true;
  const firstContext=await browser.newContext({serviceWorkers:'allow',viewport:{width:390,height:844}}),firstPage=await firstContext.newPage();
  const firstRuntimeErrors=[];firstPage.setDefaultTimeout(15000);firstPage.on('pageerror',error=>firstRuntimeErrors.push(error.message));
  await firstContext.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  await firstPage.addInitScript(()=>{
   window.syntheticFirstClaims=[];
   navigator.serviceWorker.addEventListener('controllerchange',()=>syntheticFirstClaims.push({started:window.SulsulShell?.started===true}));
  });
  await firstPage.goto(origin+'/?first-install-regression=1',{waitUntil:'domcontentloaded'});
  await firstPage.waitForFunction(()=>window.SulsulShell?.started===true);
  await firstInstallWorkerRequested;
  const beforeFirstClaim=await firstPage.evaluate(()=>({time:performance.timeOrigin,controlled:!!navigator.serviceWorker.controller,started:SulsulShell.started,notices:document.querySelectorAll('#app-update-notice').length,trips:State.trips.length}));
  assert.equal(beforeFirstClaim.controlled,false);assert.equal(beforeFirstClaim.started,true);assert.equal(beforeFirstClaim.notices,0);assert.equal(beforeFirstClaim.trips,0);
  holdFirstInstallWorker=false;for(const release of pendingFirstInstallWorkers.splice(0))release();
  await firstPage.waitForFunction(()=>!!navigator.serviceWorker.controller&&window.syntheticFirstClaims.length>0);
  const firstClaim=await firstPage.evaluate(()=>({time:performance.timeOrigin,version:APP_VER,controlled:!!navigator.serviceWorker.controller,hadController:SulsulShell.hadController,claims:syntheticFirstClaims,notices:document.querySelectorAll('#app-update-notice').length,trips:State.trips.length}));
  assert.equal(firstClaim.claims.length,1);assert.equal(firstClaim.claims[0].started,true);assert.equal(firstClaim.controlled,true);assert.equal(firstClaim.hadController,true);
  assert.equal(firstClaim.notices,0);assert.equal(firstClaim.time,beforeFirstClaim.time);assert.equal(firstClaim.version,currentVersion);assert.equal(firstClaim.trips,0);assert.deepEqual(firstRuntimeErrors,[]);
  await firstContext.close();deployment='legacy';
  const context=await browser.newContext({serviceWorkers:'allow',viewport:{width:390,height:844}}),page=await context.newPage(),runtimeErrors=[];
  page.setDefaultTimeout(15000);page.on('pageerror',error=>runtimeErrors.push(error.message));
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  await page.goto(origin+'/__upgrade-check');
  await page.evaluate(async fixture=>{
   localStorage.setItem('st_trips_v2',JSON.stringify([fixture]));localStorage.setItem('st_demo_choice_v1','started');
   await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;
  },fixture);
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  const legacyCapabilities=await page.evaluate(async()=>{
   const cache=await caches.open('st-shell-v1.9.2');const adapter=await (await cache.match('/js/domain/trip-adapter.js?v=1.9.2')).text();
   return {helper:adapter.includes('getJournalEntry'),raw:localStorage.getItem('st_trips_v2')};
  });
  assert.equal(legacyCapabilities.helper,false);
  deployment='delayed-worker';
  await page.goto(origin+'/?upgrade-regression=1',{waitUntil:'networkidle'});
  // 초기화 차단·업데이트 UI 계약은 앱 부트스트랩을 통해 확인한다.
  await page.waitForFunction(()=>window.SulsulShell?.recovering===true);
  const blocked=await page.evaluate(()=>({raw:localStorage.getItem('st_trips_v2'),started:SulsulShell.started,failures:SulsulShell.failedAssets}));
  assert.equal(blocked.raw,legacyCapabilities.raw);assert.equal(blocked.started,false);assert.ok(blocked.failures.length>0);
  deployment='current';
  await page.evaluate(async()=>{const registration=await navigator.serviceWorker.getRegistration();await registration.update();});
  await page.waitForFunction(()=>window.SulsulShell?.started===true);
  const upgraded=await page.evaluate(()=>({version:APP_VER,helper:typeof SulsulTravel.TripAdapter.getJournalEntry,trip:State.trips.find(trip=>trip.id==='upgrade-synthetic')}));
  assert.equal(upgraded.version,currentVersion);assert.equal(upgraded.helper,'function');
  assert.equal(upgraded.trip.activityRecords['upgrade-record'].text,fixture.activityRecords['upgrade-record'].text);
  assert.equal(upgraded.trip.momentEntries[0].text,fixture.momentEntries[0].text);
  assert.equal(Object.values(upgraded.trip.journals)[0].text,fixture.journals['0'].text);
  await page.evaluate(()=>{
   window.confirm=()=>true;window.alert=()=>{};
   document.querySelectorAll('.sheet-container').forEach(element=>element.classList.add('sheet-closed'));
   State.activeTripId='upgrade-synthetic';State.activeJournalDay=0;switchView('workspace');openActivityJournal(0,0);
  });
  await page.locator('#activity-record-text').fill('업데이트 후 합성 일정 기록');
  assert.equal(await page.evaluate(()=>saveActivityRecord()),true);
  const ai=await page.evaluate(async()=>{
   let calls=0;callGeminiApiWithFallback=async()=>{calls++;return '다듬은 합성 일정 기록';};await generateActivityEssay();
   const reviewOpen=!document.getElementById('modal-ai-draft-review').classList.contains('sheet-closed');await approveActiveAiDraft();
   return {calls,reviewOpen,text:getActiveTrip().activityRecords['upgrade-record'].text,original:getActiveTrip().activityRecords['upgrade-record'].originalText};
  });
  assert.equal(ai.calls,1);assert.equal(ai.reviewOpen,true);assert.equal(ai.text,'다듬은 합성 일정 기록');assert.equal(ai.original,'업데이트 후 합성 일정 기록');
  await page.evaluate(()=>{closeModal('modal-ai-draft-review',true);openActivityJournal(0,0);});
  await page.locator('#activity-record-text').fill('워커 교체 중에도 보존할 합성 미저장 글');
  const beforeUpdate=await page.evaluate(()=>({time:performance.timeOrigin,raw:localStorage.getItem('st_trips_v2')}));
  workerGeneration++;
  await page.evaluate(async()=>{
   window.syntheticControllerChanged=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{window.syntheticControllerChanged=true;},{once:true});
   const registration=await navigator.serviceWorker.getRegistration();await registration.update();
  });
  await page.waitForFunction(()=>window.syntheticControllerChanged===true);
  const afterUpdate=await page.evaluate(()=>({time:performance.timeOrigin,raw:localStorage.getItem('st_trips_v2'),text:document.getElementById('activity-record-text').value,open:!document.getElementById('modal-activity-record').classList.contains('sheet-closed')}));
  assert.equal(afterUpdate.time,beforeUpdate.time);assert.equal(afterUpdate.raw,beforeUpdate.raw);assert.equal(afterUpdate.text,'워커 교체 중에도 보존할 합성 미저장 글');assert.equal(afterUpdate.open,true);
  assert.equal(await page.locator('#app-update-notice').count(),1);
  await page.evaluate(()=>document.getElementById('app-update-apply').click());
  assert.equal(await page.evaluate(()=>performance.timeOrigin),beforeUpdate.time);
  assert.equal(await page.locator('#activity-record-text').inputValue(),'워커 교체 중에도 보존할 합성 미저장 글');
  assert.equal(await page.evaluate(()=>saveActivityRecord()),true);
  await page.evaluate(()=>{
   closeModal('modal-activity-record',true);renderJournalTab();
   document.getElementById('journal-text-input').value='워커 교체 뒤 남긴 합성 하루 일기';rememberJournalDraft();
  });
  await page.evaluate(()=>document.getElementById('app-update-apply').click());
  assert.equal(await page.evaluate(()=>performance.timeOrigin),beforeUpdate.time);
  assert.equal(await page.locator('#journal-text-input').inputValue(),'워커 교체 뒤 남긴 합성 하루 일기');
  assert.equal(await page.evaluate(()=>saveJournalText()),true);
  await page.evaluate(()=>document.querySelectorAll('.sheet-container').forEach(element=>element.classList.add('sheet-closed')));
  await Promise.all([page.waitForEvent('load'),page.evaluate(()=>document.getElementById('app-update-apply').click())]);
  await page.waitForFunction(()=>window.SulsulShell?.started===true);
  assert.equal(await page.evaluate(()=>State.trips.find(trip=>trip.id==='upgrade-synthetic').activityRecords['upgrade-record'].text),'워커 교체 중에도 보존할 합성 미저장 글');
  // 현재 워커의 같은 자산이 손상되면 새 워커 없이도 명시 재시도로 복구한다.
  const poisoned=await page.evaluate(async version=>{
   const cache=await caches.open('st-shell-v'+version),raw=localStorage.getItem('st_trips_v2');
   await cache.put('/js/domain/trip-adapter.js?v='+version,new Response('/* 합성 손상 캐시 */',{headers:{'Content-Type':'application/javascript'}}));
   return raw;
  },currentVersion);
  await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.SulsulShell?.recovering===true);
  assert.equal(await page.evaluate(()=>localStorage.getItem('st_trips_v2')),poisoned);
  const blockedTime=await page.evaluate(()=>performance.timeOrigin);
  await context.setOffline(true);await page.waitForFunction(()=>!navigator.onLine);
  await page.locator('#app-shell-retry').click();
  await page.waitForFunction(()=>document.getElementById('app-shell-status').textContent.includes('인터넷 연결'));
  assert.equal(await page.evaluate(()=>performance.timeOrigin),blockedTime);
  assert.equal(await page.evaluate(async version=>(await (await caches.open('st-shell-v'+version)).match('/js/domain/trip-adapter.js?v='+version)).text(),currentVersion),'/* 합성 손상 캐시 */');
  assert.equal(await page.evaluate(()=>localStorage.getItem('st_trips_v2')),poisoned);
  await context.setOffline(false);await page.waitForFunction(()=>navigator.onLine);
  await Promise.all([page.waitForEvent('load'),page.locator('#app-shell-retry').click()]);
  await page.waitForFunction(()=>window.SulsulShell?.started===true);
  const recovered=await page.evaluate(()=>({helper:typeof SulsulTravel.TripAdapter.getJournalEntry,trip:State.trips.find(trip=>trip.id==='upgrade-synthetic')}));
  assert.equal(recovered.helper,'function');
  assert.equal(recovered.trip.activityRecords['upgrade-record'].text,'워커 교체 중에도 보존할 합성 미저장 글');
  assert.equal(Object.values(recovered.trip.journals)[0].text,'워커 교체 뒤 남긴 합성 하루 일기');
  assert.equal(recovered.trip.momentEntries[0].text,fixture.momentEntries[0].text);
  assert.deepEqual(runtimeErrors,[]);
  console.log(JSON.stringify({passed:true,checks:49,runtimeErrors,firstInstallation:{claims:firstClaim.claims.length,claimedAfterStartup:firstClaim.claims[0].started,updateNotice:false,reloaded:false,runtimeErrors:firstRuntimeErrors},scope:'신규 설치 첫 워커 claim 안내 없음 / 실제 v1.9.2 ignoreSearch 캐시→현재 버전 / 혼합 모듈 차단 / 원문 무변경 / 정상 업데이트 / 일정 기록 저장·AI 승인 / 작성 중 워커 교체·재시작 보존 / 현재 캐시 손상·오프라인 보존·명시 재시도 복구'}));
  await context.close();
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>server.close());
