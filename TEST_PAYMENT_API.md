# 결제 내역 API 테스트 가이드

## 문제 해결 체크리스트

### 1. 브라우저에서 확인할 사항

1. **개발자 도구 열기** (F12)
2. **Network 탭**에서 `/api/partner/payments` 요청 확인
3. **Console 탭**에서 에러 메시지 확인

### 2. 세션 확인

boss1 계정으로 로그인되어 있는지 확인:
- 브라우저 쿠키에서 세션 확인
- 또는 `/api/partner/payments` 요청의 응답 상태 확인

### 3. API 직접 테스트

터미널에서 실행:
```bash
cd /home/userhyeseon28/projects/cruise-guide
npx tsx scripts/create-sample-order.ts
```

### 4. 데이터 확인

생성된 데이터 확인:
- Payment의 `affiliateMallUserId`가 `boss1`인지 확인
- Payment의 `status`가 `completed`인지 확인
- AffiliateSale의 `managerId`가 boss1의 AffiliateProfile ID인지 확인

### 5. 새 브라우저로 테스트

1. **시크릿 모드** 또는 **새 브라우저** 열기
2. `http://localhost:3001/partner/reservation/new` 접속
3. boss1 계정으로 로그인
4. "결제 내역 불러오기" 버튼 클릭

## 디버깅 로그 확인

서버 콘솔에서 다음 로그 확인:
- `[Partner Payments] 디버깅 정보:`
- `[Partner Payments] 조회된 결제 내역 개수:`
- `[Partner Payments] 필터링 조건:`



