/* 계획 탭 예약 가이드·도시 가이드 회귀 (v2.1.4, 계획 4단계). 합성 여행 세 개(일반·남미 팩·운남 팩)만 쓰고 외부 호출은 막는다.
 * 1) 일반 여행의 예약 가이드: 준비물 체크가 저장되고 완료 수·줄긋기가 바로 바뀐다(예전에는 없는 id를 확인해 다시 그리지 않았다).
 * 2) 남미 팩 예약 체크리스트: 팩의 항목(14개)을 보여 준다(v1.9.0~v2.1.3에는 비워진 KB 목록을 읽어 0개였다). 그리기만으로 여행 자료가 바뀌지 않고,
 *    기한 없는 항목에 기한을 지어내지 않는다. 필터 버튼(aria-pressed)·완료 체크 저장·진행률, 저장 실패 때 체크 표시가 되돌아간다.
 * 3) 도시 가이드: 남미·운남 팩 카드(개인 일정 날짜가 박힌 배너는 없다), 일반 여행의 스팟 모아보기. 스팟의 시간·비용 안 HTML(공유 사본으로 들어올 수 있다)은 글자로만 보인다.
 * 4) 화면의 모든 data-on-* 이름이 등록되어 있고 페이지 오류가 없으며, 320px에서 가로로 넘치지 않는다. */
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
const base=(id,title,countries)=>({id,title,startDate:'2031-03-01',durationDays:2,countries,cities:['가상시'],revision:0,currency:'KRW',activeCurrencies:['KRW'],budget:0,
  days:[{id:`${id}-d1`,dayNum:1,date:'2031-03-01',city:'가상시',spots:[]},{id:`${id}-d2`,dayNum:2,date:'2031-03-02',city:'가상시',spots:[]}],journals:{},activityRecords:{},momentEntries:[],checklist:[],expenses:[],exchanges:[]});
const generic={...base('guides-generic','가상 일반 여행',['일본']),checklist:[{id:'c1',text:'여권 확인',checked:false},{id:'c2',text:'보험 가입',checked:false,urgent:true},{id:'c3',text:'충전기',checked:true}]};
generic.days[0].spots=[{id:'s1',title:'가상 전망대 <i id="xss-title">기울임</i>',time:'09:00 <img id="xss-time" src="x">',cost:'₩1,000 <b id="xss-cost">굵게</b>',desc:'설명',tip:'팁'},
  {id:'s2',title:'취소된 가상 장소',time:'12:00',cancelled:true}];
const southAmerica=base('guides-sa','가상 남미 여행',['페루']);
const yunnan=base('guides-yn','가상 운남 여행',['중국']);

const results=[];
async function check(name,run){try{results.push({name,passed:true,details:await run()});}catch(error){results.push({name,passed:false,error:String(error.stack||error).slice(0,1200)});}}

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || undefined});
  const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Seoul',serviceWorkers:'block'});
  await context.addInitScript(seed=>{if(!sessionStorage.getItem('pg-seeded')){sessionStorage.setItem('pg-seeded','1');localStorage.setItem('st_demo_choice_v1','started');localStorage.setItem('st_trips_v2',JSON.stringify(seed));}},[generic,southAmerica,yunnan]);
  const page=await context.newPage(),errors=[];
  page.setDefaultTimeout(10000);
  page.on('pageerror',error=>errors.push(error.message));
  page.on('dialog',dialog=>dialog.accept());
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  const stored=id=>page.evaluate(async id=>JSON.parse(await TripRepository.readRaw()).find(t=>t.id===id),id);
  const show=(id,sub)=>page.evaluate(([id,sub])=>{document.querySelectorAll('.sheet-container').forEach(e=>{if(!e.classList.contains('sheet-closed'))closeModal(e.id,true);});openTripWorkspace(id);switchTab('plan');SulsulTravel.PlanBlocks.switchSubTab(sub);},[id,sub]);
  try{
    await page.goto(origin+'/',{waitUntil:'networkidle'});
    await page.waitForFunction(()=>window.SulsulShell?.started);
    await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}'});

    await check('일반 여행 예약 가이드: 준비물 체크가 저장되고 완료 수·줄긋기가 바로 바뀐다',async()=>{
      await show('guides-generic','booking');
      assert.match(await page.textContent('#booking-header-title'),/가상 일반 여행 필수 준비 & 예약 체크리스트/);
      assert.match(await page.textContent('#booking-checklist-count'),/\(1\/3 완료\)/);
      const box=page.locator('#booking-cards-container input[data-on-change="checklist.toggle"][data-index="0"]');
      await box.scrollIntoViewIfNeeded();await box.click();
      assert.deepEqual((await stored('guides-generic')).checklist.map(item=>item.checked),[true,false,true]);
      assert.match(await page.textContent('#booking-checklist-count'),/\(2\/3 완료\)/,'완료 수가 바로 바뀐다');
      assert.equal(await page.locator('#booking-cards-container input[data-index="0"] + span').evaluate(span=>span.classList.contains('line-through')),true,'줄긋기');
      return 'ok';
    });

    await check('남미 팩 사전 예약: 그리기만으로 자료가 바뀌지 않고, 필터·완료 체크·진행률이 동작하며 저장 실패 때 되돌아간다',async()=>{
      await show('guides-sa','booking');
      assert.equal(await page.evaluate(()=>'bookingStatuses' in getActiveTrip()),false,'그리기만으로 예약 상태 객체를 만들지 않는다');
      const total=await page.locator('#booking-cards-container .booking-guide-card').count();
      const pack=await page.evaluate(()=>{const b=resolveTripPack(getActiveTrip()).bookings;return {count:b.items.length,title:b.headerTitle};});
      assert.equal(total,pack.count,'팩의 예약 항목을 모두 보여 준다');assert.ok(total>=10);
      assert.equal(await page.textContent('#booking-header-title'),pack.title);
      assert.equal(await page.locator('#booking-cards-container .booking-guide-card').filter({hasText:'오픈 예정'}).count(),0,'기한 없는 항목에 D-n을 지어내지 않는다');
      await page.click('#btn-booking-filter-urgent');
      assert.equal(await page.locator('#booking-cards-container .booking-guide-card').count(),0,'기한 없는 항목은 마감 임박이 아니다');
      await page.click('#btn-booking-filter-all');
      assert.equal(await page.textContent('#btn-booking-filter-all'),`전체 (${total})`);
      const first=page.locator('#booking-cards-container input[data-on-change="guides.toggleBooking"]').first();
      const guideId=await first.getAttribute('data-guide');
      await first.scrollIntoViewIfNeeded();await first.click();
      assert.equal((await stored('guides-sa')).bookingStatuses[guideId],true,'완료 저장');
      assert.match(await page.textContent('#booking-progress-badge'),new RegExp(`^1/${total} 완료`));
      await page.click('#btn-booking-filter-completed');
      assert.deepEqual([await page.getAttribute('#btn-booking-filter-completed','aria-pressed'),await page.getAttribute('#btn-booking-filter-all','aria-pressed'),await page.locator('#booking-cards-container .booking-guide-card').count()],['true','false',1]);
      await page.click('#btn-booking-filter-all');
      // 저장 실패: 체크 표시가 저장된 상태로 되돌아간다.
      await page.evaluate(()=>{window.pgOldSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='st_trips_v2')throw new DOMException('synthetic quota','QuotaExceededError');return window.pgOldSetItem.call(this,k,v);};});
      const second=page.locator('#booking-cards-container input[data-on-change="guides.toggleBooking"]').nth(1);
      const secondId=await second.getAttribute('data-guide');
      try{await second.scrollIntoViewIfNeeded();await second.click();}
      finally{await page.evaluate(()=>{Storage.prototype.setItem=window.pgOldSetItem;});}
      assert.equal(Boolean((await stored('guides-sa')).bookingStatuses[secondId]),false,'실패한 체크는 저장되지 않는다');
      assert.equal(await page.locator(`#booking-cards-container input[data-guide="${secondId}"]`).isChecked(),false,'체크 표시도 되돌아간다');
      const links=await page.$$eval('#booking-cards-container .booking-guide-card',cards=>cards.map(card=>card.querySelector('a')?.getAttribute('href')||null));
      assert.ok(links.every(href=>href===null||/^https:\/\//.test(href)));
      assert.equal(links.some(href=>href&&/google\.com\/search/.test(href)),false,'일반 항목을 검색 주소로 보내지 않는다');
      return {total,guideId};
    });

    await check('도시 가이드: 남미·운남 팩 카드와 일반 여행 스팟 모아보기, 스팟 값 안 HTML은 글자로만 보인다',async()=>{
      await show('guides-sa','cityguide');
      const sa=await page.locator('#cityguide-cards-container .city-guide-card').count();
      assert.ok(sa>=5,'남미 거점 도시');
      assert.doesNotMatch(await page.textContent('#cityguide-cards-container'),/골든룰|10\/1\d~|10\/2\d/,'개인 일정 날짜가 박힌 배너가 없다');
      assert.equal(await page.textContent('#cityguide-header-title'),await page.evaluate(()=>resolveTripPack(getActiveTrip()).cities.headerTitle));
      await show('guides-yn','cityguide');
      const yn=await page.locator('#cityguide-cards-container .city-guide-card').count();
      assert.ok(yn>=3,'운남 거점 도시');
      await show('guides-generic','cityguide');
      const spots=await page.locator('#cityguide-cards-container .city-spot-card').count();
      assert.equal(spots,1,'취소한 스팟은 빼고 모은다');
      const text=await page.textContent('#cityguide-cards-container');
      assert.match(text,/Day 1 · 09:00 <img id="xss-time" src="x">/);assert.match(text,/₩1,000 <b id="xss-cost">굵게<\/b>/);assert.match(text,/가상 전망대 <i id="xss-title">기울임<\/i>/);
      assert.equal(await page.evaluate(()=>['xss-time','xss-cost','xss-title'].filter(id=>document.getElementById(id)).length),0,'HTML 요소로 만들어지지 않는다');
      const href=await page.locator('#cityguide-cards-container .city-spot-card a').getAttribute('href');
      assert.ok(href.startsWith('https://www.google.com/maps/search/?api=1&query='));
      return {sa,yn,spots};
    });

    await check('화면의 모든 data-on-* 이름이 등록되어 있고, 320px에서 가로로 넘치지 않는다',async()=>{
      await page.setViewportSize({width:320,height:740});
      const names=new Map();
      for(const [id,sub] of [['guides-generic','booking'],['guides-sa','booking'],['guides-sa','cityguide'],['guides-generic','cityguide']]){
        await show(id,sub);
        for(const [name,ok] of await page.evaluate(()=>[...document.querySelectorAll('[data-on-click],[data-on-change],[data-on-input]')].map(e=>{const name=e.dataset.onClick||e.dataset.onChange||e.dataset.onInput;return [name,SulsulTravel.UiActions.has(name)];})))names.set(name,ok);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${id} ${sub} 320px`);
      }
      assert.deepEqual([...names].filter(([,ok])=>!ok),[]);
      return [...names.keys()].filter(name=>/^guides\./.test(name)).sort();
    });

    await check('페이지 오류가 없다',async()=>{assert.deepEqual(errors,[]);return 'ok';});
  }finally{await browser.close();server.close();}
  const passed=results.every(result=>result.passed);
  console.log(JSON.stringify({passed,checks:results.length,results},null,2));
  process.exitCode=passed?0:1;
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
