# 🎯 판매 확정 프로세스 구현 가이드

> **작성일**: 2025-01-28  
> **목적**: 판매원/대리점장이 녹음 파일을 첨부하여 판매 확정 요청하고, 관리자가 승인하는 시스템 구현  
> **난이도**: 초보자도 따라할 수 있도록 쉽게 설명

---

## 📋 목차

1. [전체 프로세스 이해하기](#1-전체-프로세스-이해하기)
2. [1단계: 데이터베이스 수정](#2-1단계-데이터베이스-수정)
3. [2단계: Google Drive 업로드 함수 만들기](#3-2단계-google-drive-업로드-함수-만들기)
4. [3단계: 판매 확정 요청 API 만들기](#4-3단계-판매-확정-요청-api-만들기)
5. [4단계: 관리자 승인/거부 API 만들기](#5-4단계-관리자-승인거부-api-만들기)
6. [5단계: UI 만들기](#6-5단계-ui-만들기)
7. [6단계: 알림 기능 추가](#7-6단계-알림-기능-추가)
8. [테스트 방법](#8-테스트-방법)

---

## 1. 전체 프로세스 이해하기

### 🎬 시나리오

**상황**: 판매원 김철수가 고객과 통화를 했고, 고객이 구매를 결정했습니다.

**과정**:
1. 김철수가 통화 녹음 파일을 준비합니다
2. 판매 확정 요청 페이지에서 녹음 파일을 업로드합니다
3. 시스템이 Google Drive에 파일을 저장합니다
4. 관리자에게 "승인 대기" 알림이 갑니다
5. 관리자가 Google Drive 링크를 클릭해서 녹음을 확인합니다
6. 관리자가 승인하면 자동으로 수당이 계산됩니다
7. 김철수에게 "승인 완료" 알림이 갑니다

### 📊 상태 흐름도

```
PENDING (초기 상태)
    ↓
[판매원/대리점장이 요청 제출]
    ↓
PENDING_APPROVAL (승인 대기)
    ↓
[관리자가 확인 후]
    ├─→ APPROVED (승인) → 수당 자동 계산 ✅
    └─→ REJECTED (거부) → 수정 가능 🔄
```

---

## 2. 1단계: 데이터베이스 수정

### 📝 설명
데이터베이스에 "녹음 파일 정보"와 "승인 정보"를 저장할 공간을 만들어야 합니다.

### 🔧 작업 내용

**파일**: `prisma/schema.prisma`

**AffiliateSale 모델에 추가할 필드들**:

```prisma
model AffiliateSale {
  // ... 기존 필드들 ...
  
  // 🆕 추가할 필드들
  audioFileGoogleDriveId String?        // Google Drive 파일 ID
  audioFileGoogleDriveUrl String?       // Google Drive 공유 링크
  audioFileName String?                 // 원본 파일명
  submittedById Int?                    // 요청 제출자 ID (판매원/대리점장)
  submittedAt DateTime?                 // 요청 제출 시간
  approvedById Int?                     // 승인한 관리자 ID
  approvedAt DateTime?                  // 승인 시간
  rejectedById Int?                     // 거부한 관리자 ID
  rejectedAt DateTime?                  // 거부 시간
  rejectionReason String?               // 거부 사유
  
  // ... 기존 필드들 ...
}
```

### 📌 중요 사항
- `?` 표시는 "없어도 됨"을 의미합니다
- `String?`은 "텍스트 또는 없음"
- `Int?`는 "숫자 또는 없음"
- `DateTime?`은 "날짜/시간 또는 없음"

### ✅ 실행 방법

1. **파일 열기**: `prisma/schema.prisma` 파일을 엽니다
2. **AffiliateSale 모델 찾기**: `model AffiliateSale {` 부분을 찾습니다
3. **필드 추가**: 위의 필드들을 기존 필드들 아래에 추가합니다
4. **저장**: 파일을 저장합니다
5. **데이터베이스 업데이트**: 터미널에서 다음 명령어 실행
   ```bash
   npx prisma db push
   ```

### ⚠️ 주의사항
- 기존 데이터는 그대로 유지됩니다
- 새 필드는 모두 "없음" 상태로 시작합니다

---

## 3. 2단계: Google Drive 업로드 함수 확인하기

### 📝 설명
이미 Google Drive 업로드 함수가 있습니다! (`lib/google-drive.ts`의 `uploadFileToDrive` 함수)
이 함수를 그대로 사용하면 됩니다. 녹음 파일용으로 간단히 래퍼 함수만 만들면 됩니다.

### 🔧 작업 내용

**파일**: `lib/google-drive.ts` (이미 있음, 함수 추가)

**추가할 함수** (파일 끝에):

```typescript
/**
 * 녹음 파일을 Google Drive에 업로드 (간편 함수)
 * @param fileBuffer 파일 데이터 (Buffer)
 * @param fileName 파일명
 * @param folderId Google Drive 폴더 ID (선택사항, 환경 변수에서 가져옴)
 * @returns Google Drive 파일 정보
 */
export async function uploadAudioFileToDrive(
  fileBuffer: Buffer,
  fileName: string,
  folderId?: string
): Promise<{ ok: boolean; fileId?: string; url?: string; error?: string }> {
  // 폴더 ID가 없으면 환경 변수에서 가져오기
  const targetFolderId = folderId || process.env.GOOGLE_DRIVE_SALES_AUDIO_FOLDER_ID || 'root';
  
  // 파일 형식 자동 감지
  let mimeType = 'audio/mpeg'; // 기본값: MP3
  if (fileName.endsWith('.wav')) mimeType = 'audio/wav';
  else if (fileName.endsWith('.m4a')) mimeType = 'audio/m4a';
  else if (fileName.endsWith('.mp3')) mimeType = 'audio/mpeg';

  // 기존 함수 사용
  return await uploadFileToDrive({
    folderId: targetFolderId,
    fileName,
    mimeType,
    buffer: fileBuffer,
    makePublic: true, // 링크로 접근 가능하게
  });
}
```

### 📌 설명
- 기존 `uploadFileToDrive` 함수를 사용합니다
- 녹음 파일 전용으로 간단하게 만든 함수입니다
- 파일 형식을 자동으로 감지합니다
- 공개 링크를 자동으로 생성합니다

### ✅ 실행 방법
1. `lib/google-drive.ts` 파일을 엽니다
2. 파일 끝(마지막 줄)에 위 함수를 추가합니다
3. 저장합니다

---

## 4. 3단계: 판매 확정 요청 API 만들기

### 📝 설명
판매원/대리점장이 "판매 확정 요청"을 제출하는 API를 만듭니다.

### 🔧 작업 내용

**새 파일 생성**: `app/api/affiliate/sales/[saleId]/submit-confirmation/route.ts`

**전체 코드**:

```typescript
// app/api/affiliate/sales/[saleId]/submit-confirmation/route.ts
// 판매 확정 요청 제출 API

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { uploadAudioToGoogleDrive } from '@/lib/google/drive';

const SESSION_COOKIE = 'cg.sid.v2';

// 세션에서 사용자 정보 가져오기
async function getCurrentUser() {
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

    if (!session || !session.User) return null;
    return session.User;
  } catch (error) {
    console.error('[Submit Confirmation] Session error:', error);
    return null;
  }
}

// 판매원/대리점장 권한 확인
async function checkAffiliateAuth(saleId: number, userId: number) {
  // 판매 정보 가져오기
  const sale = await prisma.affiliateSale.findUnique({
    where: { id: saleId },
    include: {
      agent: {
        select: { userId: true, type: true },
      },
      manager: {
        select: { userId: true, type: true },
      },
    },
  });

  if (!sale) {
    return { allowed: false, reason: '판매를 찾을 수 없습니다' };
  }

  // 판매원인 경우: 본인 판매만 가능
  if (sale.agentId && sale.agent?.userId === userId) {
    return { allowed: true, profile: sale.agent };
  }

  // 대리점장인 경우: 본인 판매만 가능 (소속 판매원 판매는 불가)
  if (sale.managerId && sale.manager?.userId === userId) {
    return { allowed: true, profile: sale.manager };
  }

  return { allowed: false, reason: '본인의 판매만 확정 요청할 수 있습니다' };
}

/**
 * POST: 판매 확정 요청 제출
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { saleId: string } }
) {
  try {
    // 1. 사용자 확인
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    // 2. 판매 ID 확인
    const saleId = parseInt(params.saleId);
    if (isNaN(saleId)) {
      return NextResponse.json(
        { ok: false, error: '올바른 판매 ID가 아닙니다' },
        { status: 400 }
      );
    }

    // 3. 권한 확인 (본인 판매만)
    const authCheck = await checkAffiliateAuth(saleId, user.id);
    if (!authCheck.allowed) {
      return NextResponse.json(
        { ok: false, error: authCheck.reason },
        { status: 403 }
      );
    }

    // 4. 판매 상태 확인 (이미 요청했거나 승인된 경우 불가)
    const sale = await prisma.affiliateSale.findUnique({
      where: { id: saleId },
      select: { id: true, status: true },
    });

    if (!sale) {
      return NextResponse.json(
        { ok: false, error: '판매를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    if (sale.status === 'PENDING_APPROVAL') {
      return NextResponse.json(
        { ok: false, error: '이미 승인 대기 중입니다' },
        { status: 400 }
      );
    }

    if (sale.status === 'APPROVED') {
      return NextResponse.json(
        { ok: false, error: '이미 승인된 판매입니다' },
        { status: 400 }
      );
    }

    // 5. 파일 업로드 처리
    const formData = await req.formData();
    const audioFile = formData.get('audioFile') as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { ok: false, error: '녹음 파일을 업로드해주세요' },
        { status: 400 }
      );
    }

    // 파일 크기 확인 (50MB 제한)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, error: '파일 크기는 50MB를 초과할 수 없습니다' },
        { status: 400 }
      );
    }

    // 파일 형식 확인 (MP3, WAV, M4A)
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/x-m4a'];
    if (!allowedTypes.includes(audioFile.type)) {
      return NextResponse.json(
        { ok: false, error: '지원하는 파일 형식: MP3, WAV, M4A' },
        { status: 400 }
      );
    }

    // 6. Google Drive에 업로드
    const fileBuffer = Buffer.from(await audioFile.arrayBuffer());
    const fileName = `sale_${saleId}_${Date.now()}_${audioFile.name}`;

    // Google Drive 업로드 (기존 함수 사용)
    const { uploadAudioFileToDrive } = await import('@/lib/google-drive');
    const driveResult = await uploadAudioFileToDrive(fileBuffer, fileName);

    if (!driveResult.ok || !driveResult.fileId || !driveResult.url) {
      return NextResponse.json(
        { ok: false, error: driveResult.error || 'Google Drive 업로드 실패' },
        { status: 500 }
      );
    }

    // 7. 데이터베이스 업데이트
    const updatedSale = await prisma.affiliateSale.update({
      where: { id: saleId },
      data: {
        status: 'PENDING_APPROVAL',
        audioFileGoogleDriveId: driveResult.fileId,
        audioFileGoogleDriveUrl: driveResult.url,
        audioFileName: audioFile.name,
        submittedById: user.id,
        submittedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      message: '판매 확정 요청이 제출되었습니다',
      sale: {
        id: updatedSale.id,
        status: updatedSale.status,
        audioFileUrl: updatedSale.audioFileGoogleDriveUrl,
      },
    });
  } catch (error: any) {
    console.error('[Submit Confirmation] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
```

### 📌 설명
- 이 API는 판매원/대리점장이 사용합니다
- 본인 판매만 요청할 수 있습니다
- 녹음 파일을 Google Drive에 업로드합니다
- 판매 상태를 `PENDING_APPROVAL`로 변경합니다

---

## 5. 4단계: 관리자 승인/거부 API 만들기

### 📝 설명
관리자가 판매 확정 요청을 승인하거나 거부하는 API를 만듭니다.

### 🔧 작업 내용

#### 5-1. 승인 API

**새 파일 생성**: `app/api/admin/affiliate/sales/[saleId]/approve/route.ts`

```typescript
// app/api/admin/affiliate/sales/[saleId]/approve/route.ts
// 판매 확정 승인 API

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { syncSaleCommissionLedgers } from '@/lib/affiliate/commission-ledger';

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
          select: { id: true, role: true, name: true },
        },
      },
    });

    if (!session || !session.User) return null;
    if (session.User.role !== 'admin') return null;
    return session.User;
  } catch (error) {
    console.error('[Approve Sale] Auth error:', error);
    return null;
  }
}

/**
 * POST: 판매 확정 승인
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { saleId: string } }
) {
  try {
    // 1. 관리자 권한 확인
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: '관리자 권한이 필요합니다' },
        { status: 403 }
      );
    }

    // 2. 판매 ID 확인
    const saleId = parseInt(params.saleId);
    if (isNaN(saleId)) {
      return NextResponse.json(
        { ok: false, error: '올바른 판매 ID가 아닙니다' },
        { status: 400 }
      );
    }

    // 3. 판매 정보 확인
    const sale = await prisma.affiliateSale.findUnique({
      where: { id: saleId },
      select: {
        id: true,
        status: true,
        audioFileGoogleDriveUrl: true,
      },
    });

    if (!sale) {
      return NextResponse.json(
        { ok: false, error: '판매를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    if (sale.status !== 'PENDING_APPROVAL') {
      return NextResponse.json(
        { ok: false, error: '승인 대기 중인 판매만 승인할 수 있습니다' },
        { status: 400 }
      );
    }

    // 4. 판매 승인 처리
    const updatedSale = await prisma.affiliateSale.update({
      where: { id: saleId },
      data: {
        status: 'APPROVED',
        approvedById: admin.id,
        approvedAt: new Date(),
        confirmedAt: new Date(), // 기존 필드와 호환성 유지
      },
    });

    // 5. 수당 자동 계산
    try {
      await syncSaleCommissionLedgers(saleId, {
        includeHq: true,
        regenerate: false,
      });
      console.log(`[Approve Sale] 수당 계산 완료: Sale #${saleId}`);
    } catch (commissionError: any) {
      console.error(`[Approve Sale] 수당 계산 오류:`, commissionError);
      // 수당 계산 실패해도 승인은 완료 (나중에 수동으로 계산 가능)
    }

    return NextResponse.json({
      ok: true,
      message: '판매가 승인되었습니다',
      sale: {
        id: updatedSale.id,
        status: updatedSale.status,
      },
    });
  } catch (error: any) {
    console.error('[Approve Sale] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
```

#### 5-2. 거부 API

**새 파일 생성**: `app/api/admin/affiliate/sales/[saleId]/reject/route.ts`

```typescript
// app/api/admin/affiliate/sales/[saleId]/reject/route.ts
// 판매 확정 거부 API

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

const SESSION_COOKIE = 'cg.sid.v2';

// 관리자 권한 확인 (위와 동일)
async function checkAdminAuth() {
  const sid = cookies().get(SESSION_COOKIE)?.value;
  if (!sid) return null;

  try {
    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: {
        User: {
          select: { id: true, role: true, name: true },
        },
      },
    });

    if (!session || !session.User) return null;
    if (session.User.role !== 'admin') return null;
    return session.User;
  } catch (error) {
    console.error('[Reject Sale] Auth error:', error);
    return null;
  }
}

/**
 * POST: 판매 확정 거부
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { saleId: string } }
) {
  try {
    // 1. 관리자 권한 확인
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: '관리자 권한이 필요합니다' },
        { status: 403 }
      );
    }

    // 2. 판매 ID 확인
    const saleId = parseInt(params.saleId);
    if (isNaN(saleId)) {
      return NextResponse.json(
        { ok: false, error: '올바른 판매 ID가 아닙니다' },
        { status: 400 }
      );
    }

    // 3. 거부 사유 받기
    const body = await req.json();
    const { reason } = body;

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: '거부 사유를 입력해주세요' },
        { status: 400 }
      );
    }

    // 4. 판매 정보 확인
    const sale = await prisma.affiliateSale.findUnique({
      where: { id: saleId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!sale) {
      return NextResponse.json(
        { ok: false, error: '판매를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    if (sale.status !== 'PENDING_APPROVAL') {
      return NextResponse.json(
        { ok: false, error: '승인 대기 중인 판매만 거부할 수 있습니다' },
        { status: 400 }
      );
    }

    // 5. 판매 거부 처리
    const updatedSale = await prisma.affiliateSale.update({
      where: { id: saleId },
      data: {
        status: 'REJECTED',
        rejectedById: admin.id,
        rejectedAt: new Date(),
        rejectionReason: reason.trim(),
        // 상태를 PENDING으로 되돌려서 재요청 가능하게
        submittedAt: null,
        submittedById: null,
      },
    });

    return NextResponse.json({
      ok: true,
      message: '판매가 거부되었습니다',
      sale: {
        id: updatedSale.id,
        status: updatedSale.status,
        rejectionReason: updatedSale.rejectionReason,
      },
    });
  } catch (error: any) {
    console.error('[Reject Sale] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
```

#### 5-3. 승인 대기 목록 조회 API

**새 파일 생성**: `app/api/admin/affiliate/sales/pending-approval/route.ts`

```typescript
// app/api/admin/affiliate/sales/pending-approval/route.ts
// 승인 대기 중인 판매 목록 조회

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

const SESSION_COOKIE = 'cg.sid.v2';

// 관리자 권한 확인 (위와 동일)
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

    if (!session || !session.User) return null;
    if (session.User.role !== 'admin') return null;
    return session.User;
  } catch (error) {
    return null;
  }
}

/**
 * GET: 승인 대기 중인 판매 목록
 */
export async function GET(req: NextRequest) {
  try {
    // 관리자 권한 확인
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: '관리자 권한이 필요합니다' },
        { status: 403 }
      );
    }

    // 승인 대기 중인 판매 조회
    const pendingSales = await prisma.affiliateSale.findMany({
      where: {
        status: 'PENDING_APPROVAL',
      },
      include: {
        agent: {
          select: {
            id: true,
            displayName: true,
            affiliateCode: true,
            type: true,
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
        manager: {
          select: {
            id: true,
            displayName: true,
            affiliateCode: true,
            type: true,
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
        product: {
          select: {
            productCode: true,
            title: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'asc', // 오래된 것부터
      },
    });

    return NextResponse.json({
      ok: true,
      sales: pendingSales.map((sale) => ({
        id: sale.id,
        productCode: sale.productCode,
        productTitle: sale.product?.title,
        saleAmount: sale.saleAmount,
        saleDate: sale.saleDate,
        submittedAt: sale.submittedAt,
        audioFileGoogleDriveUrl: sale.audioFileGoogleDriveUrl,
        audioFileName: sale.audioFileName,
        agent: sale.agent
          ? {
              name: sale.agent.displayName || sale.agent.user?.name,
              code: sale.agent.affiliateCode,
              phone: sale.agent.user?.phone,
            }
          : null,
        manager: sale.manager
          ? {
              name: sale.manager.displayName || sale.manager.user?.name,
              code: sale.manager.affiliateCode,
              phone: sale.manager.user?.phone,
            }
          : null,
      })),
      count: pendingSales.length,
    });
  } catch (error: any) {
    console.error('[Pending Approval] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
```

### 📌 설명
- **승인 API**: 판매를 승인하고 수당을 자동 계산합니다
- **거부 API**: 판매를 거부하고 사유를 저장합니다 (재요청 가능)
- **목록 API**: 승인 대기 중인 모든 판매를 보여줍니다

---

## 6. 5단계: UI 만들기

### 📝 설명
사용자가 쉽게 사용할 수 있는 화면을 만듭니다. 단계별로 하나씩 만들어봅시다.

### 🔧 작업 내용

#### 6-1. 판매 확정 요청 모달 컴포넌트 만들기

**새 파일 생성**: `components/affiliate/SalesConfirmationModal.tsx`

이 컴포넌트는 판매원/대리점장이 사용합니다.

```typescript
'use client';

import { useState, useRef } from 'react';
import { FiUpload, FiX, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { showError, showSuccess } from '@/components/ui/Toast';

interface SalesConfirmationModalProps {
  saleId: number;
  currentStatus: string;
  audioFileUrl?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SalesConfirmationModal({
  saleId,
  currentStatus,
  audioFileUrl,
  onClose,
  onSuccess,
}: SalesConfirmationModalProps) {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 파일 선택
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 확인 (50MB)
    if (file.size > 50 * 1024 * 1024) {
      showError('파일 크기는 50MB를 초과할 수 없습니다');
      return;
    }

    // 파일 형식 확인
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/x-m4a'];
    if (!allowedTypes.includes(file.type)) {
      showError('지원하는 파일 형식: MP3, WAV, M4A');
      return;
    }

    setAudioFile(file);
  };

  // 판매 확정 요청 제출
  const handleSubmit = async () => {
    if (!audioFile) {
      showError('녹음 파일을 선택해주세요');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('audioFile', audioFile);

      const response = await fetch(`/api/affiliate/sales/${saleId}/submit-confirmation`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        showSuccess('판매 확정 요청이 제출되었습니다');
        onSuccess();
        onClose();
      } else {
        showError(data.error || '요청 제출에 실패했습니다');
      }
    } catch (error: any) {
      console.error('[Sales Confirmation] Submit error:', error);
      showError('요청 제출 중 오류가 발생했습니다');
    } finally {
      setIsUploading(false);
    }
  };

  // 요청 취소 (PENDING_APPROVAL 상태일 때만)
  const handleCancel = async () => {
    if (!confirm('판매 확정 요청을 취소하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/affiliate/sales/${saleId}/cancel-confirmation`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        showSuccess('요청이 취소되었습니다');
        onSuccess();
        onClose();
      } else {
        showError(data.error || '요청 취소에 실패했습니다');
      }
    } catch (error: any) {
      console.error('[Sales Confirmation] Cancel error:', error);
      showError('요청 취소 중 오류가 발생했습니다');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">판매 확정 요청</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* 상태 표시 */}
        {currentStatus === 'PENDING_APPROVAL' && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800">
              <FiAlertCircle className="w-5 h-5" />
              <span className="font-semibold">승인 대기 중</span>
            </div>
            {audioFileUrl && (
              <a
                href={audioFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 text-sm text-yellow-700 hover:text-yellow-900 underline"
              >
                녹음 파일 확인하기
              </a>
            )}
          </div>
        )}

        {currentStatus === 'APPROVED' && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <FiCheckCircle className="w-5 h-5" />
              <span className="font-semibold">승인 완료</span>
            </div>
          </div>
        )}

        {currentStatus === 'REJECTED' && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <FiAlertCircle className="w-5 h-5" />
              <span className="font-semibold">거부됨</span>
            </div>
            <p className="mt-2 text-sm text-red-700">
              거부 사유를 확인하고 수정 후 다시 제출해주세요.
            </p>
          </div>
        )}

        {/* 파일 업로드 (PENDING 또는 REJECTED 상태일 때만) */}
        {(currentStatus === 'PENDING' || currentStatus === 'REJECTED') && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                고객과의 통화 녹음 파일
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/mpeg,audio/mp3,audio/wav,audio/m4a"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {audioFile ? (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-700">{audioFile.name}</p>
                    <p className="text-xs text-gray-500">
                      크기: {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <button
                      onClick={() => {
                        setAudioFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      파일 제거
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center py-4 text-gray-500 hover:text-gray-700"
                  >
                    <FiUpload className="w-8 h-8 mb-2" />
                    <span className="text-sm">녹음 파일 선택</span>
                    <span className="text-xs mt-1">MP3, WAV, M4A (최대 50MB)</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={!audioFile || isUploading}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? '업로드 중...' : '요청 제출'}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* 취소 버튼 (PENDING_APPROVAL 상태일 때만) */}
        {currentStatus === 'PENDING_APPROVAL' && (
          <div className="mt-4">
            <button
              onClick={handleCancel}
              className="w-full px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
            >
              요청 취소
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

#### 6-2. 요청 취소 API 만들기

**새 파일 생성**: `app/api/affiliate/sales/[saleId]/cancel-confirmation/route.ts`

```typescript
// app/api/affiliate/sales/[saleId]/cancel-confirmation/route.ts
// 판매 확정 요청 취소 API

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

const SESSION_COOKIE = 'cg.sid.v2';

// 세션에서 사용자 정보 가져오기 (위와 동일)
async function getCurrentUser() {
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

    if (!session || !session.User) return null;
    return session.User;
  } catch (error) {
    return null;
  }
}

/**
 * POST: 판매 확정 요청 취소
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { saleId: string } }
) {
  try {
    // 1. 사용자 확인
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    // 2. 판매 ID 확인
    const saleId = parseInt(params.saleId);
    if (isNaN(saleId)) {
      return NextResponse.json(
        { ok: false, error: '올바른 판매 ID가 아닙니다' },
        { status: 400 }
      );
    }

    // 3. 판매 정보 확인
    const sale = await prisma.affiliateSale.findUnique({
      where: { id: saleId },
      include: {
        agent: {
          select: { userId: true },
        },
        manager: {
          select: { userId: true },
        },
      },
    });

    if (!sale) {
      return NextResponse.json(
        { ok: false, error: '판매를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 4. 권한 확인 (본인이 제출한 요청만 취소 가능)
    if (sale.submittedById !== user.id) {
      return NextResponse.json(
        { ok: false, error: '본인이 제출한 요청만 취소할 수 있습니다' },
        { status: 403 }
      );
    }

    // 5. 상태 확인 (PENDING_APPROVAL만 취소 가능)
    if (sale.status !== 'PENDING_APPROVAL') {
      return NextResponse.json(
        { ok: false, error: '승인 대기 중인 요청만 취소할 수 있습니다' },
        { status: 400 }
      );
    }

    // 6. 요청 취소 처리 (상태를 PENDING으로 되돌림)
    const updatedSale = await prisma.affiliateSale.update({
      where: { id: saleId },
      data: {
        status: 'PENDING',
        submittedAt: null,
        submittedById: null,
        // Google Drive 파일은 그대로 유지 (나중에 재사용 가능)
      },
    });

    return NextResponse.json({
      ok: true,
      message: '요청이 취소되었습니다',
      sale: {
        id: updatedSale.id,
        status: updatedSale.status,
      },
    });
  } catch (error: any) {
    console.error('[Cancel Confirmation] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
```

#### 6-3. 판매원/대리점장 대시보드에 통합

**파일**: `app/partner/[partnerId]/dashboard/PartnerDashboard.tsx`

**추가할 내용**:

1. **상태 변수 추가** (파일 상단, 다른 useState 근처):
```typescript
const [showSalesConfirmationModal, setShowSalesConfirmationModal] = useState(false);
const [selectedSaleForConfirmation, setSelectedSaleForConfirmation] = useState<{
  id: number;
  status: string;
  audioFileUrl?: string | null;
} | null>(null);
```

2. **판매 목록 API 호출 함수 추가**:
```typescript
const [mySales, setMySales] = useState<Array<{
  id: number;
  productCode: string;
  saleAmount: number;
  status: string;
  audioFileGoogleDriveUrl: string | null;
  saleDate: string | null;
}>>([]);

const loadMySales = async () => {
  try {
    const response = await fetch('/api/affiliate/sales/my-sales', {
      credentials: 'include',
    });
    const data = await response.json();
    if (response.ok && data.ok) {
      setMySales(data.sales || []);
    }
  } catch (error) {
    console.error('[PartnerDashboard] Failed to load sales:', error);
  }
};

// useEffect에 추가
useEffect(() => {
  loadStats();
  loadMyContract();
  loadMySales(); // 추가
  if (isBranchManager) {
    loadContracts();
  }
}, [isBranchManager, loadMyContract]);
```

3. **판매 목록 섹션 추가** (대시보드 JSX 부분):
```typescript
{/* 판매 목록 섹션 */}
<div className="bg-white rounded-lg shadow-md p-6">
  <h2 className="text-xl font-bold text-gray-800 mb-4">내 판매 목록</h2>
  {mySales.length === 0 ? (
    <p className="text-gray-500">판매 내역이 없습니다</p>
  ) : (
    <div className="space-y-3">
      {mySales.map((sale) => {
        const statusBadge = {
          PENDING: { label: '확정 대기', color: 'bg-gray-100 text-gray-800' },
          PENDING_APPROVAL: { label: '승인 대기', color: 'bg-yellow-100 text-yellow-800' },
          APPROVED: { label: '승인 완료', color: 'bg-green-100 text-green-800' },
          REJECTED: { label: '거부됨', color: 'bg-red-100 text-red-800' },
        }[sale.status] || { label: sale.status, color: 'bg-gray-100 text-gray-800' };

        return (
          <div key={sale.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-semibold text-gray-800">#{sale.id}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusBadge.color}`}>
                    {statusBadge.label}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  상품: {sale.productCode} | 금액: {(sale.saleAmount / 10000).toLocaleString()}만원
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedSaleForConfirmation({
                    id: sale.id,
                    status: sale.status,
                    audioFileUrl: sale.audioFileGoogleDriveUrl,
                  });
                  setShowSalesConfirmationModal(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold"
              >
                {sale.status === 'PENDING' || sale.status === 'REJECTED' ? '확정 요청' : '상세 보기'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  )}
</div>
```

4. **모달 컴포넌트 추가** (파일 끝, return 문 안):
```typescript
{/* 판매 확정 모달 */}
{showSalesConfirmationModal && selectedSaleForConfirmation && (
  <SalesConfirmationModal
    saleId={selectedSaleForConfirmation.id}
    currentStatus={selectedSaleForConfirmation.status}
    audioFileUrl={selectedSaleForConfirmation.audioFileUrl}
    onClose={() => {
      setShowSalesConfirmationModal(false);
      setSelectedSaleForConfirmation(null);
    }}
    onSuccess={() => {
      loadMySales(); // 목록 새로고침
    }}
  />
)}
```

5. **import 추가** (파일 상단):
```typescript
import SalesConfirmationModal from '@/components/affiliate/SalesConfirmationModal';
```

**추가로 필요한 API**: `app/api/affiliate/sales/my-sales/route.ts`

```typescript
// app/api/affiliate/sales/my-sales/route.ts
// 내 판매 목록 조회 API

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

const SESSION_COOKIE = 'cg.sid.v2';

async function getCurrentUser() {
  const sid = cookies().get(SESSION_COOKIE)?.value;
  if (!sid) return null;

  try {
    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: {
        User: {
          select: { id: true },
        },
      },
    });
    return session?.User || null;
  } catch (error) {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: '로그인이 필요합니다' }, { status: 401 });
    }

    // 사용자의 어필리에이트 프로필 찾기
    const profile = await prisma.affiliateProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, type: true },
    });

    if (!profile) {
      return NextResponse.json({ ok: true, sales: [] });
    }

    // 본인 판매만 조회
    const where: any = {};
    if (profile.type === 'SALES_AGENT') {
      where.agentId = profile.id;
    } else if (profile.type === 'BRANCH_MANAGER') {
      where.managerId = profile.id;
    } else {
      return NextResponse.json({ ok: true, sales: [] });
    }

    const sales = await prisma.affiliateSale.findMany({
      where,
      select: {
        id: true,
        productCode: true,
        saleAmount: true,
        status: true,
        audioFileGoogleDriveUrl: true,
        saleDate: true,
        submittedAt: true,
        approvedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // 최근 50개만
    });

    return NextResponse.json({
      ok: true,
      sales,
    });
  } catch (error: any) {
    console.error('[My Sales] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
```

#### 6-4. 관리자 승인 대기 페이지

**새 파일 생성**: `app/admin/affiliate/sales/pending-approval/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { FiCheckCircle, FiXCircle, FiExternalLink, FiRefreshCw, FiClock } from 'react-icons/fi';
import { showError, showSuccess } from '@/components/ui/Toast';

interface PendingSale {
  id: number;
  productCode: string;
  productTitle: string | null;
  saleAmount: number;
  saleDate: string | null;
  submittedAt: string;
  audioFileGoogleDriveUrl: string | null;
  audioFileName: string | null;
  agent: {
    name: string | null;
    code: string;
    phone: string | null;
  } | null;
  manager: {
    name: string | null;
    code: string;
    phone: string | null;
  } | null;
}

export default function PendingApprovalPage() {
  const [sales, setSales] = useState<PendingSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<number | null>(null);

  // 목록 불러오기
  const loadPendingSales = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/affiliate/sales/pending-approval', {
        credentials: 'include',
      });
      const data = await response.json();

      if (response.ok && data.ok) {
        setSales(data.sales || []);
      } else {
        showError(data.error || '목록을 불러오는 중 오류가 발생했습니다');
      }
    } catch (error: any) {
      console.error('[Pending Approval] Load error:', error);
      showError('목록을 불러오는 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingSales();
  }, []);

  // 승인 처리
  const handleApprove = async (saleId: number) => {
    if (!confirm('이 판매를 승인하시겠습니까? 승인 시 수당이 자동으로 계산됩니다.')) {
      return;
    }

    try {
      setApprovingId(saleId);
      const response = await fetch(`/api/admin/affiliate/sales/${saleId}/approve`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();

      if (response.ok && data.ok) {
        showSuccess('판매가 승인되었습니다');
        loadPendingSales(); // 목록 새로고침
      } else {
        showError(data.error || '승인 처리에 실패했습니다');
      }
    } catch (error: any) {
      console.error('[Pending Approval] Approve error:', error);
      showError('승인 처리 중 오류가 발생했습니다');
    } finally {
      setApprovingId(null);
    }
  };

  // 거부 처리
  const handleReject = async (saleId: number) => {
    if (!rejectReason.trim()) {
      showError('거부 사유를 입력해주세요');
      return;
    }

    try {
      setRejectingId(saleId);
      const response = await fetch(`/api/admin/affiliate/sales/${saleId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: rejectReason }),
      });
      const data = await response.json();

      if (response.ok && data.ok) {
        showSuccess('판매가 거부되었습니다');
        setShowRejectModal(null);
        setRejectReason('');
        loadPendingSales(); // 목록 새로고침
      } else {
        showError(data.error || '거부 처리에 실패했습니다');
      }
    } catch (error: any) {
      console.error('[Pending Approval] Reject error:', error);
      showError('거부 처리 중 오류가 발생했습니다');
    } finally {
      setRejectingId(null);
    }
  };

  // 금액 포맷팅
  const formatAmount = (amount: number) => {
    return `${(amount / 10000).toLocaleString()}만원`;
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              ⏳ 판매 확정 승인 대기
            </h1>
            <p className="text-gray-600">
              녹음 파일을 확인하고 판매 확정을 승인하거나 거부하세요.
            </p>
          </div>
          <button
            onClick={loadPendingSales}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} />
            새로고침
          </button>
        </div>
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">로딩 중...</p>
        </div>
      ) : sales.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <FiCheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <p className="text-xl font-semibold text-gray-800">승인 대기 중인 판매가 없습니다</p>
          <p className="text-gray-600 mt-2">모든 판매가 처리되었습니다.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sales.map((sale) => (
            <div key={sale.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between">
                {/* 왼쪽: 판매 정보 */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl font-bold text-blue-600">#{sale.id}</span>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                      승인 대기 중
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">상품</p>
                      <p className="font-semibold text-gray-800">
                        {sale.productTitle || sale.productCode}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">판매 금액</p>
                      <p className="font-semibold text-gray-800">{formatAmount(sale.saleAmount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">요청 제출 시간</p>
                      <p className="font-semibold text-gray-800">{formatDate(sale.submittedAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">담당자</p>
                      <p className="font-semibold text-gray-800">
                        {sale.agent
                          ? `판매원: ${sale.agent.name || '이름 없음'} (${sale.agent.code})`
                          : sale.manager
                          ? `대리점장: ${sale.manager.name || '이름 없음'} (${sale.manager.code})`
                          : '담당자 없음'}
                      </p>
                    </div>
                  </div>

                  {/* 녹음 파일 링크 */}
                  {sale.audioFileGoogleDriveUrl && (
                    <div className="mb-4">
                      <a
                        href={sale.audioFileGoogleDriveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold"
                      >
                        <FiExternalLink />
                        녹음 파일 확인하기 (Google Drive)
                        {sale.audioFileName && (
                          <span className="text-sm text-gray-500">({sale.audioFileName})</span>
                        )}
                      </a>
                    </div>
                  )}
                </div>

                {/* 오른쪽: 액션 버튼 */}
                <div className="flex flex-col gap-2 ml-6">
                  <button
                    onClick={() => handleApprove(sale.id)}
                    disabled={approvingId === sale.id}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
                  >
                    {approvingId === sale.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        승인 중...
                      </>
                    ) : (
                      <>
                        <FiCheckCircle />
                        승인
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowRejectModal(sale.id)}
                    disabled={rejectingId === sale.id}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
                  >
                    <FiXCircle />
                    거부
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 거부 사유 입력 모달 */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">거부 사유 입력</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="거부 사유를 입력해주세요..."
              className="w-full h-32 border border-gray-300 rounded-lg px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleReject(showRejectModal)}
                disabled={!rejectReason.trim() || rejectingId === showRejectModal}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rejectingId === showRejectModal ? '처리 중...' : '거부하기'}
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 📌 설명
- 관리자가 승인 대기 중인 모든 판매를 볼 수 있습니다
- 각 판매마다 Google Drive 링크가 있어 바로 확인할 수 있습니다
- 승인/거부 버튼으로 처리할 수 있습니다
- 거부 시 사유를 입력해야 합니다

---

## 7. 6단계: 알림 기능 추가

### 📝 설명
승인/거부 시 판매원/대리점장에게 알림을 보냅니다.

### 🔧 작업 내용

**파일**: `lib/affiliate/sales-notification.ts` (새로 만들기)

```typescript
// lib/affiliate/sales-notification.ts
// 판매 확정 관련 알림

import prisma from '@/lib/prisma';
import { sendNotificationToUser } from '@/lib/push/server';

/**
 * 판매 확정 승인 알림
 */
export async function notifySaleApproved(saleId: number) {
  try {
    const sale = await prisma.affiliateSale.findUnique({
      where: { id: saleId },
      include: {
        agent: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
        manager: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!sale) return;

    // 판매원에게 알림
    if (sale.agentId && sale.agent?.user) {
      await sendNotificationToUser(sale.agent.user.id, {
        title: '✅ 판매 확정 승인',
        body: `판매 #${saleId}이(가) 승인되었습니다. 수당이 계산되었습니다.`,
        data: { saleId, type: 'sale_approved' },
      });
    }

    // 대리점장에게 알림 (판매원이 아닌 경우)
    if (sale.managerId && sale.manager?.user && !sale.agentId) {
      await sendNotificationToUser(sale.manager.user.id, {
        title: '✅ 판매 확정 승인',
        body: `판매 #${saleId}이(가) 승인되었습니다. 수당이 계산되었습니다.`,
        data: { saleId, type: 'sale_approved' },
      });
    }
  } catch (error) {
    console.error('[Notify Sale Approved] Error:', error);
  }
}

/**
 * 판매 확정 거부 알림
 */
export async function notifySaleRejected(saleId: number, reason: string) {
  try {
    const sale = await prisma.affiliateSale.findUnique({
      where: { id: saleId },
      include: {
        agent: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
        manager: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!sale) return;

    // 판매원에게 알림
    if (sale.agentId && sale.agent?.user) {
      await sendNotificationToUser(sale.agent.user.id, {
        title: '❌ 판매 확정 거부',
        body: `판매 #${saleId}이(가) 거부되었습니다. 사유: ${reason}`,
        data: { saleId, type: 'sale_rejected', reason },
      });
    }

    // 대리점장에게 알림
    if (sale.managerId && sale.manager?.user && !sale.agentId) {
      await sendNotificationToUser(sale.manager.user.id, {
        title: '❌ 판매 확정 거부',
        body: `판매 #${saleId}이(가) 거부되었습니다. 사유: ${reason}`,
        data: { saleId, type: 'sale_rejected', reason },
      });
    }
  } catch (error) {
    console.error('[Notify Sale Rejected] Error:', error);
  }
}
```

**승인/거부 API에 알림 추가**:

승인 API (`app/api/admin/affiliate/sales/[saleId]/approve/route.ts`)에 추가:
```typescript
import { notifySaleApproved } from '@/lib/affiliate/sales-notification';

// 승인 처리 후:
await notifySaleApproved(saleId);
```

거부 API (`app/api/admin/affiliate/sales/[saleId]/reject/route.ts`)에 추가:
```typescript
import { notifySaleRejected } from '@/lib/affiliate/sales-notification';

// 거부 처리 후:
await notifySaleRejected(saleId, reason);
```

---

## 8. 테스트 방법

### 📝 단계별 테스트

1. **데이터베이스 테스트**
   - Prisma Studio 열기: `npx prisma studio`
   - AffiliateSale 테이블 확인
   - 새 필드들이 추가되었는지 확인

2. **파일 업로드 테스트**
   - 판매 확정 요청 API 호출
   - Google Drive에 파일이 업로드되는지 확인
   - 링크가 정상적으로 생성되는지 확인

3. **승인/거부 테스트**
   - 관리자로 로그인
   - 승인 대기 목록 확인
   - 승인/거부 실행
   - 수당 계산 확인

4. **알림 테스트**
   - 푸시 알림이 정상적으로 전송되는지 확인

---

## 📌 환경 변수 설정

`.env.local` 파일에 추가 (이미 있으면 확인만):

```bash
# Google Drive Service Account 설정 (이미 있을 수 있음)
GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_SHARED_DRIVE_ID=your_shared_drive_id  # 선택사항

# 녹음 파일 저장 폴더 (선택사항, 없으면 root에 저장)
GOOGLE_DRIVE_SALES_AUDIO_FOLDER_ID=your_folder_id
```

### 📝 Google Drive 폴더 ID 찾는 방법
1. Google Drive에서 폴더를 엽니다
2. URL을 확인합니다: `https://drive.google.com/drive/folders/여기가폴더ID`
3. 폴더 ID를 복사해서 환경 변수에 넣습니다

---

## ⚠️ 주의사항

1. **Google Drive 권한**: Service Account 또는 OAuth 설정 필요
2. **파일 크기**: 50MB 제한 확인
3. **에러 처리**: 모든 API에 에러 처리 포함
4. **보안**: 권한 확인 필수

---

## 🎉 완료 체크리스트

### 1단계: 데이터베이스
- [ ] `prisma/schema.prisma`에 AffiliateSale 필드 추가
- [ ] `npx prisma db push` 실행
- [ ] Prisma Studio로 새 필드 확인

### 2단계: Google Drive 함수
- [ ] `lib/google-drive.ts`에 `uploadAudioFileToDrive` 함수 추가
- [ ] 환경 변수 설정 확인

### 3단계: API 만들기
- [ ] `app/api/affiliate/sales/[saleId]/submit-confirmation/route.ts` 생성
- [ ] `app/api/affiliate/sales/[saleId]/cancel-confirmation/route.ts` 생성
- [ ] `app/api/admin/affiliate/sales/[saleId]/approve/route.ts` 생성
- [ ] `app/api/admin/affiliate/sales/[saleId]/reject/route.ts` 생성
- [ ] `app/api/admin/affiliate/sales/pending-approval/route.ts` 생성

### 4단계: 알림 기능
- [ ] `lib/affiliate/sales-notification.ts` 생성
- [ ] 승인 API에 알림 추가
- [ ] 거부 API에 알림 추가

### 5단계: UI 만들기
- [ ] `components/affiliate/SalesConfirmationModal.tsx` 생성
- [ ] `app/admin/affiliate/sales/pending-approval/page.tsx` 생성
- [ ] 판매원/대리점장 대시보드에 모달 통합

### 6단계: 테스트
- [ ] 판매 확정 요청 테스트
- [ ] Google Drive 업로드 테스트
- [ ] 관리자 승인/거부 테스트
- [ ] 알림 전송 테스트
- [ ] 수당 자동 계산 확인

---

## 📚 구현 우선순위 (단계별)

### ⭐ 최우선 (1일차)
1. **데이터베이스 수정** (30분)
   - 스키마 수정
   - 마이그레이션 실행

2. **Google Drive 함수** (30분)
   - `uploadAudioFileToDrive` 함수 추가
   - 테스트

3. **판매 확정 요청 API** (1시간)
   - 파일 업로드 테스트
   - 권한 확인 테스트

### 🔥 중요 (2일차)
4. **관리자 승인/거부 API** (1시간)
   - 승인 API
   - 거부 API
   - 수당 계산 연결

5. **승인 대기 목록 API** (30분)
   - 목록 조회 테스트

### 💡 보완 (3일차)
6. **알림 기능** (1시간)
   - 알림 함수 만들기
   - API에 연결

7. **UI 구현** (2-3시간)
   - 모달 컴포넌트
   - 관리자 페이지
   - 대시보드 통합

8. **테스트 및 수정** (1-2시간)
   - 전체 플로우 테스트
   - 버그 수정

---

## 🚨 주의사항 및 팁

### 1. Google Drive 설정
- Service Account 키가 필요합니다
- 폴더 ID는 선택사항입니다 (없으면 root에 저장)
- 공개 링크가 자동으로 생성됩니다

### 2. 파일 크기 제한
- 최대 50MB로 제한했습니다
- 더 큰 파일이 필요하면 환경 변수로 조정 가능

### 3. 에러 처리
- 모든 API에 try-catch 추가했습니다
- 사용자에게 명확한 에러 메시지 표시

### 4. 보안
- 본인 판매만 요청 가능
- 관리자만 승인/거부 가능
- 세션 확인 필수

### 5. 기존 기능과의 호환성
- 기존 `CONFIRMED` 상태는 그대로 유지
- 새 프로세스는 `PENDING_APPROVAL` → `APPROVED` 사용

---

## 💬 질문이 있으면?

구현 중 문제가 생기거나 이해가 안 되는 부분이 있으면 언제든지 물어보세요!

---

## ⚠️ 기존 관리자 패널 연결 문제점 확인

### 발견된 문제점

1. **수당 조정 승인 페이지** (`/admin/affiliate/adjustments`)
   - "구매 완료 승인" 탭에서 사용하는 `/api/admin/affiliate/sales/[saleId]/approve-commission` API 존재 여부 확인 필요
   - 이 API가 없으면 구매 완료 승인 기능이 작동하지 않을 수 있음

2. **승인 대기 목록 API**
   - 기존 API는 `PENDING` 상태만 확인
   - 새로운 프로세스는 `PENDING_APPROVAL` 상태 사용
   - 두 프로세스가 공존할 수 있도록 API 수정 필요

3. **데이터 형식 불일치**
   - 일부 API는 `{ ok: true, error: '...' }` 형식
   - 일부 API는 `{ ok: true, message: '...' }` 형식
   - 프론트엔드에서 일관되지 않게 처리할 수 있음

**상세 내용은 `ADMIN_AFFILIATE_CONNECTION_ISSUES.md` 파일 참조**

---

## 📖 전체 요약 (한눈에 보기)

### 🎯 목표
판매원/대리점장이 고객과의 통화 녹음을 Google Drive에 업로드하고, 관리자가 확인 후 승인하면 자동으로 수당이 계산되는 시스템

### 📋 만들 파일 목록

#### 데이터베이스
- `prisma/schema.prisma` (수정)

#### 함수/유틸리티
- `lib/google-drive.ts` (함수 추가)
- `lib/affiliate/sales-notification.ts` (새로 만들기)

#### API (5개)
- `app/api/affiliate/sales/[saleId]/submit-confirmation/route.ts` (새로 만들기)
- `app/api/affiliate/sales/[saleId]/cancel-confirmation/route.ts` (새로 만들기)
- `app/api/affiliate/sales/my-sales/route.ts` (새로 만들기)
- `app/api/admin/affiliate/sales/[saleId]/approve/route.ts` (새로 만들기)
- `app/api/admin/affiliate/sales/[saleId]/reject/route.ts` (새로 만들기)
- `app/api/admin/affiliate/sales/pending-approval/route.ts` (새로 만들기)

#### UI 컴포넌트
- `components/affiliate/SalesConfirmationModal.tsx` (새로 만들기)
- `app/admin/affiliate/sales/pending-approval/page.tsx` (새로 만들기)
- `app/partner/[partnerId]/dashboard/PartnerDashboard.tsx` (수정)

### 🔄 프로세스 요약

1. **판매 생성** (자동)
   - 각자 몰에서 결제 완료 시 자동 생성

2. **판매 확정 요청** (판매원/대리점장)
   - 대시보드에서 "확정 요청" 클릭
   - 녹음 파일 업로드
   - Google Drive에 저장
   - 상태: `PENDING` → `PENDING_APPROVAL`

3. **관리자 확인** (관리자)
   - 승인 대기 페이지에서 목록 확인
   - Google Drive 링크 클릭하여 녹음 확인
   - 승인 또는 거부

4. **승인 시** (자동)
   - 상태: `PENDING_APPROVAL` → `APPROVED`
   - 수당 자동 계산
   - CommissionLedger 생성
   - 판매원/대리점장에게 알림

5. **거부 시**
   - 상태: `PENDING_APPROVAL` → `REJECTED`
   - 판매원/대리점장에게 알림
   - 수정 후 재요청 가능

### ✅ 체크리스트 (간단 버전)

1. [ ] 데이터베이스 수정
2. [ ] Google Drive 함수 추가
3. [ ] 판매 확정 요청 API
4. [ ] 요청 취소 API
5. [ ] 내 판매 목록 API
6. [ ] 관리자 승인 API
7. [ ] 관리자 거부 API
8. [ ] 승인 대기 목록 API
9. [ ] 알림 함수
10. [ ] 판매 확정 모달 컴포넌트
11. [ ] 관리자 승인 대기 페이지
12. [ ] 대시보드 통합
13. [ ] 테스트

---

## 🚀 시작하기

**1단계부터 차근차근 따라하시면 됩니다!**

각 단계마다:
1. 파일을 만들거나 수정합니다
2. 코드를 복사해서 붙여넣습니다
3. 저장합니다
4. 테스트합니다
5. 다음 단계로 넘어갑니다

**문제가 생기면 언제든지 물어보세요!** 😊


> **작성일**: 2025-01-28  
> **목적**: 판매원/대리점장이 녹음 파일을 첨부하여 판매 확정 요청하고, 관리자가 승인하는 시스템 구현  
> **난이도**: 초보자도 따라할 수 있도록 쉽게 설명

---

## 📋 목차

1. [전체 프로세스 이해하기](#1-전체-프로세스-이해하기)
2. [1단계: 데이터베이스 수정](#2-1단계-데이터베이스-수정)
3. [2단계: Google Drive 업로드 함수 만들기](#3-2단계-google-drive-업로드-함수-만들기)
4. [3단계: 판매 확정 요청 API 만들기](#4-3단계-판매-확정-요청-api-만들기)
5. [4단계: 관리자 승인/거부 API 만들기](#5-4단계-관리자-승인거부-api-만들기)
6. [5단계: UI 만들기](#6-5단계-ui-만들기)
7. [6단계: 알림 기능 추가](#7-6단계-알림-기능-추가)
8. [테스트 방법](#8-테스트-방법)

---

## 1. 전체 프로세스 이해하기

### 🎬 시나리오

**상황**: 판매원 김철수가 고객과 통화를 했고, 고객이 구매를 결정했습니다.

**과정**:
1. 김철수가 통화 녹음 파일을 준비합니다
2. 판매 확정 요청 페이지에서 녹음 파일을 업로드합니다
3. 시스템이 Google Drive에 파일을 저장합니다
4. 관리자에게 "승인 대기" 알림이 갑니다
5. 관리자가 Google Drive 링크를 클릭해서 녹음을 확인합니다
6. 관리자가 승인하면 자동으로 수당이 계산됩니다
7. 김철수에게 "승인 완료" 알림이 갑니다

### 📊 상태 흐름도

```
PENDING (초기 상태)
    ↓
[판매원/대리점장이 요청 제출]
    ↓
PENDING_APPROVAL (승인 대기)
    ↓
[관리자가 확인 후]
    ├─→ APPROVED (승인) → 수당 자동 계산 ✅
    └─→ REJECTED (거부) → 수정 가능 🔄
```

---

## 2. 1단계: 데이터베이스 수정

### 📝 설명
데이터베이스에 "녹음 파일 정보"와 "승인 정보"를 저장할 공간을 만들어야 합니다.

### 🔧 작업 내용

**파일**: `prisma/schema.prisma`

**AffiliateSale 모델에 추가할 필드들**:

```prisma
model AffiliateSale {
  // ... 기존 필드들 ...
  
  // 🆕 추가할 필드들
  audioFileGoogleDriveId String?        // Google Drive 파일 ID
  audioFileGoogleDriveUrl String?       // Google Drive 공유 링크
  audioFileName String?                 // 원본 파일명
  submittedById Int?                    // 요청 제출자 ID (판매원/대리점장)
  submittedAt DateTime?                 // 요청 제출 시간
  approvedById Int?                     // 승인한 관리자 ID
  approvedAt DateTime?                  // 승인 시간
  rejectedById Int?                     // 거부한 관리자 ID
  rejectedAt DateTime?                  // 거부 시간
  rejectionReason String?               // 거부 사유
  
  // ... 기존 필드들 ...
}
```

### 📌 중요 사항
- `?` 표시는 "없어도 됨"을 의미합니다
- `String?`은 "텍스트 또는 없음"
- `Int?`는 "숫자 또는 없음"
- `DateTime?`은 "날짜/시간 또는 없음"

### ✅ 실행 방법

1. **파일 열기**: `prisma/schema.prisma` 파일을 엽니다
2. **AffiliateSale 모델 찾기**: `model AffiliateSale {` 부분을 찾습니다
3. **필드 추가**: 위의 필드들을 기존 필드들 아래에 추가합니다
4. **저장**: 파일을 저장합니다
5. **데이터베이스 업데이트**: 터미널에서 다음 명령어 실행
   ```bash
   npx prisma db push
   ```

### ⚠️ 주의사항
- 기존 데이터는 그대로 유지됩니다
- 새 필드는 모두 "없음" 상태로 시작합니다

---

## 3. 2단계: Google Drive 업로드 함수 확인하기

### 📝 설명
이미 Google Drive 업로드 함수가 있습니다! (`lib/google-drive.ts`의 `uploadFileToDrive` 함수)
이 함수를 그대로 사용하면 됩니다. 녹음 파일용으로 간단히 래퍼 함수만 만들면 됩니다.

### 🔧 작업 내용

**파일**: `lib/google-drive.ts` (이미 있음, 함수 추가)

**추가할 함수** (파일 끝에):

```typescript
/**
 * 녹음 파일을 Google Drive에 업로드 (간편 함수)
 * @param fileBuffer 파일 데이터 (Buffer)
 * @param fileName 파일명
 * @param folderId Google Drive 폴더 ID (선택사항, 환경 변수에서 가져옴)
 * @returns Google Drive 파일 정보
 */
export async function uploadAudioFileToDrive(
  fileBuffer: Buffer,
  fileName: string,
  folderId?: string
): Promise<{ ok: boolean; fileId?: string; url?: string; error?: string }> {
  // 폴더 ID가 없으면 환경 변수에서 가져오기
  const targetFolderId = folderId || process.env.GOOGLE_DRIVE_SALES_AUDIO_FOLDER_ID || 'root';
  
  // 파일 형식 자동 감지
  let mimeType = 'audio/mpeg'; // 기본값: MP3
  if (fileName.endsWith('.wav')) mimeType = 'audio/wav';
  else if (fileName.endsWith('.m4a')) mimeType = 'audio/m4a';
  else if (fileName.endsWith('.mp3')) mimeType = 'audio/mpeg';

  // 기존 함수 사용
  return await uploadFileToDrive({
    folderId: targetFolderId,
    fileName,
    mimeType,
    buffer: fileBuffer,
    makePublic: true, // 링크로 접근 가능하게
  });
}
```

### 📌 설명
- 기존 `uploadFileToDrive` 함수를 사용합니다
- 녹음 파일 전용으로 간단하게 만든 함수입니다
- 파일 형식을 자동으로 감지합니다
- 공개 링크를 자동으로 생성합니다

### ✅ 실행 방법
1. `lib/google-drive.ts` 파일을 엽니다
2. 파일 끝(마지막 줄)에 위 함수를 추가합니다
3. 저장합니다

---

## 4. 3단계: 판매 확정 요청 API 만들기

### 📝 설명
판매원/대리점장이 "판매 확정 요청"을 제출하는 API를 만듭니다.

### 🔧 작업 내용

**새 파일 생성**: `app/api/affiliate/sales/[saleId]/submit-confirmation/route.ts`

**전체 코드**:

```typescript
// app/api/affiliate/sales/[saleId]/submit-confirmation/route.ts
// 판매 확정 요청 제출 API

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { uploadAudioToGoogleDrive } from '@/lib/google/drive';

const SESSION_COOKIE = 'cg.sid.v2';

// 세션에서 사용자 정보 가져오기
async function getCurrentUser() {
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

    if (!session || !session.User) return null;
    return session.User;
  } catch (error) {
    console.error('[Submit Confirmation] Session error:', error);
    return null;
  }
}

// 판매원/대리점장 권한 확인
async function checkAffiliateAuth(saleId: number, userId: number) {
  // 판매 정보 가져오기
  const sale = await prisma.affiliateSale.findUnique({
    where: { id: saleId },
    include: {
      agent: {
        select: { userId: true, type: true },
      },
      manager: {
        select: { userId: true, type: true },
      },
    },
  });

  if (!sale) {
    return { allowed: false, reason: '판매를 찾을 수 없습니다' };
  }

  // 판매원인 경우: 본인 판매만 가능
  if (sale.agentId && sale.agent?.userId === userId) {
    return { allowed: true, profile: sale.agent };
  }

  // 대리점장인 경우: 본인 판매만 가능 (소속 판매원 판매는 불가)
  if (sale.managerId && sale.manager?.userId === userId) {
    return { allowed: true, profile: sale.manager };
  }

  return { allowed: false, reason: '본인의 판매만 확정 요청할 수 있습니다' };
}

/**
 * POST: 판매 확정 요청 제출
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { saleId: string } }
) {
  try {
    // 1. 사용자 확인
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    // 2. 판매 ID 확인
    const saleId = parseInt(params.saleId);
    if (isNaN(saleId)) {
      return NextResponse.json(
        { ok: false, error: '올바른 판매 ID가 아닙니다' },
        { status: 400 }
      );
    }

    // 3. 권한 확인 (본인 판매만)
    const authCheck = await checkAffiliateAuth(saleId, user.id);
    if (!authCheck.allowed) {
      return NextResponse.json(
        { ok: false, error: authCheck.reason },
        { status: 403 }
      );
    }

    // 4. 판매 상태 확인 (이미 요청했거나 승인된 경우 불가)
    const sale = await prisma.affiliateSale.findUnique({
      where: { id: saleId },
      select: { id: true, status: true },
    });

    if (!sale) {
      return NextResponse.json(
        { ok: false, error: '판매를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    if (sale.status === 'PENDING_APPROVAL') {
      return NextResponse.json(
        { ok: false, error: '이미 승인 대기 중입니다' },
        { status: 400 }
      );
    }

    if (sale.status === 'APPROVED') {
      return NextResponse.json(
        { ok: false, error: '이미 승인된 판매입니다' },
        { status: 400 }
      );
    }

    // 5. 파일 업로드 처리
    const formData = await req.formData();
    const audioFile = formData.get('audioFile') as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { ok: false, error: '녹음 파일을 업로드해주세요' },
        { status: 400 }
      );
    }

    // 파일 크기 확인 (50MB 제한)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, error: '파일 크기는 50MB를 초과할 수 없습니다' },
        { status: 400 }
      );
    }

    // 파일 형식 확인 (MP3, WAV, M4A)
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/x-m4a'];
    if (!allowedTypes.includes(audioFile.type)) {
      return NextResponse.json(
        { ok: false, error: '지원하는 파일 형식: MP3, WAV, M4A' },
        { status: 400 }
      );
    }

    // 6. Google Drive에 업로드
    const fileBuffer = Buffer.from(await audioFile.arrayBuffer());
    const fileName = `sale_${saleId}_${Date.now()}_${audioFile.name}`;

    // Google Drive 업로드 (기존 함수 사용)
    const { uploadAudioFileToDrive } = await import('@/lib/google-drive');
    const driveResult = await uploadAudioFileToDrive(fileBuffer, fileName);

    if (!driveResult.ok || !driveResult.fileId || !driveResult.url) {
      return NextResponse.json(
        { ok: false, error: driveResult.error || 'Google Drive 업로드 실패' },
        { status: 500 }
      );
    }

    // 7. 데이터베이스 업데이트
    const updatedSale = await prisma.affiliateSale.update({
      where: { id: saleId },
      data: {
        status: 'PENDING_APPROVAL',
        audioFileGoogleDriveId: driveResult.fileId,
        audioFileGoogleDriveUrl: driveResult.url,
        audioFileName: audioFile.name,
        submittedById: user.id,
        submittedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      message: '판매 확정 요청이 제출되었습니다',
      sale: {
        id: updatedSale.id,
        status: updatedSale.status,
        audioFileUrl: updatedSale.audioFileGoogleDriveUrl,
      },
    });
  } catch (error: any) {
    console.error('[Submit Confirmation] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
```

### 📌 설명
- 이 API는 판매원/대리점장이 사용합니다
- 본인 판매만 요청할 수 있습니다
- 녹음 파일을 Google Drive에 업로드합니다
- 판매 상태를 `PENDING_APPROVAL`로 변경합니다

---

## 5. 4단계: 관리자 승인/거부 API 만들기

### 📝 설명
관리자가 판매 확정 요청을 승인하거나 거부하는 API를 만듭니다.

### 🔧 작업 내용

#### 5-1. 승인 API

**새 파일 생성**: `app/api/admin/affiliate/sales/[saleId]/approve/route.ts`

```typescript
// app/api/admin/affiliate/sales/[saleId]/approve/route.ts
// 판매 확정 승인 API

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { syncSaleCommissionLedgers } from '@/lib/affiliate/commission-ledger';

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
          select: { id: true, role: true, name: true },
        },
      },
    });

    if (!session || !session.User) return null;
    if (session.User.role !== 'admin') return null;
    return session.User;
  } catch (error) {
    console.error('[Approve Sale] Auth error:', error);
    return null;
  }
}

/**
 * POST: 판매 확정 승인
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { saleId: string } }
) {
  try {
    // 1. 관리자 권한 확인
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: '관리자 권한이 필요합니다' },
        { status: 403 }
      );
    }

    // 2. 판매 ID 확인
    const saleId = parseInt(params.saleId);
    if (isNaN(saleId)) {
      return NextResponse.json(
        { ok: false, error: '올바른 판매 ID가 아닙니다' },
        { status: 400 }
      );
    }

    // 3. 판매 정보 확인
    const sale = await prisma.affiliateSale.findUnique({
      where: { id: saleId },
      select: {
        id: true,
        status: true,
        audioFileGoogleDriveUrl: true,
      },
    });

    if (!sale) {
      return NextResponse.json(
        { ok: false, error: '판매를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    if (sale.status !== 'PENDING_APPROVAL') {
      return NextResponse.json(
        { ok: false, error: '승인 대기 중인 판매만 승인할 수 있습니다' },
        { status: 400 }
      );
    }

    // 4. 판매 승인 처리
    const updatedSale = await prisma.affiliateSale.update({
      where: { id: saleId },
      data: {
        status: 'APPROVED',
        approvedById: admin.id,
        approvedAt: new Date(),
        confirmedAt: new Date(), // 기존 필드와 호환성 유지
      },
    });

    // 5. 수당 자동 계산
    try {
      await syncSaleCommissionLedgers(saleId, {
        includeHq: true,
        regenerate: false,
      });
      console.log(`[Approve Sale] 수당 계산 완료: Sale #${saleId}`);
    } catch (commissionError: any) {
      console.error(`[Approve Sale] 수당 계산 오류:`, commissionError);
      // 수당 계산 실패해도 승인은 완료 (나중에 수동으로 계산 가능)
    }

    return NextResponse.json({
      ok: true,
      message: '판매가 승인되었습니다',
      sale: {
        id: updatedSale.id,
        status: updatedSale.status,
      },
    });
  } catch (error: any) {
    console.error('[Approve Sale] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
```

#### 5-2. 거부 API

**새 파일 생성**: `app/api/admin/affiliate/sales/[saleId]/reject/route.ts`

```typescript
// app/api/admin/affiliate/sales/[saleId]/reject/route.ts
// 판매 확정 거부 API

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

const SESSION_COOKIE = 'cg.sid.v2';

// 관리자 권한 확인 (위와 동일)
async function checkAdminAuth() {
  const sid = cookies().get(SESSION_COOKIE)?.value;
  if (!sid) return null;

  try {
    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: {
        User: {
          select: { id: true, role: true, name: true },
        },
      },
    });

    if (!session || !session.User) return null;
    if (session.User.role !== 'admin') return null;
    return session.User;
  } catch (error) {
    console.error('[Reject Sale] Auth error:', error);
    return null;
  }
}

/**
 * POST: 판매 확정 거부
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { saleId: string } }
) {
  try {
    // 1. 관리자 권한 확인
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: '관리자 권한이 필요합니다' },
        { status: 403 }
      );
    }

    // 2. 판매 ID 확인
    const saleId = parseInt(params.saleId);
    if (isNaN(saleId)) {
      return NextResponse.json(
        { ok: false, error: '올바른 판매 ID가 아닙니다' },
        { status: 400 }
      );
    }

    // 3. 거부 사유 받기
    const body = await req.json();
    const { reason } = body;

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: '거부 사유를 입력해주세요' },
        { status: 400 }
      );
    }

    // 4. 판매 정보 확인
    const sale = await prisma.affiliateSale.findUnique({
      where: { id: saleId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!sale) {
      return NextResponse.json(
        { ok: false, error: '판매를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    if (sale.status !== 'PENDING_APPROVAL') {
      return NextResponse.json(
        { ok: false, error: '승인 대기 중인 판매만 거부할 수 있습니다' },
        { status: 400 }
      );
    }

    // 5. 판매 거부 처리
    const updatedSale = await prisma.affiliateSale.update({
      where: { id: saleId },
      data: {
        status: 'REJECTED',
        rejectedById: admin.id,
        rejectedAt: new Date(),
        rejectionReason: reason.trim(),
        // 상태를 PENDING으로 되돌려서 재요청 가능하게
        submittedAt: null,
        submittedById: null,
      },
    });

    return NextResponse.json({
      ok: true,
      message: '판매가 거부되었습니다',
      sale: {
        id: updatedSale.id,
        status: updatedSale.status,
        rejectionReason: updatedSale.rejectionReason,
      },
    });
  } catch (error: any) {
    console.error('[Reject Sale] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
```

#### 5-3. 승인 대기 목록 조회 API

**새 파일 생성**: `app/api/admin/affiliate/sales/pending-approval/route.ts`

```typescript
// app/api/admin/affiliate/sales/pending-approval/route.ts
// 승인 대기 중인 판매 목록 조회

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

const SESSION_COOKIE = 'cg.sid.v2';

// 관리자 권한 확인 (위와 동일)
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

    if (!session || !session.User) return null;
    if (session.User.role !== 'admin') return null;
    return session.User;
  } catch (error) {
    return null;
  }
}

/**
 * GET: 승인 대기 중인 판매 목록
 */
export async function GET(req: NextRequest) {
  try {
    // 관리자 권한 확인
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: '관리자 권한이 필요합니다' },
        { status: 403 }
      );
    }

    // 승인 대기 중인 판매 조회
    const pendingSales = await prisma.affiliateSale.findMany({
      where: {
        status: 'PENDING_APPROVAL',
      },
      include: {
        agent: {
          select: {
            id: true,
            displayName: true,
            affiliateCode: true,
            type: true,
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
        manager: {
          select: {
            id: true,
            displayName: true,
            affiliateCode: true,
            type: true,
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
        product: {
          select: {
            productCode: true,
            title: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'asc', // 오래된 것부터
      },
    });

    return NextResponse.json({
      ok: true,
      sales: pendingSales.map((sale) => ({
        id: sale.id,
        productCode: sale.productCode,
        productTitle: sale.product?.title,
        saleAmount: sale.saleAmount,
        saleDate: sale.saleDate,
        submittedAt: sale.submittedAt,
        audioFileGoogleDriveUrl: sale.audioFileGoogleDriveUrl,
        audioFileName: sale.audioFileName,
        agent: sale.agent
          ? {
              name: sale.agent.displayName || sale.agent.user?.name,
              code: sale.agent.affiliateCode,
              phone: sale.agent.user?.phone,
            }
          : null,
        manager: sale.manager
          ? {
              name: sale.manager.displayName || sale.manager.user?.name,
              code: sale.manager.affiliateCode,
              phone: sale.manager.user?.phone,
            }
          : null,
      })),
      count: pendingSales.length,
    });
  } catch (error: any) {
    console.error('[Pending Approval] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
```

### 📌 설명
- **승인 API**: 판매를 승인하고 수당을 자동 계산합니다
- **거부 API**: 판매를 거부하고 사유를 저장합니다 (재요청 가능)
- **목록 API**: 승인 대기 중인 모든 판매를 보여줍니다

---

## 6. 5단계: UI 만들기

### 📝 설명
사용자가 쉽게 사용할 수 있는 화면을 만듭니다. 단계별로 하나씩 만들어봅시다.

### 🔧 작업 내용

#### 6-1. 판매 확정 요청 모달 컴포넌트 만들기

**새 파일 생성**: `components/affiliate/SalesConfirmationModal.tsx`

이 컴포넌트는 판매원/대리점장이 사용합니다.

```typescript
'use client';

import { useState, useRef } from 'react';
import { FiUpload, FiX, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { showError, showSuccess } from '@/components/ui/Toast';

interface SalesConfirmationModalProps {
  saleId: number;
  currentStatus: string;
  audioFileUrl?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SalesConfirmationModal({
  saleId,
  currentStatus,
  audioFileUrl,
  onClose,
  onSuccess,
}: SalesConfirmationModalProps) {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 파일 선택
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 확인 (50MB)
    if (file.size > 50 * 1024 * 1024) {
      showError('파일 크기는 50MB를 초과할 수 없습니다');
      return;
    }

    // 파일 형식 확인
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/x-m4a'];
    if (!allowedTypes.includes(file.type)) {
      showError('지원하는 파일 형식: MP3, WAV, M4A');
      return;
    }

    setAudioFile(file);
  };

  // 판매 확정 요청 제출
  const handleSubmit = async () => {
    if (!audioFile) {
      showError('녹음 파일을 선택해주세요');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('audioFile', audioFile);

      const response = await fetch(`/api/affiliate/sales/${saleId}/submit-confirmation`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        showSuccess('판매 확정 요청이 제출되었습니다');
        onSuccess();
        onClose();
      } else {
        showError(data.error || '요청 제출에 실패했습니다');
      }
    } catch (error: any) {
      console.error('[Sales Confirmation] Submit error:', error);
      showError('요청 제출 중 오류가 발생했습니다');
    } finally {
      setIsUploading(false);
    }
  };

  // 요청 취소 (PENDING_APPROVAL 상태일 때만)
  const handleCancel = async () => {
    if (!confirm('판매 확정 요청을 취소하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/affiliate/sales/${saleId}/cancel-confirmation`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        showSuccess('요청이 취소되었습니다');
        onSuccess();
        onClose();
      } else {
        showError(data.error || '요청 취소에 실패했습니다');
      }
    } catch (error: any) {
      console.error('[Sales Confirmation] Cancel error:', error);
      showError('요청 취소 중 오류가 발생했습니다');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">판매 확정 요청</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* 상태 표시 */}
        {currentStatus === 'PENDING_APPROVAL' && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800">
              <FiAlertCircle className="w-5 h-5" />
              <span className="font-semibold">승인 대기 중</span>
            </div>
            {audioFileUrl && (
              <a
                href={audioFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 text-sm text-yellow-700 hover:text-yellow-900 underline"
              >
                녹음 파일 확인하기
              </a>
            )}
          </div>
        )}

        {currentStatus === 'APPROVED' && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <FiCheckCircle className="w-5 h-5" />
              <span className="font-semibold">승인 완료</span>
            </div>
          </div>
        )}

        {currentStatus === 'REJECTED' && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <FiAlertCircle className="w-5 h-5" />
              <span className="font-semibold">거부됨</span>
            </div>
            <p className="mt-2 text-sm text-red-700">
              거부 사유를 확인하고 수정 후 다시 제출해주세요.
            </p>
          </div>
        )}

        {/* 파일 업로드 (PENDING 또는 REJECTED 상태일 때만) */}
        {(currentStatus === 'PENDING' || currentStatus === 'REJECTED') && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                고객과의 통화 녹음 파일
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/mpeg,audio/mp3,audio/wav,audio/m4a"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {audioFile ? (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-700">{audioFile.name}</p>
                    <p className="text-xs text-gray-500">
                      크기: {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <button
                      onClick={() => {
                        setAudioFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      파일 제거
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center py-4 text-gray-500 hover:text-gray-700"
                  >
                    <FiUpload className="w-8 h-8 mb-2" />
                    <span className="text-sm">녹음 파일 선택</span>
                    <span className="text-xs mt-1">MP3, WAV, M4A (최대 50MB)</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={!audioFile || isUploading}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? '업로드 중...' : '요청 제출'}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* 취소 버튼 (PENDING_APPROVAL 상태일 때만) */}
        {currentStatus === 'PENDING_APPROVAL' && (
          <div className="mt-4">
            <button
              onClick={handleCancel}
              className="w-full px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
            >
              요청 취소
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

#### 6-2. 요청 취소 API 만들기

**새 파일 생성**: `app/api/affiliate/sales/[saleId]/cancel-confirmation/route.ts`

```typescript
// app/api/affiliate/sales/[saleId]/cancel-confirmation/route.ts
// 판매 확정 요청 취소 API

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

const SESSION_COOKIE = 'cg.sid.v2';

// 세션에서 사용자 정보 가져오기 (위와 동일)
async function getCurrentUser() {
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

    if (!session || !session.User) return null;
    return session.User;
  } catch (error) {
    return null;
  }
}

/**
 * POST: 판매 확정 요청 취소
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { saleId: string } }
) {
  try {
    // 1. 사용자 확인
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    // 2. 판매 ID 확인
    const saleId = parseInt(params.saleId);
    if (isNaN(saleId)) {
      return NextResponse.json(
        { ok: false, error: '올바른 판매 ID가 아닙니다' },
        { status: 400 }
      );
    }

    // 3. 판매 정보 확인
    const sale = await prisma.affiliateSale.findUnique({
      where: { id: saleId },
      include: {
        agent: {
          select: { userId: true },
        },
        manager: {
          select: { userId: true },
        },
      },
    });

    if (!sale) {
      return NextResponse.json(
        { ok: false, error: '판매를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 4. 권한 확인 (본인이 제출한 요청만 취소 가능)
    if (sale.submittedById !== user.id) {
      return NextResponse.json(
        { ok: false, error: '본인이 제출한 요청만 취소할 수 있습니다' },
        { status: 403 }
      );
    }

    // 5. 상태 확인 (PENDING_APPROVAL만 취소 가능)
    if (sale.status !== 'PENDING_APPROVAL') {
      return NextResponse.json(
        { ok: false, error: '승인 대기 중인 요청만 취소할 수 있습니다' },
        { status: 400 }
      );
    }

    // 6. 요청 취소 처리 (상태를 PENDING으로 되돌림)
    const updatedSale = await prisma.affiliateSale.update({
      where: { id: saleId },
      data: {
        status: 'PENDING',
        submittedAt: null,
        submittedById: null,
        // Google Drive 파일은 그대로 유지 (나중에 재사용 가능)
      },
    });

    return NextResponse.json({
      ok: true,
      message: '요청이 취소되었습니다',
      sale: {
        id: updatedSale.id,
        status: updatedSale.status,
      },
    });
  } catch (error: any) {
    console.error('[Cancel Confirmation] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
```

#### 6-3. 판매원/대리점장 대시보드에 통합

**파일**: `app/partner/[partnerId]/dashboard/PartnerDashboard.tsx`

**추가할 내용**:

1. **상태 변수 추가** (파일 상단, 다른 useState 근처):
```typescript
const [showSalesConfirmationModal, setShowSalesConfirmationModal] = useState(false);
const [selectedSaleForConfirmation, setSelectedSaleForConfirmation] = useState<{
  id: number;
  status: string;
  audioFileUrl?: string | null;
} | null>(null);
```

2. **판매 목록 API 호출 함수 추가**:
```typescript
const [mySales, setMySales] = useState<Array<{
  id: number;
  productCode: string;
  saleAmount: number;
  status: string;
  audioFileGoogleDriveUrl: string | null;
  saleDate: string | null;
}>>([]);

const loadMySales = async () => {
  try {
    const response = await fetch('/api/affiliate/sales/my-sales', {
      credentials: 'include',
    });
    const data = await response.json();
    if (response.ok && data.ok) {
      setMySales(data.sales || []);
    }
  } catch (error) {
    console.error('[PartnerDashboard] Failed to load sales:', error);
  }
};

// useEffect에 추가
useEffect(() => {
  loadStats();
  loadMyContract();
  loadMySales(); // 추가
  if (isBranchManager) {
    loadContracts();
  }
}, [isBranchManager, loadMyContract]);
```

3. **판매 목록 섹션 추가** (대시보드 JSX 부분):
```typescript
{/* 판매 목록 섹션 */}
<div className="bg-white rounded-lg shadow-md p-6">
  <h2 className="text-xl font-bold text-gray-800 mb-4">내 판매 목록</h2>
  {mySales.length === 0 ? (
    <p className="text-gray-500">판매 내역이 없습니다</p>
  ) : (
    <div className="space-y-3">
      {mySales.map((sale) => {
        const statusBadge = {
          PENDING: { label: '확정 대기', color: 'bg-gray-100 text-gray-800' },
          PENDING_APPROVAL: { label: '승인 대기', color: 'bg-yellow-100 text-yellow-800' },
          APPROVED: { label: '승인 완료', color: 'bg-green-100 text-green-800' },
          REJECTED: { label: '거부됨', color: 'bg-red-100 text-red-800' },
        }[sale.status] || { label: sale.status, color: 'bg-gray-100 text-gray-800' };

        return (
          <div key={sale.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-semibold text-gray-800">#{sale.id}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusBadge.color}`}>
                    {statusBadge.label}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  상품: {sale.productCode} | 금액: {(sale.saleAmount / 10000).toLocaleString()}만원
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedSaleForConfirmation({
                    id: sale.id,
                    status: sale.status,
                    audioFileUrl: sale.audioFileGoogleDriveUrl,
                  });
                  setShowSalesConfirmationModal(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold"
              >
                {sale.status === 'PENDING' || sale.status === 'REJECTED' ? '확정 요청' : '상세 보기'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  )}
</div>
```

4. **모달 컴포넌트 추가** (파일 끝, return 문 안):
```typescript
{/* 판매 확정 모달 */}
{showSalesConfirmationModal && selectedSaleForConfirmation && (
  <SalesConfirmationModal
    saleId={selectedSaleForConfirmation.id}
    currentStatus={selectedSaleForConfirmation.status}
    audioFileUrl={selectedSaleForConfirmation.audioFileUrl}
    onClose={() => {
      setShowSalesConfirmationModal(false);
      setSelectedSaleForConfirmation(null);
    }}
    onSuccess={() => {
      loadMySales(); // 목록 새로고침
    }}
  />
)}
```

5. **import 추가** (파일 상단):
```typescript
import SalesConfirmationModal from '@/components/affiliate/SalesConfirmationModal';
```

**추가로 필요한 API**: `app/api/affiliate/sales/my-sales/route.ts`

```typescript
// app/api/affiliate/sales/my-sales/route.ts
// 내 판매 목록 조회 API

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

const SESSION_COOKIE = 'cg.sid.v2';

async function getCurrentUser() {
  const sid = cookies().get(SESSION_COOKIE)?.value;
  if (!sid) return null;

  try {
    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: {
        User: {
          select: { id: true },
        },
      },
    });
    return session?.User || null;
  } catch (error) {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: '로그인이 필요합니다' }, { status: 401 });
    }

    // 사용자의 어필리에이트 프로필 찾기
    const profile = await prisma.affiliateProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, type: true },
    });

    if (!profile) {
      return NextResponse.json({ ok: true, sales: [] });
    }

    // 본인 판매만 조회
    const where: any = {};
    if (profile.type === 'SALES_AGENT') {
      where.agentId = profile.id;
    } else if (profile.type === 'BRANCH_MANAGER') {
      where.managerId = profile.id;
    } else {
      return NextResponse.json({ ok: true, sales: [] });
    }

    const sales = await prisma.affiliateSale.findMany({
      where,
      select: {
        id: true,
        productCode: true,
        saleAmount: true,
        status: true,
        audioFileGoogleDriveUrl: true,
        saleDate: true,
        submittedAt: true,
        approvedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // 최근 50개만
    });

    return NextResponse.json({
      ok: true,
      sales,
    });
  } catch (error: any) {
    console.error('[My Sales] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
```

#### 6-4. 관리자 승인 대기 페이지

**새 파일 생성**: `app/admin/affiliate/sales/pending-approval/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { FiCheckCircle, FiXCircle, FiExternalLink, FiRefreshCw, FiClock } from 'react-icons/fi';
import { showError, showSuccess } from '@/components/ui/Toast';

interface PendingSale {
  id: number;
  productCode: string;
  productTitle: string | null;
  saleAmount: number;
  saleDate: string | null;
  submittedAt: string;
  audioFileGoogleDriveUrl: string | null;
  audioFileName: string | null;
  agent: {
    name: string | null;
    code: string;
    phone: string | null;
  } | null;
  manager: {
    name: string | null;
    code: string;
    phone: string | null;
  } | null;
}

export default function PendingApprovalPage() {
  const [sales, setSales] = useState<PendingSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<number | null>(null);

  // 목록 불러오기
  const loadPendingSales = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/affiliate/sales/pending-approval', {
        credentials: 'include',
      });
      const data = await response.json();

      if (response.ok && data.ok) {
        setSales(data.sales || []);
      } else {
        showError(data.error || '목록을 불러오는 중 오류가 발생했습니다');
      }
    } catch (error: any) {
      console.error('[Pending Approval] Load error:', error);
      showError('목록을 불러오는 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingSales();
  }, []);

  // 승인 처리
  const handleApprove = async (saleId: number) => {
    if (!confirm('이 판매를 승인하시겠습니까? 승인 시 수당이 자동으로 계산됩니다.')) {
      return;
    }

    try {
      setApprovingId(saleId);
      const response = await fetch(`/api/admin/affiliate/sales/${saleId}/approve`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();

      if (response.ok && data.ok) {
        showSuccess('판매가 승인되었습니다');
        loadPendingSales(); // 목록 새로고침
      } else {
        showError(data.error || '승인 처리에 실패했습니다');
      }
    } catch (error: any) {
      console.error('[Pending Approval] Approve error:', error);
      showError('승인 처리 중 오류가 발생했습니다');
    } finally {
      setApprovingId(null);
    }
  };

  // 거부 처리
  const handleReject = async (saleId: number) => {
    if (!rejectReason.trim()) {
      showError('거부 사유를 입력해주세요');
      return;
    }

    try {
      setRejectingId(saleId);
      const response = await fetch(`/api/admin/affiliate/sales/${saleId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: rejectReason }),
      });
      const data = await response.json();

      if (response.ok && data.ok) {
        showSuccess('판매가 거부되었습니다');
        setShowRejectModal(null);
        setRejectReason('');
        loadPendingSales(); // 목록 새로고침
      } else {
        showError(data.error || '거부 처리에 실패했습니다');
      }
    } catch (error: any) {
      console.error('[Pending Approval] Reject error:', error);
      showError('거부 처리 중 오류가 발생했습니다');
    } finally {
      setRejectingId(null);
    }
  };

  // 금액 포맷팅
  const formatAmount = (amount: number) => {
    return `${(amount / 10000).toLocaleString()}만원`;
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              ⏳ 판매 확정 승인 대기
            </h1>
            <p className="text-gray-600">
              녹음 파일을 확인하고 판매 확정을 승인하거나 거부하세요.
            </p>
          </div>
          <button
            onClick={loadPendingSales}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} />
            새로고침
          </button>
        </div>
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">로딩 중...</p>
        </div>
      ) : sales.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <FiCheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <p className="text-xl font-semibold text-gray-800">승인 대기 중인 판매가 없습니다</p>
          <p className="text-gray-600 mt-2">모든 판매가 처리되었습니다.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sales.map((sale) => (
            <div key={sale.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between">
                {/* 왼쪽: 판매 정보 */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl font-bold text-blue-600">#{sale.id}</span>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                      승인 대기 중
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">상품</p>
                      <p className="font-semibold text-gray-800">
                        {sale.productTitle || sale.productCode}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">판매 금액</p>
                      <p className="font-semibold text-gray-800">{formatAmount(sale.saleAmount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">요청 제출 시간</p>
                      <p className="font-semibold text-gray-800">{formatDate(sale.submittedAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">담당자</p>
                      <p className="font-semibold text-gray-800">
                        {sale.agent
                          ? `판매원: ${sale.agent.name || '이름 없음'} (${sale.agent.code})`
                          : sale.manager
                          ? `대리점장: ${sale.manager.name || '이름 없음'} (${sale.manager.code})`
                          : '담당자 없음'}
                      </p>
                    </div>
                  </div>

                  {/* 녹음 파일 링크 */}
                  {sale.audioFileGoogleDriveUrl && (
                    <div className="mb-4">
                      <a
                        href={sale.audioFileGoogleDriveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold"
                      >
                        <FiExternalLink />
                        녹음 파일 확인하기 (Google Drive)
                        {sale.audioFileName && (
                          <span className="text-sm text-gray-500">({sale.audioFileName})</span>
                        )}
                      </a>
                    </div>
                  )}
                </div>

                {/* 오른쪽: 액션 버튼 */}
                <div className="flex flex-col gap-2 ml-6">
                  <button
                    onClick={() => handleApprove(sale.id)}
                    disabled={approvingId === sale.id}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
                  >
                    {approvingId === sale.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        승인 중...
                      </>
                    ) : (
                      <>
                        <FiCheckCircle />
                        승인
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowRejectModal(sale.id)}
                    disabled={rejectingId === sale.id}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
                  >
                    <FiXCircle />
                    거부
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 거부 사유 입력 모달 */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">거부 사유 입력</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="거부 사유를 입력해주세요..."
              className="w-full h-32 border border-gray-300 rounded-lg px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleReject(showRejectModal)}
                disabled={!rejectReason.trim() || rejectingId === showRejectModal}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rejectingId === showRejectModal ? '처리 중...' : '거부하기'}
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 📌 설명
- 관리자가 승인 대기 중인 모든 판매를 볼 수 있습니다
- 각 판매마다 Google Drive 링크가 있어 바로 확인할 수 있습니다
- 승인/거부 버튼으로 처리할 수 있습니다
- 거부 시 사유를 입력해야 합니다

---

## 7. 6단계: 알림 기능 추가

### 📝 설명
승인/거부 시 판매원/대리점장에게 알림을 보냅니다.

### 🔧 작업 내용

**파일**: `lib/affiliate/sales-notification.ts` (새로 만들기)

```typescript
// lib/affiliate/sales-notification.ts
// 판매 확정 관련 알림

import prisma from '@/lib/prisma';
import { sendNotificationToUser } from '@/lib/push/server';

/**
 * 판매 확정 승인 알림
 */
export async function notifySaleApproved(saleId: number) {
  try {
    const sale = await prisma.affiliateSale.findUnique({
      where: { id: saleId },
      include: {
        agent: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
        manager: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!sale) return;

    // 판매원에게 알림
    if (sale.agentId && sale.agent?.user) {
      await sendNotificationToUser(sale.agent.user.id, {
        title: '✅ 판매 확정 승인',
        body: `판매 #${saleId}이(가) 승인되었습니다. 수당이 계산되었습니다.`,
        data: { saleId, type: 'sale_approved' },
      });
    }

    // 대리점장에게 알림 (판매원이 아닌 경우)
    if (sale.managerId && sale.manager?.user && !sale.agentId) {
      await sendNotificationToUser(sale.manager.user.id, {
        title: '✅ 판매 확정 승인',
        body: `판매 #${saleId}이(가) 승인되었습니다. 수당이 계산되었습니다.`,
        data: { saleId, type: 'sale_approved' },
      });
    }
  } catch (error) {
    console.error('[Notify Sale Approved] Error:', error);
  }
}

/**
 * 판매 확정 거부 알림
 */
export async function notifySaleRejected(saleId: number, reason: string) {
  try {
    const sale = await prisma.affiliateSale.findUnique({
      where: { id: saleId },
      include: {
        agent: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
        manager: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!sale) return;

    // 판매원에게 알림
    if (sale.agentId && sale.agent?.user) {
      await sendNotificationToUser(sale.agent.user.id, {
        title: '❌ 판매 확정 거부',
        body: `판매 #${saleId}이(가) 거부되었습니다. 사유: ${reason}`,
        data: { saleId, type: 'sale_rejected', reason },
      });
    }

    // 대리점장에게 알림
    if (sale.managerId && sale.manager?.user && !sale.agentId) {
      await sendNotificationToUser(sale.manager.user.id, {
        title: '❌ 판매 확정 거부',
        body: `판매 #${saleId}이(가) 거부되었습니다. 사유: ${reason}`,
        data: { saleId, type: 'sale_rejected', reason },
      });
    }
  } catch (error) {
    console.error('[Notify Sale Rejected] Error:', error);
  }
}
```

**승인/거부 API에 알림 추가**:

승인 API (`app/api/admin/affiliate/sales/[saleId]/approve/route.ts`)에 추가:
```typescript
import { notifySaleApproved } from '@/lib/affiliate/sales-notification';

// 승인 처리 후:
await notifySaleApproved(saleId);
```

거부 API (`app/api/admin/affiliate/sales/[saleId]/reject/route.ts`)에 추가:
```typescript
import { notifySaleRejected } from '@/lib/affiliate/sales-notification';

// 거부 처리 후:
await notifySaleRejected(saleId, reason);
```

---

## 8. 테스트 방법

### 📝 단계별 테스트

1. **데이터베이스 테스트**
   - Prisma Studio 열기: `npx prisma studio`
   - AffiliateSale 테이블 확인
   - 새 필드들이 추가되었는지 확인

2. **파일 업로드 테스트**
   - 판매 확정 요청 API 호출
   - Google Drive에 파일이 업로드되는지 확인
   - 링크가 정상적으로 생성되는지 확인

3. **승인/거부 테스트**
   - 관리자로 로그인
   - 승인 대기 목록 확인
   - 승인/거부 실행
   - 수당 계산 확인

4. **알림 테스트**
   - 푸시 알림이 정상적으로 전송되는지 확인

---

## 📌 환경 변수 설정

`.env.local` 파일에 추가 (이미 있으면 확인만):

```bash
# Google Drive Service Account 설정 (이미 있을 수 있음)
GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_SHARED_DRIVE_ID=your_shared_drive_id  # 선택사항

# 녹음 파일 저장 폴더 (선택사항, 없으면 root에 저장)
GOOGLE_DRIVE_SALES_AUDIO_FOLDER_ID=your_folder_id
```

### 📝 Google Drive 폴더 ID 찾는 방법
1. Google Drive에서 폴더를 엽니다
2. URL을 확인합니다: `https://drive.google.com/drive/folders/여기가폴더ID`
3. 폴더 ID를 복사해서 환경 변수에 넣습니다

---

## ⚠️ 주의사항

1. **Google Drive 권한**: Service Account 또는 OAuth 설정 필요
2. **파일 크기**: 50MB 제한 확인
3. **에러 처리**: 모든 API에 에러 처리 포함
4. **보안**: 권한 확인 필수

---

## 🎉 완료 체크리스트

### 1단계: 데이터베이스
- [ ] `prisma/schema.prisma`에 AffiliateSale 필드 추가
- [ ] `npx prisma db push` 실행
- [ ] Prisma Studio로 새 필드 확인

### 2단계: Google Drive 함수
- [ ] `lib/google-drive.ts`에 `uploadAudioFileToDrive` 함수 추가
- [ ] 환경 변수 설정 확인

### 3단계: API 만들기
- [ ] `app/api/affiliate/sales/[saleId]/submit-confirmation/route.ts` 생성
- [ ] `app/api/affiliate/sales/[saleId]/cancel-confirmation/route.ts` 생성
- [ ] `app/api/admin/affiliate/sales/[saleId]/approve/route.ts` 생성
- [ ] `app/api/admin/affiliate/sales/[saleId]/reject/route.ts` 생성
- [ ] `app/api/admin/affiliate/sales/pending-approval/route.ts` 생성

### 4단계: 알림 기능
- [ ] `lib/affiliate/sales-notification.ts` 생성
- [ ] 승인 API에 알림 추가
- [ ] 거부 API에 알림 추가

### 5단계: UI 만들기
- [ ] `components/affiliate/SalesConfirmationModal.tsx` 생성
- [ ] `app/admin/affiliate/sales/pending-approval/page.tsx` 생성
- [ ] 판매원/대리점장 대시보드에 모달 통합

### 6단계: 테스트
- [ ] 판매 확정 요청 테스트
- [ ] Google Drive 업로드 테스트
- [ ] 관리자 승인/거부 테스트
- [ ] 알림 전송 테스트
- [ ] 수당 자동 계산 확인

---

## 📚 구현 우선순위 (단계별)

### ⭐ 최우선 (1일차)
1. **데이터베이스 수정** (30분)
   - 스키마 수정
   - 마이그레이션 실행

2. **Google Drive 함수** (30분)
   - `uploadAudioFileToDrive` 함수 추가
   - 테스트

3. **판매 확정 요청 API** (1시간)
   - 파일 업로드 테스트
   - 권한 확인 테스트

### 🔥 중요 (2일차)
4. **관리자 승인/거부 API** (1시간)
   - 승인 API
   - 거부 API
   - 수당 계산 연결

5. **승인 대기 목록 API** (30분)
   - 목록 조회 테스트

### 💡 보완 (3일차)
6. **알림 기능** (1시간)
   - 알림 함수 만들기
   - API에 연결

7. **UI 구현** (2-3시간)
   - 모달 컴포넌트
   - 관리자 페이지
   - 대시보드 통합

8. **테스트 및 수정** (1-2시간)
   - 전체 플로우 테스트
   - 버그 수정

---

## 🚨 주의사항 및 팁

### 1. Google Drive 설정
- Service Account 키가 필요합니다
- 폴더 ID는 선택사항입니다 (없으면 root에 저장)
- 공개 링크가 자동으로 생성됩니다

### 2. 파일 크기 제한
- 최대 50MB로 제한했습니다
- 더 큰 파일이 필요하면 환경 변수로 조정 가능

### 3. 에러 처리
- 모든 API에 try-catch 추가했습니다
- 사용자에게 명확한 에러 메시지 표시

### 4. 보안
- 본인 판매만 요청 가능
- 관리자만 승인/거부 가능
- 세션 확인 필수

### 5. 기존 기능과의 호환성
- 기존 `CONFIRMED` 상태는 그대로 유지
- 새 프로세스는 `PENDING_APPROVAL` → `APPROVED` 사용

---

## 💬 질문이 있으면?

구현 중 문제가 생기거나 이해가 안 되는 부분이 있으면 언제든지 물어보세요!

---

## ⚠️ 기존 관리자 패널 연결 문제점 확인

### 발견된 문제점

1. **수당 조정 승인 페이지** (`/admin/affiliate/adjustments`)
   - "구매 완료 승인" 탭에서 사용하는 `/api/admin/affiliate/sales/[saleId]/approve-commission` API 존재 여부 확인 필요
   - 이 API가 없으면 구매 완료 승인 기능이 작동하지 않을 수 있음

2. **승인 대기 목록 API**
   - 기존 API는 `PENDING` 상태만 확인
   - 새로운 프로세스는 `PENDING_APPROVAL` 상태 사용
   - 두 프로세스가 공존할 수 있도록 API 수정 필요

3. **데이터 형식 불일치**
   - 일부 API는 `{ ok: true, error: '...' }` 형식
   - 일부 API는 `{ ok: true, message: '...' }` 형식
   - 프론트엔드에서 일관되지 않게 처리할 수 있음

**상세 내용은 `ADMIN_AFFILIATE_CONNECTION_ISSUES.md` 파일 참조**

---

## 📖 전체 요약 (한눈에 보기)

### 🎯 목표
판매원/대리점장이 고객과의 통화 녹음을 Google Drive에 업로드하고, 관리자가 확인 후 승인하면 자동으로 수당이 계산되는 시스템

### 📋 만들 파일 목록

#### 데이터베이스
- `prisma/schema.prisma` (수정)

#### 함수/유틸리티
- `lib/google-drive.ts` (함수 추가)
- `lib/affiliate/sales-notification.ts` (새로 만들기)

#### API (5개)
- `app/api/affiliate/sales/[saleId]/submit-confirmation/route.ts` (새로 만들기)
- `app/api/affiliate/sales/[saleId]/cancel-confirmation/route.ts` (새로 만들기)
- `app/api/affiliate/sales/my-sales/route.ts` (새로 만들기)
- `app/api/admin/affiliate/sales/[saleId]/approve/route.ts` (새로 만들기)
- `app/api/admin/affiliate/sales/[saleId]/reject/route.ts` (새로 만들기)
- `app/api/admin/affiliate/sales/pending-approval/route.ts` (새로 만들기)

#### UI 컴포넌트
- `components/affiliate/SalesConfirmationModal.tsx` (새로 만들기)
- `app/admin/affiliate/sales/pending-approval/page.tsx` (새로 만들기)
- `app/partner/[partnerId]/dashboard/PartnerDashboard.tsx` (수정)

### 🔄 프로세스 요약

1. **판매 생성** (자동)
   - 각자 몰에서 결제 완료 시 자동 생성

2. **판매 확정 요청** (판매원/대리점장)
   - 대시보드에서 "확정 요청" 클릭
   - 녹음 파일 업로드
   - Google Drive에 저장
   - 상태: `PENDING` → `PENDING_APPROVAL`

3. **관리자 확인** (관리자)
   - 승인 대기 페이지에서 목록 확인
   - Google Drive 링크 클릭하여 녹음 확인
   - 승인 또는 거부

4. **승인 시** (자동)
   - 상태: `PENDING_APPROVAL` → `APPROVED`
   - 수당 자동 계산
   - CommissionLedger 생성
   - 판매원/대리점장에게 알림

5. **거부 시**
   - 상태: `PENDING_APPROVAL` → `REJECTED`
   - 판매원/대리점장에게 알림
   - 수정 후 재요청 가능

### ✅ 체크리스트 (간단 버전)

1. [ ] 데이터베이스 수정
2. [ ] Google Drive 함수 추가
3. [ ] 판매 확정 요청 API
4. [ ] 요청 취소 API
5. [ ] 내 판매 목록 API
6. [ ] 관리자 승인 API
7. [ ] 관리자 거부 API
8. [ ] 승인 대기 목록 API
9. [ ] 알림 함수
10. [ ] 판매 확정 모달 컴포넌트
11. [ ] 관리자 승인 대기 페이지
12. [ ] 대시보드 통합
13. [ ] 테스트

---

## 🚀 시작하기

**1단계부터 차근차근 따라하시면 됩니다!**

각 단계마다:
1. 파일을 만들거나 수정합니다
2. 코드를 복사해서 붙여넣습니다
3. 저장합니다
4. 테스트합니다
5. 다음 단계로 넘어갑니다

**문제가 생기면 언제든지 물어보세요!** 😊


> **작성일**: 2025-01-28  
> **목적**: 판매원/대리점장이 녹음 파일을 첨부하여 판매 확정 요청하고, 관리자가 승인하는 시스템 구현  
> **난이도**: 초보자도 따라할 수 있도록 쉽게 설명

---

## 📋 목차

1. [전체 프로세스 이해하기](#1-전체-프로세스-이해하기)
2. [1단계: 데이터베이스 수정](#2-1단계-데이터베이스-수정)
3. [2단계: Google Drive 업로드 함수 만들기](#3-2단계-google-drive-업로드-함수-만들기)
4. [3단계: 판매 확정 요청 API 만들기](#4-3단계-판매-확정-요청-api-만들기)
5. [4단계: 관리자 승인/거부 API 만들기](#5-4단계-관리자-승인거부-api-만들기)
6. [5단계: UI 만들기](#6-5단계-ui-만들기)
7. [6단계: 알림 기능 추가](#7-6단계-알림-기능-추가)
8. [테스트 방법](#8-테스트-방법)

---

## 1. 전체 프로세스 이해하기

### 🎬 시나리오

**상황**: 판매원 김철수가 고객과 통화를 했고, 고객이 구매를 결정했습니다.

**과정**:
1. 김철수가 통화 녹음 파일을 준비합니다
2. 판매 확정 요청 페이지에서 녹음 파일을 업로드합니다
3. 시스템이 Google Drive에 파일을 저장합니다
4. 관리자에게 "승인 대기" 알림이 갑니다
5. 관리자가 Google Drive 링크를 클릭해서 녹음을 확인합니다
6. 관리자가 승인하면 자동으로 수당이 계산됩니다
7. 김철수에게 "승인 완료" 알림이 갑니다

### 📊 상태 흐름도

```
PENDING (초기 상태)
    ↓
[판매원/대리점장이 요청 제출]
    ↓
PENDING_APPROVAL (승인 대기)
    ↓
[관리자가 확인 후]
    ├─→ APPROVED (승인) → 수당 자동 계산 ✅
    └─→ REJECTED (거부) → 수정 가능 🔄
```

---

## 2. 1단계: 데이터베이스 수정

### 📝 설명
데이터베이스에 "녹음 파일 정보"와 "승인 정보"를 저장할 공간을 만들어야 합니다.

### 🔧 작업 내용

**파일**: `prisma/schema.prisma`

**AffiliateSale 모델에 추가할 필드들**:

```prisma
model AffiliateSale {
  // ... 기존 필드들 ...
  
  // 🆕 추가할 필드들
  audioFileGoogleDriveId String?        // Google Drive 파일 ID
  audioFileGoogleDriveUrl String?       // Google Drive 공유 링크
  audioFileName String?                 // 원본 파일명
  submittedById Int?                    // 요청 제출자 ID (판매원/대리점장)
  submittedAt DateTime?                 // 요청 제출 시간
  approvedById Int?                     // 승인한 관리자 ID
  approvedAt DateTime?                  // 승인 시간
  rejectedById Int?                     // 거부한 관리자 ID
  rejectedAt DateTime?                  // 거부 시간
  rejectionReason String?               // 거부 사유
  
  // ... 기존 필드들 ...
}
```

### 📌 중요 사항
- `?` 표시는 "없어도 됨"을 의미합니다
- `String?`은 "텍스트 또는 없음"
- `Int?`는 "숫자 또는 없음"
- `DateTime?`은 "날짜/시간 또는 없음"

### ✅ 실행 방법

1. **파일 열기**: `prisma/schema.prisma` 파일을 엽니다
2. **AffiliateSale 모델 찾기**: `model AffiliateSale {` 부분을 찾습니다
3. **필드 추가**: 위의 필드들을 기존 필드들 아래에 추가합니다
4. **저장**: 파일을 저장합니다
5. **데이터베이스 업데이트**: 터미널에서 다음 명령어 실행
   ```bash
   npx prisma db push
   ```

### ⚠️ 주의사항
- 기존 데이터는 그대로 유지됩니다
- 새 필드는 모두 "없음" 상태로 시작합니다

---

## 3. 2단계: Google Drive 업로드 함수 확인하기

### 📝 설명
이미 Google Drive 업로드 함수가 있습니다! (`lib/google-drive.ts`의 `uploadFileToDrive` 함수)
이 함수를 그대로 사용하면 됩니다. 녹음 파일용으로 간단히 래퍼 함수만 만들면 됩니다.

### 🔧 작업 내용

**파일**: `lib/google-drive.ts` (이미 있음, 함수 추가)

**추가할 함수** (파일 끝에):

```typescript
/**
 * 녹음 파일을 Google Drive에 업로드 (간편 함수)
 * @param fileBuffer 파일 데이터 (Buffer)
 * @param fileName 파일명
 * @param folderId Google Drive 폴더 ID (선택사항, 환경 변수에서 가져옴)
 * @returns Google Drive 파일 정보
 */
export async function uploadAudioFileToDrive(
  fileBuffer: Buffer,
  fileName: string,
  folderId?: string
): Promise<{ ok: boolean; fileId?: string; url?: string; error?: string }> {
  // 폴더 ID가 없으면 환경 변수에서 가져오기
  const targetFolderId = folderId || process.env.GOOGLE_DRIVE_SALES_AUDIO_FOLDER_ID || 'root';
  
  // 파일 형식 자동 감지
  let mimeType = 'audio/mpeg'; // 기본값: MP3
  if (fileName.endsWith('.wav')) mimeType = 'audio/wav';
  else if (fileName.endsWith('.m4a')) mimeType = 'audio/m4a';
  else if (fileName.endsWith('.mp3')) mimeType = 'audio/mpeg';

  // 기존 함수 사용
  return await uploadFileToDrive({
    folderId: targetFolderId,
    fileName,
    mimeType,
    buffer: fileBuffer,
    makePublic: true, // 링크로 접근 가능하게
  });
}
```

### 📌 설명
- 기존 `uploadFileToDrive` 함수를 사용합니다
- 녹음 파일 전용으로 간단하게 만든 함수입니다
- 파일 형식을 자동으로 감지합니다
- 공개 링크를 자동으로 생성합니다

### ✅ 실행 방법
1. `lib/google-drive.ts` 파일을 엽니다
2. 파일 끝(마지막 줄)에 위 함수를 추가합니다
3. 저장합니다

---

## 4. 3단계: 판매 확정 요청 API 만들기

### 📝 설명
판매원/대리점장이 "판매 확정 요청"을 제출하는 API를 만듭니다.

### 🔧 작업 내용

**새 파일 생성**: `app/api/affiliate/sales/[saleId]/submit-confirmation/route.ts`

**전체 코드**:

```typescript
// app/api/affiliate/sales/[saleId]/submit-confirmation/route.ts
// 판매 확정 요청 제출 API

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { uploadAudioToGoogleDrive } from '@/lib/google/drive';

const SESSION_COOKIE = 'cg.sid.v2';

// 세션에서 사용자 정보 가져오기
async function getCurrentUser() {
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

    if (!session || !session.User) return null;
    return session.User;
  } catch (error) {
    console.error('[Submit Confirmation] Session error:', error);
    return null;
  }
}

// 판매원/대리점장 권한 확인
async function checkAffiliateAuth(saleId: number, userId: number) {
  // 판매 정보 가져오기
  const sale = await prisma.affiliateSale.findUnique({
    where: { id: saleId },
    include: {
      agent: {
        select: { userId: true, type: true },
      },
      manager: {
        select: { userId: true, type: true },
      },
    },
  });

  if (!sale) {
    return { allowed: false, reason: '판매를 찾을 수 없습니다' };
  }

  // 판매원인 경우: 본인 판매만 가능
  if (sale.agentId && sale.agent?.userId === userId) {
    return { allowed: true, profile: sale.agent };
  }

  // 대리점장인 경우: 본인 판매만 가능 (소속 판매원 판매는 불가)
  if (sale.managerId && sale.manager?.userId === userId) {
    return { allowed: true, profile: sale.manager };
  }

  return { allowed: false, reason: '본인의 판매만 확정 요청할 수 있습니다' };
}

/**
 * POST: 판매 확정 요청 제출
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { saleId: string } }
) {
  try {
    // 1. 사용자 확인
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    // 2. 판매 ID 확인
    const saleId = parseInt(params.saleId);
    if (isNaN(saleId)) {
      return NextResponse.json(
        { ok: false, error: '올바른 판매 ID가 아닙니다' },
        { status: 400 }
      );
    }

    // 3. 권한 확인 (본인 판매만)
    const authCheck = await checkAffiliateAuth(saleId, user.id);
    if (!authCheck.allowed) {
      return NextResponse.json(
        { ok: false, error: authCheck.reason },
        { status: 403 }
      );
    }

    // 4. 판매 상태 확인 (이미 요청했거나 승인된 경우 불가)
    const sale = await prisma.affiliateSale.findUnique({
      where: { id: saleId },
      select: { id: true, status: true },
    });

    if (!sale) {
      return NextResponse.json(
        { ok: false, error: '판매를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    if (sale.status === 'PENDING_APPROVAL') {
      return NextResponse.json(
        { ok: false, error: '이미 승인 대기 중입니다' },
        { status: 400 }
      );
    }

    if (sale.status === 'APPROVED') {
      return NextResponse.json(
        { ok: false, error: '이미 승인된 판매입니다' },
        { status: 400 }
      );
    }

    // 5. 파일 업로드 처리
    const formData = await req.formData();
    const audioFile = formData.get('audioFile') as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { ok: false, error: '녹음 파일을 업로드해주세요' },
        { status: 400 }
      );
    }

    // 파일 크기 확인 (50MB 제한)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, error: '파일 크기는 50MB를 초과할 수 없습니다' },
        { status: 400 }
      );
    }

    // 파일 형식 확인 (MP3, WAV, M4A)
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/x-m4a'];
    if (!allowedTypes.includes(audioFile.type)) {
      return NextResponse.json(
        { ok: false, error: '지원하는 파일 형식: MP3, WAV, M4A' },
        { status: 400 }
      );
    }

    // 6. Google Drive에 업로드
    const fileBuffer = Buffer.from(await audioFile.arrayBuffer());
    const fileName = `sale_${saleId}_${Date.now()}_${audioFile.name}`;

    // Google Drive 업로드 (기존 함수 사용)
    const { uploadAudioFileToDrive } = await import('@/lib/google-drive');
    const driveResult = await uploadAudioFileToDrive(fileBuffer, fileName);

    if (!driveResult.ok || !driveResult.fileId || !driveResult.url) {
      return NextResponse.json(
        { ok: false, error: driveResult.error || 'Google Drive 업로드 실패' },
        { status: 500 }
      );
    }

    // 7. 데이터베이스 업데이트
    const updatedSale = await prisma.affiliateSale.update({
      where: { id: saleId },
      data: {
        status: 'PENDING_APPROVAL',
        audioFileGoogleDriveId: driveResult.fileId,
        audioFileGoogleDriveUrl: driveResult.url,
        audioFileName: audioFile.name,
        submittedById: user.id,
        submittedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      message: '판매 확정 요청이 제출되었습니다',
      sale: {
        id: updatedSale.id,
        status: updatedSale.status,
        audioFileUrl: updatedSale.audioFileGoogleDriveUrl,
      },
    });
  } catch (error: any) {
    console.error('[Submit Confirmation] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
```

### 📌 설명
- 이 API는 판매원/대리점장이 사용합니다
- 본인 판매만 요청할 수 있습니다
- 녹음 파일을 Google Drive에 업로드합니다
- 판매 상태를 `PENDING_APPROVAL`로 변경합니다

---

## 5. 4단계: 관리자 승인/거부 API 만들기

### 📝 설명
관리자가 판매 확정 요청을 승인하거나 거부하는 API를 만듭니다.

### 🔧 작업 내용

#### 5-1. 승인 API

**새 파일 생성**: `app/api/admin/affiliate/sales/[saleId]/approve/route.ts`

```typescript
// app/api/admin/affiliate/sales/[saleId]/approve/route.ts
// 판매 확정 승인 API

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { syncSaleCommissionLedgers } from '@/lib/affiliate/commission-ledger';

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
          select: { id: true, role: true, name: true },
        },
      },
    });

    if (!session || !session.User) return null;
    if (session.User.role !== 'admin') return null;
    return session.User;
  } catch (error) {
    console.error('[Approve Sale] Auth error:', error);
    return null;
  }
}

/**
 * POST: 판매 확정 승인
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { saleId: string } }
) {
  try {
    // 1. 관리자 권한 확인
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: '관리자 권한이 필요합니다' },
        { status: 403 }
      );
    }

    // 2. 판매 ID 확인
    const saleId = parseInt(params.saleId);
    if (isNaN(saleId)) {
      return NextResponse.json(
        { ok: false, error: '올바른 판매 ID가 아닙니다' },
        { status: 400 }
      );
    }

    // 3. 판매 정보 확인
    const sale = await prisma.affiliateSale.findUnique({
      where: { id: saleId },
      select: {
        id: true,
        status: true,
        audioFileGoogleDriveUrl: true,
      },
    });

    if (!sale) {
      return NextResponse.json(
        { ok: false, error: '판매를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    if (sale.status !== 'PENDING_APPROVAL') {
      return NextResponse.json(
        { ok: false, error: '승인 대기 중인 판매만 승인할 수 있습니다' },
        { status: 400 }
      );
    }

    // 4. 판매 승인 처리
    const updatedSale = await prisma.affiliateSale.update({
      where: { id: saleId },
      data: {
        status: 'APPROVED',
        approvedById: admin.id,
        approvedAt: new Date(),
        confirmedAt: new Date(), // 기존 필드와 호환성 유지
      },
    });

    // 5. 수당 자동 계산
    try {
      await syncSaleCommissionLedgers(saleId, {
        includeHq: true,
        regenerate: false,
      });
      console.log(`[Approve Sale] 수당 계산 완료: Sale #${saleId}`);
    } catch (commissionError: any) {
      console.error(`[Approve Sale] 수당 계산 오류:`, commissionError);
      // 수당 계산 실패해도 승인은 완료 (나중에 수동으로 계산 가능)
    }

    return NextResponse.json({
      ok: true,
      message: '판매가 승인되었습니다',
      sale: {
        id: updatedSale.id,
        status: updatedSale.status,
      },
    });
  } catch (error: any) {
    console.error('[Approve Sale] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
```

#### 5-2. 거부 API

**새 파일 생성**: `app/api/admin/affiliate/sales/[saleId]/reject/route.ts`

```typescript
// app/api/admin/affiliate/sales/[saleId]/reject/route.ts
// 판매 확정 거부 API

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

const SESSION_COOKIE = 'cg.sid.v2';

// 관리자 권한 확인 (위와 동일)
async function checkAdminAuth() {
  const sid = cookies().get(SESSION_COOKIE)?.value;
  if (!sid) return null;

  try {
    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: {
        User: {
          select: { id: true, role: true, name: true },
        },
      },
    });

    if (!session || !session.User) return null;
    if (session.User.role !== 'admin') return null;
    return session.User;
  } catch (error) {
    console.error('[Reject Sale] Auth error:', error);
    return null;
  }
}

/**
 * POST: 판매 확정 거부
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { saleId: string } }
) {
  try {
    // 1. 관리자 권한 확인
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: '관리자 권한이 필요합니다' },
        { status: 403 }
      );
    }

    // 2. 판매 ID 확인
    const saleId = parseInt(params.saleId);
    if (isNaN(saleId)) {
      return NextResponse.json(
        { ok: false, error: '올바른 판매 ID가 아닙니다' },
        { status: 400 }
      );
    }

    // 3. 거부 사유 받기
    const body = await req.json();
    const { reason } = body;

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: '거부 사유를 입력해주세요' },
        { status: 400 }
      );
    }

    // 4. 판매 정보 확인
    const sale = await prisma.affiliateSale.findUnique({
      where: { id: saleId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!sale) {
      return NextResponse.json(
        { ok: false, error: '판매를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    if (sale.status !== 'PENDING_APPROVAL') {
      return NextResponse.json(
        { ok: false, error: '승인 대기 중인 판매만 거부할 수 있습니다' },
        { status: 400 }
      );
    }

    // 5. 판매 거부 처리
    const updatedSale = await prisma.affiliateSale.update({
      where: { id: saleId },
      data: {
        status: 'REJECTED',
        rejectedById: admin.id,
        rejectedAt: new Date(),
        rejectionReason: reason.trim(),
        // 상태를 PENDING으로 되돌려서 재요청 가능하게
        submittedAt: null,
        submittedById: null,
      },
    });

    return NextResponse.json({
      ok: true,
      message: '판매가 거부되었습니다',
      sale: {
        id: updatedSale.id,
        status: updatedSale.status,
        rejectionReason: updatedSale.rejectionReason,
      },
    });
  } catch (error: any) {
    console.error('[Reject Sale] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
```

#### 5-3. 승인 대기 목록 조회 API

**새 파일 생성**: `app/api/admin/affiliate/sales/pending-approval/route.ts`

```typescript
// app/api/admin/affiliate/sales/pending-approval/route.ts
// 승인 대기 중인 판매 목록 조회

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

const SESSION_COOKIE = 'cg.sid.v2';

// 관리자 권한 확인 (위와 동일)
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

    if (!session || !session.User) return null;
    if (session.User.role !== 'admin') return null;
    return session.User;
  } catch (error) {
    return null;
  }
}

/**
 * GET: 승인 대기 중인 판매 목록
 */
export async function GET(req: NextRequest) {
  try {
    // 관리자 권한 확인
    const admin = await checkAdminAuth();
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: '관리자 권한이 필요합니다' },
        { status: 403 }
      );
    }

    // 승인 대기 중인 판매 조회
    const pendingSales = await prisma.affiliateSale.findMany({
      where: {
        status: 'PENDING_APPROVAL',
      },
      include: {
        agent: {
          select: {
            id: true,
            displayName: true,
            affiliateCode: true,
            type: true,
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
        manager: {
          select: {
            id: true,
            displayName: true,
            affiliateCode: true,
            type: true,
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
        product: {
          select: {
            productCode: true,
            title: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'asc', // 오래된 것부터
      },
    });

    return NextResponse.json({
      ok: true,
      sales: pendingSales.map((sale) => ({
        id: sale.id,
        productCode: sale.productCode,
        productTitle: sale.product?.title,
        saleAmount: sale.saleAmount,
        saleDate: sale.saleDate,
        submittedAt: sale.submittedAt,
        audioFileGoogleDriveUrl: sale.audioFileGoogleDriveUrl,
        audioFileName: sale.audioFileName,
        agent: sale.agent
          ? {
              name: sale.agent.displayName || sale.agent.user?.name,
              code: sale.agent.affiliateCode,
              phone: sale.agent.user?.phone,
            }
          : null,
        manager: sale.manager
          ? {
              name: sale.manager.displayName || sale.manager.user?.name,
              code: sale.manager.affiliateCode,
              phone: sale.manager.user?.phone,
            }
          : null,
      })),
      count: pendingSales.length,
    });
  } catch (error: any) {
    console.error('[Pending Approval] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
```

### 📌 설명
- **승인 API**: 판매를 승인하고 수당을 자동 계산합니다
- **거부 API**: 판매를 거부하고 사유를 저장합니다 (재요청 가능)
- **목록 API**: 승인 대기 중인 모든 판매를 보여줍니다

---

## 6. 5단계: UI 만들기

### 📝 설명
사용자가 쉽게 사용할 수 있는 화면을 만듭니다. 단계별로 하나씩 만들어봅시다.

### 🔧 작업 내용

#### 6-1. 판매 확정 요청 모달 컴포넌트 만들기

**새 파일 생성**: `components/affiliate/SalesConfirmationModal.tsx`

이 컴포넌트는 판매원/대리점장이 사용합니다.

```typescript
'use client';

import { useState, useRef } from 'react';
import { FiUpload, FiX, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { showError, showSuccess } from '@/components/ui/Toast';

interface SalesConfirmationModalProps {
  saleId: number;
  currentStatus: string;
  audioFileUrl?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SalesConfirmationModal({
  saleId,
  currentStatus,
  audioFileUrl,
  onClose,
  onSuccess,
}: SalesConfirmationModalProps) {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 파일 선택
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 확인 (50MB)
    if (file.size > 50 * 1024 * 1024) {
      showError('파일 크기는 50MB를 초과할 수 없습니다');
      return;
    }

    // 파일 형식 확인
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/x-m4a'];
    if (!allowedTypes.includes(file.type)) {
      showError('지원하는 파일 형식: MP3, WAV, M4A');
      return;
    }

    setAudioFile(file);
  };

  // 판매 확정 요청 제출
  const handleSubmit = async () => {
    if (!audioFile) {
      showError('녹음 파일을 선택해주세요');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('audioFile', audioFile);

      const response = await fetch(`/api/affiliate/sales/${saleId}/submit-confirmation`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        showSuccess('판매 확정 요청이 제출되었습니다');
        onSuccess();
        onClose();
      } else {
        showError(data.error || '요청 제출에 실패했습니다');
      }
    } catch (error: any) {
      console.error('[Sales Confirmation] Submit error:', error);
      showError('요청 제출 중 오류가 발생했습니다');
    } finally {
      setIsUploading(false);
    }
  };

  // 요청 취소 (PENDING_APPROVAL 상태일 때만)
  const handleCancel = async () => {
    if (!confirm('판매 확정 요청을 취소하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/affiliate/sales/${saleId}/cancel-confirmation`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        showSuccess('요청이 취소되었습니다');
        onSuccess();
        onClose();
      } else {
        showError(data.error || '요청 취소에 실패했습니다');
      }
    } catch (error: any) {
      console.error('[Sales Confirmation] Cancel error:', error);
      showError('요청 취소 중 오류가 발생했습니다');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">판매 확정 요청</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* 상태 표시 */}
        {currentStatus === 'PENDING_APPROVAL' && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800">
              <FiAlertCircle className="w-5 h-5" />
              <span className="font-semibold">승인 대기 중</span>
            </div>
            {audioFileUrl && (
              <a
                href={audioFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 text-sm text-yellow-700 hover:text-yellow-900 underline"
              >
                녹음 파일 확인하기
              </a>
            )}
          </div>
        )}

        {currentStatus === 'APPROVED' && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <FiCheckCircle className="w-5 h-5" />
              <span className="font-semibold">승인 완료</span>
            </div>
          </div>
        )}

        {currentStatus === 'REJECTED' && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <FiAlertCircle className="w-5 h-5" />
              <span className="font-semibold">거부됨</span>
            </div>
            <p className="mt-2 text-sm text-red-700">
              거부 사유를 확인하고 수정 후 다시 제출해주세요.
            </p>
          </div>
        )}

        {/* 파일 업로드 (PENDING 또는 REJECTED 상태일 때만) */}
        {(currentStatus === 'PENDING' || currentStatus === 'REJECTED') && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                고객과의 통화 녹음 파일
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/mpeg,audio/mp3,audio/wav,audio/m4a"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {audioFile ? (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-700">{audioFile.name}</p>
                    <p className="text-xs text-gray-500">
                      크기: {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <button
                      onClick={() => {
                        setAudioFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      파일 제거
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center py-4 text-gray-500 hover:text-gray-700"
                  >
                    <FiUpload className="w-8 h-8 mb-2" />
                    <span className="text-sm">녹음 파일 선택</span>
                    <span className="text-xs mt-1">MP3, WAV, M4A (최대 50MB)</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={!audioFile || isUploading}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? '업로드 중...' : '요청 제출'}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* 취소 버튼 (PENDING_APPROVAL 상태일 때만) */}
        {currentStatus === 'PENDING_APPROVAL' && (
          <div className="mt-4">
            <button
              onClick={handleCancel}
              className="w-full px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
            >
              요청 취소
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

#### 6-2. 요청 취소 API 만들기

**새 파일 생성**: `app/api/affiliate/sales/[saleId]/cancel-confirmation/route.ts`

```typescript
// app/api/affiliate/sales/[saleId]/cancel-confirmation/route.ts
// 판매 확정 요청 취소 API

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

const SESSION_COOKIE = 'cg.sid.v2';

// 세션에서 사용자 정보 가져오기 (위와 동일)
async function getCurrentUser() {
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

    if (!session || !session.User) return null;
    return session.User;
  } catch (error) {
    return null;
  }
}

/**
 * POST: 판매 확정 요청 취소
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { saleId: string } }
) {
  try {
    // 1. 사용자 확인
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    // 2. 판매 ID 확인
    const saleId = parseInt(params.saleId);
    if (isNaN(saleId)) {
      return NextResponse.json(
        { ok: false, error: '올바른 판매 ID가 아닙니다' },
        { status: 400 }
      );
    }

    // 3. 판매 정보 확인
    const sale = await prisma.affiliateSale.findUnique({
      where: { id: saleId },
      include: {
        agent: {
          select: { userId: true },
        },
        manager: {
          select: { userId: true },
        },
      },
    });

    if (!sale) {
      return NextResponse.json(
        { ok: false, error: '판매를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 4. 권한 확인 (본인이 제출한 요청만 취소 가능)
    if (sale.submittedById !== user.id) {
      return NextResponse.json(
        { ok: false, error: '본인이 제출한 요청만 취소할 수 있습니다' },
        { status: 403 }
      );
    }

    // 5. 상태 확인 (PENDING_APPROVAL만 취소 가능)
    if (sale.status !== 'PENDING_APPROVAL') {
      return NextResponse.json(
        { ok: false, error: '승인 대기 중인 요청만 취소할 수 있습니다' },
        { status: 400 }
      );
    }

    // 6. 요청 취소 처리 (상태를 PENDING으로 되돌림)
    const updatedSale = await prisma.affiliateSale.update({
      where: { id: saleId },
      data: {
        status: 'PENDING',
        submittedAt: null,
        submittedById: null,
        // Google Drive 파일은 그대로 유지 (나중에 재사용 가능)
      },
    });

    return NextResponse.json({
      ok: true,
      message: '요청이 취소되었습니다',
      sale: {
        id: updatedSale.id,
        status: updatedSale.status,
      },
    });
  } catch (error: any) {
    console.error('[Cancel Confirmation] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
```

#### 6-3. 판매원/대리점장 대시보드에 통합

**파일**: `app/partner/[partnerId]/dashboard/PartnerDashboard.tsx`

**추가할 내용**:

1. **상태 변수 추가** (파일 상단, 다른 useState 근처):
```typescript
const [showSalesConfirmationModal, setShowSalesConfirmationModal] = useState(false);
const [selectedSaleForConfirmation, setSelectedSaleForConfirmation] = useState<{
  id: number;
  status: string;
  audioFileUrl?: string | null;
} | null>(null);
```

2. **판매 목록 API 호출 함수 추가**:
```typescript
const [mySales, setMySales] = useState<Array<{
  id: number;
  productCode: string;
  saleAmount: number;
  status: string;
  audioFileGoogleDriveUrl: string | null;
  saleDate: string | null;
}>>([]);

const loadMySales = async () => {
  try {
    const response = await fetch('/api/affiliate/sales/my-sales', {
      credentials: 'include',
    });
    const data = await response.json();
    if (response.ok && data.ok) {
      setMySales(data.sales || []);
    }
  } catch (error) {
    console.error('[PartnerDashboard] Failed to load sales:', error);
  }
};

// useEffect에 추가
useEffect(() => {
  loadStats();
  loadMyContract();
  loadMySales(); // 추가
  if (isBranchManager) {
    loadContracts();
  }
}, [isBranchManager, loadMyContract]);
```

3. **판매 목록 섹션 추가** (대시보드 JSX 부분):
```typescript
{/* 판매 목록 섹션 */}
<div className="bg-white rounded-lg shadow-md p-6">
  <h2 className="text-xl font-bold text-gray-800 mb-4">내 판매 목록</h2>
  {mySales.length === 0 ? (
    <p className="text-gray-500">판매 내역이 없습니다</p>
  ) : (
    <div className="space-y-3">
      {mySales.map((sale) => {
        const statusBadge = {
          PENDING: { label: '확정 대기', color: 'bg-gray-100 text-gray-800' },
          PENDING_APPROVAL: { label: '승인 대기', color: 'bg-yellow-100 text-yellow-800' },
          APPROVED: { label: '승인 완료', color: 'bg-green-100 text-green-800' },
          REJECTED: { label: '거부됨', color: 'bg-red-100 text-red-800' },
        }[sale.status] || { label: sale.status, color: 'bg-gray-100 text-gray-800' };

        return (
          <div key={sale.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-semibold text-gray-800">#{sale.id}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusBadge.color}`}>
                    {statusBadge.label}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  상품: {sale.productCode} | 금액: {(sale.saleAmount / 10000).toLocaleString()}만원
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedSaleForConfirmation({
                    id: sale.id,
                    status: sale.status,
                    audioFileUrl: sale.audioFileGoogleDriveUrl,
                  });
                  setShowSalesConfirmationModal(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold"
              >
                {sale.status === 'PENDING' || sale.status === 'REJECTED' ? '확정 요청' : '상세 보기'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  )}
</div>
```

4. **모달 컴포넌트 추가** (파일 끝, return 문 안):
```typescript
{/* 판매 확정 모달 */}
{showSalesConfirmationModal && selectedSaleForConfirmation && (
  <SalesConfirmationModal
    saleId={selectedSaleForConfirmation.id}
    currentStatus={selectedSaleForConfirmation.status}
    audioFileUrl={selectedSaleForConfirmation.audioFileUrl}
    onClose={() => {
      setShowSalesConfirmationModal(false);
      setSelectedSaleForConfirmation(null);
    }}
    onSuccess={() => {
      loadMySales(); // 목록 새로고침
    }}
  />
)}
```

5. **import 추가** (파일 상단):
```typescript
import SalesConfirmationModal from '@/components/affiliate/SalesConfirmationModal';
```

**추가로 필요한 API**: `app/api/affiliate/sales/my-sales/route.ts`

```typescript
// app/api/affiliate/sales/my-sales/route.ts
// 내 판매 목록 조회 API

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

const SESSION_COOKIE = 'cg.sid.v2';

async function getCurrentUser() {
  const sid = cookies().get(SESSION_COOKIE)?.value;
  if (!sid) return null;

  try {
    const session = await prisma.session.findUnique({
      where: { id: sid },
      include: {
        User: {
          select: { id: true },
        },
      },
    });
    return session?.User || null;
  } catch (error) {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: '로그인이 필요합니다' }, { status: 401 });
    }

    // 사용자의 어필리에이트 프로필 찾기
    const profile = await prisma.affiliateProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, type: true },
    });

    if (!profile) {
      return NextResponse.json({ ok: true, sales: [] });
    }

    // 본인 판매만 조회
    const where: any = {};
    if (profile.type === 'SALES_AGENT') {
      where.agentId = profile.id;
    } else if (profile.type === 'BRANCH_MANAGER') {
      where.managerId = profile.id;
    } else {
      return NextResponse.json({ ok: true, sales: [] });
    }

    const sales = await prisma.affiliateSale.findMany({
      where,
      select: {
        id: true,
        productCode: true,
        saleAmount: true,
        status: true,
        audioFileGoogleDriveUrl: true,
        saleDate: true,
        submittedAt: true,
        approvedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // 최근 50개만
    });

    return NextResponse.json({
      ok: true,
      sales,
    });
  } catch (error: any) {
    console.error('[My Sales] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
```

#### 6-4. 관리자 승인 대기 페이지

**새 파일 생성**: `app/admin/affiliate/sales/pending-approval/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { FiCheckCircle, FiXCircle, FiExternalLink, FiRefreshCw, FiClock } from 'react-icons/fi';
import { showError, showSuccess } from '@/components/ui/Toast';

interface PendingSale {
  id: number;
  productCode: string;
  productTitle: string | null;
  saleAmount: number;
  saleDate: string | null;
  submittedAt: string;
  audioFileGoogleDriveUrl: string | null;
  audioFileName: string | null;
  agent: {
    name: string | null;
    code: string;
    phone: string | null;
  } | null;
  manager: {
    name: string | null;
    code: string;
    phone: string | null;
  } | null;
}

export default function PendingApprovalPage() {
  const [sales, setSales] = useState<PendingSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<number | null>(null);

  // 목록 불러오기
  const loadPendingSales = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/affiliate/sales/pending-approval', {
        credentials: 'include',
      });
      const data = await response.json();

      if (response.ok && data.ok) {
        setSales(data.sales || []);
      } else {
        showError(data.error || '목록을 불러오는 중 오류가 발생했습니다');
      }
    } catch (error: any) {
      console.error('[Pending Approval] Load error:', error);
      showError('목록을 불러오는 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingSales();
  }, []);

  // 승인 처리
  const handleApprove = async (saleId: number) => {
    if (!confirm('이 판매를 승인하시겠습니까? 승인 시 수당이 자동으로 계산됩니다.')) {
      return;
    }

    try {
      setApprovingId(saleId);
      const response = await fetch(`/api/admin/affiliate/sales/${saleId}/approve`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();

      if (response.ok && data.ok) {
        showSuccess('판매가 승인되었습니다');
        loadPendingSales(); // 목록 새로고침
      } else {
        showError(data.error || '승인 처리에 실패했습니다');
      }
    } catch (error: any) {
      console.error('[Pending Approval] Approve error:', error);
      showError('승인 처리 중 오류가 발생했습니다');
    } finally {
      setApprovingId(null);
    }
  };

  // 거부 처리
  const handleReject = async (saleId: number) => {
    if (!rejectReason.trim()) {
      showError('거부 사유를 입력해주세요');
      return;
    }

    try {
      setRejectingId(saleId);
      const response = await fetch(`/api/admin/affiliate/sales/${saleId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: rejectReason }),
      });
      const data = await response.json();

      if (response.ok && data.ok) {
        showSuccess('판매가 거부되었습니다');
        setShowRejectModal(null);
        setRejectReason('');
        loadPendingSales(); // 목록 새로고침
      } else {
        showError(data.error || '거부 처리에 실패했습니다');
      }
    } catch (error: any) {
      console.error('[Pending Approval] Reject error:', error);
      showError('거부 처리 중 오류가 발생했습니다');
    } finally {
      setRejectingId(null);
    }
  };

  // 금액 포맷팅
  const formatAmount = (amount: number) => {
    return `${(amount / 10000).toLocaleString()}만원`;
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              ⏳ 판매 확정 승인 대기
            </h1>
            <p className="text-gray-600">
              녹음 파일을 확인하고 판매 확정을 승인하거나 거부하세요.
            </p>
          </div>
          <button
            onClick={loadPendingSales}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} />
            새로고침
          </button>
        </div>
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">로딩 중...</p>
        </div>
      ) : sales.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <FiCheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <p className="text-xl font-semibold text-gray-800">승인 대기 중인 판매가 없습니다</p>
          <p className="text-gray-600 mt-2">모든 판매가 처리되었습니다.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sales.map((sale) => (
            <div key={sale.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between">
                {/* 왼쪽: 판매 정보 */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl font-bold text-blue-600">#{sale.id}</span>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                      승인 대기 중
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">상품</p>
                      <p className="font-semibold text-gray-800">
                        {sale.productTitle || sale.productCode}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">판매 금액</p>
                      <p className="font-semibold text-gray-800">{formatAmount(sale.saleAmount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">요청 제출 시간</p>
                      <p className="font-semibold text-gray-800">{formatDate(sale.submittedAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">담당자</p>
                      <p className="font-semibold text-gray-800">
                        {sale.agent
                          ? `판매원: ${sale.agent.name || '이름 없음'} (${sale.agent.code})`
                          : sale.manager
                          ? `대리점장: ${sale.manager.name || '이름 없음'} (${sale.manager.code})`
                          : '담당자 없음'}
                      </p>
                    </div>
                  </div>

                  {/* 녹음 파일 링크 */}
                  {sale.audioFileGoogleDriveUrl && (
                    <div className="mb-4">
                      <a
                        href={sale.audioFileGoogleDriveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold"
                      >
                        <FiExternalLink />
                        녹음 파일 확인하기 (Google Drive)
                        {sale.audioFileName && (
                          <span className="text-sm text-gray-500">({sale.audioFileName})</span>
                        )}
                      </a>
                    </div>
                  )}
                </div>

                {/* 오른쪽: 액션 버튼 */}
                <div className="flex flex-col gap-2 ml-6">
                  <button
                    onClick={() => handleApprove(sale.id)}
                    disabled={approvingId === sale.id}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
                  >
                    {approvingId === sale.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        승인 중...
                      </>
                    ) : (
                      <>
                        <FiCheckCircle />
                        승인
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowRejectModal(sale.id)}
                    disabled={rejectingId === sale.id}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
                  >
                    <FiXCircle />
                    거부
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 거부 사유 입력 모달 */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">거부 사유 입력</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="거부 사유를 입력해주세요..."
              className="w-full h-32 border border-gray-300 rounded-lg px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleReject(showRejectModal)}
                disabled={!rejectReason.trim() || rejectingId === showRejectModal}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rejectingId === showRejectModal ? '처리 중...' : '거부하기'}
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 📌 설명
- 관리자가 승인 대기 중인 모든 판매를 볼 수 있습니다
- 각 판매마다 Google Drive 링크가 있어 바로 확인할 수 있습니다
- 승인/거부 버튼으로 처리할 수 있습니다
- 거부 시 사유를 입력해야 합니다

---

## 7. 6단계: 알림 기능 추가

### 📝 설명
승인/거부 시 판매원/대리점장에게 알림을 보냅니다.

### 🔧 작업 내용

**파일**: `lib/affiliate/sales-notification.ts` (새로 만들기)

```typescript
// lib/affiliate/sales-notification.ts
// 판매 확정 관련 알림

import prisma from '@/lib/prisma';
import { sendNotificationToUser } from '@/lib/push/server';

/**
 * 판매 확정 승인 알림
 */
export async function notifySaleApproved(saleId: number) {
  try {
    const sale = await prisma.affiliateSale.findUnique({
      where: { id: saleId },
      include: {
        agent: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
        manager: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!sale) return;

    // 판매원에게 알림
    if (sale.agentId && sale.agent?.user) {
      await sendNotificationToUser(sale.agent.user.id, {
        title: '✅ 판매 확정 승인',
        body: `판매 #${saleId}이(가) 승인되었습니다. 수당이 계산되었습니다.`,
        data: { saleId, type: 'sale_approved' },
      });
    }

    // 대리점장에게 알림 (판매원이 아닌 경우)
    if (sale.managerId && sale.manager?.user && !sale.agentId) {
      await sendNotificationToUser(sale.manager.user.id, {
        title: '✅ 판매 확정 승인',
        body: `판매 #${saleId}이(가) 승인되었습니다. 수당이 계산되었습니다.`,
        data: { saleId, type: 'sale_approved' },
      });
    }
  } catch (error) {
    console.error('[Notify Sale Approved] Error:', error);
  }
}

/**
 * 판매 확정 거부 알림
 */
export async function notifySaleRejected(saleId: number, reason: string) {
  try {
    const sale = await prisma.affiliateSale.findUnique({
      where: { id: saleId },
      include: {
        agent: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
        manager: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!sale) return;

    // 판매원에게 알림
    if (sale.agentId && sale.agent?.user) {
      await sendNotificationToUser(sale.agent.user.id, {
        title: '❌ 판매 확정 거부',
        body: `판매 #${saleId}이(가) 거부되었습니다. 사유: ${reason}`,
        data: { saleId, type: 'sale_rejected', reason },
      });
    }

    // 대리점장에게 알림
    if (sale.managerId && sale.manager?.user && !sale.agentId) {
      await sendNotificationToUser(sale.manager.user.id, {
        title: '❌ 판매 확정 거부',
        body: `판매 #${saleId}이(가) 거부되었습니다. 사유: ${reason}`,
        data: { saleId, type: 'sale_rejected', reason },
      });
    }
  } catch (error) {
    console.error('[Notify Sale Rejected] Error:', error);
  }
}
```

**승인/거부 API에 알림 추가**:

승인 API (`app/api/admin/affiliate/sales/[saleId]/approve/route.ts`)에 추가:
```typescript
import { notifySaleApproved } from '@/lib/affiliate/sales-notification';

// 승인 처리 후:
await notifySaleApproved(saleId);
```

거부 API (`app/api/admin/affiliate/sales/[saleId]/reject/route.ts`)에 추가:
```typescript
import { notifySaleRejected } from '@/lib/affiliate/sales-notification';

// 거부 처리 후:
await notifySaleRejected(saleId, reason);
```

---

## 8. 테스트 방법

### 📝 단계별 테스트

1. **데이터베이스 테스트**
   - Prisma Studio 열기: `npx prisma studio`
   - AffiliateSale 테이블 확인
   - 새 필드들이 추가되었는지 확인

2. **파일 업로드 테스트**
   - 판매 확정 요청 API 호출
   - Google Drive에 파일이 업로드되는지 확인
   - 링크가 정상적으로 생성되는지 확인

3. **승인/거부 테스트**
   - 관리자로 로그인
   - 승인 대기 목록 확인
   - 승인/거부 실행
   - 수당 계산 확인

4. **알림 테스트**
   - 푸시 알림이 정상적으로 전송되는지 확인

---

## 📌 환경 변수 설정

`.env.local` 파일에 추가 (이미 있으면 확인만):

```bash
# Google Drive Service Account 설정 (이미 있을 수 있음)
GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_SHARED_DRIVE_ID=your_shared_drive_id  # 선택사항

# 녹음 파일 저장 폴더 (선택사항, 없으면 root에 저장)
GOOGLE_DRIVE_SALES_AUDIO_FOLDER_ID=your_folder_id
```

### 📝 Google Drive 폴더 ID 찾는 방법
1. Google Drive에서 폴더를 엽니다
2. URL을 확인합니다: `https://drive.google.com/drive/folders/여기가폴더ID`
3. 폴더 ID를 복사해서 환경 변수에 넣습니다

---

## ⚠️ 주의사항

1. **Google Drive 권한**: Service Account 또는 OAuth 설정 필요
2. **파일 크기**: 50MB 제한 확인
3. **에러 처리**: 모든 API에 에러 처리 포함
4. **보안**: 권한 확인 필수

---

## 🎉 완료 체크리스트

### 1단계: 데이터베이스
- [ ] `prisma/schema.prisma`에 AffiliateSale 필드 추가
- [ ] `npx prisma db push` 실행
- [ ] Prisma Studio로 새 필드 확인

### 2단계: Google Drive 함수
- [ ] `lib/google-drive.ts`에 `uploadAudioFileToDrive` 함수 추가
- [ ] 환경 변수 설정 확인

### 3단계: API 만들기
- [ ] `app/api/affiliate/sales/[saleId]/submit-confirmation/route.ts` 생성
- [ ] `app/api/affiliate/sales/[saleId]/cancel-confirmation/route.ts` 생성
- [ ] `app/api/admin/affiliate/sales/[saleId]/approve/route.ts` 생성
- [ ] `app/api/admin/affiliate/sales/[saleId]/reject/route.ts` 생성
- [ ] `app/api/admin/affiliate/sales/pending-approval/route.ts` 생성

### 4단계: 알림 기능
- [ ] `lib/affiliate/sales-notification.ts` 생성
- [ ] 승인 API에 알림 추가
- [ ] 거부 API에 알림 추가

### 5단계: UI 만들기
- [ ] `components/affiliate/SalesConfirmationModal.tsx` 생성
- [ ] `app/admin/affiliate/sales/pending-approval/page.tsx` 생성
- [ ] 판매원/대리점장 대시보드에 모달 통합

### 6단계: 테스트
- [ ] 판매 확정 요청 테스트
- [ ] Google Drive 업로드 테스트
- [ ] 관리자 승인/거부 테스트
- [ ] 알림 전송 테스트
- [ ] 수당 자동 계산 확인

---

## 📚 구현 우선순위 (단계별)

### ⭐ 최우선 (1일차)
1. **데이터베이스 수정** (30분)
   - 스키마 수정
   - 마이그레이션 실행

2. **Google Drive 함수** (30분)
   - `uploadAudioFileToDrive` 함수 추가
   - 테스트

3. **판매 확정 요청 API** (1시간)
   - 파일 업로드 테스트
   - 권한 확인 테스트

### 🔥 중요 (2일차)
4. **관리자 승인/거부 API** (1시간)
   - 승인 API
   - 거부 API
   - 수당 계산 연결

5. **승인 대기 목록 API** (30분)
   - 목록 조회 테스트

### 💡 보완 (3일차)
6. **알림 기능** (1시간)
   - 알림 함수 만들기
   - API에 연결

7. **UI 구현** (2-3시간)
   - 모달 컴포넌트
   - 관리자 페이지
   - 대시보드 통합

8. **테스트 및 수정** (1-2시간)
   - 전체 플로우 테스트
   - 버그 수정

---

## 🚨 주의사항 및 팁

### 1. Google Drive 설정
- Service Account 키가 필요합니다
- 폴더 ID는 선택사항입니다 (없으면 root에 저장)
- 공개 링크가 자동으로 생성됩니다

### 2. 파일 크기 제한
- 최대 50MB로 제한했습니다
- 더 큰 파일이 필요하면 환경 변수로 조정 가능

### 3. 에러 처리
- 모든 API에 try-catch 추가했습니다
- 사용자에게 명확한 에러 메시지 표시

### 4. 보안
- 본인 판매만 요청 가능
- 관리자만 승인/거부 가능
- 세션 확인 필수

### 5. 기존 기능과의 호환성
- 기존 `CONFIRMED` 상태는 그대로 유지
- 새 프로세스는 `PENDING_APPROVAL` → `APPROVED` 사용

---

## 💬 질문이 있으면?

구현 중 문제가 생기거나 이해가 안 되는 부분이 있으면 언제든지 물어보세요!

---

## ⚠️ 기존 관리자 패널 연결 문제점 확인

### 발견된 문제점

1. **수당 조정 승인 페이지** (`/admin/affiliate/adjustments`)
   - "구매 완료 승인" 탭에서 사용하는 `/api/admin/affiliate/sales/[saleId]/approve-commission` API 존재 여부 확인 필요
   - 이 API가 없으면 구매 완료 승인 기능이 작동하지 않을 수 있음

2. **승인 대기 목록 API**
   - 기존 API는 `PENDING` 상태만 확인
   - 새로운 프로세스는 `PENDING_APPROVAL` 상태 사용
   - 두 프로세스가 공존할 수 있도록 API 수정 필요

3. **데이터 형식 불일치**
   - 일부 API는 `{ ok: true, error: '...' }` 형식
   - 일부 API는 `{ ok: true, message: '...' }` 형식
   - 프론트엔드에서 일관되지 않게 처리할 수 있음

**상세 내용은 `ADMIN_AFFILIATE_CONNECTION_ISSUES.md` 파일 참조**

---

## 📖 전체 요약 (한눈에 보기)

### 🎯 목표
판매원/대리점장이 고객과의 통화 녹음을 Google Drive에 업로드하고, 관리자가 확인 후 승인하면 자동으로 수당이 계산되는 시스템

### 📋 만들 파일 목록

#### 데이터베이스
- `prisma/schema.prisma` (수정)

#### 함수/유틸리티
- `lib/google-drive.ts` (함수 추가)
- `lib/affiliate/sales-notification.ts` (새로 만들기)

#### API (5개)
- `app/api/affiliate/sales/[saleId]/submit-confirmation/route.ts` (새로 만들기)
- `app/api/affiliate/sales/[saleId]/cancel-confirmation/route.ts` (새로 만들기)
- `app/api/affiliate/sales/my-sales/route.ts` (새로 만들기)
- `app/api/admin/affiliate/sales/[saleId]/approve/route.ts` (새로 만들기)
- `app/api/admin/affiliate/sales/[saleId]/reject/route.ts` (새로 만들기)
- `app/api/admin/affiliate/sales/pending-approval/route.ts` (새로 만들기)

#### UI 컴포넌트
- `components/affiliate/SalesConfirmationModal.tsx` (새로 만들기)
- `app/admin/affiliate/sales/pending-approval/page.tsx` (새로 만들기)
- `app/partner/[partnerId]/dashboard/PartnerDashboard.tsx` (수정)

### 🔄 프로세스 요약

1. **판매 생성** (자동)
   - 각자 몰에서 결제 완료 시 자동 생성

2. **판매 확정 요청** (판매원/대리점장)
   - 대시보드에서 "확정 요청" 클릭
   - 녹음 파일 업로드
   - Google Drive에 저장
   - 상태: `PENDING` → `PENDING_APPROVAL`

3. **관리자 확인** (관리자)
   - 승인 대기 페이지에서 목록 확인
   - Google Drive 링크 클릭하여 녹음 확인
   - 승인 또는 거부

4. **승인 시** (자동)
   - 상태: `PENDING_APPROVAL` → `APPROVED`
   - 수당 자동 계산
   - CommissionLedger 생성
   - 판매원/대리점장에게 알림

5. **거부 시**
   - 상태: `PENDING_APPROVAL` → `REJECTED`
   - 판매원/대리점장에게 알림
   - 수정 후 재요청 가능

### ✅ 체크리스트 (간단 버전)

1. [ ] 데이터베이스 수정
2. [ ] Google Drive 함수 추가
3. [ ] 판매 확정 요청 API
4. [ ] 요청 취소 API
5. [ ] 내 판매 목록 API
6. [ ] 관리자 승인 API
7. [ ] 관리자 거부 API
8. [ ] 승인 대기 목록 API
9. [ ] 알림 함수
10. [ ] 판매 확정 모달 컴포넌트
11. [ ] 관리자 승인 대기 페이지
12. [ ] 대시보드 통합
13. [ ] 테스트

---

## 🚀 시작하기

**1단계부터 차근차근 따라하시면 됩니다!**

각 단계마다:
1. 파일을 만들거나 수정합니다
2. 코드를 복사해서 붙여넣습니다
3. 저장합니다
4. 테스트합니다
5. 다음 단계로 넘어갑니다

**문제가 생기면 언제든지 물어보세요!** 😊

