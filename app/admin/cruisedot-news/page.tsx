'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface NewsPost {
  id: number;
  title: string;
  content: string;
  authorName: string;
  views: number;
  likes: number;
  comments: number;
  createdAt: string;
  updatedAt: string;
}

type TabType = 'news' | 'automation';

export default function CruisedotNewsManagementPage() {
  // 탭 상태
  const [activeTab, setActiveTab] = useState<TabType>('news');

  // ========== 뉴스 목록 상태 ==========
  const [newsPosts, setNewsPosts] = useState<NewsPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  // ========== 자동화 설정 상태 ==========
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isBotLoading, setIsBotLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastActivity, setLastActivity] = useState<string>('');
  const [isCreatingNews, setIsCreatingNews] = useState(false);
  const [createNewsResult, setCreateNewsResult] = useState<{ success: boolean; message: string; url?: string } | null>(null);

  // ========== 뉴스 목록 함수 ==========
  useEffect(() => {
    fetchNewsPosts();
    fetchBotStatus();
  }, []);

  const fetchNewsPosts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/community/posts?category=cruisedot-news&limit=100');
      const data = await response.json();

      if (data.ok && Array.isArray(data.posts)) {
        setNewsPosts(data.posts);
      } else {
        setError('뉴스를 불러오는데 실패했습니다.');
      }
    } catch (err) {
      console.error('[CruisedotNews] 뉴스 조회 실패:', err);
      setError('뉴스를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (post: NewsPost) => {
    setEditingId(post.id);
    setEditTitle(post.title);
    setEditContent(post.content);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditContent('');
  };

  const handleSaveEdit = async (id: number) => {
    try {
      const response = await fetch(`/api/community/posts?postId=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          content: editContent,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        alert('뉴스가 수정되었습니다.');
        setEditingId(null);
        fetchNewsPosts();
      } else {
        alert('수정 실패: ' + (data.error || '알 수 없는 오류'));
      }
    } catch (err) {
      console.error('[CruisedotNews] 수정 실패:', err);
      alert('수정 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 이 뉴스를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/community/posts?postId=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.ok) {
        alert('뉴스가 삭제되었습니다.');
        fetchNewsPosts();
      } else {
        alert('삭제 실패: ' + (data.error || '알 수 없는 오류'));
      }
    } catch (err) {
      console.error('[CruisedotNews] 삭제 실패:', err);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleCreateNew = () => {
    setIsCreating(true);
    setNewTitle('');
    setNewContent('');
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    setNewTitle('');
    setNewContent('');
  };

  const handleSaveNew = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }

    try {
      const response = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          content: newContent.trim(),
          category: 'cruisedot-news',
        }),
      });

      const data = await response.json();

      if (data.ok) {
        alert('뉴스가 생성되었습니다.');
        setIsCreating(false);
        setNewTitle('');
        setNewContent('');
        fetchNewsPosts();
      } else {
        alert('생성 실패: ' + (data.error || '알 수 없는 오류'));
      }
    } catch (err) {
      console.error('[CruisedotNews] 생성 실패:', err);
      alert('생성 중 오류가 발생했습니다.');
    }
  };

  // ========== 자동화 설정 함수 ==========
  const fetchBotStatus = async () => {
    try {
      const response = await fetch('/api/admin/community-bot/status');
      const data = await response.json();

      if (data.ok) {
        setIsActive(data.isActive || false);
        setLastActivity(data.lastActivity || '활동 기록 없음');
      }
    } catch (error) {
      console.error('[CommunityBot] 상태 조회 실패:', error);
    } finally {
      setIsBotLoading(false);
    }
  };

  const toggleBot = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/community-bot/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });

      const data = await response.json();

      if (data.ok) {
        setIsActive(data.isActive);
        alert(data.isActive ? '커뮤니티 봇이 활성화되었습니다.' : '커뮤니티 봇이 비활성화되었습니다.');
      } else {
        alert('설정 저장 실패: ' + (data.error || '알 수 없는 오류'));
      }
    } catch (error) {
      console.error('[CommunityBot] 설정 저장 실패:', error);
      alert('설정 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const createNewsManually = async () => {
    if (!confirm('크루즈뉘우스를 지금 생성하시겠습니까?')) {
      return;
    }

    setIsCreatingNews(true);
    setCreateNewsResult(null);

    try {
      const response = await fetch('/api/admin/community-bot/create-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (data.ok) {
        setCreateNewsResult({
          success: true,
          message: data.message || '크루즈뉘우스가 성공적으로 생성되었습니다.',
          url: data.news?.url,
        });
        fetchBotStatus();
        fetchNewsPosts(); // 뉴스 목록도 새로고침
      } else {
        setCreateNewsResult({
          success: false,
          message: data.error || '크루즈뉘우스 생성 실패',
        });
      }
    } catch (error) {
      console.error('[CommunityBot] 크루즈뉘우스 생성 실패:', error);
      setCreateNewsResult({
        success: false,
        message: '크루즈뉘우스 생성 중 오류가 발생했습니다.',
      });
    } finally {
      setIsCreatingNews(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">📰 크루즈뉴스 관리</h1>
        <p className="text-gray-600">크루즈뉴스 작성 및 자동화 봇을 관리합니다.</p>
      </div>

      {/* 탭 네비게이션 */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('news')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'news'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📋 뉴스 목록
          </button>
          <button
            onClick={() => setActiveTab('automation')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'automation'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🤖 자동화 설정
            {isActive && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                활성
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === 'news' ? (
        // ========== 뉴스 목록 탭 ==========
        <div>
          {/* 새 글 작성 버튼 */}
          {!isCreating && (
            <div className="mb-4 flex justify-end">
              <button
                onClick={handleCreateNew}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-md"
              >
                ✍️ 새 글 작성
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* 새 글 작성 폼 */}
          {isCreating && (
            <div className="mb-6 p-6 bg-white rounded-lg shadow-lg border-2 border-blue-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">새 크루즈뉴스 작성</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    제목 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="뉴스 제목을 입력하세요"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    내용 (HTML) <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="뉴스 내용을 HTML 형식으로 입력하세요"
                    rows={15}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    HTML 형식으로 입력하세요. 크루즈뉴스 템플릿 형식을 참고하세요.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveNew}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-semibold"
                  >
                    저장
                  </button>
                  <button
                    onClick={handleCancelCreate}
                    className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 뉴스 목록 테이블 */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">뉴스를 불러오는 중...</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        제목
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        작성자
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        조회수
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        좋아요
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        댓글
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        생성일
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        관리
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {newsPosts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                          등록된 뉴스가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      newsPosts.map((post) => (
                        <tr key={post.id} className="hover:bg-gray-50">
                          {editingId === post.id ? (
                            <>
                              <td colSpan={6} className="px-6 py-4">
                                <div className="space-y-3">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      제목
                                    </label>
                                    <input
                                      type="text"
                                      value={editTitle}
                                      onChange={(e) => setEditTitle(e.target.value)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      내용 (HTML)
                                    </label>
                                    <textarea
                                      value={editContent}
                                      onChange={(e) => setEditContent(e.target.value)}
                                      rows={10}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleSaveEdit(post.id)}
                                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                    >
                                      저장
                                    </button>
                                    <button
                                      onClick={handleCancelEdit}
                                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                                    >
                                      취소
                                    </button>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4"></td>
                            </>
                          ) : (
                            <>
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900 max-w-md truncate">
                                  {post.title}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {post.authorName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {post.views.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {post.likes.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {post.comments.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(post.createdAt)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleEdit(post)}
                                    className="text-blue-600 hover:text-blue-900"
                                  >
                                    수정
                                  </button>
                                  <button
                                    onClick={() => handleDelete(post.id)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    삭제
                                  </button>
                                  <Link
                                    href={`/community/cruisedot-news?post=db-${post.id}`}
                                    target="_blank"
                                    className="text-green-600 hover:text-green-900"
                                  >
                                    보기
                                  </Link>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        // ========== 자동화 설정 탭 ==========
        <div className="max-w-4xl space-y-6">
          {/* 봇 상태 */}
          <div className="border-2 rounded-lg p-6 bg-white shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">🤖 봇 상태</h2>
              <div className={`px-4 py-2 rounded-full font-bold ${
                isActive
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {isActive ? '🟢 활성화' : '⚫ 비활성화'}
              </div>
            </div>

            <div className="text-sm text-gray-600 mb-4">
              <p>마지막 활동: {lastActivity}</p>
            </div>

            <button
              onClick={toggleBot}
              disabled={isSaving || isBotLoading}
              className={`w-full py-3 px-6 rounded-lg font-bold text-white transition-all ${
                isActive
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-green-500 hover:bg-green-600'
              } ${(isSaving || isBotLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSaving ? '저장 중...' : isActive ? '⏸️ 봇 비활성화' : '▶️ 봇 활성화'}
            </button>
          </div>

          {/* 크루즈뉴스 수동 생성 */}
          <div className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
            <h3 className="text-lg font-semibold mb-3 text-blue-900">📰 크루즈뉴스 수동 생성</h3>
            <p className="text-sm text-blue-800 mb-4">
              AI가 자동으로 크루즈 관련 뉴스를 생성합니다.
              <br />
              (오늘 이미 생성된 경우 생성되지 않습니다)
            </p>

            {createNewsResult && (
              <div className={`mb-4 p-4 rounded-lg ${
                createNewsResult.success
                  ? 'bg-green-100 border border-green-300'
                  : 'bg-red-100 border border-red-300'
              }`}>
                <p className={`font-semibold ${
                  createNewsResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {createNewsResult.message}
                </p>
                {createNewsResult.success && createNewsResult.url && (
                  <a
                    href={createNewsResult.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-blue-600 hover:text-blue-800 underline"
                  >
                    생성된 뉴스 보기 →
                  </a>
                )}
              </div>
            )}

            <button
              onClick={createNewsManually}
              disabled={isCreatingNews}
              className={`w-full py-3 px-6 rounded-lg font-bold text-white transition-all ${
                isCreatingNews
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {isCreatingNews ? '생성 중...' : '📰 크루즈뉴스 지금 생성하기'}
            </button>
          </div>

          {/* 설명 */}
          <div className="border rounded-lg p-6 bg-gray-50">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">📋 봇 기능 설명</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• <strong>활성화</strong>: 봇이 자동으로 커뮤니티 게시글, 댓글, 대댓글을 생성합니다</li>
              <li>• <strong>비활성화</strong>: 봇이 일시적으로 커뮤니티 활동을 중단합니다</li>
              <li>• <strong>크루즈뉴스</strong>: 봇 상태와 무관하게 매일 오전 8시에 자동 생성됩니다</li>
              <li>• 봇을 끄면 크루즈뉴스는 계속 생성되지만, 커뮤니티 활동은 하지 않습니다</li>
            </ul>
          </div>

          {/* 활동 통계 */}
          <div className="border rounded-lg p-6 bg-gray-50">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">📊 활동 정보</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">게시글 길이 분포</p>
                <p className="font-semibold">100자, 300자, 500자, 1000자, 1500자 (각 20%)</p>
              </div>
              <div>
                <p className="text-gray-600">댓글/대댓글 길이 분포</p>
                <p className="font-semibold">10자, 30자, 50자, 100자, 150자 (각 20%)</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
