'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiArrowLeft, FiSave, FiUser, FiLink, FiPlus, FiX, FiImage, FiChevronLeft, FiChevronRight, FiPlay, FiExternalLink, FiShoppingBag, FiUpload, FiCheck, FiCopy } from 'react-icons/fi';
import { showError, showSuccess } from '@/components/ui/Toast';

type SnsProfileClientProps = {
  user: {
    id: number;
    name: string | null;
    email: string | null;
    phone: string | null;
    mallUserId: string;
    mallNickname: string | null;
  };
  profile: any;
};

interface CustomLink {
  label: string;
  url: string;
  isActive: boolean;
}

export default function SnsProfileClient({ user, profile }: SnsProfileClientProps) {
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  
  // JSON 필드 파싱 함수들
  const parseCustomLinks = (): CustomLink[] => {
    if (!profile?.customLinks) return [];
    try {
      const parsed = typeof profile.customLinks === 'string' 
        ? JSON.parse(profile.customLinks) 
        : profile.customLinks;
      if (Array.isArray(parsed)) {
        return parsed.map((link: any) => ({
          label: link.label || '',
          url: link.url || '',
          isActive: link.isActive !== undefined ? link.isActive : (link.label && link.url),
        }));
      }
    } catch (e) {
      console.error('[parseCustomLinks] error:', e);
    }
    return [];
  };

  const parseGalleryImages = (): string[] => {
    if (!profile?.galleryImages) return [];
    try {
      const parsed = typeof profile.galleryImages === 'string'
        ? JSON.parse(profile.galleryImages)
        : profile.galleryImages;
      if (Array.isArray(parsed)) {
        return parsed
          .map((img: any) => {
            if (typeof img === 'string') {
              const trimmed = img.trim();
              // [object Object] 체크 및 유효한 URL 경로 체크 (http://, https://, /로 시작하는 경로 허용)
              if (trimmed.includes('[object Object]') || trimmed === '[object Object]' || trimmed.length === 0) {
                return '';
              }
              // http://, https://, 또는 /로 시작하는 경로만 허용
              if (!trimmed.startsWith('http') && !trimmed.startsWith('/')) {
                return '';
              }
              return trimmed;
            }
            if (img && typeof img === 'object' && 'url' in img) {
              const url = typeof img.url === 'string' ? img.url.trim() : '';
              if (url && !url.includes('[object Object]') && (url.startsWith('http') || url.startsWith('/'))) {
                return url;
              }
            }
            return '';
          })
          .filter((url: string) => url.length > 0 && (url.startsWith('http') || url.startsWith('/')));
      }
    } catch (e) {
      console.error('[parseGalleryImages] error:', e, profile?.galleryImages);
    }
    return [];
  };

  const parseFeaturedImages = (): string[] => {
    if (!profile?.featuredImages) return [];
    try {
      const parsed = typeof profile.featuredImages === 'string'
        ? JSON.parse(profile.featuredImages)
        : profile.featuredImages;
      if (Array.isArray(parsed)) {
        return parsed
          .map((img: any) => {
            if (typeof img === 'string') {
              const trimmed = img.trim();
              // [object Object] 체크 및 유효한 URL 경로 체크 (http://, https://, /로 시작하는 경로 허용)
              if (trimmed.includes('[object Object]') || trimmed === '[object Object]' || trimmed.length === 0) {
                return '';
              }
              // http://, https://, 또는 /로 시작하는 경로만 허용
              if (!trimmed.startsWith('http') && !trimmed.startsWith('/')) {
                return '';
              }
              return trimmed;
            }
            if (img && typeof img === 'object' && 'url' in img) {
              const url = typeof img.url === 'string' ? img.url.trim() : '';
              if (url && !url.includes('[object Object]') && (url.startsWith('http') || url.startsWith('/'))) {
                return url;
              }
            }
            return '';
          })
          .filter((url: string) => url.length > 0 && (url.startsWith('http') || url.startsWith('/')));
      }
    } catch (e) {
      console.error('[parseFeaturedImages] error:', e, profile?.featuredImages);
    }
    return [];
  };

  const [formData, setFormData] = useState({
    displayName: profile?.displayName || user.name || '',
    bio: profile?.bio || '',
    profileImage: (() => {
      const img = profile?.profileImage;
      if (!img) return '';
      if (typeof img === 'string') {
        if (img.includes('[object Object]') || !img.startsWith('http')) {
          return '';
        }
        return img;
      }
      return '';
    })(),
    kakaoLink: profile?.kakaoLink || '',
    instagramHandle: profile?.instagramHandle || '',
    youtubeChannel: profile?.youtubeChannel || '',
    blogLink: profile?.blogLink || '',
    threadLink: profile?.threadLink || '',
    customLinks: (() => {
      const parsed = parseCustomLinks();
      return parsed.length > 0 ? parsed : [{ label: '', url: '', isActive: false }];
    })(),
    galleryImages: (() => {
      const parsed = parseGalleryImages();
      const slots = Array(9).fill('');
      parsed.forEach((url, index) => {
        if (index < 9) slots[index] = url;
      });
      return slots;
    })(),
    featuredImages: (() => {
      const parsed = parseFeaturedImages();
      const slots = Array(3).fill('');
      parsed.forEach((url, index) => {
        if (index < 3) slots[index] = url;
      });
      return slots;
    })(),
    youtubeVideoUrls: (() => {
      // 기존 단일 youtubeVideoUrl을 배열로 변환
      if (profile?.youtubeVideoUrl) {
        try {
          const parsed = typeof profile.youtubeVideoUrl === 'string' 
            ? JSON.parse(profile.youtubeVideoUrl) 
            : profile.youtubeVideoUrl;
          if (Array.isArray(parsed)) {
            return parsed.filter((url: any) => url && typeof url === 'string' && url.trim());
          }
          return [profile.youtubeVideoUrl].filter(Boolean);
        } catch {
          return [profile.youtubeVideoUrl].filter(Boolean);
        }
      }
      return [''];
    })(),
  });

  const profileImageUrl = formData.profileImage || null;
  const partnerId = user.mallUserId;

  // 프로필이 변경될 때 formData 업데이트 (유튜브 동영상 링크 포함)
  useEffect(() => {
    if (profile?.youtubeVideoUrl !== undefined) {
      const videoUrls = (() => {
        try {
          const parsed = typeof profile.youtubeVideoUrl === 'string' 
            ? JSON.parse(profile.youtubeVideoUrl) 
            : profile.youtubeVideoUrl;
          if (Array.isArray(parsed)) {
            return parsed.filter((url: any) => url && typeof url === 'string' && url.trim());
          }
          return [profile.youtubeVideoUrl].filter(Boolean);
        } catch {
          return [profile.youtubeVideoUrl].filter(Boolean);
        }
      })();
      setFormData((prev) => ({
        ...prev,
        youtubeVideoUrls: videoUrls.length > 0 ? videoUrls : [''],
      }));
    }
  }, [profile?.youtubeVideoUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { customLinks, galleryImages, featuredImages, youtubeVideoUrls, ...restFormData } = formData;
      
      const filteredCustomLinks = customLinks.filter(link => link.label.trim() && link.url.trim());
      const filteredGalleryImages = galleryImages.filter((img: string) => img && img.trim());
      const filteredFeaturedImages = featuredImages.filter((img: string) => img && img.trim());
      const filteredYoutubeVideoUrls = youtubeVideoUrls.filter((url: string) => url && url.trim());
      
      const res = await fetch('/api/partner/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...restFormData,
          customLinks: filteredCustomLinks.length > 0 ? filteredCustomLinks : null,
          galleryImages: filteredGalleryImages.length > 0 ? filteredGalleryImages : null,
          featuredImages: filteredFeaturedImages.length > 0 ? filteredFeaturedImages : null,
          youtubeVideoUrl: filteredYoutubeVideoUrls.length > 0 
            ? (filteredYoutubeVideoUrls.length === 1 ? filteredYoutubeVideoUrls[0] : JSON.stringify(filteredYoutubeVideoUrls))
            : null,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.message || '프로필 업데이트에 실패했습니다.');
      }

      showSuccess('프로필이 성공적으로 업데이트되었습니다!');
    } catch (error: any) {
      console.error('[SnsProfileClient] Update error:', error);
      showError(error.message || '프로필 업데이트 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const res = await fetch('/api/partner/profile/upload-image', {
        method: 'POST',
        credentials: 'include',
        body: uploadFormData,
      });
      
      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || '이미지 업로드에 실패했습니다.');
      }

      const imageUrl = json.profileImage;
      
      if (typeof imageUrl !== 'string') {
        throw new Error('이미지 URL이 올바르지 않습니다.');
      }
      
      setFormData((prev) => ({
        ...prev,
        profileImage: imageUrl,
      }));
      
      showSuccess('프로필 이미지가 업로드되었습니다!');
    } catch (error: any) {
      console.error('[SnsProfileClient] Image upload error:', error);
      showError(error.message || '이미지 업로드 중 오류가 발생했습니다.');
    } finally {
      setImageUploading(false);
      e.target.value = '';
    }
  };

  const handleGalleryImageUpload = async (index: number, file: File) => {
    setImageUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const res = await fetch('/api/partner/profile/upload-image', {
        method: 'POST',
        credentials: 'include',
        body: uploadFormData,
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || '이미지 업로드에 실패했습니다.');
      }

      const imageUrl = json.profileImage;
      if (typeof imageUrl !== 'string' || !imageUrl.trim()) {
        throw new Error('이미지 URL이 올바르지 않습니다.');
      }
      
      const trimmedUrl = imageUrl.trim();
      console.log('[GalleryImageUpload] Uploaded image URL:', trimmedUrl, 'at index:', index);
      
      setFormData((prev) => {
        const newGalleryImages = [...prev.galleryImages];
        newGalleryImages[index] = trimmedUrl;
        console.log('[GalleryImageUpload] Updated gallery images:', newGalleryImages);
        return { ...prev, galleryImages: newGalleryImages };
      });
      showSuccess('이미지가 업로드되었습니다!');
    } catch (error: any) {
      console.error('[GalleryImageUpload] error:', error);
      showError(error.message || '이미지 업로드 중 오류가 발생했습니다.');
    } finally {
      setImageUploading(false);
    }
  };

  const handleFeaturedImageUpload = async (index: number, file: File) => {
    setImageUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const res = await fetch('/api/partner/profile/upload-image', {
        method: 'POST',
        credentials: 'include',
        body: uploadFormData,
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || '이미지 업로드에 실패했습니다.');
      }

      const imageUrl = json.profileImage;
      if (typeof imageUrl !== 'string' || !imageUrl.trim()) {
        throw new Error('이미지 URL이 올바르지 않습니다.');
      }
      
      const trimmedUrl = imageUrl.trim();
      console.log('[FeaturedImageUpload] Uploaded image URL:', trimmedUrl, 'at index:', index);
      
      setFormData((prev) => {
        const newFeaturedImages = [...prev.featuredImages];
        newFeaturedImages[index] = trimmedUrl;
        console.log('[FeaturedImageUpload] Updated featured images:', newFeaturedImages);
        return { ...prev, featuredImages: newFeaturedImages };
      });
      showSuccess('이미지가 업로드되었습니다!');
    } catch (error: any) {
      console.error('[FeaturedImageUpload] error:', error);
      showError(error.message || '이미지 업로드 중 오류가 발생했습니다.');
    } finally {
      setImageUploading(false);
    }
  };

  const removeGalleryImage = (index: number) => {
    setFormData((prev) => {
      const newGalleryImages = [...prev.galleryImages];
      newGalleryImages[index] = '';
      return { ...prev, galleryImages: newGalleryImages };
    });
  };

  const removeFeaturedImage = (index: number) => {
    setFormData((prev) => {
      const newFeaturedImages = [...prev.featuredImages];
      newFeaturedImages[index] = '';
      return { ...prev, featuredImages: newFeaturedImages };
    });
  };

  const addCustomLink = () => {
    setFormData((prev) => ({
      ...prev,
      customLinks: [...prev.customLinks, { label: '', url: '', isActive: false }],
    }));
  };

  const removeCustomLink = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      customLinks: prev.customLinks.filter((_, i) => i !== index),
    }));
  };

  const updateCustomLink = (index: number, field: 'label' | 'url', value: string) => {
    setFormData((prev) => {
      const newLinks = [...prev.customLinks];
      newLinks[index] = {
        ...newLinks[index],
        [field]: value,
        isActive: newLinks[index].label.trim() && newLinks[index].url.trim() ? true : false,
      };
      if (field === 'label') {
        newLinks[index].label = value;
      } else {
        newLinks[index].url = value;
      }
      newLinks[index].isActive = newLinks[index].label.trim() && newLinks[index].url.trim() ? true : false;
      return { ...prev, customLinks: newLinks };
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 pb-24">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pt-6 md:gap-8 md:px-6 md:pt-10">
        {/* Header */}
        <header className="rounded-2xl bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 p-6 text-white shadow-xl md:rounded-3xl md:p-8">
          <Link
            href={`/partner/${partnerId}/dashboard`}
            className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4 text-sm"
          >
            <FiArrowLeft /> 대시보드로 돌아가기
          </Link>
          <div className="space-y-2">
            <h1 className="text-2xl font-black leading-snug md:text-3xl">나의 SNS 프로필</h1>
            <p className="text-sm text-white/80 md:text-base">
              나의 SNS 프로필을 통해 독립적인 공유 링크를 생성하고 관리하세요.
            </p>
          </div>
        </header>

        {/* Profile Form */}
        <form onSubmit={handleSubmit} className="rounded-3xl bg-white p-8 shadow-lg">
          <div className="space-y-8">
            {/* 나의 SNS 프로필 설정 */}
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-slate-900">
                <FiLink className="text-pink-600" />
                나의 SNS 프로필 설정
              </h2>
              <div className="mb-4 rounded-xl bg-pink-50 border border-pink-200 p-4">
                <p className="text-sm text-pink-700 font-semibold mb-2">
                  ⚠️ 나의 SNS 프로필은 판매몰과 완전히 별개의 독립적인 랜딩 페이지입니다.
                </p>
                <p className="text-sm text-pink-700">
                  나의 SNS 프로필은 프로필 이미지, 갤러리, 포스터 등을 포함한 개인 브랜딩 페이지입니다. 판매몰과는 별도로 관리됩니다.
                </p>
              </div>

              {/* 나의 SNS 프로필 설정 */}
              <div className="space-y-8">
                <div>
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                    <FiUser className="text-pink-600" />
                    프로필 정보
                  </h3>
                  <div className="mb-4 rounded-xl bg-pink-50 border border-pink-200 p-4">
                    <p className="text-sm text-pink-700">
                      나의 SNS 프로필 페이지에 표시될 프로필 정보를 설정합니다.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        프로필 사진
                      </label>
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          {profileImageUrl ? (
                            <img
                              src={profileImageUrl}
                              alt="Profile"
                              className="w-24 h-24 rounded-full object-cover border-4 border-pink-200"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center text-white text-2xl font-bold">
                              {formData.displayName.charAt(0) || '?'}
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="inline-flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg cursor-pointer hover:bg-pink-700 transition-colors">
                            <FiUpload className="w-4 h-4" />
                            {imageUploading ? '업로드 중...' : '이미지 업로드'}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/gif,image/webp"
                              onChange={handleImageUpload}
                              disabled={imageUploading}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        표시 이름
                      </label>
                      <input
                        type="text"
                        value={formData.displayName}
                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                        placeholder="고객에게 표시될 이름"
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        프로필 소개
                      </label>
                      <textarea
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        placeholder="자신을 소개하는 문구를 입력하세요"
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100"
                      />
                    </div>
                  </div>
                </div>

                {/* SNS 링크 설정 */}
                <div>
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                    <FiLink className="text-indigo-600" />
                    SNS 링크
                  </h3>
                  <div className="mb-4 rounded-xl bg-indigo-50 border border-indigo-200 p-4">
                    <p className="text-sm text-indigo-700">
                      SNS 링크를 입력하면 나의 SNS 프로필 페이지에 버튼으로 표시됩니다.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        카카오톡 링크
                      </label>
                      <input
                        type="url"
                        value={formData.kakaoLink}
                        onChange={(e) => setFormData({ ...formData, kakaoLink: e.target.value })}
                        placeholder="https://open.kakao.com/o/..."
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        스레드 링크
                      </label>
                      <input
                        type="url"
                        value={formData.threadLink}
                        onChange={(e) => setFormData({ ...formData, threadLink: e.target.value })}
                        placeholder="https://www.threads.net/@..."
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        인스타그램 핸들
                      </label>
                      <input
                        type="text"
                        value={formData.instagramHandle}
                        onChange={(e) => setFormData({ ...formData, instagramHandle: e.target.value })}
                        placeholder="@username 또는 username"
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        블로그 링크
                      </label>
                      <input
                        type="url"
                        value={formData.blogLink}
                        onChange={(e) => setFormData({ ...formData, blogLink: e.target.value })}
                        placeholder="https://blog.naver.com/..."
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        유튜브 채널
                      </label>
                      <input
                        type="text"
                        value={formData.youtubeChannel}
                        onChange={(e) => setFormData({ ...formData, youtubeChannel: e.target.value })}
                        placeholder="@channelname 또는 channelname"
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                  </div>
                </div>

                {/* 추가 링크 설정 */}
                <div>
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                    <FiLink className="text-green-600" />
                    추가 링크
                  </h3>
                  <div className="mb-4 rounded-xl bg-green-50 border border-green-200 p-4">
                    <p className="text-sm text-green-700">
                      원하는 링크를 3개 이상 추가할 수 있습니다. 링크 이름과 URL을 모두 입력하면 자동으로 활성화됩니다.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {formData.customLinks.map((link, index) => (
                      <div key={index} className="flex gap-2 items-start">
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={link.label}
                            onChange={(e) => updateCustomLink(index, 'label', e.target.value)}
                            placeholder="링크 이름"
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
                          />
                          <input
                            type="url"
                            value={link.url}
                            onChange={(e) => updateCustomLink(index, 'url', e.target.value)}
                            placeholder="https://..."
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                          {link.isActive && (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                              <FiCheck className="w-3 h-3" />
                              활성화됨
                            </span>
                          )}
                          {formData.customLinks.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeCustomLink(index)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <FiX className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addCustomLink}
                      className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-green-500 hover:text-green-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <FiPlus className="w-4 h-4" />
                      링크 추가
                    </button>
                  </div>
                </div>

                {/* 크루즈 사진 갤러리 */}
                <div>
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                    <FiImage className="text-pink-600" />
                    크루즈 사진 갤러리
                  </h3>
                  <div className="mb-4 rounded-xl bg-pink-50 border border-pink-200 p-4">
                    <p className="text-sm text-pink-700">
                      크루즈 여행 사진을 최대 9장까지 업로드할 수 있습니다. 인스타그램 스타일로 표시됩니다.
                    </p>
                  </div>
                  <GalleryImageManager
                    images={formData.galleryImages}
                    onUpload={handleGalleryImageUpload}
                    onRemove={removeGalleryImage}
                    uploading={imageUploading}
                  />
                </div>

                {/* 대표 이미지 (포스터) */}
                <div>
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                    <FiImage className="text-blue-600" />
                    대표 이미지 (포스터)
                  </h3>
                  <div className="mb-4 rounded-xl bg-blue-50 border border-blue-200 p-4">
                    <p className="text-sm text-blue-700">
                      광고용 포스터 이미지를 최대 3장까지 업로드할 수 있습니다. 캐러셀 형태로 표시됩니다.
                    </p>
                  </div>
                  <FeaturedImageManager
                    images={formData.featuredImages}
                    onUpload={handleFeaturedImageUpload}
                    onRemove={removeFeaturedImage}
                    uploading={imageUploading}
                  />
                </div>

                {/* 유튜브 동영상 */}
                <div>
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                    <FiPlay className="text-red-600" />
                    유튜브 동영상
                  </h3>
                  <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-4">
                    <p className="text-sm text-red-700">
                      유튜브 동영상 링크를 최대 3개까지 입력할 수 있습니다. 좌우로 스와이프하여 여러 동영상을 볼 수 있습니다.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {formData.youtubeVideoUrls.map((url, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="url"
                          value={url}
                          onChange={(e) => {
                            const newUrls = [...formData.youtubeVideoUrls];
                            newUrls[index] = e.target.value;
                            setFormData({ ...formData, youtubeVideoUrls: newUrls });
                          }}
                          placeholder="https://www.youtube.com/watch?v=... 또는 https://youtu.be/..."
                          className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
                        />
                        {formData.youtubeVideoUrls.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newUrls = formData.youtubeVideoUrls.filter((_, i) => i !== index);
                              setFormData({ ...formData, youtubeVideoUrls: newUrls.length > 0 ? newUrls : [''] });
                            }}
                            className="px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <FiX className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    {formData.youtubeVideoUrls.length < 3 && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, youtubeVideoUrls: [...formData.youtubeVideoUrls, ''] });
                        }}
                        className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-red-500 hover:text-red-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <FiPlus className="w-4 h-4" />
                        동영상 추가 (최대 3개)
                      </button>
                    )}
                    {formData.youtubeVideoUrls.some(url => url.trim()) && (
                      <div className="mt-2 text-xs text-green-600">
                        <FiCheck className="inline w-3 h-3 mr-1" />
                        유튜브 링크가 입력되었습니다.
                      </div>
                    )}
                  </div>
                </div>

                {/* 스마트폰 미리보기 */}
                <div>
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                    <FiImage className="text-green-600" />
                    스마트폰 미리보기
                  </h3>
                  <div className="mb-4 rounded-xl bg-green-50 border border-green-200 p-4">
                    <p className="text-sm text-green-700">
                      실제 스마트폰에서 어떻게 보이는지 미리 확인할 수 있습니다. 아이폰과 삼성폰 버전을 모두 확인하세요.
                    </p>
                  </div>
                  <MobilePreview
                    profile={{
                      displayName: formData.displayName || user.name || '',
                      bio: formData.bio || '',
                      profileImage: formData.profileImage || null,
                      kakaoLink: formData.kakaoLink || null,
                      instagramHandle: formData.instagramHandle || null,
                      youtubeChannel: formData.youtubeChannel || null,
                      blogLink: formData.blogLink || null,
                      threadLink: formData.threadLink || null,
                      customLinks: formData.customLinks.filter(link => link.label.trim() && link.url.trim()),
                      galleryImages: formData.galleryImages.filter((img: string) => img.trim()),
                      featuredImages: formData.featuredImages.filter((img: string) => img.trim()),
                      youtubeVideoUrl: (() => {
                        const filtered = formData.youtubeVideoUrls.filter((url: string) => url && url.trim());
                        return filtered.length > 0 
                          ? (filtered.length === 1 ? filtered[0] : JSON.stringify(filtered))
                          : null;
                      })(),
                      youtubeVideoUrls: formData.youtubeVideoUrls.filter((url: string) => url && url.trim()),
                      mallUserId: user.mallUserId,
                    }}
                  />
                </div>

                {/* 나의 SNS 프로필 링크 생성 */}
                <div>
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                    <FiLink className="text-indigo-600" />
                    링크 생성
                  </h3>
                  <div className="mb-4 rounded-xl bg-indigo-50 border border-indigo-200 p-4">
                    <p className="text-sm text-indigo-700">
                      나의 SNS 프로필을 위한 독립적인 공유 링크를 생성합니다. 이 링크는 판매몰과 별개로 작동합니다.
                    </p>
                  </div>
                  <LittlyLinkGenerator 
                    partnerId={partnerId} 
                    onSaveProfile={async () => {
                      // 프로필 자동 저장
                      const { customLinks, galleryImages, featuredImages, youtubeVideoUrls, ...restFormData } = formData;
                      
                      const filteredCustomLinks = customLinks.filter(link => link.label.trim() && link.url.trim());
                      const filteredGalleryImages = galleryImages.filter((img: string) => img && img.trim());
                      const filteredFeaturedImages = featuredImages.filter((img: string) => img && img.trim());
                      const filteredYoutubeVideoUrls = youtubeVideoUrls.filter((url: string) => url && url.trim());
                      
                      const res = await fetch('/api/partner/profile', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                          ...restFormData,
                          customLinks: filteredCustomLinks.length > 0 ? filteredCustomLinks : null,
                          galleryImages: filteredGalleryImages.length > 0 ? filteredGalleryImages : null,
                          featuredImages: filteredFeaturedImages.length > 0 ? filteredFeaturedImages : null,
                          youtubeVideoUrl: filteredYoutubeVideoUrls.length > 0 
                            ? (filteredYoutubeVideoUrls.length === 1 ? filteredYoutubeVideoUrls[0] : JSON.stringify(filteredYoutubeVideoUrls))
                            : null,
                        }),
                      });

                      const json = await res.json();

                      if (!res.ok || !json.ok) {
                        throw new Error(json.message || '프로필 업데이트에 실패했습니다.');
                      }
                    }}
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Submit Button */}
          <div className="mt-8 flex items-center justify-end gap-4">
            <Link
              href={`/partner/${partnerId}/dashboard`}
              className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              취소
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-pink-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-pink-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  저장 중...
                </>
              ) : (
                <>
                  <FiSave />
                  저장하기
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 갤러리 이미지 관리 컴포넌트
function GalleryImageManager({
  images,
  onUpload,
  onRemove,
  uploading,
}: {
  images: string[];
  onUpload: (index: number, file: File) => void;
  onRemove: (index: number) => void;
  uploading: boolean;
}) {
  const slots = Array(9).fill(null).map((_, i) => {
    const img = images[i];
    if (!img) return '';
    if (typeof img === 'string') {
      const trimmed = img.trim();
      // [object Object] 체크 및 유효한 URL 경로 체크 (http://, https://, /로 시작하는 경로 허용)
      if (trimmed.includes('[object Object]') || trimmed === '[object Object]' || trimmed.length === 0) {
        return '';
      }
      // http://, https://, 또는 /로 시작하는 경로만 허용
      if (!trimmed.startsWith('http') && !trimmed.startsWith('/')) {
        return '';
      }
      return trimmed;
    }
    if (img && typeof img === 'object' && 'url' in img) {
      const url = (img as { url: any }).url;
      if (typeof url === 'string') {
        const trimmedUrl = url.trim();
        if (trimmedUrl.includes('[object Object]') || trimmedUrl === '[object Object]' || trimmedUrl.length === 0) {
          return '';
        }
        if (!trimmedUrl.startsWith('http') && !trimmedUrl.startsWith('/')) {
          return '';
        }
        return trimmedUrl;
      }
    }
    return '';
  });

  return (
    <div className="grid grid-cols-3 gap-3">
      {slots.map((imageUrl, index) => (
        <div key={`gallery-${index}-${imageUrl || 'empty'}`} className="relative aspect-square border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-gray-50">
          {imageUrl && typeof imageUrl === 'string' && imageUrl.trim() ? (
            <>
              <img
                src={imageUrl}
                alt={`Gallery ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
              >
                <FiX className="w-3 h-3" />
              </button>
            </>
          ) : (
            <label className="w-full h-full flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUpload(index, file);
                  e.target.value = '';
                }}
                disabled={uploading}
                className="hidden"
              />
              <div className="text-center">
                <FiUpload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                <span className="text-xs text-gray-500">업로드</span>
              </div>
            </label>
          )}
        </div>
      ))}
    </div>
  );
}

// 대표 이미지(포스터) 관리 컴포넌트
function FeaturedImageManager({
  images,
  onUpload,
  onRemove,
  uploading,
}: {
  images: string[];
  onUpload: (index: number, file: File) => void;
  onRemove: (index: number) => void;
  uploading: boolean;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const slots = Array(3).fill(null).map((_, i) => {
    const img = images[i];
    if (!img) return '';
    if (typeof img === 'string') {
      const trimmed = img.trim();
      // [object Object] 체크 및 유효한 URL 경로 체크 (http://, https://, /로 시작하는 경로 허용)
      if (trimmed.includes('[object Object]') || trimmed === '[object Object]' || trimmed.length === 0) {
        return '';
      }
      // http://, https://, 또는 /로 시작하는 경로만 허용
      if (!trimmed.startsWith('http') && !trimmed.startsWith('/')) {
        return '';
      }
      return trimmed;
    }
    if (img && typeof img === 'object' && 'url' in img) {
      const url = (img as { url: any }).url;
      if (typeof url === 'string') {
        const trimmedUrl = url.trim();
        if (trimmedUrl.includes('[object Object]') || trimmedUrl === '[object Object]' || trimmedUrl.length === 0) {
          return '';
        }
        if (!trimmedUrl.startsWith('http') && !trimmedUrl.startsWith('/')) {
          return '';
        }
        return trimmedUrl;
      }
    }
    return '';
  });

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % Math.max(activeImages.length, 1));
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + Math.max(activeImages.length, 1)) % Math.max(activeImages.length, 1));
  };

  const activeImages = slots.filter((img): img is string => typeof img === 'string' && img.trim() !== '');

  return (
    <div className="space-y-4">
      {/* 캐러셀 미리보기 */}
      {activeImages.length > 0 && (
        <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
          {/* 크루즈닷 로고 및 텍스트 배너 - 별도 섹션 */}
          <div className="flex items-center justify-center gap-2 bg-white py-2.5 px-4 border-b-2 border-blue-200">
            <img
              src="/images/ai-cruise-logo.png"
              alt="크루즈닷"
              className="w-6 h-6 object-contain"
            />
            <span className="text-sm font-bold text-blue-600 whitespace-nowrap">크루즈닷</span>
          </div>
          {/* 대표 이미지 - 유튜브 썸네일 비율 (16:9) */}
          <div className="relative w-full bg-gray-100" style={{ aspectRatio: '16/9' }}>
            <img
              src={activeImages[currentIndex]}
              alt={`Featured ${currentIndex + 1}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            {activeImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors z-10"
                >
                  <FiChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors z-10"
                >
                  <FiChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                  {activeImages.map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${
                        i === currentIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 업로드 슬롯 */}
      <div className="grid grid-cols-3 gap-3">
        {slots.map((imageUrl, index) => (
          <div key={`featured-${index}-${imageUrl || 'empty'}`} className="relative aspect-video border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-gray-50">
            {imageUrl && typeof imageUrl === 'string' && imageUrl.trim() ? (
              <>
                <img
                  src={imageUrl}
                  alt={`Featured ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                >
                  <FiX className="w-3 h-3" />
                </button>
              </>
            ) : (
              <label className="w-full h-full flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onUpload(index, file);
                    e.target.value = '';
                  }}
                  disabled={uploading}
                  className="hidden"
                />
                <div className="text-center">
                  <FiUpload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                  <span className="text-xs text-gray-500">업로드</span>
                </div>
              </label>
            )}
          </div>
        ))}
      </div>
    </div>
  );
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

// 스마트폰 미리보기 컴포넌트
function MobilePreview({ profile }: { 
  profile: {
    displayName: string;
    bio: string;
    profileImage: string | null;
    kakaoLink: string | null;
    instagramHandle: string | null;
    youtubeChannel: string | null;
    blogLink: string | null;
    threadLink: string | null;
    customLinks: Array<{ label: string; url: string; isActive: boolean }>;
    galleryImages: string[];
    featuredImages: string[];
    youtubeVideoUrl: string | null;
    youtubeVideoUrls?: string[];
    mallUserId?: string;
  }
}) {
  const [deviceType, setDeviceType] = useState<'iphone' | 'samsung'>('iphone');
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [youtubeIndex, setYoutubeIndex] = useState(0);
  const [galleryModal, setGalleryModal] = useState<{ open: boolean; index: number }>({ open: false, index: 0 });
  const [featuredModal, setFeaturedModal] = useState<{ open: boolean; index: number }>({ open: false, index: 0 });
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

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

  const activeLinks: Array<{ label: string; url: string; icon: string }> = [];
  if (profile.kakaoLink) activeLinks.push({ label: '카카오톡', url: profile.kakaoLink, icon: '💬' });
  if (profile.threadLink) activeLinks.push({ label: '스레드', url: profile.threadLink, icon: '🧵' });
  if (profile.instagramHandle) activeLinks.push({ label: '인스타그램', url: getInstagramUrl(profile.instagramHandle), icon: '📷' });
  if (profile.blogLink) activeLinks.push({ label: '블로그', url: profile.blogLink, icon: '✍️' });
  if (profile.youtubeChannel) activeLinks.push({ label: '유튜브', url: getYoutubeUrl(profile.youtubeChannel), icon: '📺' });
  profile.customLinks.forEach(link => {
    if (link.isActive && link.label.trim() && link.url.trim()) {
      activeLinks.push({ label: link.label, url: link.url, icon: '🔗' });
    }
  });

  useEffect(() => {
    if (profile.featuredImages.length > 1) {
      const interval = setInterval(() => {
        setFeaturedIndex((prev) => (prev + 1) % profile.featuredImages.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [profile.featuredImages.length]);

  const getYoutubeVideoId = (url: string | null): string | null => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  };

  // 유튜브 동영상 URL 배열 파싱
  const parseYoutubeVideoUrls = (): string[] => {
    // youtubeVideoUrls가 직접 제공되면 사용
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
      return [profile.youtubeVideoUrl].filter(Boolean);
    } catch {
      return [profile.youtubeVideoUrl].filter(Boolean);
    }
  };

  const youtubeVideoUrls = parseYoutubeVideoUrls();
  const youtubeVideoIds = youtubeVideoUrls.map(url => getYoutubeVideoId(url)).filter((id): id is string => id !== null);

  useEffect(() => {
    if (youtubeVideoIds.length > 1) {
      const interval = setInterval(() => {
        setYoutubeIndex((prev) => (prev + 1) % youtubeVideoIds.length);
      }, 8000); // 유튜브 동영상은 8초마다 자동 넘김
      return () => clearInterval(interval);
    }
  }, [youtubeVideoIds.length]);

  useEffect(() => {
    const loadProducts = async () => {
      if (!profile.mallUserId) {
        setProductsLoading(false);
        return;
      }
      
      try {
        setProductsLoading(true);
        const res = await fetch(`/api/public/products?limit=6`);
        const data = await res.json();
        if (data.ok && data.products) {
          // 연동된 상품만 필터링 (AffiliateProduct가 있는 상품만)
          // 3,800,000원 같은 특정 가격의 상품이 연동되지 않았으면 제외
          const filteredProducts = data.products.filter((product: any) => {
            // basePrice가 있고, AffiliateProduct와 연동된 상품만 표시
            // API에서 이미 AffiliateProduct가 있는 상품만 반환하므로 추가 필터링은 불필요
            // 하지만 혹시 모를 경우를 대비해 productCode가 있는 상품만 표시
            return product.productCode && product.basePrice;
          });
          setProducts(filteredProducts);
        }
      } catch (error) {
        console.error('[MobilePreview] Failed to load products:', error);
      } finally {
        setProductsLoading(false);
      }
    };

    loadProducts();
  }, [profile.mallUserId]);

  return (
    <div className="space-y-6">
      {/* 디바이스 선택 */}
      <div className="flex gap-4 justify-center">
        <button
          onClick={() => setDeviceType('iphone')}
          className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
            deviceType === 'iphone'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          📱 iPhone
        </button>
        <button
          onClick={() => setDeviceType('samsung')}
          className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
            deviceType === 'samsung'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          📱 Samsung
        </button>
      </div>

      {/* 스마트폰 프레임 */}
      <div className="flex justify-center">
        <div
          className={`relative ${
            deviceType === 'iphone'
              ? 'w-[375px] h-[812px] bg-black rounded-[3rem] p-2 shadow-2xl'
              : 'w-[360px] h-[800px] bg-gray-800 rounded-[2rem] p-2 shadow-2xl'
          }`}
        >
          {/* 노치/상단바 */}
          <div
            className={`absolute top-0 left-1/2 -translate-x-1/2 ${
              deviceType === 'iphone'
                ? 'w-[150px] h-[30px] bg-black rounded-b-[1rem]'
                : 'w-full h-[24px] bg-gray-800'
            }`}
          />
          
          {/* 화면 */}
          <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden relative">
            <div className="w-full h-full overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-purple-50">
                <div className="max-w-md mx-auto px-4 py-8">
                  {/* 대표 이미지 캐러셀 */}
                  {profile.featuredImages.length > 0 && (
                    <div className="bg-white rounded-3xl shadow-xl mb-6 overflow-hidden">
                      {/* 크루즈닷 로고 및 텍스트 배너 - 별도 섹션 */}
                      <div className="flex items-center justify-center gap-2 bg-white py-2.5 px-4 border-b-2 border-purple-200">
                        <img
                          src="/images/ai-cruise-logo.png"
                          alt="크루즈닷"
                          className="w-6 h-6 object-contain"
                        />
                        <span className="text-sm font-bold text-purple-600 whitespace-nowrap">크루즈닷</span>
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
                                  className={`w-1.5 h-1.5 rounded-full ${
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

                  {/* 프로필 섹션 */}
                  <div className="bg-white rounded-3xl shadow-xl p-6 mb-6 text-center">
                    <div className="relative inline-block mb-4">
                      {profile.profileImage ? (
                        <img
                          src={profile.profileImage}
                          alt={profile.displayName}
                          className="w-24 h-24 rounded-full object-cover border-4 border-purple-200"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-3xl font-bold">
                          {profile.displayName.charAt(0) || '?'}
                        </div>
                      )}
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 mb-2">{profile.displayName || '이름 없음'}</h1>
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
                            className="block w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2"
                          >
                            <span>{link.icon}</span>
                            <span>{link.label}</span>
                            <FiExternalLink className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 크루즈 사진 갤러리 */}
                  {profile.galleryImages.length > 0 && (
                    <div className="bg-white rounded-3xl shadow-xl p-4 mb-6">
                      <h2 className="text-lg font-bold text-gray-900 mb-3">크루즈 사진</h2>
                      <div className="grid grid-cols-3 gap-1.5">
                        {profile.galleryImages.map((imageUrl, index) => (
                          <button
                            key={index}
                            onClick={() => setGalleryModal({ open: true, index })}
                            className="aspect-square rounded-lg overflow-hidden"
                          >
                            <img
                              src={imageUrl}
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

                  {/* 유튜브 동영상 */}
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
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    i === youtubeIndex ? 'bg-white' : 'bg-white/50'
                                  }`}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 판매몰 상품 */}
                  {profile.mallUserId && (
                    <div className="bg-white rounded-3xl shadow-xl p-4 mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <FiShoppingBag className="w-4 h-4 text-purple-600" />
                        <h2 className="text-lg font-bold text-gray-900">추천 상품</h2>
                      </div>
                      {productsLoading ? (
                        <div className="text-center py-4 text-gray-500 text-sm">로딩 중...</div>
                      ) : products.length > 0 ? (
                        <div className="space-y-2">
                          {products.slice(0, 3).map((product: any) => {
                            // 태그 파싱 - boolean 필드들도 태그로 추가
                            let tags: string[] = [];
                            
                            // boolean 필드들을 태그로 추가
                            if (product.isUrgent) tags.push('urgent');
                            if (product.isMainProduct) tags.push('main');
                            if (product.isPopular) tags.push('popular');
                            if (product.isRecommended) tags.push('recommended');
                            if (product.isPremium) tags.push('premium');
                            if (product.isGeniePack) tags.push('genie');
                            if (product.isDomestic) tags.push('domestic');
                            if (product.isJapan) tags.push('japan');
                            if (product.isBudget) tags.push('budget');
                            
                            // product.tags 필드에서 추가 태그 파싱
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
                            
                            // 중복 제거 및 최대 3개만 유지
                            const uniqueTags = Array.from(new Set(tags)).slice(0, 3);
                            
                            // 태그를 한글로 변환
                            const koreanTags = uniqueTags.map(tag => translateTagToKorean(tag));
                            
                            // 상품명 추출 (packageName 또는 title)
                            const productName = product.packageName || product.title || '상품명 없음';
                            
                            return (
                              <a
                                key={product.id || product.productCode}
                                href={`/${profile.mallUserId}/shop/products/${product.productCode}`}
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
                                    {koreanTags.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {koreanTags.slice(0, 3).map((tag: string, idx: number) => (
                                          <span
                                            key={idx}
                                            className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full"
                                          >
                                            {tag.startsWith('#') ? tag : `#${tag}`}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </a>
                            );
                          })}
                          <a
                            href={`/${profile.mallUserId}/shop`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-center py-2 text-purple-600 font-semibold text-sm hover:text-purple-700"
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
                </div>
              </div>
            </div>
          </div>
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
            <FiX className="w-5 h-5" />
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
                <FiChevronLeft className="w-5 h-5" />
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
                <FiChevronRight className="w-5 h-5" />
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
            <FiX className="w-5 h-5" />
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
                <FiChevronLeft className="w-5 h-5" />
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
                <FiChevronRight className="w-5 h-5" />
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

// 나의 SNS 프로필 링크 생성 컴포넌트
function LittlyLinkGenerator({ partnerId, onSaveProfile }: { partnerId: string; onSaveProfile?: () => Promise<void> }) {
  const [generating, setGenerating] = useState(false);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateLink = async () => {
    setGenerating(true);
    try {
      // 프로필 자동 저장
      if (onSaveProfile) {
        await onSaveProfile();
      }

      const res = await fetch('/api/partner/link/generate', {
        method: 'POST',
        credentials: 'include',
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || '링크 생성에 실패했습니다.');
      }

      setLinkUrl(json.url);
      showSuccess('프로필이 저장되고 링크가 생성되었습니다!');
    } catch (error: any) {
      console.error('[LittlyLinkGenerator] error:', error);
      showError(error.message || '링크 생성 중 오류가 발생했습니다.');
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = () => {
    if (linkUrl) {
      navigator.clipboard.writeText(linkUrl);
      setCopied(true);
      showSuccess('링크가 복사되었습니다!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      {linkUrl ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            <input
              type="text"
              value={linkUrl}
              readOnly
              className="flex-1 bg-white border border-indigo-300 rounded-lg px-4 py-2 text-sm font-mono"
            />
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              {copied ? <FiCheck /> : <FiCopy />}
              {copied ? '복사됨' : '복사'}
            </button>
          </div>
          <a
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 text-sm font-semibold"
          >
            링크 미리보기 <FiExternalLink className="w-4 h-4" />
          </a>
        </div>
      ) : (
        <button
          type="button"
          onClick={generateLink}
          disabled={generating}
          className="w-full px-6 py-4 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {generating ? '링크 생성 중...' : '나의 SNS 프로필 링크 생성하기'}
        </button>
      )}
    </div>
  );
}

