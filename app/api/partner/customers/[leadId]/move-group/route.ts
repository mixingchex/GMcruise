import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePartnerContext, PartnerApiError } from '@/app/api/partner/_utils';

function parseLeadId(raw: string | undefined) {
  const id = Number(raw);
  if (!raw || Number.isNaN(id) || id <= 0) {
    throw new PartnerApiError('유효한 고객 ID가 필요합니다.', 400);
  }
  return id;
}

// POST: 고객을 그룹으로 이동
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> | { leadId: string } }
) {
  try {
    const { profile } = await requirePartnerContext();
    if (!profile) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await Promise.resolve(params);
    const leadId = parseLeadId(resolvedParams.leadId);
    const body = await req.json().catch(() => ({}));
    const { groupId } = body;

    // 고객 소유권 확인
    const lead = await prisma.affiliateLead.findFirst({
      where: {
        id: leadId,
        OR: [
          { managerId: profile.id },
          { agentId: profile.id },
        ],
      },
    });

    if (!lead) {
      return NextResponse.json(
        { ok: false, message: 'Lead not found or access denied.' },
        { status: 404 }
      );
    }

    // 그룹 소유권 확인 (groupId가 null이 아닌 경우)
    // CustomerGroup 모델 사용 (판매원/대리점장 모두 자신의 그룹 사용)
    if (groupId !== null && groupId !== undefined) {
      const group = await prisma.customerGroup.findFirst({
        where: {
          id: parseInt(String(groupId)),
          affiliateProfileId: profile.id,
        },
      });

      if (!group) {
        return NextResponse.json(
          { ok: false, message: 'Group not found or access denied.' },
          { status: 404 }
        );
      }
    }

    // 고객 그룹 업데이트
    const updatedLead = await prisma.affiliateLead.update({
      where: { id: leadId },
      data: {
        groupId: groupId === null || groupId === undefined ? null : parseInt(String(groupId)),
      },
    });

    return NextResponse.json({
      ok: true,
      customer: updatedLead,
    });
  } catch (error: any) {
    console.error('[MoveGroup] POST error:', error);
    console.error('[MoveGroup] POST error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    // PartnerApiError인 경우 상태 코드 사용
    if (error?.status) {
      return NextResponse.json(
        { ok: false, message: error.message || 'Failed to move customer to group.' },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { 
        ok: false, 
        message: error?.message || 'Failed to move customer to group.',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      },
      { status: 500 }
    );
  }
}

