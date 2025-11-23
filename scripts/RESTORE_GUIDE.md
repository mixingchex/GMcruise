# Neon Point-in-Time Recovery 복원 가이드

## 🎯 목표
20일 오전 9시 28분 시점의 데이터베이스로 복원

## 방법 1: 자동 스크립트 사용 (권장)

```bash
cd /home/userhyeseon28/projects/cruise-guide
./scripts/restore-neon-pitr.sh
```

스크립트가 다음을 자동으로 수행합니다:
1. Neon CLI 설치 (필요시)
2. Neon CLI 로그인
3. Point-in-Time Recovery 브랜치 생성
4. 연결 문자열 가져오기
5. .env 파일 업데이트 (선택)

## 방법 2: Neon 대시보드에서 수동 복원

### 단계별 가이드

1. **Neon 대시보드 접속**
   - https://console.neon.tech 접속
   - 로그인

2. **프로젝트 선택**
   - 프로젝트 목록에서 해당 프로젝트 선택

3. **Branches 메뉴**
   - 왼쪽 메뉴에서 "Branches" 클릭

4. **새 브랜치 생성**
   - "Create Branch" 버튼 클릭

5. **Point-in-Time Recovery 설정**
   - "Point-in-Time Recovery" 옵션 선택
   - 날짜/시간 입력: **2025-11-20 09:28:00**
   - 브랜치 이름: `restore-20251120-0928` (또는 원하는 이름)

6. **브랜치 생성**
   - "Create Branch" 클릭
   - 생성 완료 대기 (몇 초 소요)

7. **연결 문자열 복사**
   - 생성된 브랜치 클릭
   - "Connection string" 또는 "Connection details" 섹션에서 연결 문자열 복사
   - 형식: `postgresql://user:password@host/dbname?sslmode=require`

8. **.env 파일 업데이트**
   ```bash
   cd /home/userhyeseon28/projects/cruise-guide
   
   # 백업
   cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
   
   # DATABASE_URL 업데이트
   # .env 파일을 열어서 DATABASE_URL을 새 연결 문자열로 변경
   ```

9. **Prisma 클라이언트 재생성**
   ```bash
   npx prisma generate
   ```

10. **마이그레이션 상태 확인**
    ```bash
    npx prisma migrate status
    ```

11. **애플리케이션 재시작**
    - 개발 서버 재시작
    - 프로덕션 배포 시 재배포

## 방법 3: Neon CLI 사용 (고급)

### Neon CLI 설치
```bash
npm install -g neonctl
```

### 로그인
```bash
neonctl auth
```

### 프로젝트 목록 확인
```bash
neonctl projects list
```

### 브랜치 생성
```bash
neonctl branches create \
  --project-id <YOUR_PROJECT_ID> \
  --name restore-20251120-0928 \
  --point-in-time "2025-11-20T09:28:00Z"
```

### 연결 문자열 가져오기
```bash
neonctl connection-string \
  --project-id <YOUR_PROJECT_ID> \
  --branch restore-20251120-0928
```

## ⚠️ 주의사항

1. **기존 브랜치 보존**
   - Point-in-Time Recovery는 새 브랜치를 생성합니다
   - 기존 브랜치(프로덕션)는 그대로 유지됩니다
   - 필요시 나중에 삭제할 수 있습니다

2. **데이터 확인**
   - 복원 후 데이터가 올바른지 확인하세요
   - 테스트 환경에서 먼저 확인하는 것을 권장합니다

3. **연결 문자열 보안**
   - .env 파일은 절대 Git에 커밋하지 마세요
   - .gitignore에 .env가 포함되어 있는지 확인하세요

4. **비용**
   - Neon의 각 브랜치는 별도의 스토리지를 사용합니다
   - 사용하지 않는 브랜치는 삭제하여 비용을 절감하세요

## 🔄 복원 후 작업

1. **Prisma 클라이언트 재생성**
   ```bash
   npx prisma generate
   ```

2. **마이그레이션 확인**
   ```bash
   npx prisma migrate status
   ```

3. **데이터 확인**
   - 애플리케이션에서 데이터가 올바르게 표시되는지 확인
   - 중요한 테이블의 레코드 수 확인

4. **애플리케이션 재시작**
   - 개발 서버: `npm run dev` 재시작
   - 프로덕션: 배포 플랫폼에서 재배포

## 🗑️ 브랜치 삭제 (필요시)

복원이 완료되고 확인이 끝난 후, 필요없는 브랜치는 삭제할 수 있습니다:

### 대시보드에서
1. Branches 메뉴
2. 삭제할 브랜치 선택
3. "Delete" 버튼 클릭

### CLI에서
```bash
neonctl branches delete \
  --project-id <YOUR_PROJECT_ID> \
  --branch restore-20251120-0928
```

## 📞 문제 해결

### 연결 실패
- 연결 문자열이 올바른지 확인
- SSL 모드가 `require`인지 확인
- 방화벽 설정 확인

### 데이터가 예상과 다름
- 복원 시점이 정확한지 확인 (2025-11-20 09:28:00)
- 다른 브랜치를 사용하고 있는지 확인

### Prisma 오류
- `npx prisma generate` 실행
- `npx prisma migrate deploy` 실행 (필요시)








