'use client';

import { useState, useEffect } from 'react';
import { FiMessageSquare, FiSend, FiX, FiSearch, FiClock, FiUser } from 'react-icons/fi';
import { showSuccess, showError, showWarning } from '@/components/ui/Toast';

interface TeamDashboardMessage {
  id: number;
  title: string;
  content: string;
  messageType: string;
  createdAt: string;
  admin: {
    id: number;
    name: string | null;
  };
  user: {
    id: number;
    name: string | null;
    phone: string | null;
  } | null;
  readCount: number;
}

export default function TeamDashboardMessagesPage() {
  const [messages, setMessages] = useState<TeamDashboardMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<TeamDashboardMessage | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/messages?messageType=team-dashboard', {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (data.ok) {
        setMessages(data.messages || []);
      } else {
        showError(data.error || '메시지를 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      showError('메시지를 불러오는 중 네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!selectedMessage || !replyContent.trim()) {
      showWarning('답장 내용을 입력해주세요.');
      return;
    }

    setSendingReply(true);
    try {
      // 원래 메시지를 보낸 사람(admin)에게 답장
      // 또는 원래 메시지를 받은 사람(user)에게 답장
      const replyToUserId = selectedMessage.user?.id || selectedMessage.admin.id;
      
      const response = await fetch('/api/admin/marketing/customers/send-team-dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userIds: [replyToUserId],
          title: `Re: ${selectedMessage.title}`,
          content: replyContent,
        }),
      });

      const result = await response.json();
      
      if (result.ok) {
        showSuccess('답장이 전송되었습니다.');
        setReplyContent('');
        setSelectedMessage(null);
        fetchMessages();
      } else {
        throw new Error(result.error || '답장 전송에 실패했습니다.');
      }
    } catch (error) {
      console.error('Reply error:', error);
      showError(error instanceof Error ? error.message : '답장 전송 중 오류가 발생했습니다.');
    } finally {
      setSendingReply(false);
    }
  };

  const filteredMessages = messages.filter(msg => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      msg.title.toLowerCase().includes(query) ||
      msg.content.toLowerCase().includes(query) ||
      (msg.admin.name && msg.admin.name.toLowerCase().includes(query)) ||
      (msg.user?.name && msg.user.name.toLowerCase().includes(query))
    );
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-teal-600 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">팀 대시보드 메시지함</h1>
              <p className="text-teal-100 mt-1">팀 대시보드에 연결된 메시지들을 확인하고 답장할 수 있습니다</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* 검색 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="제목, 내용, 발신자, 수신자로 검색..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 메시지 목록 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600">메시지를 불러오는 중...</p>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="p-8 text-center">
              <FiMessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">메시지가 없습니다.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredMessages.map((message) => (
                <div
                  key={message.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedMessage(message)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{message.title}</h3>
                        {message.readCount > 0 && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                            읽음 {message.readCount}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{message.content}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <FiUser className="w-3 h-3" />
                          <span>발신: {message.admin.name || '관리자'}</span>
                        </div>
                        {message.user && (
                          <div className="flex items-center gap-1">
                            <FiUser className="w-3 h-3" />
                            <span>수신: {message.user.name || message.user.phone || '알 수 없음'}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <FiClock className="w-3 h-3" />
                          <span>
                            {new Date(message.createdAt).toLocaleString('ko-KR', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMessage(message);
                      }}
                      className="ml-4 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      답장
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 메시지 상세 및 답장 모달 */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedMessage(null)}>
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">메시지 상세</h2>
              <button
                onClick={() => {
                  setSelectedMessage(null);
                  setReplyContent('');
                }}
                className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-100 rounded"
              >
                <FiX className="text-xl" />
              </button>
            </div>

            {/* 메시지 내용 */}
            <div className="mb-6 space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">제목</label>
                <p className="mt-1 text-gray-900">{selectedMessage.title}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">내용</label>
                <p className="mt-1 text-gray-900 whitespace-pre-wrap">{selectedMessage.content}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                <div>
                  <label className="text-sm font-medium text-gray-700">발신자</label>
                  <p className="mt-1 text-gray-900">{selectedMessage.admin.name || '관리자'}</p>
                </div>
                {selectedMessage.user && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">수신자</label>
                    <p className="mt-1 text-gray-900">{selectedMessage.user.name || selectedMessage.user.phone || '알 수 없음'}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700">발송 시간</label>
                  <p className="mt-1 text-gray-900">
                    {new Date(selectedMessage.createdAt).toLocaleString('ko-KR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* 답장 작성 */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">답장 보내기</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">답장 내용</label>
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={5}
                    placeholder="답장 내용을 입력하세요..."
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedMessage(null);
                      setReplyContent('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleReply}
                    disabled={!replyContent.trim() || sendingReply}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <FiSend className="w-4 h-4" />
                    {sendingReply ? '전송 중...' : '답장 보내기'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

