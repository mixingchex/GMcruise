
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const envVars = {
        GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL: !!process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL,
        GOOGLE_SERVICE_ACCOUNT_EMAIL: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        GOOGLE_CLIENT_EMAIL: !!process.env.GOOGLE_CLIENT_EMAIL,
        CLIENT_EMAIL: !!process.env.CLIENT_EMAIL,

        GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY: !!process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY,
        GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
        GOOGLE_PRIVATE_KEY: !!process.env.GOOGLE_PRIVATE_KEY,
        PRIVATE_KEY: !!process.env.PRIVATE_KEY,

        // Check key format (length only)
        KEY_LENGTH: process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY?.length ||
            process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.length || 0,

        // Check if key contains newlines
        KEY_HAS_NEWLINES: (process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY || '').includes('\n') ||
            (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').includes('\n'),

        // Check if key contains escaped newlines
        KEY_HAS_ESCAPED_NEWLINES: (process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY || '').includes('\\n') ||
            (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').includes('\\n'),
    };

    return NextResponse.json({
        ok: true,
        env: envVars,
        timestamp: new Date().toISOString(),
    });
}
