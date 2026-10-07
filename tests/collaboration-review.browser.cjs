/* 실제 공동 서버를 사용하지 않는 승인·개인 기록 보존·보기 권한 통합 검사. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'application/javascript','.mjs':'application/javascript','.png':'image/png'})[path.extname(file)] || 'application/octet-stream');res.end(data);});
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  try {
    const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
    page.setDefaultTimeout(10000);page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
    await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'networkidle'});
    await page.evaluate(()=>{
      document.querySelectorAll('.sheet-container').forEach(node=>node.classList.add('sheet-closed'));window.alert=()=>{};window.confirm=()=>true;
      const trip={id:'local-shared',title:'우리의 여행',startDate:'2026-10-07',endDate:'2026-10-07',timeZone:'Asia/Seoul',cities:['푸에르토 나탈레스'],countries:['칠레'],revision:0,currency:'KRW',budget:1000,checklist:[],planBlockMeta:{},days:[{id:'day-stable',dayNum:1,date:'2026-10-07',city:'푸에르토 나탈레스',title:'첫날',spots:[{id:'spot-stable',title:'바닷가 산책',time:'10:00',cat:'tour',recordId:'activity-local'}]}],journals:{0:{text:'개인 하루 회고',photos:[]}},momentEntries:[{id:'moment-local',date:'2026-10-07',time:'11:00',text:'개인 순간',photos:[],coverIndex:0,visibility:'private'}],activityRecords:{'activity-local':{id:'activity-local',text:'개인 일정 글',context:{title:'바닷가 산책',date:'2026-10-07',time:'10:00',city:'푸에르토 나탈레스'},photos:[],coverIndex:0}},expenses:[{id:'expense-local',title:'식사',cat:'meal',curr:'KRW',amount:100,krw:100}],exchanges:[],initialBalances:{KRW:1000},wallets:{},activeCurrencies:['KRW']};
      State.trips=[trip];State.activeTripId=trip.id;saveTrips();switchView('workspace');switchTab('today');openShareModal();document.getElementById('travel-collaboration').closest('details').open=true;
      window.originalPrivate=JSON.stringify([getActiveTrip().journals,getActiveTrip().momentEntries,getActiveTrip().activityRecords,getActiveTrip().expenses]);
      window.startSharedReview=(role='editor',source='refresh')=>{
        const local=getActiveTrip(),body=SulsulTravel.Collaboration.sanitizePlan(local);body.title='서버에서 함께 다듬은 여행';body.days[0].spots[0].title='해변과 항구 산책';body.days[0].spots[0].time='10:30';
        window.reviewResult=null;window.reviewPromise=reviewRemoteTravelPlan({remote:{id:'11111111-1111-4111-8111-111111111111',body,revision:2,role},localTrip:local,link:{documentId:'11111111-1111-4111-8111-111111111111',revision:2,role},source}).then(result=>window.reviewResult=result);
      };
    });
    assert.match(await page.locator('#travel-collaboration').innerText(),/서버 미연결/);
    await page.evaluate(()=>{closeModal('modal-share-room',true);startSharedReview();});
    assert.equal(await page.evaluate(()=>getActiveTrip().title),'우리의 여행','승인 전 원본 유지');
    assert.match(await page.locator('#collaboration-review-diff').innerText(),/내 여행|서버 계획/);
    await page.evaluate(()=>closeModal('modal-collaboration-review',true));
    await page.waitForFunction(()=>window.reviewResult?.applied===false);
    await page.waitForFunction(()=>!history.state?.stCollaborationReview);
    assert.equal(await page.evaluate(()=>getActiveTrip().title),'우리의 여행');

    await page.evaluate(()=>{startSharedReview();window.storageSet=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='st_trips_v2')throw new DOMException('quota','QuotaExceededError');return window.storageSet.call(this,key,value);};});
    await page.locator('#collaboration-review-apply').click();
    assert.equal(await page.evaluate(()=>getActiveTrip().title),'우리의 여행','쓰기 실패 원본 유지');
    assert.equal(await page.locator('#modal-collaboration-review').isVisible(),true);
    assert.match(await page.locator('#collaboration-review-feedback').innerText(),/저장하지 못했습니다/);
    await page.evaluate(()=>Storage.prototype.setItem=window.storageSet);
    await page.locator('#collaboration-review-apply').click();
    await page.waitForFunction(()=>window.reviewResult?.applied===true);
    await page.waitForFunction(()=>!history.state?.stCollaborationReview);
    assert.deepEqual(await page.evaluate(()=>({title:getActiveTrip().title,time:getActiveTrip().days[0].spots[0].time,record:getActiveTrip().days[0].spots[0].recordId,privateKept:JSON.stringify([getActiveTrip().journals,getActiveTrip().momentEntries,getActiveTrip().activityRecords,getActiveTrip().expenses])===window.originalPrivate})),{title:'서버에서 함께 다듬은 여행',time:'10:30',record:'activity-local',privateKept:true});

    await page.evaluate(()=>{startSharedReview();getActiveTrip().journals[0].text='비교 중 새로운 개인 회고';saveTrips();});
    await page.locator('#collaboration-review-apply').click();
    assert.match(await page.locator('#collaboration-review-feedback').innerText(),/비교하는 동안/);
    assert.equal(await page.evaluate(()=>getActiveTrip().journals[0].text),'비교 중 새로운 개인 회고');
    await page.evaluate(()=>closeModal('modal-collaboration-review',true));await page.waitForFunction(()=>!history.state?.stCollaborationReview);

    await page.evaluate(()=>{startSharedReview('viewer','invite');});
    await page.locator('#modal-collaboration-review footer button').first().click();
    await page.waitForFunction(()=>window.reviewResult?.applied===true);
    await page.waitForFunction(()=>!history.state?.stCollaborationReview);
    assert.equal(await page.evaluate(()=>State.trips.length),2,'새 사본이 기존 여행을 대체하지 않는다');
    assert.equal(await page.evaluate(()=>getActiveTrip().momentEntries.length),0,'새 계획 사본에 개인 기록을 넣지 않는다');

    await page.evaluate(()=>{
      localStorage.setItem('st_collaboration_config_v1',JSON.stringify({url:'https://example.supabase.co',publicKey:'sb_publishable_mockpublic123456'}));
      SulsulTravel.CollaborationUI.attachTrip(getActiveTrip().id,{documentId:'11111111-1111-4111-8111-111111111111',revision:2,role:'viewer'});
      window.viewerPlan=JSON.stringify(getActiveTrip().days);toggleSpotCompleted(0,0);openEditSpotModal(0,0);
    });
    assert.equal(await page.evaluate(()=>JSON.stringify(getActiveTrip().days)===window.viewerPlan),true,'보기 권한으로 완료 변경 차단');
    assert.equal(await page.locator('#modal-spot').isVisible(),false,'보기 권한의 일정 편집 진입 차단');
    const guard=await page.evaluate(()=>{
      const next=JSON.parse(JSON.stringify(State.trips));next.find(trip=>trip.id===State.activeTripId).title='허용되지 않은 변경';
      let code;try{TripRepository.saveAll(next,{bumpTripId:State.activeTripId});}catch(error){code=error.code;}
      const privateNext=JSON.parse(JSON.stringify(State.trips)),target=privateNext.find(trip=>trip.id===State.activeTripId);target.journals={0:{text:'보기 전용 여행의 개인 회고',photos:[]}};
      State.trips=TripRepository.saveAll(privateNext,{bumpTripId:target.id});
      return {code,privateText:getActiveTrip().journals[0].text};
    });
    assert.deepEqual(guard,{code:'READ_ONLY_TRIP',privateText:'보기 전용 여행의 개인 회고'});
    await page.evaluate(()=>openShareModal());
    assert.match(await page.locator('#travel-collaboration').innerText(),/보기 전용/);
    assert.equal(await page.getByRole('button',{name:'내 변경 보내기',exact:true}).isDisabled(),true);
    for(const width of [320,360,390,430]){
      await page.setViewportSize({width,height:844});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`공유 화면 가로 넘침 ${width}`);
    }
    await page.evaluate(()=>{closeModal('modal-share-room',true);startSharedReview('viewer');});await page.goBack();
    await page.waitForFunction(()=>window.reviewResult?.applied===false);
    assert.equal(await page.locator('#modal-collaboration-review').isVisible(),false,'휴대폰 뒤로 비교 화면 닫기');
    assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,checks:['미연결','승인 전 보존','취소','저장 실패 재시도','기록 연결 보존','로컬 revision 충돌','사본 분리','보기 권한','개인 기록 허용','공유 모바일','뒤로가기'],runtimeErrors:errors,server:'mock only'}));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>server.close());
