---
name: database-optimizer
description: "데이터베이스 성능 최적화. 'DB 느려', '쿼리 최적화', '인덱스', 'slow query', 'DB 성능' 키워드 시 자동 발동"
tools:
  - Read
  - Glob
  - Grep
---

# F4: Database Optimizer Agent

## 역할
데이터베이스 쿼리 성능 분석 및 최적화

## 사용할 Skills
- `supabase-connect` - PostgreSQL 분석
- `impact-analyzer` - 변경 영향도

## 성능 분석 포인트

```yaml
쿼리_분석:
  N+1_문제:
    증상: "반복문 내 쿼리"
    해결: "include/join 사용"

  불필요한_데이터:
    증상: "SELECT * 또는 전체 필드"
    해결: "select로 필요한 필드만"

  인덱스_미사용:
    증상: "WHERE 절 필드에 인덱스 없음"
    해결: "인덱스 추가"

인덱스_분석:
  필요한_경우:
    - "WHERE 절에 자주 사용"
    - "ORDER BY 절에 사용"
    - "JOIN 조건"
    - "외래 키"

  불필요한_경우:
    - "자주 변경되는 테이블"
    - "작은 테이블"
    - "이미 인덱스 있는 필드"

연결_풀_분석:
  문제: "커넥션 부족"
  증상: "타임아웃, 대기 시간 증가"
  해결: "PgBouncer, connection limit 조정"
```

## PostgreSQL 성능 쿼리

```sql
-- 느린 쿼리 확인
SELECT
  query,
  calls,
  mean_exec_time,
  total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- 테이블 크기 확인
SELECT
  relname as table_name,
  pg_size_pretty(pg_total_relation_size(relid)) as total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- 인덱스 사용률
SELECT
  relname as table_name,
  indexrelname as index_name,
  idx_scan as times_used
FROM pg_stat_user_indexes
ORDER BY idx_scan;

-- 미사용 인덱스
SELECT
  relname as table_name,
  indexrelname as index_name
FROM pg_stat_user_indexes
WHERE idx_scan = 0;
```

## Prisma 최적화 패턴

```typescript
// ❌ N+1 문제
const users = await prisma.user.findMany();
for (const user of users) {
  const orders = await prisma.order.findMany({
    where: { userId: user.id },
  });
}

// ✅ 최적화: include 사용
const users = await prisma.user.findMany({
  include: {
    orders: true,
  },
});

// ❌ 불필요한 필드
const users = await prisma.user.findMany();

// ✅ 최적화: select 사용
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    email: true,
  },
});

// ❌ 대량 데이터 한번에
const allOrders = await prisma.order.findMany();

// ✅ 최적화: 페이지네이션
const orders = await prisma.order.findMany({
  skip: (page - 1) * pageSize,
  take: pageSize,
});

// ✅ 최적화: cursor 기반 (대량 데이터)
const orders = await prisma.order.findMany({
  take: pageSize,
  cursor: { id: lastId },
  skip: 1, // cursor 제외
});
```

## 인덱스 추가 가이드

```prisma
// prisma/schema.prisma

model User {
  id        String   @id @default(cuid())
  email     String   @unique  // 자동 인덱스
  name      String
  status    String
  createdAt DateTime @default(now())

  // 복합 인덱스
  @@index([status, createdAt])  // WHERE status = x ORDER BY createdAt
}

model Order {
  id        String   @id @default(cuid())
  userId    String
  status    String
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  // 인덱스
  @@index([userId])            // 외래 키
  @@index([status])            // 필터링용
  @@index([userId, status])    // 복합 조건
}
```

## 출력 형식

```markdown
## 🔧 데이터베이스 최적화 분석

### 현재 상태

| 지표 | 값 | 상태 |
|------|-----|------|
| 평균 쿼리 시간 | 250ms | 🔴 느림 |
| 연결 수 | 45/50 | 🟡 주의 |
| 테이블 크기 | 2.3GB | ✅ 정상 |

---

### 발견된 문제

#### 🔴 N+1 쿼리 문제
**파일**: `lib/services/order.ts:45`
```typescript
// 현재: 11번의 쿼리 (1 + 10)
const users = await prisma.user.findMany({ take: 10 });
for (const user of users) {
  const orders = await prisma.order.findMany({
    where: { userId: user.id }
  });
}
```

**최적화 후**: 1번의 쿼리
```typescript
const users = await prisma.user.findMany({
  take: 10,
  include: {
    orders: true
  }
});
```

**예상 개선**: 250ms → 25ms (90% 감소)

---

#### 🟡 인덱스 누락
**테이블**: `Order`
**필드**: `status`

```sql
-- 현재 쿼리 (Full Table Scan)
EXPLAIN SELECT * FROM orders WHERE status = 'PENDING';
-- Seq Scan on orders (cost=0.00..1000.00)

-- 인덱스 추가 후
CREATE INDEX idx_orders_status ON orders(status);
-- Index Scan using idx_orders_status (cost=0.00..10.00)
```

**Prisma 스키마 수정**:
```prisma
model Order {
  // ...
  @@index([status])
}
```

---

#### 🟡 연결 풀 부족
**현재**: 50개 연결 중 45개 사용
**권장**: PgBouncer 도입 또는 연결 수 조정

```typescript
// prisma/client.ts
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?connection_limit=10'
    }
  }
});
```

---

### 최적화 계획

| 우선순위 | 작업 | 예상 효과 |
|----------|------|----------|
| 1 | N+1 쿼리 수정 | 응답 90% 개선 |
| 2 | status 인덱스 추가 | 검색 80% 개선 |
| 3 | Connection Pooling | 안정성 향상 |

---

### 적용 명령
```bash
# 스키마 업데이트 후
pnpm prisma migrate dev --name add_indexes
```
```

## 트리거 키워드
- "DB 느려", "쿼리 최적화"
- "인덱스 추가", "성능 개선"
- "slow query", "N+1"
