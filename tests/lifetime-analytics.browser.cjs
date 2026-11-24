/* 평생 여행 통계 대시보드와 6대 지표 드릴다운 브라우저 검사 (v2.1.9, 계획 4단계 11차).
 * Run: PLAYWRIGHT_MODULE=<optional> CHROME_PATH=<optional> node tests/lifetime-analytics.browser.cjs */
const { chromium } = require('./helpers/playwright.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const root = path.resolve(__dirname, '..');
const mime = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json'
};
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, content) => {
    if (error) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', (mime[path.extname(file)] || 'application/octet-stream') + '; charset=utf-8');
    res.end(content);
  });
});

function makeTrips() {
  return [
    {
      id: 'la-past',
      title: '2024 교토 가을',
      startDate: '2024-11-01',
      endDate: '2024-11-05',
      durationDays: 5,
      countries: ['일본'],
      cities: ['교토'],
      concepts: ['미식'],
      currency: 'KRW',
      budget: 2000000,
      revision: 0,
      expenses: [{ id: 'e1', type: 'expense', krw: 1000000, amount: 1000000, currency: 'KRW' }],
      journals: { 'day-0': { text: '청수사 단풍 산책', date: '2024-11-01' } },
      checklist: [],
      days: [{ id: 'd1', dayNum: 1, date: '2024-11-01', city: '교토', title: '도착', spots: [] }]
    },
    {
      id: 'la-future',
      title: '2030 마드리드 산책',
      startDate: '2030-05-01',
      endDate: '2030-05-03',
      durationDays: 3,
      countries: ['스페인'],
      cities: ['마드리드'],
      concepts: ['미술관'],
      currency: 'EUR',
      budget: 1000,
      revision: 0,
      expenses: [{ id: 'e2', type: 'expense', krw: 750000, amount: 500, currency: 'EUR' }],
      journals: {},
      checklist: [],
      days: [{ id: 'd2', dayNum: 1, date: '2030-05-01', city: '마드리드', title: '프라도', spots: [] }]
    },
    {
      id: "la'quote",
      title: '아이슬란드 오로라 버킷',
      startDate: '',
      endDate: '',
      durationDays: 7,
      countries: ['아이슬란드'],
      cities: ['레이캬비크'],
      concepts: ['오로라'],
      currency: 'KRW',
      budget: 0,
      revision: 0,
      expenses: [],
      journals: {},
      checklist: [],
      days: [{ id: 'd3', dayNum: 1, date: '', city: '레이캬비크', title: '버킷', spots: [] }]
    }
  ];
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {})
  });
  const pageErrors = [];
  const results = [];
  const check = async (name, fn) => {
    try {
      results.push({ name, passed: true, details: await fn() });
    } catch (error) {
      results.push({ name, passed: false, error: error.message });
    }
  };
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'networkidle' });

    const seed = makeTrips();
    await page.evaluate(async trips => {
      State.trips = trips;
      State.activeTripId = trips[0].id;
      await saveTrips({ bump: false });
      switchView('hub');
    }, seed);

    await check('1. 헤더 통계 버튼 실클릭·KRW 환산 예산·resolveTripStage 상태 배지 일관성', async () => {
      await page.locator('#header-btn-analytics').click();
      await page.waitForFunction(() => !document.getElementById('modal-analytics').classList.contains('sheet-closed'));

      const summary = await page.evaluate(() => ({
        trips: document.getElementById('stat-lt-trips').textContent.trim(),
        countries: document.getElementById('stat-lt-countries').textContent.trim(),
        cities: document.getElementById('stat-lt-cities').textContent.trim(),
        days: document.getElementById('stat-lt-days').textContent.trim(),
        expenses: document.getElementById('stat-lt-expenses').textContent.trim(),
        diaries: document.getElementById('stat-lt-diaries').textContent.trim(),
        legend: document.getElementById('stat-lt-status-legend').textContent.replace(/\s+/g, ' ').trim(),
        rows: [...document.querySelectorAll('#stat-lt-trips-tbody tr')].map(tr => ({
          id: tr.dataset.tripId,
          text: tr.textContent.replace(/\s+/g, ' ').trim()
        }))
      }));

      assert.equal(summary.trips, '3개');
      assert.equal(summary.countries, '3개국');
      assert.equal(summary.cities, '3개');
      assert.equal(summary.days, '15일');
      assert.equal(summary.expenses, '₩175만');
      assert.equal(summary.diaries, '1편');
      assert.match(summary.legend, /예정 1/);
      assert.match(summary.legend, /완료 1/);
      assert.match(summary.legend, /버킷 1/);

      const pastRow = summary.rows.find(r => r.id === 'la-past');
      const futureRow = summary.rows.find(r => r.id === 'la-future');
      const bucketRow = summary.rows.find(r => r.id === "la'quote");
      assert.match(pastRow.text, /₩100만 \/ ₩200만/);
      assert.match(pastRow.text, /완료$/);
      assert.match(futureRow.text, /예정$/);
      assert.doesNotMatch(futureRow.text, /\/ ₩0만/, 'EUR budget must convert to KRW');
      assert.match(bucketRow.text, /버킷$/);
      return { expenses: summary.expenses, pastRow: pastRow.text };
    });

    await check('2. 6대 드릴다운 실클릭 전개·aria-expanded·예산 소진율·따옴표 ID 및 가계부 이동', async () => {
      await page.locator('#stat-card-expenses').click();
      assert.equal(await page.locator('#stat-card-expenses').getAttribute('aria-expanded'), 'true');
      assert.equal(await page.locator('#stat-drilldown-container').evaluate(el => !el.classList.contains('hidden')), true);
      const expText = await page.locator('#stat-drilldown-content').innerText();
      assert.match(expText, /목표 ₩200만원/);
      assert.match(expText, /소진율 50%/);

      for (const metric of ['trips', 'countries', 'cities', 'days', 'diaries']) {
        await page.locator(`#stat-card-${metric}`).click();
        assert.equal(await page.locator(`#stat-card-${metric}`).getAttribute('aria-expanded'), 'true');
        assert.equal(await page.locator('#stat-card-expenses').getAttribute('aria-expanded'), 'false');
      }

      await page.locator('#stat-drilldown-container [data-on-click="lifetimeAnalytics.closeDrilldown"]').click();
      assert.equal(await page.locator('#stat-drilldown-container').evaluate(el => el.classList.contains('hidden')), true);
      assert.equal(await page.locator('#stat-card-diaries').getAttribute('aria-expanded'), 'false');

      // 따옴표가 든 trip ID 행 클릭 (모달이 350ms 가드에 걸리지 않고 즉시 닫히며 여정 진입)
      await page.locator('#stat-card-trips').click();
      await page.locator('#stat-drilldown-content [data-on-click="lifetimeAnalytics.openTrip"]', { hasText: '아이슬란드' }).click();
      await page.waitForFunction(() => document.getElementById('modal-analytics').classList.contains('sheet-closed'));
      assert.equal(await page.evaluate(() => State.activeTripId), "la'quote");

      // 다시 열고 지출 드릴다운의 '가계부 ➔' 버튼 클릭
      await page.evaluate(() => SulsulTravel.LifetimeAnalytics.open('lifetime'));
      await page.locator('#stat-card-expenses').click();
      await page.locator('#stat-drilldown-content [data-on-click="lifetimeAnalytics.openTrip"][data-tab="expenses"]').first().click();
      await page.waitForFunction(() => document.getElementById('modal-analytics').classList.contains('sheet-closed'));
      const dest = await page.evaluate(() => ({ tripId: State.activeTripId, tab: State.activeTab }));
      assert.equal(dest.tripId, 'la-past');
      assert.equal(dest.tab, 'expenses');
      return dest;
    });

    await check('3. 워크스페이스 통계 패널·공유 사본 HTML 안전성·위임 등록·320px 오버플로 0', async () => {
      // 공유 사본에 악성 HTML이 섞인 경우
      await page.evaluate(() => {
        window.__laXss = 0;
        State.trips = [{
          id: 'la-xss',
          title: '<img id="laxss-title" src=x onerror="window.__laXss=1">공유여정',
          startDate: '2026-<img id="laxss-date" src=x onerror="window.__laXss=2">',
          endDate: '2026-<img id="laxss-end" src=x onerror="window.__laXss=3">',
          durationDays: 2,
          countries: ['<img id="laxss-country" src=x onerror="window.__laXss=4">국가'],
          cities: ['<img id="laxss-city" src=x onerror="window.__laXss=5">도시'],
          concepts: ['<img id="laxss-concept" src=x onerror="window.__laXss=6">컨셉'],
          currency: 'KRW',
          budget: 1000000,
          expenses: [],
          journals: { 'day-0': { text: '<img id="laxss-diary" src=x onerror="window.__laXss=7">일기', date: '2026-05-01' } },
          checklist: [],
          days: [{ id: 'dx', dayNum: 1, date: '2026-05-01', city: '도시', title: '일차', spots: [] }]
        }];
        State.activeTripId = 'la-xss';
        SulsulTravel.LifetimeAnalytics.open('lifetime');
      });
      for (const metric of ['trips', 'countries', 'cities', 'days', 'expenses', 'diaries']) {
        await page.locator(`#stat-card-${metric}`).click();
      }
      const xss = await page.evaluate(() => ({
        triggered: window.__laXss,
        injectedCount: document.querySelectorAll('#modal-analytics [id^="laxss"]').length
      }));
      assert.equal(xss.triggered, 0);
      assert.equal(xss.injectedCount, 0);

      // 모든 data-on-* 등록 여부
      const unregistered = await page.evaluate(() => {
        const nodes = [
          document.getElementById('header-btn-analytics'),
          ...document.querySelectorAll('#modal-analytics [data-on-click], #modal-analytics [data-on-change], #modal-analytics [data-on-input]')
        ].filter(Boolean);
        const missing = [];
        for (const el of nodes) {
          for (const attr of ['data-on-click', 'data-on-change', 'data-on-input']) {
            const name = el.getAttribute(attr);
            if (name && !SulsulTravel.UiActions.has(name)) missing.push(`${attr}=${name}`);
          }
        }
        return missing;
      });
      assert.deepEqual(unregistered, []);

      // 320px 오버플로 0 검사
      await page.setViewportSize({ width: 320, height: 844 });
      const overflowLifetime = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      assert.equal(overflowLifetime, false, 'lifetime modal overflow at 320px');

      // 워크스페이스 통계 패널 전환 및 '가계부 관리' 버튼 실클릭
      await page.evaluate(() => SulsulTravel.LifetimeAnalytics.switchTab('workspace'));
      const overflowWs = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      assert.equal(overflowWs, false, 'workspace analytics overflow at 320px');
      await page.locator('#stat-panel-workspace [data-on-click="lifetimeAnalytics.goWorkspaceExpenses"]').first().click();
      await page.waitForFunction(() => document.getElementById('modal-analytics').classList.contains('sheet-closed'));
      assert.equal(await page.evaluate(() => State.activeTab), 'expenses');
      assert.deepEqual(pageErrors, []);
      return { xss, pageErrors: pageErrors.length };
    });

    const passed = results.every(r => r.passed) && pageErrors.length === 0;
    console.log(JSON.stringify({ passed, pageErrors, results }, null, 2));
    if (!passed) process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
