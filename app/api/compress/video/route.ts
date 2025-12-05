
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink, stat } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import ffmpeg from 'fluent-ffmpeg';
import { createReadStream } from 'fs';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes timeout

export async function POST(req: NextRequest) {
    const tempFiles: string[] = [];

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const level = (formData.get('level') as string) || 'medium';

        if (!file) {
            return NextResponse.json({ ok: false, message: 'No file uploaded' }, { status: 400 });
        }

        // 1. Save uploaded file to temp
        const buffer = Buffer.from(await file.arrayBuffer());
        const inputPath = join(tmpdir(), `input_${randomUUID()}_${file.name}`);
        await writeFile(inputPath, buffer);
        tempFiles.push(inputPath);

        // 2. Configure Output Path
        const outputPath = join(tmpdir(), `output_${randomUUID()}.mp4`);
        tempFiles.push(outputPath);

        // 3. Determine FFmpeg settings based on level
        // Low: Weak compression (High Quality) -> CRF 23, preset medium
        // Medium: Balanced -> CRF 28, preset fast
        // High: Strong compression (Small Size) -> CRF 35, preset veryfast
        let crf = 28;
        let preset = 'fast';

        if (level === 'low') {
            crf = 23;
            preset = 'medium';
        } else if (level === 'high') {
            crf = 35;
            preset = 'veryfast';
        }

        // 4. Run FFmpeg
        await new Promise<void>((resolve, reject) => {
            ffmpeg(inputPath)
                .output(outputPath)
                .videoCodec('libx264')
                .audioCodec('aac')
                .outputOptions([
                    `-crf ${crf}`,
                    `-preset ${preset}`,
                    '-movflags +faststart'
                ])
                .on('end', () => resolve())
                .on('error', (err) => reject(err))
                .run();
        });

        // 5. Stream back the result
        const stats = await stat(outputPath);
        const stream = createReadStream(outputPath);

        // Clean up input file immediately, output file after streaming (or rely on OS temp cleanup, but better to try)
        // Since we return a stream, we can't await unlink(outputPath) here easily without closing stream.
        // We will unlink inputPath now. Output path will be left in tmp.
        // Ideally we should use a stream transform but ffmpeg writing to file is more stable.
        await unlink(inputPath);

        return new NextResponse(stream as any, {
            headers: {
                'Content-Type': 'video/mp4',
                'Content-Length': stats.size.toString(),
                'Content-Disposition': `attachment; filename="compressed_${file.name}"`,
            },
        });

    } catch (error: any) {
        console.error('Video compression error:', error);
        // Cleanup on error
        for (const path of tempFiles) {
            try { await unlink(path); } catch (e) { }
        }
        return NextResponse.json({ ok: false, message: 'Compression failed: ' + error.message }, { status: 500 });
    }
}
