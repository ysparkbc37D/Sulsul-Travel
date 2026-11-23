/* 준비물 화면 분리 회귀 (v2.0.9, 계획 4단계 첫 화면). 합성 여행만 사용한다. 모든 조작은 실제 클릭으로 한다.
 * 1) 보기 전환(카테고리별·D-Day 시점별)이 동작한다 — v1.8.4부터 없는 함수(setChecklistViewMode)를 불러 먹통이었다.
 * 2) 분류 칩·미완료만 보기·체크·전체 완료가 저장소에 남는다.
 * 3) 예약 가이드의 준비물 체크가 저장된다 — v1.1.7부터 없는 함수(toggleTripChecklistItem)를 불렀다.
 * 4) '준비물 추가'가 실제 창을 열고 저장한다 — v1.1.7부터 없는 창(modal-checklist-add)을 열었다. 상세 창에서 안전 삭제한다.
 * 5) 보기 전용 공동 계획에서는 체크가 저장되지 않고 화면도 저장된 상태로 돌아간다.
 * 6) 화면에 있는 모든 data-on-click·data-on-change 이름이 등록되어 있고, 등록되지 않은 이름은 오류로 드러난다.
 * 7) 320px에서 준비물 화면과 추가 창이 가로로 넘치지 않고 터치 영역이 44px 이상이다. */
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
const TRIP_ID='chk-trip';
const seedTrip={id:TRIP_ID,title:'가상 준비물 점검 여행',startDate:'2030-07-01',durationDays:2,countries:['대한민국'],cities:['가상시'],revision:0,currency:'KRW',activeCurrencies:['KRW'],
  days:[{id:'chk-d1',dayNum:1,date:'2030-07-01',city:'가상시',spots:[{id:'chk-s1',time:'09:00',title:'가상 산책'}]},{id:'chk-d2',dayNum:2,date:'2030-07-02',city:'가상시',spots:[]}],
  journals:{},activityRecords:{},momentEntries:[],expenses:[],
  checklist:[{text:'여권 유효기간 확인',urgent:true,checked:false},{text:'보조배터리 챙기기',urgent:false,checked:false},{text:'가상 우산',urgent:false,checked:true}]};

const results=[];
async function check(name,run){try{results.push({name,passed:true,details:await run()});}catch(error){results.push({name,passed:false,error:String(error.stack||error).slice(0,1200)});}}

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || undefined});
  const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Seoul',serviceWorkers:'block'});
  await context.addInitScript(seed=>{if(!sessionStorage.getItem('chk-seeded')){sessionStorage.setItem('chk-seeded','1');localStorage.setItem('st_demo_choice_v1','started');localStorage.setItem('st_trips_v2',JSON.stringify([seed]));}},seedTrip);
  const page=await context.newPage(),errors=[];
  page.setDefaultTimeout(10000);
  page.on('pageerror',error=>errors.push(error.message));
  page.on('dialog',dialog=>dialog.accept());
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  const stored=()=>page.evaluate(async id=>JSON.parse(await TripRepository.readRaw()).find(trip=>trip.id===id).checklist,TRIP_ID);
  const rows=()=>page.$$eval('#checklist-container .checklist-detail span',spans=>spans.map(span=>span.textContent.trim()));
  const openChecklist=()=>page.evaluate(id=>{openTripWorkspace(id);switchTab('checklist');},TRIP_ID);
  try{
    await page.goto(origin+'/',{waitUntil:'networkidle'});
    await page.waitForFunction(()=>window.SulsulShell?.started);
    await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}'});
    await openChecklist();

    await check('보기 전환(카테고리별·D-Day 시점별)이 실제 클릭으로 동작한다',async()=>{
      assert.deepEqual(await rows(),['여권 유효기간 확인','보조배터리 챙기기','가상 우산']);
      await page.click('#btn-chk-mode-dday');
      const dday=await page.evaluate(()=>({mode:State.checklistViewMode,groups:[...document.querySelectorAll('#checklist-container h4 > span:first-child')].map(e=>e.textContent.trim()),pressed:document.getElementById('btn-chk-mode-dday').getAttribute('aria-pressed'),active:document.getElementById('btn-chk-mode-dday').classList.contains('subtab-active')}));
      assert.deepEqual(dday,{mode:'dday',groups:['D-30 이전','D-1','현지 휴대'],pressed:'true',active:true});
      await page.click('#btn-chk-mode-cat');
      assert.equal(await page.evaluate(()=>State.checklistViewMode),'category');assert.equal(await page.getAttribute('#btn-chk-mode-cat','aria-pressed'),'true');
      return dday.groups;
    });

    await check('분류 칩·미완료만 보기·체크·전체 완료가 저장소에 남는다',async()=>{
      await page.click('#checklist-category-chips [data-category="📄 서류"]');
      assert.deepEqual(await rows(),['여권 유효기간 확인'],'서류 분류');
      await page.click('#checklist-category-chips [data-category="전체"]');
      await page.click('#btn-chk-uncompleted');
      assert.deepEqual(await rows(),['여권 유효기간 확인','보조배터리 챙기기'],'미완료만');assert.equal(await page.getAttribute('#btn-chk-uncompleted','aria-pressed'),'true');
      await page.click('#btn-chk-uncompleted');
      await page.click('#checklist-container input[data-index="1"]');
      assert.deepEqual((await stored()).map(item=>item.checked),[false,true,true],'한 줄 체크 저장');
      assert.equal(await page.isChecked('#checklist-container input[data-index="1"]'),true);
      await page.click('[data-on-click="checklist.checkAll"]');
      assert.deepEqual((await stored()).map(item=>item.checked),[true,true,true],'전체 완료 저장');
      assert.match(await page.textContent('#checklist-progress-badge'),/100% 준비됨 \(3\/3\)/);
      await page.click('#checklist-container input[data-index="0"]');
      assert.deepEqual((await stored()).map(item=>item.checked),[false,true,true]);
      return 'ok';
    });

    await check('예약 가이드의 준비물 체크가 저장되고, 예약 가이드의 준비물 추가가 창을 연다',async()=>{
      await page.evaluate(()=>{switchTab('plan');switchPlanSubTab('booking');});
      const box=page.locator('#booking-cards-container input[data-on-change="checklist.toggle"][data-index="0"]');
      await box.scrollIntoViewIfNeeded();await box.click();
      assert.deepEqual((await stored()).map(item=>item.checked),[true,true,true],'예약 가이드에서 체크');
      assert.equal(await box.isChecked(),true,'다시 그린 뒤에도 체크');
      const add=page.locator('#booking-cards-container [data-on-click="checklist.add"]');
      await add.scrollIntoViewIfNeeded();await add.click();
      assert.equal(await page.evaluate(()=>!document.getElementById('modal-checklist-add')?.classList.contains('sheet-closed')),true,'추가 창이 열린다');
      await page.click('#modal-checklist-add [data-on-click="checklist.close"][data-sheet="modal-checklist-add"] >> nth=-1');
      assert.equal(await page.evaluate(()=>document.getElementById('modal-checklist-add').classList.contains('sheet-closed')),true);
      return 'ok';
    });

    await check('준비물 추가는 이름이 있어야 저장되고, 상세 창에서 안전 삭제한다',async()=>{
      await openChecklist();
      await page.click('#btn-chk-add');
      await page.click('#checklist-add-save');
      assert.equal(await page.textContent('#checklist-add-feedback'),'준비물 이름을 적어 주세요.');
      assert.equal((await stored()).length,3,'빈 이름은 저장하지 않는다');
      await page.fill('#checklist-add-text','  가상 멀티 어댑터  ');
      await page.selectOption('#checklist-add-cat','전자기기');
      await page.check('#checklist-add-urgent');
      await page.click('#checklist-add-save');
      const added=(await stored())[3];
      assert.equal(added.text,'가상 멀티 어댑터');assert.equal(added.cat,'전자기기');assert.equal(added.urgent,true);assert.equal(added.checked,false);assert.match(added.id,/^chk_/);
      assert.equal(await page.evaluate(()=>document.getElementById('modal-checklist-add').classList.contains('sheet-closed')),true,'저장 뒤 닫힌다');
      await page.click('#checklist-category-chips [data-category="🔌 전자기기"]');
      assert.ok((await rows()).includes('가상 멀티 어댑터'),'분류 필터에 보인다');
      await page.click('#checklist-category-chips [data-category="전체"]');
      await page.click('#checklist-container [data-on-click="checklist.details"][data-index="3"]');
      assert.equal(await page.textContent('#checklist-item-text'),'가상 멀티 어댑터');assert.equal(await page.textContent('#checklist-item-meta'),'전자기기 · 필수 · 준비 전');
      await page.click('#checklist-item-remove');
      assert.equal(await page.textContent('#confirm-delete-target'),'가상 멀티 어댑터');
      await page.click('#confirm-delete-btn');
      assert.deepEqual((await stored()).map(item=>item.text),['여권 유효기간 확인','보조배터리 챙기기','가상 우산'],'삭제 저장');
      assert.equal(await page.evaluate(()=>document.getElementById('modal-checklist-item').classList.contains('sheet-closed')),true);
      return added;
    });

    await check('보기 전용 공동 계획에서는 체크가 저장되지 않고 화면도 저장된 상태로 돌아간다',async()=>{
      const before=await stored();
      await page.evaluate(()=>{window.__realCanEdit=SulsulTravel.CollaborationUI.canEditSharedTrip;SulsulTravel.CollaborationUI.canEditSharedTrip=()=>false;});
      try{
        await page.click('#checklist-container input[data-index="1"]');
        assert.equal(await page.isChecked('#checklist-container input[data-index="1"]'),before[1].checked,'화면이 저장된 상태로 돌아간다');
        await page.click('[data-on-click="checklist.checkAll"]');
        await page.click('#btn-chk-add');
        assert.equal(await page.evaluate(()=>document.getElementById('modal-checklist-add').classList.contains('sheet-closed')),true,'추가 창을 열지 않는다');
      }finally{await page.evaluate(()=>{SulsulTravel.CollaborationUI.canEditSharedTrip=window.__realCanEdit;delete window.__realCanEdit;});}
      assert.deepEqual(await stored(),before,'저장소는 그대로');
      return 'ok';
    });

    await check('화면의 모든 동작 이름이 등록되어 있고, 등록되지 않은 이름은 오류로 드러난다',async()=>{
      await page.evaluate(()=>{switchTab('plan');switchPlanSubTab('booking');});
      const fromBooking=await page.evaluate(()=>[...document.querySelectorAll('[data-on-click],[data-on-change],[data-on-input]')].map(e=>e.dataset.onClick||e.dataset.onChange||e.dataset.onInput));
      await openChecklist();
      await page.click('#checklist-container [data-on-click="checklist.details"][data-index="0"]');
      const all=await page.evaluate(names=>{const seen=new Set([...names,...[...document.querySelectorAll('[data-on-click],[data-on-change],[data-on-input]')].map(e=>e.dataset.onClick||e.dataset.onChange||e.dataset.onInput)]);return [...seen].map(name=>[name,SulsulTravel.UiActions.has(name)]);},fromBooking);
      await page.click('#modal-checklist-item [data-on-click="checklist.close"] >> nth=-1');
      assert.deepEqual(all.filter(([,ok])=>!ok),[],'등록되지 않은 동작');
      const before=errors.length;
      await page.evaluate(()=>{const b=document.createElement('button');b.id='unknown-action-probe';b.dataset.onClick='nope.missing';b.textContent='probe';b.style.cssText='position:fixed;top:8px;left:8px;z-index:2147483647;min-width:44px;min-height:44px';document.body.append(b);});
      await page.click('#unknown-action-probe');await page.waitForTimeout(50);
      const raised=errors.slice(before);errors.splice(before);
      await page.evaluate(()=>document.getElementById('unknown-action-probe').remove());
      assert.ok(raised.some(message=>message.includes('UNKNOWN_UI_ACTION: nope.missing')),'등록되지 않은 이름은 오류: '+JSON.stringify(raised));
      return all.map(([name])=>name).sort();
    });

    await check('320px에서 준비물 화면과 추가 창이 넘치지 않고 터치 영역이 44px 이상이다',async()=>{
      await page.setViewportSize({width:320,height:740});await openChecklist();
      const tab=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,small:[...document.querySelectorAll('#tab-content-checklist input[type=checkbox]')].map(e=>e.closest('label').getBoundingClientRect()).filter(r=>r.width<44||r.height<44).length}));
      await page.click('#btn-chk-add');
      const sheet=await page.evaluate(()=>{const box=document.querySelector('#modal-checklist-add .sheet-box').getBoundingClientRect();const controls=[...document.querySelectorAll('#modal-checklist-add input, #modal-checklist-add select, #modal-checklist-add button')].filter(e=>e.type!=='checkbox');return {overflow:document.documentElement.scrollWidth>innerWidth,contained:box.left>=0&&box.right<=innerWidth+1,small:controls.filter(e=>{const r=e.getBoundingClientRect();return r.height<44;}).map(e=>e.id||e.textContent.trim()),fontSizes:[...document.querySelectorAll('#modal-checklist-add input[type=text],#modal-checklist-add select')].map(e=>getComputedStyle(e).fontSize)};});
      await page.click('#modal-checklist-add [data-on-click="checklist.close"] >> nth=-1');
      assert.deepEqual(tab,{overflow:false,small:0});
      assert.deepEqual(sheet,{overflow:false,contained:true,small:[],fontSizes:['16px','16px']});
      return {tab,sheet};
    });

    await check('페이지 오류가 없다',async()=>{assert.deepEqual(errors,[]);return 'ok';});
  }finally{await browser.close();server.close();}
  const passed=results.every(result=>result.passed);
  console.log(JSON.stringify({passed,checks:results.length,results},null,2));
  process.exitCode=passed?0:1;
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
