export const dynamic = 'force-dynamic';

// app/api/batch/sync-to-google/route.ts
// 1시간마다 실행되는 배치 작업: 최근 1시간 동안 작성된 데이터를 Google Sheets/Drive에 저장

import { NextResponse } from 'next/server';
// TODO: Implement Google Sheets sync functions
// import prisma from '@/lib/prisma';
// import { readFile } from 'fs/promises';
// import { join } from 'path';
// import {
//   saveReviewToSheets,
//   savePostToSheets,
//   saveCommentToSheets,
//   uploadReviewImageToDrive,
//   uploadPostImageToDrive,
//   uploadCommentImageToDrive
// } from '@/lib/google-sheets';

// 배치 작업 실행 (1시간마다 호출)
export async function POST(req: Request) {
  // Temporarily disabled until Google Sheets functions are implemented
  return NextResponse.json({
    ok: false,
    error: 'Google Sheets sync temporarily disabled',
    message: 'This feature is under development'
  }, { status: 503 });

  /*
  // Original implementation - commented out until Google Sheets functions are implemented
  try {
    // 보안: API 키 또는 환경 변수로 인증 (선택사항)
    const authHeader = req.headers.get('authorization');
    const expectedToken = process.env.BATCH_SYNC_TOKEN;

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // ... rest of implementation
  } catch (error: any) {
    console.error('[BATCH SYNC] Fatal error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'Batch sync failed',
        details: error?.message
      },
      { status: 500 }
    );
  }
  */
}

// GET: 배치 작업 상태 확인
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'Batch sync endpoint is active',
    instructions: 'POST to this endpoint to sync recent data to Google Sheets/Drive',
    schedule: 'Should be called every hour (e.g., via cron job)'
  });
}
