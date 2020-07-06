// NOTE: cuts off at month start and end per default
import * as moment from 'moment';
import { WeekDay } from '@angular/common';

export const getDateRangeForWeek = (year: number, weekNr: number, month?: number): {
  rangeStart: Date,
  rangeEnd: Date,
} => {
  // NOTE: using the constant here rather than string is important otherwise day might mess up
  let rangeStart = moment().day(WeekDay.Monday).year(year).week(weekNr).toDate();
  // TODO this might still mess up sometimes
  let rangeEnd = moment().day(WeekDay.Sunday).year(year).week(weekNr + 1).toDate();

  if (typeof month === 'number') {
    // firstDayOfMonth
    const monthStart = new Date(year, month - 1, 1);
    // lastDayOfMonth
    const monthEnd = new Date(year, month, 0);

    rangeStart = (rangeStart < monthStart)
      ? monthStart
      : rangeStart;

    rangeEnd = (rangeEnd > monthEnd)
      ? monthEnd
      : rangeEnd;
  }

  return {
    rangeStart: rangeStartWithTime(rangeStart),
    rangeEnd: rangeEndWithTime(rangeEnd)
  };
};

export const rangeStartWithTime = (rs: Date): Date => {
  const d = new Date(rs);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const rangeEndWithTime = (rs: Date): Date => {
  const d = new Date(rs);
  d.setHours(23, 59, 59, 0);
  return d;
};
