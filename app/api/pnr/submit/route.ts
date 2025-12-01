import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { enqueueApisSync } from '@/lib/apis-sync-queue';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { tripId, travelers } = body;

        // travelers: Array of { travelerId: number, roomNumber: number }

        if (!tripId || !travelers || !Array.isArray(travelers)) {
            return NextResponse.json({ ok: false, message: 'Invalid request data' }, { status: 400 });
        }

        // Update each traveler's room number
        for (const item of travelers) {
            if (item.travelerId && item.roomNumber !== undefined) {
                await prisma.traveler.update({
                    where: { id: item.travelerId },
                    data: { roomNumber: item.roomNumber },
                });
            }
        }

        // Enqueue APIS sync for this trip
        await enqueueApisSync('TRIP_SHEET', tripId);

        return NextResponse.json({ ok: true, message: 'PNR/Rooming list updated successfully' });
    } catch (error: any) {
        console.error('[PNR Submit] Error:', error);
        return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }
}
