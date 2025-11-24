// app/api/admin/mall/cruise-photos/route.ts
// 크루즈정보사진 폴더 목록 및 이미지 조회 API

import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SESSION_COOKIE = 'cg.sid.v2';

async function checkAdminAuth() {
  const sessionId = cookies().get(SESSION_COOKIE)?.value;
  if (!sessionId) {
    return null;
  }

  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { User: true },
    });

    if (session && session.User.role === 'admin') {
      return session.User;
    }
  } catch (error) {
    console.error('[Admin Auth] Error:', error);
  }

  return null;
}

// GET: 폴더 목록 또는 특정 폴더의 이미지 목록 조회
export async function GET(req: NextRequest) {
  try {
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const folderPath = url.searchParams.get('folder'); // 예: "MSC벨리시마" 또는 "MSC벨리시마/객실"
    const listFolders = url.searchParams.get('listFolders') === 'true'; // 폴더 목록만 조회

    // 크루즈정보사진 원본 폴더 사용 (백업 폴더는 삭제되었으므로 원본만 사용)
    const rootDir = path.join(process.cwd(), 'public', '크루즈정보사진');

    if (!fs.existsSync(rootDir)) {
      return NextResponse.json({ ok: true, folders: [], images: [] });
    }

    // 폴더 목록 조회
    if (listFolders || !folderPath) {
      const folders: string[] = [];
      
      function scanDirectory(dir: string, relativePath: string = '') {
        try {
          // 디렉토리가 존재하고 접근 가능한지 확인
          if (!fs.existsSync(dir)) {
            return;
          }
          
          const stat = fs.statSync(dir);
          if (!stat.isDirectory()) {
            return;
          }
          
          const items = fs.readdirSync(dir, { withFileTypes: true });
          
          for (const item of items) {
            if (item.isDirectory()) {
              const folderName = item.name;
              const fullPath = path.join(dir, folderName);
              const relPath = relativePath ? `${relativePath}/${folderName}` : folderName;
              
              folders.push(relPath);
              // 재귀 호출 시에도 에러가 발생할 수 있으므로 안전하게 처리
              scanDirectory(fullPath, relPath);
            }
          }
        } catch (error) {
          // 개별 디렉토리 접근 실패는 무시하고 계속 진행
          console.warn(`[Cruise Photos API] Failed to scan directory ${dir}:`, error);
        }
      }
      
      scanDirectory(rootDir);
      
      return NextResponse.json({
        ok: true,
        folders: folders.sort(),
      });
    }

    // 특정 폴더의 이미지 목록 조회
    const targetDir = path.join(rootDir, folderPath);
    
    // 보안: rootDir 밖으로 나가지 않도록 확인
    if (!targetDir.startsWith(rootDir) || !fs.existsSync(targetDir)) {
      return NextResponse.json({ ok: false, error: 'Folder not found' }, { status: 404 });
    }

    // 디렉토리인지 확인
    const stat = fs.statSync(targetDir);
    if (!stat.isDirectory()) {
      return NextResponse.json({ ok: false, error: 'Path is not a directory' }, { status: 400 });
    }

    const images: string[] = [];
    const items = fs.readdirSync(targetDir, { withFileTypes: true });

    for (const item of items) {
      if (item.isFile()) {
        const ext = path.extname(item.name).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
          images.push(`/크루즈정보사진/${folderPath}/${item.name}`);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      folder: folderPath,
      images: images.sort(),
    });
  } catch (error: any) {
    console.error('[Cruise Photos API] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to fetch photos' },
      { status: 500 }
    );
  }
}



