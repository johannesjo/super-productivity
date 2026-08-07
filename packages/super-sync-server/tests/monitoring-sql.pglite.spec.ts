import { PGlite } from '@electric-sql/pglite';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

/**
 * Real-Postgres coverage for the monitoring/analysis CLIs.
 *
 * monitoring-scripts.spec.ts renders each query to a STRING and asserts what it
 * contains — it never sends the SQL anywhere, so a query Postgres refuses to parse
 * still passes there. That matters because the bounded rewrites these reports rely
 * on use constructs a string assertion cannot vet: `TABLESAMPLE SYSTEM (1)
 * REPEATABLE ($1)` with a bound parameter, nested Prisma.sql fragments spliced into
 * MATERIALIZED CTEs, and CROSS JOIN LATERAL per-user tails. This spec executes the
 * real tagged templates against an in-process Postgres (PGlite — no Docker, no
 * DATABASE_URL).
 *
 * Scope, deliberately: this proves each query PARSES AND PLANS on real Postgres, and
 * that the row-shaping code downstream survives real result rows. It does NOT vet
 * production query cost — the fixture has no realistic index set or row count — and
 * for the TABLESAMPLE reports a 1% sample of a single-page fixture is usually empty,
 * so only the plan is exercised there. Semantics stay pinned by the string
 * assertions in monitoring-scripts.spec.ts; the two specs are complementary.
 */

const mocks = vi.hoisted(() => {
  const state: { db: unknown } = { db: null };
  const prisma = {
    $queryRaw: vi.fn(
      async (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown> => {
        const { Prisma } = await import('@prisma/client');
        const sql = Prisma.sql(strings, ...(values as never[]));
        const db = state.db as {
          query: (text: string, values: unknown[]) => Promise<{ rows: unknown[] }>;
        };
        return (await db.query(sql.text, sql.values)).rows;
      },
    ),
    $disconnect: vi.fn(async () => undefined),
    user: {
      count: vi.fn(async () => 4),
      findUnique: vi.fn(async () => ({ email: 'user1@example.com' })),
    },
    operation: { findUnique: vi.fn(async () => null) },
  };
  return {
    state,
    prisma,
    PrismaClient: vi.fn(function () {
      return prisma;
    }),
  };
});

vi.mock('@prisma/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@prisma/client')>()),
  PrismaClient: mocks.PrismaClient,
}));

// Mirrors the monitored columns of schema.prisma. Only the tables these reports read.
const SCHEMA = `
  CREATE TABLE users (
    id serial PRIMARY KEY,
    email text NOT NULL,
    is_verified integer NOT NULL DEFAULT 0,
    created_at timestamp(3) NOT NULL DEFAULT now(),
    storage_quota_bytes bigint NOT NULL DEFAULT 104857600,
    storage_used_bytes bigint NOT NULL DEFAULT 0
  );
  CREATE TABLE operations (
    id text PRIMARY KEY,
    user_id integer NOT NULL,
    client_id text NOT NULL,
    server_seq integer NOT NULL,
    action_type text NOT NULL,
    op_type text NOT NULL,
    entity_type text NOT NULL,
    entity_id text,
    entity_ids text[] NOT NULL DEFAULT '{}',
    payload jsonb NOT NULL,
    payload_bytes bigint NOT NULL DEFAULT 0,
    vector_clock jsonb NOT NULL,
    schema_version integer NOT NULL,
    client_timestamp bigint NOT NULL,
    received_at bigint NOT NULL,
    is_payload_encrypted boolean NOT NULL DEFAULT false
  );
  CREATE UNIQUE INDEX operations_user_seq ON operations (user_id, server_seq);
  CREATE TABLE user_sync_state (
    user_id integer PRIMARY KEY,
    last_seq integer NOT NULL DEFAULT 0,
    last_snapshot_seq integer,
    snapshot_data bytea,
    snapshot_at bigint
  );
  CREATE TABLE sync_devices (
    client_id text NOT NULL,
    user_id integer NOT NULL,
    device_name text,
    last_seen_at bigint NOT NULL,
    last_acked_seq integer NOT NULL DEFAULT 0,
    created_at bigint NOT NULL,
    PRIMARY KEY (user_id, client_id)
  );
`;

const SYNCING_USERS = 3;
const TOTAL_USERS = 4; // user 4 has never synced: no sync state, no device, no ops
const OPS_PER_USER = 20;
const MULTI_DEVICE_USER = 1;
const MULTI_DEVICE_COUNT = 3;

interface TableRow {
  [column: string]: unknown;
}

describe('monitoring report SQL (PGlite)', () => {
  let db: PGlite;
  let previousArgv: string[];
  let previousExitCode: typeof process.exitCode;
  let consoleError: ReturnType<typeof vi.spyOn>;
  let consoleTable: ReturnType<typeof vi.spyOn>;

  const seed = async (): Promise<void> => {
    const now = Date.now();

    for (let userId = 1; userId <= SYNCING_USERS; userId++) {
      await db.query(
        `INSERT INTO users (id, email, is_verified, storage_used_bytes)
         VALUES ($1, $2, 1, $3)`,
        [userId, `user${userId}@example.com`, 1000 * userId],
      );
      await db.query(
        `INSERT INTO user_sync_state
           (user_id, last_seq, last_snapshot_seq, snapshot_data, snapshot_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, 10 * userId, 5 * userId, Buffer.from(`snapshot-${userId}`), now],
      );
      // One user owns several devices so the sync_devices join fan-out is visible.
      const devices = userId === MULTI_DEVICE_USER ? MULTI_DEVICE_COUNT : 1;
      for (let device = 1; device <= devices; device++) {
        await db.query(
          `INSERT INTO sync_devices
             (client_id, user_id, device_name, last_seen_at, created_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            `client-${userId}-${device}`,
            userId,
            `Device ${userId}-${device}`,
            now - 1000,
            now - 100000,
          ],
        );
      }
      for (let seq = 1; seq <= OPS_PER_USER; seq++) {
        await db.query(
          `INSERT INTO operations
             (id, user_id, client_id, server_seq, action_type, op_type, entity_type,
              entity_id, payload, payload_bytes, vector_clock, schema_version,
              client_timestamp, received_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,1,$12,$12)`,
          [
            `op-${userId}-${seq}`,
            userId,
            `client-${userId}-1`,
            seq,
            '[Task] Update Task',
            'UPD',
            'TASK',
            `task-${seq}`,
            JSON.stringify({ title: 'x'.repeat(seq) }),
            // Leave the odd rows unbackfilled so the OCTET_LENGTH(payload) fallback
            // branch of every size expression is executed, not just the counter.
            seq % 2 === 0 ? 100 * seq : 0,
            JSON.stringify({ [`client-${userId}-1`]: seq }),
            // Newer ops carry a higher server_seq, matching production ordering.
            now - (OPS_PER_USER - seq) * 1000,
          ],
        );
      }
    }

    // A registered user who never synced: exercises the LEFT JOIN / COALESCE /
    // GREATEST branches that a fully populated fixture never reaches.
    await db.query(
      `INSERT INTO users (id, email, is_verified, storage_used_bytes)
       VALUES ($1, $2, 0, 0)`,
      [TOTAL_USERS, `user${TOTAL_USERS}@example.com`],
    );
  };

  beforeAll(async () => {
    db = new PGlite();
    await db.waitReady;
    mocks.state.db = db;
    await db.exec(SCHEMA);
    await seed();
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(() => {
    vi.resetModules();
    previousArgv = process.argv;
    previousExitCode = process.exitCode;
    process.exitCode = undefined;
    mocks.prisma.$disconnect.mockClear();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleTable = vi.spyOn(console, 'table').mockImplementation(() => undefined);
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    // The CLIs call process.exit directly on bad arguments; without this a future
    // argv would kill the vitest worker instead of failing a test.
    vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`Unexpected process.exit(${code})`);
    });
  });

  afterEach(() => {
    process.argv = previousArgv;
    process.exitCode = previousExitCode;
    vi.restoreAllMocks();
  });

  const SCRIPTS = {
    monitor: () => import('../scripts/monitor'),
    'analyze-storage': () => import('../scripts/analyze-storage'),
  };

  const run = async (script: keyof typeof SCRIPTS, args: string[]): Promise<void> => {
    process.argv = ['node', script, ...args];
    await SCRIPTS[script]();
    // Every CLI disconnects in its `finally`, strictly after any console.error and
    // any exit-code write, so waiting on it also waits out the whole query chain.
    await vi.waitFor(() => expect(mocks.prisma.$disconnect).toHaveBeenCalled());
    expect(consoleError.mock.calls).toEqual([]);
    expect(process.exitCode).toBeUndefined();
  };

  const tableRows = (): TableRow[] =>
    consoleTable.mock.calls.flatMap((call: unknown[]) => call[0] as TableRow[]);

  const rowsWithColumn = (column: string): TableRow[] =>
    tableRows().filter((row) => column in row);

  // Every report the production suite runs, plus the two `monitor` commands that are
  // only reachable directly (documented in MONITORING-README.md and docker-monitor.sh).
  const REPORTS: Array<[string, keyof typeof SCRIPTS, string[]]> = [
    ['monitor active-users (direct command only)', 'monitor', ['active-users']],
    ['monitor active-users-quick', 'monitor', ['active-users-quick']],
    ['monitor ops (all users)', 'monitor', ['ops']],
    ['monitor ops (single user)', 'monitor', ['ops', '--user', '1']],
    ['analyze operation-sizes (1% sample)', 'analyze-storage', ['operation-sizes']],
    [
      'analyze operation-sizes (single user)',
      'analyze-storage',
      ['operation-sizes', '--user', '1'],
    ],
    ['analyze operation-types (1% sample)', 'analyze-storage', ['operation-types']],
    [
      'analyze operation-types (single user)',
      'analyze-storage',
      ['operation-types', '--user', '1'],
    ],
    ['analyze operation-timeline', 'analyze-storage', ['operation-timeline']],
    ['analyze large-ops (1% sample)', 'analyze-storage', ['large-ops', '--limit', '20']],
    ['analyze rapid-fire', 'analyze-storage', ['rapid-fire', '--threshold', '5']],
    ['analyze snapshot-analysis', 'analyze-storage', ['snapshot-analysis']],
  ];

  for (const [name, script, args] of REPORTS) {
    it(`parses and plans on real Postgres: ${name}`, async () => {
      await run(script, args);
    });
  }

  it('lists every user from the cached storage counter, including never-synced ones', async () => {
    await run('monitor', ['usage', '--no-save']);
    expect(rowsWithColumn('LastSeq')).toHaveLength(TOTAL_USERS);
  });

  it('lists the newest operations per user first', async () => {
    await run('monitor', ['ops', '--user', '1', '--tail', '5']);
    const ops = rowsWithColumn('PayloadSize');
    expect(ops).toHaveLength(5);
    // server_seq DESC, so the highest-seq (newest) op leads.
    expect(ops[0].Entity).toBe(`TASK:task-${OPS_PER_USER}`);
  });

  it("does not multiply a user's operation count by their device count", async () => {
    await run('monitor', ['active-users']);
    const recent = rowsWithColumn('Ops (7d)');
    const multiDevice = recent.find((row) => row.ID === MULTI_DEVICE_USER);
    expect(multiDevice?.Devices).toBe(MULTI_DEVICE_COUNT);
    // Without COUNT(DISTINCT o.id) this reads OPS_PER_USER * MULTI_DEVICE_COUNT.
    expect(multiDevice?.['Ops (7d)']).toBe(OPS_PER_USER);
  });

  it('buckets per-user sizes across backfilled and unbackfilled rows', async () => {
    await run('analyze-storage', ['operation-sizes', '--user', '1']);
    const buckets = rowsWithColumn('Bucket').map((row) => row.Bucket);
    // Odd seqs fall back to OCTET_LENGTH(payload), even seqs use payload_bytes
    // (100..2000), so both branches must contribute rows.
    expect(buckets).toContain('0-512B');
    expect(buckets).toContain('1KB-5KB');
  });

  it('ranks only users that actually hold a snapshot', async () => {
    await run('analyze-storage', ['snapshot-analysis']);
    expect(rowsWithColumn('SnapshotSize')).toHaveLength(SYNCING_USERS);
  });
});
