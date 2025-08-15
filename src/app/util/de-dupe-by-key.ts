export const dedupeByKey = <T>(arr: T[], key: keyof T): T[] => {
  const temp = arr.map((el) => el[key]);
  return arr.filter((el, i) => temp.indexOf(el[key]) === i);
};
