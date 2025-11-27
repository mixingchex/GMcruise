#!/bin/bash
# Cron 작업 설정 스크립트
# 매 시간마다 통계 데이터 업데이트

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CRON_JOB="0 * * * * cd $PROJECT_DIR && npm run update:dashboard-stats >> $PROJECT_DIR/logs/dashboard-stats.log 2>&1"

echo "=== Cron 작업 설정 ==="
echo ""
echo "다음 Cron 작업을 추가하세요:"
echo ""
echo "$CRON_JOB"
echo ""
echo "설정 방법:"
echo "1. crontab -e 실행"
echo "2. 위의 라인을 추가"
echo "3. 저장 후 종료"
echo ""
echo "또는 다음 명령어로 자동 추가:"
echo "  (crontab -l 2>/dev/null; echo \"$CRON_JOB\") | crontab -"
echo ""
read -p "자동으로 추가하시겠습니까? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # 로그 디렉토리 생성
    mkdir -p "$PROJECT_DIR/logs"
    
    # 기존 crontab에 추가
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "✅ Cron 작업이 추가되었습니다!"
    echo ""
    echo "현재 Cron 작업 목록:"
    crontab -l
else
    echo "수동으로 추가해주세요."
fi


