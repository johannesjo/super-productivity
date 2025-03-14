export const pfLog = (msg: string = '', ...args: unknown[]): void => {
  console.log('PF:', msg, ...args);
};
