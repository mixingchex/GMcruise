import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import LittlyLandingPage from './LittlyLandingPage';

export const dynamic = 'force-dynamic';

interface LittlyPageProps {
  params: Promise<{ slug: string }>;
}

export default async function LittlyPage({ params }: LittlyPageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  // 프로필 찾기
  const profile = await prisma.affiliateProfile.findFirst({
    where: { littlyLinkSlug: slug },
    include: {
      User: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          mallUserId: true,
        },
      },
    },
  });

  if (!profile) {
    notFound();
  }

  // 커스텀 링크 파싱
  let customLinks: Array<{ label: string; url: string; isActive: boolean }> = [];
  if (profile.customLinks) {
    try {
      const parsed = typeof profile.customLinks === 'string'
        ? JSON.parse(profile.customLinks)
        : profile.customLinks;
      customLinks = Array.isArray(parsed) ? parsed : [];
    } catch {
      customLinks = [];
    }
  }

  // 활성화된 링크만 필터링
  const activeCustomLinks = customLinks.filter(link => link.isActive && link.label.trim() && link.url.trim());

  // 갤러리 이미지 파싱
  let galleryImages: string[] = [];
  if (profile.galleryImages) {
    try {
      const parsed = typeof profile.galleryImages === 'string'
        ? JSON.parse(profile.galleryImages)
        : profile.galleryImages;
      galleryImages = Array.isArray(parsed) ? parsed.filter((img: string) => img && img.trim()) : [];
    } catch {
      galleryImages = [];
    }
  }

  // 대표 이미지 파싱
  let featuredImages: string[] = [];
  if (profile.featuredImages) {
    try {
      const parsed = typeof profile.featuredImages === 'string'
        ? JSON.parse(profile.featuredImages)
        : profile.featuredImages;
      featuredImages = Array.isArray(parsed) ? parsed.filter((img: string) => img && img.trim()) : [];
    } catch {
      featuredImages = [];
    }
  }

  // 유튜브 비디오 ID 추출
  const getYoutubeVideoId = (url: string | null): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  return (
    <LittlyLandingPage
      profile={{
        id: profile.id,
        displayName: profile.displayName || profile.User?.name || '이름 없음',
        bio: profile.bio || '',
        profileImage: profile.profileImage,
        kakaoLink: profile.kakaoLink,
        instagramHandle: profile.instagramHandle,
        youtubeChannel: profile.youtubeChannel,
        blogLink: profile.blogLink,
        threadLink: profile.threadLink,
        customLinks: activeCustomLinks,
        mallUserId: profile.User?.mallUserId || '',
        galleryImages,
        featuredImages,
        youtubeVideoId: getYoutubeVideoId(profile.youtubeVideoUrl),
      }}
    />
  );
}

