/* 가계부 화면 분리 1차 회귀 (v2.1.1, 계획 4단계). 합성 여행만 사용하고 실제 환율 서버 대신 가짜 응답을 쓴다. 모든 조작은 실제 클릭·입력으로 한다.
 * 1) 지갑 보드·지출/환전 보기 전환이 동작하고, 여행 자료 안의 HTML(공유 사본으로 들어올 수 있다)은 글자로만 보인다.
 * 2) 빠른 환율 계산기: 입력·금액 버튼·통화 변경·지출로 옮기기.
 * 3) 환전 창: 지갑 카드의 환전 버튼 → 금액·환율 계산 → 같은 통화 보정 → 저장 → 목록에서 안전 삭제.
 * 4) 환율 관리: 맞춤 환율 적용·해제·모두 초기화, 실시간 갱신(가짜 응답)과 실패 안내, MEP 스위치 저장.
 * 5) 가계부 머리의 다른 창(초기 자산·통화 추가·통계·지출 기록·영수증 고르기)과 지출 편집·삭제 버튼이 각자의 창을 연다.
 * 6) 화면의 모든 data-on-* 이름이 등록되어 있고 페이지 오류가 없으며, 320px에서 가로로 넘치지 않는다. */
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
const TRIP_ID='expenses-tab-trip';
const seedTrip={id:TRIP_ID,title:'가상 가계부 여행',startDate:'2030-08-01',durationDays:2,countries:['미국'],cities:['가상시'],revision:0,currency:'KRW',activeCurrencies:['KRW','USD','ARS'],budget:0,
  days:[{id:'ex-d1',dayNum:1,date:'2030-08-01',city:'가상시',spots:[]},{id:'ex-d2',dayNum:2,date:'2030-08-02',city:'가상시',spots:[]}],
  journals:{},activityRecords:{},momentEntries:[],checklist:[],
  expenses:[{id:'ex-e1',title:'가상 점심 <b id="xss-title">굵게</b>',amount:12,curr:'USD',krw:16200,date:'2030-08-01',memo:'메모 <img id="xss-memo" src="x">',cat:'food',payMethod:'card',type:'expense'},
    {id:'ex-e2',title:'가상 페소 간식',amount:1000,curr:'ARS',krw:950,date:'2030-08-01',cat:'food',payMethod:'cash',type:'expense'}],
  exchanges:[{id:'ex-x1',date:'2030-08-01 <img id="xss-date" src="x">',fromCurr:'KRW',fromAmount:135000,toCurr:'USD',toAmount:100,rate:1350,memo:'가상 환전 <i id="xss-exmemo">기울임</i>'}]};

const results=[];
async function check(name,run){try{results.push({name,passed:true,details:await run()});}catch(error){results.push({name,passed:false,error:String(error.stack||error).slice(0,1200)});}}

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || undefined});
  const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Seoul',serviceWorkers:'block'});
  await context.addInitScript(seed=>{if(!sessionStorage.getItem('ex-seeded')){sessionStorage.setItem('ex-seeded','1');localStorage.setItem('st_demo_choice_v1','started');localStorage.setItem('st_rates_last_updated',new Date().toISOString());localStorage.setItem('st_trips_v2',JSON.stringify([seed]));}},seedTrip);
  const page=await context.newPage(),errors=[],dialogs=[];
  page.setDefaultTimeout(10000);
  page.on('pageerror',error=>errors.push(error.message));
  page.on('dialog',dialog=>{dialogs.push(dialog.message());dialog.accept();});
  let rateServer='ok';
  await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.hostname==='open.er-api.com'){
      if(rateServer!=='ok')return route.abort();
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({result:'success',rates:{USD:1,KRW:1400,JPY:140,ARS:1000}})});
    }
    return url.hostname==='127.0.0.1'?route.continue():route.abort();
  });
  const stored=()=>page.evaluate(async id=>JSON.parse(await TripRepository.readRaw()).find(t=>t.id===id),TRIP_ID);
  const isOpen=id=>page.evaluate(id=>{const m=document.getElementById(id);return !!m&&!m.classList.contains('sheet-closed');},id);
  const toast=()=>page.evaluate(()=>document.getElementById('sulsul-global-toast')?.textContent||'');
  const closeAll=()=>page.evaluate(()=>document.querySelectorAll('.sheet-container').forEach(element=>{if(!element.classList.contains('sheet-closed'))closeModal(element.id,true);}));
  const openExpenses=()=>page.evaluate(id=>{openTripWorkspace(id);switchTab('expenses');},TRIP_ID);
  try{
    await page.goto(origin+'/',{waitUntil:'networkidle'});
    await page.waitForFunction(()=>window.SulsulShell?.started);
    await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}'});
    await openExpenses();

    await check('지갑 보드·보기 전환이 동작하고, 여행 자료 안의 HTML은 글자로만 보인다',async()=>{
      const wallets=await page.$$eval('#exp-wallets-container .wallet-card',cards=>cards.length);
      assert.equal(wallets,3,'KRW·USD·ARS 지갑');
      const listText=await page.textContent('#expenses-list-container');
      assert.match(listText,/가상 점심 <b id="xss-title">굵게<\/b>/);assert.match(listText,/메모 <img id="xss-memo" src="x">/);
      await page.click('#exp-view-tab-exchanges');
      const view=await page.evaluate(()=>({sub:State.activeExpenseSubTab,pressed:document.getElementById('exp-view-tab-exchanges').getAttribute('aria-pressed'),exchHidden:document.getElementById('exchanges-list-container').classList.contains('hidden'),expHidden:document.getElementById('expenses-list-container').classList.contains('hidden')}));
      assert.deepEqual(view,{sub:'exchanges',pressed:'true',exchHidden:false,expHidden:true});
      const exText=await page.textContent('#exchanges-list-container');
      assert.match(exText,/2030-08-01 <img id="xss-date" src="x">/);assert.match(exText,/가상 환전 <i id="xss-exmemo">기울임<\/i>/);
      assert.equal(await page.evaluate(()=>['xss-title','xss-memo','xss-date','xss-exmemo'].filter(id=>document.getElementById(id)).length),0,'HTML 요소로 만들어지지 않는다');
      await page.click('#exp-view-tab-expenses');
      assert.equal(await page.evaluate(()=>State.activeExpenseSubTab),'expenses');
      return {wallets};
    });

    await check('빠른 환율 계산기: 입력·금액 버튼·통화 변경·지출로 옮기기',async()=>{
      await page.selectOption('#quick-calc-curr','USD');
      await page.fill('#quick-calc-input','10');
      const rate=await page.evaluate(()=>getCurrencyRate('USD'));
      assert.equal(await page.textContent('#quick-calc-result'),`≈ ₩${Math.round(10*rate).toLocaleString()}`);
      await page.click('[data-on-click="expenses.quickCalcAmount"][data-amount="500"]');
      assert.equal(await page.inputValue('#quick-calc-input'),'500');
      assert.equal(await page.textContent('#quick-calc-result'),`≈ ₩${Math.round(500*rate).toLocaleString()}`);
      await page.selectOption('#quick-calc-curr','ARS');
      assert.match(await page.textContent('#quick-calc-rate-badge'),/^1 ARS = ₩/);
      await page.click('[data-on-click="expenses.quickCalcApply"]');
      assert.equal(await isOpen('modal-expense'),true,'지출 입력 창');assert.equal(await page.inputValue('#exp-form-amount'),'500');
      await closeAll();
      return {rate};
    });

    await check('환전 창: 카드의 환전 버튼 → 계산 → 같은 통화 보정 → 저장 → 목록에서 안전 삭제',async()=>{
      await openExpenses();
      await page.click('#exp-wallets-container [data-on-click="expenses.exchangeFor"][data-curr="USD"]');
      assert.equal(await isOpen('modal-exchange'),true);
      assert.deepEqual(await page.evaluate(()=>[document.getElementById('exch-form-from-curr').value,document.getElementById('exch-form-to-curr').value]),['KRW','USD']);
      await page.fill('#exch-form-rate','1400');
      await page.fill('#exch-form-from-amount','140000');
      assert.equal(await page.inputValue('#exch-form-to-amount'),'100','원화 → 달러 계산');
      assert.match(await page.textContent('#exch-form-summary-text'),/-₩140,000 KRW[\s\S]*\+\$100 USD/);
      await page.fill('#exch-form-to-amount','50');
      assert.equal(await page.inputValue('#exch-form-from-amount'),'70000','입금액에서 출금액 역산');
      await page.selectOption('#exch-form-to-curr','KRW');
      assert.equal(await page.inputValue('#exch-form-from-curr'),'USD','같은 통화를 고르면 반대쪽을 바꾼다');
      await page.selectOption('#exch-form-from-curr','KRW');
      await page.selectOption('#exch-form-to-curr','USD');
      await page.fill('#exch-form-rate','1400');await page.fill('#exch-form-from-amount','140000');await page.fill('#exch-form-memo','가상 두 번째 환전');
      await page.click('[data-on-click="exchange.submit"]');
      const saved=await stored();
      assert.equal(saved.exchanges.length,2);assert.deepEqual([saved.exchanges[0].fromCurr,saved.exchanges[0].toCurr,saved.exchanges[0].toAmount,saved.exchanges[0].memo],['KRW','USD',100,'가상 두 번째 환전']);
      assert.equal(await isOpen('modal-exchange'),false);assert.match(await toast(),/환전 완료/);
      await page.click('#exp-view-tab-exchanges');
      await page.click('#exchanges-list-container [data-on-click="expenses.removeExchange"][data-index="0"]');
      assert.match(await page.textContent('#confirm-delete-target'),/KRW 140,000 ➔ USD 100/);
      await page.click('#confirm-delete-btn');
      assert.deepEqual((await stored()).exchanges.map(x=>x.id),['ex-x1'],'새 환전만 지운다');
      await page.click('#exp-view-tab-expenses');
      return 'ok';
    });

    await check('환율 관리: 맞춤 환율·해제·모두 초기화, 실시간 갱신과 실패 안내, MEP 스위치',async()=>{
      await page.click('[data-on-click="expenses.ratesManager"]');
      assert.equal(await isOpen('modal-rates-manager'),true);
      await page.fill('#custom-rate-input-USD','1500');
      await page.click('#rates-manager-list [data-on-click="exchange.saveRate"][data-curr="USD"]');
      assert.equal(await page.evaluate(()=>({state:State.customRates.USD,stored:JSON.parse(localStorage.getItem('st_custom_rates')).USD,rate:getCurrencyRate('USD')})).then(r=>r.state===1500&&r.stored===1500&&r.rate===1500),true,'맞춤 환율 적용');
      assert.ok(await page.locator('#rates-manager-list [data-on-click="exchange.resetRate"][data-curr="USD"]').count(),'해제 버튼이 생긴다');
      await page.click('#rates-manager-list [data-on-click="exchange.resetRate"][data-curr="USD"]');
      assert.equal(await page.evaluate(()=>State.customRates.USD),undefined,'해제');
      await page.fill('#custom-rate-input-JPY','9');await page.click('#rates-manager-list [data-on-click="exchange.saveRate"][data-curr="JPY"]');
      await page.click('[data-on-click="exchange.resetAll"]');
      assert.deepEqual(await page.evaluate(()=>({custom:State.customRates,stored:localStorage.getItem('st_custom_rates')})),{custom:{},stored:null},'모두 초기화');
      await page.click('[data-on-click="exchange.refreshRates"]');
      await page.waitForFunction(()=>State.liveRates?.USD===1400);
      assert.deepEqual(await page.evaluate(()=>({usd:State.liveRates.USD,jpy:State.liveRates.JPY,stamp:!!localStorage.getItem('st_rates_last_updated')})),{usd:1400,jpy:10,stamp:true});
      assert.match(await toast(),/실시간 시장 환율 갱신 완료! \(1 USD = ₩1,400\)/);
      rateServer='down';
      await page.click('[data-on-click="exchange.refreshRates"]');
      await page.waitForFunction(()=>(document.getElementById('sulsul-global-toast')?.textContent||'').includes('실시간 환율 서버 연결 실패'));
      rateServer='ok';
      const before=(await stored()).expenses.find(e=>e.curr==='ARS').krw;
      await page.locator('#chk-mep-rate').evaluate(element=>element.click());await page.evaluate(()=>TripRepository.idle());
      const off=await page.evaluate(async id=>({enabled:State.isMepEnabled,checked:document.getElementById('chk-mep-rate').checked,krw:JSON.parse(await TripRepository.readRaw()).find(t=>t.id===id).expenses.find(e=>e.curr==='ARS').krw}),TRIP_ID);
      await page.locator('#chk-mep-rate').evaluate(element=>element.click());await page.evaluate(()=>TripRepository.idle());
      const on=await page.evaluate(async id=>({enabled:State.isMepEnabled,krw:JSON.parse(await TripRepository.readRaw()).find(t=>t.id===id).expenses.find(e=>e.curr==='ARS').krw}),TRIP_ID);
      assert.deepEqual([off.checked,off.enabled,off.krw],[false,false,1380],'MEP 끄면 1.38 환산 저장');assert.deepEqual([on.enabled,on.krw],[true,950],'켜면 0.95 환산 저장');
      await page.waitForTimeout(400);
      await page.click('#modal-rates-manager [data-on-click="shell.closeModal"][aria-label="환율 관리 닫기"]');
      assert.equal(await isOpen('modal-rates-manager'),false,'닫기');
      return {before,off,on};
    });

    await check('가계부 머리의 다른 창과 지출 편집·삭제 버튼이 각자의 창을 연다',async()=>{
      const opened={};
      for(const [action,modal] of [['initialFunds','modal-initial-funds'],['addCurrency','modal-add-currency'],['analytics','modal-expense-analytics'],['add','modal-expense']]){
        await closeAll();await openExpenses();
        await page.locator(`#tab-content-expenses [data-on-click="expenses.${action}"]`).first().click();
        opened[action]=await isOpen(modal);
      }
      await closeAll();await openExpenses();
      const [chooser]=await Promise.all([page.waitForEvent('filechooser'),page.click('[data-on-click="expenses.receiptPick"][data-target="exp-tab-receipt-file"]')]);
      opened.receiptFile=!chooser.isMultiple();
      await page.click('#expenses-list-container [data-on-click="expenses.edit"][data-index="0"] >> nth=0');
      opened.edit=(await isOpen('modal-expense'))&&(await page.inputValue('#exp-form-title'))==='가상 점심 <b id="xss-title">굵게</b>';
      await closeAll();await openExpenses();
      await page.click('#expenses-list-container [data-on-click="expenses.remove"][data-index="1"]');
      opened.remove=(await isOpen('modal-confirm-delete'))&&(await page.textContent('#confirm-delete-target')).includes('가상 페소 간식');
      await closeAll();
      assert.deepEqual(opened,{initialFunds:true,addCurrency:true,analytics:true,add:true,receiptFile:true,edit:true,remove:true});
      return opened;
    });

    await check('화면의 모든 data-on-* 이름이 등록되어 있고, 320px에서 가로로 넘치지 않는다',async()=>{
      await page.setViewportSize({width:320,height:740});await openExpenses();
      await page.evaluate(()=>{SulsulTravel.ExchangeUI.open();SulsulTravel.ExchangeUI.renderRatesManager();});
      const names=await page.evaluate(()=>[...new Set([...document.querySelectorAll('[data-on-click],[data-on-change],[data-on-input]')].map(e=>e.dataset.onClick||e.dataset.onChange||e.dataset.onInput))].map(name=>[name,SulsulTravel.UiActions.has(name)]));
      assert.deepEqual(names.filter(([,ok])=>!ok),[]);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await closeAll();
      return names.map(([name])=>name).filter(name=>/^(expenses|exchange|shell)\./.test(name)).sort();
    });

    await check('페이지 오류가 없다',async()=>{assert.deepEqual(errors,[]);return {dialogs};});
  }finally{await browser.close();server.close();}
  const passed=results.every(result=>result.passed);
  console.log(JSON.stringify({passed,checks:results.length,results},null,2));
  process.exitCode=passed?0:1;
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
