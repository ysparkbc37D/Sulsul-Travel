/* 내 여행 허브 화면 브라우저 검사 (v2.2.0, 계획 4단계 12차).
 * Run: PLAYWRIGHT_MODULE=<optional> CHROME_PATH=<optional> node tests/hub-view.browser.cjs */
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
      id: 'hub-eur',
      title: '파리 3박4일',
      startDate: '2030-06-01',
      endDate: '2030-06-04',
      countries: ['프랑스'],
      cities: ['파리'],
      concepts: ['맛집'],
      currency: 'EUR',
      budget: 2000,
      revision: 0,
      expenses: [{ id: 'e1', type: 'expense', krw: 1500000, amount: 1000, currency: 'EUR' }],
      journals: {},
      checklist: [],
      days: [
        { id: 'd1', dayNum: 1, date: '2030-06-01', city: '파리', title: '도착', spots: [] },
        { id: 'd2', dayNum: 2, date: '2030-06-02', city: '파리', title: '루브르', spots: [] },
        { id: 'd3', dayNum: 3, date: '2030-06-03', city: '파리', title: '몽마르트', spots: [] },
        { id: 'd4', dayNum: 4, date: '2030-06-04', city: '파리', title: '귀국', spots: [] }
      ]
    },
    {
      id: "hub'quote",
      title: '아이슬란드 오로라 버킷',
      startDate: '',
      endDate: '',
      countries: ['아이슬란드'],
      cities: ['레이캬비크'],
      concepts: ['자연'],
      currency: 'KRW',
      budget: 0,
      revision: 0,
      expenses: [],
      journals: {},
      checklist: [],
      days: []
    },
    {
      id: 'hub-krw',
      title: '제주 주말 여행',
      startDate: '2024-03-01',
      endDate: '2024-03-02',
      countries: ['대한민국'],
      cities: ['제주'],
      concepts: ['힐링'],
      currency: 'KRW',
      budget: 500000,
      revision: 0,
      expenses: [{ id: 'e2', type: 'expense', krw: 250000, amount: 250000, currency: 'KRW' }],
      journals: {},
      checklist: [],
      days: [
        { id: 'j1', dayNum: 1, date: '2024-03-01', city: '제주', title: '애월', spots: [] },
        { id: 'j2', dayNum: 2, date: '2024-03-02', city: '제주', title: '성산', spots: [] }
      ]
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
      State.hubViewMode = 'list';
      await saveTrips({ bump: false });
      SulsulTravel.HubView.updateFilterDropdowns();
      SulsulTravel.HubView.updateViewModeButton();
      switchView('hub');
    }, seed);

    await check('1. 목록·격자 카드의 통화 환산 예산·미설정 예산·정확한 일수·원화 기준 예산 정렬', async () => {
      const listText = await page.locator('#trip-cards-grid').innerText();
      assert.doesNotMatch(listText, /\(22일\)/, '22일 하드코딩이 나타나지 않아야 한다');
      assert.match(listText, /\(4일\)/, '파리 4일 표시');
      assert.match(listText, /\/ 미설정/, '예산 0원 여행은 ₩500만을 지어내지 않는다');
      assert.doesNotMatch(listText, /\/ ₩0만/, 'EUR 2000 예산은 원화로 환산되어야 한다');
      assert.doesNotMatch(listText, /\/ ₩500만/, '0원 예산에 500만 기본값을 쓰지 않는다');

      // 예산 높은순 정렬: EUR 2,000 (~300만원) > KRW 50만원 > 0원
      await page.locator('#hub-filter-sort').selectOption('budget-desc');
      const sortedIds = await page.evaluate(() => [...document.querySelectorAll('#trip-cards-grid .trip-st-card')].map(el => el.dataset.tripId));
      assert.deepEqual(sortedIds, ['hub-eur', 'hub-krw', "hub'quote"]);

      // 격자 전환 실클릭
      await page.locator('#btn-hub-view-mode').click();
      const gridText = await page.locator('#trip-cards-grid').innerText();
      assert.doesNotMatch(gridText, /\/ ₩2,000\b/, 'EUR 2000을 ₩2,000으로 표시하지 않는다');
      assert.doesNotMatch(gridText, /\/ ₩5,000,000/, '0원 예산에 ₩5,000,000을 지어내지 않는다');
      assert.match(gridText, /\/ 예산 미설정/);

      // 다시 목록 전환
      await page.locator('#btn-hub-view-mode').click();
      return { sortedIds };
    });

    await check('2. 필터·칩 개별 해제·따옴표 ID 카드 열기·삭제된 국가 필터 자동 초기화', async () => {
      await page.locator('#hub-filter-reset').click();
      await page.locator('#hub-filter-details > summary').click();
      await page.locator('#hub-filter-country').selectOption({ label: '🇫🇷 프랑스 (EUR)' });
      assert.equal(await page.locator('#trip-cards-grid .trip-st-card').count(), 1);
      assert.equal(await page.locator('#hub-active-chips').isVisible(), true);

      // 국가 칩 X 버튼 실클릭으로 개별 해제
      await page.locator('#hub-active-chips [data-on-click="hub.removeFilter"][data-filter-key="country"]').click();
      assert.equal(await page.locator('#trip-cards-grid .trip-st-card').count(), 3);

      // 따옴표 ID 카드 제목 버튼 실클릭 → 워크스페이스 진입
      await page.locator('#trip-cards-grid .hub-trip-open', { hasText: '아이슬란드' }).click();
      assert.equal(await page.evaluate(() => State.currentView), 'workspace');
      assert.equal(await page.evaluate(() => State.activeTripId), "hub'quote");

      // 허브 복귀 후 프랑스 선택 상태에서 프랑스 여행 제거 시 국가 필터가 'all'로 안전 복구
      const recovered = await page.evaluate(() => {
        switchView('hub');
        State.hubFilters.country = '프랑스';
        State.trips = State.trips.filter(t => t.id !== 'hub-eur');
        SulsulTravel.HubView.updateFilterDropdowns();
        SulsulTravel.HubView.renderCards();
        return {
          country: State.hubFilters.country,
          selectVal: document.getElementById('hub-filter-country').value,
          cardCount: document.querySelectorAll('#trip-cards-grid .trip-st-card').length
        };
      });
      assert.equal(recovered.country, 'all');
      assert.equal(recovered.selectVal, 'all');
      assert.equal(recovered.cardCount, 2);
      return recovered;
    });

    await check('3. 공유 사본 HTML/위험 coverPhoto 차단·등록된 동작·320px 오버플로 0', async () => {
      await page.evaluate(() => {
        window.__hubXss = 0;
        State.trips = [{
          id: 'hub-xss',
          title: '<img id="hubxss-title" src=x onerror="window.__hubXss=1">공유',
          coverEmoji: '<img id="hubxss-emoji" src=x onerror="window.__hubXss=2">',
          coverPhoto: "javascript:alert(1)'\"onerror=window.__hubXss=3",
          startDate: '2030-<img id="hubxss-date" src=x onerror="window.__hubXss=4">',
          endDate: '2030-<img id="hubxss-end" src=x onerror="window.__hubXss=5">',
          countries: ['<img id="hubxss-c" src=x onerror="window.__hubXss=6">국가'],
          cities: ['<img id="hubxss-ct" src=x onerror="window.__hubXss=7">도시'],
          concepts: ['<img id="hubxss-cp" src=x onerror="window.__hubXss=8">컨셉'],
          currency: 'KRW',
          budget: 0,
          expenses: [],
          journals: {},
          days: []
        }];
        SulsulTravel.HubView.updateFilterDropdowns();
        State.hubViewMode = 'list';
        SulsulTravel.HubView.renderCards();
      });
      const listCheck = await page.evaluate(() => ({
        triggered: window.__hubXss,
        injected: document.querySelectorAll('#view-hub [id^="hubxss"]').length,
        coverType: SulsulTravel.HubView.resolveCover(State.trips[0]).type
      }));
      assert.equal(listCheck.triggered, 0);
      assert.equal(listCheck.injected, 0);
      assert.notEqual(listCheck.coverType, 'custom', '위험 coverPhoto URL은 무시해야 한다');

      await page.evaluate(() => { State.hubViewMode = 'grid'; SulsulTravel.HubView.renderCards(); });
      const gridInjected = await page.evaluate(() => document.querySelectorAll('#view-hub [id^="hubxss"]').length);
      assert.equal(gridInjected, 0);

      const unregistered = await page.evaluate(() => {
        const missing = [];
        const rootEl = document.getElementById('view-hub');
        for (const attr of ['data-on-click', 'data-on-change', 'data-on-input']) {
          for (const el of rootEl.querySelectorAll(`[${attr}]`)) {
            const name = el.getAttribute(attr);
            if (!SulsulTravel.UiActions.has(name)) missing.push(`${attr}=${name}`);
          }
        }
        return missing;
      });
      assert.deepEqual(unregistered, []);

      await page.setViewportSize({ width: 320, height: 844 });
      const overflowGrid = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      assert.equal(overflowGrid, false, 'grid overflow at 320px');
      await page.evaluate(() => { State.hubViewMode = 'list'; SulsulTravel.HubView.renderCards(); });
      const overflowList = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      assert.equal(overflowList, false, 'list overflow at 320px');
      assert.deepEqual(pageErrors, []);
      return { listCheck, pageErrors: pageErrors.length };
    });

    const passed = results.every(r => r.passed) && pageErrors.length === 0;
    console.log(JSON.stringify({ passed, pageErrors, results }, null, 2));
    if (!passed) process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
