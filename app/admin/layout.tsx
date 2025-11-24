'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import NotificationBell from '@/components/admin/NotificationBell';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customerGroupExpanded, setCustomerGroupExpanded] = useState(true); // 기본값: true (항상 펼침)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/admin/auth-check', {
          credentials: 'include',
        });
        const data = await response.json();

        if (data.ok && data.authenticated) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('[AdminLayout] 인증 확인 오류:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== '/admin/login') {
      router.push('/admin/login');
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('[AdminLayout] 로그아웃 오류:', error);
    }

    setIsAuthenticated(false);
    router.push('/admin/login');
  };

  const customerMenuItems = [
    { href: '/admin/customers', label: '전체 고객 관리', icon: '👥' },
    { href: '/admin/customers?customerGroup=trial', label: '크루즈가이드 3일 체험', icon: '🧪' },
    { href: '/admin/customers?customerGroup=mall', label: '크루즈몰 고객', icon: '🛍️' },
    { href: '/admin/customers?customerGroup=purchase', label: '구매 고객', icon: '✅' },
    { href: '/admin/customers?customerGroup=refund', label: '환불 고객', icon: '↩️' },
    { href: '/admin/customers?customerGroup=passport', label: '여권 관리', icon: '🛂' },
    { href: '/admin/customers?customerGroup=manager-customers', label: '대리점장 고객', icon: '🏢' },
    { href: '/admin/customers?customerGroup=agent-customers', label: '판매원 고객', icon: '👤' },
    { href: '/admin/customers?customerGroup=prospects', label: '잠재고객', icon: '📄' },
    { href: '/admin/admin-panel-admins', label: '관리자 패널 관리', icon: '⚙️👑' },
  ];

  const menuItems = [
    { href: '/admin/affiliate/customers?source=mall', label: '문의고객', icon: '📞', section: 'inquiries' },
    { href: '/admin/apis', label: 'APIS 확인하기', icon: '📋' },
    { href: '/admin/dashboard', label: '대시보드', icon: '📊' },
    { href: '/admin/pwa-stats', label: 'PWA 설치 통계', icon: '📲' },
    // { href: '/admin/video-meetings', label: '화상 회의', icon: '📹' }, // 화상회의 기능 비활성화
    { href: '/admin/messages', label: '고객 메시지', icon: '💬', section: 'marketing' },
    { href: '/admin/team-dashboard-messages', label: '팀 대시보드 메시지함', icon: '📨', section: 'marketing' },
    { href: '/admin/scheduled-messages', label: '예약 메시지', icon: '📅', section: 'marketing' },
    { href: '/admin/customer-groups', label: '고객 그룹 관리', icon: '👥', section: 'marketing' },
    { href: '/admin/manual-passport-request', label: '수동 여권 요청', icon: '🛂' },
    { href: '/admin/passport-request', label: '여권 요청 관리', icon: '🛂' },
    { href: '/admin/data-analysis', label: '데이터분석', icon: '📊' },
    { href: '/admin/feedback', label: '후기 관리', icon: '💬' },
    { href: '/admin/documents', label: '서류관리', icon: '📄' },
    { href: '/admin/assign-trip', label: '여행 배정', icon: '✈️' },
    { href: '/admin/mall', label: '메인몰 관리', icon: '🛍️', section: 'mall' },
    { href: '/admin/images', label: '이미지 라이브러리', icon: '🖼️', section: 'mall' },
    { href: '/admin/products', label: '크루즈 상품 관리', icon: '📦', section: 'mall' },
    { href: '/admin/inquiries', label: '구매 문의 관리', icon: '📋', section: 'mall' },
    { href: '/admin/mall-analytics', label: '메인몰 데이터 분석', icon: '📊', section: 'mall' },
    { href: '/admin/affiliate/products', label: '어필리에이트 수당', icon: '🤝', section: 'affiliate' },
    { href: '/admin/affiliate/profiles', label: '어필리에이트 인력', icon: '🧑‍🤝‍🧑', section: 'affiliate' },
    { href: '/admin/affiliate/contracts', label: '어필리에이트 계약', icon: '📄', section: 'affiliate' },
    { href: '/admin/affiliate/payment-pages', label: '어필리에이트 결제 페이지', icon: '💳', section: 'affiliate' },
    { href: '/admin/affiliate/mall', label: '판매원 개인몰 관리', icon: '🛍️', section: 'affiliate' },
    { href: '/admin/affiliate/customers', label: '어필리에이트 고객 관리', icon: '👥', section: 'affiliate' },
    { href: '/admin/affiliate/sales-confirmation/pending', label: '판매 확정 승인', icon: '✅', section: 'affiliate' },
    { href: '/admin/affiliate/adjustments', label: '수당 조정 승인', icon: '💰', section: 'affiliate' },
    { href: '/admin/affiliate/documents', label: '문서 관리', icon: '📄', section: 'affiliate' },
    { href: '/admin/affiliate/statements', label: '지급명세서 관리', icon: '📋', section: 'affiliate' },
    { href: '/admin/affiliate/refunds', label: '환불 처리 관리', icon: '↩️', section: 'affiliate' },
    { href: '/admin/system/status', label: '시스템 상태', icon: '🛡️', section: 'system' },
    { href: '/admin/system/google-drive', label: 'Google Drive 설정', icon: '☁️', section: 'system' },
    { href: '/admin/seo', label: 'SEO 관리', icon: '🔍', section: 'system' },
    { href: '/admin/affiliate/links', label: '링크 관리', icon: '🔗', section: 'affiliate' },
    // { href: '/admin/affiliate/links/cleanup', label: '링크 정리', icon: '🧹', section: 'affiliate' }, // 사용하지 않는 기능 (주석 처리)
    { href: '/admin/affiliate/test-simulation', label: '구매 시뮬레이션 테스트', icon: '🧪', section: 'affiliate' },
    { href: '/admin/affiliate/team-dashboard', label: '팀 성과 대시보드', icon: '📈', section: 'affiliate' },
    { href: '/admin/affiliate/settlements', label: '정산 대시보드', icon: '💰', section: 'affiliate' },
    { href: '/admin/affiliate/agent-dashboard', label: '판매원 대시보드', icon: '🧑‍💼', section: 'affiliate' },
    { href: '/admin/pages', label: '페이지 콘텐츠 관리', icon: '📝', section: 'marketing' },
    { href: '/admin/landing-pages', label: '랜딩페이지 관리', icon: '📄', section: 'marketing' },
    { href: '/admin/chat-bot', label: 'AI 지니 채팅봇(구매)', icon: '🤖' },
    { href: '/admin/community', label: '커뮤니티 관리', icon: '💬' },
    // 마케팅 자동화
    { href: '/admin/marketing/dashboard', label: '마케팅 대시보드', icon: '📊', section: 'marketing' },
    { href: '/admin/funnel', label: '퍼널 메시지', icon: '📊', section: 'marketing' },
    { href: '/admin/marketing/customers', label: '고객 관리 (99K)', icon: '👥', section: 'marketing' },
    { href: '/admin/settings', label: '관리자 정보', icon: '⚙️', section: 'system' },
  ];

  const sectionConfigs = [
    { key: 'inquiries', label: '문의고객', icon: '📞' },
    { key: 'general', label: '기본 메뉴', icon: '📂' },
    { key: 'marketing', label: '마케팅 자동화', icon: '🚀' },
    { key: 'mall', label: '메인몰', icon: '🛍️' },
    { key: 'affiliate', label: '어필리에이트', icon: '🤝' },
    { key: 'system', label: '시스템 설정', icon: '⚙️' },
  ] as const;

  const groupedMenu = useMemo(() => {
    return menuItems.reduce<Record<string, typeof menuItems>>((acc, item) => {
      const key = item.section ?? 'general';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [menuItems]);

  const [sectionExpanded, setSectionExpanded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    sectionConfigs.forEach(({ key }) => {
      initial[key] = true;
    });
    return initial;
  });

  const toggleSection = (key: string) => {
    setSectionExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-red"></div>
          <p className="mt-4 text-lg text-gray-600">관리자 패널 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 shadow-lg border-b-4 border-blue-800">
        <div className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-4xl">⚓</span>
            <h1 className="text-2xl font-extrabold text-white">크루즈 가이드 관리자 패널</h1>
          </div>
          <div className="flex items-center space-x-4">
            {/* 알림 종 (오른쪽 상단) */}
            <NotificationBell />
            <span className="text-sm font-semibold text-blue-100 bg-blue-500/30 px-3 py-1.5 rounded-lg">관리자</span>
            <button
              onClick={handleLogout}
              className="bg-white hover:bg-gray-100 text-blue-700 px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-md hover:scale-105"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="w-64 bg-gradient-to-b from-white to-gray-50 shadow-lg border-r-2 border-gray-200 min-h-screen">
          <nav className="p-4">
            <ul className="space-y-3">
              {sectionConfigs.map(({ key, label, icon }) => {
                const items = groupedMenu[key] ?? [];
                if (!items.length) return null;

                return (
                  <li key={key} className="rounded-2xl border border-gray-100 bg-white/70 shadow-sm">
                    <button
                      onClick={() => toggleSection(key)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-200 ${
                        sectionExpanded[key]
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{icon}</span>
                        <span className="font-bold text-sm tracking-wide">{label}</span>
                      </div>
                      <span className="text-lg">{sectionExpanded[key] ? '▼' : '▶'}</span>
                    </button>
                    {sectionExpanded[key] && (
                      <ul className="space-y-1 px-2 py-3">
                        {items.map((item) => (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              target={(item as any).external ? '_blank' : undefined}
                              rel={(item as any).external ? 'noopener noreferrer' : undefined}
                              className={`flex items-center space-x-3 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                                pathname === item.href
                                  ? 'bg-blue-100 text-blue-700 shadow'
                                  : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              <span className="text-lg">{item.icon}</span>
                              <span>{item.label}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}

              <li className="rounded-2xl border border-gray-100 bg-white/70 shadow-sm">
                <button
                  onClick={() => setCustomerGroupExpanded(!customerGroupExpanded)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-200 ${
                    customerGroupExpanded
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">👥</span>
                    <span className="font-bold text-sm tracking-wide">고객</span>
                  </div>
                  <span className="text-lg">{customerGroupExpanded ? '▼' : '▶'}</span>
                </button>
                {customerGroupExpanded && (
                  <ul className="space-y-1 px-2 py-3">
                    {customerMenuItems.map((item) => {
                      // customerGroup 쿼리 파라미터 확인
                      const isActive = item.href.includes('customerGroup=')
                        ? pathname === '/admin/customers' && searchParams?.get('customerGroup') === item.href.split('customerGroup=')[1]?.split('&')[0]
                        : pathname === item.href || (item.href === '/admin/customers' && pathname === '/admin/customers' && !searchParams?.get('customerGroup'));
                      
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className={`flex items-center space-x-3 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                              isActive
                                ? 'bg-purple-100 text-purple-700 shadow'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <span className="text-lg">{item.icon}</span>
                            <span>{item.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            </ul>
          </nav>
        </aside>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}