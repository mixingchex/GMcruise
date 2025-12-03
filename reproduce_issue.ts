
// Mocking the content of lib/subscription-limits-client.ts to avoid import issues
function getFeatureTypeClient(feature: string): 'branch-manager' | 'sales-agent' | 'subscription' {
    // 대리점장 전용 기능
    const branchManagerFeatures = [
        'team-management',
        'stats-detail',
        'report-advanced',
        'data-export',
        'api-access',
        'contract-invite',
        'commission-adjust',
        'advanced-settings',
        'view-contract', // 나의 계약서 보기
    ];

    // 판매원 전용 기능 (마비즈 VIP 판매원)
    const salesAgentFeatures = [
        // 판매원 전용 기능이 있다면 여기에 추가
    ];

    if (branchManagerFeatures.includes(feature)) {
        return 'branch-manager';
    }

    if (salesAgentFeatures.includes(feature)) {
        return 'sales-agent';
    }

    return 'subscription';
}

function canUseFeatureClient(
    feature: string,
    subscriptionInfo: {
        isTrial: boolean;
        status: 'trial' | 'active' | 'expired' | 'cancelled';
    } | null
): boolean {
    if (!subscriptionInfo) {
        return false;
    }

    // 무료 체험 중인 경우 (30% 기능만)
    if (subscriptionInfo.isTrial) {
        const allowedFeatures = [
            'my-mall',              // 나의 판매몰
            'link-create',         // 링크 관리
            'customer-management', // 나의 고객관리
            'purchased-customers', // 구매고객 관리
            'profile-edit',        // 프로필 수정
        ];
        return allowedFeatures.includes(feature);
    }

    // 정식 구독 중인 경우 (50% 기능만)
    if (subscriptionInfo.status === 'active') {
        const allowedFeatures = [
            'my-mall',              // 나의 판매몰
            'link-create',         // 링크 관리
            'customer-management', // 나의 고객관리
            'purchased-customers', // 구매고객 관리
            'companion-registration', // 크루즈 가이드 동행인 등록
            'customer-group-management', // 고객 그룹 관리
            'profile-edit',        // 프로필 수정
            'sns-profile',         // 나의 SNS 프로필
        ];
        return allowedFeatures.includes(feature);
    }

    return false;
}

// --- Test Case ---

console.log("--- Reproduction Test ---");

const feature = 'document-management';
const subscriptionInfo = null; // Branch Manager / Sales Agent usually don't have subscription info
const isBranchManager = true;
const isSalesAgent = false;

console.log(`Testing access for Feature: ${feature}`);
console.log(`User Role: Branch Manager (isBranchManager=${isBranchManager})`);
console.log(`Subscription Info: ${JSON.stringify(subscriptionInfo)}`);

// Current Logic in PartnerDashboard.tsx:
// {!canUseFeatureClient('document-management', subscriptionInfo) ? ( ... restriction ... ) : ( ... access ... )}

const canAccess = canUseFeatureClient(feature, subscriptionInfo);
console.log(`canUseFeatureClient result: ${canAccess}`);

if (!canAccess) {
    console.log("RESULT: Access DENIED (Issue Reproduced)");
} else {
    console.log("RESULT: Access GRANTED");
}

// Proposed Fix Logic Test
console.log("\n--- Testing Proposed Fix Logic ---");
const canAccessFixed = isBranchManager || isSalesAgent || canUseFeatureClient(feature, subscriptionInfo);
console.log(`Proposed Logic (isBranchManager || isSalesAgent || canUseFeatureClient): ${canAccessFixed}`);

if (canAccessFixed) {
    console.log("RESULT: Access GRANTED (Fix Verified)");
} else {
    console.log("RESULT: Access DENIED (Fix Failed)");
}
