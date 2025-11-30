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
} from 'react-icons/fi';
import { showError } from '@/components/ui/Toast';

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

export default function B2BProspectsPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'B2B' | 'SYSTEM'>('B2B');

    // B2B State
    const [prospects, setProspects] = useState<B2BProspect[]>([]);
    const [loadingB2B, setLoadingB2B] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'INFLOW' | 'PARTNER'>('ALL');
    const [search, setSearch] = useState('');
    const [selectedProspects, setSelectedProspects] = useState<Set<number>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);

    // System Consultation State
    const [consultations, setConsultations] = useState<any[]>([]);
    const [loadingSystem, setLoadingSystem] = useState(false);
    const [systemSearch, setSystemSearch] = useState('');

    const loadProspects = useCallback(async () => {
        try {
            setLoadingB2B(true);
            const res = await fetch('/api/admin/affiliate/leads?source=b2b&limit=100');
            const json = await res.json();

            if (json.ok) {
                setProspects(json.leads || []);
                setSelectedProspects(new Set());
            } else {
                showError(json.message || '데이터를 불러오는데 실패했습니다.');
            }
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
            const res = await fetch('/api/system-inquiries');
            const json = await res.json();

            if (json.ok) {
                setConsultations(json.inquiries || []);
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

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'NEW':
                return <span className="text-blue-600 font-medium">신규</span>;
            case 'CONTACTED':
                return <span className="text-yellow-600 font-medium">연락됨</span>;
            default:
                return <span className="text-gray-600">{status}</span>;
        }
    };

    const filteredProspects = prospects.filter(p => {
        if (filter === 'INFLOW' && p.source !== 'test-guide' && p.source !== 'B2B_INFLOW') return false;
        if (filter === 'PARTNER' && p.source !== 'B2B_LANDING') return false;

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
        if (e.target.checked) {
            setSelectedProspects(new Set(filteredProspects.map(p => p.id)));
        } else {
            setSelectedProspects(new Set());
        }
    };

    const handleSelectProspect = (id: number, checked: boolean) => {
        const newSelected = new Set(selectedProspects);
        if (checked) {
            newSelected.add(id);
        } else {
            newSelected.delete(id);
        }
        setSelectedProspects(newSelected);
    };

    const handleDeleteSelected = async () => {
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
    };

    const handleExtendTrial = async (leadId: number, currentName: string) => {
        if (!confirm(`${currentName}님의 무료 체험 기간을 7일 연장하시겠습니까?`)) return;

        try {
            const res = await fetch(`/api/admin/affiliate/leads/${leadId}/extend-trial`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ days: 7 }),
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

    const allSelected = filteredProspects.length > 0 && selectedProspects.size === filteredProspects.length;
    const someSelected = selectedProspects.size > 0 && selectedProspects.size < filteredProspects.length;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">B2B 잠재고객 관리</h1>
                    <p className="text-gray-500 mt-1">7일 무료체험 유입 및 시스템 상담 신청 고객을 관리합니다.</p>
                </div>
                <div className="flex items-center gap-2">
                    {activeTab === 'B2B' && selectedProspects.size > 0 && (
                        <button
                            onClick={handleDeleteSelected}
                            disabled={isDeleting}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            <FiTrash2 />
                            {isDeleting ? '삭제 중...' : `선택 삭제 (${selectedProspects.size})`}
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
                            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                                <button
                                    onClick={() => setFilter('ALL')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filter === 'ALL'
                                        ? 'bg-gray-900 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    전체 보기
                                </button>
                                <button
                                    onClick={() => setFilter('INFLOW')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filter === 'INFLOW'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                        }`}
                                >
                                    B2B 유입
                                </button>
                                <button
                                    onClick={() => setFilter('PARTNER')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filter === 'PARTNER'
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                                        }`}
                                >
                                    파트너 B2B 유입
                                </button>
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
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-10">
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
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">구분</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">고객 정보</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">상태</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">담당자</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">문의/노트</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">등록일시</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">관리</th>
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
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedProspects.has(prospect.id)}
                                                        onChange={(e) => handleSelectProspect(prospect.id, e.target.checked)}
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
                                                    {getStatusBadge(prospect.status)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {prospect.manager ? (
                                                        <div className="text-sm">
                                                            <p className="font-medium text-gray-900">{prospect.manager.displayName}</p>
                                                            <p className="text-xs text-gray-500">{prospect.manager.affiliateCode}</p>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-gray-400">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="max-w-xs truncate text-sm text-gray-600" title={prospect.notes || ''}>
                                                        {prospect.notes || '-'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <div className="flex items-center gap-1">
                                                        <FiCalendar className="w-3 h-3" />
                                                        {new Date(prospect.createdAt).toLocaleDateString('ko-KR')}
                                                    </div>
                                                    <div className="text-xs text-gray-400 mt-0.5">
                                                        {new Date(prospect.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleExtendTrial(prospect.id, prospect.customerName || '고객')}
                                                            className="text-green-600 hover:text-green-800 text-sm font-medium px-2 py-1 bg-green-50 rounded hover:bg-green-100 transition-colors"
                                                        >
                                                            +7일 연장
                                                        </button>
                                                        <button
                                                            onClick={() => router.push(`/admin/affiliate/customers/${prospect.id}`)}
                                                            className="text-blue-600 hover:text-blue-800 text-sm font-medium px-2 py-1 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
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
                                                            className="text-red-600 hover:text-red-800 text-sm font-medium px-2 py-1 bg-red-50 rounded hover:bg-red-100 transition-colors"
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
                    {/* System Consultation Search */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
                        <div className="relative w-full md:w-96">
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

                    {/* System Consultation Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">상태</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">고객 정보</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">담당자</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">문의 내용</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">등록일시</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {loadingSystem ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                                <div className="flex justify-center mb-2">
                                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                                                </div>
                                                데이터를 불러오는 중입니다...
                                            </td>
                                        </tr>
                                    ) : filteredConsultations.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                                데이터가 없습니다.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredConsultations.map((consultation) => (
                                            <tr key={consultation.id} className="hover:bg-gray-50 transition-colors">
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
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {consultation.manager ? (
                                                        <div className="text-sm">
                                                            <p className="font-medium text-gray-900">{consultation.manager.displayName}</p>
                                                            <p className="text-xs text-gray-500">{consultation.manager.affiliateCode}</p>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-gray-400">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-start gap-2">
                                                        <FiMessageSquare className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                                        <p className="text-sm text-gray-600">{consultation.message}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <div className="flex items-center gap-1">
                                                        <FiCalendar className="w-3 h-3" />
                                                        {new Date(consultation.createdAt).toLocaleDateString('ko-KR')}
                                                    </div>
                                                    <div className="text-xs text-gray-400 mt-0.5">
                                                        {new Date(consultation.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
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
        </div>
    );
}
