import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug'); // 예: "코스타세레나/코스타 객실"
    const type = url.searchParams.get('type'); // "all" | "images" | "videos"
    if (!slug) {
      return NextResponse.json({ error: 'slug is required' }, { status: 400 });
    }

    // 크루즈정보사진 원본 폴더 사용 (백업 폴더는 삭제되었으므로 원본만 사용)
    const root = path.join(process.cwd(), 'public', '크루즈정보사진');
    const abs = path.join(root, slug);

    // 경로 검증 및 존재 확인
    if (!abs.startsWith(root) || !fs.existsSync(abs)) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    // 디렉토리인지 확인 (파일일 수도 있음)
    const stat = fs.statSync(abs);
    if (!stat.isDirectory()) {
      return NextResponse.json({ error: 'not a directory' }, { status: 400 });
    }

    const all = fs.readdirSync(abs);
    const images: string[] = [];
    const videos: string[] = [];

    for (const f of all) {
      const ext = path.extname(f).toLowerCase();
      const rel = `/크루즈정보사진/${slug}/${f}`;
      if (['.jpg','.jpeg','.png','.gif','.webp'].includes(ext)) images.push(rel);
      if (['.mp4','.webm','.mov'].includes(ext)) videos.push(rel);
    }

    const want = type === 'videos' ? { videos } :
                 type === 'images' ? { images } :
                 { images, videos };

    return NextResponse.json({ slug, ...want });
  } catch (e) {
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
} 