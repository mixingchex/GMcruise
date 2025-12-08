'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FiSend, FiClock, FiList, FiMessageSquare, FiMail, FiSmartphone, FiBell,
  FiUsers, FiSearch, FiPlus, FiEdit, FiTrash2, FiLoader,
  FiCheckCircle, FiAlertCircle, FiFilter, FiDownload, FiExternalLink,
  FiEye, FiPhone, FiUser, FiBarChart2
} from 'react-icons/fi';
import { SiKakaotalk } from 'react-icons/si';

// 탭 타입
type TabType = 'instant' | 'scheduled' | 'history';
type SendMethodType = 'sms' | 'email' | 'kakao' | 'push' | 'app';

// 발송 대상 그룹
type TargetGroupType = 'all' | 'active' | 'inProgress' | 'hibernated' | 'custom';

// 메시지 내역 타입
interface MessageHistory {
  id: number;
  title: string;
  content: string;
  messageType: string;
  totalSent: number;
  totalRead: number;
  recipients: Array<{
    id: number;
    name: string;
    phone: string;
    readCount: number;
    messageId: number;
  }>;
  admin: {
    id: number;
    name: string;
  } | null;
  createdAt: string;
  isActive: boolean;
}

// 예약 메시지 타입
interface ScheduledMessage {
  id: number;
  title: string;
  category: string;
  groupName: string | null;
  sendMethod: string;
  senderName: string | null;
  senderPhone: string | null;
  senderEmail: string | null;
  isActive: boolean;
  startDate: string | null;
  startTime: string | null;
  stages: Array<{
    id: number;
    stageNumber: number;
    daysAfter: number;
    sendTime: string | null;
    title: string;
    content: string;
  }>;
  targetGroup?: {
    id: number;
    name: string;
    _count: { members: number };
  } | null;
  createdAt: string;
}

// 상세 모달 상태
interface MessageDetail {
  message: MessageHistory;
  isOpen: boolean;
}

export default function MessageCenterPage() {
  const [activeTab, setActiveTab] = useState<TabType>('instant');

  // 즉시 발송 상태
  const [sendMethod, setSendMethod] = useState<SendMethodType>('sms');
  const [targetGroup, setTargetGroup] = useState<TargetGroupType>('all');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);
  const [senderName, setSenderName] = useState('크루즈가이드');
  const [senderPhone, setSenderPhone] = useState('');

  // 예약 메시지 상태
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [isLoadingScheduled, setIsLoadingScheduled] = useState(false);

  // 발송 내역 상태
  const [messageHistory, setMessageHistory] = useState<MessageHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'sms' | 'email' | 'kakao' | 'push' | 'app'>('all');
  const [historySearch, setHistorySearch] = useState('');

  // 상세 모달
  const [messageDetail, setMessageDetail] = useState<MessageDetail | null>(null);

  // 통계 상태
  const [stats, setStats] = useState({
    totalSent: 0,
    totalRead: 0,
    smsCount: 0,
    emailCount: 0,
    kakaoCount: 0,
    pushCount: 0,
    appCount: 0,
  });

  // 고객 그룹 목록
  const [customerGroups, setCustomerGroups] = useState<Array<{ id: number; name: string; _count: { members: number } }>>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  // 엑셀 백업 상태
  const [isExporting, setIsExporting] = useState(false);

  // 고객 그룹 로드
  const loadCustomerGroups = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/customer-groups', { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        setCustomerGroups(data.groups || []);
      }
    } catch (error) {
      console.error('고객 그룹 로드 실패:', error);
    }
  }, []);

  // 예약 메시지 로드
  const loadScheduledMessages = useCallback(async () => {
    setIsLoadingScheduled(true);
    try {
      const res = await fetch('/api/admin/scheduled-messages', { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        setScheduledMessages(data.messages || []);
      }
    } catch (error) {
      console.error('예약 메시지 로드 실패:', error);
    } finally {
      setIsLoadingScheduled(false);
    }
  }, []);

  // 발송 내역 로드
  const loadMessageHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/admin/messages?includeAffiliateMessages=true', { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        setMessageHistory(data.messages || []);

        // 통계 계산
        const messages = data.messages || [];
        const newStats = {
          totalSent: 0,
          totalRead: 0,
          smsCount: 0,
          emailCount: 0,
          kakaoCount: 0,
          pushCount: 0,
          appCount: 0,
        };

        messages.forEach((msg: MessageHistory) => {
          newStats.totalSent += msg.totalSent || 1;
          newStats.totalRead += msg.totalRead || 0;

          switch (msg.messageType) {
            case 'sms': newStats.smsCount++; break;
            case 'email': newStats.emailCount++; break;
            case 'kakao': newStats.kakaoCount++; break;
            case 'push':
            case 'announcement': newStats.pushCount++; break;
            default: newStats.appCount++; break;
          }
        });

        setStats(newStats);
      }
    } catch (error) {
      console.error('발송 내역 로드 실패:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadCustomerGroups();
  }, [loadCustomerGroups]);

  useEffect(() => {
    if (activeTab === 'scheduled') {
      loadScheduledMessages();
    } else if (activeTab === 'history') {
      loadMessageHistory();
    }
  }, [activeTab, loadScheduledMessages, loadMessageHistory]);

  // 즉시 발송 처리
  const handleInstantSend = async () => {
    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }

    const targetLabel = targetGroup === 'all' ? '전체 사용자' :
      targetGroup === 'active' ? '활성 사용자' :
      targetGroup === 'inProgress' ? '여행 중인 사용자' :
      targetGroup === 'hibernated' ? '동면 사용자' : '선택한 고객 그룹';

    if (!confirm(`${targetLabel}에게 ${sendMethod.toUpperCase()} 메시지를 발송하시겠습니까?`)) {
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      let endpoint = '';
      let body: any = {};

      if (sendMethod === 'push') {
        // 푸시 알림 (긴급 공지)
        endpoint = '/api/admin/broadcast';
        body = {
          title,
          message: content,
          targetGroup: targetGroup === 'custom' ? 'all' : targetGroup,
        };
      } else if (sendMethod === 'sms') {
        endpoint = '/api/admin/messages/send-sms';
        body = {
          title,
          content,
          targetGroup,
          groupId: targetGroup === 'custom' ? selectedGroupId : null,
          senderName,
          senderPhone,
        };
      } else if (sendMethod === 'email') {
        endpoint = '/api/admin/messages/send-email';
        body = {
          title,
          content,
          targetGroup,
          groupId: targetGroup === 'custom' ? selectedGroupId : null,
          senderName,
        };
      } else if (sendMethod === 'kakao') {
        endpoint = '/api/admin/messages/send-kakao';
        body = {
          title,
          content,
          targetGroup,
          groupId: targetGroup === 'custom' ? selectedGroupId : null,
        };
      } else {
        // 크루즈가이드 앱 메시지
        endpoint = '/api/admin/messages';
        body = {
          title,
          content,
          messageType: 'team-dashboard',
          targetGroup,
          groupId: targetGroup === 'custom' ? selectedGroupId : null,
        };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.ok) {
        setSendResult({
          sent: data.result?.sent || data.sentCount || data.totalSent || 1,
          failed: data.result?.failed || data.failedCount || 0,
        });
        alert(`발송 완료! (성공: ${data.result?.sent || data.sentCount || data.totalSent || 1}건)`);
        setTitle('');
        setContent('');
      } else {
        alert(data.error || '발송에 실패했습니다.');
      }
    } catch (error) {
      console.error('발송 오류:', error);
      alert('발송 중 오류가 발생했습니다.');
    } finally {
      setIsSending(false);
    }
  };

  // 예약 메시지 삭제
  const handleDeleteScheduled = async (id: number) => {
    if (!confirm('이 예약 메시지를 삭제하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/admin/scheduled-messages/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        alert('삭제되었습니다.');
        loadScheduledMessages();
      } else {
        alert(data.error || '삭제에 실패했습니다.');
      }
    } catch (error) {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  // 엑셀 내보내기
  const handleExportExcel = async () => {
    if (isExporting) return;

    setIsExporting(true);
    try {
      // 구글 드라이브 스프레드시트로 내보내기
      const res = await fetch('/api/admin/messages/export-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messages: messageHistory }),
      });

      const data = await res.json();

      if (data.ok && data.spreadsheetUrl) {
        // 새 탭에서 스프레드시트 열기
        window.open(data.spreadsheetUrl, '_blank');
        alert('구글 스프레드시트로 내보내기 완료!');
      } else if (data.ok && data.blob) {
        // 로컬 다운로드
        const blob = new Blob([data.blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `메시지발송내역_${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // 간단한 CSV 다운로드
        const csvContent = generateCSV();
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `메시지발송내역_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        alert('CSV 파일로 다운로드 완료!');
      }
    } catch (error) {
      console.error('내보내기 오류:', error);
      // 폴백: CSV 다운로드
      const csvContent = generateCSV();
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `메시지발송내역_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      alert('CSV 파일로 다운로드 완료!');
    } finally {
      setIsExporting(false);
    }
  };

  // CSV 생성
  const generateCSV = () => {
    const headers = ['발송일시', '담당자', '제목', '내용', '발송방법', '발송유형', '발송대상', '발송건수', '수신건수', '수신율'];
    const rows = messageHistory.map(msg => [
      new Date(msg.createdAt).toLocaleString('ko-KR'),
      msg.admin?.name || '시스템',
      msg.title,
      msg.content.replace(/\n/g, ' ').substring(0, 100),
      getMethodLabel(msg.messageType),
      getSenderTypeLabel(msg.messageType),
      msg.recipients?.map(r => r.name).join(', ') || '전체',
      (msg.totalSent || 1).toString(),
      (msg.totalRead || 0).toString(),
      `${Math.round(((msg.totalRead || 0) / (msg.totalSent || 1)) * 100)}%`,
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
  };

  // 발송 방법 라벨
  const getMethodLabel = (type: string) => {
    switch (type) {
      case 'sms': return 'SMS';
      case 'email': return '이메일';
      case 'kakao': return '카카오톡';
      case 'push':
      case 'announcement': return '푸시알림';
      case 'agent-manager': return '팀메시지';
      case 'manager-agent': return '팀메시지';
      case 'manager-manager': return '팀메시지';
      case 'agent-admin': return '팀메시지';
      case 'manager-admin': return '팀메시지';
      case 'team-dashboard': return '팀메시지';
      default: return '앱메시지';
    }
  };

  // 발송 유형 라벨 (누가 누구에게)
  const getSenderTypeLabel = (type: string) => {
    switch (type) {
      case 'agent-manager': return '판매원→대리점장';
      case 'manager-agent': return '대리점장→판매원';
      case 'manager-manager': return '대리점장→대리점장';
      case 'agent-admin': return '판매원→본사';
      case 'manager-admin': return '대리점장→본사';
      case 'team-dashboard': return '본사→팀';
      case 'sms': return 'SMS발송';
      case 'email': return '이메일발송';
      case 'kakao': return '카카오발송';
      case 'push':
      case 'announcement': return '푸시발송';
      default: return '앱발송';
    }
  };

  // 발송 방법별 아이콘
  const getSendMethodIcon = (method: string) => {
    switch (method) {
      case 'sms': return <FiSmartphone className="text-green-600" />;
      case 'email': return <FiMail className="text-blue-600" />;
      case 'kakao': return <SiKakaotalk className="text-yellow-600" />;
      case 'push':
      case 'announcement': return <FiBell className="text-red-600" />;
      default: return <FiMessageSquare className="text-indigo-600" />;
    }
  };

  // 발송 방법별 색상
  const getMethodColor = (type: string) => {
    switch (type) {
      case 'sms': return 'bg-green-100 text-green-800 border-green-200';
      case 'email': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'kakao': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'push':
      case 'announcement': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    }
  };

  // 필터링된 메시지
  const filteredHistory = messageHistory.filter(msg => {
    if (historyFilter !== 'all') {
      if (historyFilter === 'app') {
        if (!['team-dashboard', 'info', 'notification'].includes(msg.messageType)) return false;
      } else if (historyFilter === 'push') {
        if (!['push', 'announcement'].includes(msg.messageType)) return false;
      } else if (msg.messageType !== historyFilter) {
        return false;
      }
    }

    if (historySearch) {
      const search = historySearch.toLowerCase();
      return (
        msg.title.toLowerCase().includes(search) ||
        msg.content.toLowerCase().includes(search) ||
        msg.admin?.name.toLowerCase().includes(search) ||
        msg.recipients?.some(r => r.name.toLowerCase().includes(search) || r.phone?.includes(search))
      );
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <FiMessageSquare size={32} />
          메시지 센터
        </h1>
        <p className="mt-2 text-blue-100">
          SMS, 이메일, 카카오톡, 푸시 알림을 한 곳에서 관리하세요
        </p>
      </div>

      {/* 탭 네비게이션 */}
      <div className="bg-white rounded-xl shadow-md p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('instant')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-all ${
              activeTab === 'instant'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FiSend size={20} />
            즉시 발송
          </button>
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-all ${
              activeTab === 'scheduled'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FiClock size={20} />
            예약 발송
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FiList size={20} />
            발송 내역
          </button>
        </div>
      </div>

      {/* 즉시 발송 탭 */}
      {activeTab === 'instant' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 왼쪽: 발송 설정 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 발송 방법 선택 */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <FiSend className="text-blue-600" />
                발송 방법
              </h2>
              <div className="grid grid-cols-5 gap-3">
                {[
                  { value: 'sms', label: 'SMS', icon: <FiSmartphone size={24} />, color: 'green' },
                  { value: 'email', label: '이메일', icon: <FiMail size={24} />, color: 'blue' },
                  { value: 'kakao', label: '카카오톡', icon: <SiKakaotalk size={24} />, color: 'yellow' },
                  { value: 'push', label: '푸시 알림', icon: <FiBell size={24} />, color: 'red' },
                  { value: 'app', label: '앱 메시지', icon: <FiSmartphone size={24} />, color: 'indigo' },
                ].map((method) => (
                  <button
                    key={method.value}
                    onClick={() => setSendMethod(method.value as SendMethodType)}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      sendMethod === method.value
                        ? `bg-${method.color}-50 border-${method.color}-500 text-${method.color}-700`
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    {method.icon}
                    <span className="text-sm font-semibold">{method.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 발신자 정보 (SMS/이메일일 경우) */}
            {(sendMethod === 'sms' || sendMethod === 'email') && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <FiUser className="text-blue-600" />
                  발신자 정보
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      발신자 이름
                    </label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="크루즈가이드"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  {sendMethod === 'sms' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        발신 번호
                      </label>
                      <input
                        type="tel"
                        value={senderPhone}
                        onChange={(e) => setSenderPhone(e.target.value)}
                        placeholder="02-1234-5678"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 발송 대상 선택 */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <FiUsers className="text-blue-600" />
                발송 대상
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { value: 'all', label: '전체', icon: '👥' },
                  { value: 'active', label: '활성 사용자', icon: '✅' },
                  { value: 'inProgress', label: '여행 중', icon: '🚢' },
                  { value: 'hibernated', label: '동면 사용자', icon: '💤' },
                  { value: 'custom', label: '그룹 선택', icon: '📁' },
                ].map((group) => (
                  <button
                    key={group.value}
                    onClick={() => setTargetGroup(group.value as TargetGroupType)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      targetGroup === group.value
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{group.icon}</div>
                    <div className="text-sm font-semibold">{group.label}</div>
                  </button>
                ))}
              </div>

              {/* 그룹 선택 시 드롭다운 */}
              {targetGroup === 'custom' && (
                <div className="mt-4">
                  <select
                    value={selectedGroupId || ''}
                    onChange={(e) => setSelectedGroupId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">고객 그룹 선택...</option>
                    {customerGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} ({group._count.members}명)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* 메시지 작성 */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <FiEdit className="text-blue-600" />
                메시지 작성
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    제목 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="메시지 제목을 입력하세요"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    maxLength={100}
                  />
                  <p className="text-xs text-gray-500 mt-1 text-right">{title.length}/100</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    내용 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="메시지 내용을 입력하세요"
                    rows={6}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    maxLength={1000}
                  />
                  <p className="text-xs text-gray-500 mt-1 text-right">{content.length}/1000</p>
                </div>
              </div>
            </div>
          </div>

          {/* 오른쪽: 미리보기 및 발송 */}
          <div className="space-y-6">
            {/* 미리보기 */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-bold mb-4">미리보기</h2>
              <div className="bg-gray-100 rounded-2xl p-4">
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    {getSendMethodIcon(sendMethod)}
                    <span className="font-semibold text-gray-900">{title || '제목 없음'}</span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {content || '내용을 입력해주세요...'}
                  </p>
                  {senderName && (
                    <p className="text-xs text-gray-500 mt-3 pt-2 border-t">
                      발신: {senderName} {senderPhone && `(${senderPhone})`}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 발송 결과 */}
            {sendResult && (
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FiCheckCircle className="text-green-600" size={20} />
                  <span className="font-semibold text-green-800">발송 완료</span>
                </div>
                <div className="text-sm text-green-700">
                  <p>• 성공: {sendResult.sent}건</p>
                  {sendResult.failed > 0 && <p>• 실패: {sendResult.failed}건</p>}
                </div>
              </div>
            )}

            {/* 주의사항 */}
            {sendMethod === 'push' && (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <FiAlertCircle className="text-yellow-600 mt-0.5" size={18} />
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold mb-1">푸시 알림 주의사항</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>푸시 알림 허용 사용자에게만 전달됩니다</li>
                      <li>발송 후 취소할 수 없습니다</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* 발송 버튼 */}
            <button
              onClick={handleInstantSend}
              disabled={isSending || !title.trim() || !content.trim()}
              className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                isSending || !title.trim() || !content.trim()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl'
              }`}
            >
              {isSending ? (
                <>
                  <FiLoader className="animate-spin" size={20} />
                  발송 중...
                </>
              ) : (
                <>
                  <FiSend size={20} />
                  메시지 발송
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 예약 발송 탭 */}
      {activeTab === 'scheduled' && (
        <div className="space-y-6">
          {/* 상단 액션 */}
          <div className="flex justify-between items-center">
            <p className="text-gray-600">
              등록된 예약 메시지: <span className="font-bold text-blue-600">{scheduledMessages.length}개</span>
            </p>
            <a
              href="/admin/scheduled-messages"
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 flex items-center gap-2 shadow-lg"
            >
              <FiPlus size={20} />
              예약 메시지 작성
            </a>
          </div>

          {/* 예약 메시지 목록 */}
          {isLoadingScheduled ? (
            <div className="text-center py-16">
              <FiLoader className="inline-block animate-spin text-4xl text-blue-600 mb-4" />
              <p className="text-gray-600">로딩 중...</p>
            </div>
          ) : scheduledMessages.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <FiClock className="mx-auto text-6xl text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">등록된 예약 메시지가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {scheduledMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="bg-white rounded-xl shadow-md p-6 border-2 border-gray-200 hover:border-blue-300 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{msg.title}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-semibold border ${getMethodColor(msg.sendMethod)}`}>
                          {getSendMethodIcon(msg.sendMethod)}
                          <span className="ml-1">{getMethodLabel(msg.sendMethod)}</span>
                        </span>
                        {msg.targetGroup && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-semibold">
                            👥 {msg.targetGroup.name} ({msg.targetGroup._count.members}명)
                          </span>
                        )}
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          msg.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {msg.isActive ? '활성' : '비활성'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        {msg.senderName && <span>발신자: {msg.senderName}</span>}
                        {msg.senderPhone && <span>발신번호: {msg.senderPhone}</span>}
                        <span>단계: {msg.stages.length}개</span>
                        {msg.startDate && (
                          <span>시작일: {new Date(msg.startDate).toLocaleDateString('ko-KR')}</span>
                        )}
                        <span>생성일: {new Date(msg.createdAt).toLocaleDateString('ko-KR')}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={`/admin/scheduled-messages?edit=${msg.id}`}
                        className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                      >
                        <FiEdit size={18} />
                      </a>
                      <button
                        onClick={() => handleDeleteScheduled(msg.id)}
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
      )}

      {/* 발송 내역 탭 */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* 통계 카드 */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-white rounded-xl shadow-md p-4">
              <div className="flex items-center gap-2 mb-1">
                <FiBarChart2 className="text-blue-600" />
                <span className="text-sm text-gray-600">총 발송</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSent}</p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4">
              <div className="flex items-center gap-2 mb-1">
                <FiCheckCircle className="text-green-600" />
                <span className="text-sm text-gray-600">총 수신</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.totalRead}</p>
              <p className="text-xs text-gray-500">
                ({stats.totalSent > 0 ? Math.round((stats.totalRead / stats.totalSent) * 100) : 0}%)
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4">
              <div className="flex items-center gap-2 mb-1">
                <FiSmartphone className="text-green-600" />
                <span className="text-sm text-gray-600">SMS</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.smsCount}</p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4">
              <div className="flex items-center gap-2 mb-1">
                <FiMail className="text-blue-600" />
                <span className="text-sm text-gray-600">이메일</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.emailCount}</p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4">
              <div className="flex items-center gap-2 mb-1">
                <SiKakaotalk className="text-yellow-600" />
                <span className="text-sm text-gray-600">카카오</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.kakaoCount}</p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4">
              <div className="flex items-center gap-2 mb-1">
                <FiMessageSquare className="text-indigo-600" />
                <span className="text-sm text-gray-600">앱/푸시</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.appCount + stats.pushCount}</p>
            </div>
          </div>

          {/* 필터 및 액션 */}
          <div className="bg-white rounded-xl shadow-md p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <FiFilter className="text-gray-500" />
                <span className="text-sm font-semibold text-gray-700">필터:</span>
                {['all', 'sms', 'email', 'kakao', 'push', 'app'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setHistoryFilter(filter as any)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                      historyFilter === filter
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {filter === 'all' ? '전체' : filter === 'push' ? '푸시' : filter === 'app' ? '앱' : filter.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="검색 (제목, 내용, 담당자, 수신자)"
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                  />
                </div>
                <button
                  onClick={handleExportExcel}
                  disabled={isExporting}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 font-semibold disabled:bg-gray-400"
                >
                  {isExporting ? <FiLoader className="animate-spin" /> : <FiDownload />}
                  엑셀로 보기
                </button>
              </div>
            </div>
          </div>

          {/* 발송 내역 목록 */}
          {isLoadingHistory ? (
            <div className="text-center py-16">
              <FiLoader className="inline-block animate-spin text-4xl text-blue-600 mb-4" />
              <p className="text-gray-600">로딩 중...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <FiList className="mx-auto text-6xl text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">발송 내역이 없습니다.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">발송일시</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">담당자</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">제목</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">방법</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">발송유형</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">수신자</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">발송/수신</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">수신율</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">상세</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((msg: any) => {
                    const totalSent = msg.totalSent || 1;
                    const totalRead = msg.totalRead || 0;
                    const readRate = Math.round((totalRead / totalSent) * 100);

                    return (
                      <tr key={msg.id} className="border-t hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="text-sm text-gray-900">
                            {new Date(msg.createdAt).toLocaleDateString('ko-KR')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(msg.createdAt).toLocaleTimeString('ko-KR')}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <FiUser className="text-blue-600" size={14} />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{msg.admin?.name || '시스템'}</div>
                              <div className="text-xs text-gray-500">관리자</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">{msg.title}</div>
                          <div className="text-xs text-gray-500 truncate max-w-xs">{msg.content}</div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold border ${getMethodColor(msg.messageType)}`}>
                            {getSendMethodIcon(msg.messageType)}
                            <span className="ml-1">{getMethodLabel(msg.messageType)}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded font-medium">
                            {getSenderTypeLabel(msg.messageType)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {msg.recipients && msg.recipients.length > 0 ? (
                            <div className="text-sm">
                              <span className="font-medium">{msg.recipients[0]?.name}</span>
                              {msg.recipients.length > 1 && (
                                <span className="text-gray-500"> 외 {msg.recipients.length - 1}명</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500">전체</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="font-semibold text-blue-600">{totalSent}</span>
                            <span className="text-gray-400">/</span>
                            <span className="font-semibold text-green-600">{totalRead}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                            readRate >= 80 ? 'bg-green-100 text-green-800' :
                            readRate >= 50 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {readRate}%
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setMessageDetail({ message: msg, isOpen: true })}
                            className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                          >
                            <FiEye size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 상세 모달 */}
      {messageDetail?.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">메시지 상세 정보</h2>
              <button
                onClick={() => setMessageDetail(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* 발신 정보 */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <FiUser className="text-blue-600" />
                  발신 정보
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">담당자:</span>
                    <span className="ml-2 font-medium">{messageDetail.message.admin?.name || '시스템'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">발송 방법:</span>
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${getMethodColor(messageDetail.message.messageType)}`}>
                      {getMethodLabel(messageDetail.message.messageType)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">발송일시:</span>
                    <span className="ml-2 font-medium">
                      {new Date(messageDetail.message.createdAt).toLocaleString('ko-KR')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">발송 유형:</span>
                    <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-semibold">
                      {getSenderTypeLabel(messageDetail.message.messageType)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">대상 구분:</span>
                    <span className="ml-2 font-medium">
                      {messageDetail.message.recipients && messageDetail.message.recipients.length > 1 ? '단체 발송' : '개인 발송'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 메시지 내용 */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <FiMessageSquare className="text-blue-600" />
                  메시지 내용
                </h3>
                <div className="bg-white rounded-lg p-4">
                  <p className="font-semibold text-lg mb-2">{messageDetail.message.title}</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{messageDetail.message.content}</p>
                </div>
              </div>

              {/* 수신자 목록 */}
              <div className="bg-green-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <FiUsers className="text-green-600" />
                  수신자 ({messageDetail.message.recipients?.length || 0}명)
                </h3>
                {messageDetail.message.recipients && messageDetail.message.recipients.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-white/50">
                        <tr>
                          <th className="text-left py-2 px-3">이름</th>
                          <th className="text-left py-2 px-3">연락처</th>
                          <th className="text-center py-2 px-3">수신 상태</th>
                        </tr>
                      </thead>
                      <tbody>
                        {messageDetail.message.recipients.map((recipient, idx) => (
                          <tr key={idx} className="border-t border-green-100">
                            <td className="py-2 px-3 font-medium">{recipient.name}</td>
                            <td className="py-2 px-3">
                              {recipient.phone ? (
                                <span className="flex items-center gap-1">
                                  <FiPhone size={12} />
                                  {recipient.phone}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {recipient.readCount > 0 ? (
                                <span className="px-2 py-0.5 bg-green-200 text-green-800 rounded text-xs font-semibold">
                                  수신 완료
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-xs font-semibold">
                                  미확인
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500">전체 발송</p>
                )}
              </div>

              {/* 통계 */}
              <div className="bg-purple-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <FiBarChart2 className="text-purple-600" />
                  발송 통계
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">{messageDetail.message.totalSent || 1}</p>
                    <p className="text-xs text-gray-500">발송</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{messageDetail.message.totalRead || 0}</p>
                    <p className="text-xs text-gray-500">수신</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {Math.round(((messageDetail.message.totalRead || 0) / (messageDetail.message.totalSent || 1)) * 100)}%
                    </p>
                    <p className="text-xs text-gray-500">수신율</p>
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
