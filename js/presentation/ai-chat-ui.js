/* AI 여행 비서 챗봇 모달 (v2.2.7, 계획 4단계 18차).
 * index.html의 #modal-ai-chat 제어와 sendAiChatMessage(약 130줄)을 옮겼다.
 * 셸 함수(getActiveTrip·callGeminiApiWithFallback·escapeHtml)는 부를 때 찾는다.
 * 모든 동작은 data-on-click="aiChat.*"로 잇고, 불러올 때는 등록만 하고 문서를 건드리지 않는다. */
(function (root) {
  'use strict';
  const T = root.SulsulTravel = root.SulsulTravel || {};
  const $ = id => document.getElementById(id);

  let sendingChat = false;
  let chatKeyBound = false;
  let loadingSeq = 0;

  function bindInputEnterKey() {
    if (chatKeyBound) return;
    const input = $('ai-chat-input');
    if (!input) return;
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.isComposing) {
        event.preventDefault();
        void sendAiChatMessage();
      }
    });
    chatKeyBound = true;
  }

  function buildErrorHtml(err) {
    if (err?.code === 'GEMINI_KEY_MISSING' || err?.message === 'GEMINI_KEY_MISSING') {
      return [
        '<div class="space-y-2">',
        '  <div class="font-bold text-amber-400 flex items-center gap-1.5"><i class="fa-solid fa-key"></i> Gemini API 키가 아직 설정되지 않았습니다</div>',
        '  <p class="text-slate-300 leading-relaxed">실시간 맞춤형 AI 여행 비서를 사용하시려면 상단 [⚙️ 설정]에서 개인 Google Gemini API 키를 등록해 주세요.</p>',
        '  <div class="pt-1 flex items-center gap-2"><button type="button" data-on-click="settings.openFromModal" data-close-modal="modal-ai-chat" data-tab="ai" class="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1 transition shadow cursor-pointer"><i class="fa-solid fa-gear text-[10px]"></i> API 키 등록하러 가기</button></div>',
        '  <div class="text-[11px] text-slate-400 pt-1.5 border-t border-[#23304c]">💡 <strong>오프라인 기본 가이드:</strong> 아르헨티나에서는 MEP 우대 신용카드 결제를 이용하시고, 쿠스코(3,400m)에서는 첫날 3시간 휴식을 잊지 마세요!</div>',
        '</div>'
      ].join('');
    }
    if (err?.code === 'INVALID_API_KEY') {
      return [
        '<div class="space-y-2">',
        '  <div class="font-bold text-rose-400 flex items-center gap-1.5"><i class="fa-solid fa-circle-exclamation"></i> 등록된 API 키 오류 (400)</div>',
        '  <p class="text-slate-300 leading-relaxed">입력하신 Gemini API 키가 올바르지 않습니다. Google AI Studio에서 발급받은 정확한 키(AIzaSy...)를 다시 확인해 주세요.</p>',
        '  <div class="pt-1 flex items-center gap-2"><button type="button" data-on-click="settings.openFromModal" data-close-modal="modal-ai-chat" data-tab="ai" class="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1 transition shadow cursor-pointer"><i class="fa-solid fa-pen-to-square text-[10px]"></i> 키 다시 입력하기</button></div>',
        '</div>'
      ].join('');
    }
    if (err?.code === 'QUOTA_EXCEEDED') {
      return [
        '<div class="space-y-2">',
        '  <div class="font-bold text-amber-400 flex items-center gap-1.5"><i class="fa-solid fa-hourglass-half"></i> 일일 무료 할당량 초과 (429)</div>',
        '  <p class="text-slate-300 leading-relaxed">구글 Gemini API의 무료 일일 호출 한도가 일시적으로 초과되었습니다. 잠시 후 다시 질문해 주세요.</p>',
        '  <div class="text-[11px] text-slate-400 pt-1 border-t border-[#23304c]">💡 <strong>오프라인 비상 팁:</strong> 남미 고산지대에서는 소로체필(Sorojchi Pills)을 상비하시고 물을 충분히 섭취하세요.</div>',
        '</div>'
      ].join('');
    }
    return [
      '<div class="space-y-2">',
      '  <div class="font-bold text-amber-400 flex items-center gap-1.5"><i class="fa-solid fa-wifi"></i> 일시적 연결 오류 / 오프라인 전환</div>',
      `  <p class="text-slate-300 leading-relaxed">${escapeHtml(err?.userMessage || '네트워크 연결이 불안정하여 오프라인 모드로 자동 전환되었습니다.')}</p>`,
      '  <div class="text-[11px] text-slate-400 pt-1.5 border-t border-[#23304c]">💡 <strong>오프라인 추천 팁:</strong> 아르헨티나에서는 MEP 우대 신용카드 결제를 이용하시고, 쿠스코(3,400m)에서는 첫날 3시간 휴식을 잊지 마세요!</div>',
      '  <div class="pt-1 flex items-center gap-2"><button type="button" data-on-click="settings.openFromModal" data-close-modal="modal-ai-chat" data-tab="ai" class="px-2.5 py-1 rounded bg-[#080b12] border border-[#23304c] text-amber-300 hover:text-white text-[11px] font-bold cursor-pointer">⚙️ API 키 연결 상태 점검</button></div>',
      '</div>'
    ].join('');
  }

  async function sendAiChatMessage() {
    if (sendingChat) return false;
    bindInputEnterKey();
    const input = $('ai-chat-input');
    const container = $('ai-chat-messages');
    const sendBtn = $('ai-chat-send-btn');
    if (!input || !container) return false;
    const text = input.value.trim();
    if (!text) return false;

    sendingChat = true;
    if (sendBtn) sendBtn.disabled = true;

    container.insertAdjacentHTML('beforeend', [
      '<div class="flex items-start justify-end gap-2">',
      `  <div class="p-3 rounded-xl bg-amber-500 text-slate-950 font-medium max-w-[85%]">${escapeHtml(text)}</div>`,
      '  <span class="w-6 h-6 rounded-full bg-slate-700 text-white font-bold flex items-center justify-center text-[10px] shrink-0">나</span>',
      '</div>'
    ].join(''));
    input.value = '';
    container.scrollTop = container.scrollHeight;

    loadingSeq += 1;
    const loadingId = `ai-chat-thinking-${Number(loadingSeq)}`;
    container.insertAdjacentHTML('beforeend', [
      `<div id="${escapeHtml(loadingId)}" class="flex items-start gap-2">`,
      '  <span class="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-[10px] shrink-0">AI</span>',
      '  <div class="p-3 rounded-xl bg-[#141c2e] border border-[#23304c] text-slate-400 text-xs flex items-center gap-2 max-w-[85%] animate-pulse">',
      '    <i class="fa-solid fa-spinner fa-spin text-amber-400 text-xs"></i>',
      '    <span>AI 비서가 답변을 생각하고 있습니다...</span>',
      '  </div>',
      '</div>'
    ].join(''));
    const loaderElem = $(loadingId);
    container.scrollTop = container.scrollHeight;

    try {
      const trip = getActiveTrip();
      const tripContext = trip ? ` (현재 열람 중인 여행: ${trip.title || trip.name || '미정'}, 방문국: ${(trip.countries || []).join(', ')})` : '';
      const prompt = `당신은 술술트래블(Sulsul-Travel)의 전문 AI 여행 비서입니다. 친절하고 신뢰감 있게 한국어로 3~4줄 이내로 답변하세요.${tripContext}\n질문: ${text}`;

      const reply = await callGeminiApiWithFallback(prompt);
      if (loaderElem) loaderElem.remove();

      const formattedReply = String(reply || '').split('\n').map(line => escapeHtml(line)).join('<br>');
      container.insertAdjacentHTML(
        'beforeend',
        '<div class="flex items-start gap-2">' +
          '<span class="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-[10px] shrink-0">AI</span>' +
          '<div class="p-3 rounded-xl bg-[#141c2e] border border-[#23304c] text-slate-200 leading-relaxed max-w-[85%]">' + formattedReply + '</div>' +
        '</div>'
      );
      container.scrollTop = container.scrollHeight;
      return true;
    } catch (err) {
      if (loaderElem) loaderElem.remove();
      const errorHtml = buildErrorHtml(err);
      container.insertAdjacentHTML(
        'beforeend',
        '<div class="flex items-start gap-2">' +
          '<span class="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-[10px] shrink-0">AI</span>' +
          '<div class="p-3 rounded-xl bg-[#141c2e] border border-[#23304c] text-slate-200 leading-relaxed max-w-[85%]">' + errorHtml + '</div>' +
        '</div>'
      );
      container.scrollTop = container.scrollHeight;
      return false;
    } finally {
      sendingChat = false;
      if (sendBtn) sendBtn.disabled = false;
    }
  }

  T.UiActions.define('aiChat', {
    send: () => sendAiChatMessage()
  });

  T.AiChat = Object.freeze({
    bindInput: bindInputEnterKey,
    send: sendAiChatMessage
  });
})(typeof window !== 'undefined' ? window : globalThis);
