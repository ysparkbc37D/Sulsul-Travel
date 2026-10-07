/* 사용자가 요청한 공동 여행만 전송하는 Supabase REST 어댑터. SDK·관리 키를 사용하지 않는다. */
(function (root) {
  'use strict';
  const KEYS={config:'st_collaboration_config_v1',session:'st_collaboration_session_v1',outbox:'st_collaboration_outbox_v1'};
  const PLAN_FIELDS=['id','title','subtitle','style','startDate','endDate','durationDays','arrivalTime','departureTime','currency','budget','countries','cities','coverEmoji','concepts','wishlist','hubAllocations','planSource','isBucketlist','status','days','planBlockMeta','checklist','timeZone'];
  const privateField=key=>/^(?:journals?|journalentries|journaltext|diaries|diaryentries|diarytext|activityrecords|momentrecords|momententries|recordid|originaltext|expenses?|exchanges?|wallets?|initialbalances|activecurrencies|apikey|geminikey|githubpat|pat|password|accesstoken|refreshtoken|authorization|credentials?|secret|token)$/.test(key.toLowerCase().replace(/[^a-z0-9]/g,''))||/(?:photo|thumbnail|mediaid|apikey|geminikey|githubpat|password|secret|credential|accesstoken|refreshtoken|authorization)|token$/i.test(key.replace(/[^a-z0-9]/ig,''));
  class CollaborationError extends Error {
    constructor(code,message,status=0){super(message);this.name='CollaborationError';this.code=code;this.status=status;}
  }
  function redact(value,depth=0){
    if(depth>30)throw new CollaborationError('INVALID_PLAN','계획 자료가 너무 복잡합니다.');
    if(Array.isArray(value))return value.map(item=>redact(item,depth+1));
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!privateField(key)).map(([key,item])=>[key,redact(item,depth+1)]));
    return value;
  }
  function sanitizePlan(trip,transfer=root.SulsulTravel?.TripTransfer){
    if(!transfer?.create)throw new CollaborationError('ADAPTER_MISSING','여행 공유 모듈을 불러오지 못했습니다.');
    const published=transfer.create(trip,{journals:false,finances:false}).trip;
    const plan=redact(Object.fromEntries(PLAN_FIELDS.filter(key=>published[key]!==undefined).map(key=>[key,published[key]])));
    if(new TextEncoder().encode(JSON.stringify(plan)).length>1024*1024)throw new CollaborationError('PLAN_TOO_LARGE','공동 계획은 1MB 이하만 게시할 수 있습니다. 사진은 개인 기록에 보관해 주세요.');
    return plan;
  }
  function decodeJwt(key){
    try{const part=key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');return JSON.parse(root.atob(part));}catch(_){return null;}
  }
  function validateConfig(config){
    let url;try{url=new URL(String(config?.url||''));}catch(_){throw new CollaborationError('INVALID_CONFIG','Supabase 프로젝트 HTTPS 주소를 입력해 주세요.');}
    if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw new CollaborationError('INVALID_CONFIG','프로젝트 기본 HTTPS 주소만 입력해 주세요.');
    const key=String(config?.publicKey||'').trim();
    if(key.startsWith('sb_secret_')||(!/^sb_publishable_[A-Za-z0-9_-]{12,}$/.test(key)&&decodeJwt(key)?.role!=='anon'))throw new CollaborationError('UNSAFE_KEY','공개 publishable 키 또는 legacy anon 키만 사용할 수 있습니다. 관리 키는 입력하지 마세요.');
    return {url:url.origin,publicKey:key};
  }
  class SupabaseTravelService {
    constructor({storage=root.localStorage,fetchImpl=root.fetch?.bind(root),transfer=root.SulsulTravel?.TripTransfer,online=()=>root.navigator?.onLine!==false,now=()=>Date.now()}={}){
      this.storage=storage;this.fetchImpl=fetchImpl;this.transfer=transfer;this.online=online;this.now=now;this.roles=new Map();
      // 앱에 배포된 공개 설정만 보충한다. 설정 보충은 로그인/네트워크 요청을 실행하지 않는다.
      const supplied=root.SulsulCollaborationConfig;
      if(!this.configuration()&&supplied?.url&&supplied?.publicKey){try{this.configure(supplied);}catch(_){/* 미설정으로 유지한다. */}}
    }
    _read(key,fallback){try{return JSON.parse(this.storage?.getItem(key)||'null')??fallback;}catch(_){return fallback;}}
    _write(key,value){this.storage?.setItem(key,JSON.stringify(value));}
    _context(){if(!this.configured())throw new CollaborationError('NOT_CONFIGURED','서버 미연결: 공동 여행 서버를 먼저 설정해 주세요.');return validateConfig(this.configuration());}
    _assertContext(context){validateConfig(context);const current=this.configuration();if(current?.url!==context.url||current?.publicKey!==context.publicKey)throw new CollaborationError('PROJECT_CHANGED','작업 중 서버 설정이 변경되었습니다. 선택한 서버를 확인한 뒤 다시 시도해 주세요.');}
    configuration(){return this._read(KEYS.config,null);}
    configured(){try{validateConfig(this.configuration());return true;}catch(_){return false;}}
    configure(config){const validated=validateConfig(config);const previous=this.configuration();this._write(KEYS.config,validated);if(previous?.url!==validated.url){this.storage?.removeItem(KEYS.session);this.roles.clear();}return validated;}
    disconnect(){this.storage?.removeItem(KEYS.config);this.roles.clear();}
    outbox(){const queue=this._read(KEYS.outbox,[]);return Array.isArray(queue)?queue:[];}
    async _request(path,{method='POST',body,token,context=this._context()}={}){
      this._assertContext(context);
      if(!this.online())throw new CollaborationError('OFFLINE','인터넷 연결이 필요합니다.');
      const config=context,controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
      let response;
      try{response=await this.fetchImpl(config.url+path,{method,headers:{apikey:config.publicKey,'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:controller.signal});}
      catch(_){throw new CollaborationError('NETWORK','서버에 연결하지 못했습니다.');}
      finally{clearTimeout(timer);}
      let payload=null;try{payload=await response.json();}catch(_){}
      this._assertContext(context);
      if(!response.ok){
        const code=response.status===401?'AUTH_REQUIRED':response.status===403?'FORBIDDEN':response.status===429?'RATE_LIMIT':payload?.message==='INVALID_INVITE'?'INVALID_INVITE':'SERVER_ERROR';
        const message=code==='FORBIDDEN'?'이 여행에 대한 권한이 없습니다.':code==='AUTH_REQUIRED'?'임시 로그인 세션을 확인해 주세요.':code==='RATE_LIMIT'?'요청이 많습니다. 잠시 후 다시 시도해 주세요.':code==='INVALID_INVITE'?'초대가 만료되었거나 취소되었습니다. 관리자에게 새 초대를 요청해 주세요.':'서버 요청을 처리하지 못했습니다. 서버 설치와 권한을 확인해 주세요.';
        throw new CollaborationError(code,message,response.status);
      }
      return payload;
    }
    async authenticate({displayName='',captchaToken,context=this._context()}={}){
      this._assertContext(context);
      const config=context,current=this._read(KEYS.session,null);
      if(current?.projectUrl===config.url&&current.access_token&&current.expires_at>this.now()/1000+60)return current;
      let result;
      if(current?.projectUrl===config.url&&current.refresh_token){
        result=await this._request('/auth/v1/token?grant_type=refresh_token',{body:{refresh_token:current.refresh_token},context});
      }else{
        result=await this._request('/auth/v1/signup',{body:{data:{display_name:String(displayName).slice(0,40)},...(captchaToken?{gotrue_meta_security:{captcha_token:captchaToken}}:{})},context});
      }
      if(!result?.access_token||!result.user?.id)throw new CollaborationError('AUTH_REQUIRED','익명 로그인이 활성화된 서버인지 확인해 주세요.');
      const session={projectUrl:config.url,access_token:result.access_token,refresh_token:result.refresh_token,userId:result.user.id,expires_at:result.expires_at||this.now()/1000+(result.expires_in||3600)};
      this._write(KEYS.session,session);return session;
    }
    async _rpc(name,body){const context=this._context(),session=await this.authenticate({context});return this._request(`/rest/v1/rpc/${name}`,{body,token:session.access_token,context});}
    async createDocument(trip){const body=sanitizePlan(trip,this.transfer);const result=await this._rpc('travel_create_document',{p_body:body});if(!result?.document_id||!Number.isInteger(result.revision))throw new CollaborationError('INVALID_RESPONSE','공동 여행 서버 응답 형식을 확인해 주세요.');this.roles.set(result.document_id,'owner');return result;}
    async getDocument(documentId){
      const context=this._context(),session=await this.authenticate({context}),id=encodeURIComponent(documentId);
      const rows=await this._request(`/rest/v1/travel_documents?id=eq.${id}&select=id,body,revision,updated_at`,{method:'GET',token:session.access_token,context});
      if(!rows?.[0])throw new CollaborationError('FORBIDDEN','여행을 찾지 못했거나 참여 권한이 없습니다.',403);
      const membership=await this._request(`/rest/v1/travel_memberships?document_id=eq.${id}&user_id=eq.${encodeURIComponent(session.userId)}&select=role`,{method:'GET',token:session.access_token,context});
      const role=membership?.[0]?.role;if(!role)throw new CollaborationError('FORBIDDEN','참여 권한을 확인하지 못했습니다.',403);
      this.roles.set(documentId,role);return {...rows[0],role};
    }
    async members(documentId){const context=this._context(),session=await this.authenticate({context});return this._request(`/rest/v1/travel_memberships?document_id=eq.${encodeURIComponent(documentId)}&select=user_id,role,display_name,joined_at&order=joined_at.asc`,{method:'GET',token:session.access_token,context});}
    async history(documentId){const context=this._context(),session=await this.authenticate({context});return this._request(`/rest/v1/travel_changes?document_id=eq.${encodeURIComponent(documentId)}&select=revision,actor_id,summary,created_at&order=revision.desc&limit=20`,{method:'GET',token:session.access_token,context});}
    async invites(documentId){const context=this._context(),session=await this.authenticate({context});return this._request(`/rest/v1/travel_invites?document_id=eq.${encodeURIComponent(documentId)}&select=id,role,expires_at,revoked_at,created_at&order=created_at.desc`,{method:'GET',token:session.access_token,context});}
    async createInvite(documentId,{role='viewer',expiresDays=7}={}){
      if(!['viewer','editor'].includes(role)||![1,7,30].includes(Number(expiresDays)))throw new CollaborationError('INVALID_INVITE','초대 권한과 만료 기간을 확인해 주세요.');
      return this._rpc('travel_create_invite',{p_document_id:documentId,p_role:role,p_expires_days:Number(expiresDays)});
    }
    async acceptInvite(token,displayName=''){
      if(!/^[A-Za-z0-9_-]{32}$/.test(token))throw new CollaborationError('INVALID_INVITE','초대 링크 형식이 올바르지 않습니다.');
      const result=await this._rpc('travel_accept_invite',{p_token:token,p_display_name:String(displayName).slice(0,40)});this.roles.set(result.document_id,result.role);return result;
    }
    revokeInvite(inviteId){return this._rpc('travel_revoke_invite',{p_invite_id:inviteId});}
    removeMember(documentId,userId){return this._rpc('travel_remove_member',{p_document_id:documentId,p_user_id:userId});}
    setKnownRole(documentId,role){if(['owner','editor','viewer'].includes(role))this.roles.set(documentId,role);}
    _queue(entry){const queue=this.outbox();if(queue.length>=20)throw new CollaborationError('OUTBOX_FULL','대기 중인 변경이 많습니다. 기존 변경을 확인해 주세요.');queue.push({...entry,state:'pending'});this._write(KEYS.outbox,queue);return {state:'queued',mutationId:entry.mutationId};}
    async publishDocument(documentId,trip,baseRevision,{role=this.roles.get(documentId),summary='일정 수정'}={}){
      const context=this._context();
      if(role==='viewer')throw new CollaborationError('READ_ONLY','보기 전용 초대입니다. 공동 계획을 변경할 수 없습니다.');
      if(!['owner','editor'].includes(role))throw new CollaborationError('ROLE_REQUIRED','연결된 여행을 먼저 확인해 주세요.');
      if(!Number.isInteger(baseRevision)||baseRevision<1)throw new CollaborationError('INVALID_REVISION','공동 계획 버전을 먼저 확인해 주세요.');
      const session=this._read(KEYS.session,null);
      if(!session?.userId||session.projectUrl!==context.url)throw new CollaborationError('AUTH_REQUIRED','이 브라우저에서 공동 여행 연결을 먼저 확인해 주세요.');
      const entry={mutationId:root.crypto.randomUUID(),projectUrl:context.url,documentId,baseRevision,body:sanitizePlan(trip,this.transfer),summary:String(summary).slice(0,120),createdAt:new Date(this.now()).toISOString(),userId:session.userId};
      if(!this.online())return this._queue(entry);
      try{return await this._send(entry);}catch(error){if(['NETWORK','OFFLINE'].includes(error.code))return this._queue(entry);throw error;}
    }
    async _send(entry){
      const context=this._context();if(context.url!==entry.projectUrl)throw new CollaborationError('PROJECT_CHANGED','이 대기 변경의 서버와 현재 서버가 다릅니다.');
      const session=await this.authenticate({context});
      if(entry.userId!==session.userId)throw new CollaborationError('ACCOUNT_CHANGED','변경을 작성한 임시 로그인 계정과 현재 계정이 다릅니다.');
      const result=await this._request('/rest/v1/rpc/travel_update_document',{body:{p_document_id:entry.documentId,p_expected_revision:entry.baseRevision,p_body:sanitizePlan(entry.body,this.transfer),p_summary:entry.summary,p_mutation_id:entry.mutationId},token:session.access_token,context});
      if(!result||!['applied','duplicate','conflict'].includes(result.status)||!Number.isInteger(result.revision))throw new CollaborationError('INVALID_RESPONSE','공동 여행 서버 응답 형식을 확인해 주세요.');
      return {...result,state:result.status==='conflict'?'conflict':'applied'};
    }
    async flushOutbox(){
      if(!this.configured())throw new CollaborationError('NOT_CONFIGURED','서버 미연결: 공동 여행 서버를 먼저 설정해 주세요.');
      const session=await this.authenticate(),queue=this.outbox(),results=[];
      for(const entry of queue){
        if(entry.state!=='pending')continue;
        if(entry.projectUrl!==this.configuration().url||entry.userId!==session.userId){entry.state='blocked';results.push({state:'blocked',mutationId:entry.mutationId});continue;}
        try{const result=await this._send(entry);entry.state=result.state==='conflict'?'conflict':'sent';entry.serverRevision=result.revision;results.push({...result,mutationId:entry.mutationId});}
        catch(error){if(['NETWORK','OFFLINE'].includes(error.code))break;entry.state='blocked';results.push({state:'blocked',mutationId:entry.mutationId});}
        // 첫 충돌 이후 같은 원본 버전은 자동 재기반하지 않는다.
        if(entry.state==='conflict')for(const next of queue)if(next.documentId===entry.documentId&&next.state==='pending')next.state='conflict';
      }
      // 서버 응답을 기다리는 동안 다른 탭에서 추가한 항목을 유지한다.
      const processed=new Map(queue.map(entry=>[entry.mutationId,entry]));
      this._write(KEYS.outbox,this.outbox().map(entry=>processed.get(entry.mutationId)||entry).filter(entry=>entry.state!=='sent'));return results;
    }
    discardOutbox(mutationId){this._write(KEYS.outbox,this.outbox().filter(entry=>entry.mutationId!==mutationId));}
  }
  const api={SupabaseTravelService,CollaborationError,sanitizePlan,validateConfig,KEYS};
  root.SulsulTravel=root.SulsulTravel||{};root.SulsulTravel.Collaboration=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
