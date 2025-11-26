# Vercel Git 설정 찾기 가이드

> **작성일**: 2025년 1월 28일  
> **목적**: Vercel에서 Git 저장소 연결 설정 찾기

---

## 📍 Vercel에서 Git 설정 찾기

### 현재 위치
- **GitHub**: `github.com/settings/profile` (프로필 설정)
- **필요한 위치**: **Vercel** > Settings > Git

---

## 🔄 Vercel로 이동

### 1단계: Vercel 대시보드 접속

1. **새 탭 열기** 또는 **브라우저 주소창에 입력**
   ```
   https://vercel.com/dashboard
   ```

2. **로그인** (필요한 경우)

3. **프로젝트 선택**
   - `cruise-guide` 프로젝트 클릭

---

### 2단계: Settings 이동

1. **상단 메뉴에서 "Settings" 클릭**
   - 또는 왼쪽 사이드바에서 "Settings" 클릭

2. **Settings 페이지 확인**
   - 여러 설정 옵션이 표시됨

---

### 3단계: Git 설정 찾기

**Settings 페이지에서:**

1. **왼쪽 사이드바 확인**
   - Settings 페이지 왼쪽에 메뉴가 있음
   - "Git" 항목 찾기

2. **또는 메인 콘텐츠 영역에서**
   - "Git" 섹션 찾기
   - "Repository" 또는 "Git Repository" 섹션 찾기

3. **"Git" 클릭**
   - 왼쪽 사이드바 또는 메인 콘텐츠에서 "Git" 클릭

---

## 📋 Settings 페이지 구조

### 일반적인 Settings 메뉴 구조

왼쪽 사이드바에 다음과 같은 항목들이 있을 수 있습니다:

- **General** (일반적인)
- **Build & Deploy Settings** (빌드 및 배포 설정)
- **Domains** (도메인)
- **Environment Variables** (환경 변수)
- **Git** ← **여기!**
- **Integrations** (통합)
- **Deployment Protection** (배포 보호)
- **Functions** (함수)
- **Cache** (캐시)
- **Cron Jobs** (크론 작업)
- **Project Members** (프로젝트 멤버)
- **Webhooks** (웹훅)
- **Security** (보안)
- **Connectivity** (연결성)
- **Advanced** (고급의)

---

## 🎯 빠른 경로

### 방법 1: 직접 URL 접속

1. **브라우저 주소창에 입력**
   ```
   https://vercel.com/[프로젝트명]/settings/git
   ```
   또는
   ```
   https://vercel.com/dashboard/[프로젝트명]/settings/git
   ```

2. **프로젝트 이름 확인**
   - 프로젝트 이름이 `cruise-guide`인 경우:
   ```
   https://vercel.com/cruise-guide/settings/git
   ```

---

### 방법 2: Settings 페이지에서 찾기

1. **Vercel 대시보드 접속**
   - https://vercel.com/dashboard

2. **프로젝트 선택**
   - `cruise-guide` 프로젝트 클릭

3. **Settings 클릭**
   - 상단 메뉴 또는 왼쪽 사이드바

4. **Git 클릭**
   - 왼쪽 사이드바에서 "Git" 찾아서 클릭

---

## 📝 Git 설정 페이지에서 확인할 것

### 연결된 저장소 확인

1. **"Connected Git Repository" 섹션 확인**
   - GitHub 저장소가 연결되어 있는지 확인
   - 저장소 이름 확인
   - 예: `monicajeon28/GMcruise` 또는 `monicajeon28/cruise-guide`

2. **저장소가 없는 경우**
   - "Connect Git Repository" 버튼 클릭
   - GitHub 저장소 선택

3. **저장소가 잘못된 경우**
   - "Disconnect" 버튼 클릭
   - "Connect Git Repository" 버튼 클릭
   - 올바른 저장소 선택

---

## 🔍 찾기 어려운 경우

### Settings 페이지에서 검색

1. **Settings 페이지에서**
   - `Ctrl + F` (또는 `Cmd + F` on Mac) 눌러서 검색
   - "Git" 또는 "Repository" 검색

2. **페이지 스크롤**
   - Settings 페이지를 위아래로 스크롤
   - "Git" 또는 "Repository" 섹션 찾기

---

## 📋 체크리스트

### Vercel로 이동
- [ ] Vercel 대시보드 접속 (https://vercel.com/dashboard)
- [ ] 프로젝트 선택 (cruise-guide)
- [ ] Settings 클릭

### Git 설정 찾기
- [ ] 왼쪽 사이드바에서 "Git" 찾기
- [ ] 또는 메인 콘텐츠에서 "Git" 섹션 찾기
- [ ] "Git" 클릭

### 저장소 확인
- [ ] 연결된 저장소 확인
- [ ] 저장소 이름 확인
- [ ] 필요 시 재연결

---

## 💡 팁

### 빠른 접근

1. **Vercel 대시보드 URL 직접 입력**
   ```
   https://vercel.com/dashboard
   ```

2. **프로젝트 선택 후 Settings 바로 이동**
   - 프로젝트 페이지에서 "Settings" 탭 클릭

3. **Git 설정 바로 이동**
   - Settings 페이지에서 "Git" 클릭

---

## 🚨 중요 사항

### 지금은 재배포가 우선

- ✅ **Git 설정 확인은 나중에 해도 됩니다**
- ✅ **재배포는 에러가 있어도 진행 가능합니다**
- ✅ **환경 변수는 이미 저장되어 있습니다**

### 권장 순서

1. **지금**: 재배포 진행 ("Redeploy" 버튼 클릭)
2. **배포 완료 후**: 웹사이트 테스트
3. **나중에**: Git 설정 확인 (필요 시)

---

**작성자**: AI Assistant  
**상태**: Vercel Git 설정 찾기 가이드 작성 완료



