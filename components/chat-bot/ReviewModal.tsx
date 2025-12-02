'use client';

import { useEffect, useState, useMemo } from 'react';

interface Review {
  id: number;
  authorName: string;
  title?: string;
  content: string;
  images: string[] | string | null;
  rating: number;
  cruiseLine?: string;
  shipName?: string;
  travelDate?: string;
  createdAt: string;
}

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reviews: Review[];
  cruiseLine?: string;
  shipName?: string;
  initialIndex?: number;
}

export default function ReviewModal({
  isOpen,
  onClose,
  reviews,
  cruiseLine,
  shipName,
  initialIndex = 0,
}: ReviewModalProps) {
  const safeReviews = useMemo(
    () => (Array.isArray(reviews) ? reviews.filter((review) => !!review) : []),
    [reviews],
  );
  const totalReviews = safeReviews.length;
  const clampedInitialIndex = useMemo(() => {
    if (totalReviews === 0) return 0;
    return Math.max(0, Math.min(initialIndex ?? 0, totalReviews - 1));
  }, [initialIndex, totalReviews]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const [currentIndex, setCurrentIndex] = useState(clampedInitialIndex);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(clampedInitialIndex);
    }
  }, [clampedInitialIndex, isOpen]);

  const hasReviews = totalReviews > 0;
  const safeIndex = hasReviews ? Math.max(0, Math.min(currentIndex, totalReviews - 1)) : 0;
  const review = hasReviews ? safeReviews[safeIndex] : null;

  const goPrev = () => {
    if (!hasReviews) return;
    setCurrentIndex((prev) => (prev - 1 + totalReviews) % totalReviews);
  };

  const goNext = () => {
    if (!hasReviews) return;
    setCurrentIndex((prev) => (prev + 1) % totalReviews);
  };

  const currentReviewImages = useMemo(() => {
    if (!review) return [];
    const { images } = review;
    if (!images) return [];
    if (Array.isArray(images)) {
      return images.filter((img) => typeof img === 'string' && img.trim().length > 0);
    }
    if (typeof images === 'string') {
      const trimmed = images.trim();
      if (!trimmed) return [];
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.filter((img) => typeof img === 'string' && img.trim().length > 0);
        }
        if (trimmed.startsWith('/')) {
          return [trimmed];
        }
      } catch {
        if (trimmed.startsWith('/')) {
          return [trimmed];
        }
      }
    }
    return [];
  }, [review]);

  if (!isOpen) return null;

  const renderImages = (reviewImages: string[]) => {
    if (reviewImages.length === 0) {
      return (
        <div className="flex items-center justify-center bg-gray-100 rounded-lg border border-dashed border-gray-300 py-8 px-4 text-gray-500 text-sm">
          첨부된 사진이 없어요. 글 내용을 확인해 주세요.
        </div>
      );
    }

    if (reviewImages.length === 1) {
      return (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={reviewImages[0]}
          alt={`${review?.authorName || '고객'}님의 후기 사진`}
          className="w-full h-auto max-h-[360px] object-cover rounded-xl shadow-lg border border-gray-200"
        />
      );
    }

    if (reviewImages.length === 2) {
      return (
        <div className="grid grid-cols-2 gap-4">
          {reviewImages.map((image, index) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={`${image}-${index}`}
              src={image}
              alt={`${review?.authorName || '고객'}님의 후기 사진 ${index + 1}`}
              className="w-full h-48 object-cover rounded-xl shadow-lg border border-gray-200"
            />
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-4">
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={reviewImages[0]}
          alt={`${review?.authorName || '고객'}님의 후기 사진 1`}
          className="w-full h-full max-h-80 object-cover rounded-xl shadow-lg border border-gray-200 col-span-2"
        />
        {reviewImages.slice(1, 5).map((image, index) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={`${image}-${index + 1}`}
            src={image}
            alt={`${review?.authorName || '고객'}님의 후기 사진 ${index + 2}`}
            className="w-full h-40 object-cover rounded-xl shadow-lg border border-gray-200"
          />
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-lg flex justify-between items-center z-10">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span>💬</span>
              실제 고객 후기
            </h2>
            <p className="text-sm text-blue-100 mt-1">
              {cruiseLine && shipName
                ? `실제 ${cruiseLine} ${shipName} 크루즈를 다녀오시고 크루즈닷 AI와 함께 즐거우셨다는 고객님의 후기를 확인해보세요!`
                : cruiseLine
                  ? `실제 ${cruiseLine} 크루즈를 다녀오시고 크루즈닷 AI와 함께 즐거우셨다는 고객님의 후기를 확인해보세요!`
                  : '실제로 다녀오시고 크루즈닷 AI와 함께 즐거우셨다는 고객님의 후기를 확인해보세요!'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-3xl font-bold w-10 h-10 flex items-center justify-center rounded-full hover:bg-blue-800 transition-colors"
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!hasReviews ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">아직 후기가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                  {review?.authorName.charAt(0)}
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-2xl font-bold text-gray-900">{review?.authorName}님</span>
                    <div className="flex text-yellow-400 text-xl">
                      {'★'.repeat(review?.rating ?? 0)}{'☆'.repeat(5 - (review?.rating ?? 0))}
                    </div>
                    {totalReviews > 1 && (
                      <span className="ml-auto text-sm text-blue-100 bg-blue-800 px-3 py-1 rounded-full">
                        {safeIndex + 1} / {totalReviews}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 flex flex-wrap gap-2">
                    {review?.cruiseLine && <span>🚢 {review.cruiseLine}</span>}
                    {review?.shipName && <span>· {review.shipName}</span>}
                    {review?.travelDate && (
                      <span>· 🗓️ {new Date(review.travelDate).toLocaleDateString('ko-KR')}</span>
                    )}
                  </div>
                </div>
              </div>

              {review?.title && (
                <h3 className="text-2xl font-semibold text-gray-900 leading-snug">{review.title}</h3>
              )}

              <div className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap">
                {review?.content}
              </div>

              {renderImages(currentReviewImages)}

              {totalReviews > 1 && (
                <div className="flex items-center justify-between gap-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={goPrev}
                    className="flex-1 py-3 bg-white border border-blue-200 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    ← 이전 후기
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    다음 후기 →
                  </button>
                </div>
              )}

              {totalReviews > 1 && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-500">다른 후기들도 둘러보세요</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {safeReviews.map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setCurrentIndex(index)}
                        className={`text-left p-4 rounded-lg border transition-colors ${index === safeIndex
                            ? 'border-blue-500 bg-blue-50 text-blue-800'
                            : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                      >
                        <p className="text-sm font-semibold truncate mb-1">
                          {item.title || `${item.authorName}님 후기`}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {item.cruiseLine || '크루즈닷 고객'}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 rounded-b-lg">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-bold text-lg hover:bg-blue-700 transition-colors shadow-md"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

