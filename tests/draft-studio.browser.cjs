/* 여행 설정 & 일정 초안 편집 스튜디오 분리 검증 (v2.2.5, 계획 4단계 16차).
 * Run: PLAYWRIGHT_MODULE=<optional> CHROME_PATH=<optional> node tests/draft-studio.browser.cjs */
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

function makeSeedTrip() {
  return {
    id: 'draft-studio-test',
    title: '도쿄·파리 4일 빈 여행',
    startDate: '2026-12-01',
    endDate: '2026-12-04',
    durationDays: 4,
    arrivalTime: '14:00',
    departureTime: '17:00',
    countries: ['일본', '프랑스'],
    cities: ['도쿄', '파리'],
    currency: 'JPY',
    budget: 200000,
    revision: 1,
    days: [
      { id: 'ds-d1', dayNum: 1, date: '2026-12-01', city: '일본', spots: [] },
      { id: 'ds-d2', dayNum: 2, date: '2026-12-02', city: '일본', spots: [] },
      { id: 'ds-d3', dayNum: 3, date: '2026-12-03', city: '프랑스', spots: [] },
      { id: 'ds-d4', dayNum: 4, date: '2026-12-04', city: '프랑스', spots: [] }
    ],
    expenses: [],
    journals: {},
    checklist: []
  };
}

async function openPage(browser, origin, seedOverride = null) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Seoul', serviceWorkers: 'block' });
  const page = await context.newPage();
  const errors = [];
  const dialogs = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', async d => { dialogs.push(d.message()); await d.accept(); });
  await page.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
  const seed = seedOverride || makeSeedTrip();
  await page.addInitScript(trip => {
    localStorage.setItem('st_demo_choice_v1', 'dismissed');
    localStorage.setItem('st_trips_v2', JSON.stringify([trip]));
  }, seed);
  await page.goto(origin + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.SulsulTravel?.DraftStudio?.open && window.SulsulTravel.State.trips.length === 1));
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
    // 1. 빈 여행 'AI 초안 만들기' 진입 초기화 · data-on-* 등록 · XSS(onclick/toast) 차단 · 소도시 Enter · 320px 오버플로
    {
      const { context, page, errors, dialogs } = await openPage(browser, origin);
      try {
        await page.evaluate(() => window.SulsulTravel.openTripWorkspace('draft-studio-test'));
        await page.waitForSelector('#big-plan-container [data-on-click="draftStudio.open"]');
        await page.click('#big-plan-container [data-on-click="draftStudio.open"]');
        await page.waitForSelector('#modal-ai-trip:not(.sheet-closed)');

        // 모달이 빈 상태가 아니라 실제 여행 날짜·국가·거점 스테퍼로 초기화됐는지 확인
        const initCheck = await page.evaluate(() => ({
          start: document.getElementById('draft-studio-start-date')?.value,
          end: document.getElementById('draft-studio-end-date')?.value,
          badge: document.getElementById('draft-studio-total-days-badge')?.textContent,
          selectedCountries: window.SulsulTravel.DraftStudio.state.selectedCountries.slice(),
          hubCount: window.SulsulTravel.DraftStudio.state.hubs.length
        }));
        assert.equal(initCheck.start, '2026-12-01');
        assert.equal(initCheck.end, '2026-12-04');
        assert.equal(initCheck.badge, '총 4일간');
        assert.deepEqual(initCheck.selectedCountries, ['JP', 'FR']);
        assert.equal(initCheck.hubCount, 2);

        // 모든 data-on-* 동작 등록 확인
        const unregistered = await page.evaluate(() => {
          const known = new Set(window.SulsulTravel.UiActions.names());
          const modal = document.getElementById('modal-ai-trip');
          const missing = [];
          for (const attr of ['data-on-click', 'data-on-change', 'data-on-input']) {
            for (const el of modal.querySelectorAll(`[${attr}]`)) {
              const name = el.getAttribute(attr);
              if (name && !known.has(name)) missing.push(`${attr}=${name}`);
            }
          }
          return missing;
        });
        assert.deepEqual(unregistered, [], 'all draft studio actions must be registered');

        // 권역 필터 aria-pressed 및 미지 권역 폴백
        assert.equal(await page.getAttribute('#draft-tab-reg-all', 'aria-pressed'), 'true');
        await page.click('#draft-tab-reg-europe');
        assert.equal(await page.getAttribute('#draft-tab-reg-europe', 'aria-pressed'), 'true');
        assert.equal(await page.getAttribute('#draft-tab-reg-all', 'aria-pressed'), 'false');
        await page.evaluate(() => window.SulsulTravel.DraftStudio.setRegionFilter('unknown_region'));
        assert.equal(await page.getAttribute('#draft-tab-reg-all', 'aria-pressed'), 'true');

        // 소문자 onclick 따옴표 XSS 차단 + 대소문자 보존
        await page.fill('#draft-studio-search-input', "x');window.__draftpwn=1;//");
        await page.click('#draft-studio-country-chips [data-on-click="draftStudio.addCustomCountry"]');
        assert.equal(await page.evaluate(() => window.__draftpwn || 0), 0, 'quote payload must not execute JS');

        // 토스트 HTML XSS 차단 (<img id="toastxss">)
        await page.fill('#draft-studio-search-input', '<img id="toastxss" src=x onerror="window.__toastPwn=1">');
        await page.click('#draft-studio-country-chips [data-on-click="draftStudio.addCustomCountry"]');
        const toastGuard = await page.evaluate(() => ({
          imgInjected: Boolean(document.querySelector('#sulsul-global-toast img#toastxss')),
          pwn: Boolean(window.__toastPwn === 1)
        }));
        assert.deepEqual(toastGuard, { imgInjected: false, pwn: false });

        // 검색 지우기 + 대소문자 유지 커스텀 국가 + 아포스트로피 소도시 Enter 추가
        await page.click('#btn-clear-draft-search');
        assert.equal(await page.inputValue('#draft-studio-search-input'), '');
        await page.fill('#input-draft-custom-city-JP', "O'Connor");
        await page.press('#input-draft-custom-city-JP', 'Enter');
        const customCityBtn = `[data-draft-city-chip="true"][data-code="JP"][data-city="O'Connor"]`;
        await page.waitForSelector(customCityBtn);
        assert.equal(await page.getAttribute(customCityBtn, 'aria-pressed'), 'true');

        // 320px 가로 오버플로 0 확인
        await page.setViewportSize({ width: 320, height: 700 });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        assert.equal(overflow, false, 'draft studio modal must not overflow horizontally at 320px');
        assert.deepEqual(errors, []);
        assert.deepEqual(dialogs, []);
        results.push({ name: 'entry init, XSS/toast guards, apostrophe city, 320px layout', passed: true });
      } finally {
        await context.close();
      }
    }

    // 2. 날짜 역전 거절 · 거점 스테퍼/균등 배분 · 컨셉 칩 aria-pressed · 설정 저장 연타 보호 · 타임라인 배너 진입
    {
      const noDaysTrip = { ...makeSeedTrip(), days: [] };
      const { context, page, errors, dialogs } = await openPage(browser, origin, noDaysTrip);
      try {
        await page.evaluate(() => {
          window.SulsulTravel.openTripWorkspace('draft-studio-test');
          window.SulsulTravel.switchTab('plan');
          window.SulsulTravel.PlanBlocks.switchSubTab('timeline');
        });
        await page.waitForSelector('#banner-ai-recommend [data-on-click="timeline.aiTrip"]');
        await page.click('#banner-ai-recommend [data-on-click="timeline.aiTrip"]');
        await page.waitForSelector('#modal-ai-trip:not(.sheet-closed)');
        assert.equal(await page.inputValue('#draft-studio-start-date'), '2026-12-01', 'timeline banner must initialize Draft Studio');

        // 날짜 역전 거절 (change + saveSettings 모두 차단, 기존 trip 날짜 보존)
        await page.fill('#draft-studio-start-date', '2026-12-10');
        await page.fill('#draft-studio-end-date', '2026-12-05');
        await page.dispatchEvent('#draft-studio-end-date', 'change');
        await page.click('#btn-save-draft-settings');
        const reversed = await page.evaluate(() => ({
          open: !document.getElementById('modal-ai-trip').classList.contains('sheet-closed'),
          toast: document.getElementById('sulsul-global-toast')?.textContent || '',
          tripStart: window.SulsulTravel.State.trips[0].startDate,
          tripEnd: window.SulsulTravel.State.trips[0].endDate
        }));
        assert.equal(reversed.open, true, 'modal must stay open when end < start');
        assert.ok(reversed.toast.includes('종료일'));
        assert.equal(reversed.tripStart, '2026-12-01');
        assert.equal(reversed.tripEnd, '2026-12-04');

        // 정상 날짜 변경(6일간) → 스테퍼 +1(불일치) → 균등 배분(일치) → 컨셉 토글 → 설정만 저장
        await page.fill('#draft-studio-start-date', '2026-12-01');
        await page.fill('#draft-studio-end-date', '2026-12-06');
        await page.dispatchEvent('#draft-studio-end-date', 'change');
        assert.equal(await page.textContent('#draft-studio-total-days-badge'), '총 6일간');

        await page.click('[data-on-click="draftStudio.adjustHubDays"][data-hub-index="0"][data-delta="1"]');
        assert.ok((await page.textContent('#draft-studio-balance-status')).includes('초과'));

        await page.click('[data-on-click="draftStudio.autoBalance"]');
        assert.ok((await page.textContent('#draft-studio-balance-status')).includes('일치'));

        await page.click('[data-on-click="draftStudio.toggleConcept"][data-concept="맛집"]');
        assert.equal(await page.getAttribute('[data-on-click="draftStudio.toggleConcept"][data-concept="맛집"]', 'aria-pressed'), 'true');

        // 연타 호출 시 두 번째 호출은 무시되어 REVISION_CONFLICT 없이 1회만 저장
        const savePair = await page.evaluate(async () => {
          const [r1, r2] = await Promise.all([
            window.SulsulTravel.DraftStudio.saveSettingsOnly(),
            window.SulsulTravel.DraftStudio.saveSettingsOnly()
          ]);
          const t = window.SulsulTravel.State.trips[0];
          return {
            r1, r2,
            modalClosed: document.getElementById('modal-ai-trip').classList.contains('sheet-closed'),
            startDate: t.startDate,
            endDate: t.endDate,
            durationDays: t.durationDays,
            concepts: t.concepts
          };
        });
        assert.equal(savePair.r1, true);
        assert.equal(savePair.r2, false, 'concurrent second save must be ignored by in-flight guard');
        assert.equal(savePair.modalClosed, true);
        assert.equal(savePair.startDate, '2026-12-01');
        assert.equal(savePair.endDate, '2026-12-06');
        assert.equal(savePair.durationDays, 6);
        assert.deepEqual(savePair.concepts, ['맛집']);

        assert.deepEqual(errors, []);
        assert.deepEqual(dialogs, []);
        results.push({ name: 'timeline banner entry, reversed date guard, steppers, concurrent save guard', passed: true });
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log(JSON.stringify({ suite: 'draft-studio.browser.cjs', passed: results.every(r => r.passed), results }, null, 2));
  if (!results.every(r => r.passed)) process.exit(1);
})();
