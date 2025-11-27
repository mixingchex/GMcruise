#!/usr/bin/env ts-node
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.local 파일 명시적으로 로드
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
// .env 파일도 로드 (fallback)
dotenv.config();

import { promises as fs } from 'fs';
import path from 'path';
import { lookup as lookupMime } from 'mime-types';

import { uploadFileToDrive } from '../lib/google-drive';

type TargetConfig = {
  label: string;
  envKey: string;
  localDir: string;
  makePublic?: boolean;
};

type UploadResultEntry = {
  target: string;
  localPath: string;
  driveFileId?: string;
  driveUrl?: string;
  status: 'uploaded' | 'skipped' | 'error';
  reason?: string;
};

const ROOT_DIR = process.cwd();

const TARGETS: TargetConfig[] = [
  { label: 'images', envKey: 'GOOGLE_DRIVE_UPLOADS_IMAGES_FOLDER_ID', localDir: 'public/uploads/images', makePublic: true },
  { label: 'profiles', envKey: 'GOOGLE_DRIVE_UPLOADS_PROFILES_FOLDER_ID', localDir: 'public/uploads/profiles', makePublic: true },
  { label: 'reviews', envKey: 'GOOGLE_DRIVE_UPLOADS_REVIEWS_FOLDER_ID', localDir: 'public/uploads/reviews', makePublic: true },
  { label: 'audio', envKey: 'GOOGLE_DRIVE_UPLOADS_AUDIO_FOLDER_ID', localDir: 'public/uploads/audio' },
  { label: 'documents', envKey: 'GOOGLE_DRIVE_UPLOADS_DOCUMENTS_FOLDER_ID', localDir: 'public/uploads/documents' },
  { label: 'videos', envKey: 'GOOGLE_DRIVE_UPLOADS_VIDEOS_FOLDER_ID', localDir: 'public/uploads/videos' },
  { label: 'sales-audio', envKey: 'GOOGLE_DRIVE_UPLOADS_SALES_AUDIO_FOLDER_ID', localDir: 'public/uploads/sales-audio' },
  { label: 'fonts', envKey: 'GOOGLE_DRIVE_UPLOADS_FONTS_FOLDER_ID', localDir: 'public/uploads/fonts' },
  { label: 'contracts-pdfs', envKey: 'GOOGLE_DRIVE_CONTRACTS_PDFS_FOLDER_ID', localDir: 'public/contracts/pdfs' },
  { label: 'pages', envKey: 'GOOGLE_DRIVE_UPLOADS_IMAGES_FOLDER_ID', localDir: 'public/uploads/pages', makePublic: true },
  { label: 'cruise-images', envKey: 'GOOGLE_DRIVE_CRUISE_IMAGES_FOLDER_ID', localDir: 'public/크루즈정보사진', makePublic: true },
];

async function pathExists(targetPath: string) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function collectFiles(dir: string, baseDir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectFiles(fullPath, baseDir);
      files.push(...nested);
    } else if (entry.isFile()) {
      files.push(path.relative(baseDir, fullPath));
    }
  }

  return files;
}

function sanitizeDriveName(relativePath: string) {
  return relativePath.replace(/\s+/g, ' ').replace(/[\\/]+/g, '__');
}

function resolveMimeType(fileName: string) {
  return lookupMime(fileName) || 'application/octet-stream';
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const deleteLocal = args.includes('--delete-local');
  const onlyArg = args.find((arg) => arg.startsWith('--only='));
  const onlyTargets = onlyArg ? new Set(onlyArg.replace('--only=', '').split(',').map((v) => v.trim()).filter(Boolean)) : null;

  const summary: UploadResultEntry[] = [];

  for (const target of TARGETS) {
    if (onlyTargets && !onlyTargets.has(target.label)) {
      continue;
    }

    const folderId = process.env[target.envKey];
    if (!folderId) {
      console.warn(`[migrate] ${target.label}: ${target.envKey}가 설정되지 않아 건너뜁니다.`);
      summary.push({
        target: target.label,
        localPath: target.localDir,
        status: 'skipped',
        reason: `${target.envKey} missing`,
      });
      continue;
    }

    const absoluteDir = path.join(ROOT_DIR, target.localDir);
    if (!(await pathExists(absoluteDir))) {
      console.info(`[migrate] ${target.label}: ${target.localDir} 폴더가 없어 건너뜁니다.`);
      summary.push({
        target: target.label,
        localPath: target.localDir,
        status: 'skipped',
        reason: 'local directory missing',
      });
      continue;
    }

    const files = await collectFiles(absoluteDir, absoluteDir);
    if (files.length === 0) {
      console.info(`[migrate] ${target.label}: 업로드할 파일이 없습니다.`);
      continue;
    }

    console.info(`[migrate] ${target.label}: ${files.length}개 파일 처리 시작 (dryRun=${dryRun})`);

    for (const relativePath of files) {
      const filePath = path.join(absoluteDir, relativePath);
      const fileName = sanitizeDriveName(relativePath);
      const mimeType = resolveMimeType(fileName);

      if (dryRun) {
        summary.push({
          target: target.label,
          localPath: path.join(target.localDir, relativePath),
          status: 'skipped',
          reason: 'dry-run',
        });
        continue;
      }

      try {
        const buffer = await fs.readFile(filePath);
        const uploadResult = await uploadFileToDrive({
          folderId,
          fileName,
          mimeType,
          buffer,
          makePublic: target.makePublic ?? true,
        });

        if (!uploadResult.ok || !uploadResult.fileId) {
          summary.push({
            target: target.label,
            localPath: path.join(target.localDir, relativePath),
            status: 'error',
            reason: uploadResult.error || 'Unknown upload failure',
          });
          console.error(`[migrate] ${target.label}: 업로드 실패 (${relativePath}) - ${uploadResult.error}`);
          continue;
        }

        summary.push({
          target: target.label,
          localPath: path.join(target.localDir, relativePath),
          driveFileId: uploadResult.fileId,
          driveUrl: uploadResult.url,
          status: 'uploaded',
        });

        if (deleteLocal) {
          await fs.unlink(filePath);
        }
      } catch (error: any) {
        summary.push({
          target: target.label,
          localPath: path.join(target.localDir, relativePath),
          status: 'error',
          reason: error?.message || 'Unexpected error',
        });
        console.error(`[migrate] ${target.label}: 처리 중 오류 (${relativePath})`, error);
      }
    }
  }

  if (summary.length === 0) {
    console.info('[migrate] 처리된 항목이 없습니다.');
    return;
  }

  const reportsDir = path.join(ROOT_DIR, 'migrations');
  if (!(await pathExists(reportsDir))) {
    await fs.mkdir(reportsDir, { recursive: true });
  }
  const reportPath = path.join(reportsDir, `uploads-to-drive-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  await fs.writeFile(reportPath, JSON.stringify(summary, null, 2), 'utf8');
  console.info(`[migrate] 보고서 저장: ${reportPath}`);
}

main().catch((error) => {
  console.error('[migrate] 스크립트 실행 중 치명적 오류:', error);
  process.exit(1);
});

