'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FiLock, FiUnlock, FiKey, FiLogOut, FiArrowLeft, FiRefreshCw, FiTrash2, FiBarChart2, FiFileText, FiX, FiPlus, FiEdit, FiLink, FiCopy, FiMessageSquare, FiSend, FiLoader } from 'react-icons/fi';
import { showSuccess, showError } from '@/components/ui/Toast';
import { csrfFetch } from '@/lib/csrf-client';

type AffiliateOwnershipSource = 'self-profile' | 'lead-agent' | 'lead-manager' | 'fallback';

type AffiliateOwnership = {
  ownerType: 'HQ' | 'BRANCH_MANAGER' | 'SALES_AGENT';
  ownerProfileId: number | null;
  ownerName: string | null;
  ownerNickname: string | null;
  ownerAffiliateCode: string | null;
  ownerBranchLabel: string | null;
  ownerStatus: string | null;
  source: AffiliateOwnershipSource;
  managerProfile: {
    id: number;
    displayName: string | null;
    nickname: string | null;
    affiliateCode: string | null;
    branchLabel: string | null;
    status: string | null;
  } | null;
  leadId?: number | null;
  leadStatus?: string | null;
  leadCreatedAt?: string | null;
  normalizedPhone?: string | null;
};

type User = {
  id: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  createdAt: string;
  lastActiveAt: string | null;
  isLocked: boolean;
  lockedAt: string | null;
  lockedReason: string | null;
  loginCount: number;
  tripCount: number;
  trips: any[];
  passwordEvents: {
    id: number;
    from: string;
    to: string;
    reason: string;
    createdAt: string;
  }[];
  affiliateOwnership?: AffiliateOwnership | null;
};

type Session = {
  id: string;
  createdAt: string;
  expiresAt: string | null;
  isExpired: boolean;
};

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = parseInt(params.userId as string);

  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newPassword, setNewPassword] = useState('3800');
  const [analytics, setAnalytics] = useState<any>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [journeyHistory, setJourneyHistory] = useState<any[]>([]);
  const [showJourney, setShowJourney] = useState(false);
  const [showPassportModal, setShowPassportModal] = useState(false);
  const [selectedReservationId, setSelectedReservationId] = useState<number | null>(null);
  const [editingTravelerId, setEditingTravelerId] = useState<number | null>(null);
  const [passportForm, setPassportForm] = useState({
    korName: '',
    engGivenName: '',
    engSurname: '',
    passportNo: '',
    birthDate: '',
    expiryDate: '',
  });

  // PNR(객실 배정) 관련 state
  const [showPnrModal, setShowPnrModal] = useState(false);
  const [pnrForm, setPnrForm] = useState<Array<{ travelerId: number; name: string; roomNumber: string }>>([]);
  const [selectedTripIdForPnr, setSelectedTripIdForPnr] = useState<number | null>(null);

  // 소속 편집 관련 state
  const [isEditingAffiliation, setIsEditingAffiliation] = useState(false);
  const [selectedManagerId, setSelectedManagerId] = useState<string>('');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [managers, setManagers] = useState<Array<{ id: number; displayName: string | null; nickname: string | null; affiliateCode: string | null; branchLabel: string | null }>>([]);
  const [agents, setAgents] = useState<Array<{ id: number; displayName: string | null; nickname: string | null; affiliateCode: string | null; managerId: number | null }>>([]);
  const [isLoadingAffiliation, setIsLoadingAffiliation] = useState(false);
  const [affiliationHistory, setAffiliationHistory] = useState<Array<{
    id: number;
    note: string | null;
    occurredAt: string;
    createdBy: string | null;
    metadata: any;
  }>>([]);
  const [showAffiliationHistory, setShowAffiliationHistory] = useState(false);

  // SMS 모달 상태
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsContent, setSmsContent] = useState('');
  const [sendingSms, setSendingSms] = useState(false);

  // 사용자 정보 로드
  const loadUserData = async () => {
    try {
      setIsLoading(true);
      // 캐시 방지를 위해 timestamp 추가
      const response = await fetch(`/api/admin/users/${userId}?t=${Date.now()}`, {
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      const data = await response.json();
      if (data.ok) {
        // 디버깅: 여권 정보 확인
        const allTravelers: any[] = [];
        if (data.user.trips) {
          data.user.trips.forEach((trip: any) => {
            if (trip.Reservation) {
              trip.Reservation.forEach((res: any) => {
                if (res.Traveler) {
                  allTravelers.push(...res.Traveler);
                }
              });
            }
          });
        }
        if ((data.user as any).reservations) {
          (data.user as any).reservations.forEach((res: any) => {
            if (res.Traveler) {
              res.Traveler.forEach((t: any) => {
                if (!allTravelers.find(at => at.id === t.id)) {
                  allTravelers.push(t);
                }
              });
            }
          });
        }

        console.log('[Load User Data] User data loaded:', {
          trips: data.user.trips?.length || 0,
          reservations: (data.user as any).reservations?.length || 0,
          totalTravelers: allTravelers.length,
          travelersWithPassport: allTravelers.filter(t => t.passportNo).length,
          travelers: allTravelers.map(t => ({
            id: t.id,
            passportNo: t.passportNo,
            korName: t.korName,
          })),
          rawTrips: data.user.trips?.map((t: any) => ({
            id: t.id,
            cruiseName: t.cruiseName,
            reservations: t.Reservation?.length || 0,
            travelers: t.Reservation?.reduce((sum: number, r: any) => sum + (r.Traveler?.length || 0), 0) || 0,
          })),
        });
        setUser(data.user);
      } else {
        alert('사용자 정보를 불러올 수 없습니다: ' + (data.error || 'Unknown error'));
        router.push('/admin/customers');
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      alert('사용자 정보를 불러오는 중 오류가 발생했습니다.');
      router.push('/admin/customers');
    } finally {
      setIsLoading(false);
    }
  };

  // SMS 발송 함수
  const handleSendSms = async () => {
    if (!user || !user.phone) {
      showError('고객 전화번호가 없습니다.');
      return;
    }
    if (!smsContent.trim()) {
      showError('메시지 내용을 입력해주세요.');
      return;
    }

    try {
      setSendingSms(true);
      const res = await fetch('/api/admin/messages/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '',
          content: smsContent,
          recipients: [
            {
              name: user.name || '고객',
              phone: user.phone,
            },
          ],
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || json.message || '문자 발송에 실패했습니다.');
      }

      showSuccess('문자가 성공적으로 발송되었습니다!');
      setShowSmsModal(false);
      setSmsContent('');
    } catch (error: any) {
      console.error('[CustomerDetail] SMS send error', error);
      showError(error.message || '문자 발송 중 오류가 발생했습니다.');
    } finally {
      setSendingSms(false);
    }
  };

  // 고객 여정 히스토리 로드
  const loadJourneyHistory = async () => {
    try {
      const response = await fetch(`/api/admin/customers/${userId}/journey`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok) {
        setJourneyHistory(data.journeyHistory || []);
      }
    } catch (error) {
      console.error('Failed to load journey history:', error);
    }
  };

  // 세션 목록 로드
  const loadSessions = async () => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/sessions`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok) {
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  // 사용자 분석 데이터 로드
  const loadAnalytics = async () => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/analytics`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.ok) {
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  // 사용자 삭제
  const handleDeleteUser = async () => {
    if (!confirm(`정말로 사용자 "${user?.name || userId}"를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    setIsProcessing(true);

    try {
      console.log('[Delete User] ===== FRONTEND START =====');
      console.log('[Delete User] UserId:', userId);
      console.log('[Delete User] URL:', `/api/admin/users/${userId}/delete`);

      const response = await fetch(`/api/admin/users/${userId}/delete`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('[Delete User] Response status:', response.status);
      console.log('[Delete User] Response ok:', response.ok);
      const headersObj: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headersObj[key] = value;
      });
      console.log('[Delete User] Response headers:', headersObj);

      const responseText = await response.text();
      console.log('[Delete User] Response text (raw):', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
        console.log('[Delete User] Parsed data:', JSON.stringify(data, null, 2));
      } catch (parseError) {
        console.error('[Delete User] JSON parse error:', parseError);
        alert(`❌ 서버 응답 파싱 실패\n\n상태: ${response.status}\n응답:\n${responseText.substring(0, 1000)}`);
        setIsProcessing(false);
        return;
      }

      if (data.ok) {
        console.log('[Delete User] SUCCESS');
        alert(`✅ 성공!\n\n${data.message || '사용자가 삭제되었습니다.'}`);
        router.push('/admin/customers');
      } else {
        console.error('[Delete User] FAILED:', data);
        const errorInfo = [
          `❌ 사용자 삭제 실패`,
          ``,
          `에러: ${data.error || data.errorMessage || 'Unknown error'}`,
          data.errorCode ? `에러 코드: ${data.errorCode}` : '',
          data.errorName ? `에러 이름: ${data.errorName}` : '',
          data.userId ? `사용자 ID: ${data.userId}` : '',
          data.timestamp ? `시간: ${data.timestamp}` : '',
          ``,
          `=== 서버 응답 전체 ===`,
          JSON.stringify(data, null, 2),
        ].filter(Boolean).join('\n');

        alert(errorInfo);
      }
    } catch (error) {
      console.error('[Delete User] ===== FRONTEND ERROR =====');
      console.error('[Delete User] Error:', error);
      const errorInfo = [
        `❌ 네트워크 오류 발생`,
        ``,
        `에러: ${error instanceof Error ? error.message : String(error)}`,
        `타입: ${error instanceof Error ? error.name : typeof error}`,
        ``,
        `스택:`,
        error instanceof Error ? error.stack : String(error),
      ].join('\n');

      alert(errorInfo);
    } finally {
      console.log('[Delete User] ===== FRONTEND END =====');
      setIsProcessing(false);
    }
  };

  const ownershipSourceLabels: Record<AffiliateOwnershipSource, string> = {
    'self-profile': '자체 소속',
    'lead-agent': '리드 배정 (판매원)',
    'lead-manager': '리드 배정 (대리점장)',
    fallback: '본사 기본 배정',
  };

  const renderAffiliateOwnershipSection = (ownership?: AffiliateOwnership | null) => {
    const data: AffiliateOwnership = ownership ?? {
      ownerType: 'HQ',
      ownerProfileId: null,
      ownerName: '본사 직속',
      ownerNickname: null,
      ownerAffiliateCode: null,
      ownerBranchLabel: null,
      ownerStatus: null,
      source: 'fallback',
      managerProfile: null,
      leadStatus: null,
      leadCreatedAt: null,
      normalizedPhone: null,
    };

    let badgeClass = 'bg-red-50 text-red-600 border border-red-200';
    let label = '본사 직속';
    if (data.ownerType === 'BRANCH_MANAGER') {
      badgeClass = 'bg-purple-50 text-purple-600 border border-purple-200';
      label = '대리점장';
    } else if (data.ownerType === 'SALES_AGENT') {
      badgeClass = 'bg-blue-50 text-blue-600 border border-blue-200';
      label = '판매원';
    }

    // 편집 모드
    if (isEditingAffiliation) {
      return (
        <div className="mt-1 flex flex-col gap-3">
          <div className="space-y-3">
            {/* 대리점장 선택 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                담당 대리점장
              </label>
              <select
                value={selectedManagerId}
                onChange={(e) => {
                  setSelectedManagerId(e.target.value);
                  // 대리점장 변경 시 판매원 초기화 (선택사항)
                  if (e.target.value && selectedAgentId) {
                    const agent = agents.find(a => a.id === parseInt(selectedAgentId));
                    if (agent?.managerId !== parseInt(e.target.value)) {
                      setSelectedAgentId('');
                    }
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">본사 직속 (대리점장 없음)</option>
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.nickname || manager.displayName || '이름 없음'}
                    {manager.affiliateCode ? ` (${manager.affiliateCode})` : ''}
                    {manager.branchLabel ? ` - ${manager.branchLabel}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 판매원 선택 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                담당 판매원
              </label>
              <select
                value={selectedAgentId}
                onChange={(e) => handleAgentChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">판매원 없음 (대리점장 직속)</option>
                {agents
                  .filter(agent => {
                    // 대리점장이 선택된 경우, 해당 대리점장 소속 판매원만 표시
                    if (selectedManagerId) {
                      return agent.managerId === parseInt(selectedManagerId);
                    }
                    // 대리점장이 선택되지 않은 경우 모든 판매원 표시
                    return true;
                  })
                  .map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.nickname || agent.displayName || '이름 없음'}
                      {agent.affiliateCode ? ` (${agent.affiliateCode})` : ''}
                    </option>
                  ))}
              </select>
              {selectedManagerId && agents.filter(a => a.managerId === parseInt(selectedManagerId)).length === 0 && (
                <p className="text-xs text-gray-500 mt-1">선택한 대리점장 소속 판매원이 없습니다.</p>
              )}
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex gap-2">
            <button
              onClick={handleSaveAffiliation}
              disabled={isLoadingAffiliation}
              className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingAffiliation ? '저장 중...' : '저장'}
            </button>
            <button
              onClick={handleCancelEditAffiliation}
              disabled={isLoadingAffiliation}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              취소
            </button>
          </div>
        </div>
      );
    }

    // 표시 모드
    return (
      <div className="mt-1 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${badgeClass}`}>
            {label}
            {data.ownerName && (
              <span className="font-normal">
                {data.ownerName}
                {data.ownerAffiliateCode ? ` (${data.ownerAffiliateCode})` : ''}
              </span>
            )}
          </span>
          {/* 관리자는 항상 편집 가능 */}
          <button
            onClick={handleStartEditAffiliation}
            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="소속 편집"
          >
            <FiEdit size={16} />
          </button>
        </div>
        {data.ownerBranchLabel && (
          <span className="text-sm text-gray-600">
            소속 지점: {data.ownerBranchLabel}
          </span>
        )}
        {data.ownerType === 'SALES_AGENT' && data.managerProfile && (
          <span className="inline-flex items-center gap-2 rounded-full bg-purple-50 border border-purple-200 px-3 py-1 text-xs font-medium text-purple-600">
            담당 대리점장
            <span className="font-normal">
              {data.managerProfile.nickname || data.managerProfile.displayName || '미지정'}
              {data.managerProfile.affiliateCode ? ` (${data.managerProfile.affiliateCode})` : ''}
            </span>
          </span>
        )}
        <span className="text-xs text-gray-400">
          {ownershipSourceLabels[data.source]}
          {data.leadStatus ? ` · 최근 리드 상태: ${data.leadStatus}` : ''}
        </span>
      </div>
    );
  };

  // 소속 변경 이력 로드
  const loadAffiliationHistory = async () => {
    if (!user?.affiliateOwnership?.leadId) {
      setAffiliationHistory([]);
      return;
    }

    try {
      const response = await fetch(`/api/admin/affiliate/leads/${user.affiliateOwnership.leadId}`);
      const data = await response.json();
      if (data.ok && data.lead?.interactions) {
        // 소속 변경 관련 이력만 필터링 (managerId 또는 agentId 변경)
        const affiliationChanges = data.lead.interactions
          .filter((interaction: any) => {
            if (interaction.interactionType !== 'UPDATED') return false;
            // metadata에 managerChange 또는 agentChange가 있거나
            // changes에 managerId 또는 agentId가 있는 경우
            const metadata = interaction.metadata || {};
            return metadata.managerChange ||
              metadata.agentChange ||
              (metadata.changes && (metadata.changes.managerId !== undefined || metadata.changes.agentId !== undefined));
          })
          .map((interaction: any) => ({
            id: interaction.id,
            note: interaction.note,
            occurredAt: interaction.occurredAt || interaction.createdAt,
            createdBy: interaction.createdBy?.name || interaction.createdBy?.email || '관리자',
            metadata: interaction.metadata,
          }));
        setAffiliationHistory(affiliationChanges);
      } else {
        setAffiliationHistory([]);
      }
    } catch (error) {
      console.error('Failed to load affiliation history:', error);
      setAffiliationHistory([]);
    }
  };

  // 대리점장/판매원 목록 로드
  const loadAffiliateProfiles = async () => {
    try {
      // 대리점장 목록
      const managersResponse = await fetch('/api/admin/affiliate/profiles?type=BRANCH_MANAGER&status=ACTIVE');
      const managersData = await managersResponse.json();
      if (managersData.ok && managersData.profiles) {
        setManagers(managersData.profiles.map((p: any) => ({
          id: p.id,
          displayName: p.displayName,
          nickname: p.nickname,
          affiliateCode: p.affiliateCode,
          branchLabel: p.branchLabel,
        })));
      }

      // 판매원 목록 (모든 판매원을 가져온 후 필터링)
      const agentsResponse = await fetch('/api/admin/affiliate/profiles?type=SALES_AGENT&status=ACTIVE');
      const agentsData = await agentsResponse.json();
      if (agentsData.ok && agentsData.profiles) {
        // 판매원 목록을 가져온 후, 각 판매원의 대리점장 관계를 조회
        // 성능을 위해 배치로 처리하거나, 일단 모든 판매원을 표시하고 필터링은 클라이언트에서 처리
        const agentsList = agentsData.profiles.map((p: any) => ({
          id: p.id,
          displayName: p.displayName,
          nickname: p.nickname,
          affiliateCode: p.affiliateCode,
          managerId: null, // 일단 null로 설정, 필요시 별도 조회
        }));

        // 각 판매원의 대리점장 관계를 조회 (배치 처리)
        const agentsWithManager = await Promise.all(
          agentsList.map(async (agent: any) => {
            try {
              // 판매원의 대리점장 관계 조회
              const relationResponse = await fetch(`/api/admin/affiliate/profiles/${agent.id}`);
              const relationData = await relationResponse.json();

              if (relationData.ok && relationData.profile) {
                const relations = relationData.profile.relations || [];
                const activeRelation = relations.find((r: any) => r.status === 'ACTIVE');
                if (activeRelation) {
                  agent.managerId = activeRelation.managerId || activeRelation.manager?.id || null;
                }
              }
            } catch (error) {
              console.error(`Failed to load manager for agent ${agent.id}:`, error);
            }
            return agent;
          })
        );

        setAgents(agentsWithManager);
      }
    } catch (error) {
      console.error('Failed to load affiliate profiles:', error);
    }
  };

  // 소속 편집 시작
  const handleStartEditAffiliation = () => {
    if (!user) return;

    const ownership = user.affiliateOwnership;

    // 현재 소속 정보를 선택값에 설정
    if (ownership) {
      if (ownership.ownerType === 'BRANCH_MANAGER' && ownership.ownerProfileId) {
        setSelectedManagerId(String(ownership.ownerProfileId));
        setSelectedAgentId('');
      } else if (ownership.ownerType === 'SALES_AGENT' && ownership.ownerProfileId) {
        setSelectedAgentId(String(ownership.ownerProfileId));
        if (ownership.managerProfile?.id) {
          setSelectedManagerId(String(ownership.managerProfile.id));
        }
      } else {
        setSelectedManagerId('');
        setSelectedAgentId('');
      }
    } else {
      // 리드가 없는 경우 기본값
      setSelectedManagerId('');
      setSelectedAgentId('');
    }

    setIsEditingAffiliation(true);
    loadAffiliateProfiles();
  };

  // 소속 편집 취소
  const handleCancelEditAffiliation = () => {
    setIsEditingAffiliation(false);
    setSelectedManagerId('');
    setSelectedAgentId('');
  };

  // 소속 저장
  const handleSaveAffiliation = async () => {
    if (!user) {
      showError('고객 정보를 찾을 수 없습니다.');
      return;
    }

    setIsLoadingAffiliation(true);
    try {
      let leadId = user.affiliateOwnership?.leadId;

      // 리드가 없는 경우 새로 생성
      if (!leadId) {
        if (!user.phone) {
          showError('고객의 전화번호가 없어 소속을 설정할 수 없습니다.');
          setIsLoadingAffiliation(false);
          return;
        }

        // 새 리드 생성
        const createLeadResponse = await fetch('/api/admin/affiliate/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            customerName: user.name || '이름 없음',
            customerPhone: user.phone.replace(/\D/g, ''), // 숫자만 추출
            managerId: selectedManagerId ? parseInt(selectedManagerId) : null,
            agentId: selectedAgentId ? parseInt(selectedAgentId) : null,
            status: 'NEW',
            source: 'admin-manual',
          }),
        });

        const createLeadData = await createLeadResponse.json();
        if (!createLeadData.ok) {
          showError(createLeadData.message || '리드 생성에 실패했습니다.');
          setIsLoadingAffiliation(false);
          return;
        }

        leadId = createLeadData.lead.id;
        showSuccess('리드가 생성되고 소속이 설정되었습니다.');
      } else {
        // 기존 리드 업데이트
        const response = await fetch(`/api/admin/affiliate/leads/${leadId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            managerId: selectedManagerId ? parseInt(selectedManagerId) : null,
            agentId: selectedAgentId ? parseInt(selectedAgentId) : null,
          }),
        });

        const data = await response.json();
        if (!data.ok) {
          showError(data.message || '소속 변경에 실패했습니다.');
          setIsLoadingAffiliation(false);
          return;
        }

        showSuccess('소속이 변경되었습니다.');
      }

      setIsEditingAffiliation(false);
      loadUserData(); // 사용자 정보 새로고침
      loadAffiliationHistory(); // 변경 이력 새로고침
    } catch (error) {
      console.error('Failed to save affiliation:', error);
      showError('소속 변경 중 오류가 발생했습니다.');
    } finally {
      setIsLoadingAffiliation(false);
    }
  };

  // 판매원 선택 시 해당 판매원의 대리점장 자동 설정
  const handleAgentChange = (agentId: string) => {
    setSelectedAgentId(agentId);
    if (agentId) {
      const agent = agents.find(a => a.id === parseInt(agentId));
      if (agent?.managerId) {
        setSelectedManagerId(String(agent.managerId));
      }
    }
  };

  useEffect(() => {
    if (userId) {
      loadUserData();
      loadSessions();
      loadJourneyHistory();
    }
  }, [userId]);

  useEffect(() => {
    if (user?.affiliateOwnership?.leadId) {
      loadAffiliationHistory();
    }
  }, [user?.affiliateOwnership?.leadId]);

  // 비밀번호 초기화
  const handleResetPassword = async () => {
    if (!confirm(`비밀번호를 "${newPassword}"로 초기화하시겠습니까?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newPassword }),
      });

      const data = await response.json();
      if (data.ok) {
        alert(data.message || '비밀번호가 초기화되었습니다.');
        loadUserData(); // 비밀번호 이벤트 목록 새로고침
      } else {
        alert('비밀번호 초기화 실패: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to reset password:', error);
      alert('비밀번호 초기화 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 계정 잠금
  const handleLockAccount = async () => {
    const reason = prompt('잠금 사유를 입력하세요:');
    if (reason === null) return; // 취소

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: reason || '관리자에 의해 잠금' }),
      });

      const data = await response.json();
      if (data.ok) {
        alert('계정이 잠금되었습니다.');
        loadUserData();
      } else {
        alert('계정 잠금 실패: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to lock account:', error);
      alert('계정 잠금 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 계정 잠금 해제
  const handleUnlockAccount = async () => {
    if (!confirm('계정 잠금을 해제하시겠습니까?')) {
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/lock`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();
      if (data.ok) {
        alert('계정 잠금이 해제되었습니다.');
        loadUserData();
      } else {
        alert('계정 잠금 해제 실패: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to unlock account:', error);
      alert('계정 잠금 해제 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 온보딩 추가하기 (최근 여행에)
  const handleAddOnboarding = async () => {
    if (!user.trips || user.trips.length === 0) {
      alert('여행이 없어서 온보딩을 추가할 수 없습니다. 먼저 여행을 등록해주세요.');
      return;
    }

    const latestTrip = user.trips[0];
    await handleAddOnboardingToTrip(latestTrip.id);
  };

  // 여권 PNR 구글시트 동기화
  const handleSyncPassportPNR = async (tripId: number) => {
    if (!confirm('여권 PNR 정보를 구글시트에 동기화하시겠습니까?')) {
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/admin/passport-pnr/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tripId }),
      });

      const data = await response.json();
      if (data.ok) {
        showSuccess(`구글시트 동기화 완료! (${data.rowCount}개 행)`);
        if (data.spreadsheetUrl) {
          window.open(data.spreadsheetUrl, '_blank');
        }
        loadUserData(); // 사용자 정보 새로고침
      } else {
        showError(`동기화 실패: ${data.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('Failed to sync passport PNR:', error);
      showError('동기화 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 특정 여행에 온보딩 추가하기
  const handleAddOnboardingToTrip = async (tripId: number) => {
    if (!confirm('이 여행에 온보딩을 추가하시겠습니까? (크루즈닷AI 활성화)')) {
      return;
    }

    setIsProcessing(true);
    try {
      // 기존 여행 정보 가져오기
      const trip = user.trips?.find((t: any) => t.id === tripId);
      if (!trip) {
        alert('여행 정보를 찾을 수 없습니다.');
        setIsProcessing(false);
        return;
      }

      // API 요청 본문 구성 (기존 여행 정보 사용)
      const requestBody: any = {
        cruiseName: trip.cruiseName || '',
        startDate: trip.startDate || new Date().toISOString(),
        endDate: trip.endDate || new Date().toISOString(),
        companionType: trip.companionType || null,
        destination: Array.isArray(trip.destination) ? trip.destination : trip.destination ? [trip.destination] : [],
      };

      // productId가 있으면 추가 (없으면 null)
      if (trip.productId) {
        requestBody.productId = trip.productId;
      }

      const response = await fetch(`/api/admin/users/${userId}/trips/${tripId}/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      if (data.ok) {
        alert('온보딩이 추가되었습니다.');
        loadUserData(); // 사용자 정보 새로고침
      } else {
        alert('온보딩 추가 실패: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to add onboarding:', error);
      alert('온보딩 추가 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 여권정보 등록 (조건 없이 등록 가능 - 여권번호만 필수)
  const handleRegisterPassport = async () => {
    if (!passportForm.passportNo || passportForm.passportNo.trim() === '') {
      alert('여권번호를 입력해주세요.');
      return;
    }

    setIsProcessing(true);
    try {
      const url = editingTravelerId
        ? `/api/admin/customers/${userId}/passport`
        : `/api/admin/customers/${userId}/passport`;
      const method = editingTravelerId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...(editingTravelerId ? { travelerId: editingTravelerId } : {}),
          ...passportForm,
          reservationId: selectedReservationId,
        }),
      });

      const data = await response.json();
      if (data.ok) {
        // 모달 닫기
        setShowPassportModal(false);
        setPassportForm({
          korName: '',
          engGivenName: '',
          engSurname: '',
          passportNo: '',
          birthDate: '',
          expiryDate: '',
        });
        setSelectedReservationId(null);
        setEditingTravelerId(null);

        // 성공 메시지
        alert(data.message || (editingTravelerId ? '여권 정보가 수정되었습니다.' : '여권 정보가 등록되었습니다.'));

        // 사용자 정보 강제 새로고침
        await loadUserData();
      } else {
        alert((editingTravelerId ? '여권 수정' : '여권 등록') + ' 실패: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to register/update passport:', error);
      alert((editingTravelerId ? '여권 수정' : '여권 등록') + ' 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 여권/PNR 링크 생성 및 복사
  const handleCopyLink = async (mode: 'passport' | 'pnr') => {
    try {
      // 가장 최근 여행 찾기
      const latestTrip = user?.trips?.[0];
      if (!latestTrip) {
        alert('등록된 여행이 없습니다.');
        return;
      }

      const response = await fetch('/api/admin/passport-request/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, tripId: latestTrip.id }),
      });

      const data = await response.json();
      if (data.ok) {
        const link = mode === 'passport' ? data.passportLink : data.pnrLink;
        await navigator.clipboard.writeText(link);
        showSuccess(`${mode === 'passport' ? '여권' : 'PNR'} 등록 링크가 복사되었습니다.`);
      } else {
        showError('링크 생성 실패: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to copy link:', error);
      showError('링크 복사 중 오류가 발생했습니다.');
    }
  };

  // PNR(객실 배정) 모달 열기
  const handleOpenPnrModal = () => {
    // 가장 최근 여행 찾기
    const latestTrip = user?.trips?.[0];
    if (!latestTrip) {
      alert('등록된 여행이 없습니다.');
      return;
    }

    // 여행자 목록 구성
    const travelers: Array<{ travelerId: number; name: string; roomNumber: string }> = [];
    if (latestTrip.Reservation) {
      latestTrip.Reservation.forEach((res: any) => {
        if (res.Traveler) {
          res.Traveler.forEach((t: any) => {
            travelers.push({
              travelerId: t.id,
              name: t.korName || `${t.engGivenName || ''} ${t.engSurname || ''}`.trim() || '이름 없음',
              roomNumber: t.roomNumber ? String(t.roomNumber) : '',
            });
          });
        }
      });
    }

    if (travelers.length === 0) {
      alert('여행자 정보가 없습니다.');
      return;
    }

    setSelectedTripIdForPnr(latestTrip.id);
    setPnrForm(travelers);
    setShowPnrModal(true);
  };

  // PNR(객실 배정) 등록 제출
  const handleRegisterPnr = async () => {
    if (!selectedTripIdForPnr) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/pnr/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tripId: selectedTripIdForPnr,
          travelers: pnrForm.map(t => ({
            travelerId: t.travelerId,
            roomNumber: t.roomNumber // Group Number로 사용됨
          })),
        }),
      });

      const data = await response.json();
      if (data.ok) {
        setShowPnrModal(false);
        alert('객실 배정(그룹) 정보가 저장되었습니다.');
        loadUserData();
      } else {
        alert('저장 실패: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to register PNR:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 여권 정보 수정 모달 열기
  const handleEditPassport = (traveler: any) => {
    setEditingTravelerId(traveler.id);
    setPassportForm({
      korName: traveler.korName || '',
      engGivenName: traveler.engGivenName || '',
      engSurname: traveler.engSurname || '',
      passportNo: traveler.passportNo || '',
      birthDate: traveler.birthDate ? (typeof traveler.birthDate === 'string' ? traveler.birthDate : new Date(traveler.birthDate).toISOString().split('T')[0]) : '',
      expiryDate: traveler.expiryDate ? (typeof traveler.expiryDate === 'string' ? traveler.expiryDate : new Date(traveler.expiryDate).toISOString().split('T')[0]) : '',
    });
    setShowPassportModal(true);
  };

  // 세션 강제 종료
  const handleTerminateSession = async (sessionId: string) => {
    if (!confirm('이 세션을 강제 종료하시겠습니까?')) {
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/sessions/${sessionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();
      if (data.ok) {
        alert('세션이 강제 종료되었습니다.');
        loadSessions();
      } else {
        alert('세션 종료 실패: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to terminate session:', error);
      alert('세션 종료 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/customers')}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <FiArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">고객 상세 정보</h1>
              <p className="text-gray-600 mt-1">ID: {user.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowJourney(!showJourney);
                if (!showJourney && journeyHistory.length === 0) {
                  loadJourneyHistory();
                }
              }}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 flex items-center gap-2"
            >
              <FiFileText size={18} />
              {showJourney ? '여정 숨기기' : '고객 여정'}
            </button>
            <button
              onClick={() => {
                setShowAnalytics(!showAnalytics);
                if (!showAnalytics && !analytics) {
                  loadAnalytics();
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 flex items-center gap-2"
            >
              <FiBarChart2 size={18} />
              {showAnalytics ? '분석 숨기기' : '사용자 분석'}
            </button>
            <button
              onClick={() => {
                loadUserData();
                loadSessions();
                loadJourneyHistory();
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 flex items-center gap-2"
            >
              <FiRefreshCw size={18} />
              새로고침
            </button>
            <button
              onClick={handleDeleteUser}
              disabled={isProcessing}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 flex items-center gap-2 disabled:opacity-50"
            >
              <FiTrash2 size={18} />
              삭제
            </button>
          </div>
        </div>

        {/* 고객 여정 히스토리 섹션 */}
        {showJourney && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">🛤️ 고객 여정 히스토리</h2>
            {journeyHistory.length === 0 ? (
              <p className="text-gray-500">여정 기록이 없습니다.</p>
            ) : (
              <div className="space-y-4">
                {journeyHistory.map((journey, index) => (
                  <div
                    key={journey.id}
                    className="border-l-4 border-blue-500 pl-4 py-3 bg-gray-50 rounded-r-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                            {journey.fromGroup}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                            {journey.toGroup}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-medium">트리거:</span> {journey.triggerType}
                          {journey.triggerDescription && ` - ${journey.triggerDescription}`}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(journey.createdAt).toLocaleString('ko-KR')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 사용자 분석 섹션 */}
        {showAnalytics && analytics && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📊 사용자 상세 분석</h2>
            <div className="space-y-4">
              {/* AI 채팅 사용 */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-bold text-lg mb-2">💬 AI 채팅 사용</h3>
                <p>총 대화 횟수: {analytics.AI_채팅_사용?.총_대화_횟수 || 0}회</p>
                <p>총 메시지 수: {analytics.AI_채팅_사용?.총_메시지_수 || 0}개</p>
                <div className="mt-2 space-y-1">
                  <p className="text-sm">• 크루즈닷AI 가자: {analytics.AI_채팅_사용?.지니야_가자_검색?.총_횟수 || 0}회</p>
                  <p className="text-sm">• 크루즈닷AI 보여줘: {analytics.AI_채팅_사용?.지니야_보여줘_검색?.총_횟수 || 0}회</p>
                  <p className="text-sm">• 일반 검색: {analytics.AI_채팅_사용?.일반_검색?.총_횟수 || 0}회</p>
                </div>
              </div>

              {/* 가계부 사용 */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-bold text-lg mb-2">💰 가계부 사용</h3>
                <p>총 지출 항목: {analytics.가계부_사용?.총_지출_항목 || 0}개</p>
                <p>총 지출 금액: {analytics.가계부_사용?.총_지출_금액_원화?.toLocaleString() || 0}원</p>
                <p>추정 예산: {analytics.가계부_사용?.추정_예산_원화?.toLocaleString() || 0}원</p>
              </div>

              {/* 체크리스트 사용 */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-bold text-lg mb-2">✅ 체크리스트 사용</h3>
                <p>총 항목 수: {analytics.체크리스트_사용?.총_항목_수 || 0}개</p>
                <p>완료 항목 수: {analytics.체크리스트_사용?.완료_항목_수 || 0}개</p>
                <p>완료율: {analytics.체크리스트_사용?.완료율_퍼센트 || 0}%</p>
                <p>사용자 추가 항목: {analytics.체크리스트_사용?.사용자_추가_항목_수 || 0}개</p>
              </div>

              {/* 번역기 사용 */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-bold text-lg mb-2">🌐 번역기 사용</h3>
                <p>총 사용 횟수: {analytics.번역기_사용?.총_사용_횟수 || 0}회</p>
                {analytics.번역기_사용?.언어별_사용 && analytics.번역기_사용.언어별_사용.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-semibold">언어별 사용:</p>
                    {analytics.번역기_사용.언어별_사용.map((lang: any, idx: number) => (
                      <p key={idx} className="text-sm">• {lang.언어_쌍}: {lang.사용_횟수}회</p>
                    ))}
                  </div>
                )}
              </div>

              {/* 여행 지도 사용 */}
              {analytics.여행_지도_사용 && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-bold text-lg mb-2">🗺️ 여행 지도 사용</h3>
                  <p>저장된 여행 수: {analytics.여행_지도_사용.저장된_여행_수 || 0}개</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 왼쪽: 기본 정보 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 기본 정보 카드 */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">기본 정보</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-semibold text-gray-600">이름</label>
                  <div className="flex items-center gap-2">
                    <p className="text-lg text-gray-900">{user.name || '-'}</p>
                    {/* 여권 상태 뱃지 */}
                    {user.trips && user.trips.length > 0 && (() => {
                      const latestTrip = user.trips[0];
                      const reservation = latestTrip?.Reservation?.[0];
                      if (reservation) {
                        const totalPeople = reservation.totalPeople || 0;
                        const travelersWithPassport = reservation.Traveler?.filter((t: any) => t.passportNo)?.length || 0;
                        const missingCount = totalPeople - travelersWithPassport;
                        if (totalPeople === 0) {
                          return null; // 예상 인원이 없으면 표시 안 함
                        }
                        if (missingCount > 0) {
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded border border-yellow-300">
                              ⚠️ 여권 부족 ({missingCount}명 부족)
                            </span>
                          );
                        } else if (travelersWithPassport === totalPeople && totalPeople > 0) {
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded border border-green-300">
                              ✅ 여권 완료
                            </span>
                          );
                        }
                      }
                      return null;
                    })()}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">전화번호</label>
                  <p className="text-lg text-gray-900">{user.phone || '-'}</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-semibold text-gray-600">소속</label>
                    {user.affiliateOwnership?.leadId && affiliationHistory.length > 0 && (
                      <button
                        onClick={() => setShowAffiliationHistory(!showAffiliationHistory)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {showAffiliationHistory ? '이력 숨기기' : '변경 이력 보기'}
                      </button>
                    )}
                  </div>
                  {renderAffiliateOwnershipSection(user.affiliateOwnership)}

                  {/* 소속 변경 이력 */}
                  {showAffiliationHistory && affiliationHistory.length > 0 && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">소속 변경 이력</h4>
                      <div className="space-y-3">
                        {affiliationHistory.map((history) => (
                          <div key={history.id} className="text-xs border-l-2 border-blue-400 pl-3 py-2 bg-white rounded">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="font-medium text-gray-800 mb-1">{history.note}</div>
                                {history.metadata?.managerChange && (
                                  <div className="text-gray-600 mt-1">
                                    <span className="font-semibold">대리점장:</span>{' '}
                                    {history.metadata.managerChange.from.name} → {history.metadata.managerChange.to.name}
                                  </div>
                                )}
                                {history.metadata?.agentChange && (
                                  <div className="text-gray-600 mt-1">
                                    <span className="font-semibold">판매원:</span>{' '}
                                    {history.metadata.agentChange.from.name} → {history.metadata.agentChange.to.name}
                                  </div>
                                )}
                              </div>
                              <div className="text-gray-500 whitespace-nowrap">
                                {new Date(history.occurredAt).toLocaleString('ko-KR', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </div>
                            <div className="text-gray-400 mt-1">
                              변경자: {history.createdBy}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">이메일</label>
                  <p className="text-lg text-gray-900">{user.email || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">가입일</label>
                  <p className="text-lg text-gray-900">
                    {new Date(user.createdAt).toLocaleString('ko-KR')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">마지막 활동</label>
                  <p className="text-lg text-gray-900">
                    {user.lastActiveAt
                      ? new Date(user.lastActiveAt).toLocaleString('ko-KR')
                      : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">로그인 횟수</label>
                  <p className="text-lg text-gray-900">{user.loginCount}회</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">여행 횟수</label>
                  <p className="text-lg text-gray-900">{user.tripCount}회</p>
                </div>
              </div>
            </div>

            {/* 여권 정보 카드 */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">여권 정보</h2>
                <button
                  onClick={() => {
                    // 첫 번째 Reservation 찾기
                    let firstReservation: any = null;
                    if (user.trips && user.trips.length > 0) {
                      for (const trip of user.trips) {
                        if (trip.Reservation && trip.Reservation.length > 0) {
                          firstReservation = trip.Reservation[0];
                          break;
                        }
                      }
                    }
                    if (!firstReservation && (user as any).reservations && (user as any).reservations.length > 0) {
                      firstReservation = (user as any).reservations[0];
                    }

                    setSelectedReservationId(firstReservation?.id || null);
                    setEditingTravelerId(null);
                    setPassportForm({
                      korName: '',
                      engGivenName: '',
                      engSurname: '',
                      passportNo: '',
                      birthDate: '',
                      expiryDate: '',
                    });
                    setShowPassportModal(true);
                  }}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 flex items-center gap-1"
                >
                  <FiPlus size={14} />
                  여권 등록
                </button>
                <button
                  onClick={handleOpenPnrModal}
                  className="px-3 py-1.5 bg-purple-600 text-white text-sm font-semibold rounded hover:bg-purple-700 flex items-center gap-1 ml-2"
                >
                  <FiEdit size={14} />
                  객실 배정
                </button>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleCopyLink('passport')}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded hover:bg-gray-200 flex items-center gap-1"
                    title="여권 등록 링크 복사"
                  >
                    <FiCopy size={14} />
                    여권 링크
                  </button>
                  <button
                    onClick={() => handleCopyLink('pnr')}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded hover:bg-gray-200 flex items-center gap-1"
                    title="PNR(객실 배정) 링크 복사"
                  >
                    <FiLink size={14} />
                    PNR 링크
                  </button>
                </div>
              </div>
              {/* 모든 Reservation의 여권 정보 표시 */}
              {(() => {
                // 모든 trips의 모든 Reservation에서 Traveler 수집
                const allTravelers: any[] = [];
                const reservationMap = new Map<number, any>();

                // 모든 trips의 모든 Reservation에서 Traveler 수집
                if (user.trips && Array.isArray(user.trips) && user.trips.length > 0) {
                  user.trips.forEach((trip: any) => {
                    if (trip.Reservation && Array.isArray(trip.Reservation)) {
                      trip.Reservation.forEach((reservation: any) => {
                        if (reservation.Traveler && Array.isArray(reservation.Traveler)) {
                          reservation.Traveler.forEach((traveler: any) => {
                            allTravelers.push({
                              ...traveler,
                              reservationId: reservation.id,
                              tripId: trip.id,
                              cruiseName: trip.cruiseName,
                            });
                            if (!reservationMap.has(reservation.id)) {
                              reservationMap.set(reservation.id, reservation);
                            }
                          });
                        }
                      });
                    }
                  });
                }

                // user.reservations도 확인 (API에서 제공하는 경우)
                if ((user as any).reservations && Array.isArray((user as any).reservations)) {
                  (user as any).reservations.forEach((reservation: any) => {
                    if (reservation.Traveler && Array.isArray(reservation.Traveler)) {
                      reservation.Traveler.forEach((traveler: any) => {
                        // 중복 체크 (id로)
                        if (!allTravelers.find(t => t.id === traveler.id)) {
                          allTravelers.push({
                            ...traveler,
                            reservationId: reservation.id,
                            tripId: null,
                            cruiseName: null,
                          });
                          if (!reservationMap.has(reservation.id)) {
                            reservationMap.set(reservation.id, reservation);
                          }
                        }
                      });
                    }
                  });
                }

                // 디버깅 로그
                console.log('[Passport Info] Final result:', {
                  totalTravelers: allTravelers.length,
                  travelersWithPassport: allTravelers.filter(t => t.passportNo).length,
                  travelers: allTravelers.map(t => ({
                    id: t.id,
                    passportNo: t.passportNo,
                    korName: t.korName,
                    engSurname: t.engSurname,
                  })),
                });

                if (allTravelers.length === 0) {
                  // 여권 정보가 없으면 등록 버튼 표시
                  const firstReservation = Array.from(reservationMap.values())[0];
                  return (
                    <div className="text-center py-4 text-gray-500">
                      <p className="mb-2">등록된 여권 정보가 없습니다.</p>
                      {firstReservation ? (
                        <button
                          onClick={() => {
                            setSelectedReservationId(firstReservation.id);
                            setEditingTravelerId(null);
                            setPassportForm({
                              korName: '',
                              engGivenName: '',
                              engSurname: '',
                              passportNo: '',
                              birthDate: '',
                              expiryDate: '',
                            });
                            setShowPassportModal(true);
                          }}
                          className="px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700"
                        >
                          여권 등록하기
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedReservationId(null);
                            setEditingTravelerId(null);
                            setPassportForm({
                              korName: '',
                              engGivenName: '',
                              engSurname: '',
                              passportNo: '',
                              birthDate: '',
                              expiryDate: '',
                            });
                            setShowPassportModal(true);
                          }}
                          className="px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700"
                        >
                          여권 등록하기
                        </button>
                      )}
                    </div>
                  );
                }

                // 여권 정보가 있으면 표시
                return (
                  <div className="space-y-3">
                    {allTravelers.map((traveler: any, idx: number) => (
                      <div key={traveler.id || idx} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold text-gray-900">
                                {traveler.korName || `${traveler.engGivenName || ''} ${traveler.engSurname || ''}`.trim() || `동행인 ${idx + 1}`}
                              </span>
                              {traveler.passportNo ? (
                                <span className="text-green-600 text-xs font-medium px-2 py-0.5 bg-green-100 rounded">✅ 여권 입력됨</span>
                              ) : (
                                <span className="text-yellow-600 text-xs font-medium px-2 py-0.5 bg-yellow-100 rounded">⚠️ 여권 미입력</span>
                              )}
                            </div>
                            {traveler.cruiseName && (
                              <div className="text-xs text-gray-500 mb-1">여행: {traveler.cruiseName}</div>
                            )}
                            {traveler.passportNo ? (
                              <div className="text-sm text-gray-700 space-y-1">
                                <div><span className="font-medium">여권번호:</span> {traveler.passportNo}</div>
                                {traveler.korName && <div><span className="font-medium">한국 이름:</span> {traveler.korName}</div>}
                                {(traveler.engGivenName || traveler.engSurname) && (
                                  <div><span className="font-medium">영문 이름:</span> {traveler.engGivenName || ''} {traveler.engSurname || ''}</div>
                                )}
                                {traveler.birthDate && (
                                  <div><span className="font-medium">생년월일:</span> {typeof traveler.birthDate === 'string' ? traveler.birthDate : new Date(traveler.birthDate).toLocaleDateString('ko-KR')}</div>
                                )}
                                {traveler.expiryDate && (
                                  <div><span className="font-medium">만료일:</span> {typeof traveler.expiryDate === 'string' ? traveler.expiryDate : new Date(traveler.expiryDate).toLocaleDateString('ko-KR')}</div>
                                )}
                                {traveler.hasPassportImage && (
                                  <div className="mt-2">
                                    <button
                                      onClick={async () => {
                                        try {
                                          const res = await csrfFetch(`/api/admin/traveler/${traveler.id}/passport-link`);
                                          const data = await res.json();
                                          if (data.ok && data.url) {
                                            window.open(data.url, '_blank', 'noopener,noreferrer');
                                          } else {
                                            showError(data.message || '여권 이미지를 불러올 수 없습니다.');
                                          }
                                        } catch {
                                          showError('여권 이미지 불러오기 실패');
                                        }
                                      }}
                                      className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                                    >
                                      이미지 보기
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-400">여권 정보가 등록되지 않았습니다.</div>
                            )}
                          </div>
                          {traveler.passportNo && (
                            <button
                              onClick={() => {
                                if (traveler.reservationId) {
                                  setSelectedReservationId(traveler.reservationId);
                                }
                                handleEditPassport(traveler);
                              }}
                              className="px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 whitespace-nowrap"
                            >
                              수정
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* 여권 제출 정보 카드 */}
            {(user as any).passportSubmissions && (user as any).passportSubmissions.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">🛂 여권 제출 정보</h2>
                <div className="space-y-4">
                  {(user as any).passportSubmissions.map((submission: any) => (
                    <div key={submission.id} className="border border-gray-200 rounded-lg p-4 bg-green-50">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {submission.trip?.cruiseName || '여행 정보 없음'}
                          </h3>
                          {submission.submittedAt && (
                            <p className="text-sm text-gray-600">
                              제출일: {new Date(submission.submittedAt).toLocaleString('ko-KR')}
                            </p>
                          )}
                          {submission.tokenExpiresAt && (
                            <p className="text-sm text-gray-600">
                              링크 만료일: {new Date(submission.tokenExpiresAt).toLocaleString('ko-KR')}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {submission.isSubmitted ? (
                            <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded">
                              ✅ 제출 완료
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-semibold rounded">
                              ⏳ 대기 중
                            </span>
                          )}
                          {submission.driveFolderUrl && (
                            <a
                              href={submission.driveFolderUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 flex items-center gap-1"
                            >
                              <FiFileText size={14} />
                              구글 드라이브
                            </a>
                          )}
                        </div>
                      </div>
                      {submission.guests && submission.guests.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <h4 className="text-sm font-semibold text-gray-700">제출된 여권 정보:</h4>
                          {submission.guests.map((guest: any, idx: number) => (
                            <div key={guest.id || idx} className="bg-white rounded p-2 border border-green-200">
                              <div className="text-sm">
                                <div className="font-medium text-gray-900">
                                  그룹 {guest.groupNumber} - {guest.name}
                                </div>
                                <div className="text-gray-600 space-y-0.5 mt-1">
                                  {guest.phone && <div>연락처: {guest.phone}</div>}
                                  {guest.passportNumber && <div>여권번호: {guest.passportNumber}</div>}
                                  {guest.nationality && <div>국적: {guest.nationality}</div>}
                                  {guest.dateOfBirth && (
                                    <div>생년월일: {new Date(guest.dateOfBirth).toLocaleDateString('ko-KR')}</div>
                                  )}
                                  {guest.passportExpiryDate && (
                                    <div>만료일: {new Date(guest.passportExpiryDate).toLocaleDateString('ko-KR')}</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 비밀번호 이력 카드 */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">비밀번호 변경 이력</h2>
              {user.passwordEvents && user.passwordEvents.length > 0 ? (
                <div className="space-y-2">
                  {user.passwordEvents.map((event) => (
                    <div
                      key={event.id}
                      className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900">
                          {event.from} → {event.to}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(event.createdAt).toLocaleString('ko-KR')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{event.reason}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">비밀번호 변경 이력이 없습니다.</p>
              )}
            </div>

            {/* 여행 목록 카드 */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">여행 목록</h2>
                {user.trips && user.trips.length > 0 && (
                  <button
                    onClick={handleAddOnboarding}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                  >
                    <span>+</span>
                    온보딩 추가하기
                  </button>
                )}
              </div>
              {user.trips && user.trips.length > 0 ? (
                <div className="space-y-3">
                  {user.trips.map((trip: any) => (
                    <div
                      key={trip.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-gray-900">
                              {trip.cruiseName || '크루즈명 없음'}
                            </span>
                            {trip.id === user.trips[0]?.id && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                                최근 여행
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>
                              <span className="font-medium">목적지:</span>{' '}
                              {Array.isArray(trip.destination)
                                ? trip.destination.join(', ')
                                : trip.destination || '-'}
                            </p>
                            {trip.startDate && trip.endDate && (
                              <p>
                                <span className="font-medium">기간:</span>{' '}
                                {new Date(trip.startDate).toLocaleDateString('ko-KR')} ~{' '}
                                {new Date(trip.endDate).toLocaleDateString('ko-KR')}
                              </p>
                            )}
                            {trip.companionType && (
                              <p>
                                <span className="font-medium">동반자:</span> {trip.companionType}
                              </p>
                            )}
                            {/* 여권 상태 및 동행인 정보 */}
                            {trip.Reservation?.[0] && (() => {
                              const reservation = trip.Reservation[0];
                              const totalPeople = reservation.totalPeople || 0;
                              const travelers = reservation.Traveler || [];
                              const travelersWithPassport = travelers.filter((t: any) => t.passportNo)?.length || 0;
                              const missingCount = totalPeople - travelersWithPassport;

                              if (totalPeople === 0) return null; // 예상 인원이 없으면 표시 안 함

                              return (
                                <div className="mt-2 space-y-2">
                                  {/* 여권 상태 */}
                                  {missingCount > 0 ? (
                                    <div className="p-2 bg-yellow-50 border border-yellow-300 rounded text-xs">
                                      <p className="font-semibold text-yellow-800">
                                        ⚠️ 여권 부족: 예상 {totalPeople}명 중 {travelersWithPassport}명만 입력됨 (부족: {missingCount}명)
                                      </p>
                                    </div>
                                  ) : travelersWithPassport === totalPeople && totalPeople > 0 ? (
                                    <div className="p-2 bg-green-50 border border-green-300 rounded text-xs">
                                      <p className="font-semibold text-green-800">
                                        ✅ 여권 완료: {totalPeople}명 모두 입력됨
                                      </p>
                                    </div>
                                  ) : null}

                                  {/* 동행인 정보 */}
                                  {travelers.length > 0 && (
                                    <div className="p-2 bg-gray-50 border border-gray-200 rounded text-xs">
                                      <div className="flex items-center justify-between mb-1">
                                        <p className="font-semibold text-gray-800">동행인 정보 ({travelers.length}명)</p>
                                        <button
                                          onClick={() => {
                                            setSelectedReservationId(reservation.id);
                                            setShowPassportModal(true);
                                          }}
                                          className="px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700"
                                        >
                                          + 여권 등록
                                        </button>
                                      </div>
                                      <div className="space-y-2">
                                        {travelers.map((traveler: any, idx: number) => (
                                          <div key={traveler.id || idx} className="text-gray-700 border border-gray-300 rounded p-2 bg-white">
                                            <div className="flex items-start justify-between gap-2">
                                              <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                  <span className="font-semibold text-gray-900">
                                                    {traveler.korName || `${traveler.engGivenName || ''} ${traveler.engSurname || ''}`.trim() || `동행인 ${idx + 1}`}
                                                  </span>
                                                  {traveler.passportNo ? (
                                                    <span className="text-green-600 text-xs font-medium">✅ 여권 입력됨</span>
                                                  ) : (
                                                    <span className="text-yellow-600 text-xs font-medium">⚠️ 여권 미입력</span>
                                                  )}
                                                </div>
                                                {traveler.passportNo ? (
                                                  <div className="text-xs text-gray-600 space-y-0.5">
                                                    <div><span className="font-medium">여권번호:</span> {traveler.passportNo}</div>
                                                    {traveler.korName && <div><span className="font-medium">한국 이름:</span> {traveler.korName}</div>}
                                                    {(traveler.engGivenName || traveler.engSurname) && (
                                                      <div><span className="font-medium">영문 이름:</span> {traveler.engGivenName || ''} {traveler.engSurname || ''}</div>
                                                    )}
                                                    {traveler.birthDate && (
                                                      <div><span className="font-medium">생년월일:</span> {typeof traveler.birthDate === 'string' ? traveler.birthDate : new Date(traveler.birthDate).toLocaleDateString('ko-KR')}</div>
                                                    )}
                                                    {traveler.expiryDate && (
                                                      <div><span className="font-medium">만료일:</span> {typeof traveler.expiryDate === 'string' ? traveler.expiryDate : new Date(traveler.expiryDate).toLocaleDateString('ko-KR')}</div>
                                                    )}
                                                  </div>
                                                ) : (
                                                  <div className="text-xs text-gray-400">여권 정보가 등록되지 않았습니다.</div>
                                                )}
                                              </div>
                                              {traveler.passportNo && (
                                                <button
                                                  onClick={() => {
                                                    setSelectedReservationId(reservation.id);
                                                    handleEditPassport(traveler);
                                                  }}
                                                  className="px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 whitespace-nowrap"
                                                >
                                                  수정
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {travelers.length === 0 && (
                                    <div className="p-2 bg-gray-50 border border-gray-200 rounded text-xs">
                                      <div className="flex items-center justify-between">
                                        <p className="text-gray-600">동행인 정보가 없습니다.</p>
                                        <button
                                          onClick={() => {
                                            setSelectedReservationId(reservation.id);
                                            setShowPassportModal(true);
                                          }}
                                          className="px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700"
                                        >
                                          + 여권 등록
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                            {/* APIS 정보 */}
                            {(trip.googleFolderId || trip.spreadsheetId) && (
                              <div className="mt-2 pt-2 border-t border-blue-200 bg-blue-50 rounded p-2">
                                <div className="text-xs text-blue-600 font-semibold mb-1">APIS 정보</div>
                                <div className="space-y-1 text-xs">
                                  {trip.productCode && (
                                    <div className="text-gray-700">
                                      <span className="font-semibold">상품 코드:</span> {trip.productCode}
                                    </div>
                                  )}
                                  {trip.shipName && (
                                    <div className="text-gray-700">
                                      <span className="font-semibold">선박명:</span> {trip.shipName}
                                    </div>
                                  )}
                                  {trip.googleFolderId && (
                                    <div>
                                      <a
                                        href={`https://drive.google.com/drive/folders/${trip.googleFolderId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline"
                                      >
                                        <FiFileText size={12} />
                                        APIS 폴더 열기
                                      </a>
                                    </div>
                                  )}
                                  {trip.spreadsheetId && (
                                    <div>
                                      <a
                                        href={`https://docs.google.com/spreadsheets/d/${trip.spreadsheetId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline"
                                      >
                                        <FiFileText size={12} />
                                        APIS 시트 열기
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleSyncPassportPNR(trip.id)}
                            disabled={isProcessing}
                            className="px-3 py-1.5 bg-green-600 text-white text-sm font-semibold rounded hover:bg-green-700 flex items-center gap-1 disabled:opacity-50"
                          >
                            <FiFileText size={14} />
                            여권 PNR 동기화
                          </button>
                          {trip.id === user.trips[0]?.id && (
                            <button
                              onClick={() => handleAddOnboardingToTrip(trip.id)}
                              disabled={isProcessing}
                              className="px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50"
                            >
                              <span>+</span>
                              온보딩 추가
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">등록된 여행이 없습니다.</p>
                  <button
                    onClick={handleAddOnboarding}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                  >
                    온보딩 추가하기
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 오른쪽: 보안 관리 */}
          <div className="space-y-6">
            {/* 보안 관리 카드 */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">보안 관리</h2>

              {/* 계정 상태 */}
              <div className="mb-6 p-4 rounded-lg border-2">
                {user.isLocked ? (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FiLock className="text-red-600" size={20} />
                      <span className="font-bold text-red-600">계정 잠금됨</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      잠금 시각: {user.lockedAt ? new Date(user.lockedAt).toLocaleString('ko-KR') : '-'}
                    </p>
                    {user.lockedReason && (
                      <p className="text-sm text-gray-600 mt-1">사유: {user.lockedReason}</p>
                    )}
                    <button
                      onClick={handleUnlockAccount}
                      disabled={isProcessing}
                      className="mt-3 w-full px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <FiUnlock size={18} />
                      잠금 해제
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FiUnlock className="text-green-600" size={20} />
                      <span className="font-bold text-green-600">계정 정상</span>
                    </div>
                    <button
                      onClick={handleLockAccount}
                      disabled={isProcessing}
                      className="mt-3 w-full px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <FiLock size={18} />
                      계정 잠금
                    </button>
                  </div>
                )}
              </div>

              {/* 비밀번호 초기화 */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  비밀번호 초기화
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="3800"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleResetPassword}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                  >
                    <FiKey size={18} />
                    초기화
                  </button>
                </div>
              </div>

              {/* 문자 보내기 */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  빠른 메시지
                </label>
                <button
                  onClick={() => setShowSmsModal(true)}
                  disabled={!user.phone}
                  className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiMessageSquare size={18} />
                  문자 보내기
                </button>
                {!user.phone && (
                  <p className="mt-1 text-xs text-gray-500">* 전화번호가 없어 문자를 보낼 수 없습니다.</p>
                )}
              </div>
            </div>

            {/* 세션 관리 카드 */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">활성 세션</h2>
              {sessions.length > 0 ? (
                <div className="space-y-2">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-mono text-gray-600">
                          {session.id.substring(0, 12)}...
                        </span>
                        <button
                          onClick={() => handleTerminateSession(session.id)}
                          disabled={isProcessing}
                          className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm font-semibold hover:bg-red-200 flex items-center gap-1 disabled:opacity-50"
                        >
                          <FiLogOut size={14} />
                          종료
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">
                        생성: {new Date(session.createdAt).toLocaleString('ko-KR')}
                      </p>
                      {session.expiresAt && (
                        <p className="text-xs text-gray-500">
                          만료: {new Date(session.expiresAt).toLocaleString('ko-KR')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">활성 세션이 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 여권정보 등록 모달 */}
      {showPassportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingTravelerId ? '여권정보 수정' : '여권정보 등록'}
                </h2>
                <button
                  onClick={() => {
                    setShowPassportModal(false);
                    setPassportForm({
                      korName: '',
                      engGivenName: '',
                      engSurname: '',
                      passportNo: '',
                      birthDate: '',
                      expiryDate: '',
                    });
                    setSelectedReservationId(null);
                    setEditingTravelerId(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    한국 이름
                  </label>
                  <input
                    type="text"
                    value={passportForm.korName}
                    onChange={(e) => setPassportForm({ ...passportForm, korName: e.target.value })}
                    placeholder="홍길동 (선택사항)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      영문 이름 (Given Name)
                    </label>
                    <input
                      type="text"
                      value={passportForm.engGivenName}
                      onChange={(e) => setPassportForm({ ...passportForm, engGivenName: e.target.value })}
                      placeholder="Gildong (선택사항)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      영문 성 (Surname)
                    </label>
                    <input
                      type="text"
                      value={passportForm.engSurname}
                      onChange={(e) => setPassportForm({ ...passportForm, engSurname: e.target.value })}
                      placeholder="Hong (선택사항)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    여권번호 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={passportForm.passportNo}
                    onChange={(e) => setPassportForm({ ...passportForm, passportNo: e.target.value })}
                    placeholder="M12345678"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      생년월일
                    </label>
                    <input
                      type="date"
                      value={passportForm.birthDate}
                      onChange={(e) => setPassportForm({ ...passportForm, birthDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      만료일
                    </label>
                    <input
                      type="date"
                      value={passportForm.expiryDate}
                      onChange={(e) => setPassportForm({ ...passportForm, expiryDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleRegisterPassport}
                    disabled={isProcessing}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isProcessing ? (editingTravelerId ? '수정 중...' : '등록 중...') : (editingTravelerId ? '수정하기' : '등록하기')}
                  </button>
                  <button
                    onClick={() => {
                      setShowPassportModal(false);
                      setPassportForm({
                        korName: '',
                        engGivenName: '',
                        engSurname: '',
                        passportNo: '',
                        birthDate: '',
                        expiryDate: '',
                      });
                      setSelectedReservationId(null);
                      setEditingTravelerId(null);
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* PNR(객실 배정) 모달 */}
      {showPnrModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">객실 배정 (그룹 설정)</h2>
                <button
                  onClick={() => setShowPnrModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800 mb-4">
                  <p className="font-bold mb-1">💡 그룹 번호 안내</p>
                  <p>같은 객실을 사용하는 인원끼리 <strong>같은 번호</strong>를 입력해주세요.</p>
                  <p>(예: 부부 2명은 모두 &apos;1&apos;, 자녀 2명은 모두 &apos;2&apos;)</p>
                </div>

                {pnrForm.map((item, index) => (
                  <div key={item.travelerId} className="flex items-center justify-between gap-4 p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-900 flex-1">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">그룹 번호:</span>
                      <input
                        type="number"
                        min="1"
                        value={item.roomNumber}
                        onChange={(e) => {
                          const newForm = [...pnrForm];
                          newForm[index].roomNumber = e.target.value;
                          setPnrForm(newForm);
                        }}
                        placeholder="1"
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
                      />
                    </div>
                  </div>
                ))}

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleRegisterPnr}
                    disabled={isProcessing}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50"
                  >
                    {isProcessing ? '저장 중...' : '저장하기'}
                  </button>
                  <button
                    onClick={() => setShowPnrModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SMS 보내기 모달 */}
      {showSmsModal && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FiMessageSquare className="text-emerald-600" />
                문자 보내기
              </h3>
              <button
                onClick={() => {
                  setShowSmsModal(false);
                  setSmsContent('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="text-xl" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">받는 사람:</span>{' '}
                  {user.name || '고객'} ({user.phone})
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  메시지 내용
                </label>
                <textarea
                  value={smsContent}
                  onChange={(e) => setSmsContent(e.target.value)}
                  rows={5}
                  placeholder="문자 내용을 입력하세요..."
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {smsContent.length}자 / 90자 이상이면 LMS로 발송됩니다
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => {
                  setShowSmsModal(false);
                  setSmsContent('');
                }}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                disabled={sendingSms}
              >
                취소
              </button>
              <button
                onClick={handleSendSms}
                disabled={sendingSms || !smsContent.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white shadow hover:bg-emerald-700 disabled:bg-emerald-300"
              >
                {sendingSms ? (
                  <>
                    <FiLoader className="animate-spin" />
                    발송 중...
                  </>
                ) : (
                  <>
                    <FiSend />
                    발송하기
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



