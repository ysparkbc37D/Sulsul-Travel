/* 노선도 모달(관광 일러스트 노선도 & 위성 궤적) 회귀 (v2.1.7, 4단계 9차). 합성 여행만 쓰고 외부 호출은 막는다. 조작은 실제 클릭으로 한다.
 * 1) 단일 노선도 열기·탭 전환(aria-pressed)·'일정보기' 클릭 시 해당 일차 아코디언(#day-body-1)이 실제로 펼쳐진다.
 * 2) 통계 국가 포커스: 스페인 상단 정렬, 여행 간 커넥터([스페인] ➔ [일본]), '전체 보기' 후 탭 왕복 시 포커스 유지 안 됨, 위성 줌인, '이 여정 열기', '통계로 돌아가기'.
 * 3) 공유 사본 HTML(국가·도시·장소·제목·커버 이모지)은 단일/전체 메트로·위성 팝업·하단 링크에서 글자로만 보인다.
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
  id: 'rm-jp', title: '일본 산책', startDate: '2031-04-01', durationDays: 2,
  countries: ['일본'], cities: ['도쿄', '교토'], revision: 0, currency: 'JPY',
  activeCurrencies: ['KRW', 'JPY'], budget: 0, journals: {}, activityRecords: {},
  momentEntries: [], checklist: [], expenses: [], exchanges: [],
  days: [
    { id: 'jp-d1', dayNum: 1, date: '2031-04-01', title: '도쿄 도착', city: '도쿄', spots: [{ id: 'jp-s1', title: '시부야', time: '10:00', cat: 'tour' }] },
    { id: 'jp-d2', dayNum: 2, date: '2031-04-02', title: '교토 이동', city: '교토', spots: [{ id: 'jp-s2', title: '기요미즈데라', time: '11:00', cat: 'tour' }] }
  ]
};
const tripSpain = {
  id: 'rm-es', title: '스페인 여정', startDate: '2031-05-01', durationDays: 2,
  countries: ['스페인'], cities: ['마드리드', '톨레도'], revision: 0, currency: 'EUR',
  activeCurrencies: ['KRW', 'EUR'], budget: 0, journals: {}, activityRecords: {},
  momentEntries: [], checklist: [], expenses: [], exchanges: [],
  days: [
    { id: 'es-d1', dayNum: 1, date: '2031-05-01', title: '마드리드', city: '마드리드', spots: [{ id: 'es-s1', title: '프라도', time: '10:00', cat: 'tour' }] },
    { id: 'es-d2', dayNum: 2, date: '2031-05-02', title: '톨레도', city: '톨레도', spots: [] }
  ]
};
const tripXss = {
  id: 'rm-xss', title: '공유 <b id="rmtitle">제목</b>', startDate: '2031-06-01', durationDays: 1,
  countries: ['<b id="rmcountry">가상국</b>'], cities: ['<b id="rmcity">가상도시</b>'], coverEmoji: '<img id="rmemoji" src="x">',
  revision: 0, currency: 'JPY', activeCurrencies: ['KRW', 'JPY'], budget: 0,
  journals: {}, activityRecords: {}, momentEntries: [], checklist: [], expenses: [], exchanges: [],
  days: [
    { id: 'x-d1', dayNum: 1, date: '2031-06-01', title: '첫날', city: '<b id="rmcity">가상도시</b>', spots: [{ id: 'x-s1', title: '<b id="rmspot">명소</b>', time: '10:00' }] }
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
    if (!sessionStorage.getItem('rm-seeded')) {
      sessionStorage.setItem('rm-seeded', '1');
      localStorage.setItem('st_demo_choice_v1', 'started');
      localStorage.setItem('st_trips_v2', JSON.stringify(seed));
    }
  }, [tripJapan, tripSpain, tripXss]);
  const page = await context.newPage(), errors = [];
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());

  const isOpen = id => page.evaluate(id => { const m = document.getElementById(id); return !!m && !m.classList.contains('sheet-closed'); }, id);

  try {
    await page.goto(origin + '/', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.SulsulShell?.started);
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}' });

    await check('단일 노선도 열기·탭 전환·일정보기 클릭 시 해당 일차 아코디언이 펼쳐진다', async () => {
      await page.evaluate(() => { State.allTimelinesExpanded = false; openTripWorkspace('rm-jp'); SulsulTravel.RouteMap.open(); });
      assert.equal(await isOpen('modal-route-map'), true);
      assert.equal(await page.getAttribute('#btn-routemap-tab-metro', 'aria-pressed'), 'true');
      assert.match(await page.textContent('#modal-route-map-subtitle'), /2일간의 여정/);

      await page.click('#btn-routemap-tab-satellite');
      await page.waitForTimeout(150);
      assert.equal(await page.getAttribute('#btn-routemap-tab-satellite', 'aria-pressed'), 'true');
      assert.equal(await page.isVisible('#routemap-view-satellite'), true);

      await page.click('#btn-routemap-tab-metro');
      assert.equal(await page.isVisible('#routemap-view-metro'), true);

      // Day 2 '일정보기' 클릭 → 타임라인 탭으로 이동하며 2일차 아코디언(#day-body-1)이 열린다
      await page.locator('#routemap-view-metro [data-on-click="routeMap.jumpDay"]').nth(1).click();
      await page.waitForTimeout(250);
      assert.equal(await isOpen('modal-route-map'), false);
      assert.equal(await page.isVisible('#day-body-1'), true, '2일차 아코디언이 펼쳐져야 한다');
      return { day2Open: true };
    });

    await check('통계 국가 포커스·커넥터 순서·전체 보기 초기화·위성 줌·여정 열기·통계 복귀가 동작한다', async () => {
      await page.evaluate(() => openAnalyticsModal('lifetime'));
      await page.locator('#stat-lt-countries-grid [data-on-click="routeMap.focusCountry"]', { hasText: '스페인' }).click();
      await page.waitForTimeout(150);
      assert.equal(await isOpen('modal-route-map'), true);
      assert.equal(await page.isVisible('#btn-routemap-back-caller'), true);

      const connectors = await page.evaluate(() => {
        const text = document.getElementById('routemap-view-metro')?.textContent || '';
        return [...text.matchAll(/\[[^\]]+\]\s*➔\s*\[[^\]]+\]/g)].map(m => m[0]);
      });
      assert.deepEqual(connectors, ['[스페인] ➔ [공유]', '[공유] ➔ [일본]'], '정렬된 displayTrips 기준으로 다음 여행이 연결된다');

      // '전체 보기' 클릭 후 탭 왕복해도 이전 국가 하이라이트가 되살아나지 않는다
      await page.click('#routemap-view-metro [data-on-click="routeMap.resetFocus"]');
      assert.equal((await page.textContent('#routemap-view-metro')).includes('하이라이트되었습니다'), false);
      await page.click('#btn-routemap-tab-satellite');
      await page.waitForTimeout(150);
      // 위성 줌인 버튼 동작 확인
      await page.locator('#modal-route-map-links [data-on-click="routeMap.zoomGlobal"]').nth(1).click();
      await page.locator('#modal-route-map-links [data-on-click="routeMap.zoomGlobal"][data-trip="all"]').click();

      await page.click('#btn-routemap-tab-metro');
      assert.equal((await page.textContent('#routemap-view-metro')).includes('하이라이트되었습니다'), false);
      assert.equal(await page.evaluate(() => SulsulTravel.RouteMap.state().focusCountry), null);

      // '통계로 돌아가기' 클릭 → 통계 모달 복귀
      await page.click('#btn-routemap-back-caller');
      await page.waitForTimeout(150);
      assert.equal(await isOpen('modal-route-map'), false);
      assert.equal(await isOpen('modal-analytics'), true);

      // 통계 모달에서 '지도 열기'(routeMap.openGlobalFromAnalytics) 클릭 → '이 여정 열기'로 스페인 전환
      await page.click('[data-on-click="routeMap.openGlobalFromAnalytics"]');
      await page.waitForTimeout(150);
      await page.click('#btn-routemap-tab-metro');
      await page.locator('#routemap-view-metro [data-on-click="routeMap.openTrip"][data-trip="rm-es"]').click();
      await page.waitForTimeout(150);
      assert.equal(await isOpen('modal-route-map'), false);
      assert.equal(await page.evaluate(() => State.activeTripId), 'rm-es');
      return { connectors };
    });

    await check('공유 사본 HTML은 단일·전체 노선도와 위성 팝업·하단 링크에서 글자로만 보인다', async () => {
      const checkModalXss = () => page.evaluate(() => {
        const modal = document.getElementById('modal-route-map');
        return ['rmcity', 'rmspot', 'rmcountry', 'rmtitle', 'rmemoji'].filter(id => modal && modal.querySelector(`#${id}`));
      });

      await page.evaluate(() => { openTripWorkspace('rm-xss'); SulsulTravel.RouteMap.open(); });
      assert.deepEqual(await checkModalXss(), [], '단일 메트로');
      assert.match(await page.textContent('#routemap-view-metro'), /<b id="rmcity">가상도시<\/b>/);

      await page.click('#btn-routemap-tab-satellite');
      await page.waitForTimeout(150);
      assert.deepEqual(await checkModalXss(), [], '단일 위성');

      await page.evaluate(() => SulsulTravel.RouteMap.openGlobal(null, null));
      await page.waitForTimeout(150);
      assert.deepEqual(await checkModalXss(), [], '전체 위성');

      await page.click('#btn-routemap-tab-metro');
      assert.deepEqual(await checkModalXss(), [], '전체 메트로');
      assert.match(await page.textContent('#routemap-view-metro'), /<b id="rmcountry">가상국<\/b>/);
      await page.evaluate(() => closeModal('modal-route-map', true));
      return 'ok';
    });

    await check('화면의 모든 data-on-* 이름이 등록되어 있고, 320px에서 가로로 넘치지 않는다', async () => {
      await page.setViewportSize({ width: 320, height: 740 });
      const names = new Map();
      const collect = async () => {
        for (const [name, ok] of await page.evaluate(() => [...document.querySelectorAll('[data-on-click],[data-on-change],[data-on-input]')].map(e => {
          const name = e.dataset.onClick || e.dataset.onChange || e.dataset.onInput;
          return [name, SulsulTravel.UiActions.has(name)];
        }))) names.set(name, ok);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, '320px overflow');
      };

      await page.evaluate(() => { openTripWorkspace('rm-jp'); SulsulTravel.RouteMap.open(); });
      await collect();
      await page.click('#btn-routemap-tab-satellite');
      await page.waitForTimeout(150);
      await collect();

      await page.evaluate(() => SulsulTravel.RouteMap.openGlobal('스페인', 'modal-analytics'));
      await page.waitForTimeout(150);
      await collect();
      await page.click('#btn-routemap-tab-satellite');
      await page.waitForTimeout(150);
      await collect();
      await page.evaluate(() => closeModal('modal-route-map', true));

      assert.deepEqual([...names].filter(([, ok]) => !ok), []);
      return [...names.keys()].filter(name => /^routeMap\./.test(name)).sort();
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
