import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const script = readFileSync(new URL('../js/infrastructure/storage/photo-compression.js', import.meta.url), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const photo = (size = 1024 * 1024, type = 'image/jpeg') => new Blob([new Uint8Array(size)], { type });
function runtime({ width = 4032, height = 3024, decodeError = false, hangDecode = false, hangEncode = false, hangRead = false, unsupportedWebp = false, encodeBytes } = {}) {
  const urls = new Set(), revoked = [], drawings = [], encodings = [], canvases = [], readers = [];
  class Image {
    naturalWidth = width; naturalHeight = height;
    set src(value) {
      this.value = value;
      if (value && !hangDecode) queueMicrotask(() => decodeError ? this.onerror?.() : this.onload?.());
    }
    get src() { return this.value; }
  }
  class FileReader {
    constructor() { this.readyState = 0; this.aborted = false; readers.push(this); }
    abort() { this.aborted = true; this.readyState = 2; this.onabort?.(); }
    readAsDataURL(blob) {
      this.readyState = 1; if (hangRead) return;
      blob.arrayBuffer().then(buffer => { this.readyState = 2; this.result = `data:${blob.type};base64,${Buffer.from(buffer).toString('base64')}`; this.onload?.(); });
    }
  }
  const window = {
    Blob, Image, FileReader, atob, setTimeout, clearTimeout,
    URL: { createObjectURL() { const value = `blob:synthetic-${urls.size}`; urls.add(value); return value; }, revokeObjectURL(value) { revoked.push(value); urls.delete(value); } },
    document: { createElement(tag) {
      assert.equal(tag, 'canvas');
      const canvas = { width: 0, height: 0, getContext() {
        return { fillStyle: '', fillRect(...args) { drawings.push({ action: 'fill', color: this.fillStyle, args }); }, drawImage(...args) { drawings.push({ action: 'draw', args: args.slice(1) }); } };
      }, toBlob(callback, type, quality) {
        encodings.push({ width: this.width, height: this.height, type, quality });
        if (hangEncode) return;
        const bytes = encodeBytes ? encodeBytes(this.width, this.height, type, quality) : Math.ceil(this.width * this.height * (type === 'image/webp' ? .08 : .12));
        queueMicrotask(() => callback(new Blob([new Uint8Array(bytes)], { type: unsupportedWebp && type === 'image/webp' ? 'image/png' : type })));
      } };
      canvases.push(canvas); return canvas;
    } }
  };
  vm.runInNewContext(script, { window });
  return { api: window.SulsulTravel.PhotoCompression, urls, revoked, drawings, encodings, canvases, readers };
}

test('사진·썸네일은 종횡비를 유지하고 작은 원본을 확대하지 않는다', () => {
  const { api } = runtime();
  assert.deepEqual(plain(api.dimensions(4032, 3024)), { width: 1280, height: 960 });
  assert.deepEqual(plain(api.dimensions(3024, 4032)), { width: 960, height: 1280 });
  assert.deepEqual(plain(api.dimensions(120, 80)), { width: 120, height: 80 });
  assert.deepEqual(plain(api.dimensions(4032, 3024, 'thumbnail')), { width: 320, height: 240 });
  assert.throws(() => api.dimensions(0, 200));
  assert.throws(() => api.dimensions(Infinity, 200));
  assert.throws(() => api.dimensions(200, 200, 'unknown'));
});

test('긴 영수증의 글자 폭은 장축·목표 용량보다 우선하며 원본보다 커지지 않는다', () => {
  const { api } = runtime();
  assert.deepEqual(plain(api.dimensions(2400, 3400, 'document')), { width: 1694, height: 2400 });
  assert.deepEqual(plain(api.dimensions(1800, 9000, 'document')), { width: 1000, height: 5000 });
  assert.deepEqual(plain(api.dimensions(9000, 1800, 'document')), { width: 5000, height: 1000 });
  assert.deepEqual(plain(api.dimensions(600, 3000, 'document')), { width: 600, height: 3000 });
  assert.ok(api.PRESETS.document.qualities.every(quality => quality >= .75));
  assert.throws(() => api.dimensions(1000, 100000, 'document'), { code: 'PHOTO_DIMENSIONS_TOO_LARGE' });
  assert.throws(() => api.dimensions(4000, 65000, 'document'), { code: 'PHOTO_DIMENSIONS_TOO_LARGE' });
});

test('기존 보관본의 교체는 10% 이상 절감할 때만 허용한다', () => {
  const { api } = runtime();
  assert.equal(api.shouldReplace(100, 90), true);
  assert.equal(api.shouldReplace(100, 91), false);
  assert.equal(api.shouldReplace(100, 100, 0), false);
  assert.equal(api.shouldReplace(100, 0), false);
  assert.equal(api.shouldReplace(NaN, 80), false);
});

test('같은 크기에서 실제로 더 작은 WebP를 고르고 흰 배경·전체 이미지를 그린다', async () => {
  const { api, urls, revoked, drawings, canvases } = runtime();
  const result = await api.compress(photo());
  assert.equal(result.mimeType, 'image/webp');
  assert.equal(result.width, 1280); assert.equal(result.height, 960);
  assert.equal(result.thumbnailWidth, 320); assert.equal(result.thumbnailHeight, 240);
  assert.equal(result.sourceBytes, 1024 * 1024); assert.equal(result.bytes, result.source.size);
  assert.equal(result.changed, true); assert.ok(result.bytes < 160 * 1024); assert.ok(result.thumbnailBytes < 40 * 1024);
  assert.deepEqual(plain(drawings[0]), { action: 'fill', color: '#ffffff', args: [0, 0, 1280, 960] });
  assert.deepEqual(plain(drawings[1]), { action: 'draw', args: [0, 0, 1280, 960] });
  assert.equal(urls.size, 0); assert.equal(revoked.length, 1); assert.ok(canvases.every(canvas => canvas.width === 0 && canvas.height === 0));
});

test('WebP 미지원 브라우저의 PNG 대체본은 배제하고 JPEG를 사용한다', async () => {
  const { api } = runtime({ unsupportedWebp: true });
  assert.equal((await api.compress(photo())).mimeType, 'image/jpeg');
});

test('문서 목표 용량은 완화하고 압축률 하한·글자 해상도는 유지한다', async () => {
  const { api, encodings } = runtime({ width: 1800, height: 9000, encodeBytes: (width, height) => width > 320 ? 250 * 1024 : 10 * 1024 });
  const result = await api.compress(photo(), { preset: 'document' });
  assert.equal(result.width, 1000); assert.equal(result.height, 5000); assert.equal(result.bytes, 250 * 1024);
  assert.ok(encodings.filter(call => call.width > 320).every(call => call.width === 1000 && call.height === 5000 && call.quality >= .75));
});

test('작은 기존 JPEG는 바이트 그대로 유지하고 재압축을 반복하지 않는다', async () => {
  const { api, encodings } = runtime({ width: 600, height: 400 });
  const source = photo(20 * 1024), result = await api.compress(source, { existing: true });
  assert.equal(result.source, source); assert.equal(result.changed, false); assert.equal(result.savings, 0); assert.equal(result.quality, null);
  assert.equal(result.width, 600); assert.equal(result.height, 400);
  assert.ok(encodings.every(call => call.width <= 320));
  const dataUrl = `data:image/jpeg;base64,${Buffer.alloc(1000).toString('base64')}`;
  const fromDataUrl = await api.compressDataUrl(dataUrl);
  assert.equal(fromDataUrl.dataUrl, dataUrl); assert.equal(fromDataUrl.changed, false);
  assert.match(fromDataUrl.thumbnailDataUrl, /^data:image\/webp;base64,/);
});

test('새 사진의 용량 증가와 기존 사진의 작은 절감은 원본을 유지한다', async () => {
  const { api } = runtime({ encodeBytes: (width) => width > 320 ? 190 * 1024 : 1000 });
  const source = photo(200 * 1024), existing = await api.compress(source, { existing: true });
  assert.equal(existing.source, source); assert.equal(existing.width, 4032); assert.equal(existing.changed, false);
  const small = photo(1000), uploaded = await api.compress(small);
  assert.equal(uploaded.source, small); assert.equal(uploaded.changed, false);
});

test('캔버스 상한을 넘는 문서는 임의 축소하지 않고 기존 소용량 원본은 유지한다', async () => {
  const { api, urls, canvases } = runtime({ width: 1000, height: 100000 });
  await assert.rejects(api.compress(photo(), { preset: 'document' }), { code: 'PHOTO_DIMENSIONS_TOO_LARGE' });
  assert.equal(urls.size, 0); assert.equal(canvases.length, 0);
  const source = photo(20000), result = await api.compress(source, { preset: 'document', existing: true });
  assert.equal(result.source, source); assert.equal(result.height, 100000);
  assert.equal(result.changed, false); assert.equal(result.thumbnailHeight, 320);
});

test('20MB 경계·이미지 형식·원격 URL을 확인하고 네트워크 요청은 만들지 않는다', async () => {
  const { api, revoked } = runtime();
  await api.compress(photo(api.MAX_SOURCE_BYTES));
  await assert.rejects(api.compress(photo(api.MAX_SOURCE_BYTES + 1)), { code: 'PHOTO_TOO_LARGE' });
  await assert.rejects(api.compress(photo(10, 'text/plain')), { code: 'PHOTO_INVALID_TYPE' });
  await assert.rejects(api.compressDataUrl('https://example.com/photo.jpg'), { code: 'PHOTO_INVALID_DATA_URL' });
  assert.equal(revoked.length, 1);
});

test('잘못된 이미지·디코드 대기·인코딩 대기에서도 오류를 반환하고 URL을 해제한다', async () => {
  const broken = runtime({ decodeError: true });
  await assert.rejects(broken.api.compress(photo()), { code: 'PHOTO_DECODE_FAILED' });
  assert.equal(broken.urls.size, 0);
  for (const options of [{ hangDecode: true }, { hangEncode: true }]) {
    const pending = runtime(options);
    await assert.rejects(pending.api.compress(photo(), { timeoutMs: 10 }), { name: 'TimeoutError', code: 'PHOTO_TIMEOUT' });
    assert.equal(pending.urls.size, 0); assert.ok(pending.canvases.every(canvas => canvas.width === 0));
  }
});

test('취소한 작업은 진행하지 않고 처리 중 취소도 URL과 캔버스를 해제한다', async () => {
  const controller = new AbortController(); controller.abort();
  const cancelled = runtime();
  await assert.rejects(cancelled.api.compress(photo(), { signal: controller.signal }), { name: 'AbortError', code: 'PHOTO_ABORTED' });
  assert.equal(cancelled.revoked.length, 0);
  const active = new AbortController(), pending = runtime({ hangEncode: true });
  const promise = pending.api.compress(photo(), { signal: active.signal });
  setTimeout(() => active.abort(), 5);
  await assert.rejects(promise, { name: 'AbortError', code: 'PHOTO_ABORTED' });
  assert.equal(pending.urls.size, 0); assert.ok(pending.canvases.every(canvas => canvas.width === 0));
});

test('data URL 읽기 대기 중 시간 초과는 FileReader도 중단한다', async () => {
  const { api, readers } = runtime({ hangRead: true });
  await assert.rejects(api.toDataUrl(photo(), { timeoutMs: 10 }), { name: 'TimeoutError', code: 'PHOTO_TIMEOUT' });
  assert.equal(readers.length, 1); assert.equal(readers[0].aborted, true);
  assert.equal(readers[0].onload, null);
});
