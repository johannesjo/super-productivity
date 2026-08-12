import { createInitialState, type DomainCommand, type DomainState } from '../index';
import { reduceDomain } from '../reducer';

/**
 * Differential fixture harness — the machine-checkable "1-to-1" proof for the
 * deterministic reducer (ADR-003). Each fixture is a batch of commands plus the
 * normalized state captured from the reference engine (a frozen golden). The
 * harness re-applies the batch with our reducer and the spec asserts the two
 * normalized states are identical, so any behavioral drift fails loudly.
 */

export interface DifferentialFixture {
  id: string;
  description: string;
  /** Reference semantics the golden was captured under (see docs/parity.md). */
  engine: 'captured-reference' | 'captured-angular';
  now: number;
  commands: DomainCommand[];
  /** Full normalized expected state. */
  expected: unknown;
}

/** Stable, deep-sorted, JSON-safe shape for state comparison. */
const sortDeep = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) sorted[key] = sortDeep(record[key]);
    return sorted;
  }
  return value;
};

export const normalizeState = (state: DomainState): unknown =>
  JSON.parse(JSON.stringify(sortDeep(state)));

export const applyFixture = (fixture: DifferentialFixture): DomainState => {
  let state = createInitialState(fixture.now);
  for (const command of fixture.commands) {
    state = reduceDomain(state, command);
  }
  return state;
};

export const runFixture = (
  fixture: DifferentialFixture,
): { actual: unknown; expected: unknown } => ({
  actual: normalizeState(applyFixture(fixture)),
  expected: normalizeState(fixture.expected as unknown as DomainState),
});
