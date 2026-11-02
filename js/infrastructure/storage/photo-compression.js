/* 사진은 저장 용량을 줄이고, 문서·영수증은 확대할 때 글자를 읽을 수 있도록 보관한다. */
(function (root) {
  'use strict';
  const MAX_SOURCE_BYTES = 20 * 1024 * 1024, MAX_OUTPUT_PIXELS = 16000000, MAX_OUTPUT_EDGE = 16384;
  const PRESETS = Object.freeze({
    photo: Object.freeze({ maxDimension: 1280, targetBytes: 160 * 1024, qualities: Object.freeze([.78, .72, .68]) }),
    document: Object.freeze({ maxDimension: 2400, tallMaxDimension: 3200, minShortEdge: 1000, targetBytes: 180 * 1024, qualities: Object.freeze([.86, .82, .78, .75]) }),
    thumbnail: Object.freeze({ maxDimension: 320, targetBytes: 40 * 1024, qualities: Object.freeze([.70, .62]) })
  });
  const supportedSource = /^image\/(?:jpeg|png|webp)$/i;
  function failure(message, code, name = 'Error') {
    const error = new Error(message); error.code = code; error.name = name; return error;
  }
  function presetFor(preset) {
    if (!Object.prototype.hasOwnProperty.call(PRESETS, preset)) throw new TypeError('올바른 사진 압축 유형을 선택해 주세요.');
    return PRESETS[preset];
  }
  function dimensions(width, height, preset = 'photo', { maxDimension } = {}) {
    if (![width, height].every(value => Number.isFinite(value) && value > 0)) throw new TypeError('사진 크기를 확인하지 못했습니다.');
    const policy = presetFor(preset), long = Math.max(width, height), short = Math.min(width, height);
    const limit = Number.isFinite(maxDimension) && maxDimension > 0 ? Math.min(maxDimension, policy.maxDimension) : policy.maxDimension;
    let scale = Math.min(1, (preset === 'document' && long / short >= 3 && maxDimension === undefined ? policy.tallMaxDimension : limit) / long);
    // 긴 영수증은 장축 제한보다 글자 폭을 우선한다. 목표 용량 때문에 다시 축소하지 않는다.
    if (policy.minShortEdge) scale = Math.max(scale, Math.min(1, policy.minShortEdge / short));
    const size = { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
    if (Math.max(size.width, size.height) > MAX_OUTPUT_EDGE || size.width * size.height > MAX_OUTPUT_PIXELS) {
      throw failure('사진이 너무 길거나 큽니다. 영수증이나 문서를 나누어 다시 선택해 주세요.', 'PHOTO_DIMENSIONS_TOO_LARGE');
    }
    return size;
  }
  function shouldReplace(sourceBytes, candidateBytes, minSavings = .10) {
    return Number.isFinite(sourceBytes) && sourceBytes > 0 && Number.isFinite(candidateBytes) && candidateBytes > 0
      && Number.isFinite(minSavings) && minSavings >= 0 && minSavings < 1
      && candidateBytes < sourceBytes && candidateBytes <= sourceBytes * (1 - minSavings);
  }
  function createJob({ signal, timeoutMs = 20000 } = {}) {
    const waits = new Set(), cleanups = new Set(); let error = null, disposed = false;
    const cancel = reason => { if (error || disposed) return; error = reason; for (const reject of Array.from(waits)) reject(error); waits.clear(); };
    const abort = () => cancel(failure('사진 처리를 취소했습니다.', 'PHOTO_ABORTED', 'AbortError'));
    const duration = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 20000;
    const timer = root.setTimeout(() => cancel(failure('사진 처리 시간이 초과되었습니다. 다시 선택해 주세요.', 'PHOTO_TIMEOUT', 'TimeoutError')), duration);
    if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, { once: true });
    return {
      check() { if (error) throw error; },
      cleanup(callback) { cleanups.add(callback); return () => cleanups.delete(callback); },
      wait(executor) {
        return new Promise((resolve, reject) => {
          if (error) { reject(error); return; }
          let done = false;
          const finish = (callback, value) => { if (done) return; done = true; waits.delete(stop); callback(value); };
          const stop = reason => finish(reject, reason); waits.add(stop);
          try { executor(value => finish(resolve, value), stop); } catch (reason) { stop(reason); }
        });
      },
      dispose() {
        disposed = true; root.clearTimeout(timer); signal?.removeEventListener('abort', abort);
        for (const cleanup of cleanups) { try { cleanup(); } catch (_) {} }
        cleanups.clear(); waits.clear();
      }
    };
  }
  function render(image, size) {
    const canvas = root.document.createElement('canvas'); canvas.width = size.width; canvas.height = size.height;
    try {
      const context = canvas.getContext('2d');
      if (!context) throw failure('사진을 처리하지 못했습니다.', 'PHOTO_CANVAS_FAILED');
      context.fillStyle = '#ffffff'; context.fillRect(0, 0, size.width, size.height);
      context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
      context.drawImage(image, 0, 0, size.width, size.height);
      return canvas;
    } catch (error) { canvas.width = 0; canvas.height = 0; throw error; }
  }
  async function encode(canvas, policy, job) {
    let best = null;
    for (const quality of policy.qualities) {
      job.check();
      // WebP를 지원하지 않는 브라우저는 PNG를 돌려줄 수 있으므로 실제 MIME을 확인한다.
      const candidates = await Promise.all(['image/jpeg', 'image/webp'].map(type => job.wait(resolve => {
        try { canvas.toBlob(blob => resolve(blob?.type === type && blob.size > 0 ? { blob, quality } : null), type, quality); }
        catch (_) { resolve(null); }
      })));
      job.check();
      for (const candidate of candidates) if (candidate && (!best || candidate.blob.size < best.blob.size)) best = candidate;
      if (best && best.blob.size <= policy.targetBytes) break;
    }
    if (!best) throw failure('사진을 압축하지 못했습니다. JPEG 또는 PNG 사진으로 다시 선택해 주세요.', 'PHOTO_ENCODE_FAILED');
    return best;
  }
  function readDataUrl(blob, job) {
    return job.wait((resolve, reject) => {
      const reader = new root.FileReader();
      const removeCleanup = job.cleanup(() => { reader.onload = null; reader.onerror = null; reader.onabort = null; if (reader.readyState === 1) reader.abort(); });
      reader.onload = () => { removeCleanup(); typeof reader.result === 'string' ? resolve(reader.result) : reject(failure('사진을 읽지 못했습니다.', 'PHOTO_READ_FAILED')); };
      reader.onerror = reader.onabort = () => { removeCleanup(); reject(failure('사진을 읽지 못했습니다.', 'PHOTO_READ_FAILED')); };
      reader.readAsDataURL(blob);
    });
  }
  async function toDataUrl(blob, options = {}) {
    const job = createJob(options);
    try { job.check(); return await readDataUrl(blob, job); } finally { job.dispose(); }
  }
  async function compress(blob, options = {}) {
    const { preset = 'photo', existing = false, maxDimension } = options, policy = presetFor(preset);
    if (!(blob instanceof root.Blob) || !blob.size) throw failure('사진 파일을 선택해 주세요.', 'PHOTO_INVALID_TYPE');
    if (blob.size > MAX_SOURCE_BYTES) throw failure('사진 한 장은 20MB 이하로 선택해 주세요.', 'PHOTO_TOO_LARGE');
    if (blob.type && !blob.type.startsWith('image/')) throw failure('사진 파일을 선택해 주세요.', 'PHOTO_INVALID_TYPE');
    const job = createJob(options), canvases = []; let objectUrl, image;
    try {
      job.check(); objectUrl = root.URL.createObjectURL(blob); image = new root.Image();
      await job.wait((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(failure('사진을 읽지 못했습니다. JPEG 또는 PNG 사진으로 다시 선택해 주세요.', 'PHOTO_DECODE_FAILED'));
        image.src = objectUrl;
      });
      job.check();
      const sourceWidth = image.naturalWidth || image.width, sourceHeight = image.naturalHeight || image.height;
      let source = blob, quality = null, outputSize = { width: sourceWidth, height: sourceHeight };
      // 이미 목표 용량인 보관본은 다시 인코딩하지 않아 반복 최적화로 인한 화질 저하를 막는다.
      const keepExisting = existing && supportedSource.test(blob.type) && blob.size <= policy.targetBytes;
      if (!keepExisting) {
        const size = dimensions(sourceWidth, sourceHeight, preset, { maxDimension });
        const canvas = render(image, size); canvases.push(canvas);
        const candidate = await encode(canvas, policy, job);
        if (!supportedSource.test(blob.type) || shouldReplace(blob.size, candidate.blob.size, existing ? .10 : 0)) {
          source = candidate.blob; quality = candidate.quality; outputSize = size;
        }
      }
      job.check();
      const thumbnailSize = dimensions(sourceWidth, sourceHeight, 'thumbnail');
      const thumbnailCanvas = render(image, thumbnailSize); canvases.push(thumbnailCanvas);
      const thumbnail = (await encode(thumbnailCanvas, PRESETS.thumbnail, job)).blob;
      job.check();
      return {
        source, thumbnail, ...outputSize, thumbnailWidth: thumbnailSize.width, thumbnailHeight: thumbnailSize.height,
        bytes: source.size, sourceBytes: blob.size, thumbnailBytes: thumbnail.size, changed: source !== blob,
        savings: Math.max(0, 1 - source.size / blob.size), mimeType: source.type, quality, preset
      };
    } finally {
      job.dispose();
      if (image) { image.onload = null; image.onerror = null; image.src = ''; }
      if (objectUrl) root.URL.revokeObjectURL(objectUrl);
      canvases.forEach(canvas => { canvas.width = 0; canvas.height = 0; });
    }
  }
  function dataUrlBlob(value) {
    if (typeof value !== 'string') throw failure('기기에 보관된 사진만 최적화할 수 있습니다.', 'PHOTO_INVALID_DATA_URL');
    const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/i.exec(value);
    if (!match) throw failure('기기에 보관된 사진만 최적화할 수 있습니다.', 'PHOTO_INVALID_DATA_URL');
    const base64 = match[2].replace(/\s/g, '');
    if (base64.length > Math.ceil(MAX_SOURCE_BYTES / 3) * 4) throw failure('사진 한 장은 20MB 이하로 선택해 주세요.', 'PHOTO_TOO_LARGE');
    let binary;
    try { binary = root.atob(base64); } catch (_) { throw failure('사진을 읽지 못했습니다.', 'PHOTO_INVALID_DATA_URL'); }
    if (binary.length > MAX_SOURCE_BYTES) throw failure('사진 한 장은 20MB 이하로 선택해 주세요.', 'PHOTO_TOO_LARGE');
    return new root.Blob([Uint8Array.from(binary, character => character.charCodeAt(0))], { type: match[1].toLowerCase() });
  }
  async function compressDataUrl(value, options = {}) {
    const started = Date.now();
    const result = await compress(dataUrlBlob(value), { ...options, existing: options.existing !== false });
    const timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : 20000;
    if (Date.now() - started >= timeoutMs) throw failure('사진 처리 시간이 초과되었습니다. 다시 선택해 주세요.', 'PHOTO_TIMEOUT', 'TimeoutError');
    const job = createJob({ ...options, timeoutMs: timeoutMs - (Date.now() - started) });
    try {
      job.check();
      const dataUrl = result.changed ? await readDataUrl(result.source, job) : value;
      const thumbnailDataUrl = await readDataUrl(result.thumbnail, job);
      return { ...result, dataUrl, thumbnailDataUrl };
    } finally { job.dispose(); }
  }
  const api = Object.freeze({ PRESETS, MAX_SOURCE_BYTES, MAX_OUTPUT_PIXELS, MAX_OUTPUT_EDGE, dimensions, shouldReplace, compress, compressDataUrl, toDataUrl });
  root.SulsulTravel = root.SulsulTravel || {}; root.SulsulTravel.PhotoCompression = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
