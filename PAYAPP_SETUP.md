# PayApp 결제 연동 설정 가이드

## 환경 변수 설정

`.env.local` 파일에 다음 환경 변수를 추가하세요:

```bash
# PayApp 설정
PAYAPP_USERID=hyeseon28
PAYAPP_LINKKEY=CPe1Qyvoll6bPRHfd5pTZO1DPJnCCRVaOgT+oqg6zaM=
PAYAPP_LINKVAL=CPe1Qyvoll6bPRHfd5pTZJKhziNbvfVO9tbzpmrIe6s=

# Base URL (마지막 슬래시 제거)
NEXT_PUBLIC_BASE_URL=https://www.cruisedot.co.kr
```

## 계약서 타입별 결제 금액

- **판매원 (SALES_AGENT)**: 3,300,000원
- **대리점장 (BRANCH_MANAGER)**: 7,500,000원
- **크루즈스탭 (CRUISE_STAFF)**: 5,400,000원
- **프리마케터 (PRIMARKETER)**: 1,000,000원

## 기존 리드젠 결제 페이지 매핑

기존 리드젠 결제 페이지가 PayApp으로 통합되었습니다:

| 계약서 타입 | 기존 리드젠 URL | PayApp 통합 |
|------------|----------------|------------|
| 프리마케터 | http://leadz.kr/ymF | ✅ 통합 완료 |
| 판매원 | http://leadz.kr/yej | ✅ 통합 완료 |
| 크루즈스탭 | http://leadz.kr/yek | ✅ 통합 완료 |
| 대리점장 | http://leadz.kr/xWG | ✅ 통합 완료 |

## 결제 흐름

1. 사용자가 계약서 작성 및 제출
2. 계약서 저장 성공
3. 자동으로 PayApp 결제 요청 API 호출 (`/api/payapp/request`)
4. PayApp 결제창으로 자동 이동 (카드번호 입력)
5. 사용자가 결제 완료
6. PayApp 서버가 `/api/payapp/feedback`으로 통보
7. 결제 정보가 계약서 메타데이터에 저장
8. 사용자는 `/affiliate/contract/success` 페이지로 이동

## 결제 수단

현재는 **신용카드 (카드번호 입력)** 결제만 지원합니다.
기존 리드젠 결제 페이지와 동일한 방식입니다.

## API 엔드포인트

### 결제 요청
- **URL**: `/api/payapp/request`
- **Method**: POST
- **Body**: 
  ```json
  {
    "contractId": 123,
    "contractType": "SALES_AGENT",
    "phone": "01012345678",
    "name": "홍길동"
  }
  ```

### 결제 완료 통보 (Webhook)
- **URL**: `/api/payapp/feedback`
- **Method**: POST
- **호출 주체**: PayApp 서버
- **응답**: `SUCCESS` (반드시 반환해야 함)

## 테스트 방법

1. 환경 변수 설정 확인
2. 계약서 제출 페이지에서 계약서 작성
3. 제출 버튼 클릭
4. PayApp 결제창으로 자동 이동 확인
5. 테스트 카드로 결제 진행
6. 결제 완료 후 성공 페이지 확인

## 문제 해결

### 결제 요청 실패
- 환경 변수 확인 (`PAYAPP_USERID`, `PAYAPP_LINKKEY`)
- 서버 로그 확인
- PayApp 판매자 관리 사이트에서 연동 정보 확인

### 결제 완료 통보 실패
- `PAYAPP_LINKVAL` 환경 변수 확인
- feedbackurl이 외부에서 접근 가능한지 확인 (HTTPS 필수)
- 서버 로그에서 보안 검증 실패 메시지 확인

## 보안 주의사항

- `PAYAPP_LINKKEY`와 `PAYAPP_LINKVAL`은 절대 공개하지 마세요
- `.env.local` 파일은 `.gitignore`에 포함되어 있어야 합니다
- 프로덕션 환경에서는 HTTPS를 사용해야 합니다







