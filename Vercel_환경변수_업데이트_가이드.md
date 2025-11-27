# Vercel 환경변수 업데이트 가이드

**업데이트 일자**: 2025-01-20  
**새 서비스 계정 키 ID**: `79ba5282a93845b0e4cf524c7ad539fc1e5a4439`

---

## 📋 업데이트할 환경변수

### 1. GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL
```
cruisedot@cruisedot-478810.iam.gserviceaccount.com
```

### 2. GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY
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

**⚠️ 중요**: Vercel에서는 여러 줄 환경변수를 지원하므로, 위 Private Key를 **그대로 복사**하여 붙여넣으면 됩니다.

---

## 🚀 Vercel 환경변수 설정 방법

### 방법 1: Vercel 대시보드에서 설정 (권장)

1. **Vercel 대시보드 접속**
   - https://vercel.com/dashboard
   - 프로젝트 선택: `cruise-guide`

2. **환경변수 설정 페이지로 이동**
   - Settings → Environment Variables

3. **기존 환경변수 수정**
   - `GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL` 찾기 → Edit
   - 값: `cruisedot@cruisedot-478810.iam.gserviceaccount.com`
   - Environment: Production, Preview, Development 모두 선택
   - Save

4. **Private Key 업데이트**
   - `GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY` 찾기 → Edit
   - 위의 Private Key 전체를 복사하여 붙여넣기
   - **주의**: 여러 줄로 붙여넣어도 됩니다 (Vercel이 자동 처리)
   - Environment: Production, Preview, Development 모두 선택
   - Save

5. **재배포**
   - Deployments 탭
   - 최신 배포의 "..." 메뉴 → Redeploy

---

### 방법 2: Vercel CLI로 설정

```bash
# Vercel CLI 설치 (없는 경우)
npm i -g vercel

# 로그인
vercel login

# 환경변수 설정
vercel env add GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL production
# 값 입력: cruisedot@cruisedot-478810.iam.gserviceaccount.com

vercel env add GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY production
# Private Key 전체를 붙여넣기 (여러 줄 가능)

# Preview 환경에도 동일하게 설정
vercel env add GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL preview
vercel env add GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY preview

# Development 환경에도 동일하게 설정
vercel env add GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL development
vercel env add GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY development
```

---

## 📝 관리자 패널에서 업데이트

### 관리자 패널 접속
1. https://www.cruisedot.co.kr/admin/settings 접속
2. 로그인 (관리자 계정)

### Google Drive 설정 섹션 찾기
- 페이지에서 "Google Drive" 또는 "Google 서비스" 섹션 찾기
- `GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL` 필드에 새 값 입력
- `GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY` 필드에 새 Private Key 입력
- 저장 버튼 클릭

**참고**: 관리자 패널에서 저장하면 자동으로 Vercel 환경변수도 업데이트됩니다 (API 구현에 따라).

---

## ✅ 업데이트 확인

### 1. 로컬 확인
```bash
npm run migrate:check-env
```

### 2. Vercel 확인
- Vercel 대시보드 → Settings → Environment Variables
- 값이 올바르게 설정되었는지 확인

### 3. 테스트 배포
- Vercel에서 재배포 후
- 마이그레이션 스크립트 실행 (로컬 또는 Vercel Functions에서)

---

## 🔐 보안 주의사항

1. **Private Key 보호**
   - 절대 Git에 커밋하지 않음
   - `.env.local`은 `.gitignore`에 포함됨
   - JSON 키 파일도 Git에 커밋하지 않음

2. **Vercel 환경변수**
   - Production, Preview, Development 모두 설정
   - 민감한 정보이므로 접근 권한 제한

3. **키 파일 관리**
   - `cruisedot-478810-79ba5282a938.json` 파일은 안전한 곳에 보관
   - 필요시 삭제 가능 (환경변수에 이미 저장됨)

---

## 📚 관련 문서

- `GOOGLE_DRIVE_자동화_백업_문서.md`: 전체 환경변수 목록
- `VERCEL_환경변수_전체_목록.md`: Vercel 환경변수 가이드

---

**✅ 업데이트 완료 후 마이그레이션을 재시도하세요!**


