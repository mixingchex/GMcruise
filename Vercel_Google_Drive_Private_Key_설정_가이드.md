# Vercel Google Drive Private Key 설정 가이드

## 📋 설정할 환경 변수

### 1. GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL

```
Key: GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL
Value: cruisedot@cruisedot-478810.iam.gserviceaccount.com
Environment: Production, Preview, Development (모두 체크)
```

### 2. GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY

```
Key: GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY
Value: (아래 전체 Private Key를 복사)
Environment: Production, Preview, Development (모두 체크)
```

**Private Key (전체 복사):**
```
-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQC3ocieialo9oSe
ZZfHLnH/GkWXeRFW8qbZFk4/vI9sBLfq5/eDzCAI8o9HZdBw2oJCZXhu6BPD930K
qhcBN/XkpsHA5HsIuNsO9kBNWD3nCiCNTgHZzacWjGqjm5QVYUu0nZ5P5rvCvA0r
t3LqgZ+C3oPHkbtC5oLyR+QhYUHxo+2+Yc1JJkWDaASo5AvRnGgSsIguREdQ9EnW
9jonQOL1AbflbeaaWjaLkZb4GTUGsWlZXDb7elFdr9pJ1x26W90SyM5NUdEvduSa
qV+37GuYSH1qHzFTA/UW0UD4AVMSZ1eBBR9tCFPrMtpANhWu+hV3x7j0rQBIMZYG
yOWcIj+dAgMBAAECggEAEbdCAPQ3ATFcn2DIa9Gcnd04VDdnPNmGz0V09yEx6lyU
1yIvTD/SjLUaAuwHrVuSBZB/NfPzNDdu5isoB64RGFDI5dslI4pHWAIvN0cJcdNq
9eGjZr04dCxyfVDyexLlQt+R+RNsOd/6mqUa07+oVpqGYX07G7vcFj5pUURuID8O
heo9Ffriby1liTAC/7fncOh5SEjFrUor7ULSGcWcyzxUjys9JK7IainU9HzX+jYk
EhRpsa7OaqqlmJ5czkfa19wu7BrNAEZtIVMKhFI1qDMJ+YCouqlobvW0JRy4PZZ/
O/EhZX6a/A12DoNJQhwHE4vqol7gy78vwIimUetI4QKBgQDnscK8ULcUh6SDi7yF
YlQZXNZsZaWoqgiXiwYNHKZmfndBiL1jVm0ycyAs/KdFhnI9uEUTObreReK3UK0l
5BsvSW8eQqSWNq0R3jV89fhyz1TtfiB7WUKoOmhN+Cyp3cQpArSYWc7xEbqOPcXR
/594yAwS4fXTWZi8ozJZQw5AVwKBgQDK5Un4qwUlkB+FYdDDO8VDqhYo7Ow5xv6K
zVaqpF3Bo2lSzkiT5WZio9nbotXzwAapuxeG1/g9DDSQAAWT/cwh3gMk2uIzEsdW
QVvCt0nWPpyqTIXM8m85hOuvS5dwwEujODn2IBKa4w+x/U88BDipOnaDRIl7wLXA
dX67pLN3KwKBgQC4knN/cQ1n3WbBJGBaIaq9SafHUnJVmp6dmrKHX3tvyu9V1YiJ
yh/TQMMxE1Rtnl0DrffZCPREfYfOYQaOWNkPIoDSqmRTBdt5kHsrwQba7y/IweE+
Yi0ntt/AvSNXbsMFqJIVi/W/NVBYX/1m/SwdG8ACit86LvXt0FQbp7+CoQKBgQCH
G6JjdbbKqatjzZwPteiJQ2TYQdSYMNvloBD7NtK8FE4ZdwY7fgHs44E6Ube5RgDp
240yHPTP6iXCUlFkmBfr4YQkcaE5M2MMHB+3jQgdI7p9aNGchT/thIbRRzwEN/jm
KpXmQLtC6rrT4oN1yrXUcvriNKx8fPpKu7L1zxo22wKBgQCzHN8NWxNvCcvs5oyw
lS0UBVw75EKl0aHtnEcXTnHBmH+1Ht+NEuYwjSO1ouLGem1FRsE+vs/Y6AciSA2B
5VBsFJhH77kSEuVRi9vCnIi2nEykynJl989B53kzzAk07Q7H9DL1aNZPEwdqlW/Q
NQaF/h9r2T7RuzpFPOXCk9uuiw==
-----END PRIVATE KEY-----
```

## 🔧 Vercel 설정 단계

### 1단계: Vercel 대시보드 접속

1. https://vercel.com 접속
2. 로그인
3. **cruise-guide** 프로젝트 선택

### 2단계: Environment Variables 이동

1. 상단 메뉴에서 **Settings** 클릭
2. 왼쪽 사이드바에서 **Environment Variables** 클릭

### 3단계: GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL 설정

1. **"Add New"** 또는 **"Add"** 버튼 클릭
2. 다음 정보 입력:
   - **Key**: `GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL`
   - **Value**: `cruisedot@cruisedot-478810.iam.gserviceaccount.com`
   - **Environment**: ✅ Production, ✅ Preview, ✅ Development (모두 체크)
3. **Save** 클릭

### 4단계: GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY 설정

1. 다시 **"Add New"** 또는 **"Add"** 버튼 클릭
2. 다음 정보 입력:
   - **Key**: `GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY`
   - **Value**: 위의 Private Key 전체를 복사하여 붙여넣기
     - ⚠️ **중요**: `-----BEGIN PRIVATE KEY-----`부터 `-----END PRIVATE KEY-----`까지 **전체** 복사
     - 여러 줄이므로 전체를 한 번에 붙여넣기
   - **Environment**: ✅ Production, ✅ Preview, ✅ Development (모두 체크)
3. **Save** 클릭

### 5단계: 환경 변수 확인

설정한 환경 변수가 목록에 표시되는지 확인:

```
✅ GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL = cruisedot@cruisedot-478810.iam.gserviceaccount.com
✅ GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY = -----BEGIN PRIVATE KEY-----...-----END PRIVATE KEY-----
```

### 6단계: 재배포 (필수!)

⚠️ **환경 변수를 추가/수정한 후에는 반드시 재배포해야 합니다!**

1. 상단 메뉴에서 **Deployments** 탭 클릭
2. 가장 최근 배포 항목 찾기
3. 우측 **"..."** (점 3개) 메뉴 클릭
4. **"Redeploy"** 선택
5. 확인 팝업에서 **"Redeploy"** 버튼 클릭
6. 배포가 완료될 때까지 대기 (보통 1-3분)

### 7단계: 테스트

배포 완료 후 백업 스크립트 테스트:

```bash
npx tsx scripts/backup-before-deploy.ts
```

또는 Vercel Functions에서 직접 테스트:
- Vercel 대시보드 > Functions > Logs에서 확인

## ✅ 확인 사항

설정 완료 후 다음을 확인하세요:

- [ ] `GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL` 환경 변수 추가됨
- [ ] `GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY` 환경 변수 추가됨
- [ ] Private Key에 `-----BEGIN PRIVATE KEY-----` 포함
- [ ] Private Key에 `-----END PRIVATE KEY-----` 포함
- [ ] Private Key에 줄바꿈 문자 포함 (여러 줄)
- [ ] Production, Preview, Development 모두 체크됨
- [ ] 재배포 완료됨
- [ ] 백업 스크립트 테스트 성공

## 💡 주의사항

1. **Private Key 보안**
   - Private Key는 절대 Git에 커밋하지 마세요
   - `.env.local` 파일도 Git에 커밋하지 마세요
   - Vercel 환경 변수에만 저장하세요

2. **줄바꿈 문자**
   - Vercel은 여러 줄 입력을 자동으로 처리합니다
   - 전체 Private Key를 한 번에 붙여넣으면 됩니다
   - 따옴표나 이스케이프 문자는 필요 없습니다

3. **재배포 필수**
   - 환경 변수 변경 후 반드시 재배포해야 합니다
   - 재배포하지 않으면 변경사항이 적용되지 않습니다

## 🐛 문제 해결

### 문제 1: 여전히 "Invalid JWT Signature" 오류

**해결:**
1. Private Key를 다시 확인 (전체 복사했는지)
2. Vercel에서 환경 변수 값 확인 (저장 후 다시 열어서 확인)
3. 재배포 확인 (환경 변수 변경 후 배포되었는지)

### 문제 2: 환경 변수가 적용되지 않음

**해결:**
1. Deployments 탭에서 최근 배포 확인
2. 환경 변수 추가 **이후**에 배포된 것인지 확인
3. 그렇지 않으면 수동으로 Redeploy 실행

### 문제 3: Private Key 형식 오류

**확인:**
- `-----BEGIN PRIVATE KEY-----`로 시작하는지
- `-----END PRIVATE KEY-----`로 끝나는지
- 중간에 줄바꿈이 있는지 (여러 줄)

**해결:**
- 전체 Private Key를 다시 복사하여 붙여넣기
- 앞뒤 공백이나 따옴표 제거

---

**작성일:** 2025-01-27  
**버전:** 1.0

