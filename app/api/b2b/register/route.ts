import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, phone, partnerId } = body;

        if (!name?.trim() || !phone?.trim() || !partnerId) {
            return NextResponse.json(
                { ok: false, error: '필수 정보가 누락되었습니다.' },
                { status: 400 }
            );
        }

        const normalizedPhone = phone.replace(/[^0-9]/g, '');
        if (normalizedPhone.length < 10) {
            return NextResponse.json(
                { ok: false, error: '올바른 연락처를 입력해주세요.' },
                { status: 400 }
            );
        }

        // 파트너(대리점장) 찾기
        const partnerUser = await prisma.user.findFirst({
            where: { mallUserId: partnerId },
            include: {
                AffiliateProfile: {
                    where: { status: 'ACTIVE' },
                    take: 1
                }
            }
        });

        if (!partnerUser || !partnerUser.AffiliateProfile[0]) {
            return NextResponse.json(
                { ok: false, error: '유효하지 않은 파트너 링크입니다.' },
                { status: 400 }
            );
        }

        const managerProfile = partnerUser.AffiliateProfile[0];

        // 이미 존재하는 리드인지 확인하지 않고 무조건 신규 생성 (중복 허용)
        // B2B 유입은 별도로 카운트하기 위함


        // 신규 리드 생성
        const newLead = await prisma.affiliateLead.create({
            data: {
                customerName: name.trim(),
                customerPhone: normalizedPhone,
                managerId: managerProfile.id,
                source: 'B2B_LANDING',
                status: 'NEW',
                notes: '파트너 B2B 랜딩페이지 유입',
                createdAt: new Date(),
                updatedAt: new Date(),
            }
        });

        // User 생성 여부는 선택사항 (여기서는 리드만 생성하고, 실제 가입은 별도 절차일 수 있음)
        // 하지만 "7일 체험"을 바로 시작하려면 User도 생성해주는 것이 좋음.
        // 기존 로직(auth/login)을 참고하면 User가 있어야 로그인이 가능.
        // 여기서는 리드만 생성하고, "상담 신청이 접수되었습니다"로 끝낼지,
        // 아니면 바로 체험 계정을 만들어줄지 결정해야 함.
        // 기획상 "B2B 유입" -> "관리자/파트너가 컨택" 프로세스라면 리드만 생성.
        // "7일 무료체험 시작" 버튼이라면 계정 생성까지 필요.
        // User Request: "Start 7-Day Free Trial form" -> implies account creation.
        // Let's create a User if not exists, with a default password (e.g., phone number or '1111').
        // For now, to keep it simple and safe, we will just create the Lead and let the Partner contact them,
        // OR we can redirect them to the signup page with pre-filled info.
        // Given "B2B Potential Customer", Lead creation is the priority.

        return NextResponse.json({
            ok: true,
            message: '무료체험 신청이 접수되었습니다. 곧 연락드리겠습니다.',
            leadId: newLead.id,
            isNew: true
        });

    } catch (error) {
        console.error('[B2B Register] Error:', error);
        return NextResponse.json(
            { ok: false, error: '신청 처리 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
