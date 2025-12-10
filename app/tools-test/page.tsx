'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { FiCheckSquare, FiDollarSign, FiTool, FiArrowLeft, FiMessageCircle } from 'react-icons/fi';
import TutorialCountdown from '@/app/chat/components/TutorialCountdown';
import { checkTestModeClient, TestModeInfo, getCorrectPath } from '@/lib/test-mode-client';
import { clearAllLocalStorage } from '@/lib/csrf-client';

const tools = [
  {
    title: '체크리스트',
    description: '여행 준비물을 체크하고 관리하세요',
    icon: FiCheckSquare,
    href: '/checklist-test',
    color: 'bg-green-100',
    iconColor: 'text-green-600',
    hoverColor: 'hover:bg-green-50',
    emoji: '✅',
    features: [
      '여행 준비물을 항목별로 체크',
      '알림 기능으로 시간 맞춰 알림',
      '여행 전까지 완벽하게 준비',
    ],
    example: '예: 여권, 승선권, 신용카드 등',
  },
  {
    title: '여행 가계부',
    description: '여행 경비를 기록하고 환율을 확인하세요',
    icon: FiDollarSign,
    href: '/wallet-test',
    color: 'bg-blue-100',
    iconColor: 'text-blue-600',
    hoverColor: 'hover:bg-blue-50',
    emoji: '💰',
    features: [
      '카테고리별 지출 기록',
      '실시간 지출 현황 확인',
      '예산 관리 및 분석',
    ],
    example: '예: 식사, 쇼핑, 엔터테인먼트 등',
  },
];

export default function ToolsTestPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [testModeInfo, setTestModeInfo] = useState<TestModeInfo | null>(null);

  useEffect(() => {
    // 테스트 모드 정보 로드 및 경로 보호
    const loadTestModeInfo = async () => {
      const info = await checkTestModeClient();
      setTestModeInfo(info);
      
      // 경로 보호: 일반 사용자는 /tools로 리다이렉트
      const correctPath = getCorrectPath(pathname || '/tools-test', info);
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
        window.location.href = '/login-test';
      } else {
        console.error('로그아웃 실패');
        alert('로그아웃에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('로그아웃 요청 중 오류 발생:', error);
      alert('로그아웃 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      {/* 72시간 카운트다운 배너 (상단 고정) */}
      {testModeInfo && (
        <TutorialCountdown testModeInfo={testModeInfo} onLogout={handleLogout} />
      )}

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 헤더 */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/chat-test')}
            className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 mb-4 transition-colors"
          >
            <FiArrowLeft size={20} />
            <span className="text-base font-medium">뒤로가기</span>
          </button>
          
          {/* 지니채팅 돌아가기 버튼 */}
          <div className="mb-6 flex justify-center">
            <Link
              href="/chat-test"
              className="inline-flex items-center gap-2 rounded-xl border border-purple-300 bg-white px-5 py-2.5 hover:bg-purple-50 text-base md:text-lg font-semibold text-purple-700 shadow-sm transition-all duration-200 hover:shadow-md"
            >
              <FiMessageCircle className="text-xl" />
              <span>크루즈닷 채팅 돌아가기</span>
            </Link>
          </div>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 md:w-28 md:h-28 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mb-5 shadow-xl">
              <FiTool size={48} className="text-white md:w-12 md:h-12" />
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 bg-clip-text text-transparent mb-4 leading-tight">
              🛠️ 도구함
            </h1>
            <p className="text-lg md:text-xl text-gray-700 font-medium leading-relaxed">
              여행에 유용한 도구들을 모았어요
            </p>
            <p className="text-base md:text-lg text-gray-600 mt-3 leading-relaxed">
              72시간 동안 모든 기능을 무료로 체험해보세요!
            </p>
          </div>
        </div>

        {/* 도구 목록 */}
        <div className="space-y-6 mb-8">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className={`
                  block bg-white rounded-3xl shadow-xl p-8
                  transition-all duration-300 transform
                  ${tool.hoverColor} hover:shadow-2xl hover:scale-[1.02]
                  border-4 border-transparent hover:border-purple-300
                `}
              >
                <div className="flex flex-col md:flex-row items-start gap-6">
                  {/* 아이콘 및 이모지 */}
                  <div className="flex-shrink-0 flex items-center gap-4">
                    <div className={`w-20 h-20 ${tool.color} rounded-2xl flex items-center justify-center shadow-lg`}>
                      <Icon size={40} className={tool.iconColor} />
                    </div>
                    <div className="text-6xl">{tool.emoji}</div>
                  </div>

                  {/* 내용 */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-tight">
                      {tool.title}
                    </h2>
                    <p className="text-lg md:text-xl text-gray-700 mb-5 leading-relaxed">
                      {tool.description}
                    </p>

                    {/* 주요 기능 */}
                    <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-5 md:p-6 mb-5 border-2 border-gray-200">
                      <h3 className="font-bold text-gray-900 mb-3 text-base md:text-lg">주요 기능:</h3>
                      <ul className="space-y-3">
                        {tool.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <span className="text-purple-600 mt-1 text-xl flex-shrink-0">✓</span>
                            <span className="text-gray-700 text-base md:text-lg leading-relaxed">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* 예시 */}
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 md:p-5">
                      <p className="text-gray-800 text-base md:text-lg leading-relaxed">
                        <span className="font-bold">💡 예시:</span> {tool.example}
                      </p>
                    </div>
                  </div>

                  {/* 화살표 */}
                  <div className="flex-shrink-0 text-purple-400 transform transition-transform group-hover:translate-x-2">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* CTA 섹션 */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl p-6 md:p-8 text-white text-center shadow-2xl mx-4">
          <h2 className="text-2xl md:text-3xl font-bold mb-5 leading-tight">
            🎁 지금 체험하고, 실제 여행에서 활용하세요!
          </h2>
          <p className="text-lg md:text-xl mb-6 leading-relaxed">
            이 모든 도구를 실제 크루즈 여행에서 사용할 수 있습니다.
            <br className="hidden md:block" />
            <span className="md:hidden"> </span>
            체험 기간 동안 모든 기능을 자유롭게 사용해보세요!
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-4">
              <div className="font-bold text-lg md:text-xl">✅ 체크리스트</div>
              <div className="text-sm md:text-base">준비물 관리</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-4">
              <div className="font-bold text-lg md:text-xl">💰 가계부</div>
              <div className="text-sm md:text-base">지출 관리</div>
            </div>
          </div>
        </div>

        {/* 안내 메시지 */}
        <div className="mt-8 text-center px-4">
          <p className="text-base md:text-lg text-gray-500 leading-relaxed">
            더 많은 도구가 곧 추가됩니다! 🎉
          </p>
        </div>
      </div>
    </div>
  );
}

