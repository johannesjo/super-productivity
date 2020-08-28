export const getTomorrow = (hour = 9): Date => {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  date.setDate(date.getDate() + 1);
  return date;
};
