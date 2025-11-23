'use client';

import { useState, useEffect } from 'react';
import { FiLink, FiExternalLink, FiShoppingBag, FiCalendar, FiBell, FiChevronLeft, FiChevronRight, FiX } from 'react-icons/fi';

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
}

interface LittlyLandingPageProps {
  profile: Profile;
}

export default function LittlyLandingPage({ profile }: LittlyLandingPageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [galleryModal, setGalleryModal] = useState<{ open: boolean; index: number }>({ open: false, index: 0 });
  const [featuredModal, setFeaturedModal] = useState<{ open: boolean; index: number }>({ open: false, index: 0 });

  useEffect(() => {
    // 판매몰 상품 로드
    const loadProducts = async () => {
      try {
        const res = await fetch(`/api/public/products?mallUserId=${profile.mallUserId}&limit=6`);
        const data = await res.json();
        if (data.ok && data.products) {
          setProducts(data.products);
        }
      } catch (error) {
        console.error('Failed to load products:', error);
      } finally {
        setLoading(false);
      }
    };

    if (profile.mallUserId) {
      loadProducts();
    } else {
      setLoading(false);
    }
  }, [profile.mallUserId]);

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
    activeLinks.push({ label: link.label, url: link.url, icon: '🔗' });
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-purple-50">
      <div className="max-w-md mx-auto px-4 py-8">
        {/* 1. 프로필 사진 */}
        <div className="bg-white rounded-3xl shadow-xl p-8 mb-6 text-center">
          <div className="relative inline-block mb-4">
            {profile.profileImage ? (
              <img
                src={profile.profileImage}
                alt={profile.displayName}
                className="w-32 h-32 rounded-full object-cover border-4 border-purple-200"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-4xl font-bold">
                {profile.displayName.charAt(0)}
              </div>
            )}
          </div>
          
          {/* 2. 표시이름, 프로필 소개 */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{profile.displayName}</h1>
          {profile.bio && (
            <p className="text-gray-600 text-sm">{profile.bio}</p>
          )}
        </div>

        {/* 3. 대표 이미지 (유튜브 썸네일 사이즈 - 16:9 비율) */}
        {profile.featuredImages.length > 0 && (
          <div className="bg-white rounded-3xl shadow-xl mb-6 overflow-hidden">
            {/* 크루즈닷 로고 및 텍스트 배너 - 별도 섹션 */}
            <div className="flex items-center justify-center gap-2 bg-white py-3 px-4 border-b-2 border-purple-200">
              <img
                src="/images/ai-cruise-logo.png"
                alt="크루즈닷"
                className="w-8 h-8 object-contain"
              />
              <span className="text-base font-bold text-purple-600 whitespace-nowrap">크루즈닷</span>
            </div>
            {/* 대표 이미지 - 유튜브 썸네일 비율 (16:9) */}
            <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
              <button
                onClick={() => setFeaturedModal({ open: true, index: featuredIndex })}
                className="w-full h-full cursor-pointer block relative"
              >
                <img
                  src={profile.featuredImages[featuredIndex]}
                  alt={`Featured ${featuredIndex + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
              {profile.featuredImages.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFeaturedIndex((prev) => (prev - 1 + profile.featuredImages.length) % profile.featuredImages.length);
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors z-10"
                  >
                    <FiChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFeaturedIndex((prev) => (prev + 1) % profile.featuredImages.length);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors z-10"
                  >
                    <FiChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                    {profile.featuredImages.map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          i === featuredIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* 4. 크루즈 사진 갤러리 (1:1 정사각형) */}
        {profile.galleryImages.length > 0 && (
          <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">크루즈 사진</h2>
            <div className="grid grid-cols-3 gap-2">
              {profile.galleryImages.map((imageUrl, index) => (
                <button
                  key={index}
                  onClick={() => setGalleryModal({ open: true, index })}
                  className="aspect-square rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                >
                  <img
                    src={imageUrl}
                    alt={`Gallery ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 5. 유튜브 동영상 */}
        {profile.youtubeVideoId && (
          <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">동영상</h2>
            <div className="aspect-video rounded-lg overflow-hidden">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${profile.youtubeVideoId}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </div>
        )}

        {/* 6. 나의 판매몰 상품 정보 */}
        {profile.mallUserId && (
          <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <FiShoppingBag className="w-5 h-5 text-purple-600" />
              <h2 className="text-xl font-bold text-gray-900">추천 상품</h2>
            </div>
            {loading ? (
              <div className="text-center py-8 text-gray-500">로딩 중...</div>
            ) : products.length > 0 ? (
              <div className="space-y-3">
                {products.map((product) => (
                  <a
                    key={product.id}
                    href={`/${profile.mallUserId}/shop/products/${product.productCode}`}
                    className="block p-4 border border-gray-200 rounded-xl hover:border-purple-300 hover:shadow-md transition-all"
                  >
                    <div className="flex gap-4">
                      {product.thumbnail && (
                        <img
                          src={product.thumbnail}
                          alt={product.title}
                          className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-base">
                          {product.title}
                        </h3>
                        {product.description && (
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {product.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                          {product.cruiseLine && (
                            <span className="px-2 py-0.5 bg-gray-100 rounded">🚢 {product.cruiseLine.split('(')[0].trim()}</span>
                          )}
                          {product.shipName && (
                            <span className="px-2 py-0.5 bg-gray-100 rounded">⛴️ {product.shipName.split('(')[0].trim()}</span>
                          )}
                          {product.departurePort && (
                            <span className="px-2 py-0.5 bg-gray-100 rounded">📍 {product.departurePort}</span>
                          )}
                          {product.duration && (
                            <span className="px-2 py-0.5 bg-gray-100 rounded">⏱️ {product.duration}박{product.duration + 1}일</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
                
                {/* 7. 전체 상품 보기 */}
                <a
                  href={`/${profile.mallUserId}/shop`}
                  className="block text-center py-3 text-purple-600 font-semibold hover:text-purple-700"
                >
                  전체 상품 보기 →
                </a>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                등록된 상품이 없습니다.
              </div>
            )}
          </div>
        )}

        {/* 8. SNS 링크들 */}
        {activeLinks.length > 0 && (
          <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">연결하기</h2>
            <div className="space-y-3">
              {activeLinks.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl px-6 py-4 font-semibold hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
                >
                  <span className="text-xl">{link.icon}</span>
                  <span>{link.label}</span>
                  <FiExternalLink className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* 일정 및 알림 섹션 (향후 구현) */}
        <div className="bg-white rounded-3xl shadow-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <FiCalendar className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">일정 및 알림</h2>
          </div>
          <p className="text-gray-500 text-sm text-center py-4">
            일정 및 알림 기능은 곧 추가될 예정입니다.
          </p>
        </div>
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
            src={profile.galleryImages[galleryModal.index]}
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
            src={profile.featuredImages[featuredModal.index]}
            alt={`Featured ${featuredModal.index + 1}`}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

