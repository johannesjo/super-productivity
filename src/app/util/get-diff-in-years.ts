export const getDiffInYears = (d1: Date, d2: Date): number => {
  let diffYears: number = d2.getFullYear() - d1.getFullYear();

  // If d1's month or day is greater than d2's month or day, subtract 1 from the difference
  if (
    d1.getMonth() > d2.getMonth() ||
    (d1.getMonth() === d2.getMonth() && d1.getDate() > d2.getDate())
  ) {
    diffYears--;
  }

  return diffYears;
};
