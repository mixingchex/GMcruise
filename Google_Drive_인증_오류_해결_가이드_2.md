# Google Drive 인증 오류 해결 가이드

**문제**: `invalid_grant: Invalid JWT Signature.` 오류 발생

---

## 🔍 현재 상황

- ✅ Private Key 형식: 올바름 (1707자, 28줄)
- ✅ 환경변수 로드: 정상
- ❌ Google 인증: 실패 (JWT Signature 오류)

---

## 🔧 해결 방법

### 방법 1: Google Cloud Console에서 새 서비스 계정 키 생성 (권장)

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com/
   - 프로젝트: `cruisedot-478810`

2. **서비스 계정 확인**
   - IAM 및 관리자 → 서비스 계정
   - `cruisedot@cruisedot-478810.iam.gserviceaccount.com` 확인

3. **새 키 생성**
   - 서비스 계정 클릭 → 키 탭
   - 키 추가 → 새 키 만들기
   - JSON 형식 선택
   - 다운로드

4. **새 Private Key 추출**
   ```bash
   # 다운로드한 JSON 파일에서
   cat service-account-key.json | jq -r '.private_key'
   ```

5. **.env.local 업데이트**
   ```bash
   # 새 Private Key로 교체
   GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
   ```

### 방법 2: 서비스 계정 권한 확인

1. **Google Drive API 활성화 확인**
   - API 및 서비스 → 사용 설정된 API
   - "Google Drive API" 활성화 확인

2. **서비스 계정 권한 확인**
   - Google Drive → 공유 드라이브
   - 서비스 계정에 "콘텐츠 관리자" 권한 부여

3. **도메인 전체 위임 확인** (필요시)
   - 서비스 계정 → 도메인 전체 위임
   - Google Workspace 관리자가 승인 필요

---

## 📝 임시 해결책

현재 마이그레이션은 인증 오류로 진행할 수 없습니다. 다음 중 하나를 선택하세요:

### 옵션 A: 새 서비스 계정 키 생성 후 재시도
1. Google Cloud Console에서 새 키 생성
2. `.env.local` 업데이트
3. 마이그레이션 재시도

### 옵션 B: 수동 마이그레이션
1. Google Drive 웹 인터페이스에서 직접 업로드
2. 데이터베이스 경로만 수동으로 업데이트

### 옵션 C: 마이그레이션 일시 중단
1. 현재 상태 유지
2. 서비스 계정 문제 해결 후 재시도

---

## 🔍 디버깅 정보

현재 Private Key 상태:
- 길이: 1707자
- 줄 수: 28줄
- 형식: PKCS#8 (올바름)
- BEGIN/END: 있음

인증 오류 원인:
- Private Key가 만료되었거나
- 서비스 계정이 삭제되었거나
- Google Drive API 권한이 없을 수 있음

---

**다음 단계를 선택해주세요:**
1. 새 서비스 계정 키 생성
2. 수동 마이그레이션
3. 다른 해결 방법 시도


