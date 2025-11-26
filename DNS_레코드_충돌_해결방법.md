# DNS 레코드 충돌 해결 방법

> **문제**: `www` 호스트에 CNAME 레코드가 2개 있어서 충돌 발생  
> **도메인**: cruisedot.co.kr  
> **작성일**: 2025년 1월 28일

---

## 🔴 문제 발견

### 현재 DNS 레코드 상태

**충돌하는 레코드:**

1. **Record 3 (문제):**
   - 타입: CNAME
   - 호스트: `www`
   - 값: `real-alb-49294726.ap-northeast-2.elb.amazonaws.com.` (AWS ALB)
   - TTL: 600

2. **Record 7 (올바름):**
   - 타입: CNAME
   - 호스트: `www`
   - 값: `0c4366fa8579be62.vercel-dns-016.com.` (Vercel)
   - TTL: 600

### 문제점
- **같은 호스트(`www`)에 대해 CNAME 레코드가 2개** 있어서 DNS 충돌 발생
- DNS가 어떤 레코드를 사용해야 할지 혼란스러워함
- SSL 인증서 생성 실패의 원인

---

## ✅ 해결 방법

### 1단계: AWS ALB를 가리키는 `www` CNAME 레코드 삭제

1. **가비아 DNS 관리 페이지** 접속
2. **"레코드 수정"** 버튼 클릭
3. **Record 3** 찾기:
   - 호스트: `www`
   - 값: `real-alb-49294726.ap-northeast-2.elb.amazonaws.com.`
4. **이 레코드 삭제**
5. **저장**

### 2단계: Vercel을 가리키는 `www` CNAME 레코드만 남기기

**최종 상태:**
- ✅ **Record 7만 남기기:**
  - 타입: CNAME
  - 호스트: `www`
  - 값: `0c4366fa8579be62.vercel-dns-016.com.` (Vercel)
  - TTL: 600

### 3단계: 루트 도메인(`@`) 확인 (선택사항)

**현재 상태:**
- Record 2: `@` → `real-alb-49294726.ap-northeast-2.elb.amazonaws.com.` (AWS ALB)

**참고:**
- 루트 도메인(`cruisedot.co.kr`)은 AWS ALB를 사용 중일 수 있습니다
- `www.cruisedot.co.kr`만 Vercel을 사용하려면 `@` 레코드는 그대로 두어도 됩니다
- 루트 도메인도 Vercel을 사용하려면 `@` 레코드도 변경 필요

---

## 🔍 DNS 레코드 정리 후 확인

### 최종 레코드 구성 (권장)

#### Vercel 사용 (`www.cruisedot.co.kr`)
- ✅ CNAME: `www` → `0c4366fa8579be62.vercel-dns-016.com.`

#### 기타 레코드 (유지)
- ✅ CNAME: `_3bb7ba3ce95d0844ba137149b995a3a1` → (AWS 인증서 검증용)
- ✅ CNAME: `@` → `real-alb-49294726.ap-northeast-2.elb.amazonaws.com.` (AWS ALB - 루트 도메인)
- ✅ TXT: `@` → Google 사이트 인증
- ✅ CNAME: `wzfr7l2kapol` → Google 호스팅
- ✅ MX: `@` → Google 메일

---

## ⏳ DNS 전파 대기

### 변경 후 대기 시간
1. **DNS 레코드 삭제/수정** 완료
2. **DNS 전파 대기**: 보통 몇 시간~24시간 (최대 48시간)
3. **온라인 도구로 확인**: https://dnschecker.org/
   - 도메인: `www.cruisedot.co.kr`
   - 레코드 타입: CNAME
   - 값: `0c4366fa8579be62.vercel-dns-016.com.`만 보여야 함

### DNS 전파 확인
- 전 세계 DNS 서버에서 올바른 값이 반영되었는지 확인
- 모든 지역에서 `0c4366fa8579be62.vercel-dns-016.com.`만 보여야 함
- `real-alb-49294726.ap-northeast-2.elb.amazonaws.com.`는 보이지 않아야 함

---

## 🔄 Vercel에서 재시도

### DNS 전파 완료 후
1. **Vercel 대시보드** > **Settings** > **Domains**
2. **www.cruisedot.co.kr** 도메인 찾기
3. **"새로 고치다" (Refresh)** 버튼 클릭
4. **SSL 인증서 발급 대기** (보통 몇 분~몇 시간)

---

## ✅ 확인 체크리스트

### DNS 레코드 정리
- [ ] AWS ALB를 가리키는 `www` CNAME 레코드 삭제 완료
- [ ] Vercel을 가리키는 `www` CNAME 레코드만 남음
- [ ] DNS 변경사항 저장 완료

### DNS 전파 확인
- [ ] 온라인 도구로 DNS 전파 확인
- [ ] 전 세계 DNS 서버에서 올바른 값 반영 확인
- [ ] 충돌하는 레코드가 더 이상 보이지 않음

### SSL 인증서 발급
- [ ] Vercel에서 "새로 고치다" 버튼 클릭
- [ ] SSL 인증서 발급 완료
- [ ] https://www.cruisedot.co.kr 접속 확인

---

## 📝 참고 사항

### DNS 레코드 충돌
- 같은 호스트에 대해 여러 CNAME 레코드가 있으면 안 됩니다
- DNS는 어떤 레코드를 사용해야 할지 혼란스러워합니다
- SSL 인증서 생성 실패의 주요 원인입니다

### 루트 도메인 vs 서브도메인
- `@` (루트 도메인): `cruisedot.co.kr`
- `www` (서브도메인): `www.cruisedot.co.kr`
- 각각 다른 서비스를 가리킬 수 있습니다

### AWS ALB 사용 중인 경우
- 루트 도메인(`cruisedot.co.kr`)은 AWS ALB를 계속 사용할 수 있습니다
- `www.cruisedot.co.kr`만 Vercel을 사용하려면 `www` 레코드만 수정하면 됩니다

---

**작성자**: AI Assistant  
**상태**: DNS 레코드 충돌 발견 및 해결 방법 제시  
**다음 단계**: 가비아 DNS 관리에서 충돌하는 레코드 삭제



