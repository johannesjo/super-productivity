import { CAPTURE_MCP_CALLS_PER_MINUTE } from './capture.const';

/**
 * Per-grant limit for /mcp, applied after auth. The global per-IP limiter is
 * off for /mcp because assistant vendors share egress IPs across all users.
 *
 * shortcut: in-process counters, single SuperSync instance (helm max 1).
 */

const callCounters = new Map<string, { count: number; resetAt: number }>();

/** Fixed one-minute window per grant; counts every authenticated /mcp call. */
export const isGrantRateLimited = (
  grantId: string,
  now: number = Date.now(),
): boolean => {
  const counter = callCounters.get(grantId);
  if (!counter || now >= counter.resetAt) {
    for (const [id, c] of callCounters) if (now >= c.resetAt) callCounters.delete(id);
    callCounters.set(grantId, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  if (counter.count >= CAPTURE_MCP_CALLS_PER_MINUTE) return true;
  counter.count++;
  return false;
};

/** @internal tests only */
export const resetCaptureRateLimitForTests = (): void => {
  callCounters.clear();
};
