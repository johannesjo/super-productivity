import { describe, expect, it } from 'vitest';
import { INTEGRATIONS, integrationById } from './index';

describe('integration catalog', () => {
  it('contains every compiled-in provider', () => {
    expect(INTEGRATIONS).toHaveLength(15);
    expect(integrationById('github')?.kind).toBe('issues');
    expect(integrationById('google-calendar')?.capabilities).toContain('events');
  });
});
