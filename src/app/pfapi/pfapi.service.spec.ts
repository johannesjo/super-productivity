import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { provideMockActions } from '@ngrx/effects/testing';
import { TranslateService } from '@ngx-translate/core';
import { PfapiService } from './pfapi.service';
import { DataInitStateService } from '../core/data-init/data-init-state.service';
import { GlobalProgressBarService } from '../core-ui/global-progress-bar/global-progress-bar.service';
import { ImexViewService } from '../imex/imex-meta/imex-view.service';
import { PfapiStoreDelegateService } from './pfapi-store-delegate.service';
import { OperationLogStoreService } from '../core/persistence/operation-log/store/operation-log-store.service';
import { VectorClockService } from '../core/persistence/operation-log/sync/vector-clock.service';
import { loadAllData } from '../root-store/meta/load-all-data.action';
import { AppDataCompleteNew, CROSS_MODEL_VERSION } from './pfapi-config';
import { of, Observable } from 'rxjs';
import { CompleteBackup, Pfapi } from './api';
import { Task, TaskState } from '../features/tasks/task.model';
import { ArchiveModel } from '../features/time-tracking/time-tracking.model';
import { Action } from '@ngrx/store';

describe('PfapiService', () => {
  let service: PfapiService;
  let storeMock: jasmine.SpyObj<Store>;
  let imexViewServiceMock: jasmine.SpyObj<ImexViewService>;
  let opLogStoreMock: jasmine.SpyObj<OperationLogStoreService>;
  let vectorClockServiceMock: jasmine.SpyObj<VectorClockService>;
  let actions$: Observable<Action>;

  // Track ModelCtrl.save calls
  let modelCtrlSaveCalls: Map<string, unknown[]>;

  const createMockTask = (id: string, overrides: Partial<Task> = {}): Task => ({
    id,
    title: `Task ${id}`,
    subTaskIds: [],
    tagIds: [],
    timeSpent: 3600000, // 1 hour
    // eslint-disable-next-line @typescript-eslint/naming-convention
    timeSpentOnDay: { '2024-01-15': 3600000 },
    isDone: true,
    doneOn: Date.now(),
    notes: '',
    projectId: 'project1',
    parentId: undefined,
    created: Date.now(),
    repeatCfgId: undefined,
    _hideSubTasksMode: 2,
    attachments: [],
    issueId: undefined,
    issuePoints: undefined,
    issueType: undefined,
    issueAttachmentNr: undefined,
    issueLastUpdated: undefined,
    issueWasUpdated: undefined,
    timeEstimate: 7200000,
    ...overrides,
  });

  const createMockArchiveModel = (tasks: Task[]): ArchiveModel => ({
    task: {
      ids: tasks.map((t) => t.id),
      entities: tasks.reduce(
        (acc, task) => ({ ...acc, [task.id]: task }),
        {} as Record<string, Task>,
      ),
      currentTaskId: null,
      selectedTaskId: null,
      taskDetailTargetPanel: null,
      lastCurrentTaskId: null,
      isDataLoaded: true,
    } as TaskState,
    timeTracking: {
      project: {},
      tag: {},
    },
    lastTimeTrackingFlush: Date.now(),
  });

  const createMockBackupData = (): AppDataCompleteNew => {
    const archivedTask1 = createMockTask('archived-task-1', {
      timeSpent: 7200000, // 2 hours
      // eslint-disable-next-line @typescript-eslint/naming-convention
      timeSpentOnDay: { '2024-01-10': 3600000, '2024-01-11': 3600000 },
    });
    const archivedTask2 = createMockTask('archived-task-2', {
      timeSpent: 1800000, // 30 minutes
      // eslint-disable-next-line @typescript-eslint/naming-convention
      timeSpentOnDay: { '2024-01-12': 1800000 },
    });

    return {
      task: {
        ids: ['active-task-1'],
        entities: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'active-task-1': createMockTask('active-task-1'),
        },
        currentTaskId: null,
        selectedTaskId: null,
        taskDetailTargetPanel: null,
        lastCurrentTaskId: null,
        isDataLoaded: true,
      } as TaskState,
      archiveYoung: createMockArchiveModel([archivedTask1, archivedTask2]),
      archiveOld: createMockArchiveModel([]),
      // Minimal required fields for other models
      project: { ids: [], entities: {} },
      tag: { ids: [], entities: {} },
      globalConfig: {} as never,
      note: { ids: [], entities: {}, todayOrder: [] },
      issueProvider: { ids: [], entities: {} },
      planner: { days: {}, addPlannedTasksDialogLastShown: undefined },
      boards: { boardCfgs: [] },
      metric: { ids: [], entities: {}, obstructionIds: [], improvementIds: [] },
      simpleCounter: { ids: [], entities: {} },
      taskRepeatCfg: { ids: [], entities: {} },
      menuTree: { projectTree: [], tagTree: [] },
      timeTracking: { project: {}, tag: {} },
      pluginUserData: [],
      pluginMetadata: [],
      reminders: [],
    } as AppDataCompleteNew;
  };

  beforeEach(() => {
    // Reset the singleton flag to allow new instances in tests
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Pfapi as any)._wasInstanceCreated = false;

    modelCtrlSaveCalls = new Map();
    actions$ = of();

    storeMock = jasmine.createSpyObj('Store', ['dispatch', 'select']);
    storeMock.select.and.returnValue(of({}));

    imexViewServiceMock = jasmine.createSpyObj('ImexViewService', [
      'setDataImportInProgress',
    ]);

    opLogStoreMock = jasmine.createSpyObj('OperationLogStoreService', [
      'append',
      'getLastSeq',
      'saveStateCache',
      'loadStateCache',
      'clearAllOperations',
    ]);
    opLogStoreMock.append.and.returnValue(Promise.resolve(1));
    opLogStoreMock.getLastSeq.and.returnValue(Promise.resolve(1));
    opLogStoreMock.saveStateCache.and.returnValue(Promise.resolve());
    opLogStoreMock.loadStateCache.and.returnValue(Promise.resolve(null));
    opLogStoreMock.clearAllOperations.and.returnValue(Promise.resolve());

    vectorClockServiceMock = jasmine.createSpyObj('VectorClockService', [
      'getCurrentVectorClock',
    ]);
    vectorClockServiceMock.getCurrentVectorClock.and.returnValue(
      Promise.resolve({ client1: 1 }),
    );

    const dataInitStateServiceMock = {
      isAllDataLoadedInitially$: of(true),
    };

    const globalProgressBarServiceMock = jasmine.createSpyObj(
      'GlobalProgressBarService',
      ['countUp', 'countDown'],
    );

    const translateServiceMock = jasmine.createSpyObj('TranslateService', ['instant']);

    const storeDelegateServiceMock = jasmine.createSpyObj('PfapiStoreDelegateService', [
      'getAllSyncModelDataFromStore',
    ]);
    storeDelegateServiceMock.getAllSyncModelDataFromStore.and.returnValue(
      Promise.resolve(createMockBackupData()),
    );

    TestBed.configureTestingModule({
      providers: [
        PfapiService,
        provideMockActions(() => actions$),
        { provide: Store, useValue: storeMock },
        { provide: ImexViewService, useValue: imexViewServiceMock },
        { provide: OperationLogStoreService, useValue: opLogStoreMock },
        { provide: VectorClockService, useValue: vectorClockServiceMock },
        { provide: DataInitStateService, useValue: dataInitStateServiceMock },
        { provide: GlobalProgressBarService, useValue: globalProgressBarServiceMock },
        { provide: TranslateService, useValue: translateServiceMock },
        { provide: PfapiStoreDelegateService, useValue: storeDelegateServiceMock },
      ],
    });

    service = TestBed.inject(PfapiService);

    // Mock the Pfapi instance's methods
    // Mock migrateAndValidateImportData to return data as-is
    spyOn(service.pf, 'migrateAndValidateImportData').and.callFake(async ({ data }) => {
      return data;
    });

    // Mock metaModel methods
    spyOn(service.pf.metaModel, 'loadClientId').and.returnValue(
      Promise.resolve('test-client-id'),
    );
    spyOn(service.pf.metaModel, 'generateNewClientId').and.returnValue(
      Promise.resolve('new-client-id'),
    );

    // Mock tmpBackupService methods
    spyOn(service.pf.tmpBackupService, 'save').and.returnValue(Promise.resolve());

    // Mock ModelCtrl.save for all models to track what gets saved
    Object.keys(service.pf.m).forEach((modelId) => {
      const modelCtrl = service.pf.m[modelId as keyof typeof service.pf.m];
      if (modelCtrl && typeof modelCtrl.save === 'function') {
        spyOn(modelCtrl, 'save').and.callFake((data: unknown) => {
          const calls = modelCtrlSaveCalls.get(modelId) || [];
          calls.push(data);
          modelCtrlSaveCalls.set(modelId, calls);
          return Promise.resolve();
        });
      }
    });
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('importCompleteBackup', () => {
    it('should update ModelCtrl caches after import', async () => {
      const backupData = createMockBackupData();

      await service.importCompleteBackup(backupData, true, true);

      // Verify archiveYoung was saved to ModelCtrl
      const archiveYoungSaves = modelCtrlSaveCalls.get('archiveYoung');
      expect(archiveYoungSaves).toBeDefined();
      expect(archiveYoungSaves!.length).toBeGreaterThan(0);

      const savedArchiveYoung = archiveYoungSaves![0] as ArchiveModel;
      expect(savedArchiveYoung.task.ids).toContain('archived-task-1');
      expect(savedArchiveYoung.task.ids).toContain('archived-task-2');
    });

    it('should preserve time tracking data for archived tasks in ModelCtrl', async () => {
      const backupData = createMockBackupData();

      await service.importCompleteBackup(backupData, true, true);

      // Verify archiveYoung was saved with time tracking data intact
      const archiveYoungSaves = modelCtrlSaveCalls.get('archiveYoung');
      expect(archiveYoungSaves).toBeDefined();

      const savedArchiveYoung = archiveYoungSaves![0] as ArchiveModel;
      const archivedTask1 = savedArchiveYoung.task.entities['archived-task-1'] as Task;
      const archivedTask2 = savedArchiveYoung.task.entities['archived-task-2'] as Task;

      // Verify timeSpent is preserved
      expect(archivedTask1.timeSpent).toBe(7200000); // 2 hours
      expect(archivedTask2.timeSpent).toBe(1800000); // 30 minutes

      // Verify timeSpentOnDay is preserved
      expect(archivedTask1.timeSpentOnDay).toEqual({
        // eslint-disable-next-line @typescript-eslint/naming-convention
        '2024-01-10': 3600000,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        '2024-01-11': 3600000,
      });
      expect(archivedTask2.timeSpentOnDay).toEqual({
        // eslint-disable-next-line @typescript-eslint/naming-convention
        '2024-01-12': 1800000,
      });
    });

    it('should dispatch loadAllData to NgRx store', async () => {
      const backupData = createMockBackupData();

      await service.importCompleteBackup(backupData, true, true);

      expect(storeMock.dispatch).toHaveBeenCalledWith(
        loadAllData({ appDataComplete: backupData }),
      );
    });

    it('should persist import to operation log', async () => {
      const backupData = createMockBackupData();

      await service.importCompleteBackup(backupData, true, true);

      expect(opLogStoreMock.append).toHaveBeenCalled();
      expect(opLogStoreMock.saveStateCache).toHaveBeenCalled();
    });

    it('should handle CompleteBackup format with nested data property', async () => {
      const backupData = createMockBackupData();
      const completeBackup: CompleteBackup<never> = {
        data: backupData as never,
        crossModelVersion: CROSS_MODEL_VERSION,
        lastUpdate: Date.now(),
        timestamp: Date.now(),
      };

      await service.importCompleteBackup(completeBackup, true, true);

      // Should still update ModelCtrl caches
      const archiveYoungSaves = modelCtrlSaveCalls.get('archiveYoung');
      expect(archiveYoungSaves).toBeDefined();
      expect(archiveYoungSaves!.length).toBeGreaterThan(0);
    });

    it('should update all model caches, not just archives', async () => {
      const backupData = createMockBackupData();

      await service.importCompleteBackup(backupData, true, true);

      // Verify multiple models were saved
      expect(modelCtrlSaveCalls.get('task')).toBeDefined();
      expect(modelCtrlSaveCalls.get('archiveYoung')).toBeDefined();
      expect(modelCtrlSaveCalls.get('archiveOld')).toBeDefined();
      expect(modelCtrlSaveCalls.get('project')).toBeDefined();
      expect(modelCtrlSaveCalls.get('tag')).toBeDefined();
    });

    it('should set import in progress flag during import', async () => {
      const backupData = createMockBackupData();

      await service.importCompleteBackup(backupData, true, true);

      expect(imexViewServiceMock.setDataImportInProgress).toHaveBeenCalledWith(true);
      expect(imexViewServiceMock.setDataImportInProgress).toHaveBeenCalledWith(false);
    });

    it('should handle errors and reset import in progress flag', async () => {
      const backupData = createMockBackupData();

      // Make migrateAndValidateImportData throw an error
      (service.pf.migrateAndValidateImportData as jasmine.Spy).and.rejectWith(
        new Error('Validation failed'),
      );

      await expectAsync(
        service.importCompleteBackup(backupData, true, true),
      ).toBeRejectedWithError('Validation failed');

      // Should still reset the flag
      expect(imexViewServiceMock.setDataImportInProgress).toHaveBeenCalledWith(false);
    });

    it('should backup existing state and clear old operations before import', async () => {
      const existingState = createMockBackupData();
      opLogStoreMock.loadStateCache.and.returnValue(
        Promise.resolve({
          state: existingState,
          lastAppliedOpSeq: 5,
          vectorClock: { client1: 5 },
          compactedAt: Date.now(),
        }),
      );

      const backupData = createMockBackupData();
      await service.importCompleteBackup(backupData, true, true);

      // Should backup existing state before clearing
      expect(service.pf.tmpBackupService.save).toHaveBeenCalledWith(existingState);
      // Should clear all operations to prevent IndexedDB bloat
      expect(opLogStoreMock.clearAllOperations).toHaveBeenCalled();
      // Should then append the new import operation
      expect(opLogStoreMock.append).toHaveBeenCalled();
    });

    it('should not save backup if no existing state cache', async () => {
      opLogStoreMock.loadStateCache.and.returnValue(Promise.resolve(null));

      const backupData = createMockBackupData();
      await service.importCompleteBackup(backupData, true, true);

      // Should not try to backup if no existing state
      expect(service.pf.tmpBackupService.save).not.toHaveBeenCalled();
      // Should still clear operations
      expect(opLogStoreMock.clearAllOperations).toHaveBeenCalled();
    });
  });

  describe('ModelCtrl cache consistency', () => {
    it('should ensure TaskArchiveService can read imported archived tasks', async () => {
      // This test verifies the fix for the bug where archived task time tracking
      // was lost after import because TaskArchiveService reads from ModelCtrl,
      // not NgRx

      const backupData = createMockBackupData();

      await service.importCompleteBackup(backupData, true, true);

      // After import, ModelCtrl.save should have been called for archiveYoung
      // This ensures TaskArchiveService.load() will return the imported data
      const archiveYoungSaves = modelCtrlSaveCalls.get('archiveYoung');
      expect(archiveYoungSaves).toBeDefined();
      expect(archiveYoungSaves!.length).toBe(1);

      // The saved data should match what was imported
      const savedData = archiveYoungSaves![0] as ArchiveModel;
      expect(savedData).toEqual(backupData.archiveYoung);
    });

    it('should preserve timeEstimate for archived tasks', async () => {
      const backupData = createMockBackupData();

      await service.importCompleteBackup(backupData, true, true);

      const archiveYoungSaves = modelCtrlSaveCalls.get('archiveYoung');
      const savedArchiveYoung = archiveYoungSaves![0] as ArchiveModel;
      const archivedTask1 = savedArchiveYoung.task.entities['archived-task-1'] as Task;

      expect(archivedTask1.timeEstimate).toBe(7200000);
    });
  });
});
