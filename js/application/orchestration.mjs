/** UI/provider-independent job core. Jobs are in-memory; the app wires generation and apply adapters. */
export class Orchestrator {
  #jobs = new Map();
  #active = null;
  #generate;
  #validate;
  #applyDraft;
  #online;
  #timeoutMs;
  #maxAttempts;

  constructor({ generate, validate, applyDraft, online = () => true,
    timeoutMs = 30000, maxAttempts = 3 }) {
    if (![generate, validate, applyDraft, online].every(fn => typeof fn === 'function')) {
      throw new TypeError('Adapters must be functions');
    }
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 ||
        !Number.isInteger(maxAttempts) || maxAttempts < 1) {
      throw new TypeError('Invalid execution limits');
    }
    this.#generate = generate;
    this.#validate = validate;
    this.#applyDraft = applyDraft;
    this.#online = online;
    this.#timeoutMs = timeoutMs;
    this.#maxAttempts = maxAttempts;
  }

  #require(id) {
    const job = this.#jobs.get(id);
    if (!job) throw new Error('JOB_NOT_FOUND');
    return job;
  }

  get(id) { return structuredClone(this.#require(id)); }

  enqueue(request) {
    const { id, tripId, targetId, kind, baseRevision, input } = request;
    if (![id, tripId, targetId, kind].every(v => typeof v === 'string' && v.trim()) ||
        !Number.isInteger(baseRevision) || baseRevision < 0) {
      throw new TypeError('Invalid request identity or revision');
    }
    // Cloning also rejects non-serializable input before any state is written.
    const snapshot = structuredClone({ id, tripId, targetId, kind, baseRevision, input });
    const existing = this.#jobs.get(id);
    if (existing) {
      if (existing.tripId !== tripId || existing.targetId !== targetId ||
          existing.kind !== kind || existing.baseRevision !== baseRevision) {
        throw new Error('REQUEST_ID_CONFLICT');
      }
      // An ID represents the original input snapshot. Changed input needs a new ID.
      return this.get(id);
    }
    this.#jobs.set(id, { ...snapshot, state: 'queued', attempts: 0,
      draft: null, errorCode: null });
    return this.get(id);
  }

  async run(id) {
    const job = this.#require(id);
    if (!['queued', 'waiting_network', 'failed'].includes(job.state)) return this.get(id);
    if (this.#active) throw new Error('RUNNER_BUSY');
    if (job.attempts >= this.#maxAttempts) return this.get(id);
    if (!this.#online()) {
      job.state = 'waiting_network';
      return this.get(id);
    }
    job.state = 'running';
    job.errorCode = null;
    job.attempts += 1;
    const controller = new AbortController();
    const token = { id, controller };
    this.#active = token;
    let timer;
    let onAbort;
    const aborted = new Promise((_, reject) => {
      onAbort = () => reject(controller.signal.reason);
      controller.signal.addEventListener('abort', onAbort, { once: true });
      timer = setTimeout(() => controller.abort(new Error('TIMEOUT')), this.#timeoutMs);
    });
    try {
      const draft = await Promise.race([
        Promise.resolve().then(async () => {
          if (controller.signal.aborted) throw controller.signal.reason;
          const payload = await this.#generate(this.get(id), { signal: controller.signal });
          if (controller.signal.aborted) throw controller.signal.reason;
          if (await this.#validate(structuredClone(payload), this.get(id)) !== true) {
            throw new Error('INVALID_OUTPUT');
          }
          return structuredClone(payload);
        }),
        aborted
      ]);
      if (job.state === 'running') {
        job.draft = draft;
        job.state = 'awaiting_review';
      }
    } catch (error) {
      if (job.state === 'running') {
        job.state = 'failed';
        // Never persist raw provider errors, prompts, URLs, or credentials.
        const safeCode = error?.code || error?.message;
        const allowedCodes = ['TIMEOUT', 'INVALID_OUTPUT', 'GEMINI_KEY_MISSING',
          'INVALID_API_KEY', 'QUOTA_EXCEEDED', 'OFFLINE', 'ALL_AI_MODELS_FAILED',
          'ALL_VISION_MODELS_FAILED'];
        job.errorCode = allowedCodes.includes(safeCode) ? safeCode : 'GENERATION_FAILED';
      }
    } finally {
      clearTimeout(timer);
      controller.signal.removeEventListener('abort', onAbort);
      if (this.#active === token) this.#active = null;
    }
    return this.get(id);
  }

  cancel(id) {
    const job = this.#require(id);
    if (['queued', 'waiting_network', 'running', 'failed'].includes(job.state)) {
      job.state = 'cancelled';
      if (this.#active?.id === id) this.#active.controller.abort(new Error('CANCELLED'));
    }
    return this.get(id);
  }

  reject(id) {
    const job = this.#require(id);
    if (job.state === 'awaiting_review') job.state = 'rejected';
    return this.get(id);
  }

  forget(id) {
    const job = this.#require(id);
    if (!['applied', 'conflict', 'rejected', 'cancelled'].includes(job.state)) return false;
    this.#jobs.delete(id);
    return true;
  }

  async approve(id) {
    const job = this.#require(id);
    if (job.state !== 'awaiting_review') return this.get(id);
    // Claim before awaiting: double approval cannot call the repository twice.
    job.state = 'applying';
    try {
      const result = await this.#applyDraft(this.get(id));
      if (!['applied', 'conflict'].includes(result)) throw new Error('INVALID_APPLY_RESULT');
      job.state = result;
      job.errorCode = result === 'conflict' ? 'REVISION_CONFLICT' : null;
    } catch {
      job.state = 'awaiting_review';
      job.errorCode = 'APPLY_FAILED';
    }
    return this.get(id);
  }
}
