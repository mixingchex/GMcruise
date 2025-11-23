// scripts/test-contract-pdf.ts
// 계약서 PDF 생성 및 전송 테스트 스크립트

import { generateContractPDFFromId, saveContractPDF } from '../lib/affiliate/contract-pdf';
import { sendContractPDFByEmail } from '../lib/affiliate/contract-email';
import prisma from '../lib/prisma';

async function testContractPDF() {
  try {
    console.log('=== 계약서 PDF 생성 및 전송 테스트 ===\n');

    // 1. 테스트할 계약서 찾기
    const contract = await prisma.affiliateContract.findFirst({
      where: {
        status: {
          in: ['submitted', 'completed'],
        },
      },
      include: {
        User: {
          select: {
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });

    if (!contract) {
      console.log('❌ 테스트할 계약서가 없습니다.');
      console.log('   계약서를 먼저 제출해주세요.');
      return;
    }

    console.log(`✅ 계약서 찾음: ID ${contract.id}`);
    console.log(`   이름: ${contract.name}`);
    console.log(`   이메일: ${contract.email || contract.User?.email || '없음'}`);
    console.log(`   상태: ${contract.status}\n`);

    // 2. PDF 생성 테스트
    console.log('📄 PDF 생성 중...');
    try {
      const pdfBuffer = await generateContractPDFFromId(contract.id);
      console.log(`✅ PDF 생성 성공! 크기: ${(pdfBuffer.length / 1024).toFixed(2)} KB\n`);

      // 3. PDF 파일 저장
      console.log('💾 PDF 파일 저장 중...');
      const pdfUrl = await saveContractPDF(contract.id, pdfBuffer);
      console.log(`✅ PDF 파일 저장 성공!`);
      console.log(`   경로: ${pdfUrl}`);
      console.log(`   전체 경로: ${process.cwd()}${pdfUrl}\n`);

      // 4. 이메일 전송 테스트 (이메일이 있는 경우만)
      const recipientEmail = contract.email || contract.User?.email;
      if (recipientEmail) {
        console.log(`📧 이메일 전송 테스트 (${recipientEmail})...`);
        const emailResult = await sendContractPDFByEmail(
          contract.id,
          recipientEmail,
          contract.name,
          `[테스트] 계약서 완료`,
          `
            <div style="font-family: 'Malgun Gothic', sans-serif; padding: 20px;">
              <h2>테스트: 계약서가 완료되었습니다</h2>
              <p>안녕하세요, ${contract.name}님,</p>
              <p>이것은 테스트 이메일입니다.</p>
              <p>계약서 PDF가 첨부되어 있습니다.</p>
            </div>
          `
        );

        if (emailResult.success) {
          console.log('✅ 이메일 전송 성공!\n');
        } else {
          console.log('❌ 이메일 전송 실패:', emailResult.error);
          console.log('   이메일 설정을 확인해주세요.\n');
        }
      } else {
        console.log('⚠️  이메일 주소가 없어 이메일 전송을 건너뜁니다.\n');
      }

      console.log('=== 테스트 완료 ===');
      console.log('\n확인 사항:');
      console.log(`1. PDF 파일: ${process.cwd()}${pdfUrl}`);
      console.log(`2. 이메일 수신함 확인: ${recipientEmail || '이메일 없음'}`);
      console.log(`3. 서버 로그 확인: [Contract PDF] 메시지 확인`);

    } catch (error: any) {
      console.error('❌ PDF 생성 실패:', error.message);
      console.error('   스택:', error.stack);
    }
  } catch (error: any) {
    console.error('❌ 테스트 실패:', error.message);
    console.error('   스택:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
testContractPDF();






