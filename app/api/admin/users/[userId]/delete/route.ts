export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const startTime = Date.now();
  console.log('[Delete User] ============================================');
  console.log('[Delete User] DELETE REQUEST START');
  console.log('[Delete User] Timestamp:', new Date().toISOString());
  console.log('[Delete User] Params:', JSON.stringify(params));
  
  try {
    // getSessionUser()는 세션 만료 검증 포함, role 대소문자 정규화
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({
        ok: false,
        error: 'Admin access required',
        errorCode: 'NO_SESSION',
        timestamp: new Date().toISOString(),
      }, { status: 401 });
    }
    if (sessionUser.role?.toLowerCase() !== 'admin') {
      return NextResponse.json({
        ok: false,
        error: 'Admin access required',
        errorCode: 'NOT_ADMIN',
        timestamp: new Date().toISOString(),
      }, { status: 403 });
    }

    const { userId: userIdStr } = await params; const userId = parseInt(userIdStr);
    console.log('[Delete User] Parsed userId:', userId);
    
    if (isNaN(userId)) {
      console.log('[Delete User] Invalid user ID');
      return NextResponse.json({ 
        ok: false, 
        error: 'Invalid user ID',
        errorCode: 'INVALID_USER_ID',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // 사용자 존재 확인
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true, phone: true, adminMemo: true },
    });
    console.log('[Delete User] User found:', user ? `id=${user.id}, name=${user.name}` : 'NOT FOUND');

    if (!user) {
      console.log('[Delete User] User not found');
      return NextResponse.json({
        ok: false,
        error: 'User not found',
        errorCode: 'USER_NOT_FOUND',
        userId,
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    // 자기 자신 삭제 방지 (SessionUser 타입: id: number, userId 없음)
    if (sessionUser.id === userId) {
      return NextResponse.json({
        ok: false,
        error: '자기 자신의 계정은 삭제할 수 없습니다.',
        errorCode: 'CANNOT_DELETE_SELF',
        timestamp: new Date().toISOString(),
      }, { status: 403 });
    }

    // 관리자는 삭제 불가 (대소문자 무관)
    if (user.role?.toLowerCase() === 'admin') {
      console.log('[Delete User] Cannot delete admin user');
      return NextResponse.json({
        ok: false,
        error: 'Cannot delete admin user',
        errorCode: 'CANNOT_DELETE_ADMIN',
        userId,
        timestamp: new Date().toISOString(),
      }, { status: 403 });
    }

    // 보호된 계정은 삭제 불가 — DB의 adminMemo에 [보호계정] 마커로 관리
    // (어드민 메모에서 직접 설정/해제 가능, 코드/환경변수 변경 불필요)
    if (user.adminMemo?.includes('[보호계정]')) {
      return NextResponse.json({
        ok: false,
        error: `보호 계정으로 지정된 사용자는 삭제할 수 없습니다. (관리자 메모에서 [보호계정] 마커를 제거하면 삭제 가능)`,
        errorCode: 'CANNOT_DELETE_PROTECTED_TEST',
        userId,
        timestamp: new Date().toISOString(),
      }, { status: 403 });
    }

    console.log('[Delete User] Starting deletion process...');

    // 모든 관련 데이터 삭제를 단일 트랜잭션으로 원자 실행 (timeout 30초)
    // User 삭제가 실패하면 모든 정리 쿼리도 롤백되어 부분 삭제 방지
    try {
      const failedQueries: string[] = [];

      await prisma.$transaction(async (tx) => {
        // $executeRaw 태그드 템플릿: 파라미터 바인딩으로 SQL Injection 방지
        const safeExecute = async (fn: () => Promise<unknown>, label?: string) => {
          try { await fn(); } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            if (label) failedQueries.push(label);
            console.warn(`[Delete User] safeExecute 실패 (${label || 'unknown'}):`, msg);
          }
        };

        // 관련 데이터 NULL 처리
        await safeExecute(() => tx.$executeRaw`UPDATE "AffiliatePayslip" SET "approvedBy" = NULL WHERE "approvedBy" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`UPDATE "AffiliateContract" SET "reviewerId" = NULL WHERE "reviewerId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`UPDATE "AffiliateContract" SET "userId" = NULL WHERE "userId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`UPDATE "CommissionAdjustment" SET "approvedById" = NULL WHERE "approvedById" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`UPDATE "LandingPageView" SET "userId" = NULL WHERE "userId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`UPDATE "LandingPageFunnel" SET "userId" = NULL WHERE "userId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`UPDATE "LandingPageRegistration" SET "userId" = NULL WHERE "userId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`UPDATE "PassportRequestTemplate" SET "updatedById" = NULL WHERE "updatedById" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`UPDATE "MonthlySettlement" SET "approvedById" = NULL WHERE "approvedById" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`UPDATE "SettlementEvent" SET "userId" = NULL WHERE "userId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`UPDATE "AdminMessage" SET "userId" = NULL WHERE "userId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`UPDATE "ProductInquiry" SET "userId" = NULL WHERE "userId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`UPDATE "ProductView" SET "userId" = NULL WHERE "userId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`UPDATE "CommunityPost" SET "userId" = NULL WHERE "userId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`UPDATE "CommunityComment" SET "userId" = NULL WHERE "userId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`UPDATE "CruiseReview" SET "userId" = NULL WHERE "userId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`UPDATE "ChatBotSession" SET "userId" = NULL WHERE "userId" = ${userId}`);

        // 관련 데이터 삭제
        await safeExecute(() => tx.$executeRaw`DELETE FROM "AffiliateMedia" WHERE "uploadedById" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`DELETE FROM "AffiliateLinkEvent" WHERE "actorId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`DELETE FROM "AffiliateInteraction" WHERE "createdById" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`DELETE FROM "AffiliateDocument" WHERE "uploadedById" = ${userId} OR "approvedById" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`DELETE FROM "AffiliateLink" WHERE "issuedById" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`DELETE FROM "AffiliateProfile" WHERE "userId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`DELETE FROM "CommissionAdjustment" WHERE "requestedById" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`DELETE FROM "CustomerGroupMember" WHERE "userId" = ${userId} OR "addedBy" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`DELETE FROM "CustomerGroup" WHERE "adminId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`DELETE FROM "LandingPage" WHERE "adminId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`DELETE FROM "MarketingAccount" WHERE "ownerId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`DELETE FROM "MeetingParticipant" WHERE "userId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`DELETE FROM "MeetingRoom" WHERE "hostId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`DELETE FROM "PassportRequestLog" WHERE "adminId" = ${userId} OR "userId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`DELETE FROM "PassportSubmission" WHERE "userId" = ${userId}`, 'PassportSubmission');
        await safeExecute(() => tx.$executeRaw`DELETE FROM "FunnelMessage" WHERE "adminId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`DELETE FROM "CertificateApproval" WHERE "customerId" = ${userId} OR "requesterId" = ${userId} OR "approvedBy" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`DELETE FROM "CustomerNote" WHERE "customerId" = ${userId} OR "createdBy" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`DELETE FROM "AdminSmsConfig" WHERE "adminId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`DELETE FROM "AdminActionLog" WHERE "adminId" = ${userId} OR "targetUserId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`DELETE FROM "AdminMessage" WHERE "adminId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`DELETE FROM "AdminNotification" WHERE "userId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`DELETE FROM "CustomerJourney" WHERE "userId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`DELETE FROM "RePurchaseTrigger" WHERE "userId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`DELETE FROM "ChatHistory" WHERE "userId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`DELETE FROM "ChecklistItem" WHERE "userId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`DELETE FROM "Expense" WHERE "userId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`DELETE FROM "FeatureUsage" WHERE "userId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`DELETE FROM "UserActivity" WHERE "userId" = ${userId}`);
        // UserSchedule: onDelete:Cascade — User 삭제 시 DB가 자동 처리
        await safeExecute(() => tx.$executeRaw`DELETE FROM "VisitedCountry" WHERE "userId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`DELETE FROM "MapTravelRecord" WHERE "userId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`DELETE FROM "MarketingInsight" WHERE "userId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`DELETE FROM "PushSubscription" WHERE "userId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`DELETE FROM "NotificationLog" WHERE "userId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`DELETE FROM "UserMessageRead" WHERE "userId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`DELETE FROM "LoginLog" WHERE "userId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`DELETE FROM "PasswordEvent" WHERE "userId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`DELETE FROM "TravelDiaryEntry" WHERE "userId" = ${userId}`, 'TravelDiaryEntry');
        await safeExecute(() => tx.$executeRaw`DELETE FROM "Traveler" WHERE "userId" = ${userId}`, 'Traveler');
        // UserTrip: onDelete:Cascade — User 삭제 시 DB가 자동 처리
        // Trip 모델에는 userId 컬럼 없음 — Trip은 공유 자원이므로 유저 삭제 시 함께 삭제하지 않음
        // ScheduledMessageLog: onDelete:Cascade — User 삭제 시 DB가 자동 처리
        await safeExecute(() => tx.$executeRaw`DELETE FROM "ScheduledMessage" WHERE "adminId" = ${userId}`);
        await safeExecute(() => tx.$executeRaw`DELETE FROM "EmailAddressBook" WHERE "adminId" = ${userId}`);

        if (failedQueries.length > 0) {
          console.warn(`[Delete User] 실패한 정리 쿼리 ${failedQueries.length}건:`, failedQueries.join(', '));
        }

        // 핵심 삭제: FK 의존성 순서 준수 (safeExecute 없이 — 실패 시 전체 롤백)
        // Traveler(예약 기준) → Reservation → User 순으로 삭제
        // Session은 Session.userId onDelete: Cascade로 User 삭제 시 자동 삭제
        await tx.$executeRaw`DELETE FROM "Traveler" WHERE "reservationId" IN (SELECT id FROM "Reservation" WHERE "mainUserId" = ${userId})`;
        await tx.$executeRaw`DELETE FROM "Reservation" WHERE "mainUserId" = ${userId}`;
        await tx.$executeRaw`DELETE FROM "User" WHERE "id" = ${userId}`;
      }, { timeout: 30000 });
      
      console.log(`[Delete User] User ${userId} deleted`);
      
      const duration = Date.now() - startTime;
      console.log(`[Delete User] SUCCESS - Duration: ${duration}ms`);
      console.log('[Delete User] ============================================');
      
      return NextResponse.json({
        ok: true,
        message: `사용자 "${user.name || userId}"가 삭제되었습니다.`,
        userId,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });
      
    } catch (deleteError: any) {
      // 삭제 중 에러 발생
      console.error('[Delete User] Deletion failed');
      
      const errorMsg = deleteError?.message || String(deleteError);
      const errorCode = deleteError?.code || 'UNKNOWN';
      const duration = Date.now() - startTime;
      
      console.error('[Delete User] DELETION FAILED:', {
        userId,
        errorMessage: errorMsg,
        errorCode,
        errorName: deleteError?.name,
        duration: `${duration}ms`,
        stack: deleteError?.stack?.substring(0, 500),
      });
      console.log('[Delete User] ============================================');
      
      return NextResponse.json({
        ok: false,
        error: '사용자 삭제 실패',
        userId,
        timestamp: new Date().toISOString(),
      }, { status: 500 });
    }
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const errorMsg = error?.message || String(error);
    
    console.error('[Delete User] REQUEST ERROR:', {
      errorMessage: errorMsg,
      errorName: error?.name,
      duration: `${duration}ms`,
      stack: error?.stack?.substring(0, 500),
    });
    console.log('[Delete User] ============================================');
    
    return NextResponse.json({
      ok: false,
      error: '사용자 삭제에 실패했습니다',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
