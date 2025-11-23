// app/admin/chat-bot/page.tsx
// AI 지니 채팅봇(구매) 관리

'use client';

import { useState, useEffect } from 'react';
import { FiEdit2, FiTrash2, FiPlus, FiChevronRight, FiBarChart2, FiEye, FiLink, FiCopy } from 'react-icons/fi';
import Link from 'next/link';

interface ChatBotFlow {
  id: number;
  name: string;
  category: string;
  description?: string;
  startQuestionId?: number;
  finalPageUrl?: string;
  isActive: boolean;
  order: number;
  questionCount?: number;
  productCode?: string | null;
  isPublic?: boolean;
  shareToken?: string | null;
}

interface ChatBotTemplate {
  id: number;
  name: string;
  description?: string | null;
  questionCount: number;
  updatedAt: string;
  createdAt: string;
}

export default function ChatBotManagementPage() {
  const [flows, setFlows] = useState<ChatBotFlow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [templates, setTemplates] = useState<ChatBotTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [isCopying, setIsCopying] = useState<number | null>(null);
  const [templateSavingId, setTemplateSavingId] = useState<number | null>(null);
  const [isGeneratingShortlink, setIsGeneratingShortlink] = useState<number | null>(null);

  useEffect(() => {
    loadFlows();
    loadTemplates();
  }, []);

  const loadFlows = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/chat-bot/flows');
      if (!response.ok) throw new Error('Failed to load flows');
      
      const data = await response.json();
      setFlows(data.data || []);
    } catch (error) {
      console.error('Error loading flows:', error);
      alert('플로우를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까? 모든 질문도 함께 삭제됩니다.')) return;

    try {
      const response = await fetch(`/api/admin/chat-bot/flows/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete');
      
      setFlows(flows.filter(f => f.id !== id));
      alert('삭제되었습니다.');
    } catch (error) {
      console.error('Error deleting flow:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/chat-bot/flows/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (!response.ok) throw new Error('Failed to update');
      
      setFlows(flows.map(f => f.id === id ? { ...f, isActive: !currentStatus } : f));
    } catch (error) {
      console.error('Error updating flow:', error);
      alert('상태 변경 중 오류가 발생했습니다.');
    }
  };

  const loadTemplates = async () => {
    try {
      setIsLoadingTemplates(true);
      const response = await fetch('/api/admin/chat-bot/templates');
      if (!response.ok) throw new Error('Failed to load templates');

      const data = await response.json();
      setTemplates(data.data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      alert('템플릿을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleCopyFlow = async (flowId: number) => {
    const productCodeInput = prompt('복사할 상품 코드(예: SAMPLE-MED-001)를 입력하세요.');
    const productCode = productCodeInput?.trim();
    if (!productCode) return;
    try {
      setIsCopying(flowId);
      const response = await fetch(`/api/admin/chat-bot/flows/${flowId}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productCode }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || '플로우 복사에 실패했습니다.');
      }
      alert('플로우가 복사되었습니다.');
      loadFlows();
    } catch (error: any) {
      console.error('Error copying flow:', error);
      alert(error.message || '플로우 복사 중 오류가 발생했습니다.');
    } finally {
      setIsCopying(null);
    }
  };

  const handleSaveTemplate = async (flowId: number) => {
    const templateName = prompt('템플릿 이름을 입력해주세요. (미입력 시 기본 이름 사용)');
    if (templateName === null) return;
    try {
      setTemplateSavingId(flowId);
      const response = await fetch(`/api/admin/chat-bot/flows/${flowId}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'template',
          name: templateName?.trim() || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || '템플릿 저장에 실패했습니다.');
      }
      alert('템플릿으로 저장되었습니다.');
      loadTemplates();
    } catch (error: any) {
      console.error('Error saving template:', error);
      alert(error.message || '템플릿 저장 중 오류가 발생했습니다.');
    } finally {
      setTemplateSavingId(null);
    }
  };

  const handlePreview = (flow: ChatBotFlow) => {
    // shareToken이 있으면 공유 링크 사용, 없으면 일반 링크 사용
    let previewUrl = '/chat-bot';
    const params = new URLSearchParams();
    
    if (flow.shareToken && flow.isPublic) {
      previewUrl = `/chat-bot/share/${flow.shareToken}`;
    } else {
      // shareToken이 없으면 flowId를 쿼리로 전달 (미리보기용)
      params.set('flowId', flow.id.toString());
      params.set('preview', 'true'); // 미리보기 모드 표시
    }
    
    if (flow.productCode) {
      params.set('productCode', flow.productCode);
    }
    
    if (params.toString()) {
      previewUrl += `?${params.toString()}`;
    }
    
    // 새 창에서 열기
    window.open(previewUrl, '_blank', 'width=800,height=900');
  };

  const handleGenerateShortlink = async (flow: ChatBotFlow) => {
    try {
      setIsGeneratingShortlink(flow.id);
      
      // 공유 링크 URL 생성
      let targetUrl = '';
      if (flow.shareToken && flow.isPublic) {
        targetUrl = `${window.location.origin}/chat-bot/share/${flow.shareToken}`;
        if (flow.productCode) {
          targetUrl += `?productCode=${encodeURIComponent(flow.productCode)}`;
        }
      } else {
        // shareToken이 없으면 공개 설정 먼저 요청
        const makePublicResponse = await fetch(`/api/admin/chat-bot/flows/${flow.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            isPublic: true,
            shareToken: flow.shareToken || `share_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
          }),
        });
        
        if (!makePublicResponse.ok) {
          throw new Error('공개 설정에 실패했습니다.');
        }
        
        const publicData = await makePublicResponse.json();
        if (publicData.ok && publicData.data.shareToken) {
          targetUrl = `${window.location.origin}/chat-bot/share/${publicData.data.shareToken}`;
          if (flow.productCode) {
            targetUrl += `?productCode=${encodeURIComponent(flow.productCode)}`;
          }
          // 플로우 목록 새로고침
          loadFlows();
        } else {
          throw new Error('공개 토큰 생성에 실패했습니다.');
        }
      }
      
      if (!targetUrl) {
        throw new Error('공유 링크 URL을 생성할 수 없습니다.');
      }
      
      // 숏링크 생성
      const response = await fetch('/api/shortlink/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });
      
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.message || '숏링크 생성에 실패했습니다.');
      }
      
      // 클립보드에 복사
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(data.shortUrl);
        alert(`숏링크가 생성되었고 클립보드에 복사되었습니다!\n\n${data.shortUrl}`);
      } else {
        alert(`숏링크가 생성되었습니다!\n\n${data.shortUrl}\n\n위 링크를 복사해서 사용하세요.`);
      }
    } catch (error: any) {
      console.error('Error generating shortlink:', error);
      alert(error.message || '숏링크 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGeneratingShortlink(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                🤖 AI 지니 채팅봇(구매) 관리
              </h1>
              <p className="text-gray-600">
                SPIN 기반 상담 플로우와 질문을 관리합니다.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/admin/chat-bot/insights"
                className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <FiBarChart2 />
                인사이트
              </Link>
              <Link
                href="/admin/chat-bot/flows/new"
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <FiPlus />
                새 플로우 만들기
              </Link>
            </div>
          </div>
        </div>

        {/* 플로우 목록 */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">로딩 중...</p>
          </div>
        ) : flows.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 mb-4">등록된 플로우가 없습니다.</p>
            <Link
              href="/admin/chat-bot/flows/new"
              className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              첫 플로우 만들기
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {flows.map((flow) => (
              <div
                key={flow.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      {flow.name}
                    </h3>
                    {flow.description && (
                      <p className="text-gray-600 text-sm mb-2">
                        {flow.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>질문: {flow.questionCount || 0}개</span>
                      <span
                        className={`px-2 py-1 rounded ${
                          flow.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {flow.isActive ? '활성' : '비활성'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {flow.productCode && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                          상품 {flow.productCode}
                        </span>
                      )}
                      {flow.isPublic && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold">
                          공개 링크
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {flow.finalPageUrl && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">최종 페이지</p>
                    <p className="text-sm font-semibold text-blue-700 truncate">
                      {flow.finalPageUrl}
                    </p>
                  </div>
                )}
                {flow.isPublic && flow.shareToken && (
                  <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                    <p className="text-xs text-purple-700 mb-1">공유 토큰</p>
                    <p className="text-sm font-semibold text-purple-900 truncate">
                      {flow.shareToken}
                    </p>
                    <p className="text-xs text-purple-500 mt-1">
                      저장 후 링크: /chat-bot/share/{flow.shareToken}
                      {flow.productCode ? `?productCode=${flow.productCode}` : ''}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/admin/chat-bot/flows/${flow.id}`}
                    className="flex-1 min-w-[100px] px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <FiEdit2 />
                    편집
                  </Link>
                  <button
                    onClick={() => handlePreview(flow)}
                    className="px-4 py-2 bg-green-100 text-green-700 font-semibold rounded-lg hover:bg-green-200 transition-colors flex items-center gap-2"
                    title="새 창에서 미리보기"
                  >
                    <FiEye />
                    미리보기
                  </button>
                  <button
                    onClick={() => handleGenerateShortlink(flow)}
                    disabled={isGeneratingShortlink === flow.id}
                    className="px-4 py-2 bg-teal-100 text-teal-700 font-semibold rounded-lg hover:bg-teal-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                    title="숏링크 생성 및 복사"
                  >
                    {isGeneratingShortlink === flow.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-700"></div>
                        생성 중...
                      </>
                    ) : (
                      <>
                        <FiLink />
                        숏링크
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleCopyFlow(flow.id)}
                    disabled={isCopying === flow.id}
                    className="px-4 py-2 bg-purple-100 text-purple-700 font-semibold rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50"
                  >
                    {isCopying === flow.id ? '복사 중...' : '복사'}
                  </button>
                  <button
                    onClick={() => handleSaveTemplate(flow.id)}
                    disabled={templateSavingId === flow.id}
                    className="px-4 py-2 bg-indigo-100 text-indigo-700 font-semibold rounded-lg hover:bg-indigo-200 transition-colors disabled:opacity-50"
                  >
                    {templateSavingId === flow.id ? '저장 중...' : '템플릿'}
                  </button>
                  <button
                    onClick={() => handleToggleActive(flow.id, flow.isActive)}
                    className={`px-4 py-2 font-semibold rounded-lg transition-colors ${
                      flow.isActive
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {flow.isActive ? '비활성' : '활성'}
                  </button>
                  <button
                    onClick={() => handleDelete(flow.id)}
                    className="px-4 py-2 bg-red-100 text-red-700 font-semibold rounded-lg hover:bg-red-200 transition-colors"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* 템플릿 목록 */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">저장된 템플릿</h2>
              <p className="text-sm text-gray-600">자주 쓰는 상담 흐름을 템플릿으로 저장하고 재사용하세요.</p>
            </div>
            <button
              onClick={loadTemplates}
              className="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              새로고침
            </button>
          </div>
          {isLoadingTemplates ? (
            <div className="text-center py-8 text-gray-600">템플릿을 불러오는 중...</div>
          ) : templates.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
              아직 저장된 템플릿이 없습니다. 상단 플로우 카드에서 &apos;템플릿&apos; 버튼을 눌러 첫 템플릿을 만들어보세요.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {templates.map((template) => (
                <div key={template.id} className="bg-white rounded-lg shadow-md p-5 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{template.name}</h3>
                    <span className="text-xs text-gray-500">
                      {new Date(template.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {template.description && (
                    <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                  )}
                  <p className="text-xs text-gray-500 mb-4">질문 {template.questionCount}개</p>
                  <p className="text-xs text-gray-500">
                    새 플로우에서 템플릿을 선택하면 즉시 구조를 불러올 수 있습니다.
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

