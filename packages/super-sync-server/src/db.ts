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
  created_at: string;
}

let db: Database.Database;

export const initDb = (dataDir: string) => {
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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  Logger.info(`Database initialized at ${dbPath}`);
};

export const getDb = () => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
};
