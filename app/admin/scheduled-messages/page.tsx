'use client';

import { useState, useEffect, useMemo } from 'react';
import { FiPlus, FiEdit, FiTrash2, FiClock, FiX, FiAlertCircle, FiCheckCircle, FiLoader } from 'react-icons/fi';
import { showSuccess, showError, showWarning } from '@/components/ui/Toast';
import SymbolPicker from '@/components/ui/SymbolPicker';

type ScheduledMessage = {
  id: number;
  title: string;
  category: string;
  groupName: string | null;
  description: string | null;
  sendMethod: string;
  senderName: string | null;
  senderPhone: string | null;
  senderEmail: string | null;
  optOutNumber: string | null;
  isAdMessage: boolean;
  autoAddAdTag: boolean;
  autoAddOptOut: boolean;
  startDate: string | null;
  startTime: string | null;
  maxDays: number;
  repeatInterval: number | null;
  isActive: boolean;
  createdAt: string;
  targetGroupId: number | null;
  targetGroup?: {
    id: number;
    name: string;
    _count: { members: number };
  } | null;
  stages: ScheduledMessageStage[];
};

type ScheduledMessageStage = {
  id: number;
  stageNumber: number;
  daysAfter: number;
  sendTime: string | null;
  title: string;
  content: string;
  order: number;
};

export default function ScheduledMessagesPage() {
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState<ScheduledMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewDevice, setPreviewDevice] = useState<'iphone' | 'samsung'>('iphone');

  const [customerGroups, setCustomerGroups] = useState<Array<{ id: number; name: string; _count: { members: number } }>>([]);

  // 폼 데이터
  const [formData, setFormData] = useState({
    title: '',
    category: '예약메시지',
    groupName: '',
    description: '',
    sendMethod: 'sms' as 'email' | 'sms' | 'kakao' | 'cruise-guide',
    senderName: '크루즈닷',
    senderPhone: '',
    senderEmail: '',
    optOutNumber: '080-888-1003',
    isAdMessage: true,
    autoAddAdTag: true,
    autoAddOptOut: true,
    startDate: '',
    startTime: '',
    maxDays: 99999,
    repeatInterval: null as number | null,
    targetGroupId: null as number | null, // 대상 고객 그룹 ID
    stages: [
      {
        stageNumber: 1,
        daysAfter: 0,
        sendTime: '',
        title: '',
        content: '',
      },
    ] as Array<{
      stageNumber: number;
      daysAfter: number;
      sendTime: string;
      title: string;
      content: string;
    }>,
  });

  // 메시지 목록 로드
  const loadMessages = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/scheduled-messages', {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok) {
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to load scheduled messages:', error);
      showError('예약 메시지를 불러오는 중 네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  // 고객 그룹 목록 로드
  const loadCustomerGroups = async () => {
    try {
      const response = await fetch('/api/admin/customer-groups', {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok) {
        setCustomerGroups(data.groups || []);
      }
    } catch (error) {
      console.error('Failed to load customer groups:', error);
    }
  };

  useEffect(() => {
    loadMessages();
    loadCustomerGroups();
  }, []);

  // 새 메시지 작성 모달 열기
  const openCreateModal = () => {
    setEditingMessage(null);
    setFormData({
      title: '',
      category: '예약메시지',
      groupName: '',
      description: '',
      sendMethod: 'sms',
      senderName: '크루즈닷',
      senderPhone: '',
      senderEmail: '',
      optOutNumber: '080-888-1003',
      isAdMessage: true,
      autoAddAdTag: true,
      autoAddOptOut: true,
      startDate: '',
      startTime: '',
      maxDays: 99999,
      repeatInterval: null,
      targetGroupId: null,
      stages: [
        {
          stageNumber: 1,
          daysAfter: 0,
          sendTime: '',
          title: '',
          content: '',
        },
      ],
    });
    setShowModal(true);
  };

  // 단계 추가
  const addStage = () => {
    const newStageNumber = formData.stages.length + 1;
    setFormData({
      ...formData,
      stages: [
        ...formData.stages,
        {
          stageNumber: newStageNumber,
          daysAfter: 0,
          sendTime: '',
          title: '',
          content: '',
        },
      ],
    });
  };

  // 단계 제거
  const removeStage = (index: number) => {
    if (formData.stages.length <= 1) {
      showWarning('최소 1개의 단계가 필요합니다.');
      return;
    }
    const newStages = formData.stages.filter((_, i) => i !== index);
    // 단계 번호 재정렬
    newStages.forEach((stage, i) => {
      stage.stageNumber = i + 1;
    });
    setFormData({
      ...formData,
      stages: newStages,
    });
  };

  // 메시지 저장
  const handleSave = async () => {
    // 유효성 검사
    if (!formData.title.trim()) {
      showWarning('제목을 입력해주세요.');
      return;
    }

    if (formData.sendMethod === 'sms' && !formData.senderPhone.trim()) {
      showWarning('SMS 발송 시 발신번호를 입력해주세요.');
      return;
    }

    if (formData.sendMethod === 'email' && !formData.senderEmail.trim()) {
      showWarning('이메일 발송 시 발신 이메일을 입력해주세요.');
      return;
    }

    if (formData.isAdMessage && formData.autoAddOptOut && !formData.optOutNumber.trim()) {
      showWarning('무료수신거부 번호를 입력해주세요.');
      return;
    }

    // 단계별 유효성 검사
    for (let i = 0; i < formData.stages.length; i++) {
      const stage = formData.stages[i];
      if (!stage.title.trim() || !stage.content.trim()) {
        showWarning(`${i + 1}회차 메시지의 제목과 내용을 모두 입력해주세요.`);
        return;
      }
    }

    // 야간 시간 체크 (SMS/카카오톡의 경우)
    if (formData.sendMethod === 'sms' || formData.sendMethod === 'kakao') {
      const sendTime = formData.startTime || formData.stages[0]?.sendTime;
      if (sendTime) {
        const [hours] = sendTime.split(':').map(Number);
        if (hours >= 21 || hours < 8) {
          if (!confirm('야간 시간(오후 9시 ~ 오전 8시)에 광고성 메시지를 발송하면 법적 문제가 발생할 수 있습니다. 계속하시겠습니까?')) {
            return;
          }
        }
      }
    }

    try {
      const url = editingMessage
        ? `/api/admin/scheduled-messages/${editingMessage.id}`
        : '/api/admin/scheduled-messages';
      const method = editingMessage ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.ok) {
        showSuccess(editingMessage ? '예약 메시지가 수정되었습니다.' : '예약 메시지가 생성되었습니다.');
        setShowModal(false);
        loadMessages();
      } else {
        showError('저장 실패: ' + (data.error || '알 수 없는 오류가 발생했습니다.'));
      }
    } catch (error) {
      console.error('Failed to save scheduled message:', error);
      showError('예약 메시지 저장 중 네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  // 메시지 삭제
  const handleDelete = async (message: ScheduledMessage) => {
    if (!confirm('정말 이 예약 메시지를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/scheduled-messages/${message.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();
      if (data.ok) {
        showSuccess('예약 메시지가 삭제되었습니다.');
        loadMessages();
      } else {
        showError('삭제 실패: ' + (data.error || '알 수 없는 오류가 발생했습니다.'));
      }
    } catch (error) {
      console.error('Failed to delete scheduled message:', error);
      showError('예약 메시지 삭제 중 네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  // 필터링된 메시지 목록
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const query = searchQuery.toLowerCase();
    return messages.filter(
      (msg) =>
        msg.title.toLowerCase().includes(query) ||
        msg.groupName?.toLowerCase().includes(query) ||
        msg.description?.toLowerCase().includes(query)
    );
  }, [messages, searchQuery]);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-2">
            <span className="text-4xl">📅</span>
            예약 메시지 관리
          </h1>
          <p className="text-gray-600 mt-2">
            고객에게 예약된 시간에 자동으로 발송되는 메시지를 관리합니다.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openCreateModal}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 flex items-center gap-2 shadow-lg hover:scale-105 transition-all"
          >
            <FiPlus size={20} />
            예약 메시지 작성
          </button>
        </div>
      </div>

      {/* 검색 */}
      <div className="bg-white p-4 rounded-xl shadow-md">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="제목, 묶음명, 설명으로 검색..."
          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* 메시지 목록 */}
      {isLoading ? (
        <div className="text-center py-16">
          <FiLoader className="inline-block animate-spin text-4xl text-blue-600 mb-4" />
          <p className="text-lg text-gray-600 font-medium">예약 메시지를 불러오는 중...</p>
          <p className="text-sm text-gray-500 mt-2">잠시만 기다려주세요</p>
        </div>
      ) : filteredMessages.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-md text-center">
          <p className="text-gray-500 text-lg">등록된 예약 메시지가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMessages.map((message) => (
            <div
              key={message.id}
              className="bg-white p-6 rounded-xl shadow-md border-2 border-gray-200 hover:border-blue-300 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{message.title}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-semibold">
                        {message.sendMethod === 'sms' ? 'SMS' : message.sendMethod === 'email' ? '이메일' : message.sendMethod === 'kakao' ? '카카오톡' : '크루즈가이드'}
                      </span>
                      {message.targetGroup && (
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-sm font-semibold">
                          👥 {message.targetGroup.name} ({message.targetGroup._count.members}명)
                        </span>
                      )}
                    </div>
                    {message.isAdMessage && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm font-semibold">
                        광고
                      </span>
                    )}
                    {message.isActive ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-semibold">
                        활성
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm font-semibold">
                        비활성
                      </span>
                    )}
                  </div>
                  {message.groupName && (
                    <p className="text-sm text-gray-600 mb-1">묶음명: {message.groupName}</p>
                  )}
                  {message.description && (
                    <p className="text-sm text-gray-600 mb-2">{message.description}</p>
                  )}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-3">
                    <span>단계: {message.stages.length}개</span>
                    {message.startDate && (
                      <span>시작일: {new Date(message.startDate).toLocaleDateString('ko-KR')}</span>
                    )}
                    {message.repeatInterval && (
                      <span>반복: {message.repeatInterval}일마다</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingMessage(message);
                      setFormData({
                        title: message.title,
                        category: message.category,
                        groupName: message.groupName || '',
                        description: message.description || '',
                        sendMethod: message.sendMethod as any,
                        senderName: message.senderName || '',
                        senderPhone: message.senderPhone || '',
                        senderEmail: message.senderEmail || '',
                        optOutNumber: message.optOutNumber || '',
                        isAdMessage: message.isAdMessage,
                        autoAddAdTag: message.autoAddAdTag,
                        autoAddOptOut: message.autoAddOptOut,
                        startDate: message.startDate ? new Date(message.startDate).toISOString().split('T')[0] : '',
                        startTime: message.startTime || '',
                        maxDays: message.maxDays,
                        repeatInterval: message.repeatInterval,
                        targetGroupId: (message as any).targetGroupId || null,
                        stages: message.stages.map((s) => ({
                          stageNumber: s.stageNumber,
                          daysAfter: s.daysAfter,
                          sendTime: s.sendTime || '',
                          title: s.title,
                          content: s.content,
                        })),
                      });
                      setShowModal(true);
                    }}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    <FiEdit size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(message)}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 작성/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden border-2 border-gray-200 flex flex-col">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-6 border-b-2 border-gray-200">
              <h2 className="text-3xl font-extrabold text-gray-900 flex items-center gap-2">
                <span className="text-4xl">📅</span>
                {editingMessage ? '예약 메시지 수정' : '예약 메시지 작성'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 text-3xl font-bold hover:scale-110 transition-transform"
              >
                ×
              </button>
            </div>

            {/* 메인 컨텐츠 영역 */}
            <div className="flex-1 flex gap-4 p-6 overflow-hidden">
              {/* 왼쪽: 모바일 미리보기 */}
              <div className="w-[400px] flex-shrink-0">
                <div className="sticky top-6 bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-xl">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-700">모바일 미리보기</h3>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewDevice('iphone')}
                        className={`px-3 py-1 text-xs rounded transition-colors ${
                          previewDevice === 'iphone' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        iPhone
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewDevice('samsung')}
                        className={`px-3 py-1 text-xs rounded transition-colors ${
                          previewDevice === 'samsung' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Samsung
                      </button>
                    </div>
                  </div>
                  <div className={`relative ${previewDevice === 'iphone' ? 'bg-black' : 'bg-gray-900'} rounded-[2.5rem] p-2 shadow-2xl`}>
                    {/* 노치/상단바 */}
                    <div className={`${previewDevice === 'iphone' ? 'h-6' : 'h-4'} bg-black rounded-t-[2rem] flex items-center justify-center`}>
                      {previewDevice === 'iphone' && (
                        <div className="w-32 h-5 bg-black rounded-full"></div>
                      )}
                      {previewDevice === 'samsung' && (
                        <div className="w-16 h-1 bg-gray-700 rounded-full"></div>
                      )}
                    </div>
                    {/* 화면 */}
                    <div className="bg-white rounded-[2rem] overflow-hidden" style={{ height: '700px' }}>
                      <div className="h-full overflow-y-auto p-4">
                        {/* 메시지 미리보기 */}
                        {formData.stages.some(stage => stage.title || stage.content) && (
                          <div className="space-y-4">
                            {formData.stages.map((stage, index) => {
                              if (!stage.title && !stage.content) return null;
                              
                              const displayTitle = formData.isAdMessage && formData.autoAddAdTag 
                                ? `(광고) ${stage.title}` 
                                : stage.title;
                              
                              const displayContent = formData.isAdMessage && formData.autoAddOptOut
                                ? `${stage.content}\n\n무료수신거부: ${formData.optOutNumber}`
                                : stage.content;

                              if (formData.sendMethod === 'sms') {
                                return (
                                  <div key={index} className="bg-gray-100 rounded-2xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                          {formData.senderName?.charAt(0) || '크'}
                                        </div>
                                        <div>
                                          <div className="text-sm font-semibold text-gray-900">
                                            {formData.senderName || '크루즈닷'}
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            {formData.senderPhone || '010-1234-5678'}
                                          </div>
                                        </div>
                                      </div>
                                      {formData.stages.length > 1 && (
                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">
                                          {stage.stageNumber}회차
                                        </span>
                                      )}
                                    </div>
                                    <div className="bg-white rounded-xl p-3 shadow-sm">
                                      <div className="text-sm font-semibold text-gray-900 mb-1">
                                        {displayTitle}
                                      </div>
                                      <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                        {displayContent}
                                      </div>
                                    </div>
                                  </div>
                                );
                              } else if (formData.sendMethod === 'kakao') {
                                return (
                                  <div key={index} className="bg-yellow-50 rounded-2xl p-4 border-2 border-yellow-200">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                          {formData.senderName?.charAt(0) || '크'}
                                        </div>
                                        <div className="text-sm font-semibold text-gray-900">
                                          {formData.senderName || '크루즈닷'}
                                        </div>
                                      </div>
                                      {formData.stages.length > 1 && (
                                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-semibold">
                                          {stage.stageNumber}회차
                                        </span>
                                      )}
                                    </div>
                                    <div className="bg-white rounded-xl p-3 shadow-sm">
                                      <div className="text-sm font-semibold text-gray-900 mb-1">
                                        {displayTitle}
                                      </div>
                                      <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                        {displayContent}
                                      </div>
                                    </div>
                                  </div>
                                );
                              } else if (formData.sendMethod === 'email') {
                                return (
                                  <div key={index} className="bg-blue-50 rounded-2xl p-4 border-2 border-blue-200">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <div className="text-sm font-semibold text-gray-900">
                                          {formData.senderName || '크루즈닷'}
                                        </div>
                                        {formData.stages.length > 1 && (
                                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">
                                            {stage.stageNumber}회차
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {formData.senderEmail || 'sender@example.com'}
                                      </div>
                                    </div>
                                    <div className="bg-white rounded-xl p-3 shadow-sm">
                                      <div className="text-sm font-semibold text-gray-900 mb-2 border-b pb-2">
                                        {displayTitle}
                                      </div>
                                      <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                        {displayContent}
                                      </div>
                                    </div>
                                  </div>
                                );
                              } else {
                                // cruise-guide
                                return (
                                  <div key={index} className="bg-indigo-50 rounded-2xl p-4 border-2 border-indigo-200">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                          {formData.senderName?.charAt(0) || '크'}
                                        </div>
                                        <div className="text-sm font-semibold text-gray-900">
                                          {formData.senderName || '크루즈닷'}
                                        </div>
                                      </div>
                                      {formData.stages.length > 1 && (
                                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-semibold">
                                          {stage.stageNumber}회차
                                        </span>
                                      )}
                                    </div>
                                    <div className="bg-white rounded-xl p-3 shadow-sm">
                                      <div className="text-sm font-semibold text-gray-900 mb-1">
                                        {displayTitle}
                                      </div>
                                      <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                        {displayContent}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                            })}
                          </div>
                        )}
                        {!formData.stages.some(stage => stage.title || stage.content) && (
                          <div className="flex items-center justify-center h-full text-gray-400">
                            <div className="text-center">
                              <div className="text-4xl mb-2">📱</div>
                              <p className="text-sm">메시지를 입력하면 미리보기가 표시됩니다</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* 하단 홈 인디케이터 */}
                    <div className={`${previewDevice === 'iphone' ? 'h-8' : 'h-2'} bg-black rounded-b-[2rem] flex items-center justify-center`}>
                      {previewDevice === 'iphone' && (
                        <div className="w-32 h-1 bg-gray-700 rounded-full"></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 오른쪽: 폼 영역 */}
              <div className="flex-1 overflow-y-auto pr-2">
            <div className="space-y-6">
              {/* 기본 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">
                    제목 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="예약 메시지 제목"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  />
                </div>
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">
                    카테고리
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="예약메시지"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">
                    대상 고객 그룹 <span className="text-blue-600 text-sm">(선택사항)</span>
                  </label>
                  <select
                    value={formData.targetGroupId || ''}
                    onChange={(e) => setFormData({ ...formData, targetGroupId: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  >
                    <option value="">전체 고객 (그룹 미지정)</option>
                    {customerGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} ({group._count.members}명)
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    💡 그룹을 선택하면 해당 그룹의 고객들에게만 자동으로 발송됩니다.
                  </p>
                </div>
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">
                    퍼널문자 묶음명
                  </label>
                  <input
                    type="text"
                    value={formData.groupName}
                    onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                    placeholder="동일한 묶음끼리 목록에서 표시"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">
                    발송 방식 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.sendMethod}
                    onChange={(e) => {
                      const method = e.target.value as any;
                      setFormData({
                        ...formData,
                        sendMethod: method,
                        maxDays: method === 'sms' ? 999999 : 99999,
                      });
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  >
                    <option value="sms">SMS</option>
                    <option value="email">이메일</option>
                    <option value="kakao">카카오톡 알림톡</option>
                    <option value="cruise-guide">크루즈가이드 메시지</option>
                  </select>
                </div>
              </div>

              {/* 발신자 정보 */}
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-800 mb-3">발신자 정보</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      업체명/서비스명
                    </label>
                    <input
                      type="text"
                      value={formData.senderName}
                      onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                      placeholder="크루즈닷"
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  {formData.sendMethod === 'sms' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        발신번호 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={formData.senderPhone}
                        onChange={(e) => setFormData({ ...formData, senderPhone: e.target.value })}
                        placeholder="010-1234-5678"
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                  )}
                  {formData.sendMethod === 'email' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        발신 이메일 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={formData.senderEmail}
                        onChange={(e) => setFormData({ ...formData, senderEmail: e.target.value })}
                        placeholder="sender@example.com"
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 광고성 메시지 설정 */}
              <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                <h3 className="text-lg font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                  <FiAlertCircle size={20} />
                  광고성 메시지 법규 준수
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isAdMessage}
                      onChange={(e) => setFormData({ ...formData, isAdMessage: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <span className="font-semibold text-gray-900">광고성 메시지입니다</span>
                  </label>
                  {formData.isAdMessage && (
                    <>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.autoAddAdTag}
                          onChange={(e) => setFormData({ ...formData, autoAddAdTag: e.target.checked })}
                          className="w-5 h-5"
                        />
                        <span className="text-gray-900">제목에 "(광고)" 자동 추가</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.autoAddOptOut}
                          onChange={(e) => setFormData({ ...formData, autoAddOptOut: e.target.checked })}
                          className="w-5 h-5"
                        />
                        <span className="text-gray-900">메시지 끝에 "무료수신거부" 자동 추가</span>
                      </label>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          무료수신거부 번호 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          value={formData.optOutNumber}
                          onChange={(e) => setFormData({ ...formData, optOutNumber: e.target.value })}
                          placeholder="080-888-1003"
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                        <p className="text-xs text-gray-600 mt-1">
                          ※ 야간 시간(오후 9시 ~ 오전 8시) 광고성 정보 전송은 금지됩니다.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 예약 설정 */}
              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                <h3 className="text-lg font-semibold text-green-800 mb-3">예약 설정</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      시작 날짜
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      시작 시간
                    </label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* 메시지 단계 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-800">메시지 단계</h3>
                  <button
                    type="button"
                    onClick={addStage}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-semibold"
                  >
                    + 단계 추가
                  </button>
                </div>
                {formData.stages.map((stage, index) => (
                  <div key={index} className="p-4 bg-white border-2 border-gray-300 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-gray-900">{stage.stageNumber}회차 메시지</h4>
                      {formData.stages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeStage(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <FiX size={20} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          시작점으로부터 며칠 후
                        </label>
                        <input
                          type="number"
                          value={stage.daysAfter}
                          onChange={(e) => {
                            const newStages = [...formData.stages];
                            newStages[index].daysAfter = parseInt(e.target.value) || 0;
                            setFormData({ ...formData, stages: newStages });
                          }}
                          min="0"
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                        <p className="text-xs text-gray-600 mt-1">
                          0일로 설정 시 시작 시간에 발송
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          발송 시간
                        </label>
                        <input
                          type="time"
                          value={stage.sendTime}
                          onChange={(e) => {
                            const newStages = [...formData.stages];
                            newStages[index].sendTime = e.target.value;
                            setFormData({ ...formData, stages: newStages });
                          }}
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        제목 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={stage.title}
                        onChange={(e) => {
                          const newStages = [...formData.stages];
                          newStages[index].title = e.target.value;
                          setFormData({ ...formData, stages: newStages });
                        }}
                        placeholder="메시지 제목"
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-semibold text-gray-700">
                          내용 <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <SymbolPicker
                            onSymbolSelect={(symbol) => {
                              const newStages = [...formData.stages];
                              const textarea = document.querySelector(`textarea[data-stage-index="${index}"]`) as HTMLTextAreaElement;
                              if (textarea) {
                                const start = textarea.selectionStart;
                                const end = textarea.selectionEnd;
                                const text = newStages[index].content;
                                const newText = text.substring(0, start) + symbol + text.substring(end);
                                newStages[index].content = newText;
                                setFormData({ ...formData, stages: newStages });
                                // 커서 위치 조정
                                setTimeout(() => {
                                  textarea.focus();
                                  textarea.setSelectionRange(start + symbol.length, start + symbol.length);
                                }, 0);
                              } else {
                                newStages[index].content += symbol;
                                setFormData({ ...formData, stages: newStages });
                              }
                            }}
                          />
                        </div>
                      </div>
                      <textarea
                        data-stage-index={index}
                        value={stage.content}
                        onChange={(e) => {
                          const newStages = [...formData.stages];
                          newStages[index].content = e.target.value;
                          setFormData({ ...formData, stages: newStages });
                        }}
                        placeholder="보내실 내용을 입력해주세요."
                        rows={4}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* 버튼 */}
              <div className="flex gap-4 pt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all shadow-md"
                >
                  취소
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 flex items-center justify-center gap-2 shadow-lg hover:scale-105 transition-all"
                >
                  <FiClock size={18} />
                  {editingMessage ? '수정하기' : '저장하기'}
                </button>
              </div>
            </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

