# Agent capture: next steps runbook

What to do next on the Stage A agent-capture experiment, in order. Parts 1 and 2
need a human and take under an hour together. Part 3 is the large one and should
start in its own session.

Design record: [`2026-09-17-agent-capture-stage-a.md`](./2026-09-17-agent-capture-stage-a.md).
Probe source and reference: [`packages/super-sync-server/tests/experiments/agent-capture-retry-probe/`](../../packages/super-sync-server/tests/experiments/agent-capture-retry-probe/).

## Status going in

- **Selected:** Candidate A, publication before application.
- **Open, needs Part 1:** who owns the stable submission identity across retries,
  and the endpoint response for a reused identity with conflicting content.
- **Open, needs Part 2:** what happens to capture consumption after a server
  database restore. No server-side check can detect it; this is operational policy.
- **Open, needs Part 3:** durable delivery (release gate 4).
- **Externally blocked:** the real connector spike (gate 3) needs a publicly
  reachable deployment and an assistant account.

---

## Part 1 — run the retry probe

Answers one question: when a capture tool call fails, does an assistant retry it
with byte-identical arguments, and does it reproduce a submission identity it
supplied the first time?

### The validity rule, before anything else

**Do the probing in a fresh session with an assistant that has not read the probe's
source or this runbook.** An assistant that knows the experiment will reuse a
`submissionId` deliberately, which proves nothing. Do not tell it what to send, do
not mention idempotency, and do not paste the tool description back to it. Ask for
a task to be captured the way you normally would.

Use a throwaway task title. Nothing identifying, even though titles are never
written to the log.

### Step 1 — register the probe

Wrapping the command in `env` pins both the mode and the log path, so you can find
the results regardless of where your client sends stderr:

```sh
claude mcp add capture-probe -- env \
  CAPTURE_PROBE_MODE=fail-first \
  CAPTURE_PROBE_LOG=/tmp/capture-probe-fail-first.jsonl \
  node /home/johannes/www/super-productivity/.worktrees/feat/task-1-7236d7/packages/super-sync-server/tests/experiments/agent-capture-retry-probe/server.mjs
```

Confirm the assistant can see a `capture_task` tool before continuing.

### Step 2 — control run (`ok`)

Register a second entry with `CAPTURE_PROBE_MODE=ok` and
`CAPTURE_PROBE_LOG=/tmp/capture-probe-ok.jsonl`. Ask for one capture; it succeeds.

This establishes the baseline: one call, one digest, and whether the assistant
supplies a `submissionId` at all when nothing has gone wrong. If it never supplies
one unprompted, that alone is most of the answer.

### Step 3 — the case that matters (`fail-first`)

Using the entry from step 1: ask for a capture. The tool reports an error. Ask it
to try again — in your own words, without suggesting how.

This is the lost-response case: the server accepted the work and the reply never
arrived. It is the exact scenario idempotency exists for.

### Step 4 — the other two modes

Repeat step 3 with `CAPTURE_PROBE_MODE=error-before-accept`, then with
`CAPTURE_PROBE_MODE=timeout` (stalls 120s; set `CAPTURE_PROBE_TIMEOUT_MS` lower if
your client gives up sooner). Separate log paths for each.

These distinguish "failed before doing anything" from "failed after doing the
work" — an assistant may reasonably treat them differently.

### Step 5 — read the logs

Each line is one call. The fields that matter:

```
argRepeat   2  → this exact argument set was seen before
idRepeat    2  → this submissionId was seen before
hasSubmissionId → whether it supplied one at all
```

Per mode, count: total calls, distinct `argDigest`, distinct `idDigest`.

| Observation                        | What it means                                                                                                                             |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `argRepeat` reaches 2 on the retry | The retry reproduced its arguments exactly.                                                                                               |
| `idRepeat` reaches 2 on the retry  | It reproduced the identity. **This supports requiring a connector-owned key.**                                                            |
| `hasSubmissionId` false throughout | It never supplies one unprompted. A required key is unusable without prompting work.                                                      |
| Every call a fresh `idDigest`      | It mints a new identity per attempt. A required key fails in the case it exists for; **the at-least-once endpoint is the honest option.** |

### Step 6 — record it

Run each mode at least three times before concluding anything; a single run
characterizes one client on one day. If you can, repeat with a second assistant.

Add one entry to the validation record in the Stage A plan with the date, the
modes run, the sample size per mode, the counts, and which endpoint option the
result supports. State the client and version. Then remove the probe entries:

```sh
claude mcp remove capture-probe
```

**What this does not establish:** remote connector transport retries, OAuth,
authorization, or deployment routing. It characterizes one assistant's argument
handling. Gate 3 stays open regardless of the outcome.

---

## Part 2 — decide the restore recovery policy

No code to write; this is an operational decision.

A point-in-time restore rolls back the queue row, the publication watermark, the
account generation and the accepted operation together, while a device keeps the
task it already downloaded. Every fence then agrees with a capture that was never
published, so it publishes a second task. This is characterized by a passing test
and cannot be fixed server-side — the evidence was in the rows the restore discarded.

Decide one of:

1. **Automatic pause.** Restoring the database sets a flag that blocks capture
   consumption until it is explicitly cleared. Safe by default; needs a flag, an
   admin path to clear it, and a way to not forget it is set.
2. **Runbook step.** Restoration procedure documents pausing capture consumption
   before the server comes back up. No code; relies on whoever runs the restore
   following it under pressure.

Then update the failure-table row and the restore section in the Stage A plan to
record the choice. Option 1 only earns a flag if a restore has actually happened
or is expected; otherwise 2 is the leaner honest answer.

---

## Part 3 — durable delivery (release gate 4)

The large piece, now unblocked by the Candidate A selection. Start it in its own
session.

**Ready to build — already characterized by the 25-case harness:**

- Queue and receipt models as real Prisma models, replacing the harness's raw
  test-only tables.
- The publication path inside the ordinary upload transaction: generation fence
  first, then account counter, queue row, watermark check, publisher identity,
  replacement-boundary causality, and the encrypted-baseline recheck.
- Terminal receipt semantics: plaintext cleared, receipt surviving delete,
  import and operation pruning.
- Port the existing failure cases to the production path rather than rewriting
  them; they encode reasoning that took several experiments to earn.

**Must wait for Part 1:**

- The HTTP/MCP surface: whether a submission identity is required, and the
  response to a reused identity with conflicting content.

Build the durable core first and leave the endpoint surface last. Every change
here is production sync code — the highest-risk area in the repo. Re-read the
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
