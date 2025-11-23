# 🎯 Git 설정 완전 초보자 가이드

**작성일**: 2025-11-23  
**대상**: 코딩 초보자, Cursor 초보자

---

## 📋 현재 상황

터미널에서 다음 에러가 발생했습니다:
1. ❌ Git 사용자 정보가 설정되지 않음
2. ❌ 커밋이 실패함
3. ❌ GitHub 저장소 URL이 placeholder로 되어 있음

**해결 방법을 단계별로 알려드리겠습니다!**

---

## 🔧 1단계: Git 사용자 정보 설정 (완료됨)

이미 설정했습니다! 다음 명령어로 확인할 수 있습니다:

```bash
git config --global user.name
git config --global user.email
```

**나중에 본인 정보로 변경하려면**:
```bash
git config --global user.name "본인 이름"
git config --global user.email "본인@이메일.com"
```

---

## 📦 2단계: 파일 추가 및 커밋

다음 명령어들을 **순서대로** 실행하세요:

```bash
# 1. 프로젝트 폴더로 이동 (이미 있으면 생략)
cd /home/userhyeseon28/projects/cruise-guide

# 2. Git 초기화 (이미 했으면 생략)
git init

# 3. 모든 파일 추가
git add .

# 4. 첫 커밋 생성
git commit -m "Initial commit: 배포 준비 완료"
```

**성공하면** 다음과 같은 메시지가 나옵니다:
```
[master (or main) xxxxxxx] Initial commit: 배포 준비 완료
 X files changed, X insertions(+)
```

---

## 🌐 3단계: GitHub 저장소 생성

### 3-1. GitHub 접속

1. 브라우저에서 https://github.com 접속
2. 로그인 (계정이 없으면 회원가입)

### 3-2. 새 저장소 만들기

1. 우측 상단 **"+"** 버튼 클릭
2. **"New repository"** 클릭
3. 다음 정보 입력:
   - **Repository name**: `cruise-guide` (또는 원하는 이름)
   - **Description**: "크루즈 가이드 관리 시스템" (선택사항)
   - **Public** 또는 **Private** 선택 (Private 권장)
   - ⚠️ **"Initialize this repository with a README" 체크 해제** (중요!)
   - ⚠️ **"Add .gitignore" 선택 안 함** (이미 있으므로)
   - ⚠️ **"Choose a license" 선택 안 함**

4. **"Create repository"** 버튼 클릭

### 3-3. 저장소 URL 복사

저장소가 생성되면 다음 페이지가 나타납니다.

**중요**: 페이지에 나오는 URL을 복사하세요!

예시:
- `https://github.com/your-username/cruise-guide.git`
- 또는 `git@github.com:your-username/cruise-guide.git`

**이 URL을 메모장에 복사해두세요!**

---

## 🔗 4단계: 로컬 저장소와 GitHub 연결

터미널에서 다음 명령어를 실행하세요:

```bash
# 1. 프로젝트 폴더로 이동
cd /home/userhyeseon28/projects/cruise-guide

# 2. GitHub 저장소 연결
# ⚠️ 아래 URL을 3단계에서 복사한 본인의 URL로 변경하세요!
git remote add origin https://github.com/your-username/cruise-guide.git

# 3. 브랜치 이름을 main으로 변경
git branch -M main

# 4. 코드를 GitHub에 푸시
git push -u origin main
```

**중요**: 
- `your-username`을 본인의 GitHub 사용자명으로 변경하세요!
- 예: `https://github.com/hyeseon28/cruise-guide.git`

---

## 🔐 5단계: GitHub 인증 (필요한 경우)

`git push` 실행 시 인증을 요구할 수 있습니다.

### 방법 1: Personal Access Token (권장)

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. "Generate new token (classic)" 클릭
3. Note: "Cruise Guide Deployment" 입력
4. Expiration: 원하는 기간 선택
5. Scopes: `repo` 체크
6. "Generate token" 클릭
7. **토큰을 복사** (한 번만 보여줌!)
8. 터미널에서 비밀번호 입력 시 이 토큰을 입력

### 방법 2: GitHub CLI 사용

```bash
# GitHub CLI 설치 (없는 경우)
# Ubuntu/WSL:
sudo apt install gh

# 로그인
gh auth login

# 이후 git push는 자동으로 인증됨
```

---

## ✅ 6단계: 푸시 성공 확인

성공하면 다음과 같은 메시지가 나옵니다:

```
Enumerating objects: X, done.
Counting objects: 100% (X/X), done.
Writing objects: 100% (X/X), done.
To https://github.com/your-username/cruise-guide.git
 * [new branch]      main -> main
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

**GitHub 웹사이트에서 확인**:
- 저장소 페이지로 가서 파일들이 올라갔는지 확인
- `.env` 파일이 **없어야** 정상 (보안상 중요!)

---

## 🚀 7단계: Vercel과 연동

### 7-1. Vercel 접속

1. 브라우저에서 https://vercel.com 접속
2. 로그인 (GitHub 계정으로 로그인 권장)

### 7-2. 프로젝트 가져오기

1. 대시보드에서 **"Add New..."** 클릭
2. **"Project"** 클릭
3. **"Import Git Repository"** 클릭
4. GitHub 저장소 목록에서 `cruise-guide` 선택
5. **"Import"** 클릭

### 7-3. 프로젝트 설정

다음 설정이 자동으로 감지됩니다:
- **Framework Preset**: Next.js ✅
- **Root Directory**: `./` ✅
- **Build Command**: `npm run build` ✅
- **Output Directory**: `.next` ✅

**변경할 필요 없습니다!** 그대로 두고 다음으로 진행하세요.

### 7-4. 환경 변수 설정

**"Environment Variables"** 섹션에서 다음 변수들을 추가하세요:

1. **DATABASE_URL**
   - Value: 프로덕션 데이터베이스 연결 문자열

2. **NEXTAUTH_SECRET**
   - Value: 랜덤 문자열 (예: `openssl rand -base64 32`로 생성)

3. **NEXTAUTH_URL**
   - Value: 프로덕션 도메인 (예: `https://cruise-guide.vercel.app`)

4. **GOOGLE_SERVICE_ACCOUNT_EMAIL**
   - Value: `cruisedot@cruisedot-478810.iam.gserviceaccount.com`

5. **GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY**
   - Value: 서비스 계정 개인키 (전체, 줄바꿈 포함)

6. **GOOGLE_DRIVE_SHARED_DRIVE_ID**
   - Value: `0AJVz1C-KYWR0Uk9PVA`

7. **CRON_SECRET**
   - Value: 랜덤 문자열 (예: `openssl rand -base64 32`로 생성)

8. **NEXT_PUBLIC_BASE_URL**
   - Value: 프로덕션 도메인

9. **기타 API 키들**
   - OpenAI, Google 등 필요한 API 키들

**각 변수 추가 후 "Save" 클릭!**

### 7-5. 배포 실행

1. 모든 환경 변수 설정 완료 후
2. **"Deploy"** 버튼 클릭
3. 배포 완료 대기 (약 2-5분)

---

## 🎉 8단계: 배포 확인

배포가 완료되면:

1. **Vercel 대시보드**에서 배포 상태 확인
2. **배포된 URL** 클릭하여 사이트 접속
3. **Health Check** 확인: `https://your-domain.com/api/health`
4. **로그인 테스트**

---

## 🆘 문제 해결

### 문제 1: "git push" 시 인증 실패

**해결 방법**:
- Personal Access Token 사용 (5단계 참고)
- 또는 GitHub CLI 사용

### 문제 2: "remote origin already exists"

**해결 방법**:
```bash
# 기존 연결 제거
git remote remove origin

# 새로 연결
git remote add origin https://github.com/your-username/cruise-guide.git
```

### 문제 3: ".env 파일이 GitHub에 올라갔어요!"

**해결 방법** (중요!):
```bash
# Git에서 .env 제거
git rm --cached .env

# 커밋
git commit -m "Remove .env from Git"

# 푸시
git push

# GitHub에서 .env 파일 삭제 확인
# 필요시 GitHub 지원팀에 문의하여 완전히 제거
```

---

## 📝 체크리스트

배포 전 확인:

- [ ] Git 사용자 정보 설정 완료
- [ ] 파일 커밋 완료
- [ ] GitHub 저장소 생성 완료
- [ ] 로컬과 GitHub 연결 완료
- [ ] 코드 푸시 성공
- [ ] Vercel과 Git 연동 완료
- [ ] 환경 변수 모두 설정 완료
- [ ] 배포 성공 확인

---

**이제 단계별로 진행하세요!** 🚀

**궁금한 점이 있으면 언제든 물어보세요!** 💪

