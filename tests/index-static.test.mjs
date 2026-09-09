import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');

test('all classic inline scripts parse', () => {
  const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*\btype=["']module["'])[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length > 0);
  scripts.forEach((match, index) => {
    assert.doesNotThrow(() => new Function(match[1]), `inline script ${index + 1} must parse`);
  });
});

test('AI review wiring and offline cache entries are present', () => {
  for (const id of ['modal-ai-draft-review', 'ai-draft-review-original',
    'ai-draft-review-proposal', 'btn-apply-ai-draft']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /js\/infrastructure\/storage\/legacy-trip-repository\.js/);
  assert.match(sw, /js\/infrastructure\/storage\/legacy-trip-repository\.js/);
  assert.match(sw, /js\/application\/orchestration\.mjs/);
  assert.match(sw, /js\/domain\/replan\.mjs/);
});

test('travel-stage navigation and reviewed RePlan are wired', () => {
  for (const id of ['nav-tab-plan', 'nav-tab-today', 'nav-tab-journal', 'nav-tab-checklist',
    'big-plan-container', 'plan-block-detail-page', 'plan-block-detail-container',
    'modal-plan-block-edit', 'today-overview-container', 'modal-replan-review']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /function applyPendingReplan\(/);
  assert.match(html, /protectedSpotsMatch/);
  assert.match(html, /function inferPlanBlockPlace\(day\)/);
  assert.match(html, /function submitPlanBlockEdit\(\)/);
  assert.match(html, /function openActivePlanBlockReplan\(\)/);
  assert.match(html, /range:\$\{dayIdx\}:\$\{rangeEndIdx\}/);
  assert.match(html, /window\.addEventListener\('popstate'/);
  assert.match(html, /day\.loc, day\.cityName, day\.city, day\.route, day\.title/);
  assert.match(sw, /const CACHE_PREFIX = 'st-shell-'/);
});

test('legacy destructive AI paths and mock OCR are absent', () => {
  assert.doesNotMatch(html, /trip\.days\s*=\s*parsedDays/);
  assert.doesNotMatch(html, /mockReceiptOcr/);
  assert.match(html, /TripRepository\.applyDraft/);
});

test('Gemini uses current models and header based API key transport', () => {
  assert.match(html, /const AI_MODELS = \['gemini-2\.5-flash', 'gemini-2\.5-flash-lite', 'gemini-2\.5-pro'\]/);
  assert.match(html, /models\/\$\{AI_MODELS\[0\]\}:generateContent/);
  assert.match(html, /'x-goog-api-key': candidateKey/);
  assert.match(html, /'x-goog-api-key': key/);
  assert.doesNotMatch(html, /models\/gemini-2\.0-flash:generateContent\?key=/);
});

test('release version is synchronized', () => {
  const app = html.match(/const APP_VER\s*=\s*'([^']+)'/)?.[1];
  const worker = sw.match(/const V\s*=\s*'st-shell-v([^']+)'/)?.[1];
  const release = changelog.match(/## \[v([^\]]+)\]/)?.[1];
  assert.equal(app, '1.3.2');
  assert.equal(worker, app);
  assert.equal(release, app);
});
