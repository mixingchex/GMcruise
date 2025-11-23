import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface ShortcutPageProps {
  params: Promise<{ shortCode: string }>;
}

export default async function ShortcutPage({ params }: ShortcutPageProps) {
  const resolvedParams = await params;
  const shortCode = resolvedParams.shortCode;

  // 바로가기 URL로 랜딩페이지 찾기 (endsWith 사용으로 인덱스 효율성 향상)
  const landingPage = await prisma.landingPage.findFirst({
    where: {
      shortcutUrl: {
        endsWith: `/i/${shortCode}`, // 정확한 끝 부분 매칭 (인덱스 활용)
      },
      isActive: true,
      isPublic: true,
    },
  });

  if (!landingPage) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1>페이지를 찾을 수 없습니다</h1>
        <p>요청하신 페이지가 존재하지 않거나 비활성화되었습니다.</p>
      </div>
    );
  }

  // 실제 랜딩페이지로 리다이렉트
  redirect(`/landing/${landingPage.slug}`);
}





