import Database from 'better-sqlite3';
import path from 'path';

let dbInstance: Database.Database | null = null;

export function getDb() {
    if (dbInstance) return dbInstance;

    // Resolve path relative to project root if it starts with .. or .
    // In Next.js, process.cwd() is usually the project root (frontend/)
    const dbPath = process.env.INDEXER_DB_PATH || '../indexer/indexer.db';
    const resolvedPath = path.resolve(process.cwd(), dbPath);

    try {
        dbInstance = new Database(resolvedPath, { readonly: true });
        return dbInstance;
    } catch (error) {
        console.error(`Failed to open indexer database at ${resolvedPath}:`, error);
        throw error;
    }
}
