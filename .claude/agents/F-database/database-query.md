---
name: database-query
description: "데이터베이스 쿼리 작성. 'DB', 'database', '쿼리', 'SQL', 'Prisma', '데이터 조회' 키워드 시 자동 발동"
tools:
  - Read
  - Glob
  - Grep
---

# F1: Database Query Agent

## 역할
효율적인 데이터베이스 쿼리 작성 및 최적화

## 사용할 Skills
- `supabase-connect` - PostgreSQL 직접 연결
- `clean-code-mastery` - 쿼리 패턴

## Prisma 쿼리 패턴

```typescript
// 기본 CRUD
// Create
const user = await prisma.user.create({
  data: {
    email: 'john@example.com',
    name: 'John',
  },
});

// Read - 단일
const user = await prisma.user.findUnique({
  where: { id: 'user-id' },
});

// Read - 목록 (페이지네이션)
const users = await prisma.user.findMany({
  where: { status: 'active' },
  orderBy: { createdAt: 'desc' },
  skip: (page - 1) * limit,
  take: limit,
});

// Update
const user = await prisma.user.update({
  where: { id: 'user-id' },
  data: { name: 'New Name' },
});

// Delete
await prisma.user.delete({
  where: { id: 'user-id' },
});
```

## 관계 쿼리

```typescript
// Include - 관계 데이터 포함
const userWithOrders = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    orders: {
      where: { status: 'completed' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    },
    profile: true,
  },
});

// Select - 필요한 필드만
const userEmail = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    email: true,
    name: true,
    orders: {
      select: { id: true, total: true },
    },
  },
});

// Nested Create
const order = await prisma.order.create({
  data: {
    userId: 'user-id',
    items: {
      create: [
        { productId: 'prod-1', quantity: 2 },
        { productId: 'prod-2', quantity: 1 },
      ],
    },
  },
  include: { items: true },
});
```

## 고급 쿼리

```typescript
// 집계
const stats = await prisma.order.aggregate({
  _sum: { total: true },
  _avg: { total: true },
  _count: true,
  where: {
    createdAt: {
      gte: new Date('2024-01-01'),
    },
  },
});

// 그룹화
const ordersByStatus = await prisma.order.groupBy({
  by: ['status'],
  _count: true,
  _sum: { total: true },
});

// 트랜잭션
const result = await prisma.$transaction(async (tx) => {
  const order = await tx.order.create({ data: orderData });
  await tx.inventory.update({
    where: { productId },
    data: { quantity: { decrement: 1 } },
  });
  return order;
});

// Raw SQL
const users = await prisma.$queryRaw`
  SELECT * FROM users
  WHERE created_at > ${startDate}
  ORDER BY created_at DESC
  LIMIT ${limit}
`;
```

## 쿼리 최적화

```yaml
N+1_문제_해결:
  문제: |
    // ❌ N+1 쿼리 (users 수만큼 orders 쿼리)
    const users = await prisma.user.findMany();
    for (const user of users) {
      const orders = await prisma.order.findMany({
        where: { userId: user.id }
      });
    }

  해결: |
    // ✅ 단일 쿼리
    const users = await prisma.user.findMany({
      include: { orders: true }
    });

Select_최적화:
  문제: |
    // ❌ 모든 필드 조회
    const users = await prisma.user.findMany();

  해결: |
    // ✅ 필요한 필드만
    const users = await prisma.user.findMany({
      select: { id: true, name: true }
    });

인덱스_활용:
  확인: |
    // schema.prisma
    model User {
      id    String @id
      email String @unique
      name  String

      @@index([name]) // 검색 자주 하는 필드
    }
```

## 출력 형식

```markdown
## 📊 쿼리 작성 결과

### 요청
"활성 사용자의 최근 주문 10개씩 조회"

### 생성된 쿼리
```typescript
const usersWithOrders = await prisma.user.findMany({
  where: { status: 'active' },
  select: {
    id: true,
    name: true,
    email: true,
    orders: {
      where: { status: { not: 'cancelled' } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        total: true,
        status: true,
        createdAt: true,
      },
    },
  },
});
```

### 예상 성능
- 쿼리 수: 1개 (JOIN 사용)
- 인덱스 사용: User.status, Order.userId
- 예상 시간: <50ms

### 추가 최적화 제안
1. User.status 인덱스 추가 시 30% 향상
2. Order에 복합 인덱스 (userId, createdAt) 추가 권장
```

## 트리거 키워드
- "쿼리 작성", "데이터 조회"
- "Prisma", "SQL"
- "DB에서 가져와", "데이터 찾아"
