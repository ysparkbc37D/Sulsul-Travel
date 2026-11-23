/* 기록 사진 IDB 분리 회귀 (v2.0.6, 계획 3단계). 합성 사진과 합성 여행만 사용한다.
 * 1) 사진 많은 장기 여행이 기기 문서 한도(약 5MiB)를 넘지 않고 새로고침 뒤 같은 사진으로 되살아난다.
 * 2) 옛 문서의 사진은 부팅 때 원래 문서를 보관한 뒤 옮긴다.
 * 3) 사진 포함 백업을 새 기기(빈 프로필)에 복원해도 문서 한도에 걸리지 않는다.
 * 4) 보관본이 사라지면 자리와 ID를 그대로 두고 알리며, 불완전한 백업 파일을 만들지 않는다.
 * 5) 이전된 문서를 구버전(v2.0.5) 앱이 열어도 사진 참조를 지우지 않고, 새 버전에서 다시 모두 보인다. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.woff2':'font/woff2','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
let serveRoot=root;   // 구버전 검사에서 같은 주소(같은 저장소)로 다른 앱 코드를 띄우려고 바꾼다
const server=http.createServer((req,res) => {
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(serveRoot,'.'+(pathname==='/' ? '/index.html' : pathname));
  if(!file.startsWith(serveRoot+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,content) => {if(error){res.writeHead(404).end();return;}res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',types[path.extname(file)] || 'application/octet-stream');res.end(content);});
});
const node=process.execPath;
// 태그 v2.0.5의 코드를 .local-review에 풀고, 이 기기의 개행으로 바뀐 파일에 맞춰 SRI를 다시 계산한다.
function oldApp() {
  const target=path.join(root,'.local-review','old-v2.0.5');
  try {
    if(!fs.existsSync(path.join(target,'index.html'))){
      fs.mkdirSync(target,{recursive:true});
      const archive=path.join(root,'.local-review','old-v2.0.5.tar');
      execFileSync('git',['-C',root,'archive','--format=tar','--output',archive,'v2.0.5'],{stdio:'pipe'});
      // Git의 GNU tar는 D: 같은 경로를 원격 주소로 읽는다. 상대 경로로 푼다.
      execFileSync('tar',['-xf','old-v2.0.5.tar','-C','old-v2.0.5'],{cwd:path.dirname(archive),stdio:'pipe'});fs.rmSync(archive,{force:true});
    }
    execFileSync(node,[path.join(target,'tools','update-asset-integrity.cjs')],{stdio:'pipe'});
    return target;
  } catch(error) { return {error:String(error.stderr || error.message).slice(0,300)}; }
}
const trip=(id,days=20) => ({id,title:'사진 많은 가상 장기 여행',startDate:'2030-05-01',durationDays:days,countries:['대한민국'],cities:['가상시'],revision:0,currency:'KRW',activeCurrencies:['KRW'],
  days:Array.from({length:days},(_,index) => ({id:`d${index+1}`,dayNum:index+1,date:`2030-05-${String(index+1).padStart(2,'0')}`,city:'가상시',spots:[]})),journals:{},activityRecords:{},momentEntries:[],expenses:[],checklist:[]});
// 질감이 많아 압축 뒤에도 큰 합성 사진을 만든다(실제 사진보다 큰 편).
const makePhotos=async(page,count,tripId) => page.evaluate(async({count,tripId}) => {
  const results=[];
  for(let n=0;n<count;n++){
    const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=1200;const ctx=canvas.getContext('2d'),image=ctx.createImageData(1600,1200);
    for(let i=0;i<image.data.length;i+=4){image.data[i]=(i*7+n*31+Math.random()*90)&255;image.data[i+1]=((i>>9)+n*17+Math.random()*90)&255;image.data[i+2]=(Math.random()*255)&255;image.data[i+3]=255;}
    ctx.putImageData(image,0,0);
    const blob=await new Promise(resolve => canvas.toBlob(resolve,'image/jpeg',0.95));
    results.push(await SulsulTravel.mediaRepository.prepare(new File([blob],`synthetic-${n}.jpg`,{type:'image/jpeg'}),{tripId}));
  }
  return results.map(photo => ({source:photo.source,thumbnail:photo.thumbnail,mediaId:photo.mediaId,stored:photo.stored}));
},{count,tripId});
const photoFingerprint=page => page.evaluate(() => State.trips.flatMap(t => [...Object.values(t.journals||{}),...Object.values(t.activityRecords||{}),...(t.momentEntries||[])].flatMap(entry => (entry.photos||[]).map(photo => `${photo.length}:${photo.slice(-40)}`))).sort().join('|'));

(async() => {
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${server.address().port}/`;
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
  const results=[];
  async function check(name,operation) {try {const details=await operation();results.push({name,passed:true,details});}catch(error){results.push({name,passed:false,error:error.stack || error.message});}}
  async function open(context) {
    const page=await context.newPage(),errors=[];
    page.setDefaultTimeout(60000);page.on('pageerror',error => errors.push(error.message));page.on('dialog',dialog => dialog.accept());
    await page.route('**/*',route => new URL(route.request().url()).hostname==='127.0.0.1' ? route.continue() : route.abort());
    await page.goto(url,{waitUntil:'networkidle'});
    await page.waitForFunction(() => typeof State!=='undefined' && window.SulsulShell?.started);
    return {page,errors};
  }
  const newContext=() => browser.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Seoul',serviceWorkers:'block'});
  let backupJson=null,expectedPhotos=null;
  try {
    const context=await newContext();
    const {page,errors}=await open(context);
    await check('사진 많은 장기 여행이 기기 문서 한도를 넘지 않고 새로고침 뒤 같은 사진으로 되살아난다',async() => {
      await page.evaluate(async seed => {State.trips=await TripRepository.saveAll([seed]);State.activeTripId=seed.id;},trip('long-trip'));
      const photos=await makePhotos(page,22,'long-trip');
      assert.ok(photos.every(photo => photo.stored),'사진 보관소에 모두 보관된다');
      const total=photos.reduce((sum,photo) => sum+photo.source.length+photo.thumbnail.length,0);
      assert.ok(total>5.3*1024*1024,`사진 문자열 합계 ${total}자는 옛 방식이라면 기기 문서 한도를 넘는다`);
      // 저장은 차례대로 한다(한 장씩 기다린다).
      const saved=await page.evaluate(async photos => { const results=[]; for(const [index,photo] of photos.entries()) results.push(await (async () => {
        try { await commitTripRecord('long-trip',copy => {copy.momentEntries=copy.momentEntries||[];copy.momentEntries.push({id:`moment-${index}`,date:`2030-05-${String(index%20+1).padStart(2,'0')}`,time:'09:00',text:`가상 순간 ${index}`,photos:[photo.source],photoThumbnails:[photo.thumbnail],mediaIds:[photo.mediaId],coverIndex:0,activityLink:null,visibility:'private'});}); return true; }
        catch(error){ return error.name || error.message; }
      })()); return results; },photos);
      assert.ok(saved.every(value => value===true),JSON.stringify(saved));
      const after=await page.evaluate(() => ({raw:localStorage.getItem('st_trips_v2').length,photos:SulsulTravel.TravelRecords.summary(State.trips[0]).photoCount,inState:State.trips[0].momentEntries.every(entry => entry.photos[0].startsWith('data:image/'))}));
      assert.ok(after.raw<200000,`여행 문서 ${after.raw}자`);assert.equal(after.photos,22);assert.equal(after.inState,true);
      expectedPhotos=await photoFingerprint(page);
      const started=Date.now();await page.reload({waitUntil:'networkidle'});await page.waitForFunction(() => window.SulsulShell?.started);const bootMs=Date.now()-started;
      assert.equal(await photoFingerprint(page),expectedPhotos,'새로고침 뒤 같은 사진 문자열');
      const story=await page.evaluate(() => SulsulTravel.TravelStory.build(State.trips[0],{photoSource:SulsulTravel.MediaRepository.photoSource}).stats);
      assert.equal(story.includedPhotoCount,22);
      backupJson=await page.evaluate(async() => (await collectTravelBackup()).json);
      assert.ok(backupJson.length>5*1024*1024 && (backupJson.match(/data:image\//g)||[]).length>=44,'백업 파일에 사진과 썸네일을 모은다');
      const health=await page.evaluate(() => SulsulTravel.StorageHealth.collect());
      assert.equal(health.photos.total,22);assert.equal(health.photos.stored,22);assert.equal(health.photos.inline,0);
      return {photoChars:total,documentChars:after.raw,bootMs,backupMB:+(backupJson.length/1024/1024).toFixed(2)};
    });
    await check('보관본을 잃으면 자리와 ID를 그대로 두고 알리며 불완전한 백업 파일을 만들지 않는다',async() => {
      const rawBefore=await page.evaluate(() => localStorage.getItem('st_trips_v2'));
      await page.evaluate(() => new Promise((resolve,reject) => {const request=indexedDB.deleteDatabase('sulsul-travel-media-v1');request.onsuccess=resolve;request.onerror=reject;request.onblocked=resolve;}));
      await page.reload({waitUntil:'networkidle'});await page.waitForFunction(() => window.SulsulShell?.started);
      const state=await page.evaluate(async() => ({missing:SulsulTravel.recordMediaStore.missingReferences().length,raw:localStorage.getItem('st_trips_v2'),ids:State.trips[0].momentEntries.every(entry => entry.mediaIds[0] && entry.photos[0]===''),health:(await SulsulTravel.StorageHealth.collect()).photos}));
      assert.equal(state.missing,22);assert.equal(state.ids,true);assert.equal(state.raw,rawBefore,'부팅이 저장 문서를 바꾸지 않는다');
      assert.equal(state.health.missing,22);
      const backup=await page.evaluate(async() => {try{await collectTravelBackup();return 'created';}catch(error){return error.message;}});
      assert.match(backup,/보관 사진 원본을 확인하지 못했습니다/);
      return {missing:22,documentUnchanged:true,backupRefused:true};
    });
    assert.deepEqual(errors,[]);
    await context.close();

    await check('사진 포함 백업을 빈 기기에 복원해도 문서 한도에 걸리지 않고 같은 사진으로 보인다',async() => {
      assert.ok(backupJson,'앞 검사의 백업 파일');
      const fresh=await newContext(),{page:restore,errors:restoreErrors}=await open(fresh);
      await restore.evaluate(async json => {
        const input={files:[new File([json],'long-trip-backup.json',{type:'application/json'})],value:'long-trip-backup.json'};
        await importDataFromJson({target:input});await applyTravelBackupRestore();
      },backupJson);
      await restore.waitForFunction(() => State.trips.some(trip => trip.id==='long-trip'),null,{timeout:120000});
      const restored=await restore.evaluate(() => ({raw:localStorage.getItem('st_trips_v2').length,photos:SulsulTravel.TravelRecords.summary(State.trips.find(trip => trip.id==='long-trip')).photoCount}));
      assert.ok(restored.raw<200000,`복원 뒤 여행 문서 ${restored.raw}자`);assert.equal(restored.photos,22);
      assert.equal(await photoFingerprint(restore),expectedPhotos);
      await restore.reload({waitUntil:'networkidle'});await restore.waitForFunction(() => window.SulsulShell?.started);
      assert.equal(await photoFingerprint(restore),expectedPhotos,'복원한 사진도 새로고침 뒤 그대로');
      assert.deepEqual(restoreErrors,[]);await fresh.close();
      return {restoredDocumentChars:restored.raw,photos:22};
    });

    await check('옛 문서의 사진은 부팅 때 원래 문서를 보관한 뒤 옮기고, 구버전 앱이 열어도 참조를 지우지 않는다',async() => {
      const legacyContext=await newContext(),seedPage=await legacyContext.newPage();
      await seedPage.route('**/*',route => new URL(route.request().url()).hostname==='127.0.0.1' ? route.continue() : route.abort());
      await seedPage.goto(url,{waitUntil:'networkidle'});await seedPage.waitForFunction(() => window.SulsulShell?.started);
      // 보관소 없이 문서에만 사진이 있던 옛 기기 상태를 만든다(사진 6장, mediaId 없음).
      const photos=await makePhotos(seedPage,6,'legacy-trip');
      const legacy={...trip('legacy-trip',3),title:'옛 형식 가상 여행',momentEntries:photos.map((photo,index) => ({id:`old-${index}`,date:'2030-05-02',time:'10:00',text:`옛 순간 ${index}`,photos:[photo.source],photoThumbnails:[photo.thumbnail],mediaIds:[null],coverIndex:0,activityLink:null,visibility:'private'}))};
      const legacyRaw=JSON.stringify([legacy]);
      await seedPage.evaluate(async raw => {
        await new Promise(resolve => {const request=indexedDB.deleteDatabase('sulsul-travel-media-v1');request.onsuccess=request.onerror=request.onblocked=resolve;});
        localStorage.setItem('st_trips_v2',raw);
      },legacyRaw);
      await seedPage.close();
      const {page:migrated,errors:migrateErrors}=await open(legacyContext);
      const after=await migrated.evaluate(async() => ({raw:localStorage.getItem('st_trips_v2'),snapshot:(await SulsulTravel.recordMediaStore.getSnapshot())?.raw||null,state:State.trips[0].momentEntries.map(entry => ({photo:entry.photos[0],id:entry.mediaIds[0]}))}));
      assert.equal(after.snapshot,legacyRaw,'처음 옮기기 전의 원래 문서를 그대로 보관한다');
      assert.ok(after.raw.length<legacyRaw.length/5,`옮긴 뒤 문서 ${after.raw.length}자 (옮기기 전 ${legacyRaw.length}자)`);
      assert.deepEqual(after.state.map(item => item.photo),photos.map(photo => photo.source),'화면의 사진은 그대로');
      assert.ok(after.state.every(item => typeof item.id==='string' && item.id),'새 보관본 ID를 붙인다');
      const migratedFingerprint=await photoFingerprint(migrated);
      await migrated.close();
      const oldRoot=oldApp();
      // 구버전을 준비하지 못하면 통과로 보고하지 않는다. 일부러 건너뛸 때만 SKIP_OLD_VERSION=1을 쓴다.
      if(typeof oldRoot!=='string'){await legacyContext.close();if(process.env.SKIP_OLD_VERSION==='1')return {migrated:true,oldVersion:'건너뜀(SKIP_OLD_VERSION=1)'};throw new Error('구버전 v2.0.5 코드를 준비하지 못했습니다: '+oldRoot.error);}
      serveRoot=oldRoot;
      let oldResult;
      try {
        const {page:oldPage,errors:oldErrors}=await open(legacyContext);
        oldResult=await oldPage.evaluate(async () => {
          const version=APP_VER,blank=State.trips[0].momentEntries.filter(entry => entry.photos[0]==='').length;
          const saved=await commitTripCommand({tripId:'legacy-trip',expectedRevision:State.trips[0].revision,change:copy => {copy.title='구버전에서 바꾼 제목';}});
          const stored=JSON.parse(localStorage.getItem('st_trips_v2'))[0];
          return {version,blank,saved,ids:stored.momentEntries.every(entry => typeof entry.mediaIds[0]==='string' && entry.mediaIds[0]),kept:stored.momentEntries.length};
        });
        assert.deepEqual(oldErrors,[]);await oldPage.close();
      } finally { serveRoot=root; }
      assert.equal(oldResult.version,'2.0.5');assert.equal(oldResult.saved,true);assert.equal(oldResult.ids,true,'구버전 저장도 사진 참조를 지우지 않는다');assert.equal(oldResult.kept,6);
      const {page:back,errors:backErrors}=await open(legacyContext);
      assert.equal(await photoFingerprint(back),migratedFingerprint,'새 버전으로 돌아오면 사진이 모두 다시 보인다');
      assert.equal(await back.evaluate(() => State.trips[0].title),'구버전에서 바꾼 제목');
      assert.deepEqual([...migrateErrors,...backErrors],[]);
      await legacyContext.close();
      return {migrated:true,snapshotKept:true,oldVersionBlankPhotos:oldResult.blank,oldVersionKeptReferences:true};
    });
  } finally {
    await browser.close();server.close();
  }
  const failed=results.filter(result => !result.passed);
  console.log(JSON.stringify({passed:!failed.length,results},null,2));
  if(failed.length)process.exitCode=1;
})();
