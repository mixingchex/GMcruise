# Vercel 환경변수 설정 상세 가이드

**설정할 환경변수**: `WEATHER_API_KEY` = `8cf954892eb9405681b63201252611`

---

## 📋 전체 과정 (약 3분)

1. Vercel 대시보드 접속
2. 프로젝트 선택
3. Settings → Environment Variables 이동
4. 환경변수 추가/수정
5. 재배포

---

## 1단계: Vercel 대시보드 접속

### 1-1. 브라우저에서 Vercel 사이트 열기
1. 브라우저 주소창에 입력:
   ```
   https://vercel.com
   ```
2. Enter 키 누르기

### 1-2. 로그인
1. 페이지 오른쪽 상단의 **"Log In"** 또는 **"Sign In"** 버튼 클릭
2. GitHub, GitLab, Bitbucket 중 하나로 로그인
   - 보통 GitHub로 로그인
3. 로그인 완료

---

## 2단계: 프로젝트 선택

### 2-1. 프로젝트 목록 확인
1. 로그인 후 **Dashboard** 페이지로 이동
2. 프로젝트 목록에서 **"cruise-guide"** 또는 해당 프로젝트 찾기
3. 프로젝트 이름 클릭

### 2-2. 프로젝트 대시보드 확인
- 프로젝트 대시보드 페이지로 이동
- 상단에 프로젝트 이름 표시 확인

---

## 3단계: Settings 메뉴 이동

### 3-1. Settings 탭 클릭
1. 프로젝트 대시보드 상단 메뉴 확인:
   - **Overview** | **Deployments** | **Analytics** | **Settings** | ...
2. **"Settings"** 탭 클릭

### 3-2. Settings 페이지 확인
- Settings 페이지로 이동
- 왼쪽에 여러 메뉴가 표시됨

---

## 4단계: Environment Variables 메뉴 이동

### 4-1. 왼쪽 메뉴에서 선택
Settings 페이지 왼쪽 메뉴에서:
- **General**
- **Domains**
- **Environment Variables** ← **이것 클릭!**
- **Functions**
- **Git**
- ...

**"Environment Variables"** 클릭

### 4-2. Environment Variables 페이지 확인
- 환경변수 목록이 표시됨
- 기존 환경변수들이 보일 수 있음
- 오른쪽 상단에 **"Add New"** 또는 **"Add"** 버튼이 있음

---

## 5단계: 환경변수 추가/수정

### 5-1. 기존 환경변수 확인
1. 목록에서 `WEATHER_API_KEY` 찾기
2. **있으면**: 오른쪽의 **"..."** 또는 **수정 아이콘** 클릭
3. **없으면**: **"Add New"** 또는 **"Add"** 버튼 클릭

### 5-2. 환경변수 입력 (새로 추가하는 경우)

**"Add New"** 버튼 클릭 후:

1. **Key (이름) 입력**
   - 첫 번째 입력 필드에 입력:
   ```
   WEATHER_API_KEY
   ```
   - ⚠️ **정확히 입력**: 대소문자 구분, 언더스코어(_) 포함

2. **Value (값) 입력**
   - 두 번째 입력 필드에 입력:
   ```
   8cf954892eb9405681b63201252611
   ```
   - ⚠️ **정확히 복사**: 앞뒤 공백 없이

3. **Environment 선택**
   - 세 가지 옵션이 있음:
     - ☐ **Production** (프로덕션 환경)
     - ☐ **Preview** (프리뷰 환경)
     - ☐ **Development** (개발 환경)
   
   - **모두 체크** 또는 **"All"** 선택
   - ⚠️ **중요**: 최소한 **Production**은 반드시 체크

4. **Save 버튼 클릭**
   - 오른쪽 하단 또는 상단의 **"Save"** 버튼 클릭

### 5-3. 환경변수 수정 (기존 값이 있는 경우)

1. `WEATHER_API_KEY` 찾기
2. 오른쪽의 **"..."** 또는 **수정 아이콘** 클릭
3. **Value** 필드의 값을 다음으로 변경:
   ```
   8cf954892eb9405681b63201252611
   ```
4. **Save** 버튼 클릭

---

## 6단계: 재배포 (필수!)

### 6-1. 자동 재배포 확인
- 환경변수를 추가/수정하면 자동으로 재배포가 시작될 수 있음
- 상단에 배포 알림이 표시될 수 있음

### 6-2. 수동 재배포 (자동이 안 되면)

1. 상단 메뉴에서 **"Deployments"** 탭 클릭
2. 최신 배포 항목 찾기
3. 오른쪽의 **"..."** (점 3개) 메뉴 클릭
4. **"Redeploy"** 선택
5. 확인 대화상자에서 **"Redeploy"** 클릭
6. 배포 완료까지 대기 (1-3분)

---

## ✅ 확인 방법

### 1. 환경변수 확인
1. Settings → Environment Variables
2. `WEATHER_API_KEY` 목록에서 확인
3. Value가 `8cf954892eb9405681b63201252611`인지 확인
4. Environment에 Production, Preview, Development 모두 체크되어 있는지 확인

### 2. 배포 확인
1. Deployments 탭 클릭
2. 최신 배포 상태 확인
3. **"Ready"** 또는 **"Success"** 상태인지 확인

### 3. 기능 테스트
1. 프로덕션 사이트 접속
2. 지니 브리핑 페이지로 이동
3. 날씨 정보 클릭
4. 14일 예보가 정상적으로 표시되는지 확인

---

## 🆘 문제 해결

### "Add New" 버튼이 안 보임
- **원인**: 권한이 없거나 페이지 로딩 중
- **해결**: 
  1. 페이지 새로고침 (F5)
  2. 프로젝트 소유자 권한 확인

### 환경변수를 저장했는데 적용이 안 됨
- **원인**: 재배포가 안 됨
- **해결**: 
  1. Deployments 탭에서 수동 Redeploy 실행
  2. 배포 완료까지 대기

### 환경변수가 사라짐
- **원인**: 실수로 삭제됨
- **해결**: 
  1. 다시 추가
  2. 재배포 실행

---

## 📝 빠른 참조

### 환경변수 정보
```
Key: WEATHER_API_KEY
Value: 8cf954892eb9405681b63201252611
Environment: All (또는 Production, Preview, Development 모두)
```

### 설정 순서 요약
1. Vercel.com 접속 → 로그인
2. 프로젝트 선택 (cruise-guide)
3. Settings → Environment Variables
4. Add New 클릭
5. Key: `WEATHER_API_KEY` 입력
6. Value: `8cf954892eb9405681b63201252611` 입력
7. Environment: All 선택
8. Save 클릭
9. Redeploy 실행

---

## 🎯 체크리스트

- [ ] Vercel.com 접속 및 로그인 완료
- [ ] 프로젝트 선택 완료
- [ ] Settings → Environment Variables 이동 완료
- [ ] `WEATHER_API_KEY` 환경변수 추가/수정 완료
- [ ] Value: `8cf954892eb9405681b63201252611` 입력 완료
- [ ] Environment: All 선택 완료
- [ ] Save 클릭 완료
- [ ] 재배포 완료
- [ ] 배포 상태 확인 완료
- [ ] 프로덕션 사이트에서 날씨 기능 테스트 완료

---

## 💡 팁

### 환경변수 관리
- 여러 환경변수를 한 번에 추가할 수 있음
- 환경변수는 암호화되어 저장됨
- 환경변수 변경 시 자동 재배포가 시작될 수 있음

### 보안
- 환경변수 값은 다른 사람에게 공유하지 마세요
- API 키는 절대 GitHub에 커밋하지 마세요
- `.env.local` 파일도 `.gitignore`에 포함되어 있는지 확인

---

**이제 Vercel에서 환경변수를 설정하고 재배포하면 날씨 기능이 작동합니다!** 🌤️

