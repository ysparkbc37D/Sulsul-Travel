import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const live = require('../js/domain/live-itinerary.js');
const now = '2030-05-01T01:00:00Z';
const fixture = () => ({id:'synthetic-trip',revision:7,days:[
  {id:'d1',date:'2030-05-01',title:'합성 첫날',spots:[
    {id:'a',title:'가상 산책',time:'09:00',fixed:true},
    {id:'b',title:'가상 전시',time:'09:30~10:00',recordId:'r',photos:['data:image/png;base64,YQ=='],originalText:'보존 원문'},
    {id:'done',title:'가상 완료',time:'10:00',completed:true}
  ]},
  {id:'d2',date:'2030-05-02',title:'합성 둘째 날',spots:[{id:'later',title:'늦은 예약',time:'14:00'},{id:'earlier',title:'이른 예약',time:'13:00'}]}
],activityRecords:{r:{text:'가상 기록',originalText:'가상 원문',photos:['data:image/png;base64,YQ==']}},journals:{0:{text:'가상 회고'}}});
const apply = (trip,command) => live.apply(trip,command,{now});
const ids = day => day.spots.map(item => item.id);

test('시간 시작과 범위 끝의 날짜를 구별하고 시간 미정을 허용한다',()=>{
  assert.equal(live.minutes('09:30~10:00'),570);
  assert.equal(live.minutes('23:30~+1일 00:30'),1410);
  assert.equal(live.minutes('+2일 01:15~+3일 00:30'),2955);
  assert.equal(live.minutes('09:00 - 10:30'),540);
  assert.equal(live.minutes(''),null);
  assert.equal(live.validTime('',{allowEmpty:true}),true);
  for (const value of ['','25:00','09:99','9:30','x09:30','09:30 garbage','09:30~99:00','<09:30>']) assert.equal(live.validTime(value),false,value);
});

test('중간 삽입은 배열 순서와 다른 날을 보존하고 시각을 강제하지 않는다',()=>{
  const trip=fixture(), other=trip.days[1], before=JSON.stringify(other);
  const result=apply(trip,{type:'insert',dayId:'d1',anchorId:'a',position:'after',item:{id:'n',title:'가상 약국',time:''}});
  assert.deepEqual(ids(trip.days[0]),['a','n','b','done']);
  assert.equal(trip.days[0].spots[1].time,'');
  assert.equal(trip.days[1],other); assert.equal(JSON.stringify(other),before);
  assert.deepEqual(result.affectedDayIds,['d1']); assert.equal(result.itemId,'n'); assert.equal(trip.planRevision,1); assert.equal(trip.revision,7);
});

test('날짜 이동은 동일 ID와 기록 객체를 유지하고 수동 고정 수정을 허용한다',()=>{
  const trip=fixture(), records=trip.activityRecords, photos=trip.days[0].spots[1].photos;
  apply(trip,{type:'move',dayId:'d1',itemId:'b',targetDayId:'d2',position:'before',anchorId:'earlier'});
  assert.deepEqual(ids(trip.days[1]),['later','b','earlier']);
  assert.equal(trip.days[1].spots[1].recordId,'r'); assert.equal(trip.days[1].spots[1].photos,photos); assert.equal(trip.activityRecords,records);
  apply(trip,{type:'update',dayId:'d1',itemId:'a',changes:{title:'수동 변경',time:'08:50',fixed:false}});
  assert.equal(trip.days[0].spots[0].title,'수동 변경'); assert.equal(trip.days[0].spots[0].fixed,false);
});

test('같은 날 앞뒤 이동은 시각을 바꾸지 않고 undo가 원래 위치를 복원한다',()=>{
  const trip=fixture();
  apply(trip,{type:'move',dayId:'d1',itemId:'b',position:'start'});
  assert.deepEqual(ids(trip.days[0]),['b','a','done']);
  apply(trip,{type:'undo'});
  assert.deepEqual(ids(trip.days[0]),['a','b','done']); assert.equal(trip.days[0].spots[1].time,'09:30~10:00');
  assert.equal(trip.planRevision,2); assert.ok(trip.planHistory[0].undoneBy);
});

test('날짜·내용·삽입 위치의 동시 수정은 한 명령으로 적용하고 함께 되돌린다',()=>{
  const trip=fixture(), original=structuredClone(trip.days), records=trip.activityRecords;
  const result=apply(trip,{type:'update',dayId:'d1',itemId:'b',targetDayId:'d2',position:'before',anchorId:'earlier',changes:{title:'옮긴 전시',time:''}});
  assert.deepEqual(result.affectedDayIds,['d1','d2']); assert.deepEqual(ids(trip.days[1]),['later','b','earlier']);
  assert.equal(trip.days[1].spots[1].time,''); assert.equal(trip.days[1].spots[1].recordId,'r'); assert.equal(trip.planHistory.length,1);
  apply(trip,{type:'undo'}); assert.deepEqual(trip.days,original); assert.equal(trip.activityRecords,records);
});

test('다른 도시 날짜로 이동해도 장소의 출발 도시와 기록을 보존하고 undo가 초기 형태를 복원한다',()=>{
  for (const type of ['move','update']) {
    const trip=fixture(); trip.days[0].city='가상 도시 A'; trip.days[1].city='가상 도시 B';
    const original=structuredClone(trip.days), records=trip.activityRecords;
    apply(trip,{type,dayId:'d1',itemId:'b',targetDayId:'d2',position:'start',...(type==='update' ? {changes:{title:'다음 날 전시'}} : {})});
    assert.equal(trip.days[1].spots[0].city,'가상 도시 A'); assert.equal('country' in trip.days[1].spots[0],false);
    assert.equal(trip.days[1].spots[0].recordId,'r'); assert.equal(trip.activityRecords,records);
    apply(trip,{type:'undo'}); assert.deepEqual(trip.days,original); assert.equal(trip.activityRecords,records);
    trip.days[0].spots[1].city='별도로 지정한 도시'; trip.days[0].spots[1].country='가상 국가';
    apply(trip,{type:'move',dayId:'d1',itemId:'b',targetDayId:'d2',position:'start'});
    assert.equal(trip.days[1].spots[0].city,'별도로 지정한 도시'); assert.equal(trip.days[1].spots[0].country,'가상 국가');
  }
});

test('제거·보류는 보관하고 복구하며 완료 항목의 제거·보류·대체를 거절한다',()=>{
  const trip=fixture(), record=structuredClone(trip.activityRecords);
  apply(trip,{type:'remove',dayId:'d1',itemId:'b'});
  assert.equal(trip.days[0].spots[1].removed,true); assert.equal(live.active(trip.days[0].spots[1]),false);
  apply(trip,{type:'restore',dayId:'d1',itemId:'b'});
  assert.equal(live.active(trip.days[0].spots[1]),true);
  apply(trip,{type:'defer',dayId:'d1',itemId:'b'}); assert.equal(trip.days[0].spots[1].deferred,true);
  apply(trip,{type:'undo'}); assert.equal(live.active(trip.days[0].spots[1]),true);
  assert.deepEqual(trip.activityRecords,record);
  for(const type of ['remove','defer','replace']) assert.throws(()=>apply(trip,{type,dayId:'d1',itemId:'done',item:{title:'가상 대체'}}));
});

test('대체는 새 ID와 양방향 관계를 남기고 기존 기록을 보존한다',()=>{
  const trip=fixture(), original=structuredClone(trip.days[0].spots[1]);
  const result=apply(trip,{type:'replace',dayId:'d1',itemId:'b',item:{id:'new-b',title:'가상 카페',time:''}});
  assert.equal(result.itemId,'new-b'); assert.deepEqual(ids(trip.days[0]),['a','b','new-b','done']);
  assert.equal(trip.days[0].spots[1].recordId,'r'); assert.equal(trip.days[0].spots[1].replacedBySpotId,'new-b');
  assert.equal(trip.days[0].spots[2].replacesSpotId,'b'); assert.equal(live.active(trip.days[0].spots[1]),false);
  apply(trip,{type:'undo'});
  assert.deepEqual(trip.days[0].spots[1],original); assert.equal(trip.days[0].spots[2].removed,true);
});

test('최초 기준은 변경 전 계획이며 원문·사진·기록 ID와 이력을 포함하지 않는다',()=>{
  const trip=fixture(); apply(trip,{type:'update',dayId:'d1',itemId:'b',changes:{title:'바뀐 계획'}});
  assert.equal(trip.planBaseline.source,'captured-current'); assert.equal(trip.planBaseline.days[0].spots[1].title,'가상 전시');
  const baseline=trip.planBaseline; apply(trip,{type:'remove',dayId:'d1',itemId:'a'}); assert.equal(trip.planBaseline,baseline);
  const stored=JSON.stringify([trip.planBaseline,trip.planHistory]);
  for(const privateText of ['recordId','originalText','photos','data:image','가상 원문','보존 원문']) assert.equal(stored.includes(privateText),false,privateText);
});

test('수정 undo는 바뀐 필드만 복원하고 나중에 추가한 기록 연결을 유지한다',()=>{
  const trip=fixture(); apply(trip,{type:'update',dayId:'d1',itemId:'a',changes:{title:'변경 제목',desc:'새 메모'}});
  trip.days[0].spots[0].recordId='later-record'; trip.days[0].spots[0].photos=['후속 가상 사진']; trip.days[0].spots[0].completed=true;
  apply(trip,{type:'undo'});
  assert.equal(trip.days[0].spots[0].title,'가상 산책'); assert.equal('desc' in trip.days[0].spots[0],false);
  assert.equal(trip.days[0].spots[0].recordId,'later-record'); assert.deepEqual(trip.days[0].spots[0].photos,['후속 가상 사진']); assert.equal(trip.days[0].spots[0].completed,true);
});

test('추가 undo도 후속 기록을 가진 항목을 보관하고 이전 명령을 이어서 되돌린다',()=>{
  const trip=fixture(); apply(trip,{type:'update',dayId:'d1',itemId:'a',changes:{title:'변경'}});
  apply(trip,{type:'insert',dayId:'d1',position:'after',anchorId:'a',item:{id:'n',title:'가상 방문'}});
  trip.days[0].spots[1].recordId='new-record';
  apply(trip,{type:'undo'}); assert.equal(trip.days[0].spots[1].removed,true); assert.equal(trip.days[0].spots[1].recordId,'new-record');
  apply(trip,{type:'undo'}); assert.equal(trip.days[0].spots[0].title,'가상 산책');
});

test('후속 계획 변경이나 위치 충돌은 undo를 거절하고 원본을 유지한다',()=>{
  const trip=fixture(); apply(trip,{type:'update',dayId:'d1',itemId:'a',changes:{title:'변경'}});
  trip.days[0].spots[0].tip='다른 편집'; const before=JSON.stringify(trip);
  assert.throws(()=>apply(trip,{type:'undo'}),/이후 변경/); assert.equal(JSON.stringify(trip),before);
  const moving=fixture(); apply(moving,{type:'move',dayId:'d1',itemId:'b',position:'start'});
  moving.days[0].spots.reverse(); const reordered=JSON.stringify(moving);
  assert.throws(()=>apply(moving,{type:'undo'}),/순서/); assert.equal(JSON.stringify(moving),reordered);
});

test('ID 충돌·잘못된 기준·기록 변경·잘못된 시각은 부분 변경 없이 거절한다',()=>{
  const commands=[
    {type:'insert',dayId:'d1',item:{id:'later',title:'중복'}},
    {type:'move',dayId:'d1',itemId:'a',targetDayId:'d2',position:'before',anchorId:'absent'},
    {type:'update',dayId:'d1',itemId:'a',changes:{recordId:'bad'}},
    {type:'update',dayId:'d1',itemId:'a',changes:{photos:[]}},
    {type:'update',dayId:'d1',itemId:'a',changes:{time:'25:00'}},
    {type:'replace',dayId:'d1',itemId:'b',item:{id:'rejected',title:'잘못된 위치'},position:'before',anchorId:'absent'},
    {type:'update',dayId:'d1',itemId:'a',changes:{title:'변경'},expectedPlanRevision:99}
  ];
  for(const command of commands){const trip=fixture(),before=JSON.stringify(trip); assert.throws(()=>apply(trip,command)); assert.equal(JSON.stringify(trip),before,command.type);}
});

test('이력은 최신 30건으로 제한하고 임의의 과거 이벤트 undo를 거절한다',()=>{
  const trip=fixture();
  for(let index=0;index<35;index++) apply(trip,{type:'update',dayId:'d1',itemId:'a',changes:{title:'변경 '+index}});
  assert.equal(trip.planHistory.length,30); assert.equal(trip.planRevision,35);
  const before=JSON.stringify(trip); assert.throws(()=>apply(trip,{type:'undo',eventId:trip.planHistory[0].id})); assert.equal(JSON.stringify(trip),before);
});

test('직접 완료·취소 변경도 기록 객체를 건드리지 않고 이력으로 되돌린다',()=>{
  const trip=fixture(), records=trip.activityRecords;
  apply(trip,{type:'update',dayId:'d1',itemId:'a',changes:{completed:true}});
  apply(trip,{type:'undo'}); assert.equal('completed' in trip.days[0].spots[0],false);
  apply(trip,{type:'update',dayId:'d1',itemId:'b',changes:{skipped:true,cancelled:true,cancelReason:'가상 취소',cancelledAt:now}});
  assert.equal(live.active(trip.days[0].spots[1]),false); apply(trip,{type:'undo'}); assert.equal(live.active(trip.days[0].spots[1]),true);
  assert.equal(trip.activityRecords,records);
  assert.throws(()=>apply(trip,{type:'update',dayId:'d1',itemId:'done',changes:{cancelled:true}}));
});

test('여러 일정의 지연은 한 이력·버전으로 저장되고 한 번에 되돌린다',()=>{
  const trip=fixture(), untouched=JSON.stringify(trip.days[1]);
  const result=apply(trip,{type:'batch',commands:[
    {type:'update',dayId:'d1',itemId:'a',changes:{time:'09:15',replanNote:'가상 지연'}},
    {type:'update',dayId:'d1',itemId:'b',changes:{time:'09:45~10:15',replanNote:'가상 지연'}}
  ]});
  assert.equal(trip.planRevision,1); assert.equal(trip.planHistory.length,1); assert.equal(trip.planHistory[0].inverse.length,2);
  assert.deepEqual(result.affectedDayIds,['d1']); assert.equal(JSON.stringify(trip.days[1]),untouched);
  apply(trip,{type:'undo'}); assert.equal(trip.days[0].spots[0].time,'09:00'); assert.equal(trip.days[0].spots[1].time,'09:30~10:00'); assert.equal('replanNote' in trip.days[0].spots[0],false);
});

test('일괄 변경의 중간 실패와 조작된 이력의 기록 수정은 원본을 변경하지 않는다',()=>{
  const trip=fixture(), before=JSON.stringify(trip);
  assert.throws(()=>apply(trip,{type:'batch',commands:[{type:'update',dayId:'d1',itemId:'a',changes:{title:'성공하면 안 됨'}},{type:'update',dayId:'d1',itemId:'b',changes:{time:'99:00'}}]}));
  assert.equal(JSON.stringify(trip),before);
  apply(trip,{type:'update',dayId:'d1',itemId:'a',changes:{title:'변경'}});
  trip.planHistory[0].inverse[0].fieldNames.push('recordId'); trip.planHistory[0].inverse[0].before.fields.recordId='침입';
  const corrupted=JSON.stringify(trip); assert.throws(()=>apply(trip,{type:'undo'})); assert.equal(JSON.stringify(trip),corrupted);
});

test('손상된 이력과 기준 계획은 새 명령으로 덮어쓰지 않고 원본 그대로 거절한다',()=>{
  for (const metadata of [
    {planHistory:{}},{planHistory:[null]},
    {planBaseline:{days:{}}},{planBaseline:{source:'captured-current',capturedAt:now,planRevision:0,days:[{id:'d1',spots:{}}]}},
    {planRevision:-1}
  ]) {
    const trip={...fixture(),...metadata}, before=JSON.stringify(trip);
    assert.throws(()=>live.validateMetadata(trip),/이력/);
    assert.throws(()=>apply(trip,{type:'insert',dayId:'d1',item:{title:'덮어쓰면 안 되는 일정'}}),/이력/);
    assert.equal(JSON.stringify(trip),before);
  }
});

test('가져온 역패치의 위치·필드·ID를 검증하고 정상 JSON 이력은 다시 실행할 수 있다',()=>{
  const original=fixture(); apply(original,{type:'move',dayId:'d1',targetDayId:'d2',itemId:'a',position:'end'});
  const valid=JSON.parse(JSON.stringify(original)); assert.equal(live.validateMetadata(valid),true); apply(valid,{type:'undo'}); assert.equal(valid.days[0].spots[0].id,'a');
  for (const damage of [
    trip=>{trip.planHistory[0].inverse[0].before.position.index=-1;},
    trip=>{trip.planHistory[0].inverse[0].before.position.dayId='other';},
    trip=>{trip.planHistory[0].inverse[0].after.fields.photos=['사진'];},
    trip=>{trip.planHistory[0].inverse[0].fieldNames.push('recordId');},
    trip=>{trip.planHistory[0].id="bad';id";},
    trip=>{trip.planBaseline.days[0].spots[0].recordId='비공개';}
  ]) {
    const trip=JSON.parse(JSON.stringify(original)); damage(trip); const before=JSON.stringify(trip);
    assert.throws(()=>apply(trip,{type:'undo'}),/이력/); assert.equal(JSON.stringify(trip),before);
  }
});
