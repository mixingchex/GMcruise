# 🏷️ v1.0.0 태그 생성 및 되돌리기 명령어

## ✅ 1. v1.0.0 태그 생성 (main 브랜치)

```bash
cd /home/userhyeseon28/projects/cruise-guide

# main 브랜치로 전환
git checkout main

# 현재 상태 확인
git status

# v1.0.0 태그 생성
git tag -a v1.0.0 -m "Release v1.0.0: 안정적인 배포 버전"

# 태그 확인
git tag -l

# GitHub에 태그 푸시
git push origin v1.0.0
```

---

## 🔄 2. v1.0.0으로 되돌리기

### 방법 1: 코드 확인만 (읽기 전용)
```bash
git checkout v1.0.0
# 확인 후
git checkout main  # 또는 dev
```

### 방법 2: 새 브랜치 생성 (수정 가능)
```bash
# v1.0.0에서 hotfix 브랜치 생성
git checkout -b hotfix-v1.0.0 v1.0.0

# 수정 후
git add .
git commit -m "Fix: 버그 수정"
git push origin hotfix-v1.0.0
```

### 방법 3: 완전히 되돌리기 (비상시 - 주의!)
```bash
# ⚠️ 주의: 모든 변경사항이 삭제됩니다!

git checkout main
git reset --hard v1.0.0
git push origin main --force
```

---

## 📝 빠른 참조

**태그 생성**: `git tag -a v1.0.0 -m "메시지"`  
**태그 푸시**: `git push origin v1.0.0`  
**태그 확인**: `git tag -l`  
**태그로 이동**: `git checkout v1.0.0`  
**되돌아가기**: `git checkout main`










