import { isValidDate } from './is-valid-date';

export const isSameDay = (date1: number | Date, date2: number | Date): boolean => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const isValid = isValidDate(d1) && isValidDate(d2);
  if (!isValid) {
    console.log(date1, date2);
    throw new Error('Invalid dates passed');
  }
  return (
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear()
  );
};
