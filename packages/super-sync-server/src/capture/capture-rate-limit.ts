import { isIPv6 } from 'net';
import {
  CAPTURE_MCP_AUTH_FAILURES_PER_MINUTE,
  CAPTURE_MCP_CALLS_PER_MINUTE,
} from './capture.const';

/**
 * Limits for /mcp. The global per-IP limiter is off for /mcp because
 * assistant vendors share egress IPs across all users, so authenticated
 * calls count per grant, and only failed auths count per IP (an IPv6 /64
 * counts as one IP). A grant that authenticated recently is never blocked by
 * its IP, so failed auths of others behind the same egress cannot lock it out.
 *
 * shortcut: in-process counters, single SuperSync instance (helm max 1).
 */

const WINDOW_MS = 60_000;
/** Pruned at most once per window and only above this size, so it stays linear. */
const PRUNE_ABOVE = 1000;
const counters = new Map<string, { count: number; resetAt: number }>();
let nextPruneAt = 0;

const RECENT_GRANT_MS = 24 * 60 * 60 * 1000;
const RECENT_GRANTS_MAX = 10_000;
/** Grant id → until when it counts as recently authenticated. Insertion-ordered. */
const recentGrants = new Map<string, number>();

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
  if (counters.size > PRUNE_ABOVE && now >= nextPruneAt) {
    nextPruneAt = now + WINDOW_MS;
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

/** One rotating IPv6 host must not get a fresh limit per address. */
export const ipLimitKey = (ip: string): string => {
  if (!isIPv6(ip) || ip.toLowerCase().startsWith('::ffff:')) return `ip:${ip}`;
  const [head, tail] = ip.split('%')[0].split('::');
  const headGroups = head ? head.split(':') : [];
  const tailGroups = tail ? tail.split(':') : [];
  const groups =
    tail === undefined
      ? headGroups
      : [
          ...headGroups,
          ...Array<string>(8 - headGroups.length - tailGroups.length).fill('0'),
          ...tailGroups,
        ];
  return `ip:${groups
    .slice(0, 4)
    .map((g) => parseInt(g, 16).toString(16))
    .join(':')}::/64`;
};

const isRecentGrant = (grantId: string | null, now: number): boolean => {
  if (!grantId) return false;
  const until = recentGrants.get(grantId);
  return until !== undefined && now < until;
};

/**
 * Checked before auth, so a flood of bad tokens costs no DB lookup. A
 * recently authenticated grant id passes; its failures count per grant.
 */
export const isAuthFailureLimited = (
  ip: string,
  grantId: string | null,
  now: number = Date.now(),
): boolean =>
  isRecentGrant(grantId, now)
    ? isOverLimit(`fail:${grantId}`, CAPTURE_MCP_AUTH_FAILURES_PER_MINUTE, now)
    : isOverLimit(ipLimitKey(ip), CAPTURE_MCP_AUTH_FAILURES_PER_MINUTE, now);

export const recordAuthFailure = (
  ip: string,
  grantId: string | null,
  now: number = Date.now(),
): void => {
  count(ipLimitKey(ip), now);
  if (isRecentGrant(grantId, now)) count(`fail:${grantId}`, now);
};

export const recordAuthSuccess = (grantId: string, now: number = Date.now()): void => {
  recentGrants.delete(grantId);
  if (recentGrants.size >= RECENT_GRANTS_MAX) {
    const oldest = recentGrants.keys().next().value;
    if (oldest !== undefined) recentGrants.delete(oldest);
  }
  recentGrants.set(grantId, now + RECENT_GRANT_MS);
};

/** @internal tests only */
export const resetCaptureRateLimitForTests = (): void => {
  counters.clear();
  recentGrants.clear();
  nextPruneAt = 0;
};
