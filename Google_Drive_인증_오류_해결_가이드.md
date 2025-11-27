# Google Drive 인증 오류 해결 가이드

## 🚨 문제 현상

백업 스크립트 실행 시 다음 오류 발생:
```
GaxiosError: invalid_grant: Invalid JWT Signature.
```

## 🔍 원인 분석

**"Invalid JWT Signature"** 오류는 다음과 같은 이유로 발생합니다:

1. **Private Key 형식 오류**
   - 줄바꿈 문자(`\n`)가 제대로 처리되지 않음
   - Private Key가 손상되었거나 잘못 복사됨

2. **서비스 계정 키 만료**
   - 서비스 계정 키가 만료되었거나 재생성됨
   - Google Cloud Console에서 키가 삭제됨

3. **환경 변수 설정 오류**
   - Vercel에 Private Key가 제대로 설정되지 않음
   - 여러 줄 입력 시 형식이 잘못됨

## ✅ 해결 방법

### 방법 1: Vercel 환경 변수 확인 및 재설정 (권장)

#### 1단계: Google Cloud Console에서 서비스 계정 키 확인

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com 접속
   - 프로젝트 선택: `cruisedot-478810`

2. **서비스 계정 확인**
   - 좌측 메뉴: **IAM 및 관리자** > **서비스 계정**
   - 서비스 계정: `cruisedot@cruisedot-478810.iam.gserviceaccount.com`
   - 이메일 클릭

3. **키 확인/재생성**
   - **키** 탭 클릭
   - 기존 키가 있으면 확인
   - 없거나 만료되었으면 **키 추가** > **새 키 만들기** > **JSON** 선택
   - JSON 파일 다운로드

#### 2단계: JSON 파일에서 Private Key 추출

다운로드한 JSON 파일을 열고 다음 필드를 확인:

```json
{
  "type": "service_account",
  "project_id": "cruisedot-478810",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "cruisedot@cruisedot-478810.iam.gserviceaccount.com",
  ...
}
```

**중요:**
- `private_key` 필드의 값을 **전체** 복사
- `-----BEGIN PRIVATE KEY-----`부터 `-----END PRIVATE KEY-----`까지 포함
- 줄바꿈 문자(`\n`)도 포함되어야 함

#### 3단계: Vercel 환경 변수 설정

1. **Vercel 대시보드 접속**
   - https://vercel.com 접속
   - 로그인 후 **cruise-guide** 프로젝트 선택

2. **Settings > Environment Variables 이동**

3. **기존 환경 변수 확인**
   - `GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL` 확인
   - `GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY` 확인

4. **Private Key 재설정**
   - `GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY` 편집 (연필 아이콘)
   - 기존 값 삭제
   - JSON 파일의 `private_key` 값을 **전체** 붙여넣기
   - **주의**: 여러 줄 입력 시 Vercel이 자동으로 처리하지만, 전체를 한 번에 붙여넣어야 함
   - **Environment**: Production, Preview, Development 모두 체크
   - **Save** 클릭

5. **Email 확인**
   - `GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL` 확인
   - 값: `cruisedot@cruisedot-478810.iam.gserviceaccount.com`
   - 없으면 추가

#### 4단계: 재배포

1. **Deployments** 탭 클릭
2. 최근 배포 항목의 **"..."** 메뉴 클릭
3. **"Redeploy"** 선택
4. 배포 완료까지 대기 (1-3분)

#### 5단계: 테스트

배포 완료 후 백업 스크립트 다시 실행:
```bash
npx tsx scripts/backup-before-deploy.ts
```

### 방법 2: Private Key 형식 수동 확인

#### Private Key 형식 요구사항

1. **시작 라인**: `-----BEGIN PRIVATE KEY-----`
2. **중간 라인**: 각 라인은 64자 (일부는 64자 미만일 수 있음)
3. **종료 라인**: `-----END PRIVATE KEY-----`
4. **줄바꿈**: 각 라인 사이에 실제 개행 문자(`\n`) 필요

#### 올바른 형식 예시

```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
(각 라인은 64자)
...
-----END PRIVATE KEY-----
```

#### 잘못된 형식 예시

```
-----BEGIN PRIVATE KEY-----MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...-----END PRIVATE KEY-----
```
→ 줄바꿈이 없어서 오류 발생

### 방법 3: 서비스 계정 권한 확인

1. **Google Cloud Console** 접속
2. **IAM 및 관리자** > **서비스 계정** 이동
3. 서비스 계정 클릭
4. **권한** 탭에서 확인:
   - ✅ **Google Drive API** 활성화되어 있는지
   - ✅ **역할**에 적절한 권한이 있는지

5. **API 및 서비스** > **사용 설정된 API**에서 확인:
   - ✅ **Google Drive API** 활성화되어 있는지

## 🔧 문제 진단 스크립트

다음 스크립트로 문제를 진단할 수 있습니다:

```bash
npx tsx scripts/test-google-drive-auth.ts
```

이 스크립트는:
- 환경 변수 존재 여부 확인
- Private Key 형식 검증
- Google Drive API 호출 테스트

## 📋 체크리스트

해결 후 다음을 확인하세요:

- [ ] `GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL` 환경 변수 설정됨
- [ ] `GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY` 환경 변수 설정됨
- [ ] Private Key에 `-----BEGIN PRIVATE KEY-----` 포함
- [ ] Private Key에 `-----END PRIVATE KEY-----` 포함
- [ ] Private Key에 줄바꿈 문자 포함
- [ ] Vercel 재배포 완료
- [ ] 백업 스크립트 테스트 성공

## 💡 추가 팁

### Private Key를 안전하게 복사하는 방법

1. **JSON 파일에서 직접 복사**
   - JSON 파일을 텍스트 에디터로 열기
   - `private_key` 필드의 값을 전체 선택
   - 복사 (줄바꿈 포함)

2. **Vercel에 붙여넣기**
   - Vercel 환경 변수 편집 화면에서
   - 전체 Private Key를 한 번에 붙여넣기
   - Vercel이 자동으로 여러 줄 처리

3. **확인**
   - 저장 후 다시 확인하여 줄바꿈이 유지되었는지 확인

### 로컬에서 테스트하는 방법

`.env.local` 파일에 환경 변수 추가:

```bash
GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL=cruisedot@cruisedot-478810.iam.gserviceaccount.com
GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
(여기에 전체 Private Key)
-----END PRIVATE KEY-----"
```

**주의**: `.env.local` 파일은 Git에 커밋하지 마세요!

## 🚨 여전히 문제가 있는 경우

1. **서비스 계정 키 재생성**
   - Google Cloud Console에서 기존 키 삭제
   - 새 키 생성
   - 새 Private Key를 Vercel에 설정

2. **Google Drive API 권한 확인**
   - 서비스 계정에 Google Drive API 권한이 있는지 확인
   - 공유 드라이브 접근 권한 확인

3. **로그 확인**
   - Vercel 대시보드 > Functions > Logs
   - 백업 스크립트 실행 시 상세 오류 확인

---

**작성일:** 2025-01-27  
**버전:** 1.0


