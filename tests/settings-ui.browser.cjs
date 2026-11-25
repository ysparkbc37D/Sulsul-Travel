/* 설정·테마·Gemini API 키·PWA 설치 안내·안내 모달 분리 검증 (v2.2.1, 계획 4단계 13차).
 * Run: PLAYWRIGHT_MODULE=<optional> CHROME_PATH=<optional> node tests/settings-ui.browser.cjs */
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

async function openPage(browser, url, options = {}) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: 'block',
    ...options
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', async d => { await d.accept(); });
  await page.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
  await page.goto(url, { waitUntil: 'networkidle' });
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
    // 1. 설정 모달·3-Way 테마·탭 가드·모달 간 즉시 전환·헤더 버전 배지 버블링 차단·320px 레이아웃
    {
      const { context, page, errors } = await openPage(browser, `${origin}/`);
      try {
        await page.locator('#header-btn-settings').click();
        assert.equal(await page.locator('#modal-settings').evaluate(el => el.classList.contains('sheet-closed')), false);

        const initial = await page.evaluate(() => ({
          themeTabPressed: document.getElementById('tab-settings-theme').getAttribute('aria-pressed'),
          aiTabPressed: document.getElementById('tab-settings-ai').getAttribute('aria-pressed'),
          modernPressed: document.getElementById('btn-theme-modern').getAttribute('aria-pressed')
        }));
        assert.deepEqual(initial, { themeTabPressed: 'true', aiTabPressed: 'false', modernPressed: 'true' });

        await page.locator('#btn-theme-lightgray').click();
        assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'lightgray');
        assert.equal(await page.evaluate(() => localStorage.getItem('st_theme')), 'lightgray');
        assert.equal(await page.locator('#btn-theme-lightgray').getAttribute('aria-pressed'), 'true');

        await page.locator('#btn-theme-deepblack').click();
        assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'deepblack');
        assert.equal(await page.evaluate(() => document.documentElement.classList.contains('dark')), true);
        assert.equal(await page.locator('#btn-theme-deepblack').getAttribute('aria-pressed'), 'true');

        await page.locator('#btn-theme-modern').click();
        assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'modern');
        assert.equal(await page.evaluate(() => document.documentElement.classList.contains('dark')), false);

        // 잘못된 탭 인자에도 패널이 전부 비지 않고 theme 탭으로 복구된다.
        const fallbackTab = await page.evaluate(() => {
          SulsulTravel.SettingsUI.switchTab('bogus');
          return {
            themeHidden: document.getElementById('panel-settings-theme').classList.contains('hidden'),
            themePressed: document.getElementById('tab-settings-theme').getAttribute('aria-pressed')
          };
        });
        assert.deepEqual(fallbackTab, { themeHidden: false, themePressed: 'true' });

        // 320px 모바일에서도 가로 넘침이 없다.
        await page.setViewportSize({ width: 320, height: 844 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.setViewportSize({ width: 390, height: 844 });

        // 설정 모달을 열자마자 350ms 이내에 '버전 기록 전체'를 눌러도 이전 설정 모달이 뒤에 남지 않는다.
        await page.locator('#tab-settings-data').click();
        await page.evaluate(() => SulsulTravel.SettingsUI.open('data'));
        await page.locator('#panel-settings-data button[data-on-click="settings.openVersionHistory"]').click();
        const afterTransition = await page.evaluate(() => ({
          settingsClosed: document.getElementById('modal-settings').classList.contains('sheet-closed'),
          historyOpen: !document.getElementById('modal-version-history').classList.contains('sheet-closed')
        }));
        assert.deepEqual(afterTransition, { settingsClosed: true, historyOpen: true });

        await page.evaluate(() => closeModal('modal-version-history', true));

        // 워크스페이스 화면에서 헤더 버전 배지(#app-ver-badge)를 눌러도 부모 .app-brand의 허브 복귀가 실행되지 않는다.
        await page.evaluate(async () => {
          const t = { id: 'settings-ws-trip', title: '도쿄 주말', startDate: '2026-10-01', endDate: '2026-10-03', countries: ['일본'], cities: ['도쿄'], currency: 'JPY', budget: 50000, days: [{ dayNum: 1, date: '2026-10-01', city: '도쿄', title: '1일차', spots: [] }], expenses: [], journals: {}, checklist: [] };
          State.trips = await TripRepository.saveAll([t]);
          openTripWorkspace(t.id);
        });
        await page.locator('#app-ver-badge').click();
        const badgeClick = await page.evaluate(() => ({
          view: State.currentView,
          historyOpen: !document.getElementById('modal-version-history').classList.contains('sheet-closed')
        }));
        assert.deepEqual(badgeClick, { view: 'workspace', historyOpen: true });

        assert.deepEqual(errors, []);
        results.push({ name: 'settings-theme-tabs-and-modal-transition', passed: true });
      } finally {
        await context.close();
      }
    }

    // 2. Gemini API 키 신규 입력 즉시 연결 테스트·실패 시 기존 정상 키 보존·대체 모델 상태 초기화·삭제
    {
      const { context, page, errors } = await openPage(browser, `${origin}/`);
      try {
        await page.locator('#header-btn-settings').click();
        await page.locator('#tab-settings-ai').click();

        // 2a. 최초 미등록 상태에서 입력만 하고 바로 '연결 테스트'를 눌러도 후보 키를 검증하고 성공 시 저장한다.
        const freshResult = await page.evaluate(async () => {
          State.geminiKey = '';
          localStorage.removeItem('st_gemini_key');
          SulsulTravel.SettingsUI.updateGeminiKeyUi();
          const input = document.getElementById('modal-cfg-gemini-key');
          input.value = 'AIzaSyFreshKey123456';
          const sentKeys = [];
          const origFetch = window.fetch;
          window.fetch = async (url, init) => {
            sentKeys.push(init?.headers?.['x-goog-api-key'] || '');
            return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'OK' }] } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
          };
          try {
            await SulsulTravel.SettingsUI.testGeminiApiKey();
            return {
              sentKeys,
              stateKey: State.geminiKey,
              storedKey: localStorage.getItem('st_gemini_key'),
              inputDisabled: input.disabled,
              btnText: document.getElementById('btn-test-gemini-key').textContent
            };
          } finally {
            window.fetch = origFetch;
          }
        });
        assert.deepEqual(freshResult.sentKeys, ['AIzaSyFreshKey123456']);
        assert.equal(freshResult.stateKey, 'AIzaSyFreshKey123456');
        assert.equal(freshResult.storedKey, 'AIzaSyFreshKey123456');
        assert.equal(freshResult.inputDisabled, true);
        assert.ok(freshResult.btnText.includes('정상 작동'));

        // 2b. '키 변경' 후 잘못된 키로 연결 테스트가 실패하면 기존 정상 키가 덮어씌워지지 않는다.
        await page.locator('#btn-save-gemini-key').click(); // 편집 모드 진입
        assert.equal(await page.locator('#modal-cfg-gemini-key').isDisabled(), false);
        await page.locator('#btn-toggle-gemini-key').click();
        assert.equal(await page.locator('#modal-cfg-gemini-key').getAttribute('type'), 'text');
        await page.locator('#btn-toggle-gemini-key').click();
        assert.equal(await page.locator('#modal-cfg-gemini-key').getAttribute('type'), 'password');

        const failedTest = await page.evaluate(async () => {
          const input = document.getElementById('modal-cfg-gemini-key');
          input.value = 'AIzaSyBrokenKey000000';
          const origFetch = window.fetch;
          window.fetch = async () => new Response(JSON.stringify({ error: { message: 'API key not valid' } }), { status: 400, headers: { 'Content-Type': 'application/json' } });
          try {
            await SulsulTravel.SettingsUI.testGeminiApiKey();
            return {
              stateKey: State.geminiKey,
              storedKey: localStorage.getItem('st_gemini_key'),
              btnText: document.getElementById('btn-test-gemini-key').textContent
            };
          } finally {
            window.fetch = origFetch;
          }
        });
        assert.equal(failedTest.stateKey, 'AIzaSyFreshKey123456');
        assert.equal(failedTest.storedKey, 'AIzaSyFreshKey123456');
        assert.ok(failedTest.btnText.includes('연결 실패'));

        // 취소 버튼으로 편집 모드 종료
        await page.locator('#btn-cancel-gemini-key').click();
        assert.equal(await page.locator('#modal-cfg-gemini-key').isDisabled(), true);

        // 2c. 새 키 저장·삭제 시 이전 Fallback 상태가 초기화된다.
        await page.evaluate(() => { State.aiFallbackActive = true; });
        await page.locator('#btn-save-gemini-key').click();
        await page.locator('#modal-cfg-gemini-key').fill('AIzaSyBrandNewKey777777');
        await page.locator('#btn-save-gemini-key').click();
        assert.equal(await page.evaluate(() => State.aiFallbackActive), false);
        assert.equal(await page.evaluate(() => State.geminiKey), 'AIzaSyBrandNewKey777777');
        assert.equal(await page.locator('#ai-status-text').textContent(), '키 등록됨');

        await page.locator('#btn-delete-gemini-key').click();
        assert.equal(await page.evaluate(() => State.geminiKey), '');
        assert.equal(await page.evaluate(() => localStorage.getItem('st_gemini_key')), null);
        assert.equal(await page.locator('#ai-status-text').textContent(), '키 필요');

        assert.deepEqual(errors, []);
        results.push({ name: 'gemini-key-lifecycle-and-safe-test', passed: true });
      } finally {
        await context.close();
      }
    }

    // 3. PWA 설치 안내·크롬 인텐트 프로토콜/이스케이프·배너 닫기/복원·푸터 안내 모달
    {
      const { context, page, errors } = await openPage(browser, `${origin}/?a=1&copy=2&x=3`, {
        viewport: { width: 1024, height: 844 },
        userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 KAKAOTALK/10.0'
      });
      try {
        // 시작 가이드 배너 닫기 및 설정에서 복원
        assert.equal(await page.locator('#smart-welcome-banner').evaluate(el => el.classList.contains('hidden')), false);
        await page.locator('#smart-welcome-banner button[data-on-click="settings.dismissWelcome"]').click();
        assert.equal(await page.locator('#smart-welcome-banner').evaluate(el => el.classList.contains('hidden')), true);
        assert.equal(await page.evaluate(() => localStorage.getItem('st_hide_swb')), '1');

        await page.locator('#header-btn-settings').click();
        await page.locator('#tab-settings-data').click();
        await page.locator('#panel-settings-data button[data-on-click="settings.restoreWelcome"]').click();
        assert.equal(await page.locator('#smart-welcome-banner').evaluate(el => el.classList.contains('hidden')), false);
        await page.evaluate(() => closeModal('modal-settings', true));

        // 배너 클릭 → 설치 안내 모달 + 인앱 크롬 인텐트 프로토콜(http) 및 쿼리 보존 확인
        await page.locator('#smart-welcome-banner button[data-on-click="settings.installBanner"]').click();
        const installCheck = await page.evaluate(() => {
          const a = document.querySelector('#install-guide-dynamic-box a');
          const href = a ? a.getAttribute('href') : '';
          const hasInlineOnclick = document.querySelectorAll('#modal-install-guide [onclick], #smart-welcome-banner [onclick]').length;
          return {
            modalOpen: !document.getElementById('modal-install-guide').classList.contains('sheet-closed'),
            href,
            hasInlineOnclick
          };
        });
        assert.equal(installCheck.modalOpen, true);
        assert.ok(installCheck.href.includes('scheme=http;'), `expected scheme=http, got ${installCheck.href}`);
        assert.ok(installCheck.href.includes('a=1&copy=2&x=3'), `expected query preserved, got ${installCheck.href}`);
        assert.equal(installCheck.hasInlineOnclick, 0);

        // 플랫폼 3대 탭 전환 + 잘못된 플랫폼 인자 폴백 + aria-pressed
        await page.locator('#tab-inst-ios').click();
        assert.equal(await page.locator('#inst-guide-ios').evaluate(el => el.classList.contains('hidden')), false);
        assert.equal(await page.locator('#tab-inst-ios').getAttribute('aria-pressed'), 'true');
        await page.locator('#tab-inst-pc').click();
        assert.equal(await page.locator('#inst-guide-pc').evaluate(el => el.classList.contains('hidden')), false);
        assert.equal(await page.locator('#tab-inst-pc').getAttribute('aria-pressed'), 'true');
        const badPlatform = await page.evaluate(() => {
          SulsulTravel.SettingsUI.switchInstallTab('bogus');
          return {
            androidHidden: document.getElementById('inst-guide-android').classList.contains('hidden'),
            androidPressed: document.getElementById('tab-inst-android').getAttribute('aria-pressed')
          };
        });
        assert.deepEqual(badPlatform, { androidHidden: false, androidPressed: 'true' });
        await page.evaluate(() => closeModal('modal-install-guide', true));

        // 푸터 4대 안내·후원 모달 + 기기 간 백업 안내 → 설정(데이터 탭) 즉시 전환
        await page.locator('#hub-sulsul-footer button[data-on-click="settings.openUserGuide"]').click();
        assert.equal(await page.locator('#modal-user-guide').evaluate(el => el.classList.contains('sheet-closed')), false);
        await page.evaluate(() => closeModal('modal-user-guide', true));

        await page.locator('#hub-sulsul-footer button[data-on-click="settings.openPrivacy"]').click();
        assert.equal(await page.locator('#modal-privacy').evaluate(el => el.classList.contains('sheet-closed')), false);
        await page.evaluate(() => closeModal('modal-privacy', true));

        await page.locator('#hub-sulsul-footer button[data-on-click="settings.openDonation"]').click();
        assert.equal(await page.locator('#modal-donation').evaluate(el => el.classList.contains('sheet-closed')), false);
        await page.evaluate(() => closeModal('modal-donation', true));

        await page.locator('#hub-sulsul-footer button[data-on-click="settings.openDeviceSync"]').click();
        assert.equal(await page.locator('#modal-device-sync').evaluate(el => el.classList.contains('sheet-closed')), false);
        await page.locator('#modal-device-sync button[data-on-click="settings.openFromModal"]').click();
        const syncToData = await page.evaluate(() => ({
          syncClosed: document.getElementById('modal-device-sync').classList.contains('sheet-closed'),
          settingsOpen: !document.getElementById('modal-settings').classList.contains('sheet-closed'),
          dataVisible: !document.getElementById('panel-settings-data').classList.contains('hidden'),
          dataTabPressed: document.getElementById('tab-settings-data').getAttribute('aria-pressed')
        }));
        assert.deepEqual(syncToData, { syncClosed: true, settingsOpen: true, dataVisible: true, dataTabPressed: 'true' });

        // 등록되지 않은 data-on-* 동작 없음 확인
        const unknownActions = await page.evaluate(() => {
          const bad = [];
          for (const attr of ['data-on-click', 'data-on-change', 'data-on-input']) {
            document.querySelectorAll(`[${attr}]`).forEach(el => {
              const name = el.getAttribute(attr);
              if (!SulsulTravel.UiActions.has(name)) bad.push(`${attr}=${name}`);
            });
          }
          return bad;
        });
        assert.deepEqual(unknownActions, []);

        assert.deepEqual(errors, []);
        results.push({ name: 'pwa-install-banner-and-footer-guide-modals', passed: true });
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
