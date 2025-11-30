'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    FiRefreshCw,
    FiSearch,
    FiUser,
    FiPhone,
    FiMessageSquare,
    FiCalendar,
    FiTrash2,
} from 'react-icons/fi';
import { showError } from '@/components/ui/Toast';

interface SystemConsultation {
    id: number;
    name: string;
    phone: string;
    message: string | null;
    status: string;
    createdAt: string;
    managerId: number | null;
    agentId: number | null;
}

export default function SystemConsultationsPage() {
    const [consultations, setConsultations] = useState<SystemConsultation[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const loadConsultations = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/system-inquiries');
            const json = await res.json();

            if (json.ok) {
                setConsultations(json.inquiries || []);
            } else {
                showError(json.message || '데이터를 불러오는데 실패했습니다.');
            }
        } catch (error) {
            console.error('Failed to load consultations:', error);
            showError('데이터 로드 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadConsultations();
    }, [loadConsultations]);

    const filteredConsultations = consultations.filter(c => {
        if (search) {
            const query = search.toLowerCase();
            return (
                c.name.toLowerCase().includes(query) ||
                c.phone.includes(query)
            );
        }
        return true;
    });

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">시스템 상담 신청 관리</h1>
                    <p className="text-gray-500 mt-1">7일 무료체험 대시보드를 통해 접수된 시스템 상담 문의입니다.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadConsultations}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium transition-colors"
                    >
                        <FiRefreshCw className={loading ? 'animate-spin' : ''} />
                        새로고침
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
                <div className="relative w-full md:w-64">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="이름, 연락처 검색"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">고객 정보</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">상태</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">문의 내용</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">등록일시</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex justify-center mb-2">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                                        </div>
                                        데이터를 불러오는 중입니다...
                                    </td>
                                </tr>
                            ) : filteredConsultations.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                        데이터가 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                filteredConsultations.map((consultation) => (
                                    <tr key={consultation.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                                    <FiUser className="text-gray-500" />
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
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${consultation.status === 'NEW' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {consultation.status === 'NEW' ? '신규' : consultation.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-start gap-2 text-sm text-gray-600">
                                                <FiMessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                <span className="whitespace-pre-wrap">{consultation.message || '-'}</span>
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
        </div>
    );
}
