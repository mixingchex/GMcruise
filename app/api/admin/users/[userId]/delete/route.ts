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
    
    // 완전한 데이터베이스 삭제를 위해 트랜잭션을 사용하여 모든 관련 데이터를 명시적으로 삭제
    // SQLite에서는 foreign_keys를 비활성화하기 어려우므로, 모든 관련 데이터를 순서대로 삭제합니다.
    try {
      // 트랜잭션으로 모든 삭제 작업을 묶어서 실행
      await prisma.$transaction(async (tx) => {
        // Foreign keys를 비활성화 (SQLite에서는 연결별로 설정)
        await tx.$executeRaw`PRAGMA foreign_keys = OFF`;
        console.log('[Delete User] Foreign keys disabled');
        
        // 모든 관련 데이터 삭제 (Cascade delete가 없는 관계들)
        // 주의: 삭제 순서가 중요합니다. 자식 테이블을 먼저 삭제하고 부모 테이블을 나중에 삭제해야 합니다.
        const deleteQueries = [
        // 1. 가장 깊은 자식 테이블부터 삭제
        
        // Affiliate 관련 (깊은 자식부터)
        `DELETE FROM AffiliateMedia WHERE uploadedById = ${userId}`,
        `DELETE FROM AffiliateLinkEvent WHERE actorId = ${userId}`,
        `DELETE FROM AffiliateInteraction WHERE createdById = ${userId}`,
        `DELETE FROM AffiliateDocument WHERE uploadedById = ${userId} OR approvedById = ${userId}`,
        `UPDATE AffiliateContract SET reviewerId = NULL WHERE reviewerId = ${userId}`,
        `UPDATE AffiliateContract SET userId = NULL WHERE userId = ${userId}`,
        `DELETE FROM AffiliateLink WHERE issuedById = ${userId}`,
        `DELETE FROM AffiliateProfile WHERE userId = ${userId}`,
        
        // Commission 관련
        `UPDATE CommissionAdjustment SET approvedById = NULL WHERE approvedById = ${userId}`,
        `DELETE FROM CommissionAdjustment WHERE requestedById = ${userId}`,
        
        // CustomerGroup 관련
        `DELETE FROM CustomerGroupMember WHERE userId = ${userId} OR addedBy = ${userId}`,
        `DELETE FROM CustomerGroup WHERE adminId = ${userId}`,
        
        // LandingPage 관련
        `UPDATE LandingPageView SET userId = NULL WHERE userId = ${userId}`,
        `UPDATE LandingPageFunnel SET userId = NULL WHERE userId = ${userId}`,
        `UPDATE LandingPageRegistration SET userId = NULL WHERE userId = ${userId}`,
        `DELETE FROM LandingPage WHERE adminId = ${userId}`,
        
        // Marketing 관련
        `DELETE FROM MarketingAccount WHERE ownerId = ${userId}`,
        
        // Meeting 관련
        `DELETE FROM MeetingParticipant WHERE userId = ${userId}`,
        `DELETE FROM MeetingRoom WHERE hostId = ${userId}`,
        
        // Passport 관련
        `DELETE FROM PassportRequestLog WHERE adminId = ${userId} OR userId = ${userId}`,
        `UPDATE PassportRequestTemplate SET updatedById = NULL WHERE updatedById = ${userId}`,
        `DELETE FROM PassportSubmission WHERE userId = ${userId}`,
        
        // Settlement 관련
        `UPDATE MonthlySettlement SET approvedById = NULL WHERE approvedById = ${userId}`,
        `UPDATE SettlementEvent SET userId = NULL WHERE userId = ${userId}`,
        
        // FunnelMessage 관련
        `DELETE FROM FunnelMessage WHERE adminId = ${userId}`,
        
        // Admin 관련
        `DELETE FROM AdminActionLog WHERE adminId = ${userId} OR targetUserId = ${userId}`,
        `DELETE FROM AdminMessage WHERE adminId = ${userId}`,
        `UPDATE AdminMessage SET userId = NULL WHERE userId = ${userId}`,
        
        // 사용자 활동 데이터
        `DELETE FROM RePurchaseTrigger WHERE userId = ${userId}`,
        `DELETE FROM ChatHistory WHERE userId = ${userId}`,
        `DELETE FROM ChecklistItem WHERE userId = ${userId}`,
        `DELETE FROM Expense WHERE userId = ${userId}`,
        `DELETE FROM FeatureUsage WHERE userId = ${userId}`,
        `DELETE FROM UserActivity WHERE userId = ${userId}`,
        `DELETE FROM UserSchedule WHERE userId = ${userId}`,
        `DELETE FROM VisitedCountry WHERE userId = ${userId}`,
        `DELETE FROM MapTravelRecord WHERE userId = ${userId}`,
        `DELETE FROM MarketingInsight WHERE userId = ${userId}`,
        `DELETE FROM PushSubscription WHERE userId = ${userId}`,
        `DELETE FROM NotificationLog WHERE userId = ${userId}`,
        `DELETE FROM UserMessageRead WHERE userId = ${userId}`,
        `DELETE FROM LoginLog WHERE userId = ${userId}`,
        `DELETE FROM PasswordEvent WHERE userId = ${userId}`,
        `DELETE FROM Session WHERE userId = ${userId}`,
        `DELETE FROM TravelDiaryEntry WHERE userId = ${userId}`,
        
        // 여행 관련 (Cascade delete가 설정되어 있지만 명시적으로 삭제)
        `DELETE FROM Trip WHERE userId = ${userId}`,
        
        // 관리자 메시지 및 예약 메시지
        `DELETE FROM ScheduledMessage WHERE adminId = ${userId}`,
        `DELETE FROM EmailAddressBook WHERE adminId = ${userId}`,
        
        // 크루즈몰 컨텐츠는 userId를 null로 설정하여 보존
        `UPDATE ProductInquiry SET userId = NULL WHERE userId = ${userId}`,
        `UPDATE ProductView SET userId = NULL WHERE userId = ${userId}`,
        `UPDATE CommunityPost SET userId = NULL WHERE userId = ${userId}`,
        `UPDATE CommunityComment SET userId = NULL WHERE userId = ${userId}`,
        `UPDATE CruiseReview SET userId = NULL WHERE userId = ${userId}`,
        `UPDATE ChatBotSession SET userId = NULL WHERE userId = ${userId}`,
      ];
      
        let successCount = 0;
        let failCount = 0;
        
        // 모든 삭제 쿼리 실행
        for (const query of deleteQueries) {
          try {
            await tx.$executeRawUnsafe(query);
            successCount++;
          } catch (e: any) {
            // 일부 테이블이 존재하지 않을 수 있으므로 에러를 무시하고 계속 진행
            failCount++;
            console.warn(`[Delete User] Query warning: ${query.substring(0, 60)}... - ${e?.message}`);
          }
        }
        
        console.log(`[Delete User] Queries executed: ${successCount} success, ${failCount} failed`);
        
        // 사용자 삭제
        await tx.$executeRawUnsafe(`DELETE FROM User WHERE id = ${userId}`);
        console.log(`[Delete User] User ${userId} deleted`);
        
        // Foreign Key 제약 조건 재활성화
        await tx.$executeRaw`PRAGMA foreign_keys = ON`;
        console.log('[Delete User] Foreign keys re-enabled');
      }, {
        timeout: 30000, // 30초 타임아웃
      });
      
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
      // 트랜잭션이 실패하면 자동으로 롤백되므로 별도 처리가 필요 없습니다.
      // Foreign Key 제약 조건은 트랜잭션 내에서 처리되므로 여기서는 로깅만 합니다.
      console.error('[Delete User] Transaction failed, all changes rolled back');
      
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

