/**
 * 기존 B2B 잠재고객 DB를 스프레드시트에 일괄 백업하는 스크립트
 * 실행: npx ts-node scripts/backup-existing-b2b-leads.ts
 */

import { google } from 'googleapis';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const B2B_BACKUP_SPREADSHEET_ID = '11_cfi841QGIDaBmYdjdk3aHYp2UYpCnx1QVVrgV7QJY';

function getServiceAccountAuth() {
    const privateKey = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL;

    if (!privateKey || !clientEmail) {
        throw new Error('Google Service Account credentials not configured');
    }

    return new google.auth.GoogleAuth({
        credentials: {
            client_email: clientEmail,
            private_key: privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
}

async function backupExistingLeads() {
    console.log('=== 기존 B2B 잠재고객 백업 시작 ===\n');

    // B2B_LANDING 소스로 들어온 모든 리드 조회 (계약서 이름 포함)
    const leads = await prisma.affiliateLead.findMany({
        where: {
            source: 'B2B_LANDING',
        },
        include: {
            AffiliateProfile_AffiliateLead_managerIdToAffiliateProfile: {
                select: {
                    displayName: true,
                    userId: true,
                },
            },
            AffiliateProfile_AffiliateLead_agentIdToAffiliateProfile: {
                select: {
                    displayName: true,
                    userId: true,
                },
            },
        },
        orderBy: { createdAt: 'asc' },
    });

    console.log(`총 ${leads.length}개의 B2B 리드 발견\n`);

    if (leads.length === 0) {
        console.log('백업할 데이터가 없습니다.');
        return;
    }

    // 파트너 userId 목록 수집
    const userIds = new Set<number>();
    leads.forEach(lead => {
        if (lead.AffiliateProfile_AffiliateLead_managerIdToAffiliateProfile?.userId) {
            userIds.add(lead.AffiliateProfile_AffiliateLead_managerIdToAffiliateProfile.userId);
        }
        if (lead.AffiliateProfile_AffiliateLead_agentIdToAffiliateProfile?.userId) {
            userIds.add(lead.AffiliateProfile_AffiliateLead_agentIdToAffiliateProfile.userId);
        }
    });

    // 계약서에서 실명 조회
    const contracts = await prisma.affiliateContract.findMany({
        where: {
            userId: { in: Array.from(userIds) },
            status: 'approved',
        },
        select: {
            userId: true,
            name: true,
        },
    });

    // userId -> 계약서 이름 맵
    const contractNameMap = new Map<number, string>();
    contracts.forEach(c => {
        if (c.userId) contractNameMap.set(c.userId, c.name);
    });

    // 스프레드시트에 추가할 데이터 준비
    const rows = leads.map(lead => {
        const managerProfile = lead.AffiliateProfile_AffiliateLead_managerIdToAffiliateProfile;
        const agentProfile = lead.AffiliateProfile_AffiliateLead_agentIdToAffiliateProfile;

        // 계약서 이름 우선, 없으면 displayName
        let partnerName = '본사';
        if (agentProfile) {
            partnerName = contractNameMap.get(agentProfile.userId) || agentProfile.displayName || '판매원';
        } else if (managerProfile) {
            partnerName = contractNameMap.get(managerProfile.userId) || managerProfile.displayName || '대리점장';
        }

        return [
            lead.customerName || '',
            lead.customerPhone || '',
            partnerName,
            lead.source || 'B2B_LANDING',
            lead.createdAt.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
            lead.notes || '',
        ];
    });

    // Google Sheets API로 데이터 추가
    const auth = getServiceAccountAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    try {
        // 1. B2B 시트 초기화 후 헤더 + 데이터 추가
        const b2bData = [
            ['이름', '연락처', '담당 파트너', '유입 경로', '등록일', '비고'],
            ...rows
        ];

        // 기존 데이터 지우고 새로 쓰기
        await sheets.spreadsheets.values.clear({
            spreadsheetId: B2B_BACKUP_SPREADSHEET_ID,
            range: 'B2B 잠재고객!A:F',
        }).catch(() => {
            // 시트가 없으면 무시
        });

        await sheets.spreadsheets.values.update({
            spreadsheetId: B2B_BACKUP_SPREADSHEET_ID,
            range: 'B2B 잠재고객!A1',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: b2bData,
            },
        });

        console.log(`✅ B2B 잠재고객: ${leads.length}개 백업 완료`);

        // 2. 시스템 상담 신청 백업
        await backupSystemConsultations(sheets);

        console.log(`\n📊 스프레드시트: https://docs.google.com/spreadsheets/d/${B2B_BACKUP_SPREADSHEET_ID}`);
    } catch (error) {
        console.error('❌ 백업 실패:', error);
    }

    await prisma.$disconnect();
}

async function backupSystemConsultations(sheets: any) {
    console.log('\n=== 시스템 상담 신청 백업 시작 ===');

    const consultations = await prisma.systemConsultation.findMany({
        include: {
            AffiliateProfile_SystemConsultation_managerIdToAffiliateProfile: {
                select: { displayName: true, userId: true },
            },
            AffiliateProfile_SystemConsultation_agentIdToAffiliateProfile: {
                select: { displayName: true, userId: true },
            },
        },
        orderBy: { createdAt: 'asc' },
    });

    console.log(`총 ${consultations.length}개의 시스템 상담 발견`);

    if (consultations.length === 0) {
        console.log('시스템 상담 데이터 없음');
        return;
    }

    // 파트너 userId 목록 수집
    const userIds = new Set<number>();
    consultations.forEach(c => {
        if (c.AffiliateProfile_SystemConsultation_managerIdToAffiliateProfile?.userId) {
            userIds.add(c.AffiliateProfile_SystemConsultation_managerIdToAffiliateProfile.userId);
        }
        if (c.AffiliateProfile_SystemConsultation_agentIdToAffiliateProfile?.userId) {
            userIds.add(c.AffiliateProfile_SystemConsultation_agentIdToAffiliateProfile.userId);
        }
    });

    // 계약서에서 실명 조회
    const contracts = await prisma.affiliateContract.findMany({
        where: {
            userId: { in: Array.from(userIds) },
            status: 'approved',
        },
        select: { userId: true, name: true },
    });

    const contractNameMap = new Map<number, string>();
    contracts.forEach(c => {
        if (c.userId) contractNameMap.set(c.userId, c.name);
    });

    const rows = consultations.map(c => {
        const managerProfile = c.AffiliateProfile_SystemConsultation_managerIdToAffiliateProfile;
        const agentProfile = c.AffiliateProfile_SystemConsultation_agentIdToAffiliateProfile;

        let partnerName = '본사';
        if (agentProfile) {
            partnerName = contractNameMap.get(agentProfile.userId) || agentProfile.displayName || '판매원';
        } else if (managerProfile) {
            partnerName = contractNameMap.get(managerProfile.userId) || managerProfile.displayName || '대리점장';
        }

        return [
            c.name || '',
            c.phone || '',
            partnerName,
            c.status || '',
            c.createdAt.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
            c.message || '',
        ];
    });

    const systemData = [
        ['이름', '연락처', '담당 파트너', '상태', '등록일', '문의내용'],
        ...rows
    ];

    // 시스템 상담 시트에 데이터 쓰기
    await sheets.spreadsheets.values.clear({
        spreadsheetId: B2B_BACKUP_SPREADSHEET_ID,
        range: '시스템 상담!A:F',
    }).catch(() => {});

    await sheets.spreadsheets.values.update({
        spreadsheetId: B2B_BACKUP_SPREADSHEET_ID,
        range: '시스템 상담!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: systemData,
        },
    });

    console.log(`✅ 시스템 상담: ${consultations.length}개 백업 완료`);
}

backupExistingLeads();
