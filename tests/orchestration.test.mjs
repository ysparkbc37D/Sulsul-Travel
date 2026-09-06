import test from 'node:test';
import assert from 'node:assert/strict';
import { Orchestrator } from '../js/application/orchestration.mjs';

const request = (id = 'j1') => ({ id, tripId: 'trip-a', targetId: 'day-1',
  kind: 'journal', baseRevision: 1, input: { text: '호숫가 커피' } });
const make = (overrides = {}) => new Orchestrator({
  generate: async () => ({ text: '호숫가에서 커피를 마셨다.' }),
  validate: p => typeof p?.text === 'string' && p.text.length > 0,
  applyDraft: async () => 'applied', ...overrides
});
const deferred = () => {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  return { promise, resolve };
};

test('generation preserves captured input and requires explicit approval', async () => {
  let writes = 0;
  let received;
  const flow = make({ generate: async job => {
    received = job;
    return { text: job.input.text };
  }, applyDraft: async job => { writes++; assert.equal(job.tripId, 'trip-a'); return 'applied'; } });
  const input = request();
  flow.enqueue(input);
  input.tripId = 'trip-b'; input.input.text = 'changed';
  const output = await flow.run('j1');
  assert.equal(output.state, 'awaiting_review');
  assert.equal(received.input.text, '호숫가 커피');
  assert.equal(writes, 0);
  output.draft.text = 'tampered';
  assert.notEqual(flow.get('j1').draft.text, 'tampered');
  assert.equal((await flow.approve('j1')).state, 'applied');
  await flow.approve('j1');
  assert.equal(writes, 1);
});

test('duplicate enqueue/run calls invoke provider once', async () => {
  const pending = deferred();
  let calls = 0;
  const flow = make({ generate: () => { calls++; return pending.promise; } });
  flow.enqueue(request()); flow.enqueue(request());
  const first = flow.run('j1');
  await flow.run('j1');
  pending.resolve({ text: 'draft' }); await first;
  assert.equal(calls, 1);
  assert.throws(() => flow.enqueue({ ...request(), tripId: 'other' }), /REQUEST_ID_CONFLICT/);
});

test('offline waits without using attempts and resumes', async () => {
  let online = false;
  const flow = make({ online: () => online });
  flow.enqueue(request());
  assert.equal((await flow.run('j1')).state, 'waiting_network');
  assert.equal(flow.get('j1').attempts, 0);
  online = true;
  assert.equal((await flow.run('j1')).state, 'awaiting_review');
});

test('concurrency is bounded and queued work can be run later', async () => {
  const pending = deferred();
  const flow = make({ generate: () => pending.promise });
  flow.enqueue(request()); flow.enqueue(request('j2'));
  const first = flow.run('j1');
  await assert.rejects(flow.run('j2'), /RUNNER_BUSY/);
  assert.equal(flow.get('j2').attempts, 0);
  pending.resolve({ text: 'draft' }); await first;
  assert.equal((await flow.run('j2')).state, 'awaiting_review');
});

test('cancel settles even if provider ignores abort; late response is discarded', async () => {
  const pending = deferred();
  const entered = deferred();
  const flow = make({ generate: () => { entered.resolve(); return pending.promise; } });
  flow.enqueue(request());
  const running = flow.run('j1'); await entered.promise;
  flow.cancel('j1');
  assert.equal((await running).state, 'cancelled');
  pending.resolve({ text: 'late' });
  await new Promise(r => setImmediate(r));
  assert.equal(flow.get('j1').draft, null);
  assert.equal((await flow.approve('j1')).state, 'cancelled');
});

test('timeout frees runner and cannot produce a draft later', async () => {
  const pending = deferred();
  const flow = make({ generate: () => pending.promise, timeoutMs: 10 });
  flow.enqueue(request());
  assert.equal((await flow.run('j1')).errorCode, 'TIMEOUT');
  pending.resolve({ text: 'late' });
  await new Promise(r => setImmediate(r));
  assert.equal(flow.get('j1').draft, null);
  assert.equal((await flow.run('j1')).state, 'awaiting_review');
});

test('invalid output never reaches review and retry count is bounded', async () => {
  const flow = make({ generate: async () => ({ amount: 'fake' }), maxAttempts: 2 });
  flow.enqueue(request());
  assert.equal((await flow.run('j1')).errorCode, 'INVALID_OUTPUT');
  await flow.run('j1'); await flow.run('j1');
  assert.equal(flow.get('j1').attempts, 2);
  assert.equal((await flow.approve('j1')).state, 'failed');
});

test('changed revision produces conflict and preserves manual content', async () => {
  const target = { revision: 2, text: 'manually edited' };
  const flow = make({ applyDraft: async job => {
    if (target.revision !== job.baseRevision) return 'conflict';
    target.text = job.draft.text; return 'applied';
  } });
  flow.enqueue(request()); await flow.run('j1');
  assert.equal((await flow.approve('j1')).state, 'conflict');
  assert.equal(target.text, 'manually edited');
});

test('double approval is claimed before asynchronous persistence', async () => {
  let writes = 0;
  const pending = deferred();
  const flow = make({ applyDraft: () => { writes++; return pending.promise; } });
  flow.enqueue(request()); await flow.run('j1');
  const first = flow.approve('j1');
  assert.equal((await flow.approve('j1')).state, 'applying');
  pending.resolve('applied'); await first;
  assert.equal(writes, 1);
});

test('storage failure retains draft for review and retry', async () => {
  let fail = true;
  const flow = make({ applyDraft: async () => {
    if (fail) throw new Error('quota');
    return 'applied';
  } });
  flow.enqueue(request()); await flow.run('j1');
  const result = await flow.approve('j1');
  assert.equal(result.state, 'awaiting_review');
  assert.equal(result.errorCode, 'APPLY_FAILED');
  assert.ok(result.draft);
  fail = false;
  assert.equal((await flow.approve('j1')).state, 'applied');
});

test('rejected draft cannot be applied', async () => {
  const flow = make({ applyDraft: () => assert.fail('must not write') });
  flow.enqueue(request()); await flow.run('j1');
  flow.reject('j1');
  assert.equal((await flow.approve('j1')).state, 'rejected');
  assert.equal(flow.forget('j1'), true);
  assert.throws(() => flow.get('j1'), /JOB_NOT_FOUND/);
});

test('provider errors do not leak sensitive error text', async () => {
  const flow = make({ generate: () => { throw new Error('secret-key-and-private-text'); } });
  flow.enqueue(request());
  const result = await flow.run('j1');
  assert.equal(result.errorCode, 'GENERATION_FAILED');
  assert.ok(!JSON.stringify(result).includes('secret-key'));
});
