#!/bin/bash

# 판매원 대시보드 기능 백업 스크립트
# 사용법: ./scripts/backup-partner-dashboard.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/_backup/partner-dashboard-$(date +%Y%m%d-%H%M%S)"

echo "📦 판매원 대시보드 기능 백업 시작..."
echo "백업 위치: $BACKUP_DIR"

# 백업 디렉토리 생성
mkdir -p "$BACKUP_DIR"

# 1. 판매원 대시보드 UI 파일 백업
echo "📁 대시보드 UI 파일 백업 중..."
mkdir -p "$BACKUP_DIR/app/partner/[partnerId]/dashboard"
cp -r "$PROJECT_ROOT/app/partner/[partnerId]/dashboard"/* "$BACKUP_DIR/app/partner/[partnerId]/dashboard/" 2>/dev/null || true

# 2. 판매원 설정 페이지 백업
echo "📁 설정 페이지 백업 중..."
mkdir -p "$BACKUP_DIR/app/partner/[partnerId]/settings"
cp -r "$PROJECT_ROOT/app/partner/[partnerId]/settings"/* "$BACKUP_DIR/app/partner/[partnerId]/settings/" 2>/dev/null || true

# 3. 판매원 프로필 페이지 백업
echo "📁 프로필 페이지 백업 중..."
mkdir -p "$BACKUP_DIR/app/partner/[partnerId]/profile"
cp -r "$PROJECT_ROOT/app/partner/[partnerId]/profile"/* "$BACKUP_DIR/app/partner/[partnerId]/profile/" 2>/dev/null || true

# 4. 판매원 API 백업
echo "📁 API 라우트 백업 중..."
mkdir -p "$BACKUP_DIR/app/api/partner"
cp -r "$PROJECT_ROOT/app/api/partner"/* "$BACKUP_DIR/app/api/partner/" 2>/dev/null || true

# 5. 판매원 관련 컴포넌트 백업
echo "📁 컴포넌트 백업 중..."
mkdir -p "$BACKUP_DIR/components/admin"
mkdir -p "$BACKUP_DIR/components/affiliate"
if [ -d "$PROJECT_ROOT/components/admin" ]; then
  find "$PROJECT_ROOT/components/admin" -name "*Contract*" -o -name "*Affiliate*" | while read file; do
    rel_path=$(echo "$file" | sed "s|$PROJECT_ROOT/||")
    target_dir=$(dirname "$BACKUP_DIR/$rel_path")
    mkdir -p "$target_dir"
    cp "$file" "$BACKUP_DIR/$rel_path"
  done
fi
if [ -d "$PROJECT_ROOT/components/affiliate" ]; then
  cp -r "$PROJECT_ROOT/components/affiliate"/* "$BACKUP_DIR/components/affiliate/" 2>/dev/null || true
fi

# 6. 백업 정보 파일 생성
cat > "$BACKUP_DIR/BACKUP_INFO.md" << EOF
# 판매원 대시보드 기능 백업 정보

## 백업 일시
$(date)

## 백업된 파일 목록

### UI 파일
- app/partner/[partnerId]/dashboard/PartnerDashboard.tsx
- app/partner/[partnerId]/dashboard/page.tsx
- app/partner/[partnerId]/settings/page.tsx
- app/partner/[partnerId]/profile/*

### API 파일
- app/api/partner/** (모든 API 라우트)

### 컴포넌트
- components/admin/ContractInviteModal.tsx
- components/affiliate/** (모든 판매원 관련 컴포넌트)

## 복원 방법
이 백업을 복원하려면 해당 파일들을 원래 위치로 복사하세요.

\`\`\`bash
# 복원 예시
cp -r _backup/partner-dashboard-YYYYMMDD-HHMMSS/* ./
\`\`\`

## 주요 기능
1. 대시보드 통계 및 링크 관리
2. 고객 관리 및 고객 그룹
3. 예약 메시지 관리
4. 계약 관리
5. 프로필 관리
6. 비밀번호 변경
7. SMS API 설정
EOF

echo ""
echo "✅ 백업 완료!"
echo "백업 위치: $BACKUP_DIR"
echo ""
echo "📄 백업 정보: $BACKUP_DIR/BACKUP_INFO.md"


