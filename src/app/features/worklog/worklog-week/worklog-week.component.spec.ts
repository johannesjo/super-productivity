import { KeyValue } from '@angular/common';
import { WorklogDay } from '../worklog.model';
import { sortWorklogDays } from './worklog-week.component';

const toKeyValue = (dateStr: string): KeyValue<string, WorklogDay> => ({
  key: dateStr.slice(-2),
  value: {
    dateStr,
  } as WorklogDay,
});

describe('sortWorklogDays()', () => {
  it('sorts merged days chronologically across month boundaries', () => {
    expect(
      sortWorklogDays(toKeyValue('2026-07-31'), toKeyValue('2026-08-01')),
    ).toBeLessThan(0);
  });

  it('sorts merged days chronologically across year boundaries', () => {
    expect(
      sortWorklogDays(toKeyValue('2026-12-31'), toKeyValue('2027-01-01')),
    ).toBeLessThan(0);
  });
});
