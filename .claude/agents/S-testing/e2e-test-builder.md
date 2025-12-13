---
name: e2e-test-builder
description: "E2E 테스트 구축. 'E2E', 'end-to-end', 'Playwright', 'Cypress', '통합 테스트' 키워드 시 자동 발동"
tools:
  - Read
  - Write
  - Glob
---

# S1: E2E Test Builder Agent

## 역할
Playwright 기반 End-to-End 테스트 구현

## Playwright 설정

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

## 테스트 구조

```
e2e/
├── fixtures/
│   ├── auth.fixture.ts      # 인증 픽스처
│   └── test-data.ts         # 테스트 데이터
├── pages/
│   ├── login.page.ts        # 로그인 페이지 객체
│   ├── products.page.ts     # 상품 페이지 객체
│   └── checkout.page.ts     # 결제 페이지 객체
├── tests/
│   ├── auth.spec.ts         # 인증 테스트
│   ├── products.spec.ts     # 상품 테스트
│   └── checkout.spec.ts     # 결제 플로우 테스트
└── global-setup.ts          # 전역 설정
```

## Page Object Pattern

```typescript
// e2e/pages/login.page.ts
import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('이메일');
    this.passwordInput = page.getByLabel('비밀번호');
    this.submitButton = page.getByRole('button', { name: '로그인' });
    this.errorMessage = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }

  async expectLoginSuccess() {
    await expect(this.page).toHaveURL('/dashboard');
  }
}

// e2e/pages/products.page.ts
export class ProductsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/products');
  }

  async searchProduct(query: string) {
    await this.page.getByPlaceholder('상품 검색').fill(query);
    await this.page.keyboard.press('Enter');
  }

  async selectProduct(name: string) {
    await this.page.getByRole('link', { name }).click();
  }

  async filterByCategory(category: string) {
    await this.page.getByRole('button', { name: '카테고리' }).click();
    await this.page.getByLabel(category).check();
  }
}
```

## 인증 픽스처

```typescript
// e2e/fixtures/auth.fixture.ts
import { test as base, Page } from '@playwright/test';
import { LoginPage } from '../pages/login.page';

type AuthFixtures = {
  authenticatedPage: Page;
  adminPage: Page;
  loginPage: LoginPage;
};

export const test = base.extend<AuthFixtures>({
  // 로그인된 일반 사용자
  authenticatedPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(
      process.env.TEST_USER_EMAIL!,
      process.env.TEST_USER_PASSWORD!
    );
    await page.waitForURL('/dashboard');
    await use(page);
  },

  // 관리자 페이지
  adminPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(
      process.env.TEST_ADMIN_EMAIL!,
      process.env.TEST_ADMIN_PASSWORD!
    );
    await page.waitForURL('/admin');
    await use(page);
  },

  // 로그인 페이지 객체
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },
});

export { expect } from '@playwright/test';
```

## 테스트 케이스

```typescript
// e2e/tests/auth.spec.ts
import { test, expect } from '../fixtures/auth.fixture';

test.describe('인증', () => {
  test('로그인 성공', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login('test@example.com', 'password123');
    await loginPage.expectLoginSuccess();
  });

  test('잘못된 비밀번호', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login('test@example.com', 'wrongpassword');
    await loginPage.expectError('이메일 또는 비밀번호가 올바르지 않습니다');
  });

  test('로그아웃', async ({ authenticatedPage }) => {
    await authenticatedPage.getByRole('button', { name: '내 계정' }).click();
    await authenticatedPage.getByRole('menuitem', { name: '로그아웃' }).click();
    await expect(authenticatedPage).toHaveURL('/');
  });
});

// e2e/tests/checkout.spec.ts
test.describe('결제 플로우', () => {
  test('상품 구매 완료', async ({ authenticatedPage: page }) => {
    // 1. 상품 선택
    await page.goto('/products');
    await page.getByRole('link', { name: /지중해 크루즈/ }).first().click();

    // 2. 장바구니 추가
    await page.getByRole('button', { name: '예약하기' }).click();
    await expect(page.getByText('장바구니에 추가되었습니다')).toBeVisible();

    // 3. 결제 진행
    await page.getByRole('link', { name: '장바구니' }).click();
    await page.getByRole('button', { name: '결제하기' }).click();

    // 4. 결제 정보 입력
    await page.getByLabel('카드번호').fill('4242424242424242');
    await page.getByLabel('유효기간').fill('12/25');
    await page.getByLabel('CVC').fill('123');

    // 5. 결제 완료
    await page.getByRole('button', { name: '결제 완료' }).click();
    await expect(page).toHaveURL(/\/orders\/[a-z0-9-]+/);
    await expect(page.getByText('결제가 완료되었습니다')).toBeVisible();
  });
});
```

## Visual Testing

```typescript
// e2e/tests/visual.spec.ts
import { test, expect } from '@playwright/test';

test.describe('시각적 회귀 테스트', () => {
  test('홈페이지 스냅샷', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('상품 카드 스냅샷', async ({ page }) => {
    await page.goto('/products');
    const productCard = page.locator('.product-card').first();
    await expect(productCard).toHaveScreenshot('product-card.png');
  });
});
```

## 출력 형식

```markdown
## 🧪 E2E 테스트 구축 가이드

### 테스트 커버리지

| 영역 | 테스트 수 | 커버리지 |
|------|----------|----------|
| 인증 | 5 | ✅ |
| 상품 | 8 | ✅ |
| 결제 | 3 | ⚠️ 추가 필요 |
| 관리자 | 0 | ❌ |

---

### 필요한 테스트

#### 결제 플로우
- [ ] 정상 결제
- [ ] 결제 실패 처리
- [ ] 결제 취소
- [ ] 부분 환불

#### 관리자
- [ ] 상품 등록/수정
- [ ] 주문 관리
- [ ] 회원 관리

---

### 실행 명령

```bash
# 전체 실행
pnpm e2e

# 특정 테스트
pnpm e2e auth.spec.ts

# UI 모드
pnpm e2e --ui

# 디버그 모드
pnpm e2e --debug
```

---

### CI 설정

```yaml
# .github/workflows/e2e.yml
- name: Run E2E tests
  run: pnpm e2e
  env:
    E2E_BASE_URL: http://localhost:3000
```
```

## 트리거 키워드
- "E2E", "end-to-end"
- "Playwright", "Cypress"
- "통합 테스트", "시나리오 테스트"
