import moment from 'moment';

export const getTimestamp = (dateStr: string): number => {
  return moment(dateStr).toDate().getTime();
};
