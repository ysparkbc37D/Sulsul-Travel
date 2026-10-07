# 공동 여행 서버 연결

현재 앱은 서버 주소가 없으면 **서버 미연결** 상태로 동작한다. 기존 링크·JSON 파일 공유는 여행 사본 전달이며, 다른 사람의 수정이 원본에 자동 반영되는 공동 편집으로 표시하지 않는다.

이 변경은 Supabase에 연결할 수 있는 클라이언트·설치 SQL·권한 경계를 제공한다. 실제 프로젝트를 생성하거나 SQL을 실행하거나 공개 서버를 배포하지 않았다. 무료 요금제의 제공 조건·저장 용량·비활성 프로젝트 정책은 운영자가 프로젝트에서 확인해야 한다. 실제 동행자 2개 계정의 서버 테스트가 끝나기 전까지 운영 연결 검증이 완료된 것으로 보지 않는다.

## 운영자가 준비할 설정

1. 사용할 Supabase 프로젝트를 선택한다. 앱에는 기본 HTTPS URL과 **공개 publishable 키** 또는 기존 `anon` 키만 제공한다. `sb_secret_…` / `service_role`은 브라우저에 넣지 않는다. 공개 키와 로그인 JWT의 용도는 다르며 RLS가 실제 접근 권한을 제한한다. [Supabase API key 공식 안내](https://supabase.com/docs/guides/getting-started/api-keys)
2. 프로젝트의 Anonymous Sign-Ins를 활성화한다. 공개 운영 시에는 CAPTCHA·Auth 요청 제한과 익명 계정 관리 정책을 설정하고 `getCaptchaToken()` 연결을 제공한다. 익명 가입 사용자는 `authenticated` 역할을 사용하며 기존 `anon` API 키의 이름과 혼동하지 않는다. [Anonymous Sign-Ins 공식 안내](https://supabase.com/docs/guides/auth/auth-anonymous)
3. SQL Editor에서 `backend/supabase-travel.sql`을 확인한 뒤 실행한다. 기존 프로젝트의 같은 이름 테이블·정책·함수가 있다면 사전에 비교한다. 이 SQL은 독립된 신규 설치용이다. 실제 PostgreSQL 실행 검증은 아직 하지 않았다.
4. `pgcrypto`의 확장 스키마가 `extensions`인지 확인한다. 기존에 다른 스키마로 설치된 경우 SQL이 `PGCRYPTO_SCHEMA_MISMATCH`로 중단한다. 기존 앱의 확장을 임의로 이동하지 말고 SQL의 `extensions.digest` / `extensions.gen_random_bytes` 참조를 그 프로젝트 설치 위치에 맞춘 뒤 다시 검토한다.
5. Data API의 노출 스키마는 `public`만 사용하고 **`private`를 추가하지 않는다**. 쓰기 로직의 `SECURITY DEFINER` 함수는 `private`에, 호출용 `SECURITY INVOKER` 래퍼만 `public`에 둔다. 모든 테이블은 RLS를 사용하고 직접 INSERT/UPDATE/DELETE 권한을 제공하지 않는다. 함수의 기본 PUBLIC 실행 권한도 명시적으로 제거한다. [Database Functions](https://supabase.com/docs/guides/database/functions), [RLS 공식 안내](https://supabase.com/docs/guides/database/postgres/row-level-security)
6. 동일 앱을 받는 동행자가 개별 서버 설정 없이 참가하게 하려면 배포할 `js/config/collaboration-config.js`의 `SulsulCollaborationConfig.url` / `publicKey`를 실제 공개 설정으로 채운다. 클라이언트는 개인 설정이 없을 때만 이를 보충한다. 비어 있는 기본 설정은 미연결 상태를 유지한다. 개인 설정 화면에서 다른 프로젝트로 바꿀 수 있다. 설정 보충·저장만으로 로그인이나 여행 전송은 발생하지 않는다.

## 사용 흐름

- 여행 관리자는 **공동 여행 게시**를 눌러 계획만 서버에 보낸다. 개인 기록·사진·지출·환전·지갑·AI/외부 서비스 키는 전송 대상에서 제외한다. `currency` / `budget`은 여행 계획의 통화·예산 목표로 공유되며 실제 거래 내역은 공유하지 않는다. 계획 제목·설명·체크리스트·거점 메모는 동행에게 공개될 내용으로 취급한다.
- **보기 초대** / **함께 편집 초대**는 서버가 만든 32자 토큰으로 `https://앱주소/#invite=토큰`을 만든다. 전체 여행 JSON을 URL에 넣지 않는다. 초대 만료는 1·7·30일 중 선택한다. 링크를 가진 사람은 해당 권한으로 참가할 수 있으므로 원하는 동행에게만 전달한다.
- 초대 링크를 열면 참가 대기 상태만 표시한다. **초대 참가**를 눌러 임시 로그인·멤버 등록·계획 조회를 수행한다. 계획을 가져오는 것은 별도의 비교/적용 동작이다. 기존 여행을 자동으로 덮어쓰지 않는다.
- 초대를 취소하면 이후 참가를 막는다. 이미 참가한 사람은 **참여 해제**로 따로 관리한다. 참여 해제 후에도 유효한 초대 링크로 다시 참가할 수 있으므로 함께 초대 취소가 필요할 수 있다.
- 편집자는 로컬에서 수정한 뒤 **내 변경 보내기**로 게시한다. 원본 revision이 서버와 다르면 충돌로 표시하고 자동 병합·덮어쓰기·재기반을 하지 않는다. **서버 변경 확인**으로 비교한 뒤 적용 또는 새 사본 가져오기를 선택한다.
- 오프라인 변경은 개인 일기·사진을 제외한 계획과 작성 당시 revision·작성자·프로젝트를 로컬 outbox에 보관한다. 자동 백그라운드 전송은 없다. **대기 변경 보내기**에서만 시도한다. 충돌·다른 계정·다른 프로젝트의 항목을 새 revision으로 바꾸어 보내지 않는다.
- 서버 게시 후 브라우저의 연결 저장이 실패하면 같은 화면에서 **게시한 여행 연결 저장**으로 동일 문서에 다시 연결한다. 다시 게시하여 중복 문서를 만들지 않는다. 이 복구 정보는 해당 화면 메모리에 있으므로 저장 문제를 해결하기 전 새로고침하지 않는다.

## 데이터·권한 구조

| 객체 | 역할 |
| --- | --- |
| `travel_documents` | 계획 JSON·현재 revision·소유자 |
| `travel_memberships` | 여행별 owner/editor/viewer·표시 이름 |
| `travel_invites` | 토큰의 SHA-256 해시·권한·만료·취소 시각 |
| `travel_changes` | 적용된 revision·작성자·변경 요약·계획 스냅샷·mutation ID |

멤버는 본인이 속한 문서와 그 문서의 동행·변경 이력만 조회한다. 초대 목록은 관리자에게만 보이고 토큰 해시는 직접 조회 권한을 주지 않는다. 토큰 원문은 초대 생성 응답에서 한 번 반환한다. 초대 참가 RPC는 가입 전에 계획 내용·멤버 목록을 반환하지 않는다.

소유자만 초대 발급·취소·참여 해제를 한다. owner/editor만 계획 수정 RPC를 사용할 수 있다. 클라이언트의 역할 힌트를 바꾸거나 UI를 우회해도 서버의 멤버십 검사에서 다시 제한한다. `FOR UPDATE`와 expected revision 검사가 동시에 편집된 계획의 덮어쓰기를 막는다. 같은 mutation ID의 재시도는 중복 적용하지 않는다.

보여 주는 변경 이력은 날짜·revision·요약이다. 서버의 과거 계획 JSON은 서버에 남으며 현재 클라이언트는 이력 스냅샷 복구 기능을 제공하지 않는다. 실제 운영에는 보존 기간·문서 삭제·계정 전환/복구 정책을 추가해야 한다.

## 프런트엔드 연결 계약

스크립트 로딩 순서는 `TripAdapter` → `TripTransfer` → `collaboration-config.js` → `supabase-travel-service.js` → `collaboration-ui.js`다. 서비스는 SDK나 추가 런타임 의존성 없이 Auth REST와 PostgREST RPC를 사용한다. 공개 키는 `apikey`에, 사용자 로그인 JWT만 `Authorization: Bearer …`에 넣는다.

```js
SulsulTravel.CollaborationUI.checkInviteOnStartup(); // 감지만 수행, 네트워크 없음
const panel = SulsulTravel.CollaborationUI.mount('collaboration-container', {
  getTrip: () => getActiveTrip(),
  // 실제 설정된 CAPTCHA를 사용할 때만 제공한다.
  getCaptchaToken: () => getUserCompletedCaptchaToken(),
  onRoomLinked: ({tripId, link}) => refreshSharedRoleUI(tripId, link),
  onRemoteReview: async ({remote, localTrip, link, source}) => {
    // remote = {id, body, revision, role, updated_at}
    // 1. 서버 계획과 localTrip을 비교하는 화면을 연다.
    // 2. 사용자 '기존 계획에 적용' 또는 '새 사본 가져오기' 선택을 기다린다.
    // 3. 기존 일기·순간·일정 기록·사진·지출과 기록 참조를 보존한다.
    // 4. 저장 성공을 확인한 뒤에만 아래 결과를 반환한다.
    return {applied: true, tripId: savedTripId};
    // 취소·저장 실패: {applied: false}
  }
});
```

`roomForTrip(trip)`은 연결된 `{documentId, revision, role, projectUrl}`을 반환한다. 연결 정보는 개인 브라우저 저장소에만 보관하고 공유 파일에 넣지 않는다. `canEditSharedTrip(trip)`이 false면 공동 계획의 편집·AI 재생성·완료/고정/순서 변경을 공통 저장 경계에서 막되 개인 일기·사진·지출은 허용한다. 원격 검토를 통해 승인된 계획의 적용과 새 개인 사본 만들기는 별도 동작으로 처리한다. 최종 권한 검사는 서버에서 수행한다.

여행 전송은 `TripTransfer.create(trip,{journals:false,finances:false})`의 게시본을 다시 정리하고, 서버도 같은 개인 필드 제거·최상위 계획 허용 목록·크기/형식 검사를 수행한다. 향후 기록 필드를 추가할 때에는 서비스와 SQL의 개인 필드 계약을 함께 갱신한다. 계획 게시 한도는 1MB다.

## 검증 범위와 남은 운영 단계

`tests/collaboration.test.mjs`는 실제 서버가 아닌 mock fetch로 다음을 검사한다: 미연결/기본 설정의 네트워크 0, 공개/관리 키 구분, 개인 데이터 제외·원본 보존, Auth 헤더, 초대 역할/만료/취소 계약, viewer 제한, 서버 403, revision 충돌, outbox 원본 버전·중복 mutation·다른 계정 차단, 전송 중 다른 탭의 추가 항목 보존, 인증/토큰 갱신 중 프로젝트 변경 시 타 서버로 JWT·계획 전송 방지, 게시 성공 후 로컬 저장 실패 재연결. SQL 정적 계약 검사는 실제 RLS 테스트를 대체하지 않는다.

실제 프로젝트에서는 관리자·편집자·보기 전용·비참여자 계정을 분리해 다음을 확인한다.

1. 보기 전용 계정의 RPC 수정과 직접 테이블 쓰기를 거절하는지, 비참여자가 문서·멤버·초대를 조회하지 못하는지.
2. 편집자에게 초대 발급/취소·동행 삭제 권한이 없는지, 초대 취소/만료 후 참가를 거절하는지.
3. 두 편집자가 같은 revision을 수정할 때 하나만 적용되고, 재시도 mutation이 중복되지 않는지.
4. 서로 다른 기기에서 실제 배포 주소의 짧은 초대가 열리고, CAPTCHA·익명 Auth·프로젝트 공개 설정이 작동하는지.
5. 서버/브라우저의 데이터 삭제·익명 로그인 복구·다른 기기 계정 연결 정책이 준비되어 있는지.

현재 임시 로그인은 같은 브라우저에서 이어서 사용할 수 있는 초기 연결이다. 브라우저 데이터 삭제·프로젝트 전환·다른 기기에서는 동일 관리자 계정 복구를 보장하지 않는다. 평생 기록과 여러 기기 동행이라는 앱의 장기 컨셉에는 이후 이메일/OAuth 계정 연결·관리자 복구·서버 백업·삭제 정책이 필요하다. [익명 계정의 영구 계정 연결 안내](https://supabase.com/docs/guides/auth/auth-anonymous)
