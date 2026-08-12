import { describe, expect, it } from 'vitest';
import { createInitialState, migrateDomainState, reduceDomain } from '@noura/domain';
import { focusSeries, topTasksByTime, weekFocus } from './index';

const manual = (id: string, startedAt: number, endedAt: number, taskId?: string) => ({
  type: 'session/manual' as const,
  payload: {
    entry: {
      id,
      taskId,
      mode: 'stopwatch' as const,
      startedAt,
      endedAt,
      durationMs: endedAt - startedAt,
      source: 'manual' as const,
      updatedAt: endedAt,
    },
  },
});

describe('metrics', () => {
  it('builds a zero-padded daily focus series from tracked entries', () => {
    let state = migrateDomainState(createInitialState());
    const today = new Date();
    const startToday = Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate(),
      9,
      0,
      0,
    );
    state = reduceDomain(state, manual('s1', startToday, startToday + 1_800_000));
    const series = focusSeries(state, 14);
    expect(series).toHaveLength(14);
    const last = series[13];
    expect(last.sessions).toBe(1);
    expect(last.minutes).toBe(30);
  });

  it('totals this week vs last week focus', () => {
    let state = migrateDomainState(createInitialState());
    const now = Date.UTC(2026, 6, 20, 12); // Monday 2026-07-20
    const monday9 = Date.UTC(2026, 6, 20, 9);
    const lastMonday9 = Date.UTC(2026, 6, 13, 9);
    state = reduceDomain(state, manual('a', monday9, monday9 + 3_600_000));
    state = reduceDomain(state, manual('b', lastMonday9, lastMonday9 + 7_200_000));
    const weekly = weekFocus(state, now);
    expect(weekly.thisWeekMs).toBe(3_600_000);
    expect(weekly.prevWeekMs).toBe(7_200_000);
  });

  it('ranks the most-tracked tasks', () => {
    let state = migrateDomainState(createInitialState());
    state = reduceDomain(state, manual('a', Date.now() - 60_000, Date.now(), 'task-1'));
    const top = topTasksByTime(state, 5);
    expect(Array.isArray(top)).toBe(true);
  });
});
