/* 기존 사진은 미리 비교하고 선택한 교체만 저장한다. 실패하면 원문과 미리보기를 유지한다. */
const PhotoOptimizeUI={token:0,phase:'idle',items:[],baseRaw:null,baseState:null,controller:null,cleanup:null};
function photoSizeLabel(bytes){return bytes<1024?`${bytes}B`:bytes<1024*1024?`${(bytes/1024).toFixed(1)}KB`:`${(bytes/1024/1024).toFixed(2)}MB`;}
function photoOptimizeFeedback(message){const node=document.getElementById('photo-opt-feedback');if(node)node.textContent=message;}
function photoOptimizeBusy(phase){
  PhotoOptimizeUI.phase=phase;
  const busy=['preview','saving'].includes(phase);
  for(const id of ['photo-opt-scope','photo-opt-policy','photo-opt-preview'])document.getElementById(id).disabled=busy;
  for(const input of document.querySelectorAll('#photo-opt-list input'))input.disabled=busy;
  document.getElementById('photo-opt-cleanup').disabled=busy;
  document.getElementById('photo-opt-apply').disabled=busy||!PhotoOptimizeUI.items.some(item=>item.include);
  document.getElementById('modal-photo-optimization').setAttribute('aria-busy',String(busy));
  document.getElementById('photo-opt-close').textContent=phase==='preview'?'준비 취소':'닫기';
}
function ensurePhotoOptimizationModal(){
  let modal=document.getElementById('modal-photo-optimization');if(modal)return modal;
  modal=document.createElement('div');modal.id='modal-photo-optimization';modal.className='sheet-container sheet-closed';
  modal.innerHTML=`<div class="sheet-scrim" onclick="closePhotoOptimization()"></div><section class="sheet-box activity-sheet" role="dialog" aria-modal="true" aria-labelledby="photo-opt-title">
    <header class="activity-sheet-header"><div><p>사진 보관 용량</p><h3 id="photo-opt-title">사진 용량 최적화</h3></div><button class="companion-button" id="photo-opt-close" onclick="closePhotoOptimization()">닫기</button></header>
    <div class="activity-sheet-body"><p class="companion-muted">확대해서 내용을 확인한 뒤 적용하세요. 압축한 사진에서 원래 화질을 복원할 수 없으므로 필요한 원본은 먼저 백업하세요.</p>
      <div class="photo-opt-controls"><label>대상 여행<select id="photo-opt-scope" onchange="invalidatePhotoOptimizationPreview()"></select></label><label>읽기 기준<select id="photo-opt-policy" onchange="invalidatePhotoOptimizationPreview()"><option value="auto">용도별 · 지출은 글자 우선</option><option value="document">모두 글자·영수증 우선</option></select></label></div>
      <div class="photo-opt-actions"><button class="companion-button" id="photo-opt-preview" onclick="previewPhotoOptimization()">절감 용량 미리보기</button><button class="companion-button" onclick="prepareTravelBackup()">현재 원본 백업</button></div>
      <p id="photo-opt-summary" role="status"></p><div id="photo-opt-list"></div>
    </div><footer class="activity-sheet-footer"><p id="photo-opt-feedback" role="status" aria-live="polite">미리보기에서 예상 용량과 확대 이미지를 확인하세요.</p><button class="companion-button" id="photo-opt-cleanup" onclick="retryPhotoOptimizationCleanup()" hidden>이전 보관본 정리 다시 시도</button><button class="companion-button companion-primary" id="photo-opt-apply" disabled onclick="applyPhotoOptimization()">선택 사진 최적화 적용</button></footer></section>`;
  document.body.append(modal);return modal;
}
function openPhotoOptimization(){
  ensurePhotoOptimizationModal();
  if(['preview','saving'].includes(PhotoOptimizeUI.phase)){openModal('modal-photo-optimization');return;}
  const select=document.getElementById('photo-opt-scope');select.replaceChildren();
  for(const [value,label] of [['','전체 여행'],...State.trips.map(trip=>[trip.id,trip.title])]){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);}
  PhotoOptimizeUI.items=[];PhotoOptimizeUI.baseRaw=null;PhotoOptimizeUI.baseState=null;
  document.getElementById('photo-opt-list').replaceChildren();document.getElementById('photo-opt-summary').textContent='';
  photoOptimizeBusy('idle');photoOptimizeFeedback('미리보기에서 예상 용량과 확대 이미지를 확인하세요.');openModal('modal-photo-optimization');
}
function closePhotoOptimization(){
  if(PhotoOptimizeUI.phase==='saving'){photoOptimizeFeedback('저장과 보관본 정리를 마친 뒤 닫아 주세요.');return false;}
  PhotoOptimizeUI.controller?.abort();++PhotoOptimizeUI.token;PhotoOptimizeUI.phase='idle';PhotoOptimizeUI.items=[];
  closeModal('modal-photo-optimization',true);return true;
}
function photoOptimizationEditorsOpen(){return ['modal-expense','modal-activity-record','modal-moment-record'].some(id=>{const modal=document.getElementById(id);return modal&&!modal.classList.contains('sheet-closed');});}
function invalidatePhotoOptimizationPreview(){
  if(['preview','saving'].includes(PhotoOptimizeUI.phase))return;
  PhotoOptimizeUI.items=[];PhotoOptimizeUI.baseRaw=null;PhotoOptimizeUI.baseState=null;photoOptimizeBusy('idle');
  document.getElementById('photo-opt-list').replaceChildren();document.getElementById('photo-opt-summary').textContent='';
  photoOptimizeFeedback('대상이나 읽기 기준이 바뀌었습니다. 절감 용량 미리보기를 다시 눌러 주세요.');
}
function photoOptimizationCurrent(){return localStorage.getItem('st_trips_v2')===PhotoOptimizeUI.baseRaw&&JSON.stringify(State.trips)===PhotoOptimizeUI.baseState;}
function renderPhotoOptimizationPreview(){
  const list=document.getElementById('photo-opt-list');list.replaceChildren();
  const names={expense:'지출 사진',journal:'하루 회고',activity:'일정 기록',moment:'순간 기록'};
  PhotoOptimizeUI.items.forEach((item,index)=>{
    const row=document.createElement('article');row.className='photo-opt-row';
    const input=document.createElement('input');input.type='checkbox';input.checked=item.include;input.setAttribute('aria-label',`${index+1}번 사진 최적화 선택`);input.onchange=()=>{item.include=input.checked;photoOptimizationSummary();};
    const image=document.createElement('img');image.src=item.previewThumbnail;image.alt='압축 후 미리보기';image.loading='lazy';image.decoding='async';
    const info=document.createElement('div'),title=document.createElement('strong'),detail=document.createElement('p'),compare=document.createElement('button');
    const trip=State.trips.find(trip=>trip.id===item.locator.tripId);
    title.textContent=`${trip?.title||'여행'} · ${names[item.locator.kind]} ${item.locator.photoIndex+1}`;
    detail.textContent=`${photoSizeLabel(item.beforeBytes)} → ${photoSizeLabel(item.afterBytes)} · ${item.width}×${item.height}`;
    compare.className='companion-button';compare.textContent='확대 비교';compare.onclick=()=>showPhotoOptimizationComparison(index);
    info.append(title,detail,compare);row.append(input,image,info);list.append(row);
  });
  photoOptimizationSummary();
}
function photoOptimizationSummary(){
  const selected=PhotoOptimizeUI.items.filter(item=>item.include),before=selected.reduce((sum,item)=>sum+item.beforeBytes,0),after=selected.reduce((sum,item)=>sum+item.afterBytes,0);
  document.getElementById('photo-opt-summary').textContent=selected.length?`${selected.length}장 선택 · ${photoSizeLabel(before)} → ${photoSizeLabel(after)} · 약 ${photoSizeLabel(before-after)} 절감`:'적용할 사진을 선택하세요.';
  document.getElementById('photo-opt-apply').disabled=PhotoOptimizeUI.phase==='saving'||!selected.length;
}
async function previewPhotoOptimization(){
  if(['preview','saving'].includes(PhotoOptimizeUI.phase))return false;
  if(State.storageRecovery||photoOptimizationEditorsOpen()){photoOptimizeFeedback('열린 기록 편집을 저장하고 닫은 뒤 다시 시작해 주세요. 손상된 저장 문서가 있다면 먼저 복원해 주세요.');return false;}
  if(SulsulTravel.expensePhotoRepository.missingReferences().length){photoOptimizeFeedback('불러오지 못한 지출 사진이 있습니다. 원본을 다시 불러온 뒤 최적화해 주세요.');return false;}
  const token=++PhotoOptimizeUI.token,controller=new AbortController();PhotoOptimizeUI.controller=controller;PhotoOptimizeUI.items=[];photoOptimizeBusy('preview');
  try{
    await restoreJournalOverflowEntries();
    if(token!==PhotoOptimizeUI.token)return false;
    PhotoOptimizeUI.baseRaw=localStorage.getItem('st_trips_v2');PhotoOptimizeUI.baseState=JSON.stringify(State.trips);
    const selected=document.getElementById('photo-opt-scope').value,entries=SulsulTravel.PhotoOptimization.enumerate(State.trips,selected?{scopeTripId:selected}:{}),policy=document.getElementById('photo-opt-policy').value;
    let failed=0,unchanged=0;
    for(let index=0;index<entries.length;index++){
      photoOptimizeFeedback(`사진 ${index+1}/${entries.length} 용량과 확대 이미지를 준비하고 있습니다…`);
      await new Promise(resolve=>setTimeout(resolve,0));
      if(token!==PhotoOptimizeUI.token)return false;
      const locator=entries[index],preset=policy==='document'||locator.kind==='expense'?'document':'photo';
      try{
        const result=await SulsulTravel.PhotoCompression.compressDataUrl(locator.source,{preset,existing:true,signal:controller.signal});
        if(!result.changed){unchanged++;continue;}
        const beforeBytes=SulsulTravel.PhotoOptimization.sourceBytes(locator.source)+SulsulTravel.PhotoOptimization.sourceBytes(locator.thumbnail);
        let thumbnail=result.thumbnailDataUrl,afterBytes=result.bytes+result.thumbnailBytes;
        // 썸네일 추가로 전체 저장량이 늘지 않도록 전체 크기로 절감 여부를 판정한다.
        if(afterBytes>beforeBytes*.9){thumbnail=null;afterBytes=result.bytes;}
        if(afterBytes>beforeBytes*.9){unchanged++;continue;}
        PhotoOptimizeUI.items.push({locator,source:result.dataUrl,thumbnail,previewThumbnail:result.thumbnailDataUrl,beforeBytes,afterBytes,width:result.width,height:result.height,include:true});
      }catch(error){if(error.name==='AbortError')throw error;failed++;}
    }
    if(token!==PhotoOptimizeUI.token)return false;
    if(!photoOptimizationCurrent())throw new Error('사진을 준비하는 동안 여행이 변경됐습니다. 미리보기를 다시 만들어 주세요.');
    photoOptimizeBusy('ready');renderPhotoOptimizationPreview();
    photoOptimizeFeedback(`최적화 후보 ${PhotoOptimizeUI.items.length}장 · 이미 작은 사진 ${unchanged}장 · 처리하지 못한 사진 ${failed}장. 확대 비교 후 선택해 적용하세요.`);return true;
  }catch(error){if(token===PhotoOptimizeUI.token){photoOptimizeBusy('idle');photoOptimizeFeedback(error.name==='AbortError'?'미리보기 준비를 취소했습니다.':error.message||'사진을 준비하지 못했습니다. 원본은 유지됩니다.');}return false;}
}
function showPhotoOptimizationComparison(index){
  const item=PhotoOptimizeUI.items[index];if(!item)return;
  let modal=document.getElementById('modal-photo-comparison');
  if(!modal){modal=document.createElement('div');modal.id='modal-photo-comparison';modal.className='sheet-container sheet-closed';modal.innerHTML=`<div class="sheet-scrim" onclick="closeModal('modal-photo-comparison')"></div><section class="sheet-box activity-sheet" role="dialog" aria-modal="true" aria-labelledby="photo-compare-title"><header class="activity-sheet-header"><h3 id="photo-compare-title">사진 확대 비교</h3><button class="companion-button" onclick="closeModal('modal-photo-comparison')">닫기</button></header><div class="activity-sheet-body"><div class="photo-opt-actions"><button id="photo-compare-before" class="companion-button">기존 사진</button><button id="photo-compare-after" class="companion-button">압축 후</button><button id="photo-compare-size" class="companion-button">실제 크기 보기</button></div><p id="photo-compare-info" role="status"></p><div class="photo-compare-scroll"><img id="photo-compare-image" alt="선택한 사진 확대 비교"></div></div></section>`;document.body.append(modal);}
  const image=document.getElementById('photo-compare-image'),info=document.getElementById('photo-compare-info');
  image.style.maxWidth='100%';image.src=item.source;info.textContent='압축 후 · 작은 글자와 금액을 확인하세요.';
  document.getElementById('photo-compare-before').onclick=()=>{image.src=item.locator.source;info.textContent='기존 사진';};
  document.getElementById('photo-compare-after').onclick=()=>{image.src=item.source;info.textContent='압축 후 · 작은 글자와 금액을 확인하세요.';};
  document.getElementById('photo-compare-size').onclick=()=>{image.style.maxWidth=image.style.maxWidth==='none'?'100%':'none';};openModal('modal-photo-comparison');
}
async function retryPhotoOptimizationCleanup(){
  if(!PhotoOptimizeUI.cleanup)return true;
  const candidates=PhotoOptimizeUI.cleanup;
  try{
    const pendingIds=new Set(),pending=[State.journalPhotoDrafts,State.activityRecordEditor?.draft,State.momentRecordEditor?.draft],seen=new WeakSet();
    while(pending.length){const value=pending.pop();if(!value||typeof value!=='object'||seen.has(value))continue;seen.add(value);for(const [key,child]of Object.entries(value)){if(key==='mediaId'&&typeof child==='string')pendingIds.add(child);if(key==='mediaIds'&&Array.isArray(child))child.forEach(id=>pendingIds.add(id));if(child&&typeof child==='object')pending.push(child);}}
    await SulsulTravel.PhotoCleanup.cleanup({expectedRaw:localStorage.getItem('st_trips_v2'),mediaIds:candidates.oldMediaIds.filter(id=>!pendingIds.has(id)),expenseArchiveIds:candidates.oldExpenseArchiveIds,onExpenseDeleted:id=>SulsulTravel.expensePhotoRepository.cache.delete(id)});
    PhotoOptimizeUI.cleanup=null;document.getElementById('photo-opt-cleanup').hidden=true;return true;
  }catch(error){document.getElementById('photo-opt-cleanup').hidden=false;photoOptimizeFeedback(`사진은 저장했습니다. 이전 보관본 정리를 마치지 못했습니다. ${error.message||''}`);return false;}
}
async function applyPhotoOptimization(){
  if(PhotoOptimizeUI.phase!=='ready')return false;
  const chosen=PhotoOptimizeUI.items.filter(item=>item.include);if(!chosen.length)return false;
  if(photoOptimizationEditorsOpen()||!photoOptimizationCurrent()){photoOptimizeFeedback('미리보기 뒤 여행이나 편집 내용이 변경됐습니다. 입력을 보관하고 미리보기를 다시 만들어 주세요.');return false;}
  photoOptimizeBusy('saving');let committed=false;
  try{
    const plan=SulsulTravel.PhotoOptimization.apply(State.trips,chosen.map(item=>({locator:item.locator,before:item.locator.source,source:item.source,thumbnail:item.thumbnail})));
    for(const trip of plan.trips)if(plan.changedTrips.includes(trip.id)){trip.revision=(trip.revision||0)+1;trip.updatedAt=new Date().toISOString();}
    const prepared=await SulsulTravel.expensePhotoRepository.prepare(plan.trips);
    if(!photoOptimizationCurrent())throw new Error('사진을 저장하는 동안 여행이 변경됐습니다. 미리보기를 다시 만들어 주세요.');
    State.trips=TripRepository.saveAll(prepared,{expectedRaw:PhotoOptimizeUI.baseRaw});committed=true;
    PhotoOptimizeUI.cleanup={oldMediaIds:plan.oldMediaIds,oldExpenseArchiveIds:plan.oldExpenseArchiveIds};
    const cleaned=await retryPhotoOptimizationCleanup();
    PhotoOptimizeUI.items=[];photoOptimizeBusy('done');document.getElementById('photo-opt-list').replaceChildren();
    if(cleaned)photoOptimizeFeedback(`${plan.changedPhotos}장 최적화와 이전 보관본 정리를 완료했습니다. 확대 보기와 백업에 최적화한 사진이 사용됩니다.`);
    try{renderHub();renderActiveTripWorkspace();}catch(error){console.warn('[사진 최적화 후 화면 갱신]',error);}
    return true;
  }catch(error){photoOptimizeBusy(committed?'done':'ready');photoOptimizeFeedback(committed?'사진은 저장했습니다. 화면을 다시 열어 확인해 주세요.':`저장하지 못했습니다. 원본과 미리보기를 유지합니다. ${error.message||''}`);return false;}
}
