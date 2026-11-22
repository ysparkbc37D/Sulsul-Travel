import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtempSync, writeFileSync, rmSync, mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const {checkRelease} = require('../tools/check-release.cjs');

const gitAvailable = (() => { try { execFileSync('git', ['--version'], {stdio: 'ignore'}); return true; } catch { return false; } })();
const git = (dir, ...args) => execFileSync('git', ['-C', dir, '-c', 'user.name=release-test', '-c', 'user.email=release-test@example.invalid', '-c', 'core.autocrlf=false', '-c', 'commit.gpgsign=false', '-c', 'tag.gpgsign=false', ...args], {stdio: 'pipe'});

function release(dir, version, {app = 'one', style = 'a{}'} = {}) {
  writeFileSync(path.join(dir, 'index.html'), `<script>const APP_VER = '${version}';</script><script src="js/app.js?v=${version}"></script><link href="css/app.css?v=${version}">`);
  writeFileSync(path.join(dir, 'sw.js'), `const V = 'st-shell-v${version}';\nconst PRECACHE_ASSETS = ['./', './js/app.js?v=${version}', './css/app.css?v=${version}'];\n`);
  writeFileSync(path.join(dir, 'js', 'app.js'), `console.log('${app}');\n`);
  writeFileSync(path.join(dir, 'css', 'app.css'), `${style}\n`);
}
function repository() {
  const dir = mkdtempSync(path.join(tmpdir(), 'sulsul-release-'));
  mkdirSync(path.join(dir, 'js')); mkdirSync(path.join(dir, 'css'));
  git(dir, 'init', '-q');
  release(dir, '1.0.0');
  git(dir, 'add', '.'); git(dir, 'commit', '-q', '-m', 'v1.0.0'); git(dir, 'tag', '-a', 'v1.0.0', '-m', 'v1.0.0');
  return dir;
}

test('without a release tag the check is skipped and says so', {skip: !gitAvailable && 'git 없음'}, () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'sulsul-release-'));
  try {
    mkdirSync(path.join(dir, 'js')); mkdirSync(path.join(dir, 'css')); git(dir, 'init', '-q'); release(dir, '1.0.0');
    const result = checkRelease({rootDir: dir});
    assert.equal(result.skipped, true);
    assert.match(result.reason, /태그/);
  } finally { rmSync(dir, {recursive: true, force: true}); }
});

test('an unchanged tree and a line-ending-only change pass', {skip: !gitAvailable && 'git 없음'}, () => {
  const dir = repository();
  try {
    assert.deepEqual(checkRelease({rootDir: dir}).problems, []);
    writeFileSync(path.join(dir, 'js', 'app.js'), "console.log('one');\r\n");
    assert.deepEqual(checkRelease({rootDir: dir}).changed, [], 'CRLF 체크아웃은 내용 변경이 아니다');
  } finally { rmSync(dir, {recursive: true, force: true}); }
});

test('changing a deployed asset without moving the versions fails (같은 버전, 다른 내용)', {skip: !gitAvailable && 'git 없음'}, () => {
  const dir = repository();
  try {
    writeFileSync(path.join(dir, 'js', 'app.js'), "console.log('two');\n");
    const result = checkRelease({rootDir: dir});
    assert.deepEqual(result.changed, ['js/app.js']);
    assert.equal(result.problems.length, 3);
    assert.match(result.problems.join('\n'), /APP_VER 1\.0\.0/);
    assert.match(result.problems.join('\n'), /st-shell-v1\.0\.0/);
    assert.match(result.problems.join('\n'), /js\/app\.js: 내용이 바뀌었는데 \?v=1\.0\.0/);
  } finally { rmSync(dir, {recursive: true, force: true}); }
});

test('a full version bump passes, a partial one names what is missing', {skip: !gitAvailable && 'git 없음'}, () => {
  const dir = repository();
  try {
    release(dir, '1.0.1', {app: 'two'});
    assert.deepEqual(checkRelease({rootDir: dir}).problems, []);
    release(dir, '1.0.1', {app: 'two'});
    writeFileSync(path.join(dir, 'sw.js'), "const V = 'st-shell-v1.0.0';\nconst PRECACHE_ASSETS = ['./', './js/app.js?v=1.0.1', './css/app.css?v=1.0.1'];\n");
    assert.deepEqual(checkRelease({rootDir: dir}).problems.length, 1);
    assert.match(checkRelease({rootDir: dir}).problems[0], /sw\.js 캐시 버전/);
    release(dir, '0.9.9', {app: 'two'});
    assert.match(checkRelease({rootDir: dir}).problems[0], /APP_VER 0\.9\.9/, '버전은 태그보다 커야 한다');
  } finally { rmSync(dir, {recursive: true, force: true}); }
});
