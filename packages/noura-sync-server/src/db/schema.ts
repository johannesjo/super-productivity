import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  customType,
  index,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => 'bytea',
});

// Bun.SQL handles JavaScript objects natively. Drizzle's built-in jsonb
// serializer stringifies them first, which Bun would persist as a JSON string
// instead of a JSON object. This pass-through type keeps JSONB values structured.
const bunJsonb = customType<{ data: unknown; driverData: unknown }>({
  dataType: () => 'jsonb',
});

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    email: text('email').notNull(),
    passwordHash: text('password_hash'),
    isVerified: integer('is_verified').notNull().default(0),
    verificationToken: text('verification_token'),
    verificationTokenExpiresAt: bigint('verification_token_expires_at', {
      mode: 'bigint',
    }),
    verificationResendCount: integer('verification_resend_count').notNull().default(0),
    resetPasswordToken: text('reset_password_token'),
    resetPasswordTokenExpiresAt: bigint('reset_password_token_expires_at', {
      mode: 'bigint',
    }),
    passkeyRecoveryToken: text('passkey_recovery_token'),
    passkeyRecoveryTokenExpiresAt: bigint('passkey_recovery_token_expires_at', {
      mode: 'bigint',
    }),
    loginToken: text('login_token'),
    loginTokenExpiresAt: bigint('login_token_expires_at', { mode: 'bigint' }),
    failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
    lockedUntil: bigint('locked_until', { mode: 'bigint' }),
    tokenVersion: integer('token_version').notNull().default(0),
    termsAcceptedAt: bigint('terms_accepted_at', { mode: 'bigint' }),
    createdAt: timestamp('created_at', { precision: 3, mode: 'date' })
      .notNull()
      .defaultNow(),
    storageQuotaBytes: bigint('storage_quota_bytes', { mode: 'bigint' })
      .notNull()
      .default(sql`104857600`),
    storageUsedBytes: bigint('storage_used_bytes', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
  },
  (table) => [
    uniqueIndex('users_email_key').on(table.email),
    index('users_verification_token_idx').on(table.verificationToken),
    index('users_reset_password_token_idx').on(table.resetPasswordToken),
    index('users_passkey_recovery_token_idx').on(table.passkeyRecoveryToken),
    index('users_login_token_idx').on(table.loginToken),
    check('users_is_verified_check', sql`${table.isVerified} in (0, 1)`),
    check('users_storage_quota_nonnegative', sql`${table.storageQuotaBytes} >= 0`),
    check('users_storage_used_nonnegative', sql`${table.storageUsedBytes} >= 0`),
  ],
);

export const passkeys = pgTable(
  'passkeys',
  {
    id: text('id').primaryKey(),
    credentialId: bytea('credential_id').notNull(),
    publicKey: bytea('public_key').notNull(),
    counter: bigint('counter', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    transports: text('transports'),
    createdAt: timestamp('created_at', { precision: 3, mode: 'date' })
      .notNull()
      .defaultNow(),
    lastUsedAt: timestamp('last_used_at', { precision: 3, mode: 'date' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  },
  (table) => [
    uniqueIndex('passkeys_credential_id_key').on(table.credentialId),
    index('passkeys_user_id_idx').on(table.userId),
  ],
);

export const pendingPasskeyRegistrations = pgTable(
  'pending_passkey_registrations',
  {
    id: text('id').primaryKey(),
    verificationToken: text('verification_token').notNull(),
    verificationTokenExpiresAt: bigint('verification_token_expires_at', {
      mode: 'bigint',
    }).notNull(),
    credentialId: bytea('credential_id').notNull(),
    publicKey: bytea('public_key').notNull(),
    counter: bigint('counter', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    transports: text('transports'),
    createdAt: timestamp('created_at', { precision: 3, mode: 'date' })
      .notNull()
      .defaultNow(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  },
  (table) => [
    uniqueIndex('pending_passkey_registrations_verification_token_key').on(
      table.verificationToken,
    ),
    index('pending_passkey_registrations_user_id_idx').on(table.userId),
  ],
);

export const operations = pgTable(
  'operations',
  {
    id: text('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    clientId: text('client_id').notNull(),
    serverSeq: integer('server_seq').notNull(),
    actionType: text('action_type').notNull(),
    opType: text('op_type').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id'),
    entityIds: text('entity_ids')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    payload: bunJsonb('payload').notNull(),
    payloadBytes: bigint('payload_bytes', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    vectorClock: bunJsonb('vector_clock').notNull(),
    schemaVersion: integer('schema_version').notNull(),
    clientTimestamp: bigint('client_timestamp', { mode: 'bigint' }).notNull(),
    receivedAt: bigint('received_at', { mode: 'bigint' }).notNull(),
    isPayloadEncrypted: boolean('is_payload_encrypted').notNull().default(false),
    syncImportReason: text('sync_import_reason'),
    repairBaseServerSeq: integer('repair_base_server_seq'),
  },
  (table) => [
    uniqueIndex('operations_user_id_server_seq_key').on(table.userId, table.serverSeq),
    index('operations_user_id_entity_type_entity_id_server_seq_idx').on(
      table.userId,
      table.entityType,
      table.entityId,
      table.serverSeq,
    ),
    index('operations_user_id_client_id_idx').on(table.userId, table.clientId),
    index('operations_user_id_received_at_idx').on(table.userId, table.receivedAt),
    index('operations_user_id_full_state_server_seq_idx')
      .on(table.userId, table.serverSeq)
      .where(sql`${table.opType} in ('SYNC_IMPORT', 'BACKUP_IMPORT', 'REPAIR')`),
    index('operations_user_id_server_seq_encrypted_idx')
      .on(table.userId, table.serverSeq)
      .where(sql`${table.isPayloadEncrypted} = true`),
    index('operations_entity_ids_gin').using('gin', table.entityIds),
    check('operations_server_seq_positive', sql`${table.serverSeq} > 0`),
    check('operations_payload_bytes_nonnegative', sql`${table.payloadBytes} >= 0`),
  ],
);

export const userSyncState = pgTable(
  'user_sync_state',
  {
    userId: integer('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    lastSeq: integer('last_seq').notNull().default(0),
    lastSnapshotSeq: integer('last_snapshot_seq'),
    snapshotData: bytea('snapshot_data'),
    snapshotAt: bigint('snapshot_at', { mode: 'bigint' }),
    snapshotSchemaVersion: integer('snapshot_schema_version').default(1),
    latestFullStateSeq: integer('latest_full_state_seq'),
    latestFullStateVectorClock: bunJsonb('latest_full_state_vector_clock'),
  },
  (table) => [check('user_sync_state_last_seq_nonnegative', sql`${table.lastSeq} >= 0`)],
);

export const syncDevices = pgTable(
  'sync_devices',
  {
    clientId: text('client_id').notNull(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    deviceName: text('device_name'),
    userAgent: text('user_agent'),
    lastSeenAt: bigint('last_seen_at', { mode: 'bigint' }).notNull(),
    lastAckedSeq: integer('last_acked_seq').notNull().default(0),
    createdAt: bigint('created_at', { mode: 'bigint' }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.clientId] }),
    check('sync_devices_last_acked_seq_nonnegative', sql`${table.lastAckedSeq} >= 0`),
  ],
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type PasskeyRow = typeof passkeys.$inferSelect;
export type PendingPasskeyRegistrationRow =
  typeof pendingPasskeyRegistrations.$inferSelect;
export type OperationRow = typeof operations.$inferSelect;
export type UserSyncStateRow = typeof userSyncState.$inferSelect;
export type SyncDeviceRow = typeof syncDevices.$inferSelect;
