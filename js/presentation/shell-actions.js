/* 여러 화면이 함께 쓰는 셸 동작 (v2.1.1, 계획 4단계).
 * 창 닫기처럼 어느 화면 파일에도 속하지 않는 동작을 data-on-click="shell.*"로 잇는다.
 * 셸 함수(closeModal)는 부를 때 찾는다. 불러올 때는 등록만 하고 문서를 건드리지 않는다. */
(function (root) {
  'use strict';
  const T = root.SulsulTravel = root.SulsulTravel || {};
  T.UiActions.define('shell', {
    // data-modal의 창을 닫는다. 강제로 닫지 않으므로 작성 중 확인·연타 방지(350ms)는 closeModal 규칙을 그대로 따른다.
    closeModal: element => closeModal(element.dataset.modal)
  });
})(typeof window !== 'undefined' ? window : globalThis);
