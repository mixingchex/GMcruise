# Git 태그 푸시 가이드

## ✅ 현재 상태
- **로컬 태그 생성 완료**: `v1.0.0-trial-stable`
- **보안 문제 해결**: `DEPLOY_READY.md`에서 GitHub 토큰 제거 완료

## 🚀 태그 푸시 방법

### 방법 1: GitHub 웹에서 수동 푸시 (권장)

1. **GitHub Personal Access Token 준비**
   - GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - 새 토큰 생성 (권한: `repo` 체크)

2. **터미널에서 푸시**
   ```bash
   cd /home/userhyeseon28/projects/cruise-guide
   
   # 원격 저장소 URL에 토큰 포함 (일시적)
   git remote set-url origin https://YOUR_TOKEN_HERE@github.com/monicajeon28/GMcruise.git
   
   # 태그 푸시
   git push origin v1.0.0-trial-stable
   
   # 토큰 제거 (보안)
   git remote set-url origin https://github.com/monicajeon28/GMcruise.git
   ```

### 방법 2: SSH 사용 (설정된 경우)

```bash
cd /home/userhyeseon28/projects/cruise-guide

# SSH URL로 변경
git remote set-url origin git@github.com:monicajeon28/GMcruise.git

# 태그 푸시
git push origin v1.0.0-trial-stable
```

### 방법 3: GitHub CLI 사용 (설정된 경우)

```bash
gh auth login
git push origin v1.0.0-trial-stable
```

## 🔍 태그 확인

### 로컬 태그 확인
```bash
# 태그 목록
git tag -l | grep trial

# 태그 상세 정보
git show v1.0.0-trial-stable
```

### 원격 태그 확인 (푸시 후)
```bash
# 원격 태그 목록 가져오기
git fetch --tags

# 원격 태그 확인
git tag -l -r | grep trial
```

## ⚠️ 주의사항

1. **보안**: 토큰을 파일에 저장하지 마세요
2. **토큰 노출**: `DEPLOY_READY.md`에서 토큰이 제거되었으므로 안전합니다
3. **태그 삭제**: 실수로 잘못된 태그를 푸시했다면:
   ```bash
   # 원격 태그 삭제
   git push origin --delete v1.0.0-trial-stable
   ```

## 📝 태그가 포함하는 내용

- ✅ 지니가이드 3일 체험 기능 정상 작동 상태
- ✅ `app/login-test/page.tsx` - 3일 체험 로그인 페이지
- ✅ `app/api/auth/login/route.ts` - 테스트 모드 로그인 로직
- ✅ 보안 수정: `DEPLOY_READY.md`에서 토큰 제거

## 🔄 태그로 복구하기

```bash
# 특정 파일만 복구
git checkout v1.0.0-trial-stable -- app/login-test/page.tsx

# 전체 프로젝트 복구 (주의: 모든 변경사항 삭제)
git reset --hard v1.0.0-trial-stable
```










