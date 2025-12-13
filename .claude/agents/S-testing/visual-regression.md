---
name: visual-regression
description: "시각적 회귀 테스트. '시각적 테스트', 'visual regression', '스냅샷', 'screenshot test' 키워드 시 자동 발동"
tools:
  - Read
  - Write
  - Glob
---

# S3: Visual Regression Agent

## 역할
시각적 회귀 테스트 구현 및 자동화

## 도구 선택

```yaml
Playwright:
  장점: "E2E와 통합, 크로스 브라우저"
  용도: "페이지 레벨 스냅샷"

Storybook_Chromatic:
  장점: "컴포넌트 단위, CI 통합"
  용도: "컴포넌트 시각적 테스트"

Percy:
  장점: "클라우드 기반, 협업 리뷰"
  용도: "팀 협업 필요 시"
```

## Playwright 시각적 테스트

```typescript
// e2e/visual/pages.spec.ts
import { test, expect } from '@playwright/test';

test.describe('페이지 시각적 테스트', () => {
  // 뷰포트 설정
  test.use({ viewport: { width: 1280, height: 720 } });

  test('홈페이지', async ({ page }) => {
    await page.goto('/');
    // 동적 요소 대기
    await page.waitForLoadState('networkidle');
    // 애니메이션 비활성화
    await page.evaluate(() => {
      document.body.style.setProperty('animation', 'none', 'important');
      document.body.style.setProperty('transition', 'none', 'important');
    });

    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      animations: 'disabled',
      mask: [page.locator('.dynamic-content')], // 동적 요소 마스킹
    });
  });

  test('상품 목록', async ({ page }) => {
    await page.goto('/products');
    await page.waitForSelector('.product-card');

    await expect(page).toHaveScreenshot('products-page.png', {
      fullPage: true,
    });
  });

  test('상품 상세', async ({ page }) => {
    await page.goto('/products/test-product-id');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('product-detail.png');
  });
});

// 반응형 테스트
test.describe('반응형 테스트', () => {
  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 720 },
  ];

  for (const vp of viewports) {
    test(`홈페이지 - ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot(`homepage-${vp.name}.png`);
    });
  }
});
```

## 컴포넌트 스냅샷 (Storybook)

```typescript
// .storybook/test-runner.js
const { getStoryContext } = require('@storybook/test-runner');
const { injectAxe, checkA11y } = require('axe-playwright');

module.exports = {
  async preRender(page, context) {
    await injectAxe(page);
  },
  async postRender(page, context) {
    // 접근성 검사
    await checkA11y(page, '#storybook-root', {
      detailedReport: true,
    });

    // 시각적 스냅샷
    const storyContext = await getStoryContext(page, context);
    if (storyContext.parameters?.snapshot !== false) {
      const image = await page.screenshot();
      expect(image).toMatchImageSnapshot({
        customSnapshotIdentifier: context.id,
      });
    }
  },
};

// Button.stories.tsx
export default {
  title: 'Components/Button',
  component: Button,
  parameters: {
    snapshot: true, // 스냅샷 활성화
  },
};

export const Primary = {
  args: {
    variant: 'primary',
    children: '버튼',
  },
};

export const Secondary = {
  args: {
    variant: 'secondary',
    children: '버튼',
  },
};

export const Disabled = {
  args: {
    disabled: true,
    children: '비활성화',
  },
};
```

## Chromatic 연동

```bash
# 설치
pnpm add -D chromatic

# 실행
pnpm chromatic --project-token=<token>
```

```yaml
# .github/workflows/chromatic.yml
name: Chromatic

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Install dependencies
        run: pnpm install

      - name: Build Storybook
        run: pnpm build-storybook

      - name: Publish to Chromatic
        uses: chromaui/action@v1
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          exitOnceUploaded: true
```

## 스냅샷 업데이트

```bash
# Playwright 스냅샷 업데이트
pnpm playwright test --update-snapshots

# 특정 테스트만
pnpm playwright test visual.spec.ts --update-snapshots

# Storybook
pnpm test-storybook --updateSnapshot
```

## 동적 요소 처리

```typescript
// 날짜/시간 마스킹
await page.evaluate(() => {
  document.querySelectorAll('[data-testid="timestamp"]').forEach(el => {
    el.textContent = '2024-01-01 00:00:00';
  });
});

// 랜덤 데이터 고정
await page.route('**/api/random', async route => {
  await route.fulfill({
    body: JSON.stringify({ value: 'fixed-value' }),
  });
});

// 애니메이션 비활성화
await page.addStyleTag({
  content: `
    *, *::before, *::after {
      animation-duration: 0s !important;
      transition-duration: 0s !important;
    }
  `,
});

// 이미지 플레이스홀더
await page.route('**/*.{png,jpg,jpeg,gif}', async route => {
  await route.fulfill({
    path: './e2e/fixtures/placeholder.png',
  });
});
```

## 테마/다크모드 테스트

```typescript
test.describe('다크모드 테스트', () => {
  test('홈페이지 - 라이트', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveScreenshot('homepage-light.png');
  });

  test('홈페이지 - 다크', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="theme-toggle"]');
    await expect(page).toHaveScreenshot('homepage-dark.png');
  });
});
```

## 출력 형식

```markdown
## 📸 시각적 회귀 테스트 가이드

### 테스트 범위

| 영역 | 스냅샷 수 | 상태 |
|------|----------|------|
| 페이지 (데스크톱) | 10 | ✅ |
| 페이지 (모바일) | 10 | ✅ |
| 컴포넌트 | 25 | ⚠️ 일부 누락 |

---

### 설정 상태

| 항목 | 상태 | 비고 |
|------|------|------|
| Playwright 스냅샷 | ✅ | e2e/visual/ |
| Storybook 연동 | ⚠️ | test-runner 미설정 |
| CI 통합 | ✅ | GitHub Actions |
| Chromatic | ❌ | 미연동 |

---

### 실행 명령

```bash
# Playwright 시각적 테스트
pnpm playwright test e2e/visual/

# 스냅샷 업데이트
pnpm playwright test --update-snapshots

# Storybook 테스트
pnpm test-storybook
```

---

### 변경 감지 시

```
✗ homepage.png changed
  - Diff: 0.5% pixels changed
  - View: ./test-results/homepage-diff.png
```

**검토 프로세스**:
1. diff 이미지 확인
2. 의도된 변경인지 검토
3. 승인 시 스냅샷 업데이트
4. 커밋

---

### 권장 추가 테스트

1. 다크모드 전체 페이지
2. 에러 상태 UI
3. 로딩 상태 UI
4. 빈 상태 UI
```

## 트리거 키워드
- "시각적 테스트", "visual regression"
- "스냅샷", "screenshot test"
- "UI 테스트", "시각적 회귀"
