# 크루즈가이드 - 배포 및 QA 가이드

> **목적**: 안전한 배포를 위한 개발/운영 서버 분리 및 QA 프로세스

---

## 📋 목차

1. [환경 분리 전략](#환경-분리-전략)
2. [Vercel 배포 설정](#vercel-배포-설정)
3. [QA 체크리스트](#qa-체크리스트)
4. [배포 워크플로우](#배포-워크플로우)
5. [자동화된 테스트](#자동화된-테스트)

---

## 🌍 환경 분리 전략

### 환경 구분

| 환경 | 용도 | URL 예시 | 브랜치 |
|------|------|----------|--------|
| **Development** | 로컬 개발 | localhost:3030 | - |
| **Staging (개발서버)** | 테스트/QA | cruise-guide-dev.vercel.app | `dev` |
| **Production (본서버)** | 실제 서비스 | cruise-guide.vercel.app | `main` |

### 데이터베이스 분리

```
개발 DB: SQLite (로컬) → PostgreSQL (Vercel Postgres - Dev)
운영 DB: PostgreSQL (Vercel Postgres - Production)
```

---

## 🚀 Vercel 배포 설정

### Step 1: Git 브랜치 전략

```bash
# 현재 브랜치 확인
git branch

# 개발 브랜치 생성 (없으면)
git checkout -b dev

# main 브랜치로 이동
git checkout main
```

**브랜치 전략:**
- `main` → 운영 서버 (안정적인 코드만)
- `dev` → 개발 서버 (새 기능 테스트)
- `feature/*` → 기능 개발 (dev로 merge)

### Step 2: Vercel 프로젝트 생성

#### 방법 1: Vercel CLI 사용 (추천)

```bash
# Vercel CLI 설치
npm install -g vercel

# Vercel 로그인
vercel login

# 프로젝트 연결 (처음 한 번만)
vercel

# 개발 서버 배포 (dev 브랜치)
git checkout dev
vercel --prod  # dev 환경의 "프로덕션"

# 본 서버 배포 (main 브랜치)
git checkout main
vercel --prod
```

#### 방법 2: Vercel Dashboard 사용

1. https://vercel.com 접속
2. "New Project" 클릭
3. GitHub 저장소 연결
4. **중요**: Settings에서 환경별 설정

**Vercel 설정:**
```
Project Name: cruise-guide

Production Branch: main
Preview Branches: dev, feature/*

Framework Preset: Next.js
Build Command: npm run build
Output Directory: .next
Install Command: npm install
```

### Step 3: 환경 변수 설정

Vercel Dashboard → Settings → Environment Variables

#### 개발 서버용 (Preview/Development)

```env
# Database
DATABASE_URL=postgresql://dev_user:password@dev-db.vercel.com/cruise_dev

# API Keys (테스트용)
GEMINI_API_KEY=AIzaSy...  (테스트 프로젝트)
KAKAO_REST_API_KEY=test_key_...

# Admin
ADMIN_QUICK_PASSWORD=0313

# Base URL
NEXT_PUBLIC_BASE_URL=https://cruise-guide-dev.vercel.app

# 환경 구분
NODE_ENV=development
VERCEL_ENV=preview
```

#### 운영 서버용 (Production)

```env
# Database
DATABASE_URL=postgresql://prod_user:password@prod-db.vercel.com/cruise_prod

# API Keys (실제 운영용)
GEMINI_API_KEY=AIzaSy...  (운영 프로젝트)
KAKAO_REST_API_KEY=real_key_...

# Admin
ADMIN_QUICK_PASSWORD=실제_강력한_비밀번호

# Base URL
NEXT_PUBLIC_BASE_URL=https://cruise-guide.com

# 환경 구분
NODE_ENV=production
VERCEL_ENV=production
```

**Vercel 환경 변수 설정 방법:**
1. Dashboard → Project → Settings → Environment Variables
2. 각 변수마다 "Environment" 선택:
   - ✅ Production (운영)
   - ✅ Preview (개발)
   - ❌ Development (로컬은 .env 사용)

---

## ✅ QA 체크리스트

### 자동화된 QA 체크리스트

각 배포 전에 이 체크리스트를 실행합니다.

#### 1. 빌드 테스트
```bash
npm run build
# ✅ 빌드 성공해야 함
# ❌ TypeScript 에러 있으면 안 됨
```

#### 2. 타입 체크
```bash
npx tsc --noEmit
# ✅ 타입 에러 0개
```

#### 3. 환경 변수 확인
```bash
node scripts/check-env.js
# 필수 환경 변수 모두 설정되었는지 확인
```

#### 4. 데이터베이스 마이그레이션
```bash
npx prisma migrate status
# ✅ 모든 마이그레이션 적용됨
```

---

### 수동 QA 체크리스트

개발 서버 배포 후 수동으로 확인:

#### 🔐 인증 시스템
- [ ] 로그인 (일반 사용자)
- [ ] 로그인 (관리자)
- [ ] 로그아웃
- [ ] 회원가입
- [ ] 비밀번호 찾기 (있으면)

#### 🤖 크루즈가이드 지니 (AI 챗봇)
- [ ] 챗봇 대화 가능
- [ ] 음성 인식 작동
- [ ] 사진 번역 작동
- [ ] 네비게이션 기능
- [ ] 채팅 히스토리 저장
- [ ] 새로고침 후 히스토리 복원

#### 🏪 크루즈몰
- [ ] 상품 목록 표시
- [ ] 상품 상세 페이지
- [ ] 상품 검색
- [ ] 장바구니 (있으면)
- [ ] 결제 (테스트 모드)

#### 👔 어필리에이트
- [ ] 계약 신청
- [ ] 계약 승인 (관리자)
- [ ] 판매 등록
- [ ] 커미션 계산
- [ ] 정산 내역

#### ⚙️ 관리자 패널
- [ ] 대시보드 로드
- [ ] 고객 관리
- [ ] 상품 관리
- [ ] 메시지 발송
- [ ] 통계 조회
- [ ] 설정 변경

#### 📱 모바일 반응형
- [ ] iPhone (Safari)
- [ ] Android (Chrome)
- [ ] iPad
- [ ] 가로/세로 모드

#### 🔔 푸시 알림
- [ ] 푸시 알림 구독
- [ ] 알림 수신
- [ ] 알림 클릭 시 이동

#### 🎨 UI/UX
- [ ] 로딩 스피너 표시
- [ ] 에러 메시지 표시
- [ ] 빈 상태 (데이터 없을 때)
- [ ] 이미지 로딩
- [ ] 폰트 로딩

#### ⚡ 성능
- [ ] 페이지 로드 시간 < 3초
- [ ] 이미지 최적화
- [ ] API 응답 시간 < 1초

---

## 📝 배포 워크플로우

### 새로운 기능 개발 시

```bash
# 1. 기능 브랜치 생성
git checkout dev
git pull origin dev
git checkout -b feature/새기능명

# 2. 개발 작업
# ... 코드 작성 ...

# 3. 로컬 테스트
npm run dev
# 수동 테스트 진행

# 4. 커밋
git add .
git commit -m "feat: 새로운 기능 추가"

# 5. dev 브랜치에 merge
git checkout dev
git merge feature/새기능명

# 6. 개발 서버에 배포
git push origin dev

# Vercel이 자동으로 dev 브랜치 배포
# → https://cruise-guide-dev.vercel.app 에 반영됨

# 7. 개발 서버에서 QA 진행
# (아래 QA 체크리스트 확인)

# 8. QA 통과하면 main에 merge
git checkout main
git merge dev
git push origin main

# Vercel이 자동으로 main 브랜치 배포
# → https://cruise-guide.com 에 반영됨
```

### 긴급 버그 수정 시 (Hotfix)

```bash
# 1. main에서 hotfix 브랜치 생성
git checkout main
git checkout -b hotfix/버그명

# 2. 버그 수정
# ... 코드 수정 ...

# 3. 커밋
git add .
git commit -m "fix: 긴급 버그 수정"

# 4. main과 dev 양쪽에 merge
git checkout main
git merge hotfix/버그명
git push origin main

git checkout dev
git merge hotfix/버그명
git push origin dev

# 5. hotfix 브랜치 삭제
git branch -d hotfix/버그명
```

---

## 🤖 자동화된 테스트 스크립트

### 1. 환경 변수 체크 스크립트

파일: `/scripts/check-env.js`

```javascript
// scripts/check-env.js
const requiredEnvVars = [
  'DATABASE_URL',
  'GEMINI_API_KEY',
  'SESSION_SECRET',
  'ADMIN_QUICK_PASSWORD',
  'NEXT_PUBLIC_BASE_URL',
];

const optionalEnvVars = [
  'KAKAO_REST_API_KEY',
  'KAKAO_ADMIN_KEY',
  'EMAIL_SMTP_PASSWORD',
];

let hasErrors = false;

console.log('🔍 환경 변수 확인 중...\n');

// 필수 환경 변수 확인
requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    console.error(`❌ 필수 환경 변수 누락: ${varName}`);
    hasErrors = true;
  } else {
    console.log(`✅ ${varName}: 설정됨`);
  }
});

// 선택적 환경 변수 확인
console.log('\n선택적 환경 변수:');
optionalEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    console.warn(`⚠️  ${varName}: 미설정 (기능 제한될 수 있음)`);
  } else {
    console.log(`✅ ${varName}: 설정됨`);
  }
});

if (hasErrors) {
  console.error('\n❌ 필수 환경 변수가 누락되었습니다!');
  process.exit(1);
} else {
  console.log('\n✅ 모든 필수 환경 변수가 설정되었습니다!');
  process.exit(0);
}
```

### 2. 배포 전 체크 스크립트

파일: `/scripts/pre-deploy-check.sh`

```bash
#!/bin/bash
# scripts/pre-deploy-check.sh

echo "🚀 배포 전 체크 시작..."

# 1. 환경 변수 확인
echo "\n1️⃣ 환경 변수 확인..."
node scripts/check-env.js
if [ $? -ne 0 ]; then
  echo "❌ 환경 변수 체크 실패"
  exit 1
fi

# 2. TypeScript 타입 체크
echo "\n2️⃣ TypeScript 타입 체크..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
  echo "❌ 타입 에러 발견"
  exit 1
fi

# 3. 빌드 테스트
echo "\n3️⃣ 프로덕션 빌드 테스트..."
npm run build
if [ $? -ne 0 ]; then
  echo "❌ 빌드 실패"
  exit 1
fi

# 4. Prisma 마이그레이션 상태 확인
echo "\n4️⃣ 데이터베이스 마이그레이션 확인..."
npx prisma migrate status
if [ $? -ne 0 ]; then
  echo "⚠️  마이그레이션 상태 확인 필요"
fi

echo "\n✅ 모든 자동 체크 통과!"
echo "\n📋 수동 QA 체크리스트를 확인하세요:"
echo "   - 배포_및_QA_가이드.md 참고"
```

실행 권한 부여:
```bash
chmod +x scripts/pre-deploy-check.sh
```

### 3. QA 체크리스트 자동화 스크립트

파일: `/scripts/qa-checklist.js`

```javascript
// scripts/qa-checklist.js
const prompts = require('prompts');

const qaChecklist = [
  {
    category: '🔐 인증',
    items: [
      '일반 사용자 로그인',
      '관리자 로그인',
      '로그아웃',
      '회원가입',
    ],
  },
  {
    category: '🤖 AI 챗봇',
    items: [
      '챗봇 대화',
      '음성 인식',
      '사진 번역',
      '네비게이션',
      '채팅 히스토리',
    ],
  },
  {
    category: '🏪 크루즈몰',
    items: [
      '상품 목록',
      '상품 상세',
      '상품 검색',
      '결제 (테스트)',
    ],
  },
  {
    category: '👔 어필리에이트',
    items: [
      '계약 신청',
      '계약 승인',
      '판매 등록',
      '커미션 계산',
    ],
  },
  {
    category: '⚙️ 관리자',
    items: [
      '대시보드',
      '고객 관리',
      '상품 관리',
      '메시지 발송',
    ],
  },
];

async function runQA() {
  console.log('📋 QA 체크리스트\n');
  console.log(`배포 환경: ${process.env.VERCEL_ENV || 'local'}`);
  console.log(`URL: ${process.env.NEXT_PUBLIC_BASE_URL || 'localhost:3030'}\n`);

  let allPassed = true;

  for (const section of qaChecklist) {
    console.log(`\n${section.category}`);
    console.log('='.repeat(40));

    for (const item of section.items) {
      const response = await prompts({
        type: 'confirm',
        name: 'passed',
        message: `${item} - 정상 작동?`,
        initial: true,
      });

      if (response.passed === undefined) {
        console.log('\n⚠️  QA 중단됨');
        process.exit(1);
      }

      if (!response.passed) {
        allPassed = false;
        console.log(`   ❌ 실패: ${item}`);
      } else {
        console.log(`   ✅ 통과`);
      }
    }
  }

  console.log('\n' + '='.repeat(40));
  if (allPassed) {
    console.log('✅ 모든 QA 항목 통과!');
    console.log('🚀 운영 서버 배포 가능');
    process.exit(0);
  } else {
    console.log('❌ 일부 QA 항목 실패');
    console.log('🔧 문제 해결 후 다시 테스트하세요');
    process.exit(1);
  }
}

runQA().catch(console.error);
```

설치:
```bash
npm install prompts --save-dev
```

사용:
```bash
node scripts/qa-checklist.js
```

---

## 🔄 Claude(커서)에게 QA 시키는 방법

### 1. QA 프롬프트 템플릿

파일: `/.claude/qa-prompt.md`

```markdown
# QA 테스트 요청

다음 환경에서 QA 테스트를 수행해주세요:

**환경**: [개발서버 / 운영서버]
**URL**: https://cruise-guide-dev.vercel.app
**날짜**: 2025-11-18

## QA 체크리스트

아래 항목들을 순서대로 테스트하고, 각 항목의 결과를 보고해주세요:

### 1. 인증 시스템
- [ ] 일반 사용자 로그인 테스트
- [ ] 관리자 로그인 테스트
- [ ] 로그아웃 테스트

### 2. AI 챗봇
- [ ] 챗봇 대화 기능
- [ ] 음성 인식
- [ ] 사진 번역

### 3. 크루즈몰
- [ ] 상품 목록 로드
- [ ] 상품 상세 페이지

### 4. 어필리에이트
- [ ] 계약 신청 플로우

### 5. 관리자 패널
- [ ] 대시보드 접근
- [ ] 고객 관리

## 테스트 방법
1. 브라우저 개발자 도구 열기
2. 각 기능 실행
3. 콘솔 에러 확인
4. 네트워크 요청 확인
5. UI 정상 작동 확인

## 보고 형식
- ✅ 통과
- ❌ 실패 (에러 메시지 포함)
- ⚠️  경고 (작동하지만 개선 필요)
```

### 2. Claude에게 QA 요청하기

**터미널에서 Claude 호출:**
```
claude qa 진행해줘. 개발서버 https://cruise-guide-dev.vercel.app 에서 배포_및_QA_가이드.md의 체크리스트대로 테스트해줘.
```

**또는 파일로 요청:**
```
@qa-prompt.md 이 템플릿대로 QA 진행해줘
```

---

## 📦 Package.json 스크립트 추가

`package.json`에 추가:

```json
{
  "scripts": {
    "dev": "scripts/dev-freeport.sh",
    "build": "npm run images:build && npm run pwa:icons && next build",
    "start": "next start",

    "qa:check": "node scripts/qa-checklist.js",
    "deploy:check": "sh scripts/pre-deploy-check.sh",
    "env:check": "node scripts/check-env.js",

    "deploy:dev": "vercel --prod",
    "deploy:prod": "vercel --prod",

    "test:type": "tsc --noEmit",
    "test:build": "npm run build"
  }
}
```

사용:
```bash
# 배포 전 체크
npm run deploy:check

# QA 체크리스트 실행
npm run qa:check

# 환경 변수 확인
npm run env:check
```

---

## 🎯 실전 배포 플로우

### 개발 → 운영 배포 전체 과정

```bash
# 1. 새 기능 개발 (feature 브랜치)
git checkout -b feature/결제시스템
# ... 개발 작업 ...
git commit -m "feat: 결제 시스템 추가"

# 2. dev 브랜치에 merge
git checkout dev
git merge feature/결제시스템
git push origin dev

# 3. 개발 서버 자동 배포 (Vercel)
# → https://cruise-guide-dev.vercel.app 에 반영됨

# 4. 배포 전 자동 체크
npm run deploy:check

# 5. 수동 QA 진행
npm run qa:check
# 또는 Claude에게 요청:
# "개발서버에서 QA 진행해줘"

# 6. QA 통과 확인 후 운영 배포
git checkout main
git merge dev
git push origin main

# 7. 운영 서버 자동 배포 (Vercel)
# → https://cruise-guide.com 에 반영됨

# 8. 운영 서버 스모크 테스트
# 주요 기능만 빠르게 확인
```

---

## 🚨 문제 발생 시 롤백

### Vercel에서 이전 버전으로 되돌리기

#### 방법 1: Vercel Dashboard

1. Vercel Dashboard → Deployments
2. 이전 정상 배포 선택
3. "Promote to Production" 클릭

#### 방법 2: Git 되돌리기

```bash
# 1. 이전 커밋 찾기
git log --oneline

# 2. 이전 커밋으로 되돌리기
git reset --hard <커밋ID>

# 3. 강제 푸시
git push origin main --force

# Vercel이 자동으로 재배포
```

---

## 📊 배포 체크리스트 요약

### 개발 서버 배포 전
- [ ] `npm run deploy:check` 실행
- [ ] TypeScript 에러 0개
- [ ] 빌드 성공
- [ ] 환경 변수 설정 확인

### 개발 서버 배포 후
- [ ] `npm run qa:check` 실행
- [ ] 모든 주요 기능 테스트
- [ ] 콘솔 에러 없음
- [ ] 모바일 반응형 확인

### 운영 서버 배포 전
- [ ] 개발 서버 QA 100% 통과
- [ ] 데이터베이스 백업
- [ ] 환경 변수 (운영) 확인
- [ ] 팀원 승인 (있으면)

### 운영 서버 배포 후
- [ ] 스모크 테스트 (주요 기능만)
- [ ] 모니터링 확인
- [ ] 사용자 피드백 대기

---

## 🎓 참고 자료

- [Vercel 환경 변수 가이드](https://vercel.com/docs/environment-variables)
- [Vercel Git 연동](https://vercel.com/docs/git)
- [Next.js 배포](https://nextjs.org/docs/deployment)
- [Prisma 배포](https://www.prisma.io/docs/guides/deployment)

---

**작성일**: 2025-11-18
**버전**: 1.0
**다음 업데이트**: QA 자동화 확장
