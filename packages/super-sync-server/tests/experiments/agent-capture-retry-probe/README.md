# Agent-capture retry probe

A local MCP server that answers one question for the agent-capture
submission-identity gate:

> When a capture tool call fails or times out, does the assistant retry it with
> the same argument values, and does it reproduce a submission identity it
> supplied the first time?

This is one input to the submission decision, not proof of connector-owned retry
identity or of how a required field would behave. See "Narrowing the submission
decision (2026-09-18)" in
[`docs/plans/2026-09-17-agent-capture-stage-a.md`](../../../../../docs/plans/2026-09-17-agent-capture-stage-a.md).

## What this is not

It is not a capture endpoint and not a step toward one. It stores no captures,
publishes nothing, and never touches a database. It does not establish anything
about remote connector transport retries, OAuth, authorization, or deployment
routing — only how one assistant handles tool arguments across a retry. The
public connector spike (release gate 3) remains separate and unrun.

## Privacy

Titles and notes are never written anywhere. Normalized argument values are
reduced to an HMAC digest under a key generated fresh each run and held only in
memory. Once the process exits, nobody — including whoever ran it — can link a
logged digest back to content. The log records digests, repeat counts, the
injected mode, and timestamps. Run it with a throwaway task title anyway.

## Running it

```sh
# Register with Claude Code (adjust the path and use a new log path per trial):
claude mcp add capture-probe -- env \
  CAPTURE_PROBE_MODE=ok \
  CAPTURE_PROBE_LOG=/tmp/capture-probe-ok-trial-1.jsonl \
  node \
  packages/super-sync-server/tests/experiments/agent-capture-retry-probe/server.mjs
```

For other clients, add an equivalent stdio server entry pointing at
`server.mjs`. Use a fresh session with an assistant that has not read this probe
or its runbook. Keep only one probe entry active. For every trial, start a new
server process and set a unique `CAPTURE_PROBE_LOG` path; the selected failure
occurs only on that process's first call. Set the mode via the environment:

| `CAPTURE_PROBE_MODE`  | First call behaves as                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| `ok`                  | Succeeds. Control run; any second call is a new intent, not a retry.                           |
| `fail-first`          | Records acceptance, then returns an MCP tool error. No transport response is dropped. Default. |
| `error-before-accept` | Returns an error without accepting.                                                            |
| `timeout`             | Stalls for `CAPTURE_PROBE_TIMEOUT_MS` (default 120s), then returns an error.                   |

Then ask the assistant to capture a throwaway task, and — when it reports failure
— ask it to try again. Do not tell it what to send or mention idempotency; the
point is to observe what it does unprompted. Count the `timeout` mode as a client
timeout only if the client actually reaches its deadline before the delayed
response; otherwise it is a delayed tool error.

## The hint variant (`CAPTURE_PROBE_HINT`)

The probe's own descriptions can tell the assistant what to do, so what they say
decides what the result means:

- `reuse` (default) — the tool description and the `submissionId` description
  both instruct the assistant to resend the same value on a retry. Observing
  reuse under this variant measures **compliance with that instruction**, not a
  disposition to reuse identities. The 2026-09-22 run used this variant.
- `none` — both strings drop every mention of retries and reuse. This is the
  variant that can tell the two apart, and the one to use before the submission
  contract leans on a required identity.

Neutralising only the tool description would leave the field description still
prescribing reuse, so both change together. Every log line records `hint`; a
line without that field predates the flag and is a `reuse` run. An unrecognised
value exits non-zero rather than falling back, so a mistyped variant cannot
quietly relabel a hint-free trial as a hinted one.

```sh
CAPTURE_PROBE_MODE=fail-first CAPTURE_PROBE_HINT=none node server.mjs
```

## Reading the result

The summary prints to stderr on exit:

```
[capture-retry-probe] mode=fail-first calls=2 distinctArgs=1 repeatedArgs=1 distinctIds=1 repeatedIds=1
```

- `calls > distinctArgs` — normalized argument values were repeated. Object keys
  are sorted before hashing; this does not establish wire-byte equality.
- `repeatedIds >= 1` — this assistant repeated the optional `submissionId` value.
- `hasSubmissionId: false` in the log — the optional field was absent on that
  call. `distinctIds` counts only calls where it was present.

The tool description explicitly asks for identity reuse, while the schema makes
the field optional. Reuse does not prove that a connector owns the key across
transport retries; omission does not prove that a required schema is unusable.
The real connector path and endpoint contract remain open.

Run each mode several times in separate processes, logs, and fresh assistant
sessions, and across more than one assistant if you can: a single sample
characterizes one client on one day, not a protocol. Record what you find in the
plan's validation record, including the sample size and limits of the result.
