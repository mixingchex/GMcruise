'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { FiCheckSquare, FiDollarSign, FiTool, FiMessageCircle } from 'react-icons/fi';
import { checkTestModeClient, getCorrectPath } from '@/lib/test-mode-client';
import { useEffect } from 'react';

const tools = [
  {
    title: '체크리스트',
    description: '여행 준비물을 체크하고 관리하세요',
    icon: FiCheckSquare,
    href: '/checklist',
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
    href: '/wallet',
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

export default function ToolsPage() {
  const router = useRouter();
  const pathname = usePathname();

  // 경로 보호: 테스트 모드 사용자는 /tools-test로 리다이렉트
  useEffect(() => {
    const checkPath = async () => {
      const testModeInfo = await checkTestModeClient();
      const correctPath = getCorrectPath(pathname || '/tools', testModeInfo);

      if (correctPath !== pathname) {
        router.replace(correctPath);
      }
    };

    checkPath();
  }, [pathname, router]);

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 헤더 */}
        <div className="mb-8">
          {/* 지니채팅 돌아가기 버튼 */}
          <div className="mb-6 flex justify-center">
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 rounded-xl border border-[#FDB931] bg-white px-5 py-2.5 hover:bg-[#FDB931]/10 text-base md:text-lg font-semibold text-[#051C2C] shadow-sm transition-all duration-200 hover:shadow-md"
            >
              <FiMessageCircle className="text-xl" />
              <span>지니채팅 돌아가기</span>
            </Link>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 md:w-28 md:h-28 bg-gradient-to-br from-[#051C2C] to-[#0A2E46] rounded-full mb-5 shadow-2xl">
              <FiTool size={48} className="text-white md:w-12 md:h-12" />
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#051C2C] mb-4 leading-tight">
              <span className="text-[#FDB931]">🛠️</span> 도구함
            </h1>
            <p className="text-lg md:text-xl text-gray-700 font-medium leading-relaxed">
              여행에 유용한 도구들을 모았어요
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
                  border-4 border-transparent hover:border-[#FDB931]
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
                    <div className="bg-[#F5F7FA] rounded-xl p-5 md:p-6 mb-5 border-2 border-[#051C2C]/10">
                      <h3 className="font-bold text-gray-900 mb-3 text-base md:text-lg">주요 기능:</h3>
                      <ul className="space-y-3">
                        {tool.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <span className="text-[#FDB931] mt-1 text-xl flex-shrink-0">✓</span>
                            <span className="text-gray-700 text-base md:text-lg leading-relaxed">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* 예시 */}
                    <div className="bg-[#FDB931]/10 border-2 border-[#FDB931]/30 rounded-xl p-4 md:p-5">
                      <p className="text-gray-800 text-base md:text-lg leading-relaxed">
                        <span className="font-bold">💡 예시:</span> {tool.example}
                      </p>
                    </div>
                  </div>

                  {/* 화살표 */}
                  <div className="flex-shrink-0 text-[#FDB931] transform transition-transform group-hover:translate-x-2">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
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

