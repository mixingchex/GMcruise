'use client';

/**
 * PartnerDashboard — 역할별 대시보드 라우터
 *   SALES_AGENT   → SalesAgentDashboard (간소화 버전)
 *   BRANCH_MANAGER / 기타 → BranchManagerDashboard (전체 버전)
 */
import SalesAgentDashboard from './SalesAgentDashboard';
import BranchManagerDashboard from './BranchManagerDashboard';

type PartnerDashboardProps = {
  user: {
    id: number;
    name: string | null;
    email: string | null;
    phone: string | null;
    mallUserId: string;
    mallNickname: string | null;
  };
  profile: any;
  trialInfo?: {
    trialEndDate: string | null;
    daysRemaining: number | null;
  } | null;
};

export default function PartnerDashboard({ user, profile, trialInfo }: PartnerDashboardProps) {
  if (profile.type === 'SALES_AGENT') {
    return <SalesAgentDashboard user={user} profile={profile} trialInfo={trialInfo} />;
  }
  return <BranchManagerDashboard user={user} profile={profile} trialInfo={trialInfo} />;
}
