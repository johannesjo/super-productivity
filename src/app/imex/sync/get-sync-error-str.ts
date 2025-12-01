import { truncate } from '../../util/truncate';
import { HANDLED_ERROR_PROP_STR } from '../../app.constants';

// ugly little helper to make sure we get the most information out of it for the user
export const getSyncErrorStr = (err: unknown): string => {
  let errorAsString: string =
    err && (err as any)?.toString ? (err as any).toString() : '???';

  // Check if error has a message property (most Error objects do)
  if (err && typeof (err as any)?.message === 'string') {
    errorAsString = (err as any).message as string;
  }

  if (err && typeof (err as any)?.response?.data === 'string') {
    errorAsString = (err as any)?.response?.data as string;
  }

  if (
    errorAsString === '[object Object]' &&
    err &&
    (err as any)[HANDLED_ERROR_PROP_STR]
  ) {
    errorAsString = (err as any)[HANDLED_ERROR_PROP_STR] as string;
  }

  // Increased from 150 to 400 to show more context, especially for HTTP errors
  return truncate(errorAsString.toString(), 400);
};
