'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import type {
  Node,
  Edge,
  Connection,
  NodeTypes,
} from 'reactflow';
import {
  FiSave,
  FiX,
  FiPlus,
  FiMessageSquare,
  FiHelpCircle,
  FiCode,
  FiZap,
  FiCheckCircle,
  FiPlay,
  FiTag,
  FiLink,
  FiShare2,
  FiSearch,
  FiRefreshCw,
  FiLayers,
  FiImage,
} from 'react-icons/fi';
import { MdAutoAwesome } from 'react-icons/md';
import dynamic from 'next/dynamic';
import { showError, showSuccess } from '@/components/ui/Toast';
import Image from 'next/image';

// 노드 타입 정의
type NodeType = 'start' | 'text' | 'question' | 'condition' | 'ai' | 'action' | 'end';

interface FlowNode extends Node {
  type: NodeType;
  data: {
    label: string;
    content?: string;
    questionType?: 'single' | 'multiple' | 'text';
    options?: string[];
    condition?: string;
    actionType?: 'redirect' | 'variable' | 'api';
    actionValue?: string;
  };
}

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

type TemplateDetail = {
  id: number;
  name: string;
  description?: string | null;
  startQuestionId?: number | null;
  questions: Array<{
    id: number;
    questionText: string | null;
    information?: string | null;
    questionType?: string | null;
    optionA?: string | null;
    optionB?: string | null;
    nextQuestionIdA?: number | null;
    nextQuestionIdB?: number | null;
    order?: number | null;
  }>;
};

// React Flow 컴포넌트를 동적으로 로드
const ReactFlowComponent = dynamic(
  () => import('./ReactFlowWrapper'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">플로우 에디터를 불러오는 중...</p>
        </div>
      </div>
    )
  }
);

function FlowCanvas({
  onAddNode,
  onSave,
  onGenerateAI,
  flowName,
  setFlowName,
  flowDescription,
  setFlowDescription,
  aiPrompt,
  setAiPrompt,
  isGenerating,
  isSaving,
  productOptions,
  isLoadingProducts,
  selectedProductCode,
  setSelectedProductCode,
  finalPageUrl,
  onFinalPageChange,
  finalPageIsManual,
  onApplyDefaultFinalPage,
  isPublicFlow,
  setIsPublicFlow,
  selectedProductLabel,
  templates,
  isLoadingTemplates,
  onLoadTemplate,
}: {
  onAddNode: (type: NodeType) => void;
  onSave: (nodes: Node[], edges: Edge[]) => Promise<void>;
  onGenerateAI: (prompt: string) => Promise<{ nodes: Node[]; edges: Edge[]; name?: string } | null>;
  flowName: string;
  setFlowName: (name: string) => void;
  flowDescription: string;
  setFlowDescription: (desc: string) => void;
  aiPrompt: string;
  setAiPrompt: (prompt: string) => void;
  isGenerating: boolean;
  isSaving: boolean;
  productOptions: ProductOption[];
  isLoadingProducts: boolean;
  selectedProductCode: string;
  setSelectedProductCode: (code: string) => void;
  finalPageUrl: string;
  onFinalPageChange: (value: string) => void;
  finalPageIsManual: boolean;
  onApplyDefaultFinalPage: () => void;
  isPublicFlow: boolean;
  setIsPublicFlow: (value: boolean) => void;
  selectedProductLabel: string;
  templates: TemplateSummary[];
  isLoadingTemplates: boolean;
  onLoadTemplate: (templateId: number) => Promise<TemplateDetail | null>;
}) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [chatMessages, setChatMessages] = useState<
    Array<{ id: string; role: 'assistant' | 'user'; content: string }>
  >([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        '안녕하세요! 👋 원하는 상담 흐름을 자연스럽게 설명해 주시면, 제가 질문과 분기 구조를 제안해 드릴게요.',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatGenerating, setIsChatGenerating] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | ''>('');
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewMessages, setPreviewMessages] = useState<Array<{ id: string; role: 'assistant' | 'user'; content: string; options?: string[]; nodeId?: string }>>([]);
  const [previewInput, setPreviewInput] = useState('');
  const [currentPreviewNodeId, setCurrentPreviewNodeId] = useState<string | null>(null);
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [previewVariables, setPreviewVariables] = useState<Record<string, any>>({});

  const filteredProductOptions = useMemo(() => {
    if (!productSearch.trim()) return productOptions;
    const keyword = productSearch.trim().toLowerCase();
    return productOptions.filter((option) =>
      option.label.toLowerCase().includes(keyword) ||
      option.productCode.toLowerCase().includes(keyword),
    );
  }, [productOptions, productSearch]);

  const selectedProduct = useMemo(
    () => productOptions.find((option) => option.productCode === selectedProductCode),
    [productOptions, selectedProductCode],
  );

  const summarizeCurrentFlow = useCallback(() => {
    const summarizedNodes = nodes.slice(0, 12).map((node) => ({
      id: node.id,
      type: node.type,
      label: node.data?.label || node.data?.content || '',
      questionType: node.data?.questionType,
      options: node.data?.options || [],
    }));
    const summarizedEdges = edges.slice(0, 20).map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
    }));

    return {
      nodes: summarizedNodes,
      edges: summarizedEdges,
    };
  }, [nodes, edges]);

  const normalizeFlowSuggestion = useCallback((suggestion: any) => {
    if (!suggestion || !Array.isArray(suggestion.nodes) || !Array.isArray(suggestion.edges)) {
      return null;
    }

    const processedNodes: Node[] = suggestion.nodes.map((node: any, index: number) => ({
      id: node.id || `node-${Date.now()}-${index}`,
      type: (node.type as NodeType) || 'text',
      position:
        node.position && typeof node.position.x === 'number' && typeof node.position.y === 'number'
          ? node.position
          : {
              x: 150 + (index % 3) * 240,
              y: 120 + Math.floor(index / 3) * 200,
            },
      data: {
        label: node.data?.label || node.data?.content || '',
        content: node.data?.content || node.data?.label || '',
        questionType: node.data?.questionType || 'single',
        options: node.data?.options || [],
        condition: node.data?.condition || '',
        actionType: node.data?.actionType || 'redirect',
        actionValue: node.data?.actionValue || '',
      },
    }));

    const processedEdges: Edge[] = suggestion.edges.map((edge: any, index: number) => ({
      id: edge.id || `edge-${Date.now()}-${index}`,
      source: edge.source,
      target: edge.target,
    }));

    return { nodes: processedNodes, edges: processedEdges };
  }, []);

  const handleChatSend = useCallback(async () => {
    if (isChatGenerating || !chatInput.trim()) return;

    const trimmedMessage = chatInput.trim();
    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user' as const,
      content: trimmedMessage,
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    setIsChatGenerating(true);

    try {
      const conversationPayload = {
        messages: [...chatMessages, userMessage].slice(-8).map(({ role, content }) => ({
          role,
          content,
        })),
        productCode: selectedProductCode || null,
        productLabel: selectedProductLabel || null,
        currentFlow: summarizeCurrentFlow(),
      };

      const response = await fetch('/api/admin/chat-bot/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(conversationPayload),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'AI 응답을 받아오지 못했어요.');
      }

      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant' as const,
        content: data.message || '새로운 아이디어를 준비해 뒀어요!',
      };

      setChatMessages((prev) => [...prev, assistantMessage]);

      if (data.flowSuggestion) {
        const normalized = normalizeFlowSuggestion(data.flowSuggestion);
        if (normalized) {
          setNodes(normalized.nodes);
          setEdges(normalized.edges);
          showSuccess('AI가 제안한 플로우를 적용했어요.');
        }
      }
    } catch (error) {
      console.error('[FlowCanvas] Conversation error:', error);
      showError(error instanceof Error ? error.message : '대화 생성 중 오류가 발생했습니다.');
      setChatMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          content: '죄송해요. 지금은 도와드릴 수 없어요. 다시 시도해 주세요.',
        },
      ]);
    } finally {
      setIsChatGenerating(false);
    }
  }, [
    chatInput,
    chatMessages,
    isChatGenerating,
    normalizeFlowSuggestion,
    selectedProductCode,
    selectedProductLabel,
    summarizeCurrentFlow,
  ]);

  // 노드 추가 함수
  const addNode = useCallback((type: NodeType, position?: { x: number; y: number }) => {
    // 기본 위치는 화면 중앙 근처로 설정
    const defaultPosition = position || { 
      x: (nodes.length % 3) * 250 + 200, 
      y: Math.floor(nodes.length / 3) * 200 + 150 
    };
    
    const newNode: FlowNode = {
      id: `node-${Date.now()}`,
      type,
      position: defaultPosition,
      data: {
        label: type === 'start' ? '시작' : type === 'end' ? '종료' : '',
        content: '',
        questionType: 'single',
        options: [],
        condition: '',
        actionType: 'redirect',
        actionValue: '',
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes, nodes.length]);

  // 엣지 연결
  const onConnect = useCallback(
    (params: Connection) => {
      // addEdge는 ReactFlowWrapper에서 가져옴
      setEdges((eds) => {
        // 간단한 엣지 추가 로직
        const newEdge = {
          id: `edge-${params.source}-${params.target}`,
          source: params.source,
          target: params.target,
        };
        return [...eds, newEdge as Edge];
      });
    },
    [setEdges]
  );

  // 노드 클릭 시 설정 패널 열기
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    console.log('[FlowCanvas] 노드 클릭:', node.id, node.type);
    event.stopPropagation();
    setSelectedNode(node);
    // 노드 선택 상태 업데이트
    setNodes((nds) => 
      nds.map((n) => ({
        ...n,
        selected: n.id === node.id,
      }))
    );
  }, [setNodes]);

  // 노드 더블클릭 시 설정 패널 열기 (더블클릭도 지원)
  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    event.stopPropagation();
    setSelectedNode(node);
    // 노드 선택 상태 업데이트
    setNodes((nds) => 
      nds.map((n) => ({
        ...n,
        selected: n.id === node.id,
      }))
    );
  }, [setNodes]);

  // 캔버스 클릭 시 선택 해제
  const onPaneClick = useCallback((event: React.MouseEvent) => {
    // 노드가 아닌 빈 공간을 클릭했을 때만 선택 해제
    if ((event.target as HTMLElement).closest('.react-flow__node')) {
      return;
    }
    setSelectedNode(null);
    setNodes((nds) => 
      nds.map((n) => ({
        ...n,
        selected: false,
      }))
    );
  }, [setNodes]);

  // 드래그 앤 드롭: 노드 타입을 드래그 시작할 때
  const onDragStart = useCallback((event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  // 드래그 오버 시 (드롭 허용)
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // 드롭 시 노드 추가
  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    
    const nodeType = event.dataTransfer.getData('application/reactflow') as NodeType;
    if (!nodeType) return;

    // React Flow의 위치 정보를 가져옴 (FlowComponent에서 설정됨)
    const reactFlowX = event.dataTransfer.getData('reactFlowX');
    const reactFlowY = event.dataTransfer.getData('reactFlowY');

    let position: { x: number; y: number } | undefined;
    
    if (reactFlowX && reactFlowY) {
      // React Flow 좌표계를 사용
      position = {
        x: parseFloat(reactFlowX),
        y: parseFloat(reactFlowY),
      };
    } else {
      // 폴백: 화면 좌표 사용
      const reactFlowBounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
      position = {
        x: event.clientX - reactFlowBounds.left - 100,
        y: event.clientY - reactFlowBounds.top - 50,
      };
    }

    addNode(nodeType, position);
    showSuccess(`${nodeType} 노드가 추가되었습니다.`);
  }, [addNode]);

  // AI로 플로우 생성
  const generateFlowWithAI = async () => {
    if (!aiPrompt.trim()) {
      showError('플로우 설명을 입력해주세요.');
      return;
    }

    try {
      const result = await onGenerateAI(aiPrompt);
      if (result && result.nodes && result.edges) {
        // 노드를 정규화하여 설정
        const normalized = normalizeFlowSuggestion(result);
        if (normalized) {
          setNodes(normalized.nodes);
          setEdges(normalized.edges);
          if (result.name) setFlowName(result.name);
          showSuccess('AI가 플로우를 생성했습니다!');
        } else {
          showError('생성된 플로우 형식이 올바르지 않습니다.');
        }
      } else {
        showError('플로우 생성에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error: any) {
      console.error('[FlowCanvas] AI 생성 오류:', error);
      showError(error.message || 'AI 플로우 생성 중 오류가 발생했습니다.');
    }
  };

  const convertTemplateToFlow = useCallback((template: TemplateDetail) => {
    const templateQuestions = [...(template.questions || [])].sort(
      (a, b) => (a.order || 0) - (b.order || 0)
    );

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const nodeIdMap = new Map<number, string>();

    newNodes.push({
      id: 'node-start',
      type: 'start',
      position: { x: 250, y: 40 },
      data: { label: '시작' },
    });

    let yPos = 150;
    templateQuestions.forEach((question, idx) => {
      const nodeId = `node-template-${question.id}-${idx}`;
      nodeIdMap.set(question.id, nodeId);

      const nodeType: NodeType =
        question.questionType === 'choice' ? 'question' : 'text';

      newNodes.push({
        id: nodeId,
        type: nodeType,
        position: { x: 250, y: yPos },
        data: {
          label: nodeType === 'question' ? '질문' : '안내',
          content: question.questionText || question.information || '',
          questionType: 'single',
          options: [question.optionA, question.optionB].filter(Boolean) as string[],
        },
      });

      yPos += 160;
    });

    newNodes.push({
      id: 'node-end',
      type: 'end',
      position: { x: 250, y: yPos },
      data: { label: '종료' },
    });

    templateQuestions.forEach((question, index) => {
      const currentNodeId = nodeIdMap.get(question.id);
      if (!currentNodeId) return;

      if (template.startQuestionId && question.id === template.startQuestionId) {
        newEdges.push({
          id: `edge-start-${question.id}`,
          source: 'node-start',
          target: currentNodeId,
        });
      }

      if (question.nextQuestionIdA) {
        const targetId = nodeIdMap.get(question.nextQuestionIdA);
        if (targetId) {
          newEdges.push({
            id: `edge-${question.id}-A`,
            source: currentNodeId,
            target: targetId,
          });
        }
      }

      if (question.nextQuestionIdB) {
        const targetId = nodeIdMap.get(question.nextQuestionIdB);
        if (targetId) {
          newEdges.push({
            id: `edge-${question.id}-B`,
            source: currentNodeId,
            target: targetId,
          });
        }
      }
    });

    if (!template.startQuestionId && templateQuestions.length > 0) {
      const firstNodeId = nodeIdMap.get(templateQuestions[0].id);
      if (firstNodeId) {
        newEdges.push({
          id: `edge-start-${templateQuestions[0].id}`,
          source: 'node-start',
          target: firstNodeId,
        });
      }
    }

    return { nodes: newNodes, edges: newEdges };
  }, []);

  const applyTemplate = useCallback(async () => {
    if (!selectedTemplateId) return;
    try {
      setIsApplyingTemplate(true);
      const template = await onLoadTemplate(selectedTemplateId);
      if (!template) {
        showError('템플릿을 불러오지 못했습니다.');
        return;
      }
      const converted = convertTemplateToFlow(template);
      setNodes(converted.nodes);
      setEdges(converted.edges);
      if (!flowName.trim()) {
        setFlowName(`${template.name} 복사본`);
      }
      if (template.description && !flowDescription.trim()) {
        setFlowDescription(template.description);
      }
      showSuccess('템플릿을 적용했습니다! 필요한 부분만 수정해 주세요.');
    } catch (error) {
      console.error('[FlowCanvas] Failed to load template:', error);
      showError('템플릿을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsApplyingTemplate(false);
    }
  }, [convertTemplateToFlow, flowDescription, flowName, onLoadTemplate, selectedTemplateId, setFlowDescription, setFlowName]);

  // 플로우 저장
  const handleSave = async () => {
    await onSave(nodes, edges);
  };

  // 미리보기 플로우 실행
  const executePreviewFlow = useCallback(async (userInput: string, selectedOption?: number) => {
    // 시작 노드 찾기
    let nextNodeId = currentPreviewNodeId;
    
    if (!nextNodeId) {
      const startNode = nodes.find((n) => n.type === 'start');
      if (!startNode) return;
      
      // 시작 노드에서 연결된 다음 노드 찾기
      const startEdge = edges.find((e) => e.source === startNode.id);
      if (startEdge) {
        nextNodeId = startEdge.target;
      }
    } else {
      // 현재 노드에서 다음 노드 찾기
      const currentNode = nodes.find((n) => n.id === nextNodeId);
      if (!currentNode) return;

      // question 노드에서 사용자 입력 처리
      if (currentNode.type === 'question') {
        const nodeData = currentNode.data as any;
        
        if (nodeData.questionType === 'text') {
          // 텍스트 입력: 그대로 다음 노드로
          const nextEdge = edges.find((e) => e.source === nextNodeId);
          if (nextEdge) {
            nextNodeId = nextEdge.target;
          }
        } else if (selectedOption !== undefined && nodeData.options) {
          // 선택지 입력: 선택지에 해당하는 엣지 찾기
          const optionValue = nodeData.options[selectedOption];
          if (optionValue) {
            // 선택된 옵션에 해당하는 엣지 찾기 (라벨 매칭)
            const nextEdge = edges.find((e) => e.source === nextNodeId && (e.label === optionValue || e.label === `${selectedOption + 1}`));
            if (nextEdge) {
              nextNodeId = nextEdge.target;
            } else {
              // 매칭되는 엣지가 없으면 첫 번째 엣지 사용
              const defaultEdge = edges.find((e) => e.source === nextNodeId);
              if (defaultEdge) {
                nextNodeId = defaultEdge.target;
              }
            }
          }
        } else {
          // 입력이 없으면 대기
          return;
        }
      } else if (currentNode.type === 'condition') {
        // 조건 분기 노드: 조건 평가
        const nodeData = currentNode.data as any;
        const condition = nodeData.condition || '';
        
        // 간단한 조건 평가 (변수와 비교)
        let conditionResult = false;
        try {
          // 변수 값을 사용하여 조건 평가 (한글 변수명 포함)
          const evalCondition = condition.replace(/([\w가-힣]+)/g, (match: string) => {
            if (previewVariables[match] !== undefined) {
              const value = previewVariables[match];
              // 문자열인 경우 따옴표로 감싸기
              if (typeof value === 'string') {
                return `"${value.replace(/"/g, '\\"')}"`;
              }
              return String(value);
            }
            // 변수에 없으면 문자열로 처리 (한글 등)
            if (/[가-힣]/.test(match)) {
              return `"${match}"`;
            }
            return match;
          });
          // eslint-disable-next-line no-eval
          conditionResult = eval(evalCondition);
        } catch (e) {
          console.error('조건 평가 실패:', e);
          conditionResult = false;
        }
        
        // 조건 결과에 따라 왼쪽(참) 또는 오른쪽(거짓) 엣지 찾기
        const trueEdge = edges.find((e) => e.source === nextNodeId && e.sourceHandle === 'left');
        const falseEdge = edges.find((e) => e.source === nextNodeId && e.sourceHandle === 'right');
        
        if (conditionResult && trueEdge) {
          nextNodeId = trueEdge.target;
        } else if (!conditionResult && falseEdge) {
          nextNodeId = falseEdge.target;
        } else {
          // 기본 엣지 사용
          const defaultEdge = edges.find((e) => e.source === nextNodeId);
          if (defaultEdge) {
            nextNodeId = defaultEdge.target;
          }
        }
      } else {
        // 다른 노드: 다음 노드로
        const nextEdge = edges.find((e) => e.source === nextNodeId);
        if (nextEdge) {
          nextNodeId = nextEdge.target;
        } else {
          // 더 이상 연결된 노드가 없으면 종료
          setPreviewMessages((prev) => [
            ...prev,
            {
              id: `preview-end-${Date.now()}`,
              role: 'assistant',
              content: nodeData?.endMessage || '플로우가 종료되었습니다.',
            },
          ]);
          setCurrentPreviewNodeId(null);
          setWaitingForInput(false);
          return;
        }
      }
    }

    if (!nextNodeId) return;

    const nextNode = nodes.find((n) => n.id === nextNodeId);
    if (!nextNode) return;

    setCurrentPreviewNodeId(nextNodeId);
    setWaitingForInput(false);

    // 노드 타입에 따라 처리
    const nodeData = nextNode.data as any;
    
    if (nextNode.type === 'text') {
      setPreviewMessages((prev) => [
        ...prev,
        {
          id: `preview-${nextNodeId}-${Date.now()}`,
          role: 'assistant',
          content: nodeData.content || '메시지가 없습니다.',
        },
      ]);
      
      // 텍스트 노드 다음 노드 찾기
      const textEdge = edges.find((e) => e.source === nextNodeId);
      if (textEdge) {
        setTimeout(() => {
          executePreviewFlow('');
        }, 100);
      }
    } else if (nextNode.type === 'question') {
      let questionText = nodeData.content || '질문이 없습니다.';
      
      const questionMessage: any = {
        id: `preview-${nextNodeId}-${Date.now()}`,
        role: 'assistant',
        content: questionText,
        options: nodeData.options || [],
        nodeId: nextNodeId,
      };

      // 유튜브 동영상 추가
      if (nodeData.videoUrl) {
        questionMessage.videoUrl = nodeData.videoUrl;
      }

      // 크루즈정보사진 추가
      if (nodeData.images && nodeData.images.length > 0) {
        questionMessage.images = nodeData.images;
      }

      // 크루즈몰 후기 추가
      if (nodeData.showReviews) {
        try {
          const reviewCount = nodeData.reviewCount || 3;
          const response = await fetch(`/api/public/reviews?limit=${reviewCount}`);
          const data = await response.json();
          if (data.ok && data.reviews) {
            questionMessage.reviews = data.reviews;
          }
          setPreviewMessages((prev) => [...prev, questionMessage]);
        } catch (error) {
          console.error('후기 로드 실패:', error);
          setPreviewMessages((prev) => [...prev, questionMessage]);
        }
      } else {
        setPreviewMessages((prev) => [...prev, questionMessage]);
      }
      
      setWaitingForInput(true);
    } else if (nextNode.type === 'condition') {
      const conditionText = nodeData.condition || '조건이 없습니다.';
      const trueLabel = nodeData.trueLabel || '참';
      const falseLabel = nodeData.falseLabel || '거짓';
      
      setPreviewMessages((prev) => [
        ...prev,
        {
          id: `preview-${nextNodeId}-${Date.now()}`,
          role: 'assistant',
          content: `[조건 분기] ${conditionText} (${trueLabel} / ${falseLabel})`,
        },
      ]);
      
      // 조건 평가 후 자동으로 다음 노드로
      setTimeout(() => {
        executePreviewFlow('');
      }, 100);
    } else if (nextNode.type === 'ai') {
      const prompt = nodeData.content || 'AI 프롬프트가 설정되지 않았습니다.';
      
      setPreviewMessages((prev) => [
        ...prev,
        {
          id: `preview-${nextNodeId}-${Date.now()}`,
          role: 'assistant',
          content: `[AI 생성 중...] ${prompt}`,
        },
      ]);
      
      // 실제 AI 응답 생성 (미리보기에서는 시뮬레이션)
      try {
        const response = await fetch('/api/admin/chat-bot/conversation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
          }),
        });
        
        const data = await response.json();
        if (data.ok && data.message) {
          setPreviewMessages((prev) => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg && lastMsg.role === 'assistant' && lastMsg.content.includes('[AI 생성 중...]')) {
              updated[updated.length - 1] = {
                ...lastMsg,
                content: data.message,
              };
            }
            return updated;
          });
        }
      } catch (error) {
        console.error('AI 응답 생성 실패:', error);
      }
      
      const aiEdge = edges.find((e) => e.source === nextNodeId);
      if (aiEdge) {
        setTimeout(() => {
          executePreviewFlow('');
        }, 500);
      }
    } else if (nextNode.type === 'action') {
      const actionType = nodeData.actionType || 'redirect';
      const actionValue = nodeData.actionValue || '';
      const responseAction = nodeData.responseAction || 'none';
      
      // 액션 실행
      if (actionType === 'variable') {
        // 변수 설정: key = value 형식 파싱
        const match = actionValue.match(/(\w+)\s*=\s*(.+)/);
        if (match) {
          const [, key, value] = match;
          const trimmedValue = value.trim();
          // 숫자로 변환 시도
          const numValue = Number(trimmedValue);
          const finalValue = isNaN(numValue) ? trimmedValue : numValue;
          
          setPreviewVariables((prev) => ({
            ...prev,
            [key.trim()]: finalValue,
          }));
          
          setPreviewMessages((prev) => [
            ...prev,
            {
              id: `preview-${nextNodeId}-${Date.now()}`,
              role: 'assistant',
              content: `[변수 설정] ${key.trim()} = ${finalValue}`,
            },
          ]);
        }
      } else if (actionType === 'api') {
        // API 호출
        setPreviewMessages((prev) => [
          ...prev,
          {
            id: `preview-${nextNodeId}-${Date.now()}`,
            role: 'assistant',
            content: `[API 호출 중...] ${actionValue}`,
          },
        ]);
        
        try {
          const response = await fetch(actionValue, {
            method: 'GET',
            credentials: 'include',
          });
          
          const data = await response.json();
          
          if (responseAction === 'save') {
            // 응답을 변수로 저장
            setPreviewVariables((prev) => ({
              ...prev,
              [`api_${nextNodeId}`]: data,
            }));
            
            setPreviewMessages((prev) => {
              const updated = [...prev];
              const lastMsg = updated[updated.length - 1];
              if (lastMsg && lastMsg.content.includes('[API 호출 중...]')) {
                updated[updated.length - 1] = {
                  ...lastMsg,
                  content: `[API 호출 완료] 응답이 변수로 저장되었습니다.`,
                };
              }
              return updated;
            });
          } else if (responseAction === 'display') {
            // 응답을 사용자에게 표시
            setPreviewMessages((prev) => {
              const updated = [...prev];
              const lastMsg = updated[updated.length - 1];
              if (lastMsg && lastMsg.content.includes('[API 호출 중...]')) {
                updated[updated.length - 1] = {
                  ...lastMsg,
                  content: `[API 응답] ${JSON.stringify(data, null, 2)}`,
                };
              }
              return updated;
            });
          } else {
            // 응답 무시
            setPreviewMessages((prev) => {
              const updated = [...prev];
              const lastMsg = updated[updated.length - 1];
              if (lastMsg && lastMsg.content.includes('[API 호출 중...]')) {
                updated[updated.length - 1] = {
                  ...lastMsg,
                  content: `[API 호출 완료] ${actionValue}`,
                };
              }
              return updated;
            });
          }
        } catch (error: any) {
          setPreviewMessages((prev) => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg && lastMsg.content.includes('[API 호출 중...]')) {
              updated[updated.length - 1] = {
                ...lastMsg,
                content: `[API 호출 실패] ${error.message || '알 수 없는 오류'}`,
              };
            }
            return updated;
          });
        }
      } else if (actionType === 'redirect') {
        // 리다이렉트는 미리보기에서 시뮬레이션만
        setPreviewMessages((prev) => [
          ...prev,
          {
            id: `preview-${nextNodeId}-${Date.now()}`,
            role: 'assistant',
            content: `[리다이렉트] ${actionValue}로 이동합니다.`,
          },
        ]);
      }
      
      const actionEdge = edges.find((e) => e.source === nextNodeId);
      if (actionEdge) {
        setTimeout(() => {
          executePreviewFlow('');
        }, actionType === 'api' ? 500 : 100);
      }
    } else if (nextNode.type === 'end') {
      const endMessage = nodeData.endMessage || nodeData.content || '플로우가 종료되었습니다.';
      
      setPreviewMessages((prev) => [
        ...prev,
        {
          id: `preview-end-${Date.now()}`,
          role: 'assistant',
          content: endMessage,
        },
      ]);
      setCurrentPreviewNodeId(null);
      setWaitingForInput(false);
    }
  }, [nodes, edges, currentPreviewNodeId, previewVariables]);

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* 헤더 */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-full mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => window.history.back()}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">새 플로우 만들기</h1>
                  <p className="text-sm text-gray-600">타입봇 스타일로 시각적으로 플로우를 만들어보세요</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (nodes.length === 0) {
                      showError('최소 하나의 노드를 추가해주세요.');
                      return;
                    }
                    // 미리보기 모달 열기 및 초기화
                    setShowPreview(true);
                    setPreviewMessages([]);
                    setPreviewInput('');
                    setCurrentPreviewNodeId(null);
                    setWaitingForInput(false);
                    setPreviewVariables({});
                    // 미리보기 시작 시 자동으로 첫 노드 실행
                    setTimeout(() => {
                      executePreviewFlow('');
                    }, 100);
                  }}
                  disabled={nodes.length === 0}
                  className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <FiPlay />
                  미리보기
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <FiSave />
                  {isSaving ? '저장 중...' : '저장하기'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex h-[calc(100vh-80px)]">
          {/* 왼쪽 사이드바 - 노드 추가 및 설정 */}
          <div className="w-80 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
            {/* 노드 추가 버튼들 - 맨 위로 이동하여 항상 보이도록 */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-br from-slate-50 to-slate-100 sticky top-0 z-10">
              <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <FiPlus className="text-slate-700" />
                노드 추가
              </h2>
              <div className="space-y-2">
                <div
                  draggable
                  onDragStart={(e) => onDragStart(e, 'start')}
                  onClick={() => addNode('start')}
                  className="w-full px-4 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors flex items-center gap-2 font-semibold cursor-move active:opacity-70 select-none"
                >
                  <FiPlay />
                  시작 노드
                  <span className="ml-auto text-xs opacity-60">드래그하여 추가</span>
                </div>
                <div
                  draggable
                  onDragStart={(e) => onDragStart(e, 'text')}
                  onClick={() => addNode('text')}
                  className="w-full px-4 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2 font-semibold cursor-move active:opacity-70 select-none"
                >
                  <FiMessageSquare />
                  텍스트 메시지
                  <span className="ml-auto text-xs opacity-60">드래그하여 추가</span>
                </div>
                <div
                  draggable
                  onDragStart={(e) => onDragStart(e, 'question')}
                  onClick={() => addNode('question')}
                  className="w-full px-4 py-3 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors flex items-center gap-2 font-semibold cursor-move active:opacity-70 select-none"
                >
                  <FiHelpCircle />
                  질문 노드
                  <span className="ml-auto text-xs opacity-60">드래그하여 추가</span>
                </div>
                <div
                  draggable
                  onDragStart={(e) => onDragStart(e, 'condition')}
                  onClick={() => addNode('condition')}
                  className="w-full px-4 py-3 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors flex items-center gap-2 font-semibold cursor-move active:opacity-70 select-none"
                >
                  <FiCode />
                  조건 분기
                  <span className="ml-auto text-xs opacity-60">드래그하여 추가</span>
                </div>
                <div
                  draggable
                  onDragStart={(e) => onDragStart(e, 'ai')}
                  onClick={() => addNode('ai')}
                  className="w-full px-4 py-3 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200 transition-colors flex items-center gap-2 font-semibold cursor-move active:opacity-70 select-none"
                >
                  <MdAutoAwesome />
                  AI 응답
                  <span className="ml-auto text-xs opacity-60">드래그하여 추가</span>
                </div>
                <div
                  draggable
                  onDragStart={(e) => onDragStart(e, 'action')}
                  onClick={() => addNode('action')}
                  className="w-full px-4 py-3 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors flex items-center gap-2 font-semibold cursor-move active:opacity-70 select-none"
                >
                  <FiZap />
                  액션 노드
                  <span className="ml-auto text-xs opacity-60">드래그하여 추가</span>
                </div>
                <div
                  draggable
                  onDragStart={(e) => onDragStart(e, 'end')}
                  onClick={() => addNode('end')}
                  className="w-full px-4 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2 font-semibold cursor-move active:opacity-70 select-none"
                >
                  <FiCheckCircle />
                  종료 노드
                  <span className="ml-auto text-xs opacity-60">드래그하여 추가</span>
                </div>
              </div>
            </div>

            {/* 템플릿 불러오기 */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <FiLayers className="text-indigo-500" />
                템플릿 불러오기
              </h2>
              {isLoadingTemplates ? (
                <p className="text-sm text-gray-600">템플릿을 불러오는 중...</p>
              ) : templates.length === 0 ? (
                <p className="text-sm text-gray-500">저장된 템플릿이 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                  >
                    <option value="">템플릿을 선택하세요</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name} · 질문 {template.questionCount}개
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={applyTemplate}
                    disabled={!selectedTemplateId || isApplyingTemplate}
                    className="w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {isApplyingTemplate ? '불러오는 중...' : '선택한 템플릿 적용'}
                  </button>
                </div>
              )}
            </div>
            {/* 플로우 기본 정보 */}
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-800 mb-3">플로우 정보</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    플로우 이름 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={flowName}
                    onChange={(e) => setFlowName(e.target.value)}
                    placeholder="예: 크루즈 상품 추천 플로우"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                  <textarea
                    value={flowDescription}
                    onChange={(e) => setFlowDescription(e.target.value)}
                    placeholder="플로우에 대한 설명을 입력하세요"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

          {/* 상품 연결 */}
          <div className="p-4 border-b border-gray-200 bg-white">
            <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <FiTag className="text-blue-500" />
              상품 연결
            </h2>
            {isLoadingProducts ? (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                상품 목록을 불러오는 중...
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">상품 검색</label>
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="상품 코드, 선사, 코스를 검색하세요"
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">연결할 상품</label>
                  <select
                    value={selectedProductCode}
                    onChange={(e) => {
                      setSelectedProductCode(e.target.value);
                      if (!e.target.value) {
                        setProductSearch('');
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">(선택하지 않음)</option>
                    {filteredProductOptions.length === 0 ? (
                      <option disabled value="__noresult">
                        검색 결과가 없습니다
                      </option>
                    ) : (
                      filteredProductOptions.map((option) => (
                        <option key={option.productCode} value={option.productCode}>
                          {option.label}
                        </option>
                      ))
                    )}
                  </select>
                  {selectedProductCode && (
                    <p className="text-xs text-blue-600 mt-1">
                      선택한 상품 코드: <span className="font-semibold">{selectedProductCode}</span>
                      {selectedProduct?.saleStatus && (
                        <span className="ml-1 text-gray-500">
                          ({selectedProduct.saleStatus})
                        </span>
                      )}
                    </p>
                  )}
                  {!isLoadingProducts && productOptions.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      등록된 크루즈 상품이 없습니다. 관리자에서 상품을 먼저 등록해주세요.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 최종 페이지 및 공개 설정 */}
          <div className="p-4 border-b border-gray-200 space-y-4 bg-white">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <FiLink />
                최종 이동 페이지
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={finalPageUrl}
                  onChange={(e) => onFinalPageChange(e.target.value)}
                  placeholder="/products/상품코드/payment"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <button
                  type="button"
                  disabled={!selectedProductCode}
                  onClick={onApplyDefaultFinalPage}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold flex items-center gap-1 hover:bg-gray-50 disabled:opacity-50"
                >
                  <FiRefreshCw />
                  기본
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {selectedProductCode
                  ? finalPageIsManual
                    ? '사용자 지정 URL을 사용 중입니다.'
                    : '선택한 상품의 결제 페이지로 자동 설정됩니다.'
                  : '상품을 선택하면 기본 결제 페이지 URL을 빠르게 설정할 수 있습니다.'}
              </p>
            </div>

            <div className="border rounded-lg p-3 bg-gray-50">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  checked={isPublicFlow}
                  onChange={(e) => setIsPublicFlow(e.target.checked)}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <FiShare2 className="text-blue-500" />
                    <span className="text-sm font-semibold text-gray-700">공개 공유 링크 생성</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    저장 후 고객에게 전달할 수 있는 전용 링크가 생성됩니다. 로그인 없이 바로 상담 플로우를 시작할 수 있어요.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* 대화형 AI 생성 */}
          <div className="p-4 border-b border-gray-200 bg-gradient-to-br from-slate-50 to-slate-100">
            <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <FiMessageSquare className="text-slate-600" />
              대화형 설계 비서
            </h2>
            <p className="text-xs text-gray-600 mb-3">
              원하는 흐름을 자연스럽게 설명하면, AI가 질문·분기 구조를 제안해 플로우에 바로 반영해 줍니다.
            </p>
            <div className="mb-3 h-44 overflow-y-auto bg-white border border-gray-200 rounded-lg p-3 space-y-2">
              {chatMessages.map((message) => (
                <div key={message.id} className="flex">
                  <div
                    className={`px-3 py-2 rounded-lg text-sm ${
                      message.role === 'user'
                        ? 'ml-auto bg-blue-100 text-blue-900'
                        : 'mr-auto bg-slate-100 text-slate-800'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                rows={3}
                placeholder="예: 예산을 먼저 묻고, 여행 인원에 따라 다른 상품을 추천하는 흐름을 만들고 싶어요."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <button
                type="button"
                onClick={handleChatSend}
                disabled={isChatGenerating || !chatInput.trim()}
                className="w-full px-4 py-2 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-900 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <FiMessageSquare />
                {isChatGenerating ? 'AI가 구상 중...' : '대화로 플로우 만들기'}
              </button>
            </div>
          </div>

            {/* AI로 플로우 생성 */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-br from-slate-50 to-slate-100">
              <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <MdAutoAwesome className="text-slate-700" />
                AI로 플로우 생성
              </h2>
              <div className="space-y-3">
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="예: 사용자에게 크루즈 여행 목적지를 물어보고, 예산에 맞는 상품을 추천하는 플로우를 만들어줘"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                />
                <button
                  onClick={generateFlowWithAI}
                  disabled={isGenerating}
                  className="w-full px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <MdAutoAwesome />
                  {isGenerating ? '생성 중...' : 'AI로 생성하기'}
                </button>
                <p className="text-xs text-gray-600">
                  💡 자연어로 플로우를 설명하면 AI가 자동으로 노드와 연결을 만들어줍니다!
                </p>
              </div>
            </div>

          </div>

          {/* 중앙 - 플로우 캔버스 */}
          <div className="flex-1 relative" style={{ width: '100%', height: '100vh', minHeight: '600px' }}>
            <ReactFlowComponent
              nodes={nodes}
              edges={edges}
              setNodes={setNodes}
              setEdges={setEdges}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onNodeDoubleClick={onNodeDoubleClick}
              onPaneClick={onPaneClick}
              onDrop={onDrop}
              onDragOver={onDragOver}
              selectedNode={selectedNode}
              setSelectedNode={setSelectedNode}
            />
          </div>

          {/* 오른쪽 사이드바 - 노드 설정 */}
          {selectedNode && (
            <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-800">노드 설정</h2>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FiX />
                  </button>
                </div>
                <div className="text-sm text-gray-600">
                  노드 ID: {selectedNode.id}
                </div>
              </div>
              <div className="p-4">
                <NodeSettingsPanel node={selectedNode} onUpdate={(updatedNode) => {
                  setNodes((nds) => nds.map((n) => n.id === updatedNode.id ? updatedNode : n));
                  setSelectedNode(updatedNode);
                }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 미리보기 모달 */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">플로우 미리보기</h2>
              <button
                  onClick={() => {
                    setShowPreview(false);
                    setPreviewMessages([]);
                    setPreviewInput('');
                    setCurrentPreviewNodeId(null);
                    setWaitingForInput(false);
                    setPreviewVariables({});
                  }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {previewMessages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  플로우를 시작하려면 입력창에 메시지를 입력하세요.
                </div>
              ) : (
                previewMessages.map((message: any) => (
                  <div
                    key={message.id}
                    className={`flex flex-col gap-2 ${
                      message.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`px-4 py-2 rounded-lg max-w-[80%] ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {message.content}
                    </div>

                    {/* 유튜브 동영상 */}
                    {message.videoUrl && (
                      <div className="max-w-[80%]">
                        <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
                          {(() => {
                            // 유튜브 링크에서 비디오 ID 추출
                            const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
                            const match = message.videoUrl.match(youtubeRegex);
                            const videoId = match ? match[1] : null;
                            
                            if (videoId) {
                              return (
                                <iframe
                                  src={`https://www.youtube.com/embed/${videoId}`}
                                  title="YouTube video player"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                  className="w-full h-full"
                                />
                              );
                            }
                            return (
                              <div className="w-full h-full flex items-center justify-center text-gray-500">
                                유효하지 않은 유튜브 링크입니다.
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {/* 크루즈정보사진 */}
                    {message.images && message.images.length > 0 && (
                      <div className="max-w-[80%]">
                        <div className="grid grid-cols-2 gap-2">
                          {message.images.slice(0, 4).map((img: { url: string; title: string }, idx: number) => (
                            <div key={idx} className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden">
                              <Image
                                src={img.url}
                                alt={img.title || `이미지 ${idx + 1}`}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 50vw, 200px"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/placeholder-image.png';
                                }}
                              />
                            </div>
                          ))}
                        </div>
                        {message.images.length > 4 && (
                          <p className="text-xs text-gray-500 mt-1">
                            외 {message.images.length - 4}장의 사진이 있습니다.
                          </p>
                        )}
                      </div>
                    )}

                    {/* 크루즈몰 후기 */}
                    {message.reviews && message.reviews.length > 0 && (
                      <div className="max-w-[80%] space-y-3">
                        <div className="text-sm font-bold text-gray-700">고객 후기</div>
                        {message.reviews.map((review: any, idx: number) => (
                          <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-gray-800 text-sm">{review.authorName || '고객'}</span>
                              <div className="flex items-center gap-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <span key={i} className={i < (review.rating || 5) ? 'text-yellow-400' : 'text-gray-300'}>
                                    ★
                                  </span>
                                ))}
                              </div>
                            </div>
                            {review.title && (
                              <h4 className="font-bold text-gray-900 text-sm mb-1">{review.title}</h4>
                            )}
                            <p className="text-gray-700 text-sm mb-2">{review.content}</p>
                            {review.images && review.images.length > 0 && (
                              <div className="grid grid-cols-3 gap-1 mt-2">
                                {review.images.slice(0, 3).map((imgUrl: string, imgIdx: number) => (
                                  <div key={imgIdx} className="relative aspect-square bg-gray-200 rounded overflow-hidden">
                                    <Image
                                      src={imgUrl}
                                      alt={`후기 이미지 ${imgIdx + 1}`}
                                      fill
                                      className="object-cover"
                                      sizes="(max-width: 768px) 33vw, 100px"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = '/placeholder-image.png';
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 선택지 버튼 */}
                    {message.options && message.options.length > 0 && (
                      <div className="flex flex-wrap gap-2 max-w-[80%]">
                        {message.options.map((opt: string, idx: number) => (
                          <button
                            key={idx}
                            onClick={() => {
                              if (message.nodeId) {
                                executePreviewFlow('', idx);
                              }
                            }}
                            className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-semibold"
                          >
                            {opt || `선택지 ${idx + 1}`}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-gray-200">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!previewInput.trim() && !waitingForInput) return;

                  if (previewInput.trim()) {
                    const userMessage = {
                      id: `preview-user-${Date.now()}`,
                      role: 'user' as const,
                      content: previewInput.trim(),
                    };

                    setPreviewMessages((prev) => [...prev, userMessage]);
                    setPreviewInput('');
                  }

                  // 플로우 실행 로직
                  executePreviewFlow(previewInput.trim());
                  
                  // 미리보기 시작 시 자동으로 첫 노드 실행
                  if (!currentPreviewNodeId && !waitingForInput) {
                    setTimeout(() => {
                      executePreviewFlow('');
                    }, 100);
                  }
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={previewInput}
                  onChange={(e) => setPreviewInput(e.target.value)}
                  placeholder={waitingForInput ? "답변을 입력하세요..." : "메시지를 입력하세요..."}
                  disabled={!waitingForInput && !!currentPreviewNodeId}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={!previewInput.trim() && (!waitingForInput || !!currentPreviewNodeId)}
                  className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  전송
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// 크루즈정보사진 선택 컴포넌트
function QuestionImageSelector({ 
  images, 
  onImagesChange 
}: { 
  images: Array<{ url: string; title: string }>; 
  onImagesChange: (images: Array<{ url: string; title: string }>) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ url: string; title: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      showError('검색어를 입력해주세요.');
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/photos?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      if (data.items) {
        setSearchResults(data.items || []);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('이미지 검색 오류:', error);
      showError('이미지 검색 중 오류가 발생했습니다.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const addImage = (image: { url: string; title: string }) => {
    if (images.find(img => img.url === image.url)) {
      showError('이미 추가된 이미지입니다.');
      return;
    }
    onImagesChange([...images, image]);
  };

  const removeImage = (url: string) => {
    onImagesChange(images.filter(img => img.url !== url));
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        크루즈정보사진 추가 (선택)
      </label>
      
      {/* 이미지 검색 */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="검색어 입력 (예: 코스타 세레나)"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
        />
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm font-semibold"
        >
          <FiSearch />
          {isSearching ? '검색 중...' : '검색'}
        </button>
      </div>

      {/* 검색 결과 */}
      {searchResults.length > 0 && (
        <div className="mb-3 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-gray-50">
          <div className="grid grid-cols-3 gap-2">
            {searchResults.slice(0, 9).map((photo, idx) => (
              <div
                key={idx}
                className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all group"
                onClick={() => addImage(photo)}
              >
                <Image
                  src={photo.url}
                  alt={photo.title || `사진 ${idx + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 33vw, 10vw"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder-image.png';
                  }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                  <FiPlus className="text-white opacity-0 group-hover:opacity-100 text-2xl" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 선택된 이미지 목록 */}
      {images.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-600">선택된 이미지 ({images.length}장)</div>
          <div className="grid grid-cols-3 gap-2">
            {images.map((img, idx) => (
              <div key={idx} className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden group">
                <Image
                  src={img.url}
                  alt={img.title || `이미지 ${idx + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 33vw, 10vw"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder-image.png';
                  }}
                />
                <button
                  onClick={() => removeImage(img.url)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <FiX className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 노드 설정 패널 컴포넌트
function NodeSettingsPanel({ node, onUpdate }: { node: Node; onUpdate: (node: Node) => void }) {
  const nodeData = node.data as any;

  const updateData = (key: string, value: any) => {
    onUpdate({
      ...node,
      data: {
        ...nodeData,
        [key]: value,
      },
    });
  };

  return (
    <div className="space-y-4">
      {node.type === 'start' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              시작 메시지 (선택)
            </label>
            <textarea
              value={nodeData.startMessage || ''}
              onChange={(e) => updateData('startMessage', e.target.value)}
              placeholder="플로우 시작 시 표시할 메시지"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              플로우의 시작점입니다. 시작 메시지는 선택사항입니다.
            </p>
          </div>
        </>
      )}

      {node.type === 'text' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              메시지 내용 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={nodeData.content || ''}
              onChange={(e) => updateData('content', e.target.value)}
              placeholder="사용자에게 보여줄 메시지를 입력하세요"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              사용자에게 표시될 텍스트 메시지입니다.
            </p>
          </div>
        </>
      )}

      {node.type === 'question' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              질문 내용 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={nodeData.content || ''}
              onChange={(e) => updateData('content', e.target.value)}
              placeholder="예: 어떤 크루즈 여행을 원하시나요?"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              질문 유형
            </label>
            <select
              value={nodeData.questionType || 'single'}
              onChange={(e) => updateData('questionType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="single">단일 선택</option>
              <option value="multiple">다중 선택</option>
              <option value="text">텍스트 입력</option>
            </select>
          </div>
          {(nodeData.questionType === 'single' || nodeData.questionType === 'multiple') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                선택지
              </label>
              <div className="space-y-2">
                {(nodeData.options || []).map((opt: string, idx: number) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const newOptions = [...(nodeData.options || [])];
                        newOptions[idx] = e.target.value;
                        updateData('options', newOptions);
                      }}
                      placeholder={`선택지 ${idx + 1}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      onClick={() => {
                        const newOptions = [...(nodeData.options || [])];
                        newOptions.splice(idx, 1);
                        updateData('options', newOptions);
                      }}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                    >
                      <FiX />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const newOptions = [...(nodeData.options || []), ''];
                    updateData('options', newOptions);
                  }}
                  className="w-full px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 flex items-center justify-center gap-2"
                >
                  <FiPlus />
                  선택지 추가
                </button>
              </div>
            </div>
          )}

          {/* 미디어 섹션 */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3">미디어 추가</h3>
            
            {/* 유튜브 동영상 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                유튜브 동영상 링크 (선택)
              </label>
              <input
                type="text"
                value={nodeData.videoUrl || ''}
                onChange={(e) => updateData('videoUrl', e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... 또는 https://youtu.be/..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                질문과 함께 동영상을 표시할 수 있습니다.
              </p>
            </div>

            {/* 크루즈정보사진 */}
            <QuestionImageSelector 
              images={nodeData.images || []}
              onImagesChange={(images) => updateData('images', images)}
            />

            {/* 크루즈몰 후기 */}
            <div className="mb-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  checked={nodeData.showReviews || false}
                  onChange={(e) => updateData('showReviews', e.target.checked)}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-700 mb-1">
                    크루즈몰 후기 표시
                  </div>
                  <p className="text-xs text-gray-500">
                    질문과 함께 크루즈몰 후기를 표시합니다.
                  </p>
                  {nodeData.showReviews && (
                    <div className="mt-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        표시할 후기 개수
                      </label>
                      <select
                        value={nodeData.reviewCount || 3}
                        onChange={(e) => updateData('reviewCount', parseInt(e.target.value))}
                        className="w-full px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                      >
                        <option value={1}>1개</option>
                        <option value={2}>2개</option>
                        <option value={3}>3개</option>
                        <option value={5}>5개</option>
                      </select>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>
        </>
      )}

      {node.type === 'condition' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              조건식 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nodeData.condition || ''}
              onChange={(e) => updateData('condition', e.target.value)}
              placeholder="예: budget > 1000000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              조건이 참이면 왼쪽, 거짓이면 오른쪽으로 이동합니다.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              참일 때 라벨 (선택)
            </label>
            <input
              type="text"
              value={nodeData.trueLabel || ''}
              onChange={(e) => updateData('trueLabel', e.target.value)}
              placeholder="예: 예산 충족"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              거짓일 때 라벨 (선택)
            </label>
            <input
              type="text"
              value={nodeData.falseLabel || ''}
              onChange={(e) => updateData('falseLabel', e.target.value)}
              placeholder="예: 예산 부족"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            />
          </div>
        </>
      )}

      {node.type === 'ai' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            AI 프롬프트 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={nodeData.content || ''}
            onChange={(e) => updateData('content', e.target.value)}
            placeholder="예: 사용자의 예산과 선호도를 바탕으로 크루즈 상품을 추천해주세요"
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            AI가 이 프롬프트를 바탕으로 응답을 생성합니다.
          </p>
        </div>
      )}

      {node.type === 'action' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              액션 유형 <span className="text-red-500">*</span>
            </label>
            <select
              value={nodeData.actionType || 'redirect'}
              onChange={(e) => updateData('actionType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            >
              <option value="redirect">리다이렉트</option>
              <option value="variable">변수 설정</option>
              <option value="api">API 호출</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {nodeData.actionType === 'redirect' ? '리다이렉트 URL' :
               nodeData.actionType === 'variable' ? '변수명 = 값' :
               'API 엔드포인트'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nodeData.actionValue || ''}
              onChange={(e) => updateData('actionValue', e.target.value)}
              placeholder={nodeData.actionType === 'redirect' ? '/products/상품코드/payment' :
                          nodeData.actionType === 'variable' ? 'userName = 홍길동 또는 budget = 500000' :
                          '/api/products'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
            {nodeData.actionType === 'redirect' && (
              <p className="text-xs text-gray-500 mt-1">
                사용자를 해당 URL로 리다이렉트합니다. 예: /products/TEST-2025-TW-03/payment
              </p>
            )}
            {nodeData.actionType === 'variable' && (
              <p className="text-xs text-gray-500 mt-1">
                변수를 설정합니다. 형식: 변수명 = 값 (예: budget = 500000, userName = 홍길동)
              </p>
            )}
            {nodeData.actionType === 'api' && (
              <p className="text-xs text-gray-500 mt-1">
                API 엔드포인트를 호출합니다. GET 요청을 보냅니다.
              </p>
            )}
          </div>
          {nodeData.actionType === 'api' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                응답 처리 (선택)
              </label>
              <select
                value={nodeData.responseAction || 'none'}
                onChange={(e) => updateData('responseAction', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                <option value="none">응답 무시</option>
                <option value="save">변수로 저장</option>
                <option value="display">사용자에게 표시</option>
              </select>
            </div>
          )}
        </>
      )}

      {node.type === 'end' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              종료 메시지 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={nodeData.endMessage || nodeData.content || ''}
              onChange={(e) => updateData('endMessage', e.target.value)}
              placeholder="예: 감사합니다. 좋은 하루 되세요!"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              플로우 종료 시 사용자에게 표시될 메시지입니다.
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              플로우가 종료되는 지점입니다. 사용자는 여기서 대화가 끝납니다.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default FlowCanvas;
