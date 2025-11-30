/**
 * 테스트 코드: 어필리에이트 프로필 삭제 기능
 * 
 * 목적: 로그인 없이 삭제 API가 정상 작동하는지 확인
 * 실행: npx tsx scripts/test-affiliate-delete.ts
 */

async function testAffiliateDelete() {
    console.log('🧪 테스트 시작: 어필리에이트 프로필 삭제 API\n');

    // Step 1: 테스트용 프로필 ID (실제 존재하는 ID로 변경 필요)
    const testProfileId = 999; // 존재하지 않는 ID로 테스트

    console.log(`📋 테스트 대상 프로필 ID: ${testProfileId}`);

    try {
        // Step 2: DELETE 요청 보내기
        const response = await fetch(`http://localhost:3001/api/admin/affiliate/profiles/${testProfileId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
        });

        console.log(`\n📡 응답 상태: ${response.status} ${response.statusText}`);

        // Step 3: 응답 확인
        const result = await response.json();
        console.log('📦 응답 데이터:', JSON.stringify(result, null, 2));

        // Step 4: 결과 판정
        if (response.ok && result.ok) {
            console.log('\n✅ 성공: 삭제 API가 정상 작동합니다!');
            return true;
        } else {
            console.log('\n❌ 실패: 삭제 API에 문제가 있습니다.');
            console.log('   에러 메시지:', result.message || result.error);
            return false;
        }
    } catch (error: any) {
        console.error('\n💥 예외 발생:', error.message);
        console.error('   상세:', error);
        return false;
    }
}

// Step 5: 실제 프로필 목록 확인 (삭제 가능한 ID 찾기)
async function findDeletableProfile() {
    console.log('\n🔍 삭제 가능한 프로필 찾기...\n');

    try {
        const response = await fetch('http://localhost:3001/api/admin/affiliate/profiles', {
            credentials: 'include',
        });

        if (!response.ok) {
            console.log('❌ 프로필 목록을 가져올 수 없습니다.');
            return null;
        }

        const result = await response.json();
        const profiles = result.profiles || [];

        // HQ가 아닌 프로필 찾기 (HQ는 삭제 불가)
        const deletableProfiles = profiles.filter((p: any) => p.type !== 'HQ');

        if (deletableProfiles.length > 0) {
            console.log(`✅ 삭제 가능한 프로필 ${deletableProfiles.length}개 발견:`);
            deletableProfiles.slice(0, 3).forEach((p: any) => {
                console.log(`   - ID: ${p.id}, 이름: ${p.displayName || p.nickname || 'N/A'}, 타입: ${p.type}`);
            });
            return deletableProfiles[0].id;
        } else {
            console.log('⚠️  삭제 가능한 프로필이 없습니다.');
            return null;
        }
    } catch (error: any) {
        console.error('💥 에러:', error.message);
        return null;
    }
}

// 메인 실행
async function main() {
    console.log('='.repeat(60));
    console.log('어필리에이트 프로필 삭제 기능 테스트');
    console.log('='.repeat(60) + '\n');

    // 1. 삭제 가능한 프로필 찾기
    const profileId = await findDeletableProfile();

    if (!profileId) {
        console.log('\n⚠️  테스트를 진행할 수 없습니다.');
        console.log('   해결 방법: 관리자 패널에서 테스트용 프로필을 먼저 생성하세요.');
        return;
    }

    console.log(`\n📌 테스트 대상: 프로필 ID ${profileId}`);
    console.log('⚠️  주의: 이 테스트는 실제로 프로필을 삭제하지 않습니다. (존재하지 않는 ID 사용)\n');

    // 2. 삭제 API 테스트
    await testAffiliateDelete();

    console.log('\n' + '='.repeat(60));
    console.log('테스트 완료');
    console.log('='.repeat(60));
}

main().catch(console.error);
