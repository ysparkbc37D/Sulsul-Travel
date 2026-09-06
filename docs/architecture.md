# 술술트래블 아키텍처 문서

> 아래는 초기 설계의 역사적 기록이며 현재 구현 및 목표 구조와 차이가 있습니다. 최신 설계는 [확장 아키텍처](architecture-vnext.md), [AI 오케스트레이션](orchestration.md), [UI/UX 명세](ux-blueprint.md), [개발 모델](development-model.md)을 기준으로 합니다. 현재 실제 여행 저장 키는 `st_trips_v2`입니다. AI 및 미캐시 지도 자원은 네트워크가 필요합니다. 아래 고정 모델 목록·무조건 오프라인·정확한 환율 표현은 현재 동작의 보증이 아닙니다.

# 초기 Architecture & Orchestration Model

## 1. 개요 (Overview)
술술트래블(Sulsul-Travel)은 **술술다이어리(Sulsul-Diary)**의 엔터프라이즈 프론트엔드 오케스트레이션 아키텍처를 계승하여 구축된 여행 특화 PWA입니다.
별도의 서버 구축 없이 브라우저 자체의 스토리지와 Gemini AI API, Service Worker를 결합하여 **100% 무과금·무서버(Zero-Backend) 환경**에서 동작합니다.

```
┌────────────────────────────────────────────────────────┐
│                   술술트래블 프론트엔드                   │
│   (HTML5 + Vanilla Modern JS + Tailwind CSS-like Dark)  │
└───────┬──────────────────────┬──────────────────┬──────┘
        │                      │                  │
        ▼                      ▼                  ▼
┌──────────────┐       ┌──────────────┐    ┌──────────────┐
│ Service      │       │ LocalStorage │    │ Gemini AI    │
│ Worker       │       │ + IndexedDB  │    │ Fallback     │
│ (sw.js)      │       │ (State Store)│    │ Loop Engine  │
└──────────────┘       └──────────────┘    └──────┬───────┘
  • Stale-While-        • Offline Data            │
    Revalidate            Persistence             ├─▶ gemini-2.5-flash
  • 100% 오프라인         • Smart Draft State      ├─▶ gemini-2.0-flash
    비행기모드 보장        • Ledger & Photo Blob   └─▶ gemini-1.5-flash
```

---

## 2. 핵심 설계 원칙 (Core Architectural Pillars)

### ① Zero-Backend & Offline-First Persistence
- **GitHub Pages 배포**: 복잡한 클라우드(AWS, GCP, Supabase 등) 서버나 백엔드 컨테이너 없이 순수 정적 파일(`index.html`, `kb-travel.js`, `manifest.webmanifest`, `sw.js`)로 배포됩니다.
- **Service Worker (`sw.js`)**: 앱 셸 및 핵심 에셋을 사전 캐싱(`CACHE_NAME = 'sulsul-travel-v1'`)하여 네트워크가 단절된 비행기나 고산지대에서도 앱이 즉시 로드됩니다.
- **LocalStorage 단일 진실 공급원(Single Source of Truth)**:
  - `sulsul_travel_plan`: 여행 일정 및 30분 단위 타임라인 데이터
  - `sulsul_travel_expenses`: 다통화 지출 내역 및 카테고리
  - `sulsul_travel_diaries`: 일자별 포토 앨범 & 감성 에세이
  - `sulsul_travel_checklist`: 패킹 및 준비물 체크 상태
  - `sulsul_travel_settings`: 환율 설정, MEP 적용 여부, Gemini API 키

### ② Gemini Multi-Model Fallback Loop
- 무료 티어 API의 RPM( 분당 요청 수) 또는 일시적인 모델 오류에 유연하게 대응하기 위해 3단계 자동 폴백 회로를 구현했습니다:
  ```javascript
  const MODELS = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
  ];
  ```
- 1차 시도에서 실패할 경우 콘솔 및 상태 표시줄에 경고를 남기고 다음 안정화 모델로 즉시 전환되어 유저 경험을 해치지 않습니다.

### ③ Smart Draft (`[초안]` 태그) 오케스트레이션
- AI가 추천한 일정 및 지출 계획은 자동으로 `isDraft: true` 속성을 가집니다.
- UI 상에서 황금빛 `[초안]` 배지로 표기되며, 유저가 확인 후 수정하거나 체크 버튼을 누르면 확정(`isDraft: false`) 상태로 전이됩니다.
- 유저는 언제든지 30분 단위로 세부 시간표를 수정, 삽입, 삭제할 수 있습니다.

### ④ 3:4 캔버스 자동 정규화 포토 엔진
- 모바일 카메라로 촬영한 고해상도 사진(10~20MB)을 그대로 로컬 스토리지에 저장하면 용량 한계에 부딪힙니다.
- 브라우저 Canvas API를 활용해 다음과 같이 정규화(`normalizeThumb`)합니다:
  - 인스타그램/폴라로이드 규격인 **3:4 비율**로 중앙 크롭
  - 최대 너비 800px로 다운샘플링
  - WebP / JPEG(품질 0.8) 압축을 통해 파일당 100~200KB 수준으로 경량화

### ⑤ 실시간 환율 & 아르헨티나 MEP 우대 환율 계산기
- 남미 여행의 특수성(공식 환율과 암환율의 격차)을 반영하여, 아르헨티나 페소(ARS)에 대해 외국인 관광객 신용카드 우대 환율(MEP) 스위치를 제공합니다.
- MEP 토글 활성화 시 실제 체감 비용을 정확하게 원화(KRW)로 산출하여 예산 초과를 방지합니다.
