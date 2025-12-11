'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    FiRefreshCw,
    FiSearch,
    FiUser,
    FiPhone,
    FiMessageSquare,
    FiCalendar,
    FiFilter,
    FiTrash2,
    FiLink,
    FiCopy,
    FiExternalLink,
} from 'react-icons/fi';
import { showError, showSuccess } from '@/components/ui/Toast';
import B2BProspectDetailModal from '@/components/admin/B2BProspectDetailModal';

interface B2BProspect {
    id: number;
    customerName: string | null;
    customerPhone: string | null;
    status: string;
    source: string;
    notes: string | null;
    createdAt: string;
    manager: {
        id: number;
        displayName: string | null;
        affiliateCode: string | null;
    } | null;
}

interface SystemConsultation {
    id: number;
    name: string;
    phone: string;
    message: string | null;
    status: string;
    createdAt: string;
    manager: {
        id: number;
        displayName: string | null;
        affiliateCode: string | null;
    } | null;
    agent: {
        id: number;
        displayName: string | null;
        affiliateCode: string | null;
    } | null;
}

export default function B2BProspectsPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'B2B' | 'SYSTEM'>('B2B');

    // B2B 링크 URLs (Hydration 오류 방지)
    const [b2bLandingUrl, setB2bLandingUrl] = useState<string>('');
    const [trialDashboardUrl, setTrialDashboardUrl] = useState<string>('');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setB2bLandingUrl(`${window.location.origin}/b2b`);
            setTrialDashboardUrl(`${window.location.origin}/trial/dashboard`);
        }
    }, []);

    const copyToClipboard = (text: string, label: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            showSuccess(`${label} 링크가 복사되었습니다.`);
        });
    };

    // B2B State
    const [prospects, setProspects] = useState<B2BProspect[]>([]);
    const [loadingB2B, setLoadingB2B] = useState(true);
    const [filterManagerId, setFilterManagerId] = useState<string>('ALL'); // 대리점장 필터
    const [search, setSearch] = useState('');
    const [selectedProspects, setSelectedProspects] = useState<Set<number>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);

    // System Consultation State
    const [consultations, setConsultations] = useState<SystemConsultation[]>([]);
    const [loadingSystem, setLoadingSystem] = useState(true);
    const [systemSearch, setSystemSearch] = useState('');
    const [selectedConsultations, setSelectedConsultations] = useState<Set<number>>(new Set());

    // DB Assignment State
    const [managers, setManagers] = useState<any[]>([]);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedManagerId, setSelectedManagerId] = useState<string>('');
    const [isAssigning, setIsAssigning] = useState(false);
    const [isRecalling, setIsRecalling] = useState(false);

    // Detail Modal State
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedProspectId, setSelectedProspectId] = useState<number | null>(null);
    const [selectedProspectType, setSelectedProspectType] = useState<'lead' | 'consultation'>('lead');

    useEffect(() => {
        loadManagers();
    }, []);

    const loadManagers = async () => {
        try {
            const res = await fetch('/api/admin/affiliate/profiles?type=BRANCH_MANAGER');
            const json = await res.json();
            if (json.ok) {
                setManagers(json.profiles || []);
            }
        } catch (error) {
            console.error('Failed to load managers:', error);
        }
    };

    const loadProspects = useCallback(async () => {
        try {
            setLoadingB2B(true);
            console.log('[B2B Prospects] Loading prospects...');
            const res = await fetch('/api/admin/affiliate/leads?source=b2b&limit=100');
            const json = await res.json();
            console.log('[B2B Prospects] API Response:', json);

            if (json.ok) {
                console.log('[B2B Prospects] Leads count:', json.leads?.length);
                setProspects(json.leads || []);
                setSelectedProspects(new Set());
            } else {
                console.error('[B2B Prospects] API Error:', json.message);
                showError(json.message || '데이터를 불러오는데 실패했습니다.');
            }
        } catch (error) {
            console.error('[B2B Prospects] Failed to load prospects:', error);
            showError('데이터 로드 중 오류가 발생했습니다.');
        } finally {
            setLoadingB2B(false);
        }
    }, []);

    const loadSystemConsultations = useCallback(async () => {
        try {
            setLoadingSystem(true);
            const res = await fetch('/api/system-inquiries');
            const json = await res.json();

            if (json.ok) {
                setConsultations(json.inquiries || []);
                setSelectedConsultations(new Set());
            } else {
                showError(json.message || '데이터를 불러오는데 실패했습니다.');
            }
        } catch (error) {
            console.error('Failed to load system consultations:', error);
            showError('데이터 로드 중 오류가 발생했습니다.');
        } finally {
            setLoadingSystem(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'B2B') {
            loadProspects();
        } else {
            loadSystemConsultations();
        }
    }, [activeTab, loadProspects, loadSystemConsultations]);

    const getSourceBadge = (source: string) => {
        switch (source) {
            case 'test-guide':
            case 'B2B_INFLOW':
            case 'TRIAL_DASHBOARD':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        B2B 유입
                    </span>
                );
            case 'B2B_LANDING':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        파트너 B2B 유입
                    </span>
                );
            case 'B2B_LANDING_ADMIN':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        본사 B2B 유입
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {source}
                    </span>
                );
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'NEW':
            case '신규':
                return <span className="text-blue-600 font-medium">신규</span>;
            case 'CONTACTED':
            case '연락됨':
                return <span className="text-yellow-600 font-medium">연락됨</span>;
            case 'CONVERTED':
            case '전환됨':
                return <span className="text-green-600 font-medium">전환됨</span>;
            case 'LOST':
            case '이탈':
                return <span className="text-red-600 font-medium">이탈</span>;
            default:
                return <span className="text-gray-600">{status}</span>;
        }
    };

    const filteredProspects = prospects.filter(p => {
        // 대리점장 필터
        if (filterManagerId === 'NONE' && p.manager !== null) return false;
        if (filterManagerId !== 'ALL' && filterManagerId !== 'NONE' && p.manager?.id !== parseInt(filterManagerId)) return false;

        if (search) {
            const query = search.toLowerCase();
            return (
                p.customerName?.toLowerCase().includes(query) ||
                p.customerPhone?.includes(query) ||
                p.manager?.displayName?.toLowerCase().includes(query)
            );
        }
        return true;
    });

    const filteredConsultations = consultations.filter(c => {
        // 대리점장 필터
        if (filterManagerId === 'NONE' && c.manager !== null) return false;
        if (filterManagerId !== 'ALL' && filterManagerId !== 'NONE' && c.manager?.id !== parseInt(filterManagerId)) return false;

        if (systemSearch) {
            const query = systemSearch.toLowerCase();
            return (
                c.name?.toLowerCase().includes(query) ||
                c.phone?.includes(query) ||
                c.manager?.displayName?.toLowerCase().includes(query)
            );
        }
        return true;
    });

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (activeTab === 'B2B') {
            if (e.target.checked) {
                setSelectedProspects(new Set(filteredProspects.map(p => p.id)));
            } else {
                setSelectedProspects(new Set());
            }
        } else {
            if (e.target.checked) {
                setSelectedConsultations(new Set(filteredConsultations.map(c => c.id)));
            } else {
                setSelectedConsultations(new Set());
            }
        }
    };

    const handleSelectRow = (id: number, checked: boolean) => {
        if (activeTab === 'B2B') {
            const newSelected = new Set(selectedProspects);
            if (checked) newSelected.add(id);
            else newSelected.delete(id);
            setSelectedProspects(newSelected);
        } else {
            const newSelected = new Set(selectedConsultations);
            if (checked) newSelected.add(id);
            else newSelected.delete(id);
            setSelectedConsultations(newSelected);
        }
    };

    const handleDeleteSelected = async () => {
        if (activeTab === 'B2B') {
            if (selectedProspects.size === 0) {
                alert('삭제할 항목을 선택해주세요.');
                return;
            }

            if (!confirm(`선택한 ${selectedProspects.size}명의 고객 정보를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;

            setIsDeleting(true);
            try {
                const deletePromises = Array.from(selectedProspects).map(id =>
                    fetch(`/api/admin/affiliate/leads/${id}`, { method: 'DELETE' })
                );

                await Promise.all(deletePromises);

                alert('선택한 항목이 삭제되었습니다.');
                loadProspects();
            } catch (error) {
                console.error('Error deleting prospects:', error);
                alert('삭제 중 오류가 발생했습니다.');
            } finally {
                setIsDeleting(false);
            }
        } else {
            // 시스템 상담 신청 삭제
            if (selectedConsultations.size === 0) {
                alert('삭제할 항목을 선택해주세요.');
                return;
            }

            if (!confirm(`선택한 ${selectedConsultations.size}명의 상담 신청을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;

            setIsDeleting(true);
            try {
                const deletePromises = Array.from(selectedConsultations).map(id =>
                    fetch(`/api/system-inquiries/${id}`, { method: 'DELETE' })
                );

                await Promise.all(deletePromises);

                alert('선택한 항목이 삭제되었습니다.');
                loadSystemConsultations();
            } catch (error) {
                console.error('Error deleting consultations:', error);
                alert('삭제 중 오류가 발생했습니다.');
            } finally {
                setIsDeleting(false);
            }
        }
    };

    const handleExtendTrial = async (leadId: number, currentName: string) => {
        if (!confirm(`${currentName}님의 무료 체험 기간을 3일 연장하시겠습니까?`)) return;

        try {
            const res = await fetch(`/api/admin/affiliate/leads/${leadId}/extend-trial`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ days: 3 }),
            });
            const data = await res.json();

            if (data.ok) {
                alert(data.message);
                loadProspects();
            } else {
                alert(data.message || '연장에 실패했습니다.');
            }
        } catch (error) {
            console.error('Error extending trial:', error);
            alert('오류가 발생했습니다.');
        }
    };

    // 시스템 상담 신청자 3일 연장 (전화번호로 User 찾아서 연장)
    const handleExtendTrialForConsultation = async (consultationId: number, name: string, phone: string) => {
        if (!confirm(`${name}님의 무료 체험 기간을 3일 연장하시겠습니까?`)) return;

        try {
            const res = await fetch(`/api/system-inquiries/${consultationId}/extend-trial`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ days: 3, phone }),
            });
            const data = await res.json();

            if (data.ok) {
                alert(data.message);
                loadSystemConsultations();
            } else {
                alert(data.message || data.error || '연장에 실패했습니다.');
            }
        } catch (error) {
            console.error('Error extending trial:', error);
            alert('오류가 발생했습니다.');
        }
    };

    const handleAssign = async () => {
        if (!selectedManagerId) {
            showError('대리점장을 선택해주세요.');
            return;
        }

        setIsAssigning(true);
        try {
            const leadIds = activeTab === 'B2B'
                ? Array.from(selectedProspects)
                : Array.from(selectedConsultations);

            const type = activeTab === 'B2B' ? 'lead' : 'consultation';

            const res = await fetch('/api/admin/affiliate/leads/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    leadIds,
                    managerId: selectedManagerId,
                    type
                }),
            });

            const json = await res.json();
            if (json.ok) {
                alert('DB가 성공적으로 전송되었습니다.');
                setIsAssignModalOpen(false);
                setSelectedManagerId('');
                if (activeTab === 'B2B') loadProspects();
                else loadSystemConsultations();
            } else {
                showError(json.error || 'DB 전송에 실패했습니다.');
            }
        } catch (error) {
            console.error('Assign error:', error);
            showError('오류가 발생했습니다.');
        } finally {
            setIsAssigning(false);
        }
    };

    const handleRecall = async () => {
        const selectedCount = activeTab === 'B2B' ? selectedProspects.size : selectedConsultations.size;
        if (selectedCount === 0) {
            showError('회수할 항목을 선택해주세요.');
            return;
        }

        if (!confirm(`선택한 ${selectedCount}개의 DB를 회수하시겠습니까?`)) return;

        setIsRecalling(true);
        try {
            const leadIds = activeTab === 'B2B'
                ? Array.from(selectedProspects)
                : Array.from(selectedConsultations);

            const type = activeTab === 'B2B' ? 'lead' : 'consultation';

            const res = await fetch('/api/admin/affiliate/leads/assign', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    leadIds,
                    type
                }),
            });

            const json = await res.json();
            if (json.ok) {
                alert('DB가 성공적으로 회수되었습니다.');
                if (activeTab === 'B2B') loadProspects();
                else loadSystemConsultations();
            } else {
                showError(json.error || 'DB 회수에 실패했습니다.');
            }
        } catch (error) {
            console.error('Recall error:', error);
            showError('오류가 발생했습니다.');
        } finally {
            setIsRecalling(false);
        }
    };

    const selectedCount = activeTab === 'B2B' ? selectedProspects.size : selectedConsultations.size;
    const allSelected = activeTab === 'B2B'
        ? (filteredProspects.length > 0 && selectedProspects.size === filteredProspects.length)
        : (filteredConsultations.length > 0 && selectedConsultations.size === filteredConsultations.length);
    const someSelected = activeTab === 'B2B'
        ? (selectedProspects.size > 0 && selectedProspects.size < filteredProspects.length)
        : (selectedConsultations.size > 0 && selectedConsultations.size < filteredConsultations.length);

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">B2B 잠재고객 관리</h1>
                    <p className="text-gray-500 mt-1">3일 무료체험 유입 및 시스템 상담 신청 고객을 관리합니다.</p>
                </div>
                <div className="flex items-center gap-2">
                    {selectedCount > 0 && (
                        <>
                            <button
                                onClick={() => setIsAssignModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                            >
                                <FiUser />
                                DB 보내기 ({selectedCount})
                            </button>
                            <button
                                onClick={handleRecall}
                                disabled={isRecalling}
                                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                                <FiRefreshCw className={isRecalling ? 'animate-spin' : ''} />
                                회수 ({selectedCount})
                            </button>
                        </>
                    )}
                    {selectedCount > 0 && (
                        <button
                            onClick={handleDeleteSelected}
                            disabled={isDeleting}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            <FiTrash2 />
                            {isDeleting ? '삭제 중...' : `선택 삭제 (${selectedCount})`}
                        </button>
                    )}
                    <button
                        onClick={activeTab === 'B2B' ? loadProspects : loadSystemConsultations}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium transition-colors"
                    >
                        <FiRefreshCw className={(activeTab === 'B2B' ? loadingB2B : loadingSystem) ? 'animate-spin' : ''} />
                        새로고침
                    </button>
                </div>
            </div>

            {/* B2B 유입 링크 섹션 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <FiLink className="text-blue-600 w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">B2B 유입 링크</h2>
                        <p className="text-sm text-gray-500">본사 B2B 랜딩페이지와 체험 대시보드 링크를 복사하여 사용하세요.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 본사 B2B 랜딩페이지 링크 */}
                    <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-green-800">본사 B2B 유입 랜딩페이지</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">소스: B2B_LANDING_ADMIN</span>
                        </div>
                        <p className="text-xs text-green-600 mb-3">이 링크를 통해 유입된 고객은 '본사 B2B 유입'으로 분류됩니다.</p>
                        <div className="flex items-center gap-2 p-2 bg-white rounded border border-green-200 mb-3">
                            <code className="flex-1 text-xs text-gray-600 truncate">{b2bLandingUrl || '로딩 중...'}</code>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => copyToClipboard(b2bLandingUrl, '본사 B2B 랜딩페이지')}
                                disabled={!b2bLandingUrl}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                <FiCopy className="w-4 h-4" />
                                링크 복사
                            </button>
                            <a
                                href={b2bLandingUrl || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors ${!b2bLandingUrl ? 'pointer-events-none opacity-50' : ''}`}
                            >
                                <FiExternalLink className="w-4 h-4" />
                                미리보기
                            </a>
                        </div>
                    </div>

                    {/* 체험 대시보드 링크 */}
                    <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-blue-800">체험 대시보드</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">신청 후 리다이렉트</span>
                        </div>
                        <p className="text-xs text-blue-600 mb-3">이름/연락처 입력 후 이동되는 3일 무료체험 대시보드입니다.</p>
                        <div className="flex items-center gap-2 p-2 bg-white rounded border border-blue-200 mb-3">
                            <code className="flex-1 text-xs text-gray-600 truncate">{trialDashboardUrl || '로딩 중...'}</code>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => copyToClipboard(trialDashboardUrl, '체험 대시보드')}
                                disabled={!trialDashboardUrl}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                <FiCopy className="w-4 h-4" />
                                링크 복사
                            </button>
                            <a
                                href={trialDashboardUrl || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors ${!trialDashboardUrl ? 'pointer-events-none opacity-50' : ''}`}
                            >
                                <FiExternalLink className="w-4 h-4" />
                                미리보기
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-gray-200 mb-6">
                <button
                    onClick={() => setActiveTab('B2B')}
                    className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'B2B'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                >
                    B2B 유입 (잠재고객)
                </button>
                <button
                    onClick={() => setActiveTab('SYSTEM')}
                    className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'SYSTEM'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                >
                    시스템 상담 신청
                </button>
            </div>

            {activeTab === 'B2B' ? (
                <>
                    {/* B2B Filters & Search */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
                        <div className="flex flex-col md:flex-row gap-4 justify-between">
                            {/* 대리점장 필터 드롭다운 */}
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                                    <FiFilter className="inline mr-1" />
                                    대리점장 필터:
                                </label>
                                <select
                                    value={filterManagerId}
                                    onChange={(e) => setFilterManagerId(e.target.value)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none min-w-[180px]"
                                >
                                    <option value="ALL">전체 보기</option>
                                    <option value="NONE">본사 유입 (미배정)</option>
                                    {managers.map((manager) => (
                                        <option key={manager.id} value={manager.id}>
                                            {manager.displayName} ({manager.affiliateCode})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="relative w-full md:w-64">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="이름, 연락처, 담당자 검색"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* B2B Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse table-fixed">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-10">
                                            <input
                                                type="checkbox"
                                                checked={allSelected}
                                                ref={(input) => {
                                                    if (input) input.indeterminate = someSelected;
                                                }}
                                                onChange={handleSelectAll}
                                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                        </th>
                                        <th className="px-3 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">구분</th>
                                        <th className="px-3 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-40">고객 정보</th>
                                        <th className="px-3 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">상태</th>
                                        <th className="px-3 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">담당자</th>
                                        <th className="px-3 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">문의/노트</th>
                                        <th className="px-3 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">등록일시</th>
                                        <th className="px-3 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right w-24">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {loadingB2B ? (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                                <div className="flex justify-center mb-2">
                                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                                                </div>
                                                데이터를 불러오는 중입니다...
                                            </td>
                                        </tr>
                                    ) : filteredProspects.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                                데이터가 없습니다.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredProspects.map((prospect) => (
                                            <tr key={prospect.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedProspects.has(prospect.id)}
                                                        onChange={(e) => handleSelectRow(prospect.id, e.target.checked)}
                                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                                    />
                                                </td>
                                                <td className="px-3 py-4 whitespace-nowrap">
                                                    {getSourceBadge(prospect.source)}
                                                </td>
                                                <td className="px-3 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                                            <FiUser className="text-gray-500 w-3.5 h-3.5" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-gray-900 text-sm truncate">{prospect.customerName}</p>
                                                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                                                <FiPhone className="w-3 h-3 flex-shrink-0" />
                                                                <span className="truncate">{prospect.customerPhone}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-4 whitespace-nowrap">
                                                    {getStatusBadge(prospect.status)}
                                                </td>
                                                <td className="px-3 py-4 whitespace-nowrap">
                                                    {prospect.manager ? (
                                                        <div className="text-xs">
                                                            <p className="font-medium text-purple-600 truncate">{prospect.manager.displayName}</p>
                                                            <p className="text-gray-500 truncate">{prospect.manager.affiliateCode}</p>
                                                        </div>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                            본사
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-500" title={prospect.notes || ''}>
                                                    {prospect.notes ? (
                                                        <div className="flex items-center gap-1">
                                                            <FiMessageSquare className="w-3 h-3 text-blue-500 flex-shrink-0" />
                                                            <span>{new Date(prospect.createdAt).toLocaleDateString('ko-KR')}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-500">
                                                    <div className="flex items-center gap-1">
                                                        <FiCalendar className="w-3 h-3" />
                                                        {new Date(prospect.createdAt).toLocaleDateString('ko-KR')}
                                                    </div>
                                                    <div className="text-gray-400 mt-0.5">
                                                        {new Date(prospect.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-4 whitespace-nowrap text-right">
                                                    <div className="flex items-center justify-end gap-1 flex-nowrap">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedProspectId(prospect.id);
                                                                setSelectedProspectType('lead');
                                                                setDetailModalOpen(true);
                                                            }}
                                                            className="text-blue-600 hover:text-blue-800 text-xs font-medium px-1.5 py-1 bg-blue-50 rounded hover:bg-blue-100 transition-colors whitespace-nowrap"
                                                        >
                                                            상세
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                if (!confirm(`${prospect.customerName}님의 정보를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
                                                                try {
                                                                    const res = await fetch(`/api/admin/affiliate/leads/${prospect.id}`, {
                                                                        method: 'DELETE',
                                                                    });
                                                                    const data = await res.json();
                                                                    if (data.ok) {
                                                                        alert('삭제되었습니다.');
                                                                        loadProspects();
                                                                    } else {
                                                                        alert(data.message || '삭제에 실패했습니다.');
                                                                    }
                                                                } catch (error) {
                                                                    console.error('Error deleting prospect:', error);
                                                                    alert('오류가 발생했습니다.');
                                                                }
                                                            }}
                                                            className="text-red-600 hover:text-red-800 text-xs font-medium px-1.5 py-1 bg-red-50 rounded hover:bg-red-100 transition-colors whitespace-nowrap"
                                                        >
                                                            삭제
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    {/* System Consultation Filters & Search */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
                        <div className="flex flex-col md:flex-row gap-4 justify-between">
                            {/* 대리점장 필터 드롭다운 */}
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                                    <FiFilter className="inline mr-1" />
                                    대리점장 필터:
                                </label>
                                <select
                                    value={filterManagerId}
                                    onChange={(e) => setFilterManagerId(e.target.value)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none min-w-[180px]"
                                >
                                    <option value="ALL">전체 보기</option>
                                    <option value="NONE">본사 유입 (미배정)</option>
                                    {managers.map((manager) => (
                                        <option key={manager.id} value={manager.id}>
                                            {manager.displayName} ({manager.affiliateCode})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="relative w-full md:w-64">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="이름, 연락처, 담당자 검색"
                                    value={systemSearch}
                                    onChange={(e) => setSystemSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* System Consultation Table - B2B 유입 탭과 동일한 형식 */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse table-fixed">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-10">
                                            <input
                                                type="checkbox"
                                                checked={allSelected}
                                                ref={(input) => {
                                                    if (input) input.indeterminate = someSelected;
                                                }}
                                                onChange={handleSelectAll}
                                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                        </th>
                                        <th className="px-3 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">구분</th>
                                        <th className="px-3 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-40">고객 정보</th>
                                        <th className="px-3 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">상태</th>
                                        <th className="px-3 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">담당자</th>
                                        <th className="px-3 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">문의/노트</th>
                                        <th className="px-3 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">등록일시</th>
                                        <th className="px-3 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right w-48">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {loadingSystem ? (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                                <div className="flex justify-center mb-2">
                                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                                                </div>
                                                데이터를 불러오는 중입니다...
                                            </td>
                                        </tr>
                                    ) : filteredConsultations.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                                데이터가 없습니다.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredConsultations.map((consultation) => (
                                            <tr key={consultation.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedConsultations.has(consultation.id)}
                                                        onChange={(e) => handleSelectRow(consultation.id, e.target.checked)}
                                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                                    />
                                                </td>
                                                <td className="px-3 py-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                                        시스템상담
                                                    </span>
                                                </td>
                                                <td className="px-3 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                                                            <FiUser className="text-orange-600 w-3.5 h-3.5" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-gray-900 text-sm truncate">{consultation.name}</p>
                                                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                                                <FiPhone className="w-3 h-3 flex-shrink-0" />
                                                                <span className="truncate">{consultation.phone}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${consultation.status === 'NEW' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {consultation.status === 'NEW' ? '신규' : consultation.status}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-4 whitespace-nowrap">
                                                    {consultation.agent ? (
                                                        <div className="text-xs">
                                                            <p className="font-medium text-blue-600 truncate">{consultation.agent.displayName}</p>
                                                            <p className="text-gray-500 truncate">{consultation.agent.affiliateCode}</p>
                                                        </div>
                                                    ) : consultation.manager ? (
                                                        <div className="text-xs">
                                                            <p className="font-medium text-purple-600 truncate">{consultation.manager.displayName}</p>
                                                            <p className="text-gray-500 truncate">{consultation.manager.affiliateCode}</p>
                                                        </div>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                            본사
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-4">
                                                    <div className="truncate text-sm text-gray-600" title={consultation.message || ''}>
                                                        {consultation.message || '-'}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-4 whitespace-nowrap text-xs text-gray-500">
                                                    <div className="flex items-center gap-1">
                                                        <FiCalendar className="w-3 h-3" />
                                                        {new Date(consultation.createdAt).toLocaleDateString('ko-KR')}
                                                    </div>
                                                    <div className="text-gray-400 mt-0.5">
                                                        {new Date(consultation.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-4 whitespace-nowrap text-right">
                                                    <div className="flex items-center justify-end gap-1 flex-nowrap">
                                                        <button
                                                            onClick={() => handleExtendTrialForConsultation(consultation.id, consultation.name, consultation.phone)}
                                                            className="text-green-600 hover:text-green-800 text-xs font-medium px-1.5 py-1 bg-green-50 rounded hover:bg-green-100 transition-colors whitespace-nowrap"
                                                        >
                                                            +3일
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedProspectId(consultation.id);
                                                                setSelectedProspectType('consultation');
                                                                setDetailModalOpen(true);
                                                            }}
                                                            className="text-blue-600 hover:text-blue-800 text-xs font-medium px-1.5 py-1 bg-blue-50 rounded hover:bg-blue-100 transition-colors whitespace-nowrap"
                                                        >
                                                            상세
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                if (!confirm(`${consultation.name}님의 상담 신청을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
                                                                try {
                                                                    const res = await fetch(`/api/system-inquiries/${consultation.id}`, {
                                                                        method: 'DELETE',
                                                                    });
                                                                    const data = await res.json();
                                                                    if (data.ok) {
                                                                        alert('삭제되었습니다.');
                                                                        loadSystemConsultations();
                                                                    } else {
                                                                        alert(data.message || '삭제에 실패했습니다.');
                                                                    }
                                                                } catch (error) {
                                                                    console.error('Error deleting consultation:', error);
                                                                    alert('오류가 발생했습니다.');
                                                                }
                                                            }}
                                                            className="text-red-600 hover:text-red-800 text-xs font-medium px-1.5 py-1 bg-red-50 rounded hover:bg-red-100 transition-colors whitespace-nowrap"
                                                        >
                                                            삭제
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Assign Modal */}
            {isAssignModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900">DB 보내기 (대리점장 할당)</h3>
                            <button
                                onClick={() => setIsAssignModalOpen(false)}
                                className="rounded-full p-1 hover:bg-gray-100"
                            >
                                <span className="text-xl text-gray-500">×</span>
                            </button>
                        </div>

                        <p className="mb-4 text-sm text-gray-600">
                            선택한 {selectedCount}명의 고객을 담당할 대리점장을 선택해주세요.
                        </p>

                        <div className="mb-6">
                            <label className="mb-2 block text-sm font-medium text-gray-700">대리점장 선택</label>
                            <select
                                value={selectedManagerId}
                                onChange={(e) => setSelectedManagerId(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="">대리점장을 선택하세요</option>
                                {managers.map((manager) => (
                                    <option key={manager.id} value={manager.id}>
                                        {manager.displayName} ({manager.affiliateCode})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setIsAssignModalOpen(false)}
                                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleAssign}
                                disabled={isAssigning || !selectedManagerId}
                                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isAssigning ? '처리 중...' : '확인'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* B2B Prospect Detail Modal */}
            {selectedProspectId && (
                <B2BProspectDetailModal
                    prospectId={selectedProspectId}
                    prospectType={selectedProspectType}
                    isOpen={detailModalOpen}
                    onClose={() => {
                        setDetailModalOpen(false);
                        setSelectedProspectId(null);
                    }}
                    onUpdate={() => {
                        if (activeTab === 'B2B') {
                            loadProspects();
                        } else {
                            loadSystemConsultations();
                        }
                    }}
                />
            )}
        </div>
    );
}
