/**
 * Verifies the capture recovery CHECK constraints THE MIGRATION SHIPS.
 *
 * CI provisions its database with `prisma db push`, which cannot express CHECK
 * constraints, so production is the only place they normally exist — and a
 * migration that stopped creating them would go unnoticed everywhere. This spec
 * reads the DDL out of the migration file rather than restating it (the same
 * reason `migration-index.helper.ts` extracts index DDL: a copy drifts silently
 * and then measures a world that does not exist), applies it when the database
 * lacks it, and removes only what it added.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma, disconnectDb } from '../../src/db';

const DATABASE_URL = process.env.DATABASE_URL;
const describeWithDb = DATABASE_URL ? describe : describe.skip;

const CONSTRAINTS = [
  'agent_captures_resolution_pair',
  'agent_captures_resolution_terminal',
  'agent_captures_resolution_values',
];

const migrationDdl = (): string => {
  const sql = readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      '../../prisma/migrations/20260922000000_add_agent_capture_recovery_resolution/migration.sql',
    ),
    'utf8',
  );
  const statement = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.includes('ADD CONSTRAINT'));
  // Fail loudly rather than verifying an empty statement: a migration whose
  // shape changed must break this spec, not quietly weaken it.
  if (!statement || CONSTRAINTS.some((name) => !statement.includes(name))) {
    throw new Error('migration no longer adds all three resolution constraints');
  }
  return statement;
};

describeWithDb('agent capture recovery constraints (PostgreSQL)', () => {
  let userId: number;
  let addedByThisSpec = false;

  const presentConstraints = async (): Promise<string[]> => {
    const rows = await prisma.$queryRaw<Array<{ conname: string }>>`
      SELECT conname FROM pg_constraint WHERE conname = ANY(${CONSTRAINTS})
    `;
    return rows.map(({ conname }) => conname).sort();
  };

  const insert = (
    captureId: string,
    columns: Record<string, unknown>,
  ): Promise<unknown> =>
    prisma.$executeRawUnsafe(
      `INSERT INTO agent_captures (user_id, capture_id, title, notes, published_op_id, published_server_seq, resolution, resolved_at)
       VALUES ($1, $2, '', NULL, $3, $4, $5, $6)`,
      userId,
      captureId,
      columns.publishedOpId ?? null,
      columns.publishedServerSeq ?? null,
      columns.resolution ?? null,
      columns.resolvedAt ?? null,
    );

  beforeAll(async () => {
    const present = await presentConstraints();
    if (present.length === 0) {
      await prisma.$executeRawUnsafe(migrationDdl());
      addedByThisSpec = true;
    } else if (present.length !== CONSTRAINTS.length) {
      throw new Error(`partial constraint state: ${present.join(', ')}`);
    }
    const user = await prisma.user.create({
      data: { email: `capture-checks-${Date.now()}-${process.pid}@test.local` },
    });
    userId = user.id;
  });

  afterAll(async () => {
    if (userId) await prisma.user.delete({ where: { id: userId } });
    if (addedByThisSpec) {
      for (const name of CONSTRAINTS) {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE agent_captures DROP CONSTRAINT ${name}`,
        );
      }
    }
    await disconnectDb();
  });

  it('accepts a pending row, a terminal receipt, and a recorded resolution', async () => {
    expect(await presentConstraints()).toEqual([...CONSTRAINTS].sort());
    await insert('checks-pending', {});
    await insert('checks-receipt', { publishedOpId: 'op-1', publishedServerSeq: 5 });
    await insert('checks-resolved', {
      resolution: 'delivered_out_of_band',
      resolvedAt: new Date(),
    });
    expect(await prisma.agentCapture.count({ where: { userId } })).toBe(3);
  });

  it('refuses a half-recorded resolution, a receipt plus a resolution, and an unknown outcome', async () => {
    await expect(
      insert('checks-no-timestamp', { resolution: 'discarded_by_user' }),
    ).rejects.toThrow(/agent_captures_resolution_pair/);
    await expect(insert('checks-no-outcome', { resolvedAt: new Date() })).rejects.toThrow(
      /agent_captures_resolution_pair/,
    );
    await expect(
      insert('checks-both-terminal', {
        publishedOpId: 'op-2',
        publishedServerSeq: 6,
        resolution: 'delivered_out_of_band',
        resolvedAt: new Date(),
      }),
    ).rejects.toThrow(/agent_captures_resolution_terminal/);
    await expect(
      insert('checks-unknown', { resolution: 'whatever', resolvedAt: new Date() }),
    ).rejects.toThrow(/agent_captures_resolution_values/);
  });
});
