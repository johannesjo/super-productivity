export const pfapiLog = (msg: string = '', ...args: unknown[]): void => {
  console.log('PF:', msg, ...args);
};
