# 크루즈몰 404 에러 빠른 해결

## 🔧 해결 완료

### 수행한 작업

1. ✅ `.next` 디렉토리 삭제 (빌드 캐시 정리)
2. ✅ 개발 서버 재시작 준비

### 다음 단계

**터미널에서 다음 명령어를 실행하세요:**

```bash
cd ~/projects/cruise-guide
npm run dev
```

또는 이미 실행 중이라면:

```bash
# 브라우저에서 하드 리프레시
Ctrl + Shift + R
```

---

## ✅ 확인 사항

서버가 시작되면:

1. 브라우저에서 `http://localhost:3000` 접속
2. 개발자 도구 (F12) → Network 탭 확인
3. 모든 리소스가 200 상태로 로드되는지 확인

---

## 🚨 여전히 문제가 있으면

```bash
# 완전 재시작
cd ~/projects/cruise-guide
pkill -f "next dev"
rm -rf .next
npm run dev
```

---

**작성일**: 2025년 11월 20일


