/* PDF와 기록 화면에서 동일한 원문/승인문·사진 선택 및 파일 내보내기를 사용한다. */
(function (root) {
  'use strict';
  const story = root.SulsulTravel?.TravelStory || (typeof require === 'function' ? require('../domain/travel-story.js') : null);
  const mounts = new WeakMap();
  function filename(title,extension) {
    return `${String(title || '여행').replace(/[<>:"/\\|?*\u0000-\u001f]/g,'_').trim().slice(0,80) || '여행'}_여행이야기.${extension}`;
  }
  function prepareExport(tripOrModel,format = 'markdown',selection = {}) {
    if (!story) throw new Error('여행 이야기 모듈을 먼저 불러와 주세요.');
    const model = tripOrModel?.schemaVersion === 1 && Array.isArray(tripOrModel.timeline) && tripOrModel.manifest ? tripOrModel : story.build(tripOrModel,selection);
    const markdown = format === 'markdown' || format === 'md';
    return {content:markdown ? story.toMarkdown(model) : story.toText(model),filename:filename(model.cover.title,markdown ? 'md' : 'txt'),mimeType:markdown ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8',model};
  }
  function download(tripOrModel,format = 'markdown',selection = {},environment = root) {
    const result = prepareExport(tripOrModel,format,selection);
    if (!environment.document || !environment.URL?.createObjectURL || !environment.Blob) throw new Error('이 화면에서 파일 다운로드를 사용할 수 없습니다.');
    const blob = new environment.Blob([result.content],{type:result.mimeType});
    const url = environment.URL.createObjectURL(blob);
    const anchor = environment.document.createElement('a');
    anchor.href=url;anchor.download=result.filename;
    try { environment.document.body.appendChild(anchor);anchor.click(); }
    finally {
      anchor.remove();
      // 브라우저가 링크를 읽은 다음 Blob URL을 해제한다.
      environment.setTimeout(() => environment.URL.revokeObjectURL(url),1000);
    }
    return result;
  }
  function controlsHtml(selection = {}) {
    const approved = selection.textMode === 'approved';
    return `<div class="travel-story-controls"><label>출력할 글 <select data-story-text-mode aria-label="여행 이야기 원문 또는 승인문 선택"><option value="original"${approved ? '' : ' selected'}>원문</option><option value="approved"${approved ? ' selected' : ''}>사용자가 승인한 AI 문장 우선</option></select></label><label><input type="checkbox" data-story-photos${selection.includePhotos === false ? '' : ' checked'}> 사진 포함</label><div class="travel-story-downloads"><button type="button" data-story-download="markdown">블로그용 Markdown 저장</button><button type="button" data-story-download="text">글 파일 저장</button></div><p data-story-feedback role="status" aria-live="polite">승인문이 없는 기록은 원문으로 출력합니다.</p></div>`;
  }
  function mountControls(container,tripOrGetter,options = {}) {
    if (!container) return null;
    mounts.get(container)?.destroy();
    let selection = {textMode:options.textMode === 'approved' ? 'approved' : 'original',includePhotos:options.includePhotos !== false};
    container.innerHTML=controlsHtml(selection);
    const getTrip = typeof tripOrGetter === 'function' ? tripOrGetter : () => tripOrGetter;
    const buildOptions = () => ({...selection,photoSource:options.photoSource});
    const getModel = () => story.build(getTrip() || {},buildOptions());
    const feedback = message => { const target=container.querySelector('[data-story-feedback]');if(target)target.textContent=message; };
    const onChange = event => {
      if (!event.target?.matches?.('[data-story-text-mode], [data-story-photos]')) return;
      selection={textMode:container.querySelector('[data-story-text-mode]')?.value === 'approved' ? 'approved' : 'original',includePhotos:!!container.querySelector('[data-story-photos]')?.checked};
      if (typeof options.onChange === 'function') options.onChange(getModel(),{...selection});
      feedback(selection.textMode === 'approved' ? '사용자가 승인한 AI 문장만 선택합니다. 승인문이 없는 기록은 원문으로 출력합니다.' : '직접 남긴 원문을 출력합니다.');
    };
    const onClick = event => {
      const button = event.target?.closest?.('[data-story-download]');
      if (!button || !container.contains(button)) return;
      try {
        const result = download(getModel(),button.getAttribute('data-story-download'));
        feedback(`${result.filename} 파일을 저장했습니다.`);
        if (typeof options.onDownload === 'function') options.onDownload(result);
      } catch(error) { feedback(error.message || '파일을 만들지 못했습니다. 다시 시도해 주세요.'); }
    };
    container.addEventListener('change',onChange);container.addEventListener('click',onClick);
    const control = {getModel,getSelection:() => ({...selection}),destroy:() => {container.removeEventListener('change',onChange);container.removeEventListener('click',onClick);mounts.delete(container);}};
    mounts.set(container,control);
    return control;
  }
  const api = {mountControls,mount:mountControls,controlsHtml,prepareExport,download};
  root.SulsulTravel=root.SulsulTravel || {};
  root.SulsulTravel.TravelStoryUI=api;
  if (typeof module !== 'undefined' && module.exports) module.exports=api;
})(typeof window !== 'undefined' ? window : globalThis);
