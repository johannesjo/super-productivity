# Agent capture: next steps runbook

What remains on the Stage A agent-capture work. Parts 1 and 2 need a human.
The server and app delivery slice in Part 3 is implemented internally as of
2026-09-21, disabled by default. Assistant submission, the connector, and restore
reconciliation remain release work.

Design record: [`2026-09-17-agent-capture-stage-a.md`](./2026-09-17-agent-capture-stage-a.md).
Probe source and reference: [`packages/super-sync-server/tests/experiments/agent-capture-retry-probe/`](../../packages/super-sync-server/tests/experiments/agent-capture-retry-probe/).

## Status going in

- **Selected:** Candidate A, publication before application.
- **Open, informed by Part 1:** who owns the stable submission identity across
  retries, and the endpoint response for a reused identity with conflicting
  content. The real connector path must validate the eventual contract.
- **Open, needs Part 2:** how capture consumption pauses and resumes after a server
  database restore. Restored database state alone cannot reveal the rollback.
- **Delivery slice implemented:** Prisma capture storage, the publication
  transaction, authenticated app delivery routes, and encrypted app preparation
  followed by ordinary sync replay. `ENABLE_AGENT_CAPTURE_DELIVERY` defaults to
  false; older/disabled servers are not polled by the app.
- **Validated locally:** two-device edit/delete, lost-response restart, and the
  bounded sync batch. Release gate 4 still requires the remaining failure and
  restore-recovery evidence; local tests do not establish connector behavior.
- **Externally blocked:** the real connector spike (gate 3) needs a publicly
  reachable deployment and an assistant account.

---

## Part 1 — run the retry probe

Observes whether an assistant retries a failed capture tool call with the same
argument values and submission identity. It cannot establish wire-byte equality.

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

## Part 2 — decide the restore recovery policy

Start with an operator runbook as the leanest policy, but release still needs an
executable way to pause capture consumption before a restored server accepts
work. If the deployment cannot guarantee that pause, add a durable control
outside the restored database or another concrete startup procedure before
release. A flag stored only in the database can be rolled back by the same
restore and cannot detect that a restore occurred.

A point-in-time restore rolls back the queue row, the publication watermark, the
account generation and the accepted operation together, while a device keeps the
task it already downloaded. Every fence then agrees with a capture that was never
published, so it publishes a second task. This is characterized by a passing test
and cannot be detected from restored server rows — the evidence was in the rows
the restore discarded.

The runbook must separately describe **pause** and **resolution/resumption**:
keep consumption paused while the operator reconciles restored pending captures
against deliveries retained by devices, or explicitly resolves each ambiguous
item with the user. Do not silently discard accepted captures. Resume only when
that ambiguity is resolved and the pause is deliberately cleared. Record the
selected mechanism and procedure in the Stage A plan's restore section and
failure table. The deployment flag `ENABLE_AGENT_CAPTURE_DELIVERY=false` now provides the
pause outside the restored database. Keep it false before starting a restored
server. The reconciliation/resumption procedure remains undecided, so the
restore gate stays open.

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

**Needs an explicit submission contract, informed by Part 1 and later validated
through the real connector:**

- The HTTP/MCP surface: whether a submission identity is required, and the
  response to a reused identity with conflicting content.

Next, run Part 1 in fresh human-operated assistant sessions and settle the
submission contract, then build capture-only authorization and submission.
Decide the restore reconciliation/resumption procedure before enabling delivery
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
