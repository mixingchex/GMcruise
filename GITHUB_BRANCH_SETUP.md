# 🌿 GitHub 브랜치 설정 가이드

**작성일**: 2025-11-23  
**목적**: 개발용(dev)과 배포용(main) 브랜치 분리

---

## 📋 브랜치 전략

- **`main`**: 실제 배포용 (건드리지 않음, 안정적인 버전만)
- **`dev`**: 개발 및 테스트용 (여기서 모든 작업)

---

## 🚀 단계별 명령어

### 1단계: GitHub 저장소 연동

**먼저 GitHub에서 저장소를 만들어야 합니다!**

저장소를 만든 후, 다음 명령어를 실행하세요:

```bash
# 프로젝트 폴더로 이동
cd /home/userhyeseon28/projects/cruise-guide

# 기존 연결 제거 (있다면)
git remote remove origin

# GitHub 저장소 연결
# ⚠️ 아래 URL을 본인의 GitHub 저장소 URL로 변경하세요!
git remote add origin https://github.com/your-username/cruise-guide.git

# 연결 확인
git remote -v
```

---

### 2단계: main 브랜치 푸시 (배포용)

```bash
# 현재 브랜치를 main으로 변경
git branch -M main

# GitHub에 main 브랜치 푸시
git push -u origin main
```

**성공하면**:
```
Enumerating objects: X, done.
Counting objects: 100% (X/X), done.
Writing objects: 100% (X/X), done.
To https://github.com/your-username/cruise-guide.git
 * [new branch]      main -> main
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

---

### 3단계: dev 브랜치 생성 및 설정

```bash
# dev 브랜치 생성 (main에서 분기)
git checkout -b dev

# 또는 이미 main에 있으면:
git branch dev
git checkout dev

# dev 브랜치를 GitHub에 푸시
git push -u origin dev
```

**성공하면**:
```
Total 0 (delta 0), reused 0 (delta 0)
To https://github.com/your-username/cruise-guide.git
 * [new branch]      dev -> dev
Branch 'dev' set up to track remote branch 'dev' from 'origin'.
```

---

### 4단계: 작업 환경을 dev 브랜치로 설정

```bash
# 현재 브랜치 확인
git branch

# dev 브랜치로 전환 (이미 dev에 있으면 생략)
git checkout dev

# 현재 브랜치 확인 (앞에 * 표시가 dev에 있으면 성공)
git branch
```

**성공하면**:
```
  main
* dev    <- * 표시가 dev에 있으면 성공!
```

---

## ✅ 확인 사항

### 브랜치 확인
```bash
# 로컬 브랜치 확인
git branch

# 원격 브랜치 확인
git branch -r

# 모든 브랜치 확인
git branch -a
```

### 현재 브랜치 확인
```bash
# 현재 브랜치 확인
git branch

# 또는
git status
```

---

## 🔄 일상적인 작업 흐름

### 개발 작업 시 (dev 브랜치에서)

```bash
# 1. dev 브랜치로 전환 (이미 있으면 생략)
git checkout dev

# 2. 작업 및 수정

# 3. 변경사항 커밋
git add .
git commit -m "작업 내용 설명"

# 4. GitHub에 푸시
git push origin dev
```

### 배포 시 (main 브랜치로 병합)

```bash
# 1. main 브랜치로 전환
git checkout main

# 2. dev 브랜치의 변경사항 가져오기
git pull origin dev

# 3. dev를 main에 병합
git merge dev

# 4. main 브랜치 푸시
git push origin main

# 5. 다시 dev 브랜치로 돌아가기
git checkout dev
```

---

## 🛡️ 안전장치

### main 브랜치 보호 (선택사항)

GitHub에서 main 브랜치를 보호할 수 있습니다:

1. GitHub 저장소 → Settings → Branches
2. "Add rule" 클릭
3. Branch name pattern: `main` 입력
4. "Require pull request reviews before merging" 체크
5. "Save" 클릭

이렇게 하면 main 브랜치에 직접 푸시할 수 없고, Pull Request를 통해서만 병합할 수 있습니다.

---

## 📝 체크리스트

- [ ] GitHub 저장소 생성 완료
- [ ] 로컬과 GitHub 연결 완료
- [ ] main 브랜치 푸시 완료
- [ ] dev 브랜치 생성 완료
- [ ] dev 브랜치 푸시 완료
- [ ] 현재 작업 환경이 dev 브랜치로 설정됨

---

## 🆘 문제 해결

### 문제 1: "remote origin already exists"

```bash
git remote remove origin
git remote add origin https://github.com/your-username/cruise-guide.git
```

### 문제 2: "branch 'main' already exists"

```bash
# 이미 main 브랜치가 있으므로 그대로 사용
git checkout main
```

### 문제 3: "fatal: A branch named 'dev' already exists"

```bash
# 이미 dev 브랜치가 있으므로 그대로 사용
git checkout dev
```

---

**이제 dev 브랜치에서 안전하게 개발하세요!** 🚀










