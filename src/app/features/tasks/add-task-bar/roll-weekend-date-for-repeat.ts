import { AddTaskBarRepeat } from './add-task-bar.const';
import { skipExcludedWeekend } from '../short-syntax';
import { dateStrToUtcDate } from '../../../util/date-str-to-utc-date';
import { getDbDateStr } from '../../../util/get-db-date-str';

/**
 * The day a workday recurrence really starts on, given the day it was asked to
 * start on.
 *
 * MONDAY_TO_FRIDAY is the only preset with an excluded-day set — every other
 * one either has no exclusions (DAILY) or derives its anchor from the date
 * itself (getQuickSettingUpdates), which cannot contradict it. So it is also
 * the only one whose picked date can name a day the recurrence never lands on.
 *
 * Total over its input: returns `dateStr` unchanged for every other schedule,
 * for no schedule at all, and for a string that is not a real calendar day —
 * so a caller can use the result unconditionally.
 */
export const rollWeekendDateForRepeat = (
  dateStr: string,
  repeat: AddTaskBarRepeat | null,
): string => {
  if (repeat?.type !== 'PRESET' || repeat.quickSetting !== 'MONDAY_TO_FRIDAY') {
    return dateStr;
  }
  const date = dateStrToUtcDate(dateStr);
  // A malformed string is reported by dateStrToUtcDate and comes back as an
  // Invalid Date, which getDbDateStr would render as the literal
  // "NaN-NaN-NaN" — and every caller here persists and syncs what it gets.
  if (isNaN(date.getTime())) {
    return dateStr;
  }
  skipExcludedWeekend(date);
  return getDbDateStr(date);
};
