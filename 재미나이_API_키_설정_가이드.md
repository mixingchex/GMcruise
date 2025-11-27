# 재미나이 API 키 설정 가이드

## 📋 개요

재미나이 API는 Google Gemini API를 사용하므로, `GEMINI_API_KEY` 환경 변수로 설정합니다.

## 🔑 재미나이 API 키

```
AIzaSyC7DeIRD9tvdBK81_MBRNv729Gh1uPxHM4
```

## ⚙️ Vercel 환경 변수 설정 방법

### 1. Vercel 대시보드 접속
1. [Vercel 대시보드](https://vercel.com/dashboard) 접속
2. 프로젝트 선택

### 2. 환경 변수 설정
1. **Settings** → **Environment Variables** 클릭
2. **Add New** 버튼 클릭
3. 다음 정보 입력:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: `AIzaSyC7DeIRD9tvdBK81_MBRNv729Gh1uPxHM4`
   - **Environment**: 
     - ✅ Production
     - ✅ Preview
     - ✅ Development
4. **Save** 클릭

### 3. 기존 키 업데이트 (이미 있는 경우)
1. 기존 `GEMINI_API_KEY` 환경 변수 찾기
2. **Edit** 클릭
3. **Value** 필드를 재미나이 API 키로 업데이트: `AIzaSyC7DeIRD9tvdBK81_MBRNv729Gh1uPxHM4`
4. **Save** 클릭

### 4. 배포 재실행
환경 변수를 업데이트한 후:
1. **Deployments** 탭으로 이동
2. 최신 배포의 **⋯** 메뉴 클릭
3. **Redeploy** 선택
4. 배포 완료 대기

## ✅ 확인 방법

### 1. 환경 변수 확인
- Vercel 대시보드에서 `GEMINI_API_KEY` 환경 변수가 올바르게 설정되어 있는지 확인
- Value가 `AIzaSyC7DeIRD9tvdBK81_MBRNv729Gh1uPxHM4`인지 확인

### 2. 기능 테스트
배포 후 다음 기능들이 정상 작동하는지 확인:
- [ ] 채팅 기능 (AI 응답)
- [ ] 이미지 번역 기능
- [ ] 번역 기능
- [ ] 여권 스캔 기능

## 🔍 사용 위치

재미나이 API 키(`GEMINI_API_KEY`)는 다음 위치에서 사용됩니다:

1. **채팅 스트리밍** (`app/api/chat/stream/route.ts`)
2. **이미지 번역** (`app/api/vision/route.ts`)
3. **번역 기능** (`app/api/chat/route.ts`)
4. **여권 스캔** (`app/api/passport/scan/route.ts`)
5. **발음 가이드** (`app/api/translation/pronunciation/route.ts`)
6. **채팅 사진** (`app/api/chat/photo/route.ts`)

## ⚠️ 주의 사항

1. **API 키 보안**: API 키는 절대 공개 저장소에 커밋하지 마세요.
2. **환경별 설정**: Production, Preview, Development 환경 모두에 설정하는 것을 권장합니다.
3. **키 형식**: Google API 키는 `AIzaSy`로 시작하는 약 39자리 문자열입니다.

## 📝 체크리스트

- [ ] Vercel에 `GEMINI_API_KEY` 환경 변수 추가/업데이트
- [ ] 재미나이 API 키 값이 올바르게 설정되었는지 확인
- [ ] Production, Preview, Development 환경 모두 선택
- [ ] 배포 재실행
- [ ] 배포 후 채팅 기능 테스트

---

## 완료! 🎉

재미나이 API 키 설정이 완료되었습니다. 배포 후 채팅 기능이 정상 작동하는지 확인하세요.

