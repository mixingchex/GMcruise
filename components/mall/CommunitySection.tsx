'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { FiEye, FiHeart, FiMessageCircle, FiClock, FiChevronLeft, FiChevronRight, FiYoutube } from 'react-icons/fi';
import { STATIC_NEWS_POSTS } from '@/app/community/cruisedot-news/news-data';

interface CommunityPost {
  id: number | string;
  title: string;
  content: string;
  category: string;
  authorName: string;
  images?: string[];
  views: number;
  likes: number;
  comments: number;
  createdAt: string;
}

interface CommunityNewsPost extends CommunityPost {
  href: string;
}

const categoryLabels: { [key: string]: string } = {
  'travel-tip': '여행 팁',
  'qna': '질문답변',
  'schedule': '일정 공유',
  'destination': '여행지 추천',
  'review': '후기',
  'all': '전체'
};

interface CommunitySectionProps {
  config?: {
    title?: string;
    description?: string;
    linkText?: string;
    linkUrl?: string;
  };
}

export default function CommunitySection({ config }: CommunitySectionProps) {
  const [recentPosts, setRecentPosts] = useState<CommunityPost[]>([]);
  const [popularPosts, setPopularPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  // 초기값으로 정적 뉴스 설정 (로딩 중에도 표시)
  const [newsPosts, setNewsPosts] = useState<CommunityNewsPost[]>(() => {
    return STATIC_NEWS_POSTS.slice(0, 12).map((post) => ({
      id: `static-${post.id}`,
      title: post.title,
      content: post.summary,
      category: 'cruisedot-news',
      authorName: '크루즈닷 본사',
      images: [],
      views: post.baseViews,
      likes: post.baseLikes,
      comments: Math.max(12, Math.floor(post.baseLikes / 2)),
      createdAt: post.publishedAt,
      href: `/community/cruisedot-news?post=${post.id}`,
    })) as CommunityNewsPost[];
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const recentScrollRef = useRef<HTMLDivElement>(null);
  const popularScrollRef = useRef<HTMLDivElement>(null);
  const newsScrollRef = useRef<HTMLDivElement>(null);

  const title = config?.title ?? '💬 우리끼리 크루즈닷 커뮤니티';
  const description = config?.description ?? '크루즈 여행자들과 정보를 공유하고 소통해보세요';
  const linkText = config?.linkText ?? '커뮤니티 전체 보기';
  const linkUrl = config?.linkUrl ?? '/community';

  useEffect(() => {
    console.log('[CommunitySection] 컴포넌트 마운트, 게시글 로드 시작');

    // 로그인 상태 확인
    const authAbortController = new AbortController();
    const authTimeoutId = setTimeout(() => authAbortController.abort(), 3000);

    fetch('/api/auth/me', {
      credentials: 'include',
      signal: authAbortController.signal,
    })
      .then(res => res.json())
      .then(data => {
        clearTimeout(authTimeoutId);
        // 모든 로그인한 사용자가 게시글을 볼 수 있도록 변경
        const loggedIn = data.ok && !!data.user;
        console.log('[CommunitySection] 로그인 상태:', loggedIn);
        setIsLoggedIn(loggedIn);
      })
      .catch(() => {
        clearTimeout(authTimeoutId);
        console.log('[CommunitySection] 로그인 상태 확인 실패, 비로그인으로 처리');
        setIsLoggedIn(false);
      });

    // 게시글 로드 시작 (로딩 상태는 loadPosts 내부에서 관리)
    loadPosts().finally(() => {
      // 게시글 로드 완료 후 로딩 상태 해제
      setLoading(false);
      console.log('[CommunitySection] 게시글 로드 완료');
    });
  }, []);

  const loadPosts = async () => {
    try {
      // 모든 API 호출을 병렬로 처리
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 10000); // 10초 타임아웃으로 증가

      // 최근 게시글 6개
      const recentResponse = fetch('/api/community/posts?limit=6', {
        signal: abortController.signal,
      });

      // 인기 게시글 (조회수 + 좋아요 기준) 6개
      const popularResponse = fetch('/api/community/posts?limit=20', {
        signal: abortController.signal,
      });

      // 크루즈뉘우스 미리보기 게시글
      const newsResponse = fetch('/api/community/posts?limit=20&category=cruisedot-news', {
        signal: abortController.signal,
      });

      // 모든 응답을 병렬로 처리
      const [recentRes, popularRes, newsRes] = await Promise.allSettled([
        recentResponse,
        popularResponse,
        newsResponse,
      ]);

      clearTimeout(timeoutId);

      // 최근 게시글 처리
      if (recentRes.status === 'fulfilled') {
        try {
          const response = recentRes.value;
          if (!response.ok) {
            console.error('[CommunitySection] 최근 게시글 API 응답 오류:', response.status, response.statusText);
          } else {
            const recentData = await response.json();
            if (recentData.ok && Array.isArray(recentData.posts)) {
              console.log('[CommunitySection] 최근 게시글 로드 성공:', recentData.posts.length, '개');
              setRecentPosts(recentData.posts.slice(0, 6));
            } else {
              console.warn('[CommunitySection] 최근 게시글 데이터 형식 오류:', recentData);
            }
          }
        } catch (error) {
          console.error('[CommunitySection] 최근 게시글 파싱 오류:', error);
        }
      } else {
        console.error('[CommunitySection] 최근 게시글 API 호출 실패:', recentRes.reason);
      }

      // 인기 게시글 처리
      if (popularRes.status === 'fulfilled') {
        try {
          const response = popularRes.value;
          if (!response.ok) {
            console.error('[CommunitySection] 인기 게시글 API 응답 오류:', response.status, response.statusText);
          } else {
            const popularData = await response.json();
            if (popularData.ok && Array.isArray(popularData.posts)) {
              // 조회수 + 좋아요 기준으로 정렬
              const sorted = [...popularData.posts].sort((a, b) => {
                const scoreA = a.views + (a.likes * 10);
                const scoreB = b.views + (b.likes * 10);
                return scoreB - scoreA;
              });
              console.log('[CommunitySection] 인기 게시글 로드 성공:', sorted.length, '개');
              setPopularPosts(sorted.slice(0, 6));
            } else {
              console.warn('[CommunitySection] 인기 게시글 데이터 형식 오류:', popularData);
            }
          }
        } catch (error) {
          console.error('[CommunitySection] 인기 게시글 파싱 오류:', error);
        }
      } else {
        console.error('[CommunitySection] 인기 게시글 API 호출 실패:', popularRes.reason);
      }

      // 크루즈뉘우스 미리보기 게시글 처리
      if (newsRes.status === 'fulfilled') {
        try {
          const response = newsRes.value;
          if (!response.ok) {
            console.error('[CommunitySection] 크루즈뉘우스 API 응답 오류:', response.status, response.statusText);
            // API 실패 시 fallback
            const fallbackNews = STATIC_NEWS_POSTS.slice(0, 12).map((post) => ({
              id: `static-${post.id}`,
              title: post.title,
              content: post.summary,
              category: 'cruisedot-news',
              authorName: '크루즈닷 본사',
              images: [],
              views: post.baseViews,
              likes: post.baseLikes,
              comments: Math.max(12, Math.floor(post.baseLikes / 2)),
              createdAt: post.publishedAt,
              href: `/community/cruisedot-news?post=${post.id}`,
            })) as CommunityNewsPost[];
            setNewsPosts(fallbackNews);
          } else {
            const newsData = await response.json();

            if (newsData.ok && Array.isArray(newsData.posts)) {
              console.log('[CommunitySection] 크루즈뉘우스 로드 성공:', newsData.posts.length, '개');
              const today = new Date();
              today.setHours(0, 0, 0, 0);

              const mappedNews = newsData.posts
                .filter((post: any) => post?.title)
                .map((post: any) => {
                  const postDate = new Date(post.createdAt);
                  postDate.setHours(0, 0, 0, 0);
                  const isToday = postDate.getTime() === today.getTime();

                  return {
                    id: post.id,
                    title: post.title,
                    content: post.summary || post.highlight || post.content || '',
                    category: post.category || 'cruisedot-news',
                    authorName: post.authorName || '크루즈닷 본사',
                    images: Array.isArray(post.images) ? post.images : [],
                    views: typeof post.views === 'number' ? post.views : 0,
                    likes: typeof post.likes === 'number' ? post.likes : 0,
                    comments: typeof post.comments === 'number' ? post.comments : 0,
                    createdAt: post.createdAt || new Date().toISOString(),
                    href: `/community/cruisedot-news?post=db-${post.id}`,
                    isToday: isToday, // 오늘 생성된 글인지 표시
                  };
                }) as (CommunityNewsPost & { isToday?: boolean })[];

              // 최신순 정렬 (오늘 생성된 글을 맨 앞으로, 그 다음 최신순)
              const sortedNews = mappedNews.sort((a, b) => {
                // 오늘 생성된 글을 맨 앞으로
                const aIsToday = a.isToday || false;
                const bIsToday = b.isToday || false;
                if (aIsToday && !bIsToday) return -1;
                if (!aIsToday && bIsToday) return 1;

                // 둘 다 오늘이거나 둘 다 아니면 최신순 (최신이 앞으로)
                const aTime = new Date(a.createdAt).getTime();
                const bTime = new Date(b.createdAt).getTime();
                return bTime - aTime; // 최신이 앞으로 (큰 값이 앞으로)
              });

              if (sortedNews.length > 0) {
                setNewsPosts(sortedNews.slice(0, 12) as CommunityNewsPost[]);
              } else {
                // fallback to static news posts when no DB news available
                const fallbackNews = STATIC_NEWS_POSTS.slice(0, 12).map((post) => ({
                  id: `static-${post.id}`,
                  title: post.title,
                  content: post.summary,
                  category: 'cruisedot-news',
                  authorName: '크루즈닷 본사',
                  images: [],
                  views: post.baseViews,
                  likes: post.baseLikes,
                  comments: Math.max(12, Math.floor(post.baseLikes / 2)),
                  createdAt: post.publishedAt,
                  href: `/community/cruisedot-news?post=${post.id}`,
                })) as CommunityNewsPost[];
                setNewsPosts(fallbackNews);
              }
            } else {
              console.warn('[CommunitySection] 크루즈뉘우스 데이터 형식 오류:', newsData);
              // fallback to static news posts when no DB news available
              const fallbackNews = STATIC_NEWS_POSTS.slice(0, 12).map((post) => ({
                id: `static-${post.id}`,
                title: post.title,
                content: post.summary,
                category: 'cruisedot-news',
                authorName: '크루즈닷 본사',
                images: [],
                views: post.baseViews,
                likes: post.baseLikes,
                comments: Math.max(12, Math.floor(post.baseLikes / 2)),
                createdAt: post.publishedAt,
                href: `/community/cruisedot-news?post=${post.id}`,
              })) as CommunityNewsPost[];
              setNewsPosts(fallbackNews);
            }
          }
        } catch (error) {
          console.error('[CommunitySection] 크루즈뉘우스 파싱 오류:', error);
          // fallback to static news posts when no DB news available
          const fallbackNews = STATIC_NEWS_POSTS.slice(0, 12).map((post) => ({
            id: `static-${post.id}`,
            title: post.title,
            content: post.summary,
            category: 'cruisedot-news',
            authorName: '크루즈닷 본사',
            images: [],
            views: post.baseViews,
            likes: post.baseLikes,
            comments: Math.max(12, Math.floor(post.baseLikes / 2)),
            createdAt: post.publishedAt,
            href: `/community/cruisedot-news?post=${post.id}`,
          })) as CommunityNewsPost[];
          setNewsPosts(fallbackNews);
        }
      } else {
        console.error('[CommunitySection] 크루즈뉘우스 API 호출 실패:', newsRes.reason);
        // API 호출 실패 시 fallback
        const fallbackNews = STATIC_NEWS_POSTS.slice(0, 12).map((post) => ({
          id: `static-${post.id}`,
          title: post.title,
          content: post.summary,
          category: 'cruisedot-news',
          authorName: '크루즈닷 본사',
          images: [],
          views: post.baseViews,
          likes: post.baseLikes,
          comments: Math.max(12, Math.floor(post.baseLikes / 2)),
          createdAt: post.publishedAt,
          href: `/community/cruisedot-news?post=${post.id}`,
        })) as CommunityNewsPost[];
        setNewsPosts(fallbackNews);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Failed to load community posts:', error);
        // 에러 발생 시 fallback으로 정적 뉴스 표시
        const fallbackNews = STATIC_NEWS_POSTS.slice(0, 12).map((post) => ({
          id: `static-${post.id}`,
          title: post.title,
          content: post.summary,
          category: 'cruisedot-news',
          authorName: '크루즈닷 본사',
          images: [],
          views: post.baseViews,
          likes: post.baseLikes,
          comments: Math.max(12, Math.floor(post.baseLikes / 2)),
          createdAt: post.publishedAt,
          href: `/community/cruisedot-news?post=${post.id}`,
        })) as CommunityNewsPost[];
        setNewsPosts(fallbackNews);
      }
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '날짜 없음';

    try {
      const date = new Date(dateString);
      const now = new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const postDate = new Date(date);
      postDate.setHours(0, 0, 0, 0);

      // 오늘 생성된 경우
      if (postDate.getTime() === today.getTime()) {
        return '오늘';
      }

      // 어제 생성된 경우
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      if (postDate.getTime() === yesterday.getTime()) {
        return '어제';
      }

      const diff = now.getTime() - date.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (days < 7) return `${days}일 전`;
      if (days < 30) {
        const weeks = Math.floor(days / 7);
        return weeks === 1 ? '1주 전' : `${weeks}주 전`;
      }
      if (days < 365) {
        const months = Math.floor(days / 30);
        return months === 1 ? '1개월 전' : `${months}개월 전`;
      }
      const years = Math.floor(days / 365);
      return years === 1 ? '1년 전' : `${years}년 전`;
    } catch (error) {
      return '날짜 오류';
    }
  };

  const truncateContent = (content: string, maxLength: number = 80) => {
    if (!content) return '';
    const cleaned = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleaned.length <= maxLength) return cleaned;
    return cleaned.substring(0, maxLength) + '...';
  };

  const scrollLeft = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      ref.current.scrollBy({ left: -400, behavior: 'smooth' });
    }
  };

  const scrollRight = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      ref.current.scrollBy({ left: 400, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <section className="container mx-auto px-4 py-16 md:py-20 bg-gray-50">
        <div className="flex flex-col justify-center items-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-6"></div>
          <p className="text-xl md:text-2xl text-gray-700 font-semibold">커뮤니티 게시글을 불러오는 중...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 py-12 md:py-16 bg-white">
      <div className="text-center mb-10 md:mb-12">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[#051C2C] mb-3 md:mb-4">
          {title}
        </h2>
        <p className="text-lg md:text-xl lg:text-2xl text-gray-600 mb-5 md:mb-6 leading-relaxed">
          {description}
        </p>
        <Link
          href={linkUrl}
          className="inline-flex items-center gap-2 px-6 py-3 md:px-8 md:py-4 bg-gradient-to-r from-[#D4AF37] via-yellow-400 to-[#D4AF37] bg-[length:200%_auto] animate-gradient text-[#051C2C] text-base md:text-lg font-bold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 min-h-[48px] md:min-h-[52px] transition-all"
        >
          <span>{linkText}</span>
          <span>→</span>
        </Link>
      </div>



      {/* 최근 게시글 섹션 - 모든 사용자가 볼 수 있음 */}
      {recentPosts.length > 0 && (
        <div className="mb-12 md:mb-16">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <h3 className="text-2xl md:text-3xl font-black text-[#051C2C]">
              📝 최근 게시글
            </h3>
            <Link
              href={linkUrl}
              className="text-[#051C2C] hover:text-[#D4AF37] font-bold text-base md:text-lg underline decoration-2 underline-offset-4 transition-colors"
            >
              크루즈 커뮤니티 더보기 →
            </Link>
          </div>
          <div className="relative">
            <button
              onClick={() => scrollLeft(recentScrollRef)}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-3 shadow-lg border-2 border-gray-200 hover:border-blue-500 transition-all transform hover:scale-110"
              aria-label="이전 게시글"
            >
              <FiChevronLeft className="w-6 h-6 text-gray-700" />
            </button>
            <div
              ref={recentScrollRef}
              className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
            >
              {recentPosts.map((post) => {
                const postContent = (
                  <>
                    <div className="flex items-start justify-between mb-3">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs md:text-sm font-bold rounded-md whitespace-nowrap">
                        {categoryLabels[post.category] || post.category}
                      </span>
                      <span className="text-gray-500 text-xs md:text-sm font-semibold flex items-center gap-1 whitespace-nowrap">
                        <FiClock className="w-3 h-3 md:w-4 md:h-4" />
                        {formatDate(post.createdAt)}
                      </span>
                    </div>
                    <h4 className="text-base md:text-lg font-bold text-gray-900 mb-2 leading-snug">
                      {post.title}
                    </h4>
                    <p className="text-sm md:text-base text-gray-700 mb-3 leading-relaxed">
                      {truncateContent(post.content, 150)}
                    </p>
                    {post.images && post.images.length > 0 && (
                      <div className="mb-3">
                        <div className="relative w-full h-32 md:h-40 rounded-md overflow-hidden">
                          <img
                            src={post.images[0]}
                            alt={post.title}
                            className="w-full h-full object-cover object-center"
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <span className="text-sm md:text-base font-bold text-gray-700 truncate max-w-[120px]">
                        {post.authorName}
                      </span>
                      <div className="flex items-center gap-3 md:gap-4">
                        <span className="flex items-center gap-1 text-gray-600 text-xs md:text-sm font-semibold whitespace-nowrap">
                          <FiEye className="w-3 h-3 md:w-4 md:h-4" />
                          {post.views.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1 text-red-600 text-xs md:text-sm font-semibold whitespace-nowrap">
                          <FiHeart className="w-3 h-3 md:w-4 md:h-4" />
                          {post.likes.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1 text-blue-600 text-xs md:text-sm font-semibold whitespace-nowrap">
                          <FiMessageCircle className="w-3 h-3 md:w-4 md:h-4" />
                          {post.comments.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </>
                );

                // 모든 사용자가 게시글을 볼 수 있도록 변경 (로그인 불필요)
                return (
                  <Link
                    key={post.id}
                    href={`/community/posts/${post.id}`}
                    className="flex-shrink-0 w-[320px] md:w-[380px] bg-white rounded-lg p-5 md:p-6 shadow-md hover:shadow-xl transition-all border-2 border-gray-100 hover:border-[#D4AF37] block"
                  >
                    {postContent}
                  </Link>
                );
              })}
            </div>
            <button
              onClick={() => scrollRight(recentScrollRef)}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-3 shadow-lg border-2 border-gray-200 hover:border-blue-500 transition-all transform hover:scale-110"
              aria-label="다음 게시글"
            >
              <FiChevronRight className="w-6 h-6 text-gray-700" />
            </button>
          </div>
        </div>
      )}

      {/* 인기 게시글 섹션 - 모든 사용자가 볼 수 있음 */}
      {popularPosts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <h3 className="text-2xl md:text-3xl font-black text-[#051C2C]">
              🔥 인기 게시글
            </h3>
            <Link
              href={linkUrl}
              className="text-[#051C2C] hover:text-[#D4AF37] font-bold text-base md:text-lg underline decoration-2 underline-offset-4 transition-colors"
            >
              크루즈 커뮤니티 더보기 →
            </Link>
          </div>
          <div className="relative">
            <button
              onClick={() => scrollLeft(popularScrollRef)}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-3 shadow-lg border-2 border-gray-200 hover:border-red-500 transition-all transform hover:scale-110"
              aria-label="이전 게시글"
            >
              <FiChevronLeft className="w-6 h-6 text-gray-700" />
            </button>
            <div
              ref={popularScrollRef}
              className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
            >
              {popularPosts.map((post) => {
                const postContent = (
                  <>
                    <div className="flex items-start justify-between mb-3">
                      <span className="px-3 py-1 bg-red-100 text-red-800 text-xs md:text-sm font-bold rounded-md whitespace-nowrap">
                        {categoryLabels[post.category] || post.category}
                      </span>
                      <span className="text-gray-500 text-xs md:text-sm font-semibold flex items-center gap-1 whitespace-nowrap">
                        <FiClock className="w-3 h-3 md:w-4 md:h-4" />
                        {formatDate(post.createdAt)}
                      </span>
                    </div>
                    <h4 className="text-base md:text-lg font-bold text-gray-900 mb-2 leading-snug">
                      {post.title}
                    </h4>
                    <p className="text-sm md:text-base text-gray-700 mb-3 leading-relaxed">
                      {truncateContent(post.content, 150)}
                    </p>
                    {post.images && post.images.length > 0 && (
                      <div className="mb-3">
                        <div className="relative w-full h-32 md:h-40 rounded-md overflow-hidden">
                          <img
                            src={post.images[0]}
                            alt={post.title}
                            className="w-full h-full object-cover object-center"
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <span className="text-sm md:text-base font-bold text-gray-700 truncate max-w-[120px]">
                        {post.authorName}
                      </span>
                      <div className="flex items-center gap-3 md:gap-4">
                        <span className="flex items-center gap-1 text-gray-600 text-xs md:text-sm font-semibold whitespace-nowrap">
                          <FiEye className="w-3 h-3 md:w-4 md:h-4" />
                          {post.views.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1 text-red-600 text-xs md:text-sm font-semibold whitespace-nowrap">
                          <FiHeart className="w-3 h-3 md:w-4 md:h-4" />
                          {post.likes.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1 text-blue-600 text-xs md:text-sm font-semibold whitespace-nowrap">
                          <FiMessageCircle className="w-3 h-3 md:w-4 md:h-4" />
                          {post.comments.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </>
                );

                // 모든 사용자가 게시글을 볼 수 있도록 변경 (로그인 불필요)
                return (
                  <Link
                    key={post.id}
                    href={`/community/posts/${post.id}`}
                    className="flex-shrink-0 w-[320px] md:w-[380px] bg-white rounded-lg p-5 md:p-6 shadow-md hover:shadow-xl transition-all border-2 border-gray-100 hover:border-[#D4AF37] block"
                  >
                    {postContent}
                  </Link>
                );
              })}

            </div>
            <button
              onClick={() => scrollRight(popularScrollRef)}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-3 shadow-lg border-2 border-gray-200 hover:border-red-500 transition-all transform hover:scale-110"
              aria-label="다음 게시글"
            >
              <FiChevronRight className="w-6 h-6 text-gray-700" />
            </button>
          </div>
        </div>
      )}



      {/* 크루즈뉘우스 미리보기 - 항상 표시 */}
      <div className="mt-12 md:mt-16">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-2xl md:text-3xl font-black text-[#051C2C]">
                📰 크루즈뉘우스
              </h3>
              {newsPosts[0] && (() => {
                const firstPost = newsPosts[0] as any;
                const postDate = new Date(firstPost.createdAt);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                postDate.setHours(0, 0, 0, 0);
                const isToday = postDate.getTime() === today.getTime();

                if (isToday) {
                  return (
                    <span className="px-3 py-1 bg-red-500 text-white text-xs md:text-sm font-bold rounded-full animate-pulse">
                      오늘의 뉴스
                    </span>
                  );
                }
                return null;
              })()}
            </div>
            <p className="text-base md:text-lg text-gray-600 font-semibold">
              본사에서 직접 전하는 최신 크루즈 소식과 혜택을 확인해보세요
            </p>
          </div>
          <Link
            href="/community/cruisedot-news"
            className="text-[#051C2C] hover:text-[#D4AF37] font-bold text-base md:text-lg underline decoration-2 underline-offset-4 transition-colors whitespace-nowrap"
          >
            크루즈 뉴스 전체 보기 →
          </Link>
        </div>
        <div className="relative">
          <button
            onClick={() => scrollLeft(newsScrollRef)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-3 shadow-lg border-2 border-gray-200 hover:border-indigo-500 transition-all transform hover:scale-110"
            aria-label="이전 뉴스"
          >
            <FiChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
          <div
            ref={newsScrollRef}
            className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
          >
            {newsPosts.length === 0 ? (
              <div className="flex-shrink-0 w-full text-center py-8 text-gray-500">
                크루즈뉘우스를 불러오는 중...
              </div>
            ) : (
              newsPosts.map((post, index) => {
                const postDate = new Date(post.createdAt);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                postDate.setHours(0, 0, 0, 0);
                const isToday = postDate.getTime() === today.getTime();
                // 정적 뉴스(static-로 시작하는 id)는 "최신" 태그를 붙이지 않음
                // 데이터베이스에서 가져온 실제 뉴스(제가 생성한 글)는 첫 번째 카드에 "최신" 태그 표시
                const isStaticNews = String(post.id).startsWith('static-');
                const isLatest = index === 0 && !isStaticNews;

                return (
                  <Link
                    key={String(post.id)}
                    href={post.href}
                    className={`flex-shrink-0 w-[320px] md:w-[380px] bg-white rounded-lg p-5 md:p-6 shadow-md hover:shadow-xl transition-all border-2 ${isToday && isLatest
                      ? 'border-[#D4AF37] hover:border-[#D4AF37] bg-gradient-to-br from-yellow-50 to-white ring-2 ring-[#D4AF37] ring-opacity-50'
                      : 'border-gray-100 hover:border-[#D4AF37]'
                      }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 text-xs md:text-sm font-bold rounded-md whitespace-nowrap ${isToday && isLatest
                          ? 'bg-red-500 text-white'
                          : 'bg-indigo-100 text-indigo-800'
                          }`}>
                          {isToday && isLatest ? '🔥 오늘의 뉴스' : '크루즈뉘우스'}
                        </span>
                        {isLatest && !isStaticNews && (
                          <span className="px-2 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-md animate-pulse">
                            최신
                          </span>
                        )}
                      </div>
                      <span className="text-gray-500 text-xs md:text-sm font-semibold flex items-center gap-1 whitespace-nowrap">
                        <FiClock className="w-3 h-3 md:w-4 md:h-4" />
                        {formatDate(post.createdAt)}
                      </span>
                    </div>
                    <h4 className="text-base md:text-lg font-bold text-gray-900 mb-2 leading-snug">
                      {post.title}
                    </h4>
                    <p className="text-sm md:text-base text-gray-700 mb-3 leading-relaxed">
                      {truncateContent(post.content, 150)}
                    </p>
                    {post.images && post.images.length > 0 && (
                      <div className="mb-3">
                        <div className="relative w-full h-32 md:h-40 rounded-md overflow-hidden">
                          <img
                            src={post.images[0]}
                            alt={post.title}
                            className="w-full h-full object-cover object-center"
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <span className="text-sm md:text-base font-bold text-gray-700 truncate max-w-[120px]">
                        {post.authorName || '크루즈닷 본사'}
                      </span>
                      <div className="flex items-center gap-3 md:gap-4">
                        <span className="flex items-center gap-1 text-gray-600 text-xs md:text-sm font-semibold whitespace-nowrap">
                          <FiEye className="w-3 h-3 md:w-4 md:h-4" />
                          {post.views.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1 text-red-600 text-xs md:text-sm font-semibold whitespace-nowrap">
                          <FiHeart className="w-3 h-3 md:w-4 md:h-4" />
                          {post.likes.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1 text-blue-600 text-xs md:text-sm font-semibold whitespace-nowrap">
                          <FiMessageCircle className="w-3 h-3 md:w-4 md:h-4" />
                          {post.comments.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
          <button
            onClick={() => scrollRight(newsScrollRef)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-3 shadow-lg border-2 border-gray-200 hover:border-indigo-500 transition-all transform hover:scale-110"
            aria-label="다음 뉴스"
          >
            <FiChevronRight className="w-6 h-6 text-gray-700" />
          </button>
        </div>
      </div>

      {/* 게시글이 없을 때 - 모든 사용자에게 표시 */}
      {!loading && recentPosts.length === 0 && popularPosts.length === 0 && (
        <div className="text-center py-12 md:py-16">
          <p className="text-lg md:text-xl lg:text-2xl text-gray-600 font-semibold mb-5 md:mb-6">
            {isLoggedIn ? '아직 게시글이 없습니다.' : '커뮤니티 게시글을 불러오는 중입니다...'}
          </p>
          {isLoggedIn && (
            <Link
              href="/community/write"
              className="inline-flex items-center gap-2 px-6 py-3 md:px-8 md:py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-base md:text-lg font-bold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 min-h-[48px] md:min-h-[52px]"
            >
              <span>첫 게시글 작성하기</span>
              <span>→</span>
            </Link>
          )}
        </div>
      )}

    </section>
  );
}

