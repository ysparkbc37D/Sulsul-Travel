import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const {lint, isSafe, scan} = require('../tools/lint-boundaries.cjs');

// 규칙 위반을 일부러 넣은 작은 저장소를 만든다.
function fixture({html = '', presentation = '', domain = ''} = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'sulsul-lint-'));
  mkdirSync(path.join(dir, 'js', 'presentation'), {recursive: true});
  mkdirSync(path.join(dir, 'js', 'domain'), {recursive: true});
  writeFileSync(path.join(dir, 'index.html'), `<!doctype html><p>localStorage: st_trips_v2</p><script src="js/x.js"></script><script>${html}</script>`);
  writeFileSync(path.join(dir, 'js', 'presentation', 'feature.js'), presentation);
  writeFileSync(path.join(dir, 'js', 'domain', 'model.js'), domain);
  return dir;
}
const empty = {writes: {}, globals: {}, html: {}};
const rules = result => result.violations.map(item => item.rule);

test('the real repository passes its own boundary lint', () => {
  const result = lint();
  assert.deepEqual(result.violations, [], result.violations.map(v => v.message).join('\n'));
  assert.equal(Object.keys(result.writes).some(key => /#saveTrips$/.test(key) && !/#initApp#|renderCompanionPlan/.test(key)), false, '셸 기능 함수에 saveTrips 직접 호출이 남지 않는다');
});

test('a new direct trip write in the shell or a presentation file fails', () => {
  const dir = fixture({
    html: 'function renameTrip(){ getActiveTrip().title="x"; saveTrips(); }\nfunction saveTrips(){ return true; }',
    presentation: "function wipe(){ localStorage.setItem('st_trips_v2','[]'); TripRepository.saveAll([]); }",
    domain: "function domainWrite(){ TripRepository.saveAll([]); }"
  });
  try {
    const result = lint({rootDir: dir, allowlist: empty});
    const messages = result.violations.filter(v => v.rule === 'WRITE01').map(v => v.message).join('\n');
    assert.match(messages, /index\.html#renameTrip#saveTrips/);
    assert.match(messages, /js\/presentation\/feature\.js#wipe#st_trips_v2/);
    assert.match(messages, /js\/presentation\/feature\.js#wipe#TripRepository\.write/);
    assert.doesNotMatch(messages, /index\.html#saveTrips#saveTrips/, '정의 자체는 호출이 아니다');
    assert.doesNotMatch(messages, /domain/, '저장소 계층(domain·infrastructure)은 규칙 밖이다');
    assert.doesNotMatch(messages, /최상위/, 'HTML 본문의 저장 키 설명은 코드가 아니다');
  } finally { rmSync(dir, {recursive: true, force: true}); }
});

test('allow-listed writes pass only with the exact count and a reason', () => {
  const dir = fixture({html: 'async function boot(){ await saveTrips({bump:false}); }'});
  try {
    const key = 'index.html#boot#saveTrips';
    assert.deepEqual(rules(lint({rootDir: dir, allowlist: {...empty, writes: {[key]: {count: 1, reason: '부팅 정규화'}}}})), []);
    assert.deepEqual(rules(lint({rootDir: dir, allowlist: {...empty, writes: {[key]: {count: 2, reason: '부팅 정규화'}}}})), ['WRITE01'], '줄어든 허용 수는 목록도 줄인다');
    assert.deepEqual(rules(lint({rootDir: dir, allowlist: {...empty, writes: {[key]: {count: 1}}}})), ['WRITE01'], '사유 없는 허용은 실패한다');
  } finally { rmSync(dir, {recursive: true, force: true}); }
});

test('저장 명령과 저장 함수는 끝날 때까지 기다리고, Promise를 조건에 쓰지 않는다 (ASYNC01)', () => {
  const dir = fixture({
    html: [
      "async function saveTitle(){ return await commitTrip('a', trip => { trip.title = 'x'; }); }",
      "function forgetCommand(){ commitTrip('a', trip => {}); renderHub(); }",
      "function conditionOnPromise(){ if(!saveTitle()) return; renderHub(); }",
      "function forgetSaving(){ saveTitle(); renderHub(); }",
      "function wrapper(){ return saveTitle(); }",
      "function assignWrapper(){ const ok = wrapper(); return ok; }",
      "async function fine(){ if(!await saveTitle()) return false; setTimeout(() => saveTitle(), 0); return `<button onclick=\"saveTitle()\">저장</button>`; }",
      "async function fetchOnly(){ return 1; } function loader(){ fetchOnly(); }",
      "function renderLater(){ void saveTitle(); }"
    ].join('\n')
  });
  try {
    const result = lint({rootDir: dir, allowlist: empty}), async = result.violations.filter(v => v.rule === 'ASYNC01').map(v => v.message).join('\n');
    assert.match(async, /#forgetCommand#commitTrip/, '저장 명령을 기다리지 않음');
    assert.match(async, /#conditionOnPromise#saveTitle/, 'Promise를 조건에 씀');
    assert.match(async, /#forgetSaving#saveTitle/, '저장 명령을 부르는 async 함수도 저장 함수다');
    assert.match(async, /#assignWrapper#wrapper/, 'async 결과를 return하는 동기 함수도 Promise를 돌려준다');
    assert.match(async, /#renderLater#saveTitle/, '결과를 버리는 void도 허용 목록에 있어야 한다');
    assert.doesNotMatch(async, /#fine#/, 'await·화살표 반환·HTML 문자열 안의 이름은 위반이 아니다');
    assert.doesNotMatch(async, /#loader#/, '저장하지 않는 async 함수는 기다리지 않아도 된다');
    const allowed = lint({rootDir: dir, allowlist: {...empty, async: {'index.html#renderLater#saveTitle': {count: 1, reason: '렌더 중 보정'}}}});
    assert.doesNotMatch(allowed.violations.map(v => v.message).join('\n'), /renderLater/);
  } finally { rmSync(dir, {recursive: true, force: true}); }
});

test('new window.__ state fails and unused allow-list names are reported', () => {
  const dir = fixture({presentation: 'window.__draftCache = {}; function f(){ return window.__draftCache; }'});
  try {
    assert.match(lint({rootDir: dir, allowlist: empty}).violations[0].message, /window\.__draftCache/);
    assert.deepEqual(rules(lint({rootDir: dir, allowlist: {...empty, globals: {__draftCache: '테스트'}}})), []);
    assert.deepEqual(rules(lint({rootDir: dir, allowlist: {...empty, globals: {__draftCache: '테스트', __gone: '지운 값'}}})), ['GLOBAL01']);
  } finally { rmSync(dir, {recursive: true, force: true}); }
});

test('unescaped data in an HTML template fails above the baseline; escaped or derived values do not count', () => {
  const presentation = [
    'function card(trip){ return `<article><h3>${trip.title}</h3>`; }',
    'function safe(trip,index,list){ return `<p data-i="${index}">${escapeHtml(trip.title)} ${trip.done ? \'완료\' : \'\'} ${list.map(item => `<b>${escapeHtml(item)}</b>`).join(\'\')} ${list.length}</p>`; }',
    'function text(trip){ return `여행 ${trip.title}`; } // HTML이 아닌 템플릿'
  ].join('\n');
  const dir = fixture({presentation});
  try {
    const result = lint({rootDir: dir, allowlist: empty});
    assert.equal(result.html['js/presentation/feature.js'], 1);
    assert.match(result.violations.find(v => v.rule === 'HTML01').places[0], /trip\.title/);
    assert.deepEqual(rules(lint({rootDir: dir, allowlist: {...empty, html: {'js/presentation/feature.js': 1}}})), []);
    assert.deepEqual(rules(lint({rootDir: dir, allowlist: {...empty, html: {'js/presentation/feature.js': 3}}})), ['HTML01'], '줄었으면 기준값을 낮춘다');
  } finally { rmSync(dir, {recursive: true, force: true}); }
});

test('the scanner ignores comments, strings and regex literals when finding calls and templates', () => {
  const {code, templates} = scan("const a = '`not a template`'; // saveTrips()\nconst r = /`/g; const t = `<i>${x}</i>`;");
  assert.doesNotMatch(code, /saveTrips/);
  assert.equal(templates.length, 1);
  assert.equal(templates[0].exprs[0].text, 'x');
  for (const expr of ['escapeHtml(x)', "ok ? 'a' : 'b'", 'items.length', 'dayIndex + 1', "rows.map(row => `<td>${escapeHtml(row)}</td>`).join('')", 'Number(x).toLocaleString()', 'badgeHtml']) assert.equal(isSafe(expr), true, expr);
  for (const expr of ['trip.title', "ok ? trip.title : ''", 'formatName(trip)', 'a + b']) assert.equal(isSafe(expr), false, expr);
});

// ---- UI01·UI02 (v2.0.9, 4단계) ----
const uiActionsSource = new URL('../js/presentation/ui-actions.js', import.meta.url);
function uiFixture(files) {
  const dir = fixture({});
  mkdirSync(path.join(dir, 'js', 'presentation'), {recursive: true});
  copyFileSync(uiActionsSource, path.join(dir, 'js', 'presentation', 'ui-actions.js'));
  for (const [file, text] of Object.entries(files)) { mkdirSync(path.dirname(path.join(dir, file)), {recursive: true}); writeFileSync(path.join(dir, file), text); }
  return dir;
}
const uiRules = result => result.violations.filter(v => /^UI0/.test(v.rule));

test('인라인 이벤트 처리기 수는 파일별 기준값을 넘지 않고, 줄면 기준값을 낮춘다 (UI01)', () => {
  const dir = uiFixture({'js/presentation/feature.js': "function card(){ return `<button onclick=\"go(1)\">a</button><input onchange='go(2)'><button data-on-click=\"x.y\">`; }\nfunction go(){}\n// onclick=\"go()\" 주석은 세지 않는다"});
  try {
    const none = lint({rootDir: dir, allowlist: empty});
    assert.equal(none.handlers['js/presentation/feature.js'], 2, 'data-on-click·주석은 세지 않는다');
    assert.match(none.violations.find(v => v.rule === 'UI01').message, /feature\.js: 인라인 이벤트 처리기 2곳\(기준 0\)/);
    assert.deepEqual(rules(lint({rootDir: dir, allowlist: {...empty, inlineHandlers: {'js/presentation/feature.js': 2}}})).filter(r => r === 'UI01'), []);
    assert.match(lint({rootDir: dir, allowlist: {...empty, inlineHandlers: {'js/presentation/feature.js': 5}}}).violations.find(v => v.rule === 'UI01').message, /5곳에서 2곳으로 줄었다/);
  } finally { rmSync(dir, {recursive: true, force: true}); }
});

test('없는 함수를 부르는 인라인 처리기와 없는 창을 여는 버튼은 실패한다 (UI02)', () => {
  const dir = uiFixture({'js/presentation/feature.js': [
    "function card(){ return `<button onclick=\"renamedLongAgo(1)\">a</button><button onclick=\"show('모의 GPS (가상)')\">b</button><button onclick=\"event.stopPropagation(); show(1)\">c</button>`; }",
    "function show(){ openModal('modal-real'); }",
    "function ghost(){ openModal('modal-ghost'); }",
    "function made(){ const id='modal-made'; ensure(id); openModal('modal-made'); }"
  ].join('\n')});
  writeFileSync(path.join(dir, 'index.html'), '<!doctype html><div id="modal-real"></div><script></script>');
  try {
    const result = lint({rootDir: dir, allowlist: {...empty, inlineHandlers: {'js/presentation/feature.js': 3}}});
    const places = uiRules(result).flatMap(v => v.places).join('\n');
    assert.match(places, /renamedLongAgo\(\)/);
    assert.doesNotMatch(places, /GPS|show\(\)|stopPropagation/, '문자열 안 글자·정의된 함수·브라우저 기본 이름은 통과');
    assert.match(places, /openModal\('modal-ghost'\)/);
    assert.doesNotMatch(places, /modal-real|modal-made/, '마크업 id나 코드에서 만드는 창은 통과');
  } finally { rmSync(dir, {recursive: true, force: true}); }
});

test('data-on-* 이름은 실제로 등록된 이름이어야 하고 문자열 그대로 적는다 (UI02)', () => {
  const dir = uiFixture({
    'js/presentation/demo-tab.js': "(function(root){ root.SulsulTravel.UiActions.define('demo', { go(){}, save: () => {} }); })(window);",
    'js/presentation/feature.js': "function card(kind){ return `<button data-on-click=\"demo.go\"></button><input data-on-change=\"demo.save\"><button data-on-click=\"demo.missing\"></button><button data-on-click=\"demo.${kind}\"></button>`; }"
  });
  try {
    const result = lint({rootDir: dir, allowlist: empty});
    assert.deepEqual(result.actions.sort(), ['demo.go', 'demo.save']);
    const messages = uiRules(result).map(v => `${v.message}\n${v.places.join('\n')}`).join('\n');
    assert.match(messages, /등록되지 않은 화면 동작 이름[\s\S]*demo\.missing/);
    assert.match(messages, /문자열 그대로[\s\S]*demo\.\$\{kind\}/);
    assert.doesNotMatch(messages, /demo\.go|demo\.save/);
  } finally { rmSync(dir, {recursive: true, force: true}); }
});

test('화면 동작을 등록하는 파일이 불러올 때 문서를 건드리거나 index.html에서 등록하면 실패한다 (UI02)', () => {
  const dir = uiFixture({'js/presentation/bad-tab.js': "document.getElementById('x'); SulsulTravel.UiActions.define('bad', { go(){} });"});
  writeFileSync(path.join(dir, 'index.html'), "<!doctype html><script>SulsulTravel.UiActions.define('shell', { go(){} });</script>");
  try {
    const messages = uiRules(lint({rootDir: dir, allowlist: empty})).map(v => `${v.message} ${v.places.join(' ')}`).join('\n');
    assert.match(messages, /bad-tab\.js: 불러올 때 오류/);
    assert.match(messages, /index\.html 안에서 화면 동작을 등록했다/);
  } finally { rmSync(dir, {recursive: true, force: true}); }
});

test('실제 저장소의 화면 동작 등록 목록과 위임 모듈', () => {
  const result = lint();
  assert.deepEqual(result.actions.filter(name => name.startsWith('checklist.')).sort(), ['checklist.add', 'checklist.category', 'checklist.checkAll', 'checklist.close', 'checklist.details', 'checklist.onlyUnchecked', 'checklist.remove', 'checklist.saveNew', 'checklist.toggle', 'checklist.viewMode']);
  assert.ok(['shell.closeModal', 'expenses.view', 'expenses.removeExchange', 'expenses.quickCalcInput', 'exchange.submit', 'exchange.mep', 'exchange.saveRate', 'exchange.refreshRates'].every(name => result.actions.includes(name)), '가계부·환전·셸 동작 등록');
  assert.deepEqual(result.actions.filter(name => name.startsWith('journal.')).sort(), ['journal.aiPolish', 'journal.closePhoto', 'journal.day', 'journal.downloadPhotos', 'journal.downloadText', 'journal.magazine', 'journal.openExpenses', 'journal.photoUpload', 'journal.rememberDraft', 'journal.removePhoto', 'journal.retryPhotos', 'journal.saveText', 'journal.storyPdf', 'journal.viewPhoto']);
  const source = readFileSync(uiActionsSource, 'utf8');
  assert.doesNotMatch(source.replace(/\/\*[\s\S]*?\*\//g, ''), /\[data-action\]|'data-action'/, '오늘 화면의 data-action 표식과 섞지 않는다');
});
