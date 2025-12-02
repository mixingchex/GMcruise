'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FiRefreshCw,
  FiSearch,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiCalendar,
  FiUser,
  FiLink,
  FiEdit,
  FiPlus,
  FiTrash2,
  FiGift,
  FiArrowRight,
  FiX,
  FiDownload,
  FiDatabase,
} from 'react-icons/fi';
import { showError, showSuccess } from '@/components/ui/Toast';
import { logger } from '@/lib/logger';
import ManualContractFormModal from '@/components/admin/ManualContractFormModal';

type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'pending' | 'trial';

interface Subscription {
  id: number;
  userId: number;
  mallUserId: string;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  nextBillingDate: string;
  autoRenew: boolean;
  isTrial: boolean;
  trialEndDate: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    name: string | null;
    phone: string | null;
    email: string | null;
  };
  lastPayment?: {
    id: number;
    amount: number;
    paidAt: string | null;
  };
}

export default function SubscriptionManagementPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | 'all'>('all');
  const [showContractModal, setShowContractModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteModalData, setDeleteModalData] = useState<{
    subscription: Subscription;
    usageData?: any;
    checkData?: any;
  } | null>(null);

  const loadSubscriptions = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/subscription/list', {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok) {
        setSubscriptions(data.subscriptions || []);
      } else {
        showError(data.message || '구독 목록을 불러오는데 실패했습니다.');
      }
    } catch (error: any) {
      logger.error('[SubscriptionManagement] Load error:', error);
      showError('구독 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  const handleExtendFreeMonth = async (subscriptionId: number) => {
    if (!confirm('정말로 무료로 1개월을 연장하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/subscription/${subscriptionId}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ months: 1, free: true }),
      });

      const data = await response.json();
      if (data.ok) {
        showSuccess('1개월 무료 연장이 완료되었습니다.');
        loadSubscriptions();
      } else {
        showError(data.message || '연장에 실패했습니다.');
      }
    } catch (error: any) {
      logger.error('[SubscriptionManagement] Extend error:', error);
      showError('연장 중 오류가 발생했습니다.');
    }
  };

  const handleStartTrial = async (subscriptionId: number) => {
    if (!confirm('무료 체험을 시작하시겠습니까? (7일간 30% 기능만 사용 가능, 판매만 가능)')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/subscription/${subscriptionId}/start-trial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const data = await response.json();
      if (data.ok) {
        showSuccess('무료 체험이 시작되었습니다. (7일)');
        loadSubscriptions();
      } else {
        showError(data.message || '무료 체험 시작에 실패했습니다.');
      }
    } catch (error: any) {
      logger.error('[SubscriptionManagement] Start trial error:', error);
      showError('무료 체험 시작 중 오류가 발생했습니다.');
    }
  };

  const [showChangeUserModal, setShowChangeUserModal] = useState(false);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<number | null>(null);
  const [changeUserForm, setChangeUserForm] = useState({
    name: '',
    phone: '',
  });

  const handleChangeLinkUser = async (subscriptionId: number) => {
    setSelectedSubscriptionId(subscriptionId);
    const subscription = subscriptions.find((s) => s.id === subscriptionId);
    if (subscription) {
      setChangeUserForm({
        name: subscription.user.name || '',
        phone: subscription.user.phone || '',
      });
    }
    setShowChangeUserModal(true);
  };

  const handleSubmitChangeUser = async () => {
    if (!selectedSubscriptionId) return;
    if (!changeUserForm.name.trim() || !changeUserForm.phone.trim()) {
      showError('이름과 연락처를 모두 입력해주세요.');
      return;
    }

    try {
      const response = await fetch(`/api/admin/subscription/${selectedSubscriptionId}/change-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: changeUserForm.name.trim(),
          phone: changeUserForm.phone.trim(),
        }),
      });

      const data = await response.json();
      if (data.ok) {
        showSuccess('링크 사용자 정보가 변경되었습니다.');
        setShowChangeUserModal(false);
        setSelectedSubscriptionId(null);
        loadSubscriptions();
      } else {
        showError(data.message || '변경에 실패했습니다.');
      }
    } catch (error: any) {
      logger.error('[SubscriptionManagement] Change user error:', error);
      showError('변경 중 오류가 발생했습니다.');
    }
  };

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const matchesSearch =
      sub.mallUserId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.user.phone?.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    expired: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800',
    trial: 'bg-purple-100 text-purple-800',
  };

  const statusLabels = {
    active: '활성',
    expired: '만료',
    cancelled: '취소',
    pending: '대기',
    trial: '체험 중',
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">정액제 판매원 관리</h1>
              <p className="text-gray-600 mb-2">월 단위 구독형 판매원을 관리합니다. (10만원, 1주일 무료 체험, 1개월 정식 구독)</p>
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  <p className="font-semibold mb-1">📝 로그인 안내</p>
                  <p className="mb-1">정액제 판매원(gest) 계정 로그인:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>파트너 모드 로그인 페이지에서 <strong>&quot;정액제 판매원(gest)&quot;</strong> 모드 선택</li>
                    <li>아이디: <code className="bg-blue-100 px-1 rounded">gest1</code>, 비밀번호: <code className="bg-blue-100 px-1 rounded">zxc1</code></li>
                    <li>일반 판매원/대리점장은 <strong>&quot;판매원/대리점장&quot;</strong> 모드 선택</li>
                  </ul>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                  <p className="font-semibold mb-1">💾 백업 시스템 안내</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>자동 백업</strong>: 데이터 생성 시 자동으로 Google Drive에 저장됩니다.</li>
                    <li><strong>수동 백업</strong>: 개별/전체 백업 버튼 클릭 시 로컬 다운로드 + Google Drive 자동 저장됩니다.</li>
                    <li><strong>백업 위치</strong>: Google Drive 정액제 백업 전용 폴더 (폴더 ID: <code className="bg-green-100 px-1 rounded">1HSV-t7Z7t8byMDJMY5srrpJ3ziGqz9xK</code>)</li>
                    <li>개별 수동 백업 파일명: <code className="bg-green-100 px-1 rounded">{'{mallUserId}'}_manual_backup_{'{날짜}'}_{'{시간}'}.json</code></li>
                    <li>전체 수동 백업 파일명: <code className="bg-green-100 px-1 rounded">all_subscriptions_manual_backup_{'{날짜}'}_{'{시간}'}.json</code></li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/admin/subscription/backup-all', {
                      credentials: 'include',
                    });
                    const data = await response.json();
                    if (data.ok) {
                      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = data.filename || `all_subscriptions_backup.json`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);

                      // 성공 메시지에 Google Drive 저장 여부 포함
                      const successMsg = data.driveBackupUrl
                        ? `전체 DB 백업이 완료되었습니다. (Google Drive에도 자동 저장됨)`
                        : `전체 DB 백업이 완료되었습니다. (로컬 다운로드만 가능)`;
                      showSuccess(successMsg);

                      // Google Drive URL이 있으면 로그에 기록
                      if (data.driveBackupUrl) {
                        logger.log('[SubscriptionManagement] Google Drive 전체 백업 URL:', data.driveBackupUrl);
                      }
                    } else {
                      showError(data.message || 'DB 백업에 실패했습니다.');
                    }
                  } catch (error: any) {
                    logger.error('[SubscriptionManagement] Backup all error:', error);
                    showError('DB 백업 중 오류가 발생했습니다.');
                  }
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 shadow-lg transition-all hover:scale-105"
                title="전체 DB 백업 (로컬 다운로드 + Google Drive 자동 저장)"
              >
                <FiDatabase /> 전체 DB 백업
              </button>
              <button
                onClick={() => {
                  setSelectedUserId(null);
                  setShowContractModal(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 shadow-lg transition-all hover:scale-105"
              >
                <FiPlus /> 새 정액제 판매원 등록
              </button>
              <button
                onClick={async () => {
                  const count = prompt('생성할 테스트 계정 수를 입력하세요:', '1');
                  if (!count || isNaN(parseInt(count))) return;

                  try {
                    const response = await fetch('/api/admin/subscription/create-test', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({ count: parseInt(count) }),
                    });

                    const data = await response.json();
                    if (data.ok) {
                      const userList = data.users.map((u: any) =>
                        `아이디: ${u.mallUserId}, 비밀번호: ${u.password}, 이름: ${u.name}`
                      ).join('\n');
                      alert(`테스트 계정이 생성되었습니다!\n\n${userList}`);
                      loadSubscriptions();
                    } else {
                      showError(data.message || '테스트 계정 생성에 실패했습니다.');
                    }
                  } catch (error: any) {
                    logger.error('[SubscriptionManagement] Create test error:', error);
                    showError('테스트 계정 생성 중 오류가 발생했습니다.');
                  }
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 shadow-lg transition-all hover:scale-105"
              >
                <FiPlus /> 테스트 계정 생성 (gest1, gest2, ...)
              </button>
            </div>
          </div>
        </div>

        {/* 필터 및 검색 */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="mallUserId, 이름, 전화번호로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {(['all', 'active', 'expired', 'cancelled', 'pending', 'trial'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${statusFilter === status
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {status === 'all' ? '전체' : statusLabels[status]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="text-sm text-gray-600 mb-1">전체</div>
            <div className="text-3xl font-bold text-gray-900">{subscriptions.length}</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="text-sm text-gray-600 mb-1">활성</div>
            <div className="text-3xl font-bold text-green-600">
              {subscriptions.filter((s) => s.status === 'active').length}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="text-sm text-gray-600 mb-1">만료</div>
            <div className="text-3xl font-bold text-red-600">
              {subscriptions.filter((s) => s.status === 'expired').length}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="text-sm text-gray-600 mb-1">대기</div>
            <div className="text-3xl font-bold text-yellow-600">
              {subscriptions.filter((s) => s.status === 'pending').length}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="text-sm text-gray-600 mb-1">체험 중</div>
            <div className="text-3xl font-bold text-purple-600">
              {subscriptions.filter((s) => s.status === 'trial' || s.isTrial).length}
            </div>
          </div>
        </div>

        {/* 구독 목록 */}
        {isLoading ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <FiRefreshCw className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">로딩 중...</p>
          </div>
        ) : filteredSubscriptions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <p className="text-gray-600">구독자가 없습니다.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">mallUserId</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">사용자</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">상태</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">시작일</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">종료일</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">다음 결제일</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">체험</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredSubscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FiLink className="text-gray-400" />
                          <span className="font-mono text-sm">{sub.mallUserId}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-semibold">{sub.user.name || '이름 없음'}</div>
                          <div className="text-sm text-gray-500">{sub.user.phone || '전화번호 없음'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[sub.status]}`}
                        >
                          {statusLabels[sub.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {new Date(sub.startDate).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {new Date(sub.endDate).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {new Date(sub.nextBillingDate).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-6 py-4">
                        {sub.isTrial && sub.trialEndDate ? (
                          <div className="text-xs">
                            <div className="font-semibold text-purple-700">체험 중</div>
                            <div className="text-gray-500">
                              종료: {new Date(sub.trialEndDate).toLocaleDateString('ko-KR')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          {!sub.isTrial && sub.status === 'pending' && (
                            <button
                              onClick={() => handleStartTrial(sub.id)}
                              className="p-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                              title="무료 체험 시작 (7일)"
                            >
                              <FiClock />
                            </button>
                          )}
                          {sub.isTrial && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                              체험 중
                            </span>
                          )}
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/admin/subscription/${sub.id}/backup-db`, {
                                  credentials: 'include',
                                });
                                const data = await response.json();
                                if (data.ok) {
                                  // JSON 파일 다운로드
                                  const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = data.filename || `backup_${sub.mallUserId}.json`;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                  URL.revokeObjectURL(url);

                                  // 성공 메시지에 Google Drive 저장 여부 포함
                                  const successMsg = data.driveBackupUrl
                                    ? `DB 백업이 완료되었습니다. (Google Drive에도 자동 저장됨)`
                                    : `DB 백업이 완료되었습니다. (로컬 다운로드만 가능)`;
                                  showSuccess(successMsg);

                                  // Google Drive URL이 있으면 로그에 기록
                                  if (data.driveBackupUrl) {
                                    logger.log('[SubscriptionManagement] Google Drive 백업 URL:', data.driveBackupUrl);
                                  }
                                } else {
                                  showError(data.message || 'DB 백업에 실패했습니다.');
                                }
                              } catch (error: any) {
                                logger.error('[SubscriptionManagement] Backup error:', error);
                                showError('DB 백업 중 오류가 발생했습니다.');
                              }
                            }}
                            className="p-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
                            title="DB 백업 (로컬 다운로드 + Google Drive 자동 저장)"
                          >
                            <FiDownload />
                          </button>
                          <button
                            onClick={() => handleExtendFreeMonth(sub.id)}
                            className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                            title="무료 1개월 연장"
                          >
                            <FiGift />
                          </button>
                          <button
                            onClick={() => handleChangeLinkUser(sub.id)}
                            className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                            title="링크 사용자 변경 (이름/연락처 수정)"
                          >
                            <FiUser />
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                let usageData = null;
                                let checkData = null;

                                // 무료 체험 중인 경우 데이터 사용량 확인
                                if (sub.isTrial) {
                                  const usageRes = await fetch(`/api/admin/subscription/${sub.id}/check-data-usage`, {
                                    credentials: 'include',
                                  });
                                  usageData = await usageRes.json();

                                  if (!usageData.ok) {
                                    showError(usageData.message || '데이터 사용량 확인에 실패했습니다.');
                                    return;
                                  }
                                } else {
                                  // 정식 구독 중이면 기존 DB 확인 로직
                                  const checkRes = await fetch(`/api/admin/subscription/${sub.id}/check-db`, {
                                    credentials: 'include',
                                  });
                                  checkData = await checkRes.json();

                                  if (!checkData.ok) {
                                    showError(checkData.message || 'DB 확인에 실패했습니다.');
                                    return;
                                  }
                                }

                                // 모달 표시
                                setDeleteModalData({
                                  subscription: sub,
                                  usageData,
                                  checkData,
                                });
                                setShowDeleteModal(true);
                              } catch (error: any) {
                                logger.error('[SubscriptionManagement] Delete check error:', error);
                                showError('삭제 확인 중 오류가 발생했습니다.');
                              }
                            }}
                            className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                            title={sub.isTrial ? "삭제 (무료 체험 중: 데이터 5% 미만만 가능)" : "삭제 (DB가 있으면 불가능)"}
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 계약서 모달 */}
        {showContractModal && (
          <ManualContractFormModal
            isOpen={showContractModal}
            onClose={() => {
              setShowContractModal(false);
              setSelectedUserId(null);
            }}
            contractType="SUBSCRIPTION_AGENT"
            onSuccess={() => {
              loadSubscriptions();
              setShowContractModal(false);
            }}
          />
        )}

        {/* 링크 사용자 변경 모달 */}
        {showChangeUserModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">링크 사용자 정보 변경</h2>
                <button
                  onClick={() => {
                    setShowChangeUserModal(false);
                    setSelectedSubscriptionId(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FiX className="text-xl text-gray-600" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    이름 *
                  </label>
                  <input
                    type="text"
                    value={changeUserForm.name}
                    onChange={(e) => setChangeUserForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="이름을 입력하세요"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    연락처 *
                  </label>
                  <input
                    type="text"
                    value={changeUserForm.phone}
                    onChange={(e) => setChangeUserForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="010-0000-0000"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                  <p className="font-semibold mb-1">⚠️ 주의사항</p>
                  <p>이름과 연락처를 변경하면 해당 링크를 다른 사람이 사용할 수 있습니다.</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleSubmitChangeUser}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                  >
                    변경하기
                  </button>
                  <button
                    onClick={() => {
                      setShowChangeUserModal(false);
                      setSelectedSubscriptionId(null);
                    }}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 삭제 확인 모달 */}
        {showDeleteModal && deleteModalData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">정액제 판매원 삭제 확인</h2>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteModalData(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FiX className="text-xl text-gray-600" />
                </button>
              </div>

              <div className="space-y-4">
                {/* 구독 정보 */}
                <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
                  <h3 className="font-bold text-gray-900 mb-2">구독 정보</h3>
                  <div className="space-y-1 text-sm text-gray-700">
                    <p><strong>mallUserId:</strong> {deleteModalData.subscription.mallUserId}</p>
                    <p><strong>이름:</strong> {deleteModalData.subscription.user.name || '없음'}</p>
                    <p><strong>전화번호:</strong> {deleteModalData.subscription.user.phone || '없음'}</p>
                    <p><strong>상태:</strong> {deleteModalData.subscription.isTrial ? '무료 체험 중' : '정식 구독 중'}</p>
                  </div>
                </div>

                {/* 무료 체험 중인 경우 */}
                {deleteModalData.subscription.isTrial && deleteModalData.usageData && (
                  <div className={`border-2 rounded-lg p-4 ${deleteModalData.usageData.canDelete
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-red-50 border-red-200'
                    }`}>
                    <h3 className={`font-bold mb-2 ${deleteModalData.usageData.canDelete ? 'text-yellow-900' : 'text-red-900'
                      }`}>
                      {deleteModalData.usageData.canDelete ? '✅ 삭제 가능' : '❌ 삭제 불가능'}
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p className={deleteModalData.usageData.canDelete ? 'text-yellow-800' : 'text-red-800'}>
                        <strong>데이터 사용량:</strong> {deleteModalData.usageData.dataUsage}개
                        {deleteModalData.usageData.canDelete
                          ? ` (5% 미만: ${deleteModalData.usageData.threshold}개 미만)`
                          : ` (5% 이상: ${deleteModalData.usageData.threshold}개 이상)`
                        }
                      </p>
                      <div className="ml-4 space-y-1">
                        <p className={deleteModalData.usageData.canDelete ? 'text-yellow-700' : 'text-red-700'}>
                          - 고객: {deleteModalData.usageData.details.leadCount}건
                        </p>
                        <p className={deleteModalData.usageData.canDelete ? 'text-yellow-700' : 'text-red-700'}>
                          - 판매: {deleteModalData.usageData.details.saleCount}건
                        </p>
                        <p className={deleteModalData.usageData.canDelete ? 'text-yellow-700' : 'text-red-700'}>
                          - 링크: {deleteModalData.usageData.details.linkCount}건
                        </p>
                      </div>
                      {!deleteModalData.usageData.canDelete && (
                        <p className="text-red-700 font-semibold mt-2">
                          데이터가 5% 이상이므로 삭제할 수 없습니다.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* 정식 구독 중인 경우 */}
                {!deleteModalData.subscription.isTrial && deleteModalData.checkData && (
                  <div className={`border-2 rounded-lg p-4 ${!deleteModalData.checkData.hasDb
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-red-50 border-red-200'
                    }`}>
                    <h3 className={`font-bold mb-2 ${!deleteModalData.checkData.hasDb ? 'text-yellow-900' : 'text-red-900'
                      }`}>
                      {!deleteModalData.checkData.hasDb ? '✅ 삭제 가능' : '❌ 삭제 불가능'}
                    </h3>
                    <div className="space-y-2 text-sm">
                      {deleteModalData.checkData.hasDb ? (
                        <>
                          <p className="text-red-800">
                            <strong>DB가 있어서 삭제할 수 없습니다.</strong>
                          </p>
                          <div className="ml-4 space-y-1">
                            <p className="text-red-700">
                              - 고객 데이터: {deleteModalData.checkData.leadCount}건
                            </p>
                            <p className="text-red-700">
                              - 판매 데이터: {deleteModalData.checkData.saleCount}건
                            </p>
                          </div>
                          <p className="text-red-700 font-semibold mt-2">
                            먼저 DB를 백업한 후 삭제하세요.
                          </p>
                        </>
                      ) : (
                        <p className="text-yellow-800">
                          DB가 없어서 삭제 가능합니다.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* 삭제 가능한 경우에만 확인 버튼 표시 */}
                {((deleteModalData.subscription.isTrial && deleteModalData.usageData?.canDelete) ||
                  (!deleteModalData.subscription.isTrial && !deleteModalData.checkData?.hasDb)) && (
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800 mb-2">
                        ⚠️ 삭제 후에는 복구할 수 없습니다. 정말로 삭제하시겠습니까?
                      </p>
                    </div>
                  )}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteModalData(null);
                  }}
                  className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-colors"
                >
                  취소
                </button>
                {((deleteModalData.subscription.isTrial && deleteModalData.usageData?.canDelete) ||
                  (!deleteModalData.subscription.isTrial && !deleteModalData.checkData?.hasDb)) && (
                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch(`/api/admin/subscription/${deleteModalData.subscription.id}/delete`, {
                            method: 'DELETE',
                            credentials: 'include',
                          });

                          const data = await response.json();
                          if (data.ok) {
                            showSuccess(data.message || '정액제 판매원 계약서가 삭제되었습니다.');
                            setShowDeleteModal(false);
                            setDeleteModalData(null);
                            loadSubscriptions();
                          } else {
                            showError(data.message || '삭제에 실패했습니다.');
                          }
                        } catch (error: any) {
                          logger.error('[SubscriptionManagement] Delete error:', error);
                          showError('삭제 중 오류가 발생했습니다.');
                        }
                      }}
                      className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
                    >
                      삭제 확인
                    </button>
                  )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

