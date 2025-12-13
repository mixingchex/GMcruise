'use client';

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import NotificationBell from '@/components/admin/NotificationBell';
import CompressorModal from '@/components/common/CompressorModal';

// searchParams를 조건부로 사용하기 위한 래퍼 컴포넌트
function AdminLayoutContent({
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
  const [showCompressorModal, setShowCompressorModal] = useState(false);

  // 인증 상태를 세션 스토리지에 캐시하여 불필요한 API 호출 방지
  const authCheckRef = useRef(false);
  const lastAuthCheckRef = useRef<number>(0);
  const AUTH_CACHE_DURATION = 5 * 60 * 1000; // 5분 캐시

  // 로그인 페이지인지 확인
  const isLoginPage = pathname === '/admin/login';

  const checkAuth = useCallback(async () => {
    // 로그인 페이지에서는 인증 체크 건너뛰기
    if (isLoginPage) {
      setIsLoading(false);
      return;
    }

    // 캐시된 인증 상태 확인 (5분 이내)
    const now = Date.now();
    const cachedAuth = sessionStorage.getItem('admin_auth');
    const cachedTime = sessionStorage.getItem('admin_auth_time');

    if (cachedAuth && cachedTime) {
      const cacheTime = parseInt(cachedTime, 10);
      if (now - cacheTime < AUTH_CACHE_DURATION) {
        const isCachedAuth = cachedAuth === 'true';
        setIsAuthenticated(isCachedAuth);
        setIsLoading(false);
        return;
      }
    }

    // 중복 요청 방지
    if (authCheckRef.current) {
      return;
    }

    try {
      authCheckRef.current = true;
      const response = await fetch('/api/admin/auth-check', {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await response.json();

      const authenticated = data.ok && data.authenticated;
      setIsAuthenticated(authenticated);

      // 세션 스토리지에 캐시
      sessionStorage.setItem('admin_auth', authenticated.toString());
      sessionStorage.setItem('admin_auth_time', now.toString());
      lastAuthCheckRef.current = now;
    } catch (error) {
      console.error('[AdminLayout] 인증 확인 오류:', error);
      setIsAuthenticated(false);
      sessionStorage.removeItem('admin_auth');
      sessionStorage.removeItem('admin_auth_time');
    } finally {
      setIsLoading(false);
      authCheckRef.current = false;
    }
  }, [isLoginPage]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // 경로 변경 시 캐시된 인증 상태만 확인 (빠른 응답)
  useEffect(() => {
    if (isLoginPage) {
      setIsLoading(false);
      return;
    }

    if (!isLoading && pathname !== '/admin/login') {
      const cachedAuth = sessionStorage.getItem('admin_auth');
      const cachedTime = sessionStorage.getItem('admin_auth_time');
      const now = Date.now();

      // 캐시가 있고 유효하면 즉시 사용, 아니면 재확인
      if (cachedAuth && cachedTime) {
        const cacheTime = parseInt(cachedTime, 10);
        if (now - cacheTime < AUTH_CACHE_DURATION) {
          // 캐시 유효, 재확인은 백그라운드에서
          if (now - lastAuthCheckRef.current > 60000) { // 1분마다 백그라운드 확인
            checkAuth();
          }
        } else {
          // 캐시 만료, 즉시 재확인
          checkAuth();
        }
      }
    }
  }, [pathname, isLoading, checkAuth, isLoginPage]);

  useEffect(() => {
    if (isLoginPage) {
      return;
    }

    if (!isLoading && !isAuthenticated && pathname !== '/admin/login') {
      router.push('/admin/login');
    }
  }, [isAuthenticated, isLoading, pathname, router, isLoginPage]);

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

  // 고객관리 섹션 (상담기록, 백업 포함)
  const customerMenuItems = [
    { href: '/admin/customers', label: '전체 고객 관리', icon: '👥', desc: '고객 목록 + 상담기록' },
    { href: '/admin/customer-groups', label: '고객 그룹 관리', icon: '📁' },
    { href: '/admin/affiliate/customers?source=mall', label: '전화상담 문의고객', icon: '📞' },
    { href: '/admin/purchased-customers', label: '구매 고객 관리', icon: '🛒' },
    { href: '/admin/admin-panel-admins', label: '관리자 패널 관리', icon: '⚙️👑' },
  ];

  const menuItems = [
    // 고객관리 섹션으로 이동됨: 문의고객, 구매고객관리, 고객그룹관리
    { href: '/admin/apis', label: 'APIS 확인하기', icon: '📋' },
    { href: '/admin/dashboard', label: '대시보드', icon: '📊' },
    { href: '/admin/pwa-stats', label: 'PWA 설치 통계', icon: '📲' },
    { href: '/admin/message-center', label: '메시지 센터', icon: '📨', section: 'marketing' },
    { href: '/admin/feedback', label: '후기 관리', icon: '💬' },
    { href: '/admin/documents', label: '서류관리', icon: '📄' },
    { href: '/admin/assign-trip', label: '여행 배정', icon: '✈️' },
    { href: '/admin/mall', label: '메인몰 관리', icon: '🛍️', section: 'mall' },
    { href: '/admin/mall-sales', label: '크루즈몰 매출관리', icon: '💳', section: 'mall' },
    { href: '/admin/images', label: '이미지 라이브러리', icon: '🖼️', section: 'mall' },
    { href: '/admin/products', label: '크루즈 상품 관리', icon: '📦', section: 'mall' },
    { href: '/admin/inquiries', label: '구매 문의 관리', icon: '📋', section: 'mall' },
    { href: '/admin/mall-analytics', label: '메인몰 데이터 분석', icon: '📊', section: 'mall' },
    // 어필리에이트 - 인력/계약
    { href: '/admin/affiliate/profiles', label: '인력 관리', icon: '🧑‍🤝‍🧑', section: 'affiliate-team' },
    { href: '/admin/affiliate/contracts', label: '계약 관리', icon: '📄', section: 'affiliate-team' },
    { href: '/admin/affiliate/contract-templates', label: '계약서 템플릿', icon: '📜', section: 'affiliate-team' },
    { href: '/admin/affiliate/documents', label: '문서 관리', icon: '📁', section: 'affiliate-team' },
    { href: '/admin/affiliate/mall', label: '개인몰 관리', icon: '🛍️', section: 'affiliate-team' },
    { href: '/admin/affiliate/payment-pages', label: '결제 페이지', icon: '💳', section: 'affiliate-team' },
    // 어필리에이트 - 판매/정산
    { href: '/admin/affiliate/products', label: '수당 설정', icon: '🤝', section: 'affiliate-sales' },
    { href: '/admin/affiliate/sales-confirmation/pending', label: '판매 확정 승인', icon: '✅', section: 'affiliate-sales' },
    { href: '/admin/final-confirm', label: '최종확인 관리', icon: '📋', section: 'affiliate-sales' },
    { href: '/admin/affiliate/settlements', label: '정산 대시보드', icon: '💰', section: 'affiliate-sales' },
    { href: '/admin/affiliate/statements', label: '지급명세서', icon: '📋', section: 'affiliate-sales' },
    { href: '/admin/affiliate/refunds', label: '환불 처리', icon: '↩️', section: 'affiliate-sales' },
    { href: '/admin/affiliate/year-end-summary', label: '연말 정산', icon: '📊', section: 'affiliate-sales' },
    // 어필리에이트 - 고객/B2B
    { href: '/admin/affiliate/customers', label: '고객 관리', icon: '👥', section: 'affiliate-customer' },
    { href: '/admin/b2b-prospects', label: 'B2B 잠재고객', icon: '🏢', section: 'affiliate-customer' },
    { href: '/admin/b2b-landing/editor', label: 'B2B 랜딩페이지', icon: '✏️', section: 'affiliate-customer' },
    { href: '/admin/affiliate/links', label: '링크 관리', icon: '🔗', section: 'affiliate-customer' },
    // 어필리에이트 - 대시보드/테스트
    { href: '/admin/affiliate/team-dashboard', label: '팀 성과 대시보드', icon: '📈', section: 'affiliate-dashboard' },
    { href: '/admin/affiliate/agent-dashboard', label: '판매원 대시보드', icon: '🧑‍💼', section: 'affiliate-dashboard' },
    { href: '/admin/affiliate/test-simulation', label: '구매 시뮬레이션', icon: '🧪', section: 'affiliate-dashboard' },
    // 마케팅
    { href: '/admin/pages', label: '페이지 콘텐츠 관리', icon: '📝', section: 'marketing' },
    { href: '/admin/landing-pages', label: '랜딩페이지 관리', icon: '📄', section: 'marketing' },
    { href: '/admin/payapp-sales', label: '랜딩페이지 매출관리', icon: '💰', section: 'marketing' },
    { href: '/admin/cruisedot-news', label: '크루즈뉴스 관리', icon: '📰', section: 'marketing' },
    { href: '/admin/marketing/dashboard', label: '마케팅 대시보드', icon: '📊', section: 'marketing' },
    { href: '/admin/funnel', label: '퍼널 메시지 관리', icon: '🔄', section: 'marketing' },
    { href: '/admin/marketing/customers', label: '고객 관리 (99K)', icon: '👥', section: 'marketing' },
    // 시스템 설정
    { href: '/admin/system/status', label: '시스템 상태', icon: '🛡️', section: 'system' },
    { href: '/admin/system/google-drive', label: 'Google Drive 설정', icon: '☁️', section: 'system' },
    { href: '/admin/test-dashboard', label: '백업/명세서/문서동기화', icon: '🔧', section: 'system' },
    { href: '/admin/seo', label: 'SEO 관리', icon: '🔍', section: 'system' },
    { href: '/admin/settings', label: '관리자 정보', icon: '⚙️', section: 'system' },
    { href: '/admin/chat-bot', label: '크루즈닷AI 채팅봇', icon: '🤖' },
    { href: '/admin/community', label: '커뮤니티 관리', icon: '💬' },
  ];

  const sectionConfigs = [
    { key: 'general', label: '기본 메뉴', icon: '📂' },
    { key: 'marketing', label: '마케팅 자동화', icon: '🚀' },
    { key: 'mall', label: '메인몰', icon: '🛍️' },
    { key: 'affiliate-team', label: '어필리에이트 - 인력/계약', icon: '🧑‍🤝‍🧑' },
    { key: 'affiliate-sales', label: '어필리에이트 - 판매/정산', icon: '💰' },
    { key: 'affiliate-customer', label: '어필리에이트 - 고객/B2B', icon: '👥' },
    { key: 'affiliate-dashboard', label: '어필리에이트 - 대시보드', icon: '📈' },
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-slate-900 mx-auto"></div>
          <p className="mt-4 text-sm text-slate-600">관리자 패널 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 shadow-lg shadow-slate-900/20">
        <div className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10">
              <span className="text-xl">⚓</span>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-medium">Admin Panel</p>
              <h1 className="text-lg font-bold text-white tracking-tight">크루즈 가이드</h1>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {/* 알림 종 (오른쪽 상단) */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
              <NotificationBell />
            </div>
            <span className="text-xs font-semibold text-slate-300 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">관리자</span>
            <button
              onClick={handleLogout}
              className="bg-white hover:bg-slate-100 text-slate-900 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="w-64 bg-white shadow-lg shadow-slate-900/5 border-r border-slate-200 min-h-screen">
          <nav className="p-4">
            <ul className="space-y-2">
              {sectionConfigs.map(({ key, label, icon }) => {
                const items = groupedMenu[key] ?? [];
                if (!items.length) return null;

                return (
                  <li key={key} className="rounded-xl border border-slate-100 bg-white shadow-sm">
                    <button
                      onClick={() => toggleSection(key)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${sectionExpanded[key]
                        ? 'bg-slate-900 text-white shadow-lg'
                        : 'text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{icon}</span>
                        <span className="font-semibold text-sm">{label}</span>
                      </div>
                      <span className="text-sm">{sectionExpanded[key] ? '▼' : '▶'}</span>
                    </button>
                    {sectionExpanded[key] && (
                      <ul className="space-y-1 px-2 py-2">
                        {items.map((item) => (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              prefetch={true}
                              target={(item as any).external ? '_blank' : undefined}
                              rel={(item as any).external ? 'noopener noreferrer' : undefined}
                              className={`flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${pathname === item.href
                                ? 'bg-slate-100 text-slate-900'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                            >
                              <span className="text-base">{item.icon}</span>
                              <span>{item.label}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}

              <li className="rounded-xl border border-slate-100 bg-white shadow-sm">
                <button
                  onClick={() => setShowCompressorModal(true)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 text-slate-700 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🗜️</span>
                    <span className="font-semibold text-sm">만능 압축기</span>
                  </div>
                </button>
              </li>

              <li className="rounded-xl border border-slate-100 bg-white shadow-sm">
                <button
                  onClick={() => setCustomerGroupExpanded(!customerGroupExpanded)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${customerGroupExpanded
                    ? 'bg-slate-800 text-white shadow-lg'
                    : 'text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">👥</span>
                    <span className="font-semibold text-sm">고객</span>
                  </div>
                  <span className="text-sm">{customerGroupExpanded ? '▼' : '▶'}</span>
                </button>
                {customerGroupExpanded && (
                  <ul className="space-y-1 px-2 py-2">
                    {customerMenuItems.map((item) => {
                      // customerGroup 쿼리 파라미터 확인
                      const isActive = item.href.includes('customerGroup=')
                        ? pathname === '/admin/customers' && searchParams?.get('customerGroup') === item.href.split('customerGroup=')[1]?.split('&')[0]
                        : pathname === item.href || (item.href === '/admin/customers' && pathname === '/admin/customers' && !searchParams?.get('customerGroup'));

                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            prefetch={true}
                            className={`flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${isActive
                              ? 'bg-slate-100 text-slate-900'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                              }`}
                          >
                            <span className="text-base">{item.icon}</span>
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
      <CompressorModal
        isOpen={showCompressorModal}
        onClose={() => setShowCompressorModal(false)}
      />
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-slate-900 mx-auto"></div>
          <p className="mt-4 text-sm text-slate-600">로딩 중...</p>
        </div>
      </div>
    }>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </Suspense>
  );
}