export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  PartnerApiError,
  getPartnerLead,
  requirePartnerContext,
} from '@/app/api/partner/_utils';

function parseLeadId(raw: string | undefined) {
  const id = Number(raw);
  if (!raw || Number.isNaN(id) || id <= 0) {
    throw new PartnerApiError('유효한 고객 ID가 필요합니다.', 400);
  }
  return id;
}

/**
 * 파트너용 상담기록 조회 API
 * GET /api/partner/customers/[leadId]/consultations
 *
 * - 판매원: 본인 고객의 상담기록만 조회
 * - 대리점장: 본인 + 산하 판매원 고객의 상담기록 조회
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> | { leadId: string } }
) {
  let resolvedParams: { leadId: string } = { leadId: 'unknown' };
  try {
    const { profile } = await requirePartnerContext({ includeManagedAgents: true });
    resolvedParams = await params;
    const leadId = parseLeadId(resolvedParams.leadId);

    // 권한 체크: 해당 고객에 접근 가능한지 확인
    const lead = await getPartnerLead(profile.id, leadId, { interactions: 1 }, profile.type);

    if (!lead) {
      throw new PartnerApiError('고객을 찾을 수 없거나 접근 권한이 없습니다.', 404);
    }

    // 고객의 userId가 있으면 CustomerNote도 함께 조회
    const userId = lead.userId;

    // AffiliateInteraction 조회 (파트너 상담기록)
    const interactions = await prisma.affiliateInteraction.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      include: {
        AffiliateProfile: {
          select: {
            id: true,
            displayName: true,
            type: true,
          },
        },
        User: {
          select: {
            id: true,
            name: true,
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
    });

    // CustomerNote 조회 (userId가 있는 경우)
    let customerNotes: any[] = [];
    if (userId) {
      customerNotes = await prisma.customerNote.findMany({
        where: { customerId: userId },
        orderBy: { createdAt: 'desc' },
      });
    }

    // 통합 상담기록 포맷
    const consultations = [
      // AffiliateInteraction → 통합 포맷
      ...interactions.map((interaction) => {
        const audioMedia = interaction.AffiliateMedia?.find(m =>
          m.mimeType?.startsWith('audio/') ||
          m.storagePath?.match(/\.(mp3|wav|m4a|ogg|webm)$/i)
        );

        return {
          id: `I-${interaction.id}`,
          type: 'interaction',
          content: interaction.note || '',
          consultedAt: interaction.occurredAt.toISOString(),
          nextActionDate: null,
          nextActionNote: null,
          statusAfter: interaction.interactionType,
          audioFileUrl: audioMedia?.storagePath || (audioMedia?.metadata as any)?.googleDriveUrl || null,
          createdByLabel: interaction.AffiliateProfile?.type === 'BRANCH_MANAGER' ? '대리점장' :
            interaction.AffiliateProfile?.type === 'SALES_AGENT' ? '판매원' : '본사',
          createdByName: interaction.AffiliateProfile?.displayName || interaction.User?.name || '알 수 없음',
          createdAt: interaction.createdAt.toISOString(),
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
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ ok: true, consultations });
  } catch (error) {
    if (error instanceof PartnerApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    console.error(`GET /api/partner/customers/${resolvedParams.leadId}/consultations error:`, error);
    return NextResponse.json({ ok: false, message: '상담기록을 불러오지 못했습니다.' }, { status: 500 });
  }
}

/**
 * 파트너용 상담기록 추가 API
 * POST /api/partner/customers/[leadId]/consultations
 *
 * 본사의 CustomerNote + 파트너의 AffiliateInteraction 둘 다 생성
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> | { leadId: string } }
) {
  let resolvedParams: { leadId: string } = { leadId: 'unknown' };
  try {
    const { profile, sessionUser } = await requirePartnerContext({ includeManagedAgents: true });
    resolvedParams = await params;
    const leadId = parseLeadId(resolvedParams.leadId);

    // 권한 체크
    const lead = await getPartnerLead(profile.id, leadId, { interactions: 1 }, profile.type);

    if (!lead) {
      throw new PartnerApiError('고객을 찾을 수 없거나 접근 권한이 없습니다.', 404);
    }

    const body = await req.json();
    const {
      content,
      consultedAt,
      nextActionDate,
      nextActionNote,
      statusAfter,
      audioFileUrl,
    } = body;

    if (!content || !content.trim()) {
      throw new PartnerApiError('상담 내용을 입력해주세요.', 400);
    }

    // 상담자 정보
    const createdByType = profile.type || 'SALES_AGENT';
    const createdByName = profile.displayName || sessionUser.name || '파트너';

    // 트랜잭션으로 처리
    const result = await prisma.$transaction(async (tx) => {
      // 1. AffiliateInteraction 생성 (파트너 시스템용)
      const interaction = await tx.affiliateInteraction.create({
        data: {
          leadId,
          profileId: profile.id,
          createdById: sessionUser.id,
          interactionType: statusAfter || 'NOTE',
          occurredAt: consultedAt ? new Date(consultedAt) : new Date(),
          note: content.trim(),
        },
      });

      // 2. AffiliateLead 업데이트 (다음 조치 알람, 상태)
      const updateData: any = {
        lastContactedAt: consultedAt ? new Date(consultedAt) : new Date(),
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

      // 3. userId가 있으면 CustomerNote도 생성 (본사 시스템과 동기화)
      let customerNote = null;
      if (lead.userId) {
        customerNote = await tx.customerNote.create({
          data: {
            customerId: lead.userId,
            createdBy: sessionUser.id,
            createdByType,
            createdByName,
            content: content.trim(),
            consultedAt: consultedAt ? new Date(consultedAt) : new Date(),
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
            where: { id: lead.userId },
            data: {
              nextActionDate: new Date(nextActionDate),
              nextActionNote: nextActionNote || null,
            },
          });
        }

        // 상담 후 상태 변경
        if (statusAfter) {
          await tx.user.update({
            where: { id: lead.userId },
            data: { customerStatus: statusAfter },
          });
        }
      }

      return { interaction, customerNote };
    });

    // Google 스프레드시트 자동 백업 (비동기, 에러 무시)
    import('@/lib/google/customer-backup').then(({ backupCustomerToSheet }) => {
      if (lead.userId) {
        backupCustomerToSheet(lead.userId).catch((err: any) => {
          console.error('[Google Backup Error]', err);
        });
      }
    });

    return NextResponse.json({
      ok: true,
      consultation: {
        id: `I-${result.interaction.id}`,
        content: content.trim(),
        consultedAt: result.interaction.occurredAt.toISOString(),
        createdAt: result.interaction.createdAt.toISOString(),
      },
      message: '상담기록이 저장되었습니다.',
    });
  } catch (error) {
    if (error instanceof PartnerApiError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    }
    console.error(`POST /api/partner/customers/${resolvedParams.leadId}/consultations error:`, error);
    return NextResponse.json({ ok: false, message: '상담기록 저장에 실패했습니다.' }, { status: 500 });
  }
}
