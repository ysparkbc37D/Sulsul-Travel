/* Run: PLAYWRIGHT_MODULE=<optional absolute module path> node tests/mobile-ui.browser.cjs */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const output = path.join(root, '.local-review');
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, content) => {
    if (error) { res.writeHead(404).end(); return; }
    const mime = {'.html':'text/html', '.css':'text/css', '.js':'application/javascript', '.mjs':'application/javascript', '.png':'image/png', '.webmanifest':'application/manifest+json'};
    res.setHeader('Content-Type', (mime[path.extname(file)] || 'application/octet-stream') + '; charset=utf-8');
    res.end(content);
  });
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({headless:true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
  const errors = [];
  try {
    const context = await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,serviceWorkers:'block'});
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    await page.goto(`http://127.0.0.1:${server.address().port}/`, {waitUntil:'networkidle'});
    await page.evaluate(() => {
      const cities = ['마드리드','마드리드','세비야','세비야','바르셀로나'];
      const trip = { id:'ui-test-spain', title:'스페인, 느리게 걷는 다섯 날', subtitle:'골목과 미술관을 따라', startDate:'2026-10-11',endDate:'2026-10-15',durationDays:5,cities:['마드리드','세비야','바르셀로나'],countries:['스페인'],currency:'EUR',revision:0,coverEmoji:'🇪🇸',planBlockMeta:{},expenses:[],journals:{},checklist:[{text:'미술관 입장권 예약하기',checked:false}],days:cities.map((city,index)=>({dayNum:index+1,title:`${city}, 골목에서 만나는 하루`,date:`2026-10-${11+index}`,city,spots:[{id:`s${index}a`,time:'09:00',cat:'food',title:'동네 카페에서 느긋한 아침',desc:'따뜻한 커피와 가벼운 아침 식사. 다음 장소로 이동하기 전에 잠시 쉬어 가요.',completed:false},{id:`s${index}b`,time:'10:30',cat:'tour',title:`${city}의 미술관과 오래된 골목 산책`,desc:'예약 시간과 입구를 확인하고, 걸어서 주변 골목을 둘러봅니다.',fixed:true,tip:'입장권 예약 시간을 확인하세요.'}]}))};
      State.trips=[trip]; State.activeTripId=trip.id; setTheme('light'); switchView('workspace'); switchTab('plan');
    });
    fs.mkdirSync(output,{recursive:true});
    await page.screenshot({path:path.join(output,'mobile-plan.png'),fullPage:true});
    assert.equal(await page.locator('.companion-block').count(),3);
    assert.equal(await page.locator('#days-accordion-container').isVisible(),false,'overview must not repeat the full timeline');
    for (const width of [320,360,390,430,768,1280]) {
      await page.setViewportSize({width,height:844});
      const bounds = await page.evaluate(() => {
        const nav = document.getElementById('companion-main-nav').getBoundingClientRect();
        return {overflow:document.documentElement.scrollWidth>innerWidth, navBottom:nav.bottom, height:innerHeight, targets:[...document.querySelectorAll('#companion-main-nav button')].map(b=>b.getBoundingClientRect().height)};
      });
      assert.equal(bounds.overflow,false,`overflow at ${width}`);
      assert.ok(bounds.targets.every(h=>h>=44),`nav targets at ${width}`);
      if(width<768) assert.ok(Math.abs(bounds.navBottom-bounds.height)<2,`bottom nav at ${width}`);
    }
    await page.setViewportSize({width:390,height:844});
    await page.locator('.companion-block-open').first().click();
    console.log('detail opened');
    await page.locator('#plan-block-detail-page').waitFor({state:'visible'});
    await page.locator('#plan-block-detail-container .companion-day-picker button').nth(1).click();
    assert.match(await page.locator('.companion-day-heading').innerText(),/DAY 2/);
    await page.locator('.plan-detail-actions button').nth(1).click();
    assert.equal(await page.locator('#spot-form-day').inputValue(),'1','add schedule uses selected day');
    await page.evaluate(()=>closeModal('modal-spot',true));
    console.log('add selected date checked');
    await page.locator('#plan-block-detail-container .companion-spot-actions button').first().click();
    assert.equal(await page.evaluate(()=>State.trips[0].days[1].spots[0].completed),true);
    await page.screenshot({path:path.join(output,'mobile-detail.png')});
    await page.goBack();
    console.log('back navigation', await page.evaluate(()=>history.state));
    await page.waitForFunction(()=>document.getElementById('plan-block-detail-page').classList.contains('hidden'));
    await page.locator('#nav-tab-today').click();
    await page.locator('#today-overview-container .companion-day-picker button').nth(3).click();
    await page.locator('#today-overview-container .companion-spot-actions button').first().click();
    assert.equal(await page.evaluate(()=>State.activeTodayDayIndex),3,'manual date stays selected after completion');
    await page.screenshot({path:path.join(output,'mobile-today.png'),fullPage:true});
    await page.evaluate(()=>setTheme('dark'));
    await page.waitForFunction(()=>getComputedStyle(document.body).backgroundColor==='rgb(16, 27, 23)');
    await page.waitForTimeout(400);
    console.log('dark colors', await page.evaluate(()=>['.companion-next h3','.companion-next .companion-eyebrow','.companion-next > p:not(.companion-eyebrow)','.companion-spot > p','.companion-button'].map(selector=>{const el=document.querySelector('#today-overview-container '+selector);const s=getComputedStyle(el);return {selector,color:s.color,background:s.backgroundColor,opacity:s.opacity}})));
    await page.screenshot({path:path.join(output,'mobile-dark.png'),fullPage:true});
    await page.locator('#nav-tab-plan').click();
    await page.locator('[data-plan-presentation="timeline"]').click();
    assert.equal(await page.locator('#days-accordion-container').isVisible(),true);
    assert.equal(await page.locator('#big-plan-container').isVisible(),false);
    await page.locator('#nav-tab-journal').click();
    await page.evaluate(()=>setTheme('light'));
    await page.waitForFunction(()=>getComputedStyle(document.body).backgroundColor==='rgb(244, 246, 245)');
    await page.waitForTimeout(400);
    assert.equal(await page.locator('#tab-content-journal').isVisible(),true);
    await page.screenshot({path:path.join(output,'mobile-journal.png'),fullPage:true});
    await page.locator('#nav-tab-checklist').click();
    assert.equal(await page.locator('#tab-content-checklist').isVisible(),true);
    await page.screenshot({path:path.join(output,'mobile-preparation.png'),fullPage:true});
    await page.evaluate(()=>switchView('hub'));
    await page.screenshot({path:path.join(output,'mobile-hub.png'),fullPage:true});
    assert.deepEqual(errors,[],'runtime errors');
    console.log(JSON.stringify({passed:true,widths:[320,360,390,430,768,1280],runtimeErrors:errors,screenshots:output}));
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>server.close());
