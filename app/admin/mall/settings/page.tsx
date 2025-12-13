// app/admin/mall/settings/page.tsx
// 메인몰 전역 설정 페이지

'use client';

import { useState, useEffect } from 'react';
import { FiSave, FiRefreshCw, FiPlus, FiX, FiChevronDown, FiChevronUp, FiImage, FiFolder, FiTrash2, FiMove } from 'react-icons/fi';
import { showSuccess, showError } from '@/components/ui/Toast';
import FileGallery from '@/components/admin/mall/FileGallery';

interface Banner {
  id: string;
  title: string;
  buttons: Array<{ text: string; icon: string }>;
  rightBadge: {
    topText: string;
    bottomText: string;
  };
  backgroundType: 'image' | 'color'; // 배경 타입: 이미지 또는 색상
  backgroundImage?: string; // 배경 이미지 URL
  backgroundColor?: string; // 배경 색상 (hex 코드)
  textColor?: string; // 텍스트 색상 (hex 코드)
  enabled: boolean;
  order: number;
}

interface Settings {
  banners?: Banner[];
  [key: string]: any;
}

export default function MallSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Settings>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'banner-management': true,
    'product-display-settings': true,
    'menu-bar-settings': true,
    'recommended-below-settings': true,
  });
  const [showGallery, setShowGallery] = useState<{ bannerId: string; field: 'backgroundImage' } | null>(null);
  const [showIconPicker, setShowIconPicker] = useState<{ bannerId: string; buttonIndex: number } | null>(null);

  // 추천 이모티콘 목록
  const recommendedIcons = [
    { value: '✓', label: '체크' },
    { value: '✅', label: '체크박스' },
    { value: '✔', label: '굵은 체크' },
    { value: '⭐', label: '별' },
    { value: '🌟', label: '반짝이는 별' },
    { value: '💯', label: '100점' },
    { value: '🎯', label: '다트' },
    { value: '🔥', label: '불' },
    { value: '✨', label: '반짝임' },
    { value: '💎', label: '다이아몬드' },
    { value: '🏆', label: '트로피' },
    { value: '🎉', label: '파티' },
    { value: '👍', label: '좋아요' },
    { value: '👏', label: '박수' },
    { value: '💪', label: '근육' },
    { value: '🚀', label: '로켓' },
    { value: '⚡', label: '번개' },
    { value: '💡', label: '전구' },
    { value: '🎁', label: '선물' },
    { value: '🎊', label: '축하' },
    { value: '🏅', label: '메달' },
    { value: '👑', label: '왕관' },
    { value: '💖', label: '반짝이는 하트' },
    { value: '❤️', label: '하트' },
    { value: '💙', label: '파란 하트' },
    { value: '💚', label: '초록 하트' },
    { value: '💛', label: '노란 하트' },
    { value: '🧡', label: '주황 하트' },
    { value: '💜', label: '보라 하트' },
    { value: '🛡️', label: '방패' },
    { value: '⚓', label: '닻' },
    { value: '⛵', label: '요트' },
    { value: '🌊', label: '파도' },
    { value: '🌴', label: '야자수' },
    { value: '🏖️', label: '해변' },
    { value: '🌅', label: '일출' },
    { value: '🌄', label: '산 일출' },
    { value: '🌺', label: '꽃' },
    { value: '🌸', label: '벚꽃' },
    { value: '🌻', label: '해바라기' },
    { value: '🌷', label: '튤립' },
    { value: '🍀', label: '네잎 클로버' },
    { value: '🎨', label: '팔레트' },
    { value: '🎭', label: '연극' },
    { value: '🎪', label: '서커스' },
    { value: '🎬', label: '영화' },
    { value: '📸', label: '카메라' },
    { value: '📷', label: '사진기' },
    { value: '🎥', label: '비디오 카메라' },
    { value: '📱', label: '스마트폰' },
    { value: '💻', label: '노트북' },
    { value: '⌚', label: '시계' },
    { value: '🎵', label: '음악' },
    { value: '🎶', label: '음표' },
    { value: '🎤', label: '마이크' },
    { value: '🎧', label: '헤드폰' },
    { value: '🎮', label: '게임' },
    { value: '🕹️', label: '조이스틱' },
    { value: '🎲', label: '주사위' },
    { value: '🃏', label: '조커' },
    { value: '🀄', label: '마작' },
    { value: '🎴', label: '화투' },
    { value: '♠️', label: '스페이드' },
    { value: '♥️', label: '하트' },
    { value: '♦️', label: '다이아몬드' },
    { value: '♣️', label: '클로버' },
  ];

  // 배너 목록 관리
  const [banners, setBanners] = useState<Banner[]>([
    {
      id: 'popular',
      title: '인기 크루즈',
      buttons: [
        { text: '프리미엄 서비스 보장', icon: '✓' },
        { text: '크루즈닷AI 가이드 서비스 지원', icon: '✓' },
        { text: '확실한 출발 100%', icon: '✓' },
      ],
      rightBadge: {
        topText: '신뢰할 수 있는',
        bottomText: '한국 여행사',
      },
      backgroundType: 'color',
      backgroundColor: '#1e40af',
      textColor: '#ffffff',
      enabled: true,
      order: 1,
    },
    {
      id: 'recommended',
      title: '추천 크루즈',
      buttons: [
        { text: '10년 승무원 출신 인솔자', icon: '✓' },
        { text: '전문 매니저 상담', icon: '✓' },
        { text: '빠르고 신속한 스탭지원', icon: '✓' },
      ],
      rightBadge: {
        topText: '신뢰할 수 있는',
        bottomText: '한국 여행사',
      },
      backgroundType: 'color',
      backgroundColor: '#059669',
      textColor: '#ffffff',
      enabled: true,
      order: 2,
    },
  ]);

  // 상품 표시 설정
  const [productDisplay, setProductDisplay] = useState({
    popularRows: 1, // 1줄, 2줄, 또는 3줄
    recommendedRows: 1, // 1줄, 2줄, 또는 3줄
  });

  // 메뉴바 설정
  const [menuBar, setMenuBar] = useState({
    filters: [
      { value: 'all', label: '전체', enabled: true },
      { value: 'japan', label: '일본', enabled: true },
      { value: 'southeast-asia', label: '동남아', enabled: true },
      { value: 'singapore', label: '싱가포르', enabled: true },
      { value: 'western-mediterranean', label: '서부지중해', enabled: true },
      { value: 'eastern-mediterranean', label: '동부지중해', enabled: true },
      { value: 'alaska', label: '알래스카', enabled: true },
    ],
  });

  // 추천크루즈 밑 설정
  const [recommendedBelow, setRecommendedBelow] = useState({
    type: 'none', // 'none', 'banner', 'products'
    banner: {
      image: '',
      title: '',
      link: '',
    },
    products: {
      count: 0,
      category: '',
    },
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/mall/settings', {
        credentials: 'include',
      });
      const data = await response.json();

      if (data.ok && data.settings) {
        // 배너 관리 설정 로드
        if (data.settings['banner-management'] && data.settings['banner-management'].length > 0) {
          const bannerData = data.settings['banner-management'][0];
          if (bannerData.banners && Array.isArray(bannerData.banners)) {
            setBanners(bannerData.banners);
          }
        }

        // 상품 표시 설정 로드
        if (data.settings['product-display-settings'] && data.settings['product-display-settings'].length > 0) {
          const display = data.settings['product-display-settings'][0];
          if (display.popularRows !== undefined) setProductDisplay(display);
        }

        // 메뉴바 설정 로드
        if (data.settings['menu-bar-settings'] && data.settings['menu-bar-settings'].length > 0) {
          const menu = data.settings['menu-bar-settings'][0];
          if (menu.filters) setMenuBar(menu);
        }

        // 추천크루즈 밑 설정 로드
        if (data.settings['recommended-below-settings'] && data.settings['recommended-below-settings'].length > 0) {
          const below = data.settings['recommended-below-settings'][0];
          if (below.type) setRecommendedBelow(below);
        }

        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      showError('설정을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);

      // 배너 관리 설정 저장
      await fetch('/api/admin/mall/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          section: 'banner-management',
          key: 'main',
          content: { banners },
        }),
      });

      // 상품 표시 설정 저장
      await fetch('/api/admin/mall/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          section: 'product-display-settings',
          key: 'main',
          content: productDisplay,
        }),
      });

      // 메뉴바 설정 저장
      await fetch('/api/admin/mall/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          section: 'menu-bar-settings',
          key: 'main',
          content: menuBar,
        }),
      });

      // 추천크루즈 밑 설정 저장
      await fetch('/api/admin/mall/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          section: 'recommended-below-settings',
          key: 'main',
          content: recommendedBelow,
        }),
      });

      showSuccess('설정이 저장되었습니다!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      showError('설정 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const addButton = (bannerId: string) => {
    setBanners(banners.map(banner => {
      if (banner.id === bannerId && banner.buttons.length < 3) {
        return {
          ...banner,
          buttons: [...banner.buttons, { text: '', icon: '✓' }],
        };
      }
      return banner;
    }));
  };

  const removeButton = (bannerId: string, index: number) => {
    setBanners(banners.map(banner => {
      if (banner.id === bannerId) {
        return {
          ...banner,
          buttons: banner.buttons.filter((_, i) => i !== index),
        };
      }
      return banner;
    }));
  };

  // 새 배너 추가
  const addBanner = () => {
    const newBanner: Banner = {
      id: `banner-${Date.now()}`,
      title: '새 배너',
      buttons: [{ text: '', icon: '✓' }],
      rightBadge: {
        topText: '',
        bottomText: '',
      },
      backgroundType: 'color',
      backgroundColor: '#1e40af',
      textColor: '#ffffff',
      enabled: true,
      order: banners.length + 1,
    };
    setBanners([...banners, newBanner]);
  };

  // 배너 삭제 (인기 크루즈, 추천 크루즈는 삭제 불가)
  const removeBanner = (bannerId: string) => {
    // 인기 크루즈와 추천 크루즈는 삭제 불가
    if (bannerId === 'popular' || bannerId === 'recommended') {
      showError('인기 크루즈와 추천 크루즈는 삭제할 수 없습니다.');
      return;
    }
    const filtered = banners.filter(b => b.id !== bannerId);
    if (filtered.length < 2) {
      showError('최소 2개의 배너가 필요합니다.');
      return;
    }
    setBanners(filtered.map((b, idx) => ({ ...b, order: idx + 1 })));
  };

  // 배너 순서 변경
  const moveBanner = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === banners.length - 1) return;

    const newBanners = [...banners];
    if (direction === 'up') {
      [newBanners[index - 1], newBanners[index]] = [newBanners[index], newBanners[index - 1]];
      newBanners[index - 1].order = index;
      newBanners[index].order = index + 1;
    } else {
      [newBanners[index], newBanners[index + 1]] = [newBanners[index + 1], newBanners[index]];
      newBanners[index].order = index + 1;
      newBanners[index + 1].order = index + 2;
    }
    setBanners(newBanners);
  };

  const addMenuFilter = () => {
    setMenuBar({
      ...menuBar,
      filters: [...menuBar.filters, { value: '', label: '', enabled: true }],
    });
  };

  const removeMenuFilter = (index: number) => {
    setMenuBar({
      ...menuBar,
      filters: menuBar.filters.filter((_, i) => i !== index),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">설정을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">메인몰 전역 설정</h1>
            <p className="text-gray-600">메인몰의 레이아웃, 배너, 메뉴 등을 노코딩으로 설정할 수 있습니다.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadSettings}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <FiRefreshCw size={18} />
              새로고침
            </button>
            <button
              onClick={saveSettings}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <FiSave size={18} />
              {saving ? '저장 중...' : '전체 저장'}
            </button>
          </div>
        </div>
      </div>

      {/* 배너 관리 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => toggleSection('banner-management')}
            className="flex-1 flex items-center justify-between text-left"
          >
            <h2 className="text-2xl font-bold text-gray-800">배너 관리</h2>
            {expandedSections['banner-management'] ? (
              <FiChevronUp size={24} className="text-gray-400" />
            ) : (
              <FiChevronDown size={24} className="text-gray-400" />
            )}
          </button>
          <button
            onClick={addBanner}
            className="ml-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <FiPlus size={18} />
            배너 추가
          </button>
        </div>

        {expandedSections['banner-management'] && (
          <div className="space-y-6">
            {banners
              .sort((a, b) => a.order - b.order)
              .map((banner, bannerIndex) => (
                <div key={banner.id} className="border-2 border-gray-200 rounded-lg p-6 space-y-4">
                  {/* 배너 헤더 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => moveBanner(bannerIndex, 'up')}
                        disabled={bannerIndex === 0}
                        className="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-30"
                        title="위로 이동"
                      >
                        <FiChevronUp size={20} />
                      </button>
                      <button
                        onClick={() => moveBanner(bannerIndex, 'down')}
                        disabled={bannerIndex === banners.length - 1}
                        className="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-30"
                        title="아래로 이동"
                      >
                        <FiChevronDown size={20} />
                      </button>
                      <h3 className="text-xl font-bold text-gray-800">
                        {banner.id === 'popular' ? '인기 크루즈 (고정)' : banner.id === 'recommended' ? '추천 크루즈 (고정)' : `배너 ${bannerIndex + 1}`}
                      </h3>
                      {(banner.id === 'popular' || banner.id === 'recommended') && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                          고정 배너
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={banner.enabled}
                          onChange={(e) => {
                            setBanners(banners.map(b => b.id === banner.id ? { ...b, enabled: e.target.checked } : b));
                          }}
                          className="w-5 h-5"
                        />
                        <span className="text-sm font-semibold">활성화</span>
                      </label>
                      {banners.length > 1 && banner.id !== 'popular' && banner.id !== 'recommended' && (
                        <button
                          onClick={() => removeBanner(banner.id)}
                          className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 배너 제목 */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">배너 제목</label>
                    <input
                      type="text"
                      value={banner.title}
                      onChange={(e) => {
                        setBanners(banners.map(b => b.id === banner.id ? { ...b, title: e.target.value } : b));
                      }}
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        banner.id === 'popular' || banner.id === 'recommended' ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                      placeholder={banner.id === 'popular' ? '인기 크루즈' : banner.id === 'recommended' ? '추천 크루즈' : '배너 제목'}
                      disabled={banner.id === 'popular' || banner.id === 'recommended'}
                    />
                    {(banner.id === 'popular' || banner.id === 'recommended') && (
                      <p className="text-xs text-gray-500 mt-1">
                        • {banner.id === 'popular' ? '인기 크루즈' : '추천 크루즈'}는 고정 배너로 제목을 변경할 수 없습니다.
                      </p>
                    )}
                  </div>

                  {/* 배경 설정 */}
                  <div className="border-t pt-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">배경 설정</label>
                    <div className="space-y-3">
                      {/* 배경 타입 선택 */}
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`bg-type-${banner.id}`}
                            value="color"
                            checked={banner.backgroundType === 'color'}
                            onChange={() => {
                              setBanners(banners.map(b => b.id === banner.id ? { ...b, backgroundType: 'color' } : b));
                            }}
                            className="w-5 h-5"
                          />
                          <span>색상</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`bg-type-${banner.id}`}
                            value="image"
                            checked={banner.backgroundType === 'image'}
                            onChange={() => {
                              setBanners(banners.map(b => b.id === banner.id ? { ...b, backgroundType: 'image' } : b));
                            }}
                            className="w-5 h-5"
                          />
                          <span>이미지</span>
                        </label>
                      </div>

                      {/* 색상 설정 */}
                      {banner.backgroundType === 'color' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">배경 색상</label>
                            <div className="flex gap-2">
                              <input
                                type="color"
                                value={banner.backgroundColor || '#1e40af'}
                                onChange={(e) => {
                                  setBanners(banners.map(b => b.id === banner.id ? { ...b, backgroundColor: e.target.value } : b));
                                }}
                                className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                              />
                              <input
                                type="text"
                                value={banner.backgroundColor || '#1e40af'}
                                onChange={(e) => {
                                  setBanners(banners.map(b => b.id === banner.id ? { ...b, backgroundColor: e.target.value } : b));
                                }}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="#1e40af"
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">• 배너의 배경 색상을 선택하세요.</p>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">텍스트 색상</label>
                            <div className="flex gap-2">
                              <input
                                type="color"
                                value={banner.textColor || '#ffffff'}
                                onChange={(e) => {
                                  setBanners(banners.map(b => b.id === banner.id ? { ...b, textColor: e.target.value } : b));
                                }}
                                className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                              />
                              <input
                                type="text"
                                value={banner.textColor || '#ffffff'}
                                onChange={(e) => {
                                  setBanners(banners.map(b => b.id === banner.id ? { ...b, textColor: e.target.value } : b));
                                }}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="#ffffff"
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">• 배너의 텍스트 색상을 선택하세요.</p>
                          </div>
                        </div>
                      )}

                      {/* 이미지 설정 */}
                      {banner.backgroundType === 'image' && (
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">배경 이미지</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={banner.backgroundImage || ''}
                              onChange={(e) => {
                                setBanners(banners.map(b => b.id === banner.id ? { ...b, backgroundImage: e.target.value } : b));
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              placeholder="/uploads/images/banner.jpg"
                            />
                            <button
                              onClick={() => setShowGallery({ bannerId: banner.id, field: 'backgroundImage' })}
                              className="px-4 py-2 border border-blue-300 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 flex items-center gap-2"
                            >
                              <FiFolder size={16} />
                              불러오기
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">• 배너의 배경 이미지를 업로드하거나 저장된 이미지를 불러오세요.</p>
                          {banner.backgroundImage && (
                            <div className="mt-2">
                              <img src={banner.backgroundImage} alt="배경 미리보기" className="max-h-32 object-contain rounded border border-gray-300" />
                            </div>
                          )}
                        </div>
                      )}

                      {/* 색상 미리보기 */}
                      {banner.backgroundType === 'color' && (
                        <div className="mt-3 p-4 rounded-lg border-2 border-gray-200" style={{ backgroundColor: banner.backgroundColor || '#1e40af', color: banner.textColor || '#ffffff' }}>
                          <p className="text-center font-semibold">배너 색상 미리보기</p>
                          <p className="text-center text-sm mt-1">{banner.title || '배너 제목'}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 어필 버튼 설정 */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-semibold text-gray-700">어필 버튼 (최대 3개)</label>
                      {banner.buttons.length < 3 && (
                        <button
                          onClick={() => addButton(banner.id)}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 flex items-center gap-1"
                        >
                          <FiPlus size={14} />
                          추가
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {banner.buttons.map((button, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            value={button.text}
                            onChange={(e) => {
                              const newBanners = banners.map(b => {
                                if (b.id === banner.id) {
                                  const newButtons = [...b.buttons];
                                  newButtons[index].text = e.target.value;
                                  return { ...b, buttons: newButtons };
                                }
                                return b;
                              });
                              setBanners(newBanners);
                            }}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder={`버튼 ${index + 1} 텍스트`}
                          />
                          <div className="relative">
                            <button
                              onClick={() => setShowIconPicker({ bannerId: banner.id, buttonIndex: index })}
                              className="w-20 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-1 text-lg"
                              title="아이콘 선택"
                            >
                              {button.icon || '✓'}
                            </button>
                          </div>
                          {banner.buttons.length > 1 && (
                            <button
                              onClick={() => removeButton(banner.id, index)}
                              className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                            >
                              <FiX size={18} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      • 각 버튼 옆의 아이콘 버튼을 클릭하면 다양한 이모티콘을 선택할 수 있습니다.
                    </p>
                  </div>

                  {/* 오른쪽 배지 설정 */}
                  <div className="border-t pt-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">오른쪽 배지</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">상단 텍스트</label>
                        <input
                          type="text"
                          value={banner.rightBadge.topText}
                          onChange={(e) => {
                            setBanners(banners.map(b => b.id === banner.id ? {
                              ...b,
                              rightBadge: { ...b.rightBadge, topText: e.target.value },
                            } : b));
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="신뢰할 수 있는"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">하단 텍스트</label>
                        <input
                          type="text"
                          value={banner.rightBadge.bottomText}
                          onChange={(e) => {
                            setBanners(banners.map(b => b.id === banner.id ? {
                              ...b,
                              rightBadge: { ...b.rightBadge, bottomText: e.target.value },
                            } : b));
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="한국 여행사"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* 상품 표시 설정 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <button
          onClick={() => toggleSection('product-display-settings')}
          className="w-full flex items-center justify-between text-left mb-4"
        >
          <h2 className="text-2xl font-bold text-gray-800">상품 표시 설정</h2>
          {expandedSections['product-display-settings'] ? (
            <FiChevronUp size={24} className="text-gray-400" />
          ) : (
            <FiChevronDown size={24} className="text-gray-400" />
          )}
        </button>

        {expandedSections['product-display-settings'] && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">인기크루즈 표시 줄 수</label>
                <select
                  value={productDisplay.popularRows}
                  onChange={(e) =>
                    setProductDisplay({ ...productDisplay, popularRows: parseInt(e.target.value) })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={1}>1줄</option>
                  <option value={2}>2줄</option>
                  <option value={3}>3줄</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">추천크루즈 표시 줄 수</label>
                <select
                  value={productDisplay.recommendedRows}
                  onChange={(e) =>
                    setProductDisplay({ ...productDisplay, recommendedRows: parseInt(e.target.value) })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={1}>1줄</option>
                  <option value={2}>2줄</option>
                  <option value={3}>3줄</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 메뉴바 설정 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <button
          onClick={() => toggleSection('menu-bar-settings')}
          className="w-full flex items-center justify-between text-left mb-4"
        >
          <h2 className="text-2xl font-bold text-gray-800">메뉴바 설정</h2>
          {expandedSections['menu-bar-settings'] ? (
            <FiChevronUp size={24} className="text-gray-400" />
          ) : (
            <FiChevronDown size={24} className="text-gray-400" />
          )}
        </button>

        {expandedSections['menu-bar-settings'] && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">필터 메뉴</label>
              <button
                onClick={addMenuFilter}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 flex items-center gap-1"
              >
                <FiPlus size={14} />
                추가
              </button>
            </div>
            <div className="space-y-2">
              {menuBar.filters.map((filter, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="checkbox"
                    checked={filter.enabled}
                    onChange={(e) => {
                      const newFilters = [...menuBar.filters];
                      newFilters[index].enabled = e.target.checked;
                      setMenuBar({ ...menuBar, filters: newFilters });
                    }}
                    className="w-5 h-5"
                  />
                  <input
                    type="text"
                    value={filter.value}
                    onChange={(e) => {
                      const newFilters = [...menuBar.filters];
                      newFilters[index].value = e.target.value;
                      setMenuBar({ ...menuBar, filters: newFilters });
                    }}
                    className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="값 (예: japan)"
                  />
                  <input
                    type="text"
                    value={filter.label}
                    onChange={(e) => {
                      const newFilters = [...menuBar.filters];
                      newFilters[index].label = e.target.value;
                      setMenuBar({ ...menuBar, filters: newFilters });
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="라벨 (예: 일본)"
                  />
                  {menuBar.filters.length > 1 && (
                    <button
                      onClick={() => removeMenuFilter(index)}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                    >
                      <FiX size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 추천크루즈 밑 설정 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <button
          onClick={() => toggleSection('recommended-below-settings')}
          className="w-full flex items-center justify-between text-left mb-4"
        >
          <h2 className="text-2xl font-bold text-gray-800">추천크루즈 밑 설정</h2>
          {expandedSections['recommended-below-settings'] ? (
            <FiChevronUp size={24} className="text-gray-400" />
          ) : (
            <FiChevronDown size={24} className="text-gray-400" />
          )}
        </button>

        {expandedSections['recommended-below-settings'] && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">표시할 콘텐츠</label>
              <select
                value={recommendedBelow.type}
                onChange={(e) =>
                  setRecommendedBelow({ ...recommendedBelow, type: e.target.value as 'none' | 'banner' | 'products' })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="none">없음</option>
                <option value="banner">배너</option>
                <option value="products">추가 상품</option>
              </select>
            </div>

            {recommendedBelow.type === 'banner' && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">배너 이미지 URL</label>
                  <input
                    type="text"
                    value={recommendedBelow.banner.image}
                    onChange={(e) =>
                      setRecommendedBelow({
                        ...recommendedBelow,
                        banner: { ...recommendedBelow.banner, image: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="/images/banner.jpg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">배너 제목</label>
                  <input
                    type="text"
                    value={recommendedBelow.banner.title}
                    onChange={(e) =>
                      setRecommendedBelow({
                        ...recommendedBelow,
                        banner: { ...recommendedBelow.banner, title: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="배너 제목"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">링크 URL</label>
                  <input
                    type="text"
                    value={recommendedBelow.banner.link}
                    onChange={(e) =>
                      setRecommendedBelow({
                        ...recommendedBelow,
                        banner: { ...recommendedBelow.banner, link: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="/products 또는 https://..."
                  />
                </div>
              </div>
            )}

            {recommendedBelow.type === 'products' && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">표시할 상품 개수</label>
                  <input
                    type="number"
                    value={recommendedBelow.products.count}
                    onChange={(e) =>
                      setRecommendedBelow({
                        ...recommendedBelow,
                        products: { ...recommendedBelow.products, count: parseInt(e.target.value) || 0 },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="4"
                    min="1"
                    max="12"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">카테고리 필터</label>
                  <input
                    type="text"
                    value={recommendedBelow.products.category}
                    onChange={(e) =>
                      setRecommendedBelow({
                        ...recommendedBelow,
                        products: { ...recommendedBelow.products, category: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="japan, southeast-asia 등 (비워두면 전체)"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 저장 버튼 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-semibold text-lg disabled:opacity-50"
        >
          <FiSave size={20} />
          {saving ? '저장 중...' : '전체 설정 저장하기'}
        </button>
      </div>

      {/* 파일 갤러리 모달 */}
      {showGallery && (
        <FileGallery
          type="image"
          currentUrl={banners.find(b => b.id === showGallery.bannerId)?.backgroundImage}
          onSelect={(url) => {
            setBanners(banners.map(b => b.id === showGallery.bannerId ? { ...b, backgroundImage: url } : b));
            setShowGallery(null);
          }}
          onClose={() => setShowGallery(null)}
        />
      )}

      {/* 이모티콘 선택 모달 */}
      {showIconPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">이모티콘 선택</h2>
              <button
                onClick={() => setShowIconPicker(null)}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* 이모티콘 목록 */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-8 md:grid-cols-10 gap-3">
                {recommendedIcons.map((icon) => (
                  <button
                    key={icon.value}
                    onClick={() => {
                      const banner = banners.find(b => b.id === showIconPicker.bannerId);
                      if (banner) {
                        const newBanners = banners.map(b => {
                          if (b.id === showIconPicker.bannerId) {
                            const newButtons = [...b.buttons];
                            newButtons[showIconPicker.buttonIndex].icon = icon.value;
                            return { ...b, buttons: newButtons };
                          }
                          return b;
                        });
                        setBanners(newBanners);
                        setShowIconPicker(null);
                      }
                    }}
                    className={`p-3 border-2 rounded-lg text-2xl hover:bg-gray-50 transition-colors ${
                      banners.find(b => b.id === showIconPicker.bannerId)?.buttons[showIconPicker.buttonIndex]?.icon === icon.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200'
                    }`}
                    title={icon.label}
                  >
                    {icon.value}
                  </button>
                ))}
              </div>
            </div>

            {/* 푸터 */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  원하는 이모티콘을 클릭하면 선택됩니다.
                </p>
                <button
                  onClick={() => setShowIconPicker(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


