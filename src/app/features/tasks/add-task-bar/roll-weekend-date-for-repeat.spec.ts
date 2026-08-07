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

  it('should leave a day the schedule already lands on alone', () => {
    expect(rollWeekendDateForRepeat(FRIDAY, WORKDAYS)).toBe(FRIDAY);
    expect(rollWeekendDateForRepeat(MONDAY, WORKDAYS)).toBe(MONDAY);
  });

  it('should leave a weekend day alone for every other schedule', () => {
    expect(
      rollWeekendDateForRepeat(SATURDAY, { type: 'PRESET', quickSetting: 'DAILY' }),
    ).toBe(SATURDAY);
    expect(
      rollWeekendDateForRepeat(SATURDAY, {
        type: 'PRESET',
        quickSetting: 'WEEKLY_CURRENT_WEEKDAY',
      }),
    ).toBe(SATURDAY);
    expect(
      rollWeekendDateForRepeat(SATURDAY, {
        type: 'INTERVAL',
        repeatCycle: 'WEEKLY',
        repeatEvery: 2,
      }),
    ).toBe(SATURDAY);
    expect(rollWeekendDateForRepeat(SATURDAY, { type: 'DIALOG' })).toBe(SATURDAY);
    expect(rollWeekendDateForRepeat(SATURDAY, null)).toBe(SATURDAY);
  });

  // Only reachable in a production build: `dateStrToUtcDate` reports a
  // malformed string through `devError`, which rethrows in dev and test (the
  // global `window.confirm` stub in test.ts answers yes) but only logs in
  // production — and then hands back an Invalid Date. Without the guard
  // `getDbDateStr` renders that as the literal "NaN-NaN-NaN", and every caller
  // persists and syncs what it gets back.
  describe('a string that is not a real calendar day', () => {
    beforeEach(() => (window.confirm as jasmine.Spy).and.returnValue(false));
    afterEach(() => (window.confirm as jasmine.Spy).and.returnValue(true));

    it('should be handed back unchanged', () => {
      expect(rollWeekendDateForRepeat('2026-02-30', WORKDAYS)).toBe('2026-02-30');
      expect(rollWeekendDateForRepeat('not-a-date', WORKDAYS)).toBe('not-a-date');
    });
  });
});
