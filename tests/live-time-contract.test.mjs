import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),live=require('../js/domain/live-itinerary.js');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const start=html.indexOf('    function timeToMinutes(timeStr'),end=html.indexOf('    function minutesToTime(',start);
const legacy=new Function('SulsulTravel',html.slice(start,end)+';return timeToMinutes;')({LiveItinerary:live});
test('실제 레거시 화면도 시간 범위의 시작만 읽어 분과 날짜를 보존한다',()=>{
 assert.equal(legacy('09:30~10:00'),570);assert.equal(legacy('23:30~+1일 00:30'),1410);assert.equal(legacy('+2일 03:00'),3060);
});
test('일정 위치 계산은 새 항목만 넣고 기존 날짜·사용자 순서를 정렬하지 않는다',()=>{
 const trip={id:'t',days:[{id:'d1',spots:[{id:'a',title:'A',time:'09:00'},{id:'b',title:'B',time:'09:30~10:00'}]},{id:'d2',spots:[{id:'d',title:'D',time:'14:00'},{id:'e',title:'E',time:'13:00'}]}]};
 const untouched=JSON.stringify(trip.days[1]);live.apply(trip,{type:'insert',dayId:'d1',anchorId:'b',position:'before',item:{id:'n',title:'중간 삽입',time:'09:15'}});
 assert.deepEqual(trip.days[0].spots.map(s=>s.id),['a','n','b']);assert.equal(JSON.stringify(trip.days[1]),untouched);
});
