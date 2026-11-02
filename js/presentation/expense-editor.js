/* 지출 편집은 기존 거래를 교체하며 저장 전 목록과 지갑을 변경하지 않는다. */
function expenseFormSnapshot() {
  return JSON.stringify({fields:['title','amount','curr','date','time','memo','payment-source'].map(k=>document.getElementById('exp-form-'+k)?.value || ''),payMethod:ExpenseFormState.payMethod,type:ExpenseFormState.type,cat:ExpenseFormState.selectedCat,photos:ExpenseFormState.photos,primary:ExpenseFormState.primaryPhotoIndex});
}
function expenseFeedback(message) { document.getElementById('expense-editor-feedback').textContent=message; }
function resetExpenseEditor() {
  ExpenseFormState.sessionId=crypto.randomUUID();ExpenseFormState.tripId=State.activeTripId;
  ExpenseFormState.edit=null;ExpenseFormState.photosLoading=false;ExpenseFormState.saving=false;ExpenseFormState.savePending=null;ExpenseFormState.baseline=null;
  document.getElementById('exp-form-submit-btn').disabled=false;
  document.getElementById('modal-expense').removeAttribute('aria-busy');
  const draft=document.getElementById('exp-draft-download-btn');if(draft)draft.hidden=true;
  document.getElementById('expense-photo-viewer').hidden=true;
  document.getElementById('receipt-scan-loading')?.classList.add('hidden');
  const quality=document.getElementById('exp-photo-quality');if(quality)quality.value='photo';
  expenseFeedback('');
}
function expenseEditIndex(trip) {
  const edit=ExpenseFormState.edit;if(!edit)return -1;
  const expenses=trip?.expenses || [];
  if(edit.id){const indexes=expenses.map((e,i)=>e.id===edit.id?i:-1).filter(i=>i>=0);return indexes.length===1?indexes[0]:-1;}
  const indexes=expenses.map((e,i)=>JSON.stringify(e)===edit.snapshot?i:-1).filter(i=>i>=0);
  return indexes.length===1?indexes[0]:-1;
}
function expensePreviewTrip() {
  const trip=State.trips.find(t=>t.id===ExpenseFormState.tripId) || getActiveTrip();
  if(!trip)return trip;
  // 지갑 계산은 일부 구 내역을 보충한다. 계산용 객체만 분리하고 큰 사진 문자열은 복제하지 않는다.
  const copy={...trip,expenses:(trip.expenses||[]).map(expense=>({...expense}))},index=expenseEditIndex(trip);
  if(index>=0)copy.expenses.splice(index,1);
  return copy;
}
function expensePreviewKrw(curr,amount) {
  const trip=State.trips.find(t=>t.id===ExpenseFormState.tripId),index=expenseEditIndex(trip),original=index>=0?trip.expenses[index]:null;
  return original && original.curr===curr && Number(original.amount)===amount && Number.isFinite(original.krw)?original.krw:Math.round(amount*getCurrencyRate(curr));
}
function openEditExpenseModal(index,event) {
  event?.stopPropagation();
  const trip=getActiveTrip(),expense=trip?.expenses?.[index];if(!expense)return;
  const original=JSON.parse(JSON.stringify(expense));openAddExpenseModal();
  ExpenseFormState.edit={id:original.id,snapshot:JSON.stringify(original)};
  ExpenseFormState.photos=[...(original.photos || [])];ExpenseFormState.primaryPhotoIndex=original.primaryPhotoIndex || 0;
  for(const field of ['title','amount','date','time','memo'])document.getElementById('exp-form-'+field).value=original[field] ?? '';
  renderExpenseCurrencyChips(original.curr || 'KRW');
  setExpensePayMethod(original.payMethod || 'card');setExpenseTransType(original.type || 'expense');
  ExpenseFormState.selectedCat=original.cat || 'meal';renderExpenseCategoryGrid();
  const source=original.paymentSource || (original.walletCurr==='KRW'?'wallet_krw':'wallet_curr');
  const select=document.getElementById('exp-form-payment-source');
  if(![...select.options].some(o=>o.value===source)){const option=new Option('기존 결제수단 ('+source+')',source);select.add(option);}
  select.value=source;onExpensePaymentSourceChange();
  updateExpensePaymentSourceOptions();select.value=source;onExpensePaymentSourceChange();
  // 기존 수단은 UI에도 선택 표시한다.
  renderExpensePaymentSourceCards([...select.options].map(o=>({value:o.value,title:o.text,icon:'',sub:'결제수단'})),source);
  switchExpenseModalMode('detailed');renderExpensePhotos();updateExpenseInlineKrwPreview();
  document.getElementById('exp-modal-heading').textContent='지출·수입 기록 편집';
  document.getElementById('exp-form-submit-btn').textContent='수정 저장';
  ExpenseFormState.baseline=expenseFormSnapshot();expenseFeedback('수정 저장을 눌러야 지출 내역과 지갑 잔액에 반영됩니다.');
}
async function uploadExpensePhotos(event) {
  const files=Array.from(event.target.files || []);event.target.value='';
  if(!files.length || ExpenseFormState.photosLoading || ExpenseFormState.saving)return;
  if(ExpenseFormState.photos.length+files.length>8){expenseFeedback('사진은 한 내역에 최대 8장까지 첨부할 수 있습니다.');return;}
  const session=ExpenseFormState.sessionId,preset=document.getElementById('exp-photo-quality')?.value||'photo';ExpenseFormState.photosLoading=true;document.getElementById('exp-form-submit-btn').disabled=true;expenseFeedback('사진을 준비하고 있습니다…');
  try{
    let added=0;const failures=[];
    for(let index=0;index<files.length;index++){
      if(session!==ExpenseFormState.sessionId)return;
      expenseFeedback(`사진 ${index+1}/${files.length} 준비 중…`);
      // 여러 고화질 사진을 한 번에 디코딩하지 않고, 화면 표시 기회를 준 뒤 순차 처리한다.
      await new Promise(resolve=>setTimeout(resolve,0));
      try{
        const photo=await compressExpensePhoto(files[index],{preset});
        if(session!==ExpenseFormState.sessionId)return;
        ExpenseFormState.photos.push(photo);added++;renderExpensePhotos();
      }catch(error){failures.push(error.message||'사진을 처리하지 못했습니다.');}
    }
    if(session!==ExpenseFormState.sessionId)return;
    expenseFeedback(failures.length?`${added}장 준비 · ${failures.length}장 실패. ${failures[0]} 준비된 사진은 남아 있으니 확인 후 저장하세요.`:'사진을 첨부했습니다. 저장을 눌러 보관하세요.');
  }catch(error){if(session===ExpenseFormState.sessionId)expenseFeedback(error.message||'사진을 준비하지 못했습니다. 다시 선택해 주세요.');}
  finally{if(session===ExpenseFormState.sessionId){ExpenseFormState.photosLoading=false;document.getElementById('exp-form-submit-btn').disabled=false;}}
}
async function compressExpensePhoto(file,{preset='photo'}={}) {
  const compression=SulsulTravel.PhotoCompression;
  const result=await compression.compress(file,{preset,timeoutMs:30000});
  return compression.toDataUrl(result.source);
}
function renderExpensePhotoEditor() {
  const list=document.getElementById('exp-photos-list');if(!list)return;
  list.innerHTML=ExpenseFormState.photos.map((src,index)=>`<div class="expense-photo-tile"><button onclick="viewExpensePhoto(${index})" aria-label="사진 ${index+1} 확대"><img src="${escapeHtml(SulsulTravel.TripTransfer.safePhoto(src))}" alt="첨부 사진 ${index+1}"></button><button class="expense-primary" onclick="setPrimaryExpensePhoto(${index})" aria-pressed="${index===ExpenseFormState.primaryPhotoIndex}">${index===ExpenseFormState.primaryPhotoIndex?'대표사진':'대표로 선택'}</button><button class="expense-remove-photo" onclick="removeExpensePhoto(${index},event)" aria-label="사진 ${index+1} 삭제"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button></div>`).join('')+`<button class="expense-photo-add" onclick="document.getElementById('exp-photo-file-input').click()"><i class="fa-solid fa-camera" aria-hidden="true"></i> 사진 추가</button>`;
}
function viewExpensePhoto(index) {const src=ExpenseFormState.photos[index];if(!src)return;const box=document.querySelector('#modal-expense .sheet-box');ExpenseFormState.photoReturnScroll=box.scrollTop;box.scrollTop=0;document.getElementById('expense-full-photo').src=SulsulTravel.TripTransfer.safePhoto(src);document.getElementById('expense-photo-viewer').hidden=false;}
function closeExpensePhotoViewer() {document.getElementById('expense-photo-viewer').hidden=true;document.querySelector('#modal-expense .sheet-box').scrollTop=ExpenseFormState.photoReturnScroll || 0;}
function deleteExpenseFormPhoto(index,event) {
  event?.stopPropagation();if(!confirm('이 사진을 첨부 목록에서 제외할까요? 저장하면 반영됩니다.'))return;
  ExpenseFormState.photos.splice(index,1);const old=ExpenseFormState.primaryPhotoIndex;
  ExpenseFormState.primaryPhotoIndex=index===old?0:Math.max(0,old-(index<old?1:0));
  document.getElementById('expense-photo-viewer').hidden=true;renderExpensePhotos();
}
function expenseChangeDraft() {
  const trip=State.trips.find(t=>t.id===ExpenseFormState.tripId);
  if(!trip || trip.id!==State.activeTripId){expenseFeedback('여행이 변경되었습니다. 원래 여행에서 다시 열어 주세요.');return false;}
  const value=k=>document.getElementById('exp-form-'+k).value;
  const title=value('title').trim(),amount=Number(value('amount')),curr=value('curr');
  if(!title || !Number.isFinite(amount) || amount<=0){expenseFeedback('항목명과 0보다 큰 금액을 입력해 주세요.');return false;}
  const index=expenseEditIndex(trip),original=index>=0?trip.expenses[index]:null;
  if(ExpenseFormState.edit && (!original || JSON.stringify(original)!==ExpenseFormState.edit.snapshot)){expenseFeedback('내역이 다른 화면에서 변경되었거나 삭제되었습니다. 현재 입력을 확인하고 다시 열어 주세요.');return false;}
  const krw=expensePreviewKrw(curr,amount);
  if(!Number.isFinite(krw)){expenseFeedback('환율을 확인해 주세요.');return false;}
  const paymentSource=value('payment-source'),walletCurr=paymentSource==='none'?null:paymentSource==='wallet_krw'?'KRW':paymentSource==='wallet_curr'?curr:paymentSource.replace('wallet_','');
  const entry={...original,id:original?.id || 'exp_'+crypto.randomUUID(),title,amount,curr,krw,cat:ExpenseFormState.selectedCat,date:value('date'),time:value('time'),memo:value('memo').trim(),payMethod:ExpenseFormState.payMethod,type:ExpenseFormState.type,photos:[...ExpenseFormState.photos],primaryPhotoIndex:ExpenseFormState.primaryPhotoIndex || 0,paymentSource,walletCurr,updatedAt:new Date().toISOString()};
  if(original?.expensePhotoArchive&&JSON.stringify(original.photos)!==JSON.stringify(entry.photos))delete entry.expensePhotoArchive;
  const copy={...trip,expenses:[...(trip.expenses||[])]},next=State.trips.map(item=>item.id===trip.id?copy:item);
  if(original)copy.expenses[index]=entry;else copy.expenses.unshift(entry);
  copy.activeCurrencies=[...new Set([...(copy.activeCurrencies || ['KRW']),curr,...(walletCurr?[walletCurr]:[])])];
  return {trip,entry,original,next};
}

function saveExpenseRecord({fromQueue=false,prepared=null}={}) {
  if(!ExpenseFormState.sessionId)return false;
  if(ExpenseFormState.saving&&!fromQueue)return false;
  if(ExpenseFormState.photosLoading){expenseFeedback('사진 준비가 끝난 뒤 저장해 주세요.');return false;}
  const draft=prepared||expenseChangeDraft();if(!draft)return false;
  const {trip,original,next}=draft;
  if(trip.id!==State.activeTripId||trip.id!==ExpenseFormState.tripId){expenseFeedback('여행이 변경되었습니다. 원래 여행에서 다시 열어 주세요.');return false;}
  try{State.trips=TripRepository.saveAll(next,{bumpTripId:trip.id});}catch(error){
    const reason=['STORAGE_CONFLICT','REVISION_CONFLICT','READ_ONLY_TRIP'].includes(error?.code)?error.message:error?.name==='QuotaExceededError'?'기기의 앱 저장 공간이 부족합니다.':'기기 저장소에 쓰지 못했습니다. 브라우저의 저장소 권한과 여유 공간을 확인해 주세요.';
    expenseFeedback(`${reason} 입력과 사진은 이 창에 남아 있습니다. 초안 파일을 보관한 뒤 다시 시도할 수 있습니다.`);
    const draft=document.getElementById('exp-draft-download-btn');if(draft)draft.hidden=false;
    return false;
  }
  ExpenseFormState.saving=false;
  closeModal('modal-expense',true);
  // 저장 결과와 화면 갱신 결과를 분리한다. 숨은 전체 일정·평생 통계는 이 저장에서 다시 만들지 않는다.
  let refreshed=true;
  try{renderExpensesTab();}catch(error){refreshed=false;console.warn('[지출 저장 후 화면 갱신]',error);}
  showToast(refreshed?(original?'지출·수입 내역을 수정했습니다.':'지출·수입 내역을 저장했습니다.'):'내역은 저장했습니다. 지출 화면을 다시 열어 확인해 주세요.');return true;
}

async function requestExpenseSave() {
  if(ExpenseFormState.savePending)return false;
  if(ExpenseFormState.photosLoading){expenseFeedback('사진 준비가 끝난 뒤 저장해 주세요.');return false;}
  const session=ExpenseFormState.sessionId;if(!session)return false;
  const button=document.getElementById('exp-form-submit-btn'),modal=document.getElementById('modal-expense');
  ExpenseFormState.saving=true;ExpenseFormState.savePending=session;button.disabled=true;button.textContent='저장 중…';modal.setAttribute('aria-busy','true');expenseFeedback('사진과 내역을 기기에 저장하고 있습니다…');
  try{
    await new Promise(resolve=>{let done=false;const finish=()=>{if(!done){done=true;resolve();}};requestAnimationFrame(()=>setTimeout(finish,0));setTimeout(finish,100);});
    if(ExpenseFormState.sessionId!==session)return false;
    const draft=expenseChangeDraft();if(!draft)return false;
    const state=State.trips,revision=draft.trip.revision,snapshot=expenseFormSnapshot();
    let next=draft.next;
    const photoRepository=SulsulTravel.expensePhotoRepository;
    if(photoRepository){
      try{next=await photoRepository.prepare(next,{tripId:draft.trip.id});}
      catch(error){console.warn('[지출 사진 보관본 준비]',error?.message||error);}
    }
    if(ExpenseFormState.sessionId!==session)return false;
    if(State.activeTripId!==draft.trip.id||State.trips!==state||getActiveTrip()?.revision!==revision){expenseFeedback('저장 중 여행이 변경되었습니다. 입력과 사진은 유지되니 최신 여행을 확인한 뒤 다시 저장해 주세요.');return false;}
    if(expenseFormSnapshot()!==snapshot){expenseFeedback('저장 중 입력 내용이 변경되었습니다. 현재 입력과 사진을 확인한 뒤 다시 저장해 주세요.');return false;}
    return saveExpenseRecord({fromQueue:true,prepared:{...draft,next}});
  }catch(error){
    console.warn('[지출 저장 준비]',error?.message||error);
    if(ExpenseFormState.sessionId===session){expenseFeedback('저장 준비를 마치지 못했습니다. 입력과 사진은 유지됩니다. 초안 파일을 보관하거나 다시 저장해 주세요.');const draft=document.getElementById('exp-draft-download-btn');if(draft)draft.hidden=false;}
    return false;
  }finally{
    if(ExpenseFormState.sessionId===session){ExpenseFormState.saving=false;ExpenseFormState.savePending=null;button.disabled=false;button.textContent=ExpenseFormState.edit?'수정 저장':ExpenseFormState.type==='income'?'수입 저장':'지출 저장';modal.removeAttribute('aria-busy');}
  }
}

function downloadExpenseDraft() {
  if(!ExpenseFormState.sessionId)return false;
  if(ExpenseFormState.photosLoading){expenseFeedback('사진 준비가 끝난 뒤 초안 파일을 보관해 주세요.');return false;}
  try{
    const value=key=>document.getElementById('exp-form-'+key)?.value||'';
    const trip=State.trips.find(item=>item.id===ExpenseFormState.tripId);
    const payload={format:'sulsul-expense-draft',schemaVersion:1,exportedAt:new Date().toISOString(),trip:{id:ExpenseFormState.tripId,title:trip?.title||''},expense:{id:ExpenseFormState.edit?.id||null,title:value('title'),amount:value('amount'),curr:value('curr'),date:value('date'),time:value('time'),memo:value('memo'),paymentSource:value('payment-source'),payMethod:ExpenseFormState.payMethod,type:ExpenseFormState.type,cat:ExpenseFormState.selectedCat,photos:[...ExpenseFormState.photos],primaryPhotoIndex:ExpenseFormState.primaryPhotoIndex||0}};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=`sulsul-expense-draft-${new Date().toISOString().slice(0,10)}.json`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
    expenseFeedback('사진과 입력 내용을 담은 초안 파일을 준비했습니다. 다운로드 폴더에서 확인해 주세요. 기존 지출에는 아직 반영되지 않았습니다.');return true;
  }catch(_){expenseFeedback('초안 파일을 준비하지 못했습니다. 입력과 사진은 이 창에 유지됩니다.');return false;}
}
