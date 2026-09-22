#!/usr/bin/env node
/**
 * Local MCP retry probe for the agent-capture submission-identity gate.
 *
 * It answers exactly one question: when a `capture_task` tool call fails or
 * times out, does the assistant retry it with byte-identical arguments, and
 * does it reproduce a submission identity it supplied the first time?
 *
 * It is NOT a capture endpoint. It stores nothing, publishes nothing, and talks
 * to no database. It is deliberately standalone and dependency-free so it can
 * be registered with a real assistant without deploying anything.
 *
 * Privacy: task titles and notes are never written anywhere. Arguments are
 * reduced to an HMAC digest under a key generated fresh for each run and held
 * only in memory, so the log cannot be linked back to content once the process
 * exits — not even by whoever ran it.
 *
 * Usage:
 *   CAPTURE_PROBE_MODE=fail-first node server.mjs
 * Modes (the mode applies to the FIRST call only; later calls succeed, which is
 * what makes a retry observable):
 *   ok                  — never fail; control run
 *   fail-first          — record acceptance, then return an error (the response
 *                         was lost after the server accepted the work)
 *   error-before-accept — return an error without accepting
 *   timeout             — stall past the client's patience
 *
 * CAPTURE_PROBE_HINT controls whether the tool ASKS for reuse:
 *   reuse (default) — the descriptions instruct the assistant to resend the same
 *                     submissionId on a retry. Observing reuse then measures
 *                     compliance with that instruction, not a disposition.
 *   none            — the descriptions say nothing about retries or reuse. This
 *                     is the variant that can distinguish the two. Keep the
 *                     default intact so earlier runs stay reproducible.
 * Every log line carries the hint variant; a log without it predates this flag.
 */
import { createHmac, randomBytes } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const MODE = process.env.CAPTURE_PROBE_MODE ?? 'fail-first';
const HINT = process.env.CAPTURE_PROBE_HINT ?? 'reuse';
const TIMEOUT_MS = Number(process.env.CAPTURE_PROBE_TIMEOUT_MS ?? 120_000);
const LOG_PATH =
  process.env.CAPTURE_PROBE_LOG ??
  join(tmpdir(), `capture-retry-probe-${Date.now()}.jsonl`);

/** In memory only, never written. Digests become unlinkable when this exits. */
const RUN_KEY = randomBytes(32);

const state = { calls: 0, argDigests: new Map(), idDigests: new Map() };

const stableStringify = (value) => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
  return `{${entries.join(',')}}`;
};

const digest = (value) =>
  createHmac('sha256', RUN_KEY)
    .update(stableStringify(value))
    .digest('base64url')
    .slice(0, 16);

const tally = (map, key) => {
  const next = (map.get(key) ?? 0) + 1;
  map.set(key, next);
  return next;
};

const record = (entry) => {
  appendFileSync(LOG_PATH, `${JSON.stringify({ ...entry, mode: MODE, hint: HINT })}\n`);
};

// Both strings carry the hint, not just the tool description; neutralising one
// and leaving the other would still be telling the assistant what to do.
const DESCRIPTIONS = {
  reuse: {
    tool: 'Capture a task into Super Productivity. If a call fails, retry it with the same submissionId so the task is not captured twice.',
    submissionId:
      'A stable identifier for this capture intent. Reuse the SAME value when retrying a failed call; use a new one for a genuinely new task.',
  },
  none: {
    tool: 'Capture a task into Super Productivity.',
    submissionId: 'An optional identifier for this capture.',
  },
};

if (!Object.hasOwn(DESCRIPTIONS, HINT)) {
  // Fail loudly: silently falling back to `reuse` would relabel a hint-free
  // trial as a hinted one and quietly invalidate the result.
  process.stderr.write(
    `capture-probe: unknown CAPTURE_PROBE_HINT '${HINT}' (expected reuse|none)\n`,
  );
  process.exit(1);
}

const TOOL = {
  name: 'capture_task',
  description: DESCRIPTIONS[HINT].tool,
  inputSchema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'The task title.' },
      notes: { type: 'string', description: 'Optional details.' },
      submissionId: {
        type: 'string',
        description: DESCRIPTIONS[HINT].submissionId,
      },
    },
    required: ['title'],
  },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const observeCall = (args) => {
  const seq = ++state.calls;
  const argDigest = digest(args ?? {});
  const submissionId = args?.submissionId;
  const idDigest = submissionId === undefined ? null : digest(submissionId);
  return {
    seq,
    argDigest,
    argRepeat: tally(state.argDigests, argDigest),
    hasSubmissionId: idDigest !== null,
    idDigest,
    idRepeat: idDigest === null ? null : tally(state.idDigests, idDigest),
  };
};

const handleToolCall = async (args) => {
  const observation = observeCall(args);
  const failFirst = observation.seq === 1 && MODE !== 'ok';

  if (failFirst && MODE === 'timeout') {
    record({ ...observation, outcome: 'stalled', at: Date.now() });
    await sleep(TIMEOUT_MS);
    return { error: 'Timed out' };
  }
  if (failFirst && MODE === 'error-before-accept') {
    record({ ...observation, outcome: 'rejected', at: Date.now() });
    return { error: 'Capture service unavailable' };
  }
  if (failFirst && MODE === 'fail-first') {
    // Accepted, then the response is lost: the assistant believes it failed.
    record({
      ...observation,
      outcome: 'accepted_response_lost',
      at: Date.now(),
    });
    return { error: 'Upstream timeout' };
  }
  record({ ...observation, outcome: 'accepted', at: Date.now() });
  return { ok: 'Captured. It will appear when Super Productivity next syncs.' };
};

const reply = (id, result) => {
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, result })}\n`);
};

const handle = async (message) => {
  const { id, method, params } = message;
  if (method === 'initialize') {
    return reply(id, {
      protocolVersion: params?.protocolVersion ?? '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'agent-capture-retry-probe', version: '0.1.0' },
    });
  }
  if (method === 'tools/list') return reply(id, { tools: [TOOL] });
  if (method === 'tools/call') {
    const outcome = await handleToolCall(params?.arguments);
    return reply(id, {
      content: [{ type: 'text', text: outcome.error ?? outcome.ok }],
      ...(outcome.error ? { isError: true } : {}),
    });
  }
  // Notifications carry no id and expect no response.
  if (id !== undefined) reply(id, {});
};

const summarize = () => {
  const repeatedArgs = [...state.argDigests.values()].filter((n) => n > 1).length;
  const repeatedIds = [...state.idDigests.values()].filter((n) => n > 1).length;
  process.stderr.write(
    `\n[capture-retry-probe] mode=${MODE} calls=${state.calls} ` +
      `distinctArgs=${state.argDigests.size} repeatedArgs=${repeatedArgs} ` +
      `distinctIds=${state.idDigests.size} repeatedIds=${repeatedIds}\n` +
      `[capture-retry-probe] log: ${LOG_PATH}\n` +
      `[capture-retry-probe] A retry reproducing its arguments shows as calls>distinctArgs.\n`,
  );
};

process.on('exit', summarize);
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => process.exit(0));
}

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', async (chunk) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop() ?? '';
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      await handle(JSON.parse(line));
    } catch (error) {
      process.stderr.write(`[capture-retry-probe] bad message: ${String(error)}\n`);
    }
  }
});
process.stdin.on('end', () => process.exit(0));
