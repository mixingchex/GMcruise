'use client';

import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import type {
  Node,
  Edge,
  Connection,
  NodeTypes,
} from 'reactflow';
import { FiMessageSquare, FiHelpCircle, FiCode, FiZap, FiCheckCircle, FiPlay } from 'react-icons/fi';
import { MdAutoAwesome } from 'react-icons/md';

interface FlowComponentProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  setNodesExternal: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void;
  setEdgesExternal: (edges: Edge[] | ((edges: Edge[]) => Edge[])) => void;
  onConnect: (params: Connection) => void;
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  onNodeDoubleClick: (event: React.MouseEvent, node: Node) => void;
  onPaneClick?: (event: React.MouseEvent) => void;
  onDrop?: (event: React.DragEvent) => void;
  onDragOver?: (event: React.DragEvent) => void;
}

export default function FlowComponent({
  initialNodes,
  initialEdges,
  setNodesExternal,
  setEdgesExternal,
  onConnect,
  onNodeClick,
  onNodeDoubleClick,
  onPaneClick,
  onDrop,
  onDragOver,
}: FlowComponentProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [ReactFlow, setReactFlow] = useState<any>(null);
  const [ReactFlowProvider, setReactFlowProvider] = useState<any>(null);
  const [Background, setBackground] = useState<any>(null);
  const [Controls, setControls] = useState<any>(null);
  const [MiniMap, setMiniMap] = useState<any>(null);
  const [addEdge, setAddEdge] = useState<any>(null);
  const [useNodesState, setUseNodesState] = useState<any>(null);
  const [useEdgesState, setUseEdgesState] = useState<any>(null);
  const [Handle, setHandle] = useState<any>(null);
  const [Position, setPosition] = useState<any>(null);
  const [useReactFlow, setUseReactFlow] = useState<any>(null);
  const nodeTypesRef = useRef<NodeTypes | null>(null);
  
  const prevInitialNodesRef = useRef(initialNodes);
  const prevInitialEdgesRef = useRef(initialEdges);
  const reactFlowInstanceRef = useRef<any>(null);

  // 클라이언트에서만 React Flow 로드
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadReactFlow = async () => {
      try {
        const reactFlowModule = await import('reactflow');
        const ReactFlowDefault = reactFlowModule.default;
        const { ReactFlowProvider, Background, Controls, MiniMap, addEdge, Handle, Position, useNodesState, useEdgesState, useReactFlow: useReactFlowHook } = reactFlowModule;

        // @ts-ignore - CSS 파일은 타입 정의가 없음
        await import('reactflow/dist/style.css');

        setReactFlow(() => ReactFlowDefault);
        setReactFlowProvider(() => ReactFlowProvider);
        setBackground(() => Background);
        setControls(() => Controls);
        setMiniMap(() => MiniMap);
        setAddEdge(() => addEdge);
        setUseNodesState(() => useNodesState);
        setUseEdgesState(() => useEdgesState);
        setHandle(() => Handle);
        setPosition(() => Position);
        setUseReactFlow(() => useReactFlowHook);

        // 커스텀 노드 컴포넌트들 생성
        const StartNode = ({ data, selected }: { data: any; selected?: boolean }) => (
          <div 
            className={`px-4 py-3 bg-green-500 text-white rounded-lg shadow-lg min-w-[150px] text-center font-semibold cursor-pointer ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
            style={{ pointerEvents: 'all' }}
          >
            <div className="flex items-center justify-center gap-2">
              <FiPlay />
              <span>시작</span>
            </div>
            {data.startMessage && (
              <div className="text-xs bg-white/20 rounded p-2 mt-2 text-left">
                {data.startMessage}
              </div>
            )}
            {Handle && <Handle type="source" position={Position?.Bottom} className="!bg-green-600" />}
          </div>
        );

        const TextNode = ({ data, selected }: { data: any; selected?: boolean }) => (
          <div 
            className={`px-4 py-3 bg-blue-500 text-white rounded-lg shadow-lg min-w-[200px] cursor-pointer ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
            style={{ pointerEvents: 'all' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <FiMessageSquare />
              <span className="font-semibold">텍스트 메시지</span>
            </div>
            <div className="text-sm bg-white/20 rounded p-2">{data.content || '메시지를 입력하세요'}</div>
            {Handle && (
              <>
                <Handle type="target" position={Position?.Top} className="!bg-blue-600" />
                <Handle type="source" position={Position?.Bottom} className="!bg-blue-600" />
              </>
            )}
          </div>
        );

        const QuestionNode = ({ data, selected }: { data: any; selected?: boolean }) => (
          <div 
            className={`px-4 py-3 bg-purple-500 text-white rounded-lg shadow-lg min-w-[200px] cursor-pointer ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
            style={{ pointerEvents: 'all' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <FiHelpCircle />
              <span className="font-semibold">질문</span>
            </div>
            <div className="text-sm bg-white/20 rounded p-2 mb-2">{data.content || '질문을 입력하세요'}</div>
            {data.videoUrl && (
              <div className="text-xs bg-white/20 rounded px-2 py-1 mb-2">🎬 동영상 첨부됨</div>
            )}
            {data.images && data.images.length > 0 && (
              <div className="text-xs bg-white/20 rounded px-2 py-1 mb-2">🖼️ 이미지 {data.images.length}장</div>
            )}
            {data.showReviews && (
              <div className="text-xs bg-white/20 rounded px-2 py-1 mb-2">⭐ 후기 표시</div>
            )}
            {data.options && data.options.length > 0 && (
              <div className="text-xs space-y-1">
                {data.options.map((opt: string, idx: number) => (
                  <div key={idx} className="bg-white/20 rounded px-2 py-1">{idx + 1}. {opt}</div>
                ))}
              </div>
            )}
            {Handle && (
              <>
                <Handle type="target" position={Position?.Top} className="!bg-purple-600" />
                <Handle type="source" position={Position?.Bottom} className="!bg-purple-600" />
              </>
            )}
          </div>
        );

        const ConditionNode = ({ data, selected }: { data: any; selected?: boolean }) => (
          <div 
            className={`px-4 py-3 bg-yellow-500 text-white rounded-lg shadow-lg min-w-[200px] cursor-pointer ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
            style={{ pointerEvents: 'all' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <FiCode />
              <span className="font-semibold">조건 분기</span>
            </div>
            <div className="text-sm bg-white/20 rounded p-2 mb-2">{data.condition || '조건을 입력하세요'}</div>
            {(data.trueLabel || data.falseLabel) && (
              <div className="text-xs space-y-1">
                {data.trueLabel && (
                  <div className="bg-white/20 rounded px-2 py-1">✓ {data.trueLabel}</div>
                )}
                {data.falseLabel && (
                  <div className="bg-white/20 rounded px-2 py-1">✗ {data.falseLabel}</div>
                )}
              </div>
            )}
            {Handle && (
              <>
                <Handle type="target" position={Position?.Top} className="!bg-yellow-600" />
                <Handle 
                  type="source" 
                  position={Position?.Left} 
                  id="left"
                  className="!bg-yellow-600 !top-1/3" 
                  style={{ left: '-8px' }}
                />
                <Handle 
                  type="source" 
                  position={Position?.Right} 
                  id="right"
                  className="!bg-yellow-600 !top-2/3" 
                  style={{ right: '-8px' }}
                />
              </>
            )}
          </div>
        );

        const AINode = ({ data, selected }: { data: any; selected?: boolean }) => (
          <div 
            className={`px-4 py-3 bg-pink-500 text-white rounded-lg shadow-lg min-w-[200px] cursor-pointer ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
            style={{ pointerEvents: 'all' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <MdAutoAwesome />
              <span className="font-semibold">AI 응답</span>
            </div>
            <div className="text-sm bg-white/20 rounded p-2">{data.content || 'AI 프롬프트를 입력하세요'}</div>
            {Handle && (
              <>
                <Handle type="target" position={Position?.Top} className="!bg-pink-600" />
                <Handle type="source" position={Position?.Bottom} className="!bg-pink-600" />
              </>
            )}
          </div>
        );

        const ActionNode = ({ data, selected }: { data: any; selected?: boolean }) => (
          <div 
            className={`px-4 py-3 bg-orange-500 text-white rounded-lg shadow-lg min-w-[200px] cursor-pointer ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
            style={{ pointerEvents: 'all' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <FiZap />
              <span className="font-semibold">액션</span>
            </div>
            <div className="text-xs bg-white/20 rounded p-2 mb-2">
              {data.actionType === 'redirect' && '🔗 리다이렉트'}
              {data.actionType === 'variable' && '📝 변수 설정'}
              {data.actionType === 'api' && '🌐 API 호출'}
            </div>
            {data.actionValue && (
              <div className="text-xs bg-white/20 rounded p-2 truncate">
                {data.actionValue}
              </div>
            )}
            {Handle && (
              <>
                <Handle type="target" position={Position?.Top} className="!bg-orange-600" />
                <Handle type="source" position={Position?.Bottom} className="!bg-orange-600" />
              </>
            )}
          </div>
        );

        const EndNode = ({ data, selected }: { data: any; selected?: boolean }) => (
          <div 
            className={`px-4 py-3 bg-red-500 text-white rounded-lg shadow-lg min-w-[150px] text-center font-semibold cursor-pointer ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
            style={{ pointerEvents: 'all' }}
          >
            <div className="flex items-center justify-center gap-2">
              <FiCheckCircle />
              <span>종료</span>
            </div>
            {(data.endMessage || data.content) && (
              <div className="text-xs bg-white/20 rounded p-2 mt-2 text-left">
                {data.endMessage || data.content}
              </div>
            )}
            {Handle && <Handle type="target" position={Position?.Top} className="!bg-red-600" />}
          </div>
        );

          // nodeTypes는 한 번만 생성하여 같은 참조 유지
        if (!nodeTypesRef.current) {
          const nodeTypesObj: NodeTypes = {
            start: StartNode,
            text: TextNode,
            question: QuestionNode,
            condition: ConditionNode,
            ai: AINode,
            action: ActionNode,
            end: EndNode,
          };
          nodeTypesRef.current = nodeTypesObj;
        }
        
        // React Flow가 완전히 로드된 후에만 상태 업데이트
        // D3-zoom이 완전히 초기화되도록 충분한 지연 시간을 둠
        // requestAnimationFrame을 사용하여 브라우저가 완전히 준비된 후에 렌더링
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setIsMounted(true);
          });
        });
      } catch (error) {
        console.error('Failed to load React Flow:', error);
      }
    };

    loadReactFlow();
  }, []);

  // React Flow hooks는 항상 호출되어야 함 (조건부 렌더링 전에)
  // React Flow가 로드되기 전에도 기본 상태로 초기화
  const [localNodes, setLocalNodes] = useState<Node[]>(initialNodes);
  const [localEdges, setLocalEdges] = useState<Edge[]>(initialEdges);

  // React Flow가 로드되면 실제 hooks를 사용하여 상태 관리
  useEffect(() => {
    if (isMounted && useNodesState && useEdgesState) {
      // 실제 React Flow hooks를 사용하여 상태 관리
      // 하지만 hooks는 useEffect 내에서 호출할 수 없으므로, 
      // 대신 일반 useState를 사용하여 상태를 관리하고
      // React Flow의 변경 핸들러를 직접 구현
      // 이 부분은 실제 React Flow가 로드된 후에만 작동
    }
  }, [isMounted, useNodesState, useEdgesState]);

  // React Flow의 변경 핸들러 직접 구현
  const handleNodesChange = useCallback((changes: any) => {
    setLocalNodes((nds) => {
      const updated = [...nds];
      changes.forEach((change: any) => {
        if (change.type === 'position' && change.position) {
          const node = updated.find((n) => n.id === change.id);
          if (node) {
            node.position = change.position;
          }
        } else if (change.type === 'remove') {
          const index = updated.findIndex((n) => n.id === change.id);
          if (index !== -1) {
            updated.splice(index, 1);
          }
        } else if (change.type === 'select') {
          const node = updated.find((n) => n.id === change.id);
          if (node) {
            node.selected = change.selected;
          }
        }
      });
      return updated;
    });
  }, []);

  const handleEdgesChange = useCallback((changes: any) => {
    setLocalEdges((eds) => {
      const updated = [...eds];
      changes.forEach((change: any) => {
        if (change.type === 'remove') {
          const index = updated.findIndex((e) => e.id === change.id);
          if (index !== -1) {
            updated.splice(index, 1);
          }
        } else if (change.type === 'select') {
          const edge = updated.find((e) => e.id === change.id);
          if (edge) {
            edge.selected = change.selected;
          }
        }
      });
      return updated;
    });
  }, []);

  // 외부 상태와 동기화 (모든 hooks는 조건부 렌더링 전에 호출되어야 함)
  useEffect(() => {
    if (isMounted) {
      setNodesExternal(localNodes);
    }
  }, [localNodes, setNodesExternal, isMounted]);

  useEffect(() => {
    if (isMounted) {
      setEdgesExternal(localEdges);
    }
  }, [localEdges, setEdgesExternal, isMounted]);

  // 외부에서 nodes가 변경되면 내부 상태 업데이트
  useEffect(() => {
    // 초기 마운트 시 또는 nodes가 실제로 변경되었을 때만 업데이트
    const nodesChanged = JSON.stringify(prevInitialNodesRef.current) !== JSON.stringify(initialNodes);
    if (nodesChanged) {
      console.log('[FlowComponent] 노드 업데이트:', initialNodes.length, '개 노드', initialNodes);
      setLocalNodes(initialNodes);
      prevInitialNodesRef.current = initialNodes;
    }
  }, [initialNodes]);

  useEffect(() => {
    const edgesChanged = JSON.stringify(prevInitialEdgesRef.current) !== JSON.stringify(initialEdges);
    if (edgesChanged) {
      setLocalEdges(initialEdges);
      prevInitialEdgesRef.current = initialEdges;
    }
  }, [initialEdges]);

  // 엣지 연결 핸들러
  const handleConnect = useCallback(
    (params: Connection) => {
      if (addEdge) {
        setLocalEdges((eds) => addEdge(params, eds));
        onConnect(params);
      }
    },
    [onConnect, addEdge]
  );

  // React Flow 인스턴스 참조를 저장하는 핸들러 (조건부 return 전에 호출)
  const onInit = useCallback((reactFlowInstance: any) => {
    reactFlowInstanceRef.current = reactFlowInstance;
  }, []);

  // 노드가 변경될 때 fitView 호출
  useEffect(() => {
    if (reactFlowInstanceRef.current && localNodes.length > 0 && isMounted) {
      console.log('[FlowComponent] fitView 호출, 노드 개수:', localNodes.length);
      const timer = setTimeout(() => {
        try {
          reactFlowInstanceRef.current?.fitView({ padding: 0.2, duration: 200 });
        } catch (e) {
          console.error('[FlowComponent] fitView 실패:', e);
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [localNodes.length, isMounted]);

  // 드롭 핸들러 - React Flow 좌표로 변환 (조건부 return 전에 호출)
  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    if (!onDrop) return;

    const nodeType = event.dataTransfer.getData('application/reactflow');
    if (!nodeType) return;

    // React Flow 인스턴스를 사용하여 좌표 변환
    const reactFlowInstance = reactFlowInstanceRef.current;
    if (reactFlowInstance) {
      const reactFlowBounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });
      
      event.dataTransfer.setData('reactFlowX', String(position.x));
      event.dataTransfer.setData('reactFlowY', String(position.y));
    }
    
    onDrop(event);
  }, [onDrop]);

  // nodeTypes가 설정되지 않았으면 로딩 화면 표시 (모든 hooks 호출 후)
  if (!nodeTypesRef.current) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">플로우 에디터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // React Flow가 로드되기 전에는 로딩 화면 표시 (모든 hooks 호출 후)
  // nodeTypesRef.current를 직접 사용하여 항상 같은 참조 유지
  if (!isMounted || !ReactFlow || !ReactFlowProvider || !nodeTypesRef.current) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">플로우 에디터를 불러오는 중...</p>
        </div>
      </div>
    );
  }


  // React Flow 컴포넌트 렌더링
  return (
    <ReactFlowProvider>
      <div
        onDrop={handleDrop}
        onDragOver={onDragOver}
        style={{ width: '100%', height: '100%' }}
      >
        <ReactFlow
          nodes={localNodes}
          edges={localEdges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          onInit={(reactFlowInstance) => {
            console.log('[FlowComponent] ReactFlow 초기화, 노드 개수:', localNodes.length);
            onInit(reactFlowInstance);
          }}
          onNodeClick={(event, node) => {
            console.log('[FlowComponent] onNodeClick 호출:', node.id, node);
            if (onNodeClick) {
              onNodeClick(event, node);
            }
          }}
          onNodeDoubleClick={(event, node) => {
            console.log('[FlowComponent] onNodeDoubleClick 호출:', node.id);
            if (onNodeDoubleClick) {
              onNodeDoubleClick(event, node);
            }
          }}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypesRef.current || undefined}
          fitView={false}
          className="bg-gray-50"
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          minZoom={0.1}
          maxZoom={2}
          preventScrolling={false}
          nodesDraggable={true}
          nodesConnectable={true}
        >
          {Background && <Background />}
          {Controls && <Controls />}
          {MiniMap && <MiniMap />}
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
}

