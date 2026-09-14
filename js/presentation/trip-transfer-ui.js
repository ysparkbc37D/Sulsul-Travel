/* 여행 사본 공유. 실시간 공동편집은 후속 서비스로 분리한다. */
function tripShareOptions() {
  return {journals:!!document.getElementById('share-include-journals')?.checked,finances:!!document.getElementById('share-include-finances')?.checked};
}
function downloadTravelFile(content, name, type = 'application/json') {
  const blob = new Blob([content], {type});
  const href = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = href; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 30000);
}
function shareFeedback(message) {
  const el = document.getElementById('share-feedback');
  if (el) el.textContent = message;
  showToast(message, 5000);
}
function showTravelFileAlternative(message) {
  document.getElementById('modal-share-code-display').textContent = getActiveTrip()?.roomCode || '내 여행';
  openModal('modal-share-room');
  shareFeedback(message);
}
function buildTripShareUrl(tripId, options = {}) {
  const trip = State.trips.find(t => t.id === tripId);
  if (!trip) return null;
  const payload = SulsulTravel.TripTransfer.create(trip, options, APP_VER);
  const packed = LZString.compressToEncodedURIComponent(JSON.stringify(payload));
  return `${location.origin}${location.pathname}#share=${packed}`;
}
async function sendTripSnapshotFile() {
  const trip = getActiveTrip();
  if (!trip) return;
  try {
    const content = JSON.stringify(SulsulTravel.TripTransfer.create(trip, tripShareOptions(), APP_VER),null,2);
    if (new TextEncoder().encode(content).length > SulsulTravel.TripTransfer.MAX_BYTES) throw new Error('파일이 20MB를 넘습니다. 사진 포함을 해제하거나 전체 백업을 사용해 주세요.');
    const filename = `sulsul-trip-${new Date().toISOString().slice(0,10)}.json`;
    const file = new File([content],filename,{type:'application/json'});
    if (navigator.canShare?.({files:[file]})) {
      try { await navigator.share({files:[file],title:trip.title}); shareFeedback('공유 창으로 여행 사본을 전달했습니다.'); return; }
      catch (error) { if (error.name === 'AbortError') return; }
    }
    downloadTravelFile(content,filename);
    shareFeedback('여행 파일을 내려받았습니다. 동행자는 앱의 여행 파일 가져오기로 열 수 있습니다.');
  } catch (error) { shareFeedback(error.message); }
}
async function copyTravelSnapshotLink() {
  const trip = getActiveTrip(); if (!trip) return;
  if (location.protocol === 'file:' || /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname)) {
    showTravelFileAlternative('이 주소는 내 컴퓨터에서만 열립니다. 여행 파일을 보내거나 배포된 앱에서 링크를 만들어 주세요.'); return;
  }
  try {
    const url = buildTripShareUrl(trip.id,tripShareOptions());
    if (url.length > SulsulTravel.TripTransfer.MAX_LINK_LENGTH) {
      showTravelFileAlternative(`링크가 ${url.length.toLocaleString()}자로 길어 복사하지 않았습니다. 여행 파일 보내기를 사용해 주세요.`); return;
    }
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(url);
    else { prompt('여행 사본 링크를 복사하세요.',url); return; }
    shareFeedback('여행 사본 링크를 복사했습니다. 이후 수정은 서로 자동 반영되지 않습니다.');
  } catch (error) { shareFeedback('링크를 복사하지 못했습니다. 여행 파일 보내기를 사용해 주세요.'); }
}
function acceptTravelSnapshot(payload, {fromUrl = false} = {}) {
  const transfer = SulsulTravel.TripTransfer;
  const parsed = transfer.parse(JSON.stringify(payload));
  if (parsed.shareId && State.trips.some(t => t.importedShareId === parsed.shareId)) {
    shareFeedback('이미 가져온 여행 사본입니다. 내 여행에서 확인해 주세요.'); return false;
  }
  const incoming = parsed.trip;
  const allEntries = [...Object.values(incoming.journals || {}),...Object.values(incoming.activityRecords || {})];
  const photoCount = allEntries.reduce((sum,j)=>sum+(j.photos || []).length,0);
  if (!confirm(`여행 사본을 내 기기에 추가할까요?\n\n${incoming.title}\n${incoming.days.length}일 · 기록 ${allEntries.length}편 · 사진 ${photoCount}장 · 지출 ${(incoming.expenses || []).length}건\n\n기존 여행은 유지됩니다. 이후 동료의 수정은 자동 반영되지 않습니다.`)) return false;
  incoming.id = `trip_imp_${crypto.randomUUID()}`;
  incoming.title += ' (공유받음)';
  if (parsed.shareId) incoming.importedShareId = parsed.shareId;
  incoming.revision = 0;
  let next;
  try { next = TripRepository.saveAll([incoming,...State.trips],{bumpTripId:incoming.id}); }
  catch (_) { shareFeedback('저장하지 못했습니다. 기존 여행과 원본 링크는 유지됩니다. 공간 확보 후 다시 가져와 주세요.'); return false; }
  State.trips = next; State.activeTripId = incoming.id;
  if (fromUrl) history.replaceState(null,'',location.pathname+location.search);
  updateHubFilterDropdowns(); switchView('workspace');
  closeModal('modal-share-room',true);
  showToast('여행 사본을 이 기기에 저장했습니다.'); return true;
}
function importTravelSnapshotHash() {
  if (!location.hash.startsWith('#share=')) return;
  try {
    const packed = location.hash.slice(7);
    if (packed.length > 250000) throw new Error('링크가 너무 큽니다. 여행 파일로 전달받아 주세요.');
    let json = LZString.decompressFromEncodedURIComponent(packed);
    if (!json) { try { json = decodeURIComponent(escape(atob(decodeURIComponent(packed)))); } catch (_) {} }
    if (!json) throw new Error('링크가 잘렸거나 손상되었습니다. 여행 파일을 요청해 주세요.');
    return acceptTravelSnapshot(SulsulTravel.TripTransfer.parse(json),{fromUrl:true});
  } catch (error) { shareFeedback(error.message || '공유 링크를 읽지 못했습니다. 원본 링크를 다시 확인해 주세요.'); return false; }
}
async function importTravelSnapshotFile(event) {
  const file = event.target.files?.[0]; if (!file) return;
  try {
    if (file.size > SulsulTravel.TripTransfer.MAX_BYTES) throw new Error('20MB 이하의 여행 파일을 선택해 주세요.');
    acceptTravelSnapshot(SulsulTravel.TripTransfer.parse(await file.text()));
  } catch (error) { shareFeedback(error.message || '여행 파일을 확인해 주세요.'); }
  finally { event.target.value = ''; }
}
