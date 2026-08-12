import { type DomainCommand, type DomainState } from '../index';
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
export declare const normalizeState: (state: DomainState) => unknown;
export declare const applyFixture: (fixture: DifferentialFixture) => DomainState;
export declare const runFixture: (fixture: DifferentialFixture) => {
    actual: unknown;
    expected: unknown;
};
