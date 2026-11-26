/* GitHub Gist 개인 스냅샷 백업 및 복원 (v2.2.7, 계획 4단계 18차).
 * index.html의 getGithubSyncConfig·saveGithubSyncConfig·updateGithubSyncUi·syncToGist·syncFromGist(약 160줄)을 옮겼다.
 * 셸 함수(collectTravelBackup·previewTravelBackupText·showToast·escapeHtml)와
 * 전역 State·TripRepository·TravelBackupUI·SulsulTravel.StorageHealth는 부를 때 찾는다.
 * 모든 동작은 data-on-click="gistSync.*"로 잇고, 불러올 때는 등록만 하고 문서를 건드리지 않는다. */
(function (root) {
  'use strict';
  const T = root.SulsulTravel = root.SulsulTravel || {};
  const $ = id => document.getElementById(id);

  let pushingGist = false;
  let pullingGist = false;

  function normalizeGistId(raw) {
    const trimmed = String(raw || '').trim();
    if (!trimmed) return '';
    const urlMatch = /^https?:\/\/gist\.github\.com\/(?:[^/\s#?]+\/)?([a-zA-Z0-9]+)(?:[/?#].*)?$/.exec(trimmed);
    return urlMatch ? urlMatch[1] : trimmed;
  }

  function getGithubSyncConfig() {
    return {
      pat: (localStorage.getItem('st_github_pat') || '').trim(),
      gistId: normalizeGistId(localStorage.getItem('st_github_gist') || '')
    };
  }

  function saveGithubSyncConfig(showFeedback = false) {
    const patInput = $('cfg-github-pat');
    const gistInput = $('cfg-github-gist');
    if (patInput) {
      localStorage.setItem('st_github_pat', patInput.value.trim());
    }
    if (gistInput) {
      const normalized = normalizeGistId(gistInput.value);
      gistInput.value = normalized;
      localStorage.setItem('st_github_gist', normalized);
    }
    updateGithubSyncUi();
    if (showFeedback) {
      showToast('💾 GitHub Gist 백업 설정이 이 브라우저에 저장되었습니다.');
    }
  }

  function updateGithubSyncUi() {
    const cfg = getGithubSyncConfig();
    const patInput = $('cfg-github-pat');
    const gistInput = $('cfg-github-gist');
    const statusBadge = $('gist-sync-status-badge');
    const lastSyncEl = $('gist-last-sync-time');

    if (patInput && !patInput.value) patInput.value = cfg.pat;
    if (gistInput && !gistInput.value) gistInput.value = cfg.gistId;

    if (statusBadge) {
      if (cfg.pat && cfg.gistId) {
        statusBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200';
        statusBadge.textContent = '백업 설정됨 (연결 미확인)';
      } else if (cfg.pat) {
        statusBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200';
        statusBadge.textContent = '토큰 저장됨 (연결 미확인)';
      } else {
        statusBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200';
        statusBadge.textContent = '연결 대기';
      }
    }

    const lastSyncTime = localStorage.getItem('st_github_last_sync');
    if (lastSyncEl) {
      lastSyncEl.textContent = lastSyncTime ? `마지막 백업/복원: ${lastSyncTime}` : '백업/복원 기록 없음';
    }
  }

  async function syncToGist() {
    if (pushingGist) return false;
    saveGithubSyncConfig(false);
    const cfg = getGithubSyncConfig();
    if (!cfg.pat) {
      alert('GitHub Personal Access Token (PAT)을 먼저 입력해 주세요.\n\n(GitHub > Settings > Developer Settings > Personal access tokens 에서 "gist" 권한으로 발급)');
      return false;
    }

    const btnPush = $('btn-gist-push');
    if (btnPush?.disabled) return false;
    pushingGist = true;
    const origText = btnPush ? btnPush.innerHTML : '';
    if (btnPush) {
      btnPush.disabled = true;
      btnPush.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> 백업 중...';
    }

    try {
      const backup = await collectTravelBackup();
      const contentStr = backup.json;

      let url = 'https://api.github.com/gists';
      let method = 'POST';

      const gistBody = {
        description: `Sulsul Travel Cloud Backup (${new Date().toLocaleString('ko-KR')})`,
        public: false,
        files: {
          'sulsul_travel_data.json': {
            content: contentStr
          }
        }
      };

      if (cfg.gistId) {
        url = `https://api.github.com/gists/${encodeURIComponent(cfg.gistId)}`;
        method = 'PATCH';
      }

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${cfg.pat}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(gistBody)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const newGistId = typeof data?.id === 'string' ? data.id.trim() : '';
      if (!newGistId) throw new Error('응답에 Gist ID가 없습니다.');
      localStorage.setItem('st_github_gist', newGistId);
      const gistInput = $('cfg-github-gist');
      if (gistInput) gistInput.value = newGistId;

      const nowStr = new Date().toLocaleString('ko-KR');
      localStorage.setItem('st_github_last_sync', `${nowStr} (백업)`);
      T.StorageHealth?.markBackup('gist');
      updateGithubSyncUi();

      showToast(`☁️ GitHub Gist 백업 성공! (Gist ID: ${escapeHtml(newGistId.slice(0, 8))}...)`);
      alert(`[☁️ GitHub Gist 개인 백업 성공]\n\n총 ${State.trips.length}개의 여행 데이터가 GitHub Gist에 저장되었습니다. 이 백업은 실시간 공동편집이 아닙니다.\n\n다른 기기에서 복원하려면 동일한 PAT와 Gist ID(${newGistId})를 입력한 뒤 [백업에서 복원]을 누르세요.`);
      return true;
    } catch (err) {
      console.error('[GistPush] error:', err);
      alert(`GitHub Gist 백업 실패: ${err.message}\nPAT 권한(gist 체크 여부)을 확인해주세요.`);
      return false;
    } finally {
      pushingGist = false;
      if (btnPush) {
        btnPush.disabled = false;
        btnPush.innerHTML = origText;
      }
    }
  }

  async function syncFromGist() {
    if (pullingGist) return false;
    saveGithubSyncConfig(false);
    const cfg = getGithubSyncConfig();
    if (!cfg.pat || !cfg.gistId) {
      alert('GitHub 토큰과 복원할 Gist ID를 입력해 주세요.');
      return false;
    }
    if (TravelBackupUI.busy) {
      showToast('현재 복원 처리를 마친 뒤 다시 불러와 주세요.');
      return false;
    }
    const button = $('btn-gist-pull');
    if (button?.disabled) return false;
    pullingGist = true;
    const original = button?.innerHTML;
    const baseRaw = TripRepository.token();
    const baseState = JSON.stringify(State.trips);
    const previewToken = TravelBackupUI.token;
    if (button) {
      button.disabled = true;
      button.textContent = '불러오는 중…';
    }
    try {
      const response = await fetch('https://api.github.com/gists/' + encodeURIComponent(cfg.gistId), {
        headers: { Authorization: 'Bearer ' + cfg.pat, Accept: 'application/vnd.github+json' }
      });
      if (!response.ok) {
        throw new Error('GitHub에서 백업을 읽지 못했습니다. 토큰과 Gist ID를 확인해 주세요. (HTTP ' + response.status + ')');
      }
      const data = await response.json();
      const files = data.files || {};
      const file = files['sulsul_travel_data.json'] || Object.values(files)[0];
      if (!file) throw new Error('Gist에 백업 파일이 없습니다.');
      let content = file.content;
      if (file.truncated) {
        const rawUrl = new URL(file.raw_url);
        if (rawUrl.protocol !== 'https:' || rawUrl.hostname !== 'gist.githubusercontent.com') {
          throw new Error('백업 원본 주소를 확인하지 못했습니다.');
        }
        const raw = await fetch(rawUrl.href, { redirect: 'error' });
        if (!raw.ok) throw new Error('백업 원본을 읽지 못했습니다. JSON 파일로 내려받아 불러와 주세요.');
        content = await raw.text();
      }
      if (typeof content !== 'string') throw new Error('Gist 파일 내용을 찾을 수 없습니다.');
      if (previewToken !== TravelBackupUI.token) {
        throw new Error('다른 백업 검토가 시작됐습니다. Gist를 다시 불러와 주세요.');
      }
      const ready = previewTravelBackupText(content,{filename:'GitHub Gist 백업',source:'gist',baseRaw,baseState});
      showToast('Gist 백업을 읽었습니다. 복원할 내용을 확인해 주세요.');
      return ready;
    } catch (error) {
      alert('GitHub Gist를 불러오지 못했습니다. 기존 여행은 유지됩니다. ' + error.message);
      return false;
    } finally {
      pullingGist = false;
      if (button) {
        button.disabled = false;
        button.innerHTML = original;
      }
    }
  }

  T.UiActions.define('gistSync', {
    save: () => saveGithubSyncConfig(true),
    push: () => syncToGist(),
    pull: () => syncFromGist()
  });

  T.GistSync = Object.freeze({
    normalizeGistId,
    getConfig: getGithubSyncConfig,
    saveConfig: saveGithubSyncConfig,
    updateUi: updateGithubSyncUi,
    push: syncToGist,
    pull: syncFromGist
  });
})(typeof window !== 'undefined' ? window : globalThis);
