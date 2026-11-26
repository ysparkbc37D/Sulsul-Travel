/* 인생 여행 완주 보고서 & 포토북 출력 모달 (v2.2.7, 계획 4단계 18차).
 * index.html의 #modal-pdf-report 제어와
 * openPdfReportModal·openTripPdfReport·renderPdfReport·triggerPrintReport·downloadReportAsHtml(약 195줄)을 옮겼다.
 * 셸 함수(getActiveTrip·openModal·escapeHtml)와 전역 State·APP_VER,
 * SulsulTravel.TravelStory·TravelStoryUI·MediaRepository·LifetimeAnalytics는 부를 때 찾는다.
 * 모든 동작은 data-on-click="report.*"로 잇고, 불러올 때는 등록만 하고 문서를 건드리지 않는다. */
(function (root) {
  'use strict';
  const T = root.SulsulTravel = root.SulsulTravel || {};
  const $ = id => document.getElementById(id);

  function resolveBudgetKrw(trip) {
    if (T.LifetimeAnalytics && typeof T.LifetimeAnalytics.tripBudgetKrw === 'function') {
      return Math.max(0, Number(T.LifetimeAnalytics.tripBudgetKrw(trip)) || 0);
    }
    const raw = Number(trip?.budget) || 0;
    if (raw <= 0) return 0;
    const curr = String(trip?.currency || 'KRW').toUpperCase();
    if (curr === 'KRW') return Math.round(raw);
    const rate = typeof getCurrencyRate === 'function' ? Number(getCurrencyRate(curr)) : 0;
    return rate > 0 ? Math.round(raw * rate) : Math.round(raw);
  }

  function openPdfReportModal(tripId) {
    const trip = tripId ? State.trips.find(t => t.id === tripId) : getActiveTrip();
    if (!trip) {
      alert('선택된 여행 데이터가 없습니다.');
      return;
    }
    renderPdfReport(trip);
    openModal('modal-pdf-report');
  }

  function openTripPdfReport(tripId, event) {
    if (event) event.stopPropagation();
    openPdfReportModal(tripId);
  }

  function renderPdfReport(trip, selection = {}) {
    const container = $('pdf-report-content');
    if (!container || !trip) return;

    const previousSelection = State.pdfReportTripId === trip.id ? State.pdfReportSelection : null;
    const selected = { textMode: 'original', includePhotos: true, ...previousSelection, ...selection };
    const photoSource = T.MediaRepository?.photoSource;
    const storyModel = T.TravelStory.build(trip, { ...selected, photoSource });
    State.pdfReportTripId = trip.id;
    State.pdfReportSelection = storyModel.selection;
    State.pdfReportManifest = storyModel.manifest;

    const expenseSummary = storyModel.expenses;
    const totalSpentKrw = Number(expenseSummary.totalSpentKrw) || 0;
    let mepSavingsKrw = 0;
    const catTotals = {
      ...expenseSummary.categoryTotals,
      food: Number(expenseSummary.categoryTotals.meal) || 0,
      flight: Number(expenseSummary.categoryTotals.transport) || 0
    };

    (trip.expenses || []).forEach(e => {
      if (e.type === 'income') return;
      if (e.curr === 'ARS') {
        mepSavingsKrw += Math.round((Number(e.amount) || 0) * 0.43);
      }
    });

    const budgetKrw = resolveBudgetKrw(trip);
    const remainKrw = Math.max(0, budgetKrw - totalSpentKrw);
    const diaryCount = Number(storyModel.stats.recordCount) || 0;
    const photoCount = Number(storyModel.stats.includedPhotoCount) || 0;
    const daySpan = Number(trip.durationDays) || (trip.days ? trip.days.length : 0) || 0;
    const verLabel = typeof APP_VER !== 'undefined' ? String(APP_VER) : (T.version || '');
    const storyHtml = T.TravelStory.renderHtml(storyModel, { includeCover: false });

    const parts = [
      '<div class="border-b-2 border-amber-500/30 pb-6 space-y-3">',
      '  <div class="flex items-center justify-between">',
      '    <span class="text-xs font-black tracking-widest text-amber-400 uppercase font-mono">Sulsul-Travel Lifetime Memoir</span>',
      `    <span class="text-xs text-slate-400 font-mono">v${escapeHtml(verLabel)} OFFICIAL REPORT</span>`,
      '  </div>',
      '  <div class="flex items-start gap-4">',
      `    <span class="text-4xl sm:text-5xl">${escapeHtml(trip.coverEmoji || '🌎')}</span>`,
      '    <div>',
      `      <h1 class="text-2xl sm:text-3xl font-black text-white tracking-tight">${escapeHtml(trip.title || trip.name || '여행')}</h1>`,
      `      <p class="text-xs sm:text-sm text-slate-300 mt-1 font-medium">${escapeHtml(trip.subtitle || trip.style || '인생의 가장 빛나는 순간을 기록한 여행 다이어리')}</p>`,
      '      <div class="flex items-center gap-3 text-xs text-slate-400 mt-2 flex-wrap">',
      `        <span>🗓️ <b>${escapeHtml(trip.startDate || '날짜 미정')} ~ ${escapeHtml(trip.endDate || '날짜 미정')}</b> (${Number(daySpan)}일간)</span>`,
      `        <span>🌎 <b>${escapeHtml((trip.countries || []).join(' · '))}</b></span>`,
      '      </div>',
      '    </div>',
      '  </div>',
      '</div>',
      '<div class="space-y-3">',
      '  <h2 class="text-sm font-black text-amber-400 flex items-center gap-2">',
      '    <i class="fa-solid fa-chart-pie"></i> 여행 종합 통계 및 예산 결산',
      '  </h2>',
      '  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">',
      '    <div class="p-3 bg-[#080b12] rounded-xl border border-[#1e263c]">',
      '      <div class="text-[10px] text-slate-400 font-medium">총 목표 예산</div>',
      `      <div class="text-sm sm:text-base font-black text-white mt-0.5">₩${escapeHtml(budgetKrw.toLocaleString())}</div>`,
      '    </div>',
      '    <div class="p-3 bg-[#080b12] rounded-xl border border-[#1e263c]">',
      '      <div class="text-[10px] text-slate-400 font-medium">총 실지출액</div>',
      `      <div class="text-sm sm:text-base font-black text-rose-400 mt-0.5">₩${escapeHtml(totalSpentKrw.toLocaleString())}</div>`,
      '    </div>',
      '    <div class="p-3 bg-[#080b12] rounded-xl border border-[#1e263c]">',
      '      <div class="text-[10px] text-slate-400 font-medium">예산 잔액</div>',
      `      <div class="text-sm sm:text-base font-black text-emerald-400 mt-0.5">₩${escapeHtml(remainKrw.toLocaleString())}</div>`,
      '    </div>',
      '    <div class="p-3 bg-[#080b12] rounded-xl border border-[#1e263c]">',
      '      <div class="text-[10px] text-slate-400 font-medium">🇦🇷 MEP 환율 절감액</div>',
      `      <div class="text-sm sm:text-base font-black text-amber-400 mt-0.5">₩${escapeHtml(mepSavingsKrw.toLocaleString())}</div>`,
      '    </div>',
      '  </div>',
      '  <div class="p-3.5 bg-[#080b12] rounded-xl border border-[#1e263c] text-xs">',
      '    <div class="font-bold text-slate-300 mb-2">항목별 지출 분포</div>',
      '    <div class="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-[11px]">',
      `      <div class="p-2 bg-[#141c2e] rounded-lg border border-[#23304c]"><div class="text-slate-400">🍽️ 식비</div><div class="font-black text-white mt-1">₩${escapeHtml((Number(catTotals.food) || 0).toLocaleString())}</div></div>`,
      `      <div class="p-2 bg-[#141c2e] rounded-lg border border-[#23304c]"><div class="text-slate-400">🏨 숙박</div><div class="font-black text-white mt-1">₩${escapeHtml((Number(catTotals.lodging) || 0).toLocaleString())}</div></div>`,
      `      <div class="p-2 bg-[#141c2e] rounded-lg border border-[#23304c]"><div class="text-slate-400">✈️ 교통/항공</div><div class="font-black text-white mt-1">₩${escapeHtml((Number(catTotals.flight) || 0).toLocaleString())}</div></div>`,
      `      <div class="p-2 bg-[#141c2e] rounded-lg border border-[#23304c]"><div class="text-slate-400">🎟️ 관광/투어</div><div class="font-black text-white mt-1">₩${escapeHtml((Number(catTotals.tour) || 0).toLocaleString())}</div></div>`,
      `      <div class="p-2 bg-[#141c2e] rounded-lg border border-[#23304c]"><div class="text-slate-400">🛍️ 쇼핑</div><div class="font-black text-white mt-1">₩${escapeHtml((Number(catTotals.shopping) || 0).toLocaleString())}</div></div>`,
      `      <div class="p-2 bg-[#141c2e] rounded-lg border border-[#23304c]"><div class="text-slate-400">🏷️ 기타</div><div class="font-black text-white mt-1">₩${escapeHtml((Number(catTotals.etc) || 0).toLocaleString())}</div></div>`,
      '    </div>',
      '  </div>',
      '</div>',
      '<div class="space-y-4">',
      '  <h2 class="text-sm font-black text-amber-400 flex items-center gap-2">',
      `    <i class="fa-solid fa-camera-retro"></i> 날짜별 여행 이야기 (${Number(diaryCount)}편 / ${Number(photoCount)}장)`,
      '  </h2>',
      storyHtml,
      '</div>',
      '<div class="pt-6 border-t border-[#1a2236] text-center text-[10px] text-slate-500 font-mono">',
      '  GENERATED BY SULSUL-TRAVEL (술술트래블) · LIFETIME MEMOIR ENGINE · ALL RIGHTS RESERVED',
      '</div>'
    ];

    container.innerHTML = parts.join('');
    T.TravelStoryUI.mountControls($('pdf-story-controls'), () => State.trips.find(item => item.id === State.pdfReportTripId) || trip, {
      ...storyModel.selection,
      photoSource,
      onChange: (_model, nextSelection) => renderPdfReport(State.trips.find(item => item.id === State.pdfReportTripId) || trip, nextSelection)
    });
  }

  function triggerPrintReport() {
    window.print();
  }

  function downloadReportAsHtml() {
    const trip = State.trips.find(item => item.id === State.pdfReportTripId) || getActiveTrip();
    if (!trip) return;
    const container = $('pdf-report-content');
    if (!container) return;
    const content = container.innerHTML;
    const safeTitle = String(trip.title || trip.name || '여행').trim() || '여행';
    const fileStem = safeTitle.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_');

    const fullHtml = [
      '<!DOCTYPE html>',
      '<html lang="ko">',
      '<' + 'head>',
      '  <meta charset="UTF-8">',
      `  <title>${escapeHtml(safeTitle)} - 술술트래블 완주 보고서</title>`,
      '  <style>',
      '    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #ffffff; color: #0f172a; padding: 24px; max-width: 900px; margin: 0 auto; line-height: 1.6; }',
      '    .text-white { color: #0f172a !important; }',
      '    .bg-\\[\\#080b12\\], .bg-\\[\\#0f1422\\], .bg-\\[\\#141c2e\\] { background: #f8fafc !important; border: 1px solid #e2e8f0 !important; }',
      '    .text-slate-400, .text-slate-300 { color: #475569 !important; }',
      '    .text-amber-400, .text-amber-300 { color: #d97706 !important; }',
      '    .text-emerald-400 { color: #059669 !important; }',
      '    .text-rose-400 { color: #e11d48 !important; }',
      '    img { border-radius: 8px; max-width: 100%; }',
      '    .grid { display: grid; gap: 12px; }',
      '    .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }',
      '    .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }',
      '    .grid-cols-4 { grid-template-columns: repeat(4, 1fr); }',
      '    .grid-cols-6 { grid-template-columns: repeat(6, 1fr); }',
      '    .activity-report-text { white-space:pre-wrap; overflow-wrap:anywhere; line-height:1.8; }',
      '    .activity-report-photos { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }',
      '    .activity-report-photos img { width:100%; aspect-ratio:3/4; object-fit:cover; }',
      '    .activity-report article { padding:16px; border:1px solid #ccc; margin:16px 0; }',
      '  </style>',
      '</' + 'head>',
      '<' + 'body>',
      content,
      '</' + 'body>',
      '</html>'
    ].join('\n');

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = `${fileStem}_완주보고서_포토북.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  T.UiActions.define('report', {
    downloadHtml: () => downloadReportAsHtml(),
    print: () => triggerPrintReport()
  });

  T.ReportUI = Object.freeze({
    openModal: openPdfReportModal,
    openTripReport: openTripPdfReport,
    render: renderPdfReport,
    print: triggerPrintReport,
    downloadHtml: downloadReportAsHtml,
    resolveBudgetKrw
  });
})(typeof window !== 'undefined' ? window : globalThis);
