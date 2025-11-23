# 🏷️ Git 태그 생성 및 버전 관리 가이드

**목적**: 안정적인 버전을 태그로 저장하고, 필요시 되돌리기

---

## 📋 현재 상황

- **main 브랜치**: 안정적인 배포 상태
- **dev 브랜치**: 개발 중인 상태
- **목표**: main 브랜치를 v1.0.0으로 태그 생성

---

## 🏷️ 1. v1.0.0 태그 생성

### 방법 1: 간단한 태그 (권장)

```bash
cd /home/userhyeseon28/projects/cruise-guide

# main 브랜치로 전환
git checkout main

# v1.0.0 태그 생성
git tag -a v1.0.0 -m "Release v1.0.0: 안정적인 배포 버전"

# 태그 확인
git tag -l

# GitHub에 태그 푸시
git push origin v1.0.0
```

### 방법 2: 상세한 릴리즈 노트 포함

```bash
cd /home/userhyeseon28/projects/cruise-guide

# main 브랜치로 전환
git checkout main

# v1.0.0 태그 생성 (상세 메시지)
git tag -a v1.0.0 -m "Release v1.0.0

안정적인 배포 버전
- 주요 기능 완료
- 타입 에러 수정
- 성능 최적화
- 보안 검증 완료"

# 태그 확인
git tag -l

# GitHub에 태그 푸시
git push origin v1.0.0
```

---

## 🔄 2. v1.0.0으로 되돌리기

### 방법 1: 특정 태그로 체크아웃 (읽기 전용)

```bash
# v1.0.0 태그로 체크아웃
git checkout v1.0.0

# 이 상태는 "detached HEAD" 상태입니다
# 코드를 확인하거나 테스트만 가능
```

### 방법 2: 새 브랜치 생성 (수정 가능)

```bash
# v1.0.0 태그에서 새 브랜치 생성
git checkout -b hotfix-v1.0.0 v1.0.0

# 이제 이 브랜치에서 수정 가능
# 수정 후 커밋하고 필요시 main에 병합
```

### 방법 3: main 브랜치를 v1.0.0으로 리셋 (주의!)

```bash
# ⚠️ 주의: 이 방법은 main 브랜치의 모든 변경사항을 삭제합니다!

# main 브랜치로 전환
git checkout main

# v1.0.0 태그로 리셋 (hard reset)
git reset --hard v1.0.0

# 강제 푸시 (주의!)
git push origin main --force
```

**⚠️ 경고**: `--force` 푸시는 위험합니다! 팀원과 협의 후 진행하세요.

### 방법 4: 특정 커밋으로 되돌리기 (안전)

```bash
# v1.0.0 태그의 커밋 해시 확인
git rev-parse v1.0.0

# 해당 커밋으로 되돌리기
git checkout <커밋해시>

# 또는
git checkout v1.0.0
```

---

## 📝 3. 태그 관리 명령어

### 태그 목록 보기
```bash
# 모든 태그 보기
git tag -l

# 패턴으로 태그 찾기
git tag -l "v1.*"
```

### 태그 상세 정보 보기
```bash
# 태그 정보 확인
git show v1.0.0
```

### 태그 삭제 (로컬)
```bash
# 로컬 태그 삭제
git tag -d v1.0.0
```

### 태그 삭제 (원격)
```bash
# 원격 태그 삭제
git push origin --delete v1.0.0
```

---

## 🔄 4. 되돌리기 시나리오별 가이드

### 시나리오 1: 코드 확인만 필요
```bash
git checkout v1.0.0
# 코드 확인 후
git checkout main  # 또는 dev
```

### 시나리오 2: 버그 수정 (Hotfix)
```bash
# v1.0.0에서 hotfix 브랜치 생성
git checkout -b hotfix-v1.0.1 v1.0.0

# 버그 수정
# ... 코드 수정 ...

# 커밋
git add .
git commit -m "Fix: 버그 수정"

# main에 병합
git checkout main
git merge hotfix-v1.0.1

# 새 태그 생성
git tag -a v1.0.1 -m "Hotfix v1.0.1"
git push origin v1.0.1
```

### 시나리오 3: 완전히 되돌리기 (비상시)
```bash
# ⚠️ 매우 주의해서 사용!

# main 브랜치로 전환
git checkout main

# v1.0.0으로 리셋
git reset --hard v1.0.0

# 강제 푸시
git push origin main --force
```

---

## 📊 5. 태그와 브랜치 차이

| 항목 | 태그 (Tag) | 브랜치 (Branch) |
|------|-----------|----------------|
| 용도 | 특정 버전 표시 | 개발 작업 |
| 변경 가능 | ❌ 불가능 | ✅ 가능 |
| 이동 | `git checkout v1.0.0` | `git checkout main` |
| 푸시 | `git push origin v1.0.0` | `git push origin main` |

---

## 🎯 6. 권장 워크플로우

### 정상적인 개발 흐름
```
main (v1.0.0) ← 태그
  ↓
dev (개발 중)
  ↓
feature/새기능 (개발 완료)
  ↓
dev (병합)
  ↓
main (배포) → v1.1.0 태그
```

### 버그 수정 흐름
```
main (v1.0.0) ← 태그
  ↓
hotfix/버그수정 (v1.0.0에서 생성)
  ↓
main (병합) → v1.0.1 태그
```

---

## ✅ 7. 체크리스트

- [ ] main 브랜치가 안정적인 상태인지 확인
- [ ] 모든 변경사항 커밋 완료
- [ ] 태그 메시지 작성
- [ ] 태그 생성
- [ ] GitHub에 태그 푸시
- [ ] 태그 확인

---

## 🚀 빠른 시작 명령어

```bash
# 1. main 브랜치로 전환
git checkout main

# 2. 태그 생성
git tag -a v1.0.0 -m "Release v1.0.0: 안정적인 배포 버전"

# 3. 태그 푸시
git push origin v1.0.0

# 4. 태그 확인
git tag -l
```

---

**이제 안전하게 v1.0.0으로 되돌릴 수 있습니다!** 🎉

