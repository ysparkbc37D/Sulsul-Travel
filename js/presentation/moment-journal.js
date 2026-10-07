/* 하루에 여러 순간을 남기는 독립 기록. 기존 하루 회고/일정 기록을 이동하거나 덮어쓰지 않는다. */
function momentEntries(trip) { return Array.isArray(trip?.momentEntries) ? trip.momentEntries : []; }
function momentLocalDateTime(trip, now = new Date()) {
  const options={year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'};
  let parts;
  try { parts=new Intl.DateTimeFormat('en-CA',{...options,...(trip?.timeZone?{timeZone:trip.timeZone}:{})}).formatToParts(now); }
  catch (_) { parts=new Intl.DateTimeFormat('en-CA',options).formatToParts(now); }
  const value=type=>parts.find(p=>p.type===type)?.value || '';
  return {date:`${value('year')}-${value('month')}-${value('day')}`,time:`${value('hour')}:${value('minute')}`};
}
function momentFeedEntries(trip, dayIndex) {
  const day=trip?.days?.[dayIndex], date=day?.date;
  const moments=momentEntries(trip).filter(entry=>date?entry.date===date:entry.dayIndex===dayIndex).map(entry=>({type:'moment',entry,time:entry.time || '',id:entry.id}));
  const activities=Object.values(trip?.activityRecords || {}).filter(record=>{
    const location=typeof activityLocation==='function'?activityLocation(trip,record.id):null;
    return location?location.dayIndex===dayIndex:!!date&&record.context?.date===date;
  }).map(entry=>({type:'activity',entry,time:entry.context?.time || '',id:entry.id}));
  return [...moments,...activities].sort((a,b)=>(a.time || '24:00').localeCompare(b.time || '24:00') || (a.entry.createdAt || a.entry.updatedAt || '').localeCompare(b.entry.createdAt || b.entry.updatedAt || '') || a.id.localeCompare(b.id));
}
function momentPhotoSource(record,index,thumbnail=false) { return SulsulTravel.MediaRepository.photoSource(record,index,{thumbnail}); }
function mountMomentJournalFeed(containerOrId, dayIndex = State.activeJournalDay) {
  const container=typeof containerOrId==='string'?document.getElementById(containerOrId):containerOrId,trip=getActiveTrip();if(!container||!trip)return;
  const day=trip.days?.[dayIndex],feed=momentFeedEntries(trip,dayIndex);
  container.classList.add('moment-feed');
  container.innerHTML=`<div class="moment-feed-heading"><div><h3>이날 남긴 순간 <span>${feed.length}</span></h3><p>한 줄의 글이나 사진만 남겨도 좋아요.</p></div><button type="button" class="companion-button companion-primary" data-moment-add>순간 기록</button></div>${feed.length?`<div class="moment-feed-list">${feed.map(item=>{
    const entry=item.entry,index=entry.coverIndex || 0,photo=momentPhotoSource(entry,index,true),label=item.type==='activity'?(entry.context?.title || '일정 기록'):(entry.activityLink?.title || '여행의 순간');
    return `<button type="button" class="activity-record-card moment-feed-card" ${item.type==='moment'?`data-moment-id="${escapeHtml(entry.id)}"`:`data-activity-id="${escapeHtml(entry.id)}"`} aria-label="${escapeHtml(label)} 기록 보기">${photo?`<img class="activity-cover" src="${escapeHtml(photo)}" alt="${escapeHtml(label)} 대표사진" loading="lazy">`:'<span class="activity-record-icon" aria-hidden="true">✎</span>'}<span class="activity-record-copy"><small>${escapeHtml(item.time || '시각 미기록')} · ${item.type==='activity'?'일정 기록':entry.activityLink?'일정에 연결한 순간':'자유로운 순간'}</small><strong>${escapeHtml(label)}</strong><span>${escapeHtml(entry.text || '사진으로 남긴 순간')}</span>${entry.photos?.length?`<small>사진 ${entry.photos.length}장</small>`:''}</span><span aria-hidden="true">›</span></button>`;
  }).join('')}</div>`:`<p class="moment-feed-empty">${escapeHtml(day?.date || '')} 첫 순간을 남겨 보세요. 일정 완료 전에도 기록할 수 있어요.</p>`}`;
  container.onclick=event=>{
    const add=event.target.closest('[data-moment-add]'),entry=event.target.closest('[data-moment-id]'),activity=event.target.closest('[data-activity-id]');
    if(add)openMomentJournal(dayIndex,null,event);
    else if(entry)openMomentJournal(dayIndex,entry.dataset.momentId,event);
    else if(activity){const index=activityEntries(trip).findIndex(record=>record.id===activity.dataset.activityId);if(index>=0)openArchivedActivityRecord(index);}
  };
}
function ensureMomentJournalModal() {
  if(document.getElementById('modal-moment-record'))return;
  const modal=document.createElement('div');modal.id='modal-moment-record';modal.className='sheet-container sheet-closed';
  modal.innerHTML=`<div class="sheet-scrim" onclick="closeMomentJournal()"></div><div class="sheet-box activity-sheet moment-sheet" role="dialog" aria-modal="true" aria-labelledby="moment-record-title"><header class="activity-sheet-header"><div><p>여행의 순간</p><h3 id="moment-record-title">순간 기록</h3><p id="moment-record-meta"></p></div><button type="button" class="companion-button" onclick="closeMomentJournal()" aria-label="순간 기록 닫기">닫기</button></header><div class="activity-sheet-body"><div class="moment-date-fields"><label>날짜<input id="moment-record-date" type="date" onchange="rememberMomentDraft()"></label><label>시각<input id="moment-record-time" type="time" onchange="rememberMomentDraft()"></label></div><label class="moment-link-label" for="moment-record-link">일정 연결 (선택)</label><select id="moment-record-link" onchange="rememberMomentDraft()"></select><div class="activity-field-heading"><label for="moment-record-text">기억하고 싶은 순간</label><button type="button" id="moment-record-ai" class="companion-button" onclick="generateMomentEssay()">AI로 다듬기</button></div><textarea id="moment-record-text" rows="5" maxlength="20000" oninput="rememberMomentDraft()" placeholder="맛있었던 한 입, 만난 사람, 잊고 싶지 않은 장면… 한 줄도 좋아요."></textarea><details id="moment-record-original-wrap" hidden><summary>AI 다듬기 전 원문</summary><p id="moment-record-original"></p></details><div class="activity-field-heading"><div><strong>사진</strong><p>보관본의 비율을 유지하고 카드에는 대표사진 한 장을 보여요.</p></div><button type="button" id="moment-photo-add" class="companion-button" onclick="document.getElementById('moment-photo-input').click()">사진 추가</button></div><input id="moment-photo-input" type="file" accept="image/*" multiple hidden onchange="addMomentPhotos(event)"><div id="moment-record-photos"></div><p id="moment-record-feedback" role="status" aria-live="polite"></p></div><footer class="activity-sheet-footer moment-sheet-footer"><button type="button" id="moment-record-delete" class="companion-button" onclick="deleteMomentRecord()">삭제</button><button type="button" class="companion-button" onclick="downloadMomentDraft()">글 파일 보관</button><button type="button" id="moment-record-save" class="companion-button companion-primary" onclick="saveMomentRecord()">기록 저장</button></footer><div id="moment-record-viewer" hidden><button type="button" class="companion-button" onclick="closeMomentPhotoViewer()">사진 닫기</button><img id="moment-record-full-photo" alt="선택한 순간 사진 크게 보기"></div></div>`;
  const visibility=document.createElement('div');visibility.className='moment-visibility-field';
  visibility.innerHTML='<label class="moment-link-label" for="moment-record-visibility">기록 공개 범위</label><select id="moment-record-visibility" onchange="rememberMomentDraft()"><option value="private">나만 보기</option><option value="shared">공유에 포함할 기록</option></select><p>이 표시로 자동 공유되지는 않아요. 실제 포함 범위는 공유 화면에서 확인해 주세요.</p>';
  modal.querySelector('.activity-field-heading').before(visibility);
  // 공통 AI 검토 시트가 DOM에서 뒤에 있어 승인 버튼이 순간 편집 시트 위에 뜬다.
  const review=document.getElementById('modal-ai-draft-review');
  if(review?.parentNode)review.parentNode.insertBefore(modal,review);else document.body.appendChild(modal);
}
function setMomentFeedback(message) { const element=document.getElementById('moment-record-feedback');if(element)element.textContent=message; }
function momentEditorDirty() {
  if(typeof State==='undefined')return false;
  const editor=State.momentRecordEditor;
  if(!editor)return false;rememberMomentDraft();
  return editor.loading || JSON.stringify(editor.draft)!==editor.savedDraft;
}
function rememberMomentDraft() {
  const editor=State.momentRecordEditor;if(!editor)return;
  const text=document.getElementById('moment-record-text'),date=document.getElementById('moment-record-date'),time=document.getElementById('moment-record-time'),link=document.getElementById('moment-record-link');
  if(!text)return;
  editor.draft.text=text.value;editor.draft.date=date.value;editor.draft.time=time.value;
  editor.draft.visibility=document.getElementById('moment-record-visibility').value;
  editor.draft.activityLink=editor.linkOptions?.[link.value] || null;
  const trip=State.trips.find(t=>t.id===editor.tripId),dayIndex=trip?.days?.findIndex(day=>day.date===date.value);
  editor.draft.dayIndex=dayIndex>=0?dayIndex:editor.initialDayIndex;
}
function openMomentJournal(dayIndex = State.activeJournalDay, entryId = null, event) {
  event?.stopPropagation();const trip=getActiveTrip();if(!trip)return;
  ensureMomentJournalModal();const previous=State.momentRecordEditor;
  if(previous&&momentEditorDirty()){
    if(previous.tripId===trip.id&&entryId&&previous.entryId===entryId){openModal('modal-moment-record');return;}
    if(!confirm('저장하지 않은 순간 기록이 있습니다. 다른 기록을 열까요?'))return;
  }
  closeMomentPhotoViewer();
  const entry=entryId?momentEntries(trip).find(item=>item.id===entryId):null;if(entryId&&!entry){showToast('기록을 찾지 못했습니다.');return;}
  const day=trip.days?.[dayIndex],local=momentLocalDateTime(trip);
  const draft={date:entry?.date || (/^\d{4}-\d{2}-\d{2}$/.test(day?.date || '')?day.date:local.date),time:entry?.time ?? local.time,dayIndex:entry?.dayIndex ?? dayIndex,text:entry?.text || '',photos:[...(entry?.photos || [])],photoThumbnails:[...(entry?.photoThumbnails || [])],mediaIds:[...(entry?.mediaIds || [])],coverIndex:entry?.coverIndex || 0,activityLink:entry?.activityLink || null,visibility:entry?.visibility==='shared'?'shared':'private'};
  const linkOptions={};
  (trip.days || []).forEach((linkDay,di)=>(linkDay.spots || []).forEach((spot,si)=>{linkOptions[`${di}:${si}`]={dayIndex:di,spotIndex:si,title:spot.title || '일정',date:linkDay.date || '',time:spot.time || '',city:linkDay.city || '',...(spot.recordId?{recordId:spot.recordId}:{}),...(spot.id?{spotId:spot.id}:{})};}));
  let selected='';
  if(draft.activityLink){selected=Object.keys(linkOptions).find(key=>{const item=linkOptions[key],saved=draft.activityLink;return saved.recordId?item.recordId===saved.recordId:saved.spotId?item.spotId===saved.spotId:item.dayIndex===saved.dayIndex&&item.spotIndex===saved.spotIndex&&item.title===saved.title;}) || 'archived';if(selected==='archived')linkOptions.archived=draft.activityLink;}
  State.momentRecordEditor={tripId:trip.id,entryId:entry?.id || `moment_${crypto.randomUUID()}`,draft,savedDraft:JSON.stringify(draft),baseEntry:JSON.stringify(entry || null),initialDayIndex:dayIndex,linkOptions,loading:false,aiBusy:false,returnFocus:document.activeElement};
  document.getElementById('moment-record-title').textContent=entry?'순간 기록 수정':'새 순간 남기기';
  document.getElementById('moment-record-meta').textContent=[draft.date,day?.city].filter(Boolean).join(' · ');
  document.getElementById('moment-record-date').value=draft.date;document.getElementById('moment-record-time').value=draft.time;document.getElementById('moment-record-text').value=draft.text;
  document.getElementById('moment-record-visibility').value=draft.visibility;
  document.getElementById('moment-record-link').innerHTML='<option value="">일정 없이 기록</option>'+Object.entries(linkOptions).map(([key,item])=>`<option value="${escapeHtml(key)}">${key==='archived'?'변경 전 일정 · ':''}${escapeHtml([item.date,item.time,item.title].filter(Boolean).join(' · '))}</option>`).join('');document.getElementById('moment-record-link').value=selected;
  document.getElementById('moment-record-original').textContent=entry?.originalText || '';document.getElementById('moment-record-original-wrap').hidden=!entry?.originalText;document.getElementById('moment-record-delete').hidden=!entry;
  setMomentFeedback('한 줄 또는 사진만 저장할 수 있어요. 기존 하루 회고는 그대로 남습니다.');renderMomentPhotos();openModal('modal-moment-record');
  if(!history.state?.stMomentSheet)history.pushState({...history.state,stMomentSheet:true},'');
  document.getElementById('moment-record-text').focus({preventScroll:true});
}
function closeMomentPhotoViewer() {
  const viewer=document.getElementById('moment-record-viewer');if(viewer)viewer.hidden=true;
  State.momentPhotoRequest=(State.momentPhotoRequest || 0)+1;
  if(State.momentPhotoUrl)SulsulTravel.mediaRepository.release(State.momentPhotoUrl);State.momentPhotoUrl=null;
}
function closeMomentJournal(force = false, { fromHistory = false } = {}) {
  const modal=document.getElementById('modal-moment-record');if(!modal||modal.classList.contains('sheet-closed'))return true;
  if(!force&&momentEditorDirty()&&!confirm('작성 중인 순간 기록이 있습니다. 저장하지 않고 닫을까요?'))return false;
  const focus=State.momentRecordEditor?.returnFocus;closeMomentPhotoViewer();modal.classList.add('sheet-closed');State.momentRecordEditor=null;
  if(!document.querySelector('.sheet-container:not(.sheet-closed)'))document.body.style.overflow=document.getElementById('plan-block-detail-page')?.classList.contains('hidden')?'':'hidden';
  focus?.focus?.({preventScroll:true});if(!fromHistory&&history.state?.stMomentSheet)history.back();return true;
}
function renderMomentPhotos() {
  const editor=State.momentRecordEditor;if(!editor)return;
  document.getElementById('moment-record-photos').innerHTML=editor.draft.photos.map((_,index)=>`<div class="activity-photo-tile"><button type="button" onclick="viewMomentPhoto(${index})" aria-label="사진 ${index+1} 크게 보기"><img src="${escapeHtml(momentPhotoSource(editor.draft,index,true))}" alt="순간 사진 ${index+1}"></button><button type="button" class="activity-cover-choice" onclick="setMomentCover(${index})" aria-pressed="${index===editor.draft.coverIndex}">${index===editor.draft.coverIndex?'대표사진':'대표로 선택'}</button><button type="button" class="activity-remove-photo" onclick="removeMomentPhoto(${index})" aria-label="사진 ${index+1} 삭제">×</button></div>`).join('');
  ['moment-photo-add','moment-record-save','moment-record-delete'].forEach(id=>document.getElementById(id).disabled=editor.loading);
  document.getElementById('moment-record-ai').disabled=editor.loading||editor.aiBusy;
}
function setMomentCover(index) { const editor=State.momentRecordEditor;if(editor&&index>=0&&index<editor.draft.photos.length){editor.draft.coverIndex=index;renderMomentPhotos();} }
function removeMomentPhoto(index) {
  const editor=State.momentRecordEditor;if(!editor||editor.loading||!confirm('이 사진을 순간 기록에서 제외할까요? 저장하면 반영됩니다.'))return;
  const draft=editor.draft;draft.photos.splice(index,1);draft.photoThumbnails.splice(index,1);draft.mediaIds.splice(index,1);draft.coverIndex=index===draft.coverIndex?0:Math.max(0,draft.coverIndex-(index<draft.coverIndex?1:0));closeMomentPhotoViewer();renderMomentPhotos();
}
async function viewMomentPhoto(index) {
  const editor=State.momentRecordEditor;if(!editor?.draft.photos[index])return;
  closeMomentPhotoViewer();const viewer=document.getElementById('moment-record-viewer'),image=document.getElementById('moment-record-full-photo');viewer.hidden=false;image.src=momentPhotoSource(editor.draft,index);
  const request=State.momentPhotoRequest;
  const url=await SulsulTravel.mediaRepository.resolve(editor.draft,index);
  if(State.momentPhotoRequest===request&&State.momentRecordEditor===editor&&!viewer.hidden){State.momentPhotoUrl=url;image.src=url;}else SulsulTravel.mediaRepository.release(url);
}
async function addMomentPhotos(event) {
  const editor=State.momentRecordEditor,files=Array.from(event.target.files || []);event.target.value='';if(!editor||editor.loading||!files.length)return;
  if(editor.draft.photos.length+files.length>8){setMomentFeedback('한 순간에 사진은 최대 8장까지 남길 수 있어요.');return;}
  editor.loading=true;renderMomentPhotos();setMomentFeedback('사진의 비율을 유지해 보관본과 썸네일을 준비하고 있습니다…');
  try {
    const prepared=[];for(const file of files)prepared.push(await SulsulTravel.mediaRepository.prepare(file,{tripId:editor.tripId}));
    while(editor.draft.photoThumbnails.length<editor.draft.photos.length)editor.draft.photoThumbnails.push(null);while(editor.draft.mediaIds.length<editor.draft.photos.length)editor.draft.mediaIds.push(null);
    editor.draft.photos.push(...prepared.map(photo=>photo.source));editor.draft.photoThumbnails.push(...prepared.map(photo=>photo.thumbnail));editor.draft.mediaIds.push(...prepared.map(photo=>photo.mediaId));
    if(State.momentRecordEditor===editor)setMomentFeedback('사진이 준비되었습니다. 기록 저장을 눌러 보관하세요.');
  }catch(error){if(State.momentRecordEditor===editor)setMomentFeedback(error.message || '사진을 준비하지 못했습니다. 원본 파일은 다시 선택할 수 있어요.');}
  finally{editor.loading=false;if(State.momentRecordEditor===editor)renderMomentPhotos();}
}
function refreshMomentSurfaces() { if(typeof rememberJournalDraft==='function')rememberJournalDraft();if(typeof refreshActivitySurfaces==='function')refreshActivitySurfaces();else if(typeof renderJournalTab==='function')renderJournalTab(); }
function saveMomentRecord({quiet=false}={}) {
  const editor=State.momentRecordEditor;if(!editor||editor.loading)return false;rememberMomentDraft();
  if(!editor.draft.text.trim()&&!editor.draft.photos.length){setMomentFeedback('한 줄의 글 또는 사진을 먼저 남겨 주세요.');return false;}
  if(!/^\d{4}-\d{2}-\d{2}$/.test(editor.draft.date)||!Number.isFinite(new Date(`${editor.draft.date}T12:00:00`).getTime())){setMomentFeedback('기록 날짜를 확인해 주세요.');return false;}
  if(editor.draft.time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(editor.draft.time)){setMomentFeedback('기록 시각을 확인해 주세요.');return false;}
  if(!['private','shared'].includes(editor.draft.visibility)){setMomentFeedback('기록 공개 범위를 확인해 주세요.');return false;}
  try {
    const trip=State.trips.find(t=>t.id===editor.tripId);if(!trip)throw new Error('여행을 찾지 못했습니다. 글 파일로 먼저 보관해 주세요.');
    const current=momentEntries(trip).find(entry=>entry.id===editor.entryId);if(JSON.stringify(current || null)!==editor.baseEntry)throw new Error('다른 화면에서 이 순간 기록이 변경되었습니다. 글 파일로 보관한 뒤 다시 열어 주세요.');
    const next=JSON.parse(JSON.stringify(State.trips)),copy=next.find(t=>t.id===trip.id),now=new Date().toISOString();copy.momentEntries=momentEntries(copy);
    const index=copy.momentEntries.findIndex(entry=>entry.id===editor.entryId),entry={...current,...editor.draft,id:editor.entryId,createdAt:current?.createdAt || now,updatedAt:now};
    if(index>=0)copy.momentEntries[index]=entry;else copy.momentEntries.push(entry);
    State.trips=TripRepository.saveAll(next,{bumpTripId:trip.id});editor.baseEntry=JSON.stringify(momentEntries(State.trips.find(t=>t.id===trip.id)).find(entry=>entry.id===editor.entryId));editor.savedDraft=JSON.stringify(editor.draft);
    document.getElementById('moment-record-delete').hidden=false;document.getElementById('moment-record-title').textContent='순간 기록 수정';refreshMomentSurfaces();setMomentFeedback('이 순간을 기기에 저장했습니다. 다른 기록은 그대로 남아 있습니다.');if(!quiet)showToast('순간 기록을 저장했습니다.');return true;
  }catch(error){setMomentFeedback((typeof isStorageWriteFailure==='function'&&isStorageWriteFailure(error))?'저장 공간이 부족합니다. 글과 사진 초안은 이 창에 남아 있습니다. 글 파일로 보관하거나 공간 확보 후 다시 저장해 주세요.':error.message);return false;}
}
function deleteMomentRecord() {
  const editor=State.momentRecordEditor;if(!editor||editor.loading)return false;rememberMomentDraft();
  if(!confirm('이 순간의 글과 사진을 삭제할까요? 다른 순간과 하루 회고는 그대로이며 되돌릴 수 없습니다.'))return false;
  try {
    const trip=State.trips.find(t=>t.id===editor.tripId),entry=momentEntries(trip).find(item=>item.id===editor.entryId);if(!trip||JSON.stringify(entry || null)!==editor.baseEntry)throw new Error('기록이 변경되었습니다. 다시 열어 확인한 뒤 삭제해 주세요.');
    const next=JSON.parse(JSON.stringify(State.trips)),copy=next.find(t=>t.id===trip.id);copy.momentEntries=momentEntries(copy).filter(item=>item.id!==editor.entryId);State.trips=TripRepository.saveAll(next,{bumpTripId:trip.id});closeMomentJournal(true);refreshMomentSurfaces();showToast('순간 기록을 삭제했습니다.');return true;
  }catch(error){setMomentFeedback('삭제하지 못했습니다. 기존 기록과 작성 중인 글은 그대로입니다. '+(error.message || ''));return false;}
}
function downloadMomentDraft() { rememberMomentDraft();const editor=State.momentRecordEditor;if(editor)downloadTravelFile(`${editor.draft.date} ${editor.draft.time}\n\n${editor.draft.text}`,`술술-순간-${editor.draft.date}.txt`,'text/plain;charset=utf-8'); }
async function generateMomentEssay() {
  const editor=State.momentRecordEditor;if(!editor||editor.loading||editor.aiBusy)return;rememberMomentDraft();
  if(!editor.draft.text.trim()){setMomentFeedback('AI가 다듬을 글을 먼저 적어 주세요.');return;}
  if(!saveMomentRecord({quiet:true}))return;
  const trip=State.trips.find(t=>t.id===editor.tripId),sourceText=editor.draft.text;editor.aiBusy=true;renderMomentPhotos();setMomentFeedback('원문을 저장했습니다. AI 제안을 준비하고 있습니다…');
  try {
    const result=await startAiDraftJob({id:`moment:${editor.entryId}:${Date.now()}`,tripId:trip.id,targetId:editor.entryId,kind:'moment-journal',baseRevision:trip.revision || 0,input:{entryId:editor.entryId,sourceText,prompt:`당신은 여행 에세이 편집자입니다. 아래 원문만 자연스러운 1인칭 한국어로 다듬으세요. 짧은 글은 짧게 유지하세요. 원문에 없는 장소, 사건, 인물, 감정, 금액은 만들지 마세요. 사진을 분석했다고 말하지 마세요.\n원문: ${sourceText}`}});
    if(State.momentRecordEditor===editor)setMomentFeedback(result?.state==='awaiting_review'?'AI 제안을 비교하고 승인하면 적용됩니다.':'AI 제안을 만들지 못했습니다. 저장된 원문은 그대로입니다.');
  }catch(_){if(State.momentRecordEditor===editor)setMomentFeedback('AI 연결을 확인해 주세요. 저장된 원문은 그대로입니다.');}
  finally{editor.aiBusy=false;if(State.momentRecordEditor===editor)renderMomentPhotos();}
}
function applyMomentAiDraft(job) {
  const trip=State.trips.find(t=>t.id===job.tripId),entry=momentEntries(trip).find(item=>item.id===job.input.entryId),editor=State.momentRecordEditor;
  if(!entry||entry.text!==job.input.sourceText||(editor?.entryId===entry.id&&editor.tripId===trip.id&&momentEditorDirty()))return 'conflict';
  const result=TripRepository.applyDraft(State.trips,{tripId:trip.id,baseRevision:job.baseRevision,jobId:job.id,mutate:copy=>{
    const record=copy.momentEntries.find(item=>item.id===entry.id);record.originalText=record.originalText || job.input.sourceText;record.text=job.draft.text;record.aiDraftAcceptedAt=new Date().toISOString();record.updatedAt=record.aiDraftAcceptedAt;
  }});
  if(result.status==='applied'){
    State.trips=result.trips;const accepted=momentEntries(State.trips.find(t=>t.id===trip.id)).find(item=>item.id===entry.id);
    if(editor?.entryId===entry.id&&editor.tripId===trip.id){editor.draft.text=accepted.text;editor.savedDraft=JSON.stringify(editor.draft);editor.baseEntry=JSON.stringify(accepted);document.getElementById('moment-record-text').value=accepted.text;document.getElementById('moment-record-original').textContent=accepted.originalText;document.getElementById('moment-record-original-wrap').hidden=false;}
    refreshMomentSurfaces();
  }
  return result.status;
}
if(typeof window!=='undefined'){
  window.addEventListener('keydown',event=>{
    const modal=document.getElementById('modal-moment-record');if(event.key!=='Escape'||!modal||modal.classList.contains('sheet-closed'))return;
    if(document.getElementById('modal-ai-draft-review')&&!document.getElementById('modal-ai-draft-review').classList.contains('sheet-closed'))return;
    event.preventDefault();event.stopImmediatePropagation();if(!document.getElementById('moment-record-viewer').hidden)closeMomentPhotoViewer();else closeMomentJournal();
  },true);
  window.addEventListener('popstate',async event=>{
    const modal=document.getElementById('modal-moment-record');if(!modal||modal.classList.contains('sheet-closed'))return;
    event.stopImmediatePropagation();
    if(!document.getElementById('moment-record-viewer').hidden){closeMomentPhotoViewer();history.pushState({...history.state,stMomentSheet:true},'');return;}
    const review=document.getElementById('modal-ai-draft-review');if(review&&!review.classList.contains('sheet-closed')){await rejectActiveAiDraft();history.pushState({...history.state,stMomentSheet:true},'');return;}
    if(!closeMomentJournal(false,{fromHistory:true}))history.pushState({...history.state,stMomentSheet:true},'');
  },true);
  window.addEventListener('beforeunload',event=>{if(momentEditorDirty()){event.preventDefault();event.returnValue='';}});
  window.SulsulTravel=window.SulsulTravel || {};window.SulsulTravel.MomentJournal={entries:momentEntries,feedEntries:momentFeedEntries,localDateTime:momentLocalDateTime,mount:mountMomentJournalFeed};
}
if(typeof module!=='undefined'&&module.exports)module.exports={momentEntries,momentFeedEntries,momentLocalDateTime};
