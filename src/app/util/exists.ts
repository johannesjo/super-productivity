export const exists = (v: any): any | never => {
  if (!v) {
    throw new Error('Value is ' + v);
  }
  return v;
};
