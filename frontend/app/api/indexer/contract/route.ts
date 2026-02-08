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

        const contract = db.prepare(`
      SELECT id, deployed_at as deployedAt
      FROM contracts 
      WHERE id = ?
    `).get(contractId) as any;

        if (!contract) {
            return NextResponse.json({ error: 'Contract not indexed' }, { status: 404 });
        }

        return NextResponse.json({
            ...contract,
            network: process.env.NEXT_PUBLIC_NETWORK || 'testnet',
            status: 'active'
        });
    } catch (error: any) {
        console.error('Database error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
