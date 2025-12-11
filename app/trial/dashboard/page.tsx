'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  FiUsers,
  FiLink,
  FiX,
  FiPlay,
  FiPhone,
  FiSend,
  FiCheck,
  FiPlus,
  FiSearch,
  FiFilter,
  FiMoreVertical,
  FiEye,
  FiCopy,
  FiMessageSquare,
  FiArrowRight,
  FiClock,
  FiDownload,
  FiChevronRight,
} from 'react-icons/fi';
import MiniClassViewer from '@/components/funnel-visualizer/MiniClassViewer';

// 체험 세션 타입
interface TrialSession {
  name: string;
  phone: string;
  mallUserId: string;
  startedAt: string;
  expiresAt: string;
}

const TRIAL_CACHE_KEY = 'cruise_trial_session';

function getTrialSession(): TrialSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(TRIAL_CACHE_KEY);
    if (!cached) return null;
    const session: TrialSession = JSON.parse(cached);
    if (new Date(session.expiresAt) < new Date()) {
      localStorage.removeItem(TRIAL_CACHE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

// 각 기능별 튜토리얼 콘텐츠
const featureTutorials: Record<string, {
  title: string;
  icon: React.ReactNode;
  description: string;
  features: string[];
  previewType: 'mall' | 'links' | 'customers' | 'purchased' | 'companion' | 'groups' | 'scheduled' | 'sms' | 'payment' | 'documents' | 'passport' | 'landing';
}> = {
  '나의 판매몰': {
    title: '나의 판매몰',
    icon: <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white text-lg">🛍️</div>,
    description: '나만의 크루즈 판매 쇼핑몰을 운영하세요',
    features: ['개인 브랜딩 가능한 나만의 판매몰', '로고, 배너 등 커스터마이징', '모바일 최적화 디자인', 'SNS 공유 가능한 링크 생성'],
    previewType: 'mall',
  },
  '링크 관리': {
    title: '링크 관리',
    icon: <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center"><FiLink className="w-5 h-5 text-white" /></div>,
    description: '상품별 추적 링크를 생성하고 성과를 분석하세요',
    features: ['클릭수, 전환율 실시간 추적', '상품별 맞춤 링크 생성', '성과 분석 대시보드', 'UTM 파라미터 자동 설정'],
    previewType: 'links',
  },
  '고객관리': {
    title: '고객관리',
    icon: <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center"><FiUsers className="w-5 h-5 text-white" /></div>,
    description: 'AI가 수집한 고객 DB를 관리하세요',
    features: ['AI 크루즈닷이 자동 수집한 고객 정보', '원클릭 전화/문자 발송', '고객별 상태 관리', '고객별 메모 기능'],
    previewType: 'customers',
  },
  '구매고객': {
    title: '구매고객',
    icon: <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white text-lg">💳</div>,
    description: '실제 구매한 고객들을 관리하세요',
    features: ['구매 이력 자동 기록', '재구매 유도 캠페인', '고객 등급 관리', '구매 패턴 분석'],
    previewType: 'purchased',
  },
  '동행인': {
    title: '동행인 등록',
    icon: <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white text-lg">👫</div>,
    description: '크루즈 여행 동행인 정보를 등록하세요',
    features: ['동행인 정보 일괄 입력', '여권 정보 자동 연동', '가족/그룹 관리', '동행인에게 알림 발송'],
    previewType: 'companion',
  },
  '그룹관리': {
    title: '고객 그룹',
    icon: <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white text-lg">📁</div>,
    description: '고객을 그룹별로 분류하고 맞춤 마케팅하세요',
    features: ['그룹별 태그 지정', '그룹별 성과 분석', '그룹 단체 메시지 발송', '타겟 마케팅 가능'],
    previewType: 'groups',
  },
  '예약메시지': {
    title: '예약 메시지',
    icon: <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center"><FiClock className="w-5 h-5 text-white" /></div>,
    description: '최적의 타이밍에 메시지를 보내세요',
    features: ['날짜/시간 예약 발송', '반복 발송 설정', '템플릿 저장', '발송 결과 리포트'],
    previewType: 'scheduled',
  },
  '문자발송': {
    title: '문자 보내기',
    icon: <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center"><FiMessageSquare className="w-5 h-5 text-white" /></div>,
    description: '고객에게 SMS/LMS를 발송하세요',
    features: ['SMS/LMS 대량 발송', '문자 템플릿 저장', '그룹별 발송', '발송 결과 확인'],
    previewType: 'sms',
  },
  '정산': {
    title: '결제/정산',
    icon: <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white text-lg">💰</div>,
    description: '판매 수수료와 정산 내역을 확인하세요',
    features: ['실시간 수수료 현황', '월별 정산 리포트', '출금 신청', '세금계산서 발행'],
    previewType: 'payment',
  },
  '서류관리': {
    title: '서류관리',
    icon: <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white text-lg">📄</div>,
    description: '크루즈 예약에 필요한 서류를 관리하세요',
    features: ['여권 사본 업로드', '비자 서류 관리', '동의서/계약서 관리', '보안 스토리지'],
    previewType: 'documents',
  },
  '여권등록': {
    title: '여권 등록',
    icon: <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white text-lg">🛂</div>,
    description: '고객의 여권 정보를 수동으로 등록하세요',
    features: ['여권 정보 직접 입력', '여권 사진 업로드', '유효기간 자동 체크', '만료 알림'],
    previewType: 'passport',
  },
  '랜딩페이지': {
    title: '랜딩페이지',
    icon: <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white text-lg">🎨</div>,
    description: '나만의 마케팅 랜딩페이지를 만드세요',
    features: ['드래그앤드롭 편집', '모바일 최적화', '전환 추적', '커스텀 도메인'],
    previewType: 'landing',
  },
};

// 샘플 대시보드 데이터
const sampleStats = {
  totalLinks: 12,
  totalLeads: 156,
  totalSales: 8,
  recentLeads: [
    { id: 1, customerName: '김지영', customerPhone: '010-****-1234', status: 'NEW', createdAt: '2025-11-29T10:30:00' },
    { id: 2, customerName: '이민수', customerPhone: '010-****-5678', status: 'CONTACTED', createdAt: '2025-11-28T14:20:00' },
    { id: 3, customerName: '박서연', customerPhone: '010-****-9012', status: 'INTERESTED', createdAt: '2025-11-27T09:15:00' },
    { id: 4, customerName: '최현우', customerPhone: '010-****-3456', status: 'NEW', createdAt: '2025-11-26T16:45:00' },
  ],
  commonLinks: [
    { id: 1, title: '지중해 크루즈 7박8일', shortUrl: 'cruise.link/med7', clicks: 234, conversions: 12 },
    { id: 2, title: '알래스카 빙하 탐험', shortUrl: 'cruise.link/alaska', clicks: 189, conversions: 8 },
    { id: 3, title: '카리브해 럭셔리', shortUrl: 'cruise.link/carib', clicks: 156, conversions: 5 },
  ],
};

// 미리보기 컴포넌트들 - 미니멀 디자인
function PreviewMall() {
  return (
    <div className="pointer-events-none select-none">
      <div className="bg-slate-900 text-white p-5 rounded-t-2xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-2xl">🛳️</div>
          <div>
            <h3 className="font-semibold text-lg">크루즈 마케터 판매몰</h3>
            <p className="text-sm text-slate-400">cruise.link/myshop</p>
          </div>
        </div>
      </div>
      <div className="bg-white p-5 space-y-4 rounded-b-2xl border border-t-0 border-slate-200">
        <div className="flex gap-2">
          <span className="px-4 py-2 bg-slate-900 text-white rounded-full text-sm font-medium">전체</span>
          <span className="px-4 py-2 bg-slate-100 text-slate-600 rounded-full text-sm">지중해</span>
          <span className="px-4 py-2 bg-slate-100 text-slate-600 rounded-full text-sm">알래스카</span>
        </div>
        {[1, 2].map(i => (
          <div key={i} className="border border-slate-200 rounded-2xl p-4 flex gap-4 hover:border-slate-300 transition-colors">
            <div className="w-24 h-20 bg-slate-100 rounded-xl flex items-center justify-center text-3xl">🚢</div>
            <div className="flex-1">
              <h4 className="font-semibold text-slate-900">지중해 크루즈 7박8일</h4>
              <p className="text-sm text-slate-500 mt-1">MSC 크루즈 · 2025.03.15 출발</p>
              <p className="text-lg font-bold text-slate-900 mt-2">₩2,890,000~</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewLinks() {
  return (
    <div className="pointer-events-none select-none bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">내 상품 링크</h3>
        <button className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium flex items-center gap-2">
          <FiPlus className="w-4 h-4" /> 링크 생성
        </button>
      </div>
      <div className="divide-y divide-slate-100">
        {sampleStats.commonLinks.map(link => (
          <div key={link.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
            <div>
              <h4 className="font-medium text-slate-900">{link.title}</h4>
              <p className="text-sm text-slate-500 mt-1">{link.shortUrl}</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-xl font-bold text-slate-900">{link.clicks}</p>
                <p className="text-xs text-slate-500">클릭</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-emerald-600">{link.conversions}</p>
                <p className="text-xs text-slate-500">전환</p>
              </div>
              <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <FiCopy className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewCustomers() {
  return (
    <div className="pointer-events-none select-none bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">고객 DB</h3>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-sm text-slate-600">
            <FiSearch className="w-4 h-4" /> 검색
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-sm text-slate-600">
            <FiFilter className="w-4 h-4" /> 필터
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left p-4 font-medium text-slate-500">고객명</th>
              <th className="text-left p-4 font-medium text-slate-500">연락처</th>
              <th className="text-left p-4 font-medium text-slate-500">상태</th>
              <th className="text-left p-4 font-medium text-slate-500">등록일</th>
              <th className="text-left p-4 font-medium text-slate-500">액션</th>
            </tr>
          </thead>
          <tbody>
            {sampleStats.recentLeads.map(lead => (
              <tr key={lead.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <td className="p-4 font-medium text-slate-900">{lead.customerName}</td>
                <td className="p-4 text-slate-600">{lead.customerPhone}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    lead.status === 'NEW' ? 'bg-slate-900 text-white' :
                    lead.status === 'CONTACTED' ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {lead.status === 'NEW' ? '신규' : lead.status === 'CONTACTED' ? '연락완료' : '관심'}
                  </span>
                </td>
                <td className="p-4 text-slate-500">{new Date(lead.createdAt).toLocaleDateString('ko-KR')}</td>
                <td className="p-4">
                  <div className="flex gap-1">
                    <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                      <FiPhone className="w-4 h-4 text-slate-400" />
                    </button>
                    <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                      <FiMessageSquare className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PreviewPayment() {
  return (
    <div className="pointer-events-none select-none bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="p-5 border-b border-slate-100">
        <h3 className="font-semibold text-slate-900">정산 현황</h3>
      </div>
      <div className="p-5 grid grid-cols-3 gap-4">
        <div className="bg-slate-50 rounded-2xl p-5 text-center">
          <p className="text-sm text-slate-500 mb-2">이번 달 수익</p>
          <p className="text-2xl font-bold text-slate-900">₩1,250,000</p>
        </div>
        <div className="bg-slate-50 rounded-2xl p-5 text-center">
          <p className="text-sm text-slate-500 mb-2">정산 대기</p>
          <p className="text-2xl font-bold text-slate-900">₩875,000</p>
        </div>
        <div className="bg-slate-900 rounded-2xl p-5 text-center">
          <p className="text-sm text-slate-400 mb-2">누적 수익</p>
          <p className="text-2xl font-bold text-white">₩12.5M</p>
        </div>
      </div>
      <div className="p-5 border-t border-slate-100">
        <h4 className="font-medium text-slate-900 mb-4">최근 거래</h4>
        <div className="space-y-3">
          {[{ name: '김지영', amount: 289000, date: '11/29' }, { name: '이민수', amount: 458000, date: '11/28' }].map((t, i) => (
            <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl">
              <div>
                <p className="font-medium text-slate-900">{t.name}님 구매</p>
                <p className="text-sm text-slate-500">{t.date}</p>
              </div>
              <p className="font-bold text-emerald-600">+₩{t.amount.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PreviewSMS() {
  return (
    <div className="pointer-events-none select-none bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="p-5 border-b border-slate-100">
        <h3 className="font-semibold text-slate-900">문자 보내기</h3>
      </div>
      <div className="p-5 space-y-5">
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-2">받는 사람</label>
          <div className="flex gap-2">
            <input className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" placeholder="고객 선택..." />
            <button className="px-4 py-3 bg-slate-100 rounded-xl text-sm font-medium text-slate-700">그룹 선택</button>
          </div>
          <div className="flex gap-2 mt-3">
            <span className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-sm flex items-center gap-2">
              김지영 <FiX className="w-3 h-3" />
            </span>
            <span className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-sm flex items-center gap-2">
              이민수 <FiX className="w-3 h-3" />
            </span>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-2">메시지 내용</label>
          <textarea className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm h-28 focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none" placeholder="메시지를 입력하세요..." />
          <p className="text-xs text-slate-400 mt-2">0/90자 (SMS)</p>
        </div>
        <button className="w-full py-4 bg-slate-900 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors">
          <FiSend className="w-4 h-4" /> 발송하기
        </button>
      </div>
    </div>
  );
}

function PreviewGeneric({ type }: { type: string }) {
  const configs: Record<string, { title: string; items: string[] }> = {
    purchased: { title: '구매 고객 목록', items: ['김지영 · 지중해 크루즈 (₩2,890,000)', '이민수 · 알래스카 크루즈 (₩3,450,000)'] },
    companion: { title: '동행인 등록', items: ['주예약자: 김지영', '동행인 1: 김철수 (배우자)', '동행인 2: 김하늘 (자녀)'] },
    groups: { title: '고객 그룹', items: ['VIP 고객 · 23명', '신규 고객 · 45명', '재구매 고객 · 12명'] },
    scheduled: { title: '예약된 메시지', items: ['12/01 09:00 · VIP 고객 신년 인사', '12/15 10:00 · 연말 프로모션 안내'] },
    documents: { title: '서류 현황', items: ['여권 사본 · 4건 완료', '비자 서류 · 2건 완료', '대기 중 · 1건'] },
    passport: { title: '여권 정보', items: ['이름: KIM JIYOUNG', '여권번호: M12345678', '만료일: 2030.05.15'] },
    landing: { title: '랜딩페이지', items: ['여름 크루즈 특가', '연말 가족 여행', '허니문 패키지'] },
  };

  const config = configs[type] || { title: '기능 미리보기', items: [] };

  return (
    <div className="pointer-events-none select-none bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">{config.title}</h3>
        <button className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium flex items-center gap-2">
          <FiPlus className="w-4 h-4" /> 추가
        </button>
      </div>
      <div className="p-5 space-y-3">
        {config.items.map((item, i) => (
          <div key={i} className="p-4 bg-slate-50 rounded-xl flex items-center justify-between hover:bg-slate-100 transition-colors">
            <span className="text-slate-700">{item}</span>
            <FiChevronRight className="w-4 h-4 text-slate-400" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TrialDashboardPage() {
  const router = useRouter();
  const [trialSession, setTrialSession] = useState<TrialSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  // PWA 설치 상태
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  // 튜토리얼 모달
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [currentTutorial, setCurrentTutorial] = useState<string | null>(null);

  // 시스템 문의 모달
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [inquiryForm, setInquiryForm] = useState({ name: '', phone: '' });
  const [inquirySubmitted, setInquirySubmitted] = useState(false);
  const [submittingInquiry, setSubmittingInquiry] = useState(false);

  // 세션 확인
  useEffect(() => {
    const session = getTrialSession();
    if (!session) {
      router.push('/subscription/login');
      return;
    }
    setTrialSession(session);
    setInquiryForm({ name: session.name, phone: session.phone });
    setLoading(false);
  }, [router]);

  // 카운트다운 업데이트
  useEffect(() => {
    if (!trialSession) return;

    const syncWithServer = async () => {
      try {
        const res = await fetch(`/api/subscription/trial/status?phone=${trialSession.phone}`);
        const data = await res.json();
        if (data.ok && data.trial && data.trial.expiresAt) {
          const serverExpiresAt = new Date(data.trial.expiresAt);
          const localExpiresAt = new Date(trialSession.expiresAt);
          if (serverExpiresAt > localExpiresAt) {
            const newSession = { ...trialSession, expiresAt: data.trial.expiresAt };
            localStorage.setItem(TRIAL_CACHE_KEY, JSON.stringify(newSession));
            setTrialSession(newSession);
          }
        }
      } catch (err) {
        console.error('Failed to sync trial status:', err);
      }
    };

    syncWithServer();

    const targetDate = new Date(trialSession.expiresAt);
    const updateCountdown = () => {
      const now = new Date();
      const diffMs = targetDate.getTime() - now.getTime();
      if (diffMs <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setCountdown({
        days: Math.floor(diffMs / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diffMs % (1000 * 60)) / 1000),
      });
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [trialSession]);

  // PWA 설치 프롬프트
  useEffect(() => {
    const checkStandalone = () => {
      setIsStandalone(
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true
      );
    };
    checkStandalone();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) {
      alert(/iPad|iPhone|iPod/.test(navigator.userAgent)
        ? 'Safari에서 공유 버튼을 누른 후 "홈 화면에 추가"를 선택해주세요.'
        : 'Chrome 또는 Edge 브라우저에서 설치할 수 있습니다.');
      return;
    }
    await installPrompt.prompt();
    setInstallPrompt(null);
  };

  const openTutorial = (featureName: string) => {
    setCurrentTutorial(featureName);
    setShowTutorialModal(true);
  };

  const handleInquirySubmit = async () => {
    if (!inquiryForm.name.trim() || !inquiryForm.phone.trim()) {
      alert('이름과 연락처를 모두 입력해주세요.');
      return;
    }

    setSubmittingInquiry(true);
    try {
      await fetch('/api/system-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: inquiryForm.name,
          phone: inquiryForm.phone,
          source: 'TRIAL_DASHBOARD',
          message: '3일 체험 후 1:1 상담 요청',
        }),
      });
      setInquirySubmitted(true);
    } catch (error) {
      console.error('문의 등록 실패:', error);
      setInquirySubmitted(true);
    }
    setSubmittingInquiry(false);
  };

  const tutorial = currentTutorial ? featureTutorials[currentTutorial] : null;

  const renderPreview = (type: string) => {
    switch (type) {
      case 'mall': return <PreviewMall />;
      case 'links': return <PreviewLinks />;
      case 'customers': return <PreviewCustomers />;
      case 'payment': return <PreviewPayment />;
      case 'sms': return <PreviewSMS />;
      default: return <PreviewGeneric type={type} />;
    }
  };

  if (loading || !trialSession) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 상단 네비게이션 */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-2xl border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* 로고 */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Image
                src="/images/ai-cruise-logo.png"
                alt="크루즈닷"
                width={32}
                height={32}
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
              />
              <span className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">크루즈닷</span>
            </div>

            {/* 카운트다운 - 중앙 */}
            {countdown && (
              <div className="hidden sm:flex items-center gap-3">
                <span className="text-xs text-slate-400 font-medium">체험 종료</span>
                <div className="flex items-center bg-gradient-to-r from-slate-900 to-slate-800 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-mono font-semibold shadow-lg shadow-slate-900/20">
                  <span className="text-white/90">{countdown.days}일</span>
                  <span className="text-slate-500 mx-1">:</span>
                  <span>{String(countdown.hours).padStart(2, '0')}</span>
                  <span className="text-slate-500 mx-0.5">:</span>
                  <span>{String(countdown.minutes).padStart(2, '0')}</span>
                  <span className="text-slate-500 mx-0.5">:</span>
                  <span className="text-emerald-400">{String(countdown.seconds).padStart(2, '0')}</span>
                </div>
              </div>
            )}

            {/* 모바일 카운트다운 */}
            {countdown && (
              <div className="sm:hidden flex items-center">
                <div className="bg-slate-900 text-white px-2.5 py-1 rounded-lg text-xs font-mono font-semibold">
                  {countdown.days}일 {String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}
                </div>
              </div>
            )}

            {/* 상담 버튼 */}
            <button
              onClick={() => setShowInquiryModal(true)}
              className="px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white text-xs sm:text-sm font-semibold rounded-xl hover:from-slate-800 hover:to-slate-700 transition-all shadow-lg shadow-slate-900/20 flex items-center gap-1.5 sm:gap-2"
            >
              <FiPhone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline sm:inline">상담 신청</span>
            </button>
          </div>
        </div>
      </nav>

      {/* PWA 설치 배너 */}
      {!isStandalone && (
        <div className="fixed top-14 sm:top-16 left-0 right-0 z-40 bg-gradient-to-r from-slate-800 to-slate-900 text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs sm:text-sm text-slate-300">
                <span className="hidden sm:inline">앱으로 설치하면 더 빠르게 이용할 수 있어요</span>
                <span className="sm:hidden">앱 설치로 빠른 이용</span>
              </p>
              <button
                onClick={handleInstallApp}
                className="px-3 sm:px-4 py-1.5 bg-white text-slate-900 text-xs sm:text-sm font-semibold rounded-lg flex items-center gap-1.5 hover:bg-slate-100 transition-colors flex-shrink-0"
              >
                <FiDownload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">설치하기</span>
                <span className="sm:hidden">설치</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 메인 콘텐츠 */}
      <main className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-28 sm:pb-32 ${isStandalone ? 'pt-20 sm:pt-24' : 'pt-28 sm:pt-36'}`}>

        {/* 헤더 섹션 */}
        <header className="mb-6 sm:mb-10">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-1 sm:mb-2 tracking-tight">
            안녕하세요, {trialSession.name}님
          </h1>
          <p className="text-slate-500 text-sm sm:text-base lg:text-lg">각 메뉴를 클릭해서 실제 기능을 미리 확인해보세요</p>
        </header>

        {/* 통계 카드 */}
        <section className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-10">
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all">
            <p className="text-xs sm:text-sm text-slate-500 mb-0.5 sm:mb-1">총 고객</p>
            <p className="text-xl sm:text-3xl font-bold text-slate-900">{sampleStats.totalLeads}</p>
          </div>
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all">
            <p className="text-xs sm:text-sm text-slate-500 mb-0.5 sm:mb-1">상품 링크</p>
            <p className="text-xl sm:text-3xl font-bold text-slate-900">{sampleStats.totalLinks}</p>
          </div>
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-lg shadow-slate-900/20">
            <p className="text-xs sm:text-sm text-slate-400 mb-0.5 sm:mb-1">판매</p>
            <p className="text-xl sm:text-3xl font-bold text-white">{sampleStats.totalSales}</p>
          </div>
        </section>

        {/* 마케팅 미니 클래스 */}
        <section className="mb-6 sm:mb-10">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div>
              <h2 className="text-base sm:text-xl font-bold text-slate-900">마케팅 미니 클래스</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1">퍼널 마케팅의 핵심을 배워보세요</p>
            </div>
          </div>
          <MiniClassViewer />
        </section>

        {/* 빠른 메뉴 */}
        <section className="mb-6 sm:mb-10">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-xl font-bold text-slate-900">빠른 메뉴</h2>
            <span className="text-xs sm:text-sm text-slate-400 flex items-center gap-1">
              <FiPlay className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">클릭해서</span> 미리보기
            </span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
            {Object.entries(featureTutorials).map(([key, { icon }]) => (
              <button
                key={key}
                onClick={() => openTutorial(key)}
                className="group flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 hover:border-slate-900 hover:shadow-lg active:scale-[0.98] transition-all"
              >
                <div className="scale-75 sm:scale-100">{icon}</div>
                <span className="text-[10px] sm:text-sm font-medium text-slate-700 text-center leading-tight">{key}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 샘플 데이터 섹션들 */}
        <div className="grid lg:grid-cols-2 gap-3 sm:gap-6 mb-6 sm:mb-10">
          <section className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-3 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
                <FiLink className="w-4 h-4 sm:w-5 sm:h-5" /> 상품 링크
              </h2>
              <span className="text-[10px] sm:text-xs text-slate-400 bg-slate-100 px-2 py-0.5 sm:py-1 rounded-lg">샘플</span>
            </div>
            <div className="divide-y divide-slate-100">
              {sampleStats.commonLinks.slice(0, 2).map(link => (
                <div key={link.id} className="p-3 sm:p-5 opacity-60">
                  <p className="font-medium text-slate-900 text-sm sm:text-base">{link.title}</p>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1">{link.shortUrl}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-3 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
                <FiUsers className="w-4 h-4 sm:w-5 sm:h-5" /> 최근 고객
              </h2>
              <span className="text-[10px] sm:text-xs text-slate-400 bg-slate-100 px-2 py-0.5 sm:py-1 rounded-lg">샘플</span>
            </div>
            <div className="divide-y divide-slate-100">
              {sampleStats.recentLeads.slice(0, 3).map(lead => (
                <div key={lead.id} className="p-3 sm:p-5 flex justify-between items-center opacity-60">
                  <div>
                    <p className="font-medium text-slate-900 text-sm sm:text-base">{lead.customerName}</p>
                    <p className="text-xs sm:text-sm text-slate-500">{lead.customerPhone}</p>
                  </div>
                  <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${
                    lead.status === 'NEW' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {lead.status === 'NEW' ? '신규' : '관심'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* 하단 CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200 z-40 shadow-lg shadow-slate-900/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 text-sm sm:text-base truncate">1:1 전담 상담을 받아보세요</p>
              <p className="text-xs sm:text-sm text-slate-500 hidden sm:block">시스템에 대해 자세히 안내해드립니다</p>
            </div>
            <button
              onClick={() => setShowInquiryModal(true)}
              className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white text-sm sm:text-base font-semibold rounded-xl hover:from-slate-800 hover:to-slate-700 transition-all shadow-lg shadow-slate-900/20 flex items-center gap-2 flex-shrink-0"
            >
              <span className="hidden sm:inline">상담 신청</span>
              <span className="sm:hidden">상담</span>
              <FiArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 튜토리얼 모달 */}
      {showTutorialModal && tutorial && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
            {/* 헤더 */}
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-start justify-between flex-shrink-0">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="scale-90 sm:scale-100">{tutorial.icon}</div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">{tutorial.title}</h3>
                  <p className="text-slate-500 text-xs sm:text-sm mt-0.5 sm:mt-1">{tutorial.description}</p>
                </div>
              </div>
              <button
                onClick={() => setShowTutorialModal(false)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors -mr-1"
              >
                <FiX className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* 미리보기 */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="mb-4 sm:mb-6">
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <FiEye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
                  <span className="text-xs sm:text-sm font-medium text-slate-700">실제 화면 미리보기</span>
                  <span className="text-[10px] sm:text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg">체험용</span>
                </div>
                <div className="border border-slate-200 rounded-xl sm:rounded-2xl overflow-hidden">
                  {renderPreview(tutorial.previewType)}
                </div>
              </div>

              {/* 주요 기능 */}
              <div className="bg-slate-50 rounded-xl sm:rounded-2xl p-4 sm:p-5">
                <h4 className="font-semibold text-slate-900 mb-3 sm:mb-4 text-sm sm:text-base">주요 기능</h4>
                <ul className="space-y-2 sm:space-y-3">
                  {tutorial.features.map((f, i) => (
                    <li key={i} className="text-xs sm:text-sm text-slate-600 flex items-start gap-2 sm:gap-3">
                      <FiCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-900 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 푸터 */}
            <div className="p-4 sm:p-6 border-t border-slate-100 flex gap-2 sm:gap-3 flex-shrink-0">
              <button
                onClick={() => setShowTutorialModal(false)}
                className="flex-1 px-4 py-2.5 sm:py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors text-sm sm:text-base"
              >
                닫기
              </button>
              <button
                onClick={() => { setShowTutorialModal(false); setShowInquiryModal(true); }}
                className="flex-1 px-4 py-2.5 sm:py-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl font-semibold hover:from-slate-800 hover:to-slate-700 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <FiPhone className="w-4 h-4" /> 상담 신청
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 시스템 문의 모달 */}
      {showInquiryModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md overflow-hidden">
            {/* 모바일 핸들 */}
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-slate-300 rounded-full"></div>
            </div>

            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">상담 신청</h3>
                <p className="text-slate-500 text-xs sm:text-sm mt-0.5 sm:mt-1">1:1 전담 상담을 받아보세요</p>
              </div>
              <button
                onClick={() => { setShowInquiryModal(false); setInquirySubmitted(false); }}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors -mr-1"
              >
                <FiX className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-4 sm:p-6">
              {inquirySubmitted ? (
                <div className="text-center py-6 sm:py-8">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg shadow-slate-900/20">
                    <FiCheck className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                  </div>
                  <h4 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">신청이 완료되었습니다</h4>
                  <p className="text-slate-500 text-sm mb-6 sm:mb-8">
                    담당자가 빠른 시간 내에<br />연락드리겠습니다.
                  </p>
                  <button
                    onClick={() => { setShowInquiryModal(false); setInquirySubmitted(false); }}
                    className="px-6 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl font-semibold hover:from-slate-800 hover:to-slate-700 transition-all shadow-lg shadow-slate-900/20"
                  >
                    확인
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-slate-50 rounded-xl sm:rounded-2xl p-4 sm:p-5 mb-4 sm:mb-6">
                    <p className="text-slate-700 text-xs sm:text-sm leading-relaxed">
                      크루즈 마케터 시스템에 대해 궁금한 점을 전담 상담사가 자세히 안내해드립니다.
                    </p>
                  </div>

                  <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                    <div>
                      <label className="text-xs sm:text-sm font-medium text-slate-700 block mb-1.5 sm:mb-2">이름</label>
                      <input
                        type="text"
                        value={inquiryForm.name}
                        onChange={(e) => setInquiryForm({ ...inquiryForm, name: e.target.value })}
                        className="w-full px-4 py-2.5 sm:py-3 border border-slate-200 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                        placeholder="이름을 입력하세요"
                      />
                    </div>
                    <div>
                      <label className="text-xs sm:text-sm font-medium text-slate-700 block mb-1.5 sm:mb-2">연락처</label>
                      <input
                        type="tel"
                        value={inquiryForm.phone}
                        onChange={(e) => setInquiryForm({ ...inquiryForm, phone: e.target.value })}
                        className="w-full px-4 py-2.5 sm:py-3 border border-slate-200 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                        placeholder="010-0000-0000"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleInquirySubmit}
                    disabled={submittingInquiry}
                    className="w-full py-3 sm:py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:from-slate-800 hover:to-slate-700 disabled:opacity-50 transition-all shadow-lg shadow-slate-900/20 text-sm sm:text-base"
                  >
                    {submittingInquiry ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <FiSend className="w-4 h-4" /> 상담 신청하기
                      </>
                    )}
                  </button>

                  <p className="text-center text-[10px] sm:text-xs text-slate-400 mt-3 sm:mt-4">
                    영업일 기준 24시간 이내 연락드립니다
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
