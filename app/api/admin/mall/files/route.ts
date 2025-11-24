// app/api/admin/mall/files/route.ts
// 업로드된 파일 목록 조회 API

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'cg.sid.v2';

// 관리자 권한 확인
async function checkAdminAuth() {
  const sid = cookies().get(SESSION_COOKIE)?.value;
  if (!sid) return null;

  try {
    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: {
        User: {
          select: { id: true, role: true },
        },
      },
    });

    if (!session || !session.User || session.User.role !== 'admin') {
      return null;
    }

    return session.User;
  } catch (error) {
    console.error('[Mall Files API] Auth check error:', error);
    return null;
  }
}

/**
 * GET: 업로드된 파일 목록 조회
 */
export async function GET(req: NextRequest) {
  try {
    // 관리자 권한 확인
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'all'; // 'image', 'video', 'all'

    const files: Array<{
      url: string;
      filename: string;
      size: number;
      type: string;
      uploadedAt: number;
    }> = [];

    // 이미지 파일 목록
    if (type === 'image' || type === 'all') {
      const imageDir = join(process.cwd(), 'public', 'uploads', 'images');
      if (existsSync(imageDir)) {
        try {
          const imageFiles = await readdir(imageDir);
          for (const filename of imageFiles) {
            const filepath = join(imageDir, filename);
            try {
              const stats = await stat(filepath);
              if (stats.isFile()) {
                const ext = filename.toLowerCase().split('.').pop() || '';
                if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
                  files.push({
                    url: `/uploads/images/${filename}`,
                    filename,
                    size: stats.size,
                    type: 'image',
                    uploadedAt: stats.mtimeMs,
                  });
                }
              }
            } catch (err) {
              // 개별 파일 읽기 실패는 무시
              console.warn(`Failed to stat ${filepath}:`, err);
            }
          }
        } catch (err) {
          console.error('Failed to read image directory:', err);
        }
      }
    }

    // 영상 파일 목록
    if (type === 'video' || type === 'all') {
      const videoDir = join(process.cwd(), 'public', 'uploads', 'videos');
      if (existsSync(videoDir)) {
        try {
          const videoFiles = await readdir(videoDir);
          for (const filename of videoFiles) {
            const filepath = join(videoDir, filename);
            try {
              const stats = await stat(filepath);
              if (stats.isFile()) {
                const ext = filename.toLowerCase().split('.').pop() || '';
                if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) {
                  files.push({
                    url: `/uploads/videos/${filename}`,
                    filename,
                    size: stats.size,
                    type: 'video',
                    uploadedAt: stats.mtimeMs,
                  });
                }
              }
            } catch (err) {
              // 개별 파일 읽기 실패는 무시
              console.warn(`Failed to stat ${filepath}:`, err);
            }
          }
        } catch (err) {
          console.error('Failed to read video directory:', err);
        }
      }
    }

    // 중복 제거 (URL 기준)
    const uniqueFiles = Array.from(
      new Map(files.map((file) => [file.url, file])).values()
    );

    // 업로드 시간 기준 내림차순 정렬 (최신순)
    uniqueFiles.sort((a, b) => b.uploadedAt - a.uploadedAt);

    return NextResponse.json({
      ok: true,
      files: uniqueFiles,
      count: uniqueFiles.length,
    });
  } catch (error) {
    console.error('[Mall Files API] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : '파일 목록을 불러올 수 없습니다.',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE: 파일 삭제
 */
export async function DELETE(req: NextRequest) {
  try {
    // 관리자 권한 확인
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const fileUrl = url.searchParams.get('url');

    if (!fileUrl) {
      return NextResponse.json(
        { ok: false, error: '파일 URL이 필요합니다.' },
        { status: 400 }
      );
    }

    // URL에서 실제 파일 경로 추출
    let filepath: string;
    if (fileUrl.startsWith('/uploads/images/')) {
      const filename = fileUrl.replace('/uploads/images/', '');
      filepath = join(process.cwd(), 'public', 'uploads', 'images', filename);
    } else if (fileUrl.startsWith('/uploads/videos/')) {
      const filename = fileUrl.replace('/uploads/videos/', '');
      filepath = join(process.cwd(), 'public', 'uploads', 'videos', filename);
    } else {
      return NextResponse.json(
        { ok: false, error: '유효하지 않은 파일 경로입니다.' },
        { status: 400 }
      );
    }

    // 보안: public/uploads 디렉토리 내부인지 확인
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    if (!filepath.startsWith(uploadsDir)) {
      return NextResponse.json(
        { ok: false, error: '접근할 수 없는 경로입니다.' },
        { status: 403 }
      );
    }

    // 파일 존재 확인
    if (!existsSync(filepath)) {
      return NextResponse.json(
        { ok: false, error: '파일을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 파일 삭제
    await unlink(filepath);

    return NextResponse.json({
      ok: true,
      message: '파일이 삭제되었습니다.',
    });
  } catch (error) {
    console.error('[Mall Files API] Delete error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : '파일 삭제에 실패했습니다.',
      },
      { status: 500 }
    );
  }
}



