import { TestBed } from '@angular/core/testing';
import { SyncImportFilterService } from './sync-import-filter.service';
import { OperationLogStoreService } from '../store/operation-log-store.service';
import { Operation, OpType } from '../operation.types';

describe('SyncImportFilterService', () => {
  let service: SyncImportFilterService;
  let opLogStoreSpy: jasmine.SpyObj<OperationLogStoreService>;

  // Helper to create operations with UUIDv7-style IDs (lexicographically sortable by time)
  const createOp = (partial: Partial<Operation>): Operation => ({
    id: '019afd68-0000-7000-0000-000000000000', // Default UUIDv7 format
    actionType: '[Test] Action',
    opType: OpType.Update,
    entityType: 'TASK',
    entityId: 'entity-1',
    payload: {},
    clientId: 'client-A',
    vectorClock: { clientA: 1 },
    timestamp: Date.now(),
    schemaVersion: 1,
    ...partial,
  });

  beforeEach(() => {
    opLogStoreSpy = jasmine.createSpyObj('OperationLogStoreService', [
      'getLatestFullStateOp',
    ]);
    // By default, no full-state ops in store
    opLogStoreSpy.getLatestFullStateOp.and.returnValue(Promise.resolve(undefined));

    TestBed.configureTestingModule({
      providers: [
        SyncImportFilterService,
        { provide: OperationLogStoreService, useValue: opLogStoreSpy },
      ],
    });

    service = TestBed.inject(SyncImportFilterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('filterOpsInvalidatedBySyncImport', () => {
    it('should return all ops as valid when no SYNC_IMPORT is present', async () => {
      const ops: Operation[] = [
        createOp({ id: '019afd68-0001-7000-0000-000000000000', opType: OpType.Update }),
        createOp({ id: '019afd68-0002-7000-0000-000000000000', opType: OpType.Create }),
        createOp({ id: '019afd68-0003-7000-0000-000000000000', opType: OpType.Delete }),
      ];

      const result = await service.filterOpsInvalidatedBySyncImport(ops);

      expect(result.validOps.length).toBe(3);
      expect(result.invalidatedOps.length).toBe(0);
    });

    it('should keep SYNC_IMPORT operation itself as valid', async () => {
      const syncImportOp = createOp({
        id: '019afd68-0050-7000-0000-000000000000',
        opType: OpType.SyncImport,
        clientId: 'client-B',
      });

      const result = await service.filterOpsInvalidatedBySyncImport([syncImportOp]);

      expect(result.validOps.length).toBe(1);
      expect(result.validOps[0].opType).toBe(OpType.SyncImport);
      expect(result.invalidatedOps.length).toBe(0);
    });

    it('should filter out ops from OTHER clients created BEFORE SYNC_IMPORT', async () => {
      const ops: Operation[] = [
        // Client A's op created BEFORE the import - LESS_THAN import's clock
        createOp({
          id: '019afd68-0001-7000-0000-000000000000',
          opType: OpType.Update,
          clientId: 'client-A',
          entityId: 'task-1',
          vectorClock: { clientA: 2 }, // LESS_THAN import's clock
        }),
        // Client B's SYNC_IMPORT with higher clock
        createOp({
          id: '019afd68-0050-7000-0000-000000000000',
          opType: OpType.SyncImport,
          clientId: 'client-B',
          entityType: 'ALL',
          vectorClock: { clientA: 5, clientB: 3 }, // Import has knowledge of clientA up to 5
        }),
      ];

      const result = await service.filterOpsInvalidatedBySyncImport(ops);

      // SYNC_IMPORT is valid, Client A's earlier op is invalidated (LESS_THAN)
      expect(result.validOps.length).toBe(1);
      expect(result.validOps[0].opType).toBe(OpType.SyncImport);
      expect(result.invalidatedOps.length).toBe(1);
      expect(result.invalidatedOps[0].clientId).toBe('client-A');
    });

    it('should filter pre-import ops from the SAME client as SYNC_IMPORT', async () => {
      const ops: Operation[] = [
        // Client B's op created BEFORE the import - LESS_THAN import's clock
        createOp({
          id: '019afd68-0001-7000-0000-000000000000',
          opType: OpType.Update,
          clientId: 'client-B',
          entityId: 'task-1',
          vectorClock: { clientB: 2 }, // LESS_THAN import's clock
        }),
        // Client B's SYNC_IMPORT
        createOp({
          id: '019afd68-0050-7000-0000-000000000000',
          opType: OpType.SyncImport,
          clientId: 'client-B',
          entityType: 'ALL',
          vectorClock: { clientB: 5 }, // Import's clock
        }),
        // Client B's ops after the import - GREATER_THAN import's clock
        createOp({
          id: '019afd68-0100-7000-0000-000000000000',
          opType: OpType.Create,
          clientId: 'client-B',
          entityId: 'task-2',
          vectorClock: { clientB: 6 }, // GREATER_THAN import's clock (B saw import first)
        }),
      ];

      const result = await service.filterOpsInvalidatedBySyncImport(ops);

      // Only SYNC_IMPORT and post-import ops should be valid
      expect(result.validOps.length).toBe(2);
      expect(result.validOps.map((op) => op.id)).toContain(
        '019afd68-0050-7000-0000-000000000000',
      ); // SYNC_IMPORT
      expect(result.validOps.map((op) => op.id)).toContain(
        '019afd68-0100-7000-0000-000000000000',
      ); // Post-import

      expect(result.invalidatedOps.length).toBe(1);
      expect(result.invalidatedOps[0].id).toBe('019afd68-0001-7000-0000-000000000000'); // Pre-import
    });

    it('should preserve ops from OTHER clients created AFTER SYNC_IMPORT (by vector clock)', async () => {
      const ops: Operation[] = [
        // Client B's SYNC_IMPORT
        createOp({
          id: '019afd68-0050-7000-0000-000000000000',
          opType: OpType.SyncImport,
          clientId: 'client-B',
          entityType: 'ALL',
          vectorClock: { clientB: 5 }, // Import's clock
        }),
        // Client A's op created AFTER seeing the import - GREATER_THAN
        createOp({
          id: '019afd68-0100-7000-0000-000000000000',
          opType: OpType.Update,
          clientId: 'client-A',
          entityId: 'task-1',
          vectorClock: { clientA: 1, clientB: 5 }, // A saw import (has B's clock), then created op
        }),
      ];

      const result = await service.filterOpsInvalidatedBySyncImport(ops);

      // Both should be valid - Client A's op was created after seeing the import
      expect(result.validOps.length).toBe(2);
      expect(result.invalidatedOps.length).toBe(0);
    });

    it('should handle BACKUP_IMPORT the same way as SYNC_IMPORT', async () => {
      const ops: Operation[] = [
        // Client A's op created BEFORE the backup import - LESS_THAN
        createOp({
          id: '019afd68-0001-7000-0000-000000000000',
          opType: OpType.Update,
          clientId: 'client-A',
          entityId: 'task-1',
          vectorClock: { clientA: 2 }, // LESS_THAN import's clock
        }),
        // Client B's BACKUP_IMPORT
        createOp({
          id: '019afd68-0050-7000-0000-000000000000',
          opType: OpType.BackupImport,
          clientId: 'client-B',
          entityType: 'ALL',
          vectorClock: { clientA: 5, clientB: 3 }, // Import dominates A's clock
        }),
      ];

      const result = await service.filterOpsInvalidatedBySyncImport(ops);

      expect(result.validOps.length).toBe(1);
      expect(result.validOps[0].opType).toBe(OpType.BackupImport);
      expect(result.invalidatedOps.length).toBe(1);
      expect(result.invalidatedOps[0].clientId).toBe('client-A');
    });

    it('should use the LATEST import when multiple imports exist', async () => {
      const ops: Operation[] = [
        // Client A's early op - CONCURRENT with latest import (no knowledge of imports)
        createOp({
          id: '019afd68-0001-7000-0000-000000000000',
          opType: OpType.Update,
          clientId: 'client-A',
          entityId: 'task-1',
          vectorClock: { clientA: 1 }, // CONCURRENT with latest import
        }),
        // First SYNC_IMPORT from Client B
        createOp({
          id: '019afd68-0010-7000-0000-000000000000',
          opType: OpType.SyncImport,
          clientId: 'client-B',
          entityType: 'ALL',
          vectorClock: { clientB: 1 },
        }),
        // Client A's op between the two imports - still CONCURRENT with latest
        createOp({
          id: '019afd68-0020-7000-0000-000000000000',
          opType: OpType.Update,
          clientId: 'client-A',
          entityId: 'task-2',
          vectorClock: { clientA: 2, clientB: 1 }, // Saw first import but CONCURRENT with second
        }),
        // Second SYNC_IMPORT from Client C (latest)
        createOp({
          id: '019afd68-0050-7000-0000-000000000000',
          opType: OpType.SyncImport,
          clientId: 'client-C',
          entityType: 'ALL',
          vectorClock: { clientB: 1, clientC: 1 }, // Latest import's clock
        }),
        // Client A's op after the latest import - GREATER_THAN (includes latest import's clock)
        createOp({
          id: '019afd68-0100-7000-0000-000000000000',
          opType: OpType.Update,
          clientId: 'client-A',
          entityId: 'task-3',
          vectorClock: { clientA: 3, clientB: 1, clientC: 1 }, // GREATER_THAN latest import
        }),
      ];

      const result = await service.filterOpsInvalidatedBySyncImport(ops);

      // Valid: both SYNC_IMPORTs, Client A's op after latest import
      // Invalid: Client A's two ops before the latest import
      expect(result.validOps.length).toBe(3);
      expect(result.validOps.map((op) => op.id)).toContain(
        '019afd68-0010-7000-0000-000000000000',
      ); // First import
      expect(result.validOps.map((op) => op.id)).toContain(
        '019afd68-0050-7000-0000-000000000000',
      ); // Second import
      expect(result.validOps.map((op) => op.id)).toContain(
        '019afd68-0100-7000-0000-000000000000',
      ); // After latest import
      expect(result.invalidatedOps.length).toBe(2);
    });

    it('should filter pre-import ops when SYNC_IMPORT was downloaded in a PREVIOUS sync cycle', async () => {
      // Set up the store to have a SYNC_IMPORT from a previous sync
      const existingSyncImport: Operation = {
        id: '019afd68-0050-7000-0000-000000000000',
        actionType: '[SP_ALL] Load(import) all data',
        opType: OpType.SyncImport,
        entityType: 'ALL',
        entityId: 'import-1',
        payload: { appDataComplete: {} },
        clientId: 'client-B',
        vectorClock: { clientB: 1 },
        timestamp: Date.now(),
        schemaVersion: 1,
      };

      opLogStoreSpy.getLatestFullStateOp.and.returnValue(
        Promise.resolve(existingSyncImport),
      );

      // These are OLD ops from Client A, created BEFORE the import
      const oldOpsFromClientA: Operation[] = [
        {
          id: '019afd60-0001-7000-0000-000000000000',
          actionType: '[Task] Update Task',
          opType: OpType.Update,
          entityType: 'TASK',
          entityId: 'task-1',
          payload: { title: 'Old title' },
          clientId: 'client-A',
          vectorClock: { clientA: 5 },
          timestamp: Date.now(),
          schemaVersion: 1,
        },
        {
          id: '019afd60-0002-7000-0000-000000000000',
          actionType: '[Task] Update Task',
          opType: OpType.Update,
          entityType: 'TASK',
          entityId: 'task-2',
          payload: { title: 'Another old title' },
          clientId: 'client-A',
          vectorClock: { clientA: 6 },
          timestamp: Date.now(),
          schemaVersion: 1,
        },
      ];

      const result = await service.filterOpsInvalidatedBySyncImport(oldOpsFromClientA);

      // Both ops should be invalidated (CONCURRENT - no knowledge of import)
      expect(result.invalidatedOps.length).toBe(2);
      expect(result.validOps.length).toBe(0);
      expect(opLogStoreSpy.getLatestFullStateOp).toHaveBeenCalled();
    });

    it('should keep post-import ops when SYNC_IMPORT was downloaded in a PREVIOUS sync cycle', async () => {
      const existingSyncImport: Operation = {
        id: '019afd68-0050-7000-0000-000000000000',
        actionType: '[SP_ALL] Load(import) all data',
        opType: OpType.SyncImport,
        entityType: 'ALL',
        entityId: 'import-1',
        payload: { appDataComplete: {} },
        clientId: 'client-B',
        vectorClock: { clientB: 1 },
        timestamp: Date.now(),
        schemaVersion: 1,
      };

      opLogStoreSpy.getLatestFullStateOp.and.returnValue(
        Promise.resolve(existingSyncImport),
      );

      // These ops are created AFTER the import - client A saw the import (includes clientB: 1)
      const newOpsFromClientA: Operation[] = [
        {
          id: '019afd70-0001-7000-0000-000000000000',
          actionType: '[Task] Update Task',
          opType: OpType.Update,
          entityType: 'TASK',
          entityId: 'task-1',
          payload: { title: 'New title' },
          clientId: 'client-A',
          vectorClock: { clientB: 1, clientA: 7 }, // GREATER_THAN import
          timestamp: Date.now(),
          schemaVersion: 1,
        },
      ];

      const result = await service.filterOpsInvalidatedBySyncImport(newOpsFromClientA);

      // Op should be valid because it has knowledge of the import
      expect(result.validOps.length).toBe(1);
      expect(result.invalidatedOps.length).toBe(0);
    });

    describe('vector clock based filtering', () => {
      it('should filter CONCURRENT ops (client had no knowledge of import)', async () => {
        const ops: Operation[] = [
          {
            id: '019afd70-0001-7000-0000-000000000000',
            actionType: '[Task] Update Task',
            opType: OpType.Update,
            entityType: 'TASK',
            entityId: 'task-1',
            payload: { title: 'Offline change' },
            clientId: 'client-B',
            vectorClock: { clientA: 2, clientB: 3 }, // CONCURRENT with import
            timestamp: Date.now(),
            schemaVersion: 1,
          },
          {
            id: '019afd68-0050-7000-0000-000000000000',
            actionType: '[SP_ALL] Load(import) all data',
            opType: OpType.SyncImport,
            entityType: 'ALL',
            entityId: 'import-1',
            payload: { appDataComplete: {} },
            clientId: 'client-A',
            vectorClock: { clientA: 5 },
            timestamp: Date.now(),
            schemaVersion: 1,
          },
        ];

        const result = await service.filterOpsInvalidatedBySyncImport(ops);

        expect(result.validOps.length).toBe(1);
        expect(result.validOps[0].opType).toBe(OpType.SyncImport);
        expect(result.invalidatedOps.length).toBe(1);
        expect(result.invalidatedOps[0].clientId).toBe('client-B');
      });

      it('should filter LESS_THAN ops (dominated by import)', async () => {
        const ops: Operation[] = [
          {
            id: '019afd60-0001-7000-0000-000000000000',
            actionType: '[Task] Update Task',
            opType: OpType.Update,
            entityType: 'TASK',
            entityId: 'task-1',
            payload: { title: 'Old change' },
            clientId: 'client-A',
            vectorClock: { clientA: 2 }, // LESS_THAN import's clock
            timestamp: Date.now(),
            schemaVersion: 1,
          },
          {
            id: '019afd68-0050-7000-0000-000000000000',
            actionType: '[SP_ALL] Load(import) all data',
            opType: OpType.SyncImport,
            entityType: 'ALL',
            entityId: 'import-1',
            payload: { appDataComplete: {} },
            clientId: 'client-B',
            vectorClock: { clientA: 5, clientB: 3 },
            timestamp: Date.now(),
            schemaVersion: 1,
          },
        ];

        const result = await service.filterOpsInvalidatedBySyncImport(ops);

        expect(result.validOps.length).toBe(1);
        expect(result.validOps[0].opType).toBe(OpType.SyncImport);
        expect(result.invalidatedOps.length).toBe(1);
      });

      it('should keep GREATER_THAN ops (created after seeing import)', async () => {
        const ops: Operation[] = [
          {
            id: '019afd68-0050-7000-0000-000000000000',
            actionType: '[SP_ALL] Load(import) all data',
            opType: OpType.SyncImport,
            entityType: 'ALL',
            entityId: 'import-1',
            payload: { appDataComplete: {} },
            clientId: 'client-A',
            vectorClock: { clientA: 5 },
            timestamp: Date.now(),
            schemaVersion: 1,
          },
          {
            id: '019afd70-0001-7000-0000-000000000000',
            actionType: '[Task] Update Task',
            opType: OpType.Update,
            entityType: 'TASK',
            entityId: 'task-1',
            payload: { title: 'Post-import change' },
            clientId: 'client-B',
            vectorClock: { clientA: 5, clientB: 1 }, // GREATER_THAN
            timestamp: Date.now(),
            schemaVersion: 1,
          },
        ];

        const result = await service.filterOpsInvalidatedBySyncImport(ops);

        expect(result.validOps.length).toBe(2);
        expect(result.invalidatedOps.length).toBe(0);
      });

      it('should keep EQUAL ops (same causal history as import)', async () => {
        const ops: Operation[] = [
          {
            id: '019afd68-0050-7000-0000-000000000000',
            actionType: '[SP_ALL] Load(import) all data',
            opType: OpType.SyncImport,
            entityType: 'ALL',
            entityId: 'import-1',
            payload: { appDataComplete: {} },
            clientId: 'client-A',
            vectorClock: { clientA: 5, clientB: 3 },
            timestamp: Date.now(),
            schemaVersion: 1,
          },
          {
            id: '019afd68-0051-7000-0000-000000000000',
            actionType: '[Task] Update Task',
            opType: OpType.Update,
            entityType: 'TASK',
            entityId: 'task-1',
            payload: { title: 'Same-clock change' },
            clientId: 'client-B',
            vectorClock: { clientA: 5, clientB: 3 }, // EQUAL to import
            timestamp: Date.now(),
            schemaVersion: 1,
          },
        ];

        const result = await service.filterOpsInvalidatedBySyncImport(ops);

        expect(result.validOps.length).toBe(2);
        expect(result.invalidatedOps.length).toBe(0);
      });

      it('should filter ops even if client clock was ahead (clock drift regression)', async () => {
        const ops: Operation[] = [
          {
            // UUIDv7 timestamp is AFTER the import (client clock was ahead!)
            id: '019afd80-0001-7000-0000-000000000000',
            actionType: '[Task] Update Task',
            opType: OpType.Update,
            entityType: 'TASK',
            entityId: 'task-1',
            payload: { title: 'Clock-drift change' },
            clientId: 'client-B',
            vectorClock: { clientA: 2, clientB: 3 }, // But vector clock shows no knowledge of import!
            timestamp: Date.now(),
            schemaVersion: 1,
          },
          {
            id: '019afd68-0050-7000-0000-000000000000',
            actionType: '[SP_ALL] Load(import) all data',
            opType: OpType.SyncImport,
            entityType: 'ALL',
            entityId: 'import-1',
            payload: { appDataComplete: {} },
            clientId: 'client-A',
            vectorClock: { clientA: 5 },
            timestamp: Date.now(),
            schemaVersion: 1,
          },
        ];

        const result = await service.filterOpsInvalidatedBySyncImport(ops);

        // Vector clock shows Client B had no knowledge of the import → FILTER
        expect(result.validOps.length).toBe(1);
        expect(result.validOps[0].opType).toBe(OpType.SyncImport);
        expect(result.invalidatedOps.length).toBe(1);
        expect(result.invalidatedOps[0].clientId).toBe('client-B');
      });

      it('should handle REPAIR operations the same as SYNC_IMPORT', async () => {
        const ops: Operation[] = [
          {
            id: '019afd60-0001-7000-0000-000000000000',
            actionType: '[Task] Update Task',
            opType: OpType.Update,
            entityType: 'TASK',
            entityId: 'task-1',
            payload: { title: 'Old change' },
            clientId: 'client-B',
            vectorClock: { clientA: 2, clientB: 3 }, // CONCURRENT with repair
            timestamp: Date.now(),
            schemaVersion: 1,
          },
          {
            id: '019afd68-0050-7000-0000-000000000000',
            actionType: '[OpLog] Repair',
            opType: OpType.Repair,
            entityType: 'ALL',
            entityId: 'repair-1',
            payload: { appDataComplete: {} },
            clientId: 'client-A',
            vectorClock: { clientA: 5 },
            timestamp: Date.now(),
            schemaVersion: 1,
          },
        ];

        const result = await service.filterOpsInvalidatedBySyncImport(ops);

        expect(result.validOps.length).toBe(1);
        expect(result.validOps[0].opType).toBe(OpType.Repair);
        expect(result.invalidatedOps.length).toBe(1);
      });
    });
  });
});
