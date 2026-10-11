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
    console.log(JSON.stringify({passed:7,legacyPinned:true,insertAndReorderPreserved:true,writingDraftFollowsDay:true,asyncPhotoFollowsDay:true,overflowByIdentity:true,essayOriginalDate:true,reloadPreserved:true}));
    await context.close();
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
