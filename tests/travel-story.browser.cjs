/* 고정 여행으로 PDF/블로그 출력 선택과 페이지 넘김을 검증한다. 외부 통신은 차단한다. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),output=path.join(root,'.local-review','travel-story');
const server=http.createServer((req,res) => {
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+(pathname==='/' ? '/index.html' : pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,content) => {
    if(error){res.writeHead(404).end();return;}
    res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)] || 'application/octet-stream');res.end(content);
  });
});
(async() => {
  fs.mkdirSync(output,{recursive:true});await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
  try {
    const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
    page.on('pageerror',error => errors.push(error.message));page.setDefaultTimeout(10000);
    await page.route('**/*',route => new URL(route.request().url()).hostname==='127.0.0.1' ? route.continue() : route.abort());
    await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'networkidle'});
    await page.evaluate(() => {
      window.alert=() => {};window.confirm=() => true;
      document.querySelectorAll('.sheet-container').forEach(element => element.classList.add('sheet-closed'));
      function photo(width,height,color) {const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,width,height);ctx.fillStyle='#fff';ctx.font='60px sans-serif';ctx.fillText(`${width} x ${height}`,60,100);return canvas.toDataURL('image/png');}
      const landscape=photo(1200,600,'#527b6c'),portrait=photo(600,1200,'#b67e4c');
      const trip={id:'story-qa',title:'마드리드, 우리의 이틀',startDate:'2026-10-11',endDate:'2026-10-12',countries:['스페인'],cities:['마드리드'],budget:10000,currency:'EUR',days:[
        {dayId:'d1',dayNum:1,date:'2026-10-11',title:'광장과 카페',city:'마드리드',spots:[{spotId:'s1',title:'아침 광장',time:'09:00',completed:true,recordId:'r1'},{spotId:'s2',title:'시장은 다음에',time:'12:00',skipped:true},{spotId:'s3',title:'저녁 산책',time:'18:00'}]},
        {dayId:'d2',dayNum:2,date:'2026-10-12',title:'돌아오는 날',city:'마드리드',spots:[{spotId:'s4',title:'기차역',time:'10:00'}]}
      ],activityRecords:{r1:{id:'r1',originalText:'AI 전 원문 문장',text:'승인 완료 광장 문장',aiDraftAcceptedAt:'2026-10-11T12:00:00Z',photos:[landscape],context:{title:'아침 광장',date:'2026-10-11',time:'09:00'}}},momentEntries:[
        {id:'m2',dayId:'d1',date:'2026-10-11',time:'10:15',text:'카페의 창가에서 쉬었다.',photos:[portrait]},
        {id:'m1',dayId:'d1',date:'2026-10-11',time:'08:00',text:'이른 아침 거리에서 만난 순간.',photos:[]}
      ],journals:{0:{text:Array.from({length:36},(_,index) => `긴 회고 ${index+1}. 골목을 걸으며 햇살이 옮겨 가는 모습을 바라보았다. 여행에서 남긴 글과 사진을 천천히 다시 읽는다. 두 사람이 나눈 이야기가 노트의 다음 줄로 이어진다.`).join('\n\n')+'\n\n회고 마지막 문장도 출력되어야 한다.',photos:[]},1:{text:'둘째 날의 하루 회고',photos:[]}},expenses:[{id:'e1',date:'2026-10-11',title:'아침 식사',cat:'meal',krw:1000},{id:'e2',date:'2026-10-11',title:'버스',cat:'transport',krw:2000},{id:'e3',date:'2026-10-11',title:'커피',cat:'food',krw:500},{id:'e4',date:'2026-10-12',title:'기차',cat:'flight',krw:3000}],checklist:[]};
      State.trips=[trip,{...trip,id:'other-trip',title:'다른 여행 제목',activityRecords:{},momentEntries:[],journals:{},expenses:[]}];State.activeTripId='other-trip';setTheme('modern');openPdfReportModal('story-qa');
    });
    await page.locator('#modal-pdf-report').waitFor({state:'visible'});
    const content=page.locator('#pdf-report-content');
    assert.equal(await content.locator('.travel-story-day').count(),2);
    assert.equal(await content.locator('.travel-story-entry').count(),5);
    assert.deepEqual(await content.locator('.travel-story-day').first().locator('[data-source-id]').evaluateAll(elements => elements.map(element => element.dataset.sourceId)),['moment:m1','day:d1/spot:s1','activity:r1','moment:m2','day:d1/spot:s2','day:d1/spot:s3','reflection:journal:0']);
    assert.deepEqual(await content.locator('.travel-story-itinerary h4 span').allTextContents(),['방문 완료','건너뜀','예정','예정']);
    assert.match(await content.textContent(),/AI 전 원문 문장/);assert.doesNotMatch(await content.textContent(),/승인 완료 광장 문장/);
    assert.match(await content.textContent(),/실제 기록 시각 미상/);
    const expenseCards=await content.locator('.grid-cols-3 > div').allTextContents();
    assert.match(expenseCards[0],/식비\s*₩1,500/);assert.match(expenseCards[2],/교통\/항공\s*₩5,000/);
    assert.equal(await content.locator('img').count(),2);
    await page.locator('#pdf-story-controls [data-story-text-mode]').selectOption('approved');
    assert.match(await content.textContent(),/승인 완료 광장 문장/);assert.doesNotMatch(await content.textContent(),/AI 전 원문 문장/);
    await page.locator('#pdf-story-controls [data-story-photos]').uncheck();
    assert.equal(await content.locator('img').count(),0);assert.match(await content.textContent(),/날짜별 여행 이야기 \(5편 \/ 0장\)/);
    async function saveDownload(action,name) {
      const pending=page.waitForEvent('download');await action();const result=await pending;const file=path.join(output,name);await result.saveAs(file);return {result,file,text:fs.readFileSync(file,'utf8')};
    }
    const html=await saveDownload(() => page.evaluate(() => downloadReportAsHtml()),'selected-report.html');
    assert.match(html.result.suggestedFilename(),/^마드리드, 우리의 이틀_/);assert.doesNotMatch(html.text,/다른 여행 제목|data:image|data-story-download/);
    assert.match(html.text,/승인 완료 광장 문장/);
    const markdown=await saveDownload(() => page.locator('#pdf-story-controls [data-story-download="markdown"]').click(),'selected-story.md');
    assert.match(markdown.result.suggestedFilename(),/\.md$/);assert.match(markdown.text,/승인 완료 광장 문장/);assert.doesNotMatch(markdown.text,/data:image/);
    const plain=await saveDownload(() => page.locator('#pdf-story-controls [data-story-download="text"]').click(),'selected-story.txt');
    assert.match(plain.result.suggestedFilename(),/\.txt$/);assert.match(plain.text,/둘째 날의 하루 회고/);
    await page.locator('#pdf-story-controls [data-story-text-mode]').selectOption('original');
    await page.locator('#pdf-story-controls [data-story-photos]').check();
    const ratios=await content.locator('img').evaluateAll(async images => {await Promise.all(images.map(image => image.decode()));return images.map(image => {const box=image.getBoundingClientRect();return {natural:image.naturalWidth/image.naturalHeight,display:box.width/box.height};});});
    for(const ratio of ratios)assert.ok(Math.abs(ratio.natural-ratio.display)<.02);
    for(const width of [320,360,390,430]) {
      await page.setViewportSize({width,height:844});
      const bounds=await page.evaluate(() => {const sheet=document.querySelector('#modal-pdf-report .sheet-box').getBoundingClientRect(),controls=document.getElementById('pdf-story-controls');return {overflow:document.documentElement.scrollWidth>innerWidth,inside:sheet.left>=-1&&sheet.right<=innerWidth+1,controlsOverflow:controls.scrollWidth>controls.clientWidth+1};});
      assert.deepEqual(bounds,{overflow:false,inside:true,controlsOverflow:false},`PDF mobile ${width}`);
    }
    await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(output,'report-mobile.png')});
    await page.setViewportSize({width:1000,height:900});await page.emulateMedia({media:'print'});
    const print=await page.evaluate(() => ({controls:getComputedStyle(document.getElementById('pdf-story-controls')).display,paragraph:getComputedStyle(document.querySelector('.travel-story-text')).breakInside,figure:getComputedStyle(document.querySelector('.travel-story-photos figure')).breakInside,others:[...document.body.children].filter(element => element.id!=='modal-pdf-report').every(element => getComputedStyle(element).display==='none')}));
    assert.deepEqual(print,{controls:'none',paragraph:'auto',figure:'avoid',others:true});
    await page.pdf({path:path.join(output,'report-print.pdf'),format:'A4',preferCSSPageSize:true,printBackground:false});
    assert.ok(fs.statSync(path.join(output,'report-print.pdf')).size>1000);
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({passed:true,checks:'날짜별 시간순/방문 상태, 원문·승인문/사진 선택, 식비·교통 합계, 비활성 여행 파일명, HTML·Markdown·텍스트 다운로드, 사진 비율, 320~430px PDF 모달, 긴 회고 A4 출력',pdf:path.join(output,'report-print.pdf'),errors}));
  } finally {await browser.close();}
})().catch(error => {console.error(error);process.exitCode=1;}).finally(() => server.close());
