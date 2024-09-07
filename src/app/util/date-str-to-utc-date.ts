export const dateStrToUtcDate = (dateStr: string): Date => {
  // const [year, month, day] = dateStr.split('-').map(Number);
  // return new Date(Date.UTC(year, month - 1, day));
  const localDate = new Date(dateStr);
  // eslint-disable-next-line no-mixed-operators
  return new Date(localDate.getTime() + localDate.getTimezoneOffset() * 60000);
};
