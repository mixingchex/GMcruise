import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import prisma from '@/lib/prisma';
import { uploadFileToDrive } from '@/lib/google-drive';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 녹음 파일 저장 폴더 ID (대리점장과 동일)
const VOICE_RECORDING_FOLDER_ID = '10Mdpzht3qZ0xb5gEErNmbFZlU594h2Kq';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ contractId: string }> }
) {
    try {
        const { contractId } = await params;
        const admin = await requireAdmin();

        if (!admin) {
            return NextResponse.json(
                { ok: false, message: '관리자 권한이 필요합니다.' },
                { status: 403 }
            );
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { ok: false, message: '파일이 제공되지 않았습니다.' },
                { status: 400 }
            );
        }

        // 계약서 조회
        const contract = await prisma.affiliateContract.findUnique({
            where: { id: parseInt(contractId) },
            include: {
                AffiliateProfile: {
                    select: { displayName: true }
                }
            }
        });

        if (!contract) {
            return NextResponse.json(
                { ok: false, message: '계약서를 찾을 수 없습니다.' },
                { status: 404 }
            );
        }

        // 파일 버퍼 변환
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Google Drive 업로드
        const profileName = contract.AffiliateProfile?.displayName || contract.name;
        const uploadResult = await uploadFileToDrive({
            folderId: VOICE_RECORDING_FOLDER_ID,
            fileName: `admin_${profileName}_${contractId}_${file.name}`,
            mimeType: file.type,
            buffer: buffer,
        });

        if (!uploadResult.ok || !uploadResult.url) {
            throw new Error(uploadResult.error || 'Google Drive 업로드 실패');
        }

        // 계약서 메타데이터 업데이트
        const metadata = (contract.metadata as any) || {};
        const voiceRecordings = metadata.voiceRecordings || [];

        const newRecording = {
            id: uploadResult.fileId,
            url: uploadResult.url,
            name: file.name,
            uploadedAt: new Date().toISOString(),
            uploadedBy: `관리자 (${admin.name || 'Admin'})`,
        };

        await prisma.affiliateContract.update({
            where: { id: parseInt(contractId) },
            data: {
                metadata: {
                    ...metadata,
                    voiceRecordings: [...voiceRecordings, newRecording],
                },
            },
        });

        return NextResponse.json({
            ok: true,
            message: '녹음 파일이 성공적으로 업로드되었습니다.',
            recording: newRecording,
        });

    } catch (error: any) {
        console.error('[Admin Voice Upload] Error:', error);
        return NextResponse.json(
            { ok: false, message: error.message || '업로드 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
