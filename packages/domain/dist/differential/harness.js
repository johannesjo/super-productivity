import { createInitialState } from '../index';
import { reduceDomain } from '../reducer';
/** Stable, deep-sorted, JSON-safe shape for state comparison. */
const sortDeep = (value) => {
    if (Array.isArray(value))
        return value.map(sortDeep);
    if (value && typeof value === 'object') {
        const record = value;
        const sorted = {};
        for (const key of Object.keys(record).sort())
            sorted[key] = sortDeep(record[key]);
        return sorted;
    }
    return value;
};
export const normalizeState = (state) => JSON.parse(JSON.stringify(sortDeep(state)));
export const applyFixture = (fixture) => {
    let state = createInitialState(fixture.now);
    for (const command of fixture.commands) {
        state = reduceDomain(state, command);
    }
    return state;
};
export const runFixture = (fixture) => ({
    actual: normalizeState(applyFixture(fixture)),
    expected: normalizeState(fixture.expected),
});
