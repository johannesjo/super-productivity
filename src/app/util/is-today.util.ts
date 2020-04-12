export const isToday = (date: number): boolean => {
  return new Date().getDay() === new Date(date).getDay();
};
