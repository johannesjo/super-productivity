export const exists = <T>(v: any): T | never => {
  if (!v) {
    throw new Error('Value is ' + v);
  }
  return v;
};
