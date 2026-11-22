# 술술트래블 v2.0.1 기능·구조 분석과 목적 기반 개선 계획

검토일: 2026-11-21 · 기준: `main` = `origin/main` = `9486e13` · 앱 버전 표기 v2.0.1.

> **v2.0.2 후속**: 0단계(회귀 복구) 수정 범위와 검증 결과는 [§10](#10-0단계-진행-결과-v202)에 따로 적었다. 1~5단계는 진행하지 않았다.

이 문서는 수정 전 검토다. 아래 결함은 현재 코드에서 재현했거나 코드로 확인한 것이며, 수정·배포를 완료했다는 뜻이 아니다. 이전 검토인 [v1.9.2 구조 검토](architecture-review-v1.9.2-2026-10-09.md)와 [v1.9.3 구조 보강](architecture-hardening-v1.9.3.md)의 방향은 유지하고, 그 뒤에 생긴 변화를 반영해 순서를 다시 정한다.

## 1. 판단

술술트래블의 목적은 **여행을 계획하고, 현장에서 고치고, 그 기록을 평생 잃지 않는 오프라인 우선 여행 다이어리**다. AI는 초안을 만들고 사용자가 승인한다. 가계부와 동행 연결은 이 흐름을 돕는다.

v1.9.3~v2.0.1에서 이 목적을 지키는 경계를 세웠다. 일정 변경은 `commitTripCommand`로 저장하고, AI 초안은 `AiDraftValidation`으로 검증하며, 백업 경로를 통일했고, 서비스워커는 공개 자산만 캐시한다. 그런데 2026-11-06~11-10의 세 커밋(`e72e47c`, `a34d967`, `9486e13`)이 `companion-ui.js`를 225줄에서 1,983줄로 키우면서 새 현장 기능 다섯 가지를 이 경계 밖에 붙였다. 이번 검토에서 재현한 결함 6건 중 5건이 그 커밋들에서 나왔다.

따라서 새 기능을 더하기 전에 다음 순서로 진행한다.

1. **회귀 복구**: 기록 손실, 잘못된 비상 정보, 배포 혼합 문제를 고친다.
2. **경계 강제**: 규칙을 문서로만 두지 않고 검사로 막는다.
3. **기록 모델 하나로 통일**: 지금 4종으로 갈라진 기록을 하나의 계약으로 묶는다.
4. **IndexedDB 원본 저장소 이전**: 평생 기록을 담을 수 있는 저장 구조로 옮긴다.
5. **화면 분리**: 거대 파일을 기능 단위로 나눈다.

## 2. 기능 지도

| 영역 | 사용자가 하는 일 | 주요 구현 | 상태 |
| --- | --- | --- | --- |
| 허브 | 내 여행 목록·검색·필터·정렬, D-day, 평생 통계, 노선도, 가상 예제 | `index.html` `renderHub`·`renderTripCards`·`renderLifetimeAnalytics` | 안정. 화면 코드가 앱 셸에 있음 |
| 계획 | 여행 생성(140+국가, 거점 배분), 초안 스튜디오, AI 일정 생성·RePlan(검토 후 승인), 큰 계획 블록, 시간표, 지도, 예약·도시 가이드, 준비물 | `index.html`, `replan.mjs`, `orchestration.mjs`, `ai-draft-validation.js`, `js/destinations/` | 검증 경계 있음 |
| 현장(오늘) | 다음 일정, 완료·건너뜀, 자유 편집(삽입·이동·보류·Undo), 변경·취소·대체·지연, 시간 재정렬 미리보기 | `live-itinerary*`, `schedule-change*`, `spot-realignment*` | 명령 경계 적용됨 |
| 현장 보조(신규) | 오늘 HUD, 택시 카드, SOS, 빠른 환율, 예산 페이스, 음성 캡슐, 스토리 매거진 | `companion-ui.js` (1,983줄) | **경계 밖. 결함 재현됨** |
| 기록·이야기 | 하루 회고, 일정 기록, 여러 순간, 퀵 캡슐, AI 다듬기, PDF·Markdown·텍스트 출력 | `activity-journal.js`, `moment-journal.js`, `travel-story*.js`, `companion-ui.js` | 기록 모델 4종으로 분산 |
| 가계부 | 다통화 지갑·환전·예산, 지출 사진, 영수증 OCR, 분석 | `index.html`, `expense-editor.js`, `expense-photo-repository.js` | 사진은 IDB 보관 |
| 데이터·공유 | JSON 백업·복원, Gist 백업, 사본 링크·파일, 동행 서버(기본 비활성), 사진 최적화 | `travel-backup*`, `trip-transfer*`, `collaboration*`, `photo-*` | 경계 통일됨 |
| 앱 셸 | PWA 설치, 오프라인 캐시, SRI 불일치 복구, 테마 3종, 뒤로가기 | `sw.js`, `index.html` 상단 `SulsulShell`, `mobile-navigation.js` | 동작함. 릴리스 규칙에 의존 |

## 3. 아키텍처 현황

```mermaid
flowchart TD
  subgraph Browser[브라우저 단일 페이지]
    SHELL[index.html 앱 셸<br/>인라인 스크립트 약 14,000줄 · 전역 State] --> MODS[js/ 39개 classic script<br/>SRI·로드 순서 의존]
    MODS --> DOMAIN[domain: TripAdapter · AiDraftValidation · LiveItinerary · TravelStory · TravelBackup]
    MODS --> PRES[presentation: 기능별 UI + companion-ui.js]
    SHELL --> REPO[LegacyTripRepository · commitTripCommand]
    PRES -. 직접 saveTrips .-> REPO
  end
  REPO --> LS[(localStorage st_trips_v2<br/>모든 여행 한 문서)]
  MODS --> IDB[(IndexedDB 3개<br/>media-v1 · expense-photos-v1 · overflow-v1)]
  SHELL --> SW[sw.js 버전 고정 캐시]
  SHELL --> EXT[Gemini · 환율 API · OSM 타일 · Gist · 선택형 Supabase]
```

| 지표 | 값 | 의미 |
| --- | --- | --- |
| `index.html` | 20,237줄 · 1.26MB, 인라인 스크립트는 6,225행부터 | 화면·상태·업무 규칙이 여전히 셸에 집중됨 |
| 셸의 함수 선언 / 인라인 이벤트 속성 | 396 / 505 | 전역 함수 이름이 사실상 공개 API다 |
| `!important` | 422 | 화면별 덮어쓰기가 누적됨 |
| `js/` | 39파일 · 8,311줄. `companion-ui.js` 하나가 24% | 분리한 계층 안에 두 번째 거대 파일이 생김 |
| 일정 저장 경로 | `saveTrips` 직접 호출 23곳 / `commitTripCommand` 9곳 | 명령 경계는 일부 기능에만 적용됨 |
| `companion-ui.js`의 `window.__*` 전역 상태 | 9개 | 화면 상태가 모듈 밖 전역에 흩어짐 |
| 테스트 | 단위·계약 25파일 225개, 브라우저 24파일 | 새 현장 기능 5종의 회귀 검사는 `tests/`에 없음 |

### 유지할 기반

- `TripAdapter`의 안정 ID와 구버전 보완, `AiDraftValidation`의 생성·승인 공통 계약.
- `LiveItinerary` 명령(삽입·이동·보류·Undo)과 revision 충돌 방어.
- `TravelStory`의 원문·승인문 분리와 출처 manifest. 모든 이야기 출력이 쓸 읽기 모델이다.
- `TravelBackup`의 미리보기 후 승인, 손상 원문 보존.
- 서비스워커의 공개 자산 allowlist와 `SulsulShell`의 SRI 불일치 복구.

## 4. 이번에 재현한 문제

재현 환경: 격리된 Chrome 헤드리스(Playwright), 390×844, 가상 예제 여행(2030-04-01~05, 타이베이)과 합성 데이터. 사용자 여행·API 키·운영 사이트는 쓰지 않았다. 재현 스크립트는 저장소 밖의 작업 폴더에 두었다.

| ID | 우선순위 | 문제 | 재현 결과와 근거 | 원인 |
| --- | --- | --- | --- | --- |
| F1 | P0 · 기록 | 퀵 캡슐이 항상 여행 첫날에 저장됨 | 3일차(2030-04-03) 정오에 저장하자 `dayIndex 0`, `date 2030-04-01`로 저장됨. 하루 AI 일기도 첫날 캡슐만 모음 | `State.activePlanDayIndex`는 읽기만 하고 값을 넣는 코드가 없음(`companion-ui.js:1548`·`1593`). 날짜 대신 배열 위치로 연결하는 방식은 v1.9.3이 회고에서 제거한 것과 같은 패턴이다 |
| F2 | P0 · 기록 | 사진 캡슐 저장 실패를 성공으로 알리고 입력을 지움 | 휴대폰 사진 1장 크기(base64 약 470만 자)로 저장 문서가 11KB에서 4.7MB로 커짐. 두 번째 사진은 저장 공간 부족 경고 직후 `보관되었습니다!`가 덮어쓰고 입력창을 비움. 새로고침하면 그 캡슐은 없음 | `readAsDataURL` 원본을 압축 없이 여행 JSON에 넣음. `PhotoCompression`·`MediaRepository`를 거치지 않고 `saveTrips()` 결과를 무시함(`companion-ui.js:1506–1577`) |
| F3 | P0 · 원칙 | AI 일기가 승인 없이 기록으로 저장되고 이야기 출력에서 본문이 빠짐 | 코드 확인: `generateDiaryFromCapsules`가 Gemini 응답을 바로 `activityRecords`에 저장함. 본문 필드는 `content`인데 `TravelStory.selectText`는 `originalText/sourceText/text`만 읽음 | 기존 AI 검토·승인 경로(`orchestration`, `AiDraftValidation`)와 기록 계약을 쓰지 않음(`companion-ui.js:1591–1660`). PDF 출력 결과는 브라우저로 확인하지 않음 |
| F4 | P0 · 안전 | SOS 비상 번호·공관이 국가와 맞지 않음 | 중국(윈난) 여행에 `주타이베이 한국대표부`와 구급 `119`를 표시함. 중국 본토의 구급 번호는 120이다. 칠레 여행에는 경찰 911·구급 116을 표시함. 칠레는 경찰 133·구급 131이다. 남미 4개국을 번호 하나로 묶음 | 제목·도시 문자열 정규식으로 국가를 추정하고, 검증 출처 없는 번호표를 화면 코드에 하드코딩함(`companion-ui.js:900–987`). 앱에 윈난 팩이 있으므로 실제로 쓰이는 경로다 |
| F5 | P1 · 배포 | 버전을 올리지 않고 자산 내용을 바꿔 설치 기기에 복구 화면이 뜸 | `abb395c`(v2.0.1) 설치 상태에서 `9486e13`을 다시 열자 `companion.css`·`companion-ui.js`가 SRI 불일치로 차단되고 `앱 업데이트를 준비하고 있어요` 화면이 뜸. 온라인에서 버튼을 누르면 복구됨. 코드상 오프라인에서는 진행하지 않음 | `9486e13`이 자산 내용과 HTML의 SRI만 바꾸고 `?v=2.0.1`·`st-shell-v2.0.1`·`APP_VER`를 유지함. `sw.js`가 그대로여서 새 워커가 설치되지 않음 |
| F6 | P1 · 검증 | 브라우저 회귀 4종 실패 | HEAD에서 실행한 10종 중 6종 통과, 4종 실패. `companion-refresh`: 320~430px에서 대표 행동 버튼이 하단 메뉴 위에 있지 않음. `live-itinerary`·`schedule-change`: `e72e47c`가 카드에 추가한 `일정 관리 더보기` summary 때문에 선택자가 두 요소에 걸림. `travel-story`: 인쇄 화면에 이야기 외 요소가 남음 | UI를 바꾼 커밋이 기존 회귀 테스트를 실행·갱신하지 않음. 새 기능 검사는 `file://`로 여는 `tools/test-priority*.ps1`뿐이다 |

함께 확인한 구조 문제:

- **같은 기능이 두 벌씩 있다.** 빠른 환율 계산기는 지갑판 계산기(`initQuickCurrencyCalc`)와 모달(`openQuickCurrencyCalc`)로 두 개다. 이야기 출력은 `TravelStory` 기반 PDF와 캡슐·원본 여행을 직접 읽는 스토리 매거진으로 두 개다. 현지어 문구는 생존 스페인어 모달과 SOS 문구로 두 개다.
- **국가 지식이 세 곳에 있다.** 목적지 팩(`js/destinations/`), 셸의 140개국 정보(`resolveCountryInfo`), SOS 하드코딩 표다.
- **기록이 네 갈래다.** `journals`(하루 회고), `activityRecords`(일정 기록), `momentEntries`(순간), `quickCapsules`(퀵 캡슐). `quickCapsules`는 백업 요약, 공유 제외 목록, `TravelStory`가 모두 모른다.

## 5. 구조적 원인

1. **경계가 강제되지 않는다.** `commitTripCommand`가 있어도 `getActiveTrip()`을 직접 고치고 `saveTrips()`를 부르는 쉬운 길이 막혀 있지 않다. 새 기능은 대개 이 길을 택한다.
2. **기록 모델에 기준이 없다.** 기록 종류마다 날짜 연결, 사진 저장, 필드 이름이 다르다. 그래서 새 기능이 다섯 번째 형식을 만들기 쉽다.
3. **릴리스 규칙이 내용 변경을 검사하지 않는다.** `tools-verify.ps1`은 버전 문자열이 서로 일치하는지만 본다. 내용이 바뀌었는데 버전이 그대로인 경우는 잡지 못한다. 릴리스 태그도 없어 비교 기준이 없다.
4. **작업 절차가 도구마다 다르다.** 최근 세 커밋은 영문 메시지를 쓰고, 버전·변경 기록·실록·`tests/`를 갱신하지 않았다. `docs/development-model.md`의 절차가 적용되지 않았다. 워크스페이스 `CLAUDE.md`도 이 저장소 위치를 `00.Projects/여행준비/`로 적고 `Sulsul-Travel/`은 비었다고 적어 실제와 다르다.
5. **안전 정보에 출처가 없다.** 비상 번호·공관 연락처에 출처와 확인일이 없고 검사도 없다.

## 6. 목적에서 나온 개선 원칙

| 원칙 | 판단 기준 |
| --- | --- |
| 기록 무손실이 기능 수보다 우선 | 모든 쓰기는 하나의 명령 경계를 지난다. 실패는 실패로 표시하고 입력을 유지한다 |
| 현장 우선 | 오늘 화면의 핵심 동작은 한 손·오프라인으로 끝난다. 안전 정보는 정확하거나 비워 둔다 |
| AI는 초안 | 생성 → 검토 → 승인 → 원문 보존. 기록하지 않은 경험을 만들지 않는다 |
| 하나의 모델, 하나의 출처 | 기록 계약 하나, 국가 지식 하나, 이야기 읽기 모델 하나 |

## 7. 실행 계획

| 단계 | 작업 | 완료 판단 |
| --- | --- | --- |
| **0 · 회귀 복구** (다음 릴리스 v2.0.2) | ① 버전을 v2.0.2로 올려 정상 업데이트 경로를 복구한다. ② 캡슐: 오늘 날짜는 `resolveTodayDayIndex`나 사용자가 고른 날짜로 정하고 `dayId`·`date`를 저장한다. 저장은 `commitTripCommand`로 하고, 실패하면 입력을 유지하며 성공 안내를 띄우지 않는다. 사진은 `PhotoCompression`과 `MediaRepository`를 거친다. ③ AI 일기: 자동 저장을 없애고 검토창에서 승인할 때만 기존 기록 계약(`text`·`originalText`·`aiDraftAcceptedAt`)으로 저장한다. ④ SOS: 국가 판별을 오늘 거점의 국가 코드로 바꾸고, 번호는 국가별 데이터로 옮겨 출처·확인일을 단다. 확신이 없는 국가는 번호 대신 영사콜센터와 `현지 확인 필요`를 보여 준다. ⑤ 실패한 회귀 4종을 정리한다. 버튼 가림·인쇄 노출은 기능을 고치고, 선택자 충돌은 테스트를 의미 기반 선택자로 바꾼다 | F1~F6 재현 스크립트가 반대 결과로 통과한다. 브라우저 회귀 24종이 모두 통과한다. `test:sw-upgrade`에 '같은 버전, 다른 내용' 시나리오를 추가한다 |
| **1 · 경계 강제** | 정적 규칙을 추가한다. presentation 파일에서 `saveTrips(`·`TripRepository.saveAll`·`st_trips_v2` 직접 쓰기를 금지(허용 목록 관리)하고, 새 `window.__` 상태와 escape 없는 `innerHTML` 데이터 삽입을 금지한다. 직전 릴리스 태그와 비교해 바뀐 자산의 `?v=`가 그대로이면 실패하게 한다(릴리스마다 `v2.0.x` 태그 생성). 셸의 `saveTrips` 23곳을 기능별로 명령 경계로 옮긴다(지출 → 준비물 → 여행 설정 → 허브 순) | 규칙 위반을 넣은 fixture가 실패하는 회귀 검사를 둔다. 경계 밖 저장이 허용 목록에만 남는다 |
| **2 · 기록 모델 통일** | 공통 Record 계약: `id, kind(reflection·activity·moment·capsule), tripId, dayId, occurredDate, occurredAt?, spotId?, text, originalText, approvedText?, mood?, mediaIds[], source`. 읽기 어댑터부터 만든다. `TravelStory`가 네 종류를 모두 읽게 하고, 스토리 매거진은 그 모델을 그리는 보기로 바꾼다. 퀵 캡슐은 순간 기록의 입력 방식(음성·빠른 메모)으로 흡수하고 별도 컬렉션은 마이그레이션 후 폐지한다 | 일정 삽입·삭제·RePlan 뒤에도 모든 기록의 실제 날짜·원문·사진이 PDF·매거진·백업에서 일치한다 |
| **3 · IndexedDB 원본 저장소** | v1.9.2 검토의 D단계를 그대로 따른다. trips·days·items·records·expenses·media store로 나누고, 원문 백업 → 변환 미리보기 → 트랜잭션 → 개수·참조·사진 대조 → 채택 순서로 옮긴다. JSON의 data URL 사본은 백업할 때만 모은다. `navigator.storage.persist()` 요청, 저장 용량 표시, 마지막 백업 경과 알림을 추가한다 | 사진이 들어간 장기 여행 합성 자료로 백업 왕복, 중단·용량 초과 복구, 구버전 재접속을 검사한다 |
| **4 · 화면 분리** | 셸의 인라인 스크립트를 탭별 controller(허브·계획·오늘·기록·가계부·준비물·설정)로 나누고, `companion-ui.js`는 오늘 HUD·SOS·캡슐·매거진·택시·환율로 나눈다. 인라인 `onclick` 505개는 `data-action` 위임으로 옮긴다. 빌드 없이 브라우저 기본 ES 모듈(`type="module"`)을 쓸 수 있다. 디자인 토큰을 컴포넌트에 적용해 `!important`를 줄인다 | 기능 하나를 옮길 때마다 해당 브라우저 회귀가 통과한다. 화면을 한 번에 다시 쓰지 않는다 |
| **5 · 기능 정리와 확장** | 중복을 통합한다: 환율 계산기 1개, 현지어 카드 1개(목적지 팩 기반), 이야기 출력 모델 1개. 쓰임이 적은 기능(GPS 시뮬레이터, 일러스트 노선도 등)은 사용 데이터를 본 뒤 실험 메뉴로 옮길지 정한다. 동행 서버는 실제 두 계정·두 기기 RLS 검증 뒤 활성화한다 | 같은 일을 하는 화면이 하나만 남는다. 서버 기능은 실제 다중 계정 검증 결과로 판단한다 |

0단계가 끝나기 전에는 새 현장 기능을 추가하지 않는다. 1단계 규칙이 들어가야 2~4단계의 이전 작업 중에 경계 밖 저장이 다시 생기지 않는다.

## 8. 작업 절차 개선

- 이 저장소를 여러 AI 도구가 함께 수정한다. 작업 전 `DEVELOPMENT.md`와 `술술트래블신록.md`를 읽고, 커밋 전에 단위·브라우저 회귀와 버전 규칙을 통과해야 한다는 내용을 워크스페이스 `CLAUDE.md`·`AGENTS.md`의 술술트래블 절에 적는다. 저장소 위치 기술도 바로잡는다.
- 브라우저 회귀 실행법을 문서화한다. 이 기기에는 Playwright 브라우저가 설치되어 있지 않다. 번들 Node의 `playwright` 모듈을 `PLAYWRIGHT_MODULE`로, 설치된 Chrome을 `CHROME_PATH`로 지정하면 실행된다. `tools-verify.ps1`은 Edge 경로를 찾는다.
- 새 기능은 `tests/*.browser.cjs`에 HTTP 기반 회귀를 함께 추가한다. `file://` 검사는 서비스워커와 저장소 동작을 대표하지 못한다.

## 9. 검증 범위와 한계

- 실행한 검사: 단위·계약 225개 통과. 브라우저 회귀 10종(`companion-refresh`, `header-hub`, `live-itinerary`, `schedule-change`, `reliability`, `structural-reliability`, `service-worker`, `backup-restore`, `moment-journal`, `travel-story`) 중 6종 통과, 4종 실패. F1·F2·F4·F5 재현 스크립트 실행.
- 실행하지 않은 검사: 나머지 브라우저 회귀 14종, `tools-verify.ps1`, 실제 휴대폰과 iOS Safari, 실제 Gemini 호출, 운영 사이트, 오프라인 상태의 복구 화면 동작.
- 실패 4종이 어느 커밋부터인지는 확정하지 않았다. 직전 커밋 스냅샷으로 비교하려 했지만 그 환경에서는 모듈 로드부터 실패해 근거로 쓰지 않았다. 선택자 충돌을 일으킨 마크업은 `e72e47c`에서 추가됐다.
- 비상 번호의 정답(중국 구급 120, 칠레 경찰 133·구급 131)은 일반적으로 알려진 값이다. 데이터로 옮길 때는 외교부 해외안전여행 국가별 정보 등 공식 출처로 다시 확인하고 확인일을 기록한다.

## 10. 0단계 진행 결과 (v2.0.2)

2026-11-21. §7의 0단계를 v2.0.2로 수정했다. 1~5단계(경계 강제 규칙, 기록 모델 통일, IndexedDB 이전, 화면 분리, 중복 정리)는 진행하지 않았다.

| ID | 수정 | 검증 |
| --- | --- | --- |
| F1 | 퀵 캡슐을 순간 기록(`momentEntries`, `source:'capsule'`)으로 저장한다. 기본 날짜는 현지 오늘이고 다른 날을 고를 수 있다. 다른 날이면 기록 시각을 비운다. 기존 `quickCapsules`는 `TripAdapter`가 실제 생성 시각의 날짜로 옮긴다 | 3일차 저장 → `2030-04-03 12:00`. 첫날로 저장됐던 기존 캡슐 → 3일차와 연결 일정으로 복구 |
| F2 | 저장은 `commitTripCommand`, 사진은 `mediaRepository.prepare`(압축·IndexedDB)를 거친다. 실패하면 입력·사진을 남기고 성공 안내를 띄우지 않는다 | 11.8MB 원본 → 1280×960 보관본·320×240 썸네일, 문서 증가 65KB. 강제 용량 실패 시 입력 유지·재시도 성공 |
| F3 | AI 캡슐 일기는 `capsule-diary` 작업으로 검토창을 거쳐 승인할 때만 새 순간 기록으로 저장한다. 캡슐 메모를 `originalText`로 보관하고, 메모에 없는 내용을 지어내지 말라고 요청한다. 기존 자동 저장 글은 `AI 작성·검토 전`으로 표시해 옮긴다 | 승인 전 기록 수 불변, 승인 후 이야기 모델의 승인문으로 출력 |
| F4 | 긴급 번호를 `js/destinations/emergency-contacts.js`(35개국, 위키백과 긴급전화 목록 2026-10-16 판 대조)로 옮겼다. 국가는 오늘 거점 도시로 정하고, 여행 국가와 어긋나거나 정할 수 없으면 추정하지 않는다. 확인하지 못한 국가는 영사콜센터만 보여 준다. 대사관 직통 번호는 출처를 확인하지 못해 뺐다 | 윈난(CN) 경찰 110·구급 120, 칠레 133·131, 남미 다국가 일정은 그날 도시 기준, 미정이면 국가 선택 버튼 |
| F5 | 버전을 v2.0.2로 올려 새 서비스워커 캐시를 만든다(자산 쿼리·`sw.js`·`APP_VER`·`package.json`·변경 기록·실록) | `tools-verify.ps1` 전체 게이트 통과 |
| F6 | 오늘 화면에서 다음 일정 카드를 빠른 액션 덱·HUD보다 위로 올렸다. 인쇄 CSS는 열린 매거진만 인쇄한다. 회귀 테스트의 선택자는 카드 안 `더보기` 메뉴와 충돌하지 않게 직계 `summary`로 좁히고, 메뉴를 연 뒤 버튼을 누르게 했다 | `companion-refresh`·`travel-story`·`live-itinerary`·`schedule-change` 통과 |

함께 고친 것: 스토리 매거진은 `TravelStory` 모델을 그려 기록 본문이 빈칸으로 보이던 문제와 외화를 원화로 합산하던 문제를 없앴다. SOS 프랑스어 문구(`J'ai …`)의 복사 버튼 오류를 고쳤다. SOS 화면 상태는 `window.__sos*` 대신 `State.sos`에 둔다.

검증 결과(Chrome 헤드리스, `PLAYWRIGHT_MODULE`·`CHROME_PATH` 지정):

- 단위·계약 229개 통과(새 `tests/field-records.test.mjs` 4개 포함). `tools-verify.ps1` 전체 통과.
- 브라우저 회귀 25종 중 23종 통과(새 `tests/field-records.browser.cjs` 9개 검사 포함).
- 실패 2종은 수정 전 커밋 `9486e13`에서도 같은 검사가 실패하므로 이번 변경의 결과가 아니다. 다음 과제로 남긴다.
  - `demo-onboarding`: 공유 링크를 거절한 뒤 `snapshot-open-app`으로 돌아갈 때 주소의 `#share=`가 10초 안에 지워지지 않는다(2건).
  - `structural-reliability`: 오래된 두 번째 탭의 `saveTrips()`가 충돌로 거절되지 않고 `true`를 반환한다(1건). v1.9.3의 탭 간 덮어쓰기 방어가 다시 깨졌을 수 있는 기록 손실 위험이다. 세션 초반 같은 커밋 실행에서는 통과했으므로 시간·순서에 따라 달라지는지도 확인해야 한다.
- 확인하지 못한 것: 실제 휴대폰과 iOS Safari, 실제 Gemini 호출, 음성 인식, 운영 배포. 비상 번호는 위키백과 목록과 대조했으며, 외교부 해외안전여행 국가별 안내로 다시 확인하는 것이 좋다.

## 11. 남은 실패 2종 추적 결과 (v2.0.3)

- `structural-reliability`는 기록 손실 결함이 아니었다. 실패 회차에서는 첫 탭의 `saveJournalText`가 호출되지 않았다. 헤드리스 Chrome에서 화면 밖 저장 버튼에 `tap()`하면 스크롤 직후의 터치가 스크롤 0 기준으로 처리돼 제목(H4)을 눌렀다. 탭이 하나일 때도 부하가 있으면 12회 중 3회 재현됐다. 첫 탭 저장 방식만 바꿔 측정한 결과 `tap()` 10/12·스크롤 후 대기 9/12·`click()` 12/12·직접 호출 12/12 저장됐다. 저장이 기록된 43회 모두 두 번째 탭의 오래된 저장은 `STORAGE_CONFLICT`로 거절됐다. 검사는 `click()`으로 누르고 첫 저장이 기록됐는지 먼저 확인한다. 병렬 4회 실행 모두 통과했다.
- `demo-onboarding`은 실제 앱 결함이었다. 뒤로가기 가드가 `#share=` 주소의 기본 기록 위에 가드를 쌓은 상태에서, 주소 정리는 맨 위 가드만 바꿨다. 첫 터치의 가드 교체와 뒤로가기가 기본 기록으로 돌아가 가드를 다시 쌓으면서 공유 주소를 되살렸다. `MobileNavigation.replaceUrl`로 고쳤고 주소를 지우는 네 곳이 이 경로를 쓴다. 검사에 뒤로가기 뒤 주소 유지 확인을 더했다.
- 함께 확인한 것: 커밋 안의 `index.html` SRI는 Windows 작업 폴더의 CRLF 바이트로 계산돼 저장소의 LF 바이트와 일부 어긋난다(`646d1cb`에서 6개, 이전 커밋은 `leaflet.css` 1개). Vercel은 `tools/build-public.cjs`가 배포 바이트로 SRI를 다시 계산하므로 운영에는 영향이 없다. 새로 체크아웃한 폴더를 그대로 열 때만 복구 화면이 뜬다.

## 12. 1단계 진행 결과 (v2.0.4)

- **셸 저장 이전**: 기능 함수 15곳의 `saveTrips()`를 `commitTrip`(현재 revision으로 여행 하나 수정)·`commitTripCommand`(편집 시작 revision)·`commitTripsCommand`(여행 추가·복제)로 옮겼다. 변경은 저장소가 만든 복사본에 적용되고, 저장에 성공해야 `State`가 바뀐다. 실패하면 창과 입력을 남기고 성공 안내를 띄우지 않는다. 환전 삭제는 확인 창을 연 시점의 revision을 쓰고 ID로 지운다. 부르는 곳이 없던 `executeScheduleTuningLegacy`(revision 이중 증가)는 지웠다.
- **남은 직접 저장**: `tools/boundary-allowlist.json`에 27건이 사유와 함께 있다. 저장 경계 함수 자체 2건, 부팅 정규화·구버전 이관·읽기 전용 원문 대조, 그리고 이미 복사본에 쓰고 실패하면 되돌리는 전용 경로(하루 회고·일정 기록·순간 기록·지출·백업 복원·공유 사본·원격 계획·사진 최적화)다. 기록 경로는 2단계에서 공통 기록 명령으로 옮긴다. `renderCompanionPlan`의 렌더 중 구조 보정 저장은 4단계에서 부팅 정규화로 옮긴다.
- **정적 규칙**: `tools/lint-boundaries.cjs` — WRITE01(셸·presentation의 새 직접 저장), GLOBAL01(새 `window.__`), HTML01(escape 없는 HTML 삽입 수가 파일별 기준값을 넘지 않음). HTML01의 기준값 562곳은 정적 판별(문자열·숫자·`escapeHtml`·`*Html` 값 제외)로 센 수이며 모두 위험하다는 뜻도, 모두 안전하다는 뜻도 아니다. 줄이면 기준값도 낮춘다.
- **릴리스 규칙**: `tools/check-release.cjs` — 마지막 `vX.Y.Z` 태그 이후 배포 파일(index.html·sw.js·프리캐시 목록)의 내용이 바뀌었으면 `APP_VER`·서비스워커 캐시 버전·바뀐 자산의 `?v=`가 모두 올라가야 한다. 개행 차이는 무시한다. `abb395c`(v2.0.1)→`9486e13`에 실행해 서비스워커 버전과 자산 2개의 `?v=` 미상승 3건을 찾았다. 태그 `v2.0.2`·`v2.0.3`을 만들었다(원격에 올리려면 `--follow-tags`).
- **회귀 검사**: 규칙마다 위반을 넣은 fixture 검사(`tests/boundary-lint.test.mjs` 6개, `tests/release-check.test.mjs` 4개, 0단계에서 요구한 '같은 버전, 다른 내용' 포함). `structural-reliability`에 옮긴 명령의 실패 무변경·거짓 성공 없음, 끼어든 변경 뒤 환전 삭제 거절 검사 2개를 더했다. 두 검사는 수정 전 커밋(`dbb9c10`)에서 실패한다.
- **하지 않은 것**: 편집 창 기반 기능(초기 자금·환전 추가·큰 계획)은 아직 창을 연 시점이 아니라 저장 시점의 revision을 쓴다. 저장소 충돌(다른 탭)은 막지만, 같은 탭의 다른 화면이 그 사이에 바꾼 내용은 덮을 수 있다. HTML01 기준값을 줄이는 작업은 4단계 화면 분리 때 한다.
