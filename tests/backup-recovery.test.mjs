import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// 실제 저장소·사용자 자료 없이 저장 경계와 공동 계획 보호를 함께 실행한다.
function fixture(raw=null,{viewer=false,collaboration=true}={}) {
  const context={TextEncoder,URL};
  for(const file of ['js/domain/trip-adapter.js','js/domain/trip-transfer.js','js/infrastructure/collaboration/supabase-travel-service.js','js/infrastructure/storage/legacy-trip-repository.js','js/presentation/collaboration-review.js']) {
    vm.runInNewContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),context,{filename:file});
  }
  if(collaboration)context.SulsulTravel.CollaborationUI={canEditSharedTrip:()=>!viewer};
  const values=new Map(raw===null?[]:[['st_trips_v2',raw]]),writes=[],guards=[];
  const storage={getItem:key=>values.has(key)?values.get(key):null,setItem:(key,value)=>{writes.push(key);values.set(key,String(value));}};
  const repo=new context.SulsulTravel.LegacyTripRepository(storage,{
    now:()=> '2030-04-01T00:00:00.000Z',
    beforeWrite:args=>{guards.push(args);context.guardSharedTravelWrite(args);}
  });
  return {context,storage,values,writes,guards,repo};
}
const trip=()=>({id:'local-trip',title:'가상 복원 여행',revision:2,days:[{id:'day-1',date:'2030-04-01',city:'타이베이',spots:[{id:'spot-1',title:'골목 산책',time:'10:00',cat:'tour',recordId:'record-1'}]}],journals:{0:{text:'보존할 가상 회고',photos:[]}},activityRecords:{'record-1':{id:'record-1',context:{title:'골목 산책'},text:'가상 일정 원문',photos:[],coverIndex:0}},momentEntries:[{id:'moment-1',date:'2030-04-01',time:'10:30',text:'가상 순간 원문',photos:[],coverIndex:0}],expenses:[{id:'expense-1',title:'가상 식사',amount:1000,currency:'KRW',cat:'meal'}]});
const plain=value=>JSON.parse(JSON.stringify(value));
const recoveryError=error=>error.code==='RECOVERY_APPROVAL_REQUIRED';

test('손상 JSON·비배열 문서는 기본 거절하고 원문과 입력을 보존한다',()=>{
  for(const raw of ['{broken','{}','null','"목록 아님"','42','','   ','[null]','[{"title":"ID 없음"}]','[{"id":"invalid-day","days":[null]}]']) {
    const f=fixture(raw),input=[trip()],before=JSON.stringify(input);
    assert.throws(()=>f.repo.saveAll(input),recoveryError,raw);
    assert.equal(f.storage.getItem('st_trips_v2'),raw);
    assert.equal(JSON.stringify(input),before);
    assert.deepEqual(f.writes,[]);
    assert.equal(f.guards[0].approvedRecoveryRaw,null);
  }
});

test('손상 원문을 보존한 뒤 정확한 문자열 승인으로만 복원한다',()=>{
  for(const raw of ['{broken','{"not":"array"}','null','','[null]','[{"title":"ID 없음"}]','[{"id":"invalid-day","days":[null]}]']) {
    const f=fixture(raw),input=[trip()];
    f.storage.setItem('st_trips_v2_corrupt_preserved',raw);
    const saved=f.repo.saveAll(input,{approvedRecoveryRaw:raw,bumpTripId:'local-trip'});
    assert.equal(saved[0].title,input[0].title);
    assert.equal(saved[0].revision,3);
    assert.equal(input[0].revision,2);
    assert.equal(f.storage.getItem('st_trips_v2_corrupt_preserved'),raw);
    assert.deepEqual(JSON.parse(f.storage.getItem('st_trips_v2')),plain(saved));
    assert.equal(f.guards[0].approvedRecoveryRaw,raw);
  }
});

test('확인 후 원문이 바뀌었거나 문자열이 아닌 승인은 거절한다',()=>{
  for(const approval of ['{old-broken','{new-broken ',true,{},null]) {
    const f=fixture('{new-broken');
    assert.throws(()=>f.repo.saveAll([trip()],{approvedRecoveryRaw:approval}),recoveryError);
    assert.equal(f.storage.getItem('st_trips_v2'),'{new-broken');
    assert.deepEqual(f.writes,[]);
  }
});

test('원격 계획 승인은 손상 원문 복원 승인을 대신하지 않는다',()=>{
  const f=fixture('{broken');
  assert.throws(()=>f.repo.saveAll([trip()],{approvedRemoteTripId:'local-trip'}),recoveryError);
  assert.deepEqual(f.writes,[]);
});

test('정상 저장 문서에서는 복원 승인이 보기 전용 계획 보호를 우회하지 않는다',()=>{
  const original=trip(),raw=JSON.stringify([original]),f=fixture(raw,{viewer:true});
  const changed=trip();changed.title='변경된 계획';changed.days[0].spots[0].title='새 일정';
  assert.throws(()=>f.repo.saveAll([changed],{approvedRecoveryRaw:raw}),error=>error.code==='READ_ONLY_TRIP');
  assert.equal(f.storage.getItem('st_trips_v2'),raw);
  assert.deepEqual(f.writes,[]);
});

test('보기 전용 공동 계획의 개인 기록 저장은 계속 허용한다',()=>{
  const original=trip(),f=fixture(JSON.stringify([original]),{viewer:true}),changed=trip();
  changed.journals[0].text='수정한 가상 회고';changed.momentEntries[0].text='수정한 가상 순간';
  changed.activityRecords['record-1'].text='수정한 가상 일정 기록';changed.expenses[0].amount=2000;
  const saved=f.repo.saveAll([changed],{bumpTripId:'local-trip'});
  assert.equal(saved[0].journals[0].text,changed.journals[0].text);
  assert.equal(saved[0].momentEntries[0].text,changed.momentEntries[0].text);
  assert.equal(saved[0].activityRecords['record-1'].text,changed.activityRecords['record-1'].text);
  assert.equal(saved[0].expenses[0].amount,2000);
  assert.equal(saved[0].days[0].spots[0].title,original.days[0].spots[0].title);
  assert.equal(saved[0].revision,3);
});

test('정상 원격 적용과 기본 saveAll 옵션 계약을 유지한다',()=>{
  const raw=JSON.stringify([trip()]),f=fixture(raw,{viewer:true}),changed=trip();changed.title='검토한 서버 계획';
  const saved=f.repo.saveAll([changed],{approvedRemoteTripId:'local-trip',bumpTripId:'local-trip'});
  assert.equal(saved[0].title,changed.title);
  assert.equal(f.guards[0].approvedRemoteTripId,'local-trip');
  assert.equal(f.guards[0].approvedRecoveryRaw,null);
  assert.equal(saved[0].revision,3);
  assert.equal(saved[0].updatedAt,'2030-04-01T00:00:00.000Z');
});

test('applyDraft는 전달된 복구 승인 옵션을 사용하지 않고 손상 문서를 보호한다',()=>{
  const f=fixture('{broken'),input=[trip()],before=JSON.stringify(input);
  assert.throws(()=>f.repo.applyDraft(input,{tripId:'local-trip',baseRevision:2,jobId:'job-1',approvedRecoveryRaw:'{broken',mutate:copy=>{copy.title='AI 변경';}}),recoveryError);
  assert.equal(f.guards[0].approvedRecoveryRaw,null);
  assert.equal(f.guards[0].approvedRemoteTripId,null);
  assert.equal(JSON.stringify(input),before);
  assert.equal(f.storage.getItem('st_trips_v2'),'{broken');
  assert.deepEqual(f.writes,[]);
});

test('승인 후 저장 실패도 손상 원문·보존본·입력을 유지한다',()=>{
  const raw='{broken',f=fixture(raw),input=[trip()],before=JSON.stringify(input);
  f.storage.setItem('st_trips_v2_corrupt_preserved',raw);
  const setItem=f.storage.setItem;
  f.storage.setItem=(key,value)=>{if(key==='st_trips_v2')throw new Error('quota');setItem(key,value);};
  assert.throws(()=>f.repo.saveAll(input,{approvedRecoveryRaw:raw,bumpTripId:'local-trip'}),/quota/);
  assert.equal(f.storage.getItem('st_trips_v2'),raw);
  assert.equal(f.storage.getItem('st_trips_v2_corrupt_preserved'),raw);
  assert.equal(JSON.stringify(input),before);
});

test('복구 승인으로 잘못된 입력의 정규화 검증을 건너뛰지 않는다',()=>{
  const f=fixture('{broken');
  assert.throws(()=>f.repo.saveAll([{title:'ID 없음'}],{approvedRecoveryRaw:'{broken'}),/INVALID_TRIP/);
  assert.equal(f.storage.getItem('st_trips_v2'),'{broken');
  assert.deepEqual(f.writes,[]);
});

test('공동 UI가 없어도 손상 보호는 유지하고 빈 새 저장소는 허용한다',()=>{
  const corrupt=fixture('{broken',{collaboration:false});
  assert.throws(()=>corrupt.repo.saveAll([trip()]),recoveryError);
  const fresh=fixture(null,{collaboration:false});
  assert.equal(fresh.repo.saveAll([trip()])[0].id,'local-trip');
});
