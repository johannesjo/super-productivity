import { TestBed } from '@angular/core/testing';
import { classifyOpAgainstSyncImport } from '@sp/sync-core';
import { VectorClock } from '../../../core/util/vector-clock';
import { Operation, OpType } from '../../core/operation.types';
import { ActionType } from '../../core/action-types.enum';
import { OperationLogStoreService } from '../../persistence/operation-log-store.service';
import { CURRENT_SCHEMA_VERSION } from '../../persistence/schema-migration.service';
import { VectorClockService } from '../../sync/vector-clock.service';
import {
  findAppliedFullStateBaseline,
  findCapturePreparationBlocker,
  readCapturePreparationClock,
} from '../capture-preparation-clock';
import { createMinimalTaskPayload } from './helpers/operation-factory.helper';

/**
 * Stage A: which state may a prepared capture depend on?
 *
 * Answer, reproduced then fixed here: only state this device APPLIED. The
 * durable clock advances solely in `markReducersCommittedAndMergeClocks`, so it
 * is applied-state evidence; `getFullVectorClock()` merges every RETAINED op
 * regardless of outcome, so preparing from it once let a capture publish over a
 * replacement this device had rejected, failed to apply, or not yet applied.
 *
 * `readCapturePreparationClock()` now merges the durable clock with the newest
 * full-state replacement the device actually applied, and
 * `findCapturePreparationBlocker()` refuses preparation entirely while the
 * ordinary incomplete-remote conditions hold. The two cases at the end pin the
 * behavior the fix had to preserve: an applied remote import, and a local import
 * whose own counter ran ahead of the durable clock. Dropping the merge outright
 * satisfies the first four cases and breaks that last one.
 *
 * The gate is asserted alongside the clock because preparation also builds the
 * task from live state: a correct clock alone would still capture into state the
 * device has not caught up to.
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

  it('should stay pending for a capture prepared over a REJECTED replacement', async () => {
    const importOp = await seedAppliedLocalWorkAndDownloadedImport();
    await store.markRejected([importOp.id]);

    // This device has no established replacement baseline at all. Nothing is
    // mid-flight either, so the gate stays open and the clock has to carry it.
    expect(await store.getLatestFullStateOpEntry()).toBeUndefined();
    expect(await findAppliedFullStateBaseline(store)).toBeUndefined();
    expect(await findCapturePreparationBlocker(store)).toBeUndefined();

    const preparationClock = await readCapturePreparationClock(store, clocks);

    expect(preparationClock[IMPORTING_DEVICE]).toBeUndefined();
    expect(wouldPublish(buildCandidateClock(preparationClock))).toBeFalse();
  });

  it('should refuse to prepare a capture over a FAILED replacement', async () => {
    const importOp = await seedAppliedLocalWorkAndDownloadedImport();
    await store.markFailed([importOp.id]);

    expect(await findCapturePreparationBlocker(store)).toBe(
      '1 downloaded operation(s) failed to apply',
    );
    // The failure is why the gate is needed: `getLatestFullStateOpEntry()` still
    // names this import, because it only filters rejections.
    expect((await store.getLatestFullStateOpEntry())?.op.id).toBe(importOp.id);
    expect(await findAppliedFullStateBaseline(store)).toBeUndefined();

    const preparationClock = await readCapturePreparationClock(store, clocks);

    expect(preparationClock[IMPORTING_DEVICE]).toBeUndefined();
    expect(wouldPublish(buildCandidateClock(preparationClock))).toBeFalse();
  });

  it('should refuse to prepare a capture over a PENDING replacement', async () => {
    const importOp = await seedAppliedLocalWorkAndDownloadedImport();

    // Downloaded, reducers not yet committed.
    expect((await store.getPendingRemoteOps()).map((entry) => entry.op.id)).toEqual([
      importOp.id,
    ]);
    expect(await findCapturePreparationBlocker(store)).toBe(
      '1 downloaded operation(s) have not been applied',
    );
    expect(await findAppliedFullStateBaseline(store)).toBeUndefined();

    const preparationClock = await readCapturePreparationClock(store, clocks);

    expect(preparationClock[IMPORTING_DEVICE]).toBeUndefined();
    expect(wouldPublish(buildCandidateClock(preparationClock))).toBeFalse();
  });

  it('should still carry a replacement this device actually applied', async () => {
    // Control: the applied case must keep passing the gate. Any fix has to
    // preserve this. The reducer checkpoint puts an applied remote import into
    // the durable clock by itself, so this one passes on either source.
    const importOp = createImportOp();
    const seq = await store.append(importOp, 'remote', { pendingApply: true });
    await store.markReducersCommittedAndMergeClocks([seq], [importOp]);

    const preparationClock = await readCapturePreparationClock(store, clocks);

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
    // This is why the fix is an applied-baseline merge rather than dropping the
    // merge: the same reader must include this import and exclude an unapplied
    // one, and the durable clock alone cannot do both.
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

    const preparationClock = await readCapturePreparationClock(store, clocks);

    expect(preparationClock[DEVICE_A]).toBe(3);
    expect(classifyAgainstLocalImport(buildCandidateClock(preparationClock))).toBeTrue();
  });
});
