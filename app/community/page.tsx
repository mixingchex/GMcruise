// app/community/page.tsx
// 리뷰/커뮤니티 페이지

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect, useCallback } from 'react';
import ReviewCarousel from '@/components/community/ReviewCarousel';
import KakaoChannelButton from '@/components/KakaoChannelButton';
import KakaoShareButton from '@/components/KakaoShareButton';

interface Review {
  id: number;
  authorName: string;
  title?: string;
  content: string;
  images: string[];
  rating: number;
  cruiseLine?: string;
  shipName?: string;
  travelDate?: string;
  createdAt: string;
}

interface CommunityPost {
  id: number;
  title: string;
  content: string;
  category: string;
  authorName?: string;
  views: number;
  likes: number;
  comments: number;
  createdAt: string;
}

export default function CommunityPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [postsWithKeywordInComments, setPostsWithKeywordInComments] = useState<number[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');

  const loadPosts = useCallback((category: string = 'all', keyword: string = '') => {
    setLoading(true);
    const categoryParam = category === 'all' ? '' : `&category=${category}`;
    const searchParam = keyword ? `&search=${encodeURIComponent(keyword)}` : '';
    fetch(`/api/community/posts?limit=50${categoryParam}${searchParam}`)
      .then(res => res.json())
      .then(data => {
        console.log('[Community] API Response:', data);
        if (data.ok) {
          console.log('[Community] Loaded', data.posts?.length || 0, 'posts for category:', category);
          setPosts(data.posts || []);
          setPostsWithKeywordInComments(data.postsWithKeywordInComments || []);
        } else {
          // 샘플 데이터
          setPosts([
            {
              id: 1,
              title: '크루즈 여행 필수 준비물 체크리스트',
              content: '크루즈 여행을 떠나기 전에 준비해야 할 필수 준비물들을 정리해봤습니다. 여권, 비자, 여행 보험 등 꼭 챙겨야 할 것들을 체크리스트로 만들어봤어요!',
              category: 'travel-tip',
              authorName: '홍길동',
              views: 234,
              likes: 34,
              comments: 12,
              createdAt: '2025-01-20'
            },
            {
              id: 2,
              title: '알래스카 크루즈 언제 가는 게 좋을까요?',
              content: '알래스카 크루즈 여행을 계획 중인데, 가장 좋은 시기는 언제인지 궁금합니다. 빙하를 보기 좋은 시기와 날씨 정보를 알고 싶어요!',
              category: 'qna',
              authorName: '김영희',
              views: 156,
              likes: 21,
              comments: 8,
              createdAt: '2025-01-18'
            },
            {
              id: 3,
              title: '지중해 크루즈 7박 8일 여행 후기',
              content: '지중해 크루즈 여행을 다녀왔습니다! 이탈리아, 그리스, 스페인을 돌아보며 정말 아름다운 추억을 만들었어요. 일정을 공유해드릴게요!',
              category: 'schedule',
              authorName: '박민수',
              views: 412,
              likes: 58,
              comments: 25,
              createdAt: '2025-01-15'
            }
          ]);
        }
        setLoading(false);
      })
      .catch(() => {
        // 샘플 데이터 설정
        setPosts([
          {
            id: 1,
            title: '크루즈 여행 필수 준비물 체크리스트',
            content: '크루즈 여행을 떠나기 전에 준비해야 할 필수 준비물들을 정리해봤습니다.',
            category: 'travel-tip',
            authorName: '홍길동',
            views: 234,
            likes: 34,
            comments: 12,
            createdAt: '2025-01-20'
          },
          {
            id: 2,
            title: '알래스카 크루즈 언제 가는 게 좋을까요?',
            content: '알래스카 크루즈 여행을 계획 중인데, 가장 좋은 시기는 언제인지 궁금합니다.',
            category: 'qna',
            authorName: '김영희',
            views: 156,
            likes: 21,
            comments: 8,
            createdAt: '2025-01-18'
          },
          {
            id: 3,
            title: '지중해 크루즈 7박 8일 여행 후기',
            content: '지중해 크루즈 여행을 다녀왔습니다! 이탈리아, 그리스, 스페인을 돌아보며 정말 아름다운 추억을 만들었어요.',
            category: 'schedule',
            authorName: '박민수',
            views: 412,
            likes: 58,
            comments: 25,
            createdAt: '2025-01-15'
          }
        ]);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    // 로그인 상태 확인 (커뮤니티 전용)
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setIsLoggedIn(!!(data.ok && data.user));
      })
      .catch(() => {
        setIsLoggedIn(false);
      });

    // 커뮤니티 게시글 로드
    loadPosts(selectedCategory, searchKeyword);
  }, [selectedCategory, searchKeyword, loadPosts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchKeyword(searchInput.trim());
  };

  const handleSearchClear = () => {
    setSearchInput('');
    setSearchKeyword('');
  };

  const handleReviewParticipateClick = () => {
    router.push('/community/reviews/write');
  };

  const handleReviewWriteClick = () => {
    router.push('/community/reviews/write');
  };

  const handlePostWriteClick = () => {
    router.push('/community/write');
  };

  const renderCommunityCard = (post: CommunityPost) => {
    const categoryInfo = getCategoryLabel(post.category);
    const isRecommended = searchKeyword ? containsSearchTerm(post, searchKeyword) : false;
    const linkHref =
      post.category === 'cruisedot-news'
        ? `/community/cruisedot-news?post=${post.id}`
        : `/community/posts/${post.id}`;

    return (
      <div
        key={post.id}
        className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-xl hover:border-blue-300 transition-all group relative flex flex-col gap-4"
      >
        {isRecommended && (
          <div className="absolute top-4 right-4 z-10">
            <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-red-600 text-white shadow-lg animate-pulse">
              추천
            </span>
          </div>
        )}
        <div className="flex-1">
          <Link href={linkHref} className="block">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${categoryInfo.color}`}>
                {categoryInfo.label}
              </span>
              <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                {searchKeyword ? highlightSearchTerm(post.title, searchKeyword) : post.title}
              </h3>
            </div>
            <p className="text-gray-600 mb-4 leading-relaxed line-clamp-3 group-hover:text-gray-700 transition-colors">
              {searchKeyword ? highlightSearchTerm(post.content, searchKeyword) : post.content}
            </p>
            <div className="flex items-center gap-6 text-sm text-gray-500 pt-4 border-t border-gray-100">
              <span className="flex items-center gap-1">
                👤 <span className="font-medium text-gray-700">{post.authorName || '익명'}</span>
              </span>
              <span className="flex items-center gap-1">
                👁️ <span className="font-medium text-gray-700">{post.views}</span>
              </span>
              <span className="flex items-center gap-1">
                💬 <span className="font-medium text-gray-700">{post.comments}</span>
              </span>
              <span className="flex items-center gap-1">
                👍 <span className="font-medium text-gray-700">{post.likes}</span>
              </span>
              <span className="ml-auto text-sm text-gray-500 whitespace-nowrap">
                {new Date(post.createdAt).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
          </Link>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-t border-gray-100 pt-4">
          <KakaoShareButton
            title={`[크루즈 커뮤니티] ${post.title}`}
            description={`${post.authorName || '익명'}님의 경험을 읽어보세요.`}
            imageUrl="/images/ai-cruise-logo.png"
            buttonText="카카오톡으로 공유"
          />
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <Link
              href="https://www.cruiseai.co.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-sm font-semibold rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md hover:shadow-lg"
            >
              크루즈 가이드 3일 체험 로그인
            </Link>
            <Link
              href="https://leadgeny.kr/i/yog"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-white text-indigo-700 text-sm font-semibold rounded-xl border-2 border-indigo-200 hover:border-indigo-400 transition-all shadow-sm hover:shadow-md"
            >
              크루즈 여행 가성비갑 만나기
            </Link>
          </div>
        </div>
      </div>
    );
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, { label: string; color: string }> = {
      'travel-tip': { label: '여행팁', color: 'bg-blue-100 text-blue-800' },
      'destination': { label: '관광지추천', color: 'bg-purple-100 text-purple-800' },
      'qna': { label: '질문 답변', color: 'bg-green-100 text-green-800' },
      'cruisedot-news': { label: '크루즈닷늬우스', color: 'bg-rose-100 text-rose-800' },
      'general': { label: '일반', color: 'bg-gray-100 text-gray-800' }
    };
    return labels[category] || labels['general'];
  };

  // 검색어 하이라이트 함수
  const highlightSearchTerm = (text: string, keyword: string) => {
    if (!keyword || !text) return text;
    // 정규식 특수문자 이스케이프
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedKeyword})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) => {
      // 대소문자 구분 없이 매칭 확인
      if (part.toLowerCase() === keyword.toLowerCase()) {
        return (
          <span key={index} className="text-red-600 font-bold bg-red-50 px-1 rounded">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // 검색어가 포함되어 있는지 확인 (제목, 내용, 또는 댓글)
  const containsSearchTerm = (post: CommunityPost, keyword: string) => {
    if (!keyword) return false;
    const lowerKeyword = keyword.toLowerCase();
    const titleMatch = post.title?.toLowerCase().includes(lowerKeyword);
    const contentMatch = post.content?.toLowerCase().includes(lowerKeyword);
    // 댓글에 키워드가 있는 게시글도 추천
    const commentMatch = postsWithKeywordInComments.includes(post.id);
    return titleMatch || contentMatch || commentMatch;
  };

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* 이전으로 가기 버튼 */}
          <div className="mb-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
            >
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium">이전으로 가기</span>
            </Link>
          </div>

          {/* 카카오톡 채널 추가 배너 */}
          <div className="mb-6">
            <KakaoChannelButton variant="banner" />
          </div>

          {/* 헤더 */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              리뷰/커뮤니티
            </h1>
            <p className="text-xl text-gray-600 mb-6">
              크루즈 여행자들과 정보를 공유하고 소통하는 공간입니다.
            </p>
            <div className="flex flex-col gap-3 items-center mb-8">
              <KakaoShareButton
                title="크루즈닷 커뮤니티에서 생생한 후기 만나보세요"
                description="크루즈몰 회원들이 남긴 후기와 꿀팁을 카카오톡으로 친구에게 공유해 보세요!"
                imageUrl="/images/ai-cruise-logo.png"
                buttonText="카카오톡으로 커뮤니티 공유하기"
              />
              <p className="text-sm text-gray-500">
                현재 보고 있는 커뮤니티 페이지 링크가 카카오톡으로 공유됩니다.
              </p>
            </div>
            {/* 크루즈닷 후기 참여 이벤트 참가 버튼 */}
            {isLoggedIn ? (
              <button
                onClick={handleReviewParticipateClick}
                className="inline-flex items-center gap-2 px-8 py-4 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold text-lg rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
              >
                <span>✍️</span>
                <span>크루즈닷 후기 참여 이벤트 참가</span>
              </button>
            ) : (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 max-w-md mx-auto">
                <p className="text-blue-800 font-semibold mb-3">
                  후기 작성 및 커뮤니티 글쓰기를 이용하시려면 회원가입 또는 로그인이 필요합니다.
                </p>
                <div className="flex gap-3 justify-center">
                  <Link
                    href="/signup"
                    className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    회원가입
                  </Link>
                  <Link
                    href="/community/login"
                    className="px-6 py-2 bg-white text-blue-600 font-semibold rounded-lg border-2 border-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    로그인
                  </Link>
                </div>
              </div>
            )}
          </div>
            {/* 리뷰 섹션 */}
          <div className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-900">크루즈 리뷰</h2>
              {isLoggedIn && (
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleReviewWriteClick}
                    className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    후기 작성
                  </button>
                  <Link href="/community/reviews" className="text-blue-600 hover:text-blue-700 font-medium">
                    전체보기 →
                  </Link>
                </div>
              )}
              {!isLoggedIn && (
                <Link href="/community/reviews" className="text-blue-600 hover:text-blue-700 font-medium">
                  전체보기 →
                </Link>
              )}
            </div>
            {/* 후기 캐러셀 (3개씩 보이도록) */}
            <ReviewCarousel />
          </div>

          {/* 커뮤니티 섹션 */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-900">커뮤니티</h2>
            </div>
            
            <div className="flex flex-col gap-8">
              <div className="space-y-6">
            {/* 검색 바 */}
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                  <form onSubmit={handleSearch} className="flex flex-col gap-3 md:flex-row">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="키워드를 입력하세요 (제목, 내용 검색)"
                    className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <svg
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {searchKeyword && (
                    <button
                      type="button"
                      onClick={handleSearchClear}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                    <div className="flex gap-3">
                <button
                  type="submit"
                        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors w-full md:w-auto"
                >
                  검색
                </button>
                {searchKeyword && (
                  <button
                    type="button"
                    onClick={handleSearchClear}
                          className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors w-full md:w-auto"
                  >
                    초기화
                  </button>
                )}
                    </div>
              </form>
              {searchKeyword && (
                <div className="mt-3 text-sm text-gray-600">
                      <span className="font-semibold">&quot;{searchKeyword}&quot;</span> 검색 결과
                </div>
              )}
            </div>
            
            {/* 카테고리 탭 */}
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => handleCategoryClick('all')}
                  className={`px-6 py-2.5 font-semibold rounded-lg shadow-md hover:shadow-lg transition-all ${
                    selectedCategory === 'all'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  전체
                </button>
                <button 
                  onClick={() => handleCategoryClick('travel-tip')}
                  className={`px-6 py-2.5 font-semibold rounded-lg transition-colors ${
                    selectedCategory === 'travel-tip'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  여행팁
                </button>
                <button 
                  onClick={() => handleCategoryClick('destination')}
                  className={`px-6 py-2.5 font-semibold rounded-lg transition-colors ${
                    selectedCategory === 'destination'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  관광지추천
                </button>
                <button 
                  onClick={() => handleCategoryClick('qna')}
                  className={`px-6 py-2.5 font-semibold rounded-lg transition-colors ${
                    selectedCategory === 'qna'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  질문 답변
                </button>
                    <Link
                      href="/community/cruisedot-news"
                      className="flex items-center gap-2 px-6 py-2.5 font-semibold rounded-lg shadow-md bg-gradient-to-r from-rose-500 to-rose-600 text-white transition hover:from-rose-400 hover:to-rose-600"
                    >
                      <span role="img" aria-hidden>🚢</span>
                      크루즈닷늬우스 바로가기
                    </Link>
              </div>
            </div>

            {/* 게시글 목록 */}
                <div className="space-y-4">
              {posts.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100">
                  <p className="text-gray-500 text-lg mb-4">
                    {searchKeyword 
                          ? (
                            <>
                              <span className="font-semibold">&quot;{searchKeyword}&quot;</span>에 대한 검색 결과가 없습니다.
                            </>
                          )
                      : selectedCategory === 'all' 
                        ? '등록된 게시글이 없습니다.' 
                        : `${getCategoryLabel(selectedCategory).label} 카테고리에 등록된 게시글이 없습니다.`}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {searchKeyword 
                      ? '다른 키워드로 검색해보세요.'
                      : '첫 게시글을 작성해보세요!'}
                  </p>
                </div>
              ) : (
                posts.map((post) => {
                      const linkHref =
                        post.category === 'cruisedot-news'
                          ? `/community/cruisedot-news?post=${post.id}`
                          : `/community/posts/${post.id}`;
                  const categoryInfo = getCategoryLabel(post.category);
                  const isRecommended = searchKeyword ? containsSearchTerm(post, searchKeyword) : false;
                  return (
                    <Link
                      key={post.id}
                          href={linkHref}
                      className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer border border-gray-100 block group relative"
                    >
                      {/* 추천 태그 */}
                      {isRecommended && (
                        <div className="absolute top-4 right-4 z-10">
                          <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-red-600 text-white shadow-lg animate-pulse">
                            추천
                          </span>
                        </div>
                      )}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${categoryInfo.color}`}>
                              {categoryInfo.label}
                            </span>
                            <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {searchKeyword ? highlightSearchTerm(post.title, searchKeyword) : post.title}
                            </h3>
                          </div>
                          <p className="text-gray-600 mb-4 leading-relaxed line-clamp-3 group-hover:text-gray-700 transition-colors">
                            {searchKeyword ? highlightSearchTerm(post.content, searchKeyword) : post.content}
                          </p>
                        </div>
                        <span className="text-sm text-gray-500 ml-4 whitespace-nowrap">
                          {new Date(post.createdAt).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-gray-500 pt-4 border-t border-gray-100">
                        <span className="flex items-center gap-1">
                          👤 <span className="font-medium text-gray-700">{post.authorName || '익명'}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          👁️ <span className="font-medium text-gray-700">{post.views}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          💬 <span className="font-medium text-gray-700">{post.comments}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          👍 <span className="font-medium text-gray-700">{post.likes}</span>
                        </span>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>

            {/* 글쓰기 버튼 */}
            {isLoggedIn ? (
              <div className="text-center pt-6">
                <button
                  onClick={handlePostWriteClick}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all"
                >
                  <span>✏️</span>
                  <span>글쓰기</span>
                </button>
              </div>
            ) : (
              <div className="text-center pt-6">
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 max-w-md mx-auto">
                  <p className="text-blue-800 font-semibold mb-3">
                    커뮤니티 글쓰기를 이용하시려면 회원가입 또는 로그인이 필요합니다.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Link
                      href="/signup"
                      className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      회원가입
                    </Link>
                    <Link
                      href="/community/login"
                      className="px-6 py-2 bg-white text-blue-600 font-semibold rounded-lg border-2 border-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      로그인
                    </Link>
                  </div>
                </div>
              </div>
            )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA 배너 */}
      <section className="mt-20">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 text-white rounded-3xl shadow-2xl px-6 py-10 md:px-12 md:py-12 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-cyan-100 mb-2">
                커뮤니티에서 바로 예약 문의까지
              </p>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4 leading-snug">
                크루즈 가이드 3일 체험 &nbsp;
                <span className="text-yellow-300">상담 신청</span>
              </h2>
              <p className="text-lg text-cyan-50 max-w-2xl">
                커뮤니티에서 본 후기처럼 떠나고 싶다면? 전문 상담사가 72시간 무료 체험과 크루즈몰 이용 방법을 친절히 안내해 드립니다.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <Link
                href="https://www.cruiseai.co.kr"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center px-6 py-4 bg-white text-indigo-700 font-bold rounded-2xl shadow-lg hover:bg-indigo-50 transition-all text-base md:text-lg"
              >
                크루즈 가이드 3일 체험 로그인
              </Link>
              <Link
                href="https://leadgeny.kr/i/yog"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center px-6 py-4 bg-indigo-900/40 text-white font-bold rounded-2xl border border-white/30 hover:bg-indigo-900/60 transition-all text-base md:text-lg"
              >
                크루즈 여행 가성비갑 만나기
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}








