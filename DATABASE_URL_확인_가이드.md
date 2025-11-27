# DATABASE_URL 확인 가이드

> **작성일**: 2025년 1월 28일  
> **데이터베이스**: PostgreSQL

---

## 🔍 DATABASE_URL이란?

`DATABASE_URL`은 Prisma가 데이터베이스에 연결하기 위해 사용하는 연결 문자열입니다.

프로젝트는 **PostgreSQL** 데이터베이스를 사용합니다.

---

## 📋 DATABASE_URL 형식

```
postgresql://사용자명:비밀번호@호스트:포트/데이터베이스명?sslmode=require
```

### 예시
```
postgresql://user:password@db.example.com:5432/cruisedot?sslmode=require
```

---

## 🔎 DATABASE_URL 확인 방법

### 1. Vercel 대시보드에서 확인 (프로덕션)

1. **Vercel 대시보드 접속**
   - https://vercel.com/dashboard

2. **프로젝트 선택**
   - `cruise-guide` 프로젝트 클릭

3. **Settings > Environment Variables 이동**

4. **DATABASE_URL 찾기**
   - 환경 변수 목록에서 `DATABASE_URL` 찾기
   - 값이 설정되어 있는지 확인

---

### 2. 로컬 개발 환경에서 확인

로컬에서 개발하는 경우:

1. **프로젝트 루트 디렉토리 확인**
   ```bash
   cd /home/userhyeseon28/projects/cruise-guide
   ```

2. **환경 변수 파일 확인**
   - `.env` 파일
   - `.env.local` 파일
   - `.env.development` 파일

3. **파일 내용 확인**
   ```bash
   cat .env.local
   # 또는
   cat .env
   ```

---

## 🗄️ 데이터베이스 제공자 확인

DATABASE_URL은 다음 중 하나의 데이터베이스 제공자에서 가져올 수 있습니다:

### 1. Supabase
- **확인 방법**: Supabase 대시보드 > Project Settings > Database > Connection string
- **URL 형식**: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`

### 2. Neon
- **확인 방법**: Neon 대시보드 > Connection Details
- **URL 형식**: `postgresql://[USER]:[PASSWORD]@[HOST]/[DATABASE]?sslmode=require`

### 3. PlanetScale
- **확인 방법**: PlanetScale 대시보드 > Connect
- **참고**: PlanetScale은 MySQL을 사용하므로 PostgreSQL과 호환되지 않을 수 있습니다.

### 4. 자체 PostgreSQL 서버
- **확인 방법**: 서버 관리자에게 문의
- **URL 형식**: `postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]`

### 5. Vercel Postgres
- **확인 방법**: Vercel 대시보드 > Storage > Postgres
- **자동 설정**: Vercel Postgres를 사용하면 자동으로 환경 변수에 추가됩니다.

---

## ⚠️ DATABASE_URL이 없는 경우

### 문제 증상
- API가 로딩 중에 멈춤
- 데이터베이스 연결 오류 발생
- 상품 목록, 커뮤니티 게시글 등이 로드되지 않음

### 해결 방법

#### 1. Vercel Postgres 사용 (권장)

1. **Vercel 대시보드** > **Storage** 탭
2. **Create Database** 클릭
3. **Postgres** 선택
4. **Create** 클릭
5. 자동으로 `DATABASE_URL` 환경 변수가 추가됩니다.

#### 2. Supabase 사용

1. **Supabase 대시보드** 접속
2. **새 프로젝트 생성** 또는 **기존 프로젝트 선택**
3. **Project Settings** > **Database** > **Connection string** 복사
4. **Vercel 환경 변수에 추가**:
   - Key: `DATABASE_URL`
   - Value: 복사한 연결 문자열
   - Environment: `Production` (또는 `All`)

#### 3. Neon 사용

1. **Neon 대시보드** 접속
2. **새 프로젝트 생성** 또는 **기존 프로젝트 선택**
3. **Connection Details**에서 연결 문자열 복사
4. **Vercel 환경 변수에 추가**:
   - Key: `DATABASE_URL`
   - Value: 복사한 연결 문자열
   - Environment: `Production` (또는 `All`)

---

## 🧪 DATABASE_URL 테스트

### Vercel에서 테스트

배포 후 다음 API를 호출하여 데이터베이스 연결을 테스트할 수 있습니다:

```bash
curl https://www.cruisedot.co.kr/api/public/products?limit=1
```

**성공 시**: 상품 목록이 반환됩니다.  
**실패 시**: 에러 메시지가 반환됩니다.

---

## 📝 환경 변수 설정 체크리스트

- [ ] Vercel 대시보드에서 `DATABASE_URL` 확인
- [ ] `DATABASE_URL`이 올바른 형식인지 확인
- [ ] 데이터베이스 제공자 확인 (Supabase, Neon, Vercel Postgres 등)
- [ ] 데이터베이스 연결 테스트 성공
- [ ] 상품 목록 API 테스트 성공
- [ ] 커뮤니티 게시글 API 테스트 성공

---

## 🔒 보안 주의사항

**절대 다음을 하지 마세요:**
- ❌ DATABASE_URL을 코드에 하드코딩
- ❌ DATABASE_URL을 GitHub에 커밋
- ❌ DATABASE_URL을 공개 문서에 노출

**올바른 방법:**
- ✅ 환경 변수로만 사용
- ✅ Vercel 환경 변수에 설정
- ✅ `.env.local` 파일에만 저장 (로컬 개발용, Git에 커밋하지 않음)

---

## 📚 참고 자료

- [Prisma 데이터베이스 연결 가이드](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [Vercel Postgres 문서](https://vercel.com/docs/storage/vercel-postgres)
- [Supabase 연결 가이드](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Neon 연결 가이드](https://neon.tech/docs/connect/connect-from-any-app)

---

## ✅ 요약

1. **DATABASE_URL 확인**: Vercel 대시보드 > Settings > Environment Variables
2. **없는 경우**: Vercel Postgres, Supabase, 또는 Neon에서 데이터베이스 생성
3. **설정 후**: 재배포하고 API 테스트

---

**작성자**: AI Assistant  
**상태**: 가이드 작성 완료




