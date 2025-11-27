# 관리자 패널 및 Vercel 업데이트 가이드

**업데이트 일자**: 2025-01-20  
**새 서비스 계정 키 ID**: `79ba5282a93845b0e4cf524c7ad539fc1e5a4439`

---

## ✅ 완료된 작업

- ✅ `.env.local` 파일 업데이트 완료
- ✅ 백업 문서 업데이트 완료
- ✅ 로컬 마이그레이션 테스트 성공

---

## 📋 관리자 패널에서 업데이트

### 1. 관리자 패널 접속
- URL: `https://www.cruisedot.co.kr/admin/settings`
- 관리자 계정으로 로그인

### 2. Google Drive 설정 섹션 찾기
- 페이지에서 "☁️ Google Drive 설정" 섹션 찾기
- "편집" 버튼 클릭

### 3. 값 업데이트

#### 서비스 계정 이메일
```
cruisedot@cruisedot-478810.iam.gserviceaccount.com
```

#### 서비스 계정 Private Key
아래 전체를 복사하여 붙여넣기:

```
-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDSx3+3kmQu1+Sb
1re2ekXRS0QGorxZ2C0fiQ8nCnWWHxXNZKnVlQhE5YI7K5qjCsfnPNuylQTKTKdr
9f0wGOpwsX33FWmzQs8dJLALZvaVyCr8RTehIFAEi3RfDx7HC5XASNZuVGD3g36g
8zs3qAGU22oT0nc67r5RxJ8+dST41Qq36t7UK4Fi1ScdmTBRgpuIyeFjKdc3obAz
TtNqAdUUxe1BIxxGBonD5x/S5HkvZ0p83vE7767s6n7JfGC1xScaFDX5wTTFRlw/
UetEy1UGeYos9C+k5VrPE1WGT/YqFk5/LnSyXGpJAylnhY3fszwglvAN7x1VR1cy
z+FW/WHJAgMBAAECggEAJyTroCDswBJSH2rp5Vah3rOWp5DTX/AYuTGQAdUcb0vI
lcNrEwJBbeIdpHV9m2fmJhiUSH8KS7OeqBsf8S2/ZDxiQ1/TqHnw0t28X/G4O6rX
6M/F/ANvONjZPMonEhohrnsYb5b2ByGBg8yII9bsrENvWM0OXYB3EeJtHIFO43L+
1q8c5TLppCWhDcqokR5cm25mXIY919lgeqITMKUqDv+FXtQbRT+sfxM1rLnhF/vS
ZC2P+NMeOTbgI6LWrl7pnchumtJMWjN5uTW3Xj1fyfYWuIvYW/PbhvdMECm7Okoy
RBXeSZZ5iRgyPdAdwWRob8mLCnGONFZpQZQexLxVbQKBgQDyL7jS/CJvT7h4g0th
7l4AXrJ3c05a9XKXRUNGURnOpB5C0tOheKlDCxc0xFgmN1Ywnc+fZ3c+pS8spBFl
uO5IeKqaNncozMWDuPnXuWMHJtL1dPmq9rDapaXqiL5gg6sFvzvcGxvUlIYLUfaU
S+gkAdAemNuDXJyu2qo5zU68mwKBgQDezS/N9NsCp+CFjq2reechcoKQOD4KhyYG
ZigIzUMV+wB2PTqiIKiaW1hTjZm57m9oaSre2iXL6qfro35opwfg0w0Cp2aV8M8C
HWXs4r6P+aab0I4SLYRVh8mxFfjUj6bcVjAXKVXuaa2HoXIKsB9GOMZLxJz1UpKF
AhHVX4H3awKBgApZ0ctqrUoWnSrBacpgtrHLWlNSoUmv7drbQfnSY4j6aLSwcA0Z
rBpKcg52SdIwUUW4qPQGJwmNY8vDo162nbCJP7lhlIww3Ew57quyp7HZjfChtD4D
VyGxLLsuZvyXBAs11igdHH5kbqozMZe6+sv3K97y54bgwW2TuOzJgpD7AoGAeEFN
lR+c+lD8OXoqOMyiOQZifE8vBWWu23NWFnIbzIhe1nLz68Au4Kl/AhICsD2GuldR
QVmDXw33tpLXTssg0HN5qT4Le9CvGtgdRH+aFYHNMHqfxCX3MGcLMN7IIIqsqG6I
pGe2LumxNOyp7iTjrHZGaWzkvvDjjpDwaTeUoaMCgYA+lctcnEgm02WsJ1Buumck
HmKoTpMpgHCmyiW6thC9fZiMejVRz2yyBAnoBf6UoFJVN8R85JnJTmbrQsBqxKXY
5BK2BSuXcLgD5Rl/9p2pwrtU+ysVtyuEB1a5/G1mhCsz8gBWNyKSwgySx89UNEh/
aMakUu0GbPWLXekVpMWjSw==
-----END PRIVATE KEY-----
```

### 4. 저장
- "저장" 버튼 클릭
- 자동으로 Vercel 환경변수도 업데이트됩니다 (API 구현에 따라)

---

## 🚀 Vercel 환경변수 설정 방법

### 방법 1: Vercel 대시보드 (권장)

#### 1단계: Vercel 대시보드 접속
- https://vercel.com/dashboard
- 프로젝트: `cruise-guide` 선택

#### 2단계: 환경변수 페이지로 이동
- Settings → Environment Variables

#### 3단계: GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL 업데이트
1. 검색창에 `GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL` 입력
2. 기존 항목 클릭 → Edit
3. 새 값 입력:
   ```
   cruisedot@cruisedot-478810.iam.gserviceaccount.com
   ```
4. Environment: ✅ Production, ✅ Preview, ✅ Development 모두 선택
5. Save 클릭

#### 4단계: GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY 업데이트
1. 검색창에 `GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY` 입력
2. 기존 항목 클릭 → Edit
3. 새 Private Key 전체를 복사하여 붙여넣기:
   ```
   -----BEGIN PRIVATE KEY-----
   MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDSx3+3kmQu1+Sb
   1re2ekXRS0QGorxZ2C0fiQ8nCnWWHxXNZKnVlQhE5YI7K5qjCsfnPNuylQTKTKdr
   9f0wGOpwsX33FWmzQs8dJLALZvaVyCr8RTehIFAEi3RfDx7HC5XASNZuVGD3g36g
   8zs3qAGU22oT0nc67r5RxJ8+dST41Qq36t7UK4Fi1ScdmTBRgpuIyeFjKdc3obAz
   TtNqAdUUxe1BIxxGBonD5x/S5HkvZ0p83vE7767s6n7JfGC1xScaFDX5wTTFRlw/
   UetEy1UGeYos9C+k5VrPE1WGT/YqFk5/LnSyXGpJAylnhY3fszwglvAN7x1VR1cy
   z+FW/WHJAgMBAAECggEAJyTroCDswBJSH2rp5Vah3rOWp5DTX/AYuTGQAdUcb0vI
   lcNrEwJBbeIdpHV9m2fmJhiUSH8KS7OeqBsf8S2/ZDxiQ1/TqHnw0t28X/G4O6rX
   6M/F/ANvONjZPMonEhohrnsYb5b2ByGBg8yII9bsrENvWM0OXYB3EeJtHIFO43L+
   1q8c5TLppCWhDcqokR5cm25mXIY919lgeqITMKUqDv+FXtQbRT+sfxM1rLnhF/vS
   ZC2P+NMeOTbgI6LWrl7pnchumtJMWjN5uTW3Xj1fyfYWuIvYW/PbhvdMECm7Okoy
   RBXeSZZ5iRgyPdAdwWRob8mLCnGONFZpQZQexLxVbQKBgQDyL7jS/CJvT7h4g0th
   7l4AXrJ3c05a9XKXRUNGURnOpB5C0tOheKlDCxc0xFgmN1Ywnc+fZ3c+pS8spBFl
   uO5IeKqaNncozMWDuPnXuWMHJtL1dPmq9rDapaXqiL5gg6sFvzvcGxvUlIYLUfaU
   S+gkAdAemNuDXJyu2qo5zU68mwKBgQDezS/N9NsCp+CFjq2reechcoKQOD4KhyYG
   ZigIzUMV+wB2PTqiIKiaW1hTjZm57m9oaSre2iXL6qfro35opwfg0w0Cp2aV8M8C
   HWXs4r6P+aab0I4SLYRVh8mxFfjUj6bcVjAXKVXuaa2HoXIKsB9GOMZLxJz1UpKF
   AhHVX4H3awKBgApZ0ctqrUoWnSrBacpgtrHLWlNSoUmv7drbQfnSY4j6aLSwcA0Z
   rBpKcg52SdIwUUW4qPQGJwmNY8vDo162nbCJP7lhlIww3Ew57quyp7HZjfChtD4D
   VyGxLLsuZvyXBAs11igdHH5kbqozMZe6+sv3K97y54bgwW2TuOzJgpD7AoGAeEFN
   lR+c+lD8OXoqOMyiOQZifE8vBWWu23NWFnIbzIhe1nLz68Au4Kl/AhICsD2GuldR
   QVmDXw33tpLXTssg0HN5qT4Le9CvGtgdRH+aFYHNMHqfxCX3MGcLMN7IIIqsqG6I
   pGe2LumxNOyp7iTjrHZGaWzkvvDjjpDwaTeUoaMCgYA+lctcnEgm02WsJ1Buumck
   HmKoTpMpgHCmyiW6thC9fZiMejVRz2yyBAnoBf6UoFJVN8R85JnJTmbrQsBqxKXY
   5BK2BSuXcLgD5Rl/9p2pwrtU+ysVtyuEB1a5/G1mhCsz8gBWNyKSwgySx89UNEh/
   aMakUu0GbPWLXekVpMWjSw==
   -----END PRIVATE KEY-----
   ```
   **⚠️ 중요**: 여러 줄로 붙여넣어도 됩니다. Vercel이 자동으로 처리합니다.
4. Environment: ✅ Production, ✅ Preview, ✅ Development 모두 선택
5. Save 클릭

#### 5단계: 재배포
- Deployments 탭으로 이동
- 최신 배포의 "..." 메뉴 클릭
- "Redeploy" 선택
- "Use existing Build Cache" 체크 해제 (환경변수 변경 반영)
- "Redeploy" 클릭

---

### 방법 2: Vercel CLI

```bash
# 1. Vercel CLI 설치 (없는 경우)
npm i -g vercel

# 2. 로그인
vercel login

# 3. 프로젝트 디렉토리로 이동
cd /home/userhyeseon28/projects/cruise-guide

# 4. Email 업데이트 (Production)
vercel env add GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL production
# 프롬프트에 입력: cruisedot@cruisedot-478810.iam.gserviceaccount.com

# 5. Private Key 업데이트 (Production)
vercel env add GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY production
# 프롬프트에 Private Key 전체 붙여넣기 (여러 줄 가능)

# 6. Preview 환경에도 동일하게 설정
vercel env add GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL preview
vercel env add GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY preview

# 7. Development 환경에도 동일하게 설정
vercel env add GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL development
vercel env add GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY development
```

---

## 📝 JSON 키 파일을 Vercel에 설정하는 방법

Vercel은 JSON 파일을 직접 업로드할 수 없지만, JSON 파일의 내용을 환경변수로 설정할 수 있습니다:

### JSON 파일에서 값 추출

```bash
# 프로젝트 디렉토리에서
cd /home/userhyeseon28/projects/cruise-guide

# Private Key 추출
cat cruisedot-478810-79ba5282a938.json | jq -r '.private_key'

# Client Email 추출
cat cruisedot-478810-79ba5282a938.json | jq -r '.client_email'
```

### Vercel에 설정

위에서 추출한 값을 각각 환경변수로 설정:
- `GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL` = `client_email` 값
- `GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY` = `private_key` 값

---

## ✅ 업데이트 확인

### 1. 로컬 확인
```bash
npm run migrate:check-env
```

### 2. 실제 마이그레이션 테스트
```bash
npm run migrate:uploads -- --dry-run --only=images
```

### 3. Vercel 확인
- Vercel 대시보드 → Settings → Environment Variables
- 값이 올바르게 설정되었는지 확인
- 재배포 후 테스트

---

## 🔐 보안 주의사항

1. **키 파일 보관**
   - `cruisedot-478810-79ba5282a938.json` 파일은 안전한 곳에 보관
   - Git에 커밋하지 않음 (`.gitignore`에 추가 권장)

2. **환경변수 보호**
   - Vercel 환경변수는 암호화되어 저장됨
   - 접근 권한 제한

3. **키 파일 삭제 (선택사항)**
   - 환경변수에 저장된 후 로컬 파일 삭제 가능
   - 필요시 Google Cloud Console에서 재다운로드 가능

---

## 📚 관련 문서

- `서비스_계정_키_업데이트_완료_리포트.md`: 업데이트 완료 리포트
- `Vercel_환경변수_업데이트_가이드.md`: 상세한 Vercel 설정 가이드
- `GOOGLE_DRIVE_자동화_백업_문서.md`: 전체 환경변수 목록 (업데이트됨)

---

**✅ 로컬 업데이트 완료! 이제 관리자 패널과 Vercel에서도 업데이트하세요.**

