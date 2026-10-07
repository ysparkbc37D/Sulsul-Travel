/* 격리된 브라우저에서 실제 저장/사진 비율/AI 승인/새로고침·JSON 복원을 검사한다. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),output=path.join(root,'.local-review','moment-journal');
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(data);});
});
(async()=>{
 fs.mkdirSync(output,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
  page.setDefaultTimeout(10000);page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'networkidle'});
  await page.evaluate(()=>{
   window.alert=()=>{};window.confirm=()=>true;document.querySelectorAll('.sheet-container').forEach(element=>element.classList.add('sheet-closed'));
   State.trips=[{id:'moment-test',title:'순간을 남기는 여행',startDate:'2026-10-07',endDate:'2026-10-08',countries:['대한민국'],cities:['서울'],currency:'KRW',budget:0,timeZone:'Asia/Seoul',journals:{0:{text:'기존 하루 회고',photos:[]}},activityRecords:{old:{id:'old',text:'기존 일정 기록',photos:[],coverIndex:0,context:{title:'카페',date:'2026-10-07',time:'12:00',city:'서울'}}},expenses:[],checklist:[],days:[{dayNum:1,date:'2026-10-07',city:'서울',title:'첫날',spots:[{id:'spot-one',recordId:'old',time:'12:00',title:'카페',completed:false}]},{dayNum:2,date:'2026-10-08',city:'서울',title:'둘째 날',spots:[]}]}];State.activeTripId='moment-test';State.activeJournalDay=0;saveTrips();switchView('workspace');setTheme('modern');switchTab('journal');
   window.originalJournals=JSON.stringify(getActiveTrip().journals);window.originalActivities=JSON.stringify(getActiveTrip().activityRecords);openMomentJournal(0);
  });
  assert.equal(await page.locator('#moment-record-visibility').inputValue(),'private');
  await page.locator('#moment-record-text').fill('따뜻한 아침 햇살');await page.locator('#moment-record-time').fill('09:00');
  assert.equal(await page.evaluate(()=>saveMomentRecord()),true);
  await page.evaluate(()=>{window.firstMomentId=State.momentRecordEditor.entryId;closeMomentJournal(true);});
  await page.waitForTimeout(150);
  await page.evaluate(()=>openMomentJournal(0));
  await page.locator('#moment-record-visibility').selectOption('shared');
  const photos=await page.evaluate(async()=>{
   const files=[];for(const [width,height,color] of [[3200,1800,'#c59a5c'],[1800,3200,'#517c66']]){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.getContext('2d').fillStyle=color;canvas.getContext('2d').fillRect(0,0,width,height);const blob=await new Promise(resolve=>canvas.toBlob(resolve));files.push(new File([blob],'moment.png',{type:'image/png'}));}
   document.getElementById('moment-record-time').value='21:00';await addMomentPhotos({target:{files,value:'moment.png'}});setMomentCover(1);const ok=saveMomentRecord();window.secondMomentId=State.momentRecordEditor.entryId;
   const entry=momentEntries(getActiveTrip()).find(item=>item.id===secondMomentId),sizes=[];
   for(const source of [...entry.photos,...entry.photoThumbnails]){const img=new Image();img.src=source;await img.decode();sizes.push([img.width,img.height]);}
   const media=await SulsulTravel.mediaRepository.get(entry.mediaIds[0]);
   return {ok,count:momentEntries(getActiveTrip()).length,sizes,cover:entry.coverIndex,blob:media.original instanceof Blob,thumbnail:media.thumbnail instanceof Blob,linked:entry.activityLink,visibility:entry.visibility,completed:getActiveTrip().days[0].spots[0].completed,journals:JSON.stringify(getActiveTrip().journals)===originalJournals,activities:JSON.stringify(getActiveTrip().activityRecords)===originalActivities};
  });
  assert.deepEqual(photos,{ok:true,count:2,sizes:[[1600,900],[900,1600],[448,252],[252,448]],cover:1,blob:true,thumbnail:true,linked:null,visibility:'shared',completed:false,journals:true,activities:true});
  const failure=await page.evaluate(()=>{
   const old=Storage.prototype.setItem,original=momentEntries(getActiveTrip()).find(item=>item.id===secondMomentId).text;document.getElementById('moment-record-text').value='저장 실패에도 남길 원문';rememberMomentDraft();
   Storage.prototype.setItem=function(key,value){if(key==='st_trips_v2')throw new DOMException('quota','QuotaExceededError');return old.call(this,key,value);};let ok;try{ok=saveMomentRecord();}finally{Storage.prototype.setItem=old;}
   return {ok,original,persisted:JSON.parse(localStorage.getItem('st_trips_v2'))[0].momentEntries.find(item=>item.id===secondMomentId).text,memory:momentEntries(getActiveTrip()).find(item=>item.id===secondMomentId).text,draft:document.getElementById('moment-record-text').value,retry:saveMomentRecord()};
  });assert.equal(failure.ok,false);assert.equal(failure.persisted,failure.original);assert.equal(failure.memory,failure.original);assert.equal(failure.draft,'저장 실패에도 남길 원문');assert.equal(failure.retry,true);
  const scopeDirty=await page.evaluate(()=>{
   document.getElementById('moment-record-visibility').value='private';rememberMomentDraft();window.confirm=()=>false;const closed=closeMomentJournal();const dirty=momentEditorDirty();window.confirm=()=>true;const saved=saveMomentRecord(),privateSaved=momentEntries(getActiveTrip()).find(entry=>entry.id===secondMomentId).visibility;document.getElementById('moment-record-visibility').value='shared';saveMomentRecord();return {closed,dirty,saved,privateSaved};
  });assert.deepEqual(scopeDirty,{closed:false,dirty:true,saved:true,privateSaved:'private'});
  for(const width of [320,360,390,430]){
   await page.setViewportSize({width,height:740});const geometry=await page.evaluate(()=>{const box=document.querySelector('.moment-sheet').getBoundingClientRect(),footer=document.querySelector('.moment-sheet-footer').getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth,contained:box.left>=0&&box.right<=innerWidth+1,footer:footer.bottom<=innerHeight+1};});assert.deepEqual(geometry,{overflow:false,contained:true,footer:true});
  }
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(output,'moment-editor.png')});
  await page.evaluate(()=>viewMomentPhoto(0));await page.waitForFunction(()=>document.getElementById('moment-record-full-photo').complete);
  assert.equal(await page.locator('#moment-record-full-photo').evaluate(element=>getComputedStyle(element).objectFit),'contain');
  await page.keyboard.press('Escape');assert.equal(await page.locator('#moment-record-viewer').isVisible(),false);
  await page.evaluate(()=>{window.confirm=()=>false;document.getElementById('moment-record-text').value='닫지 않고 보존할 초안';rememberMomentDraft();closeMomentJournal();});
  assert.equal(await page.locator('#modal-moment-record').isVisible(),true);
  await page.evaluate(()=>history.back());await page.waitForTimeout(100);assert.equal(await page.locator('#modal-moment-record').isVisible(),true);assert.equal(await page.locator('#moment-record-text').inputValue(),'닫지 않고 보존할 초안');
  await page.evaluate(()=>{window.confirm=()=>true;saveMomentRecord();closeMomentJournal(true);});await page.waitForTimeout(150);
  await page.evaluate(()=>openMomentJournal(0,firstMomentId));await page.locator('#moment-record-link').selectOption('0:0');assert.equal(await page.evaluate(()=>saveMomentRecord()),true);
  await page.evaluate(async()=>{callGeminiApiWithFallback=async()=> '햇살이 아침을 따뜻하게 감쌌다.';await generateMomentEssay();});
  assert.equal(await page.evaluate(()=>momentEntries(getActiveTrip()).find(item=>item.id===firstMomentId).text),'따뜻한 아침 햇살');
  assert.equal(await page.locator('#modal-ai-draft-review').isVisible(),true);await page.locator('#btn-apply-ai-draft').click();
  const ai=await page.evaluate(()=>momentEntries(getActiveTrip()).find(item=>item.id===firstMomentId));assert.equal(ai.text,'햇살이 아침을 따뜻하게 감쌌다.');assert.equal(ai.originalText,'따뜻한 아침 햇살');assert.equal(ai.activityLink.spotId,'spot-one');
  const failedAi=await page.evaluate(async()=>{
   callGeminiApiWithFallback=async()=> '다시 다듬은 아침의 문장';await generateMomentEssay();const old=Storage.prototype.setItem;
   Storage.prototype.setItem=function(key,value){if(key==='st_trips_v2')throw new DOMException('quota','QuotaExceededError');return old.call(this,key,value);};try{await approveActiveAiDraft();}finally{Storage.prototype.setItem=old;}
   const job=(await getAiOrchestrator()).get(State.activeAiJobId);return {state:job.state,error:job.errorCode,text:momentEntries(getActiveTrip()).find(item=>item.id===firstMomentId).text};
  });assert.deepEqual(failedAi,{state:'awaiting_review',error:'APPLY_FAILED',text:ai.text});
  await page.evaluate(()=>approveActiveAiDraft());assert.equal(await page.locator('#moment-record-text').inputValue(),'다시 다듬은 아침의 문장');assert.equal(await page.evaluate(()=>momentEntries(getActiveTrip()).find(item=>item.id===firstMomentId).originalText),'따뜻한 아침 햇살');
  await page.evaluate(async()=>{await generateMomentEssay();document.getElementById('moment-record-text').value='AI 생성 뒤 내가 고친 글';rememberMomentDraft();await approveActiveAiDraft();});assert.ok((await page.locator('#ai-draft-review-status').textContent()).includes('원본이 변경'));assert.equal(await page.locator('#moment-record-text').inputValue(),'AI 생성 뒤 내가 고친 글');
  await page.evaluate(()=>{closeModal('modal-ai-draft-review',true);saveMomentRecord();closeMomentJournal(true);});await page.waitForTimeout(150);
  const backup=await page.evaluate(()=>{const api=SulsulTravel.TripTransfer,trip=getActiveTrip();window.momentBackup=JSON.stringify(api.create(trip,{journals:true}));return {private:api.create(trip).trip.momentEntries,restored:api.parse(momentBackup).trip.momentEntries.length,visibility:api.parse(momentBackup).trip.momentEntries.map(entry=>entry.visibility),feed:momentFeedEntries(trip,0).map(item=>item.time),photos:api.parse(momentBackup).trip.momentEntries.find(item=>item.id===secondMomentId).photos.length};});
  assert.deepEqual(backup.private,[]);assert.equal(backup.restored,2);assert.deepEqual(backup.visibility,['private','shared']);assert.deepEqual(backup.feed,['09:00','12:00','21:00']);assert.equal(backup.photos,2);
  await page.evaluate(()=>{window.beforeReloadPhotos=JSON.stringify(momentEntries(getActiveTrip()).map(entry=>entry.photos));});const expected=await page.evaluate(()=>({entries:getActiveTrip().momentEntries,journals:getActiveTrip().journals,activity:getActiveTrip().activityRecords}));
  await page.reload({waitUntil:'networkidle'});assert.deepEqual(await page.evaluate(()=>{const trip=State.trips.find(item=>item.id==='moment-test');return {entries:trip.momentEntries,journals:trip.journals,activity:trip.activityRecords};}),expected);
  const restore=await page.evaluate(async()=>{
   const trip=State.trips.find(item=>item.id==='moment-test'),copy=SulsulTravel.TripTransfer.parse(JSON.stringify(SulsulTravel.TripTransfer.create(trip,{journals:true}))).trip;copy.id='moment-restored';copy.momentEntries.forEach(entry=>entry.mediaIds=[]);State.trips=TripRepository.saveAll([...State.trips,copy]);State.activeTripId=copy.id;State.activeJournalDay=0;switchView('workspace');switchTab('journal');openMomentJournal(0,copy.momentEntries[1].id);await viewMomentPhoto(1);const image=document.getElementById('moment-record-full-photo');await image.decode();return {width:image.naturalWidth,height:image.naturalHeight,source:image.src.startsWith('data:image'),count:momentEntries(getActiveTrip()).length,visibility:document.getElementById('moment-record-visibility').value};
  });assert.deepEqual(restore,{width:900,height:1600,source:true,count:2,visibility:'shared'});
  const failedDelete=await page.evaluate(()=>{
   const old=Storage.prototype.setItem,before=JSON.stringify(getActiveTrip().momentEntries);window.confirm=()=>true;Storage.prototype.setItem=function(key,value){if(key==='st_trips_v2')throw new DOMException('quota','QuotaExceededError');return old.call(this,key,value);};let ok;try{ok=deleteMomentRecord();}finally{Storage.prototype.setItem=old;}return {ok,unchanged:JSON.stringify(getActiveTrip().momentEntries)===before,draft:!!State.momentRecordEditor};
  });assert.deepEqual(failedDelete,{ok:false,unchanged:true,draft:true});
  const deleted=await page.evaluate(()=>{window.confirm=()=>false;const denied=deleteMomentRecord();window.confirm=()=>true;const ok=deleteMomentRecord();return {denied,ok,count:momentEntries(getActiveTrip()).length,journal:getActiveTrip().journals[0].text,activity:getActiveTrip().activityRecords.old.text};});assert.deepEqual(deleted,{denied:false,ok:true,count:1,journal:'기존 하루 회고',activity:'기존 일정 기록'});
  const dailyFailure=await page.evaluate(async()=>{
   State.activeJournalDay=0;renderJournalTab();document.getElementById('journal-text-input').value='사진 실패에도 보존할 하루 회고';rememberJournalDraft();
   const canvas=document.createElement('canvas');canvas.width=2400;canvas.height=1200;canvas.getContext('2d').fillRect(0,0,2400,1200);const file=new File([await new Promise(resolve=>canvas.toBlob(resolve))],'daily.png',{type:'image/png'}),old=Storage.prototype.setItem,id=getActiveTrip().id;
   Storage.prototype.setItem=function(key,value){if(key==='st_trips_v2')throw new DOMException('quota','QuotaExceededError');return old.call(this,key,value);};try{await handleJournalPhotoUpload({target:{files:[file],value:'daily.png'}});}finally{Storage.prototype.setItem=old;}
   const pending=State.journalPhotoDrafts[`${id}:0`],image=new Image();image.src=pending.photos[0].source;await image.decode();const original=getActiveTrip().journals[0].text,persisted=JSON.parse(localStorage.getItem('st_trips_v2')).find(trip=>trip.id===id).journals[0].text;
   selectJournalDay(1);selectJournalDay(0);return {pending:pending.photos.length,size:[image.width,image.height],original,persisted,draft:document.getElementById('journal-text-input').value,visible:document.querySelectorAll('.journal-photo-pending img').length};
  });assert.deepEqual(dailyFailure,{pending:1,size:[1600,800],original:'기존 하루 회고',persisted:'기존 하루 회고',draft:'사진 실패에도 보존할 하루 회고',visible:1});
  const dailySaved=await page.evaluate(()=>{const id=getActiveTrip().id,ok=saveJournalPhotoDraft(id,0),trip=getActiveTrip();window.dailyPhotoBackup=JSON.stringify(SulsulTravel.TripTransfer.create(trip,{journals:true}));return {ok,text:trip.journals[0].text,photos:trip.journals[0].photos.length,thumbs:trip.journals[0].photoThumbnails.length,moments:momentEntries(trip).length,pending:!!State.journalPhotoDrafts[`${id}:0`],backupPhotos:SulsulTravel.TripTransfer.parse(dailyPhotoBackup).trip.journals[0].photos.length};});
  assert.deepEqual(dailySaved,{ok:true,text:'사진 실패에도 보존할 하루 회고',photos:1,thumbs:1,moments:1,pending:false,backupPhotos:1});
  await page.reload({waitUntil:'networkidle'});assert.deepEqual(await page.evaluate(()=>{const trip=State.trips.find(item=>item.id==='moment-restored');return {text:trip.journals[0].text,photos:trip.journals[0].photos.length};}),{text:'사진 실패에도 보존할 하루 회고',photos:1});
  const cleanupSetup=await page.evaluate(async()=>{
   const repo=SulsulTravel.mediaRepository,canvas=document.createElement('canvas');canvas.width=1200;canvas.height=600;canvas.getContext('2d').fillStyle='#985832';canvas.getContext('2d').fillRect(0,0,1200,600);const file=new File([await new Promise(resolve=>canvas.toBlob(resolve))],'cleanup.png',{type:'image/png'});
   const shared=await repo.prepare(file,{tripId:'media-cleanup-owner'}),orphan=await repo.prepare(file,{tripId:'media-cleanup-owner'}),other=await repo.prepare(file,{tripId:'media-cleanup-other'});
   const base=structuredClone(State.trips.find(trip=>trip.id==='moment-test')),entry=structuredClone(base.momentEntries[1]);
   const owner={...structuredClone(base),id:'media-cleanup-owner',title:'사진 원본 여행',journals:{},activityRecords:{},momentEntries:[{...entry,id:'cleanup-moment',photos:[shared.source,orphan.source],photoThumbnails:[shared.thumbnail,orphan.thumbnail],mediaIds:[shared.mediaId,orphan.mediaId],coverIndex:0}]};
   const copy={...structuredClone(base),id:'media-cleanup-copy',title:'같은 사진을 참조하는 사본',momentEntries:[],activityRecords:{},journals:{0:{text:'사본의 사진 원문',photos:[shared.source],photoThumbnails:[shared.thumbnail],mediaIds:[shared.mediaId],coverIndex:0}}};
   State.trips=TripRepository.saveAll([...State.trips,owner,copy]);window.cleanupMedia={shared:shared.mediaId,orphan:orphan.mediaId,other:other.mediaId};window.cleanupBefore=JSON.stringify(State.trips);window.cleanupCalls=[];
   const original=repo.prune.bind(repo);repo.prune=async(...args)=>{cleanupCalls.push(args[1]?.tripId||'*');return original(...args);};
   const stored=await Promise.all(Object.values(cleanupMedia).map(id=>repo.get(id)));return {allStored:stored.every(value=>value.original instanceof Blob&&value.thumbnail instanceof Blob),ids:stored.length};
  });assert.deepEqual(cleanupSetup,{allStored:true,ids:3});
  const deleteStorageFailure=await page.evaluate(async()=>{
   const old=Storage.prototype.setItem;requestDeleteTrip('media-cleanup-owner');Storage.prototype.setItem=function(key,value){if(key==='st_trips_v2')throw new DOMException('quota','QuotaExceededError');return old.call(this,key,value);};try{document.getElementById('confirm-delete-btn').onclick();}finally{Storage.prototype.setItem=old;}
   return {memory:JSON.stringify(State.trips)===cleanupBefore,persisted:localStorage.getItem('st_trips_v2')===cleanupBefore,pruneCalls:cleanupCalls.length,blobs:(await Promise.all(Object.values(cleanupMedia).map(id=>SulsulTravel.mediaRepository.get(id)))).every(Boolean)};
  });assert.deepEqual(deleteStorageFailure,{memory:true,persisted:true,pruneCalls:0,blobs:true});
  await page.waitForTimeout(400);await page.locator('#confirm-delete-btn').click();
  await page.waitForFunction(async()=>!(await SulsulTravel.mediaRepository.get(cleanupMedia.orphan)));
  const scopedCleanup=await page.evaluate(async()=>({removed:!State.trips.some(trip=>trip.id==='media-cleanup-owner'),copy:!!(await SulsulTravel.mediaRepository.get(cleanupMedia.shared)),other:!!(await SulsulTravel.mediaRepository.get(cleanupMedia.other)),calls:cleanupCalls}));
  assert.deepEqual(scopedCleanup,{removed:true,copy:true,other:true,calls:['media-cleanup-owner']});
  const invalidCleanup=await page.evaluate(async()=>{
   const failures=[];for(const [trips,options] of [[null,{}],[State.trips,{tripId:''}]])try{await SulsulTravel.MediaRepository.prototype.prune.call(SulsulTravel.mediaRepository,trips,options);}catch(error){failures.push(error.message);}
   return {failures,blob:!!(await SulsulTravel.mediaRepository.get(cleanupMedia.other))};
  });assert.deepEqual(invalidCleanup,{failures:['INVALID_RETAINED_TRIPS','INVALID_MEDIA_TRIP_ID'],blob:true});
  await page.evaluate(()=>{
   const copy=structuredClone(State.trips.find(trip=>trip.id==='media-cleanup-copy'));copy.journals[0].mediaIds=[];window.cleanupRestoreJson=JSON.stringify({trips:[copy]});window.cleanupRestoreBefore=JSON.stringify(State.trips);window.cleanupOldSetItem=Storage.prototype.setItem;
   Storage.prototype.setItem=function(key,value){if(key==='st_trips_v2')throw new DOMException('quota','QuotaExceededError');return cleanupOldSetItem.call(this,key,value);};window.cleanupRestoreInput={files:[new File([cleanupRestoreJson],'restore.json',{type:'application/json'})],value:'restore.json'};window.confirm=()=>true;importDataFromJson({target:cleanupRestoreInput});
  });
  await page.waitForFunction(()=>cleanupRestoreInput.value==='');
  const restoreStorageFailure=await page.evaluate(async()=>{
   Storage.prototype.setItem=cleanupOldSetItem;return {memory:JSON.stringify(State.trips)===cleanupRestoreBefore,persisted:localStorage.getItem('st_trips_v2')===cleanupRestoreBefore,calls:cleanupCalls.slice(),blobs:(await Promise.all([cleanupMedia.shared,cleanupMedia.other].map(id=>SulsulTravel.mediaRepository.get(id)))).every(Boolean)};
  });assert.deepEqual(restoreStorageFailure,{memory:true,persisted:true,calls:['media-cleanup-owner'],blobs:true});
  await page.evaluate(()=>{cleanupRestoreInput={files:[new File([cleanupRestoreJson],'restore.json',{type:'application/json'})],value:'restore.json'};importDataFromJson({target:cleanupRestoreInput});});
  await page.waitForFunction(()=>cleanupRestoreInput.value==='');await page.waitForFunction(async()=>!(await SulsulTravel.mediaRepository.get(cleanupMedia.shared))&&!(await SulsulTravel.mediaRepository.get(cleanupMedia.other)));
  const fullCleanup=await page.evaluate(async()=>{
   const record=State.trips[0].journals[0],photo=await SulsulTravel.mediaRepository.resolve({...record,mediaIds:[cleanupMedia.shared]}),image=new Image();image.src=photo;await image.decode();return {trips:State.trips.map(trip=>trip.id),calls:cleanupCalls,source:photo===record.photos[0],size:[image.naturalWidth,image.naturalHeight],text:record.text,photoCount:record.photos.length};
  });assert.deepEqual(fullCleanup,{trips:['media-cleanup-copy'],calls:['media-cleanup-owner','*'],source:true,size:[1200,600],text:'사본의 사진 원문',photoCount:1});
  await page.reload({waitUntil:'networkidle'});assert.deepEqual(await page.evaluate(()=>{const trip=State.trips.find(value=>value.id==='media-cleanup-copy');return {trip:trip.id,photos:trip.journals[0].photos.length};}),{trip:'media-cleanup-copy',photos:1});
  assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,checks:'같은 날짜 여러 순간, 한줄/사진만, optional 일정 연결, private/shared 공개범위·dirty·JSON복원, 원래 회고/일정 보존, 가로세로 보관비율/별도썸네일/IndexedDB Blob, 순간 및 하루사진 저장실패 재시도·초안보존, AI 승인/원문/충돌, 이탈 방어, 모바일 320~430px, 공유 선택/JSON복원/새로고침, 삭제 확인, 여행삭제 소유 Blob 정리·사본 참조 보존·전체복원 orphan 정리·저장실패 원본 보존·JSON 사진 fallback',errors}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>server.close());
