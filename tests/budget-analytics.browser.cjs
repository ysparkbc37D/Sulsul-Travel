/* 가계부 화면 분리 2차 회귀 (v2.1.2, 계획 4단계). 합성 여행만 쓰고 환율 서버는 막는다. 조작은 실제 클릭·입력으로 한다.
 * 1) 초기 자산 창: 입력 → 기준 통화 바꾸기(입력 유지, 안내 한 번) → 직접 예산 → 저장. 저장 전에는 여행 자료가 그대로다.
 * 2) 초기 자산 창의 통화 삭제는 안전 삭제 창을 거치고, 저장하지 않고 닫으면 여행에 남는다(예전에는 창에서 지우는 순간 여행 자료가 바뀌었다).
 * 3) 통화 선택 창: 검색·지우기·지역 필터 → 추가하면 바로 저장되고, 열려 있던 초기 자산 창에 입력을 지킨 채 새 칸이 생긴다. 이미 있는 통화는 안내만 한다.
 * 4) 지출 입력창의 '다른 통화' 칩도 같은 통화 선택 창을 열고, 고른 통화가 지출 통화로 바로 잡힌다.
 * 5) 사용내역 통계: 카드·현금, 카테고리(예전 이름 food→식사, 모르는 이름→기타), 수지. 금액이 글자여도 숫자로 더하고, 카테고리 막대 너비가 비율을 따른다
 *    (예전에는 style 속성이 두 번 붙어 막대가 모두 가득 찼다). 도넛 조각을 누르면 금액을 알려 준다.
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
const TRIP_ID='budget-analytics-trip';
const seedTrip={id:TRIP_ID,title:'가상 예산 여행',startDate:'2030-09-01',durationDays:2,countries:['미국'],cities:['가상시'],revision:0,currency:'KRW',activeCurrencies:['KRW','USD','ARS'],budget:500000,initialBalances:{KRW:500000},
  days:[{id:'ba-d1',dayNum:1,date:'2030-09-01',city:'가상시',spots:[]},{id:'ba-d2',dayNum:2,date:'2030-09-02',city:'가상시',spots:[]}],
  journals:{},activityRecords:{},momentEntries:[],checklist:[],exchanges:[],
  expenses:[
    {id:'ba-e1',title:'가상 저녁',amount:30000,curr:'KRW',krw:30000,date:'2030-09-01',cat:'food',payMethod:'card',type:'expense'},
    // 공유 사본에서 금액이 글자로 들어온 경우
    {id:'ba-e2',title:'가상 기념품',amount:20000,curr:'KRW',krw:'20000',date:'2030-09-01',cat:'shopping',payMethod:'cash',type:'expense'},
    {id:'ba-e3',title:'가상 미분류',amount:10000,curr:'KRW',krw:10000,date:'2030-09-02',cat:'mystery',payMethod:'card',type:'expense'},
    {id:'ba-e4',title:'가상 환급',amount:5000,curr:'KRW',krw:5000,date:'2030-09-02',cat:'etc',payMethod:'card',type:'income'}
  ]};

const results=[];
async function check(name,run){try{results.push({name,passed:true,details:await run()});}catch(error){results.push({name,passed:false,error:String(error.stack||error).slice(0,1200)});}}

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || undefined});
  const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Seoul',serviceWorkers:'block'});
  await context.addInitScript(seed=>{if(!sessionStorage.getItem('ba-seeded')){sessionStorage.setItem('ba-seeded','1');localStorage.setItem('st_demo_choice_v1','started');localStorage.setItem('st_rates_last_updated',new Date().toISOString());localStorage.setItem('st_trips_v2',JSON.stringify([seed]));}},seedTrip);
  const page=await context.newPage(),errors=[],dialogs=[];
  page.setDefaultTimeout(10000);
  page.on('pageerror',error=>errors.push(error.message));
  page.on('dialog',dialog=>{dialogs.push(dialog.message());dialog.accept();});
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  const stored=()=>page.evaluate(async id=>JSON.parse(await TripRepository.readRaw()).find(t=>t.id===id),TRIP_ID);
  const live=()=>page.evaluate(()=>{const t=getActiveTrip();return JSON.parse(JSON.stringify({currency:t.currency,activeCurrencies:t.activeCurrencies,initialBalances:t.initialBalances,budget:t.budget,revision:t.revision}));});
  const isOpen=id=>page.evaluate(id=>{const m=document.getElementById(id);return !!m&&!m.classList.contains('sheet-closed');},id);
  const toasts=()=>page.evaluate(()=>window.budgetToasts.splice(0));
  const closeAll=()=>page.evaluate(()=>document.querySelectorAll('.sheet-container').forEach(element=>{if(!element.classList.contains('sheet-closed'))closeModal(element.id,true);}));
  const openExpenses=()=>page.evaluate(id=>{openTripWorkspace(id);switchTab('expenses');},TRIP_ID);
  const cards=()=>page.$$eval('#initial-funds-list input[type=radio]',inputs=>inputs.map(input=>input.value));
  try{
    await page.goto(origin+'/',{waitUntil:'networkidle'});
    await page.waitForFunction(()=>window.SulsulShell?.started);
    await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}'});
    await page.evaluate(()=>{window.budgetToasts=[];const original=window.showToast;window.showToast=(message,...rest)=>{window.budgetToasts.push(String(message));return original(message,...rest);};});
    await openExpenses();

    await check('초기 자산 창: 입력 → 기준 통화 변경(입력 유지) → 직접 예산 → 저장, 저장 전에는 여행 자료가 그대로다',async()=>{
      const before=await live();
      await page.click('#tab-content-expenses [data-on-click="expenses.initialFunds"]');
      assert.equal(await isOpen('modal-initial-funds'),true);
      assert.deepEqual(await cards(),['KRW','USD','ARS']);
      assert.equal(await page.inputValue('#init-fund-input-KRW'),'500000','저장된 초기 자산을 보여 준다');
      await page.fill('#init-fund-input-KRW','1000000');
      await page.fill('#init-fund-input-USD','100');
      const usd=await page.evaluate(()=>getCurrencyRate('USD'));
      assert.equal(await page.textContent('#init-funds-total-krw-preview'),`₩${Math.round(1000000+100*usd).toLocaleString()}`);
      await toasts();
      await page.click('#initial-funds-list label.init-fund-base:has(input[value="USD"]) >> text=기준통화 설정');
      assert.equal(await page.isChecked('#initial-funds-list input[type=radio][value="USD"]'),true);
      assert.deepEqual([await page.inputValue('#init-fund-input-KRW'),await page.inputValue('#init-fund-input-USD')],['1000000','100'],'기준 통화를 바꿔도 입력이 남는다');
      const baseToasts=(await toasts()).filter(message=>message.includes('기준 통화가'));
      assert.equal(baseToasts.length,1,'안내는 한 번');
      assert.match(await page.textContent('#init-funds-total-krw-preview'),new RegExp(`≈ ₩${Math.round(1000000+100*usd).toLocaleString()}`));
      assert.equal(await page.isVisible('#initial-funds-list [data-on-click="budget.removeCurrency"][data-curr="USD"]'),false,'기준 통화는 지울 수 없다');
      assert.deepEqual(await live(),before,'저장 전에는 여행 자료가 바뀌지 않는다');
      await page.click('#chk-sync-initial-budget');
      assert.equal(await page.isVisible('#init-funds-custom-budget-row'),true);
      await page.fill('#init-funds-custom-budget','2,000');
      await page.click('#modal-initial-funds [data-on-click="budget.save"]');
      assert.equal(await isOpen('modal-initial-funds'),false);
      const saved=await stored();
      assert.deepEqual({currency:saved.currency,activeCurrencies:saved.activeCurrencies,initialBalances:saved.initialBalances,budget:saved.budget,revision:saved.revision},
        {currency:'USD',activeCurrencies:['KRW','USD','ARS'],initialBalances:{KRW:1000000,USD:100,ARS:0},budget:2000,revision:before.revision+1});
      assert.ok((await toasts()).some(message=>/기준 통화 \[USD\].*\$2,000/.test(message)));
      return {usd};
    });

    await check('초기 자산 창의 통화 삭제는 안전 삭제 창을 거치고, 저장하지 않으면 여행에 남는다',async()=>{
      await page.click('#tab-content-expenses [data-on-click="expenses.initialFunds"]');
      assert.deepEqual(await cards(),['KRW','USD','ARS']);
      await page.fill('#init-fund-input-KRW','123');
      await page.click('#initial-funds-list [data-on-click="budget.removeCurrency"][data-curr="ARS"]');
      assert.equal(await isOpen('modal-confirm-delete'),true);
      assert.match(await page.textContent('#confirm-delete-target'),/ARS/);
      await page.click('#confirm-delete-btn');
      assert.deepEqual(await cards(),['KRW','USD'],'창에서는 빠진다');
      assert.equal(await page.inputValue('#init-fund-input-KRW'),'123','다른 입력은 남는다');
      assert.deepEqual([(await live()).activeCurrencies,(await live()).initialBalances],[['KRW','USD','ARS'],{KRW:1000000,USD:100,ARS:0}],'저장 전에는 여행 자료(통화 목록·초기 자산)가 그대로다');
      await page.waitForTimeout(400);
      await page.click('#modal-initial-funds [data-on-click="shell.closeModal"][aria-label="초기 자산 창 닫기"]');
      assert.equal(await isOpen('modal-initial-funds'),false);
      const after=await stored();
      assert.deepEqual([after.activeCurrencies,after.initialBalances],[['KRW','USD','ARS'],{KRW:1000000,USD:100,ARS:0}],'닫으면 저장된 자료 그대로');
      return {dialogs:dialogs.length};
    });

    await check('통화 선택 창: 검색·지우기·지역 필터 → 추가는 바로 저장, 열린 초기 자산 창에 입력을 지킨 채 칸이 생긴다',async()=>{
      await page.click('#tab-content-expenses [data-on-click="expenses.initialFunds"]');
      await page.fill('#init-fund-input-KRW','777');
      await page.click('#modal-initial-funds [data-on-click="budget.addCurrency"]');
      assert.equal(await isOpen('modal-add-currency'),true);
      await page.fill('#add-curr-search-input','유로');
      assert.deepEqual(await page.$$eval('#add-currency-grid [data-on-click="budget.pickCurrency"]',items=>items.map(item=>item.dataset.curr)),['EUR']);
      assert.equal(await page.isVisible('#btn-clear-add-curr-search'),true);
      await page.click('#btn-clear-add-curr-search');
      assert.equal(await page.inputValue('#add-curr-search-input'),'');assert.equal(await page.isVisible('#btn-clear-add-curr-search'),false);
      const all=await page.locator('#add-currency-grid [data-on-click="budget.pickCurrency"]').count();
      await page.click('#add-curr-region-filters [data-region="EUROPE"]');
      const europe=await page.evaluate(()=>[...document.querySelectorAll('#add-currency-grid [data-on-click="budget.pickCurrency"]')].map(item=>CURRENCY_INFO[item.dataset.curr].region));
      assert.ok(europe.length>5&&europe.length<all&&europe.every(region=>region==='EUROPE'),'유럽만');
      assert.equal(await page.getAttribute('#add-curr-region-filters [data-region="EUROPE"]','aria-pressed'),'true');
      const revision=(await stored()).revision;
      await page.click('#add-currency-grid [data-curr="EUR"]');
      assert.equal(await isOpen('modal-add-currency'),false);
      const saved=await stored();
      assert.deepEqual([saved.activeCurrencies,saved.initialBalances.EUR,saved.revision],[['KRW','USD','ARS','EUR'],0,revision+1]);
      assert.equal(await isOpen('modal-initial-funds'),true,'초기 자산 창은 열린 채');
      assert.deepEqual(await cards(),['KRW','USD','ARS','EUR']);
      assert.equal(await page.inputValue('#init-fund-input-KRW'),'777','입력이 남는다');
      await page.click('#modal-initial-funds [data-on-click="budget.addCurrency"]');
      await page.click('#add-currency-grid [data-curr="EUR"]');
      assert.ok((await toasts()).some(message=>message.includes('이미 활성화되어 있는 통화입니다: EUR')));
      assert.equal((await stored()).revision,revision+1,'이미 있는 통화는 저장하지 않는다');
      await closeAll();
      return {all,europe:europe.length};
    });

    await check("지출 입력창의 '다른 통화' 칩이 통화 선택 창을 열고, 고른 통화가 지출 통화가 된다",async()=>{
      await openExpenses();
      await page.click('#tab-content-expenses [data-on-click="expenses.add"]');
      assert.equal(await isOpen('modal-expense'),true);
      await page.click('#exp-form-curr-chips [data-on-click="budget.addCurrency"]');
      assert.equal(await isOpen('modal-add-currency'),true);
      await page.click('#add-currency-grid [data-curr="JPY"]');
      assert.deepEqual([await isOpen('modal-add-currency'),await isOpen('modal-expense'),await page.inputValue('#exp-form-curr')],[false,true,'JPY']);
      assert.ok((await stored()).activeCurrencies.includes('JPY'));
      await closeAll();
      return 'ok';
    });

    await check('사용내역 통계: 카드·현금, 카테고리(막대 너비가 비율을 따른다), 수지, 도넛 조각 안내',async()=>{
      await openExpenses();
      await page.click('#tab-content-expenses [data-on-click="expenses.analytics"]');
      assert.equal(await isOpen('modal-expense-analytics'),true);
      assert.equal(await page.textContent('#exp-stat-total-krw'),'60,000 KRW','글자 금액도 숫자로 더한다');
      assert.equal(await page.textContent('#exp-stat-count-sub'),'총 4건의 내역 (지출 3건 · 수입 1건)');
      const rows=()=>page.$$eval('#exp-stat-breakdown-list .exp-stat-row',items=>items.map(item=>item.textContent.replace(/\s+/g,' ').trim()));
      const widths=()=>page.$$eval('#exp-stat-breakdown-list .exp-stat-bar',bars=>bars.map(bar=>bar.style.width));
      assert.deepEqual(await rows(),['💳 카드 지출 (2건) 67% ₩40,000','💵 현금 지출 (1건) 33% ₩20,000']);
      await page.click('#exp-stat-tab-cat');
      assert.equal(await page.getAttribute('#exp-stat-tab-cat','aria-pressed'),'true');
      assert.deepEqual(await rows(),['🍽️ 식사 (1건) 50% ₩30,000','🛍️ 쇼핑 (1건) 33% ₩20,000','📦 기타 (1건) 17% ₩10,000']);
      assert.deepEqual(await widths(),['50%','33%','17%'],'막대 너비');
      const colors=await page.$$eval('#exp-stat-breakdown-list .exp-stat-bar',bars=>bars.map(bar=>bar.style.backgroundColor));
      assert.ok(colors.every(Boolean),'카테고리 색');
      await page.click('#exp-stat-tab-type');
      assert.deepEqual(await rows(),['🔴 총 지출 (3건) 92% ₩60,000','🟢 총 수입 (1건) 8% ₩5,000','⚖️ 순 지출 (지출 - 수입) (4건) 100% ₩55,000']);
      await toasts();
      await page.locator('#exp-donut-chart-box circle.donut-slice').first().evaluate(element=>element.dispatchEvent(new MouseEvent('click',{bubbles:true})));
      assert.ok((await toasts()).includes('지출: ₩60,000 (92%)'));
      await page.waitForTimeout(400);
      await page.click('#modal-expense-analytics [data-on-click="shell.closeModal"].w-8');
      assert.equal(await isOpen('modal-expense-analytics'),false);
      return 'ok';
    });

    await check('화면의 모든 data-on-* 이름이 등록되어 있고, 320px에서 가로로 넘치지 않는다',async()=>{
      await page.setViewportSize({width:320,height:740});await openExpenses();
      await page.evaluate(()=>{SulsulTravel.BudgetUI.openInitialFunds();SulsulTravel.BudgetUI.openAddCurrency();SulsulTravel.ExpenseAnalytics.open();});
      const names=await page.evaluate(()=>[...new Set([...document.querySelectorAll('[data-on-click],[data-on-change],[data-on-input]')].map(e=>e.dataset.onClick||e.dataset.onChange||e.dataset.onInput))].map(name=>[name,SulsulTravel.UiActions.has(name)]));
      assert.deepEqual(names.filter(([,ok])=>!ok),[]);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await closeAll();
      return names.map(([name])=>name).filter(name=>/^(budget|analytics)\./.test(name)).sort();
    });

    await check('페이지 오류가 없다',async()=>{assert.deepEqual(errors,[]);return {dialogs};});
  }finally{await browser.close();server.close();}
  const passed=results.every(result=>result.passed);
  console.log(JSON.stringify({passed,checks:results.length,results},null,2));
  process.exitCode=passed?0:1;
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
