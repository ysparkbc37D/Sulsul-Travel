/* 화면 갱신 예외가 이미 저장된 기록이나 AI 승인 결과를 실패로 바꾸지 않는지 검사한다. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)] || 'application/octet-stream');res.end(data);});
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
  page.setDefaultTimeout(10000);page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'networkidle'});
  await page.evaluate(()=>{
   window.alert=()=>{};window.confirm=()=>true;document.querySelectorAll('.sheet-container').forEach(element=>element.classList.add('sheet-closed'));
   State.trips=[{id:'record-render-test',title:'기록 기능 검증용 가상 여행',startDate:'2026-10-15',endDate:'2026-10-16',countries:['대한민국'],cities:['서울','부산'],currency:'KRW',budget:0,journals:{},expenses:[],checklist:[],days:[{id:'day-one',dayNum:1,date:'2026-10-15',city:'서울',title:'가상의 산책',spots:[{id:'spot-one',time:'10:00',title:'가상의 공원 산책',completed:false}]},{id:'day-two',dayNum:2,date:'2026-10-16',city:'부산',title:'둘째 날',spots:[]}]}];State.activeTripId='record-render-test';State.activeJournalDay=0;saveTrips();switchView('workspace');switchTab('journal');
   document.getElementById('journal-text-input').value='하루 회고의 아직 저장하지 않은 문장';rememberJournalDraft();openActivityJournal(0,0);
   document.getElementById('activity-record-text').value='나무 아래에서 잠시 쉬었다.';rememberActivityText();
   const canvas=document.createElement('canvas');canvas.width=80;canvas.height=60;canvas.getContext('2d').fillRect(0,0,80,60);const photo=canvas.toDataURL();State.activityRecordEditor.draft.photos=[photo];State.activityRecordEditor.draft.photoThumbnails=[photo];State.activityRecordEditor.draft.mediaIds=[null];
   window.originalJournalRenderer=renderJournalTab;renderJournalTab=()=>{throw new TypeError('SulsulTravel.TripAdapter.getJournalEntry is not a function');};
  });
  const saved=await page.evaluate(()=>{
   const ok=saveActivityRecord(),record=activityEntries(getActiveTrip())[0];window.recordTestId=record.id;
   return {ok,persisted:JSON.parse(localStorage.getItem('st_trips_v2'))[0].activityRecords[record.id].text,photos:record.photos.length,dirty:activityEditorDirty(),feedback:document.getElementById('activity-record-feedback').textContent,stat:document.getElementById('stat-ws-diaries').textContent,completed:getActiveTrip().days[0].spots[0].completed};
  });
  assert.equal(saved.ok,true,'화면 예외 뒤에도 디스크에 저장한 기록은 성공이어야 한다.');assert.equal(saved.persisted,'나무 아래에서 잠시 쉬었다.');assert.equal(saved.photos,1);assert.equal(saved.dirty,false);assert.ok(saved.feedback.includes('저장'));assert.equal(saved.stat,'1편 / 1장');assert.equal(saved.completed,false);
  const activityAi=await page.evaluate(async()=>{
   callGeminiApiWithFallback=async()=> '나무 아래에서 잠시 숨을 골랐다.';await generateActivityEssay();const reviewState=(await getAiOrchestrator()).get(State.activeAiJobId).state;await approveActiveAiDraft();
   return {review:reviewState,approved:State.reviewAiJobId===null,text:getActiveTrip().activityRecords[recordTestId].text,original:getActiveTrip().activityRecords[recordTestId].originalText,photos:getActiveTrip().activityRecords[recordTestId].photos.length};
  });
  assert.equal(activityAi.review,'awaiting_review');assert.equal(activityAi.approved,true);assert.equal(activityAi.text,'나무 아래에서 잠시 숨을 골랐다.');assert.equal(activityAi.original,'나무 아래에서 잠시 쉬었다.');assert.equal(activityAi.photos,1);
  const activityAiAgain=await page.evaluate(async()=>{
   callGeminiApiWithFallback=async()=> '나무 그늘에서 잠깐 숨을 골랐다.';await generateActivityEssay();await approveActiveAiDraft();return {text:getActiveTrip().activityRecords[recordTestId].text,original:getActiveTrip().activityRecords[recordTestId].originalText};
  });assert.equal(activityAiAgain.original,'나무 아래에서 잠시 쉬었다.');assert.equal(activityAiAgain.text,'나무 그늘에서 잠깐 숨을 골랐다.');
  const movedRecord=await page.evaluate(()=>{
   const originalContext=structuredClone(getActiveTrip().activityRecords[recordTestId].context),next=structuredClone(State.trips),copy=next.find(trip=>trip.id===getActiveTrip().id),spot=copy.days[0].spots.shift();spot.title='재계획된 바닷가 산책';spot.time='17:30';copy.days[1].spots.push(spot);State.trips=TripRepository.saveAll(next,{bumpTripId:copy.id});openActivityJournal(1,0);
   document.getElementById('activity-record-text').value='나무 그늘에서 쉬었던 순간을 덧붙였다.';rememberActivityText();const ok=saveActivityRecord(),record=getActiveTrip().activityRecords[recordTestId],archive=activityArchiveHtml(getActiveTrip()),report=activityReportHtml(getActiveTrip());
   const result={ok,originalContext,context:record.context,persisted:JSON.parse(localStorage.getItem('st_trips_v2'))[0].activityRecords[recordTestId].context,header:document.getElementById('activity-record-title').textContent,oldDay:momentFeedEntries(getActiveTrip(),0).some(item=>item.id===recordTestId),newDay:momentFeedEntries(getActiveTrip(),1).some(item=>item.id===recordTestId),location:activityLocation(getActiveTrip(),recordTestId).dayIndex,archive:archive.includes('2026-10-15')&&archive.includes('10:00')&&archive.includes('가상의 공원 산책')&&!archive.includes('재계획된 바닷가 산책'),report:report.includes('2026-10-15')&&report.includes('10:00')&&report.includes('서울')&&!report.includes('2026-10-16')};
   const restored=structuredClone(State.trips),target=restored.find(trip=>trip.id===copy.id);target.days[0].spots.push(target.days[1].spots.shift());State.trips=TripRepository.saveAll(restored,{bumpTripId:target.id});return result;
  });assert.equal(movedRecord.ok,true);assert.deepEqual(movedRecord.context,movedRecord.originalContext);assert.deepEqual(movedRecord.persisted,movedRecord.originalContext);assert.equal(movedRecord.header,'가상의 공원 산책');assert.equal(movedRecord.oldDay,true);assert.equal(movedRecord.newDay,false);assert.equal(movedRecord.location,1);assert.equal(movedRecord.archive,true);assert.equal(movedRecord.report,true);
  await page.evaluate(()=>{closeModal('modal-activity-record',true);});await page.waitForTimeout(200);
  const momentSaved=await page.evaluate(()=>{
   openMomentJournal(0);document.getElementById('moment-record-text').value='길을 걷다가 작은 카페를 보았다.';document.getElementById('moment-record-time').value='11:00';rememberMomentDraft();const ok=saveMomentRecord();window.recordMomentTestId=State.momentRecordEditor.entryId;
   return {ok,persisted:JSON.parse(localStorage.getItem('st_trips_v2'))[0].momentEntries[0].text,dirty:momentEditorDirty(),stat:document.getElementById('stat-ws-diaries').textContent,feedback:document.getElementById('moment-record-feedback').textContent};
  });assert.equal(momentSaved.ok,true);assert.equal(momentSaved.persisted,'길을 걷다가 작은 카페를 보았다.');assert.equal(momentSaved.dirty,false);assert.equal(momentSaved.stat,'2편 / 1장');assert.ok(momentSaved.feedback.includes('저장'));
  const momentAi=await page.evaluate(async()=>{
   callGeminiApiWithFallback=async()=> '걷던 길에서 작은 카페가 눈에 들어왔다.';await generateMomentEssay();const reviewState=(await getAiOrchestrator()).get(State.activeAiJobId).state;await approveActiveAiDraft();return {review:reviewState,approved:State.reviewAiJobId===null,entry:momentEntries(getActiveTrip()).find(entry=>entry.id===recordMomentTestId)};
  });assert.equal(momentAi.review,'awaiting_review');assert.equal(momentAi.approved,true);assert.equal(momentAi.entry.originalText,'길을 걷다가 작은 카페를 보았다.');assert.equal(momentAi.entry.text,'걷던 길에서 작은 카페가 눈에 들어왔다.');
  const failed=await page.evaluate(()=>{
   const original=Storage.prototype.setItem,before=localStorage.getItem('st_trips_v2');document.getElementById('moment-record-text').value='실패해도 보존할 초안';rememberMomentDraft();let ok;
   Storage.prototype.setItem=function(key,value){if(key==='st_trips_v2')throw new DOMException('quota','QuotaExceededError');return original.call(this,key,value);};try{ok=saveMomentRecord();}finally{Storage.prototype.setItem=original;}
   return {ok,unchanged:localStorage.getItem('st_trips_v2')===before,dirty:momentEditorDirty(),text:document.getElementById('moment-record-text').value};
  });assert.deepEqual(failed,{ok:false,unchanged:true,dirty:true,text:'실패해도 보존할 초안'});
  const recovery=await page.evaluate(()=>{saveMomentRecord();closeMomentJournal(true);renderJournalTab=originalJournalRenderer;renderJournalTab();return {daily:document.getElementById('journal-text-input').value,moment:momentEntries(getActiveTrip())[0].text};});assert.equal(recovery.daily,'하루 회고의 아직 저장하지 않은 문장');assert.equal(recovery.moment,'실패해도 보존할 초안');await page.waitForTimeout(200);
  const deletedMoment=await page.evaluate(()=>{openMomentJournal(0,recordMomentTestId);renderJournalTab=()=>{throw new Error('강제 화면 오류');};const ok=deleteMomentRecord();return {ok,remaining:momentEntries(getActiveTrip()).length,persisted:JSON.parse(localStorage.getItem('st_trips_v2'))[0].momentEntries.length};});assert.deepEqual(deletedMoment,{ok:true,remaining:0,persisted:0});await page.waitForTimeout(200);
  const deletedActivity=await page.evaluate(()=>{openActivityJournal(0,0);const ok=deleteActivityRecord();return {ok,remaining:activityEntries(getActiveTrip()).length,persisted:Object.keys(JSON.parse(localStorage.getItem('st_trips_v2'))[0].activityRecords).length};});assert.deepEqual(deletedActivity,{ok:true,remaining:0,persisted:0});
  await page.evaluate(()=>{renderJournalTab=originalJournalRenderer;});await page.reload({waitUntil:'networkidle'});assert.deepEqual(await page.evaluate(()=>({activity:activityEntries(State.trips[0]).length,moment:momentEntries(State.trips[0]).length})),{activity:0,moment:0});
  assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,checks:'일정/순간 저장 후 렌더링 오류, AI 생성/승인, 재다듬기 최초 원문, 재계획 후 날짜·시각·제목·도시 및 원래 날짜 피드 보존, 사진/완료 상태, 하루 회고 초안, 실제 저장 실패, 삭제와 재시작',errors}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>server.close());
