// lib/google-drive-affiliate-info.ts
// 판매원/대리점장 정보를 Google Drive에 저장하는 유틸리티

import { uploadFileToDrive, findOrCreateFolder } from './google-drive';
import { getDriveFolderId } from '@/lib/config/drive-config';
import prisma from '@/lib/prisma';

/**
 * 판매원/대리점장 정보 파일을 Google Drive에 업로드 (계층적 구조)
 * 구조: Affiliate_Documents -> [Code]_[Name] -> [Type]
 */
export async function uploadAffiliateInfoFile(
  affiliateId: string | number,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string = 'image/jpeg',
  fileType: 'idCard' | 'bankbook' | 'contract' | 'signature' | 'audio' | 'other' = 'other'
): Promise<{ ok: boolean; url?: string; fileId?: string; error?: string }> {
  try {
    // 1. 루트 폴더 ID 가져오기 (AFFILIATE_DOCUMENTS)
    const affiliateDocsFolderId = await getDriveFolderId('AFFILIATE_DOCUMENTS');

    if (!affiliateDocsFolderId) {
      return {
        ok: false,
        error: 'GOOGLE_DRIVE_AFFILIATE_DOCUMENTS_FOLDER_ID가 설정되지 않았습니다.',
      };
    }

    // 2. 판매원 정보 조회 (폴더명 생성을 위해)
    let folderName = `affiliate_${affiliateId}`; // 기본값

    // affiliateId가 숫자면 DB 조회 시도
    const idNum = Number(affiliateId);
    if (!isNaN(idNum)) {
      try {
        // 1순위: AffiliateProfile 조회 (affiliateCode 사용)
        let profile = await prisma.affiliateProfile.findUnique({
          where: { id: idNum },
          select: {
            affiliateCode: true,
            User: { select: { name: true } }
          }
        });

        // ID로 못 찾았으면 User ID로 조회 시도
        if (!profile) {
          profile = await prisma.affiliateProfile.findFirst({
            where: { userId: idNum },
            select: {
              affiliateCode: true,
              User: { select: { name: true } }
            }
          });
        }

        if (profile) {
          const code = profile.affiliateCode || `AFF-${idNum}`;
          const name = profile.User?.name || 'Unknown';
          folderName = `${code}_${name}`; // [Code]_[Name] 형식
        } else {
          // 2순위: AffiliateContract 조회 (이름만 사용)
          const contract = await prisma.affiliateContract.findUnique({
            where: { id: idNum },
            select: {
              name: true,
              User_AffiliateContract_userIdToUser: { select: { name: true } }
            }
          });

          if (contract) {
            const name = contract.name || contract.User_AffiliateContract_userIdToUser?.name || 'Unknown';
            folderName = `Contract_${idNum}_${name}`;
          }
        }
      } catch (e) {
        console.warn('[Affiliate Info Upload] Failed to fetch affiliate info for folder name:', e);
      }
    }

    // 3. 판매원 폴더 생성/찾기
    const affiliateFolderResult = await findOrCreateFolder(folderName, affiliateDocsFolderId);

    if (!affiliateFolderResult.ok || !affiliateFolderResult.folderId) {
      return {
        ok: false,
        error: affiliateFolderResult.error || '판매원 폴더 생성 실패',
      };
    }

    // 4. 파일 타입별 서브폴더 생성 (영어 이름 사용)
    let targetFolderId = affiliateFolderResult.folderId;
    const typeFolderMap: Record<string, string> = {
      idCard: 'ID_Cards',
      bankbook: 'BankBooks',
      contract: 'Contracts',
      signature: 'Signatures',
      audio: 'Audio',
      other: 'Etc'
    };

    const subFolderName = typeFolderMap[fileType] || 'Etc';

    const typeFolderResult = await findOrCreateFolder(subFolderName, targetFolderId);
    if (typeFolderResult.ok && typeFolderResult.folderId) {
      targetFolderId = typeFolderResult.folderId;
    }

    // 5. Google Drive에 업로드
    const uploadResult = await uploadFileToDrive({
      folderId: targetFolderId,
      fileName: fileName,
      mimeType: mimeType,
      buffer: fileBuffer,
      makePublic: false, // 판매원 정보는 비공개
    });

    if (uploadResult.ok && uploadResult.url) {
      return {
        ok: true,
        url: uploadResult.url,
        fileId: uploadResult.fileId,
      };
    } else {
      return {
        ok: false,
        error: uploadResult.error || '파일 업로드 실패',
      };
    }
  } catch (error: any) {
    console.error('[Affiliate Info Upload] Error:', error);
    return {
      ok: false,
      error: error?.message || '파일 업로드 중 오류가 발생했습니다.',
    };
  }
}

/**
 * Deprecated: Use uploadAffiliateInfoFile instead
 */
export async function uploadAffiliateFileByType(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string = 'image/jpeg',
  fileType: 'idCard' | 'bankbook' | 'contract' | 'signature' | 'audio'
): Promise<{ ok: boolean; url?: string; fileId?: string; error?: string }> {
  // Redirect to new function with a generic ID if specific ID not provided
  // This function signature doesn't have ID, so we can't organize by folder properly.
  // But existing calls might need migration.
  // For now, let's try to use a "Unsorted" folder or just fail gracefully?
  // Better: Update callers to provide ID.
  console.warn('[Deprecated] uploadAffiliateFileByType called. Please use uploadAffiliateInfoFile.');
  return uploadAffiliateInfoFile('Unsorted', fileBuffer, fileName, mimeType, fileType);
}


