// app/admin/chat-bot/flows/[id]/page.tsx
// 플로우 편집 페이지 - 타입봇 스타일 시각적 플로우 빌더

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import type {
  Node,
  Edge,
  Connection,
  NodeTypes,
} from 'reactflow';

// React Flow를 동적으로 로드하여 SSR 문제 해결
const ReactFlow = dynamic(
  () => import('reactflow').then((mod) => mod.default),
  { ssr: false }
);

const ReactFlowProvider = dynamic(
  () => import('reactflow').then((mod) => mod.ReactFlowProvider),
  { ssr: false }
);

const Background = dynamic(
  () => import('reactflow').then((mod) => mod.Background),
  { ssr: false }
);

const Controls = dynamic(
  () => import('reactflow').then((mod) => mod.Controls),
  { ssr: false }
);

const MiniMap = dynamic(
  () => import('reactflow').then((mod) => mod.MiniMap),
  { ssr: false }
);

import {
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
} from 'reactflow';

// CSS는 클라이언트에서만 로드
if (typeof window !== 'undefined') {
  require('reactflow/dist/style.css');
}
import { FiSave, FiX, FiPlus, FiMessageSquare, FiHelpCircle, FiCode, FiZap, FiCheckCircle, FiPlay, FiArrowLeft } from 'react-icons/fi';
import { MdAutoAwesome } from 'react-icons/md';
import { showSuccess, showError } from '@/components/ui/Toast';

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

// 커스텀 노드 컴포넌트들 (new/page.tsx와 동일)
const StartNode = ({ data }: { data: any }) => (
  <div className="px-4 py-3 bg-green-500 text-white rounded-lg shadow-lg min-w-[150px] text-center font-semibold">
    <div className="flex items-center justify-center gap-2">
      <FiPlay />
      <span>시작</span>
    </div>
    <Handle type="source" position={Position.Bottom} className="!bg-green-600" />
  </div>
);

const TextNode = ({ data }: { data: any }) => (
  <div className="px-4 py-3 bg-blue-500 text-white rounded-lg shadow-lg min-w-[200px]">
    <div className="flex items-center gap-2 mb-2">
      <FiMessageSquare />
      <span className="font-semibold">텍스트 메시지</span>
    </div>
    <div className="text-sm bg-white/20 rounded p-2">{data.content || '메시지를 입력하세요'}</div>
    <Handle type="target" position={Position.Top} className="!bg-blue-600" />
    <Handle type="source" position={Position.Bottom} className="!bg-blue-600" />
  </div>
);

const QuestionNode = ({ data }: { data: any }) => (
  <div className="px-4 py-3 bg-purple-500 text-white rounded-lg shadow-lg min-w-[200px]">
    <div className="flex items-center gap-2 mb-2">
      <FiHelpCircle />
      <span className="font-semibold">질문</span>
    </div>
    <div className="text-sm bg-white/20 rounded p-2 mb-2">{data.content || '질문을 입력하세요'}</div>
    {data.options && data.options.length > 0 && (
      <div className="text-xs space-y-1">
        {data.options.map((opt: string, idx: number) => (
          <div key={idx} className="bg-white/20 rounded px-2 py-1">{idx + 1}. {opt}</div>
        ))}
      </div>
    )}
    <Handle type="target" position={Position.Top} className="!bg-purple-600" />
    <Handle type="source" position={Position.Bottom} className="!bg-purple-600" />
  </div>
);

const ConditionNode = ({ data }: { data: any }) => (
  <div className="px-4 py-3 bg-yellow-500 text-white rounded-lg shadow-lg min-w-[200px]">
    <div className="flex items-center gap-2 mb-2">
      <FiCode />
      <span className="font-semibold">조건 분기</span>
    </div>
    <div className="text-sm bg-white/20 rounded p-2">{data.condition || '조건을 입력하세요'}</div>
    <Handle type="target" position={Position.Top} className="!bg-yellow-600" />
    <Handle type="source" position={Position.Left} className="!bg-yellow-600 !top-1/3" />
    <Handle type="source" position={Position.Right} className="!bg-yellow-600 !top-2/3" />
  </div>
);

const AINode = ({ data }: { data: any }) => (
  <div className="px-4 py-3 bg-pink-500 text-white rounded-lg shadow-lg min-w-[200px]">
    <div className="flex items-center gap-2 mb-2">
      <MdAutoAwesome />
      <span className="font-semibold">AI 응답</span>
    </div>
    <div className="text-sm bg-white/20 rounded p-2">{data.content || 'AI 프롬프트를 입력하세요'}</div>
    <Handle type="target" position={Position.Top} className="!bg-pink-600" />
    <Handle type="source" position={Position.Bottom} className="!bg-pink-600" />
  </div>
);

const ActionNode = ({ data }: { data: any }) => (
  <div className="px-4 py-3 bg-orange-500 text-white rounded-lg shadow-lg min-w-[200px]">
    <div className="flex items-center gap-2 mb-2">
      <FiZap />
      <span className="font-semibold">액션</span>
    </div>
    <div className="text-xs bg-white/20 rounded p-2">
      {data.actionType === 'redirect' && '🔗 리다이렉트'}
      {data.actionType === 'variable' && '📝 변수 설정'}
      {data.actionType === 'api' && '🌐 API 호출'}
    </div>
    <Handle type="target" position={Position.Top} className="!bg-orange-600" />
    <Handle type="source" position={Position.Bottom} className="!bg-orange-600" />
  </div>
);

const EndNode = ({ data }: { data: any }) => (
  <div className="px-4 py-3 bg-red-500 text-white rounded-lg shadow-lg min-w-[150px] text-center font-semibold">
    <div className="flex items-center justify-center gap-2">
      <FiCheckCircle />
      <span>종료</span>
    </div>
    <Handle type="target" position={Position.Top} className="!bg-red-600" />
  </div>
);

const nodeTypes: NodeTypes = {
  start: StartNode,
  text: TextNode,
  question: QuestionNode,
  condition: ConditionNode,
  ai: AINode,
  action: ActionNode,
  end: EndNode,
};

export default function EditFlowPage() {
  const router = useRouter();
  const params = useParams();
  const flowId = parseInt(params.id as string);
  
  const [flowName, setFlowName] = useState('');
  const [flowDescription, setFlowDescription] = useState('');
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // 플로우 로드
  const loadFlow = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/chat-bot/flows/${flowId}`);
      if (!response.ok) throw new Error('플로우를 불러올 수 없습니다.');
      
      const data = await response.json();
      if (data.ok && data.data) {
        setFlowName(data.data.name);
        setFlowDescription(data.data.description || '');
        
        // 질문을 노드로 변환
        const loadedNodes: FlowNode[] = [];
        const loadedEdges: Edge[] = [];
        
        // 시작 노드 추가
        loadedNodes.push({
          id: 'node-start',
          type: 'start',
          position: { x: 250, y: 50 },
          data: { label: '시작' },
        });

        // 질문을 노드로 변환
        let yPos = 150;
        data.data.questions.forEach((q: any, idx: number) => {
          const nodeId = `node-${q.id}`;
          let nodeType: NodeType = 'text';
          
          if (q.questionType === 'choice') {
            nodeType = 'question';
          }
          
          loadedNodes.push({
            id: nodeId,
            type: nodeType,
            position: { x: 250, y: yPos },
            data: {
              label: nodeType === 'question' ? '질문' : '텍스트 메시지',
              content: q.questionText || q.information || '',
              questionType: 'single',
              options: [q.optionA, q.optionB].filter(Boolean),
            },
          });

          // 엣지 추가
          if (idx === 0 && data.data.startQuestionId === q.id) {
            loadedEdges.push({
              id: `edge-start-${q.id}`,
              source: 'node-start',
              target: nodeId,
            });
          }

          if (q.nextQuestionIdA) {
            loadedEdges.push({
              id: `edge-${q.id}-A`,
              source: nodeId,
              target: `node-${q.nextQuestionIdA}`,
            });
          }

          if (q.nextQuestionIdB) {
            loadedEdges.push({
              id: `edge-${q.id}-B`,
              source: nodeId,
              target: `node-${q.nextQuestionIdB}`,
            });
          }

          yPos += 150;
        });

        // 종료 노드 추가
        loadedNodes.push({
          id: 'node-end',
          type: 'end',
          position: { x: 250, y: yPos },
          data: { label: '종료' },
        });

        setNodes(loadedNodes);
        setEdges(loadedEdges);
      }
    } catch (error: any) {
      console.error('플로우 로드 오류:', error);
      showError(error.message || '플로우를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [flowId]);

  useEffect(() => {
    loadFlow();
  }, [loadFlow]);

  // 노드 추가 함수
  const addNode = useCallback((type: NodeType) => {
    const newNode: FlowNode = {
      id: `node-${Date.now()}`,
      type,
      position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
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
  }, [setNodes]);

  // 엣지 연결
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // AI로 플로우 생성
  const generateFlowWithAI = async () => {
    if (!aiPrompt.trim()) {
      showError('플로우 설명을 입력해주세요.');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/admin/chat-bot/generate-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prompt: aiPrompt }),
      });

      const data = await response.json();
      if (data.ok && data.nodes && data.edges) {
        setNodes(data.nodes);
        setEdges(data.edges);
        if (data.name) setFlowName(data.name);
        showSuccess('AI가 플로우를 생성했습니다!');
      } else {
        throw new Error(data.error || '플로우 생성 실패');
      }
    } catch (error: any) {
      console.error('AI 플로우 생성 오류:', error);
      showError(error.message || 'AI 플로우 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  // 플로우 저장
  const handleSave = async () => {
    if (!flowName.trim()) {
      showError('플로우 이름을 입력해주세요.');
      return;
    }

    if (nodes.length === 0) {
      showError('최소 하나의 노드를 추가해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      // 플로우 정보 업데이트
      const flowResponse = await fetch(`/api/admin/chat-bot/flows/${flowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: flowName,
          description: flowDescription,
        }),
      });

      const flowData = await flowResponse.json();
      if (!flowData.ok) throw new Error(flowData.error || '플로우 업데이트 실패');

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
    } catch (error: any) {
      console.error('플로우 저장 오류:', error);
      showError(error.message || '플로우 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 노드 더블클릭 시 설정 패널 열기
  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">플로우를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-full mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/chat-bot')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">플로우 편집</h1>
                <p className="text-sm text-gray-600">타입봇 스타일로 시각적으로 플로우를 편집하세요</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
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
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
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

          {/* 노드 추가 버튼들 */}
          <div className="flex-1 overflow-y-auto p-4">
            <h2 className="text-lg font-bold text-gray-800 mb-3">노드 추가</h2>
            <div className="space-y-2">
              <button
                onClick={() => addNode('start')}
                className="w-full px-4 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors flex items-center gap-2 font-semibold"
              >
                <FiPlay />
                시작 노드
              </button>
              <button
                onClick={() => addNode('text')}
                className="w-full px-4 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2 font-semibold"
              >
                <FiMessageSquare />
                텍스트 메시지
              </button>
              <button
                onClick={() => addNode('question')}
                className="w-full px-4 py-3 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors flex items-center gap-2 font-semibold"
              >
                <FiHelpCircle />
                질문 노드
              </button>
              <button
                onClick={() => addNode('condition')}
                className="w-full px-4 py-3 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors flex items-center gap-2 font-semibold"
              >
                <FiCode />
                조건 분기
              </button>
              <button
                onClick={() => addNode('ai')}
                className="w-full px-4 py-3 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200 transition-colors flex items-center gap-2 font-semibold"
              >
                <MdAutoAwesome />
                AI 응답
              </button>
              <button
                onClick={() => addNode('action')}
                className="w-full px-4 py-3 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors flex items-center gap-2 font-semibold"
              >
                <FiZap />
                액션 노드
              </button>
              <button
                onClick={() => addNode('end')}
                className="w-full px-4 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2 font-semibold"
              >
                <FiCheckCircle />
                종료 노드
              </button>
            </div>

            {/* 사용 설명 */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-bold text-gray-800 mb-2">📖 사용 방법</h3>
              <ul className="text-xs text-gray-700 space-y-1">
                <li>• 왼쪽 버튼을 클릭하여 노드를 추가하세요</li>
                <li>• 노드를 드래그하여 이동할 수 있습니다</li>
                <li>• 노드의 핸들을 드래그하여 연결하세요</li>
                <li>• 노드를 더블클릭하여 설정을 변경하세요</li>
                <li>• AI로 자동 생성하면 더 빠르게 만들 수 있습니다</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 중앙 - 플로우 캔버스 */}
        <div className="flex-1 relative">
          {ReactFlowProvider && ReactFlow ? (
            <ReactFlowProvider>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeDoubleClick={onNodeDoubleClick}
                nodeTypes={nodeTypes}
                fitView={nodes.length > 0}
                className="bg-gray-50"
                defaultViewport={{ x: 0, y: 0, zoom: 1 }}
                minZoom={0.1}
                maxZoom={2}
                preventScrolling={false}
              >
                {Background && <Background />}
                {Controls && <Controls />}
                {MiniMap && <MiniMap />}
              </ReactFlow>
            </ReactFlowProvider>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">플로우 에디터를 불러오는 중...</p>
              </div>
            </div>
          )}
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
  );
}

// 노드 설정 패널 컴포넌트 (new/page.tsx와 동일)
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
        </>
      )}

      {node.type === 'condition' && (
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
              액션 유형
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
               'API 엔드포인트'}
            </label>
            <input
              type="text"
              value={nodeData.actionValue || ''}
              onChange={(e) => updateData('actionValue', e.target.value)}
              placeholder={nodeData.actionType === 'redirect' ? '/products' :
                          nodeData.actionType === 'variable' ? 'userName = 홍길동' :
                          '/api/products'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </>
      )}

      {node.type === 'end' && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            플로우가 종료되는 지점입니다. 사용자는 여기서 대화가 끝납니다.
          </p>
        </div>
      )}
    </div>
  );
}

