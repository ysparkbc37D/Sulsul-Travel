/* 브라우저 검사가 쓰는 Playwright 모듈(PLAYWRIGHT_MODULE 또는 playwright). 모든 새 컨텍스트에 아래 검사용 다리를 넣는다.
 *
 * 저장 실패 주입 다리(v2.0.8):
 *   기존 검사는 Storage.prototype.setItem을 바꿔 'st_trips_v2' 쓰기에서 QuotaExceededError를 던지는 방식으로 '저장 실패'를 만들었다.
 *   여행 저장소가 IndexedDB(sulsul-travel-trips-v1)로 옮겨진 뒤에도 같은 주입이 같은 뜻이 되도록,
 *   여행 저장소의 meta 쓰기(모든 저장 거래에 한 번 있다) 직전에 지금의 setItem을 같은 키·같은 값으로 한 번 부른다.
 *   - 바뀐 setItem이 던지면 그 오류로 IndexedDB 저장 거래도 실패한다(앱은 저장 실패로 처리한다).
 *   - 던지지 않으면 기기 문서를 원래 값 그대로 두므로 아무것도 바뀌지 않는다(값이 없었으면 다시 지운다).
 *   검사 페이지에만 init script로 들어가며 앱 코드에는 없다. */
const playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

function tripStorageFailureBridge() {
  if (typeof IDBObjectStore === 'undefined' || IDBObjectStore.prototype.__tripStorageBridge) return;
  const put = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (...args) {
    let db = null;
    try { db = this.transaction && this.transaction.db && this.transaction.db.name; } catch (_) {}
    if (this.name === 'meta' && db === 'sulsul-travel-trips-v1') {
      const storage = window.localStorage, before = storage.getItem('st_trips_v2');
      Storage.prototype.setItem.call(storage, 'st_trips_v2', before === null ? '[]' : before);
      if (before === null) storage.removeItem('st_trips_v2');
    }
    return put.apply(this, args);
  };
  Object.defineProperty(IDBObjectStore.prototype, '__tripStorageBridge', {value: true});
}

/* 저장 대기 맞춤:
 *   기기 문서 저장소는 클릭 이벤트가 끝나기 전에(마이크로태스크 안에서) 저장을 마쳤다. 그래서 기존 검사는
 *   click() 직후 State나 저장 원문을 읽었다. IndexedDB 저장은 클릭이 끝난 뒤 몇 ms 걸린다.
 *   클릭·탭·키 입력·파일 선택 뒤에 앱의 저장 줄(TripRepository.idle())이 빌 때까지 기다려 같은 시점을 맞춘다.
 *   일부러 저장을 붙잡아 두는 검사가 멈추지 않도록 최대 2초만 기다린다. */
async function settleTripSaves(page) {
  try {
    await page.evaluate(() => typeof TripRepository !== 'undefined' && TripRepository && typeof TripRepository.idle === 'function'
      ? Promise.race([TripRepository.idle(), new Promise(resolve => setTimeout(resolve, 2000))]) : null);
  } catch (_) {}
}
const SETTLE_METHODS = ['click', 'tap', 'dblclick', 'press', 'check', 'uncheck', 'selectOption', 'setInputFiles'];
const patched = new WeakSet();
function patchActions(proto, pageOf) {
  if (!proto || patched.has(proto)) return;
  patched.add(proto);
  for (const name of SETTLE_METHODS) {
    const original = proto[name];
    if (typeof original !== 'function') continue;
    proto[name] = async function (...args) {
      const result = await original.apply(this, args);
      await settleTripSaves(pageOf(this));
      return result;
    };
  }
}
function preparePage(page) {
  patchActions(Object.getPrototypeOf(page), page => page);
  patchActions(Object.getPrototypeOf(page.locator('body')), locator => locator.page());
  return page;
}

function wrapContext(context) {
  const newPage = context.newPage.bind(context);
  context.newPage = async (...args) => preparePage(await newPage(...args));
  return context;
}

function wrapBrowser(browser) {
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (...args) => {
    const context = wrapContext(await newContext(...args));
    await context.addInitScript(tripStorageFailureBridge);
    return context;
  };
  const newPage = browser.newPage.bind(browser);
  browser.newPage = async (...args) => {
    const page = preparePage(await newPage(...args));
    await page.addInitScript(tripStorageFailureBridge);
    return page;
  };
  return browser;
}

function wrapType(type) {
  if (!type) return type;
  return new Proxy(type, {get(target, key) {
    if (key === 'launch') return async (...args) => wrapBrowser(await target.launch(...args));
    const value = target[key];
    return typeof value === 'function' ? value.bind(target) : value;
  }});
}

module.exports = {...playwright, chromium: wrapType(playwright.chromium), webkit: wrapType(playwright.webkit), devices: playwright.devices, tripStorageFailureBridge};
