# 🔐 GitHub 푸시 인증 가이드

**현재 상황**: 코드는 준비되었지만 GitHub 인증이 필요합니다.

---

## 🎯 빠른 해결 방법

### 방법 1: Personal Access Token 사용 (권장)

#### 1단계: GitHub에서 토큰 생성

1. **GitHub 접속**: https://github.com
2. **우측 상단 프로필 클릭** → **Settings**
3. **좌측 메뉴 하단** → **Developer settings**
4. **Personal access tokens** → **Tokens (classic)**
5. **"Generate new token (classic)"** 클릭
6. **Note**: `Cruise Guide Deployment` 입력
7. **Expiration**: 원하는 기간 선택 (예: 90 days)
8. **Scopes**: `repo` 체크 (전체 권한)
9. **"Generate token"** 클릭
10. **토큰 복사** (한 번만 보여줌! 메모장에 저장)

#### 2단계: 토큰으로 푸시

터미널에서 다음 명령어 실행:

```bash
cd /home/userhyeseon28/projects/cruise-guide

# main 브랜치 푸시
git push -u origin main
# Username: monicajeon28 입력
# Password: (여기에 복사한 토큰 붙여넣기)

# dev 브랜치 푸시
git push -u origin dev
# Username: monicajeon28 입력
# Password: (여기에 복사한 토큰 붙여넣기)
```

---

### 방법 2: GitHub CLI 사용 (더 편리)

#### 1단계: GitHub CLI 설치

```bash
# Ubuntu/WSL
sudo apt update
sudo apt install gh

# 또는
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh
```

#### 2단계: GitHub CLI 로그인

```bash
gh auth login
# 브라우저에서 인증하면 자동으로 설정됨
```

#### 3단계: 푸시

```bash
cd /home/userhyeseon28/projects/cruise-guide

# main 브랜치 푸시
git push -u origin main

# dev 브랜치 푸시
git push -u origin dev
```

---

### 방법 3: SSH 키 사용 (가장 안전)

#### 1단계: SSH 키 생성 (없는 경우)

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
# Enter 키 여러 번 누르기 (기본 설정 사용)
```

#### 2단계: 공개 키를 GitHub에 추가

```bash
# 공개 키 복사
cat ~/.ssh/id_ed25519.pub
# 출력된 내용 전체 복사
```

1. GitHub → Settings → SSH and GPG keys
2. "New SSH key" 클릭
3. Title: `Cruise Guide` 입력
4. Key: 복사한 공개 키 붙여넣기
5. "Add SSH key" 클릭

#### 3단계: 원격 저장소 URL을 SSH로 변경

```bash
cd /home/userhyeseon28/projects/cruise-guide

# HTTPS → SSH로 변경
git remote set-url origin git@github.com:monicajeon28/GMcruise.git

# 푸시
git push -u origin main
git push -u origin dev
```

---

## ✅ 현재 상태

- ✅ GitHub 저장소 연결 완료
- ✅ 문서 파일 커밋 완료
- ✅ dev 브랜치 생성 완료
- ⏳ GitHub 푸시 대기 중 (인증 필요)

---

## 🚀 푸시 후 확인

푸시가 성공하면:

1. **GitHub 웹사이트에서 확인**:
   - https://github.com/monicajeon28/GMcruise
   - 파일들이 올라갔는지 확인
   - `.env` 파일이 **없어야** 정상

2. **브랜치 확인**:
   - main 브랜치와 dev 브랜치가 모두 보여야 함

---

## 💡 추천 방법

**초보자에게는 방법 1 (Personal Access Token)을 추천합니다!**

가장 간단하고 빠르게 설정할 수 있습니다.

---

**토큰을 생성하셨다면, 터미널에서 `git push` 명령어를 실행하세요!** 🚀










