export const uniqueByProp = <T>(array: T[], propName: keyof T): T[] => {
  const r: T[] = [];
  const allCompareKeys: string[] = [];
  array.forEach((v: any) => {
    const compareProp = v[propName];
    if (!allCompareKeys.includes(compareProp)) {
      r.push(v);
      allCompareKeys.push(v[propName]);
    }
  });
  return r;
};
