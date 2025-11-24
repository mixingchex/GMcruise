# 크루즈뉘우스 & 커뮤니티 봇 배포 가이드

## 📋 배포 전 체크리스트

### 1. 환경 변수 확인
다음 환경 변수들이 설정되어 있는지 확인하세요:

```bash
# 필수 환경 변수
DATABASE_URL=postgresql://...
GEMINI_API_KEY=your-gemini-api-key
CRON_SECRET=your-cron-secret-key

# 선택적 환경 변수 (이미지용)
PEXELS_API_KEY=your-pexels-api-key  # 선택사항 (크루즈정보사진 폴더 사용)

# 날씨/환율 API (선택사항)
OPENWEATHER_API_KEY=your-openweather-api-key
EXCHANGERATE_API_KEY=your-exchangerate-api-key
```

### 2. 데이터베이스 마이그레이션
```bash
# Prisma 스키마 확인
npx prisma generate
npx prisma db push
```

### 3. 크루즈정보사진 폴더 확인
`public/크루즈정보사진/` 폴더에 이미지가 있는지 확인:
- 코스타세레나
- MSC벨리시마
- 로얄캐리비안
- 고객 후기 자료
- 등등...

---

## 🚀 배포 프로세스

### Vercel 배포

1. **Git에 푸시**
   ```bash
   git add .
   git commit -m "크루즈뉘우스 & 커뮤니티 봇 기능 추가"
   git push origin main
   ```

2. **Vercel 자동 배포**
   - Vercel이 자동으로 감지하여 배포 시작
   - 빌드 로그 확인

3. **환경 변수 설정 확인**
   - Vercel 대시보드 → Settings → Environment Variables
   - 모든 필수 환경 변수 확인

4. **Cron Job 확인**
   - `vercel.json`의 cron 설정 확인:
     ```json
     {
       "path": "/api/cron/community-bot",
       "schedule": "0 8 * * *"
     }
     ```
   - 매일 오전 8시에 자동 실행

---

## ✅ 배포 후 확인 사항

### 1. 크루즈뉘우스 자동 생성 확인

**확인 방법:**
1. 배포 후 다음날 오전 8시 이후 확인
2. 또는 수동 실행:
   ```bash
   curl -X POST https://your-domain.com/api/cron/community-bot \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

**확인 위치:**
- 메인 화면: `/` → 맨 밑 "크루즈뉘우스" 섹션
- 크루즈뉘우스 페이지: `/community/cruisedot-news`
- 관리자 패널: `/admin/community` → 크루즈뉘우스 카테고리

**기대 결과:**
- ✅ 매일 오전 8시에 새로운 크루즈뉘우스 생성
- ✅ 메인 화면 맨 밑에 "최근" 태그와 함께 최신 뉴스 표시
- ✅ "크루즈 뉴스 전체 보기" 클릭 시 최신 뉴스 자동 표시
- ✅ 날씨/환율/증시 정보 포함
- ✅ 카카오톡 공유 버튼 포함

### 2. 커뮤니티 봇 활동 확인

**봇 활성화:**
1. 관리자 패널 접속: `/admin/community-bot`
2. "▶️ 봇 활성화" 버튼 클릭

**확인 방법:**
- 관리자 패널 → 커뮤니티 관리: `/admin/community`
- 메인 화면 → 커뮤니티 섹션: `/`
- 게시글/댓글/대댓글이 자동 생성되는지 확인

**기대 결과:**
- ✅ 게시글: 100자, 300자, 500자, 1000자, 1500자 (각 20%)
- ✅ 댓글/대댓글: 10자, 30자, 50자, 100자, 150자 (각 20%)
- ✅ 자연스러운 이모티콘 사용 (ㅋㅋ, ㅎㅎ, ^^ 등)
- ✅ 다양한 형태의 게시글 (질문형, 답변형, 경험 공유형)

### 3. 이미지 중복 방지 확인

**확인 방법:**
- 같은 크루즈뉘우스에서 이미지가 중복되지 않는지 확인
- 다양한 폴더에서 이미지가 선택되는지 확인

---

## 🔧 문제 해결

### 크루즈뉘우스가 생성되지 않는 경우

1. **Cron Job 확인**
   - Vercel 대시보드 → Functions → Cron Jobs
   - 실행 로그 확인

2. **에러 로그 확인**
   - Vercel 대시보드 → Functions → Logs
   - `[COMMUNITY BOT]` 로그 확인

3. **수동 실행 테스트**
   ```bash
   curl -X POST https://your-domain.com/api/cron/community-bot \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

### 봇이 활동하지 않는 경우

1. **봇 활성화 상태 확인**
   - 관리자 패널: `/admin/community-bot`
   - "🟢 활성화" 상태인지 확인

2. **SystemConfig 확인**
   ```sql
   SELECT * FROM "SystemConfig" WHERE "configKey" = 'community_bot_active';
   ```
   - `configValue`가 `'true'`인지 확인

3. **봇 사용자 확인**
   - 데이터베이스에서 봇 사용자(ID: 1) 존재 확인

### 이미지가 표시되지 않는 경우

1. **크루즈정보사진 폴더 확인**
   - `public/크루즈정보사진/` 폴더에 이미지가 있는지 확인
   - 파일 권한 확인

2. **이미지 경로 확인**
   - 브라우저 개발자 도구 → Network 탭
   - 이미지 요청이 404인지 확인

---

## 📊 모니터링

### 주요 지표 확인

1. **크루즈뉘우스 생성 빈도**
   - 매일 1개씩 생성되는지 확인
   - 중복 생성되지 않는지 확인

2. **커뮤니티 활동량**
   - 게시글/댓글/대댓글 생성 빈도
   - 글자수 분포 확인

3. **봇 활성화 상태**
   - 관리자 패널에서 주기적으로 확인

---

## 🎯 배포 완료 체크리스트

- [ ] 환경 변수 모두 설정됨
- [ ] 데이터베이스 마이그레이션 완료
- [ ] 크루즈정보사진 폴더 확인 완료
- [ ] Vercel 배포 완료
- [ ] Cron Job 설정 확인 완료
- [ ] 크루즈뉘우스 자동 생성 확인
- [ ] 메인 화면에 최신 뉴스 표시 확인
- [ ] 크루즈뉘우스 페이지에서 최신 뉴스 자동 표시 확인
- [ ] 커뮤니티 봇 활성화/비활성화 기능 확인
- [ ] 이미지 중복 방지 확인

---

## 📝 참고 사항

### 크루즈뉘우스 생성 스케줄
- **시간**: 매일 오전 8시 (KST)
- **빈도**: 하루 1개
- **봇 상태**: 무관 (항상 생성)

### 커뮤니티 봇 활동
- **활성화 시**: 게시글/댓글/대댓글 자동 생성
- **비활성화 시**: 활동 중단 (크루즈뉘우스는 계속 생성)

### 관리자 패널
- **경로**: `/admin/community-bot`
- **카테고리**: 마케팅
- **기능**: 봇 활성화/비활성화 토글

---

**배포 완료 후 모든 기능이 정상 작동하는지 확인하세요!** ✅
