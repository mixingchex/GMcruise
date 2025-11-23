# 📲 PWA 바탕화면 추가 기능 가이드

## 개요

크루즈몰과 크루즈가이드 지니를 스마트폰 바탕화면에 추가하여 빠르게 접근할 수 있는 기능입니다.

## 기능

### 1. 크루즈몰 바탕화면 추가
- **위치**: 파트너 내 정보 페이지 (`/partner/[partnerId]/profile`)
- **아이콘**: 흰색 배경
- **기능**: 
  - 바탕화면에 추가 시 자동으로 로그인 상태 유지
  - 메인 페이지(`/`)로 바로 이동

### 2. 크루즈가이드 지니 바탕화면 추가
- **위치**: 일반 사용자 내 정보 페이지 (`/profile`)
- **아이콘**: 핑크색 배경 (#FFB6C1)
- **기능**:
  - 바탕화면에 추가 시 바로 채팅 화면(`/chat`)으로 이동
  - 로그인 상태 유지

## 아이콘 생성 방법

### 방법 1: ImageMagick 사용 (권장)

```bash
# 크루즈몰 아이콘 (흰색 배경)
convert public/images/ai-cruise-logo.png -resize 192x192 -background white -gravity center -extent 192x192 public/icons/mall-icon-192.png
convert public/images/ai-cruise-logo.png -resize 512x512 -background white -gravity center -extent 512x512 public/icons/mall-icon-512.png

# 크루즈가이드 지니 아이콘 (핑크색 배경)
convert public/images/ai-cruise-logo.png -resize 192x192 -background "#FFB6C1" -gravity center -extent 192x192 public/icons/genie-icon-192.png
convert public/images/ai-cruise-logo.png -resize 512x512 -background "#FFB6C1" -gravity center -extent 512x512 public/icons/genie-icon-512.png
```

### 방법 2: 온라인 도구 사용

1. [RealFaviconGenerator](https://realfavicongenerator.net/)
2. [PWA Builder Image Generator](https://www.pwabuilder.com/imageGenerator)

### 방법 3: 스크립트 실행

```bash
node scripts/generate-pwa-icons.js
```

## 필요한 아이콘 파일

다음 파일들이 `public/icons/` 디렉토리에 있어야 합니다:

- `mall-icon-192.png` - 크루즈몰, 192x192, 흰색 배경
- `mall-icon-512.png` - 크루즈몰, 512x512, 흰색 배경
- `genie-icon-192.png` - 크루즈가이드 지니, 192x192, 핑크색 배경 (#FFB6C1)
- `genie-icon-512.png` - 크루즈가이드 지니, 512x512, 핑크색 배경 (#FFB6C1)

**참고**: 아이콘 파일이 없어도 기본 로고(`/images/ai-cruise-logo.png`)가 fallback으로 사용됩니다.

## 사용 방법

### 크루즈몰 사용자 (파트너)

1. 파트너로 로그인
2. 내 정보 페이지 (`/partner/[partnerId]/profile`)로 이동
3. "바탕화면에 추가하기" 섹션에서 버튼 클릭
4. 브라우저 설치 프롬프트에서 "설치" 선택
5. 바탕화면에 크루즈몰 아이콘 추가됨
6. 아이콘 클릭 시 자동 로그인 상태로 메인 페이지 열림

### 크루즈가이드 지니 사용자

1. 일반 사용자로 로그인
2. 내 정보 페이지 (`/profile`)로 이동
3. "바탕화면에 추가하기" 섹션에서 버튼 클릭
4. 브라우저 설치 프롬프트에서 "설치" 선택
5. 바탕화면에 크루즈가이드 지니 아이콘 추가됨
6. 아이콘 클릭 시 바로 채팅 화면(`/chat`)으로 이동

### iOS 사용자

iOS Safari에서는 자동 설치가 지원되지 않으므로 수동으로 추가해야 합니다:

1. Safari에서 해당 페이지 열기
2. 하단 공유 버튼(□↑) 클릭
3. "홈 화면에 추가" 선택
4. 아이콘 이름 확인 후 "추가" 클릭

## 기술 세부사항

### Manifest 파일

- **크루즈몰**: `/manifest-mall.json`
  - `start_url`: `/?utm_source=pwa&utm_medium=home_screen`
  - `background_color`: `#FFFFFF` (흰색)
  - `theme_color`: `#FFFFFF` (흰색)

- **크루즈가이드 지니**: `/manifest-genie.json`
  - `start_url`: `/chat?utm_source=pwa&utm_medium=home_screen`
  - `background_color`: `#FFB6C1` (핑크색)
  - `theme_color`: `#FFB6C1` (핑크색)

### 자동 로그인

PWA로 설치된 앱은 쿠키 기반 세션을 유지하므로, 로그인 상태가 자동으로 유지됩니다.

### 컴포넌트

- `PWAInstallButtonMall`: 크루즈몰용 설치 버튼
- `PWAInstallButtonGenie`: 크루즈가이드 지니용 설치 버튼

## 문제 해결

### 아이콘이 표시되지 않는 경우

1. 아이콘 파일이 `public/icons/` 디렉토리에 있는지 확인
2. 파일 이름이 정확한지 확인 (대소문자 구분)
3. 브라우저 캐시 삭제 후 재시도

### 설치 버튼이 표시되지 않는 경우

1. HTTPS 연결인지 확인 (PWA는 HTTPS 필수)
2. 브라우저가 PWA를 지원하는지 확인
3. 이미 설치되어 있는지 확인 (설치된 경우 버튼 숨김)

### 자동 로그인이 안 되는 경우

1. 쿠키가 차단되지 않았는지 확인
2. 세션 쿠키(`cg.sid.v2`)가 유효한지 확인
3. 브라우저 설정에서 쿠키 허용 확인

## 참고 자료

- [PWA 설치 가이드](https://web.dev/install-criteria/)
- [Manifest 파일 스펙](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [iOS Safari PWA 가이드](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)







