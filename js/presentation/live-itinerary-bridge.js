/* 기존 화면도 안정 ID 명령을 통하도록 연결한다. 기록 저장과 계획 변경은 별개다. */
function commitLiveSchedule(command,expectedRevision,label='일정을 변경했습니다.') {
  if(!requireSharedPlanEdit())return false;
  const active=getActiveTrip(),tripId=command.tripId||active?.id;
  if(!active||active.id!==tripId){showToast('편집하던 여행으로 돌아가 다시 저장해 주세요.');return false;}
  let result,domainError;
  const saved=commitTripCommand({tripId,expectedRevision:expectedRevision??active.revision,change:trip=>{try{result=SulsulTravel.LiveItinerary.apply(trip,command);}catch(error){domainError=error;throw error;}}});
  if(!saved){if(domainError)showToast(domainError.message);return false;}
  State.lastLiveScheduleChange=result;
  refreshScheduleViews();
  if(label)showToast(label);
  return true;
}
function syncLiveSpotPosition(){
  const trip=getActiveTrip(),modal=document.getElementById('modal-spot');
  const day=trip?.days[Number(document.getElementById('spot-form-day')?.value)];
  const select=document.getElementById('spot-form-anchor');if(!select||!day)return;
  const previous=select.value;
  select.replaceChildren();
  for(const spot of day.spots||[]){
    if(spot.id===modal.dataset.editSpotId||!SulsulTravel.LiveItinerary.active(spot))continue;
    const option=document.createElement('option');option.value=spot.id;option.textContent=[spot.time||'시간 미정',spot.title].join(' · ');select.append(option);
  }
  if([...select.options].some(option=>option.value===previous))select.value=previous;
  modal.dataset.targetDayId=day.id;
  const pos=document.getElementById('spot-form-position')?.value;
  select.disabled=!['before','after'].includes(pos);
}
function liveSpotPlacement(day,position,anchorId,itemTime,excludeId){
  if(position==='keep')return {};
  if(position==='time'){
    const minute=SulsulTravel.LiveItinerary.minutes(itemTime);
    const anchor=minute===null?null:day.spots.find(spot=>spot.id!==excludeId&&SulsulTravel.LiveItinerary.active(spot)&&SulsulTravel.LiveItinerary.minutes(spot.time)!==null&&SulsulTravel.LiveItinerary.minutes(spot.time)>minute);
    return anchor?{position:'before',anchorId:anchor.id}:{position:'end'};
  }
  return {position,anchorId:['before','after'].includes(position)?anchorId:undefined};
}
function submitLiveSpot(){
  const trip=getActiveTrip(),session=document.getElementById('modal-spot').dataset;
  if(!trip||trip.id!==session.tripId){showToast('편집하던 여행으로 돌아가 다시 저장해 주세요.');return false;}
  const day=trip.days[Number(document.getElementById('spot-form-day').value)],title=document.getElementById('spot-form-title').value.trim();
  const time=document.getElementById('spot-form-time').value.trim();
  if(!title){showToast('활동명을 입력해 주세요.');return false;}
  if(!day||!SulsulTravel.LiveItinerary.validTime(time,{allowEmpty:true})){showToast('시간은 비워 두거나 09:30, 09:30~10:00, +1일 00:30 형식으로 입력해 주세요.');return false;}
  const cat=document.getElementById('spot-form-cat').value;
  const changes={title,time,cat,typeIcon:getCategoryIcon(cat),desc:document.getElementById('spot-form-memo').value.trim(),tip:document.getElementById('spot-form-tip').value.trim(),cost:document.getElementById('spot-form-cost').value.trim(),fixed:document.getElementById('spot-form-fixed').checked};
  const position=document.getElementById('spot-form-position').value;
  const placement=liveSpotPlacement(day,position,document.getElementById('spot-form-anchor').value,time,session.editSpotId);
  const editing=!!session.editSpotId,replacement=session.replacement==='true';
  const command={tripId:trip.id,type:replacement?'replace':editing?'update':'insert',dayId:session.sourceDayId||day.id,targetDayId:day.id,itemId:session.editSpotId||undefined,...placement};
  if(editing&&!replacement)command.changes=changes;
  else command.item={...changes,completed:false};
  if(!commitLiveSchedule(command,Number(session.baseRevision),''))return false;
  closeModal('modal-spot',true);
  showToast(replacement?'대체 일정을 저장했습니다. 원래 기록은 그대로 남습니다.':editing?'일정을 수정했습니다. 기존 순서와 다른 날짜는 유지합니다.':'새 일정을 넣었습니다. 되돌리기에서 취소할 수 있습니다.');
  return true;
}
