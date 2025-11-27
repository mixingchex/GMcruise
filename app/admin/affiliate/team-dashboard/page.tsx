'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  FiChevronDown,
  FiChevronRight,
  FiDollarSign,
  FiRefreshCw,
  FiSearch,
  FiTrendingUp,
  FiUsers,
  FiPhone,
  FiArrowRight,
  FiMessageSquare,
  FiX,
  FiSend,
  FiTrash2,
} from 'react-icons/fi';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { showError } from '@/components/ui/Toast';

dayjs.extend(relativeTime);

type ManagerMetric = {
  manager: {
    id: number;
    affiliateCode: string;
    displayName: string | null;
    nickname: string | null;
    branchLabel: string | null;
    contactPhone: string | null;
    status: string;
  };
  agentCount: number;
  leads: {
    total: number;
    byStatus: Record<string, number>;
  };
  sales: {
    count: number;
    saleAmount: number;
    netRevenue: number | null;
    branchCommission: number | null;
    overrideCommission: number | null;
    salesCommission: number | null;
  };
  ledger: {
    branchSettled: number;
    branchPending: number;
    overrideSettled: number;
    overridePending: number;
    withholding: number;
    withholdingAdjustments: number;
    withholdingSettled: number;
    withholdingPending: number;
    branchWithholding: number;
    overrideWithholding: number;
    totalWithholding: number;
    grossCommission: number;
    netCommission: number;
  };
  agents: AgentMetric[];
  monthlyTrend: {
    month: string;
    saleCount: number;
    saleAmount: number;
    branchCommission: number;
    overrideCommission: number;
    salesCommission: number;
  }[];
};

type AgentMetric = {
  agent: {
    id: number;
    affiliateCode: string;
    displayName: string | null;
    nickname: string | null;
    contactPhone: string | null;
    status: string;
  } | null;
  relation: {
    status: string;
    connectedAt: string | null;
  };
  leads: {
    total: number;
    byStatus: Record<string, number>;
  };
  sales: {
    count: number;
    saleAmount: number;
    netRevenue: number | null;
    salesCommission: number | null;
    overrideCommission: number | null;
    branchContribution: number | null;
  };
  ledger: {
    settled: number;
    pending: number;
    withholding: number;
    withholdingAdjustments: number;
    withholdingSettled: number;
    withholdingPending: number;
    salesWithholding: number;
    overrideWithholding: number;
    totalWithholding: number;
    grossCommission: number;
    netCommission: number;
  };
};

type DashboardResponse = {
  ok: boolean;
  message?: string;
  managers: ManagerMetric[];
  totals: {
    managerCount: number;
    agentCount: number;
    totalSalesCount: number;
    totalSalesAmount: number;
    totalNetRevenue: number;
    totalBranchCommission: number;
    totalOverrideCommission: number;
    totalSalesCommission: number;
    totalLeads: number;
    totalWithholding: number;
    totalNetCommission: number;
    hq?: {
      grossRevenue: number;
      cardFees: number;
      corporateTax: number;
      netAfterFees: number;
    };
  } | null;
  filters: {
    from?: string;
    to?: string;
    search?: string;
  };
};

type Filters = {
  search: string;
  from: string;
  to: string;
};

const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: '신규',
  CONTACTED: '연락완료',
  IN_PROGRESS: '진행중',
  PURCHASED: '구매완료',
  REFUNDED: '환불',
  CLOSED: '종료',
  TEST_GUIDE: '테스트',
};

const affiliateStatusLabel: Record<string, string> = {
  DRAFT: '작성중',
  AWAITING_APPROVAL: '승인 대기',
  ACTIVE: '활성',
  SUSPENDED: '중지',
  TERMINATED: '종료',
};

const relationStatusLabel: Record<string, string> = {
  ACTIVE: '활성',
  PAUSED: '일시중지',
  TERMINATED: '종료',
};

function formatCurrency(value: number | null | undefined) {
  if (!value) return '₩0';
  return `₩${value.toLocaleString('ko-KR')}`;
}

export default function AffiliateTeamDashboardPage() {
  const [filters, setFilters] = useState<Filters>({ search: '', from: '', to: '' });
  const [metrics, setMetrics] = useState<ManagerMetric[]>([]);
  const [totals, setTotals] = useState<DashboardResponse['totals']>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [phoneInquiries, setPhoneInquiries] = useState<Array<{
    id: number;
    customerName: string | null;
    customerPhone: string | null;
    productCode: string | null;
    productName: string | null;
    createdAt: string;
    status: string;
    mallUserId: string | null;
    managerId: number | null;
  }>>([]);
  const [teamMessages, setTeamMessages] = useState<Array<{
    id: number;
    title: string;
    content: string;
    createdAt: string;
    admin?: { id: number; name: string | null };
    sender?: { id: number; name: string | null };
    recipient?: { id: number; name: string | null };
    messageType?: string;
    isRead: boolean;
    isSent?: boolean;
  }>>([]);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [showSendMessageModal, setShowSendMessageModal] = useState(false);
  const [messageTitle, setMessageTitle] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<number | null>(null);
  const [recipients, setRecipients] = useState<Array<{id: number; name: string | null; phone: string | null; role: string}>>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageTab, setMessageTab] = useState<'received' | 'sent'>('received');
  const [sentMessages, setSentMessages] = useState<Array<{
    id: number;
    title: string;
    content: string;
    createdAt: string;
    recipient: { id: number; name: string | null } | null;
    isRead: boolean;
  }>>([]);

  useEffect(() => {
    loadMetrics();
    loadPhoneInquiries();
    loadTeamMessages();
    // 5분마다 메시지 갱신
    const interval = setInterval(() => {
      loadTeamMessages();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMetrics = async (overrideFilters?: Partial<Filters>) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      const effectiveFilters = { ...filters, ...(overrideFilters || {}) };
      if (effectiveFilters.search.trim()) params.set('search', effectiveFilters.search.trim());
      if (effectiveFilters.from) params.set('from', effectiveFilters.from);
      if (effectiveFilters.to) params.set('to', effectiveFilters.to);

      const res = await fetch(`/api/admin/affiliate/teams/metrics?${params.toString()}`);
      const json: DashboardResponse = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.message || '팀 성과 데이터를 불러오지 못했습니다.');
      }
      setMetrics(json.managers || []);
      setTotals(json.totals || null);
      setFilters((prev) => ({
        ...prev,
        search: json.filters.search ?? '',
        from: json.filters.from ?? '',
        to: json.filters.to ?? '',
      }));
    } catch (error: any) {
      console.error('[AffiliateTeamDashboard] load error', error);
      showError(error.message || '팀 성과 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await loadMetrics();
  };

  const handleReset = async () => {
    setFilters({ search: '', from: '', to: '' });
    await loadMetrics({ search: '', from: '', to: '' });
  };

  const toggleManager = (id: number) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const loadPhoneInquiries = async () => {
    try {
      const res = await fetch('/api/admin/affiliate/leads?limit=20');
      const json = await res.json();
      if (res.ok && json?.ok && json.leads) {
        // source가 'mall-'로 시작하거나 'product-inquiry'인 것만 필터링
        const filtered = json.leads
          .filter((lead: any) => lead.source?.startsWith('mall-') || lead.source === 'product-inquiry')
          .map((lead: any) => ({
            id: lead.id,
            customerName: lead.customerName,
            customerPhone: lead.customerPhone,
            productCode: lead.metadata?.productCode || lead.metadata?.product_code || null,
            productName: lead.metadata?.productName || lead.metadata?.product_name || null,
            createdAt: lead.createdAt,
            status: lead.status,
            mallUserId: lead.metadata?.mallUserId || lead.metadata?.affiliateMallUserId || null,
            managerId: lead.managerId,
          }));
        setPhoneInquiries(filtered);
      }
    } catch (error) {
      console.error('[TeamDashboard] Failed to load phone inquiries:', error);
    }
  };

  const loadTeamMessages = async (showAll: boolean = false) => {
    try {
      const url = showAll 
        ? '/api/admin/affiliate/my-messages' 
        : '/api/admin/affiliate/my-messages?unreadOnly=true';
      const res = await fetch(url, {
        credentials: 'include',
      });
      const json = await res.json();
      if (res.ok && json?.ok) {
        // 받은 메시지와 보낸 메시지 분리
        const received = (json.messages || []).filter((m: any) => !m.isSent);
        const sent = (json.messages || []).filter((m: any) => m.isSent);
        setTeamMessages(received);
        setSentMessages(sent);
        setUnreadMessageCount(json.unreadCount || 0);
      } else {
        console.error('[TeamDashboard] Failed to load team messages:', json.error);
      }
    } catch (error) {
      console.error('[TeamDashboard] Failed to load team messages:', error);
    }
  };

  const loadRecipients = async () => {
    setLoadingRecipients(true);
    try {
      const res = await fetch('/api/admin/affiliate/messages/recipients', {
        credentials: 'include',
      });
      const json = await res.json();
      if (res.ok && json?.ok) {
        setRecipients(json.recipients || []);
      }
    } catch (error) {
      console.error('[TeamDashboard] Failed to load recipients:', error);
    } finally {
      setLoadingRecipients(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageTitle.trim() || !messageContent.trim() || !selectedRecipient) {
      return;
    }

    setSendingMessage(true);
    try {
      const res = await fetch('/api/admin/affiliate/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          recipientUserId: selectedRecipient,
          title: messageTitle,
          content: messageContent,
        }),
      });

      const json = await res.json();
      if (res.ok && json?.ok) {
        setShowSendMessageModal(false);
        setMessageTitle('');
        setMessageContent('');
        setSelectedRecipient(null);
        loadTeamMessages(true);
      } else {
        showError(json.error || '메시지 전송에 실패했습니다.');
      }
    } catch (error) {
      console.error('[TeamDashboard] Failed to send message:', error);
      showError('메시지 전송 중 오류가 발생했습니다.');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    if (!confirm('이 메시지를 삭제하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/admin/affiliate/messages/${messageId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const json = await res.json();
      if (res.ok && json?.ok) {
        loadTeamMessages(true);
      } else {
        showError(json.error || '메시지 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('[TeamDashboard] Failed to delete message:', error);
      showError('메시지 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleMarkAsRead = async (messageId: number) => {
    try {
      const res = await fetch('/api/admin/affiliate/my-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messageId }),
      });
      if (res.ok) {
        // 읽음 처리 후 전체 메시지 다시 로드 (읽음 상태 반영)
        loadTeamMessages(true);
      } else {
        const json = await res.json();
        console.error('Failed to mark as read:', json.error);
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const overviewCards = useMemo(() => {
    if (!totals) return [];
    const cards = [
      {
        title: '활성 대리점장',
        value: `${totals.managerCount.toLocaleString('ko-KR')}명`,
        icon: <FiUsers className="text-2xl" />,
        description: '대리점장 어필리에이트 프로필 수',
      },
      {
        title: '팀 판매 건수',
        value: `${totals.totalSalesCount.toLocaleString('ko-KR')}건`,
        icon: <FiTrendingUp className="text-2xl" />,
        description: '승인/지급 대기 중인 판매 건수',
      },
      {
        title: '판매 총액',
        value: formatCurrency(totals.totalSalesAmount),
        icon: <FiDollarSign className="text-2xl" />,
        description: '해당 기간 내 팀 전체 판매 금액 합계',
      },
      {
        title: '세전 커미션 합계',
        value: formatCurrency((totals.totalBranchCommission ?? 0) + (totals.totalOverrideCommission ?? 0)),
        icon: <FiDollarSign className="text-2xl" />,
        description: '브랜치 + 오버라이드 커미션 총액',
      },
    ];

    cards.push({
      title: '원천징수 예정',
      value: `- ${formatCurrency(totals.totalWithholding)}`,
      icon: <FiDollarSign className="text-2xl" />,
      description: '브랜치/오버라이드 원천징수 합계',
    });

    cards.push({
      title: '세후 지급 예상',
      value: formatCurrency(totals.totalNetCommission),
      icon: <FiTrendingUp className="text-2xl" />,
      description: '대리점장 예상 입금액 (세후)',
    });

    if (totals.hq) {
      cards.push({
        title: '본사 순이익 (세후)',
        value: formatCurrency(totals.hq.netAfterFees),
        icon: <FiDollarSign className="text-2xl" />,
        description: `법인세 ${formatCurrency(totals.hq.corporateTax)}·카드 수수료 ${formatCurrency(totals.hq.cardFees)} 반영`,
      });
    }

    return cards;
  }, [totals]);

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">어필리에이트 팀 성과 대시보드</h1>
          <p className="mt-1 text-sm text-slate-600">대리점장별 판매/리드/커미션 현황과 판매원 실적을 한눈에 확인할 수 있습니다.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* 팀 대시보드 메시지 빠른 메뉴 */}
          <button
            type="button"
            onClick={() => {
              setShowMessagesModal(true);
              loadTeamMessages(true); // 모달 열 때는 전체 메시지 로드
            }}
            className="relative flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-100"
          >
            <FiMessageSquare className="w-4 h-4" />
            팀 메시지
            {unreadMessageCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => loadMetrics()}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            disabled={loading}
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} /> 새로고침
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-3xl bg-white/90 p-6 shadow-sm backdrop-blur">
        <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr_auto]">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">검색</span>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-blue-500">
              <FiSearch className="text-slate-400" />
              <input
                type="text"
                placeholder="지점명, 코드, 연락처 검색"
                value={filters.search}
                onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                className="flex-1 border-none bg-transparent text-sm text-slate-700 outline-none"
              />
            </div>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">시작일</span>
            <input
              type="date"
              value={filters.from}
              onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))}
              className="rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">종료일</span>
            <input
              type="date"
              value={filters.to}
              onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))}
              className="rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
            />
          </label>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="w-full rounded-2xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
              disabled={loading}
            >
              적용
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              disabled={loading}
            >
              초기화
            </button>
          </div>
        </div>
      </form>

      {totals && overviewCards.length > 0 && (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {overviewCards.map((card) => (
            <article
              key={card.title}
              className="flex h-full flex-col justify-between rounded-3xl bg-gradient-to-br from-indigo-500/90 to-blue-500/80 p-6 text-white shadow-lg"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-white/80">{card.title}</h3>
                  <p className="mt-2 text-2xl font-bold">{card.value}</p>
                </div>
                <div className="rounded-2xl bg-white/15 p-3 text-white">{card.icon}</div>
              </div>
              <p className="mt-4 text-xs text-white/70">{card.description}</p>
            </article>
          ))}
        </section>
      )}

      <section className="space-y-6">
        {loading && metrics.length === 0 ? (
          <div className="rounded-3xl bg-white/80 p-10 text-center text-slate-500 shadow-sm">데이터를 불러오는 중입니다...</div>
        ) : metrics.length === 0 ? (
          <div className="rounded-3xl bg-white/80 p-10 text-center text-slate-500 shadow-sm">
            조건에 맞는 대리점장 데이터가 없습니다. 필터를 조정해 주세요.
          </div>
        ) : (
          metrics.map((item) => {
            const managerName = item.manager.displayName || item.manager.nickname || `대리점장 #${item.manager.id}`;
            const branchLabel = item.manager.branchLabel ? `(${item.manager.branchLabel})` : '';
            const managerStatus = affiliateStatusLabel[item.manager.status] || item.manager.status;
            return (
              <article key={item.manager.id} className="rounded-3xl bg-white/90 p-6 shadow-sm">
                <header className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      {managerName} {branchLabel && <span className="text-sm text-slate-500">{branchLabel}</span>}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">코드 {item.manager.affiliateCode}</span>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-600">{managerStatus}</span>
                      <span className="rounded-full bg-red-50 px-3 py-1 font-semibold text-red-600">본사 직속</span>
                      {item.manager.contactPhone && <span>{item.manager.contactPhone}</span>}
                      <span className="text-slate-400">판매원 {item.agentCount.toLocaleString('ko-KR')}명</span>
                      <span className="text-slate-400">리드 {item.leads.total.toLocaleString('ko-KR')}건</span>
                      <span className="text-slate-400">판매 {item.sales.count.toLocaleString('ko-KR')}건</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleManager(item.manager.id)}
                    className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    {expanded[item.manager.id] ? <FiChevronDown /> : <FiChevronRight />} 팀 상세 보기
                  </button>
                </header>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase">리드 현황</p>
                    <p className="mt-2 text-xl font-bold text-slate-900">{item.leads.total.toLocaleString('ko-KR')}건</p>
                    <div className="mt-4 space-y-2 text-xs text-slate-600">
                      {Object.entries(item.leads.byStatus).map(([status, count]) => (
                        <div key={status} className="flex justify-between">
                          <span>{LEAD_STATUS_LABELS[status] || status}</span>
                          <span className="font-semibold">{count.toLocaleString('ko-KR')}건</span>
                        </div>
                      ))}
                      {Object.keys(item.leads.byStatus).length === 0 && <p className="text-slate-400">집계된 리드가 없습니다.</p>}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase">판매 요약</p>
                    <p className="mt-2 text-xl font-bold text-slate-900">{item.sales.count.toLocaleString('ko-KR')}건</p>
                    <div className="mt-4 space-y-2 text-xs text-slate-600">
                      <div className="flex justify-between"><span>판매 금액</span><span className="font-semibold">{formatCurrency(item.sales.saleAmount)}</span></div>
                      <div className="flex justify-between"><span>순이익</span><span className="font-semibold">{formatCurrency(item.sales.netRevenue)}</span></div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase">커미션 예정</p>
                    <div className="mt-4 space-y-2 text-xs text-slate-600">
                      <div className="flex justify-between"><span>브랜치</span><span className="font-semibold">{formatCurrency(item.sales.branchCommission)}</span></div>
                      <div className="flex justify-between"><span>오버라이드</span><span className="font-semibold">{formatCurrency(item.sales.overrideCommission)}</span></div>
                      <div className="flex justify-between"><span>판매원 수당</span><span className="font-semibold">{formatCurrency(item.sales.salesCommission)}</span></div>
                      <div className="flex justify-between text-red-500"><span>원천징수</span><span className="font-semibold">- {formatCurrency(item.ledger.totalWithholding)}</span></div>
                      <div className="mt-2 border-t border-slate-200 pt-2 text-emerald-600">
                        <div className="flex justify-between font-semibold">
                          <span>세후 예상지급</span>
                          <span>{formatCurrency(item.ledger.netCommission)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase">정산 현황</p>
                    <div className="mt-4 space-y-2 text-xs text-slate-600">
                      <div className="flex justify-between"><span>브랜치 (지급완료)</span><span className="font-semibold">{formatCurrency(item.ledger.branchSettled)}</span></div>
                      <div className="flex justify-between"><span>브랜치 (지급대기)</span><span className="font-semibold">{formatCurrency(item.ledger.branchPending)}</span></div>
                      <div className="flex justify-between"><span>오버라이드 (지급완료)</span><span className="font-semibold">{formatCurrency(item.ledger.overrideSettled)}</span></div>
                      <div className="flex justify-between"><span>오버라이드 (지급대기)</span><span className="font-semibold">{formatCurrency(item.ledger.overridePending)}</span></div>
                      <div className="flex justify-between"><span>원천징수 조정</span><span className="font-semibold">{formatCurrency(item.ledger.withholdingAdjustments)}</span></div>
                      <div className="flex justify-between"><span>원천징수 (지급완료)</span><span className="font-semibold">{formatCurrency(item.ledger.withholdingSettled)}</span></div>
                      <div className="flex justify-between"><span>원천징수 (지급대기)</span><span className="font-semibold">{formatCurrency(item.ledger.withholdingPending)}</span></div>
                    </div>
                  </div>
                </div>

                {expanded[item.manager.id] && (
                  <div className="mt-6 space-y-4">
                    <div className="rounded-2xl border border-slate-100 bg-white p-4">
                      <h3 className="text-lg font-semibold text-slate-900">팀 판매원 현황</h3>
                      <div className="mt-4 overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-4 py-3 text-left font-semibold text-slate-600">판매원</th>
                              <th className="px-4 py-3 text-left font-semibold text-slate-600">연결 상태</th>
                              <th className="px-4 py-3 text-left font-semibold text-slate-600">리드</th>
                              <th className="px-4 py-3 text-left font-semibold text-slate-600">판매</th>
                              <th className="px-4 py-3 text-left font-semibold text-slate-600">판매금액</th>
                              <th className="px-4 py-3 text-left font-semibold text-slate-600">판매원 수당</th>
                              <th className="px-4 py-3 text-left font-semibold text-slate-600">오버라이드</th>
                              <th className="px-4 py-3 text-left font-semibold text-slate-600">정산(지급완료/대기)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {item.agents.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-500">
                                  연결된 판매원이 없습니다.
                                </td>
                              </tr>
                            ) : (
                              item.agents.map((agentItem) => {
                                const agentName = agentItem.agent?.displayName || agentItem.agent?.nickname || `판매원 #${agentItem.agent?.id ?? 'N/A'}`;
                                const relationLabel = relationStatusLabel[agentItem.relation.status] || agentItem.relation.status;
                                const managerLabel = item.manager.displayName || item.manager.nickname || `대리점장 #${item.manager.id}`;
                                return (
                                  <tr key={`${agentItem.agent?.id ?? 'none'}-${agentItem.relation.connectedAt ?? 'rel'}`} className="hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                      <div className="font-semibold text-slate-900">{agentName}</div>
                                      <div className="text-xs text-slate-500">코드 {agentItem.agent?.affiliateCode ?? '-'}</div>
                                      {agentItem.agent?.contactPhone && <div className="text-xs text-slate-500">{agentItem.agent.contactPhone}</div>}
                                      <div className="text-[11px] text-slate-400">소속 대리점장: {managerLabel}</div>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-600">
                                      <div className="font-semibold text-slate-700">{relationLabel}</div>
                                      <div>{agentItem.relation.connectedAt ? dayjs(agentItem.relation.connectedAt).fromNow() : '-'}</div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700">
                                      <div className="font-semibold">{agentItem.leads.total.toLocaleString('ko-KR')}건</div>
                                      <div className="mt-1 flex flex-wrap gap-1 text-xs text-slate-500">
                                        {Object.entries(agentItem.leads.byStatus).map(([status, count]) => (
                                          <span key={status} className="rounded-full bg-slate-100 px-2 py-0.5">
                                            {LEAD_STATUS_LABELS[status] || status} {count}
                                          </span>
                                        ))}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-slate-700">{agentItem.sales.count.toLocaleString('ko-KR')}건</td>
                                    <td className="px-4 py-3 font-semibold text-slate-700">{formatCurrency(agentItem.sales.saleAmount)}</td>
                                    <td className="px-4 py-3 text-slate-700">{formatCurrency(agentItem.sales.salesCommission)}</td>
                                    <td className="px-4 py-3 text-slate-700">{formatCurrency(agentItem.sales.overrideCommission)}</td>
                                    <td className="px-4 py-3 text-xs text-slate-600">
                                      <div>완료 {formatCurrency(agentItem.ledger.settled)}</div>
                                      <div>대기 {formatCurrency(agentItem.ledger.pending)}</div>
                                      <div className="pt-1 text-[11px] text-slate-500">원천징수 {formatCurrency(agentItem.ledger.totalWithholding)}</div>
                                      <div className="text-[11px] text-slate-500">조정 {formatCurrency(agentItem.ledger.withholdingAdjustments)}</div>
                                      <div className="pt-1 text-[11px] font-semibold text-emerald-600">
                                        세후 {formatCurrency(agentItem.ledger.netCommission)}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-white p-4">
                      <h3 className="text-lg font-semibold text-slate-900">최근 6개월 추세</h3>
                      <div className="mt-3 overflow-x-auto">
                        <table className="min-w-full text-sm text-slate-600">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-4 py-2 text-left font-semibold">월</th>
                              <th className="px-4 py-2 text-right font-semibold">판매 건수</th>
                              <th className="px-4 py-2 text-right font-semibold">판매 금액</th>
                              <th className="px-4 py-2 text-right font-semibold">지점 수당</th>
                              <th className="px-4 py-2 text-right font-semibold">오버라이드</th>
                              <th className="px-4 py-2 text-right font-semibold">판매원 수당</th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.monthlyTrend.map((trend) => (
                              <tr key={`${item.manager.id}-${trend.month}`} className="odd:bg-white even:bg-slate-50">
                                <td className="px-4 py-2 font-semibold text-slate-700">{trend.month}</td>
                                <td className="px-4 py-2 text-right">{trend.saleCount.toLocaleString('ko-KR')}건</td>
                                <td className="px-4 py-2 text-right">{formatCurrency(trend.saleAmount)}</td>
                                <td className="px-4 py-2 text-right">{formatCurrency(trend.branchCommission)}</td>
                                <td className="px-4 py-2 text-right">{formatCurrency(trend.overrideCommission)}</td>
                                <td className="px-4 py-2 text-right">{formatCurrency(trend.salesCommission)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </section>

      {/* 팀 대시보드 메시지 모달 */}
      {showMessagesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowMessagesModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">메시지</h2>
                {messageTab === 'received' && unreadMessageCount > 0 && (
                  <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                    {unreadMessageCount}개 미읽음
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowSendMessageModal(true);
                    loadRecipients();
                  }}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-1"
                >
                  <FiSend className="w-4 h-4" />
                  보내기
                </button>
                <button
                  onClick={() => setShowMessagesModal(false)}
                  className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-100 rounded"
                >
                  <FiX className="text-xl" />
                </button>
              </div>
            </div>

            {/* 탭 */}
            <div className="flex gap-2 mb-4 border-b">
              <button
                onClick={() => setMessageTab('received')}
                className={`px-4 py-2 font-medium ${
                  messageTab === 'received'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                받은 메시지 ({teamMessages.length})
              </button>
              <button
                onClick={() => setMessageTab('sent')}
                className={`px-4 py-2 font-medium ${
                  messageTab === 'sent'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                보낸 메시지 ({sentMessages.length})
              </button>
            </div>

            {messageTab === 'received' ? (
              teamMessages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FiMessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>받은 메시지가 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {teamMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-4 rounded-lg border-2 ${
                        message.isRead 
                          ? 'bg-gray-50 border-gray-200' 
                          : 'bg-teal-50 border-teal-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {!message.isRead && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-800">
                                <FiUsers className="w-3 h-3 mr-1" />
                                팀 대시보드
                              </span>
                            )}
                            <h3 className="font-semibold text-gray-900">{message.title}</h3>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap mb-2">{message.content}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>발신: {(message.sender || message.admin)?.name || '알 수 없음'}</span>
                            {message.messageType && message.messageType !== 'team-dashboard' && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                                {message.messageType === 'agent-manager' ? '판매원→대리점장' :
                                 message.messageType === 'manager-agent' ? '대리점장→판매원' :
                                 message.messageType === 'manager-manager' ? '대리점장→대리점장' :
                                 message.messageType === 'agent-admin' ? '판매원→관리자' :
                                 message.messageType === 'manager-admin' ? '대리점장→관리자' : message.messageType}
                              </span>
                            )}
                            <span>
                              {new Date(message.createdAt).toLocaleString('ko-KR', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                        {!message.isRead && (
                          <button
                            onClick={() => handleMarkAsRead(message.id)}
                            className="ml-4 px-3 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 text-sm"
                          >
                            읽음 처리
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              sentMessages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FiMessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>보낸 메시지가 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sentMessages.map((message) => (
                    <div
                      key={message.id}
                      className="p-4 rounded-lg border-2 bg-blue-50 border-blue-200"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{message.title}</h3>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap mb-2">{message.content}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>수신: {message.recipient?.name || '알 수 없음'}</span>
                            <span>
                              {new Date(message.createdAt).toLocaleString('ko-KR', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {message.isRead && (
                              <span className="text-green-600">읽음</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteMessage(message.id)}
                          className="ml-4 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm flex items-center gap-1"
                        >
                          <FiTrash2 className="w-4 h-4" />
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* 메시지 보내기 모달 */}
      {showSendMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowSendMessageModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">메시지 보내기</h2>
              <button
                onClick={() => {
                  setShowSendMessageModal(false);
                  setMessageTitle('');
                  setMessageContent('');
                  setSelectedRecipient(null);
                }}
                className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-100 rounded"
              >
                <FiX className="text-xl" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  수신자 <span className="text-red-500">*</span>
                </label>
                {loadingRecipients ? (
                  <div className="text-sm text-gray-500">로딩 중...</div>
                ) : (
                  <select
                    value={selectedRecipient || ''}
                    onChange={(e) => setSelectedRecipient(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">수신자를 선택하세요</option>
                    {recipients.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name || '이름 없음'} ({r.phone || '연락처 없음'}) - {r.role === 'manager' ? '대리점장' : r.role === 'admin' ? '관리자' : '판매원'}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  제목 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={messageTitle}
                  onChange={(e) => setMessageTitle(e.target.value)}
                  placeholder="메시지 제목을 입력하세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  내용 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="메시지 내용을 입력하세요"
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowSendMessageModal(false);
                    setMessageTitle('');
                    setMessageContent('');
                    setSelectedRecipient(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={!messageTitle.trim() || !messageContent.trim() || !selectedRecipient || sendingMessage}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <FiSend className="w-4 h-4" />
                  {sendingMessage ? '전송 중...' : '보내기'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}