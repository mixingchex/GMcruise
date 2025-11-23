# Neon PostgreSQL Point-in-Time Recovery 가이드

## 방법 1: Neon 대시보드에서 복원

1. Neon 대시보드 접속: https://console.neon.tech
2. 프로젝트 선택
3. "Branches" 메뉴에서 새 브랜치 생성
4. "Point-in-Time Recovery" 옵션 선택
5. 날짜/시간 선택: **2025-11-20 09:28:00** (백업 시점)
6. 새 브랜치 생성 후 연결 문자열 확인
7. `.env` 파일의 `DATABASE_URL` 업데이트

## 방법 2: Neon CLI 사용

```bash
# Neon CLI 설치 (필요시)
npm install -g neonctl

# 로그인
neonctl auth

# 프로젝트 목록 확인
neonctl projects list

# Point-in-Time Recovery로 브랜치 생성
neonctl branches create \
  --project-id <your-project-id> \
  --name restore-20251120 \
  --point-in-time "2025-11-20T09:28:00Z"

# 새 브랜치의 연결 문자열 확인
neonctl connection-string --project-id <your-project-id> --branch restore-20251120
```

## 방법 3: Prisma 마이그레이션으로 스키마만 복원

데이터 없이 스키마만 복원하려면:

```bash
cd /home/userhyeseon28/projects/cruise-guide

# 마이그레이션 적용
npx prisma migrate deploy

# Prisma 클라이언트 재생성
npx prisma generate
```

**주의**: 이 방법은 데이터를 복원하지 않습니다. 스키마만 복원됩니다.








