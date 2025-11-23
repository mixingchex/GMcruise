# 데이터베이스 마이그레이션 가이드

> **작성일**: 2025년 11월 20일

---

## ⚠️ 중요: 올바른 디렉토리에서 실행

Prisma 명령은 **반드시 프로젝트 루트 디렉토리**에서 실행해야 합니다.

```bash
# 올바른 방법
cd ~/projects/cruise-guide
npx prisma migrate dev

# 잘못된 방법 (에러 발생)
cd ~/projects
npx prisma migrate dev  # ❌ schema.prisma를 찾을 수 없음
```

---

## 현재 상태

**마이그레이션 상태**:
- 1개 마이그레이션 발견: `0_init`
- 상태: 미적용 (데이터베이스에 이미 스키마가 존재)

**데이터베이스**:
- PostgreSQL (Neon)
- 스키마가 이미 존재함

---

## 해결 방법

### 방법 1: 마이그레이션을 "적용됨"으로 표시 (권장)

데이터베이스에 이미 스키마가 있는 경우, 마이그레이션을 baseline으로 표시합니다:

```bash
cd ~/projects/cruise-guide
npx prisma migrate resolve --applied 0_init
```

이 명령은 마이그레이션을 "이미 적용됨"으로 표시하여 다음 마이그레이션부터 정상 작동하도록 합니다.

### 방법 2: 새 마이그레이션 생성 (스키마 변경 시)

스키마를 변경한 경우:

```bash
cd ~/projects/cruise-guide
npx prisma migrate dev --name your_migration_name
```

### 방법 3: 프로덕션 배포 (프로덕션 환경)

프로덕션 환경에서는:

```bash
cd ~/projects/cruise-guide
npx prisma migrate deploy
```

**주의**: 데이터베이스가 비어있지 않으면 baseline이 필요합니다.

---

## 명령어 요약

### 개발 환경

```bash
# 1. 프로젝트 디렉토리로 이동
cd ~/projects/cruise-guide

# 2. 마이그레이션 상태 확인
npx prisma migrate status

# 3. 기존 스키마가 있는 경우 baseline 설정
npx prisma migrate resolve --applied 0_init

# 4. 새 마이그레이션 생성 (스키마 변경 시)
npx prisma migrate dev --name migration_name
```

### 프로덕션 환경

```bash
# 1. 프로젝트 디렉토리로 이동
cd ~/projects/cruise-guide

# 2. 마이그레이션 적용
npx prisma migrate deploy

# 3. 기존 스키마가 있는 경우 baseline 설정
npx prisma migrate resolve --applied 0_init
```

---

## 에러 해결

### 에러: "Could not find Prisma Schema"

**원인**: 잘못된 디렉토리에서 실행

**해결**:
```bash
cd ~/projects/cruise-guide  # 올바른 디렉토리로 이동
npx prisma migrate dev
```

### 에러: "The database schema is not empty"

**원인**: 데이터베이스에 이미 스키마가 존재

**해결**:
```bash
npx prisma migrate resolve --applied 0_init
```

---

## 확인 방법

마이그레이션이 정상적으로 적용되었는지 확인:

```bash
cd ~/projects/cruise-guide
npx prisma migrate status
```

**예상 출력** (정상):
```
Database schema is up to date!
All migrations have been applied.
```

---

## 다음 단계

마이그레이션이 완료되면:

1. ✅ 데이터베이스 스키마 확인
2. ✅ 애플리케이션 실행 테스트
3. ✅ 배포 진행

---

**작성자**: AI Assistant  
**최종 업데이트**: 2025년 11월 20일


