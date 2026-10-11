/**
 * Real-PostgreSQL coverage for capture races that PGlite (one connection)
 * cannot prove: concurrent claims never share an item, and concurrent
 * enqueues at the cap stop exactly at it.
 *
 * Prerequisites:
 *   DATABASE_URL=postgresql://supersync:superpassword@localhost:55432/supersync_db
 *   (`npm run supersync:db` publishes it on 55432 and applies the schema)
 *
 * Run with:
 *   npx vitest run --config vitest.integration.config.ts \
 *     tests/integration/capture-claim-race.integration.spec.ts
 */
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.JWT_SECRET = 'integration-test-jwt-secret-at-least-32-characters';
});

import { createECDH } from 'crypto';
import { disconnectDb, prisma } from '../../src/db';
import { captureKeyFingerprint } from '../../src/capture/capture-seal';
import { registerCaptureKey } from '../../src/capture/capture-key.store';
import { createCaptureTokenGrant } from '../../src/capture/capture-grant.store';
import {
  CapturePayload,
  claimCaptures,
  enqueueCapture,
} from '../../src/capture/capture-queue.store';
import { CAPTURE_MAX_PENDING_PER_GRANT } from '../../src/capture/capture.const';

const DATABASE_URL = process.env.DATABASE_URL;
const describeWithDb = DATABASE_URL ? describe : describe.skip;
const EMAIL = `capture-race-${Date.now()}-${process.pid}@example.com`;

const P256_SPKI_PREFIX = Buffer.from(
  '3059301306072a8648ce3d020106082a8648ce3d030107034200',
  'hex',
);
const newPublicKey = (): string => {
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  return Buffer.concat([P256_SPKI_PREFIX, ecdh.getPublicKey()]).toString('base64');
};

const payload = (title: string): CapturePayload => ({
  v: 1,
  title,
  createdAt: Date.now(),
  client: 'race',
});

describeWithDb('capture races (real PostgreSQL)', () => {
  let userId: number;
  let grantId: string;
  let fingerprint: string;

  beforeEach(async () => {
    await prisma.user.deleteMany({ where: { email: EMAIL } });
    userId = (await prisma.user.create({ data: { email: EMAIL } })).id;
    const publicKey = newPublicKey();
    fingerprint = captureKeyFingerprint(publicKey);
    await registerCaptureKey(userId, publicKey);
    grantId = (await createCaptureTokenGrant(userId, 'race')).grant.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: EMAIL } });
    await disconnectDb();
  });

  it('never leases one item to two devices claiming at once', async () => {
    await prisma.$executeRaw`
      INSERT INTO capture_items (id, user_id, grant_id, ciphertext, task_id, created_at)
      SELECT 'race-' || i, ${userId}, ${grantId}, 'x', 'race-' || i, i
      FROM generate_series(1, 120) AS i`;

    const claims = await Promise.all(
      ['dev-a', 'dev-b', 'dev-c', 'dev-d'].map((device) =>
        claimCaptures(userId, device, fingerprint),
      ),
    );
    const itemIds = claims.flatMap((claim) =>
      claim.status === 'ok' ? claim.items.map((item) => item.itemId) : [],
    );
    expect(new Set(itemIds).size).toBe(itemIds.length);
    // SKIP LOCKED may leave a device short; it never hands out more than exist.
    expect(itemIds.length).toBeLessThanOrEqual(120);
    expect(itemIds.length).toBeGreaterThan(0);
  });

  it('stops concurrent enqueues exactly at the per-grant cap', async () => {
    const prefill = CAPTURE_MAX_PENDING_PER_GRANT - 5;
    await prisma.$executeRaw`
      INSERT INTO capture_items (id, user_id, grant_id, ciphertext, task_id, created_at)
      SELECT 'cap-' || i, ${userId}, ${grantId}, 'x', 'cap-' || i, i
      FROM generate_series(1, ${prefill}) AS i`;

    const results = await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        enqueueCapture(userId, grantId, payload(`t${i}`)),
      ),
    );
    expect(results.filter((r) => r === 'queued')).toHaveLength(5);
    expect(results.filter((r) => r === 'queue_full')).toHaveLength(7);
  });
});
