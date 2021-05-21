export const getDateRangeForDay = (
  day: number,
): {
  start: number;
  end: number;
} => {
  return {
    start: rangeStartWithTime(day).getTime(),
    end: rangeEndWithTime(day).getTime(),
  };
};

export const rangeStartWithTime = (rs: number): Date => {
  const d = new Date(rs);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const rangeEndWithTime = (rs: number): Date => {
  const d = new Date(rs);
  d.setHours(23, 59, 59, 0);
  return d;
};
