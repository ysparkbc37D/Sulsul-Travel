/* 합성 여행으로 회고 날짜의 UI·저장·보조 저장·에세이 연결을 확인한다. 외부 요청은 차단한다. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(data);});
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  try{
    const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
    await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'networkidle'});
    await page.evaluate(()=>{
      window.alert=()=>{};window.confirm=()=>true;
      const trip={id:'journal-stable-qa',title:'회고 날짜 검증용 합성 여행',startDate:'2030-01-01',durationDays:2,currency:'KRW',countries:['대한민국'],cities:['서울'],days:[{dayNum:1,date:'2030-01-01',title:'원래 첫날',city:'서울',spots:[]},{dayNum:2,date:'2030-01-02',title:'둘째날',city:'서울',spots:[]}],journals:{0:{text:'원래 첫날의 회고',photos:[]}},expenses:[],checklist:[]};
      State.trips=TripRepository.saveAll([trip]);State.activeTripId=trip.id;State.activeJournalDay=0;switchView('workspace');switchTab('journal');renderJournalTab();
    });
    assert.equal(await page.locator('#journal-text-input').inputValue(),'원래 첫날의 회고');
    await page.locator('#journal-text-input').fill('원래 첫날의 저장된 회고');
    assert.equal(await page.evaluate(()=>saveJournalText()),true);
    const initial=await page.evaluate(()=>({journal:getActiveTrip().journals[0],dayId:getActiveTrip().days[0].id}));
    assert.equal(initial.journal.dayId,initial.dayId);assert.equal(initial.journal.date,'2030-01-01');
    await page.locator('#journal-text-input').fill('작성 중인 원래 첫날의 회고');
    await page.evaluate(()=>{
      const next=structuredClone(State.trips);next[0].days.unshift({dayNum:1,date:'2029-12-31',title:'추가한 전날',city:'서울',spots:[]});
      State.trips=TripRepository.saveAll(next,{bumpTripId:next[0].id});State.activeJournalDay=0;renderJournalTab();
    });
    assert.equal(await page.locator('#journal-text-input').inputValue(),'');
    await page.evaluate(()=>selectJournalDay(1));
    assert.equal(await page.locator('#journal-text-input').inputValue(),'작성 중인 원래 첫날의 회고');
    assert.equal(await page.evaluate(()=>SulsulTravel.TripAdapter.getJournalEntry(getActiveTrip(),1).text),'원래 첫날의 저장된 회고');
    const photoMoved=await page.evaluate(async()=>{
      const sourceTrip=getActiveTrip(),dayId=sourceTrip.days[1].id,oldPrepare=SulsulTravel.mediaRepository.prepare;
      const canvas=document.createElement('canvas');canvas.width=2;canvas.height=2;const source=canvas.toDataURL('image/png');
      let release;SulsulTravel.mediaRepository.prepare=()=>new Promise(resolve=>{release=resolve;});
      try{
        const upload=handleJournalPhotoUpload({target:{files:[new File(['synthetic'],'journal.png',{type:'image/png'})],value:'journal.png'}});
        const next=structuredClone(State.trips),days=next[0].days;next[0].days=[days[2],days[0],days[1]];State.trips=TripRepository.saveAll(next,{bumpTripId:sourceTrip.id});renderJournalTab();
        release({source,thumbnail:source,mediaId:null});await upload;
        const trip=getActiveTrip(),index=trip.days.findIndex(day=>day.id===dayId);selectJournalDay(index);
        const journal=SulsulTravel.TripAdapter.getJournalEntry(trip,index);
        return {index,text:journal.text,photos:journal.photos.length,wrongDay:SulsulTravel.TripAdapter.getJournalEntry(trip,1)?.text||''};
      }finally{SulsulTravel.mediaRepository.prepare=oldPrepare;}
    });
    assert.deepEqual(photoMoved,{index:2,text:'작성 중인 원래 첫날의 회고',photos:1,wrongDay:''});
    const overflow=await page.evaluate(async()=>{
      const trip=getActiveTrip(),sourceIndex=State.activeJournalDay,entry=SulsulTravel.TripAdapter.getJournalEntry(trip,sourceIndex);
      await saveJournalOverflowEntry(trip,sourceIndex,{...entry,text:'보조 저장된 원래 첫날의 회고'},(trip.revision||0)+5);
      const next=structuredClone(State.trips);next[0].days.reverse();State.trips=TripRepository.saveAll(next,{bumpTripId:trip.id});
      await restoreJournalOverflowEntries();
      const dayIndex=getActiveTrip().days.findIndex(day=>day.id===entry.dayId);selectJournalDay(dayIndex);
      return {journal:SulsulTravel.TripAdapter.getJournalEntry(getActiveTrip(),dayIndex),stored:await JournalOverflowRepository.loadAll()};
    });
    assert.equal(overflow.journal.text,'보조 저장된 원래 첫날의 회고');assert.equal(overflow.journal.date,'2030-01-01');assert.equal(overflow.stored[0].dayId,initial.dayId);
    assert.equal(await page.locator('#journal-text-input').inputValue(),'보조 저장된 원래 첫날의 회고');
    const story=await page.evaluate(()=>{
      const next=structuredClone(State.trips),trip=next[0],entry=SulsulTravel.TripAdapter.getJournalEntry(trip,State.activeJournalDay);trip.days.find(day=>day.id===entry.dayId).date='2030-01-09';
      State.trips=TripRepository.saveAll(next,{bumpTripId:trip.id});renderJournalTab();
      const model=SulsulTravel.TravelStory.build(getActiveTrip());
      return {oldDate:model.days.find(day=>day.date==='2030-01-01')?.reflections.map(entry=>entry.text),newDate:model.days.find(day=>day.date==='2030-01-09')?.reflections.length,text:SulsulTravel.TravelStory.toText(model)};
    });
    assert.deepEqual(story.oldDate,['보조 저장된 원래 첫날의 회고']);assert.equal(story.newDate,0);assert.match(story.text,/2030-01-01/);
    assert.ok((await page.locator('#journal-day-card').textContent()).includes('기록한 원래 날짜: 2030-01-01'));
    await page.reload({waitUntil:'networkidle'});
    const reloaded=await page.evaluate(()=>{const trip=State.trips.find(item=>item.id==='journal-stable-qa'),entry=Object.values(trip.journals).find(entry=>entry.text==='보조 저장된 원래 첫날의 회고');return {date:entry.date,dayId:entry.dayId};});
    assert.deepEqual(reloaded,{date:'2030-01-01',dayId:initial.dayId});assert.deepEqual(errors,[]);
    await page.evaluate(()=>{
      window.installJournalSafetyFixture=()=>{
        const photo=color=>{const canvas=document.createElement('canvas');canvas.width=2;canvas.height=2;canvas.getContext('2d').fillStyle=color;canvas.getContext('2d').fillRect(0,0,2,2);return canvas.toDataURL('image/png');};
        const first={id:'journal-safety-a',title:'사진 삭제 검증용 합성 여행 A',currency:'KRW',countries:[],cities:[],days:[{id:'journal-safety-day-a',dayNum:1,date:'2030-02-01',city:'가상 도시',title:'합성 하루',spots:[]}],journals:{0:{text:'기존 회고',photos:[photo('#ff0000'),photo('#00ff00'),photo('#0000ff')]}},expenses:[],checklist:[]};
        const second={...structuredClone(first),id:'journal-safety-b',title:'사진 삭제 검증용 합성 여행 B',days:[{...structuredClone(first.days[0]),id:'journal-safety-day-b'}],journals:{0:{text:'다른 여행 회고',photos:[photo('#ffff00')]}}};
        State.trips=TripRepository.saveAll([first,second]);State.activeTripId=first.id;State.activeJournalDay=0;State.journalTextDrafts={};State.journalPhotoDrafts={};switchView('workspace');switchTab('journal');renderJournalTab();
      };
    });
    const switched=await page.evaluate(()=>{
      installJournalSafetyFixture();const before=getActiveTrip().journals[0].photos.slice();
      requestDeleteJournalPhoto(0,0);State.activeTripId='journal-safety-b';const otherBefore=getActiveTrip().journals[0].photos.slice();document.getElementById('confirm-delete-btn').click();
      const stored=JSON.parse(localStorage.getItem('st_trips_v2'));
      return {otherBefore,otherAfter:getActiveTrip().journals[0].photos,otherStored:stored.find(trip=>trip.id==='journal-safety-b').journals[0].photos,originalRemaining:State.trips.find(trip=>trip.id==='journal-safety-a').journals[0].photos.every(photo=>before.includes(photo))};
    });
    assert.deepEqual(switched.otherAfter,switched.otherBefore,'삭제 대기 중 여행을 바꿔도 다른 여행 사진은 유지');assert.deepEqual(switched.otherStored,switched.otherBefore);assert.equal(switched.originalRemaining,true);
    const reordered=await page.evaluate(()=>{
      installJournalSafetyFixture();requestDeleteJournalPhoto(0,1);
      const next=structuredClone(State.trips),photos=next[0].journals[0].photos;next[0].journals[0].photos=[photos[2],photos[0],photos[1]];State.trips=TripRepository.saveAll(next,{bumpTripId:next[0].id});const expected=getActiveTrip().journals[0].photos.slice();
      document.getElementById('confirm-delete-btn').click();return {expected,actual:getActiveTrip().journals[0].photos,stored:JSON.parse(localStorage.getItem('st_trips_v2'))[0].journals[0].photos};
    });
    assert.deepEqual(reordered.actual,reordered.expected,'확인 전 사진 순서가 바뀌면 오래된 삭제 요청 중단');assert.deepEqual(reordered.stored,reordered.expected);
    const failedDeletion=await page.evaluate(()=>{
      closeModal('modal-confirm-delete',true);installJournalSafetyFixture();const before=JSON.stringify(getActiveTrip().journals[0]),raw=localStorage.getItem('st_trips_v2');requestDeleteJournalPhoto(0,1);
      const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='st_trips_v2')throw new DOMException('synthetic journal quota','QuotaExceededError');return original.call(this,key,value);};
      try{document.getElementById('confirm-delete-btn').click();}finally{Storage.prototype.setItem=original;}
      const retained={memory:JSON.stringify(getActiveTrip().journals[0])===before,persisted:localStorage.getItem('st_trips_v2')===raw,dialog:!document.getElementById('modal-confirm-delete').classList.contains('sheet-closed')};
      document.getElementById('confirm-delete-btn').click();return {...retained,retryCount:getActiveTrip().journals[0].photos.length,retryPersisted:JSON.parse(localStorage.getItem('st_trips_v2'))[0].journals[0].photos.length};
    });
    assert.deepEqual(failedDeletion,{memory:true,persisted:true,dialog:true,retryCount:2,retryPersisted:2},'사진 삭제 저장 실패는 원본과 확인창을 유지하고 재시도');
    await page.evaluate(()=>{installJournalSafetyFixture();});
    await page.locator('#journal-text-input').fill('AI 검토 중에 추가 작성한 새 회고');
    const staleAi=await page.evaluate(async()=>{
      const trip=getActiveTrip(),raw=localStorage.getItem('st_trips_v2'),entry=SulsulTravel.TripAdapter.getJournalEntry(trip,0);
      const result=await applyAiDraftPayload({id:'journal-unsaved-conflict',tripId:trip.id,targetId:'journal-day-0',kind:'journal',baseRevision:trip.revision,input:{dayIndex:0,dayId:entry.dayId,date:entry.date,sourceText:'기존 회고'},draft:{text:'검토 중이던 AI 문장'}});
      return {result,storedUnchanged:localStorage.getItem('st_trips_v2')===raw,savedText:SulsulTravel.TripAdapter.getJournalEntry(getActiveTrip(),0).text,draft:State.journalTextDrafts[SulsulTravel.TripAdapter.journalDraftKey(getActiveTrip(),0)],input:document.getElementById('journal-text-input').value};
    });
    assert.deepEqual(staleAi,{result:'conflict',storedUnchanged:true,savedText:'기존 회고',draft:'AI 검토 중에 추가 작성한 새 회고',input:'AI 검토 중에 추가 작성한 새 회고'},'AI 검토 중 미저장 회고를 덮어쓰지 않음');
    await page.evaluate(async()=>{
      installJournalSafetyFixture();const {Orchestrator}=await import('../js/application/orchestration.mjs');
      aiOrchestratorPromise=Promise.resolve(new Orchestrator({generate:async job=>({text:'합성 AI 회고 승인문'}),validate:validateAiDraftPayload,applyDraft:applyAiDraftPayload}));
    });
    await page.locator('#journal-text-input').fill('AI에 맡길 합성 회고 원문');
    await page.evaluate(()=>generateAiJournalEssay());
    assert.equal(await page.locator('#ai-draft-review-original').textContent(),'AI에 맡길 합성 회고 원문');
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('st_trips_v2'))[0].journals[0].text),'AI에 맡길 합성 회고 원문');
    await page.evaluate(()=>approveActiveAiDraft());
    const accepted=await page.evaluate(()=>{const entry=SulsulTravel.TripAdapter.getJournalEntry(getActiveTrip(),0);return {text:entry.text,original:entry.originalText,photos:entry.photos.length,input:document.getElementById('journal-text-input').value};});
    assert.deepEqual(accepted,{text:'합성 AI 회고 승인문',original:'AI에 맡길 합성 회고 원문',photos:3,input:'합성 AI 회고 승인문'});
    await page.evaluate(()=>generateAiJournalEssay());await page.evaluate(()=>approveActiveAiDraft());
    assert.equal(await page.evaluate(()=>SulsulTravel.TripAdapter.getJournalEntry(getActiveTrip(),0).originalText),'AI에 맡길 합성 회고 원문','여러 번 다듬어도 최초 작성 원문 보존');
    const shortened=await page.evaluate(()=>{
      installJournalSafetyFixture();State.activeJournalDay=8;renderJournalTab();document.getElementById('journal-text-input').value='여행 기간 변경 후 첫날에 저장한 회고';
      const saved=saveJournalText();return {day:State.activeJournalDay,saved,text:SulsulTravel.TripAdapter.getJournalEntry(getActiveTrip(),0).text};
    });
    assert.deepEqual(shortened,{day:0,saved:true,text:'여행 기간 변경 후 첫날에 저장한 회고'},'여행 기간이 줄면 유효한 날짜로 보정하여 저장');
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({passed:14,legacyPinned:true,insertAndReorderPreserved:true,writingDraftFollowsDay:true,asyncPhotoFollowsDay:true,overflowByIdentity:true,essayOriginalDate:true,reloadPreserved:true,photoDeleteBoundToTrip:true,reorderedPhotoDeleteBlocked:true,photoDeleteFailureRetry:true,unsavedJournalAiConflict:true,journalAiReviewApply:true,firstOriginalPreserved:true,shortenedTripDaySelection:true}));
    await context.close();
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
