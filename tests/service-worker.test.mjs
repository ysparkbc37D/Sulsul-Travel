import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const version=source.match(/const V = '([^']+)'/)[1],scope='https://travel.example/app/';
const asset=source.match(/'\.\/css\/companion\.css\?v=([^']+)'/)[1];
const assetUrl=scope+'css/companion.css?v='+asset;
function harness() {
  const listeners={},stores=new Map(),calls=[],puts=[],addFailures=new Set();
  let skips=0,updates=0;
  let online=true,nextResponse=()=>new Response('새 자산');
  const shellVersion=version.replace('st-shell-v','');
  let shellText=`<script>const APP_VER = '${shellVersion}';</script>새 셸`;
  const key=request=>typeof request==='string'?new URL(request,scope).href:request.url;
  const cache=name=>{
    if(!stores.has(name))stores.set(name,new Map());
    return {match:async request=>stores.get(name).get(key(request))?.clone(),put:async(request,response)=>{puts.push({name,url:key(request)});stores.get(name).set(key(request),response.clone());},add:async request=>{
      const url=key(request);if(addFailures.has(url))throw new Error('SYNTHETIC_PRECACHE_FAILURE');
      stores.get(name).set(url,new Response(url===scope||url===scope+'index.html'?shellText:'사전 자산'));
    }};
  };
  runInNewContext(source,{
    self:{registration:{scope,update:async()=>{updates++;}},addEventListener:(type,fn)=>{listeners[type]=fn;},skipWaiting:async()=>{skips++;},clients:{claim:async()=>{}}},
    caches:{open:async name=>cache(name),keys:async()=>[...stores.keys()],delete:async name=>stores.delete(name)},
    fetch:async request=>{calls.push(key(request));if(!online)throw new Error('오프라인');return nextResponse();},
    URL,Response,console
  });
  return {calls,puts,stores,cache,get skips(){return skips;},get updates(){return updates;},failAdd:url=>addFailures.add(url),setShell:value=>{shellText=value;},setOnline:value=>{online=value;},setResponse:fn=>{nextResponse=fn;},
    async request(url,{method='GET',mode='cors',headers={}}={}) {
      let response;const pending=[];
      listeners.fetch({request:{url,method,mode,headers:new Headers(headers)},respondWith:value=>{response=Promise.resolve(value);},waitUntil:value=>{pending.push(value);}});
      const result=response?await response:undefined;await Promise.all(pending);return result;
    },async activate(){let pending;listeners.activate({waitUntil:value=>{pending=value;}});await pending;},async install(){let pending;listeners.install({waitUntil:value=>{pending=value;}});await pending;}
  };
}

test('외부 API·인증 헤더·목록 밖 URL은 서비스워커 응답과 캐시를 우회한다',async()=>{
  const h=harness();
  for(const url of ['https://example.supabase.co/rest/v1/travel_documents','https://open.er-api.com/v6/latest/USD','https://tile.openstreetmap.org/1/1/1.png',scope+'api/trips',scope+'private.json'])assert.equal(await h.request(url),undefined,url);
  for(const header of ['Authorization','apikey','x-goog-api-key'])assert.equal(await h.request(assetUrl,{headers:{[header]:'mock-secret'}}),undefined,header);
  assert.equal(await h.request(assetUrl,{method:'POST'}),undefined);assert.equal(h.calls.length,0);assert.equal(h.puts.length,0);
});
test('현재 자산의 쿼리가 정확히 일치해야 하며 이전 버전 캐시가 현재 자산에 섞이지 않는다',async()=>{
  const h=harness();await h.cache('st-shell-old').put(assetUrl,new Response('이전 버전'));
  assert.equal(await h.request(assetUrl.replace('?v='+asset,'?v=old')),undefined);
  assert.equal(await h.request(assetUrl.split('?')[0]),undefined);
  const response=await h.request(assetUrl);assert.equal(await response.text(),'새 자산');
  assert.equal(h.puts.at(-1).name,version);assert.equal(h.puts.at(-1).url,assetUrl);
});
test('설치한 자산은 서버의 다음 배포 내용으로 덮어쓰지 않고 오프라인에도 같은 내용을 읽는다',async()=>{
  const h=harness();await h.cache(version).put(assetUrl,new Response('저장된 자산'));h.setResponse(()=>new Response('갱신된 자산'));
  assert.equal(await (await h.request(assetUrl)).text(),'저장된 자산');
  assert.equal(await (await h.cache(version).match(assetUrl)).text(),'저장된 자산');assert.equal(h.calls.length,0);
  h.setOnline(false);assert.equal(await (await h.request(assetUrl)).text(),'저장된 자산');
  const missing=harness();missing.setOnline(false);assert.equal((await missing.request(assetUrl)).status,408);
});
test('비공개·저장 금지 응답은 허용 자산 경로에서도 저장하지 않는다',async()=>{
  for(const policy of ['no-store','private, max-age=60']){
    const h=harness();h.setResponse(()=>new Response('비공개 응답',{headers:{'Cache-Control':policy}}));
    assert.equal(await (await h.request(assetUrl)).text(),'비공개 응답');assert.equal(h.puts.length,0);
  }
});
test('앱 진입 쿼리를 저장하지 않고 현재 버전 앱 셸에서 오프라인 진입을 복구한다',async()=>{
  const h=harness();const shell=scope+'index.html';
  const html=`<script>const APP_VER = '${version.replace('st-shell-v','')}';</script>새 셸`;h.setResponse(()=>new Response(html));
  assert.equal(await (await h.request(scope+'?preview=current',{mode:'navigate'})).text(),html);assert.equal(h.puts.at(-1).url,shell);
  h.setOnline(false);assert.equal(await (await h.request(scope+'?preview=old',{mode:'navigate'})).text(),html);
  assert.equal(await h.request(scope+'rest/v1/trips',{mode:'navigate'}),undefined);
  const previous=harness();await previous.cache('st-shell-old').put(shell,new Response('오래된 셸'));previous.setOnline(false);
  assert.match(await (await previous.request(scope,{mode:'navigate'})).text(),/술술트래블 오프라인 연결/);
});
test('필수 JS·CSS·셸 실패는 새 워커 설치를 중단하고 이전 캐시를 보존한다',async()=>{
  for(const failed of [scope+'js/domain/ai-draft-validation.js?v='+asset,assetUrl,scope+'index.html']){
    const h=harness();await h.cache('st-shell-old').put(assetUrl,new Response('이전 정상 앱'));h.failAdd(failed);
    await assert.rejects(h.install(),/SYNTHETIC_PRECACHE_FAILURE/);assert.equal(h.skips,0);assert.equal(h.stores.has('st-shell-old'),true);
  }
  const mismatched=harness();mismatched.setShell("<script>const APP_VER = '999.0.0';</script>");
  await assert.rejects(mismatched.install(),/APP_SHELL_VERSION_MISMATCH/);assert.equal(mismatched.skips,0);
  const complete=harness();await complete.install();assert.equal(complete.skips,1);
});
test('새 버전 HTML을 받더라도 구 워커의 정상 셸을 덮어쓰지 않는다',async()=>{
  const h=harness(),shell=scope+'index.html',old="<script>const APP_VER = '"+version.replace('st-shell-v','')+"';</script>정상 오프라인 셸";
  await h.cache(version).put(shell,new Response(old));h.setResponse(()=>new Response("<script>const APP_VER = '999.0.0';</script>새 버전"));
  assert.match(await (await h.request(scope+'?upgrade=1',{mode:'navigate'})).text(),/999.0.0/);assert.equal(h.updates,1);
  await h.request(shell);assert.equal(await (await h.cache(version).match(shell)).text(),old);
  h.setOnline(false);assert.equal(await (await h.request(scope,{mode:'navigate'})).text(),old);
});
test('활성화할 때 과거 앱 캐시를 제거하고 다른 앱의 저장소는 보존한다',async()=>{
  const h=harness();await h.cache(version).put(assetUrl,new Response('현재'));await h.cache('st-shell-old').put(assetUrl,new Response('과거'));await h.cache('another-app').put(assetUrl,new Response('다른 앱'));
  await h.activate();assert.equal(h.stores.has('st-shell-old'),false);assert.equal(h.stores.has(version),true);assert.equal(h.stores.has('another-app'),true);
});
