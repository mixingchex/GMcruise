// app/api/community/my-info/update/route.ts
// 내 정보 수정 API (이름, 연락처, 비밀번호)

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    
    if (!session || !session.userId) {
      return NextResponse.json(
        { ok: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.userId);
    const body = await req.json();
    const { name, phone, password, currentPassword } = body;

    // 사용자 정보 조회
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
      }
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: '사용자 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const updateData: any = {};

    // 이름 업데이트
    if (name !== undefined && name.trim()) {
      updateData.name = name.trim();
    }

    // 연락처 업데이트
    if (phone !== undefined && phone.trim()) {
      // 연락처 중복 확인 (자신 제외)
      const existingUser = await prisma.user.findFirst({
        where: {
          phone: phone.trim(),
          id: { not: userId }
        }
      });

      if (existingUser) {
        return NextResponse.json(
          { ok: false, error: '이미 사용 중인 연락처입니다.' },
          { status: 400 }
        );
      }

      updateData.phone = phone.trim();
    }

    // 비밀번호 변경
    if (password !== undefined && password.trim()) {
      if (!currentPassword) {
        return NextResponse.json(
          { ok: false, error: '현재 비밀번호를 입력해주세요.' },
          { status: 400 }
        );
      }

      // 현재 비밀번호 확인
      // 비밀번호가 해시되어 있으면 bcrypt로 확인, 아니면 직접 비교
      let passwordValid = false;
      if (user.password) {
        if (user.password.startsWith('$2')) {
          // bcrypt 해시
          passwordValid = await bcrypt.compare(currentPassword, user.password);
        } else {
          // 평문 비밀번호
          passwordValid = user.password === currentPassword;
        }
      } else {
        // 비밀번호가 없으면 기본 비밀번호(3800)와 비교
        passwordValid = currentPassword === '3800';
      }

      if (!passwordValid) {
        return NextResponse.json(
          { ok: false, error: '현재 비밀번호가 올바르지 않습니다.' },
          { status: 400 }
        );
      }

      // 새 비밀번호 해시
      const hashedPassword = await bcrypt.hash(password.trim(), 10);
      updateData.password = hashedPassword;
    }

    // 업데이트 실행
    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: updateData
      });
    }

    return NextResponse.json({
      ok: true,
      message: '정보가 업데이트되었습니다.'
    });
  } catch (error: any) {
    console.error('[MY INFO UPDATE] Error:', error);
    return NextResponse.json(
      { 
        ok: false, 
        error: '정보 업데이트 중 오류가 발생했습니다.',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}

