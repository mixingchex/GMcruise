import { Suspense } from 'react';
import { ChatBotPageContent } from '../../page';

interface ShareChatBotPageProps {
  params: { token: string };
}

export default function ShareChatBotPage({ params }: ShareChatBotPageProps) {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">로딩 중...</div>}>
      <ChatBotPageContent shareToken={params.token} />
    </Suspense>
  );
}
