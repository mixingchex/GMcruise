// scripts/backup-before-deploy.ts
// 배포 전 백업 스크립트

import { manualRunDatabaseBackup } from '../lib/scheduler/databaseBackup';

async function main() {
  console.log('📦 배포 전 백업 시작...');
  console.log('='.repeat(50));
  
  try {
    const result = await manualRunDatabaseBackup();
    
    console.log('='.repeat(50));
    console.log('✅ 백업 완료!');
    console.log('');
    console.log('📊 백업 결과:');
    console.log(`  - 총 테이블: ${result.totalTables}개`);
    console.log(`  - 성공: ${result.successCount}개`);
    console.log(`  - 실패: ${result.failureCount}개`);
    console.log(`  - 소요 시간: ${(result.duration / 1000).toFixed(2)}초`);
    console.log('');
    
    if (result.failureCount > 0) {
      console.log('⚠️ 실패한 테이블:');
      result.results
        .filter(r => !r.ok)
        .forEach(r => {
          console.log(`  - ${r.tableName}: ${r.error}`);
        });
    }
    
    console.log('');
    console.log('✅ 구글 드라이브 백업 완료!');
    console.log('📁 백업 위치: 구글 드라이브 > DB_Backup_[월] > Backup_[날짜]');
    console.log('');
    console.log('🚀 이제 배포를 진행할 수 있습니다!');
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ 백업 실패:', error);
    console.error('');
    console.error('⚠️ 백업 실패 시 배포를 진행하지 마세요!');
    process.exit(1);
  }
}

main();

