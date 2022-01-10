export const getDiffInMonth = (d1: Date, d2: Date): number => {
  let months: number = (d2.getFullYear() - d1.getFullYear()) * 12;
  months -= d1.getMonth();
  months += d2.getMonth();
  return months;
};
