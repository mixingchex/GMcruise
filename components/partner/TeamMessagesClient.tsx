'use client';

import { useState, useEffect } from 'react';
import { FiSend, FiInbox, FiTrash2, FiRefreshCw, FiCheck, FiX, FiArrowLeft } from 'react-icons/fi';
import { useRouter } from 'next/navigation';

interface TeamMessagesClientProps {
    partnerId: string;
    profile: any;
}

export default function TeamMessagesClient({ partnerId, profile }: TeamMessagesClientProps) {
    const router = useRouter();
    const [viewType, setViewType] = useState<'received' | 'sent'>('received');
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMessage, setSelectedMessage] = useState<any | null>(null);

    // Send Form
    const [showSendModal, setShowSendModal] = useState(false);
    const [recipientId, setRecipientId] = useState('');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [sending, setSending] = useState(false);

    // Recipients List (Mock or Fetch?)
    // Ideally we should fetch available recipients (Manager, Agents, Admin)
    // For now, let's allow entering ID or implement a simple fetch if possible.
    // Given the constraints, let's fetch possible recipients if we can, or just use ID input with validation.
    // Better: Fetch related users.
    const [recipients, setRecipients] = useState<any[]>([]);

    useEffect(() => {
        fetchMessages();
        fetchRecipients();
    }, [viewType]);

    const fetchMessages = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/partner/messages?type=${viewType}`);
            const json = await res.json();
            if (json.ok) {
                setMessages(json.messages);
            }
        } catch (error) {
            console.error('Failed to fetch messages', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRecipients = async () => {
        // This endpoint doesn't exist yet, but we can reuse existing ones or add to messages API?
        // Or just let user enter ID for now as per "Team Messages" requirement usually implies known team.
        // Let's implement a simple recipient fetcher in the messages API or just hardcode Admin for now + input for others.
        // Actually, let's use a simple input for ID for now to ensure it works, or maybe we can fetch "My Team".
        // Let's stick to simple ID input or "Admin" toggle for MVP.
        // Wait, the user wants "Team Messages".
        // Let's add a "Send to Admin" button and "Send to Manager/Agent" input.
    };

    const handleSend = async () => {
        if (!recipientId || !title || !content) {
            alert('Please fill all fields');
            return;
        }
        setSending(true);
        try {
            const res = await fetch('/api/partner/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipientUserId: recipientId, title, content }),
            });
            const json = await res.json();
            if (json.ok) {
                alert('Message sent!');
                setShowSendModal(false);
                setTitle('');
                setContent('');
                if (viewType === 'sent') fetchMessages();
            } else {
                alert(json.error || 'Failed to send');
            }
        } catch (error) {
            alert('Error sending message');
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this message?')) return;
        try {
            const res = await fetch(`/api/partner/messages?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchMessages();
                if (selectedMessage?.id === id) setSelectedMessage(null);
            }
        } catch (error) {
            alert('Failed to delete');
        }
    };

    const handleMarkAsRead = async (id: number) => {
        try {
            await fetch('/api/partner/messages', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageId: id }),
            });
            fetchMessages();
        } catch (error) {
            console.error('Failed to mark as read');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push(`/partner/${partnerId}`)}
                            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-2 rounded-lg transition-colors flex items-center gap-2"
                            title="대시보드로 돌아가기"
                        >
                            <FiArrowLeft size={20} />
                            <span className="text-sm font-medium">대시보드</span>
                        </button>
                        <h1 className="text-2xl font-bold text-gray-900">팀 메시지</h1>
                    </div>
                    <button
                        onClick={() => setShowSendModal(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                        <FiSend /> 메시지 보내기
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Message List */}
                    <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[600px]">
                        <div className="p-4 border-b flex gap-2">
                            <button
                                onClick={() => setViewType('received')}
                                className={`flex-1 py-2 text-sm font-medium rounded-lg ${viewType === 'received' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                받은 메시지함
                            </button>
                            <button
                                onClick={() => setViewType('sent')}
                                className={`flex-1 py-2 text-sm font-medium rounded-lg ${viewType === 'sent' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                보낸 메시지함
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="flex justify-center items-center h-full text-gray-400">로딩 중...</div>
                            ) : messages.length === 0 ? (
                                <div className="flex justify-center items-center h-full text-gray-400">메시지가 없습니다.</div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            onClick={() => {
                                                setSelectedMessage(msg);
                                                if (viewType === 'received' && !msg.isRead) handleMarkAsRead(msg.id);
                                            }}
                                            className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedMessage?.id === msg.id ? 'bg-blue-50' : ''} ${!msg.isRead && viewType === 'received' ? 'border-l-4 border-blue-500' : 'border-l-4 border-transparent'}`}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className={`text-sm font-medium ${!msg.isRead && viewType === 'received' ? 'text-gray-900' : 'text-gray-600'}`}>
                                                    {msg.title}
                                                </h3>
                                                <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                                                    {new Date(msg.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 line-clamp-2">{msg.content}</p>
                                            <div className="mt-2 text-xs text-gray-400">
                                                {viewType === 'received' ? `From: ${msg.sender.name}` : `To: ${msg.recipient?.name || 'Unknown'}`}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Message Detail */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 h-[600px] flex flex-col">
                        {selectedMessage ? (
                            <>
                                <div className="p-6 border-b">
                                    <div className="flex justify-between items-start mb-4">
                                        <h2 className="text-xl font-bold text-gray-900">{selectedMessage.title}</h2>
                                        <button
                                            onClick={() => handleDelete(selectedMessage.id)}
                                            className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
                                            title="삭제"
                                        >
                                            <FiTrash2 />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-700">보낸 사람:</span>
                                            <span>{selectedMessage.sender.name} ({selectedMessage.sender.role})</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-700">받는 사람:</span>
                                            <span>{selectedMessage.recipient?.name || 'Unknown'}</span>
                                        </div>
                                        <div className="ml-auto">
                                            {new Date(selectedMessage.createdAt).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6 flex-1 overflow-y-auto whitespace-pre-wrap text-gray-700 leading-relaxed">
                                    {selectedMessage.content}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                <FiInbox size={48} className="mb-4 opacity-20" />
                                <p>메시지를 선택하여 내용을 확인하세요.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Send Modal */}
            {showSendModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg">새 메시지 보내기</h3>
                            <button onClick={() => setShowSendModal(false)} className="text-gray-400 hover:text-gray-600">
                                <FiX size={24} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">받는 사람 (User ID)</label>
                                <input
                                    type="number"
                                    value={recipientId}
                                    onChange={(e) => setRecipientId(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    placeholder="User ID를 입력하세요"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    * 관리자에게 보내려면 관리자 ID를 입력하세요. (테스트 관리자 ID: 84)
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    placeholder="제목을 입력하세요"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2 h-32 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                                    placeholder="내용을 입력하세요"
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                            <button
                                onClick={() => setShowSendModal(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleSend}
                                disabled={sending}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {sending ? '전송 중...' : '보내기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
