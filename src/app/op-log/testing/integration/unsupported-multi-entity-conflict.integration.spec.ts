import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action, createSelector, Store } from '@ngrx/store';
import { Subject, Subscription, of } from 'rxjs';
import { ArchiveDbAdapter } from '../../../core/persistence/archive-db-adapter.service';
import { SnackService } from '../../../core/snack/snack.service';
import { ClientIdService } from '../../../core/util/client-id.service';
import { ArchiveModel } from '../../../features/archive/archive.model';
import { TaskArchiveService } from '../../../features/archive/task-archive.service';
import { DEFAULT_TASK, Task } from '../../../features/tasks/task.model';
import { TASK_FEATURE_NAME } from '../../../features/tasks/store/task.reducer';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';
import { createBaseState } from '../../../root-store/meta/task-shared-meta-reducers/test-utils';
import { RootState } from '../../../root-store/root-state';
import { OperationApplierService } from '../../apply/operation-applier.service';
import { OperationCaptureService } from '../../capture/operation-capture.service';
import { clearDeferredActions } from '../../capture/operation-capture.meta-reducer';
import { OperationLogEffects } from '../../capture/operation-log.effects';
import { buildEntityRegistry, ENTITY_REGISTRY } from '../../core/entity-registry';
import { ActionType, Operation } from '../../core/operation.types';
import { UnsupportedMultiEntityConflictError } from '../../core/errors/sync-errors';
import {
  isPersistentAction,
  PersistentAction,
} from '../../core/persistent-action.interface';
import { OperationLogCompactionService } from '../../persistence/operation-log-compaction.service';
import { OperationLogStoreService } from '../../persistence/operation-log-store.service';
import { ConflictJournalService } from '../../sync/conflict-journal.service';
import { ConflictResolutionService } from '../../sync/conflict-resolution.service';
import { ImmediateUploadService } from '../../sync/immediate-upload.service';
import { OperationWriteFlushService } from '../../sync/operation-write-flush.service';
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
  let effects: OperationLogEffects;
  let writeFlush: OperationWriteFlushService;
  let resolver: ConflictResolutionService;
  let journal: ConflictJournalService;
  let store: jasmine.SpyObj<Store>;
  let operationApplier: jasmine.SpyObj<OperationApplierService>;
  let localState: RootState;
  let actions$: Subject<Action>;
  let effectSubscription: Subscription;

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

  const createRemoteOperation = (
    action: PersistentAction,
    timestamp: number,
  ): Operation => {
    const { type, meta, ...actionPayload } = action;
    const entityIds = meta.entityIds ?? (meta.entityId ? [meta.entityId] : undefined);
    const entityId = meta.entityId ?? entityIds?.[0];
    if (!entityId) {
      throw new Error('Persistent test action has no entity id');
    }

    return {
      ...new TestClient(REMOTE_CLIENT_ID).createOperation({
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

  const dispatchToEffects = (action: Action): void => {
    if (!isPersistentAction(action)) {
      throw new Error('Expected TaskArchiveService to dispatch a persistent action');
    }
    // Full NgRx bootstrap is outside this producer/effect integration test;
    // meta-reducer registration and this handoff have dedicated integration tests.
    capture.incrementPending(action);
    actions$.next(action);
  };

  beforeEach(async () => {
    resetTestUuidCounter();
    clearDeferredActions();
    localState = createBaseState();
    actions$ = new Subject<Action>();

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
    const compaction = jasmine.createSpyObj<OperationLogCompactionService>(
      'OperationLogCompactionService',
      ['compact', 'emergencyCompact'],
    );
    compaction.compact.and.resolveTo(true);
    compaction.emergencyCompact.and.resolveTo(true);
    const clientId = jasmine.createSpyObj<ClientIdService>('ClientIdService', [
      'getOrGenerateClientId',
    ]);
    clientId.getOrGenerateClientId.and.resolveTo(LOCAL_CLIENT_ID);

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
        OperationLogEffects,
        OperationLogStoreService,
        OperationCaptureService,
        TaskArchiveService,
        ArchiveDbAdapter,
        provideMockActions(() => actions$),
        { provide: Store, useValue: store },
        { provide: OperationApplierService, useValue: operationApplier },
        { provide: ValidateStateService, useValue: validateState },
        { provide: OperationLogCompactionService, useValue: compaction },
        {
          provide: ImmediateUploadService,
          useValue: jasmine.createSpyObj<ImmediateUploadService>(
            'ImmediateUploadService',
            ['trigger'],
          ),
        },
        { provide: ClientIdService, useValue: clientId },
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
    effects = TestBed.inject(OperationLogEffects);
    writeFlush = TestBed.inject(OperationWriteFlushService);
    resolver = TestBed.inject(ConflictResolutionService);
    journal = TestBed.inject(ConflictJournalService);
    capture.clear();
    store.dispatch.and.callFake(dispatchToEffects as Store['dispatch']);

    await opLogStore.init();
    await opLogStore._clearAllDataForTesting();
    await journal.clearAll();
    await archiveDb.saveArchiveYoung(
      archiveModel([createArchivedTask(YOUNG_TASK_ID, 'Young occurrence')]),
    );
    await archiveDb.saveArchiveOld(
      archiveModel([createArchivedTask(OLD_TASK_ID, 'Old occurrence')]),
    );
    effectSubscription = effects.persistOperation$.subscribe();
  });

  afterEach(async () => {
    await writeFlush.flushPendingWrites();
    effectSubscription.unsubscribe();
    actions$.complete();
    capture.clear();
    clearDeferredActions();
    await archiveDb.saveArchiveYoung(archiveModel([]));
    await archiveDb.saveArchiveOld(archiveModel([]));
    await opLogStore._clearAllDataForTesting();
    await journal.clearAll();
    TestBed.resetTestingModule();
  });

  it('reproduces an archive updateTasks conflict that fails closed before mutation', async () => {
    // This reproduces the updateTasks defect class; it does not prove that
    // updateTasks produced the reporter's blocked operation in issue #9405.
    let youngWriteCommitted = false;
    let oldWriteCommitted = false;
    let writesCommittedAtDispatch = false;
    const saveArchiveYoung = archiveDb.saveArchiveYoung.bind(archiveDb);
    const saveArchiveOld = archiveDb.saveArchiveOld.bind(archiveDb);
    spyOn(archiveDb, 'saveArchiveYoung').and.callFake(async (archive) => {
      await saveArchiveYoung(archive);
      youngWriteCommitted = true;
    });
    spyOn(archiveDb, 'saveArchiveOld').and.callFake(async (archive) => {
      await saveArchiveOld(archive);
      oldWriteCommitted = true;
    });
    store.dispatch.and.callFake(((action: Action): void => {
      writesCommittedAtDispatch = youngWriteCommitted && oldWriteCommitted;
      dispatchToEffects(action);
    }) as Store['dispatch']);

    const updates = [
      { id: YOUNG_TASK_ID, changes: { title: 'Updated young occurrence' } },
      { id: OLD_TASK_ID, changes: { title: 'Updated old occurrence' } },
    ];
    await taskArchive.updateTasks(updates);
    await writeFlush.flushPendingWrites();

    const archiveYoungAfterProducer = await archiveDb.loadArchiveYoung();
    const archiveOldAfterProducer = await archiveDb.loadArchiveOld();
    expect(archiveYoungAfterProducer?.task.entities[YOUNG_TASK_ID]?.title).toBe(
      'Updated young occurrence',
    );
    expect(archiveOldAfterProducer?.task.entities[OLD_TASK_ID]?.title).toBe(
      'Updated old occurrence',
    );
    expect(writesCommittedAtDispatch).toBeTrue();

    expect(store.dispatch).toHaveBeenCalledTimes(1);
    expect(capture.getPendingCount()).toBe(0);
    const unsynced = await opLogStore.getUnsynced();
    expect(unsynced.length).toBe(1);
    const localOperation = unsynced[0]!.op;
    expect(localOperation.actionType).toBe(ActionType.TASK_SHARED_UPDATE_MULTIPLE);
    expect(localOperation.entityId).toBe(YOUNG_TASK_ID);
    expect(localOperation.entityIds).toEqual([YOUNG_TASK_ID, OLD_TASK_ID]);
    expect(localOperation.clientId).toBe(LOCAL_CLIENT_ID);
    expect(localOperation.vectorClock).toEqual({ [LOCAL_CLIENT_ID]: 1 });
    expect(localOperation.payload).toEqual({
      actionPayload: { tasks: updates },
      entityChanges: [],
    });
    opLogStore.clearVectorClockCache();
    expect(await opLogStore.getVectorClock()).toEqual({ [LOCAL_CLIENT_ID]: 1 });

    const remoteAction = TaskSharedActions.updateTask({
      task: {
        id: YOUNG_TASK_ID,
        changes: { title: 'Concurrent remote occurrence' },
      },
    }) as PersistentAction;
    const remoteOperation = createRemoteOperation(
      remoteAction,
      localOperation.timestamp + 1,
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
    ).toBeRejectedWithError(UnsupportedMultiEntityConflictError);

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
