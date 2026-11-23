/* 화면 동작 위임 (v2.0.9, 계획 4단계).
 * 인라인 onclick 문자열 대신 요소에 동작 이름을 적고, 문서에서 한 번만 이벤트를 받아 등록된 처리기로 넘긴다.
 *   data-on-click="이름공간.동작"   클릭(버튼의 Enter·Space, 체크박스의 Space 포함)
 *   data-on-change="이름공간.동작"  change(선택 상자·파일·체크박스 값 확정)
 *   data-on-input="이름공간.동작"   input(입력 중)
 * data-action은 쓰지 않는다. 오늘 화면 버튼이 이미 CSS 순서 표식(data-action="complete" 등)으로 쓴다.
 * 처리기는 (요소, 이벤트)를 받고, 필요한 값은 요소의 data-* 속성에서 읽는다(문자열을 코드로 만들지 않는다).
 * 안쪽 요소의 동작이 먼저 잡히고 바깥 동작은 실행하지 않는다(stopPropagation을 쓰던 자리와 같다).
 * 등록되지 않은 이름은 오류를 던진다. 함수 이름이 바뀌어 버튼이 조용히 죽는 일(v1.1.7·v1.8.4 준비물 버튼)을 막는다.
 * 등록은 파일을 불러올 때 한다. 등록하는 파일은 불러올 때 문서를 건드리지 않는다(경계 검사 UI02가 Node에서 등록 목록을 읽는다). */
(function (root) {
  'use strict';
  const T = root.SulsulTravel = root.SulsulTravel || {};
  if (T.UiActions) return;
  const handlers = new Map();
  // 이벤트 종류 → data 속성 이름
  const ATTRIBUTES = Object.freeze({ click: 'data-on-click', change: 'data-on-change', input: 'data-on-input' });
  const NAME = /^[a-z][\w-]*\.[a-z][\w-]*$/i;

  function define(namespace, table) {
    if (!/^[a-z][\w-]*$/i.test(String(namespace || ''))) throw new Error('UI_ACTION_NAMESPACE');
    for (const [key, handler] of Object.entries(table || {})) {
      const name = `${namespace}.${key}`;
      if (!NAME.test(name)) throw new Error(`UI_ACTION_NAME: ${name}`);
      if (typeof handler !== 'function') throw new Error(`UI_ACTION_HANDLER: ${name}`);
      if (handlers.has(name)) throw new Error(`UI_ACTION_DUPLICATE: ${name}`);
      handlers.set(name, handler);
    }
  }
  const has = name => handlers.has(name);
  const names = () => [...handlers.keys()].sort();

  // 처리기 오류는 숨기지 않는다. 비동기 처리기의 실패도 전역 오류로 올린다.
  function surface(error) { setTimeout(() => { throw error; }, 0); }

  function dispatch(event) {
    const attribute = ATTRIBUTES[event.type];
    if (!attribute) return;
    let node = event.target;
    if (node && node.nodeType !== 1) node = node.parentElement;
    const element = node && typeof node.closest === 'function' ? node.closest(`[${attribute}]`) : null;
    if (!element) return;
    const name = element.getAttribute(attribute);
    const handler = handlers.get(name);
    if (!handler) throw new Error(`UNKNOWN_UI_ACTION: ${name}`);
    if (element.getAttribute('aria-disabled') === 'true') return;
    let result;
    try { result = handler(element, event); } catch (error) { surface(error); return; }
    if (result && typeof result.then === 'function') result.then(null, surface);
  }

  if (root.document && typeof root.document.addEventListener === 'function') {
    for (const type of Object.keys(ATTRIBUTES)) root.document.addEventListener(type, dispatch);
  }
  T.UiActions = Object.freeze({ define, has, names, dispatch, ATTRIBUTES });
})(typeof window !== 'undefined' ? window : globalThis);
