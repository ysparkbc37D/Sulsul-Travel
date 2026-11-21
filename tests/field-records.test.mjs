import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';

const require = createRequire(import.meta.url);
const contacts = require('../js/destinations/emergency-contacts.js');
const adapter = require('../js/domain/trip-adapter.js');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const companion = readFileSync(new URL('../js/presentation/companion-ui.js', import.meta.url), 'utf8');

// 국가 판별에 쓰는 앱의 이름·도시 조회를 대신하는 최소 사전.
const names = {중국:'CN',쿤밍:'CN',대만:'TW',타이베이:'TW',칠레:'CL',산티아고:'CL',페루:'PE',리마:'PE',스페인:'ES',바르셀로나:'ES'};
const lookup = value => names[value] ? {country:{code:names[value]}} : null;

test('emergency numbers come from the sourced table and keep known corrections', () => {
  assert.match(contacts.SOURCE.url, /^https:\/\/en\.wikipedia\.org\//);
  assert.match(contacts.SOURCE.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
  for (const [code, entry] of Object.entries(contacts.DATA)) {
    assert.match(code, /^[A-Z]{2}$/);
    assert.ok(entry.name && entry.lang, code);
    for (const key of ['police', 'ambulance']) assert.match(entry[key], /^\d{2,4}$/, `${code} ${key}`);
  }
  assert.equal(contacts.DATA.CN.ambulance, '120');
  assert.equal(contacts.DATA.TW.ambulance, '119');
  assert.deepEqual([contacts.DATA.CL.police, contacts.DATA.CL.ambulance, contacts.DATA.CL.fire], ['133', '131', '132']);
  assert.deepEqual([contacts.DATA.PE.police, contacts.DATA.PE.ambulance], ['105', '106']);
  assert.equal(contacts.CONSULAR.tel, '+82232100404');
});

test('country is chosen from the day city and never guessed across countries', () => {
  const day = (date, city) => ({date, city, spots:[]});
  assert.equal(contacts.resolve({countries:['중국'], days:[day('2030-04-01','쿤밍')]}, 0, lookup).code, 'CN');
  const southAmerica = {countries:['페루','칠레'], days:[day('2030-04-01','리마'), day('2030-04-02','산티아고'), day('2030-04-03','')]};
  assert.deepEqual(contacts.resolve(southAmerica, 1, lookup), {code:'CL', basis:'day', candidates:['PE','CL']});
  assert.deepEqual(contacts.resolve(southAmerica, 2, lookup), {code:null, basis:'ambiguous', candidates:['PE','CL']});
  // 도시가 여행 국가 목록 밖이면 그 도시를 믿지 않는다.
  assert.equal(contacts.resolve({countries:['칠레'], days:[day('2030-04-01','바르셀로나')]}, 0, lookup).code, 'CL');
  assert.equal(contacts.resolve({countries:['아이슬란드'], days:[day('2030-04-01','레이캬비크')]}, 0, lookup).code, null);
  const spain = contacts.contacts('ES');
  assert.deepEqual(spain.lines.map(line => line.tel), ['112', '091']);
});

test('legacy quick capsules move to moment entries on their real creation date', () => {
  const trip = adapter.normalizeTrip({id:'t', title:'x', startDate:'2030-04-01', timeZone:'Asia/Taipei',
    days:[{date:'2030-04-01', spots:[]}, {date:'2030-04-02', spots:[{title:'B 시장', time:'10:00'}]}],
    quickCapsules:[{id:'cap-1', dayIndex:0, date:'2030-04-01', time:'03:00', text:'메모', spotTitle:'B 시장', createdAt:'2030-04-02T03:00:00.000Z'}, {id:'cap-empty', text:'', photo:null}],
    activityRecords:{'rec-1':{id:'rec-1', content:'AI 글', createdAt:'2030-04-02T04:00:00.000Z'}, kept:{id:'kept', text:'일정 기록', context:{title:'B 시장'}}}});
  assert.equal('quickCapsules' in trip, false);
  assert.deepEqual(Object.keys(trip.activityRecords), ['kept']);
  const [capsule, diary] = trip.momentEntries;
  assert.equal(capsule.date, '2030-04-02'); assert.equal(capsule.time, '11:00'); assert.equal(capsule.dayIndex, 1);
  assert.equal(capsule.activityLink.title, 'B 시장'); assert.equal(capsule.source, 'capsule');
  assert.equal(diary.source, 'capsule-diary'); assert.equal(diary.aiAuthored, true); assert.match(diary.title, /AI 작성·검토 전/);
  assert.equal(trip.momentEntries.length, 2, '빈 캡슐은 옮기지 않는다');
  assert.deepEqual(adapter.normalizeTrip(trip).momentEntries, trip.momentEntries, '반복 정규화는 결과를 바꾸지 않는다');
});

test('capsules use the moment save boundary and no raw photo globals', () => {
  assert.doesNotMatch(companion, /quickCapsules|__capsulePhotoData|readAsDataURL|activePlanDayIndex|detectEmergencyCountryInfo/);
  assert.match(companion, /mediaRepository\.prepare\(file/);
  assert.match(companion, /kind: 'capsule-diary'/);
  assert.match(html, /job\.kind === 'capsule-diary'\) return applyCapsuleDiaryDraft\(job\)/);
  assert.match(html, /src="js\/destinations\/emergency-contacts\.js\?v=[^"]+" integrity=/);
  assert.match(sw, /'\.\/js\/destinations\/emergency-contacts\.js\?v=/);
});
