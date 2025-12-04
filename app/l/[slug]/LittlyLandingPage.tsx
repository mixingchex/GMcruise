'use client';

import { useState, useEffect } from 'react';
import { FiLink, FiExternalLink, FiShoppingBag, FiCalendar, FiBell, FiChevronLeft, FiChevronRight, FiX, FiPlay, FiImage, FiClock } from 'react-icons/fi';
import { DayPicker } from 'react-day-picker';
import { ko } from 'react-day-picker/locale';
import { format } from 'date-fns';
import 'react-day-picker/dist/style.css';
import { getProxyImageUrl } from '@/lib/utils';

// 텍스트에서 URL을 찾아 클릭 가능한 링크로 변환하는 함수
function renderTextWithLinks(text: string) {
  // URL 패턴 매칭 (http, https, www로 시작하는 링크)
  const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const parts = text.split(urlPattern);

  return parts.map((part, index) => {
    if (part.match(urlPattern)) {
      const href = part.startsWith('www.') ? `https://${part}` : part;
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

interface Profile {
  id: number;
  displayName: string;
  bio: string;
  profileImage: string | null;
  kakaoLink: string | null;
  instagramHandle: string | null;
  youtubeChannel: string | null;
  blogLink: string | null;
  threadLink: string | null;
  customLinks: Array<{ label: string; url: string; isActive: boolean }>;
  mallUserId: string;
  galleryImages: string[];
  featuredImages: string[];
  youtubeVideoId: string | null;
  youtubeVideoUrl: string | null; // Added to match MobilePreview
  youtubeVideoUrls?: string[]; // Added to match MobilePreview
  schedules?: Schedule[];
}

interface Schedule {
  date: string;
  title: string;
  type: 'cruise' | 'live' | 'other';
  description?: string;
}

interface Product {
  id: number;
  productCode: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  basePrice: number | null;
  cruiseLine: string | null;
  shipName: string | null;
  departurePort: string | null;
  duration: number | null;
  region: string | null;
  packageName?: string;
  isUrgent?: boolean;
  isMainProduct?: boolean;
  isPopular?: boolean;
  isRecommended?: boolean;
  isPremium?: boolean;
  isGeniePack?: boolean;
  isDomestic?: boolean;
  isJapan?: boolean;
  isBudget?: boolean;
  tags?: string | string[];
}

interface LittlyLandingPageProps {
  profile: Profile;
}

// 태그 영어 → 한글 변환 함수
function translateTagToKorean(tag: string): string {
  const tagMap: Record<string, string> = {
    'popular': '인기',
    'recommended': '추천',
    'premium': '프리미엄',
    'genie': '지니팩',
    'geniepack': '지니팩',
    'domestic': '국내',
    'japan': '일본',
    'budget': '저예산',
    'urgent': '긴급',
    'main': '주력',
    'mainproduct': '주력',
    'new': '신규',
    'hot': '핫딜',
    'sale': '할인',
    'best': '베스트',
    'special': '특가',
  };

  const tagLower = tag.toLowerCase().replace(/^#/, '').trim();
  return tagMap[tagLower] || tag;
}

export default function LittlyLandingPage({ profile }: LittlyLandingPageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [youtubeIndex, setYoutubeIndex] = useState(0);
  const [galleryModal, setGalleryModal] = useState<{ open: boolean; index: number }>({ open: false, index: 0 });
  const [featuredModal, setFeaturedModal] = useState<{ open: boolean; index: number }>({ open: false, index: 0 });
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [scheduleModal, setScheduleModal] = useState<{ open: boolean; date: string; schedules: Schedule[] }>({ open: false, date: '', schedules: [] });

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    const daySchedules = profile.schedules?.filter(s => s.date === dateStr) || [];

    if (daySchedules.length > 0) {
      setScheduleModal({ open: true, date: dateStr, schedules: daySchedules });
    }
    setSelectedDate(date);
  };

  // SNS 링크 URL 생성
  const getInstagramUrl = (handle: string) => {
    if (handle.startsWith('http')) return handle;
    if (handle.startsWith('@')) return `https://instagram.com/${handle.slice(1)}`;
    return `https://instagram.com/${handle}`;
  };

  const getYoutubeUrl = (channel: string) => {
    if (channel.startsWith('http')) return channel;
    if (channel.startsWith('@')) return `https://youtube.com/${channel}`;
    return `https://youtube.com/@${channel}`;
  };

  // 활성화된 SNS 링크 수집
  const activeLinks: Array<{ label: string; url: string; icon: string }> = [];

  if (profile.kakaoLink) {
    activeLinks.push({ label: '카카오톡', url: profile.kakaoLink, icon: '💬' });
  }
  if (profile.threadLink) {
    activeLinks.push({ label: '스레드', url: profile.threadLink, icon: '🧵' });
  }
  if (profile.instagramHandle) {
    activeLinks.push({ label: '인스타그램', url: getInstagramUrl(profile.instagramHandle), icon: '📷' });
  }
  if (profile.blogLink) {
    activeLinks.push({ label: '블로그', url: profile.blogLink, icon: '✍️' });
  }
  if (profile.youtubeChannel) {
    activeLinks.push({ label: '유튜브', url: getYoutubeUrl(profile.youtubeChannel), icon: '📺' });
  }

  // 커스텀 링크 추가
  profile.customLinks.forEach(link => {
    if (link.isActive && link.label.trim() && link.url.trim()) {
      activeLinks.push({ label: link.label, url: link.url, icon: '🔗' });
    }
  });

  // 포스터 캐러셀 자동 전환
  useEffect(() => {
    if (profile.featuredImages.length > 1) {
      const interval = setInterval(() => {
        setFeaturedIndex((prev) => (prev + 1) % profile.featuredImages.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [profile.featuredImages.length]);

  // 유튜브 동영상 ID 추출
  const getYoutubeVideoId = (url: string | null): string | null => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  };

  // 유튜브 동영상 URL 배열 파싱
  const parseYoutubeVideoUrls = (): string[] => {
    // youtubeVideoUrls가 직접 제공되면 사용 (DB 스키마에 따라 다를 수 있음, 여기서는 profile 객체에 있다고 가정)
    if (profile.youtubeVideoUrls && Array.isArray(profile.youtubeVideoUrls)) {
      return profile.youtubeVideoUrls.filter((url: any) => url && typeof url === 'string' && url.trim());
    }
    // youtubeVideoUrl이 있으면 파싱
    if (!profile.youtubeVideoUrl) return [];
    try {
      const parsed = typeof profile.youtubeVideoUrl === 'string'
        ? JSON.parse(profile.youtubeVideoUrl)
        : profile.youtubeVideoUrl;
      if (Array.isArray(parsed)) {
        return parsed.filter((url: any) => url && typeof url === 'string' && url.trim());
      }
      return [profile.youtubeVideoUrl].filter(Boolean) as string[];
    } catch {
      return [profile.youtubeVideoUrl].filter(Boolean) as string[];
    }
  };

  const youtubeVideoUrls = parseYoutubeVideoUrls();
  const youtubeVideoIds = youtubeVideoUrls.map(url => getYoutubeVideoId(url)).filter((id): id is string => id !== null);

  // 유튜브 캐러셀 자동 전환
  useEffect(() => {
    if (youtubeVideoIds.length > 1) {
      const interval = setInterval(() => {
        setYoutubeIndex((prev) => (prev + 1) % youtubeVideoIds.length);
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [youtubeVideoIds.length]);

  // 상품 로드
  useEffect(() => {
    const loadProducts = async () => {
      if (!profile.mallUserId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // MobilePreview와 동일한 API 호출 (limit=6)
        const res = await fetch(`/api/public/products?mallUserId=${profile.mallUserId}&limit=6`);
        const data = await res.json();
        if (data.ok && data.products) {
          const filteredProducts = data.products.filter((product: any) => {
            return product.productCode && product.basePrice;
          });
          setProducts(filteredProducts);
        }
      } catch (error) {
        console.error('Failed to load products:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [profile.mallUserId]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-purple-50">
      <div className="max-w-[430px] mx-auto px-4 py-8 shadow-2xl min-h-screen bg-white">
        {/* 1. 대표 이미지 (유튜브 썸네일 사이즈 - 16:9 비율) - 최상단 배치 */}
        {profile.featuredImages.length > 0 && (
          <div className="bg-white rounded-3xl shadow-xl mb-6 overflow-hidden">
            {/* 크루즈닷 로고 및 텍스트 배너 */}
            <div className="flex items-center justify-center gap-2 bg-white py-2.5 px-4 border-b-2 border-purple-200">
              <img
                src="/images/ai-cruise-logo.png"
                alt="크루즈닷"
                className="w-6 h-6 object-contain"
              />
              <span className="text-sm font-bold text-purple-600 whitespace-nowrap">크루즈닷</span>
            </div>
            {/* 대표 이미지 */}
            <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
              <button
                onClick={() => setFeaturedModal({ open: true, index: featuredIndex })}
                className="w-full h-full cursor-pointer block relative"
              >
                <img
                  src={getProxyImageUrl(profile.featuredImages[featuredIndex])}
                  alt={`Featured ${featuredIndex + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </button>
              {profile.featuredImages.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFeaturedIndex((prev) => (prev - 1 + profile.featuredImages.length) % profile.featuredImages.length);
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full z-10"
                  >
                    <FiChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFeaturedIndex((prev) => (prev + 1) % profile.featuredImages.length);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full z-10"
                  >
                    <FiChevronRight className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                    {profile.featuredImages.map((_, i) => (
                      <div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${i === featuredIndex ? 'bg-white' : 'bg-white/50'
                          }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* 2. 프로필 섹션 */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-6 text-center">
          <div className="relative inline-block mb-4">
            {profile.profileImage ? (
              <img
                src={getProxyImageUrl(profile.profileImage)}
                alt={profile.displayName}
                className="w-24 h-24 rounded-full object-cover border-4 border-purple-200"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-3xl font-bold">
                {profile.displayName.charAt(0)}
              </div>
            )}
          </div>

          <h1 className="text-xl font-bold text-gray-900 mb-2">{profile.displayName}</h1>
          {profile.bio && (
            <p className="text-gray-600 text-xs mb-4">{profile.bio}</p>
          )}

          {/* 링크 버튼들 */}
          {activeLinks.length > 0 && (
            <div className="space-y-2">
              {activeLinks.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                  <span className="text-lg">{link.icon}</span>
                  <span>{link.label}</span>
                  <FiExternalLink className="w-3 h-3" />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* 3. 크루즈 사진 갤러리 */}
        {profile.galleryImages.length > 0 && (
          <div className="bg-white rounded-3xl shadow-xl p-4 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">크루즈 사진</h2>
            <div className="grid grid-cols-3 gap-1.5">
              {profile.galleryImages.map((imageUrl, index) => (
                <button
                  key={index}
                  onClick={() => setGalleryModal({ open: true, index })}
                  className="aspect-square rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                >
                  <img
                    src={getProxyImageUrl(imageUrl)}
                    alt={`Gallery ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4. 유튜브 동영상 */}
        {youtubeVideoIds.length > 0 && (
          <div className="bg-white rounded-3xl shadow-xl p-4 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">동영상</h2>
            <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${youtubeVideoIds[youtubeIndex]}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
              {youtubeVideoIds.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setYoutubeIndex((prev) => (prev - 1 + youtubeVideoIds.length) % youtubeVideoIds.length);
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full z-10"
                  >
                    <FiChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setYoutubeIndex((prev) => (prev + 1) % youtubeVideoIds.length);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full z-10"
                  >
                    <FiChevronRight className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                    {youtubeVideoIds.map((_, i) => (
                      <div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${i === youtubeIndex ? 'bg-white' : 'bg-white/50'
                          }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* 5. 나의 판매몰 상품 정보 */}
        {profile.mallUserId && (
          <div className="bg-white rounded-3xl shadow-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <FiShoppingBag className="w-4 h-4 text-purple-600" />
              <h2 className="text-lg font-bold text-gray-900">추천 상품</h2>
            </div>
            {loading ? (
              <div className="text-center py-4 text-gray-500 text-sm">로딩 중...</div>
            ) : products.length > 0 ? (
              <div className="space-y-2">
                {products.slice(0, 3).map((product) => {
                  // 태그 파싱
                  let tags: string[] = [];
                  if (product.isUrgent) tags.push('urgent');
                  if (product.isMainProduct) tags.push('main');
                  if (product.isPopular) tags.push('popular');
                  if (product.isRecommended) tags.push('recommended');
                  if (product.isPremium) tags.push('premium');
                  if (product.isGeniePack) tags.push('genie');
                  if (product.isDomestic) tags.push('domestic');
                  if (product.isJapan) tags.push('japan');
                  if (product.isBudget) tags.push('budget');

                  if (product.tags) {
                    if (Array.isArray(product.tags)) {
                      const parsedTags = product.tags.map((tag: any) => tag?.toString() || '').filter(Boolean);
                      tags.push(...parsedTags);
                    } else if (typeof product.tags === 'string') {
                      try {
                        const parsed = JSON.parse(product.tags);
                        if (Array.isArray(parsed)) {
                          const parsedTags = parsed.map((t: any) => t?.toString() || '').filter(Boolean);
                          tags.push(...parsedTags);
                        } else {
                          tags.push(product.tags);
                        }
                      } catch {
                        const splitTags = product.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
                        tags.push(...splitTags);
                      }
                    }
                  }

                  const uniqueTags = Array.from(new Set(tags)).slice(0, 3);
                  const koreanTags = uniqueTags.map(tag => translateTagToKorean(tag));
                  const productName = product.packageName || product.title || '상품명 없음';

                  return (
                    <a
                      key={product.id}
                      href={`/products/${product.productCode}?partner=${profile.mallUserId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex gap-3">
                        {product.thumbnail && (
                          <img
                            src={product.thumbnail}
                            alt={productName}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
                            {productName}
                          </h3>
                          {product.basePrice && (
                            <p className="text-purple-600 font-bold text-xs mb-1">
                              {product.basePrice.toLocaleString('ko-KR')}원
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1">
                            {koreanTags.map((tag, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-purple-50 text-purple-600 text-[10px] rounded font-medium">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </a>
                  );
                })}

                {/* 전체 상품 보기 */}
                <a
                  href={`/${profile.mallUserId}/shop`}
                  className="block text-center py-2 text-purple-600 text-sm font-semibold hover:text-purple-700 mt-2"
                >
                  전체 상품 보기 →
                </a>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500 text-sm">
                등록된 상품이 없습니다.
              </div>
            )}
          </div>
        )}

        {/* 일정 및 알림 섹션 */}
        {/* 일정 및 알림 섹션 */}
        {profile.schedules && profile.schedules.length > 0 && (
          <div className="bg-white rounded-3xl shadow-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <FiCalendar className="w-4 h-4 text-purple-600" />
              <h2 className="text-lg font-bold text-gray-900">일정 및 알림</h2>
            </div>
            <div className="flex justify-center">
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                locale={ko}
                modifiers={{
                  hasSchedule: (date) => profile.schedules?.some(s => s.date === format(date, 'yyyy-MM-dd')) || false,
                }}
                modifiersClassNames={{
                  hasSchedule: 'font-bold text-purple-600 after:content-["•"] after:block after:text-purple-600 after:text-xs after:-mt-1',
                  selected: 'bg-purple-600 text-white',
                }}
                styles={{
                  caption: { color: '#4b5563' },
                  head_cell: { color: '#6b7280' },
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 갤러리 모달 */}
      {galleryModal.open && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setGalleryModal({ open: false, index: 0 })}
        >
          <button
            onClick={() => setGalleryModal({ open: false, index: 0 })}
            className="absolute top-4 right-4 p-2 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors z-10"
          >
            <FiX className="w-6 h-6" />
          </button>
          {profile.galleryImages.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setGalleryModal({
                    open: true,
                    index: (galleryModal.index - 1 + profile.galleryImages.length) % profile.galleryImages.length,
                  });
                }}
                className="absolute left-4 p-2 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors z-10"
              >
                <FiChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setGalleryModal({
                    open: true,
                    index: (galleryModal.index + 1) % profile.galleryImages.length,
                  });
                }}
                className="absolute right-4 p-2 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors z-10"
              >
                <FiChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
          <img
            src={getProxyImageUrl(profile.galleryImages[galleryModal.index])}
            alt={`Gallery ${galleryModal.index + 1}`}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* 대표 이미지 모달 */}
      {featuredModal.open && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setFeaturedModal({ open: false, index: 0 })}
        >
          <button
            onClick={() => setFeaturedModal({ open: false, index: 0 })}
            className="absolute top-4 right-4 p-2 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors z-10"
          >
            <FiX className="w-6 h-6" />
          </button>
          {profile.featuredImages.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newIndex = (featuredModal.index - 1 + profile.featuredImages.length) % profile.featuredImages.length;
                  setFeaturedModal({ open: true, index: newIndex });
                  setFeaturedIndex(newIndex);
                }}
                className="absolute left-4 p-2 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors z-10"
              >
                <FiChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newIndex = (featuredModal.index + 1) % profile.featuredImages.length;
                  setFeaturedModal({ open: true, index: newIndex });
                  setFeaturedIndex(newIndex);
                }}
                className="absolute right-4 p-2 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors z-10"
              >
                <FiChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
          <img
            src={getProxyImageUrl(profile.featuredImages[featuredModal.index])}
            alt={`Featured ${featuredModal.index + 1}`}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* 일정 상세 모달 */}
      {
        scheduleModal.open && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setScheduleModal({ ...scheduleModal, open: false })}
          >
            <div
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  {format(new Date(scheduleModal.date), 'M월 d일')} 일정
                </h3>
                <button
                  onClick={() => setScheduleModal({ ...scheduleModal, open: false })}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {scheduleModal.schedules.map((schedule, idx) => (
                  <div key={idx} className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-white text-purple-600 font-bold border border-purple-200 shadow-sm">
                        {schedule.type === 'cruise' ? '🚢 크루즈' : schedule.type === 'live' ? '📺 라이브' : '📅 기타'}
                      </span>
                    </div>
                    <h4 className="font-bold text-gray-900 mb-1">{schedule.title}</h4>
                    {schedule.description && (
                      <p className="text-sm text-gray-600">{renderTextWithLinks(schedule.description)}</p>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setScheduleModal({ ...scheduleModal, open: false })}
                className="w-full mt-4 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        )
      }
    </div >
  );
}
