/* 현장 수동 변경은 AI 보호 규칙과 구분하고 완료·고정·기록·취소 일정은 지연에서 보존한다. */
(function(root){
  'use strict';
  const retired=spot=>Boolean(spot?.skipped||spot?.cancelled);
  const protectedSpot=spot=>Boolean(spot?.completed||spot?.fixed||spot?.recordId||retired(spot));
  const minutes=value=>{const match=/^(?:\+(\d+)일\s*)?(\d{2}):(\d{2})/.exec(String(value||'').trim());return match?Number(match[1]||0)*1440+Number(match[2])*60+Number(match[3]):null;};
  function shift(value,offset){
    if(!root.SulsulTravel.AiDraftValidation.validTime(value))throw new Error('시간 형식을 확인한 뒤 다시 조정해 주세요.');
    let previous=-1,inferredDay=0;
    return value.replace(/(?:\+(\d+)일\s*)?(\d{2}):(\d{2})/g,(_,day,hour,minute)=>{
      let base=Number(day||inferredDay)*1440+Number(hour)*60+Number(minute);
      if(base<previous){base+=1440;inferredDay++;}previous=base;
      const result=base+offset,days=Math.floor(result/1440),clock=result%1440;
      return `${days?`+${days}일 `:''}${String(Math.floor(clock/60)).padStart(2,'0')}:${String(clock%60).padStart(2,'0')}`;
    });
  }
  function previewDelay(day,spotId,offset){
    if(!Number.isInteger(offset)||offset<1||offset>720)throw new Error('지연 시간은 1~720분으로 입력해 주세요.');
    const index=day.spots.findIndex(spot=>spot.id===spotId);
    if(index<0)throw new Error('조정할 일정이 변경되었습니다.');
    const changes=[],warnings=[];let preserved=0;
    day.spots.slice(index).forEach(spot=>{
      if(protectedSpot(spot)){preserved++;return;}
      const after=shift(spot.time,offset);
      changes.push({id:spot.id,title:spot.title,before:spot.time,after});
      for(const anchor of day.spots.filter(item=>item.fixed&&!retired(item)&&!item.completed)){
        if(minutes(spot.time)<minutes(anchor.time)&&minutes(after)>=minutes(anchor.time))warnings.push(`${spot.title}: 고정 일정 '${anchor.title}'의 시각을 넘습니다.`);
      }
    });
    return {changes,warnings:[...new Set(warnings)],preserved};
  }
  root.SulsulTravel=root.SulsulTravel||{};
  root.SulsulTravel.ScheduleChange={retired,protectedSpot,minutes,shift,previewDelay};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.SulsulTravel.ScheduleChange;
})(typeof window!=='undefined'?window:globalThis);
