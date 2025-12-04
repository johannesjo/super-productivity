import { TestBed } from '@angular/core/testing';
import { OperationLogStoreService } from '../store/operation-log-store.service';
import { VectorClockService } from '../sync/vector-clock.service';
import { OpType } from '../operation.types';
import {
  compareVectorClocks,
  VectorClockComparison,
} from '../../../../pfapi/api/util/vector-clock';
import { TestClient, resetTestUuidCounter } from './helpers/test-client.helper';
import {
  createTaskOperation,
  createProjectOperation,
} from './helpers/operation-factory.helper';

/**
 * Integration tests for multi-client synchronization scenarios.
 *
 * These tests verify:
 * - Non-conflicting operations from multiple clients merge correctly
 * - Conflict detection works when clients edit the same entity
 * - Vector clocks converge correctly across 3+ clients
 * - Fresh client sync scenarios work properly
 * - Stale and duplicate operations are handled correctly
 *
 * Tests use real IndexedDB (via OperationLogStoreService) for realistic behavior.
 */
describe('Multi-Client Sync Integration', () => {
  let storeService: OperationLogStoreService;
  let vectorClockService: VectorClockService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [OperationLogStoreService, VectorClockService],
    });
    storeService = TestBed.inject(OperationLogStoreService);
    vectorClockService = TestBed.inject(VectorClockService);

    await storeService.init();
    await storeService._clearAllDataForTesting();
    resetTestUuidCounter();
  });

  describe('Non-conflicting concurrent edits', () => {
    it('should store operations from two clients editing different entities', async () => {
      const clientA = new TestClient('client-a-test');
      const clientB = new TestClient('client-b-test');

      // Client A creates task-1
      const opA = createTaskOperation(clientA, 'task-1', OpType.Create, {
        title: 'Task A',
      });
      await storeService.append(opA, 'local');

      // Client B creates task-2 (independent, not a conflict)
      const opB = createTaskOperation(clientB, 'task-2', OpType.Create, {
        title: 'Task B',
      });
      await storeService.append(opB, 'remote');

      const ops = await storeService.getOpsAfterSeq(0);
      expect(ops.length).toBe(2);
      expect(ops[0].op.entityId).toBe('task-1');
      expect(ops[1].op.entityId).toBe('task-2');
    });

    it('should merge vector clocks from non-conflicting operations', async () => {
      const clientA = new TestClient('client-a-test');
      const clientB = new TestClient('client-b-test');

      // Client A creates operation
      const opA = createTaskOperation(clientA, 'task-1', OpType.Create, {
        title: 'Task A',
      });
      await storeService.append(opA, 'local');

      // Client B creates operation
      const opB = createTaskOperation(clientB, 'task-2', OpType.Create, {
        title: 'Task B',
      });
      await storeService.append(opB, 'remote');

      // Get merged vector clock
      const currentClock = await vectorClockService.getCurrentVectorClock();

      // Both clients should be represented
      expect(currentClock['client-a-test']).toBe(1);
      expect(currentClock['client-b-test']).toBe(1);
    });

    it('should handle interleaved operations from multiple clients', async () => {
      const clientA = new TestClient('client-a-test');
      const clientB = new TestClient('client-b-test');

      // Interleaved operations on different entities
      const op1 = createTaskOperation(clientA, 'task-1', OpType.Create, { title: 'A1' });
      const op2 = createTaskOperation(clientB, 'task-2', OpType.Create, { title: 'B1' });
      const op3 = createTaskOperation(clientA, 'task-3', OpType.Create, { title: 'A2' });
      const op4 = createTaskOperation(clientB, 'task-4', OpType.Create, { title: 'B2' });

      await storeService.append(op1, 'local');
      await storeService.append(op2, 'remote');
      await storeService.append(op3, 'local');
      await storeService.append(op4, 'remote');

      const ops = await storeService.getOpsAfterSeq(0);
      expect(ops.length).toBe(4);

      // Verify sequence is preserved
      expect(ops[0].seq).toBeLessThan(ops[1].seq);
      expect(ops[1].seq).toBeLessThan(ops[2].seq);
      expect(ops[2].seq).toBeLessThan(ops[3].seq);
    });
  });

  describe('Conflict detection (same entity)', () => {
    it('should detect concurrent edits by vector clock comparison', async () => {
      const clientA = new TestClient('client-a-test');
      const clientB = new TestClient('client-b-test');

      // Both clients start from "no knowledge of each other"
      // Client A edits task-1
      const opA = createTaskOperation(clientA, 'task-1', OpType.Update, {
        title: 'Title from A',
      });

      // Client B (without knowledge of A's change) also edits task-1
      const opB = createTaskOperation(clientB, 'task-1', OpType.Update, {
        title: 'Title from B',
      });

      // Vector clocks should be concurrent (neither dominates)
      const comparison = compareVectorClocks(opA.vectorClock, opB.vectorClock);
      expect(comparison).toBe(VectorClockComparison.CONCURRENT);
    });

    it('should store conflicting operations for later resolution', async () => {
      const clientA = new TestClient('client-a-test');
      const clientB = new TestClient('client-b-test');

      const opA = createTaskOperation(clientA, 'task-1', OpType.Update, {
        title: 'Title from A',
      });
      await storeService.append(opA, 'local');

      const opB = createTaskOperation(clientB, 'task-1', OpType.Update, {
        title: 'Title from B',
      });
      await storeService.append(opB, 'remote');

      const ops = await storeService.getOpsAfterSeq(0);
      expect(ops.length).toBe(2);

      // Both ops affecting same entity should be stored
      expect(ops[0].op.entityId).toBe('task-1');
      expect(ops[1].op.entityId).toBe('task-1');
    });

    it('should group operations by entity for conflict detection', async () => {
      const clientA = new TestClient('client-a-test');
      const clientB = new TestClient('client-b-test');

      // Multiple ops from both clients on same entity
      await storeService.append(
        createTaskOperation(clientA, 'task-1', OpType.Update, { title: 'A1' }),
        'local',
      );
      await storeService.append(
        createTaskOperation(clientA, 'task-1', OpType.Update, { title: 'A2' }),
        'local',
      );
      await storeService.append(
        createTaskOperation(clientB, 'task-1', OpType.Update, { title: 'B1' }),
        'remote',
      );

      const unsyncedByEntity = await storeService.getUnsyncedByEntity();
      const task1Ops = unsyncedByEntity.get('TASK:task-1');

      expect(task1Ops).toBeDefined();
      expect(task1Ops!.length).toBe(2); // Only unsynced local ops
    });
  });

  describe('Three-client vector clock convergence', () => {
    it('should correctly merge clocks in A -> B -> C chain', async () => {
      const clientA = new TestClient('client-a-test');
      const clientB = new TestClient('client-b-test');
      const clientC = new TestClient('client-c-test');

      // A creates operation
      const opA = createTaskOperation(clientA, 'task-1', OpType.Create, {
        title: 'From A',
      });
      await storeService.append(opA, 'local');

      // B receives A's op and creates its own
      clientB.mergeRemoteClock(opA.vectorClock);
      const opB = createTaskOperation(clientB, 'task-2', OpType.Create, {
        title: 'From B',
      });
      await storeService.append(opB, 'remote');

      // C receives both A and B's ops and creates its own
      clientC.mergeRemoteClock(opA.vectorClock);
      clientC.mergeRemoteClock(opB.vectorClock);
      const opC = createTaskOperation(clientC, 'task-3', OpType.Create, {
        title: 'From C',
      });
      await storeService.append(opC, 'remote');

      // Get final merged clock from store
      const finalClock = await vectorClockService.getCurrentVectorClock();

      // All three clients should be represented
      expect(finalClock['client-a-test']).toBe(1);
      expect(finalClock['client-b-test']).toBe(1);
      expect(finalClock['client-c-test']).toBe(1);

      // C's clock should dominate both A and B
      expect(compareVectorClocks(opC.vectorClock, opA.vectorClock)).toBe(
        VectorClockComparison.GREATER_THAN,
      );
      expect(compareVectorClocks(opC.vectorClock, opB.vectorClock)).toBe(
        VectorClockComparison.GREATER_THAN,
      );
    });

    it('should detect concurrent operations from clients without shared knowledge', async () => {
      const clientA = new TestClient('client-a-test');
      const clientB = new TestClient('client-b-test');
      const clientC = new TestClient('client-c-test');

      // A creates op (knows nothing)
      const opA = createTaskOperation(clientA, 'task-1', OpType.Update, { field: 'a' });

      // B creates op (knows nothing)
      const opB = createTaskOperation(clientB, 'task-1', OpType.Update, { field: 'b' });

      // C creates op (knows nothing)
      const opC = createTaskOperation(clientC, 'task-1', OpType.Update, { field: 'c' });

      // All three are concurrent with each other
      expect(compareVectorClocks(opA.vectorClock, opB.vectorClock)).toBe(
        VectorClockComparison.CONCURRENT,
      );
      expect(compareVectorClocks(opB.vectorClock, opC.vectorClock)).toBe(
        VectorClockComparison.CONCURRENT,
      );
      expect(compareVectorClocks(opA.vectorClock, opC.vectorClock)).toBe(
        VectorClockComparison.CONCURRENT,
      );
    });
  });

  describe('Fresh client sync', () => {
    it('should accept all remote operations when client has no local state', async () => {
      const remoteClient = new TestClient('remote-client');

      // Clear local state - fresh client
      await storeService._clearAllDataForTesting();

      // Receive batch of remote operations (simulating initial sync)
      const remoteOps = [
        createTaskOperation(remoteClient, 'task-1', OpType.Create, { title: 'Task 1' }),
        createTaskOperation(remoteClient, 'task-2', OpType.Create, { title: 'Task 2' }),
        createTaskOperation(remoteClient, 'task-3', OpType.Create, { title: 'Task 3' }),
      ];

      for (const op of remoteOps) {
        await storeService.append(op, 'remote');
      }

      // All operations should be stored
      const ops = await storeService.getOpsAfterSeq(0);
      expect(ops.length).toBe(3);

      // All should be marked as remote
      ops.forEach((entry) => {
        expect(entry.source).toBe('remote');
        expect(entry.syncedAt).toBeDefined();
      });
    });

    it('should build correct vector clock from only remote operations', async () => {
      const remoteClient = new TestClient('remote-client');

      await storeService._clearAllDataForTesting();

      const op1 = createTaskOperation(remoteClient, 'task-1', OpType.Create, {
        title: '1',
      });
      const op2 = createTaskOperation(remoteClient, 'task-2', OpType.Create, {
        title: '2',
      });

      await storeService.append(op1, 'remote');
      await storeService.append(op2, 'remote');

      const currentClock = await vectorClockService.getCurrentVectorClock();
      expect(currentClock['remote-client']).toBe(2);
    });
  });

  describe('Stale operation handling', () => {
    it('should identify stale operations via vector clock comparison', async () => {
      const clientA = new TestClient('client-a-test');

      // Local state has progressed
      const op1 = createTaskOperation(clientA, 'task-1', OpType.Create, { title: '1' });
      const op2 = createTaskOperation(clientA, 'task-1', OpType.Update, { title: '2' });
      const op3 = createTaskOperation(clientA, 'task-1', OpType.Update, { title: '3' });

      await storeService.append(op1, 'local');
      await storeService.append(op2, 'local');
      await storeService.append(op3, 'local');

      // Simulate receiving an old/stale operation (lower vector clock)
      const staleOp = { ...op1 }; // Same as first op

      // Compare stale op against current state
      const currentClock = await vectorClockService.getCurrentVectorClock();
      const comparison = compareVectorClocks(staleOp.vectorClock, currentClock);

      // Stale op should be dominated by current state
      expect(comparison).toBe(VectorClockComparison.LESS_THAN);
    });
  });

  describe('Duplicate operation handling', () => {
    it('should detect duplicate operations by ID', async () => {
      const client = new TestClient('client-test');

      const op = createTaskOperation(client, 'task-1', OpType.Create, { title: 'Test' });
      await storeService.append(op, 'local');

      // Check if operation exists
      const hasOp = await storeService.hasOp(op.id);
      expect(hasOp).toBe(true);

      // Non-existent operation
      const hasNonExistent = await storeService.hasOp('non-existent-id');
      expect(hasNonExistent).toBe(false);
    });

    it('should track all applied operation IDs', async () => {
      const clientA = new TestClient('client-a-test');
      const clientB = new TestClient('client-b-test');

      const opA = createTaskOperation(clientA, 'task-1', OpType.Create, { title: 'A' });
      const opB = createTaskOperation(clientB, 'task-2', OpType.Create, { title: 'B' });

      await storeService.append(opA, 'local');
      await storeService.append(opB, 'remote');

      const appliedIds = await storeService.getAppliedOpIds();
      expect(appliedIds.has(opA.id)).toBe(true);
      expect(appliedIds.has(opB.id)).toBe(true);
      expect(appliedIds.size).toBe(2);
    });
  });

  describe('Entity frontier tracking', () => {
    it('should track per-entity vector clocks', async () => {
      const clientA = new TestClient('client-a-test');
      const clientB = new TestClient('client-b-test');

      // Client A modifies task-1 twice
      await storeService.append(
        createTaskOperation(clientA, 'task-1', OpType.Update, { v: 1 }),
        'local',
      );
      await storeService.append(
        createTaskOperation(clientA, 'task-1', OpType.Update, { v: 2 }),
        'local',
      );

      // Client B modifies task-2
      await storeService.append(
        createTaskOperation(clientB, 'task-2', OpType.Create, { title: 'B' }),
        'remote',
      );

      const frontier = await vectorClockService.getEntityFrontier();

      // task-1 should show A's latest clock
      // eslint-disable-next-line @typescript-eslint/naming-convention
      expect(frontier.get('TASK:task-1')).toEqual({ 'client-a-test': 2 });
      // task-2 should show B's clock
      // eslint-disable-next-line @typescript-eslint/naming-convention
      expect(frontier.get('TASK:task-2')).toEqual({ 'client-b-test': 1 });
    });

    it('should use frontier for fine-grained conflict detection', async () => {
      const clientA = new TestClient('client-a-test');
      const clientB = new TestClient('client-b-test');

      // A modifies task-1
      const opA = createTaskOperation(clientA, 'task-1', OpType.Update, { from: 'A' });
      await storeService.append(opA, 'local');

      // Get frontier for task-1
      const frontier = await vectorClockService.getEntityFrontier('TASK');
      const task1Clock = frontier.get('TASK:task-1');

      // B's op on same entity without knowledge of A
      const opB = createTaskOperation(clientB, 'task-1', OpType.Update, { from: 'B' });

      // Compare B's clock against entity frontier
      const comparison = compareVectorClocks(opB.vectorClock, task1Clock!);
      expect(comparison).toBe(VectorClockComparison.CONCURRENT);
    });
  });

  describe('Cross-entity type operations', () => {
    it('should handle operations across different entity types', async () => {
      const client = new TestClient('client-test');

      const taskOp = createTaskOperation(client, 'task-1', OpType.Create, {
        title: 'Task',
      });
      const projectOp = createProjectOperation(client, 'proj-1', OpType.Create, {
        title: 'Project',
      });

      await storeService.append(taskOp, 'local');
      await storeService.append(projectOp, 'local');

      const frontier = await vectorClockService.getEntityFrontier();

      expect(frontier.get('TASK:task-1')).toBeDefined();
      expect(frontier.get('PROJECT:proj-1')).toBeDefined();
    });
  });
});
