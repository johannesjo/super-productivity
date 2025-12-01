/*given a value of 8..5 returns '8:30'*/
export const getClockStringFromHours = (hours: number): string => {
  const minutes = Math.round((hours % 1) * 60);

  const parsed =
    minutes === 60
      ? Math.ceil(hours) + ':00'
      : Math.floor(hours) + ':' + ('00' + minutes).slice(-2);
  return parsed.trim();
};
