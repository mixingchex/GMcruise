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

type FindOrCreateFolderResult = {
  ok: boolean;
  folderId?: string;
  error?: string;
};

export function getDriveClient() {
  // 1. 환경변수에서 Private Key 찾기 (여러 이름 모두 확인)
  const rawPrivateKey = 
    process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    process.env.GOOGLE_PRIVATE_KEY ||
    process.env.PRIVATE_KEY;

  if (!rawPrivateKey) {
    console.error('[GoogleDrive] Private Key가 환경변수에 없습니다.');
    console.error('[GoogleDrive] 확인할 환경변수:');
    console.error('  - GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY');
    console.error('  - GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');
    console.error('  - GOOGLE_PRIVATE_KEY');
    console.error('  - PRIVATE_KEY');
    throw new Error('Google Drive Private Key 설정 오류');
  }

  // 2. 환경변수에서 Client Email 찾기 (여러 이름 모두 확인)
  const clientEmail = 
    process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL ||
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    process.env.GOOGLE_CLIENT_EMAIL ||
    process.env.CLIENT_EMAIL;

  if (!clientEmail) {
    console.error('[GoogleDrive] Client Email이 환경변수에 없습니다.');
    console.error('[GoogleDrive] 확인할 환경변수:');
    console.error('  - GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL');
    console.error('  - GOOGLE_SERVICE_ACCOUNT_EMAIL');
    console.error('  - GOOGLE_CLIENT_EMAIL');
    console.error('  - CLIENT_EMAIL');
    throw new Error('Google Drive Client Email 설정 오류');
  }

  // 3. 줄바꿈 문자 처리 (가장 중요!)
  // 여러 형태의 줄바꿈 문자를 실제 개행으로 변환
  let privateKey = rawPrivateKey
    // 앞뒤 따옴표 제거 (환경변수에 따옴표가 포함된 경우)
    .replace(/^["']|["']$/g, '')
    // 앞뒤 공백 제거
    .trim();

  // 이스케이프된 줄바꿈 문자 처리 (여러 패턴 시도)
  // 1. 이미 실제 개행 문자가 있는 경우 (환경변수에 직접 포함된 경우)
  if (privateKey.includes('\n')) {
    // 이미 개행 문자가 있으면 그대로 사용
    console.log('[GoogleDrive] Private key에 실제 개행 문자가 포함되어 있습니다.');
  } else {
    // 2. 이스케이프된 형태 처리
    // \\n (이중 이스케이프) -> \n
    privateKey = privateKey.replace(/\\\\n/g, '\n');
    // \\r\\n (이중 이스케이프) -> \n
    privateKey = privateKey.replace(/\\\\r\\\\n/g, '\n');
    // \\r (이중 이스케이프) -> \n
    privateKey = privateKey.replace(/\\\\r/g, '\n');
    // \n (단일 이스케이프) -> \n
    privateKey = privateKey.replace(/\\n/g, '\n');
    // \r\n (단일 이스케이프) -> \n
    privateKey = privateKey.replace(/\\r\\n/g, '\n');
    // \r (단일 이스케이프) -> \n
    privateKey = privateKey.replace(/\\r/g, '\n');
  }

  // 4. BEGIN/END 라인 확인
  if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    console.error('[GoogleDrive] Private key 형식 오류: BEGIN PRIVATE KEY 라인이 없습니다.');
    console.error('[GoogleDrive] Private key 시작 부분:', privateKey.substring(0, 100));
    throw new Error('Private key 형식이 올바르지 않습니다. -----BEGIN PRIVATE KEY-----로 시작해야 합니다.');
  }
  
  if (!privateKey.includes('-----END PRIVATE KEY-----')) {
    console.error('[GoogleDrive] Private key 형식 오류: END PRIVATE KEY 라인이 없습니다.');
    throw new Error('Private key 형식이 올바르지 않습니다. -----END PRIVATE KEY-----로 끝나야 합니다.');
  }

  // 5. Private key 검증 (디버깅용)
  const lineCount = privateKey.split('\n').length;
  console.log('[GoogleDrive] Private key 검증:', {
    length: privateKey.length,
    lineCount,
    hasBegin: privateKey.includes('-----BEGIN PRIVATE KEY-----'),
    hasEnd: privateKey.includes('-----END PRIVATE KEY-----'),
  });

  // 6. Google Auth 생성 (에러 핸들링 강화)
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    return google.drive({ version: 'v3', auth });
  } catch (authError: any) {
    console.error('[GoogleDrive] GoogleAuth 생성 실패:', authError);
    console.error('[GoogleDrive] Client Email:', clientEmail);
    console.error('[GoogleDrive] Private Key 길이:', privateKey.length);
    console.error('[GoogleDrive] Private Key 시작:', privateKey.substring(0, 50));
    console.error('[GoogleDrive] Private Key 끝:', privateKey.substring(privateKey.length - 50));
    
    // JWT 관련 에러인 경우 더 자세한 정보 제공
    if (authError?.message?.includes('JWT') || authError?.message?.includes('invalid_grant') || authError?.message?.includes('Invalid JWT')) {
      throw new Error(
        `Google Drive 인증 실패 (JWT Signature 오류): ${authError?.message}. ` +
        `환경변수 GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY 또는 GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY의 줄바꿈 문자(\\n) 처리를 확인해주세요. ` +
        `Private key는 -----BEGIN PRIVATE KEY-----와 -----END PRIVATE KEY----- 사이에 있어야 하며, 각 라인은 64자로 구성되어야 합니다.`
      );
    }
    
    throw authError;
  }
}

export async function findOrCreateFolder(
  folderName: string,
  parentFolderId?: string | null
): Promise<FindOrCreateFolderResult> {
  try {
    const drive = getDriveClient();
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
    const drive = getDriveClient();

    const requestBody: Record<string, any> = {
      name: fileName,
      mimeType,
    };
    
    // Shared Drive 사용 (서비스 계정 스토리지 할당량 문제 해결)
    const sharedDriveId = process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID;
    if (sharedDriveId && sharedDriveId !== 'root') {
      requestBody.parents = [sharedDriveId];
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

    // 권한 설정 (공개/비공개)
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
    } else {
      // 기본적으로 'anyone with link'로 설정하여 관리자가 볼 수 있게 함
      const permissionOptions: any = {
        fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      };
      
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
    console.error('[GoogleDrive] Error details:', {
      message: error?.message,
      code: error?.code,
      response: error?.response?.data,
    });
    
    // JWT 관련 에러인 경우 더 자세한 메시지 제공
    if (error?.message?.includes('JWT') || error?.message?.includes('invalid_grant') || error?.message?.includes('Invalid JWT')) {
      return { 
        ok: false, 
        error: `Google Drive 인증 실패 (JWT Signature 오류): ${error?.message}. 환경변수 GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY 또는 GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY의 줄바꿈 문자(\\n) 처리를 확인해주세요.` 
      };
    }
    
    return { ok: false, error: error?.message || 'Google Drive 업로드 실패' };
  }
}

// getDriveClient는 내부 함수이므로 export하지 않음
// 테스트는 findOrCreateFolder나 uploadFileToDrive를 통해 간접적으로 테스트
