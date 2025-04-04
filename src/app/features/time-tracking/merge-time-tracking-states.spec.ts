/* eslint-disable @typescript-eslint/naming-convention */
import {
  mergeTimeTrackingStates,
  mergeTimeTrackingStatesForWorkContext,
} from './merge-time-tracking-states';
import { TimeTrackingState, TTWorkContextSessionMap } from './time-tracking.model';

describe('mergeTimeTrackingStates', () => {
  it('should merge time tracking states so newest one wins', () => {
    const current: TimeTrackingState = {
      project: { '1': { '2023-01-01': { s: 1, e: 2, b: 3, bt: 4 } } },
      tag: { '2': { '2023-01-02': { s: 5, e: 6, b: 7, bt: 8 } } },
    };
    const archive: TimeTrackingState = {
      project: { '1': { '2023-01-01': { s: 9, e: 10, b: 11, bt: 12 } } },
      tag: { '2': { '2023-01-02': { s: 13, e: 14, b: 15, bt: 16 } } },
    };
    const oldArchive: TimeTrackingState = {
      project: { '1': { '2023-01-01': { s: 17, e: 18, b: 19, bt: 20 } } },
      tag: { '2': { '2023-01-02': { s: 21, e: 22, b: 23, bt: 24 } } },
    };

    const result = mergeTimeTrackingStates({ current, archive, oldArchive });

    expect(result).toEqual({
      project: { 1: { '2023-01-01': { b: 3, bt: 4, e: 2, s: 1 } } },
      tag: { 2: { '2023-01-02': { b: 7, bt: 8, e: 6, s: 5 } } },
    });
  });
});

describe('mergeTimeTrackingStatesForWorkContext', () => {
  it('should merge time tracking states for work context correctly', () => {
    const current: TTWorkContextSessionMap = {
      '1': { '2023-01-01': { s: 1, e: 2, b: 3, bt: 4 } },
    };
    const archive: TTWorkContextSessionMap = {
      '1': { '2023-01-01': { s: 5, e: 6, b: 7, bt: 8 } },
    };
    const oldArchive: TTWorkContextSessionMap = {
      '1': { '2023-01-01': { s: 9, e: 10, b: 11, bt: 12 } },
    };

    const result = mergeTimeTrackingStatesForWorkContext({
      current,
      archive,
      oldArchive,
    });

    expect(result).toEqual({ 1: { '2023-01-01': { s: 1, e: 2, b: 3, bt: 4 } } });
  });

  it('should handle missing dates and contexts correctly', () => {
    const current: TTWorkContextSessionMap = {
      '1': { '2023-01-01': { s: 1, e: 2, b: 3, bt: 4 } },
    };
    const archive: TTWorkContextSessionMap = {
      '2': { '2023-01-02': { s: 5, e: 6, b: 7, bt: 8 } },
    };
    const oldArchive: TTWorkContextSessionMap = {
      '3': { '2023-01-03': { s: 9, e: 10, b: 11, bt: 12 } },
    };

    const result = mergeTimeTrackingStatesForWorkContext({
      current,
      archive,
      oldArchive,
    });

    expect(result).toEqual({
      1: { '2023-01-01': { b: 3, bt: 4, e: 2, s: 1 } },
      2: { '2023-01-02': { b: 7, bt: 8, e: 6, s: 5 } },
      3: { '2023-01-03': { b: 11, bt: 12, e: 10, s: 9 } },
    });
  });
});
