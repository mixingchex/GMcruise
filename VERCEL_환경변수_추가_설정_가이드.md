# Vercel 환경변수 추가 설정 가이드

## 📋 추가할 Google Drive 폴더 ID 환경변수

다음 환경변수들을 Vercel 프로젝트 설정에 추가하세요.

### 1. Vercel 대시보드에서 설정하는 방법

1. Vercel 대시보드 접속: https://vercel.com/dashboard
2. 프로젝트 선택: `cruise-guide` (또는 해당 프로젝트)
3. **Settings** → **Environment Variables** 메뉴로 이동
4. 아래 환경변수들을 하나씩 추가:

### 2. 추가할 환경변수 목록

```bash
# 크루즈 정보 사진 (업데이트)
GOOGLE_DRIVE_CRUISE_IMAGES_FOLDER_ID=17QT8_NTQXpOzcfaZ3silp-hqD0sgOAck

# 어필리에이트 문서 (이미 추가됨, 확인 필요)
GOOGLE_DRIVE_CONTRACTS_FOLDER_ID=1HN-w4tNLdmfW5K5N3zF52P_InrUdBkQ_
GOOGLE_DRIVE_CONTRACT_SIGNATURES_FOLDER_ID=1PcdSnWQ3iCdd87Y-UI_63HSjlYqcFGyX
GOOGLE_DRIVE_CONTRACT_AUDIO_FOLDER_ID=1dhTmPheRvOsc0V0ukpKOqD2Ry1IN-OrH
GOOGLE_DRIVE_ID_CARD_FOLDER_ID=1DFWpAiS-edjiBym5Y5AonDOl2wXyuDV0
GOOGLE_DRIVE_BANKBOOK_FOLDER_ID=1IjNSTTTBjU9NZE6fm6DeAAHBx4puWCRl

# 추가 폴더 (새로 추가)
GOOGLE_DRIVE_COMPANY_LOGO_FOLDER_ID=1s3dL8SCPHlsG8qcVo4TzG6MFvdql4bYf
GOOGLE_DRIVE_AFFILIATE_INFO_FOLDER_ID=1vPvuzpdNqGd1JAUK3zNMVkcF_9kRQMGI
```

### 3. 환경별 설정

각 환경변수를 다음 환경에 적용하세요:
- ✅ **Production** (프로덕션)
- ✅ **Preview** (프리뷰)
- ✅ **Development** (개발) - 선택사항

### 4. 빠른 복사용 텍스트

Vercel 대시보드에 직접 붙여넣을 수 있도록 정리:

```
GOOGLE_DRIVE_CRUISE_IMAGES_FOLDER_ID
17QT8_NTQXpOzcfaZ3silp-hqD0sgOAck

GOOGLE_DRIVE_CONTRACTS_FOLDER_ID
1HN-w4tNLdmfW5K5N3zF52P_InrUdBkQ_

GOOGLE_DRIVE_CONTRACT_SIGNATURES_FOLDER_ID
1PcdSnWQ3iCdd87Y-UI_63HSjlYqcFGyX

GOOGLE_DRIVE_CONTRACT_AUDIO_FOLDER_ID
1dhTmPheRvOsc0V0ukpKOqD2Ry1IN-OrH

GOOGLE_DRIVE_ID_CARD_FOLDER_ID
1DFWpAiS-edjiBym5Y5AonDOl2wXyuDV0

GOOGLE_DRIVE_BANKBOOK_FOLDER_ID
1IjNSTTTBjU9NZE6fm6DeAAHBx4puWCRl

GOOGLE_DRIVE_COMPANY_LOGO_FOLDER_ID
1s3dL8SCPHlsG8qcVo4TzG6MFvdql4bYf

GOOGLE_DRIVE_AFFILIATE_INFO_FOLDER_ID
1vPvuzpdNqGd1JAUK3zNMVkcF_9kRQMGI
```

### 5. Vercel CLI로 설정하는 방법 (선택사항)

터미널에서 Vercel CLI를 사용하여 설정할 수도 있습니다:

```bash
# Vercel CLI 설치 (이미 설치되어 있으면 생략)
npm i -g vercel

# 프로젝트 디렉토리에서 로그인
vercel login

# 환경변수 추가
vercel env add GOOGLE_DRIVE_CRUISE_IMAGES_FOLDER_ID production
# 값 입력: 17QT8_NTQXpOzcfaZ3silp-hqD0sgOAck

vercel env add GOOGLE_DRIVE_COMPANY_LOGO_FOLDER_ID production
# 값 입력: 1s3dL8SCPHlsG8qcVo4TzG6MFvdql4bYf

vercel env add GOOGLE_DRIVE_AFFILIATE_INFO_FOLDER_ID production
# 값 입력: 1vPvuzpdNqGd1JAUK3zNMVkcF_9kRQMGI
```

### 6. 설정 확인

환경변수 추가 후:

1. **재배포**: 환경변수 변경 후 자동 재배포되거나, 수동으로 재배포 필요
2. **관리자 패널 확인**: `/admin/settings`에서 Google Drive 설정 섹션 확인
3. **기능 테스트**: 각 기능이 정상 작동하는지 확인

### 7. 폴더별 용도 설명

| 환경변수 | 폴더 용도 | Google Drive 링크 |
|---------|---------|------------------|
| `GOOGLE_DRIVE_CRUISE_IMAGES_FOLDER_ID` | 크루즈 정보 사진 저장 | [링크](https://drive.google.com/drive/folders/17QT8_NTQXpOzcfaZ3silp-hqD0sgOAck) |
| `GOOGLE_DRIVE_PRODUCTS_FOLDER_ID` | 상품 상세페이지 이미지 | [링크](https://drive.google.com/drive/folders/18YuEBt313yyKI3F7PSzjFFRF3Af-bVPH) |
| `GOOGLE_DRIVE_COMPANY_LOGO_FOLDER_ID` | 회사 로고 이미지 | [링크](https://drive.google.com/drive/folders/1s3dL8SCPHlsG8qcVo4TzG6MFvdql4bYf) |
| `GOOGLE_DRIVE_AFFILIATE_INFO_FOLDER_ID` | 판매원/대리점장 정보 | [링크](https://drive.google.com/drive/folders/1vPvuzpdNqGd1JAUK3zNMVkcF_9kRQMGI) |
| `GOOGLE_DRIVE_CONTRACTS_FOLDER_ID` | 계약서 파일 | [링크](https://drive.google.com/drive/folders/1HN-w4tNLdmfW5K5N3zF52P_InrUdBkQ_) |
| `GOOGLE_DRIVE_CONTRACT_SIGNATURES_FOLDER_ID` | 계약서 서명 이미지 | [링크](https://drive.google.com/drive/folders/1PcdSnWQ3iCdd87Y-UI_63HSjlYqcFGyX) |
| `GOOGLE_DRIVE_CONTRACT_AUDIO_FOLDER_ID` | 계약서 녹음 파일 | [링크](https://drive.google.com/drive/folders/1dhTmPheRvOsc0V0ukpKOqD2Ry1IN-OrH) |
| `GOOGLE_DRIVE_ID_CARD_FOLDER_ID` | 신분증 이미지 | [링크](https://drive.google.com/drive/folders/1DFWpAiS-edjiBym5Y5AonDOl2wXyuDV0) |
| `GOOGLE_DRIVE_BANKBOOK_FOLDER_ID` | 통장 이미지 | [링크](https://drive.google.com/drive/folders/1IjNSTTTBjU9NZE6fm6DeAAHBx4puWCRl) |

---

## ✅ 설정 완료 체크리스트

- [ ] `GOOGLE_DRIVE_CRUISE_IMAGES_FOLDER_ID` 추가
- [ ] `GOOGLE_DRIVE_COMPANY_LOGO_FOLDER_ID` 추가
- [ ] `GOOGLE_DRIVE_AFFILIATE_INFO_FOLDER_ID` 추가
- [ ] 어필리에이트 문서 폴더 ID들 확인 (이미 추가되어 있을 수 있음)
- [ ] 모든 환경변수를 Production, Preview 환경에 적용
- [ ] 재배포 완료
- [ ] 관리자 패널에서 설정 확인
- [ ] 각 기능 테스트 완료

---

## 📝 참고사항

- 환경변수 추가 후 **자동 재배포**가 트리거되거나, 수동으로 재배포해야 합니다.
- 관리자 패널(`/admin/settings`)에서도 이 값들을 확인하고 수정할 수 있습니다.
- Google Drive 폴더 ID는 Google Drive URL에서 확인할 수 있습니다:
  - 예: `https://drive.google.com/drive/folders/17QT8_NTQXpOzcfaZ3silp-hqD0sgOAck`
  - 폴더 ID: `17QT8_NTQXpOzcfaZ3silp-hqD0sgOAck`


