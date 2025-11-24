# 여권 요청 수동 링크 생성 기능 비교 분석

## 원조: 파트너 대시보드 (`/api/partner/passport-requests/manual`)

### API 엔드포인트
- **경로**: `/api/partner/passport-requests/manual`
- **메서드**: `POST`
- **인증**: `requirePartnerContext()` (파트너 세션 필요)

### 요청 파라미터
```typescript
{
  leadId: number;           // AffiliateLead의 ID
  templateId?: number;
  messageBody?: string;
  expiresInHours?: number;
}
```

### 데이터 흐름
1. **고객 정보 조회**: `affiliateLead` 테이블에서 `leadId`로 조회
   - `lead.User` (User 정보)
   - `lead.Product` (상품 정보)
   - `lead.customerName` (고객명)
   - `lead.passportRequestedAt` 또는 `lead.createdAt` (출발일)

2. **템플릿 변수 채우기**:
   ```typescript
   {
     고객명: (lead.customerName || user.name || '고객') + '님',
     링크: link,
     상품명: lead.Product?.packageName ?? '',
     출발일: formatDate(lead.passportRequestedAt ?? lead.createdAt),
   }
   ```

3. **AffiliateLead 업데이트**: `passportRequestedAt` 필드 업데이트

### 프론트엔드
- **파일**: `app/partner/[partnerId]/passport-requests/PartnerPassportRequestsClient.tsx`
- **API 호출**: `/api/partner/passport-requests/manual`
- **요청 데이터**: `{ leadId, templateId, messageBody, expiresInHours }`

---

## 복제본: 관리자 패널 (`/api/admin/passport-request/manual`)

### API 엔드포인트
- **경로**: `/api/admin/passport-request/manual`
- **메서드**: `POST`
- **인증**: `requireAdminUser()` (관리자 세션 필요)

### 요청 파라미터
```typescript
{
  userId: number;            // User의 ID (직접)
  templateId?: number;
  messageBody?: string;
  expiresInHours?: number;
}
```

### 데이터 흐름
1. **고객 정보 조회**: `user` 테이블에서 `userId`로 직접 조회
   - `user` 정보만 사용
   - 상품 정보 없음
   - 여행 정보 없음

2. **템플릿 변수 채우기**:
   ```typescript
   {
     고객명: (user.name || '고객') + '님',
     링크: link,
     상품명: '',              // ❌ 빈 문자열
     출발일: '',              // ❌ 빈 문자열
   }
   ```

3. **AffiliateLead 업데이트 없음** (관리자는 직접 User를 사용)

### 프론트엔드
- **파일**: `app/admin/passport-request/page.tsx`
- **API 호출**: `/api/admin/passport-request/manual`
- **요청 데이터**: `{ userId, templateId, messageBody, expiresInHours }`

---

## 주요 차이점

### 1. 데이터 소스
| 항목 | 파트너 (원조) | 관리자 (복제본) |
|------|-------------|----------------|
| 고객 정보 | `affiliateLead` → `User` | `User` 직접 |
| 상품 정보 | `lead.Product` | 없음 (빈 문자열) |
| 출발일 | `lead.passportRequestedAt` 또는 `lead.createdAt` | 없음 (빈 문자열) |
| 고객명 | `lead.customerName` 또는 `user.name` | `user.name` |

### 2. 템플릿 변수
| 변수 | 파트너 (원조) | 관리자 (복제본) |
|------|-------------|----------------|
| `{고객명}` | ✅ `lead.customerName` 또는 `user.name` | ✅ `user.name` |
| `{링크}` | ✅ 생성된 링크 | ✅ 생성된 링크 |
| `{상품명}` | ✅ `lead.Product.packageName` | ❌ 빈 문자열 |
| `{출발일}` | ✅ `lead.passportRequestedAt` 또는 `lead.createdAt` | ❌ 빈 문자열 |

### 3. 데이터베이스 업데이트
| 항목 | 파트너 (원조) | 관리자 (복제본) |
|------|-------------|----------------|
| `PassportSubmission` | ✅ 생성/업데이트 | ✅ 생성/업데이트 |
| `PassportRequestLog` | ✅ 로그 기록 | ✅ 로그 기록 |
| `AffiliateLead` | ✅ `passportRequestedAt` 업데이트 | ❌ 업데이트 없음 |

---

## 문제점 분석

### 현재 관리자 패널의 문제점

1. **상품명이 비어있음**
   - 템플릿에서 `{상품명}` 변수가 빈 문자열로 채워짐
   - 관리자 패널에서 User의 최신 여행 정보를 가져와야 함

2. **출발일이 비어있음**
   - 템플릿에서 `{출발일}` 변수가 빈 문자열로 채워짐
   - 관리자 패널에서 User의 최신 여행 정보를 가져와야 함

3. **AffiliateLead 업데이트 없음**
   - 파트너는 `lead.passportRequestedAt`을 업데이트하지만, 관리자는 업데이트하지 않음
   - 관리자 패널에서는 User를 직접 사용하므로 AffiliateLead와의 연결이 없을 수 있음

---

## 개선 방안

### 옵션 1: User의 최신 여행 정보 사용
```typescript
// 관리자 패널에서 User의 최신 여행 정보 조회
const latestTrip = await prisma.userTrip.findFirst({
  where: { userId: user.id },
  orderBy: { startDate: 'desc' },
  select: {
    cruiseName: true,
    startDate: true,
  },
});

const personalizedMessage = fillTemplate(baseMessage, {
  고객명: (user.name || '고객') + '님',
  링크: link,
  상품명: latestTrip?.cruiseName ?? '',
  출발일: latestTrip?.startDate ? formatDate(latestTrip.startDate) : '',
});
```

### 옵션 2: AffiliateLead와 연결
```typescript
// User의 AffiliateLead 찾기
const lead = await prisma.affiliateLead.findFirst({
  where: { userId: user.id },
  include: {
    Product: {
      select: { packageName: true },
    },
  },
  orderBy: { createdAt: 'desc' },
});

// lead가 있으면 파트너와 동일한 방식으로 처리
```

---

## 결론

**원조 (파트너 대시보드)**는 `AffiliateLead`를 통해 고객, 상품, 출발일 정보를 모두 가져와서 템플릿을 완전히 채웁니다.

**복제본 (관리자 패널)**은 `User`만 사용하여 상품명과 출발일이 비어있습니다.

**해결책**: 관리자 패널에서도 User의 최신 여행 정보(`UserTrip`)를 조회하여 템플릿 변수를 채워야 합니다.










