# PayApp 환경 변수 설정 가이드

## ✅ 올바른 환경 변수 설정

`.env.local` 또는 `.env` 파일에 다음을 설정하세요:

```bash
# PayApp 연동 정보 (PayApp 판매자 사이트 > 설정 > 연동정보에서 확인)
PAYAPP_USERID=hyeseon28
PAYAPP_LINKKEY=CPe1Qyvoll6bPRHfd5pTZO1DPJnCCRVaOgT+oqg6zaM=
PAYAPP_LINKVAL=CPe1Qyvoll6bPRHfd5pTZJKhziNbvfVO9tbzpmrIe6s=

# ⚠️ 중요: 크루즈닷 웹사이트 도메인 (PayApp이 콜백을 보낼 주소)
NEXT_PUBLIC_BASE_URL=https://www.cruisedot.co.kr
```

## 🔍 확인 사항

### 1. PayApp 연동 정보 확인
- PayApp 판매자 사이트 로그인: https://www.payapp.kr
- **설정** > **연동정보** 탭에서 확인:
  - `userid`: 판매자 아이디
  - `연동 KEY`: PAYAPP_LINKKEY
  - `연동 VALUE`: PAYAPP_LINKVAL

### 2. NEXT_PUBLIC_BASE_URL 확인
- **반드시 크루즈닷 웹사이트 도메인**이어야 합니다
- ❌ 잘못된 예: `https://www.payapp.kr/L/z3dVXA` (PayApp 결제 링크)
- ✅ 올바른 예: `https://www.cruisedot.co.kr` (크루즈닷 도메인)
- 뒤에 슬래시(`/`)는 자동으로 제거됩니다

### 3. PayApp 콜백 URL 확인
환경 변수가 올바르게 설정되면:
- `feedbackurl`: `https://www.cruisedot.co.kr/api/payapp/feedback`
- `returnurl`: `https://www.cruisedot.co.kr/affiliate/contract/success?contractId={contractId}`

이 두 URL은 PayApp 서버에서 접근 가능해야 합니다 (외부에서 접근 가능한 공개 URL).

## 🚀 결제 흐름

1. **계약서 제출** → `/api/affiliate/contracts` (POST)
2. **계약서 저장 성공** → 계약서 ID 반환
3. **PayApp 결제 요청** → `/api/payapp/request` (POST)
   - PayApp API 호출: `https://api.payapp.kr/oapi/apiLoad.html`
   - `payurl` 받아옴
4. **결제창으로 이동** → `window.location.href = payurl`
5. **사용자 결제 완료** → PayApp에서 카드번호 입력
6. **PayApp 콜백** → `/api/payapp/feedback` (POST)
   - PayApp 서버가 결제 결과를 POST로 전송
7. **결제 완료 페이지** → `/affiliate/contract/success?contractId={contractId}`

## 🔧 환경 변수 적용 방법

### 개발 환경
1. `.env.local` 파일 생성 (프로젝트 루트)
2. 위의 환경 변수 복사/붙여넣기
3. 서버 재시작: `npm run dev` 또는 `yarn dev`

### 프로덕션 환경
배포 플랫폼(Vercel, AWS 등)의 환경 변수 설정에서 추가:
- `PAYAPP_USERID`
- `PAYAPP_LINKKEY`
- `PAYAPP_LINKVAL`
- `NEXT_PUBLIC_BASE_URL`

## 🐛 문제 해결

### 결제창이 안 나오는 경우
1. 브라우저 콘솔(F12) 확인:
   - `[AffiliateContractPublic] 결제 요청 시작:`
   - `[AffiliateContractPublic] 결제 요청 응답:`
   - 에러 메시지 확인

2. 서버 로그 확인:
   - `[PayApp Request API] 결제 요청 파라메터:`
   - `[PayApp] API 응답 원문:`
   - `[PayApp Request API] 결제 요청 실패:` (에러 발생 시)

3. 환경 변수 확인:
   ```bash
   # 서버에서 확인 (개발 환경)
   console.log('PAYAPP_USERID:', process.env.PAYAPP_USERID);
   console.log('NEXT_PUBLIC_BASE_URL:', process.env.NEXT_PUBLIC_BASE_URL);
   ```

### PayApp API 오류 코드
- `70001`: HTTPS로 호출하지 않음
- `70010`: userid, linkkey 값이 정확하지 않음
- `70020`: 파라메터값이 정확하지 않음
- `70040`: cmd값이 정확하지 않음
- `70060`: 권한이 없음
- `70080`: 고객사 응답 실패 (feedbackurl 접속 실패)

## 📝 참고
- PayApp API 문서: https://www.payapp.kr
- PayApp 판매자 사이트: https://www.payapp.kr (로그인 필요)







