/* 실제 서비스워커 격리 검증: 합성 응답만 사용하며 외부 계정이나 여행 데이터를 읽지 않는다. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const cacheName=source.match(/const V = '([^']+)'/)[1],version=source.match(/css\/companion\.css\?v=([^']+)/)[1];
const asset='/css/companion.css?v='+version;
let nextDeployment=false;
const future='999.0.0';
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');res.setHeader('Cache-Control','no-store');
  if(url.pathname==='/__sw-check'){
    res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="ko"><meta charset="utf-8"><title>SW 격리 검사</title><body>합성 서비스워커 검사</body></html>');return;
  }
  if(url.pathname.startsWith('/api/')||req.headers.authorization){res.setHeader('Content-Type','text/plain');res.end('SYNTHETIC_PRIVATE_BODY');return;}
  if(nextDeployment){
    if(url.pathname==='/sw.js'){res.setHeader('Content-Type','application/javascript');res.end(source.replaceAll(version,future));return;}
    if(url.pathname==='/'||url.pathname==='/index.html'){res.setHeader('Content-Type','text/html');res.end("<!doctype html><html><script>const APP_VER = '"+future+"';</script><body>SYNTHETIC_FUTURE_SHELL</body></html>");return;}
    if(url.pathname==='/css/companion.css'){
      if(url.searchParams.get('v')===future){res.writeHead(503).end('SYNTHETIC_REQUIRED_ASSET_UNAVAILABLE');return;}
      res.setHeader('Content-Type','text/css');res.end('/* SYNTHETIC_FUTURE_CSS_BODY */');return;
    }
  }
  if(url.pathname==='/css/companion.css'&&url.searchParams.get('v')==='old'){res.setHeader('Content-Type','text/plain');res.end('SYNTHETIC_OLD_VERSION_BODY');return;}
  const file=path.resolve(root,'.'+url.pathname.replace(/\/$/,'/index.html'));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}
    res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');res.end(data);
  });
});
const external=http.createServer((_req,res)=>{res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Cache-Control','no-store');res.end('SYNTHETIC_EXTERNAL_TRAVEL_BODY');});
(async()=>{
  await Promise.all([new Promise(resolve=>server.listen(0,'127.0.0.1',resolve)),new Promise(resolve=>external.listen(0,'127.0.0.1',resolve))]);
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  try{
    const context=await browser.newContext({serviceWorkers:'allow'}),page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    const origin='http://127.0.0.1:'+server.address().port,externalOrigin='http://127.0.0.1:'+external.address().port;
    await context.route('**/*',route=>[origin,externalOrigin].includes(new URL(route.request().url()).origin)?route.continue():route.abort());
    await page.goto(origin+'/__sw-check');
    await page.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;});
    await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
    const result=await page.evaluate(async({cacheName,asset,externalOrigin})=>{
      const cache=await caches.open(cacheName),before=await (await cache.match(asset)).text();
      const privateBody=await (await fetch(asset,{headers:{Authorization:'Bearer synthetic-token'}})).text();
      const apiBody=await (await fetch('/api/synthetic-travel')).text();
      const externalBody=await (await fetch(externalOrigin+'/travel-body')).text();
      const oldBody=await (await fetch('/css/companion.css?v=old')).text();
      const after=await (await cache.match(asset)).text(),keys=(await cache.keys()).map(request=>request.url);
      return {before,after,privateBody,apiBody,externalBody,oldBody,keys};
    },{cacheName,asset,externalOrigin});
    assert.equal(result.privateBody,'SYNTHETIC_PRIVATE_BODY');assert.equal(result.apiBody,'SYNTHETIC_PRIVATE_BODY');
    assert.equal(result.externalBody,'SYNTHETIC_EXTERNAL_TRAVEL_BODY');assert.equal(result.oldBody,'SYNTHETIC_OLD_VERSION_BODY');
    assert.equal(result.before,result.after);assert.ok(!result.after.includes('SYNTHETIC_PRIVATE_BODY'));
    assert.ok(result.keys.every(url=>new URL(url).origin===origin));assert.ok(result.keys.every(url=>!url.includes('/api/')&&!url.includes('?v=old')));
    nextDeployment=true;
    const failedUpgrade=await page.evaluate(async()=>{
      const registration=await navigator.serviceWorker.getRegistration();
      const stopped=new Promise(resolve=>registration.addEventListener('updatefound',()=>{
        const worker=registration.installing;
        worker.addEventListener('statechange',()=>{if(worker.state==='redundant')resolve(worker.state);});
      },{once:true}));
      await registration.update();return stopped;
    });
    assert.equal(failedUpgrade,'redundant');
    const boundary=await page.evaluate(async({cacheName,asset})=>{
      const cachedCss=await (await fetch(asset)).text();
      const iframe=document.createElement('iframe');iframe.src='/index.html?upgrade=1';
      await new Promise(resolve=>{iframe.onload=resolve;document.body.append(iframe);});
      const futureSeen=iframe.contentDocument.body.textContent;iframe.remove();
      const cache=await caches.open(cacheName),shell=await (await cache.match('/index.html')).text();
      return {cachedCss,futureSeen,shell,cacheNames:await caches.keys()};
    },{cacheName,asset});
    assert.equal(boundary.cachedCss,result.before);assert.match(boundary.futureSeen,/SYNTHETIC_FUTURE_SHELL/);
    assert.ok(boundary.shell.includes("const APP_VER = '"+version+"'"));assert.ok(boundary.cacheNames.includes(cacheName));
    await context.setOffline(true);
    const offline=await page.evaluate(async asset=>({body:await (await fetch(asset)).text(),oldFails:await fetch('/css/companion.css?v=old').then(()=>false,()=>true)}),asset);
    assert.equal(offline.body,result.before);assert.equal(offline.oldFails,true);assert.deepEqual(errors,[]);
    await page.goto(origin+'/?offline-upgrade=1',{waitUntil:'domcontentloaded'});
    assert.equal(await page.evaluate(()=>APP_VER),version);assert.equal(await page.evaluate(()=>Array.isArray(State.trips)),true);assert.deepEqual(errors,[]);
    console.log(JSON.stringify({passed:true,checks:17,runtimeErrors:errors,scope:'실제 Chromium SW / 인증·외부 API 미캐시 / 버전 자산 고정 / 필수 자산 실패 시 구 워커 유지 / 새 HTML 캐시 혼합 방지 / 오프라인 앱 진입'}));
    await context.close();
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{server.close();external.close();});
