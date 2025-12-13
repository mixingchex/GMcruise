# Development Checklist

> NestJS + Zod + Monorepo 개발 체크리스트

---

## 1. 프로젝트 초기 설정

### packages/shared 설정

```markdown
- [ ] packages/shared/ 디렉토리 생성
- [ ] package.json 설정 (name: @myapp/shared)
- [ ] tsconfig.json extends 설정
- [ ] zod 의존성 추가
- [ ] src/schemas/, src/types/, src/validators/ 구조 생성
- [ ] src/index.ts barrel export 설정
- [ ] pnpm-workspace.yaml에 등록
```

### apps/backend 설정

```markdown
- [ ] nestjs-zod 설치
- [ ] @nestjs/swagger 설치
- [ ] Global ZodValidationPipe 적용 (main.ts)
- [ ] Swagger DocumentBuilder 설정
- [ ] swagger.json 파일 생성 스크립트
- [ ] @myapp/shared 의존성 추가
```

### packages/api-client 설정

```markdown
- [ ] orval 설치
- [ ] axios, @tanstack/react-query 설치
- [ ] orval.config.ts 설정
- [ ] axios-instance.ts 토큰/에러 처리
- [ ] generate 스크립트 추가
```

---

## 2. 새 기능 개발 시

### Step 1: Zod 스키마 정의 (packages/shared)

```markdown
- [ ] schemas/feature.schema.ts 생성
- [ ] Base 스키마 정의 (Entity)
- [ ] Request DTO 스키마 (Create, Update)
- [ ] Response DTO 스키마
- [ ] Query DTO 스키마 (필터/페이지네이션)
- [ ] types/feature.types.ts에 z.infer<> 타입 추출
- [ ] index.ts에 export 추가
```

### Step 2: NestJS 모듈 생성 (apps/backend)

```markdown
- [ ] feature.module.ts 생성
- [ ] feature.controller.ts 생성
- [ ] feature.service.ts 생성
- [ ] dto/ 디렉토리에 DTO 클래스 생성 (createZodDto 사용)
- [ ] entities/ 디렉토리에 Entity 정의
```

### Step 3: Controller 데코레이터 적용

```markdown
- [ ] @ApiTags('Features') 복수형
- [ ] @ApiBearerAuth() 인증 필요시
- [ ] @ApiOperation({ summary }) 각 메서드
- [ ] @ApiResponse({ status, type }) 모든 응답
- [ ] @ApiParam() Path 파라미터
- [ ] @ApiQuery() Query 파라미터
- [ ] @ApiBody({ type }) Request Body
- [ ] 반환 타입 Promise<T> 명시
```

### Step 4: API Client 재생성

```markdown
- [ ] Backend 빌드 및 swagger.json 업데이트
- [ ] pnpm api:generate 실행
- [ ] 새로 생성된 훅 확인
- [ ] Frontend에서 import 테스트
```

---

## 3. Controller 작성 체크리스트

### 필수 데코레이터

```markdown
## Controller 레벨
- [ ] @Controller('path') - 복수형 리소스명
- [ ] @ApiTags('Resources') - 복수형
- [ ] @ApiBearerAuth('access-token') - 인증 필요시
- [ ] @UseGuards() - 가드 적용

## POST (Create)
- [ ] @Post()
- [ ] @HttpCode(HttpStatus.CREATED)
- [ ] @ApiOperation({ summary: '생성' })
- [ ] @ApiBody({ type: CreateDto })
- [ ] @ApiResponse({ status: 201, type: ResponseDto })
- [ ] @ApiResponse({ status: 400, description: '검증 실패' })
- [ ] @ApiResponse({ status: 409, description: '중복' })

## GET (List)
- [ ] @Get()
- [ ] @ApiOperation({ summary: '목록 조회' })
- [ ] @ApiQuery() - 페이지네이션/필터 파라미터
- [ ] @ApiResponse({ status: 200, type: [ResponseDto] })

## GET (Single)
- [ ] @Get(':id')
- [ ] @ApiOperation({ summary: '상세 조회' })
- [ ] @ApiParam({ name: 'id', format: 'uuid' })
- [ ] @ApiResponse({ status: 200, type: ResponseDto })
- [ ] @ApiResponse({ status: 404 })
- [ ] @Param('id', ParseUUIDPipe) - 파이프 검증

## PUT/PATCH (Update)
- [ ] @Put(':id') 또는 @Patch(':id')
- [ ] @ApiOperation({ summary: '수정' })
- [ ] @ApiParam({ name: 'id' })
- [ ] @ApiBody({ type: UpdateDto })
- [ ] @ApiResponse({ status: 200, type: ResponseDto })
- [ ] @ApiResponse({ status: 404 })

## DELETE
- [ ] @Delete(':id')
- [ ] @HttpCode(HttpStatus.NO_CONTENT)
- [ ] @ApiOperation({ summary: '삭제' })
- [ ] @ApiParam({ name: 'id' })
- [ ] @ApiResponse({ status: 204 })
- [ ] @ApiResponse({ status: 404 })
```

---

## 4. DTO 작성 체크리스트

### Request DTO (nestjs-zod)

```markdown
- [ ] @myapp/shared에서 스키마 import
- [ ] createZodDto()로 DTO 클래스 생성
- [ ] 불필요한 class-validator 데코레이터 제거
```

### Response DTO (class-transformer)

```markdown
- [ ] @ApiProperty() 모든 필드에 적용
- [ ] @ApiPropertyOptional() 선택적 필드
- [ ] @Exclude() 민감 정보 (password 등)
- [ ] @Expose() 노출할 필드
- [ ] constructor(partial: Partial<T>) 추가
```

---

## 5. TypeScript Strict 설정

### tsconfig.json 필수 옵션

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "exactOptionalPropertyTypes": true
  }
}
```

---

## 6. 코드 리뷰 체크리스트

### 타입 안전성

```markdown
- [ ] any 타입 사용 없음
- [ ] as 타입 단언 최소화
- [ ] 외부 데이터 Zod로 검증
- [ ] 반환 타입 명시
- [ ] null/undefined 처리
```

### 구조

```markdown
- [ ] 스키마가 packages/shared에 정의됨
- [ ] inline interface 사용 없음
- [ ] Controller/Service/Module 분리
- [ ] 의존성 방향 올바름
```

### 문서화

```markdown
- [ ] Swagger 데코레이터 완전함
- [ ] 모든 응답 코드 정의
- [ ] 예시 값 포함
```

---

## 7. 배포 전 체크리스트

```markdown
- [ ] pnpm typecheck 통과
- [ ] pnpm lint 통과
- [ ] pnpm test 통과
- [ ] swagger.json 최신 상태
- [ ] API Client 재생성 완료
- [ ] Frontend 컴파일 에러 없음
- [ ] 환경변수 설정 확인
```

---

**Version**: 1.0.0
