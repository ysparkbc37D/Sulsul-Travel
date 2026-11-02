import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// 실제 렌더 함수를 실행하되 DOM은 문자열 출력과 하위 노드만 관찰한다.
function element() {
  return {children:[],textContent:'',append(...nodes){this.children.push(...nodes);},replaceChildren(){this.children=[];},setAttribute(){}};
}
test('손상 이력의 툴바와 상세 조회가 여행 화면을 멈추거나 저장된 기록을 바꾸지 않는다',()=>{
  for(const metadata of [{planHistory:{}},{planHistory:[null]},{planBaseline:{days:{}}},{planBaseline:{source:'captured-current',capturedAt:'2030-01-01',planRevision:0,days:[{id:'d1',spots:{}}]}}]) {
    const trip={id:'synthetic',days:[{id:'d1',spots:[]}],activityRecords:{r1:{text:'보존할 합성 기록',photos:[]}},...metadata};
    const body=element(),before=JSON.stringify(trip);
    const context={getActiveTrip:()=>trip,State:{},document:{body:{classList:{toggle(){}}},getElementById:()=>body,createElement:element}};
    for(const file of ['js/domain/live-itinerary.js','js/presentation/live-itinerary-ui.js'])vm.runInNewContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),context,{filename:file});
    assert.match(context.renderLiveToolbar(0),/onclick="undoLiveSchedule\(\)" disabled/);
    assert.equal(context.latestLiveScheduleChange(trip),null);
    assert.doesNotThrow(()=>context.renderLiveHistory());
    assert.ok(body.children.some(node=>node.textContent.includes('변경 이력을 확인할 수 없습니다')));
    assert.equal(JSON.stringify(trip),before);
  }
});
