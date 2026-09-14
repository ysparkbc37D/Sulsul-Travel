/* Read-only product audit. Runs synthetic fixtures in an isolated browser profile.
 * PLAYWRIGHT_MODULE and CHROME_PATH can point to an installed runtime/browser.
 * Does not connect to AI, Gist, real shared rooms or the user's browser storage.
 */
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const output = path.join(root, '.local-review', 'audit-v1.7.8');
const server = http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(err,data)=>{
    if(err){res.writeHead(404).end();return;}
    const mime={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png','.woff2':'font/woff2'};
    res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(data);
  });
});
(async()=>{
  fs.mkdirSync(output,{recursive:true});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  try {
    const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
    const page=await context.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
    await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'networkidle'});
    const facts=await page.evaluate(()=>{
      window.alerts=[];window.alert=msg=>alerts.push(String(msg));
      const trip={id:'audit-trip',title:'검토용 스페인 여행',startDate:'2026-09-12',endDate:'2026-09-14',durationDays:3,status:'ongoing',countries:['스페인'],cities:['마드리드'],currency:'EUR',budget:0,revision:0,coverEmoji:'✈️',planBlockMeta:{b1:{title:'미술관 여행',place:'마드리드',lodging:'검토용 숙소',priorities:['예약 확인'],notes:'예약 시간 보존',status:'confirmed'}},journals:{0:{text:'기록 원문',photos:[]}},expenses:[],checklist:[],days:[{id:'day1',dayNum:1,date:'2026-09-12',city:'마드리드',title:'마드리드 첫날',planBlockId:'b1',spots:[{id:'spot1',title:'방문한 미술관',time:'09:00',desc:'입장 후 인상 깊었던 작품',completed:true},{id:'spot2',title:'건너뛴 시장',time:'11:00',skipped:true},{id:'spot3',title:'아직 예정인 공원',time:'15:00'}]},{id:'day2',dayNum:2,date:'2026-09-13',city:'마드리드',title:'마드리드 둘째 날',planBlockId:'b1',spots:[]}]};
      State.trips=[trip];State.activeTripId=trip.id;saveTrips();switchView('workspace');switchTab('plan');
      const url=exportTripAsShareUrl(trip.id);
      const shared=JSON.parse(LZString.decompressFromEncodedURIComponent(url.split('#share=')[1])).trip;
      const fields={metadataPreserved:!!shared.planBlockMeta,budgetBefore:trip.budget,budgetAfter:shared.budget,statusAfter:shared.status||null,includesJournals:!!shared.journals};
      let seed=42;const bytes=Array.from({length:100000},()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return String.fromCharCode(seed>>>24);}).join('');
      getActiveTrip().journals[0].photos=['data:image/jpeg;base64,'+btoa(bytes)];
      const photoUrlLength=exportTripAsShareUrl(trip.id).length;
      getActiveTrip().journals[0].photos=[];
      renderPdfReport(getActiveTrip());
      const report=document.getElementById('pdf-report-content').textContent;
      const reportFacts={includesVisited:report.includes('방문한 미술관'),includesSkipped:report.includes('건너뛴 시장'),includesPlanned:report.includes('아직 예정인 공원'),includesTime:report.includes('09:00'),includesDescription:report.includes('입장 후 인상 깊었던 작품'),inventsWeather:report.includes('맑음'),inventsMood:report.includes('감동')};
      const probe=JSON.parse(JSON.stringify(getActiveTrip()));probe.title='<span data-audit-probe="title">안전한 검사</span>';renderPdfReport(probe);
      reportFacts.titleTreatedAsHtml=!!document.querySelector('#pdf-report-content [data-audit-probe]');
      State.activeJournalDay=0;renderJournalTab();
      document.getElementById('journal-text-input').value='저장 실패 검사';
      const oldSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='st_trips_v2')throw new DOMException('audit quota','QuotaExceededError');return oldSet.call(this,k,v);};
      try{saveJournalText();}finally{Storage.prototype.setItem=oldSet;}
      const journalSave={claimsSuccess:alerts.includes('일기가 저장되었습니다.'),persistedText:JSON.parse(localStorage.getItem('st_trips_v2'))[0].journals[0].text,memoryText:getActiveTrip().journals[0].text};
      State.trips=JSON.parse(localStorage.getItem('st_trips_v2'));State.activeTripId=State.trips[0].id;
      switchView('hub');
      const host=document.createElement('div');host.id='audit-badge-host';host.style.cssText='background:white;padding:20px';host.innerHTML=renderDDayBadge(getActiveTrip(),new Date('2026-09-13T12:00:00Z'));document.body.appendChild(host);
      return {version:APP_VER,share:{urlLength:url.length,photo100KBUrlLength:photoUrlLength,...fields},report:reportFacts,journalSave};
    });
    const themes={};
    for(const theme of ['modern','lightgray','deepblack']){
      await page.evaluate(t=>{setTheme(t);switchView('hub');},theme);
      await page.waitForTimeout(350);
      themes[theme]=await page.evaluate(()=>{
        const el=document.querySelector('#audit-badge-host span'),s=getComputedStyle(el);
        const nums=c=>(c.match(/[\d.]+/g)||[]).map(Number);
        const bg=nums(s.backgroundColor),fg=nums(s.color),a=bg[3]??1;
        const lum=c=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
        const b=lum(bg.slice(0,3).map(v=>v*a+255*(1-a))),f=lum(fg);
        return {color:s.color,background:s.backgroundColor,contrastOnWhite:Math.round(((Math.max(b,f)+.05)/(Math.min(b,f)+.05))*100)/100,overflow:document.documentElement.scrollWidth>innerWidth};
      });
      await page.screenshot({path:path.join(output,`hub-${theme}.png`),fullPage:true});
    }
    const shareImport=await page.evaluate(()=>{
      let url=exportTripAsShareUrl(getActiveTrip().id);const before=State.trips.length;
      history.replaceState(null,'',url);checkUrlShareImportOnStartup();
      const after=State.trips.length;
      getActiveTrip().title='届いたコピーだけを編集';
      const isolated=State.trips[1].title!=='届いたコピーだけを編集';
      history.replaceState(null,'',url);
      const oldSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='st_trips_v2')throw new DOMException('audit quota','QuotaExceededError');return oldSet.call(this,k,v);};
      try{checkUrlShareImportOnStartup();}finally{Storage.prototype.setItem=oldSet;}
      return {importCount:after-before,independentCopy:isolated,hashRemovedDespiteSaveFailure:location.hash==='',memoryCount:State.trips.length,persistedCount:JSON.parse(localStorage.getItem('st_trips_v2')).length};
    });
    const result={...facts,themes,shareImport,runtimeErrors:errors};
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
