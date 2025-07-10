import { ScheduleConfig } from '../../config/global-config.model';
import { getDateTimeFromClockString } from '../../../util/get-date-time-from-clock-string';
import { dateStrToUtcDate } from '../../../util/date-str-to-utc-date';
import { Log } from '../../../core/log';

export const DEFAULT_WORK_HOURS = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

export const calculateAvailableHours = (
  dayDate: string,
  scheduleConfig: ScheduleConfig,
): number => {
  // Default to 8 hours if work start/end is not enabled
  if (!scheduleConfig.isWorkStartEndEnabled) {
    return DEFAULT_WORK_HOURS;
  }

  const date = dateStrToUtcDate(dayDate);

  try {
    // Calculate work hours
    const workStart = getDateTimeFromClockString(scheduleConfig.workStart, date);
    const workEnd = getDateTimeFromClockString(scheduleConfig.workEnd, date);

    let availableTime = workEnd - workStart;

    // Subtract lunch break if enabled
    if (scheduleConfig.isLunchBreakEnabled) {
      const lunchStart = getDateTimeFromClockString(scheduleConfig.lunchBreakStart, date);
      const lunchEnd = getDateTimeFromClockString(scheduleConfig.lunchBreakEnd, date);

      // Only subtract lunch break if it's within work hours
      if (lunchStart >= workStart && lunchEnd <= workEnd) {
        availableTime -= lunchEnd - lunchStart;
      }
    }

    return Math.max(0, availableTime);
  } catch (error) {
    // If there's an error parsing time strings, return default
    Log.err('Error calculating available hours:', error);
    return DEFAULT_WORK_HOURS;
  }
};
