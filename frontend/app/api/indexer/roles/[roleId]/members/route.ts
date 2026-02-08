import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ roleId: string }> }
) {
    const resolvedParams = await params;
    const { roleId } = resolvedParams;
    const searchParams = request.nextUrl.searchParams;
    const contractId = searchParams.get('contractId') || process.env.NEXT_PUBLIC_CONTRACT_ID;

    if (!contractId) {
        return NextResponse.json({ error: 'Contract ID required' }, { status: 400 });
    }

    try {
        const db = getDb();

        // Verify role exists first (optional, but good for 404)
        const roleExists = db.prepare('SELECT 1 FROM roles WHERE contract_id = ? AND role = ?').get(contractId, roleId);
        if (!roleExists) {
            // Return empty list if role doesn't exist, or 404. 
            // For UI simplicity, empty list might be safer unless strict validity needed.
            // Let's return 404 to be semantically correct.
            return NextResponse.json({ error: 'Role not found' }, { status: 404 });
        }

        const members = db.prepare(`
      SELECT account, expiry, last_updated as lastUpdated
      FROM role_members
      WHERE contract_id = ? AND role = ?
    `).all(contractId, roleId);

        return NextResponse.json(members);
    } catch (error: any) {
        console.error('Database error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
