# Vercel Git 재연결 가이드

> **작성일**: 2025년 1월 28일  
> **에러**: "Error: Project Link not found."  
> **저장소**: monicajeon28/cruiseguide

---

## ⚠️ 현재 상황

### 에러 메시지
- **"Error: Project Link not found."**
- 저장소: `monicajeon28/cruiseguide`

### 의미
- Vercel이 GitHub 저장소를 찾을 수 없습니다
- 저장소 연결이 끊어졌거나 저장소 이름이 변경되었을 수 있습니다

---

## ✅ 해결 방법

### 방법 1: Reconnect 버튼 클릭 (권장)

1. **"Reconnect" 버튼 클릭**
   - 빨간색 "Reconnect" 버튼 클릭
   - 저장소를 다시 연결하려고 시도합니다

2. **GitHub 인증 확인**
   - GitHub 로그인 화면이 나타날 수 있음
   - GitHub 계정으로 로그인

3. **저장소 선택**
   - 연결할 저장소 선택
   - `monicajeon28/cruiseguide` 또는 올바른 저장소 선택

4. **연결 완료 확인**
   - 에러 메시지가 사라지고 연결 상태로 변경됨

---

### 방법 2: 저장소 이름 확인 후 재연결

#### 먼저 GitHub에서 저장소 확인

1. **GitHub 접속**
   - https://github.com 접속
   - 로그인

2. **저장소 확인**
   - `monicajeon28` 계정의 저장소 목록 확인
   - `cruiseguide` 또는 `GMcruise` 같은 저장소가 있는지 확인
   - 정확한 저장소 이름 확인

#### Vercel에서 재연결

1. **"Reconnect" 버튼 클릭**

2. **올바른 저장소 선택**
   - GitHub에서 확인한 정확한 저장소 이름 선택
   - 예: `monicajeon28/GMcruise` 또는 `monicajeon28/cruiseguide`

3. **연결 완료 확인**

---

### 방법 3: 저장소 삭제 후 새로 연결

Reconnect가 작동하지 않는 경우:

1. **"Disconnect" 또는 "Remove" 버튼 찾기**
   - 에러 박스 안에 "Disconnect" 버튼이 있을 수 있음
   - 또는 다른 위치에 있을 수 있음

2. **저장소 연결 해제**
   - "Disconnect" 클릭
   - 확인 메시지에서 확인

3. **새로 연결**
   - "Connect Git Repository" 버튼 클릭
   - GitHub 저장소 선택
   - 연결 완료

---

## 🎯 지금 할 일

### 우선순위 1: Reconnect 시도

1. **"Reconnect" 버튼 클릭** (빨간색 버튼)
2. **GitHub 인증 확인**
3. **저장소 선택 확인**
4. **연결 완료 확인**

---

### 우선순위 2: 재배포 진행 (Git 연결과 별개)

**중요**: Git 연결 문제는 재배포를 막지 않습니다.

1. **Deployments 탭으로 이동**
   - 상단 메뉴에서 "Deployments" 클릭

2. **재배포 실행**
   - 최신 배포 > ⋯ 메뉴 > "Redeploy"
   - 에러 메시지가 있어도 재배포 가능

3. **배포 완료 확인**
   - "Building" → "Ready" 상태 확인

---

## 📋 체크리스트

### Git 재연결
- [ ] "Reconnect" 버튼 클릭
- [ ] GitHub 인증 확인
- [ ] 저장소 선택 확인
- [ ] 연결 완료 확인
- [ ] 에러 메시지 사라짐 확인

### 재배포 (별도로 진행)
- [ ] Deployments 탭 이동
- [ ] 재배포 실행
- [ ] 배포 완료 확인
- [ ] 웹사이트 테스트

---

## 💡 중요 사항

### Git 연결과 재배포는 별개

- ✅ **Git 연결 문제는 재배포를 막지 않습니다**
- ✅ **환경 변수는 이미 저장되어 있습니다**
- ✅ **수동 재배포는 정상 작동합니다**

### Git 연결의 영향

- ⚠️ **새로운 커밋이 있을 때 자동 배포가 안 될 수 있음**
- ✅ **수동 재배포는 정상 작동**
- ✅ **환경 변수 변경은 정상 작동**

---

## 🔍 저장소 이름 확인

### GitHub에서 확인

1. **https://github.com/monicajeon28 접속**
2. **Repositories 탭 확인**
3. **저장소 이름 확인**
   - `cruiseguide`?
   - `GMcruise`?
   - 다른 이름?

4. **정확한 저장소 이름 확인 후 Vercel에서 재연결**

---

## 🚨 문제가 계속되는 경우

### 저장소가 없는 경우

1. **GitHub에서 저장소 생성**
   - 새 저장소 생성
   - 또는 기존 저장소 확인

2. **Vercel에서 새로 연결**
   - "Connect Git Repository" 클릭
   - 새 저장소 선택

---

**작성자**: AI Assistant  
**상태**: Git 재연결 가이드 작성 완료

