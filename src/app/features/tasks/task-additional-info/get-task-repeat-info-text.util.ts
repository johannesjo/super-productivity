import { TaskRepeatCfg } from '../../task-repeat-cfg/task-repeat-cfg.model';
import * as moment from 'moment';
import { T } from '../../../t.const';
import { getDateTimeFromClockString } from '../../../util/get-date-time-from-clock-string';

export const getTaskRepeatInfoText = (
  repeatCfg: TaskRepeatCfg,
  locale: string,
): [string, { [key: string]: string | number }] => {
  const timeStr = repeatCfg.startTime
    ? new Date(
        getDateTimeFromClockString(repeatCfg.startTime, new Date()),
      ).toLocaleTimeString(locale, {
        hour: 'numeric',
        minute: 'numeric',
      })
    : '';

  switch (repeatCfg.quickSetting) {
    case 'DAILY':
      return [
        timeStr
          ? T.F.TASK_REPEAT.ADD_INFO_PANEL.DAILY_AND_TIME
          : T.F.TASK_REPEAT.ADD_INFO_PANEL.DAILY,
        { timeStr },
      ];
    case 'MONDAY_TO_FRIDAY':
      return [
        timeStr
          ? T.F.TASK_REPEAT.ADD_INFO_PANEL.MONDAY_TO_FRIDAY_AND_TIME
          : T.F.TASK_REPEAT.ADD_INFO_PANEL.MONDAY_TO_FRIDAY,
        { timeStr },
      ];
    case 'WEEKLY_CURRENT_WEEKDAY':
      const weekdayStr = new Date(repeatCfg.startDate as string).toLocaleDateString(
        locale,
        {
          weekday: 'short',
        },
      );
      return [
        timeStr
          ? T.F.TASK_REPEAT.ADD_INFO_PANEL.WEEKLY_CURRENT_WEEKDAY_AND_TIME
          : T.F.TASK_REPEAT.ADD_INFO_PANEL.WEEKLY_CURRENT_WEEKDAY,
        {
          weekdayStr,
          timeStr,
        },
      ];
    case 'MONTHLY_CURRENT_DATE':
      const dateDayStr = new Date(repeatCfg.startDate as string).toLocaleDateString(
        locale,
        {
          day: 'numeric',
        },
      );

      return [
        timeStr
          ? T.F.TASK_REPEAT.ADD_INFO_PANEL.MONTHLY_CURRENT_DATE_AND_TIME
          : T.F.TASK_REPEAT.ADD_INFO_PANEL.MONTHLY_CURRENT_DATE,
        {
          dateDayStr,
          timeStr,
        },
      ];

    case 'YEARLY_CURRENT_DATE':
      const dayAndMonthStr = new Date(repeatCfg.startDate as string).toLocaleDateString(
        locale,
        {
          day: 'numeric',
          month: 'numeric',
        },
      );

      return [
        timeStr
          ? T.F.TASK_REPEAT.ADD_INFO_PANEL.YEARLY_CURRENT_DATE_AND_TIME
          : T.F.TASK_REPEAT.ADD_INFO_PANEL.YEARLY_CURRENT_DATE,
        {
          dayAndMonthStr,
          timeStr,
        },
      ];

    case 'CUSTOM':
      if (repeatCfg.repeatEvery !== 1) {
        switch (repeatCfg.repeatCycle) {
          case 'DAILY':
            return [
              timeStr
                ? T.F.TASK_REPEAT.ADD_INFO_PANEL.EVERY_X_DAILY_AND_TIME
                : T.F.TASK_REPEAT.ADD_INFO_PANEL.EVERY_X_DAILY,
              { timeStr, x: repeatCfg.repeatEvery },
            ];
          case 'MONTHLY':
            return [
              timeStr
                ? T.F.TASK_REPEAT.ADD_INFO_PANEL.EVERY_X_MONTHLY_AND_TIME
                : T.F.TASK_REPEAT.ADD_INFO_PANEL.EVERY_X_MONTHLY,
              { timeStr, x: repeatCfg.repeatEvery },
            ];
          case 'YEARLY':
            return [
              timeStr
                ? T.F.TASK_REPEAT.ADD_INFO_PANEL.EVERY_X_YEARLY_AND_TIME
                : T.F.TASK_REPEAT.ADD_INFO_PANEL.EVERY_X_YEARLY,
              { timeStr, x: repeatCfg.repeatEvery },
            ];
        }
        return [
          timeStr
            ? T.F.TASK_REPEAT.ADD_INFO_PANEL.CUSTOM_AND_TIME
            : T.F.TASK_REPEAT.ADD_INFO_PANEL.CUSTOM,
          { timeStr },
        ];
      }

      switch (repeatCfg.repeatCycle) {
        case 'DAILY':
          return [
            timeStr
              ? T.F.TASK_REPEAT.ADD_INFO_PANEL.DAILY_AND_TIME
              : T.F.TASK_REPEAT.ADD_INFO_PANEL.DAILY,
            { timeStr },
          ];

        case 'WEEKLY':
          const days: (keyof TaskRepeatCfg)[] = [
            'sunday',
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
          ];
          const localWeekDays = moment.weekdaysMin();
          const daysStr = days
            .filter((day) => repeatCfg[day])
            .map((day, index) => localWeekDays[days.indexOf(day)])
            .join(', ');
          return [
            timeStr
              ? T.F.TASK_REPEAT.ADD_INFO_PANEL.CUSTOM_WEEKLY_AND_TIME
              : T.F.TASK_REPEAT.ADD_INFO_PANEL.CUSTOM_WEEKLY,
            {
              timeStr,
              daysStr,
            },
          ];

        default:
          return [
            timeStr
              ? T.F.TASK_REPEAT.ADD_INFO_PANEL.CUSTOM_AND_TIME
              : T.F.TASK_REPEAT.ADD_INFO_PANEL.CUSTOM,
            { timeStr },
          ];
      }
  }

  return ['???????', {}];
};
