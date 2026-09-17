# Agent capture: Stage A validation and delivery design

**Status:** Prototype plus publication and consume-on-accept experiments; no
production endpoint, OAuth integration, queue, or app setting is implemented.
The experiments add test-only PostgreSQL queues, optional capture metadata in
the existing operation pipeline, and a development-only task-creation helper.
The publication experiment also adds a small upload transaction seam; ordinary
uploads preserve their existing behavior.

**Scope:** Turn the capture-first proposal into reviewable prerequisites before
committing to a release. Full control remains a separate investment decision.

**Agreed priority:** correctness and long-term maintenance take precedence over
release timing. Shipping capture before extracting shared behavior is no longer
a hard requirement. Capture-only remains a privacy boundary: it can accept new
work without granting access to existing data. Full control remains explicit
opt-in. Here, "publication" means committing an operation to sync, not releasing
the product.

## First release contract

A connected assistant can submit a title and optional notes to the user's Inbox.
It cannot read existing tasks or create projects, tags, schedules, or reminders.
An accepted submission means **queued**, not that a task already exists. Import
requires a compatible Super Productivity app to run and sync successfully.

Proposed success text:

> Saved for import when Super Productivity next syncs.

One account may have multiple connections. Each connection has its own revocable
capture grant. Turning on a future full-control feature must leave existing
capture grants unchanged. Keep the endpoint URL stable, but do not promise that
an assistant will discover additional tools without a refresh or new consent.

The one-minute setup target is a usability hypothesis, not a verified claim.
Users without SuperSync can continue using the existing local APIs and URL
actions; this release introduces no alternative sync provider.

## One work API, thin adapters

REST remains the local automation interface, MCP is the remote assistant
interface, and plugins remain the in-app JavaScript interface. HTTP transport
does not imply a new public REST API, and MCP does not require expanding the
existing REST routes first.

For overlapping capabilities, share input meaning, validation, task defaults,
and domain behavior. Keep transport decoding, credential checks, authorization,
and response formatting in their respective adapters. MCP must enforce capture
permission on execution even if a caller invokes a hidden tool directly.

Stage A shares only the actual overlap: creating an Inbox task from a literal
title and optional notes. The remote endpoint validates and queues that input;
the stateful app uses shared task preparation before the agreed delivery path
executes it. Share a small command-specific helper where it removes real
duplication. Extract the shared internals needed for this boundary before release;
choose their package location from actual dependencies and consumers. A generic
command bus or wholesale work-model extraction needs a separate demonstrated need.

Task construction and operation preparation are distinct responsibilities. Reuse
the canonical task behavior and the app's rules for establishing a valid causal
baseline, allocating operation identity, and persisting required preparation.
The delivery design must keep its candidate and preparation cursor together and
specify how concurrent local writes, imports, and crashes affect that pair.
Transport adapters must not independently manufacture operation clocks.

The same command has distinct delivery outcomes:

- `queued` means the service durably accepted a capture ID. It has no task to
  return yet and cannot guarantee delivery while all compatible apps are closed.
- `created` means the stateful executor created the task. Its transport must
  document whether this also establishes local durability or server acceptance;
  returning from a synchronous reducer dispatch alone does not establish either.

Do not change existing REST/plugin short-syntax, work-context, or return-value
contracts just to make their signatures match the narrow capture command. Route
their existing options through common behavior while capture explicitly supplies
Inbox and literal-text semantics. Additive shared internals can preserve current
public APIs.

Full control, if justified later, must extract and reuse the app's commands and
queries in the remote stateful runtime. It must not introduce a second task model
or independent server implementation of completing, scheduling, or logging time.

### Existing shared seam

Both the main-task path in
[local REST](../../src/app/core/electron/local-rest-api-handler.service.ts) and
[plugin addTask](../../src/app/plugins/plugin-bridge.service.ts) already call
`TaskService.add()`. Their richer boundary contracts differ: REST handles its
field allowlist and deadline input, while plugins validate project/tag/parent
references and have distinct subtask handling. Preserve those contracts.

[TaskService.createNewTaskWithDefaults](../../src/app/features/tasks/task.service.ts)
already prepares and validates a normal task without dispatching it. The capture
spike can reuse this with explicit `INBOX_PROJECT.id`, project work-context type,
empty tags, a supplied ID, title, and notes, then construct the existing
[TaskSharedActions.addTask](../../src/app/root-store/meta/task-shared.actions.ts)
with `isIgnoreShortSyntax: true`. Never inherit the active work context. This
reuses domain behavior without expanding a transport API.

The existing factory-plus-action construction now lives in a narrow
`prepareMainTaskAdd` helper shared by `TaskService.add()` and the experimental
publication preparer. It preserves deadline replay fields and existing adapter
contracts; preparing does not dispatch. The task service shrank nine lines. Extract
only the common title/notes validation actually needed by multiple adapters;
the queue must not accept REST/plugin project, tag, or parent options. Do not
introduce this helper merely for an unused future runtime. This task factory does
not by itself solve causal preparation or durable delivery.

## Onboarding prototype

Open [the interactive prototype](../prototypes/agent-capture-onboarding.html) in a
browser. It simulates setup, capture consent, queue acceptance, foreground
import, and disconnect. It makes no network requests and uses no real accounts.
Its example endpoint is deliberately unusable.

The prototype is an English design artifact, not shipped UI. Production strings
must use the existing translation mechanism and be added only to `en.json`.

Test the prototype at phone width and with keyboard navigation. Then validate
the real journey with one supported assistant and a disposable account:

1. Start with SuperSync configured and no assistant connected.
2. Enable capture after reading the plaintext-storage disclosure.
3. Add the endpoint in the assistant, sign in, and approve capture only.
4. Dictate a title and notes. Confirm the response says queued.
5. Open Super Productivity and verify one Inbox task after sync.
6. Disconnect and verify both an existing access token and its refresh path
   lose permission to submit new captures.

Record assistant version, plan, OS, setup surface, dictation versus voice mode,
elapsed time, number of steps, and any required tool confirmation. Mobile web,
a native app, and voice mode are separate compatibility results.

## Connector evidence

Documentation checked on 2026-09-17; account-level tests are still outstanding.

| Client              | Established by official documentation                                                                                                           | Release implication                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Claude              | Remote custom connectors include Free accounts (one connector), and requests originate from Anthropic infrastructure, including mobile clients. | A public HTTPS endpoint is appropriate. Test actual phone setup and dictated capture before advertising support.    |
| ChatGPT             | Developer-mode MCP supports read/write tools on the web. App details include a refresh action to fetch new tools.                               | Do not infer native-mobile or voice support, automatic tool discovery, or consumer-friendly setup from web support. |
| Gemini consumer app | No compatibility result established in this investigation.                                                                                      | Exclude from the launch promise until an official supported path and an account-level test exist.                   |

Sources: [Claude custom connectors](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp),
[ChatGPT developer mode](https://developers.openai.com/api/docs/guides/developer-mode).

## Privacy and connection boundaries

Before enabling capture, explain that the endpoint and queue operator can read
the submitted title and notes. Existing-task access is not granted. This is a
plaintext capture channel even when ordinary sync uses end-to-end encryption.

Do not promise deletion from every copy on import. The server's
[backup script](../../packages/super-sync-server/scripts/backup.sh) includes a
full database dump and configurable retention (14 days by default); adding a
queue table would include it unless the backup policy changes. Accounts-only
recovery would not recover queued captures. Decide the live queue retention,
backup retention, restore behavior, and user-visible expiry treatment before
production. Accepted captures awaiting a device must not disappear silently.

Use existing passkey/magic-link login for account authentication, but add a
separate OAuth authorization boundary for assistant grants. The current
[account JWT](../../packages/super-sync-server/docs/authentication.md) is a
long-lived account credential, not a capture-only assistant token. OAuth
discovery, consent, refresh, revocation, and per-connection state are real work;
"one queue table, two routes" does not describe the entire feature.

The assistant grant can enqueue only. Queue consumption requires the user's app
credentials. Enforce the account and connection scope on every call, including
calls to tools omitted from `tools/list`. Never log title, notes, tokens, or
encryption material. Bound accepted input and queue growth, returning an explicit
error when capacity is unavailable rather than acknowledging an unsaved item.

Disconnect revokes future submissions. Previously accepted items remain pending
under the user's account; disconnect must not silently discard them. If a future
UI offers cancellation, it needs its own explicit action and delivery semantics.

## Queue design

The proposed claim → local add → acknowledge sequence needs a durable handoff
protocol before implementation. A successful reducer dispatch is not persistence
or server acceptance. In particular,
[OperationCaptureService](../../src/app/op-log/capture/operation-capture.service.ts)
decrements its pending counter after failed writes as well as successful ones.
Waiting for that counter to reach zero is insufficient evidence for an ACK.

### Reject optimistic creation followed by queue acknowledgement

A fixed task ID is insufficient. The real task meta-reducers are exercised by
[the retry characterization spec](../../src/app/root-store/meta/task-shared-meta-reducers/agent-capture-retry.integration.spec.ts).
It covers immediate repeat, edit then repeat, delete then repeat, and move then
repeat. These are reducer-level characterizations, not an end-to-end queue test.
They intentionally expose unsafe retry consequences instead of adding guards to
production reducers for a queue that does not exist yet.

Verified results: an immediate repeat keeps one task and a repeat after a title
edit preserves the edit. A repeat after deletion recreates the task. A repeat
after a project move restores membership in the old project while the task still
belongs to the new project. These results reject task-ID-only retry safety; they
do not demonstrate that normal sync replays a previously consumed operation twice.

Consider a consumer that creates a task, uploads it, and loses its queue ACK.
The user deletes or moves that task. A second consumer later retries the original
creation as a new operation. Reusing the task ID does not identify that request
as already consumed. Expiring a claim lease cannot settle this ambiguity.

### Candidate A: publish once, then receive through normal sync

This candidate separates preparation from applying task state:

1. The endpoint durably enqueues immutable title and notes for the authenticated
   account and returns an opaque capture ID with a queued status.
2. A compatible app syncs, reads a pending item, and prepares an ordinary Inbox
   `addTask` operation. Use the normal task defaults and ignore short syntax so
   literal titles cannot assign projects, tags, or dates. The app performs normal
   payload validation and encryption when enabled. It does **not** optimistically
   dispatch the task or append its unaccepted candidate to the local operation log.
3. A publication transaction locks the account-scoped queue row and atomically
   accepts one candidate through the ordinary operation validation, conflict,
   quota, sequence, and state-replacement checks. It stores the accepted operation
   plus a terminal publication receipt in the same commit. A retry or competing
   publisher receives the existing receipt instead of inserting a second operation.
4. The app receives the accepted task through the normal ordered download and
   remote-application path. It must not skip intermediate operations or advance
   its cursor based solely on the publication receipt.

The server handles an ordinary operation envelope; it does not decrypt task
payloads or run task reducers. A claim lease is unnecessary for correctness if
the atomic publication is the single decision point. A lost response after
commit leaves a published item, never a pending item eligible for a fresh add.

This is a protocol candidate, not a validated implementation. It revises the
original "ordinary local add path" promise: the ordinary task action and remote
reducer path are reused, but preparing an operation before optimistic dispatch
requires an explicit client seam. The normal upload route cannot simply be
called unchanged: its caller already owns a locally persisted operation and its
duplicate result does not provide queue completion semantics.

### Candidate B: device-owned durable outbox

A compatible app durably binds a capture ID to one prepared task operation and
recovers that same operation after a crash. It uses the app's ordinary write and
upload pipeline, then acknowledges the capture after the agreed durable handoff.
This is an alternative to investigate, not an implemented or validated protocol.

The design must specify where the capture binding, operation, clock advancement,
and task application become durable. It must also settle competition between
devices: a device-local outbox alone cannot prevent another device from treating
an expired claim as a fresh task. The recovery protocol must preserve terminal
identity after task deletion, lost acknowledgements, and operation pruning.
Reusing a task ID or expiring a claim lease does not establish those guarantees.

The reducer characterization rejects task-ID-only retries; it does not reject a
correctly coordinated durable outbox. Conversely, the publication experiment does
not establish that Candidate A is preferable to Candidate B.

### Protocol selection

Compare all three candidates against
the same failure cases below. Decide using correctness, recovery behavior,
maintenance cost, operational complexity, online delivery latency, and
reversibility. Include the durable metadata, client/server coupling, and new
failure states each design requires. Record untested cases explicitly.

Neither delivery protocol nor clock-ownership strategy is selected for production.
Use bounded experiments to resolve the differences; implement only the chosen
protocol as product behavior.

### Candidate C: consume on ordinary upload acceptance

The app calls the ordinary `TaskService.add()` with a deterministic task ID and
optional `captureId` operation metadata. The normal upload transaction locks the
account's capture row, accepts the operation, and consumes the row atomically.
The upload itself is the acknowledgement. A retry of the winning operation is
distinct from a different device's competing operation: the former receives the
existing duplicate outcome, the latter `CAPTURE_ALREADY_CONSUMED`.

This removes a separate publication route, virtual publisher, account counter,
and preparation-before-dispatch seam. The create-then-ACK rejection above does
**not** reject this design: consumption inside the upload transaction closes
that particular acknowledgement gap. Existing rejection handling and conflict
resolution still have to reconcile the losing device's already-applied state.
Neither a shared task ID nor an HTTP rejection proves that reconciliation.

The bounded experiment uses a test-only decorator around the real per-operation
upload service within its existing transaction. Queue and receipt tables exist
only in the isolated test database. The app helper calls the real task service;
only capture metadata attachment stands in for the future queue consumer.
Clocks, local persistence, encryption, HTTP/gzip, authentication, upload, download,
and replay remain ordinary application paths. Optional metadata travels through
the actual compact codec and HTTP contract, with no schema bump. This is an
architecture experiment, not a production queue or assistant endpoint.

**Measured result (2026-09-17): atomic consumption works; the unchanged client
protocol does not converge.** Six real PostgreSQL/authenticated HTTP cases pass,
including gzip, competing uploads, rollback, malformed batch siblings, binding
checks, and winner retries after operation pruning and ciphertext refresh. The
client's codec/upload suites pass 108 tests; the shared contract suite passes 44.

The encrypted two-browser experiment exposes three failures of the desired full
task-state equality, despite completing ordinary sync rounds:

| Case                                                                                 | Observed result                                                                                |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| A creates and deletes; B has downloaded the deletion, then processes a stale capture | Upload rejects B's create permanently. B retains the task and Inbox membership; A has neither. |
| B creates first locally, A's later create wins server acceptance                     | Both show one task, but retain different `created` values.                                     |
| A creates first locally and wins server acceptance; B creates later                  | Conflict resolution produces differing `modified` state between devices.                       |

The browser check reads the live store by task ID and fails if the store is
unavailable. It records the complete task object, project/tag memberships,
durable operation status, server operation headers, and post-compaction/reload
state. All three divergent states survive successful compaction and app reload.
In the later-create case, the server additionally accepts a synthesized
`[TASK] LWW Update` from the losing device, after accepting only the other
device's capture create. Capture-level create deduplication does not constrain
that ordinary update. These are expected convergence failures, not passing delivery guarantees.
The test-only entry remains necessary; no production queue consumer exists.

The source explains why an additive error code alone is insufficient:
`DUPLICATE_OPERATION` marks an existing operation synced. A distinct permanent
rejection only sets `rejectedAt`; it does not roll back state. Hydration explicitly
preserves permanently rejected local changes, and compaction snapshots live
state. Normal conflict resolution can also run before the losing capture reaches
upload. A deterministic ID therefore prevents duplicate identity, not divergent
state or resurrection. The older identical-payload reducer test never established
equivalence for independently constructed tasks.

**Recommendation:** reject Candidate C with unchanged rejection/replay behavior.
Retain atomic upload consumption as a useful possible implementation primitive.
Prefer preventing unaccepted candidates from entering task state to introducing
general rollback/rebase machinery for capture. Publication before application is
the leading direction to validate next; its clock/import gates above remain open.
This experiment does not prove a virtual publisher is required. A separately
coordinated consumer may still be compared, but exclusive ownership, crash
handoff, and permanent retry identity must be specified before calling it simpler.

### Publication invariants and open feasibility gates

- **Vector-clock allocation:** preparation must safely reserve the originating
  device's clock relative to simultaneous local captures. Holding a lock just
  while constructing an in-memory candidate is not sufficient evidence. Resolve
  crash recovery, failed publication, and subsequent local writes before choosing
  the client seam. Do not hold a low-level op-log lock across network requests.
- **Own-operation filtering:** normal upload piggybacking excludes the uploader's
  client ID. A design that publishes under the consuming device's ID without
  first storing the operation locally must explicitly retrieve that accepted
  operation through ordered download; otherwise it can be skipped as already
  owned. Preserve existing durable download checkpoints.
- **Replacement boundary:** preserve the normal `lastKnownServerSeq` check and
  per-user sequence lock. A candidate prepared before a data replacement must be
  rejected and reassessed against the new state. A capture already published
  before an explicit import stays terminal even if the import removes its task.
- **Receipt lifetime:** clear plaintext title/notes after successful publication,
  but retain enough terminal identity to prevent republishing after an ACK loss,
  task deletion, or operation-log pruning. A missing or expired capture ID must
  never implicitly create a new capture. Define receipt retention alongside the
  transport retry window and queue capacity.
- **Submission retries:** publication deduplication does not deduplicate two
  distinct MCP submissions. Specify what stable request identity an actual
  assistant supplies across retries; do not deduplicate by title/notes, since two
  identical tasks can be intentional. If a client provides no stable identity,
  document the remaining duplicate-submission limitation.
- **Account and encryption changes:** bind every read/publication to the same
  account and sync epoch. Discard prepared work when the target or encryption
  configuration changes; never send it to a replacement account. An unavailable
  encryption key leaves the item queued.
- **Backups and resets:** never automatically replay restored old queue entries
  as fresh tasks. A database restore can roll back a terminal receipt while a
  device retains the task or its later deletion. Restoration/reset policy must
  reconcile this before consumers resume; normal sync recovery alone cannot
  establish whether an old capture was consumed.

Two implementation directions need evaluation. Using
the real device identity needs an atomic durable preparation/clock reservation
and upload ordering across crash recovery. Using one stable capture publisher
identity per account avoids advancing the device's own clock and naturally
appears as a remote author, but introduces durable server counter state and a
virtual-device lifecycle. The latter must be tested against the 20-entry clock
limit, pruning, imports, and recovery before it can be selected. Neither direction
is approved here as production-safe, and no new clock-protection rules or upload
barriers should be added on speculation.

### Publication experiment (2026-09-17)

The bounded experiment exercises the stable capture-publisher direction. Its
test-only queue wraps `SyncService.uploadOps` inside the same PostgreSQL
transaction: the normal upload validation, replacement fence, sequence update,
device bookkeeping, and storage accounting run alongside the terminal receipt.
An account counter serializes publication candidates. A receipt identifies the
winning operation even after the operation itself is removed; live title/notes
are cleared when publication commits.

This is a feasibility harness, not a production route. It bypasses HTTP
authentication, route quotas, and submission deduplication. The browser fixture
uses the shared no-dispatch task preparation helper and the app's payload
validation and encryption. A separate capture author remains in the experiment.
There is no automatic queue consumer or production publication API yet.

**Original reproduced failure: copying only the persisted vector clock is insufficient.** A
real backup import followed by "Use My Data" published a `SYNC_IMPORT` with the
importing actor at counter `3`, while that device's persisted clock remained at
`2`. The experimental capture copied `2` and added capture-actor counter `1`.
Its download cursor was current, so the ordinary upload fence accepted it and
the receipt became terminal. Both apps downloaded it, but normal import filtering
classified its clock as concurrent with the replacement and discarded it. The
task never appeared. This was reproduced in two browser runs; it is a defect in
the experimental preparation strategy, not evidence that ordinary local task
creation loses tasks.

The first browser case does pass: two candidates compete for one encrypted
publication, a later edit survives app reload and receipt retry, both devices
converge, and deletion survives another retry. Therefore atomic publication and
terminal receipts solve the duplicate-add problem in that case, but they alone
do not establish delivery. The original importing-device failure was initially retained as a
characterization; the revised test below requires successful delivery instead.

**Recommendation:** retain publication-first as a candidate and keep production
implementation gated on causal preparation. The next design must establish that
the candidate knows the latest applied full-state replacement before committing
its receipt. Investigate sharing that preparation with the app's operation
building path. Do not weaken import filtering or infer causal knowledge solely
from `lastKnownServerSeq`. Using a second device that downloaded the replacement
is a useful control experiment, not a requirement to impose on users.

That control experiment passes: the second device's candidate includes the
import counter, both devices replay it, and a subsequent backup import removes
the task while its terminal receipt prevents another publication. Pending queue
rows survive task-data imports in these experiments. The unsafe importing-device
case must become a successful-delivery assertion when preparation is fixed;
requiring users to keep another device available is not an acceptable fix.

The first adversarial review identified two gaps, addressed by the revised experiment below:

- The loss assertion's task lookup also returns `null` when its store cannot be
  read. Assert a readable store, absence by task ID, and both durable cursors
  reaching the receipt sequence before treating it as proof of consumed-but-missing
  delivery. The recorded missing-task observations and clock mismatch support the
  diagnosis, but the original assertion alone was insufficient.
- Preparation reads a clock, while submission reads the cursor again later.
  Preserve the preparation cursor with its candidate and test an import between
  preparation and submission. A fresh cursor must not make an old candidate pass
  the replacement fence. The revised browser and PostgreSQL cases exercise this
  interleaving explicitly.

### Revised publication-before-application experiment

The app now claims the existing same-tab sync-cycle guard, captures provider and
sync epoch together, then uses `flushThenRunExclusive` to prepare under the
operation-log lock. It merges the current clock with the existing full-clock
reader (snapshot plus retained operations), closing the reproduced importing
client's cache gap. The shared task helper builds an explicit Inbox action with
literal title/notes. Payload validation and encryption use existing app code.
The candidate carries the exact preparation cursor; preparation neither applies
the task nor appends an operation, advances the cursor, or reserves the app's own
clock. The virtual publisher's counter is still allocated by its server receipt
transaction. No new generic command framework or sync-engine extraction was added.

The publication transaction now checks the **stored, pruned** candidate against
the retained state-replacement boundary using the shared import classifier. This
happens inside the ordinary upload transaction before receipt commitment; a
failed check rolls back operation, storage, sequence, and capture bookkeeping.
A terminal receipt is checked first so later imports cannot invalidate retries
of an already published capture. Both fresh-cursor/stale-clock PostgreSQL cases
were observed failing before this gate, then passing afterward, including a
clock larger than the server's 20-entry limit. All nine publication SQL tests pass.

All three revised encrypted Chromium scenarios pass: competing preparations with
edit/reload/delete retry safety, successful delivery from the importing device
despite its stale persisted clock, and the synchronized second-device control.
Both import cases reject an old candidate with either its original cursor or a
substituted fresh cursor, then deliver the freshly prepared candidate. A later
real backup import removes the delivered task while its receipt stays terminal.
The tests verify identical complete task records and project memberships on both
devices, and verify that preparation changes neither stored operation IDs,
the persisted clock, nor the cursor. They navigate to Inbox explicitly; the
captured task is intentionally unscheduled and does not appear in Today.

This is a narrower result than general production-safe causal preparation. The
full-clock reader includes retained rejected and pending-apply operations; the
current fixtures prepare after successful sync. The fallback also scans the
retained log on each preparation; its cost has not been benchmarked.
Failed/rejected full-state application is now reproduced and fixed — see the
baseline experiment below; preparation reads an applied baseline instead.
Same-tab cycle exclusion also does not settle cross-tab cursor races.
Account/key changes after preparation, virtual-device lifecycle/version reporting,
and power-loss recovery remain open. A missing retained replacement row refuses
publication; the retention experiment below reproduces that and records the
durable-evidence design. Do not silently treat the missing boundary as an empty one.

### Preparation baseline experiment (2026-09-17): only applied state

**Reproduced, then fixed: a capture published over a replacement this device
never applied.** The preparation reader is shared with
[`capture-preparation-baseline.integration.spec.ts`](../../src/app/op-log/testing/integration/capture-preparation-baseline.integration.spec.ts),
which drives the real `OperationLogStoreService` and the same
`classifyOpAgainstSyncImport` the publication transaction runs. Six cases pass.

The two clock sources proved different things. The durable clock advances only in
`markReducersCommittedAndMergeClocks`, so alone it is evidence of **applied**
state. `getFullVectorClock()` merges every **retained** op regardless of outcome,
so merging the two downgraded the evidence to "downloaded":

| Downloaded remote replacement | Applied? | Ordinary sync | Before    | Now                |
| ----------------------------- | -------- | ------------- | --------- | ------------------ |
| `rejectedAt` set              | no       | proceeds      | published | stays pending      |
| `applicationStatus: failed`   | no       | blocked       | published | refuses to prepare |
| `applicationStatus: pending`  | no       | blocked       | published | refuses to prepare |
| reducers committed            | yes      | proceeds      | published | publishes          |

The durable applied-baseline fact turned out to already exist per entry, just
unread: local full-state ops carry no `applicationStatus` because the op-log
captures them after their reducer ran, and remote ones reach `applied` (or
`archive_pending`) only at the reducer checkpoint. `findAppliedFullStateBaseline()`
reads exactly that, and `readCapturePreparationClock()` now merges the durable
clock with that baseline instead of with the retained log. No new persisted
field, schema change, or op metadata was needed.

**Dropping the merge would not have worked.** The sixth case pins the shape the
merge was added for: a device that imports a backup and chooses "Use My Data"
writes a local `SYNC_IMPORT` at its own counter 3 while its durable clock stays
at 2, and there the retained log is the only evidence of applied state. Removing
the merge was observed satisfying the unapplied cases and re-losing this one; the
applied-baseline merge satisfies both. Both halves of the fix were also observed
failing the spec when reverted individually.

`findCapturePreparationBlocker()` additionally refuses preparation while the
ordinary incomplete-remote conditions hold (interrupted rebuild, pending or
failed downloaded ops). A correct clock alone is insufficient because preparation
also builds the task from live state, which a blocked device has not caught up to.
The rejected case is deliberately not gated: nothing is in flight there, so the
clock is the whole answer.

Scope limits. This is client-side preparation only — the reproduction pairs the
real store with the real classifier, not a PostgreSQL round trip, so "the receipt
does not commit" is inferred from the classifier's verdict rather than observed
end to end. The reader scans the retained log, the same scan the previous reader
did; its production home is the store's existing full-state metadata pointer
(`_getLatestFullStateOpEntryMatching`), which already walks refs newest-first and
was left alone only because that service is at its line cap. `getFullVectorClock()`
now has no callers again, as before this experiment. The publication E2E suite was
not re-run against the new gate; its fixtures prepare after a successful sync, so
the gate should be open, but that is unverified.

Still open and unchanged by this: account/key changes after preparation,
cross-tab cursor races, and power-loss recovery.

### Replacement retention experiment (2026-09-17): safe, not available

**Reproduced against real PostgreSQL: pruning the import row refuses every
later capture for that account, permanently.** Added as a tenth case to the
publication SQL suite; all ten pass.

`latestStateReplacementSeq` tracks imports only — an accepted causal REPAIR
deliberately does not move it (#9703). The retention sweep's boundary is the
newest CAUSAL full-state op, which _does_ count a causal REPAIR, and it deletes
everything below that. A REPAIR newer than the newest import therefore authorizes
deleting that import's row, and nothing rewrites the pointer. Quota recovery
reaches the same state by a second route: with two or more restore points it
deletes up to and including the oldest. `resolveRetainedReplacementSeq` already
exists because pruning deletes import rows, but it is consulted only for
unresolved upgrade rows, so a resolved pointer keeps aiming at the deleted row.

The ordinary upload fence is unharmed — it compares the pointer as a number and
never joins the row. Publication joins it, for the `clientId` and vector clock
the import classifier needs.

**The failure is availability, not safety.** The reproduction asserts both: no
operation, no receipt, watermark unmoved, and the capture still pending rather
than consumed. Causation was confirmed by retaining the row and re-running — the
identical candidate publishes — so the refusal is not incidental.

**Design for durable evidence (not implemented).** Persist the replacement's
causal identity next to its seq on `user_sync_state`
(`latest_state_replacement_client_id`, `latest_state_replacement_vector_clock`),
written by the same `userSyncState.update` that already sets the seq inside the
upload transaction holding the per-user lock. Additive, nullable, no extra round
trip, and `latestFullStateVectorClock` is the existing precedent for the shape.
Evidence then survives pruning because it never lives in a prunable row. Legacy
rows stay null until that account's next import; the lazy resolver can backfill
from the retained row while it still exists.

Two alternatives were considered and rejected. Exempting the replacement row from
pruning fights the quota design for a row that can be 20MB, and the pointer can
still dangle after a clean slate. Reconstructing the boundary from the causal
REPAIR that authorized the deletion would treat a REPAIR as an import — it
replays concurrent work instead of dropping it — which #9703 explicitly warns
against.

**Recommendation: do not ship the migration yet.** It is small and additive, but
it only matters if publication-before-application is the selected protocol, and
the current behavior is safe. Land it with protocol selection rather than ahead
of it; until then a pruned boundary correctly refuses.

The proposed import contract remains: unpublished captures survive task-data
imports; published captures stay consumed. Thus restoring a backup just before
publication can leave the captured task visible, while restoring just after
publication can remove it permanently. This timing difference follows ordinary
task replacement semantics and must be made explicit before production approval.
It is not a promise that every accepted capture survives later deletion or import.

Restoring the server database is a separate unresolved case: rolling back the
receipt ledger can make old consumed rows look pending. This experiment does not
establish a safe automatic recovery procedure for that case. It also does not
validate 20-entry vector-clock pruning, account/key changes, server migration,
queue expiry, or live assistant behavior.

MCP request IDs provide request/response correlation and cannot simply be reused
as a stable user-intent identity: the inspected specification prohibits reusing
an ID within the same session. A real connector retry experiment is still needed;
deduplicating publication of one capture does not establish deduplication of
separate assistant submissions. See the
[MCP message specification](https://modelcontextprotocol.io/specification/2025-11-25/basic).

### Failure tests required before production

Use the real server database transaction, valid task operation envelopes, and
the app's normal remote replay. An in-memory fake queue is not sufficient.

| Failure or race                                            | Required result                                                                     |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Device dies before publication                             | Item remains pending; no optimistic task survives.                                  |
| Two devices prepare different candidates                   | One ordinary task operation is committed; both observe the same receipt.            |
| Server commits but the response is lost                    | Retry observes publication; no second task operation.                               |
| Server transaction fails                                   | Neither the operation nor a success receipt is committed.                           |
| Download or local apply fails after publication            | Normal sync retries/rebuilds; the capture is not republished.                       |
| User edits, moves, or deletes the imported task            | Late queue retries leave those changes intact.                                      |
| Import/reset races with publication                        | Existing replacement fence and explicit queue policy govern the result.             |
| Operation is pruned after publication                      | Receipt stays terminal; normal snapshot recovery supplies current state.            |
| Device/account/encryption configuration changes            | Stale work aborts without cross-account delivery.                                   |
| Local write races with preparation, or preparation crashes | Clock reservation and subsequent operations remain causally valid.                  |
| Server database backup restores old pending items          | Queue consumption stays paused until recovery resolves consumption ambiguity.       |
| Replacement row pruned by retention or quota recovery      | Reproduced: refuses safely and permanently. Durable evidence designed, not shipped. |

## Implementation order and release gates

1. **Delivery evidence:** consume-on-accept rejects reliance on existing
   losing-device reconciliation. The revised publication experiment keeps
   unaccepted candidates out of task state, shares task preparation, and checks
   import causality before receipt commitment. The baseline experiment then
   reproduced rejected/failed/pending imports and replaced the retained-history
   clock reader with an applied baseline plus a preparation gate, and the
   retention experiment showed a pruned replacement refuses safely but
   permanently. Next compare protocols, then account/key changes and multiple
   tabs; the durable-evidence migration lands with protocol selection.
2. **Delivery comparison:** compare publication before application with any
   concrete coordinated consumer alternative against the same failure cases.
   Select using the criteria above, including the cost of rollback/rebase or
   durable ownership if an alternative needs them.
3. **Real connector spike:** deploy a disposable capture-only endpoint with real
   OAuth and test the exact phone journey. Record compatibility results instead
   of advertising all assistants. This requires an actual publicly reachable
   deployment and an assistant account; a local prototype cannot establish it.
   It can proceed alongside delivery investigation when those prerequisites exist.
4. **Durable delivery:** implement the agreed protocol with database integration
   tests and app tests covering crashes, retries, two devices, persistence
   failures, data replacement, account changes, and deleted tasks.
5. **Product integration:** add the small settings flow, revocation, translated
   copy, and wiki documentation after the behavior exists. Exercise a real
   two-device capture through ordinary sync before release.

Shared code and any extraction required for correctness may precede capture
release. Full-control UI, permission presets, audit/undo behavior, headless state
replicas, and encryption-key transfer remain separate scope decisions tied to an
actual supported workflow. A longer schedule does not by itself justify them.

## Validation record

- The four reducer characterization tests pass. Run them with
  `npm run test:file src/app/root-store/meta/task-shared-meta-reducers/agent-capture-retry.integration.spec.ts`.
- The spec passes the required `npm run checkFile` formatting/lint check.
- The prototype is checked in Chromium for consent, blank-title rejection,
  literal rendering, disconnect/off with pending work, import, and reset. This
  checks a local simulation, not assistant compatibility or OAuth.
- The test-only publication harness passes nine cases against isolated
  PostgreSQL: competing candidates, receipt recovery in a new helper instance,
  stale counter rejection, rollback before receipt persistence and before commit,
  missing receipt lookup, the ordinary replacement fence, and terminal receipt
  retention after deletion/import/operation removal. The SQL fixture uses opaque
  operation envelopes; it does not establish app replay correctness.
- The existing upload service passes 113 unit tests, six existing PostgreSQL
  replacement/atomicity tests, and its required `checkFile` check with the new
  transaction seam. Both new server test files pass `checkFile`. Server TypeScript
  compilation passes after regenerating the stale local Prisma client. The two
  new harness regressions were also observed failing with the corresponding fixes
  temporarily reverted, then passing after restoration.
- The original three encrypted Chromium scenarios verified: publication/race/
  edit/reload/delete recovery, an explicit characterization of the importing-device
  capture loss, and successful delivery plus later removal through real backup
  imports using a synchronized second device. The original delivery assertion
  failed twice before the unsafe case was made an explicit characterization.
  That original characterization has been replaced by a successful-delivery
  requirement in the revised publication experiment; see its remaining scope
  limits above. The passing checks do **not** establish production readiness.
- Shared preparation passes 78 task-service tests, including unchanged existing
  action semantics, no dispatch during preparation, and Inbox isolation from
  active Today/tag contexts. App TypeScript compilation passes. Preparation and
  publication test files pass their required formatting/lint checks.
- The preparation baseline experiment passes six cases against the real
  operation log store and the shared import classifier: rejected, failed and
  pending remote replacements stay pending or refuse preparation; an applied
  remote replacement and a local import ahead of the durable clock each publish.
  The three unapplied cases first ran as characterizations asserting the opposite
  outcome, and each half of the fix — the applied-baseline merge and the
  preparation gate — was then observed failing the spec when reverted on its own
  (three and two cases respectively), so the assertions are not tautologies.
  Run it with `npm run test:file src/app/op-log/testing/integration/capture-preparation-baseline.integration.spec.ts`.
- The revised publication browser suite passes all three scenarios with ordinary
  encrypted download/replay against isolated PostgreSQL. These are successful
  delivery assertions, unlike the consume-on-accept suite's expected failures.
  The final run completed in 5.8 minutes. The independent adversarial source
  review found no blocker in this bounded proof and identified the retained-clock
  versus applied-state distinction recorded above as a production gate.
- The browser spec passes `checkFile`. This local run used a temporary minimal
  Playwright configuration against the running app and isolated PostgreSQL-backed
  SuperSync server: normal global setup stopped at unrelated bundled-plugin build
  failures. The full E2E suite and live assistant/OAuth flows were not run.
- Production publication and actual phone/assistant onboarding remain
  unimplemented. Submission retry identity, server-database restoration, clock
  pruning, and encryption/account changes remain release gates.

The tenth publication SQL case covers the pruned replacement boundary. It uses
the ordinary upload path for the import and the causal REPAIR, then deletes below
the retention sweep's boundary exactly as that sweep does.

Run the SQL experiment from `packages/super-sync-server` with `DATABASE_URL`
pointing to an isolated PostgreSQL database containing the existing SuperSync
schema:

```sh
../../node_modules/.bin/vitest run --config vitest.integration.config.ts tests/integration/agent-capture-publication.integration.spec.ts --maxWorkers=1
```

The browser experiment is
[`agent-capture-publication.spec.ts`](../../e2e/tests/sync/agent-capture-publication.spec.ts).
It requires `DATABASE_URL` for the same isolated database used by
`SUPERSYNC_E2E_URL`, plus the app's `E2E_BASE_URL`. These tests construct and publish
through the test harness; response loss is simulated by ignoring the result,
and restart coverage uses app reload and a fresh harness instance. They do not
exercise a real MCP request, an HTTP publication route, or process power loss.

Run the consume-on-accept server checks from `packages/super-sync-server`:

```sh
DATABASE_URL=... NODE_ENV=test ../../node_modules/.bin/vitest run \
  --config tests/integration/agent-capture-consume.vitest.config.ts --maxWorkers=1
```

Its browser spec is
[`agent-capture-consume.spec.ts`](../../e2e/tests/sync/agent-capture-consume.spec.ts).
Set `E2E_AGENT_CAPTURE_CONSUME=true` to opt in; it is skipped in ordinary E2E runs.
Start `tests/integration/agent-capture-consume.server.ts` with the same database,
loopback host, test-mode account routes, and test JWT secret; a standard server
does not install the consume decorator. Build shared-schema and sync-providers
first. In worktrees sharing another checkout's `node_modules`, resolve
`@sp/shared-schema` to this worktree's build: the stale contract otherwise strips
`captureId`. The dedicated Vitest configuration handles this for server checks.
The focused browser run used a temporary Playwright configuration to avoid the
unrelated bundled-plugin global-setup failure noted above. Its three tests mark
the final convergence assertion as an expected failure only after validating the
real upload, readable state, successful compaction, and persistence after reload.
They intentionally preserve evidence against the proposed protocol.

## Architectural references

- [Architecture decisions](../../ARCHITECTURE-DECISIONS.md), especially package
  direction, upload conflict safety, and additive model evolution.
- [Contributor sync model](../sync-and-op-log/contributor-sync-model.md): one
  replay-atomic transition per operation; remote application must not recapture.
- [Android background sync](../long-term-plans/android-background-sync-improvements.md):
  reminder scanning is not general foreground state import.
- [Encryption at rest](../supersync-encryption-at-rest-decision.md): operation
  encryption does not encrypt the queue, database files, or all backup copies.
