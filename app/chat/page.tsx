// 'use client' 쓰지 마세요 (서버 컴포넌트)
import ChatInteractiveUI from './components/ChatInteractiveUI'; // 기존 컴포넌트
import TopBar from "./components/TopBar";
import TripInfoBanner from '@/components/TripInfoBanner'; // TripInfoBanner 임포트
import { getSessionUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { checkTestMode, getCorrectPath } from '@/lib/test-mode';

export default async function ChatPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  // 테스트 모드 사용자만 checkTestMode() 호출 (이중 DB 조회 방지)
  if (user.customerStatus === 'test' || user.customerStatus === 'test-locked') {
    const testModeInfo = await checkTestMode();
    const correctPath = getCorrectPath('/chat', testModeInfo);
    if (correctPath !== '/chat') redirect(correctPath);
  }

  if (!user.onboarded) redirect('/onboarding');

  // 기존 크루즈 가이드 지니 AI (3800 로그인 사용자용)
  return (
    <div className="flex flex-col h-[100dvh] bg-[#F5F7FA]">
      <TopBar />
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden mx-auto max-w-5xl w-full px-4">
        {/* 여행 정보 배너 (오늘의 브리핑 아래에 표시되도록 ChatInteractiveUI에서 처리) */}
        {/* 채팅 UI */}
        <ChatInteractiveUI />
      </main>
    </div>
  );
}