import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),validation=require('../js/domain/ai-draft-validation.js');
const domain=require('../js/domain/schedule-change.js');
test('지연은 선택 일정 이후 유연한 항목만 바꾸며 완료·고정·기록·취소를 보존한다',()=>{
 const day={spots:[{id:'earlier',time:'08:00'},{id:'start',title:'산책',time:'09:00~09:30'},{id:'fixed',time:'10:00',fixed:true},{id:'done',time:'10:30',completed:true},{id:'record',time:'11:00',recordId:'r'},{id:'skip',time:'11:30',skipped:true},{id:'cancel',time:'12:00',cancelled:true},{id:'last',title:'식사',time:'13:00'}]},before=JSON.stringify(day);
 const preview=domain.previewDelay(day,'start',60);
 assert.deepEqual(preview.changes.map(s=>[s.id,s.after]),[['start','10:00~10:30'],['last','14:00']]);assert.equal(preview.preserved,5);assert.equal(JSON.stringify(day),before);assert.equal(preview.warnings.length,1);
});
test('시간 범위와 자정 이후 표기를 보존하고 잘못된 지연값을 거절한다',()=>{
 assert.equal(domain.shift('23:30~00:30',60),'+1일 00:30~+1일 01:30');assert.equal(domain.shift('+1일 00:30',30),'+1일 01:00');
 assert.throws(()=>domain.previewDelay({spots:[{id:'a',time:'09:00'}]},'a',-30));assert.throws(()=>domain.previewDelay({spots:[{id:'a',time:'09:00'}]},'a',721));assert.throws(()=>domain.shift('25:99',30));
});
test('AI와 로컬 RePlan은 취소·건너뛴 원본을 삭제하거나 되살릴 수 없다',async()=>{
 const before=[{id:'d',dayNum:1,title:'가상 하루',city:'가상 도시',spots:[{id:'a',title:'취소한 일정',time:'09:00',skipped:true,cancelled:true},{id:'b',title:'남은 일정',time:'10:00'}]}];
 const after=structuredClone(before);after[0].spots[0].skipped=false;assert.equal(validation.protectedSpotsMatch(before,after),false);
 const {createReplanProposal}=await import('../js/domain/replan.mjs');const result=createReplanProposal({days:before,offsetMinutes:30});assert.deepEqual(result.proposedDays[0].spots[0],before[0].spots[0]);assert.equal(result.proposedDays[0].spots[1].time,'10:30');
});
