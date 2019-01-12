import * as moment from 'moment';

export const fixMomentDate = (str) => {
  return moment.duration(str);
};