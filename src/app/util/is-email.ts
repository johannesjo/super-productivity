const emailRegex = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
export const isEmail = (str: string): boolean =>
  typeof str === 'string' && !!str.match(emailRegex);
