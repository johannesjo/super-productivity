import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Action, ActionReducer, createSelector, Store } from '@ngrx/store';
import { of } from 'rxjs';
import { BannerService } from '../../../core/banner/banner.service';
import { ArchiveDbAdapter } from '../../../core/persistence/archive-db-adapter.service';
import { SnackService } from '../../../core/snack/snack.service';
import { ArchiveModel } from '../../../features/archive/archive.model';
import { ArchiveService } from '../../../features/archive/archive.service';
import { TaskArchiveService } from '../../../features/archive/task-archive.service';
import {
  PROJECT_FEATURE_NAME,
  projectReducer,
} from '../../../features/project/store/project.reducer';
import {
  addProject,
  updateProject,
} from '../../../features/project/store/project.actions';
import { DEFAULT_PROJECT } from '../../../features/project/project.const';
import { TAG_FEATURE_NAME, tagReducer } from '../../../features/tag/store/tag.reducer';
import { addTag } from '../../../features/tag/store/tag.actions';
import { DEFAULT_TAG, TODAY_TAG } from '../../../features/tag/tag.const';
import {
  TASK_REPEAT_CFG_FEATURE_NAME,
  taskRepeatCfgReducer,
} from '../../../features/task-repeat-cfg/store/task-repeat-cfg.reducer';
import { addTaskRepeatCfgToTask } from '../../../features/task-repeat-cfg/store/task-repeat-cfg.actions';
import {
  DEFAULT_TASK_REPEAT_CFG,
  TaskRepeatCfg,
} from '../../../features/task-repeat-cfg/task-repeat-cfg.model';
import { DEFAULT_TASK, Task, TaskWithSubTasks } from '../../../features/tasks/task.model';
import {
  TASK_FEATURE_NAME,
  taskReducer,
} from '../../../features/tasks/store/task.reducer';
import { TimeTrackingService } from '../../../features/time-tracking/time-tracking.service';
import { createCombinedTaskSharedMetaReducer } from '../../../root-store/meta/task-shared-meta-reducers/test-helpers';
import { createBaseState } from '../../../root-store/meta/task-shared-meta-reducers/test-utils';
import { lwwUpdateMetaReducer } from '../../../root-store/meta/task-shared-meta-reducers/lww-update.meta-reducer';
import { TaskSharedActions } from '../../../root-store/meta/task-shared.actions';
import { appStateFeatureKey } from '../../../root-store/app-state/app-state.reducer';
import { RootState } from '../../../root-store/root-state';
import { ArchiveOperationHandler } from '../../apply/archive-operation-handler.service';
import { OperationApplierService } from '../../apply/operation-applier.service';
import { convertOpToAction } from '../../apply/operation-converter.util';
import { OperationCaptureService } from '../../capture/operation-capture.service';
import { OperationLogEffects } from '../../capture/operation-log.effects';
import { buildEntityRegistry, ENTITY_REGISTRY } from '../../core/entity-registry';
import {
  EntityConflict,
  isLwwUpdatePayload,
  Operation,
} from '../../core/operation.types';
import { PersistentAction } from '../../core/persistent-action.interface';
import { OperationLogStoreService } from '../../persistence/operation-log-store.service';
import { ConflictJournalService } from '../../sync/conflict-journal.service';
import { ConflictResolutionService } from '../../sync/conflict-resolution.service';
import { SyncConflictBannerService } from '../../sync/sync-conflict-banner.service';
import { SyncSessionValidationService } from '../../sync/sync-session-validation.service';
import { CLIENT_ID_PROVIDER } from '../../util/client-id.provider';
import { ValidateStateService } from '../../validation/validate-state.service';
import { resetTestUuidCounter, TestClient } from './helpers/test-client.helper';

describe('restoreTask delete-conflict integration (#9263)', () => {
  const LOCAL_CLIENT_ID = 'delete-client';
  const REMOTE_CLIENT_ID = 'restore-client';
  const PARENT_ID = 'archived-parent';
  const SUBTASK_ID = 'archived-subtask';
  const MISSING_ARCHIVE_SUBTASK_ID = 'missing-archive-subtask';
  const INDEPENDENT_SUBTASK_ID = 'independently-moved-subtask';
  const RESTORE_PROJECT_ID = 'restore-project';
  const RESTORE_TAG_ID = 'restore-tag';
  const RESTORE_REPEAT_CFG_ID = 'restore-repeat';
  const RESTORE_DAY = '2026-07-23';

  let resolver: ConflictResolutionService;
  let opLogStore: OperationLogStoreService;
  let capture: OperationCaptureService;
  let archiveDb: ArchiveDbAdapter;
  let archiveHandler: ArchiveOperationHandler;
  let reducer: ActionReducer<RootState, Action>;
  let initialState: RootState;
  let localState: RootState;
  let currentClientId: string;

  const subtask: Task = {
    ...DEFAULT_TASK,
    id: SUBTASK_ID,
    title: 'Archived subtask',
    projectId: 'project1',
    parentId: PARENT_ID,
  };
  const deletedParent: Task = {
    ...DEFAULT_TASK,
    id: PARENT_ID,
    title: 'Archived parent',
    projectId: 'project1',
    subTaskIds: [SUBTASK_ID],
  };
  const deletedParentWithSubtasks: TaskWithSubTasks = {
    ...deletedParent,
    subTasks: [subtask],
  };

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

  const replay = (state: RootState, operations: Operation[]): RootState =>
    operations.reduce(
      (currentState, operation) => reducer(currentState, convertOpToAction(operation)),
      state,
    );

  const restoredProjection = (state: RootState): object => {
    const parent = state.tasks.entities[PARENT_ID];
    const restoredSubtask = state.tasks.entities[SUBTASK_ID];
    return {
      parent: {
        id: parent?.id,
        title: parent?.title,
        projectId: parent?.projectId,
        subTaskIds: parent?.subTaskIds,
        dueDay: parent?.dueDay,
        dueWithTime: parent?.dueWithTime,
        remindAt: parent?.remindAt,
        isDone: parent?.isDone,
      },
      subtask: {
        id: restoredSubtask?.id,
        title: restoredSubtask?.title,
        parentId: restoredSubtask?.parentId,
        projectId: restoredSubtask?.projectId,
        dueDay: restoredSubtask?.dueDay,
        dueWithTime: restoredSubtask?.dueWithTime,
        remindAt: restoredSubtask?.remindAt,
      },
      projectTaskIds: state.projects.entities.project1?.taskIds,
      projectBacklogTaskIds: state.projects.entities.project1?.backlogTaskIds,
      todayTaskIds: state[TAG_FEATURE_NAME].entities[TODAY_TAG.id]?.taskIds,
    };
  };

  beforeEach(async () => {
    resetTestUuidCounter();
    currentClientId = LOCAL_CLIENT_ID;

    const baseState = createBaseState();
    const project = baseState.projects.entities.project1;
    if (!project) {
      throw new Error('Test fixture project1 is missing');
    }
    initialState = {
      ...baseState,
      [appStateFeatureKey]: {
        ...baseState[appStateFeatureKey],
        todayStr: RESTORE_DAY,
        startOfNextDayDiffMs: 0,
      },
      tasks: {
        ...baseState.tasks,
        ids: [PARENT_ID, SUBTASK_ID],
        entities: {
          [PARENT_ID]: deletedParent,
          [SUBTASK_ID]: subtask,
        },
      },
      projects: {
        ...baseState.projects,
        entities: {
          ...baseState.projects.entities,
          project1: {
            ...project,
            taskIds: [PARENT_ID],
          },
        },
      },
    };

    const rootReducer: ActionReducer<RootState, Action> = (
      state = initialState,
      action,
    ) => ({
      ...state,
      [TASK_FEATURE_NAME]: taskReducer(state[TASK_FEATURE_NAME], action),
      [PROJECT_FEATURE_NAME]: projectReducer(state[PROJECT_FEATURE_NAME], action),
      [TAG_FEATURE_NAME]: tagReducer(state[TAG_FEATURE_NAME], action),
      [TASK_REPEAT_CFG_FEATURE_NAME]: taskRepeatCfgReducer(
        state[TASK_REPEAT_CFG_FEATURE_NAME],
        action,
      ),
    });
    reducer = createCombinedTaskSharedMetaReducer(
      lwwUpdateMetaReducer(rootReducer),
    ) as ActionReducer<RootState, Action>;

    const deleteAction = TaskSharedActions.deleteTask({
      task: deletedParentWithSubtasks,
    }) as PersistentAction;
    localState = reducer(initialState, deleteAction);

    const store = jasmine.createSpyObj<Store>('Store', ['select']);
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

    const operationApplier = jasmine.createSpyObj<OperationApplierService>(
      'OperationApplierService',
      ['applyOperations'],
    );
    operationApplier.applyOperations.and.callFake(async (operations, options) => {
      localState = replay(localState, operations);
      await options?.onReducersCommitted?.(operations);
      return { appliedOps: operations };
    });

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
    const conflictJournal = jasmine.createSpyObj<ConflictJournalService>(
      'ConflictJournalService',
      ['record'],
      { unreviewedCount: signal(0) },
    );
    conflictJournal.record.and.resolveTo();
    const syncConflictBanner = jasmine.createSpyObj<SyncConflictBannerService>(
      'SyncConflictBannerService',
      ['maybeShowSummaryBanner', 'navigateToReview'],
    );
    syncConflictBanner.maybeShowSummaryBanner.and.resolveTo();
    const snack = jasmine.createSpyObj<SnackService>('SnackService', [
      'open',
      'hasPendingPersistentAction',
    ]);
    snack.hasPendingPersistentAction.and.returnValue(false);

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
        ArchiveDbAdapter,
        ArchiveOperationHandler,
        TaskArchiveService,
        { provide: Store, useValue: store },
        { provide: OperationApplierService, useValue: operationApplier },
        { provide: ValidateStateService, useValue: validateState },
        { provide: OperationLogEffects, useValue: operationLogEffects },
        { provide: ConflictJournalService, useValue: conflictJournal },
        { provide: SyncConflictBannerService, useValue: syncConflictBanner },
        { provide: SnackService, useValue: snack },
        {
          provide: BannerService,
          useValue: jasmine.createSpyObj<BannerService>('BannerService', ['open']),
        },
        {
          provide: SyncSessionValidationService,
          useValue: jasmine.createSpyObj<SyncSessionValidationService>(
            'SyncSessionValidationService',
            ['setFailed'],
          ),
        },
        {
          provide: CLIENT_ID_PROVIDER,
          useValue: {
            loadClientId: () => Promise.resolve(currentClientId),
            getOrGenerateClientId: () => Promise.resolve(currentClientId),
            clearCache: () => {},
          },
        },
        { provide: ENTITY_REGISTRY, useValue: entityRegistry },
        { provide: ArchiveService, useValue: {} },
        { provide: TimeTrackingService, useValue: {} },
      ],
    });

    resolver = TestBed.inject(ConflictResolutionService);
    opLogStore = TestBed.inject(OperationLogStoreService);
    capture = TestBed.inject(OperationCaptureService);
    archiveDb = TestBed.inject(ArchiveDbAdapter);
    archiveHandler = TestBed.inject(ArchiveOperationHandler);

    await opLogStore.init();
    await opLogStore._clearAllDataForTesting();
    await archiveDb.saveArchiveYoung(archiveModel([deletedParent, subtask]));
    await archiveDb.saveArchiveOld(archiveModel([]));
  });

  afterEach(async () => {
    await archiveDb.saveArchiveYoung(archiveModel([]));
    await archiveDb.saveArchiveOld(archiveModel([]));
    await opLogStore._clearAllDataForTesting();
    TestBed.resetTestingModule();
  });

  it('replays a winning remote restore after a local delete without leaving archived copies', async () => {
    const localClient = new TestClient(LOCAL_CLIENT_ID);
    const remoteClient = new TestClient(REMOTE_CLIENT_ID);
    const deleteAction = TaskSharedActions.deleteTask({
      task: deletedParentWithSubtasks,
    }) as PersistentAction;
    const restoreAction = TaskSharedActions.restoreTask({
      task: { ...deletedParent, subTaskIds: [] },
      subTasks: [subtask],
      restoreToToday: {
        today: RESTORE_DAY,
        startOfNextDayDiffMs: 0,
      },
    }) as PersistentAction;
    const localDelete = captureOperation(deleteAction, localClient, 1_000);
    const remoteRestore = captureOperation(restoreAction, remoteClient, 2_000);
    const conflict: EntityConflict = {
      entityType: 'TASK',
      entityId: PARENT_ID,
      localOps: [localDelete],
      remoteOps: [remoteRestore],
      suggestedResolution: 'manual',
    };

    await opLogStore.append(localDelete, 'local');
    await resolver.autoResolveConflictsLWW([conflict]);

    const storedOperations = (await opLogStore.getOpsAfterSeq(0)).map(({ op }) => op);
    const storedRestore = storedOperations.find(({ id }) => id === remoteRestore.id);
    if (!storedRestore) {
      throw new Error('Resolved restore operation was not persisted');
    }
    const storedRestoreAction = convertOpToAction(storedRestore) as ReturnType<
      typeof TaskSharedActions.restoreTask
    >;
    expect(storedRestoreAction.type).toBe(TaskSharedActions.restoreTask.type);
    expect(storedRestoreAction.restoreToToday).toEqual({
      today: RESTORE_DAY,
      startOfNextDayDiffMs: 0,
    });
    expect(storedRestoreAction.subTasks.map(({ id }) => id)).toEqual([SUBTASK_ID]);

    const restartedState = replay(initialState, storedOperations);

    expect(restartedState.tasks.ids).toContain(PARENT_ID);
    expect(restartedState.tasks.ids).toContain(SUBTASK_ID);
    expect(restartedState.tasks.entities[PARENT_ID]?.subTaskIds).toEqual([SUBTASK_ID]);
    expect(restartedState.tasks.entities[SUBTASK_ID]?.parentId).toBe(PARENT_ID);
    expect(restartedState.tasks.entities[PARENT_ID]?.dueDay).toBe(RESTORE_DAY);
    expect(restartedState.tasks.entities[SUBTASK_ID]?.dueDay).toBeUndefined();
    expect(restartedState.tasks.entities[PARENT_ID]?.tagIds).not.toContain(TODAY_TAG.id);
    expect(restartedState.tasks.entities[SUBTASK_ID]?.tagIds).not.toContain(TODAY_TAG.id);
    expect(restartedState[TAG_FEATURE_NAME].entities[TODAY_TAG.id]?.taskIds).toEqual([
      PARENT_ID,
    ]);

    for (const operation of storedOperations) {
      await archiveHandler.handleOperation(convertOpToAction(operation));
    }

    expect((await archiveDb.loadArchiveYoung())?.task.ids).toEqual([]);
    expect((await archiveDb.loadArchiveOld())?.task.ids).toEqual([]);

    const deleteClientProjection = restoredProjection(localState);
    expect(restoredProjection(restartedState)).toEqual(deleteClientProjection);

    // Reverse delivery: the restore author receives the losing delete and
    // persists the reconciliation operations needed for status-blind restart.
    currentClientId = REMOTE_CLIENT_ID;
    await opLogStore._clearAllDataForTesting();
    await archiveDb.saveArchiveYoung(archiveModel([deletedParent, subtask]));
    await archiveDb.saveArchiveOld(archiveModel([]));
    localState = reducer(reducer(initialState, deleteAction), restoreAction);
    await archiveHandler.handleOperation(restoreAction);
    await opLogStore.append(remoteRestore, 'local');

    await resolver.autoResolveConflictsLWW([
      {
        entityType: 'TASK',
        entityId: PARENT_ID,
        localOps: [remoteRestore],
        remoteOps: [localDelete],
        suggestedResolution: 'manual',
      },
    ]);

    expect(restoredProjection(localState)).toEqual(deleteClientProjection);
    const restoreClientOperations = (await opLogStore.getOpsAfterSeq(0)).map(
      ({ op }) => op,
    );
    expect(restoredProjection(replay(initialState, restoreClientOperations))).toEqual(
      deleteClientProjection,
    );
    expect((await archiveDb.loadArchiveYoung())?.task.ids).toEqual([]);
    expect((await archiveDb.loadArchiveOld())?.task.ids).toEqual([]);
  });

  it('applies a winning remote restore over a local delete followed by undo', async () => {
    const localClient = new TestClient(LOCAL_CLIENT_ID);
    const remoteClient = new TestClient(REMOTE_CLIENT_ID);
    const missingArchiveSubtask: Task = {
      ...subtask,
      id: MISSING_ARCHIVE_SUBTASK_ID,
      title: 'Archived child missing from remote snapshot',
    };
    const independentSubtask: Task = {
      ...subtask,
      id: INDEPENDENT_SUBTASK_ID,
      title: 'Archived child moved independently after undo',
    };
    const partialArchiveParent: Task = {
      ...deletedParent,
      subTaskIds: [SUBTASK_ID, MISSING_ARCHIVE_SUBTASK_ID, INDEPENDENT_SUBTASK_ID],
    };
    const partialInitialState: RootState = {
      ...initialState,
      tasks: {
        ...initialState.tasks,
        ids: [PARENT_ID, SUBTASK_ID, MISSING_ARCHIVE_SUBTASK_ID, INDEPENDENT_SUBTASK_ID],
        entities: {
          ...initialState.tasks.entities,
          [PARENT_ID]: partialArchiveParent,
          [MISSING_ARCHIVE_SUBTASK_ID]: missingArchiveSubtask,
          [INDEPENDENT_SUBTASK_ID]: independentSubtask,
        },
      },
    };
    const deleteAction = TaskSharedActions.deleteTask({
      task: {
        ...partialArchiveParent,
        subTasks: [subtask, missingArchiveSubtask, independentSubtask],
      },
    }) as PersistentAction;
    const localUndoParent: Task = {
      ...partialArchiveParent,
      title: 'Local undo',
    };
    const localUndoSubtask: Task = {
      ...subtask,
      title: 'Local undo subtask',
    };
    const localUndoMissingSubtask: Task = {
      ...missingArchiveSubtask,
      title: 'Local undo child missing from remote snapshot',
      dueDay: '2026-07-22',
      dueWithTime: 1_721_600_000_000,
      remindAt: 1_721_599_700_000,
    };
    const localUndoIndependentSubtask: Task = {
      ...independentSubtask,
      title: 'Local undo child later moved independently',
    };
    const localUndoAction = TaskSharedActions.restoreDeletedTask({
      task: {
        ...localUndoParent,
        subTasks: [
          localUndoSubtask,
          localUndoMissingSubtask,
          localUndoIndependentSubtask,
        ],
      },
      projectContext: {
        projectId: 'project1',
        taskIdsForProject: [],
        taskIdsForProjectBacklog: [PARENT_ID],
      },
      tagTaskIdMap: {},
      deletedTaskEntities: {
        [PARENT_ID]: localUndoParent,
        [SUBTASK_ID]: localUndoSubtask,
        [MISSING_ARCHIVE_SUBTASK_ID]: localUndoMissingSubtask,
        [INDEPENDENT_SUBTASK_ID]: localUndoIndependentSubtask,
      },
    }) as PersistentAction;
    const localConvertIndependentChildAction = TaskSharedActions.convertToMainTask({
      task: localUndoIndependentSubtask,
      parentTagIds: ['tag1'],
      today: RESTORE_DAY,
      modified: 1_600,
    }) as PersistentAction;
    const localMoveIndependentChildAction = TaskSharedActions.updateTask({
      task: {
        id: INDEPENDENT_SUBTASK_ID,
        changes: { projectId: '' },
      },
      projectMoveSubTaskIds: [],
    }) as PersistentAction;
    const localEditAction = TaskSharedActions.updateTask({
      task: {
        id: PARENT_ID,
        changes: { title: 'Local edit after undo' },
      },
    }) as PersistentAction;
    const remoteRestoreAction = TaskSharedActions.restoreTask({
      task: {
        ...partialArchiveParent,
        title: 'Remote restore winner',
      },
      subTasks: [
        {
          ...subtask,
          title: 'Remote restored subtask',
        },
        {
          ...independentSubtask,
          title: 'Remote child snapshot superseded by independent move',
        },
      ],
      restoreToToday: {
        today: RESTORE_DAY,
        startOfNextDayDiffMs: 0,
      },
    }) as PersistentAction;
    const localDelete = captureOperation(deleteAction, localClient, 1_000);
    const localUndo = captureOperation(localUndoAction, localClient, 1_500);
    const localConvertIndependentChild = captureOperation(
      localConvertIndependentChildAction,
      localClient,
      1_600,
    );
    const localMoveIndependentChild = captureOperation(
      localMoveIndependentChildAction,
      localClient,
      1_650,
    );
    const localEdit = captureOperation(localEditAction, localClient, 1_750);
    const remoteRestore = captureOperation(remoteRestoreAction, remoteClient, 2_000);

    const deletedState = reducer(partialInitialState, deleteAction);
    localState = deletedState;
    localState = reducer(localState, localUndoAction);
    localState = reducer(localState, localConvertIndependentChildAction);
    localState = reducer(localState, localMoveIndependentChildAction);
    localState = reducer(localState, localEditAction);
    expect(localState.tasks.entities[PARENT_ID]?.title).toBe('Local edit after undo');
    expect(localState.projects.entities.project1?.backlogTaskIds).toContain(PARENT_ID);
    expect(localState.tasks.entities[INDEPENDENT_SUBTASK_ID]).toEqual(
      jasmine.objectContaining({
        parentId: undefined,
        projectId: '',
      }),
    );
    await opLogStore.append(localDelete, 'local');
    await opLogStore.append(localUndo, 'local');
    await opLogStore.append(localConvertIndependentChild, 'local');
    await opLogStore.append(localMoveIndependentChild, 'local');
    await opLogStore.append(localEdit, 'local');

    await resolver.autoResolveConflictsLWW([
      {
        entityType: 'TASK',
        entityId: PARENT_ID,
        localOps: [localDelete, localUndo, localEdit],
        remoteOps: [remoteRestore],
        suggestedResolution: 'manual',
      },
    ]);

    expect(localState.tasks.entities[PARENT_ID]?.title).toBe('Remote restore winner');
    expect(localState.tasks.entities[SUBTASK_ID]?.title).toBe('Remote restored subtask');
    expect(localState.tasks.entities[MISSING_ARCHIVE_SUBTASK_ID]?.title).toBe(
      'Local undo child missing from remote snapshot',
    );
    expect(localState.tasks.entities[MISSING_ARCHIVE_SUBTASK_ID]).toEqual(
      jasmine.objectContaining({
        dueDay: undefined,
        dueWithTime: undefined,
        remindAt: undefined,
      }),
    );
    expect(localState.projects.entities.project1?.taskIds).toContain(PARENT_ID);
    expect(localState.projects.entities.project1?.backlogTaskIds).not.toContain(
      PARENT_ID,
    );
    expect(localState.tasks.entities[INDEPENDENT_SUBTASK_ID]).toEqual(
      jasmine.objectContaining({
        title: 'Local undo child later moved independently',
        parentId: undefined,
        projectId: '',
      }),
    );
    expect(localState.tasks.entities[PARENT_ID]?.subTaskIds).not.toContain(
      INDEPENDENT_SUBTASK_ID,
    );

    const storedEntries = await opLogStore.getOpsAfterSeq(0);
    const storedOperations = storedEntries.map(({ op }) => op);
    for (const localOp of [localDelete, localUndo, localEdit]) {
      expect(
        storedEntries.find(({ op }) => op.id === localOp.id)?.rejectedAt,
      ).toBeDefined();
    }
    const storedRestore = storedOperations.find(({ id }) => id === remoteRestore.id);
    if (!storedRestore) {
      throw new Error('Resolved restore operation was not persisted');
    }
    expect(storedRestore.actionType).toBe(TaskSharedActions.restoreTask.type);
    expect(convertOpToAction(storedRestore).meta.recreatesEntityAfterDelete).toBe(
      undefined,
    );
    const rootCompensation = storedOperations.find(
      (op) =>
        op.entityId === PARENT_ID &&
        isLwwUpdatePayload(op.payload) &&
        op.payload.recreatesEntityAfterDelete === true &&
        op.payload.lwwUpdateMode === 'replace',
    );
    expect(rootCompensation).toBeDefined();
    expect(rootCompensation?.entityIds).toEqual([PARENT_ID]);
    expect(
      rootCompensation && isLwwUpdatePayload(rootCompensation.payload)
        ? {
            title: rootCompensation.payload.actionPayload['title'],
            projectMoveFootprint: rootCompensation.payload.projectMoveFootprint,
          }
        : undefined,
    ).toEqual({
      title: 'Remote restore winner',
      projectMoveFootprint: [PARENT_ID],
    });
    const localOpIds = new Set([localDelete.id, localUndo.id, localEdit.id]);
    const independentChildOpIds = new Set([
      localConvertIndependentChild.id,
      localMoveIndependentChild.id,
    ]);
    const originalOpIds = new Set([
      ...localOpIds,
      ...independentChildOpIds,
      remoteRestore.id,
    ]);
    const acceptedOperations = [
      remoteRestore,
      localConvertIndependentChild,
      localMoveIndependentChild,
      ...storedOperations.filter((operation) => !originalOpIds.has(operation.id)),
    ];
    const passiveState = replay(deletedState, acceptedOperations);
    expect(restoredProjection(passiveState)).toEqual(restoredProjection(localState));
    const passiveMissingSubtask = passiveState.tasks.entities[MISSING_ARCHIVE_SUBTASK_ID];
    const liveMissingSubtask = localState.tasks.entities[MISSING_ARCHIVE_SUBTASK_ID];
    expect({
      id: passiveMissingSubtask?.id,
      title: passiveMissingSubtask?.title,
      parentId: passiveMissingSubtask?.parentId,
      projectId: passiveMissingSubtask?.projectId,
      dueDay: passiveMissingSubtask?.dueDay,
      dueWithTime: passiveMissingSubtask?.dueWithTime,
      remindAt: passiveMissingSubtask?.remindAt,
    }).toEqual({
      id: liveMissingSubtask?.id,
      title: liveMissingSubtask?.title,
      parentId: liveMissingSubtask?.parentId,
      projectId: liveMissingSubtask?.projectId,
      dueDay: liveMissingSubtask?.dueDay,
      dueWithTime: liveMissingSubtask?.dueWithTime,
      remindAt: liveMissingSubtask?.remindAt,
    });
    expect(passiveState.tasks.entities[INDEPENDENT_SUBTASK_ID]).toEqual(
      jasmine.objectContaining({
        parentId: undefined,
        projectId: '',
      }),
    );
    const restartedState = replay(partialInitialState, storedOperations);
    expect(restoredProjection(restartedState)).toEqual(restoredProjection(localState));
    expect(restartedState.tasks.entities[INDEPENDENT_SUBTASK_ID]).toEqual(
      jasmine.objectContaining({
        parentId: undefined,
        projectId: '',
      }),
    );
  });

  it('orders same-batch restore dependencies before compensation and restart replay', async () => {
    const localClient = new TestClient(LOCAL_CLIENT_ID);
    const remoteClient = new TestClient(REMOTE_CLIENT_ID);
    const dependencyClient = new TestClient('dependency-client');
    const localRoot: Task = {
      ...deletedParent,
      subTaskIds: [],
      tagIds: [],
      repeatCfgId: undefined,
    };
    const project1 = initialState.projects.entities.project1;
    if (!project1) {
      throw new Error('Test fixture project1 is missing');
    }
    const dependencyInitialState: RootState = {
      ...initialState,
      tasks: {
        ...initialState.tasks,
        ids: [PARENT_ID],
        entities: { [PARENT_ID]: localRoot },
      },
      projects: {
        ...initialState.projects,
        entities: {
          ...initialState.projects.entities,
          project1: {
            ...project1,
            taskIds: [PARENT_ID],
            backlogTaskIds: [],
          },
        },
      },
    };
    const deleteAction = TaskSharedActions.deleteTask({
      task: { ...localRoot, subTasks: [] },
    }) as PersistentAction;
    const localUndoAction = TaskSharedActions.restoreDeletedTask({
      task: { ...localRoot, title: 'Local undo', subTasks: [] },
      projectContext: {
        projectId: 'project1',
        taskIdsForProject: [PARENT_ID],
        taskIdsForProjectBacklog: [],
      },
      tagTaskIdMap: {},
      deletedTaskEntities: {
        [PARENT_ID]: { ...localRoot, title: 'Local undo' },
      },
    }) as PersistentAction;
    const restoreProject = {
      ...DEFAULT_PROJECT,
      id: RESTORE_PROJECT_ID,
      title: 'Restore project',
      taskIds: [],
      backlogTaskIds: [],
    };
    const restoreTag = {
      ...DEFAULT_TAG,
      id: RESTORE_TAG_ID,
      title: 'Restore tag',
      taskIds: [],
    };
    const restoreRepeatCfg: TaskRepeatCfg = {
      ...DEFAULT_TASK_REPEAT_CFG,
      id: RESTORE_REPEAT_CFG_ID,
      projectId: RESTORE_PROJECT_ID,
      tagIds: [RESTORE_TAG_ID],
    };
    const remoteRestoredRoot: Task = {
      ...localRoot,
      title: 'Remote restore with dependencies',
      projectId: RESTORE_PROJECT_ID,
      tagIds: [RESTORE_TAG_ID],
      repeatCfgId: RESTORE_REPEAT_CFG_ID,
    };
    const addProjectAction = addProject({
      project: restoreProject,
    }) as PersistentAction;
    const updateProjectAction = updateProject({
      project: {
        id: RESTORE_PROJECT_ID,
        changes: { title: 'Updated restore project' },
      },
    }) as PersistentAction;
    const addTagAction = addTag({ tag: restoreTag }) as PersistentAction;
    const addRepeatCfgAction = addTaskRepeatCfgToTask({
      taskId: PARENT_ID,
      taskRepeatCfg: restoreRepeatCfg,
    }) as PersistentAction;
    const remoteRestoreAction = TaskSharedActions.restoreTask({
      task: remoteRestoredRoot,
      subTasks: [],
      restoreToToday: {
        today: RESTORE_DAY,
        startOfNextDayDiffMs: 0,
      },
    }) as PersistentAction;
    const localDelete = captureOperation(deleteAction, localClient, 1_000);
    const localUndo = captureOperation(localUndoAction, localClient, 1_500);
    const remoteProjectCreate = captureOperation(
      addProjectAction,
      dependencyClient,
      1_700,
    );
    const remoteProjectUpdate = captureOperation(
      updateProjectAction,
      dependencyClient,
      1_750,
    );
    const remoteTagCreate = captureOperation(addTagAction, dependencyClient, 1_800);
    const remoteRepeatCfgCreate = captureOperation(
      addRepeatCfgAction,
      dependencyClient,
      1_900,
    );
    const remoteRestore = captureOperation(remoteRestoreAction, remoteClient, 2_000);

    const deletedState = reducer(dependencyInitialState, deleteAction);
    localState = reducer(deletedState, localUndoAction);
    await opLogStore.append(localDelete, 'local');
    await opLogStore.append(localUndo, 'local');
    await opLogStore.append(remoteProjectCreate, 'remote', { pendingApply: true });

    await resolver.autoResolveConflictsLWW(
      [
        {
          entityType: 'TASK',
          entityId: PARENT_ID,
          localOps: [localDelete, localUndo],
          remoteOps: [remoteRestore],
          suggestedResolution: 'manual',
        },
      ],
      [remoteProjectCreate, remoteProjectUpdate, remoteTagCreate, remoteRepeatCfgCreate],
    );

    const dependencyProjection = (state: RootState): object => {
      const restoredTask = state.tasks.entities[PARENT_ID];
      return {
        task: {
          id: restoredTask?.id,
          projectId: restoredTask?.projectId,
          tagIds: restoredTask?.tagIds,
          repeatCfgId: restoredTask?.repeatCfgId,
        },
        projectTaskIds: state.projects.entities[RESTORE_PROJECT_ID]?.taskIds,
        projectTitle: state.projects.entities[RESTORE_PROJECT_ID]?.title,
        tagTaskIds: state[TAG_FEATURE_NAME].entities[RESTORE_TAG_ID]?.taskIds,
        repeatCfgId:
          state[TASK_REPEAT_CFG_FEATURE_NAME].entities[RESTORE_REPEAT_CFG_ID]?.id,
      };
    };
    const expectedProjection = {
      task: {
        id: PARENT_ID,
        projectId: RESTORE_PROJECT_ID,
        tagIds: [RESTORE_TAG_ID],
        repeatCfgId: RESTORE_REPEAT_CFG_ID,
      },
      projectTaskIds: [PARENT_ID],
      projectTitle: 'Updated restore project',
      tagTaskIds: [PARENT_ID],
      repeatCfgId: RESTORE_REPEAT_CFG_ID,
    };
    expect(dependencyProjection(localState)).toEqual(expectedProjection);

    const storedEntries = await opLogStore.getOpsAfterSeq(0);
    const storedOperations = storedEntries.map(({ op }) => op);
    const seqByOpId = new Map(storedEntries.map(({ op, seq }) => [op.id, seq]));
    const restoreSeq = seqByOpId.get(remoteRestore.id);
    if (restoreSeq === undefined) {
      throw new Error('Resolved restore operation was not persisted');
    }
    for (const dependencyOp of [
      remoteProjectCreate,
      remoteProjectUpdate,
      remoteTagCreate,
      remoteRepeatCfgCreate,
    ]) {
      expect(seqByOpId.get(dependencyOp.id)).toBeLessThan(restoreSeq);
    }
    expect(seqByOpId.get(remoteProjectCreate.id)).toBeLessThan(
      seqByOpId.get(remoteProjectUpdate.id)!,
    );
    const rootCompensation = storedOperations.find(
      (op) =>
        op.entityId === PARENT_ID &&
        isLwwUpdatePayload(op.payload) &&
        op.payload.recreatesEntityAfterDelete === true &&
        op.payload.lwwUpdateMode === 'replace',
    );
    expect(
      rootCompensation && isLwwUpdatePayload(rootCompensation.payload)
        ? rootCompensation.payload.actionPayload
        : undefined,
    ).toEqual(
      jasmine.objectContaining({
        projectId: RESTORE_PROJECT_ID,
        tagIds: [RESTORE_TAG_ID],
        repeatCfgId: RESTORE_REPEAT_CFG_ID,
      }),
    );

    const rejectedLocalOpIds = new Set([localDelete.id, localUndo.id]);
    expect(
      dependencyProjection(
        replay(
          deletedState,
          storedOperations.filter((op) => !rejectedLocalOpIds.has(op.id)),
        ),
      ),
    ).toEqual(expectedProjection);
    expect(
      dependencyProjection(replay(dependencyInitialState, storedOperations)),
    ).toEqual(expectedProjection);
  });

  it('orders an updated pending dependency before multiple winning restores', async () => {
    const localClient = new TestClient(LOCAL_CLIENT_ID);
    const dependencyClient = new TestClient('dependency-client');
    const localRoot: Task = {
      ...deletedParent,
      subTaskIds: [],
      tagIds: [],
      repeatCfgId: undefined,
    };
    const rootOnlyInitialState: RootState = {
      ...initialState,
      tasks: {
        ...initialState.tasks,
        ids: [PARENT_ID],
        entities: { [PARENT_ID]: localRoot },
      },
    };
    const deleteAction = TaskSharedActions.deleteTask({
      task: { ...localRoot, subTasks: [] },
    }) as PersistentAction;
    const localUndoAction = TaskSharedActions.restoreDeletedTask({
      task: { ...localRoot, title: 'Local undo', subTasks: [] },
      projectContext: {
        projectId: 'project1',
        taskIdsForProject: [PARENT_ID],
        taskIdsForProjectBacklog: [],
      },
      tagTaskIdMap: {},
      deletedTaskEntities: {
        [PARENT_ID]: { ...localRoot, title: 'Local undo' },
      },
    }) as PersistentAction;
    const localDelete = captureOperation(deleteAction, localClient, 1_000);
    const localUndo = captureOperation(localUndoAction, localClient, 1_500);
    const projectCreate = captureOperation(
      addProject({
        project: {
          ...DEFAULT_PROJECT,
          id: RESTORE_PROJECT_ID,
          title: 'Restore project',
          taskIds: [],
          backlogTaskIds: [],
        },
      }) as PersistentAction,
      dependencyClient,
      1_700,
    );
    const projectUpdate = captureOperation(
      updateProject({
        project: {
          id: RESTORE_PROJECT_ID,
          changes: { title: 'Updated restore project' },
        },
      }) as PersistentAction,
      dependencyClient,
      1_800,
    );
    const createRemoteRestore = (
      client: TestClient,
      title: string,
      timestamp: number,
    ): Operation =>
      captureOperation(
        TaskSharedActions.restoreTask({
          task: { ...localRoot, title, projectId: RESTORE_PROJECT_ID },
          subTasks: [],
          restoreToToday: {
            today: RESTORE_DAY,
            startOfNextDayDiffMs: 0,
          },
        }) as PersistentAction,
        client,
        timestamp,
      );
    const remoteRestores = [
      createRemoteRestore(
        new TestClient(REMOTE_CLIENT_ID),
        'First remote restore',
        2_000,
      ),
      createRemoteRestore(
        new TestClient('second-restore-client'),
        'Second remote restore',
        2_100,
      ),
    ];

    localState = reducer(rootOnlyInitialState, deleteAction);
    localState = reducer(localState, localUndoAction);
    await opLogStore.append(localDelete, 'local');
    await opLogStore.append(localUndo, 'local');

    await resolver.autoResolveConflictsLWW(
      remoteRestores.map((remoteRestore) => ({
        entityType: 'TASK',
        entityId: PARENT_ID,
        localOps: [localDelete, localUndo],
        remoteOps: [remoteRestore],
        suggestedResolution: 'manual',
      })),
      [projectCreate, projectUpdate],
      {
        remoteOpsInOrder: [projectCreate, projectUpdate, ...remoteRestores],
      },
    );

    const storedOperations = (await opLogStore.getOpsAfterSeq(0)).map(({ op }) => op);
    const rootCompensations = storedOperations.filter(
      (op) =>
        op.entityId === PARENT_ID &&
        isLwwUpdatePayload(op.payload) &&
        op.payload.recreatesEntityAfterDelete === true &&
        op.payload.lwwUpdateMode === 'replace',
    );
    expect(rootCompensations.length).toBe(1);
    const rootCompensation = rootCompensations[0];
    const seqByOpId = new Map(
      (await opLogStore.getOpsAfterSeq(0)).map(({ op, seq }) => [op.id, seq]),
    );
    expect(seqByOpId.get(projectCreate.id)).toBeLessThan(
      seqByOpId.get(projectUpdate.id)!,
    );
    expect(seqByOpId.get(projectUpdate.id)).toBeLessThan(
      seqByOpId.get(remoteRestores[0].id)!,
    );
    expect(seqByOpId.get(remoteRestores[0].id)).toBeLessThan(
      seqByOpId.get(rootCompensation.id)!,
    );
    expect(seqByOpId.get(rootCompensation.id)).toBeLessThan(
      seqByOpId.get(remoteRestores[1].id)!,
    );
    expect(localState.projects.entities[RESTORE_PROJECT_ID]).toEqual(
      jasmine.objectContaining({
        id: RESTORE_PROJECT_ID,
        title: 'Updated restore project',
      }),
    );
    expect(localState.tasks.entities[PARENT_ID]).toEqual(
      jasmine.objectContaining({
        title: 'First remote restore',
        projectId: RESTORE_PROJECT_ID,
      }),
    );
    const restartedState = replay(rootOnlyInitialState, storedOperations);
    expect(restartedState.projects.entities[RESTORE_PROJECT_ID]?.title).toBe(
      'Updated restore project',
    );
    expect(restartedState.tasks.entities[PARENT_ID]).toEqual(
      jasmine.objectContaining({
        title: 'First remote restore',
        projectId: RESTORE_PROJECT_ID,
      }),
    );
  });
});
