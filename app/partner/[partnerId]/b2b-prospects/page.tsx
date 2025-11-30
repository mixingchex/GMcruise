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
    FiSend,
    FiRotateCcw,
    FiX,
    FiCheck,
} from 'react-icons/fi';
import { showError, showSuccess } from '@/components/ui/Toast';

interface B2BProspect {
    id: number;
    customerName: string | null;
    customerPhone: string | null;
    status: string;
    source: string;
    notes: string | null;
    createdAt: string;
    agentId: number | null;
    affiliateOwnership: {
        ownerType: string;
        ownerName: string | null;
    } | null;
}

interface SystemConsultation {
    id: number;
    name: string;
    phone: string;
    message: string | null;
    status: string;
    createdAt: string;
    agentId: number | null;
}

interface Agent {
    id: number;
    displayName: string | null;
    affiliateCode: string | null;
}

export default function PartnerB2BProspectsPage({ params }: { params: { partnerId: string } }) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'B2B' | 'SYSTEM'>('B2B');
    const [partnerId, setPartnerId] = useState<string>('');

    // B2B State
    const [prospects, setProspects] = useState<B2BProspect[]>([]);
    const [loadingB2B, setLoadingB2B] = useState(true);
    const [b2bSearch, setB2bSearch] = useState('');
    const [selectedProspects, setSelectedProspects] = useState<Set<number>>(new Set());

    // System Consultation State
    const [consultations, setConsultations] = useState<SystemConsultation[]>([]);
    const [loadingSystem, setLoadingSystem] = useState(false);
    const [systemSearch, setSystemSearch] = useState('');
    const [selectedConsultations, setSelectedConsultations] = useState<Set<number>>(new Set());

    // DB Assignment State
    const [agents, setAgents] = useState<Agent[]>([]);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedAgentId, setSelectedAgentId] = useState<string>('');
    const [isAssigning, setIsAssigning] = useState(false);
    const [isRecalling, setIsRecalling] = useState(false);

    useEffect(() => {
        // Unwrap params
        Promise.resolve(params).then((resolvedParams) => {
            setPartnerId(resolvedParams.partnerId);
        });
        loadAgents();
    }, [params]);

    const loadAgents = async () => {
        try {
            const res = await fetch('/api/partner/agents'); // Assuming this endpoint exists or similar
            // If not, we might need to fetch profile with relations.
            // Let's try fetching profile first to get managed agents.
            const profileRes = await fetch('/api/partner/profile');
            const profileJson = await profileRes.json();
            if (profileJson.ok && profileJson.profile.managedAgents) {
                setAgents(profileJson.profile.managedAgents);
            }
        } catch (error) {
            console.error('Failed to load agents:', error);
        }
    };

    const loadProspects = useCallback(async () => {
        try {
            setLoadingB2B(true);
            // Fetch both B2B_INFLOW and B2B_LANDING
            // Since API filters by source, we might need two calls or one call without source and filter client side?
            // Or better, let's just fetch all and filter client side for now as volume isn't huge yet,
            // or make two requests.
            // Let's try fetching with a specific query param if supported, or just fetch all customers and filter.
            // Actually, the requirement is "B2B Inflow".
            // Let's fetch with source=B2B_INFLOW and source=B2B_LANDING

            const res1 = await fetch('/api/partner/customers?source=B2B_INFLOW&limit=100');
            const json1 = await res1.json();

            const res2 = await fetch('/api/partner/customers?source=B2B_LANDING&limit=100');
            const json2 = await res2.json();

            let allProspects: B2BProspect[] = [];
            if (json1.ok) allProspects = [...allProspects, ...json1.customers];
            if (json2.ok) allProspects = [...allProspects, ...json2.customers];

            // Remove duplicates if any
            const uniqueProspects = Array.from(new Map(allProspects.map(item => [item.id, item])).values());

            setProspects(uniqueProspects);
            setSelectedProspects(new Set());
        } catch (error) {
            console.error('Failed to load prospects:', error);
            showError('데이터 로드 중 오류가 발생했습니다.');
        } finally {
            setLoadingB2B(false);
        }
    }, []);

    const loadSystemConsultations = useCallback(async () => {
        try {
            setLoadingSystem(true);
            const res = await fetch('/api/partner/system-inquiries');
            const json = await res.json();

            if (json.ok) {
                setConsultations(json.consultations || []);
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
            case 'B2B_INFLOW':
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
            default:
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {source}
                    </span>
                );
        }
    };

    const filteredProspects = prospects.filter(p => {
        if (b2bSearch) {
            const query = b2bSearch.toLowerCase();
            return (
                p.customerName?.toLowerCase().includes(query) ||
                p.customerPhone?.includes(query)
            );
        }
        return true;
    });

    const filteredConsultations = consultations.filter(c => {
        if (systemSearch) {
            const query = systemSearch.toLowerCase();
            return (
                c.name?.toLowerCase().includes(query) ||
                c.phone?.includes(query)
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

    const handleAssign = async () => {
        if (!selectedAgentId) {
            showError('판매원을 선택해주세요.');
            return;
        }

        setIsAssigning(true);
        try {
            const leadIds = activeTab === 'B2B'
                ? Array.from(selectedProspects)
                : Array.from(selectedConsultations);

            const type = activeTab === 'B2B' ? 'lead' : 'consultation';

            const res = await fetch('/api/partner/customers/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    leadIds,
                    agentId: selectedAgentId,
                    type
                }),
            });

            const json = await res.json();
            if (json.ok) {
                showSuccess('DB가 성공적으로 전송되었습니다.');
                setIsAssignModalOpen(false);
                setSelectedAgentId('');
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

            const res = await fetch('/api/partner/customers/assign', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    leadIds,
                    type
                }),
            });

            const json = await res.json();
            if (json.ok) {
                showSuccess('DB가 성공적으로 회수되었습니다.');
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

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">B2B 잠재고객 관리</h1>
                    <p className="text-gray-500 mt-1">B2B 유입 및 시스템 상담 신청 고객을 관리하고 판매원에게 배정합니다.</p>
                </div>
                <div className="flex items-center gap-2">
                    {selectedCount > 0 && (
                        <>
                            <button
                                onClick={() => setIsAssignModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                            >
                                <FiSend />
                                DB 보내기 ({selectedCount})
                            </button>
                            <button
                                onClick={handleRecall}
                                disabled={isRecalling}
                                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                                <FiRotateCcw className={isRecalling ? 'animate-spin' : ''} />
                                회수 ({selectedCount})
                            </button>
                        </>
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

            {/* Content */}
            {activeTab === 'B2B' ? (
                <>
                    {/* B2B Search */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
                        <div className="relative w-full md:w-96">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="이름, 연락처 검색"
                                value={b2bSearch}
                                onChange={(e) => setB2bSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            />
                        </div>
                    </div>

                    {/* B2B Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-10">
                                            <input
                                                type="checkbox"
                                                checked={filteredProspects.length > 0 && selectedProspects.size === filteredProspects.length}
                                                onChange={handleSelectAll}
                                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                        </th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">구분</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">고객 정보</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">상태</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">담당 판매원</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">등록일시</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {loadingB2B ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                                <div className="flex justify-center mb-2">
                                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                                                </div>
                                                데이터를 불러오는 중입니다...
                                            </td>
                                        </tr>
                                    ) : filteredProspects.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                                데이터가 없습니다.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredProspects.map((prospect) => (
                                            <tr key={prospect.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedProspects.has(prospect.id)}
                                                        onChange={(e) => handleSelectRow(prospect.id, e.target.checked)}
                                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                                    />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {getSourceBadge(prospect.source)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                                            <FiUser className="text-gray-500" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-900">{prospect.customerName}</p>
                                                            <div className="flex items-center gap-1 text-sm text-gray-500">
                                                                <FiPhone className="w-3 h-3" />
                                                                {prospect.customerPhone}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-gray-600">{prospect.status}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {prospect.affiliateOwnership?.ownerType === 'SALES_AGENT' ? (
                                                        <span className="text-blue-600 font-medium">
                                                            {prospect.affiliateOwnership.ownerName}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <div className="flex items-center gap-1">
                                                        <FiCalendar className="w-3 h-3" />
                                                        {new Date(prospect.createdAt).toLocaleDateString('ko-KR')}
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
                    {/* System Consultation Search */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
                        <div className="relative w-full md:w-96">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="이름, 연락처 검색"
                                value={systemSearch}
                                onChange={(e) => setSystemSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            />
                        </div>
                    </div>

                    {/* System Consultation Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-10">
                                            <input
                                                type="checkbox"
                                                checked={filteredConsultations.length > 0 && selectedConsultations.size === filteredConsultations.length}
                                                onChange={handleSelectAll}
                                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                        </th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">상태</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">고객 정보</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">문의 내용</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">담당 판매원</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">등록일시</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {loadingSystem ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                                <div className="flex justify-center mb-2">
                                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                                                </div>
                                                데이터를 불러오는 중입니다...
                                            </td>
                                        </tr>
                                    ) : filteredConsultations.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                                데이터가 없습니다.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredConsultations.map((consultation) => (
                                            <tr key={consultation.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedConsultations.has(consultation.id)}
                                                        onChange={(e) => handleSelectRow(consultation.id, e.target.checked)}
                                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                                    />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${consultation.status === 'NEW' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {consultation.status === 'NEW' ? '신규' : consultation.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                                                            <FiUser className="text-orange-600" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-900">{consultation.name}</p>
                                                            <div className="flex items-center gap-1 text-sm text-gray-500">
                                                                <FiPhone className="w-3 h-3" />
                                                                {consultation.phone}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-start gap-2">
                                                        <FiMessageSquare className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                                        <p className="text-sm text-gray-600 max-w-xs truncate">{consultation.message}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {consultation.agentId ? (
                                                        <span className="text-blue-600 font-medium">
                                                            {agents.find(a => a.id === consultation.agentId)?.displayName || '판매원'}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <div className="flex items-center gap-1">
                                                        <FiCalendar className="w-3 h-3" />
                                                        {new Date(consultation.createdAt).toLocaleDateString('ko-KR')}
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
                            <h3 className="text-lg font-bold text-gray-900">DB 보내기 (판매원 할당)</h3>
                            <button
                                onClick={() => setIsAssignModalOpen(false)}
                                className="rounded-full p-1 hover:bg-gray-100"
                            >
                                <FiX className="text-xl text-gray-500" />
                            </button>
                        </div>

                        <p className="mb-4 text-sm text-gray-600">
                            선택한 {selectedCount}명의 고객을 담당할 판매원을 선택해주세요.
                        </p>

                        <div className="mb-6">
                            <label className="mb-2 block text-sm font-medium text-gray-700">판매원 선택</label>
                            <select
                                value={selectedAgentId}
                                onChange={(e) => setSelectedAgentId(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="">판매원을 선택하세요</option>
                                {agents.map((agent) => (
                                    <option key={agent.id} value={agent.id}>
                                        {agent.displayName} ({agent.affiliateCode})
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
                                disabled={isAssigning || !selectedAgentId}
                                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isAssigning ? '처리 중...' : '확인'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
