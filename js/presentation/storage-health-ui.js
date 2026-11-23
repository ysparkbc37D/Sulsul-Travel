/* 저장 공간과 백업 상태(v2.0.6). 설정 → 데이터에서 여행 자료 저장소(v2.0.8부터 IndexedDB), 사진 보관소, 영구 보관 여부, 마지막 백업을 보여 준다.
 * 화면 내용은 textContent로만 채운다. 개인 기록 내용은 읽지 않고 개수와 크기만 센다. */
(function (root) {
  'use strict';
  const LAST_BACKUP_KEY = 'st_last_backup_v1', REMINDER_KEY = 'st_backup_reminder_v1';
  // 대부분의 브라우저는 출처마다 localStorage 약 5MiB(문자 수)를 준다. 이 기기에서 잰 값이 아니라 안내용 기준이다.
  const LOCAL_LIMIT_CHARS = 5 * 1024 * 1024;
  const REMIND_AFTER_DAYS = 14, WARN_RATIO = 0.8;
  const read = key => { try { return root.localStorage.getItem(key); } catch (_) { return null; } };
  const write = (key, value) => { try { root.localStorage.setItem(key, value); return true; } catch (_) { return false; } };
  const mb = chars => `${(chars / 1024 / 1024).toFixed(2)}MB`;
  const bytes = value => value >= 1024 * 1024 * 1024 ? `${(value / 1024 / 1024 / 1024).toFixed(1)}GB` : `${(value / 1024 / 1024).toFixed(1)}MB`;

  function lastBackup() {
    try { const value = JSON.parse(read(LAST_BACKUP_KEY) || 'null'); return value && Number.isFinite(Date.parse(value.at)) ? value : null; } catch (_) { return null; }
  }
  // 파일 저장·휴대폰 공유·Gist 백업이 끝났을 때 부른다. 백업 파일 자체는 이 기기에 남기지 않는다.
  function markBackup(kind, now = new Date()) { return write(LAST_BACKUP_KEY, JSON.stringify({at: now.toISOString(), kind})); }
  function daysSince(at, now = new Date()) { return Math.floor((now.getTime() - Date.parse(at)) / 86400000); }
  function localUsage() {
    let doc = 0, all = 0;
    try {
      for (let i = 0; i < root.localStorage.length; i++) {
        const key = root.localStorage.key(i), value = root.localStorage.getItem(key) || '';
        all += key.length + value.length;
        if (key === 'st_trips_v2') doc = value.length;
      }
    } catch (_) {}
    return {doc, all};
  }
  // 여행 저장소(TripStore)의 종류와 크기. 셸의 전역 const라 이름으로 읽는다.
  async function tripStoreStats() {
    try { return typeof TripRepository !== 'undefined' && TripRepository ? await TripRepository.stats() : null; } catch (_) { return null; }
  }
  async function collect() {
    const storage = root.navigator?.storage;
    let estimate = null, persisted = null;
    try { estimate = storage?.estimate ? await storage.estimate() : null; } catch (_) {}
    try { persisted = storage?.persisted ? await storage.persisted() : null; } catch (_) {}
    // State는 셸 인라인 스크립트의 전역 const라 window 속성이 아니다. 이름으로 읽는다.
    const trips = typeof State !== 'undefined' && Array.isArray(State.trips) ? State.trips : [];
    const records = root.SulsulTravel?.TravelRecords;
    return {local: localUsage(), limit: LOCAL_LIMIT_CHARS, tripStore: await tripStoreStats(), estimate, persisted, lastBackup: lastBackup(),
      recordCount: records ? trips.reduce((sum, trip) => sum + records.summary(trip).count, 0) : 0,
      photos: root.SulsulTravel?.recordMediaStore?.stats(trips) || null,
      expenseMissing: root.SulsulTravel?.expensePhotoRepository?.missingReferences?.().length || 0};
  }
  function advice(health, now = new Date()) {
    const notes = [];
    // 여행 자료가 기기 문서(localStorage)에 있을 때만 문서 한도를 경고한다. IndexedDB에 있으면 브라우저 저장 공간 전체로 본다.
    const inDocument = !health.tripStore || health.tripStore.kind !== 'indexedDB';
    const ratio = health.local.all / health.limit;
    const quotaRatio = health.estimate?.quota ? (health.estimate.usage || 0) / health.estimate.quota : 0;
    if (!inDocument && quotaRatio >= WARN_RATIO) notes.push(`브라우저 저장 공간의 ${Math.round(quotaRatio * 100)}%를 쓰고 있습니다. JSON 백업을 받아 두고, 설정의 사진 용량 최적화를 확인해 주세요.`);
    if (inDocument && ratio >= WARN_RATIO) notes.push(`기기 문서 저장 공간의 ${Math.round(ratio * 100)}%를 쓰고 있습니다. JSON 백업을 받아 두고, 설정의 사진 용량 최적화를 확인해 주세요.`);
    if (health.photos?.missing) notes.push(`기록 사진 ${health.photos.missing}장의 보관본을 이 기기에서 찾지 못했습니다. 연결 정보는 그대로 두었습니다. 사진이 들어 있는 백업 파일이 있으면 복원해 주세요.`);
    if (health.recordCount && (!health.lastBackup || daysSince(health.lastBackup.at, now) >= REMIND_AFTER_DAYS)) notes.push(health.lastBackup ? `마지막 백업 뒤 ${daysSince(health.lastBackup.at, now)}일이 지났습니다. 브라우저 정리나 기기 교체에 대비해 JSON 백업을 받아 두세요.` : '아직 백업한 적이 없습니다. 브라우저 정리나 기기 교체에 대비해 JSON 백업을 받아 두세요.');
    if (health.persisted === false && health.recordCount) notes.push('브라우저가 공간이 부족할 때 이 앱의 자료를 지울 수 있는 상태입니다. 영구 보관을 요청할 수 있습니다(브라우저가 거절할 수 있습니다).');
    return notes;
  }
  function row(list, label, value) {
    const dt = document.createElement('dt'), dd = document.createElement('dd');
    dt.textContent = label; dd.textContent = value;
    list.append(dt, dd);
  }
  function render(health) {
    const list = document.getElementById('storage-health-list'), note = document.getElementById('storage-health-advice');
    if (!list || !note) return;
    list.replaceChildren();
    const store = health.tripStore;
    if (store?.kind === 'indexedDB') {
      row(list, '여행 자료', `브라우저 저장소(IndexedDB) · 여행 ${store.trips}개 · ${mb(store.chars)}${store.legacyChars ? ` · 이전 버전용 옛 문서 사본 ${mb(store.legacyChars)}(옮긴 뒤 30일 보관)` : ''}`);
    } else {
      row(list, '여행 문서', `기기 문서(localStorage) · ${mb(health.local.doc)} · 앱 전체 ${mb(health.local.all)} / 약 ${mb(health.limit)} (${Math.round(health.local.all / health.limit * 100)}%)`);
    }
    if (store?.legacySnapshots?.length) legacyRow(list, store.legacySnapshots);
    if (health.photos) row(list, '기록 사진', `${health.photos.total}장 · 사진 보관소 ${health.photos.stored}장 · 문서 안 ${health.photos.inline}장${health.photos.missing ? ` · 찾지 못함 ${health.photos.missing}장` : ''}`);
    row(list, '사진 보관소(브라우저)', health.estimate ? `${bytes(health.estimate.usage || 0)} 사용 / 약 ${bytes(health.estimate.quota || 0)}` : '이 브라우저에서 확인할 수 없음');
    row(list, '영구 보관', health.persisted === true ? '허용됨' : health.persisted === false ? '요청하지 않음 또는 거절됨' : '이 브라우저에서 확인할 수 없음');
    row(list, '마지막 백업', health.lastBackup ? `${new Date(health.lastBackup.at).toLocaleString('ko-KR')} (${daysSince(health.lastBackup.at)}일 전 · ${health.lastBackup.kind === 'gist' ? 'Gist' : health.lastBackup.kind === 'share' ? '휴대폰 공유' : '파일'})` : '기록 없음');
    const notes = advice(health);
    note.textContent = notes.length ? notes.join(' ') : '저장 공간과 백업 상태가 양호합니다.';
    const button = document.getElementById('storage-persist-btn');
    if (button) button.hidden = health.persisted === true || !root.navigator?.storage?.persist;
  }
  // 이전 버전 앱이 옮긴 뒤의 옛 문서에 남긴 변경. 전체 백업 형식으로 내려받아 복원 화면에서 비교할 수 있다.
  function legacyRow(list, ids) {
    const dt = document.createElement('dt'), dd = document.createElement('dd'), button = document.createElement('button');
    dt.textContent = '이전 버전 변경';
    dd.textContent = `${ids.length}건 따로 보관 `;
    button.type = 'button'; button.className = 'companion-button'; button.textContent = '내려받기';
    button.onclick = () => downloadLegacySnapshot(ids[ids.length - 1]);
    dd.append(button); list.append(dt, dd);
  }
  async function downloadLegacySnapshot(id) {
    try {
      const snapshot = await TripRepository.backend.getSnapshot(id);
      if (!snapshot?.raw) throw new Error('보관본을 찾지 못했습니다.');
      const trips = JSON.parse(snapshot.raw);
      const payload = {format: 'sulsul-backup', schemaVersion: 1, exportedAt: new Date().toISOString(), note: '이전 버전 앱이 기기 문서에 남긴 여행 자료', trips};
      root.downloadTravelFile?.(JSON.stringify(payload, null, 2), `sulsul-travel-previous-version-${String(snapshot.savedAt || '').slice(0, 10) || 'backup'}.json`);
      return true;
    } catch (error) { root.showToast?.(`이전 버전 자료를 내려받지 못했습니다. ${error.message || ''}`, 6000); return false; }
  }
  async function refresh() { const health = await collect(); render(health); return health; }
  async function requestPersist() {
    let granted = false;
    try { granted = !!(await root.navigator.storage.persist()); } catch (_) {}
    root.showToast?.(granted ? '이 기기의 브라우저가 여행 자료를 영구 보관하도록 허용했습니다.' : '브라우저가 영구 보관 요청을 받아들이지 않았습니다. 홈 화면에 앱을 추가하거나 백업을 자주 받아 두세요.', 6000);
    await refresh();
    return granted;
  }
  // 부팅 뒤 하루 한 번만 알린다. 기록이 없거나 이미 오늘 알렸으면 조용히 지나간다.
  async function remind(now = new Date()) {
    const today = now.toISOString().slice(0, 10);
    if (read(REMINDER_KEY) === today) return null;
    const health = await collect();
    const notes = advice(health, now).filter(note => !note.startsWith('브라우저가 공간이 부족할 때'));
    if (!notes.length) return null;
    write(REMINDER_KEY, today);
    root.showToast?.(notes[0], 8000);
    return notes[0];
  }
  root.SulsulTravel = root.SulsulTravel || {};
  root.SulsulTravel.StorageHealth = {collect, render, refresh, requestPersist, remind, markBackup, lastBackup, advice, downloadLegacySnapshot, LAST_BACKUP_KEY, REMINDER_KEY, LOCAL_LIMIT_CHARS};
  if (typeof module !== 'undefined' && module.exports) module.exports = root.SulsulTravel.StorageHealth;
})(typeof window !== 'undefined' ? window : globalThis);
