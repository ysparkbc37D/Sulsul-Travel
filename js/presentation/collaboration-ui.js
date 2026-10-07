/* 서버 미연결/사본 공유/공동 편집을 구별한다. 모든 서버 요청은 사용자의 버튼 동작에서 시작한다. */
(function(root){
  'use strict';
  const LINK_KEY='st_collaboration_links_v1',mounts=new Map();
  let defaultService=null,pendingInvite='';
  const roleName=role=>({owner:'여행 관리자',editor:'함께 편집',viewer:'보기 전용'}[role]||'권한 확인 필요');
  const el=(tag,text,className='')=>{const node=root.document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
  function serviceFor(options={}){return options.service||(defaultService||=new root.SulsulTravel.Collaboration.SupabaseTravelService());}
  function readLinks(service){try{const value=JSON.parse(service.storage?.getItem(LINK_KEY)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch(_){return {};}}
  function linkKey(service,tripId){return `${service.configuration()?.url||''}|${tripId}`;}
  function roomForTrip(trip,service=serviceFor()){
    if(!trip?.id||!service.configured())return null;
    const link=readLinks(service)[linkKey(service,trip.id)];
    if(link)service.setKnownRole(link.documentId,link.role);
    return link||null;
  }
  function attachTrip(tripId,link,service=serviceFor()){
    if(!tripId||!link?.documentId||!['owner','editor','viewer'].includes(link.role)||!Number.isInteger(link.revision))throw new Error('공동 여행 연결 형식을 확인해 주세요.');
    const links=readLinks(service),value={documentId:link.documentId,revision:link.revision,role:link.role,projectUrl:service.configuration()?.url};
    links[linkKey(service,tripId)]=value;service.storage?.setItem(LINK_KEY,JSON.stringify(links));service.setKnownRole(link.documentId,link.role);return value;
  }
  function canEditSharedTrip(trip){const link=roomForTrip(trip);return !link||link.role!=='viewer';}
  function checkInviteOnStartup(location=root.location){
    const match=/^#invite=([A-Za-z0-9_-]{32})$/.exec(location?.hash||'');
    pendingInvite=match?.[1]||'';for(const state of mounts.values())render(state);return !!pendingInvite;
  }
  function inviteUrl(token,location=root.location){
    if(!/^[A-Za-z0-9_-]{32}$/.test(token))throw new Error('초대 응답 형식이 올바르지 않습니다.');
    return `${location.origin}${location.pathname}#invite=${token}`;
  }
  function button(state,label,action,{disabled=false,primary=false}={}){
    const node=el('button',label,`companion-button${primary?' companion-primary':''}`);node.type='button';node.style.minHeight='44px';node.disabled=disabled||state.busy;
    node.addEventListener('click',()=>run(state,action));return node;
  }
  function row(...nodes){const node=el('div',undefined,'flex flex-wrap items-center gap-2');node.style.marginTop='12px';node.append(...nodes);return node;}
  function input(label,type,value='',placeholder=''){
    const wrapper=el('label',undefined,'block text-sm'),caption=el('span',label),field=el('input');field.type=type;field.value=value;field.placeholder=placeholder;field.autocomplete='off';field.style.cssText='display:block;width:100%;min-height:44px;margin-top:6px;padding:10px;border:1px solid var(--border-color,#aaa);border-radius:10px;background:var(--bg-secondary,#fff);color:inherit;';wrapper.append(caption,field);return {wrapper,field};
  }
  function currentTrip(state){return state.options.getTrip?.()||root.getActiveTrip?.()||null;}
  async function run(state,action){
    if(state.busy)return;state.operationContext=state.service.configuration();state.busy=true;state.message='';render(state);
    try{await action();}catch(error){state.message=error?.name==='CollaborationError'?error.message:'작업을 완료하지 못했습니다. 기존 계획과 대기 변경은 유지됩니다.';}
    finally{state.busy=false;render(state);}
  }
  async function connectForAction(state){
    const captchaToken=await state.options.getCaptchaToken?.();
    state.service._assertContext(state.operationContext);
    return state.service.authenticate({displayName:state.displayName,captchaToken,context:state.operationContext});
  }
  function showMessage(state,message){state.message=message;}
  async function refreshLists(state,link){
    const results=await Promise.allSettled([state.service.members(link.documentId),state.service.history(link.documentId),...(link.role==='owner'?[state.service.invites(link.documentId)]:[])]);
    state.members=results[0].status==='fulfilled'?results[0].value:[];
    state.history=results[1].status==='fulfilled'?results[1].value:[];
    state.invites=results[2]?.status==='fulfilled'?results[2].value:[];
    if(results.some(result=>result.status==='rejected'))showMessage(state,'일부 동행·이력 정보를 불러오지 못했습니다. 다시 확인해 주세요.');
  }
  function render(state){
    const {container,service}=state,trip=currentTrip(state),configured=service.configured(),link=roomForTrip(trip,service);
    if(state.projectUrl!==service.configuration()?.url||state.tripId!==trip?.id){state.members=[];state.history=[];state.invites=[];state.inviteUrl='';state.recoveryLink=null;if(state.projectUrl!==service.configuration()?.url||state.remoteSource!=='invite')state.remote=null;}
    state.projectUrl=service.configuration()?.url;state.tripId=trip?.id;
    container.replaceChildren();container.setAttribute('aria-busy',String(state.busy));
    const section=el('section',undefined,'companion-intro');section.style.display='block';
    section.append(el('p','TOGETHER ON THE ROAD','companion-eyebrow'),el('h3','동행과 함께 계획하기'));
    section.append(el('p',configured?(link?`${roleName(link.role)} · 확인한 공동 계획 v${link.revision}`:'서버 설정됨 · 공동 여행을 게시하거나 초대를 참가해 주세요.'):'서버 미연결 · 현재 링크·파일 공유는 여행 사본을 전달합니다.','companion-muted'));
    section.append(el('p','공동 여행에는 계획만 게시합니다. 개인 일기·사진·지출과 인증 키는 포함되지 않습니다.','text-sm'));
    if(state.message){const message=el('p',state.message,'text-sm');message.setAttribute('role','status');message.style.marginTop='12px';section.append(message);}
    if(state.busy)section.append(el('p','처리 중…','text-sm'));

    const configDetails=el('details'),configSummary=el('summary',configured?'서버 설정 확인':'공동 여행 서버 설정');configDetails.open=!configured;configDetails.style.marginTop='16px';configSummary.style.minHeight='44px';configDetails.append(configSummary);
    const config=service.configuration(),url=input('Supabase 프로젝트 주소','url',config?.url||'','https://프로젝트.supabase.co'),key=input('공개 publishable / anon 키','password','','기존 설정을 유지하려면 비워 두세요');
    configDetails.append(url.wrapper,key.wrapper,el('p','공개 키만 입력하세요. 이 설정을 저장하는 것만으로 여행을 보내거나 로그인하지 않습니다.','text-sm'));
    configDetails.append(row(button(state,'설정 저장',async()=>{service.configure({url:url.field.value,publicKey:key.field.value||(url.field.value.replace(/\/$/,'')===config?.url?config.publicKey:'')});state.members=[];state.history=[];state.invites=[];showMessage(state,'서버 설정을 저장했습니다. 연결 또는 게시 버튼으로 시작해 주세요.');}),...(configured?[button(state,'설정 해제',async()=>{service.disconnect();state.remote=null;showMessage(state,'서버 연결 설정을 해제했습니다. 개인 여행과 서버의 공동 계획은 삭제하지 않습니다.');})]:[])));
    section.append(configDetails);
    const name=input('동행에게 표시할 이름','text',state.displayName||'','예: 민수');name.field.maxLength=40;name.field.addEventListener('input',()=>{state.displayName=name.field.value;});
    if(configured){section.append(name.wrapper,row(button(state,'연결 확인',async()=>{await connectForAction(state);showMessage(state,'서버 임시 로그인 연결을 확인했습니다.');})));
      section.append(el('p','현재 연결은 이 브라우저의 임시 로그인입니다. 브라우저 데이터를 삭제하거나 다른 기기를 사용하면 같은 관리자 계정으로 복구할 수 없습니다.','text-sm'));
    }
    if(pendingInvite){section.append(el('p','동행 초대가 도착했습니다. 참가 버튼을 누른 뒤 공동 계획을 검토할 수 있습니다.','text-sm'),row(button(state,'초대 참가',async()=>{
      await connectForAction(state);service._assertContext(state.operationContext);
      const result=await service.acceptInvite(pendingInvite,state.displayName);state.remote=await service.getDocument(result.document_id);state.remoteSource='invite';
      state.inviteRoom={documentId:result.document_id,revision:result.revision,role:result.role};showMessage(state,'참가했습니다. 아래 계획을 검토한 뒤 내 여행에 연결해 주세요.');
    },{disabled:!configured,primary:true})));}
    if(configured&&trip&&!link)section.append(row(button(state,state.recoveryLink?'게시한 여행 연결 저장':'공동 여행 게시',async()=>{
      if(!state.recoveryLink){
        await connectForAction(state);service._assertContext(state.operationContext);
        const result=await service.createDocument(trip);
        state.recoveryLink={documentId:result.document_id,revision:result.revision,role:'owner'};
      }
      service._assertContext(state.operationContext);
      const value=attachTrip(trip.id,state.recoveryLink,service);
      await state.options.onRoomLinked?.({tripId:trip.id,link:value});showMessage(state,'공동 계획을 게시했습니다. 보기 또는 함께 편집 초대를 만들 수 있습니다.');
      state.recoveryLink=null;
    },{primary:true})));
    if(state.recoveryLink){const recovery=el('p',`서버 게시가 완료됐지만 기기 연결 저장이 남아 있습니다. 이 화면에서 다시 저장하세요. 복구용 문서 ID: ${state.recoveryLink.documentId}`,'text-sm');recovery.style.overflowWrap='anywhere';section.append(recovery);}
    if(configured&&link){
      section.append(row(button(state,'서버 변경 확인',async()=>{state.remote=await service.getDocument(link.documentId);state.remoteSource='refresh';attachTrip(trip.id,{...link,role:state.remote.role},service);showMessage(state,'서버 계획을 불러왔습니다. 적용 전 내용을 검토해 주세요.');await refreshLists(state,{...link,role:state.remote.role});}),button(state,'내 변경 보내기',async()=>{
        const result=await service.publishDocument(link.documentId,trip,link.revision,{role:link.role});
        if(result.state==='applied'&&(!result.applied_revision||result.applied_revision===result.revision)){attachTrip(trip.id,{...link,revision:result.revision},service);showMessage(state,`공동 계획 v${result.revision}에 반영했습니다.`);}
        else if(result.state==='queued')showMessage(state,'연결되지 않아 이 브라우저에 변경을 대기시켰습니다. 원본 버전을 유지합니다.');
        else if(result.state==='conflict')showMessage(state,'다른 동행이 먼저 수정했습니다. 서버 변경을 확인하고 비교해 주세요. 자동으로 덮어쓰지 않습니다.');
        else showMessage(state,'이 요청은 이미 처리되었습니다. 서버 변경을 확인해 최신 계획을 비교해 주세요.');
      },{disabled:link.role==='viewer',primary:true})));
      if(link.role==='viewer')section.append(el('p','보기 전용입니다. 개인 기록은 작성할 수 있으며 공동 계획은 변경할 수 없습니다.','text-sm'));
      if(link.role==='owner'){
        const expiry=el('select');expiry.setAttribute('aria-label','초대 만료 기간');expiry.style.minHeight='44px';for(const day of [1,7,30]){const option=el('option',`${day}일 뒤 만료`);option.value=String(day);option.selected=day===7;expiry.append(option);}
        section.append(row(expiry,...['viewer','editor'].map(role=>button(state,role==='viewer'?'보기 초대':'함께 편집 초대',async()=>{const result=await service.createInvite(link.documentId,{role,expiresDays:Number(expiry.value)});state.inviteUrl=inviteUrl(result.token);showMessage(state,`${roleName(role)} 초대를 만들었습니다. 링크를 가진 사람이 해당 권한으로 참가할 수 있습니다.`);}))));
      }
    }
    if(state.inviteUrl){const field=input('초대 링크','text',state.inviteUrl);field.field.readOnly=true;section.append(field.wrapper,row(button(state,'초대 링크 복사',async()=>{if(!root.navigator?.clipboard?.writeText){showMessage(state,'위 링크를 선택해 복사해 주세요.');return;}await root.navigator.clipboard.writeText(state.inviteUrl);showMessage(state,'초대 링크를 복사했습니다.');})));}
    if(state.remote){
      const remote=state.remote,plan=remote.body||{},preview=el('section');preview.style.cssText='margin-top:16px;padding:14px;border:1px solid var(--border-color,#aaa);border-radius:12px;';
      preview.append(el('h4',`서버 계획 v${remote.revision} · ${roleName(remote.role)}`),el('p',plan.title||'제목 없음'),el('p',`${plan.startDate||'날짜 미정'} ~ ${plan.endDate||'날짜 미정'} · ${(plan.days||[]).length}일 · ${(plan.days||[]).reduce((sum,day)=>sum+(day.spots?.length||0),0)}개 일정`));
      const detail=el('details'),summary=el('summary','도시별 일정 보기');summary.style.minHeight='44px';detail.append(summary);
      for(const day of plan.days||[])detail.append(el('p',`${day.date||''} ${day.city||''} · ${(day.spots||[]).map(spot=>spot.title||spot.name||'일정').join(' / ')}`,'text-sm'));preview.append(detail);
      preview.append(el('p',trip?'내 계획과 비교한 후 적용해 주세요. 개인 기록은 유지되어야 하며 자동 병합은 하지 않습니다.':'계획을 확인한 뒤 새 여행 사본으로 가져와 연결할 수 있습니다.','text-sm'));
      preview.append(row(button(state,'계획 비교 · 적용 검토',async()=>{
        const remoteLink={documentId:remote.id,revision:remote.revision,role:remote.role};
        const result=await state.options.onRemoteReview?.({remote,localTrip:trip,link:remoteLink,source:state.remoteSource});
        if(result?.applied&&result.tripId){service._assertContext(state.operationContext);const value=attachTrip(result.tripId,remoteLink,service);await state.options.onRoomLinked?.({tripId:result.tripId,link:value});state.remote=null;
          if(state.remoteSource==='invite'){pendingInvite='';if(/^#invite=/.test(root.location?.hash||''))root.history?.replaceState(null,'',root.location.pathname+root.location.search);}
          showMessage(state,'검토한 공동 계획을 연결했습니다. 개인 기록은 여행 안에 유지됩니다.');
        }else showMessage(state,'적용을 완료하지 않았습니다. 서버 계획과 내 여행은 그대로 유지됩니다.');
      },{disabled:!state.options.onRemoteReview,primary:true})));
      if(!state.options.onRemoteReview)preview.append(el('p','계획 적용 연결이 준비되지 않았습니다. 개발자에게 화면 연결을 요청해 주세요.','text-sm'));
      section.append(preview);
    }
    if(state.members.length){section.append(el('h4','함께하는 동행'));for(const member of state.members){const item=row(el('span',`${member.display_name||'동행'} · ${roleName(member.role)}`));if(link?.role==='owner'&&member.role!=='owner')item.append(button(state,'참여 해제',async()=>{if(!root.confirm?.('이 동행의 공동 계획 접근 권한을 해제할까요? 같은 초대로 다시 참가할 수 있으므로 필요하면 초대도 취소하세요.'))return;await service.removeMember(link.documentId,member.user_id);await refreshLists(state,link);}));section.append(item);}}
    if(state.invites.length){section.append(el('h4','발급한 초대'));for(const invite of state.invites){const status=invite.revoked_at?'취소됨':new Date(invite.expires_at).getTime()<=Date.now()?'만료됨':'사용 가능',item=row(el('span',`${roleName(invite.role)} · ${status} · ${String(invite.expires_at).slice(0,10)} 만료`));if(status==='사용 가능'&&link?.role==='owner')item.append(button(state,'초대 취소',async()=>{await service.revokeInvite(invite.id);await refreshLists(state,link);showMessage(state,'초대를 취소했습니다. 이미 참가한 동행은 참여 해제로 별도 관리합니다.');}));section.append(item);}}
    if(state.history.length){section.append(el('h4','공동 계획 변경 이력'));for(const change of state.history)section.append(el('p',`v${change.revision} · ${change.summary||'일정 수정'} · ${String(change.created_at).slice(0,16).replace('T',' ')}`,'text-sm'));}
    const queue=service.outbox();
    if(queue.length){
      section.append(el('h4',`대기 변경 ${queue.length}건`),el('p','대기 중인 변경은 작성 당시의 공동 계획 버전을 유지합니다. 충돌 항목은 확인 후 직접 삭제하고 최신 계획에서 다시 수정해 주세요.','text-sm'));
      section.append(row(button(state,'대기 변경 보내기',async()=>{
        const results=await service.flushOutbox();
        showMessage(state,results.some(result=>['conflict','blocked'].includes(result.state))?'일부 변경이 충돌하거나 권한 확인이 필요합니다. 서버 변경과 비교해 주세요.':'전송 결과를 확인했습니다. 서버 변경을 불러와 계획을 비교해 주세요.');
      },{disabled:!configured})));
      for(const entry of queue){
        const label=el('span',`원본 v${entry.baseRevision} · ${{pending:'전송 대기',conflict:'충돌 · 검토 필요',blocked:'계정·권한 확인 필요'}[entry.state]||'검토 필요'}`);
        section.append(row(label,button(state,'대기 변경 삭제',async()=>{
          if(root.confirm?.('이 대기 변경만 삭제할까요? 내 여행 계획은 삭제되지 않습니다.'))service.discardOutbox(entry.mutationId);
        })));
      }
    }
    container.append(section);
  }
  function mount(containerId,options={}){
    const container=typeof containerId==='string'?root.document.getElementById(containerId):containerId;if(!container)return null;
    const state={container,options,service:serviceFor(options),message:'',displayName:'',busy:false,remote:null,recoveryLink:null,members:[],invites:[],history:[],inviteUrl:''};mounts.set(container,state);render(state);
    return {refresh:()=>render(state),destroy:()=>{mounts.delete(container);container.replaceChildren();}};
  }
  const api={mount,checkInviteOnStartup,roomForTrip,attachTrip,canEditSharedTrip,inviteUrl,LINK_KEY};root.SulsulTravel=root.SulsulTravel||{};root.SulsulTravel.CollaborationUI=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
