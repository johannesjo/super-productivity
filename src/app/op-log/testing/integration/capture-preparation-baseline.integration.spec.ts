import { TestBed } from '@angular/core/testing';
import { classifyOpAgainstSyncImport } from '@sp/sync-core';
import { VectorClock } from '../../../core/util/vector-clock';
import { Operation, OpType } from '../../core/operation.types';
import { ActionType } from '../../core/action-types.enum';
import { OperationLogStoreService } from '../../persistence/operation-log-store.service';
import { CURRENT_SCHEMA_VERSION } from '../../persistence/schema-migration.service';
import { VectorClockService } from '../../sync/vector-clock.service';
import { readCapturePreparationClock } from '../capture-preparation-clock';
import { createMinimalTaskPayload } from './helpers/operation-factory.helper';

/**
 * Stage A step 1: which state may a prepared capture depend on?
 *
 * The publication experiment prepares its candidate clock from
 * `readCapturePreparationClock()`, which merges the durable clock with
 * `getFullVectorClock()`. The durable clock advances only when reducers commit
 * (`markReducersCommittedAndMergeClocks`), so on its own it is evidence of
 * APPLIED state. `getFullVectorClock()` merges every retained op regardless of
 * whether it applied, so the merge downgrades that evidence to "downloaded".
 *
 * These cases reproduce the consequence for a full-state replacement the device
 * never applied: rejected, failed, and still-pending. In every case the
 * candidate inherits the replacement's counters and the server's publication
 * gate — the same `classifyOpAgainstSyncImport` the harness runs inside the
 * upload transaction — accepts it, committing a terminal receipt from a device
 * that never reached the replacement's state.
 *
 * Required result (not yet implemented): the capture stays pending until the
 * app has a valid, applied baseline. These specs therefore assert the CURRENT
 * unsafe outcome. A fix must flip them to the required result rather than
 * delete them; the contrast assertion in each case shows the applied-only
 * baseline already produces it.
 */
describe('Capture preparation baseline (integration, real op-log store)', () => {
  const DEVICE_A = 'device-a';
  const IMPORTING_DEVICE = 'device-b';
  const CAPTURE_ACTOR = 'agent-capture-1';

  /** The clock the other device's accepted SYNC_IMPORT carries on the server. */
  const IMPORT_CLOCK: VectorClock = { [IMPORTING_DEVICE]: 4, [DEVICE_A]: 1 };

  let store: OperationLogStoreService;
  let clocks: VectorClockService;

  const createOp = (
    id: string,
    overrides: Partial<Operation> & Pick<Operation, 'clientId' | 'vectorClock'>,
  ): Operation => ({
    id,
    actionType: ActionType.TASK_SHARED_ADD,
    opType: OpType.Create,
    entityType: 'TASK',
    entityId: id,
    payload: createMinimalTaskPayload(id, { title: `Task ${id}` }),
    timestamp: Date.now(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    ...overrides,
  });

  const createImportOp = (): Operation =>
    createOp('remote-import', {
      opType: OpType.SyncImport,
      entityType: 'TASK',
      clientId: IMPORTING_DEVICE,
      vectorClock: IMPORT_CLOCK,
    });

  /**
   * Seeds the shared fixture: this device applied one ordinary task, then
   * downloaded another device's full-state import. The caller decides how that
   * import ends up — rejected, failed, or still pending — but in none of them
   * does it reach the durable clock, exactly as if its reducers never ran.
   */
  const seedAppliedLocalWorkAndDownloadedImport = async (): Promise<Operation> => {
    await store.setVectorClock({ [DEVICE_A]: 1 });
    const importOp = createImportOp();
    await store.append(importOp, 'remote', { pendingApply: true });
    return importOp;
  };

  /** Builds the candidate exactly as the publication helper does. */
  const buildCandidateClock = (preparationClock: VectorClock): VectorClock => ({
    ...preparationClock,
    [CAPTURE_ACTOR]: 1,
  });

  /** The server-side publication gate, unchanged. */
  const wouldPublish = (candidateClock: VectorClock): boolean =>
    classifyOpAgainstSyncImport(
      { clientId: CAPTURE_ACTOR, vectorClock: candidateClock },
      { clientId: IMPORTING_DEVICE, vectorClock: IMPORT_CLOCK },
    ).shouldKeep;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [OperationLogStoreService, VectorClockService],
    });
    store = TestBed.inject(OperationLogStoreService);
    clocks = TestBed.inject(VectorClockService);
    await store.init();
    await store._clearAllDataForTesting();
  });

  it('should keep the durable clock free of a downloaded-but-unapplied replacement', async () => {
    await seedAppliedLocalWorkAndDownloadedImport();

    // The applied-state evidence is intact: only this device's own committed
    // work is in the durable clock. Everything below is the merge losing it.
    expect(await clocks.getCurrentVectorClock()).toEqual({ [DEVICE_A]: 1 });
    expect(wouldPublish(buildCandidateClock({ [DEVICE_A]: 1 }))).toBeFalse();
  });

  it('should currently publish a capture prepared over a REJECTED replacement', async () => {
    const importOp = await seedAppliedLocalWorkAndDownloadedImport();
    await store.markRejected([importOp.id]);

    // The app's own applied-baseline reader correctly refuses the rejected
    // import: this device has NO established replacement baseline at all.
    expect(await store.getLatestFullStateOpEntry()).toBeUndefined();

    const preparationClock = await readCapturePreparationClock(clocks);

    // REPRODUCTION: preparation claims the replacement anyway.
    expect(preparationClock[IMPORTING_DEVICE]).toBe(4);
    expect(wouldPublish(buildCandidateClock(preparationClock))).toBeTrue();

    // Required result, already reachable from applied state alone.
    expect(wouldPublish(buildCandidateClock(await clocks.getCurrentVectorClock()))).toBe(
      false,
    );
  });

  it('should currently publish a capture prepared over a FAILED replacement', async () => {
    const importOp = await seedAppliedLocalWorkAndDownloadedImport();
    await store.markFailed([importOp.id]);

    // Ordinary sync is blocked here — the incomplete-remote gate sees the
    // failure. Capture preparation consults no equivalent gate.
    expect((await store.getFailedRemoteOps()).map((entry) => entry.op.id)).toEqual([
      importOp.id,
    ]);
    // Worse than the rejected case: the applied-baseline reader cannot tell a
    // failed import from an applied one, so it reports this as the baseline.
    expect((await store.getLatestFullStateOpEntry())?.op.id).toBe(importOp.id);

    const preparationClock = await readCapturePreparationClock(clocks);

    expect(preparationClock[IMPORTING_DEVICE]).toBe(4);
    expect(wouldPublish(buildCandidateClock(preparationClock))).toBeTrue();
    expect(wouldPublish(buildCandidateClock(await clocks.getCurrentVectorClock()))).toBe(
      false,
    );
  });

  it('should currently publish a capture prepared over a PENDING replacement', async () => {
    const importOp = await seedAppliedLocalWorkAndDownloadedImport();

    // Downloaded, reducers not yet committed. Ordinary sync is blocked.
    expect((await store.getPendingRemoteOps()).map((entry) => entry.op.id)).toEqual([
      importOp.id,
    ]);

    const preparationClock = await readCapturePreparationClock(clocks);

    expect(preparationClock[IMPORTING_DEVICE]).toBe(4);
    expect(wouldPublish(buildCandidateClock(preparationClock))).toBeTrue();
    expect(wouldPublish(buildCandidateClock(await clocks.getCurrentVectorClock()))).toBe(
      false,
    );
  });

  it('should still carry a replacement this device actually applied', async () => {
    // Control: the applied case must keep passing the gate. Any fix has to
    // preserve this, and dropping the merge does — the reducer checkpoint puts
    // an applied remote import into the durable clock by itself.
    const importOp = createImportOp();
    const seq = await store.append(importOp, 'remote', { pendingApply: true });
    await store.markReducersCommittedAndMergeClocks([seq], [importOp]);

    const preparationClock = await readCapturePreparationClock(clocks);

    expect(preparationClock[IMPORTING_DEVICE]).toBe(4);
    expect(wouldPublish(buildCandidateClock(preparationClock))).toBeTrue();
  });

  it('should still carry a LOCAL import the durable clock has not caught up to', async () => {
    // The counter-case, and the reason the merge was added: the originally
    // reproduced loss was a device that imported a backup and chose "Use My
    // Data", writing a SYNC_IMPORT at its own counter 3 while its persisted
    // clock stayed at 2. Here the retained log is the ONLY evidence of applied
    // state, so the durable clock alone loses the capture.
    //
    // Together with the three cases above this is the open question: the same
    // reader must include this import and exclude an unapplied one, and neither
    // source can do both. Dropping the merge is therefore not the fix.
    await store.setVectorClock({ [DEVICE_A]: 2 });
    const localImport = createOp('local-import', {
      opType: OpType.SyncImport,
      clientId: DEVICE_A,
      vectorClock: { [DEVICE_A]: 3 },
    });
    await store.append(localImport, 'local');
    const localImportBoundary = { clientId: DEVICE_A, vectorClock: { [DEVICE_A]: 3 } };
    const classifyAgainstLocalImport = (candidateClock: VectorClock): boolean =>
      classifyOpAgainstSyncImport(
        { clientId: CAPTURE_ACTOR, vectorClock: candidateClock },
        localImportBoundary,
      ).shouldKeep;

    expect(await clocks.getCurrentVectorClock()).toEqual({ [DEVICE_A]: 2 });
    expect(
      classifyAgainstLocalImport(
        buildCandidateClock(await clocks.getCurrentVectorClock()),
      ),
    ).toBeFalse();

    const preparationClock = await readCapturePreparationClock(clocks);

    expect(preparationClock[DEVICE_A]).toBe(3);
    expect(classifyAgainstLocalImport(buildCandidateClock(preparationClock))).toBeTrue();
  });
});
