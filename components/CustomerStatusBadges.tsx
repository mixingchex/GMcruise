'use client';

import { FiCheckCircle, FiClock, FiShoppingBag, FiUser } from 'react-icons/fi';

interface CustomerStatusBadgesProps {
  testModeStartedAt: string | null | undefined;
  customerStatus: string | null | undefined;
  mallUserId: string | null | undefined;
  className?: string;
}

/**
 * 고객 상태 딱지 컴포넌트
 * - 3일 체험 중: testModeStartedAt이 있으면 표시
 * - 일반 크루즈 가이드: testModeStartedAt이 없고 customerStatus가 'active' 또는 'package'면 표시
 * - 크루즈몰 가입: mallUserId가 있으면 표시
 */
export default function CustomerStatusBadges({
  testModeStartedAt,
  customerStatus,
  mallUserId,
  className = '',
}: CustomerStatusBadgesProps) {
  const isTrialUser = !!testModeStartedAt;
  const isRegularGenie = !testModeStartedAt && (customerStatus === 'active' || customerStatus === 'package');
  const isMallUser = !!mallUserId;

  const badges = [];

  // 3일 체험 중
  if (isTrialUser) {
    badges.push({
      label: '3일 체험',
      icon: <FiClock className="w-3 h-3" />,
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700',
      borderColor: 'border-yellow-200',
    });
  }

  // 일반 크루즈 가이드
  if (isRegularGenie) {
    badges.push({
      label: '크루즈 가이드',
      icon: <FiUser className="w-3 h-3" />,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-200',
    });
  }

  // 크루즈몰 가입
  if (isMallUser) {
    badges.push({
      label: '크루즈몰',
      icon: <FiShoppingBag className="w-3 h-3" />,
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700',
      borderColor: 'border-purple-200',
    });
  }

  if (badges.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {badges.map((badge, index) => (
        <span
          key={index}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border ${badge.bgColor} ${badge.textColor} ${badge.borderColor}`}
        >
          {badge.icon}
          {badge.label}
        </span>
      ))}
    </div>
  );
}


