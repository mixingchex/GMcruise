# 🖼️ 이미지 최적화 가이드

**목적**: 웹 성능 개선 및 GitHub 저장소 용량 관리

---

## 📋 현재 상황

- **이미지 파일 개수**: 약 3,046개
- **비디오 파일**: 9개 발견 (대용량)
- **GitHub 제한**: 단일 파일 100MB, 저장소 권장 1GB 이하

---

## 🚀 이미지 최적화 방법

### 방법 1: Next.js Image 컴포넌트 사용 (권장)

이미 적용 중입니다! `next/image`는 자동으로 이미지를 최적화합니다.

```tsx
import Image from 'next/image';

<Image
  src="/path/to/image.jpg"
  alt="설명"
  width={800}
  height={600}
  quality={75} // 기본값 75, 필요시 조정 (1-100)
  placeholder="blur" // 로딩 중 블러 효과
/>
```

**장점**:
- 자동 이미지 최적화 (WebP 변환)
- 지연 로딩 (Lazy Loading)
- 반응형 이미지
- 자동 크기 조정

---

### 방법 2: 이미지 압축 도구 사용

#### 온라인 도구 (간단)
1. **TinyPNG** (https://tinypng.com/)
   - PNG, JPG 최대 5MB까지 무료
   - 70-80% 용량 감소
   - 품질 손실 최소

2. **Squoosh** (https://squoosh.app/)
   - Google에서 만든 도구
   - 다양한 포맷 지원
   - 실시간 미리보기

#### 명령줄 도구 (대량 처리)

**1. ImageMagick 설치**
```bash
# Ubuntu/WSL
sudo apt update
sudo apt install imagemagick

# 또는
sudo apt install graphicsmagick
```

**2. 이미지 압축 스크립트**
```bash
# JPG 압축 (품질 80%)
find public -name "*.jpg" -o -name "*.jpeg" | while read file; do
  convert "$file" -quality 80 -strip "$file"
done

# PNG 압축
find public -name "*.png" | while read file; do
  convert "$file" -quality 85 -strip "$file"
done
```

**3. WebP 변환 (더 작은 용량)**
```bash
# cwebp 설치
sudo apt install webp

# JPG → WebP 변환
find public -name "*.jpg" -o -name "*.jpeg" | while read file; do
  cwebp -q 80 "$file" -o "${file%.*}.webp"
done

# PNG → WebP 변환
find public -name "*.png" | while read file; do
  cwebp -q 80 "$file" -o "${file%.*}.webp"
done
```

---

### 방법 3: Next.js 이미지 최적화 설정

`next.config.mjs`에 이미지 최적화 설정 추가:

```javascript
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'], // AVIF, WebP 우선 사용
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    // 외부 이미지 도메인 추가 (필요시)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'example.com',
      },
    ],
  },
};
```

---

## 🎬 비디오 파일 최적화

### 방법 1: 비디오 압축 (FFmpeg)

**FFmpeg 설치**
```bash
sudo apt update
sudo apt install ffmpeg
```

**비디오 압축 스크립트**
```bash
# MP4 압축 (H.264, 품질 23, 오디오 128k)
for file in public/**/*.mp4; do
  ffmpeg -i "$file" \
    -c:v libx264 \
    -preset slow \
    -crf 23 \
    -c:a aac \
    -b:a 128k \
    -movflags +faststart \
    "${file%.*}_compressed.mp4"
done
```

**설명**:
- `-crf 23`: 품질 설정 (18-28, 낮을수록 고품질)
- `-preset slow`: 압축 속도 (ultrafast, fast, medium, slow, veryslow)
- `-b:a 128k`: 오디오 비트레이트

---

### 방법 2: 비디오를 외부 스토리지로 이동

**권장**: YouTube, Vimeo, 또는 클라우드 스토리지 사용

1. **YouTube** (무료, 무제한)
   - 비디오 업로드
   - 임베드 코드 사용

2. **Vercel Blob Storage** (유료)
   - Next.js와 통합
   - CDN 제공

3. **AWS S3 + CloudFront** (유료)
   - 대용량 파일 저장
   - 글로벌 CDN

---

## 📁 파일 구조 권장사항

```
public/
├── images/          # 최적화된 이미지 (WebP, 압축된 JPG/PNG)
├── videos/          # 압축된 비디오 또는 외부 링크
├── originals/       # 원본 파일 (Git 제외)
└── optimized/       # 최적화된 파일 (Git 포함)
```

---

## 🔧 자동화 스크립트

### 이미지 최적화 스크립트

`scripts/optimize-images.sh` 파일 생성:

```bash
#!/bin/bash

# 이미지 최적화 스크립트
echo "🖼️ 이미지 최적화 시작..."

# JPG 압축
find public -type f \( -name "*.jpg" -o -name "*.jpeg" \) | while read file; do
  echo "압축 중: $file"
  convert "$file" -quality 80 -strip "$file"
done

# PNG 압축
find public -type f -name "*.png" | while read file; do
  echo "압축 중: $file"
  convert "$file" -quality 85 -strip "$file"
done

echo "✅ 이미지 최적화 완료!"
```

**실행 권한 부여**:
```bash
chmod +x scripts/optimize-images.sh
./scripts/optimize-images.sh
```

---

## ⚠️ 주의사항

1. **원본 파일 백업**
   - 최적화 전 원본 파일 백업 필수
   - `.gitignore`에 `originals/` 폴더 추가

2. **Git LFS 고려**
   - 대용량 파일이 많다면 Git LFS 사용 고려
   - GitHub에서 1GB 무료 제공

3. **CDN 사용**
   - 이미지/비디오는 CDN에서 제공 권장
   - Vercel, Cloudflare 등

---

## 📊 최적화 효과

**예상 결과**:
- 이미지 용량: **50-70% 감소**
- 페이지 로딩 속도: **30-50% 개선**
- GitHub 저장소 용량: **대폭 감소**

---

## 🎯 다음 단계

1. ✅ `.gitignore`에 대용량 파일 제외 설정 완료
2. ⏳ 이미지 최적화 스크립트 실행 (선택사항)
3. ⏳ 비디오 파일 압축 또는 외부 스토리지 이동 (선택사항)
4. ✅ Next.js Image 컴포넌트 사용 (이미 적용됨)

---

**참고**: 이미지 최적화는 선택사항입니다. Next.js Image 컴포넌트만으로도 충분한 최적화가 이루어집니다! 🚀










