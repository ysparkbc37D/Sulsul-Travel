/* 실제 페이지 AI 계약·검토 소유권 검사. 별도 프로필의 가상 여행만 사용하고 외부 요청은 차단한다. */
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const server = http.createServer((req,res) => {
  const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname.replace(/\/$/, '/index.html'));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error,data) => {
    if (error) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', ({'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({headless:true,...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
  try {
    const context = await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}), page = await context.newPage(), errors = [];
    page.on('pageerror',error => errors.push(error.message));
    await page.route('**/*',route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'networkidle'});
    const validation = await page.evaluate(async () => {
      window.alert = () => {}; window.confirm = () => true;
      const trip = {id:'ai-contract-test',title:'가상 여행',startDate:'2026-10-09',endDate:'2026-10-11',durationDays:3,cities:['가상 도시'],countries:[],revision:0,journals:{0:{text:'원래 글',photos:[]}},expenses:[],checklist:[],days:[1,2,3].map(dayNum => ({id:`ai-day-${dayNum}`,dayNum,date:`2026-10-${String(dayNum+8).padStart(2,'0')}`,title:`여행 ${dayNum}일`,city:'가상 도시',spots:[
        {id:`anchor-${dayNum}`,time:'09:15',title:'예약 일정',completed:true,fixed:true,recordId:`record-${dayNum}`,cost:'10',desc:'기존 예약 메모'},
        {id:`walk-${dayNum}`,time:'12:00',title:'가상 산책',cat:'tour'},
        {id:`meal-${dayNum}`,time:'14:30',title:'가상 식사',cat:'food'}
      ]}))};
      State.trips = TripRepository.saveAll([trip]); State.activeTripId = trip.id; State.activeJournalDay = 0;
      switchView('workspace'); switchTab('journal');
      const snapshotDays = structuredClone(getActiveTrip().days);
      const job = {id:'bad-replan',kind:'replan',tripId:trip.id,targetId:'replan',baseRevision:getActiveTrip().revision,input:{snapshotDays,targetDayVal:'1',offsetMinutes:30,reason:'가상 지연'}};
      const invalid = structuredClone(snapshotDays); invalid[1].spots.shift();
      const raw = localStorage.getItem('st_trips_v2'); let directError;
      try { await applyAiDraftPayload({...job,draft:{days:invalid}}); } catch (error) { directError = error.message; }
      const originalProvider = callGeminiApiWithFallback;
      callGeminiApiWithFallback = async () => { throw new Error('INVALID_API_KEY'); };
      const fallback = await generateAiDraftPayload(job,{signal:new AbortController().signal});
      let providerCalls = 0;
      callGeminiApiWithFallback = async () => { providerCalls++; throw new Error('공급자 호출 금지'); };
      const prepared = snapshotDays.map(day => ({...day,spots:day.spots.map(spot => ({...spot,time:spot.time === '09:15' ? '09:00' : spot.time}))}));
      const local = await generateAiDraftPayload({kind:'itinerary',tripId:trip.id,input:{preparedDays:prepared,localDraft:true,expectedDayCount:3}},{signal:new AbortController().signal});
      callGeminiApiWithFallback = originalProvider;
      return {
        sparseAccepted:validateAiDraftPayload({days:[{spots:[]}]},{kind:'itinerary',input:{expectedDayCount:9}}),
        invalidProtectedAccepted:validateAiDraftPayload({days:invalid},job),directError,unchanged:raw === localStorage.getItem('st_trips_v2'),
        normalizedProtected:JSON.stringify(normalizeAiDraftDays(snapshotDays,job)) === JSON.stringify(snapshotDays),
        fallbackSource:fallback.source,fallbackValid:validateAiDraftPayload(fallback,job),fallbackOutside:JSON.stringify(fallback.days[0]) === JSON.stringify(snapshotDays[0]),
        protectedTime:fallback.days[1].spots.find(spot => spot.id === 'anchor-2').time,flexibleTime:fallback.days[1].spots.find(spot => spot.id === 'walk-2').time,
        localSource:local.source,localValid:validateAiDraftPayload(local,{kind:'itinerary',input:{expectedDayCount:3}}),providerCalls,
        jpyAccepted:validateAiDraftPayload({receipt:{merchant:'가상 상점',amount:500,currency:'JPY',category:'meal',date:'2026-10-09'}},{kind:'receipt'}),
        bogusAccepted:validateAiDraftPayload({receipt:{merchant:'가상 상점',amount:500,currency:'ZZZ',category:'meal'}},{kind:'receipt'})
      };
    });
    assert.deepEqual(validation,{sparseAccepted:false,invalidProtectedAccepted:false,directError:'INVALID_OUTPUT',unchanged:true,normalizedProtected:true,fallbackSource:'local_time_adjustment',fallbackValid:true,fallbackOutside:true,protectedTime:'09:15',flexibleTime:'12:30',localSource:'local_draft',localValid:true,providerCalls:0,jpyAccepted:true,bogusAccepted:false});
    await page.evaluate(async () => {
      const {Orchestrator} = await import('../js/application/orchestration.mjs');
      window.aiProviderCalls = 0;
      aiOrchestratorPromise = Promise.resolve(new Orchestrator({generate:job => {aiProviderCalls++; return new Promise(resolve => {window.aiResolve = () => resolve({text:`검토할 글 ${job.id}`});});},validate:validateAiDraftPayload,applyDraft:applyAiDraftPayload}));
      const trip = getActiveTrip(); window.aiRequest = id => ({id,tripId:trip.id,targetId:'journal-0',kind:'journal',baseRevision:trip.revision,input:{dayIndex:0,sourceText:'원래 글'}});
      window.aiFirst = startAiDraftJob(aiRequest('owner-a'));
    });
    await page.waitForFunction(() => State.runningAiJobId === 'owner-a' && typeof aiResolve === 'function');
    const second = await page.evaluate(async () => ({result:await startAiDraftJob(aiRequest('owner-b')),active:State.activeAiJobId,running:State.runningAiJobId,providerCalls:aiProviderCalls}));
    assert.equal(second.result.state,'busy'); assert.equal(second.result.errorCode,'RUNNER_BUSY'); assert.equal(second.active,'owner-a'); assert.equal(second.running,'owner-a'); assert.equal(second.providerCalls,1);
    const review = await page.evaluate(async () => {
      aiResolve(); await aiFirst;
      const result = await startAiDraftJob(aiRequest('owner-c'));
      await cancelActiveAiJob();
      return {state:result.state,error:result.errorCode,review:State.reviewAiJobId,active:State.activeAiJobId,running:State.runningAiJobId,proposal:document.getElementById('ai-draft-review-proposal').textContent};
    });
    assert.deepEqual(review,{state:'busy',error:'REVIEW_BUSY',review:'owner-a',active:'owner-a',running:null,proposal:'검토할 글 owner-a'});
    const applied = await page.evaluate(async () => {
      await approveActiveAiDraft();
      const journal = SulsulTravel.TripAdapter.getJournalEntry(getActiveTrip(),0);
      return {text:journal.text,original:journal.originalText,dayId:journal.dayId,date:journal.date,review:State.reviewAiJobId,active:State.activeAiJobId,providerCalls:aiProviderCalls,persisted:JSON.parse(localStorage.getItem('st_trips_v2'))[0].journals[0].text};
    });
    assert.deepEqual(applied,{text:'검토할 글 owner-a',original:'원래 글',dayId:'ai-day-1',date:'2026-10-09',review:null,active:null,providerCalls:1,persisted:'검토할 글 owner-a'});
    const studio = await page.evaluate(async () => {
      aiOrchestratorPromise = null;
      window.studioToasts=[];const priorToast=showToast;showToast=(message,...args)=>{studioToasts.push(message);return priorToast(message,...args);};
      let providerCalls = 0;
      callGeminiApiWithFallback = async () => {providerCalls++; throw new Error('로컬 초안 외부 호출 금지');};
      Object.defineProperty(navigator,'onLine',{configurable:true,get:() => false});
      const before = structuredClone(getActiveTrip().days), originalJournal = SulsulTravel.TripAdapter.getJournalEntry(getActiveTrip(),0).text;
      lastModalActionTime = 0; openTripDraftStudio();
      draftStudioState.selectedCountries = ['JP']; draftStudioState.selectedCities = {JP:['도쿄']};
      draftStudioState.hubs = [{name:'도쿄',cities:['도쿄'],dayCount:3,startDayNum:1,endDayNum:3}];
      document.getElementById('draft-studio-start-date').value = '2026-10-09';
      document.getElementById('draft-studio-end-date').value = '2026-10-11';
      document.getElementById('draft-studio-arr-time').value = '14:00';
      document.getElementById('draft-studio-dep-time').value = '17:00';
      document.querySelector('input[name="draft-studio-engine"][value="smart_local"]').checked = true;
      const created = await executeDraftStudioGeneration();
      const retainedUntilApproval = JSON.stringify(getActiveTrip().days) === JSON.stringify(before);
      const reviewTitle = document.getElementById('ai-draft-review-title').textContent;
      await approveActiveAiDraft();
      const trip = getActiveTrip();
      return {created,retainedUntilApproval,reviewTitle,providerCalls,added:trip.days.reduce((sum,day) => sum + day.spots.length,0) > 9,
        protectedIntact:before.every((day,index) => JSON.stringify(day.spots[0]) === JSON.stringify(trip.days[index].spots.find(spot => spot.id === day.spots[0].id))),
        journalRetained:SulsulTravel.TripAdapter.getJournalEntry(trip,0).text === originalJournal};
    });
    if(!studio.created)console.error(await page.evaluate(()=>studioToasts));
    assert.deepEqual(studio,{created:true,retainedUntilApproval:true,reviewTitle:'로컬 일정 초안 검토',providerCalls:0,added:true,protectedIntact:true,journalRetained:true});
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({passed:true,checks:28,validation,studio,owner:'owner-a',errors}));
  } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode=1;}).finally(() => server.close());
