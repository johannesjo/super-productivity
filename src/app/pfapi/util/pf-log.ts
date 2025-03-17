export const pfLog = (msg: unknown = '', ...args: unknown[]): void => {
  console.log('PF:', msg, ...args);
};
