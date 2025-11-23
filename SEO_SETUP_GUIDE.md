# SEO 설정 완전 자동화 가이드

## ✅ 완료된 자동화 기능

1. **Google Search Console Verification** - 관리자 패널에서 입력하면 자동으로 적용됩니다
2. **Google Analytics** - 관리자 패널에서 입력하면 자동으로 적용됩니다
3. **소셜 미디어 링크** - 관리자 패널에서 입력하면 구조화된 데이터에 자동 반영됩니다
4. **연락처 정보** - 관리자 패널에서 입력하면 구조화된 데이터에 자동 반영됩니다

---

## 📋 단계별 설정 가이드

### 1단계: 관리자 패널 접속

1. 브라우저에서 사이트 접속
2. `/admin/settings` 페이지로 이동
   - 예: `https://cruisedot.co.kr/admin/settings`
3. 로그인 (관리자 권한 필요)

---

### 2단계: Google Search Console 설정

#### 2-1. Google Search Console에서 Verification 코드 받기

1. **Google Search Console 접속**
   - 링크: https://search.google.com/search-console
   - 또는 관리자 패널의 "Google Search Console 접속 (클릭)" 링크 클릭

2. **속성 추가**
   - 왼쪽 상단의 **"속성 추가"** 버튼 클릭
   - **"URL 접두어"** 선택
   - 사이트 URL 입력 (예: `https://cruisedot.co.kr`)
   - **"계속"** 버튼 클릭

3. **소유권 확인 방법 선택**
   - **"HTML 태그"** 방법 선택
   - 표시된 메타 태그에서 `content="..."` 부분의 따옴표 안 값만 복사
   - 예: `<meta name="google-site-verification" content="abc123def456ghi789" />`
   - → 복사할 값: `abc123def456ghi789`

#### 2-2. 관리자 패널에 입력

1. 관리자 패널의 **"SEO 전역 설정"** 섹션으로 스크롤
2. **"Google Search Console Verification 코드"** 입력란 찾기
3. 복사한 값 붙여넣기
4. **"저장하기"** 버튼 클릭
5. ✅ **자동 적용 완료!** - 사이트에 자동으로 메타 태그가 추가됩니다

#### 2-3. Google Search Console에서 확인

1. Google Search Console 페이지로 돌아가기
2. **"확인"** 버튼 클릭
3. ✅ 사이트 소유권 확인 완료!

---

### 3단계: Google Analytics 설정

#### 3-1. Google Analytics에서 Measurement ID 받기

1. **Google Analytics 접속**
   - 링크: https://analytics.google.com
   - 또는 관리자 패널의 "Google Analytics 접속 (클릭)" 링크 클릭

2. **측정 ID 확인**
   - 왼쪽 하단의 **"관리"** (톱니바퀴 아이콘) 클릭
   - **"속성"** 열에서 **"속성 설정"** 클릭
   - **"측정 ID"** 섹션에서 `G-XXXXXXXXXX` 형식의 ID 확인
   - 예: `G-ABC123XYZ456`
   - ID를 복사

#### 3-2. 관리자 패널에 입력

1. 관리자 패널의 **"Google Analytics 설정"** 섹션으로 스크롤
2. **"Google Analytics 4 Measurement ID"** 입력란 찾기
3. 복사한 ID 붙여넣기 (예: `G-ABC123XYZ456`)
4. **"저장하기"** 버튼 클릭
5. ✅ **자동 적용 완료!** - Google Analytics가 자동으로 활성화됩니다

---

### 4단계: 소셜 미디어 링크 설정

#### 각 소셜 미디어의 URL 찾는 방법

1. **Facebook 페이지 URL**
   - Facebook 페이지 접속
   - 주소창의 URL 복사
   - 예: `https://www.facebook.com/yourpage`

2. **Instagram 프로필 URL**
   - Instagram 프로필 접속
   - 주소창의 URL 복사
   - 예: `https://www.instagram.com/yourprofile`

3. **YouTube 채널 URL**
   - YouTube 채널 접속
   - 주소창의 URL 복사
   - 예: `https://www.youtube.com/@cruisedotgini`

4. **Twitter/X 프로필 URL**
   - Twitter/X 프로필 접속
   - 주소창의 URL 복사
   - 예: `https://twitter.com/yourprofile`

5. **네이버 블로그 URL**
   - 네이버 블로그 접속
   - 주소창의 URL 복사
   - 예: `https://blog.naver.com/yourblog`

6. **카카오톡 채널 URL**
   - 카카오톡 채널 접속
   - 주소창의 URL 복사
   - 예: `https://pf.kakao.com/yourchannel`

#### 관리자 패널에 입력

1. 관리자 패널의 **"소셜 미디어 링크"** 섹션으로 스크롤
2. 각 소셜 미디어의 URL 입력란에 해당 URL 붙여넣기
3. **"저장하기"** 버튼 클릭
4. ✅ **자동 적용 완료!** - 구조화된 데이터에 자동으로 반영됩니다

---

### 5단계: 기본 SEO 설정

1. **기본 사이트명**: 사이트 이름 입력 (예: `크루즈 가이드`)
2. **기본 사이트 설명**: 사이트에 대한 설명 입력
3. **기본 키워드**: 쉼표로 구분하여 키워드 입력 (예: `크루즈, 크루즈 여행, 일본 크루즈`)
4. **기본 Open Graph 이미지 URL**: 공유 시 표시될 이미지 URL 입력
5. **"저장하기"** 버튼 클릭

---

### 6단계: 연락처 정보 설정

1. **전화번호**: 고객센터 전화번호 입력 (예: `010-3289-3800`)
2. **이메일**: 고객센터 이메일 입력 (예: `contact@cruisedot.co.kr`)
3. **주소**: 회사 주소 입력 (예: `서울시 강남구...`)
4. **"저장하기"** 버튼 클릭
5. ✅ **자동 적용 완료!** - 구조화된 데이터에 자동으로 반영됩니다

---

## 🎉 완료!

모든 설정이 완료되면:
- ✅ Google Search Console에서 사이트 소유권 확인
- ✅ Google Analytics에서 사이트 방문자 추적 시작
- ✅ 검색 엔진에 구조화된 데이터 자동 제공
- ✅ 소셜 미디어 공유 시 최적화된 정보 표시

**모든 설정은 관리자 패널에서 언제든지 수정할 수 있습니다!**






