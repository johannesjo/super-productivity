import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action, Store } from '@ngrx/store';
import { Subject, Subscription } from 'rxjs';
import { SnackService } from '../../../core/snack/snack.service';
import { ClientIdService } from '../../../core/util/client-id.service';
import {
  addTaskToSection,
  deleteSection,
  removeTaskFromSection,
  updateSection,
  updateSectionOrder,
} from '../../../features/section/store/section.actions';
import { WorkContextType } from '../../../features/work-context/work-context.model';
import { OperationApplierService } from '../../apply/operation-applier.service';
import { OperationCaptureService } from '../../capture/operation-capture.service';
import { clearDeferredActions } from '../../capture/operation-capture.meta-reducer';
import { OperationLogEffects } from '../../capture/operation-log.effects';
import { buildEntityRegistry, ENTITY_REGISTRY } from '../../core/entity-registry';
import { UnsupportedMultiEntityConflictError } from '../../core/errors/sync-errors';
import { ActionType, EntityConflict, Operation } from '../../core/operation.types';
import {
  isPersistentAction,
  PersistentAction,
} from '../../core/persistent-action.interface';
import { OperationLogCompactionService } from '../../persistence/operation-log-compaction.service';
import { OperationLogStoreService } from '../../persistence/operation-log-store.service';
import { ConflictResolutionService } from '../../sync/conflict-resolution.service';
import { ImmediateUploadService } from '../../sync/immediate-upload.service';
import { OperationWriteFlushService } from '../../sync/operation-write-flush.service';
import { CLIENT_ID_PROVIDER } from '../../util/client-id.provider';
import { ValidateStateService } from '../../validation/validate-state.service';
import { resetTestUuidCounter, TestClient } from './helpers/test-client.helper';

/**
 * Pins a sync stop reported for triage, NOT desired behaviour.
 *
 * A cross-section drag (`addTaskToSection` with `sourceSectionId !==
 * sectionId`) declares two SECTION ids. When it meets a concurrent,
 * non-commuting edit of either section during download-time conflict
 * detection, `_assertMultiEntityPlansAreSafe` admits no path for it and
 * throws `UnsupportedMultiEntityConflictError` — the whole-dataset
 * "Keep local / Keep remote" dialog. Only the crossings recognized by
 * `areCommutingSectionOperations` (move vs removal of the same task from the
 * move's source, move vs section reorder) stay out of the conflict.
 *
 * When a fix lands, flip the `stops` cases to assert convergence instead.
 */
describe('cross-section task move vs concurrent section edit (sync stop triage)', () => {
  const LOCAL_CLIENT_ID = 'device-a';
  const REMOTE_CLIENT_ID = 'device-b';
  const PROJECT_ID = 'project-1';
  const S1 = 'section-1';
  const S2 = 'section-2';
  const S3 = 'section-3';
  const TASK = 'task-moved';
  const OTHER_TASK = 'task-other';

  let opLogStore: OperationLogStoreService;
  let capture: OperationCaptureService;
  let writeFlush: OperationWriteFlushService;
  let resolver: ConflictResolutionService;
  let operationApplier: jasmine.SpyObj<OperationApplierService>;
  let store: jasmine.SpyObj<Store>;
  let actions$: Subject<Action>;
  let effectSubscription: Subscription;

  beforeEach(async () => {
    resetTestUuidCounter();
    clearDeferredActions();
    actions$ = new Subject<Action>();
    store = jasmine.createSpyObj<Store>('Store', ['dispatch']);

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

    TestBed.configureTestingModule({
      providers: [
        ConflictResolutionService,
        OperationLogEffects,
        OperationLogStoreService,
        OperationCaptureService,
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
        { provide: ENTITY_REGISTRY, useValue: buildEntityRegistry() },
      ],
    });

    opLogStore = TestBed.inject(OperationLogStoreService);
    capture = TestBed.inject(OperationCaptureService);
    writeFlush = TestBed.inject(OperationWriteFlushService);
    resolver = TestBed.inject(ConflictResolutionService);
    capture.clear();
    store.dispatch.and.callFake(((action: Action): void => {
      if (!isPersistentAction(action)) {
        throw new Error('Expected a persistent section action');
      }
      capture.incrementPending(action);
      actions$.next(action);
    }) as Store['dispatch']);

    await opLogStore.init();
    await opLogStore._clearAllDataForTesting();
    effectSubscription =
      TestBed.inject(OperationLogEffects).persistOperation$.subscribe();
  });

  afterEach(async () => {
    await writeFlush.flushPendingWrites();
    effectSubscription.unsubscribe();
    actions$.complete();
    capture.clear();
    clearDeferredActions();
    await opLogStore._clearAllDataForTesting();
    TestBed.resetTestingModule();
  });

  // ── The user intents, as production dispatches them ──────────────────────

  /** Drag TASK from S1 to S2 (task-list.component.ts → addTaskToSection). */
  const moveTaskS1toS2 = (): PersistentAction =>
    addTaskToSection({
      sectionId: S2,
      taskId: TASK,
      afterTaskId: null,
      sourceSectionId: S1,
    }) as PersistentAction;

  const PAIRINGS: {
    name: string;
    userFlow: string;
    action: () => PersistentAction;
  }[] = [
    {
      name: 'collapse of the source section S1',
      userFlow: 'section header expand toggle (work-view.component.html)',
      action: () =>
        updateSection({
          section: { id: S1, changes: { isExpanded: false } },
        }) as PersistentAction,
    },
    {
      name: 'collapse of the destination section S2',
      userFlow: 'section header expand toggle (work-view.component.html)',
      action: () =>
        updateSection({
          section: { id: S2, changes: { isExpanded: false } },
        }) as PersistentAction,
    },
    {
      name: 'rename of the source section S1',
      userFlow: 'section menu → rename (work-view.component.ts)',
      action: () =>
        updateSection({
          section: { id: S1, changes: { title: 'Renamed' } },
        }) as PersistentAction,
    },
    {
      name: "another task's cross-section move S3 → S1",
      userFlow: 'drag a different task into S1',
      action: () =>
        addTaskToSection({
          sectionId: S1,
          taskId: OTHER_TASK,
          afterTaskId: null,
          sourceSectionId: S3,
        }) as PersistentAction,
    },
    {
      name: "another task's reorder within S2",
      userFlow: 'drag a different task inside S2',
      action: () =>
        addTaskToSection({
          sectionId: S2,
          taskId: OTHER_TASK,
          afterTaskId: null,
          sourceSectionId: S2,
        }) as PersistentAction,
    },
    {
      name: 'removal of another task from S1',
      userFlow: 'drag a different task out of S1 into the no-section bucket',
      action: () =>
        removeTaskFromSection({
          sectionId: S1,
          taskId: OTHER_TASK,
          workContextId: PROJECT_ID,
          workContextType: WorkContextType.PROJECT,
          workContextAfterTaskId: null,
        }) as PersistentAction,
    },
    {
      name: 'delete of the destination section S2',
      userFlow: 'section menu → delete',
      action: () => deleteSection({ id: S2 }) as PersistentAction,
    },
  ];

  const toRemoteOperation = (action: PersistentAction, timestamp: number): Operation => {
    const { type, meta, ...actionPayload } = action;
    const ids = meta.entityIds;
    return {
      ...new TestClient(REMOTE_CLIENT_ID).createOperation({
        actionType: type,
        opType: meta.opType,
        entityType: meta.entityType,
        entityId: ids?.[0] ?? (meta.entityId as string),
        entityIds: ids,
        payload: {
          actionPayload,
          entityChanges: capture.extractEntityChanges(action),
        },
      }),
      timestamp,
    };
  };

  const dispatchPendingLocal = async (action: PersistentAction): Promise<Operation> => {
    store.dispatch(action);
    await writeFlush.flushPendingWrites();
    const unsynced = await opLogStore.getUnsynced();
    expect(unsynced.length).toBe(1);
    return unsynced[0]!.op;
  };

  const detect = async (remoteOperation: Operation): Promise<EntityConflict[]> =>
    (
      await resolver.checkOpForConflicts(remoteOperation, {
        localPendingOpsByEntity: await opLogStore.getUnsyncedByEntity(),
        appliedFrontierByEntity: new Map(),
        retainedOpsByEntity: new Map(),
        snapshotVectorClock: undefined,
        snapshotEntityKeys: undefined,
        hasNoSnapshotClock: true,
      })
    ).conflicts;

  const resolve = async (conflicts: EntityConflict[]): Promise<unknown> => {
    try {
      await resolver.autoResolveConflictsLWW(conflicts);
      return undefined;
    } catch (error) {
      return error;
    }
  };

  const expectStop = (
    thrown: unknown,
    side: 'local' | 'remote',
    actionType: ActionType,
    entityCount: number,
  ): void => {
    expect(thrown).toBeInstanceOf(UnsupportedMultiEntityConflictError);
    expect((thrown as Error).message).toBe(
      `SYNC_MULTI_ENTITY_UNSUPPORTED side=${side} ` +
        `actionType=${actionType} entityCount=${entityCount}`,
    );
    expect(operationApplier.applyOperations).not.toHaveBeenCalled();
  };

  describe('stops (whole-dataset Keep local / Keep remote dialog)', () => {
    PAIRINGS.forEach(({ name, userFlow, action }) => {
      // Device A dragged TASK S1 → S2 and has not uploaded yet; device B's
      // concurrent edit arrives first. Pins a stop reported for triage.
      it(`A's pending move vs B's remote ${name} [${userFlow}]`, async () => {
        const local = await dispatchPendingLocal(moveTaskS1toS2());
        expect(local.entityIds).toEqual([S1, S2]);
        const remoteAction = action();
        const remote = toRemoteOperation(remoteAction, local.timestamp + 1);

        const conflicts = await detect(remote);
        expect(conflicts.length).toBeGreaterThan(0);

        const thrown = await resolve(conflicts);
        // A remote multi-entity op is checked first.
        if ((remoteAction.meta.entityIds?.length ?? 0) > 1) {
          expectStop(thrown, 'remote', remoteAction.type as ActionType, 2);
        } else {
          expectStop(thrown, 'local', ActionType.SECTION_ADD_TASK, 2);
        }
        expect((await opLogStore.getUnsynced()).map(({ op }) => op.id)).toEqual([
          local.id,
        ]);
      });

      // Device B's edit is pending; device A's move arrives first. Pins a
      // stop reported for triage.
      it(`B's pending ${name} vs A's remote move [${userFlow}]`, async () => {
        const local = await dispatchPendingLocal(action());
        const remote = toRemoteOperation(moveTaskS1toS2(), local.timestamp + 1);

        const conflicts = await detect(remote);
        expect(conflicts.length).toBeGreaterThan(0);

        const thrown = await resolve(conflicts);
        expectStop(thrown, 'remote', ActionType.SECTION_ADD_TASK, 2);
        expect((await opLogStore.getUnsynced()).map(({ op }) => op.id)).toEqual([
          local.id,
        ]);
      });
    });
  });

  describe('admitted crossings (no conflict raised)', () => {
    const ADMITTED: { name: string; action: () => PersistentAction }[] = [
      {
        name: 'section reorder listing S1 and S2',
        action: () =>
          updateSectionOrder({
            contextId: PROJECT_ID,
            ids: [S2, S1],
          }) as PersistentAction,
      },
      {
        name: 'removal of the same task from S1',
        action: () =>
          removeTaskFromSection({
            sectionId: S1,
            taskId: TASK,
            workContextId: PROJECT_ID,
            workContextType: WorkContextType.PROJECT,
            workContextAfterTaskId: null,
          }) as PersistentAction,
      },
    ];

    ADMITTED.forEach(({ name, action }) => {
      it(`A's pending move vs B's remote ${name}`, async () => {
        const local = await dispatchPendingLocal(moveTaskS1toS2());
        expect(await detect(toRemoteOperation(action(), local.timestamp + 1))).toEqual(
          [],
        );
      });

      it(`B's pending ${name} vs A's remote move`, async () => {
        const local = await dispatchPendingLocal(action());
        expect(
          await detect(toRemoteOperation(moveTaskS1toS2(), local.timestamp + 1)),
        ).toEqual([]);
      });
    });
  });
});
