/** Runs the real backup script, pg_dump, and psql against disposable databases. */
import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

const DATABASE_URL = process.env.DATABASE_URL;
const DB_CONTAINER = process.env.BACKUP_TEST_DB_CONTAINER;
const describeWithDb = DATABASE_URL && DB_CONTAINER ? describe : describe.skip;
const backupScript = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../scripts/backup.sh',
);

describeWithDb('accounts backup capture recovery (PostgreSQL)', () => {
  it('restores pending captures, terminal receipts and counters without the operation log', async () => {
    const sourceUrl = new URL(DATABASE_URL!);
    const dbUser = decodeURIComponent(sourceUrl.username);
    const sourceDb = decodeURIComponent(sourceUrl.pathname.slice(1));
    const restoreDb = `capture_backup_${Date.now()}_${process.pid}`;
    const restoredUrl = new URL(sourceUrl);
    restoredUrl.pathname = `/${restoreDb}`;
    const source = new PrismaClient();
    const restored = new PrismaClient({
      datasources: { db: { url: restoredUrl.toString() } },
    });
    const backupDir = mkdtempSync(join(tmpdir(), 'capture-backup-'));
    let userId: number | undefined;
    let databaseCreated = false;
    const psql = (database: string, sql: string | Buffer): void => {
      execFileSync(
        'docker',
        [
          'exec',
          '-i',
          DB_CONTAINER!,
          'psql',
          '-X',
          '-v',
          'ON_ERROR_STOP=1',
          '-U',
          dbUser,
          '-d',
          database,
        ],
        { input: sql, encoding: 'utf8', timeout: 30000 },
      );
    };
    try {
      const user = await source.user.create({
        data: { email: `${restoreDb}@test.local`, syncDataGeneration: 3 },
      });
      userId = user.id;
      await source.agentCaptureAccount.create({ data: { userId, publishedCounter: 7 } });
      const pending = await source.agentCapture.create({
        data: {
          userId,
          captureId: 'pending-capture',
          title: 'Not yet on a device',
          notes: 'Pending notes',
        },
      });
      // Terminal receipts deliberately survive absent/pruned operations.
      const receipt = await source.agentCapture.create({
        data: {
          userId,
          captureId: 'published-capture',
          title: '',
          notes: null,
          publishedOpId: 'pruned-operation',
          publishedServerSeq: 42,
        },
      });
      await source.passkey.create({
        data: {
          userId,
          credentialId: Buffer.from(restoreDb),
          publicKey: Buffer.from([1, 2, 3]),
        },
      });

      execFileSync('bash', [backupScript], {
        env: {
          ...process.env,
          DB_CONTAINER: DB_CONTAINER!,
          POSTGRES_USER: dbUser,
          POSTGRES_DB: sourceDb,
          BACKUP_DIR: backupDir,
          RCLONE_REMOTE: '',
        },
        encoding: 'utf8',
        timeout: 30000,
      });
      const accountsFile = readdirSync(backupDir).find((file) =>
        file.startsWith('supersync_accounts_'),
      );
      expect(accountsFile).toBeDefined();
      const backupPath = join(backupDir, accountsFile!);
      expect(statSync(backupPath).mode & 0o777).toBe(0o600);
      psql(sourceDb, `CREATE DATABASE ${restoreDb};`);
      databaseCreated = true;
      psql(restoreDb, gunzipSync(readFileSync(backupPath)));

      const tables = await restored.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      `;
      expect(tables.map(({ tablename }) => tablename).sort()).toEqual([
        'agent_capture_accounts',
        'agent_captures',
        'passkeys',
        'users',
      ]);
      expect(
        await restored.agentCapture.findMany({
          where: { userId },
          orderBy: { captureId: 'asc' },
        }),
      ).toEqual([pending, receipt]);
      expect(
        await restored.agentCaptureAccount.findUnique({ where: { userId } }),
      ).toEqual({ userId, publishedCounter: 7 });
      expect(
        (await restored.user.findUniqueOrThrow({ where: { id: userId } }))
          .syncDataGeneration,
      ).toBe(3);
      expect(await restored.passkey.count({ where: { userId } })).toBe(1);
    } finally {
      await restored.$disconnect();
      if (databaseCreated) psql(sourceDb, `DROP DATABASE ${restoreDb};`);
      if (userId !== undefined) await source.user.delete({ where: { id: userId } });
      await source.$disconnect();
      rmSync(backupDir, { recursive: true, force: true });
    }
  }, 60000);
});
