# 📜 술술체인지스 (Sulsul-Travel Changes & Version History)

본 문서는 **술술트래블 (Sulsul-Travel)**의 모든 버전별 변경 내역(신규 기능, 개선 사항, 버그 수정, 아키텍처 개편)을 엄격하게 기록하는 **공식 변경 이력서(CHANGELOG)**입니다.

모든 버전 번호는 [Semantic Versioning 2.0.0](https://semver.org/) 및 `술술트래블신록`의 버전 관리 원칙(`주.부.수`)을 엄격히 준수합니다.

---

## 📌 버전 관리 원칙 (Release Protocol)
1. **버전 표기**: `v주.부.수` (예: `v1.0.0` $\rightarrow$ `v1.0.1`)
2. **올림 규칙**:
   - **수 (Patch)**: 버그 수정, 스타일 미세 조정, 리팩토링 (`+1`)
   - **수 = 9 도달 시**: 다음 릴리즈에서 `부 (Minor)`를 `+1` 올리고 `수`를 `0`으로 리셋 (`v1.0.9` $\rightarrow$ `v1.1.0`)
   - **부 (Minor)**: 신규 기능 추가, 새로운 도시/데이터셋 추가, UI 컴포넌트 확장
   - **주 (Major)**: Zero-Backend 아키텍처 전면 개편, 스토리지 스키마 비호환 마이그레이션
3. **서비스 워커 캐시 갱신**:
   - 버전이 올라갈 때마다 `sw.js`의 `const V = 'st-shell-vX.Y.Z'`를 동일하게 갱신하여 클라이언트의 캐시 무효화를 보장합니다.

---

## [Unreleased]
### Planned
- [ ] 오프라인 GPS 기반 현재 위치와 일정 자동 매칭 기능
- [ ] 여행 가계부 영수증 OCR(Gemini Vision) 자동 입력 기능
- [ ] 여행 종료 후 PDF 여행 보고서 및 포토북 원클릭 출력 기능

---

## [v1.0.1] - 2026-09-06
### 🐛 긴급 버그 수정 (Critical Fixes)
- **모달(Bottom Sheet) 오버레이 레이어 뷰포트 점유 및 전체 클릭 먹통 버그 원천 해결**:
  - `modal-spot`, `modal-expense`, `modal-ai-trip`, `modal-ai-chat` 등 4개 모달 컨테이너가 닫힘 상태(`.sheet-closed`)일 때 `fixed inset-0 z-50` 영역 전체를 차지하여 하위의 모든 버튼("시간표", "전체 펼치기", "+ 스팟 추가", 탭 네비게이션) 클릭을 가로채던 결함 수정.
  - `.sheet-closed`에 `display: none !important; visibility: hidden !important; pointer-events: none !important;` 및 `transform: translateY(100vh)`를 부여하여 닫힘 상태에서 클릭 관통 및 오프스크린 완전 은폐 보장.
  - 데스크톱 중앙 정렬(`sm:items-center`) 시 모달 상단이 화면 하단에 삐져나오던 시각 결함 해결.
- **ESC 키 전역 모달 닫기 지원**:
  - 키보드 `Escape` 키 입력 시 열려 있는 모든 모달 시트를 즉시 안전하게 닫도록 이벤트 리스너 추가.
  - 모달 오픈 시 배경 스크롤 락(`overflow: hidden`), 닫힘 시 자동 해제 처리.
- **Day 일정 타임라인 "시간표" 버튼 인터랙션 강화**:
  - 일자별 "시간표" 버튼을 독립된 터치 타깃 버튼(`bg-[#1a233a] border border-[#283554] cursor-pointer`)으로 시각화 개선.
  - 일차 제목 클릭 시에도 타임라인 아코디언이 즉시 토글되도록 UX 향상.

---

## [v1.0.0] - 2026-09-06
### 🎉 공식 첫 런칭 (Initial Official Release)
**술술다이어리(Sulsul-Diary)**의 엔터프라이즈 프론트엔드 오케스트레이션 아키텍처를 차용한 100% 무서버(Zero-Backend), 오프라인 퍼스트(Offline-First) 여행 어시스턴트 & 데일리 다이어리 웹앱 공식 런칭.

### 🌟 신규 기능 (Added)
- **상단 실시간 종합 통계 대시보드 (Top Analytics Banner)**:
  - 총 예산 대비 지출액 및 소진율 실시간 프로그레스 바 (`#top-analytics`)
  - 여행 진행도 (D-Day 진행 바 및 일차 표시)
  - 방문 국가 & 도시 수 자동 집계
  - 데일리 다이어리 작성 편수 및 등록 사진 수 실시간 연동
- **30분 단위 스마트 일정 플래너 (Smart Itinerary Planner)**:
  - 10월 11일(22일 풀 플랜) & 10월 12일(21일 최적화 플랜) 남미 황금 코스 탑재
  - 일자별 30분~1시간 단위 타임라인 아코디언 (개별/전체 펼치기 지원)
  - 30분 단위 일정 수동 추가 및 삭제 기능
- **Gemini Multi-Model Fallback Engine**:
  - `gemini-2.5-flash` ➔ `gemini-2.0-flash` ➔ `gemini-1.5-flash` 3단계 자동 폴백 회로
  - 사용자 목적지·기간·테마 기반 30분 단위 추천 일정 자동 생성
  - 1:1 AI 여행 어시스턴트 실시간 챗봇 인터페이스
- **Smart Draft (`[초안]`) 시스템**:
  - AI가 추천한 일정 및 코스 항목에 `[초안]` 배지 자동 부여
  - 사용자가 확인 후 터치 한 번으로 확정(`isDraft: false`) 또는 자유로운 커스텀 수정
- **다통화 실시간 가계부 & 아르헨티나 MEP 우대 환율 스위치**:
  - 7대 통화 지원: KRW, USD, PEN(솔), ARS(페소), BRL(헤알), EUR, JPY
  - 외국인 관광객 신용카드 우대 환율(MEP) 원클릭 토글 스위치 탑재
  - 카테고리별(식비, 숙박, 교통, 투어, 쇼핑, 기타) 지출 내역 및 원화 자동 환산
- **3:4 캔버스 자동 정규화 포토 다이어리 & 감성 에세이 작가**:
  - 브라우저 Canvas API 기반 3:4 규격 리사이징 및 경량화(WebP/JPEG)로 로컬 스토리지 쿼터 방어
  - 키워드 기반 AI 감성 여행 에세이 자동 윤문 기능
- **스마트 패킹 & 여행 준비 체크리스트**:
  - 여권, ESTA, 고산병 약, 어댑터 등 남미 특화 체크리스트 내장 및 실시간 진행률 연동
- **내장 지식 베이스 (`kb-travel.js`)**:
  - LA 2일 + 페루(리마/이카/쿠스코/마추픽추) + 볼리비아(우유니) + 아르헨티나(부에노스아이레스) + 이과수 폭포 + 브라질(리우) 22일 풀 코스 시드 탑재

### 🏗️ 아키텍처 및 인프라 (Architecture)
- **Zero-Backend**: 외부 서버 없이 GitHub Pages 100% 무료 정적 웹 호스팅으로 배포
- **Offline-First PWA**:
  - `sw.js`: Stale-While-Revalidate 캐싱 전략 탑재
  - `manifest.webmanifest`: 192x192, 512x512, maskable, iOS apple-touch-icon 규격 충족
  - 로컬 스토리지 단일 진실 공급원(SSOT) 아키텍처
- **Dark Luxury Aesthetic**:
  - Deep Onyx (`#0b0f19`) 배경, Golden Amber 및 Emerald 포인트 컬러
  - OS 기본 3D 이모지를 배제하고 순수 벡터 스트로크 SVG 아이콘 시스템 적용

### ✅ 검증 (Verification)
- Headless Microsoft Edge V8 런타임 구동 검증 통과 (런타임 에러 0건)
- PWA 오프라인 캐시 및 홈 화면 설치 규격 통과
- GitHub Pages 원격 저장소(`https://github.com/ysparkbc37D/Sulsul-Travel.git`) 배포 완료
