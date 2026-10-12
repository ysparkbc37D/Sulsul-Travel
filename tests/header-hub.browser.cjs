/* 휴대폰에서 숨은 버전·찢긴 검색을 가로 넘침 검사만으로 놓치지 않는다. 개인 자료 없이 실행한다. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const root=path.resolve(__dirname,'..'),output=path.join(root,'.local-review','header-hub');
const server=http.createServer((req,res) => {
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+(pathname==='/' ? '/index.html' : pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,content) => {
    if(error){res.writeHead(404).end();return;}
    res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'})[path.extname(file)] || 'application/octet-stream');res.end(content);
  });
});

(async() => {
  fs.mkdirSync(output,{recursive:true});await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})}),results=[];let page;
  async function check(name,operation){try{results.push({name,passed:true,details:await operation()});}catch(error){results.push({name,passed:false,error:error.message});}finally{console.log(`${results.at(-1).passed ? 'PASS' : 'FAIL'} ${name}`);if(page)await page.evaluate(() => {closeModal('modal-version-history',true);hidePlanBlockDetail({restoreScroll:false});});}}
  try{
    const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Seoul',serviceWorkers:'block'}),errors=[];page=await context.newPage();
    page.setDefaultTimeout(8000);page.on('pageerror',error => errors.push(error.message));
    await page.route('**/*',route => new URL(route.request().url()).hostname==='127.0.0.1' ? route.continue() : route.abort());
    await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'networkidle'});
    await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}'});
    const settle=() => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.evaluate(() => {
      const adapter=SulsulTravel.TripAdapter,today=adapter.localDateKey(new Date(),'Asia/Seoul');
      const makeTrip=(id,title,city,startDate,endDate) => adapter.normalizeTrip({id,title,countries:['일본'],cities:[city],currency:'JPY',budget:12345000,startDate,endDate,timeZone:'Asia/Seoul',days:Array.from({length:id==='header-live' ? 12 : 2},(_,index) => ({date:adapter.dateForDay(startDate,index),city,title:`${city}의 ${index+1}일 가상 일정`,spots:[{title:'가상 산책',time:'09:00',cat:'tour'}]})),journals:{},momentEntries:[],activityRecords:{},expenses:[{title:'가상 식사',amount:50000,currency:'JPY',krw:5350000,cat:'food',date:startDate}]});
      State.trips=[makeTrip('header-live','가상 교토 산책, 골목마다 함께 남기는 열두 날의 가족 여행','교토',adapter.dateForDay(today,-1),adapter.dateForDay(today,10)),makeTrip('header-future','가상 오사카 맛집, 오래 기억할 음식과 이야기를 찾아 떠나는 여행','오사카','2035-04-01','2035-04-02'),makeTrip('header-past','가상 도쿄 회상','도쿄','2020-04-01','2020-04-02')];
      State.activeTripId=null;State.hubViewMode='list';switchView('hub');resetHubFilters();setTheme('modern');
    });await settle();
    for(const width of [320,360,390,430])for(const view of ['hub','workspace']){
      await check(`${width}px ${view} 버전·브랜드·설정·이동 버튼 실제 노출과 터치 경계`,async() => {
        await page.setViewportSize({width,height:844});await page.evaluate(view => {if(view==='hub')switchView('hub');else{openTripWorkspace('header-live');if(view==='detail')openPlanBlock(0);}},view);await settle();
        const geometry=await page.evaluate(() => {
          const header=document.querySelector('.companion-app-header'),badge=document.getElementById('app-ver-badge'),brand=header.querySelector('h1');
          const buttons=[badge,document.getElementById('header-btn-analytics'),header.querySelector('button[onclick="openSettingsModal()"]'),document.getElementById(State.currentView==='hub' ? 'header-btn-create-trip' : 'header-btn-back-hub')];
          const box=element => {const rect=element.getBoundingClientRect(),style=getComputedStyle(element);return {id:element.id || element.title,visible:!!element.getClientRects().length&&style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)>0,hittable:element.contains(document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2)),left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,width:rect.width,height:rect.height,fontSize:parseFloat(style.fontSize)};};
          const textRange=document.createRange();textRange.selectNodeContents(brand);const rect=textRange.getBoundingClientRect();
          return {version:APP_VER,label:badge.textContent.trim(),overflow:document.documentElement.scrollWidth>innerWidth,header:box(header),brand:{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom},buttons:buttons.map(box),width:innerWidth};
        });
        assert.equal(geometry.label,`v${geometry.version}`);assert.equal(geometry.overflow,false);
        assert.ok(geometry.buttons.every(button => button.visible),JSON.stringify(geometry));
        assert.ok(geometry.buttons.every(button => button.hittable),`다른 화면이 헤더 버튼을 가립니다: ${JSON.stringify(geometry)}`);
        assert.ok(geometry.buttons.every(button => button.width>=44&&button.height>=44&&button.left>=0&&button.right<=width+1&&button.top>=geometry.header.top-1&&button.bottom<=geometry.header.bottom+1),JSON.stringify(geometry));
        for(let first=0;first<geometry.buttons.length;first++)for(let second=first+1;second<geometry.buttons.length;second++)assert.equal(overlap(geometry.buttons[first],geometry.buttons[second]),false,JSON.stringify(geometry));
        for(const button of geometry.buttons)assert.equal(overlap(geometry.brand,button),false,`브랜드 텍스트가 버튼과 겹칩니다: ${JSON.stringify(geometry)}`);
        assert.ok(geometry.buttons[0].fontSize>=10,'버전 글자는 최소 10px');
        await page.locator('#app-ver-badge').click();await settle();
        assert.equal(await page.locator('#modal-version-history').evaluate(element => element.classList.contains('sheet-closed')),false,'버전 배지가 이력을 엽니다.');
        await page.evaluate(view => {closeModal('modal-version-history',true);if(view==='workspace'){switchTab('plan');openPlanPresentation('timeline');}},view);await settle();
        await page.evaluate(() => window.scrollTo({top:250,behavior:'instant'}));await settle();
        geometry.scrolled=await page.evaluate(() => {
          const badge=document.getElementById('app-ver-badge'),rect=badge.getBoundingClientRect(),header=document.querySelector('.companion-app-header').getBoundingClientRect();
          return {scrollY,headerTop:header.top,badgeTop:rect.top,badgeBottom:rect.bottom,hittable:badge.contains(document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2))};
        });
        assert.ok(geometry.scrolled.scrollY>=100,`헤더를 검사할 만큼 실제로 스크롤합니다: ${JSON.stringify(geometry.scrolled)}`);
        assert.ok(Math.abs(geometry.scrolled.headerTop)<1&&geometry.scrolled.badgeTop>=0&&geometry.scrolled.badgeBottom<=844&&geometry.scrolled.hittable,`스크롤 후 버전이 사라지거나 가려집니다: ${JSON.stringify(geometry.scrolled)}`);
        await page.locator('#app-ver-badge').click();await settle();assert.equal(await page.locator('#modal-version-history').evaluate(element => element.classList.contains('sheet-closed')),false);return geometry;
      });
    }
    for(const width of [320,360,390,430]){
      await check(`${width}px 상세 화면 독립 헤더·하단 행동 경계와 돌아온 버전 접근`,async() => {
        await page.setViewportSize({width,height:844});await page.evaluate(() => {openTripWorkspace('header-live');openPlanBlock(0);});await settle();
        const geometry=await page.evaluate(() => {
          const container=document.getElementById('plan-block-detail-container'),buttons=[...document.querySelectorAll('.plan-detail-header button,.plan-detail-actions button')];
          return {contentOverflow:container.scrollWidth>container.clientWidth,width:innerWidth,height:innerHeight,buttons:buttons.map(button => {const rect=button.getBoundingClientRect();return {name:button.getAttribute('aria-label')||button.title||button.textContent.trim(),width:rect.width,height:rect.height,left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,hittable:button.contains(document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2))};})};
        });
        assert.equal(geometry.contentOverflow,false);assert.equal(geometry.buttons.length,5);
        assert.ok(geometry.buttons.every(button => button.width>=44&&button.height>=44&&button.left>=0&&button.right<=width+1&&button.top>=0&&button.bottom<=844+1&&button.hittable),JSON.stringify(geometry));
        assert.match(await page.locator('#plan-block-detail-container').textContent(),/가상 산책/);
        await page.locator('#btn-closePlanBlock').click();await page.locator('#plan-block-detail-page').waitFor({state:'hidden'});await settle();
        await page.locator('#app-ver-badge').click();await settle();assert.equal(await page.locator('#modal-version-history').evaluate(element => element.classList.contains('sheet-closed')),false);
        return geometry;
      });
    }
    for(const width of [768,1280]){
      await check(`${width}px 데스크톱 스크롤 시 내비게이션은 헤더 아래에서 클릭 가능`,async() => {
        await page.setViewportSize({width,height:844});await page.evaluate(() => {openTripWorkspace('header-live');switchTab('plan');openPlanPresentation('timeline');});await settle();
        await page.evaluate(() => window.scrollTo({top:400,behavior:'instant'}));await settle();
        const geometry=await page.evaluate(() => {
          const header=document.querySelector('.companion-app-header').getBoundingClientRect(),nav=document.getElementById('companion-main-nav').getBoundingClientRect();
          return {scrollY,headerBottom:header.bottom,navTop:nav.top,measuredHeader:document.documentElement.style.getPropertyValue('--app-header-height'),buttons:[...document.querySelectorAll('#companion-main-nav button')].filter(button => button.getClientRects().length&&getComputedStyle(button).display!=='none').map(button => {const rect=button.getBoundingClientRect();return {id:button.id,width:rect.width,height:rect.height,left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,hittable:button.contains(document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2))};})};
        });
        assert.ok(geometry.scrollY>=100,'내비게이션이 붙는 위치까지 실제로 스크롤합니다.');
        assert.ok(geometry.navTop>=geometry.headerBottom-1,`헤더가 내비게이션을 가립니다: ${JSON.stringify(geometry)}`);
        assert.ok(geometry.buttons.length>=5&&geometry.buttons.every(button => button.width>=44&&button.height>=44&&button.left>=0&&button.right<=width+1&&button.hittable),JSON.stringify(geometry));
        await page.locator('#nav-tab-today').click();await settle();assert.equal(await page.evaluate(() => State.activeTab),'today');return geometry;
      });
    }
    for(const width of [320,360,390,430])for(const mode of ['list','grid']){
      await check(`${width}px ${mode} 카드의 모든 버튼이 카드 안 44px이고 실제 선택 가능`,async() => {
        await page.setViewportSize({width,height:844});await page.evaluate(mode => {switchView('hub');resetHubFilters();State.hubViewMode=mode;renderTripCards();},mode);await settle();
        const cards=page.locator('#trip-cards-grid .trip-st-card'),measurements=[];
        assert.equal(await cards.count(),3);
        for(let cardIndex=0;cardIndex<await cards.count();cardIndex++){
          const buttons=cards.nth(cardIndex).locator('button');assert.ok(await buttons.count()>=5,`${mode} 여행 카드의 기록·사진·삭제·열기 행동이 남아 있어야 합니다.`);
          for(let buttonIndex=0;buttonIndex<await buttons.count();buttonIndex++){
            const button=buttons.nth(buttonIndex);await button.evaluate(element => element.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));await settle();
            const bounds=await button.evaluate(element => {
              const rect=element.getBoundingClientRect(),card=element.closest('.trip-st-card').getBoundingClientRect();
              return {name:element.getAttribute('aria-label')||element.title||element.textContent.trim(),width:rect.width,height:rect.height,left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,card:{left:card.left,right:card.right,top:card.top,bottom:card.bottom},hittable:element.contains(document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2))};
            });
            assert.ok(bounds.width>=44&&bounds.height>=44,`작은 카드 버튼: ${JSON.stringify(bounds)}`);
            assert.ok(bounds.left>=bounds.card.left-1&&bounds.right<=bounds.card.right+1&&bounds.top>=bounds.card.top-1&&bounds.bottom<=bounds.card.bottom+1,`카드 경계를 넘는 버튼: ${JSON.stringify(bounds)}`);
            assert.ok(bounds.left>=0&&bounds.right<=width+1&&bounds.hittable,`가려진 카드 버튼: ${JSON.stringify(bounds)}`);measurements.push({cardIndex,buttonIndex,...bounds});
          }
        }
        return {mode,width,buttons:measurements.length,measurements};
      });
    }
    for(const mode of ['list','grid']){
      await check(`${mode} 카드 제목을 키보드 Enter로 열어 여행 화면 진입`,async() => {
        await page.setViewportSize({width:390,height:844});await page.evaluate(mode => {switchView('hub');resetHubFilters();State.hubViewMode=mode;renderTripCards();},mode);await settle();
        const button=page.locator('#trip-cards-grid .hub-trip-open').first(),title=(await button.innerText()).trim();
        assert.equal(await button.evaluate(element => element.tagName),'BUTTON');
        await button.focus();assert.equal(await button.evaluate(element => element===document.activeElement),true);await button.press('Enter');await settle();
        assert.equal(await page.evaluate(() => State.currentView),'workspace');assert.equal(await page.evaluate(() => getActiveTrip().title),title);return {mode,title,keyboardOpened:true};
      });
    }
    for(const width of [320,360,390,430]){
      await check(`${width}px 검색은 전체 입력을 위한 공간과 접근 이름·터치 높이 확보`,async() => {
        await page.setViewportSize({width,height:844});await page.evaluate(() => {switchView('hub');resetHubFilters();});await settle();
        const controls=await page.evaluate(() => ['hub-search-input','hub-filter-sort','btn-hub-view-mode'].map(id => {
          const element=document.getElementById(id),rect=element.getBoundingClientRect();
          const name=element.getAttribute('aria-label') || [...(element.labels||[])].map(label => label.textContent.trim()).join(' ') || element.title;
          return {id,width:rect.width,height:rect.height,left:rect.left,right:rect.right,name};
        }));
        assert.ok(controls[0].width>=180,JSON.stringify(controls));
        assert.ok(controls.every(control => control.height>=44&&control.left>=0&&control.right<=width+1&&control.name?.trim()),JSON.stringify(controls));
        await page.locator('#hub-search-input').fill('교토');await settle();
        assert.equal(await page.locator('#trip-cards-grid .trip-st-card').count(),1);
        assert.match(await page.locator('#trip-cards-grid').textContent(),/가상 교토 산책/);
        await page.locator('#hub-search-input').fill('검색 결과 없는 가상 도시');await settle();
        assert.equal(await page.locator('#trip-cards-grid .trip-st-card').count(),0);
        await page.evaluate(() => resetHubFilters());await settle();assert.equal(await page.locator('#trip-cards-grid .trip-st-card').count(),3);return controls;
      });
    }
    await page.setViewportSize({width:390,height:844});
    for(const theme of ['modern','deepblack','lightgray']){
      await check(`${theme} 버전·진행 상태·검색·필터 글자 대비 4.5 이상`,async() => {
        await page.evaluate(theme => {switchView('hub');resetHubFilters();setTheme(theme);},theme);await settle();
        const samples=await contrast(page,['#app-ver-badge','#hub-search-input','#hub-filter-sort','#tab-filter-all','#tab-filter-ongoing','.travel-status[data-status="ongoing"]']);
        assert.equal(samples.length,6,'진행 여행을 포함한 모든 대비 대상을 실제로 렌더링합니다.');
        const failures=samples.filter(sample => sample.ratio<4.5);assert.deepEqual(failures,[],JSON.stringify(failures));
        await page.screenshot({path:path.join(output,`${theme}-390.png`)});return {minimum:Math.min(...samples.map(sample => sample.ratio)),samples};
      });
    }
    await check('허브 상태 필터가 여행 중·완료·예정 결과를 각각 표시',async() => {
      await page.evaluate(() => {switchView('hub');resetHubFilters();});
      const selected=[];
      for(const [status,title] of [['ongoing','가상 교토 산책'],['planned','가상 오사카 맛집'],['completed','가상 도쿄 회상']]){
        await page.locator(`#tab-filter-${status}`).click();await settle();assert.equal(await page.locator('#trip-cards-grid .trip-st-card').count(),1);assert.match(await page.locator('#trip-cards-grid').textContent(),new RegExp(title));assert.equal(await page.locator(`#tab-filter-${status}`).getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#tab-filter-all').getAttribute('aria-pressed'),'false');selected.push({status,title});
      }
      return selected;
    });
    await check('상세 필터는 접어서 시작하고 선택 후 접어도 조건과 해제 칩 유지',async() => {
      await page.evaluate(() => {switchView('hub');resetHubFilters();});await settle();
      assert.equal(await page.locator('#hub-filter-details').evaluate(element => element.open),false);
      assert.equal(await page.locator('#hub-filter-city').isVisible(),false);
      await page.locator('#hub-filter-details > summary').click();await settle();
      assert.equal(await page.locator('#hub-filter-details').evaluate(element => element.open),true);
      for(const id of ['hub-filter-country','hub-filter-city','hub-filter-concept']){
        const bounds=await page.locator(`#${id}`).evaluate(element => {const rect=element.getBoundingClientRect();return {height:rect.height,left:rect.left,right:rect.right,width:innerWidth};});
        assert.ok(bounds.height>=44&&bounds.left>=0&&bounds.right<=bounds.width+1,JSON.stringify({id,...bounds}));
      }
      await page.locator('#hub-filter-city').selectOption({label:'교토'});await settle();
      assert.equal(await page.locator('#trip-cards-grid .trip-st-card').count(),1);
      await page.locator('#hub-filter-details > summary').click();await settle();
      assert.equal(await page.locator('#hub-filter-city').isVisible(),false);
      assert.equal(await page.locator('#hub-filter-city').inputValue(),'교토');
      assert.equal(await page.locator('#hub-active-chips').isVisible(),true);assert.match(await page.locator('#hub-active-chips').textContent(),/교토/);
      await page.locator('#hub-search-input').fill('산책');await settle();
      assert.equal(await page.locator('#trip-cards-grid .trip-st-card').count(),1);
      await page.evaluate(() => resetHubFilters());await settle();assert.equal(await page.locator('#trip-cards-grid .trip-st-card').count(),3);assert.equal(await page.locator('#hub-active-chips').isVisible(),false);
      return {selectedCity:'교토',retainedWhileCollapsed:true,searchUsesSelectedFilter:true,resetRestores:3};
    });
    await check('구 초안 안내는 가상 식별자로만 재현하고 설명 접기·개인 일정 보존',async() => {
      const before=await page.evaluate(() => {
        const legacy=SulsulTravel.TripAdapter.normalizeTrip({...JSON.parse(JSON.stringify(State.trips[0])),id:'trip_sa_showcase_22d',title:'[가상] 이전 기본 초안 안내 검사',legacyExampleRetired:true});
        State.trips.push(legacy);switchView('hub');resetHubFilters();return JSON.stringify(State.trips.find(trip => trip.id===legacy.id));
      });await settle();
      assert.equal(await page.locator('#legacy-demo-hub-notice').isVisible(),true);
      assert.equal(await page.locator('#legacy-demo-hub-notice details').evaluate(element => element.open),false);
      await page.locator('#legacy-demo-hub-notice summary').click();await settle();
      assert.equal(await page.locator('#legacy-demo-hub-notice details').evaluate(element => element.open),true);
      assert.match(await page.locator('#legacy-demo-hub-notice p').textContent(),/편집한 기록|자동으로 교체하지/);
      assert.equal(await page.evaluate(() => JSON.stringify(State.trips.find(trip => trip.id==='trip_sa_showcase_22d'))),before);
      await page.locator('#legacy-demo-hub-notice summary').click();
      await page.evaluate(() => {State.trips=State.trips.filter(trip => trip.id!=='trip_sa_showcase_22d');switchView('hub');resetHubFilters();});await settle();
      return {syntheticLegacyOnly:true,collapsedByDefault:true,originalUnchanged:true};
    });
    for(const [width,theme] of [[320,'modern'],[390,'modern'],[390,'deepblack']]){
      await page.setViewportSize({width,height:844});await page.evaluate(theme => {switchView('hub');resetHubFilters();State.hubViewMode='list';renderTripCards();setTheme(theme);window.scrollTo({top:0,behavior:'instant'});},theme);await settle();
      await page.screenshot({path:path.join(output,`${theme}-${width}.png`)});
    }
    await check('사용자 동작 중 JavaScript 오류 없음',async() => {assert.deepEqual(errors,[]);return errors;});
    const summary={passed:results.every(result => result.passed),results};fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));if(!summary.passed)process.exitCode=1;
  }finally{await browser.close();}
})().catch(error => {console.error(error);process.exitCode=1;}).finally(() => server.close());

function overlap(first,second){return first.left<second.right-.5&&first.right>second.left+.5&&first.top<second.bottom-.5&&first.bottom>second.top+.5;}
async function contrast(page,selectors){
  return page.evaluate(selectors => {
    const color=value => {const numbers=value.match(/[\d.]+/g)?.map(Number)||[0,0,0];return [numbers[0],numbers[1],numbers[2],numbers[3]??1];};
    const blend=(top,bottom) => top.slice(0,3).map((value,index) => value*top[3]+bottom[index]*(1-top[3])).concat(1);
    const luminance=rgb => rgb.slice(0,3).map(value => {const channel=value/255;return channel<=.04045 ? channel/12.92 : ((channel+.055)/1.055)**2.4;}).reduce((sum,value,index) => sum+value*[.2126,.7152,.0722][index],0);
    return selectors.flatMap(selector => [...document.querySelectorAll(selector)].filter(element => element.getClientRects().length&&getComputedStyle(element).display!=='none').map(element => {
      const ancestors=[];for(let current=element;current;current=current.parentElement)ancestors.push(current);
      const background=ancestors.reverse().reduce((behind,current) => blend(color(getComputedStyle(current).backgroundColor),behind),[255,255,255,1]);
      const first=luminance(blend(color(getComputedStyle(element).color),background)),second=luminance(background);
      return {selector,text:element.textContent.trim().slice(0,70),ratio:Number(((Math.max(first,second)+.05)/(Math.min(first,second)+.05)).toFixed(3))};
    }));
  },selectors);
}
