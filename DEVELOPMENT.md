# 술술트래블 개발 가이드

이 문서는 현재 앱 구조와 검증 방식을 설명합니다. 이전 구조를 기술한 문서는 상단에 역사 자료 또는 목표 설계라고 표시합니다. 현재 소스 버전은 `2.0.8`입니다. 원격 저장소와 배포 반영 여부는 별도로 확인합니다.

## 실행 구조

- 정적 PWA: `index.html`, CSS, 로컬 JavaScript 모듈을 브라우저에서 실행합니다. 개인 사용은 서버 없이 가능하며 공동 계획만 선택형 Supabase REST 서버를 사용합니다.
- 앱 셸: `index.html`에 기존 화면과 전역 상태가 남아 있고, 저장·AI 오케스트레이션·RePlan·기록 편집·지출 편집·공유는 독립 파일로 분리되고 있습니다.
- 저장: 여행 컬렉션은 `localStorage['st_trips_v2']`에 저장합니다. 일기 초과 보관과 사진 Blob/썸네일은 IndexedDB를 사용합니다. 사진 JSON fallback도 남으므로 사진 전체 저장소 이전은 완료되지 않았습니다.
- AI: 브라우저가 사용자가 제공한 Gemini 키로 Google API를 호출합니다. AI 결과는 초안이며 승인이 있어야 적용됩니다.
- 공유: 링크/파일은 사본, Gist는 개인 백업, 서버 초대는 공동 계획 연결입니다. 서버 변경은 명시 확인/전송·비교/승인·revision 충돌 방어로 반영하며 자동 병합을 하지 않습니다.
- 예제: 공용 KB는 기능 설명용 가상 자료만 담습니다. 최초 방문 자동 주입이나 개인 자료로 채우는 자가 치유를 하지 않습니다. 사용자의 명시 선택으로 추가하고 정확한 ID·표식으로 삭제합니다.
- 배포: Vercel은 `tools/build-public.cjs`의 공개 파일 목록을 `public`에 복사한 결과만 제공해야 합니다. 개발 문서·첨부·검사·SQL 등 저장소 전체를 정적 웹 루트로 배포하지 않습니다.

## 주요 파일

| 파일 | 책임 |
| --- | --- |
| `index.html` | 앱 셸, 주요 화면, 전역 상태, 일부 레거시 기능 |
| `js/domain/trip-adapter.js` | 시드/구버전/공유/AI 입력 계약, 도시명, 현지 날짜, 여행 단계 |
| `js/domain/travel-story.js` | 날짜별 일정/실제 기록/원문·승인문과 출처 모델, 공통 비용 집계 |
| `js/domain/live-itinerary.js` | 안정 ID 수동 명령·기준안·최근 이력·Undo·공통 시간 해석 |
| `js/domain/spot-realignment.js` | 보호 일정·소요시간을 고려한 재정렬 미리보기 계산 |
| `js/presentation/spot-realignment-ui.js` | 변경 미리보기, 충돌 확인, 단일 저장 명령 |
| `js/presentation/live-itinerary-bridge.js` | 기존 폼과 저장 경계 연결·영향 범위 적용 |
| `js/presentation/live-itinerary-ui.js` | 삽입·순서·날짜 이동·보류·복구·변경 이력 UI |
| `js/domain/schedule-change.js` | 취소·보호 일정 판정, 시간 범위와 자정 지연 미리보기 |
| `js/presentation/schedule-change-ui.js` | 수동 변경·취소·복구·대체·지연 검토, 긴 글 전문 보기(`openReadableText`) |
| `js/domain/replan.mjs` | 보호 일정과 날짜/범위 RePlan 규칙 |
| `js/application/orchestration.mjs` | AI 작업 큐, 취소·재시도·승인 흐름 |
| `js/domain/ai-draft-validation.js` | 생성·승인의 동일 초안 계약과 보호 일정·범위 검증 |
| `js/infrastructure/storage/legacy-trip-repository.js` | `st_trips_v2` 문서 저장과 revision 경계 |
| `js/infrastructure/storage/settings-repository.js` | 손상 환율 설정 격리와 원문 보관 |
| `js/infrastructure/storage/journal-overflow-repository.js` | 용량 초과 하루 일기 임시 보관 |
| `js/infrastructure/storage/photo-compression.js` | 일반 사진·문서·썸네일의 용도별 압축과 자원 정리 |
| `js/domain/photo-optimization.js` | 기존 사진 출처·식별자 검사와 복사본 교체 |
| `js/infrastructure/storage/photo-cleanup.js` | 교체 후보 ID만 정리·모든 여행 참조 보호 |
| `js/presentation/photo-optimization-ui.js` | 절감량·확대 미리보기·선택 적용·실패 재시도 |
| `js/infrastructure/storage/media-repository.js` | 비율 유지 보관본, 썸네일, IndexedDB Blob과 JSON fallback |
| `js/infrastructure/storage/expense-photo-repository.js` | 지출 사진 durable 보관·JSON projection·부팅 원본 복원 |
| `js/infrastructure/storage/idb-trip-repository.js` | 여행 자료의 IndexedDB 저장소(`sulsul-travel-trips-v1`, 여행 하나 = 레코드 하나). 처음 열 때 기기 문서를 원문 보관 → 복사 → 대조 순서로 옮기고, 다른 창 충돌은 meta 버전으로 가른다 |
| `js/infrastructure/storage/trip-store.js` | 여행 저장의 비동기 명령 경계. 저장을 한 줄로 차례대로 실행하고 성공한 작업 안에서 `State.trips`를 바꾼다. 백엔드(localStorage·IndexedDB)를 바꿔도 부르는 쪽은 같다 |
| `js/infrastructure/storage/record-media-store.js` | 기록 사진을 IDB 보관본과 대조한 뒤 문서에서 빼기(project)·채우기(hydrate)·부팅 준비(prime)·옛 사진 보관(adopt), 첫 이전 전 원래 문서 보관 |
| `js/presentation/storage-health-ui.js` | 설정 → 데이터의 저장 공간·사진 보관소·영구 보관·마지막 백업 표시와 하루 한 번 백업 알림 |
| `js/presentation/mobile-navigation.js` | 사진·편집창·상세 복귀와 종료 확인의 단일 history 경계 |
| `js/domain/trip-transfer.js` | 버전 있는 여행 사본 검증·내보내기 계약 |
| `js/domain/travel-backup.js` | 전체 백업·구 파일 정규화·보조 일기 수집 계약 |
| `js/presentation/travel-backup-ui.js` | 파일 준비·저장·복원 미리보기·승인·손상 원문 보존 |
| `js/presentation/activity-journal.js` | 일정별 기록 편집, 사진, AI 윤문 승인 |
| `js/presentation/moment-journal.js` | 복수 순간 기록과 날짜별 피드, 저장/충돌/이탈 보호 |
| `js/presentation/travel-story-ui.js` | 공통 이야기 선택·Markdown/텍스트 내보내기 |
| `js/infrastructure/collaboration/` | 공개 키 REST 연결, 계획 전송·초대·권한·대기 변경 |
| `js/presentation/collaboration-*.js` | 공동 계획 연결·비교·승인·보기 전용 저장 경계 |
| `backend/supabase-travel.sql` | RLS 읽기와 권한 검증 RPC, 초대·변경 이력 |
| `js/presentation/expense-editor.js` | 지출·수입 입력창 전체(v2.1.3, `SulsulTravel.ExpenseEditor`): 간편·상세, 카드·현금, 지출·수입, 카테고리, 통화 칩, 출금 지갑 카드, 사진, 편집·저장·초안 파일. 폼 상태는 `SulsulTravel.ExpenseEditor.state`. 얼리지 않으며 안에서도 `api.compressPhoto`를 불러 검사가 사진 준비를 바꿔 끼울 수 있다 |
| `js/presentation/trip-transfer-ui.js` | 사본 링크·파일 공유와 가져오기 |
| `js/destinations/` | 국가/도시 목적지 지식 팩과 레지스트리 |
| `js/destinations/emergency-contacts.js` | 출처·확인일이 있는 국가별 긴급 번호와 오늘 도시 기준 국가 판별. 확인하지 못한 국가는 추정하지 않음 |
| `js/presentation/ui-actions.js` | 화면 동작 위임(v2.0.9). `data-on-click`·`data-on-change`·`data-on-input`의 동작 이름을 문서 한 곳에서 받아 `UiActions.define`으로 등록된 처리기로 넘긴다. 등록되지 않은 이름은 오류 |
| `js/presentation/expenses-tab.js` | 가계부 탭 본문(v2.1.1): 지갑 보드, 빠른 환율 계산기, 지출·환전 목록과 보기 전환, 환전 기록 안전 삭제. 공용 환율 계산(`CURRENCY_INFO`·`getCurrencyRate`·`calculateTripWallets`)은 셸에 있다 |
| `js/presentation/exchange-ui.js` | 환전 창과 환율 관리(v2.1.1): 금액·환율 계산과 저장, 실시간 환율 갱신(open.er-api.com), 맞춤 환율(`st_custom_rates`), 아르헨티나 MEP 스위치 |
| `js/presentation/plan-guides.js` | 계획 탭 예약 가이드·도시 가이드(v2.1.4, `SulsulTravel.PlanGuides`): 남미 팩 예약 체크리스트(팩 `bookings.items`, 완료는 `bookingStatuses`), 그 밖의 여행은 준비물 점검(`checklist.*` 동작), 남미·운남 거점 도시, 스팟 모아보기. 그리는 동안 여행 자료를 바꾸지 않고 모든 값을 escape한다 |
| `js/presentation/budget-ui.js` | 초기 자산·예산 창과 전세계 통화 선택 창(v2.1.2). 창의 입력과 통화 목록은 파일 안의 초안에만 두고 저장 버튼의 `commitTrip` 한 번으로 쓴다. 통화 추가는 바로 저장하고 열린 초기 자산 창·지출 입력창을 갱신한다 |
| `js/presentation/expense-analytics.js` | 사용내역 통계(v2.1.2): 카드·현금, 카테고리, 수지와 SVG 도넛 차트. 지출 카테고리 목록(`SulsulTravel.ExpenseAnalytics.CATEGORIES`)의 유일한 정의 |
| `js/presentation/shell-actions.js` | 여러 화면이 함께 쓰는 셸 동작(v2.1.1): `shell.closeModal`(`data-modal`) |
| `js/presentation/journal-tab.js` | 기록 탭(v2.1.0): 날짜 고르기, 하루 회고 글·사진 저장, 사진 크게 보기·안전 삭제, 저장 대기 사진 재시도, 글·사진 초안 파일. 순간 기록 목록은 `moment-journal.js`가 그린다 |
| `js/presentation/checklist-tab.js` | 준비물 화면(v2.0.9, 4단계 첫 분리): 분류·D-Day 보기, 체크·전체 완료, 추가·상세·안전 삭제, 예약 가이드의 준비물 체크 |
| `js/presentation/companion-ui.js` | 오늘 화면·큰 계획 카드, SOS, 퀵 캡슐(순간 기록 입력), 매거진(TravelStory 보기) |
| `sw.js` | 앱 셸 및 오프라인 에셋 캐시 |

새 도메인 규칙은 DOM과 저장소에서 분리합니다. 기존 기능을 옮길 때는 데이터 계약과 오류 경계를 먼저 만든 뒤 화면 연결을 바꿉니다. 모든 화면을 한 번에 재작성하지 않습니다.

## 로컬 실행

저장소 루트에서 PowerShell 정적 서버를 실행합니다.

```powershell
.\tools-serve.ps1
```

브라우저에서 `http://localhost:8080/`을 엽니다. 서비스워커와 설치 동작은 HTTPS 또는 localhost에서 확인합니다. 정적 화면만 볼 때도 같은 주소를 사용하면 경로와 캐시가 배포 환경에 더 가깝습니다.

## 운영 배포

운영 사이트는 [sulsul-travel.vercel.app](https://sulsul-travel.vercel.app/)이며, GitHub 저장소의 `main` 브랜치와 연결된 Vercel 배포를 사용합니다. GitHub Pages는 현재 설정되어 있지 않습니다. 현재 작업 버전 `v2.0.8`의 push와 운영 반영 여부는 이 문서 갱신만으로 확인되지 않습니다.

## 검증

Node.js 18 이상과 Playwright/Chromium을 사용할 수 있는 환경에서 실행합니다.

```powershell
$testFiles = Get-ChildItem .\tests -Filter '*.test.mjs' | ForEach-Object { $_.FullName }
node --test $testFiles
node .\tools\lint-boundaries.cjs
node .\tools\check-release.cjs
node .\tests\activity-journal.browser.cjs
node .\tests\photo-compression.browser.cjs
node .\tests\photo-optimization.browser.cjs
node .\tests\expense-editor.browser.cjs
node .\tests\expense-photo-repository.browser.cjs
node .\tests\expense-photo-quota.browser.cjs
node .\tests\mobile-navigation.browser.cjs
node .\tests\reliability.browser.cjs
node .\tests\mobile-ui.browser.cjs
node .\tests\header-hub.browser.cjs
node .\tests\schedule-change.browser.cjs
node .\tests\live-itinerary.browser.cjs
node .\tests\moment-journal.browser.cjs
node .\tests\travel-story.browser.cjs
node .\tests\companion-refresh.browser.cjs
node .\tests\collaboration-review.browser.cjs
node .\tests\backup-restore.browser.cjs
node .\tests\field-records.browser.cjs
node .\tests\records-consistency.browser.cjs
node .\tests\record-media.browser.cjs
node .\tests\trip-store-idb.browser.cjs
node .\tests\checklist-tab.browser.cjs
node .\tests\journal-tab.browser.cjs
node .\tests\expenses-tab.browser.cjs
node .\tests\budget-analytics.browser.cjs
node .\tests\expense-form.browser.cjs
node .\tests\plan-guides.browser.cjs
.\tools-verify.ps1
```

Playwright 브라우저를 내려받지 않은 환경에서는 `PLAYWRIGHT_MODULE`(playwright 모듈 경로)과 `CHROME_PATH`(설치된 Chrome 실행 파일)를 지정하면 같은 검사를 실행할 수 있습니다. 브라우저 테스트는 독립 합성 여행을 사용합니다. 사용자 여행, 실제 Gemini API 호출, GitHub 쓰기를 사용하지 않습니다. 테스트 요약은 각 스크립트의 출력에서 확인합니다. 헤드리스 Edge CDP를 사용할 수 없는 환경에서는 `tools-verify.ps1`의 브라우저 게이트가 실패할 수 있으므로 변경 기능 브라우저 검사를 별도로 실행하고 제한을 기록합니다.

모바일 헤더·허브는 `test:header-hub`에서 320~430px의 실제 노출·클릭·검색·필터·키보드 이동과 세 테마를 검사합니다. 수평 넘침이 없다는 결과만으로 숨은 버튼이나 읽을 수 없는 입력 폭을 통과시키지 않습니다.

## 저장·공유 변경 원칙

1. 원본 객체를 바로 수정하기 전에 복사본을 만듭니다.
2. 여행 하나를 고치는 기능은 `commitTripCommand`(편집 시작 때의 revision) 또는 `commitTrip(tripId, change)`(바로 적용하는 조작)를 씁니다. 모든 저장 명령은 비동기입니다(v2.0.7). 반드시 `await`로 결과(true/false)를 받은 뒤 화면을 갱신합니다. `TripRepository`(`js/infrastructure/storage/trip-store.js`의 `TripStore`)는 저장을 한 줄로 차례대로 실행하고, 성공한 저장 작업 안에서 `State.trips`를 바꿉니다. 여행 목록 전체를 저장할 때는 저장 직전 목록을 받는 함수(`current => [...]`)를 넘깁니다. 호출할 때 만든 배열을 넘기면, 그 사이 다른 저장이 여행을 바꿨을 때 `STORAGE_CONFLICT`로 거절됩니다. `tools/lint-boundaries.cjs`의 ASYNC01이 기다리지 않은 저장과 Promise를 조건에 쓴 곳을 막습니다. `change`는 저장소가 만든 복사본을 받으며 저장에 성공해야 `State`가 바뀝니다. 여행을 더하거나 빼는 기능은 `commitTripsCommand`를 씁니다. 셸과 `js/presentation/`에서 `saveTrips(`·`TripRepository.saveAll(`·`st_trips_v2`를 새로 쓰면 `tools/lint-boundaries.cjs`(WRITE01)가 실패합니다. 예외는 `tools/boundary-allowlist.json`에 정확한 개수와 사유로만 둡니다.
3. 저장 실패 시 초안·확인창·원본 데이터를 유지하고 재시도 가능한 안내를 표시합니다.
4. 기록(하루 회고·일정 기록·순간 기록)을 세거나 목록·이야기·백업·공유에 보여 줄 때는 `js/domain/travel-records.js`(`TravelRecords.list`·`summary`·`firstPhoto`)만 씁니다. 저장 필드를 직접 세면 화면마다 수가 달라집니다. 글·사진·기분·날씨가 모두 빈 항목은 기록이 아닙니다. 기록을 쓰는 화면은 `commitTripRecord(tripId, write)`를 쓰고, 편집을 시작할 때의 그 기록과 지금 기록이 같은지 먼저 확인합니다(다른 일정·기록 변경은 충돌이 아닙니다).
5. 기록 사진은 `photos[i]`에 data URL이 있어도 저장 원문에는 빈 문자열과 `mediaIds[i]`만 남을 수 있습니다(v2.0.6). 메모리의 `State`는 늘 사진이 채워져 있으므로 화면은 그대로 `photos`를 읽습니다. 저장 원문(`await TripRepository.readRaw()`)을 `JSON.stringify(State.trips)`와 비교하지 말고, 원문끼리 비교합니다. 새 사진은 `mediaRepository.prepare`로 만들어야 첫 저장부터 보관소로 갑니다. 그 밖의 경로로 들어온 사진은 다음 부팅 때 보관·대조한 뒤 옮깁니다. 저장 뒤 백그라운드에서 문서를 다시 쓰지 않습니다(사진 최적화·백업 복원이 잡은 원문 기준을 흔들기 때문).
6. IDB 보조 데이터와 사진/일기 연결도 삭제·가져오기·여행 ID 변경 때 함께 점검합니다.
7. 공유 링크·파일은 고정된 사본입니다. 개인 일기와 금액은 명시적 선택 없이 공유하지 않습니다.
8. Gist 복원은 여행 목록 전체를 교체하므로 덮어쓰기 확인과 실패 시 원본 보존을 유지합니다.
9. 여행 자료는 IndexedDB `sulsul-travel-trips-v1`에 여행 하나씩 있습니다(v2.0.8). `localStorage['st_trips_v2']`는 v2.0.7까지의 문서이며, 옮긴 뒤에는 이전 버전 창이 덮어쓰지 못하도록 끝에 줄바꿈을 붙인 사본으로 30일 남습니다. 새 코드는 이 키를 읽거나 쓰지 않습니다. 저장된 원문은 `await TripRepository.readRaw()`, 이 창이 마지막으로 본 저장 식별값은 `TripRepository.token()`, 저장소의 지금 식별값은 `await TripRepository.currentToken()`으로 얻습니다. IndexedDB를 열 수 없으면 아직 옮긴 적이 없을 때만 기기 문서로 계속 쓰고(`TripRepository.kind`가 `localStorage`), 옮긴 뒤에는 옛 문서로 돌아가지 않고 저장을 거절합니다.
10. 브라우저 검사도 `localStorage['st_trips_v2']` 대신 `await TripRepository.readRaw()`로 저장 결과를 확인합니다. 기존 방식의 저장 실패 주입(`Storage.prototype.setItem`을 바꿔 `st_trips_v2` 쓰기를 실패시키기)은 `tests/helpers/playwright.cjs`의 검사용 다리가 IndexedDB 저장에도 같은 실패로 적용합니다. 모든 브라우저 검사는 Playwright를 이 도우미로 불러옵니다. 도우미는 클릭·탭·키 입력·파일 선택 뒤 앱의 저장 줄이 빌 때까지(최대 2초) 기다립니다. 기기 문서 저장은 클릭 이벤트 안에서 끝났지만 IndexedDB 저장은 몇 ms 뒤에 끝나기 때문입니다. 페이지 안에서 `button.click()`으로 누른 뒤 바로 결과를 읽는 검사는 `await button.onclick()`처럼 저장을 직접 기다립니다.
11. 화면을 옮기거나 새 버튼을 만들 때는 인라인 `onclick="이름(…)"`을 쓰지 않습니다(v2.0.9, 4단계). 요소에 `data-on-click="이름공간.동작"`(change·input은 `data-on-change`·`data-on-input`)을 적고, 값은 다른 `data-*` 속성에 둡니다. 처리기는 `js/presentation`의 화면 파일에서 `SulsulTravel.UiActions.define('이름공간', {동작(요소, 이벤트){…}})`으로 등록합니다. 등록하는 파일은 불러올 때 문서를 건드리지 않습니다(경계 검사가 Node에서 불러 등록 목록을 읽습니다). `data-action`은 오늘 화면의 CSS 표식이므로 쓰지 않습니다. 경계 검사 UI01은 파일별 인라인 처리기 수가 늘지 않게, UI02는 없는 함수·등록되지 않은 이름·없는 창을 부르는 버튼을 막습니다.

## PWA와 외부 통신

- 앱 버전 변경 시 `index.html`의 `APP_VER`, 버전 배지, 자산 쿼리 버전, `sw.js` 캐시 이름과 프리캐시 URL, `package.json`, `CHANGELOG.md`, `술술트래블신록.md`를 일치시킵니다.
- 화면의 버전 기록도 최신 항목을 추가합니다. 캐시된 설치 앱에 업데이트가 적용되는지 새 서비스워커 버전으로 확인합니다.
- 배포 파일을 바꾸면 버전을 올립니다. `tools/check-release.cjs`는 마지막 릴리스 태그(`vX.Y.Z`)와 비교해 내용이 바뀐 배포 파일이 있는데 `APP_VER`·`sw.js` 캐시 버전·해당 자산의 `?v=`가 그대로면 실패합니다(개행 차이는 무시). 릴리스 커밋마다 `git tag -a vX.Y.Z`를 만들고 `git push --follow-tags`로 올립니다. 태그가 없으면 검사를 건너뛰었다고 출력합니다.
- `tools/lint-boundaries.cjs`의 다른 규칙: 저장 명령과 저장 명령을 부르는 함수는 `await`·`return`으로 끝을 기다리고, 비동기 함수의 결과(Promise)를 조건·대입에 바로 쓰지 않기(ASYNC01, 예외는 허용 목록 `async`에 사유와 함께), 새 `window.__` 전역 상태 금지(GLOBAL01), HTML 템플릿에 escape하지 않은 값 삽입 수가 파일별 기준값을 넘지 않기(HTML01). 기준값은 줄면 함께 낮춥니다. 둘 다 `tools-verify.ps1`과 단위 테스트에서 실행합니다.
- 로컬 JS/CSS 변경 후 `node tools/update-asset-integrity.cjs`로 HTML의 SRI를 갱신합니다. 공개 빌드는 Git 개행 변환과 무관하게 실제 배포 바이트로 다시 계산합니다. 자산 오류가 있으면 `SulsulShell`이 초기 데이터 쓰기를 차단하고 업데이트 복구 화면을 엽니다.
- 실제 구버전 워커 캐시에서 새 버전으로 진입하는 `test:sw-upgrade`와 렌더링 오류를 주입하는 `test:record-persistence`를 확인합니다. 워커 교체는 작성 중 자동 새로고침을 유발하지 않습니다. 자세한 범위는 [v1.9.4 기록 복구](docs/record-recovery-v1.9.4.md)를 참고하세요.
- Google Fonts/jsDelivr 글꼴, OpenStreetMap 지도 타일, 요청형 환율 API, 사용자가 호출한 Gemini API, Gist 백업, Google Maps 링크 전송을 기능별로 구분해 안내합니다.
- API 키와 PAT를 로그·공유 파일·오류 문구에 넣지 않습니다. 현재 브라우저 저장 키는 암호화되지 않으므로 UI에서 보안 저장이라고 표현하지 않습니다.

## 현재 알려진 제품 경계

- 하루 회고는 날짜마다 한 편이며, 별도 `momentEntries`로 같은 날 여러 순간의 글·사진을 추가할 수 있습니다. 회고와 일정 기록·순간 기록은 현재 서로 다른 저장 경로를 사용합니다.
- 일정별 사진·에세이는 일정당 한 기록이며, 일정 삭제 후에도 당시 제목·날짜 등의 문맥을 유지합니다.
- 사진은 비율 유지 보관본·썸네일 Blob을 IndexedDB에 저장하고 여행 JSON에도 data URL 사본을 남깁니다. 전체 미디어 참조 이전과 localStorage 용량 문제는 후속입니다. v1.9.3 파일/Gist 백업은 같은 사진·보조 일기 수집 및 검토·복원 경로를 사용합니다.
- 링크·파일·Gist는 사본·백업입니다. 선택형 Supabase에는 공동 계획 권한·초대·이력·outbox·revision 충돌과 비교/승인 코드가 있지만 서버는 기본 미설정이고 실제 SQL/RLS·여러 기기 검증은 미완료입니다. 자동 실시간 병합이나 영구 계정 복구를 제공하지 않습니다.

현행 위험과 실행 순서는 [v1.9.2 구조 검토](docs/architecture-review-v1.9.2-2026-10-09.md)를 참고하세요. 초기 확장 방향은 [목표 아키텍처](docs/architecture-vnext.md), 과거 재현은 [2026-09-13 검토 기록](docs/review-v1.7.8-2026-09-13.md), 개발 흐름은 [오케스트레이션 개발 모델](docs/development-model.md)에 보존합니다.
