# OpenAPI YAML Templates

## Main OpenAPI Spec

```yaml
# packages/shared/api/openapi/openapi.yaml

openapi: 3.0.3
info:
  title: MonoRepo API
  description: |
    # MonoRepo API Documentation

    ## Authentication
    모든 API (인증 관련 제외)는 Bearer Token이 필요합니다.

    ## Response Format
    모든 응답은 표준 포맷을 따릅니다.
  version: 1.0.0
  contact:
    name: Backend Team
    email: backend@example.com
  license:
    name: MIT

servers:
  - url: http://localhost:3000/api/v1
    description: Local Development
  - url: https://api.staging.example.com/v1
    description: Staging
  - url: https://api.example.com/v1
    description: Production

tags:
  - name: Auth
    description: 인증 관련 API
  - name: Users
    description: 사용자 관련 API

paths:
  /auth/login:
    $ref: './paths/auth.yaml#/login'
  /auth/refresh:
    $ref: './paths/auth.yaml#/refresh'
  /users:
    $ref: './paths/users.yaml#/users'
  /users/{id}:
    $ref: './paths/users.yaml#/users-id'

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: JWT 토큰을 입력하세요

  schemas:
    $ref: './components/schemas.yaml'

  responses:
    $ref: './components/responses.yaml'

  parameters:
    $ref: './components/parameters.yaml'

security:
  - bearerAuth: []
```

## Users Path Definition

```yaml
# packages/shared/api/openapi/paths/users.yaml

users:
  get:
    tags:
      - Users
    operationId: getUsers
    summary: 사용자 목록 조회
    description: 페이지네이션이 적용된 사용자 목록을 조회합니다.
    parameters:
      - $ref: '../components/parameters.yaml#/PageParam'
      - $ref: '../components/parameters.yaml#/LimitParam'
      - name: role
        in: query
        schema:
          $ref: '../components/schemas.yaml#/UserRole'
      - name: search
        in: query
        schema:
          type: string
    responses:
      '200':
        description: 성공
        content:
          application/json:
            schema:
              $ref: '../components/responses.yaml#/UsersListResponse'
      '401':
        $ref: '../components/responses.yaml#/UnauthorizedError'
      '403':
        $ref: '../components/responses.yaml#/ForbiddenError'

  post:
    tags:
      - Users
    operationId: createUser
    summary: 사용자 생성
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '../components/schemas.yaml#/CreateUserDto'
          examples:
            basic:
              summary: 기본 사용자
              value:
                email: user@example.com
                password: SecurePass123!
                name: 홍길동
    responses:
      '201':
        description: 생성 성공
        content:
          application/json:
            schema:
              $ref: '../components/responses.yaml#/UserResponse'
      '400':
        $ref: '../components/responses.yaml#/ValidationError'
      '409':
        $ref: '../components/responses.yaml#/ConflictError'

users-id:
  get:
    tags:
      - Users
    operationId: getUserById
    summary: 사용자 상세 조회
    parameters:
      - $ref: '../components/parameters.yaml#/UserIdParam'
    responses:
      '200':
        description: 성공
        content:
          application/json:
            schema:
              $ref: '../components/responses.yaml#/UserResponse'
      '404':
        $ref: '../components/responses.yaml#/NotFoundError'

  put:
    tags:
      - Users
    operationId: updateUser
    summary: 사용자 정보 수정
    parameters:
      - $ref: '../components/parameters.yaml#/UserIdParam'
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '../components/schemas.yaml#/UpdateUserDto'
    responses:
      '200':
        description: 수정 성공
        content:
          application/json:
            schema:
              $ref: '../components/responses.yaml#/UserResponse'
      '404':
        $ref: '../components/responses.yaml#/NotFoundError'
      '409':
        $ref: '../components/responses.yaml#/ConflictError'

  delete:
    tags:
      - Users
    operationId: deleteUser
    summary: 사용자 삭제
    parameters:
      - $ref: '../components/parameters.yaml#/UserIdParam'
    responses:
      '204':
        description: 삭제 성공
      '404':
        $ref: '../components/responses.yaml#/NotFoundError'
```

## Schemas Component

```yaml
# packages/shared/api/openapi/components/schemas.yaml

UserRole:
  type: string
  enum:
    - USER
    - ADMIN
  description: 사용자 역할

UserDto:
  type: object
  required:
    - id
    - email
    - name
    - role
    - createdAt
    - updatedAt
  properties:
    id:
      type: string
      format: uuid
      example: '550e8400-e29b-41d4-a716-446655440000'
    email:
      type: string
      format: email
      example: 'user@example.com'
    name:
      type: string
      example: '홍길동'
    phone:
      type: string
      example: '010-1234-5678'
    role:
      $ref: '#/UserRole'
    createdAt:
      type: string
      format: date-time
    updatedAt:
      type: string
      format: date-time

CreateUserDto:
  type: object
  required:
    - email
    - password
    - name
  properties:
    email:
      type: string
      format: email
      maxLength: 255
    password:
      type: string
      minLength: 8
      maxLength: 100
    name:
      type: string
      minLength: 2
      maxLength: 50
    phone:
      type: string
      pattern: '^01[0-9]-\d{3,4}-\d{4}$'
    role:
      $ref: '#/UserRole'

UpdateUserDto:
  type: object
  properties:
    name:
      type: string
      minLength: 2
      maxLength: 50
    phone:
      type: string
      pattern: '^01[0-9]-\d{3,4}-\d{4}$'
    role:
      $ref: '#/UserRole'
```

## Parameters Component

```yaml
# packages/shared/api/openapi/components/parameters.yaml

PageParam:
  name: page
  in: query
  required: false
  schema:
    type: integer
    minimum: 1
    default: 1
  description: 페이지 번호 (1부터 시작)

LimitParam:
  name: limit
  in: query
  required: false
  schema:
    type: integer
    minimum: 1
    maximum: 100
    default: 20
  description: 페이지당 항목 수

UserIdParam:
  name: id
  in: path
  required: true
  schema:
    type: string
    format: uuid
  description: 사용자 ID
  example: '550e8400-e29b-41d4-a716-446655440000'
```

## Responses Component

```yaml
# packages/shared/api/openapi/components/responses.yaml

UserResponse:
  type: object
  properties:
    success:
      type: boolean
      example: true
    data:
      $ref: './schemas.yaml#/UserDto'
    timestamp:
      type: string
      format: date-time

UsersListResponse:
  type: object
  properties:
    success:
      type: boolean
      example: true
    data:
      type: array
      items:
        $ref: './schemas.yaml#/UserDto'
    meta:
      type: object
      properties:
        page:
          type: integer
          example: 1
        limit:
          type: integer
          example: 20
        total:
          type: integer
          example: 100
        totalPages:
          type: integer
          example: 5
        hasNext:
          type: boolean
          example: true
        hasPrev:
          type: boolean
          example: false
    timestamp:
      type: string
      format: date-time

UnauthorizedError:
  description: 인증 실패
  content:
    application/json:
      schema:
        $ref: '#/ApiErrorResponse'

ForbiddenError:
  description: 권한 없음
  content:
    application/json:
      schema:
        $ref: '#/ApiErrorResponse'

NotFoundError:
  description: 리소스를 찾을 수 없음
  content:
    application/json:
      schema:
        $ref: '#/ApiErrorResponse'

ValidationError:
  description: 검증 오류
  content:
    application/json:
      schema:
        $ref: '#/ApiErrorResponse'

ConflictError:
  description: 리소스 충돌
  content:
    application/json:
      schema:
        $ref: '#/ApiErrorResponse'

ApiErrorResponse:
  type: object
  properties:
    success:
      type: boolean
      example: false
    error:
      type: object
      properties:
        statusCode:
          type: integer
        code:
          type: string
        message:
          type: string
        traceId:
          type: string
        errors:
          type: array
          items:
            type: object
            properties:
              field:
                type: string
              message:
                type: string
    timestamp:
      type: string
      format: date-time
```
