# Agent-capture retry probe

A local MCP server that answers one question for the agent-capture
submission-identity gate:

> When a capture tool call fails or times out, does the assistant retry it with
> byte-identical arguments, and does it reproduce a submission identity it
> supplied the first time?

That question is the only thing standing between the plan's two honest release
options — a required connector-owned idempotency key, or an explicitly
at-least-once endpoint. See "Narrowing the submission decision (2026-09-18)" in
[`docs/plans/2026-09-17-agent-capture-stage-a.md`](../../../../../docs/plans/2026-09-17-agent-capture-stage-a.md).

## What this is not

It is not a capture endpoint and not a step toward one. It stores no captures,
publishes nothing, and never touches a database. It does not establish anything
about remote connector transport retries, OAuth, authorization, or deployment
routing — only how one assistant handles tool arguments across a retry. The
public connector spike (release gate 3) remains separate and unrun.

## Privacy

Titles and notes are never written anywhere. Arguments are reduced to an HMAC
digest under a key generated fresh each run and held only in memory, so once the
process exits nobody — including whoever ran it — can link a logged digest back
to content. The log records digests, repeat counts, the injected mode, and
timestamps. Run it with a throwaway task title anyway.

## Running it

```sh
# Register with Claude Code (adjust the path):
claude mcp add capture-probe -- node \
  packages/super-sync-server/tests/experiments/agent-capture-retry-probe/server.mjs
```

For other clients, add an equivalent stdio server entry pointing at
`server.mjs`. Set the mode via the environment:

| `CAPTURE_PROBE_MODE`  | First call behaves as                                                                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `ok`                  | Succeeds. Control run — any second call is a real duplicate intent, not a retry.                                                 |
| `fail-first`          | Accepted, then returns an error. The response was lost _after_ the work was accepted — the case idempotency exists for. Default. |
| `error-before-accept` | Returns an error without accepting.                                                                                              |
| `timeout`             | Stalls for `CAPTURE_PROBE_TIMEOUT_MS` (default 120s).                                                                            |

Then ask the assistant to capture a task, and — when it reports failure — ask it
to try again. Do not tell it what to send; the point is to observe what it does
unprompted.

## Reading the result

The summary prints to stderr on exit:

```
[capture-retry-probe] mode=fail-first calls=2 distinctArgs=1 repeatedArgs=1 distinctIds=1 repeatedIds=1
```

- `calls > distinctArgs` — the retry reproduced its arguments exactly.
- `repeatedIds >= 1` — it reproduced the submission identity. This is the
  observation that would support requiring a connector-owned key.
- `calls == distinctArgs` with `distinctIds == calls` — it minted a fresh
  identity on retry. A required key would then be unreliable in exactly the case
  it exists for, and the at-least-once option is the honest one.

Run each mode several times, and across more than one assistant if you can: a
single sample characterizes one client on one day, not a protocol. Record what
you find in the plan's validation record, including the sample size.
