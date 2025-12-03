
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const rawKey = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY ||
        process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '';

    const keyAnalysis = {
        exists: !!rawKey,
        length: rawKey.length,
        hasRealNewlines: rawKey.includes('\n'),
        hasEscapedNewlines: rawKey.includes('\\n'),
        startsWithQuote: rawKey.startsWith('"') || rawKey.startsWith("'"),
        hasBeginMarker: rawKey.includes('-----BEGIN PRIVATE KEY-----'),
        hasEndMarker: rawKey.includes('-----END PRIVATE KEY-----'),
        // Try parsing logic used in lib/google-drive.ts
        parseTest: (() => {
            try {
                let key = rawKey.trim();
                if (key.startsWith('"') || key.startsWith("'")) {
                    try { key = JSON.parse(key); } catch { key = key.replace(/^["']+|["']+$/g, ''); }
                }
                key = key.replace(/\\n/g, '\n');
                return {
                    success: true,
                    finalLength: key.length,
                    validFormat: key.includes('-----BEGIN PRIVATE KEY-----') && key.includes('-----END PRIVATE KEY-----')
                };
            } catch (e: any) {
                return { success: false, error: e.message };
            }
        })()
    };

    return NextResponse.json({
        ok: true,
        env: {
            GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL || 'NOT_SET',
            KEY_ANALYSIS: keyAnalysis
        },
        timestamp: new Date().toISOString(),
    });
}
