/* 지출 입력창 통합 회귀 (v2.1.3, 계획 4단계). 합성 여행만 쓰고 외부 호출은 막는다. 조작은 실제 클릭·입력으로 한다.
 * 1) 새 내역: 간편·상세 전환, 카드·현금(지갑 카드의 선택 표시가 숨은 select와 같다), 지출·수입, 카테고리, 통화 칩, 지갑 카드 → 저장 버튼.
 * 2) 사진: 파일 고르기 → 대표 지정 → 확대·닫기 → 제외(확인) → 사진 추가 버튼이 파일 고르기를 연다.
 * 3) 예전 내역 편집: 결제수단이 없는 원화 내역은 원화 지갑으로 읽고, 지금 목록에 없는 결제수단은 기본 지갑을 고르며 알린다.
 *    결제수단 값 안의 HTML(공유 사본으로 들어올 수 있다)은 요소가 되지 않는다.
 * 4) AI 영수증 초안의 통화가 이 여행의 통화 목록에 없어도(THB) 칩·숨은 select에 더해 고르고, 그 환율로 저장한다.
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
const TRIP_ID='expense-form-trip';
const seedTrip={id:TRIP_ID,title:'가상 지출 여행',startDate:'2030-10-01',durationDays:2,countries:['미국'],cities:['가상시'],revision:0,currency:'KRW',activeCurrencies:['KRW','USD'],budget:500000,initialBalances:{KRW:500000,USD:200},
  days:[{id:'ef-d1',dayNum:1,date:'2030-10-01',city:'가상시',spots:[]},{id:'ef-d2',dayNum:2,date:'2030-10-02',city:'가상시',spots:[]}],
  journals:{},activityRecords:{},momentEntries:[],checklist:[],exchanges:[],
  expenses:[
    // 결제수단이 없는 예전 원화 내역
    {id:'ef-legacy',title:'예전 원화 내역',amount:12000,curr:'KRW',krw:12000,date:'2030-10-01',cat:'meal',payMethod:'card',type:'expense'},
    // 지금 목록에 없는 결제수단(공유 사본의 HTML 포함)
    {id:'ef-odd',title:'알 수 없는 결제수단',amount:5,curr:'USD',krw:6750,date:'2030-10-01',cat:'etc',payMethod:'card',type:'expense',paymentSource:'wallet_<img id="xss-source" src="x">'}
  ]};

const results=[];
async function check(name,run){try{results.push({name,passed:true,details:await run()});}catch(error){results.push({name,passed:false,error:String(error.stack||error).slice(0,1200)});}}
const png=color=>`data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="${color}"/></svg>`).toString('base64')}`;

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || undefined});
  const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Seoul',serviceWorkers:'block'});
  await context.addInitScript(seed=>{if(!sessionStorage.getItem('ef-seeded')){sessionStorage.setItem('ef-seeded','1');localStorage.setItem('st_demo_choice_v1','started');localStorage.setItem('st_rates_last_updated',new Date().toISOString());localStorage.setItem('st_trips_v2',JSON.stringify([seed]));}},seedTrip);
  const page=await context.newPage(),errors=[],dialogs=[];
  page.setDefaultTimeout(10000);
  page.on('pageerror',error=>errors.push(error.message));
  page.on('dialog',dialog=>{dialogs.push(dialog.message());dialog.accept();});
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  const stored=()=>page.evaluate(async id=>JSON.parse(await TripRepository.readRaw()).find(t=>t.id===id),TRIP_ID);
  const isOpen=id=>page.evaluate(id=>{const m=document.getElementById(id);return !!m&&!m.classList.contains('sheet-closed');},id);
  const closeAll=()=>page.evaluate(()=>document.querySelectorAll('.sheet-container').forEach(element=>{if(!element.classList.contains('sheet-closed'))closeModal(element.id,true);}));
  const openExpenses=()=>page.evaluate(id=>{openTripWorkspace(id);switchTab('expenses');},TRIP_ID);
  // 지갑 카드의 선택 표시와 숨은 select 값
  const wallet=()=>page.evaluate(()=>({select:document.getElementById('exp-form-payment-source').value,cards:[...document.querySelectorAll('#exp-form-wallet-cards [data-on-click="expense.paymentSource"]')].filter(card=>card.getAttribute('aria-pressed')==='true'&&card.classList.contains('active')).map(card=>card.dataset.source)}));
  try{
    await page.goto(origin+'/',{waitUntil:'networkidle'});
    await page.waitForFunction(()=>window.SulsulShell?.started);
    await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}'});
    await openExpenses();

    await check('새 내역: 간편·상세, 카드·현금(지갑 카드 표시 일치), 지출·수입, 카테고리, 통화 칩, 지갑 카드 → 저장',async()=>{
      await closeAll();
      await page.click('#tab-content-expenses [data-on-click="expenses.add"]');
      assert.equal(await isOpen('modal-expense'),true);
      assert.equal(await page.isVisible('#exp-detailed-fields'),false,'간편입력');
      await page.click('#exp-modal-tab-detailed');
      assert.deepEqual([await page.isVisible('#exp-detailed-fields'),await page.getAttribute('#exp-modal-tab-detailed','aria-pressed')],[true,'true']);
      await page.fill('#exp-form-title','가상 택시');
      await page.click('#exp-form-curr-chips [data-on-click="expense.currency"][data-curr="USD"]');
      assert.deepEqual([await page.inputValue('#exp-form-curr'),await page.textContent('#exp-form-curr-active-desc')],['USD','USD (미국 달러) 적용됨']);
      await page.fill('#exp-form-amount','20');
      const usd=await page.evaluate(()=>getCurrencyRate('USD'));
      assert.equal(await page.textContent('#exp-form-krw-preview'),`≈ ₩${Math.round(20*usd).toLocaleString()}`);
      assert.deepEqual(await wallet(),{select:'wallet_krw',cards:['wallet_krw']},'카드 결제는 원화 지갑');
      await page.click('#exp-form-method-cash');
      assert.deepEqual(await wallet(),{select:'wallet_curr',cards:['wallet_curr']},'현금으로 바꾸면 카드 표시도 USD 지갑');
      assert.match(await page.textContent('#exp-form-wallet-hint'),/USD 지갑에서 \$20\.00 차감 예정 \(남은 잔액: \$175\.00\)/,'초기 200 - 예전 내역 5 - 20');
      await page.click('#exp-cat-grid [data-cat="transport"]');
      assert.deepEqual([await page.inputValue('#exp-form-cat'),await page.getAttribute('#exp-cat-grid [data-cat="transport"]','aria-pressed')],['transport','true']);
      await page.click('#exp-form-type-income');
      assert.deepEqual([await page.textContent('#exp-modal-heading'),await page.textContent('#exp-form-submit-btn'),await page.textContent('#exp-form-sign-badge')],['수입 기록 추가','수입 저장','+']);
      await page.click('#exp-form-type-expense');
      await page.click('#exp-form-wallet-cards [data-source="none"]');
      assert.deepEqual(await wallet(),{select:'none',cards:['none']});
      await page.fill('#exp-form-memo','가상 메모');
      await page.click('#exp-form-submit-btn');
      await page.waitForFunction(()=>document.getElementById('modal-expense').classList.contains('sheet-closed'));
      const saved=(await stored()).expenses[0];
      assert.deepEqual({title:saved.title,amount:saved.amount,curr:saved.curr,krw:saved.krw,cat:saved.cat,payMethod:saved.payMethod,type:saved.type,paymentSource:saved.paymentSource,walletCurr:saved.walletCurr,memo:saved.memo},
        {title:'가상 택시',amount:20,curr:'USD',krw:Math.round(20*usd),cat:'transport',payMethod:'cash',type:'expense',paymentSource:'none',walletCurr:null,memo:'가상 메모'});
      return {usd};
    });

    await check('사진: 고르기 → 대표 지정 → 확대·닫기 → 제외, 사진 추가 버튼은 파일 고르기를 연다',async()=>{
      await closeAll();
      await page.click('#tab-content-expenses [data-on-click="expenses.add"]');
      await page.evaluate(()=>SulsulTravel.ExpenseEditor.compressPhoto=async file=>`data:image/svg+xml;base64,${btoa(await file.text())}`);
      const svg=color=>({name:`${color}.svg`,mimeType:'image/svg+xml',buffer:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="${color}"/></svg>`)});
      await page.setInputFiles('#exp-photo-file-input',[svg('red'),svg('blue')]);
      await page.waitForFunction(()=>SulsulTravel.ExpenseEditor.state.photos.length===2&&!SulsulTravel.ExpenseEditor.state.photosLoading);
      await page.click('#exp-photos-list [data-on-click="expense.primaryPhoto"][data-index="1"]');
      assert.deepEqual([await page.evaluate(()=>SulsulTravel.ExpenseEditor.state.primaryPhotoIndex),await page.getAttribute('#exp-photos-list [data-on-click="expense.primaryPhoto"][data-index="1"]','aria-pressed')],[1,'true']);
      await page.click('#exp-photos-list [data-on-click="expense.viewPhoto"][data-index="0"]');
      assert.equal(await page.isVisible('#expense-photo-viewer'),true);
      await page.click('#expense-photo-viewer [data-on-click="expense.closePhoto"]');
      assert.equal(await page.isVisible('#expense-photo-viewer'),false);
      await page.click('#exp-photos-list [data-on-click="expense.removePhoto"][data-index="0"]');
      assert.deepEqual(await page.evaluate(()=>({count:SulsulTravel.ExpenseEditor.state.photos.length,primary:SulsulTravel.ExpenseEditor.state.primaryPhotoIndex})),{count:1,primary:0},'대표였던 두 번째 사진이 첫 사진이 된다');
      assert.ok(dialogs.some(message=>message.includes('첨부 목록에서 제외')));
      const [chooser]=await Promise.all([page.waitForEvent('filechooser'),page.click('#exp-photos-list [data-on-click="expense.pickPhotos"]')]);
      assert.equal(chooser.isMultiple(),true);
      await closeAll();
      return 'ok';
    });

    await check('예전 내역 편집: 결제수단 없는 원화 내역은 원화 지갑, 목록에 없는 결제수단은 기본값과 안내, 그 값의 HTML은 요소가 되지 않는다',async()=>{
      await closeAll();
      await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.SulsulShell?.started);await openExpenses();
      const legacyIndex=await page.evaluate(()=>getActiveTrip().expenses.findIndex(e=>e.id==='ef-legacy'));
      await page.click(`#expenses-list-container [data-on-click="expenses.edit"][data-index="${legacyIndex}"] >> nth=0`);
      assert.deepEqual(await wallet(),{select:'wallet_krw',cards:['wallet_krw']});
      assert.equal(await page.textContent('#expense-editor-feedback'),'수정 저장을 눌러야 지출 내역과 지갑 잔액에 반영됩니다.');
      await page.fill('#exp-form-title','예전 원화 내역 수정');
      await page.click('#exp-form-submit-btn');
      await page.waitForFunction(()=>document.getElementById('modal-expense').classList.contains('sheet-closed'));
      const legacy=(await stored()).expenses.find(e=>e.id==='ef-legacy');
      assert.deepEqual([legacy.title,legacy.paymentSource,legacy.walletCurr],['예전 원화 내역 수정','wallet_krw','KRW']);
      const oddIndex=await page.evaluate(()=>getActiveTrip().expenses.findIndex(e=>e.id==='ef-odd'));
      await page.click(`#expenses-list-container [data-on-click="expenses.edit"][data-index="${oddIndex}"] >> nth=0`);
      assert.deepEqual(await wallet(),{select:'wallet_krw',cards:['wallet_krw']},'카드 결제의 기본 지갑');
      assert.match(await page.textContent('#expense-editor-feedback'),/이전 결제수단을 지금 지갑 목록에서 찾지 못해/);
      assert.equal(await page.evaluate(()=>document.getElementById('xss-source')),null,'결제수단 값의 HTML은 요소가 되지 않는다');
      await closeAll();
      return {legacyIndex,oddIndex};
    });

    await check('AI 영수증 초안의 통화(THB)가 여행 통화 목록에 없어도 고르고 그 환율로 저장한다',async()=>{
      await closeAll();
      await openExpenses();
      await page.click('#tab-content-expenses [data-on-click="expenses.add"]');
      const applied=await page.evaluate(()=>{const trip=getActiveTrip(),editor=SulsulTravel.ExpenseEditor;return applyAiDraftPayload({kind:'receipt',tripId:trip.id,baseRevision:trip.revision,input:{expenseSession:editor.state.sessionId,expenseSnapshot:editor.snapshot()},draft:{receipt:{merchant:'가상 상점',itemSummary:'가상 품목',amount:350,currency:'THB',category:'food',date:'2030-10-02'}}});});
      assert.equal(applied,'applied');
      const thb=await page.evaluate(()=>getCurrencyRate('THB'));
      assert.deepEqual([await page.inputValue('#exp-form-curr'),await page.inputValue('#exp-form-amount'),await page.inputValue('#exp-form-cat')],['THB','350','meal']);
      assert.ok(await page.locator('#exp-form-curr-chips [data-on-click="expense.currency"][data-curr="THB"][aria-pressed="true"]').count(),'THB 칩이 생기고 선택된다');
      assert.equal(await page.textContent('#exp-form-krw-preview'),`≈ ₩${Math.round(350*thb).toLocaleString()}`);
      await page.click('#exp-form-submit-btn');
      await page.waitForFunction(()=>document.getElementById('modal-expense').classList.contains('sheet-closed'));
      const saved=(await stored()).expenses[0];
      assert.deepEqual([saved.title,saved.curr,saved.krw,saved.date],['가상 상점 · 가상 품목','THB',Math.round(350*thb),'2030-10-02']);
      return {thb};
    });

    await check('화면의 모든 data-on-* 이름이 등록되어 있고, 320px에서 가로로 넘치지 않는다',async()=>{
      await closeAll();
      await page.setViewportSize({width:320,height:740});await openExpenses();
      await page.click('#tab-content-expenses [data-on-click="expenses.add"]');
      await page.evaluate(()=>{const editor=SulsulTravel.ExpenseEditor;editor.state.photos=['data:image/png;base64,AAAA'];editor.renderPhotos();editor.setMode('detailed');});
      const names=await page.evaluate(()=>[...new Set([...document.querySelectorAll('[data-on-click],[data-on-change],[data-on-input]')].map(e=>e.dataset.onClick||e.dataset.onChange||e.dataset.onInput))].map(name=>[name,SulsulTravel.UiActions.has(name)]));
      assert.deepEqual(names.filter(([,ok])=>!ok),[]);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await closeAll();
      return names.map(([name])=>name).filter(name=>/^expense\./.test(name)).sort();
    });

    await check('페이지 오류가 없다',async()=>{assert.deepEqual(errors,[]);return {dialogs:dialogs.length};});
  }finally{await browser.close();server.close();}
  const passed=results.every(result=>result.passed);
  console.log(JSON.stringify({passed,checks:results.length,results},null,2));
  process.exitCode=passed?0:1;
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
