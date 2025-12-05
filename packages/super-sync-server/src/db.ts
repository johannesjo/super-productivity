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
  failed_login_attempts: number; // count of consecutive failed logins
  locked_until: number | null; // Unix timestamp when lockout expires
  created_at: string;
}

// Sync-related database types
export interface DbOperation {
  id: string;
  user_id: number;
  client_id: string;
  server_seq: number;
  action_type: string;
  op_type: string;
  entity_type: string;
  entity_id: string | null;
  payload: string; // JSON
  vector_clock: string; // JSON
  schema_version: number;
  client_timestamp: number;
  received_at: number;
}

export interface DbUserSyncState {
  user_id: number;
  last_seq: number;
  last_snapshot_seq: number | null;
  snapshot_data: Buffer | null;
  snapshot_at: number | null;
}

export interface DbSyncDevice {
  client_id: string;
  user_id: number;
  device_name: string | null;
  user_agent: string | null;
  last_seen_at: number;
  last_acked_seq: number;
  created_at: number;
}

export interface DbTombstone {
  user_id: number;
  entity_type: string;
  entity_id: string;
  deleted_at: number;
  deleted_by_op_id: string;
  expires_at: number;
}

let db: Database.Database;

export const initDb = (dataDir: string, inMemory = false): void => {
  let dbPath: string;

  if (inMemory) {
    db = new Database(':memory:');
    dbPath = ':memory:';
  } else {
    dbPath = path.join(dataDir, 'database.sqlite');

    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new Database(dbPath);
  }

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

  // ===== SYNC TABLES =====

  // Operations table (append-only operation log)
  db.exec(`
    CREATE TABLE IF NOT EXISTS operations (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      client_id TEXT NOT NULL,
      server_seq INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      op_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      payload TEXT NOT NULL,
      vector_clock TEXT NOT NULL,
      schema_version INTEGER NOT NULL,
      client_timestamp INTEGER NOT NULL,
      received_at INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Indexes for efficient sync queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_ops_user_seq ON operations(user_id, server_seq);
    CREATE INDEX IF NOT EXISTS idx_ops_user_entity ON operations(user_id, entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_ops_client ON operations(user_id, client_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_ops_user_seq_unique ON operations(user_id, server_seq);
    CREATE INDEX IF NOT EXISTS idx_ops_received_at ON operations(user_id, received_at);
  `);

  // Per-user sequence counter and snapshot cache
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_sync_state (
      user_id INTEGER PRIMARY KEY,
      last_seq INTEGER NOT NULL DEFAULT 0,
      last_snapshot_seq INTEGER,
      snapshot_data BLOB,
      snapshot_at INTEGER,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Device/client tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_devices (
      client_id TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      device_name TEXT,
      user_agent TEXT,
      last_seen_at INTEGER NOT NULL,
      last_acked_seq INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, client_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Tombstones for deleted entities (prevents resurrection)
  db.exec(`
    CREATE TABLE IF NOT EXISTS tombstones (
      user_id INTEGER NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      deleted_at INTEGER NOT NULL,
      deleted_by_op_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, entity_type, entity_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Index for tombstone cleanup
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tombstones_expires ON tombstones(expires_at)
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

  // Migration: Add account lockout columns
  const hasFailedLoginAttempts = columns.some(
    (col) => col.name === 'failed_login_attempts',
  );
  if (!hasFailedLoginAttempts) {
    Logger.info('Migrating database: adding account lockout columns');
    db.exec('ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0');
    db.exec('ALTER TABLE users ADD COLUMN locked_until INTEGER');
  }

  Logger.info(`Database initialized at ${dbPath}`);
};

export const getDb = (): Database.Database => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
};
