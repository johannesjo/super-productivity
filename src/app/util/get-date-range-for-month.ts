export const getDateRangeForMonth = (year: number, month_: number): { rangeStart: Date, rangeEnd: Date } => {
  // denormalize to js month again
  const month = +month_;
  // firstDayOfMonth
  const rangeStart = new Date(year, month - 1, 1);
  // lastDayOfMonth
  const rangeEnd = new Date(year, month, 0);

  rangeEnd.setHours(23, 59, 59);

  return {
    rangeStart,
    rangeEnd
  };
};
