import { google } from 'googleapis';
import { Readable } from 'stream';

type UploadParams = {
  folderId?: string | null;
  fileName: string;
  mimeType?: string;
  buffer: Buffer;
  makePublic?: boolean;
};

type UploadResult = {
  ok: boolean;
  fileId?: string;
  url?: string;
  error?: string;
};

function getDriveClient() {
  const clientEmail =
    process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL ||
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey =
    process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    throw new Error('Google Drive 서비스 계정 정보가 설정되어 있지 않습니다.');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  return google.drive({ version: 'v3', auth });
}

type FindOrCreateFolderResult = {
  ok: boolean;
  folderId?: string;
  error?: string;
};

export async function findOrCreateFolder(
  folderName: string,
  parentFolderId?: string | null
): Promise<FindOrCreateFolderResult> {
  try {
    const drive = await getDriveClient();
    const sharedDriveId = process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID;

    // 먼저 기존 폴더 검색
    let query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    
    if (parentFolderId && parentFolderId !== 'root') {
      query += ` and '${parentFolderId}' in parents`;
    } else if (sharedDriveId && sharedDriveId !== 'root') {
      query += ` and '${sharedDriveId}' in parents`;
    }

    const searchOptions: any = {
      q: query,
      fields: 'files(id, name)',
      pageSize: 1,
    };

    if (sharedDriveId && sharedDriveId !== 'root') {
      searchOptions.supportsAllDrives = true;
      searchOptions.includeItemsFromAllDrives = true;
      searchOptions.corpora = 'allDrives';
    }

    const searchResponse = await drive.files.list(searchOptions);

    // 기존 폴더가 있으면 반환
    if (searchResponse.data.files && searchResponse.data.files.length > 0) {
      const folderId = searchResponse.data.files[0].id;
      if (folderId) {
        return { ok: true, folderId };
      }
    }

    // 폴더가 없으면 생성
    const createBody: Record<string, any> = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };

    if (parentFolderId && parentFolderId !== 'root') {
      createBody.parents = [parentFolderId];
    } else if (sharedDriveId && sharedDriveId !== 'root') {
      createBody.parents = [sharedDriveId];
    }

    const createOptions: any = {
      requestBody: createBody,
      fields: 'id, name',
    };

    if (sharedDriveId && sharedDriveId !== 'root') {
      createOptions.supportsAllDrives = true;
    }

    const createResponse = await drive.files.create(createOptions);
    const folderId = createResponse.data.id;

    if (!folderId) {
      throw new Error('폴더 생성에 실패했습니다 (folderId 없음).');
    }

    return { ok: true, folderId };
  } catch (error: any) {
    console.error('[GoogleDrive] findOrCreateFolder error:', error);
    return { ok: false, error: error?.message || '폴더 찾기/생성 실패' };
  }
}

export async function uploadFileToDrive(params: UploadParams): Promise<UploadResult> {
  const { folderId, fileName, mimeType = 'application/octet-stream', buffer, makePublic = false } = params;

  try {
    const drive = await getDriveClient();

    const requestBody: Record<string, any> = {
      name: fileName,
      mimeType,
    };
    
    // Shared Drive 사용 (서비스 계정 스토리지 할당량 문제 해결)
    const sharedDriveId = process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID;
    if (sharedDriveId && sharedDriveId !== 'root') {
      requestBody.parents = [sharedDriveId];
      // Shared Drive에 업로드하려면 supportsAllDrives: true 필요
      requestBody.supportsAllDrives = true;
    } else if (folderId && folderId !== 'root') {
      requestBody.parents = [folderId];
    }

    // Buffer를 Readable Stream으로 변환 (googleapis가 pipe 메서드를 기대함)
    const bufferStream = new Readable();
    bufferStream.push(buffer);
    bufferStream.push(null); // 스트림 종료

    const createOptions: any = {
      requestBody,
      media: {
        mimeType,
        body: bufferStream,
      },
      fields: 'id, webViewLink, webContentLink',
    };
    
    // Shared Drive 사용 시 supportsAllDrives 옵션 추가
    if (sharedDriveId && sharedDriveId !== 'root') {
      createOptions.supportsAllDrives = true;
    }
    
    const response = await drive.files.create(createOptions);

    const fileId = response.data.id;
    if (!fileId) {
      throw new Error('Google Drive 업로드에 실패했습니다 (fileId 없음).');
    }

    if (makePublic) {
      const permissionOptions: any = {
        fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      };
      
      // Shared Drive 사용 시 supportsAllDrives 옵션 추가
      if (sharedDriveId && sharedDriveId !== 'root') {
        permissionOptions.supportsAllDrives = true;
      }
      
      await drive.permissions.create(permissionOptions);
    }

    const url =
      response.data.webViewLink ||
      response.data.webContentLink ||
      `https://drive.google.com/file/d/${fileId}/view`;

    return { ok: true, fileId, url };
  } catch (error: any) {
    console.error('[GoogleDrive] uploadFileToDrive error:', error);
    return { ok: false, error: error?.message || 'Google Drive 업로드 실패' };
  }
}

export {};
