/* 날짜별 여행 이야기의 공통 모델. 저장·DOM·AI 호출 없이 원문을 조립한다. */
(function (root) {
  'use strict';
  const CATEGORY_LABELS = Object.freeze({meal:'식비',transport:'교통',lodging:'숙박',tour:'관광/투어',shopping:'쇼핑',etc:'기타'});
  const CATEGORY_ALIASES = Object.freeze({food:'meal',meal:'meal',snack:'meal',drink:'meal',beverage:'meal',flight:'transport',transport:'transport',rental:'transport',lodging:'lodging',hotel:'lodging',stay:'lodging',tour:'tour',activity:'tour',shopping:'shopping',etc:'etc',other:'etc'});
  const text = value => typeof value === 'string' ? value : '';
  const firstText = (...values) => values.find(value => typeof value === 'string' && value.trim()) || '';
  const array = value => Array.isArray(value) ? value : [];
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  function dateOf(value) {
    const match = text(value).match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T|\s)/);
    if (!match) return null;
    const date = `${match[1]}-${match[2]}-${match[3]}`;
    const parsed = new Date(`${date}T00:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === date ? date : null;
  }
  function timeOf(value) {
    const match = text(value).match(/(?:^|T|\s)([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?/);
    return match ? `${match[1].padStart(2,'0')}:${match[2]}` : null;
  }
  function stamp(value) {
    return dateOf(value) && text(value).includes('T') && Number.isFinite(Date.parse(value)) ? value : null;
  }
  function safePhoto(value) {
    if (typeof value !== 'string') return '';
    if (/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=\s]+$/.test(value)) return value;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
    } catch (_) { return ''; }
  }
  function selectText(entry, mode = 'original') {
    const original = firstText(entry.originalText,entry.sourceText,entry.text);
    const accepted = !!(stamp(entry.aiDraftAcceptedAt) || stamp(entry.approvedAt) || entry.aiApproval?.status === 'approved');
    const approved = accepted ? firstText(entry.approvedText,entry.text,original) : original;
    return {text:mode === 'approved' ? approved : original,originalText:original,approvedText:accepted ? approved : null,textOrigin:mode === 'approved' && accepted ? 'approved' : 'original',approvedAt:stamp(entry.aiDraftAcceptedAt) || stamp(entry.approvedAt),accepted};
  }
  function photoList(entry, options, sourceId) {
    if (options.includePhotos === false) return [];
    const photos = array(entry.photos);
    const count = Math.max(photos.length,array(entry.mediaIds).length);
    const result = [];
    for (let index=0; index<count; index++) {
      const photo = photos[index];
      const resolved = typeof options.photoSource === 'function' ? options.photoSource(entry,index,{thumbnail:false}) : null;
      const source = safePhoto(resolved) || safePhoto(typeof photo === 'string' ? photo : firstText(photo?.original,photo?.source,photo?.dataUrl,photo?.url));
      if (source) result.push({id:`${sourceId}/photo:${index}`,src:source,index,caption:text(photo?.caption),alt:firstText(photo?.alt,`여행 기록 사진 ${index+1}`)});
    }
    return result;
  }
  function canonicalCategory(value) { return CATEGORY_ALIASES[String(value || '').toLowerCase()] || 'etc'; }
  function summarizeExpenses(trip = {}) {
    const categoryTotals = Object.fromEntries(Object.keys(CATEGORY_LABELS).map(key => [key,0]));
    const categoryCounts = Object.fromEntries(Object.keys(CATEGORY_LABELS).map(key => [key,0]));
    const records = [];
    let totalSpentKrw=0, incomeKrw=0, unconvertedCount=0;
    array(trip.expenses).forEach((entry,index) => {
      if (!entry || typeof entry !== 'object') return;
      const currency = firstText(entry.curr,entry.currency,'KRW');
      const amount = Number(entry.amount);
      const rawKrw = entry.krw == null || entry.krw === '' ? (currency === 'KRW' ? entry.amount : null) : entry.krw;
      const krw = rawKrw == null || rawKrw === '' || !Number.isFinite(Number(rawKrw)) ? null : Number(rawKrw);
      if (entry.type === 'income') { incomeKrw += krw || 0; return; }
      const category = canonicalCategory(entry.cat || entry.category);
      totalSpentKrw += krw || 0; categoryTotals[category] += krw || 0; categoryCounts[category] += 1;
      if (krw === null) unconvertedCount += 1;
      records.push({id:String(entry.id || `expense:${index}`),sourceId:`expense:${entry.id || index}`,date:dateOf(entry.date),time:timeOf(entry.time),title:firstText(entry.title,entry.name,'지출'),category,categoryLabel:CATEGORY_LABELS[category],currency,amount:Number.isFinite(amount) ? amount : null,krw});
    });
    const budget = Number.isFinite(Number(trip.budget)) ? Number(trip.budget) : 0;
    return {totalSpentKrw,incomeKrw,budget,remainingKrw:Math.max(0,budget-totalSpentKrw),overspendKrw:Math.max(0,totalSpentKrw-budget),categoryTotals,unconvertedCount,records,byCategory:Object.keys(CATEGORY_LABELS).map(key => ({key,label:CATEGORY_LABELS[key],totalKrw:categoryTotals[key],count:categoryCounts[key]}))};
  }
  function build(trip = {}, options = {}) {
    const selection = {textMode:options.textMode === 'approved' ? 'approved' : 'original',includePhotos:options.includePhotos !== false};
    const tripId = String(trip.id || 'trip');
    const days = array(trip.days).flatMap((day,index) => {
      if (!day || typeof day !== 'object') return [];
      const date = dateOf(day.date);
      const dayNum = Number(day.dayNum || day.day) || index+1;
      return [{id:String(day.dayId || day.id || `day:${tripId}:${date || dayNum}`),dayNum,date,dateLabel:firstText(day.date,'날짜 미상'),title:firstText(day.title,day.name,`Day ${dayNum}`),city:text(day.city),sourceIndex:index,itinerary:[],records:[],reflections:[],timeline:[]}];
    });
    const locations = [];
    const facts = [];
    const syntheticDays = new Map();
    function archivedDay(date) {
      const key = date || 'unknown';
      if (!syntheticDays.has(key)) {
        const day = {id:`archive:${tripId}:${key}`,dayNum:null,date,dateLabel:date || '날짜 미상',title:date ? '여행에서 남긴 기록' : '날짜를 확인하지 못한 기록',city:'',sourceIndex:days.length,itinerary:[],records:[],reflections:[],timeline:[]};
        syntheticDays.set(key,day); days.push(day);
      }
      return syntheticDays.get(key);
    }
    function findDay(entry, fallbackIndex) {
      const id = entry.dayId || entry.context?.dayId || entry.activityLink?.dayId;
      if (id != null) { const found = days.find(day => day.id === String(id)); if (found) return found; }
      const date = dateOf(entry.date) || dateOf(entry.context?.date) || dateOf(entry.occurredAt);
      if (date) return days.find(day => day.date === date) || archivedDay(date);
      const index = Number.isInteger(entry.dayIndex) ? entry.dayIndex : Number.isInteger(entry.activityLink?.dayIndex) ? entry.activityLink.dayIndex : fallbackIndex;
      if (Number.isInteger(index) && days.find(day => day.sourceIndex === index && day.dayNum !== null)) return days.find(day => day.sourceIndex === index && day.dayNum !== null);
      return archivedDay(null);
    }
    array(trip.days).forEach((day,index) => {
      const modelDay = days.find(item => item.sourceIndex === index && item.dayNum !== null);
      if (!day || !modelDay) return;
      array(day.spots).forEach((spot,spotIndex) => {
        if (!spot || typeof spot !== 'object') return;
        const spotId = String(spot.spotId || spot.id || `${modelDay.id}:spot:${spotIndex}`);
        const sourceId = `day:${modelDay.id}/spot:${spotId}`;
        const scheduledTime = timeOf(spot.time);
        const actualTime = timeOf(spot.completedAt || spot.visitedAt);
        const status = spot.skipped ? 'skipped' : spot.completed ? 'completed' : 'planned';
        const item = {kind:'itinerary',id:spotId,sourceId,dayId:modelDay.id,spotId,date:modelDay.date,title:firstText(spot.title,spot.name,'이름 없는 일정'),description:firstText(spot.desc,spot.description),status,statusLabel:{planned:'예정',completed:'방문 완료',skipped:'건너뜀'}[status],scheduledTime,time:actualTime || scheduledTime,timeSource:actualTime ? 'actual' : scheduledTime ? 'scheduled' : 'unknown',occurredAt:stamp(spot.completedAt || spot.visitedAt),createdAt:null,sortTime:actualTime || scheduledTime,order:spotIndex};
        modelDay.itinerary.push(item); modelDay.timeline.push(item);
        locations.push({day:modelDay,spot,spotIndex,spotId,item});
        facts.push({sourceId,sourceType:'itinerary',path:`days[${index}].spots[${spotIndex}]`,dayId:modelDay.id,spotId,date:modelDay.date,title:item.title,description:item.description,status,scheduledTime,occurredAt:item.occurredAt});
      });
    });
    function locate(entry,id) {
      const recordId = entry.activityLink?.recordId || entry.recordId || id;
      let found = locations.find(location => location.spot.recordId === recordId);
      if (found) return found;
      const spotId = entry.spotId || entry.activityId || entry.context?.spotId || entry.activityLink?.spotId;
      if (spotId) {
        const candidates = locations.filter(location => location.spotId === String(spotId));
        const dayId = entry.dayId || entry.context?.dayId || entry.activityLink?.dayId;
        found = dayId ? candidates.find(location => location.day.id === String(dayId)) : candidates.length === 1 ? candidates[0] : null;
        if (found) return found;
      }
      const title = firstText(entry.context?.title,entry.activityLink?.title);
      const date = dateOf(entry.context?.date) || dateOf(entry.activityLink?.date);
      const candidates = locations.filter(location => title && location.item.title === title && (!date || location.day.date === date));
      return candidates.length === 1 ? candidates[0] : null;
    }
    function addRecord(entry,id,kind,path,fallbackIndex) {
      if (!entry || typeof entry !== 'object') return;
      const location = kind === 'activity' || entry.activityLink || entry.spotId || entry.activityId ? locate(entry,id) : null;
      // 순간은 자신의 발생 날짜를 보존하고, 일정 기록은 현재 연결 일정을 따른다.
      const day = kind === 'activity' && location ? location.day : findDay(entry,fallbackIndex);
      const sourceId = `${kind}:${String(id)}`;
      const selected = selectText(entry,selection.textMode);
      const occurredAt = stamp(entry.occurredAt);
      const time = timeOf(entry.time) || timeOf(occurredAt);
      const scheduledTime = kind === 'activity' ? timeOf(location?.spot.time || entry.context?.time) : timeOf(entry.activityLink?.time);
      const title = kind === 'reflection' ? '하루 회고' : kind === 'activity' ? firstText(location?.item.title,entry.context?.title,entry.title,'일정의 기록') : firstText(entry.title,'순간 기록');
      const record = {kind,id:String(id),sourceId,dayId:day.id,spotId:location?.spotId || entry.spotId || entry.activityLink?.spotId || null,date:dateOf(entry.date) || day.date,title,...selected,time,scheduledTime,timeSource:time ? 'actual' : 'unknown',occurredAt,createdAt:stamp(entry.createdAt),updatedAt:stamp(entry.updatedAt),weather:text(entry.weather),mood:text(entry.mood),locationTitle:firstText(location?.item.title,entry.activityLink?.title,entry.context?.title),orphaned:kind === 'activity' && !location,photos:photoList(entry,options,sourceId),photoCount:Math.max(array(entry.photos).length,array(entry.mediaIds).length),sortTime:time || (kind === 'activity' ? scheduledTime : null),order:day.records.length+1000};
      if (kind === 'reflection') day.reflections.push(record);
      else { day.records.push(record); day.timeline.push(record); }
      facts.push({sourceId,sourceType:kind,path,dayId:day.id,spotId:record.spotId,date:record.date,title:record.title,text:record.originalText,approvedText:record.approvedText,approvedAt:record.approvedAt,time,scheduledTime,occurredAt,createdAt:record.createdAt,photoSourceIds:record.photos.map(photo => photo.id)});
    }
    Object.entries(trip.activityRecords || {}).forEach(([key,entry]) => addRecord(entry,entry?.id || key,'activity',`activityRecords[${JSON.stringify(key)}]`));
    array(trip.momentEntries).forEach((entry,index) => addRecord(entry,entry?.id || `moment:${index}`,'moment',`momentEntries[${index}]`));
    Object.entries(trip.journals || {}).forEach(([key,entry]) => {
      const fallback = /^\d+$/.test(key) ? Number(key) : undefined;
      const withDate = dateOf(key) && !entry?.date ? {...entry,date:key} : entry;
      addRecord(withDate,entry?.id || `journal:${key}`,'reflection',`journals[${JSON.stringify(key)}]`,fallback);
    });
    days.sort((a,b) => a.date && b.date ? a.date.localeCompare(b.date) || a.sourceIndex-b.sourceIndex : a.date ? -1 : b.date ? 1 : a.sourceIndex-b.sourceIndex);
    days.forEach(day => day.timeline.sort((a,b) => (a.sortTime || '99:99').localeCompare(b.sortTime || '99:99') || a.order-b.order));
    const records = days.flatMap(day => [...day.records,...day.reflections]);
    return {schemaVersion:1,tripId,selection,cover:{title:firstText(trip.title,trip.name,'여행 이야기'),subtitle:firstText(trip.subtitle,trip.style),emoji:text(trip.coverEmoji),startDate:dateOf(trip.startDate),endDate:dateOf(trip.endDate),countries:array(trip.countries).map(String),dayCount:array(trip.days).length},days,timeline:days.flatMap(day => [...day.timeline,...day.reflections]),expenses:summarizeExpenses(trip),stats:{recordCount:records.length,photoCount:records.reduce((sum,record) => sum+record.photoCount,0),includedPhotoCount:records.reduce((sum,record) => sum+record.photos.length,0)},manifest:{schemaVersion:1,tripId,facts,constraints:['예정 일정은 방문 사실로 쓰지 않는다.','출처에 없는 시각, 사건, 인물, 감정, 비용은 만들지 않는다.','작성 시각 미상은 미상으로 유지한다.','사진 출처 ID만으로 사진을 분석했다고 말하지 않는다.','AI 제안은 사용자 승인 후 적용한다.']}};
  }
  function dayLabel(day) { return [day.dayNum ? `Day ${day.dayNum}` : '',day.date || day.dateLabel,day.city].filter(Boolean).join(' · '); }
  function recordMeta(record) {
    return [record.time ? `기록 시각 ${record.time}` : '실제 기록 시각 미상',record.scheduledTime ? `연결 일정 ${record.scheduledTime}` : '',record.orphaned ? '일정 변경 전 기록' : '',record.textOrigin === 'approved' ? '사용자가 승인한 AI 문장' : '원문',record.weather,record.mood].filter(Boolean).join(' · ');
  }
  function recordHtml(record) {
    return `<article class="travel-story-entry travel-story-${record.kind}" data-source-id="${escapeHtml(record.sourceId)}"><h4>${escapeHtml(record.title)}</h4><p class="travel-story-meta">${escapeHtml(recordMeta(record))}</p>${record.text ? `<p class="travel-story-text">${escapeHtml(record.text)}</p>` : ''}${record.photos.length ? `<div class="travel-story-photos">${record.photos.map(photo => `<figure><img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.alt)}" loading="lazy" style="max-width:100%;width:100%;height:auto;object-fit:contain">${photo.caption ? `<figcaption>${escapeHtml(photo.caption)}</figcaption>` : ''}</figure>`).join('')}</div>` : ''}</article>`;
  }
  const PRINT_CSS = '.travel-story{overflow-wrap:anywhere;font-size:14px}.travel-story h2{font-size:20px;font-weight:800;margin:24px 0 10px}.travel-story h3{font-size:17px;font-weight:700;margin:10px 0}.travel-story h4{font-size:15px;font-weight:700;margin:12px 0 6px}.travel-story-text{white-space:pre-wrap;line-height:1.8;orphans:3;widows:3}.travel-story-photos{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:12px}.travel-story-photos figure{margin:0}.travel-story-photos img{height:auto;max-width:100%;object-fit:contain}.travel-story-entry{margin:14px 0}.travel-story-meta{font-size:.86em}.travel-story-expenses table{width:100%;border-collapse:collapse}.travel-story-expenses th,.travel-story-expenses td{padding:8px;text-align:left;border-bottom:1px solid #ccc}@media print{.travel-story{font-size:13px}.travel-story-day{break-before:page}.travel-story-day:first-of-type{break-before:auto}.travel-story-entry,.travel-story-text{break-inside:auto}.travel-story h2,.travel-story h3,.travel-story h4{break-after:avoid}.travel-story-photos figure{break-inside:avoid}.travel-story-photos img{max-height:130mm;width:auto!important;max-width:100%}.travel-story-expenses{break-before:page}.travel-story-controls{display:none!important}}';
  function renderHtml(model, options = {}) {
    const cover = options.includeCover !== false ? `<header class="travel-story-cover"><h1>${escapeHtml(model.cover.emoji)} ${escapeHtml(model.cover.title)}</h1>${model.cover.subtitle ? `<p>${escapeHtml(model.cover.subtitle)}</p>` : ''}<p>${escapeHtml([model.cover.startDate || '날짜 미정',model.cover.endDate || '날짜 미정'].join(' ~ '))}</p><p>${escapeHtml(model.cover.countries.join(' · '))}</p><p>기록 ${model.stats.recordCount}편 · 사진 ${model.stats.includedPhotoCount}장 · ${model.selection.textMode === 'approved' ? '승인문 우선' : '원문'}</p></header>` : '';
    const dates = model.days.map(day => `<section class="travel-story-day" data-day-id="${escapeHtml(day.id)}"><h2>${escapeHtml(dayLabel(day))}</h2><h3>${escapeHtml(day.title)}</h3><p class="travel-story-meta">예정과 실제 방문 · 순간 기록</p>${day.timeline.map(item => item.kind === 'itinerary' ? `<article class="travel-story-itinerary" data-source-id="${escapeHtml(item.sourceId)}"><h4><span>${escapeHtml(item.statusLabel)}</span> · ${escapeHtml(item.title)}</h4><p class="travel-story-meta">${escapeHtml([item.scheduledTime ? `예정 ${item.scheduledTime}` : '예정 시각 미정',item.timeSource === 'actual' ? `방문 시각 ${item.time}` : item.status === 'completed' ? '방문 시각 미상' : ''].filter(Boolean).join(' · '))}</p>${item.description ? `<p class="travel-story-text">${escapeHtml(item.description)}</p>` : ''}</article>` : recordHtml(item)).join('')}${day.reflections.map(recordHtml).join('')}${!day.timeline.length && !day.reflections.length ? '<p>이날 남긴 일정과 기록이 없습니다.</p>' : ''}</section>`).join('');
    const expense = model.expenses;
    const money = value => `₩${Number(value).toLocaleString('ko-KR')}`;
    const appendix = options.includeExpenses !== false ? `<section class="travel-story-expenses"><h2>지출 부록</h2><p>총 실지출 ${money(expense.totalSpentKrw)} · 예산 ${money(expense.budget)}</p><table><thead><tr><th scope="col">분류</th><th scope="col">원화 환산 합계</th></tr></thead><tbody>${expense.byCategory.map(category => `<tr><th scope="row">${category.label}</th><td>${money(category.totalKrw)}</td></tr>`).join('')}</tbody></table>${expense.unconvertedCount ? `<p>원화 환산액이 없는 지출 ${expense.unconvertedCount}건은 합계에 포함하지 않았습니다.</p>` : ''}${expense.records.length ? `<ul>${expense.records.map(record => `<li>${escapeHtml([record.date || '날짜 미상',record.categoryLabel,record.title,record.krw === null ? '원화 환산 미입력' : money(record.krw)].join(' · '))}</li>`).join('')}</ul>` : ''}</section>` : '';
    return `<section class="travel-story">${options.includeStyles === false ? '' : `<style>${PRINT_CSS}</style>`}${cover}${dates}${appendix}</section>`;
  }
  function markdownText(value) {
    return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/([\\`*_{}\[\]()#+.!|~-])/g,'\\$1');
  }
  function exportLines(model, markdown) {
    const out = [], fmt = markdown ? markdownText : value => String(value ?? '');
    const heading = (title,level) => out.push(`${markdown ? '#'.repeat(level)+' ' : ''}${fmt(title)}`,'');
    heading(model.cover.title,1);
    if (model.cover.subtitle) out.push(fmt(model.cover.subtitle),'');
    out.push(fmt(`${model.cover.startDate || '날짜 미정'} ~ ${model.cover.endDate || '날짜 미정'}`),fmt(model.cover.countries.join(' · ')),'');
    model.days.forEach(day => {
      heading(dayLabel(day),2);
      if (day.title) out.push(fmt(day.title),'');
      [...day.timeline,...day.reflections].forEach(item => {
        if (item.kind === 'itinerary') {
          out.push(`${markdown ? '- ' : ''}${fmt(`[${item.statusLabel}] ${item.scheduledTime ? '예정 '+item.scheduledTime : '예정 시각 미정'} · ${item.title}${item.timeSource === 'actual' ? ' · 방문 시각 '+item.time : item.status === 'completed' ? ' · 방문 시각 미상' : ''}`)}`);
          if (item.description) out.push(fmt(item.description));
          out.push('');
        } else {
          heading(item.title,3);out.push(fmt(recordMeta(item)),'');
          if (item.text) out.push(fmt(item.text),'');
          item.photos.forEach(photo => {
            // 데이터 URI도 내보내므로 원본 파일 하나로 글과 사진을 함께 보관한다.
            out.push(markdown ? `![${markdownText(photo.alt)}](<${photo.src}>)` : `[사진 ${photo.index+1}] ${photo.src}`);
            if (photo.caption) out.push(fmt(photo.caption));
            out.push('');
          });
        }
      });
    });
    heading('지출 부록',2);
    out.push(fmt(`총 실지출: ₩${model.expenses.totalSpentKrw.toLocaleString('ko-KR')}`),'');
    model.expenses.byCategory.forEach(category => out.push(`${markdown ? '- ' : ''}${fmt(`${category.label}: ₩${category.totalKrw.toLocaleString('ko-KR')}`)}`));
    if (model.expenses.unconvertedCount) out.push(fmt(`원화 환산 미입력 ${model.expenses.unconvertedCount}건 제외`));
    out.push('');
    model.expenses.records.forEach(record => out.push(`${markdown ? '- ' : ''}${fmt([record.date || '날짜 미상',record.categoryLabel,record.title,record.krw === null ? '원화 환산 미입력' : '₩'+record.krw.toLocaleString('ko-KR')].join(' · '))}`));
    return out.join('\n').trim()+'\n';
  }
  const api = {build,selectText,canonicalCategory,summarizeExpenses,safePhoto,escapeHtml,renderHtml,toMarkdown:model => exportLines(model,true),toText:model => exportLines(model,false),PRINT_CSS,CATEGORY_LABELS};
  root.SulsulTravel = root.SulsulTravel || {};
  root.SulsulTravel.TravelStory = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
