import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
const require=createRequire(import.meta.url);
globalThis.crypto ||= webcrypto;
require('../js/domain/trip-adapter.js');
const transfer=require('../js/domain/trip-transfer.js');
const {SupabaseTravelService,validateConfig,sanitizePlan,KEYS}=require('../js/infrastructure/collaboration/supabase-travel-service.js');
const ui=require('../js/presentation/collaboration-ui.js');
const NOW=Date.parse('2026-10-07T00:00:00Z'),config={url:'https://example.supabase.co',publicKey:'sb_publishable_mockpublic123456'};
const docId='d0000000-0000-4000-8000-000000000001',userId='u-test-owner';
function storage(){const values=new Map();return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};}
const trip=()=>({id:'trip-local',title:'우리의 파타고니아',startDate:'2026-10-11',endDate:'2026-10-11',cities:['엘 칼라파테'],days:[{id:'day-stable',dayNum:1,date:'2026-10-11',city:'엘 칼라파테',spots:[{id:'spot-stable',title:'빙하',cat:'tour',time:'10:00',completed:true,fixed:true,recordId:'private-record',photos:['data:image/jpeg;base64,YQ=='],st_gemini_key:'private-nested-key',access_token:'private-session'}]}],journals:{0:{text:'내 개인 일기',photos:['data:image/jpeg;base64,YQ==']}},momentEntries:[{id:'moment-private',date:'2026-10-11',time:'10:00',text:'개인 순간',photos:[],coverIndex:0}],activityRecords:{'private-record':{id:'private-record',context:{title:'빙하'},text:'개인 일정 일기',photos:[],coverIndex:0}},expenses:[{id:'expense-private',amount:100,currency:'KRW',title:'개인 지출'}],apiKey:'top-private-key',githubPat:'top-private-pat',planBlockMeta:{block:{title:'함께 보는 거점',note:'계획 메모',nested:{refresh_token:'private-refresh',photoThumbnails:['private-photo'],originalText:'private-original',momentEntries:['private-nested-record']}}}});
const response=(body,status=200)=>({ok:status>=200&&status<300,status,json:async()=>body});
function fixture(handler=()=>response({})){const local=storage(),calls=[];let isOnline=true;const service=new SupabaseTravelService({storage:local,transfer,now:()=>NOW,online:()=>isOnline,fetchImpl:async(url,options)=>{const call={url,options,body:options.body?JSON.parse(options.body):null};calls.push(call);return handler(call);}});return {service,local,calls,setOnline:value=>{isOnline=value;}};}
function login(f,user=userId){f.service.configure(config);f.local.setItem(KEYS.session,JSON.stringify({projectUrl:config.url,userId:user,access_token:'mock-user-jwt',refresh_token:'mock-user-refresh',expires_at:NOW/1000+3600}));}

test('설정 저장·초대 감지만으로 로그인이나 여행 전송을 시작하지 않는다',async()=>{
  const f=fixture();assert.equal(f.service.configured(),false);
  await assert.rejects(()=>f.service.createDocument(trip()),error=>error.code==='NOT_CONFIGURED');
  f.service.configure(config);assert.equal(f.calls.length,0);
  assert.equal(ui.checkInviteOnStartup({hash:'#invite='+'a'.repeat(32)}),true);
  assert.equal(f.calls.length,0);assert.equal(ui.checkInviteOnStartup({hash:'#share=existing-payload'}),false);
});

test('service_role·secret·HTTP·경로 포함 설정을 거절하고 공개 키만 받는다',()=>{
  const jwt=role=>`header.${Buffer.from(JSON.stringify({role})).toString('base64url')}.signature`;
  assert.throws(()=>validateConfig({...config,publicKey:'sb_secret_mock123456'}),error=>error.code==='UNSAFE_KEY');
  assert.throws(()=>validateConfig({...config,publicKey:jwt('service_role')}),error=>error.code==='UNSAFE_KEY');
  assert.throws(()=>validateConfig({...config,url:'http://example.supabase.co'}),error=>error.code==='INVALID_CONFIG');
  assert.throws(()=>validateConfig({...config,url:config.url+'/rest/v1'}),error=>error.code==='INVALID_CONFIG');
  assert.equal(validateConfig({...config,publicKey:jwt('anon')}).publicKey,jwt('anon'));
});

test('공동 게시와 오프라인 대기 자료에서 개인 기록·사진·키를 재귀적으로 제외하고 원본을 보존한다',async()=>{
  const original=trip(),before=structuredClone(original),published=sanitizePlan(original,transfer),encoded=JSON.stringify(published);
  assert.deepEqual(original,before);assert.equal(published.days[0].spots[0].id,'spot-stable');assert.equal(published.days[0].spots[0].completed,true);assert.equal(published.days[0].spots[0].fixed,true);assert.deepEqual(published.cities,['엘 칼라파테']);
  for(const forbidden of ['private-','개인','top-private','data:image','recordId','journals','expenses','momentEntries','originalText'])assert.equal(encoded.includes(forbidden),false,forbidden);
  assert.equal(published.planBlockMeta.block.note,'계획 메모');
  const f=fixture();login(f);f.setOnline(false);f.service.setKnownRole(docId,'owner');
  assert.equal((await f.service.publishDocument(docId,original,4)).state,'queued');
  assert.equal(JSON.stringify(f.service.outbox()).includes('private-'),false);assert.deepEqual(original,before);assert.equal(f.calls.length,0);
});

test('익명 Auth는 명시 요청에서만 생성하고 publishable 키는 apikey 헤더에만 보낸다',async()=>{
  const f=fixture(call=>call.url.endsWith('/auth/v1/signup')?response({access_token:'mock-user-jwt',refresh_token:'mock-refresh',user:{id:userId},expires_in:3600}):response({document_id:docId,revision:1,role:'owner'}));
  f.service.configure(config);await f.service.authenticate({displayName:'민수',captchaToken:'mock-captcha'});await f.service.createDocument(trip());
  assert.equal(f.calls.length,2);assert.deepEqual(f.calls[0].body,{data:{display_name:'민수'},gotrue_meta_security:{captcha_token:'mock-captcha'}});
  assert.equal(f.calls[0].options.headers.Authorization,undefined);assert.equal(f.calls[1].options.headers.Authorization,'Bearer mock-user-jwt');assert.equal(f.calls[1].options.headers.apikey,config.publicKey);
  assert.equal(JSON.stringify(f.calls[1].body).includes('개인'),false);
});

test('보기/편집 초대는 32자 서버 토큰 링크로 만들고 역할·만료·취소 RPC를 구분한다',async()=>{
  const token='aB0_'.repeat(8),f=fixture(call=>call.url.endsWith('/travel_create_invite')?response({id:'invite-id',token,role:call.body.p_role,expires_at:'2026-10-14T00:00:00Z'}):response({status:'revoked'}));login(f);
  const viewer=await f.service.createInvite(docId,{role:'viewer',expiresDays:7}),editor=await f.service.createInvite(docId,{role:'editor',expiresDays:1});
  assert.equal(viewer.role,'viewer');assert.equal(editor.role,'editor');assert.deepEqual(f.calls.map(call=>call.body.p_expires_days),[7,1]);
  const url=ui.inviteUrl(viewer.token,{origin:'https://travel.example',pathname:'/'});assert.equal(url,`https://travel.example/#invite=${token}`);assert.ok(url.length<100);assert.equal(url.includes('trip'),false);
  await f.service.revokeInvite('invite-id');assert.deepEqual(f.calls[2].body,{p_invite_id:'invite-id'});
  await assert.rejects(()=>f.service.createInvite(docId,{role:'owner'}),error=>error.code==='INVALID_INVITE');
});

test('만료·취소 초대 오류를 안전하게 알리고 보기 권한으로 계획 전송을 막는다',async()=>{
  const f=fixture(()=>response({code:'22023',message:'INVALID_INVITE'},400));login(f);
  await assert.rejects(()=>f.service.acceptInvite('b'.repeat(32)),error=>error.code==='INVALID_INVITE'&&error.message.includes('만료'));
  const prior=f.calls.length;f.service.setKnownRole(docId,'viewer');
  await assert.rejects(()=>f.service.publishDocument(docId,trip(),1),error=>error.code==='READ_ONLY');assert.equal(f.calls.length,prior);
});

test('로컬 역할을 위조해도 서버 403을 실패로 처리하고 원문 서버 오류/키를 노출하지 않는다',async()=>{
  const f=fixture(()=>response({message:'secret-role-details private-key'},403));login(f);
  await assert.rejects(()=>f.service.publishDocument(docId,trip(),1,{role:'editor'}),error=>error.code==='FORBIDDEN'&&!error.message.includes('private-key'));
  assert.equal(f.service.outbox().length,0);
});

test('온라인 revision 충돌은 원본 버전과 계획을 보존하고 자동 병합·재전송하지 않는다',async()=>{
  const f=fixture(()=>response({status:'conflict',revision:5}));login(f);f.service.setKnownRole(docId,'editor');const original=trip(),before=structuredClone(original);
  const result=await f.service.publishDocument(docId,original,3);
  assert.equal(result.state,'conflict');assert.equal(result.revision,5);assert.equal(f.calls[0].body.p_expected_revision,3);assert.deepEqual(original,before);assert.equal(f.calls.length,1);assert.equal(f.service.outbox().length,0);
});

test('오프라인 변경을 원본 revision으로 재전송하고 충돌 이후 같은 문서의 대기를 자동 재기반하지 않는다',async()=>{
  const f=fixture(()=>response({status:'conflict',revision:8}));login(f);f.service.setKnownRole(docId,'editor');f.setOnline(false);
  await f.service.publishDocument(docId,trip(),3);const second=trip();second.days[0].spots[0].title='수정한 빙하';await f.service.publishDocument(docId,second,3);
  f.setOnline(true);const result=await f.service.flushOutbox();assert.equal(result[0].state,'conflict');assert.equal(f.calls.length,1);assert.equal(f.calls[0].body.p_expected_revision,3);
  assert.deepEqual(f.service.outbox().map(entry=>entry.baseRevision),[3,3]);assert.deepEqual(f.service.outbox().map(entry=>entry.state),['conflict','conflict']);assert.equal(f.service.outbox()[1].body.days[0].spots[0].title,'수정한 빙하');
  await f.service.flushOutbox();assert.equal(f.calls.length,1);
});

test('네트워크 실패는 안전한 계획을 대기하고 동일 mutation으로 재시도해 중복 적용을 막는다',async()=>{
  let failure=true;const f=fixture(()=>{if(failure)throw new Error('network');return response({status:'duplicate',revision:2,applied_revision:2});});login(f);f.service.setKnownRole(docId,'owner');
  const first=await f.service.publishDocument(docId,trip(),1);assert.equal(first.state,'queued');const mutation=f.service.outbox()[0].mutationId;failure=false;
  const results=await f.service.flushOutbox();assert.equal(results[0].state,'applied');assert.equal(f.calls[1].body.p_mutation_id,mutation);assert.equal(f.calls[1].body.p_expected_revision,1);assert.equal(f.service.outbox().length,0);
});

test('다른 프로젝트·익명 계정으로 전환된 대기 변경은 전송하지 않는다',async()=>{
  const f=fixture();login(f);f.service.setKnownRole(docId,'owner');f.setOnline(false);await f.service.publishDocument(docId,trip(),2);
  f.setOnline(true);login(f,'different-user');const results=await f.service.flushOutbox();assert.equal(results[0].state,'blocked');assert.equal(f.calls.length,0);assert.equal(f.service.outbox()[0].baseRevision,2);
});

test('서버로부터 확인한 viewer 권한은 기존 owner 힌트를 교체한다',async()=>{
  const f=fixture(call=>response(call.url.includes('travel_documents?')?[{id:docId,body:sanitizePlan(trip(),transfer),revision:6,updated_at:'2026-10-07T00:00:00Z'}]:[{role:'viewer'}]));login(f);f.service.setKnownRole(docId,'owner');
  const remote=await f.service.getDocument(docId);assert.equal(remote.role,'viewer');assert.equal(f.service.roles.get(docId),'viewer');
});

test('인증 await 사이에 서버가 변경되어도 이전 JWT나 계획을 새 URL로 전송하지 않는다',async()=>{
  const f=fixture(()=>response({document_id:docId,revision:1,role:'owner'}));login(f);
  const posting=f.service.createDocument(trip());
  f.service.configure({...config,url:'https://other.supabase.co'});
  await assert.rejects(()=>posting,error=>error.code==='PROJECT_CHANGED');assert.equal(f.calls.length,0);
});

test('토큰 갱신 중 설정이 바뀌면 응답을 채택하지 않고 후속 여행 RPC를 중단한다',async()=>{
  let release,started;const waitForStart=new Promise(resolve=>{started=resolve;});
  const f=fixture(async()=>{started();return new Promise(resolve=>{release=resolve;});});login(f);
  const session=JSON.parse(f.local.getItem(KEYS.session));session.expires_at=NOW/1000-1;f.local.setItem(KEYS.session,JSON.stringify(session));
  const pending=f.service.createDocument(trip());await waitForStart;
  f.service.configure({...config,url:'https://other.supabase.co'});
  release(response({access_token:'mock-old-project-jwt',refresh_token:'mock-refresh',user:{id:userId},expires_in:3600}));
  await assert.rejects(()=>pending,error=>error.code==='PROJECT_CHANGED');assert.equal(f.calls.length,1);assert.ok(f.calls[0].url.startsWith(config.url));assert.equal(f.local.getItem(KEYS.session),null);
});

test('전송 중 다른 탭이 추가한 대기 변경은 flush의 오래된 사본에 덮이지 않는다',async()=>{
  let release,started;const waitForStart=new Promise(resolve=>{started=resolve;});
  const f=fixture(async()=>{started();return new Promise(resolve=>{release=resolve;});});login(f);f.service.setKnownRole(docId,'owner');f.setOnline(false);
  await f.service.publishDocument(docId,trip(),1);f.setOnline(true);const flushing=f.service.flushOutbox();await waitForStart;
  const secondTab=new SupabaseTravelService({storage:f.local,transfer,online:()=>false,now:()=>NOW,fetchImpl:()=>{throw new Error('must not call');}});secondTab.setKnownRole(docId,'owner');
  const secondTrip=trip();secondTrip.days[0].spots[0].title='다른 탭에서 작성';const queued=await secondTab.publishDocument(docId,secondTrip,1);
  release(response({status:'applied',revision:2}));await flushing;
  const remaining=f.service.outbox();assert.equal(remaining.length,1);assert.equal(remaining[0].mutationId,queued.mutationId);assert.equal(remaining[0].body.days[0].spots[0].title,'다른 탭에서 작성');assert.equal(remaining[0].baseRevision,1);
});

function fakeDocument(){
  const container=new Node('div');
  function Node(tag){this.tagName=tag;this.children=[];this.style={};this.listeners={};this.attributes={};this.textContent='';}
  Node.prototype.append=function(...children){this.children.push(...children);};
  Node.prototype.replaceChildren=function(...children){this.children=children;};
  Node.prototype.setAttribute=function(key,value){this.attributes[key]=value;};
  Node.prototype.addEventListener=function(type,listener){this.listeners[type]=listener;};
  const walk=node=>[node,...node.children.flatMap(walk)];
  return {container,createElement:tag=>new Node(tag),getElementById:()=>container,button:text=>walk(container).find(node=>node.tagName==='button'&&node.textContent===text),texts:()=>walk(container).map(node=>node.textContent).join('\n')};
}

test('UI를 열 때 네트워크를 호출하지 않고 viewer의 보내기 버튼을 비활성화한다',()=>{
  const f=fixture();login(f);ui.attachTrip('trip-local',{documentId:docId,revision:1,role:'viewer'},f.service);
  const previous=globalThis.document,doc=fakeDocument();globalThis.document=doc;
  try{const mounted=ui.mount('collaboration',{service:f.service,getTrip:trip});assert.equal(f.calls.length,0);assert.equal(doc.button('내 변경 보내기').disabled,true);assert.equal(doc.button('함께 편집 초대'),undefined);mounted.destroy();}finally{globalThis.document=previous;}
});

test('서버 게시 후 로컬 연결 저장 실패는 같은 문서 연결 재시도이며 중복 게시하지 않는다',async()=>{
  const f=fixture(()=>response({document_id:docId,revision:1,role:'owner'}));login(f);
  const write=f.local.setItem;let fail=true;f.local.setItem=(key,value)=>{if(key===ui.LINK_KEY&&fail)throw new Error('quota');write(key,value);};
  const previous=globalThis.document,doc=fakeDocument();globalThis.document=doc;
  try{const mounted=ui.mount('collaboration',{service:f.service,getTrip:trip});await doc.button('공동 여행 게시').listeners.click();
    assert.ok(doc.button('게시한 여행 연결 저장'));assert.equal(f.calls.length,1);fail=false;
    await doc.button('게시한 여행 연결 저장').listeners.click();assert.equal(f.calls.length,1);assert.equal(ui.roomForTrip(trip(),f.service).documentId,docId);mounted.destroy();
  }finally{globalThis.document=previous;}
});

test('배포된 공개 기본 설정은 개인 설정이 없을 때만 보충하며 네트워크를 호출하지 않는다',()=>{
  globalThis.SulsulCollaborationConfig=config;
  try{const f=fixture();assert.equal(f.service.configured(),true);assert.equal(f.calls.length,0);
    f.service.configure({...config,url:'https://personal.supabase.co'});
    const second=new SupabaseTravelService({storage:f.local,transfer,fetchImpl:()=>{throw new Error('must not call');}});assert.equal(second.configuration().url,'https://personal.supabase.co');
  }finally{delete globalThis.SulsulCollaborationConfig;}
});

test('설치 SQL은 읽기 RLS·쓰기 RPC 경계와 토큰 해시 계약을 포함한다 (실 DB 검증과 구분)',()=>{
  const sql=readFileSync(new URL('../backend/supabase-travel.sql',import.meta.url),'utf8');
  for(const table of ['travel_documents','travel_memberships','travel_invites','travel_changes'])assert.ok(sql.includes(`alter table public.${table} enable row level security`));
  assert.equal(/grant\s+(?:all|insert|update|delete)\s+on\s+public\.travel_/i.test(sql),false);
  assert.ok(sql.includes("extensions.digest(invite_token,'sha256')"));assert.ok(sql.includes('for update'));assert.ok(sql.includes("current_revision <> p_expected_revision"));assert.ok(sql.includes("array['owner','editor']"));assert.ok(sql.includes("security invoker set search_path = ''"));
  assert.ok(sql.includes('grant select (id,document_id,role,expires_at,revoked_at,created_at) on public.travel_invites'));
});
