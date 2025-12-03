# 웰컴페이먼츠 콜백 URL 설정 가이드

## 📋 목차
1. [콜백 URL이란?](#콜백-url이란)
2. [관리자 페이지 로그인](#관리자-페이지-로그인)
3. [콜백 URL 등록 방법](#콜백-url-등록-방법)
4. [테스트 환경 vs 운영 환경](#테스트-환경-vs-운영-환경)
5. [트러블슈팅](#트러블슈팅)

---

## 🎯 콜백 URL이란?

웰컴페이먼츠에서 결제가 완료되면, PG사가 결제 결과를 우리 서버로 전달하기 위해 호출하는 URL입니다.

### 콜백 URL의 종류

#### 1. **Return URL (사용자 리다이렉트용)**
- **용도**: 결제 완료 후 사용자가 돌아올 페이지
- **호출 방식**: 브라우저 리다이렉트 (GET)
- **우리 서버 URL**: 
  - 개발: `http://localhost:3000/api/payment/callback`
  - 운영: `https://yourdomain.com/api/payment/callback`

#### 2. **Notify URL (서버 통신용)**
- **용도**: 결제 결과를 서버 간 통신으로 안전하게 전달
- **호출 방식**: HTTP POST (Form Data)
- **우리 서버 URL**: 
  - 개발: `http://localhost:3000/api/payment/notify`
  - 운영: `https://yourdomain.com/api/payment/notify`

> ⚠️ **중요**: Notify URL은 서버 간 통신이므로 localhost는 사용할 수 없습니다!  
> 개발 환경에서는 ngrok 등을 사용하여 공개 URL을 만들어야 합니다.

---

## 🔐 관리자 페이지 로그인

### 1단계: 웰컴페이먼츠 관리자 페이지 접속

**관리자 페이지 URL**: http://wbiz.paywelcome.co.kr

### 2단계: 로그인 정보

#### 인증 결제 계정
- **MID**: `wpcrdot200`
- **비밀번호**: (별도 문의 필요)

#### 비인증 결제 계정
- **MID**: `wpcrdot300`
- **비밀번호**: `Ronaldo7@@`

> 💡 **팁**: 인증 결제와 비인증 결제는 별도의 MID를 사용하므로, 각각 설정이 필요합니다.

---

## ⚙️ 콜백 URL 등록 방법

### 방법 1: 웹 관리자 페이지에서 설정 (권장)

1. **로그인 후 메뉴 이동**
   ```
   로그인 → 가맹점 설정 → 결제 설정 → 통지 URL 설정
   ```

2. **Return URL 설정**
   - **항목명**: 결제 완료 후 리턴 URL
   - **입력값**: 
     - 개발: `http://localhost:3000/api/payment/callback`
     - 운영: `https://yourdomain.com/api/payment/callback`

3. **Notify URL 설정**
   - **항목명**: 서버 통지 URL
   - **입력값**: 
     - 개발 (ngrok): `https://your-ngrok-domain.ngrok.io/api/payment/notify`
     - 운영: `https://yourdomain.com/api/payment/notify`

4. **저장 버튼 클릭**

### 방법 2: 고객센터에 설정 요청

관리자 페이지에서 직접 설정이 안 되는 경우:

1. **연락처**
   - 가맹점 문의: **1661-0948**
   - 이메일: wp@welcomepayments.co.kr

2. **요청 내용**
   ```
   안녕하세요, 가맹점 [상호명] (MID: wpcrdot200) 입니다.
   
   결제 연동을 위해 다음과 같이 콜백 URL 설정을 요청드립니다:
   
   1. Return URL: https://yourdomain.com/api/payment/callback
   2. Notify URL: https://yourdomain.com/api/payment/notify
   
   설정 완료 후 회신 부탁드립니다.
   감사합니다.
   ```

---

## 🔄 테스트 환경 vs 운영 환경

### 개발/테스트 환경

#### localhost 테스트 (Return URL만 가능)

```bash
# .env.local
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**설정값**:
- Return URL: `http://localhost:3000/api/payment/callback`
- Notify URL: ❌ localhost 사용 불가

#### ngrok을 사용한 테스트 (권장)

1. **ngrok 설치 및 실행**
   ```bash
   # ngrok 설치 (Mac)
   brew install ngrok
   
   # 또는 직접 다운로드
   # https://ngrok.com/download
   
   # ngrok 실행 (3000포트 포워딩)
   ngrok http 3000
   ```

2. **ngrok URL 확인**
   ```
   Forwarding  https://abc123.ngrok.io -> http://localhost:3000
   ```

3. **환경 변수 설정**
   ```bash
   # .env.local
   NEXT_PUBLIC_BASE_URL=https://abc123.ngrok.io
   ```

4. **웰컴페이먼츠에 등록**
   - Return URL: `https://abc123.ngrok.io/api/payment/callback`
   - Notify URL: `https://abc123.ngrok.io/api/payment/notify`

### 운영 환경

**Vercel 배포 후**:

```bash
# .env (Vercel 환경 변수)
NEXT_PUBLIC_BASE_URL=https://your-production-domain.com
```

**웰컴페이먼츠에 등록**:
- Return URL: `https://your-production-domain.com/api/payment/callback`
- Notify URL: `https://your-production-domain.com/api/payment/notify`

---

## 🧪 콜백 URL 테스트 방법

### 1. 로컬에서 API 엔드포인트 확인

```bash
# Callback API 테스트
curl -X POST http://localhost:3000/api/payment/callback \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "orderId=TEST_ORDER_123" \
  -d "resultCode=0000" \
  -d "resultMsg=SUCCESS" \
  -d "amount=10000" \
  -d "signature=test_signature"

# Notify API 테스트
curl -X POST http://localhost:3000/api/payment/notify \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "orderId=TEST_ORDER_123" \
  -d "resultCode=0000" \
  -d "resultMsg=SUCCESS" \
  -d "amount=10000" \
  -d "signature=test_signature"
```

### 2. 실제 결제 테스트

1. 결제 페이지에서 소액 결제 진행 (1,000원 추천)
2. 결제 완료 후 콜백이 정상적으로 호출되는지 확인
3. 서버 로그에서 다음 메시지 확인:
   ```
   [Payment Callback] Received: { orderId: '...', resultCode: '0000', ... }
   ```

---

## 🐛 트러블슈팅

### 문제 1: 콜백이 호출되지 않음

**원인**:
- URL이 잘못 등록됨
- 서버가 실행되지 않음
- 방화벽/보안 그룹 차단

**해결**:
1. 웰컴페이먼츠 관리자 페이지에서 URL 확인
2. 서버 실행 상태 확인 (`npm run dev`)
3. ngrok 실행 확인
4. Vercel 배포 상태 확인

### 문제 2: "Signature mismatch" 오류

**원인**:
- SignKey가 올바르지 않음
- 서명 검증 로직 오류

**해결**:
1. `.env.local` 파일의 `PG_SIGNKEY` 확인
2. 인증/비인증 구분 확인

```bash
# 인증 결제
PG_SIGNKEY=SGI2dkFzRFc1WHp6K1VTOFVUS3dGdz09

# 비인증 결제
PG_SIGNKEY_NON_AUTH=SCtXOVVtV2o4TU1RN1hONHRlNWVTQT09
```

### 문제 3: 결제는 성공했는데 DB에 저장 안 됨

**원인**:
- 결제 요청 시 DB에 pending 상태로 저장되지 않음
- orderId가 일치하지 않음

**해결**:
1. 결제 요청 API 로그 확인
2. DB에 해당 orderId가 있는지 확인:
   ```sql
   SELECT * FROM "Payment" WHERE "orderId" = 'ORDER_...';
   ```

### 문제 4: localhost에서 Notify URL이 호출 안 됨

**원인**:
- 웰컴페이먼츠 서버가 localhost에 접근할 수 없음

**해결**:
- ngrok을 사용하여 공개 URL 생성
- 또는 운영 서버에 배포 후 테스트

---

## 📞 지원 문의

### 웰컴페이먼츠 고객센터
- **가맹점 문의**: 1661-0948
- **이메일**: wp@welcomepayments.co.kr
- **운영 시간**: 평일 09:00 - 18:00

### 자주 묻는 질문

**Q: 콜백 URL을 여러 개 등록할 수 있나요?**  
A: 일반적으로 하나의 URL만 등록 가능합니다. 환경별로 다른 URL이 필요한 경우 고객센터에 문의하세요.

**Q: 결제 시마다 다른 콜백 URL을 사용할 수 있나요?**  
A: 결제 요청 파라미터에 `returnUrl`, `notifyUrl`을 포함하면 동적으로 설정 가능합니다. (웰컴페이먼츠 정책 확인 필요)

**Q: HTTPS가 필수인가요?**  
A: 운영 환경에서는 HTTPS가 강력히 권장됩니다. 개발 환경에서는 HTTP도 가능하지만, Notify URL은 외부 접근이 가능해야 합니다.

---

## ✅ 체크리스트

설정 완료 후 다음 항목을 확인하세요:

- [ ] 웰컴페이먼츠 관리자 페이지 로그인 성공
- [ ] Return URL 등록 완료
- [ ] Notify URL 등록 완료 (운영 환경 또는 ngrok)
- [ ] 환경 변수 설정 완료 (`.env.local` 또는 Vercel)
- [ ] 서버 실행 확인
- [ ] 테스트 결제 진행
- [ ] 콜백 호출 로그 확인
- [ ] DB에 결제 정보 저장 확인

---

**작성일**: 2025-12-03  
**버전**: 1.0
