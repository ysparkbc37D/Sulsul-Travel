/* 기록 공통 모델 회귀 (v2.0.5). 허브 누적 통계·상세 목록·작업 화면 통계·공유 확인·대표 사진·기록 저장이
 * 같은 기록 수와 사진 수를 보는지 실제 화면에서 확인한다. 합성 여행만 사용한다. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.woff2':'font/woff2','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res) => {
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+(pathname==='/' ? '/index.html' : pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,content) => {if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',types[path.extname(file)] || 'application/octet-stream');res.end(content);});
});
const photo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
// 하루 회고 1(사진 1) · 빈 회고 1 · 일정 기록 1(사진 2) · 순간 기록 3(캡슐 사진 1, 시각 없는 순간 1)
const recordTrip={id:'records_trip',title:'기록 일치 가상 여행',startDate:'2030-05-01',endDate:'2030-05-02',durationDays:2,countries:['대한민국'],cities:['가상시'],revision:2,
  days:[{id:'d1',dayNum:1,date:'2030-05-01',city:'가상시',spots:[{id:'a',title:'가상 산책',time:'09:00'},{id:'b',title:'가상 전시',time:'10:00',recordId:'r1'}]},{id:'d2',dayNum:2,date:'2030-05-02',city:'가상시',spots:[]}],
  journals:{0:{text:'첫날 회고 원문',photos:[photo]},1:{text:'',photos:[]}},
  activityRecords:{r1:{id:'r1',text:'전시에서 본 그림',photos:[photo,photo],coverIndex:0,context:{title:'가상 전시',date:'2030-05-01',time:'10:00'}}},
  momentEntries:[{id:'m1',date:'2030-05-01',time:'11:30',text:'점심 전 산책',photos:[],coverIndex:0},{id:'m-notime',date:'2030-05-01',time:'',text:'시각을 모르는 순간',photos:[],coverIndex:0},{id:'cap1',source:'capsule',date:'2030-05-02',time:'08:10',text:'아침 캡슐',photos:[photo],coverIndex:0,mood:'😊'}]};
const otherTrip={id:'other_trip',title:'다른 가상 여행',startDate:'2030-06-01',endDate:'2030-06-01',durationDays:1,countries:['대한민국'],cities:['가상시'],revision:0,days:[{id:'o1',dayNum:1,date:'2030-06-01',city:'가상시',spots:[]}],journals:{},momentEntries:[{id:'o-m',date:'2030-06-01',time:'07:00',text:'다른 여행의 순간',photos:[],coverIndex:0}]};

(async() => {
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${server.address().port}/`;
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
  const results=[];
  async function check(name,operation) {try {const details=await operation();results.push({name,passed:true,details});}catch(error){results.push({name,passed:false,error:error.stack || error.message});}}
  try {
    const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Seoul',serviceWorkers:'block'});
    const page=await context.newPage(),errors=[],dialogs=[];
    page.setDefaultTimeout(10000);page.on('pageerror',error => errors.push(error.message));
    page.on('dialog',async dialog => {dialogs.push(dialog.message());await dialog.dismiss();});
    await page.addInitScript(raw => { if(!sessionStorage.getItem('seeded')){localStorage.setItem('st_trips_v2',raw);localStorage.setItem('st_demo_choice_v1','started');sessionStorage.setItem('seeded','1');} },JSON.stringify([recordTrip,otherTrip]));
    await page.route('**/*',route => new URL(route.request().url()).hostname==='127.0.0.1' ? route.continue() : route.abort());
    await page.goto(url,{waitUntil:'networkidle'});
    await page.waitForFunction(() => typeof State!=='undefined' && window.SulsulShell?.started);

    await check('허브 누적 통계와 상세 목록이 같은 기록 수를 보이고 날짜·종류로 표시한다',async() => {
      await page.evaluate(() => {switchView('hub');renderLifetimeAnalytics();renderStatDrilldown('diaries');});
      assert.equal(await page.locator('#stat-lt-diaries').innerText(),'6편','기록 5편 + 다른 여행 1편, 빈 회고 제외');
      assert.equal(await page.locator('#stat-drilldown-badge').innerText(),'총 6편');
      const detail=await page.locator('#stat-drilldown-content').innerText();
      // 여행마다 날짜순 앞의 3개를 보인다: 11:30 순간 → 시각 미상 일정 기록·순간 기록.
      assert.match(detail,/2030-05-01 · 순간 기록: 점심 전 산책/);assert.match(detail,/2030-05-01 · 일정 기록: 전시에서 본 그림/);assert.match(detail,/2030-06-01 · 순간 기록: 다른 여행의 순간/);
      assert.doesNotMatch(detail,/Day archive|Day \d+:/,'내부 키나 배열 위치로 표시하지 않는다');
      return {hubCount:6,detailMatches:true};
    });
    await check('작업 화면 통계와 대표 사진이 같은 기록 모델을 쓴다',async() => {
      await page.evaluate(() => openTripWorkspace('records_trip'));
      assert.equal(await page.locator('#stat-ws-diaries').innerText(),'5편 / 4장');
      const cover=await page.evaluate(() => resolveTripCover(State.trips.find(trip => trip.id==='records_trip')));
      assert.equal(cover.type,'journal');assert.ok(cover.url.startsWith('data:image/png'));
      return {workspace:'5편 / 4장',coverFromRecords:true};
    });
    await check('기록을 포함한 공유는 시각 없는 순간 기록이 있어도 만들어지고 확인 창이 순간 기록까지 센다',async() => {
      const message=await page.evaluate(() => {
        const payload=SulsulTravel.TripTransfer.create(State.trips.find(trip => trip.id==='records_trip'),{journals:true,finances:false});
        let asked='';const original=window.confirm;window.confirm=text => {asked=text;return false;};
        try{acceptTravelSnapshot(JSON.parse(JSON.stringify(payload)));}finally{window.confirm=original;}
        return asked;
      });
      assert.match(message,/기록 5편 · 사진 4장/);
      return {shareCreated:true,confirmCounts:'기록 5편 · 사진 4장'};
    });
    await check('순간 기록 저장은 공통 기록 명령으로 revision을 한 번 올리고, 다른 일정 변경이 있어도 막히지 않는다',async() => {
      const result=await page.evaluate(() => {
        const before=State.trips.find(trip => trip.id==='records_trip').revision;
        openMomentJournal(1);
        // 편집 창을 연 뒤 다른 화면에서 일정을 바꾼다. 기록 단위 충돌이 아니므로 저장은 막히지 않아야 한다.
        commitTrip('records_trip',trip => {trip.days[0].spots[0].completed=true;});
        document.getElementById('moment-record-text').value='둘째 날 새 순간';rememberMomentDraft();
        const saved=saveMomentRecord({quiet:true});
        const stored=JSON.parse(localStorage.getItem('st_trips_v2')).find(trip => trip.id==='records_trip');
        return {saved,before,after:stored.revision,completed:stored.days[0].spots[0].completed,texts:stored.momentEntries.map(entry => entry.text)};
      });
      assert.equal(result.saved,true);assert.equal(result.after,result.before+2,'일정 변경 1번 + 기록 저장 1번');
      assert.equal(result.completed,true,'먼저 저장된 일정 변경을 덮지 않는다');assert.ok(result.texts.includes('둘째 날 새 순간'));
      assert.equal(await page.locator('#stat-ws-diaries').innerText(),'6편 / 4장','저장한 기록이 통계에 바로 반영된다');
      return result;
    });
    assert.deepEqual(errors,[]);
  } finally {
    await browser.close();server.close();
  }
  const failed=results.filter(result => !result.passed);
  console.log(JSON.stringify({passed:!failed.length,results},null,2));
  if(failed.length)process.exitCode=1;
})();
