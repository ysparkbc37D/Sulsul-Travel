/* 격리된 합성 여행과 모의 GitHub 응답으로 실제 저장·복원 경계를 확인한다. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),output=path.join(root,'.local-review','structural-reliability');
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,content)=>{if(error){res.writeHead(404).end();return;}res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');res.end(content);});
});
const fixture=()=>({id:'structural-trip',title:'구조 검증 가상 여행',startDate:'2030-05-10',endDate:'2030-05-11',revision:0,currency:'KRW',activeCurrencies:['KRW'],countries:['대한민국'],cities:['서울'],budget:10000,planBlockMeta:{block:{title:'합성 거점',place:'서울',notes:'예약 확인'}},days:[{id:'stable-day-1',dayNum:1,date:'2030-05-10',city:'서울',title:'첫 합성 하루',planBlockId:'block',spots:[{id:'spot-1',title:'공원 산책',time:'10:00',cat:'tour',desc:'보존할 설명'},{id:'spot-2',title:'차 한 잔',time:'11:00',cat:'beverage',desc:'둘째 일정'}]},{id:'stable-day-2',dayNum:2,date:'2030-05-11',city:'서울',title:'둘째 합성 하루',planBlockId:'block',spots:[]}],journals:{0:{text:'먼저 저장한 합성 원문',originalText:'내 합성 원문',photos:[]}},expenses:[{id:'expense-1',title:'합성 차',amount:3000,curr:'KRW',currency:'KRW',krw:3000,cat:'beverage',date:'2030-05-10'}],checklist:[]});
(async()=>{
  fs.mkdirSync(output,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})}),results=[];
  const origin='http://127.0.0.1:'+server.address().port;
  try{
    async function check(name,operation,{init}={}){
      const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,serviceWorkers:'block'}),page=await context.newPage(),errors=[],dialogs=[];
      page.setDefaultTimeout(10000);page.on('pageerror',error=>errors.push(error.message));
      page.on('dialog',async dialog=>{dialogs.push({type:dialog.type(),message:dialog.message()});await dialog.accept();});
      await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
      if(init)await page.addInitScript(init);
      try{
        await page.goto(origin+'/',{waitUntil:'networkidle'});await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}'});
        const api={page,context,errors,dialogs,
          async seed(trip=fixture()){return page.evaluate(trip=>{State.trips=TripRepository.saveAll([trip]);State.activeTripId=trip.id;State.activeJournalDay=0;switchView('workspace');switchTab('journal');renderJournalTab();return State.trips;},trip);},
          async state(){return page.evaluate(()=>({trips:State.trips,stored:localStorage.getItem('st_trips_v2')}));},
          async quota(value){return page.evaluate(value=>{if(value){window.structuralSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='st_trips_v2')throw new DOMException('synthetic quota','QuotaExceededError');return structuralSetItem.call(this,key,value);};}else Storage.prototype.setItem=structuralSetItem;},value);},
          async gistSettings(){await page.evaluate(()=>openSettingsModal('ai'));await page.locator('#cfg-github-pat').fill('synthetic-test-token');await page.locator('#cfg-github-gist').fill('synthetic-gist-id');},
          async saveJournal(text){await page.locator('#journal-text-input').fill(text);await page.locator('button[onclick="saveJournalText()"]').tap();},
          async assertDialogOpen(){assert.equal(await page.locator('#modal-confirm-delete').evaluate(element=>element.classList.contains('sheet-closed')),false);}
        };
        const details=await operation(api);assert.deepEqual(errors,[]);results.push({name,passed:true,details});
      }catch(error){results.push({name,passed:false,error:error.stack||error.message,errors});await page.screenshot({path:path.join(output,'failure-'+results.length+'.png')}).catch(()=>{});}
      finally{await context.close();}
    }
    await check('실제 두 탭의 오래된 전체 저장은 새 일기를 덮지 못한다',async api=>{
      await api.seed();const second=await api.context.newPage();second.on('pageerror',error=>api.errors.push(error.message));await second.goto(origin+'/',{waitUntil:'networkidle'});
      await second.evaluate(()=>{State.activeTripId='structural-trip';});
      await api.saveJournal('첫 번째 탭에서 새로 확정한 원문');
      const latest=await api.state(),result=await second.evaluate(()=>{
        State.trips[0].title='오래된 두 번째 탭의 제목';const saved=saveTrips();let errorCode=null;
        try{TripRepository.saveAll(State.trips);}catch(error){errorCode=error.code;}
        return {saved,errorCode,stored:localStorage.getItem('st_trips_v2')};
      });
      assert.equal(result.saved,false);assert.equal(result.errorCode,'STORAGE_CONFLICT');assert.equal(result.stored,latest.stored);
      assert.equal(JSON.parse(result.stored)[0].journals[0].text,'첫 번째 탭에서 새로 확정한 원문');await second.close();
      return {twoRealTabs:true,staleWriteRejected:true,newJournalPreserved:true};
    });
    await check('손상된 환율 JSON도 앱과 실제 백업 버튼을 중단시키지 않고 원문을 보관한다',async api=>{
      const state=await api.page.evaluate(()=>({defined:typeof State!=='undefined',rates:State.liveRates,custom:State.customRates,backups:Object.keys(localStorage).filter(key=>key.startsWith('st_live_rates_corrupt_')).map(key=>localStorage.getItem(key))}));
      assert.equal(state.defined,true);assert.deepEqual(state.rates,{});assert.deepEqual(state.custom,{});assert.ok(state.backups.includes('{synthetic-broken-rates'));
      await api.page.evaluate(()=>openSettingsModal('data'));await api.page.locator('#panel-settings-data').getByText('JSON 백업',{exact:true}).tap();
      await api.page.waitForFunction(()=>document.getElementById('backup-file-save')?.getAttribute('href')?.startsWith('blob:'));
      assert.equal(await api.page.locator('#backup-file-save').isVisible(),true);return {bootAvailable:true,corruptSourcePreserved:true,backupFileReady:true};
    },{init:()=>{localStorage.setItem('st_live_rates','{synthetic-broken-rates');localStorage.setItem('st_custom_rates','{"KRW":0}');}});
    for(const type of ['expense','spot'])await check(`${type==='expense'?'지출':'일정'} 실제 삭제 확인에서 저장 실패 시 원본과 팝업을 유지하고 재시도한다`,async api=>{
      await api.seed();const before=await api.state();await api.quota(true);
      await api.page.evaluate(type=>type==='expense'?requestDeleteExpense(0):requestDeleteSpot(0,0),type);await api.page.locator('#confirm-delete-btn').tap();
      assert.deepEqual(await api.state(),before);await api.assertDialogOpen();await api.quota(false);await api.page.locator('#confirm-delete-btn').tap();
      await api.page.waitForFunction(()=>document.getElementById('modal-confirm-delete').classList.contains('sheet-closed'));
      const after=await api.state();assert.equal(type==='expense'?after.trips[0].expenses.length:after.trips[0].days[0].spots.length,type==='expense'?0:1);
      assert.equal(JSON.parse(after.stored)[0].revision,before.trips[0].revision+1);return {failedDeleteAtomic:true,dialogRetained:true,retryCommittedOnce:true};
    });
    await check('실제 일정 편집 폼은 저장 실패에서 입력과 원본을 보존하고 같은 폼으로 재시도한다',async api=>{
      await api.seed();const before=await api.state();await api.page.evaluate(()=>openEditSpotModal(0,0));
      await api.page.locator('#spot-form-title').fill('재시도할 합성 일정');await api.page.locator('#spot-form-memo').fill('실패해도 잃지 않을 편집 메모');
      await api.quota(true);await api.page.locator('#spot-form-submit-btn').tap();assert.deepEqual(await api.state(),before);
      assert.equal(await api.page.locator('#modal-spot').evaluate(element=>element.classList.contains('sheet-closed')),false);
      assert.equal(await api.page.locator('#spot-form-title').inputValue(),'재시도할 합성 일정');assert.equal(await api.page.locator('#spot-form-memo').inputValue(),'실패해도 잃지 않을 편집 메모');
      await api.quota(false);await api.page.locator('#spot-form-submit-btn').tap();await api.page.waitForFunction(()=>document.getElementById('modal-spot').classList.contains('sheet-closed'));
      const after=await api.state();assert.equal(after.trips[0].days[0].spots[0].title,'재시도할 합성 일정');assert.equal(after.trips[0].days[0].spots[0].desc,'실패해도 잃지 않을 편집 메모');assert.equal(after.trips[0].revision,before.trips[0].revision+1);
      return {formInputRetained:true,originalUnchangedOnFailure:true,retryCommittedOnce:true};
    });
    await check('모의 Gist 전체 백업은 원문·HTML 텍스트·보관 사진·보조 글을 담고 검토 후 확정 복원한다',async api=>{
      await api.seed();const image=await api.page.evaluate(async()=>{
        const canvas=document.createElement('canvas');canvas.width=120;canvas.height=80;const ctx=canvas.getContext('2d');ctx.fillStyle='#2b6556';ctx.fillRect(0,0,120,80);
        const file=new File([await new Promise(resolve=>canvas.toBlob(resolve))],'synthetic-photo.png',{type:'image/png'}),photo=await SulsulTravel.mediaRepository.prepare(file,{tripId:'structural-trip'}),trip=structuredClone(getActiveTrip());
        trip.journals[0]={...trip.journals[0],text:'기존 <b>합성 글</b><br>x < y',originalText:'처음 쓴 <b>원문</b>',photos:[],mediaIds:[photo.mediaId],photoThumbnails:[photo.thumbnail]};
        trip.expenses[0].photos=[photo.source];State.trips=TripRepository.saveAll([trip]);
        await JournalOverflowRepository.save({tripId:trip.id,dayIndex:0,dayId:trip.days[0].id,date:trip.days[0].date,revision:9,journal:{text:'IndexedDB 최신 <b>회고</b><br>x < y',originalText:'처음 쓴 <b>원문</b>'}});
        return photo.source;
      });
      let exported;await api.page.route('https://api.github.com/gists**',async route=>{
        if(route.request().method()==='GET')await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:'synthetic-gist-id',files:{'sulsul_travel_data.json':{content:JSON.stringify(exported)}}})});
        else{const body=route.request().postDataJSON();assert.equal(body.public,false);exported=JSON.parse(body.files['sulsul_travel_data.json'].content);await route.fulfill({status:200,contentType:'application/json',body:'{"id":"synthetic-gist-id"}'});}
      });
      await api.gistSettings();await api.page.locator('#btn-gist-push').tap();await api.page.waitForFunction(()=>!document.getElementById('btn-gist-push').disabled);
      assert.ok(exported);assert.equal(exported.format,'sulsul-backup');assert.equal(exported.schemaVersion,1);assert.equal(exported.trips[0].journals[0].text,'IndexedDB 최신 <b>회고</b><br>x < y');assert.equal(exported.trips[0].journals[0].originalText,'처음 쓴 <b>원문</b>');assert.equal(exported.trips[0].journals[0].photos[0],image);assert.equal(exported.trips[0].expenses[0].photos[0],image);assert.equal(JSON.stringify(exported).includes('synthetic-test-token'),false);
      const current=fixture();current.id='current-before-gist';current.journals[0].text='Gist 검토 전에 지킬 글';await api.seed(current);const before=await api.state();
      await api.gistSettings();await api.page.locator('#btn-gist-pull').tap();await api.page.waitForFunction(()=>!!TravelBackupUI.pending&&!document.getElementById('backup-restore-apply').disabled);
      assert.deepEqual(await api.state(),before);assert.equal(api.dialogs.filter(dialog=>dialog.type==='confirm').length,0);assert.equal(await api.page.evaluate(()=>TravelBackupUI.pending.source),'gist');
      await api.page.locator('#backup-restore-apply').tap();await api.page.waitForFunction(()=>!TravelBackupUI.busy&&State.trips[0]?.id==='structural-trip');
      const restored=(await api.state()).trips[0];assert.equal(restored.journals[0].text,exported.trips[0].journals[0].text);assert.equal(restored.journals[0].originalText,exported.trips[0].journals[0].originalText);assert.equal(restored.journals[0].photos[0],image);assert.equal(restored.expenses[0].photos[0],image);assert.equal(api.dialogs.filter(dialog=>dialog.type==='confirm').length,1);
      assert.equal(await api.page.evaluate(async()=>(await JournalOverflowRepository.loadAll()).length),0);await api.page.reload({waitUntil:'networkidle'});
      assert.equal((await api.state()).trips[0].journals[0].text,exported.trips[0].journals[0].text);const size=await api.page.evaluate(async()=>{const img=new Image();img.src=State.trips[0].journals[0].photos[0];await img.decode();return [img.naturalWidth,img.naturalHeight];});assert.deepEqual(size,[120,80]);
      return {mockOnly:true,fullBackupContract:true,overflowAndBlobExported:true,previewDidNotWrite:true,explicitRestore:true,reloadPreserved:true};
    });
    await check('Gist fetch 대기 중 직접 저장한 새 글은 오래된 원격 복원에 덮이지 않는다',async api=>{
      await api.seed();const backup=await api.page.evaluate(async()=>JSON.parse((await collectTravelBackup()).json));let release,started;
      const called=new Promise(resolve=>{started=resolve;});await api.page.route('https://api.github.com/gists/**',async route=>{started();await new Promise(resolve=>{release=resolve;});await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({files:{'sulsul_travel_data.json':{content:JSON.stringify(backup)}}})});});
      await api.gistSettings();await api.page.evaluate(()=>{window.structuralPullResult=null;const original=syncFromGist;document.getElementById('btn-gist-pull').onclick=()=>original().then(result=>{structuralPullResult=result;});});
      await api.page.locator('#btn-gist-pull').tap();await called;await api.page.evaluate(()=>closeModal('modal-settings',true));
      await api.saveJournal('원격 백업을 읽는 동안 새로 저장한 글');const changed=await api.state();release();await api.page.waitForFunction(()=>structuralPullResult!==null);
      assert.equal(await api.page.evaluate(()=>structuralPullResult),false);assert.deepEqual(await api.state(),changed);assert.equal(await api.page.evaluate(()=>TravelBackupUI.pending),null);
      assert.ok(api.dialogs.some(dialog=>dialog.type==='alert'&&dialog.message.includes('변경')));assert.equal(api.dialogs.filter(dialog=>dialog.type==='confirm').length,0);
      assert.equal(JSON.parse(changed.stored)[0].journals[0].text,'원격 백업을 읽는 동안 새로 저장한 글');return {fetchDelayed:true,newJournalSaved:true,staleRestoreRejected:true};
    });
    console.log(JSON.stringify({passed:results.every(result=>result.passed),results},null,2));assert.ok(results.every(result=>result.passed),'구조 저장 경계 회귀 검사 실패');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>server.close());
