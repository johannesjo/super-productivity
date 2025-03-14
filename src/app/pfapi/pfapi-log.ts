export const pfapiLog = (msg: string = '', ...args: unknown[]): void => {
  console.log('PFAPI:', msg, ...args);
};
