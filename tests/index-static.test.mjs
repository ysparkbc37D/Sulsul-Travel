import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
const chronicle = readFileSync(new URL('../술술트래블신록.md', import.meta.url), 'utf8');
const companion = readFileSync(new URL('../js/presentation/companion-ui.js', import.meta.url), 'utf8');
const companionCss = readFileSync(new URL('../css/companion.css', import.meta.url), 'utf8');
const utilitiesCss = readFileSync(new URL('../css/utilities.css', import.meta.url), 'utf8');

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
  assert.match(html, /js\/infrastructure\/storage\/journal-overflow-repository\.js/);
  assert.match(sw, /js\/infrastructure\/storage\/legacy-trip-repository\.js/);
  assert.match(sw, /js\/infrastructure\/storage\/journal-overflow-repository\.js/);
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
  assert.match(html, /function submitPlanBlockEdit\(\{ regenerate = false \} = \{\}\)/);
  assert.match(html, /function openActivePlanBlockReplan\(\)/);
  assert.match(html, /range:\$\{dayIdx\}:\$\{rangeEndIdx\}/);
  assert.match(html, /window\.addEventListener\('popstate'/);
  assert.match(html, /day\.loc, day\.cityName, day\.city, day\.route, day\.title/);
  assert.match(sw, /const CACHE_PREFIX = 'st-shell-'/);
});

test('new trip creation passes major cities into the AI itinerary flow', () => {
  assert.match(html, /id=["']trip-form-cities["']/);
  assert.match(html, /let shouldGenerateAi =/);
  assert.match(html, /void generateAiItinerary\(\)/);
  assert.match(html, /우선 방문할 주요 도시\/거점/);
  assert.match(html, /requestedCities\.join\(', '\)/);
  assert.match(html, /const provisionalCity = requestedCities\[cityIndex\]/);
  assert.match(html, /planSource: shouldGenerateAi \? 'ai_pending'/);
});

test('AI itinerary approval updates day identity, rebuilds initial plan blocks, and rejects sparse schedules', () => {
  assert.match(html, /target\.title = plainAiValue\(proposed\.title/);
  assert.match(html, /target\.city = plainAiValue\(proposed\.city/);
  assert.match(html, /replacePlanStructure: Boolean\(job\.input\.replacePlanStructure\)/);
  assert.match(html, /trip\.days\.forEach\(day => delete day\.planBlockId\)/);
  assert.match(html, /dayNum !== dayIndex \+ 1/);
  assert.match(html, /day\.spots\.length < minimum/);
  assert.match(html, /minSpotsPerDay: 6/);
  assert.match(html, /8~12개 일정을 만듭니다/);
  assert.match(html, /:00 또는 :30으로 시작/);
  assert.match(html, /result\.errorCode === 'INVALID_OUTPUT'/);
});

test('big plan edits can trigger scoped AI regeneration without a free-travel fallback', () => {
  assert.match(html, /id=["']btn-save-plan-block-ai["']/);
  assert.match(html, /submitPlanBlockEdit\(\{ regenerate: true \}\)/);
  assert.match(html, /function startPlanBlockAiRegeneration\(blockId, reason\)/);
  assert.match(html, /function buildAiReplanPrompt\(/);
  assert.match(html, /사용자가 편집하고 저장한 큰 계획/);
  assert.match(companion, /regeneratePlanBlockByIndex\(\$\{index\}\)/);
  assert.doesNotMatch(html, /countriesStr \? splitTravelList\(countriesStr\) : \['자유여행'\]/);
  assert.doesNotMatch(html, /State\.createTripSelectedConcepts\.slice\(\)\s*:\s*\['자유여행'\]/);
});

test('legacy destructive AI paths and mock OCR are absent', () => {
  assert.doesNotMatch(html, /trip\.days\s*=\s*parsedDays/);
  assert.doesNotMatch(html, /mockReceiptOcr/);
  assert.match(html, /TripRepository\.applyDraft/);
});

test('journal approval has an IndexedDB overflow path for full localStorage', () => {
  assert.match(html, /async function restoreJournalOverflowEntries\(\)/);
  assert.match(html, /saveJournalOverflowEntry\(fallbackTrip, job\.input\.dayIndex/);
  assert.match(html, /job\.kind !== 'journal' \|\| !isStorageWriteFailure\(error\)/);
});

test('Gemini uses current models and header based API key transport', () => {
  assert.match(html, /const AI_MODELS = \['gemini-3\.1-flash-lite', 'gemini-3\.5-flash-lite', 'gemini-3\.5-flash'\]/);
  assert.match(html, /models\/\$\{AI_MODELS\[0\]\}:generateContent/);
  assert.match(html, /'x-goog-api-key': candidateKey/);
  assert.match(html, /'x-goog-api-key': key/);
  assert.doesNotMatch(html, /models\/gemini-2\.0-flash:generateContent\?key=/);
});

test('mobile travel notebook presentation is bundled and protected from CDN regressions', () => {
  assert.match(html, /css\/utilities\.css\?v=1\.4\./);
  assert.match(html, /css\/companion\.css\?v=1\.4\./);
  assert.match(html, /js\/presentation\/companion-ui\.js\?v=1\.4\./);
  assert.match(html, /id=["']companion-main-nav["']/);
  assert.match(html, /id=["']companion-plan-nav["']/);
  assert.doesNotMatch(html, /cdn\.tailwindcss\.com/);
  assert.doesNotMatch(html, /cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome/);
  assert.match(companion, /function renderCompanionPlan\(/);
  assert.match(companion, /function renderCompanionDetail\(/);
  assert.match(companion, /function renderCompanionToday\(/);
  assert.match(companionCss, /#companion-main-nav[\s\S]*position:fixed/);
  assert.match(companionCss, /min-height:44px/);
  assert.match(utilitiesCss, /\.flex/);
  for (const asset of [
    'css/utilities.css?v=1.6.3',
    'css/companion.css?v=1.6.3',
    'js/presentation/companion-ui.js?v=1.6.3',
    'vendor/fontawesome/css/all.min.css',
    'vendor/leaflet/leaflet.js',
    'vendor/leaflet/images/marker-icon-2x.png',
    'vendor/lz-string/lz-string.min.js'
  ]) assert.match(sw, new RegExp(asset.replace(/[.?]/g, '\\$&')));
});

test('release version is synchronized', () => {
  const app = html.match(/const APP_VER\s*=\s*'([^']+)'/)?.[1];
  const worker = sw.match(/const V\s*=\s*'st-shell-v([^']+)'/)?.[1];
  const release = changelog.match(/## \[v([^\]]+)\]/)?.[1];
  const chronicleRelease = chronicle.match(/^### \[실록 \d+호\].*\(v([^\)]+)\)$/m)?.[1];
  assert.equal(app, '1.6.3');
  assert.equal(worker, app);
  assert.equal(release, app);
  assert.equal(chronicleRelease, app);
});
