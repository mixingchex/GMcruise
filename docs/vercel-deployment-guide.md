# Vercel 배포 설정 가이드

## 📋 목차
1. [환경 변수 설정](#1-환경-변수-설정)
2. [Google Drive 백업 폴더 설정](#2-google-drive-백업-폴더-설정)
3. [빌드 설정](#3-빌드-설정)
4. [Cron Job 설정](#4-cron-job-설정)

---

## 1. 환경 변수 설정

### 필수 환경 변수

Vercel 대시보드 → 프로젝트 설정 → Environment Variables에서 다음 변수들을 추가하세요:

#### 데이터베이스
```
DATABASE_URL=postgresql://...
```

#### Google Drive (백업용)
```
GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_SHARED_DRIVE_ID=your-shared-drive-id
```

#### Google Drive 정액제 백업 폴더 ID (정액제 판매원 전용)
```
GOOGLE_DRIVE_BACKUP_FOLDER_ID=1HSV-t7Z7t8byMDJMY5srrpJ3ziGqz9xK
```

**중요**: 이 폴더는 **정액제 판매원(gest) 백업 전용** 폴더입니다. 전체 시스템 백업이 아닙니다.
- 정액제 판매원의 자동 백업 파일이 저장됩니다.
- 파일명 형식: `{mallUserId}_backup_{날짜}_{시간}.json`
- 삭제 시 백업 파일명: `{mallUserId}_deleted_backup_{날짜}_{시간}.json`

#### Redis (Upstash)
```
UPSTASH_REDIS_REST_URL=https://pleasant-basilisk-25704.upstash.io
UPSTASH_REDIS_REST_TOKEN=AWRoAAIncDJjZGQ4YjBiNjFiNWE0ZjZkYWE1YjY3M2FiZWIxNmJjY3AyMjU3MDQ
```

**중요**: 
- `REDIS_URL`은 **설정하지 마세요** (로컬 Redis 연결 시도로 인한 오류 발생)
- Upstash Redis는 REST API만 지원하므로 `UPSTASH_REDIS_REST_URL`과 `UPSTASH_REDIS_REST_TOKEN`만 사용합니다

#### 기타 필수 환경 변수
```
NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app
GEMINI_API_KEY=your-gemini-api-key
# ... 기타 필요한 환경 변수들
```

---

## 2. Google Drive 백업 폴더 설정

### 폴더 접근 권한 설정

1. [Google Drive 폴더](https://drive.google.com/drive/folders/1HSV-t7Z7t8byMDJMY5srrpJ3ziGqz9xK) 접근
2. 폴더 공유 설정:
   - 서비스 계정 이메일을 "편집자" 권한으로 추가
   - 또는 "링크가 있는 모든 사용자"에게 "뷰어" 권한 부여 (선택 사항)

### 서비스 계정 권한 확인

서비스 계정이 다음 권한을 가지고 있어야 합니다:
- Google Drive API 활성화
- **정액제 백업 전용 폴더** 접근 권한 (폴더 ID: `1HSV-t7Z7t8byMDJMY5srrpJ3ziGqz9xK`)
- 서비스 계정 이메일을 해당 폴더에 "편집자" 권한으로 추가

**참고**: 이 폴더는 정액제 판매원 백업 전용이며, 전체 시스템 백업이 아닙니다.

---

## 3. 빌드 설정

### Vercel 프로젝트 설정

1. **프로젝트 설정** → **General**:
   - Framework Preset: `Next.js`
   - Build Command: `npm run build` (기본값)
   - Output Directory: `.next` (기본값)
   - Install Command: `npm install` (기본값)

2. **프로젝트 설정** → **Build & Development Settings**:
   - Node.js Version: `18.x` 이상 권장
   - Environment Variables: 위의 환경 변수들 설정

### 빌드 명령어 확인

`package.json`의 `build` 스크립트가 다음을 포함하는지 확인:
```json
{
  "scripts": {
    "build": "prisma generate && npm run images:build && npm run pwa:icons && next build"
  }
}
```

---

## 4. Cron Job 설정

### 자동 삭제 및 백업 Cron Job

Vercel에서는 `vercel.json` 파일을 통해 Cron Job을 설정할 수 있습니다.

#### `vercel.json` 파일 생성

프로젝트 루트에 `vercel.json` 파일을 생성하고 다음 내용을 추가:

```json
{
  "crons": [
    {
      "path": "/api/admin/subscription/auto-delete-expired-trials",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/admin/subscription/auto-backup",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

**스케줄 설명**:
- `0 2 * * *`: 매일 오전 2시에 실행 (무료 체험 종료 계정 삭제)
- `0 */6 * * *`: 6시간마다 실행 (정기 백업)

**참고**: Vercel의 Cron Job은 Pro 플랜 이상에서만 사용 가능합니다. 무료 플랜의 경우 외부 Cron 서비스(예: cron-job.org)를 사용해야 합니다.

### 외부 Cron 서비스 사용 (무료 플랜)

1. **cron-job.org** 또는 유사한 서비스 사용
2. 다음 URL을 Cron Job으로 등록:
   - `https://your-domain.vercel.app/api/admin/subscription/auto-delete-expired-trials`
   - `https://your-domain.vercel.app/api/admin/subscription/auto-backup`
3. 인증 헤더 추가 (선택 사항):
   - Authorization 헤더에 API 키 또는 토큰 추가

---

## 5. 배포 후 확인 사항

### 1. 환경 변수 확인
- [ ] 모든 필수 환경 변수가 설정되었는지 확인
- [ ] Google Drive 서비스 계정 권한 확인
- [ ] **정액제 백업 전용 폴더** 접근 권한 확인 (폴더 ID: `1HSV-t7Z7t8byMDJMY5srrpJ3ziGqz9xK`)

### 2. 기능 테스트
- [ ] Gest 계정 생성 테스트
- [ ] 파트너 모드 로그인 테스트 (gest1 / zxc1, 모드: gestpartner)
- [ ] 정액제 판매원 자동 백업 동작 확인
- [ ] Google Drive 정액제 백업 전용 폴더에서 백업 파일 확인

### 3. Cron Job 확인
- [ ] 자동 삭제 Cron Job 동작 확인
- [ ] 정기 백업 Cron Job 동작 확인

---

## 6. 문제 해결

### Google Drive 업로드 실패
- 서비스 계정 이메일이 **정액제 백업 전용 폴더**에 공유되어 있는지 확인
- 폴더 ID가 올바른지 확인 (`1HSV-t7Z7t8byMDJMY5srrpJ3ziGqz9xK`)
- Private Key의 줄바꿈 문자(`\n`)가 올바르게 설정되었는지 확인
- Google Drive API가 활성화되어 있는지 확인
- **참고**: 이 폴더는 정액제 판매원 백업 전용입니다. 다른 백업은 별도 폴더를 사용합니다.

### Cron Job이 동작하지 않음
- Vercel Pro 플랜 이상인지 확인
- `vercel.json` 파일이 올바른 위치에 있는지 확인
- Vercel 대시보드에서 Cron Job 로그 확인

### 환경 변수 오류
- 환경 변수 이름이 정확한지 확인
- Private Key에 따옴표가 올바르게 설정되었는지 확인
- Vercel 대시보드에서 환경 변수 재설정

---

## 완료! 🎉

위의 설정을 완료하면 Vercel에서 정상적으로 배포되고 동작합니다.

