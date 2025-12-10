import { appendConsultationNoteToSheet, appendSystemConsultationNoteToSheet } from '../../lib/google/b2b-backup';

async function main() {
    console.log('🧪 상담기록 백업 테스트 시작...\n');
    const timestamp = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

    // 1. B2B유입 상담기록 테스트
    console.log('1️⃣ B2B유입 상담기록 백업 테스트...');
    try {
        const b2bResult = await appendConsultationNoteToSheet({
            consultationId: 99999,
            customerId: 99999,
            customerName: '테스트고객_B2B',
            customerPhone: '010-9999-0001',
            consultedAt: timestamp,
            content: '[테스트] B2B유입 상담기록 백업 테스트',
            consultantName: '테스트상담자',
            consultantType: '본사',
            nextActionDate: null,
            nextActionNote: null,
            statusAfter: '상담완료',
            audioFileUrl: null,
            createdAt: timestamp,
        });
        console.log('   ✅ B2B유입 상담기록 백업 성공:', b2bResult);
    } catch (err: any) {
        console.error('   ❌ B2B유입 상담기록 백업 실패:', err?.message || err);
    }

    // 2. 시스템상담 상담기록 테스트
    console.log('\n2️⃣ 시스템상담 상담기록 백업 테스트...');
    try {
        const systemResult = await appendSystemConsultationNoteToSheet({
            noteId: 99999,
            consultationId: 99999,
            customerName: '테스트고객_시스템',
            customerPhone: '010-9999-0002',
            partnerName: '테스트파트너',
            consultedAt: timestamp,
            content: '[테스트] 시스템상담 상담기록 백업 테스트',
            consultantName: '테스트상담자',
            consultantType: '본사',
            nextActionDate: null,
            nextActionNote: null,
            statusAfter: '상담완료',
            audioFileUrl: null,
            createdAt: timestamp,
        });
        console.log('   ✅ 시스템상담 상담기록 백업 성공:', systemResult);
    } catch (err: any) {
        console.error('   ❌ 시스템상담 상담기록 백업 실패:', err?.message || err);
    }

    console.log('\n✨ 상담기록 백업 테스트 완료!\n');
}

main();
