# 술술트래블 개발 가이드

이 문서는 현재 앱 구조와 검증 방식을 설명합니다. 이전 구조를 기술한 문서는 상단에 역사 자료 또는 목표 설계라고 표시합니다. 현재 앱 버전은 `1.8.6`입니다.

## 실행 구조

- 정적 PWA: `index.html`, CSS, 로컬 JavaScript 모듈을 브라우저에서 실행합니다. 앱 런타임에 애플리케이션 서버는 없습니다.
- 앱 셸: `index.html`에 기존 화면과 전역 상태가 남아 있고, 저장·AI 오케스트레이션·RePlan·기록 편집·지출 편집·공유는 독립 파일로 분리되고 있습니다.
- 저장: 여행 컬렉션은 `localStorage['st_trips_v2']`에 저장합니다. 하루 일기 텍스트에 한해 저장 공간 초과를 IndexedDB로 보완합니다. 사진 전체 저장소 이전은 완료되지 않았습니다.
- AI: 브라우저가 사용자가 제공한 Gemini 키로 Google API를 호출합니다. AI 결과는 초안이며 승인이 있어야 적용됩니다.
- 공유: 링크와 JSON 파일은 여행 사본입니다. GitHub Gist는 사용자가 실행하는 개인 백업이며 실시간 동기화나 동행 공동편집이 아닙니다.

## 주요 파일

| 파일 | 책임 |
| --- | --- |
| `index.html` | 앱 셸, 주요 화면, 전역 상태, 일부 레거시 기능 |
| `js/domain/replan.mjs` | 보호 일정과 날짜/범위 RePlan 규칙 |
| `js/application/orchestration.mjs` | AI 작업 큐, 취소·재시도·승인 흐름 |
| `js/infrastructure/storage/legacy-trip-repository.js` | `st_trips_v2` 문서 저장과 revision 경계 |
| `js/infrastructure/storage/journal-overflow-repository.js` | 용량 초과 하루 일기 임시 보관 |
| `js/domain/trip-transfer.js` | 버전 있는 여행 사본 검증·내보내기 계약 |
| `js/presentation/activity-journal.js` | 일정별 기록 편집, 사진, AI 윤문 승인 |
| `js/presentation/expense-editor.js` | 지출 거래 편집, 사진과 지갑 반영 |
| `js/presentation/trip-transfer-ui.js` | 사본 링크·파일 공유와 가져오기 |
| `js/destinations/` | 국가/도시 목적지 지식 팩과 레지스트리 |
| `sw.js` | 앱 셸 및 오프라인 에셋 캐시 |

새 도메인 규칙은 DOM과 저장소에서 분리합니다. 기존 기능을 옮길 때는 데이터 계약과 오류 경계를 먼저 만든 뒤 화면 연결을 바꿉니다. 모든 화면을 한 번에 재작성하지 않습니다.

## 로컬 실행

저장소 루트에서 PowerShell 정적 서버를 실행합니다.

```powershell
.\tools-serve.ps1
```

브라우저에서 `http://localhost:8080/`을 엽니다. 서비스워커와 설치 동작은 HTTPS 또는 localhost에서 확인합니다. 정적 화면만 볼 때도 같은 주소를 사용하면 경로와 캐시가 배포 환경에 더 가깝습니다.

## 검증

Node.js 18 이상과 Playwright/Chromium을 사용할 수 있는 환경에서 실행합니다.

```powershell
$testFiles = Get-ChildItem .\tests -Filter '*.test.mjs' | ForEach-Object { $_.FullName }
node --test $testFiles
node .\tests\activity-journal.browser.cjs
node .\tests\expense-editor.browser.cjs
node .\tests\reliability.browser.cjs
node .\tests\mobile-ui.browser.cjs
.\tools-verify.ps1
```

브라우저 테스트는 독립 합성 여행을 사용합니다. 사용자 여행, 실제 Gemini API 호출, GitHub 쓰기를 사용하지 않습니다. 테스트 요약은 각 스크립트의 출력에서 확인합니다. 헤드리스 Edge CDP를 사용할 수 없는 환경에서는 `tools-verify.ps1`의 브라우저 게이트가 실패할 수 있으므로 변경 기능 브라우저 검사를 별도로 실행하고 제한을 기록합니다.

## 저장·공유 변경 원칙

1. 원본 객체를 바로 수정하기 전에 복사본을 만듭니다.
2. `TripRepository.saveAll` 또는 저장소 전용 계약이 성공한 뒤 전역 상태와 화면을 갱신합니다.
3. 저장 실패 시 초안·확인창·원본 데이터를 유지하고 재시도 가능한 안내를 표시합니다.
4. IDB 보조 데이터와 사진/일기 연결도 삭제·가져오기·여행 ID 변경 때 함께 점검합니다.
5. 공유 링크·파일은 고정된 사본입니다. 개인 일기와 금액은 명시적 선택 없이 공유하지 않습니다.
6. Gist 복원은 여행 목록 전체를 교체하므로 덮어쓰기 확인과 실패 시 원본 보존을 유지합니다.

## PWA와 외부 통신

- 앱 버전 변경 시 `index.html`의 `APP_VER`, 버전 배지, 자산 쿼리 버전, `sw.js` 캐시 이름과 프리캐시 URL, `package.json`, `CHANGELOG.md`, `술술트래블신록.md`를 일치시킵니다.
- 화면의 버전 기록도 최신 항목을 추가합니다. 캐시된 설치 앱에 업데이트가 적용되는지 새 서비스워커 버전으로 확인합니다.
- Google Fonts/jsDelivr 글꼴, OpenStreetMap 지도 타일, 요청형 환율 API, 사용자가 호출한 Gemini API, Gist 백업, Google Maps 링크 전송을 기능별로 구분해 안내합니다.
- API 키와 PAT를 로그·공유 파일·오류 문구에 넣지 않습니다. 현재 브라우저 저장 키는 암호화되지 않으므로 UI에서 보안 저장이라고 표현하지 않습니다.

## 현재 알려진 제품 경계

- 하루 자유 기록은 날짜마다 한 편입니다. 별도 순간 기록을 무제한으로 추가하는 모델은 아직 없습니다.
- 일정별 사진·에세이는 일정당 한 기록이며, 일정 삭제 후에도 당시 제목·날짜 등의 문맥을 유지합니다.
- 사진은 여행 문서 안에 압축되어 저장됩니다. 영구 사용을 목표로 하면 미디어를 IndexedDB로 분리하고 백업·복원·이전 절차를 마련해야 합니다.
- 링크·파일·Gist는 공동편집을 구현하지 않습니다. 실시간 동행 편집은 인증, 권한, 변경 로그, 오프라인 outbox와 충돌 해결을 갖춘 별도 서버 기능으로 설계해야 합니다.

확장 단계와 충돌 정책은 [목표 아키텍처](docs/architecture-vnext.md), 현재 구성 검토는 [2026-09-13 검토 기록](docs/review-v1.7.8-2026-09-13.md), 개발 흐름은 [오케스트레이션 개발 모델](docs/development-model.md)을 참고하세요.
