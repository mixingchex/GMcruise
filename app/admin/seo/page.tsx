// app/admin/seo/page.tsx
// SEO 관리 페이지

'use client';

import { useState, useEffect } from 'react';
import { FiSave, FiEdit2, FiTrash2, FiPlus, FiX, FiEye, FiSearch } from 'react-icons/fi';

interface SeoConfig {
  id: number;
  pagePath: string;
  pageType: string;
  title: string | null;
  description: string | null;
  keywords: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  ogType: string | null;
  ogUrl: string | null;
  twitterCard: string | null;
  twitterTitle: string | null;
  twitterDescription: string | null;
  twitterImage: string | null;
  canonicalUrl: string | null;
  robots: string | null;
  structuredData: any;
  viewCount: number;
  lastUpdated: string;
  createdAt: string;
}

export default function SeoManagementPage() {
  const [configs, setConfigs] = useState<SeoConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingConfig, setEditingConfig] = useState<SeoConfig | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<Partial<SeoConfig>>({});

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/settings/seo', {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok) {
        setConfigs(data.configs || []);
      }
    } catch (error) {
      console.error('Failed to load SEO configs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (config: SeoConfig) => {
    setEditingConfig(config);
    setFormData({
      pagePath: config.pagePath,
      pageType: config.pageType,
      title: config.title || '',
      description: config.description || '',
      keywords: config.keywords || '',
      ogTitle: config.ogTitle || '',
      ogDescription: config.ogDescription || '',
      ogImage: config.ogImage || '',
      ogType: config.ogType || 'website',
      ogUrl: config.ogUrl || '',
      twitterCard: config.twitterCard || 'summary_large_image',
      twitterTitle: config.twitterTitle || '',
      twitterDescription: config.twitterDescription || '',
      twitterImage: config.twitterImage || '',
      canonicalUrl: config.canonicalUrl || '',
      robots: config.robots || 'index, follow',
    });
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingConfig(null);
    setFormData({
      pagePath: '',
      pageType: 'page',
      title: '',
      description: '',
      keywords: '',
      ogTitle: '',
      ogDescription: '',
      ogImage: '',
      ogType: 'website',
      ogUrl: '',
      twitterCard: 'summary_large_image',
      twitterTitle: '',
      twitterDescription: '',
      twitterImage: '',
      canonicalUrl: '',
      robots: 'index, follow',
    });
  };

  const handleSave = async () => {
    if (!formData.pagePath) {
      alert('페이지 경로를 입력해주세요.');
      return;
    }

    try {
      const response = await fetch('/api/admin/settings/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.ok) {
        alert('SEO 설정이 저장되었습니다.');
        setEditingConfig(null);
        setIsCreating(false);
        setFormData({});
        await loadConfigs();
      } else {
        alert('저장 실패: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to save SEO config:', error);
      alert('SEO 설정 저장 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (pagePath: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/admin/settings/seo?pagePath=${encodeURIComponent(pagePath)}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();
      if (data.ok) {
        alert('SEO 설정이 삭제되었습니다.');
        await loadConfigs();
      } else {
        alert('삭제 실패: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to delete SEO config:', error);
      alert('SEO 설정 삭제 중 오류가 발생했습니다.');
    }
  };

  const filteredConfigs = configs.filter(config =>
    config.pagePath.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (config.title && config.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-800 mb-2 flex items-center gap-3">
            <span className="text-5xl">🔍</span>
            SEO 관리
          </h1>
          <p className="text-lg text-gray-600 font-medium">
            페이지별 SEO 설정을 관리하여 검색 엔진 최적화를 향상시킬 수 있습니다
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-semibold"
        >
          <FiPlus size={20} />
          새 SEO 설정 추가
        </button>
      </div>

      {/* 검색 */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center gap-3">
          <FiSearch className="text-gray-400" size={20} />
          <input
            type="text"
            placeholder="페이지 경로 또는 제목으로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* 편집 모달 */}
      {(editingConfig || isCreating) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {isCreating ? '새 SEO 설정 추가' : 'SEO 설정 수정'}
              </h2>
              <button
                onClick={() => {
                  setEditingConfig(null);
                  setIsCreating(false);
                  setFormData({});
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 기본 정보 */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900">기본 정보</h3>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    페이지 경로 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.pagePath || ''}
                    onChange={(e) => setFormData({ ...formData, pagePath: e.target.value })}
                    placeholder="/products, /products/[productCode] 등"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={!!editingConfig}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    예: /products, /products/[productCode], /community 등
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    페이지 타입
                  </label>
                  <select
                    value={formData.pageType || 'page'}
                    onChange={(e) => setFormData({ ...formData, pageType: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="home">홈</option>
                    <option value="product">상품</option>
                    <option value="category">카테고리</option>
                    <option value="blog">블로그</option>
                    <option value="page">일반 페이지</option>
                  </select>
                </div>
              </div>

              {/* 기본 메타데이터 */}
              <div className="space-y-4 border-t pt-6">
                <h3 className="text-lg font-bold text-gray-900">기본 메타데이터</h3>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    페이지 제목 (Title) <span className="text-gray-500 text-xs">(60자 이내 권장)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="크루즈 가이드 - AI 여행 도우미"
                    maxLength={60}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    현재: {(formData.title || '').length}자
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    메타 설명 (Description) <span className="text-gray-500 text-xs">(150-160자 권장)</span>
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="페이지에 대한 간단한 설명을 입력하세요"
                    maxLength={160}
                    rows={3}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    현재: {(formData.description || '').length}자
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    키워드 <span className="text-gray-500 text-xs">(쉼표로 구분)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.keywords || ''}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                    placeholder="크루즈, 크루즈 여행, 일본 크루즈"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Open Graph */}
              <div className="space-y-4 border-t pt-6">
                <h3 className="text-lg font-bold text-gray-900">Open Graph (Facebook, 카카오톡 공유용)</h3>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    OG 제목
                  </label>
                  <input
                    type="text"
                    value={formData.ogTitle || ''}
                    onChange={(e) => setFormData({ ...formData, ogTitle: e.target.value })}
                    placeholder="공유 시 표시될 제목"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    OG 설명
                  </label>
                  <textarea
                    value={formData.ogDescription || ''}
                    onChange={(e) => setFormData({ ...formData, ogDescription: e.target.value })}
                    placeholder="공유 시 표시될 설명"
                    rows={2}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    OG 이미지 URL
                  </label>
                  <input
                    type="text"
                    value={formData.ogImage || ''}
                    onChange={(e) => setFormData({ ...formData, ogImage: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    OG 타입
                  </label>
                  <select
                    value={formData.ogType || 'website'}
                    onChange={(e) => setFormData({ ...formData, ogType: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="website">웹사이트</option>
                    <option value="article">기사</option>
                    <option value="product">상품</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    OG URL
                  </label>
                  <input
                    type="text"
                    value={formData.ogUrl || ''}
                    onChange={(e) => setFormData({ ...formData, ogUrl: e.target.value })}
                    placeholder="공유할 정확한 URL"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Twitter Card */}
              <div className="space-y-4 border-t pt-6">
                <h3 className="text-lg font-bold text-gray-900">Twitter Card</h3>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Twitter Card 타입
                  </label>
                  <select
                    value={formData.twitterCard || 'summary_large_image'}
                    onChange={(e) => setFormData({ ...formData, twitterCard: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="summary">요약</option>
                    <option value="summary_large_image">요약 (큰 이미지)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Twitter 제목
                  </label>
                  <input
                    type="text"
                    value={formData.twitterTitle || ''}
                    onChange={(e) => setFormData({ ...formData, twitterTitle: e.target.value })}
                    placeholder="Twitter 공유 시 표시될 제목"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Twitter 설명
                  </label>
                  <textarea
                    value={formData.twitterDescription || ''}
                    onChange={(e) => setFormData({ ...formData, twitterDescription: e.target.value })}
                    placeholder="Twitter 공유 시 표시될 설명"
                    rows={2}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Twitter 이미지 URL
                  </label>
                  <input
                    type="text"
                    value={formData.twitterImage || ''}
                    onChange={(e) => setFormData({ ...formData, twitterImage: e.target.value })}
                    placeholder="https://example.com/twitter-image.jpg"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* 추가 설정 */}
              <div className="space-y-4 border-t pt-6">
                <h3 className="text-lg font-bold text-gray-900">추가 설정</h3>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    정규화 URL (Canonical)
                  </label>
                  <input
                    type="text"
                    value={formData.canonicalUrl || ''}
                    onChange={(e) => setFormData({ ...formData, canonicalUrl: e.target.value })}
                    placeholder="중복 콘텐츠 방지를 위한 정규화 URL"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Robots 메타 태그
                  </label>
                  <select
                    value={formData.robots || 'index, follow'}
                    onChange={(e) => setFormData({ ...formData, robots: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="index, follow">index, follow (기본)</option>
                    <option value="noindex, follow">noindex, follow</option>
                    <option value="index, nofollow">index, nofollow</option>
                    <option value="noindex, nofollow">noindex, nofollow</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex gap-3">
              <button
                onClick={() => {
                  setEditingConfig(null);
                  setIsCreating(false);
                  setFormData({});
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center gap-2"
              >
                <FiSave size={20} />
                저장하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEO 설정 목록 */}
      <div className="bg-white rounded-xl shadow-lg border-2 border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">
            SEO 설정 목록 ({filteredConfigs.length}개)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">페이지 경로</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">타입</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">제목</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">조회수</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">마지막 수정</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredConfigs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    {searchQuery ? '검색 결과가 없습니다.' : '등록된 SEO 설정이 없습니다.'}
                  </td>
                </tr>
              ) : (
                filteredConfigs.map((config) => (
                  <tr key={config.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <code className="text-sm text-blue-600 font-mono">{config.pagePath}</code>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{config.pageType}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                        {config.title || '(제목 없음)'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{config.viewCount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(config.lastUpdated).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(config)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="수정"
                        >
                          <FiEdit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(config.pagePath)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="삭제"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 안내 메시지 */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-blue-800 mb-2">💡 SEO 최적화 팁</h3>
        <ul className="text-sm text-blue-700 space-y-2 list-disc list-inside">
          <li><strong>제목:</strong> 60자 이내로 작성하고, 핵심 키워드를 앞부분에 배치하세요.</li>
          <li><strong>설명:</strong> 150-160자로 작성하고, 사용자에게 유용한 정보를 포함하세요.</li>
          <li><strong>키워드:</strong> 쉼표로 구분하여 3-5개의 관련 키워드를 입력하세요.</li>
          <li><strong>OG 이미지:</strong> 1200x630px 크기의 고품질 이미지를 사용하세요.</li>
          <li><strong>정규화 URL:</strong> 중복 콘텐츠가 있을 경우 정규화 URL을 설정하세요.</li>
          <li><strong>Robots:</strong> 검색 엔진에 노출하지 않을 페이지는 noindex로 설정하세요.</li>
        </ul>
      </div>
    </div>
  );
}






