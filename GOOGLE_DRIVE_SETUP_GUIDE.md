# Google Drive 설정 가이드

## 📋 개요

어필리에이트 시스템에서 사용할 Google Drive 폴더 ID를 관리자 패널에서 직접 설정할 수 있습니다.

**위치**: 관리자 패널 → 시스템 → Google Drive 설정 (`/admin/system/google-drive`)

---

## 🔧 설정 방법

### 1단계: 관리자 패널 접속

1. 관리자 계정으로 로그인
2. 좌측 메뉴에서 **"Google Drive 설정"** 클릭
   - 또는 직접 URL로 접속: `/admin/system/google-drive`

### 2단계: Google Drive 폴더 ID 찾기

#### 방법 1: Google Drive 웹에서 찾기 (가장 쉬움)

1. **Google Drive 접속**
   - https://drive.google.com 에 접속
   - 업로드할 폴더를 미리 생성해둡니다

2. **폴더 열기**
   - 업로드할 폴더를 클릭하여 엽니다

3. **URL 확인**
   - 브라우저 주소창을 확인합니다
   - URL 형식: `https://drive.google.com/drive/folders/1MNOpqRSTuvwXYZabcdefghijklmno`
   - **폴더 ID**: `1MNOpqRSTuvwXYZabcdefghijklmno` (빨간색 부분)

4. **폴더 ID 복사**
   - 폴더 ID만 복사 (URL 전체가 아닌 ID 부분만)

#### 방법 2: Google Drive 공유 링크에서 찾기

1. 폴더 우클릭 → **"공유"** 선택
2. 공유 링크에서 폴더 ID 확인
   - 링크 형식: `https://drive.google.com/drive/folders/1MNOpqRSTuvwXYZabcdefghijklmno?usp=sharing`
   - **폴더 ID**: `1MNOpqRSTuvwXYZabcdefghijklmno`

### 3단계: 관리자 패널에서 설정

1. **폴더 ID 입력** (총 8개)
   - 어필리에이트 관련 (5개):
     - 신분증 업로드 폴더 ID
     - 통장 업로드 폴더 ID
     - 녹음 파일 업로드 폴더 ID
     - 계약서 PDF 폴더 ID
     - 계약서 서명 폴더 ID
   - 고객 관련 (1개):
     - 여권 제출 폴더 ID
   - 크루즈 상품 관련 (2개):
     - 크루즈정보사진 폴더 ID
     - 크루즈 자료 폴더 ID

2. **설정 저장**
   - "설정 저장하기" 버튼 클릭
   - 저장 완료 메시지 확인

**참고**: 모든 폴더는 필수 사항이며, 업로드 기능 사용 전에 반드시 설정해야 합니다.

---

## 📁 필요한 폴더

다음 8개의 폴더를 Google Drive에 미리 생성해야 합니다:

### 🔐 어필리에이트 관련 폴더 (Affiliate)

1. **신분증 업로드 폴더**
   - 용도: 판매원/대리점장이 업로드한 신분증 사본 저장
   - 권장 이름: `어필리에이트_신분증` 또는 `Affiliate_ID_Cards`
   - 카테고리: `google_drive_id_card_folder_id`

2. **통장 업로드 폴더**
   - 용도: 판매원/대리점장이 업로드한 통장 사본 저장
   - 권장 이름: `어필리에이트_통장` 또는 `Affiliate_Bankbooks`
   - 카테고리: `google_drive_bankbook_folder_id`

3. **녹음 파일 업로드 폴더**
   - 용도: 판매 확정 시 업로드되는 녹음 파일 저장
   - 권장 이름: `판매확정_녹음파일` 또는 `Sales_Audio`
   - 카테고리: `google_drive_sales_audio_folder_id`

4. **계약서 PDF 폴더**
   - 용도: 생성된 계약서 PDF 파일 저장
   - 권장 이름: `어필리에이트_계약서` 또는 `Affiliate_Contracts`
   - 카테고리: `google_drive_contracts_folder_id`
   - 파일 형식: PDF

5. **계약서 서명 폴더**
   - 용도: 판매원/대리점장이 서명한 서명 이미지 저장
   - 권장 이름: `어필리에이트_서명` 또는 `Affiliate_Signatures`
   - 카테고리: `google_drive_signatures_folder_id`
   - 파일 형식: PNG, JPG

### 🛂 고객 관련 폴더 (Customer)

6. **여권 제출 폴더**
   - 용도: 고객이 제출한 여권 사본 저장
   - 권장 이름: `고객_여권` 또는 `Customer_Passports`
   - 카테고리: `google_drive_passports_folder_id`
   - 파일 형식: PDF, PNG, JPG

### 🚢 크루즈 상품 관련 폴더 (Cruise Products)

7. **크루즈정보사진 폴더**
   - 용도: 크루즈 상품 이미지 및 사진 저장
   - 권장 이름: `크루즈정보사진` 또는 `Cruise_Product_Images`
   - 카테고리: `google_drive_cruise_images_folder_id`
   - 파일 형식: JPG, PNG, WEBP, MP4
   - 구조: 카테고리별 하위 폴더 구조 지원

8. **크루즈 자료 폴더**
   - 용도: 앞으로 업데이트될 크루즈 관련 이미지 및 자료 저장
   - 권장 이름: `크루즈자료` 또는 `Cruise_Materials`
   - 카테고리: `google_drive_cruise_materials_folder_id`
   - 파일 형식: 다양한 형식 지원

---

## 📂 권장 폴더 구조

```
Google Drive
├── 어필리에이트_신분증/              # Affiliate_ID_Cards
│   ├── 판매원_신분증/
│   └── 대리점장_신분증/
├── 어필리에이트_통장/                # Affiliate_Bankbooks
│   ├── 판매원_통장/
│   └── 대리점장_통장/
├── 판매확정_녹음파일/                # Sales_Audio
│   ├── 첫콜/
│   └── 여권안내콜/
├── 어필리에이트_계약서/              # Affiliate_Contracts
│   ├── 판매원/
│   ├── 교육계약서/
│   └── B2B계약서/
├── 어필리에이트_서명/                # Affiliate_Signatures
│   ├── 판매원/
│   ├── 교육/
│   └── B2B/
├── 고객_여권/                        # Customer_Passports
│   ├── [년도]/
│   └── [월]/
├── 크루즈정보사진/                   # Cruise_Product_Images
│   ├── MSC그란디오사/
│   ├── 로얄캐리비안 퀀텀/
│   ├── 배경/
│   └── 고객 후기 자료/
└── 크루즈자료/                       # Cruise_Materials
    ├── 이미지/
    ├── 영상/
    └── 문서/
```

---

## 🔐 권한 설정

### 서비스 계정 권한 설정

각 폴더에 서비스 계정이 접근할 수 있도록 권한을 설정해야 합니다:

1. **폴더 우클릭** → **"공유"** 선택
2. **"사용자 또는 그룹 추가"** 클릭
3. 서비스 계정 이메일 입력
   - 예: `id-657@cruisedot.iam.gserviceaccount.com`
4. 권한: **"편집자"** 또는 **"뷰어"** (업로드만 필요하면 뷰어로도 가능)
5. **"완료"** 클릭

### 서비스 계정 이메일 확인 방법

`.env` 파일에서 확인:
```
GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL=id-657@cruisedot.iam.gserviceaccount.com
```

또는 Google Cloud Console에서 확인:
1. https://console.cloud.google.com 접속
2. IAM 및 관리자 → 서비스 계정
3. 서비스 계정 목록에서 이메일 확인

---

## ⚠️ 주의사항

1. **폴더 ID 형식**
   - 올바른 형식: 알파벳, 숫자, 하이픈(-), 언더스코어(_)만 포함
   - 예: `1MNOpqRSTuvwXYZabcdefghijklmno`
   - 잘못된 형식: 공백, 특수문자 포함

2. **폴더 미리 생성**
   - 각 폴더는 설정 전에 미리 생성되어 있어야 합니다
   - 폴더가 없으면 업로드 실패

3. **권한 확인**
   - 서비스 계정이 각 폴더에 접근 권한이 있어야 합니다
   - 권한이 없으면 업로드 실패

4. **하위 호환성**
   - 기존 환경 변수 설정도 여전히 작동합니다
   - 환경 변수가 설정되어 있으면 DB 설정보다 우선합니다

---

## 🔄 환경 변수에서 DB 설정으로 마이그레이션

### 기존 방식 (환경 변수)
```env
# 어필리에이트 관련
GOOGLE_DRIVE_ID_CARD_FOLDER_ID=1MNOpqRSTuvwXYZabcdefghijklmno
GOOGLE_DRIVE_BANKBOOK_FOLDER_ID=1MNOpqRSTuvwXYZabcdefghijklmno
GOOGLE_DRIVE_SALES_AUDIO_FOLDER_ID=1MNOpqRSTuvwXYZabcdefghijklmno
GOOGLE_DRIVE_CONTRACTS_FOLDER_ID=1ABCdefghijklmnopqrstuvwxyz
GOOGLE_DRIVE_SIGNATURES_FOLDER_ID=1DEFghijklmnopqrstuvwxyzab

# 고객 관련
GOOGLE_DRIVE_PASSPORTS_FOLDER_ID=1GHIjklmnopqrstuvwxyzabcdef

# 크루즈 상품 관련
GOOGLE_DRIVE_CRUISE_IMAGES_FOLDER_ID=1JKLmnopqrstuvwxyzabcdefgh
GOOGLE_DRIVE_CRUISE_MATERIALS_FOLDER_ID=1MNOpqrstuvwxyzabcdefghij
```

### 새로운 방식 (DB 설정)
1. 관리자 패널에서 설정
2. 환경 변수는 선택 사항 (하위 호환성용)

**마이그레이션 방법**:
1. 관리자 패널에서 환경 변수 값을 그대로 입력
2. 저장 후 환경 변수 제거 가능 (권장하지 않음, 백업 용도로 유지)

---

## ❓ 문제 해결

### 업로드 실패 오류

**오류**: "업로드 폴더가 설정되지 않았습니다"

**해결**:
1. 관리자 패널에서 폴더 ID가 올바르게 설정되었는지 확인
2. 폴더 ID 형식 확인 (공백이나 특수문자 없음)
3. 서비스 계정 권한 확인

### 폴더 ID 형식 오류

**오류**: "올바른 폴더 ID 형식이 아닙니다"

**해결**:
1. URL에서 폴더 ID만 복사 (전체 URL이 아닌)
2. 앞뒤 공백 제거
3. 특수문자 확인 (하이픈, 언더스코어만 허용)

### 권한 오류

**오류**: Google Drive API 오류 (403 Forbidden)

**해결**:
1. 서비스 계정이 폴더에 접근 권한이 있는지 확인
2. 폴더 공유 설정 확인
3. Google Cloud Console에서 API 활성화 확인

---

## 📝 참고

- Google Drive API 문서: https://developers.google.com/drive/api
- 폴더 ID는 영구적으로 변경되지 않습니다 (폴더를 삭제하지 않는 한)
- 설정은 즉시 적용됩니다 (재시작 불필요)

