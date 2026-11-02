/* 일정 변경과 긴 글 상세는 독립 화면에서 검토하고 기존 저장 command를 통해 확정한다. */
let scheduleChangeSession=null;
function ensureScheduleChangeModal(){
  if(document.getElementById('modal-schedule-change'))return;
  const modal=document.createElement('div');modal.id='modal-schedule-change';modal.className='sheet-container sheet-closed';
  modal.innerHTML=`<div class="sheet-scrim" onclick="closeModal('modal-schedule-change')"></div><div class="sheet-box activity-sheet" role="dialog" aria-modal="true" aria-labelledby="schedule-change-title"><header class="activity-sheet-header"><div><p>현장에서 계획 바꾸기</p><h3 id="schedule-change-title"></h3><p id="schedule-change-meta"></p></div><button class="companion-button" onclick="closeModal('modal-schedule-change')" aria-label="일정 변경 닫기">닫기</button></header><div class="activity-sheet-body schedule-change-body"><p id="schedule-change-note"></p><div class="schedule-direct-actions"><button class="companion-button" onclick="editManagedSchedule(false)">시간·내용 수정</button><button id="schedule-replace" class="companion-button" onclick="editManagedSchedule(true)">다른 일정으로 대체</button></div><label id="schedule-fixed-wrap"><input id="schedule-fixed-confirm" type="checkbox"> 고정 일정을 직접 변경하는 것을 확인했습니다.</label><label for="schedule-change-reason">변경 이유 (선택)</label><input id="schedule-change-reason" maxlength="300" placeholder="이동 지연, 휴식, 예약 취소 등"><button id="schedule-cancel" class="companion-button" onclick="applyScheduleCancellation()">이 일정 취소</button><section id="schedule-delay-section"><h4>이 일정부터 남은 일정 지연</h4><p>완료·고정·기록·취소 일정은 그대로 둡니다. 변경안을 확인한 뒤 적용하세요.</p><label for="schedule-delay-minutes">지연 시간 (분)</label><input id="schedule-delay-minutes" oninput="invalidateScheduleDelay()" type="number" min="1" max="720" step="1" value="30"><button class="companion-button" id="schedule-delay-preview" onclick="previewScheduleDelay()">지연 변경안 보기</button><div id="schedule-delay-changes"></div><button id="schedule-delay-apply" class="companion-button companion-primary" hidden onclick="applyScheduleDelay()">변경안 적용</button></section><p id="schedule-change-feedback" role="status" aria-live="polite"></p><button class="companion-button" onclick="deleteManagedSchedule()">일정표에서 삭제</button></div></div>`;
  document.body.append(modal);
}
function scheduleChangeTarget(){
  const session=scheduleChangeSession,trip=getActiveTrip();
  if(!session||trip?.id!==session.tripId||trip.revision!==session.revision)throw new Error('계획이 변경되었습니다. 창을 닫고 현재 일정에서 다시 열어 주세요.');
  const dayIndex=trip.days.findIndex(day=>day.id===session.dayId),spotIndex=trip.days[dayIndex]?.spots.findIndex(spot=>spot.id===session.spotId);
  if(dayIndex<0||spotIndex<0)throw new Error('대상 일정이 변경되었습니다. 다시 열어 주세요.');
  return {trip,day:trip.days[dayIndex],spot:trip.days[dayIndex].spots[spotIndex],dayIndex,spotIndex};
}
function scheduleChangeFeedback(error){document.getElementById('schedule-change-feedback').textContent=error?.message||String(error);return false;}
function invalidateScheduleDelay(){if(scheduleChangeSession)scheduleChangeSession.preview=null;document.getElementById('schedule-delay-apply').hidden=true;document.getElementById('schedule-delay-changes').replaceChildren();}
function refreshScheduleViews(){
  const y=window.scrollY,detail=document.getElementById('plan-block-detail-scroll'),detailY=detail?.scrollTop||0;
  const anchor=State.lastLiveScheduleChange?.itemId;
  const page=document.getElementById('plan-block-detail-page'),detailOpen=page&&!page.classList.contains('hidden');
  try{
    renderBigPlanTab();renderTodayTab();
    if(State.activeTab==='plan'&&document.getElementById('tab-content-plan').dataset.presentation==='timeline'&&!detailOpen)renderTimelineTab();
    if(detailOpen&&State.activePlanBlockId)renderPlanBlockDetail();
    if(State.activeTab==='plan'&&State.planSubTab==='map'){initOrUpdateLeafletMap();}
    if(State.activeTab==='plan'&&State.planSubTab==='cityguide')renderCityGuides();
    window.scrollTo({top:y,behavior:'instant'});if(detail)detail.scrollTop=detailY;
    requestAnimationFrame(()=>{window.scrollTo({top:y,behavior:'instant'});if(detail)detail.scrollTop=detailY;});
  }catch(error){console.warn('[일정 화면 갱신]',error);showToast('변경은 저장했습니다. 화면을 다시 열어 확인해 주세요.');}
}
function openScheduleChange(dayIndex,spotIndex,event){
  event?.stopPropagation();if(!requireSharedPlanEdit())return;
  const trip=getActiveTrip(),day=trip?.days[dayIndex],spot=day?.spots[spotIndex];if(!spot)return;
  ensureScheduleChangeModal();scheduleChangeSession={tripId:trip.id,revision:trip.revision,dayId:day.id,spotId:spot.id,preview:null};
  document.getElementById('schedule-change-title').textContent=spot.title;
  document.getElementById('schedule-change-meta').textContent=[day.date,spot.time,day.city].filter(Boolean).join(' · ');
  document.getElementById('schedule-change-note').textContent=spot.completed?'방문 완료 일정입니다. 취소·대체하려면 먼저 완료를 취소하세요. 글과 사진은 유지됩니다.':spot.fixed?'고정은 AI 자동 조정에서 보호하는 기능입니다. 직접 수정할 수 있으며 취소·대체는 아래 확인이 필요합니다.':'취소한 계획도 보관하고 다시 복구할 수 있습니다. 대체 시 원래 일정의 글·사진은 그대로 남습니다.';
  const retired=SulsulTravel.ScheduleChange.retired(spot);
  document.getElementById('schedule-fixed-wrap').hidden=!spot.fixed;
  document.getElementById('schedule-fixed-confirm').checked=false;
  document.getElementById('schedule-replace').disabled=Boolean(spot.completed||retired);
  document.getElementById('schedule-cancel').disabled=Boolean(spot.completed);
  document.getElementById('schedule-cancel').textContent=retired?'예정 일정으로 복구':'이 일정 취소';
  document.getElementById('schedule-delay-section').hidden=retired;
  document.getElementById('schedule-delay-minutes').value='30';
  document.getElementById('schedule-change-reason').value='';document.getElementById('schedule-change-feedback').textContent='';
  document.getElementById('schedule-delay-changes').replaceChildren();document.getElementById('schedule-delay-apply').hidden=true;
  openModal('modal-schedule-change');
}
function requireManualFixedChange(spot){if(spot.fixed&&!document.getElementById('schedule-fixed-confirm').checked)throw new Error('고정 일정 변경 확인을 체크해 주세요.');}
function editManagedSchedule(replace){
  try{
    const target=scheduleChangeTarget();if(replace){requireManualFixedChange(target.spot);if(target.spot.completed||SulsulTravel.ScheduleChange.retired(target.spot))throw new Error('완료 또는 취소한 일정은 바로 대체할 수 없습니다.');}
    closeModal('modal-schedule-change',true);openEditSpotModal(target.dayIndex,target.spotIndex);
    if(replace){
      document.getElementById('modal-spot').dataset.replacement='true';
      document.getElementById('spot-form-modal-title').textContent='대체 일정 만들기';
      document.getElementById('spot-form-notice').textContent='저장하면 원래 일정은 취소로 보관하고 새 일정을 추가합니다. 원래 글·사진은 유지됩니다.';
      for(const id of ['title','memo','tip','cost'])document.getElementById('spot-form-'+id).value='';
      document.getElementById('spot-form-fixed').checked=false;
    }
  }catch(error){scheduleChangeFeedback(error);}
}
function applyScheduleCancellation(){
  try{
    const {trip,day,spot}=scheduleChangeTarget();if(spot.completed)throw new Error('완료를 취소한 다음 변경해 주세요.');requireManualFixedChange(spot);
    const restore=SulsulTravel.ScheduleChange.retired(spot),reason=document.getElementById('schedule-change-reason').value.trim();
    const command=restore?{type:'restore',tripId:trip.id,dayId:day.id,itemId:spot.id}:{type:'update',tripId:trip.id,dayId:day.id,itemId:spot.id,changes:{skipped:true,cancelled:true,cancelReason:reason,cancelledAt:new Date().toISOString()}};
    if(!commitLiveSchedule(command,trip.revision,''))return scheduleChangeFeedback('변경을 저장하지 못했습니다. 입력을 유지했으니 다시 시도해 주세요.');
    closeModal('modal-schedule-change',true);refreshScheduleViews();showToast(restore?'예정 일정으로 복구했습니다. 대체 일정이 있다면 함께 확인해 주세요.':'일정을 취소로 보관했습니다. 언제든 복구할 수 있습니다.');return true;
  }catch(error){return scheduleChangeFeedback(error);}
}
function previewScheduleDelay(){
  try{
    const target=scheduleChangeTarget(),preview=SulsulTravel.ScheduleChange.previewDelay(target.day,target.spot.id,Number(document.getElementById('schedule-delay-minutes').value));
    scheduleChangeSession.preview=preview;
    const area=document.getElementById('schedule-delay-changes');area.replaceChildren();
    for(const change of preview.changes){const line=document.createElement('p');line.textContent=`${change.title}: ${change.before} → ${change.after}`;area.append(line);}
    for(const warning of preview.warnings){const line=document.createElement('p');line.textContent='⚠ '+warning;area.append(line);}
    document.getElementById('schedule-delay-apply').hidden=!preview.changes.length;
    document.getElementById('schedule-change-feedback').textContent=preview.changes.length?`${preview.changes.length}개 변경 · ${preview.preserved}개 보호. 예약·막차·겹치는 시간을 확인한 뒤 적용하세요.`:'변경 가능한 일정이 없습니다. 고정 일정은 직접 수정하거나 고정을 해제하세요.';
  }catch(error){scheduleChangeSession.preview=null;document.getElementById('schedule-delay-apply').hidden=true;scheduleChangeFeedback(error);}
}
function applyScheduleDelay(){
  try{
    const {trip,day}=scheduleChangeTarget(),preview=scheduleChangeSession.preview;if(!preview?.changes.length)throw new Error('먼저 변경안을 만들어 주세요.');
    const reason=document.getElementById('schedule-change-reason').value.trim();
    for(const change of preview.changes){const spot=day.spots.find(item=>item.id===change.id);if(!spot||spot.time!==change.before||SulsulTravel.ScheduleChange.protectedSpot(spot))throw new Error('검토 중 일정이 바뀌었습니다.');}
    const commands=preview.changes.map(change=>({type:'update',dayId:day.id,itemId:change.id,changes:{time:change.after,...(reason?{replanNote:reason}:{})}}));
    if(!commitLiveSchedule({type:'batch',tripId:trip.id,commands},trip.revision,''))return scheduleChangeFeedback('저장하지 못했습니다. 변경안을 유지했으니 다시 시도해 주세요.');
    closeModal('modal-schedule-change',true);refreshScheduleViews();showToast('남은 일정에 지연을 적용했습니다. 보호 일정은 유지됩니다.');return true;
  }catch(error){return scheduleChangeFeedback(error);}
}
function deleteManagedSchedule(){try{const target=scheduleChangeTarget();requireManualFixedChange(target.spot);requestDeleteSpot(target.dayIndex,target.spotIndex);}catch(error){scheduleChangeFeedback(error);}}
function openReadableText(title,text,meta=''){
  let modal=document.getElementById('modal-readable-text');
  if(!modal){modal=document.createElement('div');modal.id='modal-readable-text';modal.className='sheet-container sheet-closed';modal.innerHTML=`<div class="sheet-scrim" onclick="closeModal('modal-readable-text',true)"></div><div class="sheet-box activity-sheet" role="dialog" aria-modal="true" aria-labelledby="readable-text-title"><header class="activity-sheet-header"><h3 id="readable-text-title"></h3><button class="companion-button" onclick="closeModal('modal-readable-text',true)" aria-label="상세 내용 닫기">닫기</button></header><div class="activity-sheet-body"><p id="readable-text-meta"></p><p id="readable-text-body"></p></div></div>`;document.body.append(modal);}
  document.getElementById('readable-text-title').textContent=title;document.getElementById('readable-text-body').textContent=text;document.getElementById('readable-text-meta').textContent=meta;openModal('modal-readable-text');
}
function openChecklistItemDetails(index){const item=getActiveTrip()?.checklist?.[index];if(item)openReadableText('준비물 상세',item.text,[item.cat,item.urgent?'필수':'',item.checked?'준비 완료':'준비 전'].filter(Boolean).join(' · '));}
function checklistRowHtml(item){return `<div class="checklist-row theme-card-subtle"><label class="checklist-check"><input type="checkbox" ${item.checked?'checked':''} onchange="toggleChecklistItem(${item.originalIdx})" aria-label="${escapeHtml(item.text)} 준비 완료"></label><button type="button" class="checklist-detail" onclick="openChecklistItemDetails(${item.originalIdx})" aria-label="${escapeHtml(item.text)} 상세 보기"><span class="${item.checked?'line-through':''}">${escapeHtml(item.text)}</span><i class="fa-solid fa-expand" aria-hidden="true"></i></button><div class="checklist-badges">${item.cat?`<span>${escapeHtml(item.cat)}</span>`:''}${item.urgent?'<span class="sulsul-badge-rose">필수</span>':''}</div></div>`;}
