/**
 * 테스트: 어필리에이트 프로필 삭제 API (로컬 서버)
 * 실행: npx tsx scripts/test-delete-local.ts
 */

async function testDeleteAPI() {
    console.log('🧪 로컬 서버에서 삭제 API 테스트\n');

    // 테스트할 프로필 ID (실제 존재하는 ID로 변경 필요)
    const testProfileId = 22; // 스크린샷에서 보이는 ID

    try {
        console.log(`📋 프로필 ID ${testProfileId} 삭제 시도...`);

        const response = await fetch(`http://localhost:3001/api/admin/affiliate/profiles/${testProfileId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': 'session=your-session-cookie-here', // 실제 세션 쿠키 필요
            },
        });

        console.log(`\n📡 응답 상태: ${response.status} ${response.statusText}`);

        const result = await response.json();
        console.log('📦 응답 데이터:', JSON.stringify(result, null, 2));

        if (response.ok && result.ok) {
            console.log('\n✅ 성공: 삭제 API가 정상 작동합니다!');
        } else {
            console.log('\n❌ 실패:', result.message || result.error);
        }
    } catch (error: any) {
        console.error('\n💥 에러:', error.message);
    }
}

testDeleteAPI();
