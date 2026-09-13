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
    'css/utilities.css?v=1.7.5',
    'css/companion.css?v=1.7.5',
    'js/presentation/companion-ui.js?v=1.7.5',
    'vendor/fontawesome/css/all.min.css',
    'vendor/leaflet/leaflet.js',
    'vendor/leaflet/images/marker-icon-2x.png',
    'vendor/lz-string/lz-string.min.js'
  ]) assert.match(sw, new RegExp(asset.replace(/[.?]/g, '\\$&')));
});

test('hub filter has 3-column single row and card actions are streamlined to 4 buttons (R-16)', () => {
  // 3-column single row filter setup: country, city, concept
  assert.match(html, /grid grid-cols-3 gap-1\.5 sm:gap-2/);
  assert.match(html, /id=["']hub-filter-country["']/);
  assert.match(html, /id=["']hub-filter-city["']/);
  assert.match(html, /id=["']hub-filter-concept["']/);
  assert.doesNotMatch(html, /id=["']hub-filter-city["'][^>]*class=["'][^"']*\bhidden\b/);

  // Cards must NOT have duplicateTrip buttons in markup
  assert.doesNotMatch(html, /onclick=["']duplicateTrip\(/);

  // List card must feature the streamlined 4-button action cluster
  assert.match(html, /title=["']대표 사진 등록["']/);
  assert.match(html, /title=["']PDF 여행 에세이 리포트["']/);
  assert.match(html, /title=["']여행 삭제["']/);
});

test('card touch swipe handlers and hidden drawers are purged for mobile stability (v1.7.0)', () => {
  assert.doesNotMatch(html, /handleTripSwipeStart/);
  assert.doesNotMatch(html, /handleTripSwipeMove/);
  assert.doesNotMatch(html, /handleTripSwipeEnd/);
  assert.doesNotMatch(html, /trip-swipe-container/);
  assert.doesNotMatch(html, /trip-swipe-front/);
});

test('pwa manifest and safe-zone icon assets are wired with cache-busting', () => {
  assert.match(html, /<link rel="manifest" href="manifest\.webmanifest\?v=1\.7\.3">/);
  assert.match(html, /icons\/icon-192-v115\.png\?v=1\.7\.3/);
  assert.match(html, /favicon\.png\?v=1\.7\.3/);
});

test('modern theme yellow/amber text has high-contrast override and theme buttons have explicit active styles (v1.7.1)', () => {
  // WCAG AAA contrast overrides for non-dark / modern / light themes
  assert.match(html, /:root:not\(\.dark\):not\(\[data-theme="deepblack"\]\):not\(\[data-theme="dark"\]\)\s*\.text-amber-400/);
  assert.match(html, /color:\s*#854d0e\s*!important/);
  assert.match(html, /color:\s*#92400e\s*!important/);

  // Modern theme selection button active styling
  assert.match(html, /#btn-theme-modern\.is-theme-active/);
  assert.match(html, /:root\[data-theme="modern"\]\s*#btn-theme-modern/);
  assert.match(html, /#btn-theme-modern\.is-theme-active\s*\*\s*,\s*:root\[data-theme="modern"\]\s*#btn-theme-modern\s*\*\s*\{\s*color:\s*#ffffff\s*!important/);
});

test('sulsul-diary card status gradients and bottom progress bar are wired (v1.7.2)', () => {
  assert.match(html, /\.trip-st-card/);
  assert.match(html, /\.trip-st-ongoing/);
  assert.match(html, /\.trip-st-planned/);
  assert.match(html, /\.trip-st-completed/);
  assert.match(html, /\.trip-st-bucket/);
  assert.match(html, /\.trip-bottom-bar/);
  assert.match(html, /class="trip-bottom-bar"/);
});

test('editorial footer, donation modal, guides, and copyright are complete (v1.7.2)', () => {
  assert.match(html, /id=["']hub-sulsul-footer["']/);
  assert.match(html, /Copyright © 2026 CoBa's Sulsul Travel\. All rights reserved\./);
  assert.match(html, /id=["']modal-donation["']/);
  assert.match(html, /id=["']modal-user-guide["']/);
  assert.match(html, /id=["']modal-device-sync["']/);
  assert.match(html, /id=["']modal-privacy["']/);
  assert.match(html, /function openDonationModal\(/);
  assert.match(html, /function copyDonationLink\(/);
  assert.match(html, /function openDonationLink\(/);
  assert.match(html, /https:\/\/blog\.naver\.com\/PostList\.naver\?blogId=ysparkbc37&from=postList&categoryNo=15/);
});

test('global country database expanded to 140+ countries and custom destination fallback supported (v1.7.3)', () => {
  // Region filter tabs 8 categories
  assert.match(html, /id=["']tab-reg-south_central_asia["']/);
  assert.match(html, /id=["']tab-reg-oceania["']/);
  assert.match(html, /id=["']tab-reg-mideast_africa["']/);

  // Representative newly added countries
  assert.match(html, /name:\s*['"]인도['"]/);
  assert.match(html, /name:\s*['"]네팔['"]/);
  assert.match(html, /name:\s*['"]몰디브['"]/);
  assert.match(html, /name:\s*['"]우즈베키스탄['"]/);
  assert.match(html, /name:\s*['"]슬로베니아['"]/);
  assert.match(html, /name:\s*['"]몰타['"]/);
  assert.match(html, /name:\s*['"]에콰도르['"]/);
  assert.match(html, /name:\s*['"]팔라우['"]/);
  assert.match(html, /name:\s*['"]프렌치 폴리네시아['"]/);
  assert.match(html, /name:\s*['"]사우디아라비아['"]/);
  assert.match(html, /name:\s*['"]모리셔스['"]/);
  assert.match(html, /name:\s*['"]나미비아['"]/);

  // Fallback custom addition function
  assert.match(html, /function addCustomCreateTripCountry\(/);
  assert.match(html, /window\.addCustomCreateTripCountry\s*=/);
});

test('footer nav gap spacing, multi-country hub allocation & trip draft studio supported (v1.7.4)', () => {
  // 1. Sulsul diary style editorial footer gap spacing
  assert.match(html, /#hub-sulsul-footer nav\s*\{[^}]*gap:\s*8px 18px !important;/);

  // 2. Macro hub allocation engine
  assert.match(html, /function allocateTripHubs\(/);

  // 3. Trip draft studio
  assert.match(html, /function openTripDraftStudio\(/);
  assert.match(html, /function renderDraftStudioHubSteppers\(/);
  assert.match(html, /function saveDraftStudioSettingsOnly\(/);
  assert.match(html, /function executeDraftStudioGeneration\(/);
});

test('unified sulsul-chip design system & high contrast WCAG AAA compliance supported (v1.7.5)', () => {
  // 1. Unified .sulsul-chip CSS in index.html and companion.css
  assert.match(html, /\.sulsul-chip\s*\{/);
  assert.match(companionCss, /\.sulsul-chip\s*\{/);

  // 2. Wildcard selector properly scoped to prevent dark/hover hijacking in light mode
  assert.match(html, /\[class\*="bg-amber-"\]:not\(\[class\*="dark:"\]\):not\(\[class\*="hover:"\]\)/);

  // 3. Region filter tabs use sulsul-chip
  assert.match(html, /id=["']tab-reg-east_asia["']\s+class=["']sulsul-chip/);
  assert.match(html, /function setCreateTripRegionFilter\(/);

  // 4. Country chips, city chips, and concept chips adopt sulsul-chip & is-active
  assert.match(html, /class=["']sulsul-chip \$\{activeClass\}["']/);
  assert.match(html, /class=["']sulsul-chip \$\{chipClass\}["']/);
  assert.match(html, /sulsul-chip-badge/);
});

test('release version is synchronized', () => {
  const app = html.match(/const APP_VER\s*=\s*'([^']+)'/)?.[1];
  const worker = sw.match(/const V\s*=\s*'st-shell-v([^']+)'/)?.[1];
  const release = changelog.match(/## \[v([^\]]+)\]/)?.[1];
  const chronicleRelease = chronicle.match(/^### \[실록 \d+호\].*\(v([^\)]+)\)$/m)?.[1];
  assert.equal(app, '1.7.5');
  assert.equal(worker, app);
  assert.equal(release, app);
  assert.equal(chronicleRelease, app);
});
