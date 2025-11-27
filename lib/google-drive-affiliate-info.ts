// lib/google-drive-affiliate-info.ts
// 판매원/대리점장 정보를 Google Drive에 저장하는 유틸리티

import { uploadFileToDrive, findOrCreateFolder } from './google-drive';

/**
 * 판매원/대리점장 정보 파일을 Google Drive에 업로드
 * @param affiliateId - 판매원/대리점장 ID 또는 이름
 * @param fileBuffer - 파일 버퍼
 * @param fileName - 파일명
 * @param mimeType - MIME 타입
 * @param fileType - 파일 타입 ('idCard' | 'bankbook' | 'contract' | 'signature' | 'audio' | 'other')
 * @returns Google Drive URL 또는 에러
 */
export async function uploadAffiliateInfoFile(
  affiliateId: string | number,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string = 'image/jpeg',
  fileType: 'idCard' | 'bankbook' | 'contract' | 'signature' | 'audio' | 'other' = 'other'
): Promise<{ ok: boolean; url?: string; fileId?: string; error?: string }> {
  try {
    const affiliateInfoFolderId = process.env.GOOGLE_DRIVE_AFFILIATE_INFO_FOLDER_ID;
    
    if (!affiliateInfoFolderId) {
      return {
        ok: false,
        error: 'GOOGLE_DRIVE_AFFILIATE_INFO_FOLDER_ID가 설정되지 않았습니다.',
      };
    }

    // 판매원/대리점장별 폴더 생성
    const affiliateFolderName = `affiliate_${affiliateId}`;
    const affiliateFolderResult = await findOrCreateFolder(affiliateFolderName, affiliateInfoFolderId);
    
    if (!affiliateFolderResult.ok || !affiliateFolderResult.folderId) {
      return {
        ok: false,
        error: affiliateFolderResult.error || '판매원 폴더 생성 실패',
      };
    }

    // 파일 타입별 서브폴더 생성 (선택적)
    let targetFolderId = affiliateFolderResult.folderId;
    const typeFolderMap: Record<string, string> = {
      idCard: '신분증',
      bankbook: '통장',
      contract: '계약서',
      signature: '서명',
      audio: '녹음',
    };

    if (fileType !== 'other' && typeFolderMap[fileType]) {
      const typeFolderResult = await findOrCreateFolder(typeFolderMap[fileType], targetFolderId);
      if (typeFolderResult.ok && typeFolderResult.folderId) {
        targetFolderId = typeFolderResult.folderId;
      }
    }

    // Google Drive에 업로드
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
 * 판매원/대리점장 정보 파일을 타입별 폴더에 업로드 (기존 폴더 ID 사용)
 * @param fileBuffer - 파일 버퍼
 * @param fileName - 파일명
 * @param mimeType - MIME 타입
 * @param fileType - 파일 타입
 * @returns Google Drive URL 또는 에러
 */
export async function uploadAffiliateFileByType(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string = 'image/jpeg',
  fileType: 'idCard' | 'bankbook' | 'contract' | 'signature' | 'audio'
): Promise<{ ok: boolean; url?: string; fileId?: string; error?: string }> {
  try {
    // 파일 타입별 폴더 ID 매핑
    const folderIdMap: Record<string, string | undefined> = {
      idCard: process.env.GOOGLE_DRIVE_ID_CARD_FOLDER_ID,
      bankbook: process.env.GOOGLE_DRIVE_BANKBOOK_FOLDER_ID,
      contract: process.env.GOOGLE_DRIVE_CONTRACTS_FOLDER_ID,
      signature: process.env.GOOGLE_DRIVE_CONTRACT_SIGNATURES_FOLDER_ID,
      audio: process.env.GOOGLE_DRIVE_CONTRACT_AUDIO_FOLDER_ID,
    };

    const folderId = folderIdMap[fileType];
    
    if (!folderId) {
      return {
        ok: false,
        error: `${fileType} 폴더 ID가 설정되지 않았습니다.`,
      };
    }

    // Google Drive에 업로드
    const uploadResult = await uploadFileToDrive({
      folderId: folderId,
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
    console.error('[Affiliate File Upload] Error:', error);
    return {
      ok: false,
      error: error?.message || '파일 업로드 중 오류가 발생했습니다.',
    };
  }
}


