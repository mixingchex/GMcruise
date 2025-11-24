// app/admin/community/page.tsx
// 커뮤니티 관리 페이지 (기본 메뉴)

'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiTrash2, FiEdit2, FiSearch, FiFilter, FiX, FiSave } from 'react-icons/fi';
import { showSuccess, showError } from '@/components/ui/Toast';

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
  images?: string[] | null;
}

interface Category {
  id: string;
  label: string;
  value: string;
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'travel-tip', label: '여행팁', value: 'travel-tip' },
  { id: 'destination', label: '관광지추천', value: 'destination' },
  { id: 'qna', label: '질문 답변', value: 'qna' },
  { id: 'general', label: '일반', value: 'general' },
  { id: 'cruisedot-news', label: '크루즈닷뉴스', value: 'cruisedot-news' },
];

export default function CommunityManagementPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const loadPosts = useCallback(async () => {
    try {
      setIsLoading(true);
      const categoryParam = selectedCategory === 'all' ? '' : `&category=${selectedCategory}`;
      const searchParam = searchKeyword ? `&search=${encodeURIComponent(searchKeyword)}` : '';
      const response = await fetch(`/api/community/posts?limit=100${categoryParam}${searchParam}`);
      const data = await response.json();
      
      if (data.ok) {
        setPosts(data.posts || []);
      } else {
        showError('게시글을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('Error loading posts:', error);
      showError('게시글을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, searchKeyword]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const loadCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/mall/community/categories');
      const data = await response.json();
      
      if (data.ok && data.categories) {
        setCategories(data.categories);
      } else {
        // 기본 카테고리 사용
        setCategories(DEFAULT_CATEGORIES);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories(DEFAULT_CATEGORIES);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleDeletePost = async (postId: number) => {
    if (!confirm('정말 이 게시글을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/mall/community/posts/${postId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (data.ok) {
        showSuccess('게시글이 삭제되었습니다.');
        loadPosts();
      } else {
        showError(data.error || '게시글 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      showError('게시글 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleEditPost = (post: CommunityPost) => {
    setEditingPost(post);
    setIsEditModalOpen(true);
  };

  const handleSavePost = async (updatedPost: CommunityPost) => {
    try {
      const response = await fetch(`/api/admin/mall/community/posts/${updatedPost.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: updatedPost.title,
          content: updatedPost.content,
          images: updatedPost.images,
        }),
      });
      
      const data = await response.json();
      
      if (data.ok) {
        showSuccess('게시글이 수정되었습니다.');
        setIsEditModalOpen(false);
        setEditingPost(null);
        loadPosts();
      } else {
        showError(data.error || '게시글 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error updating post:', error);
      showError('게시글 수정 중 오류가 발생했습니다.');
    }
  };

  const getCategoryLabel = (categoryValue: string) => {
    const category = categories.find(c => c.value === categoryValue);
    return category?.label || categoryValue;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredPosts = posts.filter(post => {
    if (selectedCategory !== 'all' && post.category !== selectedCategory) {
      return false;
    }
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      return (
        post.title.toLowerCase().includes(keyword) ||
        post.content.toLowerCase().includes(keyword) ||
        post.authorName?.toLowerCase().includes(keyword)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          💬 커뮤니티 관리
        </h1>
        <p className="text-gray-600">
          커뮤니티 게시글을 조회, 수정, 삭제할 수 있습니다.
        </p>
      </div>

      {/* 검색 및 필터 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="게시글 제목, 내용, 작성자로 검색..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FiFilter className="w-5 h-5 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">전체 카테고리</option>
              {categories.map((category) => (
                <option key={category.id} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 게시글 목록 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          게시글 목록 ({filteredPosts.length}개)
        </h2>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">게시글을 불러오는 중...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchKeyword || selectedCategory !== 'all'
              ? '검색 결과가 없습니다.'
              : '게시글이 없습니다.'}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <div
                key={post.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-800">{post.title}</h3>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                        {getCategoryLabel(post.category)}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{post.content}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>작성자: {post.authorName || '익명'}</span>
                      <span>조회수: {post.views}</span>
                      <span>좋아요: {post.likes}</span>
                      <span>댓글: {post.comments}</span>
                      <span>작성일: {formatDate(post.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleEditPost(post)}
                      className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      title="게시글 수정"
                    >
                      <FiEdit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      title="게시글 삭제"
                    >
                      <FiTrash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 수정 모달 */}
      {isEditModalOpen && editingPost && (
        <EditPostModal
          post={editingPost}
          categories={categories}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingPost(null);
          }}
          onSave={handleSavePost}
        />
      )}
    </div>
  );
}

// 수정 모달 컴포넌트
function EditPostModal({
  post,
  categories,
  onClose,
  onSave,
}: {
  post: CommunityPost;
  categories: Category[];
  onClose: () => void;
  onSave: (post: CommunityPost) => void;
}) {
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      showError('제목과 내용을 입력해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        ...post,
        title: title.trim(),
        content: content.trim(),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b sticky top-0 bg-white flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">게시글 수정</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              제목
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              내용
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              required
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>카테고리: {categories.find(c => c.value === post.category)?.label || post.category}</span>
            <span>•</span>
            <span>작성자: {post.authorName || '익명'}</span>
            <span>•</span>
            <span>조회수: {post.views}</span>
            <span>•</span>
            <span>좋아요: {post.likes}</span>
            <span>•</span>
            <span>댓글: {post.comments}</span>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <FiSave className="w-4 h-4" />
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}










