/* PDF 완주 보고서·GitHub Gist 백업·AI 채팅 분리 검증 (v2.2.7, 계획 4단계 18차).
 * Run: PLAYWRIGHT_MODULE=<optional> CHROME_PATH=<optional> node tests/report-gist-chat.browser.cjs */
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
    id: 'rgc-eur-trip',
    title: '파리 3일 테스트',
    startDate: '2026-12-01',
    endDate: '2026-12-03',
    durationDays: 3,
    countries: ['프랑스'],
    cities: ['파리'],
    currency: 'EUR',
    budget: 2000,
    revision: 1,
    days: [{ id: 'rgc-d1', dayNum: 1, date: '2026-12-01', city: '파리', spots: [] }],
    expenses: [{ id: 'rgc-e1', date: '2026-12-01', title: '식사', cat: 'meal', krw: 500000 }],
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
    let gistPostCount = 0;
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', async d => { await d.accept(); });
    await page.route('**/*', async r => {
      const u = new URL(r.request().url());
      if (u.hostname === '127.0.0.1') return r.continue();
      if (u.hostname === 'api.github.com' && r.request().method() === 'POST') {
        gistPostCount += 1;
        await new Promise(res => setTimeout(res, 120));
        return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: '<b>bad</b>gist123' }) });
      }
      return r.abort();
    });
    await page.addInitScript(trip => {
      localStorage.setItem('st_demo_choice_v1', 'dismissed');
      localStorage.setItem('st_trips_v2', JSON.stringify([trip]));
    }, makeSeedTrip());
    await page.goto(origin + '/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.SulsulTravel?.ReportUI && window.SulsulTravel?.GistSync && window.SulsulTravel?.AiChat && window.SulsulTravel.State.trips.length === 1));

    // 1. PDF Report: EUR 원화 환산 예산 + 잔액 정확성 + 제목 누락 다운로드 방어 + data-on-* 등록
    {
      const pdfCheck = await page.evaluate(() => {
        const known = new Set(window.SulsulTravel.UiActions.names());
        const missing = [];
        for (const id of ['modal-pdf-report', 'modal-ai-chat']) {
          const el = document.getElementById(id);
          for (const attr of ['data-on-click', 'data-on-change', 'data-on-input']) {
            for (const node of el.querySelectorAll(`[${attr}]`)) {
              const name = node.getAttribute(attr);
              if (name && !known.has(name)) missing.push(`${id}:${name}`);
            }
          }
        }
        window.SulsulTravel.ReportUI.openModal('rgc-eur-trip');
        const cards = [...document.querySelectorAll('#pdf-report-content .grid-cols-2 > div')].map(el => el.textContent.replace(/\s+/g, ' ').trim());
        const expectedBudgetKrw = window.SulsulTravel.ReportUI.resolveBudgetKrw(window.SulsulTravel.State.trips[0]);
        // 제목 누락 시에도 downloadHtml이 크래시 없이 실행
        const trip = window.SulsulTravel.State.trips[0];
        const origTitle = trip.title;
        delete trip.title;
        let downloadErr = null;
        try { window.SulsulTravel.ReportUI.downloadHtml(); } catch (e) { downloadErr = e.message; }
        trip.title = origTitle;
        return { missing, cards, expectedBudgetKrw, downloadErr };
      });
      assert.deepEqual(pdfCheck.missing, []);
      assert.ok(pdfCheck.expectedBudgetKrw >= 2000000, 'EUR 2,000 must convert to KRW (>= 2,000,000)');
      assert.ok(pdfCheck.cards[0].includes(pdfCheck.expectedBudgetKrw.toLocaleString()), 'budget card must show KRW converted budget');
      assert.ok(!pdfCheck.cards[2].includes('₩0'), 'remaining budget must NOT collapse to ₩0');
      assert.equal(pdfCheck.downloadErr, null, 'missing trip.title must not throw on downloadHtml');
      results.push({ name: 'PDF report KRW budget conversion & missing-title download safety', passed: true });
    }

    // 2. Gist Sync: URL 정규화 + 연타 중복 POST 차단 + 토스트 XSS 차단
    {
      const gistCheck = await page.evaluate(async () => {
        const norm = window.SulsulTravel.GistSync.normalizeGistId('https://gist.github.com/octocat/abcdef1234567890');
        document.getElementById('cfg-github-pat').value = 'ghp_test_token_123';
        document.getElementById('cfg-github-gist').value = '';
        const [r1, r2] = await Promise.all([
          window.SulsulTravel.GistSync.push(),
          window.SulsulTravel.GistSync.push()
        ]);
        return {
          norm,
          r1,
          r2,
          toastBoldInjected: Boolean(document.querySelector('#sulsul-global-toast b')),
          btnDisabledAfter: document.getElementById('btn-gist-push')?.disabled
        };
      });
      assert.equal(gistCheck.norm, 'abcdef1234567890');
      assert.equal(gistCheck.r1, true);
      assert.equal(gistCheck.r2, false, 'concurrent second push must be blocked');
      assert.equal(gistPostCount, 1, 'only 1 POST /gists request allowed');
      assert.equal(gistCheck.toastBoldInjected, false, 'Gist ID in toast must be escaped');
      assert.equal(gistCheck.btnDisabledAfter, false);
      results.push({ name: 'Gist sync URL normalization, concurrent push lock, toast escape', passed: true });
    }

    // 3. AI Chat: 연타 중복 전송 차단 + 선행 DOM 보존 + XSS 이스케이프 + Enter 키 전송
    {
      const chatCheck = await page.evaluate(async () => {
        openModal('modal-ai-chat');
        const sentinel = document.querySelector('#ai-chat-messages > div');
        sentinel.dataset.keepMe = 'yes';
        let calls = 0;
        let resolveFirst;
        window.callGeminiApiWithFallback = () => {
          calls += 1;
          return new Promise(res => { resolveFirst = res; });
        };
        const input = document.getElementById('ai-chat-input');
        input.value = '<img id="chatxss" src=x>질문 1';
        const p1 = window.SulsulTravel.AiChat.send();
        input.value = '질문 2';
        const p2 = window.SulsulTravel.AiChat.send();
        const spinnersWhilePending = document.querySelectorAll('#ai-chat-messages [id^="ai-chat-thinking-"]').length;
        const btnDisabledDuring = document.getElementById('ai-chat-send-btn')?.disabled;
        resolveFirst('응답 <script>window.__chatPwn=1</script>\n둘째 줄');
        const [r1, r2] = await Promise.all([p1, p2]);
        const stuckSpinners = document.querySelectorAll('#ai-chat-messages [id^="ai-chat-thinking-"]').length;
        return {
          calls, r1, r2, spinnersWhilePending, btnDisabledDuring, stuckSpinners,
          sentinelPreserved: document.querySelector('#ai-chat-messages > div') === sentinel,
          xssInjected: Boolean(document.getElementById('chatxss') || window.__chatPwn === 1),
          hasLineBreak: document.getElementById('ai-chat-messages').innerHTML.includes('둘째 줄')
        };
      });
      assert.equal(chatCheck.calls, 1, 'concurrent second chat message must be blocked');
      assert.equal(chatCheck.r1, true);
      assert.equal(chatCheck.r2, false);
      assert.equal(chatCheck.spinnersWhilePending, 1);
      assert.equal(chatCheck.btnDisabledDuring, true);
      assert.equal(chatCheck.stuckSpinners, 0);
      assert.equal(chatCheck.sentinelPreserved, true, 'insertAdjacentHTML must preserve earlier chat nodes');
      assert.equal(chatCheck.xssInjected, false);
      assert.equal(chatCheck.hasLineBreak, true);
      results.push({ name: 'AI chat concurrent send lock, DOM preservation, XSS escape', passed: true });
    }

    assert.deepEqual(errors, []);
    await context.close();
  } finally {
    await browser.close();
    server.close();
  }

  console.log(JSON.stringify({ suite: 'report-gist-chat.browser.cjs', passed: results.every(r => r.passed), results }, null, 2));
  if (!results.every(r => r.passed)) process.exit(1);
})();
