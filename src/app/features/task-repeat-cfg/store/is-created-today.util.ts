export const isToday = (date): boolean => {
  return new Date().getDay() === new Date(date).getDay();
};
