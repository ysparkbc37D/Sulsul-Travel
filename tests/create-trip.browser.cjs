/* 새 여행 만들기 모달·전 세계 국가/도시 선택기·거점 일자 배분·제출 분리 검증 (v2.2.4, 계획 4단계 15차).
 * Run: PLAYWRIGHT_MODULE=<optional> CHROME_PATH=<optional> node tests/create-trip.browser.cjs */
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

async function openPage(browser, origin, { timezoneId = 'Asia/Seoul', viewport = { width: 390, height: 844 } } = {}) {
  const context = await browser.newContext({ viewport, timezoneId, serviceWorkers: 'block' });
  const page = await context.newPage();
  const errors = [];
  const dialogs = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', async d => { dialogs.push(d.message()); await d.accept(); });
  await page.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
  await page.addInitScript(() => {
    localStorage.setItem('st_demo_choice_v1', 'dismissed');
  });
  await page.goto(origin + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.SulsulTravel?.CreateTrip?.open && document.getElementById('header-btn-create-trip')));
  return { context, page, errors, dialogs };
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || undefined
  });
  const results = [];

  try {
    // 1. UI 위임·권역 필터·검색 따옴표 XSS 차단·소도시 Enter 추가·시간 프리셋·컨셉 칩·320px 오버플로
    {
      const { context, page, errors } = await openPage(browser, origin);
      try {
        await page.click('#header-btn-create-trip');
        await page.waitForSelector('#modal-create-trip:not(.sheet-closed)');

        // data-on-* 동작 등록 확인
        const unregistered = await page.evaluate(() => {
          const known = new Set(window.SulsulTravel.UiActions.names());
          const modal = document.getElementById('modal-create-trip');
          const missing = [];
          for (const attr of ['data-on-click', 'data-on-change', 'data-on-input']) {
            for (const el of modal.querySelectorAll(`[${attr}]`)) {
              const name = el.getAttribute(attr);
              if (name && !known.has(name)) missing.push(`${attr}=${name}`);
            }
          }
          return missing;
        });
        assert.deepEqual(unregistered, [], 'all modal actions must be registered');

        // 권역 필터 aria-pressed 및 잘못된 키 폴백
        assert.equal(await page.getAttribute('#tab-reg-all', 'aria-pressed'), 'true');
        await page.click('#tab-reg-europe');
        assert.equal(await page.getAttribute('#tab-reg-europe', 'aria-pressed'), 'true');
        assert.equal(await page.getAttribute('#tab-reg-all', 'aria-pressed'), 'false');
        await page.evaluate(() => window.SulsulTravel.CreateTrip.setRegionFilter('invalid_region_xyz'));
        assert.equal(await page.getAttribute('#tab-reg-all', 'aria-pressed'), 'true');

        // 검색창 따옴표 XSS 페이로드 차단 + 안전한 직접 추가
        const payload = "x');window.__pwn=1;//";
        await page.fill('#create-trip-search-input', payload);
        await page.click('[data-on-click="createTrip.addCustomCountry"]');
        const xssState = await page.evaluate(() => ({
          pwn: window.__pwn || 0,
          countriesVal: document.getElementById('trip-form-countries')?.value || '',
          selectedCount: window.SulsulTravel.State.createTripSelectedCountries.length
        }));
        assert.equal(xssState.pwn, 0, 'quoted search payload must never execute JS');
        assert.equal(xssState.selectedCount, 1);
        assert.ok(xssState.countriesVal.includes("x');window.__pwn=1;//"));

        // 커스텀 국가 제외 및 검색어 지우기 후 일본 선택 + 통화 자동 동기화 + 시차 배너
        await page.click('#create-trip-selected-destinations-board [data-on-click="createTrip.toggleCountry"]');
        assert.equal(await page.evaluate(() => window.SulsulTravel.State.createTripSelectedCountries.length), 0);
        await page.click('#btn-clear-create-search');
        assert.equal(await page.inputValue('#create-trip-search-input'), '');

        await page.click('#tab-reg-east_asia');
        await page.click('#create-trip-country-chips [data-on-click="createTrip.toggleCountry"][data-code="JP"]');
        const jpState = await page.evaluate(() => ({
          curr: document.getElementById('trip-form-curr')?.value,
          aria: document.querySelector('#create-trip-country-chips [data-code="JP"]')?.getAttribute('aria-pressed'),
          tzText: document.getElementById('trip-form-tz-text')?.textContent || ''
        }));
        assert.equal(jpState.curr, 'JPY');
        assert.equal(jpState.aria, 'true');
        assert.ok(jpState.tzText.includes('동아시아') || jpState.tzText.includes('시차'));

        // 도시 칩 토글 및 아포스트로피 포함 소도시 Enter 추가
        await page.click('[data-city-chip="true"][data-code="JP"][data-city="도쿄"]');
        assert.equal(await page.getAttribute('[data-city-chip="true"][data-code="JP"][data-city="도쿄"]', 'aria-pressed'), 'true');
        await page.fill('#input-custom-city-JP', "St. John's");
        await page.press('#input-custom-city-JP', 'Enter');
        const customCitySelector = `[data-city-chip="true"][data-code="JP"][data-city="St. John's"]`;
        await page.waitForSelector(customCitySelector);
        assert.equal(await page.getAttribute(customCitySelector, 'aria-pressed'), 'true');
        await page.click(customCitySelector);
        assert.equal(await page.getAttribute(customCitySelector, 'aria-pressed'), 'false');

        // 빠른 시간 프리셋 & 컨셉 칩 aria-pressed
        await page.click('[data-on-click="createTrip.setTime"][data-target="trip-form-arrival-time"][data-time="10:00"]');
        assert.equal(await page.inputValue('#trip-form-arrival-time'), '10:00');
        await page.click('[data-on-click="createTrip.toggleConcept"][data-concept="맛집"]');
        assert.equal(await page.getAttribute('[data-on-click="createTrip.toggleConcept"][data-concept="맛집"]', 'aria-pressed'), 'true');

        // 320px 모바일 가로 오버플로 0 확인
        await page.setViewportSize({ width: 320, height: 700 });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        assert.equal(overflow, false, 'create trip modal must not overflow horizontally at 320px');
        assert.deepEqual(errors, [], 'no pageerror in UI interactions');
        results.push({ name: 'create-trip UI, XSS guard, apostrophe city, 320px layout', passed: true });
      } finally {
        await context.close();
      }
    }

    // 2. 날짜 역전 거절 · 0원 예산 보존 · KST(+09:00) AI Day 1 날짜 정확성 · allocateTripHubs 다국가/단기 배분
    {
      const { context, page, errors, dialogs } = await openPage(browser, origin, { timezoneId: 'Asia/Seoul' });
      try {
        // 2-A. 날짜 역전 거절
        await page.click('#header-btn-create-trip');
        await page.waitForSelector('#modal-create-trip:not(.sheet-closed)');
        await page.fill('#trip-form-title', '역전 날짜 테스트');
        await page.fill('#trip-form-start', '2026-10-10');
        await page.fill('#trip-form-end', '2026-10-05');
        await page.click('#btn-submit-create-trip');
        const reversed = await page.evaluate(() => ({
          modalOpen: !document.getElementById('modal-create-trip').classList.contains('sheet-closed'),
          tripsCount: window.SulsulTravel.State.trips.length,
          toast: document.getElementById('sulsul-global-toast')?.textContent || ''
        }));
        assert.equal(reversed.modalOpen, true, 'modal must stay open when end < start');
        assert.equal(reversed.tripsCount, 0, 'reversed-date trip must not be saved');
        assert.ok(reversed.toast.includes('종료일'), 'toast should explain reversed date');

        // 2-B. 명시 0원 예산 보존 + 로컬 초안 날짜 정확성(KST)
        await page.fill('#trip-form-title', '무예산 도쿄 3일');
        await page.click('#tab-reg-east_asia');
        await page.click('#create-trip-country-chips [data-code="JP"]');
        await page.click('[data-city-chip="true"][data-code="JP"][data-city="도쿄"]');
        await page.fill('#trip-form-start', '2026-10-01');
        await page.fill('#trip-form-end', '2026-10-03');
        await page.fill('#trip-form-budget', '0');
        await page.click('#btn-submit-create-trip');
        await page.waitForFunction(() => document.getElementById('modal-create-trip').classList.contains('sheet-closed'));
        assert.deepEqual(dialogs, [], 'unexpected alert during local submitCreateTrip');

        const localTrip = await page.evaluate(() => {
          const t = window.SulsulTravel.State.trips[0];
          return {
            title: t?.title,
            budget: t?.budget,
            initBal: t?.initialBalances?.[t?.currency],
            planSource: t?.planSource,
            dayCount: t?.days?.length,
            d1: t?.days?.[0]?.date,
            d3: t?.days?.[2]?.date,
            d1Spots: t?.days?.[0]?.spots?.length
          };
        });
        assert.equal(localTrip.title, '무예산 도쿄 3일');
        assert.equal(localTrip.budget, 0, 'explicit 0 budget must not be replaced by 3000000');
        assert.equal(localTrip.initBal, 0);
        assert.equal(localTrip.planSource, 'local_draft');
        assert.equal(localTrip.dayCount, 3);
        assert.equal(localTrip.d1, '2026-10-01', 'local draft Day 1 date must match startDate in KST');
        assert.equal(localTrip.d3, '2026-10-03');
        assert.ok(localTrip.d1Spots >= 2);

        // 2-C. KST AI 대기 일정 Day 1 날짜 정확성 + 다국가 popularCities 매핑 + 단기 배분
        await page.evaluate(() => {
          localStorage.setItem('st_gemini_key', 'AIzaSyDummyKeyForKstDateVerify123456');
          window.SulsulTravel.State.geminiKey = 'AIzaSyDummyKeyForKstDateVerify123456';
          window.SulsulTravel.switchView('hub');
        });
        await page.click('#header-btn-create-trip');
        await page.waitForSelector('#modal-create-trip:not(.sheet-closed)');
        await page.fill('#trip-form-title', '일본·프랑스 6일');
        await page.click('#tab-reg-east_asia');
        await page.click('#create-trip-country-chips [data-code="JP"]');
        await page.click('#tab-reg-europe');
        await page.click('#create-trip-country-chips [data-code="FR"]');
        await page.click('[data-city-chip="true"][data-code="JP"][data-city="도쿄"]');
        await page.click('[data-city-chip="true"][data-code="FR"][data-city="파리"]');
        await page.fill('#trip-form-start', '2026-10-01');
        await page.fill('#trip-form-end', '2026-10-06');
        await page.fill('#trip-form-budget', '0');
        await page.click('#btn-submit-create-trip');
        await page.waitForFunction(() => document.getElementById('modal-create-trip').classList.contains('sheet-closed'));
        assert.deepEqual(dialogs, [], 'unexpected alert during AI submitCreateTrip');

        const aiCheck = await page.evaluate(() => {
          const t = window.SulsulTravel.State.trips[0];
          const shortHubs = window.SulsulTravel.CreateTrip.allocateTripHubs(
            ['일본', '프랑스', '스페인'],
            ['도쿄', '파리', '마드리드'],
            2
          );
          const threeDayHubs = window.SulsulTravel.CreateTrip.allocateTripHubs(
            ['일본', '프랑스', '스페인'],
            ['도쿄', '파리', '마드리드'],
            3
          );
          return {
            planSource: t?.planSource,
            budget: t?.budget,
            d1: t?.days?.[0]?.date,
            d6: t?.days?.[5]?.date,
            hubs: (t?.hubAllocations || []).map(h => ({ name: h.name, cities: h.cities, dayCount: h.dayCount })),
            shortHubTotalDays: shortHubs.reduce((s, h) => s + h.dayCount, 0),
            shortHubCount: shortHubs.length,
            threeDayCities: threeDayHubs.map(h => ({ name: h.name, cities: h.cities }))
          };
        });
        assert.equal(aiCheck.planSource, 'ai_pending');
        assert.equal(aiCheck.budget, 0);
        assert.equal(aiCheck.d1, '2026-10-01', 'AI pending Day 1 must NOT shift to 2026-09-30 in KST');
        assert.equal(aiCheck.d6, '2026-10-06');
        const jpHub = aiCheck.hubs.find(h => h.name === '일본');
        const frHub = aiCheck.hubs.find(h => h.name === '프랑스');
        assert.deepEqual(jpHub?.cities, ['도쿄']);
        assert.deepEqual(frHub?.cities, ['파리']);
        assert.equal(aiCheck.shortHubTotalDays, 2, '2-day 3-country allocation must sum to 2, not 3');
        assert.equal(aiCheck.shortHubCount, 2, '0-day overflow hubs must be omitted');
        assert.deepEqual(aiCheck.threeDayCities.find(h => h.name === '스페인')?.cities, ['마드리드']);

        assert.deepEqual(errors, [], 'no pageerror in validation/KST/hub allocation checks');
        results.push({ name: 'reversed date guard, zero budget, KST dates, multi-country hub allocation', passed: true });
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log(JSON.stringify({ suite: 'create-trip.browser.cjs', passed: results.every(r => r.passed), results }, null, 2));
  if (!results.every(r => r.passed)) process.exit(1);
})();
