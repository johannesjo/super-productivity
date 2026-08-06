import { AddTaskBarRepeat } from './add-task-bar.const';
import { skipExcludedWeekend } from '../short-syntax';
import { dateStrToUtcDate } from '../../../util/date-str-to-utc-date';
import { getDbDateStr } from '../../../util/get-db-date-str';

/**
 * Returns the day a workday recurrence would really start on, or null when the
 * date already is that day (so the caller can skip a redundant state write).
 *
 * MONDAY_TO_FRIDAY is the only preset with an excluded-day set — every other
 * one either has no exclusions (DAILY) or derives its anchor from the date
 * itself (getQuickSettingUpdates), which cannot contradict it. So it is also
 * the only one whose picked date can name a day the recurrence never lands on.
 */
export const rollWeekendDateForRepeat = (
  dateStr: string | null,
  repeat: AddTaskBarRepeat | null,
): string | null => {
  if (
    !dateStr ||
    repeat?.type !== 'PRESET' ||
    repeat.quickSetting !== 'MONDAY_TO_FRIDAY'
  ) {
    return null;
  }
  const date = dateStrToUtcDate(dateStr);
  skipExcludedWeekend(date);
  const rolled = getDbDateStr(date);
  return rolled === dateStr ? null : rolled;
};
