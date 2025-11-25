export const dynamic = 'force-dynamic';

export const runtime = 'nodejs'; // Edge Runtime 금지 (xlsx 라이브러리 사용)

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import * as XLSX from 'xlsx';
import { buildScopedGroupWhere } from '@/app/api/partner/customer-groups/utils';

/**
 * GET /api/partner/customer-groups/excel-upload
 * 엑셀 양식 파일 다운로드
 */
export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 샘플 데이터로 엑셀 파일 생성
    const sampleData = [
      { 이름: '홍길동', 연락처: '010-1234-5678', 이메일: 'hong@example.com', 비고: '' },
      { 이름: '김철수', 연락처: '010-2345-6789', 이메일: 'kim@example.com', 비고: '' },
      { 이름: '이영희', 연락처: '010-3456-7890', 이메일: 'lee@example.com', 비고: '' },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '고객목록');

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename*=UTF-8\'\'%EA%B3%A0%EA%B0%9D_%EC%9D%BC%EA%B4%84%EB%93%B1%EB%A1%9D_%EC%96%91%EC%8B%9D.xlsx',
      },
    });
  } catch (error: any) {
    console.error('[Partner Customer Groups Excel Download] Error:', error);
    console.error('[Partner Customer Groups Excel Download] Error stack:', error.stack);
    return NextResponse.json(
      { ok: false, error: error.message || '양식 파일 다운로드 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/partner/customer-groups/excel-upload
 * 엑셀 파일로 고객 일괄 등록
 */
export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const affiliateProfile = await prisma.affiliateProfile.findFirst({
      where: { userId: sessionUser.id },
      select: { id: true },
    });

    if (!affiliateProfile) {
      return NextResponse.json({ ok: false, error: 'Affiliate profile not found' }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const groupIdParam = formData.get('groupId') as string;

    if (!file) {
      return NextResponse.json({ ok: false, error: '파일이 필요합니다.' }, { status: 400 });
    }

    if (!groupIdParam) {
      return NextResponse.json({ ok: false, error: '그룹 ID가 필요합니다.' }, { status: 400 });
    }

    const groupId = Number(groupIdParam);
    if (!Number.isInteger(groupId)) {
      return NextResponse.json({ ok: false, error: '유효하지 않은 그룹 ID입니다.' }, { status: 400 });
    }

    const group = await prisma.customerGroup.findFirst({
      where: buildScopedGroupWhere(groupId, sessionUser.id, affiliateProfile.id),
      select: { id: true },
    });

    if (!group) {
      return NextResponse.json({ ok: false, error: '그룹을 찾을 수 없거나 권한이 없습니다.' }, { status: 404 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet) as any[];

    if (data.length === 0) {
      return NextResponse.json({ ok: false, error: '엑셀 파일에 데이터가 없습니다.' }, { status: 400 });
    }

    const normalizePhone = (phone: string | null | undefined): string | null => {
      if (!phone) return null;
      const digits = String(phone).replace(/\D/g, '');
      if (digits.length < 10) return null;
      return digits;
    };

    let addedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    const batchSize = 100;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);

      for (const row of batch) {
        try {
          const name = row['이름'] || row['name'] || row['Name'] || '';
          const phone =
            row['연락처'] ||
            row['전화번호'] ||
            row['휴대폰번호'] ||
            row['phone'] ||
            row['Phone'] ||
            '';
          const email = row['이메일'] || row['email'] || row['Email'] || null;
          const notes = row['비고'] || row['notes'] || row['Notes'] || null;

          if (!name || !phone) {
            errorCount++;
            errors.push(`행 ${i + batch.indexOf(row) + 2}: 이름과 전화번호는 필수입니다.`);
            continue;
          }

          const normalizedPhone = normalizePhone(phone);
          if (!normalizedPhone) {
            errorCount++;
            errors.push(`행 ${i + batch.indexOf(row) + 2}: 유효하지 않은 전화번호입니다.`);
            continue;
          }

          let customer = await prisma.user.findFirst({
            where: { phone: normalizedPhone },
          });

          if (!customer) {
            customer = await prisma.user.create({
              data: {
                name: String(name).trim(),
                phone: normalizedPhone,
                email: email ? String(email).trim() : null,
                password: '3800',
                role: 'user',
                customerStatus: 'active',
                customerSource: 'excel-import',
                metadata: notes ? { notes: String(notes).trim() } : null,
              },
            });
          } else if (notes) {
            const existingMetadata = (customer.metadata as any) || {};
            await prisma.user.update({
              where: { id: customer.id },
              data: {
                metadata: { ...existingMetadata, notes: String(notes).trim() },
              },
            });
          }

          try {
            await prisma.customerGroupMember.create({
              data: {
                groupId,
                userId: customer.id,
                addedBy: sessionUser.id,
              },
            });
            addedCount++;
          } catch (memberError: any) {
            if (memberError.code === 'P2002') {
              skippedCount++;
            } else {
              throw memberError;
            }
          }
        } catch (rowError: any) {
          errorCount++;
          errors.push(`행 ${i + batch.indexOf(row) + 2}: ${rowError.message || '처리 실패'}`);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      message: '엑셀 파일 업로드가 완료되었습니다.',
      summary: {
        total: data.length,
        added: addedCount,
        skipped: skippedCount,
        errors: errorCount,
      },
      errors: errors.slice(0, 10),
    });
  } catch (error: any) {
    console.error('[Partner Customer Groups Excel Upload] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || '엑셀 파일 업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
