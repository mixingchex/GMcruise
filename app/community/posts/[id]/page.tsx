// app/community/posts/[id]/page.tsx
// 커뮤니티 게시글 상세 페이지

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft, FiHeart, FiMessageCircle, FiEye, FiTrash2 } from 'react-icons/fi';
import DOMPurify from 'isomorphic-dompurify';
import KakaoShareButton from '@/components/KakaoShareButton';

interface Post {
  id: number;
  title: string;
  content: string;
  category: string;
  authorName?: string;
  images?: string[];
  views: number;
  likes: number;
  comments: number;
  userId?: number;
  createdAt: string;
  updatedAt: string;
}

interface Comment {
  id: number;
  content: string;
  authorName?: string;
  userId?: number | null;
  parentCommentId?: number | null;
  replies?: Comment[];
  createdAt: string;
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null); // 답글 작성 중인 댓글 ID
  const [replyText, setReplyText] = useState(''); // 답글 내용
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true); // 로그인 상태 확인 중인지 여부
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false); // user1~user10 관리자 확인
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [postUserId, setPostUserId] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isCommunityMember, setIsCommunityMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [liking, setLiking] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);
  const [viewers, setViewers] = useState(0);
  const [viewerSessionId, setViewerSessionId] = useState<string | null>(null);
  const [hasLiked, setHasLiked] = useState(false);
  const shareDescription = useMemo(() => {
    if (!post?.content) return '크루즈 커뮤니티에서 생생한 후기를 확인해 보세요.';
    const plain = post.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return plain.slice(0, 140) || '크루즈 커뮤니티에서 생생한 후기를 확인해 보세요.';
  }, [post?.content]);

  // 랜덤 동시 접속자 수 생성 (2명 ~ 153명)
  useEffect(() => {
    if (!post?.id) return;

    const getRandomViewers = () => {
      if (post?.category === 'cruisedot-news') {
        return Math.max(24, Math.floor(82 + (Math.random() * 16 - 8)));
      }
      return Math.floor(Math.random() * (153 - 2 + 1)) + 2;
    };

    setViewers(getRandomViewers());

    let timeoutId: NodeJS.Timeout;
    
    const scheduleUpdate = () => {
      const randomInterval = Math.floor(Math.random() * (8000 - 3000 + 1)) + 3000; // 3~8초
      timeoutId = setTimeout(() => {
        setViewers(getRandomViewers());
        scheduleUpdate(); // 다음 업데이트 스케줄링
      }, randomInterval);
    };

    scheduleUpdate();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [post?.id, post?.category]);

  useEffect(() => {
    const postId = params?.id;
    if (!postId) return;
    const postIdStr = Array.isArray(postId) ? postId[0] : postId;

    // 로그인 상태 확인 (커뮤니티 전용)
    setIsCheckingAuth(true);
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        const role = (data.user?.role || '').toLowerCase();
        setUserRole(role || null);
        
        const isLoggedUser = !!(data.ok && data.user && data.user.id);
        setIsLoggedIn(isLoggedUser);
        setIsAdmin(role === 'admin');
        setIsCommunityMember(role === 'community' || role === 'admin');
        
        // 관리자 user1~user10 확인 (phone이 "user1"~"user10"으로 시작하는 경우)
        const adminUser = data.ok && data.user && role === 'admin' && 
          data.user.phone && /^user(1[0]|[1-9])$/.test(data.user.phone);
        console.log('[Post Detail] Admin check - ok:', data.ok);
        console.log('[Post Detail] Admin check - role:', data.user?.role);
        console.log('[Post Detail] Admin check - phone:', data.user?.phone);
        console.log('[Post Detail] Admin check - isAdminUser:', !!adminUser);
        console.log('[Post Detail] Admin check - full user data:', JSON.stringify(data.user, null, 2));
        setIsAdminUser(!!adminUser);
        
        if (isLoggedUser && data.user.id) {
          setCurrentUserId(data.user.id);
        }
      })
      .catch(() => {
        setIsLoggedIn(false);
        setCurrentUserId(null);
        setIsAdminUser(false);
        setUserRole(null);
        setIsCommunityMember(false);
      })
      .finally(() => {
        setIsCheckingAuth(false); // 로그인 상태 확인 완료
      });

    // 게시글 로드
    fetch(`/api/community/posts/${postIdStr}`)
      .then(res => res.json())
      .then(data => {
        console.log('[Post Detail] API Response:', data);
        if (data.ok && data.post) {
          setPost({
            ...data.post,
            images: Array.isArray(data.post.images) ? data.post.images : (typeof data.post.images === 'string' ? JSON.parse(data.post.images) : []),
            createdAt: typeof data.post.createdAt === 'string' ? data.post.createdAt : new Date(data.post.createdAt).toISOString(),
            updatedAt: typeof data.post.updatedAt === 'string' ? data.post.updatedAt : new Date(data.post.updatedAt).toISOString()
          });
          // 게시글 작성자 ID 저장
          if (data.post.userId) {
            setPostUserId(data.post.userId);
          }
        } else {
          console.error('[Post Detail] API Error:', data.error);
          // API 응답이 없거나 에러인 경우 에러 메시지 표시
          setPost(null);
        }
      })
      .catch((error) => {
        console.error('[Post Detail] Fetch Error:', error);
        // 에러 시 null로 설정하여 에러 메시지 표시
        setPost(null);
      })
      .finally(() => setLoading(false));

    // 댓글 로드 (초기 로드)
    const loadComments = async (id: string) => {
      try {
        console.log('[Comments] Loading comments for post:', id);
        const res = await fetch(`/api/community/posts/${id}/comments`);
        const data = await res.json();
        console.log('[Comments] API Response:', data);
        if (data.ok && Array.isArray(data.comments)) {
          console.log('[Comments] Loaded:', data.comments.length, 'comments');
          setComments(data.comments);
        } else {
          console.error('[Comments] API Error:', data.error);
          setComments([]);
        }
      } catch (error) {
        console.error('[Comments] Fetch Error:', error);
        setComments([]);
      }
    };

    if (postIdStr) {
      loadComments(postIdStr);
    }

    // 동시 접속자 등록 (실제 API 호출은 유지하되, 표시는 랜덤으로)
    fetch(`/api/community/posts/${postIdStr}/viewers`, {
      method: 'POST',
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setViewerSessionId(data.sessionId);
        }
      })
      .catch(() => {});

    // 페이지 언로드 시 접속자 제거
    return () => {
      if (viewerSessionId) {
        fetch(`/api/community/posts/${postIdStr}/viewers?sessionId=${viewerSessionId}`, {
          method: 'DELETE',
          credentials: 'include'
        }).catch(() => {});
      }
    };
  }, [params]);

  // 게시글이 로드되면 댓글도 다시 로드 (중복 방지를 위해 post?.id가 있을 때만)
  useEffect(() => {
    if (post?.id && comments.length === 0) {
      const postId = post.id.toString();
      console.log('[Post Detail] Re-loading comments for post:', postId);
      fetch(`/api/community/posts/${postId}/comments`)
        .then(res => res.json())
        .then(data => {
          console.log('[Post Detail] Comments API Response:', data);
          if (data.ok && Array.isArray(data.comments)) {
            console.log('[Post Detail] Loaded', data.comments.length, 'comments');
            setComments(data.comments);
          } else {
            console.error('[Post Detail] Comments API Error:', data.error);
          }
        })
        .catch((error) => {
          console.error('[Post Detail] Comments Fetch Error:', error);
        });
    }
  }, [post?.id]);

  // 실시간 조회수 업데이트 (30초마다)
  useEffect(() => {
    if (!post?.id) return;

    const updateViews = async () => {
      try {
        const response = await fetch(`/api/community/posts/${post.id}/view`, {
          method: 'POST',
          credentials: 'include'
        });
        const data = await response.json();
        if (data.ok) {
          setPost((prevPost) => {
            if (!prevPost) return prevPost;
            return { ...prevPost, views: data.views };
          });
        }
      } catch (error) {
        console.error('Failed to update views:', error);
      }
    };

    // 첫 업데이트는 5초 후
    const firstTimeout = setTimeout(updateViews, 5000);

    // 이후 30초마다 업데이트
    const interval = setInterval(updateViews, 30000);

    return () => {
      clearTimeout(firstTimeout);
      clearInterval(interval);
    };
  }, [post?.id]);

  // 동시 접속자 수는 랜덤으로 표시되므로 이 useEffect는 제거됨

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

  const handleLike = async () => {
    if (!post || hasLiked || liking) return;
    
    // 로그인 상태 확인 중이면 대기
    if (isCheckingAuth) {
      return;
    }
    
    // 로그인하지 않은 경우 로그인 페이지로 이동
    if (!isLoggedIn) {
      router.push('/signup?next=' + encodeURIComponent(`/community/posts/${params.id}`));
      return;
    }
    
    setLiking(true);
    try {
      const response = await fetch(`/api/community/posts/${post.id}/like`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();
      if (data.ok) {
        setPost((prevPost) => {
          if (!prevPost) return prevPost;
          return { ...prevPost, likes: data.likes };
        });
        setHasLiked(true);
      }
    } catch (error) {
      console.error('Failed to like post:', error);
    } finally {
      setLiking(false);
    }
  };

  // 댓글 작성
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    
    // 로그인 상태 확인 중이면 대기
    if (isCheckingAuth) {
      return;
    }
    
    if (!isLoggedIn) {
      router.push('/signup?next=' + encodeURIComponent(`/community/posts/${params.id}`));
      return;
    }

    // 외부 링크 차단
    const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/gi;
    if (urlPattern.test(commentText)) {
      alert('외부 링크는 업로드할 수 없습니다.');
      return;
    }

    setSubmitting(true);
    try {
      const requestBody = { 
        content: commentText.trim()
      };
      
      console.log('[Comment Submit] Request body:', {
        hasContent: !!requestBody.content,
        contentLength: requestBody.content.length
      });

      const response = await fetch(`/api/community/posts/${params.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      console.log('[Comment Submit] Response status:', response.status);
      const data = await response.json();
      console.log('[Comment Submit] Response data:', data);
      
      if (data.ok && data.comment) {
        // 댓글 목록 다시 로드
        const commentsRes = await fetch(`/api/community/posts/${params.id}/comments`);
        const commentsData = await commentsRes.json();
        if (commentsData.ok && Array.isArray(commentsData.comments)) {
          setComments(commentsData.comments);
        }
        
        // 게시글 정보도 다시 로드하여 정확한 댓글 수 반영
        const postRes = await fetch(`/api/community/posts/${params.id}`);
        const postData = await postRes.json();
        if (postData.ok && postData.post && post) {
          setPost({ ...post, comments: postData.post.comments });
        }
        
        // 폼 초기화
        setCommentText('');
      } else {
        const errorMsg = data.error || '댓글 작성에 실패했습니다.';
        const details = data.details ? `\n\n상세: ${data.details}` : '';
        const errorCode = data.errorCode ? `\n에러 코드: ${data.errorCode}` : '';
        console.error('[Comment Submit] Error:', {
          status: response.status,
          error: data.error,
          details: data.details,
          errorCode: data.errorCode,
          fullResponse: data
        });
        alert(`${errorMsg}${details}${errorCode}\n\n서버 콘솔 로그를 확인해주세요.`);
      }
    } catch (error: any) {
      console.error('[Comment Submit] Fetch error:', error);
      alert(`댓글 작성 중 오류가 발생했습니다.\n\n${error?.message || '알 수 없는 오류'}\n\n서버 콘솔 로그를 확인해주세요.`);
    } finally {
      setSubmitting(false);
    }
  };

  // 답글 작성
  const handleSubmitReply = async (parentCommentId: number) => {
    if (!replyText.trim()) return;
    
    // 로그인 상태 확인 중이면 대기
    if (isCheckingAuth) {
      return;
    }
    
    if (!isLoggedIn) {
      router.push('/signup?next=' + encodeURIComponent(`/community/posts/${params.id}`));
      return;
    }

    // parentCommentId를 정수로 변환 (안전하게)
    const parsedParentId = Math.floor(parentCommentId);
    if (isNaN(parsedParentId) || parsedParentId <= 0) {
      console.error('[Reply Submit] Invalid parent comment ID:', parentCommentId);
      alert('잘못된 댓글 ID입니다.');
      return;
    }

    // 외부 링크 차단
    const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/gi;
    if (urlPattern.test(replyText)) {
      alert('외부 링크는 업로드할 수 없습니다.');
      return;
    }

    setSubmitting(true);
    try {
      const requestBody = { 
        content: replyText.trim(),
        parentCommentId: parsedParentId // 정수로 변환된 ID 전달
      };
      
      console.log('[Reply Submit] Request body:', requestBody);
      console.log('[Reply Submit] Parent comment ID:', requestBody.parentCommentId, 'Type:', typeof requestBody.parentCommentId);
      console.log('[Reply Submit] Original parentCommentId:', parentCommentId, 'Parsed:', parsedParentId);
      
      // 현재 로드된 댓글에서 부모 댓글 ID 확인
      const parentCommentExists = comments.some(c => {
        const commentId = typeof c.id === 'number' ? Math.floor(c.id) : parseInt(String(c.id), 10);
        return commentId === parsedParentId;
      });
      console.log('[Reply Submit] Parent comment exists in loaded comments:', parentCommentExists);
      console.log('[Reply Submit] Available comment IDs:', comments.map(c => {
        const id = typeof c.id === 'number' ? Math.floor(c.id) : parseInt(String(c.id), 10);
        return { original: c.id, parsed: id, type: typeof c.id };
      }));

      const response = await fetch(`/api/community/posts/${params.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      
      if (data.ok && data.comment) {
        // 댓글 목록 다시 로드
        const commentsRes = await fetch(`/api/community/posts/${params.id}/comments`);
        const commentsData = await commentsRes.json();
        if (commentsData.ok && Array.isArray(commentsData.comments)) {
          setComments(commentsData.comments);
        }
        
        // 게시글 정보도 다시 로드하여 정확한 댓글 수 반영
        const postRes = await fetch(`/api/community/posts/${params.id}`);
        const postData = await postRes.json();
        if (postData.ok && postData.post && post) {
          setPost({ ...post, comments: postData.post.comments });
        }
        
        // 답글 폼 초기화
        setReplyText('');
        setReplyingTo(null);
      } else {
        const errorMsg = data.error || '답글 작성에 실패했습니다.';
        alert(errorMsg);
      }
    } catch (error: any) {
      console.error('[Reply Submit] Fetch error:', error);
      alert(`답글 작성 중 오류가 발생했습니다.\n\n${error?.message || '알 수 없는 오류'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!post) return;
    
    const isMyPost = currentUserId && postUserId && currentUserId === postUserId;
    const canDelete = isMyPost || isAdminUser;
    
    if (!canDelete) {
      alert('본인의 게시글만 삭제할 수 있습니다.');
      return;
    }
    
    if (!confirm('정말 이 게시글을 삭제하시겠습니까?')) {
      return;
    }
    
    try {
      const postId = Array.isArray(params.id) ? params.id[0] : params.id;
      const response = await fetch(`/api/community/posts/${postId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      const data = await response.json();
      if (data.ok) {
        alert('게시글이 삭제되었습니다.');
        router.push('/community');
      } else {
        alert(data.error || '게시글 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to delete post:', error);
      alert('게시글 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('정말 이 댓글을 삭제하시겠습니까?')) {
      return;
    }

    setDeletingCommentId(commentId);
    try {
      const response = await fetch(`/api/community/posts/${params.id}/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();
      if (data.ok) {
        // 댓글 목록에서 제거
        setComments(comments.filter(c => c.id !== commentId));
        // 게시글 정보도 다시 로드하여 정확한 댓글 수 반영
        fetch(`/api/community/posts/${params.id}`)
          .then(res => res.json())
          .then(data => {
            if (data.ok && data.post && post) {
              setPost({ ...post, comments: data.post.comments });
            }
          });
      } else {
        alert(data.error || '댓글 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
      alert('댓글 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingCommentId(null);
    }
  };

  // Hooks는 항상 같은 순서로 호출되어야 하므로 early return 전에 호출
  const categoryInfo = useMemo(() => {
    if (!post) return { label: '일반', color: 'bg-gray-100 text-gray-800' };
    return getCategoryLabel(post.category);
  }, [post?.category]);

  const displayedViews = useMemo(() => {
    if (!post) return 0;
    if (post.category === 'cruisedot-news') {
      return Math.max(post.views, 4872 + Math.floor(Math.random() * 180));
    }
    return post.views;
  }, [post?.category, post?.views]);

  const displayedLikes = useMemo(() => {
    if (!post) return 0;
    if (post.category === 'cruisedot-news') {
      return Math.max(post.likes, 268 + Math.floor(Math.random() * 40));
    }
    return post.likes;
  }, [post?.category, post?.likes]);

  const canWriteComment = useMemo(() => {
    // 로그인 상태 확인 중이면 댓글 작성 불가
    if (isCheckingAuth) return false;
    if (!post) return false;
    if (post.category === 'cruisedot-news') {
      return isCommunityMember;
    }
    return isLoggedIn;
  }, [post, isCommunityMember, isLoggedIn, isCheckingAuth]);

  const shouldShowMembershipNotice = useMemo(() => {
    if (!post) return false;
    if (post.category === 'cruisedot-news') {
      return !!userRole && !isCommunityMember;
    }
    return false;
  }, [post, userRole, isCommunityMember]);

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

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">게시글을 찾을 수 없습니다.</p>
          <Link href="/community" className="text-blue-600 hover:text-blue-700">
            커뮤니티로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* 이전으로 가기 */}
          <div className="mb-6">
            <Link
              href="/community"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
            >
              <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" size={20} />
              <span className="font-medium">목록으로</span>
            </Link>
          </div>

          {/* 게시글 */}
          <article className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
            {/* 헤더 */}
            <div className="border-b border-gray-200 pb-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${categoryInfo.color}`}>
                  {categoryInfo.label}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{post.title}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-2">
                  <span>👤</span>
                  <span className="font-medium text-gray-700">{post.authorName || '익명'}</span>
                </span>
                <span>{new Date(post.createdAt).toLocaleDateString('ko-KR')}</span>
              </div>
            </div>

            <div className="mb-8">
              <KakaoShareButton
                title={`[크루즈 커뮤니티] ${post.title}`}
                description={shareDescription}
                imageUrl="/images/ai-cruise-logo.png"
                buttonText="카카오톡으로 이 글 공유하기"
              />
              <p className="text-xs text-gray-500 mt-2">현재 보고 있는 게시글 링크가 카카오톡으로 전송됩니다.</p>
            </div>

            {/* 이미지 갤러리 */}
            {post.images && post.images.length > 0 && (
              <div className="mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {post.images.map((image, index) => (
                    <div key={index} className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={image}
                        alt={`${post.title} - 이미지 ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800';
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 내용 */}
            <div className="prose max-w-none mb-8">
              {post.category === 'cruisedot-news' ? (
                <div className="not-prose overflow-hidden rounded-2xl border border-rose-100 bg-rose-50/40 shadow-inner">
                  <div
                    className="news-html px-6 py-6 text-[17px] leading-7 text-slate-700"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }}
                  />
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed text-base">
                  {post.content.split('\n').map((line, idx) => (
                    <p key={idx} className="mb-3">
                      {line || '\u00A0'}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* 통계 및 좋아요 버튼 */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-gray-600">
                    <FiEye size={20} />
                    <span className="font-medium">{displayedViews}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <FiMessageCircle size={20} />
                    <span className="font-medium">{post.comments}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleLike}
                    disabled={liking || hasLiked}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                      hasLiked 
                        ? 'bg-red-100 text-red-600 cursor-not-allowed' 
                        : 'bg-red-50 hover:bg-red-100 text-red-600'
                    }`}
                  >
                    <FiHeart size={20} className={hasLiked || displayedLikes > 0 ? 'fill-red-600' : ''} />
                    <span className="font-medium">{displayedLikes}</span>
                  </button>
                  {/* 삭제 버튼 (본인 게시글이거나 관리자 user1~user10인 경우) */}
                  {(currentUserId && postUserId && currentUserId === postUserId) || isAdminUser ? (
                    <button
                      onClick={handleDeletePost}
                      className="flex items-center justify-center w-10 h-10 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title={isAdminUser && (!currentUserId || !postUserId || currentUserId !== postUserId) ? "관리자 권한으로 삭제" : "게시글 삭제"}
                    >
                      <FiTrash2 size={20} />
                    </button>
                  ) : null}
                </div>
              </div>
              {/* 동시 접속자 수 표시 (항상 표시) */}
              <div className="text-sm text-orange-600 mt-2 font-medium">
                이 글을 {viewers}명이 같이 보고 있습니다
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="https://www.cruiseai.co.kr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center px-4 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl shadow hover:bg-indigo-700 transition"
                >
                  크루즈 가이드 3일 체험 로그인
                </Link>
                <Link
                  href="https://leadgeny.kr/i/yog"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center px-4 py-3 bg-white text-indigo-700 text-sm font-semibold rounded-xl border-2 border-indigo-100 hover:border-indigo-300 transition"
                >
                  크루즈 여행 가성비갑 만나기
                </Link>
              </div>
            </div>
          </article>

          {/* 댓글 섹션 */}
          <div className="mt-8 bg-white rounded-xl shadow-lg p-8 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6">댓글 ({comments.length})</h2>
            
            {/* 댓글 목록 */}
            <div className="space-y-4 mb-6">
              {comments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">첫 댓글을 남겨보세요!</p>
              ) : (
                comments.map((comment) => {
                  const isMyComment = currentUserId && comment.userId && comment.userId === currentUserId;
                  const canDelete = isMyComment || isAdmin; // 본인 댓글이거나 관리자면 삭제 가능
                  
                  // 댓글 ID를 정수로 변환 (안전하게)
                  const commentId = typeof comment.id === 'number' ? Math.floor(comment.id) : parseInt(String(comment.id), 10);
                  
                  if (isNaN(commentId)) {
                    console.error('[Comment Render] Invalid comment ID:', comment.id, 'Type:', typeof comment.id);
                    return null; // 잘못된 ID는 렌더링하지 않음
                  }
                  
                  return (
                    <div key={commentId} className="border-b border-gray-100 pb-4 last:border-b-0">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">{comment.authorName || '익명'}</span>
                              {isAdmin && !isMyComment && (
                                <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">관리자 삭제 가능</span>
                              )}
                              <span className="text-sm text-gray-500">
                                {new Date(comment.createdAt).toLocaleDateString('ko-KR', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {isLoggedIn && (
                                <button
                                  onClick={() => {
                                    console.log('[Reply Button] Clicked, comment ID:', commentId, 'Type:', typeof commentId);
                                    setReplyingTo(replyingTo === commentId ? null : commentId);
                                    setReplyText('');
                                  }}
                                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                >
                                  {replyingTo === commentId ? '취소' : '답글'}
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => handleDeleteComment(commentId)}
                                  disabled={deletingCommentId === commentId}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title={isAdmin && !isMyComment ? "관리자 권한으로 삭제" : "댓글 삭제"}
                                >
                                  <FiTrash2 size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                          
                          {/* 답글 작성 폼 */}
                          {replyingTo === commentId && (
                            <div className="mt-4 pl-4 border-l-2 border-blue-200">
                              <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="답글을 입력하세요..."
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none mb-2 text-sm"
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setReplyingTo(null);
                                    setReplyText('');
                                  }}
                                  className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                  취소
                                </button>
                                <button
                                  onClick={() => {
                                    console.log('[Reply Submit Button] Clicked, comment ID:', commentId, 'Type:', typeof commentId);
                                    handleSubmitReply(commentId);
                                  }}
                                  disabled={submitting || !replyText.trim()}
                                  className="px-4 py-1.5 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {submitting ? '작성 중...' : '답글 작성'}
                                </button>
                              </div>
                            </div>
                          )}
                          
                          {/* 대댓글 목록 */}
                          {comment.replies && comment.replies.length > 0 && (
                            <div className="mt-4 ml-4 pl-4 border-l-2 border-gray-200 space-y-3">
                              {comment.replies.map((reply) => {
                                const isMyReply = currentUserId && reply.userId && reply.userId === currentUserId;
                                const canDeleteReply = isMyReply || isAdmin;
                                
                                // 답글 ID를 정수로 변환
                                const replyId = typeof reply.id === 'number' ? Math.floor(reply.id) : parseInt(String(reply.id), 10);
                                
                                if (isNaN(replyId)) {
                                  console.error('[Reply Render] Invalid reply ID:', reply.id);
                                  return null;
                                }
                                
                                return (
                                  <div key={replyId} className="pb-3 border-b border-gray-100 last:border-b-0">
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold text-sm text-gray-800">{reply.authorName || '익명'}</span>
                                        <span className="text-xs text-gray-500">
                                          {new Date(reply.createdAt).toLocaleDateString('ko-KR', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </span>
                                      </div>
                                      {canDeleteReply && (
                                        <button
                                          onClick={() => handleDeleteComment(replyId)}
                                          disabled={deletingCommentId === replyId}
                                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                          title="답글 삭제"
                                        >
                                          <FiTrash2 size={14} />
                                        </button>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{reply.content}</p>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            {/* 댓글 수 표시 */}
            {comments.length > 0 && (
              <div className="text-sm text-gray-600 mb-4">
                총 {comments.length}개의 댓글이 있습니다.
              </div>
            )}

            {/* 댓글 작성 폼 */}
            {canWriteComment ? (
              <form onSubmit={handleSubmitComment} className="border-t border-gray-200 pt-6">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="댓글을 입력하세요... (외부 링크는 업로드할 수 없습니다)"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none mb-3"
                />
                
                <p className="text-xs text-gray-500 mb-3">외부 링크(URL)는 업로드할 수 없습니다.</p>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting || !commentText.trim()}
                    className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? '작성 중...' : '댓글 작성'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="border-t border-gray-200 pt-6 text-center">
                {shouldShowMembershipNotice ? (
                  <p className="text-gray-600">
                    본사 게시글은 크루즈몰 정회원만 댓글을 남길 수 있습니다.
                  </p>
                ) : (
                  <>
                    <p className="text-gray-600 mb-4">댓글을 작성하려면 회원가입이 필요합니다.</p>
                    <Link
                      href={`/signup?next=${encodeURIComponent(`/community/posts/${params.id}`)}`}
                      className="inline-block px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      회원가입하기
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
















