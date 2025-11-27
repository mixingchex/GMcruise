export const dynamic = 'force-dynamic';

// app/api/payapp/feedback/route.ts
// PayApp 결제 완료 통보 (feedbackurl)

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    // PayApp은 application/x-www-form-urlencoded 형식으로 전송
    const contentType = req.headers.get('content-type');
    let body: Record<string, string> = {};

    if (contentType?.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      formData.forEach((value, key) => {
        body[key] = value.toString();
      });
    } else {
      // JSON 형식도 지원
      body = await req.json();
    }

    const userid = body.userid;
    const linkkey = body.linkkey;
    const linkval = body.linkval;
    const pay_state = body.pay_state;
    const mul_no = body.mul_no;
    const var1 = body.var1; // contractId
    const var2 = body.var2; // contractType
    const price = body.price;
    const pay_date = body.pay_date;
    const pay_type = body.pay_type;

    // PayApp 설정 확인 (관리자 패널에서 저장한 값이 환경변수로 동기화됨)
    const payappUserid = process.env.PAYAPP_USERID;
    const payappLinkkey = process.env.PAYAPP_LINKKEY;
    const payappLinkval = process.env.PAYAPP_LINKVAL;

    // 보안 검증
    if (
      !payappUserid ||
      !payappLinkkey ||
      !payappLinkval ||
      userid !== payappUserid ||
      linkkey !== payappLinkkey ||
      linkval !== payappLinkval
    ) {
      console.error('[PayApp Feedback] 보안 검증 실패', {
        received: { userid, linkkey, linkval },
        expected: { payappUserid, payappLinkkey, payappLinkval },
      });
      return new NextResponse('FAIL', { status: 400 });
    }

    // var2로 랜딩페이지 결제인지 계약서 결제인지 구분
    const isLandingPagePayment = var2 && String(var2).startsWith('LP_');
    
    if (isLandingPagePayment) {
      // 랜딩페이지 결제 처리
      const orderId = var1; // var1에 orderId가 저장되어 있음
      const landingPageId = parseInt(String(var2).replace('LP_', '') || '0');
      
      if (!orderId) {
        console.error('[PayApp Feedback] 유효하지 않은 주문번호');
        return new NextResponse('FAIL', { status: 400 });
      }

      // orderId로 Payment 찾기
      const payment = await prisma.payment.findUnique({
        where: { orderId },
      });

      if (!payment) {
        console.error('[PayApp Feedback] 랜딩페이지 결제를 찾을 수 없습니다:', { orderId, mul_no, landingPageId });
        return new NextResponse('FAIL', { status: 404 });
      }

      // 결제 상태에 따른 처리
      switch (pay_state) {
        case '1':
          // 결제 요청
          console.log('[PayApp Feedback] 랜딩페이지 결제 요청:', mul_no, '주문번호:', orderId);
          break;

        case '4':
          // 결제 완료
          console.log('[PayApp Feedback] 랜딩페이지 결제 완료:', mul_no, '주문번호:', orderId);
          
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'completed',
              metadata: {
                ...(payment.metadata as any || {}),
                mul_no: mul_no,
                pay_date: pay_date,
                pay_type: pay_type,
                pay_state: 'completed',
              },
            },
          });
          break;

        case '8':
        case '32':
          // 요청 취소
          console.log('[PayApp Feedback] 랜딩페이지 결제 요청 취소:', mul_no);
          break;

        case '9':
        case '64':
          // 승인 취소
          console.log('[PayApp Feedback] 랜딩페이지 결제 승인 취소:', mul_no);
          
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'cancelled',
              metadata: {
                ...(payment.metadata as any || {}),
                pay_state: 'cancelled',
                cancel_date: new Date().toISOString(),
              },
            },
          });
          break;

        case '10':
          // 결제 대기 (가상계좌)
          console.log('[PayApp Feedback] 랜딩페이지 결제 대기:', mul_no);
          break;

        default:
          console.log('[PayApp Feedback] 랜딩페이지 결제 상태:', pay_state, mul_no);
      }
    } else {
      // 계약서 결제 처리 (기존 로직)
      const contractId = parseInt(var1 || '0');
      if (!contractId || isNaN(contractId)) {
        console.error('[PayApp Feedback] 유효하지 않은 계약서 ID');
        return new NextResponse('FAIL', { status: 400 });
      }

      // 계약서 조회
      const contract = await prisma.affiliateContract.findUnique({
        where: { id: contractId },
      });

      if (!contract) {
        console.error('[PayApp Feedback] 계약서를 찾을 수 없습니다:', contractId);
        return new NextResponse('FAIL', { status: 404 });
      }

      // 결제 상태에 따른 처리
      switch (pay_state) {
        case '1':
          // 결제 요청
          console.log('[PayApp Feedback] 결제 요청:', mul_no);
          break;

        case '4':
          // 결제 완료
          console.log('[PayApp Feedback] 결제 완료:', mul_no, '계약서 ID:', contractId);
          
          // 계약서 메타데이터에 결제 정보 저장
          const metadata = contract.metadata as any || {};
          metadata.payment = {
            mul_no: mul_no,
            price: parseInt(price || '0'),
            pay_date: pay_date,
            pay_type: pay_type,
            pay_state: 'completed',
          };

          // 정액제 판매원인 경우 무료 체험에서 정식 구독으로 전환
          if (var2 === 'SUBSCRIPTION_AGENT') {
            const now = new Date();
            const metadata = contract.metadata as any || {};
            const isCurrentlyTrial = metadata.isTrial === true;
            const currentTrialEndDate = metadata.trialEndDate ? new Date(metadata.trialEndDate) : null;
            const currentContractEndDate = contract.contractEndDate ? new Date(contract.contractEndDate) : null;
            
            let newContractEndDate: Date;
            
            if (isCurrentlyTrial && currentTrialEndDate) {
              // 무료 체험 중에 결제한 경우: 무료 체험 7일 다 쓰고 → 그 다음부터 1개월 시작
              newContractEndDate = new Date(currentTrialEndDate);
              newContractEndDate.setMonth(newContractEndDate.getMonth() + 1); // 무료 체험 종료일 + 1개월
              
              console.log('[PayApp Feedback] 무료 체험 중 결제 - 무료 체험 종료 후 구독 시작:', {
                trialEndDate: currentTrialEndDate.toISOString(),
                newContractEndDate: newContractEndDate.toISOString(),
              });
            } else if (currentContractEndDate && now < currentContractEndDate) {
              // 정식 구독 중에 미리 결제한 경우: 현재 구독 기간 끝까지 다 쓰고 → 그 다음부터 1개월 연장
              newContractEndDate = new Date(currentContractEndDate);
              newContractEndDate.setMonth(newContractEndDate.getMonth() + 1); // 현재 구독 종료일 + 1개월
              
              console.log('[PayApp Feedback] 정식 구독 중 미리 결제 - 구독 기간 연장:', {
                currentContractEndDate: currentContractEndDate.toISOString(),
                newContractEndDate: newContractEndDate.toISOString(),
              });
            } else {
              // 기존 구독이 만료된 경우: 지금부터 1개월
              newContractEndDate = new Date(now);
              newContractEndDate.setMonth(newContractEndDate.getMonth() + 1);
              
              console.log('[PayApp Feedback] 만료된 구독 재결제 - 지금부터 1개월:', {
                newContractEndDate: newContractEndDate.toISOString(),
              });
            }

            // 결제 정보 저장
            metadata.payment = {
              mul_no: mul_no,
              price: parseInt(price || '0'),
              pay_date: pay_date,
              pay_type: pay_type,
              pay_state: 'completed',
            };

            // 무료 체험 종료, 정식 구독 시작 (무료 체험 중이었던 경우만)
            if (isCurrentlyTrial) {
              metadata.isTrial = false;
              metadata.trialEndDate = null;
              metadata.subscriptionStartDate = now.toISOString();
            }
            
            metadata.lastPaymentDate = pay_date || now.toISOString();
            metadata.nextBillingDate = newContractEndDate.toISOString();

            // 계약서 정보 업데이트 (이름, 연락처)
            const userInfo = metadata.userInfo || {};
            const userName = userInfo.name || contract.name || '정액제 판매원';
            const userPhone = userInfo.phone || contract.phone || '';

            // gest 아이디 생성 (이름/연락처가 있고 아직 gest 아이디가 없는 경우)
            const user = await prisma.user.findUnique({
              where: { id: contract.userId },
            });

            let generatedMallUserId = user?.mallUserId;
            let generatedPassword = '';

            // trial_로 시작하는 임시 계정이거나 gest 아이디가 없는 경우
            if (user && (!user.mallUserId || user.mallUserId.startsWith('trial_'))) {
              // 다음 gest 아이디 찾기
              const existingGestUsers = await prisma.user.findMany({
                where: {
                  mallUserId: {
                    startsWith: 'gest',
                  },
                },
                orderBy: {
                  mallUserId: 'desc',
                },
                take: 1,
              });

              let nextNumber = 1;
              if (existingGestUsers.length > 0) {
                const lastUserId = existingGestUsers[0].mallUserId;
                const match = lastUserId.match(/gest(\d+)/);
                if (match) {
                  nextNumber = parseInt(match[1]) + 1;
                }
              }

              generatedMallUserId = `gest${nextNumber}`;
              
              // 비밀번호 자동 생성 (8자리 랜덤)
              const randomPassword = Math.random().toString(36).slice(-8) + Math.floor(Math.random() * 10);
              generatedPassword = randomPassword;

              // User 계정 업데이트
              await prisma.user.update({
                where: { id: user.id },
                data: {
                  name: userName,
                  phone: userPhone || user.phone,
                  mallUserId: generatedMallUserId,
                  password: generatedPassword, // 평문 저장 (기존 로직과 동일)
                },
              });

              // AffiliateProfile 업데이트
              const affiliateProfile = await prisma.affiliateProfile.findFirst({
                where: { userId: user.id },
              });

              if (affiliateProfile) {
                await prisma.affiliateProfile.update({
                  where: { id: affiliateProfile.id },
                  data: {
                    displayName: userName,
                    nickname: userName,
                    landingSlug: generatedMallUserId, // 개인몰 URL
                    updatedAt: now,
                  },
                });
              } else {
                // AffiliateProfile이 없으면 생성
                const affiliateCode = `GEST${nextNumber}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
                await prisma.affiliateProfile.create({
                  data: {
                    userId: user.id,
                    affiliateCode,
                    type: 'SALES_AGENT',
                    status: 'ACTIVE',
                    displayName: userName,
                    nickname: userName,
                    landingSlug: generatedMallUserId,
                    updatedAt: now,
                  },
                });
              }

              // 계약서 메타데이터에 생성된 계정 정보 저장
              metadata.accountInfo = {
                mallUserId: generatedMallUserId,
                password: generatedPassword,
                createdAt: now.toISOString(),
              };

              console.log('[PayApp Feedback] 정액제 계정 자동 생성 완료:', {
                userId: user.id,
                mallUserId: generatedMallUserId,
                password: generatedPassword,
              });
            }

            // 계약서 업데이트
            await prisma.affiliateContract.update({
              where: { id: contractId },
              data: {
                name: userName,
                phone: userPhone || contract.phone,
                status: 'completed',
                metadata: metadata,
                contractEndDate: newContractEndDate,
                updatedAt: now,
              },
            });

            console.log('[PayApp Feedback] 정액제 구독 전환/연장 완료:', {
              contractId,
              wasTrial: isCurrentlyTrial,
              contractEndDate: newContractEndDate.toISOString(),
              nextBillingDate: newContractEndDate.toISOString(),
              generatedMallUserId,
            });

            // 계약서 서명 페이지로 리다이렉트 (결제 완료 후)
            // 계약서 서명은 /affiliate/contract 페이지에서 처리
            // 결제 완료 후 계약서 서명 페이지로 이동하도록 returnurl 설정 필요
          } else {
            await prisma.affiliateContract.update({
              where: { id: contractId },
              data: {
                metadata: metadata,
              },
            });
          }
          break;

        case '8':
        case '32':
          // 요청 취소
          console.log('[PayApp Feedback] 결제 요청 취소:', mul_no);
          break;

        case '9':
        case '64':
          // 승인 취소
          console.log('[PayApp Feedback] 결제 승인 취소:', mul_no);
          
          // 계약서 메타데이터에 취소 정보 저장
          const cancelMetadata = contract.metadata as any || {};
          cancelMetadata.payment = {
            ...cancelMetadata.payment,
            pay_state: 'cancelled',
            cancel_date: new Date().toISOString(),
          };

          await prisma.affiliateContract.update({
            where: { id: contractId },
            data: {
              metadata: cancelMetadata,
            },
          });
          break;

        case '10':
          // 결제 대기 (가상계좌)
          console.log('[PayApp Feedback] 결제 대기:', mul_no);
          break;

        default:
          console.log('[PayApp Feedback] 알 수 없는 결제 상태:', pay_state);
      }
    }

    // PayApp에 성공 응답 (반드시 'SUCCESS' 반환)
    return new NextResponse('SUCCESS', { status: 200 });
  } catch (error: any) {
    console.error('[PayApp Feedback] Error:', error);
    // 오류 발생 시에도 'SUCCESS' 반환 (재시도 방지)
    return new NextResponse('SUCCESS', { status: 200 });
  }
}
