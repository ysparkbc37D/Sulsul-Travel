# ✈️ 술술트래블 (Sulsul-Travel) - AI 여행 어시스턴트 & 데일리 다이어리

[![PWA Ready](https://img.shields.io/badge/PWA-Ready-22c55e.svg?style=flat-square&logo=pwa)](https://github.com/ysparkbc37D/Sulsul-Travel)
[![Zero Backend](https://img.shields.io/badge/Zero--Backend-100%25%20Offline--First-3b82f6.svg?style=flat-square)](https://github.com/ysparkbc37D/Sulsul-Travel)
[![Gemini AI](https://img.shields.io/badge/AI-Gemini%20Multi--Model%20Fallback-f59e0b.svg?style=flat-square&logo=google)](https://github.com/ysparkbc37D/Sulsul-Travel)
[![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-black.svg?style=flat-square&logo=github)](https://ysparkbc37d.github.io/Sulsul-Travel/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

> **"술술 읽히고, 술술 계획하고, 술술 기록하는 스마트 여행 메이트"**  
> **술술트래블**은 **술술다이어리(Sulsul-Diary)**의 엔터프라이즈 오케스트레이션 아키텍처를 차용한 **100% Zero-Backend, Offline-First PWA 여행 어시스턴트 & 다이어리 앱**입니다.

---

## 🌟 핵심 특징 (Key Highlights)

### 1. 🌐 Zero-Backend & 100% Offline-First (GitHub Pages 무료 호스팅)
- 별도의 DB 서버나 백엔드 인프라 비용 없이 **GitHub Pages 100% 무료 정적 웹 호스팅**으로 즉시 배포 및 구동됩니다.
- **Service Worker (`sw.js`)** 기반의 로컬 캐싱과 브라우저 **LocalStorage / IndexedDB**를 결합하여 **비행기 모드, 안데스 고산 지대, 우유니 사막 등 통신 음영 지역에서도 100% 모든 기능이 완벽하게 오프라인 작동**합니다.

### 2. 🤖 Gemini Multi-Model Fallback Loop & Smart Draft
- **AI 추천 엔진**: 사용자가 가고 싶은 목적지, 여행 기간, 테마를 입력하면 Gemini AI가 30분 단위 정밀 일정, 최적 동선, 교통편, 추천 맛집 및 예상 예산을 자동 편성합니다.
- **Multi-Model Fallback**: 할당량 초과나 일시적 장애를 방지하기 위해 `gemini-2.5-flash` ➔ `gemini-2.0-flash` ➔ `gemini-1.5-flash`로 자동 폴백(Fallback)되어 안정적인 응답을 보장합니다.
- **Smart Draft (`[초안]` 배지 시스템)**: AI가 제안한 모든 일정과 항목은 `[초안]` 뱃지가 부여되며, 사용자가 탭 한 번으로 자유롭게 수정, 추가, 삭제 및 확정할 수 있습니다.

### 3. 📊 상단 실시간 종합 통계 대시보드 (Top Analytics Dashboard)
- 앱 상단에 상시 고정되는 실시간 비행기 계기판형 대시보드:
  - **총 지출액 & 잔여 예산**: 실시간 환율을 반영한 원화 환산 총지출액 및 예산 소진율 프로그레스 바
  - **여행 진행도 (D-Day)**: 현재 일차 및 전체 여정 대비 진척도
  - **방문 국가 & 도시 수**: 페루, 볼리비아, 칠레, 아르헨티나, 브라질 등 방문 카운트
  - **기록 통계**: 누적 작성된 데일리 일기 및 저장된 사진 편수 실시간 집계

### 4. 💱 다통화 실시간 가계부 & 아르헨티나 MEP 환율 우대 스위치
- 여행지에서 지출한 금액을 현지 통화로 기록하면 원화(KRW)로 자동 정산:
  - 지원 통화: **KRW, USD, PEN(페루 솔), ARS(아르헨티나 페소), BRL(브라질 헤알), EUR, JPY**
  - **아르헨티나 MEP(블루환율) 스위치**: 공식 환율 대비 약 1.5배 유리한 외국인 카드 우대 환율(MEP)을 토글 한 번으로 자동 적용하여 실제 카드 결제 금액을 정확히 추적합니다.
  - 카테고리별 지출 분석(식비, 교통, 숙박, 액티비티, 쇼핑, 기타) 및 원형 차트 시각화.

### 5. 📸 3:4 캔버스 자동 정규화 포토 앨범 & 감성 데일리 에세이
- 모바일에서 업로드한 사진을 브라우저 캔버스 API로 3:4 비율 규격화 및 경량화(WebP/JPEG 리사이징)하여 저장 용량을 최적화합니다.
- 오늘 하루 겪은 일과 감정을 키워드로 남기면, AI가 여행 감성을 극대화한 데일리 여행 에세이로 윤문해 주는 **감성 작가 기능**을 탑재했습니다.

### 6. 🗺️ 남미 22일 최적화 황금 코스 시드 탑재 (`kb-travel.js`)
- 앞서 기획된 **LA 2일 + 페루(리마/이카/쿠스코/마추픽추) + 볼리비아(라파스/우유니) + 아르헨티나(부에노스아이레스) + 이과수 폭포 + 브라질(리우)**에 이르는 22일간의 30분 단위 정밀 타임라인과 체크리스트가 기본 지식 베이스로 내장되어 있습니다.

---

## 📱 스크린샷 및 UI 구조

```
┌────────────────────────────────────────────────────────┐
│ ✈️ 술술트래블 (Sulsul-Travel)               ⚙️ API 설정│
├────────────────────────────────────────────────────────┤
│ 📊 실시간 종합 대시보드                                  │
│  [ 총 지출: ₩ 3,420,000 / ₩ 6,000,000 (57% 소진) ]     │
│  [ 여정 진행: Day 7 / 22일 (32%) | 방문: 3개국 6개도시 ] │
├────────────────────────────────────────────────────────┤
│ 📑 탭 네비게이션: [ 일정 플래너 ] [ 가계부 ] [ 여행기록 ] [ 체크리스트 ] │
├────────────────────────────────────────────────────────┤
│ 🗓️ Day 5: 쿠스코 ➔ 마추픽추                             │
│   • 06:00 🚆 페루레일 오얀타이탐보 출발                │
│   • 09:30 🏔️ 마추픽추 서킷 2 가이드 투어 [초안]        │
│   • 13:00 🍽️ 아구아스 칼리엔테스 킨와 퓨전 런치         │
│   [+ 30분 단위 일정 추가]  [✨ AI 추천 일정 받기]       │
├────────────────────────────────────────────────────────┤
│ 💳 가계부 퀵 입력 | 📸 사진 업로드 | ✍️ 데일리 에세이 작성 │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 빠른 시작 (GitHub Pages 배포 가이드)

### 1. GitHub Pages 활성화
1. GitHub 저장소(`https://github.com/ysparkbc37D/Sulsul-Travel`)로 이동합니다.
2. 상단 메뉴의 **Settings** ➔ 좌측 사이드바의 **Pages** 클릭.
3. **Build and deployment** 섹션의 **Branch** 설정을 다음과 같이 지정합니다:
   - Branch: `main`
   - Folder: `/ (root)`
4. **Save** 버튼을 클릭합니다.
5. 약 1~2분 후 배포가 완료되면 다음 URL로 앱에 접속할 수 있습니다:
   👉 **`https://ysparkbc37d.github.io/Sulsul-Travel/`**

---

## 📲 모바일 홈 화면 앱 설치 (PWA)

술술트래블은 완벽한 PWA 규격을 충족하므로 앱스토어 설치 없이 네이티브 앱처럼 스마트폰 홈 화면에 추가할 수 있습니다:

- **iOS (iPhone Safari)**:
  1. Safari로 배포 URL 접속
  2. 하단 중앙의 **공유(Share)** 아이콘 클릭
  3. **'홈 화면에 추가 (Add to Home Screen)'** 선택
- **Android (Chrome)**:
  1. Chrome으로 배포 URL 접속
  2. 브라우저 우측 상단 더보기(⋮) ➔ **'앱 설치'** 또는 **'홈 화면에 추가'** 클릭

---

## 📂 프로젝트 구조

```
Sulsul-Travel/
├── .gitignore                     # Git 제외 설정
├── .nojekyll                      # GitHub Pages 정적 에셋 무시 방지 플래그
├── index.html                     # 술술트래블 단일 파일 SPA 완성형 코어
├── kb-travel.js                   # 여행 도메인 지식 베이스 (환율, 22일 남미 시드 데이터)
├── manifest.webmanifest           # PWA 웹 매니페스트
├── sw.js                          # 오프라인 캐싱 Service Worker
├── south_america_illustrated_map.jpg # 남미 일러스트 루트 지도 에셋
├── icons/                         # PWA 고해상도 앱 아이콘
│   ├── apple-touch-icon.png       # iOS 홈 화면 아이콘 (180x180)
│   ├── icon-192.png               # Android 표준 아이콘 (192x192)
│   ├── icon-512.png               # 스플래시 화면 아이콘 (512x512)
│   ├── icon-maskable-192.png      # 반응형 마스커블 아이콘 (192x192)
│   └── icon-maskable-512.png      # 반응형 마스커블 아이콘 (512x512)
└── README.md                      # 프로젝트 매뉴얼 및 가이드
```

---

## 🔑 Gemini API 키 설정

1. [Google AI Studio](https://aistudio.google.com/app/apikey)에서 무료 Gemini API 키를 발급받습니다.
2. 앱 우측 상단의 ⚙️ **API 설정** 아이콘을 클릭합니다.
3. 발급받은 API 키를 입력하고 **저장**합니다.
   - 키는 사용자의 로컬 브라우저(`localStorage`)에만 안전하게 저장되며 외부 서버로 절대 전송되지 않습니다.
   - API 키가 없어도 내장된 22일 남미 시드 일정, 수동 가계부, 오프라인 다이어리, 환율 계산기 등 모든 기본 기능은 100% 무료로 정상 작동합니다.

---

## 📄 라이선스 (License)

본 프로젝트는 [MIT License](LICENSE)를 따릅니다. 누구나 자유롭게 포크하여 자신의 여행 계획 및 다이어리 앱으로 개조하여 사용할 수 있습니다.
