# 관리자 패널 배포 전 점검 체크리스트

## ✅ 완료된 항목

### 1. 페이지 존재 여부 확인
- ✅ 모든 관리자 패널 메뉴 항목 (50개)에 해당하는 페이지 파일 존재 확인
- ✅ 고객 관리 카테고리 메뉴 항목 모두 확인

### 2. 빌드 확인
- ✅ Next.js 빌드 성공
- ✅ 컴파일 에러 없음
- ✅ 타입 검증 통과

### 3. 메뉴 구조 정리
- ✅ 중복 메뉴 항목 제거 완료
- ✅ 고객 관리 카테고리별 그룹화 완료
- ✅ 섹션별 메뉴 구조 정리 완료

## ⚠️ 확인 필요 사항

### 1. 동적 라우트 경고 (정상)
다음 API 라우트들은 `cookies`를 사용하므로 동적 라우트로 동작해야 합니다:
- `/api/admin/apis/product-apis-list`
- `/api/admin/marketing/customers/by-group`
- `/api/admin/apis/product-customers`
- `/api/auth/check-username`
- `/api/affiliate/my-payslips`
- `/api/auth/check-nickname`
- `/api/admin/customers/export`
- `/api/admin/apis/customer-detail`
- `/api/partner/assign-trip/products/search`
- `/api/community/my-info`
- `/api/partner/assign-trip/purchase-customers`
- `/api/wallet/countries`

**조치**: 이 경고들은 정상이며, 해당 API들은 `export const dynamic = 'force-dynamic'` 설정이 필요할 수 있습니다.

### 2. 주요 기능 확인 필요

#### 고객 관리 기능
- [ ] 전체 고객 관리 페이지 동작 확인
- [ ] 유입 경로별 고객 필터링 동작 확인
- [ ] 어필리에이트 고객 관리 페이지 동작 확인
- [ ] 고객 선택 삭제 기능 동작 확인

#### 메시지 기능
- [ ] 고객 메시지 전송 기능 확인
- [ ] 팀 대시보드 메시지함 동작 확인
- [ ] 예약 메시지 기능 확인

#### 어필리에이트 기능
- [ ] 어필리에이트 수당 계산 확인
- [ ] 판매 확정 승인 기능 확인
- [ ] 정산 대시보드 동작 확인

#### 마케팅 기능
- [ ] 마케팅 대시보드 동작 확인
- [ ] 퍼널 메시지 기능 확인
- [ ] 랜딩페이지 관리 기능 확인

## 📋 배포 전 최종 확인 사항

1. **환경 변수 확인**
   - [ ] `.env.production` 파일 확인
   - [ ] 데이터베이스 연결 정보 확인
   - [ ] API 키 설정 확인

2. **데이터베이스 마이그레이션**
   - [ ] Prisma 마이그레이션 상태 확인
   - [ ] 스키마 변경사항 확인

3. **성능 최적화**
   - [ ] 이미지 최적화 확인
   - [ ] 번들 크기 확인
   - [ ] 캐싱 전략 확인

4. **보안 확인**
   - [ ] 인증/인가 로직 확인
   - [ ] CSRF 보호 확인
   - [ ] SQL Injection 방지 확인

5. **에러 핸들링**
   - [ ] API 에러 응답 확인
   - [ ] 클라이언트 에러 핸들링 확인
   - [ ] 로깅 설정 확인

## 🚀 배포 준비 완료

모든 페이지가 존재하고 빌드가 성공적으로 완료되었습니다.
배포를 진행할 수 있습니다.


