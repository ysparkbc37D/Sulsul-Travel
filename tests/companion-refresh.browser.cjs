/* 모바일 개선과 입력 계약의 통합 회귀. 새 브라우저와 고정 여행만 사용한다. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),output=path.join(root,'.local-review','companion-refresh');
const server=http.createServer((req,res) => {
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+(pathname==='/' ? '/index.html' : pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,content) => {if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)] || 'application/octet-stream');res.end(content);});
});
(async() => {
  fs.mkdirSync(output,{recursive:true});await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
  const results=[];
  async function check(name,operation) {try {const details=await operation();results.push({name,passed:true,details});}catch(error){results.push({name,passed:false,error:error.message});}}
  try {
    const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Seoul',serviceWorkers:'block'}),page=await context.newPage(),errors=[];
    page.setDefaultTimeout(10000);page.on('pageerror',error => errors.push(error.message));
    await page.route('**/*',route => new URL(route.request().url()).hostname==='127.0.0.1' ? route.continue() : route.abort());
    await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'networkidle'});
    await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}'});
    const settle=() => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
    await check('실제 v14 기본 시드의 전체 제목·날짜·식별자와 사본 왕복',async() => {
      const result=await page.evaluate(() => {
        const trip=State.trips.find(item => item.id==='trip_sa_showcase_22d');
        if(!trip)throw new Error('v14 시드가 없습니다.');
        const before=JSON.stringify(trip),copy=JSON.parse(before);copy.days[0].spots[0].completed=true;copy.days[1].spots[0].skipped=true;copy.journals={0:{text:'시드 왕복 검증 기록',photos:[]}};
        const imported=SulsulTravel.TripTransfer.parse(JSON.stringify(SulsulTravel.TripTransfer.create(copy,{journals:true,finances:true},APP_VER))).trip;
        return {title:trip.title,days:trip.days.length,spots:trip.days.flatMap(day => day.spots).length,invalid:trip.days.flatMap(day => day.spots).filter(spot => !spot.title?.trim() || spot.title==='새 일정').length,dates:trip.days.every(day => /^\d{4}-\d{2}-\d{2}$/.test(day.date)),same:JSON.stringify(imported.days)===JSON.stringify(copy.days),journal:imported.journals[0].text,completed:imported.days[0].spots[0].completed,skipped:imported.days[1].spots[0].skipped,notMutated:before===JSON.stringify(trip),cities:imported.cities};
      });
      assert.match(result.title,/v14/);assert.equal(result.days,22);assert.ok(result.spots>50);assert.equal(result.invalid,0);assert.equal(result.dates,true);assert.equal(result.same,true);assert.equal(result.completed,true);assert.equal(result.skipped,true);assert.equal(result.notMutated,true);assert.equal(result.journal,'시드 왕복 검증 기록');assert.ok(result.cities.includes('엘 칼라파테'));assert.ok(result.cities.includes('엘 찰텐'));assert.ok(result.cities.includes('토레스 델 파이네'));return result;
    });
    await check('구 별칭 자료는 repository load에서 변환하고 기록·공백 지명을 보존',async() => {
      const result=await page.evaluate(() => {
        let saved=JSON.stringify([{id:'legacy-input',name:'구 여행',startDate:'2026.10.11',cities:['푸에르토 나탈레스','New York','Buenos Aires'],days:[{day:1,date:'2026년 10월 11일',city:'푸에르토 나탈레스',timeline:[{name:'버스에서 내려 걸었다',category:'transit',completed:true,recordId:'r'},{name:'해변 산책',category:'tour',skipped:true}]}],journals:{0:{content:'구 일기의 원문',photos:[]}},activityRecords:{r:{id:'r',text:'일정의 원문',photos:[],coverIndex:0,context:{title:'버스에서 내려 걸었다'}}},expenses:[{name:'간단한 식사',category:'food',currency:'KRW',amount:1000}]}]);
        const storage={getItem:() => saved,setItem:(_,value) => {saved=value;}},repository=new SulsulTravel.LegacyTripRepository(storage);
        const loaded=repository.loadAll(),trip=loaded.trips[0];
        return {recovery:loaded.recoveredFromCorruption,title:trip.title,date:trip.days[0].date,dayNum:trip.days[0].dayNum,city:trip.days[0].city,cities:trip.cities,titleOfSpot:trip.days[0].spots[0].title,category:trip.days[0].spots[0].cat,dayId:trip.days[0].id,spotId:trip.days[0].spots[0].id,completed:trip.days[0].spots[0].completed,skipped:trip.days[0].spots[1].skipped,recordId:trip.days[0].spots[0].recordId,journal:trip.journals[0].text,record:trip.activityRecords.r.text,expense:trip.expenses[0]};
      });
      assert.equal(result.recovery,false);assert.equal(result.title,'구 여행');assert.equal(result.date,'2026-10-11');assert.equal(result.dayNum,1);assert.equal(result.city,'푸에르토 나탈레스');assert.deepEqual(result.cities,['푸에르토 나탈레스','New York','Buenos Aires']);assert.equal(result.titleOfSpot,'버스에서 내려 걸었다');assert.equal(result.category,'flight');assert.ok(result.dayId&&result.spotId);assert.equal(result.completed,true);assert.equal(result.skipped,true);assert.equal(result.recordId,'r');assert.equal(result.journal,'구 일기의 원문');assert.equal(result.record,'일정의 원문');assert.equal(result.expense.cat,'meal');assert.equal(result.expense.krw,1000);return result;
    });
    await page.evaluate(() => {
      window.alert=() => {};window.confirm=() => true;document.querySelectorAll('.sheet-container').forEach(element => element.classList.add('sheet-closed'));
      const adapter=SulsulTravel.TripAdapter,start=adapter.dateForDay(adapter.localDateKey(new Date(),'Asia/Seoul'),10);
      const cities=['푸에르토 나탈레스','엘 찰텐','New York','Buenos Aires','토레스 델 파이네','엘 칼라파테'];
      const makeTrip=(id,title) => adapter.normalizeTrip({id,title,startDate:start,timeZone:'Asia/Seoul',countries:['칠레'],cities,currency:'KRW',budget:10000,journals:{},momentEntries:[],activityRecords:{},expenses:[],checklist:[],days:cities.map((city,index) => ({dayNum:index+1,date:adapter.dateForDay(start,index),city,title:`${city}에서 천천히 걷는 하루`,spots:Array.from({length:6},(_,spotIndex) => ({title:`${city} ${spotIndex+1}번째 일정`,time:`${String(9+spotIndex).padStart(2,'0')}:00`,desc:'시간을 확인하고 길을 따라 천천히 걸어간다. 사진이나 한 줄 메모로 여행의 순간을 남길 수 있다.',cat:spotIndex%2 ? 'tour' : 'food',completed:false}))}))});
      State.trips=[makeTrip('refresh-a','여섯 도시에서 함께 만드는 여행'),makeTrip('refresh-b','다른 여행')];State.activeTripId=null;State.activePlanBlockId=null;State.currentView='hub';State.travelWorkspaceViews={};State.travelTabPositions={};State.planSubTab='timeline';State.ratesLastUpdated=new Date().toISOString();openTripWorkspace('refresh-a');setTheme('modern');
    });
    await settle();
    await check('여행 전 오늘은 미리보기이며 다음 일정 제목을 표시',async() => {
      await page.evaluate(() => switchTab('today'));await settle();
      assert.match(await page.locator('.companion-preview').textContent(),/미리 보는 하루/);
      assert.equal(await page.locator('.companion-next h3').textContent(),'푸에르토 나탈레스 1번째 일정');
      assert.doesNotMatch(await page.locator('.companion-next').textContent(),/오늘도 좋은 여행이었나요|여정을 마쳤어요/);
      return {preview:await page.locator('.companion-preview').textContent(),next:await page.locator('.companion-next h3').textContent()};
    });
    await check('길찾기는 공백 지명과 장소 및 이동 출발점을 안전한 URL로 전달',async() => {
      const urls=await page.evaluate(() => {const opened=[],original=window.open;window.open=(...args) => {opened.push(args);return null;};try{openCompanionDirections(0,0);openCompanionDirections(0,1,0);}finally{window.open=original;}return opened;});
      assert.equal(urls.length,2);
      const first=new URL(urls[0][0]),second=new URL(urls[1][0]);assert.equal(first.origin,'https://www.google.com');assert.equal(first.pathname,'/maps/dir/');assert.equal(first.searchParams.get('destination'),'푸에르토 나탈레스 푸에르토 나탈레스 1번째 일정');assert.equal(second.searchParams.get('origin'),first.searchParams.get('destination'));assert.equal(second.searchParams.get('destination'),'푸에르토 나탈레스 푸에르토 나탈레스 2번째 일정');assert.equal(urls[0][2],'noopener,noreferrer');return urls;
    });
    await check('상황별 조정 버튼이 선택한 날짜와 조정 이유를 입력',async() => {
      await page.evaluate(() => selectCompanionTodayDay(1));await settle();
      await page.locator('.companion-change-reason button').filter({hasText:'비가 와요'}).click();
      assert.equal(await page.locator('#modal-schedule-tuning').evaluate(element => element.classList.contains('sheet-closed')),false);
      assert.equal(await page.locator('#tuning-reason-input').inputValue(),'비가 와서 실내 위주로 변경');
      assert.equal(await page.locator('#tuning-target-day').inputValue(),'1');
      await page.evaluate(() => closeModal('modal-schedule-tuning',true));await settle();return {dayIndex:1,reason:'비가 와서 실내 위주로 변경'};
    });
    for(const width of [320,360,390,430]) {
      await check(`모바일 ${width}px 가로 넘침·헤더44·날짜72·대표 행동`,async() => {
        await page.setViewportSize({width,height:844});await page.evaluate(() => {switchTab('today');selectCompanionTodayDay(0);});await settle();await page.evaluate(() => window.scrollTo({top:0,behavior:'instant'}));await settle();
        const bounds=await page.evaluate(() => ({overflow:document.documentElement.scrollWidth>innerWidth,header:[...document.querySelectorAll('.companion-app-header button')].filter(element => element.getClientRects().length && getComputedStyle(element).display!=='none').map(element => {const box=element.getBoundingClientRect();return {id:element.id,width:box.width,height:box.height};}),days:[...document.querySelectorAll('#today-overview-container .companion-day-picker button')].map(element => element.getBoundingClientRect().height),actions:[...document.querySelectorAll('.companion-next-actions button')].map(element => {const box=element.getBoundingClientRect();return {height:box.height,inside:box.left>=0&&box.right<=innerWidth+1,aboveNav:box.bottom<=document.getElementById('companion-main-nav').getBoundingClientRect().top};}),navBottom:document.getElementById('companion-main-nav').getBoundingClientRect().bottom}));
        assert.equal(bounds.overflow,false);assert.ok(bounds.header.length>=1);assert.ok(bounds.header.every(button => button.width>=44&&button.height>=44),JSON.stringify(bounds.header));assert.ok(bounds.days.every(height => Math.abs(height-72)<1),JSON.stringify(bounds.days));assert.ok(bounds.actions.every(action => action.height>=44&&action.inside&&action.aboveNav),JSON.stringify(bounds.actions));assert.ok(Math.abs(bounds.navBottom-844)<2);return bounds;
      });
    }
    await page.setViewportSize({width:390,height:844});
    for(const theme of ['modern','deepblack','lightgray']) {
      await check(`${theme} 주요 본문·보조 글자 실제 대비 4.5 이상`,async() => {
        await page.evaluate(theme => {setTheme(theme);switchTab('plan');openPlanPresentation('overview');},theme);await settle();
        const plan=await contrast(page,['.companion-muted','.companion-block-meta > span','.companion-block-summary','.companion-block-bottom > span','.companion-metrics > span','.companion-section-title > span']);
        await page.evaluate(() => switchTab('today'));await settle();
        const today=await contrast(page,['.companion-next h3','.companion-next > p','.companion-day-picker small','.companion-spot h4','.companion-spot > p','.companion-spot-time time','.companion-preview']);
        const all=[...plan,...today];fs.writeFileSync(path.join(output,`${theme}-contrast.json`),JSON.stringify(all,null,2));
        await page.screenshot({path:path.join(output,`${theme}-today.png`)});
        const failures=all.filter(item => item.ratio<4.5);assert.deepEqual(failures,[],JSON.stringify(failures));return {samples:all.length,min:Math.min(...all.map(item => item.ratio))};
      });
    }
    await check('탭 사이 이동 후 선택 날짜와 스크롤 복원',async() => {
      await page.evaluate(() => {setTheme('modern');switchTab('today');selectCompanionTodayDay(2);});await settle();
      await page.evaluate(() => window.scrollTo({top:330,behavior:'instant'}));await settle();const todayY=await page.evaluate(() => scrollY);assert.ok(todayY>=300);
      await page.evaluate(() => {switchTab('plan');openPlanPresentation('timeline');});await settle();
      await page.evaluate(() => window.scrollTo({top:240,behavior:'instant'}));await settle();const planY=await page.evaluate(() => scrollY);
      await page.evaluate(() => switchTab('today'));await settle();
      const restored=await page.evaluate(() => ({scroll:scrollY,day:State.activeTodayDayIndex}));assert.ok(Math.abs(restored.scroll-todayY)<2);assert.equal(restored.day,2);
      await page.evaluate(() => switchTab('plan'));await settle();assert.ok(Math.abs(await page.evaluate(() => scrollY)-planY)<2);return {todayY,planY,restored};
    });
    await check('허브와 다른 여행을 거친 뒤 탭·날짜·계획 보기·스크롤 복원',async() => {
      await page.evaluate(() => {openPlanPresentation('timeline');switchTab('journal');selectJournalDay(3);});await settle();
      await page.evaluate(() => window.scrollTo({top:130,behavior:'instant'}));await settle();const before=await page.evaluate(() => scrollY);
      await page.evaluate(() => {switchView('hub');openTripWorkspace('refresh-b');});await settle();
      await page.evaluate(() => {switchTab('today');selectCompanionTodayDay(1);switchView('hub');openTripWorkspace('refresh-a');});await settle();
      const restored=await page.evaluate(() => ({trip:State.activeTripId,tab:State.activeTab,journalDay:State.activeJournalDay,todaySelection:State.companionTodaySelection?.dayIndex,planMode:document.getElementById('tab-content-plan').dataset.presentation,scroll:scrollY}));
      assert.equal(restored.trip,'refresh-a');assert.equal(restored.tab,'journal');assert.equal(restored.journalDay,3);assert.equal(restored.todaySelection,2);assert.equal(restored.planMode,'timeline');assert.ok(Math.abs(restored.scroll-before)<2,JSON.stringify({before,restored}));return restored;
    });
    await check('모바일 핵심 탭 전체 문서 가로 넘침 없음',async() => {
      const geometries=[];
      for(const width of [320,360,390,430])for(const tab of ['plan','today','journal']) {
        await page.setViewportSize({width,height:844});await page.evaluate(tab => {switchTab(tab);if(tab==='plan')openPlanPresentation('overview');},tab);await settle();
        const overflow=await page.evaluate(() => document.documentElement.scrollWidth>innerWidth);geometries.push({width,tab,overflow});assert.equal(overflow,false,`${width} ${tab}`);
      }
      return geometries;
    });
    await check('초기화 및 사용자 화면의 JavaScript 오류 없음',async() => {assert.deepEqual(errors,[]);return errors;});
    const summary={passed:results.every(result => result.passed),results};fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));if(!summary.passed)process.exitCode=1;
  } finally {await browser.close();}
})().catch(error => {console.error(error);process.exitCode=1;}).finally(() => server.close());

async function contrast(page,selectors) {
  return page.evaluate(selectors => {
    const color=value => {const numbers=value.match(/[\d.]+/g)?.map(Number) || [0,0,0];return [numbers[0],numbers[1],numbers[2],numbers[3] ?? 1];};
    const blend=(top,bottom) => top.slice(0,3).map((value,index) => value*top[3]+bottom[index]*(1-top[3])).concat(1);
    const luminance=rgb => rgb.slice(0,3).map(value => {const channel=value/255;return channel<=.04045 ? channel/12.92 : ((channel+.055)/1.055)**2.4;}).reduce((sum,value,index) => sum+value*[.2126,.7152,.0722][index],0);
    return selectors.flatMap(selector => [...document.querySelectorAll(selector)].filter(element => element.getClientRects().length && getComputedStyle(element).display!=='none').map(element => {
      const ancestors=[];for(let current=element;current;current=current.parentElement)ancestors.push(current);
      const background=ancestors.reverse().reduce((behind,current) => blend(color(getComputedStyle(current).backgroundColor),behind),[255,255,255,1]);
      const foreground=blend(color(getComputedStyle(element).color),background),first=luminance(foreground),second=luminance(background);
      return {selector,text:element.textContent.trim().slice(0,100),color:getComputedStyle(element).color,background:background.slice(0,3).map(Math.round),ratio:Number(((Math.max(first,second)+.05)/(Math.min(first,second)+.05)).toFixed(3))};
    }));
  },selectors);
}
