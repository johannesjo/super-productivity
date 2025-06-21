//  since new Date("2021-01-01") will produce yesterday's date in timezones with negative timezone offset,
// we need to convert date string to UTC date.
// example use case:
/*
getDateTimeFromClockString(
      workStartEndCfg.startTime,
      dateStrToUtcDate(dayDate),
)

^ this would produce wrong day if the timezone offset is negative, if we were not using dateStrToUtcDate
 */
export const dateStrToUtcDate = (dateStr: string): Date => {
  if (!dateStr) {
    return new Date();
  }
  // const [year, month, day] = dateStr.split('-').map(Number);
  // return new Date(Date.UTC(year, month - 1, day));
  const localDate = new Date(dateStr);
  // eslint-disable-next-line no-mixed-operators
  return new Date(localDate.getTime() + localDate.getTimezoneOffset() * 60000);
};
