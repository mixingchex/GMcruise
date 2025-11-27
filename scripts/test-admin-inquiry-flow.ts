import prisma from '../lib/prisma';
import { sendInquiryNotificationEmail } from '../lib/email';

async function main() {
  console.log('🧪 관리자 문의 알림 플로우 시뮬레이션 시작');

  const product = await prisma.cruiseProduct.findFirst({
    select: { productCode: true, packageName: true },
  });

  if (!product) {
    throw new Error('cruiseProduct 데이터가 없어 문의를 생성할 수 없습니다.');
  }

  const customerName = '테스트 문의 사용자';
  const normalizedPhone = `010${Math.floor(10000000 + Math.random() * 90000000)}`;
  const message = '시스템 자동 시뮬레이션으로 생성된 문의입니다.';

  const now = new Date();

  const inquiry = await prisma.productInquiry.create({
    data: {
      productCode: product.productCode,
      userId: null,
      name: customerName,
      phone: normalizedPhone,
      passportNumber: null,
      message,
      status: 'pending',
      updatedAt: now,
    },
    select: { id: true },
  });

  const emailSent = await sendInquiryNotificationEmail({
    inquiryId: inquiry.id,
    productCode: product.productCode,
    productName: product.packageName || product.productCode,
    customerName,
    customerPhone: normalizedPhone,
    message,
    isPhoneConsultation: false,
  });

  console.log('✅ 문의 레코드 생성 완료:', inquiry.id);
  console.log('📧 관리자 알림 이메일 전송 결과:', emailSent ? '성공' : '실패');
}

main()
  .catch((err) => {
    console.error('❌ 관리자 문의 플로우 시뮬레이션 실패:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

