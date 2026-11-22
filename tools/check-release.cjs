/* 릴리스 버전 검사. 마지막 릴리스 태그(vX.Y.Z)와 비교해 배포 자산의 내용이 바뀌었으면
 * APP_VER·서비스워커 캐시 버전·바뀐 자산의 ?v=가 모두 올라갔는지 본다.
 * v2.0.1 이후 자산만 바꾸고 버전을 그대로 둬 설치 기기에 복구 화면이 뜬 일(실록 107호)을 막는다.
 * 개행은 LF로 맞춰 비교한다. 태그가 없으면 검사를 건너뛰고 그렇게 알린다. */
'use strict';
const fs = require('node:fs'), path = require('node:path'), { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const TEXT = /\.(?:html|js|mjs|cjs|css|json|webmanifest|svg|txt|md)$/i;

function git(rootDir, args, options = {}) {
  return execFileSync('git', ['-C', rootDir, ...args], { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 28, ...options });
}
function latestTag(rootDir) {
  try { return git(rootDir, ['describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*']).toString().trim() || null; }
  catch (_) { return null; }
}
const normalize = (file, buffer) => TEXT.test(file) ? Buffer.from(buffer.toString('utf8').replace(/\r\n/g, '\n')) : buffer;
const appVersion = html => (html.match(/const APP_VER\s*=\s*'([^']+)'/) || [])[1] || null;
const shellVersion = sw => (sw.match(/const V\s*=\s*'([^']+)'/) || [])[1] || null;
function assetVersions(html) {
  const map = {}, re = /\b(?:src|href)="([^"?#]+)\?v=([^"#&]+)/g; let m;
  while ((m = re.exec(html))) map[m[1].replace(/^\.\//, '')] = m[2];
  return map;
}
function precacheList(sw) {
  const list = sw.match(/const PRECACHE_ASSETS\s*=\s*\[([\s\S]*?)\];/);
  return list ? [...list[1].matchAll(/'\.\/([^']*)'/g)].map(m => m[1].split('?')[0] || 'index.html') : [];
}
const compare = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); return 0; };

function checkRelease({ rootDir = root, tag = latestTag(rootDir) } = {}) {
  if (!tag) return { skipped: true, reason: '릴리스 태그(vX.Y.Z)가 없어 비교하지 않았다', problems: [] };
  const read = file => fs.readFileSync(path.join(rootDir, file));
  const atTag = file => { try { return git(rootDir, ['show', `${tag}:${file}`]); } catch (_) { return null; } };
  const html = read('index.html').toString('utf8'), sw = read('sw.js').toString('utf8');
  const oldHtml = (atTag('index.html') || Buffer.from('')).toString('utf8'), oldSw = (atTag('sw.js') || Buffer.from('')).toString('utf8');
  const files = [...new Set(['index.html', 'sw.js', ...precacheList(sw)])].filter(file => fs.existsSync(path.join(rootDir, file)));
  const changed = files.filter(file => { const before = atTag(file); return !before || !normalize(file, before).equals(normalize(file, read(file))); });
  const problems = [], version = appVersion(html), tagVersion = tag.replace(/^v/, '');
  if (changed.length) {
    if (!version || compare(version, tagVersion) <= 0) problems.push(`APP_VER ${version} — 태그 ${tag} 이후 배포 파일이 바뀌었으니 버전을 올린다`);
    if (shellVersion(sw) === shellVersion(oldSw)) problems.push(`sw.js 캐시 버전 ${shellVersion(sw)}이 ${tag}와 같다. 설치된 기기가 새 파일을 받지 못한다`);
    const now = assetVersions(html), before = assetVersions(oldHtml);
    for (const file of changed) if (now[file] && before[file] && now[file] === before[file]) problems.push(`${file}: 내용이 바뀌었는데 ?v=${now[file]}가 ${tag}와 같다`);
  }
  return { skipped: false, tag, version, changed, problems };
}

module.exports = { checkRelease, latestTag };
if (require.main === module) {
  const result = checkRelease();
  if (result.skipped) { console.log(`릴리스 검사 건너뜀: ${result.reason}`); process.exit(0); }
  if (!result.problems.length) { console.log(`릴리스 검사 통과: ${result.tag} 대비 바뀐 배포 파일 ${result.changed.length}개, 현재 v${result.version}`); process.exit(0); }
  result.problems.forEach(problem => console.error(`[RELEASE01] ${problem}`));
  process.exit(1);
}
