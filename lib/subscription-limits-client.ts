// lib/subscription-limits-client.ts
// 클라이언트에서 사용하는 구독 기능 제한 유틸리티

/**
 * 기능 타입 확인 (대리점장 전용 / 판매원 전용)
 */
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

/**
 * 클라이언트에서 기능 사용 가능 여부 확인
 */
export function canUseFeatureClient(
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
      'link-create',      // 링크 생성
      'sale-confirm',     // 판매 확정
      'dashboard-basic',   // 기본 대시보드 조회
      'lead-view',        // 리드 조회
      'profile-edit',     // 프로필 수정 (3.3% 수당 및 통장사본 필요)
    ];
    return allowedFeatures.includes(feature);
  }

  // 정식 구독 중인 경우 (50% 기능만)
  if (subscriptionInfo.status === 'active') {
    const allowedFeatures = [
      'link-create',           // 링크 생성
      'sale-confirm',          // 판매 확정
      'dashboard-basic',       // 기본 대시보드 조회
      'lead-view',             // 리드 조회
      'stats-basic',           // 기본 통계
      'customer-management',   // 고객 관리
      'profile-edit',          // 프로필 수정 (3.3% 수당 및 통장사본 필요)
    ];
    return allowedFeatures.includes(feature);
  }

  return false;
}

/**
 * 클라이언트에서 기능 제한 메시지 반환
 */
export function getFeatureRestrictionMessageClient(
  feature: string,
  subscriptionInfo: {
    isTrial: boolean;
    status: 'trial' | 'active' | 'expired' | 'cancelled';
  } | null
): string {
  if (!subscriptionInfo) {
    return '정액제 구독이 필요합니다.';
  }

  const featureType = getFeatureTypeClient(feature);
  const isTrial = subscriptionInfo.isTrial;
  const isActive = subscriptionInfo.status === 'active';

  if (featureType === 'branch-manager') {
    return '대리점장님 기능입니다. 정액제는 쓸 수 없어요 ㅠㅠ 담당 점장님과 상의 해 주세요';
  }

  if (featureType === 'sales-agent') {
    return '마비즈 VIP 판매원 기능입니다. 정액제는 쓸 수 없어요 ㅠㅠ 담당 점장님과 상의 해 주세요';
  }

  // 정액제 기능이지만 사용 불가능한 경우
  if (isTrial) {
    return '지금은 무료 사용 중이십니다. 다른 기능은 사용할 수 없어요 ㅠㅠ';
  }

  if (!isActive) {
    return '이 기능은 정액제 구독 후 이용 가능합니다.';
  }

  return '이 기능은 사용할 수 없습니다.';
}

