import { Injectable } from '@angular/core';
import { OpLog } from '../../core/log';

/**
 * Tracks the highest op-log seq whose effect is known to be applied to THIS
 * tab's live NgRx state (#9438).
 *
 * The shared OPS store is written by every tab of the same origin, but live
 * tabs do not exchange operation payloads: an op appended by a concurrent tab
 * is counted by `getLastSeq()` while its effect is absent from this tab's
 * state. Persisting that global max as a snapshot's `lastAppliedOpSeq` makes
 * the next boot's tail replay (`getOpsAfterSeq`) silently skip the op. The
 * writers that derive a state cache from live state (snapshot save,
 * compaction) therefore consult this tracker before trusting `getLastSeq()`.
 *
 * ## Semantics
 *
 * - `establishFrontier(seq)` — the live state now reflects exactly the ops up
 *   to `seq`. Called when hydration finishes a replay and when the store
 *   atomically installs a new state-cache baseline. Clears any divergence.
 * - `observeOwnWrite(seq)` — this tab appended an op whose reducer effect is
 *   in its state (capture persists after the reducer ran; remote applies hold
 *   the op-log lock across append+apply, so saves cannot observe the gap).
 *   Advances the frontier only contiguously: a skipped seq proves another
 *   tab's op interleaved below our own write, which a scalar frontier cannot
 *   represent — that sets a sticky divergence instead. The sticky flag is
 *   required because after such an interleave the tab's own next append makes
 *   the scalar values equal again (foreign seq 5, own append returns 6 →
 *   frontier 6 == global max 6) while state still lacks seq 5.
 * - `isSaveSafeAt(globalLastSeq)` — true when a state-derived cache write may
 *   anchor at `globalLastSeq`. While no frontier is established this returns
 *   true: hydration establishes before any save path runs in production, and
 *   defaulting open keeps the pre-#9438 behavior on any path that never
 *   establishes (a wiring gap then means "no new protection", never
 *   "snapshots permanently disabled").
 *
 * Divergence only clears on the next `establishFrontier` (re-hydration or a
 * baseline install), matching the skip-on-risk shape of the #8751/#7892
 * guards: skipping a save costs at most a slower next boot; the op-log stays
 * the source of truth. Single-instance platforms (Electron/Android) can never
 * observe a gap, so the guard is inert there.
 */
@Injectable({ providedIn: 'root' })
export class TabSeqFrontierService {
  private _frontier: number | null = null;
  private _hasForeignWrites = false;

  establishFrontier(seq: number): void {
    this._frontier = seq;
    this._hasForeignWrites = false;
  }

  observeOwnWrite(seq: number): void {
    if (this._frontier === null || seq <= this._frontier) {
      return;
    }
    if (seq !== this._frontier + 1 && !this._hasForeignWrites) {
      this._hasForeignWrites = true;
      OpLog.warn(
        'TabSeqFrontierService: own append skipped past the applied frontier — ' +
          'a concurrent tab is writing; state-derived cache writes are disabled ' +
          'until the next hydration (#9438)',
        { frontier: this._frontier, observedSeq: seq },
      );
    }
    // Keep advancing even when diverged so the log above stays meaningful;
    // the sticky flag alone decides save safety from here on.
    this._frontier = seq;
  }

  /** After an ops wipe the baseline is unknown — fall back to default-open. */
  resetToUnestablished(): void {
    this._frontier = null;
    this._hasForeignWrites = false;
  }

  isSaveSafeAt(globalLastSeq: number): boolean {
    if (this._frontier === null) {
      return true;
    }
    return !this._hasForeignWrites && globalLastSeq === this._frontier;
  }
}
