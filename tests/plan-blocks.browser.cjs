/* 큰 계획 카드·계획 블록 상세·편집 모달·일정 서브탭 브라우저 검사 (v2.1.8, 계획 4단계).
 * Run: PLAYWRIGHT_MODULE=<optional> CHROME_PATH=<optional> node tests/plan-blocks.browser.cjs */
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
      id: 'pb-trip-main',
      title: '스페인 중부 여정',
      subtitle: '자유여행',
      startDate: '2026-04-10',
      endDate: '2026-04-12',
      durationDays: 3,
      countries: ['스페인'],
      cities: ['마드리드', '톨레도'],
      concepts: ['자유여행'],
      currency: 'EUR',
      budget: 2000,
      revision: 0,
      coverEmoji: '🇪🇸',
      planBlockMeta: {},
      expenses: [],
      journals: {},
      checklist: [],
      days: [
        {
          id: 'd1', dayNum: 1, date: '2026-04-10', city: '마드리드', title: '마드리드 도착',
          spots: [{ id: 's1', time: '10:00', title: '프라도 미술관', completed: false }]
        },
        {
          id: 'd2', dayNum: 2, date: '2026-04-11', city: '마드리드', title: '레티로 공원',
          spots: [{ id: 's2', time: '14:00', title: '레티로 산책', completed: false }]
        },
        {
          id: 'd3', dayNum: 3, date: '2026-04-12', city: '톨레도', title: '톨레도 당일',
          spots: [{ id: 's3', time: '11:00', title: '알카사르 전망대', completed: false }]
        }
      ]
    },
    {
      id: 'pb-trip-xss',
      title: '공유 사본 안전성 검사',
      startDate: '2026-05-01',
      endDate: '2026-05-01',
      durationDays: 1,
      countries: ['스페인'],
      cities: ['세비야'],
      currency: 'EUR',
      budget: 500,
      revision: 0,
      planBlockMeta: {
        pb_xss_0: {
          title: '<img id="pbxss-title" src=x onerror="window.__pbXss=2">위험 제목',
          place: '<img id="pbxss-place" src=x onerror="window.__pbXss=3">거점',
          lodging: '<img id="pbxss-lodging" src=x onerror="window.__pbXss=4">숙소',
          priorities: ['<img id="pbxss-prio" src=x onerror="window.__pbXss=5">우선'],
          notes: '<img id="pbxss-note" src=x onerror="window.__pbXss=6">메모',
          status: 'confirmed'
        }
      },
      expenses: [],
      journals: {},
      checklist: [],
      days: [
        {
          id: 'dx1', dayNum: 1, date: '2026-05-01', city: '세비야', planBlockId: 'pb_xss_0',
          title: '공유 일차', spots: []
        }
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
      await saveTrips({ bump: false });
      openTripWorkspace(trips[0].id);
      switchTab('plan');
    }, seed);

    await check('1. 보기 방식·4대 서브탭 실클릭 전환과 미지 ID 안전 폴백', async () => {
      await page.locator('#companion-plan-nav [data-plan-presentation="timeline"]').click();
      assert.equal(await page.locator('#tab-content-plan').getAttribute('data-presentation'), 'timeline');
      assert.equal(await page.locator('#btn-subtab-timeline').getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('#subtab-view-timeline').evaluate(el => !el.classList.contains('hidden')), true);

      await page.locator('#companion-plan-nav [data-plan-presentation="map"]').click();
      assert.equal(await page.locator('#btn-subtab-map').getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('#subtab-view-map').evaluate(el => !el.classList.contains('hidden')), true);

      await page.locator('#btn-subtab-booking').click();
      assert.equal(await page.locator('#btn-subtab-booking').getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('#companion-plan-nav [data-plan-presentation="map"]').getAttribute('aria-pressed'), 'true');

      await page.locator('#btn-subtab-cityguide').click();
      assert.equal(await page.locator('#btn-subtab-cityguide').getAttribute('aria-pressed'), 'true');

      const fallback = await page.evaluate(() => {
        SulsulTravel.PlanBlocks.switchSubTab('does-not-exist');
        return {
          planSubTab: State.planSubTab,
          timelineVisible: !document.getElementById('subtab-view-timeline').classList.contains('hidden'),
          timelinePressed: document.getElementById('btn-subtab-timeline').getAttribute('aria-pressed')
        };
      });
      assert.equal(fallback.planSubTab, 'timeline');
      assert.equal(fallback.timelineVisible, true);
      assert.equal(fallback.timelinePressed, 'true');

      await page.locator('#companion-plan-nav [data-plan-presentation="overview"]').click();
      assert.equal(await page.locator('#tab-content-plan').getAttribute('data-presentation'), 'overview');
      return fallback;
    });

    await check('2. 1일 구간 시작일 편집 시 endDate 동기화·상태 칩 aria-pressed·IDB 저장·헤더 도시 갱신', async () => {
      assert.equal(await page.locator('.companion-block').count(), 2);
      await page.locator('.companion-block-open').nth(1).click();
      await page.locator('#plan-block-detail-page').waitFor({ state: 'visible' });
      assert.match(await page.locator('#plan-block-detail-title').innerText(), /톨레도/);

      await page.locator('#plan-block-detail-page [data-on-click="planBlocks.editActive"]').click();
      await page.waitForFunction(() => !document.getElementById('modal-plan-block-edit').classList.contains('sheet-closed'));
      assert.equal(await page.locator('#plan-block-edit-end-date').isDisabled(), true);

      await page.locator('#plan-block-edit-start-date').fill('2026-04-15');
      assert.equal(await page.locator('#plan-block-edit-end-date').inputValue(), '2026-04-15');

      await page.locator('#plan-block-edit-title').fill('안달루시아 당일');
      await page.locator('#plan-block-edit-place').fill('그라나다, 세비야');
      await page.locator('#plan-block-edit-lodging').fill('그라나다 구시가지 숙소');
      await page.locator('#plan-block-status-chips [data-status="confirmed"]').click();

      const chipStates = await page.evaluate(() => [...document.querySelectorAll('#plan-block-status-chips .plan-status-pill')].map(btn => ({
        status: btn.dataset.status,
        pressed: btn.getAttribute('aria-pressed'),
        active: btn.classList.contains('active')
      })));
      assert.equal(chipStates.find(c => c.status === 'confirmed').pressed, 'true');
      assert.equal(chipStates.find(c => c.status === 'draft').pressed, 'false');

      await page.locator('#modal-plan-block-edit [data-on-click="planBlocks.submitEdit"]:not([data-regenerate])').click();
      await page.waitForFunction(() => document.getElementById('modal-plan-block-edit').classList.contains('sheet-closed'));

      const persisted = await page.evaluate(async () => {
        const trip = getActiveTrip();
        const blockId = trip.days[2].planBlockId;
        const raw = JSON.parse(await TripRepository.readRaw());
        const rawTrip = raw.find(item => item.id === trip.id);
        return {
          meta: trip.planBlockMeta[blockId],
          dayDate: trip.days[2].date,
          detailMeta: document.getElementById('plan-block-detail-meta').textContent,
          wsPlaces: document.getElementById('stat-ws-places').textContent,
          idbMeta: rawTrip.planBlockMeta[blockId]
        };
      });
      assert.equal(persisted.meta.startDate, '2026-04-15');
      assert.equal(persisted.meta.endDate, '2026-04-15');
      assert.equal(persisted.dayDate, '2026-04-15');
      assert.equal(persisted.detailMeta, '4.15 – 4.15 · 1일 체류');
      assert.equal(persisted.wsPlaces, '1개국 4도시');
      assert.equal(persisted.idbMeta.endDate, '2026-04-15');
      assert.equal(persisted.idbMeta.status, 'confirmed');

      await page.locator('#btn-closePlanBlock').click();
      await page.locator('#plan-block-detail-page').waitFor({ state: 'hidden' });
      return { detailMeta: persisted.detailMeta, wsPlaces: persisted.wsPlaces };
    });

    await check('3. 다일 구간 저장 실패 시 폼·원본 보존, 미저장 이탈 감지, 날짜 일괄 동기화', async () => {
      await page.locator('.companion-block-actions [data-on-click="planBlocks.editByIndex"]').first().click();
      await page.waitForFunction(() => !document.getElementById('modal-plan-block-edit').classList.contains('sheet-closed'));
      assert.equal(await page.locator('#plan-block-edit-end-date').isDisabled(), false);

      await page.locator('#plan-block-edit-title').fill('저장 실패 테스트 제목');
      assert.equal(await page.evaluate(() => isModalFormDirty('modal-plan-block-edit')), true);

      const afterFailure = await page.evaluate(async () => {
        const origCommit = TripRepository.commit.bind(TripRepository);
        TripRepository.commit = async () => { throw new Error('DISK_FULL_SIMULATED'); };
        try {
          await SulsulTravel.PlanBlocks.submitEdit();
        } finally {
          TripRepository.commit = origCommit;
        }
        const trip = getActiveTrip();
        const blockId = trip.days[0].planBlockId;
        return {
          modalStillOpen: !document.getElementById('modal-plan-block-edit').classList.contains('sheet-closed'),
          inputKept: document.getElementById('plan-block-edit-title').value,
          savedTitle: trip.planBlockMeta[blockId]?.title || ''
        };
      });
      assert.equal(afterFailure.modalStillOpen, true);
      assert.equal(afterFailure.inputKept, '저장 실패 테스트 제목');
      assert.equal(afterFailure.savedTitle, '');

      await page.locator('#plan-block-edit-title').fill('마드리드 이틀');
      await page.locator('#plan-block-edit-start-date').fill('2026-04-20');
      await page.locator('#plan-block-edit-end-date').fill('2026-04-21');
      await page.locator('#modal-plan-block-edit [data-on-click="planBlocks.submitEdit"]:not([data-regenerate])').click();
      await page.waitForFunction(() => document.getElementById('modal-plan-block-edit').classList.contains('sheet-closed'));

      const dates = await page.evaluate(() => getActiveTrip().days.slice(0, 2).map(d => d.date));
      assert.deepEqual(dates, ['2026-04-20', '2026-04-21']);
      return { dates };
    });

    await check('4. 구간 상세에서 일기 탭 이동·빈 여행 방어·보안 이스케이프·320px 오버플로 0', async () => {
      await page.locator('#plan-block-detail-container [data-on-click="planBlocks.openJournal"]').last().click();
      await page.locator('#plan-block-detail-page').waitFor({ state: 'hidden' });
      assert.equal(await page.locator('#tab-content-journal').evaluate(el => !el.classList.contains('hidden')), true);

      // 공유 사본 HTML 주입 방어 검사
      await page.evaluate(() => {
        window.__pbXss = 0;
        openTripWorkspace('pb-trip-xss');
        switchTab('plan');
        SulsulTravel.PlanBlocks.openBlock(0);
      });
      await page.locator('#plan-block-detail-page').waitFor({ state: 'visible' });
      const xss = await page.evaluate(() => ({
        triggered: window.__pbXss,
        injectedCount: document.querySelectorAll('#big-plan-container [id^="pbxss"], #plan-block-detail-page [id^="pbxss"]').length
      }));
      assert.equal(xss.triggered, 0);
      assert.equal(xss.injectedCount, 0);

      // 모든 data-on-* 등록 여부
      const unregistered = await page.evaluate(() => {
        const scopes = ['#tab-content-plan', '#plan-block-detail-page', '#modal-plan-block-edit'];
        const missing = [];
        for (const sel of scopes) {
          const rootEl = document.querySelector(sel);
          if (!rootEl) continue;
          for (const attr of ['data-on-click', 'data-on-change', 'data-on-input']) {
            for (const el of rootEl.querySelectorAll(`[${attr}]`)) {
              const name = el.getAttribute(attr);
              if (!SulsulTravel.UiActions.has(name)) missing.push(`${sel}:${attr}=${name}`);
            }
          }
        }
        return missing;
      });
      assert.deepEqual(unregistered, []);

      // 320px 오버플로 0 검사 (상세 + 편집 모달 + 큰 계획)
      await page.setViewportSize({ width: 320, height: 844 });
      const detailOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      assert.equal(detailOverflow, false, 'detail overflow at 320px');

      await page.locator('#plan-block-detail-page [data-on-click="planBlocks.editActive"]').click();
      await page.waitForFunction(() => !document.getElementById('modal-plan-block-edit').classList.contains('sheet-closed'));
      const modalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      assert.equal(modalOverflow, false, 'edit modal overflow at 320px');
      await page.evaluate(() => { closeModal('modal-plan-block-edit', true); SulsulTravel.PlanBlocks.hideDetail({ restoreScroll: false }); });
      const overviewOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      assert.equal(overviewOverflow, false, 'overview overflow at 320px');

      // 활성 여행 없을 때 예외 없음
      const emptyCheck = await page.evaluate(() => {
        State.trips = [];
        State.activeTripId = null;
        const blocks = SulsulTravel.PlanBlocks.buildBlocks(null);
        SulsulTravel.PlanBlocks.openBlock(0);
        SulsulTravel.PlanBlocks.showDetail('nonexistent');
        return { blocksCount: blocks.length };
      });
      assert.equal(emptyCheck.blocksCount, 0);
      assert.deepEqual(pageErrors, []);
      return { xss, emptyCheck, pageErrors: pageErrors.length };
    });

    const passed = results.every(r => r.passed) && pageErrors.length === 0;
    console.log(JSON.stringify({ passed, pageErrors, results }, null, 2));
    if (!passed) process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
