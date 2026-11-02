/* 누적 사진의 실제 localStorage 한도 실패를 사진 선택·저장 버튼·새 페이지 복원으로 검증한다. */
'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.local-review','expense-photo-quota');
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(data);});
});
(async()=>{
  fs.mkdirSync(out,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  try{
    const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,serviceWorkers:'block'}),errors=[];
    await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
    await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>window.SulsulShell?.started===true);
    await page.addStyleTag({content:'*,*::before,*::after{transition:none!important;animation:none!important;scroll-behavior:auto!important}'});
    const baseline=await page.evaluate(()=>{
      const canvas=document.createElement('canvas');canvas.width=800;canvas.height=600;const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(800,600);let seed=171;
      for(let index=0;index<pixels.data.length;index+=4){seed=(Math.imul(seed,1664525)+1013904223)|0;pixels.data[index]=seed>>>24;pixels.data[index+1]=seed>>>16;pixels.data[index+2]=seed>>>8;pixels.data[index+3]=255;}
      ctx.putImageData(pixels,0,0);window.syntheticQuotaCanvas=canvas;const photo=canvas.toDataURL('image/jpeg',.8);
      const trips=Array.from({length:4},(_,trip)=>({id:'quota-trip-'+trip,title:'합성 누적 사진 여행 '+trip,revision:0,currency:'KRW',budget:100000,initialBalances:{KRW:100000},activeCurrencies:['KRW'],countries:['대한민국'],cities:['서울'],startDate:'2030-05-01',endDate:'2030-06-14',days:Array.from({length:45},(_,day)=>({id:`quota-day-${trip}-${day}`,dayNum:day+1,title:'합성 하루',date:new Date(Date.UTC(2030,4,day+1)).toISOString().slice(0,10),city:'서울',spots:Array.from({length:8},(_,spot)=>({id:`quota-spot-${trip}-${day}-${spot}`,title:'합성 일정',time:'09:00',cat:'tour'}))})),journals:{},expenses:trip?[]:Array.from({length:4},(_,index)=>({id:'quota-expense-'+index,title:'가상 물건 '+index,amount:1000,curr:'KRW',krw:1000,date:'2030-05-01',time:'09:00',cat:'shopping',type:'expense',photos:[photo,photo,photo,photo],primaryPhotoIndex:0})),checklist:[]}));
      State.trips=TripRepository.saveAll(trips);State.activeTripId=trips[0].id;switchView('workspace');switchTab('expenses');
      const raw=localStorage.getItem('st_trips_v2'),over=JSON.parse(JSON.stringify(State.trips));over[0].expenses[0].photos.push(photo,photo,photo,photo);
      let originalQuotaFailed=false;
      try{localStorage.setItem('st_trips_v2',JSON.stringify(over));}catch(error){originalQuotaFailed=error.name==='QuotaExceededError';}
      finally{if(localStorage.getItem('st_trips_v2')!==raw)localStorage.setItem('st_trips_v2',raw);}
      return {initialChars:raw.length,fullTwentyChars:JSON.stringify(over).length,originalQuotaFailed,photoChars:photo.length,initialPhotoCount:State.trips[0].expenses.reduce((sum,expense)=>sum+expense.photos.length,0)};
    });
    assert.equal(baseline.initialPhotoCount,16);assert.equal(baseline.originalQuotaFailed,true);
    await page.locator('.expense-entry-open').first().click();
    const png=await page.evaluate(()=>window.syntheticQuotaCanvas.toDataURL('image/png'));
    const buffer=Buffer.from(png.split(',')[1],'base64');
    await page.locator('#exp-photo-file-input').setInputFiles(Array.from({length:4},(_,index)=>({name:`합성추가-${index+1}.png`,mimeType:'image/png',buffer})));
    await page.waitForFunction(()=>ExpenseFormState.photos.length===8&&!ExpenseFormState.photosLoading);
    await page.locator('#exp-photos-list .expense-photo-tile').last().locator('.expense-primary').click();
    const save=page.locator('#exp-form-submit-btn');await save.click();
    await page.waitForFunction(()=>document.getElementById('modal-expense').classList.contains('sheet-closed'));
    const saved=await page.evaluate(()=>{
      const trip=State.trips.find(item=>item.id==='quota-trip-0'),raw=localStorage.getItem('st_trips_v2'),stored=JSON.parse(raw).find(item=>item.id===trip.id);
      return {photoCount:trip.expenses.reduce((sum,expense)=>sum+expense.photos.length,0),primary:trip.expenses[0].primaryPhotoIndex,rawChars:raw.length,storedPhotos:stored.expenses.reduce((sum,expense)=>sum+expense.photos.length,0),archives:stored.expenses.filter(expense=>expense.expensePhotoArchive).length,days:trip.days.length,otherTripTitles:State.trips.slice(1).map(item=>item.title)};
    });
    assert.equal(saved.photoCount,20);assert.equal(saved.primary,7);assert.equal(saved.storedPhotos,0);assert.equal(saved.archives,4);assert.equal(saved.days,45);assert.ok(saved.rawChars<baseline.initialChars/10);
    const geometry=await page.locator('.expense-entry').first().evaluate(card=>{const image=card.querySelector('img'),rect=image.getBoundingClientRect(),parent=card.getBoundingClientRect();return {width:rect.width,height:rect.height,contained:rect.left>=parent.left&&rect.right<=parent.right};});
    assert.deepEqual(geometry,{width:56,height:56,contained:true});
    await page.screenshot({path:path.join(out,'saved-390.png'),fullPage:false});
    const before=await page.evaluate(()=>State.trips);
    await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.SulsulShell?.started===true);
    // 시작 화면은 여행 최신순으로 표시한다. 개별 여행 문서는 안정 ID로 모두 대조한다.
    const byId=trips=>[...trips].sort((a,b)=>a.id.localeCompare(b.id));
    assert.deepEqual(byId(await page.evaluate(()=>State.trips)),byId(before));
    const standalone=await page.evaluate(()=>{
      const created=SulsulTravel.TravelBackup.create(State.trips,[],APP_VER),trips=SulsulTravel.TravelBackup.parse(created.json).trips,trip=trips.find(item=>item.id==='quota-trip-0');
      return {json:created.json,photos:trip.expenses.reduce((sum,expense)=>sum+expense.photos.length,0),refInFile:created.json.includes('expensePhotoArchive'),primary:trip.expenses[0].primaryPhotoIndex};
    });
    assert.equal(standalone.photos,20);assert.equal(standalone.refInFile,false);assert.equal(standalone.primary,7);
    const separate=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});await separate.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
    const other=await separate.newPage();other.on('pageerror',error=>errors.push(error.message));
    await other.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'networkidle'});await other.waitForFunction(()=>window.SulsulShell?.started===true);
    const read=await other.evaluate(json=>{const trips=SulsulTravel.TravelBackup.parse(json).trips;return {photos:trips[0].expenses.reduce((sum,expense)=>sum+expense.photos.length,0),primary:trips[0].expenses[0].primaryPhotoIndex,trips:trips.length};},standalone.json);
    assert.deepEqual(read,{photos:20,primary:7,trips:4});await separate.close();
    // 누락 보관본의 부팅은 기본값·큰 계획 ID를 보충하는 렌더에서도 원문을 다시 쓰지 않는다.
    const missingPage=await context.newPage();missingPage.on('pageerror',error=>errors.push(error.message));
    await missingPage.addInitScript(()=>{
      window.expenseBootWrites=0;const original=Storage.prototype.setItem;
      Storage.prototype.setItem=function(key,value){if(key==='st_trips_v2')window.expenseBootWrites++;return original.call(this,key,value);};
    });
    await missingPage.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'networkidle'});await missingPage.waitForFunction(()=>window.SulsulShell?.started===true);
    const missingRaw=JSON.stringify([{id:'missing-expense-synthetic',title:'합성 누락 사진 여행',days:[{id:'missing-day',title:'합성 하루',spots:[]}],expenses:[{id:'missing-expense',title:'가상 물건',photos:[],expensePhotoArchive:{id:'not-stored-synthetic',count:1,hash:'1:abc'}}],journals:{0:{text:'누락 사진과 별개로 보존할 합성 원문',photos:[]}}}]);
    await missingPage.evaluate(raw=>localStorage.setItem('st_trips_v2',raw),missingRaw);
    await missingPage.reload({waitUntil:'networkidle'});await missingPage.waitForFunction(()=>window.SulsulShell?.started===true);
    const missing=await missingPage.evaluate(raw=>{
      let backupBlocked=false;try{SulsulTravel.TravelBackup.create(State.trips);}catch(_){backupBlocked=true;}
      return {rawPreserved:localStorage.getItem('st_trips_v2')===raw,writes:window.expenseBootWrites,missing:SulsulTravel.expensePhotoRepository.missingReferences().length,tripVisible:State.trips[0].title==='합성 누락 사진 여행',recordPreserved:State.trips[0].journals[0].text==='누락 사진과 별개로 보존할 합성 원문',notCorrupt:!State.storageRecovery,backupBlocked};
    },missingRaw);
    assert.deepEqual(missing,{rawPreserved:true,writes:0,missing:1,tripVisible:true,recordPreserved:true,notCorrupt:true,backupBlocked:true});
    assert.deepEqual(errors,[]);const result={passed:true,baseline,saved,actualFileInput:true,actualSaveButton:true,freshPageHydration:true,independentBackup:true,missingArchiveBoot:missing,runtimeErrors:errors};fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
