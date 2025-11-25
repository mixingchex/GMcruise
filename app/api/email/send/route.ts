export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

/**
 * POST: 이메일 발송 API
 * FormData로 받은 이미지 파일을 첨부하여 이메일 발송
 */
export async function POST(req: NextRequest) {
  try {
    // FormData 파싱
    const formData = await req.formData();
    const to = formData.get('to') as string;
    const subject = formData.get('subject') as string;
    const file = formData.get('file') as File | null;

    // 필수 필드 검증
    if (!to || !subject) {
      return NextResponse.json(
        { success: false, error: '받는 사람(to)과 제목(subject)은 필수입니다.' },
        { status: 400 }
      );
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { success: false, error: '올바른 이메일 주소를 입력해주세요.' },
        { status: 400 }
      );
    }

    // SMTP 설정 (환경 변수 우선순위: EMAIL_USER/EMAIL_PASS > 기존 변수)
    const emailUser = process.env.EMAIL_USER || process.env.EMAIL_SMTP_USER || process.env.SMTP_USER;
    const emailPass = process.env.EMAIL_PASS || process.env.EMAIL_SMTP_PASSWORD || process.env.SMTP_PASS;
    const smtpHost = process.env.EMAIL_SMTP_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.EMAIL_SMTP_PORT || process.env.SMTP_PORT || '587');
    const fromAddress = process.env.EMAIL_FROM_ADDRESS || emailUser || 'noreply@cruisedot.com';

    // SMTP 설정 검증
    if (!emailUser || !emailPass) {
      console.error('[Email Send] SMTP credentials not configured');
      return NextResponse.json(
        { success: false, error: '이메일 서버 설정이 완료되지 않았습니다.' },
        { status: 500 }
      );
    }

    // nodemailer transporter 설정
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // 465 포트는 SSL 사용
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    // 첨부 파일 처리
    const attachments = [];
    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      attachments.push({
        filename: file.name || 'document.png',
        content: buffer,
        contentType: file.type || 'image/png',
      });
    }

    // HTML 본문 작성
    const htmlBody = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #4f46e5; margin-top: 0;">고객님, 요청하신 문서가 발급되었습니다.</h2>
          <p style="margin: 10px 0; font-size: 16px;">
            안녕하세요.<br>
            요청하신 문서를 첨부하여 발송해드립니다.<br>
            확인 후 필요하시면 보관하여 주시기 바랍니다.
          </p>
        </div>
        
        ${file ? `<div style="margin: 20px 0; padding: 15px; background-color: #f0f0f0; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px; color: #666;">
            <strong>첨부 파일:</strong> ${file.name || 'document.png'}
          </p>
        </div>` : ''}
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center;">
          <p style="font-size: 12px; color: #888; margin: 0; font-style: italic;">
            크루즈 첫여행 크루즈닷, 두번째 부터 행복하게 크루즈닷 감사합니다
          </p>
        </div>
      </body>
      </html>
    `;

    // 이메일 발송
    const mailOptions = {
      from: `"크루즈닷" <${fromAddress}>`,
      to: to,
      subject: subject,
      html: htmlBody,
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('[Email Send] Email sent successfully:', {
      to,
      subject,
      messageId: info.messageId,
      hasAttachment: attachments.length > 0,
    });

    return NextResponse.json(
      { success: true, messageId: info.messageId },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('[Email Send] Error:', {
      message: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      { 
        success: false, 
        error: '이메일 발송 중 오류가 발생했습니다.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
