export const getDiffInDays = (d1: Date, d2: Date): number => {
  const d1Copy = new Date(d1);
  const d2Copy = new Date(d2);
  // NOTE we want the diff regarding the dates not the absolute one
  d1Copy.setHours(0, 0, 0, 0);
  d2Copy.setHours(0, 0, 0, 0);
  const diffTime: number = d2Copy.getTime() - d1Copy.getTime();
  // NOTE: we use math round to avoid JS math weirdness and summer winter time problems
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};
