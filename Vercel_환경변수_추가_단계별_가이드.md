# Vercel 환경 변수 추가 단계별 가이드

> **작성일**: 2025년 1월 28일  
> **페이지**: Vercel > Settings > Environment Variables

---

## 📋 추가할 환경 변수

1. **YOUTUBE_API_KEY**: `AIzaSyDscvNSjhrahZDH5JXxEpBpk0xBWlybCsM`
2. **DATABASE_URL**: (데이터베이스 연결 문자열 - 확인 필요)

---

## 🔧 단계별 설정 방법

### 1단계: YOUTUBE_API_KEY 추가

1. **"열쇠" (Key) 입력 필드에 입력**
   ```
   YOUTUBE_API_KEY
   ```

2. **"값" (Value) 입력 필드에 입력**
   ```
   AIzaSyDscvNSjhrahZDH5JXxEpBpk0xBWlybCsM
   ```

3. **"환경" (Environment) 드롭다운 확인**
   - 현재 "모든 환경" (All Environments)로 설정되어 있음
   - 이대로 두면 Production, Preview, Development 모두에 적용됨
   - 또는 "프로덕션" (Production)만 선택 가능

4. **"구하다" (Save) 버튼 클릭**

---

### 2단계: DATABASE_URL 추가

**⚠️ 중요**: DATABASE_URL은 먼저 데이터베이스를 생성하거나 기존 연결 문자열을 확인해야 합니다.

#### 옵션 A: Vercel Postgres 사용 (권장)

1. **Vercel 대시보드** > **Storage** 탭 이동
2. **Create Database** 클릭
3. **Postgres** 선택
4. **Create** 클릭
5. 자동으로 `DATABASE_URL` 환경 변수가 추가됩니다.

#### 옵션 B: 수동으로 추가

1. **"다른 것을 추가하세요" (Add another) 버튼 클릭**
   - 또는 새로 추가하려면 페이지를 새로고침하고 다시 "새로 만들기" 탭 선택

2. **"열쇠" (Key) 입력 필드에 입력**
   ```
   DATABASE_URL
   ```

3. **"값" (Value) 입력 필드에 입력**
   ```
   postgresql://사용자명:비밀번호@호스트:포트/데이터베이스명?sslmode=require
   ```
   - 실제 데이터베이스 연결 문자열로 교체 필요

4. **"환경" (Environment) 드롭다운 확인**
   - "모든 환경" (All Environments) 또는 "프로덕션" (Production) 선택

5. **"구하다" (Save) 버튼 클릭**

---

## 📝 현재 화면에서 바로 할 수 있는 것

### YOUTUBE_API_KEY 추가 (지금 바로 가능)

1. **"열쇠" (Key) 필드에 입력**: `YOUTUBE_API_KEY`
2. **"값" (Value) 필드에 입력**: `AIzaSyDscvNSjhrahZDH5JXxEpBpk0xBWlybCsM`
3. **"환경" 드롭다운**: "모든 환경" 또는 "프로덕션" 선택
4. **"구하다" (Save) 버튼 클릭**

---

## ⚠️ DATABASE_URL은 먼저 확인 필요

DATABASE_URL을 추가하려면:

1. **기존 데이터베이스가 있는지 확인**
   - Vercel Storage에서 Postgres 데이터베이스 확인
   - 또는 Supabase, Neon 등 다른 제공자에서 연결 문자열 확인

2. **없으면 데이터베이스 생성**
   - Vercel Postgres 권장 (자동으로 환경 변수 추가됨)
   - 또는 Supabase/Neon에서 생성 후 연결 문자열 복사

3. **환경 변수에 추가**
   - 위의 "옵션 B: 수동으로 추가" 방법 참고

---

## ✅ 저장 후 확인

### 환경 변수 추가 확인

1. **저장 후 목록에서 확인**
   - 아래 "Existing Environment Variables List"에서 확인
   - `YOUTUBE_API_KEY`와 `DATABASE_URL`이 표시되는지 확인

2. **재배포 확인**
   - 환경 변수 변경 후 자동으로 재배포됩니다
   - 또는 수동으로 재배포할 수 있습니다:
     - **Deployments** 탭 이동
     - 최신 배포 옆 **⋯** 메뉴 클릭
     - **Redeploy** 선택

---

## 🧪 테스트 방법

### YOUTUBE_API_KEY 테스트
```bash
curl https://www.cruisedot.co.kr/api/public/youtube?maxResults=6
```

**성공 시**: 유튜브 영상 목록이 반환됩니다.

### DATABASE_URL 테스트
```bash
curl https://www.cruisedot.co.kr/api/public/products?limit=1
```

**성공 시**: 상품 목록이 반환됩니다.

---

## 📋 체크리스트

- [ ] YOUTUBE_API_KEY 환경 변수 추가 완료
- [ ] DATABASE_URL 확인 또는 생성 완료
- [ ] DATABASE_URL 환경 변수 추가 완료
- [ ] 환경 변수 저장 완료
- [ ] 재배포 완료
- [ ] API 테스트 성공

---

## 💡 팁

### 여러 환경 변수를 한 번에 추가하려면

1. **".env 가져오기" (Import .env) 섹션 사용**
   - `.env` 파일 내용을 복사하여 붙여넣기
   - 또는 `.env` 파일을 업로드

2. **"다른 것을 추가하세요" (Add another) 버튼 사용**
   - 각 환경 변수를 하나씩 추가

---

## 🔒 보안 주의사항

- ✅ 환경 변수는 저장 후 값이 마스킹됩니다 (보안)
- ✅ "예민한" (Sensitive) 옵션을 활성화하면 저장 후 값을 읽을 수 없습니다
- ✅ 환경 변수는 절대 코드에 하드코딩하지 마세요

---

**작성자**: AI Assistant  
**상태**: 단계별 가이드 작성 완료

