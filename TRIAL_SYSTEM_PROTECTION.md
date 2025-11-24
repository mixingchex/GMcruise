# 지니가이드 3일 체험 시스템 보호 가이드

## 📌 현재 상태
- **태그**: `v1.0.0-trial-stable`
- **브랜치**: `dev`
- **상태**: ✅ 모든 기능 정상 작동 확인 완료

## 🛡️ 보호 대상 파일 목록

### 핵심 파일 (절대 수정 금지)
다음 파일들은 3일 체험 시스템의 핵심이므로 **절대 수정하지 마세요**:

1. **`app/login-test/page.tsx`**
   - 3일 체험 로그인 페이지 UI
   - 연락처 10-11자리 검증 로직
   - 비밀번호 1101 검증
   - AffiliateLead 자동 생성

2. **`app/api/auth/login/route.ts`** (테스트 모드 부분)
   - 라인 14: `const TEST_MODE_PASSWORDS = ['1101'];`
   - 라인 52-689: 테스트 모드 로그인 로직
   - AffiliateLead 생성/업데이트 로직
   - `updatedAt` 필드 필수 포함

### 관련 파일 (수정 시 주의 필요)
다음 파일들을 수정할 때는 3일 체험 기능에 영향을 주지 않는지 반드시 확인하세요:

1. **`prisma/schema.prisma`**
   - `AffiliateLead` 모델 (라인 ~)
   - `User` 모델의 `testModeStartedAt`, `customerStatus` 필드

2. **`lib/auth.ts`** 또는 `lib/session.ts`
   - 세션 관리 로직
   - 사용자 인증 로직

3. **`app/chat-test/page.tsx`** (존재하는 경우)
   - 3일 체험 사용자용 채팅 페이지

## ⚠️ 변경 시 체크리스트

3일 체험 관련 파일을 수정하기 전에 반드시 다음을 확인하세요:

### 필수 확인 사항
- [ ] 로그인 페이지에서 비밀번호 `1101`로 로그인 가능한가?
- [ ] 연락처 10-11자리 검증이 정상 작동하는가?
- [ ] 이름과 연락처가 입력되면 AffiliateLead가 자동 생성되는가?
- [ ] 로그인 후 `/chat-test` 또는 `/chat`로 정상 리다이렉트되는가?
- [ ] `updatedAt` 필드가 모든 Prisma create/update에 포함되어 있는가?

### 테스트 시나리오
1. **신규 사용자 테스트**
   ```
   이름: 테스트
   연락처: 01012345678 (10자리)
   비밀번호: 1101
   ```
   - ✅ 로그인 성공
   - ✅ AffiliateLead 생성 확인
   - ✅ User 생성 확인

2. **기존 사용자 테스트**
   ```
   이름: 기존사용자
   연락처: 01087654321 (11자리)
   비밀번호: 1101
   ```
   - ✅ 로그인 성공
   - ✅ AffiliateLead 업데이트 확인

3. **에러 케이스 테스트**
   - 연락처 9자리 이하 → ❌ 에러 메시지 표시
   - 연락처 12자리 이상 → ❌ 입력 불가
   - 비밀번호 1101 외 → ❌ 로그인 실패

## 🔄 이전 버전으로 되돌리기

만약 실수로 파일을 수정했다면:

```bash
# 특정 파일만 이전 태그 버전으로 되돌리기
git checkout v1.0.0-trial-stable -- app/login-test/page.tsx
git checkout v1.0.0-trial-stable -- app/api/auth/login/route.ts

# 전체 프로젝트를 태그 버전으로 되돌리기 (주의: 모든 변경사항 삭제됨)
git reset --hard v1.0.0-trial-stable
```

## 📝 Git 태그 정보

```bash
# 태그 목록 확인
git tag -l | grep trial

# 태그 상세 정보 확인
git show v1.0.0-trial-stable

# 태그가 생성된 커밋 확인
git log --oneline --decorate | grep trial
```

## 🚨 긴급 복구 방법

만약 3일 체험 기능이 작동하지 않는다면:

1. **즉시 확인**
   ```bash
   # 현재 변경사항 확인
   git status
   git diff app/login-test/page.tsx
   git diff app/api/auth/login/route.ts
   ```

2. **태그 버전으로 복구**
   ```bash
   # 핵심 파일만 복구
   git checkout v1.0.0-trial-stable -- app/login-test/page.tsx
   git checkout v1.0.0-trial-stable -- app/api/auth/login/route.ts
   
   # 커밋
   git add app/login-test/page.tsx app/api/auth/login/route.ts
   git commit -m "Fix: 3일 체험 기능 복구 - 태그 버전으로 되돌림"
   ```

3. **서버 재시작**
   ```bash
   # 개발 서버 재시작
   npm run dev
   ```

## 📋 변경 이력 추적

중요한 변경사항이 있을 때마다 이 문서를 업데이트하세요:

### 변경 이력
- **2025-11-23**: v1.0.0-trial-stable 태그 생성
  - 연락처 10-11자리 검증 추가
  - AffiliateLead updatedAt 필드 추가
  - 모든 기능 정상 작동 확인

## 💡 권장 사항

1. **브랜치 전략**
   - 3일 체험 기능 수정 시 별도 브랜치 생성: `git checkout -b fix/trial-login`
   - 수정 후 `dev` 브랜치로 머지 전 반드시 테스트

2. **코드 리뷰**
   - 3일 체험 관련 PR은 반드시 체크리스트 확인
   - 실제 로그인 테스트 필수

3. **백업**
   - 중요한 변경 전 항상 커밋
   - 태그 버전을 정기적으로 생성

## 🔗 관련 문서
- `PROJECT_STATUS_REPORT.md`: 프로젝트 전체 상태
- `PHASE2_DEVELOPMENT_GUIDE.md`: Phase 2 개발 가이드










