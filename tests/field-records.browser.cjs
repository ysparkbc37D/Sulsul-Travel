/* 현장 퀵 캡슐·AI 캡슐 일기·SOS·매거진 회귀 (v2.0.2). 가상 예제와 합성 여행만 사용한다. */
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
// v2.0.1까지의 퀵 캡슐(첫날로 잘못 저장)과 승인 없이 저장된 AI 일기를 가진 합성 여행.
const legacyTrip={id:'legacy_capsule_trip',title:'레거시 캡슐 여행',startDate:'2030-04-01',endDate:'2030-04-03',durationDays:3,timeZone:'Asia/Taipei',countries:['대만'],cities:['타이베이','타이중'],
  days:[{id:'d1',dayNum:1,date:'2030-04-01',city:'타이베이',spots:[{id:'s1',title:'A 광장',time:'09:00'}]},{id:'d2',dayNum:2,date:'2030-04-02',city:'타이베이',spots:[]},{id:'d3',dayNum:3,date:'2030-04-03',city:'타이중',spots:[{id:'s3',title:'B 시장',time:'10:00'}]}],
  quickCapsules:[{id:'cap-1',dayIndex:0,date:'2030-04-01',time:'04:05',text:'시장 국수가 맛있었다',mood:'food',spotTitle:'B 시장',photo:null,createdAt:'2030-04-03T04:05:00.000Z'}],
  activityRecords:{'rec-1':{id:'rec-1',dayIndex:0,date:'2030-04-01',city:'타이베이',title:'타이베이의 하루, 캡슐로 엮은 이야기',content:'AI가 쓴 글',photos:[],mood:'food',createdAt:'2030-04-03T05:00:00.000Z'}},
  revision:3};

(async() => {
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${server.address().port}/`;
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
  const results=[];
  async function check(name,operation) {try {const details=await operation();results.push({name,passed:true,details});}catch(error){results.push({name,passed:false,error:error.message});}}
  async function open(context,{seed=null}={}) {
    const page=await context.newPage(),errors=[];
    page.setDefaultTimeout(10000);page.on('pageerror',error => errors.push(error.message));
    await page.clock.install({time:new Date('2030-04-03T12:00:00+08:00')});
    if(seed)await page.addInitScript(raw => { if(!sessionStorage.getItem('seeded')){localStorage.setItem('st_trips_v2',raw);sessionStorage.setItem('seeded','1');} },JSON.stringify(seed));
    await page.route('**/*',route => new URL(route.request().url()).hostname==='127.0.0.1' ? route.continue() : route.abort());
    await page.goto(url,{waitUntil:'networkidle'});
    await page.waitForFunction(() => typeof State!=='undefined' && window.SulsulShell?.started);
    await page.evaluate(() => {window.__toasts=[];const original=window.showToast;window.showToast=(message,...rest) => {window.__toasts.push(String(message));return original(message,...rest);};});
    return {page,errors};
  }
  try {
    const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Taipei',serviceWorkers:'block'});
    await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:url.slice(0,-1)});
    const {page,errors}=await open(context);
    await page.evaluate(async () => {await addDemoTrip();switchTab('today');});

    await check('캡슐은 오늘(3일차) 날짜·현지 시각의 순간 기록으로 저장되고 이야기 모델에 들어간다',async() => {
      await page.evaluate(() => openQuickCapsuleModal());
      assert.equal(await page.locator('#capsule-day-select').inputValue(),'2');
      await page.fill('#capsule-text-input','3일차 야시장 메모');
      await page.click('#capsule-save-btn');
      const result=await page.evaluate(() => {
        const trip=getActiveTrip(),entry=trip.momentEntries.find(item => item.text==='3일차 야시장 메모');
        const stored=JSON.parse(localStorage.getItem('st_trips_v2')).find(item => item.id===trip.id);
        const story=SulsulTravel.TravelStory.build(trip,{photoSource:SulsulTravel.MediaRepository.photoSource});
        return {entry,quick:'quickCapsules' in trip,storedHas:stored.momentEntries.some(item => item.text==='3일차 야시장 메모'),inStory:story.days.find(day => day.date==='2030-04-03')?.records.some(record => record.text==='3일차 야시장 메모'),input:document.getElementById('capsule-text-input').value,toasts:window.__toasts};
      });
      assert.equal(result.entry.date,'2030-04-03');assert.equal(result.entry.dayIndex,2);assert.equal(result.entry.time,'12:00');assert.equal(result.entry.source,'capsule');
      assert.equal(result.quick,false);assert.ok(result.storedHas);assert.ok(result.inStory);assert.equal(result.input,'');
      assert.ok(result.toasts.some(message => message.includes('순간 기록으로 보관')));
      return result.entry;
    });

    await check('다른 날짜를 고르면 지금 시각을 그날의 기록 시각으로 쓰지 않는다',async() => {
      await page.selectOption('#capsule-day-select','0');
      await page.fill('#capsule-text-input','첫날을 떠올린 메모');await page.click('#capsule-save-btn');
      const entry=await page.evaluate(() => getActiveTrip().momentEntries.find(item => item.text==='첫날을 떠올린 메모'));
      assert.equal(entry.date,'2030-04-01');assert.equal(entry.time,'');return entry;
    });

    await check('캡슐 사진은 압축·IndexedDB 경로를 거치고 원본을 여행 문서에 넣지 않는다',async() => {
      await page.selectOption('#capsule-day-select','2');
      const result=await page.evaluate(async() => {
        // 휴대폰 사진처럼 크고 압축 여지가 있는 그라데이션+잡음 이미지(PNG 수 MB).
        const canvas=document.createElement('canvas');canvas.width=2400;canvas.height=1800;const ctx=canvas.getContext('2d'),image=ctx.createImageData(2400,1800);
        let seed=7;const noise=() => {seed=(seed*1103515245+12345)&0x7fffffff;return (seed%41)-20;};
        for(let y=0;y<1800;y++)for(let x=0;x<2400;x++){const i=(y*2400+x)*4;image.data[i]=Math.min(255,Math.max(0,x/10+noise()));image.data[i+1]=Math.min(255,Math.max(0,y/8+noise()));image.data[i+2]=Math.min(255,Math.max(0,120+noise()));image.data[i+3]=255;}
        ctx.putImageData(image,0,0);
        const blob=await new Promise(resolve => canvas.toBlob(resolve,'image/png'));
        const file=new File([blob],'street.png',{type:'image/png'});
        await handleCapsulePhotoInput({target:{files:[file],value:''}});
        document.getElementById('capsule-text-input').value='사진 캡슐';
        const before=(localStorage.getItem('st_trips_v2') || '').length,saved=await saveQuickCapsule();
        const entry=getActiveTrip().momentEntries.find(item => item.text==='사진 캡슐');
        const size=async source => {const image=new Image();image.src=source;await image.decode();return [image.naturalWidth,image.naturalHeight];};
        return {saved,originalBytes:blob.size,photo:entry?.photos?.[0] ? await size(entry.photos[0]) : null,thumb:entry?.photoThumbnails?.[0] ? await size(entry.photoThumbnails[0]) : null,mediaId:entry?.mediaIds?.[0] || null,growth:(localStorage.getItem('st_trips_v2') || '').length-before};
      });
      assert.equal(result.saved,true);assert.ok(result.mediaId,'IndexedDB 보관본 ID');
      // 원본 2400×1800을 그대로 넣지 않고 용도별 압축 결과(장축 1280px 이하)와 작은 썸네일을 쓴다.
      assert.ok(result.photo && Math.max(...result.photo)<=1280,JSON.stringify(result));
      assert.ok(result.thumb && Math.max(...result.thumb)<=480,JSON.stringify(result));
      assert.ok(result.growth<1024*1024,`저장 문서 증가 ${result.growth}`);
      return result;
    });

    await check('저장 공간이 부족하면 입력과 사진을 남기고 성공으로 알리지 않는다',async() => {
      const result=await page.evaluate(async () => {
        const trip=getActiveTrip(),before=JSON.stringify(trip.momentEntries),original=Storage.prototype.setItem;
        document.getElementById('capsule-text-input').value='용량 실패 메모';window.__toasts=[];
        Storage.prototype.setItem=function(key,value){if(key==='st_trips_v2')throw new DOMException('synthetic quota','QuotaExceededError');return original.call(this,key,value);};
        let saved;try{saved=await saveQuickCapsule();}finally{Storage.prototype.setItem=original;}
        const failed={saved,input:document.getElementById('capsule-text-input').value,unchanged:JSON.stringify(getActiveTrip().momentEntries)===before,toasts:[...window.__toasts],feedback:document.getElementById('capsule-feedback').textContent};
        const retry=await saveQuickCapsule();
        return {...failed,retry,retried:getActiveTrip().momentEntries.some(item => item.text==='용량 실패 메모')};
      });
      assert.equal(result.saved,false);assert.equal(result.input,'용량 실패 메모');assert.ok(result.unchanged);
      assert.ok(!result.toasts.some(message => message.includes('보관했습니다')),JSON.stringify(result.toasts));
      assert.match(result.feedback,/그대로/);assert.equal(result.retry,true);assert.ok(result.retried);
      return result;
    });

    await check('AI 캡슐 일기는 승인 전에는 저장하지 않고, 승인하면 원문과 함께 새 순간 기록이 된다',async() => {
      const result=await page.evaluate(async() => {
        let prompt='';callGeminiApiWithFallback=async input => {prompt=input;return '야시장 국수를 먹으며 하루를 마무리했다.';};
        const before=getActiveTrip().momentEntries.length;
        await generateDiaryFromCapsules();
        const pending={count:getActiveTrip().momentEntries.length,reviewOpen:!document.getElementById('modal-ai-draft-review').classList.contains('sheet-closed'),title:document.getElementById('ai-draft-review-title').textContent};
        await approveActiveAiDraft();
        const diary=getActiveTrip().momentEntries.find(item => item.source==='capsule-diary');
        const story=SulsulTravel.TravelStory.build(getActiveTrip(),{textMode:'approved'}).days.find(day => day.date==='2030-04-03').records.find(record => record.id===diary?.id);
        return {before,pending,prompt,diary,storyText:story?.text,storyOrigin:story?.textOrigin};
      });
      assert.equal(result.pending.count,result.before,'승인 전 저장 금지');assert.ok(result.pending.reviewOpen);assert.match(result.pending.title,/캡슐 일기/);
      assert.match(result.prompt,/지어내지 마세요/);assert.match(result.prompt,/3일차 야시장 메모/);assert.doesNotMatch(result.prompt,/첫날을 떠올린 메모/);
      assert.equal(result.diary.date,'2030-04-03');assert.equal(result.diary.text,'야시장 국수를 먹으며 하루를 마무리했다.');assert.match(result.diary.originalText,/3일차 야시장 메모/);
      assert.ok(result.diary.aiDraftAcceptedAt);assert.equal(result.storyText,result.diary.text);assert.equal(result.storyOrigin,'approved');
      return {diary:result.diary.id};
    });

    await check('SOS는 오늘 도시의 국가 번호만 쓰고 확인 못 한 나라는 추정하지 않는다',async() => {
      const result=await page.evaluate(() => {
        const info=trip => {const value=sosCountryInfo(trip);return {code:value.code,basis:value.basis,lines:value.entry?.lines.map(line => `${line.kind}:${line.tel}`) || [],candidates:value.candidates};};
        const day=(date,city) => ({id:`d_${city}`,date,city,spots:[]});
        return {
          yunnan:info({id:'y',countries:['중국'],startDate:'2030-04-03',days:[day('2030-04-03','쿤밍')]}),
          chile:info({id:'c',countries:['칠레'],startDate:'2030-04-03',days:[day('2030-04-03','산티아고')]}),
          southAmericaToday:info({id:'sa',countries:['페루','칠레','볼리비아'],startDate:'2030-04-02',days:[day('2030-04-02','리마'),day('2030-04-03','산티아고')]}),
          ambiguous:info({id:'a',countries:['페루','칠레'],startDate:'2030-04-03',days:[day('2030-04-03','')]}),
          unknown:info({id:'u',countries:['아이슬란드'],startDate:'2030-04-03',days:[day('2030-04-03','레이캬비크')]})
        };
      });
      assert.equal(result.yunnan.code,'CN');assert.ok(result.yunnan.lines.includes('ambulance:120'));assert.ok(result.yunnan.lines.includes('police:110'));
      assert.equal(result.chile.code,'CL');assert.ok(result.chile.lines.includes('police:133'));assert.ok(result.chile.lines.includes('ambulance:131'));
      assert.equal(result.southAmericaToday.code,'CL');assert.equal(result.southAmericaToday.basis,'day');
      assert.equal(result.ambiguous.code,null);assert.deepEqual(result.ambiguous.candidates,['PE','CL']);
      assert.equal(result.unknown.code,null);assert.deepEqual(result.unknown.lines,[]);
      await page.evaluate(() => {closeModal('modal-quick-capsule',true);openSosEmergencyModal();});
      const rendered=await page.evaluate(() => ({tels:[...document.querySelectorAll('#sos-emergency-content a[href^="tel:"]')].map(link => link.getAttribute('href')),text:document.getElementById('sos-emergency-content').textContent}));
      assert.deepEqual(rendered.tels,['tel:110','tel:119','tel:+82232100404']);assert.doesNotMatch(rendered.text,/대표부/);assert.match(rendered.text,/출처/);
      return {result,rendered:rendered.tels};
    });

    await check('작은따옴표가 있는 프랑스어 문구도 복사 버튼이 동작한다',async() => {
      await page.evaluate(() => renderSosEmergencyContent('fr',null,undefined));
      const card=page.locator('.sos-phrase-card').filter({hasText:"J'ai"}).first();
      const phrase=await card.locator('.sos-phrase-main').textContent();
      await card.locator('button',{hasText:'복사'}).click();
      await page.waitForFunction(() => window.__toasts.some(message => message.includes('복사')));
      const copied=await page.evaluate(() => navigator.clipboard.readText());
      assert.equal(copied,phrase.trim());return {phrase:copied};
    });

    await check('매거진은 실제 기록 본문과 원화 환산액으로 그린다',async() => {
      const result=await page.evaluate(async () => {
        closeModal('modal-sos-emergency',true);const trip=getActiveTrip();
        const ok=await commitTripCommand({tripId:trip.id,expectedRevision:trip.revision,change:copy => {copy.expenses=[...(copy.expenses || []),{id:'exp_magazine',title:'야시장',date:'2030-04-03',curr:'TWD',amount:1000,krw:42000,cat:'meal'}];}});
        openStoryMagazineModal();
        const text=document.getElementById('story-magazine-content').textContent;
        const story=SulsulTravel.TravelStory.build(getActiveTrip(),{textMode:'approved'});
        return {ok,hasCapsule:text.includes('3일차 야시장 메모'),hasDiary:text.includes('야시장 국수를 먹으며'),total:story.expenses.totalSpentKrw,showsTotal:text.includes(`₩${story.expenses.totalSpentKrw.toLocaleString('ko-KR')}`),wrongForeign:text.includes('₩1,000 ')};
      });
      assert.ok(result.ok);assert.ok(result.hasCapsule);assert.ok(result.hasDiary);assert.ok(result.showsTotal,JSON.stringify(result));
      await page.evaluate(() => closeModal('modal-story-magazine',true));
      return result;
    });
    assert.deepEqual(errors,[],errors.join('\n'));
    await context.close();

    const legacyContext=await browser.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Taipei',serviceWorkers:'block'});
    await check('기존 퀵 캡슐과 자동 AI 일기는 실제 작성 날짜의 순간 기록으로 옮겨진다',async() => {
      const {page:legacy,errors:legacyErrors}=await open(legacyContext,{seed:[legacyTrip]});
      const loaded=await legacy.evaluate(() => {
        const trip=State.trips.find(item => item.id==='legacy_capsule_trip');
        return {quick:'quickCapsules' in trip,activityKeys:Object.keys(trip.activityRecords || {}),moments:trip.momentEntries.map(entry => ({id:entry.id,source:entry.source,date:entry.date,dayIndex:entry.dayIndex,title:entry.title,text:entry.text,link:entry.activityLink?.spotId || null}))};
      });
      const capsule=loaded.moments.find(entry => entry.id==='cap-1'),diary=loaded.moments.find(entry => entry.id==='rec-1');
      assert.equal(loaded.quick,false);assert.deepEqual(loaded.activityKeys,[]);
      assert.equal(capsule.date,'2030-04-03');assert.equal(capsule.dayIndex,2);assert.equal(capsule.link,'s3');
      assert.equal(diary.source,'capsule-diary');assert.match(diary.title,/AI 작성·검토 전/);assert.equal(diary.text,'AI가 쓴 글');
      // 다음 저장에서 옮긴 형식이 문서에도 남는다.
      const persisted=await legacy.evaluate(async () => {const trip=getActiveTrip();await commitTripCommand({tripId:trip.id,expectedRevision:trip.revision,change:copy => {copy.title='레거시 캡슐 여행 (확인)';}});const stored=JSON.parse(localStorage.getItem('st_trips_v2'))[0];return {quick:'quickCapsules' in stored,moments:stored.momentEntries.length};});
      assert.equal(persisted.quick,false);assert.equal(persisted.moments,2);
      assert.deepEqual(legacyErrors,[],legacyErrors.join('\n'));
      return {loaded,persisted};
    });
    await legacyContext.close();
  } finally {
    await browser.close();server.close();
  }
  const passed=results.every(result => result.passed);
  for(const result of results)console.log(`${result.passed ? 'PASS' : 'FAIL'} ${result.name}${result.passed ? '' : `\n  -> ${result.error}`}`);
  console.log(JSON.stringify({passed,results}));
  process.exitCode=passed ? 0 : 1;
})().catch(error => {console.error(error);process.exitCode=1;});
