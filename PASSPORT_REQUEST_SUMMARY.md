# 여권요청 링크 사용 경로 요약

## 📍 여권요청 링크가 사용되는 모든 경로

### 1. 관리자 패널

#### ✅ 여권 요청 관리 페이지
- **경로**: `/app/admin/passport-request/page.tsx`
- **API**: `/api/admin/passport-request/send/route.ts`
- **링크 형식**: `/passport/{token}` (토큰 기반)
- **기능**: 여권 요청 링크 생성 및 SMS 발송

#### ⚠️ 문자보내기 페이지 (여권요청 기능 없음)
- **경로**: `/app/admin/messages/page.tsx`
- **현재 상태**: 여권요청 링크 기능 없음
- **추가 필요**: 여권요청 링크 생성 및 발송 기능 추가

### 2. 대리점장 대시보드

#### ✅ 여권 요청 관리 페이지
- **경로**: `/app/partner/[partnerId]/passport-requests/`
- **컴포넌트**: `PartnerPassportRequestsClient.tsx`
- **API**: `/api/partner/passport-requests/manual/route.ts`
- **링크 형식**: `/passport/{token}` (토큰 기반)

#### ✅ 고객 상세 페이지
- **경로**: `/app/partner/[partnerId]/customers/PartnerCustomersClient.tsx`
- **위치**: 라인 4187-4476 (여권 보내기 모달)
- **링크 형식**: `/api/public/passport-upload?leadId={leadId}&partnerId={partnerId}`
- **기능**: 고객 상세에서 여권 업로드 링크 생성 및 발송

#### ✅ 신규예약등록폼
- **경로**: `/app/partner/[partnerId]/reservation/new/page.tsx`
- **컴포넌트**: `components/partner/ReservationForm.tsx`
- **위치**: 라인 1776-1804
- **링크 형식**: `/customer/passport/{reservationId}` (예약 ID 기반)
- **기능**: 예약 등록 후 여권 등록 링크 복사

### 3. 판매원 대시보드

#### ⚠️ 확인 필요
- 판매원 전용 대시보드가 별도로 있는지 확인 필요
- 대리점장 대시보드와 동일한 구조를 사용할 가능성이 높음

## 🔄 현재 여권 폼

### 1. 예약 ID 기반 여권 폼
- **경로**: `/app/customer/passport/[reservationId]/page.tsx`
- **API**: `/api/customer/reservation/[reservationId]/route.ts`
- **기능**: 예약 ID로 예약 정보를 가져와서 여권 정보 입력
- **사용**: 신규예약등록폼에서 생성된 링크

### 2. 토큰 기반 여권 폼
- **경로**: `/app/passport/[token]/page.tsx`
- **API**: `/api/passport/[token]/route.ts`
- **기능**: 토큰으로 여권 정보 입력
- **사용**: 관리자/대리점장이 생성한 여권 요청 링크

## 📋 변경 계획

### 1. 신규예약등록폼 기반 여권 폼 개선
- **목표**: 고객이 구매한 상품을 자동으로 가져와서 1,2,3,4,5를 입력하고 완료할 수 있는 폼
- **현재 상태**: `/app/customer/passport/[reservationId]/page.tsx`가 이미 존재하지만, 신규예약등록폼과의 연동이 필요
- **개선 사항**:
  - 예약 정보 자동 로드 (이미 구현됨)
  - 여행자 정보 자동 채우기 (구매한 상품 기반)
  - 1,2,3,4,5 단계별 입력 UI 개선
  - 완료 후 제출

### 2. 여권 폼 링크 생성 및 발송 기능
- **관리자 패널**: 문자보내기 페이지에 여권요청 기능 추가
- **대리점장 대시보드**: 신규예약등록폼에서 여권 폼 링크 생성 및 발송 (이미 구현됨)
- **판매원 대시보드**: 동일 기능 연동

### 3. 연동 작업
- 신규예약등록폼과 여권 폼 연동 (이미 구현됨)
- 여권 폼 링크 자동 생성 (이미 구현됨)
- 문자 발송 기능 통합 (일부 구현됨)

## ✅ 완료된 작업

1. ✅ 여권요청 링크가 사용되는 모든 경로 찾기
2. ✅ 경로 분석 문서 작성

## 🔨 진행 중인 작업

1. ⏳ 신규예약등록폼 기반 여권 폼 개선
2. ⏳ 관리자 패널 문자보내기에 여권요청 기능 추가
3. ⏳ 대리점장/판매원 대시보드에 여권요청 링크 발송 기능 연동

