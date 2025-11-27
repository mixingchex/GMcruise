# Vercel 환경 변수 추가 상세 가이드

> **작성일**: 2025년 1월 28일  
> **페이지**: Vercel > Settings > Environment Variables

---

## ⚠️ 현재 에러 해결

**에러 메시지**: "Please define a name for your Environment Variable."

**원인**: Key 필드에 올바른 환경 변수 이름을 입력하지 않았습니다.

**해결**: Key 필드를 비우고 올바른 이름을 입력하세요.

---

## 📋 추가할 환경 변수

1. **YOUTUBE_API_KEY**: `AIzaSyDscvNSjhrahZDH5JXxEpBpk0xBWlybCsM`
2. **DATABASE_URL**: (Neon에서 복사한 연결 문자열)

---

## 🔧 단계별 추가 방법

### 1단계: YOUTUBE_API_KEY 추가

#### 현재 화면 정리 (에러 해결)

1. **Key 필드 비우기**
   - 현재 "CLIENT_KEY..."가 입력되어 있음
   - 전체 선택 (Ctrl+A 또는 Cmd+A) 후 삭제
   - 또는 Key 필드를 클릭하고 내용 삭제

2. **Key 필드에 입력**
   ```
   YOUTUBE_API_KEY
   ```
   - 정확히 이 이름으로 입력 (대소문자 구분)

3. **Value 필드 확인**
   - 현재 "https://www.cruisedot.co.kr"가 입력되어 있음
   - 이 값 삭제하고 아래 값 입력

4. **Value 필드에 입력**
   ```
   AIzaSyDscvNSjhrahZDH5JXxEpBpk0xBWlybCsM
   ```
   - 정확히 이 값으로 입력

5. **환경 (Environment) 드롭다운 확인**
   - 현재 "Production, Preview, and Development"로 설정되어 있음
   - 이대로 두면 모든 환경에 적용됨
   - 또는 "Production"만 선택 가능

6. **Save 버튼 클릭**
   - 에러 메시지가 사라지고 저장됨

---

### 2단계: DATABASE_URL 추가

#### YOUTUBE_API_KEY 저장 후

1. **"Add Another" 버튼 클릭**
   - YOUTUBE_API_KEY 저장 후 나타나는 버튼
   - 또는 페이지를 새로고침하고 다시 "새로 만들기" 탭 선택

2. **Key 필드에 입력**
   ```
   DATABASE_URL
   ```
   - 정확히 이 이름으로 입력 (대소문자 구분)

3. **Value 필드에 입력**
   - Neon에서 복사한 연결 문자열 붙여넣기
   - 예시: `postgresql://neondb_owner:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`
   - **중요**: `DATABASE_URL=` 부분은 제외하고 값만 붙여넣기

4. **환경 (Environment) 드롭다운 확인**
   - "Production, Preview, and Development" 또는 "Production" 선택

5. **Save 버튼 클릭**

---

## 📝 화면 구성 설명

### 현재 화면 요소

1. **Key 필드** (왼쪽)
   - 환경 변수 이름 입력
   - 예: `YOUTUBE_API_KEY`, `DATABASE_URL`

2. **Value 필드** (오른쪽)
   - 환경 변수 값 입력
   - 예: API 키, 연결 문자열

3. **환경 (Environment) 드롭다운**
   - "Production, Preview, and Development" 선택 가능
   - 또는 특정 환경만 선택

4. **Add Another 버튼**
   - 여러 환경 변수를 추가할 때 사용

5. **Save 버튼**
   - 저장 버튼 (오른쪽 하단)

---

## ✅ 정확한 입력 예시

### YOUTUBE_API_KEY

```
Key: YOUTUBE_API_KEY
Value: AIzaSyDscvNSjhrahZDH5JXxEpBpk0xBWlybCsM
Environment: Production, Preview, and Development
```

### DATABASE_URL

```
Key: DATABASE_URL
Value: postgresql://neondb_owner:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
Environment: Production, Preview, and Development
```

**참고**: DATABASE_URL의 실제 값은 Neon에서 복사한 연결 문자열로 교체하세요.

---

## 🔍 DATABASE_URL 값 확인 방법

### Neon에서 연결 문자열 복사

1. **Vercel > Storage > cruisedot 클릭**
2. **.env.local 탭 확인**
3. **Show secret 버튼 클릭** (👁️ 아이콘)
4. **DATABASE_URL= 뒤의 값 복사**
   - 예: `postgresql://neondb_owner:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`
5. **이 값만 복사** (앞의 `DATABASE_URL=`는 제외)

---

## ⚠️ 주의사항

### Key 필드
- ✅ 정확한 이름 입력 (대소문자 구분)
- ✅ 공백 없이 입력
- ❌ "CLIENT_KEY..." 같은 불완전한 이름 사용 금지

### Value 필드
- ✅ 정확한 값 입력
- ✅ 앞뒤 공백 제거
- ❌ URL이나 잘못된 값 입력 금지

### 에러 해결
- Key 필드가 비어있으면 에러 발생
- Key 필드에 올바른 이름을 입력하면 에러 해결

---

## 📋 체크리스트

### YOUTUBE_API_KEY
- [ ] Key 필드 비우기 (기존 내용 삭제)
- [ ] Key: `YOUTUBE_API_KEY` 입력
- [ ] Value: `AIzaSyDscvNSjhrahZDH5JXxEpBpk0xBWlybCsM` 입력
- [ ] 환경 드롭다운 확인
- [ ] Save 버튼 클릭
- [ ] 에러 메시지 사라짐 확인

### DATABASE_URL
- [ ] Neon에서 연결 문자열 복사
- [ ] "Add Another" 버튼 클릭
- [ ] Key: `DATABASE_URL` 입력
- [ ] Value: 복사한 연결 문자열 붙여넣기
- [ ] 환경 드롭다운 확인
- [ ] Save 버튼 클릭

---

## 🧪 저장 후 확인

### 환경 변수 목록 확인

1. **저장 후 목록에서 확인**
   - 아래 환경 변수 목록에서 `YOUTUBE_API_KEY`와 `DATABASE_URL` 확인
   - 값은 별표(****)로 마스킹되어 표시됨

2. **재배포 확인**
   - 환경 변수 변경 후 자동으로 재배포됩니다
   - 또는 수동으로 재배포할 수 있습니다

---

## 💡 팁

### 여러 환경 변수를 한 번에 추가

1. **첫 번째 환경 변수 저장**
   - YOUTUBE_API_KEY 저장

2. **"Add Another" 버튼 클릭**
   - 두 번째 환경 변수 입력 필드 나타남

3. **두 번째 환경 변수 입력**
   - DATABASE_URL 입력

4. **Save 버튼 클릭**
   - 두 환경 변수가 모두 저장됨

---

**작성자**: AI Assistant  
**상태**: 상세 가이드 작성 완료




