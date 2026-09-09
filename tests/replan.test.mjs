import test from 'node:test';
import assert from 'node:assert/strict';
import { createReplanProposal, protectedSpotsMatch, shiftTimeLabel, timeToMinutes } from '../js/domain/replan.mjs';

const days = [{ dayNum: 1, spots: [
  { time: '09:00', title: '완료', completed: true },
  { time: '11:00', title: '산책' },
  { time: '18:00', title: '체크인', fixed: true }
] }];

test('RePlan shifts only flexible spots and keeps completed/fixed spots', () => {
  const proposal = createReplanProposal({ days, offsetMinutes: 60, reason: '열차 지연' });
  assert.deepEqual(proposal.changes, [{ dayIndex: 0, spotIndex: 1, title: '산책', before: '11:00', after: '12:00' }]);
  assert.equal(proposal.proposedDays[0].spots.find(s => s.title === '완료').time, '09:00');
  assert.equal(proposal.proposedDays[0].spots.find(s => s.title === '체크인').time, '18:00');
  assert.equal(proposal.preservedCompletedCount, 1);
  assert.equal(proposal.preservedFixedCount, 1);
  assert.equal(protectedSpotsMatch(days, proposal.proposedDays), true);
});

test('protected spot validation rejects moved anchors', () => {
  const changed = structuredClone(days);
  changed[0].spots[2].time = '19:00';
  assert.equal(protectedSpotsMatch(days, changed), false);
});

test('day-scoped proposal leaves other days untouched', () => {
  const twoDays = [...structuredClone(days), { dayNum: 2, spots: [{ time: '10:00', title: '둘째 날' }] }];
  const proposal = createReplanProposal({ days: twoDays, targetDay: 1, offsetMinutes: 30 });
  assert.equal(proposal.proposedDays[0].spots[1].time, '11:00');
  assert.equal(proposal.proposedDays[1].spots[0].time, '10:30');
});

test('production time ranges shift both ends and single clocks show the next day', () => {
  assert.equal(shiftTimeLabel('08:00 - 11:00', 60), '09:00 - 12:00');
  assert.equal(shiftTimeLabel('21:00 ~', 90), '22:30 ~');
  assert.equal(shiftTimeLabel('23:30', 60), '+1일 00:30');
  assert.equal(timeToMinutes('+1일 00:30'), 1470);
});
