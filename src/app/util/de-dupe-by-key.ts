export const dedupeByKey = (arr: any[], key: string): any[] => {
  const temp = arr.map((el) => el[key]);
  return arr.filter((el, i) => temp.indexOf(el[key]) === i);
};
