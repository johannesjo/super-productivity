import { parseIsoDuration } from '../../../../../util/parse-iso-duration';

export const parseOpenProjectDuration = (
  val: string | number | null | undefined,
): number => {
  // parse ISO 8601 duration
  return typeof val === 'string' ? parseIsoDuration(val) : 0;
};
