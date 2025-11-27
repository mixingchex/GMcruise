# Neon Connection String 확인 방법

> **작성일**: 2025년 1월 28일  
> **데이터베이스**: cruisedot (Neon)

---

## 🔍 현재 화면에서 Connection String 확인

### 1단계: .env.local 탭 확인

현재 화면에서:
- **`.env.local` 탭**이 선택되어 있습니다
- 아래에 `DATABASE_URL=*************` (별표로 가려진 값)이 보입니다

### 2단계: Show secret 버튼 클릭

1. **`DATABASE_URL=*************` 옆의 눈 아이콘 클릭**
   - "Show secret" 버튼 (👁️ 아이콘)
   - 클릭하면 별표가 사라지고 실제 연결 문자열이 표시됩니다

2. **연결 문자열 확인**
   - `postgresql://...` 형식의 전체 연결 문자열이 표시됩니다
   - 예시: `postgresql://neondb_owner:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`

### 3단계: 연결 문자열 복사

**방법 A: Copy Snippet 버튼 사용 (권장)**
1. **"Copy Snippet" 버튼 클릭** (복사 아이콘 📋)
2. 전체 `.env.local` 내용이 클립보드에 복사됩니다
3. 필요한 부분만 추출하여 사용

**방법 B: 수동 복사**
1. **Show secret 버튼 클릭**하여 연결 문자열 표시
2. `DATABASE_URL=` 뒤의 값만 선택하여 복사
   - 예: `postgresql://neondb_owner:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`
3. 이 값만 복사 (앞의 `DATABASE_URL=`는 제외)

---

## 📋 .env.local 탭의 내용

현재 화면에 표시되는 내용:

```bash
# Recommended for most uses
DATABASE_URL=*************  # ← 이 값을 확인해야 함

# For uses requiring a connection without pgbouncer
DATABASE_URL_UNPOOLED=*************

# Parameters for constructing your own connection string
PGHOST=******
```

**중요**: 
- **`DATABASE_URL`**을 사용하세요 (대부분의 경우 권장)
- `DATABASE_URL_UNPOOLED`는 pgbouncer 없이 연결이 필요한 특수한 경우에만 사용

---

## ✅ Vercel 환경 변수에 추가

### 1단계: 연결 문자열 복사

1. **Show secret 버튼 클릭** (눈 아이콘 👁️)
2. `DATABASE_URL=` 뒤의 값 복사
   - 예: `postgresql://neondb_owner:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`

### 2단계: Vercel 환경 변수에 추가

1. **Vercel 대시보드 상단에서 "Settings" 탭 클릭**
   - 또는 왼쪽 사이드바에서 "Settings" 클릭

2. **"Environment Variables" 클릭**
   - 왼쪽 사이드바에서 "환경 변수" (Environment Variables) 클릭

3. **새 환경 변수 추가**
   - "새로 만들기" (Create New) 탭 선택
   - "열쇠" (Key): `DATABASE_URL`
   - "값" (Value): 복사한 연결 문자열 붙여넣기
   - "환경" (Environment): "모든 환경" 또는 "프로덕션" 선택
   - "구하다" (Save) 버튼 클릭

---

## 🔄 다른 탭에서도 확인 가능

### Connection String 탭 (있는 경우)

1. **Quickstart 섹션 아래의 다른 탭 확인**
   - "Connection String" 탭이 있을 수 있음
   - 클릭하면 연결 문자열이 표시됨

### Settings 탭

1. **"Settings" 탭 클릭**
2. **"Connection Details" 또는 "Database" 섹션 확인**
3. **Connection String 복사**

---

## 📝 체크리스트

- [ ] `.env.local` 탭에서 `DATABASE_URL=*************` 확인
- [ ] "Show secret" 버튼 (👁️) 클릭하여 연결 문자열 표시
- [ ] 연결 문자열 복사 (`postgresql://...` 형식)
- [ ] Vercel > Settings > Environment Variables 이동
- [ ] `DATABASE_URL` 환경 변수 추가 또는 업데이트
- [ ] 연결 문자열 붙여넣기
- [ ] Save 클릭
- [ ] 재배포 확인

---

## 💡 팁

### 연결 문자열 형식 확인

Neon의 연결 문자열은 다음과 같은 형식입니다:

```
postgresql://[user]:[password]@[host]/[database]?sslmode=require
```

**예시**:
```
postgresql://neondb_owner:abc123xyz@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### 두 가지 연결 문자열

1. **`DATABASE_URL`** (권장)
   - Connection pooling 사용 (pgbouncer)
   - 대부분의 경우 이걸 사용하세요

2. **`DATABASE_URL_UNPOOLED`**
   - Connection pooling 없음
   - 특수한 경우에만 사용

**Vercel 환경 변수에는 `DATABASE_URL`만 추가하면 됩니다.**

---

## ⚠️ 주의사항

- ✅ 연결 문자열에는 비밀번호가 포함되어 있습니다
- ✅ "Show secret" 버튼을 클릭해야 실제 값을 볼 수 있습니다
- ✅ 복사 후 환경 변수에 추가할 때는 `DATABASE_URL=` 부분은 제외하고 값만 붙여넣으세요

---

**작성자**: AI Assistant  
**상태**: Connection String 확인 방법 안내 완료




