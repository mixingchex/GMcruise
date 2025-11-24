'use client';

import { useState, useEffect } from 'react';

export default function CommunityBotPage() {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastActivity, setLastActivity] = useState<string>('');
  const [isCreatingNews, setIsCreatingNews] = useState(false);
  const [createNewsResult, setCreateNewsResult] = useState<{ success: boolean; message: string; url?: string } | null>(null);

  useEffect(() => {
    fetchBotStatus();
  }, []);

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
      setIsLoading(false);
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
        // 상태 새로고침
        fetchBotStatus();
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

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">🤖 커뮤니티 봇 관리</h1>
        
        <div className="space-y-6">
          {/* 상태 표시 */}
          <div className="border-2 rounded-lg p-6 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">봇 상태</h2>
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

            {/* 토글 버튼 */}
            <button
              onClick={toggleBot}
              disabled={isSaving}
              className={`w-full py-3 px-6 rounded-lg font-bold text-white transition-all ${
                isActive
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-green-500 hover:bg-green-600'
              } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSaving ? '저장 중...' : isActive ? '⏸️ 봇 비활성화 (쉬기)' : '▶️ 봇 활성화 (활동 시작)'}
            </button>
          </div>

          {/* 설명 */}
          <div className="border rounded-lg p-6 bg-blue-50">
            <h3 className="text-lg font-semibold mb-3 text-blue-900">📋 봇 기능 설명</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>• <strong>활성화</strong>: 봇이 자동으로 커뮤니티 게시글, 댓글, 대댓글을 생성합니다</li>
              <li>• <strong>비활성화</strong>: 봇이 일시적으로 커뮤니티 활동을 중단합니다 (쉬는 시간)</li>
              <li>• <strong>크루즈뉘우스</strong>: 봇 상태와 무관하게 매일 오전 8시에 자동 생성됩니다</li>
              <li>• <strong>커뮤니티 활동</strong>: 봇이 활성화되어 있을 때만 게시글/댓글/대댓글을 생성합니다</li>
              <li>• 봇을 끄면 크루즈뉘우스는 계속 생성되지만, 커뮤니티 활동은 하지 않습니다</li>
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

          {/* 크루즈뉘우스 수동 생성 */}
          <div className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
            <h3 className="text-lg font-semibold mb-3 text-blue-900">📰 크루즈뉘우스 수동 생성</h3>
            <p className="text-sm text-blue-800 mb-4">
              테스트를 위해 지금 바로 크루즈뉘우스를 생성할 수 있습니다.
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
              {isCreatingNews ? '생성 중...' : '📰 크루즈뉘우스 지금 생성하기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

