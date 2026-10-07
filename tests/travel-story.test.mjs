import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const require=createRequire(import.meta.url);
const story=require('../js/domain/travel-story.js');
const ui=require('../js/presentation/travel-story-ui.js');
const photo='data:image/jpeg;base64,YQ==';
function fixture() {
  return {id:'trip',title:'느리게 걷는 여행',startDate:'2026-10-11',endDate:'2026-10-12',countries:['스페인'],budget:10000,days:[
    {dayId:'d1',dayNum:1,date:'2026-10-11',city:'New York',title:'첫날',spots:[{spotId:'s1',name:'오래된 광장',time:'09:00',completed:true,recordId:'r1'},{id:'s2',title:'시장',time:'12:00',skipped:true},{title:'저녁 산책',time:'18:00'}]},
    {id:'d2',dayNum:2,date:'2026-10-12',title:'둘째 날',spots:[]}
  ],activityRecords:{r1:{id:'r1',text:'광장에 도착했다.',photos:[photo],updatedAt:'2026-10-15T20:00:00Z',context:{title:'옛 일정 제목',date:'2026-10-11',time:'09:00'}}},momentEntries:[
    {id:'m2',dayId:'d1',date:'2026-10-11',time:'10:15',text:'카페에서 잠깐 쉬었다.',photos:[],createdAt:'2026-10-11T10:20:00+09:00'},
    {id:'m1',dayId:'d1',date:'2026-10-11',time:'08:00',text:'아침 공기가 좋았다.',photos:[]}
  ],journals:{0:{text:'하루를 천천히 걸었다.',photos:[photo]}},expenses:[{id:'e1',title:'아침',cat:'meal',krw:1000},{id:'e2',title:'버스',cat:'transport',krw:2000},{id:'e3',title:'커피',cat:'food',krw:500},{id:'e4',title:'항공',cat:'flight',krw:3000},{id:'income',type:'income',cat:'etc',krw:80000}]};
}
test('계획·실제·순간을 날짜별 시간순으로 묶고 하루 회고를 마지막에 둔다',() => {
  const trip=fixture(),before=JSON.stringify(trip),model=story.build(trip);
  assert.equal(JSON.stringify(trip),before);
  assert.deepEqual(model.days[0].timeline.map(item => item.id),['m1','s1','r1','m2','s2','d1:spot:2']);
  assert.deepEqual(model.days[0].itinerary.map(item => item.status),['completed','skipped','planned']);
  assert.equal(model.days[0].itinerary[0].title,'오래된 광장');
  assert.equal(model.days[0].records.find(item => item.id==='r1').title,'오래된 광장');
  assert.equal(model.timeline.at(-1).kind,'reflection');
  assert.equal(model.stats.recordCount,4);assert.equal(model.stats.photoCount,2);
  assert.equal(model.days[0].city,'New York');
});
test('알 수 없는 실제 발생·작성 시각을 수정 시각이나 예정 시각으로 채우지 않는다',() => {
  const model=story.build(fixture()),record=model.days[0].records.find(item => item.id==='r1');
  assert.equal(record.time,null);assert.equal(record.createdAt,null);assert.equal(record.occurredAt,null);
  assert.equal(record.scheduledTime,'09:00');assert.equal(record.timeSource,'unknown');
  const fact=model.manifest.facts.find(item => item.sourceId==='activity:r1');
  assert.equal(fact.createdAt,null);assert.equal(fact.time,null);
  assert.match(story.renderHtml(model),/실제 기록 시각 미상/);
  assert.match(story.toText(model),/방문 시각 미상/);
});
test('안정적인 날짜·장소 ID는 일정을 옮기거나 이름을 바꾸어도 연결을 유지한다',() => {
  const trip=fixture();trip.days.reverse();
  trip.days[1].spots[0].name='전체 이름을 보존한 새 광장';
  trip.activityRecords.r1.context={dayId:'d1',spotId:'s1',title:'옛 제목'};
  const model=story.build(trip);
  assert.equal(model.days[0].id,'d1');assert.equal(model.days[0].records.find(item => item.id==='r1').spotId,'s1');
  assert.equal(model.days[0].records.find(item => item.id==='r1').title,'전체 이름을 보존한 새 광장');
  assert.equal(model.days[0].records.find(item => item.id==='m1').dayId,'d1');
});
test('현재 일정에서 빠진 기록과 날짜 미상 기록도 잃지 않고 보존한다',() => {
  const trip=fixture();trip.activityRecords.archived={id:'archived',text:'지난 일정의 기록',photos:[],context:{title:'지워진 일정',date:'2026-10-13',time:'15:00'}};
  trip.momentEntries.push({id:'unknown',text:'언제였는지 모르는 기억',photos:[]});
  const model=story.build(trip);
  assert.equal(model.days.find(day => day.date==='2026-10-13').records[0].orphaned,true);
  assert.equal(model.days.at(-1).date,null);assert.equal(model.days.at(-1).records[0].createdAt,null);
  assert.match(story.toText(model),/언제였는지 모르는 기억/);
  assert.match(story.toText(model),/일정 변경 전 기록/);
});
test('구 일기 인덱스와 ISO 날짜 키를 각각 올바른 날짜에 연결한다',() => {
  const trip=fixture();trip.journals={0:{text:'첫날 회고'},'2026-10-12':{text:'둘째 날 회고'}};
  const model=story.build(trip);
  assert.equal(model.days[0].reflections[0].text,'첫날 회고');assert.equal(model.days[1].reflections[0].text,'둘째 날 회고');
});
test('원문과 사용자가 승인한 문장을 선택하고 미승인 AI 초안을 출력하지 않는다',() => {
  const trip=fixture();trip.momentEntries[0]={...trip.momentEntries[0],originalText:'카페에 쉬었다',text:'카페에서 잠시 쉬었다.',aiDraftAcceptedAt:'2026-10-11T12:00:00Z'};
  trip.momentEntries[1]={...trip.momentEntries[1],originalText:'아침이었다',text:'미승인 문장',approvedText:'승인되지 않은 별도 문장',aiDraft:{text:'생성된 허구'}};
  const original=story.build(trip),approved=story.build(trip,{textMode:'approved'});
  assert.equal(original.days[0].records.find(item => item.id==='m2').text,'카페에 쉬었다');
  assert.equal(approved.days[0].records.find(item => item.id==='m2').text,'카페에서 잠시 쉬었다.');
  assert.equal(approved.days[0].records.find(item => item.id==='m2').textOrigin,'approved');
  assert.equal(approved.days[0].records.find(item => item.id==='m1').text,'아침이었다');
  assert.doesNotMatch(story.toMarkdown(approved),/미승인|생성된 허구|승인되지 않은 별도 문장/);
  const fact=approved.manifest.facts.find(item => item.sourceId==='moment:m2');
  assert.equal(fact.text,'카페에 쉬었다');assert.equal(fact.approvedText,'카페에서 잠시 쉬었다.');
});
test('가계부와 출력은 meal/food 및 transport/flight를 같은 분류에 합산한다',() => {
  const trip=fixture();trip.expenses.push({cat:'mystery',krw:100},{cat:'lodging',curr:'USD',amount:12},{cat:'shopping',curr:'KRW',amount:300});
  const summary=story.summarizeExpenses(trip);
  assert.equal(summary.totalSpentKrw,6900);assert.equal(summary.incomeKrw,80000);
  assert.equal(summary.categoryTotals.meal,1500);assert.equal(summary.categoryTotals.transport,5000);
  assert.equal(summary.categoryTotals.etc,100);assert.equal(summary.categoryTotals.shopping,300);
  assert.equal(summary.unconvertedCount,1);assert.equal(summary.remainingKrw,3100);
  assert.deepEqual(summary.byCategory.slice(0,2).map(item => item.label),['식비','교통']);
});
test('가계부의 간식·술·음료와 렌터카도 식비 및 교통 합계에 포함한다',() => {
  const summary=story.summarizeExpenses({expenses:[{cat:'snack',krw:100},{cat:'drink',krw:200},{cat:'beverage',krw:300},{cat:'rental',krw:400}]});
  assert.equal(summary.categoryTotals.meal,600);assert.equal(summary.categoryTotals.transport,400);assert.equal(summary.categoryTotals.etc,0);
});
test('사진 보관본과 동기 해석 API를 지원하고 사진 제외 선택을 모든 출력에 반영한다',() => {
  const trip=fixture();trip.momentEntries[0].photos=[{original:photo,thumbnail:'data:image/jpeg;base64,Yg==',caption:'가로 사진'}];
  trip.momentEntries[1].mediaIds=['media'];
  const model=story.build(trip,{photoSource:(entry,index) => entry.id==='m1' ? photo : ''});
  assert.equal(model.stats.includedPhotoCount,4);
  assert.equal(model.days[0].records.find(item => item.id==='m2').photos[0].src,photo);
  assert.match(story.renderHtml(model),/height:auto;object-fit:contain/);
  const without=story.build(trip,{includePhotos:false});
  assert.equal(without.stats.includedPhotoCount,0);assert.doesNotMatch(story.renderHtml(without),/<img/);
  assert.doesNotMatch(story.toMarkdown(without),/data:image/);
});
test('HTML과 Markdown 출력은 본문·제목·출처 ID를 이스케이프하고 실행 주소를 거부한다',() => {
  const trip=fixture();trip.title='<img src=x onerror=alert(1)>';trip.momentEntries[0].text='<script>alert(1)</script>\n[a](javascript:alert(1))';trip.momentEntries[0].id='" onclick="attack';trip.momentEntries[0].photos=['javascript:alert(1)','data:image/svg+xml,<svg/>'];
  const model=story.build(trip),html=story.renderHtml(model),markdown=story.toMarkdown(model);
  assert.doesNotMatch(html,/<script>|<img src=x|onclick="attack/);assert.match(html,/&lt;script&gt;/);
  assert.doesNotMatch(markdown,/<script>|\[a\]\(javascript/);assert.match(markdown,/&lt;script&gt;/);
  assert.equal(story.safePhoto('http://example.com/a.jpg'),'');assert.equal(story.safePhoto('https://name:secret@example.com/a.jpg'),'');
});
test('출처 manifest는 모든 일정·기록을 원문 및 구조 위치와 연결한다',() => {
  const model=story.build(fixture());
  assert.equal(new Set(model.manifest.facts.map(item => item.sourceId)).size,model.manifest.facts.length);
  assert.equal(model.manifest.facts.length,7);
  assert.equal(model.manifest.facts.find(item => item.sourceId==='moment:m1').path,'momentEntries[1]');
  assert.deepEqual(story.build(fixture()).manifest,model.manifest);
  assert.ok(model.manifest.constraints.some(value => value.includes('예정 일정')));
});
test('표지→날짜별 기록→하루 회고→지출 부록을 출력하고 기존 PDF에 날짜 내용만 삽입할 수 있다',() => {
  const model=story.build(fixture()),html=story.renderHtml(model);
  assert.ok(html.indexOf('travel-story-cover')<html.indexOf('data-day-id="d1"'));
  assert.ok(html.indexOf('하루 회고')<html.indexOf('지출 부록'));
  const dates=story.renderHtml(model,{includeCover:false,includeExpenses:false});
  assert.doesNotMatch(dates,/travel-story-cover|지출 부록/);assert.match(dates,/하루 회고/);
  assert.match(story.PRINT_CSS,/travel-story-text\{break-inside:auto\}/);
});
test('Markdown과 텍스트 파일은 선택한 글·사진을 포함하고 안전한 파일명을 사용한다',() => {
  const trip=fixture();trip.title='서울/부산: 여행';
  const markdown=ui.prepareExport(trip,'markdown'),plain=ui.prepareExport(trip,'text',{includePhotos:false});
  assert.equal(markdown.filename,'서울_부산_ 여행_여행이야기.md');assert.equal(plain.mimeType,'text/plain;charset=utf-8');
  assert.match(markdown.content,/!\[/);assert.doesNotMatch(plain.content,/data:image/);
  assert.match(plain.content,/하루 회고/);assert.match(markdown.content,/교통: ₩5,000/);
});
test('파일 다운로드는 실제 Blob 링크를 클릭하고 URL 자원을 해제한다',() => {
  const events=[],anchor={remove:() => events.push('remove'),click:() => events.push('click')};
  const environment={Blob,document:{body:{appendChild:node => {assert.equal(node,anchor);events.push('append');}},createElement:tag => {assert.equal(tag,'a');return anchor;}},URL:{createObjectURL:blob => {assert.ok(blob.size>0);return 'blob:story';},revokeObjectURL:url => events.push(url)},setTimeout:callback => callback()};
  const result=ui.download(fixture(),'text',{includePhotos:false},environment);
  assert.equal(anchor.href,'blob:story');assert.equal(anchor.download,result.filename);
  assert.deepEqual(events,['append','click','remove','blob:story']);
});
test('출력 UI의 원문/승인문 및 사진 선택은 콜백과 내보낼 모델에 동시에 반영된다',() => {
  let trip=fixture();trip.activityRecords.r1={...trip.activityRecords.r1,originalText:'원문',text:'승인된 문장',aiDraftAcceptedAt:'2026-10-11T12:00:00Z'};
  const handlers={},nodes={mode:{value:'original'},photos:{checked:true},feedback:{textContent:''}};
  const container={innerHTML:'',querySelector:selector => selector.includes('text-mode') ? nodes.mode : selector.includes('photos') ? nodes.photos : nodes.feedback,addEventListener:(type,handler) => {handlers[type]=handler;},removeEventListener:(type,handler) => {if(handlers[type]===handler)delete handlers[type];}};
  let selected;
  const control=ui.mountControls(container,() => trip,{onChange:(model,selection) => {selected={model,selection};}});
  assert.equal(selected,undefined);
  nodes.mode.value='approved';nodes.photos.checked=false;
  handlers.change({target:{matches:() => true}});
  assert.equal(selected.selection.textMode,'approved');assert.equal(selected.model.stats.includedPhotoCount,0);
  assert.equal(selected.model.days[0].records.find(item => item.id==='r1').text,'승인된 문장');
  assert.doesNotMatch(ui.prepareExport(control.getModel()).content,/data:image/);
  trip={...trip,title:'새 여행 이름'};
  assert.equal(control.getModel().cover.title,'새 여행 이름');
  control.destroy();assert.deepEqual(handlers,{});
});
test('브라우저 IIFE는 DOM 없이 공통 모델과 UI API를 순서대로 등록한다',() => {
  const context=vm.createContext({URL,Date,window:{}});
  vm.runInContext(readFileSync(new URL('../js/domain/travel-story.js',import.meta.url),'utf8'),context);
  vm.runInContext(readFileSync(new URL('../js/presentation/travel-story-ui.js',import.meta.url),'utf8'),context);
  assert.equal(typeof context.window.SulsulTravel.TravelStory.build,'function');
  assert.equal(typeof context.window.SulsulTravel.TravelStoryUI.mountControls,'function');
  assert.equal(context.window.SulsulTravel.TravelStory.build(fixture()).stats.recordCount,4);
});
