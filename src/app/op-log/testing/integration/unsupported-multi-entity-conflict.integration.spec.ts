import { TestBed } from '@angular/core/testing';
import { createSelector, Store } from '@ngrx/store';
import { of } from 'rxjs';
import { ArchiveDbAdapter } from '../../../core/persistence/archive-db-adapter.service';
import { SnackService } from '../../../core/snack/snack.service';
import { ArchiveModel } from '../../../features/archive/archive.model';
import { TaskArchiveService } from '../../../features/archive/task-archive.service';
import { DEFAULT_TASK, Task } from '../../../features/tasks/task.model';
import { TASK_FEATURE_NAME } from '../../../features/tasks/store/task.reducer';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';
import { createBaseState } from '../../../root-store/meta/task-shared-meta-reducers/test-utils';
import { RootState } from '../../../root-store/root-state';
import { OperationApplierService } from '../../apply/operation-applier.service';
import { OperationCaptureService } from '../../capture/operation-capture.service';
import { OperationLogEffects } from '../../capture/operation-log.effects';
import { buildEntityRegistry, ENTITY_REGISTRY } from '../../core/entity-registry';
import { ActionType, Operation } from '../../core/operation.types';
import { PersistentAction } from '../../core/persistent-action.interface';
import { OperationLogStoreService } from '../../persistence/operation-log-store.service';
import { ConflictJournalService } from '../../sync/conflict-journal.service';
import { ConflictResolutionService } from '../../sync/conflict-resolution.service';
import { CLIENT_ID_PROVIDER } from '../../util/client-id.provider';
import { ValidateStateService } from '../../validation/validate-state.service';
import { resetTestUuidCounter, TestClient } from './helpers/test-client.helper';

describe('unsupported archive multi-entity conflict integration (#9405)', () => {
  const LOCAL_CLIENT_ID = 'archive-client';
  const REMOTE_CLIENT_ID = 'remote-client';
  const YOUNG_TASK_ID = 'rpt_cfg-young_2026-07-30';
  const OLD_TASK_ID = 'rpt_cfg-old_2026-06-30';

  let archiveDb: ArchiveDbAdapter;
  let taskArchive: TaskArchiveService;
  let opLogStore: OperationLogStoreService;
  let capture: OperationCaptureService;
  let resolver: ConflictResolutionService;
  let journal: ConflictJournalService;
  let store: jasmine.SpyObj<Store>;
  let operationApplier: jasmine.SpyObj<OperationApplierService>;
  let localState: RootState;

  const createArchivedTask = (id: string, title: string): Task => ({
    ...DEFAULT_TASK,
    id,
    title,
    projectId: 'project1',
    isDone: true,
    doneOn: 1_000,
  });

  const archiveModel = (tasks: Task[]): ArchiveModel =>
    ({
      task: {
        ids: tasks.map(({ id }) => id),
        entities: Object.fromEntries(tasks.map((task) => [task.id, task])),
      },
      timeTracking: { project: {}, tag: {} },
      lastTimeTrackingFlush: 0,
    }) as ArchiveModel;

  const captureOperation = (
    action: PersistentAction,
    client: TestClient,
    timestamp: number,
  ): Operation => {
    const { type, meta, ...actionPayload } = action;
    const entityIds = meta.entityIds ?? (meta.entityId ? [meta.entityId] : undefined);
    const entityId = meta.entityId ?? entityIds?.[0];
    if (!entityId) {
      throw new Error('Persistent test action has no entity id');
    }

    return {
      ...client.createOperation({
        actionType: type,
        opType: meta.opType,
        entityType: meta.entityType,
        entityId,
        entityIds,
        payload: {
          actionPayload,
          entityChanges: capture.extractEntityChanges(action),
        },
      }),
      timestamp,
    };
  };

  beforeEach(async () => {
    resetTestUuidCounter();
    localState = createBaseState();

    store = jasmine.createSpyObj<Store>('Store', ['dispatch', 'select']);
    store.select.and.callFake((selector: unknown, props?: unknown) => {
      if (typeof selector !== 'function') {
        return of(undefined) as ReturnType<Store['select']>;
      }
      return of(
        (selector as (state: RootState, selectorProps?: unknown) => unknown)(
          localState,
          props,
        ),
      ) as ReturnType<Store['select']>;
    });

    operationApplier = jasmine.createSpyObj<OperationApplierService>(
      'OperationApplierService',
      ['applyOperations'],
    );
    const validateState = jasmine.createSpyObj<ValidateStateService>(
      'ValidateStateService',
      ['validateAndRepairCurrentState'],
    );
    validateState.validateAndRepairCurrentState.and.resolveTo(true);
    const operationLogEffects = jasmine.createSpyObj<OperationLogEffects>(
      'OperationLogEffects',
      ['processDeferredActions'],
    );
    operationLogEffects.processDeferredActions.and.resolveTo();

    const entityRegistry = buildEntityRegistry();
    const taskConfig = entityRegistry.TASK;
    if (!taskConfig) {
      throw new Error('TASK entity config is required');
    }
    taskConfig.selectById = createSelector(
      (state: RootState) => state[TASK_FEATURE_NAME],
      (state, props: { id: string }) => state.entities[props.id] as Task | undefined,
    ) as NonNullable<typeof taskConfig.selectById>;

    TestBed.configureTestingModule({
      providers: [
        ConflictResolutionService,
        OperationLogStoreService,
        OperationCaptureService,
        TaskArchiveService,
        ArchiveDbAdapter,
        { provide: Store, useValue: store },
        { provide: OperationApplierService, useValue: operationApplier },
        { provide: ValidateStateService, useValue: validateState },
        { provide: OperationLogEffects, useValue: operationLogEffects },
        {
          provide: SnackService,
          useValue: jasmine.createSpyObj<SnackService>('SnackService', ['open']),
        },
        {
          provide: CLIENT_ID_PROVIDER,
          useValue: {
            loadClientId: () => Promise.resolve(LOCAL_CLIENT_ID),
            getOrGenerateClientId: () => Promise.resolve(LOCAL_CLIENT_ID),
            clearCache: () => {},
          },
        },
        { provide: ENTITY_REGISTRY, useValue: entityRegistry },
      ],
    });

    archiveDb = TestBed.inject(ArchiveDbAdapter);
    taskArchive = TestBed.inject(TaskArchiveService);
    opLogStore = TestBed.inject(OperationLogStoreService);
    capture = TestBed.inject(OperationCaptureService);
    resolver = TestBed.inject(ConflictResolutionService);
    journal = TestBed.inject(ConflictJournalService);

    await opLogStore.init();
    await opLogStore._clearAllDataForTesting();
    await journal.clearAll();
    await archiveDb.saveArchiveYoung(
      archiveModel([createArchivedTask(YOUNG_TASK_ID, 'Young occurrence')]),
    );
    await archiveDb.saveArchiveOld(
      archiveModel([createArchivedTask(OLD_TASK_ID, 'Old occurrence')]),
    );
  });

  afterEach(async () => {
    await archiveDb.saveArchiveYoung(archiveModel([]));
    await archiveDb.saveArchiveOld(archiveModel([]));
    await opLogStore._clearAllDataForTesting();
    await journal.clearAll();
    TestBed.resetTestingModule();
  });

  it('reproduces an archive updateTasks conflict that fails closed before mutation', async () => {
    // This reproduces the updateTasks defect class; it does not prove that
    // updateTasks produced the reporter's blocked operation in issue #9405.
    const updates = [
      { id: YOUNG_TASK_ID, changes: { title: 'Updated young occurrence' } },
      { id: OLD_TASK_ID, changes: { title: 'Updated old occurrence' } },
    ];
    await taskArchive.updateTasks(updates);

    const archiveYoungAfterProducer = await archiveDb.loadArchiveYoung();
    const archiveOldAfterProducer = await archiveDb.loadArchiveOld();
    expect(archiveYoungAfterProducer?.task.entities[YOUNG_TASK_ID]?.title).toBe(
      'Updated young occurrence',
    );
    expect(archiveOldAfterProducer?.task.entities[OLD_TASK_ID]?.title).toBe(
      'Updated old occurrence',
    );

    expect(store.dispatch).toHaveBeenCalledTimes(1);
    const localAction = store.dispatch.calls.mostRecent()
      .args[0] as unknown as PersistentAction;
    const localOperation = captureOperation(
      localAction,
      new TestClient(LOCAL_CLIENT_ID),
      1_000,
    );
    expect(localOperation.actionType).toBe(ActionType.TASK_SHARED_UPDATE_MULTIPLE);
    expect(localOperation.entityId).toBe(YOUNG_TASK_ID);
    expect(localOperation.entityIds).toEqual([YOUNG_TASK_ID, OLD_TASK_ID]);
    expect(localOperation.payload).toEqual({
      actionPayload: { tasks: updates },
      entityChanges: [],
    });
    await opLogStore.append(localOperation, 'local');

    const remoteAction = TaskSharedActions.updateTask({
      task: {
        id: YOUNG_TASK_ID,
        changes: { title: 'Concurrent remote occurrence' },
      },
    }) as PersistentAction;
    const remoteOperation = captureOperation(
      remoteAction,
      new TestClient(REMOTE_CLIENT_ID),
      2_000,
    );
    const detection = await resolver.checkOpForConflicts(remoteOperation, {
      localPendingOpsByEntity: await opLogStore.getUnsyncedByEntity(),
      appliedFrontierByEntity: new Map(),
      retainedOpsByEntity: new Map(),
      snapshotVectorClock: undefined,
      snapshotEntityKeys: undefined,
      hasNoSnapshotClock: true,
    });
    expect(detection.conflicts.map(({ entityId }) => entityId)).toEqual([YOUNG_TASK_ID]);

    await expectAsync(
      resolver.autoResolveConflictsLWW(detection.conflicts),
    ).toBeRejectedWithError(/Cannot safely auto-resolve local multi-entity operation/);

    const durableEntries = await opLogStore.getOpsAfterSeq(0);
    expect(durableEntries.map(({ op }) => op.id)).toEqual([localOperation.id]);
    expect(durableEntries[0]).toEqual(
      jasmine.objectContaining({
        source: 'local',
        syncedAt: undefined,
        rejectedAt: undefined,
        applicationStatus: undefined,
      }),
    );
    expect((await opLogStore.getUnsynced()).map(({ op }) => op.id)).toEqual([
      localOperation.id,
    ]);
    expect(await opLogStore.getPendingRemoteOps()).toEqual([]);
    expect(operationApplier.applyOperations).not.toHaveBeenCalled();
    expect(await journal.list('history')).toEqual([]);
    expect(await archiveDb.loadArchiveYoung()).toEqual(archiveYoungAfterProducer);
    expect(await archiveDb.loadArchiveOld()).toEqual(archiveOldAfterProducer);
    expect(store.dispatch).toHaveBeenCalledTimes(1);
  });

  it('keeps archive-only tasks invisible to the resolver current-state lookup', async () => {
    expect(await taskArchive.getById(YOUNG_TASK_ID)).toEqual(
      jasmine.objectContaining({ id: YOUNG_TASK_ID }),
    );
    expect(localState[TASK_FEATURE_NAME].entities[YOUNG_TASK_ID]).toBeUndefined();
    expect(await resolver.getCurrentEntityState('TASK', YOUNG_TASK_ID)).toBeUndefined();
  });
});
