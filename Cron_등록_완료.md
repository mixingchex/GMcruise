# Cron 작업 등록 완료

**등록일**: 2025-01-28  
**상태**: ✅ 등록 완료

---

## ✅ 등록된 Cron 작업

```bash
0 * * * * cd /home/userhyeseon28/projects/cruise-guide && npm run update:dashboard-stats >> /home/userhyeseon28/projects/cruise-guide/logs/dashboard-stats.log 2>&1
```

**설명**: 매 시간 정각(0분)에 통계 데이터를 자동으로 업데이트합니다.

---

## 📋 작업 내용

- **실행 주기**: 매 시간마다 (0분)
- **실행 명령어**: `npm run update:dashboard-stats`
- **로그 파일**: `logs/dashboard-stats.log`
- **목적**: 대시보드 통계 데이터 사전 계산 및 저장

---

## 🔍 확인 방법

### 현재 등록된 Cron 작업 확인
```bash
crontab -l
```

### 로그 확인
```bash
# 실시간 로그 확인
tail -f logs/dashboard-stats.log

# 최근 로그 확인
tail -20 logs/dashboard-stats.log
```

### 다음 실행 시간 확인
```bash
# 다음 정각 시간에 실행됩니다
# 예: 현재 14:30이면 15:00에 실행
```

---

## 🛠️ 관리 방법

### Cron 작업 삭제
```bash
crontab -e
# 해당 라인 삭제 후 저장
```

### Cron 작업 수정
```bash
crontab -e
# 원하는 시간으로 수정
# 예: 매 30분마다 실행하려면
30 * * * * cd /home/userhyeseon28/projects/cruise-guide && npm run update:dashboard-stats >> /home/userhyeseon28/projects/cruise-guide/logs/dashboard-stats.log 2>&1
```

### 실행 주기 옵션
- `0 * * * *` - 매 시간 정각
- `0 */2 * * *` - 2시간마다
- `0 0 * * *` - 매일 자정
- `*/30 * * * *` - 30분마다

---

## ✅ 등록 완료

Cron 작업이 성공적으로 등록되었습니다. 다음 정각 시간부터 자동으로 통계 데이터가 업데이트됩니다.

**등록 시간**: 2025-01-28


