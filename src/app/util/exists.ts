export const exists = (v: any): true | never => {
  if(!v) {
    throw new Error('Value is ' + v);
  }
  return true;
};
