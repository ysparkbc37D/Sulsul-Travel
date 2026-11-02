/* 뒤로가기는 사진·편집창·상세·내 여행 순서로 복귀하며 마지막 화면에서 종료를 확인한다. */
(function(root){
  'use strict';
  let active=false,handling=false,departing=false,activated=false,refreshing=false,approvedExit=false,token='',exitTimer;
  const modalOrder=[];
  const marker='stAppNavigation';
  const isOpen=id=>{const element=document.getElementById(id);return !!element&&!element.classList.contains('sheet-closed');};
  function state(kind){
    const next={...(root.history.state||{})};
    for(const key of ['stActivitySheet','stMomentSheet','stCollaborationReview','stRoute','blockId'])delete next[key];
    return {...next,[marker]:{kind,token,activated}};
  }
  function arm(){
    root.history.pushState(state('guard'),'');
  }
  function start(){
    if(active)return true;
    clearTimeout(exitTimer);departing=false;approvedExit=false;
    const existing=root.history.state?.[marker];
    token=existing?.token||root.crypto?.randomUUID?.()||String(Date.now());
    activated=Boolean(existing?.activated);
    if(existing?.kind!=='guard'){
      root.history.replaceState(state('base'),'');
      arm();
    }
    active=true;
    return true;
  }
  function opened(id){
    const index=modalOrder.indexOf(id);if(index>=0)modalOrder.splice(index,1);
    modalOrder.push(id);
  }
  function closed(id){const index=modalOrder.indexOf(id);if(index>=0)modalOrder.splice(index,1);}
  function topModal(){
    const tracked=[...modalOrder].reverse().find(isOpen);
    return tracked||[...document.querySelectorAll('.sheet-container:not(.sheet-closed)')].pop()?.id;
  }
  function pendingTravelRecords(){
    if(typeof State==='undefined')return false;
    if(Object.values(State.journalPhotoDrafts||{}).some(draft=>draft?.photos?.length))return true;
    const adapter=root.SulsulTravel?.TripAdapter,saved=new Map();
    if(!adapter)return Object.keys(State.journalTextDrafts||{}).length>0;
    for(const trip of State.trips||[])for(let index=0;index<(trip.days||[]).length;index++)saved.set(adapter.journalDraftKey(trip,index),adapter.getJournalEntry(trip,index)?.text||'');
    for(const [key,text] of Object.entries(State.journalTextDrafts||{}))if(text!=null&&text!==(saved.get(key)||''))return true;
    const input=document.getElementById('journal-text-input');
    if(input?.dataset.tripId){
      const trip=(State.trips||[]).find(item=>item.id===input.dataset.tripId),index=trip?.days?.findIndex(day=>day.id===input.dataset.dayId);
      if(trip&&index>=0&&input.value!==(adapter.getJournalEntry(trip,index)?.text||''))return true;
    }
    return false;
  }
  function ensureExitModal(){
    let modal=document.getElementById('modal-app-exit');if(modal)return modal;
    modal=document.createElement('div');modal.id='modal-app-exit';modal.className='sheet-container sheet-closed';
    modal.innerHTML='<div class="sheet-scrim" onclick="SulsulTravel.MobileNavigation.cancelExit()"></div><section class="sheet-box activity-sheet" role="dialog" aria-modal="true" aria-labelledby="app-exit-title"><header class="activity-sheet-header"><h3 id="app-exit-title">앱을 종료할까요?</h3></header><div class="activity-sheet-body"><p id="app-exit-description">저장된 여행 기록은 이 기기에 남습니다.</p></div><footer class="activity-sheet-footer"><button type="button" class="companion-button" id="app-exit-cancel" onclick="SulsulTravel.MobileNavigation.cancelExit()">계속 사용</button><button type="button" class="companion-button companion-primary" id="app-exit-confirm" onclick="SulsulTravel.MobileNavigation.confirmExit()">앱 종료</button></footer></section>';
    document.body.append(modal);return modal;
  }
  function requestExit(){
    ensureExitModal();
    approvedExit=false;
    document.getElementById('app-exit-title').textContent='앱을 종료할까요?';
    document.getElementById('app-exit-description').textContent=pendingTravelRecords()?'아직 저장하지 않은 하루 기록·사진이 있습니다. 돌아가서 저장하거나 파일로 보관해 주세요. 종료하면 미저장 내용이 사라집니다.':'저장된 여행 기록은 이 기기에 남습니다.';
    document.getElementById('app-exit-confirm').hidden=false;
    document.getElementById('app-exit-confirm').style.display='';
    root.openModal('modal-app-exit');
    document.getElementById('app-exit-cancel').focus({preventScroll:true});
  }
  function cancelExit(){
    clearTimeout(exitTimer);
    approvedExit=false;
    if(!active)start();
    root.closeModal('modal-app-exit',true);
    refreshGuardFromInteraction();
    return true;
  }
  function unavailableExit(){
    if(document.visibilityState==='hidden')return;
    ensureExitModal();
    document.getElementById('app-exit-title').textContent='종료를 확인했습니다';
    document.getElementById('app-exit-description').textContent='이 브라우저는 앱에서 창을 직접 닫는 기능을 지원하지 않습니다. 휴대폰 뒤로가기 또는 브라우저의 탭 닫기로 종료해 주세요. 계속 사용하려면 아래 버튼을 누르세요.';
    document.getElementById('app-exit-confirm').hidden=true;
    document.getElementById('app-exit-confirm').style.display='none';
    root.openModal('modal-app-exit');
  }
  function confirmExit(){
    if(!active||departing)return false;
    root.closeModal('modal-app-exit',true);
    departing=true;approvedExit=true;
    // 가드에서 원래 문서로 한 단계 돌아간 뒤, 이전 문서나 시스템 종료를 허용한다.
    root.history.back();
    return true;
  }
  function closePhoto(top){
    for(const [modal,viewer,close] of [
      ['modal-expense','expense-photo-viewer','closeExpensePhotoViewer'],
      ['modal-activity-record','activity-record-viewer','closeActivityPhotoViewer'],
      ['modal-moment-record','moment-record-viewer','closeMomentPhotoViewer']
    ])if(modal===top&&isOpen(modal)&&document.getElementById(viewer)&&!document.getElementById(viewer).hidden){root[close]();return true;}
    return false;
  }
  async function goBack(){
    const modal=topModal();
    if(closePhoto(modal))return 'photo';
    if(modal){
      if(modal==='modal-expense'&&typeof ExpenseFormState!=='undefined'&&ExpenseFormState.saving){root.showToast('지출 저장을 마친 뒤 닫아 주세요.');return 'busy';}
      if(modal==='modal-travel-backup'){root.closeTravelBackupModal();return 'modal';}
      if(modal==='modal-replan-review'){root.rejectPendingReplan();return 'modal';}
      if(modal==='modal-ai-draft-review'){await root.rejectActiveAiDraft();return 'modal';}
      if(modal==='modal-moment-record')root.closeMomentJournal(false,{fromHistory:true});
      else root.closeModal(modal,false,{fromNavigation:true});
      return 'modal';
    }
    const detail=document.getElementById('plan-block-detail-page');
    if(detail&&!detail.classList.contains('hidden')){root.hidePlanBlockDetail();return 'detail';}
    if(typeof State!=='undefined'&&State.currentView==='workspace'){root.switchView('hub');return 'hub';}
    requestExit();return 'exit';
  }
  function refreshGuardFromInteraction(){
    if(!active||activated||refreshing||departing||handling||!root.navigator.userActivation?.isActive||root.history.state?.[marker]?.kind!=='guard')return;
    // 첫 터치 뒤 활성화된 상태로 같은 가드만 교체한다. 사용자 조작 전 히스토리를
    // 건너뛰는 모바일 브라우저 정책에 대비하며, 화면 복귀나 이력 증가는 일으키지 않는다.
    activated=true;refreshing=true;root.history.back();
  }
  function activateGuard(event){if(event.isTrusted&&!isOpen('modal-app-exit'))refreshGuardFromInteraction();}
  root.addEventListener('pointerdown',activateGuard,true);
  root.addEventListener('keydown',activateGuard,true);
  root.addEventListener('popstate',event=>{
    if(!active)return;
    event.stopImmediatePropagation();
    if(refreshing){refreshing=false;arm();return;}
    if(departing){
      active=false;departing=false;
      // 일반 브라우저 탭은 보안상 close()가 거절될 수 있다. 이 경우 가드를 다시 넣지 않는다.
      root.close();
      root.history.back();
      exitTimer=setTimeout(unavailableExit,600);
      return;
    }
    if(event.state?.[marker]?.kind==='guard')return;
    arm();
    if(handling)return;
    handling=true;
    Promise.resolve(goBack()).catch(error=>{console.warn('[뒤로가기]',error);root.showToast('이 화면에서 닫기 버튼을 눌러 주세요. 입력은 그대로 유지됩니다.');}).finally(()=>{handling=false;});
  },true);
  root.addEventListener('beforeunload',event=>{
    if(approvedExit)return;
    const expensePending=typeof ExpenseFormState!=='undefined'&&(ExpenseFormState.saving||isOpen('modal-expense')&&root.isModalFormDirty?.('modal-expense'));
    if(expensePending||pendingTravelRecords()){event.preventDefault();event.returnValue='';}
  });
  root.addEventListener('pagehide',()=>clearTimeout(exitTimer));
  root.addEventListener('pageshow',event=>{if(event.persisted&&!active)start();});
  root.SulsulTravel=root.SulsulTravel||{};
  root.SulsulTravel.MobileNavigation={get active(){return active;},start,opened,closed,goBack,requestExit,cancelExit,confirmExit,pendingTravelRecords};
})(window);
