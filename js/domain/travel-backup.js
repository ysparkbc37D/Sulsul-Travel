/* 전체 백업은 공유 사본과 다른 계약이다. 원문·구버전 필드를 보존하며 복원 전에 정규화한다. */
(function(root){
  'use strict';
  const MAX_BYTES=50*1024*1024;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const bytes=value=>new TextEncoder().encode(value).length;
  const safeFormatting=new Set(['b','strong','i','em','br','p','ul','ol','li','code','blockquote','span','u','s']);
  function validationCopy(value,{checkMarkup=true}={}){
    if(typeof value==='string'){
      if(checkMarkup){
        if(/<\s*\/?\s*(script|style|iframe|img|svg|math|object|embed|link|meta|base|audio|video|source|input|button|form|textarea|select|option)\b/i.test(value)||/<\s*\/?\s*[a-z][^<>]*\bon\w+\s*=/i.test(value))throw new Error('실행 가능한 HTML이 포함된 백업입니다. 해당 내용을 일반 텍스트로 바꿔 주세요.');
        // 속성 없는 옛 서식만 허용한다. 평문의 '<' 비교와 줄바꿈은 그대로 보존한다.
        for(const match of value.matchAll(/<\s*(\/?\s*[a-zA-Z][\w:-]*)([^<>]*)>/g)){
          const tag=match[1].replace(/^\/\s*/,'').toLowerCase(),attributes=match[2].trim();
          if(!safeFormatting.has(tag)||(attributes&&attributes!=='/'))throw new Error('실행 가능한 HTML 또는 속성이 포함된 백업입니다. 해당 내용을 일반 텍스트로 바꿔 주세요.');
        }
        if(/<\s*[!?]/.test(value))throw new Error('지원하지 않는 HTML 선언이 포함된 백업입니다.');
      }
      return value.replaceAll('<','&lt;');
    }
    if(Array.isArray(value))return value.map(item=>validationCopy(item,{checkMarkup}));
    if(value&&typeof value==='object'){
      const result={};
      for(const [key,item] of Object.entries(value)){
        if(['__proto__','constructor','prototype'].includes(key))throw new Error('지원하지 않는 데이터 필드입니다.');
        result[key]=validationCopy(item,{checkMarkup});
      }
      return result;
    }
    return value;
  }
  function normalize(trips,{checkMarkup=true}={}){
    if(!Array.isArray(trips))throw new Error('여행 목록이 있는 전체 백업 파일을 선택해 주세요.');
    trips.forEach(trip=>{
      if(!trip||typeof trip!=='object'||Array.isArray(trip)||!(typeof trip.title==='string'&&trip.title.trim()||typeof trip.name==='string'&&trip.name.trim()))throw new Error('여행 제목과 객체 형식을 확인해 주세요.');
      if(trip.days!=null&&!Array.isArray(trip.days))throw new Error('일별 일정 목록 형식이 올바르지 않습니다.');
    });
    const next=root.SulsulTravel.TripAdapter.normalizeTrips(trips);
    next.forEach(trip=>{
      root.SulsulTravel.TripTransfer.validateTrip(validationCopy(trip,{checkMarkup}));
      // HTML 안의 onclick에 사용되는 식별자는 실행문으로 해석되지 않아야 한다.
      const ids=[trip.id,...trip.days.flatMap(day=>[day.id,day.planBlockId,...day.spots.map(spot=>spot.id)]),...Object.keys(trip.planBlockMeta||{}),...Object.keys(trip.activityRecords||{}),...(trip.momentEntries||[]).map(record=>record.id)];
      if(ids.some(id=>id!=null&&(typeof id!=='string'||!id||/[\s'"<>`\\;&]/.test(id))))throw new Error('여행·일정 식별자 형식을 확인해 주세요.');
      const currencies=[trip.currency,...(trip.activeCurrencies||[]),...(trip.expenses||[]).flatMap(expense=>[expense.curr,expense.currency])].filter(value=>value!=null&&value!=='');
      if(currencies.some(value=>typeof value!=='string'||!/^[A-Z]{3}$/.test(value)))throw new Error('통화 코드 형식을 확인해 주세요.');
    });
    return next;
  }
  function mergeOverflow(trips,entries=[]){
    const next=clone(trips);
    const baseRevisions=new Map(next.map(trip=>[trip.id,Number.isInteger(trip.revision)?trip.revision:0]));
    const accepted=new Map();
    for(const entry of entries){
      const trip=next.find(item=>item.id===entry.tripId);
      if(!trip||!Number.isInteger(entry.dayIndex)||entry.dayIndex<0)continue;
      const revision=Number.isInteger(entry.revision)?entry.revision:baseRevisions.get(trip.id);
      const key=JSON.stringify([trip.id,entry.dayIndex]);
      if(revision<baseRevisions.get(trip.id)||revision<(accepted.get(key)??-Infinity))continue;
      accepted.set(key,revision);
      trip.journals=trip.journals||{};
      trip.journals[entry.dayIndex]={...(trip.journals[entry.dayIndex]||{text:'',photos:[]}),...clone(entry.journal||{})};
      if(Number.isInteger(entry.revision))trip.revision=Math.max(trip.revision||0,entry.revision);
    }
    return next;
  }
  function create(trips,entries=[],version=''){
    const payload={format:'sulsul-backup',schemaVersion:1,version,exportedAt:new Date().toISOString(),trips:normalize(mergeOverflow(trips,entries),{checkMarkup:false})};
    const json=JSON.stringify(payload,null,2);
    if(bytes(json)>MAX_BYTES)throw new Error('전체 백업이 50MB를 넘습니다. 여행 사본 파일로 나누어 보관해 주세요.');
    return {payload,json,size:bytes(json)};
  }
  function parse(text){
    if(typeof text!=='string'||bytes(text)>MAX_BYTES)throw new Error('전체 백업은 50MB 이하만 불러올 수 있습니다.');
    let payload;
    try{payload=JSON.parse(text.replace(/^\uFEFF/,''));}catch(_){throw new Error('JSON 내용을 읽을 수 없습니다. 파일이 잘렸거나 손상되지 않았는지 확인해 주세요.');}
    if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error('전체 백업 파일 형식이 아닙니다.');
    if(payload.format&&payload.format!=='sulsul-backup')throw new Error('전체 백업 형식이 아닙니다. 여행 사본은 공유 화면에서 가져오세요.');
    if(payload.schemaVersion!=null&&payload.schemaVersion!==1)throw new Error('지원하지 않는 새 백업 형식입니다. 앱을 업데이트해 주세요.');
    return {...payload,trips:normalize(payload.trips)};
  }
  function records(trip){return [...Object.values(trip.journals||{}),...Object.values(trip.activityRecords||{}),...(trip.momentEntries||[]),...(trip.expenses||[])];}
  function summary(trips){
    return {trips:trips.length,days:trips.reduce((n,t)=>n+(t.days||[]).length,0),records:trips.reduce((n,t)=>n+Object.keys(t.journals||{}).length+Object.keys(t.activityRecords||{}).length+(t.momentEntries||[]).length,0),photos:trips.reduce((n,t)=>n+records(t).reduce((count,r)=>count+(r.photos||[]).filter(Boolean).length,0),0),expenses:trips.reduce((n,t)=>n+(t.expenses||[]).length,0)};
  }
  root.SulsulTravel=root.SulsulTravel||{};
  root.SulsulTravel.TravelBackup={MAX_BYTES,create,parse,summary,records,mergeOverflow};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.SulsulTravel.TravelBackup;
})(typeof window!=='undefined'?window:globalThis);
