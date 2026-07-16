import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(import.meta.dirname, '../drizzle/0000_nourasync.sql'),
  'utf8',
);

describe('NouraSync initial Drizzle migration', () => {
  it.each([
    'users',
    'passkeys',
    'pending_passkey_registrations',
    'operations',
    'user_sync_state',
    'sync_devices',
  ])('creates the %s table', (table) => {
    expect(migration).toContain(`CREATE TABLE "${table}"`);
  });

  it('defines cascade ownership for all user-scoped records', () => {
    expect(migration.match(/ON DELETE cascade/g)).toHaveLength(5);
  });

  it('enforces operation ordering and device identity uniqueness', () => {
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "operations_user_id_server_seq_key"',
    );
    expect(migration).toContain(
      'CONSTRAINT "sync_devices_user_id_client_id_pk" PRIMARY KEY("user_id","client_id")',
    );
  });

  it('creates full-state, encrypted payload, and entity lookup indexes', () => {
    expect(migration).toContain(
      'CREATE INDEX "operations_user_id_full_state_server_seq_idx"',
    );
    expect(migration).toContain(
      'CREATE INDEX "operations_user_id_server_seq_encrypted_idx"',
    );
    expect(migration).toContain(
      'CREATE INDEX "operations_entity_ids_gin" ON "operations" USING gin',
    );
  });

  it('is a clean schema with no legacy migration machinery', () => {
    expect(migration).not.toContain('payload_bytes_unbackfilled');
    expect(migration).not.toContain('ALTER COLUMN');
  });
});
