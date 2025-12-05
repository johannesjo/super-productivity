import { TestBed } from '@angular/core/testing';
import { OperationLogStoreService } from '../store/operation-log-store.service';
import { OpType } from '../operation.types';
import { resetTestUuidCounter } from './helpers/test-client.helper';
import { MockSyncServer } from './helpers/mock-sync-server.helper';
import { SimulatedClient } from './helpers/simulated-client.helper';

/**
 * Integration tests for sync scenarios from sync-scenarios.md.
 *
 * These tests simulate real sync workflows with multiple clients and a server.
 * They verify that operations end up in the correct state after sync.
 */
describe('Sync Scenarios Integration', () => {
  let storeService: OperationLogStoreService;
  let server: MockSyncServer;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [OperationLogStoreService],
    });
    storeService = TestBed.inject(OperationLogStoreService);

    await storeService.init();
    await storeService._clearAllDataForTesting();
    resetTestUuidCounter();

    server = new MockSyncServer();
  });

  describe('2. Two Client Scenarios (No Conflict)', () => {
    /**
     * Scenario 2.2: Both Clients Create Different Tasks
     *
     * Setup: A and B connected, empty server
     *
     * Actions:
     * 1. Client A creates "Task A", syncs
     * 2. Client B creates "Task B", syncs
     * 3. Client A syncs (download)
     * 4. Client B syncs (download)
     *
     * Expected: Both clients have both tasks, server has both ops
     */
    it('2.2 Both clients create different tasks', async () => {
      // Setup: Two clients sharing the same store (simulating shared DB)
      const clientA = new SimulatedClient('client-a-test', storeService);
      const clientB = new SimulatedClient('client-b-test', storeService);

      // Step 1: Client A creates "Task A" and syncs
      const opA = await clientA.createLocalOp(
        'TASK',
        'taskA',
        OpType.Create,
        '[Task] Add Task',
        { title: 'Task A' },
      );
      const syncResultA1 = await clientA.sync(server);
      expect(syncResultA1.uploaded).toBe(1);
      expect(syncResultA1.downloaded).toBe(0);

      // Verify server state after step 1
      expect(server.getAllOps().length).toBe(1);
      expect(server.getAllOps()[0].op.id).toBe(opA.id);

      // Step 2: Client B creates "Task B" and syncs
      const opB = await clientB.createLocalOp(
        'TASK',
        'taskB',
        OpType.Create,
        '[Task] Add Task',
        { title: 'Task B' },
      );
      const syncResultB1 = await clientB.sync(server);
      expect(syncResultB1.uploaded).toBe(1);
      // Client B should also download Client A's op
      expect(syncResultB1.downloaded).toBe(1);

      // Verify server state after step 2
      expect(server.getAllOps().length).toBe(2);

      // Step 3: Client A syncs (download)
      const syncResultA2 = await clientA.sync(server);
      expect(syncResultA2.uploaded).toBe(0); // Nothing new to upload
      expect(syncResultA2.downloaded).toBe(1); // Should get opB

      // Step 4: Client B syncs (download) - should be no-op
      const syncResultB2 = await clientB.sync(server);
      expect(syncResultB2.uploaded).toBe(0);
      expect(syncResultB2.downloaded).toBe(0); // Already has everything

      // === Verify Final State ===

      // Server should have both ops
      const serverOps = server.getAllOps();
      expect(serverOps.length).toBe(2);
      expect(serverOps.map((o) => o.op.entityId).sort()).toEqual(['taskA', 'taskB']);

      // Get all ops from the shared store
      const allOps = await storeService.getOpsAfterSeq(0);

      // Should have both ops
      expect(allOps.length).toBe(2);

      // Verify opA (created by A)
      const storedOpA = allOps.find((e) => e.op.id === opA.id);
      expect(storedOpA).toBeDefined();
      expect(storedOpA!.op.entityId).toBe('taskA');
      expect(storedOpA!.source).toBe('local');
      expect(storedOpA!.syncedAt).toBeDefined(); // Marked synced after upload

      // Verify opB (created by B, received as remote by A)
      const storedOpB = allOps.find((e) => e.op.id === opB.id);
      expect(storedOpB).toBeDefined();
      expect(storedOpB!.op.entityId).toBe('taskB');
      // Note: In shared store, opB was created locally by B,
      // but we're verifying the final state contains both
    });

    /**
     * Scenario 2.1: Client A Creates, Client B Downloads
     *
     * Setup: Client A and B, empty server
     *
     * Actions:
     * 1. Client A creates "Task 1", syncs
     * 2. Client B syncs (download)
     *
     * Expected:
     * - Client A Log: op1 with source=local, syncedAt=set
     * - Client B Log: op1 with source=remote, syncedAt=set
     * - Server: op1 present
     */
    it('2.1 Client A creates, Client B downloads', async () => {
      const clientA = new SimulatedClient('client-a-test', storeService);
      const clientB = new SimulatedClient('client-b-test', storeService);

      // Step 1: Client A creates and syncs
      const op1 = await clientA.createLocalOp(
        'TASK',
        'task1',
        OpType.Create,
        '[Task] Add Task',
        { title: 'Task 1' },
      );
      await clientA.sync(server);

      // Step 2: Client B syncs (download)
      const syncResult = await clientB.sync(server);
      expect(syncResult.uploaded).toBe(0);
      expect(syncResult.downloaded).toBe(1);

      // Verify server has op1
      expect(server.getAllOps().length).toBe(1);
      expect(server.getAllOps()[0].op.id).toBe(op1.id);

      // In our shared store model, we verify the op exists
      const hasOp = await storeService.hasOp(op1.id);
      expect(hasOp).toBe(true);

      // Verify the stored op
      const allOps = await storeService.getOpsAfterSeq(0);
      const storedOp = allOps.find((e) => e.op.id === op1.id);
      expect(storedOp).toBeDefined();
      expect(storedOp!.op.entityId).toBe('task1');
      expect(storedOp!.syncedAt).toBeDefined();
    });

    /**
     * Scenario 2.3: Client A Creates Parent, Client B Creates Subtask
     */
    it('2.3 Client A creates parent, Client B creates subtask', async () => {
      const clientA = new SimulatedClient('client-a-test', storeService);
      const clientB = new SimulatedClient('client-b-test', storeService);

      // Step 1: Client A creates parent task and syncs
      const parentOp = await clientA.createLocalOp(
        'TASK',
        'parent1',
        OpType.Create,
        '[Task] Add Task',
        { title: 'Parent 1', subTaskIds: [] },
      );
      await clientA.sync(server);

      // Step 2: Client B syncs (downloads parent)
      await clientB.sync(server);

      // Verify B has the parent
      expect(await clientB.hasOp(parentOp.id)).toBe(true);

      // Step 3: Client B creates subtask and syncs
      const subtaskOp = await clientB.createLocalOp(
        'TASK',
        'sub1',
        OpType.Create,
        '[Task] Add Task',
        { title: 'Subtask 1', parentId: 'parent1' },
      );
      await clientB.sync(server);

      // Verify server has both ops
      expect(server.getAllOps().length).toBe(2);

      // Verify subtask references parent
      const serverSubtaskOp = server.getAllOps().find((o) => o.op.entityId === 'sub1');
      expect(serverSubtaskOp).toBeDefined();
      expect((serverSubtaskOp!.op.payload as any).parentId).toBe('parent1');

      // Step 4: Client A syncs to get the subtask
      const syncResultA = await clientA.sync(server);
      expect(syncResultA.downloaded).toBe(1);
      expect(await clientA.hasOp(subtaskOp.id)).toBe(true);
    });
  });

  describe('1. Single Client Scenarios', () => {
    /**
     * Scenario 1.1: Create Task → Sync → Verify Server
     */
    it('1.1 Create task and sync to server', async () => {
      const clientA = new SimulatedClient('client-a-test', storeService);

      // Create task
      const op1 = await clientA.createLocalOp(
        'TASK',
        'task1',
        OpType.Create,
        '[Task] Add Task',
        { title: 'Task 1' },
      );

      // Sync
      const syncResult = await clientA.sync(server);
      expect(syncResult.uploaded).toBe(1);

      // Verify server
      const serverOps = server.getAllOps();
      expect(serverOps.length).toBe(1);
      expect(serverOps[0].op.id).toBe(op1.id);
      expect(serverOps[0].op.entityType).toBe('TASK');
      expect(serverOps[0].op.opType).toBe(OpType.Create);

      // Verify client log
      const allOps = await storeService.getOpsAfterSeq(0);
      const storedOp = allOps.find((e) => e.op.id === op1.id);
      expect(storedOp!.syncedAt).toBeDefined();
    });

    /**
     * Scenario 1.2: Create Task with Subtasks → Sync
     */
    it('1.2 Create task with subtasks and sync', async () => {
      const clientA = new SimulatedClient('client-a-test', storeService);

      // Create parent
      await clientA.createLocalOp('TASK', 'parent1', OpType.Create, '[Task] Add Task', {
        title: 'Parent',
        subTaskIds: ['sub1', 'sub2'],
      });

      // Create subtasks
      await clientA.createLocalOp('TASK', 'sub1', OpType.Create, '[Task] Add Task', {
        title: 'Subtask 1',
        parentId: 'parent1',
      });

      await clientA.createLocalOp('TASK', 'sub2', OpType.Create, '[Task] Add Task', {
        title: 'Subtask 2',
        parentId: 'parent1',
      });

      // Sync all
      const syncResult = await clientA.sync(server);
      expect(syncResult.uploaded).toBe(3);

      // Verify server has all 3 ops
      const serverOps = server.getAllOps();
      expect(serverOps.length).toBe(3);

      const entityIds = serverOps.map((o) => o.op.entityId).sort();
      expect(entityIds).toEqual(['parent1', 'sub1', 'sub2']);
    });

    /**
     * Scenario 1.3: Update Task → Sync
     */
    it('1.3 Update task and sync', async () => {
      const clientA = new SimulatedClient('client-a-test', storeService);

      // Create
      await clientA.createLocalOp('TASK', 'task1', OpType.Create, '[Task] Add Task', {
        title: 'Task 1',
      });

      // Sync create
      await clientA.sync(server);

      // Update
      await clientA.createLocalOp('TASK', 'task1', OpType.Update, '[Task] Update Task', {
        title: 'Task 1 Updated',
      });

      // Sync update
      const syncResult = await clientA.sync(server);
      expect(syncResult.uploaded).toBe(1);

      // Verify server has both ops
      const serverOps = server.getAllOps();
      expect(serverOps.length).toBe(2);

      // Verify order (CREATE before UPDATE)
      expect(serverOps[0].op.opType).toBe(OpType.Create);
      expect(serverOps[1].op.opType).toBe(OpType.Update);
    });

    /**
     * Scenario 1.4: Delete Task → Sync
     */
    it('1.4 Delete task and sync', async () => {
      const clientA = new SimulatedClient('client-a-test', storeService);

      // Create
      await clientA.createLocalOp('TASK', 'task1', OpType.Create, '[Task] Add Task', {
        title: 'Task 1',
      });
      await clientA.sync(server);

      // Delete
      await clientA.createLocalOp(
        'TASK',
        'task1',
        OpType.Delete,
        '[Task] Delete Task',
        {},
      );
      await clientA.sync(server);

      // Verify server has both ops with DELETE having higher seq
      const serverOps = server.getAllOps();
      expect(serverOps.length).toBe(2);

      const createOp = serverOps.find((o) => o.op.opType === OpType.Create)!;
      const deleteOp = serverOps.find((o) => o.op.opType === OpType.Delete)!;
      expect(deleteOp.serverSeq).toBeGreaterThan(createOp.serverSeq);
    });
  });

  describe('5. Edge Cases', () => {
    /**
     * Scenario 5.1: Duplicate Op Received
     */
    it('5.1 Duplicate op is not stored twice', async () => {
      const clientA = new SimulatedClient('client-a-test', storeService);
      const clientB = new SimulatedClient('client-b-test', storeService);

      // Client A creates and syncs
      const op1 = await clientA.createLocalOp(
        'TASK',
        'task1',
        OpType.Create,
        '[Task] Add Task',
        { title: 'Task 1' },
      );
      await clientA.sync(server);

      // Client B syncs twice - should only store once
      await clientB.sync(server);
      await clientB.sync(server);

      // Verify only one entry in store
      const allOps = await storeService.getOpsAfterSeq(0);
      const matchingOps = allOps.filter((e) => e.op.id === op1.id);
      expect(matchingOps.length).toBe(1);
    });

    /**
     * Scenario 5.3: Empty Sync
     */
    it('5.3 Empty sync has no effect', async () => {
      const clientA = new SimulatedClient('client-a-test', storeService);

      // Sync with nothing to sync
      const syncResult = await clientA.sync(server);
      expect(syncResult.uploaded).toBe(0);
      expect(syncResult.downloaded).toBe(0);

      // Verify no ops
      expect(server.getAllOps().length).toBe(0);
      expect((await storeService.getOpsAfterSeq(0)).length).toBe(0);
    });
  });
});
