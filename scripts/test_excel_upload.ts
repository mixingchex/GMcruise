// scripts/test_excel_upload.ts
// 엑셀 자동 업로드 테스트 스크립트

import { uploadAllExcels, uploadCashflowExcel, uploadTotalcashExcel } from '../lib/affiliate/excel-backup';

async function testExcelUpload() {
  console.log('='.repeat(80));
  console.log('📤 엑셀 구글 드라이브 업로드 테스트');
  console.log('='.repeat(80));
  console.log('');

  // 현재 월 정산 데이터 업로드
  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  console.log(`📅 테스트 기간: ${period}`);
  console.log('');

  try {
    console.log('1️⃣  Cashflow 엑셀 생성 및 업로드 (판매원별 수당)...');
    console.log('-'.repeat(80));
    const cashflowResult = await uploadCashflowExcel(period);

    if (cashflowResult.success) {
      console.log('✅ Cashflow 업로드 성공!');
      console.log('   파일명:', cashflowResult.fileName);
      console.log('   파일 ID:', cashflowResult.fileId);
      console.log('   URL:', cashflowResult.url);
      console.log('   요약:', JSON.stringify(cashflowResult.summary, null, 2));
    } else {
      console.error('❌ Cashflow 업로드 실패:', cashflowResult.error);
    }
    console.log('');

    console.log('2️⃣  Totalcash 엑셀 생성 및 업로드 (거래처용 월별)...');
    console.log('-'.repeat(80));
    const totalcashResult = await uploadTotalcashExcel(period);

    if (totalcashResult.success) {
      console.log('✅ Totalcash 업로드 성공!');
      console.log('   파일명:', totalcashResult.fileName);
      console.log('   파일 ID:', totalcashResult.fileId);
      console.log('   URL:', totalcashResult.url);
      console.log('   요약:', JSON.stringify(totalcashResult.summary, null, 2));
    } else {
      console.error('❌ Totalcash 업로드 실패:', totalcashResult.error);
    }
    console.log('');

    console.log('='.repeat(80));
    console.log('✅ 엑셀 업로드 테스트 완료!');
    console.log('='.repeat(80));
    console.log('');
    console.log('📝 구글 드라이브에서 확인:');
    console.log('   Cashflow: https://drive.google.com/drive/folders/1kv9XlTFLh8QqTlDvakwaxB_LtTQxv6Hx');
    console.log('   Totalcash: https://drive.google.com/drive/folders/1GC4hwjkVNqUmBGhaE5PmldoMr0WUEkGo');
    console.log('');

  } catch (error) {
    console.error('❌ 테스트 실패:', error);
    process.exit(1);
  }
}

// 월별 업로드 테스트 (지난 3개월)
async function testMultipleMonths() {
  console.log('='.repeat(80));
  console.log('📅 여러 달 엑셀 업로드 테스트 (최근 3개월)');
  console.log('='.repeat(80));
  console.log('');

  const now = new Date();
  const periods: string[] = [];

  // 최근 3개월
  for (let i = 0; i < 3; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    periods.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }

  console.log('업로드할 기간:', periods.join(', '));
  console.log('');

  for (const period of periods) {
    console.log(`\n📤 ${period} 업로드 중...`);
    const results = await uploadAllExcels(period);

    console.log(`  Cashflow: ${results.cashflow.success ? '✅' : '❌'}`);
    console.log(`  Totalcash: ${results.totalcash.success ? '✅' : '❌'}`);
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('✅ 여러 달 업로드 완료!');
  console.log('='.repeat(80));
}

// 명령줄 인자에 따라 실행
const args = process.argv.slice(2);
if (args.includes('--multi')) {
  testMultipleMonths().catch(console.error);
} else {
  testExcelUpload().catch(console.error);
}
