import { beforeEach, describe, expect, it } from 'vitest';
import {
  ipLimitKey,
  isAuthFailureLimited,
  recordAuthFailure,
  recordAuthSuccess,
  resetCaptureRateLimitForTests,
} from '../src/capture/capture-rate-limit';
import { CAPTURE_MCP_AUTH_FAILURES_PER_MINUTE } from '../src/capture/capture.const';

const NOW = 1_000_000;
const GRANT = '01890000-0000-7000-8000-000000000000';

describe('capture rate limit', () => {
  beforeEach(() => resetCaptureRateLimitForTests());

  it('counts an IPv6 /64 as one IP and IPv4 per address', () => {
    expect(ipLimitKey('2001:db8:1:2:aaaa::1')).toBe('ip:2001:db8:1:2::/64');
    expect(ipLimitKey('2001:0db8:0001:0002:ffff:1:2:3')).toBe('ip:2001:db8:1:2::/64');
    expect(ipLimitKey('2001:db8::1')).toBe('ip:2001:db8:0:0::/64');
    expect(ipLimitKey('::1')).toBe('ip:0:0:0:0::/64');
    expect(ipLimitKey('::ffff:10.0.0.1')).toBe('ip:10.0.0.1');
    expect(ipLimitKey('::FFFF:10.0.0.1')).toBe('ip:10.0.0.1');
    expect(ipLimitKey('0:0:0:0:0:ffff:10.0.0.1')).toBe('ip:10.0.0.1');
    expect(ipLimitKey('::ffff:a00:1')).toBe('ip:10.0.0.1');
    expect(ipLimitKey('2001:DB8:1:2::1')).toBe('ip:2001:db8:1:2::/64');
    expect(ipLimitKey('fe80::1%eth0')).toBe('ip:fe80:0:0:0::/64');
    expect(ipLimitKey('10.0.0.1')).toBe('ip:10.0.0.1');
  });

  it('limits failed auths per IP, but not a recently authenticated grant', () => {
    for (let i = 0; i < CAPTURE_MCP_AUTH_FAILURES_PER_MINUTE; i++) {
      recordAuthFailure('10.0.0.1', null, NOW);
    }
    expect(isAuthFailureLimited('10.0.0.1', null, NOW)).toBe(true);
    expect(isAuthFailureLimited('10.0.0.1', GRANT, NOW)).toBe(true);

    recordAuthSuccess(GRANT, NOW);
    expect(isAuthFailureLimited('10.0.0.1', GRANT, NOW)).toBe(false);
    expect(isAuthFailureLimited('10.0.0.1', null, NOW)).toBe(true);
    expect(isAuthFailureLimited('10.0.0.1', null, NOW + 60_000)).toBe(false);
  });

  it('limits failed auths of a known grant per grant', () => {
    recordAuthSuccess(GRANT, NOW);
    for (let i = 0; i < CAPTURE_MCP_AUTH_FAILURES_PER_MINUTE; i++) {
      recordAuthFailure(`10.0.0.${i % 200}`, GRANT, NOW);
    }
    expect(isAuthFailureLimited('10.9.9.9', GRANT, NOW)).toBe(true);
  });
});
