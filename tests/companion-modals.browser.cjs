/* 동행 현장 모달(기사님 카드·긴급 SOS·스토리 매거진)·렌더 중 저장 제거·전역 상태 정리 검증 (v2.2.8, 계획 4단계 19차).
 * Run: PLAYWRIGHT_MODULE=<optional> CHROME_PATH=<optional> node tests/companion-modals.browser.cjs */
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
    id: 'cm-trip-tokyo',
    title: '도쿄 2일 테스트',
    startDate: '2026-12-01',
    endDate: '2026-12-02',
    durationDays: 2,
    countries: ['일본'],
    cities: ['도쿄'],
    currency: 'JPY',
    budget: 100000,
    revision: 1,
    days: [
      {
        id: 'cm-d1',
        dayNum: 1,
        date: '2026-12-01',
        city: '도쿄',
        spots: [{
          id: 'cm-s1',
          time: '09:00',
          title: "시부야' 스카이",
          address: "Tokyo');window.__taxiPwn=1;//",
          lat: 35.6584,
          lng: 139.7022,
          completed: true
        }]
      },
      {
        id: 'cm-d2',
        dayNum: 2,
        date: '2026-12-02',
        city: '도쿄',
        spots: []
      }
    ],
    expenses: [{ id: 'cm-e1', date: '2026-12-01', title: '스시', cat: 'meal', krw: 80000 }],
    momentEntries: [{
      id: 'cm-m1',
      dayId: 'cm-d1',
      date: '2026-12-01',
      time: '20:30',
      text: '멋진 도쿄 야경',
      photos: [
        'javascript:alert(1)',
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      ]
    }],
    journals: {},
    checklist: []
  };
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
  const results = [];

  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', async d => { await d.accept(); });
    await page.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
    await page.addInitScript(trip => {
      localStorage.setItem('st_demo_choice_v1', 'dismissed');
      localStorage.setItem('st_trips_v2', JSON.stringify([trip]));
      window.__copiedTexts = [];
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: text => {
            window.__copiedTexts.push(String(text));
            return Promise.resolve();
          }
        }
      });
    }, makeSeedTrip());

    await page.goto(origin + '/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.SulsulTravel?.CompanionModals && window.SulsulTravel?.SpotRealignmentUI && window.SulsulTravel.State.trips.length === 1));

    // 1. 전역 오염 제거 + 부팅 PlanBlocks 정규화 + renderCompanionPlan 중 무저장 + UI Actions 등록
    {
      const bootCheck = await page.evaluate(() => {
        const known = new Set(window.SulsulTravel.UiActions.names());
        const missing = [];
        for (const id of ['modal-taxi-card', 'modal-sos-emergency', 'modal-story-magazine']) {
          const el = document.getElementById(id);
          for (const attr of ['data-on-click', 'data-on-change', 'data-on-input']) {
            for (const node of el.querySelectorAll(`[${attr}]`)) {
              const name = node.getAttribute(attr);
              if (name && !known.has(name)) missing.push(`${id}:${name}`);
            }
          }
        }
        const trip = window.SulsulTravel.State.trips[0];
        let saveCalls = 0;
        const origSave = window.saveTrips;
        window.saveTrips = async (...args) => { saveCalls += 1; return origSave(...args); };
        window.SulsulTravel.State.activeTripId = trip.id;
        window.openTripWorkspace(trip.id);
        window.switchTab('plan');
        window.renderCompanionPlan();
        window.saveTrips = origSave;
        const planBlockIds = (trip.days || []).map(d => d.planBlockId || null);

        const reorderInitial = window.SulsulTravel.SpotRealignmentUI.isReorderMode();
        window.toggleSpotReorderMode();
        const reorderAfterOn = window.SulsulTravel.SpotRealignmentUI.isReorderMode();
        window.toggleSpotReorderMode();
        const reorderAfterOff = window.SulsulTravel.SpotRealignmentUI.isReorderMode();

        return {
          missing,
          hasSpotReorderGlobal: '__spotReorderModeActive' in window,
          hasHudTimerGlobal: '__companionHudTimer' in window,
          planBlockIds,
          saveCalls,
          reorderInitial,
          reorderAfterOn,
          reorderAfterOff
        };
      });
      assert.deepEqual(bootCheck.missing, [], '동행 모달 UI Action이 모두 등록되어야 한다');
      assert.equal(bootCheck.hasSpotReorderGlobal, false, 'window.__spotReorderModeActive 전역이 남아있지 않아야 한다');
      assert.equal(bootCheck.hasHudTimerGlobal, false, 'window.__companionHudTimer 전역이 남아있지 않아야 한다');
      assert.deepEqual(bootCheck.planBlockIds, ['pb_cm-trip-tokyo_0', 'pb_cm-trip-tokyo_0'], '결정적 planBlockId가 렌더 시 저장 없이 채워져야 한다');
      assert.equal(bootCheck.saveCalls, 0, 'renderCompanionPlan은 렌더링 중 saveTrips를 호출하지 않아야 한다');
      assert.equal(bootCheck.reorderInitial, false);
      assert.equal(bootCheck.reorderAfterOn, true);
      assert.equal(bootCheck.reorderAfterOff, false);
      results.push({ name: 'boot_normalization_and_no_render_save', passed: true });
    }

    // 2. 기사님 카드 XSS 차단 + 빈 일차 이전 내용 잔류 방지 + 언어/확대 접근성
    {
      await page.evaluate(() => {
        window.SulsulTravel.CompanionModals.openTaxi(0, 0);
      });
      await page.locator('[data-on-click="companionModals.copyTaxi"]').click();
      await page.locator('[data-on-click="companionModals.taxiLang"][data-lang="en"]').click();
      await page.locator('[data-on-click="companionModals.taxiHuge"]').click();

      const taxiActiveCheck = await page.evaluate(() => {
        const modal = document.getElementById('modal-taxi-card');
        const enBtn = modal.querySelector('[data-on-click="companionModals.taxiLang"][data-lang="en"]');
        const hugeBtn = modal.querySelector('[data-on-click="companionModals.taxiHuge"]');
        return {
          open: !modal.classList.contains('sheet-closed'),
          pwn: window.__taxiPwn,
          lastCopied: window.__copiedTexts.at(-1),
          enPressed: enBtn?.getAttribute('aria-pressed'),
          hugePressed: hugeBtn?.getAttribute('aria-pressed'),
          hasHugeClass: Boolean(modal.querySelector('.taxi-card-display.is-huge')),
          phraseText: modal.querySelector('.taxi-card-phrase')?.textContent || ''
        };
      });
      assert.equal(taxiActiveCheck.open, true);
      assert.equal(taxiActiveCheck.pwn, undefined, '기사님 카드 복사 버튼이 따옴표 XSS를 실행하지 않아야 한다');
      assert.equal(taxiActiveCheck.lastCopied, "Tokyo');window.__taxiPwn=1;//");
      assert.equal(taxiActiveCheck.enPressed, 'true');
      assert.equal(taxiActiveCheck.hugePressed, 'true');
      assert.equal(taxiActiveCheck.hasHugeClass, true);
      assert.match(taxiActiveCheck.phraseText, /Driver, please take me/);

      // 빈 일차(index 1)로 다시 열 때 이전 목적지("시부야")가 남지 않는지 확인
      await page.evaluate(() => {
        window.openTaxiCardModal(1, 0);
      });
      const taxiEmptyCheck = await page.evaluate(() => ({
        text: document.getElementById('taxi-card-content')?.textContent || ''
      }));
      assert.doesNotMatch(taxiEmptyCheck.text, /시부야/, '빈 일차 기사님 카드에 이전 목적지가 남지 않아야 한다');
      assert.match(taxiEmptyCheck.text, /찾을 수 없어요/);
      await page.waitForTimeout(400);
      await page.locator('#modal-taxi-card button[data-on-click="shell.closeModal"]').first().click();
      results.push({ name: 'taxi_card_xss_and_empty_day_guard', passed: true });
    }

    // 3. 긴급 SOS 연타 시 '복사됨' 고착 방지 + 잘못된 언어/카테고리 폴백 + aria-pressed
    {
      await page.waitForTimeout(400);
      await page.locator('#ws-btn-sos').click();
      const firstCopyBtn = page.locator('#sos-emergency-content [data-on-click="companionModals.sosCopy"]').first();
      await firstCopyBtn.click();
      await page.waitForTimeout(40);
      await firstCopyBtn.click();
      await page.waitForTimeout(40);
      const midText = await firstCopyBtn.textContent();
      await page.waitForTimeout(1700);
      const restoredText = await firstCopyBtn.textContent();

      await page.evaluate(() => {
        window.renderSosEmergencyContent('bogus-lang', 'bogus-cat', 'bogus-id');
      });
      const sosFallbackCheck = await page.evaluate(() => {
        const modal = document.getElementById('modal-sos-emergency');
        const st = window.SulsulTravel.State.sos;
        return {
          open: !modal.classList.contains('sheet-closed'),
          text: modal.textContent || '',
          lang: st.lang,
          category: st.category,
          expanded: st.expanded,
          allPressed: modal.querySelector('[data-on-click="companionModals.sosCategory"][data-category="all"]')?.getAttribute('aria-pressed'),
          copiedCount: window.__copiedTexts.length
        };
      });
      assert.equal(sosFallbackCheck.open, true);
      assert.match(midText, /복사됨/);
      assert.match(restoredText, /복사/);
      assert.doesNotMatch(restoredText, /복사됨/, 'SOS 복사 버튼 연타 후에도 1.5초 뒤 원래 라벨로 복원되어야 한다');
      assert.match(sosFallbackCheck.text, /110/);
      assert.equal(sosFallbackCheck.lang, 'auto');
      assert.equal(sosFallbackCheck.category, 'all');
      assert.equal(sosFallbackCheck.expanded, null);
      assert.equal(sosFallbackCheck.allPressed, 'true');
      assert.ok(sosFallbackCheck.copiedCount >= 3);
      await page.locator('#modal-sos-emergency button[data-on-click="shell.closeModal"]').click();
      await page.waitForTimeout(400);
      results.push({ name: 'sos_rapid_copy_and_fallback', passed: true });
    }

    // 4. 스토리 매거진 320px 레이아웃 + 안전하지 않은 이미지 URL 차단 + 인쇄 동작
    {
      await page.setViewportSize({ width: 320, height: 568 });
      await page.locator('.travel-tools summary').click();
      await page.locator('.travel-tools [data-on-click="companionModals.openMagazine"]').click();
      const magCheck = await page.evaluate(() => {
        const modal = document.getElementById('modal-story-magazine');
        const detailsOpen = Boolean(document.querySelector('.travel-tools')?.open);
        const imgs = [...modal.querySelectorAll('img')].map(img => img.getAttribute('src') || '');
        window.__printCount = 0;
        window.print = () => { window.__printCount += 1; };
        modal.querySelector('[data-on-click="companionModals.printMagazine"]')?.click();
        return {
          open: !modal.classList.contains('sheet-closed'),
          detailsOpen,
          imgs,
          hasJavascriptUrl: imgs.some(src => /^javascript:/i.test(src)),
          overflow: document.documentElement.scrollWidth > window.innerWidth,
          printCount: window.__printCount
        };
      });
      assert.equal(magCheck.open, true);
      assert.equal(magCheck.detailsOpen, false, '도구 메뉴에서 매거진을 열면 details 메뉴가 닫혀야 한다');
      assert.equal(magCheck.hasJavascriptUrl, false, '위험한 javascript: 사진 URL은 매거진에 렌더되지 않아야 한다');
      assert.ok(magCheck.imgs.some(src => src.startsWith('data:image/png;base64,')), '정상 사진은 매거진에 유지되어야 한다');
      assert.equal(magCheck.overflow, false, '320px 모바일 폭에서 가로 넘침이 없어야 한다');
      assert.equal(magCheck.printCount, 1);
      results.push({ name: 'story_magazine_security_and_mobile', passed: true });
    }

    assert.deepEqual(errors, [], '페이지 오류가 없어야 한다: ' + errors.join('; '));
    console.log(JSON.stringify({ passed: results.length, results }, null, 2));
  } finally {
    await browser.close();
    server.close();
  }
})();
