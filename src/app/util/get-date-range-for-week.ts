// NOTE: cuts off at month start and end per default
import * as moment from 'moment';

export const getDateRangeForWeek = (year: number, weekNr: number, month?: number): {
  rangeStart: Date,
  rangeEnd: Date,
} => {
  let rangeStart = moment().day('Monday').year(year).week(weekNr).toDate();
  let rangeEnd = moment().day('Sunday').year(year).week(weekNr + 1).toDate();

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

  rangeStart.setHours(0, 0, 0, 0);
  rangeEnd.setHours(23, 59, 59);

  return {
    rangeStart,
    rangeEnd
  };
};
