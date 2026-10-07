/* 합성 데이터 통합 검사: 사용자 프로필, 인증 정보, 클라우드 쓰기 및 AI 호출 없음. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),output=path.join(root,'.local-review','v1.8.6');
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}const mime={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png','.woff2':'font/woff2'};res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(data);});
});
(async()=>{
 fs.mkdirSync(output,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'networkidle'});
  const result=await page.evaluate(async()=>{
   window.alerts=[];window.alert=m=>alerts.push(String(m));window.confirm=()=>true;
   const t={id:'test-spain',title:'스페인 여행',startDate:'2026-09-13',endDate:'2026-09-15',durationDays:3,budget:0,countries:['스페인'],cities:['마드리드'],revision:0,days:[{dayNum:1,date:'2026-09-13',city:'마드리드',title:'첫날',planBlockId:'b1',spots:[{id:'s1',title:'미술관',time:'09:00',desc:'작품 감상',completed:true},{id:'s2',title:'시장',time:'12:00',skipped:true},{id:'s3',title:'공원',time:'15:00'}]},{dayNum:2,date:'2026-09-14',title:'둘째 날',city:'마드리드',planBlockId:'b1',spots:[]}],planBlockMeta:{b1:{place:'마드리드',lodging:'호텔',notes:'예약 메모'}},journals:{0:{text:'원문',photos:[]}},expenses:[],checklist:[]};
   State.trips=[t];State.activeTripId=t.id;State.activeJournalDay=0;saveTrips();switchView('workspace');switchTab('journal');renderJournalTab();
   const withFailure=fn=>{const old=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='st_trips_v2')throw new DOMException('test quota','QuotaExceededError');return old.call(this,k,v);};try{return fn();}finally{Storage.prototype.setItem=old;}};
   document.getElementById('journal-text-input').value='새 원문';
   const failed=withFailure(()=>saveJournalText());
   const persistedOnFail=JSON.parse(localStorage.getItem('st_trips_v2'))[0].journals[0].text;
   const memoryOnFail=getActiveTrip().journals[0].text;
   selectJournalDay(1);selectJournalDay(0);const draftRetained=document.getElementById('journal-text-input').value;
   const retry=saveJournalText();const saved=JSON.parse(localStorage.getItem('st_trips_v2'))[0].journals[0].text;
   withFailure(()=>toggleSpotCompleted(0,2));const completedOnFailure=getActiveTrip().days[0].spots[2].completed===true;
   const payload=SulsulTravel.TripTransfer.create(getActiveTrip(),{journals:true},APP_VER);
   const link=`${location.origin}/#share=${LZString.compressToEncodedURIComponent(JSON.stringify(payload))}`;
   history.replaceState(null,'',link);const before=State.trips.length;
   const failedImport=withFailure(()=>checkUrlShareImportOnStartup());
   const hashRetained=location.hash.startsWith('#share='),countOnFail=State.trips.length;
   const successfulImport=checkUrlShareImportOnStartup(),after=State.trips.length;
   history.replaceState(null,'',link);checkUrlShareImportOnStartup();const duplicateCount=State.trips.length;
   const metadata=getActiveTrip().planBlockMeta.b1.notes;
   const file=new File([JSON.stringify(SulsulTravel.TripTransfer.create(t,{},APP_VER))],'trip.json',{type:'application/json'});
   await importTravelSnapshotFile({target:{files:[file],value:'trip.json'}});const fileImported=State.trips.length===after+1;
   const reportTrip=JSON.parse(JSON.stringify(t));reportTrip.title='<span data-probe="title">문자열</span>';renderPdfReport(reportTrip);
   const report=document.getElementById('pdf-report-content');
   const reportSafe=!report.querySelector('[data-probe]'),reportText=report.textContent;
   await copyTravelSnapshotLink();const localhostWarning=document.getElementById('share-feedback').textContent.includes('내 컴퓨터');
   history.replaceState(null,'',location.pathname);State.activeTripId=t.id;switchView('hub');
   const priorTestTrips=State.trips,priorTestActiveId=State.activeTripId;
   const priorSampleFlag=localStorage.getItem('st_sa_sample_deleted');localStorage.setItem('st_sa_sample_deleted','true');
   const deletionTrip={id:'delete-transaction-audit',title:'삭제 저장 검증',days:[{date:'2026-09-14',spots:[]}],journals:{}};
   State.trips=TripRepository.saveAll([deletionTrip]);State.activeTripId=deletionTrip.id;
   await JournalOverflowRepository.save({tripId:deletionTrip.id,dayIndex:0,journal:{text:'삭제 대상 임시 기록'},revision:0});
   const originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='st_trips_v2')throw new DOMException('test quota','QuotaExceededError');return originalSetItem.call(this,key,value);};
   requestDeleteTrip(deletionTrip.id);await new Promise(resolve=>setTimeout(resolve,400));document.getElementById('confirm-delete-btn').click();
   const failedDeleteRetained=State.trips.some(item=>item.id===deletionTrip.id),failedDeleteDialogRetained=!document.getElementById('modal-confirm-delete').classList.contains('sheet-closed');
   Storage.prototype.setItem=originalSetItem;await new Promise(resolve=>setTimeout(resolve,400));document.getElementById('confirm-delete-btn').click();
   for(let i=0;i<20;i++){if(!(await JournalOverflowRepository.loadAll()).some(item=>item.tripId===deletionTrip.id))break;await new Promise(resolve=>setTimeout(resolve,20));}
   const deletionOverflowCleaned=!(await JournalOverflowRepository.loadAll()).some(item=>item.tripId===deletionTrip.id);
   const deletionPersists=JSON.parse(localStorage.getItem('st_trips_v2')).every(item=>item.id!==deletionTrip.id);
   const lastTripDeletionSafe=State.trips.length===0&&State.activeTripId===null;
   if(priorSampleFlag==null)localStorage.removeItem('st_sa_sample_deleted');else localStorage.setItem('st_sa_sample_deleted',priorSampleFlag);
   State.trips=priorTestTrips;State.activeTripId=priorTestActiveId;
   const host=document.createElement('div');host.id='status-test';host.innerHTML=renderDDayBadge(t,new Date('2026-09-14T12:00:00Z'));document.body.appendChild(host);
   return {failed,persistedOnFail,memoryOnFail,draftRetained,retry,saved,completedOnFailure,before,failedImport,hashRetained,countOnFail,successfulImport,after,duplicateCount,metadata,fileImported,reportSafe,reportText,localhostWarning,failedDeleteRetained,failedDeleteDialogRetained,deletionOverflowCleaned,deletionPersists,lastTripDeletionSafe};
  });
  assert.equal(result.failed,false);assert.equal(result.persistedOnFail,'원문');assert.equal(result.memoryOnFail,'원문');assert.equal(result.draftRetained,'새 원문');assert.equal(result.retry,true);assert.equal(result.saved,'새 원문');assert.equal(result.completedOnFailure,false);
  assert.equal(result.failedImport,false);assert.equal(result.hashRetained,true);assert.equal(result.countOnFail,result.before);assert.equal(result.successfulImport,true);assert.equal(result.after,result.before+1);assert.equal(result.duplicateCount,result.after);assert.equal(result.metadata,'예약 메모');assert.equal(result.fileImported,true);
  assert.equal(result.reportSafe,true);for(const text of ['방문 완료','건너뜀','예정','09:00','작품 감상'])assert.ok(result.reportText.includes(text),text);
  assert.ok(!result.reportText.includes('맑음'));assert.ok(!result.reportText.includes('감동'));assert.equal(result.localhostWarning,true);
  assert.equal(result.failedDeleteRetained,true);assert.equal(result.failedDeleteDialogRetained,true);assert.equal(result.deletionOverflowCleaned,true);assert.equal(result.deletionPersists,true);assert.equal(result.lastTripDeletionSafe,true);
  const overflowReplacement=await page.evaluate(async()=>{
   const trip=JSON.parse(JSON.stringify(State.trips.find(item=>item.id==='test-spain')));trip.journals[0]={text:'JSON 백업의 기록',photos:[]};trip.revision=0;
   await JournalOverflowRepository.save({tripId:trip.id,dayIndex:0,journal:{text:'복원되면 안 되는 이전 초과 기록'},revision:500});
   const file=new File([JSON.stringify({version:APP_VER,trips:[trip]})],'backup.json',{type:'application/json'});
   importDataFromJson({target:{files:[file],value:'backup.json'}});
   for(let i=0;i<50;i++){if(State.trips[0]?.journals?.[0]?.text==='JSON 백업의 기록'&&!(await JournalOverflowRepository.loadAll()).length)break;await new Promise(resolve=>setTimeout(resolve,20));}
   await restoreJournalOverflowEntries();
   return {text:State.trips[0]?.journals?.[0]?.text,overflow:(await JournalOverflowRepository.loadAll()).length};
  });
  assert.deepEqual(overflowReplacement,{text:'JSON 백업의 기록',overflow:0});
  const aiFallbackTest=await page.evaluate(async()=>{
   const priorKey=State.geminiKey,priorStoredKey=localStorage.getItem('st_gemini_key'),priorFallback=State.aiFallbackActive,oldFetch=window.fetch,models=[],quotaModels=[];
   State.geminiKey='synthetic-gemini-key';localStorage.setItem('st_gemini_key',State.geminiKey);State.aiFallbackActive=false;
   window.fetch=async url=>{
    const model=new URL(url).pathname.split('/models/')[1].split(':')[0];models.push(model);
    if(models.length===1)return new Response(JSON.stringify({error:{message:'synthetic model unavailable'}}),{status:404,headers:{'Content-Type':'application/json'}});
    return new Response(JSON.stringify({candidates:[{content:{parts:[{text:'OK'}]}}]}),{status:200,headers:{'Content-Type':'application/json'}});
   };
   try{
    await testGeminiApiKey();const button=document.getElementById('btn-test-gemini-key').textContent,activeFallback=State.aiFallbackActive,chatStatus=document.getElementById('ai-chat-status-pill')?.textContent||'';
    window.fetch=async url=>{quotaModels.push(new URL(url).pathname.split('/models/')[1].split(':')[0]);if(quotaModels.length===1)return new Response(JSON.stringify({error:{message:'synthetic quota'}}),{status:429,headers:{'Content-Type':'application/json'}});return new Response(JSON.stringify({candidates:[{content:{parts:[{text:'OK'}]}}]}),{status:200,headers:{'Content-Type':'application/json'}});};
    State.aiFallbackActive=false;const quotaFallback=await callGeminiApiWithFallback('Reply with only OK.',{timeoutMs:8000});
    window.fetch=async()=>new Response(JSON.stringify({error:{message:'synthetic quota'}}),{status:429,headers:{'Content-Type':'application/json'}});
    let allQuotaError='';try{await callGeminiApiWithFallback('Reply with only OK.',{timeoutMs:8000});}catch(error){allQuotaError=error.code;}
    return {models,button,activeFallback,chatStatus,quotaModels,quotaFallback,allQuotaError};
   }
   finally{window.fetch=oldFetch;State.geminiKey=priorKey;State.aiFallbackActive=priorFallback;if(priorStoredKey==null)localStorage.removeItem('st_gemini_key');else localStorage.setItem('st_gemini_key',priorStoredKey);updateGeminiKeyUi();}
  });
  assert.deepEqual(aiFallbackTest.models,['gemini-3.1-flash-lite','gemini-3.5-flash-lite']);assert.ok(aiFallbackTest.button.includes('정상 작동'));assert.equal(aiFallbackTest.activeFallback,true);assert.ok(aiFallbackTest.chatStatus.includes('대체 모델 사용'));assert.deepEqual(aiFallbackTest.quotaModels,['gemini-3.1-flash-lite','gemini-3.5-flash-lite']);assert.equal(aiFallbackTest.quotaFallback,'OK');assert.equal(aiFallbackTest.allQuotaError,'QUOTA_EXCEEDED');
  const contrast={};
  for(const theme of ['modern','lightgray','deepblack']){
   await page.evaluate(t=>setTheme(t),theme);await page.waitForTimeout(300);
   contrast[theme]=await page.evaluate(()=>{const s=getComputedStyle(document.querySelector('#status-test span'));const lum=c=>c.match(/[\d.]+/g).slice(0,3).map(v=>{v=Number(v)/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);const a=lum(s.color),b=lum(s.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);});
   assert.ok(contrast[theme]>=7,`${theme}: ${contrast[theme]}`);
   await page.screenshot({path:path.join(output,`${theme}.png`),fullPage:true});
  }
  for(const width of [360,390,430]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
  await page.evaluate(()=>{openShareModal();});await page.screenshot({path:path.join(output,'share.png')});
  // 가상 배포 주소에서 같은 로컬 파일을 제공하며 외부 요청은 전송하지 않는다.
  const deployed = await context.newPage();
  deployed.on('pageerror',e=>errors.push(e.message));
  await deployed.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.hostname!=='travel.test')return route.abort();
   const file=path.resolve(root,'.'+url.pathname.replace(/\/$/,'/index.html'));
   if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
   const types={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png'};
   return route.fulfill({contentType:types[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  });
  await deployed.goto('https://travel.test/',{waitUntil:'networkidle'});
  const linkResults=await deployed.evaluate(async()=>{
   window.confirm=()=>true;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.copied=value;}}});
   const trip={id:'link',title:'여행',days:[],journals:{},expenses:[],checklist:[]};State.trips=[trip];State.activeTripId='link';
   openShareModal();await copyTripShareLink();const shortCopied=!!window.copied?.startsWith('https://travel.test/#share=');window.copied='';
   let seed=7;const value=Array.from({length:10000},()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return (seed>>>24).toString(16);}).join('');
   getActiveTrip().wishlist=value;await copyTripShareLink();
   return {shortCopied,longCopied:!!window.copied,longMessage:document.getElementById('share-feedback').textContent};
  });
  assert.equal(linkResults.shortCopied,true);assert.equal(linkResults.longCopied,false);assert.ok(linkResults.longMessage.includes('길어'));
  const downloadReady=deployed.waitForEvent('download');await deployed.evaluate(()=>sendTripSnapshotFile());const download=await downloadReady;
  const payload=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.equal(payload.format,'sulsul-trip');assert.equal(payload.trip.id,'link');
  // 실제 서비스 워커 캐시로 오프라인 재시작과 새 공유 모듈 로드를 검사한다.
  const offlineContext=await browser.newContext({serviceWorkers:'allow'});
  const offlinePage=await offlineContext.newPage();
  offlinePage.on('pageerror',e=>errors.push(e.message));
  const localOrigin=`http://127.0.0.1:${server.address().port}`;
  await offlineContext.route('**/*',route=>new URL(route.request().url()).origin===localOrigin?route.continue():route.abort());
  await offlinePage.goto(localOrigin+'/',{waitUntil:'networkidle'});
  await offlinePage.evaluate(()=>navigator.serviceWorker.ready);
  await offlinePage.waitForFunction(()=>!!navigator.serviceWorker.controller);
  const cachedModules=await offlinePage.evaluate(async()=>{
   const cache=await caches.open('st-shell-v'+APP_VER);
   return Promise.all(['js/domain/trip-adapter.js','js/domain/travel-story.js','js/infrastructure/storage/media-repository.js','js/presentation/moment-journal.js','js/presentation/travel-story-ui.js','js/domain/trip-transfer.js','js/presentation/trip-transfer-ui.js','js/presentation/activity-journal.js','js/presentation/expense-editor.js','css/companion-refresh.css','css/moment-journal.css'].map(async p=>!!await cache.match('./'+p+'?v='+APP_VER)));
  });
  assert.equal(cachedModules.length,11);assert.ok(cachedModules.every(Boolean),'새 데이터·순간·사진·출력 모듈과 CSS도 오프라인 앱 셸에 있어야 한다.');
  await offlinePage.evaluate(()=>{
   State.trips=[{id:'offline',title:'오프라인 보존 검사',days:[{dayNum:1,date:'2026-09-14',city:'서울',title:'첫날',spots:[]}],journals:{0:{text:'보존할 여행 기록',photos:[]}},expenses:[]}];
   TripRepository.saveAll(State.trips);
  });
  await offlineContext.setOffline(true);
  await offlinePage.reload({waitUntil:'domcontentloaded'});
  await offlinePage.waitForFunction(()=>window.SulsulTravel?.TripTransfer && typeof State!=='undefined' && State.trips.some(t=>t.id==='offline'));
  const offlineResult=await offlinePage.evaluate(()=>({text:State.trips.find(t=>t.id==='offline').journals[0].text,share:typeof sendTripSnapshotFile}));
  assert.deepEqual(offlineResult,{text:'보존할 여행 기록',share:'function'});
  await offlineContext.close();
  assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,contrast,runtimeErrors:errors,checks:'journal failure/retry, completion rollback, import failure/retry/dedup, delete rollback/IndexedDB cleanup/last trip, full backup overflow cleanup, Gemini model/quota fallback, file upload/download roundtrip, metadata, PDF facts/escaping, localhost, short/long links, theme contrast, mobile widths'}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
