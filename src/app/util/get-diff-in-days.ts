export const getDiffInDays = (d1: Date, d2: Date): number => {
  const d1Copy = new Date(d1);
  const d2Copy = new Date(d2);
  // NOTE we want the diff regarding the dates not the absolute one
  d1Copy.setHours(0, 0, 0, 0);
  d2Copy.setHours(0, 0, 0, 0);
  const diffTime: number = d2Copy.getTime() - d1Copy.getTime();
  // return Math.ceil(Math.abs(diffTime) / (1000 * 60 * 60 * 24)) * (diffTime < 0 ? -1 : 1);
  return diffTime / (1000 * 60 * 60 * 24);
};
