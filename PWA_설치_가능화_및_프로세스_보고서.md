# PWA 설치 가능화 및 설치 프로세스 상세 보고서

## 📋 목차
1. [현재 문제점](#현재-문제점)
2. [설치 가능하게 만들기](#설치-가능하게-만들기)
3. [설치 프로세스 상세](#설치-프로세스-상세)
4. [브라우저별 동작](#브라우저별-동작)
5. [사용자 경험 흐름](#사용자-경험-흐름)
6. [구현 계획](#구현-계획)

---

## 현재 문제점

### 1. 기본 manifest.json의 icons가 비어있음

**파일:** `public/manifest.json`
```json
{
  "name": "Cruise Guide",
  "short_name": "CruiseGuide",
  "start_url": "/",
  "display": "standalone",
  "icons": []  // ⚠️ 비어있음!
}
```

**영향:**
- 브라우저가 PWA 설치 조건을 만족하지 못함
- `beforeinstallprompt` 이벤트가 발생하지 않음
- 버튼 클릭 시 아무 일도 일어나지 않음

### 2. Service Worker 등록 타이밍 문제

**현재:**
- Service Worker가 버튼 클릭 시 등록됨
- 이미 늦음 (PWA 조건 체크는 페이지 로드 시점에 이루어짐)

### 3. 두 개의 PWA를 하나의 manifest로 관리

**문제:**
- 크루즈가이드 지니와 크루즈몰은 서로 다른 PWA
- 하지만 기본 manifest.json 하나만 사용
- 동적 변경은 작동하지 않음

---

## 설치 가능하게 만들기

### 단계 1: 기본 manifest.json 완전히 채우기

**수정할 파일:** `public/manifest.json`

**수정 내용:**
```json
{
  "name": "크루즈몰",
  "short_name": "크루즈몰",
  "description": "크루즈 상품을 둘러보고 구매할 수 있는 크루즈몰",
  "start_url": "/?utm_source=pwa&utm_medium=home_screen",
  "scope": "/",
  "display": "standalone",
  "background_color": "#FFFFFF",
  "theme_color": "#FFFFFF",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/mall-icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/mall-icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "shortcuts": [
    {
      "name": "크루즈몰 메인",
      "short_name": "메인",
      "description": "크루즈몰 메인 페이지로 이동",
      "url": "/?utm_source=pwa&utm_medium=shortcut",
      "icons": [
        {
          "src": "/icons/mall-icon-192.png",
          "sizes": "192x192"
        }
      ]
    }
  ]
}
```

**효과:**
- ✅ PWA 설치 조건 만족
- ✅ 브라우저가 설치 가능하다고 판단
- ✅ `beforeinstallprompt` 이벤트 발생 가능

### 단계 2: Service Worker를 페이지 로드 시 등록

**수정할 파일:** `app/layout.tsx` 또는 별도 컴포넌트

**추가할 코드:**
```typescript
// app/layout.tsx 또는 components/PWASetup.tsx
'use client';

import { useEffect } from 'react';

export default function PWASetup() {
  useEffect(() => {
    // Service Worker 등록 (페이지 로드 시 즉시)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('[PWA Setup] Service Worker 등록 완료:', registration.scope);
        })
        .catch((error) => {
          console.warn('[PWA Setup] Service Worker 등록 실패:', error);
        });
    }
  }, []);

  return null; // UI 없음
}
```

**효과:**
- ✅ 페이지 로드 시 Service Worker 등록
- ✅ PWA 설치 조건 만족
- ✅ 브라우저가 설치 가능하다고 판단

### 단계 3: PWA 설치 버튼 개선

**수정할 파일:** `components/PWAInstallButtonMall.tsx`, `components/PWAInstallButtonGenie.tsx`

**개선 사항:**
1. 설치 가능 여부 사전 체크
2. iOS 사용자 안내 추가
3. 사용자 피드백 개선

---

## 설치 프로세스 상세

### Android Chrome에서의 설치 프로세스

#### 1단계: 페이지 로드 시 브라우저가 PWA 조건 체크

```
사용자가 https://www.cruisedot.co.kr 접속
    ↓
브라우저가 manifest.json 읽기
    ↓
PWA 설치 조건 체크:
  ✅ HTTPS 사용 중
  ✅ manifest.json 유효함
  ✅ icons 배열에 192x192, 512x512 아이콘 있음
  ✅ Service Worker 등록됨
  ✅ display: "standalone" 설정됨
    ↓
조건 만족! → beforeinstallprompt 이벤트 발생 준비
```

#### 2단계: beforeinstallprompt 이벤트 발생

```
브라우저가 beforeinstallprompt 이벤트 발생
    ↓
PWAInstallButtonMall 컴포넌트의 useEffect에서 이벤트 캐치
    ↓
e.preventDefault() 호출 (기본 프롬프트 방지)
    ↓
deferredPrompt 상태에 저장
    ↓
버튼이 활성화됨 (사용자에게 표시)
```

#### 3단계: 사용자가 버튼 클릭

```
사용자가 "크루즈몰 바탕화면에 추가하기" 버튼 클릭
    ↓
handleInstallClick 함수 실행
    ↓
deferredPrompt.prompt() 호출
    ↓
브라우저가 설치 프롬프트 표시:
  ┌─────────────────────────────┐
  │  크루즈몰 설치              │
  │                             │
  │  [아이콘] 크루즈몰          │
  │                             │
  │  [설치]  [취소]             │
  └─────────────────────────────┘
```

#### 4단계: 사용자가 "설치" 선택

```
사용자가 "설치" 버튼 클릭
    ↓
deferredPrompt.userChoice Promise 해결
    ↓
outcome === 'accepted'
    ↓
설치 진행:
  1. 앱 아이콘이 홈 화면에 추가됨
  2. 앱 이름: "크루즈몰"
  3. 앱 아이콘: mall-icon-192.png
  4. 시작 URL: /?utm_source=pwa&utm_medium=home_screen
    ↓
설치 완료!
    ↓
서버에 설치 기록 (POST /api/pwa/install)
    ↓
사용자를 메인 페이지로 리다이렉트
```

#### 5단계: 설치 후 실행

```
사용자가 홈 화면의 "크루즈몰" 아이콘 클릭
    ↓
앱이 standalone 모드로 실행됨
    ↓
주소창 없이 전체 화면으로 표시
    ↓
Service Worker가 오프라인 지원
    ↓
푸시 알림 수신 가능
```

### iOS Safari에서의 설치 프로세스

#### 1단계: 자동 설치 불가

```
iOS Safari는 beforeinstallprompt 이벤트를 지원하지 않음
    ↓
자동 설치 프롬프트 표시 불가
    ↓
수동 설치만 가능
```

#### 2단계: 수동 설치 가이드 표시

```
사용자가 "바탕화면에 추가하기" 버튼 클릭
    ↓
iOS 감지됨
    ↓
수동 설치 가이드 모달 표시:
  ┌─────────────────────────────┐
  │  iOS에서 홈 화면에 추가하기 │
  │                             │
  │  1. Safari 하단의 공유 버튼 │
  │     (□↑) 클릭               │
  │                             │
  │  2. "홈 화면에 추가" 선택    │
  │                             │
  │  3. "추가" 버튼 클릭         │
  │                             │
  │  [이미지: iOS 설치 가이드]  │
  │                             │
  │  [확인]                     │
  └─────────────────────────────┘
```

#### 3단계: 사용자가 수동으로 설치

```
사용자가 Safari 공유 버튼 클릭
    ↓
"홈 화면에 추가" 선택
    ↓
앱 이름 확인 및 "추가" 클릭
    ↓
홈 화면에 아이콘 추가됨
    ↓
설치 완료!
```

---

## 브라우저별 동작

### Android Chrome

**자동 설치 지원:**
- ✅ `beforeinstallprompt` 이벤트 발생
- ✅ 프로그래밍적 설치 프롬프트 지원
- ✅ 버튼 클릭 시 자동 설치 가능

**설치 조건:**
- 최소 방문 시간: 30초 이상
- 최소 방문 횟수: 2회 이상
- 사용자 참여도: 스크롤, 클릭 등 상호작용 필요

**설치 프롬프트:**
- 주소창에 설치 배지 표시
- 또는 버튼 클릭 시 프롬프트 표시

### iOS Safari

**자동 설치 미지원:**
- ❌ `beforeinstallprompt` 이벤트 미지원
- ❌ 프로그래밍적 설치 프롬프트 미지원
- ✅ 수동 설치만 가능

**수동 설치 방법:**
1. Safari 공유 버튼(□↑) 클릭
2. "홈 화면에 추가" 선택
3. "추가" 버튼 클릭

**제한사항:**
- Service Worker 기능 제한적
- 푸시 알림 지원 제한적

### Samsung Internet

**자동 설치 지원:**
- ✅ `beforeinstallprompt` 이벤트 지원 (Chrome과 유사)
- ✅ 프로그래밍적 설치 프롬프트 지원
- ✅ 버튼 클릭 시 자동 설치 가능

**차이점:**
- 일부 조건이 Chrome과 다를 수 있음
- 설치 프롬프트 UI가 약간 다를 수 있음

### 기타 브라우저

**Firefox (Android):**
- PWA 설치 지원 제한적
- 수동 설치 가이드 필요

**Edge (Android):**
- Chrome과 유사하게 작동
- `beforeinstallprompt` 이벤트 지원

---

## 사용자 경험 흐름

### 시나리오 1: Android Chrome - 자동 설치 성공 ⚠️ (자동 설치 프롬프트는 Android만 가능)

**⚠️ 중요:** 이 시나리오는 **Android Chrome에서만** 가능합니다. iOS는 자동 설치 프롬프트를 지원하지 않습니다.

```
1. 사용자가 https://www.cruisedot.co.kr 접속
   → 페이지 로드
   → Service Worker 등록
   → manifest.json 읽기
   → PWA 조건 만족 확인

2. 사용자가 페이지를 30초 이상 사용
   → 스크롤, 클릭 등 상호작용
   → 브라우저가 beforeinstallprompt 이벤트 발생
   ⚠️ iOS Safari는 이 단계에서 이벤트가 발생하지 않음

3. 사용자가 "크루즈몰 바탕화면에 추가하기" 버튼 클릭
   → 설치 프롬프트 표시 (Android Chrome만)
   → "설치" 버튼 클릭

4. 설치 완료
   → 홈 화면에 "크루즈몰" 아이콘 추가
   → 앱 실행 가능
   ✅ 이 단계는 모든 브라우저에서 동일하게 작동

5. 사용자가 홈 화면의 아이콘 클릭
   → 앱이 standalone 모드로 실행
   → 주소창 없이 전체 화면
   ✅ 이 단계는 모든 브라우저에서 동일하게 작동
```

**요약:**
- ✅ **자동 설치 프롬프트**: Android Chrome만 가능
- ✅ **수동 설치**: iOS Safari도 가능 (시나리오 2 참고)
- ✅ **최종 결과 (홈 화면 추가, standalone 실행)**: 모든 브라우저에서 동일

### 시나리오 2: iOS Safari - 수동 설치

```
1. 사용자가 https://www.cruisedot.co.kr 접속
   → 페이지 로드
   → Service Worker 등록
   → manifest.json 읽기

2. 사용자가 "크루즈몰 바탕화면에 추가하기" 버튼 클릭
   → iOS 감지됨
   → 수동 설치 가이드 모달 표시

3. 사용자가 가이드에 따라 수동 설치
   → Safari 공유 버튼 클릭
   → "홈 화면에 추가" 선택
   → "추가" 버튼 클릭

4. 설치 완료
   → 홈 화면에 "크루즈몰" 아이콘 추가
   → 앱 실행 가능

5. 사용자가 홈 화면의 아이콘 클릭
   → 앱이 standalone 모드로 실행
   → 주소창 없이 전체 화면
```

### 시나리오 3: 설치 조건 미만족

```
1. 사용자가 https://www.cruisedot.co.kr 접속
   → 페이지 로드
   → manifest.json 읽기
   → icons 배열이 비어있음
   → PWA 조건 불만족

2. 사용자가 "크루즈몰 바탕화면에 추가하기" 버튼 클릭
   → beforeinstallprompt 이벤트 발생 안 함
   → deferredPrompt가 null
   → 5초간 이벤트 대기
   → 이벤트 발생 안 함

3. 조용히 실패
   → 콘솔에 경고만 표시
   → 사용자에게 아무 피드백 없음
   → 사용자 혼란
```

---

## 구현 계획

### Phase 1: 기본 manifest.json 수정 (즉시)

**작업:**
1. `public/manifest.json` 파일 수정
2. icons 배열에 mall-icon 추가
3. 필수 필드 모두 채우기

**예상 시간:** 5분

**효과:**
- ✅ PWA 설치 조건 만족
- ✅ `beforeinstallprompt` 이벤트 발생 가능
- ✅ Android Chrome에서 자동 설치 가능

### Phase 2: Service Worker 페이지 로드 시 등록 (즉시)

**작업:**
1. `components/PWASetup.tsx` 컴포넌트 생성
2. `app/layout.tsx`에 추가
3. 페이지 로드 시 Service Worker 등록

**예상 시간:** 10분

**효과:**
- ✅ 페이지 로드 시 Service Worker 등록
- ✅ PWA 설치 조건 만족
- ✅ 브라우저가 설치 가능하다고 판단

### Phase 3: PWA 설치 버튼 개선 (1일)

**작업:**
1. 설치 가능 여부 사전 체크 기능 추가
2. iOS 사용자 안내 모달 추가
3. 사용자 피드백 개선
4. 브라우저별 안내 메시지

**예상 시간:** 2-3시간

**효과:**
- ✅ 모든 브라우저에서 작동
- ✅ 사용자에게 명확한 안내
- ✅ 설치 실패 시 이유 설명

### Phase 4: 페이지별 manifest 분리 (선택사항, 1주일)

**작업:**
1. `/chat` 페이지에서 `manifest-genie.json` 사용
2. `/` 페이지에서 `manifest-mall.json` 사용
3. Next.js layout 구조 수정

**예상 시간:** 4-6시간

**효과:**
- ✅ 두 개의 PWA 모두 지원
- ✅ 각 페이지에서 올바른 manifest 사용

---

## 예상 결과

### 수정 전
- ❌ 스마트폰에서 버튼 클릭 시 아무 반응 없음
- ❌ `beforeinstallprompt` 이벤트 발생 안 함
- ❌ 사용자 혼란

### 수정 후 (Phase 1 + Phase 2)
- ✅ Android Chrome에서 자동 설치 프롬프트 표시
- ✅ 버튼 클릭 시 정상 작동
- ✅ 설치 완료 후 홈 화면에 아이콘 추가

### 수정 후 (Phase 3 완료)
- ✅ 모든 브라우저에서 작동
- ✅ iOS 사용자도 수동 설치 가능
- ✅ 사용자가 상황을 이해하고 대응 가능

---

## 기술적 세부사항

### beforeinstallprompt 이벤트

**발생 조건:**
1. HTTPS 또는 localhost
2. 유효한 manifest.json
3. Service Worker 등록
4. 적절한 아이콘 (192x192, 512x512)
5. 사용자 상호작용 (30초 이상, 2회 이상 방문)

**이벤트 객체:**
```typescript
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}
```

**사용 방법:**
```typescript
// 이벤트 캐치
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

// 설치 프롬프트 표시
await deferredPrompt.prompt();
const { outcome } = await deferredPrompt.userChoice;
```

### Service Worker 등록

**등록 방법:**
```typescript
navigator.serviceWorker.register('/sw.js', {
  scope: '/'
});
```

**등록 타이밍:**
- ✅ 페이지 로드 시 즉시 등록 (권장)
- ❌ 버튼 클릭 시 등록 (너무 늦음)

### Manifest 파일 구조

**필수 필드:**
- `name`: 앱 이름
- `short_name`: 짧은 이름
- `start_url`: 시작 URL
- `display`: "standalone" (앱처럼 표시)
- `icons`: 최소 192x192, 512x512 아이콘

**선택 필드:**
- `description`: 설명
- `theme_color`: 테마 색상
- `background_color`: 배경 색상
- `orientation`: 화면 방향
- `shortcuts`: 바로가기

---

## 결론

**설치 가능하게 만들기:**
1. 기본 manifest.json 완전히 채우기
2. Service Worker를 페이지 로드 시 등록
3. PWA 설치 버튼 개선

**설치 프로세스:**
- Android Chrome: 자동 설치 프롬프트 표시
- iOS Safari: 수동 설치 가이드 제공
- 기타 브라우저: 상황에 맞는 안내

**예상 효과:**
- ✅ 스마트폰에서 정상적으로 설치 가능
- ✅ 사용자 경험 향상
- ✅ 설치율 증가

---

**작성일:** 2025-01-27  
**버전:** 1.0

