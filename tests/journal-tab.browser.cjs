/* 기록 탭 화면 분리 회귀 (v2.1.0, 계획 4단계 두 번째 화면). 합성 여행·합성 사진만 사용한다. 모든 조작은 실제 클릭·입력·파일 선택으로 한다.
 * 1) 날짜 버튼이 날짜를 바꾸고, 입력 중인 글(data-on-input)은 날짜를 오가도 그 날짜에 남는다.
 * 2) '일기 저장'이 그 날짜에 저장한다.
 * 3) 사진 추가(data-on-change) → 크게 보기 → 닫기 → 안전 삭제가 저장소까지 이어진다.
 * 4) 'AI로 다듬기'는 원문을 먼저 저장하고 검토 창을 연다(실제 AI 대신 합성 생성기).
 * 5) 머리 버튼(매거진 뷰·가계부 열기)과 PDF 여행기 버튼이 각자의 화면을 연다.
 * 6) 셸의 다른 길(키보드 ←/→, 오늘 화면의 '하루 회고 작성')도 새 화면 API로 날짜를 고른다.
 * 7) 화면의 모든 data-on-* 이름이 등록되어 있고 페이지 오류가 없으며, 320px에서 가로로 넘치지 않는다. */
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
// 오늘 화면 검사를 위해 어제·오늘·내일 3일 여행을 만든다. 오늘 일정은 모두 완료로 둔다.
const seoul=date=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(date);
const DAY=864e5,now=Date.now(),dates=[seoul(new Date(now-DAY)),seoul(new Date(now)),seoul(new Date(now+DAY))];
const TRIP_ID='journal-tab-trip';
const seedTrip={id:TRIP_ID,title:'가상 기록 탭 여행',startDate:dates[0],endDate:dates[2],durationDays:3,timeZone:'Asia/Seoul',countries:['대한민국'],cities:['가상시'],revision:0,currency:'KRW',activeCurrencies:['KRW'],
  days:dates.map((date,i)=>({id:`jt-d${i+1}`,dayNum:i+1,date,city:'가상시',title:`가상 하루 ${i+1}`,spots:[{id:`jt-s${i+1}`,time:'09:00',title:`가상 산책 ${i+1}`,completed:i===1}]})),
  journals:{},activityRecords:{},momentEntries:[],expenses:[],checklist:[]};

const results=[];
async function check(name,run){try{results.push({name,passed:true,details:await run()});}catch(error){results.push({name,passed:false,error:String(error.stack||error).slice(0,1200)});}}

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || undefined});
  const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Seoul',serviceWorkers:'block'});
  await context.addInitScript(seed=>{if(!sessionStorage.getItem('jt-seeded')){sessionStorage.setItem('jt-seeded','1');localStorage.setItem('st_demo_choice_v1','started');localStorage.setItem('st_trips_v2',JSON.stringify([seed]));}},seedTrip);
  const page=await context.newPage(),errors=[],dialogs=[];
  page.setDefaultTimeout(10000);
  page.on('pageerror',error=>errors.push(error.message));
  page.on('dialog',dialog=>{dialogs.push(dialog.message());dialog.accept();});
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  const storedJournal=dayIndex=>page.evaluate(async({id,dayIndex})=>{const trip=JSON.parse(await TripRepository.readRaw()).find(t=>t.id===id);const entry=SulsulTravel.TripAdapter.getJournalEntry(trip,dayIndex);return entry?{text:entry.text||'',photos:(entry.photos||[]).length,mediaIds:(entry.mediaIds||[]).filter(Boolean).length}:null;},{id:TRIP_ID,dayIndex});
  const openJournal=()=>page.evaluate(id=>{openTripWorkspace(id);switchTab('journal');},TRIP_ID);
  const isOpen=id=>page.evaluate(id=>{const m=document.getElementById(id);return !!m&&!m.classList.contains('sheet-closed');},id);
  try{
    await page.goto(origin+'/',{waitUntil:'networkidle'});
    await page.waitForFunction(()=>window.SulsulShell?.started);
    await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}'});
    await openJournal();

    await check('날짜 버튼이 날짜를 바꾸고, 입력 중인 글은 날짜를 오가도 그 날짜에 남는다',async()=>{
      await page.click('#journal-day-pills [data-on-click="journal.day"][data-day="1"]');
      const picked=await page.evaluate(()=>({day:State.activeJournalDay,dayId:document.getElementById('journal-text-input').dataset.dayId,pressed:document.querySelector('#journal-day-pills [data-day="1"]').getAttribute('aria-pressed')}));
      assert.deepEqual(picked,{day:1,dayId:'jt-d2',pressed:'true'});
      await page.fill('#journal-text-input','둘째 날의 작성 중 회고');
      await page.click('#journal-day-pills [data-day="0"]');
      assert.equal(await page.inputValue('#journal-text-input'),'','다른 날짜는 빈 글');
      await page.click('#journal-day-pills [data-day="1"]');
      assert.equal(await page.inputValue('#journal-text-input'),'둘째 날의 작성 중 회고','작성 중 글이 그 날짜에 남는다');
      return picked;
    });

    await check("'일기 저장'이 그 날짜에 저장한다",async()=>{
      await page.click('[data-on-click="journal.saveText"]');
      assert.deepEqual(await storedJournal(1),{text:'둘째 날의 작성 중 회고',photos:0,mediaIds:0});
      assert.equal(await storedJournal(0),null,'다른 날짜는 그대로');
      assert.match(await page.textContent('#sulsul-global-toast'),/일기를 이 기기에 저장했습니다/);
      return 'ok';
    });

    await check('사진 추가 → 크게 보기 → 닫기 → 안전 삭제가 저장소까지 이어진다',async()=>{
      const png=await page.evaluate(async()=>{const c=document.createElement('canvas');c.width=900;c.height=600;const x=c.getContext('2d');x.fillStyle='#4a7c59';x.fillRect(0,0,900,600);x.fillStyle='#f4a261';x.fillRect(200,150,400,300);return c.toDataURL('image/png').split(',')[1];});
      await page.setInputFiles('#journal-day-card input[data-on-change="journal.photoUpload"]',{name:'synthetic-reflection.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
      await page.waitForFunction(()=>document.querySelectorAll('#journal-day-card [data-on-click="journal.viewPhoto"]').length===1);
      assert.deepEqual(await storedJournal(1),{text:'둘째 날의 작성 중 회고',photos:1,mediaIds:1},'사진이 보관소 ID와 함께 저장');
      await page.click('#journal-day-card [data-on-click="journal.viewPhoto"][data-photo="0"]');
      assert.equal(await isOpen('modal-journal-photo'),true);
      assert.match(await page.getAttribute('#journal-full-photo','src'),/^data:image\//);
      await page.waitForTimeout(400); // closeModal은 연 지 350ms 안의 닫기를 연타로 보고 무시한다(앱 동작)
      await page.click('#modal-journal-photo header [data-on-click="journal.closePhoto"]');
      assert.equal(await isOpen('modal-journal-photo'),false);
      await page.click('#journal-day-card [data-on-click="journal.removePhoto"][data-photo="0"]');
      assert.equal(await page.textContent('#confirm-delete-target'),'Day 2 등록 사진');
      await page.click('#confirm-delete-btn');
      assert.deepEqual(await storedJournal(1),{text:'둘째 날의 작성 중 회고',photos:0,mediaIds:0},'삭제 저장');
      assert.equal(await page.locator('#journal-day-card [data-on-click="journal.viewPhoto"]').count(),0);
      return 'ok';
    });

    await check("'AI로 다듬기'는 원문을 먼저 저장하고 검토 창을 연다",async()=>{
      await page.evaluate(async()=>{const {Orchestrator}=await import('../js/application/orchestration.mjs');aiOrchestratorPromise=Promise.resolve(new Orchestrator({generate:async()=>({text:'합성 AI 회고 다듬은 글'}),validate:validateAiDraftPayload,applyDraft:applyAiDraftPayload}));});
      await page.fill('#journal-text-input','AI에 맡길 합성 회고 원문');
      await page.click('[data-on-click="journal.aiPolish"]');
      await page.waitForFunction(()=>!document.getElementById('modal-ai-draft-review').classList.contains('sheet-closed'));
      assert.equal(await page.textContent('#ai-draft-review-original'),'AI에 맡길 합성 회고 원문');
      assert.equal((await storedJournal(1)).text,'AI에 맡길 합성 회고 원문','원문을 먼저 저장');
      await page.evaluate(()=>rejectActiveAiDraft());
      return 'ok';
    });

    await check('머리 버튼(매거진 뷰·가계부 열기)과 PDF 여행기 버튼이 각자의 화면을 연다',async()=>{
      await page.evaluate(()=>document.querySelectorAll('.sheet-container').forEach(element=>closeModal(element.id,true)));
      await openJournal();
      await page.click('#tab-content-journal [data-on-click="journal.magazine"]');
      assert.equal(await isOpen('modal-story-magazine'),true,'매거진');
      await page.evaluate(()=>closeModal('modal-story-magazine',true));
      await page.click('#journal-day-card details.journal-story-export > summary');
      await page.click('[data-on-click="journal.storyPdf"]');
      assert.equal(await isOpen('modal-pdf-report'),true,'PDF 여행기');
      await page.evaluate(()=>closeModal('modal-pdf-report',true));
      await page.click('#journal-open-expenses-btn');
      assert.equal(await page.evaluate(()=>State.activeTab),'expenses','가계부');
      return 'ok';
    });

    await check("셸의 다른 길(키보드 ←/→, 오늘 화면의 '하루 회고 작성')도 날짜를 고른다",async()=>{
      await openJournal();
      await page.click('#journal-day-pills [data-day="0"]');
      await page.evaluate(()=>document.activeElement?.blur());
      await page.keyboard.press('ArrowRight');
      const afterKey=await page.evaluate(()=>({day:State.activeJournalDay,input:document.getElementById('journal-text-input').dataset.dayId}));
      assert.deepEqual(afterKey,{day:1,input:'jt-d2'},'→ 키');
      await page.keyboard.press('ArrowLeft');
      assert.equal(await page.evaluate(()=>State.activeJournalDay),0,'← 키');
      await page.evaluate(()=>switchTab('today'));
      const shortcut=page.locator('#tab-content-today button:has-text("하루 회고 작성")').first();
      await shortcut.scrollIntoViewIfNeeded();await shortcut.click();
      const fromToday=await page.evaluate(()=>({tab:State.activeTab,day:State.activeJournalDay,input:document.getElementById('journal-text-input')?.dataset.dayId}));
      assert.deepEqual(fromToday,{tab:'journal',day:1,input:'jt-d2'},'오늘 화면의 하루 회고 작성');
      return {afterKey,fromToday};
    });

    await check('화면의 모든 data-on-* 이름이 등록되어 있고, 320px에서 가로로 넘치지 않는다',async()=>{
      await page.setViewportSize({width:320,height:740});await openJournal();
      await page.click('#journal-day-card details.journal-story-export > summary');
      const names=await page.evaluate(()=>[...new Set([...document.querySelectorAll('[data-on-click],[data-on-change],[data-on-input]')].map(e=>e.dataset.onClick||e.dataset.onChange||e.dataset.onInput))].map(name=>[name,SulsulTravel.UiActions.has(name)]));
      assert.deepEqual(names.filter(([,ok])=>!ok),[]);
      assert.ok(names.filter(([name])=>name.startsWith('journal.')).length>=8,'기록 탭 동작이 화면에 있다');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      return names.map(([name])=>name).sort();
    });

    await check('페이지 오류가 없다',async()=>{assert.deepEqual(errors,[]);return {dialogs};});
  }finally{await browser.close();server.close();}
  const passed=results.every(result=>result.passed);
  console.log(JSON.stringify({passed,checks:results.length,results},null,2));
  process.exitCode=passed?0:1;
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
