/* 계획 탭 일정표 회귀 (v2.1.5, 계획 4단계). 합성 여행만 쓰고 외부 호출은 막는다. 조작은 실제 클릭으로 한다.
 * 1) 고도·날씨·복장은 아는 장소일 때만 보인다. 모르는 장소에는 일정표 배지·복장 막대와 오늘 화면 날씨 칩을 그리지 않는다
 *    (v2.1.4까지는 모든 날에 평지 고도·맑은 날씨를 지어 보여 줬다). 쿠스코 같은 고산 일차에는 고도 배지와 고산 관리 카드가 보인다.
 * 2) 일차의 경로 안 HTML(공유 사본으로 들어올 수 있다)은 글자로만 보인다(날짜는 불러올 때 시작일에서 다시 계산된다).
 * 3) 이동 구간 수단: 'Beach'가 든 이동은 항공이 아니고, 항공·열차는 그 낱말로 고른다.
 * 4) 아코디언(머리 클릭·펼침 버튼 aria-expanded)·전체 펼치기, 장소의 완료·고정 저장, 편집·삭제·튜닝·스팟 추가 창, 일정이 없을 때 AI 일정 창.
 * 5) 화면의 모든 data-on-* 이름이 등록되어 있고 페이지 오류가 없으며, 320px에서 가로로 넘치지 않는다. */
const {chromium}=require('./helpers/playwright.cjs');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.woff2':'font/woff2','.ico':'image/x-icon','.webmanifest':'application/manifest+json','.svg':'image/svg+xml'};
const server=http.createServer((req,res) => {
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+(pathname==='/' ? '/index.html' : pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,content) => {if(error){res.writeHead(404).end();return;}res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',types[path.extname(file)] || 'application/octet-stream');res.end(content);});
});
const plain={id:'tl-plain',title:'가상 도시 산책',startDate:'2031-04-01',durationDays:2,countries:['일본'],cities:['가상시'],revision:0,currency:'KRW',activeCurrencies:['KRW'],budget:0,journals:{},activityRecords:{},momentEntries:[],checklist:[],expenses:[],exchanges:[],
  days:[
    {id:'tl-d1',dayNum:1,date:'2031-04-01',title:'첫날 가상 산책',city:'가상시',route:'가상시 <b id="xss-route">굵게</b>',spots:[
      {id:'tl-s1',title:'가상 미술관',time:'10:00',cat:'tour'},
      {id:'tl-s2',title:'호텔 ➔ Beach 이동',time:'14:00'}]},
    {id:'tl-d2',dayNum:2,date:'2031-04-02',title:'둘째 날',city:'가상시',spots:[]}]};
const andes={id:'tl-andes',title:'가상 고산 여행',startDate:'2031-05-01',durationDays:2,countries:['페루'],cities:['쿠스코'],revision:0,currency:'KRW',activeCurrencies:['KRW'],budget:0,journals:{},activityRecords:{},momentEntries:[],checklist:[],expenses:[],exchanges:[],
  days:[
    {id:'tl-a1',dayNum:1,date:'2031-05-01',title:'쿠스코 도착',city:'쿠스코',spots:[
      {id:'tl-a1s1',title:'리마 ➔ 쿠스코 항공 이동',time:'08:00'},
      {id:'tl-a1s2',title:'쿠스코 ➔ 아과스칼리엔테스 기차',time:'15:00'}]},
    {id:'tl-a2',dayNum:2,date:'2031-05-02',title:'휴식',city:'',spots:[]}]};
const empty={id:'tl-empty',title:'일정 없는 가상 여행',startDate:'2031-06-01',durationDays:1,countries:['일본'],cities:[],revision:0,currency:'KRW',activeCurrencies:['KRW'],budget:0,journals:{},activityRecords:{},momentEntries:[],checklist:[],expenses:[],exchanges:[],days:[]};

const results=[];
async function check(name,run){try{results.push({name,passed:true,details:await run()});}catch(error){results.push({name,passed:false,error:String(error.stack||error).slice(0,1200)});}}

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || undefined});
  const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Seoul',serviceWorkers:'block'});
  await context.addInitScript(seed=>{if(!sessionStorage.getItem('tl-seeded')){sessionStorage.setItem('tl-seeded','1');localStorage.setItem('st_demo_choice_v1','started');localStorage.setItem('st_trips_v2',JSON.stringify(seed));}},[plain,andes,empty]);
  const page=await context.newPage(),errors=[];
  page.setDefaultTimeout(10000);
  page.on('pageerror',error=>errors.push(error.message));
  page.on('dialog',dialog=>dialog.accept());
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  const stored=id=>page.evaluate(async id=>JSON.parse(await TripRepository.readRaw()).find(t=>t.id===id),id);
  const isOpen=id=>page.evaluate(id=>{const m=document.getElementById(id);return !!m&&!m.classList.contains('sheet-closed');},id);
  const closeAll=()=>page.evaluate(()=>document.querySelectorAll('.sheet-container').forEach(e=>{if(!e.classList.contains('sheet-closed'))closeModal(e.id,true);}));
  const show=id=>page.evaluate(id=>{document.querySelectorAll('.sheet-container').forEach(e=>{if(!e.classList.contains('sheet-closed'))closeModal(e.id,true);});State.allTimelinesExpanded=false;openTripWorkspace(id);switchTab('plan');SulsulTravel.PlanBlocks.switchSubTab('timeline');},id);
  try{
    await page.goto(origin+'/',{waitUntil:'networkidle'});
    await page.waitForFunction(()=>window.SulsulShell?.started);
    await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}'});

    await check('모르는 장소에는 고도·날씨·복장을 지어내지 않고, 고산 일차에는 고도 배지와 관리 카드가 보인다',async()=>{
      await show('tl-plain');
      const plainCounts=await page.evaluate(()=>({days:document.querySelectorAll('#days-accordion-container .timeline-day').length,altitude:document.querySelectorAll('.timeline-altitude').length,weather:document.querySelectorAll('.timeline-weather').length,outfit:document.querySelectorAll('.timeline-outfit').length}));
      assert.deepEqual(plainCounts,{days:2,altitude:0,weather:0,outfit:0});
      const todayChip=await page.evaluate(()=>getTodayWeatherInfo(getActiveTrip().days[0]));
      assert.deepEqual([todayChip.weatherBadge,todayChip.altitude],[null,null],'오늘 화면 날씨 칩도 값이 없다');
      await show('tl-andes');
      const first=page.locator('#days-accordion-container .timeline-day').first();
      assert.match(await first.locator('.timeline-altitude').textContent(),/해발 3,400m/);
      assert.match(await first.locator('.timeline-weather').textContent(),/아침 5°C/);
      assert.equal(await page.locator('#days-accordion-container .timeline-day').nth(1).locator('.timeline-altitude').count(),0,'모르는 둘째 날에는 없다');
      await page.click('#day-chevron-0');
      assert.equal(await page.isVisible('#day-body-0 .timeline-altitude-care'),true,'고산 관리 카드');
      assert.equal(await page.isVisible('#day-body-0 .timeline-outfit'),true,'복장 막대');
      const andesChip=await page.evaluate(()=>getTodayWeatherInfo(getActiveTrip().days[0]));
      assert.match(andesChip.altitude,/3,400m/);
      return plainCounts;
    });

    await check('일차의 경로 안 HTML은 글자로만 보인다',async()=>{
      await show('tl-plain');
      const text=await page.textContent('#days-accordion-container .timeline-day >> nth=0');
      assert.match(text,/가상시 <b id="xss-route">굵게<\/b>/);
      assert.equal(await page.evaluate(()=>['xss-route'].filter(id=>document.getElementById(id)).length),0);
      return 'ok';
    });

    await check("이동 수단: 'Beach'가 든 이동은 항공이 아니고, 항공·열차는 그 낱말로 고른다",async()=>{
      await show('tl-plain');await page.click('#day-chevron-0');
      const plainKinds=await page.$$eval('#day-body-0 .timeline-transit-kind',els=>els.map(e=>e.textContent.trim()));
      assert.deepEqual(plainKinds,['🚗 이동 구간']);
      await show('tl-andes');await page.click('#day-chevron-0');
      const andesKinds=await page.$$eval('#day-body-0 .timeline-transit-kind',els=>els.map(e=>e.textContent.trim()));
      assert.deepEqual(andesKinds,['✈️ 항공 이동','🚆 열차 이동']);
      return {plainKinds,andesKinds};
    });

    await check('아코디언·전체 펼치기, 완료·고정 저장, 편집·삭제·튜닝·스팟 추가 창, 일정 없을 때 AI 일정 창',async()=>{
      await show('tl-plain');
      assert.equal(await page.isVisible('#day-body-0'),false);
      await page.click('#days-accordion-container .timeline-day >> nth=0 >> h4');
      assert.deepEqual([await page.isVisible('#day-body-0'),await page.getAttribute('#day-chevron-0','aria-expanded')],[true,'true'],'머리를 누르면 펼친다');
      await page.click('#day-chevron-0');
      assert.deepEqual([await page.isVisible('#day-body-0'),await page.getAttribute('#day-chevron-0','aria-expanded')],[false,'false'],'펼침 버튼으로 접는다');
      await page.click('#btn-toggle-all-tl');
      assert.deepEqual([await page.isVisible('#day-body-0'),await page.isVisible('#day-body-1'),await page.getAttribute('#btn-toggle-all-tl','aria-pressed')],[true,true,'true']);
      await page.click('#day-body-0 [data-on-click="timeline.toggleDone"][data-spot="0"]');
      assert.equal((await stored('tl-plain')).days[0].spots[0].completed,true,'완료 저장');
      await page.click('#day-body-0 [data-on-click="timeline.toggleFixed"][data-spot="0"]');
      assert.equal((await stored('tl-plain')).days[0].spots[0].fixed,true,'고정 저장');
      assert.equal(await page.getAttribute('#day-body-0 [data-on-click="timeline.toggleFixed"][data-spot="0"]','aria-pressed'),'true');
      const opened={};
      for(const [action,modal] of [['edit','modal-spot'],['remove','modal-confirm-delete']]){
        await page.click(`#day-body-0 [data-on-click="timeline.${action}"][data-spot="0"]`);opened[action]=await isOpen(modal);await closeAll();
      }
      await page.click('#days-accordion-container .timeline-day >> nth=1 >> [data-on-click="timeline.tune"]');opened.tune=await isOpen('modal-schedule-tuning');await closeAll();
      await page.click('#days-accordion-container .timeline-day >> nth=1 >> [data-on-click="timeline.addSpot"]');
      opened.addSpot=(await isOpen('modal-spot'))&&(await page.inputValue('#spot-form-day'))==='1';await closeAll();
      await page.click('[data-on-click="timeline.tune"]:not([data-day])');opened.tuneAll=await isOpen('modal-schedule-tuning');await closeAll();
      await page.click('[data-on-click="timeline.addSpot"]:not([data-day])');opened.addSpotTop=await isOpen('modal-spot');await closeAll();
      assert.equal((await stored('tl-plain')).days[0].spots.length,2,'창만 열고 지우지 않았다');
      await show('tl-empty');
      assert.equal(await page.isVisible('#banner-ai-recommend'),true);
      await page.click('#banner-ai-recommend [data-on-click="timeline.aiTrip"]');opened.aiTrip=await isOpen('modal-ai-trip');await closeAll();
      assert.deepEqual(opened,{edit:true,remove:true,tune:true,addSpot:true,tuneAll:true,addSpotTop:true,aiTrip:true});
      await page.evaluate(()=>{State.allTimelinesExpanded=false;});
      return opened;
    });

    await check('화면의 모든 data-on-* 이름이 등록되어 있고, 320px에서 가로로 넘치지 않는다',async()=>{
      await page.setViewportSize({width:320,height:740});
      const names=new Map();
      for(const id of ['tl-plain','tl-andes','tl-empty']){
        await show(id);await page.evaluate(()=>SulsulTravel.PlanTimeline.toggleAll());
        for(const [name,ok] of await page.evaluate(()=>[...document.querySelectorAll('[data-on-click],[data-on-change],[data-on-input]')].map(e=>{const name=e.dataset.onClick||e.dataset.onChange||e.dataset.onInput;return [name,SulsulTravel.UiActions.has(name)];})))names.set(name,ok);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${id} 320px`);
        await page.evaluate(()=>SulsulTravel.PlanTimeline.toggleAll());
      }
      assert.deepEqual([...names].filter(([,ok])=>!ok),[]);
      return [...names.keys()].filter(name=>/^timeline\./.test(name)).sort();
    });

    await check('페이지 오류가 없다',async()=>{assert.deepEqual(errors,[]);return 'ok';});
  }finally{await browser.close();server.close();}
  const passed=results.every(result=>result.passed);
  console.log(JSON.stringify({passed,checks:results.length,results},null,2));
  process.exitCode=passed?0:1;
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
