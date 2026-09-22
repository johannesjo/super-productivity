# Agent capture: next steps runbook

What remains on the Stage A agent-capture work. Parts 1 and 2 need a human.
The server and app delivery slice in Part 3 is implemented internally as of
2026-09-21, disabled by default. Assistant submission, the connector, and
verified restore resumption remain release work.

Design record: [`2026-09-17-agent-capture-stage-a.md`](./2026-09-17-agent-capture-stage-a.md).
Probe source and reference: [`packages/super-sync-server/tests/experiments/agent-capture-retry-probe/`](../../packages/super-sync-server/tests/experiments/agent-capture-retry-probe/).

## Status going in

- **Selected:** Candidate A, publication before application.
- **Open, informed by Part 1:** who owns the stable submission identity across
  retries, and the endpoint response for a reused identity with conflicting
  content. The real connector path must validate the eventual contract.
- **Open, needs Part 2:** verified resumption after a server database restore.
  The deployment pause, the operator resolution transaction and the backlog gate
  now exist; restored database state alone still cannot establish which pending
  captures already published, so each outcome stays an operator decision.
- **Delivery slice implemented:** Prisma capture storage, the publication
  transaction, authenticated app delivery routes, and encrypted app preparation
  followed by ordinary sync replay. `ENABLE_AGENT_CAPTURE_DELIVERY` defaults to
  false; older/disabled servers are not polled by the app.
- **Validated locally:** two-device edit/delete, lost-response restart, competing
  app publishers, tab closure before submission, and the bounded sync batch. Release gate 4 still requires the remaining failure and
  restore-recovery evidence; local tests do not establish connector behavior.
- **Externally blocked:** the real connector spike (gate 3) needs a publicly
  reachable deployment and an assistant account.

---

## Part 1 — retry probe: run once (2026-09-22), open for a second assistant

Observes whether an assistant retries a failed capture tool call with the same
argument values and submission identity. It cannot establish wire-byte equality.

**Run on 2026-09-22** against Claude Code 2.1.278: 5/5 failed calls retried
unprompted with the same arguments and the same `submissionId`, across all three
failure modes; the optional field was volunteered in only 2 of 3 successful
calls. Full counts and limits in the Stage A validation record. The result is
capped by the probe's own tool description, which instructs reuse. Re-running
hint-free the same day settled that: with no instruction, the client supplied no
`submissionId` on any of 7 calls, and a retry became indistinguishable from a
duplicate. Treat the hinted result as obedience, not disposition; a second
assistant is still worth running before the contract leans on either.

### The validity rule, before anything else

**Use a fresh session with an assistant that has not read the probe's source or
this runbook.** An assistant that knows the experiment may reuse a `submissionId`
deliberately, which proves nothing. Do not tell it what to send, mention
idempotency, or paste the tool description back to it. Ask for a task to be
captured the way you normally would. For each trial, start a fresh probe server
process with its own log path and keep only one probe entry active. Failure modes
affect only the first call in that process; reusing it would invalidate later
trials.

Use a throwaway task title. Nothing identifying, even though titles are never
written to the log.

### Step 1 — register one probe entry

Wrapping the command in `env` pins both the mode and the log path, so you can find
the results regardless of where your client sends stderr:

```sh
claude mcp add capture-probe -- env \
  CAPTURE_PROBE_MODE=ok \
  CAPTURE_PROBE_LOG=/tmp/capture-probe-ok-trial-1.jsonl \
  node /home/johannes/www/super-productivity/.worktrees/feat/task-1-7236d7/packages/super-sync-server/tests/experiments/agent-capture-retry-probe/server.mjs
```

Confirm the assistant can see a `capture_task` tool before continuing. For each
subsequent trial, remove the old entry, register the selected mode with a new log
path, and start a fresh assistant session and server process. Do not leave two
`capture_task` probe entries available at once.

### Step 2 — control run (`ok`)

Using the entry from step 1, ask for one capture; it succeeds.

This establishes the baseline: one call, one digest, and whether the assistant
supplies an optional `submissionId` when nothing has gone wrong.

### Step 3 — the case that matters (`fail-first`)

Replace the entry with `CAPTURE_PROBE_MODE=fail-first` and a unique log path. In
a fresh session, ask for a capture. The tool reports an error. Ask it to try
again — in your own words, without suggesting how.

The probe records acceptance, then returns an MCP tool error. It approximates a
failed call after acceptance; it does **not** drop the transport response.

### Step 4 — the other two modes

Repeat step 3 in fresh trials with `CAPTURE_PROBE_MODE=error-before-accept`, then
with `CAPTURE_PROBE_MODE=timeout`. The timeout mode stalls for 120 seconds by
default, then returns an error. Count it as a client timeout only if the client
actually reaches its own deadline before the probe responds; otherwise it is a
delayed tool error. Use a separate log path and process for every trial.

These distinguish "failed before doing anything" from "failed after doing the
work" — an assistant may reasonably treat them differently.

### Step 5 — read the logs

Each line is one call. The fields that matter:

```
argRepeat   2  → these normalized argument values were seen before
idRepeat    2  → this submissionId was seen before
hasSubmissionId → whether it supplied one at all
```

Per mode, count: total calls, distinct `argDigest`, distinct `idDigest`.

| Observation                        | What it means                                                     |
| ---------------------------------- | ----------------------------------------------------------------- |
| `argRepeat` reaches 2 on the retry | The normalized values match; this says nothing about wire bytes.  |
| `idRepeat` reaches 2 on the retry  | This assistant reused its optional identity in this trial.        |
| `hasSubmissionId` false throughout | This assistant did not supply the optional field in these trials. |
| Every call has a fresh `idDigest`  | This assistant supplied different identities in these attempts.   |

These observations cannot prove that a required key is unusable or that a
connector owns and preserves the key across its transport retries. The probe's
tool description asks for reuse, and its schema makes `submissionId` optional.
Keep the endpoint contract open until the real connector path is tested.

### Step 6 — record it

Run each mode at least three times in separate processes and sessions; a single
run characterizes one client on one day. If you can, repeat with a second assistant.

Add one entry to the validation record in the Stage A plan with the date, the
modes run, the sample size per mode, the counts, and what remains unproven. State
the client and version. Then remove the probe entry:

```sh
claude mcp remove capture-probe
```

**What this does not establish:** remote connector transport retries, OAuth,
authorization, or deployment routing. It characterizes one assistant's argument
handling. Gate 3 stays open regardless of the outcome.

---

## Part 2 — restore recovery: rehearsed, pending a real incident record

Use the deployment pause and operator runbook before a restored server accepts
capture work. The pause, the resolution transaction and the backlog inventory
exist, and the pause -> resolve -> resume order is now rehearsed end to end in
the browser (2026-09-22). What remains is the account-by-account record an
actual incident requires, and the absent-row case below. The pause must remain
outside the restored database: a database-only flag can roll back with the same
restore.

A point-in-time restore rolls back the queue row, the publication watermark, the
account generation and the accepted operation together, while a device keeps the
task it already downloaded. Every fence then agrees with a capture that was never
published, so it can accept another create operation for the same capture.
Production fixes the task ID to `capture-${captureId}`. The 2026-09-21 encrypted
browser restore cases now demonstrate a second accepted CREATE with that same
identity: the surviving client keeps its edit or deletion, while a fresh client
recovers the original title from the republished capture. These are mismatched
device states, not evidence of two distinct task IDs. The older service-level
test used distinct task IDs. The lost-publication history
cannot be detected from restored server rows — the evidence was in the rows the
restore discarded.

The runbook must separately describe **pause** and **resolution/resumption**:
keep consumption paused while the operator reconciles restored pending captures
against deliveries retained by devices, or explicitly resolves each ambiguous
item with the user. Do not silently discard accepted captures. Resume only when
that ambiguity is resolved and the pause is deliberately cleared. Record the
selected mechanism and procedure in the Stage A plan's restore section and
failure table. The deployment flag `ENABLE_AGENT_CAPTURE_DELIVERY=false` now provides the
pause outside the restored database. Keep it false before starting a restored
server. The operator procedure is now documented in
[Capture restore hold](../../packages/super-sync-server/docs/backup-and-recovery.md#capture-restore-hold).
Accounts recovery backups now preserve pending captures, receipts and publisher
counters in the same snapshot as credentials. A real dump/restore regression
failed before this correction and passes afterward.

The reconciliation transaction and resumption gate now exist (2026-09-22).
`agent_captures` carries an additive `resolution`/`resolved_at` pair; an operator
records `delivered_out_of_band` or `discarded_by_user` per ambiguous item with
`npm run capture-restore -- resolve`, and `status` exits non-zero while anything
is unresolved. A resolution is terminal for every read path and for publication,
clears the plaintext, and invents no operation identity. `delivered_out_of_band`
also reclaims the publisher clock value the erased publication consumed on
devices. **This is an operator procedure, not automatic safety:** an unpaused
restored deployment still republishes, and nothing reconstructs missing evidence.
`agent_captures.created_at` (2026-09-22) lets `status --created-before
<snapshot>` scope the gate to rows the restore made ambiguous. Without it an
unscoped backlog mixes restore-era rows with legitimately new submissions and can
never reach zero once submission is live, leaving `resolve` — which destroys a
genuine capture's content — as the only way to clear one. Added while the table
is empty everywhere; after real rows exist it would mean inventing timestamps.

The rehearsal now exists: `e2e/tests/sync/agent-capture-restore.spec.ts` holds
both the unresolved characterization and a passing resolved-resumption case with
browser replay on surviving and fresh clients. The release gate that remains is
the account-by-account recovery record for a real incident, which one rehearsed
account cannot stand in for.

---

## Part 3 — bounded production delivery slice (release gate 4)

Implemented internally on 2026-09-21 in
[`capture-publication.service.ts`](../../packages/super-sync-server/src/sync/capture-publication.service.ts),
with an additive Prisma migration, followed by authenticated app transport and
client consumption. The fixture calls the production publication path; 26
PostgreSQL transaction cases pass. Completion of this slice does not close
release gate 4.

**Implemented:**

- Queue/terminal-receipt and publisher-counter rows as real Prisma models,
  replacing the publication harness's raw test-only tables.
- The publication path inside the ordinary upload transaction: generation fence
  first, then account counter, queue row, watermark check, publisher identity,
  replacement-boundary causality, and the encrypted-baseline recheck.
- Terminal receipt semantics: plaintext cleared, receipt surviving delete,
  import and operation pruning.
- Existing failure cases exercise the production path, with additional assertions
  for plaintext clearance, rollback retention, and account deletion. The restore
  case still characterizes an unresolved duplicate, not a fixed recovery policy.
- App JWT routes `GET /api/sync/captures/pending` and
  `POST /api/sync/captures/publish`, advertised only while delivery is enabled.
  These consume queued captures; they do not authorize an assistant or enqueue
  new submissions.
- Production preparation verifies the current encrypted baseline and prepares
  under the existing write lock without applying a task. The sync cycle then
  publishes and downloads through ordinary replay; receipts never advance the
  local cursor. A cycle handles at most ten captures and keeps sync pending on
  deferral or a full batch while ordinary uploads continue.
- Browser validation uses real app sync and authenticated HTTP against seeded
  PostgreSQL rows, rather than calling a test-only publisher from the app.
  Five scenarios cover edit/delete, response loss after commit, a bounded batch,
  competing publishers, and tab closure before submission.

**Needs an explicit submission contract, informed by Part 1 and later validated
through the real connector:**

- The HTTP/MCP surface: whether a submission identity is required, and the
  response to a reused identity with conflicting content. Part 1 (2026-09-22)
  narrows this: an assistant told by the tool description to reuse its
  `submissionId` did so on 5/5 failures, but supplied the optional field in only
  2 of 3 successes. So a REQUIRED identity looks workable only if the description
  demands it, and the endpoint must still answer for a submitter that omits it or
  reuses one with different content — neither of which this probe can settle.
  Note the probe also separated retry-after-failure from repeat-after-success on
  its own, so a reused identity is a stronger signal of retry than expected.
  The hint-free re-run sharpens this into a recommendation: **do not design an
  endpoint that dedupes on an optional client key.** Unprompted the client sent
  none at all, leaving retry and duplicate byte-identical. Either the tool
  description demands an identity and the endpoint requires it, or the endpoint
  must be safe for submitters that supply nothing — the middle option is the one
  the evidence rules out.
- **Whether `captureId` must be _minted_ opaque.** Partly addressed on
  2026-09-22: `SuperSyncCaptureIdSchema` bounds the inbound shape on both request
  paths (`[A-Za-z0-9._:-]{1,200}`), so a submitter can no longer pass a sentence
  into operator output, and the restore hold's claim about its own output is now
  true. It is **not** opaque — `BuyMilkForMum` still parses — and it still becomes
  the task ID `capture-${captureId}`. Requiring a UUID/ULID belongs at the
  submission boundary, which does not exist yet; retrofitting it onto the
  publication request would only re-validate an ID the server already stored.
  Response schemas stay loose so a stored ID cannot hard-fail a client.
- **Reclaiming a clock value for a capture absent from the snapshot.** `resolve`
  needs a row. A capture submitted AND published after the backup leaves none, so
  its consumed publisher clock value cannot be reclaimed with the current tool,
  and the backlog reports clean. Decide the mechanism alongside submission.

Next, run Part 1 in fresh human-operated assistant sessions and settle the
submission contract, then build capture-only authorization and submission.
Rehearse the restore procedure on an isolated restore before enabling delivery
on a restored deployment. The real connector path, remaining delivery failure
evidence, and restore recovery remain release gates. Every change here is production sync
code — the highest-risk area in the repo. Re-read the
sync-correctness rules and
[`contributor-sync-model.md`](../sync-and-op-log/contributor-sync-model.md) before
starting, and start from a reproducible failure rather than adding guards.

---

## What not to do

- Do not promote the harness's `throw new Error('… immutable once queued')` into a
  published status code without deciding the contract first.
- Do not add a persisted content hash. It is a low-entropy commitment over short
  task titles that would outlive the plaintext publication deliberately erases and
  ride 14 days of full database dumps.
- Do not rely on an ephemeral fingerprint either: the existing dedup cache is
  process-local with a 10,000-entry cap and a five-minute TTL, so it cannot back a
  contract.
- Do not treat a passing harness test as an endpoint guarantee.
