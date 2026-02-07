import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ roleId: string }> }
) {
    const { roleId } = await params;

    try {
        // Database path relative to where 'next dev' is run (frontend directory)
        // Adjust if needed based on deployment
        const dbPath = path.resolve(process.cwd(), '../indexer.db');

        if (!fs.existsSync(dbPath)) {
            console.error(`Database not found at ${dbPath}`);
            return NextResponse.json(
                { error: 'Database not found' },
                { status: 500 }
            );
        }

        const db = new Database(dbPath, { readonly: true });

        const stmt = db.prepare('SELECT * FROM role_metadata WHERE role = ?');
        const metadata = stmt.get(roleId) as { role: string, description: string, permissions: string, updated_at: number } | undefined;

        db.close();

        if (!metadata) {
            return NextResponse.json(
                { error: 'Role metadata not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            role: metadata.role,
            description: metadata.description,
            permissions: JSON.parse(metadata.permissions),
            updatedAt: metadata.updated_at
        });

    } catch (error) {
        console.error('Error fetching role metadata:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
