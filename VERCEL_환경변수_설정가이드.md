# Vercel 환경 변수 설정 가이드

## 현재 상태
- ✅ 로컬 빌드 성공
- ✅ 동영상/이미지 파일 존재 확인
- ✅ YouTube API 코드 정상
- ✅ 커뮤니티 API 코드 정상

## Vercel에 설정해야 할 필수 환경 변수

### 1. Vercel 대시보드 접속
1. https://vercel.com 접속
2. 프로젝트 선택 (cruise-guide)
3. Settings > Environment Variables

### 2. 다음 환경 변수들을 추가하세요:

```bash
# Gemini API
GEMINI_API_KEY=AIzaSyCgC4mZ1TCUaA4vhpkwfdtLZdXEslvqpA8
GEMINI_MODEL=gemini-flash-latest

# Database
DATABASE_URL=postgresql://neondb_owner:npg_e9MRdmxfYzr6@ep-plain-night-a75igt8x-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require

# YouTube API ⭐ 중요!
YOUTUBE_API_KEY=AIzaSyCvQaStyRSjrdckSLC7QDzXVdRUet-NtEU

# Web Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BIz9mFXb9osaYPBxJqU4s3gnvZtn07zJuleccpGUWNi7RCeG_k5S9NmY_QFloNfbJy8a4fhvR1R98RMbwvRxlJs
VAPID_PRIVATE_KEY=sEHbUR0RTg522krVuyXQD-IanLPmmI3rNrp1Y3npfyM
VAPID_SUBJECT=mailto:example@example.com

# Base URL
NEXT_PUBLIC_BASE_URL=https://www.cruisedot.co.kr

# 이메일 설정
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=hyeseon28@gmail.com
EMAIL_SMTP_PASSWORD=ddemsbaxxbqexlki
EMAIL_FROM_NAME=크루즈닷
EMAIL_FROM_ADDRESS=hyeseon28@gmail.com

# 카카오 설정
NEXT_PUBLIC_KAKAO_JS_KEY=e4d764f905271796dccf37c55a5b84d7
NEXT_PUBLIC_KAKAO_CHANNEL_ID=CzxgPn
KAKAO_CHANNEL_BOT_ID=68693bcd99efce7dbfa950bb
KAKAO_APP_NAME=크루즈닷
KAKAO_APP_ID=1293313
KAKAO_REST_API_KEY=e75220229cf63f62a0832447850985ea
KAKAO_ADMIN_KEY=6f2872dfa8ac40ab0d9a93a70c542d10

# 알리고 SMS
ALIGO_API_KEY=ykfcblofawtxt5b3gf7iyey30iufinqr
ALIGO_USER_ID=hyeseon28
ALIGO_SENDER_PHONE=01032893800
ALIGO_KAKAO_SENDER_KEY=13b13496a0f51e9a602706d0dd8b27598088dd5a
ALIGO_KAKAO_CHANNEL_ID=cruisedot

# PG 결제
PG_SIGNKEY=SGI2dkFzRFc1WHp6K1VTOFVUS3dGdz09
PG_FIELD_ENCRYPT_IV=00e0281fbcbae386
PG_FIELD_ENCRYPT_KEY=3468ac340654c2e5a890fc97d99c214b
PG_MID_AUTH=wpcrdot200
PG_MID_NON_AUTH=wpcrdot300
PG_ADMIN_URL=http://wbiz.paywelcome.co.kr
PG_MERCHANT_NAME=크루즈닷
PG_MID_PASSWORD=Ronaldo7@@
PG_SIGNKEY_NON_AUTH=SCtXOVVtV2o4TU1RN1hONHRlNWVTQT09
PG_FIELD_ENCRYPT_IV_NON_AUTH=5d19f5e8722505c9
PG_FIELD_ENCRYPT_KEY_NON_AUTH=11e782ef3a738e140872b5074967c5de

# Google Drive
GOOGLE_SERVICE_ACCOUNT_EMAIL=cruisedot@cruisedot-478810.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQC3ocieialo9oSe\nZZfHLnH/GkWXeRFW8qbZFk4/vI9sBLfq5/eDzCAI8o9HZdBw2oJCZXhu6BPD930K\nqhcBN/XkpsHA5HsIuNsO9kBNWD3nCiCNTgHZzacWjGqjm5QVYUu0nZ5P5rvCvA0r\nt3LqgZ+C3oPHkbtC5oLyR+QhYUHxo+2+Yc1JJkWDaASo5AvRnGgSsIguREdQ9EnW\n9jonQOL1AbflbeaaWjaLkZb4GTUGsWlZXDb7elFdr9pJ1x26W90SyM5NUdEvduSa\nqV+37GuYSH1qHzFTA/UW0UD4AVMSZ1eBBR9tCFPrMtpANhWu+hV3x7j0rQBIMZYG\nyOWcIj+dAgMBAAECggEAEbdCAPQ3ATFcn2DIa9Gcnd04VDdnPNmGz0V09yEx6lyU\n1yIvTD/SjLUaAuwHrVuSBZB/NfPzNDdu5isoB64RGFDI5dslI4pHWAIvN0cJcdNq\n9eGjZr04dCxyfVDyexLlQt+R+RNsOd/6mqUa07+oVpqGYX07G7vcFj5pUURuID8O\nheo9Ffriby1liTAC/7fncOh5SEjFrUor7ULSGcWcyzxUjys9JK7IainU9HzX+jYk\nEhRpsa7OaqqlmJ5czkfa19wu7BrNAEZtIVMKhFI1qDMJ+YCouqlobvW0JRy4PZZ/\nO/EhZX6a/A12DoNJQhwHE4vqol7gy78vwIimUetI4QKBgQDnscK8ULcUh6SDi7yF\nYlQZXNZsZaWoqgiXiwYNHKZmfndBiL1jVm0ycyAs/KdFhnI9uEUTObreReK3UK0l\n5BsvSW8eQqSWNq0R3jV89fhyz1TtfiB7WUKoOmhN+Cyp3cQpArSYWc7xEbqOPcXR\n/594yAwS4fXTWZi8ozJZQw5AVwKBgQDK5Un4qwUlkB+FYdDDO8VDqhYo7Ow5xv6K\nzVaqpF3Bo2lSzkiT5WZio9nbotXzwAapuxeG1/g9DDSQAAWT/cwh3gMk2uIzEsdW\nQVvCt0nWPpyqTIXM8m85hOuvS5dwwEujODn2IBKa4w+x/U88BDipOnaDRIl7wLXA\ndX67pLN3KwKBgQC4knN/cQ1n3WbBJGBaIaq9SafHUnJVmp6dmrKHX3tvyu9V1YiJ\nyh/TQMMxE1Rtnl0DrffZCPREfYfOYQaOWNkPIoDSqmRTBdt5kHsrwQba7y/IweE+\nYi0ntt/AvSNXbsMFqJIVi/W/NVBXX/1m/SwdG8ACit86LvXt0FQbp7+CoQKBgQCH\nG6JjdbbKqatjzZwPteiJQ2TYQdSYMNvloBD7NtK8FE4ZdwY7fgHs44E6Ube5RgDp\n240yHPTP6iXCUlFkmBfr4YQkcaE5M2MMHB+3jQgdI7p9aNGchT/thIbRRzwEN/jm\nKpXmQLtC6rrT4oN1yrXUcvriNKx8fPpKu7L1zxo22wKBgQCzHN8NWxNvCcvs5oyw\nlS0UBVw75EKl0aHtnEcXTnHBmH+1Ht+NEuYwjSO1ouLGem1FRsE+vs/Y6AciSA2B\n5VBsFJhH77kSEuVRi9vCnIi2nEykynJl989B53kzzAk07Q7H9DL1aNZPEwdqlW/Q\nNQaF/h9r2T7RuzpFPOXCk9uuiw==\n-----END PRIVATE KEY-----\n
GOOGLE_DRIVE_SHARED_DRIVE_ID=0AJVz1C-KYWR0Uk9PVA
GOOGLE_DRIVE_ROOT_FOLDER_ID=0AJVz1C-KYWR0Uk9PVA
GOOGLE_DRIVE_PASSPORT_FOLDER_ID=0AJVz1C-KYWR0Uk9PVA
```

### 3. Environment 설정
각 환경 변수를 추가할 때 다음 환경에 모두 체크하세요:
- ✅ Production
- ✅ Preview
- ✅ Development

### 4. 재배포
환경 변수 추가 후:
1. Vercel 대시보드에서 Deployments 탭 이동
2. 가장 최근 배포 찾기
3. 우측 ... 메뉴 클릭
4. "Redeploy" 클릭
5. "Redeploy" 버튼 다시 클릭하여 확인

## 확인 사항

### 메인 페이지에서 확인해야 할 것들:
1. ✅ 히어로 섹션 동영상 배너 (/videos/hero-video.mp4)
2. ✅ 프로모션 배너 동영상 (/videos/크루즈_광고_영상_제작_프롬프트.mp4)
3. ✅ 유튜브 Shorts 섹션
4. ✅ 유튜브 Videos 섹션
5. ✅ 커뮤니티 섹션

### 만약 여전히 문제가 있다면:
1. 브라우저 개발자 도구 (F12) 열기
2. Console 탭에서 에러 메시지 확인
3. Network 탭에서 실패한 요청 확인
4. 에러 메시지를 저에게 알려주세요

## 주의 사항
⚠️ **YOUTUBE_API_KEY는 반드시 설정해야 합니다!**
- 이 키가 없으면 유튜브 API가 작동하지 않습니다
- 현재 키: `AIzaSyCvQaStyRSjrdckSLC7QDzXVdRUet-NtEU`
