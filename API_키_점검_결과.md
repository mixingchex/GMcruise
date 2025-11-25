# API 키 점검 결과

## 테스트 완료 (2025년 11월 25일)

### ❌ 문제 발견: YouTube API 키 만료

**현재 키:** `AIzaSyCvQaStyRSjrdckSLC7QDzXVdRUet-NtEU`

**에러 메시지:**
```
API key expired. Please renew the API key.
```

**해결 방법:** 새로운 YouTube API 키를 발급받아야 합니다.

---

### ✅ 정상 작동: Gemini API

**현재 키:** `AIzaSyCgC4mZ1TCUaA4vhpkwfdtLZdXEslvqpA8`

**상태:** 정상 작동 확인

**사용 가능한 모델:**
- `gemini-2.5-flash` (권장)
- `gemini-2.5-pro`
- `gemini-2.5-pro-preview-06-05`

---

### ✅ 정상 작동: 데이터베이스 연결

**DATABASE_URL:** Neon PostgreSQL 연결 정상

**상태:** Prisma 스키마 검증 완료

---

## 🔧 수정 방법: YouTube API 키 새로 발급

### 1단계: Google Cloud Console 접속
1. https://console.cloud.google.com 접속
2. 프로젝트 선택 (또는 새 프로젝트 생성)

### 2단계: YouTube Data API v3 활성화
1. 좌측 메뉴 → "API 및 서비스" → "라이브러리"
2. 검색창에 "YouTube Data API v3" 입력
3. "YouTube Data API v3" 클릭
4. "사용 설정" 버튼 클릭

### 3단계: API 키 생성
1. 좌측 메뉴 → "API 및 서비스" → "사용자 인증 정보"
2. 상단 "+ 사용자 인증 정보 만들기" 클릭
3. "API 키" 선택
4. 새로 생성된 API 키 복사

### 4단계: API 키 제한 설정 (선택사항이지만 권장)
1. 생성된 API 키 우측 "편집" 아이콘 클릭
2. "API 제한사항" 섹션:
   - "키 제한" 선택
   - "YouTube Data API v3" 선택
3. "저장" 클릭

### 5단계: Vercel 환경 변수 업데이트
1. https://vercel.com 접속
2. 프로젝트 → Settings → Environment Variables
3. `YOUTUBE_API_KEY` 찾기
4. 새로운 API 키로 업데이트
5. Production, Preview, Development 모두 체크

### 6단계: .env.local 파일 업데이트 (로컬 개발용)
```bash
YOUTUBE_API_KEY=새로_발급받은_API_키
```

### 7단계: Vercel 재배포
1. Vercel 대시보드 → Deployments 탭
2. 최근 배포 → ... 메뉴 → Redeploy
3. "Redeploy" 버튼 클릭하여 확인

---

## 📝 재배포 후 확인 사항

배포가 완료되면 메인 페이지에서 다음을 확인하세요:

1. ✅ 유튜브 Shorts 섹션이 제대로 표시되는지
2. ✅ 유튜브 Videos 섹션이 제대로 표시되는지
3. ✅ 유튜브 라이브 방송 섹션이 제대로 표시되는지

**브라우저 개발자 도구 (F12) → Console 탭에서 에러가 없는지 확인**

---

## 💡 참고 사항

### YouTube API 할당량
- 기본 할당량: 하루 10,000 units
- 채널 정보 조회: 1 unit
- 플레이리스트 조회: 1 unit
- 영상 정보 조회: 1 unit

할당량이 부족하면 Google Cloud Console에서 추가 할당량을 요청할 수 있습니다.

### 코드에서 사용 중인 채널 ID
```
UCKLDsk4iNXT1oYJ5ikUFggQ (크루즈닷AI지니)
```

---

## ✅ 최종 체크리스트

- [ ] YouTube API 키 새로 발급
- [ ] Vercel 환경 변수 업데이트
- [ ] .env.local 파일 업데이트
- [ ] Vercel 재배포
- [ ] 메인 페이지 유튜브 섹션 확인
- [ ] 브라우저 콘솔 에러 확인

새 API 키 발급 후 **재배포는 필수**입니다!
