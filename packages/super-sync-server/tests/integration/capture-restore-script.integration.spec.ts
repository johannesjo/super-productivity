/**
 * Runs the operator CLI exactly as docs/backup-and-recovery.md tells an operator
 * to type it, against a real database. The restore hold's resumption gate is an
 * exit code, so the exit codes are the behavior under test, not a detail.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { prisma, disconnectDb } from '../../src/db';

const DATABASE_URL = process.env.DATABASE_URL;
const describeWithDb = DATABASE_URL ? describe : describe.skip;
const packageDir = join(dirname(fileURLToPath(import.meta.url)), '../..');
const RUN_ID = `${Date.now()}-${process.pid}`;

describeWithDb('capture-restore operator CLI (PostgreSQL)', () => {
  const userIds: number[] = [];

  const run = (
    ...args: string[]
  ): { status: number | null; stdout: string; stderr: string } => {
    const result = spawnSync(
      'npm',
      ['run', '--silent', 'capture-restore', '--', ...args],
      {
        cwd: packageDir,
        encoding: 'utf8',
        timeout: 120_000,
        env: { ...process.env, DATABASE_URL },
      },
    );
    if (result.error) throw result.error;
    return { status: result.status, stdout: result.stdout, stderr: result.stderr };
  };

  // Log history is exportable and recovery artifacts are private user data, so
  // no command may echo what the user submitted.
  const SUBMITTED_CONTENT = 'confidential submitted capture title';

  const seedUser = async (captures: string[]): Promise<number> => {
    const user = await prisma.user.create({
      data: {
        email: `capture-cli-${RUN_ID}-${userIds.length}@test.local`,
        isVerified: 1,
      },
    });
    userIds.push(user.id);
    await prisma.agentCapture.createMany({
      data: captures.map((captureId) => ({
        userId: user.id,
        captureId,
        title: SUBMITTED_CONTENT,
      })),
    });
    return user.id;
  };

  afterEach(async () => {
    await prisma.agentCapture.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.agentCaptureAccount.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    userIds.length = 0;
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it('holds resumption until every restored capture is resolved', async () => {
    const userId = await seedUser(['cli-delivered', 'cli-discarded']);

    const blocked = run('status');
    expect(blocked.status).toBe(1);
    expect(blocked.stdout).toContain(`user ${userId}`);
    expect(blocked.stdout).toContain('cli-delivered');
    expect(blocked.stdout).not.toContain(SUBMITTED_CONTENT);

    const delivered = run(
      'resolve',
      String(userId),
      'cli-delivered',
      'delivered_out_of_band',
    );
    expect(delivered.status).toBe(0);
    expect(delivered.stdout).not.toContain(SUBMITTED_CONTENT);
    // The erased publication already consumed this publisher clock value.
    expect(delivered.stdout).toContain('watermark is now 1');

    // One resolved item does not open the gate.
    expect(run('status').status).toBe(1);

    const discarded = run(
      'resolve',
      String(userId),
      'cli-discarded',
      'discarded_by_user',
    );
    expect(discarded.status).toBe(0);

    const cleared = run('status');
    expect(cleared.status).toBe(0);
    expect(cleared.stdout).toContain('No restored pending capture is unresolved');
    // An empty backlog counts only rows the restore kept, so the command must
    // not present itself as authorization to resume.
    expect(cleared.stdout).toContain('does not by itself authorize');

    expect(
      await prisma.agentCapture.findMany({
        where: { userId },
        select: { captureId: true, title: true, notes: true, resolution: true },
        orderBy: { captureId: 'asc' },
      }),
    ).toEqual([
      {
        captureId: 'cli-delivered',
        title: '',
        notes: null,
        resolution: 'delivered_out_of_band',
      },
      {
        captureId: 'cli-discarded',
        title: '',
        notes: null,
        resolution: 'discarded_by_user',
      },
    ]);
    expect(
      await prisma.agentCaptureAccount.findUnique({ where: { userId } }),
    ).toMatchObject({ publishedCounter: 1 });
    // Each invocation pays an npm + ts-node cold start.
  }, 60_000);

  it('refuses an unknown capture and a resolution outside the vocabulary', async () => {
    const userId = await seedUser(['cli-only']);

    const absent = run('resolve', String(userId), 'cli-missing', 'discarded_by_user');
    expect(absent.status).toBe(1);

    const invalid = run('resolve', String(userId), 'cli-only', 'delivered');
    expect(invalid.status).toBe(1);
    expect(invalid.stdout).toContain('Usage:');

    // Neither refusal may close the gate or touch the row.
    expect(
      await prisma.agentCapture.findMany({
        where: { userId },
        select: { resolution: true },
      }),
    ).toEqual([{ resolution: null }]);
    // A refused command writes nothing at all — not even the account row that
    // resolution would otherwise create on its way to the queue read.
    expect(await prisma.agentCaptureAccount.findUnique({ where: { userId } })).toBeNull();
  });
});
