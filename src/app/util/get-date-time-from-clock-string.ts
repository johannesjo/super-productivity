export const getDateTimeFromClockString = (
  clockString: string,
  date: number | Date,
): number => {
  const [h, m] = clockString.split(':');

  if (clockString.length > 5 || isNaN(+h) || isNaN(+m)) {
    throw new Error('Invalid clock string');
  }
  const d = new Date(date);
  d.setSeconds(0, 0);
  d.setHours(+h);
  d.setMinutes(+m);

  return d.getTime();
};
