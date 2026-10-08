/* 가상 예제의 명시적 추가·삭제와 최초 방문 개인정보 경계를 실제 HTTP 브라우저에서 검증한다. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const LZString=require('../vendor/lz-string/lz-string.min.js');
const root=path.resolve(__dirname,'..'),output=path.join(root,'.local-review','demo-onboarding');
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(error,content)=>{if(error){res.writeHead(404).end();return;}res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');res.end(content);});
});
const syntheticTrip=(id,title)=>({id,title,startDate:'2030-05-10',endDate:'2030-05-10',timeZone:'Asia/Seoul',countries:['대한민국'],cities:['서울'],currency:'KRW',budget:0,journals:{},momentEntries:[],activityRecords:{},expenses:[],checklist:[],days:[{dayNum:1,date:'2030-05-10',city:'서울',title:'내가 정한 하루',spots:[{id:'private-spot',title:'동네 공원 산책',time:'10:00',completed:false}]}]});
(async()=>{
 fs.mkdirSync(output,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})}),results=[],errors=[];
 async function check(name,options,operation){
  const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Seoul',serviceWorkers:'block'}),page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',error=>errors.push({name,error:error.message}));
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  await page.addInitScript(({storage,confirm})=>{
   // 새로고침에서 합성 구버전 자료를 다시 넣지 않아 실제 일회성 마이그레이션을 검사한다.
   if(!sessionStorage.getItem('demo-test-initialized')){Object.entries(storage).forEach(([key,value])=>localStorage.setItem(key,value));sessionStorage.setItem('demo-test-initialized','true');}
   window.alert=()=>{};window.confirm=()=>confirm;
  },{storage:options.storage||{},confirm:options.confirm!==false});
  try{await page.goto(`http://127.0.0.1:${server.address().port}/${options.hash||''}`,{waitUntil:'networkidle'});await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}'});const details=await operation(page);results.push({name,passed:true,details});}
  catch(error){results.push({name,passed:false,error:error.stack||error.message});await page.screenshot({path:path.join(output,`failure-${results.length}.png`)}).catch(()=>{});}
  finally{await context.close();}
 }
 async function confirmTripDeletion(page,id){await page.evaluate(id=>requestDeleteTrip(id),id);await page.waitForTimeout(400);await page.locator('#confirm-delete-btn').click();}
 try{
  await check('최초 빈 방문은 여행을 만들지 않고 선택 제안만 표시한다',{},async page=>{
   assert.deepEqual(await page.evaluate(()=>State.trips),[]);assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('st_trips_v2')||'[]')),[]);assert.equal(await page.locator('#demo-onboarding-offer').isVisible(),true);
   const sizes=[];for(const width of [320,360,390,430]){await page.setViewportSize({width,height:844});const geometry=await page.evaluate(()=>{const offer=document.getElementById('demo-onboarding-offer').getBoundingClientRect();return {width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,contained:offer.left>=0&&offer.right<=innerWidth+1};});assert.deepEqual(geometry,{width,overflow:false,contained:true});sizes.push(width);}
   await page.screenshot({path:path.join(output,'first-visit-offer.png')});await page.locator('#demo-onboarding-offer [onclick="dismissDemoOffer()"] ').click();assert.equal(await page.locator('#demo-onboarding-offer').isVisible(),false);await page.reload({waitUntil:'networkidle'});assert.deepEqual(await page.evaluate(()=>State.trips),[]);assert.equal(await page.locator('#demo-onboarding-offer').isVisible(),false);return {automaticTrips:0,widths:sizes,dismissedAfterReload:true};
  });
  await check('가상 예제 명시 추가·중복 방지·사본 및 동일 제목 개인 여행 보존',{},async page=>{
   await page.locator('#demo-onboarding-offer [onclick*="addDemoTrip"]').click();const added=await page.evaluate(()=>State.trips);assert.equal(added.length,1);assert.equal(added[0].isSample,true);assert.equal(added[0].days.length,5);assert.ok(added[0].cities.includes('타이베이'));assert.ok(added[0].cities.includes('타이중'));assert.ok((added[0].expenses||[]).every(expense=>expense.title.includes('[가상 지출]')));assert.ok(Object.values(added[0].journals||{}).every(journal=>journal.text.includes('[가상 하루 회고]')));assert.ok((added[0].momentEntries||[]).every(moment=>moment.text.includes('[가상 순간 기록]')));assert.ok(Object.values(added[0].activityRecords||{}).every(record=>record.text.includes('[가상 일정 기록]')));assert.doesNotMatch(JSON.stringify(added),/실제 항공권|AC062|AC194|LA2024|8,650,000/);
   await page.evaluate(()=>{addDemoTrip();addDemoTrip();});assert.equal(await page.evaluate(()=>State.trips.length),1);assert.equal(await page.locator('#demo-onboarding-offer').isVisible(),false);
   const preserved=await page.evaluate(()=>{
    const demo=State.trips.find(trip=>trip.isSample);duplicateTrip(demo.id);const copy=State.trips.find(trip=>trip.id!==demo.id);window.demoCopyId=copy.id;const personal=structuredClone(demo);personal.id='personal-same-demo-title';delete personal.isSample;personal.journals={0:{text:'같은 제목이어도 내 기록',photos:[]}};State.trips=TripRepository.saveAll([...State.trips,personal]);return {copyId:copy.id,copyIsSample:Object.hasOwn(copy,'isSample'),title:personal.title};
   });assert.equal(preserved.copyIsSample,false);
   await page.evaluate(()=>openSettingsModal('data'));assert.equal(await page.locator('#demo-settings-status').isVisible(),true);
   for(const width of [320,360,390,430]){await page.setViewportSize({width,height:844});const geometry=await page.evaluate(()=>{const sheet=document.querySelector('#modal-settings .sheet-box').getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth,contained:sheet.left>=0&&sheet.right<=innerWidth+1};});assert.deepEqual(geometry,{overflow:false,contained:true});}
   await page.locator('#modal-settings [onclick*="deleteDemoTrips"]').click();const remaining=await page.evaluate(()=>State.trips.map(trip=>({id:trip.id,sample:!!trip.isSample})));assert.deepEqual(remaining,[{id:preserved.copyId,sample:false},{id:'personal-same-demo-title',sample:false}]);
   await page.reload({waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>State.trips.filter(trip=>trip.isSample).length),0);assert.equal(await page.evaluate(()=>State.trips.find(trip=>trip.id==='personal-same-demo-title').journals[0].text),'같은 제목이어도 내 기록');assert.ok(await page.evaluate(id=>State.trips.some(trip=>trip.id===id),preserved.copyId));assert.equal(await page.locator('#demo-onboarding-offer').isVisible(),false);return {demoDays:5,duplicatePrevented:true,personalIds:remaining.map(trip=>trip.id),deletedAfterReload:true};
  });
  await check('일반 여행 카드로 마지막 예제를 삭제해도 다시 생성되지 않는다',{},async page=>{
   await page.locator('#demo-onboarding-offer [onclick*="addDemoTrip"]').click();const id=await page.evaluate(()=>State.trips[0].id);await confirmTripDeletion(page,id);assert.deepEqual(await page.evaluate(()=>State.trips),[]);assert.equal(await page.evaluate(()=>State.activeTripId),null);await page.reload({waitUntil:'networkidle'});assert.deepEqual(await page.evaluate(()=>State.trips),[]);assert.equal(await page.locator('#demo-onboarding-offer').isVisible(),false);return {lastTripDeletionPersisted:true};
  });
  await check('예제 추가 저장 실패는 문서와 제안을 보존하며 재시도가 가능하다',{},async page=>{
   const failed=await page.evaluate(()=>{
    const before=JSON.stringify(State.trips),stored=localStorage.getItem('st_trips_v2'),keys=Object.fromEntries(Object.keys(localStorage).map(key=>[key,localStorage.getItem(key)])),old=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='st_trips_v2')throw new DOMException('quota','QuotaExceededError');return old.call(this,key,value);};try{addDemoTrip();}finally{Storage.prototype.setItem=old;}return {memory:JSON.stringify(State.trips)===before,persisted:localStorage.getItem('st_trips_v2')===stored,allStorage:JSON.stringify(Object.fromEntries(Object.keys(localStorage).map(key=>[key,localStorage.getItem(key)])))===JSON.stringify(keys)};
   });assert.deepEqual(failed,{memory:true,persisted:true,allStorage:true});assert.equal(await page.locator('#demo-onboarding-offer').isVisible(),true);await page.locator('#demo-onboarding-offer [onclick*="addDemoTrip"]').click();assert.equal(await page.evaluate(()=>State.trips.filter(trip=>trip.isSample).length),1);await page.reload({waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>State.trips.filter(trip=>trip.isSample).length),1);return {failureAtomic:true,retrySaved:true};
  });
  await check('설정 예제 삭제 저장 실패는 원본과 삭제 표식을 보존한다',{},async page=>{
   await page.locator('#demo-onboarding-offer [onclick*="addDemoTrip"]').click();const failed=await page.evaluate(()=>{
    const before=JSON.stringify(State.trips),stored=localStorage.getItem('st_trips_v2'),keys=Object.fromEntries(Object.keys(localStorage).map(key=>[key,localStorage.getItem(key)])),old=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='st_trips_v2')throw new DOMException('quota','QuotaExceededError');return old.call(this,key,value);};try{deleteDemoTrips();}finally{Storage.prototype.setItem=old;}return {memory:JSON.stringify(State.trips)===before,persisted:localStorage.getItem('st_trips_v2')===stored,allStorage:JSON.stringify(Object.fromEntries(Object.keys(localStorage).map(key=>[key,localStorage.getItem(key)])))===JSON.stringify(keys)};
   });assert.deepEqual(failed,{memory:true,persisted:true,allStorage:true});await page.reload({waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>State.trips.filter(trip=>trip.isSample).length),1);await page.evaluate(()=>deleteDemoTrips());assert.deepEqual(await page.evaluate(()=>State.trips),[]);await page.reload({waitUntil:'networkidle'});assert.deepEqual(await page.evaluate(()=>State.trips),[]);assert.equal(await page.locator('#demo-onboarding-offer').isVisible(),false);return {failureAtomic:true,retryDeleted:true};
  });
  const shared=syntheticTrip('shared-source','친구가 보낸 가상 여행'),payload={format:'sulsul-trip',schemaVersion:1,shareId:'demo-onboarding-share',scope:{journals:false,finances:false},trip:shared},hash='#share='+LZString.compressToEncodedURIComponent(JSON.stringify(payload));
  await check('공유 링크 첫 방문은 승인한 사본 하나만 추가한다',{hash},async page=>{
   const trips=await page.evaluate(()=>State.trips);assert.equal(trips.length,1);assert.equal(trips[0].importedShareId,'demo-onboarding-share');assert.ok(trips[0].title.startsWith(shared.title));assert.equal(!!trips[0].isSample,false);assert.equal(await page.locator('#demo-onboarding-offer').isVisible(),false);await page.reload({waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>State.trips.length),1);return {importedTrips:1,automaticDemo:false};
  });
  await check('공유 링크 거절은 원본 URL과 빈 여행 목록을 유지한다',{hash,confirm:false},async page=>{
   assert.deepEqual(await page.evaluate(()=>State.trips),[]);assert.ok(await page.evaluate(()=>location.hash.startsWith('#share=')));assert.equal(await page.evaluate(()=>State.trips.some(trip=>trip.isSample)),false);return {declinedWithoutSeed:true};
  });
  const legacy=syntheticTrip('legacy-private','내 이전 버전 여행');legacy.journals={0:{text:'구버전 원문 보존',photos:[]}};
  await check('구버전 개인 여행은 한 번만 마이그레이션하고 삭제 후 재수입하지 않는다',{storage:{st_current_trip:JSON.stringify(legacy)}},async page=>{
   const trips=await page.evaluate(()=>State.trips);assert.equal(trips.length,1);assert.equal(trips[0].id,legacy.id);assert.equal(trips[0].journals[0].text,'구버전 원문 보존');assert.equal(!!trips[0].isSample,false);await page.reload({waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>State.trips.length),1);await confirmTripDeletion(page,legacy.id);assert.deepEqual(await page.evaluate(()=>State.trips),[]);await page.reload({waitUntil:'networkidle'});assert.deepEqual(await page.evaluate(()=>State.trips),[]);return {legacyPreserved:true,migratedOnce:true,noResurrection:true};
  });
  const retired=syntheticTrip('trip_sa_showcase_22d','기존 기기에만 보관된 내 남미 계획');retired.isSample=true;retired.journals={0:{text:'내가 편집한 기존 기록',photos:[]}};
  await check('기존 기기의 구 예제 편집본은 개인 계획으로 보존하며 예제 삭제에서 제외한다',{storage:{st_trips_v2:JSON.stringify([retired])}},async page=>{
   const before=await page.evaluate(()=>State.trips);assert.equal(before.length,1);assert.equal(before[0].id,retired.id);assert.equal(before[0].isSample,false);assert.equal(before[0].journals[0].text,'내가 편집한 기존 기록');await page.evaluate(()=>deleteDemoTrips());assert.deepEqual(await page.evaluate(()=>State.trips),before);await page.reload({waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>State.trips[0].journals[0].text),'내가 편집한 기존 기록');return {existingUserDataPreserved:true,notDeletedAsDemo:true};
  });
  assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:results.every(result=>result.passed),results,errors},null,2));assert.ok(results.every(result=>result.passed),'가상 예제 온보딩 회귀 실패');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>server.close());
