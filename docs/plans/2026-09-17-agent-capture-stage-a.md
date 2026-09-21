# Agent capture: Stage A validation and delivery design

**Status (2026-09-21):** The publication-first path now has production Prisma
models, an additive migration, authenticated app delivery routes, and app
preparation/publication followed by ordinary sync replay. Delivery is disabled
by default with `ENABLE_AGENT_CAPTURE_DELIVERY=false`. Assistant submission,
OAuth integration, settings/consent, and restore reconciliation are not
implemented. Submission remains a test fixture; the consume-on-accept alternative
remains experimental. Earlier dated sections below record the experiments that
led here, rather than the current implementation boundary.

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
queue table would include it unless the backup policy changes. Accounts recovery dumps now include the queue, terminal receipts and publisher
counters; older accounts-only dumps contain no capture ledger. Decide the live queue retention,
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

Use bounded experiments to resolve the differences; implement only the chosen
protocol as product behavior. The comparison below now recommends publication
before application and explains why a coordinated consumer is not the simpler
option here; the clock-ownership strategy within it is still unsettled, and
selection remains the maintainer's decision.

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
authentication, route quotas, and endpoint-specific request deduplication. Its
test-only queue boundary does characterize account-scoped identical-submission
handling; that is not evidence for an HTTP or MCP submission protocol. The
browser fixture uses the shared no-dispatch task preparation helper and the
app's payload validation and encryption. A separate capture author remains in
the experiment. There is no automatic queue consumer or production publication
API yet.

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
Same-tab cycle exclusion does not settle cross-tab cursor races; simultaneous
active browser tabs are outside the supported scope (see the single-instance
experiment below).
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

Still open at this stage: account/key changes after preparation and power-loss
recovery. Cross-tab cursor races are outside the supported single-instance scope.

### Replacement retention experiment (2026-09-17): reproduced, then fixed

**Reproduced against real PostgreSQL: pruning the import row refused every
later capture for that account, permanently.** Fixed by persisting the
boundary's causal identity; the publication SQL suite is now eleven cases and
all pass.

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

**Durable evidence (implemented).** The replacement's causal identity is now
persisted next to its seq on `user_sync_state`
(`latest_state_replacement_client_id`, `latest_state_replacement_vector_clock`,
migration `20260917000000_add_state_replacement_evidence`), written by the same
`userSyncState.update` that already sets the seq inside the upload transaction
holding the per-user lock. Additive, nullable, no extra round trip, and
`latestFullStateVectorClock` is the existing precedent for the shape. Evidence
survives pruning because it never lives in a prunable row.

The recorded clock is the one `processOperation` already pruned in place, so it
is byte-for-byte what the operations row holds — a reader comparing against the
boundary sees the same clock either way. `resolveRetainedReplacement` backfills
legacy rows lazily, but **only from a still-retained import**, never from the
causal-REPAIR stand-in: recording the REPAIR as the boundary's author would
widen it into import semantics, the exact confusion #9703 warns against.

**The residual gap is pinned, not papered over.** An account whose import was
accepted before this migration and whose row was pruned before any later upload
could backfill has no causal identity anywhere. Publication keeps refusing
there; the eleventh case asserts it, because reading a missing boundary as an
absent one would publish work prepared before the import — the safety failure
the gate exists for. Both halves were falsified independently: dropping the
upload-side write fails only the pruned case, and treating a missing boundary as
absent fails only the legacy case.

Two alternatives were considered and rejected. Exempting the replacement row from
pruning fights the quota design for a row that can be 20MB, and the pointer can
still dangle after a clean slate. Reconstructing the boundary from the causal
REPAIR that authorized the deletion would treat a REPAIR as an import — it
replays concurrent work instead of dropping it — which #9703 explicitly warns
against.

**Shipped ahead of protocol selection, deliberately.** The migration only
matters if publication-before-application is the selected protocol, so the
earlier recommendation was to land it alongside that decision. It went in early
on request; it is additive, nullable, and inert for every reader that does not
consult the new columns, so it does not pre-commit the protocol choice.

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

### Submission retry identity characterization (2026-09-18)

The PostgreSQL publication harness now characterizes its queue boundary separately
from publication retries. Repeated and concurrent pending submissions with the
same account-scoped capture ID and identical title/notes resolve to the one
immutable queue row. The same capture ID remains independent in another account.
Before publication, reusing the ID with different title/notes is refused and the
first accepted content remains unchanged.

This is evidence about the test-only queue's storage invariant, not a proposed
MCP submission protocol. After publication, the receipt still prevents a second
operation, but the harness has cleared its plaintext content. A later submission
with that ID therefore cannot establish whether it matches the original request
and is refused by the existing immutable-row check. Publication receipt recovery
remains covered separately; it is not submission deduplication.

**Release decision still required:** define which authenticated party owns and
supplies a stable user-intent identity across connector retries, and define the
endpoint response for a reused identity whose content conflicts with the first
submission, including after publication. The queue could retain a comparison
commitment or the endpoint could use another authenticated binding, but selecting
either policy is outside this experiment. A connector without a stable identity
must document that a retried submission can create another capture; title/notes
must not be used as a deduplication key because identical tasks can be intended.
The next section narrows this decision to two honest options and records what
would settle it.

### Narrowing the submission decision (2026-09-18): analysis, no new code

Three independent reviews — two adversarial analyses with opposing mandates and
an external CLI review — narrowed the decision above without closing it. Every
claim below was re-verified against the cited source.

**The identity choice is binary, and an optional key is the one shape to avoid.**
This server makes an identity mandatory only on its destructive path: `opId` is
`.optional()` in `packages/shared-schema/src/supersync-http-contract.ts` and
required by a `superRefine` only when `isCleanSlate` is set, while `requestId`
stays optional on both additive upload routes. Capture is additive, so that
precedent does not carry a refuse-without-a-key rule. But the reverse reading is
also wrong: an optional key advertised as idempotency promises a guarantee it
cannot keep. The honest release contract is one of two, chosen deliberately —
a connector-owned opaque key that the endpoint requires, where reuse always means
the original intent and returns its receipt; or an explicitly at-least-once
endpoint that makes no duplicate-prevention claim and documents that a retried
submission can create another capture.

**A conflict response is sound only while the capture is pending.** The
immutable-row check already implements it and two spec cases pin it, and `409`
is this server's established code for a colliding durable identity
(`sendSyncImportExistsReply`, whose docstring names the dropped-response failure
this must avoid). It must not extend past publication: plaintext is cleared
there, so a byte-identical retry currently hits the same immutability error and
would tell an assistant the capture failed while its task exists.

**Content comparison does not earn its place in either branch.** A persisted
hash is a low-entropy commitment over short task titles that would outlive the
plaintext publication deliberately erases and ride 14 days of full dumps
(`scripts/backup.sh`). An ephemeral fingerprint scoped to the retry window was
considered and rejected as a contract basis: the existing dedup cache is
process-local with a 10,000-entry cap and a five-minute TTL, and the server's own
README lists process-local state as a multi-instance hazard — after expiry,
eviction, restart, or a second replica the comparison basis is simply gone, so
the endpoint would still have to fall back to returning the receipt for all reuse
or refusing all reuse. Under a required connector-owned key the comparison is
unnecessary, because reuse means the same intent by definition; without one it
cannot be made reliable. Note also that the existing fingerprint layer
deliberately re-processes a mismatch rather than refusing it, so it is precedent
for short-lived same-body replay, not for conflict detection.

**What the cheap probe can establish (clarified 2026-09-21).** The question is
narrow: does a real assistant re-send the same normalized tool arguments when a
call is retried? A local MCP server exposing a capture tool that records only a keyed
per-run digest and a counter answers it, with no public deployment, OAuth, or
disposable account. It characterizes one assistant's argument handling and
nothing else — not transport retries, authorization, or deployment routing.
Its optional-key schema does not test whether a required key is usable, and
successful reuse by an assistant does not establish connector-owned identity.
The eventual contract must identify who generates and retains the key and be
validated through the real connector path.

That probe now exists at
`packages/super-sync-server/tests/experiments/agent-capture-retry-probe/`:
dependency-free, four injectable first-call failure modes, and arguments reduced
to an HMAC digest under a per-run in-memory key so no title ever reaches the log.
Its protocol handshake and repeat detection are verified against a scripted
client, with a negative control confirming differing arguments produce differing
digests. **It has not been run against a real assistant, so the gate is still
open** — running it needs a human driving fresh clients and server processes
through the retry modes. `fail-first` returns a tool error after simulated
acceptance; it does not drop a transport response. See the
[next-steps runbook](./2026-09-18-agent-capture-next-steps.md) for trial validity.

**Unchanged by all of this:** the database-restore duplicate remains open, and no
submission contract touches it — the restore rolls back the queue row, so a key,
a conflict policy, and a commitment are all rolled back with it.

### Account, key, and tab experiment (2026-09-17): the wipe window

**Reproduced against real PostgreSQL: in the window between an encryption
toggle's server wipe and its re-upload, every existing fence is vacuous and a
candidate prepared under the retired key publishes.** Fixed with a monotonic
`users.sync_data_generation`; the publication SQL suite is now seventeen cases
and all pass. Account binding and multi-tab concurrency were already guarded and
needed no production change.

Enabling encryption, disabling it, and importing data whose encryption settings
differ all run `SnapshotUploadService.deleteAndReuploadWithNewEncryption`:
`DELETE /api/sync/data` — `deleteAllUserData`, which drops every operation, every
device and the whole `user_sync_state` ROW — and only then a full-state re-upload
under the new key. A password change does **not** take this route: it uses the
clean-slate upload path, which keeps the row and writes a real SYNC_IMPORT, so
the existing replacement fence already covers it.

**The gap is the window, not the completed change.** Between the delete and the
re-upload the account has no operations, no sync state and no replacement
boundary, so the state-replacement fence is not stale — it is absent, and so is
every check that would otherwise disagree with a stale candidate. The window is
not brief: the toggle deliberately keeps the new key config when the upload
fails, which leaves the server empty until the user retries. Once the re-upload
lands, the snapshot handler has stored it as a SYNC_IMPORT through `uploadOps`,
which rewrites the replacement pointer, and the ordinary fence refuses the
pre-wipe candidate again — on causality, not on the generation. A dedicated case
asserts that, so the new counter is never credited with work it does not do.

**The damage is fleet-wide, not one wrong task.** An operation encrypted under a
retired key cannot be decrypted by any device, and `OperationLogDownloadService`
rethrows `OperationDecryptionError` for the whole download page rather than
skipping the item, so one such operation wedges downloads for every device on
the account, at a fixed seq, permanently.

**Monotonic counter on `users` (implemented).** `sync_data_generation` is
incremented inside `deleteAllUserData`'s own transaction and checked first in the
publication transaction, before any other fence (migration
`20260917010000_add_sync_data_generation`). It lives on `users` because that is
the one row the wipe keeps. It is deliberately **not** bumped by the clean-slate
upload path, which preserves the sync-state row and writes a real SYNC_IMPORT.
`NOT NULL DEFAULT 0` is a catalog-only change on PostgreSQL 11+, so existing rows
read 0 without a table rewrite.

**Monotonic, never reset.** A cheaper fix — drop the queue rows on wipe and let
the assistant re-queue — is insufficient: after the wipe the publication
watermark restarts at 0, so a re-queued capture with the same id admits the
pre-wipe candidate again, ciphertext and all. A dedicated case asserts exactly
that, with watermark, actor identity, op id and the (absent) replacement fence
all agreeing with the stale candidate and only the generation disagreeing.

**Both halves falsified independently.** Dropping the increment in
`deleteAllUserData` fails three cases (the two safety refusals and the
availability case that reads the advanced generation); disabling the
publication-side comparison fails the two safety refusals. Neither assertion is a
tautology.

**Already guarded, verified rather than changed.** The capture actor is derived
from the account (`agent-capture-<userId>`), so a candidate prepared for one
account is refused by the publisher-identity check when submitted to another.
`SyncCycleGuardService` is an in-tab guard, so two tabs can prepare concurrently
against the same watermark; the server is the arbiter, because the watermark is
claimed inside the publication transaction, so exactly one candidate occupies
each counter value and the loser stays pending for rebuild. Both cases pass
against unchanged production code.

**Generation delivery: resolved on the queue read, not the sync contract.** The
earlier note here assumed a production preparer would have to learn the
generation from a sync response, which would put the value on the
download/upload contract. It does not: consuming a capture is already an
authenticated read from the same server, so the pending-capture response carries
the generation alongside the title, notes and publication watermark. That is
strictly better than a sync-response copy — fresher, so fewer spurious
refusals — and needs no contract field, no client-persisted value and no schema
change. Both suites now take the generation from the queue read
(`enqueueCapture` / `readPendingCapture`); the harness no longer exposes a
database peek, so no test can rely on state a real preparer cannot see.

Publication and a destructive wipe now lock the same account sync-state row
before either path reads or deletes sync data, preserving the ordinary upload
lock order. If the wipe wins, publication reads the advanced generation and
refuses; if publication wins, the wipe observes and removes its accepted
operation in the ordinary reset. The PostgreSQL race test pauses a publication
after its locked generation read and proves the wipe cannot delete rows until
that publication commits. The terminal receipt remains consumed in the latter
order.

**What it still does not prove: key agreement.** The generation is evidence that
the candidate was prepared in the current data era, not that the preparer's
encryption key matches that era. A device still holding the retired key that
prepares _inside_ the window reads the advanced generation from its own queue
read, so the fence passes and its ciphertext publishes. This is not closable by
the counter: the server cannot inspect ciphertext, and the value the preparer
reports is the true current one. The current-baseline experiment below now supplies
client-side evidence without persisting a successful-sync era. Ordinary sync
appears to face the same empty-server window
(`planDownloadFullStateUpload` plans a full-state upload from a gap on an empty
server, under whatever key that device holds), which is why this is recorded as
a limitation rather than fenced on the server; that comparison is reasoned from
the source, not reproduced.

### Current-key evidence (2026-09-18)

The new SQL reproduction encrypts a candidate with the retired key after a real
wipe and reads the advanced generation from the queue. The old harness accepts
it, even though decryption with the replacement key fails.

Preparation now uses the existing read-only `downloadOps(0, undefined, 1)` probe.
It requires an encrypted causal full-state baseline and authenticates it through
`OperationEncryptionService.decryptOperation`, including the existing payload
integrity checks. The same captured key encrypts the candidate. An empty server,
plaintext baseline, or wrong key refuses preparation without applying the probe
or changing local task state, the operation log, or the download cursor.

The candidate carries the verified baseline's operation ID. Before committing an
encrypted capture, the publication transaction verifies that this is still the
current encrypted baseline under the ordinary upload lock. A wipe or baseline
replacement between preparation and publication therefore refuses publication;
a password replacement that preserves both generation and clock still changes
the baseline ID. Terminal receipt retries do not require the old baseline to
remain available. No new persisted fields, key registry, or sync contract fields
are required; the proof travels only on the experimental publication request.

This is a cooperative-client correctness check, not a server-side cryptographic
proof of the candidate's key. The server cannot verify that a caller decrypted
anything. Ordinary clients establishing the wrong key on an empty server remain
outside this capture fix. The probe also downloads and validates a full snapshot
for each preparation, and even same-key baseline replacement requires a retry;
those are explicit latency and availability costs of this bounded experiment.

### Delivery comparison (2026-09-17): publication-first is the recommendation

Step 2 of the implementation order, decided against the failure table below and
the stated criteria. This is a source-grounded comparison, not a new experiment;
Candidate B was never implemented, so its costs are derived from what this
codebase would require of it.

**The finding that decides it: this client has no durable "prepared but not
applied" state.** `OperationLogEntry.applicationStatus` is documented as remote
ops only, and hydration's `_replayTailOps` replays every tail entry except
`reducerRejectedAt` ones. So any operation a device writes to its own log is
applied state after the next reload — there is no status a local entry can carry
that means "durable, mine, not yet real". A device-owned outbox therefore has
exactly two shapes: store the candidate in the op log, which _is_ optimistic
creation and is rejected by the retry characterization above (a repeat after
deletion recreates the task; a repeat after a project move restores the old
membership), or add a second durable store outside the op log, with its own
hydration, recovery, compaction interaction, and a persisted clock reservation
under the device's real `clientId`.

**And it still needs the server arbiter anyway.** Two devices can read the same
pending capture, so B needs a claim; a lease's expiry cannot distinguish a dead
device from a slow one, which is the same ambiguity that rejected create-then-ACK.
B is thus A's coordination plus new durable client state — not a simpler
alternative.

| Criterion               | A: publish, then receive via sync                                                   | B: device-owned durable outbox                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Correctness             | One atomic decision point; unaccepted candidates never touch task state.            | Needs a claim _and_ a durable local binding; no local representation for unapplied work.             |
| Crash recovery          | Nothing to recover: the candidate is in-memory, the capture stays pending.          | Must recover the same op and its reserved clock, and must let another device take over a dead one.   |
| Maintenance cost        | Server: receipt ledger, publication counter, one publication route.                 | Every client: a new persisted store, its recovery path, and its interaction with compaction/pruning. |
| Operational complexity  | One deployment the maintainer migrates; state is server-side and inspectable.       | Debugging spans installed clients; a bad outbox row is on a user's disk.                             |
| Online latency          | Equal — both deliver only when some device prepares. `queued` semantics either way. | Equal.                                                                                               |
| Reversibility           | Additive, nullable server columns; a server migration can withdraw them.            | A persisted client model cannot be un-shipped (rules 10/11); removal is a fleet-wide migration.      |
| Vector-clock budget     | Adds an actor to the 20-entry clock budget; client pruning may drop it.             | Costs no extra actor; the task is authored by a real device.                                         |
| Fit with existing model | Introduces a non-device actor into clocks, device lists, and `clientId` tie-breaks. | Authorship matches every existing assumption.                                                        |

B's two genuine advantages are the last two rows: no virtual publisher identity,
and ops authored by a real device. They do not outweigh the first four. The
decisive asymmetry is reversibility: the server is one deployment under the
maintainer's control, while persisted client state ships to an installed fleet
where a required new field breaks existing installs and a schema bump protects
nobody already out there. A keeps its durable state where it can be withdrawn.

**Recommendation: implement publication before application (Candidate A).**
Candidate C stays rejected (its convergence failures are recorded above) with
atomic upload consumption retained as a primitive. Selection remains the
maintainer's call; what this comparison establishes is that "a coordinated
consumer would be simpler" is not true in this codebase.

Gates that remain open for A, none of them resolved by this comparison: key
agreement inside the encryption wipe window, the 20-entry clock limit and
pruning with a virtual publisher actor, power loss during preparation, submission
retry identity, and server-database restoration. The subsequent experiments cover
key agreement, publisher pruning, and tab closure; simultaneous active tabs are
outside capture scope. Server-database restoration is now characterized as
undetectable server-side rather than resolved, and power loss during preparation
is recorded as a reasoned gap rather than tested. Submission retry identity
remains the one gate with no evidence at all, because it is a protocol decision.

### Repair baseline under clock pressure (2026-09-18)

The PostgreSQL experiment now reproduces a concrete pruning failure. An import
with 30 historical device counters is followed by a causal repair from another
device. The server keeps the repair author's counter when pruning to 20 entries,
and drops the old import author's counter. Retention then removes the import row.
A capture prepared from the repair's actual stored clock was refused forever:
the publication gate still required the old import author's causal edge.

The test-only publication gate now checks the newest causal full-state baseline,
using the same indexed lookup as ordinary upload pruning. A causal repair is
accepted only against the current server prefix, so it can advance that baseline.
The persisted replacement sequence remains a floor: an older retained operation
cannot bypass a newer import, and its persisted clock remains the fallback when
the import row is gone. Markerless legacy repairs cannot advance this baseline.
The stored capture clock must still pass classification before the receipt commits.

The regression fails without this change and passes with it, for both small and
oversized clocks. It also checks that stale work is refused and that the stored
capture preserves both publisher and repair counters within the 20-entry limit.
This fixes the demonstrated server-side refusal. The client-side experiment below
now covers publisher pruning, subsequent edits and conflict recovery.
No production schema, clock limit, or pruning preserve set changed.

### Capture publisher pruned on clients (2026-09-18)

The encrypted browser experiment now also seeds retained history from 21 device
identities with counters above the capture publisher's counter. Each seed uses a
valid task payload built and encrypted by the app and passes through ordinary
server upload; the historical clocks are fixture data, not 21 running browsers.
Two real clients download that history through normal sync. The test asserts
their durable clocks contain exactly 20 entries and, after capture delivery,
neither retains the capture publisher's entry.

Editing the delivered capture then produces a real `CONFLICT_CONCURRENT` response
for an upload missing that entry. The normal resolver recovers the publisher edge
and submits a clock larger than 20 entries, which the server accepts. Both clients
converge on the edited task; reload and receipt retry preserve it. Deletion syncs
to both clients, and a late publication retry cannot recreate the task.

No implementation change or additional preserved actor is needed for this case.
This closes the demonstrated publisher-pruning/edit/delete gate, including its
extra conflict-resolution round trip. It does not claim coverage of every
concurrent-edit schedule or all possible histories at the server's input-size cap.
Reducing the seed to one historical identity makes the test fail at its
greater-than-20 prerequisite, confirming that ordinary low-pressure convergence
cannot be reported as pruning coverage. The 21-identity seed was then restored.

### Single-instance preparation and interruption (2026-09-18)

Normal browser startup checks `BroadcastChannel('superProductivityTab')` and
blocks initialization when another instance responds (`StartupService.init`).
The existing multi-tab sync E2E suite deliberately suppresses that channel.
Supporting two active tabs sharing storage is therefore not a capture release
gate. Startup-check races remain a known limitation of that existing mechanism,
not a reason to add a capture-specific coordination layer.

Two additional encrypted browser cases pass with that startup check intact.
Each stalls the real encrypted-baseline HTTP request, creates and persists a
local task through the UI, then closes the active tab either during the probe or
after preparation finishes. The completed candidate includes the local edit's
clock; preparation changes neither durable operations nor the cursor. Reopening
the same browser storage preserves the local task, with no capture task, receipt,
publisher counter, or publication watermark consumed. Preparing again and syncing
publishes exactly one capture and preserves the local task.

No implementation change was needed. These cases establish recovery from tab
closure at those two boundaries, not OS power loss, storage corruption, or every
possible interleaving inside the exclusive preparation callback. Both focused
cases and the spec's `checkFile` pass. The E2E TypeScript project still reports
42 existing errors, none in this spec; the four earlier browser cases were not
rerun for this test-only addition.

### Power loss during preparation (2026-09-18): recorded gap, not tested

Deliberately not reproduced. Playwright cannot produce OS power loss: closing a
context or a page is a graceful teardown, which is exactly what the two cases
above already cover. The closest approximation is killing the browser process
mid-preparation to leave an IndexedDB transaction unflushed, and what that would
exercise is the app's own persistence layer, not anything capture-specific.

The reasoning that makes it a gap rather than a gate rests on those passing
cases, not on assumption: preparation writes no durable capture state. The
candidate is in-memory, the publisher counter and the queue receipt are consumed
only inside the server's upload transaction, and the tab-closure cases confirmed
that an interrupted preparation leaves operations, cursor, counter and watermark
untouched. A power cut therefore has nothing capture-owned to leave half-written;
the capture stays pending and republishes correctly on the next attempt.

What stays uncovered is an unflushed or partially applied local write in the
app's ordinary IndexedDB persistence. That is an app-wide crash concern that
predates capture and is not made worse by it — a lost local edit is lost the same
way whether or not a capture was being prepared. Revisit this only if an observed
failure implicates the preparation callback specifically.

### Database restore ambiguity (2026-09-18): characterized, not fixed

A new PostgreSQL case rolls the server back to a point-in-time snapshot taken
before a capture was published: the accepted operation, the `user_sync_state`
row, the account's data generation, the publication watermark, and the queue
row are all restored to their pre-publication values. The device's copy of the
already delivered task is deliberately not rolled back, because that divergence
is the failure.

Every existing fence then agrees with a capture that was never published. The
restored generation matches, the watermark matches, the queue row is pending
again, and the candidate's operation ID is unoccupied. The service-level test
publishes a fresh task ID and demonstrates a second publication. Current production preparation and HTTP validation instead require
`capture-${captureId}` as the task ID: another accepted create would target that
same task. Its effect on retained edits/deletions needs ordinary replay evidence;
the service-only test does not establish two distinct production tasks. The
server retains nothing that distinguishes this from a first publication, and no server-side check can, because the evidence was in the rows
the restore discarded.

This is characterization of an unfixed gate, not an accepted outcome. It confirms
the required result already recorded in the failure table: consumption must stay
paused after a restore until recovery resolves the ambiguity, and that pause is
an operational policy the maintainer owns rather than something publication can
enforce. Detecting it at all would need evidence the restore cannot roll back —
for example a device reporting its retained receipt, or a restore procedure that
advances the data generation to fence old preparations. Advancing generation
alone cannot classify pending captures: a fresh preparation can still republish.
The deployment-level pause now exists, and the
[operator restore hold](../../packages/super-sync-server/docs/backup-and-recovery.md#capture-restore-hold)
documents its use before restored service resumes.
Pausing alone does not resolve ambiguous pending captures: reconcile retained
device deliveries or explicitly resolve those items with the user before
resuming, without silently discarding accepted work. A database-only pause flag
can itself be rolled back; restore automation must set any such control after
restoration or use a control outside that database. The HTTP routes honor
`ENABLE_AGENT_CAPTURE_DELIVERY=false`; the internal publication service does not
detect restores. Accounts recovery backups now retain the capture ledger, but
reconciliation of publications after the snapshot and verified resumption remain
open. Do not infer non-delivery from an absent task, operation or pruned clock.

### Failure tests required before production

Use the real server database transaction, valid task operation envelopes, and
the app's normal remote replay. An in-memory fake queue is not sufficient.

| Failure or race                                                        | Required result                                                                                           |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Device dies before publication                                         | Item remains pending; no optimistic task survives.                                                        |
| Two devices prepare different candidates                               | One ordinary task operation is committed; both observe the same receipt.                                  |
| Server commits but the response is lost                                | Retry observes publication; no second task operation.                                                     |
| Server transaction fails                                               | Neither the operation nor a success receipt is committed.                                                 |
| Download or local apply fails after publication                        | Normal sync retries/rebuilds; the capture is not republished.                                             |
| User edits, moves, or deletes the imported task                        | Late queue retries leave those changes intact.                                                            |
| Import/reset races with publication                                    | Existing replacement fence and explicit queue policy govern the result.                                   |
| Operation is pruned after publication                                  | Receipt stays terminal; normal snapshot recovery supplies current state.                                  |
| Device/account/encryption configuration changes                        | Fixed: the wipe advances a monotonic data generation; work prepared under the retired key is refused.     |
| Candidate submitted to another account                                 | Refused: the capture actor is derived from the account, so publisher identity disagrees.                  |
| Two devices prepare against the same watermark                         | Exactly one publishes; the loser stays pending. The watermark is claimed inside the transaction.          |
| Retired-key device prepares inside the wipe window                     | Fixed in the experiment: authenticate the current encrypted baseline and bind its ID to publication.      |
| Local write during baseline probe; tab closes during/after preparation | Covered: local task survives; no capture counter is consumed; retry publishes once.                       |
| Server database backup restores old pending items                      | Open: characterized as undetectable server-side; consumption must stay paused until recovery resolves it. |
| Replacement row pruned by retention or quota recovery                  | Fixed: the boundary's causal identity is persisted beside its seq and outlives the row.                   |
| Repair pruning drops the earlier import author's counter               | Fixed in the harness: use the newer causal repair, with the import sequence as a floor.                   |
| Client pruning drops the capture publisher before a local edit         | Covered: ordinary conflict resolution recovers the edge; edits and deletion converge on both devices.     |
| Boundary pruned on a pre-migration row, never backfilled               | Publication refuses: no causal identity anywhere, and a missing boundary is not an absent one.            |

## Implementation order and release gates

1. **Delivery evidence:** consume-on-accept rejects reliance on existing
   losing-device reconciliation. The revised publication experiment keeps
   unaccepted candidates out of task state, shares task preparation, and checks
   import causality before receipt commitment. The baseline experiment then
   reproduced rejected/failed/pending imports and replaced the retained-history
   clock reader with an applied baseline plus a preparation gate, and the
   retention experiment reproduced a pruned replacement refusing safely but
   permanently, then fixed it by persisting the boundary's causal identity. The
   account/key/tab experiment then reproduced the encryption-toggle wipe window,
   where every fence is absent, and fenced it with a monotonic data generation;
   account binding and multi-tab concurrency were already guarded. The generation's
   delivery is now resolved on the queue read rather than the sync contract, and
   both suites source it that way. The repair/pruning experiment now uses the
   newest causal full-state baseline rather than requiring a retired import edge.
   The current-key experiment authenticates that baseline with the candidate's
   encryption key and rechecks its identity during publication.
2. **Delivery comparison:** done, and **Candidate A is now the selected
   direction** (maintainer decision, 2026-09-18). Publication
   before application is recommended, because a device-owned outbox needs the
   same server arbiter plus durable client state the op log cannot represent
   (local entries have no unapplied status; replay applies them all). Remaining
   work is the gate list there, not another candidate.
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

- 2026-09-21: a real backup/restore regression reproduced loss of the entire
  capture ledger in the recommended accounts-only recovery artifact: the
  unmodified `backup.sh` dump restored only `users` and `passkeys`. The script now
  includes `agent_capture_accounts` and `agent_captures` in that same `pg_dump`
  snapshot, preserving server-only pending content, terminal receipts and
  publisher counters while still excluding the operation log. The real restore
  test passes after the change, including private artifact permissions, account
  generation and passkeys; the three existing backup-script tests pass. The
  PostgreSQL CI command includes the regression and passes its service-container
  ID. Operator docs now require capture to remain paused, preserve terminal
  receipts even without retained operations, distinguish missing evidence from
  non-delivery, and explicitly gate resumption. This fixes backup omission, not
  rollback ambiguity or automatic reconciliation. Production runtime sync and
  publication code did not change in this slice.

- 2026-09-21: two additional production HTTP-delivery browser tests pass against
  disposable PostgreSQL and the real app/server. The first holds two independently
  prepared publication requests until both arrive, proves neither task exists
  optimistically, then releases both: one returns `published`, the other
  `already_published`, both apps receive one task through ordinary replay, and
  later sync retains the same receipt and single server operation. The second
  closes a tab while its publication request is held before forwarding; no
  receipt or operation exists, the queue remains pending, and reopening the same
  browser storage delivers exactly once. These complement the existing response
  loss after commit, edit/delete, and batch-limit cases, bringing the production
  HTTP-delivery suite to five scenarios. The two new tests and their required
  `checkFile` pass. This demonstrates tab interruption, not process power-loss
  durability or assistant transport behavior; the submission contract, real
  connector/OAuth, and restore reconciliation gates remain open.

- 2026-09-21: the client delivery slice adds authenticated app-only pending/read
  and publication routes, an optional advertised provider capability, and a
  disabled-by-default deployment flag. Preparation reuses the canonical Inbox
  task factory, verifies the exact encrypted baseline, and preserves the
  existing sync epoch/write locks. Publication never applies a local candidate;
  normal download/replay owns task state and cursor advancement. Ten captures
  bound one cycle; a full batch or optional delivery failure retains pending
  sync status without blocking ordinary uploads. PostgreSQL/Fastify route
  integration passes 3 cases; shared HTTP contracts 97, provider tests 109,
  server configuration 32, app response validation 51, preparer 2, applied
  baseline integration 6, delivery orchestration 14, sync wrapper 176, and
  main-header 23 pass.
  The three production-delivery browser cases pass: encrypted two-device
  edit/delete, actual HTTP response loss followed by app reload without duplicate
  publication, and an eleven-item queue split across manual syncs with truthful
  pending status. The latter failed before the wrapper/header status connection
  was fixed. A seeded capture also remained pending before consumer wiring and
  published after wiring. These runs use a focused Playwright config that skips
  unrelated bundled-plugin global setup. Full E2E type-checking still reports
  41 existing errors outside the changed capture files (the previous 42 included
  a stale generated-package error removed by rebuilding). The deployment flag
  provides a restore pause, but does not resolve ambiguous restored captures or
  authorize resumption.

- 2026-09-21: the seven existing publication browser scenarios now use the
  extracted production preparer. Six passed in the full run (tab closure during
  and after preparation, encryption wipe/retired key, encrypted two-device
  receipt replay, and both backup-import preparation paths). The clock-pruning
  variant timed out on a completion indicator during a run that overlapped a
  frontend rebuild, then passed on its isolated stable rerun. This is not proof
  of process power-loss recovery. The three new HTTP-delivery scenarios pass
  separately; the existing scenarios still orchestrate publication through the
  production-service test fixture with automatic delivery disabled.

- 2026-09-21: the server slice moves publication into
  `src/sync/capture-publication.service.ts` and adds Prisma-backed capture and
  publisher-counter rows. The receipt remains on the capture row without an
  operation foreign key, so pruning/imports cannot remove it. Fault injection
  and submission policy remain in the test fixture; no route enables capture.
  Against a fresh disposable PostgreSQL 15 database, the existing 25 cases passed
  before extraction. Bypassing publication for ordinary upload made the receipt
  regression fail after the operation was accepted. After extraction, 26 cases
  pass, including explicit plaintext-clearance/rollback assertions and account
  deletion. The new migration was applied over the preceding Prisma schema.
  Server and focused integration-test TypeScript compilation, all changed
  TypeScript files' `checkFile`, Prisma validation, and 132 existing upload and
  migration tests pass. The E2E TypeScript project reports 42 errors, matching
  the previously recorded count, with none in the publication service, fixture,
  or browser spec. This is server transaction evidence only: browser suites,
  actual assistant retries, OAuth, and restore recovery were not validated by
  this run.

- 2026-09-18: analysis only, no code changed. Two adversarial reviews with
  opposing mandates and an external CLI review narrowed the submission-identity
  decision; the CLI review found that an ephemeral fingerprint cannot back the
  post-publication conflict response, which the in-repo cache bounds confirm.
  Conclusions and their sources are in "Narrowing the submission decision". The
  decision itself stays open, and the local-MCP experiment that would settle it
  has not been built or run.
- 2026-09-18: the focused PostgreSQL suite passes 25 cases (3.0 seconds test
  duration) against a fresh disposable PostgreSQL 15 container reachable only
  over a bind-mounted unix socket, with the current Prisma schema applied by
  `db push`. The added case characterizes the database-restore gate: a
  point-in-time rollback of the operation, sync-state, generation, watermark and
  queue rows lets the same capture publish a second task while the device keeps
  the first. A negative control confirms it fails when the queue rollback is
  removed. `checkFile` passes for the spec and the harness; the harness change
  only exports its two test-table names. No production code changed, and the gate
  is recorded as open rather than closed.
- 2026-09-18: the publication/wipe ordering regression passes in the focused
  24-case PostgreSQL suite. It pauses publication after its account-generation
  read, starts a real `deleteAllUserData`, and verifies the reset waits until
  publication commits, then removes that accepted operation while retaining its
  receipt. Removing only the wipe-side sync-state lock leaves the operation
  behind; the regression fails as expected. The lock is deliberately acquired
  before either path changes sync rows, so it serializes the generation read
  with the reset rather than merely protecting the final increment.
- 2026-09-18: the focused PostgreSQL publication suite passes 24 cases against
  a fresh disposable loopback-only PostgreSQL 15 database (2.02 seconds test
  duration; 2.46 seconds total). Prisma applied the current server schema
  before the run. Four cases separate test-only queue submission behavior from
  publication retries: repeated/concurrent identical pending submissions retain
  one immutable capture, IDs are scoped to an account, conflicting pending
  content is refused, and a post-publication retry remains unsupported rather
  than being mistaken for receipt recovery. This does not establish an HTTP or
  MCP endpoint, connector retry behavior, or a production request-deduplication
  contract. No production sync/encryption code changed. The endpoint's
  stable-identity ownership and conflicting-content response remain explicit
  release decisions.
- 2026-09-18: the original encrypted publication/edit/delete browser case and
  its new 21-identity clock-pressure variant both pass (2.0 minutes). The latter
  asserts actual client pruning, a genuine concurrent rejection, and acceptance
  of the resolver's recovered clock with more than 20 entries. The one-identity
  negative control fails at the pressure prerequisite. `checkFile` passes for the
  modified spec; the E2E TypeScript project retains 42 existing errors, none in
  this spec. The other browser cases and SQL suite were not rerun for this
  test-only extension.
- The current-key experiment passes 19 PostgreSQL cases, using real ciphertext
  for the wipe-window failure and the post-wipe success path. Coverage includes
  missing/wrong baseline evidence, same-generation baseline replacement, and
  terminal receipt recovery after the verified baseline is deleted. The
  wipe-window safety assertion was observed failing before the fix.
  The new Chromium scenario also passes: empty-window refusal, wrong-key refusal
  after re-upload, unchanged local persistence/cursor, then ordinary delivery
  on a second device with the current key. Temporarily bypassing only the local
  decrypt made its wrong-key assertion fail; the helper was then restored.
  With the restored guard, all four publication Chromium scenarios pass in
  7.0 minutes using the focused local configuration. All four modified TypeScript
  files pass `checkFile`; app compilation and focused server-test compilation
  pass. The E2E TypeScript project retains its 42 pre-existing errors, with none
  in the changed publication spec. The full E2E suite and real connector flows
  were not run.
- 2026-09-18: the unchanged 17-case publication SQL suite passes against a fresh
  isolated PostgreSQL database, closing its queue-generation rerun gap. The
  expanded repair/pruning suite passes 18 cases; the oversized-clock regression
  was first observed failing at publication before the harness fix.
  All three encrypted Chromium publication scenarios also pass (6.3 minutes),
  closing the browser queue-generation rerun gap with the updated harness. This
  used the existing temporary focused Playwright configuration, not global setup
  or the full E2E suite. Both changed TypeScript files pass `checkFile` and a
  focused strict TypeScript compilation. The new pruning case is SQL coverage;
  the browser scenarios do not exercise oversized clocks.
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
- The same three scenarios pass again (5.9 minutes) with the data generation
  threaded through preparation. Running them is what caught the threading bug:
  the helper referenced a `prisma` binding that only exists inside each test, so
  every scenario failed with `ReferenceError` until the harness was passed in
  explicitly. `e2e/tsconfig.json` would have reported it, but that project has 42
  pre-existing type errors and nothing runs it, so neither `checkFile` nor the
  server build caught it. Treat a green `checkFile` on an E2E spec as formatting
  and lint only.
- The browser spec passes `checkFile`. This local run used a temporary minimal
  Playwright configuration against the running app and isolated PostgreSQL-backed
  SuperSync server: normal global setup stopped at unrelated bundled-plugin build
  failures. The full E2E suite and live assistant/OAuth flows were not run.
- The account/key/tab cases bring the publication SQL suite to seventeen, all
  passing against isolated PostgreSQL, alongside the full server unit suite
  (1321 passing) and the canonical `test:integration:postgres` list. The only
  failure in that list is `operations-autovacuum-reloptions`, which asserts a
  PostgreSQL 16 floor against a 15 container — environmental, unrelated to this
  change. `multi-client-sync` and `snapshot-skip-optimization` are mocked-Prisma
  suites that the integration glob picks up but the canonical list excludes;
  they fail under that config regardless of this change.
- Both halves of the generation fence were falsified independently: dropping the
  increment fails three cases, disabling the publication-side comparison fails
  the two safety refusals.
- The boundary between the two fences is asserted, not assumed: a completed
  encryption toggle (wipe followed by the full-state re-upload) is refused by the
  ordinary replacement fence with the generation deliberately satisfied, so the
  new counter is credited only with the wipe window.
- The generation now reaches both suites the way a production preparer would
  get it, from the queue read that hands out the capture; the harness's database
  peek is deleted. The three cases that turn on the generation are unchanged in
  substance — pre-wipe read refuses, a post-wipe re-queue does not refresh an
  older candidate's value, and a read after the wipe publishes. **At that commit,
  neither DB-backed suite was re-run**: the sandbox could not reach the
  PostgreSQL container (mapped host port and container IP both unreachable), so
  the evidence here is the server test files' clean `tsc` pass, the E2E
  project's error count staying at its 42 pre-existing errors with none in this
  spec, and `checkFile`. Re-run both suites before trusting it.
- The delivery comparison is source evidence, not a run: the decisive facts are
  `OperationLogEntry.applicationStatus` being documented for remote ops only
  (`packages/sync-core/src/operation.types.ts`), hydration replaying every tail
  entry except `reducerRejectedAt` ones
  (`operation-log-hydrator.service.ts` `_replayTailOps`), and
  `MAX_VECTOR_CLOCK_SIZE = 20` (`packages/sync-core/src/vector-clock.ts`).
  Candidate B was never built, so its column in that table is derived cost, not
  a measurement.
- At the end of the 2026-09-18 experiments, production publication and actual
  phone/assistant onboarding were unimplemented; the 2026-09-21 entry above
  supersedes the publication/preparation status. Submission retry identity,
  server-database restoration, and power-loss recovery remain release gates.

The publication SQL retention cases use the ordinary upload path for an import
and a later causal REPAIR, then delete below the retention sweep's boundary.
Both small and oversized clocks are covered: a candidate prepared from the repair
publishes, while stale work is still refused. A separate case nulls the evidence
columns to stand in for a pre-migration row with no retained boundary and asserts
publication still refuses.

Additional SQL cases cover account changes, key changes, and competing candidates. Three
use the real `deleteAllUserData` for the wipe: refusal of a candidate prepared
before it, refusal again after the capture is re-queued at a restarted watermark,
and successful encrypted publication after verifying the current baseline. Another
runs the whole toggle — wipe plus the full-state re-upload through the ordinary
upload path — and asserts the pre-existing replacement fence refuses the stale
candidate on its own. The last two assert cross-account refusal and that exactly
one of two same-watermark candidates publishes.

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
and restart coverage uses app reload, tab closure with the same storage, and a
fresh harness instance. They do not
exercise a real MCP request, an HTTP publication route, or process power loss.
Keep `ENABLE_AGENT_CAPTURE_DELIVERY=false` for these manually orchestrated cases.

The production delivery browser suite is
[`agent-capture-delivery.spec.ts`](../../e2e/tests/sync/agent-capture-delivery.spec.ts).
It uses the same database/server/frontend setup with
`ENABLE_AGENT_CAPTURE_DELIVERY=true`. Only enqueueing uses the fixture; the app
prepares and publishes through authenticated HTTP and receives ordinary sync
operations. The capture publication and HTTP integration suites are both in
`npm run test:integration:postgres`.

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
