# Vercel Production 배포 가이드

## 🎯 문제 상황
- Preview 배포는 완료되었지만 (`developx` 브랜치)
- Production 도메인(`www.cruisedot.co.kr`)에는 반영되지 않음

## ✅ 해결 방법 2가지

### 방법 1: Vercel 대시보드에서 Promote (가장 간단) ⭐ 추천

1. **Vercel 대시보드 접속**
   - https://vercel.com/dashboard
   - 프로젝트 선택

2. **Deployments 탭 클릭**
   - 최신 배포(Ready 상태) 찾기
   - 커밋 메시지: `fix: Prisma 클라이언트 Vercel 배포 오류 수정`

3. **배포 카드 우측 상단의 "..." 메뉴 클릭**
   - 또는 배포 상세 페이지에서

4. **"Promote to Production" 선택**
   - 확인 메시지가 나오면 "Promote" 클릭

5. **완료!**
   - Production 도메인에 자동 배포됨
   - `www.cruisedot.co.kr`에 반영됨

---

### 방법 2: main 브랜치에 merge (Git 사용)

#### 단계별 명령어:

```bash
# 1. 현재 developx 브랜치에서 main으로 전환
git checkout main

# 2. 최신 코드 가져오기
git pull origin main

# 3. developx 브랜치의 변경사항을 main에 merge
git merge developx

# 4. main 브랜치에 push (자동으로 Production 배포 시작)
git push origin main
```

#### 또는 GitHub에서 Pull Request 사용:

1. GitHub 저장소 접속
2. "Pull requests" 탭 클릭
3. "New pull request" 클릭
4. base: `main` ← compare: `developx` 선택
5. "Create pull request" → "Merge pull request"
6. Vercel이 자동으로 Production 배포 시작

---

## 🔍 배포 확인 방법

### 1. Vercel 대시보드 확인
- Deployments 탭에서 Production 배포 상태 확인
- "Ready" 상태가 되면 완료

### 2. 사이트 접속 확인
- https://www.cruisedot.co.kr 접속
- 500 에러가 사라졌는지 확인

### 3. 로그 확인
- Vercel 대시보드 → 최신 배포 → Logs
- `Cannot find module '.prisma/client/default'` 에러가 없어야 함

---

## 💡 추천 방법

**초보자라면 방법 1 (Promote)을 추천합니다!**
- Git 명령어 없이 Vercel 대시보드에서 클릭만 하면 됨
- 빠르고 안전함
- 실수할 가능성이 적음

---

## ⚠️ 주의사항

- Production 배포는 보통 2-3분 소요
- 배포 중에는 사이트가 일시적으로 느려질 수 있음
- 배포 완료 후 사이트가 정상 작동하는지 반드시 확인

