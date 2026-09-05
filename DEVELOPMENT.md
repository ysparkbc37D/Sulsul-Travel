# 🛠️ 술술트래블 개발 셋업 및 기여 가이드 (DEVELOPMENT.md)

본 문서는 **술술트래블 (Sulsul-Travel)**의 로컬 개발 환경 구성, 디버깅, PWA 검증, 코드 작성 규칙 및 릴리즈 절차를 안내하는 **공식 개발자 가이드**입니다.

---

## 1. 기술 스택 & 철학 (Zero-Backend Philosophy)

술술트래블은 복잡한 번들러나 백엔드 인프라 없이 **웹 표준 기술(Web Standards)만으로 최고의 사용자 경험을 제공하는 Zero-Backend PWA**입니다:

* **Frontend**: HTML5, Vanilla Modern JavaScript (ES2022+), Tailwind CSS (CDN / Utility Classes), Dark Luxury 테마
* **AI Engine**: Google Gemini API (`gemini-2.5-flash` $\rightarrow$ `gemini-2.0-flash` $\rightarrow$ `gemini-1.5-flash` 3단계 폴백 루프)
* **Offline Storage**: Browser `localStorage` (Single Source of Truth) + Browser Canvas Image Normalizer
* **PWA & Network**: Service Worker (`sw.js`, Stale-While-Revalidate 캐싱), Web App Manifest (`manifest.webmanifest`)
* **Hosting**: GitHub Pages (100% 영구 무료 정적 웹 호스팅)

> **💡 개발 환경의 최대 장점**: Node.js, npm, webpack, vite 등의 빌드 도구가 전혀 필요 없으며, 소스 코드를 수정하고 브라우저를 새로고침하면 0.1초 만에 즉시 반영됩니다.

---

## 2. 로컬 개발 환경 셋업 (Quick Start)

### 방법 A. 초간단 직접 실행 (Static File Open)
`index.html` 파일을 더블 클릭하거나 Chrome/Edge 브라우저로 드래그 앤 드롭하여 바로 실행합니다.  
대부분의 기능(일정 플래너, 가계부, 앨범, 체크리스트, AI 챗봇)을 즉시 테스트할 수 있습니다.

### 방법 B. 로컬 PWA & 서비스 워커 테스트 (권장)
Service Worker와 PWA 설치 배너를 완벽하게 테스트하려면 `localhost` HTTP 환경이 필요합니다.  
Node.js나 Python 설치 없이, 프로젝트에 포함된 **PowerShell 로컬 서버**를 실행하면 됩니다:

```powershell
# Sulsul-Travel 디렉터리에서 실행
.\tools-serve.ps1
```
* 브라우저에서 `http://localhost:8080/`로 접속합니다.
* `Ctrl + C`를 누르면 서버가 즉시 안전하게 종료됩니다.

---

## 3. 디버깅 및 개발 도구 활용법

### ① 브라우저 로컬 스토리지 검사
1. 브라우저에서 `F12`를 눌러 개발자 도구를 엽니다.
2. **Application (애플리케이션)** 탭 ➔ 좌측의 **Storage** ➔ **Local Storage** 클릭
3. 저장된 핵심 키 확인:
   - `st_current_trip`: 현재 일정 및 30분 단위 타임라인 데이터
   - `st_expenses`: 가계부 지출 내역
   - `st_journals`: 일자별 사진 및 감성 여행기
   - `st_checklist`: 체크리스트 상태
   - `st_mep_enabled`: 아르헨티나 MEP 우대 환율 활성화 상태
   - `st_gemini_key`: 입력된 Gemini API 키

### ② 오프라인 모드 (비행기 모드) 시뮬레이션
1. 개발자 도구의 **Network (네트워크)** 탭으로 이동합니다.
2. Throttling 드롭다운에서 `Online` ➔ **`Offline`**으로 변경합니다.
3. 페이지를 새로고침(`F5`)합니다.
4. **검증 기준**: `sw.js`에 의해 캐시된 앱 셸이 로드되고, 모든 일정/가계부/앨범 기능이 100% 정상 작동해야 합니다.

### ③ 3:4 캔버스 사진 압축 검증
1. 다이어리 탭에서 10MB 이상의 고해상도 사진을 업로드합니다.
2. `Console` 창에서 저장된 이미지 DataURL의 크기를 확인합니다 (`length` 기준 약 100~200KB 수준으로 정규화되는지 확인).

---

## 4. 사전 배포 자동 게이트키퍼 검증 (`tools-verify.ps1`)

버전을 업데이트하거나 코드를 수정한 후에는 프로젝트 루트에 있는 **자동 게이트키퍼 검증 스크립트**를 실행합니다:

```powershell
.\tools-verify.ps1
```

### 게이트키퍼가 검증하는 4대 항목:
1. **[Gate 1] 필수 파일 존재성**: `index.html`, `sw.js`, `manifest.webmanifest`, `kb-travel.js`, `CHANGELOG.md`, `술술트래블신록.md`, `DEVELOPMENT.md`, `README.md`, 고해상도 PWA 아이콘 5종의 존재 여부.
2. **[Gate 2] 버전 3중 일치 (Triple Version Match)**:
   - `index.html`의 `const APP_VER`
   - `sw.js`의 `const V`
   - `CHANGELOG.md`의 최신 헤더 버전
3. **[Gate 3] 불변 법칙(Invariant Laws) DOM ID 및 필수 함수 검증**:
   - `#top-analytics`, `#tab-content-plan`, `#tab-content-expenses` 등 핵심 DOM ID 온전성
   - `gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash` 3단계 모델 폴백 체인
   - 3:4 캔버스 정규화 함수 및 MEP 토글 스위치 존재 여부
4. **[Gate 4] Headless Microsoft Edge V8 파싱 및 런타임 오류 0건 검증**:
   - 백그라운드 브라우저 엔진으로 앱을 로드하여 자바스크립트 문법 오류 및 콘솔 에러가 단 1건도 없는지 확인.

---

## 5. 버전 릴리즈 및 GitHub Pages 배포 절차

새로운 기능을 릴리즈할 때는 다음 절차를 따릅니다:

1. **버전 번호 결정**: `주.부.수` 원칙에 따라 버전 증가 (예: `v1.0.0` ➔ `v1.0.1`)
2. **코드 내 버전 동기화**:
   - `index.html` 내 `const APP_VER = '1.0.1';` 갱신
   - `sw.js` 내 `const V = 'st-shell-v1.0.1';` 갱신
3. **CHANGELOG.md 업데이트**:
   - `[Unreleased]` 항목을 새 버전 번호 및 날짜 헤더로 변경하고 변경 내역(Added, Fixed 등) 정리
4. **게이트키퍼 실행**:
   - `.\tools-verify.ps1` 실행 ➔ **ALL PASS** 확인
5. **Git 커밋 및 원격 푸시**:
   ```powershell
   git add .
   git commit -m "feat: release Sulsul-Travel v1.0.1 - [주요 변경 내용 요약]"
   git push origin main
   ```
6. **GitHub Pages 자동 반영**:
   - 푸시 후 약 1분 이내에 `https://ysparkbc37d.github.io/Sulsul-Travel/`에 자동 배포 완료.
