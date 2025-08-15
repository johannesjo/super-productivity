export const uniqueByProp = <T>(array: T[], propName: keyof T): T[] => {
  const r: T[] = [];
  const allCompareKeys: unknown[] = [];
  array.forEach((v: T) => {
    const compareProp = v[propName];
    if (!allCompareKeys.includes(compareProp)) {
      r.push(v);
      allCompareKeys.push(v[propName]);
    }
  });
  return r;
};
