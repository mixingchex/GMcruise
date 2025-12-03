# 웰컴페이먼츠 콜백 URL 빠른 설정 가이드

## 🚀 빠른 시작 (3단계)

### 1️⃣ 관리자 페이지 로그인
- **URL**: http://wbiz.paywelcome.co.kr
- **MID (인증)**: wpcrdot200
- **MID (비인증)**: wpcrdot300
- **비밀번호 (비인증)**: Ronaldo7@@

### 2️⃣ 콜백 URL 등록
```
메뉴: 가맹점 설정 → 결제 설정 → 통지 URL 설정
```

**개발 환경 (localhost 테스트)**:
- Return URL: `http://localhost:3000/api/payment/callback`
- Notify URL: ⚠️ localhost 사용 불가 (ngrok 필요)

**운영 환경**:
- Return URL: `https://yourdomain.com/api/payment/callback`
- Notify URL: `https://yourdomain.com/api/payment/notify`

### 3️⃣ ngrok 설정 (개발 환경 필수)

```bash
# ngrok 실행
ngrok http 3000

# 출력된 URL 확인
# Forwarding: https://abc123.ngrok.io -> http://localhost:3000

# .env.local 수정
NEXT_PUBLIC_BASE_URL=https://abc123.ngrok.io
```

**웰컴페이먼츠에 등록**:
- Return URL: `https://abc123.ngrok.io/api/payment/callback`
- Notify URL: `https://abc123.ngrok.io/api/payment/notify`

---

## 🔍 현재 콜백 URL 확인

우리 서버의 콜백 엔드포인트:

### Callback API (GET/POST)
- **경로**: `/api/payment/callback`
- **역할**: 결제 완료 후 사용자를 리다이렉트하고 결제 결과 처리
- **메서드**: GET (리다이렉트), POST (Form Data)

### Notify API (POST)
- **경로**: `/api/payment/notify`
- **역할**: 서버 간 통신으로 결제 결과를 안전하게 수신
- **메서드**: POST (Form Data)

---

## 📞 설정이 안 되면?

**전화 문의**:
- 가맹점 문의: **1661-0948**

**요청 템플릿**:
```
안녕하세요, 가맹점 (MID: wpcrdot200) 입니다.

콜백 URL 설정을 요청드립니다:
1. Return URL: https://yourdomain.com/api/payment/callback
2. Notify URL: https://yourdomain.com/api/payment/notify

감사합니다.
```

---

## ✅ 설정 완료 후 테스트

```bash
# 결제 테스트 URL
http://localhost:3000/products/PAYMENT-TEST-1000/payment

# 또는 (ngrok 사용 시)
https://abc123.ngrok.io/products/PAYMENT-TEST-1000/payment
```

**확인 사항**:
1. 결제 진행 → 웰컴페이먼츠 결제창 표시
2. 결제 완료 → 우리 사이트로 리다이렉트
3. 서버 로그에 `[Payment Callback] Received` 메시지 확인
4. DB에서 결제 정보 확인

---

**상세 가이드**: [welcomepayments-callback-setup.md](./welcomepayments-callback-setup.md)
