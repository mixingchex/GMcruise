# Google Workspace 통합 계획

## 목표
모든 파일 저장을 Google Drive로 통합하여 서버 저장 공간 절약 및 백업 자동화

## 저장할 파일 유형

### 1. 계약서 관련
- ✅ 계약서 PDF 파일
- ✅ 계약서 싸인 이미지
- ✅ 신분증 이미지 (idCard)
- ✅ 통장 사본 이미지 (bankbook)

### 2. 판매 확정 관련
- ✅ 고객 통화 녹음 파일 (sales-audio)

### 3. 관리자 업로드 파일
- ✅ 이미지 파일 (mall/images)
- ✅ 영상 파일 (mall/videos)
- ✅ 폰트 파일 (mall/fonts)
- ✅ 크루즈 정보 사진 (크루즈정보사진)

### 4. 데이터 백업
- ✅ 데이터베이스 백업 파일
- ✅ 로그 파일
- ✅ 설정 파일

## Google Drive 폴더 구조

```
공유 드라이브/
├── 계약서/
│   ├── PDF/
│   ├── 싸인/
│   ├── 신분증/
│   └── 통장사본/
├── 판매확정/
│   └── 녹음파일/
├── 관리자업로드/
│   ├── 이미지/
│   ├── 영상/
│   ├── 폰트/
│   └── 크루즈정보사진/
└── 백업/
    ├── 데이터베이스/
    ├── 로그/
    └── 설정/
```

## 구현 단계

### Phase 1: Google Workspace 설정 (필수)
1. 도메인 인증 완료
2. 공유 드라이브 생성
3. 서비스 계정을 공유 드라이브 멤버로 추가
4. 폴더 구조 생성

### Phase 2: 파일 업로드 함수 통합
1. `lib/google-drive.ts`에 범용 업로드 함수 추가
2. 폴더별 업로드 함수 생성
3. 기존 서버 저장 코드를 Google Drive로 전환

### Phase 3: 각 기능별 통합
1. 계약서 PDF 생성 → Google Drive 저장
2. 계약서 싸인 이미지 → Google Drive 저장
3. 판매 확정 녹음 파일 → Google Drive 저장
4. 관리자 업로드 파일 → Google Drive 저장

### Phase 4: 백업 자동화
1. 데이터베이스 백업 스크립트
2. 정기 백업 스케줄 설정
3. Google Drive에 자동 업로드

## 환경 변수 설정

```env
# Google Drive 설정
GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL=id-657@cruisedot.iam.gserviceaccount.com
GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_SHARED_DRIVE_ID=0ABC123xyz...  # 공유 드라이브 ID

# 폴더 ID들
GOOGLE_DRIVE_CONTRACTS_FOLDER_ID=1ABC...     # 계약서 폴더
GOOGLE_DRIVE_SIGNATURES_FOLDER_ID=1DEF...    # 싸인 폴더
GOOGLE_DRIVE_IDCARDS_FOLDER_ID=1GHI...       # 신분증 폴더
GOOGLE_DRIVE_BANKBOOKS_FOLDER_ID=1JKL...     # 통장사본 폴더
GOOGLE_DRIVE_SALES_AUDIO_FOLDER_ID=1MNO...    # 판매확정 녹음 폴더
GOOGLE_DRIVE_MALL_IMAGES_FOLDER_ID=1PQR...    # 관리자 이미지 폴더
GOOGLE_DRIVE_MALL_VIDEOS_FOLDER_ID=1STU...    # 관리자 영상 폴더
GOOGLE_DRIVE_BACKUP_FOLDER_ID=1VWX...        # 백업 폴더
```

## 다음 단계

1. **Google Workspace 도메인 인증 완료** (현재 진행 중)
2. **공유 드라이브 생성 및 폴더 구조 설정**
3. **서비스 계정 권한 설정**
4. **코드 통합 작업 시작**


## 목표
모든 파일 저장을 Google Drive로 통합하여 서버 저장 공간 절약 및 백업 자동화

## 저장할 파일 유형

### 1. 계약서 관련
- ✅ 계약서 PDF 파일
- ✅ 계약서 싸인 이미지
- ✅ 신분증 이미지 (idCard)
- ✅ 통장 사본 이미지 (bankbook)

### 2. 판매 확정 관련
- ✅ 고객 통화 녹음 파일 (sales-audio)

### 3. 관리자 업로드 파일
- ✅ 이미지 파일 (mall/images)
- ✅ 영상 파일 (mall/videos)
- ✅ 폰트 파일 (mall/fonts)
- ✅ 크루즈 정보 사진 (크루즈정보사진)

### 4. 데이터 백업
- ✅ 데이터베이스 백업 파일
- ✅ 로그 파일
- ✅ 설정 파일

## Google Drive 폴더 구조

```
공유 드라이브/
├── 계약서/
│   ├── PDF/
│   ├── 싸인/
│   ├── 신분증/
│   └── 통장사본/
├── 판매확정/
│   └── 녹음파일/
├── 관리자업로드/
│   ├── 이미지/
│   ├── 영상/
│   ├── 폰트/
│   └── 크루즈정보사진/
└── 백업/
    ├── 데이터베이스/
    ├── 로그/
    └── 설정/
```

## 구현 단계

### Phase 1: Google Workspace 설정 (필수)
1. 도메인 인증 완료
2. 공유 드라이브 생성
3. 서비스 계정을 공유 드라이브 멤버로 추가
4. 폴더 구조 생성

### Phase 2: 파일 업로드 함수 통합
1. `lib/google-drive.ts`에 범용 업로드 함수 추가
2. 폴더별 업로드 함수 생성
3. 기존 서버 저장 코드를 Google Drive로 전환

### Phase 3: 각 기능별 통합
1. 계약서 PDF 생성 → Google Drive 저장
2. 계약서 싸인 이미지 → Google Drive 저장
3. 판매 확정 녹음 파일 → Google Drive 저장
4. 관리자 업로드 파일 → Google Drive 저장

### Phase 4: 백업 자동화
1. 데이터베이스 백업 스크립트
2. 정기 백업 스케줄 설정
3. Google Drive에 자동 업로드

## 환경 변수 설정

```env
# Google Drive 설정
GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL=id-657@cruisedot.iam.gserviceaccount.com
GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_SHARED_DRIVE_ID=0ABC123xyz...  # 공유 드라이브 ID

# 폴더 ID들
GOOGLE_DRIVE_CONTRACTS_FOLDER_ID=1ABC...     # 계약서 폴더
GOOGLE_DRIVE_SIGNATURES_FOLDER_ID=1DEF...    # 싸인 폴더
GOOGLE_DRIVE_IDCARDS_FOLDER_ID=1GHI...       # 신분증 폴더
GOOGLE_DRIVE_BANKBOOKS_FOLDER_ID=1JKL...     # 통장사본 폴더
GOOGLE_DRIVE_SALES_AUDIO_FOLDER_ID=1MNO...    # 판매확정 녹음 폴더
GOOGLE_DRIVE_MALL_IMAGES_FOLDER_ID=1PQR...    # 관리자 이미지 폴더
GOOGLE_DRIVE_MALL_VIDEOS_FOLDER_ID=1STU...    # 관리자 영상 폴더
GOOGLE_DRIVE_BACKUP_FOLDER_ID=1VWX...        # 백업 폴더
```

## 다음 단계

1. **Google Workspace 도메인 인증 완료** (현재 진행 중)
2. **공유 드라이브 생성 및 폴더 구조 설정**
3. **서비스 계정 권한 설정**
4. **코드 통합 작업 시작**


## 목표
모든 파일 저장을 Google Drive로 통합하여 서버 저장 공간 절약 및 백업 자동화

## 저장할 파일 유형

### 1. 계약서 관련
- ✅ 계약서 PDF 파일
- ✅ 계약서 싸인 이미지
- ✅ 신분증 이미지 (idCard)
- ✅ 통장 사본 이미지 (bankbook)

### 2. 판매 확정 관련
- ✅ 고객 통화 녹음 파일 (sales-audio)

### 3. 관리자 업로드 파일
- ✅ 이미지 파일 (mall/images)
- ✅ 영상 파일 (mall/videos)
- ✅ 폰트 파일 (mall/fonts)
- ✅ 크루즈 정보 사진 (크루즈정보사진)

### 4. 데이터 백업
- ✅ 데이터베이스 백업 파일
- ✅ 로그 파일
- ✅ 설정 파일

## Google Drive 폴더 구조

```
공유 드라이브/
├── 계약서/
│   ├── PDF/
│   ├── 싸인/
│   ├── 신분증/
│   └── 통장사본/
├── 판매확정/
│   └── 녹음파일/
├── 관리자업로드/
│   ├── 이미지/
│   ├── 영상/
│   ├── 폰트/
│   └── 크루즈정보사진/
└── 백업/
    ├── 데이터베이스/
    ├── 로그/
    └── 설정/
```

## 구현 단계

### Phase 1: Google Workspace 설정 (필수)
1. 도메인 인증 완료
2. 공유 드라이브 생성
3. 서비스 계정을 공유 드라이브 멤버로 추가
4. 폴더 구조 생성

### Phase 2: 파일 업로드 함수 통합
1. `lib/google-drive.ts`에 범용 업로드 함수 추가
2. 폴더별 업로드 함수 생성
3. 기존 서버 저장 코드를 Google Drive로 전환

### Phase 3: 각 기능별 통합
1. 계약서 PDF 생성 → Google Drive 저장
2. 계약서 싸인 이미지 → Google Drive 저장
3. 판매 확정 녹음 파일 → Google Drive 저장
4. 관리자 업로드 파일 → Google Drive 저장

### Phase 4: 백업 자동화
1. 데이터베이스 백업 스크립트
2. 정기 백업 스케줄 설정
3. Google Drive에 자동 업로드

## 환경 변수 설정

```env
# Google Drive 설정
GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL=id-657@cruisedot.iam.gserviceaccount.com
GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_SHARED_DRIVE_ID=0ABC123xyz...  # 공유 드라이브 ID

# 폴더 ID들
GOOGLE_DRIVE_CONTRACTS_FOLDER_ID=1ABC...     # 계약서 폴더
GOOGLE_DRIVE_SIGNATURES_FOLDER_ID=1DEF...    # 싸인 폴더
GOOGLE_DRIVE_IDCARDS_FOLDER_ID=1GHI...       # 신분증 폴더
GOOGLE_DRIVE_BANKBOOKS_FOLDER_ID=1JKL...     # 통장사본 폴더
GOOGLE_DRIVE_SALES_AUDIO_FOLDER_ID=1MNO...    # 판매확정 녹음 폴더
GOOGLE_DRIVE_MALL_IMAGES_FOLDER_ID=1PQR...    # 관리자 이미지 폴더
GOOGLE_DRIVE_MALL_VIDEOS_FOLDER_ID=1STU...    # 관리자 영상 폴더
GOOGLE_DRIVE_BACKUP_FOLDER_ID=1VWX...        # 백업 폴더
```

## 다음 단계

1. **Google Workspace 도메인 인증 완료** (현재 진행 중)
2. **공유 드라이브 생성 및 폴더 구조 설정**
3. **서비스 계정 권한 설정**
4. **코드 통합 작업 시작**










