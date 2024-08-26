import moment from 'moment';

export const parseOpenProjectDuration = (
  val: string | number | null | undefined,
): number => {
  // parse ISO 8601 duration
  return typeof val === 'string' ? moment.duration(val).as('ms') : 0;
};
