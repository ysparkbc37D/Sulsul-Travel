# v1.8.9 순간 기록과 사진 보관 계약

2026-10-07. 하루 회고 `trip.journals`와 일정별 `trip.activityRecords`는 기존 형태를 유지한다. 새로운 순간은 `trip.momentEntries[]`에 추가하며, 같은 날짜의 앞선 글을 덮어쓰지 않는다. 한 줄 또는 사진만 저장할 수 있고 일정 연결은 선택이다.

## 순간 기록

- `id`, `date`(YYYY-MM-DD), `time`(HH:mm 또는 빈 값), `dayIndex`, `text`, `photos`, `photoThumbnails`, `mediaIds`, `coverIndex`, `activityLink`, `createdAt`, `updatedAt`을 저장한다. `activityLink`는 연결 당시 일정 ID·제목·날짜·시각·도시를 보존한다.
- 공개 범위 `visibility`는 `private`(기본) 또는 `shared`다. 이 값은 기록의 의도를 나타내며 서버 실시간 동기화를 뜻하지 않는다. 현재 사본의 개인 일기·사진 포함 옵션을 켜면 공개 범위와 관계없이 기록이 전달되므로 공유 화면에서 범위를 확인한다.
- 날짜 피드는 같은 날짜의 순간과 기존 일정 기록을 시각 순으로 보여준다. 일정이 사라져도 당시 날짜·내용으로 기록을 읽을 수 있다. 하루 회고는 기존 편집 영역에 남는다.
- 수동 저장과 확인 삭제는 여행 복사 → 현재 기록 비교 → repository 저장 → State 반영 순서다. 실패하면 기존 기록과 작성 중인 글·사진을 그대로 유지한다. 닫기·Escape·브라우저 뒤로가기는 미저장 변경을 확인한다.
- AI 다듬기는 원문을 먼저 저장하고 `moment-journal` 작업을 기존 오케스트레이터에 보낸다. 원문/제안 비교 후 승인하며, 생성 후 사용자가 수정했거나 revision이 바뀌면 충돌로 적용하지 않는다. 최초 승인 전 원문은 `originalText`에 보존하고 승인 문장은 `text`에 둔다.

## 미디어와 동기 백업

`js/infrastructure/storage/media-repository.js`는 가로·세로 비율을 유지하며 보관본은 긴 변 최대 1600px, 파생 썸네일은 최대 448px로 JPEG(품질 0.85)를 만든다. 작은 사진을 확대하지 않는다. 일정·순간 기록은 최대 8장, 한 입력 파일은 최대 20MB다. 카드 틀의 `object-fit: cover`는 화면 표현이고 확대/PDF는 보관본을 사용한다.

보관본·썸네일 Blob은 `sulsul-travel-media-v1/photos` IndexedDB 저장소에 둔다. `photos[]`의 보관 data URL과 `photoThumbnails[]`는 기존 동기 JSON·공유·PDF 호환 경로다. `mediaIds[]`는 로컬 Blob 연결이며, Blob과 JSON 보관본의 해시가 다르거나 Blob이 없으면 JSON으로 읽는다. 다른 기기의 JSON 복원에 IndexedDB가 필수인 구조로 만들지 않는다.

`MediaRepository.photoSource(record, index, {thumbnail})`는 동기 문자열 읽기, `mediaRepository.resolve(record, index, {thumbnail})`는 Blob URL 우선 읽기다. Blob URL은 뷰어를 닫거나 사진을 바꾸면 `release(url)`로 해제한다. 기존 문자열 사진과 기존에 잘린 사진은 변환·삭제하지 않는다.

여행 삭제는 여행 문서 저장이 성공한 뒤 해당 여행 소유의 미참조 Blob을 정리한다. 다른 여행 사본이 같은 `mediaIds`를 참조하면 보존한다. JSON/Gist 전체 복원은 새 문서를 저장한 뒤 전체 미참조 Blob을 정리하며, 저장 실패에는 정리를 시작하지 않는다. 보조 저장소 정리 실패는 여행 삭제·복원 성공을 되돌리지 않고 화면에 별도로 안내한다. 개별 사진·기록 삭제마다 실행하는 전역 정리는 아직 제공하지 않는다.

JSON에도 보관본을 유지하므로 localStorage 용량 한도는 남는다. 전체 미디어 SSOT를 IndexedDB로 이전하는 대규모 변경은 이번 범위가 아니다. 저장 실패 후 초안을 보존하고 재시도할 수 있지만 저장하지 않은 메모리 초안이 앱 종료 뒤까지 남는다고 보장하지 않는다.

## 검증

`tests/moment-journal.test.mjs`와 `tests/moment-journal.browser.cjs`는 여러 순간, 기존 기록 보존, 사진 비율/썸네일/Blob, 저장 실패·AI 적용 실패·삭제 실패, 승인/충돌, 이탈 방어, 320~430px 시트, 새로고침·JSON 사본 복원을 검사한다. 실제 IndexedDB에서 여행 삭제의 사본 참조 보존과 저장 실패 시 미정리, 전체 복원의 미참조 정리·JSON fallback도 검사한다. `tests/activity-journal.browser.cjs`는 기존 일정 기록의 같은 경계를 검사한다.

`tools-verify.ps1` R-4는 실제 가로·세로 사진을 처리해 보관본 1600×900/900×1600 및 썸네일 448×252/252×448을 확인한다. R-16은 같은 CDP 세션을 유지한 실제 360px 뷰포트에서 문서/카드/버튼 넘침과 필터 접근성을 측정한다. 임시 프로필·합성 데이터·고정 AI 응답을 사용하며 실제 API 키나 개인 여행을 읽지 않는다.
