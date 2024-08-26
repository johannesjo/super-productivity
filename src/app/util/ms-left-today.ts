export const msLeftToday = (now: number): number => {
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  // eslint-disable-next-line no-mixed-operators
  return startOfDay.getTime() - now + 24 * 60 * 60 * 1000;
};
