/*given a value of 8..5 returns '8:30'*/
export const getClockStringFromHours = (hours: number): string => {
  // eslint-disable-next-line no-mixed-operators
  const parsed =
    Math.floor(hours) + ':' + ('00' + Math.round((hours % 1) * 60)).slice(-2);
  return parsed.trim();
};
