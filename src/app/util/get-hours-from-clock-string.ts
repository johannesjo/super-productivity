export const getHoursFromClockString = (clockString: string): number => {
  const [h, m] = clockString.split(':');

  // eslint-disable-next-line no-mixed-operators
  return +h + +m / 60;
};
