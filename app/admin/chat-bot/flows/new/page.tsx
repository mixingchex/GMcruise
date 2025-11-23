// app/admin/chat-bot/flows/new/page.tsx
// 새 플로우 만들기 - 타입봇 스타일 시각적 플로우 빌더

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { showSuccess, showError } from '@/components/ui/Toast';

// React Flow를 동적으로 로드하여 SSR 문제 해결
type ProductOption = {
  productCode: string;
  label: string;
  saleStatus?: string | null;
  isGeniePack?: boolean | null;
};

type TemplateSummary = {
  id: number;
  name: string;
  description?: string | null;
  questionCount: number;
  updatedAt: string;
};

const FlowCanvas = dynamic(
  () => import('./FlowCanvas'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">플로우 에디터를 불러오는 중...</p>
        </div>
      </div>
    )
  }
);

export default function NewFlowPage() {
  const router = useRouter();
  const [flowName, setFlowName] = useState('');
  const [flowDescription, setFlowDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [selectedProductCode, setSelectedProductCode] = useState('');
  const [finalPageUrl, setFinalPageUrl] = useState('');
  const [finalPageIsManual, setFinalPageIsManual] = useState(false);
  const [isPublicFlow, setIsPublicFlow] = useState(false);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);

  // AI로 플로우 생성
  const generateFlowWithAI = async (prompt: string) => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/admin/chat-bot/generate-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();
      if (data.ok && data.nodes && data.edges) {
        showSuccess('AI가 플로우를 생성했습니다!');
        return { nodes: data.nodes, edges: data.edges, name: data.name };
      } else {
        throw new Error(data.error || '플로우 생성 실패');
      }
    } catch (error: any) {
      console.error('AI 플로우 생성 오류:', error);
      showError(error.message || 'AI 플로우 생성 중 오류가 발생했습니다.');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  // 상품 목록 로드
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setIsLoadingProducts(true);
        const response = await fetch('/api/admin/products', {
          credentials: 'include',
        });
        const data = await response.json();
        if (data.ok && Array.isArray(data.products)) {
          const options: ProductOption[] = data.products.map((product: any) => ({
            productCode: product.productCode,
            label: `${product.productCode} · ${product.cruiseLine} ${product.shipName} (${product.packageName})`,
            saleStatus: product.saleStatus,
            isGeniePack: product.isGeniePack,
          }));
          setProductOptions(options);
        } else {
          showError(data.error || data.message || '상품 목록을 불러오지 못했습니다.');
        }
      } catch (error: any) {
        console.error('[NewFlowPage] Failed to load products:', error);
        showError('상품 목록을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoadingProducts(false);
      }
    };

    loadProducts();
  }, []);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setIsLoadingTemplates(true);
        const response = await fetch('/api/admin/chat-bot/templates', {
          credentials: 'include',
        });
        
        if (!response.ok) {
          if (response.status === 403) {
            const data = await response.json().catch(() => ({ error: '관리자 권한이 필요합니다.' }));
            console.error('Error loading templates:', data.error || '관리자 권한이 필요합니다.');
            // 403 에러는 조용히 처리 (템플릿 목록만 비움)
            setTemplates([]);
            return;
          }
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        if (data.ok && Array.isArray(data.data)) {
          setTemplates(data.data);
        } else {
          console.error('[NewFlowPage] Template response error:', data.error);
          setTemplates([]);
        }
      } catch (error: any) {
        console.error('Error loading templates:', error);
        // 네트워크 오류 등의 경우 조용히 처리
        setTemplates([]);
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    loadTemplates();
  }, []);

  // 상품 선택 시 기본 결제 페이지 적용
  useEffect(() => {
    if (!selectedProductCode) {
      if (!finalPageIsManual) {
        setFinalPageUrl('');
      }
      return;
    }

    if (!finalPageIsManual) {
      setFinalPageUrl(`/products/${selectedProductCode}/payment`);
    }
  }, [selectedProductCode, finalPageIsManual]);

  const handleFinalPageChange = (value: string) => {
    setFinalPageUrl(value);
    setFinalPageIsManual(true);
  };

  const applyDefaultFinalPage = () => {
    if (!selectedProductCode) return;
    setFinalPageIsManual(false);
    setFinalPageUrl(`/products/${selectedProductCode}/payment`);
  };

  const selectedProductLabel = useMemo(() => {
    return productOptions.find((option) => option.productCode === selectedProductCode)?.label || '';
  }, [productOptions, selectedProductCode]);

  const fetchTemplateDetail = async (templateId: number) => {
    try {
      const response = await fetch(`/api/admin/chat-bot/templates/${templateId}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || '템플릿을 불러오지 못했습니다.');
      }
      return data.data;
    } catch (error: any) {
      console.error('[NewFlowPage] Failed to fetch template detail:', error);
      showError(error.message || '템플릿을 불러오는 중 오류가 발생했습니다.');
      return null;
    }
  };

  // 플로우 저장
  const handleSave = async (nodes: any[], edges: any[]) => {
    if (!flowName.trim()) {
      showError('플로우 이름을 입력해주세요.');
      return;
    }

    if (nodes.length === 0) {
      showError('최소 하나의 노드를 추가해주세요.');
      return;
    }

    if (selectedProductCode && !finalPageUrl.trim()) {
      showError('상품을 연결하면 최종 페이지 URL도 함께 입력해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      // 플로우 생성
      const flowResponse = await fetch('/api/admin/chat-bot/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: flowName,
          description: flowDescription,
          productCode: selectedProductCode || null,
          finalPageUrl: finalPageUrl?.trim() || null,
          isPublic: isPublicFlow,
        }),
      });

      const flowData = await flowResponse.json();
      if (!flowData.ok) throw new Error(flowData.error || '플로우 생성 실패');

      const flowId = flowData.data.id;

      // 노드와 엣지를 질문으로 변환하여 저장
      const questionsResponse = await fetch(`/api/admin/chat-bot/flows/${flowId}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          nodes,
          edges,
        }),
      });

      const questionsData = await questionsResponse.json();
      if (!questionsData.ok) throw new Error(questionsData.error || '질문 저장 실패');

      showSuccess('플로우가 저장되었습니다!');
      router.push(`/admin/chat-bot/flows/${flowId}`);
    } catch (error: any) {
      console.error('플로우 저장 오류:', error);
      showError(error.message || '플로우 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <FlowCanvas
      onAddNode={() => {}}
      onSave={handleSave}
      onGenerateAI={generateFlowWithAI}
      flowName={flowName}
      setFlowName={setFlowName}
      flowDescription={flowDescription}
      setFlowDescription={setFlowDescription}
      aiPrompt={aiPrompt}
      setAiPrompt={setAiPrompt}
      isGenerating={isGenerating}
      isSaving={isSaving}
      productOptions={productOptions}
      isLoadingProducts={isLoadingProducts}
      selectedProductCode={selectedProductCode}
      setSelectedProductCode={(code) => {
        setSelectedProductCode(code);
        if (!code) {
          setFinalPageIsManual(false);
          setFinalPageUrl('');
        }
      }}
      finalPageUrl={finalPageUrl}
      onFinalPageChange={handleFinalPageChange}
      finalPageIsManual={finalPageIsManual}
      onApplyDefaultFinalPage={applyDefaultFinalPage}
      isPublicFlow={isPublicFlow}
      setIsPublicFlow={setIsPublicFlow}
      selectedProductLabel={selectedProductLabel}
      templates={templates}
      isLoadingTemplates={isLoadingTemplates}
      onLoadTemplate={fetchTemplateDetail}
    />
  );
}
