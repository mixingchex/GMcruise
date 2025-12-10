'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FiUsers,
  FiLink,
  FiShoppingCart,
  FiTrendingUp,
  FiMessageSquare,
  FiDownload,
  FiCopy,
  FiClock,
  FiFileText,
  FiUser,
  FiLayers,
  FiX,
  FiArrowRight,
  FiPlay,
  FiLock,
  FiPhone,
  FiMail,
  FiSend,
  FiCheck,
  FiEdit,
  FiTrash2,
  FiPlus,
  FiSearch,
  FiFilter,
  FiMoreVertical,
  FiExternalLink,
  FiEye,
  FiCalendar,
  FiDollarSign,
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

// 각 기능별 튜토리얼 콘텐츠 + 실제 UI 미리보기
const featureTutorials: Record<string, {
  title: string;
  icon: string;
  description: string;
  features: string[];
  previewType: 'mall' | 'links' | 'customers' | 'purchased' | 'companion' | 'groups' | 'scheduled' | 'sms' | 'payment' | 'documents' | 'passport' | 'landing';
}> = {
  '나의 판매몰': {
    title: '🛍️ 나의 판매몰',
    icon: '🛍️',
    description: '나만의 크루즈 판매 쇼핑몰을 운영할 수 있어요!',
    features: ['개인 브랜딩 가능한 나만의 판매몰', '로고, 배너 등 커스터마이징', '모바일 최적화 디자인', 'SNS 공유 가능한 링크 생성'],
    previewType: 'mall',
  },
  '링크 관리': {
    title: '🔗 링크 관리',
    icon: '🔗',
    description: '상품별 추적 링크를 생성하고 성과를 분석해요!',
    features: ['클릭수, 전환율 실시간 추적', '상품별 맞춤 링크 생성', '성과 분석 대시보드', 'UTM 파라미터 자동 설정'],
    previewType: 'links',
  },
  '나의 고객관리': {
    title: '👥 나의 고객관리',
    icon: '👥',
    description: 'AI 챗봇이 수집한 고객 DB를 관리해요!',
    features: ['AI 크루즈닷이 자동 수집한 고객 정보', '원클릭 전화/문자 발송', '고객별 상태 관리', '고객별 메모 기능'],
    previewType: 'customers',
  },
  '구매고객 관리': {
    title: '💳 구매고객 관리',
    icon: '💳',
    description: '실제 구매한 고객들을 관리하고 리텐션을 높여요!',
    features: ['구매 이력 자동 기록', '재구매 유도 캠페인', '고객 등급 관리', '구매 패턴 분석'],
    previewType: 'purchased',
  },
  '동행인 등록': {
    title: '👫 동행인 등록',
    icon: '👫',
    description: '크루즈 여행 동행인 정보를 등록해요!',
    features: ['동행인 정보 일괄 입력', '여권 정보 자동 연동', '가족/그룹 관리', '동행인에게 알림 발송'],
    previewType: 'companion',
  },
  '고객 그룹 관리': {
    title: '📁 고객 그룹 관리',
    icon: '📁',
    description: '고객을 그룹별로 분류하고 맞춤 마케팅해요!',
    features: ['그룹별 태그 지정', '그룹별 성과 분석', '그룹 단체 메시지 발송', '타겟 마케팅 가능'],
    previewType: 'groups',
  },
  '예약 메시지 관리': {
    title: '⏰ 예약 메시지 관리',
    icon: '⏰',
    description: '예약 발송으로 최적의 타이밍에 메시지를 보내요!',
    features: ['날짜/시간 예약 발송', '반복 발송 설정', '템플릿 저장', '발송 결과 리포트'],
    previewType: 'scheduled',
  },
  '문자 보내기': {
    title: '💬 문자 보내기',
    icon: '💬',
    description: '고객에게 SMS/LMS를 발송해요!',
    features: ['SMS/LMS 대량 발송', '문자 템플릿 저장', '그룹별 발송', '발송 결과 확인'],
    previewType: 'sms',
  },
  '결제/정산': {
    title: '💰 결제/정산',
    icon: '💰',
    description: '판매 수수료와 정산 내역을 확인해요!',
    features: ['실시간 수수료 현황', '월별 정산 리포트', '출금 신청', '세금계산서 발행'],
    previewType: 'payment',
  },
  '서류관리': {
    title: '📄 서류관리',
    icon: '📄',
    description: '크루즈 예약에 필요한 서류를 관리해요!',
    features: ['여권 사본 업로드', '비자 서류 관리', '동의서/계약서 관리', '보안 스토리지'],
    previewType: 'documents',
  },
  '수동여권 등록': {
    title: '🛂 수동여권 등록',
    icon: '🛂',
    description: '고객의 여권 정보를 수동으로 등록해요!',
    features: ['여권 정보 직접 입력', '여권 사진 업로드', '유효기간 자동 체크', '만료 알림'],
    previewType: 'passport',
  },
  '랜딩페이지 관리': {
    title: '🎨 랜딩페이지 관리',
    icon: '🎨',
    description: '나만의 마케팅 랜딩페이지를 만들어요!',
    features: ['드래그앤드롭 편집', '모바일 최적화', '전환 추적', '커스텀 도메인'],
    previewType: 'landing',
  },
};

// 샘플 대시보드 데이터
const sampleStats = {
  totalLinks: 12,
  totalLeads: 156,
  totalSales: 8,
  teamMembers: 3,
  monthlySales: [
    { date: '2025-11', count: 5, totalAmount: 12500000 },
    { date: '2025-10', count: 3, totalAmount: 8750000 },
  ],
  recentLeads: [
    { id: 1, customerName: '김지영', customerPhone: '010-****-1234', status: 'NEW', createdAt: '2025-11-29T10:30:00' },
    { id: 2, customerName: '이민수', customerPhone: '010-****-5678', status: 'CONTACTED', createdAt: '2025-11-28T14:20:00' },
    { id: 3, customerName: '박서연', customerPhone: '010-****-9012', status: 'INTERESTED', createdAt: '2025-11-27T09:15:00' },
    { id: 4, customerName: '최현우', customerPhone: '010-****-3456', status: 'NEW', createdAt: '2025-11-26T16:45:00' },
  ],
  commonLinks: [
    { id: 1, title: '지중해 크루즈 7박8일', productCode: 'MED-2024-001', shortUrl: 'cruise.link/med7', clicks: 234, conversions: 12 },
    { id: 2, title: '알래스카 빙하 탐험 크루즈', productCode: 'ALA-2024-002', shortUrl: 'cruise.link/alaska', clicks: 189, conversions: 8 },
    { id: 3, title: '카리브해 럭셔리 크루즈', productCode: 'CAR-2024-003', shortUrl: 'cruise.link/carib', clicks: 156, conversions: 5 },
  ],
};

// 실제 UI 미리보기 컴포넌트들 (클릭 안됨)
function PreviewMall() {
  return (
    <div className="pointer-events-none select-none">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white p-4 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">🛳️</div>
          <div>
            <h3 className="font-bold">크루즈 마케터 판매몰</h3>
            <p className="text-sm text-blue-100">cruise.link/myshop</p>
          </div>
        </div>
      </div>
      <div className="bg-white p-4 space-y-3">
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-xs">전체</span>
          <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">지중해</span>
          <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">알래스카</span>
        </div>
        {[1, 2].map(i => (
          <div key={i} className="border rounded-lg p-3 flex gap-3">
            <div className="w-20 h-16 bg-gradient-to-br from-blue-100 to-cyan-100 rounded flex items-center justify-center">🚢</div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm">지중해 크루즈 7박8일</h4>
              <p className="text-xs text-gray-500">MSC 크루즈 | 2025.03.15 출발</p>
              <p className="text-sm font-bold text-blue-600 mt-1">2,890,000원~</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewLinks() {
  return (
    <div className="pointer-events-none select-none bg-white rounded-xl overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-bold">내 상품 링크</h3>
        <button className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm flex items-center gap-1">
          <FiPlus className="w-4 h-4" /> 링크 생성
        </button>
      </div>
      <div className="divide-y">
        {sampleStats.commonLinks.map(link => (
          <div key={link.id} className="p-4 flex items-center justify-between">
            <div>
              <h4 className="font-medium">{link.title}</h4>
              <p className="text-sm text-cyan-600">{link.shortUrl}</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="text-center">
                <p className="font-bold text-blue-600">{link.clicks}</p>
                <p className="text-xs text-gray-500">클릭</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-green-600">{link.conversions}</p>
                <p className="text-xs text-gray-500">전환</p>
              </div>
              <button className="p-2 hover:bg-gray-100 rounded"><FiCopy className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewCustomers() {
  return (
    <div className="pointer-events-none select-none bg-white rounded-xl overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-bold">고객 DB</h3>
        <div className="flex gap-2">
          <div className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-lg text-sm">
            <FiSearch className="w-4 h-4" /> 검색
          </div>
          <div className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-lg text-sm">
            <FiFilter className="w-4 h-4" /> 필터
          </div>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left p-3">고객명</th>
            <th className="text-left p-3">연락처</th>
            <th className="text-left p-3">상태</th>
            <th className="text-left p-3">등록일</th>
            <th className="text-left p-3">액션</th>
          </tr>
        </thead>
        <tbody>
          {sampleStats.recentLeads.map(lead => (
            <tr key={lead.id} className="border-t">
              <td className="p-3 font-medium">{lead.customerName}</td>
              <td className="p-3 text-gray-600">{lead.customerPhone}</td>
              <td className="p-3">
                <span className={`px-2 py-0.5 rounded text-xs ${lead.status === 'NEW' ? 'bg-blue-100 text-blue-600' :
                    lead.status === 'CONTACTED' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'
                  }`}>
                  {lead.status === 'NEW' ? '신규' : lead.status === 'CONTACTED' ? '연락완료' : '관심'}
                </span>
              </td>
              <td className="p-3 text-gray-500">{new Date(lead.createdAt).toLocaleDateString('ko-KR')}</td>
              <td className="p-3">
                <div className="flex gap-1">
                  <button className="p-1.5 hover:bg-gray-100 rounded"><FiPhone className="w-4 h-4 text-blue-500" /></button>
                  <button className="p-1.5 hover:bg-gray-100 rounded"><FiMessageSquare className="w-4 h-4 text-green-500" /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PreviewPayment() {
  return (
    <div className="pointer-events-none select-none bg-white rounded-xl overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="font-bold">정산 현황</h3>
      </div>
      <div className="p-4 grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-600">이번 달 수익</p>
          <p className="text-2xl font-bold text-blue-600">₩1,250,000</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-600">정산 대기</p>
          <p className="text-2xl font-bold text-green-600">₩875,000</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-600">누적 수익</p>
          <p className="text-2xl font-bold text-purple-600">₩12,500,000</p>
        </div>
      </div>
      <div className="p-4 border-t">
        <h4 className="font-semibold mb-3">최근 거래</h4>
        <div className="space-y-2">
          {[{ name: '김지영', amount: 289000, date: '11/29' }, { name: '이민수', amount: 458000, date: '11/28' }].map((t, i) => (
            <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">{t.name}님 구매</p>
                <p className="text-xs text-gray-500">{t.date}</p>
              </div>
              <p className="font-bold text-green-600">+₩{t.amount.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PreviewSMS() {
  return (
    <div className="pointer-events-none select-none bg-white rounded-xl overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="font-bold">문자 보내기</h3>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">받는 사람</label>
          <div className="flex gap-2">
            <input className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="고객 선택..." />
            <button className="px-3 py-2 bg-gray-100 rounded-lg text-sm">그룹 선택</button>
          </div>
          <div className="flex gap-1 mt-2">
            <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs flex items-center gap-1">
              김지영 <FiX className="w-3 h-3" />
            </span>
            <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs flex items-center gap-1">
              이민수 <FiX className="w-3 h-3" />
            </span>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">메시지 내용</label>
          <textarea className="w-full border rounded-lg px-3 py-2 text-sm h-24" placeholder="메시지를 입력하세요..." />
          <p className="text-xs text-gray-500 mt-1">0/90자 (SMS)</p>
        </div>
        <button className="w-full py-3 bg-blue-500 text-white rounded-lg font-semibold flex items-center justify-center gap-2">
          <FiSend className="w-4 h-4" /> 발송하기
        </button>
      </div>
    </div>
  );
}

function PreviewGeneric({ type }: { type: string }) {
  const configs: Record<string, { title: string; items: string[] }> = {
    purchased: { title: '구매 고객 목록', items: ['김지영 - 지중해 크루즈 (₩2,890,000)', '이민수 - 알래스카 크루즈 (₩3,450,000)'] },
    companion: { title: '동행인 등록', items: ['주예약자: 김지영', '동행인 1: 김철수 (배우자)', '동행인 2: 김하늘 (자녀)'] },
    groups: { title: '고객 그룹', items: ['🌟 VIP 고객 (23명)', '🆕 신규 고객 (45명)', '🔄 재구매 고객 (12명)'] },
    scheduled: { title: '예약된 메시지', items: ['12/01 09:00 - VIP 고객 신년 인사', '12/15 10:00 - 연말 프로모션 안내'] },
    documents: { title: '서류 현황', items: ['✅ 여권 사본 (4건)', '✅ 비자 서류 (2건)', '⏳ 대기 중 (1건)'] },
    passport: { title: '여권 정보', items: ['이름: KIM JIYOUNG', '여권번호: M12345678', '만료일: 2030.05.15'] },
    landing: { title: '랜딩페이지', items: ['🏝️ 여름 크루즈 특가', '🎄 연말 가족 여행', '💑 허니문 패키지'] },
  };

  const config = configs[type] || { title: '기능 미리보기', items: [] };

  return (
    <div className="pointer-events-none select-none bg-white rounded-xl overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-bold">{config.title}</h3>
        <button className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm flex items-center gap-1">
          <FiPlus className="w-4 h-4" /> 추가
        </button>
      </div>
      <div className="p-4 space-y-2">
        {config.items.map((item, i) => (
          <div key={i} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
            <span>{item}</span>
            <FiMoreVertical className="w-4 h-4 text-gray-400" />
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
  const [countdown, setCountdown] = useState<{ days: number; hours: number; minutes: number; seconds: number; } | null>(null);

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

    // 서버와 동기화 (연장 여부 확인)
    const syncWithServer = async () => {
      try {
        const res = await fetch(`/api/subscription/trial/status?phone=${trialSession.phone}`);
        const data = await res.json();
        if (data.ok && data.trial && data.trial.expiresAt) {
          const serverExpiresAt = new Date(data.trial.expiresAt);
          const localExpiresAt = new Date(trialSession.expiresAt);

          // 서버 만료일이 더 미래라면 업데이트
          if (serverExpiresAt > localExpiresAt) {
            const newSession = { ...trialSession, expiresAt: data.trial.expiresAt };
            localStorage.setItem(TRIAL_CACHE_KEY, JSON.stringify(newSession));
            setTrialSession(newSession);
            console.log('Trial extended from server:', data.trial.expiresAt);
          }
        }
      } catch (err) {
        console.error('Failed to sync trial status:', err);
      }
    };

    // 최초 1회 및 주기적 확인 (선택사항, 여기서는 최초 1회만)
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
      // 시스템 문의 API 호출
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
      // 실패해도 성공으로 표시 (UX)
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
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 pb-24">
      {/* 상단 배너 */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-500 to-yellow-500 text-white shadow-lg">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <span className="text-2xl">🎁</span>
            <span className="font-bold">3일 무료 체험 중</span>
            {countdown && (
              <span className="font-extrabold bg-white/30 px-4 py-1 rounded-full text-sm">
                D-{countdown.days} {String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
              </span>
            )}
            <button
              onClick={() => setShowInquiryModal(true)}
              className="px-4 py-2 bg-white text-orange-600 font-bold rounded-lg hover:bg-orange-50 transition-colors shadow-md text-sm flex items-center gap-1"
            >
              <FiPhone className="w-4 h-4" /> 시스템 문의
            </button>
          </div>
        </div>
      </div>

      {/* PWA 배너 */}
      {!isStandalone && (
        <div className="fixed top-14 left-0 right-0 z-40 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md">
          <div className="mx-auto max-w-7xl px-4 py-2">
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <span>📲</span>
              <span className="text-sm">앱으로 설치하면 더 빠르게!</span>
              <button onClick={handleInstallApp} className="px-3 py-1 bg-white text-purple-600 font-bold rounded-lg text-sm flex items-center gap-1">
                <FiDownload className="w-4 h-4" /> 설치하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 메인 콘텐츠 */}
      <div className={`mx-auto max-w-6xl px-4 ${isStandalone ? 'pt-20' : 'pt-32'}`}>

        {/* 헤더 */}
        <header className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black mb-1">안녕하세요, {trialSession.name}님! 👋</h1>
              <p className="text-cyan-100 text-sm">각 메뉴를 클릭해서 실제 기능을 미리 확인해보세요!</p>
            </div>
            <div className="flex gap-3">
              <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
                <p className="text-xs text-cyan-100">총 고객</p>
                <p className="text-xl font-bold">{sampleStats.totalLeads}</p>
              </div>
              <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
                <p className="text-xs text-cyan-100">판매</p>
                <p className="text-xl font-bold">{sampleStats.totalSales}</p>
              </div>
            </div>
          </div>
        </header>

        {/* 퍼널 마케팅 미니 클래스 */}
        <section className="mb-6">
          <div className="mb-3">
            <h2 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
              🎓 마케팅 미니 클래스
            </h2>
            <p className="text-xs md:text-sm text-slate-500">좌우 버튼으로 퍼널 마케팅의 핵심을 배워보세요</p>
          </div>
          <MiniClassViewer />
        </section>

        {/* 빠른 메뉴 */}
        <section className="bg-white rounded-2xl p-4 md:p-6 shadow-lg mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base md:text-lg font-bold">빠른 메뉴</h2>
            <span className="text-xs text-cyan-600 bg-cyan-50 px-2 md:px-3 py-1 rounded-full flex items-center gap-1">
              <FiPlay className="w-3 h-3" /> <span className="hidden sm:inline">클릭해서</span> 미리보기
            </span>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Object.entries(featureTutorials).map(([key, { icon }]) => (
              <button
                key={key}
                onClick={() => openTutorial(key)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 transition-all hover:shadow-md group"
              >
                <span className="text-2xl">{icon}</span>
                <span className="text-xs font-medium text-center text-slate-700 leading-tight">{key}</span>
                <FiPlay className="w-3 h-3 text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </section>

        {/* 샘플 데이터 섹션들 */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <section className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold flex items-center gap-2"><FiLink className="text-cyan-500" /> 상품 링크</h2>
              <span className="text-xs bg-slate-100 px-2 py-1 rounded">샘플</span>
            </div>
            <div className="space-y-3">
              {sampleStats.commonLinks.slice(0, 2).map(link => (
                <div key={link.id} className="p-3 bg-slate-50 rounded-lg opacity-75">
                  <p className="font-medium text-sm">{link.title}</p>
                  <p className="text-xs text-cyan-600">{link.shortUrl}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold flex items-center gap-2"><FiUsers className="text-green-500" /> 최근 고객</h2>
              <span className="text-xs bg-slate-100 px-2 py-1 rounded">샘플</span>
            </div>
            <div className="space-y-3">
              {sampleStats.recentLeads.slice(0, 3).map(lead => (
                <div key={lead.id} className="p-3 bg-slate-50 rounded-lg flex justify-between items-center opacity-75">
                  <div>
                    <p className="font-medium text-sm">{lead.customerName}</p>
                    <p className="text-xs text-gray-500">{lead.customerPhone}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs ${lead.status === 'NEW' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                    }`}>
                    {lead.status === 'NEW' ? '신규' : '관심'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* 하단 CTA */}
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-cyan-600 to-blue-600 p-4 shadow-lg z-40">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="text-white">
              <p className="font-bold">1:1 전담 상담을 받아보세요!</p>
              <p className="text-sm text-cyan-100">시스템에 대해 자세히 안내해드립니다</p>
            </div>
            <button
              onClick={() => setShowInquiryModal(true)}
              className="px-6 py-3 bg-white text-cyan-600 font-bold rounded-xl hover:bg-cyan-50 transition-colors shadow-lg flex items-center gap-2"
            >
              <FiPhone /> 시스템 문의
            </button>
          </div>
        </div>
      </div>

      {/* 튜토리얼 모달 - 실제 UI 미리보기 포함 */}
      {showTutorialModal && tutorial && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* 헤더 */}
            <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white p-6 relative flex-shrink-0">
              <button onClick={() => setShowTutorialModal(false)} className="absolute top-4 right-4 text-white/80 hover:text-white">
                <FiX className="w-6 h-6" />
              </button>
              <div className="text-4xl mb-2">{tutorial.icon}</div>
              <h3 className="text-2xl font-black">{tutorial.title}</h3>
              <p className="text-cyan-100 mt-1">{tutorial.description}</p>
            </div>

            {/* 실제 UI 미리보기 */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <FiEye className="w-5 h-5 text-cyan-600" />
                  <h4 className="font-bold text-slate-900">실제 화면 미리보기</h4>
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">클릭 불가</span>
                </div>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 bg-slate-50">
                  {renderPreview(tutorial.previewType)}
                </div>
              </div>

              {/* 주요 기능 */}
              <div className="bg-cyan-50 rounded-xl p-4">
                <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <FiCheck className="w-4 h-4 text-cyan-600" /> 주요 기능
                </h4>
                <ul className="space-y-1">
                  {tutorial.features.map((f, i) => (
                    <li key={i} className="text-sm text-slate-700 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 푸터 */}
            <div className="p-6 pt-0 flex gap-3 flex-shrink-0">
              <button onClick={() => setShowTutorialModal(false)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200">
                닫기
              </button>
              <button
                onClick={() => { setShowTutorialModal(false); setShowInquiryModal(true); }}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold hover:from-cyan-600 hover:to-blue-600 flex items-center justify-center gap-2"
              >
                <FiPhone /> 시스템 문의
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 시스템 문의 모달 */}
      {showInquiryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white p-6 relative">
              <button onClick={() => { setShowInquiryModal(false); setInquirySubmitted(false); }} className="absolute top-4 right-4 text-white/80 hover:text-white">
                <FiX className="w-6 h-6" />
              </button>
              <div className="text-4xl mb-2">📞</div>
              <h3 className="text-2xl font-black">시스템 문의</h3>
              <p className="text-orange-100 mt-1">1:1 전담 상담을 받아보세요!</p>
            </div>

            <div className="p-6">
              {inquirySubmitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiCheck className="w-8 h-8 text-green-500" />
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 mb-2">문의가 접수되었습니다!</h4>
                  <p className="text-slate-600 mb-6">
                    담당자가 빠른 시간 내에<br />연락드리겠습니다.
                  </p>
                  <button
                    onClick={() => { setShowInquiryModal(false); setInquirySubmitted(false); }}
                    className="px-6 py-3 bg-green-500 text-white rounded-xl font-semibold"
                  >
                    확인
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 rounded-xl p-4 mb-6">
                    <p className="text-blue-800 text-sm">
                      <strong>🎯 1:1 전담 상담</strong><br />
                      크루즈 마케터 시스템에 대해 궁금한 점을<br />
                      전담 상담사가 자세히 안내해드립니다.
                    </p>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1">이름</label>
                      <input
                        type="text"
                        value={inquiryForm.name}
                        onChange={(e) => setInquiryForm({ ...inquiryForm, name: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        placeholder="이름을 입력하세요"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1">연락처</label>
                      <input
                        type="tel"
                        value={inquiryForm.phone}
                        onChange={(e) => setInquiryForm({ ...inquiryForm, phone: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        placeholder="010-0000-0000"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleInquirySubmit}
                    disabled={submittingInquiry}
                    className="w-full py-4 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:from-orange-600 hover:to-yellow-600 disabled:opacity-50"
                  >
                    {submittingInquiry ? (
                      <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                    ) : (
                      <>
                        <FiSend /> 상담 신청하기
                      </>
                    )}
                  </button>

                  <p className="text-center text-xs text-slate-500 mt-4">
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
