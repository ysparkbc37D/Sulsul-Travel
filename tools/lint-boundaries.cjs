/* 저장·전역 상태·HTML 삽입 경계 검사. 빌드 없이 Node 기본 모듈만 쓴다.
 * WRITE01  셸(index.html)과 presentation 파일은 여행 문서(st_trips_v2)에 직접 쓰지 않는다.
 *          saveTrips(·TripRepository.saveAll/savePrepared/write(·'st_trips_v2' 문자열은 허용 목록의 함수에만 남는다.
 * GLOBAL01 window.__ 전역 상태는 허용 목록의 이름만 쓴다.
 * HTML01   HTML 템플릿에 escape하지 않은 값을 넣는 곳의 수가 파일별 기준값을 넘지 않는다(줄어들면 기준값도 낮춘다).
 * 허용 목록: tools/boundary-allowlist.json. 수치는 손으로 고치고 사유를 남긴다. */
'use strict';
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');

// ---- 소스 스캐너: 주석을 지우고 템플릿 리터럴과 ${} 식을 찾는다 ----
const REGEX_PREV = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^', '']);
function scan(code) {
  const templates = [], out = code.split(''), braces = new Map(), open = [];
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
  function skipString(q) { i++; while (i < code.length && code[i] !== q) { if (code[i] === '\\') i++; else if (code[i] === '\n') break; i++; } i++; }
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
    while (i < code.length && code[i] !== '`') {
      if (code[i] === '\\') { text += code[i] + (code[i + 1] || ''); i += 2; continue; }
      if (code[i] === '$' && code[i + 1] === '{') {
        quasis.push(text); text = ''; i += 2;
        const exprStart = i; readCode('}');
        exprs.push({ text: code.slice(exprStart, i), start: exprStart });
        i++; continue;
      }
      text += code[i]; i++;
    }
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
  const result = { code: out.join(''), templates, braces };
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
function sourceFiles(rootDir) {
  const list = [];
  const walk = dir => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, entry.name); if (entry.isDirectory()) walk(p); else if (/\.(?:js|mjs)$/.test(entry.name)) list.push(p); } };
  if (fs.existsSync(path.join(rootDir, 'js'))) walk(path.join(rootDir, 'js'));
  const rel = p => path.relative(rootDir, p).split(path.sep).join('/');
  return [path.join(rootDir, 'index.html'), ...list.sort()].filter(fs.existsSync).map(p => ({ file: rel(p), text: fs.readFileSync(p, 'utf8') }));
}
const writeScope = file => file === 'index.html' || file.startsWith('js/presentation/');

function lint({ rootDir = root, allowlist } = {}) {
  allowlist = allowlist || JSON.parse(fs.readFileSync(path.join(rootDir, 'tools', 'boundary-allowlist.json'), 'utf8'));
  const writes = {}, globals = {}, html = {}, htmlSamples = {}, violations = [];
  for (const { file, text } of sourceFiles(rootDir)) {
    for (const region of codeRegions(file, text)) {
      const { code, templates, functions } = scan(region.text);
      const at = offset => `${file}:${lineOf(text, region.offset + offset)}`;
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
  const baseline = allowlist.html || {};
  for (const file of new Set([...Object.keys(html), ...Object.keys(baseline)])) {
    const actual = html[file] || 0, allowed = baseline[file] || 0;
    if (actual > allowed) violations.push({ rule: 'HTML01', message: `${file}: escape하지 않은 HTML 삽입 ${actual}곳(기준 ${allowed}). 값은 escapeHtml()로 감싼다`, places: htmlSamples[file].slice(-Math.min(10, actual - allowed)) });
    else if (actual < allowed) violations.push({ rule: 'HTML01', message: `${file}: escape하지 않은 HTML 삽입이 ${allowed}곳에서 ${actual}곳으로 줄었다. 기준값을 ${actual}로 낮춘다`, places: [] });
  }
  return { violations, writes, globals, html, htmlSamples };
}

module.exports = { lint, scan, isSafe };
if (require.main === module) {
  const result = lint();
  if (process.argv.includes('--html-samples')) for (const [file, list] of Object.entries(result.htmlSamples)) { console.log(`# ${file} (${list.length})`); list.forEach(line => console.log('  ' + line)); }
  if (process.argv.includes('--writes')) for (const [key, list] of Object.entries(result.writes)) console.log(`${key}\t${list.length}\t${list.join(' ')}`);
  if (!result.violations.length) { console.log(`경계 검사 통과: 허용 목록의 직접 접근 ${Object.keys(result.writes).length}건, 전역 ${Object.keys(result.globals).length}개, HTML 기준 ${JSON.stringify(result.html)}`); process.exit(0); }
  for (const v of result.violations) { console.error(`[${v.rule}] ${v.message}`); v.places.forEach(place => console.error(`    ${place}`)); }
  process.exit(1);
}
