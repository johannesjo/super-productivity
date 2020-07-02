import { HANDLED_ERROR_PROP_STR } from '../app.constants';

export const throwHandledError = (errorTxt => {
  const e = new Error(errorTxt);
  e[HANDLED_ERROR_PROP_STR] = errorTxt;
  throw e;
});
