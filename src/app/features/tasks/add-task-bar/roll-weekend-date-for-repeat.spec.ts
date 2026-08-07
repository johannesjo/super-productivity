import { rollWeekendDateForRepeat } from './roll-weekend-date-for-repeat';
import { AddTaskBarRepeat } from './add-task-bar.const';

describe('rollWeekendDateForRepeat', () => {
  const WORKDAYS: AddTaskBarRepeat = {
    type: 'PRESET',
    quickSetting: 'MONDAY_TO_FRIDAY',
  };
  // 2026-03-27 is a Friday, 03-28 the Saturday, 03-29 the Sunday and 03-30 the
  // Monday after it
  const FRIDAY = '2026-03-27';
  const SATURDAY = '2026-03-28';
  const SUNDAY = '2026-03-29';
  const MONDAY = '2026-03-30';

  it('should roll a Saturday to the Monday after it', () => {
    expect(rollWeekendDateForRepeat(SATURDAY, WORKDAYS)).toBe(MONDAY);
  });

  it('should roll a Sunday to the Monday after it', () => {
    expect(rollWeekendDateForRepeat(SUNDAY, WORKDAYS)).toBe(MONDAY);
  });

  // Null rather than the day itself, so a caller can tell "nothing to do" from
  // a day it has to write back
  it('should return null for a day the schedule already lands on', () => {
    expect(rollWeekendDateForRepeat(FRIDAY, WORKDAYS)).toBeNull();
    expect(rollWeekendDateForRepeat(MONDAY, WORKDAYS)).toBeNull();
  });

  it('should leave a weekend day alone for every other schedule', () => {
    expect(
      rollWeekendDateForRepeat(SATURDAY, { type: 'PRESET', quickSetting: 'DAILY' }),
    ).toBeNull();
    expect(
      rollWeekendDateForRepeat(SATURDAY, {
        type: 'PRESET',
        quickSetting: 'WEEKLY_CURRENT_WEEKDAY',
      }),
    ).toBeNull();
    expect(
      rollWeekendDateForRepeat(SATURDAY, {
        type: 'INTERVAL',
        repeatCycle: 'WEEKLY',
        repeatEvery: 2,
      }),
    ).toBeNull();
    expect(rollWeekendDateForRepeat(SATURDAY, { type: 'DIALOG' })).toBeNull();
    expect(rollWeekendDateForRepeat(SATURDAY, null)).toBeNull();
  });

  it('should handle a missing date', () => {
    expect(rollWeekendDateForRepeat(null, WORKDAYS)).toBeNull();
  });
});
