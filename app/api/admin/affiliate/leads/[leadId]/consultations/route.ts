export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

// GET: 상담기록 조회 (관리자용 - 대리점장 API와 동일한 방식)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> | { leadId: string } }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ ok: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const resolvedParams = await params;
    const leadId = parseInt(resolvedParams.leadId);

    if (isNaN(leadId)) {
      return NextResponse.json({ ok: false, error: '유효한 고객 ID가 필요합니다.' }, { status: 400 });
    }

    // 병렬로 리드 정보와 상담기록 조회 (성능 최적화)
    const [lead, interactions] = await Promise.all([
      prisma.affiliateLead.findUnique({
        where: { id: leadId },
        select: {
          id: true,
          customerPhone: true,
        },
      }),
      prisma.affiliateInteraction.findMany({
        where: { leadId },
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        include: {
          User: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          AffiliateProfile: {
            select: {
              id: true,
              displayName: true,
              type: true,
            },
          },
          AffiliateMedia: {
            select: {
              id: true,
              storagePath: true,
              mimeType: true,
              metadata: true,
            },
          },
        },
      }),
    ]);

    if (!lead) {
      return NextResponse.json({ ok: false, error: '고객을 찾을 수 없습니다.' }, { status: 404 });
    }

    // customerPhone으로 User 찾기 및 CustomerNote 조회 (병렬 처리)
    let customerNotes: any[] = [];
    if (lead.customerPhone) {
      const normalizedPhone = lead.customerPhone.replace(/[^0-9]/g, '');
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: normalizedPhone },
            { phone: lead.customerPhone },
          ],
        },
        select: { id: true },
      });

      if (user) {
        customerNotes = await prisma.customerNote.findMany({
          where: { customerId: user.id },
          orderBy: { createdAt: 'desc' },
        });
      }
    }

    // 통합 상담기록 포맷 (대리점장 API와 동일)
    const consultationNotes = [
      // AffiliateInteraction → 통합 포맷
      ...interactions.map((interaction) => {
        const metadata = (interaction as any).metadata || {};
        const audioMedia = interaction.AffiliateMedia?.find(m =>
          m.mimeType?.startsWith('audio/') ||
          m.storagePath?.match(/\.(mp3|wav|m4a|ogg|webm)$/i)
        );

        return {
          id: interaction.id,
          type: 'interaction',
          content: interaction.note || '',
          consultedAt: interaction.occurredAt.toISOString(),
          nextActionDate: metadata.nextActionDate || null,
          nextActionNote: metadata.nextActionNote || null,
          statusAfter: metadata.statusAfter || interaction.interactionType,
          audioFileUrl: audioMedia?.storagePath || (audioMedia?.metadata as any)?.googleDriveUrl || metadata.audioFileUrl || null,
          createdByLabel: interaction.AffiliateProfile?.type === 'BRANCH_MANAGER' ? '대리점장' :
            interaction.AffiliateProfile?.type === 'SALES_AGENT' ? '판매원' : '본사',
          createdByName: interaction.AffiliateProfile?.displayName || interaction.User?.name || '관리자',
          createdAt: interaction.occurredAt.toISOString(),
        };
      }),
      // CustomerNote → 통합 포맷
      ...customerNotes.map((note) => ({
        id: `N-${note.id}`,
        type: 'note',
        content: note.content,
        consultedAt: note.consultedAt?.toISOString() || note.createdAt.toISOString(),
        nextActionDate: note.nextActionDate?.toISOString() || null,
        nextActionNote: note.nextActionNote,
        statusAfter: note.statusAfter,
        audioFileUrl: note.audioFileUrl,
        createdByLabel: note.createdByType === 'BRANCH_MANAGER' ? '대리점장' :
          note.createdByType === 'SALES_AGENT' ? '판매원' : '본사',
        createdByName: note.createdByName || '관리자',
        createdAt: note.createdAt.toISOString(),
      })),
    ]
      // 중복 제거 (동일 내용+시간 기준)
      .filter((item, index, self) => {
        const isDuplicate = self.findIndex(other =>
          other.content === item.content &&
          Math.abs(new Date(other.consultedAt).getTime() - new Date(item.consultedAt).getTime()) < 60000 // 1분 이내
        ) !== index;
        return !isDuplicate;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      ok: true,
      consultationNotes,
    });
  } catch (error) {
    console.error('[Admin Lead Consultations] GET Error:', error);
    return NextResponse.json({ ok: false, error: '상담기록 조회에 실패했습니다.' }, { status: 500 });
  }
}

// POST: 상담기록 저장 (관리자용 - 대리점장 API와 동일한 방식)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> | { leadId: string } }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ ok: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const resolvedParams = await params;
    const leadId = parseInt(resolvedParams.leadId);

    if (isNaN(leadId)) {
      return NextResponse.json({ ok: false, error: '유효한 고객 ID가 필요합니다.' }, { status: 400 });
    }

    const body = await req.json();
    const {
      content,
      consultedAt,
      nextActionDate,
      nextActionNote,
      statusAfter,
      audioFileUrl,
      interactionType = 'CONSULTATION',
    } = body;

    if (!content?.trim()) {
      return NextResponse.json({ ok: false, error: '상담 내용을 입력해주세요.' }, { status: 400 });
    }

    // 리드 정보 조회
    const lead = await prisma.affiliateLead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        managerId: true,
        agentId: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ ok: false, error: '고객을 찾을 수 없습니다.' }, { status: 404 });
    }

    // customerPhone으로 User 찾기 (CustomerNote 동기화용)
    let leadUserId: number | null = null;
    if (lead.customerPhone) {
      const normalizedPhone = lead.customerPhone.replace(/[^0-9]/g, '');
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: normalizedPhone },
            { phone: lead.customerPhone },
          ],
        },
        select: { id: true },
      });
      leadUserId = user?.id || null;
    }

    // 상담자 정보 (세션에서)
    const userId = sessionUser.id;

    // 관리자의 AffiliateProfile 조회 (있으면)
    let profileId: number | null = null;
    let consultantType = '본사';
    let consultantName = sessionUser.name || '관리자';

    if (userId) {
      const profile = await prisma.affiliateProfile.findFirst({
        where: { userId, status: 'ACTIVE' },
        select: { id: true, type: true, displayName: true },
      });

      if (profile) {
        profileId = profile.id;
        consultantName = profile.displayName || sessionUser.name || '관리자';
        if (profile.type === 'BRANCH_MANAGER') consultantType = '대리점장';
        else if (profile.type === 'SALES_AGENT') consultantType = '판매원';
      }
    }

    const occurredAt = consultedAt ? new Date(consultedAt) : new Date();

    // 트랜잭션으로 처리 (대리점장 API와 동일)
    const result = await prisma.$transaction(async (tx) => {
      // 1. AffiliateInteraction 생성
      const interaction = await tx.affiliateInteraction.create({
        data: {
          leadId,
          profileId,
          createdById: userId,
          interactionType: statusAfter || interactionType,
          occurredAt,
          note: content.trim(),
          metadata: {
            nextActionDate: nextActionDate || null,
            nextActionNote: nextActionNote || null,
            statusAfter: statusAfter || null,
            audioFileUrl: audioFileUrl || null,
          },
        },
        include: {
          User: {
            select: { id: true, name: true },
          },
        },
      });

      // 2. AffiliateLead 업데이트
      const updateData: any = {
        lastContactedAt: occurredAt,
        updatedAt: new Date(),
      };

      if (nextActionDate) {
        updateData.nextActionAt = new Date(nextActionDate);
      }

      if (statusAfter) {
        updateData.status = statusAfter;
      }

      await tx.affiliateLead.update({
        where: { id: leadId },
        data: updateData,
      });

      // 3. leadUserId가 있으면 CustomerNote도 생성 (본사 시스템과 동기화)
      let customerNote = null;
      if (leadUserId) {
        customerNote = await tx.customerNote.create({
          data: {
            customerId: leadUserId,
            createdBy: userId,
            createdByType: consultantType === '대리점장' ? 'BRANCH_MANAGER' :
              consultantType === '판매원' ? 'SALES_AGENT' : 'ADMIN',
            createdByName: consultantName,
            content: content.trim(),
            consultedAt: occurredAt,
            nextActionDate: nextActionDate ? new Date(nextActionDate) : null,
            nextActionNote: nextActionNote || null,
            statusAfter: statusAfter || null,
            audioFileUrl: audioFileUrl || null,
            isInternal: false,
            updatedAt: new Date(),
          },
        });

        // User 테이블의 다음 조치 알람도 업데이트
        if (nextActionDate) {
          await tx.user.update({
            where: { id: leadUserId },
            data: {
              nextActionDate: new Date(nextActionDate),
              nextActionNote: nextActionNote || null,
            },
          });
        }

        // 상담 후 상태 변경
        if (statusAfter) {
          await tx.user.update({
            where: { id: leadUserId },
            data: { customerStatus: statusAfter },
          });
        }
      }

      return { interaction, customerNote };
    });

    const createdInteraction = result.interaction;

    // Google 스프레드시트 백업 (비동기 dynamic import로 응답 속도 최적화)
    const createdAtStr = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    const consultedAtStr = occurredAt.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

    import('@/lib/google/b2b-backup').then(({ appendConsultationNoteToSheet }) => {
      appendConsultationNoteToSheet({
        consultationId: createdInteraction.id,
        customerId: leadId,
        customerName: lead.customerName || '',
        customerPhone: lead.customerPhone || '',
        consultedAt: consultedAtStr,
        content: content.trim(),
        consultantName: createdInteraction.User?.name || sessionUser.name || '관리자',
        consultantType,
        nextActionDate: nextActionDate || null,
        nextActionNote: nextActionNote || null,
        statusAfter: statusAfter || null,
        audioFileUrl: audioFileUrl || null,
        createdAt: createdAtStr,
      }).catch((err: any) => {
        console.error('[Admin Lead Consultations] 스프레드시트 백업 실패:', err);
      });
    });

    return NextResponse.json({
      ok: true,
      message: '상담기록이 저장되었습니다.',
      consultation: {
        id: createdInteraction.id,
        content: createdInteraction.note,
        consultedAt: createdInteraction.occurredAt.toISOString(),
        createdByName: createdInteraction.User?.name || sessionUser.name || '관리자',
        createdByLabel: consultantType,
      },
    });
  } catch (error) {
    console.error('[Admin Lead Consultations] POST Error:', error);
    return NextResponse.json({ ok: false, error: '상담기록 저장에 실패했습니다.' }, { status: 500 });
  }
}
