'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FiLink,
  FiShoppingCart,
  FiDollarSign,
  FiUser,
  FiFileText,
  FiUsers,
  FiRefreshCw,
  FiCheckCircle,
  FiClock,
  FiArrowRight,
  FiCopy,
  FiTrendingUp,
  FiShare2,
} from 'react-icons/fi';
import { showError, showSuccess } from '@/components/ui/Toast';

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

interface CustomerSummary {
  totalSaleAmount: number;
  totalCommission: number;
  purchaseCount: number;
  trialCount: number;
}

interface PurchasedCustomer {
  leadId: number;
  maskedName: string | null;
  customerType: 'PURCHASE' | 'TRIAL_ACTIVE' | 'TRIAL_ENDED';
  productName: string | null;
  cabinType: string | null;
  paymentMethod: string | null;
  hasPassport: boolean;
  purchaseDate: string | null;
  commissionAmount: number;
}

export default function SalesAgentDashboard({ user, profile, trialInfo }: PartnerDashboardProps) {
  const router = useRouter();
  const partnerId = user.mallUserId;
  const partnerBase = `/partner/${partnerId}`;

  const isBranchManager = profile.type === 'BRANCH_MANAGER';
  const displayName =
    profile.displayName || profile.nickname || user.mallNickname || user.name || '파트너';

  const [summary, setSummary] = useState<CustomerSummary | null>(null);
  const [customers, setCustomers] = useState<PurchasedCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [affiliateLink, setAffiliateLink] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [shopUrl, setShopUrl] = useState<string>('');
  const [shopCopied, setShopCopied] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [customersRes, linksRes] = await Promise.all([
        fetch('/api/partner/my-customers?limit=5'),
        fetch('/api/partner/links?status=ACTIVE'),
      ]);

      if (customersRes.ok) {
        const data = await customersRes.json();
        if (data.ok) {
          setSummary(data.summary);
          setCustomers(
            (data.customers as PurchasedCustomer[])
              .filter((c) => c.customerType === 'PURCHASE')
              .slice(0, 5),
          );
        }
      }

      if (linksRes.ok) {
        const data = await linksRes.json();
        if (data.ok && Array.isArray(data.links) && data.links.length > 0) {
          const link = data.links.find((l: any) => l.productCode) ?? data.links[0];
          if (link) {
            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            const code = profile.affiliateCode ?? '';
            const productPart = link.productCode ? `&p=${link.productCode}` : '';
            // SALES_AGENT → ?agent=CODE, BRANCH_MANAGER → ?affiliate=CODE
            const paramName = profile.type === 'SALES_AGENT' ? 'agent' : 'affiliate';
            setAffiliateLink(`${origin}/?${paramName}=${code}${productPart}`);
          }
        }
      }
    } catch {
      showError('데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [profile.affiliateCode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 판매몰 URL은 window.location.origin이 확정된 후 설정
  useEffect(() => {
    if (user.mallUserId) {
      setShopUrl(`${window.location.origin}/${user.mallUserId}/shop`);
    }
  }, [user.mallUserId]);

  const copyShopUrl = () => {
    if (!shopUrl) return;
    navigator.clipboard.writeText(shopUrl).then(() => {
      setShopCopied(true);
      showSuccess('판매몰 링크가 복사되었습니다!');
      setTimeout(() => setShopCopied(false), 2000);
    }).catch(() => showError('복사에 실패했습니다.'));
  };

  const copyLink = () => {
    if (!affiliateLink) return;
    navigator.clipboard.writeText(affiliateLink).then(() => {
      setCopied(true);
      showSuccess('링크가 복사되었습니다.');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const formatWon = (amount: number) =>
    amount >= 10000
      ? `${(amount / 10000).toFixed(amount % 10000 === 0 ? 0 : 1)}만원`
      : `${amount.toLocaleString('ko-KR')}원`;

  // ── 메뉴 정의 ────────────────────────────────────────────────────────────────
  type MenuItem = {
    icon: React.ReactNode;
    label: string;
    sublabel: string;
    href: string;
    colorClass: string;
  };

  const menuItems: MenuItem[] = [
    {
      icon: <FiLink className="text-xl" />,
      label: '구매링크',
      sublabel: '어필리에이트 링크 관리',
      href: `${partnerBase}/links`,
      colorClass: 'bg-slate-900 text-white hover:bg-slate-700',
    },
    {
      icon: <FiShoppingCart className="text-xl" />,
      label: '구매고객 관리',
      sublabel: '확정 고객 목록·여권 현황',
      href: `${partnerBase}/purchased-customers`,
      colorClass: 'bg-blue-600 text-white hover:bg-blue-700',
    },
    {
      icon: <FiDollarSign className="text-xl" />,
      label: '결제 / 정산',
      sublabel: '수당 내역 조회',
      href: `${partnerBase}/payment`,
      colorClass: 'bg-emerald-600 text-white hover:bg-emerald-700',
    },
    {
      icon: <FiUser className="text-xl" />,
      label: '프로필 설정',
      sublabel: '3.3% 서류 · 계정 관리',
      href: `${partnerBase}/profile`,
      colorClass: 'bg-white text-slate-800 hover:bg-slate-50 border border-slate-200',
    },
    {
      icon: <FiFileText className="text-xl" />,
      label: '나의 계약서',
      sublabel: '3.3% 프리랜서 계약 확인',
      href: `${partnerBase}/contract`,
      colorClass: 'bg-white text-slate-800 hover:bg-slate-50 border border-slate-200',
    },
    ...(isBranchManager
      ? ([
          {
            icon: <FiUsers className="text-xl" />,
            label: '팀 관리',
            sublabel: '판매원 현황 · 명세서',
            href: `${partnerBase}/team`,
            colorClass: 'bg-indigo-600 text-white hover:bg-indigo-700',
          },
          {
            icon: <FiTrendingUp className="text-xl" />,
            label: '팀원 명세서',
            sublabel: '팀 수당 정산 현황',
            href: `${partnerBase}/team-statements`,
            colorClass: 'bg-teal-600 text-white hover:bg-teal-700',
          },
        ] as MenuItem[])
      : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── 헤더 ──────────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-white">
        <div className="mx-auto max-w-lg px-4 pt-10 pb-8">
          <div className="flex items-start justify-between">
            <div>
              <span className="inline-block rounded-full bg-white/10 px-3 py-0.5 text-xs font-medium text-slate-300 mb-2">
                {isBranchManager ? '대리점장' : '판매원'}
              </span>
              <h1 className="text-2xl font-bold tracking-tight">{displayName} 님</h1>
              {profile.affiliateCode && (
                <p className="mt-1 text-xs text-slate-400">코드: {profile.affiliateCode}</p>
              )}
            </div>
            <button
              onClick={loadData}
              className="mt-1 rounded-xl bg-white/10 p-2.5 hover:bg-white/20 transition-colors"
              aria-label="새로고침"
            >
              <FiRefreshCw className={`text-lg ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* 핵심 지표 */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            {loading ? (
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/10" />
                ))}
              </>
            ) : summary ? (
              <>
                <div className="rounded-2xl bg-white/10 p-4 text-center backdrop-blur-sm">
                  <p className="text-2xl font-bold">{summary.purchaseCount}</p>
                  <p className="mt-1 text-xs text-slate-400">구매고객</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4 text-center backdrop-blur-sm">
                  <p className="text-lg font-bold">{formatWon(summary.totalSaleAmount)}</p>
                  <p className="mt-1 text-xs text-slate-400">총 판매금액</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4 text-center backdrop-blur-sm">
                  <p className="text-lg font-bold text-emerald-300">
                    {formatWon(summary.totalCommission)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">확정 수당</p>
                </div>
              </>
            ) : (
              <div className="col-span-3 rounded-2xl bg-white/5 py-6 text-center text-sm text-slate-400">
                정보를 불러올 수 없습니다
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 본문 ──────────────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-lg space-y-5 px-4 py-6">
        {/* 체험 안내 배너 */}
        {trialInfo && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-800">
              체험 기간{' '}
              {trialInfo.daysRemaining !== null ? `— ${trialInfo.daysRemaining}일 남음` : ''}
            </p>
            {trialInfo.trialEndDate && (
              <p className="mt-0.5 text-xs text-amber-600">
                만료: {new Date(trialInfo.trialEndDate).toLocaleDateString('ko-KR')}
              </p>
            )}
          </div>
        )}

        {/* ── 고객 공유 링크 (최우선 CTA) ─────────────────────────────────────── */}
        <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 p-5 shadow-lg shadow-blue-500/20">
          <div className="flex items-center gap-2 mb-1">
            <FiShare2 className="text-white text-lg" />
            <p className="text-sm font-bold text-white">고객에게 공유할 내 판매몰</p>
          </div>
          <p className="text-xs text-blue-100 mb-4">
            이 링크 하나로 어떤 상품이든 구매 시 자동으로 내 실적에 연결됩니다
          </p>
          {shopUrl ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 rounded-xl bg-white/15 px-3 py-2.5 backdrop-blur-sm">
                <p className="truncate text-xs font-semibold text-white font-mono">{shopUrl}</p>
              </div>
              <button
                onClick={copyShopUrl}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition-all active:scale-95 ${
                  shopCopied
                    ? 'bg-emerald-400 text-white'
                    : 'bg-white text-blue-700 hover:bg-blue-50'
                }`}
              >
                <FiCopy className="text-sm" />
                {shopCopied ? '복사됨!' : '복사'}
              </button>
            </div>
          ) : (
            <div className="h-10 animate-pulse rounded-xl bg-white/15" />
          )}
          <p className="mt-3 text-xs text-blue-200">
            카카오톡·문자·SNS로 바로 공유하세요 &mdash;{' '}
            <Link href={`${partnerBase}/links`} className="underline underline-offset-2 text-white font-semibold">
              상품별 개별 링크는 링크 관리에서
            </Link>
          </p>
        </div>

        {/* 빠른 메뉴 */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-500 px-1">메뉴</h2>
          <div className="grid grid-cols-2 gap-3">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col gap-3 rounded-2xl p-5 shadow-sm transition-all ${item.colorClass}`}
              >
                {item.icon}
                <div>
                  <p className="font-bold text-sm leading-snug">{item.label}</p>
                  <p className="mt-0.5 text-xs opacity-60 leading-snug">{item.sublabel}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 최근 구매고객 */}
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">최근 구매고객</h2>
            <Link
              href={`${partnerBase}/purchased-customers`}
              className="flex items-center gap-1 text-xs font-semibold text-blue-600"
            >
              전체보기 <FiArrowRight />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : customers.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-400">구매 확정된 고객이 없습니다</p>
              <Link
                href={`${partnerBase}/links`}
                className="mt-2 inline-block text-xs text-blue-600 underline"
              >
                구매링크 공유하러 가기
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {customers.map((customer) => (
                <div
                  key={customer.leadId}
                  className="flex items-center justify-between rounded-xl border border-slate-100 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
                      <FiShoppingCart className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {customer.maskedName ?? '고객'} 님
                      </p>
                      <p className="text-xs text-slate-500 truncate max-w-[120px]">
                        {customer.productName ?? '-'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-emerald-600">
                      {customer.commissionAmount > 0
                        ? formatWon(customer.commissionAmount)
                        : '-'}
                    </p>
                    <span
                      className={`mt-0.5 inline-flex items-center gap-0.5 text-xs ${
                        customer.hasPassport ? 'text-emerald-500' : 'text-amber-500'
                      }`}
                    >
                      {customer.hasPassport ? (
                        <>
                          <FiCheckCircle /> 여권완료
                        </>
                      ) : (
                        <>
                          <FiClock /> 여권대기
                        </>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
