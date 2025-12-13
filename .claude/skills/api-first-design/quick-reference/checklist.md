# API Development Checklist

## API 개발 전 체크리스트

```markdown
## 개발 전 (Contract First)

- [ ] OpenAPI 스펙 정의 완료
- [ ] Frontend/Backend 스펙 합의 완료
- [ ] 에러 케이스 정의 완료
- [ ] 인증/권한 요구사항 정의
- [ ] 페이지네이션 전략 결정
- [ ] 타입 생성 (swagger-typescript-api)
```

## Controller 구현 체크리스트

```markdown
## Controller 구현

- [ ] @ApiTags 적용 (복수형)
- [ ] @ApiBearerAuth 적용 (인증 필요 시)
- [ ] 모든 메서드에 @ApiOperation
  - [ ] summary (50자 이내)
  - [ ] description (마크다운, 상세)
- [ ] 모든 메서드에 @ApiResponse
  - [ ] 200/201: 성공
  - [ ] 400: 검증 오류
  - [ ] 401: 인증 오류
  - [ ] 403: 권한 오류
  - [ ] 404: 리소스 없음
  - [ ] 409: 충돌
- [ ] @ApiParam: 모든 Path Parameter
- [ ] @ApiQuery: 모든 Query Parameter
- [ ] @ApiBody: Request Body (예시 포함)
```

## DTO 체크리스트

```markdown
## DTO 정의

- [ ] @ApiProperty 모든 필수 필드
- [ ] @ApiPropertyOptional 모든 선택 필드
- [ ] description 작성
- [ ] example 제공
- [ ] format 지정 (email, uuid, date-time 등)
- [ ] 검증 데코레이터와 일치 (minLength, pattern 등)
- [ ] class-validator 데코레이터 적용
```

## 응답 포맷 체크리스트

```markdown
## 응답 포맷

- [ ] 성공: { success: true, data, meta?, timestamp }
- [ ] 에러: { success: false, error, timestamp }
- [ ] error.code는 ErrorCodes enum 사용
- [ ] error.traceId 포함 (로그 추적용)
- [ ] 검증 에러: error.errors 배열 포함
- [ ] 페이지네이션: meta 객체 포함
```

## 배포 전 체크리스트

```markdown
## 배포 전

- [ ] OpenAPI 스펙 유효성 검사 (openapi-generator validate)
- [ ] Swagger UI 확인
- [ ] 타입 재생성 및 프론트엔드 배포
- [ ] API 버전 확인
- [ ] 이전 버전 호환성 확인 (Breaking Change 시)
- [ ] Deprecation 헤더 설정 (구버전)
```

## Quick Reference

```yaml
표준_응답:
  성공: "{ success: true, data: T, meta?: Meta, timestamp: string }"
  에러: "{ success: false, error: ApiError, timestamp: string }"

필수_데코레이터:
  Controller:
    - "@ApiTags('Resources')"
    - "@ApiBearerAuth('access-token')"

  Method:
    - "@ApiOperation({ summary, description })"
    - "@ApiResponse({ status, description, type })"
    - "@ApiParam / @ApiQuery / @ApiBody"

  DTO:
    - "@ApiProperty({ description, example, format })"
    - "@ApiPropertyOptional()"

에러_코드_체계:
  패턴: "DOMAIN_ACTION_REASON"
  예시:
    - "AUTH_TOKEN_EXPIRED"
    - "USER_NOT_FOUND"
    - "VALIDATION_FAILED"

버전_전략:
  형식: "/api/v1/resources"
  지원: "현재 버전 + 이전 버전(12개월)"
  Breaking: "새 버전으로 분리"
```

## Documentation Rules

```yaml
모든 API는 다음 항목을 반드시 문서화:

Controller_Level:
  - "@ApiTags": 그룹명 (복수형)
  - "@ApiBearerAuth": 인증 필요 시

Method_Level:
  - "@ApiOperation":
      - summary: 한 줄 설명 (50자 이내)
      - description: 상세 설명 (마크다운)
  - "@ApiResponse": 모든 가능한 상태 코드
  - "@ApiParam": Path 파라미터
  - "@ApiQuery": Query 파라미터
  - "@ApiBody": Request Body (예시 포함)

DTO_Level:
  - "@ApiProperty": 모든 필수 속성
  - "@ApiPropertyOptional": 모든 선택 속성
  - description: 속성 설명
  - example: 예시 값
  - format: 형식 (email, uuid, date-time 등)
```
