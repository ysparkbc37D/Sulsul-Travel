/* 현재 실행 계획의 수동 명령. 배열 순서를 보존하고 기록·사진은 변경 이력에 복제하지 않는다. */
(function (root) {
  'use strict';
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const editableFields = new Set(['title','name','time','cat','category','typeIcon','desc','description','memo','tip','cost','currency','curr','city','country','lat','lng','latitude','longitude','location','address','placeId','url','bookingUrl','durationMinutes','timeZone','timeConstraint','start','end','fixed','isDraft','isDateLine','replanNote']);
  const stateFields = ['skipped','cancelled','cancelReason','cancelledAt','removed','removedAt','deferred','deferredAt','replacesSpotId','replacedBySpotId'];
  const planFields = new Set([...editableFields, ...stateFields]);
  const updateFields = new Set([...editableFields,'skipped','cancelled','cancelReason','cancelledAt','completed']);
  const historyFields = new Set([...planFields,'completed']);
  const active = spot => !!spot && !spot.skipped && !spot.cancelled && !spot.removed && !spot.deferred;
  const clock = '(?:\\+(\\d+)일\\s*)?([01]\\d|2[0-3]):([0-5]\\d)';
  const annotation = '(?:\\s*\\([^<>\\r\\n]*\\))?';
  const timePattern = new RegExp('^' + clock + annotation + '(?:\\s*(?:~|～|–|—|-|→)\\s*' + clock + annotation + ')?$');
  let sequence = 0;

  function validTime(value, {allowEmpty = false} = {}) {
    if (typeof value !== 'string') return false;
    const label = value.trim();
    if (!label) return allowEmpty;
    const match = timePattern.exec(label);
    return !!match && [match[1], match[4]].every(day => day === undefined || Number.isSafeInteger(Number(day) * 1440));
  }

  function minutes(value) {
    if (!validTime(value)) return null;
    const match = timePattern.exec(value.trim());
    return Number(match[1] || 0) * 1440 + Number(match[2]) * 60 + Number(match[3]);
  }

  function makeId(prefix) {
    return prefix + '_' + (root.crypto?.randomUUID ? root.crypto.randomUUID() : Date.now().toString(36) + '_' + (++sequence).toString(36));
  }

  function timestamp(now) {
    const value = typeof now === 'function' ? now() : now;
    const date = value === undefined ? new Date() : new Date(value);
    if (!Number.isFinite(date.getTime())) throw new Error('변경 시각을 확인해 주세요.');
    return date.toISOString();
  }

  function projection(spot) {
    const result = {id:spot.id};
    for (const key of [...planFields].sort()) {
      if (own(spot, key) && spot[key] !== undefined && (spot[key] === null || ['string','number','boolean'].includes(typeof spot[key]))) result[key] = spot[key];
    }
    return result;
  }

  // 원문 대신 고정 길이 지문을 보관한다. 기록 ID나 실제 방문 상태의 추가는 계획 충돌이 아니다.
  function signature(spot, dayId) {
    let plan = projection(spot);
    const adapter = root.SulsulTravel?.TripAdapter || (typeof require === 'function' ? require('./trip-adapter.js') : null);
    // 저장·복원이 보충하는 기본 분류와 별칭은 사용자에 의한 후속 변경이 아니다.
    if (adapter) plan = projection(adapter.normalizeTrip({id:'plan-signature',title:'계획 비교',days:[{id:dayId,spots:[plan]}]}).days[0].spots[0]);
    const text = JSON.stringify([dayId, plan]);
    let a = 2166136261, b = 2246822519;
    for (let index = 0; index < text.length; index++) {
      a = Math.imul(a ^ text.charCodeAt(index), 16777619);
      b = Math.imul(b ^ text.charCodeAt(index), 3266489917);
    }
    return text.length + ':' + (a >>> 0).toString(36) + ':' + (b >>> 0).toString(36);
  }

  function validateShape(trip) {
    if (!object(trip) || !Array.isArray(trip.days)) throw new Error('편집할 여행이 없습니다.');
    const dayIds = new Set(), itemIds = new Set();
    for (const day of trip.days) {
      if (!object(day) || typeof day.id !== 'string' || !day.id || dayIds.has(day.id) || !Array.isArray(day.spots)) throw new Error('여행 날짜 ID를 확인해 주세요.');
      dayIds.add(day.id);
      for (const spot of day.spots) {
        if (!object(spot) || typeof spot.id !== 'string' || !spot.id || itemIds.has(spot.id)) throw new Error('중복되거나 없는 일정 ID를 확인해 주세요.');
        itemIds.add(spot.id);
      }
    }
    return {dayIds, itemIds};
  }

  // 백업에서 온 이력도 실행 가능한 역패치이므로 조회·적용 전에 계약을 확인한다.
  function validateMetadata(trip) {
    const fail = () => { throw new Error('일정 변경 이력 형식이 올바르지 않습니다. 원본 백업을 보관하고 정상 백업으로 복원해 주세요.'); };
    const id = value => typeof value === 'string' && !!value && !/[\s'"<>`\\;&]/.test(value);
    const integer = value => Number.isSafeInteger(value) && value >= 0;
    const date = value => typeof value === 'string' && !!value && Number.isFinite(new Date(value).getTime());
    const scalar = value => value === null || ['string','boolean'].includes(typeof value) || typeof value === 'number' && Number.isFinite(value);
    const keys = (value, allowed) => { if (!object(value) || Object.keys(value).some(key => !allowed.includes(key))) fail(); };
    const uniqueIds = values => { if (!Array.isArray(values) || values.some(value => !id(value)) || new Set(values).size !== values.length) fail(); };
    const fields = (value, allowed) => { if (!object(value) || Object.entries(value).some(([key,item]) => !allowed.has(key) || !scalar(item))) fail(); };
    const snapshot = (value, names) => {
      keys(value,['dayId','fields','position']);
      if (!id(value.dayId)) fail();
      fields(value.fields,historyFields);
      if (Object.keys(value.fields).some(key => !names.includes(key))) fail();
      if (value.position !== undefined) {
        const p = value.position;
        keys(p,['dayId','index','previousId','nextId']);
        if (p.dayId !== value.dayId || !integer(p.index) || !(p.previousId === null || id(p.previousId)) || !(p.nextId === null || id(p.nextId))) fail();
      }
    };
    if (!object(trip)) fail();
    if (trip.planRevision != null && !integer(trip.planRevision)) fail();
    if (trip.planBaseline != null) {
      const baseline = trip.planBaseline;
      keys(baseline,['source','capturedAt','planRevision','days']);
      if (baseline.source !== 'captured-current' || !date(baseline.capturedAt) || !integer(baseline.planRevision) || !Array.isArray(baseline.days)) fail();
      const dayIds = [], itemIds = [];
      for (const day of baseline.days) {
        keys(day,['id','spots','date','dayNum','title','city','planBlockId']);
        if (!id(day.id) || !Array.isArray(day.spots) || Object.entries(day).some(([key,value]) => !['id','spots'].includes(key) && !scalar(value))) fail();
        dayIds.push(day.id);
        for (const item of day.spots) {
          if (!object(item) || !id(item.id)) fail();
          const {id:itemId,...values} = item;
          fields(values,planFields);
          itemIds.push(itemId);
        }
      }
      uniqueIds(dayIds); uniqueIds(itemIds);
    }
    if (trip.planHistory != null) {
      if (!Array.isArray(trip.planHistory) || trip.planHistory.length > 30) fail();
      const eventIds = [];
      for (const event of trip.planHistory) {
        keys(event,['id','type','at','itemId','title','affectedDayIds','inverse','undoneBy','undoOf']);
        if (!id(event.id) || !id(event.itemId) || !['insert','update','move','remove','defer','restore','replace','batch','undo'].includes(event.type) || !date(event.at) || typeof event.title !== 'string' || !Array.isArray(event.inverse)) fail();
        if (event.undoneBy !== undefined && !id(event.undoneBy) || event.undoOf !== undefined && !id(event.undoOf)) fail();
        uniqueIds(event.affectedDayIds); eventIds.push(event.id);
        if (event.type === 'undo' ? event.inverse.length !== 0 || !id(event.undoOf) : !event.inverse.length) fail();
        const itemIds = [];
        for (const change of event.inverse) {
          keys(change,['itemId','fieldNames','before','after','afterSignature']);
          if (!id(change.itemId) || !Array.isArray(change.fieldNames) || new Set(change.fieldNames).size !== change.fieldNames.length || change.fieldNames.some(key => !historyFields.has(key)) || typeof change.afterSignature !== 'string' || !/^\d+:[a-z0-9]+:[a-z0-9]+$/.test(change.afterSignature)) fail();
          if (change.before !== null) snapshot(change.before,change.fieldNames);
          snapshot(change.after,change.fieldNames);
          itemIds.push(change.itemId);
        }
        uniqueIds(itemIds);
      }
      uniqueIds(eventIds);
    }
    return true;
  }

  function apply(trip, command, {now} = {}) {
    const ids = validateShape(trip);
    validateMetadata(trip);
    if (!object(command)) throw new Error('일정 변경 명령이 없습니다.');
    if (command.expectedPlanRevision !== undefined && command.expectedPlanRevision !== (trip.planRevision || 0)) throw new Error('계획이 변경되었습니다. 다시 확인해 주세요.');
    const at = timestamp(now), eventId = makeId('plan'), arrays = new Map(), changedDays = new Set();
    const list = dayId => {
      const day = trip.days.find(value => value.id === dayId);
      if (!day) throw new Error('선택한 여행 날짜가 변경되었습니다.');
      return arrays.get(dayId) || day.spots;
    };
    const writable = dayId => {
      if (!arrays.has(dayId)) arrays.set(dayId, list(dayId).slice());
      changedDays.add(dayId);
      return arrays.get(dayId);
    };
    const find = (itemId, dayId) => {
      for (const day of trip.days) {
        if (dayId && day.id !== dayId) continue;
        const index = list(day.id).findIndex(item => item.id === itemId);
        if (index >= 0) return {spot:list(day.id)[index], dayId:day.id, index};
      }
      throw new Error('변경할 일정이 이동되거나 없어졌습니다.');
    };
    const positionOf = location => {
      const items = list(location.dayId), visible = items.filter(item => !item.removed || item.id === location.spot.id);
      const index = visible.findIndex(item => item.id === location.spot.id);
      return {dayId:location.dayId,index:location.index,previousId:visible[index - 1]?.id || null,nextId:visible[index + 1]?.id || null};
    };
    const place = (dayId, spot, placement = {}) => {
      const items = writable(dayId), position = placement.position || 'end';
      let index;
      if (position === 'start') index = 0;
      else if (position === 'end') index = items.length;
      else if (position === 'before' || position === 'after') {
        index = items.findIndex(item => item.id === placement.anchorId);
        if (index < 0 || placement.anchorId === spot.id) throw new Error('삽입 기준 일정이 변경되었습니다.');
        if (position === 'after') index++;
      } else throw new Error('삽입 위치를 확인해 주세요.');
      items.splice(index, 0, spot);
    };
    const modify = (location, changes) => {
      const spot = {...location.spot};
      for (const [key, value] of Object.entries(changes)) {
        if (value === undefined) delete spot[key];
        else spot[key] = value;
      }
      writable(location.dayId)[location.index] = spot;
      return spot;
    };
    const validateFields = (changes, allowed = editableFields) => {
      if (!object(changes)) throw new Error('수정할 일정 내용을 확인해 주세요.');
      for (const [key, value] of Object.entries(changes)) {
        if (!allowed.has(key) || (value !== undefined && value !== null && !['string','number','boolean'].includes(typeof value)) || (typeof value === 'number' && !Number.isFinite(value))) throw new Error('계획 편집에서는 기록·사진·ID를 변경할 수 없습니다.');
      }
    };
    const validateItem = spot => {
      if (typeof spot.title !== 'string' || !spot.title.trim()) throw new Error('일정 활동명을 입력해 주세요.');
      if (!validTime(spot.time === undefined ? '' : spot.time, {allowEmpty:true})) throw new Error('시간 형식을 확인해 주세요.');
    };
    const validateUpdate = (spot, changes) => {
      validateFields(changes,updateFields);
      const result = {...spot,...changes};
      validateItem(result);
      if (result.completed && ((changes.skipped && !spot.skipped) || (changes.cancelled && !spot.cancelled))) throw new Error('완료한 일정은 완료 상태를 해제한 뒤 변경해 주세요.');
    };
    const newItem = source => {
      if (!object(source)) throw new Error('추가할 일정 내용을 확인해 주세요.');
      const fields = {...source};
      delete fields.id;
      if (fields.completed === false) delete fields.completed;
      validateFields(fields);
      const itemId = source.id === undefined ? makeId('spot') : source.id;
      if (typeof itemId !== 'string' || !itemId.trim() || ids.itemIds.has(itemId)) throw new Error('일정 ID가 중복되었습니다.');
      const spot = {...fields,id:itemId,title:fields.title?.trim(),time:fields.time === undefined ? '' : fields.time,completed:false};
      validateItem(spot);
      return spot;
    };
    const capture = (location, keys, moved = false) => {
      const fields = {};
      for (const key of keys) if (own(location.spot, key) && location.spot[key] !== undefined) fields[key] = location.spot[key];
      return {dayId:location.dayId,fields,...(moved ? {position:positionOf(location)} : {})};
    };
    const patch = (itemId, before, keys, moved = false) => {
      const location = find(itemId);
      return {itemId,fieldNames:keys,before,after:capture(location,keys,moved),afterSignature:signature(location.spot,location.dayId)};
    };
    let itemId = command.itemId, title = '', inverse = [], undoneEvent;

    if (command.type === 'undo') {
      const history = Array.isArray(trip.planHistory) ? trip.planHistory : [];
      undoneEvent = [...history].reverse().find(event => event.type !== 'undo' && !event.undoneBy);
      if (!undoneEvent || (command.eventId && command.eventId !== undoneEvent.id) || !Array.isArray(undoneEvent.inverse)) throw new Error('되돌릴 최신 변경이 없습니다.');
      for (const change of undoneEvent.inverse) {
        if (!object(change) || !Array.isArray(change.fieldNames) || !object(change.after) || !object(change.after.fields) || (change.before !== null && (!object(change.before) || !object(change.before.fields)))) throw new Error('변경 이력의 복구 정보를 확인할 수 없습니다.');
        if (change.fieldNames.some(key => !historyFields.has(key))) throw new Error('변경 이력에서 기록·사진·ID를 수정할 수 없습니다.');
        validateFields(change.after.fields,historyFields);
        if (change.before) validateFields(change.before.fields,historyFields);
        if (Object.keys(change.after.fields).some(key => !change.fieldNames.includes(key)) || (change.before && Object.keys(change.before.fields).some(key => !change.fieldNames.includes(key)))) throw new Error('변경 이력의 복구 필드가 일치하지 않습니다.');
        const location = find(change.itemId);
        if (signature(location.spot,location.dayId) !== change.afterSignature) throw new Error('대상 일정이 이후 변경되어 되돌릴 수 없습니다.');
        if (change.fieldNames.some(key => own(location.spot,key) !== own(change.after.fields,key) || (own(change.after.fields,key) && location.spot[key] !== change.after.fields[key]))) throw new Error('대상 일정이 이후 변경되어 되돌릴 수 없습니다.');
        if (change.after.position) {
          const position = positionOf(location), expected = change.after.position;
          if (position.previousId !== expected.previousId || position.nextId !== expected.nextId) throw new Error('일정 순서가 이후 변경되어 되돌릴 수 없습니다.');
        }
      }
      for (const change of [...undoneEvent.inverse].reverse()) {
        let location = find(change.itemId);
        if (!change.before) {
          // 새 항목에 나중에 기록이 생겨도 연결을 잃지 않도록 계획에서만 보관한다.
          modify(location,{removed:true,removedAt:at});
          continue;
        }
        const fields = {};
        for (const key of change.fieldNames) fields[key] = own(change.before.fields,key) ? change.before.fields[key] : undefined;
        const spot = modify(location,fields);
        if (change.before.position) {
          writable(location.dayId).splice(location.index,1);
          const previous = change.before.position, items = writable(previous.dayId);
          const nextIndex = items.findIndex(item => item.id === previous.nextId), previousIndex = items.findIndex(item => item.id === previous.previousId);
          const index = nextIndex >= 0 ? nextIndex : previousIndex >= 0 ? previousIndex + 1 : Math.min(previous.index,items.length);
          items.splice(index,0,spot);
        }
      }
      itemId = undoneEvent.itemId;
      title = undoneEvent.title || '';
    } else if (command.type === 'batch') {
      if (!Array.isArray(command.commands) || !command.commands.length) throw new Error('함께 변경할 일정이 없습니다.');
      const seen = new Set();
      for (const child of command.commands) {
        if (!object(child) || child.type !== 'update' || child.position !== undefined || child.anchorId !== undefined || (child.targetDayId && child.targetDayId !== child.dayId) || seen.has(child.itemId)) throw new Error('일괄 조정은 서로 다른 일정의 내용 변경만 지원합니다.');
        seen.add(child.itemId);
        const location = find(child.itemId,child.dayId), changes = child.changes || {};
        validateUpdate(location.spot,changes);
        const keys = Object.keys(changes), before = capture(location,keys);
        modify(location,changes);
        inverse.push(patch(child.itemId,before,keys));
      }
      itemId = command.commands[0].itemId;
      title = '일정 ' + command.commands.length + '개 조정';
    } else if (command.type === 'insert') {
      const spot = newItem(command.item);
      place(command.dayId || command.targetDayId,spot,command);
      itemId = spot.id; title = spot.title;
      inverse.push(patch(itemId,null,Object.keys(projection(spot)).filter(key => key !== 'id'),true));
    } else {
      let location = find(itemId,command.dayId), spot = location.spot;
      title = spot.title || spot.name || '';
      if (['remove','replace','defer'].includes(command.type) && spot.completed) throw new Error('완료한 일정은 완료 상태를 해제한 뒤 변경해 주세요.');
      if (command.type === 'update' || command.type === 'move') {
        const supplied = command.type === 'update' ? (command.changes || {}) : {};
        validateUpdate(spot,supplied);
        const changes = {...supplied};
        const targetDayId = command.targetDayId || location.dayId;
        list(targetDayId);
        // 날짜 이동이 장소 이동을 뜻하지는 않는다. 좌표가 없는 장소도 출발 도시에서 검색한다.
        if (targetDayId !== location.dayId && !spot.city && !own(changes,'city')) {
          const sourceCity = trip.days.find(day => day.id === location.dayId)?.city;
          if (typeof sourceCity === 'string' && sourceCity.trim()) changes.city = sourceCity;
        }
        const moved = command.type === 'move' || targetDayId !== location.dayId || command.position !== undefined;
        const keys = Object.keys(changes), before = capture(location,keys,moved);
        spot = modify(location,changes);
        if (moved) {
          writable(location.dayId).splice(location.index,1);
          place(targetDayId,spot,command);
        }
        inverse.push(patch(itemId,before,keys,moved));
      } else if (['remove','defer','restore'].includes(command.type)) {
        const changes = command.type === 'remove' ? {removed:true,removedAt:at} : command.type === 'defer' ? {deferred:true,deferredAt:at} : {removed:false,deferred:false,skipped:false,cancelled:false};
        const keys = Object.keys(changes), before = capture(location,keys);
        modify(location,changes);
        inverse.push(patch(itemId,before,keys));
      } else if (command.type === 'replace') {
        if (!active(spot)) throw new Error('보관한 일정을 복구한 뒤 대체해 주세요.');
        const replacement = newItem(command.item), targetDayId = command.targetDayId || location.dayId;
        list(targetDayId);
        const changes = {skipped:true,cancelled:true,cancelReason:'대체: '+replacement.title,cancelledAt:at,replacedBySpotId:replacement.id};
        const keys = Object.keys(changes), before = capture(location,keys);
        modify(location,changes);
        inverse.push(patch(itemId,before,keys));
        replacement.replacesSpotId = itemId;
        place(targetDayId,replacement,command.position ? command : targetDayId === location.dayId ? {position:'after',anchorId:itemId} : {position:'end'});
        itemId = replacement.id;
        inverse.push(patch(itemId,null,Object.keys(projection(replacement)).filter(key => key !== 'id'),true));
      } else throw new Error('지원하지 않는 일정 변경 명령입니다.');
    }

    const affectedDayIds = trip.days.filter(day => changedDays.has(day.id)).map(day => day.id);
    const planRevision = Number.isSafeInteger(trip.planRevision) && trip.planRevision >= 0 ? trip.planRevision : 0;
    const event = {id:eventId,type:command.type,at,itemId,title,affectedDayIds,inverse,...(undoneEvent ? {undoOf:undoneEvent.id} : {})};
    const history = (Array.isArray(trip.planHistory) ? trip.planHistory : []).map(entry => entry.id === undoneEvent?.id ? {...entry,undoneBy:eventId} : entry);
    const baseline = trip.planBaseline || {source:'captured-current',capturedAt:at,planRevision,days:trip.days.map(day => {
      const result = {id:day.id,spots:day.spots.map(projection)};
      for (const key of ['date','dayNum','title','city','planBlockId']) if (own(day,key) && (day[key] === null || ['string','number','boolean'].includes(typeof day[key]))) result[key] = day[key];
      return result;
    })};
    // 모든 검증을 마친 뒤 채택한다. 저장 성공 여부와 원본 채택은 저장소 경계가 결정한다.
    for (const day of trip.days) if (arrays.has(day.id)) day.spots = arrays.get(day.id);
    trip.planBaseline = baseline;
    trip.planRevision = planRevision + 1;
    trip.planHistory = [...history,event].slice(-30);
    return {eventId,affectedDayIds,itemId};
  }

  const api = {apply,minutes,validTime,active,validateMetadata};
  root.SulsulTravel = root.SulsulTravel || {};
  root.SulsulTravel.LiveItinerary = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
