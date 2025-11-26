# Neon DATABASE_URL 확인 가이드

> **작성일**: 2025년 1월 28일  
> **데이터베이스**: cruisedot (Neon - Free)

---

## ✅ 현재 상태

- **데이터베이스 이름**: `cruisedot`
- **제공자**: Neon
- **플랜**: Free
- **생성일**: 2024년 11월 11일

---

## 🔍 DATABASE_URL 확인 방법

### 방법 1: Vercel Storage에서 확인 (가장 쉬움)

1. **Storage 페이지에서 `cruisedot` 데이터베이스 클릭**
   - 현재 Storage 페이지에서 `cruisedot` (Neon - Free) 클릭

2. **Connection Details 또는 Settings 탭 확인**
   - 연결 문자열이 표시되는 페이지로 이동

3. **Connection String 복사**
   - `postgresql://...` 형식의 연결 문자열 복사

4. **환경 변수에 추가**
   - Settings > Environment Variables로 이동
   - Key: `DATABASE_URL`
   - Value: 복사한 연결 문자열
   - Save 클릭

---

### 방법 2: Neon 대시보드에서 확인

1. **Neon 대시보드 접속**
   - https://console.neon.tech 접속
   - 또는 Vercel에서 `cruisedot` 데이터베이스 클릭 후 "Open in Neon" 버튼 클릭

2. **프로젝트 선택**
   - `cruisedot` 프로젝트 선택

3. **Connection Details 확인**
   - 왼쪽 사이드바에서 "Connection Details" 또는 "Settings" 클릭
   - Connection string 복사

4. **환경 변수에 추가**
   - Vercel > Settings > Environment Variables로 이동
   - Key: `DATABASE_URL`
   - Value: 복사한 연결 문자열
   - Save 클릭

---

## 📋 DATABASE_URL 형식 (Neon)

Neon의 연결 문자열 형식:

```
postgresql://[user]:[password]@[host]/[database]?sslmode=require
```

또는

```
postgresql://[user]:[password]@[host]/[database]?sslmode=require&pgbouncer=true
```

**예시**:
```
postgresql://neondb_owner:password123@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```

---

## 🔧 Vercel에서 바로 확인하는 방법

### Storage 페이지에서

1. **`cruisedot` 데이터베이스 클릭**
   - Storage 페이지에서 `cruisedot` (Neon - Free) 클릭

2. **Connection String 또는 Settings 확인**
   - 데이터베이스 상세 페이지에서 연결 문자열 확인
   - "Copy Connection String" 버튼이 있을 수 있음

3. **환경 변수에 자동 추가 확인**
   - Vercel Postgres가 아닌 Neon의 경우, 자동으로 환경 변수가 추가되지 않을 수 있음
   - 수동으로 환경 변수에 추가 필요

---

## ✅ 환경 변수 추가 단계

### 1단계: DATABASE_URL 복사

Storage 페이지에서 `cruisedot` 클릭 → Connection String 복사

### 2단계: 환경 변수에 추가

1. **Settings > Environment Variables 이동**
   - Vercel 대시보드 왼쪽 사이드바에서 "Settings" 클릭
   - "환경 변수" (Environment Variables) 클릭

2. **새 환경 변수 추가**
   - "새로 만들기" (Create New) 탭 선택
   - "열쇠" (Key): `DATABASE_URL`
   - "값" (Value): 복사한 연결 문자열 붙여넣기
   - "환경" (Environment): "모든 환경" 또는 "프로덕션" 선택
   - "구하다" (Save) 버튼 클릭

---

## 🧪 연결 테스트

### 환경 변수 추가 후 테스트

```bash
curl https://www.cruisedot.co.kr/api/public/products?limit=1
```

**성공 시**: 상품 목록이 반환됩니다.  
**실패 시**: 에러 메시지가 반환됩니다.

---

## ⚠️ 주의사항

### 연결 문자열 보안

- ✅ 연결 문자열에는 비밀번호가 포함되어 있습니다
- ✅ 절대 코드에 하드코딩하지 마세요
- ✅ 환경 변수로만 사용하세요
- ✅ GitHub에 커밋하지 마세요

### Neon Free 플랜 제한

- **연결 제한**: 동시 연결 수 제한
- **스토리지**: 제한된 스토리지 용량
- **백업**: 자동 백업 제공

---

## 📝 체크리스트

- [ ] Storage 페이지에서 `cruisedot` 데이터베이스 클릭
- [ ] Connection String 복사
- [ ] Settings > Environment Variables 이동
- [ ] `DATABASE_URL` 환경 변수 추가
- [ ] 연결 문자열 붙여넣기
- [ ] Save 클릭
- [ ] 재배포 확인
- [ ] API 테스트 성공

---

## 🔄 다음 단계

1. **DATABASE_URL 환경 변수 추가 완료**
2. **YOUTUBE_API_KEY 환경 변수 추가** (이미 가이드 제공됨)
3. **재배포 확인**
4. **API 테스트**

---

**작성자**: AI Assistant  
**상태**: Neon DATABASE_URL 확인 가이드 작성 완료



