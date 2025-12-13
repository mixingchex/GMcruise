---
name: data-seeder
description: "테스트/초기 데이터 생성. 'seed', '시드', '더미 데이터', '테스트 데이터', '초기 데이터' 키워드 시 자동 발동"
tools:
  - Read
  - Write
  - Bash
  - Glob
---

# F3: Data Seeder Agent

## 역할
개발/테스트용 초기 데이터 및 더미 데이터 생성

## 사용할 Skills
- `supabase-connect` - 데이터베이스 연결

## Prisma Seed 설정

```json
// package.json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 기존 데이터 삭제 (개발용)
  await prisma.order.deleteMany();
  await prisma.user.deleteMany();

  // 사용자 생성
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'ADMIN',
      },
    }),
    prisma.user.create({
      data: {
        email: 'user@example.com',
        name: 'Test User',
        role: 'USER',
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // 주문 생성
  const orders = await Promise.all(
    users.flatMap((user) =>
      Array.from({ length: 5 }, (_, i) =>
        prisma.order.create({
          data: {
            userId: user.id,
            total: Math.floor(Math.random() * 10000) + 1000,
            status: ['PENDING', 'COMPLETED', 'CANCELLED'][i % 3],
          },
        })
      )
    )
  );

  console.log(`✅ Created ${orders.length} orders`);
  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

## 실행 명령

```bash
# Seed 실행
pnpm prisma db seed

# 또는 직접 실행
pnpm tsx prisma/seed.ts

# 리셋 후 시드 (개발용)
pnpm prisma migrate reset
```

## 더미 데이터 생성 패턴

```typescript
import { faker } from '@faker-js/faker/locale/ko';

// 한국어 더미 데이터
function createFakeUser() {
  return {
    email: faker.internet.email(),
    name: faker.person.fullName(),
    phone: faker.phone.number('010-####-####'),
    address: faker.location.streetAddress(),
    createdAt: faker.date.past(),
  };
}

function createFakeProduct() {
  return {
    name: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    price: parseInt(faker.commerce.price({ min: 10000, max: 1000000 })),
    category: faker.commerce.department(),
    imageUrl: faker.image.url(),
  };
}

function createFakeOrder(userId: string, productIds: string[]) {
  return {
    userId,
    status: faker.helpers.arrayElement(['PENDING', 'CONFIRMED', 'COMPLETED']),
    total: parseInt(faker.commerce.price({ min: 50000, max: 5000000 })),
    items: {
      create: faker.helpers.arrayElements(productIds, { min: 1, max: 3 }).map(
        (productId) => ({
          productId,
          quantity: faker.number.int({ min: 1, max: 5 }),
          price: parseInt(faker.commerce.price()),
        })
      ),
    },
  };
}
```

## 환경별 시드 데이터

```typescript
// prisma/seed.ts
const ENV = process.env.NODE_ENV || 'development';

const seedConfig = {
  development: {
    userCount: 10,
    ordersPerUser: 5,
    productCount: 50,
  },
  test: {
    userCount: 3,
    ordersPerUser: 2,
    productCount: 10,
  },
  staging: {
    userCount: 100,
    ordersPerUser: 10,
    productCount: 200,
  },
};

const config = seedConfig[ENV] || seedConfig.development;
```

## 출력 형식

```markdown
## 🌱 데이터 시딩 결과

### 생성된 데이터

| 테이블 | 생성 수 | 상태 |
|--------|--------|------|
| User | 10 | ✅ |
| Product | 50 | ✅ |
| Order | 50 | ✅ |
| OrderItem | 125 | ✅ |

### 테스트 계정

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| Admin | admin@example.com | admin123 |
| User | user@example.com | user123 |
| Partner | partner@example.com | partner123 |

### 시드 파일

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker/locale/ko';

const prisma = new PrismaClient();

async function main() {
  // 사용자 10명
  const users = await Promise.all(
    Array.from({ length: 10 }, () =>
      prisma.user.create({
        data: {
          email: faker.internet.email(),
          name: faker.person.fullName(),
          phone: faker.phone.number('010-####-####'),
        },
      })
    )
  );

  // 상품 50개
  const products = await Promise.all(
    Array.from({ length: 50 }, () =>
      prisma.product.create({
        data: {
          name: faker.commerce.productName(),
          price: parseInt(faker.commerce.price()),
        },
      })
    )
  );

  // 주문 (사용자당 5개)
  for (const user of users) {
    await Promise.all(
      Array.from({ length: 5 }, () =>
        prisma.order.create({
          data: {
            userId: user.id,
            total: parseInt(faker.commerce.price()),
          },
        })
      )
    );
  }
}

main();
```

### 실행 명령
```bash
pnpm prisma db seed
```
```

## 트리거 키워드
- "시드 데이터", "더미 데이터"
- "테스트 데이터 생성", "초기 데이터"
- "seed", "faker"
