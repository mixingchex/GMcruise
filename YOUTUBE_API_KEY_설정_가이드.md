# YouTube API 키 설정 가이드

> **작성일**: 2025년 1월 28일  
> **API 키**: `AIzaSyDscvNSjhrahZDH5JXxEpBpk0xBWlybCsM`

---

## ⚠️ 중요 보안 사항

**절대 다음을 하지 마세요:**
- ❌ API 키를 코드에 하드코딩
- ❌ API 키를 GitHub에 커밋
- ❌ API 키를 공개 문서에 노출

**올바른 방법:**
- ✅ 환경 변수로만 사용
- ✅ Vercel 환경 변수에 설정
- ✅ `.env.local` 파일에만 저장 (로컬 개발용, Git에 커밋하지 않음)

---

## 📋 Vercel 환경 변수 설정 방법

### 1단계: Vercel 대시보드 접속
1. https://vercel.com/dashboard 접속
2. 로그인

### 2단계: 프로젝트 선택
1. **cruise-guide** 프로젝트 클릭

### 3단계: Settings 이동
1. 상단 메뉴에서 **Settings** 클릭
2. 왼쪽 사이드바에서 **Environment Variables** 클릭

### 4단계: 환경 변수 추가
1. **Add New** 버튼 클릭
2. 다음 정보 입력:
   ```
   Key: YOUTUBE_API_KEY
   Value: AIzaSyDscvNSjhrahZDH5JXxEpBpk0xBWlybCsM
   Environment: Production (또는 All)
   ```
3. **Save** 버튼 클릭

### 5단계: 재배포
- 환경 변수 변경 후 자동으로 재배포됩니다
- 또는 수동으로 재배포할 수 있습니다:
  1. **Deployments** 탭 이동
  2. 최신 배포 옆 **⋯** 메뉴 클릭
  3. **Redeploy** 선택

---

## 🧪 테스트 방법

### 배포 후 테스트
```bash
curl https://www.cruisedot.co.kr/api/public/youtube?maxResults=6
```

**예상 응답** (성공 시):
```json
{
  "ok": true,
  "channel": {
    "id": "UCKLDsk4iNXT1oYJ5ikUFggQ",
    "title": "크루즈닷AI지니",
    ...
  },
  "videos": [
    {
      "id": "...",
      "title": "...",
      "thumbnail": "...",
      "url": "..."
    },
    ...
  ]
}
```

**예상 응답** (API 키 없을 때):
```json
{
  "ok": true,
  "channel": null,
  "videos": []
}
```

---

## 📝 로컬 개발 환경 설정 (선택사항)

로컬에서 테스트하려면 `.env.local` 파일에 추가:

```bash
# .env.local
YOUTUBE_API_KEY=AIzaSyDscvNSjhrahZDH5JXxEpBpk0xBWlybCsM
```

**주의**: `.env.local` 파일은 `.gitignore`에 포함되어 있어 Git에 커밋되지 않습니다.

---

## ✅ 확인 체크리스트

- [ ] Vercel 환경 변수에 `YOUTUBE_API_KEY` 추가 완료
- [ ] Environment를 `Production` (또는 `All`)로 설정
- [ ] 재배포 완료
- [ ] 배포 후 API 테스트 성공
- [ ] 유튜브 영상이 정상적으로 표시되는지 확인

---

## 🔍 문제 해결

### API가 여전히 빈 배열을 반환하는 경우

1. **환경 변수 확인**
   - Vercel 대시보드에서 `YOUTUBE_API_KEY`가 올바르게 설정되었는지 확인
   - Environment가 `Production`으로 설정되었는지 확인

2. **재배포 확인**
   - 환경 변수 변경 후 재배포가 완료되었는지 확인
   - 배포 로그에서 에러가 없는지 확인

3. **API 키 유효성 확인**
   - YouTube API 콘솔에서 API 키가 활성화되어 있는지 확인
   - API 키에 YouTube Data API v3 권한이 있는지 확인

4. **채널 ID 확인**
   - 코드에서 사용하는 채널 ID: `UCKLDsk4iNXT1oYJ5ikUFggQ`
   - 이 채널 ID가 올바른지 확인

---

## 📚 참고 자료

- [YouTube Data API v3 문서](https://developers.google.com/youtube/v3)
- [Vercel 환경 변수 설정 가이드](https://vercel.com/docs/concepts/projects/environment-variables)

---

**작성자**: AI Assistant  
**상태**: 설정 가이드 작성 완료




