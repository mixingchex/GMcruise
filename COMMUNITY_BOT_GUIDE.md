# 커뮤니티 봇 사용 가이드

## 📋 개요

크루즈몰 커뮤니티에 자동으로 게시글과 댓글을 생성하는 AI 봇입니다.
- **5분마다** 자동 실행
- 게시글 1개 생성
- 게시글에 맞는 댓글 1개 생성
- 기존 게시글 4개에 좋아요 4개, 뷰 4개씩 증가

## 🚀 실행 방법

### 방법 1: 스크립트 실행 (로컬/서버)

```bash
# 환경 변수 설정
export CRON_SECRET=your-secret-key-here
export API_URL=http://localhost:3000

# 봇 실행
./scripts/start-community-bot.sh
```

**백그라운드 실행:**
```bash
nohup ./scripts/start-community-bot.sh > bot.log 2>&1 &
```

**중지:**
```bash
# 프로세스 찾기
ps aux | grep start-community-bot

# 프로세스 종료
kill [PID]
```

### 방법 2: 외부 Cron 서비스 (Vercel, GitHub Actions 등)

**Vercel Cron 설정:**
```json
{
  "crons": [{
    "path": "/api/cron/community-bot",
    "schedule": "*/5 * * * *"
  }]
}
```

**GitHub Actions 예시:**
```yaml
name: Community Bot
on:
  schedule:
    - cron: '*/5 * * * *'  # 5분마다
jobs:
  bot:
    runs-on: ubuntu-latest
    steps:
      - name: Run Bot
        run: |
          curl -X POST ${{ secrets.API_URL }}/api/cron/community-bot \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

### 방법 3: 테스트 (개발 환경)

```bash
# GET 요청으로 테스트 (실제 저장 안 함)
curl http://localhost:3000/api/cron/community-bot

# POST 요청으로 실제 실행
curl -X POST http://localhost:3000/api/cron/community-bot \
  -H "Authorization: Bearer your-secret-key-here"
```

## ⚙️ 환경 변수 설정

`.env` 파일에 추가:

```bash
# 봇 API 인증용
CRON_SECRET=your-secret-key-here

# AI 생성용 (이미 설정되어 있을 수 있음)
GEMINI_API_KEY=your-gemini-key
```

## 🔍 봇 사용자 계정 확인

봇은 ID 1번 계정을 사용합니다. 계정이 없으면 자동으로 생성됩니다.

**수동 확인:**
```sql
SELECT * FROM "User" WHERE id = 1;
```

**또는 Node.js 스크립트:**
```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findUnique({ where: { id: 1 } }).then(u => {
  console.log('봇 사용자:', u);
  prisma.\$disconnect();
});
"
```

## ✅ 오류 방지 기능

1. **트랜잭션 안전성**
   - 각 작업이 독립적으로 실행
   - 하나 실패해도 다른 작업은 계속 진행

2. **에러 처리**
   - 모든 단계에 try-catch 적용
   - 상세한 로그 기록

3. **서버 부하 최소화**
   - 5분 간격 실행
   - 간단한 프롬프트 사용
   - AI 응답 타임아웃 설정

4. **데이터 무결성**
   - Prisma validation 통과
   - 필수 필드 자동 설정

## 📊 실행 결과 확인

**로그 확인:**
```bash
# 스크립트 실행 시 콘솔에 출력
[COMMUNITY BOT] 봇 실행 시작...
[COMMUNITY BOT] 게시글 생성 완료: ...
[COMMUNITY BOT] 게시글 저장 완료: ...
[COMMUNITY BOT] 댓글 저장 완료
[COMMUNITY BOT] 4개 게시글에 좋아요/뷰 증가 완료
```

**데이터 확인:**
```bash
node scripts/check-community-data-safe.js
```

## 🛠️ 문제 해결

### 봇이 실행되지 않을 때

1. **환경 변수 확인**
   ```bash
   echo $CRON_SECRET
   echo $GEMINI_API_KEY
   ```

2. **봇 사용자 확인**
   - ID 1번 계정이 있는지 확인
   - 없으면 자동 생성됨

3. **API 응답 확인**
   ```bash
   curl -X GET http://localhost:3000/api/cron/community-bot
   ```

### 오류가 발생할 때

1. **로그 확인**
   - 서버 콘솔 로그 확인
   - `bot.log` 파일 확인 (백그라운드 실행 시)

2. **수동 테스트**
   ```bash
   curl -X GET http://localhost:3000/api/cron/community-bot
   ```

3. **데이터베이스 확인**
   - 게시글이 생성되었는지 확인
   - 댓글이 생성되었는지 확인

## 🔒 보안

- **Cron Secret 필수**: POST 요청 시 인증 필요
- **GET 메서드**: 개발 환경에서만 허용
- **봇 계정**: 별도 계정 사용 (ID: 1)

## 📝 참고사항

- 봇이 생성하는 게시글/댓글은 실제 사용자처럼 보이도록 설계됨
- 좋아요/뷰는 기존 게시글 중 랜덤으로 선택하여 증가
- 서버 부하를 고려하여 5분 간격으로 실행

