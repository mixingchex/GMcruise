export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * 무료 체험 종료 후 재구매 안한 계정 자동 삭제
 * (cron job 또는 수동 실행용)
 */
export async function POST() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 'admin') {
      return NextResponse.json({ ok: false, message: '권한이 없습니다.' }, { status: 403 });
    }

    const now = new Date();
    const deletedAccounts = [];
    const skippedAccounts = [];

    // 성능 최적화: 직접 만료된 무료 체험 계정만 조회
    // Prisma는 JSON 필드에서 날짜 비교를 직접 지원하지 않으므로,
    // 모든 정액제 계약서를 조회한 후 필터링하되, isTrial이 true인 것만 먼저 필터링
    const expiredTrials = await prisma.affiliateContract.findMany({
      where: {
        AND: [
          {
            metadata: {
              path: ['contractType'],
              equals: 'SUBSCRIPTION_AGENT',
            },
          },
          {
            metadata: {
              path: ['isTrial'],
              equals: true,
            },
          },
        ],
      },
      include: {
        User_AffiliateContract_userIdToUser: {
          include: {
            AffiliateProfile: true,
          },
        },
      },
    });

    for (const contract of expiredTrials) {
      const metadata = (contract.metadata as any) || {};
      const trialEndDate = metadata.trialEndDate ? new Date(metadata.trialEndDate) : null;

      // 무료 체험 종료일이 지난 경우만 처리
      if (trialEndDate && now > trialEndDate) {
        // 재구매 여부 확인 (계약서 상태가 completed이고 결제가 완료된 경우)
        const hasPaid = contract.status === 'completed' && contract.contractEndDate && now < contract.contractEndDate;
        
        if (hasPaid) {
          // 재구매한 경우 스킵
          skippedAccounts.push({
            contractId: contract.id,
            userId: contract.userId,
            mallUserId: contract.User_AffiliateContract_userIdToUser?.mallUserId,
            reason: '재구매 완료',
          });
          continue;
        }

        // 데이터 사용량 확인
        const profileId = contract.User_AffiliateContract_userIdToUser?.AffiliateProfile?.id;
        let totalDataCount = 0;

        if (profileId) {
          const leadCount = await prisma.affiliateLead.count({
            where: {
              OR: [
                { agentId: profileId },
                { managerId: profileId },
              ],
            },
          });

          const saleCount = await prisma.affiliateSale.count({
            where: {
              OR: [
                { agentId: profileId },
                { managerId: profileId },
              ],
            },
          });

          const linkCount = await prisma.affiliateLink.count({
            where: {
              OR: [
                { agentId: profileId },
                { managerId: profileId },
              ],
            },
          });

          totalDataCount = leadCount + saleCount + linkCount;
        }

        // 데이터가 있으면 백업 후 삭제
        if (totalDataCount > 0) {
          // 자동 백업 (관리자 패널용)
          const backupData = {
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
            backupDate: new Date().toISOString(),
            backupReason: '무료 체험 종료 자동 삭제',
            dataCount: totalDataCount,
          };

          // Google Drive에 정액제 판매원 백업 파일 저장
          // 환경 변수에서 폴더 ID를 가져오거나 기본값 사용
          // 이 폴더는 정액제 판매원(gest) 백업 전용입니다.
          const BACKUP_FOLDER_ID = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID || '1HSV-t7Z7t8byMDJMY5srrpJ3ziGqz9xK';
          try {
            const { uploadFileToDrive } = await import('@/lib/google-drive');
            
            // 백업 데이터를 JSON 문자열로 변환
            const backupJson = JSON.stringify(backupData, null, 2);
            const backupBuffer = Buffer.from(backupJson, 'utf-8');
            
            // 파일명: {mallUserId}_deleted_backup_{날짜}_{시간}.json
            const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const fileName = `${contract.User_AffiliateContract_userIdToUser?.mallUserId || 'unknown'}_deleted_backup_${dateStr}.json`;
            
            const uploadResult = await uploadFileToDrive({
              folderId: BACKUP_FOLDER_ID,
              fileName,
              mimeType: 'application/json',
              buffer: backupBuffer,
              makePublic: false,
            });
            
            if (uploadResult.ok && uploadResult.url) {
              logger.log('[Auto Delete Expired Trials] Google Drive 백업 성공:', {
                contractId: contract.id,
                fileName,
                url: uploadResult.url,
              });
            } else {
              logger.warn('[Auto Delete Expired Trials] Google Drive 백업 실패:', uploadResult.error);
            }
          } catch (driveError: any) {
            logger.error('[Auto Delete Expired Trials] Google Drive 백업 오류:', driveError);
          }

          // 백업 데이터를 로그로도 저장 (백업)
          logger.log('[Auto Delete Expired Trials] Backup:', {
            contractId: contract.id,
            userId: contract.userId,
            dataCount: totalDataCount,
            backupData,
          });
        }

        // 계약서 삭제
        await prisma.affiliateContract.delete({
          where: { id: contract.id },
        });

        deletedAccounts.push({
          contractId: contract.id,
          userId: contract.userId,
          mallUserId: contract.User_AffiliateContract_userIdToUser?.mallUserId,
          dataCount: totalDataCount,
        });

        logger.log('[Auto Delete Expired Trials] Deleted:', {
          contractId: contract.id,
          userId: contract.userId,
          mallUserId: contract.User_AffiliateContract_userIdToUser?.mallUserId,
          dataCount: totalDataCount,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      message: `처리 완료: ${deletedAccounts.length}개 삭제, ${skippedAccounts.length}개 스킵`,
      deleted: deletedAccounts,
      skipped: skippedAccounts,
    });
  } catch (error: any) {
    logger.error('[Auto Delete Expired Trials API] Error:', error);
    return NextResponse.json(
      { ok: false, message: error.message || '자동 삭제 처리에 실패했습니다.' },
      { status: 500 }
    );
  }
}

