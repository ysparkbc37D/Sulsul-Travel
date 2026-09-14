/* 지출 편집은 기존 거래를 교체하며 저장 전 목록과 지갑을 변경하지 않는다. */
function expenseFormSnapshot() {
  return JSON.stringify({fields:['title','amount','curr','date','time','memo','payment-source'].map(k=>document.getElementById('exp-form-'+k)?.value || ''),payMethod:ExpenseFormState.payMethod,type:ExpenseFormState.type,cat:ExpenseFormState.selectedCat,photos:ExpenseFormState.photos,primary:ExpenseFormState.primaryPhotoIndex});
}
function expenseFeedback(message) { document.getElementById('expense-editor-feedback').textContent=message; }
function resetExpenseEditor() {
  ExpenseFormState.sessionId=crypto.randomUUID();ExpenseFormState.tripId=State.activeTripId;
  ExpenseFormState.edit=null;ExpenseFormState.photosLoading=false;ExpenseFormState.baseline=null;
  document.getElementById('exp-form-submit-btn').disabled=false;
  document.getElementById('expense-photo-viewer').hidden=true;
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
  const copy=JSON.parse(JSON.stringify(trip)),index=expenseEditIndex(copy);
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
  if(!files.length || ExpenseFormState.photosLoading)return;
  if(ExpenseFormState.photos.length+files.length>8){expenseFeedback('사진은 한 내역에 최대 8장까지 첨부할 수 있습니다.');return;}
  const session=ExpenseFormState.sessionId;ExpenseFormState.photosLoading=true;document.getElementById('exp-form-submit-btn').disabled=true;expenseFeedback('사진을 준비하고 있습니다…');
  try{
    const photos=[];for(const file of files)photos.push(await compressExpensePhoto(file));
    if(session!==ExpenseFormState.sessionId)return;
    ExpenseFormState.photos.push(...photos);renderExpensePhotos();expenseFeedback('사진을 첨부했습니다. 저장을 눌러 보관하세요.');
  }catch(error){if(session===ExpenseFormState.sessionId)expenseFeedback(error.message);}
  finally{if(session===ExpenseFormState.sessionId){ExpenseFormState.photosLoading=false;document.getElementById('exp-form-submit-btn').disabled=false;}}
}
function compressExpensePhoto(file) {
  return new Promise((resolve,reject)=>{
    if(file.size>20*1024*1024){reject(new Error('사진 한 장은 20MB 이하로 선택해 주세요.'));return;}
    const url=URL.createObjectURL(file),img=new Image();
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('사진을 읽지 못했습니다. JPEG/PNG로 다시 선택해 주세요.'));};
    img.onload=()=>{try{const scale=Math.min(1,800/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL('image/jpeg',.8));}catch(_){reject(new Error('사진을 처리하지 못했습니다.'));}finally{URL.revokeObjectURL(url);}};img.src=url;
  });
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
function saveExpenseRecord() {
  if(!ExpenseFormState.sessionId)return false;
  if(ExpenseFormState.photosLoading){expenseFeedback('사진 준비가 끝난 뒤 저장해 주세요.');return false;}
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
  const next=JSON.parse(JSON.stringify(State.trips)),copy=next.find(t=>t.id===trip.id);copy.expenses=copy.expenses || [];
  if(original)copy.expenses[index]=entry;else copy.expenses.unshift(entry);
  copy.activeCurrencies=[...new Set([...(copy.activeCurrencies || ['KRW']),curr,...(walletCurr?[walletCurr]:[])])];
  try{State.trips=TripRepository.saveAll(next,{bumpTripId:trip.id});}catch(_){expenseFeedback('저장하지 못했습니다. 입력과 사진은 이 창에 남아 있습니다. 공간 확보 후 다시 저장해 주세요.');return false;}
  closeModal('modal-expense',true);renderActiveTripWorkspace();renderLifetimeAnalytics();showToast(original?'지출·수입 내역을 수정했습니다.':'지출·수입 내역을 저장했습니다.');return true;
}
