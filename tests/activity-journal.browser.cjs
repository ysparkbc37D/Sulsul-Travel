/* 실제 계정과 분리한 일정 기록·사진·AI 검토·모바일 통합 검사. AI 응답은 고정한다. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),output=path.join(root,'.local-review','activity-journal');
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(data);});
});
(async()=>{
 fs.mkdirSync(output,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
  page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'networkidle'});
  await page.evaluate(()=>{
   window.alert=()=>{};window.confirm=()=>true;
   document.querySelectorAll('.sheet-container').forEach(el=>el.classList.add('sheet-closed'));
   State.trips=[{id:'activity-test',title:'마드리드 산책',startDate:'2026-09-09',endDate:'2026-09-10',countries:['스페인'],cities:['마드리드'],currency:'EUR',budget:0,journals:{},expenses:[],checklist:[],days:[{dayNum:1,date:'2026-09-09',city:'마드리드',title:'도착한 날',spots:[{time:'14:00',title:'마드리드 공항 도착',desc:'공항철도로 이동',completed:false},{time:'16:00',title:'오래된 광장 산책',completed:false}]},{dayNum:2,date:'2026-09-10',city:'마드리드',title:'둘째 날',spots:[]}]}];State.activeTripId='activity-test';State.activeJournalDay=0;saveTrips();switchView('workspace');setTheme('modern');State.allTimelinesExpanded=true;switchPlanSubTab('timeline');renderTimelineTab();
   openActivityJournal(0,0);
  });
  await page.locator('#activity-record-text').fill('공항에 내려 따뜻한 햇살을 맞았다. 새로운 여행이 설렜다.');
  const saved=await page.evaluate(async()=>{
   rememberActivityText();
   const files=[];
   for(const color of ['#d4a754','#527b6c']){const c=document.createElement('canvas');c.width=1600;c.height=900;c.getContext('2d').fillStyle=color;c.getContext('2d').fillRect(0,0,1600,900);const blob=await new Promise(r=>c.toBlob(r));files.push(new File([blob],'photo.png',{type:'image/png'}));}
   const reading=addActivityPhotos({target:{files,value:'photo.png'}});selectJournalDay(1);await reading;setActivityCover(1);
   const ok=saveActivityRecord();const record=activityEntries(getActiveTrip())[0];window.testRecordId=record.id;
   const img=new Image();img.src=record.photos[0];await img.decode();
   return {ok,completed:getActiveTrip().days[0].spots[0].completed,photos:record.photos.length,cover:record.coverIndex,w:img.width,h:img.height,stat:document.getElementById('stat-ws-diaries').textContent};
  });
  assert.deepEqual(saved,{ok:true,completed:false,photos:2,cover:1,w:336,h:448,stat:'1편 / 2장'});
  const privacy=await page.evaluate(()=>{
   const trip=getActiveTrip(),api=SulsulTravel.TripTransfer;
   return {private:api.create(trip).trip.activityRecords,roundtrip:api.parse(JSON.stringify(api.create(trip,{journals:true}))).trip.activityRecords[testRecordId].photos.length};
  });assert.equal(privacy.private,undefined);assert.equal(privacy.roundtrip,2);
  const failure=await page.evaluate(()=>{
   const original=activityEntries(getActiveTrip())[0].text,old=Storage.prototype.setItem;
   document.getElementById('activity-record-text').value='저장 실패 후 재시도할 원문';rememberActivityText();
   Storage.prototype.setItem=function(k,v){if(k==='st_trips_v2')throw new DOMException('quota','QuotaExceededError');return old.call(this,k,v);};
   let ok;try{ok=saveActivityRecord();}finally{Storage.prototype.setItem=old;}
   return {ok,original,persisted:JSON.parse(localStorage.getItem('st_trips_v2'))[0].activityRecords[testRecordId].text,memory:getActiveTrip().activityRecords[testRecordId].text,draft:document.getElementById('activity-record-text').value,retry:saveActivityRecord()};
  });assert.equal(failure.ok,false);assert.equal(failure.persisted,failure.original);assert.equal(failure.memory,failure.original);assert.equal(failure.draft,'저장 실패 후 재시도할 원문');assert.equal(failure.retry,true);
  await page.evaluate(async()=>{callGeminiApiWithFallback=async()=> '여행의 시작을 천천히 기록했다.';await generateActivityEssay();});
  assert.equal(await page.locator('#modal-ai-draft-review').evaluate(el=>el.classList.contains('sheet-closed')),false);
  assert.equal(await page.evaluate(()=>getActiveTrip().activityRecords[testRecordId].text),'저장 실패 후 재시도할 원문');
  await page.locator('#btn-apply-ai-draft').click();
  const ai=await page.evaluate(()=>({record:getActiveTrip().activityRecords[testRecordId],editor:document.getElementById('activity-record-text').value}));
  assert.equal(ai.record.text,'여행의 시작을 천천히 기록했다.');assert.equal(ai.record.originalText,'저장 실패 후 재시도할 원문');assert.equal(ai.editor,ai.record.text);assert.equal(ai.record.photos.length,2);
  const failedAi=await page.evaluate(async()=>{
   callGeminiApiWithFallback=async()=> '다시 다듬은 여행 기록';await generateActivityEssay();
   const old=Storage.prototype.setItem;
   Storage.prototype.setItem=function(k,v){if(k==='st_trips_v2')throw new DOMException('quota','QuotaExceededError');return old.call(this,k,v);};
   try{await approveActiveAiDraft();}finally{Storage.prototype.setItem=old;}
   const job=(await getAiOrchestrator()).get(State.activeAiJobId);
   return {state:job.state,error:job.errorCode,text:getActiveTrip().activityRecords[testRecordId].text};
  });assert.deepEqual(failedAi,{state:'awaiting_review',error:'APPLY_FAILED',text:ai.record.text});
  await page.evaluate(()=>approveActiveAiDraft());assert.equal(await page.locator('#activity-record-text').inputValue(),'다시 다듬은 여행 기록');
  await page.evaluate(async()=>{await generateActivityEssay();document.getElementById('activity-record-text').value='AI 생성 후 내가 수정한 글';rememberActivityText();await approveActiveAiDraft();});
  assert.ok((await page.locator('#ai-draft-review-status').textContent()).includes('원본이 변경'));
  assert.equal(await page.locator('#activity-record-text').inputValue(),'AI 생성 후 내가 수정한 글');
  await page.evaluate(async()=>{closeModal('modal-ai-draft-review',true);saveActivityRecord();callGeminiApiWithFallback=async()=>{throw new Error('INVALID_API_KEY');};await generateActivityEssay();});
  assert.ok((await page.locator('#activity-record-feedback').textContent()).includes('원문은 그대로'));
  await page.evaluate(()=>{window.confirm=()=>false;document.getElementById('activity-record-text').value='닫지 않고 보존할 초안';rememberActivityText();lastModalActionTime=0;closeModal('modal-activity-record');});
  assert.equal(await page.locator('#modal-activity-record').evaluate(el=>el.classList.contains('sheet-closed')),false);
  await page.evaluate(()=>{window.confirm=()=>true;saveActivityRecord();});
  await page.waitForTimeout(400);
  await page.evaluate(()=>history.back());
  await page.waitForFunction(()=>document.getElementById('modal-activity-record').classList.contains('sheet-closed'));
  await page.evaluate(()=>openActivityJournal(0,0));
  await page.locator('#activity-record-text').fill('뒤로가기에도 보존할 글');
  await page.evaluate(()=>{rememberActivityText();window.confirm=()=>false;lastModalActionTime=0;history.back();});
  await page.waitForTimeout(100);
  assert.equal(await page.locator('#activity-record-text').inputValue(),'뒤로가기에도 보존할 글');
  assert.equal(await page.locator('#modal-activity-record').evaluate(el=>el.classList.contains('sheet-closed')),false);
  await page.evaluate(()=>{window.confirm=()=>true;saveActivityRecord();});
  for(const width of [320,360,390,430]){
   await page.setViewportSize({width,height:740});
   const geometry=await page.evaluate(()=>{const box=document.querySelector('.activity-sheet').getBoundingClientRect(),footer=document.querySelector('.activity-sheet-footer').getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth,contained:box.left>=0&&box.right<=innerWidth+1,footer:footer.bottom<=innerHeight+1};});
   assert.deepEqual(geometry,{overflow:false,contained:true,footer:true});
  }
  await page.setViewportSize({width:390,height:520});await page.locator('#activity-record-text').focus();
  assert.ok(await page.locator('.activity-sheet-footer').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight+1));
  await page.setViewportSize({width:390,height:844});await page.locator('#activity-record-text').blur();
  await page.screenshot({path:path.join(output,'editor-modern.png')});
  await page.locator('#activity-record-photos button').first().click();
  assert.equal(await page.locator('#activity-record-viewer').isVisible(),true);
  await page.locator('#activity-record-viewer button').click();
  await page.evaluate(()=>{closeModal('modal-activity-record',true);});await page.waitForTimeout(150);
  for(const width of [320,360,390,430]){
   await page.setViewportSize({width,height:844});
   const cards=await page.locator('.activity-timeline-spot .activity-record-card').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect(),parent=el.parentElement.getBoundingClientRect(),images=[...el.querySelectorAll('img')];return {inside:r.right<=parent.right+1&&r.left>=parent.left-1,count:images.length,sizes:images.map(img=>[img.width,img.height])};}));
   assert.ok(cards.length>=2);for(const c of cards){assert.equal(c.inside,true);assert.ok(c.count<=1);for(const size of c.sizes)assert.deepEqual(size,[60,80]);}
  }
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(output,'timeline-modern.png'),fullPage:true});
  await page.evaluate(()=>{setTheme('deepblack');openActivityJournal(0,0);});await page.screenshot({path:path.join(output,'editor-dark.png')});
  const moved=await page.evaluate(()=>{saveActivityRecord();const trip=getActiveTrip();trip.days[1].spots.push(trip.days[0].spots.shift());saveTrips();return activityLocation(getActiveTrip(),testRecordId).day.date;});assert.equal(moved,'2026-09-10');
  const archived=await page.evaluate(()=>{getActiveTrip().days[1].spots=[];saveTrips();refreshActivitySurfaces();renderPdfReport(getActiveTrip());return {text:document.getElementById('pdf-report-content').textContent,record:getActiveTrip().activityRecords[testRecordId].text,archive:document.querySelector('.activity-archive').textContent};});
  assert.ok(archived.text.includes(archived.record));assert.ok(archived.text.includes('일정 변경 전 기록'));assert.ok(archived.archive.includes(archived.record));
  await page.evaluate(()=>{closeModal('modal-activity-record',true);});await page.waitForTimeout(150);await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.evaluate(()=>activityEntries(State.trips.find(t=>t.id==='activity-test'))[0].text),archived.record);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,checks:'완료 전 저장, 사진 압축/대표 선택/확대, 공유 개인정보 선택, 실패/재시도, AI 승인/충돌/실패, 이탈 방어, 320~430px 썸네일, 작은 화면 푸터, 이동/삭제 후 보존, PDF, 재시작',errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
