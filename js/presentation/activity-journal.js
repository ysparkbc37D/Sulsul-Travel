/* 일정 기록은 완료 상태와 독립적으로 보존한다. 카드에는 대표사진 하나만 표시한다. */
function activityEntries(trip) { return Object.values(trip?.activityRecords || {}); }
function activityLocation(trip, recordId) {
  for (const [dayIndex, day] of (trip?.days || []).entries()) {
    const spotIndex = (day.spots || []).findIndex(s => s.recordId === recordId);
    if (spotIndex >= 0) return {day, dayIndex, spot:day.spots[spotIndex], spotIndex};
  }
  return null;
}
function activityContext(day, spot) {
  return {title:spot.title || '일정', date:day.date || '', city:day.city || '', time:spot.time || ''};
}
function activityCardHtml(spot, dayIndex, spotIndex) {
  const record = getActiveTrip()?.activityRecords?.[spot.recordId];
  const photo = record?.photos?.[record.coverIndex || 0];
  return `<button class="activity-record-card" onclick="openActivityJournal(${dayIndex},${spotIndex},event)" aria-label="${escapeHtml(spot.title || '일정')} 기록 ${record ? '보기' : '남기기'}">
    ${photo ? `<img class="activity-cover" src="${escapeHtml(SulsulTravel.TripTransfer.safePhoto(photo))}" alt="일정 대표사진" loading="lazy">` : '<span class="activity-record-icon"><i class="fa-solid fa-book-open" aria-hidden="true"></i></span>'}
    <span class="activity-record-copy"><strong>${record ? '이 순간의 기록' : '사진 · 짧은 글 남기기'}</strong><span>${escapeHtml(record?.text || (record?.photos?.length ? '사진으로 남긴 순간' : '완료 전에도 기록할 수 있어요'))}</span>${record?.photos?.length ? `<small>사진 ${record.photos.length}장 · 기록 열기</small>` : ''}</span>
    <i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>`;
}
function activityEditorDirty() {
  const editor = State.activityRecordEditor;
  return !!editor && (editor.loading || JSON.stringify(editor.draft) !== editor.savedDraft);
}
function setActivityFeedback(message) {
  document.getElementById('activity-record-feedback').textContent = message;
}
function rememberActivityText() {
  const editor = State.activityRecordEditor;
  if (editor) editor.draft.text = document.getElementById('activity-record-text').value;
}
function openActivityJournal(dayIndex, spotIndex, event) {
  event?.stopPropagation();
  const trip = getActiveTrip(), day = trip?.days?.[dayIndex], spot = day?.spots?.[spotIndex];
  if (!spot) return;
  openActivityRecordEditor(trip, spot.recordId || `record_${crypto.randomUUID()}`, {day,dayIndex,spot,spotIndex});
}
function openArchivedActivityRecord(index) {
  const trip = getActiveTrip(), record = activityEntries(trip)[index];
  if (record) openActivityRecordEditor(trip, record.id, activityLocation(trip,record.id));
}
function openActivityRecordEditor(trip, recordId, location) {
  const previous = State.activityRecordEditor;
  if (previous && activityEditorDirty()) {
    if (previous.tripId === trip.id && previous.recordId === recordId) { openModal('modal-activity-record'); return; }
    if (!confirm('저장하지 않은 일정 기록이 있습니다. 다른 기록을 열까요?')) return;
  }
  const record = trip.activityRecords?.[recordId];
  const draft = {text:record?.text || '',photos:[...(record?.photos || [])],coverIndex:record?.coverIndex || 0};
  State.activityRecordEditor = {tripId:trip.id,recordId,draft,savedDraft:JSON.stringify(draft),baseRecord:JSON.stringify(record || null),
    context:location ? activityContext(location.day,location.spot) : record.context,
    sourceSpot:location?.spot,sourceIdentity:location ? JSON.stringify(location.spot) : null,loading:false};
  document.getElementById('activity-record-title').textContent = State.activityRecordEditor.context.title;
  document.getElementById('activity-record-meta').textContent = [State.activityRecordEditor.context.date,State.activityRecordEditor.context.time,State.activityRecordEditor.context.city].filter(Boolean).join(' · ');
  document.getElementById('activity-record-text').value = draft.text;
  document.getElementById('activity-record-original').textContent = record?.originalText || '';
  document.getElementById('activity-record-original-wrap').hidden = !record?.originalText;
  document.getElementById('activity-record-viewer').hidden = true;
  setActivityFeedback(record ? '저장된 기록입니다. 수정 후 저장해 주세요.' : '사진만, 글만 남겨도 좋아요. 일정 완료 여부는 바뀌지 않습니다.');
  renderActivityPhotos(); openModal('modal-activity-record');
  if (!history.state?.stActivitySheet) history.pushState({...history.state,stActivitySheet:true},'');
}
function renderActivityPhotos() {
  const editor = State.activityRecordEditor; if (!editor) return;
  document.getElementById('activity-record-photos').innerHTML = editor.draft.photos.map((p,index)=>`<div class="activity-photo-tile">
    <button onclick="viewActivityPhoto(${index})" aria-label="사진 ${index+1} 크게 보기"><img src="${escapeHtml(SulsulTravel.TripTransfer.safePhoto(p))}" alt="사진 ${index+1}"></button>
    <button class="activity-cover-choice" onclick="setActivityCover(${index})" aria-pressed="${index===editor.draft.coverIndex}">${index===editor.draft.coverIndex?'대표사진':'대표로 선택'}</button>
    <button class="activity-remove-photo" onclick="removeActivityPhoto(${index})" aria-label="사진 ${index+1} 삭제"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button></div>`).join('');
  document.getElementById('activity-photo-add').disabled = editor.loading;
  document.getElementById('activity-record-save').disabled = editor.loading;
}
function setActivityCover(index) { State.activityRecordEditor.draft.coverIndex=index; renderActivityPhotos(); }
function viewActivityPhoto(index) {
  const source=State.activityRecordEditor?.draft.photos[index]; if (!source) return;
  document.getElementById('activity-record-full-photo').src=SulsulTravel.TripTransfer.safePhoto(source);
  document.getElementById('activity-record-viewer').hidden=false;
}
function removeActivityPhoto(index) {
  if (!confirm('이 사진을 기록에서 제외할까요? 저장하면 반영됩니다.')) return;
  const draft=State.activityRecordEditor.draft;
  draft.photos.splice(index,1);
  draft.coverIndex=index===draft.coverIndex?0:Math.max(0,draft.coverIndex-(index<draft.coverIndex?1:0));
  document.getElementById('activity-record-viewer').hidden=true;
  renderActivityPhotos();
}
function compressActivityPhoto(file) {
  return new Promise((resolve,reject)=>{
    if (file.size>20*1024*1024) { reject(new Error('사진 한 장은 20MB 이하로 선택해 주세요.')); return; }
    const url=URL.createObjectURL(file),img=new Image();
    const fail=()=>{URL.revokeObjectURL(url);reject(new Error('사진을 읽지 못했습니다. JPEG 또는 PNG 사진으로 다시 선택해 주세요.'));};
    img.onerror=fail;
    img.onload=()=>{
      try {
        const canvas=document.createElement('canvas');canvas.width=336;canvas.height=448;
        const ctx=canvas.getContext('2d'),scale=Math.max(336/img.width,448/img.height);
        ctx.fillStyle='#ffffff';ctx.fillRect(0,0,336,448);
        ctx.drawImage(img,(336-img.width*scale)/2,(448-img.height*scale)/2,img.width*scale,img.height*scale);
        resolve(canvas.toDataURL('image/jpeg',.8));
      } catch (_) { reject(new Error('사진을 처리하지 못했습니다. 다른 사진을 선택해 주세요.')); }
      finally { URL.revokeObjectURL(url); }
    };
    img.src=url;
  });
}
async function addActivityPhotos(event) {
  const editor=State.activityRecordEditor,files=Array.from(event.target.files || []);event.target.value='';
  if (!editor || editor.loading || !files.length) return;
  if (editor.draft.photos.length+files.length>8) {setActivityFeedback('한 일정에 사진은 최대 8장까지 남길 수 있어요.');return;}
  editor.loading=true;renderActivityPhotos();setActivityFeedback('사진을 준비하고 있습니다…');
  try {
    const photos=[];
    for (const file of files) photos.push(await compressActivityPhoto(file));
    editor.draft.photos.push(...photos);
    if (State.activityRecordEditor===editor) setActivityFeedback('사진이 준비되었습니다. 기록 저장을 눌러 보관하세요.');
  } catch (error) {if(State.activityRecordEditor===editor)setActivityFeedback(error.message);}
  finally {editor.loading=false;if(State.activityRecordEditor===editor)renderActivityPhotos();}
}
function resolveActivityEditorTarget(trip,editor) {
  const located=activityLocation(trip,editor.recordId);if(located)return located;
  if (trip.activityRecords?.[editor.recordId]) return null;
  const spots=(trip.days || []).flatMap((day,dayIndex)=>(day.spots || []).map((spot,spotIndex)=>({day,dayIndex,spot,spotIndex})));
  const same=spots.find(x=>x.spot===editor.sourceSpot);if(same)return same;
  const candidates=spots.filter(x=>JSON.stringify(x.spot)===editor.sourceIdentity);
  if(candidates.length===1)return candidates[0];
  throw new Error('일정이 변경되어 연결할 수 없습니다. 글 파일로 보관한 뒤 해당 일정을 다시 열어 주세요.');
}
function saveActivityRecord({quiet=false}={}) {
  const editor=State.activityRecordEditor;if(!editor || editor.loading)return false;
  rememberActivityText();
  if(!editor.draft.text.trim() && !editor.draft.photos.length){setActivityFeedback('짧은 글 또는 사진을 먼저 남겨 주세요.');return false;}
  try {
    const trip=State.trips.find(t=>t.id===editor.tripId);
    if(!trip)throw new Error('여행을 찾지 못했습니다. 글 파일로 먼저 보관해 주세요.');
    if(JSON.stringify(trip.activityRecords?.[editor.recordId] || null)!==editor.baseRecord)throw new Error('다른 화면에서 기록이 변경되었습니다. 현재 글을 파일로 보관한 뒤 다시 열어 주세요.');
    const target=resolveActivityEditorTarget(trip,editor);
    const next=JSON.parse(JSON.stringify(State.trips)),copy=next.find(t=>t.id===trip.id);
    const context=target?activityContext(target.day,target.spot):editor.context;
    if(target)copy.days[target.dayIndex].spots[target.spotIndex].recordId=editor.recordId;
    copy.activityRecords=copy.activityRecords || {};
    copy.activityRecords[editor.recordId]={...copy.activityRecords[editor.recordId],id:editor.recordId,...editor.draft,context,updatedAt:new Date().toISOString()};
    State.trips=TripRepository.saveAll(next,{bumpTripId:trip.id});
    editor.baseRecord=JSON.stringify(State.trips.find(t=>t.id===trip.id).activityRecords[editor.recordId]);
    editor.savedDraft=JSON.stringify(editor.draft);editor.context=context;
    refreshActivitySurfaces();
    setActivityFeedback('기록을 저장했습니다. 일정 완료 여부는 그대로입니다.');
    if(!quiet)showToast('사진과 글을 일정 기록에 저장했습니다.');
    return true;
  } catch(error) {setActivityFeedback(isStorageWriteFailure(error)?'저장 공간이 부족합니다. 초안은 이 창에 남아 있습니다. 글 파일로 보관하거나 공간 확보 후 다시 저장해 주세요.':error.message);return false;}
}
function downloadActivityText() {
  rememberActivityText();const editor=State.activityRecordEditor;if(!editor)return;
  downloadTravelFile(`${editor.context.title}\n${editor.context.date} ${editor.context.time}\n\n${editor.draft.text}`,'sulsul-activity.txt','text/plain;charset=utf-8');
}
function refreshActivitySurfaces() {
  if(!getActiveTrip())return;
  renderTimelineTab();renderBigPlanTab();renderTodayTab();
  if(State.activePlanBlockId)renderPlanBlockDetail();
  renderJournalTab();
  const trip=getActiveTrip(),entries=[...Object.values(trip.journals || {}),...activityEntries(trip)];
  document.getElementById('stat-ws-diaries').textContent=`${entries.length}편 / ${entries.reduce((sum,r)=>sum+(r.photos?.length || 0),0)}장`;
  renderLifetimeAnalytics();
}
async function generateActivityEssay() {
  const editor=State.activityRecordEditor;if(!editor || editor.aiBusy || editor.loading)return;
  rememberActivityText();if(!editor.draft.text.trim()){setActivityFeedback('AI가 다듬을 글을 먼저 적어 주세요.');return;}
  if(!saveActivityRecord({quiet:true}))return;
  const trip=State.trips.find(t=>t.id===editor.tripId),sourceText=editor.draft.text;
  editor.aiBusy=true;document.getElementById('activity-record-ai').disabled=true;
  setActivityFeedback('원문을 저장했습니다. AI 제안을 준비하고 있습니다…');
  try {
    const result=await startAiDraftJob({id:`activity:${editor.recordId}:${Date.now()}`,tripId:trip.id,targetId:editor.recordId,kind:'activity-journal',baseRevision:trip.revision || 0,
      input:{recordId:editor.recordId,sourceText,prompt:`당신은 여행 에세이 편집자입니다. 아래 원문만 자연스러운 1인칭 한국어 1~2문단으로 다듬으세요. 원문에 없는 장소, 사건, 인물, 감정, 금액은 만들지 마세요. 사진을 분석했다고 말하지 마세요.\n원문: ${sourceText}`}});
    if(State.activityRecordEditor===editor)setActivityFeedback(result?.state==='awaiting_review'?'AI 제안을 확인하고 적용해 주세요.':'AI 제안을 만들지 못했습니다. 저장된 원문은 그대로입니다.');
  }catch(_){if(State.activityRecordEditor===editor)setActivityFeedback('AI 연결을 확인해 주세요. 저장된 원문은 그대로입니다.');}
  finally {editor.aiBusy=false;document.getElementById('activity-record-ai').disabled=false;}
}
function applyActivityAiDraft(job) {
  const trip=State.trips.find(t=>t.id===job.tripId),record=trip?.activityRecords?.[job.input.recordId];
  const editor=State.activityRecordEditor;
  if(!record || record.text!==job.input.sourceText || (editor?.recordId===record.id && editor.tripId===trip.id && activityEditorDirty()))return 'conflict';
  const result=TripRepository.applyDraft(State.trips,{tripId:job.tripId,baseRevision:job.baseRevision,jobId:job.id,mutate:copy=>{
    const entry=copy.activityRecords[job.input.recordId];entry.originalText=job.input.sourceText;entry.text=job.draft.text;entry.aiDraftAcceptedAt=new Date().toISOString();entry.updatedAt=entry.aiDraftAcceptedAt;
  }});
  if(result.status==='applied'){
    State.trips=result.trips;
    if(editor?.recordId===record.id && editor.tripId===trip.id){editor.draft.text=job.draft.text;editor.savedDraft=JSON.stringify(editor.draft);editor.baseRecord=JSON.stringify(State.trips.find(t=>t.id===trip.id).activityRecords[record.id]);document.getElementById('activity-record-text').value=job.draft.text;document.getElementById('activity-record-original').textContent=job.input.sourceText;document.getElementById('activity-record-original-wrap').hidden=false;}
  }
  return result.status;
}
function activityArchiveHtml(trip) {
  const records=activityEntries(trip);if(!records.length)return '';
  return `<section class="activity-archive"><h3>일정마다 남긴 순간 <span>${records.length}</span></h3>${records.map((record,index)=>{
    const location=activityLocation(trip,record.id),context=location?activityContext(location.day,location.spot):record.context;
    const photo=record.photos?.[record.coverIndex || 0];
    return `<button class="activity-record-card" onclick="openArchivedActivityRecord(${index})">${photo?`<img class="activity-cover" src="${escapeHtml(SulsulTravel.TripTransfer.safePhoto(photo))}" alt="일정 대표사진" loading="lazy">`:''}<span class="activity-record-copy"><small>${escapeHtml(context.date)} · ${escapeHtml(context.time)}${location?'':' · 일정 변경 전 기록'}</small><strong>${escapeHtml(context.title)}</strong><span>${escapeHtml(record.text || '사진으로 남긴 순간')}</span></span></button>`;
  }).join('')}</section>`;
}
function activityReportHtml(trip) {
  const records=activityEntries(trip);if(!records.length)return '';
  return `<section class="activity-report"><h2>일정별 여행 기록 · ${records.length}편</h2>${records.map(record=>{
    const location=activityLocation(trip,record.id),context=location?activityContext(location.day,location.spot):record.context;
    return `<article><h3>${escapeHtml(context.title)}</h3><p>${escapeHtml([context.date,context.time,context.city,location?(location.spot.completed?'방문 완료':'완료 전 기록'):'일정 변경 전 기록'].filter(Boolean).join(' · '))}</p><p class="activity-report-text">${escapeHtml(record.text)}</p>${record.originalText?`<p class="activity-report-text">AI 다듬기 전 원문: ${escapeHtml(record.originalText)}</p>`:''}<div class="activity-report-photos">${(record.photos || []).map(p=>`<img src="${escapeHtml(SulsulTravel.TripTransfer.safePhoto(p))}" alt="일정 기록 사진">`).join('')}</div></article>`;
  }).join('')}</section>`;
}
