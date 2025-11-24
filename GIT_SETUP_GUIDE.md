# 📦 Git 저장소 설정 가이드

**작성일**: 2025-11-23  
**목적**: 새로운 Git 저장소 생성 및 배포 준비

---

## 🎯 단계별 가이드

### 1단계: GitHub 저장소 생성 (무료)

1. **GitHub 접속**: https://github.com
2. **새 저장소 생성**:
   - 우측 상단 "+" 클릭 → "New repository"
   - Repository name: `cruise-guide` (또는 원하는 이름)
   - Description: "크루즈 가이드 관리 시스템"
   - **Public** 또는 **Private** 선택 (Private 권장)
   - **"Initialize this repository with a README" 체크 해제** (이미 코드가 있으므로)
   - "Create repository" 클릭

3. **저장소 URL 복사**:
   - 예: `https://github.com/your-username/cruise-guide.git`

---

### 2단계: 로컬 Git 초기화

**터미널에서 실행**:

```bash
# 프로젝트 폴더로 이동
cd /home/userhyeseon28/projects/cruise-guide

# Git 초기화 (아직 안 했다면)
git init

# .gitignore 확인 (이미 설정되어 있음)
# .env 파일이 포함되어 있는지 확인

# 모든 파일 추가 (제외된 파일은 자동으로 제외됨)
git add .

# 첫 커밋
git commit -m "Initial commit: 배포 준비 완료"

# GitHub 저장소 연결
git remote add origin https://github.com/your-username/cruise-guide.git

# 메인 브랜치 설정
git branch -M main

# 코드 푸시
git push -u origin main
```

---

### 3단계: Vercel과 Git 연동

1. **Vercel 접속**: https://vercel.com
2. **프로젝트 가져오기**:
   - "Add New..." → "Project"
   - "Import Git Repository" 클릭
   - GitHub 저장소 선택
   - "Import" 클릭

3. **프로젝트 설정**:
   - Framework Preset: **Next.js** (자동 감지됨)
   - Root Directory: `./` (기본값)
   - Build Command: `npm run build` (기본값)
   - Output Directory: `.next` (기본값)
   - Install Command: `npm install` (기본값)

4. **환경 변수 설정**:
   - "Environment Variables" 섹션에서 다음 변수들 추가:
     - `DATABASE_URL`
     - `NEXTAUTH_SECRET`
     - `NEXTAUTH_URL`
     - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
     - `GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY`
     - `GOOGLE_DRIVE_SHARED_DRIVE_ID`
     - `CRON_SECRET`
     - `NEXT_PUBLIC_BASE_URL`
     - 기타 필요한 API 키들

5. **배포 실행**:
   - "Deploy" 클릭
   - 배포 완료 대기 (약 2-5분)

---

## 💰 비용 정보

### 무료 플랜으로 충분한 이유

**GitHub**:
- ✅ Private 저장소 무료
- ✅ 무제한 협업자
- ✅ 무제한 저장소

**Vercel**:
- ✅ 무료 플랜: 월 100GB 대역폭
- ✅ 무료 플랜: 무제한 배포
- ✅ Git 연동 무료
- ✅ 자동 HTTPS (SSL 인증서 무료)
- ✅ 자동 배포 (Git push 시)

**추가 비용이 필요한 경우**:
- 월 1억 이상 방문자 (거의 불가능)
- 엔터프라이즈 기능 필요 시
- 전용 서버 필요 시

**결론**: 초기 배포 및 운영에는 **무료 플랜으로 충분**합니다! 🎉

---

## 🔒 보안 체크리스트

배포 전 확인:

- [ ] `.env` 파일이 `.gitignore`에 포함되어 있음
- [ ] `.env` 파일이 Git에 커밋되지 않았는지 확인
- [ ] GitHub 저장소가 Private로 설정되어 있음 (권장)
- [ ] Vercel에 환경 변수가 올바르게 설정됨

**확인 방법**:
```bash
# .env가 Git에 포함되어 있는지 확인
git ls-files | grep .env

# 결과가 나오면 안 됨 (비어있어야 함)
```

---

## 📝 다음 단계

Git 저장소 설정 완료 후:

1. ✅ 코드 푸시 완료
2. ✅ Vercel과 Git 연동 완료
3. ✅ 환경 변수 설정 완료
4. ✅ 첫 배포 완료
5. ✅ Health check 확인: `https://your-domain.com/api/health`
6. ✅ 시스템 상태 확인: `/admin/system/status`

---

## 🆘 문제 해결

### 문제 1: Git push 실패

**해결 방법**:
```bash
# GitHub 인증 확인
git remote -v

# 인증 정보 재설정
git remote set-url origin https://github.com/your-username/cruise-guide.git
```

### 문제 2: Vercel 배포 실패

**해결 방법**:
1. Vercel 대시보드 → Deployments → 실패한 배포 → Logs 확인
2. 환경 변수 누락 확인
3. 빌드 로그에서 에러 메시지 확인

### 문제 3: .env 파일이 실수로 커밋됨

**해결 방법**:
```bash
# Git 히스토리에서 .env 제거
git rm --cached .env
git commit -m "Remove .env from Git"

# GitHub에서도 제거 (중요!)
git push

# GitHub 저장소에서 .env 파일 삭제 확인
# 필요시 GitHub 지원팀에 문의하여 완전히 제거
```

---

**새로운 Git 저장소로 깨끗하게 시작하세요!** 🚀










