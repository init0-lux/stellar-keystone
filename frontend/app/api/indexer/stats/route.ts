import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const contractId = searchParams.get('contractId') || process.env.NEXT_PUBLIC_CONTRACT_ID;

    if (!contractId) {
        return NextResponse.json({ error: 'Contract ID required' }, { status: 400 });
    }

    try {
        const db = getDb();

        // 1. Active Roles count
        const activeRoles = db.prepare('SELECT COUNT(*) as count FROM roles WHERE contract_id = ?').get(contractId) as { count: number };

        // 2. Total Role Grants count
        const totalGrants = db.prepare('SELECT COUNT(*) as count FROM role_members WHERE contract_id = ?').get(contractId) as { count: number };

        // 3. Expiring Soon (next 24 hours)
        // Current time + 24 hours in seconds (since Soroban usually uses u64 seconds)
        // Note: check indexer schema for timestamp format. Assuming unix seconds based on typical Stellar contracts.
        // If headers/indexer store ms, adjust accordingly. Standard is seconds.
        const now = Math.floor(Date.now() / 1000);
        const dayFromNow = now + 24 * 60 * 60;

        // We only care about expiring grants that haven't expired yet
        const expiringSoon = db.prepare(`
      SELECT COUNT(*) as count 
      FROM role_members 
      WHERE contract_id = ? 
      AND expiry IS NOT NULL 
      AND expiry > ? 
      AND expiry <= ?
    `).get(contractId, now, dayFromNow) as { count: number };

        return NextResponse.json({
            activeRoles: activeRoles.count,
            totalGrants: totalGrants.count,
            expiringSoon: expiringSoon.count
        });
    } catch (error: any) {
        console.error('Database error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
