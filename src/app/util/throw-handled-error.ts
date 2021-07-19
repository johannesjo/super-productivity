import { HANDLED_ERROR_PROP_STR } from '../app.constants';

export const throwHandledError = (errorTxt: string): void => {
  const e = new Error(errorTxt);
  (e as any)[HANDLED_ERROR_PROP_STR] = errorTxt;
  throw e;
};
