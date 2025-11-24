# 📝 랜딩페이지 글씨 크기 및 가독성 개선 계획서

## 📋 목차
1. [현재 상태 분석](#현재-상태-분석)
2. [개선 목표](#개선-목표)
3. [구체적인 변경 사항](#구체적인-변경-사항)
4. [작업 단계](#작업-단계)
5. [예상 결과](#예상-결과)

---

## 🔍 현재 상태 분석

### 현재 문제점
1. **이미지 주석 텍스트 (block.alt)**
   - 현재: `text-sm text-gray-600 italic` (작은 글씨, 회색, 이탤릭체)
   - 문제: 글씨가 너무 작아서 스마트폰에서 읽기 어려움
   - 위치: `components/mall/ProductDetail.tsx` 1344번째 줄

2. **동영상 제목 텍스트 (block.title)**
   - 현재: `text-lg font-semibold text-gray-800` (큰 글씨, 굵게, 어두운 회색)
   - 상태: 비교적 양호하지만 더 개선 가능
   - 위치: `components/mall/ProductDetail.tsx` 1417번째 줄

3. **텍스트 블록 내용 (block.content)**
   - 현재: `prose prose-sm md:prose-lg` (작은 크기, 반응형)
   - 문제: 모바일에서 prose-sm이 작을 수 있음
   - 위치: `components/mall/ProductDetail.tsx` 1426번째 줄

---

## 🎯 개선 목표

### 스마트폰 최적화
- ✅ 스마트폰에서도 쉽게 읽을 수 있는 글씨 크기
- ✅ 충분한 대비로 가독성 향상
- ✅ 세련된 디자인으로 시각적 매력 증대
- ✅ 모바일과 데스크톱 모두에서 최적화

### 가독성 향상
- ✅ 적절한 행간(line-height) 설정
- ✅ 적절한 자간(letter-spacing) 설정
- ✅ 배경색과 텍스트 색상 대비 강화
- ✅ 여백(padding) 조정으로 여유 공간 확보

---

## 🔧 구체적인 변경 사항

### 1. 이미지 주석 텍스트 (block.alt) 개선

**현재 코드:**
```tsx
{block.alt && (
  <div className="p-4 bg-gray-50 border-t border-gray-200">
    <p className="text-sm text-gray-600 italic">{block.alt}</p>
  </div>
)}
```

**개선된 코드:**
```tsx
{block.alt && (
  <div className="p-5 md:p-6 bg-gradient-to-br from-gray-50 to-gray-100 border-t border-gray-200">
    <p className="text-base md:text-lg text-gray-800 leading-relaxed tracking-wide font-medium not-italic">
      {block.alt}
    </p>
  </div>
)}
```

**변경 사항 설명:**
- `text-sm` → `text-base md:text-lg`: 기본 크기를 키우고 데스크톱에서 더 크게
- `text-gray-600` → `text-gray-800`: 더 어두운 색상으로 대비 강화
- `italic` → `not-italic`: 이탤릭체 제거로 가독성 향상
- `leading-relaxed`: 행간을 넓혀 읽기 편하게
- `tracking-wide`: 자간을 넓혀 글자 구분 명확하게
- `font-medium`: 약간 굵게 해서 가독성 향상
- `p-4` → `p-5 md:p-6`: 패딩 증가로 여유 공간 확보
- `bg-gray-50` → `bg-gradient-to-br from-gray-50 to-gray-100`: 그라데이션 배경으로 시각적 매력 증대

---

### 2. 동영상 제목 텍스트 (block.title) 개선

**현재 코드:**
```tsx
{block.title && (
  <div className="p-4 bg-gray-50 border-t border-gray-200">
    <p className="text-lg font-semibold text-gray-800">{block.title}</p>
  </div>
)}
```

**개선된 코드:**
```tsx
{block.title && (
  <div className="p-5 md:p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-t border-blue-200">
    <p className="text-xl md:text-2xl font-bold text-gray-900 leading-relaxed tracking-wide">
      {block.title}
    </p>
  </div>
)}
```

**변경 사항 설명:**
- `text-lg` → `text-xl md:text-2xl`: 더 큰 글씨 크기
- `font-semibold` → `font-bold`: 더 굵게 강조
- `text-gray-800` → `text-gray-900`: 더 어두운 색상
- `leading-relaxed`: 행간 넓히기
- `tracking-wide`: 자간 넓히기
- `p-4` → `p-5 md:p-6`: 패딩 증가
- `bg-gray-50` → `bg-gradient-to-br from-blue-50 to-indigo-50`: 파란색 계열 그라데이션으로 동영상임을 시각적으로 구분
- `border-gray-200` → `border-blue-200`: 테두리 색상도 파란색 계열로 통일

---

### 3. 텍스트 블록 내용 (block.content) 개선

**현재 코드:**
```tsx
<div 
  className="prose prose-sm md:prose-lg max-w-none text-gray-700"
  style={{ 
    wordBreak: 'keep-all',
    lineHeight: '2',
    letterSpacing: '0.02em'
  }}
  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(block.content) }}
/>
```

**개선된 코드:**
```tsx
<div 
  className="prose prose-base md:prose-xl max-w-none text-gray-800"
  style={{ 
    wordBreak: 'keep-all',
    lineHeight: '1.9',
    letterSpacing: '0.025em',
    fontSize: '16px'  // 모바일에서 최소 16px 보장
  }}
  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(block.content) }}
/>
```

**변경 사항 설명:**
- `prose-sm` → `prose-base`: 기본 크기를 키워서 모바일에서도 읽기 편하게
- `md:prose-lg` → `md:prose-xl`: 데스크톱에서 더 큰 크기
- `text-gray-700` → `text-gray-800`: 더 어두운 색상
- `lineHeight: '2'` → `lineHeight: '1.9'`: 약간 줄여서 더 컴팩트하게
- `letterSpacing: '0.02em'` → `letterSpacing: '0.025em'`: 자간 약간 증가
- `fontSize: '16px'`: 모바일에서 최소 16px 보장 (iOS 자동 확대 방지)

---

## 📐 작업 단계

### Step 1: 파일 위치 확인 ✅
- 파일: `components/mall/ProductDetail.tsx`
- 이미지 블록: 약 1342-1346번째 줄
- 동영상 블록: 약 1415-1419번째 줄
- 텍스트 블록: 약 1422-1434번째 줄

### Step 2: 이미지 주석 텍스트 개선
1. 1342-1346번째 줄의 코드 수정
2. 변경 내용:
   - 글씨 크기: `text-sm` → `text-base md:text-lg`
   - 색상: `text-gray-600` → `text-gray-800`
   - 스타일: `italic` 제거, `font-medium` 추가
   - 행간/자간: `leading-relaxed tracking-wide` 추가
   - 패딩: `p-4` → `p-5 md:p-6`
   - 배경: 그라데이션 효과 추가

### Step 3: 동영상 제목 텍스트 개선
1. 1415-1419번째 줄의 코드 수정
2. 변경 내용:
   - 글씨 크기: `text-lg` → `text-xl md:text-2xl`
   - 굵기: `font-semibold` → `font-bold`
   - 색상: `text-gray-800` → `text-gray-900`
   - 행간/자간: `leading-relaxed tracking-wide` 추가
   - 패딩: `p-4` → `p-5 md:p-6`
   - 배경: 파란색 계열 그라데이션으로 변경

### Step 4: 텍스트 블록 내용 개선
1. 1422-1434번째 줄의 코드 수정
2. 변경 내용:
   - Prose 크기: `prose-sm` → `prose-base`, `md:prose-lg` → `md:prose-xl`
   - 색상: `text-gray-700` → `text-gray-800`
   - 행간: `lineHeight: '2'` → `lineHeight: '1.9'`
   - 자간: `letterSpacing: '0.02em'` → `letterSpacing: '0.025em'`
   - 최소 글씨 크기: `fontSize: '16px'` 추가

### Step 5: 테스트
1. 스마트폰에서 확인
   - 이미지 주석이 잘 보이는지 확인
   - 동영상 제목이 눈에 띄는지 확인
   - 텍스트 내용이 읽기 편한지 확인
2. 데스크톱에서 확인
   - 반응형으로 크기가 적절히 조정되는지 확인
   - 디자인이 세련되어 보이는지 확인
3. 다양한 화면 크기에서 확인
   - 작은 화면 (320px)
   - 중간 화면 (768px)
   - 큰 화면 (1024px 이상)

---

## 🎨 예상 결과

### Before (현재)
```
이미지 주석: 작은 글씨, 회색, 이탤릭체, 가독성 낮음
동영상 제목: 보통 크기, 어두운 회색, 괜찮지만 개선 여지 있음
텍스트 내용: 작은 크기, 모바일에서 읽기 어려울 수 있음
```

### After (개선 후)
```
이미지 주석: 
  ✅ 적당한 크기의 글씨 (text-base → text-lg)
  ✅ 어두운 색상으로 대비 강화 (gray-800)
  ✅ 이탤릭체 제거로 가독성 향상
  ✅ 넓은 행간과 자간으로 읽기 편함
  ✅ 그라데이션 배경으로 세련된 디자인

동영상 제목:
  ✅ 큰 글씨 크기 (text-xl → text-2xl)
  ✅ 굵은 글씨로 강조 (font-bold)
  ✅ 파란색 계열 배경으로 동영상임을 명확히 표시
  ✅ 넓은 행간과 자간

텍스트 내용:
  ✅ 적당한 크기의 글씨 (prose-base → prose-xl)
  ✅ 모바일 최소 16px 보장
  ✅ 적절한 행간과 자간
  ✅ 더 어두운 색상으로 대비 강화
```

---

## 📱 스마트폰 최적화 세부 사항

### 글씨 크기 기준
- **작은 텍스트 (이미지 주석)**: 최소 14px (text-base = 1rem = 16px)
- **중간 텍스트 (동영상 제목)**: 최소 20px (text-xl = 1.25rem = 20px)
- **큰 텍스트 (텍스트 내용)**: 최소 16px (prose-base = 16px)

### 색상 대비
- WCAG AA 기준 준수
- `text-gray-800` (RGB: 31, 41, 55) vs `bg-gray-50` (RGB: 249, 250, 251)
- 대비 비율: 12.63:1 (AAA 기준 충족)

### 간격
- 패딩: 1.25rem (20px) 모바일, 1.5rem (24px) 데스크톱
- 행간: 1.75 (leading-relaxed)
- 자간: 0.025em (tracking-wide)

---

## ✅ 체크리스트

작업 완료 후 확인할 사항:

- [ ] 이미지 주석 텍스트가 스마트폰에서 잘 보이는가?
- [ ] 동영상 제목이 눈에 띄고 읽기 쉬운가?
- [ ] 텍스트 내용이 모바일에서 읽기 편한가?
- [ ] 데스크톱에서도 적절한 크기로 표시되는가?
- [ ] 색상 대비가 충분한가?
- [ ] 디자인이 세련되어 보이는가?
- [ ] 다양한 화면 크기에서 잘 작동하는가?

---

## 📝 참고 사항

### Tailwind CSS 클래스 설명
- `text-base`: 16px (1rem)
- `text-lg`: 18px (1.125rem)
- `text-xl`: 20px (1.25rem)
- `text-2xl`: 24px (1.5rem)
- `leading-relaxed`: line-height 1.75
- `tracking-wide`: letter-spacing 0.025em
- `font-medium`: font-weight 500
- `font-bold`: font-weight 700

### 반응형 디자인
- `md:` 접두사는 768px 이상 화면에서 적용
- 모바일 우선 디자인: 기본값은 모바일, `md:`는 데스크톱

---

**작성일**: 2025-01-27  
**작성자**: AI Assistant  
**상태**: 계획서 완료, 구현 대기

