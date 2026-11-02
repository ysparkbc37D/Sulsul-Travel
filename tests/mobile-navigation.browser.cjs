/* 개인 브라우저 대신 새 프로필에서 실제 history.back과 합성 여행만 검사한다. */
'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),output=path.join(root,'.local-review','mobile-navigation');
const fixture=()=>({id:'navigation-synthetic',title:'가상 뒤로가기 검증',currency:'KRW',activeCurrencies:['KRW'],initialBalances:{KRW:100000},countries:['대한민국'],cities:['서울'],startDate:'2030-05-01',endDate:'2030-05-01',days:[{id:'navigation-day',date:'2030-05-01',city:'서울',title:'가상 첫날',planBlockId:'navigation-block',spots:[{id:'navigation-spot',title:'가상 산책',time:'09:00',cat:'tour'}]}],planBlockMeta:{'navigation-block':{title:'가상 거점',place:'서울'}},expenses:[],journals:{},checklist:[]});
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/before.html'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Previous document</title><h1 id="previous">Previous document</h1>');return;}
  const file=path.resolve(root,'.'+pathname.replace(/\/$/,'/index.html'));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');res.end(data);});
});
(async()=>{
  fs.mkdirSync(output,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`,results=[];
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  try{
    async function check(name,run,{previous=true}={}){
      const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,serviceWorkers:'block'}),page=await context.newPage(),errors=[],dialogs=[];
      let allowConfirm=true;
      page.on('pageerror',error=>errors.push(error.message));
      page.on('dialog',async dialog=>{dialogs.push(dialog.message());if(['confirm','beforeunload'].includes(dialog.type())&&!allowConfirm)await dialog.dismiss();else await dialog.accept();});
      await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
      page.setDefaultTimeout(10000);
      try{
        if(previous)await page.goto(origin+'/before.html');
        await page.goto(origin+'/?navigation-check=1#keep-route',{waitUntil:'networkidle'});
        await page.waitForFunction(()=>window.SulsulShell?.started===true&&SulsulTravel.MobileNavigation.active);
        await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}'});
        const api={page,context,errors,dialogs,setConfirm:value=>{allowConfirm=value;},
          async back(){await page.goBack({waitUntil:'domcontentloaded'});},
          async closed(id){await page.waitForFunction(id=>document.getElementById(id).classList.contains('sheet-closed'),id);},
          async seed(){await page.evaluate(trip=>{State.trips=TripRepository.saveAll([trip]);State.activeTripId=trip.id;switchView('workspace');switchTab('expenses');},fixture());}
        };
        const details=await run(api);assert.deepEqual(errors,[]);results.push({name,passed:true,details});
      }catch(error){results.push({name,passed:false,error:error.stack||error.message,errors});if(!page.isClosed())await page.screenshot({path:path.join(output,`failure-${results.length}.png`)}).catch(()=>{});}
      finally{console.log((results.at(-1).passed?'PASS ':'FAIL ')+name);await context.close();}
    }
    await check('첫 뒤로가기는 종료 확인, 취소·반복·재시작은 한 가드와 URL을 유지',async api=>{
      const {page}=api,url=page.url(),length=await page.evaluate(()=>history.length);
      for(let index=0;index<4;index++){
        await api.back();await page.getByRole('heading',{name:'앱을 종료할까요?'}).waitFor();
        await page.locator('#app-exit-cancel').click();await api.closed('modal-app-exit');
        assert.equal(page.url(),url);assert.equal(await page.evaluate(()=>history.length),length);
      }
      await page.reload({waitUntil:'networkidle'});
      assert.equal(await page.evaluate(()=>history.length),length);assert.equal(page.url(),url);
      assert.equal(await page.evaluate(()=>State.trips.length),0);
      return {exitConfirmation:true,cancelStays:true,repeatedBackNoHistoryGrowth:true,reloadNoDuplicateGuard:true,urlPreserved:true};
    });
    await check('지출 사진→편집창 순으로 닫고 저장중에는 이탈하지 않는다',async api=>{
      const {page}=api;await api.seed();
      await page.evaluate(()=>{openAddExpenseModal();ExpenseFormState.photos=['data:image/png;base64,AAAA'];renderExpensePhotos();viewExpensePhoto(0);});
      await page.evaluate(()=>openModal('modal-settings'));await api.back();await api.closed('modal-settings');
      assert.equal(await page.locator('#expense-photo-viewer').isVisible(),true);
      await api.back();await page.waitForFunction(()=>document.getElementById('expense-photo-viewer').hidden);
      assert.equal(await page.locator('#modal-expense').evaluate(e=>!e.classList.contains('sheet-closed')),true);
      await page.locator('#exp-form-title').fill('보존할 가상 지출');await page.locator('#exp-form-amount').fill('1000');
      api.setConfirm(false);await api.back();await page.waitForFunction(()=>history.state?.stAppNavigation?.kind==='guard');
      assert.equal(await page.locator('#exp-form-title').inputValue(),'보존할 가상 지출');
      assert.equal(await page.locator('#modal-expense').evaluate(e=>!e.classList.contains('sheet-closed')),true);
      api.setConfirm(true);await page.evaluate(()=>{ExpenseFormState.saving=true;});await api.back();
      await page.waitForFunction(()=>history.state?.stAppNavigation?.kind==='guard');
      assert.equal(await page.locator('#modal-expense').evaluate(e=>!e.classList.contains('sheet-closed')),true);
      await page.evaluate(()=>{ExpenseFormState.saving=false;});await api.back();await api.closed('modal-expense');
      assert.equal(api.dialogs.length,2);assert.equal(await page.evaluate(()=>getActiveTrip().expenses.length),0);
      return {photoFirst:true,dirtyCancelPreserved:true,saveInProgressProtected:true,discardNoWrite:true};
    });
    await check('실제로 연 모달 순서로 복귀하고 상세·내 여행 뒤에만 종료 확인',async api=>{
      const {page}=api;await api.seed();
      await page.evaluate(()=>{switchTab('plan');openPlanBlock(0);openModal('modal-settings');openModal('modal-quick-currency');});
      await api.back();await api.closed('modal-quick-currency');
      assert.equal(await page.locator('#modal-settings').evaluate(e=>!e.classList.contains('sheet-closed')),true);
      assert.equal(await page.locator('#plan-block-detail-page').evaluate(e=>!e.classList.contains('hidden')),true);
      await api.back();await api.closed('modal-settings');
      await api.back();await page.waitForFunction(()=>document.getElementById('plan-block-detail-page').classList.contains('hidden'));
      assert.equal(await page.evaluate(()=>State.currentView),'workspace');
      await api.back();await page.waitForFunction(()=>State.currentView==='hub');
      assert.equal(await page.locator('#modal-app-exit').count(),0);
      await api.back();await page.getByRole('heading',{name:'앱을 종료할까요?'}).waitFor();
      return {actualModalStack:true,detailBeforeHub:true,hubBeforeExit:true};
    });
    await check('순간 기록과 일정 기록은 dirty 취소 후 원문을 유지하고 한 번만 닫힌다',async api=>{
      const {page}=api;await api.seed();
      await page.evaluate(()=>openMomentJournal(0));await page.locator('#moment-record-text').fill('가상 순간 초안');
      api.setConfirm(false);await api.back();await page.waitForFunction(()=>history.state?.stAppNavigation?.kind==='guard');
      assert.equal(await page.locator('#moment-record-text').inputValue(),'가상 순간 초안');
      api.setConfirm(true);await api.back();await api.closed('modal-moment-record');
      assert.equal(await page.evaluate(()=>State.currentView),'workspace');
      await page.evaluate(()=>openActivityJournal(0,0));await page.locator('#activity-record-text').fill('가상 일정 초안');
      api.setConfirm(false);await api.back();await page.waitForFunction(()=>history.state?.stAppNavigation?.kind==='guard');
      assert.equal(await page.locator('#activity-record-text').inputValue(),'가상 일정 초안');
      api.setConfirm(true);await api.back();await api.closed('modal-activity-record');
      assert.equal(await page.evaluate(()=>State.currentView),'workspace');assert.equal(api.dialogs.length,4);
      return {momentAndActivityDirtyProtected:true,noDuplicatePopHandling:true};
    });
    await check('백업 복원중 뒤로가기는 작업을 보존하고 취소시 검토 토큰을 폐기',async api=>{
      const {page}=api;await api.seed();
      await page.evaluate(()=>{ensureTravelBackupModal();openModal('modal-travel-backup');TravelBackupUI.busy=true;});
      const token=await page.evaluate(()=>TravelBackupUI.token);await api.back();
      await page.waitForFunction(()=>history.state?.stAppNavigation?.kind==='guard');
      assert.equal(await page.locator('#modal-travel-backup').evaluate(e=>!e.classList.contains('sheet-closed')),true);
      await page.evaluate(()=>{TravelBackupUI.busy=false;});await api.back();await api.closed('modal-travel-backup');
      assert.equal(await page.evaluate(()=>TravelBackupUI.token),token+1);
      return {busyRestoreProtected:true,reviewCancelledThroughOwnBoundary:true};
    });
    await check('새로고침도 작성중 지출과 저장중인 거래를 네이티브 확인으로 보호',async api=>{
      const {page}=api;await api.seed();await page.evaluate(()=>openAddExpenseModal());
      await page.locator('#exp-form-title').click();await page.locator('#exp-form-title').fill('재시작 전 보존할 초안');
      await page.waitForFunction(()=>history.state?.stAppNavigation?.activated===true);
      api.setConfirm(false);
      await page.reload({waitUntil:'domcontentloaded',timeout:3000}).catch(()=>{});
      assert.equal(await page.locator('#exp-form-title').inputValue(),'재시작 전 보존할 초안');
      await page.evaluate(()=>{ExpenseFormState.baseline=expenseFormSnapshot();ExpenseFormState.saving=true;});
      await page.reload({waitUntil:'domcontentloaded',timeout:3000}).catch(()=>{});
      assert.equal(await page.evaluate(()=>ExpenseFormState.saving),true);
      assert.equal(api.dialogs.length,2);
      await page.evaluate(()=>{ExpenseFormState.saving=false;closeModal('modal-expense',true);});
      return {nativeBeforeUnloadDirtyProtected:true,nativeBeforeUnloadSavingProtected:true};
    });
    await check('종료 확인 버튼을 누르면 이전 문서로 한 번만 돌아간다',async api=>{
      const {page}=api;await api.back();await page.locator('#app-exit-confirm').click();
      await page.waitForURL(origin+'/before.html');assert.equal(await page.locator('#previous').textContent(),'Previous document');
      return {confirmedExitReturnedToPreviousDocument:true};
    });
    await check('직접 실행의 종료 확인도 실제 닫기 또는 시작 문서로 복귀한다',async api=>{
      const {page}=api,appUrl=page.url();await api.back();
      const resultPromise=Promise.race([page.waitForEvent('close').then(()=> 'closed'),page.waitForURL(url=>url.href!==appUrl).then(()=> 'left-document'),page.getByRole('heading',{name:'종료를 확인했습니다'}).waitFor().then(()=> 'fallback')]);
      await page.locator('#app-exit-confirm').click();
      return {platformResult:await resultPromise,confirmedExitNotInterceptedAgain:true};
    },{previous:false});
    await check('직접 닫기와 이전 문서 이동 미지원 환경은 안내하고 계속 사용으로 재무장',async api=>{
      const {page}=api;
      // 새 탭의 about:blank 대신 최상단 PWA에서 두 종료 API가 무효인 경계를 주입한다.
      await page.evaluate(()=>{
        const back=history.back.bind(history);history.back=function(){if(history.state?.stAppNavigation?.kind==='base'){window.navigationExitAttempted=true;return;}return back();};
        window.close=()=>{window.navigationCloseAttempted=true;};
      });
      await api.back();await page.locator('#app-exit-confirm').click();
      await page.getByRole('heading',{name:'종료를 확인했습니다'}).waitFor();
      assert.deepEqual(await page.evaluate(()=>({active:SulsulTravel.MobileNavigation.active,back:window.navigationExitAttempted,close:window.navigationCloseAttempted})),{active:false,back:true,close:true});
      assert.equal(await page.locator('#app-exit-confirm').isVisible(),false);
      await page.locator('#app-exit-cancel').click();await api.closed('modal-app-exit');
      assert.equal(await page.evaluate(()=>SulsulTravel.MobileNavigation.active),true);
      await api.back();await page.getByRole('heading',{name:'앱을 종료할까요?'}).waitFor();
      return {unsupportedExitDoesNotTrap:true,resumeRearms:true,unsupportedNativeApisInjected:true};
    },{previous:false});
    await check('허브에서도 미저장 하루 회고·사진을 경고하고 취소·새로고침 거절로 보존',async api=>{
      const {page}=api;await api.seed();
      assert.equal(await page.evaluate(()=>SulsulTravel.MobileNavigation.pendingTravelRecords()),false);
      await page.evaluate(()=>{switchTab('journal');selectJournalDay(0);});
      await page.locator('#journal-text-input').click();await page.locator('#journal-text-input').fill('아직 저장하지 않은 합성 하루 회고');
      await page.waitForFunction(()=>history.state?.stAppNavigation?.activated===true);
      await page.evaluate(()=>{
        const key=SulsulTravel.TripAdapter.journalDraftKey(getActiveTrip(),0);
        // 사진 저장 실패 뒤 남은 초안 경계만 주입하며 실제 개인 사진은 사용하지 않는다.
        State.journalPhotoDrafts={[key]:{dayId:getActiveTrip().days[0].id,photos:[{source:'data:image/png;base64,AAAA',thumbnail:'data:image/png;base64,AAAA'}]}};
      });
      const drafts=await page.evaluate(()=>JSON.stringify([State.journalTextDrafts,State.journalPhotoDrafts]));
      await api.back();await page.waitForFunction(()=>State.currentView==='hub');
      await api.back();await page.getByRole('heading',{name:'앱을 종료할까요?'}).waitFor();
      assert.match(await page.locator('#app-exit-description').textContent(),/아직 저장하지 않은 하루 기록·사진/);
      assert.match(await page.locator('#app-exit-description').textContent(),/종료하면 미저장 내용이 사라집니다/);
      await page.locator('#app-exit-cancel').click();await api.closed('modal-app-exit');
      assert.equal(await page.evaluate(()=>JSON.stringify([State.journalTextDrafts,State.journalPhotoDrafts])),drafts);
      api.setConfirm(false);await page.reload({waitUntil:'domcontentloaded',timeout:3000}).catch(()=>{});
      assert.equal(api.dialogs.length,1);assert.equal(await page.evaluate(()=>JSON.stringify([State.journalTextDrafts,State.journalPhotoDrafts])),drafts);
      await api.back();await page.locator('#app-exit-confirm').click();await page.waitForURL(origin+'/before.html');
      assert.equal(api.dialogs.length,1);
      return {unsavedDailyTextAndPhotoWarned:true,cancelPreservedDrafts:true,refreshDismissPreservedDrafts:true,explicitExitAvoidsDuplicateNativePrompt:true};
    });
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:results.every(r=>r.passed),results},null,2));
    console.log(JSON.stringify({passed:results.every(r=>r.passed),results},null,2));if(results.some(r=>!r.passed))process.exitCode=1;
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>server.close());
