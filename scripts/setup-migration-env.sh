#!/bin/bash

# 마이그레이션 환경변수 설정 스크립트
# .env.local 파일에 Google Drive 관련 환경변수를 추가합니다

ENV_FILE=".env.local"

# .env.local 파일이 없으면 생성
if [ ! -f "$ENV_FILE" ]; then
    touch "$ENV_FILE"
    echo "# Google Drive 마이그레이션 환경변수" >> "$ENV_FILE"
    echo "" >> "$ENV_FILE"
fi

# 환경변수 추가 함수
add_env_var() {
    local key=$1
    local value=$2
    
    # 이미 존재하는지 확인
    if grep -q "^${key}=" "$ENV_FILE"; then
        echo "  ⚠️  ${key} 이미 존재 (건너뜀)"
    else
        echo "${key}=${value}" >> "$ENV_FILE"
        echo "  ✅ ${key} 추가됨"
    fi
}

echo "📝 .env.local 파일에 환경변수 추가 중..."

# Google Drive 인증 정보
echo "" >> "$ENV_FILE"
echo "# Google Drive 인증 정보" >> "$ENV_FILE"
add_env_var "GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL" "cruisedot@cruisedot-478810.iam.gserviceaccount.com"
add_env_var "GOOGLE_DRIVE_SHARED_DRIVE_ID" "0AJVz1C-KYWR0Uk9PVA"
add_env_var "GOOGLE_DRIVE_ROOT_FOLDER_ID" "0AJVz1C-KYWR0Uk9PVA"

# Private Key는 별도로 처리 (이미 존재할 수 있으므로)
if ! grep -q "^GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY=" "$ENV_FILE"; then
    echo "" >> "$ENV_FILE"
    echo "# Google Drive Private Key (여러 줄)" >> "$ENV_FILE"
    echo "# 아래 Private Key를 수동으로 추가해주세요:" >> "$ENV_FILE"
    echo "# GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY=\"-----BEGIN PRIVATE KEY-----" >> "$ENV_FILE"
    echo "# ... (전체 키 내용) ..." >> "$ENV_FILE"
    echo "# -----END PRIVATE KEY-----\"" >> "$ENV_FILE"
fi

# Google Sheets
echo "" >> "$ENV_FILE"
echo "# Google Sheets 스프레드시트 ID" >> "$ENV_FILE"
add_env_var "COMMUNITY_BACKUP_SPREADSHEET_ID" "1Le6IPNzyvMqpn-6ZnqgvH0JTQ8O5rKymWMU_pkfbQ5Q"
add_env_var "TRIP_APIS_ARCHIVE_SPREADSHEET_ID" "185t2eIIPDsEm-QW9KmhTbxkrywFJhGdk"

# Google Drive 폴더 ID
echo "" >> "$ENV_FILE"
echo "# Google Drive 폴더 ID" >> "$ENV_FILE"
add_env_var "GOOGLE_DRIVE_PASSPORT_FOLDER_ID" "1Nen5t7rE8WaT9e4xWswSiUNJIcgMiDRF"
add_env_var "GOOGLE_DRIVE_PRODUCTS_FOLDER_ID" "18YuEBt313yyKI3F7PSzjFFRF3Af-bVPH"
add_env_var "GOOGLE_DRIVE_CRUISE_IMAGES_FOLDER_ID" "17QT8_NTQXpOzcfaZ3silp-hqD0sgOAck"
add_env_var "GOOGLE_DRIVE_COMPANY_LOGO_FOLDER_ID" "1s3dL8SCPHlsG8qcVo4TzG6MFvdql4bYf"
add_env_var "GOOGLE_DRIVE_AFFILIATE_INFO_FOLDER_ID" "1vPvuzpdNqGd1JAUK3zNMVkcF_9kRQMGI"

# 업로드 폴더
echo "" >> "$ENV_FILE"
echo "# 업로드 폴더" >> "$ENV_FILE"
add_env_var "GOOGLE_DRIVE_UPLOADS_IMAGES_FOLDER_ID" "1fWbPelIoftl1DqXLayZNle7z-DSYzvl8"
add_env_var "GOOGLE_DRIVE_UPLOADS_PROFILES_FOLDER_ID" "13roFq5i51155_DG4MR74dqyWrR6GRAG9"
add_env_var "GOOGLE_DRIVE_UPLOADS_REVIEWS_FOLDER_ID" "1E5iho6Ud7wFLs3Nkp3LGHMKXoN7MYVpO"
add_env_var "GOOGLE_DRIVE_UPLOADS_AUDIO_FOLDER_ID" "1XfdoQrODfjZOaQzV6X859fE2mCG4QuwY"
add_env_var "GOOGLE_DRIVE_UPLOADS_DOCUMENTS_FOLDER_ID" "1YEsNRV2MQT5nSjtMniVcEVsECUeCgLBz"
add_env_var "GOOGLE_DRIVE_UPLOADS_VIDEOS_FOLDER_ID" "1VAZ9bOEV47keU-mJNhlwlgGHi6ONaFFI"
add_env_var "GOOGLE_DRIVE_UPLOADS_SALES_AUDIO_FOLDER_ID" "1g8vNIeXEVHkavQnlBAXsBMkVZB_Y29Fk"
add_env_var "GOOGLE_DRIVE_UPLOADS_FONTS_FOLDER_ID" "1LgxTEm_1pue1XFduypj9YnMStCarxfOt"
add_env_var "GOOGLE_DRIVE_CONTRACTS_PDFS_FOLDER_ID" "1pWt8VN9WD_79eJcp4_SmFfbekMOcykTT"

# 어필리에이트 문서
echo "" >> "$ENV_FILE"
echo "# 어필리에이트 문서" >> "$ENV_FILE"
add_env_var "GOOGLE_DRIVE_CONTRACTS_FOLDER_ID" "1HN-w4tNLdmfW5K5N3zF52P_InrUdBkQ_"
add_env_var "GOOGLE_DRIVE_CONTRACT_SIGNATURES_FOLDER_ID" "1PcdSnWQ3iCdd87Y-UI_63HSjlYqcFGyX"
add_env_var "GOOGLE_DRIVE_CONTRACT_AUDIO_FOLDER_ID" "1dhTmPheRvOsc0V0ukpKOqD2Ry1IN-OrH"
add_env_var "GOOGLE_DRIVE_ID_CARD_FOLDER_ID" "1DFWpAiS-edjiBym5Y5AonDOl2wXyuDV0"
add_env_var "GOOGLE_DRIVE_BANKBOOK_FOLDER_ID" "1IjNSTTTBjU9NZE6fm6DeAAHBx4puWCRl"

echo ""
echo "✅ 환경변수 추가 완료!"
echo ""
echo "⚠️  다음 단계:"
echo "  1. GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY를 수동으로 추가해주세요"
echo "  2. npm run migrate:check-env 로 확인"
echo ""


