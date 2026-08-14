import { TestBed } from '@angular/core/testing';
import { Injector, runInInjectionContext } from '@angular/core';
import { OperationLogStoreService } from '../../persistence/operation-log-store.service';
import { OperationLogSnapshotService } from '../../persistence/operation-log-snapshot.service';
import { OperationLogCompactionService } from '../../persistence/operation-log-compaction.service';
import { TabSeqFrontierService } from '../../persistence/tab-seq-frontier.service';
import { VectorClockService } from '../../sync/vector-clock.service';
import { StateSnapshotService } from '../../backup/state-snapshot.service';
import { ValidateStateService } from '../../validation/validate-state.service';
import { OpType } from '../../core/operation.types';
import { TestClient, resetTestUuidCounter } from './helpers/test-client.helper';
import { clearDeferredActions } from '../../capture/operation-capture.meta-reducer';
import {
  createMinimalTaskPayload,
  createTaskOperation,
} from './helpers/operation-factory.helper';

/**
 * Reproduction for #9438: a snapshot/compaction save reads this tab's live
 * NgRx state but anchors `lastAppliedOpSeq` at the shared store's global max
 * seq. An op appended by a CONCURRENT TAB before the save's lock was taken is
 * then counted as applied while its effect is absent from the captured state,
 * and the next boot's tail replay (`getOpsAfterSeq(anchor)`) silently skips
 * it.
 *
 * The concurrent tab is simulated faithfully: a second OperationLogStoreService
 * instance over the SAME database, whose writes do not tick this tab's
 * frontier tracker — exactly like a real foreign tab (tabs share IndexedDB but
 * not JS state).
 */
describe('Multi-tab frontier guard (#9438)', () => {
  let storeService: OperationLogStoreService;
  let foreignStore: OperationLogStoreService;
  let snapshotService: OperationLogSnapshotService;
  let compactionService: OperationLogCompactionService;
  let frontier: TabSeqFrontierService;
  let mockStateSnapshot: jasmine.SpyObj<StateSnapshotService>;
  let client: TestClient;
  let foreignClient: TestClient;

  const TASK_ID = 'task-1';
  const meaningfulState = {
    task: {
      ids: [TASK_ID],
      entities: { [TASK_ID]: createMinimalTaskPayload(TASK_ID, { title: 'Task 1' }) },
    },
    project: { ids: [], entities: {} },
    tag: { ids: [], entities: {} },
    note: { ids: [], entities: {} },
    globalConfig: {},
  } as any;

  beforeEach(async () => {
    mockStateSnapshot = jasmine.createSpyObj('StateSnapshotService', [
      'getStateSnapshot',
      'getStateSnapshotForOperationLog',
    ]);
    mockStateSnapshot.getStateSnapshot.and.returnValue(meaningfulState);
    mockStateSnapshot.getStateSnapshotForOperationLog.and.returnValue(meaningfulState);

    TestBed.configureTestingModule({
      providers: [
        OperationLogStoreService,
        OperationLogSnapshotService,
        OperationLogCompactionService,
        VectorClockService,
        { provide: StateSnapshotService, useValue: mockStateSnapshot },
        // Only used by the migrate path, never by the save path under test —
        // mocked because the real one drags in the NgRx Store.
        {
          provide: ValidateStateService,
          useValue: jasmine.createSpyObj('ValidateStateService', [
            'validateState',
            'validateAndRepair',
          ]),
        },
      ],
    });

    storeService = TestBed.inject(OperationLogStoreService);
    snapshotService = TestBed.inject(OperationLogSnapshotService);
    compactionService = TestBed.inject(OperationLogCompactionService);
    frontier = TestBed.inject(TabSeqFrontierService);

    await storeService.init();
    await storeService._clearAllDataForTesting();
    resetTestUuidCounter();
    clearDeferredActions();

    // The foreign tab: same database, but its own (throwaway) frontier
    // tracker so its appends stay invisible to this tab's tracking — as in
    // a real separate tab.
    const foreignInjector = Injector.create({
      providers: [
        { provide: TabSeqFrontierService, useValue: new TabSeqFrontierService() },
      ],
      parent: TestBed.inject(Injector),
    });
    foreignStore = runInInjectionContext(
      foreignInjector,
      () => new OperationLogStoreService(),
    );
    await foreignStore.init();

    // Same clientId on both: real tabs share the on-disk client identity.
    client = new TestClient('client-tab');
    foreignClient = new TestClient('client-tab');
  });

  const appendOwnOps = async (count: number, idPrefix: string): Promise<number> => {
    let lastSeq = 0;
    for (let i = 1; i <= count; i++) {
      lastSeq = await storeService.append(
        createTaskOperation(client, `${idPrefix}-${i}`, OpType.Create, {
          title: `${idPrefix} ${i}`,
        }),
        'local',
      );
    }
    return lastSeq;
  };

  it('snapshot save must not anchor past an op appended by a concurrent tab', async () => {
    const hydratedSeq = await appendOwnOps(3, 'own');
    // What the hydrator does at the end of replay: this tab's state now
    // reflects exactly seqs 1..3.
    frontier.establishFrontier(hydratedSeq);

    const foreignSeq = await foreignStore.append(
      createTaskOperation(foreignClient, 'foreign-task', OpType.Create, {
        title: 'written by another tab',
      }),
      'local',
    );
    expect(foreignSeq).toBe(hydratedSeq + 1);

    const didSave = await snapshotService.saveCurrentStateAsSnapshot();

    // The foreign op's effect is NOT in this tab's captured state, so it must
    // remain beyond the persisted anchor (else the next boot's
    // getOpsAfterSeq(anchor) silently skips it).
    const cache = await storeService.loadStateCache();
    const anchor = cache?.lastAppliedOpSeq ?? 0;
    expect(anchor).toBeLessThan(foreignSeq);
    expect(didSave).toBe(false);
  });

  it('snapshot save must skip after an interleave even when the scalars align again', async () => {
    const hydratedSeq = await appendOwnOps(3, 'own');
    frontier.establishFrontier(hydratedSeq);

    // Foreign tab takes seq 4 …
    const foreignSeq = await foreignStore.append(
      createTaskOperation(foreignClient, 'foreign-task', OpType.Create, {
        title: 'written by another tab',
      }),
      'local',
    );
    // … then this tab's own next append returns seq 5: the global max now
    // equals this tab's latest own write, which is exactly the case a naive
    // scalar comparison gets wrong.
    const ownSeq = await storeService.append(
      createTaskOperation(client, 'own-after-interleave', OpType.Create, {
        title: 'own op after interleave',
      }),
      'local',
    );
    expect(ownSeq).toBe(foreignSeq + 1);

    const didSave = await snapshotService.saveCurrentStateAsSnapshot();

    const cache = await storeService.loadStateCache();
    const anchor = cache?.lastAppliedOpSeq ?? 0;
    expect(anchor).toBeLessThan(foreignSeq);
    expect(didSave).toBe(false);
  });

  it('compaction must not anchor past an op appended by a concurrent tab', async () => {
    const hydratedSeq = await appendOwnOps(3, 'own');
    frontier.establishFrontier(hydratedSeq);

    const foreignSeq = await foreignStore.append(
      createTaskOperation(foreignClient, 'foreign-task', OpType.Create, {
        title: 'written by another tab',
      }),
      'local',
    );

    const didCompact = await compactionService.compact();

    const cache = await storeService.loadStateCache();
    const anchor = cache?.lastAppliedOpSeq ?? 0;
    expect(anchor).toBeLessThan(foreignSeq);
    expect(didCompact).toBe(false);

    // The foreign op must still be delivered by the next boot's tail replay.
    const tail = await storeService.getOpsAfterSeq(anchor);
    expect(tail.some((entry) => entry.seq === foreignSeq)).toBe(true);
  });

  it('saves normally when only this tab has written since hydration (no false positive)', async () => {
    const hydratedSeq = await appendOwnOps(3, 'own');
    frontier.establishFrontier(hydratedSeq);
    const lastOwnSeq = await appendOwnOps(2, 'later');

    const didSave = await snapshotService.saveCurrentStateAsSnapshot();

    expect(didSave).toBe(true);
    const cache = await storeService.loadStateCache();
    expect(cache?.lastAppliedOpSeq).toBe(lastOwnSeq);
  });

  it('stays default-open while no frontier was established (pre-hydration behavior unchanged)', async () => {
    await appendOwnOps(3, 'own');
    const foreignSeq = await foreignStore.append(
      createTaskOperation(foreignClient, 'foreign-task', OpType.Create, {
        title: 'written by another tab',
      }),
      'local',
    );

    const didSave = await snapshotService.saveCurrentStateAsSnapshot();

    // Deliberately unguarded: production establishes during hydration before
    // any save path can run; unestablished callers keep pre-#9438 semantics.
    expect(didSave).toBe(true);
    const cache = await storeService.loadStateCache();
    expect(cache?.lastAppliedOpSeq).toBe(foreignSeq);
  });
});
