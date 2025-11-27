import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { Logger } from './logger';

export interface User {
  id: number;
  email: string;
  password_hash: string;
  is_verified: number; // 0 or 1
  verification_token: string | null;
  verification_token_expires_at: number | null; // Unix timestamp
  verification_resend_count: number; // number of times verification mail was resent
  created_at: string;
}

let db: Database.Database;

export const initDb = (dataDir: string): void => {
  const dbPath = path.join(dataDir, 'database.sqlite');

  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(dbPath);

  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_verified INTEGER DEFAULT 0,
      verification_token TEXT,
      verification_token_expires_at INTEGER,
      verification_resend_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create index for verification token lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_verification_token 
    ON users(verification_token) 
    WHERE verification_token IS NOT NULL
  `);

  // Migration: Check if verification_token_expires_at exists
  const columns = db.pragma('table_info(users)') as { name: string }[];
  const hasExpiresAt = columns.some(
    (col) => col.name === 'verification_token_expires_at',
  );

  if (!hasExpiresAt) {
    Logger.info('Migrating database: adding verification_token_expires_at column');
    db.exec('ALTER TABLE users ADD COLUMN verification_token_expires_at INTEGER');
  }

  const hasResendCount = columns.some((col) => col.name === 'verification_resend_count');

  if (!hasResendCount) {
    Logger.info('Migrating database: adding verification_resend_count column');
    db.exec('ALTER TABLE users ADD COLUMN verification_resend_count INTEGER DEFAULT 0');
  }

  Logger.info(`Database initialized at ${dbPath}`);
};

export const getDb = (): Database.Database => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
};
