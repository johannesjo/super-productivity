import { truncate } from '../../util/truncate';
import { HANDLED_ERROR_PROP_STR } from '../../app.constants';

// ugly little helper to make sure we get the most information out of it for the user
export const getSyncErrorStr = (err: unknown): string => {
  let errorAsString: string =
    err && (err as any)?.toString ? (err as any).toString() : '???';
  if (
    errorAsString === '[object Object]' &&
    err &&
    (err as any)[HANDLED_ERROR_PROP_STR]
  ) {
    errorAsString = (err as any)[HANDLED_ERROR_PROP_STR] as string;
  }
  return truncate(errorAsString.toString(), 100);
};
