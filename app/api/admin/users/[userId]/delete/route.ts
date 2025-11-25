export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'cg.sid.v2';

// 관리자 권한 확인
async function checkAdminAuth(sid: string | undefined): Promise<boolean> {
  if (!sid) return false;
  try {
    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: {
        User: {
          select: { role: true },
        },
      },
    });
    return session?.User.role === 'admin';
  } catch (error) {
    console.error('[Admin Delete User] Auth check error:', error);
    return false;
  }
}

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
    const sid = cookies().get(SESSION_COOKIE)?.value;
    console.log('[Delete User] Session ID:', sid ? `${sid.substring(0, 10)}...` : 'MISSING');
    
    if (!sid) {
      console.log('[Delete User] No session ID - returning 403');
      return NextResponse.json({ 
        ok: false, 
        error: 'Admin access required',
        errorCode: 'NO_SESSION',
        timestamp: new Date().toISOString(),
      }, { status: 403 });
    }
    
    const isAdmin = await checkAdminAuth(sid);
    console.log('[Delete User] Admin check result:', isAdmin);

    if (!isAdmin) {
      console.log('[Delete User] Not admin - returning 403');
      return NextResponse.json({ 
        ok: false, 
        error: 'Admin access required',
        errorCode: 'NOT_ADMIN',
        timestamp: new Date().toISOString(),
      }, { status: 403 });
    }

    const userId = parseInt(params.userId);
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
      select: { id: true, name: true, role: true },
    });
    console.log('[Delete User] User found:', user ? JSON.stringify(user) : 'NOT FOUND');

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

    // 관리자는 삭제 불가
    if (user.role === 'admin') {
      console.log('[Delete User] Cannot delete admin user');
      return NextResponse.json({ 
        ok: false, 
        error: 'Cannot delete admin user',
        errorCode: 'CANNOT_DELETE_ADMIN',
        userId,
        timestamp: new Date().toISOString(),
      }, { status: 403 });
    }

    console.log('[Delete User] Starting deletion process...');
    
    // 모든 관련 데이터 삭제 (트랜잭션 없이 개별 실행)
    try {
      const executeDelete = async (query: string) => {
        try {
          await prisma.$executeRawUnsafe(query);
        } catch (e) {
          // 개별 쿼리 실패는 무시하고 계속 진행
        }
      };

      // 관련 데이터 삭제 (NULL로 설정해야 하는 것들)
      await executeDelete(`UPDATE "AffiliatePayslip" SET "approvedBy" = NULL WHERE "approvedBy" = ${userId}`);
      await executeDelete(`UPDATE "AffiliateContract" SET "reviewerId" = NULL WHERE "reviewerId" = ${userId}`);
      await executeDelete(`UPDATE "AffiliateContract" SET "userId" = NULL WHERE "userId" = ${userId}`);
      await executeDelete(`UPDATE "CommissionAdjustment" SET "approvedById" = NULL WHERE "approvedById" = ${userId}`);
      await executeDelete(`UPDATE "LandingPageView" SET "userId" = NULL WHERE "userId" = ${userId}`);
      await executeDelete(`UPDATE "LandingPageFunnel" SET "userId" = NULL WHERE "userId" = ${userId}`);
      await executeDelete(`UPDATE "LandingPageRegistration" SET "userId" = NULL WHERE "userId" = ${userId}`);
      await executeDelete(`UPDATE "PassportRequestTemplate" SET "updatedById" = NULL WHERE "updatedById" = ${userId}`);
      await executeDelete(`UPDATE "MonthlySettlement" SET "approvedById" = NULL WHERE "approvedById" = ${userId}`);
      await executeDelete(`UPDATE "SettlementEvent" SET "userId" = NULL WHERE "userId" = ${userId}`);
      await executeDelete(`UPDATE "AdminMessage" SET "userId" = NULL WHERE "userId" = ${userId}`);
      await executeDelete(`UPDATE "ProductInquiry" SET "userId" = NULL WHERE "userId" = ${userId}`);
      await executeDelete(`UPDATE "ProductView" SET "userId" = NULL WHERE "userId" = ${userId}`);
      await executeDelete(`UPDATE "CommunityPost" SET "userId" = NULL WHERE "userId" = ${userId}`);
      await executeDelete(`UPDATE "CommunityComment" SET "userId" = NULL WHERE "userId" = ${userId}`);
      await executeDelete(`UPDATE "CruiseReview" SET "userId" = NULL WHERE "userId" = ${userId}`);
      await executeDelete(`UPDATE "ChatBotSession" SET "userId" = NULL WHERE "userId" = ${userId}`);
      
      // 관련 데이터 삭제
      await executeDelete(`DELETE FROM "AffiliateMedia" WHERE "uploadedById" = ${userId}`);
      await executeDelete(`DELETE FROM "AffiliateLinkEvent" WHERE "actorId" = ${userId}`);
      await executeDelete(`DELETE FROM "AffiliateInteraction" WHERE "createdById" = ${userId}`);
      await executeDelete(`DELETE FROM "AffiliateDocument" WHERE "uploadedById" = ${userId} OR "approvedById" = ${userId}`);
      await executeDelete(`DELETE FROM "AffiliateLink" WHERE "issuedById" = ${userId}`);
      await executeDelete(`DELETE FROM "AffiliateProfile" WHERE "userId" = ${userId}`);
      await executeDelete(`DELETE FROM "CommissionAdjustment" WHERE "requestedById" = ${userId}`);
      await executeDelete(`DELETE FROM "CustomerGroupMember" WHERE "userId" = ${userId} OR "addedBy" = ${userId}`);
      await executeDelete(`DELETE FROM "CustomerGroup" WHERE "adminId" = ${userId}`);
      await executeDelete(`DELETE FROM "LandingPage" WHERE "adminId" = ${userId}`);
      await executeDelete(`DELETE FROM "MarketingAccount" WHERE "ownerId" = ${userId}`);
      await executeDelete(`DELETE FROM "MeetingParticipant" WHERE "userId" = ${userId}`);
      await executeDelete(`DELETE FROM "MeetingRoom" WHERE "hostId" = ${userId}`);
      await executeDelete(`DELETE FROM "PassportRequestLog" WHERE "adminId" = ${userId} OR "userId" = ${userId}`);
      await executeDelete(`DELETE FROM "PassportSubmission" WHERE "userId" = ${userId}`);
      await executeDelete(`DELETE FROM "FunnelMessage" WHERE "adminId" = ${userId}`);
      await executeDelete(`DELETE FROM "CertificateApproval" WHERE "customerId" = ${userId} OR "requesterId" = ${userId} OR "approvedBy" = ${userId}`);
      await executeDelete(`DELETE FROM "CustomerNote" WHERE "customerId" = ${userId} OR "createdBy" = ${userId}`);
      await executeDelete(`DELETE FROM "AdminSmsConfig" WHERE "adminId" = ${userId}`);
      await executeDelete(`DELETE FROM "AdminActionLog" WHERE "adminId" = ${userId} OR "targetUserId" = ${userId}`);
      await executeDelete(`DELETE FROM "AdminMessage" WHERE "adminId" = ${userId}`);
      await executeDelete(`DELETE FROM "AdminNotification" WHERE "userId" = ${userId}`);
      await executeDelete(`DELETE FROM "CustomerJourney" WHERE "userId" = ${userId}`);
      await executeDelete(`DELETE FROM "RePurchaseTrigger" WHERE "userId" = ${userId}`);
      await executeDelete(`DELETE FROM "ChatHistory" WHERE "userId" = ${userId}`);
      await executeDelete(`DELETE FROM "ChecklistItem" WHERE "userId" = ${userId}`);
      await executeDelete(`DELETE FROM "Expense" WHERE "userId" = ${userId}`);
      await executeDelete(`DELETE FROM "FeatureUsage" WHERE "userId" = ${userId}`);
      await executeDelete(`DELETE FROM "UserActivity" WHERE "userId" = ${userId}`);
      await executeDelete(`DELETE FROM "UserSchedule" WHERE "userId" = ${userId}`);
      await executeDelete(`DELETE FROM "VisitedCountry" WHERE "userId" = ${userId}`);
      await executeDelete(`DELETE FROM "MapTravelRecord" WHERE "userId" = ${userId}`);
      await executeDelete(`DELETE FROM "MarketingInsight" WHERE "userId" = ${userId}`);
      await executeDelete(`DELETE FROM "PushSubscription" WHERE "userId" = ${userId}`);
      await executeDelete(`DELETE FROM "NotificationLog" WHERE "userId" = ${userId}`);
      await executeDelete(`DELETE FROM "UserMessageRead" WHERE "userId" = ${userId}`);
      await executeDelete(`DELETE FROM "LoginLog" WHERE "userId" = ${userId}`);
      await executeDelete(`DELETE FROM "PasswordEvent" WHERE "userId" = ${userId}`);
      await executeDelete(`DELETE FROM "Session" WHERE "userId" = ${userId}`);
      await executeDelete(`DELETE FROM "TravelDiaryEntry" WHERE "userId" = ${userId}`);
      await executeDelete(`DELETE FROM "Traveler" WHERE "userId" = ${userId}`);
      await executeDelete(`DELETE FROM "Traveler" WHERE "reservationId" IN (SELECT id FROM "Reservation" WHERE "mainUserId" = ${userId})`);
      await executeDelete(`DELETE FROM "Reservation" WHERE "mainUserId" = ${userId}`);
      await executeDelete(`DELETE FROM "UserTrip" WHERE "userId" = ${userId}`);
      await executeDelete(`DELETE FROM "Trip" WHERE "userId" = ${userId}`);
      await executeDelete(`DELETE FROM "ScheduledMessageLog" WHERE "userId" = ${userId}`);
      await executeDelete(`DELETE FROM "ScheduledMessage" WHERE "adminId" = ${userId}`);
      await executeDelete(`DELETE FROM "EmailAddressBook" WHERE "adminId" = ${userId}`);
      
      // 마지막으로 User 삭제
      await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE "id" = ${userId}`);
      
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
        errorMessage: errorMsg,
        errorCode,
        errorName: deleteError?.name || 'Unknown',
        userId,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        details: {
          message: errorMsg,
          code: errorCode,
          name: deleteError?.name,
        }
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
      errorMessage: errorMsg,
      errorName: error?.name || 'Unknown',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      details: {
        message: errorMsg,
        name: error?.name,
      }
    }, { status: 500 });
  }
}
