'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

export default function CruisedotNewsManagementPage() {
  const router = useRouter();
  const [newsPosts, setNewsPosts] = useState<NewsPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  useEffect(() => {
    fetchNewsPosts();
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

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">뉴스를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📰 크루즈뉘우스 관리</h1>
          <p className="text-gray-600">크루즈뉘우스 글을 작성, 수정하거나 삭제할 수 있습니다.</p>
        </div>
        {!isCreating && (
          <button
            onClick={handleCreateNew}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-md"
          >
            ✍️ 새 글 작성
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {isCreating && (
        <div className="mb-6 p-6 bg-white rounded-lg shadow-lg border-2 border-blue-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">새 크루즈뉘우스 작성</h2>
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
                HTML 형식으로 입력하세요. 크루즈뉘우스 템플릿 형식을 참고하세요.
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
    </div>
  );
}

