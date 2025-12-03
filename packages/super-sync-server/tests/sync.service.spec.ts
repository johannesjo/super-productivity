import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initDb, getDb } from '../src/db';
import { initSyncService, getSyncService } from '../src/sync/sync.service';
import { Operation } from '../src/sync/sync.types';
import { uuidv7 } from 'uuidv7';

describe('SyncService', () => {
  const userId = 1;
  const clientId = 'test-device-1';

  beforeEach(() => {
    // Initialize in-memory database
    initDb('./data', true);
    const db = getDb();

    // Create a dummy user to satisfy Foreign Key constraints
    db.prepare(
      `
      INSERT INTO users (id, email, password_hash, is_verified, created_at)
      VALUES (?, 'test@test.com', 'hash', 1, ?)
    `,
    ).run(userId, Date.now());

    // Initialize service
    initSyncService();
  });

  it('should correctly upload operations', () => {
    const service = getSyncService();
    const op: Operation = {
      id: uuidv7(),
      clientId,
      actionType: 'ADD_TASK',
      opType: 'CRT',
      entityType: 'TASK',
      entityId: 'task-1',
      payload: { title: 'Test Task' },
      vectorClock: {},
      timestamp: Date.now(),
      schemaVersion: 1,
    };

    const results = service.uploadOps(userId, clientId, [op]);

    expect(results).toHaveLength(1);
    expect(results[0].accepted).toBe(true);
    expect(results[0].serverSeq).toBe(1);

    const latestSeq = service.getLatestSeq(userId);
    expect(latestSeq).toBe(1);
  });

  it('should reconstruct state from operations (snapshot)', () => {
    const service = getSyncService();

    // Op 1: Create Task
    const op1: Operation = {
      id: uuidv7(),
      clientId,
      actionType: 'ADD',
      opType: 'CRT',
      entityType: 'TASK',
      entityId: 't1',
      payload: { title: 'Task 1', done: false },
      vectorClock: {},
      timestamp: Date.now(),
      schemaVersion: 1,
    };

    // Op 2: Update Task
    const op2: Operation = {
      id: uuidv7(),
      clientId,
      actionType: 'UPDATE',
      opType: 'UPD',
      entityType: 'TASK',
      entityId: 't1',
      payload: { done: true },
      vectorClock: {},
      timestamp: Date.now() + 100,
      schemaVersion: 1,
    };

    service.uploadOps(userId, clientId, [op1, op2]);

    const snapshot = service.generateSnapshot(userId);

    expect(snapshot.serverSeq).toBe(2);

    const state = snapshot.state as any;
    expect(state.task).toBeDefined();
    expect(state.task.t1).toBeDefined();
    expect(state.task.t1.title).toBe('Task 1');
    expect(state.task.t1.done).toBe(true);
  });

  it('should use incremental snapshots', () => {
    const service = getSyncService();

    // Step 1: Initial State
    const op1: Operation = {
      id: uuidv7(),
      clientId,
      actionType: 'ADD',
      opType: 'CRT',
      entityType: 'NOTE',
      entityId: 'n1',
      payload: { text: 'Note 1' },
      vectorClock: {},
      timestamp: Date.now(),
      schemaVersion: 1,
    };
    service.uploadOps(userId, clientId, [op1]);

    // Generate first snapshot (caches it)
    const snap1 = service.generateSnapshot(userId);
    expect(snap1.serverSeq).toBe(1);
    expect((snap1.state as any).note.n1.text).toBe('Note 1');

    // Step 2: Add more operations
    const op2: Operation = {
      id: uuidv7(),
      clientId,
      actionType: 'ADD',
      opType: 'CRT',
      entityType: 'NOTE',
      entityId: 'n2',
      payload: { text: 'Note 2' },
      vectorClock: {},
      timestamp: Date.now(),
      schemaVersion: 1,
    };
    service.uploadOps(userId, clientId, [op2]);

    // Generate second snapshot
    // This should internally use the cached state from snap1 and apply op2
    const snap2 = service.generateSnapshot(userId);

    expect(snap2.serverSeq).toBe(2);
    const state = snap2.state as any;
    expect(state.note.n1.text).toBe('Note 1'); // Preserved
    expect(state.note.n2.text).toBe('Note 2'); // Added
  });

  it('should handle deletions in snapshots', () => {
    const service = getSyncService();

    // Create
    const op1: Operation = {
      id: uuidv7(),
      clientId,
      actionType: 'ADD',
      opType: 'CRT',
      entityType: 'TAG',
      entityId: 'tg1',
      payload: { title: 'Tag 1' },
      vectorClock: {},
      timestamp: Date.now(),
      schemaVersion: 1,
    };
    service.uploadOps(userId, clientId, [op1]);

    service.generateSnapshot(userId); // Checkpoint

    // Delete
    const op2: Operation = {
      id: uuidv7(),
      clientId,
      actionType: 'DEL',
      opType: 'DEL',
      entityType: 'TAG',
      entityId: 'tg1',
      payload: {},
      vectorClock: {},
      timestamp: Date.now(),
      schemaVersion: 1,
    };
    service.uploadOps(userId, clientId, [op2]);

    const snap = service.generateSnapshot(userId);
    const state = snap.state as any;

    expect(state.tag.tg1).toBeUndefined();
  });
});
