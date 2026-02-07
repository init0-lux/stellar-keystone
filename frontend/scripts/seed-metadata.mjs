import Database from 'better-sqlite3';
import path from 'path';

// Path to the database - assuming it's in the root or indexer directory
// Adjust relative path as needed. Going up from frontend/scripts -> frontend -> root
const dbPath = path.join(process.cwd(), '../indexer.db');

console.log(`Connecting to database at ${dbPath}...`);
const db = new Database(dbPath);

// Ensure table exists (in case indexer hasn't run)
db.exec(`
  CREATE TABLE IF NOT EXISTS role_metadata (
    role TEXT PRIMARY KEY,
    description TEXT,
    permissions TEXT,
    updated_at INTEGER
  );
`);

const roles = [
    {
        role: 'admin',
        description: 'Full system access. Admins can manage all roles, users, and system configurations. Exercise caution when granting this role.',
        permissions: ['system.admin', 'roles.write', 'users.manage', 'conf.update']
    },
    {
        role: 'moderator',
        description: 'Can manage user content and handle reports. Moderators ensure the community guidelines are followed.',
        permissions: ['content.moderate', 'users.read', 'reports.view', 'shadow.ban']
    },
    {
        role: 'user',
        description: 'Standard user access with basic privileges to use the application features.',
        permissions: ['profile.read', 'profile.update', 'posts.create', 'comments.add']
    }
];

const insertStmt = db.prepare(`
  INSERT OR REPLACE INTO role_metadata (role, description, permissions, updated_at)
  VALUES (?, ?, ?, ?)
`);

db.transaction(() => {
    for (const role of roles) {
        console.log(`Seeding metadata for role: ${role.role}`);
        insertStmt.run(
            role.role,
            role.description,
            JSON.stringify(role.permissions),
            Math.floor(Date.now() / 1000)
        );
    }
})();

console.log('Seeding complete!');
db.close();
