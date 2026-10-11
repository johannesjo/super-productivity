import {
  CAPTURE_MCP_AUTH_FAILURES_PER_MINUTE,
  CAPTURE_MCP_CALLS_PER_MINUTE,
} from './capture.const';

/**
 * Limits for /mcp. The global per-IP limiter is off for /mcp because
 * assistant vendors share egress IPs across all users, so authenticated
 * calls count per grant, and only failed auths count per IP.
 *
 * shortcut: in-process counters, single SuperSync instance (helm max 1).
 */

const WINDOW_MS = 60_000;
/** Pruned only above this size, so a busy minute stays linear. */
const PRUNE_ABOVE = 1000;
const counters = new Map<string, { count: number; resetAt: number }>();

const isOverLimit = (key: string, max: number, now: number): boolean => {
  const counter = counters.get(key);
  return !!counter && now < counter.resetAt && counter.count >= max;
};

const count = (key: string, now: number): void => {
  const counter = counters.get(key);
  if (counter && now < counter.resetAt) {
    counter.count++;
    return;
  }
  if (counters.size > PRUNE_ABOVE) {
    for (const [k, c] of counters) if (now >= c.resetAt) counters.delete(k);
  }
  counters.set(key, { count: 1, resetAt: now + WINDOW_MS });
};

/** Fixed one-minute window per grant; counts every authenticated /mcp call. */
export const isGrantRateLimited = (
  grantId: string,
  now: number = Date.now(),
): boolean => {
  const key = `grant:${grantId}`;
  if (isOverLimit(key, CAPTURE_MCP_CALLS_PER_MINUTE, now)) return true;
  count(key, now);
  return false;
};

/** Checked before auth, so a flood of bad tokens costs no DB lookup. */
export const isAuthFailureLimited = (ip: string, now: number = Date.now()): boolean =>
  isOverLimit(`ip:${ip}`, CAPTURE_MCP_AUTH_FAILURES_PER_MINUTE, now);

export const recordAuthFailure = (ip: string, now: number = Date.now()): void =>
  count(`ip:${ip}`, now);

/** @internal tests only */
export const resetCaptureRateLimitForTests = (): void => {
  counters.clear();
};
