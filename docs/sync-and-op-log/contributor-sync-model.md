# The Contributor Sync Model

**The one thing to understand before writing any effect, reducer, or bulk
dispatch that touches synced state.**

Super Productivity syncs by replaying an operation log. Almost every sync
correctness rule you will hit is a facet of a **single invariant**:

> ## Each replay-atomic transition (normally one persistent action) = exactly one operation. Replayed and remote operations must never re-trigger effects.

“Intent” here means the transition that must remain indivisible during replay,
not necessarily an entire multi-step UI workflow. A workflow may deliberately
compose independent persistent actions when their normal local side effects and
per-entity conflict boundaries are part of the required behavior.

Reducers **must** run for remote/replayed operations (that is how state is
rebuilt). Effects **must not** — the UI side effect (snack, sound, navigation)
already happened on the originating client, and every persistent transition the
workflow deliberately emitted already has its own entry in the operation log.
Re-running effects on replay duplicates side effects and emits phantom
operations that conflict with sync.

Everything below is that invariant applied at three points.

---

## Boundary 1 — The action boundary

**Effects inject `LOCAL_ACTIONS`, never `inject(Actions)`.**

`LOCAL_ACTIONS` is the standard actions stream with `meta.isRemote` filtered
out (`src/app/util/local-actions.token.ts`). Remote/replayed operations are
applied as one `bulkApplyOperations` action; `LOCAL_ACTIONS` ensures your effect
only sees genuine local user intent.

- Default for **all** effects: `private _actions$ = inject(LOCAL_ACTIONS);`
- The only legitimate exception uses `ALL_ACTIONS` and handles `isRemote`
  itself: `operation-log.effects.ts` (captures/persists every action). You are
  almost certainly not adding a second.
- Remote **archive** side effects are _not_ an `ALL_ACTIONS` case:
  `archive-operation-handler.effects.ts` itself uses `LOCAL_ACTIONS`; the
  remote-client archive writes/deletes are driven separately by
  `OperationApplierService` → `ArchiveOperationHandler`.

✅ **Enforced by `local-rules/no-actions-in-effects`** — you cannot get this
wrong; the linter rejects `inject(Actions)` / `Actions` imports in
`*.effects.ts`.

## Boundary 2 — The selector boundary

**Selector-driven effects must guard with `skipDuringSyncWindow()`.**

An effect that reacts to a _selector_ (store state) instead of a specific
_action_ bypasses Boundary 1 entirely — it fires on every store change,
including hydration and sync replay. Two timing gaps (initial startup before
first sync; the post-sync re-evaluation window) make such effects emit
operations with stale vector clocks that immediately conflict.

- Use `skipDuringSyncWindow()` for selector-based effects that modify
  frequently-synced entities or perform "repair"/"consistency" work.
- The narrower `skipWhileApplyingRemoteOps()` /
  `HydrationStateService.isApplyingRemoteOps()` exist for finer control.
- **Prefer action-based effects.** A selector-based effect is the
  intuitive-but-usually-wrong choice; reach for it only when there is no
  action to key off.

✅ **Enforced by `local-rules/require-hydration-guard`** (existing rule).

## The atomicity rule — one replay-atomic transition, one op

**Multi-entity changes are meta-reducers, not effects. Bulk dispatch loops yield.**

- A transition that must replay atomically and touches more than one entity
  (e.g. deleting a tag also removing it from every task) must be **one reducer
  pass** so it becomes **one operation**. Put it in
  `src/app/root-store/meta/task-shared-meta-reducers/`, not in an effect that
  dispatches a fan-out of follow-up actions. An effect-based fan-out emits N
  operations for one atomic transition _and_ re-runs on replay (a restatement
  of Boundary 1).
- Do not collapse a broader UI workflow merely because it starts with one user
  gesture. Independent actions are appropriate when their normal local effects and
  entity-specific conflict boundaries matter. Project completion intentionally
  resolves tasks through ordinary per-task actions before flipping the project
  flag, accepting an unbounded N+1 operation count and a brief intermediate state.
  That is a known scalability residual for this rare semantic exception, not a
  precedent for new bulk fan-out; see
  [ADR #5: Project Completion](../../ARCHITECTURE-DECISIONS.md#5-project-completion-decoupled-resolution-over-atomic-multi-entity-op).
- `store.dispatch()` and NgRx reducers run synchronously; only the op-log
  persistence triggered by capture is asynchronous. After a loop of 50+
  dispatches, add one post-loop macrotask yield,
  `await new Promise((r) => setTimeout(r, 0))`, to protect capture ordering
  before a dependent follow-up action. It does not chunk or bound main-thread
  reducer work, and it does not reduce the N+1 upload amplification.

⚠️ `local-rules/no-multi-entity-effect` (`warn`) flags this heuristically — it
catches the array-literal fan-out shape (`map(() => [a(), b()])`), not every
multi-entity dispatch (e.g. a `of(a(), b())` varargs fan-out slips past). The
blessed pattern is a `task-shared-meta-reducers/` reducer.

---

## Decision table — "I'm writing an effect"

| Question                                                | Answer                                                        | Linter                               |
| ------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------ |
| Does it inject the actions stream?                      | Use `LOCAL_ACTIONS` (not `Actions`)                           | ✅ `no-actions-in-effects` (error)   |
| Does it react to a **selector** instead of an action?   | Add `skipDuringSyncWindow()`                                  | ✅ `require-hydration-guard` (error) |
| Does one replay-atomic transition change **>1 entity**? | Make it a meta-reducer, not an effect                         | ⚠️ `no-multi-entity-effect` (warn)   |
| Does it dispatch in a **loop of 50+**?                  | Yield once afterward for capture ordering; it is not batching | — (convention)                       |

Two of the three are mechanically enforced — you do not need to memorize them,
only understand _why_ (the invariant at the top).

---

## The sync-epoch fence (#9074)

A sync cycle spans many `await`s; a destructive config change (provider/account
switch, folder move, encryption enable/disable/password change) can land in any
of those gaps. A stale cycle must not apply, upload, acknowledge, or advance the
cursor against the new target/epoch afterwards.

- `SyncProviderManager.syncEpoch` is a monotonic counter, bumped **after** each
  such change completes (and at `runWithSyncBlocked` entry, which additionally
  blocks new cycles first and then drains running ones, bounded). First-time
  setup (no previous config / first provider activation) does NOT bump — there
  is no old target to fence, and the bump would race the fresh config's first
  sync into a spurious abort.
- Every cycle reads the **(provider, epoch) pair in one synchronous block**
  (a switch swaps the object and bumps the epoch in one synchronous block on
  its side, so a same-block read is always consistent) and threads the epoch
  as `fenceEpoch`. Capturing earlier — e.g. at the cycle claim — lets a switch
  complete in the awaits between and hands the cycle the new provider with a
  stale epoch: a spurious abort of the first post-switch sync.
- Provider I/O is fenced in one place: `getOperationSyncCapable(provider,
{ fenceEpoch })` returns a per-cycle delegate that re-asserts the epoch before
  every provider call. Local writes (apply inside the lock closures, ack
  persists, hydration, migration appends, rejected-ops handling, rebuild resume)
  re-assert via `assertSyncEpochUnchanged` at the call site.
- A failed assert throws `SyncEpochChangedError`, handled at every entry point
  as a **benign abort** (no error snack, `UNKNOWN_OR_CHANGED`) — each abort
  point is crash-equivalent by design (deferred acks re-upload, a behind cursor
  re-downloads with dedup).

**An unthreaded flow is an UNFENCED flow**: `fenceEpoch: undefined` disables the
assert. When adding a new sync entry point, capture and thread the epoch; when
adding a new local write inside a cycle, add an assert before it. Deliberately
unthreaded today: `forceUploadLocalState` / the USE_LOCAL/USE_REMOTE
conflict-resolution flows (covered by the encryption flag + cycle guard), and
key-recovery config writes (content-only, must NOT bump).

---

## Why (deeper)

- **Mechanism & rules:** [`operation-rules.md`](./operation-rules.md)
- **Architecture tour:**
  [`sync-architecture.html#local-intent`](./sync-architecture.html#local-intent),
  [`sync-architecture.html#remote-apply`](./sync-architecture.html#remote-apply)
- **Deep rationale:**
  [`operation-log-architecture.md`](./operation-log-architecture.md)
- **Source of truth:** `src/app/util/local-actions.token.ts`,
  `src/app/util/skip-during-sync-window.operator.ts`,
  `src/app/op-log/apply/hydration-state.service.ts`
