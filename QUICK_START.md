# ⚡ Phase 2 개발 빠른 시작

## ✅ 현재 상태

- **현재 브랜치**: `dev` ← **여기서 작업하세요!**
- **안정 버전**: `main` (v1.0.0) ← **건드리지 마세요!**

---

## 🚀 바로 시작하기

### 1. 현재 브랜치 확인
```bash
git branch --show-current
# 출력: dev ✅
```

### 2. 기능 개발 시작
```bash
# 그냥 코드 수정하고 커밋하면 됩니다!
git add .
git commit -m "Add: Phase 2 - 새 기능명"
git push origin dev
```

### 3. 정기적인 백업
```bash
# 하루 작업 끝날 때마다
git push origin dev
```

---

## 📝 커밋 메시지 예시

```bash
git commit -m "Add: Phase 2 - 사용자 알림 기능"
git commit -m "Fix: Phase 2 - 로그인 버그 수정"
git commit -m "Update: Phase 2 - 대시보드 개선"
```

---

## ✅ Phase 2 완성 후

```bash
# 1. 테스트
npm run build
npm run typecheck

# 2. main 병합
git checkout main
git merge dev
git push origin main

# 3. 새 태그
git tag -a v2.0.0 -m "Release v2.0.0: Phase 2 완료"
git push origin v2.0.0
```

---

**이제 자유롭게 개발하세요!** 🎉










