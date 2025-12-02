'use client';

import { useState } from 'react';

export default function TeamMessagesTestPage() {
    const [testUserId, setTestUserId] = useState('');
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [viewType, setViewType] = useState<'received' | 'sent'>('received');

    // Send Form State
    const [recipientId, setRecipientId] = useState('');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    const fetchMessages = async () => {
        if (!testUserId) {
            alert('Please enter a Test User ID');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/partner/messages?type=${viewType}`, {
                headers: {
                    'X-Test-User-Id': testUserId,
                },
            });
            const json = await res.json();
            if (json.ok) {
                setMessages(json.messages);
            } else {
                setError(json.error);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async () => {
        if (!testUserId) {
            alert('Please enter a Test User ID');
            return;
        }
        try {
            const res = await fetch('/api/partner/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Test-User-Id': testUserId,
                },
                body: JSON.stringify({
                    recipientUserId: recipientId,
                    title,
                    content,
                }),
            });
            const json = await res.json();
            if (json.ok) {
                alert('Message sent!');
                setTitle('');
                setContent('');
                if (viewType === 'sent') fetchMessages();
            } else {
                alert('Error: ' + json.error);
            }
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    const deleteMessage = async (id: number) => {
        if (!confirm('Delete this message?')) return;
        try {
            const res = await fetch(`/api/partner/messages?id=${id}`, {
                method: 'DELETE',
                headers: {
                    'X-Test-User-Id': testUserId,
                },
            });
            const json = await res.json();
            if (json.ok) {
                fetchMessages();
            } else {
                alert('Error: ' + json.error);
            }
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    const markAsRead = async (id: number) => {
        try {
            const res = await fetch('/api/partner/messages', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Test-User-Id': testUserId,
                },
                body: JSON.stringify({ messageId: id }),
            });
            const json = await res.json();
            if (json.ok) {
                fetchMessages();
            } else {
                alert('Error: ' + json.error);
            }
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Team Messages Isolated Test</h1>

            <div className="bg-gray-100 p-4 rounded mb-6">
                <label className="block text-sm font-bold mb-2">Test User ID (Impersonation)</label>
                <input
                    type="number"
                    value={testUserId}
                    onChange={(e) => setTestUserId(e.target.value)}
                    className="border p-2 rounded w-full"
                    placeholder="Enter User ID (e.g., Agent or Manager ID)"
                />
                <p className="text-xs text-gray-500 mt-1">
                    * Only works in development mode. Check your database for valid User IDs.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-8">
                {/* Left: Message List */}
                <div>
                    <div className="flex gap-2 mb-4">
                        <button
                            onClick={() => { setViewType('received'); setTimeout(fetchMessages, 0); }}
                            className={`px-4 py-2 rounded ${viewType === 'received' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                        >
                            Received
                        </button>
                        <button
                            onClick={() => { setViewType('sent'); setTimeout(fetchMessages, 0); }}
                            className={`px-4 py-2 rounded ${viewType === 'sent' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                        >
                            Sent
                        </button>
                        <button onClick={fetchMessages} className="px-4 py-2 bg-green-600 text-white rounded ml-auto">
                            Refresh
                        </button>
                    </div>

                    {loading && <div>Loading...</div>}
                    {error && <div className="text-red-500 mb-4">{error}</div>}

                    <div className="space-y-4">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`border p-4 rounded ${msg.isRead ? 'bg-white' : 'bg-blue-50 border-blue-200'}`}>
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold">{msg.title}</h3>
                                    <div className="text-xs text-gray-500">{new Date(msg.createdAt).toLocaleString()}</div>
                                </div>
                                <p className="text-sm text-gray-600 mb-2">{msg.content}</p>
                                <div className="text-xs text-gray-500 mb-2">
                                    {viewType === 'received' ? `From: ${msg.sender.name} (${msg.sender.role})` : `To: ${msg.recipient?.name} (${msg.recipient?.role})`}
                                </div>
                                <div className="flex gap-2">
                                    {viewType === 'received' && !msg.isRead && (
                                        <button onClick={() => markAsRead(msg.id)} className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                                            Mark Read
                                        </button>
                                    )}
                                    <button onClick={() => deleteMessage(msg.id)} className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                        {messages.length === 0 && !loading && <div className="text-gray-500">No messages found.</div>}
                    </div>
                </div>

                {/* Right: Send Form */}
                <div className="bg-white p-6 border rounded h-fit">
                    <h2 className="text-xl font-bold mb-4">Send Message</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold mb-1">Recipient User ID</label>
                            <input
                                type="number"
                                value={recipientId}
                                onChange={(e) => setRecipientId(e.target.value)}
                                className="border p-2 rounded w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1">Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="border p-2 rounded w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1">Content</label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="border p-2 rounded w-full h-32"
                            />
                        </div>
                        <button onClick={sendMessage} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
                            Send Message
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
