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
});

test('legacy destructive AI paths and mock OCR are absent', () => {
  assert.doesNotMatch(html, /trip\.days\s*=\s*parsedDays/);
  assert.doesNotMatch(html, /mockReceiptOcr/);
  assert.match(html, /TripRepository\.applyDraft/);
});

test('release version is synchronized', () => {
  const app = html.match(/const APP_VER\s*=\s*'([^']+)'/)?.[1];
  const worker = sw.match(/const V\s*=\s*'st-shell-v([^']+)'/)?.[1];
  const release = changelog.match(/## \[v([^\]]+)\]/)?.[1];
  assert.equal(app, '1.2.4');
  assert.equal(worker, app);
  assert.equal(release, app);
});
