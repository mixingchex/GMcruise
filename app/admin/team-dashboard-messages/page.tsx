'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  FiMessageSquare, 
  FiSend, 
  FiX, 
  FiSearch, 
  FiClock, 
  FiUser, 
  FiUsers, 
  FiTrash2, 
  FiBarChart2,
  FiChevronDown,
  FiCheckCircle,
  FiXCircle
} from 'react-icons/fi';
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
  totalSent?: number;
  totalRead?: number;
  recipients?: Array<{
    id: number;
    name: string | null;
    phone: string | null;
    readCount: number;
    messageId: number;
  }>;
  messageIds?: number[];
}

interface FilterState {
  dateFrom: string;
  dateTo: string;
  adminId: number | null;
  readStatus: 'all' | 'read' | 'unread';
  searchQuery: string;
  messageTypeFilter: 'all' | 'team-dashboard' | 'agent-manager' | 'manager-agent' | 'manager-manager' | 'agent-admin' | 'manager-admin';
}

interface Admin {
  id: number;
  name: string | null;
}

interface ReaderInfo {
  userId: number;
  name: string | null;
  phone: string | null;
  readAt?: string;
  messageId: number;
}

export default function TeamDashboardMessagesPage() {
  const [messages, setMessages] = useState<TeamDashboardMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<TeamDashboardMessage | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: '',
    dateTo: '',
    adminId: null,
    readStatus: 'all',
    searchQuery: '',
    messageTypeFilter: 'all',
  });
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [activeTab, setActiveTab] = useState<'detail' | 'readers'>('detail');
  const [readersData, setReadersData] = useState<{
    totalSent: number;
    totalRead: number;
    readRate: string;
    readers: ReaderInfo[];
    nonReaders: ReaderInfo[];
  } | null>(null);
  const [loadingReaders, setLoadingReaders] = useState(false);
  const [replyMode, setReplyMode] = useState<'single' | 'all' | 'select'>('all');
  const [selectedRecipients, setSelectedRecipients] = useState<Set<number>>(new Set());
  const [showStatistics, setShowStatistics] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);
  const [statsDateRange, setStatsDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });
  const [deletingMessageId, setDeletingMessageId] = useState<number | null>(null);
  const [showSendMessageModal, setShowSendMessageModal] = useState(false);
  const [messageTitle, setMessageTitle] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [customers, setCustomers] = useState<Array<{id: number; name: string | null; phone: string | null}>>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<number>>(new Set());
  const [customerSearch, setCustomerSearch] = useState('');

  // 관리자 목록 로드
  useEffect(() => {
    fetch('/api/admin/users?role=admin')
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setAdmins(data.users || []);
        }
      })
      .catch(() => {});
  }, []);

  // 메시지 조회
  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        includeAffiliateMessages: 'true', // 판매원/대리점장 메시지도 포함
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo }),
        ...(filters.adminId && { adminId: filters.adminId.toString() }),
        ...(filters.readStatus !== 'all' && { readStatus: filters.readStatus }),
        ...(filters.messageTypeFilter !== 'all' && { messageType: filters.messageTypeFilter }),
      });
      
      const response = await fetch(`/api/admin/messages?${params.toString()}`, {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (data.ok) {
        let filtered = data.messages || [];
        
        // 검색 필터만 클라이언트 측에서 처리 (서버 측 필터는 이미 적용됨)
        if (filters.searchQuery) {
          const query = filters.searchQuery.toLowerCase();
          filtered = filtered.filter((msg: TeamDashboardMessage) => 
            msg.title.toLowerCase().includes(query) ||
            msg.content.toLowerCase().includes(query) ||
            (msg.admin.name && msg.admin.name.toLowerCase().includes(query))
          );
        }
        
        setMessages(filtered);
      } else {
        showError(data.error || '메시지를 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      showError('메시지를 불러오는 중 네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [
    filters.dateFrom,
    filters.dateTo,
    filters.adminId,
    filters.readStatus,
    filters.messageTypeFilter,
    filters.searchQuery,
  ]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // 읽음 상태 상세 정보 로드
  const loadReaders = useCallback(async (messageId: number) => {
    setLoadingReaders(true);
    try {
      const response = await fetch(`/api/admin/messages/${messageId}/readers`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok) {
        setReadersData(data);
      } else {
        showError(data.error || '읽음 상태를 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to load readers:', error);
      showError('읽음 상태를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoadingReaders(false);
    }
  }, []);

  // 메시지 상세 열기
  const handleMessageClick = (message: TeamDashboardMessage) => {
    setSelectedMessage(message);
    setActiveTab('detail');
    setReadersData(null);
    setReplyMode('all');
    setSelectedRecipients(new Set());
  };

  // 읽음 상태 탭 클릭
  useEffect(() => {
    if (activeTab === 'readers' && selectedMessage && !readersData) {
      loadReaders(selectedMessage.id);
    }
  }, [activeTab, selectedMessage, readersData, loadReaders]);

  // 메시지 삭제
  const handleDelete = async (messageId: number, deleteGroup: boolean = false) => {
    if (!confirm(deleteGroup ? '이 그룹의 모든 메시지를 삭제하시겠습니까?' : '이 메시지를 삭제하시겠습니까?')) {
      return;
    }

    setDeletingMessageId(messageId);
    try {
      const params = new URLSearchParams({
        id: messageId.toString(),
        ...(deleteGroup && { deleteGroup: 'true' }),
      });
      
      const response = await fetch(`/api/admin/messages?${params.toString()}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (data.ok) {
        showSuccess(data.message || '메시지가 삭제되었습니다.');
        setSelectedMessage(null);
        fetchMessages();
        if (showStatistics) {
          loadStatistics();
        }
      } else {
        throw new Error(data.error || '메시지 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Delete error:', error);
      showError(error instanceof Error ? error.message : '메시지 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingMessageId(null);
    }
  };

  // 답장 전송
  const handleReply = async () => {
    if (!selectedMessage || !replyContent.trim()) {
      showWarning('답장 내용을 입력해주세요.');
      return;
    }

    let targetUserIds: number[] = [];
    
    if (replyMode === 'all' && selectedMessage.recipients) {
      // 모든 수신자에게 답장
      targetUserIds = selectedMessage.recipients.map(r => r.id);
    } else if (replyMode === 'select') {
      // 선택한 수신자에게만 답장
      targetUserIds = Array.from(selectedRecipients);
    } else {
      // 원래 발신자(수신자)에게만 답장 - 첫 번째 수신자에게
      if (selectedMessage.recipients && selectedMessage.recipients.length > 0) {
        targetUserIds = [selectedMessage.recipients[0].id];
      } else if (selectedMessage.user) {
        targetUserIds = [selectedMessage.user.id];
      } else {
        showWarning('수신자 정보를 찾을 수 없습니다.');
        return;
      }
    }
    
    if (targetUserIds.length === 0) {
      showWarning('수신자를 선택해주세요.');
      return;
    }

    setSendingReply(true);
    try {
      const response = await fetch('/api/admin/marketing/customers/send-team-dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userIds: targetUserIds,
          title: `Re: ${selectedMessage.title}`,
          content: replyContent,
        }),
      });

      const result = await response.json();
      
      if (result.ok) {
        showSuccess(`${result.sentCount || targetUserIds.length}명에게 답장이 전송되었습니다.`);
        setReplyContent('');
        setSelectedMessage(null);
        setSelectedRecipients(new Set());
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

  // 통계 로드
  const loadStatistics = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        dateFrom: statsDateRange.from,
        dateTo: statsDateRange.to,
      });
      const response = await fetch(`/api/admin/messages/statistics?${params.toString()}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok) {
        setStatistics(data);
      } else {
        showError(data.error || '통계를 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to load statistics:', error);
      showError('통계를 불러오는 중 오류가 발생했습니다.');
    }
  }, [statsDateRange]);

  // 통계 표시 시 자동 로드
  useEffect(() => {
    if (showStatistics && !statistics) {
      loadStatistics();
    }
  }, [showStatistics, statistics, loadStatistics]);

  // recipients 정보가 있는 경우 자동 설정
  useEffect(() => {
    if (selectedMessage && selectedMessage.recipients && selectedMessage.recipients.length > 0) {
      if (replyMode === 'all') {
        setSelectedRecipients(new Set(selectedMessage.recipients.map(r => r.id)));
      }
    }
  }, [selectedMessage, replyMode]);

  // 고객 목록 로드
  const loadCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const response = await fetch('/api/admin/marketing/customers?pageSize=1000', {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok && data.customers) {
        setCustomers(data.customers.map((c: any) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
        })));
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
      showError('고객 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoadingCustomers(false);
    }
  };

  // 메시지 발송
  const handleSendMessage = async () => {
    if (!messageTitle.trim() || !messageContent.trim()) {
      showWarning('제목과 내용을 입력해주세요.');
      return;
    }

    if (selectedCustomerIds.size === 0) {
      showWarning('수신자를 선택해주세요.');
      return;
    }

    setSendingMessage(true);
    try {
      const userIds = Array.from(selectedCustomerIds);
      const response = await fetch('/api/admin/marketing/customers/send-team-dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userIds,
          title: messageTitle,
          content: messageContent,
        }),
      });

      const result = await response.json();
      
      if (result.ok) {
        showSuccess(`${result.sentCount || userIds.length}명에게 팀 대시보드 메시지가 전송되었습니다.`);
        setShowSendMessageModal(false);
        setMessageTitle('');
        setMessageContent('');
        setSelectedCustomerIds(new Set());
        setCustomerSearch('');
        fetchMessages();
        if (showStatistics) {
          loadStatistics();
        }
      } else {
        throw new Error(result.error || '메시지 전송에 실패했습니다.');
      }
    } catch (error) {
      console.error('Send message error:', error);
      showError(error instanceof Error ? error.message : '메시지 전송 중 오류가 발생했습니다.');
    } finally {
      setSendingMessage(false);
    }
  };

  // 필터링된 고객 목록
  const filteredCustomers = customers.filter(c => {
    if (!customerSearch) return true;
    const query = customerSearch.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(query)) ||
      (c.phone && c.phone.includes(query))
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
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowSendMessageModal(true);
                  loadCustomers();
                }}
                className="px-4 py-2 bg-white text-teal-600 rounded-lg hover:bg-teal-50 font-medium flex items-center gap-2"
              >
                <FiSend className="w-4 h-4" />
                메시지 보내기
              </button>
              <button
                onClick={() => {
                  setShowStatistics(!showStatistics);
                  if (!showStatistics && !statistics) {
                    loadStatistics();
                  }
                }}
                className="px-4 py-2 bg-white text-teal-600 rounded-lg hover:bg-teal-50 font-medium flex items-center gap-2"
              >
                <FiBarChart2 className="w-4 h-4" />
                {showStatistics ? '통계 숨기기' : '통계 보기'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* 통계 대시보드 */}
        {showStatistics && statistics && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">통계 대시보드</h2>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={statsDateRange.from}
                  onChange={(e) => setStatsDateRange({ ...statsDateRange, from: e.target.value })}
                  className="px-3 py-2 border rounded-lg"
                />
                <span className="self-center">~</span>
                <input
                  type="date"
                  value={statsDateRange.to}
                  onChange={(e) => setStatsDateRange({ ...statsDateRange, to: e.target.value })}
                  className="px-3 py-2 border rounded-lg"
                />
                <button
                  onClick={loadStatistics}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  조회
                </button>
                <button
                  onClick={() => setShowStatistics(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  닫기
                </button>
              </div>
            </div>
            
            {/* 요약 통계 */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">총 발송</div>
                <div className="text-2xl font-bold text-blue-600">
                  {statistics.summary.totalSent.toLocaleString()}
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">총 읽음</div>
                <div className="text-2xl font-bold text-green-600">
                  {statistics.summary.totalRead.toLocaleString()}
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">평균 읽음률</div>
                <div className="text-2xl font-bold text-purple-600">
                  {statistics.summary.readRate}%
                </div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">메시지 그룹</div>
                <div className="text-2xl font-bold text-orange-600">
                  {statistics.summary.totalGroups}
                </div>
              </div>
            </div>
            
            {/* 일별 통계 차트 */}
            {statistics.dailyStats && statistics.dailyStats.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">일별 발송/읽음 추이</h3>
                <div className="h-64 flex items-end gap-2">
                  {statistics.dailyStats.map((stat: any) => {
                    const maxSent = Math.max(...statistics.dailyStats.map((s: any) => s.sent));
                    const maxRead = Math.max(...statistics.dailyStats.map((s: any) => s.read));
                    return (
                      <div key={stat.date} className="flex-1 flex flex-col items-center">
                        <div className="w-full flex flex-col justify-end h-full gap-1">
                          <div
                            className="bg-blue-500 w-full rounded-t"
                            style={{ height: `${maxSent > 0 ? (stat.sent / maxSent * 100) : 0}%` }}
                            title={`발송: ${stat.sent}`}
                          />
                          <div
                            className="bg-green-500 w-full rounded-t"
                            style={{ height: `${maxRead > 0 ? (stat.read / maxRead * 100) : 0}%` }}
                            title={`읽음: ${stat.read}`}
                          />
                        </div>
                        <div className="text-xs text-gray-600 mt-1 text-center">
                          {new Date(stat.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* 발신자별 통계 */}
            {statistics.adminStats && statistics.adminStats.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">발신자별 통계</h3>
                <div className="space-y-2">
                  {statistics.adminStats.map((stat: any) => (
                    <div key={stat.admin.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="font-medium">{stat.admin.name}</div>
                      <div className="flex gap-4 text-sm">
                        <span>발송: {stat.sent}</span>
                        <span>읽음: {stat.read}</span>
                        <span className="font-semibold">읽음률: {stat.readRate}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* 인기 메시지 TOP 10 */}
            {statistics.topMessages && statistics.topMessages.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">인기 메시지 TOP 10</h3>
                <div className="space-y-2">
                  {statistics.topMessages.map((msg: any, index: number) => (
                    <div key={index} className="flex items-start justify-between p-3 bg-gray-50 rounded">
                      <div className="flex-1">
                        <div className="font-medium">{msg.title}</div>
                        <div className="text-sm text-gray-600">{msg.admin.name}</div>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <span>발송: {msg.totalSent}</span>
                        <span>읽음: {msg.totalRead}</span>
                        <span className="font-semibold">읽음률: {msg.readRate}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 필터 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* 날짜 범위 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                시작일
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                종료일
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            
            {/* 발신자 필터 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                발신자
              </label>
              <select
                value={filters.adminId || ''}
                onChange={(e) => setFilters({ ...filters, adminId: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">전체</option>
                {admins.map(admin => (
                  <option key={admin.id} value={admin.id}>
                    {admin.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* 읽음 상태 필터 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                읽음 상태
              </label>
              <select
                value={filters.readStatus}
                onChange={(e) => setFilters({ ...filters, readStatus: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">전체</option>
                <option value="read">읽음</option>
                <option value="unread">미읽음</option>
              </select>
            </div>

            {/* 메시지 타입 필터 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                메시지 타입
              </label>
              <select
                value={filters.messageTypeFilter}
                onChange={(e) => setFilters({ ...filters, messageTypeFilter: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">전체</option>
                <option value="team-dashboard">팀 대시보드</option>
                <option value="agent-manager">판매원→대리점장</option>
                <option value="manager-agent">대리점장→판매원</option>
                <option value="manager-manager">대리점장→대리점장</option>
                <option value="agent-admin">판매원→관리자</option>
                <option value="manager-admin">대리점장→관리자</option>
              </select>
            </div>
          </div>
          
          {/* 검색 및 필터 초기화 */}
          <div className="mt-4 flex gap-2">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={filters.searchQuery}
                onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                placeholder="제목, 내용으로 검색..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <button
              onClick={() => setFilters({
                dateFrom: '',
                dateTo: '',
                adminId: null,
                readStatus: 'all',
                searchQuery: '',
                messageTypeFilter: 'all',
              })}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              필터 초기화
            </button>
          </div>
        </div>

        {/* 메시지 목록 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {loading ? (
            <div className="p-8 text-center text-gray-500">로딩 중...</div>
          ) : messages.length === 0 ? (
            <div className="p-8 text-center text-gray-500">메시지가 없습니다.</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedMessage(message)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{message.title}</h3>
                        {message.messageType && message.messageType !== 'team-dashboard' && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                            {message.messageType === 'agent-manager' ? '판매원→대리점장' :
                             message.messageType === 'manager-agent' ? '대리점장→판매원' :
                             message.messageType === 'manager-manager' ? '대리점장→대리점장' :
                             message.messageType === 'agent-admin' ? '판매원→관리자' :
                             message.messageType === 'manager-admin' ? '대리점장→관리자' : message.messageType}
                          </span>
                        )}
                        {message.messageType === 'team-dashboard' && (
                          <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded text-xs font-medium">
                            팀 대시보드
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{message.content}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <FiUser className="w-3 h-3" />
                          <span>발신: {message.admin.name || '관리자'}</span>
                        </div>
                        {message.recipients && message.recipients.length > 0 && (
                          <div className="flex items-center gap-1">
                            <FiUsers className="w-3 h-3" />
                            <span>수신: {message.recipients.length}명</span>
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
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(message.id, message.messageIds && message.messageIds.length > 1);
                        }}
                        className="px-3 py-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 메시지 상세 모달 */}
        {selectedMessage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => {
            setSelectedMessage(null);
            setReplyContent('');
            setActiveTab('detail');
            setReadersData(null);
          }}>
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">{selectedMessage.title}</h2>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  {selectedMessage.messageType && selectedMessage.messageType !== 'team-dashboard' && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                      {selectedMessage.messageType === 'agent-manager' ? '판매원→대리점장' :
                       selectedMessage.messageType === 'manager-agent' ? '대리점장→판매원' :
                       selectedMessage.messageType === 'manager-manager' ? '대리점장→대리점장' :
                       selectedMessage.messageType === 'agent-admin' ? '판매원→관리자' :
                       selectedMessage.messageType === 'manager-admin' ? '대리점장→관리자' : selectedMessage.messageType}
                    </span>
                  )}
                  {selectedMessage.messageType === 'team-dashboard' && (
                    <span className="px-2 py-1 bg-teal-100 text-teal-800 rounded text-sm">
                      팀 대시보드
                    </span>
                  )}
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{selectedMessage.content}</p>
                <div className="mt-4 text-sm text-gray-500">
                  <p>발신: {selectedMessage.admin.name || '관리자'}</p>
                  <p>생성일: {new Date(selectedMessage.createdAt).toLocaleString('ko-KR')}</p>
                </div>
              </div>

              {/* 탭 */}
              <div className="border-b mb-4">
                <button
                  onClick={() => setActiveTab('detail')}
                  className={`px-4 py-2 ${activeTab === 'detail' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
                >
                  상세 정보
                </button>
                <button
                  onClick={() => setActiveTab('readers')}
                  className={`px-4 py-2 ${activeTab === 'readers' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
                >
                  읽음 상태
                </button>
              </div>

              {activeTab === 'detail' && (
                <div>
                  {/* 수신자 목록 */}
                  {selectedMessage.recipients && selectedMessage.recipients.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">수신자 목록 ({selectedMessage.recipients.length}명)</h3>
                      <div className="space-y-2">
                        {selectedMessage.recipients.map((recipient, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div>
                              <span className="font-medium">{recipient.name || '이름 없음'}</span>
                              {recipient.phone && <span className="text-sm text-gray-500 ml-2">{recipient.phone}</span>}
                            </div>
                            <div className="text-sm text-gray-500">
                              {recipient.readCount > 0 ? '읽음' : '미읽음'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'readers' && (
                <div>
                  {loadingReaders ? (
                    <div className="text-center py-4">로딩 중...</div>
                  ) : readersData ? (
                    <div>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-blue-50 p-4 rounded">
                          <div className="text-sm text-gray-600">전체 발송</div>
                          <div className="text-2xl font-bold">{readersData.totalSent}</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded">
                          <div className="text-sm text-gray-600">읽음</div>
                          <div className="text-2xl font-bold">{readersData.totalRead}</div>
                        </div>
                        <div className="bg-yellow-50 p-4 rounded">
                          <div className="text-sm text-gray-600">읽음률</div>
                          <div className="text-2xl font-bold">{readersData.readRate}%</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h3 className="font-semibold mb-2">읽은 사용자 ({readersData.readers.length})</h3>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {readersData.readers.map((reader, index) => (
                              <div key={index} className="p-2 bg-green-50 rounded text-sm">
                                <div>{reader.name || '이름 없음'}</div>
                                <div className="text-xs text-gray-500">
                                  {reader.phone || '연락처 없음'} - {new Date(reader.readAt || '').toLocaleString('ko-KR')}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h3 className="font-semibold mb-2">미읽음 사용자 ({readersData.nonReaders.length})</h3>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {readersData.nonReaders.map((nonReader, index) => (
                              <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                                <div>{nonReader.name || '이름 없음'}</div>
                                <div className="text-xs text-gray-500">{nonReader.phone || '연락처 없음'}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">데이터를 불러오는 중...</div>
                  )}
                </div>
              )}

              {/* 답장 기능 */}
              <div className="mt-6 border-t pt-4">
                <h3 className="font-semibold mb-2">답장</h3>
                <div className="mb-2">
                  <select
                    value={replyMode}
                    onChange={(e) => setReplyMode(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="all">모든 수신자에게</option>
                    <option value="select">선택한 수신자에게</option>
                    <option value="single">원래 발신자에게</option>
                  </select>
                </div>
                {replyMode === 'select' && selectedMessage.recipients && (
                  <div className="mb-2 max-h-40 overflow-y-auto border border-gray-200 rounded p-2">
                    {selectedMessage.recipients.map((recipient) => (
                      <label key={recipient.id} className="flex items-center gap-2 p-1">
                        <input
                          type="checkbox"
                          checked={selectedRecipients.has(recipient.id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedRecipients);
                            if (e.target.checked) {
                              newSet.add(recipient.id);
                            } else {
                              newSet.delete(recipient.id);
                            }
                            setSelectedRecipients(newSet);
                          }}
                        />
                        <span className="text-sm">{recipient.name || '이름 없음'}</span>
                      </label>
                    ))}
                  </div>
                )}
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="답장 내용을 입력하세요"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
                />
                <button
                  onClick={handleReply}
                  disabled={!replyContent.trim() || sendingReply}
                  className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                >
                  {sendingReply ? '전송 중...' : '답장 보내기'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 메시지 보내기 모달 */}
        {showSendMessageModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => {
            setShowSendMessageModal(false);
            setMessageTitle('');
            setMessageContent('');
            setSelectedCustomerIds(new Set());
            setCustomerSearch('');
          }}>
            <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">팀 대시보드 메시지 보내기</h2>
                <button
                  onClick={() => {
                    setShowSendMessageModal(false);
                    setMessageTitle('');
                    setMessageContent('');
                    setSelectedCustomerIds(new Set());
                    setCustomerSearch('');
                  }}
                  className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-100 rounded"
                >
                  <FiX className="text-xl" />
                </button>
              </div>

              <div className="space-y-4">
                {/* 메시지 작성 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    제목 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={messageTitle}
                    onChange={(e) => setMessageTitle(e.target.value)}
                    placeholder="메시지 제목을 입력하세요"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    내용 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="메시지 내용을 입력하세요"
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* 수신자 선택 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    수신자 선택 <span className="text-red-500">*</span>
                    {selectedCustomerIds.size > 0 && (
                      <span className="ml-2 text-teal-600 font-semibold">
                        ({selectedCustomerIds.size}명 선택됨)
                      </span>
                    )}
                  </label>
                  
                  {/* 검색 */}
                  <div className="relative mb-3">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="이름 또는 전화번호로 검색..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* 고객 목록 */}
                  <div className="border rounded-lg p-3 max-h-64 overflow-y-auto bg-gray-50">
                    {loadingCustomers ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600 mx-auto mb-2"></div>
                        <p className="text-sm text-gray-600">고객 목록을 불러오는 중...</p>
                      </div>
                    ) : filteredCustomers.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        {customerSearch ? '검색 결과가 없습니다.' : '고객이 없습니다.'}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* 전체 선택 */}
                        <label className="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer font-medium">
                          <input
                            type="checkbox"
                            checked={filteredCustomers.length > 0 && filteredCustomers.every(c => selectedCustomerIds.has(c.id))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                const newSet = new Set(selectedCustomerIds);
                                filteredCustomers.forEach(c => newSet.add(c.id));
                                setSelectedCustomerIds(newSet);
                              } else {
                                const newSet = new Set(selectedCustomerIds);
                                filteredCustomers.forEach(c => newSet.delete(c.id));
                                setSelectedCustomerIds(newSet);
                              }
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm">전체 선택 ({filteredCustomers.length}명)</span>
                        </label>
                        
                        {filteredCustomers.map(customer => (
                          <label
                            key={customer.id}
                            className="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedCustomerIds.has(customer.id)}
                              onChange={(e) => {
                                const newSet = new Set(selectedCustomerIds);
                                if (e.target.checked) {
                                  newSet.add(customer.id);
                                } else {
                                  newSet.delete(customer.id);
                                }
                                setSelectedCustomerIds(newSet);
                              }}
                              className="mr-2"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-sm">{customer.name || '이름 없음'}</div>
                              <div className="text-xs text-gray-600">{customer.phone || '전화번호 없음'}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 발송 버튼 */}
                <div className="flex gap-2 pt-4 border-t">
                  <button
                    onClick={() => {
                      setShowSendMessageModal(false);
                      setMessageTitle('');
                      setMessageContent('');
                      setSelectedCustomerIds(new Set());
                      setCustomerSearch('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageTitle.trim() || !messageContent.trim() || selectedCustomerIds.size === 0 || sendingMessage}
                    className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <FiSend className="w-4 h-4" />
                    {sendingMessage ? '전송 중...' : `메시지 보내기 (${selectedCustomerIds.size}명)`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
