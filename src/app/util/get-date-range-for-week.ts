// NOTE: cuts off at month start and end per default

export const getDateRangeForWeek = (
  year: number,
  weekNr: number,
  month?: number,
): {
  rangeStart: Date;
  rangeEnd: Date;
} => {
  // NOTE: using the constant here rather than string is important otherwise day might mess up
  let rangeStart = getDateFromWeekNr(year, weekNr);
  let rangeEnd = getDateFromWeekNr(year, weekNr + 1);
  rangeEnd.setDate(rangeEnd.getDate() - 1);

  if (typeof month === 'number') {
    // firstDayOfMonth
    const monthStart = new Date(year, month - 1, 1);
    // lastDayOfMonth
    const monthEnd = new Date(year, month, 0);

    // prettier-ignore
    rangeStart = (rangeStart < monthStart)
      ? monthStart
      : rangeStart;

    // prettier-ignore
    rangeEnd = (rangeEnd > monthEnd)
      ? monthEnd
      : rangeEnd;
  }

  return {
    rangeStart: rangeStartWithTime(rangeStart),
    rangeEnd: rangeEndWithTime(rangeEnd),
  };
};

export const rangeStartWithTime = (rs: Date): Date => {
  const d = new Date(rs);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const getDateFromWeekNr = (year: number, week: number): Date => {
  // prettier-ignore
  const simple = new Date(year, 0, 1 + ((week - 1) * 7));
  const dow = simple.getDay();
  const ISOWeekStart = simple;
  if (dow <= 4) {
    ISOWeekStart.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    ISOWeekStart.setDate(simple.getDate() + 8 - simple.getDay());
  }
  return ISOWeekStart;
};

export const rangeEndWithTime = (rs: Date): Date => {
  const d = new Date(rs);
  d.setHours(23, 59, 59, 0);
  return d;
};
