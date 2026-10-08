/* 공동 계획은 비교와 사용자 승인, 로컬 저장 성공을 거친 뒤에만 연결한다. */
function guardSharedTravelWrite({next,storedRaw,approvedRemoteTripId,approvedRecoveryRaw=null}) {
  if(storedRaw==null)return;
  let previous;
  try {
    previous=JSON.parse(storedRaw);
    if(!Array.isArray(previous))throw new Error('TRIPS_NOT_ARRAY');
    if(previous.some(trip=>!trip||typeof trip!=='object'||Array.isArray(trip)||typeof trip.id!=='string'||!trip.id))throw new Error('INVALID_TRIP');
    SulsulTravel.TripAdapter?.normalizeTrips(previous);
  } catch (_) {
    // 복원 화면이 보존·확인한 손상 원문과 현재 원문이 정확히 같을 때만 교체한다.
    if(typeof approvedRecoveryRaw==='string' && approvedRecoveryRaw===storedRaw)return;
    const error=new Error('기존 여행 저장 문서가 손상되었습니다. 원문을 보존하고 백업 복원을 명시적으로 승인해 주세요.');
    error.code='RECOVERY_APPROVAL_REQUIRED';throw error;
  }
  if(!SulsulTravel.CollaborationUI)return;
  for(const trip of next) {
    if(trip.id===approvedRemoteTripId || SulsulTravel.CollaborationUI.canEditSharedTrip(trip))continue;
    const old=previous.find(item=>item.id===trip.id);if(!old)continue;
    const plan=SulsulTravel.Collaboration.sanitizePlan;
    if(JSON.stringify(plan(old))!==JSON.stringify(plan(trip))) {
      const error=new Error('보기 전용 공동 계획입니다. 개인 기록은 저장할 수 있고, 계획을 바꾸려면 편집 초대를 요청하거나 별도 사본을 만드세요.');
      error.code='READ_ONLY_TRIP';throw error;
    }
  }
}
function mountTravelCollaboration() {
  SulsulTravel.CollaborationUI.mount('travel-collaboration',{getTrip:getActiveTrip,onRemoteReview:reviewRemoteTravelPlan,onRoomLinked:()=>{renderActiveTripWorkspace();}});
}
function requireSharedPlanEdit() {
  if(SulsulTravel.CollaborationUI.canEditSharedTrip(getActiveTrip()))return true;
  showToast('보기 전용 공동 계획입니다. 개인 기록은 남길 수 있어요. 계획 변경에는 편집 초대가 필요합니다.',6000);return false;
}
function reviewRemoteTravelPlan({remote,localTrip,link,source}) {
  if(State.collaborationReview)return Promise.resolve({applied:false});
  SulsulTravel.TripTransfer.validateTrip(remote.body);
  let modal=document.getElementById('modal-collaboration-review');
  if(!modal){
    modal=document.createElement('div');modal.id='modal-collaboration-review';modal.className='sheet-container sheet-closed';
    modal.innerHTML='<div class="sheet-scrim" onclick="closeModal(\'modal-collaboration-review\')"></div><section class="sheet-box activity-sheet" role="dialog" aria-modal="true" aria-labelledby="collaboration-review-title"><header class="activity-sheet-header"><div><h3 id="collaboration-review-title">공동 계획 비교</h3><p id="collaboration-review-meta"></p></div><button class="companion-button" onclick="closeModal(\'modal-collaboration-review\')">닫기</button></header><div class="activity-sheet-body"><p>서버의 계획을 그대로 적용합니다. 개인 일기·사진·지출은 유지하며 자동 병합하지 않습니다.</p><div id="collaboration-review-diff"></div><p id="collaboration-review-feedback" role="status"></p></div><footer class="activity-sheet-footer"><button class="companion-button" onclick="applyRemoteTravelPlan(true)">새 사본으로 가져오기</button><button id="collaboration-review-apply" class="companion-button companion-primary" onclick="applyRemoteTravelPlan(false)">내 여행 일정에 적용</button></footer></section>';
    document.body.append(modal);
  }
  const describe=trip=>`${trip?.title || '없음'} · ${(trip?.days || []).length}일 / ${(trip?.days || []).reduce((sum,day)=>sum+(day.spots || []).length,0)}개 일정`;
  const meta=document.getElementById('collaboration-review-meta');meta.textContent=`서버 v${remote.revision} · ${link.role==='viewer'?'보기 전용':link.role==='owner'?'관리자':'함께 편집'}`;
  const body=document.getElementById('collaboration-review-diff');body.replaceChildren();
  for(const [label,trip] of [['내 여행',localTrip],['서버 계획',remote.body]]){
    const section=document.createElement('section');section.className='collaboration-plan-comparison';const heading=document.createElement('h4');heading.textContent=`${label}: ${describe(trip)}`;section.append(heading);
    for(const day of trip?.days || []){
      const detail=document.createElement('details'),summary=document.createElement('summary');summary.textContent=`${day.date || '날짜 미정'} · ${day.city || ''} · ${day.title || ''}`;detail.append(summary);
      for(const spot of day.spots || []){const p=document.createElement('p');p.textContent=[spot.time || '시각 미정',spot.title || spot.name,spot.completed?'완료':spot.skipped?'건너뜀':'예정',spot.fixed?'고정':'',spot.desc || spot.memo || ''].filter(Boolean).join(' · ');detail.append(p);}
      section.append(detail);
    }
    for(const block of Object.values(trip?.planBlockMeta || {})){const p=document.createElement('p');p.textContent=[block.title,block.lodging,block.notes,(block.priorities || []).join(' · ')].filter(Boolean).join(' · ');section.append(p);}body.append(section);
  }
  document.getElementById('collaboration-review-feedback').textContent=source==='invite'?'새 사본으로 가져오면 기존 여행의 일정은 바뀌지 않습니다.':'서버 계획 적용은 이 브라우저의 현재 일정을 교체합니다. 내 변경이 필요하면 취소 후 먼저 사본 파일을 보관하세요.';
  document.getElementById('collaboration-review-apply').hidden=!localTrip;
  return new Promise(resolve=>{
    State.collaborationReview={remote,localTripId:localTrip?.id,baseRevision:localTrip?.revision,link,resolve};openModal('modal-collaboration-review');
    if(!history.state?.stCollaborationReview)history.pushState({...history.state,stCollaborationReview:true},'');
  });
}
function applyRemoteTravelPlan(asCopy) {
  const review=State.collaborationReview;if(!review)return false;
  try {
    const body=SulsulTravel.TripTransfer.parse(JSON.stringify({format:'sulsul-trip',schemaVersion:1,trip:review.remote.body})).trip;
    const next=JSON.parse(JSON.stringify(State.trips));let target;
    if(asCopy || !review.localTripId){target={...body,id:`trip_${crypto.randomUUID()}`,revision:0,createdAt:new Date().toISOString(),journals:{},momentEntries:[],activityRecords:{},expenses:[],exchanges:[],appliedAiJobIds:[]};next.push(target);}
    else {
      target=next.find(trip=>trip.id===review.localTripId);
      if(!target || target.revision!==review.baseRevision)throw new Error('비교하는 동안 내 여행이 바뀌었습니다. 취소하고 다시 비교해 주세요.');
      const localRecords=new Map((target.days || []).flatMap(day=>(day.spots || []).filter(spot=>spot.id&&spot.recordId).map(spot=>[spot.id,spot.recordId])));
      const preserved={id:target.id,revision:target.revision,journals:target.journals,activityRecords:target.activityRecords,momentEntries:target.momentEntries,expenses:target.expenses,exchanges:target.exchanges,initialBalances:target.initialBalances,activeCurrencies:target.activeCurrencies,wallets:target.wallets};
      Object.assign(target,body,preserved);
      for(const day of target.days || [])for(const spot of day.spots || [])if(localRecords.has(spot.id))spot.recordId=localRecords.get(spot.id);
    }
    State.trips=TripRepository.saveAll(next,{bumpTripId:target.id,approvedRemoteTripId:target.id});
    const resolve=review.resolve;State.collaborationReview=null;closeModal('modal-collaboration-review',true);openTripWorkspace(target.id);resolve({applied:true,tripId:target.id});showToast('검토한 공동 계획을 저장했습니다. 개인 기록은 유지했습니다.');return true;
  } catch(error) {document.getElementById('collaboration-review-feedback').textContent=`저장하지 못했습니다. 기존 여행과 비교 화면은 유지됩니다. ${error.message || ''}`;return false;}
}
function cancelRemoteTravelReview() {
  const review=State.collaborationReview;if(review){State.collaborationReview=null;review.resolve({applied:false});}
}
