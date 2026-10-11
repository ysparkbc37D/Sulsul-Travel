/* 환율 설정 오류를 여행 자료와 분리하고, 손상 원문을 별도 보관한다. */
(function(root){
  'use strict';
  function readRates(storage, key) {
    let raw = null;
    try {
      raw = storage.getItem(key);
      if (raw === null) return {};
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('INVALID_RATES');
      const rates = {};
      for (const [code, rate] of Object.entries(parsed)) {
        if (!/^(?:[A-Z]{3}|ARS_MEP)$/.test(code) || typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) throw new Error('INVALID_RATE');
        rates[code] = rate;
      }
      return rates;
    } catch (_) {
      if (raw !== null) {
        try { storage.setItem(`${key}_corrupt_${Date.now()}`, raw); } catch (_) {}
      }
      return {};
    }
  }
  root.SulsulTravel = root.SulsulTravel || {};
  root.SulsulTravel.SettingsRepository = {readRates};
})(typeof window !== 'undefined' ? window : globalThis);
