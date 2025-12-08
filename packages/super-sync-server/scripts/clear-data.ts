import { getDb, initDb } from '../src/db';
import { loadConfigFromEnv } from '../src/config';
import * as readline from 'readline';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Recursively delete a directory and all its contents.
 * Returns true if deleted, false if directory didn't exist.
 */
function deleteDirectory(dirPath: string): boolean {
  if (!fs.existsSync(dirPath)) {
    return false;
  }
  fs.rmSync(dirPath, { recursive: true, force: true });
  return true;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

async function main() {
  // Load config
  const config = loadConfigFromEnv();
  const dbPath = path.join(config.dataDir, 'database.sqlite');

  if (!fs.existsSync(dbPath)) {
    console.error(`Database not found at ${dbPath}`);
    console.error('Please ensure the DATA_DIR environment variable is set correctly.');
    process.exit(1);
  }

  // Init DB
  initDb(config.dataDir);
  const db = getDb();

  const target = process.argv[2];

  if (!target) {
    console.log('Usage: npm run clear-data -- <email|--all>');
    console.log('  <email> : Clear data for a specific user (keeps account)');
    console.log('  --all   : Clear data for ALL users (keeps accounts)');
    process.exit(1);
  }

  if (target === '--all') {
    const answer = await question(
      'WARNING: This will delete ALL sync data for ALL users (database tables AND file-based storage). Accounts will be preserved. Are you sure? (yes/no): ',
    );
    if (answer.toLowerCase() !== 'yes') {
      console.log('Aborted.');
      process.exit(0);
    }

    console.log('Clearing all sync data...');

    // Clear database tables
    const tables = ['operations', 'user_sync_state', 'sync_devices', 'tombstones'];

    db.transaction(() => {
      for (const table of tables) {
        const res = db.prepare(`DELETE FROM ${table}`).run();
        console.log(`Deleted ${res.changes} rows from ${table}`);
      }
    })();

    // Clear file-based storage directories
    // These directories contain data from file-based sync (WebDAV, etc.)
    const fileBasedDirs = [
      path.join(config.dataDir, 'storage'),
      path.join(config.dataDir, 'super-productivity'),
    ];

    // Also check for any user-named directories at the root of dataDir
    // (e.g., data/DEV, data/username, etc.) that aren't the database or known system dirs
    const systemFiles = ['database.sqlite', 'storage', 'super-productivity'];
    try {
      const entries = fs.readdirSync(config.dataDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !systemFiles.includes(entry.name)) {
          fileBasedDirs.push(path.join(config.dataDir, entry.name));
        }
      }
    } catch {
      // Ignore read errors
    }

    for (const dir of fileBasedDirs) {
      if (deleteDirectory(dir)) {
        console.log(`Deleted file-based storage: ${dir}`);
      }
    }

    console.log('Done.');
  } else {
    // Target is an email
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(target) as
      | { id: number }
      | undefined;

    if (!user) {
      console.error(`User not found: ${target}`);
      process.exit(1);
    }

    const answer = await question(
      `WARNING: This will delete all sync data for user '${target}'. The account/token will work, but data will be gone. Are you sure? (yes/no): `,
    );
    if (answer.toLowerCase() !== 'yes') {
      console.log('Aborted.');
      process.exit(0);
    }

    console.log(`Clearing sync data for user ${target} (ID: ${user.id})...`);

    // Clear database tables
    const tables = ['operations', 'user_sync_state', 'sync_devices', 'tombstones'];

    db.transaction(() => {
      for (const table of tables) {
        const res = db.prepare(`DELETE FROM ${table} WHERE user_id = ?`).run(user.id);
        console.log(`Deleted ${res.changes} rows from ${table}`);
      }
    })();

    // Clear file-based storage for this user
    // File-based storage may use email as directory name or user ID
    const emailLocalPart = target.split('@')[0]; // e.g., "DEV" from "DEV@example.com"
    const userFileDirs = [
      path.join(config.dataDir, 'storage', `user-${user.id}`),
      path.join(config.dataDir, target), // email as directory name
      path.join(config.dataDir, emailLocalPart), // email local part as directory name
      path.join(config.dataDir, 'super-productivity', target),
      path.join(config.dataDir, 'super-productivity', emailLocalPart),
    ];

    for (const dir of userFileDirs) {
      if (deleteDirectory(dir)) {
        console.log(`Deleted file-based storage: ${dir}`);
      }
    }

    console.log('Done.');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
