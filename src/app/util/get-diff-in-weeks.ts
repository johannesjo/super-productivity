export const getDiffInWeeks = (d1: Date, d2: Date): number => {
  let diff = (d2.getTime() - d1.getTime()) / 1000;
  diff /= 60 * 60 * 24 * 7;
  return Math.round(diff);
};
