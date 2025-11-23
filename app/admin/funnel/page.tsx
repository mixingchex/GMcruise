'use client';

import { useState, useEffect } from 'react';
import { FiPlus, FiEdit, FiTrash2, FiX, FiLoader, FiMessageSquare, FiMail, FiSmartphone } from 'react-icons/fi';
import { showSuccess, showError, showWarning } from '@/components/ui/Toast';
import Link from 'next/link';

type FunnelMessage = {
  id: number;
  messageType: string;
  title: string;
  category: string | null;
  groupName: string | null;
  description: string | null;
  senderPhone: string | null;
  senderEmail: string | null;
  sendTime: string | null;
  optOutNumber: string | null;
  autoAddOptOut: boolean;
  isActive: boolean;
  createdAt: string;
  groupId: number | null;
  CustomerGroup?: {
    id: number;
    name: string;
  } | null;
  FunnelMessageStage: Array<{
    id: number;
    stageNumber: number;
    daysAfter: number;
    sendTime: string | null;
    content: string;
    imageUrl: string | null;
  }>;
};

export default function FunnelManagementPage() {
  const [activeTab, setActiveTab] = useState<'sms' | 'email' | 'kakao'>('sms');
  const [messages, setMessages] = useState<FunnelMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMessages();
  }, [activeTab]);

  const loadMessages = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/funnel-messages?type=${activeTab}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok) {
        setMessages(data.messages || []);
      } else {
        showError(data.error || '퍼널 메시지를 불러오는 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Failed to load funnel messages:', error);
      showError('퍼널 메시지를 불러오는 중 네트워크 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (message: FunnelMessage) => {
    if (!confirm('정말 이 퍼널 메시지를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/funnel-messages/${message.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();
      if (data.ok) {
        showSuccess('퍼널 메시지가 삭제되었습니다.');
        loadMessages();
      } else {
        showError('삭제 실패: ' + (data.error || '알 수 없는 오류가 발생했습니다.'));
      }
    } catch (error) {
      console.error('Failed to delete funnel message:', error);
      showError('퍼널 메시지 삭제 중 네트워크 오류가 발생했습니다.');
    }
  };

  const getTabLabel = (type: string) => {
    switch (type) {
      case 'sms':
        return '퍼널문자';
      case 'email':
        return '퍼널메일';
      case 'kakao':
        return '퍼널카톡';
      default:
        return type;
    }
  };

  const getTabIcon = (type: string) => {
    switch (type) {
      case 'sms':
        return <FiMessageSquare className="text-lg" />;
      case 'email':
        return <FiMail className="text-lg" />;
      case 'kakao':
        return <FiSmartphone className="text-lg" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-2">
            <span className="text-4xl">🔄</span>
            퍼널 관리
          </h1>
          <p className="text-gray-600 mt-2">
            그룹별 퍼널 메시지를 생성하고 관리합니다.
          </p>
        </div>
        <Link
          href={`/admin/funnel/${activeTab}/new`}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold hover:from-purple-700 hover:to-indigo-700 flex items-center gap-2 shadow-lg hover:scale-105 transition-all"
        >
          <FiPlus size={20} />
          {getTabLabel(activeTab)} 작성
        </Link>
      </div>

      {/* 탭 */}
      <div className="bg-white rounded-xl shadow-md p-1 flex gap-2">
        {(['sms', 'email', 'kakao'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === tab
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {getTabIcon(tab)}
            {getTabLabel(tab)}
          </button>
        ))}
      </div>

      {/* 메시지 목록 */}
      {isLoading ? (
        <div className="text-center py-16">
          <FiLoader className="inline-block animate-spin text-4xl text-purple-600 mb-4" />
          <p className="text-lg text-gray-600 font-medium">퍼널 메시지를 불러오는 중...</p>
        </div>
      ) : messages.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-md text-center">
          <p className="text-gray-500 text-lg">등록된 {getTabLabel(activeTab)}가 없습니다.</p>
          <Link
            href={`/admin/funnel/${activeTab}/new`}
            className="mt-4 inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            첫 {getTabLabel(activeTab)} 작성하기
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className="bg-white p-6 rounded-xl shadow-md border-2 border-gray-200 hover:border-purple-300 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{message.title}</h3>
                    {message.CustomerGroup && (
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-sm font-semibold">
                        👥 {message.CustomerGroup.name}
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
                    <span>단계: {message.FunnelMessageStage.length}개</span>
                    {message.sendTime && <span>발송시간: {message.sendTime}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/admin/funnel/${activeTab}/${message.id}/edit`}
                    className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                  >
                    <FiEdit size={18} />
                  </Link>
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
    </div>
  );
}







