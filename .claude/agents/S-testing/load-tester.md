---
name: load-tester
description: "부하 테스트. '부하 테스트', 'load test', 'k6', '성능 테스트', 'stress test' 키워드 시 자동 발동"
tools:
  - Read
  - Write
  - Glob
---

# S2: Load Tester Agent

## 역할
k6 기반 부하/성능 테스트 구현

## k6 설치 및 설정

```bash
# macOS
brew install k6

# Linux
sudo apt-get install k6

# Docker
docker run -i grafana/k6 run - <script.js
```

## 기본 부하 테스트

```javascript
// load-tests/basic.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  // 부하 시나리오
  stages: [
    { duration: '1m', target: 20 },  // 1분간 20 VU까지 증가
    { duration: '3m', target: 20 },  // 3분간 20 VU 유지
    { duration: '1m', target: 0 },   // 1분간 0으로 감소
  ],

  // 성능 임계값
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95%가 500ms 이내
    http_req_failed: ['rate<0.01'],   // 실패율 1% 미만
  },
};

export default function () {
  // 홈페이지
  const homeRes = http.get('http://localhost:3000/');
  check(homeRes, {
    'homepage status is 200': (r) => r.status === 200,
    'homepage load time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);

  // 상품 목록
  const productsRes = http.get('http://localhost:3000/api/products');
  check(productsRes, {
    'products status is 200': (r) => r.status === 200,
    'products returns array': (r) => JSON.parse(r.body).length > 0,
  });

  sleep(1);
}
```

## API 부하 테스트

```javascript
// load-tests/api.js
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// 커스텀 메트릭
const errorRate = new Rate('errors');
const apiDuration = new Trend('api_duration');

export const options = {
  scenarios: {
    // 일반 트래픽
    normal_load: {
      executor: 'constant-vus',
      vus: 10,
      duration: '5m',
    },
    // 피크 트래픽
    peak_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '3m', target: 50 },
        { duration: '2m', target: 0 },
      ],
      startTime: '5m', // normal_load 후 시작
    },
  },
  thresholds: {
    http_req_duration: ['p(99)<1500'],
    errors: ['rate<0.05'],
  },
};

const BASE_URL = 'http://localhost:3000';

export default function () {
  group('상품 API', () => {
    const res = http.get(`${BASE_URL}/api/products`);

    apiDuration.add(res.timings.duration);
    errorRate.add(res.status !== 200);

    check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
    });
  });

  group('상품 상세', () => {
    const productId = 'test-product-id';
    const res = http.get(`${BASE_URL}/api/products/${productId}`);

    check(res, {
      'status is 200': (r) => r.status === 200,
    });
  });

  sleep(Math.random() * 3 + 1); // 1-4초 랜덤 대기
}
```

## 인증 포함 테스트

```javascript
// load-tests/authenticated.js
import http from 'k6/http';
import { check, group } from 'k6';

export const options = {
  vus: 10,
  duration: '5m',
};

// 테스트 전 로그인
export function setup() {
  const loginRes = http.post(
    'http://localhost:3000/api/auth/login',
    JSON.stringify({
      email: 'test@example.com',
      password: 'testpassword',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  const token = JSON.parse(loginRes.body).token;
  return { token };
}

export default function (data) {
  const headers = {
    'Authorization': `Bearer ${data.token}`,
    'Content-Type': 'application/json',
  };

  group('인증된 API', () => {
    // 프로필 조회
    const profileRes = http.get('http://localhost:3000/api/me', { headers });
    check(profileRes, {
      'profile status 200': (r) => r.status === 200,
    });

    // 주문 목록
    const ordersRes = http.get('http://localhost:3000/api/orders', { headers });
    check(ordersRes, {
      'orders status 200': (r) => r.status === 200,
    });
  });
}
```

## 스트레스 테스트

```javascript
// load-tests/stress.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // 정상 부하
    { duration: '5m', target: 100 },
    { duration: '2m', target: 200 },  // 높은 부하
    { duration: '5m', target: 200 },
    { duration: '2m', target: 300 },  // 최대 부하
    { duration: '5m', target: 300 },
    { duration: '10m', target: 0 },   // 복구
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 스트레스 시 더 관대한 임계값
  },
};

export default function () {
  const res = http.get('http://localhost:3000/api/products');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'not rate limited': (r) => r.status !== 429,
  });

  sleep(1);
}
```

## 스파이크 테스트

```javascript
// load-tests/spike.js
export const options = {
  stages: [
    { duration: '10s', target: 1 },    // 워밍업
    { duration: '1m', target: 1 },
    { duration: '10s', target: 500 },  // 급격한 스파이크
    { duration: '3m', target: 500 },
    { duration: '10s', target: 1 },    // 급격한 감소
    { duration: '3m', target: 1 },
    { duration: '10s', target: 0 },
  ],
};
```

## 결과 분석

```bash
# 실행 및 결과 저장
k6 run --out json=results.json load-tests/basic.js

# HTML 리포트 (k6-reporter)
k6 run --out json=results.json load-tests/basic.js && \
  k6-reporter results.json
```

## 출력 형식

```markdown
## 📊 부하 테스트 가이드

### 테스트 시나리오

| 테스트 | VU | 지속시간 | 목적 |
|--------|-----|---------|------|
| 기본 | 20 | 5분 | 정상 동작 확인 |
| 스트레스 | 300 | 25분 | 한계 파악 |
| 스파이크 | 500 | 10분 | 급증 대응 |

---

### 성능 기준

| 지표 | 목표 | 현재 |
|------|------|------|
| p95 응답시간 | <500ms | 450ms ✅ |
| p99 응답시간 | <1500ms | 1200ms ✅ |
| 에러율 | <1% | 0.5% ✅ |
| 처리량 | >100 RPS | 150 RPS ✅ |

---

### 발견된 병목

1. **DB 연결 풀** - 100 VU 초과 시 연결 대기
2. **/api/products** - 캐싱 없이 매번 쿼리
3. **이미지 응답** - CDN 미적용

---

### 실행 명령

```bash
# 기본 테스트
k6 run load-tests/basic.js

# 스트레스 테스트
k6 run load-tests/stress.js

# CI 환경
k6 run --out json=results.json load-tests/basic.js
```

---

### 권장 최적화

1. Redis 캐싱 적용
2. DB 커넥션 풀 증가 (10 → 50)
3. CDN 이미지 서빙
```

## 트리거 키워드
- "부하 테스트", "load test"
- "k6", "성능 테스트"
- "stress test", "스트레스 테스트"
