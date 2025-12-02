export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'cg.sid.v2';

// Helper: Check Authentication
async function checkAuth() {
    try {
        // Dev-only: Allow impersonation for testing
        if (process.env.NODE_ENV === 'development') {
            const headers = require('next/headers').headers();
            const testUserId = headers.get('X-Test-User-Id');
            if (testUserId) {
                const user = await prisma.user.findUnique({
                    where: { id: parseInt(testUserId) },
                    include: { AffiliateProfile: true },
                });
                if (user) {
                    return {
                        userId: user.id,
                        role: user.role,
                        name: user.name,
                        profile: user.AffiliateProfile,
                    };
                }
            }
        }

        const sid = cookies().get(SESSION_COOKIE)?.value;
        if (!sid) return null;

        const session = await prisma.session.findUnique({
            where: { id: sid },
            include: {
                User: {
                    select: { id: true, role: true, name: true },
                    include: {
                        AffiliateProfile: {
                            select: { id: true, type: true },
                        },
                    },
                },
            },
        });

        if (!session || !session.User) return null;
        // Allow admin, manager, agent, OR anyone with an affiliate profile (e.g. community role acting as partner)
        if (!['admin', 'manager', 'agent'].includes(session.User.role) && !session.User.AffiliateProfile) return null;

        return {
            userId: session.User.id,
            role: session.User.role,
            name: session.User.name,
            profile: session.User.AffiliateProfile,
        };
    } catch (error) {
        console.error('[Partner Messages] Auth check error:', error);
        return null;
    }
}

// GET: Fetch Messages
export async function GET(req: NextRequest) {
    try {
        const user = await checkAuth();
        if (!user) {
            return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type') || 'received'; // 'received' | 'sent'
        const limit = parseInt(searchParams.get('limit') || '50');

        const messageTypes = [
            'team-dashboard',
            'agent-manager',
            'manager-agent',
            'manager-manager',
            'agent-admin',
            'manager-admin',
        ];

        const where: any = {
            messageType: { in: messageTypes },
            isActive: true,
        };

        if (type === 'sent') {
            // Messages I sent (I am the sender)
            where.adminId = user.userId;
        } else {
            // Messages I received (I am the recipient)
            where.userId = user.userId;
        }

        const messages = await prisma.adminMessage.findMany({
            where,
            include: {
                User_AdminMessage_adminIdToUser: {
                    select: { id: true, name: true, role: true }, // Sender
                },
                User_AdminMessage_userIdToUser: {
                    select: { id: true, name: true, role: true }, // Recipient
                },
                UserMessageRead: {
                    where: { userId: user.userId },
                    select: { readAt: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        console.log(`[Partner Messages] User ${user.userId} (${user.role}) requested ${type} messages. Found ${messages.length} messages.`);

        // Format response
        const formattedMessages = messages.map(msg => ({
            id: msg.id,
            title: msg.title,
            content: msg.content,
            messageType: msg.messageType,
            createdAt: msg.createdAt.toISOString(),
            sender: {
                id: msg.User_AdminMessage_adminIdToUser.id,
                name: msg.User_AdminMessage_adminIdToUser.name,
                role: msg.User_AdminMessage_adminIdToUser.role,
            },
            recipient: msg.User_AdminMessage_userIdToUser ? {
                id: msg.User_AdminMessage_userIdToUser.id,
                name: msg.User_AdminMessage_userIdToUser.name,
                role: msg.User_AdminMessage_userIdToUser.role,
            } : null,
            isRead: type === 'sent' ? true : msg.UserMessageRead.length > 0, // Sent messages are always "read" by sender
            readAt: type === 'sent' ? null : (msg.UserMessageRead[0]?.readAt?.toISOString() || null),
        }));

        return NextResponse.json({
            ok: true,
            messages: formattedMessages,
        });

    } catch (error) {
        console.error('[Partner Messages GET] Error:', error);
        return NextResponse.json({ ok: false, error: 'Failed to fetch messages' }, { status: 500 });
    }
}

// POST: Send Message
export async function POST(req: NextRequest) {
    try {
        const user = await checkAuth();
        if (!user) {
            return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { recipientUserId, title, content } = body;

        if (!recipientUserId || !title || !content) {
            return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
        }

        const recipientId = parseInt(recipientUserId);
        if (recipientId === user.userId) {
            return NextResponse.json({ ok: false, error: 'Cannot send message to self' }, { status: 400 });
        }

        // Check Recipient
        const recipient = await prisma.user.findUnique({
            where: { id: recipientId },
            select: { id: true, role: true },
        });

        if (!recipient) {
            return NextResponse.json({ ok: false, error: 'Recipient not found' }, { status: 404 });
        }

        // Determine Message Type & Permission
        let messageType = '';
        let canSend = false;

        // Logic adapted from existing send API
        if (user.role === 'agent') {
            if (recipient.role === 'manager') {
                // Agent -> Manager: Check relation
                const relation = await prisma.affiliateRelation.findFirst({
                    where: {
                        agentId: user.profile?.id,
                        managerId: (await prisma.affiliateProfile.findUnique({ where: { userId: recipientId } }))?.id,
                        status: 'ACTIVE',
                    },
                });
                if (relation) {
                    canSend = true;
                    messageType = 'agent-manager';
                }
            } else if (recipient.role === 'admin') {
                canSend = true;
                messageType = 'agent-admin';
            }
        } else if (user.role === 'manager') {
            if (recipient.role === 'agent') {
                // Manager -> Agent: Check relation
                const relation = await prisma.affiliateRelation.findFirst({
                    where: {
                        managerId: user.profile?.id,
                        agentId: (await prisma.affiliateProfile.findUnique({ where: { userId: recipientId } }))?.id,
                        status: 'ACTIVE',
                    },
                });
                if (relation) {
                    canSend = true;
                    messageType = 'manager-agent';
                }
            } else if (recipient.role === 'manager') {
                // Manager -> Manager: Allowed
                const targetProfile = await prisma.affiliateProfile.findUnique({ where: { userId: recipientId } });
                if (targetProfile?.type === 'BRANCH_MANAGER') {
                    canSend = true;
                    messageType = 'manager-manager';
                }
            } else if (recipient.role === 'admin') {
                canSend = true;
                messageType = 'manager-admin';
            }
        } else if (user.role === 'admin') {
            // Admin can send to anyone (though usually uses admin API)
            canSend = true;
            messageType = 'team-dashboard';
        }

        if (!canSend) {
            return NextResponse.json({ ok: false, error: 'Permission denied' }, { status: 403 });
        }

        // Create Message
        const message = await prisma.adminMessage.create({
            data: {
                adminId: user.userId,
                userId: recipientId,
                title,
                content,
                messageType,
                isActive: true,
                totalSent: 1,
                metadata: {
                    type: messageType,
                    sentAt: new Date().toISOString(),
                },
                updatedAt: new Date(),
            },
        });

        return NextResponse.json({ ok: true, message });

    } catch (error) {
        console.error('[Partner Messages POST] Error:', error);
        return NextResponse.json({ ok: false, error: 'Failed to send message' }, { status: 500 });
    }
}

// PATCH: Mark as Read
export async function PATCH(req: NextRequest) {
    try {
        const user = await checkAuth();
        if (!user) {
            return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { messageId } = body;

        if (!messageId) {
            return NextResponse.json({ ok: false, error: 'Message ID required' }, { status: 400 });
        }

        const existingRead = await prisma.userMessageRead.findFirst({
            where: {
                messageId: parseInt(messageId),
                userId: user.userId,
            },
        });

        if (!existingRead) {
            await prisma.userMessageRead.create({
                data: {
                    messageId: parseInt(messageId),
                    userId: user.userId,
                    readAt: new Date(),
                },
            });
        }

        return NextResponse.json({ ok: true });

    } catch (error) {
        console.error('[Partner Messages PATCH] Error:', error);
        return NextResponse.json({ ok: false, error: 'Failed to mark as read' }, { status: 500 });
    }
}

// DELETE: Delete Message (Soft Delete)
export async function DELETE(req: NextRequest) {
    try {
        const user = await checkAuth();
        if (!user) {
            return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ ok: false, error: 'Message ID required' }, { status: 400 });
        }

        const messageId = parseInt(id);

        // Verify ownership (Sender or Recipient)
        const message = await prisma.adminMessage.findUnique({
            where: { id: messageId },
        });

        if (!message) {
            return NextResponse.json({ ok: false, error: 'Message not found' }, { status: 404 });
        }

        if (message.adminId !== user.userId && message.userId !== user.userId) {
            return NextResponse.json({ ok: false, error: 'Permission denied' }, { status: 403 });
        }

        // Soft Delete
        await prisma.adminMessage.update({
            where: { id: messageId },
            data: { isActive: false },
        });

        return NextResponse.json({ ok: true });

    } catch (error) {
        console.error('[Partner Messages DELETE] Error:', error);
        return NextResponse.json({ ok: false, error: 'Failed to delete message' }, { status: 500 });
    }
}
