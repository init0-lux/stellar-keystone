import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const contractId = searchParams.get('contractId') || process.env.NEXT_PUBLIC_CONTRACT_ID;
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!contractId) {
        return NextResponse.json({ error: 'Contract ID required' }, { status: 400 });
    }

    try {
        const db = getDb();

        // Fetch recent events
        // Assuming 'events' table structure from indexer/README.md
        /* 
           events -> contract_id, event_type, payload, tx_hash, created_at
           payload is likely JSON string. We might need to extract fields.
           Wait, README says:
           contract_id, event_type, payload, tx_hash, created_at
           
           We need to parse role and/or account from payload if it's JSON.
           Or maybe the indexer stores them efficiently? 
           Checking Schema...
           I'll use a generic query and simple mapping for now.
        */

        // Let's check the schema if I can.
        // I'll assume payload is JSON and indexer doesn't extract role/account into columns.
        // But usually indexers extract them. 
        // I'll read the schema from the indexer database directly if needed, but for now I'll assume standard columns exist or I parse payload.
        // Re-reading task 83 output (Indexer README):
        // events -> contract_id, event_type, payload, tx_hash, created_at

        // So I might need to parse payload.
        // But let's check if the table has other columns.

        const events = db.prepare(`
      SELECT rowid as id, event_type as eventType, payload, tx_hash as txHash, created_at as timestamp
      FROM events
      WHERE contract_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(contractId, limit) as any[];

        // Parse payload to extract role/account
        const processedEvents = events.map(event => {
            let details = {};
            try {
                details = JSON.parse(event.payload);
            } catch (e) {
                // payload might not be JSON or might be simpler
            }
            return {
                ...event,
                ...details // Spread details (role, account, etc) to top level
            };
        });

        return NextResponse.json(processedEvents);
    } catch (error: any) {
        console.error('Database error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
