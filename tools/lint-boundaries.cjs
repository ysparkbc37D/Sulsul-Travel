/* 저장·전역 상태·HTML 삽입 경계 검사. 빌드 없이 Node 기본 모듈만 쓴다.
 * WRITE01  셸(index.html)과 presentation 파일은 여행 문서(st_trips_v2)에 직접 쓰지 않는다.
 *          saveTrips(·TripRepository.saveAll/savePrepared/write(·'st_trips_v2' 문자열은 허용 목록의 함수에만 남는다.
 * GLOBAL01 window.__ 전역 상태는 허용 목록의 이름만 쓴다.
 * ASYNC01  저장 명령(commitTrip* 등)은 await·return으로 끝을 기다리고, 셸·presentation의 async 함수 결과를 조건·대입에 바로 쓰지 않는다.
 * HTML01   HTML 템플릿에 escape하지 않은 값을 넣는 곳의 수가 파일별 기준값을 넘지 않는다(줄어들면 기준값도 낮춘다).
 * UI01     인라인 이벤트 처리기(onclick="…" 등)의 수가 파일별 기준값을 넘지 않는다(줄어들면 기준값도 낮춘다).
 *          새 화면은 data-on-click·data-on-change·data-on-input과 SulsulTravel.UiActions.define을 쓴다(4단계).
 * UI02     눌러도 아무 일이 없는 버튼을 막는다. 인라인 처리기가 부르는 함수가 어디에도 없거나, data-on-* 이름이
 *          등록되지 않았거나(이름은 문자열 그대로 적는다), openModal('id')의 창이 어디에도 없으면 실패한다.
 *          (v1.1.7·v1.8.4부터 준비물 보기 전환·예약 가이드 체크·준비물 추가가 이렇게 죽어 있었다.)
 * 허용 목록: tools/boundary-allowlist.json. 수치는 손으로 고치고 사유를 남긴다. */
'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');

// ---- 소스 스캐너: 주석을 지우고 템플릿 리터럴과 ${} 식을 찾는다 ----
const REGEX_PREV = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^', '']);
function scan(code) {
  const templates = [], out = code.split(''), braces = new Map(), open = [], stringRanges = [];
  let i = 0;
  const blank = (from, to) => { for (let k = from; k < to; k++) if (out[k] !== '\n' && out[k] !== '\r') out[k] = ' '; };
  function prevSignificant(pos) {
    let k = pos - 1;
    while (k >= 0 && /\s/.test(code[k])) k--;
    if (k < 0) return '';
    if (/[\w$]/.test(code[k])) {
      let s = k; while (s >= 0 && /[\w$]/.test(code[s])) s--;
      const word = code.slice(s + 1, k + 1);
      return /^(return|typeof|case|in|of|delete|void|throw|new|else|do|yield|await)$/.test(word) ? '' : 'w';
    }
    return code[k];
  }
  function skipString(q) { const s = i; i++; while (i < code.length && code[i] !== q) { if (code[i] === '\\') i++; else if (code[i] === '\n') break; i++; } i++; stringRanges.push([s + 1, i - 1]); }
  function skipRegex() {
    i++; let inClass = false;
    while (i < code.length) {
      const c = code[i];
      if (c === '\\') { i += 2; continue; }
      if (c === '\n') return;
      if (inClass) { if (c === ']') inClass = false; }
      else if (c === '[') inClass = true;
      else if (c === '/') { i++; while (/[a-z]/.test(code[i] || '')) i++; return; }
      i++;
    }
  }
  // 템플릿 하나를 읽는다. i는 여는 ` 위치다.
  function readTemplate() {
    const start = i, quasis = [], exprs = []; let text = ''; i++;
    let segment = i;
    while (i < code.length && code[i] !== '`') {
      if (code[i] === '\\') { text += code[i] + (code[i + 1] || ''); i += 2; continue; }
      if (code[i] === '$' && code[i + 1] === '{') {
        stringRanges.push([segment, i]);
        quasis.push(text); text = ''; i += 2;
        const exprStart = i; readCode('}');
        exprs.push({ text: code.slice(exprStart, i), start: exprStart });
        i++; segment = i; continue;
      }
      text += code[i]; i++;
    }
    stringRanges.push([segment, i]);
    quasis.push(text); i++;
    templates.push({ start, end: i, quasis, exprs });
  }
  // 닫는 문자(stop)를 깊이 0에서 만날 때까지 코드를 읽는다.
  function readCode(stop) {
    let depth = 0;
    while (i < code.length) {
      const c = code[i], n = code[i + 1];
      if (stop && depth === 0 && c === stop) return;
      if (c === '/' && n === '/') { const s = i; while (i < code.length && code[i] !== '\n') i++; blank(s, i); continue; }
      if (c === '/' && n === '*') { const s = i; const e = code.indexOf('*/', i + 2); i = e < 0 ? code.length : e + 2; blank(s, i); continue; }
      if (c === '\'' || c === '"') { skipString(c); continue; }
      if (c === '`') { readTemplate(); continue; }
      if (c === '/' && REGEX_PREV.has(prevSignificant(i))) { skipRegex(); continue; }
      if (c === '{' || c === '(' || c === '[') { depth++; if (c === '{') open.push(i); }
      else if (c === '}' || c === ')' || c === ']') { depth--; if (c === '}' && open.length) braces.set(open.pop(), i); }
      i++;
    }
  }
  readCode(null);
  // bare: 문자열·템플릿 글자까지 지운 코드(${} 식은 남긴다). HTML 속성 안의 onclick="…" 같은 글자를 호출로 세지 않는다.
  const bareChars = out.slice();
  for (const [from, to] of stringRanges) for (let k = from; k < to; k++) if (bareChars[k] !== '\n' && bareChars[k] !== '\r') bareChars[k] = ' ';
  const result = { code: out.join(''), bare: bareChars.join(''), templates, braces };
  result.functions = functionRanges(result);
  return result;
}
// function 선언·식의 본문 범위. 호출이 속한 가장 안쪽 이름 있는 함수를 찾는 데 쓴다.
function functionRanges({ code, braces }) {
  const list = [], re = /\bfunction\s*\*?\s*([\w$]+)\s*\(/g; let m;
  while ((m = re.exec(code))) {
    let k = m.index + m[0].length, depth = 1;
    while (k < code.length && depth) { if (code[k] === '(') depth++; else if (code[k] === ')') depth--; k++; }
    while (/\s/.test(code[k] || '')) k++;
    if (code[k] === '{' && braces.has(k)) list.push({ name: m[1], start: m.index, end: braces.get(k) }); // 매개변수 기본값도 그 함수에 속한다
  }
  return list;
}

// index.html은 src 없는 <script> 본문만 코드로 본다. 위치는 원문 기준으로 유지한다.
function codeRegions(file, text) {
  if (!file.endsWith('.html')) return [{ offset: 0, text }];
  const regions = [], re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g; let m;
  while ((m = re.exec(text))) regions.push({ offset: m.index + m[0].indexOf('>') + 1, text: m[1] });
  return regions;
}
const lineOf = (text, offset) => text.slice(0, offset).split('\n').length;
function enclosingFunction(functions, offset) {
  let best = null;
  for (const f of functions) if (f.start < offset && offset < f.end && (!best || f.start > best.start)) best = f;
  return best ? best.name : '(최상위)';
}

// ---- HTML01: escape하지 않은 삽입 판별 ----
function stripParens(s) {
  s = s.trim();
  while (s.startsWith('(') && closing(s, 0) === s.length - 1) s = s.slice(1, -1).trim();
  return s;
}
function closing(s, open) {
  const pairs = { '(': ')', '[': ']', '{': '}' }; const want = []; let q = null;
  for (let k = open; k < s.length; k++) {
    const c = s[k];
    if (q) { if (c === '\\') k++; else if (c === q) q = null; continue; }
    if (c === '\'' || c === '"' || c === '`') { q = c; continue; }
    if (pairs[c]) want.push(pairs[c]);
    else if (c === ')' || c === ']' || c === '}') { want.pop(); if (!want.length) return k; }
  }
  return -1;
}
// 최상위(괄호·문자열 밖)에서 연산자 위치를 찾는다.
function topLevel(s, test) {
  let depth = 0, q = null;
  for (let k = 0; k < s.length; k++) {
    const c = s[k];
    if (q) { if (c === '\\') k++; else if (c === q) q = null; continue; }
    if (c === '\'' || c === '"' || c === '`') { q = c; continue; }
    if ('([{'.includes(c)) depth++; else if (')]}'.includes(c)) depth--;
    else if (depth === 0) { const hit = test(s, k); if (hit) return hit; }
  }
  return null;
}
const SAFE_CALL = /^(?:escapeHtml|escapeAttr|escapeHtmlAttr|encodeURIComponent|Number|parseInt|parseFloat|Math\.\w+|String\(Number)\s*\(/;
const SAFE_NAME = /^(?:i|j|k|n|idx|index|\w*(?:Index|Idx|Count|Num|Pct|Percent|Html|HTML|Markup|Svg))$/;
function isSafe(expr) {
  const s = stripParens(expr);
  if (!s) return true;
  // 조건 ? a : b → 넣는 값 a·b만 본다.
  const q = topLevel(s, (t, k) => t[k] === '?' && t[k + 1] !== '?' && t[k + 1] !== '.' && t[k - 1] !== '?' ? { k } : null);
  if (q) {
    const rest = s.slice(q.k + 1);
    const c = topLevel(rest, (t, k) => t[k] === ':' ? { k } : null);
    if (c) return isSafe(rest.slice(0, c.k)) && isSafe(rest.slice(c.k + 1));
  }
  for (const op of ['||', '??']) {
    const hit = topLevel(s, (t, k) => t.slice(k, k + 2) === op ? { k } : null);
    if (hit) return isSafe(s.slice(0, hit.k)) && isSafe(s.slice(hit.k + 2));
  }
  const and = topLevel(s, (t, k) => t.slice(k, k + 2) === '&&' ? { k } : null);
  if (and) return isSafe(s.slice(and.k + 2));
  if (/^(['"])(?:\\.|(?!\1).)*\1$/.test(s)) return true;           // 문자열 리터럴
  if (/^`[\s\S]*`$/.test(s) && closingTemplate(s)) return true;      // 안쪽 템플릿은 따로 검사한다
  if (/^-?\d+(\.\d+)?$/.test(s) || /^(true|false|null|undefined)$/.test(s)) return true;
  if (SAFE_NAME.test(s)) return true;
  if (SAFE_CALL.test(s) && closing(s, s.indexOf('(')) === s.length - 1) return true;
  if (/\.(?:length|toFixed\([^()]*\)|toLocaleString\([^()]*\))$/.test(s) && !/[`'"]/.test(s.replace(/toLocaleString\([^()]*\)$/, ''))) return true;
  if (/\.join\((?:''|""|``|'\s*'|"\\n"|'\\n')\)$/.test(s) && s.includes('`')) return true; // map(…템플릿…).join
  if (/\.map\(\s*(?:escapeHtml|\w+Html)\s*\)\.join\([^()]*\)$/.test(s)) return true;
  const arith = s.match(/^([\w$]+)\s*[-+]\s*\d+$/); if (arith && SAFE_NAME.test(arith[1])) return true;
  if (/^[\w$.]*(?:Html|HTML|Markup|Svg)\s*\(/.test(s) && closing(s, s.indexOf('(')) === s.length - 1) return true;
  return false;
}
function closingTemplate(s) { let k = 1; while (k < s.length - 1) { if (s[k] === '\\') { k += 2; continue; } if (s[k] === '`') return false; if (s[k] === '$' && s[k + 1] === '{') { const e = closing(s, k + 1); if (e < 0) return false; k = e + 1; continue; } k++; } return true; }
const looksHtml = quasis => /<\/?[a-zA-Z][\w-]*(?:\s|>|\/>)/.test(quasis.join(''));

// ---- 검사 ----
const WRITE_PATTERNS = [
  { id: 'saveTrips', re: /\bsaveTrips\s*\(/g, skip: /function\s+saveTrips\s*\($/ },
  { id: 'TripRepository.write', re: /\bTripRepository\s*\.\s*(?:saveAll|savePrepared|write)\s*\(/g },
  { id: 'st_trips_v2', re: /['"`]st_trips_v2['"`]/g, raw: true }
];
// ---- ASYNC01: 저장 명령은 끝날 때까지 기다린다 ----
// 저장 명령(STORE_COMMANDS)은 await·return으로 결과를 받아야 한다. 결과를 버리면 저장이 끝나기 전에 화면이 바뀐다.
// 셸·presentation의 다른 async 함수는 결과(Promise)를 조건·대입에 바로 쓰지 않는다(!p, if(p), x=p 는 늘 참·Promise다).
const STORE_COMMANDS = ['commitTripCommand', 'commitTrip', 'commitTripRecord', 'commitTripsCommand', 'saveTrips', 'persistDemoChoice', 'commitLiveSchedule',
  'TripRepository.saveAll', 'TripRepository.commit', 'TripRepository.applyDraft', 'TripRepository.loadAll', 'TripRepository.reload'];
function precedingToken(code, pos) {
  let k = pos - 1;
  while (k >= 0 && /\s/.test(code[k])) k--;
  if (k < 0) return '';
  if (/[\w$]/.test(code[k])) { let s = k; while (s >= 0 && /[\w$]/.test(code[s])) s--; return code.slice(s + 1, k + 1); }
  const two = code.slice(k - 1, k + 1), three = code.slice(k - 2, k + 1);
  if (['===', '!=='].includes(three)) return three;
  if (['=>', '&&', '||', '??', '==', '!=', '<=', '>='].includes(two)) return two;
  return code[k];
}
// 여는 괄호 앞 단어(if·while 등). 괄호가 조건이면 그 안의 Promise는 늘 참이다.
function parenOwner(code, pos) {
  let depth = 0, k = pos - 1;
  for (; k >= 0; k--) { const c = code[k]; if (c === ')' || c === ']' || c === '}') depth++; else if (c === '(' || c === '[' || c === '{') { if (!depth) break; depth--; } }
  if (k < 0 || code[k] !== '(') return '';
  return precedingToken(code, k);
}
function asyncCallIssue(code, index, isCommand) {
  const prev = precedingToken(code, index);
  if (['await', 'return', 'yield'].includes(prev)) return null;
  if (prev === 'void') return isCommand ? '저장 명령의 결과를 버렸다(void). 저장이 끝난 뒤 이어서 하도록 await한다' : null;
  if (['!', '&&', '||', '??', '?', ':', '='].includes(prev)) return 'Promise를 조건·대입에 썼다. await한다';
  if (prev === '(' && ['if', 'while'].includes(parenOwner(code, index))) return 'Promise를 조건에 썼다. await한다';
  if (!isCommand) return null;
  if (prev === '=>') return null; // 화살표 함수가 Promise를 돌려준다
  if (prev === '(' || prev === ',') return null; // 인자로 넘긴다(then·Promise.all 등)
  return '저장 명령의 결과를 기다리지 않았다. await한다';
}
function sourceFiles(rootDir) {
  const list = [];
  const walk = dir => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, entry.name); if (entry.isDirectory()) walk(p); else if (/\.(?:js|mjs)$/.test(entry.name)) list.push(p); } };
  if (fs.existsSync(path.join(rootDir, 'js'))) walk(path.join(rootDir, 'js'));
  const rel = p => path.relative(rootDir, p).split(path.sep).join('/');
  return [path.join(rootDir, 'index.html'), ...list.sort()].filter(fs.existsSync).map(p => ({ file: rel(p), text: fs.readFileSync(p, 'utf8') }));
}
const writeScope = file => file === 'index.html' || file.startsWith('js/presentation/');

// ---- UI01·UI02: 인라인 처리기와 화면 동작 이름 ----
const INLINE_HANDLER = /(?<![\w$.-])on(?:click|dblclick|change|input|keydown|keyup|keypress|submit|blur|focus|focusin|focusout|mouseover|mouseout|mouseenter|mouseleave|pointerdown|pointerup|touchstart|touchend|load|error|scroll|toggle)\s*=\s*\\?(["'])/g;
// 처리기 문자열 안에서 바로 부르는 이름(a.b(의 a, 문자열 안 글자는 빼고). 브라우저 기본 이름은 검사하지 않는다.
const HANDLER_BUILTINS = new Set(['if', 'return', 'typeof', 'void', 'new', 'await', 'async', 'function', 'alert', 'confirm', 'prompt', 'print', 'open', 'close', 'setTimeout', 'clearTimeout', 'requestAnimationFrame', 'scrollTo', 'fetch', 'Number', 'String', 'Boolean', 'parseInt', 'parseFloat', 'isNaN', 'encodeURIComponent', 'decodeURIComponent', 'escape', 'unescape']);
// 주석을 같은 길이의 공백으로 지운 원문(줄 번호 유지). JS 파일은 // · /* */, index.html은 <!-- -->와 인라인 스크립트의 JS 주석.
function withoutComments(file, text) {
  const blankOut = s => s.replace(/[^\r\n]/g, ' ');
  if (!file.endsWith('.html')) return scan(text).code;
  let out = text.replace(/<!--[\s\S]*?-->/g, blankOut);
  for (const region of codeRegions(file, out)) out = out.slice(0, region.offset) + scan(region.text).code + out.slice(region.offset + region.text.length);
  return out;
}
function inlineHandlers(text) {
  const found = []; let m; INLINE_HANDLER.lastIndex = 0;
  while ((m = INLINE_HANDLER.exec(text))) {
    const quote = m[1], start = INLINE_HANDLER.lastIndex;
    let end = start;
    while (end < text.length && text[end] !== quote && text[end] !== '\n') end++;
    found.push({ index: m.index, code: text.slice(start, end).replace(/\\$/, '') });
  }
  return found;
}
function handlerCalls(code) {
  const stripped = code.replace(/\\?'(?:\\.|[^'\\])*\\?'/g, "''").replace(/&quot;(?:(?!&quot;).)*&quot;/g, "''");
  const names = []; let m; const re = /(?:^|[^\w$.])([A-Za-z_$][\w$]*)\s*\(/g;
  while ((m = re.exec(stripped))) if (!HANDLER_BUILTINS.has(m[1])) names.push(m[1]);
  return names;
}
function definedNames(texts) {
  const names = new Set();
  for (const text of texts) {
    for (const m of text.matchAll(/\bfunction\s*\*?\s+([A-Za-z_$][\w$]*)\s*\(/g)) names.add(m[1]);
    for (const m of text.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g)) names.add(m[1]);
    for (const m of text.matchAll(/\b(?:window|globalThis|root)\s*\.\s*([A-Za-z_$][\w$]*)\s*=/g)) names.add(m[1]);
  }
  return names;
}
// 등록 목록은 실제 코드를 Node vm에서 불러 읽는다(정규식으로 등록 표를 해석하지 않는다).
// 등록하는 파일은 불러올 때 문서를 건드리지 않아야 한다. 실패하면 UI02로 알린다.
function registeredActions(files) {
  const context = vm.createContext({ console, setTimeout, clearTimeout });
  context.window = context; context.globalThis = context;
  const core = files.find(f => f.file === 'js/presentation/ui-actions.js');
  const definers = files.filter(f => f.file !== 'index.html' && f !== core && /\bUiActions\s*\.\s*define\s*\(/.test(f.text));
  const errors = [];
  for (const { file, text } of [core, ...definers].filter(Boolean)) {
    try { vm.runInContext(text, context, { filename: file, timeout: 2000 }); }
    catch (error) { errors.push(`${file}: 불러올 때 오류 — ${error.message}`); }
  }
  const api = context.SulsulTravel && context.SulsulTravel.UiActions;
  return { names: new Set(api ? api.names() : []), errors, available: Boolean(api) };
}

function lint({ rootDir = root, allowlist } = {}) {
  allowlist = allowlist || JSON.parse(fs.readFileSync(path.join(rootDir, 'tools', 'boundary-allowlist.json'), 'utf8'));
  const writes = {}, globals = {}, html = {}, htmlSamples = {}, asyncCalls = {}, violations = [];
  const files = sourceFiles(rootDir);
  // 셸·presentation에 선언한 함수를 모은다.
  // promiseNames: async 함수와, async 함수의 결과를 그대로 return하는 동기 함수(사실상 Promise를 돌려준다).
  // savingNames: 저장 명령과, 저장 명령(또는 다른 저장 함수)을 부르는 Promise 함수. 이 함수들은 반드시 기다린다.
  const declared = new Map();
  for (const { file, text } of files) {
    if (!writeScope(file)) continue;
    for (const region of codeRegions(file, text)) {
      const { bare, functions } = scan(region.text);
      for (const f of functions) {
        const isAsync = /\basync\s+$/.test(bare.slice(Math.max(0, f.start - 7), f.start));
        const list = declared.get(f.name) || []; list.push({ isAsync, body: bare.slice(f.start, f.end) }); declared.set(f.name, list);
      }
    }
  }
  const promiseNames = new Set(), savingNames = new Set(STORE_COMMANDS);
  const single = [...declared].filter(([, list]) => list.length === 1).map(([name, [decl]]) => ({ name, ...decl }));
  for (const d of single) if (d.isAsync) promiseNames.add(d.name);
  const calls = (body, names) => [...names].some(name => new RegExp(`(?<![\\w$.])(?:(?:window|root)\\s*\\.\\s*)?${name.replace('.', '\\s*\\.\\s*')}\\s*\\(`).test(body.replace(/^[^{]*\{/, '')));
  for (let changed = true; changed;) {
    changed = false;
    for (const d of single) {
      if (!promiseNames.has(d.name) && [...promiseNames, ...savingNames].some(name => new RegExp(`\\breturn\\s+(?:await\\s+)?(?:(?:window|root)\\.)?${name.replace('.', '\\.')}\\s*\\(`).test(d.body))) { promiseNames.add(d.name); changed = true; }
      if (promiseNames.has(d.name) && !savingNames.has(d.name) && calls(d.body, savingNames)) { savingNames.add(d.name); changed = true; }
    }
  }
  for (const { file, text } of files) {
    for (const region of codeRegions(file, text)) {
      const { code, bare, templates, functions } = scan(region.text);
      const at = offset => `${file}:${lineOf(text, region.offset + offset)}`;
      if (writeScope(file)) {
        const re = /(?<![\w$.])(?:(?:window|root)\s*\.\s*)?(TripRepository\s*\.\s*[\w$]+|[\w$]+)\s*\(/g; let m;
        while ((m = re.exec(bare))) {
          const name = m[1].replace(/\s+/g, '');
          const isCommand = savingNames.has(name);
          if (!isCommand && !promiseNames.has(name)) continue;
          if (/\bfunction\s*\*?\s*$/.test(bare.slice(Math.max(0, m.index - 20), m.index))) continue; // 선언
          const issue = asyncCallIssue(bare, m.index, isCommand);
          if (!issue) continue;
          const key = `${file}#${enclosingFunction(functions, m.index)}#${name}`;
          (asyncCalls[key] = asyncCalls[key] || []).push(`${at(m.index)} ${issue}`);
        }
      }
      if (writeScope(file)) {
        for (const p of WRITE_PATTERNS) {
          const hay = p.raw ? region.text : code; let m; p.re.lastIndex = 0;
          while ((m = p.re.exec(hay))) {
            if (p.raw && code.slice(m.index, m.index + m[0].length).trim() === '') continue; // 주석 안
            if (p.skip && p.skip.test(code.slice(Math.max(0, m.index - 30), m.index + m[0].length))) continue;
            const key = `${file}#${enclosingFunction(functions, m.index)}#${p.id}`;
            (writes[key] = writes[key] || []).push(at(m.index));
          }
        }
      }
      let m; const gre = /\bwindow\s*\.\s*(__[\w$]+)/g;
      while ((m = gre.exec(code))) (globals[m[1]] = globals[m[1]] || []).push(at(m.index));
      if (writeScope(file)) {
        for (const t of templates) {
          if (!looksHtml(t.quasis)) continue;
          for (const e of t.exprs) if (!isSafe(e.text)) {
            html[file] = (html[file] || 0) + 1;
            (htmlSamples[file] = htmlSamples[file] || []).push(`${at(e.start)} \${${e.text.trim().slice(0, 60)}}`);
          }
        }
      }
    }
  }
  const allowedWrites = allowlist.writes || {};
  for (const [key, places] of Object.entries(writes)) {
    const allowed = allowedWrites[key]?.count || 0;
    if (places.length > allowed) violations.push({ rule: 'WRITE01', message: `${key}: 허용 ${allowed}곳, 실제 ${places.length}곳. 여행 수정은 commitTripCommand/commitTripsCommand로 저장한다`, places });
  }
  for (const [key, entry] of Object.entries(allowedWrites)) {
    const actual = writes[key]?.length || 0;
    if (actual < entry.count) violations.push({ rule: 'WRITE01', message: `${key}: 허용 목록 ${entry.count}곳보다 실제 ${actual}곳이 적다. 허용 목록을 줄인다`, places: [] });
    if (!entry.reason) violations.push({ rule: 'WRITE01', message: `${key}: 허용 사유가 없다`, places: [] });
  }
  const allowedGlobals = allowlist.globals || {};
  for (const [name, places] of Object.entries(globals)) if (!allowedGlobals[name]) violations.push({ rule: 'GLOBAL01', message: `window.${name}: 새 전역 상태. 모듈 안 변수나 State에 둔다`, places });
  for (const name of Object.keys(allowedGlobals)) if (!globals[name]) violations.push({ rule: 'GLOBAL01', message: `window.${name}: 더 이상 쓰지 않는다. 허용 목록에서 지운다`, places: [] });
  const allowedAsync = allowlist.async || {};
  for (const [key, places] of Object.entries(asyncCalls)) {
    const allowed = allowedAsync[key]?.count || 0;
    if (places.length > allowed) violations.push({ rule: 'ASYNC01', message: `${key}: 비동기 결과를 기다리지 않는 호출 ${places.length}곳(허용 ${allowed})`, places });
  }
  for (const [key, entry] of Object.entries(allowedAsync)) {
    const actual = asyncCalls[key]?.length || 0;
    if (actual < entry.count) violations.push({ rule: 'ASYNC01', message: `${key}: 허용 목록 ${entry.count}곳보다 실제 ${actual}곳이 적다. 허용 목록을 줄인다`, places: [] });
    if (!entry.reason) violations.push({ rule: 'ASYNC01', message: `${key}: 허용 사유가 없다`, places: [] });
  }
  const baseline = allowlist.html || {};
  for (const file of new Set([...Object.keys(html), ...Object.keys(baseline)])) {
    const actual = html[file] || 0, allowed = baseline[file] || 0;
    if (actual > allowed) violations.push({ rule: 'HTML01', message: `${file}: escape하지 않은 HTML 삽입 ${actual}곳(기준 ${allowed}). 값은 escapeHtml()로 감싼다`, places: htmlSamples[file].slice(-Math.min(10, actual - allowed)) });
    else if (actual < allowed) violations.push({ rule: 'HTML01', message: `${file}: escape하지 않은 HTML 삽입이 ${allowed}곳에서 ${actual}곳으로 줄었다. 기준값을 ${actual}로 낮춘다`, places: [] });
  }

  // UI01: 인라인 처리기 수는 늘지 않는다
  const handlers = {}, deadCalls = [], extraTexts = ['kb-travel.js'].map(f => path.join(rootDir, f)).filter(fs.existsSync).map(p => fs.readFileSync(p, 'utf8'));
  const uiFiles = files.map(({ file, text }) => ({ file, text: withoutComments(file, text) }));
  const defined = definedNames([...uiFiles.map(f => f.text), ...extraTexts]);
  for (const { file, text } of uiFiles) {
    for (const h of inlineHandlers(text)) {
      handlers[file] = (handlers[file] || 0) + 1;
      for (const name of handlerCalls(h.code)) if (!defined.has(name)) deadCalls.push(`${file}:${lineOf(text, h.index)} ${name}() — 이 이름의 함수가 앱 어디에도 없다`);
    }
  }
  const handlerBaseline = allowlist.inlineHandlers || {};
  for (const file of new Set([...Object.keys(handlers), ...Object.keys(handlerBaseline)])) {
    const actual = handlers[file] || 0, allowed = handlerBaseline[file] || 0;
    if (actual > allowed) violations.push({ rule: 'UI01', message: `${file}: 인라인 이벤트 처리기 ${actual}곳(기준 ${allowed}). 새 동작은 data-on-click 등과 SulsulTravel.UiActions.define으로 잇는다`, places: [] });
    else if (actual < allowed) violations.push({ rule: 'UI01', message: `${file}: 인라인 이벤트 처리기가 ${allowed}곳에서 ${actual}곳으로 줄었다. 기준값을 ${actual}로 낮춘다`, places: [] });
  }

  // UI02: 눌러도 아무 일이 없는 버튼
  if (deadCalls.length) violations.push({ rule: 'UI02', message: '인라인 처리기가 없는 함수를 부른다', places: deadCalls });
  const registry = registeredActions(files);
  if (registry.errors.length) violations.push({ rule: 'UI02', message: '화면 동작을 등록하는 파일을 불러오지 못했다', places: registry.errors });
  const unknown = [], dynamic = [];
  for (const { file, text } of uiFiles) {
    for (const m of text.matchAll(/data-on-(?:click|change|input)\s*=\s*\\?["']([^"'\\]*)/g)) {
      const where = `${file}:${lineOf(text, m.index)}`;
      if (/[${}]/.test(m[1])) dynamic.push(`${where} ${m[1]}`);
      else if (!registry.names.has(m[1])) unknown.push(`${where} ${m[1]}`);
    }
    if (file === 'index.html' && /\bUiActions\s*\.\s*define\s*\(/.test(text)) violations.push({ rule: 'UI02', message: 'index.html 안에서 화면 동작을 등록했다. 등록은 js/presentation 파일에서 한다(경계 검사가 불러 읽을 수 있게)', places: [] });
  }
  if (unknown.length) violations.push({ rule: 'UI02', message: `등록되지 않은 화면 동작 이름(등록된 이름 ${registry.names.size}개)`, places: unknown });
  if (dynamic.length) violations.push({ rule: 'UI02', message: '화면 동작 이름은 문자열 그대로 적는다. 바뀌는 값은 다른 data-* 속성에 둔다', places: dynamic });
  const all = uiFiles.map(f => f.text).join('\n'), missingModals = [];
  for (const { file, text } of uiFiles) {
    for (const m of text.matchAll(/\bopenModal\(\s*(['"])([\w-]+)\1/g)) {
      const id = m[2], esc = id.replace(/[-]/g, '\\-');
      const markup = new RegExp(`\\bid\\s*=\\s*\\\\?["']${esc}\\\\?["']|\\.id\\s*=\\s*['"]${esc}['"]`).test(all);
      const mentions = (all.match(new RegExp(`["'\`]${esc}["'\`]`, 'g')) || []).length;
      const viaCalls = (all.match(new RegExp(`\\b(?:openModal|closeModal|safeCloseModal|getElementById)\\(\\s*["'\`]${esc}["'\`]`, 'g')) || []).length;
      if (!markup && mentions <= viaCalls) missingModals.push(`${file}:${lineOf(text, m.index)} openModal('${id}') — 이 창이 어디에도 없다`);
    }
  }
  if (missingModals.length) violations.push({ rule: 'UI02', message: '없는 창을 여는 버튼', places: missingModals });
  return { violations, writes, globals, html, htmlSamples, asyncCalls, handlers, actions: [...registry.names] };
}

module.exports = { lint, scan, isSafe };
if (require.main === module) {
  const result = lint();
  if (process.argv.includes('--html-samples')) for (const [file, list] of Object.entries(result.htmlSamples)) { console.log(`# ${file} (${list.length})`); list.forEach(line => console.log('  ' + line)); }
  if (process.argv.includes('--writes')) for (const [key, list] of Object.entries(result.writes)) console.log(`${key}\t${list.length}\t${list.join(' ')}`);
  if (process.argv.includes('--handlers')) console.log(JSON.stringify(result.handlers, null, 1));
  if (!result.violations.length) { console.log(`경계 검사 통과: 허용 목록의 직접 접근 ${Object.keys(result.writes).length}건, 전역 ${Object.keys(result.globals).length}개, HTML 기준 ${JSON.stringify(result.html)}, 인라인 처리기 ${Object.values(result.handlers).reduce((a, b) => a + b, 0)}곳, 화면 동작 ${result.actions.length}개`); process.exit(0); }
  for (const v of result.violations) { console.error(`[${v.rule}] ${v.message}`); v.places.forEach(place => console.error(`    ${place}`)); }
  process.exit(1);
}
