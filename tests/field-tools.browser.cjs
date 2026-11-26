/* 현장 도구 모음(빠른 환율 계산기·서바이벌 스페인어·GPS 스팟 레이더) 분리 검증 (v2.2.6, 계획 4단계 17차).
 * Run: PLAYWRIGHT_MODULE=<optional> CHROME_PATH=<optional> node tests/field-tools.browser.cjs */
const { chromium } = require('./helpers/playwright.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const root = path.resolve(__dirname, '..');
const mime = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.mjs': 'application/javascript', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
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
    id: 'field-tools-test',
    title: '도쿄 현장 도구 테스트',
    startDate: '2026-12-01',
    endDate: '2026-12-03',
    durationDays: 3,
    countries: ['일본'],
    cities: ['도쿄', '</option></select><img id="gpsoptxss" src=x>'],
    currency: 'JPY',
    budget: 150000,
    revision: 1,
    days: [
      {
        id: 'ft-d1', dayNum: 1, date: '2026-12-01', city: '도쿄',
        spots: [
          { id: 'ft-s1', time: '10:00', title: "시부야', 'sim');window.__gpsPwn=1;//", lat: 35.6595, lng: 139.7004 },
          { id: 'ft-s2', time: '13:00', title: '신주쿠', lat: 35.6938, lng: 139.7034 }
        ]
      }
    ],
    expenses: [],
    journals: {},
    checklist: []
  };
}

async function openPage(browser, origin) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Seoul', serviceWorkers: 'block' });
  const page = await context.newPage();
  const errors = [];
  const dialogs = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', async d => { dialogs.push(d.message()); await d.accept(); });
  await page.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
  const seed = makeSeedTrip();
  await page.addInitScript(trip => {
    localStorage.setItem('st_demo_choice_v1', 'dismissed');
    localStorage.setItem('st_trips_v2', JSON.stringify([trip]));
  }, seed);
  await page.goto(origin + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.SulsulTravel?.FieldTools?.openQuickCurrencyCalc && window.SulsulTravel.State.trips.length === 1));
  return { context, page, errors, dialogs };
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
  const results = [];

  try {
    // 1. 빠른 환율 계산기(활성 여행 통화 JPY 노출 · MEP 체크박스 동기화 · 음수 차단 · 320px) + 서바이벌 스페인어 토스트 XSS 차단
    {
      const { context, page, errors, dialogs } = await openPage(browser, origin);
      try {
        await page.evaluate(() => {
          window.SulsulTravel.openTripWorkspace('field-tools-test');
          window.SulsulTravel.State.isMepEnabled = false;
        });

        // 워크스페이스에서 빠른 환율 계산기 열기
        await page.evaluate(() => window.SulsulTravel.FieldTools.openQuickCurrencyCalc());
        await page.waitForSelector('#modal-quick-currency:not(.sheet-closed)');

        // data-on-* 모두 등록 확인
        const unregistered = await page.evaluate(() => {
          const known = new Set(window.SulsulTravel.UiActions.names());
          const missing = [];
          for (const id of ['modal-quick-currency', 'modal-survival-spanish', 'gps-radar-card']) {
            const rootEl = document.getElementById(id);
            if (!rootEl) continue;
            for (const attr of ['data-on-click', 'data-on-change', 'data-on-input']) {
              for (const el of rootEl.querySelectorAll(`[${attr}]`)) {
                const name = el.getAttribute(attr);
                if (name && !known.has(name)) missing.push(`${id}:${attr}=${name}`);
              }
            }
          }
          return missing;
        });
        assert.deepEqual(unregistered, [], 'all fieldTools actions must be registered');

        // 도쿄 여행의 JPY 칩 자동 포함 및 선택 상태 확인
        const jpyChip = '#quick-calc-currency-chips [data-code="JPY"]';
        await page.waitForSelector(jpyChip);
        assert.equal(await page.getAttribute(jpyChip, 'aria-pressed'), 'true');

        // ARS 전환 시 MEP 체크박스가 State.isMepEnabled=false와 일치하는지 확인
        await page.click('#quick-calc-currency-chips [data-code="ARS"]');
        const arsState = await page.evaluate(() => ({
          aria: document.querySelector('#quick-calc-currency-chips [data-code="ARS"]')?.getAttribute('aria-pressed'),
          chkChecked: document.getElementById('quick-calc-chk-mep')?.checked,
          rateText: document.getElementById('quick-calc-rate-info')?.textContent || ''
        }));
        assert.equal(arsState.aria, 'true');
        assert.equal(arsState.chkChecked, false, 'MEP checkbox must match State.isMepEnabled=false');
        assert.ok(arsState.rateText.includes('공식 환율'));

        // 음수 입력 차단 (0원으로 클램프) + 빠른 금액 더하기 + C 초기화
        await page.fill('#quick-calc-input-amount', '-50000');
        assert.equal(await page.textContent('#quick-calc-result-krw'), '약 0 원');
        await page.click('[data-on-click="fieldTools.addCurrencyAmount"][data-delta="10000"]');
        assert.equal(await page.inputValue('#quick-calc-input-amount'), '10,000');
        await page.click('[data-on-click="fieldTools.clearCurrency"]');
        assert.equal(await page.inputValue('#quick-calc-input-amount'), '0');

        // 320px 가로 오버플로 0
        await page.setViewportSize({ width: 320, height: 700 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false);
        await page.waitForTimeout(400);
        await page.click('#modal-quick-currency [data-on-click="shell.closeModal"] >> nth=1');
        await page.waitForFunction(() => document.getElementById('modal-quick-currency').classList.contains('sheet-closed'));

        // 서바이벌 스페인어 모달 열기 + 문장 복사 버튼 클릭 + 토스트 HTML XSS 차단
        await page.setViewportSize({ width: 390, height: 844 });
        await page.evaluate(() => window.SulsulTravel.FieldTools.openSurvivalSpanishModal());
        await page.waitForSelector('#modal-survival-spanish:not(.sheet-closed)');
        await page.click('#survival-spanish-cards [data-on-click="fieldTools.copyPhrase"] >> nth=0');
        await page.evaluate(() => window.SulsulTravel.FieldTools.copySpanishText('<img id="spxss" src=x>'));
        await page.waitForTimeout(100);
        const spGuard = await page.evaluate(() => ({
          injected: Boolean(document.querySelector('#sulsul-global-toast img#spxss')),
          text: document.getElementById('sulsul-global-toast')?.textContent || ''
        }));
        assert.equal(spGuard.injected, false, 'copySpanishText must escape HTML before showToast');
        assert.ok(spGuard.text.includes('<img id="spxss" src=x>'));

        assert.deepEqual(errors, []);
        assert.deepEqual(dialogs, []);
        results.push({ name: 'quick currency (JPY chip, MEP sync, non-negative) & survival spanish toast XSS guard', passed: true });
      } finally {
        await context.close();
      }
    }

    // 2. GPS 스팟 레이더: <option> XSS 차단 · pill onclick XSS 차단 · city_0 실제 도쿄 좌표 해석 · tripId 유지 · 일정 추가
    {
      const { context, page, errors, dialogs } = await openPage(browser, origin);
      try {
        await page.evaluate(() => {
          window.SulsulTravel.openTripWorkspace('field-tools-test');
          window.SulsulTravel.switchTab('plan');
          window.SulsulTravel.PlanBlocks.switchSubTab('timeline');
        });

        const optCheck = await page.evaluate(() => ({
          optXss: Boolean(document.getElementById('gpsoptxss')),
          optionCount: document.querySelectorAll('#select-sim-gps option').length
        }));
        assert.equal(optCheck.optXss, false, 'GPS option must escape city names');
        assert.equal(optCheck.optionCount, 3);

        // city_0 (도쿄) 시뮬레이션 -> 서울(37.5665)이 아니라 도쿄 좌표(35.x, 139.x)로 이동 & tripId 보존
        await page.evaluate(() => window.SulsulTravel.FieldTools.simulateGpsLocation('city_0'));
        const simCheck = await page.evaluate(() => {
          const g = window.SulsulTravel.State.gps;
          // 다시 renderGpsRadar를 불러도 tripId가 보존되어 모의 위치가 리셋되지 않아야 함
          window.SulsulTravel.FieldTools.renderGpsRadar();
          const after = window.SulsulTravel.State.gps;
          return {
            lat: g.lat, lng: g.lng, tripId: g.tripId, mode: g.mode,
            preservedAfterRerender: after.mode === 'sim' && after.lat === g.lat && after.lng === g.lng
          };
        });
        assert.ok(simCheck.lat > 35 && simCheck.lat < 36, 'city_0 must resolve to Tokyo latitude, not Seoul');
        assert.ok(simCheck.lng > 139 && simCheck.lng < 140, 'city_0 must resolve to Tokyo longitude');
        assert.equal(simCheck.tripId, 'field-tools-test');
        assert.equal(simCheck.preservedAfterRerender, true);

        // 주변 스팟 알약 클릭 시 따옴표 페이로드가 실행되지 않고 안전하게 시뮬레이션 전환
        await page.evaluate(() => {
          // 강제로 시부야(payload)가 알약에 나오도록 신주쿠 좌표로 이동
          window.SulsulTravel.FieldTools.updateGpsRadarUI(35.6938, 139.7034, '신주쿠 기준', 'sim');
          document.querySelector('#gps-nearby-pills button')?.click();
        });
        const pillCheck = await page.evaluate(() => ({
          pwn: Boolean(window.__gpsPwn === 1),
          label: window.SulsulTravel.State.gps.label
        }));
        assert.equal(pillCheck.pwn, false, 'GPS nearby pill click must not execute quote payload');
        assert.ok(pillCheck.label.includes('시부야'));

        // 오늘 일정에 추가 (연타 시 1회만 추가)
        const addRes = await page.evaluate(async () => {
          const before = window.SulsulTravel.State.trips[0].days[0].spots.length;
          const [r1, r2] = await Promise.all([
            window.SulsulTravel.FieldTools.addGpsSpotToActiveDay(),
            window.SulsulTravel.FieldTools.addGpsSpotToActiveDay()
          ]);
          const after = window.SulsulTravel.State.trips[0].days[0].spots.length;
          return { r1, r2, delta: after - before };
        });
        assert.deepEqual(addRes, { r1: true, r2: false, delta: 1 });

        assert.deepEqual(errors, []);
        assert.deepEqual(dialogs, []);
        results.push({ name: 'GPS radar option/pill XSS guards, Tokyo city_0 coords, tripId persistence, safe add spot', passed: true });
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log(JSON.stringify({ suite: 'field-tools.browser.cjs', passed: results.every(r => r.passed), results }, null, 2));
  if (!results.every(r => r.passed)) process.exit(1);
})();
