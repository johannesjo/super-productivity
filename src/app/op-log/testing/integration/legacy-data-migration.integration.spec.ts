import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { OperationLogMigrationService } from '../../store/operation-log-migration.service';
import { OperationLogStoreService } from '../../store/operation-log-store.service';
import { PfapiService } from '../../../pfapi/pfapi.service';
import { OpType } from '../../core/operation.types';
import { resetTestUuidCounter } from './helpers/test-client.helper';

/**
 * Integration tests for Legacy Data Migration.
 *
 * These tests verify the complete migration flow from 'pf' database
 * (legacy ModelCtrl caches) to the operation log system (SUP_OPS).
 *
 * Key scenarios tested:
 * 1. Fresh install - no migration needed
 * 2. Legacy data exists - Genesis operation created
 * 3. Orphan operations detected and cleared
 * 4. Snapshot already exists - migration skipped
 * 5. Data is read from ModelCtrls directly (not NgRx delegate)
 */
describe('Legacy Data Migration Integration', () => {
  let migrationService: OperationLogMigrationService;
  let opLogStore: OperationLogStoreService;
  let mockPfapiService: any;
  let mockMatDialog: jasmine.SpyObj<MatDialog>;

  beforeEach(async () => {
    // Create mock PfapiService that simulates the 'pf' database
    mockPfapiService = {
      pf: {
        getAllSyncModelDataFromModelCtrls: jasmine
          .createSpy('getAllSyncModelDataFromModelCtrls')
          .and.resolveTo({
            task: { ids: [], entities: {} },
            project: { ids: [], entities: {} },
            tag: { ids: [], entities: {} },
            note: { ids: [], entities: {} },
            taskRepeatCfg: { ids: [], entities: {} },
            simpleCounter: { ids: [], entities: {} },
            metric: { ids: [], entities: {} },
            globalConfig: { misc: { isDarkMode: false } },
          }),
        metaModel: {
          loadClientId: jasmine
            .createSpy('loadClientId')
            .and.resolveTo('test-migration-client'),
        },
      },
    };

    // Mock MatDialog
    mockMatDialog = jasmine.createSpyObj('MatDialog', ['open']);
    mockMatDialog.open.and.returnValue({
      afterClosed: () => of(true),
    } as MatDialogRef<any>);

    TestBed.configureTestingModule({
      providers: [
        OperationLogMigrationService,
        OperationLogStoreService,
        { provide: PfapiService, useValue: mockPfapiService },
        { provide: MatDialog, useValue: mockMatDialog },
      ],
    });

    migrationService = TestBed.inject(OperationLogMigrationService);
    opLogStore = TestBed.inject(OperationLogStoreService);

    await opLogStore.init();
    await opLogStore._clearAllDataForTesting();
    resetTestUuidCounter();
  });

  afterEach(async () => {
    await opLogStore._clearAllDataForTesting();
  });

  describe('Fresh Install', () => {
    it('should not create Genesis operation when no user data exists', async () => {
      // Default mock returns empty data
      await migrationService.checkAndMigrate();

      const ops = await opLogStore.getOpsAfterSeq(0);
      expect(ops.length).toBe(0);

      const snapshot = await opLogStore.loadStateCache();
      expect(snapshot).toBeNull();
    });

    it('should read data from ModelCtrls, not NgRx delegate', async () => {
      await migrationService.checkAndMigrate();

      // Verify the correct method was called
      expect(mockPfapiService.pf.getAllSyncModelDataFromModelCtrls).toHaveBeenCalled();
    });
  });

  describe('Legacy Data Migration', () => {
    it('should create Genesis operation when tasks exist', async () => {
      const legacyData = {
        task: {
          ids: ['task-1', 'task-2'],
          entities: {
            /* eslint-disable @typescript-eslint/naming-convention */
            'task-1': { id: 'task-1', title: 'Task 1' },
            'task-2': { id: 'task-2', title: 'Task 2' },
            /* eslint-enable @typescript-eslint/naming-convention */
          },
        },
        project: { ids: [], entities: {} },
        tag: { ids: [], entities: {} },
        globalConfig: { misc: {} },
      };
      mockPfapiService.pf.getAllSyncModelDataFromModelCtrls.and.resolveTo(legacyData);

      await migrationService.checkAndMigrate();

      // Should create Genesis operation
      const ops = await opLogStore.getOpsAfterSeq(0);
      expect(ops.length).toBe(1);
      expect(ops[0].op.actionType).toBe('[Migration] Genesis Import');
      expect(ops[0].op.entityType).toBe('MIGRATION');
      expect(ops[0].op.opType).toBe(OpType.Batch);
      expect(ops[0].op.payload).toEqual(legacyData);

      // Should create state cache
      const snapshot = await opLogStore.loadStateCache();
      expect(snapshot).toBeTruthy();
      expect(snapshot!.state).toEqual(legacyData);
      expect(snapshot!.lastAppliedOpSeq).toBe(1);
    });

    it('should include projects in Genesis operation when tasks exist', async () => {
      const legacyData = {
        task: {
          ids: ['task-1'],
          entities: {
            /* eslint-disable @typescript-eslint/naming-convention */
            'task-1': { id: 'task-1', title: 'Task 1' },
            /* eslint-enable @typescript-eslint/naming-convention */
          },
        },
        project: {
          ids: ['proj-1'],
          entities: {
            /* eslint-disable @typescript-eslint/naming-convention */
            'proj-1': { id: 'proj-1', title: 'Project 1' },
            /* eslint-enable @typescript-eslint/naming-convention */
          },
        },
        tag: { ids: [], entities: {} },
        globalConfig: { misc: {} },
      };
      mockPfapiService.pf.getAllSyncModelDataFromModelCtrls.and.resolveTo(legacyData);

      await migrationService.checkAndMigrate();

      const ops = await opLogStore.getOpsAfterSeq(0);
      expect(ops.length).toBe(1);
      expect(ops[0].op.entityType).toBe('MIGRATION');
      expect((ops[0].op.payload as typeof legacyData).project.ids).toContain('proj-1');
    });

    it('should not migrate when only non-task entity models have data', async () => {
      // Only notes have data (no tasks) - migration should NOT occur
      // because the service only checks for tasks to determine user data
      const legacyData = {
        task: { ids: [], entities: {} },
        project: { ids: [], entities: {} },
        tag: { ids: [], entities: {} },
        note: {
          ids: ['note-1'],
          entities: {
            /* eslint-disable @typescript-eslint/naming-convention */
            'note-1': { id: 'note-1', content: 'Test note' },
            /* eslint-enable @typescript-eslint/naming-convention */
          },
        },
        taskRepeatCfg: { ids: [], entities: {} },
        simpleCounter: { ids: [], entities: {} },
        metric: { ids: [], entities: {} },
        globalConfig: { misc: {} },
      };
      mockPfapiService.pf.getAllSyncModelDataFromModelCtrls.and.resolveTo(legacyData);

      await migrationService.checkAndMigrate();

      // Should NOT create any operations (no tasks = no migration)
      const ops = await opLogStore.getOpsAfterSeq(0);
      expect(ops.length).toBe(0);
    });
  });

  describe('Snapshot Already Exists', () => {
    it('should skip migration if snapshot already exists', async () => {
      // Pre-create a snapshot
      await opLogStore.saveStateCache({
        state: { task: { ids: ['existing'] } },
        lastAppliedOpSeq: 5,
        vectorClock: { client1: 5 },
        compactedAt: Date.now(),
      });

      const legacyData = {
        task: { ids: ['new-task'] },
      };
      mockPfapiService.pf.getAllSyncModelDataFromModelCtrls.and.resolveTo(legacyData);

      await migrationService.checkAndMigrate();

      // Should NOT call getAllSyncModelDataFromModelCtrls (early return)
      expect(
        mockPfapiService.pf.getAllSyncModelDataFromModelCtrls,
      ).not.toHaveBeenCalled();

      // Should NOT create any operations
      const ops = await opLogStore.getOpsAfterSeq(0);
      expect(ops.length).toBe(0);
    });
  });

  describe('Genesis Operation Already Exists', () => {
    it('should skip migration if Genesis operation exists but no snapshot', async () => {
      // Pre-create a Genesis operation (simulating snapshot loss)
      await opLogStore.append({
        id: 'genesis-existing',
        actionType: '[Migration] Genesis Import',
        opType: OpType.Batch,
        entityType: 'MIGRATION',
        entityId: '*',
        payload: { task: { ids: ['old-data'] } },
        clientId: 'oldClient',
        vectorClock: { oldClient: 1 },
        timestamp: Date.now() - 100000,
        schemaVersion: 1,
      });

      await migrationService.checkAndMigrate();

      // Should NOT call getAllSyncModelDataFromModelCtrls
      expect(
        mockPfapiService.pf.getAllSyncModelDataFromModelCtrls,
      ).not.toHaveBeenCalled();

      // Should still have only 1 operation (the existing genesis)
      const ops = await opLogStore.getOpsAfterSeq(0);
      expect(ops.length).toBe(1);
      expect(ops[0].op.id).toBe('genesis-existing');
    });

    it('should skip migration if Recovery operation exists', async () => {
      await opLogStore.append({
        id: 'recovery-existing',
        actionType: '[Recovery] Data Recovery',
        opType: OpType.Batch,
        entityType: 'RECOVERY',
        entityId: '*',
        payload: { task: { ids: ['recovered-data'] } },
        clientId: 'recoveryClient',
        vectorClock: { recoveryClient: 1 },
        timestamp: Date.now() - 100000,
        schemaVersion: 1,
      });

      await migrationService.checkAndMigrate();

      expect(
        mockPfapiService.pf.getAllSyncModelDataFromModelCtrls,
      ).not.toHaveBeenCalled();
    });
  });

  describe('Orphan Operations Handling', () => {
    it('should clear orphan operations and proceed with migration', async () => {
      // Pre-create orphan operations (e.g., from effects that ran before migration)
      await opLogStore.append({
        id: 'orphan-op-1',
        actionType: '[Task] Update Task',
        opType: OpType.Update,
        entityType: 'TASK',
        entityId: 'task-1',
        payload: { title: 'Updated' },
        clientId: 'orphanClient',
        vectorClock: { orphanClient: 1 },
        timestamp: Date.now() - 50000,
        schemaVersion: 1,
      });
      await opLogStore.append({
        id: 'orphan-op-2',
        actionType: '[Tag] Update Tag',
        opType: OpType.Update,
        entityType: 'TAG',
        entityId: 'tag-1',
        payload: { name: 'Updated Tag' },
        clientId: 'orphanClient',
        vectorClock: { orphanClient: 2 },
        timestamp: Date.now() - 40000,
        schemaVersion: 1,
      });

      // Set up legacy data
      const legacyData = {
        task: {
          ids: ['task-1'],
          entities: {
            /* eslint-disable @typescript-eslint/naming-convention */
            'task-1': { id: 'task-1', title: 'Original Task' },
            /* eslint-enable @typescript-eslint/naming-convention */
          },
        },
        project: { ids: [], entities: {} },
        tag: { ids: [], entities: {} },
        globalConfig: { misc: {} },
      };
      mockPfapiService.pf.getAllSyncModelDataFromModelCtrls.and.resolveTo(legacyData);

      await migrationService.checkAndMigrate();

      // Should have cleared orphan ops and created Genesis
      const ops = await opLogStore.getOpsAfterSeq(0);
      expect(ops.length).toBe(1);
      expect(ops[0].op.entityType).toBe('MIGRATION');
      expect(ops[0].op.actionType).toBe('[Migration] Genesis Import');

      // Orphan ops should be gone
      const orphanOp1 = ops.find((o) => o.op.id === 'orphan-op-1');
      const orphanOp2 = ops.find((o) => o.op.id === 'orphan-op-2');
      expect(orphanOp1).toBeUndefined();
      expect(orphanOp2).toBeUndefined();
    });

    it('should not clear operations if first op is Genesis', async () => {
      // Pre-create a Genesis operation followed by normal operations
      await opLogStore.append({
        id: 'genesis-valid',
        actionType: '[Migration] Genesis Import',
        opType: OpType.Batch,
        entityType: 'MIGRATION',
        entityId: '*',
        payload: { task: { ids: ['t1'] } },
        clientId: 'client1',
        vectorClock: { client1: 1 },
        timestamp: Date.now() - 100000,
        schemaVersion: 1,
      });
      await opLogStore.append({
        id: 'normal-op',
        actionType: '[Task] Update Task',
        opType: OpType.Update,
        entityType: 'TASK',
        entityId: 'task-1',
        payload: { title: 'Updated' },
        clientId: 'client1',
        vectorClock: { client1: 2 },
        timestamp: Date.now() - 50000,
        schemaVersion: 1,
      });

      await migrationService.checkAndMigrate();

      // Should NOT clear any operations
      const ops = await opLogStore.getOpsAfterSeq(0);
      expect(ops.length).toBe(2);
      expect(ops[0].op.id).toBe('genesis-valid');
      expect(ops[1].op.id).toBe('normal-op');
    });
  });

  describe('Vector Clock and Client ID', () => {
    it('should use correct client ID in Genesis operation', async () => {
      const legacyData = {
        task: { ids: ['t1'], entities: { t1: { id: 't1' } } },
      };
      mockPfapiService.pf.getAllSyncModelDataFromModelCtrls.and.resolveTo(legacyData);
      mockPfapiService.pf.metaModel.loadClientId.and.resolveTo('myUniqueClientId');

      await migrationService.checkAndMigrate();

      const ops = await opLogStore.getOpsAfterSeq(0);
      expect(ops[0].op.clientId).toBe('myUniqueClientId');
      expect(ops[0].op.vectorClock).toEqual({ myUniqueClientId: 1 });
    });
  });
});
