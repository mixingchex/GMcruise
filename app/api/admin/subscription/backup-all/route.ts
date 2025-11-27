export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * 본사에서 모든 정액제 판매원 DB 전체 백업
 */
export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 'admin') {
      return NextResponse.json({ ok: false, message: '권한이 없습니다.' }, { status: 403 });
    }

    // 모든 정액제 판매원 계약서 조회
    const contracts = await prisma.affiliateContract.findMany({
      where: {
        metadata: {
          path: ['contractType'],
          equals: 'SUBSCRIPTION_AGENT',
        },
      },
      include: {
        User_AffiliateContract_userIdToUser: {
          include: {
            AffiliateProfile: true,
          },
        },
      },
    });

    const allBackupData = {
      backupDate: new Date().toISOString(),
      backupBy: sessionUser.id,
      backupType: 'manual_all', // 전체 수동 백업 표시
      totalSubscriptions: contracts.length,
      subscriptions: await Promise.all(
        contracts.map(async (contract) => {
          const profileId = contract.User_AffiliateContract_userIdToUser?.AffiliateProfile?.id;
          if (!profileId) {
            return {
              contractId: contract.id,
              userId: contract.userId,
              mallUserId: contract.User_AffiliateContract_userIdToUser?.mallUserId,
              hasProfile: false,
            };
          }

          const leads = await prisma.affiliateLead.findMany({
            where: {
              OR: [
                { agentId: profileId },
                { managerId: profileId },
              ],
            },
          });

          const sales = await prisma.affiliateSale.findMany({
            where: {
              OR: [
                { agentId: profileId },
                { managerId: profileId },
              ],
            },
          });

          const links = await prisma.affiliateLink.findMany({
            where: {
              OR: [
                { agentId: profileId },
                { managerId: profileId },
              ],
            },
          });

          return {
            contractId: contract.id,
            user: {
              id: contract.User_AffiliateContract_userIdToUser?.id,
              name: contract.User_AffiliateContract_userIdToUser?.name,
              phone: contract.User_AffiliateContract_userIdToUser?.phone,
              email: contract.User_AffiliateContract_userIdToUser?.email,
              mallUserId: contract.User_AffiliateContract_userIdToUser?.mallUserId,
            },
            profile: contract.User_AffiliateContract_userIdToUser?.AffiliateProfile,
            contract: {
              id: contract.id,
              name: contract.name,
              phone: contract.phone,
              status: contract.status,
              contractStartDate: contract.contractStartDate,
              contractEndDate: contract.contractEndDate,
            },
            leads: leads.map((lead) => ({
              id: lead.id,
              customerName: lead.customerName,
              customerPhone: lead.customerPhone,
              status: lead.status,
              createdAt: lead.createdAt,
            })),
            sales: sales.map((sale) => ({
              id: sale.id,
              productCode: sale.productCode,
              saleAmount: sale.saleAmount,
              status: sale.status,
              saleDate: sale.saleDate,
              createdAt: sale.createdAt,
            })),
            links: links.map((link) => ({
              id: link.id,
              productCode: link.productCode,
              status: link.status,
              createdAt: link.createdAt,
            })),
            summary: {
              leadCount: leads.length,
              saleCount: sales.length,
              linkCount: links.length,
            },
          };
        })
      ),
    };

    // Google Drive에 전체 백업 파일 저장 (자동 백업 시스템과 연동)
    const BACKUP_FOLDER_ID = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID || '1HSV-t7Z7t8byMDJMY5srrpJ3ziGqz9xK';
    let driveBackupUrl: string | null = null;
    
    try {
      const { uploadFileToDrive } = await import('@/lib/google-drive');
      
      // 백업 데이터를 JSON 문자열로 변환
      const backupJson = JSON.stringify(allBackupData, null, 2);
      const backupBuffer = Buffer.from(backupJson, 'utf-8');
      
      // 파일명: all_subscriptions_manual_backup_{날짜}_{시간}.json
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const fileName = `all_subscriptions_manual_backup_${dateStr}.json`;
      
      const uploadResult = await uploadFileToDrive({
        folderId: BACKUP_FOLDER_ID,
        fileName,
        mimeType: 'application/json',
        buffer: backupBuffer,
        makePublic: false,
      });
      
      if (uploadResult.ok && uploadResult.url) {
        driveBackupUrl = uploadResult.url;
        logger.log('[Subscription Backup All] Google Drive 업로드 성공:', {
          fileName,
          url: driveBackupUrl,
          totalSubscriptions: contracts.length,
        });
      } else {
        logger.warn('[Subscription Backup All] Google Drive 업로드 실패:', uploadResult.error);
      }
    } catch (driveError: any) {
      logger.error('[Subscription Backup All] Google Drive 업로드 오류:', driveError);
      // Google Drive 업로드 실패해도 로컬 다운로드는 계속 진행
    }

    const filename = `all_subscriptions_backup_${new Date().toISOString().split('T')[0]}.json`;

    return NextResponse.json({
      ok: true,
      message: driveBackupUrl 
        ? '전체 정액제 판매원 DB 백업이 완료되었습니다. (Google Drive에도 저장되었습니다)'
        : '전체 정액제 판매원 DB 백업이 완료되었습니다. (Google Drive 저장 실패, 로컬 다운로드만 가능)',
      data: allBackupData,
      filename,
      driveBackupUrl, // Google Drive URL 추가
    });
  } catch (error: any) {
    logger.error('[Admin Subscription Backup All API] Error:', error);
    return NextResponse.json(
      { ok: false, message: error.message || 'DB 백업에 실패했습니다.' },
      { status: 500 }
    );
  }
}

