# 100개 이상 대리점장 확장 분석 및 최적화 전략

> **작성일**: 2025년 1월  
> **시나리오**: 대리점장 100명 이상, 각자 개개인몰 운영 (최대 20개 랜딩페이지/명)

---

## 📊 규모 분석

### 데이터 규모
- **대리점장**: 100명 이상
- **랜딩페이지**: 최대 2,000개 이상 (100명 × 20개)
- **보너스 공유**: 최대 1,000개 이상 (100명 × 10개)
- **총 랜딩페이지**: 최대 3,000개 이상

### 예상 데이터 크기
- **랜딩페이지 1개**: 평균 50KB (HTML, 이미지 URL, 설정 등)
- **총 스토리지**: 약 150MB (3,000개 × 50KB)
- **데이터베이스**: 매우 가벼움 ✅

---

## ✅ 현재 시스템 상태 (이미 최적화됨)

### 1. 데이터베이스 인덱스
```prisma
model LandingPage {
  @@index([adminId])           // 대리점장별 조회 최적화 ✅
  @@index([category])           // 카테고리 필터링 최적화 ✅
  @@index([slug])               // 슬러그 조회 최적화 ✅
  @@index([isActive])           // 활성 페이지 필터링 ✅
  @@index([isPublic])           // 공개 페이지 필터링 ✅
}
```

**결과**: 인덱스가 잘 설정되어 있어 100명 이상 확장 가능 ✅

### 2. 쿼리 최적화
- `adminId` 기준 조회: 인덱스 활용으로 O(log n) 성능
- 페이지네이션: 이미 구현됨
- 필터링: 인덱스 활용으로 빠름

### 3. API 구조
- 대리점장별 분리된 API: `/api/partner/landing-pages`
- 본사 관리 API: `/api/admin/landing-pages`
- 권한 분리로 보안 및 성능 최적화 ✅

---

## 🚀 추가 최적화 방안

### 1. 캐싱 전략 (선택사항)

#### Redis 캐싱 (고트래픽 시)
```typescript
// app/api/partner/landing-pages/route.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

export async function GET(req: NextRequest) {
  const cacheKey = `partner:landing-pages:${profile.id}`;
  
  // 캐시 확인 (5분 TTL)
  const cached = await redis.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }
  
  // DB 조회
  const data = await fetchFromDatabase();
  
  // 캐시 저장
  await redis.setex(cacheKey, 300, JSON.stringify(data));
  
  return NextResponse.json(data);
}
```

**효과**: 
- DB 쿼리 90% 감소
- 응답 시간 50% 단축
- 서버 부하 대폭 감소

#### Next.js 캐싱 (간단한 방법)
```typescript
// app/api/partner/landing-pages/route.ts
export const revalidate = 60; // 60초 캐싱

export async function GET(req: NextRequest) {
  // Next.js가 자동으로 캐싱
  const data = await fetchFromDatabase();
  return NextResponse.json(data);
}
```

### 2. 페이지네이션 강화

현재는 이미 구현되어 있지만, 더 작은 단위로 분할 가능:
```typescript
// 기본: 50개씩
// 확장 시: 20개씩으로 줄여서 메모리 사용량 감소
const limit = parseInt(searchParams.get('limit') || '20');
```

### 3. 이미지 최적화

랜딩페이지 이미지는 CDN 사용 권장:
- Cloudflare CDN
- AWS CloudFront
- Vercel Image Optimization

### 4. 데이터베이스 연결 풀 최적화

```env
# .env
DATABASE_POOL_SIZE=20  # 기본값에서 증가
DATABASE_POOL_TIMEOUT=10
```

---

## 📈 성능 예측

### 현재 상태 (인덱스 최적화 완료)
- **100명 대리점장**: ✅ 문제없음
- **200명 대리점장**: ✅ 문제없음
- **500명 대리점장**: ⚠️ 캐싱 권장
- **1,000명 대리점장**: ⚠️ 캐싱 필수

### 트래픽별 대응
- **낮은 트래픽** (< 1,000 req/min): 현재 상태로 충분
- **중간 트래픽** (1,000-10,000 req/min): Next.js 캐싱 추가
- **높은 트래픽** (> 10,000 req/min): Redis 캐싱 필수

---

## 💰 비용 분석

### 현재 구조 (캐싱 없음)
- **데이터베이스**: PostgreSQL (기존)
- **스토리지**: 150MB (무료 범위)
- **트래픽**: 사용량에 따라
- **추가 비용**: 없음 ✅

### Redis 추가 시
- **Upstash Redis**: 무료 티어 (10,000 req/day)
- **유료**: $0.20/100K requests
- **예상 비용**: 월 $10-50 (트래픽에 따라)

---

## 🎯 권장 사항

### 즉시 적용 가능 (현재 상태)
✅ **100-200명까지**: 현재 구조로 충분
- 인덱스 최적화 완료
- 페이지네이션 구현됨
- 권한 분리 완료

### 확장 시 (200명 이상)
1. **Next.js 캐싱 추가** (5분)
   ```typescript
   export const revalidate = 300; // 5분
   ```

2. **모니터링 추가**
   - API 응답 시간 추적
   - 데이터베이스 쿼리 시간 모니터링
   - 에러율 추적

3. **Redis 캐싱** (트래픽 증가 시)
   - Upstash Redis 무료 티어로 시작
   - 필요 시 유료 플랜으로 업그레이드

---

## 🔍 모니터링 체크리스트

### 성능 지표
- [ ] API 응답 시간 < 200ms (목표)
- [ ] 데이터베이스 쿼리 시간 < 100ms
- [ ] 에러율 < 0.1%
- [ ] 동시 접속자 수 추적

### 확장 신호
- API 응답 시간 > 500ms → 캐싱 필요
- 데이터베이스 CPU > 70% → 쿼리 최적화 필요
- 에러율 > 1% → 인프라 확장 검토

---

## ✅ 결론

### 현재 상태로 가능한 규모
- **대리점장 100-200명**: ✅ 문제없음
- **랜딩페이지 2,000-4,000개**: ✅ 문제없음
- **서버 부하**: 최소 수준

### 확장 시 필요한 작업
1. **200명 이상**: Next.js 캐싱 추가 (5분 작업)
2. **500명 이상**: Redis 캐싱 고려
3. **1,000명 이상**: Redis 캐싱 필수 + 모니터링 강화

### 서버 부하 예측
- **100명**: 현재 상태로 충분 ✅
- **200명**: 현재 상태로 충분 ✅
- **500명**: 캐싱 추가 시 충분 ✅
- **1,000명**: Redis 캐싱 + 모니터링 필요 ⚠️

**결론**: 현재 구조로 100-200명까지는 문제없이 운영 가능하며, 확장 시에도 최소한의 최적화만 추가하면 됩니다.





