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

        // Fetch roles
        const roles = db.prepare(`
      SELECT role as id, role as name, admin_role as adminRole, created_at as createdAt
      FROM roles 
      WHERE contract_id = ?
    `).all(contractId) as any[];

        // Fetch member counts for each role
        // Optimization: Single query to group by role
        const memberCounts = db.prepare(`
      SELECT role, COUNT(*) as count 
      FROM role_members 
      WHERE contract_id = ?
      GROUP BY role
    `).all(contractId) as { role: string, count: number }[];

        const countMap = new Map(memberCounts.map(m => [m.role, m.count]));

        const rolesWithCounts = roles.map(role => ({
            ...role,
            memberCount: countMap.get(role.id) || 0
        }));

        return NextResponse.json(rolesWithCounts);
    } catch (error: any) {
        console.error('Database error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
