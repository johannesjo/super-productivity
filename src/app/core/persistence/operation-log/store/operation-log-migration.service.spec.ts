import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { OperationLogMigrationService } from './operation-log-migration.service';
import { OperationLogStoreService } from './operation-log-store.service';
import { PfapiService } from '../../../../pfapi/pfapi.service';
import { OpLog } from '../../../log';
import { OpType } from '../operation.types';

describe('OperationLogMigrationService', () => {
  let service: OperationLogMigrationService;
  let mockOpLogStore: jasmine.SpyObj<OperationLogStoreService>;
  let mockPfapiService: any;
  let mockMatDialog: jasmine.SpyObj<MatDialog>;

  beforeEach(() => {
    // Mock OperationLogStoreService
    mockOpLogStore = jasmine.createSpyObj('OperationLogStoreService', [
      'getLastSeq',
      'loadStateCache',
      'getOpsAfterSeq',
      'deleteOpsWhere',
      'append',
      'saveStateCache',
    ]);

    // Mock PfapiService with deep structure
    mockPfapiService = {
      pf: {
        getAllSyncModelDataFromModelCtrls: jasmine.createSpy(
          'getAllSyncModelDataFromModelCtrls',
        ),
        metaModel: {
          loadClientId: jasmine.createSpy('loadClientId'),
        },
      },
    };

    // Mock MatDialog
    mockMatDialog = jasmine.createSpyObj('MatDialog', ['open']);
    mockMatDialog.open.and.returnValue({
      afterClosed: () => of(true),
    } as MatDialogRef<any>);

    // Spy on OpLog
    spyOn(OpLog, 'normal');
    spyOn(OpLog, 'warn');
    spyOn(OpLog, 'error');

    TestBed.configureTestingModule({
      providers: [
        OperationLogMigrationService,
        { provide: OperationLogStoreService, useValue: mockOpLogStore },
        { provide: PfapiService, useValue: mockPfapiService },
        { provide: MatDialog, useValue: mockMatDialog },
      ],
    });
    service = TestBed.inject(OperationLogMigrationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('checkAndMigrate', () => {
    describe('when state cache (snapshot) exists', () => {
      it('should skip migration if snapshot already exists', async () => {
        mockOpLogStore.loadStateCache.and.resolveTo({
          state: { task: { ids: ['t1'] } },
          lastAppliedOpSeq: 5,
          vectorClock: { client1: 5 },
          compactedAt: Date.now(),
        });

        await service.checkAndMigrate();

        expect(mockOpLogStore.loadStateCache).toHaveBeenCalled();
        expect(mockOpLogStore.getOpsAfterSeq).not.toHaveBeenCalled();
        expect(
          mockPfapiService.pf.getAllSyncModelDataFromModelCtrls,
        ).not.toHaveBeenCalled();
      });
    });

    describe('when no snapshot exists but operations exist', () => {
      beforeEach(() => {
        mockOpLogStore.loadStateCache.and.resolveTo(null);
      });

      it('should skip migration if Genesis operation already exists', async () => {
        mockOpLogStore.getOpsAfterSeq.and.resolveTo([
          {
            seq: 1,
            op: {
              id: 'genesis-op',
              entityType: 'MIGRATION',
              actionType: '[Migration] Genesis Import',
              opType: OpType.Batch,
              clientId: 'client1',
              vectorClock: { client1: 1 },
              timestamp: Date.now(),
              payload: { task: { ids: ['t1'] } },
              schemaVersion: 1,
            },
            appliedAt: Date.now(),
            source: 'local',
          },
        ]);

        await service.checkAndMigrate();

        expect(mockOpLogStore.loadStateCache).toHaveBeenCalled();
        expect(mockOpLogStore.getOpsAfterSeq).toHaveBeenCalledWith(0);
        expect(mockOpLogStore.deleteOpsWhere).not.toHaveBeenCalled();
        expect(
          mockPfapiService.pf.getAllSyncModelDataFromModelCtrls,
        ).not.toHaveBeenCalled();
        expect(OpLog.normal).toHaveBeenCalledWith(
          jasmine.stringContaining('Genesis operation found'),
        );
      });

      it('should skip migration if Recovery operation already exists', async () => {
        mockOpLogStore.getOpsAfterSeq.and.resolveTo([
          {
            seq: 1,
            op: {
              id: 'recovery-op',
              entityType: 'RECOVERY',
              actionType: '[Recovery] Data Recovery Import',
              opType: OpType.Batch,
              clientId: 'client1',
              vectorClock: { client1: 1 },
              timestamp: Date.now(),
              payload: { task: { ids: ['t1'] } },
              schemaVersion: 1,
            },
            appliedAt: Date.now(),
            source: 'local',
          },
        ]);

        await service.checkAndMigrate();

        expect(mockOpLogStore.deleteOpsWhere).not.toHaveBeenCalled();
        expect(
          mockPfapiService.pf.getAllSyncModelDataFromModelCtrls,
        ).not.toHaveBeenCalled();
      });

      it('should clear orphan operations and proceed with migration', async () => {
        // Orphan operations (not Genesis/Recovery)
        mockOpLogStore.getOpsAfterSeq.and.resolveTo([
          {
            seq: 1,
            op: {
              id: 'orphan-op-1',
              entityType: 'TASK',
              actionType: '[Task] Update Task',
              opType: OpType.Update,
              clientId: 'client1',
              vectorClock: { client1: 1 },
              timestamp: Date.now(),
              payload: { id: 't1', title: 'Test' },
              schemaVersion: 1,
            },
            appliedAt: Date.now(),
            source: 'local',
          },
          {
            seq: 2,
            op: {
              id: 'orphan-op-2',
              entityType: 'TAG',
              actionType: '[Tag] Update Tag',
              opType: OpType.Update,
              clientId: 'client1',
              vectorClock: { client1: 2 },
              timestamp: Date.now(),
              payload: { id: 'tag1', name: 'Test Tag' },
              schemaVersion: 1,
            },
            appliedAt: Date.now(),
            source: 'local',
          },
        ]);
        mockOpLogStore.deleteOpsWhere.and.resolveTo();

        // Legacy data exists
        const legacyData = {
          task: { ids: ['t1', 't2'] },
          project: { ids: ['p1'] },
          globalConfig: { some: 'config' },
        };
        mockPfapiService.pf.getAllSyncModelDataFromModelCtrls.and.resolveTo(legacyData);
        mockPfapiService.pf.metaModel.loadClientId.and.resolveTo('test-client-id');
        mockOpLogStore.append.and.resolveTo();
        mockOpLogStore.saveStateCache.and.resolveTo();

        await service.checkAndMigrate();

        // Should warn about orphan operations
        expect(OpLog.warn).toHaveBeenCalledWith(
          jasmine.stringContaining('Found 2 orphan operations without Genesis'),
        );

        // Should clear orphan operations
        expect(mockOpLogStore.deleteOpsWhere).toHaveBeenCalled();

        // Should proceed with migration
        expect(mockPfapiService.pf.getAllSyncModelDataFromModelCtrls).toHaveBeenCalled();
        expect(mockOpLogStore.append).toHaveBeenCalled();
      });
    });

    describe('when no snapshot and no operations exist (fresh install or migration)', () => {
      beforeEach(() => {
        mockOpLogStore.loadStateCache.and.resolveTo(null);
        mockOpLogStore.getOpsAfterSeq.and.resolveTo([]);
      });

      it('should skip migration if no legacy user data is found', async () => {
        // Return data with no user data (empty ids arrays or missing models)
        mockPfapiService.pf.getAllSyncModelDataFromModelCtrls.and.resolveTo({
          globalConfig: { some: 'config' }, // config model, ignored
          task: { ids: [] }, // empty user model
          project: undefined,
        });

        await service.checkAndMigrate();

        expect(mockOpLogStore.loadStateCache).toHaveBeenCalled();
        expect(mockOpLogStore.getOpsAfterSeq).toHaveBeenCalledWith(0);
        expect(mockPfapiService.pf.getAllSyncModelDataFromModelCtrls).toHaveBeenCalled();
        expect(mockPfapiService.pf.metaModel.loadClientId).not.toHaveBeenCalled();
        expect(mockOpLogStore.append).not.toHaveBeenCalled();
        expect(OpLog.normal).toHaveBeenCalledWith(
          jasmine.stringContaining('No legacy data found'),
        );
      });

      it('should migrate legacy data if found in pf database', async () => {
        const legacyData = {
          task: { ids: ['t1'] },
          project: { ids: ['p1'] },
          globalConfig: { some: 'config' },
        };
        mockPfapiService.pf.getAllSyncModelDataFromModelCtrls.and.resolveTo(legacyData);
        const clientId = 'test-client-id';
        mockPfapiService.pf.metaModel.loadClientId.and.resolveTo(clientId);
        mockOpLogStore.append.and.resolveTo();
        mockOpLogStore.saveStateCache.and.resolveTo();

        await service.checkAndMigrate();

        expect(mockOpLogStore.loadStateCache).toHaveBeenCalled();
        expect(mockOpLogStore.getOpsAfterSeq).toHaveBeenCalledWith(0);
        expect(mockPfapiService.pf.getAllSyncModelDataFromModelCtrls).toHaveBeenCalled();
        expect(mockPfapiService.pf.metaModel.loadClientId).toHaveBeenCalled();

        // Check append call (Genesis Operation)
        expect(mockOpLogStore.append).toHaveBeenCalled();
        const appendCallArgs = mockOpLogStore.append.calls.first().args[0];
        expect(appendCallArgs).toEqual(
          jasmine.objectContaining({
            actionType: '[Migration] Genesis Import',
            entityType: 'MIGRATION',
            clientId: clientId,
            payload: legacyData,
          }),
        );

        // Check saveStateCache call
        expect(mockOpLogStore.saveStateCache).toHaveBeenCalled();
        const saveCacheCallArgs = mockOpLogStore.saveStateCache.calls.first().args[0];
        expect(saveCacheCallArgs).toEqual(
          jasmine.objectContaining({
            state: legacyData,
            lastAppliedOpSeq: 1,
          }),
        );

        expect(OpLog.normal).toHaveBeenCalledWith(
          jasmine.stringContaining('Legacy data found'),
        );
        expect(OpLog.normal).toHaveBeenCalledWith(
          jasmine.stringContaining('Migration complete'),
        );
      });

      it('should check all entity models for user data', async () => {
        // Only notes have data
        mockPfapiService.pf.getAllSyncModelDataFromModelCtrls.and.resolveTo({
          task: { ids: [] },
          project: { ids: [] },
          tag: { ids: [] },
          note: { ids: ['n1'] }, // Notes have data
          taskRepeatCfg: { ids: [] },
          simpleCounter: { ids: [] },
          metric: { ids: [] },
          globalConfig: { some: 'config' },
        });
        mockPfapiService.pf.metaModel.loadClientId.and.resolveTo('test-client');
        mockOpLogStore.append.and.resolveTo();
        mockOpLogStore.saveStateCache.and.resolveTo();

        await service.checkAndMigrate();

        // Should detect the note and proceed with migration
        expect(mockOpLogStore.append).toHaveBeenCalled();
      });
    });

    describe('reads from ModelCtrls directly (not NgRx delegate)', () => {
      it('should call getAllSyncModelDataFromModelCtrls, not getAllSyncModelData', async () => {
        mockOpLogStore.loadStateCache.and.resolveTo(null);
        mockOpLogStore.getOpsAfterSeq.and.resolveTo([]);
        mockPfapiService.pf.getAllSyncModelDataFromModelCtrls.and.resolveTo({
          task: { ids: [] },
        });

        await service.checkAndMigrate();

        // Verify we called the correct method
        expect(mockPfapiService.pf.getAllSyncModelDataFromModelCtrls).toHaveBeenCalled();

        // Verify we did NOT call the wrong method (if it existed on the mock)
        if (mockPfapiService.pf.getAllSyncModelData) {
          expect(mockPfapiService.pf.getAllSyncModelData).not.toHaveBeenCalled();
        }
      });
    });

    describe('pre-migration dialog and backup', () => {
      beforeEach(() => {
        mockOpLogStore.loadStateCache.and.resolveTo(null);
        mockOpLogStore.getOpsAfterSeq.and.resolveTo([]);
      });

      it('should show dialog and download backup before migration', async () => {
        const legacyData = {
          task: { ids: ['t1'] },
          project: { ids: ['p1'] },
        };
        mockPfapiService.pf.getAllSyncModelDataFromModelCtrls.and.resolveTo(legacyData);
        mockPfapiService.pf.metaModel.loadClientId.and.resolveTo('test-client');
        mockOpLogStore.append.and.resolveTo(1);
        mockOpLogStore.saveStateCache.and.resolveTo();

        await service.checkAndMigrate();

        // Verify dialog was shown with correct config
        expect(mockMatDialog.open).toHaveBeenCalled();
        const dialogConfig = mockMatDialog.open.calls.first().args[1];
        expect(dialogConfig?.disableClose).toBe(true);
        expect((dialogConfig?.data as any).hideCancelButton).toBe(true);

        // Verify backup download log
        expect(OpLog.normal).toHaveBeenCalledWith(
          jasmine.stringContaining('Pre-migration backup downloaded'),
        );
      });

      it('should not show dialog when no legacy data exists', async () => {
        mockPfapiService.pf.getAllSyncModelDataFromModelCtrls.and.resolveTo({
          task: { ids: [] },
        });

        await service.checkAndMigrate();

        // Dialog should NOT be shown for fresh install
        expect(mockMatDialog.open).not.toHaveBeenCalled();
      });

      it('should not show dialog when already migrated', async () => {
        mockOpLogStore.loadStateCache.and.resolveTo({
          state: { task: { ids: ['t1'] } },
          lastAppliedOpSeq: 5,
          vectorClock: { client1: 5 },
          compactedAt: Date.now(),
        });

        await service.checkAndMigrate();

        // Dialog should NOT be shown for already migrated
        expect(mockMatDialog.open).not.toHaveBeenCalled();
      });
    });
  });
});
