import 'dotenv/config';
import prisma from '../lib/prisma';
import { logger } from '../lib/logger';

async function main() {
  logger.log('📝 누락된 기능 샘플 데이터 생성 시작...\n');

  try {
    // 1. 사용자 조회 (샘플 데이터 생성용)
    const users = await prisma.user.findMany({ take: 3 });
    if (users.length === 0) {
      logger.error('❌ 사용자가 없습니다. 먼저 사용자를 생성해주세요.');
      return;
    }
    const testUser = users[0];
    const adminUser = users.find(u => u.role === 'admin') || users[0];

    logger.log(`✅ 사용자 확인: ${users.length}명 (테스트 사용자: ${testUser.name})\n`);

    // 2. 여행 다이어리 (TravelDiaryEntry)
    logger.log('1️⃣ 여행 다이어리 샘플 생성...');
    try {
      // UserTrip 조회
      const userTrip = await prisma.userTrip.findFirst();
      if (userTrip) {
        const diary = await prisma.travelDiaryEntry.create({
          data: {
            userId: testUser.id,
            userTripId: userTrip.id,
            countryCode: 'JP',
            countryName: '일본',
            title: '첫 크루즈 여행 다이어리',
            content: '오늘은 크루즈에 탑승하는 첫날입니다. 선박이 정말 크고 아름답네요!',
            visitDate: new Date(),
            updatedAt: new Date(),
          },
        });
        logger.log(`   ✅ 여행 다이어리 생성 완료 (ID: ${diary.id})`);
      } else {
        logger.log('   ⚠️ UserTrip이 없어 여행 다이어리 생성 건너뜀');
      }
    } catch (error: any) {
      if (error.code === 'P2002') {
        logger.log('   ⚠️ 여행 다이어리 이미 존재함');
      } else {
        logger.error(`   ❌ 오류: ${error.message}`);
      }
    }

    // 3. 여권 요청 로그 (PassportRequestLog)
    logger.log('\n2️⃣ 여권 요청 로그 샘플 생성...');
    try {
      const passportRequest = await prisma.passportRequestLog.create({
        data: {
          userId: testUser.id,
          adminId: adminUser.id,
          messageBody: '여권 사본을 제출해주세요.',
          messageChannel: 'SMS',
          status: 'PENDING',
        },
      });
      logger.log(`   ✅ 여권 요청 로그 생성 완료 (ID: ${passportRequest.id})`);
    } catch (error: any) {
      if (error.code === 'P2002') {
        logger.log('   ⚠️ 여권 요청 로그 이미 존재함');
      } else {
        logger.error(`   ❌ 오류: ${error.message}`);
      }
    }

    // 4. 여권 제출 (PassportSubmission)
    logger.log('\n3️⃣ 여권 제출 샘플 생성...');
    try {
      const token = `passport-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const tokenExpiresAt = new Date();
      tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 7); // 7일 후 만료
      
      const passportSubmission = await prisma.passportSubmission.create({
        data: {
          userId: testUser.id,
          token,
          tokenExpiresAt,
          isSubmitted: false,
          updatedAt: new Date(),
        },
      });
      logger.log(`   ✅ 여권 제출 생성 완료 (ID: ${passportSubmission.id})`);
    } catch (error: any) {
      if (error.code === 'P2002') {
        logger.log('   ⚠️ 여권 제출 이미 존재함');
      } else {
        logger.error(`   ❌ 오류: ${error.message}`);
      }
    }

    // 5. 푸시 알림 구독 (PushSubscription)
    logger.log('\n4️⃣ 푸시 알림 구독 샘플 생성...');
    try {
      const pushSubscription = await prisma.pushSubscription.create({
        data: {
          userId: testUser.id,
          endpoint: `https://fcm.googleapis.com/fcm/send/sample-endpoint-${Date.now()}`,
          keys: {
            p256dh: 'sample-p256dh-key',
            auth: 'sample-auth-key',
          },
          userAgent: 'Mozilla/5.0 (sample)',
          updatedAt: new Date(),
        },
      });
      logger.log(`   ✅ 푸시 알림 구독 생성 완료 (ID: ${pushSubscription.id})`);
    } catch (error: any) {
      if (error.code === 'P2002') {
        logger.log('   ⚠️ 푸시 알림 구독 이미 존재함');
      } else {
        logger.error(`   ❌ 오류: ${error.message}`);
      }
    }

    // 6. 랜딩 페이지 뷰 (LandingPageView)
    logger.log('\n5️⃣ 랜딩 페이지 뷰 샘플 생성...');
    try {
      // LandingPage 조회 또는 생성
      let landingPage = await prisma.landingPage.findFirst();
      if (!landingPage) {
        landingPage = await prisma.landingPage.create({
          data: {
            adminId: adminUser.id,
            title: '샘플 랜딩 페이지',
            htmlContent: '<html><body><h1>샘플 랜딩 페이지</h1></body></html>',
            slug: `sample-landing-${Date.now()}`,
            updatedAt: new Date(),
          },
        });
      }
      
      if (landingPage) {
        const landingPageView = await prisma.landingPageView.create({
          data: {
            landingPageId: landingPage.id,
            ipAddress: '127.0.0.1',
            userAgent: 'Mozilla/5.0 (sample)',
            referer: 'https://example.com',
          },
        });
        logger.log(`   ✅ 랜딩 페이지 뷰 생성 완료 (ID: ${landingPageView.id})`);
      } else {
        logger.log('   ⚠️ LandingPage가 없어 랜딩 페이지 뷰 생성 건너뜀');
      }
    } catch (error: any) {
      if (error.code === 'P2002') {
        logger.log('   ⚠️ 랜딩 페이지 뷰 이미 존재함');
      } else {
        logger.error(`   ❌ 오류: ${error.message}`);
      }
    }

    // 7. 급여명세서 (AffiliatePayslip)
    logger.log('\n6️⃣ 급여명세서 샘플 생성...');
    try {
      // AffiliateProfile 조회
      const profile = await prisma.affiliateProfile.findFirst({
        where: { type: 'SALES_AGENT' },
      });

      if (profile) {
        const now = new Date();
        const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const payslip = await prisma.affiliatePayslip.create({
          data: {
            profileId: profile.id,
            period,
            type: 'MONTHLY',
            totalSales: 5000000,
            totalCommission: 1000000,
            totalWithholding: 33000, // 3.3% 원천징수
            netPayment: 967000,
            status: 'PENDING',
            updatedAt: new Date(),
          },
        });
        logger.log(`   ✅ 급여명세서 생성 완료 (ID: ${payslip.id})`);
      } else {
        logger.log('   ⚠️ 판매원 프로필이 없어 급여명세서 생성 건너뜀');
      }
    } catch (error: any) {
      if (error.code === 'P2002') {
        logger.log('   ⚠️ 급여명세서 이미 존재함');
      } else {
        logger.error(`   ❌ 오류: ${error.message}`);
      }
    }

    // 8. 스케줄된 메시지 (ScheduledMessage)
    logger.log('\n7️⃣ 스케줄된 메시지 샘플 생성...');
    try {
      const scheduledMessage = await prisma.scheduledMessage.create({
        data: {
          adminId: adminUser.id,
          title: '크루즈 여행 D-7 알림',
          category: '예약메시지',
          sendMethod: 'SMS',
          description: '크루즈 여행 D-7입니다. 준비물을 확인해주세요!',
          startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7일 후
          isActive: true,
          updatedAt: new Date(),
          ScheduledMessageStage: {
            create: {
              stageNumber: 1,
              daysAfter: 0,
              title: '크루즈 여행 D-7 알림',
              content: '크루즈 여행 D-7입니다. 준비물을 확인해주세요!',
              order: 0,
              updatedAt: new Date(),
            },
          },
        },
      });
      logger.log(`   ✅ 스케줄된 메시지 생성 완료 (ID: ${scheduledMessage.id})`);
    } catch (error: any) {
      if (error.code === 'P2002') {
        logger.log('   ⚠️ 스케줄된 메시지 이미 존재함');
      } else {
        logger.error(`   ❌ 오류: ${error.message}`);
      }
    }

    // 9. 마케팅 인사이트 (MarketingInsight)
    logger.log('\n8️⃣ 마케팅 인사이트 샘플 생성...');
    try {
      const marketingInsight = await prisma.marketingInsight.create({
        data: {
          userId: testUser.id,
          insightType: 'CUSTOMER_BEHAVIOR',
          data: {
            title: '고객 행동 분석 인사이트',
            content: '최근 1개월간 크루즈 상품 조회수가 20% 증가했습니다.',
            increase: 20,
            period: '1month',
          },
          updatedAt: new Date(),
        },
      });
      logger.log(`   ✅ 마케팅 인사이트 생성 완료 (ID: ${marketingInsight.id})`);
    } catch (error: any) {
      if (error.code === 'P2002') {
        logger.log('   ⚠️ 마케팅 인사이트 이미 존재함');
      } else {
        logger.error(`   ❌ 오류: ${error.message}`);
      }
    }

    // 10. 관리자 메시지 (AdminMessage)
    logger.log('\n9️⃣ 관리자 메시지 샘플 생성...');
    try {
      const adminMessage = await prisma.adminMessage.create({
        data: {
          adminId: adminUser.id,
          title: '시스템 점검 안내',
          content: '2025년 1월 30일 오전 2시부터 4시까지 시스템 점검이 예정되어 있습니다.',
          messageType: 'info',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      logger.log(`   ✅ 관리자 메시지 생성 완료 (ID: ${adminMessage.id})`);
    } catch (error: any) {
      if (error.code === 'P2002') {
        logger.log('   ⚠️ 관리자 메시지 이미 존재함');
      } else {
        logger.error(`   ❌ 오류: ${error.message}`);
      }
    }

    // 11. 로그인 로그 (LoginLog)
    logger.log('\n🔟 로그인 로그 샘플 생성...');
    try {
      const loginLog = await prisma.loginLog.create({
        data: {
          userId: testUser.id,
          kind: 'LOGIN_SUCCESS',
          message: '로그인 성공',
          meta: {
            ipAddress: '127.0.0.1',
            userAgent: 'Mozilla/5.0 (sample)',
          },
        },
      });
      logger.log(`   ✅ 로그인 로그 생성 완료 (ID: ${loginLog.id})`);
    } catch (error: any) {
      if (error.code === 'P2002') {
        logger.log('   ⚠️ 로그인 로그 이미 존재함');
      } else {
        logger.error(`   ❌ 오류: ${error.message}`);
      }
    }

    logger.log('\n' + '='.repeat(60));
    logger.log('\n✅ 누락된 기능 샘플 데이터 생성 완료!\n');
  } catch (error: any) {
    logger.error('❌ 샘플 데이터 생성 중 오류:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    logger.error('❌ 샘플 데이터 생성 실패:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

