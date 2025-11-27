import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { loadConfigFromEnv } from '../src/config';

const deleteUser = (email: string) => {
  try {
    // Load config to get data directory
    const config = loadConfigFromEnv();
    const dbPath = path.join(config.dataDir, 'database.sqlite');

    if (!fs.existsSync(dbPath)) {
      console.error(`Database not found at ${dbPath}`);
      process.exit(1);
    }

    const db = new Database(dbPath);

    // Check if user exists first
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user) {
      console.log(`User with email "${email}" not found.`);
      return;
    }

    // Delete user
    const info = db.prepare('DELETE FROM users WHERE email = ?').run(email);

    if (info.changes > 0) {
      console.log(`Successfully deleted user: ${email}`);
    } else {
      console.log(`Failed to delete user: ${email}`);
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    process.exit(1);
  }
};

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('Please provide an email address.');
  console.error('Usage: npm run delete-user -- <email>');
  process.exit(1);
}

deleteUser(email);
