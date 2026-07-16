import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from 'uuidv7';
import { db, disconnectDb } from '../../src/db';
import { SyncService } from '../../src/sync/sync.service';
import type { Operation } from '../../src/sync/sync.types';

const describeWithDb = process.env.DATABASE_URL ? describe : describe.skip;

describeWithDb('two-device synchronization (PostgreSQL)', () => {
  const userId = 99995;
  const clientA = 'integration-device-a';
  const clientB = 'integration-device-b';
  const entityId = uuidv7();
  const service = new SyncService({ batchUpload: true });

  const operation = (
    clientId: string,
    opType: Operation['opType'],
    vectorClock: Operation['vectorClock'],
    title: string,
  ): Operation => ({
    id: uuidv7(),
    clientId,
    actionType: opType === 'CRT' ? '[Task] Add' : '[Task] Update',
    opType,
    entityType: 'TASK',
    entityId,
    payload: { title },
    vectorClock,
    timestamp: Date.now(),
    schemaVersion: 1,
  });

  beforeAll(async () => {
    await db.user.deleteMany({ where: { id: userId } });
    await db.user.create({
      data: {
        id: userId,
        email: `two-device-${Date.now()}@test.local`,
        isVerified: 1,
      },
    });
  });

  afterAll(async () => {
    await db.user.deleteMany({ where: { id: userId } });
    await disconnectDb();
  });

  it('round-trips causally ordered operations between two clients', async () => {
    const created = operation(clientA, 'CRT', { [clientA]: 1 }, 'Created on A');
    const [createResult] = await service.uploadOps(userId, clientA, [created]);

    expect(createResult).toMatchObject({ accepted: true, serverSeq: 1 });

    const downloadOnB = await service.getOpsSinceWithSeq(userId, 0, clientB);
    expect(downloadOnB.latestSeq).toBe(1);
    expect(downloadOnB.gapDetected).toBe(false);
    expect(downloadOnB.ops).toHaveLength(1);
    expect(downloadOnB.ops[0]).toMatchObject({
      serverSeq: 1,
      op: {
        id: created.id,
        clientId: clientA,
      },
    });

    const updated = operation(
      clientB,
      'UPD',
      { [clientA]: 1, [clientB]: 1 },
      'Updated on B',
    );
    const [updateResult] = await service.uploadOps(userId, clientB, [updated]);

    expect(updateResult).toMatchObject({ accepted: true, serverSeq: 2 });

    const downloadOnA = await service.getOpsSinceWithSeq(userId, 1, clientA);
    expect(downloadOnA.latestSeq).toBe(2);
    expect(downloadOnA.ops).toHaveLength(1);
    expect(downloadOnA.ops[0]).toMatchObject({
      serverSeq: 2,
      op: {
        id: updated.id,
        clientId: clientB,
        payload: { title: 'Updated on B' },
      },
    });
  });
});
