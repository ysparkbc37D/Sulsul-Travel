/* 설정·테마·PWA 설치 안내·시작 가이드 배너·안내 모달 (v2.2.1, 계획 4단계 13차).
 * index.html의 3-Way 테마 엔진(setTheme·toggleTheme·updateThemeUi),
 * 설정 모달·Gemini 키 관리(openSettingsModal·switchSettingsTab·updateAiStatusIndicator·
 * updateAiChatStatusBadge·updateGeminiKeyUi·handleGeminiKeyMainAction·cancelGeminiKeyEdit·
 * deleteGeminiKey·toggleGeminiKeyVisibility·saveGeminiKeyFromModal·saveGeminiKey·testGeminiApiKey),
 * PWA 설치·시작 가이드 배너(isIOS·isInstalled·inApp·setupPwaInstallPrompt·updatePwaUiState·
 * triggerNativeInstall·handleInstallButtonClick·handleInstallBannerClick·dismissSmartWelcomeBanner·
 * restoreSmartWelcomeBanner·copyCurrentUrl·renderSmartWelcomeBanner·checkStartupInstallOnboarding·
 * openInstallGuideModal·switchInstallTab),
 * 푸터 안내·후원 모달(openVersionHistoryModal·openDonationModal·copyDonationLink·openDonationLink·
 * openUserGuideModal·openDeviceSyncModal·openPrivacyModal)을 옮겼다.
 * 셸 함수(cleanApiKey·callGeminiApiWithFallback·openModal·closeModal·showToast·escapeHtml·
 * updateGithubSyncUi)와 전역 State는 부를 때 찾는다.
 * 모든 동작은 data-on-click="settings.*"로 잇고, 불러올 때는 등록만 하고 문서를 건드리지 않는다. */
(function (root) {
  'use strict';
  const T = root.SulsulTravel = root.SulsulTravel || {};
  const $ = id => document.getElementById(id);

  const SULSUL_DONATION_URL = 'https://blog.naver.com/PostList.naver?blogId=ysparkbc37&from=postList&categoryNo=15';
  const SETTINGS_TABS = Object.freeze(['theme', 'ai', 'data']);
  const INSTALL_PLATFORMS = Object.freeze(['ios', 'android', 'pc']);
  const TEST_BTN_DEFAULT_HTML = '<i class="fa-solid fa-bolt-lightning text-[10px]"></i> <span>연결 테스트</span>';

  let isGeminiKeyEditMode = false;
  let geminiTestResetTimer = null;
  let pwaListenersAttached = false;

  // ── 1. 플랫폼 판별 유틸리티 ──
  function isIOS() {
    return /iP(hone|ad|od)/.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function isInstalled() {
    return (typeof matchMedia === 'function' && (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches))
      || navigator.standalone === true;
  }

  function inApp() {
    const u = navigator.userAgent || '';
    if (/KAKAOTALK/i.test(u)) return '카카오톡';
    if (/NAVER\(inapp|NAVER /i.test(u)) return '네이버 앱';
    if (/Instagram/i.test(u)) return '인스타그램';
    if (/FBAN|FBAV|FB_IAB/i.test(u)) return '페이스북';
    if (/Line\//i.test(u)) return '라인';
    if (/DaumApps/i.test(u)) return '다음 앱';
    return '';
  }

  // ── 2. 3-Way 테마 엔진 (모던 / 라이트그레이 / 딥 블랙) ──
  function normalizeTheme(theme) {
    if (theme === 'light') return 'modern';
    if (theme === 'dark') return 'deepblack';
    if (theme === 'modern' || theme === 'lightgray' || theme === 'deepblack') return theme;
    return 'modern';
  }

  function setTheme(theme) {
    const normalized = normalizeTheme(theme);
    document.documentElement.setAttribute('data-theme', normalized);
    document.documentElement.classList.toggle('dark', normalized === 'deepblack');
    try { localStorage.setItem('st_theme', normalized); } catch (_) {}
    updateThemeUi(normalized);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'modern';
    const cycle = {
      modern: 'lightgray',
      light: 'lightgray',
      lightgray: 'deepblack',
      deepblack: 'modern',
      dark: 'modern'
    };
    const next = cycle[current] || 'modern';
    setTheme(next);
    if (typeof showToast === 'function') {
      const labels = {
        modern: '📜 모던 (빈티지 아카이벌) 테마가 적용되었습니다.',
        lightgray: '☀️ 라이트그레이 (클린 미니멀) 테마가 적용되었습니다.',
        deepblack: '🌙 딥 블랙 (옵시디언 럭셔리) 테마가 적용되었습니다.'
      };
      showToast(labels[next] || '테마가 전환되었습니다.');
    }
  }

  function updateThemeUi(theme) {
    const normalized = normalizeTheme(theme);
    const isDark = normalized === 'deepblack';
    const isLightgray = normalized === 'lightgray';
    const isModern = !isDark && !isLightgray;

    const headerIcon = $('header-theme-icon');
    if (headerIcon) {
      headerIcon.innerText = isDark ? '🌙' : (isLightgray ? '☀️' : '📜');
    }
    const headerBtn = $('header-btn-theme');
    if (headerBtn) {
      headerBtn.setAttribute('title', isModern ? '라이트그레이 테마로 전환' : (isLightgray ? '딥 블랙 테마로 전환' : '모던 테마로 전환'));
    }

    const badge = $('settings-current-theme-badge');
    if (badge) {
      if (isModern) {
        badge.innerText = '모던 (Vintage Archival)';
        badge.className = 'text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#2C3A2E]/10 text-[#2C3A2E] border border-[#2C3A2E]/30';
      } else if (isLightgray) {
        badge.innerText = '라이트그레이 (Clean Minimal)';
        badge.className = 'text-[10px] font-black px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300';
      } else {
        badge.innerText = '딥 블랙 (Deep Obsidian)';
        badge.className = 'text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-[#d4af37] border border-amber-500/40';
      }
    }

    const btnModern = $('btn-theme-modern');
    const btnLightgray = $('btn-theme-lightgray');
    const btnDeepblack = $('btn-theme-deepblack');
    const btnModernTxt = $('btn-theme-modern-txt');
    const btnLightgrayTxt = $('btn-theme-lightgray-txt');
    const btnDeepblackTxt = $('btn-theme-deepblack-txt');

    const activeClassModern = 'py-2.5 px-2 rounded-xl bg-[#2C3A2E] text-white border border-[#2C3A2E] font-black text-[11px] flex flex-col items-center justify-center gap-1 shadow-sm transition ring-2 ring-[#2C3A2E]/40 cursor-pointer is-theme-active';
    const activeClassLightgray = 'py-2.5 px-2 rounded-xl bg-[#111827] text-white border border-[#111827] font-black text-[11px] flex flex-col items-center justify-center gap-1 shadow-sm transition ring-2 ring-stone-900/30 cursor-pointer is-theme-active';
    const activeClassDeepblack = 'py-2.5 px-2 rounded-xl bg-[#d4af37] text-[#0b0c0e] border border-[#d4af37] font-black text-[11px] flex flex-col items-center justify-center gap-1 shadow-sm transition ring-2 ring-amber-400/40 cursor-pointer is-theme-active';
    const inactiveClass = 'py-2.5 px-2 rounded-xl bg-[var(--surface2)] text-[var(--ink)] border border-[var(--line)] font-bold text-[11px] flex flex-col items-center justify-center gap-1 transition cursor-pointer hover:border-[var(--accent)]';

    if (btnModern) {
      btnModern.className = isModern ? activeClassModern : inactiveClass;
      btnModern.classList.toggle('is-theme-active', isModern);
      btnModern.setAttribute('aria-pressed', String(isModern));
      if (btnModernTxt) {
        btnModernTxt.style.setProperty('color', isModern ? '#ffffff' : 'var(--ink)', 'important');
        btnModernTxt.style.fontWeight = isModern ? '900' : '700';
      }
    }
    if (btnLightgray) {
      btnLightgray.className = isLightgray ? activeClassLightgray : inactiveClass;
      btnLightgray.classList.toggle('is-theme-active', isLightgray);
      btnLightgray.setAttribute('aria-pressed', String(isLightgray));
      if (btnLightgrayTxt) {
        btnLightgrayTxt.style.setProperty('color', isLightgray ? '#ffffff' : 'var(--ink)', 'important');
        btnLightgrayTxt.style.fontWeight = isLightgray ? '900' : '700';
      }
    }
    if (btnDeepblack) {
      btnDeepblack.className = isDark ? activeClassDeepblack : inactiveClass;
      btnDeepblack.classList.toggle('is-theme-active', isDark);
      btnDeepblack.setAttribute('aria-pressed', String(isDark));
      if (btnDeepblackTxt) {
        btnDeepblackTxt.style.setProperty('color', isDark ? '#0b0c0e' : 'var(--ink)', 'important');
        btnDeepblackTxt.style.fontWeight = isDark ? '900' : '700';
      }
    }

    // 하위 호환용 2개 버튼 상태 동기화
    const btnLight = $('btn-theme-light');
    const btnDark = $('btn-theme-dark');
    if (btnLight) btnLight.style.display = 'none';
    if (btnDark) btnDark.style.display = 'none';

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isDark ? '#080B12' : (isLightgray ? '#F3F4F6' : '#F5EFEB'));
    }
  }

  // ── 3. 설정 모달 및 AI·Gemini API 키 관리 ──
  function switchSettingsTab(tabKey) {
    const safeTab = SETTINGS_TABS.includes(tabKey) ? tabKey : 'theme';
    SETTINGS_TABS.forEach(t => {
      const active = t === safeTab;
      const btn = $(`tab-settings-${t}`);
      const panel = $(`panel-settings-${t}`);
      if (btn) {
        btn.className = active
          ? 'py-1.5 rounded-lg transition text-center hub-tab-active shadow-sm cursor-pointer truncate whitespace-nowrap'
          : 'py-1.5 rounded-lg transition text-center hub-tab-inactive cursor-pointer truncate whitespace-nowrap';
        btn.setAttribute('aria-pressed', String(active));
      }
      if (panel) {
        panel.classList.toggle('hidden', !active);
      }
    });
    const contentEl = $('modal-settings-content');
    if (contentEl) contentEl.scrollTop = 0;
    if (safeTab === 'data') void T.StorageHealth?.refresh();
  }

  function openSettingsModal(defaultTab) {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'modern';
    updateThemeUi(currentTheme);
    updateGeminiKeyUi();
    if (T.GistSync && typeof T.GistSync.updateUi === 'function') {
      T.GistSync.updateUi();
    }
    updatePwaUiState();
    switchSettingsTab(defaultTab || 'theme');
    openModal('modal-settings');
  }

  function openSettingsFromModal(fromModalId, tab) {
    if (fromModalId) closeModal(fromModalId, true);
    openSettingsModal(tab || 'theme');
  }

  function updateAiChatStatusBadge() {
    const pill = $('ai-chat-status-pill');
    if (!pill) return;
    const rawKey = State.geminiKey || localStorage.getItem('st_gemini_key');
    const key = cleanApiKey(rawKey);
    if (key && key.length > 5 && State.aiFallbackActive) {
      pill.className = 'text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1';
      pill.title = '마지막 응답은 대체 Gemini 모델에서 생성되었습니다.';
      pill.innerHTML = '<i class="fa-solid fa-bolt text-[8px]"></i> <span>대체 모델 사용</span>';
    } else if (key && key.length > 5) {
      pill.className = 'text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1';
      pill.title = 'API 키가 등록되어 있습니다. 첫 요청 전까지 서버 연결은 확인되지 않았습니다.';
      pill.innerHTML = '<i class="fa-solid fa-key text-[8px]"></i> <span>API 키 등록됨</span>';
    } else {
      pill.className = 'text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1';
      pill.title = 'AI 기능을 쓰려면 Gemini API 키를 등록하세요.';
      pill.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-[8px]"></i> <span>키 미등록</span>';
    }
  }

  function updateAiStatusIndicator() {
    const el = $('ai-status-indicator');
    if (!el) return;

    const rawKey = State.geminiKey || localStorage.getItem('st_gemini_key') || '';
    const key = cleanApiKey(rawKey);

    if (!key) {
      el.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800 flex items-center gap-1 select-none shadow-sm';
      el.title = 'Gemini API 키 미등록';
      el.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span><span id="ai-status-text">키 필요</span>';
    } else if (State.aiFallbackActive) {
      el.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800 flex items-center gap-1 select-none shadow-sm';
      el.title = 'Gemini Fallback 백업 모델 작동 중';
      el.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span><span id="ai-status-text">Fallback</span>';
    } else {
      el.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-1 select-none shadow-sm';
      el.title = 'API 키가 등록되어 있습니다. 실제 연결은 AI 요청 또는 연결 테스트에서 확인됩니다.';
      el.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span><span id="ai-status-text">키 등록됨</span>';
    }
  }

  function updateGeminiKeyUi() {
    updateAiStatusIndicator();
    updateAiChatStatusBadge();
    const currentKey = State.geminiKey || '';
    const input = $('modal-cfg-gemini-key');
    const tabKey = $('cfg-gemini-key');
    const eyeBtn = $('btn-toggle-gemini-key');
    const lockedIcon = $('icon-gemini-key-locked');
    const mainBtn = $('btn-save-gemini-key');
    const mainBtnTxt = $('btn-save-gemini-key-txt');
    const cancelBtn = $('btn-cancel-gemini-key');
    const deleteBtn = $('btn-delete-gemini-key');
    const badge = $('gemini-key-status-badge');
    const preview = $('gemini-key-preview-text');

    if (tabKey && tabKey.value !== currentKey) {
      tabKey.value = currentKey;
    }

    const hasRegisteredKey = Boolean(currentKey && currentKey.length > 5);

    if (hasRegisteredKey && !isGeminiKeyEditMode) {
      if (input) {
        input.value = '••••••••••••••••••••••••';
        input.disabled = true;
        input.readOnly = true;
        input.type = 'password';
        input.className = 'w-full pl-3 pr-9 py-2 bg-stone-100 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-500 select-none cursor-not-allowed font-mono transition';
      }
      if (eyeBtn) eyeBtn.classList.add('hidden');
      if (lockedIcon) lockedIcon.classList.remove('hidden');

      if (badge) {
        badge.className = 'text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1';
        badge.innerHTML = '<i class="fa-solid fa-key text-emerald-600"></i> 키 등록됨 · 입력 가림';
      }
      if (preview) {
        preview.className = 'font-semibold text-emerald-700 dark:text-emerald-400 truncate text-[11px]';
        preview.innerHTML = '<i class="fa-solid fa-database text-[10px] mr-1"></i>이 브라우저에 저장 (암호화되지 않음)';
      }
      if (mainBtn && mainBtnTxt) {
        mainBtn.className = 'px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 cursor-pointer transition-all flex items-center gap-1 bg-amber-500/15 hover:bg-amber-500/25 text-[#a2601b] dark:text-[#d4af37] border border-amber-500/30';
        mainBtnTxt.innerHTML = '<i class="fa-solid fa-pen-to-square text-[10px]"></i> <span>키 변경</span>';
      }
      if (cancelBtn) cancelBtn.classList.add('hidden');
      if (deleteBtn) deleteBtn.classList.remove('hidden');
    } else {
      if (input) {
        input.disabled = false;
        input.readOnly = false;
        if (!isGeminiKeyEditMode) {
          input.value = currentKey;
        }
        input.className = 'w-full pl-3 pr-9 py-2 bg-[#faf8f5] dark:bg-[#16181d] border border-[#e8e2d5] dark:border-stone-700 rounded-xl text-xs text-[#1c1917] dark:text-[#ededed] focus:outline-none focus:border-[#a2601b] font-mono transition';
      }
      if (eyeBtn) eyeBtn.classList.remove('hidden');
      if (lockedIcon) lockedIcon.classList.add('hidden');

      if (hasRegisteredKey) {
        if (badge) {
          badge.className = 'text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1';
          badge.innerHTML = '<i class="fa-solid fa-pen text-amber-600"></i> 새 키 입력 중';
        }
        if (preview) {
          preview.className = 'font-medium text-stone-500 dark:text-stone-400 truncate text-[11px]';
          preview.innerText = '새 API 키를 붙여넣고 [저장]을 누르세요.';
        }
        if (cancelBtn) cancelBtn.classList.remove('hidden');
        if (deleteBtn) deleteBtn.classList.remove('hidden');
      } else {
        if (badge) {
          badge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 flex items-center gap-1';
          badge.innerHTML = '<i class="fa-solid fa-circle-exclamation text-amber-500"></i> 미등록 (오프라인 모드)';
        }
        if (preview) {
          preview.className = 'font-medium text-stone-400 truncate text-[11px]';
          preview.innerText = '등록된 키 없음 (AI 기능 사용 시 등록 필요)';
        }
        if (cancelBtn) cancelBtn.classList.add('hidden');
        if (deleteBtn) deleteBtn.classList.add('hidden');
      }

      if (mainBtn && mainBtnTxt) {
        mainBtn.className = 'btn-gold px-4 py-2 rounded-xl text-xs font-bold shrink-0 cursor-pointer shadow-sm transition-all flex items-center gap-1';
        mainBtnTxt.innerHTML = '<i class="fa-solid fa-check text-[10px]"></i> <span>저장</span>';
      }
    }
  }

  function handleGeminiKeyMainAction() {
    const currentKey = State.geminiKey || '';
    const hasRegisteredKey = Boolean(currentKey && currentKey.length > 5);
    if (hasRegisteredKey && !isGeminiKeyEditMode) {
      isGeminiKeyEditMode = true;
      updateGeminiKeyUi();
      const input = $('modal-cfg-gemini-key');
      if (input) {
        input.value = '';
        input.focus();
      }
    } else {
      saveGeminiKeyFromModal();
    }
  }

  function cancelGeminiKeyEdit() {
    isGeminiKeyEditMode = false;
    updateGeminiKeyUi();
  }

  function deleteGeminiKey() {
    if (!confirm('등록된 Gemini API 키를 정말로 삭제하시겠습니까?\n삭제 시 AI 일정 생성 및 윤문 기능이 오프라인 모드로 전환됩니다.')) {
      return;
    }
    State.geminiKey = '';
    State.aiFallbackActive = false;
    try { localStorage.removeItem('st_gemini_key'); } catch (_) {}
    const tabKey = $('cfg-gemini-key');
    if (tabKey) tabKey.value = '';
    const input = $('modal-cfg-gemini-key');
    if (input) input.value = '';
    isGeminiKeyEditMode = false;
    updateGeminiKeyUi();
    showToast('🗑️ Gemini API 키가 이 브라우저에서 삭제되었습니다.');
  }

  function toggleGeminiKeyVisibility() {
    const input = $('modal-cfg-gemini-key');
    const icon = $('icon-gemini-key-eye');
    if (!input || input.disabled) return;
    if (input.type === 'password') {
      input.type = 'text';
      if (icon) {
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
      }
    } else {
      input.type = 'password';
      if (icon) {
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
      }
    }
  }

  function saveGeminiKeyFromModal() {
    const input = $('modal-cfg-gemini-key');
    if (!input) return;
    const cleanKey = cleanApiKey(input.value);
    if (!cleanKey) {
      showToast('⚠️ 유효한 API 키를 입력해 주세요 (AI Studio에서 발급받은 키).');
      input.focus();
      return;
    }
    State.geminiKey = cleanKey;
    State.aiFallbackActive = false;
    try { localStorage.setItem('st_gemini_key', cleanKey); } catch (_) {}
    const tabKey = $('cfg-gemini-key');
    if (tabKey) tabKey.value = cleanKey;

    isGeminiKeyEditMode = false;
    updateGeminiKeyUi();
    showToast('🔑 Gemini API 키를 이 브라우저에 저장했습니다. 브라우저 저장소에는 암호화되지 않습니다.');
  }

  function saveGeminiKey() {
    const input = $('cfg-gemini-key');
    const raw = input ? input.value : '';
    const k = cleanApiKey(raw);
    State.geminiKey = k;
    State.aiFallbackActive = false;
    try {
      if (k) localStorage.setItem('st_gemini_key', k);
      else localStorage.removeItem('st_gemini_key');
    } catch (_) {}
    if (input) input.value = k;
    const modalKey = $('modal-cfg-gemini-key');
    if (modalKey) modalKey.value = k;
    isGeminiKeyEditMode = false;
    updateGeminiKeyUi();
    closeModal('modal-settings', true);
    showToast('🔑 Gemini API 키를 이 브라우저에 저장했습니다. 브라우저 저장소에는 암호화되지 않습니다.');
  }

  async function testGeminiApiKey() {
    const storedKey = cleanApiKey(State.geminiKey || '');
    const input = $('modal-cfg-gemini-key');
    const testBtn = $('btn-test-gemini-key');

    // 입력창이 잠겨 있지 않고 사용자가 새 키를 입력한 경우(최초 입력 포함) 그 값을 후보로 검증한다.
    const typedKey = (input && !input.disabled && input.value.trim()) ? cleanApiKey(input.value) : '';
    const candidateKey = typedKey || storedKey;

    if (!candidateKey) {
      showToast('⚠️ 먼저 Gemini API 키를 입력해 주세요.');
      if (input) {
        if (storedKey) {
          isGeminiKeyEditMode = true;
          updateGeminiKeyUi();
        }
        input.focus();
      }
      return;
    }

    const testingUnsavedKey = Boolean(typedKey && typedKey !== storedKey);
    const prevKey = State.geminiKey;
    const prevFallback = State.aiFallbackActive;

    if (geminiTestResetTimer) {
      clearTimeout(geminiTestResetTimer);
      geminiTestResetTimer = null;
    }
    if (testBtn) {
      testBtn.disabled = true;
      testBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-[10px]"></i> <span>연결 확인 중...</span>';
    }

    try {
      if (testingUnsavedKey) {
        State.geminiKey = candidateKey;
        State.aiFallbackActive = false;
      }
      // 연결 테스트도 실제 생성과 같은 무료 모델 폴백 순서를 사용한다.
      const responseText = await callGeminiApiWithFallback('Reply with only OK.', { timeoutMs: 8000 });
      if (!responseText) throw new Error('EMPTY_RESPONSE');

      if (testingUnsavedKey) {
        try { localStorage.setItem('st_gemini_key', candidateKey); } catch (_) {}
        const tabKey = $('cfg-gemini-key');
        if (tabKey) tabKey.value = candidateKey;
        isGeminiKeyEditMode = false;
        updateGeminiKeyUi();
      }

      if (testBtn) {
        testBtn.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-500"></i> <span class="text-emerald-600 dark:text-emerald-400 font-bold">정상 작동!</span>';
      }
      showToast('✅ 등록된 API 키로 Gemini 모델에 연결했습니다.');
    } catch (err) {
      // 실패한 후보 키는 저장하지 않고 기존 정상 키 상태를 그대로 복원한다.
      if (testingUnsavedKey) {
        State.geminiKey = prevKey;
        State.aiFallbackActive = prevFallback;
        updateAiStatusIndicator();
        updateAiChatStatusBadge();
      }
      if (testBtn) {
        testBtn.innerHTML = '<i class="fa-solid fa-circle-xmark text-rose-500"></i> <span class="text-rose-600 dark:text-rose-400 font-bold">연결 실패</span>';
      }
      const message = err.code === 'INVALID_API_KEY'
        ? 'API 키가 유효하지 않습니다.'
        : err.code === 'QUOTA_EXCEEDED'
          ? 'API 한도를 확인하세요.'
          : '인터넷, API 키 권한과 사용 가능한 모델을 확인하세요.';
      showToast(`❌ Gemini 연결 실패: ${message}`);
    } finally {
      geminiTestResetTimer = setTimeout(() => {
        geminiTestResetTimer = null;
        if (testBtn) {
          testBtn.disabled = false;
          testBtn.innerHTML = TEST_BTN_DEFAULT_HTML;
        }
      }, 3000);
    }
  }

  // ── 4. PWA 설치·시작 가이드 배너·설치 안내 모달 ──
  function setupPwaInstallPrompt() {
    if (pwaListenersAttached) return;
    pwaListenersAttached = true;

    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      State.deferredPrompt = e;
      updatePwaUiState();
    });

    window.addEventListener('appinstalled', () => {
      State.deferredPrompt = null;
      showToast('🎉 술술트래블이 홈 화면에 성공적으로 설치되었습니다!');
      updatePwaUiState();
      closeModal('modal-install-guide', true);
    });
  }

  function updatePwaUiState() {
    const installed = isInstalled();
    const settingsPwaBadge = $('settings-pwa-status');
    if (settingsPwaBadge) {
      if (installed) {
        settingsPwaBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
        settingsPwaBadge.innerText = '✅ PWA 단독 앱으로 구동 중';
      } else {
        settingsPwaBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-stone-800 text-slate-600 dark:text-stone-300 border border-slate-200 dark:border-stone-700';
        settingsPwaBadge.innerText = '웹 브라우저로 실행 중 (홈 화면 설치 가능)';
      }
    }

    const settingsInstallBtn = $('btn-settings-install');
    if (settingsInstallBtn) {
      if (installed) {
        settingsInstallBtn.className = 'px-3.5 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 text-xs font-bold transition shrink-0 border border-stone-200 dark:border-stone-700 cursor-default';
        settingsInstallBtn.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-600 dark:text-emerald-400"></i> 설치됨';
      } else {
        settingsInstallBtn.className = 'px-3.5 py-1.5 rounded-xl btn-gold text-xs font-bold transition shrink-0 cursor-pointer shadow-sm';
        settingsInstallBtn.innerText = '앱 설치';
      }
    }

    const btn = $('btn-native-install');
    const btnTxt = $('btn-native-install-txt');
    if (btn) {
      btn.className = 'hidden';
      if (btnTxt) {
        btnTxt.innerText = installed ? 'PWA 구동 중' : '앱 설치';
      }
    }
    renderSmartWelcomeBanner();
  }

  function triggerNativeInstall() {
    if (isInstalled()) {
      showToast('✅ 이미 홈 화면에 앱(PWA)으로 설치되어 실행 중입니다 ✈️');
      return;
    }
    if (State.deferredPrompt) {
      const promptEvent = State.deferredPrompt;
      State.deferredPrompt = null;
      promptEvent.prompt();
      promptEvent.userChoice.then(choiceResult => {
        if (choiceResult && choiceResult.outcome === 'accepted') {
          showToast('🎉 술술트래블이 홈 화면에 설치되었습니다! 홈 화면에서 열어보세요.');
          updatePwaUiState();
          closeModal('modal-install-guide', true);
        } else {
          showToast('설치를 취소했습니다. 상단 버튼에서 언제든 다시 설치할 수 있습니다.');
        }
      }).catch(() => {});
      return;
    }

    const app = inApp();
    if (app) {
      showToast(`⚠️ ${app} 내부에서는 직접 설치가 불가능합니다. Chrome이나 Safari로 열어주세요.`);
      openInstallGuideModal();
    } else if (isIOS()) {
      showToast('🍎 사파리 공유(우측 상단 또는 하단 ⬆) 버튼을 눌러 [홈 화면에 추가]를 선택해주세요.', 3500);
      openInstallGuideModal('ios');
    } else {
      showToast('💡 브라우저 우측 상단 메뉴(⋮)에서 [앱 설치] 또는 [홈 화면에 추가]를 눌러주세요.');
      openInstallGuideModal('android');
    }
  }

  function handleInstallButtonClick() {
    if (isInstalled()) {
      showToast('✅ 이미 홈 화면에 앱(PWA)으로 설치되어 실행 중입니다 ✈️');
      return;
    }
    if (State.deferredPrompt) {
      triggerNativeInstall();
    } else {
      openInstallGuideModal();
    }
  }

  function handleInstallBannerClick() {
    if (State.deferredPrompt) {
      triggerNativeInstall();
    } else {
      openInstallGuideModal();
    }
  }

  function dismissSmartWelcomeBanner() {
    try {
      localStorage.setItem('st_hide_swb', '1');
      sessionStorage.setItem('st_hide_swb', '1');
    } catch (_) {}
    const banner = $('smart-welcome-banner');
    if (banner) {
      banner.classList.add('hidden');
      banner.innerHTML = '';
    }
    showToast('💡 시작 가이드 배너가 닫혔습니다. (설정에서 다시 표시 가능)');
  }

  function restoreSmartWelcomeBanner() {
    try {
      localStorage.removeItem('st_hide_swb');
      sessionStorage.removeItem('st_hide_swb');
    } catch (_) {}
    renderSmartWelcomeBanner();
    showToast('💡 시작 가이드 배너가 다시 활성화되었습니다.');
  }

  function copyCurrentUrl() {
    const url = window.location.href.split('#')[0];
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        showToast('📋 앱 접속 주소가 복사되었습니다!');
      }).catch(() => {
        showToast('주소 복사에 실패했습니다. 주소창에서 직접 복사해 주세요.');
      });
    } else {
      showToast('주소: ' + url);
    }
  }

  function renderSmartWelcomeBanner() {
    const banner = $('smart-welcome-banner');
    if (!banner) return;
    const installed = isInstalled();
    let isHidden = false;
    try {
      isHidden = localStorage.getItem('st_hide_swb') === '1' || sessionStorage.getItem('st_hide_swb') === '1';
    } catch (_) {}
    if (installed || isHidden) {
      banner.classList.add('hidden');
      banner.innerHTML = '';
      return;
    }
    banner.classList.remove('hidden');
    banner.innerHTML = [
      '<div class="rounded-2xl bg-gradient-to-r from-amber-500/15 via-[#141c2e] to-[#0f1422] border border-amber-500/30 p-3.5 sm:p-4 shadow-lg shadow-black/30">',
      '  <div class="flex items-center justify-between gap-3">',
      '    <div class="flex items-center gap-3 min-w-0 cursor-pointer" data-on-click="settings.installBanner">',
      '      <span class="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-base shrink-0 pulse-gold">📲</span>',
      '      <div class="min-w-0">',
      '        <div class="flex items-center gap-1.5 text-[11px] font-bold text-amber-400">',
      '          <span>💡 시작 가이드</span>',
      '          <span class="text-slate-400 font-normal hidden sm:inline">| 오프라인에서도 빠르게 열기</span>',
      '        </div>',
      '        <div class="text-xs sm:text-sm font-extrabold text-white truncate">터치 한 번으로 홈 화면에 앱 설치하기</div>',
      '      </div>',
      '    </div>',
      '    <div class="flex items-center gap-2 shrink-0">',
      '      <button type="button" data-on-click="settings.installBanner" class="btn-gold px-3.5 py-1.5 rounded-lg text-xs font-black shadow-md cursor-pointer">앱 설치</button>',
      '      <button type="button" data-on-click="settings.dismissWelcome" class="text-slate-400 hover:text-white p-1 text-sm transition cursor-pointer" title="배너 닫기">✕</button>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('');
  }

  function checkStartupInstallOnboarding() {
    updatePwaUiState();
  }

  function buildChromeIntentUrl(currentUrl) {
    const scheme = /^http:\/\//i.test(currentUrl) ? 'http' : 'https';
    return 'intent://' + currentUrl.replace(/^https?:\/\//i, '') + `#Intent;scheme=${scheme};package=com.android.chrome;end`;
  }

  function openInstallGuideModal(preferredPlatform) {
    const dynamicBox = $('install-guide-dynamic-box');
    const installed = isInstalled();
    const app = inApp();
    const currentUrl = window.location.href.split('#')[0];
    const chromeIntent = buildChromeIntentUrl(currentUrl);

    if (dynamicBox) {
      if (installed) {
        dynamicBox.innerHTML = [
          '<div class="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-semibold flex items-center gap-2.5">',
          '  <span class="text-lg">✅</span>',
          '  <div>',
          '    <b>이미 홈 화면 단독 앱(PWA)으로 실행 중입니다.</b><br>',
          '    <span class="text-emerald-400/80 text-[11px]">저장된 일정과 기록은 오프라인에서도 이어서 확인할 수 있습니다. 기기 변경 전에는 설정에서 JSON 백업을 권장합니다.</span>',
          '  </div>',
          '</div>'
        ].join('');
      } else if (app) {
        const parts = [
          '<div class="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-xl space-y-2.5">',
          `  <div class="text-xs text-amber-300 font-bold flex items-center gap-1.5"><span>⚠️</span><span><b>${escapeHtml(app)} 인앱 브라우저</b>에서는 직접 설치가 지원되지 않습니다.</span></div>`,
          '  <div class="text-[11px] text-slate-300 leading-relaxed">인앱 브라우저는 홈 화면 추가 권한을 제공하지 않습니다. 원활한 앱 설치와 데이터 보호를 위해 기본 브라우저에서 열어주세요.</div>'
        ];
        if (isIOS()) {
          parts.push(
            '  <div class="p-2.5 bg-[#080b12] rounded-lg border border-[#1e263c] text-xs text-slate-300 space-y-1">',
            '    <div class="font-bold text-amber-400">🍎 Safari로 전환하기:</div>',
            '    <div>우측 하단(또는 상단) <b>⋯ / 나침반</b> 아이콘 터치 → <b>Safari로 열기</b> 선택</div>',
            '  </div>'
          );
        } else {
          parts.push(
            `  <a href="${escapeHtml(chromeIntent)}" class="btn-gold w-full py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md">`,
            '    <i class="fa-brands fa-chrome"></i><span>Chrome(크롬) 브라우저로 열기</span>',
            '  </a>'
          );
        }
        parts.push(
          '  <button type="button" data-on-click="settings.copyCurrentUrl" class="btn-surface w-full py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white cursor-pointer">',
          '    <i class="fa-solid fa-copy mr-1 text-[11px]"></i> 주소 복사하기',
          '  </button>',
          '</div>'
        );
        dynamicBox.innerHTML = parts.join('');
      } else if (isIOS()) {
        dynamicBox.innerHTML = [
          '<div class="p-4 theme-card rounded-2xl border-2 border-amber-500/40 space-y-3 shadow-sm">',
          '  <div class="flex items-center gap-2 text-sm font-black text-[#a2601b] dark:text-[#d4af37]"><span class="text-lg">🍎</span><span>아이폰·아이패드 사파리(Safari) 간편 설치 안내</span></div>',
          '  <div class="text-xs font-medium text-[#1c1917] dark:text-stone-200 leading-relaxed">아이폰에서는 사파리 브라우저의 <b>공유 버튼 ( 📤 )</b>을 누르고 <b>[홈 화면에 추가]</b>를 선택하시면 1초 만에 앱으로 설치됩니다.</div>',
          '  <div class="p-3 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-xs text-[#78350f] dark:text-amber-200 space-y-1">',
          '    <div class="font-bold flex items-center gap-1.5"><i class="fa-solid fa-circle-info text-amber-600 dark:text-amber-400"></i><span>공유 버튼 위치 안내:</span></div>',
          '    <div class="text-[11px] leading-relaxed pl-5 font-semibold text-[#92400e] dark:text-amber-300">사파리 주소창 설정에 따라 <u>화면 오른쪽 상단</u> 또는 <u>하단 중앙</u>에 위치합니다.</div>',
          '  </div>',
          '</div>'
        ].join('');
      } else {
        dynamicBox.innerHTML = [
          '<div class="space-y-2">',
          '  <button id="btn-modal-direct-install" type="button" data-on-click="settings.triggerInstall" class="btn-gold w-full py-3.5 px-4 rounded-xl text-sm font-black flex items-center justify-center gap-2 cursor-pointer pulse-gold shadow-lg shadow-amber-500/20">',
          '    <i class="fa-solid fa-download text-sm"></i><span>📲 지금 바로 홈 화면에 앱 설치하기</span>',
          '  </button>',
          '  <div class="text-[11px] text-slate-400 text-center">(터치 시 브라우저 설치 팝업이 바로 뜹니다. 메뉴의 [앱 설치]로도 가능합니다)</div>',
          '</div>'
        ].join('');
      }
    }

    let targetPlatform = preferredPlatform;
    if (!targetPlatform) {
      if (isIOS()) targetPlatform = 'ios';
      else if (!/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) targetPlatform = 'pc';
      else targetPlatform = 'android';
    }
    switchInstallTab(targetPlatform);
    openModal('modal-install-guide');
  }

  function switchInstallTab(platform) {
    const safePlatform = INSTALL_PLATFORMS.includes(platform) ? platform : 'android';
    INSTALL_PLATFORMS.forEach(p => {
      const active = p === safePlatform;
      const btn = $(`tab-inst-${p}`);
      const view = $(`inst-guide-${p}`);
      if (btn) {
        btn.className = active
          ? 'flex-1 py-1.5 text-xs font-black rounded-lg tab-install-active shadow-sm transition'
          : 'flex-1 py-1.5 text-xs font-semibold rounded-lg tab-install-inactive transition';
        btn.setAttribute('aria-pressed', String(active));
      }
      if (view) {
        view.classList.toggle('hidden', !active);
      }
    });
  }

  // ── 5. 버전 기록·후원·안내 모달 ──
  function openVersionHistoryModal(fromModalId) {
    if (fromModalId) closeModal(fromModalId, true);
    openModal('modal-version-history');
  }

  function openDonationModal() {
    openModal('modal-donation');
  }

  async function copyDonationLink() {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(SULSUL_DONATION_URL);
      } else {
        const ta = document.createElement('textarea');
        ta.value = SULSUL_DONATION_URL;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      showToast('후원 링크를 복사했습니다');
    } catch (_) {
      showToast('복사에 실패했습니다 — 링크를 직접 방문해 주세요');
    }
  }

  function openDonationLink() {
    window.open(SULSUL_DONATION_URL, '_blank', 'noopener,noreferrer');
  }

  function openUserGuideModal() {
    openModal('modal-user-guide');
  }

  function openDeviceSyncModal() {
    openModal('modal-device-sync');
  }

  function openPrivacyModal() {
    openModal('modal-privacy');
  }

  T.UiActions.define('settings', {
    open: el => openSettingsModal(el.dataset.tab || 'theme'),
    openFromModal: el => openSettingsFromModal(el.dataset.closeModal || '', el.dataset.tab || 'theme'),
    switchTab: el => switchSettingsTab(el.dataset.tab),
    setTheme: el => setTheme(el.dataset.theme),
    toggleTheme: () => toggleTheme(),
    toggleGeminiVisibility: () => toggleGeminiKeyVisibility(),
    geminiMainAction: () => handleGeminiKeyMainAction(),
    cancelGeminiEdit: () => cancelGeminiKeyEdit(),
    deleteGeminiKey: () => deleteGeminiKey(),
    testGeminiKey: () => testGeminiApiKey(),
    saveLegacyGeminiKey: () => saveGeminiKey(),
    installButton: () => handleInstallButtonClick(),
    installBanner: () => handleInstallBannerClick(),
    triggerInstall: () => triggerNativeInstall(),
    switchInstallTab: el => switchInstallTab(el.dataset.platform),
    dismissWelcome: () => dismissSmartWelcomeBanner(),
    restoreWelcome: () => restoreSmartWelcomeBanner(),
    copyCurrentUrl: () => copyCurrentUrl(),
    openVersionHistory: el => {
      const details = el && typeof el.closest === 'function' ? el.closest('details') : null;
      if (details) details.open = false;
      openVersionHistoryModal(el?.dataset?.closeModal || '');
    },
    openDonation: () => openDonationModal(),
    copyDonationLink: () => copyDonationLink(),
    openDonationLink: () => openDonationLink(),
    openUserGuide: () => openUserGuideModal(),
    openDeviceSync: () => openDeviceSyncModal(),
    openPrivacy: () => openPrivacyModal()
  });

  T.SettingsUI = Object.freeze({
    DONATION_URL: SULSUL_DONATION_URL,
    isIOS,
    isInstalled,
    inApp,
    setTheme,
    toggleTheme,
    updateThemeUi,
    open: openSettingsModal,
    openFromModal: openSettingsFromModal,
    switchTab: switchSettingsTab,
    updateAiChatStatusBadge,
    updateAiStatusIndicator,
    updateGeminiKeyUi,
    handleGeminiKeyMainAction,
    cancelGeminiKeyEdit,
    deleteGeminiKey,
    toggleGeminiKeyVisibility,
    saveGeminiKeyFromModal,
    saveGeminiKey,
    testGeminiApiKey,
    setupPwaInstallPrompt,
    updatePwaUiState,
    triggerNativeInstall,
    handleInstallButtonClick,
    handleInstallBannerClick,
    dismissSmartWelcomeBanner,
    restoreSmartWelcomeBanner,
    copyCurrentUrl,
    renderSmartWelcomeBanner,
    checkStartupInstallOnboarding,
    openInstallGuideModal,
    switchInstallTab,
    openVersionHistoryModal,
    openDonationModal,
    copyDonationLink,
    openDonationLink,
    openUserGuideModal,
    openDeviceSyncModal,
    openPrivacyModal
  });
})(typeof window !== 'undefined' ? window : globalThis);
