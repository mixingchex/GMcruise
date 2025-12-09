// scripts/send-test-certificate.mjs
// 테스트 구매확인서 발송 스크립트

import { config } from 'dotenv';
config({ path: '.env.local' });

import nodemailer from 'nodemailer';

// 테스트 데이터
const testData = {
  customerName: '홍길동',
  customerEmail: 'hyeseon28@naver.com',
  birthDate: '1985-03-15',
  productName: 'MSC 그랜디오사 지중해 7박 8일 크루즈',
  paymentAmount: 3500000,
  paymentDate: '2024-12-09',
  orderId: 'TEST-SAMPLE-20241209',
  managerName: '김상담',
};

// 이메일 HTML 생성
function generateEmailHtml(data) {
  const formattedAmount = data.paymentAmount.toLocaleString('ko-KR');
  const formattedDate = new Date(data.paymentDate).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Malgun Gothic', 'Noto Sans KR', sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
      border-radius: 16px 16px 0 0;
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 28px;
      letter-spacing: 0.1em;
    }
    .header p {
      margin: 0;
      opacity: 0.9;
      font-size: 16px;
    }
    .content {
      background: white;
      padding: 40px 30px;
      border-radius: 0 0 16px 16px;
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 20px;
    }
    .info-box {
      background: #f8fafc;
      padding: 24px;
      margin: 24px 0;
      border-radius: 12px;
      border-left: 4px solid #2563eb;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .label {
      font-weight: 600;
      color: #64748b;
      font-size: 14px;
    }
    .value {
      color: #1e293b;
      font-weight: 500;
      text-align: right;
    }
    .amount {
      font-size: 20px;
      font-weight: 700;
      color: #2563eb;
    }
    .certificate-notice {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 12px;
      padding: 20px;
      margin: 24px 0;
      text-align: center;
    }
    .certificate-notice p {
      margin: 0;
      color: #1e40af;
      font-size: 14px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      color: #94a3b8;
      font-size: 12px;
    }
    .footer p {
      margin: 5px 0;
    }
    .cruise-icon {
      font-size: 40px;
      margin-bottom: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="cruise-icon">🚢</div>
      <h1>구매확인서</h1>
      <p>크루즈닷에서 발행되었습니다</p>
    </div>
    <div class="content">
      <p class="greeting">안녕하세요, <strong>${data.customerName}</strong>님!</p>
      <p>크루즈 여행 상품을 구매해 주셔서 감사합니다.<br>아래 내용을 확인해 주세요.</p>

      <div class="info-box">
        <div class="info-row">
          <span class="label">상품명</span>
          <span class="value">${data.productName}</span>
        </div>
        <div class="info-row">
          <span class="label">결제금액</span>
          <span class="value amount">${formattedAmount}원</span>
        </div>
        <div class="info-row">
          <span class="label">결제일자</span>
          <span class="value">${formattedDate}</span>
        </div>
        <div class="info-row">
          <span class="label">주문번호</span>
          <span class="value">${data.orderId}</span>
        </div>
      </div>

      <div class="certificate-notice">
        <p>📎 첨부된 구매확인증서 이미지를 확인해 주세요.</p>
        <p style="margin-top: 10px; font-size: 12px; color: #6b7280;">(이 테스트 메일에는 이미지가 첨부되지 않았습니다)</p>
      </div>

      <p>추가 문의사항이 있으시면 언제든지 연락 주세요.<br>즐거운 크루즈 여행 되세요! 🌊</p>

      <div class="footer">
        <p>본 메일은 테스트용으로 발송된 메일입니다.</p>
        <p>© ${new Date().getFullYear()} 크루즈닷. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

async function sendTestEmail() {
  console.log('=== 테스트 구매확인서 이메일 발송 ===\n');
  console.log('수신자:', testData.customerEmail);
  console.log('고객명:', testData.customerName);
  console.log('상품명:', testData.productName);
  console.log('결제금액:', testData.paymentAmount.toLocaleString() + '원');
  console.log('');

  // SMTP 설정 (EMAIL_SMTP_* 또는 SMTP_* 형식 지원)
  const smtpUser = process.env.EMAIL_SMTP_USER || process.env.SMTP_USER;
  const smtpPass = process.env.EMAIL_SMTP_PASSWORD || process.env.SMTP_PASS;
  const smtpHost = process.env.EMAIL_SMTP_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = process.env.EMAIL_SMTP_PORT || process.env.SMTP_PORT || '587';
  const fromName = process.env.EMAIL_FROM_NAME || '크루즈닷';

  if (!smtpUser || !smtpPass) {
    console.error('❌ SMTP 설정이 없습니다. .env.local 파일을 확인해주세요.');
    console.log('필요한 환경변수: EMAIL_SMTP_USER, EMAIL_SMTP_PASSWORD');
    return;
  }

  console.log('SMTP 설정:');
  console.log('  - Host:', smtpHost);
  console.log('  - User:', smtpUser);
  console.log('');

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: false,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    console.log('이메일 발송 중...');

    const info = await transporter.sendMail({
      from: `"${fromName}" <${smtpUser}>`,
      to: testData.customerEmail,
      subject: `[테스트] 구매확인서 - ${testData.productName}`,
      html: generateEmailHtml(testData),
    });

    console.log('');
    console.log('✅ 이메일 발송 성공!');
    console.log('Message ID:', info.messageId);
    console.log('');
    console.log(`📧 ${testData.customerEmail} 메일함을 확인해주세요.`);

  } catch (error) {
    console.error('❌ 이메일 발송 실패:', error.message);
    if (error.code === 'EAUTH') {
      console.log('\n💡 Gmail 사용 시 "앱 비밀번호"를 사용해야 합니다.');
      console.log('   https://myaccount.google.com/apppasswords');
    }
  }
}

sendTestEmail();
