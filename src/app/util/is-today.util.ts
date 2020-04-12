export const isToday = (date: number): boolean => {
  const isValid = (new Date(date)).getTime() > 0;
  if (!isValid) {
    throw new Error('Invalid date passed');
  }
  return new Date().getDay() === new Date(date).getDay();
};
