/* 파일 준비·저장·검토·적용을 구분한다. 취소와 실패는 기존 여행 문서를 유지한다. */
const TravelBackupUI={token:0,file:null,url:null,pending:null,busy:false};
function ensureTravelBackupModal(){
  let modal=document.getElementById('modal-travel-backup');if(modal)return modal;
  modal=document.createElement('div');modal.id='modal-travel-backup';modal.className='sheet-container sheet-closed';
  modal.innerHTML=`<div class="sheet-scrim" onclick="closeTravelBackupModal()"></div>
    <section class="sheet-box activity-sheet" role="dialog" aria-modal="true" aria-labelledby="backup-dialog-title">
      <header class="activity-sheet-header"><div><h3 id="backup-dialog-title">여행 백업·불러오기</h3><p>일정·지출·글·사진을 이 기기의 파일로 보관합니다.</p></div><button type="button" class="companion-button" onclick="closeTravelBackupModal()" aria-label="백업 창 닫기">닫기</button></header>
      <div class="activity-sheet-body">
        <section id="backup-create-panel" class="companion-context"><h4>백업 파일 만들기</h4><p id="backup-file-feedback" role="status" aria-live="polite">파일을 준비한 뒤 저장 버튼을 눌러 주세요.</p><p id="backup-file-summary"></p>
          <div class="demo-actions"><a id="backup-file-save" class="companion-button companion-primary" hidden onclick="travelBackupDownloadRequested()">파일 저장</a><button id="backup-file-share" type="button" class="companion-button" hidden onclick="sharePreparedTravelBackup()">휴대폰 저장·공유</button></div>
          <button type="button" class="companion-button" onclick="prepareTravelBackup()">백업 다시 만들기</button>
          <small>API 키·인증 정보는 포함하지 않습니다. 공유 버튼을 누르면 기기의 저장·공유 대상을 직접 선택합니다.</small>
        </section>
        <section id="backup-restore-panel" class="companion-context"><h4>백업 파일 불러오기</h4><button type="button" class="companion-button" onclick="openTravelBackupFilePicker()">JSON 파일 선택</button>
          <input id="backup-json-input" type="file" accept=".json,application/json,text/plain" hidden onchange="importDataFromJson(event)">
          <p id="backup-restore-feedback" role="status" aria-live="polite">전체 백업은 50MB 이하입니다. 먼저 내용을 확인하고 복원을 적용하세요.</p><div id="backup-restore-summary"></div>
          <button id="backup-restore-apply" type="button" class="companion-button companion-primary" disabled onclick="applyTravelBackupRestore()">확인한 백업으로 복원</button>
          <small>복원을 적용하면 현재 여행 목록이 교체됩니다. 필요한 여행은 먼저 백업하세요. 기기의 API 키와 설정은 유지됩니다.</small>
        </section>
      </div>
    </section>`;
  document.body.append(modal);return modal;
}
function closeTravelBackupModal(){
  if(TravelBackupUI.busy){travelBackupFeedback('backup-restore-feedback','복원 처리를 마치고 닫아 주세요.');return false;}
  ++TravelBackupUI.token;TravelBackupUI.pending=null;
  document.getElementById('backup-restore-apply').disabled=true;
  closeModal('modal-travel-backup',true);return true;
}
function travelBackupFeedback(id,message){ensureTravelBackupModal();document.getElementById(id).textContent=message;}
function openTravelBackupFilePicker(){
  ensureTravelBackupModal();
  if(TravelBackupUI.busy){travelBackupFeedback('backup-restore-feedback','복원 저장을 마칠 때까지 기다려 주세요.');return false;}
  const input=document.getElementById('backup-json-input');input.value='';input.click();return true;
}
function travelBackupDownloadRequested(){
  travelBackupFeedback('backup-file-feedback','파일 저장을 요청했습니다. 브라우저 다운로드 목록에서 파일을 확인해 주세요. 저장되지 않으면 휴대폰 저장·공유를 사용하세요.');
}
async function sharePreparedTravelBackup(){
  const file=TravelBackupUI.file;if(!file)return false;
  try{
    // 비동기 파일 준비가 끝난 후 별도 버튼 클릭에서 공유를 요청한다.
    if(!navigator.share||!navigator.canShare?.({files:[file]}))throw new Error('이 브라우저는 파일 공유를 지원하지 않습니다. 파일 저장을 눌러 주세요.');
    await navigator.share({files:[file],title:'술술트래블 전체 백업'});
    travelBackupFeedback('backup-file-feedback','기기의 저장·공유 창으로 백업을 전달했습니다. 선택한 위치에서 파일을 확인해 주세요.');return true;
  }catch(error){travelBackupFeedback('backup-file-feedback',error.name==='AbortError'?'저장·공유를 취소했습니다. 준비된 파일은 다시 저장할 수 있습니다.':error.message||'저장·공유 창을 열지 못했습니다. 파일 저장을 사용해 주세요.');return false;}
}
async function loadTravelBackupOverflow(){return typeof indexedDB==='undefined'?[]:JournalOverflowRepository.loadAll();}
async function hydrateTravelBackupPhotos(trips){
  const asDataUrl=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('보관 사진을 읽지 못했습니다.'));reader.readAsDataURL(blob);});
  for(const trip of trips)for(const record of SulsulTravel.TravelBackup.records(trip)){
    for(let i=0;i<(record.mediaIds||[]).length;i++){
      if(!record.mediaIds[i]||record.photos?.[i])continue;
      const media=await SulsulTravel.mediaRepository.get(record.mediaIds[i]);
      if(!media?.original||media.tripId!==trip.id)throw new Error('보관 사진 원본을 확인하지 못했습니다. 사진을 확인한 뒤 백업을 다시 만들어 주세요.');
      record.photos=record.photos||[];record.photos[i]=await asDataUrl(media.original);
      if(media.thumbnail){record.photoThumbnails=record.photoThumbnails||[];record.photoThumbnails[i]=await asDataUrl(media.thumbnail);}
    }
  }
  return trips;
}
function travelBackupSummaryText(trips){const s=SulsulTravel.TravelBackup.summary(trips);return `여행 ${s.trips}개 · 일정 ${s.days}일 · 글 ${s.records}편 · 사진 ${s.photos}장 · 지출 ${s.expenses}건`;}
async function prepareTravelBackup(){
  ensureTravelBackupModal().dataset.mode='backup';openModal('modal-travel-backup');
  const token=++TravelBackupUI.token;
  const save=document.getElementById('backup-file-save'),share=document.getElementById('backup-file-share');save.hidden=true;share.hidden=true;
  travelBackupFeedback('backup-file-feedback','글·사진과 보조 저장 기록을 모아 백업을 준비하고 있습니다…');document.getElementById('backup-file-summary').textContent='';
  try{
    if(State.storageRecovery)throw new Error('손상된 저장 문서를 정상 여행 백업으로 내보낼 수 없습니다. 기존 JSON 백업을 불러와 복구해 주세요. 손상 원문은 기기의 복구 보관본으로 유지됩니다.');
    const snapshot=JSON.parse(JSON.stringify(State.trips)),entries=await loadTravelBackupOverflow();
    const trips=await hydrateTravelBackupPhotos(SulsulTravel.TravelBackup.mergeOverflow(snapshot,entries));
    const result=SulsulTravel.TravelBackup.create(trips,[],APP_VER);
    if(token!==TravelBackupUI.token)return false;
    const stamp=new Date(),pad=n=>String(n).padStart(2,'0');
    const filename=`sulsul_travel_backup_v${APP_VER}_${stamp.getFullYear()}${pad(stamp.getMonth()+1)}${pad(stamp.getDate())}_${pad(stamp.getHours())}${pad(stamp.getMinutes())}${pad(stamp.getSeconds())}.json`;
    const file=new File([result.json],filename,{type:'application/json'}),url=URL.createObjectURL(file);
    if(TravelBackupUI.url)URL.revokeObjectURL(TravelBackupUI.url);
    TravelBackupUI.file=file;TravelBackupUI.url=url;save.href=url;save.download=filename;save.hidden=false;
    let canShare=false;try{canShare=!!(navigator.share&&navigator.canShare?.({files:[file]}));}catch(_){}
    share.hidden=!canShare;
    document.getElementById('backup-file-summary').textContent=`${filename}\n${travelBackupSummaryText(result.payload.trips)} · ${(file.size/1024/1024).toFixed(2)}MB`;
    travelBackupFeedback('backup-file-feedback','백업 파일이 준비됐습니다. 파일 저장을 눌러 보관하세요.');return true;
  }catch(error){if(token===TravelBackupUI.token){TravelBackupUI.file=null;travelBackupFeedback('backup-file-feedback',`백업을 준비하지 못했습니다. ${error.message||'다시 시도해 주세요.'}`);}return false;}
}
function readTravelBackupText(file){
  if(typeof file.text==='function')return file.text();
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('파일을 읽지 못했습니다. 기기에 저장된 JSON 파일을 다시 선택해 주세요.'));reader.readAsText(file);});
}
async function readTravelBackupFile(event){
  const input=event?.target,file=input?.files?.[0];if(!file)return false;
  ensureTravelBackupModal().dataset.mode='restore';openModal('modal-travel-backup');
  const token=++TravelBackupUI.token;TravelBackupUI.pending=null;document.getElementById('backup-restore-apply').disabled=true;document.getElementById('backup-restore-summary').replaceChildren();
  travelBackupFeedback('backup-restore-feedback','파일을 읽고 복원할 내용을 확인하고 있습니다…');
  try{
    if(file.size>SulsulTravel.TravelBackup.MAX_BYTES)throw new Error('전체 백업은 50MB 이하의 JSON 파일을 선택해 주세요.');
    const text=await readTravelBackupText(file);
    if(token!==TravelBackupUI.token)return false;
    let raw;try{raw=JSON.parse(text.replace(/^\uFEFF/,''));}catch(_){}
    if(raw?.trip){const applied=acceptTravelSnapshot(raw);if(applied)closeModal('modal-travel-backup',true);else travelBackupFeedback('backup-restore-feedback','여행 사본 가져오기를 취소했거나 적용하지 못했습니다. 기존 여행은 유지됩니다.');return applied;}
    const imported=SulsulTravel.TravelBackup.parse(text);
    TravelBackupUI.pending={imported,baseRaw:localStorage.getItem('st_trips_v2'),baseState:JSON.stringify(State.trips),filename:file.name};
    const summary=document.getElementById('backup-restore-summary'),count=document.createElement('p');count.textContent=travelBackupSummaryText(imported.trips);summary.append(count);
    for(const trip of imported.trips.slice(0,6)){const row=document.createElement('p');row.textContent=`${trip.title} · ${trip.days.length}일`;summary.append(row);}
    if(imported.trips.length>6){const more=document.createElement('p');more.textContent=`외 ${imported.trips.length-6}개 여행`;summary.append(more);}
    travelBackupFeedback('backup-restore-feedback',`${file.name||'백업 파일'}을 읽었습니다. 현재 여행 ${State.trips.length}개는 아직 바뀌지 않았습니다. 내용을 확인하고 복원을 적용하세요.`);
    document.getElementById('backup-restore-apply').disabled=false;return true;
  }catch(error){if(token===TravelBackupUI.token)travelBackupFeedback('backup-restore-feedback',`불러오지 못했습니다. 기존 여행은 유지됩니다. ${error.message||'파일을 확인해 주세요.'}`);return false;}
  finally{if(input)input.value='';}
}
async function applyTravelBackupRestore(){
  const pending=TravelBackupUI.pending;if(!pending||TravelBackupUI.busy)return false;
  const button=document.getElementById('backup-restore-apply');TravelBackupUI.busy=true;button.disabled=true;
  let committed=false;
  try{
    const overflow=await loadTravelBackupOverflow();
    if(localStorage.getItem('st_trips_v2')!==pending.baseRaw||JSON.stringify(State.trips)!==pending.baseState)throw new Error('검토 중 여행 내용이 변경됐습니다. 백업 파일을 다시 선택해 주세요.');
    if(!confirm(`백업의 여행 ${pending.imported.trips.length}개로 현재 여행 ${State.trips.length}개를 교체할까요?\n\n현재 여행의 글·사진·지출도 교체됩니다. 필요한 여행은 먼저 백업하세요. 취소하면 현재 여행이 유지됩니다.`)){travelBackupFeedback('backup-restore-feedback','복원을 취소했습니다. 기존 여행은 유지됩니다. 다시 적용하거나 다른 파일을 선택할 수 있습니다.');return false;}
    let recoveryRaw=null;
    if(pending.baseRaw!==null){
      let healthy=false;try{healthy=Array.isArray(JSON.parse(pending.baseRaw));}catch(_){}
      if(State.storageRecovery||!healthy){
        const key=State.storageRecovery?.backupKey||`st_trips_v2_corrupt_restore_${Date.now()}`;
        if(localStorage.getItem(key)!==pending.baseRaw)localStorage.setItem(key,pending.baseRaw);
        if(localStorage.getItem(key)!==pending.baseRaw)throw new Error('손상 원문을 보존하지 못해 복원을 중단했습니다.');
        recoveryRaw=pending.baseRaw;
      }
    }
    const replacement=pending.imported.trips.map(trip=>{
      const current=State.trips.find(item=>item.id===trip.id),old=overflow.filter(entry=>entry.tripId===trip.id).map(entry=>Number.isInteger(entry.revision)?entry.revision:0);
      return {...trip,revision:Math.max(trip.revision||0,current?.revision||0,...old)+1};
    });
    const next=TripRepository.saveAll(replacement,{approvedRecoveryRaw:recoveryRaw});
    committed=true;State.trips=next;State.activeTripId=next[0]?.id||null;State.storageRecovery=null;TravelBackupUI.pending=null;
    let cleaned=true;
    try{await JournalOverflowRepository.clearAll();}catch(_){cleaned=false;}
    try{await SulsulTravel.mediaRepository.prune(next);}catch(_){cleaned=false;}
    updateHubFilterDropdowns();switchView('hub');closeModal('modal-settings',true);
    document.getElementById('backup-restore-summary').textContent=travelBackupSummaryText(next);
    travelBackupFeedback('backup-restore-feedback',cleaned?'백업을 이 기기에 복원했습니다. 내 여행 목록에서 확인하세요.':'백업은 복원했습니다. 이전 보조 저장소 정리는 완료하지 못했지만 이전 일기가 복원 내용을 덮어쓰지 않도록 처리했습니다.');return true;
  }catch(error){travelBackupFeedback('backup-restore-feedback',committed?`백업 저장은 완료됐습니다. 화면 갱신을 마치지 못했습니다. 새로고침해 내 여행을 확인하세요. ${error.message||''}`:`복원하지 못했습니다. 기존 여행은 유지됩니다. ${error.name==='QuotaExceededError'?'기기 저장 공간이 부족합니다. 기존 자료를 백업하고 사진·여행을 정리한 뒤 다시 시도해 주세요.':error.message||'다시 시도해 주세요.'}`);return false;}
  finally{TravelBackupUI.busy=false;button.disabled=!TravelBackupUI.pending;}
}
