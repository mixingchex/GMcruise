'use client';

import { useState, useEffect } from 'react';
import { FiDollarSign, FiList, FiPieChart, FiChevronLeft } from 'react-icons/fi';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import CurrencyCalculator from './components/CurrencyCalculator';
import ExpenseTracker from './components/ExpenseTracker';
import Statistics from './components/Statistics';
import { trackFeature } from '@/lib/analytics';
import TutorialCountdown from '@/app/chat/components/TutorialCountdown';
import { checkTestModeClient, TestModeInfo, getCorrectPath } from '@/lib/test-mode-client';
import { clearAllLocalStorage } from '@/lib/csrf-client';
import { showError } from '@/components/ui/Toast';
import { logger } from '@/lib/logger';

type Tab = 'calculator' | 'expenses' | 'statistics';

export default function WalletPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<Tab>('calculator');
  const [testModeInfo, setTestModeInfo] = useState<TestModeInfo | null>(null);

  useEffect(() => {
    // 테스트 모드 정보 로드 및 경로 보호
    const loadTestModeInfo = async () => {
      const info = await checkTestModeClient();
      setTestModeInfo(info);

      // 경로 보호: 테스트 모드 사용자는 /wallet-test로 리다이렉트
      const correctPath = getCorrectPath(pathname || '/wallet', info);
      if (correctPath !== pathname) {
        router.replace(correctPath);
      }
    };
    loadTestModeInfo();
  }, [pathname, router]);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        clearAllLocalStorage();
        window.location.href = '/login';
      } else {
        logger.error('[Wallet] 로그아웃 실패');
        showError('로그아웃에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      logger.error('[Wallet] 로그아웃 요청 중 오류 발생:', error);
      showError('로그아웃 중 오류가 발생했습니다.');
    }
  };

  // 기능 사용 추적
  useEffect(() => {
    trackFeature('wallet');
  }, []);

  return (
    <div className="min-h-[100dvh] bg-[#F5F7FA]">
      {/* 72시간 카운트다운 배너 (상단 고정) */}
      {testModeInfo && testModeInfo.isTestMode && (
        <TutorialCountdown testModeInfo={testModeInfo} onLogout={handleLogout} />
      )}

      {/* 헤더 - 튜토리얼 스타일 */}
      <div className="bg-white/95 backdrop-blur shadow-md border-b-2 border-[#051C2C]/10">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            <Link
              href="/chat"
              className="p-1.5 hover:bg-[#FDB931]/10 rounded-lg transition-colors border-2 border-[#FDB931]/30"
              aria-label="뒤로가기"
            >
              <FiChevronLeft className="w-5 h-5 text-[#051C2C]" />
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 md:w-11 md:h-11 bg-gradient-to-br from-[#FDB931] to-[#E1A21E] rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-lg md:text-xl">💰</span>
                </div>
                <div>
                  <h1 className="text-xl md:text-3xl font-extrabold text-[#051C2C] leading-tight">
                    <span className="text-[#FDB931]">여행</span> 가계부
                  </h1>
                  <p className="text-xs md:text-base text-gray-600 leading-relaxed">
                    {testModeInfo && testModeInfo.isTestMode
                      ? '72시간 동안 모든 기능을 무료로 체험해보세요!'
                      : '여행 중 지출을 쉽게 관리하세요!'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 - 튜토리얼 스타일 */}
      <div className="bg-white/95 backdrop-blur border-b-2 border-[#051C2C]/10 sticky top-0 z-10 shadow-md">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-2 py-2">
            <button
              onClick={() => setActiveTab('calculator')}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 md:py-3 rounded-xl transition-all border-2 ${activeTab === 'calculator'
                ? 'bg-gradient-to-r from-[#FDB931] to-[#E1A21E] text-[#051C2C] shadow-lg border-[#FDB931]'
                : 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 hover:bg-gradient-to-r hover:from-[#FDB931]/10 hover:to-[#FDB931]/5 border-gray-200'
                }`}
            >
              <FiDollarSign className="w-5 h-5 md:w-6 md:h-6 mb-1" />
              <span className="text-xs md:text-sm font-semibold">환율 계산기</span>
            </button>

            <button
              onClick={() => setActiveTab('expenses')}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 md:py-3 rounded-xl transition-all border-2 ${activeTab === 'expenses'
                ? 'bg-gradient-to-r from-[#FDB931] to-[#E1A21E] text-[#051C2C] shadow-lg border-[#FDB931]'
                : 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 hover:bg-gradient-to-r hover:from-[#FDB931]/10 hover:to-[#FDB931]/5 border-gray-200'
                }`}
            >
              <FiList className="w-5 h-5 md:w-6 md:h-6 mb-1" />
              <span className="text-xs md:text-sm font-semibold">지출 기록</span>
            </button>

            <button
              onClick={() => setActiveTab('statistics')}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 md:py-3 rounded-xl transition-all border-2 ${activeTab === 'statistics'
                ? 'bg-gradient-to-r from-[#FDB931] to-[#E1A21E] text-[#051C2C] shadow-lg border-[#FDB931]'
                : 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 hover:bg-gradient-to-r hover:from-[#FDB931]/10 hover:to-[#FDB931]/5 border-gray-200'
                }`}
            >
              <FiPieChart className="w-5 h-5 md:w-6 md:h-6 mb-1" />
              <span className="text-xs md:text-sm font-semibold">통계</span>
            </button>
          </div>
        </div>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="max-w-6xl mx-auto px-4 pb-6">
        {activeTab === 'calculator' && <CurrencyCalculator />}
        {activeTab === 'expenses' && <ExpenseTracker />}
        {activeTab === 'statistics' && <Statistics />}
      </div>
    </div>
  );
}
