/* 동행 현장 모달 3종(기사님 카드·긴급 SOS·스토리 매거진) UI (v2.2.8, 계획 4단계 19차).
 * js/presentation/companion-ui.js에서 #modal-taxi-card·#modal-sos-emergency·#modal-story-magazine의
 * 렌더링·언어/카테고리 전환·복사·인쇄(약 420줄)를 분리했다.
 * 기사님 카드 주소 복사의 인라인 onclick 따옴표 주입(XSS), 빈 일차 호출 시 이전 목적지 잔류,
 * SOS 복사 버튼 연타 시 '복사됨' 고착, 매거진 이미지 URL 검증 누락을 함께 고쳤다.
 * 셸 함수(getActiveTrip·companionMapQuery·escapeHtml·openModal·closeModal·showToast·capsuleMoodLabel)와
 * 전역 State·SulsulTravel 도메인 모듈은 실행 시점에 찾으며, 불러올 때는 UiActions 등록 외 문서를 건드리지 않는다. */
(function (root) {
  'use strict';
  const T = root.SulsulTravel = root.SulsulTravel || {};
  const $ = id => document.getElementById(id);

  const VALID_TAXI_LANGS = Object.freeze(['local', 'en', 'ko']);
  const VALID_SOS_LANGS = Object.freeze(['auto', 'en', 'es', 'ja', 'zh', 'fr', 'th', 'vi', 'ko']);
  const VALID_SOS_CATEGORIES = Object.freeze(['all', 'pharmacy', 'emergency', 'safety']);
  const SOS_LANG_NAMES = Object.freeze({
    en: 'English', es: '스페인어', ja: '일본어', zh: '중국어',
    fr: '프랑스어', th: '태국어', vi: '베트남어', ko: '한국어'
  });

  // 연타 시에도 원래 라벨과 타이머를 정확히 복원하기 위해 요소별로 복원 상태를 보관한다.
  const copyButtonTimers = typeof WeakMap === 'function' ? new WeakMap() : null;
  // 현재 화면에 그려진 SOS 문구 원문을 ID별로 보관해 HTML 속성 이스케이프·주입 경로를 없앤다.
  const renderedSosPhraseTexts = new Map();

  function safeHtml(value) {
    return typeof root.escapeHtml === 'function' ? root.escapeHtml(String(value ?? '')) : String(value ?? '');
  }

  function safePhotoUrl(src) {
    const candidate = String(src || '').trim();
    if (!candidate) return '';
    if (typeof T.TravelStory?.safePhoto === 'function') return T.TravelStory.safePhoto(candidate) || '';
    if (typeof T.TripTransfer?.safePhoto === 'function') return T.TripTransfer.safePhoto(candidate) || '';
    return /^(?:https?:\/\/|data:image\/(?:png|jpe?g|webp|gif);base64,|blob:|\/|\.)/i.test(candidate) ? candidate : '';
  }

  function notify(message, duration) {
    if (typeof root.showToast === 'function') root.showToast(message, duration);
  }

  function fallbackCopyText(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      notify('주소가 복사되었습니다! (클립보드)');
    } catch (e) {
      root.prompt('주소를 복사하세요 (Ctrl+C):', text);
    } finally {
      ta.remove();
    }
  }

  // ── 1. 현지어 기사님 카드 (#modal-taxi-card) ──
  function detectTaxiLanguagePhrases(trip, spot, day) {
    const textToScan = [
      ...(trip?.countries || []),
      ...(trip?.cities || []),
      spot?.title || '',
      spot?.name || '',
      spot?.address || '',
      day?.city || '',
      day?.loc || ''
    ].join(' ');

    const isJapanese = /[\u3040-\u309F\u30A0-\u30FF]/.test(textToScan) || /(일본|도쿄|오사카|교토|후쿠오카|삿포로|오키나와|Japan|Tokyo|Osaka|Kyoto)/i.test(textToScan);
    const isChinese = /(대만|타이완|중국|홍콩|마카오|타이베이|가오슝|베이징|상하이|Taiwan|Taipei|China|Hong Kong)/i.test(textToScan) || /[\u4E00-\u9FFF]/.test(spot?.title || '');
    const isSpanish = /(스페인|아르헨티나|멕시코|페루|칠레|콜롬비아|마드리드|바르셀로나|부에노스|Spain|Argentina|Mexico|Peru|Chile)/i.test(textToScan);
    const isFrench = /(프랑스|파리|니스|리옹|France|Paris|Nice)/i.test(textToScan);
    const isThai = /[\u0E00-\u0E7F]/.test(textToScan) || /(태국|방콕|푸켓|Thailand|Bangkok)/i.test(textToScan);
    const isVietnamese = /(베트남|다낭|하노이|호치민|Vietnam|Danang|Hanoi)/i.test(textToScan);

    let localPhrase = 'Driver, please take me to this location.';
    let localLangName = '현지어';

    if (isJapanese) {
      localPhrase = '運転手さん、ここまでお願いします。';
      localLangName = '일본어';
    } else if (isChinese) {
      localPhrase = '司機先生，請帶我到這裡。';
      localLangName = '중국어/대만';
    } else if (isSpanish) {
      localPhrase = 'Por favor, lléveme a este lugar.';
      localLangName = '스페인어';
    } else if (isFrench) {
      localPhrase = "S'il vous plaît, emmenez-moi ici.";
      localLangName = '프랑스어';
    } else if (isThai) {
      localPhrase = 'กรุณาพาฉันไปที่นี่ครับ/ค่ะ';
      localLangName = '태국어';
    } else if (isVietnamese) {
      localPhrase = 'Làm ơn đưa tôi đến địa chỉ này.';
      localLangName = '베트남어';
    }

    return {
      local: { name: localLangName, phrase: localPhrase },
      en: { name: 'English', phrase: 'Driver, please take me to this location.' },
      ko: { name: '한국어', phrase: '기사님, 여기(목적지)로 가주세요.' }
    };
  }

  function copyTaxiCardAddress(text) {
    if (!text) return;
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(text).then(() => {
        notify('주소가 복사되었습니다! (클립보드)');
      }).catch(() => fallbackCopyText(text));
    } else {
      fallbackCopyText(text);
    }
  }

  function renderTaxiCardContent(dayIndex, spotIndex, selectedLang = 'local', isHuge = false) {
    const container = $('taxi-card-content');
    if (!container) return;

    const dIdx = Number.isInteger(Number(dayIndex)) ? Number(dayIndex) : -1;
    const sIdx = Number.isInteger(Number(spotIndex)) ? Number(spotIndex) : -1;
    const langKey = VALID_TAXI_LANGS.includes(selectedLang) ? selectedLang : 'local';
    const huge = Boolean(isHuge);

    const trip = typeof root.getActiveTrip === 'function' ? root.getActiveTrip() : null;
    const day = dIdx >= 0 ? trip?.days?.[dIdx] : null;
    const spot = sIdx >= 0 ? day?.spots?.[sIdx] : null;

    if (!spot) {
      container.innerHTML = [
        '<div class="p-4 rounded-2xl bg-[#141c2e] border border-[#23304c] text-center space-y-3">',
        '<p class="text-sm font-bold text-slate-200">선택한 일정을 찾을 수 없어요.</p>',
        '<p class="text-xs text-slate-400">오늘 일정에 목적지를 추가한 뒤 기사님 카드를 다시 열어 주세요.</p>',
        '<button type="button" data-on-click="shell.closeModal" data-modal="modal-taxi-card" class="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-black cursor-pointer">닫기</button>',
        '</div>'
      ].join('');
      return;
    }

    const phrases = detectTaxiLanguagePhrases(trip, spot, day);
    const activePhrase = (phrases[langKey] || phrases.local).phrase;

    const title = spot.title || spot.name || '목적지 미정';
    const city = spot.city || day?.city || day?.loc || (trip?.cities && trip.cities[0]) || '';
    const query = typeof root.companionMapQuery === 'function'
      ? root.companionMapQuery(day, spot)
      : [city, title].filter(Boolean).join(' ');
    const address = spot.address || spot.loc || query;
    const hint = [spot.desc || spot.memo || '', spot.tip || ''].filter(Boolean).join(' · ');

    const lat = Number(spot.lat);
    const lng = Number(spot.lng);
    const coordsQuery = Number.isFinite(lat) && Number.isFinite(lng) && (lat || lng)
      ? `&dropoff[latitude]=${encodeURIComponent(String(lat))}&dropoff[longitude]=${encodeURIComponent(String(lng))}`
      : '';
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    const uberUrl = `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(address)}&dropoff[nickname]=${encodeURIComponent(title)}${coordsQuery}`;

    const langButtonsHtml = [
      { key: 'local', labelHtml: `<i class="fa-solid fa-language mr-1" aria-hidden="true"></i> ${safeHtml(phrases.local.name)}` },
      { key: 'en', labelHtml: 'English' },
      { key: 'ko', labelHtml: '한국어' }
    ].map(btn => {
      const labelHtml = btn.labelHtml;
      return `<button type="button" data-on-click="companionModals.taxiLang" data-day="${Number(dIdx)}" data-spot="${Number(sIdx)}" data-lang="${safeHtml(btn.key)}" data-huge="${huge ? 'true' : 'false'}" aria-pressed="${langKey === btn.key ? 'true' : 'false'}" class="flex-1 py-1.5 px-2 rounded-lg font-bold transition ${langKey === btn.key ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}">${labelHtml}</button>`;
    }).join('');

    const hintHtml = hint
      ? `<div class="taxi-card-memo"><i class="fa-solid fa-circle-info mr-1 text-sky-400" aria-hidden="true"></i> ${safeHtml(hint)}</div>`
      : '';

    container.innerHTML = [
      '<div class="flex items-center justify-between gap-1.5 p-1 bg-[#141c2e] border border-[#23304c] rounded-xl text-xs">',
      langButtonsHtml,
      '</div>',
      `<div class="taxi-card-driver-banner"><div class="taxi-card-phrase">${safeHtml(activePhrase)}</div><div class="taxi-card-phrase-sub">기사님께 이 화면을 직접 보여주세요 (Show this screen to the driver)</div></div>`,
      `<div class="taxi-card-display ${huge ? 'is-huge' : ''}">`,
      '<div class="flex items-center justify-between gap-2 mb-2">',
      `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold"><i class="fa-solid fa-location-dot" aria-hidden="true"></i> ${safeHtml(city || '목적지')}</span>`,
      `<button type="button" data-on-click="companionModals.taxiHuge" data-day="${Number(dIdx)}" data-spot="${Number(sIdx)}" data-lang="${safeHtml(langKey)}" data-huge="${huge ? 'false' : 'true'}" aria-pressed="${huge ? 'true' : 'false'}" class="px-2.5 py-1 rounded-lg bg-[#1e293b] hover:bg-[#334155] border border-[#475569] text-xs font-bold text-slate-200 flex items-center gap-1 transition cursor-pointer" title="글자 크기 토글"><i class="fa-solid ${huge ? 'fa-compress' : 'fa-magnifying-glass-plus'} text-amber-400" aria-hidden="true"></i><span>${huge ? '보통 글자' : '대형 확대 (AAA)'}</span></button>`,
      '</div>',
      `<div class="taxi-card-title">${safeHtml(title)}</div>`,
      `<div class="taxi-card-address"><i class="fa-solid fa-map-pin mr-1 text-amber-400" aria-hidden="true"></i> ${safeHtml(address)}</div>`,
      hintHtml,
      '</div>',
      '<div class="taxi-card-actions">',
      `<button type="button" data-on-click="companionModals.copyTaxi" data-address="${safeHtml(address)}" class="bg-[#141c2e] hover:bg-[#1a263e] border border-[#23304c] text-white flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"><i class="fa-solid fa-copy text-amber-400" aria-hidden="true"></i><span>주소 복사</span></button>`,
      `<a href="${safeHtml(googleMapsUrl)}" target="_blank" rel="noopener noreferrer" class="bg-[#141c2e] hover:bg-[#1a263e] border border-[#23304c] text-white flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition active:scale-95 no-underline cursor-pointer"><i class="fa-solid fa-map-location-dot text-emerald-400" aria-hidden="true"></i><span>구글 지도</span></a>`,
      `<a href="${safeHtml(uberUrl)}" target="_blank" rel="noopener noreferrer" class="bg-[#141c2e] hover:bg-[#1a263e] border border-[#23304c] text-white flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition active:scale-95 no-underline cursor-pointer"><i class="fa-solid fa-car text-sky-400" aria-hidden="true"></i><span>우버(Uber) 호출</span></a>`,
      '<button type="button" data-on-click="shell.closeModal" data-modal="modal-taxi-card" class="bg-[#141c2e] hover:bg-[#1a263e] border border-[#23304c] text-slate-300 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"><i class="fa-solid fa-xmark" aria-hidden="true"></i><span>닫기</span></button>',
      '</div>'
    ].join('');
  }

  function openTaxiCardModal(dayIndex, spotIndex, evt) {
    if (evt && typeof evt.stopPropagation === 'function') evt.stopPropagation();
    renderTaxiCardContent(dayIndex, spotIndex, 'local', false);
    if (typeof root.openModal === 'function') root.openModal('modal-taxi-card');
  }

  // ── 2. 긴급 SOS & 병원·약국 소통 카드 (#modal-sos-emergency) ──
  function appState() {
    if (typeof State !== 'undefined' && State) return State;
    if (T.State) return T.State;
    return root.State = root.State || {};
  }

  function sosState() {
    const state = appState();
    if (!state.sos) state.sos = { lang: 'auto', category: 'all', expanded: null, countryOverride: null, tripId: null };
    return state.sos;
  }

  function sosCountryInfo(trip) {
    const contacts = T.EmergencyContacts;
    const state = sosState();
    const dayIndex = trip?.days?.length ? T.TripAdapter.resolveTodayDayIndex(trip) : 0;
    const lookup = typeof root.resolveCanonicalCountry === 'function' ? root.resolveCanonicalCountry : null;
    const resolved = contacts.resolve(trip, dayIndex, lookup);
    const override = state.tripId === trip?.id && state.countryOverride && contacts.DATA[state.countryOverride] ? state.countryOverride : null;
    const code = override || resolved.code;
    const entry = code ? contacts.contacts(code) : null;
    return {
      code,
      entry,
      basis: override ? 'manual' : resolved.basis,
      candidates: resolved.candidates,
      day: trip?.days?.[dayIndex],
      langCode: entry?.lang || 'en',
      langName: SOS_LANG_NAMES[entry?.lang] || 'English'
    };
  }

  function selectSosCountry(code) {
    const state = sosState();
    const trip = typeof root.getActiveTrip === 'function' ? root.getActiveTrip() : null;
    state.tripId = trip?.id || null;
    state.countryOverride = T.EmergencyContacts.DATA[code] ? code : null;
    renderSosEmergencyContent();
  }

  function getSosMedicalPhrases() {
    return [
      {
        id: 'stomach',
        cat: 'pharmacy',
        title: '배·위통 / 경련 / 위장약',
        icon: 'fa-solid fa-pills',
        ko: '배가 너무 아프고 경련이 있어요. 위장약/진경제 있나요?',
        es: { phrase: '¿Tiene pastillas para el dolor de estómago y cólicos?', pron: '띠에네 빠스띠야스 빠라 엘 돌로르 데 에스또마고 이 꼴리꼬스?' },
        en: { phrase: 'My stomach hurts severely with cramps. Do you have stomach medication?', pron: '마이 스터먹 헐츠 시비얼리 위드 크램프스. 두 유 해브 스터먹 메디케이션?' },
        ja: { phrase: '胃とお腹がひどく痛みます。胃腸薬や鎮痙剤はありますか？', pron: '이토 오나카가 히도쿠 이타미마스. 이쵸야쿠와 아리마스카?' },
        zh: { phrase: '我肚子很痛且有痙攣。請問有胃腸藥或止痛藥嗎？', pron: '워 두즈 헌 통 치에 여우 징롼. 칭원 여우 웨이창야오 마?' },
        fr: { phrase: "J'ai très mal au ventre avec des crampes. Avez-vous des médicaments ?", pron: '줴 트레 말 오 방트르 아베크 데 크랑프.' },
        th: { phrase: 'ปวดท้องรุนแรงและมีอาการเกร็ง มียาแก้ปวดท้องไหมครับ/ค่ะ', pron: '뿌엇 통 룬랭 래 미 아깐 그랭 미 야깨뿌엇통 마이 캅/카' },
        vi: { phrase: 'Tôi bị đau dạ dày dữ dội và co thắt. Có thuốc giảm đau không?', pron: '또이 비 다우 자 자이 즈 조이 바 꺼 탓.' }
      },
      {
        id: 'diarrhea',
        cat: 'pharmacy',
        title: '설사 / 장염 / 지사제',
        icon: 'fa-solid fa-kit-medical',
        ko: '설사와 탈수가 심해요. 지사제(설사 멈추는 약)와 전해질 수액가루 주세요.',
        es: { phrase: 'Tengo diarrea fuerte. ¿Tiene pastillas antidiarreicas y suero oral?', pron: '뗑고 디아레아 푸에르떼. 띠에네 빠스띠야스 안띠디아레이까스?' },
        en: { phrase: 'I have severe diarrhea. Please give me antidiarrheal medication and hydration salts.', pron: '아이 해브 시비어 다이어리어. 플리즈 기브 미 안티다이어리얼 메디케이션.' },
        ja: { phrase: '下痢と脱水がひどいです。下痢止めと経口補水塩をください。', pron: '게리토 닷수이가 히도이데스. 게리도메오 쿠다사이.' },
        zh: { phrase: '嚴重腹瀉與脫水。請給我止瀉藥和口服補液鹽。', pron: '옌중 푸시에 위 퉈수이. 칭 게이 워 즈시에야오.' },
        fr: { phrase: 'J’ai une forte diarrhée. Avez-vous un antidiarrhéique et des sels de réhydratation ?', pron: '줴 윈 포르트 디아레. 아베-부 욍 앙티디아레이크?' },
        th: { phrase: 'ท้องเสียหนักมาก ขอยาแก้ท้องเสียและผงเกลือแร่ครับ/ค่ะ', pron: '통시아 낙 막 커 야깨통시아 래 퐁 끄르아 래 캅/카' },
        vi: { phrase: 'Tôi bị tiêu chảy nặng. Làm ơn cho tôi thuốc cầm tiêu chảy.', pron: '또이 비 띠에우 차이 낭. 람 온 쪼 또이 투옥 깜 띠에우 차이.' }
      },
      {
        id: 'fever',
        cat: 'pharmacy',
        title: '고열 / 두통 / 해열진통제',
        icon: 'fa-solid fa-temperature-arrow-up',
        ko: '열이 많이 나고 두통이 심합니다. 타이레놀(아세트아미노펜)이나 해열제 주세요.',
        es: { phrase: 'Tengo fiebre alta y fuerte dolor de cabeza. ¿Tiene paracetamol o ibuprofeno?', pron: '뗑고 피에브레 알따 이 푸에르떼 돌로르 데 까베사. 띠에네 빠라세따몰?' },
        en: { phrase: 'I have a high fever and headache. Do you have Paracetamol (Tylenol) or Ibuprofen?', pron: '아이 해브 어 하이 피버 앤 헤덱. 두 유 해브 파라세타몰?' },
        ja: { phrase: '高熱と激しい頭痛があります。アセトアミノフェンや解熱鎮痛剤をください。', pron: '코오네츠토 하게시이 즈츠우가 아리마스. 카이네츠 친츠자이오 쿠다사이.' },
        zh: { phrase: '我發高燒且劇烈頭痛。請給我退燒藥（乙醯胺酚/布洛芬）。', pron: '워 파 가오샤오 치에 쥐리에 터우통. 칭 게이 워 투이샤오야오.' },
        fr: { phrase: 'J’ai une forte fièvre et un mal de tête. Avez-vous du paracétamol ?', pron: '줴 윈 포르트 피에브르 에 욍 말 드 테트. 아베-부 뒤 파라세타몰?' },
        th: { phrase: 'มีไข้สูงและปวดศีรษะ ขอยาลดไข้พาราเซตามอลครับ/ค่ะ', pron: '미 카이 숭 래 뿌엇 시사 커 야롯카이 파라세타몰 캅/카' },
        vi: { phrase: 'Tôi bị sốt cao và đau đầu. Cho tôi thuốc hạ sốt paracetamol.', pron: '또이 비 솟 까오 바 다우 더우. 쪼 또이 투옥 하 솟 파라세타몰.' }
      },
      {
        id: 'soroche',
        cat: 'pharmacy',
        title: '고산병 / 숨참 / 소로체',
        icon: 'fa-solid fa-mountain',
        ko: '고산병 증상(어지럼증, 숨참, 두통)이 심해요. 고산병 약(소로체/다이아목스) 있나요?',
        es: { phrase: 'Sufro de mal de altura (soroche). ¿Tiene pastillas para el soroche o Acetazolamida (Diamox)?', pron: '수프로 데 말 데 알뚜라(소로체). 띠에네 빠스띠야스 빠라 엘 소로체?' },
        en: { phrase: 'I have severe altitude sickness. Do you have Diamox (Acetazolamide)?', pron: '아이 해브 시비어 알티튜드 식니스. 두 유 해브 다이아목스?' },
        ja: { phrase: '高山病の症状がひどいです。高山病の薬（ダイアモックス）はありますか？', pron: '코오잔뵤오노 쇼오조오가 히도이데스. 다이아목쿠스와 아리마스카?' },
        zh: { phrase: '我高山症很嚴重。請問有高山症藥（丹木斯/Acetazolamide）嗎？', pron: '워 가오산정 헌 옌중. 칭원 여우 가오산정야오 마?' },
        fr: { phrase: 'Je souffre du mal aigu des montagnes. Avez-vous de l’acétazolamide (Diamox) ?', pron: '주 수프르 뒤 말 에귀 데 몽타뉴.' },
        th: { phrase: 'แพ้ความสูงอย่างหนัก มียารักษาอาการแพ้ความสูง (Diamox) ไหมครับ/ค่ะ', pron: '패 쾀 숭 양 낙 미 야락사 아깐 패 쾀 숭 마이 캅/카' },
        vi: { phrase: 'Tôi bị sốc độ cao nghiêm trọng. Có thuốc chống say độ cao Diamox không?', pron: '또이 비 속 도 까오 응이엠 쫑. 꼬 투옥 쫑 싸이 도 까오 콩?' }
      },
      {
        id: 'allergy',
        cat: 'emergency',
        title: '⚠️ 땅콩/갑각류 심한 알레르기 (응급)',
        icon: 'fa-solid fa-triangle-exclamation text-rose-500',
        ko: '⚠️ 긴급! 땅콩/갑각류 심한 알레르기입니다! 숨쉬기 힘들고 목이 붓습니다. 응급 처치가 필요합니다!',
        es: { phrase: '¡EMERGENCIA! ¡Tengo una reacción alérgica grave! No puedo respirar bien, necesito atención médica urgente.', pron: '¡에메르헨시아! ¡뗑고 우나 레악시온 알레르히까 그라베! 노 뿌에도 레스삐라르 비엔!' },
        en: { phrase: 'EMERGENCY! Severe allergic reaction! Trouble breathing and throat swelling. Need urgent hospital help!', pron: '이머전시! 시비어 알러직 리액션! 트러블 브리딩. 니드 어전트 헬프!' },
        ja: { phrase: '【緊急】重度のアレルギー発作です！呼吸困難です。大至急、救急医療をお願いします！', pron: '긴큐우! 쥬우도노 아레루기이 홋사데스! 코큐우 콘난데스!' },
        zh: { phrase: '【緊急求助】嚴重過敏反應！呼吸困難且喉嚨腫脹，請立刻送醫急救！', pron: '진지 치우주! 옌중 궈민 판잉! 후시 쿤난, 칭 리커 쑹이 지지우!' },
        fr: { phrase: 'URGENCE ! Réaction allergique sévère ! Difficulté respiratoire, besoin de soins urgents !', pron: '위르장스 ! 레악시옹 알레르지크 세베르 !' },
        th: { phrase: 'ฉุกเฉิน! แพ้อาหารรุนแรง หายใจไม่ออก ต้องการความช่วยเหลือทางการแพทย์ด่วนครับ/ค่ะ', pron: '툭천! 패 아한 룬랭 하이짜이 마이 억 떵깐 쾀추아이르어 두언 캅/카' },
        vi: { phrase: 'CẤP CỨU! Dị ứng cực kỳ nghiêm trọng! Khó thở, cần cấp cứu y tế khẩn cấp!', pron: '깝 꾸우! 지 응 극 끼 응이엠 쫑! 커 터, 껀 깝 꾸우 칸 겁!' }
      },
      {
        id: 'theft',
        cat: 'safety',
        title: '소매치기 / 도난 / 경찰 리포트',
        icon: 'fa-solid fa-shield-halved',
        ko: '여권과 지갑을 소매치기(도난)당했습니다. 보험 청구용 경찰 신고서(Police Report)가 필요합니다.',
        es: { phrase: 'He sufrido un robo. Me robaron el pasaporte y la cartera. Necesito hacer una denuncia policial.', pron: '에 수프리도 운 로보. 메 로바론 엘 빠사뽀르떼. 네세시또 우나 데눈시아 뽈리시알.' },
        en: { phrase: 'My passport and wallet were stolen. I need to make a police report for insurance.', pron: '마이 패스포트 앤 월렛 워 스톨른. 아이 니드 투 메이크 어 폴리스 리포트.' },
        ja: { phrase: 'スリ（盗難）に遭いパスポートと財布を盗まれました。警察の事故届（ポリスレポート）が必要です。', pron: '스리니 아이 파스포오토가 누스마레마시타. 케이사츠노 토도케가 히츠요오데스.' },
        zh: { phrase: '我的護照和皮夾被偷了。我需要報案開立警方報案證明（Police Report）。', pron: '워 더 후자오 허 피지아 베이 터우 러. 워 쉬야오 바오안 카이리 징팡 바오안정밍.' },
        fr: { phrase: 'On m’a volé mon passeport et mon portefeuille. J’ai besoin d’une déclaration de vol à la police.', pron: '옹 마 볼레 몽 파스포르. 줴 베주앙 뒨 데클라라시옹 드 볼.' },
        th: { phrase: 'ถูกขโมยพาสปอร์ตและกระเป๋าเงิน ต้องการใบแจ้งความจากตำรวจครับ/ค่ะ', pron: '툭 카모이 파스폿 래 끄라빠오 응언 떵깐 바이 쨍쾀 캅/카' },
        vi: { phrase: 'Tôi bị mất cắp hộ chiếu và ví tiền. Cần biên bản trình báo công an để làm bảo hiểm.', pron: '또이 비 떳 깝 호 찌에우 바 비 띠엔. 껀 까인 삿 바오 까오.' }
      },
      {
        id: 'wound',
        cat: 'pharmacy',
        title: '상처 / 출혈 / 소독약·붕대',
        icon: 'fa-solid fa-bandage',
        ko: '넘어져서 상처가 나고 피가 납니다. 소독약(포비돈)과 멸균 거즈, 밴드 주세요.',
        es: { phrase: 'Me lastimé y estoy sangrando. ¿Tiene antiséptico, gasas y apósitos (tiritas)?', pron: '메 라스띠메 이 에스또이 상그란도. 띠에네 안띠셉띠꼬, 가사스 이 띠리따스?' },
        en: { phrase: 'I got injured and am bleeding. Do you have antiseptic, sterile gauze, and bandages?', pron: '아이 갓 인저드 앤 앰 블리딩. 두 유 해브 안티셉틱, 거즈 앤 밴디지스?' },
        ja: { phrase: '怪我をして血が出ています。消毒液とガーゼ、絆創膏をください。', pron: '케가오 시테 치가 데테이마스. 쇼오도쿠에키토 반소오코오오 쿠다사이.' },
        zh: { phrase: '我受傷流血了。請問有消毒藥水、無菌紗布和創可貼嗎？', pron: '워 서우상 류쉐 러. 칭원 여우 샤오두야오수이, 샤부 한 촹커톄 마?' },
        fr: { phrase: 'Je suis blessé et je saigne. Avez-vous un antiseptique, des compresses et des pansements ?', pron: '주 슈이 블레세 에 주 센. 아베-부 욍 앙티셉티크?' },
        th: { phrase: 'มีแผลและเลือดออก ขอยาฆ่าเชื้อ ผ้าก๊อซ และพลาสเตอร์ยาครับ/ค่ะ', pron: '미 팰 래 르앗 억 커 야카츠아 래 플라스터 야 캅/카' },
        vi: { phrase: 'Tôi bị thương và chảy máu. Cho tôi thuốc sát trùng, gạc y tế và băng keo cá nhân.', pron: '또이 비  thuong 바 차이 마우. 쪼 또이 투옥 삿 쭝.' }
      },
      {
        id: 'emergency',
        cat: 'emergency',
        title: '🚨 종합병원 응급실 (ER) 안내 요청',
        icon: 'fa-solid fa-truck-medical text-rose-500',
        ko: '의료 응급 상황입니다! 가장 가까운 종합병원 응급실(Hospital Emergency)로 데려다주세요!',
        es: { phrase: '¡Es una emergencia médica! Por favor, lléveme al servicio de urgencias del hospital más cercano.', pron: '¡에스 우나 에메르헨시아 메디까! 뽀르 파보르, 예베메 알 오스삐딸 마스 세르까노.' },
        en: { phrase: 'This is a medical emergency! Please take me to the nearest hospital Emergency Room (ER)!', pron: '디스 이즈 어 메디컬 이머전시! 플리즈 테이크 미 투 더 니어리스트 ER!' },
        ja: { phrase: '医療緊急事態です！最寄りの総合病院の救急外来（ER）へ連れて行ってください！', pron: '이료오 긴큐우 지타이데스! 큐우큐우 가이라에 츠레테잇테 쿠다사이!' },
        zh: { phrase: '這是醫療緊急狀況！請立刻帶我去最近的綜合醫院急診室（ER）！', pron: '저 스 이랴오 진지 좡쾅! 칭 리커 다이 워 취 쭈이 진 더 이위안 지전스!' },
        fr: { phrase: 'Urgence médicale ! S’il vous plaît, emmenez-moi au service des urgences de l’hôpital le plus proche !', pron: '위르장스 메디칼! 앙므네-무아 오 쥐르장스 드 롭피탈.' },
        th: { phrase: 'เหตุฉุกเฉินทางการแพทย์! ช่วยพาไปห้องฉุกเฉินของโรงพยาบาลที่ใกล้ที่สุดด่วนครับ/ค่ะ', pron: '헷 툭천 탕 깐 패! 추아이 파 빠이 헝툭천 롱파야반 티 끌라이 티쑷 캅/카' },
        vi: { phrase: 'Tình huống cấp cứu y tế! Làm ơn đưa tôi đến phòng cấp cứu bệnh viện gần nhất!', pron: '띤 후옹 깝 꾸우 이 떼! 람 온 드어 또이 덴 퐁 깝 꾸우.' }
      }
    ];
  }

  function renderSosEmergencyContent(selectedLang = null, activeCategory = null, expandedSymptomId = undefined) {
    const container = $('sos-emergency-content');
    if (!container) return;
    const phrases = getSosMedicalPhrases();
    const state = sosState();
    if (selectedLang !== null) state.lang = VALID_SOS_LANGS.includes(selectedLang) ? selectedLang : 'auto';
    if (activeCategory !== null) state.category = VALID_SOS_CATEGORIES.includes(activeCategory) ? activeCategory : 'all';
    if (expandedSymptomId !== undefined) {
      state.expanded = phrases.some(p => p.id === expandedSymptomId) ? expandedSymptomId : null;
    }

    const trip = typeof root.getActiveTrip === 'function' ? root.getActiveTrip() : null;
    const info = sosCountryInfo(trip);
    const contacts = T.EmergencyContacts;
    const lang = state.lang === 'auto' ? info.langCode : state.lang;
    const filteredPhrases = state.category === 'all' ? phrases : phrases.filter(p => p.cat === state.category);
    const langButtons = [
      { code: 'auto', label: `현지어 (${info.langName})` },
      { code: 'en', label: 'English' }, { code: 'es', label: 'Español' }, { code: 'ja', label: '日本語' }, { code: 'zh', label: '中文' },
      { code: 'fr', label: 'Français' }, { code: 'th', label: 'ไทย' }, { code: 'vi', label: 'Tiếng Việt' }, { code: 'ko', label: '한국어' }
    ];
    const dialIcon = { police: 'fa-shield-halved text-sky-400', ambulance: 'fa-truck-medical text-rose-400', fire: 'fa-fire-extinguisher text-orange-400', general: 'fa-phone text-emerald-400', extra: 'fa-user-shield text-sky-300' };
    const numColor = { police: 'text-sky-300', ambulance: 'text-rose-400', fire: 'text-orange-400', general: 'text-emerald-400', extra: 'text-sky-300' };

    const dialCardsHtml = (info.entry?.lines || []).map(line => {
      const iconClass = dialIcon[line.kind] || 'fa-phone text-slate-300';
      const colorClass = numColor[line.kind] || 'text-slate-200';
      return `
      <a href="tel:${safeHtml(line.tel)}" class="sos-dial-card ${line.kind === 'ambulance' || line.kind === 'fire' ? 'is-ambulance' : 'is-police'}" aria-label="${safeHtml(`${line.label} ${line.tel}에 전화`)}">
        <i class="fa-solid ${safeHtml(iconClass)} text-sm mb-0.5" aria-hidden="true"></i>
        <span class="sos-dial-name">${safeHtml(line.label)}</span>
        <span class="sos-dial-num ${safeHtml(colorClass)}">${safeHtml(line.tel)}</span>
      </a>`;
    }).join('');

    const countryLabel = info.entry ? `${info.entry.name}${info.day?.city ? ` · ${info.day.city}` : ''}` : '국가를 확인하지 못했어요';
    const basisLabel = info.basis === 'day' ? '오늘 일정의 도시 기준' : info.basis === 'trip' ? '여행 국가 기준' : info.basis === 'manual' ? '직접 고른 국가' : '';
    const choices = (info.candidates?.length > 1 || info.basis === 'manual') ? (info.candidates || []) : [];

    const choicesHtml = choices.length
      ? [
        '<div class="flex flex-wrap items-center gap-1.5 text-[11px]" aria-label="지금 있는 나라 고르기">',
        '<span class="text-slate-400 font-bold">지금 있는 나라:</span>',
        choices.map(code => `<button type="button" data-on-click="companionModals.selectSosCountry" data-code="${safeHtml(code)}" class="min-h-[44px] px-2.5 rounded-lg font-bold ${info.code === code ? 'bg-rose-500 text-slate-950' : 'bg-[#1e293b] text-slate-300'}" aria-pressed="${info.code === code ? 'true' : 'false'}">${safeHtml(contacts.DATA[code]?.name || code)}</button>`).join(''),
        '</div>'
      ].join('')
      : '';

    const categoryButtonsHtml = [['all', '전체'], ['pharmacy', '약국/약품'], ['emergency', '응급/병원'], ['safety', '도난/안전']]
      .map(([key, label]) => `<button type="button" data-on-click="companionModals.sosCategory" data-category="${safeHtml(key)}" class="px-2 py-0.5 rounded-lg font-bold transition ${state.category === key ? 'bg-rose-500 text-slate-950' : 'text-slate-400 bg-[#1e293b]'}" aria-pressed="${state.category === key ? 'true' : 'false'}">${safeHtml(label)}</button>`).join('');

    const langButtonsHtml = langButtons
      .map(b => `<button type="button" data-on-click="companionModals.sosLang" data-lang="${safeHtml(b.code)}" class="px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition cursor-pointer shrink-0 ${state.lang === b.code ? 'bg-amber-500 text-slate-950 shadow' : 'bg-[#141c2e] border border-[#23304c] text-slate-300'}" aria-pressed="${state.lang === b.code ? 'true' : 'false'}">${safeHtml(b.label)}</button>`).join('');

    renderedSosPhraseTexts.clear();
    const phraseCardsHtml = filteredPhrases.map(p => {
      const phraseData = p[lang] || p.en || { phrase: p.ko, pron: '' };
      renderedSosPhraseTexts.set(p.id, phraseData.phrase || p.ko);
      const isHuge = state.expanded === p.id;
      const pronHtml = phraseData.pron
        ? `<div class="sos-phrase-phonetic"><i class="fa-solid fa-volume-high mr-1 text-[10px] opacity-70" aria-hidden="true"></i>${safeHtml(phraseData.pron)}</div>`
        : '';
      return `
        <div class="sos-phrase-card ${isHuge ? 'is-huge' : ''}" id="sos-card-${safeHtml(p.id)}">
          <div class="flex items-center justify-between gap-2 mb-1.5">
            <span class="text-xs font-black text-rose-400 flex items-center gap-1.5"><i class="${safeHtml(p.icon)}" aria-hidden="true"></i><span>${safeHtml(p.title)}</span></span>
            <div class="flex items-center gap-1">
              <button type="button" data-on-click="companionModals.sosHuge" data-id="${safeHtml(p.id)}" aria-pressed="${isHuge ? 'true' : 'false'}" class="px-2 py-0.5 rounded bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-[10px] font-bold text-slate-200 transition cursor-pointer">
                <i class="fa-solid ${isHuge ? 'fa-compress' : 'fa-magnifying-glass-plus'} text-amber-400" aria-hidden="true"></i><span>${isHuge ? '보통 크기' : '크게 보여주기'}</span>
              </button>
              <button type="button" data-on-click="companionModals.sosCopy" data-phrase-id="${safeHtml(p.id)}" class="px-2 py-0.5 rounded bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-[10px] font-bold text-slate-200 transition cursor-pointer">
                <i class="fa-solid fa-copy text-sky-400" aria-hidden="true"></i> <span>복사</span>
              </button>
            </div>
          </div>
          <div class="sos-phrase-main">${safeHtml(phraseData.phrase)}</div>
          ${pronHtml}
          <div class="sos-phrase-meaning">의미: ${safeHtml(p.ko)}</div>
        </div>`;
    }).join('');

    const sourceText = info.entry
      ? [info.entry.note, `출처: ${contacts.SOURCE.label} · ${contacts.SOURCE.checkedAt} 확인.`, contacts.SOURCE.advice].filter(Boolean).join(' ')
      : '이 여행지의 현지 긴급 번호는 앱에 확인된 자료가 없습니다. 영사콜센터(해외 사건·사고 24시간 한국어 지원)로 연락하거나 외교부 해외안전여행(0404.go.kr)에서 번호를 확인하세요.';

    container.innerHTML = [
      '<div class="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25">',
      '<div class="flex items-center gap-2 min-w-0">',
      '<span class="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-500 flex items-center justify-center shrink-0"><i class="fa-solid fa-location-dot" aria-hidden="true"></i></span>',
      `<div class="min-w-0"><div class="text-xs font-black text-rose-400 truncate">${safeHtml(countryLabel)}</div><div class="text-[10px] text-slate-400">${safeHtml(basisLabel || '긴급 번호 대신 영사콜센터를 먼저 안내합니다')}</div></div>`,
      '</div>',
      '<span class="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold shrink-0 border border-rose-500/30">오프라인 사용 가능</span>',
      '</div>',
      choicesHtml,
      '<div>',
      '<div class="text-[11px] font-bold text-slate-400 mb-1.5">현지 긴급 전화 (누르면 전화 앱이 열립니다)</div>',
      '<div class="sos-dial-grid">',
      dialCardsHtml,
      `<a href="tel:${safeHtml(contacts.CONSULAR.tel)}" class="sos-dial-card is-embassy" aria-label="외교부 영사콜센터 ${safeHtml(contacts.CONSULAR.display)}에 전화"><i class="fa-solid fa-phone-volume text-amber-400 text-sm mb-0.5" aria-hidden="true"></i><span class="sos-dial-name">영사콜센터 24시간</span><span class="sos-dial-num text-amber-400 text-xs">${safeHtml(contacts.CONSULAR.display)}</span></a>`,
      '</div>',
      `<p class="text-[10px] text-slate-400 mt-1.5 leading-relaxed">${safeHtml(sourceText)}</p>`,
      '</div>',
      '<div class="pt-1">',
      '<div class="flex items-center justify-between gap-2 mb-2 flex-wrap">',
      '<div class="text-xs font-black text-white flex items-center gap-1.5"><i class="fa-solid fa-notes-medical text-rose-400" aria-hidden="true"></i><span>약국·병원·응급 증상 소통 카드</span></div>',
      `<div class="flex items-center gap-1 text-[11px]">${categoryButtonsHtml}</div>`,
      '</div>',
      `<div class="flex items-center gap-1 overflow-x-auto pb-1.5 no-scrollbar mb-2 text-xs">${langButtonsHtml}</div>`,
      `<div class="sos-phrase-list custom-scrollbar">${phraseCardsHtml}</div>`,
      '</div>'
    ].join('');
  }

  function toggleSosPhraseHuge(symptomId) {
    const state = sosState();
    state.expanded = state.expanded === symptomId ? null : symptomId;
    renderSosEmergencyContent();
  }

  function restoreSosCopyButton(btnEl) {
    if (!btnEl || !copyButtonTimers) return;
    const prev = copyButtonTimers.get(btnEl);
    if (prev) {
      clearTimeout(prev.timerId);
      btnEl.innerHTML = prev.origHtml;
      copyButtonTimers.delete(btnEl);
    }
  }

  function markSosButtonCopied(btnEl) {
    if (!btnEl) return;
    if (!copyButtonTimers) {
      const orig = btnEl.innerHTML;
      btnEl.innerHTML = '<i class="fa-solid fa-check text-emerald-400" aria-hidden="true"></i> 복사됨';
      setTimeout(() => { btnEl.innerHTML = orig; }, 1500);
      return;
    }
    const existing = copyButtonTimers.get(btnEl);
    const origHtml = existing ? existing.origHtml : btnEl.innerHTML;
    if (existing) clearTimeout(existing.timerId);
    btnEl.innerHTML = '<i class="fa-solid fa-check text-emerald-400" aria-hidden="true"></i> 복사됨';
    const timerId = setTimeout(() => {
      if (btnEl.isConnected) btnEl.innerHTML = origHtml;
      copyButtonTimers.delete(btnEl);
    }, 1500);
    copyButtonTimers.set(btnEl, { timerId, origHtml });
  }

  function copySosPhraseText(text, btnEl) {
    if (!text) return;
    const cb = navigator.clipboard;
    if (cb && typeof cb.writeText === 'function') {
      cb.writeText(text).then(() => {
        notify('증상 문구를 복사했습니다.');
        markSosButtonCopied(btnEl);
      }).catch(() => {
        restoreSosCopyButton(btnEl);
        fallbackCopyText(text);
      });
    } else {
      fallbackCopyText(text);
    }
  }

  function openSosEmergencyModal() {
    const state = sosState();
    const trip = typeof root.getActiveTrip === 'function' ? root.getActiveTrip() : null;
    if (state.tripId !== trip?.id) {
      state.tripId = trip?.id || null;
      state.countryOverride = null;
    }
    renderSosEmergencyContent('auto', 'all', null);
    if (typeof root.openModal === 'function') root.openModal('modal-sos-emergency');
  }

  // ── 3. 여행 에디토리얼 매거진 (#modal-story-magazine) ──
  function openStoryMagazineModal() {
    renderStoryMagazineContent();
    if (typeof root.openModal === 'function') root.openModal('modal-story-magazine');
  }

  function printStoryMagazine() {
    root.print();
  }

  function magazineMoodLabel(key) {
    return typeof root.capsuleMoodLabel === 'function' ? root.capsuleMoodLabel(key) : '';
  }

  function renderStoryMagazineContent() {
    const container = $('story-magazine-content');
    if (!container) return;
    const trip = typeof root.getActiveTrip === 'function' ? root.getActiveTrip() : null;
    if (!trip) {
      container.innerHTML = '<div class="text-center py-8 text-slate-400">선택된 여행이 없습니다.</div>';
      return;
    }

    const story = T.TravelStory.build(trip, {
      textMode: 'approved',
      includePhotos: true,
      photoSource: T.MediaRepository?.photoSource
    });
    const itinerary = story.days.flatMap(day => day.itinerary).filter(item => !['removed', 'deferred', 'cancelled'].includes(item.status));
    const completedSpots = itinerary.filter(item => item.status === 'completed').length;
    const records = story.days.flatMap(day => [...day.records, ...day.reflections]);
    const photos = records.flatMap(record => record.photos);
    const heroPhoto = photos.map(p => safePhotoUrl(p?.src)).find(Boolean) || '';
    const cities = [...new Set(story.days.map(day => day.city).filter(Boolean))];
    const money = value => `₩${Math.round(Number(value) || 0).toLocaleString('ko-KR')}`;
    const spentOn = date => story.expenses.records.filter(record => date && record.date === date).reduce((sum, record) => sum + (record.krw || 0), 0);
    const recordMeta = record => [record.time ? `기록 ${record.time}` : '', record.locationTitle, magazineMoodLabel(record.mood), record.textOrigin === 'approved' ? '승인한 AI 문장' : ''].filter(Boolean).join(' · ');

    const heroHtml = heroPhoto
      ? `<div class="w-full aspect-video rounded-2xl overflow-hidden border border-[#334155] shadow-2xl mb-4"><img src="${safeHtml(heroPhoto)}" class="w-full h-full object-cover" alt="대표 여행 사진"></div>`
      : '';

    const unconvertedNoticeHtml = story.expenses.unconvertedCount
      ? `<p class="text-[11px] text-slate-400 text-center mt-2">원화 환산액이 없는 지출 ${Number(story.expenses.unconvertedCount)}건은 합계에 넣지 않았어요.</p>`
      : '';

    const daySpreadsHtml = story.days.map(day => {
      const dayRecords = [...day.records, ...day.reflections];
      const dayItinerary = day.itinerary.filter(item => item.status !== 'removed');
      const dayPhotos = dayRecords.flatMap(record => record.photos)
        .map(photo => ({ src: safePhotoUrl(photo?.src), alt: photo?.alt || '여행 사진' }))
        .filter(photo => Boolean(photo.src));
      const daySpent = spentOn(day.date);
      if (!dayItinerary.length && !dayRecords.length && !daySpent) return '';

      const itineraryHtml = dayItinerary.length
        ? `<div class="magazine-spot-flow"><span class="text-[10px] font-bold text-amber-400 mr-1"><i class="fa-solid fa-shoe-prints mr-1" aria-hidden="true"></i> 동선:</span>${dayItinerary.map((item, index) => `<span class="magazine-spot-pill ${item.status === 'completed' ? 'border-amber-500/50 text-amber-300' : ''}">${index + 1}. ${safeHtml(item.title)}${item.scheduledTime ? ` <span class="text-slate-400 font-normal">(${safeHtml(item.scheduledTime)})</span>` : ''}${['skipped', 'cancelled', 'deferred'].includes(item.status) ? ` <span class="text-slate-400 font-normal">· ${safeHtml(item.statusLabel)}</span>` : ''}</span>${index < dayItinerary.length - 1 ? '<i class="fa-solid fa-arrow-right text-[9px] text-slate-500" aria-hidden="true"></i>' : ''}`).join('')}</div>`
        : '';

      const recordsHtml = dayRecords.map(record => {
        const meta = recordMeta(record);
        return `<div class="magazine-journal-quote"><div class="font-bold text-xs text-amber-400 mb-1 flex items-center gap-1.5"><i class="fa-solid fa-pen-fancy text-[10px]" aria-hidden="true"></i><span>${safeHtml(record.title)}</span></div>${meta ? `<div class="text-[10px] text-slate-400 mb-1">${safeHtml(meta)}</div>` : ''}${record.text ? `<div class="leading-relaxed whitespace-pre-wrap">${safeHtml(record.text)}</div>` : ''}</div>`;
      }).join('');

      const photosHtml = dayPhotos.length
        ? `<div class="magazine-photo-grid">${dayPhotos.slice(0, 6).map(photo => `<div class="magazine-photo-tile"><img src="${safeHtml(photo.src)}" alt="${safeHtml(photo.alt)}" loading="lazy"></div>`).join('')}</div>`
        : '';

      const spentHtml = daySpent > 0
        ? `<div class="flex items-center justify-between text-[11px] pt-3 mt-3 border-t border-[#1e293b] text-slate-400"><span>이날의 원화 환산 지출</span><span class="font-bold font-mono text-emerald-400">${safeHtml(money(daySpent))}</span></div>`
        : '';

      return `
        <article class="magazine-day-spread">
          <div class="magazine-day-header">
            <div>
              <span class="magazine-day-num">${day.dayNum ? `DAY ${safeHtml(String(day.dayNum).padStart(2, '0'))}` : '기록'}</span>
              <span class="magazine-day-city ml-2">${safeHtml(day.city || day.title || '도시 미정')}</span>
            </div>
            <div class="text-xs text-slate-400 font-mono">${safeHtml(day.date || day.dateLabel || '')}</div>
          </div>
          ${itineraryHtml}
          ${recordsHtml}
          ${photosHtml}
          ${spentHtml}
        </article>`;
    }).join('');

    container.innerHTML = [
      '<div id="story-magazine-container">',
      '<div class="magazine-cover-card">',
      `<header class="magazine-masthead"><div class="magazine-masthead-title">THE SULSUL CHRONICLE</div><div class="magazine-masthead-meta">VOYAGE MEMOIR · ${safeHtml(story.cover.startDate || '')}</div></header>`,
      '<div class="text-center space-y-3 mb-4">',
      `<h1 class="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">${safeHtml(story.cover.title)}</h1>`,
      `<div class="text-xs sm:text-sm font-bold text-amber-400 font-mono tracking-wide"><i class="fa-solid fa-route mr-1.5" aria-hidden="true"></i> ${safeHtml(cities.join(' ➔ ') || '여행 여정')}</div>`,
      `<div class="text-[11px] text-slate-400 font-medium">일정: ${safeHtml(story.cover.startDate || '일정 미정')} ~ ${safeHtml(story.cover.endDate || '')} · 총 ${Number(story.cover.dayCount) || 0}일간의 여정</div>`,
      '</div>',
      heroHtml,
      '<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-2 border-t border-[#1e293b]">',
      `<div class="p-2 rounded-xl bg-[#080b12] border border-[#1e263c]"><div class="text-[10px] text-slate-400">방문 일정</div><div class="text-sm font-black text-white mt-0.5">${Number(completedSpots)} / ${Number(itinerary.length)} 완료</div></div>`,
      `<div class="p-2 rounded-xl bg-[#080b12] border border-[#1e263c]"><div class="text-[10px] text-slate-400">남긴 기록</div><div class="text-sm font-black text-amber-400 mt-0.5">${Number(records.length)}편</div></div>`,
      `<div class="p-2 rounded-xl bg-[#080b12] border border-[#1e263c]"><div class="text-[10px] text-slate-400">사진</div><div class="text-sm font-black text-sky-400 mt-0.5">${Number(photos.length)}장</div></div>`,
      `<div class="p-2 rounded-xl bg-[#080b12] border border-[#1e263c]"><div class="text-[10px] text-slate-400">원화 환산 지출</div><div class="text-sm font-black text-emerald-400 mt-0.5">${safeHtml(money(story.expenses.totalSpentKrw))}</div></div>`,
      '</div>',
      unconvertedNoticeHtml,
      '</div>',
      `<div class="space-y-4">${daySpreadsHtml}</div>`,
      '<div class="magazine-epilogue-card"><div class="text-base font-black text-white">JOURNEY ARCHIVE</div><div class="magazine-stamp">★ SULSUL OFFICIAL EXPEDITION ★</div><p class="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">이 기록은 이 기기에 저장되어 있어요. 기기를 바꾸거나 브라우저 데이터를 지우기 전에 설정의 JSON 백업을 만들어 두세요. 상단의 [A4 PDF / 인쇄]로 책자처럼 보관할 수 있습니다.</p></div>',
      '</div>'
    ].join('');
  }

  T.UiActions.define('companionModals', {
    openTaxi: (el, ev) => openTaxiCardModal(Number(el.dataset.day), Number(el.dataset.spot), ev),
    taxiLang: el => renderTaxiCardContent(Number(el.dataset.day), Number(el.dataset.spot), el.dataset.lang || 'local', el.dataset.huge === 'true'),
    taxiHuge: el => renderTaxiCardContent(Number(el.dataset.day), Number(el.dataset.spot), el.dataset.lang || 'local', el.dataset.huge === 'true'),
    copyTaxi: el => copyTaxiCardAddress(el.dataset.address || ''),
    openSos: el => {
      const details = el?.closest?.('details');
      if (details) details.open = false;
      openSosEmergencyModal();
    },
    selectSosCountry: el => selectSosCountry(el.dataset.code || ''),
    sosCategory: el => renderSosEmergencyContent(null, el.dataset.category || 'all', undefined),
    sosLang: el => renderSosEmergencyContent(el.dataset.lang || 'auto', null, undefined),
    sosHuge: el => toggleSosPhraseHuge(el.dataset.id || ''),
    sosCopy: el => {
      const id = el.dataset.phraseId || '';
      const text = renderedSosPhraseTexts.get(id) || el.closest?.('.sos-phrase-card')?.querySelector('.sos-phrase-main')?.textContent || '';
      copySosPhraseText(text, el);
    },
    openMagazine: el => {
      const details = el?.closest?.('details');
      if (details) details.open = false;
      openStoryMagazineModal();
    },
    printMagazine: () => printStoryMagazine()
  });

  const api = Object.freeze({
    openTaxi: openTaxiCardModal,
    renderTaxi: renderTaxiCardContent,
    copyTaxi: copyTaxiCardAddress,
    openSos: openSosEmergencyModal,
    renderSos: renderSosEmergencyContent,
    selectSosCountry,
    toggleSosHuge: toggleSosPhraseHuge,
    copySos: copySosPhraseText,
    sosCountryInfo,
    getSosMedicalPhrases,
    openMagazine: openStoryMagazineModal,
    renderMagazine: renderStoryMagazineContent,
    printMagazine: printStoryMagazine
  });

  T.CompanionModals = api;
  root.openTaxiCardModal = openTaxiCardModal;
  root.renderTaxiCardContent = renderTaxiCardContent;
  root.copyTaxiCardAddress = copyTaxiCardAddress;
  root.sosCountryInfo = sosCountryInfo;
  root.selectSosCountry = selectSosCountry;
  root.renderSosEmergencyContent = renderSosEmergencyContent;
  root.toggleSosPhraseHuge = toggleSosPhraseHuge;
  root.copySosPhraseText = copySosPhraseText;
  root.openSosEmergencyModal = openSosEmergencyModal;
  root.openStoryMagazineModal = openStoryMagazineModal;
  root.printStoryMagazine = printStoryMagazine;
  root.renderStoryMagazineContent = renderStoryMagazineContent;
})(typeof window !== 'undefined' ? window : globalThis);
