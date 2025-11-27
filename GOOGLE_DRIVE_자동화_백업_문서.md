# Google Drive 자동화 백업 문서

**작성일**: 2025-01-20  
**목적**: Google Drive 자동화 설정 값 백업 및 관리자 패널 설정 가이드

---

## 📋 환경 변수 전체 목록

### 1. Google Drive 인증 정보

```bash
GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL=cruisedot@cruisedot-478810.iam.gserviceaccount.com
GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDSx3+3kmQu1+Sb
1re2ekXRS0QGorxZ2C0fiQ8nCnWWHxXNZKnVlQhE5YI7K5qjCsfnPNuylQTKTKdr
9f0wGOpwsX33FWmzQs8dJLALZvaVyCr8RTehIFAEi3RfDx7HC5XASNZuVGD3g36g
8zs3qAGU22oT0nc67r5RxJ8+dST41Qq36t7UK4Fi1ScdmTBRgpuIyeFjKdc3obAz
TtNqAdUUxe1BIxxGBonD5x/S5HkvZ0p83vE7767s6n7JfGC1xScaFDX5wTTFRlw/
UetEy1UGeYos9C+k5VrPE1WGT/YqFk5/LnSyXGpJAylnhY3fszwglvAN7x1VR1cy
z+FW/WHJAgMBAAECggEAJyTroCDswBJSH2rp5Vah3rOWp5DTX/AYuTGQAdUcb0vI
lcNrEwJBbeIdpHV9m2fmJhiUSH8KS7OeqBsf8S2/ZDxiQ1/TqHnw0t28X/G4O6rX
6M/F/ANvONjZPMonEhohrnsYb5b2ByGBg8yII9bsrENvWM0OXYB3EeJtHIFO43L+
1q8c5TLppCWhDcqokR5cm25mXIY919lgeqITMKUqDv+FXtQbRT+sfxM1rLnhF/vS
ZC2P+NMeOTbgI6LWrl7pnchumtJMWjN5uTW3Xj1fyfYWuIvYW/PbhvdMECm7Okoy
RBXeSZZ5iRgyPdAdwWRob8mLCnGONFZpQZQexLxVbQKBgQDyL7jS/CJvT7h4g0th
7l4AXrJ3c05a9XKXRUNGURnOpB5C0tOheKlDCxc0xFgmN1Ywnc+fZ3c+pS8spBFl
uO5IeKqaNncozMWDuPnXuWMHJtL1dPmq9rDapaXqiL5gg6sFvzvcGxvUlIYLUfaU
S+gkAdAemNuDXJyu2qo5zU68mwKBgQDezS/N9NsCp+CFjq2reechcoKQOD4KhyYG
ZigIzUMV+wB2PTqiIKiaW1hTjZm57m9oaSre2iXL6qfro35opwfg0w0Cp2aV8M8C
HWXs4r6P+aab0I4SLYRVh8mxFfjUj6bcVjAXKVXuaa2HoXIKsB9GOMZLxJz1UpKF
AhHVX4H3awKBgApZ0ctqrUoWnSrBacpgtrHLWlNSoUmv7drbQfnSY4j6aLSwcA0Z
rBpKcg52SdIwUUW4qPQGJwmNY8vDo162nbCJP7lhlIww3Ew57quyp7HZjfChtD4D
VyGxLLsuZvyXBAs11igdHH5kbqozMZe6+sv3K97y54bgwW2TuOzJgpD7AoGAeEFN
lR+c+lD8OXoqOMyiOQZifE8vBWWu23NWFnIbzIhe1nLz68Au4Kl/AhICsD2GuldR
QVmDXw33tpLXTssg0HN5qT4Le9CvGtgdRH+aFYHNMHqfxCX3MGcLMN7IIIqsqG6I
pGe2LumxNOyp7iTjrHZGaWzkvvDjjpDwaTeUoaMCgYA+lctcnEgm02WsJ1Buumck
HmKoTpMpgHCmyiW6thC9fZiMejVRz2yyBAnoBf6UoFJVN8R85JnJTmbrQsBqxKXY
5BK2BSuXcLgD5Rl/9p2pwrtU+ysVtyuEB1a5/G1mhCsz8gBWNyKSwgySx89UNEh/
aMakUu0GbPWLXekVpMWjSw==
-----END PRIVATE KEY-----
GOOGLE_DRIVE_SHARED_DRIVE_ID=0AJVz1C-KYWR0Uk9PVA
GOOGLE_DRIVE_ROOT_FOLDER_ID=0AJVz1C-KYWR0Uk9PVA
```

### 2. Google Sheets 스프레드시트 ID

```bash
COMMUNITY_BACKUP_SPREADSHEET_ID=1Le6IPNzyvMqpn-6ZnqgvH0JTQ8O5rKymWMU_pkfbQ5Q
TRIP_APIS_ARCHIVE_SPREADSHEET_ID=185t2eIIPDsEm-QW9KmhTbxkrywFJhGdk
```

### 3. Google Drive 폴더 ID (기능별)

```bash
# 여권 제출
GOOGLE_DRIVE_PASSPORT_FOLDER_ID=1Nen5t7rE8WaT9e4xWswSiUNJIcgMiDRF

# 업로드 파일들
GOOGLE_DRIVE_UPLOADS_IMAGES_FOLDER_ID=1fWbPelIoftl1DqXLayZNle7z-DSYzvl8
GOOGLE_DRIVE_UPLOADS_PROFILES_FOLDER_ID=13roFq5i51155_DG4MR74dqyWrR6GRAG9
GOOGLE_DRIVE_UPLOADS_REVIEWS_FOLDER_ID=1E5iho6Ud7wFLs3Nkp3LGHMKXoN7MYVpO
GOOGLE_DRIVE_UPLOADS_AUDIO_FOLDER_ID=1XfdoQrODfjZOaQzV6X859fE2mCG4QuwY
GOOGLE_DRIVE_UPLOADS_DOCUMENTS_FOLDER_ID=1YEsNRV2MQT5nSjtMniVcEVsECUeCgLBz
GOOGLE_DRIVE_UPLOADS_VIDEOS_FOLDER_ID=1VAZ9bOEV47keU-mJNhlwlgGHi6ONaFFI
GOOGLE_DRIVE_UPLOADS_SALES_AUDIO_FOLDER_ID=1g8vNIeXEVHkavQnlBAXsBMkVZB_Y29Fk
GOOGLE_DRIVE_UPLOADS_FONTS_FOLDER_ID=1LgxTEm_1pue1XFduypj9YnMStCarxfOt

# 계약서 PDF
GOOGLE_DRIVE_CONTRACTS_PDFS_FOLDER_ID=1pWt8VN9WD_79eJcp4_SmFfbekMOcykTT

# 제품 이미지
GOOGLE_DRIVE_PRODUCTS_FOLDER_ID=18YuEBt313yyKI3F7PSzjFFRF3Af-bVPH

# 크루즈 정보 사진
GOOGLE_DRIVE_CRUISE_IMAGES_FOLDER_ID=17QT8_NTQXpOzcfaZ3silp-hqD0sgOAck

# 어필리에이트 문서
GOOGLE_DRIVE_CONTRACTS_FOLDER_ID=1HN-w4tNLdmfW5K5N3zF52P_InrUdBkQ_
GOOGLE_DRIVE_CONTRACT_SIGNATURES_FOLDER_ID=1PcdSnWQ3iCdd87Y-UI_63HSjlYqcFGyX
GOOGLE_DRIVE_CONTRACT_AUDIO_FOLDER_ID=1dhTmPheRvOsc0V0ukpKOqD2Ry1IN-OrH
GOOGLE_DRIVE_ID_CARD_FOLDER_ID=1DFWpAiS-edjiBym5Y5AonDOl2wXyuDV0
GOOGLE_DRIVE_BANKBOOK_FOLDER_ID=1IjNSTTTBjU9NZE6fm6DeAAHBx4puWCRl

# 추가 폴더
GOOGLE_DRIVE_COMPANY_LOGO_FOLDER_ID=1s3dL8SCPHlsG8qcVo4TzG6MFvdql4bYf
GOOGLE_DRIVE_AFFILIATE_INFO_FOLDER_ID=1vPvuzpdNqGd1JAUK3zNMVkcF_9kRQMGI
```

---

## 🤖 Google Drive 자동화 기능 상세 설명

### 1. 여권 업로드 자동화
**트리거**: 고객이 여권 이미지 업로드 시 (`/api/customer/passport-upload`)  
**저장 위치**: `GOOGLE_DRIVE_PASSPORT_FOLDER_ID`  
**폴더 구조**: 
- 최상위: `여권제출폴더` (ID: `1Nen5t7rE8WaT9e4xWswSiUNJIcgMiDRF`)
- 하위: `reservation_{reservationId}` 폴더 자동 생성
- 파일명: `passport_{reservationId}_{timestamp}.{ext}`

**설명**: 고객이 여권을 업로드하면 예약 ID별로 폴더가 자동 생성되고, 해당 폴더에 여권 이미지가 저장됩니다. 이후 APIS 스프레드시트에 여권 링크가 자동으로 기록됩니다.

---

### 2. APIS 스프레드시트 자동 생성
**트리거**: 여행 생성 시 또는 `syncApisSpreadsheet(tripId)` 호출 시  
**템플릿**: `COMMUNITY_BACKUP_SPREADSHEET_ID` (구매자APIS 시트)  
**저장 위치**: `TRIP_APIS_ARCHIVE_SPREADSHEET_ID` 폴더 (`185t2eIIPDsEm-QW9KmhTbxkrywFJhGdk`)  
**폴더 구조**:
- 여행별 폴더: `{크루즈명} - {출항일}` 형식으로 자동 생성
- 스프레드시트: `APIS - {크루즈명} - {출항일}` 형식으로 생성
- Trip 레코드에 `spreadsheetId`, `googleFolderId` 저장

**설명**: 여행이 생성되면 구매자APIS 템플릿을 복제하여 여행별 APIS 스프레드시트를 자동 생성합니다. 승객 정보와 여권 제출 상태가 자동으로 동기화되며, 여권 파일 링크는 X열(비고)에 기록됩니다.

---

### 3. 계약서 PDF 자동 백업
**트리거**: 계약서 PDF 생성 시 (`lib/affiliate/contract-pdf.ts`)  
**저장 위치**: `GOOGLE_DRIVE_CONTRACTS_PDFS_FOLDER_ID` (또는 DB 설정값)  
**파일명**: 계약서별 고유 파일명

**설명**: 어필리에이트 계약서 PDF가 생성되면 자동으로 Google Drive에 백업됩니다. 서버 저장과 동시에 Drive에도 저장되어 이중 백업이 보장됩니다.

---

### 4. 제품 이미지 자동 업로드
**트리거**: 관리자가 제품 이미지 업로드 시 (`/api/admin/mall/upload`)  
**저장 위치**: `GOOGLE_DRIVE_PRODUCTS_FOLDER_ID`  
**폴더 구조**:
- 상품 코드별 폴더 자동 생성
- 카테고리/하위 폴더 구조 유지

**설명**: 크루즈몰 제품 이미지를 업로드하면 상품 코드별로 폴더가 자동 생성되고, 해당 폴더에 이미지가 저장됩니다. 공개 설정으로 외부에서도 접근 가능합니다.

---

### 5. 크루즈 정보 사진 자동 업로드
**트리거**: 관리자가 크루즈 정보 사진 업로드 시 (`/api/admin/mall/upload`)  
**저장 위치**: `GOOGLE_DRIVE_CRUISE_IMAGES_FOLDER_ID` (설정 시)  
**설명**: 크루즈 정보 사진을 업로드하면 Google Drive에 자동으로 백업됩니다. 카테고리별 폴더 구조가 유지됩니다.

---

### 6. 데이터베이스 자동 백업
**트리거**: 매일 정해진 시간 (스케줄러)  
**저장 위치**: Google Drive 루트 또는 지정 폴더  
**형식**: Excel 파일 (`.xlsx`)  
**백업 대상 테이블**:
- User, Trip, Reservation, Traveler
- AffiliateProfile, AffiliateSale, AffiliateLead
- AffiliateProduct, AffiliateLedger
- PassportSubmission, CommunityUser
- CustomerReview, ChatHistory, AdminActionLog

**설명**: 매일 자동으로 주요 데이터베이스 테이블을 Excel 파일로 변환하여 Google Drive에 백업합니다. 각 테이블별로 별도 파일이 생성됩니다.

---

### 7. 지급명세서 자동 생성 및 발송
**트리거**: 매월 1일 자동 실행 (스케줄러)  
**저장 위치**: `Payslips_{YYYY-MM}` 폴더 자동 생성  
**파일명**: `Payslip_{판매원명}_{기간}.pdf`

**설명**: 매월 1일에 전월 승인된 지급명세서를 자동으로 PDF 생성하여 Google Drive에 저장하고, 판매원에게 이메일로 발송합니다.

---

### 8. 어필리에이트 문서 자동 업로드
**트리거**: 판매원이 신분증/통장 사본 업로드 시 (`/api/affiliate/profile/upload-documents`)  
**저장 위치**: 
- 신분증: `GOOGLE_DRIVE_ID_CARD_FOLDER_ID` = `1DFWpAiS-edjiBym5Y5AonDOl2wXyuDV0`
- 통장: `GOOGLE_DRIVE_BANKBOOK_FOLDER_ID` = `1IjNSTTTBjU9NZE6fm6DeAAHBx4puWCRl`

**설명**: 판매원이 신분증 또는 통장 사본을 업로드하면 문서 타입별로 지정된 Google Drive 폴더에 자동 저장됩니다.

### 8-1. 계약서 관련 자동 업로드
**트리거**: 계약서 생성/서명/녹음 파일 업로드 시  
**저장 위치**:
- 계약서: `GOOGLE_DRIVE_CONTRACTS_FOLDER_ID` = `1HN-w4tNLdmfW5K5N3zF52P_InrUdBkQ_`
- 계약서 서명 이미지: `GOOGLE_DRIVE_CONTRACT_SIGNATURES_FOLDER_ID` = `1PcdSnWQ3iCdd87Y-UI_63HSjlYqcFGyX`
- 계약서 녹음 파일: `GOOGLE_DRIVE_CONTRACT_AUDIO_FOLDER_ID` = `1dhTmPheRvOsc0V0ukpKOqD2Ry1IN-OrH`

**설명**: 계약서 생성, 서명 이미지, 녹음 파일이 각각 지정된 Google Drive 폴더에 자동 저장됩니다.

---

### 9. 커뮤니티 이미지 자동 업로드
**트리거**: 커뮤니티 게시글/댓글/리뷰에 이미지 첨부 시  
**저장 위치**: `COMMUNITY_IMAGES_FOLDER_ID` (환경변수 또는 DB 설정)  
**설명**: 커뮤니티 게시글, 댓글, 리뷰에 첨부된 이미지가 자동으로 Google Drive에 업로드되어 백업됩니다.

---

### 10. 업로드 파일 자동 마이그레이션 (예정)
**트리거**: `npm run migrate:uploads` 스크립트 실행  
**저장 위치**: 
- `GOOGLE_DRIVE_UPLOADS_IMAGES_FOLDER_ID`
- `GOOGLE_DRIVE_UPLOADS_PROFILES_FOLDER_ID`
- `GOOGLE_DRIVE_UPLOADS_REVIEWS_FOLDER_ID`
- `GOOGLE_DRIVE_UPLOADS_AUDIO_FOLDER_ID`
- `GOOGLE_DRIVE_UPLOADS_DOCUMENTS_FOLDER_ID`
- `GOOGLE_DRIVE_UPLOADS_VIDEOS_FOLDER_ID`
- `GOOGLE_DRIVE_UPLOADS_SALES_AUDIO_FOLDER_ID`
- `GOOGLE_DRIVE_UPLOADS_FONTS_FOLDER_ID`

**설명**: `public/uploads/**` 폴더의 모든 파일을 Google Drive로 일괄 마이그레이션하는 스크립트입니다. 서버리스 함수 크기 최적화를 위해 사용됩니다.

---

## 🔧 관리자 패널에서 설정 변경하기

1. **관리자 패널 접속**: `/admin/settings`
2. **Google Drive 설정 섹션** 찾기
3. **편집 모드** 활성화
4. **환경 변수 값 수정**
5. **저장** 클릭 → Vercel 환경 변수 자동 업데이트

**주의사항**:
- Private Key는 여러 줄 입력이 필요하므로 Vercel 환경 변수 설정 시 주의
- 폴더 ID 변경 시 기존 파일은 수동으로 이동 필요
- 스프레드시트 ID 변경 시 기존 데이터 마이그레이션 필요

---

## 📝 폴더 ID 확인 방법

1. Google Drive에서 해당 폴더 열기
2. URL에서 `folders/` 뒤의 문자열이 폴더 ID
   - 예: `https://drive.google.com/drive/folders/1fWbPelIoftl1DqXLayZNle7z-DSYzvl8`
   - 폴더 ID: `1fWbPelIoftl1DqXLayZNle7z-DSYzvl8`

---

## ⚠️ 중요 사항

1. **서비스 계정 권한**: 모든 폴더에 대한 읽기/쓰기 권한 필요
2. **공유 드라이브**: `GOOGLE_DRIVE_SHARED_DRIVE_ID` 사용 시 Shared Drive 설정 확인
3. **공개 설정**: 일부 파일은 `makePublic: true`로 설정되어 외부 접근 가능
4. **백업**: 이 문서를 정기적으로 업데이트하여 최신 상태 유지

---

**최종 업데이트**: 2025-01-20

