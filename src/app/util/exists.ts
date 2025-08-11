export const exists = <T>(v: T | null | undefined): T | never => {
  if (!v) {
    throw new Error('Value is ' + v);
  }
  return v;
};
