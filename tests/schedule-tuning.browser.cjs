/* 스팟 편집·실시간 일정 튜닝·RePlan 검토 분리 검증 (v2.2.2, 계획 4단계 14차).
 * Run: PLAYWRIGHT_MODULE=<optional> CHROME_PATH=<optional> node tests/schedule-tuning.browser.cjs */
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

function makeTrip() {
  return {
    id: 'tuning-test',
    title: '도쿄 2일 테스트',
    startDate: '2026-10-01',
    endDate: '2026-10-02',
    countries: ['일본'],
    cities: ['도쿄'],
    currency: 'JPY',
    budget: 120000,
    revision: 1,
    days: [
      {
        id: 'day-1',
        dayNum: '1</option></select><img id="spotxss" src=x>',
        date: '2026-10-01',
        city: '도쿄',
        title: '도착 & 산책',
        spots: [
          { id: 's-undecided', time: '', cat: 'tour', title: '시간 미정 산책', desc: '자유 산책', completed: false, fixed: false },
          { id: 's-done', time: '09:00', cat: 'food', title: '아침 식사', desc: '완료됨', completed: true, fixed: false },
          { id: 's-fixed', time: '12:00', cat: 'tour', title: '예약 박물관', desc: '고정됨', completed: false, fixed: true },
          { id: 's-pending', time: '14:00', cat: 'tour', title: '시부야 산책', desc: '예정', completed: false, fixed: false }
        ]
      },
      {
        id: 'day-2',
        dayNum: 2,
        date: '2026-10-02',
        city: '도쿄',
        title: '둘째 날',
        spots: [
          { id: 's-d2-pending', time: '10:30', cat: 'tour', title: '우에노 공원', desc: '', completed: false, fixed: false }
        ]
      }
    ],
    expenses: [],
    journals: {},
    checklist: []
  };
}

async function openPage(browser, origin) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', async d => { await d.accept(); });
  await page.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
  await page.goto(`${origin}/`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important;scroll-behavior:auto!important}' });
  return { context, page, errors };
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const launch = { headless: true };
  if (process.env.CHROME_PATH) launch.executablePath = process.env.CHROME_PATH;
  const browser = await chromium.launch(launch);
  const results = [];

  try {
    // 1. 스팟 수정 시 시간 미정 보존·dayNum XSS 차단·범위 초과 일차 보정·빈 일정 가드
    {
      const { context, page, errors } = await openPage(browser, origin);
      try {
        await page.evaluate(async trip => {
          State.trips = await TripRepository.saveAll([trip]);
          State.activeTripId = trip.id;
          openTripWorkspace(trip.id);
        }, makeTrip());

        // 시간 미정 일정 편집 시 '09:00'이 임의로 채워지지 않고 dayNum XSS가 삽입되지 않는다.
        const editOpen = await page.evaluate(() => {
          SulsulTravel.ScheduleTuning.openEditSpotModal(0, 0);
          return {
            open: !document.getElementById('modal-spot').classList.contains('sheet-closed'),
            timeVal: document.getElementById('spot-form-time').value,
            xssFound: Boolean(document.getElementById('spotxss')),
            firstOptionText: document.getElementById('spot-form-day').options[0]?.textContent || ''
          };
        });
        assert.equal(editOpen.open, true);
        assert.equal(editOpen.timeVal, '');
        assert.equal(editOpen.xssFound, false);
        assert.ok(editOpen.firstOptionText.startsWith('Day 1:'));

        await page.locator('#spot-form-title').fill('시간 미정 산책(수정)');
        await page.locator('#spot-form-submit-btn').click();
        await page.waitForFunction(() => document.getElementById('modal-spot').classList.contains('sheet-closed'));

        const afterSave = await page.evaluate(() => {
          const spot = getActiveTrip().days[0].spots.find(s => s.id === 's-undecided');
          return { title: spot.title, time: spot.time };
        });
        assert.deepEqual(afterSave, { title: '시간 미정 산책(수정)', time: '' });

        // 범위 초과 dayIdx는 0으로 안전 보정된다.
        const outOfRange = await page.evaluate(() => {
          SulsulTravel.ScheduleTuning.openAddSpotToDay(99);
          const val = document.getElementById('spot-form-day').value;
          closeModal('modal-spot', true);
          return val;
        });
        assert.equal(outOfRange, '0');

        // days가 비어 있는 여행에서는 빈 스팟 모달을 열지 않는다.
        const emptyGuard = await page.evaluate(async () => {
          const emptyTrip = { id: 'empty-days-trip', title: '빈 여행', countries: ['일본'], cities: ['도쿄'], currency: 'JPY', budget: 0, days: [], expenses: [], journals: {}, checklist: [] };
          State.trips = await TripRepository.saveAll([emptyTrip]);
          State.activeTripId = emptyTrip.id;
          SulsulTravel.ScheduleTuning.openAddSpotModal();
          return document.getElementById('modal-spot').classList.contains('sheet-closed');
        });
        assert.equal(emptyGuard, true);

        assert.deepEqual(errors, []);
        results.push({ name: 'spot-modal-time-undecided-xss-and-bounds', passed: true });
      } finally {
        await context.close();
      }
    }

    // 2. 일정 튜닝 프리셋·aria-pressed·범위 보정·0분 안내·RePlan 적용 및 연타 방지·구간 재배치·320px
    {
      const { context, page, errors } = await openPage(browser, origin);
      try {
        await page.evaluate(async trip => {
          State.trips = await TripRepository.saveAll([trip]);
          State.activeTripId = trip.id;
          openTripWorkspace(trip.id);
        }, makeTrip());

        // 잘못된 rangeEndIdx(99)로 열어도 select가 비지 않고 단일 일차('0')로 폴백하며 XSS가 없다.
        const badRange = await page.evaluate(() => {
          SulsulTravel.ScheduleTuning.openScheduleTuningModal(0, 99);
          return {
            val: document.getElementById('tuning-target-day').value,
            xssFound: Boolean(document.getElementById('spotxss'))
          };
        });
        assert.deepEqual(badRange, { val: '0', xssFound: false });

        // 프리셋 클릭 시 값과 aria-pressed가 동기화되고, 분 증감 클릭 시 프리셋 선택이 해제된다.
        await page.locator('#modal-schedule-tuning button[data-preset="flight_delay"]').click();
        assert.equal(await page.locator('#tuning-offset-minutes').inputValue(), '60');
        assert.equal(await page.locator('#modal-schedule-tuning button[data-preset="flight_delay"]').getAttribute('aria-pressed'), 'true');
        await page.locator('#modal-schedule-tuning button[data-delta="30"]').click();
        assert.equal(await page.locator('#tuning-offset-minutes').inputValue(), '90');
        assert.equal(await page.locator('#modal-schedule-tuning button[data-preset="flight_delay"]').getAttribute('aria-pressed'), 'false');

        // 0분 프리셋(우천)에서 오프라인 재배치 실행 시 0분 전용 안내를 표시하고 적용 버튼이 비활성화된다.
        await page.locator('#modal-schedule-tuning button[data-preset="rain_weather"]').click();
        await page.locator('#modal-schedule-tuning button[data-on-click="scheduleTuning.execute"][data-use-ai="false"]').click();
        await page.waitForFunction(() => !document.getElementById('modal-replan-review').classList.contains('sheet-closed'));
        const zeroReview = await page.evaluate(() => ({
          text: document.getElementById('replan-review-changes').textContent,
          applyDisabled: document.getElementById('btn-apply-replan').disabled
        }));
        assert.ok(zeroReview.text.includes('0분'));
        assert.equal(zeroReview.applyDisabled, true);

        // 기존 계획 유지 버튼 클릭
        await page.locator('#modal-replan-review button[data-on-click="scheduleTuning.rejectReplan"]').last().click();
        assert.equal(await page.evaluate(() => document.getElementById('modal-replan-review').classList.contains('sheet-closed')), true);
        assert.equal(await page.evaluate(() => State.pendingReplan), null);

        // 정상 범위(0, 1)로 열고 +60분 오프라인 재배치 → 검토 모달 → 동시 연타 시 1회만 정상 적용
        await page.evaluate(() => SulsulTravel.ScheduleTuning.openScheduleTuningModal(0, 1));
        assert.equal(await page.locator('#tuning-target-day').inputValue(), 'range:0:1');
        await page.locator('#modal-schedule-tuning button[data-on-click="scheduleTuning.execute"][data-use-ai="false"]').click();
        await page.waitForFunction(() => !document.getElementById('modal-replan-review').classList.contains('sheet-closed'));

        const reviewState = await page.evaluate(() => ({
          summary: document.getElementById('replan-review-summary').textContent,
          changesCount: State.pendingReplan?.changes?.length || 0,
          applyDisabled: document.getElementById('btn-apply-replan').disabled
        }));
        assert.equal(reviewState.changesCount, 2);
        assert.equal(reviewState.applyDisabled, false);
        assert.ok(reviewState.summary.includes('완료 1개 / 고정 1개 보호'));

        // 연타 동시 호출에도 충돌 토스트 없이 1회 적용된다.
        const applied = await page.evaluate(async () => {
          await Promise.all([
            SulsulTravel.ScheduleTuning.applyPendingReplan(),
            SulsulTravel.ScheduleTuning.applyPendingReplan()
          ]);
          const trip = getActiveTrip();
          return {
            modalClosed: document.getElementById('modal-replan-review').classList.contains('sheet-closed'),
            pendingNull: State.pendingReplan === null,
            doneTime: trip.days[0].spots.find(s => s.id === 's-done').time,
            fixedTime: trip.days[0].spots.find(s => s.id === 's-fixed').time,
            pendingTime: trip.days[0].spots.find(s => s.id === 's-pending').time,
            day2Time: trip.days[1].spots.find(s => s.id === 's-d2-pending').time,
            toast: document.getElementById('sulsul-global-toast')?.textContent || ''
          };
        });
        assert.equal(applied.modalClosed, true);
        assert.equal(applied.pendingNull, true);
        assert.equal(applied.doneTime, '09:00');
        assert.equal(applied.fixedTime, '12:00');
        assert.equal(applied.pendingTime, '15:00');
        assert.equal(applied.day2Time, '11:30');
        assert.ok(applied.toast.includes('RePlan을 적용했습니다'));

        // rebalanceTripSchedule도 range:0:1 구간을 정확히 처리한다.
        const rebalancedRange = await page.evaluate(() => {
          const r = SulsulTravel.ScheduleTuning.rebalanceTripSchedule(getActiveTrip(), 'range:0:1', 30, '지연');
          return {
            modified: r.modifiedSpotsCount,
            preserved: r.preservedCompletedCount
          };
        });
        assert.deepEqual(rebalancedRange, { modified: 2, preserved: 2 });

        // 320px 가로 넘침 0 + 미등록 data-on-* 0
        await page.setViewportSize({ width: 320, height: 844 });
        await page.evaluate(() => SulsulTravel.ScheduleTuning.openScheduleTuningModal(0));
        const mobileAudit = await page.evaluate(() => {
          const unknown = [];
          for (const attr of ['data-on-click', 'data-on-change', 'data-on-input']) {
            document.querySelectorAll(`[${attr}]`).forEach(el => {
              const name = el.getAttribute(attr);
              if (!SulsulTravel.UiActions.has(name)) unknown.push(`${attr}=${name}`);
            });
          }
          return {
            overflow: document.documentElement.scrollWidth > innerWidth,
            unknown
          };
        });
        assert.deepEqual(mobileAudit, { overflow: false, unknown: [] });

        assert.deepEqual(errors, []);
        results.push({ name: 'schedule-tuning-presets-range-and-replan-apply', passed: true });
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
    await server.close();
  }

  console.log(JSON.stringify({ passed: results.every(r => r.passed), results }, null, 2));
  if (!results.every(r => r.passed)) process.exit(1);
})();
