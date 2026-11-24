/* 계획 탭 인터랙티브 지도 회귀 (v2.1.6, 계획 4단계). 합성 여행만 쓰고 외부 호출은 막는다. 조작은 실제 클릭으로 한다.
 * 1) 기본 지도·빠른 도시 칩·도시 카드·구글 지도 쿼리·전체 보기·navigateToInteractiveMap 도시 포커스.
 * 2) 공유 사본 HTML(도시명·커버 이모지·제목)은 칩·도시 카드·팝업에서 글자로만 보이고, 따옴표 포함 도시명(O'City)도 클릭된다.
 * 3) 전체 여행 궤적 토글: 다른 여행의 도시 칩 클릭 시 하단 카드가 갱신되고, 토글 해제·여행 전환 때 extraPolylines와 버튼 상태가 함께 초기화된다.
 * 4) 화면의 모든 data-on-* 이름이 등록되어 있고 페이지 오류가 없으며, 320px에서 가로로 넘치지 않는다. */
const { chromium } = require('./helpers/playwright.cjs');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, content) => {
    if (error) { res.writeHead(404).end(); return; }
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    res.end(content);
  });
});

const tripJapan = {
  id: 'pm-japan', title: '가상 일본 여정', startDate: '2031-04-01', durationDays: 2,
  countries: ['일본'], cities: ['도쿄', '교토'], revision: 0, currency: 'JPY',
  activeCurrencies: ['KRW', 'JPY'], budget: 0, journals: {}, activityRecords: {},
  momentEntries: [], checklist: [], expenses: [], exchanges: [],
  days: [
    { id: 'pmj-d1', dayNum: 1, date: '2031-04-01', title: '도쿄', city: '도쿄', spots: [{ id: 'pmj-s1', title: '시부야', time: '10:00', cat: 'tour' }] },
    { id: 'pmj-d2', dayNum: 2, date: '2031-04-02', title: '교토', city: '교토', spots: [] }
  ]
};
const tripSpain = {
  id: 'pm-spain', title: '가상 스페인 여정', startDate: '2031-05-01', durationDays: 2,
  countries: ['스페인'], cities: ['마드리드', '톨레도'], revision: 0, currency: 'EUR',
  activeCurrencies: ['KRW', 'EUR'], budget: 0, journals: {}, activityRecords: {},
  momentEntries: [], checklist: [], expenses: [], exchanges: [],
  days: [
    { id: 'pms-d1', dayNum: 1, date: '2031-05-01', title: '마드리드', city: '마드리드', spots: [] },
    { id: 'pms-d2', dayNum: 2, date: '2031-05-02', title: '톨레도', city: '톨레도', spots: [] }
  ]
};
const tripSharedXss = {
  id: 'pm-xss', title: '공유 사본 <b id="xsstitle">제목</b>', startDate: '2031-06-01', durationDays: 2,
  countries: ['일본'], cities: ['<b id="xsscity">가상도시</b>', "O'City"], coverEmoji: '<img id="xssemoji" src="x">',
  revision: 0, currency: 'JPY', activeCurrencies: ['KRW', 'JPY'], budget: 0,
  journals: {}, activityRecords: {}, momentEntries: [], checklist: [], expenses: [], exchanges: [],
  days: [
    { id: 'pmx-d1', dayNum: 1, date: '2031-06-01', title: '첫날', city: '<b id="xsscity">가상도시</b>', spots: [] }
  ]
};

const results = [];
async function check(name, run) {
  try { results.push({ name, passed: true, details: await run() }); }
  catch (error) { results.push({ name, passed: false, error: String(error.stack || error).slice(0, 1200) }); }
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Seoul', serviceWorkers: 'block' });
  await context.addInitScript(seed => {
    if (!sessionStorage.getItem('pm-seeded')) {
      sessionStorage.setItem('pm-seeded', '1');
      localStorage.setItem('st_demo_choice_v1', 'started');
      localStorage.setItem('st_trips_v2', JSON.stringify(seed));
    }
  }, [tripJapan, tripSpain, tripSharedXss]);
  const page = await context.newPage(), errors = [];
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());

  const openMap = id => page.evaluate(id => {
    document.querySelectorAll('.sheet-container').forEach(e => { if (!e.classList.contains('sheet-closed')) closeModal(e.id, true); });
    openTripWorkspace(id);
    switchTab('plan');
    SulsulTravel.PlanBlocks.switchSubTab('map');
  }, id);

  try {
    await page.goto(origin + '/', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.SulsulShell?.started);
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}' });

    await check('거점 칩·도시 카드·구글 지도 쿼리·전체 보기·navigateToInteractiveMap 도시 포커스가 동작한다', async () => {
      await openMap('pm-spain');
      const pills = await page.$$eval('#map-quick-cities button', els => els.map(e => e.textContent.trim()));
      assert.equal(pills.length, 2);
      assert.match(pills[0], /마드리드/);
      assert.match(pills[1], /톨레도/);
      assert.equal(await page.textContent('#map-city-name'), '마드리드');

      await page.click('#map-quick-cities button:nth-child(2)');
      assert.equal(await page.textContent('#map-city-name'), '톨레도');
      const gmapHref = await page.getAttribute('#btn-google-maps-link', 'href');
      assert.match(decodeURIComponent(gmapHref), /Toledo.*Spain/i);

      await page.click('[data-on-click="planMap.resetView"]');
      await page.evaluate(() => navigateToInteractiveMap('madrid'));
      await page.waitForTimeout(200);
      assert.equal(await page.textContent('#map-city-name'), '마드리드');
      return { pills, gmapHref };
    });

    await check('공유 사본 HTML은 칩·도시 카드·팝업에서 글자로만 보이고, 따옴표 포함 도시명도 클릭된다', async () => {
      await openMap('pm-xss');
      const single = await page.evaluate(() => {
        if (State.mapMarkers[0]) State.mapMarkers[0].openPopup();
        const rootEl = document.getElementById('subtab-view-map');
        return {
          xssElements: ['xsscity', 'xsstitle', 'xssemoji'].filter(id => rootEl && rootEl.querySelector(`#${id}`)),
          pillText: document.getElementById('map-quick-cities')?.textContent || '',
          spotsText: document.getElementById('map-city-spots')?.textContent || '',
          popupText: document.querySelector('.leaflet-popup-content')?.textContent || ''
        };
      });
      assert.deepEqual(single.xssElements, []);
      assert.match(single.pillText, /<b id="xsscity">가상도시<\/b>/);
      assert.match(single.spotsText, /<b id="xsscity">가상도시<\/b>/);
      assert.match(single.popupText, /<b id="xsscity">가상도시<\/b>/);

      await page.locator('#map-quick-cities button', { hasText: "O'City" }).click();
      assert.equal(await page.textContent('#map-city-name'), "O'City");
      return { pillText: single.pillText.trim() };
    });

    await check('전체 여행 궤적: 다른 여행 도시 칩 클릭, 팝업 escape, 토글 해제·여행 전환 시 레이어와 버튼 상태 정리', async () => {
      await openMap('pm-japan');
      assert.equal(await page.textContent('#map-city-name'), '도쿄');
      await page.click('#btn-toggle-all-trips-map');

      const onState = await page.evaluate(() => {
        const rootEl = document.getElementById('subtab-view-map');
        const xssInPopups = [];
        for (const m of State.mapMarkers) {
          m.openPopup();
          for (const id of ['xsscity', 'xsstitle', 'xssemoji']) if (rootEl && rootEl.querySelector(`#${id}`)) xssInPopups.push(id);
        }
        return {
          active: SulsulTravel.PlanMap.isAllTripsActive(),
          pressed: document.getElementById('btn-toggle-all-trips-map')?.getAttribute('aria-pressed'),
          label: document.getElementById('btn-toggle-all-trips-label')?.textContent,
          extraCount: (State.extraPolylines || []).length,
          extraOnMap: (State.extraPolylines || []).filter(p => State.map.hasLayer(p)).length,
          xssInPopups
        };
      });
      assert.equal(onState.active, true);
      assert.equal(onState.pressed, 'true');
      assert.equal(onState.label, '🎯 현재 여정만 보기');
      assert.ok(onState.extraCount >= 2 && onState.extraOnMap === onState.extraCount, '전체 여행 궤적 폴리라인 표시');
      assert.deepEqual(onState.xssInPopups, [], '전체 여행 팝업에도 HTML 요소가 생기지 않는다');

      // 다른 여행(스페인) 거점 칩 클릭 → 하단 카드가 마드리드로 갱신된다
      await page.locator('#map-quick-cities button', { hasText: '마드리드' }).first().click();
      assert.equal(await page.textContent('#map-city-name'), '마드리드');

      // 토글 해제 → extraPolylines가 지도와 상태에서 완전히 정리된다
      const prevPolylinesCheck = await page.evaluate(() => {
        window.__prevExtraPolylines = [...(State.extraPolylines || [])];
        return window.__prevExtraPolylines.length;
      });
      await page.click('#btn-toggle-all-trips-map');
      const offState = await page.evaluate(() => ({
        active: SulsulTravel.PlanMap.isAllTripsActive(),
        pressed: document.getElementById('btn-toggle-all-trips-map')?.getAttribute('aria-pressed'),
        label: document.getElementById('btn-toggle-all-trips-label')?.textContent,
        extraCount: (State.extraPolylines || []).length,
        leakedLayers: (window.__prevExtraPolylines || []).filter(p => State.map.hasLayer(p)).length
      }));
      assert.deepEqual(offState, { active: false, pressed: 'false', label: '🌐 전체 여행 궤적', extraCount: 0, leakedLayers: 0 });

      // 다시 토글 ON 후 다른 여행으로 전환 → 버튼 상태와 레이어가 자동 초기화된다
      await page.click('#btn-toggle-all-trips-map');
      await page.evaluate(() => { window.__prevExtraPolylines = [...(State.extraPolylines || [])]; });
      await openMap('pm-spain');
      const switchedState = await page.evaluate(() => ({
        active: SulsulTravel.PlanMap.isAllTripsActive(),
        pressed: document.getElementById('btn-toggle-all-trips-map')?.getAttribute('aria-pressed'),
        label: document.getElementById('btn-toggle-all-trips-label')?.textContent,
        extraCount: (State.extraPolylines || []).length,
        leakedLayers: (window.__prevExtraPolylines || []).filter(p => State.map.hasLayer(p)).length
      }));
      assert.deepEqual(switchedState, { active: false, pressed: 'false', label: '🌐 전체 여행 궤적', extraCount: 0, leakedLayers: 0 });
      return { prevPolylinesCheck, offState, switchedState };
    });

    await check('화면의 모든 data-on-* 이름이 등록되어 있고, 320px에서 가로로 넘치지 않는다', async () => {
      await page.setViewportSize({ width: 320, height: 740 });
      const names = new Map();
      for (const id of ['pm-japan', 'pm-spain', 'pm-xss']) {
        await openMap(id);
        for (const [name, ok] of await page.evaluate(() => [...document.querySelectorAll('[data-on-click],[data-on-change],[data-on-input]')].map(e => {
          const name = e.dataset.onClick || e.dataset.onChange || e.dataset.onInput;
          return [name, SulsulTravel.UiActions.has(name)];
        }))) names.set(name, ok);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${id} 320px single`);
        await page.click('#btn-toggle-all-trips-map');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${id} 320px all-trips`);
      }
      assert.deepEqual([...names].filter(([, ok]) => !ok), []);
      const mapActions = [...names.keys()].filter(name => /^planMap\./.test(name)).sort();
      assert.deepEqual(mapActions, ['planMap.focusCity', 'planMap.resetView', 'planMap.toggleAllTrips']);
      return mapActions;
    });

    await check('페이지 오류가 없다', async () => { assert.deepEqual(errors, []); return 'ok'; });
  } finally {
    await browser.close();
    server.close();
  }
  const passed = results.every(result => result.passed);
  console.log(JSON.stringify({ passed, checks: results.length, results }, null, 2));
  process.exitCode = passed ? 0 : 1;
})().catch(error => { console.error(error); process.exitCode = 1; server.close(); });
