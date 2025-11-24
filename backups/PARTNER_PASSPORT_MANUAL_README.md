# 대리점장 수동여권발송 기능 - 메인 고정 소스

## ⚠️ 중요: 이 파일들은 메인 기준입니다

이 디렉토리의 파일들은 **대리점장 수동여권발송 기능의 원조 소스**입니다.
이 소스는 **수정되면 안 되며**, 다른 모든 여권 발송 기능은 이 소스에 맞춰야 합니다.

## 백업된 파일

1. **`partner-passport-manual-route.ts`**
   - 경로: `app/api/partner/passport-requests/manual/route.ts`
   - 설명: 대리점장 수동여권발송 API 엔드포인트
   - 주요 기능:
     - `AffiliateLead`를 통해 고객 정보 조회
     - `Product` 정보 포함
     - 템플릿 변수: `{고객명}`, `{링크}`, `{상품명}`, `{출발일}` 모두 채움
     - `PassportSubmission` 생성/업데이트
     - `AffiliateLead.passportRequestedAt` 업데이트
     - `PassportRequestLog` 기록

2. **`partner-passport-requests-client.tsx`**
   - 경로: `app/partner/[partnerId]/passport-requests/PartnerPassportRequestsClient.tsx`
   - 설명: 대리점장 여권 요청 관리 프론트엔드
   - 주요 기능:
     - 고객 목록 조회
     - 템플릿 선택
     - 수동 링크 생성
     - 생성된 링크/메시지 복사

## 관리자 패널과의 차이점

### 대리점장 (원조)
- 데이터 소스: `AffiliateLead` → `User`, `Product`
- 템플릿 변수: 모두 채워짐
- `AffiliateLead.passportRequestedAt` 업데이트

### 관리자 패널 (복제본)
- 데이터 소스: `User` 직접 + `UserTrip` (최신 여행)
- 템플릿 변수: 모두 채워짐 (수정 완료)
- `AffiliateLead` 업데이트 없음 (User 직접 사용)

## 구글 연동

이 기능은 구글 드라이브 연동과 함께 작동합니다:
- 여권 제출 시 구글 드라이브에 자동 저장
- `PassportSubmission.driveFolderUrl`에 폴더 URL 저장

## 수정 시 주의사항

1. **이 소스를 수정하지 마세요** - 이것이 메인 기준입니다
2. 다른 기능을 수정할 때는 이 소스와 일치하도록 해야 합니다
3. 새로운 기능 추가 시 이 소스의 패턴을 따르세요

## 복원 방법

만약 원본이 손상되면:

```bash
# API 복원
cp backups/partner-passport-manual-route.ts app/api/partner/passport-requests/manual/route.ts

# 프론트엔드 복원
cp backups/partner-passport-requests-client.tsx app/partner/[partnerId]/passport-requests/PartnerPassportRequestsClient.tsx
```

## 마지막 수정일

- 백업 생성일: 2024년 (현재 날짜)
- 원본 경로: `app/api/partner/passport-requests/manual/route.ts`
- 원본 경로: `app/partner/[partnerId]/passport-requests/PartnerPassportRequestsClient.tsx`










