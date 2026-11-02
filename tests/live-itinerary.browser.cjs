/* 격리된 45일 합성 여행만 사용한다. 외부 AI·계정·개인 브라우저 자료에 접근하지 않는다. */
'use strict';

const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const output = path.join(root, '.local-review', 'live-itinerary');
const storageKey = 'st_trips_v2';
const tripId = 'synthetic-live-trip';
const firstDayId = 'live-day-01';
const secondDayId = 'live-day-02';
const photo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aG3sAAAAASUVORK5CYII=';

function fixture() {
  const days = Array.from({ length: 45 }, (_, index) => {
    const day = index + 1;
    const suffix = String(day).padStart(2, '0');
    return {
      id: `live-day-${suffix}`,
      dayNum: day,
      date: new Date(Date.UTC(2030, 4, day)).toISOString().slice(0, 10),
      city: '합성 도시',
      title: `합성 ${day}일차`,
      planBlockId: 'live-block',
      // 시간과 저장 순서를 다르게 두어, 렌더가 몰래 시간순 정렬하는 것도 검출한다.
      spots: [
        { id: `d${suffix}-late`, title: `${day}일 저녁 먼저`, time: '18:00', cat: 'tour' },
        { id: `d${suffix}-early`, title: `${day}일 아침 나중`, time: '08:00', cat: 'food' },
        { id: `d${suffix}-middle`, title: `${day}일 점심 마지막`, time: '12:00', cat: 'tour' }
      ]
    };
  });
  days[0].spots = [
    { id: 'done', title: '이미 완료한 방문', time: '07:00', cat: 'tour', completed: true },
    { id: 'anchor', title: '수동 순서 기준 카드', time: '19:00', cat: 'tour', desc: '시간보다 앞선 수동 순서' },
    { id: 'record', title: '원문과 사진이 있는 방문', time: '08:00', cat: 'tour', recordId: 'record-1' },
    { id: 'fixed', title: '고정 예약', time: '10:00', cat: 'tour', fixed: true, bookingCode: 'SYNTHETIC-ONLY' },
    { id: 'last', title: '마지막에 둔 아침 식사', time: '09:00', cat: 'food' }
  ];
  return {
    id: tripId, title: '45일 합성 현장 편집 검증', startDate: days[0].date, endDate: days.at(-1).date,
    revision: 0, currency: 'KRW', activeCurrencies: ['KRW'], countries: ['합성 국가'], cities: ['합성 도시'],
    planBlockMeta: { 'live-block': { title: '45일 합성 거점', place: '합성 도시', notes: '개인 자료가 없는 테스트' } },
    days,
    journals: { 0: { dayId: firstDayId, date: days[0].date, text: '승인한 합성 회고', originalText: '처음 쓴 합성 회고 원문', aiDraftAcceptedAt: '2030-05-01T12:00:00Z', photos: [photo], coverIndex: 0 } },
    activityRecords: {
      'record-1': {
        id: 'record-1', text: '사용자가 승인한 AI 합성 문장', originalText: '처음 쓴 방문 원문',
        aiDraft: '검토 중인 별도 합성 AI 초안', aiDraftAcceptedAt: '2030-05-01T08:30:00Z', photos: [photo], coverIndex: 0,
        context: { dayId: firstDayId, spotId: 'record', date: days[0].date, title: '원문과 사진이 있는 방문', time: '08:00', city: '합성 도시' }
      }
    },
    momentEntries: [{ id: 'moment-1', dayId: firstDayId, date: days[0].date, text: '길에서 쓴 합성 순간 기록', originalText: '합성 순간 최초 원문', photos: [photo] }],
    expenses: [{ id: 'expense-1', title: '합성 영수증', amount: 1000, currency: 'KRW', curr: 'KRW', date: days[0].date, photos: [photo] }],
    checklist: [{ text: '합성 준비물', checked: true }]
  };
}

const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const file = path.resolve(root, '.' + pathname.replace(/\/$/, '/index.html'));
  if (!file.startsWith(root + path.sep)) return response.writeHead(403).end();
  fs.readFile(file, (error, content) => {
    if (error) return response.writeHead(404).end();
    response.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' })[path.extname(file)] || 'application/octet-stream');
    response.end(content);
  });
});

const ids = day => day.spots.map(spot => spot.id);
const pendingIds = day => day.spots.filter(spot => !spot.completed && !spot.removed && !spot.deferred && !spot.cancelled && !spot.skipped).map(spot => spot.id);
const clone = value => JSON.parse(JSON.stringify(value));
function content(trip) {
  return Object.fromEntries(['journals', 'activityRecords', 'momentEntries', 'expenses', 'checklist'].map(key => [key, trip[key]]));
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const results = [];

  async function check(name, operation, { offline = false, width = 390 } = {}) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, hasTouch: true, serviceWorkers: offline ? 'allow' : 'block' });
    const page = await context.newPage();
    const errors = [], externalRequests = [];
    page.setDefaultTimeout(10000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    await context.route('**/*', route => {
      if (new URL(route.request().url()).origin === origin) return route.continue();
      externalRequests.push(route.request().url());
      return route.abort();
    });
    const api = {
      page, context, errors,
      async seed(trip = fixture(), extraTrips = []) {
        await page.evaluate(({ trip, extraTrips }) => {
          State.trips = TripRepository.saveAll([trip, ...extraTrips]);
          State.activeTripId = trip.id;
          State.companionTodaySelection = { tripId: trip.id, dayIndex: 0 };
          switchView('workspace'); switchTab('today'); renderTodayTab();
        }, { trip, extraTrips });
        return this.snapshot();
      },
      async snapshot() {
        return page.evaluate(key => ({ trips: State.trips, raw: localStorage.getItem(key) }), storageKey);
      },
      async trip() { return (await this.snapshot()).trips.find(trip => trip.id === tripId); },
      async quota(enabled) {
        await page.evaluate(({ key, enabled }) => {
          if (enabled) {
            window.liveTestSetItem = Storage.prototype.setItem;
            Storage.prototype.setItem = function (name, value) {
              if (name === key) throw new DOMException('synthetic quota', 'QuotaExceededError');
              return window.liveTestSetItem.call(this, name, value);
            };
          } else if (window.liveTestSetItem) {
            Storage.prototype.setItem = window.liveTestSetItem;
            delete window.liveTestSetItem;
          }
        }, { key: storageKey, enabled });
      },
      async commit(command, expectedRevision) {
        return page.evaluate(({ command, expectedRevision }) => commitLiveSchedule(command, expectedRevision ?? getActiveTrip().revision, '합성 검증'), { command: { tripId, ...command }, expectedRevision });
      },
      async selectDay(index) {
        await page.evaluate(index => { selectCompanionTodayDay(index); }, index);
      },
      async assertDom(index, expected, container = '#today-overview-container') {
        if (container === '#today-overview-container') await this.selectDay(index);
        else await page.evaluate(index => selectCompanionDetailDay(index), index);
        const before = await this.snapshot();
        const actual = await page.locator(container + ' > .companion-timeline > article[data-spot-id]').evaluateAll(cards => cards.map(card => card.dataset.spotId));
        assert.deepEqual(actual, expected, `day ${index + 1} DOM order`);
        assert.deepEqual(await this.snapshot(), before, 'render must not persist or reorder data');
      },
      async button(itemId, action, container = '#today-overview-container') {
        const button = page.locator(`${container} [data-spot-id="${itemId}"] [data-live-action="${action}"]`);
        if (!await button.isVisible()) {
          const before = await this.snapshot();
          const mode = page.locator(`${container} [data-live-action="order-mode"]`);
          await mode.click();
          assert.equal(await mode.getAttribute('aria-pressed'), 'true');
          assert.deepEqual(await this.snapshot(), before, 'entering order edit mode must not save or change baseline/history');
        }
        return button;
      },
      async reveal(itemId) {
        const card = page.locator(`#today-overview-container [data-spot-id="${itemId}"]`);
        const details = card.locator('xpath=ancestor::details[1]');
        if (await details.count() && !await details.evaluate(element => element.open)) await details.locator('summary').click();
        return card;
      },
      async insert(anchorId, position, title, time = '') {
        await (await this.button(anchorId, position)).click();
        await page.locator('#spot-form-title').fill(title);
        await page.locator('#spot-form-time').fill(time);
        await page.locator('#spot-form-submit-btn').click();
        await page.waitForFunction(title => getActiveTrip().days.some(day => day.spots.some(spot => spot.title === title)), title);
        return (await this.trip()).days.flatMap(day => day.spots).find(spot => spot.title === title).id;
      }
    };
    try {
      await page.goto(origin + '/', { waitUntil: 'networkidle' });
      await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}' });
      const details = await operation(api);
      assert.deepEqual(errors, [], 'uncaught browser errors');
      assert.equal(externalRequests.some(url => /generativelanguage|openai|anthropic|\/api\//i.test(url)), false, 'no external AI/API request may be initiated');
      results.push({ name, passed: true, details, blockedExternalRequests: externalRequests.length });
    } catch (error) {
      results.push({ name, passed: false, error: error.stack || error.message, errors, blockedExternalRequests: externalRequests.length });
      await page.screenshot({ path: path.join(output, 'failure-' + results.length + '.png'), fullPage: true }).catch(() => {});
    } finally {
      await api.quota(false).catch(() => {});
      console.log((results.at(-1).passed ? 'PASS ' : 'FAIL ') + name);
      await context.close();
    }
  }

  try {
    for (const width of [320, 390]) await check(`${width}px 45일 여행 실제 카드 연속 편집과 수동 순서·기록 보존`, async api => {
      const { page } = api;
      const seeded = await api.seed(), original = seeded.trips[0], protectedContent = clone(content(original));
      const order0 = ids(original.days[0]), order1 = ids(original.days[1]);
      let expected0 = [...order0], expected1 = [...order1], commands = 0;
      let baseline;

      async function verify(affectedDayIds = [firstDayId]) {
        const snapshot = await api.snapshot(), trip = snapshot.trips[0];
        assert.deepEqual(JSON.parse(snapshot.raw), snapshot.trips, 'memory and persisted document agree');
        assert.equal(trip.days.length, 45);
        assert.deepEqual(ids(trip.days[0]), expected0);
        assert.deepEqual(ids(trip.days[1]), expected1);
        assert.deepEqual(trip.days.slice(2), original.days.slice(2), '43 unrelated days remain byte-for-byte equivalent');
        assert.deepEqual(content(trip), protectedContent, 'original/approved/draft text, photos, record context and expenses survive every edit');
        for (const id of ['done', 'fixed']) assert.deepEqual(trip.days.flatMap(day => day.spots).find(spot => spot.id === id), original.days[0].spots.find(spot => spot.id === id));
        assert.equal(trip.days.flatMap(day => day.spots).find(spot => spot.id === 'record').recordId, 'record-1');
        assert.equal(new Set(trip.days.flatMap(day => day.spots).map(spot => spot.id)).size, trip.days.flatMap(day => day.spots).length);
        assert.equal(trip.planRevision, commands);
        assert.equal(trip.planHistory.length, commands);
        if (commands) {
          assert.deepEqual(trip.planHistory.at(-1).affectedDayIds, affectedDayIds, 'history reports exactly the changed days');
          assert.equal(trip.planBaseline.source, 'captured-current');
          assert.ok(Number.isFinite(Date.parse(trip.planBaseline.capturedAt)));
          if (!baseline) baseline = clone(trip.planBaseline);
          assert.deepEqual(trip.planBaseline, baseline, 'first-change baseline is immutable');
          assert.deepEqual(ids(trip.planBaseline.days[0]), order0);
          assert.deepEqual(ids(trip.planBaseline.days[1]), order1);
          assert.equal(trip.planBaseline.days[0].spots.find(spot => spot.id === 'anchor').time, '19:00');
          assert.equal(trip.planBaseline.days[0].spots.find(spot => spot.id === 'fixed').fixed, true);
          for (const text of ['처음 쓴 방문 원문', '사용자가 승인한 AI 합성 문장', photo]) {
            assert.equal(JSON.stringify(trip.planBaseline).includes(text), false, 'baseline must not copy journal/photo payloads');
            assert.equal(JSON.stringify(trip.planHistory).includes(text), false, 'history must not copy journal/photo payloads');
          }
        }
        await api.assertDom(0, pendingIds(trip.days[0]));
        return trip;
      }

      // 실제 원래 카드의 앞·뒤 버튼을 누르고, 시간 없이 이름만 저장한다.
      const beforeId = await api.insert('anchor', 'before', '현장에서 발견한 이름만 카페');
      expected0.splice(expected0.indexOf('anchor'), 0, beforeId); commands++; await verify();
      const beforeModeNavigation = await api.snapshot();
      await api.selectDay(1);
      assert.equal(await page.locator('#today-overview-container [data-live-action="order-mode"]').getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('body').evaluate(element => element.classList.contains('live-order-editing')), true);
      assert.equal(await page.locator('#today-overview-container [data-spot-id="d02-late"] [data-live-action="before"]').isVisible(), true);
      await api.selectDay(0); await page.evaluate(() => { switchTab('plan'); switchTab('today'); });
      assert.equal(await page.locator('#today-overview-container [data-live-action="order-mode"]').getAttribute('aria-pressed'), 'true');
      assert.deepEqual(await api.snapshot(), beforeModeNavigation, 'day and view changes keep order mode without persisting a change');
      const afterId = await api.insert('anchor', 'after', '현장에서 추가한 짧은 산책', '06:00');
      expected0.splice(expected0.indexOf('anchor') + 1, 0, afterId); commands++; await verify();
      await page.locator('#today-overview-container [data-live-toolbar="insert"]').click();
      await page.locator('#spot-form-title').fill('시간 미정 이름만 일정'); await page.locator('#spot-form-time').fill('');
      await page.locator('#spot-form-submit-btn').click();
      let trip = await api.trip();
      const untimed = trip.days[0].spots.find(spot => spot.title === '시간 미정 이름만 일정');
      assert.ok(untimed); assert.equal(untimed.time || '', ''); expected0.push(untimed.id); commands++; await verify();

      await (await api.button(untimed.id, 'up')).click();
      const from = expected0.indexOf(untimed.id); [expected0[from - 1], expected0[from]] = [expected0[from], expected0[from - 1]];
      commands++; await verify();
      await (await api.button(untimed.id, 'down')).click();
      const moved = expected0.indexOf(untimed.id); [expected0[moved], expected0[moved + 1]] = [expected0[moved + 1], expected0[moved]];
      commands++; await verify();

      await (await api.button(afterId, 'move')).click();
      await page.locator('#live-move-day').selectOption(secondDayId);
      await page.locator('#live-move-position').selectOption('before:d02-early');
      await page.locator('#live-move-save').click();
      expected0 = expected0.filter(id => id !== afterId); expected1.splice(expected1.indexOf('d02-early'), 0, afterId);
      commands++; trip = await verify([firstDayId, secondDayId]); await api.assertDom(1, pendingIds(trip.days[1])); await api.selectDay(0);

      await (await api.button('record', 'remove')).click(); commands++;
      trip = await verify(); assert.equal(trip.days[0].spots.find(spot => spot.id === 'record').removed, true);
      assert.equal(await page.locator('#today-overview-container > .companion-timeline [data-spot-id="record"]').count(), 0);
      await page.locator('#today-overview-container [data-live-toolbar="undo"]').click(); commands++;
      trip = await verify(); assert.equal(!!trip.days[0].spots.find(spot => spot.id === 'record').removed, false);
      assert.ok(trip.planHistory.some(event => event.type === 'remove' && event.undoneBy), 'undo links to the undone event');

      await (await api.button('record', 'defer')).click(); commands++;
      trip = await verify(); assert.equal(trip.days[0].spots.find(spot => spot.id === 'record').deferred, true);
      const deferred = await api.reveal('record'); await deferred.locator('[data-live-action="restore"]').click(); commands++;
      trip = await verify(); assert.equal(!!trip.days[0].spots.find(spot => spot.id === 'record').deferred, false);

      // 똑같은 저장 배열이 거점 상세와 오늘 화면 양쪽에서 유지되어야 한다.
      await page.evaluate(() => openPlanBlock(0));
      await api.assertDom(0, pendingIds(trip.days[0]), '#plan-block-detail-container');
      await api.assertDom(1, pendingIds(trip.days[1]), '#plan-block-detail-container');
      await page.evaluate(() => hidePlanBlockDetail({ restoreScroll: false }));
      await api.selectDay(0);
      const beforeHistory = await api.snapshot();
      await page.locator('#today-overview-container [data-live-toolbar="history"]').click();
      assert.equal(await page.locator('#modal-live-history .live-history-entry').count(), commands);
      assert.match(await page.locator('#modal-live-history .live-baseline').textContent(), /처음 변경할 때 보관한 계획/);
      assert.deepEqual(await api.snapshot(), beforeHistory, 'viewing history and baseline never changes stored state');
      await page.evaluate(() => closeModal('modal-live-history', true));
      await page.screenshot({ path: path.join(output, 'live-sequence-' + width + '.png') });
      const persisted = await api.snapshot(); await page.reload({ waitUntil: 'networkidle' });
      assert.deepEqual((await api.snapshot()).trips, persisted.trips, 'reload keeps schedule and immutable evidence');
      if (width === 390) {
        await page.evaluate(async () => { await navigator.serviceWorker.register('/sw.js'); await navigator.serviceWorker.ready; });
        await page.waitForFunction(() => !!navigator.serviceWorker.controller, undefined, { timeout: 30000 });
        await page.close(); await api.context.setOffline(true);
        const restarted = await api.context.newPage(); restarted.on('pageerror', error => api.errors.push(error.message));
        await restarted.goto(origin + '/?live-sequence-offline=1', { waitUntil: 'domcontentloaded' });
        await restarted.waitForFunction(() => typeof commitLiveSchedule === 'function');
        assert.equal(await restarted.evaluate(() => navigator.onLine), false);
        assert.deepEqual(await restarted.evaluate(() => State.trips), persisted.trips, 'the complete consecutive edit sequence survives a fresh offline page');
        await restarted.evaluate(id => { State.activeTripId = id; switchView('workspace'); switchTab('today'); selectCompanionTodayDay(0); }, tripId);
        assert.deepEqual(await restarted.locator('#today-overview-container > .companion-timeline > article[data-spot-id]').evaluateAll(cards => cards.map(card => card.dataset.spotId)), pendingIds(persisted.trips[0].days[0]));
        await restarted.close();
      }
      return { days: 45, consecutiveCommands: commands, manualOrderPreserved: true, originalAndApprovedTextAndPhotosPreserved: true, freshOfflineRestart: width === 390 };
    }, { width, offline: width === 390 });

    await check('모든 현장 명령의 quota 실패는 일정·기준계획·이력·revision을 원복하고 한 번만 재시도', async api => {
      const cases = [
        { type: 'insert', dayId: firstDayId, anchorId: 'anchor', position: 'before', item: { id: 'quota-new', title: '실패 뒤 재시도', time: '' } },
        { type: 'update', dayId: firstDayId, itemId: 'anchor', changes: { title: '실패한 내용 수정', time: '' } },
        { type: 'move', dayId: firstDayId, targetDayId: secondDayId, itemId: 'anchor', anchorId: 'd02-early', position: 'before' },
        { type: 'remove', dayId: firstDayId, itemId: 'record' },
        { type: 'defer', dayId: firstDayId, itemId: 'record' },
        { type: 'restore', dayId: firstDayId, itemId: 'record' },
        { type: 'replace', dayId: firstDayId, itemId: 'record', item: { id: 'quota-replacement', title: '합성 대체 카페', time: '' } },
        { type: 'undo' }
      ];
      for (const command of cases) {
        const trip = fixture();
        if (command.type === 'restore') trip.days[0].spots.find(spot => spot.id === 'record').deferred = true;
        await api.seed(trip);
        if (command.type === 'undo') assert.equal(await api.commit({ type: 'remove', dayId: firstDayId, itemId: 'record' }), true);
        const before = await api.snapshot();
        await api.quota(true); assert.equal(await api.commit(command), false, command.type + ' quota rejected');
        assert.deepEqual(await api.snapshot(), before, command.type + ' leaves memory and storage unchanged');
        await api.quota(false); assert.equal(await api.commit(command), true, command.type + ' retry commits');
        const after = await api.snapshot(), current = after.trips[0], prior = before.trips[0];
        assert.equal(current.revision, prior.revision + 1); assert.equal(current.planRevision, (prior.planRevision || 0) + 1);
        assert.equal(current.planHistory.length, (prior.planHistory || []).length + 1);
        assert.deepEqual(content(current), content(prior));
        assert.deepEqual(current.days.slice(2), prior.days.slice(2));
        assert.deepEqual(JSON.parse(after.raw), after.trips);
      }
      return { commands: cases.map(command => command.type), atomicRollback: true, retryCommittedOnce: true };
    });

    await check('실제 삽입·이동 모달 quota 실패는 입력과 선택을 유지하고 재시도한다', async api => {
      const { page } = api; await api.seed();
      await (await api.button('anchor', 'before')).click();
      await page.locator('#spot-form-title').fill('실패 뒤 보존할 이름만 일정'); await page.locator('#spot-form-time').fill('');
      let before = await api.snapshot(); await api.quota(true); await page.locator('#spot-form-submit-btn').click();
      assert.deepEqual(await api.snapshot(), before); assert.equal(await page.locator('#spot-form-title').inputValue(), '실패 뒤 보존할 이름만 일정');
      assert.equal(await page.locator('#modal-spot').evaluate(element => element.classList.contains('sheet-closed')), false);
      await api.quota(false); await page.locator('#spot-form-submit-btn').click();
      const item = (await api.trip()).days[0].spots.find(spot => spot.title === '실패 뒤 보존할 이름만 일정'); assert.ok(item);
      await (await api.button(item.id, 'move')).click();
      await page.locator('#live-move-day').selectOption(secondDayId); await page.locator('#live-move-position').selectOption('before:d02-early');
      before = await api.snapshot(); await api.quota(true); await page.locator('#live-move-save').click();
      assert.deepEqual(await api.snapshot(), before); assert.equal(await page.locator('#live-move-day').inputValue(), secondDayId);
      assert.equal(await page.locator('#live-move-position').inputValue(), 'before:d02-early');
      assert.equal(await page.locator('#modal-live-move').evaluate(element => element.classList.contains('sheet-closed')), false);
      await api.quota(false); await page.locator('#live-move-save').click();
      assert.equal((await api.trip()).days[1].spots[1].id, item.id);
      return { insertDraftRetained: true, moveSelectionRetained: true };
    });

    await check('오래된 모달 revision과 실제 두 탭 충돌은 새 기록·순서·이력을 덮지 못한다', async api => {
      const { page, context } = api; await api.seed();
      await (await api.button('anchor', 'before')).click(); await page.locator('#spot-form-title').fill('오래된 모달 추가'); await page.locator('#spot-form-time').fill('');
      const staleRevision = (await api.trip()).revision;
      assert.equal(await page.evaluate(() => commitTripCommand({ tripId: getActiveTrip().id, expectedRevision: getActiveTrip().revision, change: trip => { trip.activityRecords['record-1'].text = '검토 중 새로 저장한 승인 문장'; } })), true);
      let before = await api.snapshot(); await page.locator('#spot-form-submit-btn').click(); assert.deepEqual(await api.snapshot(), before);
      assert.equal(await page.locator('#spot-form-title').inputValue(), '오래된 모달 추가');
      assert.equal(await api.commit({ type: 'remove', dayId: firstDayId, itemId: 'record' }, staleRevision), false);
      assert.deepEqual(await api.snapshot(), before); await page.evaluate(() => closeModal('modal-spot', true));

      const second = await context.newPage(); second.on('pageerror', error => api.errors.push(error.message));
      await second.goto(origin + '/', { waitUntil: 'networkidle' });
      assert.equal(await second.evaluate(id => { State.activeTripId = id; return commitLiveSchedule({ type: 'insert', tripId: id, dayId: 'live-day-02', anchorId: 'd02-early', position: 'before', item: { id: 'second-tab-item', title: '다른 탭에서 확정한 추가', time: '' } }, getActiveTrip().revision, '합성 두 번째 탭'); }, tripId), true);
      before = await api.snapshot(); assert.equal(await api.commit({ type: 'remove', dayId: firstDayId, itemId: 'record' }), false);
      assert.deepEqual(await api.snapshot(), before, 'stale tab retains its memory and the newer stored document');
      const latest = JSON.parse(before.raw)[0]; assert.equal(latest.days[1].spots[1].id, 'second-tab-item');
      assert.equal(latest.activityRecords['record-1'].text, '검토 중 새로 저장한 승인 문장');
      await second.close();
      return { staleModalRejected: true, twoRealTabs: true, newerHistoryAndRecordPreserved: true };
    });

    await check('날짜·항목·여행 scope가 달라진 명령과 모달은 양쪽 여행을 변경하지 않는다', async api => {
      const { page } = api, other = fixture(); other.id = 'synthetic-other-trip'; other.title = '범위 밖 합성 여행';
      await api.seed(fixture(), [other]);
      await api.button('anchor', 'before');
      const beforeModeTripChange = await api.snapshot();
      await page.evaluate(id => { State.activeTripId = id; State.companionTodaySelection = { tripId: id, dayIndex: 0 }; renderTodayTab(); }, other.id);
      assert.equal(await page.locator('#today-overview-container [data-live-action="order-mode"]').getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('#today-overview-container [data-spot-id="anchor"] [data-live-action="before"]').isVisible(), true);
      await page.evaluate(id => { State.activeTripId = id; State.companionTodaySelection = { tripId: id, dayIndex: 0 }; renderTodayTab(); }, tripId);
      assert.deepEqual(await api.snapshot(), beforeModeTripChange, 'order edit mode survives changing trips without a data write');
      const invalid = [
        { type: 'move', dayId: firstDayId, targetDayId: 'missing-day', itemId: 'anchor', position: 'end' },
        { type: 'move', dayId: firstDayId, targetDayId: secondDayId, itemId: 'anchor', anchorId: 'missing-anchor', position: 'before' },
        { type: 'remove', dayId: secondDayId, itemId: 'record' },
        { type: 'update', dayId: firstDayId, itemId: 'record', changes: { recordId: 'forbidden-record-overwrite' } },
        { type: 'remove', dayId: firstDayId, itemId: 'done' }
      ];
      for (const command of invalid) {
        const before = await api.snapshot(); assert.equal(await api.commit(command), false, JSON.stringify(command));
        assert.deepEqual(await api.snapshot(), before, 'invalid target has no baseline/history or partial mutation');
      }
      await (await api.button('anchor', 'before')).click(); await page.locator('#spot-form-title').fill('다른 여행에서 저장하면 안 되는 추가'); await page.locator('#spot-form-time').fill('');
      await page.evaluate(id => { State.activeTripId = id; }, other.id);
      let before = await api.snapshot(); await page.locator('#spot-form-submit-btn').click();
      assert.deepEqual(await api.snapshot(), before); assert.equal(await page.locator('#spot-form-title').inputValue(), '다른 여행에서 저장하면 안 되는 추가');
      assert.equal(await api.commit({ type: 'remove', dayId: firstDayId, itemId: 'record' }), false); assert.deepEqual(await api.snapshot(), before);
      await page.evaluate(id => { closeModal('modal-spot', true); State.activeTripId = id; openLiveMove(0, 1); }, tripId);
      await page.locator('#live-move-day').selectOption(secondDayId); await page.locator('#live-move-position').selectOption('before:d02-early');
      await page.evaluate(id => { State.activeTripId = id; }, other.id); before = await api.snapshot();
      await page.locator('#live-move-save').click(); assert.deepEqual(await api.snapshot(), before);
      assert.equal(await page.locator('#live-move-day').inputValue(), secondDayId); assert.match(await page.locator('#live-move-feedback').textContent(), /여행/);
      return { invalidDayAndItemRejected: true, recordFieldsProtected: true, completedProtected: true, crossTripInsertAndMoveRejected: true };
    });

    await check('Undo는 나중에 저장한 기록·사진을 보존하고 일정 변경만 되돌린다', async api => {
      await api.seed(); assert.equal(await api.commit({ type: 'remove', dayId: firstDayId, itemId: 'record' }), true);
      const baseline = clone((await api.trip()).planBaseline);
      assert.equal(await api.page.evaluate(() => commitTripCommand({ tripId: getActiveTrip().id, expectedRevision: getActiveTrip().revision, change: trip => {
        trip.activityRecords['record-1'].originalText = '제거 이후에도 보존할 새 합성 원문';
        trip.activityRecords['record-1'].text = '제거 이후 사용자가 승인한 새 문장';
        trip.activityRecords['record-1'].photos.push(trip.journals[0].photos[0]);
      } })), true);
      const before = await api.trip(); assert.equal(await api.commit({ type: 'undo' }), true);
      const after = await api.trip(); assert.equal(!!after.days[0].spots.find(spot => spot.id === 'record').removed, false);
      assert.deepEqual(content(after), content(before)); assert.deepEqual(after.planBaseline, baseline);
      assert.deepEqual(ids(after.days[0]), ids(fixture().days[0])); assert.equal(after.planHistory.at(-1).type, 'undo');
      return { subsequentRecordPreserved: true, scheduleOnlyUndo: true };
    });

    await check('실제 서비스워커 오프라인 새 페이지 재진입은 45일 순서·이력·기록을 복원하고 편집 가능', async api => {
      const { page, context } = api; await api.seed();
      await page.evaluate(async () => { await navigator.serviceWorker.register('/sw.js'); await navigator.serviceWorker.ready; });
      await page.waitForFunction(() => !!navigator.serviceWorker.controller, undefined, { timeout: 30000 });
      const cached = await page.evaluate(async () => {
        const keys = await caches.keys();
        const urls = (await Promise.all(keys.map(async key => (await (await caches.open(key)).keys()).map(request => request.url)))).flat();
        return urls.filter(url => /live-itinerary/.test(url));
      });
      assert.ok(cached.some(url => /\/domain\/live-itinerary\.js/.test(url)), 'live domain must be available offline');
      assert.ok(cached.some(url => /\/presentation\/live-itinerary-ui\.js/.test(url)), 'live UI must be available offline');
      assert.equal(await api.commit({ type: 'move', dayId: firstDayId, targetDayId: secondDayId, itemId: 'record', anchorId: 'd02-early', position: 'before' }), true);
      assert.equal(await api.commit({ type: 'insert', dayId: secondDayId, position: 'end', item: { id: 'offline-added', title: '오프라인 이전 추가', time: '' } }), true);
      const saved = await api.snapshot(); await page.close(); await context.setOffline(true);
      const restarted = await context.newPage(); restarted.on('pageerror', error => api.errors.push(error.message)); restarted.on('dialog', dialog => dialog.accept());
      restarted.setDefaultTimeout(10000);
      await restarted.goto(origin + '/?live-offline-restart=1', { waitUntil: 'domcontentloaded' });
      await restarted.waitForFunction(() => typeof commitLiveSchedule === 'function' && !!window.SulsulTravel?.LiveItinerary);
      assert.equal(await restarted.evaluate(() => navigator.onLine), false);
      assert.deepEqual(await restarted.evaluate(() => State.trips), saved.trips);
      await restarted.evaluate(id => { State.activeTripId = id; switchView('workspace'); switchTab('today'); selectCompanionTodayDay(1); }, tripId);
      assert.deepEqual(await restarted.locator('#today-overview-container > .companion-timeline > article[data-spot-id]').evaluateAll(cards => cards.map(card => card.dataset.spotId)), pendingIds(saved.trips[0].days[1]));
      assert.equal(await restarted.evaluate(id => commitLiveSchedule({ type: 'defer', tripId: id, dayId: 'live-day-02', itemId: 'record' }, getActiveTrip().revision, '합성 오프라인 변경'), tripId), true);
      const changed = await restarted.evaluate(() => ({ trips: State.trips, raw: localStorage.getItem('st_trips_v2') }));
      assert.deepEqual(content(changed.trips[0]), content(saved.trips[0])); assert.equal(changed.trips[0].planHistory.length, saved.trips[0].planHistory.length + 1);
      assert.equal(changed.trips[0].days[1].spots.find(spot => spot.id === 'record').deferred, true);
      assert.deepEqual(JSON.parse(changed.raw), changed.trips); await restarted.close();
      return { realServiceWorker: true, freshOfflinePage: true, offlineCommitPersisted: true, days: 45 };
    }, { offline: true });
  } finally {
    const result = { passed: results.every(result => result.passed), results };
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
    if (!result.passed) process.exitCode = 1;
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
