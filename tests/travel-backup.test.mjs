import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
function domain(){
  const context={TextEncoder,URL};
  for(const file of ['trip-adapter.js','trip-transfer.js','travel-backup.js'])vm.runInNewContext(readFileSync(new URL('../js/domain/'+file,import.meta.url),'utf8'),context,{filename:file});
  return context.SulsulTravel.TravelBackup;
}
const api=domain(),plain=value=>JSON.parse(JSON.stringify(value));
const trip=()=>({id:'backup-trip',title:'합성 여행',revision:3,currency:'KRW',countries:['대한민국'],cities:['서울'],days:[{id:'d1',date:'2030-01-01',title:'첫날',city:'서울',spots:[{id:'s1',title:'산책',desc:'<b>원문</b><br>둘째 줄',time:'09:00',completed:true,recordId:'r1'}]}],journals:{0:{text:'x < y 비교와 <b>하루</b>',originalText:'보존할 원문',photos:['data:image/png;base64,AAAA']}},activityRecords:{r1:{id:'r1',context:{title:'산책'},text:'일정의 글',photos:[],coverIndex:0}},momentEntries:[{id:'m1',date:'2030-01-01',time:'10:30',text:'순간의 글',photos:[],coverIndex:0}],expenses:[{id:'e1',title:'식사',amount:1000,currency:'KRW'}],privateNote:'개인 필드도 보존'});
test('전체 백업은 원문·사진·상태·개인 필드를 보존하고 공유용 필터를 적용하지 않는다',()=>{
 const source=trip(),before=JSON.stringify(source),created=api.create([source],[],'1.9.2'),restored=api.parse(created.json).trips[0];
 assert.equal(restored.days[0].spots[0].desc,source.days[0].spots[0].desc);assert.equal(restored.days[0].spots[0].completed,true);assert.equal(restored.journals[0].text,source.journals[0].text);assert.equal(restored.journals[0].originalText,source.journals[0].originalText);assert.deepEqual(plain(restored.journals[0].photos),source.journals[0].photos);assert.equal(restored.privateNote,source.privateNote);assert.equal(JSON.stringify(source),before);assert.equal(created.payload.format,'sulsul-backup');assert.equal(created.payload.schemaVersion,1);assert.equal('geminiKey' in created.payload,false);assert.deepEqual(plain(api.summary(created.payload.trips)),{trips:1,days:1,records:3,photos:1,expenses:1});
});
test('BOM과 구 name/timeline 별칭을 정규화한 뒤 원본 별칭도 유지한다',()=>{
 const old={name:'구 제목',startDate:'2030-01-01',days:[{name:'구 하루',cityName:'New York',timeline:[{name:'구 장소',description:'옛 <strong>설명</strong>'}]}]};
 const restored=api.parse('\uFEFF'+JSON.stringify({version:'1.2.0',trips:[old]})).trips[0];assert.equal(restored.title,old.name);assert.equal(restored.name,old.name);assert.equal(restored.days[0].spots[0].title,'구 장소');assert.equal(restored.days[0].spots[0].desc,'옛 <strong>설명</strong>');assert.equal(restored.days[0].timeline[0].description,'옛 <strong>설명</strong>');assert.ok(restored.id);assert.equal(restored.days[0].city,'New York');
});
test('최신 보조 일기는 백업에 합치고 이전 revision 및 삭제된 여행의 보조 일기는 제외한다',()=>{
 const original=trip(),entries=[{tripId:original.id,dayIndex:0,revision:2,journal:{text:'이전 글'}},{tripId:original.id,dayIndex:0,revision:4,journal:{text:'최신 보조 글',originalText:'보조 원문'}},{tripId:'deleted',dayIndex:0,revision:9,journal:{text:'삭제한 여행'}}];
 const restored=api.parse(api.create([original],entries).json).trips[0];assert.equal(restored.journals[0].text,'최신 보조 글');assert.equal(restored.journals[0].originalText,'보조 원문');assert.deepEqual(plain(restored.journals[0].photos),original.journals[0].photos);assert.equal(restored.revision,4);assert.equal(original.journals[0].text,'x < y 비교와 <b>하루</b>');
});
test('서로 다른 날의 보조 일기는 순서와 무관하게 합치며 같은 날짜는 최신 버전을 보존한다',()=>{
 const source=trip(),entries=[{tripId:source.id,dayIndex:0,revision:5,journal:{text:'최신 첫날'}},{tripId:source.id,dayIndex:1,revision:4,journal:{text:'최신 둘째날'}},{tripId:source.id,dayIndex:0,revision:4,journal:{text:'덮으면 안 되는 첫날'}}];
 for(const order of [entries,[...entries].reverse()]){const result=api.parse(api.create([source],order).json).trips[0];assert.equal(result.journals[0].text,'최신 첫날');assert.equal(result.journals[1].text,'최신 둘째날');assert.equal(result.revision,5);}
 assert.equal(source.revision,3);assert.equal(source.journals[1],undefined);
});
test('손상·잘못된 여행·새 schema·실행 HTML은 저장 전에 거절한다',()=>{
 assert.throws(()=>api.parse('{'),/JSON/);assert.throws(()=>api.parse(JSON.stringify({format:'other',trips:[]})),/형식/);assert.throws(()=>api.parse(JSON.stringify({schemaVersion:2,trips:[]})),/형식/);
 for(const item of [null,{},[],{title:'제목',days:{}}])assert.throws(()=>api.parse(JSON.stringify({trips:[item]})));
 for(const markup of ['<script>alert(1)</script>','<img src=x onerror=alert(1)>','<b onclick="alert(1)">글</b>','<script','<b onclick=alert(1)']){const source=trip();source.journals[0].text=markup;assert.throws(()=>api.parse(JSON.stringify({trips:[source]})),/HTML/);}
 const unsafe=JSON.parse('{"trips":[{"title":"위험 필드","days":[],"__proto__":{"polluted":true}}]}');assert.throws(()=>api.parse(JSON.stringify(unsafe)),/필드/);
});
test('onclick 경계를 벗어나는 식별자·통화와 실행 사진 URL을 거절한다',()=>{
 for(const id of ["trip');alert(1);//",'trip`evil','trip;evil','trip<bad>']){const source=trip();source.id=id;assert.throws(()=>api.parse(JSON.stringify({trips:[source]})),/식별자|HTML/);}
 for(const code of ["USD');alert(1);//",'usd','US D']){const source=trip();source.currency=code;assert.throws(()=>api.parse(JSON.stringify({trips:[source]})),/통화/);}
 const photo=trip();photo.journals[0].photos=['javascript:alert(1)'];assert.throws(()=>api.parse(JSON.stringify({trips:[photo]})),/사진/);
});
test('명시적 빈 목록 백업은 유효하며 가져오기 크기 한도는 전체 백업의 공통 50MB이다',()=>{
 assert.deepEqual(plain(api.parse(api.create([]).json).trips),[]);assert.equal(api.MAX_BYTES,50*1024*1024);assert.throws(()=>api.parse('a'.repeat(api.MAX_BYTES+1)),/50MB/);
});
